import { RACES_DATA } from '../data/races_data.js';
import { FACTION_RACES_DATA } from '../data/factions_races_data.js';
import { actorOwner } from './faction_relations.js';

export const DEFAULT_RACE = RACES_DATA.defaultRace;

function hash32(value) {
  let h = 2166136261;
  for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function weighted(items, value, key) {
  const list = Array.isArray(items) ? items : [];
  const total = list.reduce((sum, item) => sum + Math.max(0, Number(item?.[key]) || 0), 0);
  if (!total) return list[0] || null;
  let n = (value / 0x100000000) * total;
  for (const item of list) {
    n -= Math.max(0, Number(item?.[key]) || 0);
    if (n < 0) return item;
  }
  return list[list.length - 1] || null;
}

const BASE_BY_NAME = Object.freeze(Object.fromEntries(
  Object.entries(RACES_DATA.bases).map(([id, base]) => [base.name, id])
));

export function raceDef(id) {
  return RACES_DATA.races[id] || RACES_DATA.races[DEFAULT_RACE];
}

export function raceOf(actor) {
  return raceDef(actor?.race);
}

export function raceBase(id) {
  const detailId = RACES_DATA.races[id] ? id : BASE_BY_NAME[id] || id;
  const baseId = RACES_DATA.races[detailId]?.base || detailId;
  const base = RACES_DATA.bases[baseId];
  return base ? { id: baseId, ...base } : { id: DEFAULT_RACE, ...RACES_DATA.bases[DEFAULT_RACE] };
}

export function factionRaceAttitude(factionId, baseRace) {
  const faction = FACTION_RACES_DATA[factionId];
  const id = raceBase(baseRace).id;
  const name = RACES_DATA.bases[id]?.name;
  const main = faction?.races_main?.find(item => item.race === name);
  const hostile = faction?.races_hostile?.find(item => item.race === name);
  return { factionId, base: id, name, share: main?.share || 0, accepted: !!faction?.races_accepted?.includes(name), treatment: hostile?.treatment || null, checkpoint: !!faction?.guard_checkpoint?.includes(name) };
}

function compositionFor(actor, factionId) {
  const faction = FACTION_RACES_DATA[factionId];
  if (Array.isArray(faction?.races_main) && faction.races_main.length) {
    return faction.races_main.map(item => ({ race: BASE_BY_NAME[item.race] || item.race, share: item.share }));
  }
  if (actor?.faction === 'bandit') return RACES_DATA.banditComposition;
  return RACES_DATA.defaultComposition;
}

export function assignRace(actor, options = {}) {
  if (!actor || typeof actor !== 'object') return DEFAULT_RACE;
  // 獣には種族を付けない（倍率は1のまま、表示もしない）
  if (actor.faction === 'beast' && !actor.swordsman) { actor.race = null; return null; }
  if (options.forceDefault || actor.isPlayer || actor.faction === 'player') {
    actor.race = DEFAULT_RACE;
    return actor.race;
  }
  const factionId = actor.ownerFaction || actor.settlementOwner || (actor.faction === 'bandit' ? null : actorOwner(actor));
  const stableFaction = factionId || (actor.faction === 'bandit' ? 'bandit' : 'default');
  const h = hash32(`${actor.id}|${stableFaction}`);
  const selected = weighted(compositionFor(actor, factionId), h, 'share');
  const baseId = raceBase(selected?.race || DEFAULT_RACE).id;
  const base = RACES_DATA.bases[baseId] || RACES_DATA.bases[DEFAULT_RACE];
  const subtypeItems = base.subtypes.map((race, index) => ({ race, weight: base.weights?.[index] ?? 1 }));
  actor.race = weighted(subtypeItems, hash32(`${actor.id}|${stableFaction}|subtype`), 'weight')?.race || base.subtypes[0] || DEFAULT_RACE;
  return actor.race;
}

export function racePartMax(actor, partKey, baseMax) {
  const partType = partKey === 'lArm' || partKey === 'rArm' ? 'arm' : partKey === 'lLeg' || partKey === 'rLeg' ? 'leg' : partKey;
  const mult = raceOf(actor)?.partMax?.[partType] ?? 1;
  return Math.round(baseMax * mult * 100) / 100;
}

export function raceStrength(actor) { return (actor?.skills?.strength || 0) * (raceOf(actor)?.strength ?? 1); }
export function raceDexterity(actor) { return (actor?.skills?.dexterity || 0) * (raceOf(actor)?.dexterity ?? 1); }

export function squadHasRace(squad, baseRace) {
  const wanted = raceBase(baseRace).id;
  return (squad || []).some(actor => raceBase(actor?.race || DEFAULT_RACE).id === wanted);
}

export function factionChecksSquad(factionId, squad) {
  const faction = FACTION_RACES_DATA[factionId];
  const checkpoints = [
    ...(faction?.guard_checkpoint || []),
    ...(faction?.races_hostile || []).filter(item => item.treatment === '検問で止める' || item.treatment === '奴隷にする').map(item => item.race),
  ];
  return checkpoints.some(name => squadHasRace(squad, name));
}

/** 表示用の種族名。「守り子（群れ子）」、型と基本が同じなら「灰民」。種族の無い者は空。 */
export function raceLabel(actor) {
  if (!actor?.race || !RACES_DATA.races[actor.race]) return '';
  const race = RACES_DATA.races[actor.race];
  const base = raceBase(actor.race);
  return race.name === base.name ? race.name : `${race.name}（${base.name}）`;
}

export function raceData() { return RACES_DATA; }
