// 盗品の出どころと、7日後に印を消す処理。
import { DAY_SEC } from './data.js';
import { WORLD_LAYOUT } from '../data/world_layout.js';
import { canonicalFaction, ownerNear } from './faction_relations.js';

export const STOLEN_GOODS_DAYS = 7;
export const STOLEN_GOODS_TTL_SEC = DAY_SEC * STOLEN_GOODS_DAYS;
export const STOLEN_GOODS_BUYBACK = 0.6;
const SIM_TOWN_WORLD_ID = { town1: 'koba_town', town2: 'kokkaku_tanbo' };

export function factionForTown(state, townId) {
  if (!townId) return null;
  const worldTown = WORLD_LAYOUT.towns.find((entry) => entry.id === (SIM_TOWN_WORLD_ID[townId] || townId));
  if (worldTown) return canonicalFaction(worldTown.owner);
  const place = state?.places?.[townId];
  if (place) return canonicalFaction(place.ownerFaction || place.faction || ownerNear(place.x, place.z));
  return null;
}

export function makeStolenMark(state, house, box) {
  const townId = house?.town || null;
  return {
    townId,
    factionId: factionForTown(state, townId),
    buildingId: house?.id || null,
    boxId: box?.id || null,
    stolenAtSec: Math.max(0, Number(state?.timeSec) || 0),
  };
}

export function activeStolenMark(mark, timeSec = 0) {
  if (!mark || typeof mark !== 'object') return null;
  const now = Number(timeSec) || 0;
  const stolenAt = Number(mark.stolenAtSec);
  if (Number.isFinite(stolenAt) && now - stolenAt >= STOLEN_GOODS_TTL_SEC) return null;
  return mark;
}

export function sameStolenFaction(state, mark, townId) {
  const active = activeStolenMark(mark, state?.timeSec);
  if (!active) return false;
  const originFaction = active.factionId || factionForTown(state, active.townId);
  const targetFaction = factionForTown(state, townId);
  return !!originFaction && !!targetFaction && originFaction === targetFaction;
}

export function sameStolenFactionId(state, mark, factionId) {
  const active = activeStolenMark(mark, state?.timeSec);
  if (!active || !factionId) return false;
  const originFaction = active.factionId || factionForTown(state, active.townId);
  return !!originFaction && originFaction === canonicalFaction(factionId);
}

export function stolenTownName(state, mark) {
  const id = mark?.townId;
  return state?.places?.[id]?.name || WORLD_LAYOUT.towns.find((town) => town.id === id)?.name || id || '不明';
}

export function addStolenLot(cargo, mark, count = 1) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (!cargo || !mark || n < 1) return;
  if (!Array.isArray(cargo.stolenLots)) cargo.stolenLots = [];
  const lot = cargo.stolenLots.find((entry) => entry.townId === mark.townId && entry.factionId === mark.factionId &&
    entry.buildingId === mark.buildingId && entry.boxId === mark.boxId && entry.stolenAtSec === mark.stolenAtSec);
  if (lot) lot.n = Math.max(0, Number(lot.n) || 0) + n;
  else cargo.stolenLots.push({ ...mark, n });
}

export function activeStolenLots(cargo, timeSec = 0) {
  return (Array.isArray(cargo?.stolenLots) ? cargo.stolenLots : [])
    .filter((lot) => Number(lot?.n) > 0 && activeStolenMark(lot, timeSec));
}

export function stolenLotCount(cargo, timeSec = 0) {
  return activeStolenLots(cargo, timeSec).reduce((sum, lot) => sum + Math.max(0, Math.floor(Number(lot.n) || 0)), 0);
}

export function consumeStolenLot(cargo, lot, count = 1) {
  if (!cargo || !Array.isArray(cargo.stolenLots) || !lot) return false;
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n < 1) return false;
  lot.n = Math.max(0, (Number(lot.n) || 0) - n);
  if (lot.n <= 0) cargo.stolenLots = cargo.stolenLots.filter((entry) => entry !== lot);
  return true;
}

function cleanItem(item, now, seen) {
  if (!item || typeof item !== 'object' || seen.has(item)) return;
  seen.add(item);
  if (item.stolen && !activeStolenMark(item.stolen, now)) delete item.stolen;
  if (Array.isArray(item.contents)) for (const child of item.contents) cleanItem(child, now, seen);
  if (item.ammo) cleanItem(item.ammo, now, seen);
}

export function updateStolenGoods(state) {
  if (!state || typeof state !== 'object') return;
  const now = Number(state.timeSec) || 0;
  const seen = new Set();
  for (const actor of state.actors || []) {
    for (const item of actor.inv || []) cleanItem(item, now, seen);
    for (const item of actor.gearStock || []) cleanItem(item, now, seen);
    for (const value of Object.values(actor.equip || {})) {
      for (const item of Array.isArray(value) ? value : [value]) cleanItem(item, now, seen);
    }
  }
  for (const box of state.town?.boxes || []) for (const item of box.gear || []) cleanItem(item, now, seen);
  for (const cargo of Object.values(state.trade?.cargo || {})) {
    if (!Array.isArray(cargo.stolenLots)) continue;
    cargo.stolenLots = cargo.stolenLots.filter((lot) => Number(lot?.n) > 0 && activeStolenMark(lot, now));
    if (!cargo.stolenLots.length) delete cargo.stolenLots;
  }
}
