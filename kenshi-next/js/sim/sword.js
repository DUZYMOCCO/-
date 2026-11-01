import { SWORD_FAMILY_NAMES, SWORD_MOVES } from '../data/sword_moves.js';
import { WEAPONS } from './data.js';
import { rand } from './rng.js';
import { effectiveStrengthReq } from './grip.js';
import { effectiveStrength } from './needs.js';

const DEFAULT_WEAPON_FAMILY = { sword: 'katana', sabre: 'sabre', machete: 'heavy_blade' };

export function swordFamily(actor) {
  if (!actor) return null;
  if (actor.swordDemoMoveId && SWORD_FAMILY_NAMES[actor.swordDemoFamily]) return actor.swordDemoFamily;
  const weapon = WEAPONS[actor.weapon];
  if (!weapon) return null;
  return DEFAULT_WEAPON_FAMILY[actor.weapon] || ({ katana: 'katana', sabre: 'sabre', cleaver: 'heavy_blade' })[weapon.family] || null;
}

export function movesForSwordFamily(family) {
  return SWORD_MOVES.filter(move => move.family === family);
}

export function swordMoveAvailable(actor, move, level = actor?.skills?.attack ?? 0) {
  if (!actor || !move || !WEAPONS[actor.weapon] || Number(level) < move.level) return false;
  const family = swordFamily(actor);
  if (family !== move.family) return false;
  // 筋力で候補から外すのは看板技だけ。通常技の筋力不足は振りの遅さ（grip.js の速度罰）で表す。
  if (move.heavySignature) {
    const requiredStrength = effectiveStrengthReq(actor, actor.weapon, move.strengthReq);
    if (effectiveStrength(actor) < requiredStrength) return false;
  }
  for (const [skill, required] of Object.entries(move.requiredSkills || {})) {
    if ((Number(actor.skills?.[skill]) || 0) < required) return false;
  }
  return true;
}

export function availableSwordMoves(actor, family = swordFamily(actor), level = actor?.skills?.attack ?? 0) {
  return SWORD_MOVES.filter(move => move.family === family && swordMoveAvailable(actor, move, level));
}

function scoreMove(state, actor, target, move) {
  const tags = move.aiWhen || [];
  let score = 100;
  const distance = target ? Math.hypot(target.x - actor.x, target.z - actor.z) : 1;
  if (distance < 0.8 && tags.includes('至近距離')) score += 18;
  if (distance > (WEAPONS[actor.weapon]?.range || 1.6) && tags.includes('踏み込み')) score += 14;
  if (distance <= move.effects.reach_m && tags.includes('基礎')) score += 10;
  if (target && (target.staggerUntil || 0) > state.tick && tags.includes('追撃')) score += 20;
  if (target && (target.state === 'down' || target.state === 'getup') && tags.includes('決着')) score += 14;
  if ((actor.stamina ?? 100) < 25 && tags.includes('低負荷')) score += 22;
  if ((actor.stamina ?? 100) < 25 && tags.includes('高負荷')) score -= 24;
  if (actor.isPlayer && (actor.skills?.health ?? 100) < 30 && tags.includes('受け')) score += 14;
  const last = actor.swordLastMoveIds || [];
  if (last[0] === move.id) score *= last[1] === move.id ? 0.15 : 0.55;
  return Math.max(5, score);
}

export function selectSwordMove(state, actor, target = null, level = actor?.skills?.attack ?? 0) {
  const candidates = availableSwordMoves(actor, swordFamily(actor), level);
  if (!candidates.length) {
    actor.swordDemoMoveId = null;
    actor.swordDemoFamily = null;
    return null;
  }
  const forcedId = actor.swordDemoMoveId;
  actor.swordDemoMoveId = null;
  if (forcedId) {
    const forced = candidates.find(move => move.id === forcedId);
    actor.swordDemoFamily = null;
    if (forced) return forced;
  }
  const scored = candidates.map(move => ({ move, score: scoreMove(state, actor, target, move) }));
  const total = scored.reduce((sum, entry) => sum + entry.score, 0);
  let pick = rand(state) * total;
  for (const entry of scored) {
    pick -= entry.score;
    if (pick < 0) {
      actor.swordLastMoveIds = [entry.move.id, ...(actor.swordLastMoveIds || []).slice(0, 1)];
      return entry.move;
    }
  }
  const fallback = scored[scored.length - 1].move;
  actor.swordLastMoveIds = [fallback.id, ...(actor.swordLastMoveIds || []).slice(0, 1)];
  return fallback;
}

export function swordHitTicks(move, startTick) {
  const speed = Math.max(0.1, Number(move?.clipSpeed) || 1);
  return (move?.hitTimes || []).map(time => startTick + Math.max(1, Math.round(time / speed * 10)));
}

export function swordPerHitMultiplier(move) {
  const count = Math.max(1, Number(move?.effects?.multi_hit) || 1);
  return (Number(move?.effects?.dmg_mult) || 1) / count;
}

export function swordArmorProfile(move, weapon) {
  const effects = move?.effects || {};
  return {
    ...weapon,
    cutShare: Number(effects.cut_ratio) || 0,
    armorPenetration: Number(effects.armor_gap) || 0,
    dazeMult: (weapon?.dazeMult || 1) * (1 + (Number(effects.daze) || 0)),
  };
}

export function swordMoveInfo(move) {
  return {
    id: move.id,
    family: move.family,
    familyName: SWORD_FAMILY_NAMES[move.family],
    name: move.name,
    level: move.level,
    clip: move.clip,
    clipDuration: move.clipDuration,
    clipSpeed: move.clipSpeed,
    duration: move.duration,
    hitTimes: [...move.hitTimes],
    strengthReq: move.strengthReq,
    requiredSkills: { ...(move.requiredSkills || {}) },
    effects: { ...move.effects },
    aiWhen: [...(move.aiWhen || [])],
    missingMotion: move.missingMotion,
  };
}

// 設計書の stagger/bleed は「有効打ごとの発生率」。今の戦闘は「よろけ＝ダメージと打たれ強さで決まる」「出血＝武器ごとの出血率×ダメージ」なので、
// 系統の基本技（解放Lv0）を今までの振りと同じ 1.0 とし、よろけだけ基本技との差を重い当たり判定の倍率に足す。
// 出血は武器ごとの出血率（刀1.2倍・肉切り0.75倍）を崩さないため倍率には使わず、AIの技選び（出血狙い）だけに使う。
const BASE_STAGGER = {};
for (const move of SWORD_MOVES) if (move.level === 0) BASE_STAGGER[move.family] = Number(move.effects?.stagger) || 0;
export function swordStaggerMult(move) {
  if (!move?.effects) return 1;
  const base = BASE_STAGGER[move.family] ?? 0;
  return Math.max(0.5, Math.round((1 + (Number(move.effects.stagger) || 0) - base) * 1000) / 1000);
}
