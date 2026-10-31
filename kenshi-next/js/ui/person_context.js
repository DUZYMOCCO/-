// Shared context-menu routing, kept independent of the DOM for simulation tests.
import { choosePatient } from '../sim/triage.js';
export function contextActorHeight(actor) {
  return actor.carriedBy == null && (actor.state === 'down' || actor.state === 'dead') ? 0.25 : 1;
}

export function issuePersonContextAction(state, action, target, actorIds, applyCommand) {
  const targetId = target.actorId ?? target.id;
  const patient = state.actors.find(a => a.id === targetId);
  if (!patient) return;
  const ids = new Set(state.squadIds || [state.playerId]);
  const selected = actorIds.map(id => state.actors.find(a => a.id === id))
    .filter(a => a && ids.has(a.id) && a.faction === 'player' && !['dead', 'down', 'getup'].includes(a.state) && a.carriedBy == null);
  if (action === 'drop') {
    if (ids.has(patient.id) && patient.faction === 'player' && patient.carryingId != null)
      applyCommand(state, { type: 'drop', actorId: patient.id });
  } else if (action === 'treat') {
    // A long press on a squad member triages that member's group.
    const group = (state.playerSquads || []).find(s => s.memberIds?.includes(targetId)) ||
      (state.squads || []).find(s => s.memberIds?.includes(targetId));
    const members = group ? state.actors.filter(a => group.memberIds.includes(a.id) && a.state !== 'dead') : [patient];
    for (const actor of selected) {
      const candidates = members.filter(a => a.id !== actor.id);
      const chosen = choosePatient(state, actor, candidates);
      if (chosen) applyCommand(state, { type: 'treat', targetId: chosen.id, actorId: actor.id });
    }
  } else if (action === 'carry') {
    const eligible = selected.filter(a => a.id !== targetId && a.carryingId == null);
    eligible.sort((a, b) => Math.hypot(a.x - patient.x, a.z - patient.z) - Math.hypot(b.x - patient.x, b.z - patient.z));
    if (eligible.length) applyCommand(state, { type: 'pickup', targetId, actorId: eligible[0].id });
  }
}
