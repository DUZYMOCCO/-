import greetings from '../data/shop_greetings.js';
import reactions from '../data/base_reactions.js';
import townFlavor from '../data/town_flavor.js';
import barks from '../data/barks.js';
import bounties from '../data/bounties.js';
import { raceOf } from './races.js';

export { bounties as BOUNTIES };

function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function pick(list, key) { return list.length ? list[hash(key) % list.length] : null; }
function townEntry(townId) { return townFlavor.find((town) => town.town === townId) || null; }
function player(state) { return state?.actors?.find((actor) => actor.id === state.playerId) || state?.actors?.find((actor) => actor.faction === 'player') || null; }
function actorRaceKey(actor) { const base = raceOf(actor)?.base || actor?.race || ''; return String(base).startsWith('race_') ? String(base) : `race_${base}`; }

export function itemText(id) {
  const item = (awaitlessItems)[id];
  return item ? { name: item.name, desc: item.desc || '', flavor: item.flavor || '' } : null;
}

// ITEMS を循環 import しないよう、UI から実際の定義を渡せるシンプルな参照口。
let awaitlessItems = Object.create(null);
export function registerTextItems(items) { awaitlessItems = items || Object.create(null); }

export function shopGreeting(townId, faction = null) {
  const townMatches = greetings.filter((row) => row.town && row.town === townId);
  const pool = townMatches.length ? townMatches : greetings.filter((row) => !row.town && row.faction && row.faction === faction);
  return pick(pool, `shop:${townId}:${faction}`)?.text || '';
}

function showText(state, actor, text, kind = 'ambient') {
  if (!state || !actor || !text) return false;
  const tick = Number(state.tick) || 0;
  const bubbles = state.textBubbles = (state.textBubbles || []).filter((bubble) => bubble.expiresTick > tick);
  if (bubbles.length >= 3) return false;
  const id = `text:${actor.id}:${tick}:${bubbles.length}`;
  bubbles.push({ id, speakerId: String(actor.id), kind, text, expiresTick: tick + 45 });
  return true;
}

export function emitBark(state, actor, trigger) {
  if (!state || !actor || !['attack','pain','ko','parried','parry_ok','reflect_dodge','reflect_hit'].includes(trigger)) return null;
  if (trigger === 'ko' && actor.lastLine?.tick === state.tick) return null;
  const p = player(state);
  if (p && Math.hypot(actor.x - p.x, actor.z - p.z) > 40) return null;
  const tick = Number(state.tick) || 0;
  if (tick - (actor.lastBarkTick ?? -1e9) < 120 || tick - (state.lastBarkTick ?? -1e9) < 30) return null;
  const race = actorRaceKey(actor);
  const pool = barks.filter((line) => line.trigger === trigger && line.race === race);
  const fallback = pool.length ? pool : barks.filter((line) => line.trigger === trigger);
  const line = pick(fallback, `bark:${actor.id}:${trigger}:${Math.floor(tick / 50)}`);
  if (!line || !showText(state, actor, line.text)) return null;
  actor.lastBarkTick = tick;
  state.lastBarkTick = tick;
  return line.text;
}

export function emitBaseReaction(state, event, near = null) {
  const type = typeof event === 'string' ? event : event?.event;
  if (!['haul_done','harvest','house_bought','base_renamed','raid_warning'].includes(type)) return null;
  const tick = Number(state?.tick) || 0;
  state.baseReactionTicks ||= {};
  if (tick - (state.baseReactionTicks[type] ?? -1e9) < 36000 || tick - (state.baseReactionTicks.all ?? -1e9) < 100) return null;
  const anchor = near || (typeof event === 'object' && event?.outpostId ? state.outposts?.items?.find((o) => o.id === event.outpostId) : null) || player(state);
  if (!anchor) return null;
  const companions = (state.actors || []).filter((a) => a.faction === 'player' && a.state !== 'dead' && Math.hypot(a.x - anchor.x, a.z - anchor.z) <= 40).sort((a,b) => Math.hypot(a.x-anchor.x,a.z-anchor.z)-Math.hypot(b.x-anchor.x,b.z-anchor.z));
  const actor = companions.find((a) => a.id !== state.playerId) || companions[0];
  if (!actor) return null;
  const ownRace = actorRaceKey(actor);
  const pool = reactions.filter((row) => row.event === type && row.race === ownRace);
  const line = pick(pool.length ? pool : reactions.filter((row) => row.event === type), `base:${type}:${actor.id}:${Math.floor(tick/3600)}`);
  if (!line || !showText(state, actor, line.text)) return null;
  state.baseReactionTicks[type] = tick; state.baseReactionTicks.all = tick;
  return line.text;
}

export function townRumour(state, townId, actor = null) {
  const town = townEntry(townId);
  if (!town?.rumours?.length) return '';
  state.rumourTalkCounts ||= {};
  const count = state.rumourTalkCounts[townId] || 0;
  state.rumourTalkCounts[townId] = count + 1;
  if ((count + 1) % 3 !== 0) return '';
  const rumour = pick(town.rumours, `rumour:${townId}:${count}`);
  const speaker = actor || player(state);
  if (speaker) showText(state, speaker, rumour.text);
  return rumour.text;
}

export function townNotices(townId) { return townEntry(townId)?.notices || []; }
export function getBounties() { return bounties; }
export function pushNarrativeBubbles(state, active = []) {
  const tick = Number(state?.tick) || 0;
  const live = (state?.textBubbles || []).filter((bubble) => bubble.expiresTick > tick);
  return [...active, ...live].slice(-3);
}
