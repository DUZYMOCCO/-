// Visual-only bounded blood effects. Never uses the simulation RNG or mutates actors.
export const BLOOD_DECAL_CAP = 24;
export function addDecal(list, decal, cap = BLOOD_DECAL_CAP) {
  if (list.length >= cap) list.shift();
  list.push(decal);
}
export function bleedRate(actor) {
  return Math.max(0, Number(actor.bleed) || 0) + Math.max(0, Number(actor.gush) || 0) * 6.67;
}
