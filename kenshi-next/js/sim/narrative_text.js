import greetings from '../data/shop_greetings.js';
import extraGreetings from '../data/shop_greetings_extra.js';
import reactions from '../data/base_reactions.js';
import townFlavor from '../data/town_flavor.js';
import barks from '../data/barks.js';
import bounties from '../data/bounties.js';
import { LOOKOUT_LINES } from '../data/lookout_lines.js';
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

const ALL_SHOP_GREETINGS = Object.freeze([...greetings, ...extraGreetings]);
// 店データの種別名と sim/shops.js の SHOP_TYPES を対応させる。
const SHOP_GREETING_TYPES = Object.freeze({
  restaurant: Object.freeze(['food', 'bar']),
  weapon: Object.freeze(['weapons']),
  armor: Object.freeze(['armour']),
  clothes: Object.freeze(['general']),
  ranged: Object.freeze(['weapons']),
  prosthetic: Object.freeze(['prosthetic']),
  general: Object.freeze(['general', 'travel']),
});

function greetingTypes(shopType) {
  if (!shopType) return null;
  return SHOP_GREETING_TYPES[shopType] || [shopType];
}

function greetingPool(townId, faction, shopType) {
  const types = greetingTypes(shopType);
  const matchesType = (row) => !types || types.includes(row.shop);
  const townRows = ALL_SHOP_GREETINGS.filter((row) => row.town && row.town === townId);
  if (townRows.length) {
    const typed = townRows.filter(matchesType);
    return typed.length ? typed : townRows;
  }
  const factionRows = ALL_SHOP_GREETINGS.filter((row) => !row.town && row.faction && row.faction === faction);
  if (factionRows.length) {
    const typed = factionRows.filter(matchesType);
    return typed.length ? typed : factionRows;
  }
  return types ? ALL_SHOP_GREETINGS.filter((row) => !row.town && !row.faction && matchesType(row)) : [];
}

export function shopGreeting(townId, faction = null, shopType = null) {
  const pool = greetingPool(townId, faction, shopType);
  const key = shopType ? `shop:${townId}:${faction}:${shopType}` : `shop:${townId}:${faction}`;
  return pick(pool, key)?.text || '';
}

export function lookoutLine(category, actorId, tick, variant = 0) {
  const pool = LOOKOUT_LINES[category];
  if (!pool?.length) return '';
  return pick(pool, `lookout:${category}:${actorId}:${tick}:${variant}`) || '';
}

export function emitLookoutLine(state, actor, category, options = {}) {
  const pool = LOOKOUT_LINES[category];
  if (!state || !actor || !pool?.length) return null;
  const tick = Number(state.tick) || 0;
  const immediate = category === 'spotted_by_lookout' || category === 'lost_them';
  const cooldown = Math.max(1, Number(options.cooldown) || (immediate ? 30 : 300));
  const stamp = immediate ? `lookoutLine_${category}` : 'lastLookoutLineTick';
  if (tick - (actor[stamp] ?? -1e9) < cooldown) return null;
  if (!immediate && tick - (state.lastLookoutAmbientTick ?? -1e9) < 120) return null;
  const listener = player(state);
  if (!listener) return null;
  const distance = Number.isFinite(options.distance) ? options.distance : 32;
  if (Math.hypot(actor.x - listener.x, actor.z - listener.z) > distance) return null;
  const line = lookoutLine(category, actor.id, Math.floor(tick / cooldown), options.variant || 0);
  if (!line || !showText(state, actor, line, 'lookout')) return null;
  actor[stamp] = tick;
  if (!immediate) state.lastLookoutAmbientTick = tick;
  return line;
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
  if (tick - (actor.lastBarkTick ?? -1e9) < 300 || tick - (state.lastBarkTick ?? -1e9) < 100) return null;
  if (hash(`bark-chance:${actor.id}:${trigger}:${tick}`) % 4 !== 0) return null;
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
  const market = state.town?.houses?.find(h => h.blackmarket);
  const listener = player(state);
  const speaker = actor || listener;
  if (!state.blackmarketDiscovered && townId === 'koba_town' && market && listener && speaker && speaker !== listener &&
      !['dead','down','getup'].includes(listener.state) && Math.hypot(listener.x-speaker.x,listener.z-speaker.z) <= 6) {
    const text = '「町外れの路地に『路地の継ぎ目』という店がある。表には出ない品も扱うそうだ。」';
    if (showText(state, speaker, text)) { state.blackmarketDiscovered = true; return text; }
    return '';
  }
  const rumour = pick(town.rumours, `rumour:${townId}:${count}`);
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
