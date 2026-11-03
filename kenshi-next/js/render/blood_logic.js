// Visual-only bounded blood effects. Never uses the simulation RNG or mutates actors.
export const BLOOD_DECAL_CAP = 24;
export function addDecal(list, decal, cap = BLOOD_DECAL_CAP) {
  if (list.length >= cap) list.shift();
  list.push(decal);
}
export function bleedRate(actor) {
  return Math.max(0, Number(actor.bleed) || 0) + Math.max(0, Number(actor.stumpBleed) || 0) + Math.max(0, Number(actor.gush) || 0) * (0.12 / 0.015);
}
export function fluidColor(fluid) { return fluid === 'oil' ? 0x15191d : 0xb20d12; }
export function fluidCss(fluid) { return fluid === 'oil' ? '#15191d' : '#b20d12'; }
export function bloodPoolColor(fluid) { return fluid === 'oil' ? 0x080a0d : 0x460206; }
export function bloodPoolRoughness(fluid) { return fluid === 'oil' ? 0.24 : 0.72; }
