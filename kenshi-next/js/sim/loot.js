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
import { ITEMS, qualityOf } from './items.js';
import { lootEquipped, carryCapacity, carriedWeight, ensureOrigins, syncWeapon } from './inventory.js';

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

function itemWeight(obj) {
  const d = ITEMS[obj?.id];
  if (!d) return 0;
  return (d.weight || 0) * qualityOf(obj.rank).weight * (d.stackable ? obj.n || 1 : 1);
}

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

export function updatePlayerLoot(state, events) {
  const byId = indexActors(state);
  for (const actor of state.actors) {
    if (actor.lootBodyId === null || actor.lootBodyId === undefined) continue;
    if (actor.faction !== 'player' || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup' || actor.carryingId !== null || actor.carriedBy != null) {
      clearPlayerLoot(actor);
      continue;
    }
    // 攻撃されて反撃に移ったら中断（今の決まりどおり）
    if (actor.targetId !== null) { clearPlayerLoot(actor); continue; }
    const target = lootBodyTarget(state, actor, byId);
    if (!target) { clearPlayerLoot(actor); continue; }
    if (distBetween(actor, target) > CARRY_RANGE) { actor.lootBodyTicks = 0; continue; }
    actor.lootBodyTicks = (actor.lootBodyTicks || 0) + 1;
    if (actor.lootBodyTicks < PLAYER_LOOT_TICKS) continue;
    const { got, left } = takeFromBody(actor, target);
    clearPlayerLoot(actor);
    const what = got.length ? got.slice(0, 6).join('、') + (got.length > 6 ? ' ほか' + (got.length - 6) + '点' : '') : '何も見つからなかった';
    events.push(makeEvent(state, 'loot', actor.name + 'が' + target.name + 'をあさった: ' + what + (left > 0 ? '（持ちきれない' + left + '点は残した）' : '')));
  }
}
