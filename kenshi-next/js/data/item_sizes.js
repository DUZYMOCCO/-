import { ITEMS } from '../sim/items.js';

export const BODY_GRID = Object.freeze({ w: 8, h: 8 });

const ITEM_SIZE_OVERRIDES = Object.freeze({
  bear_trap: { w: 2, h: 2 },
  net_trap: { w: 2, h: 2 },
  shovel: { w: 1, h: 4 },
  small_pack: { w: 3, h: 3 },
  large_pack: { w: 3, h: 3 },
  prosthetic_arm: { w: 2, h: 3 },
  prosthetic_leg: { w: 2, h: 3 },
  iron_prosthetic_arm: { w: 2, h: 3 },
  iron_prosthetic_leg: { w: 2, h: 3 },
});

// アイテムの形を返す。幅が横、h が縦のマス数。
export function itemSize(id) {
  const override = ITEM_SIZE_OVERRIDES[id];
  if (override) return { ...override };
  const def = ITEMS[id];
  if (!def) return { w: 1, h: 1 };
  if (def.slot === 'weapon') {
    const weight = Number(def.weight) || 0;
    if (weight <= 2) return { w: 1, h: 3 };
    if (weight <= 3.5) return { w: 1, h: 4 };
    if (weight <= 5) return { w: 1, h: 5 };
    if (weight <= 8) return { w: 2, h: 5 };
    return { w: 2, h: 6 };
  }
  if (['upperIn', 'upperOut', 'lowerIn', 'lowerOut'].includes(def.slot)) return { w: 2, h: 3 };
  if (def.slot === 'head' || def.slot === 'feet' || def.slot === 'prosthetic') return { w: 2, h: 2 };
  return { w: 1, h: 1 };
}

// 袋の容量はアイテムごとに異なる。持ち物画面のグリッドサイズには旧 slots を使わない。
export function packGridSize(id) {
  if (id === 'small_pack') return { w: 4, h: 4 };
  if (id === 'large_pack') return { w: 5, h: 6 };
  return { w: 0, h: 0 };
}
