/**
 * IRON SQUAD: 小隊遠征 (platoon expedition) — send 本隊 platoon into danger,
 * fight independently, auto-return when near death so survivors can awaken.
 * UI lives under 国家運営. Selection = 本隊 only (直属 never join; player can escort them).
 * Player picks danger tier (risk → harder fights / more casualty chance, better return loot).
 * Return grants gold / items / XP; surviving へっぽこ get grit + deathline luck.
 * v1.25.7
 */
export const EXPEDITION_HP_RETREAT = 0.32;
export const EXPEDITION_DOWN_RATIO = 0.45;
export const EXPEDITION_SURVIVOR_RATIO = 0.40;
export const EXPEDITION_MIN_MEMBERS = 3;
export const EXPEDITION_RETURN_HOME = 300;
export const EXPEDITION_CHECK_INTERVAL = 0.45;
export const EXPEDITION_WANDER_MIN = 2600;
export const EXPEDITION_WANDER_MAX = 5600;
export const EXPEDITION_ENGAGE_R = 520;

/** Danger tiers: higher risk = farther/harder, delayed auto-return, better rewards. */
export const EXPEDITION_DANGER_TIERS = [
  { id: 1, key: 'patrol', label: '哨戒', icon: '🌿', color: '#86efac',
    minR: 2400, maxR: 3400, engageR: 480, rewardMult: 1.0, hazardTaken: 1.0,
    hpRetreat: 0.36, downRatio: 0.42, survivorRatio: 0.42, desc: '近郊・安全寄り。報酬控えめ。' },
  { id: 2, key: 'danger', label: '危険', icon: '⚠️', color: '#fde68a',
    minR: 3400, maxR: 5200, engageR: 520, rewardMult: 1.45, hazardTaken: 1.12,
    hpRetreat: 0.32, downRatio: 0.45, survivorRatio: 0.40, desc: '標準の危険地帯。バランス型。' },
  { id: 3, key: 'deathline', label: '死線', icon: '💀', color: '#fca5a5',
    minR: 5200, maxR: 7800, engageR: 560, rewardMult: 2.05, hazardTaken: 1.28,
    hpRetreat: 0.26, downRatio: 0.52, survivorRatio: 0.34, desc: '高リスク。帰還報酬が厚い。' },
  { id: 4, key: 'abyss', label: '魔境', icon: '☠️', color: '#c084fc',
    minR: 7600, maxR: 11800, engageR: 620, rewardMult: 2.95, hazardTaken: 1.48,
    hpRetreat: 0.20, downRatio: 0.58, survivorRatio: 0.28, desc: '極限。大化け／大損耗の両刃。' }
];

export function getDangerTier(tierId) {
  const id = Number(tierId) || 2;
  return EXPEDITION_DANGER_TIERS.find((t) => t.id === id) || EXPEDITION_DANGER_TIERS[1];
}

/** Main-body soldiers of a platoon (excludes personal guards / dead). */
export function expeditionMembers(game, platoonId, pickedIds = null) {
  const pid = (platoonId | 0) % 3;
  let list = (game.squad || []).filter(
    (s) => s && !s.dead && !s.isPersonalGuard && ((s.platoonId || 0) % 3) === pid
  );
  if (pickedIds && pickedIds.length) {
    const set = new Set(pickedIds.map(String));
    list = list.filter((s) => set.has(String(s.id)));
  }
  return list;
}

export function expeditionCombatReady(members) {
  return (members || []).filter((s) => s && !s.isDown);
}

export function avgHpRatio(members) {
  const living = expeditionCombatReady(members);
  if (!living.length) return 0;
  let sum = 0;
  for (const s of living) sum += (s.hp || 0) / Math.max(1, s.maxHp || 1);
  return sum / living.length;
}

/**
 * Auto-return when near wipe — thresholds loosen at higher danger (more casualty risk).
 */
export function shouldAutoReturn(platoon, members) {
  if (!platoon || platoon.mission !== 'expedition') return false;
  const roster = members || [];
  if (!roster.length) return true;
  const ready = expeditionCombatReady(roster);
  const downed = roster.filter((s) => s.isDown);
  const start = Math.max(1, platoon.expeditionStartCount || roster.length);
  const tier = getDangerTier(platoon.expeditionDangerTier);
  const hpRetreat = tier.hpRetreat ?? EXPEDITION_HP_RETREAT;
  const downRatio = tier.downRatio ?? EXPEDITION_DOWN_RATIO;
  const survivorRatio = tier.survivorRatio ?? EXPEDITION_SURVIVOR_RATIO;

  if (ready.length === 0 && downed.length > 0) return true;
  if (ready.length > 0 && avgHpRatio(roster) < hpRetreat) return true;
  if (downed.length / roster.length >= downRatio) return true;
  if (start >= 3 && ready.length / start <= survivorRatio) return true;
  return false;
}

export function pickExpeditionTarget(game, baseCamp, territoryR, tierId = 2) {
  const tier = getDangerTier(tierId);
  const bx = baseCamp.x, by = baseCamp.y;
  const minR = Math.max(territoryR + 200, tier.minR);
  const maxR = Math.max(minR + 200, tier.maxR);
  let best = null, bestScore = Infinity;
  for (const o of game.outposts || []) {
    if (!o || o.cleared) continue;
    const d = Math.hypot(o.x - bx, o.y - by);
    if (d < minR || d > maxR + 1200) continue;
    // Prefer mid-band of the tier ring
    const mid = (minR + maxR) * 0.5;
    const score = Math.abs(d - mid);
    if (score < bestScore) { bestScore = score; best = { x: o.x, y: o.y, label: `${tier.icon}${o.name || '未制圧拠点'}` }; }
  }
  if (best) return best;
  const ang = Math.random() * Math.PI * 2;
  const r = minR + Math.random() * (maxR - minR);
  return {
    x: bx + Math.cos(ang) * r,
    y: by + Math.sin(ang) * r,
    label: `${tier.icon}${tier.label}地帯`
  };
}

export function canStartExpedition(game, platoonId, pickedIds = null) {
  const members = expeditionMembers(game, platoonId, pickedIds);
  return expeditionCombatReady(members).length >= EXPEDITION_MIN_MEMBERS;
}

export function startExpeditionState(platoon, target, members, tierId = 2) {
  const ready = expeditionCombatReady(members);
  const tier = getDangerTier(tierId);
  platoon.mission = 'expedition';
  platoon.expeditionTargetX = target.x;
  platoon.expeditionTargetY = target.y;
  platoon.expeditionLabel = target.label || `${tier.icon}${tier.label}地帯`;
  platoon.expeditionStartCount = ready.length;
  platoon.expeditionDangerTier = tier.id;
  platoon.expeditionMemberIds = (members || []).filter((s) => s && !s.dead).map((s) => s.id);
  platoon.returnReason = null;
  return ready.length;
}

export function beginReturnState(platoon, reason) {
  platoon.mission = 'returning';
  platoon.returnReason = reason || 'casualty';
}

export function clearExpeditionState(platoon) {
  platoon.mission = 'idle';
  platoon.expeditionTargetX = null;
  platoon.expeditionTargetY = null;
  platoon.expeditionLabel = null;
  platoon.expeditionStartCount = 0;
  platoon.expeditionDangerTier = null;
  platoon.expeditionMemberIds = null;
  platoon.returnReason = null;
}

export function isPlatoonAway(platoon) {
  return !!(platoon && (platoon.mission === 'expedition' || platoon.mission === 'returning'));
}

export function persistPlatoonMissions(platoons) {
  return (platoons || []).map((p) => ({
    id: p.id,
    mission: p.mission || 'idle',
    expeditionTargetX: p.expeditionTargetX ?? null,
    expeditionTargetY: p.expeditionTargetY ?? null,
    expeditionLabel: p.expeditionLabel || null,
    expeditionStartCount: p.expeditionStartCount || 0,
    expeditionDangerTier: p.expeditionDangerTier || null,
    expeditionMemberIds: p.expeditionMemberIds || null,
    returnReason: p.returnReason || null,
    x: p.x, y: p.y
  }));
}

export function restorePlatoonMissions(platoons, saved) {
  if (!platoons || !saved || !saved.length) return;
  for (const row of saved) {
    const p = platoons.find((x) => x.id === row.id);
    if (!p) continue;
    p.mission = row.mission || 'idle';
    p.expeditionTargetX = row.expeditionTargetX ?? null;
    p.expeditionTargetY = row.expeditionTargetY ?? null;
    p.expeditionLabel = row.expeditionLabel || null;
    p.expeditionStartCount = row.expeditionStartCount || 0;
    p.expeditionDangerTier = row.expeditionDangerTier || null;
    p.expeditionMemberIds = row.expeditionMemberIds || null;
    p.returnReason = row.returnReason || null;
    if (typeof row.x === 'number') p.x = row.x;
    if (typeof row.y === 'number') p.y = row.y;
  }
}

export function missionStatusJa(platoon) {
  if (!platoon) return '待機';
  const tier = platoon.expeditionDangerTier ? getDangerTier(platoon.expeditionDangerTier) : null;
  const tierTag = tier ? `${tier.icon}${tier.label}·` : '';
  if (platoon.mission === 'expedition') return `遠征中（${tierTag}${platoon.expeditionLabel || '危険地帯'}）`;
  if (platoon.mission === 'returning') {
    const why = platoon.returnReason === 'manual' ? '手動召還' : '死線手前・自動帰還';
    return `帰還中（${tierTag}${why}）`;
  }
  return '本陣防衛圏';
}

/** Survivors who made it home (living 本隊; excludes personal / dead). */
export function expeditionSurvivors(members) {
  return (members || []).filter((s) => s && !s.dead);
}

/**
 * Rewards when a platoon reaches home (auto or manual recall).
 * Scales with start size, combat-ready survivors, phase, and danger tier.
 */
export function computeExpeditionReturnRewards(platoon, members, phase = 1) {
  const roster = expeditionSurvivors(members);
  const ready = expeditionCombatReady(roster);
  const start = Math.max(1, (platoon && platoon.expeditionStartCount) || roster.length || 1);
  const phaseScale = 1 + Math.max(0, (phase || 1) - 1) * 0.08;
  const tier = getDangerTier(platoon && platoon.expeditionDangerTier);
  const hard = platoon && platoon.returnReason === 'casualty';
  const mult = (tier.rewardMult || 1) * phaseScale;
  const gold = Math.round((48 + start * 14 + ready.length * 22 + (hard ? 35 : 0)) * mult);
  const playerExp = Math.round((28 + start * 7 + ready.length * 12 + (hard ? 20 : 0)) * mult);
  const soldierExp = Math.round((16 + ready.length * 5 + (hard ? 8 : 0)) * mult);
  let lootCount = ready.length >= Math.max(2, Math.ceil(start * 0.55)) ? 2 : 1;
  if (tier.id >= 3 && ready.length >= 2) lootCount = Math.max(lootCount, 2);
  if (tier.id >= 4 && ready.length >= 3) lootCount = Math.max(lootCount, 3);
  const lootKind = tier.id >= 3 || hard ? 'elite' : (tier.id >= 2 && ready.length >= 5 ? 'elite' : 'normal');
  const lootDistance = (tier.minR + tier.maxR) * 0.5 + (hard ? 600 : 0);
  return {
    gold,
    playerExp,
    soldierExp,
    lootCount,
    lootKind,
    lootDistance,
    survivors: roster,
    readyCount: ready.length,
    startCount: start,
    hard: !!hard,
    tier,
    rewardMult: tier.rewardMult || 1
  };
}

/** へっぽこ who survived: grit stack + deathline luck roll chance + extra XP multiplier. */
export const INFERIOR_EXPEDITION_EXTRA_XP = 1.85;
export const INFERIOR_GRIT_CAP = 8;
export const INFERIOR_DEATHLINE_LUCK = 0.42; // base awaken chance on return

export function isInferiorSurvivor(soldier) {
  return !!(soldier && !soldier.dead && soldier.talent === 'INFERIOR');
}

export function applyInferiorExpeditionGrit(soldier) {
  if (!isInferiorSurvivor(soldier)) return null;
  const prev = soldier.inferiorGrit || 0;
  soldier.inferiorGrit = Math.min(INFERIOR_GRIT_CAP, prev + 1);
  soldier.inferiorDeathlineLuck = (soldier.inferiorDeathlineLuck || 0) + 0.12;
  return {
    grit: soldier.inferiorGrit,
    luck: soldier.inferiorDeathlineLuck,
    gained: soldier.inferiorGrit > prev
  };
}

/** Extra damage taken while on platoon expedition (by danger tier). */
export function expeditionHazardTakenMult(platoon) {
  if (!platoon || platoon.mission !== 'expedition') return 1;
  return getDangerTier(platoon.expeditionDangerTier).hazardTaken || 1;
}

export function expeditionEngageRadius(platoon) {
  if (!platoon) return EXPEDITION_ENGAGE_R;
  return getDangerTier(platoon.expeditionDangerTier).engageR || EXPEDITION_ENGAGE_R;
}

/** True if this 本隊 soldier is part of the active expedition roster. */
export function isSoldierOnExpedition(platoon, soldier) {
  if (!platoon || !soldier || soldier.isPersonalGuard) return false;
  if (!isPlatoonAway(platoon)) return false;
  const ids = platoon.expeditionMemberIds;
  if (!ids || !ids.length) {
    // legacy saves: whole platoon main-body
    return ((soldier.platoonId || 0) % 3) === ((platoon.id || 0) % 3);
  }
  return ids.map(String).includes(String(soldier.id));
}
