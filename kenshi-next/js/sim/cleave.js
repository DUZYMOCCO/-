import { WEAPONS, isHostile, canHarmDowned, downedHarmKind } from './data.js';
import { actorRadius } from './collide.js';
import { weaponOf } from './melee.js';

export const CLEAVE = Object.freeze({
  halfAngle: 50 * Math.PI / 180,
  bluntHalfAngle: 60 * Math.PI / 180,
  damageMult: 0.6,
  bluntDamageMult: 0.7,
  bluntPush: 0.6,
  maxExtra: 4,
});

export function isBluntCleaveWeapon(actor) {
  const weapon = weaponOf(actor);
  return (weapon?.blunt || 0) >= 0.8 || weapon?.family === 'hammer' || weapon?.family === 'club';
}

export function cleaveCandidates(state, attacker, primary, range, martialMove = null, sword = null) {
  if (!attacker || !primary || martialMove || attacker.weapon === 'fists' || attacker.weapon === 'bite') return [];
  if (!WEAPONS[attacker.weapon]) return [];
  const weapon = weaponOf(attacker);
  if (!weapon || String(attacker.weapon || '').toLowerCase().includes('crossbow')) return [];
  if (sword?.move?.family === 'crossbow' || sword?.move?.family === 'throw') return [];

  const dx = primary.x - attacker.x;
  const dz = primary.z - attacker.z;
  const centerDistance = Math.hypot(dx, dz);
  if (centerDistance < 1e-5) return [];
  const halfAngle = isBluntCleaveWeapon(attacker) ? CLEAVE.bluntHalfAngle : CLEAVE.halfAngle;
  const reach = Math.max(0, Number(range) || 0) * 1.25;
  const out = [];
  for (const target of state.actors || []) {
    if (target.id === attacker.id || target.id === primary.id) continue;
    if (target.state === 'dead' || target.carriedBy != null || target.martialPair ||
        (target.trapDisableUntil || 0) > state.tick) continue;
    if ((target.state === 'down' || target.state === 'getup') && !canHarmDowned(downedHarmKind(attacker, target))) continue;
    if ((attacker.pitDepth || 0) !== (target.pitDepth || 0)) continue;
    if (!state.cleaveFriendlyFire && !isHostile(state, attacker, target)) continue;
    const tx = target.x - attacker.x;
    const tz = target.z - attacker.z;
    const d = Math.hypot(tx, tz);
    if (d > reach + actorRadius(target)) continue;
    // 打つ者と重なる相手は向きが定まらないので巻き込む（間合いの内側）
    const dot = d < 1e-5 ? 1 : (dx * tx + dz * tz) / (centerDistance * d);
    if (dot < Math.cos(halfAngle)) continue;
    out.push({ target, distance: d });
  }
  out.sort((a, b) => a.distance - b.distance || String(a.target.id).localeCompare(String(b.target.id)));
  return out.slice(0, CLEAVE.maxExtra).map((entry) => entry.target);
}
