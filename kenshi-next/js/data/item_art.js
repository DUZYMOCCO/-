import { ITEMS } from '../sim/items.js';

const ARMOUR_SLOTS = new Set(['head', 'upperIn', 'upperOut', 'lowerIn', 'lowerOut', 'feet']);
const ITEM_ART_SOURCES = Object.freeze({});

/** Central item icon metadata. Add an asset path here when photographed icons arrive. */
export function itemArt(id) {
  const def = ITEMS[id];
  const slot = def?.slot;
  let kind = 'tool';
  if (slot === 'weapon') kind = 'weapon';
  else if (slot === 'backpack') kind = 'pack';
  else if (slot === 'quiver' || slot === 'acc' || slot === 'ammo' || def?.stackable) kind = 'supply';
  else if (ARMOUR_SLOTS.has(slot)) kind = 'armor';
  const trinket = id?.startsWith('trinket_') ? `item-art-${id.slice(8)}` : '';
  return { kind, className: [`item-art-${kind}`, trinket].filter(Boolean).join(' '), src: ITEM_ART_SOURCES[id] || null };
}
