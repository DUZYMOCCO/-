// よろけ（被弾リアクション）6種（research/hit_reactions.md）。描画ライブラリを読まない純粋な関数だけ。
// 軽: 前・後ろ（0.3秒）。重: 前・前の腹・後ろの上・後ろの下（1.0–1.2秒）。
// 重いかどうか: 減った後のダメージ > max(23, 打たれ強さ × 0.52)（Kenshi wiki の式＋この世界の下限）。獣・機械獣はよろけない。

export const HEAVY_PER_TOUGH = 0.52;
export const REAR_DEG = 110; // 正面から 110° を超えたら後ろからの当たり（type E の受けと同じ見方）

// ticks: 長さ（0.1秒単位）。push: 押される距離 m（+ は打った者から離れる向き、- は前へつんのめる）
export const HIT_REACTS = {
  light_front: { heavy: false, ticks: 3, push: 0.1 },
  light_rear: { heavy: false, ticks: 3, push: 0.1 },
  heavy_front: { heavy: true, ticks: 10, push: 0.5 },
  heavy_front_stomach: { heavy: true, ticks: 12, push: 0.2 },
  heavy_rear_high: { heavy: true, ticks: 10, push: 0.4 },
  heavy_rear_low: { heavy: true, ticks: 11, push: 0.15 },
};

export function immuneToStagger(actor) {
  return !!actor && actor.faction === 'beast' && !actor.swordsman;
}

// ★この世界の独自の下駄: Kenshi 本体は「重い = 1撃のダメージ（防具と打たれ強さで減った後）> 打たれ強さ×0.52」で、
// 打たれ強さ1 ではどんな当たりでも重いよろけになる（Kenshi でも序盤は重いよろけばかり。目立たないのは
// よろけ中の当たりは軽いよろけにしかならない・防具で減る・打たれ強さがすぐ上がる・すぐ倒れるため）。
// この世界は防具が無く打たれ強さの伸びも遅いので、閾値に下限 HEAVY_FLOOR を設ける。
// 打たれ強さ 45 以上（0.52×T ≥ 23）は Kenshi と同じ。打たれ強さ1・野盗の鉈で約2割が重い。
export const HEAVY_FLOOR = 23;

export function heavyThreshold(toughness) {
  return Math.max(HEAVY_FLOOR, (toughness || 0) * HEAVY_PER_TOUGH);
}

export function isHeavyHit(dmg, toughness) {
  return dmg > heavyThreshold(toughness);
}

// 打った者が、打たれた者の向きから何度ずれているか（0＝真正面、180＝真後ろ）
export function hitAngle(target, attacker) {
  const dx = attacker.x - target.x;
  const dz = attacker.z - target.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) return 0;
  const c = (Math.sin(target.rot || 0) * dx + Math.cos(target.rot || 0) * dz) / d;
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

export function isRearHit(target, attacker) {
  return hitAngle(target, attacker) > REAR_DEG;
}

// 乱数の流れを変えないための小さな混ぜ合わせ（同じ当たりなら同じ結果）
export function mixHash(a, b, c) {
  let h = 2166136261 >>> 0;
  for (const v of [a | 0, b | 0, c | 0]) {
    h ^= v & 0xffff;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= v >>> 16;
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

// どのよろけか。当てはまる候補が複数あれば hash(打った者, 打たれた者, tick) で選ぶ
export function pickHitReact(heavy, rear, partKey, hash) {
  if (!heavy) return rear ? 'light_rear' : 'light_front';
  let list;
  if (rear) {
    list = partKey === 'head' || partKey === 'lArm' || partKey === 'rArm' ? ['heavy_rear_high'] : ['heavy_rear_low'];
  } else {
    list = partKey === 'stomach' ? ['heavy_front', 'heavy_front_stomach'] : ['heavy_front'];
  }
  return list[(hash >>> 0) % list.length];
}

// 避け（重いよろけの最中だけ）。避けの腕前は身のこなし（dexterity）を使う ★仮
export function dodgeChanceOf(actor) {
  const dex = actor ? raceDexterity(actor) : 0;
  return Math.min(0.45, 0.05 + dex * 0.004);
}

// 描画用の姿勢（人形の root を傾け・縮める）。lean: + 前のめり／- のけぞり（rad）。squash: 縦の縮み（膝が折れる）
export const HIT_POSES = {
  light_front: { lean: -0.16, squash: 1 },
  light_rear: { lean: 0.16, squash: 1 },
  heavy_front: { lean: -0.42, squash: 0.96 },
  heavy_front_stomach: { lean: 0.7, squash: 0.86 },
  heavy_rear_high: { lean: 0.45, squash: 0.95 },
  heavy_rear_low: { lean: 0.22, squash: 0.74 },
};

function envelope(r, tick) {
  if (!r || !HIT_POSES[r.kind] || !(tick < r.until)) return 0;
  const len = Math.max(1, r.until - r.tick);
  const p = Math.max(0, Math.min(1, (tick - r.tick) / len));
  return p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8; // すぐ傾いて、ゆっくり戻る
}

// tick は小数でもよい（描画のフレーム間）
export function hitPose(actor, tick) {
  const out = { lean: 0, squash: 1 };
  if (!actor || actor.state === 'dead' || actor.state === 'down') return out;
  const e = envelope(actor.hitReact, tick);
  if (e > 0) {
    const p = HIT_POSES[actor.hitReact.kind];
    out.lean += p.lean * e;
    out.squash -= (1 - p.squash) * e;
  }
  const e2 = envelope(actor.hitReactLight, tick);
  if (e2 > 0) out.lean += HIT_POSES[actor.hitReactLight.kind].lean * 0.6 * e2;
  return out;
}
import { raceDexterity } from './races.js';
