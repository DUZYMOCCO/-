import { ITEMS, qualityOf } from './items.js';
import { paletteIdFor } from '../data/faction_map.js';
import { gripOf, reconcileGrip } from './grip.js';
import { BODY_GRID, itemSize, packGridSize } from '../data/item_sizes.js';
import { attachProsthetic, canAttachProsthetic, detachProsthetic, PROSTHETIC_PARTS } from './prosthetics.js';
import { effectiveStrength } from './needs.js';

// 装備枠の空のひな形を作る。
export const emptyEquip = () => ({
  head: null, upperIn: null, upperOut: null, lowerIn: null, lowerOut: null,
  feet: null, acc: [null, null, null, null], trinket: [null, null, null, null], backpack: null, quiver: null,
  weapon: [null, null], prosthetic: [null, null, null, null],
});

// 初期装備用のアイテムを作る。
const item = (id, rank = 3) => ({ id, rank, n: 1 });

// 古いデータを含め、所持品と勢力別の初期装備を補完する。
export function initInventory(actor) {
  const hadEquip = !!actor.equip;
  if (!actor.equip) {
    actor.equip = emptyEquip();
    if (actor.faction !== 'beast' && !actor.machine && !actor.swordsman) {
      if (actor.faction === 'player') {
        actor.equip.upperIn = item('cloth_shirt');
        actor.equip.lowerIn = item('cloth_pants');
      }
      if (actor.faction === 'guard') {
        actor.equip.upperOut = item('leather_vest');
        actor.equip.lowerIn = item('cloth_pants');
        actor.equip.head = item('leather_cap');
      }
      if (actor.faction === 'bandit') {
        actor.equip.upperOut = item('rag_top', 1);
        actor.equip.lowerOut = item('rag_pants', 1);
      }
      if (ITEMS[actor.weapon]?.slot === 'weapon') actor.equip.weapon[actor.crossbow ? 1 : 0] = item(actor.weapon);
      if (actor.crossbow) actor.equip.weapon[0] = item('crossbow');
    }
  }
  // Older saves have no generic trinket slots. Add the slots without changing
  // any existing belt accessory or equipment.
  if (!Array.isArray(actor.equip.trinket)) actor.equip.trinket = [null, null, null, null];
  else actor.equip.trinket = [...actor.equip.trinket.slice(0, 4), ...Array(Math.max(0, 4 - actor.equip.trinket.length)).fill(null)];
  if (!Array.isArray(actor.equip.prosthetic)) actor.equip.prosthetic = [null, null, null, null];
  else actor.equip.prosthetic = [...actor.equip.prosthetic.slice(0, 4), ...Array(Math.max(0, 4 - actor.equip.prosthetic.length)).fill(null)];
  if (!Array.isArray(actor.inv)) actor.inv = [];
  if (!hadEquip && actor.crossbow && !actor.equip.quiver && !actor.machine && actor.faction !== 'beast' && !actor.swordsman) giveInitialQuiver(actor);
  ensureInventoryLayout(actor);
  return actor;
}

// 装備・持ち物のうち元の勢力が未記録のものに、いまの持ち主の勢力（パレット勢力 id）を記録する。
// 見た目（色）のためだけの印で、ダメージ・防御には使わない。古いセーブのものは最初に見た時の持ち主で補う。
export function ensureOrigins(actor) {
  if (!actor) return actor;
  const id = paletteIdFor(actor);
  const seen = new Set();
  const mark = (x) => {
    if (x && typeof x === 'object' && x.id && !x.originFaction) x.originFaction = id;
    if (!x || typeof x !== 'object' || seen.has(x)) return;
    seen.add(x);
    if (Array.isArray(x.contents)) x.contents.forEach(mark);
    if (x.ammo) mark(x.ammo);
  };
  for (const v of Object.values(actor.equip || {})) (Array.isArray(v) ? v : [v]).forEach(mark);
  (actor.inv || []).forEach(mark);
  return actor;
}

// 倒れた者などの装備を剥ぎ取って拾う。元の持ち主の勢力を先に記録するので、拾った後も色は元のまま。
export function lootEquipped(from, to, slot, index) {
  ensureOrigins(from);
  const list = from.equip && Object.hasOwn(from.equip, slot) ? from.equip[slot] : undefined;
  const multi = Array.isArray(list);
  const obj = multi ? list[index] : list;
  if (!obj) return { ok: false, reason: '装備がない' };
  if (multi) list[index] = null;
  else from.equip[slot] = null;
  (to.inv ||= []).push(obj);
  return { ok: true, reason: '', item: obj };
}

// 主武器とクロスボウの状態を装備枠に合わせる。
export function syncWeapon(actor) {
  const primary = actor.equip?.weapon?.[0];
  if (ITEMS[primary?.id]?.ranged) {
    actor.crossbow = primary.crossbow || actor.crossbow || { bolts: 0, loaded: false, reload: 0, aim: 0 };
    primary.crossbow = actor.crossbow;
    if (actor.equip.quiver) actor.crossbow.bolts = actor.equip.quiver.ammo?.n || 0;
    actor.weapon = actor.equip.weapon[1]?.id || 'fists';
  } else {
    if (actor.crossbow && actor.equip?.weapon) {
      const cross = actor.equip.weapon.find(x => ITEMS[x?.id]?.ranged);
      if (cross) cross.crossbow = actor.crossbow;
    }
    actor.crossbow = null;
    const secondary = actor.equip?.weapon?.[1];
    actor.weapon = ITEMS[primary?.id]?.slot === 'weapon' && !ITEMS[primary?.id]?.ranged
      ? primary.id
      : ITEMS[secondary?.id]?.slot === 'weapon' && !ITEMS[secondary?.id]?.ranged
        ? secondary.id
        : 'fists';
  }
}

// アイテムを指定枠に装備できるか調べる。
export function canEquip(actor, obj, slotKey, index) {
  const def = ITEMS[obj?.id];
  if (!def) return { ok: false, reason: 'アイテムがない' };
  if (actor.faction === 'beast' || actor.machine || actor.swordsman) return { ok: false, reason: '装備できない' };
  const slot = slotKey || def.slot;
  if (slot === 'prosthetic') return canAttachProsthetic(actor, obj, index);
  if (slot === 'weapon' && gripOf(actor) === 'none') return { ok: false, reason: '両腕が使えず武器を装備できません' };
  if (slot === 'weapon' && def.ranged && gripOf(actor) !== 'two') return { ok: false, reason: 'クロスボウには両腕が必要です' };
  const genericTrinket = slot === 'trinket' && def.trinket === true;
  if ((!genericTrinket && slot !== def.slot) || !Object.hasOwn(emptyEquip(), slot)) return { ok: false, reason: 'この枠には着けられない' };
  if ((slot === 'acc' || slot === 'trinket' || slot === 'weapon') && index != null && (!Number.isInteger(index) || index < 0 || index >= (slot === 'weapon' ? 2 : 4))) return { ok: false, reason: '枠がない' };
  if (slot === 'trinket' && index == null && actor.equip.trinket.every(Boolean)) return { ok: false, reason: '装飾品枠がいっぱい' };
  if (slot === 'acc' && index == null && actor.equip.acc.every(Boolean)) return { ok: false, reason: 'アクセサリ枠がいっぱい' };
  return { ok: true, reason: '' };
}

// 持ち物から装備し、埋まった指定枠のものは持ち物へ戻す。
export function equipItem(state, actor, invIndex, slotKey, index) {
  initInventory(actor);
  const obj = actor.inv[invIndex];
  if (obj && !obj.originFaction) obj.originFaction = paletteIdFor(actor); // 出どころ不明の装備は着た人の色
  const slot = slotKey || ITEMS[obj?.id]?.slot;
  const check = canEquip(actor, obj, slot, index);
  if (!check.ok) return check;
  if (slot === 'prosthetic') {
    const partKey = PROSTHETIC_PARTS[index].key;
    const attached = attachProsthetic(actor, obj, index);
    if (!attached.ok) return attached;
    actor.inv.splice(invIndex, 1);
    delete obj.grid;
    if (partKey === 'lArm' || partKey === 'rArm') reconcileGrip(state, actor, []);
    ensureInventoryLayout(actor);
    return { ok: true, reason: '' };
  }
  if (slot === 'weapon' && ITEMS[actor.equip.weapon[0]?.id]?.ranged && actor.crossbow) actor.equip.weapon[0].crossbow = actor.crossbow;
  let old;
  if (slot === 'acc' || slot === 'trinket' || slot === 'weapon') {
    let i = index ?? actor.equip[slot].findIndex(x => !x);
    if (i < 0) i = 0;
    old = actor.equip[slot][i];
    actor.equip[slot][i] = obj;
  } else {
    old = actor.equip[slot];
    actor.equip[slot] = obj;
  }
  actor.inv.splice(invIndex, 1);
  delete obj.grid;
  if (old) { delete old.grid; actor.inv.push(old); }
  if (slot === 'weapon') syncWeapon(actor);
  if (slot === 'quiver' && actor.crossbow) actor.crossbow.bolts = actor.equip.quiver?.ammo?.n || 0;
  ensureInventoryLayout(actor);
  return { ok: true, reason: '' };
}

// 装備を外して持ち物に戻す。
export function unequipItem(state, actor, slot, index) {
  if (!actor.equip || !Object.hasOwn(actor.equip, slot)) return { ok: false, reason: '枠がない' };
  if (slot === 'prosthetic') {
    if (!Number.isInteger(index) || index < 0 || index >= PROSTHETIC_PARTS.length) return { ok: false, reason: '枠がない' };
    const removed = detachProsthetic(actor, index);
    if (!removed.ok) return removed;
    if (removed.partKey === 'lArm' || removed.partKey === 'rArm') reconcileGrip(state, actor, []);
    ensureInventoryLayout(actor);
    return { ok: true, reason: '' };
  }
  if (slot === 'weapon' && index === 0 && ITEMS[actor.equip.weapon[0]?.id]?.ranged && actor.crossbow) actor.equip.weapon[0].crossbow = actor.crossbow;
  let obj;
  if (slot === 'acc' || slot === 'trinket' || slot === 'weapon') {
    if (!Number.isInteger(index) || index < 0 || index >= actor.equip[slot].length) return { ok: false, reason: '枠がない' };
    obj = actor.equip[slot][index];
    actor.equip[slot][index] = null;
  } else {
    obj = actor.equip[slot];
    actor.equip[slot] = null;
  }
  if (!obj) return { ok: false, reason: '装備がない' };
  delete obj.grid;
  (actor.inv ||= []).push(obj);
  if (slot === 'weapon') syncWeapon(actor);
  if (slot === 'quiver') {
    if (actor.crossbow) actor.crossbow.bolts = 0;
    const cross = actor.equip.weapon?.find(x => ITEMS[x?.id]?.ranged);
    if (cross?.crossbow) cross.crossbow.bolts = 0;
  }
  ensureInventoryLayout(actor);
  return { ok: true, reason: '' };
}

export function dropInventoryItem(state, actor, source, quantity = 1) {
  if (!state || !actor || !source) return { ok: false, reason: '品物がありません' };
  initInventory(actor);
  if (source.kind === 'equip') {
    const equipment = actor.equip?.[source.slot];
    const worn = Array.isArray(equipment) ? equipment[source.index] : equipment;
    const result = unequipItem(state, actor, source.slot, source.index);
    if (!result.ok) return result;
    source = { kind: 'inv', container: 'body', index: actor.inv.indexOf(worn) };
  }
  if (source.kind !== 'inv' || !['body', 'pack'].includes(source.container) || !Number.isInteger(source.index)) return { ok: false, reason: '品物がありません' };
  const list = source.container === 'pack' ? actor.equip.backpack?.contents : actor.inv;
  const original = list?.[source.index];
  const def = ITEMS[original?.id];
  if (!original || !def) return { ok: false, reason: '品物がありません' };
  const amount = def.stackable ? Math.max(1, Math.min(original.n || 1, Math.floor(Number(quantity) || 1))) : 1;
  let dropped;
  if (amount >= (original.n || 1)) {
    dropped = list.splice(source.index, 1)[0];
  } else {
    original.n -= amount;
    dropped = { ...original, n: amount };
  }
  delete dropped.grid;
  state.groundItems ||= [];
  state.groundItems.push({
    id: `item_${state.tick || 0}_${actor.id}_${state.groundItems.length}`,
    x: actor.x, z: actor.z, droppedItems: [dropped],
  });
  ensureInventoryLayout(actor);
  return { ok: true, item: dropped, amount };
}

// アイテム一つの品質と個数を含めた重さを返す。
function weight(obj, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return 0;
  seen.add(obj);
  const d = ITEMS[obj?.id];
  const own = d ? (d.weight || 0) * qualityOf(obj.rank).weight * (d.stackable ? Math.max(1, obj.n || 1) : 1) : 0;
  const ammo = obj.ammo ? weight(obj.ammo, seen) : 0;
  const contents = Array.isArray(obj.contents) ? obj.contents.reduce((sum, item) => sum + weight(item, seen), 0) : 0;
  return own + ammo + contents;
}

// Return the same recursive weight used by carriedWeight for a single item.
export function itemWeight(obj) {
  return weight(obj);
}

// 装備と持ち物、矢筒の中身を合計する。
export function carriedWeight(actor) {
  return [...(actor.inv || []), ...Object.values(actor.equip || {}).flat()].reduce((sum, obj) => sum + weight(obj), 0);
}

// 筋力と背負い袋から容量を返す。
export function carryCapacity(actor) {
  return Math.max(1, 15 + effectiveStrength(actor) + (ITEMS[actor.equip?.backpack?.id]?.capacity || 0));
}

// 重さを容量で割った荷重率を返す。
export function loadRatio(actor) {
  return carriedWeight(actor) / carryCapacity(actor);
}

// 荷重率を0から1の負荷に変換する。
export function encumbranceFromLoad(ratio) {
  return Math.max(0, Math.min(1, (ratio - .5) / .7));
}

// 空の矢筒に容量内の矢の束を入れる。
export function setQuiverAmmo(actor, ammo) {
  const q = actor.equip?.quiver;
  const def = ITEMS[q?.id];
  if (!q || !def?.ammoCap || !ammo || ammo.id !== 'bolts' || !Number.isInteger(ammo.n) || ammo.n < 1 || ammo.n > def.ammoCap || q.ammo) return { ok: false, reason: '矢を入れられない' };
  q.ammo = ammo;
  if (actor.crossbow) actor.crossbow.bolts = ammo.n;
  return { ok: true, reason: '' };
}

// 初期の矢筒には収まる本数だけ入れ、超過分は持ち物に残す。
export function giveInitialQuiver(actor) {
  const count = Math.max(0, Math.floor(actor.crossbow?.bolts || 0));
  const held = Math.min(ITEMS.quiver.ammoCap, count);
  actor.equip.quiver = { id: 'quiver', rank: 3, n: 1, ammo: held ? { id: 'bolts', rank: 3, n: held } : null };
  if (count > held) actor.inv.push({ id: 'bolts', rank: 3, n: count - held });
  if (actor.crossbow) actor.crossbow.bolts = held;
}

// 補充は矢筒があれば容量まで収め、受け取った本数を返す。
export function addBolts(actor, count) {
  const amount = Math.max(0, Math.floor(count));
  const q = actor.equip?.quiver;
  if (q) {
    const current = q.ammo?.n || 0;
    const added = Math.max(0, Math.min(amount, ITEMS[q.id].ammoCap - current));
    if (added) {
      if (!q.ammo) q.ammo = { id: 'bolts', rank: 3, n: 0 };
      q.ammo.n += added;
    }
    if (actor.crossbow) actor.crossbow.bolts = q.ammo?.n || 0;
    return added;
  }
  if (!actor.crossbow) return 0;
  actor.crossbow.bolts += amount;
  return amount;
}

function withinGrid(size, grid, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + size.w <= grid.w && y + size.h <= grid.h;
}

function overlaps(a, b, sizeA, sizeB) {
  return a.x < b.x + sizeB.w && a.x + sizeA.w > b.x && a.y < b.y + sizeB.h && a.y + sizeA.h > b.y;
}

function canPlace(items, obj, x, y, grid, exclude = null) {
  const size = itemSize(obj?.id);
  if (!withinGrid(size, grid, x, y)) return false;
  for (const other of items) {
    if (!other || other === exclude || other === obj || other.grid?.c === 'overflow') continue;
    const at = other.grid;
    if (!at || (at.r != null && at.r !== 0) || !withinGrid(itemSize(other.id), grid, at.x, at.y)) continue;
    if (overlaps({ x, y }, at, size, itemSize(other.id))) return false;
  }
  return true;
}

function firstFit(items, obj, grid) {
  const size = itemSize(obj?.id);
  for (let y = 0; y <= grid.h - size.h; y += 1) {
    for (let x = 0; x <= grid.w - size.w; x += 1) {
      if (canPlace(items, obj, x, y, grid)) return { x, y };
    }
  }
  return null;
}

function normalizeGridArray(items, container, grid) {
  if (!Array.isArray(items) || grid.w < 1 || grid.h < 1) return;
  const placed = [], unplaced = [];
  for (const obj of items) {
    const at = obj?.grid;
    if (obj && at?.c === container && (at.r == null || at.r === 0) && canPlace(placed, obj, at.x, at.y, grid)) {
      obj.grid = { c: container, x: at.x, y: at.y, r: 0 };
      placed.push(obj);
    } else if (obj && typeof obj === 'object') {
      delete obj.grid;
      unplaced.push(obj);
    }
  }
  for (const obj of unplaced) {
    const at = firstFit(placed, obj, grid);
    if (!at) obj.grid = { c: 'overflow', x: -1, y: -1, r: 0 };
    else {
      obj.grid = { c: container, ...at, r: 0 };
      placed.push(obj);
    }
  }
}

// 位置がない物や重なっている物を、配列順の先頭から空きマスへ置く。
export function ensureInventoryLayout(actor) {
  if (!actor || typeof actor !== 'object') return actor;
  if (!Array.isArray(actor.inv)) actor.inv = [];
  normalizeGridArray(actor.inv, 'body', BODY_GRID);
  const pending = [...actor.inv, ...Object.values(actor.equip || {}).flat()];
  const seen = new Set();
  while (pending.length) {
    const obj = pending.shift();
    if (!obj || typeof obj !== 'object' || seen.has(obj) || ITEMS[obj.id]?.slot !== 'backpack') continue;
    seen.add(obj);
    if (!Array.isArray(obj.contents)) obj.contents = [];
    normalizeGridArray(obj.contents, 'pack', packGridSize(obj.id));
    pending.push(...obj.contents);
  }
  return actor;
}

export function inventoryGrid(actor, container = 'body') {
  if (container === 'body') return { ...BODY_GRID };
  if (container === 'pack') return packGridSize(actor?.equip?.backpack?.id);
  return { w: 0, h: 0 };
}

function itemsForContainer(actor, container) {
  if (container === 'body') return actor.inv;
  if (container === 'pack' && ITEMS[actor.equip?.backpack?.id]?.slot === 'backpack') {
    actor.equip.backpack.contents ||= [];
    return actor.equip.backpack.contents;
  }
  return null;
}

// 体と背負い袋のあいだで一つ移す。無効な移動は状態を変えない。
export function moveInventoryItem(actor, from, index, to, x, y) {
  if (!actor || !['body', 'pack'].includes(from) || !['body', 'pack'].includes(to) || !Number.isInteger(index)) return false;
  ensureInventoryLayout(actor);
  const source = itemsForContainer(actor, from), target = itemsForContainer(actor, to);
  if (!source || !target || index < 0 || index >= source.length) return false;
  const obj = source[index], grid = inventoryGrid(actor, to);
  if (!obj || !canPlace(target, obj, x, y, grid, source === target ? obj : null)) return false;
  if (source === target && obj.grid?.x === x && obj.grid?.y === y) return true;
  source.splice(index, 1);
  obj.grid = { c: to, x, y, r: 0 };
  target.push(obj);
  return true;
}

function sortContainer(items, container, grid) {
  const ordered = items.map((obj, index) => ({ obj, index, size: itemSize(obj?.id) }));
  ordered.sort((a, b) => (b.size.w * b.size.h) - (a.size.w * a.size.h)
    || Math.max(b.size.w, b.size.h) - Math.max(a.size.w, a.size.h)
    || b.size.h - a.size.h
    || (String(a.obj?.id || '') < String(b.obj?.id || '') ? -1 : String(a.obj?.id || '') > String(b.obj?.id || '') ? 1 : 0)
    || (Number(a.obj?.rank) || 0) - (Number(b.obj?.rank) || 0)
    || a.index - b.index);
  items.splice(0, items.length, ...ordered.map((entry) => entry.obj));
  const placed = [];
  for (const obj of items) {
    if (!obj || typeof obj !== 'object') continue;
    delete obj.grid;
    const at = firstFit(placed, obj, grid);
    if (!at) obj.grid = { c: 'overflow', x: -1, y: -1, r: 0 };
    else { obj.grid = { c: container, ...at, r: 0 }; placed.push(obj); }
  }
}

// 大きい物から行順に詰める。順序、配置、overflow は乱数なしで決まる。
export function sortInventory(actor) {
  if (!actor) return false;
  ensureInventoryLayout(actor);
  sortContainer(actor.inv, 'body', BODY_GRID);
  const bag = actor.equip?.backpack;
  if (bag && ITEMS[bag.id]?.slot === 'backpack') {
    bag.contents ||= [];
    sortContainer(bag.contents, 'pack', packGridSize(bag.id));
  }
  return true;
}
