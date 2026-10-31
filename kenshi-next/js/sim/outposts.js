import { WORLD_LAYOUT } from '../data/world_layout.js';
import { WORLD_BOUNDS } from './world_bounds.js';
import { emitBaseReaction } from './narrative_text.js';

export const OUTPOST_LIMIT = 5;
export const OUTPOST_RADIUS = 30;
export const OUTPOST_TOWN_GAP = 150;
export const OUTPOST_GAP = 300;
export const OUTPOST_SLEEP_DISTANCE = 600;

export function ensureOutposts(state) {
  if (!state.outposts || typeof state.outposts !== 'object') state.outposts = { nextId: 1, rev: 0, items: [], pieces: [] };
  const o = state.outposts;
  if (!Number.isInteger(o.nextId) || o.nextId < 1) o.nextId = 1;
  if (!Number.isInteger(o.rev)) o.rev = 0;
  if (!Array.isArray(o.items)) o.items = [];
  if (!Array.isArray(o.pieces)) o.pieces = [];
  if (!Array.isArray(state.ownedHouses)) state.ownedHouses = [];
  return o;
}

export function nextBuildId(state, prefix) {
  const o = ensureOutposts(state);
  const id = `${prefix}${o.nextId}`;
  o.nextId += 1;
  return id;
}

export function outpostById(state, id) {
  return ensureOutposts(state).items.find((o) => o.id === id) || null;
}

export function outpostAt(state, x, z) {
  const outposts = ensureOutposts(state).items;
  for (const o of outposts) if (Math.hypot(x - o.x, z - o.z) <= (o.radius || OUTPOST_RADIUS)) return o;
  return null;
}

function withinTownGap(x, z) {
  for (const town of WORLD_LAYOUT.towns) {
    if (Math.hypot(x - town.x, z - town.z) <= town.radius + OUTPOST_TOWN_GAP) return true;
  }
  for (const base of WORLD_LAYOUT.banditBases) {
    if (Math.hypot(x - base.x, z - base.z) <= base.radius + OUTPOST_TOWN_GAP) return true;
  }
  return false;
}

export function canPlantFlag(state, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, color: 'red', reason: '場所を選べない' };
  if (x < WORLD_BOUNDS.minX || x > WORLD_BOUNDS.maxX || z < WORLD_BOUNDS.minZ || z > WORLD_BOUNDS.maxZ) return { ok: false, color: 'red', reason: '地図の外' };
  const o = ensureOutposts(state);
  if (o.items.length >= OUTPOST_LIMIT) return { ok: false, color: 'red', reason: '拠点は5つまで' };
  if (withinTownGap(x, z)) return { ok: false, color: 'blue', reason: '町に近い' };
  if (o.items.some((p) => Math.hypot(x - p.x, z - p.z) <= OUTPOST_GAP)) return { ok: false, color: 'red', reason: 'ほかの拠点に近い' };
  return { ok: true, color: 'green', reason: '' };
}

function consumeFlagKit(actor) {
  if (!actor) return false;
  const inv = Array.isArray(actor.inv) ? actor.inv : [];
  const item = inv.find((x) => x && x.id === 'flag_kit' && (x.n || 1) > 0);
  if (!item) return false;
  item.n = (item.n || 1) - 1;
  if (item.n <= 0) actor.inv.splice(inv.indexOf(item), 1);
  return true;
}

export function plantFlag(state, actor, x, z, name) {
  const check = canPlantFlag(state, x, z);
  if (!check.ok) return check;
  // 旗を立てるのは近くの仲間。キットは本人が無ければ部隊の誰かの持ち物から使う
  const holders = [actor, ...partyMembers(state).filter((a) => a !== actor).sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0))];
  if (!holders.some((a) => a && consumeFlagKit(a))) return { ok: false, color: 'red', reason: '旗キットがない' };
  const o = ensureOutposts(state);
  const id = nextBuildId(state, 'o');
  const flagId = nextBuildId(state, 'p');
  const outpost = {
    id, name: String(name || `第${o.items.length + 1}拠点`).slice(0, 24),
    x: Math.round(x), z: Math.round(z), radius: OUTPOST_RADIUS, flagId,
    pieceIds: [flagId], createdTick: state.tick || 0,
  };
  o.items.push(outpost);
  o.pieces.push({ id: flagId, type: 'outpost_flag', outpostId: id, x: outpost.x, z: outpost.z, rot: 0, state: 'done', hp: 100, maxHp: 100, cost: {}, work: 0 });
  o.rev += 1;
  return { ok: true, color: 'green', reason: '', outpost };
}

export function renameOutpost(state, id, name) {
  const o = outpostById(state, id);
  const value = String(name || '').trim().slice(0, 24);
  if (!o || !value) return false;
  o.name = value;
  emitBaseReaction(state, { event: 'base_renamed', outpostId: id }, o);
  return true;
}

function partyMembers(state) {
  return (state.actors || []).filter((a) => a && a.faction === 'player' && a.state !== 'dead');
}

export function outpostIsAwake(state, outpostId) {
  const o = outpostById(state, outpostId);
  if (!o) return false;
  return partyMembers(state).some((a) => Math.hypot(a.x - o.x, a.z - o.z) <= OUTPOST_SLEEP_DISTANCE);
}

export function sleepingOutpostIds(state) {
  return ensureOutposts(state).items.filter((o) => !outpostIsAwake(state, o.id)).map((o) => o.id);
}

export function outpostSummary(state, origin = { x: 0, z: 0 }) {
  const o = ensureOutposts(state);
  return o.items.slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map((base) => {
    const pieces = o.pieces.filter((p) => p.outpostId === base.id);
    return {
      id: base.id, name: base.name, x: base.x, z: base.z,
      distance: Math.round(Math.hypot(base.x - (origin.x || 0), base.z - (origin.z || 0))),
      people: partyMembers(state).filter((a) => Math.hypot(a.x - base.x, a.z - base.z) <= base.radius).length,
      sites: pieces.filter((p) => p.state === 'site').length,
      sleeping: !outpostIsAwake(state, base.id),
    };
  });
}

export function raidEligible(state, outpostId) {
  const o = outpostById(state, outpostId);
  return !!o && partyMembers(state).some((a) => Math.hypot(a.x - o.x, a.z - o.z) <= o.radius);
}
