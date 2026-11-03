// 盗賊の物取りと人さらい。

import {
  CARRY_RANGE,
  LOOT_TICKS,
  LOOT_SAFE_DIST,
  isHostile,
  distBetween,
  indexActors,
  makeEvent,
} from './data.js';
import { CAMP } from './world.js';
import { chance } from './rng.js';
import { noteTheft } from './spawning.js';
import { drop, pickup } from './carry.js';
import { normalizeKits } from './medkit.js';
import { ITEMS } from './items.js';
import { ensureOrigins, syncWeapon, ensureInventoryLayout, inventoryGrid } from './inventory.js';
import { itemSize } from '../data/item_sizes.js';

function isStanding(actor) {
  return actor.state === 'idle' || actor.state === 'move' || actor.state === 'fight';
}

function hostileNear(state, actor, radius) {
  for (const other of state.actors) {
    if (other.id === actor.id) continue;
    if (!isStanding(other)) continue;
    if (!isHostile(state, actor, other)) continue;
    if (distBetween(actor, other) <= radius) return true;
  }
  return false;
}

function clearLoot(actor) {
  actor.lootTargetId = null;
  actor.lootTicks = 0;
}

// 盗賊（ランダム出現のこそ泥）は食料も盗む。カニさんの決め: 食料→（装飾品→武器→その他、はまだ無い）→cash の順。
function isThief(actor) {
  return !!actor && actor.spawnKind === 'thieves';
}

function lootableVictim(other, actor) {
  if (other.faction !== 'player') return false;
  if (other.state !== 'down') return false;
  if (other.carriedBy !== null) return false;
  if (other.bound || other.abducted) return false;
  if (!Array.isArray(other.lootedBy)) other.lootedBy = [];
  if (other.lootedBy.length > 0) return false;
  if ((other.money || 0) <= 0 && !(isThief(actor) && (other.food || 0) > 0)) return false;
  return true;
}

export function updateLootGoals(state) {
  for (const actor of state.actors) {
    if (actor.faction !== 'bandit') continue;
    if (actor.spawnKind === 'cannibals') continue; // 人喰いは奪わず、杭へ運ぶ（abduct.js）
    if (actor.isPlayer) continue;
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') {
      clearLoot(actor);
      continue;
    }
    if (actor.carryingId !== null || actor.carryHome) continue;
    if (actor.targetId !== null) {
      clearLoot(actor);
      continue;
    }
    if ((actor.fleeUntil || 0) > state.tick) {
      clearLoot(actor);
      continue;
    }

    if (actor.lootTargetId !== null) {
      const current = state.actors.find((other) => other.id === actor.lootTargetId);
      if (!current || !lootableVictim(current, actor)) clearLoot(actor);
      else continue;
    }

    if (hostileNear(state, actor, LOOT_SAFE_DIST)) continue;

    let best = null;
    let bestDist = Infinity;
    for (const other of state.actors) {
      if (other.id === actor.id) continue;
      if (!lootableVictim(other, actor)) continue;
      const d = distBetween(actor, other);
      if (d > 50) continue;
      if (d < bestDist || (d === bestDist && best && other.id < best.id)) {
        best = other;
        bestDist = d;
      }
    }
    if (best) {
      actor.lootTargetId = best.id;
      actor.lootTicks = 0;
    }
  }
}

export function updateLoot(state, events) {
  const byId = indexActors(state);
  for (const actor of state.actors) {
    if (actor.faction !== 'bandit') continue;
    if (actor.spawnKind === 'cannibals') continue; // 人喰いは奪わず、杭へ運ぶ（abduct.js）
    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') {
      clearLoot(actor);
      continue;
    }

    if (actor.carryingId !== null) {
      if (!actor.carryHome) continue;
      const target = byId.get(actor.carryingId);
      if (!target || target.carriedBy !== actor.id) {
        actor.carryHome = false;
        clearLoot(actor);
        continue;
      }
      const home = actor.spawnHome || CAMP;
      const d = Math.hypot(home.x - actor.x, home.z - actor.z);
      if (d <= 4) {
        drop(state, actor, events);
        actor.carryHome = false;
        clearLoot(actor);
      }
      continue;
    }

    if (actor.lootTargetId === null) continue;
    const target = byId.get(actor.lootTargetId);
    if (!target || !lootableVictim(target, actor)) {
      clearLoot(actor);
      continue;
    }
    if (hostileNear(state, actor, 10)) {
      clearLoot(actor);
      continue;
    }
    const d = distBetween(actor, target);
    if (d > CARRY_RANGE) {
      actor.lootTicks = 0;
      continue;
    }

    actor.lootTicks += 1;
    if (actor.lootTicks < LOOT_TICKS) continue;

    let food = 0;
    if (isThief(actor)) {
      food = target.food || 0;
      target.food = 0;
      actor.food = (actor.food || 0) + food;
    }
    const amount = target.money || 0;
    target.money = 0;
    // 手当ての道具も持っていく（売り物の箱は商人の荷として残す）
    const kits = normalizeKits(target);
    if (kits.length > 0) {
      normalizeKits(actor).push(...kits);
      target.kits = [];
    }
    if (!Array.isArray(target.lootedBy)) target.lootedBy = [];
    target.lootedBy.push(actor.id);
    if (!Array.isArray(actor.lootedBy)) actor.lootedBy = [];
    actor.lootedBy.push(target.id);
    actor.money = (actor.money || 0) + amount;
    if (isThief(actor)) {
      const what = [food > 0 ? '食料' + food + 'つ' : '', amount > 0 ? 'キャッシュ ' + amount : ''].filter(Boolean).join('と');
      events.push(makeEvent(state, 'loot', actor.name + 'が' + target.name + 'から' + (what || '何か') + 'を盗んだ'));
      clearLoot(actor);
      noteTheft(state, actor); // 盗んだら一団で逃げる（人さらいはしない）
      continue;
    }
    if (amount > 0) {
      events.push(makeEvent(state, 'loot', actor.name + 'が' + target.name + 'のキャッシュを奪った'));
    }
    clearLoot(actor);

    if (target.state === 'down' && chance(state, 0.3)) {
      if (pickup(state, actor, target, events)) {
        actor.carryHome = true;
        events.push(makeEvent(state, 'kidnap', actor.name + 'が' + target.name + 'をさらった'));
      }
    }
  }
}


// ── 仲間の「あさる」（プレイヤーの命令） ──
// 命令は対象への接近だけ。品物は画面の個別操作か「全部取る」でのみ移す。
export const PLAYER_LOOT_TICKS = 15; // 1.5秒
function lootBodyValid(actor, target) {
  if (!target || target.id === actor.id || target.faction === 'player') return false;
  if (target.state !== 'down' && target.state !== 'dead') return false;
  return target.carriedBy === null || target.carriedBy === undefined;
}

function clearPlayerLoot(actor) {
  actor.lootBodyId = null;
  actor.lootBodyTicks = 0;
}

export function lootBodyTarget(state, actor, byId) {
  if (actor.lootBodyId === null || actor.lootBodyId === undefined) return null;
  const target = byId ? byId.get(actor.lootBodyId) : state.actors.find((a) => a.id === actor.lootBodyId);
  return lootBodyValid(actor, target) ? target : null;
}

const LOOT_EQUIP_SLOTS = ['weapon', 'quiver', 'backpack', 'head', 'upperOut', 'upperIn', 'lowerOut', 'lowerIn', 'feet', 'acc', 'trinket'];

export function lootItems(body) {
  if (!body) return [];
  const result = [];
  if ((body.money || 0) > 0) result.push({ item: { id: 'cash', n: body.money }, source: { kind: 'resource', resource: 'money' }, label: 'キャッシュ', resource: 'money' });
  if ((body.food || 0) > 0) result.push({ item: { id: 'food', n: body.food }, source: { kind: 'resource', resource: 'food' }, label: '食料', resource: 'food' });
  normalizeKits(body).forEach((item, index) => result.push({ item: { id: item.id || 'kit', n: item.uses || 1 }, source: { kind: 'resource', resource: 'kit', index }, label: '手当ての道具', resource: 'kit' }));
  (body.inv || []).forEach((item, index) => { if (item && ITEMS[item.id]) result.push({ item, source: { kind: 'inv', container: 'body', index }, label: '持ち物' }); });
  for (const slot of LOOT_EQUIP_SLOTS) {
    const value = body.equip?.[slot];
    for (const [index, item] of (Array.isArray(value) ? value : [value]).entries()) {
      if (!item || !ITEMS[item.id]) continue;
      const part = slot === 'weapon' ? `武器 ${index + 1}` : slot === 'acc' ? `ベルト ${index + 1}` : slot === 'trinket' ? `装飾品 ${index + 1}` : ({ upperIn: '胴・内', upperOut: '胴・外', lowerIn: '脚・内', lowerOut: '脚・外', backpack: '背負い袋' }[slot] || ({ head: '頭', feet: '足', quiver: '矢筒' }[slot] || slot));
      result.push({ item, source: { kind: 'equip', slot, index: Array.isArray(value) ? index : null }, label: part });
    }
  }
  return result;
}

function firstFree(items, obj, dims) {
  const size = itemSize(obj.id);
  for (let y = 0; y <= dims.h - size.h; y += 1) for (let x = 0; x <= dims.w - size.w; x += 1) {
    const open = items.every((other) => {
      if (!other || other.grid?.c === 'overflow') return true;
      const at = other.grid, os = itemSize(other.id);
      if (!at || at.x < 0 || at.y < 0 || at.x + os.w > dims.w || at.y + os.h > dims.h) return true;
      return x + size.w <= at.x || at.x + os.w <= x || y + size.h <= at.y || at.y + os.h <= y;
    });
    if (open) return { x, y };
  }
  return null;
}

function removeLootSource(body, source) {
  if (source.kind === 'inv') {
    const items = source.container === 'pack' ? body.equip?.backpack?.contents : body.inv;
    if (!Array.isArray(items) || !items[source.index]) return null;
    return items.splice(source.index, 1)[0];
  }
  if (source.kind !== 'equip') return null;
  const list = body.equip?.[source.slot];
  const index = Array.isArray(list) ? source.index : null;
  const item = index == null ? list : list?.[index];
  if (!item) return null;
  if (Array.isArray(list)) list[index] = null;
  else body.equip[source.slot] = null;
  if (source.slot === 'weapon') syncWeapon(body);
  return item;
}

// Stored inventory objects retain rank, nested contents and all other item data.
export function transferBoxItem(state, actorId, boxId, source, direction) {
  const actor = state?.actors?.find((entry) => entry.id === actorId);
  const box = state?.town?.boxes?.find((entry) => entry.id === boxId);
  if (!actor || actor.faction !== 'player' || actor.state === 'dead' || !box || box.locked ||
      !Number.isFinite(actor.x) || !Number.isFinite(actor.z) || !Number.isFinite(box.x) || !Number.isFinite(box.z) ||
      Math.hypot(actor.x - box.x, actor.z - box.z) > CARRY_RANGE || !Number.isInteger(source?.index) || source.index < 0) return false;
  if (direction === 'return') {
    if (source.kind !== 'inv' || !['body', 'pack'].includes(source.container)) return false;
    const list = source.container === 'pack' ? actor.equip?.backpack?.contents : actor.inv;
    if (!Array.isArray(list) || !list[source.index] || !ITEMS[list[source.index].id]) return false;
    if (box.storedItems != null && !Array.isArray(box.storedItems)) return false;
    const item = list.splice(source.index, 1)[0];
    delete item.grid;
    (box.storedItems ||= []).push(item);
    return true;
  }
  if (direction !== 'take' || source.kind !== 'stored' || !Array.isArray(box.storedItems)) return false;
  const item = box.storedItems[source.index];
  if (!item || !ITEMS[item.id]) return false;
  ensureInventoryLayout(actor);
  const spot = firstFree(actor.inv, item, inventoryGrid(actor, 'body'));
  const pack = actor.equip?.backpack;
  const packSpot = !spot && pack ? firstFree(pack.contents ||= [], item, inventoryGrid(actor, 'pack')) : null;
  if (!spot && !packSpot) return false;
  box.storedItems.splice(source.index, 1);
  if (spot) { item.grid = { c: 'body', ...spot, r: 0 }; actor.inv.push(item); }
  else { item.grid = { c: 'pack', ...packSpot, r: 0 }; pack.contents.push(item); }
  return true;
}

// Transfer one item through a command. Failed placement leaves the source untouched.
export function transferLootItem(state, actorId, bodyId, source, direction = 'take') {
  const actor = state?.actors?.find((entry) => entry.id === actorId);
  const body = state?.actors?.find((entry) => entry.id === bodyId);
  if (!actor || actor.faction !== 'player' || actor.state === 'dead' || !lootBodyValid(actor, body) || !source) return { ok: false, reason: '対象がありません' };
  if (distBetween(actor, body) > CARRY_RANGE) return { ok: false, reason: '遠すぎて取れない' };
  ensureInventoryLayout(actor); ensureInventoryLayout(body); ensureOrigins(body);
  const fromActor = direction === 'return';
  if (source.kind === 'resource' && ['money', 'food', 'kit'].includes(source.resource)) {
    const from = fromActor ? actor : body, to = fromActor ? body : actor;
    if (source.resource === 'money') {
      const amount = Math.max(0, from.money || 0);
      if (!amount) return { ok: false, reason: '品がありません' };
      from.money = 0; to.money = (to.money || 0) + amount;
      return { ok: true, amount };
    }
    if (source.resource === 'food') {
      if ((from.food || 0) < 1) return { ok: false, reason: '品がありません' };
      from.food -= 1; to.food = (to.food || 0) + 1;
      return { ok: true, amount: 1 };
    }
    const kits = normalizeKits(from), index = Number.isInteger(source.index) ? source.index : 0;
    if (!kits[index]) return { ok: false, reason: '品がありません' };
    normalizeKits(to).push(kits.splice(index, 1)[0]);
    return { ok: true, amount: 1 };
  }
  let item = null;
  if (fromActor) {
    const list = source.container === 'pack' ? actor.equip?.backpack?.contents : actor.inv;
    if (source.kind !== 'inv' || !Array.isArray(list) || !list[source.index]) return { ok: false, reason: '品がありません' };
    item = list[source.index];
    if (!firstFree(body.inv || (body.inv = []), item, inventoryGrid(body, 'body'))) return { ok: false, reason: '入りきらない' };
    list.splice(source.index, 1);
    body.inv.push(item);
    ensureInventoryLayout(body);
    return { ok: true, item };
  }
  const entry = source.kind === 'inv'
    ? (source.container === 'pack' ? body.equip?.backpack?.contents?.[source.index] : body.inv?.[source.index])
    : source.kind === 'equip' ? (Array.isArray(body.equip?.[source.slot]) ? body.equip[source.slot]?.[source.index] : body.equip?.[source.slot]) : null;
  if (!entry || !ITEMS[entry.id]) return { ok: false, reason: '品がありません' };
  const spot = firstFree(actor.inv || (actor.inv = []), entry, inventoryGrid(actor, 'body'));
  let packSpot = null;
  if (!spot && actor.equip?.backpack) packSpot = firstFree(actor.equip.backpack.contents ||= [], entry, inventoryGrid(actor, 'pack'));
  if (!spot && !packSpot) return { ok: false, reason: '入りきらない' };
  item = removeLootSource(body, source);
  if (!item) return { ok: false, reason: '品がありません' };
  if (spot) { item.grid = { c: 'body', ...spot, r: 0 }; actor.inv.push(item); }
  else { item.grid = { c: 'pack', ...packSpot, r: 0 }; actor.equip.backpack.contents.push(item); }
  ensureInventoryLayout(actor);
  return { ok: true, item };
}

export function takeAllLoot(state, actorId, bodyId) {
  const actor = state?.actors?.find((entry) => entry.id === actorId);
  const body = state?.actors?.find((entry) => entry.id === bodyId);
  if (!actor || !body) return { moved: 0, left: 0 };
  let moved = 0;
  const blocked = new Set();
  while (true) {
    const entry = lootItems(body).find((item) => !blocked.has(lootSourceKey(item.source)));
    if (!entry) break;
    if (transferLootItem(state, actorId, bodyId, entry.source).ok) moved += 1;
    else blocked.add(lootSourceKey(entry.source));
  }
  return { moved, left: lootItems(body).length };
}

export function transferGroundItem(state, actorId, groundId, itemIndex, quantity = 1) {
  const actor = state?.actors?.find((entry) => entry.id === actorId);
  const ground = state?.groundItems?.find((entry) => entry.id === groundId);
  const item = ground?.droppedItems?.[itemIndex];
  if (!actor || actor.faction !== 'player' || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup' || !item || !ITEMS[item.id]) return { ok: false, reason: '品がありません' };
  if (Math.hypot(actor.x - ground.x, actor.z - ground.z) > CARRY_RANGE) return { ok: false, reason: '遠すぎて取れない' };
  const amount = ITEMS[item.id].stackable ? Math.max(1, Math.min(item.n || 1, Math.floor(Number(quantity) || 1))) : 1;
  const copy = amount === (item.n || 1) ? item : { ...item, n: amount };
  const spot = firstFree(actor.inv || (actor.inv = []), copy, inventoryGrid(actor, 'body'));
  let packSpot = null;
  if (!spot && actor.equip?.backpack) packSpot = firstFree(actor.equip.backpack.contents ||= [], copy, inventoryGrid(actor, 'pack'));
  if (!spot && !packSpot) return { ok: false, reason: '入りきらない' };
  if (amount === (item.n || 1)) ground.droppedItems.splice(itemIndex, 1);
  else item.n -= amount;
  if (spot) { copy.grid = { c: 'body', ...spot, r: 0 }; actor.inv.push(copy); }
  else { copy.grid = { c: 'pack', ...packSpot, r: 0 }; actor.equip.backpack.contents.push(copy); }
  if (!ground.droppedItems.length && !Object.keys(ground.contents || {}).length && !ground.bag) state.groundItems.splice(state.groundItems.indexOf(ground), 1);
  ensureInventoryLayout(actor);
  return { ok: true, item: copy, amount };
}

function lootSourceKey(source) {
  if (!source) return '';
  if (source.kind === 'resource') return `${source.kind}:${source.resource}:${source.index ?? ''}`;
  if (source.kind === 'inv') return `${source.kind}:${source.container || 'body'}:${source.index}`;
  if (source.kind === 'equip') return `${source.kind}:${source.slot}:${source.index ?? ''}`;
  return JSON.stringify(source);
}

export function updatePlayerLoot(state, events) {
  const byId = indexActors(state);
  for (const actor of state.actors) {
    if (actor.lootBodyId === null || actor.lootBodyId === undefined) continue;
    if (actor.faction !== 'player' || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup' || actor.carryingId !== null || actor.carriedBy != null) {
      clearPlayerLoot(actor);
      continue;
    }
    const target = lootBodyTarget(state, actor, byId);
    if (!target) { clearPlayerLoot(actor); continue; }
    // 攻撃されて反撃している間は手を止めるだけ。相手を倒したら続ける（orders.js の決まり）
    if (actor.targetId !== null) { actor.lootBodyTicks = 0; continue; }
    if (distBetween(actor, target) > CARRY_RANGE) { actor.lootBodyTicks = 0; continue; }
    // 到着後も命令を維持し、画面を閉じるか別の命令を受けるまで待つ。
    // 品は自動で移さない。
  }
}
