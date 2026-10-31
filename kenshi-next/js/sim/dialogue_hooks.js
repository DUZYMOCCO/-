import { WORLD_LAYOUT } from '../data/world_layout.js';

const places = [...WORLD_LAYOUT.towns, ...WORLD_LAYOUT.banditBases];

export function talkProfile(actor) {
  if (!actor || !actor.talk || actor.isPlayer || actor.faction === 'player' || actor.faction === 'beast' ||
      actor.state === 'dead' || actor.state === 'down' || actor.state === 'fight' ||
      actor.targetId != null || actor.waitTargetId != null || !actor.settlementId ||
      !Number.isInteger(actor.settlementIndex)) return null;
  const place = places.find(p => p.id === actor.settlementId);
  if (!place || !['guard', 'resident'].includes(actor.settlementRole)) return null;
  const role = place.size === 'camp' || place.size === 'fort' ? 'bandit' : actor.settlementRole;
  const topics = role === 'bandit' ? ['threat'] : ['greet', 'place', 'owner'];
  if (role === 'guard') topics.push('rules');
  return { speakerKey: place.id + ':' + actor.settlementIndex, settlementId: place.id,
    owner: place.owner, role, size: place.size, topics };
}

export function canTalk(state, actor, playerActor) {
  if (!talkProfile(actor) || !playerActor || playerActor.state === 'dead' || playerActor.state === 'down') return false;
  if (actor.id === playerActor.id || actor.targetId === playerActor.id || actor.waitTargetId === playerActor.id ||
      playerActor.targetId === actor.id || playerActor.waitTargetId === actor.id) return false;
  return Math.hypot(actor.x - playerActor.x, actor.z - playerActor.z) <= 6;
}

export function openDialogue(state, actorId) {
  const actor = state.actors.find(a => a.id === actorId);
  const player = state.actors.find(a => a.id === state.playerId);
  if (!canTalk(state, actor, player)) return false;
  const profile = talkProfile(actor);
  // future: while state.dialogue is set, simulation time pauses - not implemented yet
  state.dialogue = { speakerKey: profile.speakerKey, actorId, topic: null };
  return true;
}

export function closeDialogue(state) { delete state.dialogue; }

export function lineFor(profile, topic) {
  const place = profile && places.find(p => p.id === profile.settlementId);
  if (!place) return '';
  const owner = place.ownerName || WORLD_LAYOUT.factions[WORLD_LAYOUT.factionAlias[place.owner] || place.owner]?.name || place.owner;
  if (topic === 'owner') return '「ここは' + owner + 'の土地だ。」';
  return '「ここは' + place.name + 'だ。」';
}
export const DIALOGUE_TEXT_SOURCE = { lineFor };
