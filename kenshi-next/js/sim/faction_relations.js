import { WORLD_LAYOUT } from '../data/world_layout.js';

export const FACTION_ALLIES = { lantern_council: ['chainbreakers'], chainbreakers: ['lantern_council'] };
export function canonicalFaction(id) { return WORLD_LAYOUT.factionAlias[id] || id; }
export function ownerNear(x, z) {
  let best = null, distance = Infinity;
  for (const town of WORLD_LAYOUT.towns) {
    const d = Math.hypot((x || 0) - town.x, (z || 0) - town.z);
    if (d < distance) { best = town; distance = d; }
  }
  return canonicalFaction(best?.owner || 'lantern_council');
}
export function actorOwner(actor) {
  return canonicalFaction(actor?.ownerFaction || actor?.settlementOwner || ownerNear(actor?.x, actor?.z));
}
export function factionName(id) { return WORLD_LAYOUT.factions[id]?.name || id; }
export function provokeFaction(state, id) {
  state.factionHostile ||= {};
  for (const f of [id, ...(FACTION_ALLIES[id] || [])]) state.factionHostile[f] = true;
}
