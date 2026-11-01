// 町の店とプレイヤーの店に共通するルール。店種別ごとの違いは data/shop_types.js に集約。
import { ITEMS, qualityOf } from './items.js';
import { GOODS, midPrice } from './trade.js';
import { ACTOR_LIMIT, DAY_SEC, makeEvent, isHostile } from './data.js';
import { makeActor } from './world.js';
import { ensureOutposts, outpostById } from './outposts.js';
import { houseAt, houseById, isPublic, localToWorld, doorPoint, th, shopClosed } from './town.js';
import { SHOP_TYPES, SHOP_BENCH_TYPE } from '../data/shop_types.js';
import { WORLD_LAYOUT } from '../data/world_layout.js';
import shopLines from '../data/shop_lines.js';
import { DISHES, cookingMultiplier } from './cooking.js';

export const SHOP_TUNING = Object.freeze({
  visitorCap: 2, generatedVisitorCap: 6, visitorRange: [150, 250], customerGiveUpTicks: 1800,
  dailyNotableChance: 0.05, dineAndDashChance: 0.03, shopBrawlBaseChance: 0.04,
  shopRansackDailyChance: 0.02, shopTheftBanDays: 30, houseRepelledGuestDays: 7,
  visibleWakeChance: 0.08, salesStaffDistance: 2, cookingAlcoholBrawlFactor: 1.5,
  closingLeaveTicks: 200, notableMinRep: 70, notableMinMakerSkill: 150, notablePriceFactor: 1.5,
});

// 名のある客が欲しがる逸品: 作り手の腕150以上（作り手不明の品は最高品質10）。
export function isMasterwork(item) {
  if (!item || item.dish || item.good) return false;
  if (Number.isFinite(item.makerSkill)) return item.makerSkill >= SHOP_TUNING.notableMinMakerSkill;
  return (item.rank || 1) >= 10;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const actorNum = (a, key) => Math.max(0, Number(a?.skills?.[key]) || 0);
function piecesFor(state, house) {
  return ensureOutposts(state).pieces.filter((p) => p.houseId === house.id && p.state === 'done');
}
function counterFor(state, house) {
  return piecesFor(state, house).filter((p) => p.type === 'shop_counter')
    .sort((a, b) => Math.hypot(a.x-house.x,a.z-house.z)-Math.hypot(b.x-house.x,b.z-house.z) || String(a.id).localeCompare(String(b.id),undefined,{numeric:true}))[0] || null;
}

export function shopTypeForHouse(state, house) {
  if (!house) return 'general';
  const counter = counterFor(state, house) || house.counter || house;
  const benches = piecesFor(state, house).filter((p) => SHOP_BENCH_TYPE[p.type]);
  benches.sort((a, b) => Math.hypot(a.x-counter.x,a.z-counter.z)-Math.hypot(b.x-counter.x,b.z-counter.z) || String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
  return SHOP_BENCH_TYPE[benches[0]?.type] || 'general';
}

function playerStaff(state, house, job) {
  return (state.actors || []).filter((a) => a.faction === 'player' && a.state !== 'dead' && a.state !== 'down' &&
    (a.jobs?.primary === job || a.jobs?.secondary === job) &&
    (job === 'guard' ? Math.hypot(a.x-(house.door?.x || house.x),a.z-(house.door?.z || house.z)) <= 4 : Math.abs(a.x-house.x) < house.w/2 && Math.abs(a.z-house.z) < house.d/2 &&
    (!house.counter || Math.hypot(a.x-house.counter.x,a.z-house.counter.z) <= SHOP_TUNING.salesStaffDistance || job !== 'shopkeeper')))
    .sort((a,b)=>Number(a.id)-Number(b.id))[0] || null;
}

function assignedGuard(state, house) {
  const door = house.door || house;
  return (state.actors || []).filter((a) => a.faction === 'player' && a.state !== 'dead' && a.state !== 'down' &&
    (a.jobs?.primary === 'guard' || a.jobs?.secondary === 'guard') &&
    !(a.jobs?.primary === 'shopkeeper' || a.jobs?.secondary === 'shopkeeper'))
    .sort((a, b) => Math.hypot(a.x-door.x,a.z-door.z) - Math.hypot(b.x-door.x,b.z-door.z) || Number(a.id)-Number(b.id))[0] || null;
}

function shopkeeper(state, house, counter) {
  return (state.actors || []).filter((a) => a.faction === 'player' && a.state !== 'dead' && a.state !== 'down' &&
    (a.jobs?.primary === 'shopkeeper' || a.jobs?.secondary === 'shopkeeper') && Math.abs(a.x-house.x) < house.w/2 && Math.abs(a.z-house.z) < house.d/2 &&
    Math.hypot(a.x-counter.x,a.z-counter.z) <= SHOP_TUNING.salesStaffDistance)
    .sort((a,b)=>Number(a.id)-Number(b.id))[0] || null;
}

function storageBoxes(state, house) {
  if (house.boxes?.length) return (state.town?.boxes || []).filter((b) => house.boxes.includes(b.id));
  return piecesFor(state, house).filter((p) => p.type === 'storage_box');
}

function ensureShop(house, type = null, state = null) {
  const chosenType = type || shopTypeForHouse(state, house);
  if (!house.shop || typeof house.shop !== 'object') house.shop = { type: chosenType, rep: 10, today: null, yesterday: null, history: [], bans: {}, repelled: {} };
  const s = house.shop;
  s.type = chosenType;
  s.rep = clamp(Number.isFinite(Number(s.rep)) ? Number(s.rep) : 10, 0, 100);
  if (!s.bans || typeof s.bans !== 'object') s.bans = {};
  if (!s.repelled || typeof s.repelled !== 'object') s.repelled = {};
  return s;
}

function startDay(state, house, shop, day) {
  if (!shop.today) shop.today = { day, customers: 0, sales: 0, revenue: 0, soldOut: {}, observedFights: 0, lastHour: null };
  if (shop.today.day === day) return;
  shop.yesterday = { ...shop.today, soldOut: { ...(shop.today.soldOut || {}) } };
  shop.history ||= [];
  shop.history.unshift(shop.yesterday);
  shop.history.length = Math.min(shop.history.length, 7);
  shop.today = { day, customers: 0, sales: 0, revenue: 0, soldOut: {}, observedFights: 0, lastHour: null };
  shop.notableClaimed = false;
  shop.notableUsed = false;
  shop.rep = clamp(shop.rep + (50 - shop.rep) * 0.01, 0, 100);
  if (state && day > 0 && th(state.seed, house.id, day, 'notable') < SHOP_TUNING.dailyNotableChance && shop.rep >= SHOP_TUNING.notableMinRep) shop.notableToday = true;
  else shop.notableToday = false;
}

export function shopSkill(actor, key) {
  const direct = actor?.skills?.[key];
  if (Number.isFinite(direct)) return clamp(direct, 0, 255);
  if (key === 'cooking') return 1;
  return clamp(actorNum(actor, 'smithing'), 0, 255);
}

export function customerKind(actor) {
  if (!actor) return 'traveler';
  if (actor.missing?.length) return 'injured';
  const raw = [actor.shopCategory, actor.role, actor.job, actor.title, ...(actor.tags || [])].filter(Boolean).join(' ').toLowerCase();
  if (/bounty|賞金/.test(raw)) return 'bounty_hunter';
  if (/hunter|狩人|狩猟/.test(raw)) return 'hunter';
  if (/caravan|trader|隊商|交易/.test(raw)) return 'caravan';
  if (/escort|護衛|guard/.test(raw) && actor.civil === false) return 'escort';
  if (/merc|傭兵/.test(raw)) return 'mercenary';
  if (/bandit|thief|rogue|盗賊|野盗/.test(raw) || actor.faction === 'bandit') return 'thief';
  if (actor.home || actor.job === 'resident' || actor.settlementRole === 'resident') return 'resident';
  return 'traveler';
}

export function equipmentCategory(id) {
  if (id === 'bolts') return 'ranged';
  if (id in GOODS) return 'general';
  const item = ITEMS[id];
  if (!item) return null;
  if (item.slot === 'prosthetic') return 'prosthetic';
  if (item.ranged) return 'ranged';
  if (item.slot === 'weapon' && !item.ranged) return 'weapon';
  if (['head','upperOut','lowerOut','feet','upperIn','lowerIn'].includes(item.slot)) {
    return item.metal || (item.cutRes || 0) >= 0.28 ? 'armor' : 'clothes';
  }
  return null;
}

export function shopAccepts(shopType, id) {
  const config = SHOP_TYPES[shopType] || SHOP_TYPES.general;
  const category = equipmentCategory(id);
  if (config.gear) return category === config.gear;
  if (config.goods?.includes(id)) return true;
  return !!config.dishes && Object.hasOwn(DISHES, id);
}

function boxItems(state, house, shopType) {
  const out = [];
  for (const box of storageBoxes(state, house)) {
    for (const [id, n] of Object.entries(box.goods || {})) if (n > 0 && shopAccepts(shopType, id)) out.push({ box, id, n, rank: 1, good: true });
    for (const [id, n] of Object.entries(box.contents || {})) if (n > 0 && shopAccepts(shopType, id)) out.push({ box, id, n, rank: 1, good: true });
    for (const entry of box.gear || []) if (entry?.n > 0 && shopAccepts(shopType, entry.id)) out.push({ box, id: entry.id, n: entry.n, rank: entry.rank || 1, maker: entry.maker, makerSkill: entry.makerSkill, gear: entry });
    for (const [id, n] of Object.entries(box.dishes || {})) if (n > 0 && shopAccepts(shopType, id)) out.push({ box, id, n, rank: 1, dish: true });
  }
  return out;
}

function shopMakerLevel(state, house, shop, item) {
  if (Number.isFinite(item.makerSkill)) return clamp(item.makerSkill, 0, 255);
  const key = SHOP_TYPES[shop.type]?.skill || 'trade';
  const staff = (state.actors || []).filter((a) => a.faction === 'player' && a.state !== 'dead' && Math.abs(a.x-house.x) < house.w/2 && Math.abs(a.z-house.z) < house.d/2 &&
    Object.values(a.jobs || {}).some((j) => ['shopkeeper','cook','guard'].includes(j)));
  return staff.reduce((max, actor) => Math.max(max, shopSkill(actor, key)), 0);
}

export function shopItemPrice(state, house, item, { named = false, rep = null } = {}) {
  const shop = ensureShop(house, null, state);
  const reputation = clamp(Number(rep ?? shop.rep), 0, 100);
  const repFactor = 0.8 + 0.4 * reputation / 100;
  if (item.dish || DISHES[item.id]) {
    const dish = DISHES[item.id];
    const cost = Object.entries(dish.materials).reduce((sum,[id,n]) => sum + (GOODS[id]?.base || 0) * n, 0);
    const cook = shopMakerLevel(state, house, shop, item);
    return Math.max(1, Math.round(cost * cookingMultiplier(cook) * repFactor * (dish.buff ? 1.1 : 1)));
  }
  if (item.good && GOODS[item.id]) {
    const market = house.settlement || house.town;
    return Math.max(1, Math.round(midPrice(state, market, item.id) * 0.9 * repFactor));
  }
  const def = ITEMS[item.id];
  if (!def) return 0;
  const level = shopMakerLevel(state, house, shop, item);
  const armFull = 1.6 + 0.8 * Math.min(level,100)/100 + 0.4 * Math.max(0,level-100)/155;
  const arm = Number.isFinite(item.makerSkill) ? armFull : 1 + (armFull - 1) * 0.3;
  const quality = qualityOf(item.rank || 1).value;
  return Math.max(1, Math.round((def.value || 1) * quality * arm * repFactor * (named ? SHOP_TUNING.notablePriceFactor : 1)));
}

function removeStackOne(actor, index) {
  const stack = actor.inv[index];
  if (!stack) return false;
  stack.n = Math.max(1, Number(stack.n) || 1) - 1;
  if (stack.n <= 0) actor.inv.splice(index, 1);
  return true;
}

export function stockShopItem(state, houseId, actorId, invIndex) {
  const house = houseById(state, houseId), actor = (state.actors || []).find((a) => a.id === actorId && a.faction === 'player');
  if (!house || house.owner !== 'player' || !actor || !Number.isInteger(invIndex) || invIndex < 0) return false;
  const item = actor.inv?.[invIndex];
  const type = shopTypeForHouse(state, house);
  if (!item || !shopAccepts(type, item.id)) return false;
  const boxes = storageBoxes(state, house);
  if (!boxes.length) return false;
  const box = boxes[0];
  const def = ITEMS[item.id];
  if (def && !GOODS[item.id]) {
    box.gear ||= [];
    const exists = box.gear.find((entry) => entry.id === item.id && (entry.rank || 1) === (item.rank || 1) && entry.maker === actor.id && entry.makerSkill === shopSkill(actor, SHOP_TYPES[type]?.skill || 'trade'));
    if (exists) exists.n += 1;
    else box.gear.push({ id: item.id, rank: item.rank || 1, n: 1, maker: actor.id, makerSkill: shopSkill(actor, SHOP_TYPES[type]?.skill || 'trade') });
  } else if (DISHES[item.id]) { box.dishes ||= {}; box.dishes[item.id] = (box.dishes[item.id] || 0) + 1; }
  else { box.goods ||= {}; box.goods[item.id] = (box.goods[item.id] || 0) + 1; }
  removeStackOne(actor, invIndex);
  return true;
}

export function shopCapacity(state, house) {
  const t = shopTypeForHouse(state, house), pieces = piecesFor(state, house);
  if (t === 'restaurant') return pieces.filter((p) => p.type === 'dining_table').length * 2;
  return 2 + Math.max(1, pieces.filter((p) => p.type === 'shop_counter').length);
}

export function shopVisitorExpectation(type, reputation) {
  return (0.5 + 2.5 * clamp(Number(reputation)||0,0,100)/100) * (SHOP_TYPES[type]?.visitorFactor || 1);
}

function customerSpot(house, counter) {
  const door = house.door || house;
  const dx = door.x - counter.x, dz = door.z - counter.z, d = Math.hypot(dx,dz) || 1;
  return { x: Math.round((counter.x+dx/d*0.9)*100)/100, z: Math.round((counter.z+dz/d*0.9)*100)/100 };
}

export function weightedCustomerKind(weights, r) {
  const entries = Object.entries(weights || { traveler: 1 });
  const total = entries.reduce((sum,[,w])=>sum+Math.max(0,w),0) || 1;
  let n = r * total;
  for (const [kind,w] of entries) { n -= Math.max(0,w); if(n <= 0) return kind; }
  return entries[entries.length-1][0];
}

function spawnGuest(state, house, kind, day, hour, serial = 0) {
  if ((state.actors || []).filter((a) => a.shopVisit?.generated && a.shopVisit.houseId === house.id).length >= SHOP_TUNING.generatedVisitorCap || state.actors.length >= ACTOR_LIMIT) return null;
  const at = doorPoint(house, 2.4);
  const fallbacks = ({ thief:'bandit', mercenary:'guard', bounty_hunter:'guard', hunter:'guard', escort:'merchant', caravan:'merchant', injured:'guard', resident:'guard' });
  const factions = Object.keys(state.factionHostile || {}).filter((id) => id !== 'player').sort();
  const faction = factions.length ? factions[Math.floor(th(state.seed,house.id,day,hour,serial,'guest-faction')*factions.length)] : (fallbacks[kind] || 'guard');
  const savedRng = state.rngState;
  const actor = makeActor(state, faction, at.x, at.z, null, false);
  state.rngState = savedRng;
  actor.shopCategory = kind; actor.title = ({ thief:'流れ者', mercenary:'傭兵', bounty_hunter:'賞金稼ぎ', hunter:'狩人', escort:'隊商の護衛', caravan:'隊商', injured:'負傷者', resident:'町人' })[kind] || '旅人';
  actor.civil = kind === 'resident' || kind === 'caravan' || kind === 'injured';
  actor.townId = house.town;
  actor.money = Math.round(({ injured:320, mercenary:260, bounty_hunter:300, hunter:180, escort:240, caravan:280, resident:160, thief:190 })[kind] || 180);
  actor.shopVisit = { houseId: house.id, phase: 'approach', generated: true, day, hour, serial };
  return actor;
}

function candidatePool(state, house, type, rep, day, hour, shop = null) {
  const cfg = SHOP_TYPES[type] || SHOP_TYPES.general;
  let choices = (state.actors || []).filter((a) => a && a.faction !== 'player' && a.state !== 'dead' && a.state !== 'down' && !a.shopVisit && !a.shopGoal &&
    Math.hypot(a.x-house.x,a.z-house.z) <= SHOP_TUNING.visitorRange[1] && (!a.targetId || a.targetId == null) &&
    (!shop?.repelled?.[a.faction] || shop.repelled[a.faction] <= day) && (!shop?.bans?.[a.faction] || shop.bans[a.faction] <= day));
  if (rep < 30) choices = choices.filter((a) => Math.hypot(a.x-house.x,a.z-house.z) <= SHOP_TUNING.visitorRange[0] || customerKind(a) === 'resident');
  // Keep the original general-counter contract: low-reputation shops need local residents;
  // mixed travelers start joining all types once reputation reaches 30.
  if (type === 'general' && rep < 30 && !choices.some((a) => customerKind(a) === 'resident' && (a.townId === house.town || a.settlementId === house.town))) return [];
  const missing = choices.filter((a) => customerKind(a) === 'injured');
  if (type === 'prosthetic' && missing.length) return [missing[Math.floor(th(state.seed,house.id,day,hour,'prosthetic')*missing.length)]];
  const kind = weightedCustomerKind(cfg.crowd, th(state.seed,house.id,day,hour,'visitor-kind'));
  let pool = choices.filter((a) => customerKind(a) === kind);
  if (!pool.length) pool = choices.filter((a) => cfg.crowd[customerKind(a)]);
  if (pool.length) return [pool[Math.floor(th(state.seed,house.id,day,hour,'visitor')*pool.length)]];
  const near = choices.filter((a) => customerKind(a) === 'resident' || customerKind(a) === 'traveler');
  if (near.length) return [near[Math.floor(th(state.seed,house.id,day,hour,'visitor-near')*near.length)]];
  return [spawnGuest(state,house,kind,day,hour)].filter(Boolean);
}

function stockForCustomer(state, house, shop, customer, named) {
  const stock = boxItems(state, house, shop.type);
  // 名のある客は逸品のためなら金に糸目を付けない。
  const purse = named ? Infinity : Math.max(0, Number(customer.money) || 0) * (shop.rep >= 50 ? 2 : 1) * (shop.type === 'prosthetic' ? 3 : 1);
  const offer = named ? stock.filter(isMasterwork) : stock;
  const canBuy = offer.map((item) => ({ ...item, price: shopItemPrice(state,house,item,{named}) })).filter((item) => item.price <= purse);
  if (!canBuy.length) return null;
  if (named) canBuy.sort((a,b)=>b.rank-a.rank || b.price-a.price || a.id.localeCompare(b.id));
  else canBuy.sort((a,b)=>b.price-a.price || a.id.localeCompare(b.id));
  return canBuy[0];
}

function inventoryCount(item) { return Math.max(0, Number(item.n) || 0); }
function takeStock(state, house, chosen) {
  const box = chosen.box;
  if (chosen.gear) { chosen.gear.n -= 1; if (chosen.gear.n <= 0) box.gear = box.gear.filter((g)=>g!==chosen.gear); }
  else if (chosen.dish || DISHES[chosen.id]) { box.dishes[chosen.id] -= 1; if (!box.dishes[chosen.id]) delete box.dishes[chosen.id]; }
  else {
    const field = box.goods && box.goods[chosen.id] > 0 ? box.goods : box.contents;
    if (field) { field[chosen.id] -= 1; if (field[chosen.id] <= 0) delete field[chosen.id]; }
  }
  void state; void house;
}

function addRep(shop, amount) { shop.rep = clamp(shop.rep + amount, 0, 100); }
function recordSoldOut(shop, id, events, state, actor) {
  shop.today.soldOut ||= {};
  shop.today.soldOut[id] = (shop.today.soldOut[id] || 0) + 1;
  addRep(shop, -0.3);
  events?.push(makeEvent(state,'shop', `${actor.name}が品切れで帰った`));
}

function customerArrival(state, house, counter, staff, shop, events, day, hour, serial) {
  const active = house.shopCustomers || [];
  if (active.length >= shopCapacity(state,house)) return;
  const cfg = SHOP_TYPES[shop.type] || SHOP_TYPES.general;
  const expected = shopVisitorExpectation(shop.type,shop.rep);
  let count = Math.floor(expected);
    if (th(state.seed,house.id,day,hour,serial,'visitors') < expected-count) count += 1;
  count = Math.min(count, shopCapacity(state,house)-active.length);
  if (shop.notableToday && !shop.notableClaimed) { count = Math.max(1,count); shop.notableClaimed = true; }
  for (let i=0;i<count;i++) {
    const people = candidatePool(state,house,shop.type,shop.rep,day,hour*8+serial+i,shop);
    const customer = people[0];
    if (!customer) continue;
    customer.shopVisit ||= { houseId: house.id, phase: 'approach', generated: false };
    customer.shopVisit.houseId = house.id; customer.shopVisit.phase = 'approach';
    const named = !!shop.notableToday && !shop.notableUsed;
    const chosen = stockForCustomer(state,house,shop,customer,named);
    if (named && chosen) customer.money = Math.max(Number(customer.money) || 0, chosen.price);
    shop.today.customers += 1;
    if (!shop.firstCustomerLogged) { shop.firstCustomerLogged = true; events?.push(makeEvent(state,'shop',`${house.shop.name || '店'}に最初の客が来た`)); }
    if (named) {
      shop.notableUsed = true;
      customer.shopNotableVisit = { houseId: house.id, day, hook: true };
      events?.push(makeEvent(state,'shop',`${customer.name}が名のある客として店を訪れた`));
    }
    if (!chosen) {
      if (named) events?.push(makeEvent(state,'shop',`${customer.name}は腕150の逸品が見当たらず、黙って帰った`));
      else recordSoldOut(shop,shop.type,events,state,customer);
      const exit = doorPoint(house,2.4);
      customer.shopVisit = { ...customer.shopVisit, houseId:house.id, phase:'leaving', exit };
      customer.shopGoal = { ...exit, houseId:house.id, phase:'exit' };
      active.push({ actorId:customer.id, houseId:house.id, phase:'leaving', startedTick:state.tick, generated:!!customer.shopVisit.generated });
      continue;
    }
    const spot = customerSpot(house,counter);
    const purse = Math.max(0,Number(customer.money)||0)*(shop.rep>=50?2:1)*(shop.type==='prosthetic'?3:1);
    const item = { ...chosen, price: Math.min(chosen.price, Math.floor(purse)) };
    const visit = { houseId:house.id,phase:'approach',generated:!!customer.shopVisit.generated,staffId:staff.id,boxId:chosen.box.id,itemId:chosen.id,rank:chosen.rank,price:item.price,purchaseBudget:purse,good:!!chosen.good,dish:!!chosen.dish,gear:!!chosen.gear,named,startedTick:state.tick,tx:spot.x,tz:spot.z,serial };
    customer.shopVisit = { ...customer.shopVisit, ...visit };
    customer.shopGoal = { x:spot.x,z:spot.z,houseId:house.id,phase:'counter' };
    active.push({ actorId:customer.id, ...visit });
  }
  house.shopCustomers = active;
  house.shopCustomer = active[0] || null;
}

export function forceShopVisitors(state, house, count = 2, kinds = [], opts = {}) {
  if (!state || !house) return [];
  const counter = counterFor(state, house) || house.counter;
  const shop = ensureShop(house, shopTypeForHouse(state, house), state);
  const staff = shopkeeper(state, house, counter || house);
  if (!counter || !staff) return [];
  const day = Math.floor((state.timeSec || 0) / DAY_SEC);
  const hour = Math.floor(((state.timeSec || 0) % DAY_SEC) / 3600);
  const active = house.shopCustomers || [];
  const out = [];
  for (let i = 0; i < Math.min(3, Math.max(0, Math.floor(count))); i++) {
    if (active.length >= shopCapacity(state, house)) break;
    const cfg = SHOP_TYPES[shop.type] || SHOP_TYPES.general;
    const kind = kinds[i] || weightedCustomerKind(cfg.crowd, th(state.seed, house.id, day, hour, i, 'demo-kind'));
    const customer = spawnGuest(state, house, kind, day, hour, i);
    if (!customer) continue;
    const named = !!opts.named && i === 0;
    if (named) { customer.shopNotableVisit = { houseId: house.id, day, hook: true }; shop.notableUsed = true; customer.title = '名のある客'; }
    const chosen = stockForCustomer(state, house, shop, customer, named);
    if (named && chosen) customer.money = Math.max(Number(customer.money) || 0, chosen.price);
    shop.today.customers += 1;
    if (!shop.firstCustomerLogged) shop.firstCustomerLogged = true;
    if (!chosen) {
      if (!named) recordSoldOut(shop, shop.type, [], state, customer);
      const exit = doorPoint(house, 2.4);
      customer.shopVisit = { ...customer.shopVisit, phase: 'leaving', exit };
      customer.shopGoal = { ...exit, houseId: house.id, phase: 'exit' };
      active.push({ actorId: customer.id, houseId: house.id, phase: 'leaving', startedTick: state.tick, generated: true });
      out.push(customer.id);
      continue;
    }
    const spot = customerSpot(house, counter);
    const visit = { houseId: house.id, phase: 'approach', generated: true, staffId: staff.id, boxId: chosen.box.id, itemId: chosen.id, rank: chosen.rank, price: chosen.price, purchaseBudget:Math.max(0,Number(customer.money)||0)*(shop.rep>=50?2:1)*(shop.type==='prosthetic'?3:1), good: !!chosen.good, dish: !!chosen.dish, gear: !!chosen.gear, named, startedTick: state.tick, tx: spot.x, tz: spot.z, serial: i };
    customer.shopVisit = { ...customer.shopVisit, ...visit };
    customer.shopGoal = { x: spot.x, z: spot.z, houseId: house.id, phase: 'counter' };
    active.push({ actorId: customer.id, ...visit });
    out.push(customer.id);
  }
  house.shopCustomers = active;
  house.shopCustomer = active[0] || null;
  shop.today.lastHour = `${day}:${hour}`;
  return out;
}

function finishSale(state, house, shop, visit, customer, staff, events) {
  const box = storageBoxes(state,house).find((b)=>b.id===visit.boxId);
  const chosen = box && boxItems(state,house,shop.type).find((it)=>it.box===box&&it.id===visit.itemId&&(it.rank||1)===(visit.rank||1));
  if (!customer || !staff || !chosen || visit.price > (visit.purchaseBudget ?? Math.max(0,Number(customer.money)||0))) return false;
  takeStock(state,house,chosen);
  const cash=Math.max(0,Number(customer.money)||0), paid=Math.min(cash,visit.price);
  customer.money=cash-paid;
  customer.shopDebt=Math.max(0,Number(customer.shopDebt)||0)+(visit.price-paid);
  staff.money = (staff.money||0)+visit.price;
  shop.today.sales += 1; shop.today.revenue += visit.price;
  const quality = chosen.dish ? 0.5+0.5*Math.min(100,shopSkill(staff,'cooking'))/100 : (chosen.good ? 0.5 : Math.max(0.1,Math.min(1,(chosen.rank||1)/10)));
  addRep(shop,0.05*quality);
  house.shopLastSale = { actorId: customer.id, good: visit.good ? visit.itemId : null, itemId: visit.itemId, tick: state.tick, price: visit.price };
  events?.push(makeEvent(state,'shop',`${customer.name}が${DISHES[visit.itemId]?.name || ITEMS[visit.itemId]?.name || GOODS[visit.itemId]?.name || visit.itemId}を${visit.price} キャッシュで買った`));
  if (chosen.dish?.alcohol || DISHES[visit.itemId]?.alcohol) customer.shopVisit.drunk = true;
  return true;
}

function finishGuest(state, house, customer) {
  if (!customer?.shopVisit) return;
  const visit = customer.shopVisit;
  customer.shopVisit = null; customer.shopGoal = null;
  customer.shopExitGoal = null;
  if (visit.generated) state.actors = state.actors.filter((a)=>a!==customer);
  else if (customer.state !== 'dead' && customer.state !== 'down') customer.shopExitGoal = { ...doorPoint(house,2.4), houseId:house.id, leave:true };
}

function moveShopCustomers(state, house, shop, events) {
  const visits = house.shopCustomers || [];
  const keep = [];
  for (const visit of visits) {
    const actor = (state.actors||[]).find((a)=>a.id===visit.actorId);
    if (!actor || actor.state==='dead' || actor.state==='down') {
      if (actor?.shopCrime?.houseId === house.id && actor.shopCrime.kind === 'dine_dash') { keep.push(visit); continue; }
      if(actor) {
        if(actor.state==='dead'&&!actor.shopDeathRepApplied&&Math.hypot(actor.x-house.door.x,actor.z-house.door.z)<=5){addRep(shop,-8);actor.shopDeathRepApplied=true;events?.push(makeEvent(state,'shop',`${actor.name}が店の前で倒れ、評判が下がった`));}
        else if(actor.state!=='dead'&&!actor.shopTheftRecovered)addRep(shop,-1);
        finishGuest(state,house,actor);
      }
      continue;
    }
    if (visit.phase === 'leaving') {
      const exit=actor.shopVisit?.exit||doorPoint(house,2.4);
      if(!houseAt(state,actor.x,actor.z,0.05)&&Math.hypot(actor.x-exit.x,actor.z-exit.z)<=1&&actor.shopCrime?.kind==='dine_dash') { actor.shopGoal=null;actor.shopExitGoal=null;keep.push(visit); }
      else if(!houseAt(state,actor.x,actor.z,0.05)&&Math.hypot(actor.x-exit.x,actor.z-exit.z)<=1) finishGuest(state,house,actor);
      else { actor.shopGoal=null;actor.shopExitGoal={...exit,houseId:house.id,leave:true};keep.push(visit); }
      continue;
    }
    if (visit.phase === 'staff-challenge') {
      if (state.tick < (visit.challengeUntilTick || state.tick)) { keep.push(visit); continue; }
      addRep(shop,-1);
      events?.push(makeEvent(state,'shop',`${actor.name}は店内で挑戦を待ったが、30秒後に帰った（評判 −1）`));
      actor.shopVisit.phase='leaving'; actor.shopVisit.exit=doorPoint(house,2.4); actor.shopGoal=null;
      actor.shopExitGoal={...actor.shopVisit.exit,houseId:house.id,leave:true};
      keep.push({...visit,phase:'leaving'});
      continue;
    }
    if (visit.phase === 'brawl') { keep.push(visit); continue; }
    const dist=Math.hypot(visit.tx-actor.x,visit.tz-actor.z);
    if(dist<=0.95) {
      const staff=(state.actors||[]).find((a)=>a.id===visit.staffId)||shopkeeper(state,house,counterFor(state,house)||house.counter||house);
      const success=finishSale(state,house,shop,visit,actor,staff,events);
      if(success) {
        if(th(state.seed,house.id,visit.day||shop.today.day,visit.hour||0,visit.serial,'dine-dash') < Math.max(0.005,SHOP_TUNING.dineAndDashChance*(1-shop.rep/140)) * (playerStaff(state,house,'guard')?0.5:1)) {
          visit.phase='leaving'; actor.shopVisit.phase='leaving'; actor.shopVisit.stolenPrice=visit.price; actor.shopVisit.criminal=true;
          actor.shopVisit.exit=doorPoint(house,12); actor.shopRun=true;
          events?.push(makeEvent(state,'shop',`${actor.name}が金を払わずに逃げた！`));
          actor.money += visit.price; staff.money = Math.max(0,(staff.money||0)-visit.price);
          actor.shopCrime = { houseId:house.id, amount:visit.price, kind:'dine_dash', sinceTick:state.tick, recoverUntilTick:state.tick+SHOP_TUNING.customerGiveUpTicks };
          actor.shopGoal=null;actor.shopExitGoal={...actor.shopVisit.exit,houseId:house.id,leave:true};
          keep.push(visit);
        } else {
          if (visit.generated) {
            actor.shopVisit.phase='leaving'; actor.shopVisit.exit=doorPoint(house,2.4); actor.shopGoal=null;actor.shopExitGoal={...actor.shopVisit.exit,houseId:house.id,leave:true};
            keep.push({ ...visit, phase:'leaving' });
          } else finishGuest(state,house,actor);
        }
      } else {
        addRep(shop,-1); events?.push(makeEvent(state,'shop',`${actor.name}は支払いができず店を出た`));
        actor.shopVisit.phase='leaving'; actor.shopVisit.exit=doorPoint(house,2.4); actor.shopGoal=null;actor.shopExitGoal={...actor.shopVisit.exit,houseId:house.id,leave:true};
        keep.push({ ...visit, phase:'leaving' });
      }
    } else if(state.tick-(visit.startedTick||0)>SHOP_TUNING.customerGiveUpTicks||!isPublic(state,house)) {
      addRep(shop,-0.5); actor.shopVisit.phase='leaving'; actor.shopVisit.exit=doorPoint(house,2.4); actor.shopGoal=null;actor.shopExitGoal={...actor.shopVisit.exit,houseId:house.id,leave:true};
      events?.push(makeEvent(state,'shop',`${actor.name}は待ちきれずに帰った`)); keep.push({ ...visit, phase:'leaving' });
    } else { actor.shopGoal={x:visit.tx,z:visit.tz,houseId:house.id,phase:'counter'}; keep.push(visit); }
  }
  house.shopCustomers=keep; house.shopCustomer=keep[0]||null;
}

function updateShopSecurity(state, house, shop, events) {
  const criminals = (state.actors || []).filter((a) => a.shopCrime?.houseId === house.id && a.shopCrime.kind === 'dine_dash');
  const guard = assignedGuard(state, house);
  for (const thief of criminals) {
    const crime = thief.shopCrime;
    if (!Number.isFinite(crime.recoverUntilTick)) crime.recoverUntilTick = (crime.sinceTick || state.tick) + SHOP_TUNING.customerGiveUpTicks;
    if (thief.state === 'down' || thief.state === 'dead') {
      const hitter = (state.actors || []).find((a) => a.id === thief.lastAttackerId && a.faction === 'player' && a.state !== 'dead');
      const rescuer = hitter || (guard && Math.hypot(guard.x-thief.x,guard.z-thief.z) <= 18 ? guard : null);
      if (rescuer && rescueShopTheft(state, thief, rescuer, events)) {
        thief.shopRun = false;
        if (thief.shopVisit) thief.shopVisit.phase = 'leaving';
        thief.shopGoal = { ...doorPoint(house, 2.4), houseId:house.id, phase:'exit' };
        if (guard?.targetId === thief.id) guard.targetId = null;
        continue;
      }
    } else if (guard) {
      guard.moveTo = null;
      guard.targetId = thief.id;
      guard.state = 'fight';
      thief.shopRun = true;
      if (thief.targetId == null) thief.targetId = guard.id;
    }
    if (state.tick < crime.recoverUntilTick) continue;
    addRep(shop, -1);
    events?.push(makeEvent(state, 'shop', `${thief.name}の持ち逃げは取り返せなかった（評判 −1）`));
    delete thief.shopCrime;
    thief.shopRun = false;
    if (thief.shopVisit) thief.shopVisit.phase = 'leaving';
    thief.shopGoal = { ...doorPoint(house, 2.4), houseId:house.id, phase:'exit' };
    if (guard?.targetId === thief.id) guard.targetId = null;
  }
}

function startBrawl(state,house,shop,a,b,events,force=false) {
  const door=house.door||house, out=doorPoint(house,4);
  const squadMembers=(actor)=>{
    const members=(state.actors||[]).filter((o)=>o.id===actor.id || (actor.squadId!=null&&o.squadId===actor.squadId&&o.shopVisit?.houseId===house.id));
    return members.filter((m)=>m===actor || m.squadLeader || m.isLeader || th(state.seed,house.id,actor.id,m.id,'join-brawl')<0.6);
  };
  const sideA=squadMembers(a),sideB=squadMembers(b);
  for(const [side,opponent] of [[sideA,b],[sideB,a]]) for(const member of side){
    member.shopBrawlHouse=house.id; member.shopBrawlId=opponent.id; member.shopVisit ||= {houseId:house.id,phase:'brawl'}; member.shopVisit.phase='brawl';
    member.shopExitGoal={x:out.x+(member.id%3-1)*0.55,z:out.z+(member.id%2)*0.55,opponentId:opponent.id,houseId:house.id};
    house.shopCustomers ||= [];
    let visit=house.shopCustomers.find((v)=>v.actorId===member.id);
    if(!visit){visit={actorId:member.id,houseId:house.id,phase:'brawl',generated:!!member.shopVisit.generated};house.shopCustomers.push(visit);}
    visit.phase='brawl';
  }
  a.shopBrawlSide='a'; b.shopBrawlSide='b';
  const opener=actorNum(a,'attack')>=actorNum(b,'attack')?a:b;
  const answer=opener===a?b:a;
  const line=(list,actor,other,key)=>{ const idx=Math.floor(th(state.seed,house.id,state.tick,actor.id,key)*list.length); actor.shopBark={text:list[idx],untilTick:state.tick+30}; };
  line(shopLines.challenge,opener,answer,'challenge'); line(shopLines.answer,answer,opener,'answer');
  shop.lastBrawlHour=Math.floor(state.timeSec/3600);
  events?.push(makeEvent(state,'shop',`${opener.name}と${answer.name}が表へ出た`));
  if(!force) {
    const watched=(state.actors||[]).filter((o)=>o.shopVisit?.houseId===house.id&&o!==a&&o!==b&&!sideA.includes(o)&&!sideB.includes(o));
    if(watched.length&&shop.today.observedFights<3){shop.today.observedFights+=1;addRep(shop,1);for(const w of watched){const lineIdx=Math.floor(th(state.seed,house.id,state.tick,w.id,'watch-line')*shopLines.watch.length);w.shopBark={text:shopLines.watch[lineIdx],untilTick:state.tick+30};}}
  }
  return {a:a.id,b:b.id,houseId:house.id};
}

function startStaffChallenge(state,house,shop,customer,staff,events,force=false) {
  if (!customer || !staff || customer.shopVisit?.houseId !== house.id || customer.shopVisit.phase === 'leaving') return false;
  if (!force && th(state.seed,house.id,Math.floor(state.timeSec/3600),customer.id,staff.id,'staff-shop-challenge') >= SHOP_TUNING.shopBrawlBaseChance * (playerStaff(state,house,'guard') ? 0.5 : 1)) return false;
  const until=state.tick+300;
  customer.shopVisit.phase='staff-challenge'; customer.shopVisit.challengeUntilTick=until;
  customer.shopBark={text:shopLines.challenge[Math.floor(th(state.seed,house.id,state.tick,customer.id,'staff-challenge-line')*shopLines.challenge.length)],untilTick:state.tick+30};
  staff.shopBark={text:shopLines.staff[Math.floor(th(state.seed,house.id,state.tick,staff.id,'staff-answer-line')*shopLines.staff.length)],untilTick:state.tick+30};
  const visit=(house.shopCustomers||[]).find((entry)=>entry.actorId===customer.id);
  if (visit) { visit.phase='staff-challenge'; visit.challengeUntilTick=until; }
  events?.push(makeEvent(state,'shop',`${customer.name}が店の者に表へ出ろと挑んだ。店内に留まり、30秒後に帰る`));
  return true;
}

function updateBrawls(state,house,shop,events,hour) {
  if(shop.lastBrawlHour===hour) return;
  shop.lastBrawlHour=hour;
  const visitors=(state.actors||[]).filter((a)=>a.shopVisit?.houseId===house.id&&a.shopVisit.phase!=='leaving'&&a.state!=='dead'&&a.state!=='down'&&houseAt(state,a.x,a.z,0.05)===house);
  for(let i=0;i<visitors.length;i++)for(let j=i+1;j<visitors.length;j++){
    const a=visitors[i],b=visitors[j]; if(!isHostile(state,a,b))continue;
    const diff=Math.abs(actorNum(a,'attack')-actorNum(b,'attack'));
    const alcohol=(a.shopVisit.drunk||b.shopVisit.drunk)?SHOP_TUNING.cookingAlcoholBrawlFactor:1;
    const guard=playerStaff(state,house,'guard')?0.5:1;
    const nemesis=(customerKind(a)==='bounty_hunter'&&customerKind(b)==='thief'||customerKind(b)==='bounty_hunter'&&customerKind(a)==='thief')?2:1;
    const p=clamp(SHOP_TUNING.shopBrawlBaseChance*alcohol*(1+diff/100)*guard*nemesis,0,0.8);
    if(th(state.seed,house.id,hour,a.id,b.id,'shop-brawl')<p){startBrawl(state,house,shop,a,b,events);return;}
  }
  const staff=[shopkeeper(state,house,counterFor(state,house)||house.counter||house),playerStaff(state,house,'cook'),playerStaff(state,house,'guard')].filter((actor,index,list)=>actor&&list.indexOf(actor)===index);
  for (const customer of visitors) for (const worker of staff) if (isHostile(state,customer,worker)&&startStaffChallenge(state,house,shop,customer,worker,events)) return;
}

function updateBrawlReturns(state,house) {
  for (const actor of state.actors || []) {
    if (actor.shopBrawlHouse !== house.id || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup' || actor.targetId != null || actor.waitTargetId != null || actor.shopExitGoal || actor.shopReturnGoal) continue;
    if (actor.state === 'fight') continue;
    actor.shopReturnGoal = { houseId:house.id, phase:'outside' };
  }
}

function updateDailyIncome(state) {
  const day=Math.floor((state.timeSec||0)/DAY_SEC), hour=((state.timeSec||0)%DAY_SEC)/3600;
  if(hour<6||hour>=7||state.town.incomeDay===day)return;
  state.town.incomeDay=day;
  for(const actor of state.actors||[]){
    const nearTown = WORLD_LAYOUT.towns.some((town)=>Math.hypot(actor.x-town.x,actor.z-town.z)<=250);
    if(actor.faction==='player'||actor.state==='dead'||(!actor.home&&!actor.townId&&!actor.settlementId&&!actor.shopVisit&&!nearTown))continue;
    if(actor.lastShopIncomeDay===day)continue;
    const kind=customerKind(actor), wealth=Number(WORLD_LAYOUT.towns.find((p)=>p.id===actor.townId)?.wealth ?? 0.5);
    const job=actor.job||actor.settlementRole||kind;
    const caps={shopkeeper:1500,merchant:1500,caravan:1200,guard:1000,post_guard:1000,mercenary:900,bounty_hunter:900,hunter:700,farmer:500,resident:300,thief:500};
    const cap=caps[job]||caps[kind]||500;
    const income=Math.round(clamp(20+60*clamp(wealth,0,1)+th(state.seed,actor.id,day,'income')*20,20,80));
    const debt=Math.max(0,Number(actor.shopDebt)||0), repayment=Math.min(debt,income);
    actor.shopDebt=debt-repayment;
    actor.money=Math.min(cap,Math.max(0,Number(actor.money)||0)+income-repayment);
    actor.lastShopIncomeDay=day;
  }
}

export function updateShops(state, events = []) {
  if(!state?.town?.houses)return;
  updateDailyIncome(state);
  const day=Math.floor((state.timeSec||0)/DAY_SEC), hourAbs=Math.floor((state.timeSec||0)/3600), hour=Math.floor(((state.timeSec||0)%DAY_SEC)/3600);
  for(const house of state.town.houses){
    const counter=counterFor(state,house);
    if(!counter) { if(house.shop) house.shop.open=false; continue; }
    const type=shopTypeForHouse(state,house), shop=ensureShop(house,type,state);
    startDay(state,house,shop,day);
    const wasOpen = !!shop.open;
    const staff=shopkeeper(state,house,counter);
    const open=!!house.public&&!shopClosed(state)&&!!staff&&!!isPublic(state,house);
    shop.open=open;
    shop.reason=!house.public?'非公開':shopClosed(state)?'営業時間外':!staff?'店番がいない':'営業中';
    shop.staff={keeper:!!staff,cook:!!playerStaff(state,house,'cook'),guard:!!playerStaff(state,house,'guard')};
    shop.type=type;
    const guard = assignedGuard(state, house);
    if (guard && guard.targetId == null && !guard.moveTo && !guard.townTask) {
      const post = doorPoint(house, -0.75);
      guard.moveTo = { x:post.x, z:post.z };
    }
    if (open && !wasOpen && house.owner === 'player') events?.push(makeEvent(state,'shop',`${house.shop.name || SHOP_TYPES[type]?.name || '店'}が開店した`));
    updateShopSecurity(state, house, shop, events);
    updateBrawlReturns(state,house);
    moveShopCustomers(state,house,shop,events);
    if (!open) { house.shopCustomer = null; house.shopCustomerUntilTick = null; }
    else if (house.shopCustomerUntilTick != null && state.tick >= house.shopCustomerUntilTick) { house.shopCustomer = null; house.shopCustomerUntilTick = null; }
    const customers=house.shopCustomers||[];
    if(!open||house.owner!=='player')continue;
    const hourKey=`${day}:${hour}`;
    if(shop.today.lastHour===hourKey) { updateBrawls(state,house,shop,events,hourAbs); continue; }
    shop.today.lastHour=hourKey;
    if(customers.length<shopCapacity(state,house)) customerArrival(state,house,counter,staff,shop,events,day,hour,shop.today.customers);
    if(!house.shopCustomer&&house.shopLastSale?.tick===state.tick){house.shopCustomer={actorId:house.shopLastSale.actorId,phase:'sold'};house.shopCustomerUntilTick=state.tick+1;}
    updateBrawls(state,house,shop,events,hourAbs);
    // むせび泣く債務者でなく、盗賊や敵対勢力だけが店荒らしを試みる。
    if(Math.floor((state.timeSec||0)/DAY_SEC)===day && th(state.seed,house.id,day,'ransack')<SHOP_TUNING.shopRansackDailyChance){
      const raider=(state.actors||[]).find((a)=>a.shopVisit?.houseId===house.id&&(customerKind(a)==='thief'||a.faction!=='player'&&state.factionHostile?.[a.faction])&&!a.shopRaider);
      if(raider){raider.shopRaider=true;raider.shopVisit.phase='raiding';raider.shopCrime={houseId:house.id,amount:0,kind:'ransack',sinceTick:state.tick};events.push(makeEvent(state,'shop',`${raider.name}が店を荒らし始めた`));if(shop.staff.guard){raider.shopExitGoal={...doorPoint(house,4),houseId:house.id,raider:true};raider.shopVisit.phase='raiding-exit';}else {const stock=boxItems(state,house,type)[0];if(stock){takeStock(state,house,stock);raider.shopVisit.phase='leaving';raider.shopVisit.exit=doorPoint(house,4);raider.shopGoal={...raider.shopVisit.exit,houseId:house.id,phase:'exit'};}}}
    }
  }
}

export function shopState(state, houseId = null) {
  const houses=(state?.town?.houses||[]).filter((h)=>houseId==null?h.owner==='player':h.id===houseId);
  const house=houses[0]; if(!house)return null;
  const counter=counterFor(state,house), type=shopTypeForHouse(state,house), shop=ensureShop(house,type,state), staff=shopkeeper(state,house,counter||house.counter||house);
  const stock=boxItems(state,house,type).map((i)=>({id:i.id,name:DISHES[i.id]?.name||ITEMS[i.id]?.name||GOODS[i.id]?.name||i.id,count:i.n,rank:i.rank||1,price:shopItemPrice(state,house,i)}));
  const open=!!house.public&&!shopClosed(state)&&!!counter&&!!staff;
  return {houseId:house.id,type,rep:shop.rep,open,reason:!house.public?'非公開':shopClosed(state)?'閉店':!counter?'店台がない':!staff?'店番がいない':'営業中',today:shop.today||{customers:0,sales:0,revenue:0,soldOut:{}},yesterday:shop.yesterday||null,stock,soldOut:shop.today?.soldOut||{},staff:{keeper:!!staff,cook:!!playerStaff(state,house,'cook'),guard:!!playerStaff(state,house,'guard')},customers:(house.shopCustomers||[]).map((v)=>v.actorId),capacity:shopCapacity(state,house)};
}

export function setShopRep(state, rep, houseId = null) {
  const house=houseId?houseById(state,houseId):(state.town?.houses||[]).find((h)=>h.owner==='player');
  if(!house)return false;
  ensureShop(house,null,state).rep=clamp(Number(rep)||0,0,100);
  return true;
}

export function isShopNeutralPair(state, a, b) {
  if(!a||!b)return false;
  const ha=houseAt(state,a.x,a.z,0.05), hb=houseAt(state,b.x,b.z,0.05);
  const brawlHouse = a.shopBrawlHouse && a.shopBrawlHouse === b.shopBrawlHouse ? houseById(state, a.shopBrawlHouse) : null;
  if (brawlHouse && (ha === brawlHouse || hb === brawlHouse)) return true;
  if(!ha||ha!==hb||!(ha.type==='shop'||ha.shop)||!isPublic(state,ha))return false;
  if(a.shopFightBackId===b.id||b.shopFightBackId===a.id||a.shopCrime||b.shopCrime)return false;
  return true;
}

export function noteManualShopAttack(state, attacker, target, events = []) {
  if(!attacker||!target)return false;
  const h=houseAt(state,attacker.x,attacker.z,0.05), other=houseAt(state,target.x,target.z,0.05);
  if(!h||h!==other||!h.shop)return false;
  if(attacker.faction==='player'&&target.shopVisit?.houseId===h.id){
    const shop=ensureShop(h,shopTypeForHouse(state,h),state);
    const staff=['shopkeeper','cook','guard'].some((job)=>attacker.jobs?.primary===job||attacker.jobs?.secondary===job);
    const penalty=staff?20:5;
    addRep(shop,-penalty);
    shop.repelled[target.faction]=Math.floor((state.timeSec||0)/DAY_SEC)+SHOP_TUNING.houseRepelledGuestDays;
    target.shopFightBackId=attacker.id;attacker.shopFightBackId=target.id;
    target.targetId=attacker.id;target.state='fight';
    events.push(makeEvent(state,'shop',staff?'店の係が客を襲った（評判 −20、同じ勢力は7日来店停止）':'店内で客との中立が破られた（評判 −5）'));
  }
  return true;
}

export function shopTrespassAllowed(state, house, actor) {
  if(!house||!actor)return true;
  if(house.owner==='player'&&actor.faction==='player')return true;
  if(actor.home===house.id)return true;
  if(house.owner==='player'&&actor.faction==='player')return true;
  if(!isPublic(state,house))return false;
  const zone=shopZoneAt(state,house,actor.x,actor.z);
  if(zone==='private')return false;
  return true;
}

export function shopZoneAt(state, house, x, z) {
  if(!house||!Number.isFinite(x)||!Number.isFinite(z))return null;
  const counter=counterFor(state,house)||house.counter;
  if(!counter)return null;
  const da=x-house.x,dz=z-house.z;
  const v=house.depth/2-0.13-(da*(house.nx||0)+dz*(house.nz||0));
  const ca=counter.x-house.x,cz=counter.z-house.z;
  const counterV=house.depth/2-0.13-(ca*(house.nx||0)+cz*(house.nz||0));
  const localA=da*(house.ux||0)+dz*(house.uz||0);
  if(Math.abs(localA)>house.len/2-0.18)return null;
  const boundary=counterV+0.55;
  house.zones=[
    {kind:'public',rect:{aMin:-house.len/2+0.18,aMax:house.len/2-0.18,vMin:0,vMax:boundary}},
    {kind:'private',rect:{aMin:-house.len/2+0.18,aMax:house.len/2-0.18,vMin:boundary,vMax:house.depth}},
  ];
  return v>boundary?'private':'public';
}

export function rescueShopTheft(state, thief, target, events = []) {
  if(!thief?.shopCrime||thief.shopCrime.kind!=='dine_dash'||!target||target.faction!=='player')return false;
  const amount=Math.min(thief.money||0,thief.shopCrime.amount||0);
  thief.money-=amount;
  target.money=(target.money||0)+amount;
  if(amount)events.push(makeEvent(state,'shop',`${target.name}が逃げた代金 ${amount} キャッシュを取り返した`));
  thief.shopTheftRecovered = amount > 0;
  delete thief.shopCrime;
  return amount>0;
}

export function forceDineAndDash(state, house, actor, events = []) {
  if(!house||!actor)return false;
  const shop=ensureShop(house,null,state), visit=(house.shopCustomers||[]).find((v)=>v.actorId===actor.id);
  if(!visit)return false;
  const amount=visit.price||50;
  if(!actor.shopCrime) actor.money=(actor.money||0)+amount;
  visit.phase='leaving';actor.shopVisit ||= {houseId:house.id};actor.shopVisit.phase='leaving';actor.shopVisit.criminal=true;actor.shopVisit.stolenPrice=amount;actor.shopVisit.exit=doorPoint(house,12);actor.shopCrime={houseId:house.id,amount,kind:'dine_dash',sinceTick:state.tick,recoverUntilTick:state.tick+SHOP_TUNING.customerGiveUpTicks};actor.shopRun=true;actor.shopGoal=null;actor.shopExitGoal={...actor.shopVisit.exit,houseId:house.id,leave:true};
  events.push(makeEvent(state,'shop',`${actor.name}が金を払わずに逃げた！`));void shop;return true;
}

export function forceShopFight(state, house, a, b, events = []) {
  const shop=ensureShop(house,null,state), spot=customerSpot(house,counterFor(state,house)||house.counter||house);
  for(const actor of [a,b])if(actor){actor.x=spot.x;actor.z=spot.z;actor.shopGoal=null;actor.shopExitGoal=null;}
  return startBrawl(state,house,shop,a,b,events,true);
}

export function forceShopStaffChallenge(state, house, customer, staff, events = []) {
  const shop=ensureShop(house,null,state);
  return startStaffChallenge(state,house,shop,customer,staff,events,true);
}

export function shopBenchPosition(house, a = 0, v = 1.5) { return localToWorld(house,a,v); }

