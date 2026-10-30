import { ITEMS, qualityOf } from './items.js';
import { mixHash } from './hitreact.js';

const slots = {
  head: ['head'], chest: ['upperOut', 'upperIn'], stomach: ['upperOut', 'upperIn'],
  lArm: ['upperOut', 'upperIn'], rArm: ['upperOut', 'upperIn'],
  lLeg: ['lowerOut', 'lowerIn', 'feet'], rLeg: ['lowerOut', 'lowerIn', 'feet'],
};

// 命中部位を覆う防具を外側から計算し、通過後の傷と出血係数を返す。
export function armorDamage(victim, attacker, tick, part, raw, weapon, forceHit = false) {
  const share = weapon.cutShare || 0;
  let c = raw * share;
  let b = raw * (1 - share);
  const layers = [];
  const pieces = [];
  const group = part.endsWith('Arm') ? 'arms' : part.endsWith('Leg') ? 'legs' : part;
  for (const [i, slot] of (slots[part] || []).entries()) {
    const obj = victim.equip?.[slot];
    const d = ITEMS[obj?.id];
    if (!d) continue;
    const cover = d.cover?.[group] || 0;
    const hit = forceHit || mixHash(victim.id || 0, attacker?.id || 0, (tick | 0) ^ Math.imul(i + 1, 0x9e3779b1)) / 4294967296 < cover;
    if (!hit || !cover) continue;
    pieces.push({ d, obj });
    layers.push({ slot, id: obj.id, metal: !!d.metal });
  }
  // 変換が内側の切り耐性を迂回し、層の追加でダメージが増えるのを防ぐ。
  // 例: 剣・R5の鉄靴に布ズボンを加えると、補正なしでは39.0→40.5。
  // 命中層の全部分集合から最小値を選ぶことで単調性を保つ。
  let best = Infinity;
  for (let mask = 0; mask < (1 << pieces.length); mask++) {
    let cc = raw * share;
    let bb = raw * (1 - share);
    for (let i = 0; i < pieces.length; i++) {
      if (!(mask & (1 << i))) continue;
      const { d, obj } = pieces[i];
      const q = qualityOf(obj.rank);
      const stopped = cc * Math.min(.9, d.cutRes * q.res);
      cc -= stopped;
      bb += stopped * Math.min(1, (1 - d.deflect) * (1 + .5 * (weapon.topBalance || 0)));
      bb *= 1 - Math.min(.9, d.bluntRes * q.res);
    }
    if (cc + bb < best) {
      best = cc + bb;
      c = cc;
      b = bb;
    }
  }
  const total = c + b;
  return { cut: c, blunt: b, total, layers, bleedFactor: share > 0 ? (total ? c / total / share : 0) : (raw ? total / raw : 1) };
}
