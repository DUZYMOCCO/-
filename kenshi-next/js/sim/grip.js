import { WEAPONS, makeEvent } from './data.js';
import { ITEMS } from './items.js';
import { prostheticFor } from './prosthetics.js';
import { effectiveStrength } from './needs.js';

export function armUsable(actor, side) {
  const key = side === 'left' || side === 'lArm' ? 'lArm' : 'rArm';
  return !!actor && ((!actor.missing?.includes(key) && (actor.parts?.[key]?.hp ?? 100) > 0) || !!prostheticFor(actor, key));
}
export function gripOf(actor) {
  const n = Number(armUsable(actor, 'left')) + Number(armUsable(actor, 'right'));
  return n === 2 ? 'two' : n === 1 ? 'one' : 'none';
}
export function effectiveStrengthReq(actor, weaponId, base) {
  const req = base ?? weaponStrengthReq(weaponId);
  return req * (gripOf(actor) === 'one' ? 2 : 1);
}
export function strengthSpeedMult(actor, weaponId) {
  if (weaponId === 'fists') return 1;
  // The world roster is concentrated below the design's weapon requirements.
  // Ease the two-arm baseline only; one-arm doubling remains exact.
  const twoHandFactor = gripOf(actor) === 'two' ? 0.5 : 1;
  const short = Math.max(0, effectiveStrengthReq(actor, weaponId) * twoHandFactor - effectiveStrength(actor));
  return 1 - Math.min(0.475, 0.02375 * short);
}
export function weaponStrengthReq(id) {
  if (id === 'fists' || id === 'bite') return 10;
  const w = WEAPONS[id];
  if (!w) return 10;
  if (Number.isFinite(w.strengthReq)) return w.strengthReq;
  const family = w.family;
  if (id === 'sword' || family === 'katana') return 28;
  if (id === 'sabre' || family === 'sabre') return 35;
  if (id === 'machete' || family === 'cleaver' || family === 'axe') return 55;
  if (['hammer','club','frying_pan'].includes(id) || family === 'hammer' || family === 'club') return 50;
  if (family === 'polearm') return 32;
  return 35;
}
export function canUseWeapon(actor, weaponId) {
  const grip = gripOf(actor);
  if (grip === 'none') return false;
  if (ITEMS[weaponId]?.ranged || weaponId === 'crossbow' || weaponId?.includes('crossbow')) return grip === 'two';
  return true;
}
export function fastestMeleeWeapon(actor, weaponIds) {
  return (weaponIds || []).filter(id => !!WEAPONS[id] && !['fists','bite'].includes(id))
    .slice().sort((a,b) => ((1 + .5 * WEAPONS[a].topBalance) / strengthSpeedMult(actor,a)) - ((1 + .5 * WEAPONS[b].topBalance) / strengthSpeedMult(actor,b)) || a.localeCompare(b))[0] || null;
}
export function gripInfo(actor) {
  const grip = gripOf(actor), id = actor?.weapon || 'fists';
  const req = effectiveStrengthReq(actor, id);
  const speed = strengthSpeedMult(actor, id);
  return { grip, usableArms: grip === 'two' ? 2 : grip === 'one' ? 1 : 0, leftUsable: armUsable(actor,'left'), rightUsable: armUsable(actor,'right'), weaponId:id, requiredStrength:req, strength:actor?.skills?.strength || 0, speedMultiplier:speed, penaltyPercent:Math.round((1-speed)*100), hand: grip === 'one' ? (armUsable(actor,'left') ? 'left' : 'right') : 'both' };
}

export function reconcileGrip(state, actor, events) {
  if (!actor) return false;
  actor.equip ||= { weapon: [null, null] };
  actor.equip.weapon ||= [null, null];
  const grip = gripOf(actor);
  const primary = actor.equip.weapon[0];
  const ranged = !!ITEMS[primary?.id]?.ranged || actor.weapon?.includes('crossbow');
  if (grip === 'one') actor.weaponHand = armUsable(actor,'left') ? 'left' : 'right';
  else if (grip === 'two') actor.weaponHand = 'right';
  if (ranged && grip !== 'two') {
    if (primary) {
      if (actor.crossbow) primary.crossbow = actor.crossbow;
      if (grip === 'none') {
        state.groundItems ||= [];
        const dropped = { id:`weapon_${state.tick||0}_${actor.id}`, x:actor.x, z:actor.z, contents:{ [primary.id]:1 } };
        if (primary.variant != null) dropped.weaponVariants = { [primary.id]:primary.variant };
        state.groundItems.push(dropped);
      } else (actor.inv ||= []).push(primary);
      actor.equip.weapon[0] = null;
      actor.crossbow = null;
    }
    actor.weapon = actor.equip.weapon[1]?.id || 'fists';
  } else if (grip === 'none' && actor.weapon !== 'fists' && actor.weapon !== 'bite') {
    const id = actor.weapon;
    state.groundItems ||= [];
    const heldItem = actor.equip.weapon.find(item => item?.id === id);
    const dropped = { id:`weapon_${state.tick||0}_${actor.id}`, x:actor.x, z:actor.z, contents:{ [id]:1 } };
    if (heldItem?.variant != null) dropped.weaponVariants = { [id]:heldItem.variant };
    state.groundItems.push(dropped);
    if (actor.equip.weapon[0]?.id === id) actor.equip.weapon[0] = null;
    else if (actor.equip.weapon[1]?.id === id) actor.equip.weapon[1] = null;
    actor.weapon = 'fists'; actor.crossbow = null;
    if (events) events.push(makeEvent(state, 'limb', `${actor.name}は武器を落とした`));
  }
  return true;
}

export function pickupDroppedWeapon(state, actor, maxDistance = 3) {
  if (!state || !actor || gripOf(actor) === 'none' || actor.targetId != null || actor.state === 'fight') return null;
  const ground = state.groundItems || [];
  for (let i = 0; i < ground.length; i += 1) {
    const item = ground[i];
    if (Math.hypot(item.x - actor.x, item.z - actor.z) > maxDistance) continue;
    const id = Object.keys(item.contents || {}).find(key => WEAPONS[key] && (item.contents[key] || 0) > 0);
    if (!id || !canUseWeapon(actor, id)) continue;
    item.contents[id] -= 1;
    if (item.contents[id] <= 0) delete item.contents[id];
    if (!Object.keys(item.contents).length) ground.splice(i, 1);
    actor.equip ||= { weapon:[null,null] }; actor.equip.weapon ||= [null,null];
    const at = actor.equip.weapon.findIndex(x => !x);
    const obj = { id, rank:3, n:1 };
    if (at >= 0) actor.equip.weapon[at] = obj; else (actor.inv ||= []).push(obj);
    actor.weapon = id;
    return id;
  }
  return null;
}
