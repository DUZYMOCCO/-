// 掟（bldg1）: 不法侵入・錠前破り・盗み・スリ → 目撃 → 賞金 → 衛兵の逮捕（払う／牢／逆らう）。
// Kenshi で確かめた事（research/buildings_locks_theft.md）:
//  - 賞金は「見た取締り側の勢力」に付く。盗賊は届け出ない。
//  - 額: 不法侵入 100・暴行 500・押し入り 1000・窃盗 2500。
//  - 時効: 最後に増えた時から 0.04×額 時間。1万以上は消えない。
// ★ここで決めた値: 見られなければ罪は 3秒で消え、見られたら 20秒続く／牢 0.02×額 時間（上限500）／保釈 2×額。

import { DAY_SEC, makeEvent, setAnim } from './data.js';
import { growUse } from './needs.js';
import { canSee } from './stealth.js';
import { beginPick, updatePicks } from './locks.js';
import { boxById, doorPoint, homeNight, houseAt, houseById, isPublic, localToWorld, th, toggleDoor } from './town.js';
import { partyMoney, GOODS } from './trade.js';

export const BOUNTY = { trespass: 100, assault: 500, breakin: 1000, theft: 2500 };
export const CRIME_NAME = { trespass: '不法侵入', assault: '暴行', breakin: '押し入り', theft: '窃盗' };
const SEV = { trespass: 1, breakin: 2, assault: 3, theft: 4 };
export const CRIME_UNSEEN_TICKS = 30; // ★3秒
export const CRIME_SEEN_TICKS = 200; // ★20秒
export const RECOG_TICKS = 50; // ★5秒見られたら賞金首と気づく
export const ASK_TICKS = 150; // ★「止まれ」から答えるまで 15秒
export const ASK_FLEE_M = 6; // ★止められてから 6m 離れたら逆らったとみなす
export const ESCAPE_M = 70; // ★町から 70m 離れたら追うのをやめる
export const BAN_SEC = 2 * DAY_SEC; // ★店で盗みを見られたら 2日 取引できない
export const STEAL_TICKS = 10; // ★1つ取るのに 1秒
export const PICKPOCKET_TICKS = 15; // ★スリは 1.5秒
export const THEFT_XP = { success: 0.6, fail: 0.3, floor: 0.3, caughtFree: 2.4 };
export const BOUNTY_DECAY_H = 0.04; // Kenshi
export const BOUNTY_PERMANENT = 10000; // Kenshi
export const JAIL_H_PER = 0.02; // ★
export const JAIL_H_MAX = 500; // ★
export const BAIL_MULT = 2; // ★

export function ensureLaw(state) {
  if (!state.law || typeof state.law !== 'object') state.law = {};
  const law = state.law;
  if (!law.fight || typeof law.fight !== 'object') law.fight = {};
  if (law.arrest === undefined) law.arrest = null;
  if (!law.recog || typeof law.recog !== 'object') law.recog = {};
  return law;
}

export function bountyOf(actor, faction = 'guard') {
  const b = actor && actor.bounty && actor.bounty[faction];
  return b ? b.amount : 0;
}

export function partyBounty(state) {
  let n = 0;
  for (const a of state.actors) if (a.faction === 'player' && a.state !== 'dead') n += bountyOf(a);
  return n;
}

export function addBounty(state, actor, faction, amount, reason, events) {
  if (!actor.bounty || typeof actor.bounty !== 'object') actor.bounty = {};
  const e = actor.bounty[faction] || { amount: 0, since: 0 };
  e.amount += amount;
  e.since = state.timeSec || 0;
  actor.bounty[faction] = e;
  if (events) events.push(makeEvent(state, 'law', actor.name + 'に賞金 ' + amount + ' キャッシュ（' + (CRIME_NAME[reason] || reason) + '）。合計 ' + e.amount + ' キャッシュ'));
}

export function clearBounty(actor, faction = 'guard') {
  if (actor.bounty) delete actor.bounty[faction];
}

export function bail(actor) {
  return bountyOf(actor) * BAIL_MULT;
}

export function jailHours(amount) {
  return Math.min(JAIL_H_MAX, amount * JAIL_H_PER);
}

// 罪を始める・続ける（見られたかは別に見る）
export function startCrime(state, actor, kind, info = {}) {
  const c = actor.crime;
  const until = state.tick + CRIME_UNSEEN_TICKS;
  if (!c) {
    actor.crime = { kind, untilTick: until, seen: false, reported: false, alarmed: false, house: info.house || null, startTick: state.tick };
    return actor.crime;
  }
  if ((SEV[kind] || 0) > (SEV[c.kind] || 0)) {
    c.kind = kind;
    c.reported = false;
    c.alarmed = false;
  }
  if (info.house) c.house = info.house;
  c.untilTick = Math.max(c.untilTick, until);
  return c;
}

function lawful(o) {
  return o.faction === 'guard' && o.state !== 'dead' && o.state !== 'down' && o.state !== 'getup' && !o.resting && !o.jail;
}

function byIdMap(state) {
  const m = new Map();
  for (const a of state.actors) m.set(a.id, a);
  return m;
}

// 見た者の動き（取締り＝賞金と逮捕、町人＝叫んで衛兵を呼ぶ）
export function witness(state, thief, obs, events) {
  const c = thief.crime;
  if (!c || !lawful(obs)) return;
  const law = ensureLaw(state);
  if (!c.seen && events) events.push(makeEvent(state, 'law', (obs.title || obs.name) + 'に' + CRIME_NAME[c.kind] + 'を見られた！'));
  c.seen = true;
  c.untilTick = Math.max(c.untilTick, state.tick + CRIME_SEEN_TICKS);
  if (!obs.civil) {
    if (!c.reported) {
      c.reported = true;
      addBounty(state, thief, 'guard', BOUNTY[c.kind] || 100, c.kind, events);
    }
    if (!law.fight[thief.id] && !law.arrest) startArrest(state, obs, thief, events);
    return;
  }
  if (!c.alarmed) {
    c.alarmed = true;
    obs.alarmTick = state.tick;
    if (events) events.push(makeEvent(state, 'law', (obs.title || obs.name) + '「' + (c.kind === 'trespass' ? '出て行け！ 衛兵！' : '泥棒だ！ 衛兵！') + '」'));
    const h = c.house ? houseById(state, c.house) : null;
    if (c.kind === 'theft' && h && h.type === 'shop' && (obs.home === h.id || obs.townId === h.town)) {
      const t = state.town;
      t.banned = t.banned || {};
      t.banned[h.town] = (state.timeSec || 0) + BAN_SEC;
      if (events) events.push(makeEvent(state, 'law', 'この町の店はしばらく取引してくれない（2日）'));
    }
    // 一番近い衛兵を呼ぶ
    let best = null;
    let bd = 45;
    for (const g of state.actors) {
      if (g.faction !== 'guard' || g.civil || !lawful(g)) continue;
      const d = Math.hypot(g.x - thief.x, g.z - thief.z);
      if (d < bd) {
        bd = d;
        best = g;
      }
    }
    if (best) best.investigate = { x: thief.x, z: thief.z, untilTick: state.tick + 400, by: obs.id };
  }
}

export function startArrest(state, guard, target, events) {
  const law = ensureLaw(state);
  if (law.arrest || law.fight[target.id] || target.jail) return false;
  law.arrest = { guardId: guard.id, targetId: target.id, stage: 'approach', since: state.tick, askUntil: 0, ax: target.x, az: target.z };
  if (events) events.push(makeEvent(state, 'law', (guard.title || guard.name) + 'が' + target.name + 'を捕まえに来る'));
  return true;
}

function nearestPost(state, x, z) {
  const posts = (state.town ? state.town.houses : []).filter((h) => h.type === 'post');
  posts.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  return posts[0] || null;
}

function stopAll(state, actor) {
  actor.moveTo = null;
  actor.targetId = null;
  actor.townTask = null;
  actor.pick = null;
  actor.holdAt = null;
  actor.resting = null;
  actor.crime = null;
  actor.trespass = null;
  for (const o of state.actors) if (o.targetId === actor.id) o.targetId = null;
}

export function sendToJail(state, actor, events) {
  const law = ensureLaw(state);
  const amount = bountyOf(actor);
  const hours = jailHours(Math.max(amount, BOUNTY.trespass));
  const post = nearestPost(state, actor.x, actor.z);
  stopAll(state, actor);
  delete law.fight[actor.id];
  delete law.recog[actor.id];
  clearBounty(actor);
  actor.jail = { untilSec: (state.timeSec || 0) + hours * 3600, house: post ? post.id : null, hours };
  if (post) {
    const p = localToWorld(post, 0, post.depth * 0.55);
    actor.x = p.x;
    actor.z = p.z;
  }
  if (law.arrest && law.arrest.targetId === actor.id) law.arrest = null;
  if (events) events.push(makeEvent(state, 'law', actor.name + 'は牢に入れられた（' + Math.round(hours * 10) / 10 + '時間）'));
}

function payParty(state, amount) {
  if (partyMoney(state) < amount) return false;
  let left = amount;
  for (const a of state.actors) {
    if (a.faction !== 'player' || a.state === 'dead' || !(state.squadIds || []).includes(a.id)) continue;
    const take = Math.min(left, a.money || 0);
    a.money -= take;
    left -= take;
    if (left <= 0) break;
  }
  return left <= 0;
}

function resist(state, guard, target, events) {
  const law = ensureLaw(state);
  law.arrest = null;
  law.fight[target.id] = true;
  addBounty(state, target, 'guard', BOUNTY.assault, 'assault', events);
  if (events) events.push(makeEvent(state, 'law', (guard ? guard.title || guard.name : '衛兵') + '「逆らうか！」 衛兵が襲ってくる'));
  for (const g of state.actors) {
    if (g.faction !== 'guard' || g.civil || !lawful(g)) continue;
    if (Math.hypot(g.x - target.x, g.z - target.z) > 30 && g !== guard) continue;
    g.targetId = target.id;
    g.investigate = null;
  }
}

// 「止まれ」への答え: 'pay' | 'jail' | 'resist'。戻り: true（受け付けた）
export function answerArrest(state, choice, events) {
  const law = ensureLaw(state);
  const ar = law.arrest;
  if (!ar || ar.stage !== 'ask') return false;
  const byId = byIdMap(state);
  const guard = byId.get(ar.guardId);
  const target = byId.get(ar.targetId);
  if (!target) {
    law.arrest = null;
    return false;
  }
  if (choice === 'pay') {
    const cost = bail(target);
    if (!payParty(state, cost)) {
      if (events) events.push(makeEvent(state, 'law', 'キャッシュが足りない（保釈金 ' + cost + ' キャッシュ）'));
      return false;
    }
    clearBounty(target);
    target.crime = null;
    law.arrest = null;
    delete law.recog[target.id];
    if (events) events.push(makeEvent(state, 'law', target.name + 'は ' + cost + ' キャッシュ 払って放された'));
    return true;
  }
  if (choice === 'jail') {
    sendToJail(state, target, events);
    return true;
  }
  if (choice === 'resist') {
    resist(state, guard, target, events);
    return true;
  }
  return false;
}

// ---- 仲間の作業（扉・錠前・盗み・スリ）を着いた所で行う ----
function stealChance(state, thief, box) {
  if (box.kind === 'display') return 1;
  let near = 0;
  for (const o of state.actors) {
    if (o.faction === 'player' || o.state === 'dead' || o.state === 'down' || o.resting) continue;
    const d = Math.hypot(o.x - thief.x, o.z - thief.z);
    if (d < 8) near = Math.max(near, 0.45 * (1 - d / 8));
  }
  const thv = thief.skills && typeof thief.skills.thievery === 'number' ? thief.skills.thievery : 0;
  return Math.max(0.05, Math.min(0.98, 0.45 + thv / 100 - near));
}

export function pickpocketChance(thief, target) {
  const thv = thief.skills && typeof thief.skills.thievery === 'number' ? thief.skills.thievery : 0;
  const st = thief.skills && typeof thief.skills.stealth === 'number' ? thief.skills.stealth : 0;
  let c = thv / 100 + (thief.sneaking ? st / 200 : 0);
  if (target.resting || target.state === 'down') c += 0.5;
  else {
    // 相手がこちらを向いていると難しい
    const fx = Math.sin(target.rot || 0);
    const fz = Math.cos(target.rot || 0);
    const dx = thief.x - target.x;
    const dz = thief.z - target.z;
    const d = Math.hypot(dx, dz) || 1;
    if ((fx * dx + fz * dz) / d > 0.3) c -= 0.25;
  }
  return Math.max(0.05, Math.min(0.95, c));
}

function nearestAwake(state, thief, maxD) {
  let best = null;
  let bd = maxD;
  for (const o of state.actors) {
    if (o.faction === 'player' || !lawful(o)) continue;
    const d = Math.hypot(o.x - thief.x, o.z - thief.z);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function giveGood(state, good, n) {
  if (!state.trade) state.trade = { cargo: {}, memo: {}, press: {}, cash: {}, announced: [], earned: 0, lastSale: null };
  if (!state.trade.cargo) state.trade.cargo = {};
  const c = state.trade.cargo[good] || { n: 0, cost: 0 };
  c.cost = (c.cost * c.n) / (c.n + n); // 盗品は元手 0
  c.n += n;
  state.trade.cargo[good] = c;
}

function doSteal(state, a, task, events) {
  const box = boxById(state, task.box);
  if (!box) return true;
  if (box.locked) {
    if (events) events.push(makeEvent(state, 'town', '箱に鍵がかかっている（錠 ' + box.lock + '）'));
    return true;
  }
  const goods = Object.keys(box.goods).filter((g) => box.goods[g] > 0);
  const want = task.good && box.goods[task.good] > 0 ? task.good : task.good === 'cash' && box.cash > 0 ? 'cash' : goods[0] || (box.cash > 0 ? 'cash' : null);
  if (!want) {
    if (events) events.push(makeEvent(state, 'town', '箱は空っぽだ'));
    return true;
  }
  const h = houseById(state, box.house);
  // 自分の物でない（家の物・店の品）。店が開いていて陳列の品でも、払わずに取れば盗み
  startCrime(state, a, 'theft', { house: box.house });
  const chance = stealChance(state, a, box);
  task.tries = (task.tries || 0) + 1;
  const roll = th(state.seed, a.id, box.id, task.tries, state.tick, 'steal');
  if (roll < chance) {
    if (chance < 0.98) growUse(a, 'thievery', THEFT_XP.success);
    if (want === 'cash') {
      const take = box.cash;
      box.cash = 0;
      a.money = (a.money || 0) + take;
      if (events) events.push(makeEvent(state, 'law', a.name + 'が ' + take + ' キャッシュ を盗んだ'));
    } else {
      box.goods[want] -= 1;
      if (box.goods[want] <= 0) delete box.goods[want];
      giveGood(state, want, 1);
      if (events) events.push(makeEvent(state, 'law', a.name + 'が' + (GOODS[want] ? GOODS[want].name : want) + 'を1つ盗んだ'));
    }
    a.lastTheftTick = state.tick;
    void h;
    if (task.all && (Object.keys(box.goods).length || box.cash > 0)) {
      task.t = 0;
      return false;
    }
    return true;
  }
  growUse(a, 'thievery', THEFT_XP.fail);
  const o = nearestAwake(state, a, 8);
  if (o) {
    if (events) events.push(makeEvent(state, 'law', a.name + 'は盗みをしくじった'));
    witness(state, a, o, events);
    return true;
  }
  task.t = 0;
  return false;
}

function doPickpocket(state, a, task, events) {
  const t = state.actors.find((o) => o.id === task.targetId);
  if (!t || t.state === 'dead') return true;
  if (Math.hypot(t.x - a.x, t.z - a.z) > 1.6) {
    task.stage = 'walk';
    task.t = 0;
    return false;
  }
  startCrime(state, a, 'theft', { house: t.home || null });
  const chance = pickpocketChance(a, t);
  task.tries = (task.tries || 0) + 1;
  const roll = th(state.seed, a.id, t.id, task.tries, state.tick, 'pp');
  if (roll < chance) {
    const take = Math.min(t.money || 0, Math.max(1, Math.ceil((t.money || 0) * (0.4 + 0.6 * th(a.id, t.id, state.tick, 'amt')))));
    t.money = (t.money || 0) - take;
    a.money = (a.money || 0) + take;
    growUse(a, 'thievery', THEFT_XP.success);
    if (events) events.push(makeEvent(state, 'law', a.name + 'が' + (t.title || t.name) + 'から ' + take + ' キャッシュ をすった'));
    return true;
  }
  growUse(a, 'thievery', THEFT_XP.fail);
  if (events) events.push(makeEvent(state, 'law', (t.title || t.name) + 'に気づかれた！'));
  if (t.resting) t.resting = null;
  if (lawful(t)) witness(state, a, t, events);
  else if (t.state !== 'down' && t.faction !== 'player') t.targetId = a.id;
  return true;
}

function runTasks(state, events) {
  for (const a of state.actors) {
    const task = a.townTask;
    if (!task || task.stage !== 'act') continue;
    if (a.state === 'dead' || a.state === 'down') {
      a.townTask = null;
      continue;
    }
    if (task.kind === 'door') {
      const h = houseById(state, task.house);
      if (h) toggleDoor(state, a, h, events, task.want);
      a.townTask = null;
      continue;
    }
    if (task.kind === 'pick') {
      beginPick(state, a, task.door ? 'door' : 'box', task.door ? task.house : task.box, events);
      a.townTask = null;
      continue;
    }
    task.t = (task.t || 0) + 1;
    if (task.kind === 'steal') {
      if (task.t < STEAL_TICKS) continue;
      if (doSteal(state, a, task, events)) a.townTask = null;
    } else if (task.kind === 'pickpocket') {
      if (task.t < PICKPOCKET_TICKS) continue;
      if (doPickpocket(state, a, task, events)) a.townTask = null;
    } else {
      a.townTask = null;
    }
  }
}

// ---- 不法侵入（人の家に入る） ----
function checkTrespass(state, events) {
  for (const a of state.actors) {
    if (a.faction !== 'player' || a.state === 'dead' || a.jail) {
      if (a.trespass) a.trespass = null;
      continue;
    }
    const h = houseAt(state, a.x, a.z, 0.1);
    if (!h || isPublic(state, h)) {
      a.trespass = null;
      continue;
    }
    if (!a.trespass || a.trespass.house !== h.id) a.trespass = { house: h.id, warns: 0, nextTick: 0 };
    let seer = null;
    for (const o of state.actors) {
      if (!lawful(o)) continue;
      if (Math.hypot(o.x - a.x, o.z - a.z) > 25) continue;
      if (canSee(state, o, a)) {
        seer = o;
        break;
      }
    }
    if (!seer) continue;
    const strict = h.type === 'post' || homeNight(state);
    if (!strict && a.trespass.warns < 2) {
      if (state.tick >= a.trespass.nextTick) {
        a.trespass.warns += 1;
        a.trespass.nextTick = state.tick + 50;
        if (events) events.push(makeEvent(state, 'law', (seer.title || seer.name) + '「ここは人の家だ。出て行け」（' + a.trespass.warns + '/2）'));
      }
      continue;
    }
    if (state.tick < a.trespass.nextTick) continue;
    startCrime(state, a, 'trespass', { house: h.id });
    witness(state, a, seer, events);
  }
}

// ---- 毎tick ----
export function updateLaw(state, events) {
  if (!state.town) return;
  const law = ensureLaw(state);
  const byId = byIdMap(state);
  // 錠前破り（進める・破っている間は押し入りの罪）
  for (const a of updatePicks(state, events)) {
    if (!a.pick) continue;
    const h = houseById(state, a.pick.house);
    const own = h && a.home === h.id;
    if (!own) startCrime(state, a, 'breakin', { house: a.pick.house });
  }
  runTasks(state, events);
  if (state.tick % 5 === 0) checkTrespass(state, events);
  // 罪: 見張る者がいるか
  for (const a of state.actors) {
    const c = a.crime;
    if (!c) continue;
    if (a.state === 'dead' || state.tick > c.untilTick) {
      if (c.seen && !law.fight[a.id] && a.state !== 'dead') growUse(a, 'thievery', c.kind === 'theft' ? THEFT_XP.caughtFree : 0);
      a.crime = null;
      continue;
    }
    if (state.tick % 2 !== 0) continue;
    for (const o of state.actors) {
      if (o === a || o.faction !== 'guard' || !lawful(o)) continue;
      if (Math.hypot(o.x - a.x, o.z - a.z) > 30) continue;
      if (canSee(state, o, a)) witness(state, a, o, events);
    }
  }
  // 時効
  if (state.tick % 50 === 0) {
    for (const a of state.actors) {
      if (!a.bounty || a.jail) continue;
      for (const f of Object.keys(a.bounty)) {
        const e = a.bounty[f];
        if (!e || e.amount <= 0) {
          delete a.bounty[f];
          continue;
        }
        if (e.amount >= BOUNTY_PERMANENT) continue;
        if ((state.timeSec || 0) - e.since >= e.amount * BOUNTY_DECAY_H * 3600) {
          delete a.bounty[f];
          if (events) events.push(makeEvent(state, 'law', a.name + 'の賞金は時効になった'));
        }
      }
    }
  }
  // 賞金首に気づく（5秒見られる）
  if (!law.arrest && state.tick % 5 === 0) {
    for (const a of state.actors) {
      if (a.faction !== 'player' || a.state === 'dead' || a.jail || law.fight[a.id] || bountyOf(a) <= 0) continue;
      let seer = null;
      for (const g of state.actors) {
        if (g.faction !== 'guard' || g.civil || !lawful(g)) continue;
        if (Math.hypot(g.x - a.x, g.z - a.z) > 30) continue;
        if (canSee(state, g, a)) {
          seer = g;
          break;
        }
      }
      law.recog[a.id] = seer ? (law.recog[a.id] || 0) + 5 : Math.max(0, (law.recog[a.id] || 0) - 5);
      if (seer && law.recog[a.id] >= RECOG_TICKS) {
        startArrest(state, seer, a, events);
        break;
      }
    }
  }
  // 逮捕の流れ
  const ar = law.arrest;
  if (ar) {
    const g = byId.get(ar.guardId);
    const t = byId.get(ar.targetId);
    if (!g || !t || g.state === 'dead' || t.state === 'dead' || t.jail || g.state === 'down') law.arrest = null;
    else if (ar.stage === 'approach') {
      const d = Math.hypot(g.x - t.x, g.z - t.z);
      if (d <= 2.2) {
        ar.stage = 'ask';
        ar.askUntil = state.tick + ASK_TICKS;
        ar.ax = t.x;
        ar.az = t.z;
        if (events) events.push(makeEvent(state, 'law', (g.title || g.name) + '「止まれ！ ' + t.name + '、賞金 ' + bountyOf(t) + ' キャッシュ だ。保釈金 ' + bail(t) + ' キャッシュ を払うか、牢に入るか」'));
      } else if (state.tick - ar.since > 600) law.arrest = null;
    } else if (ar.stage === 'ask') {
      if (t.state === 'down') sendToJail(state, t, events);
      else if (Math.hypot(t.x - ar.ax, t.z - ar.az) > ASK_FLEE_M || state.tick > ar.askUntil) resist(state, g, t, events);
    }
  }
  // 逆らった者: 倒れたら牢、町から離れたら追うのをやめる
  for (const id of Object.keys(law.fight)) {
    const t = byId.get(Number(id));
    if (!t || t.state === 'dead') {
      delete law.fight[id];
      continue;
    }
    if (t.state === 'down') {
      sendToJail(state, t, events);
      continue;
    }
    const towns = [state.places && state.places.town1, state.places && state.places.town2].filter(Boolean);
    const far = towns.every((p) => Math.hypot(p.x - t.x, p.z - t.z) > ESCAPE_M);
    if (far) {
      delete law.fight[id];
      for (const g of state.actors) if (g.faction === 'guard' && g.targetId === t.id) g.targetId = null;
      if (events) events.push(makeEvent(state, 'law', t.name + 'は衛兵を振り切った（賞金は残る）'));
    }
  }
  // 牢から出る
  for (const a of state.actors) {
    if (!a.jail) continue;
    if ((state.timeSec || 0) >= a.jail.untilSec) {
      const h = houseById(state, a.jail.house);
      a.jail = null;
      if (h) {
        const p = doorPoint(h, 1.6);
        a.x = p.x;
        a.z = p.z;
      }
      a.state = 'idle';
      setAnim(a, 'Idle', state.tick);
      if (events) events.push(makeEvent(state, 'law', a.name + 'は牢から出された'));
    }
  }
}

// 衛兵が掟の上で戦う相手か（ai.js から）
export function lawHostile(state, actor, other) {
  if (!state.law || !state.law.fight) return false;
  if (actor.faction !== 'guard' || actor.civil) return false;
  return !!state.law.fight[other.id];
}

