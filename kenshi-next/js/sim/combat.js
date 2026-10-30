// 近接戦（チャンバラ）: 振りかぶり → 当たりの瞬間に受け判定 → 受け/崩し/当たり → ひるみ・よろけ → 番の取り合い。
// 攻撃枠は1人に同時2人まで。加勢、成長もここ。式は melee.js。

import {
  beastRules,
  canHarmDowned,
  downedHarmKind,
  WEAPONS,
  PART_KEYS,
  PART_WEIGHTS,
  ATTACK_SLOT_LIMIT,
  isHostile,
  distBetween,
  indexActors,
  countTargeters,
  setAnim,
  makeEvent,
  weaponBleed,
} from './data.js';
import { rand, randRange, randInt, chance } from './rng.js';
import { applyDamage, isStanding, armsLeft } from './body.js';
import { drop } from './carry.js';
import { HIT_REACTS, immuneToStagger, isHeavyHit, isRearHit, pickHitReact, mixHash, dodgeChanceOf } from './hitreact.js';
import { actorRadius, blockedAt } from './collide.js';
import { rangedMode } from './crossbow.js';
import {
  KENSHI,
  TUNING,
  weaponOf,
  cycleTicks,
  windupTicks,
  blockChance,
  blockRecoveryTicks,
  attackLevel,
  defenseLevel,
  initiativeChance,
  guardBreakChance,
  impactOf,
  staggerThreshold,
  toughnessMult,
  solMult,
  toughnessXpMult,
} from './melee.js';

// 部位ごとの「当たりやすさの倍率」(Kenshi の hitmult): 当たるたび +1（最大4）、100秒で1ずつ戻る。
// 体力がマイナスの部位は2まで。
const HITMULT_MAX = 4;
const HITMULT_DECAY_TICKS = 1000;

function pickPart(state, actor) {
  const hm = actor.hitmult || null;
  let total = 0;
  const w = {};
  for (const key of PART_KEYS) {
    let m = hm && hm[key] ? hm[key] : 1;
    if (actor.parts[key].hp < 0) m = Math.min(m, 2);
    // 失った手足には当たらない
    w[key] = actor.missing && actor.missing.includes(key) ? 0 : PART_WEIGHTS[key] * m;
    total += w[key];
  }
  let r = rand(state) * total;
  for (const key of PART_KEYS) {
    r -= w[key];
    if (r <= 0) return key;
  }
  return 'chest';
}

function bumpHitmult(state, actor, key) {
  if (!actor.hitmult) actor.hitmult = { t: state.tick };
  const hm = actor.hitmult;
  const decay = Math.floor((state.tick - (hm.t || 0)) / HITMULT_DECAY_TICKS);
  if (decay > 0) {
    for (const k of PART_KEYS) if (hm[k]) hm[k] = Math.max(1, hm[k] - decay);
    hm.t = state.tick;
  }
  hm[key] = Math.min(HITMULT_MAX, (hm[key] || 1) + 1);
}

// 成長。Kenshi の「格上ほど伸びる」倍率（melee.js solMult）を掛ける。
function growSkill(actor, key, base, opponentValue) {
  const own = actor.skills[key];
  actor.skills[key] = Math.min(100, own + base * solMult(own, opponentValue));
}

// 戦いの数（シミュの集計と画面の火花用）
function stats(state) {
  if (!state.meleeStats) {
    state.meleeStats = { swings: 0, blocks: 0, hits: 0, breaks: 0, staggers: 0, flinches: 0, counters: 0 };
  }
  return state.meleeStats;
}

// 画面用の一時的な出来事（火花・音）。直近だけ残す。
function pushFx(state, type, a, b) {
  if (!state.combatFx) state.combatFx = [];
  state.combatFx.push({
    type,
    tick: state.tick,
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    attackerId: a.id,
    defenderId: b.id,
  });
  if (state.combatFx.length > 24) state.combatFx.splice(0, state.combatFx.length - 24);
}

export function requestAssist(state, victim, attacker, events) {
  if (victim.assistDepth === null) victim.assistDepth = 0;
  if (victim.assistDepth >= 2) return;
  const wave = victim.assistDepth + 1;
  const joined = [];
  for (const ally of state.actors) {
    if (ally.id === victim.id) continue;
    if (ally.faction !== victim.faction) continue;
    if (!isStanding(ally)) continue;
    if (ally.assistDepth !== null) continue;
    if (distBetween(ally, victim) > 25) continue;
    ally.assistDepth = wave;
    if (countTargeters(state, attacker.id, ally.id) < ATTACK_SLOT_LIMIT) {
      ally.targetId = attacker.id;
      ally.state = 'fight';
    }
    joined.push(ally);
  }
  if (joined.length > 0) notifyAssist(state, joined, events);
  if (wave === 1) {
    for (const ally of joined) {
      if (ally.assistDepth !== 1) continue;
      assistWave2(state, ally, attacker, events);
    }
  }
}

function assistWave2(state, center, attacker, events) {
  const joined = [];
  for (const ally of state.actors) {
    if (ally.id === center.id) continue;
    if (ally.faction !== center.faction) continue;
    if (!isStanding(ally)) continue;
    if (ally.assistDepth !== null) continue;
    if (distBetween(ally, center) > 25) continue;
    ally.assistDepth = 2;
    if (countTargeters(state, attacker.id, ally.id) < ATTACK_SLOT_LIMIT) {
      ally.targetId = attacker.id;
      ally.state = 'fight';
    }
    joined.push(ally);
  }
  if (joined.length > 0) notifyAssist(state, joined, events);
}

function notifyAssist(state, joined, events) {
  const seen = {};
  for (const actor of joined) {
    if (!actor.squadId) continue;
    if (seen[actor.squadId]) continue;
    seen[actor.squadId] = true;
    let squad = null;
    for (const sq of state.squads) {
      if (sq.id === actor.squadId) squad = sq;
    }
    if (!squad || squad.assistNotified) continue;
    squad.assistNotified = true;
    events.push(makeEvent(state, 'assist', actor.name + 'たちが加勢した'));
  }
}

export function resetAssists(state) {
  const active = {};
  for (const actor of state.actors) {
    if (actor.assistDepth === null) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.targetId === null) {
      actor.assistDepth = null;
      continue;
    }
    if (actor.squadId) active[actor.squadId] = true;
  }
  for (const sq of state.squads) {
    if (!active[sq.id]) sq.assistNotified = false;
  }
}

export function trimAttackSlots(state) {
  const counts = new Map();
  for (const actor of state.actors) {
    if (actor.state === 'dead') {
      actor.targetId = null;
      continue;
    }
    if (actor.targetId === null) continue;
    const n = counts.get(actor.targetId) || 0;
    if (n >= ATTACK_SLOT_LIMIT) {
      // 枠からあふれた者は消さずに「周りで待つ」へ（ai.js が輪の位置へ動かす）
      actor.waitTargetId = actor.targetId;
      actor.targetId = null;
      actor.swing = null;
      continue;
    }
    counts.set(actor.targetId, n + 1);
  }
}


function busy(state, actor, key) {
  return (actor[key] || 0) > state.tick;
}

// 受けられる状態か（武器を持って立っていて、よろけ・受けの構え直し・自分の打ち込みの最中でない）
function canBlock(state, actor) {
  if (!weaponOf(actor).armed) return false;
  if (actor.state === 'down' || actor.state === 'getup' || actor.state === 'dead') return false;
  if (actor.carryingId !== null) return false;
  if (actor.aiming) return false;
  if (busy(state, actor, 'staggerUntil')) return false;
  if (busy(state, actor, 'blockUntil')) return false;
  // 自分の打ち込みが今まさに当たる瞬間（1 tick 以内）は受けられない
  if (actor.swing && actor.swing.impactTick - state.tick <= 1) return false;
  return true;
}

function cancelSwing(actor) {
  actor.swing = null;
}

// 振り始め（振りかぶり）。当たり判定は impactTick に行う。
function startSwing(state, attacker, target, events) {
  const cycle = cycleTicks(attacker) + randInt(state, -1, 1);
  const windup = windupTicks(attacker);
  attacker.swing = { targetId: target.id, startTick: state.tick, impactTick: state.tick + windup };
  attacker.swingWindup = windup; // 描画が振りの速さを合わせるため（数値はセーブにも残る）
  attacker.attackCd = cycle;
  attacker.counterUntil = 0;
  setAnim(attacker, attacker.weapon === 'fists' || attacker.weapon === 'bite' ? 'Punch' : 'Attack', state.tick);
  attacker.animTick = state.tick;
  attacker.state = 'fight';
  stats(state).swings += 1;

  if (target.carryingId !== null) drop(state, target, events);
  if (target.isPlayer && isStanding(target) && target.targetId === null && target.moveTo === null) {
    target.targetId = attacker.id;
    target.state = 'fight';
  }
  if (target.assistDepth === null) target.assistDepth = 0;
  requestAssist(state, target, attacker, events);
}

function rawDamage(state, attacker) {
  const weapon = WEAPONS[attacker.weapon];
  let min = weapon.min;
  let max = weapon.max;
  const crippled =
    attacker.weapon === 'fists'
      ? attacker.parts.lArm.hp <= 0 && attacker.parts.rArm.hp <= 0
      : weapon.armed && attacker.parts.rArm.hp <= 0;
  if (crippled) {
    min *= 0.5;
    max *= 0.5;
  }
  return randRange(state, min, max) * (1 + attacker.skills.strength * 0.004);
}

// 当たり: 部位・打たれ強さ・ひるみ/よろけ・成長
function landHit(state, attacker, target, raw, events, broken) {
  const partKey = pickPart(state, target);
  bumpHitmult(state, target, partKey);
  const dmg = raw * toughnessMult(target.skills.toughness);
  applyDamage(state, target, partKey, dmg, events, weaponBleed(attacker.weapon));
  target.lastAttackerId = attacker.id;
  if (attacker.faction === 'player') target.foughtPlayer = true;
  if (target.faction === 'player') attacker.foughtPlayer = true;
  stats(state).hits += 1;
  pushFx(state, broken ? 'break' : 'hit', attacker, target);

  // 成長: 当たった側の防御は受け成功の8倍、攻撃は1回分、打たれ強さはダメージの大きさで
  growSkill(attacker, 'attack', 0.01, defenseLevel(target));
  growSkill(target, 'defense', 0.005 * KENSHI.defXpHitMult, attackLevel(attacker));
  const t = target.skills.toughness;
  target.skills.toughness = Math.min(100, t + 0.01 * toughnessXpMult(dmg, t));

  if (target.state === 'down' || target.state === 'dead') {
    cancelSwing(target);
    return;
  }
  if (immuneToStagger(target)) return; // 獣・機械獣はよろけない（そのまま噛みつき続ける）
  const heavy = broken || isHeavyHit(dmg, target.skills.toughness);
  const rear = isRearHit(target, attacker);
  const kind = pickHitReact(heavy, rear, partKey, mixHash(attacker.id, target.id, state.tick));
  const inHeavy = busy(state, target, 'staggerUntil');
  const canStagger = !busy(state, target, 'staggerGuardUntil');
  if (heavy && canStagger) {
    // 重いよろけ: 受けられず振れない。その後しばらくは再びよろけない（連続よろけ防止）
    const ticks = HIT_REACTS[kind].ticks;
    target.staggerUntil = state.tick + ticks;
    target.staggerGuardUntil = target.staggerUntil + TUNING.staggerGuardTicks;
    target.flinchUntil = target.staggerUntil;
    target.flinchGuardUntil = target.staggerGuardUntil;
    target.blockUntil = 0;
    target.hitReact = { kind, tick: state.tick, until: target.staggerUntil };
    cancelSwing(target);
    target.anim = 'Stagger';
    target.animTick = state.tick;
    pushBack(state, target, attacker, kind);
    stats(state).staggers += 1;
  } else if (inHeavy) {
    // 重いよろけの最中の軽い当たり: 姿勢に小さく重ねるだけ（重いよろけは延びない）
    target.hitReactLight = { kind: rear ? 'light_rear' : 'light_front', tick: state.tick, until: state.tick + 3 };
  } else if (!busy(state, target, 'flinchGuardUntil')) {
    // 軽いよろけ（ひるみ）0.3秒。振りかぶり中なら振りは潰れる。0.5秒は再ひるみしない
    const lk = rear ? 'light_rear' : 'light_front';
    target.flinchUntil = state.tick + TUNING.flinchTicks;
    target.flinchGuardUntil = target.flinchUntil + TUNING.flinchGuardTicks;
    if (target.swing && target.swing.impactTick > state.tick) cancelSwing(target);
    target.hitReact = { kind: lk, tick: state.tick, until: target.flinchUntil };
    target.anim = 'Hit';
    target.animTick = state.tick;
    pushBack(state, target, attacker, lk);
    stats(state).flinches += 1;
  }
}

// よろけで押される（前のよろけは打った者から離れる向き、後ろのよろけは前へつんのめる＝同じ向き）。壁は抜けない
function pushBack(state, target, attacker, kind) {
  const dist = HIT_REACTS[kind].push;
  const dx = target.x - attacker.x;
  const dz = target.z - attacker.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-4 || !(dist > 0)) return;
  const nx = target.x + (dx / d) * dist;
  const nz = target.z + (dz / d) * dist;
  if (blockedAt(state, nx, nz, actorRadius(target))) return;
  target.x = nx;
  target.z = nz;
}

// 当たりの瞬間。受けは1撃ごとに判定する（2人がかりでも、構え直しが間に合えば両方受ける）。
function resolveStrike(state, attacker, target, events) {
  const raw = rawDamage(state, attacker);
  const standing = target.state !== 'down' && target.state !== 'getup';
  // 振っている間に倒れた相手には当てない（獣の噛みつきは従来どおり）
  if (!standing && !canHarmDowned(downedHarmKind(attacker, target))) return;
  // 避け: 重いよろけの最中だけ（受けられない代わりに、身のこなしで身をかわすことがある）
  if (standing && target.state !== 'dead' && busy(state, target, 'staggerUntil') && !immuneToStagger(target) &&
      (mixHash(target.id, attacker.id, state.tick * 7 + 3) % 1000) / 1000 < dodgeChanceOf(target)) {
    stats(state).dodges = (stats(state).dodges || 0) + 1;
    target.dodgeTick = state.tick;
    return;
  }
  if (standing && canBlock(state, target) &&
      chance(state, blockChance(defenseLevel(target), attackLevel(attacker)))) {
    const s = stats(state);
    s.blocks += 1;
    const aw = weaponOf(attacker);
    target.blockUntil = state.tick + blockRecoveryTicks(target, aw);
    target.anim = 'Block';
    target.animTick = state.tick;
    if (target.swing && target.swing.impactTick > state.tick) cancelSwing(target);
    growSkill(target, 'defense', 0.005, attackLevel(attacker));
    growSkill(attacker, 'attack', 0.01 * KENSHI.atkXpBlockedMult, defenseLevel(target));

    // 受け崩し（独自ルール）: 重心が先にある重い武器ほど、軽い武器の受けを崩す
    if (chance(state, guardBreakChance(attacker, target))) {
      s.breaks += 1;
      landHit(state, attacker, target, raw * TUNING.guardBreakDamage, events, true);
      return;
    }
    pushFx(state, 'block', attacker, target);

    // 番の取り合い: 攻撃の差で「次に攻める」側が決まる（差1ごとに 2.5%）
    if (target.targetId === attacker.id && chance(state, initiativeChance(target, attacker))) {
      s.counters += 1;
      const delay = randInt(state, TUNING.counterMinTicks, TUNING.counterMaxTicks);
      target.attackCd = Math.max(target.blockUntil - state.tick, delay);
      target.counterUntil = state.tick + target.attackCd + 3;
      attacker.attackCd = Math.max(attacker.attackCd, target.attackCd + windupTicks(target) + 2);
    } else {
      target.attackCd = Math.max(target.attackCd, attacker.attackCd + 1);
    }
    return;
  }
  landHit(state, attacker, target, raw, events, false);
}

function dropTarget(actor) {
  actor.targetId = null;
  actor.swing = null;
  actor.state = 'idle';
}

export function resolveCombat(state, events) {
  const byId = indexActors(state);
  // 誰かに打ち込まれている最中の者（自分からは振り始めず、受けに回る）
  const incoming = new Set();
  for (const a of state.actors) {
    if (a.swing && a.state !== 'dead') incoming.add(a.swing.targetId);
  }

  for (const actor of state.actors) {
    if (actor.state === 'dead') continue;
    if (actor.attackCd > 0) actor.attackCd -= 1;
    if (actor.state === 'down' || actor.state === 'getup') {
      actor.swing = null;
      continue;
    }

    // 振りかぶりが終わったら当たり判定
    if (actor.swing && state.tick >= actor.swing.impactTick) {
      const sw = actor.swing;
      actor.swing = null;
      const t = byId.get(sw.targetId);
      if (t && t.state !== 'dead' && distBetween(actor, t) <= weaponOf(actor).range * 1.25) {
        resolveStrike(state, actor, t, events);
      }
    }

    if (actor.carryingId !== null) continue;
    if ((actor.fleeUntil || 0) > state.tick) continue;
    if (actor.targetId === null) continue;

    const target = byId.get(actor.targetId);
    if (!target || target.state === 'dead') {
      dropTarget(actor);
      continue;
    }
    if (
      (target.state === 'down' || target.state === 'getup') &&
      !canHarmDowned(downedHarmKind(actor, target))
    ) {
      dropTarget(actor);
      continue;
    }
    const d = distBetween(actor, target);
    if (d > 30 && !actor.isPlayer) {
      dropTarget(actor);
      continue;
    }
    if (rangedMode(actor, d)) continue;
    if (d > weaponOf(actor).range) continue;
    // 新しい相手と間合いに入った最初は、0.2〜0.8秒 間を計る（先に並んだ者が必ず先手、を防ぐ）
    if (actor.engageId !== target.id) {
      actor.engageId = target.id;
      actor.attackCd = Math.max(actor.attackCd, randInt(state, 2, 8));
    }
    if (actor.attackCd > 0) continue;
    if (actor.swing) continue;
    if (busy(state, actor, 'flinchUntil') || busy(state, actor, 'staggerUntil')) continue;
    if (busy(state, actor, 'blockUntil')) continue;
    // 打ち込まれている間は受けに回る（反撃の番を取った時だけ振れる）
    const countering = busy(state, actor, 'counterUntil');
    if (incoming.has(actor.id) && !countering) continue;
    if (countTargeters(state, target.id, actor.id) >= ATTACK_SLOT_LIMIT) continue;
    // 両腕を失うと殴れない（噛むものは別）
    if (actor.missing && actor.weapon !== 'bite' && armsLeft(actor) === 0) continue;
    startSwing(state, actor, target, events);
    incoming.add(target.id);
  }
}
