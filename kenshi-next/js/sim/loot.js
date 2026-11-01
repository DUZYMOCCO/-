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
import { lootEquipped, carryCapacity, carriedWeight, itemWeight, ensureOrigins, syncWeapon, ensureInventoryLayout, inventoryGrid } from './inventory.js';
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
// 倒れている・死んでいる者のそばで少し手を動かし、キャッシュ・食料・手当ての道具・持ち物・武器・防具を取る。
// 持ち物の枠（12＋背負い袋）と、重さ（荷重の表示が赤になる手前＝容量の1.2倍まで）を超える分は残す。
export const PLAYER_LOOT_TICKS = 15; // 1.5秒
const EQUIP_ORDER = [['weapon', 0], ['weapon', 1], ['quiver'], ['backpack'], ['head'], ['upperOut'], ['upperIn'], ['lowerOut'], ['lowerIn'], ['feet'], ['acc', 0], ['acc', 1], ['acc', 2], ['acc', 3]];

function invSlots(actor) {
  return 12 + (ITEMS[actor.equip?.backpack?.id]?.slots || 0);
}

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

// 実際に取る。何を取ったかの名前一覧を返す
export function takeFromBody(looter, body) {
  const got = [];
  const money = body.money || 0;
  if (money > 0) { looter.money = (looter.money || 0) + money; body.money = 0; got.push('キャッシュ ' + money); }
  const food = body.food || 0;
  if (food > 0) { looter.food = (looter.food || 0) + food; body.food = 0; got.push('食料' + food + 'つ'); }
  const kits = normalizeKits(body);
  if (kits.length > 0) { normalizeKits(looter).push(...kits); body.kits = []; got.push('手当ての道具' + kits.length + '箱'); }
  if (!Array.isArray(looter.inv)) looter.inv = [];
  if (!Array.isArray(body.inv)) body.inv = [];
  ensureOrigins(body);
  if (body.equip?.weapon?.some(Boolean)) syncWeapon(body); // クロスボウの装填状態などを品物に移しておく
  const cap = carryCapacity(looter) * 1.2; // 荷重の表示が赤になる手前まで
  let weight = carriedWeight(looter);
  let left = 0;
  const fits = (obj) => looter.inv.length < invSlots(looter) && weight + itemWeight(obj) <= cap;
  const keep = [];
  for (const obj of body.inv) {
    if (!obj || !ITEMS[obj.id]) { keep.push(obj); continue; }
    if (fits(obj)) { looter.inv.push(obj); weight += itemWeight(obj); got.push(ITEMS[obj.id].name); }
    else { keep.push(obj); left += 1; }
  }
  body.inv = keep;
  let tookWeapon = false;
  for (const [slot, index] of EQUIP_ORDER) {
    const list = body.equip?.[slot];
    const obj = Array.isArray(list) ? list[index] : list;
    if (!obj || !ITEMS[obj.id]) continue;
    if (!fits(obj)) { left += 1; continue; }
    const r = lootEquipped(body, looter, slot, index);
    if (!r.ok) continue;
    weight += itemWeight(obj);
    if (slot === 'weapon') tookWeapon = true;
    got.push(ITEMS[obj.id].name);
  }
  if (tookWeapon) syncWeapon(body);
  return { got, left };
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

// Transfer one item through a command. Failed placement leaves the source untouched.
export function transferLootItem(state, actorId, bodyId, source, direction = 'take') {
  const actor = state?.actors?.find((entry) => entry.id === actorId);
  const body = state?.actors?.find((entry) => entry.id === bodyId);
  if (!actor || actor.faction !== 'player' || actor.state === 'dead' || !lootBodyValid(actor, body) || distBetween(actor, body) > CARRY_RANGE || !source) return { ok: false, reason: '対象がありません' };
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
  const weight = itemWeight(entry);
  if (carriedWeight(actor) + weight > carryCapacity(actor) * 1.2) return { ok: false, reason: '重すぎる' };
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
    actor.lootBodyTicks = (actor.lootBodyTicks || 0) + 1;
    if (actor.lootBodyTicks < PLAYER_LOOT_TICKS) continue;
    clearPlayerLoot(actor);
    const result = takeFromBody(actor, target);
    const what = result.got.length ? result.got.join('、') : '何も取れなかった';
    const remaining = result.left ? `（残り${result.left}点）` : '';
    events.push(makeEvent(state, 'loot', `${actor.name}が${target.name}から${what}を取った${remaining}`));
  }
}
