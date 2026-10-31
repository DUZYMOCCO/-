import { createDialogueSystem } from './dialogue.js';
import { loadDialogues } from './dialogue_data.js';
import { buildDialogueWorld, flavorPools } from './dialogue_world.js';
import { provokeFaction, actorOwner } from './faction_relations.js';
import { ITEMS } from './items.js';
import { addBounty } from './law.js';
import { recruit } from './abduct.js';
import bundledDialogues from '../data/dialogues.js';
import raceDialogues from '../data/race_dialogues.js';
import extraDialogues from '../data/extra_dialogues.js';

const runtimes = new WeakMap();
const processedEvents = new WeakMap();
let definitions;
let definitionWarnings = [];
export function simulationMayAdvance(dialogue) { return !dialogue?.isPaused?.(); }
function defs() { if (!definitions) { const loaded = loadDialogues(bundledDialogues, raceDialogues, extraDialogues); definitions = loaded.dialogues; definitionWarnings = loaded.warnings; } return definitions; }
function playerActor(state) { return state.actors.find(a => a.id === state.playerId) || state.actors.find(a => a.faction === 'player'); }
function actorsFor(state, actor) { const squad = new Set(state.squadIds || [state.playerId]); return state.actors.filter(a => a.id === actor.id || (a.squadId && a.squadId === actor.squadId) || squad.has(a.id)); }
function itemTags(item) { const d = ITEMS[item?.id] || {}; const tags = [...(item?.tags || []), ...(d.tags || [])]; if (d.category) tags.push(d.category); if (d.food || d.category === 'food' || ['food','ration','food_ration','dried_meat','travel_ration'].includes(item?.id)) tags.push('food'); if (d.contraband || d.illegal || item?.contraband) tags.push('contraband'); return tags; }
function applyEffect(state, effect, rt, world, events) {
  const speaker = (world || buildDialogueWorld(state, { keepIds: rt.activeIds() })).npcs.find(n => n.id === effect.speakerId)?.actor;
  const player = playerActor(state); const party = actorsFor(state, player);
  if (effect.do === 'attack' || effect.do === 'attack_forever') {
    if (speaker) for (const a of actorsFor(state, speaker)) { if (a.state !== 'dead' && a.state !== 'down') { a.targetId = player.id; a.state = 'fight'; a.dialogueAttackForever = effect.do === 'attack_forever'; } }
    // Same rule as attacking someone by hand (commands.js): only a guard drags
    // its town's faction in. A bandit near a town must not make the town hostile.
    const owner = speaker && (speaker.ownerFaction || (speaker.faction === 'guard' ? actorOwner(speaker) : null));
    if (owner) provokeFaction(state, owner);
  } else if (effect.do === 'relation') {
    const faction = effect.faction === 'me' ? (speaker && (speaker.ownerFaction || (speaker.faction === 'guard' ? actorOwner(speaker) : speaker.faction))) : effect.faction;
    if (faction) { state.factionRelation ||= {}; state.factionRelation[faction] = Math.max(-100, Math.min(100, (state.factionRelation[faction] || 0) + (effect.delta || 0))); if (state.factionRelation[faction] <= -50) provokeFaction(state, faction); }
  } else if (effect.do === 'give_money' || effect.do === 'take_money') {
    const amount = Math.max(0, Math.floor(effect.amount || 0)); const total = party.reduce((n,a)=>n+(a.money||0),0);
    if (effect.do === 'give_money') player.money = (player.money || 0) + amount;
    else { let left = Math.min(total, amount); for (const a of party) { const take = Math.min(a.money || 0, left); a.money = (a.money || 0) - take; left -= take; } }
  } else if (effect.do === 'give_item' || effect.do === 'take_item') {
    const matches = item => item.id === effect.id || itemTags(item).includes(effect.tag);
    if (effect.do === 'take_item') { let n = Math.max(1, effect.count || 1); for (const a of party) for (const item of [...(a.inv || [])]) if (n && matches(item)) { const take = Math.min(n, item.n || 1); item.n = (item.n || 1) - take; n -= take; if (item.n <= 0) a.inv.splice(a.inv.indexOf(item), 1); } }
    else { (player.inv ||= []).push({ id: effect.id || effect.tag, rank: 1, n: Math.max(1, effect.count || 1) }); }
  } else if (effect.do === 'join_squad' && speaker) { speaker.dialogueIntent = null; recruit(state, speaker, events || []); }
  // Follow: walk after the player for a while. Must not use targetId (that is the combat target).
  else if (effect.do === 'follow' && speaker) { speaker.dialogueFollowUntil = (state.timeSec || 0) + Math.max(1, effect.seconds || 30); }
  else if (effect.do === 'leave' && speaker) { speaker.targetId = null; speaker.moveTo = { x: speaker.homeX ?? speaker.x, z: speaker.homeZ ?? speaker.z }; }
  else if (effect.do === 'wanted') { const amount = Math.max(0, Math.floor((effect.delta || 0) * 100)); if (amount) addBounty(state, player, 'guard', amount, 'dialogue', null); }
  else if (effect.do === 'set_flag') { /* runtime owns flags */ }
  return { ...effect, applied: true, speakerResolved: !!speaker };
}
function ensure(state) {
  let rt = runtimes.get(state);
  if (rt) return rt;
  return initializeDialogueRuntime(state);
}
export function initializeDialogueRuntime(state, definitionsOverride) {
  let rt = runtimes.get(state);
  if (rt) return rt;
  const seed = Number(state.seed) || 1;
  const normalized = definitionsOverride === undefined ? defs() : loadDialogues(definitionsOverride).dialogues;
  rt = createDialogueSystem({ seed: seed ^ 0x444c4744, defs: normalized });
  if (state.dialogueRt) { try { rt.restore(state.dialogueRt); } catch {} }
  Object.defineProperty(state, 'dialogueFlavorPools', { value: flavorPools(normalized), writable: true, configurable: true, enumerable: false });
  Object.defineProperty(state, 'dialogueRuntime', { value: rt, writable: true, configurable: true, enumerable: false });
  runtimes.set(state, rt); return rt;
}
export function getDialogueRuntime(state) { return state ? ensure(state) : null; }
function collectImmediate(state, rt) {
  const events = (rt.events || []).slice(processedEvents.get(rt) || 0);
  for (const event of events) {
    if (event.type === 'effect') { const result = applyEffect(state, event, rt, null, null); (state.dialogueLastEffects ||= []).push(result); if (state.dialogueLastEffects.length > 30) state.dialogueLastEffects.shift(); }
    if (event.type === 'history') { state.log ||= []; state.log.push({ tick: state.tick, type: 'dialogue', text: event.text }); }
  }
  if (state.log?.length > 300) state.log.splice(0,state.log.length-300);
  processedEvents.set(rt,(rt.events || []).length);
}
/** Debug/demo: start a definition on an NPC and record its first line like a normal tick would. */
export function dialogueDebugStart(state, definitionId, npcId, world) {
  const rt = ensure(state); const bubble = rt.debugStart(definitionId, npcId, world || buildDialogueWorld(state, { keepIds: rt.activeIds() }));
  collectImmediate(state, rt); state.dialogueRt = rt.serialize(); return bubble;
}
export function dialogueCommand(state, cmd) {
  const rt = ensure(state);
  let result;
  if (cmd.type === 'dialogueChoose') result = rt.choose(cmd.optionId);
  else if (cmd.type === 'dialogueOpen') result = rt.openChoice(cmd.bubbleId);
  else if (cmd.type === 'dialogueCancel') result = rt.cancelChoice();
  else if (cmd.type === 'dialogueTrade') result = rt.finishChoice();
  else return false;
  collectImmediate(state, rt); state.dialogueRt = rt.serialize();
  return result;
}
export function updateDialogue(state, events = []) {
  const rt = ensure(state); const world = buildDialogueWorld(state, { keepIds: rt.activeIds() });
  const emitted = rt.tick(0.1, world);
  for (const event of emitted) {
    if (event.type === 'effect') { const result = applyEffect(state, event, rt, world, events); (state.dialogueLastEffects ||= []).push(result); if (state.dialogueLastEffects.length > 30) state.dialogueLastEffects.shift(); }
    if (event.type === 'history') { state.log ||= []; state.log.push({ tick: state.tick, type: 'dialogue', text: event.text }); }
    if (event.type === 'pursuit_giveup' || event.type === 'escaped') { const npc = world.npcs.find(n => n.id === event.speakerId)?.actor; if (npc) npc.dialoguePursuitLost = true; }
  }
  processedEvents.set(rt,emitted.length);
  if (state.log?.length > 300) state.log.splice(0,state.log.length-300);
  for (const npc of world.npcs) {
    const actor = npc.actor; const intent = rt.npcIntent(npc.id);
    if (!actor || actor.targetId != null || actor.task || actor.resting || state.squadIds?.includes(actor.id)) continue;
    let next = intent.mode === 'idle' ? null : { mode: intent.mode, target: intent.target, speed: intent.speed };
    // A finished "return" is forgotten so the NPC resumes its own routine
    // instead of being leashed to its home spot forever.
    if (next?.mode === 'return' && (!next.target || Math.hypot(next.target.x - actor.x, next.target.z - actor.z) <= 1.2)) { rt.clearIntent(npc.id); next = null; }
    if (!next && actor.dialogueFollowUntil != null) {
      if ((state.timeSec || 0) < actor.dialogueFollowUntil) { const p = world.player.pos; const d = Math.hypot(p.x - actor.x, p.z - actor.z); next = d > 2.5 ? { mode: 'follow', target: { x: p.x, z: p.z }, speed: 2.5 } : null; }
      else actor.dialogueFollowUntil = null;
    }
    actor.dialogueIntent = next;
  }
  state.dialogueRt = rt.serialize();
  return emitted;
}
export function dialogueDebugState(state) { const rt = ensure(state); return { active: rt.bubbles(), paused: rt.isPaused(), lastEffects: [...(state.dialogueLastEffects || [])], warnings: [...definitionWarnings] }; }
