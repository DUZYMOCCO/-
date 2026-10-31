import { WORLD_LAYOUT } from '../data/world_layout.js';
import { saleLots } from '../world/settlement_plan.js';
import { canonicalFaction } from './faction_relations.js';
import { GOODS, midPrice, partyMoney, spendPartyMoney } from './trade.js';
import { ensureTown, createOwnedHouse, houseById, isPublic, shopClosed } from './town.js';
import { ensureOutposts } from './outposts.js';
import { nextBuildId } from './outposts.js';
import { th } from './town.js';
import { emitBaseReaction } from './narrative_text.js';

const LOT_BASE = Object.freeze({ village: 2000, town: 4000, city: 8000, koba_town: 4000 });

export function lotPrice(lot, town = null) {
  const settlement = town || WORLD_LAYOUT.towns.find((p) => p.id === lot?.townId);
  const base = LOT_BASE[lot?.townId] || LOT_BASE[settlement?.size] || 4000;
  const wealth = Number.isFinite(settlement?.wealth) ? settlement.wealth : 0.5;
  return Math.round((base * (0.8 + 0.6 * wealth)) / 100) * 100;
}

function knownLot(state, lotId) {
  for (const p of WORLD_LAYOUT.towns) {
    const found = saleLots(p, state).find((lot) => lot.id === lotId);
    if (found) return { lot: found, town: p };
  }
  return null;
}

function lotOwned(state, lotId) {
  return (state.ownedLots || []).includes(lotId) || (state.town?.houses || []).some((h) => h.owner === 'player' && h.lot === lotId);
}

export function lotsForTown(state, townId) {
  const p = WORLD_LAYOUT.towns.find((t) => t.id === townId);
  if (!p) return [];
  return saleLots(p, state).map((lot) => ({ ...lot, price: lotPrice(lot, p), owned: lotOwned(state, lot.id) }));
}

export function allSaleLots(state) {
  return WORLD_LAYOUT.towns.flatMap((p) => lotsForTown(state, p.id));
}

export function buyLot(state, lotId) {
  const result = knownLot(state, lotId);
  if (!result) return { ok: false, reason: '売り区画がない' };
  const { lot, town } = result;
  if (lotOwned(state, lot.id)) return { ok: false, reason: 'すでに持っている' };
  const faction = canonicalFaction(town.owner);
  if (faction && state.factionHostile?.[faction]) return { ok: false, reason: 'この町では売ってくれない' };
  const price = lotPrice(lot, town);
  if (partyMoney(state) < price) return { ok: false, reason: 'お金が足りない', price };
  if (!spendPartyMoney(state, price)) return { ok: false, reason: 'お金が足りない', price };
  ensureTown(state);
  const id = nextBuildId(state, 'hp');
  const house = createOwnedHouse(state, lot, id);
  if (!house) return { ok: false, reason: '家を作れない', price };
  house.price = price;
  state.ownedHouses ||= []; state.ownedHouses.push(id);
  state.ownedLots ||= []; state.ownedLots.push(lot.id);
  emitBaseReaction(state, { event: 'house_bought', outpostId: id }, { x: house.x, z: house.z });
  return { ok: true, reason: '', price, house };
}

export function setHousePublic(state, houseId, value) {
  const house = houseById(state, houseId);
  if (!house || house.owner !== 'player') return false;
  house.public = !!value;
  return true;
}

function houseCounter(state, house) {
  const outposts = ensureOutposts(state);
  return outposts.pieces.find((p) => p.houseId === house.id && p.type === 'shop_counter' && p.state === 'done') || null;
}

function shopStaff(state, house, counter) {
  return (state.actors || []).find((a) => a.faction === 'player' && a.state !== 'dead' &&
    (a.jobs?.primary === 'shopkeeper' || a.jobs?.secondary === 'shopkeeper') &&
    houseById(state, house.id) && Math.abs(a.x - house.x) < house.w / 2 && Math.abs(a.z - house.z) < house.d / 2 &&
    Math.hypot(a.x - counter.x, a.z - counter.z) <= 2);
}

function activeResidents(state, house) {
  return (state.actors || []).filter((a) => a && a.faction !== 'player' && a.state !== 'dead' && a.state !== 'down' &&
    (a.townId === house.town || a.settlementId === house.settlement || a.settlementId === house.town) &&
    !a.shopGoal && Math.hypot(a.x - house.x, a.z - house.z) <= 150).sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

function finishCustomer(state, house, customer) {
  const actor = (state.actors || []).find((a) => a.id === customer.actorId);
  const box = state.town?.boxes?.find((b) => b.id === customer.boxId);
  const staff = (state.actors || []).find((a) => a.id === customer.staffId);
  if (!actor || actor.state === 'dead' || !box || !staff || (box.goods[customer.good] || 0) < 1 || (actor.money || 0) < customer.price) return false;
  box.goods[customer.good] -= 1;
  actor.money -= customer.price;
  staff.money = (staff.money || 0) + customer.price;
  return true;
}

// 客は町の歩行（戸口経由の stepToward）でカウンターの客側へ歩く。ここは到着判定と時間切れだけ
const CUSTOMER_REACH = 0.9, CUSTOMER_GIVEUP = 1800;
function customerSpot(house, counter) {
  const door = house.door || house;
  const dx = door.x - counter.x, dz = door.z - counter.z, d = Math.hypot(dx, dz) || 1;
  return { x: Math.round((counter.x + dx / d * 0.9) * 100) / 100, z: Math.round((counter.z + dz / d * 0.9) * 100) / 100 };
}

function moveCustomers(state) {
  for (const house of state.town?.houses || []) {
    const c = house.shopCustomer;
    if (!c) continue;
    const actor = (state.actors || []).find((a) => a.id === c.actorId);
    const drop = () => { if (actor && actor.shopGoal) actor.shopGoal = null; house.shopCustomer = null; };
    if (!actor || actor.state === 'dead' || actor.state === 'down') { drop(); continue; }
    const tx = Number.isFinite(c.tx) ? c.tx : house.counter.x, tz = Number.isFinite(c.tz) ? c.tz : house.counter.z;
    const d = Math.hypot(tx - actor.x, tz - actor.z);
    if (d <= CUSTOMER_REACH) {
      if (finishCustomer(state, house, c)) house.shopLastSale = { actorId: c.actorId, good: c.good, tick: state.tick, price: c.price };
      drop();
    } else if (state.tick - (c.startedTick || 0) > CUSTOMER_GIVEUP || !isPublic(state, house)) {
      drop();
    } else {
      actor.shopGoal = { x: tx, z: tz, houseId: house.id };
    }
  }
}

export function updateShopCounters(state) {
  moveCustomers(state);
  if (!state.town) return;
  const hour = Math.floor((state.timeSec || 0) / 3600);
  for (const house of state.town.houses) {
    if (house.owner !== 'player') continue;
    const counter = houseCounter(state, house);
    if (!counter || !house.public || shopClosed(state) || !isPublic(state, house) || house.shopCustomer) continue;
    const staff = shopStaff(state, house, counter);
    if (!staff) continue;
    if (!Number.isInteger(house.shopLastHour)) { house.shopLastHour = hour; continue; }
    if (hour <= house.shopLastHour) continue;
    house.shopLastHour = hour;
    const residents = activeResidents(state, house);
    if (!residents.length) continue;
    const resident = residents[Math.floor(th(state.seed, house.id, hour, 'resident') * residents.length)];
    const boxIds = house.boxes || [];
    const stock = boxIds.map((id) => state.town.boxes.find((b) => b.id === id)).filter(Boolean)
      .flatMap((box) => Object.keys(box.goods || {}).filter((good) => GOODS[good] && box.goods[good] > 0).sort().map((good) => ({ box, good })));
    if (!stock.length) continue;
    const chosen = stock[Math.floor(th(state.seed, house.id, hour, 'good') * stock.length)];
    const market = house.settlement || house.town;
    const price = Math.max(1, Math.round(midPrice(state, market, chosen.good) * 0.9));
    if ((resident.money || 0) < price) continue;
    const spot = customerSpot(house, counter);
    house.shopCustomer = { actorId: resident.id, staffId: staff.id, boxId: chosen.box.id, good: chosen.good, price, hour, startedTick: state.tick, tx: spot.x, tz: spot.z };
    resident.shopGoal = { x: spot.x, z: spot.z, houseId: house.id };
  }
}

export function shopCounterState(state, houseId) {
  const house = houseById(state, houseId), counter = house && houseCounter(state, house);
  return house ? { houseId, public: !!house.public, open: isPublic(state, house), counter: counter && { x: counter.x, z: counter.z }, customer: house.shopCustomer || null, lastSale: house.shopLastSale || null } : null;
}
