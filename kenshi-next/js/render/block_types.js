// 21:xx 受けの型（research/motion/block_catalog.md）。描画だけで使う（sim の状態・乱数の流れは読むだけで変えない）。
//   A  頭上水平受け（上からの斬り下ろし）
//   B  前方斜め受け（カタログの改良版: 手を鎖骨の前へ、刃を60°、受けた瞬間に外へ流す）
//   B0 これまでの斜めの構え（20:44「これはこれでブロックのバリエーションとして残す」）
//   C  側面縦受け（切先が上、横薙ぎ。重い武器ほど出やすい）。side=-1 は左側（鏡写し）
//   D  体側密着の縦受け（腰の高さに手、刃を体に沿わせる。重い武器）
//   E1 背面受け・肩越し / E2 背面受け・背中沿い（攻撃が背中側 110°より後ろから来た時、振り向かずに）
// 向きは combat_fx.js の dirOf と同じ（fw=前、rt=右（負で左）、up=上）。値はカタログの近似値を撮影で合わせたもの。
import { WEAPONS } from '../sim/data.js';

export const BLOCK_TYPES = ['A', 'B', 'B0', 'C', 'D', 'E1', 'E2'];
export const BACK_ANGLE_DEG = 110;

// 上げる・保つ・下ろす（秒）。カタログ: 上げ 0.08〜0.17、保ち 0.25〜0.45。
// 反撃（受けから 0.4〜0.6秒）は sim の番の取り合い（melee.js の counterMin/Max = 0.5〜1.0秒）に任せる。
export const BLOCK_TIMING = {
  A: { raise: 0.09, hold: 0.25, release: 0.1 },
  B: { raise: 0.14, hold: 0.25, release: 0.12 },
  B0: { raise: 0.12, hold: 0.3, release: 0.15 },
  C: { raise: 0.15, hold: 0.4, release: 0.15 },
  D: { raise: 0.17, hold: 0.35, release: 0.15 },
  E1: { raise: 0.12, hold: 0.3, release: 0.2 },
  E2: { raise: 0.12, hold: 0.3, release: 0.2 },
};

// 骨ごとの向き [fw, rt, up]。twoHand = 左手を柄へ（簡単な2関節の IK）。drop = 腰を落とす（m）。
// yaw = 上体のひねり（ラジアン、正で右へ）。contact = 受けた瞬間の刃の動き（[fw,rt,up] を足す）。
export const BLOCK_POSES = {
  A: {
    spine: [0.1, 0, 1], uar: [0.5, 0.7, 0.25], lar: [0.25, -0.75, 0.6], blade: [0.2, -1.0, 0.1],
    twoHand: true, drop: 0.05, yaw: 0, contact: [0, 0, 0.12],
  },
  B: {
    spine: [-0.12, 0.05, 1], uar: [0.55, 0.3, -0.45], lar: [0.75, -0.3, 0.6], blade: [0.45, -0.5, 0.75],
    twoHand: true, drop: 0.03, yaw: 0, contact: [0.08, -0.12, -0.18],
  },
  B0: {
    spine: [-0.18, 0.05, 1], uar: [0.45, 0.25, -0.75], lar: [0.8, -0.35, 0.55], blade: [0.6, -0.55, 0.6],
    ual: [0.45, -0.3, -0.7], lal: [0.85, 0.45, 0.3], twoHand: false, drop: 0, yaw: 0, contact: [0, 0, 0],
  },
  C: {
    spine: [0, 0.12, 1], uar: [0.2, 0.55, -0.8], lar: [0.6, 0.15, 0.3], blade: [0.15, 0.2, 1],
    twoHand: true, drop: 0.03, yaw: -0.21, contact: [0, 0.12, 0],
  },
  D: {
    spine: [0.15, 0.08, 1], uar: [0.25, 0.35, -0.9], lar: [0.75, 0.1, -0.1], blade: [0.12, 0.1, 1],
    twoHand: true, drop: 0.08, yaw: -0.1, contact: [0.08, 0, 0],
  },
  E1: {
    spine: [0.12, 0, 1], uar: [0.0, 0.8, 0.35], lar: [-0.2, -0.35, 0.9], blade: [-0.75, -0.35, -0.55],
    ual: [0.3, -0.4, -0.85], lal: [0.7, -0.2, -0.3], twoHand: false, drop: 0.03, yaw: 0, contact: [0, 0, 0.1],
  },
  E2: {
    spine: [0.1, 0, 1], uar: [-0.45, 0.35, -0.8], lar: [-0.6, -0.2, -0.15], blade: [-0.15, -0.1, 1],
    ual: [0.3, -0.4, -0.85], lal: [0.7, -0.2, -0.3], twoHand: false, drop: 0.03, yaw: 0.17, contact: [-0.1, 0, 0],
  },
};

// 重い武器用の E1（片手では持ち上がらないので肩に担ぐ形）
export const HEAVY_E1 = { ...BLOCK_POSES.E1, lar: [-0.1, 0.6, 0.5] };

// 整数の簡単なハッシュ（決定的。乱数の流れは使わない）
export function hash3(a, b, c) {
  let h = ((Number(a) | 0) * 73856093) ^ ((Number(b) | 0) * 19349663) ^ ((Number(c) | 0) * 83492791);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

export function weaponClass(weapon) {
  const w = WEAPONS[weapon];
  if (!w || !w.armed) return 'none';
  return w.topBalance >= 0.6 ? 'heavy' : 'light';
}

// 守る側から見た攻める側の向き。rel = 正面からの角度（度, 0..180）、lat = 右なら正・左なら負（-1..1）
export function relativeBearing(defender, attacker) {
  const dx = attacker.x - defender.x;
  const dz = attacker.z - defender.z;
  const len = Math.hypot(dx, dz) || 1;
  const rot = defender.rot || 0;
  const fx = Math.sin(rot);
  const fz = Math.cos(rot);
  // 右 = 前 × 上（three の右手系: (fz, 0, -fx) は左なので符号を合わせる）
  const rx = -fz;
  const rz = fx;
  const f = (dx * fx + dz * fz) / len;
  const r = (dx * rx + dz * rz) / len;
  return { rel: (Math.acos(Math.max(-1, Math.min(1, f))) * 180) / Math.PI, lat: r };
}

// 攻める側の振りの種類（sim の振りに種類は無いので、振りごとのハッシュで決める）
export function swingKindOf(attacker, startTick) {
  const h = hash3(attacker.id, startTick, 0x51f7) % 100;
  const heavy = weaponClass(attacker.weapon) === 'heavy';
  const over = heavy ? 55 : 40;
  if (h < over) return 'over';
  if (h < 88) return 'side';
  return 'thrust';
}

// 強制の指定（?block=A|B|B0|C|D|E|E1|E2）。それ以外は null。
export function parseBlockForce(raw) {
  if (!raw) return null;
  const s = String(raw).toUpperCase();
  if (s === 'E') return 'E';
  return BLOCK_TYPES.includes(s) ? s : null;
}

// 型を選ぶ: { type, side }。side は C/D の鏡写し（1=右、-1=左）。sim の値を読むだけ。
export function chooseBlock(defender, attacker, startTick, force) {
  const h = hash3(defender.id, attacker ? attacker.id : 0, startTick | 0);
  const pick = (h >>> 8) % 100;
  let side = 1;
  let rel = 0;
  if (attacker) {
    const b = relativeBearing(defender, attacker);
    rel = b.rel;
    side = Math.abs(b.lat) > 0.25 ? Math.sign(b.lat) : (h & 1 ? 1 : -1);
  }
  const back = rel > BACK_ANGLE_DEG;
  const cls = weaponClass(defender.weapon);
  let type;
  if (force) {
    type = force === 'E' ? (h & 2 ? 'E1' : 'E2') : force;
  } else if (back) {
    // 背中の左から来た横の攻撃は E2（blk rear left）、それ以外は肩越しの E1 が多め
    type = side < 0 ? (pick < 60 ? 'E2' : 'E1') : pick < 70 ? 'E1' : 'E2';
  } else {
    const kind = attacker ? swingKindOf(attacker, startTick) : 'thrust';
    if (kind === 'over') {
      type = cls === 'heavy' ? (pick < 65 ? 'A' : 'D') : pick < 75 ? 'A' : 'B';
    } else if (kind === 'side') {
      type = cls === 'heavy' ? (pick < 55 ? 'D' : 'C') : pick < 55 ? 'C' : pick < 80 ? 'B0' : 'B';
    } else {
      type = pick < 55 ? 'B' : 'B0';
    }
  }
  return { type, side, back };
}

export function poseFor(type, weapon) {
  if (type === 'E1' && weaponClass(weapon) === 'heavy') return HEAVY_E1;
  return BLOCK_POSES[type] || BLOCK_POSES.B0;
}
