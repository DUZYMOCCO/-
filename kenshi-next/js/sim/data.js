// 勢力・定数・名前表・武器など、ルール層の共通データ。

export const TICK_SEC = 0.1;
export const GAME_SEC_PER_TICK = 3;
export const START_TIME_SEC = 28800;
export const DAY_SEC = 86400;
export const WORLD_HALF = 200;

export const ACTOR_LIMIT = 60;
export const CORPSE_LIMIT = 20;
// 1人を同時に斬れるのは2人まで（2026-10-29 20:13 の決定。Kenshi本体は1）。あふれた者は周りで輪になって待つ。
export const ATTACK_SLOT_LIMIT = 2;
export const RESPAWN_TICKS = 2400; // ゲーム内2時間 = 7200秒 = 2400tick
export const RAID_COOLDOWN_TICKS = 1200; // 120秒
export const CARRY_RANGE = 1.5;
export const CARRY_SPEED_FACTOR = 0.6;
export const LOOT_TICKS = 60;
export const LOOT_SAFE_DIST = 20;

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

// 部位の当たりやすさ = Kenshi の人間（Greenlander）の Hit Chance（kenshi.fandom.com/wiki/Damage/Limb_Data）。
// 右腕は武器を持って引いているので左腕の半分。合計 640。
export const PART_WEIGHTS = {
  head: 80,
  chest: 140,
  stomach: 140,
  lArm: 80,
  rArm: 40,
  lLeg: 80,
  rLeg: 80,
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

// 近接武器。
//   bleed  = Kenshi の出血倍率 (Blood loss)。根拠は research/weapon_bleed.md
//   reach  = Kenshi の Reach（fandom の武器表）。range(m) = 1.6 × reach / 21（刀を 1.6m とした比）
//   weight / blunt = Kenshi Mk I の重さ(kg)と打撃ダメージ。必要筋力 = max(40 × blunt, weight)（wiki: Combat Speed）
//   atk / def = Kenshi の武器の攻撃・防御補正（Katana +4/-4, Long Cleaver 0/-2, Desert Sabre 0/+2）
//   topBalance = 重心が握りからどれだけ先にあるか (0..1)。★この世界の独自ルール・仮の値（20:15 の決定）。
//     高い = 重い当たり（受けを崩しやすい）・振りが遅い・受けたあと構え直しが遅い。
//     低い = 速い・受けが得意・受けは崩しにくい。
//   armed = 武器で受けられるか（素手・噛みつきは受けない。回避はまだ無い）
//   min / max = この世界のダメージ（Kenshi の値ではない）。★20:13 に Kenshi の打たれ強さ倍率（T0で1.65倍）へ
//     替えたので約0.7倍に下げた（決闘シミュで合わせた仮の値）
export const WEAPONS = {
  fists: { min: 5, max: 7, range: 1.6, bleed: 0.05, kenshi: 'Martial Arts',
    reach: 21, weight: 0, blunt: 0, atk: 0, def: 0, topBalance: 0.1, armed: false },
  sword: { min: 11, max: 17, range: 1.6, bleed: 1.2, kenshi: 'Katana',
    reach: 21, weight: 2, blunt: 0, atk: 4, def: -4, topBalance: 0.25, armed: true },
  sabre: { min: 10, max: 16, range: 1.68, bleed: 1.0, kenshi: 'Desert Sabre',
    reach: 22, weight: 8, blunt: 0.25, atk: 0, def: 2, topBalance: 0.4, armed: true },
  machete: { min: 9, max: 14, range: 1.9, bleed: 0.75, kenshi: 'Long Cleaver',
    reach: 25, weight: 16, blunt: 0.8, atk: 0, def: -2, topBalance: 0.65, armed: true },
  // 槌（重い武器）。★まだ持つ者も模型も無い。値は Kenshi の重い武器（Fragment Axe 系: reach 32、
  // 打撃 1.8x 級）に寄せた仮の値。
  hammer: { min: 14, max: 22, range: 2.44, bleed: 0.3, kenshi: 'Heavy Weapon (仮)',
    reach: 32, weight: 22, blunt: 1.2, atk: 0, def: 0, topBalance: 0.85, armed: true },
  // 棍棒（人食い・グールの骨付きの棍棒）。★仮の値: 鉈より遅く重い打撃、槌より軽い。
  club: { min: 10, max: 15, range: 1.8, bleed: 0.35, kenshi: 'Club (仮)',
    reach: 23, weight: 10, blunt: 1.0, atk: 0, def: -2, topBalance: 0.6, armed: true },
  bite: { min: 7, max: 11, range: 1.4, bleed: 1.0, kenshi: '(animal)',
    reach: 18, weight: 0, blunt: 0, atk: 0, def: 0, topBalance: 0.3, armed: false },
};

// クロスボウごとの出血倍率（Kenshi の表示値）。
// Kenshi 本体では表示に関係なく常に 2.0x になるが、それは不具合とみなし表示値を使う（2026-10-29 18:10 の決定）。
export const CROSSBOWS = {
  junkbow: { name: 'Junkbow', bleed: 0.5 },
  toothPick: { name: 'Tooth Pick', bleed: 0.5 },
  ranger: { name: 'Ranger', bleed: 0.6 },
  springBat: { name: 'Spring Bat', bleed: 1.0 },
  oldworldMk1: { name: 'Oldworld Bow MkI', bleed: 1.0 },
  oldworldMk2: { name: 'Oldworld Bow MkII', bleed: 1.0 },
  eaglesCross: { name: "Eagle's Cross", bleed: 1.0 },
};
// 今のゲームのクロスボウは Junkbow 相当。
export const CROSSBOW_KIND = 'junkbow';
export const CROSSBOW_BLEED = CROSSBOWS[CROSSBOW_KIND].bleed;

// 出血の基本係数 (ダメージ1あたり)。倍率1.0の武器で従来と同じ量になる。
export const BLEED_PER_DAMAGE = 0.03;

export function weaponBleed(weaponKey) {
  const w = WEAPONS[weaponKey];
  return w && typeof w.bleed === 'number' ? w.bleed : 1;
}

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

// 獣の決まり（倒れた者を襲う・半分で逃げる・速い・体が大きい）で動くか。
// 古代の暴走ロボット（swordsman）は獣の側（誰にでも敵）でも、人の剣士の決まりで戦う。
export function beastRules(actor) {
  return !!actor && actor.faction === 'beast' && !actor.swordsman;
}

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
export const COMPANION_NAMES = ['アサ', 'ミナ', 'ソラ', 'ハナ', 'ユキ', 'ナギサ'];

// 20:42 女性の人形（見た目の違いだけ。能力は同じ）。名前の数は男と同じ10個（乱数の消費が変わらないように）。
export const GUARD_NAMES_F = [
  'アヤ', 'カエ', 'サキ', 'チヨ', 'トモ', 'ナツ', 'フミ', 'ミオ', 'リン', 'ヨシ',
];
export const BANDIT_NAMES_F = [
  'オリ', 'カガリ', 'キリ', 'サビ', 'スズ', 'ツタ', 'ヌイ', 'ホタル', 'マツリ', 'ヤエ',
];
export const FEMALE_SHARE = 0.35; // ★仮: 衛兵・盗賊の女性の割合（Kenshi の数字ではない）

// 人物ごとの性別。乱数の流れは使わず id から決める（同じ id なら必ず同じ）。
// 主人公は男のまま、仲間（名前はみな女性名）は女性。獣は性別なし。
function sexHash(id) {
  let h = (Number(id) | 0) ^ 0x2f6b;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
export function sexFor(faction, id, opts) {
  const o = opts || {};
  if (faction === 'beast') return null;
  if (o.isPlayer) return 'm';
  if (o.companion) return 'f';
  if (o.female === false) return 'm';
  if (faction !== 'guard' && faction !== 'bandit') return 'm';
  return (sexHash(id) % 1000) / 1000 < FEMALE_SHARE ? 'f' : 'm';
}
// 古いセーブなど sex が無い人の扱い（id から決め直す）。
export function sexOf(actor, state) {
  if (!actor) return null;
  if (actor.sex === 'f' || actor.sex === 'm') return actor.sex;
  if (actor.faction === 'beast') return null;
  const companion = !!state && Array.isArray(state.squadIds) && !actor.isPlayer && state.squadIds.includes(actor.id);
  return sexFor(actor.faction, actor.id, {
    isPlayer: !!actor.isPlayer,
    companion,
    female: state && state.femaleNpc === false ? false : true,
  });
}

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
