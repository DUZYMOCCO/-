// 勢力・定数・名前表・武器など、ルール層の共通データ。

export const TICK_SEC = 0.1;
export const GAME_SEC_PER_TICK = 3;
export const START_TIME_SEC = 28800;
export const DAY_SEC = 86400;
export const WORLD_HALF = 200;

export const ACTOR_LIMIT = 60;
export const CORPSE_LIMIT = 20;
export const ATTACK_SLOT_LIMIT = 3;
export const RESPAWN_TICKS = 2400; // ゲーム内2時間 = 7200秒 = 2400tick
export const RAID_COOLDOWN_TICKS = 1200; // 120秒

export const PART_KEYS = ['head', 'chest', 'stomach', 'lArm', 'rArm', 'lLeg', 'rLeg'];
export const VITALS = ['head', 'chest', 'stomach'];

export const PART_MAX = {
  head: 80,
  chest: 100,
  stomach: 100,
  lArm: 60,
  rArm: 60,
  lLeg: 70,
  rLeg: 70,
};

export const PART_WEIGHTS = {
  head: 10,
  chest: 25,
  stomach: 20,
  lArm: 10,
  rArm: 10,
  lLeg: 12.5,
  rLeg: 12.5,
};

export const PART_LABEL = {
  head: '頭',
  chest: '胸',
  stomach: '腹',
  lArm: '左腕',
  rArm: '右腕',
  lLeg: '左脚',
  rLeg: '右脚',
};

export const WEAPONS = {
  fists: { min: 6, max: 9, range: 1.6 },
  sword: { min: 16, max: 24, range: 1.6 },
  machete: { min: 12, max: 20, range: 1.6 },
  bite: { min: 10, max: 16, range: 1.4 },
};

export const WEAPON_BY_FACTION = {
  guard: 'sword',
  bandit: 'machete',
  beast: 'bite',
  player: 'fists',
};

export const FACTIONS = {
  guard: { id: 'guard', name: '衛兵', color: '#3f6fb5' },
  bandit: { id: 'bandit', name: '盗賊', color: '#b5483a' },
  beast: { id: 'beast', name: '獣', color: '#8a8a80' },
  player: { id: 'player', name: '流れ者', color: '#e0b84a' },
};

export const FACTION_ORDER = ['guard', 'bandit', 'beast', 'player'];

export const VISION = { guard: 20, bandit: 16, beast: 14, player: 14 };

const HOSTILE_PAIRS = {
  'bandit|guard': true,
  'beast|guard': true,
  'bandit|beast': true,
  'bandit|player': true,
  'beast|player': true,
};

export function isHostile(state, fa, fb) {
  if (!fa || !fb || fa === fb) return false;
  if ((fa === 'guard' && fb === 'player') || (fa === 'player' && fb === 'guard')) {
    return !!(state && state.relations && state.relations.guard_player === 'hostile');
  }
  const a = fa < fb ? fa : fb;
  const b = fa < fb ? fb : fa;
  return HOSTILE_PAIRS[a + '|' + b] === true;
}

export const GUARD_NAMES = [
  'タケ', 'イチ', 'ソウ', 'カイ', 'ジン', 'ハル', 'マサ', 'ユウ', 'ゲン', 'トウ',
];
export const BANDIT_NAMES = [
  'ゴロ', 'ザン', 'クロ', 'ダン', 'バク', 'ナギ', 'レイ', 'ガイ', 'ロク', 'ムジ',
];

export function makeEvent(state, type, text) {
  return { type, tick: state.tick, timeSec: state.timeSec, text };
}

export function setAnim(actor, name, tick) {
  if (actor.anim !== name) {
    actor.anim = name;
    actor.animTick = tick;
  }
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function distBetween(a, b) {
  return Math.sqrt(dist2(a.x, a.z, b.x, b.z));
}

export function indexActors(state) {
  const map = new Map();
  for (const a of state.actors) map.set(a.id, a);
  return map;
}

export function countTargeters(state, targetId, excludeId) {
  let n = 0;
  for (const a of state.actors) {
    if (a.id === excludeId) continue;
    if (a.targetId === targetId && a.state !== 'dead') n += 1;
  }
  return n;
}
