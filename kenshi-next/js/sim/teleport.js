import { heightAt } from './terrain.js';
import { clampToWorld } from './world_bounds.js';

// Move the player's squad, selected allies and their followers as a group.
export function teleportSquad(state, x, z, selectedIds = []) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Array.isArray(state?.actors)) return null;
  const byId = new Map(state.actors.map(actor => [actor.id, actor]));
  const player = byId.get(state.playerId);
  if (!player) return null;
  const destination = clampToWorld(x, z);
  const origin = { x: player.x, z: player.z };
  const allAllies = new Set([state.playerId, ...(state.squadIds || [])]);
  for (const squad of state.playerSquads || []) for (const id of squad.memberIds || []) allAllies.add(id);
  const playerSquad = (state.playerSquads || []).find(s => (s.memberIds || []).includes(player.id));
  const ids = new Set([player.id, ...(playerSquad ? playerSquad.memberIds : (state.squadIds || []))]);
  for (const id of selectedIds) if (allAllies.has(id)) ids.add(id);
  // Include followers transitively, as well as both ends of any carry relationship.
  let changed = true;
  while (changed) {
    changed = false;
    for (const actor of state.actors) {
      const follows = allAllies.has(actor.id) && (ids.has(actor.followTargetId) || ids.has(actor.guardTargetId));
      const linked = ids.has(actor.id) || ids.has(actor.carriedBy) || ids.has(actor.carryingId);
      if (follows || linked) {
        for (const id of [actor.id, actor.carriedBy, actor.carryingId]) {
          if (id != null && byId.has(id) && !ids.has(id)) { ids.add(id); changed = true; }
        }
      }
    }
  }
  for (const id of ids) {
    const actor = byId.get(id);
    if (!actor) continue;
    let dx = actor.x - origin.x, dz = actor.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 5) { dx *= 5 / distance; dz *= 5 / distance; }
    const pos = clampToWorld(destination.x + dx, destination.z + dz);
    Object.assign(actor, { x: pos.x, z: pos.z, y: heightAt(pos.x, pos.z),
      moveTo: null, targetId: null, carryTargetId: null, task: null });
    // Keep follow / bodyguard / hold orders so companions keep following after the jump.
    if (actor.holdAt || actor.order === 'hold') actor.holdAt = { ...pos };
    if (actor.state !== 'down' && actor.state !== 'dead' && actor.state !== 'getup') {
      actor.state = 'idle'; actor.anim = 'Idle';
    }
  }
  // Carried people must remain exactly on their carrier, even after compression.
  for (const id of ids) {
    const actor = byId.get(id), carrier = byId.get(actor?.carriedBy);
    if (carrier && ids.has(carrier.id)) {
      actor.x = carrier.x; actor.z = carrier.z; actor.y = heightAt(actor.x, actor.z);
      if (actor.holdAt) actor.holdAt = { x: actor.x, z: actor.z };
    }
  }
  return destination;
}
