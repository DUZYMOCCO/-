// 物語の最初のミッション（v1.0.2）の仕掛け: 埋まったミサイルを掘り出す → 発射台をネジでひっぱる → 撃つ → 設計図のありかを調べる。
// データと計算だけ（DOM・Pixi・乱数なし）。数値はすべて【仮】でここで調整する。
// sim.strike が無い時（ふつうのミッション・撃ち合い）は何もしない（stepStrike・applyStrikeCommand・hashSim の追加分）。
//
// 決まり（10/26 佳之さんの決定）:
//  - 撃つ前に発射台を壊されても、その場では負けにしない。2発目もない（phase 'lost'）。
//  - ミサイルの爆発は敵だけに当たる（味方・人間・遮蔽物には当たらない）。乱数は引かない。
//  - ネジが壊されたらすぐ負け・少年が捕まっても負け（sim.js の checkResult）。
//  - 少年はネジの背中に乗って始まる（ride.js の決まりそのまま。☰ から乗り降り）。
import { TILE, toTile, tileCenter, TERRAIN, tileAt } from './map.js?v=6';

export const STRIKE = Object.freeze({
  towMul: 0.75,          // 発射台をひっぱっている間のネジの速さ（倍率）
  hitchRange: 48,       // つなげる距離（px。1マス＝32）
  hitchSec: 1,          // つなぐのにかかる秒数（この間ネジが離れたらやり直し）
  rope: 22,             // ひっぱる時の発射台とネジの間（px）
  rangeTiles: 12,       // 発射台から撃てる距離（マス）
  setupSec: 4,          // 撃つと決めてから飛び立つまでの準備（秒）。この間に発射台を壊されると撃てない
  flightSec: 3,         // 飛んでいる秒数（着弾マーカーが出ている）
  radius: 96,           // 爆発の届く半径（px）
  inner: 48,            // この半径の中は最大のダメージ
  dmgMax: 600,          // 中心のダメージ（異星生物の HP より大きい）
  dmgMin: 200,          // 縁のダメージ
  provokeTiles: 8,      // 着弾点からこのマス以内にいた群れは、ネジに気づいて向かってくる
  launcherName: '発射台',
});
export const SURVEY = Object.freeze({ blockTiles: 5, gatherRadius: 1.6 }); // 調べる: 敵がこのマス以内にいると進まない／この半径（マス）にいる止まった味方が調べる
export const STRIKE_PHASES = Object.freeze(['buried', 'ready', 'arming', 'flying', 'spent', 'lost']);
const PHASE_CODE = Object.fromEntries(STRIKE_PHASES.map((p, i) => [p, i + 1]));
export const STRIKE_COMMANDS = Object.freeze(['hitch', 'unhitch', 'strike']);
export const STRIKE_MESSAGES = Object.freeze({
  notReady: 'いまは使えない', noNeji: 'ネジがいない', far: '発射台のそばへ行こう', range: '射程の外（12マスまで）',
  towing: 'すでにつないでいる', notTowing: 'つないでいない',
});

const byId = (sim, id) => (id == null ? null : sim.units.find(u => u.id === id) || null);
/** ネジ（物語の主役のロボ）。作った時の id で探す */
export const nejiOf = sim => byId(sim, sim.strike?.nejiId);
export const launcherOf = sim => byId(sim, sim.strike?.launcherId);

/** ミッションの strike / survey から sim.strike を作る（createSim が呼ぶ）。少年を背中に乗せて始める（mission.startRide） */
export function initStrike(sim, mission) {
  const neji = sim.units.find(u => u.side === 'ally' && u.kind === 'scav');
  const sv = mission.survey;
  sim.strike = {
    phase: 'buried', pile: mission.strike?.pile ?? 0, nejiId: neji ? neji.id : null, launcherId: null,
    towBy: null, hitch: null, trail: [], armT: 0, flightT: 0, from: null, target: null, kills: 0, firedAt: null, impactAt: null,
    survey: { tx: sv.tx, ty: sv.ty, amount: sv.amount, max: sv.amount, blocked: false, done: false, doneAt: null },
  };
  if (mission.startRide && neji) {
    const boy = sim.units.find(u => u.side === 'ally' && u.kind === 'boy');
    if (boy) {
      boy.ride = { host: neji.id, mode: 'back', phase: 'on', t: 0, from: null, to: null };
      boy.x = neji.x - 8; boy.y = neji.y; boy.order = null; boy.moving = false;
      sim.ride ??= { cmds: [] };
    }
  }
}

/** つなげるか・撃てるか（UI とテスト用）。{ ok, reason } */
export function canHitch(sim) {
  const S = sim.strike, n = nejiOf(sim), l = launcherOf(sim);
  if (!S || S.phase !== 'ready' || !l) return { ok: false, reason: 'notReady' };
  if (!n) return { ok: false, reason: 'noNeji' };
  if (S.towBy != null) return { ok: false, reason: 'towing' };
  if (Math.hypot(n.x - l.x, n.y - l.y) > STRIKE.hitchRange) return { ok: false, reason: 'far' };
  return { ok: true };
}
export function canStrike(sim, x, y) {
  const S = sim.strike, l = launcherOf(sim);
  if (!S || S.phase !== 'ready' || !l) return { ok: false, reason: 'notReady' };
  if (Math.hypot(x - l.x, y - l.y) > STRIKE.rangeTiles * TILE) return { ok: false, reason: 'range' };
  return { ok: true };
}
/** 命令は sim.commands に入れる（リプレイに残る）。実際に効くのは次の stepSim の最初 */
export function issueHitch(sim) { const r = canHitch(sim); if (r.ok) sim.commands.push({ type: 'hitch' }); return r; }
export function issueUnhitch(sim) {
  const S = sim.strike; if (!S || (S.towBy == null && !S.hitch)) return { ok: false, reason: 'notTowing' };
  sim.commands.push({ type: 'unhitch' }); return { ok: true };
}
export function issueStrike(sim, x, y) {
  const r = canStrike(sim, x, y); if (r.ok) sim.commands.push({ type: 'strike', x: Math.round(x), y: Math.round(y) }); return r;
}

function stopTow(sim) {
  const S = sim.strike, n = nejiOf(sim);
  S.towBy = null; S.hitch = null; S.trail = [];
  if (n) n.speedMul = 1;
}

/** sim.js の applyCommands が、strike の命令を見つけたら呼ぶ（もう一度確かめてから効かせる） */
export function applyStrikeCommand(sim, cmd) {
  const S = sim.strike; if (!S) return;
  if (cmd.type === 'hitch') { if (canHitch(sim).ok) S.hitch = { t: 0 }; }
  else if (cmd.type === 'unhitch') stopTow(sim);
  else if (cmd.type === 'strike') {
    if (!canStrike(sim, cmd.x, cmd.y).ok) return;
    stopTow(sim);
    const l = launcherOf(sim);
    S.phase = 'arming'; S.armT = 0; S.target = { x: cmd.x, y: cmd.y }; S.from = { x: l.x, y: l.y };
    sim.fx.push({ type: 'strikeArm', x: l.x, y: l.y, tx: cmd.x, ty: cmd.y, t: sim.time, side: 'ally' });
  }
}

/** 毎ステップ（sim.js の stepSim が updateMission のあとで呼ぶ）。api: { deployUnit, removeDead, gatherOf, isStunned } */
export function stepStrike(sim, dt, api) {
  const S = sim.strike; if (!S) return;
  const neji = nejiOf(sim);
  // 掘り出した: 山が空になったら、その場に発射台が出る。ネジがそばにいれば、そのままつなぐ
  if (S.phase === 'buried') {
    const p = sim.mission.salvage[S.pile];
    if (p && p.amount <= 0) {
      const l = api.deployUnit(sim, 'launcher', { tx: p.tx, ty: p.ty }, { label: STRIKE.launcherName });
      if (l) {
        S.launcherId = l.id; S.phase = 'ready';
        sim.fx.push({ type: 'missileFound', x: l.x, y: l.y, t: sim.time, side: 'ally' });
        if (neji && Math.hypot(neji.x - l.x, neji.y - l.y) <= STRIKE.hitchRange * 2) startTow(S, neji, l);
      }
    }
  }
  const l = launcherOf(sim);
  if ((S.phase === 'ready' || S.phase === 'arming') && !l) { // 撃つ前に壊された（負けにはしない・2発目はない）
    stopTow(sim); S.phase = 'lost';
    sim.fx.push({ type: 'launcherLost', x: S.from?.x ?? 0, y: S.from?.y ?? 0, t: sim.time, side: 'ally' });
  }
  if (S.phase === 'ready' && l) {
    if (S.hitch) { // つないでいる途中
      if (!neji || Math.hypot(neji.x - l.x, neji.y - l.y) > STRIKE.hitchRange) S.hitch = null;
      else if ((S.hitch.t += dt) >= STRIKE.hitchSec - 1e-6) startTow(S, neji, l);
    }
    if (S.towBy != null) {
      if (!neji) stopTow(sim);
      else { neji.speedMul = STRIKE.towMul; follow(S, neji, l); }
    }
  }
  if (S.phase === 'arming' && l) {
    S.armT += dt;
    if (S.armT >= STRIKE.setupSec - 1e-6) { // 飛び立つ（発射台は使い切り。壊れた扱いにはしない）
      S.from = { x: l.x, y: l.y };
      sim.units = sim.units.filter(u => u !== l);
      S.phase = 'flying'; S.flightT = 0; S.firedAt = sim.time;
      sim.fx.push({ type: 'strikeLaunch', x: l.x, y: l.y, tx: S.target.x, ty: S.target.y, t: sim.time, side: 'ally' });
    }
  } else if (S.phase === 'flying') {
    S.flightT += dt;
    if (S.flightT >= STRIKE.flightSec - 1e-6) impact(sim, api);
  }
  stepSurvey(sim, dt, api);
}

function startTow(S, neji, l) { S.towBy = neji.id; S.hitch = null; S.trail = [{ x: l.x, y: l.y }, { x: neji.x, y: neji.y }]; }

/** ネジの通った道をたどって、ロープの長さだけ後ろについていく（通った所は歩ける所なので、壁にめりこまない） */
function follow(S, neji, l) {
  const tr = S.trail, last = tr[tr.length - 1];
  if (Math.hypot(neji.x - last.x, neji.y - last.y) >= 4) tr.push({ x: neji.x, y: neji.y });
  let need = STRIKE.rope, px = neji.x, py = neji.y, cut = 0;
  for (let i = tr.length - 1; i >= 0; i--) {
    const q = tr[i], d = Math.hypot(px - q.x, py - q.y);
    if (d >= need) { const k = need / d; px += (q.x - px) * k; py += (q.y - py) * k; need = 0; cut = i; break; }
    need -= d; px = q.x; py = q.y; cut = i;
  }
  if (cut > 0) tr.splice(0, cut);
  if (need > 0 && Math.hypot(neji.x - l.x, neji.y - l.y) <= STRIKE.rope) return; // まだたるんでいる
  if (Math.abs(px - l.x) > 0.5) l.facing = px > l.x ? 1 : -1;
  l.x = px; l.y = py;
}

function impact(sim, api) {
  const S = sim.strike, { x, y } = S.target;
  let kills = 0;
  for (const e of sim.units) {
    if (e.side !== 'enemy' || e.hp <= 0) continue; // 敵だけ（決定）
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > STRIKE.radius) continue;
    const base = d <= STRIKE.inner ? STRIKE.dmgMax : STRIKE.dmgMax - (STRIKE.dmgMax - STRIKE.dmgMin) * (d - STRIKE.inner) / (STRIKE.radius - STRIKE.inner);
    const def = (e.z || 0) > 0 ? 1 : TERRAIN[tileAt(sim.map, toTile(e.x), toTile(e.y))].def; // 森・山の守りは効く
    const dmg = Math.max(1, Math.round(base * def));
    e.hp -= dmg; e.lastHit = sim.time;
    if (S.nejiId != null) sim.fx.push({ type: 'missileHit', from: S.nejiId, to: e.id, dmg, kill: e.hp <= 0, t: sim.time });
    if (e.hp <= 0) kills++;
  }
  const neji = nejiOf(sim), pr = STRIKE.provokeTiles * TILE;
  if (neji) for (const g of sim.groups) {
    if (g.role !== 'patrol') continue;
    if (g.unitIds.some(id => { const u = byId(sim, id); return u && u.hp > 0 && Math.hypot(u.x - x, u.y - y) <= pr; })) g.provokedBy = neji.id;
  }
  S.phase = 'spent'; S.kills = kills; S.impactAt = sim.time;
  sim.fx.push({ type: 'strikeHit', x, y, r: STRIKE.radius, kills, t: sim.time, side: 'ally' });
  api.removeDead(sim);
}

/** 設計図のありかを調べる: 調べる場所のそばで止まっている味方（集められる機体・乗っている少年も）が進める。敵が近いと進まない */
function stepSurvey(sim, dt, api) {
  const sv = sim.strike.survey; if (sv.done) return;
  const px = tileCenter(sv.tx), py = tileCenter(sv.ty);
  sv.blocked = sim.units.some(u => u.side === 'enemy' && u.hp > 0 && Math.hypot(u.x - px, u.y - py) <= SURVEY.blockTiles * TILE);
  if (sv.blocked) return;
  const r = SURVEY.gatherRadius * TILE;
  const near = sim.units.filter(u => u.side === 'ally' && u.captured == null && !u.order && !api.isStunned(u) && api.gatherOf(u) > 0 && Math.hypot(u.x - px, u.y - py) <= r);
  if (!near.length) return;
  const rate = near.reduce((a, u) => a + api.gatherOf(u), 0);
  sv.amount = Math.max(0, sv.amount - rate * dt); if (sv.amount < 1e-6) sv.amount = 0;
  for (const u of near) u.gathering = 'survey';
  if (sv.amount === 0) {
    sv.done = true; sv.doneAt = sim.time;
    sim.fx.push({ type: 'surveyDone', x: px, y: py, t: sim.time, side: 'ally' });
  }
}

/** HUD 用のまとめ */
export function strikeStatus(sim) {
  const S = sim.strike; if (!S) return null;
  const sv = S.survey, l = launcherOf(sim);
  return {
    phase: S.phase, towing: S.towBy != null, hitching: !!S.hitch, launcher: l ? { x: l.x, y: l.y, hp: l.hp, maxHp: l.maxHp } : null,
    armLeft: S.phase === 'arming' ? Math.max(0, STRIKE.setupSec - S.armT) : 0, flightLeft: S.phase === 'flying' ? Math.max(0, STRIKE.flightSec - S.flightT) : 0,
    target: S.target, kills: S.kills, survey: { left: sv.amount, max: sv.max, progress: 1 - sv.amount / sv.max, blocked: sv.blocked, done: sv.done },
  };
}

/** hashSim に混ぜる値（sim.strike がある時だけ呼ぶ） */
export function strikeHashValues(sim) {
  const S = sim.strike;
  return [PHASE_CODE[S.phase], S.towBy ?? -1, Math.round(S.survey.amount * 1000), S.target ? Math.round(S.target.x) : -1, S.target ? Math.round(S.target.y) : -1];
}
