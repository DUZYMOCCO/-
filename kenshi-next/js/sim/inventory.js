import { ITEMS, qualityOf } from './items.js';

// 装備枠の空のひな形を作る。
export const emptyEquip = () => ({
  head: null, upperIn: null, upperOut: null, lowerIn: null, lowerOut: null,
  feet: null, acc: [null, null, null, null], backpack: null, quiver: null,
  weapon: [null, null],
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
  if (!Array.isArray(actor.inv)) actor.inv = [];
  if (!hadEquip && actor.crossbow && !actor.equip.quiver && !actor.machine && actor.faction !== 'beast' && !actor.swordsman) giveInitialQuiver(actor);
  return actor;
}

// 主武器とクロスボウの状態を装備枠に合わせる。
export function syncWeapon(actor) {
  const primary = actor.equip?.weapon?.[0];
  if (primary?.id === 'crossbow') {
    actor.crossbow = primary.crossbow || actor.crossbow || { bolts: 0, loaded: false, reload: 0, aim: 0 };
    primary.crossbow = actor.crossbow;
    if (actor.equip.quiver) actor.crossbow.bolts = actor.equip.quiver.ammo?.n || 0;
    actor.weapon = actor.equip.weapon[1]?.id || 'fists';
  } else {
    if (actor.crossbow && actor.equip?.weapon) {
      const cross = actor.equip.weapon.find(x => x?.id === 'crossbow');
      if (cross) cross.crossbow = actor.crossbow;
    }
    actor.crossbow = null;
    actor.weapon = ITEMS[primary?.id]?.slot === 'weapon' ? primary.id : 'fists';
  }
}

// アイテムを指定枠に装備できるか調べる。
export function canEquip(actor, obj, slotKey, index) {
  const def = ITEMS[obj?.id];
  if (!def) return { ok: false, reason: 'アイテムがない' };
  if (actor.faction === 'beast' || actor.machine || actor.swordsman) return { ok: false, reason: '装備できない' };
  const slot = slotKey || def.slot;
  if (slot !== def.slot || !Object.hasOwn(emptyEquip(), slot)) return { ok: false, reason: 'この枠には着けられない' };
  if ((slot === 'acc' || slot === 'weapon') && index != null && (!Number.isInteger(index) || index < 0 || index >= (slot === 'acc' ? 4 : 2))) return { ok: false, reason: '枠がない' };
  if (slot === 'acc' && index == null && actor.equip.acc.every(Boolean)) return { ok: false, reason: 'アクセサリ枠がいっぱい' };
  return { ok: true, reason: '' };
}

// 持ち物から装備し、埋まった指定枠のものは持ち物へ戻す。
export function equipItem(state, actor, invIndex, slotKey, index) {
  initInventory(actor);
  const obj = actor.inv[invIndex];
  const slot = slotKey || ITEMS[obj?.id]?.slot;
  const check = canEquip(actor, obj, slot, index);
  if (!check.ok) return check;
  if (slot === 'weapon' && actor.equip.weapon[0]?.id === 'crossbow' && actor.crossbow) actor.equip.weapon[0].crossbow = actor.crossbow;
  let old;
  if (slot === 'acc' || slot === 'weapon') {
    let i = index ?? actor.equip[slot].findIndex(x => !x);
    if (i < 0) i = 0;
    old = actor.equip[slot][i];
    actor.equip[slot][i] = obj;
  } else {
    old = actor.equip[slot];
    actor.equip[slot] = obj;
  }
  actor.inv.splice(invIndex, 1);
  if (old) actor.inv.push(old);
  if (slot === 'weapon') syncWeapon(actor);
  if (slot === 'quiver' && actor.crossbow) actor.crossbow.bolts = actor.equip.quiver?.ammo?.n || 0;
  return { ok: true, reason: '' };
}

// 装備を外して持ち物に戻す。
export function unequipItem(state, actor, slot, index) {
  if (!actor.equip || !Object.hasOwn(actor.equip, slot)) return { ok: false, reason: '枠がない' };
  if (slot === 'weapon' && index === 0 && actor.equip.weapon[0]?.id === 'crossbow' && actor.crossbow) actor.equip.weapon[0].crossbow = actor.crossbow;
  let obj;
  if (slot === 'acc' || slot === 'weapon') {
    if (!Number.isInteger(index) || index < 0 || index >= actor.equip[slot].length) return { ok: false, reason: '枠がない' };
    obj = actor.equip[slot][index];
    actor.equip[slot][index] = null;
  } else {
    obj = actor.equip[slot];
    actor.equip[slot] = null;
  }
  if (!obj) return { ok: false, reason: '装備がない' };
  (actor.inv ||= []).push(obj);
  if (slot === 'weapon') syncWeapon(actor);
  if (slot === 'quiver') {
    if (actor.crossbow) actor.crossbow.bolts = 0;
    const cross = actor.equip.weapon?.find(x => x?.id === 'crossbow');
    if (cross?.crossbow) cross.crossbow.bolts = 0;
  }
  return { ok: true, reason: '' };
}

// アイテム一つの品質と個数を含めた重さを返す。
function weight(obj) {
  const d = ITEMS[obj?.id];
  return d ? (d.weight || 0) * qualityOf(obj.rank).weight * (d.stackable ? Math.max(1, obj.n || 1) : 1) : 0;
}

// 装備と持ち物、矢筒の中身を合計する。
export function carriedWeight(actor) {
  return [...(actor.inv || []), ...Object.values(actor.equip || {}).flat()].reduce((s, x) => s + weight(x) + (x?.ammo ? weight(x.ammo) : 0), 0);
}

// 筋力と背負い袋から容量を返す。
export function carryCapacity(actor) {
  return Math.max(1, 15 + (actor.skills?.strength || 0) + (ITEMS[actor.equip?.backpack?.id]?.capacity || 0));
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
