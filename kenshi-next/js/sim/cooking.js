// 食堂の最小限の仕込み。乱数や時刻 API に頼らず、state と seed だけで進む。
import { GOODS } from './trade.js';
import { ensureOutposts } from './outposts.js';
import { BUILDINGS } from '../data/buildings.js';

export const DISHES = Object.freeze({
  porridge: { name: '粥', materials: { grain: 1, water: 1 }, skill: 0 },
  roast_meat: { name: '焼き肉', materials: { dried_meat: 1 }, skill: 0 },
  salted_rice: { name: '塩むすび', materials: { grain: 1, salt: 1 }, skill: 10 },
  stew: { name: '肉と穀物の煮込み', materials: { dried_meat: 1, grain: 1, water: 1 }, skill: 25 },
  sweet_dumpling: { name: '甘い団子', materials: { grain: 2, cactus_rum: 1 }, skill: 50, alcohol: true },
});

export function cookingPct(level) { return Math.min(100, Math.max(0, Number(level) || 0)) / 100; }
export function cookingMultiplier(level) {
  const l = Math.max(0, Number(level) || 0);
  return 1.6 + 0.8 * cookingPct(l) + 0.4 * Math.max(0, l - 100) / 155;
}

function houseBoxes(state, house) {
  if (house?.boxes?.length) return (state.town?.boxes || []).filter((box) => house.boxes.includes(box.id));
  return ensureOutposts(state).pieces.filter((piece) => piece.type === 'storage_box' && piece.state === 'done' && piece.houseId === house?.id);
}

function countGood(boxes, id) { return boxes.reduce((n, box) => n + Math.max(0, Number(box.goods?.[id]) || 0) + Math.max(0, Number(box.contents?.[id]) || 0), 0); }
function takeGood(boxes, id, amount) {
  let left = amount;
  for (const box of boxes) {
    for (const field of ['goods', 'contents']) {
      const take = Math.min(left, Math.max(0, Number(box[field]?.[id]) || 0));
      if (!take) continue;
      box[field][id] -= take; left -= take;
      if (!left) return true;
    }
  }
  return left === 0;
}
function bestRecipe(level, boxes) {
  return Object.entries(DISHES).filter(([, dish]) => level >= dish.skill && Object.entries(dish.materials).every(([id, n]) => countGood(boxes, id) >= n))
    .sort((a, b) => b[1].skill - a[1].skill || a[0].localeCompare(b[0]))[0] || null;
}
function cookingBench(state, house) {
  const pieces = ensureOutposts(state).pieces.filter((p) => p.houseId === house.id && p.state === 'done' && ['stove', 'kitchen'].includes(p.type));
  return pieces.sort((a, b) => (a.type === 'kitchen' ? -1 : 0) - (b.type === 'kitchen' ? -1 : 0) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))[0] || null;
}
function growCooking(actor) {
  actor.skills ||= {};
  const current = Math.max(0, Math.min(255, Number(actor.skills.cooking) || 0));
  actor.skills.cooking = Math.min(255, current + 0.5 * (1 - current / 255));
}

export function updateCooking(state) {
  if (!state?.town) return;
  const pieces = ensureOutposts(state).pieces;
  for (const house of state.town.houses) {
    if (house.owner !== 'player') continue;
    const bench = cookingBench(state, house);
    if (!bench) continue;
    const boxes = houseBoxes(state, house);
    if (!boxes.length) continue;
    const cook = (state.actors || []).filter((actor) => actor.faction === 'player' && actor.state !== 'dead' && actor.state !== 'down' &&
      (actor.jobs?.primary === 'cook' || actor.jobs?.secondary === 'cook') &&
      Math.abs(actor.x - house.x) < house.w / 2 && Math.abs(actor.z - house.z) < house.d / 2)
      .sort((a, b) => Number(a.id) - Number(b.id))[0];
    if (!cook) continue;
    cook.skills ||= {};
    if (Math.hypot(cook.x - bench.x, cook.z - bench.z) > 3) {
      if (!cook.moveTo && !cook.targetId && !cook.townTask) cook.moveTo = { x: bench.x, z: bench.z };
      cook.cookTask = null;
      continue;
    }
    if (cook.moveTo) cook.moveTo = null;
    let task = cook.cookTask;
    if (!task || task.houseId !== house.id || task.benchId !== bench.id) {
      const picked = bestRecipe(Number(cook.skills.cooking) || 0, boxes);
      if (!picked) { cook.cookTask = null; continue; }
      const [dishId, dish] = picked;
      task = { houseId: house.id, benchId: bench.id, dishId, progress: 0, workTicks: Math.ceil(400 * (1 - 0.3 * cookingPct(cook.skills.cooking))) };
      cook.cookTask = task;
    }
    task.progress += 1;
    if (task.progress < task.workTicks) continue;
    const dish = DISHES[task.dishId];
    if (!dish || !Object.entries(dish.materials).every(([id, n]) => countGood(boxes, id) >= n)) { cook.cookTask = null; continue; }
    for (const [id, n] of Object.entries(dish.materials)) takeGood(boxes, id, n);
    const box = boxes.find((item) => item.house === house.id) || boxes[0];
    box.dishes ||= {};
    box.dishes[task.dishId] = (box.dishes[task.dishId] || 0) + 1;
    growCooking(cook);
    cook.cookTask = null;
    state.shopHooks ||= {};
    state.shopHooks.cookingMilestones ||= {};
    for (const milestone of [100, 150, 200]) if (cook.skills.cooking >= milestone && !state.shopHooks.cookingMilestones[`${cook.id}:${milestone}`]) {
      state.shopHooks.cookingMilestones[`${cook.id}:${milestone}`] = true;
      if (house.shop) house.shop.rep = Math.min(100, (house.shop.rep || 10) + ({ 100: 5, 150: 5, 200: 10 })[milestone]);
    }
    if (cook.skills.cooking >= 150 && bench.type === 'kitchen') bench.parallelCooks = 2;
    void pieces; void BUILDINGS; void GOODS;
  }
}

