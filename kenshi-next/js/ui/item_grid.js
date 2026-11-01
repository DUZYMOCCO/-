import { ITEMS } from '../sim/items.js';
import { itemArt } from '../data/item_art.js';
import { itemSize } from '../data/item_sizes.js';

export function appendItemArt(node, item, extra = '') {
  const art = itemArt(item?.id);
  const shape = `shape-${ITEMS[item?.id]?.slot || 'item'}`;
  if (art.src) {
    const image = document.createElement('img');
    image.className = `inventory-item-icon inventory-item-art ${shape} ${art.className} ${extra}`.trim();
    image.src = art.src;
    image.alt = '';
    image.draggable = false;
    node.append(image);
  } else {
    const icon = document.createElement('span');
    icon.className = `inventory-item-icon ${shape} ${art.className} ${extra}`.trim();
    node.append(icon);
  }
}

export function itemKindClass(item) {
  const def = ITEMS[item?.id], slot = def?.slot;
  if (slot === 'weapon') return 'item-kind-weapon';
  if (slot === 'backpack') return 'item-kind-pack';
  if (['head', 'upperIn', 'upperOut', 'lowerIn', 'lowerOut', 'feet'].includes(slot)) return 'item-kind-armor';
  if (slot === 'ammo' || def?.stackable) return 'item-kind-supply';
  return 'item-kind-tool';
}

export function placeGridItems(entries, dims) {
  const placed = [];
  for (const entry of entries) {
    const item = entry.item || entry;
    const size = itemSize(item?.id);
    let x = entry.grid?.x ?? item?.grid?.x;
    let y = entry.grid?.y ?? item?.grid?.y;
    const fits = (col, row) => Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0
      && col + size.w <= dims.w && row + size.h <= dims.h
      && placed.every((at) => col + size.w <= at.x || at.x + at.size.w <= col || row + size.h <= at.y || at.y + at.size.h <= row);
    if (!fits(x, y)) {
      x = y = null;
      for (let row = 0; row <= dims.h - size.h && x == null; row += 1) for (let col = 0; col <= dims.w - size.w; col += 1) {
        if (fits(col, row)) { x = col; y = row; break; }
      }
    }
    if (x != null && y != null) placed.push({ entry, x, y, size });
  }
  return placed;
}
