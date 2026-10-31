import { paletteIdFor } from '../data/faction_map.js';
import { FACTION_PALETTES } from '../data/faction_palettes.js';

// Deterministic equipment: never consumes simulation RNG.
export function equipFactionArmor(actor) {
  if (!actor?.equip || actor.machine || actor.swordsman || actor.faction === 'player' || actor.faction === 'beast') return false;
  const palette = FACTION_PALETTES[paletteIdFor(actor)];
  if (!palette || !['major', 'religious', 'trader'].includes(palette.c)) return false;
  const sets = [
    { head: 'bucket_helm', upperOut: 'box_plate', lowerOut: 'heavy_greaves', feet: 'heavy_boots' },
    { head: 'iron_helmet', upperOut: 'plate_body', lowerOut: 'plate_legs', feet: 'heavy_boots' },
  ];
  const variant = Math.abs(actor.id | 0) % 3;
  for (const [slot, id] of Object.entries(sets[Math.abs(actor.id | 0) % sets.length]))
    actor.equip[slot] = { id, rank: 5, n: 1, variant };
  return true;
}
