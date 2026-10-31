import { actorOwner } from './faction_relations.js';
import { talkProfile } from './dialogue_hooks.js';
import { canSee } from './stealth.js';
import { partyBounty } from './law.js';
import { ITEMS } from './items.js';
import { factionChecksSquad, raceBase } from './races.js';

// A single deterministic role table keeps speaker mapping stable across saves.
export const DIALOGUE_ROLE_TAGS = Object.freeze({
  guard: ['guard','leader'], warningGuard: ['warning_guard'], resident: ['beggar','preacher','shopkeeper','seller','well_watcher','bar_talker','drifter'],
  bandit: ['bandit','leader'], hunter: ['hunter'], looter: ['looter'], collector: ['collector'],
});
function hash(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function stableTags(actor, profile) {
  if (Array.isArray(actor.dialogueTags)) return actor.dialogueTags;
  if (profile?.role === 'bandit' || actor.faction === 'bandit' || actor.job === 'bandit_leader' || actor.campId || actor.fortId) return DIALOGUE_ROLE_TAGS.bandit;
  if (profile?.role === 'guard' || actor.faction === 'guard') {
    const key = profile?.speakerKey || `actor:${actor.id}`;
    const doorGuard = /gate|checkpoint|post_guard/i.test(`${actor.job || ''} ${actor.role || ''}`) || hash(key) % 5 === 0;
    return doorGuard ? DIALOGUE_ROLE_TAGS.guard : (hash(key) % 3 === 0 ? DIALOGUE_ROLE_TAGS.warningGuard : ['guard']);
  }
  if (actor.job === 'hunter') return DIALOGUE_ROLE_TAGS.hunter;
  if (actor.job === 'looter') return DIALOGUE_ROLE_TAGS.looter;
  if (actor.job === 'collector') return DIALOGUE_ROLE_TAGS.collector;
  const roles = DIALOGUE_ROLE_TAGS.resident;
  return [roles[hash(profile?.speakerKey || `actor:${actor.id}`) % roles.length]];
}
// Persona tags: dialogue data asks for job-like speaker tags (monk, scout,
// merchant…, often two at once) that the world has no field for. Each faction's
// personas are the distinct tag sets its dialogues use (minus the structural
// guard/bandit/warning_guard and race_ tags); every NPC deterministically wears
// one persona, so every dialogue has someone who can say it.
const STRUCTURAL = new Set(['guard', 'bandit', 'warning_guard']);
export function flavorPools(defs) {
  const pools = {};
  for (const d of defs || []) {
    const set = [...new Set((d.speakerTags || []).filter(t => !STRUCTURAL.has(t) && !t.startsWith('race_')))].sort();
    if (!set.length) continue;
    const list = (pools[d.faction || '*'] ||= []);
    if (!list.some(x => x.join() === set.join())) list.push(set);
  }
  for (const k of Object.keys(pools)) pools[k].sort((x, y) => x.join().localeCompare(y.join()));
  return pools;
}
function flavorTags(state, actor, faction, key, base) {
  const extra = [];
  if (actor.race) extra.push(`race_${raceBase(actor.race).id}`);
  const pools = state.dialogueFlavorPools;
  if (pools && !Array.isArray(actor.dialogueTags)) {
    const pool = pools[faction] || pools['*'];
    if (pool?.length) extra.push(...pool[hash(`${key}|persona`) % pool.length]);
  }
  const out = extra.filter((t, i) => !base.includes(t) && extra.indexOf(t) === i);
  return out.length ? [...base, ...out] : base;
}
export function dialogueTagsFor(actor) { return actor ? stableTags(actor,talkProfile(actor)) : []; }
// Hard exclusions: these actors can never take part in a conversation.
function unavailable(a, player, state) {
  return !a || a.id === player?.id || a.faction === 'beast' || a.faction === 'player' ||
    ['dead','down','getup'].includes(a.state) ||
    (state.squadIds || []).includes(a.id) || a.carryingId != null || a.carriedBy != null;
}
// Busy actors (fighting/waiting on a target) stay in the world so an ongoing
// encounter keeps its bubble, but they never start a new one.
function busy(a) { return a.targetId != null || a.waitTargetId != null; }
/** Only actors this close to the squad are considered (plus active speakers). */
export const DIALOGUE_RADIUS = 60;
function itemTags(item) { const d = ITEMS[item?.id] || {}; const tags = [...(item?.tags || []), ...(d.tags || [])]; if (d.category) tags.push(d.category); if (d.food || d.category === 'food' || ['food','ration','food_ration','dried_meat','travel_ration'].includes(item?.id)) tags.push('food'); if (d.contraband || d.illegal || item?.contraband) tags.push('contraband'); return [...new Set(tags)]; }

export function buildDialogueWorld(state, opts = {}) {
  const player = state?.actors?.find(a => a.id === state.playerId) || state?.actors?.find(a => a.isPlayer);
  if (!state || !player) return { timeSec: state?.timeSec || 0, tick: state?.tick || 0, player: { id: 'player', pos: { x: 0, z: 0 } }, npcs: [] };
  const squad = (state.squadIds || [player.id]).map(id => state.actors.find(a => a.id === id)).filter(Boolean);
  const keep = opts.keepIds instanceof Set ? opts.keepIds : new Set(opts.keepIds || []);
  const radius = opts.radius ?? DIALOGUE_RADIUS;
  const relations = {};
  const relationOf = f => {
    if (!(f in relations)) { const legacyGuardHostile = f === 'lantern_council' && state.relations?.guard_player === 'hostile'; relations[f] = state.factionRelation?.[f] ?? (state.factionHostile?.[f] || legacyGuardHostile ? -100 : 0); }
    return relations[f];
  };
  for (const f of Object.keys(state.factionRelation || {})) relationOf(f);
  for (const f of Object.keys(state.factionHostile || {})) relationOf(f);
  const playerView = { id: player.id, pos: { x: player.x, z: player.z }, squad: squad.map(a => ({ id: a.id, ko: ['down','dead'].includes(a.state), race: raceBase(a.race || 'haimin').id })), races: [...new Set(squad.map(a => raceBase(a.race || 'haimin').id))], money: squad.reduce((n,a)=>n+(a.money||0),0), food: squad.reduce((n,a)=>n+(a.food||0),0), items: squad.flatMap(a => (a.inv || []).map(item => ({ ...item, tags: itemTags(item) }))), sneaking: squad.some(a => a.sneaking), ko: ['down','dead'].includes(player.state), wanted: partyBounty(state), factionRelations: relations };
  // Group leaders (only they initiate): a squad's first living member, as in
  // ai.js leaderOf; for camp/fort groups the first living actor in order.
  // Guard patrol squads keep following their patrol; only posted (squadless)
  // guards run checkpoints, so guards are excluded here.
  const leaders = new Map();
  for (const sq of state.squads || []) {
    const lead = (sq.memberIds || []).map(id => state.actors.find(a => a.id === id)).find(a => a && a.state !== 'dead');
    if (lead) leaders.set(sq.id, lead.id);
  }
  for (const actor of state.actors) {
    const g = actor.squadId || actor.campId || actor.fortId;
    if (g && !leaders.has(g) && actor.state !== 'dead') leaders.set(g, actor.id);
  }
  const npcs = [];
  for (const actor of state.actors) {
    if (unavailable(actor, player, state)) continue;
    const profile = talkProfile(actor);
    const id = profile?.speakerKey || `actor:${actor.id}`;
    if (!keep.has(id) && Math.hypot(actor.x - player.x, actor.z - player.z) > radius) continue;
    // Vision comes from the stealth system: a sneaking squad member that this
    // NPC has not detected yet is invisible to it, so it will not approach.
    let sees = false;
    for (const member of squad) if (canSee(state, actor, member)) { sees = true; break; }
    // Bandits belong to their own band, not to whatever town they stand next to.
    const banditLike = actor.faction === 'bandit' || actor.job === 'bandit_leader' || actor.campId || actor.fortId;
    const faction = actor.ownerFaction ? actorOwner(actor) : banditLike ? 'bandit' : actorOwner(actor); relationOf(faction);
    npcs.push({ id, actorId: actor.id, name: actor.name || actor.id, pos: { x: actor.x, z: actor.z }, home: { x: actor.homeX ?? actor.x, z: actor.homeZ ?? actor.z }, faction, tags: flavorTags(state, actor, faction, id, stableTags(actor, profile)), role: actor.role === 'leader' || actor.squadLeader || (actor.faction !== 'guard' && leaders.get(actor.squadId || actor.campId || actor.fortId) === actor.id) ? 'leader' : 'member', group: actor.squadId || actor.campId || actor.fortId || null, groupLead: leaders.get(actor.squadId || actor.campId || actor.fortId) === actor.id, ko: false, busy: busy(actor), seesPlayer: sees, squadRaceChecked: actor.faction === 'guard' && factionChecksSquad(faction, squad), canSee: () => sees, actor });
  }
  return { timeSec: state.timeSec || 0, tick: state.tick || 0, player: playerView, npcs };
}

// Render-side cache: the UI asks for speaker positions many times per frame.
const uiCache = new WeakMap();
/** Same as buildDialogueWorld but reused for a given state tick (UI only). */
export function dialogueWorldForUi(state, keepIds) {
  const hit = uiCache.get(state);
  if (hit && hit.tick === state.tick && hit.n === state.actors.length) return hit.world;
  const world = buildDialogueWorld(state, { keepIds });
  uiCache.set(state, { tick: state.tick, n: state.actors.length, world });
  return world;
}

export function dialogueActorCanTalk(state, actor) {
  if (!actor || !state) return false;
  const player = state.actors?.find(a => a.id === state.playerId);
  if (!player || unavailable(actor, player, state) || busy(actor)) return false;
  return !!talkProfile(actor) || (!!actor.dialogueTags && actor.dialogueTags.length > 0);
}
