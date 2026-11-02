import { bindTouchDrag, touchGhost } from './inventory_touch.js';
﻿import { panels } from './panels.js';
import { ITEMS, qualityOf } from '../sim/items.js';
import { BODY_GRID, itemSize } from '../data/item_sizes.js';
import { itemArt } from '../data/item_art.js';
import { itemIconPath } from '../data/item_icons.js';
import { appendItemArt, itemKindClass } from './item_grid.js';
import { PROSTHETIC_PARTS } from '../sim/prosthetics.js';
import {
  canEquip, carriedWeight, carryCapacity, loadRatio, encumbranceFromLoad,
  ensureInventoryLayout, initInventory, inventoryGrid,
} from '../sim/inventory.js';
import { activeStolenMark, stolenTownName } from '../sim/stolen_goods.js';

// 既存テスト・鍛冶画面向けの互換一覧。画面レイアウトは EQUIPMENT_GROUPS を使う。
export const SLOT_GROUPS = [
  ['頭', [['head', '頭']]], ['上半身', [['upperIn', '内'], ['upperOut', '外']]],
  ['下半身', [['lowerIn', '内'], ['lowerOut', '外']]], ['足', [['feet', '足']]],
  ['アクセサリ', [0, 1, 2, 3].map((i) => ['acc', String(i + 1), i])],
  ['装飾品', [0, 1, 2, 3].map((i) => ['trinket', String(i + 1), i])],
  ['背負い袋', [['backpack', '袋']]], ['矢筒', [['quiver', '矢筒']]],
  ['武器', [['weapon', '主', 0], ['weapon', '予備', 1]]],
];

const EQUIPMENT_PARTS = {
  head: { name: '頭', slots: [['head', null, '頭']] },
  torso: { name: '胴', slots: [['upperIn', null, 'シャツ'], ['upperOut', null, '防具（胴）']] },
  belt: { name: '腰・ベルト', slots: [['quiver', null, '矢筒'], ...[0, 1, 2, 3].map((i) => ['acc', i, `小物 ${i + 1}`])] },
  legs: { name: '脚', slots: [['lowerIn', null, 'ズボン・内'], ['lowerOut', null, 'ズボン・外']] },
  feet: { name: '足', slots: [['feet', null, '靴']] },
  handL: { name: '左手・武器 I', slots: [['weapon', 0, '武器 I']] },
  handR: { name: '右手・武器 II', slots: [['weapon', 1, '武器 II']] },
  backpack: { name: '背中・背負い袋', slots: [['backpack', null, '背負い袋']] },
  trinkets: { name: '装飾品', slots: [0, 1, 2, 3].map((i) => ['trinket', i, `装飾品 ${i + 1}`]) },
  prosthetics: { name: '義肢', slots: PROSTHETIC_PARTS.map((part, i) => ['prosthetic', i, ({ lArm: '左腕', rArm: '右腕', lLeg: '左脚', rLeg: '右脚' })[part.key]]) },
};

// Coordinates are percentages of the equipment stage. Slot centers stay in
// the two side columns; the silhouette and lower belt row remain unobstructed.
export const INVENTORY_BODY_LAYOUT = Object.freeze({
  slots: Object.freeze({
    head: [8, 4], torsoOut: [8, 18], handL: [8, 32], trinket0: [8, 46], trinket1: [8, 60], legsIn: [8, 74], feet: [8, 86],
    backpack: [92, 4], torsoIn: [92, 18], handR: [92, 32], trinket2: [92, 46], trinket3: [92, 60], legsOut: [92, 74],
  }),
  silhouette: Object.freeze({ centerX: .5, widthPerHeight: .401, top: .078, heightPerStage: .741 }),
  belt: Object.freeze({ top: 92 }),
});
export const PROSTHETIC_SLOT_LAYOUT = Object.freeze({
  columns: 2, gap: 6, panelMaxWidth: 340,
  slotHeight: 50, panelPadding: 8, flowGap: 10,
});
export function prostheticSlotRects(stageWidth, stageHeight) {
  const { columns, gap, panelMaxWidth, slotHeight, panelPadding, flowGap } = PROSTHETIC_SLOT_LAYOUT;
  const compact = stageHeight <= 300;
  const panelWidth = Math.min(panelMaxWidth, stageWidth);
  const slotWidth = (panelWidth - panelPadding * 2 - gap - 2) / columns;
  const rows = Math.ceil(PROSTHETIC_PARTS.length / columns);
  const left = (stageWidth - panelWidth) / 2;
  const top = stageHeight + flowGap + panelPadding + 18;
  return PROSTHETIC_PARTS.map((_, index) => ({
    left: left + panelPadding + 1 + (index % columns) * (slotWidth + gap),
    top: top + Math.floor(index / columns) * (slotHeight + gap),
    width: slotWidth, height: compact ? 44 : slotHeight,
  }));
}
// Points are in the SVG viewBox and sit on the filled body path.
export const INVENTORY_BODY_ANCHORS = Object.freeze({
  head: [116, 44], upperIn: [148, 143], upperOut: [92, 143],
  handL: [13, 109], handR: [207, 109], backpack: [163, 91],
  lowerIn: [88, 292], lowerOut: [145, 292], feet: [80, 390],
  trinket0: [92, 203], trinket1: [90, 252], trinket2: [148, 203], trinket3: [150, 252],
  belt: [120, 178],
});
export const INVENTORY_BODY_PATH = 'M110 10 C94 10 84 22 84 38 C84 52 91 62 101 68 L101 78 C91 80 81 84 72 91 L15 91 Q3 91 3 103 L3 116 Q3 126 15 126 L63 126 Q73 126 82 119 L85 116 L83 163 Q82 178 89 190 L83 223 L77 278 L65 379 Q63 393 76 396 L89 397 Q101 396 103 383 L112 310 L112 225 L108 216 L128 216 L124 225 L124 310 L137 383 Q139 396 151 397 L164 396 Q177 393 175 379 L163 278 L157 223 L151 190 Q158 178 157 163 L155 116 L158 119 Q167 126 177 126 L205 126 Q217 126 217 116 L217 103 Q217 91 205 91 L177 91 Q167 91 158 84 C150 81 140 78 131 78 L131 68 C141 62 148 52 148 38 C148 22 137 10 121 10 Z';

export function bodyLimbState(actor, limb) {
  const index = PROSTHETIC_PARTS.findIndex((part) => part.key === limb);
  if (index < 0) return 'is-intact';
  const prosthetic = actor?.equip?.prosthetic?.[index];
  if (prosthetic) return prosthetic.id?.startsWith('iron_') ? 'is-prosthetic-iron' : 'is-prosthetic-wood';
  return actor?.missing?.includes(limb) ? 'is-missing' : 'is-intact';
}

function bodyLimbOverlay(actor) {
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(ns, 'g');
  layer.classList.add('inventory-body-limbs');
  for (const [key, d] of [
    ['lArm', 'M82 111 L16 109'], ['rArm', 'M158 111 L204 109'],
    ['lLeg', 'M97 208 L81 380'], ['rLeg', 'M145 208 L159 380'],
  ]) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.classList.add('inventory-body-limb', `body-limb-${key}`, bodyLimbState(actor, key));
    path.setAttribute('aria-hidden', 'true');
    layer.append(path);
  }
  return layer;
}

const SLOT_NAMES = {
  head: '頭', upperIn: 'シャツ', upperOut: '防具（胴）', lowerIn: 'ズボン・内', lowerOut: 'ズボン・外',
  feet: '靴', acc: 'ベルトの小物', trinket: '装飾品', backpack: '背負い袋', quiver: '矢筒', weapon: '武器', ammo: '矢', prosthetic: '義肢',
};
const PART_NAMES = { head: '頭', chest: '胸', stomach: '腹', arms: '腕', legs: '脚', lArm: '左腕', rArm: '右腕', lLeg: '左脚', rLeg: '右脚' };

export function loadColor(ratio) {
  return ratio <= .5 ? 'green' : ratio <= 1 ? 'yellow' : ratio < 1.2 ? 'orange' : 'red';
}
export function loadPenalty(ratio) {
  const enc = encumbranceFromLoad(ratio);
  return enc === 0 ? '影響なし' : `荷重の罰: 格闘・回避 −${Math.round(enc * 80)}%、速さ −${Math.round(enc * 85)}%`;
}
export function rankColor(rank) {
  return rank <= 2 ? 'gray' : rank <= 4 ? 'white' : rank <= 6 ? 'green' : rank <= 8 ? 'blue' : rank <= 10 ? 'purple' : 'gold';
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}
function eligible(actor, state) {
  return !!actor && actor.faction === 'player' && !actor.machine && !actor.swordsman && actor.state !== 'dead'
    && (state.squadIds?.length ? state.squadIds.includes(actor.id) : actor.id === state.playerId);
}
function getSlot(actor, slot, index) {
  return index == null ? actor.equip?.[slot] : actor.equip?.[slot]?.[index];
}
function itemWeight(obj) {
  const def = ITEMS[obj?.id];
  if (!def) return 0;
  return (def.weight || 0) * qualityOf(obj.rank).weight * (def.stackable ? Math.max(1, obj.n || 1) : 1);
}
function atCanPlace(items, obj, x, y, dims, excluded = null) {
  const size = itemSize(obj.id);
  if (x < 0 || y < 0 || x + size.w > dims.w || y + size.h > dims.h) return false;
  for (const other of items) {
    if (!other || other === excluded || other === obj || other.grid?.c === 'overflow') continue;
    const otherSize = itemSize(other.id), at = other.grid;
    if (!at || at.x < 0 || at.y < 0 || at.x + otherSize.w > dims.w || at.y + otherSize.h > dims.h) continue;
    if (x < at.x + otherSize.w && x + size.w > at.x && y < at.y + otherSize.h && y + size.h > at.y) return false;
  }
  return true;
}
function firstOpen(items, obj, dims) {
  const size = itemSize(obj.id);
  for (let y = 0; y <= dims.h - size.h; y += 1) {
    for (let x = 0; x <= dims.w - size.w; x += 1) if (atCanPlace(items, obj, x, y, dims)) return { x, y };
  }
  return null;
}

export function createInventoryUI(getState, command) {
  const root = el('section', 'inventory-panel hidden');
  root.setAttribute('aria-label', '持ち物');
  document.body.appendChild(root);
  let actorId = null, selected = null, selectedPart = null, partMessage = '', signature = '', dragSource = null;
  let menuOpen = false, touchActive = false;
  function touchSource(node, key) {
    let ghost = null, target = null;
    const locate = (x, y) => document.elementFromPoint(x, y)?.closest('.inventory-cell,.inventory-body-slot,.inventory-slot-card,.inventory-grid-item') || null;
    const hover = (x, y) => {
      ghost?.move(x, y);
      const next = locate(x, y);
      if (target && target !== next) target.dispatchEvent(new Event('dragleave', { bubbles: true }));
      target = next;
      target?.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    };
    const cleanup = () => {
      ghost?.remove(); ghost = null;
      target?.dispatchEvent(new Event('dragleave', { bubbles: true })); target = null;
      root.querySelectorAll('.drop-ok,.drop-no').forEach((entry) => entry.classList.remove('drop-ok', 'drop-no'));
      dragSource = null; touchActive = false;
    };
    bindTouchDrag(node, {
      pending() { touchActive = true; },
      pendingEnd() { touchActive = false; },
      start(x, y) { touchActive = true; dragSource = key; ghost = touchGhost(node, x, y); hover(x, y); },
      move: hover,
      end(x, y) { hover(x, y); const drop = target; if (drop) drop.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true })); cleanup(); signature = ''; update(); },
      cancel() { cleanup(); signature = ''; update(); },
    });
  }
  function selectForMenu(key) {
    const same = selected && JSON.stringify(selected) === JSON.stringify(key) && menuOpen;
    selected = same ? null : key; menuOpen = !same; selectedPart = null; signature = ''; update();
  }
  document.addEventListener('click', (event) => {
    if (!menuOpen || event.target.closest('.inventory-quick-menu') || event.target.closest('.inventory-body-slot,.inventory-slot-card,.inventory-grid-item,.inventory-overflow-item')) return;
    menuOpen = false; selected = null; signature = ''; update();
  });
  root.addEventListener('scroll', () => { if (menuOpen) { menuOpen = false; selected = null; signature = ''; update(); } }, { passive: true });
  panels.register('inventory', {
    parent: 'status', contains: (target) => root.contains(target),
    close: () => { menuOpen = false; actorId = null; selected = null; selectedPart = null; partMessage = ''; root.classList.add('hidden'); },
  });

  function close() { panels.close('inventory'); }
  function open(id) {
    const state = getState(), actor = state.actors.find((entry) => entry.id === id);
    if (!eligible(actor, state)) return false;
    initInventory(actor);
    panels.open('inventory');
    actorId = id; menuOpen = false; selected = null; selectedPart = null; partMessage = ''; signature = ''; root.classList.remove('hidden'); update(); return true;
  }
  function button(text, fn, cls = '') {
    const node = el('button', cls, text);
    node.type = 'button'; node.addEventListener('click', fn);
    return node;
  }
  function sourceObject(actor, source = selected) {
    if (!source) return null;
    if (source.kind === 'equip') return getSlot(actor, source.slot, source.index);
    if (source.kind === 'item') {
      const list = source.container === 'pack' ? actor.equip?.backpack?.contents : actor.inv;
      return list?.[source.index] || null;
    }
    return null;
  }
  function detailText(actor, obj) {
    const def = ITEMS[obj?.id];
    if (!def) return '';
    const parts = [`品質 R${obj.rank || 1}`, `${itemWeight(obj).toFixed(1)} kg`];
    if (def.food) parts.push(`栄養 ${Number(obj.nutrition || def.nutrition) || 0}`);
    if (def.cutRes != null) parts.push(`切り耐性 ${Math.round(Math.min(.9, def.cutRes * qualityOf(obj.rank).res) * 100)}%`);
    if (def.bluntRes != null) parts.push(`打撃耐性 ${Math.round(Math.min(.9, def.bluntRes * qualityOf(obj.rank).res) * 100)}%`);
    if (def.cover) parts.push(Object.entries(def.cover).map(([key, value]) => `${PART_NAMES[key] || key} ${Math.round(value * 100)}%`).join(' / '));
    if (def.vision) parts.push(`視界 −${Math.round(def.vision * 100)}%`);
    if (def.throwable) parts.push(`投擲武器・所持 ${obj.n || 0}個・射程 ${def.throw.range_m}m`);
    if (def.martial) parts.push(`格闘 +${def.martial}`);
    if (obj.ammo) parts.push(`矢 ${obj.ammo.n}本`);
    if (def.stackable && obj.n > 1) parts.push(`${obj.n}個`);
    if (obj.stats?.atkBonus) parts.push(`攻撃 +${obj.stats.atkBonus}`);
    if (obj.stats?.defBonus) parts.push(`防御 +${obj.stats.defBonus}`);
    if (obj.stats?.dmgBonus) parts.push(`切断 +${Math.round(obj.stats.dmgBonus * 100)}%`);
    if (def.upgrade_effect) parts.push(`効果: ${def.upgrade_effect}`);
    return parts.join('・');
  }

  function equipChoice(actor, obj, slot, index) {
    if (index == null && slot === 'weapon') {
      index = actor.equip.weapon.findIndex((entry) => !entry);
      if (index < 0) index = 0;
    }
    if (index == null && (slot === 'acc' || slot === 'trinket')) {
      index = actor.equip[slot].findIndex((entry) => !entry);
      if (index < 0) index = 0;
    }
    return { index, check: canEquip(actor, obj, slot, index) };
  }

  function toEquipment(actor, source, slot, index) {
    const obj = sourceObject(actor, source);
    if (!obj) return false;
    const choice = equipChoice(actor, obj, slot, index);
    if (!choice.check.ok) return false;
    if (source.kind === 'equip') {
      if (source.slot === slot && source.index === choice.index) return true;
      if (!command({ type: 'unequip', actorId, slot: source.slot, index: source.index })) return false;
      const movedIndex = actor.inv.indexOf(obj);
      return movedIndex >= 0 && !!command({ type: 'equip', actorId, invIndex: movedIndex, slot, index: choice.index });
    }
    if (source.container === 'pack') {
      const spot = firstOpen(actor.inv, obj, BODY_GRID);
      if (!spot || !command({ type: 'invMove', actorId, from: 'pack', invIndex: source.index, to: 'body', x: spot.x, y: spot.y })) return false;
    }
    const invIndex = actor.inv.indexOf(obj);
    return invIndex >= 0 && !!command({ type: 'equip', actorId, invIndex, slot, index: choice.index });
  }

  function toGrid(actor, source, container, x, y) {
    const obj = sourceObject(actor, source), dims = inventoryGrid(actor, container);
    if (!obj || dims.w < 1 || dims.h < 1) return false;
    let dest = container === 'pack' ? actor.equip?.backpack?.contents : actor.inv;
    if (!Array.isArray(dest)) return false;
    const excluding = source.kind === 'item' && source.container === container ? obj : null;
    if (!atCanPlace(dest, obj, x, y, dims, excluding)) return false;
    if (source.kind === 'item') {
      return !!command({ type: 'invMove', actorId, from: source.container, invIndex: source.index, to: container, x, y });
    }
    if (source.kind !== 'equip') return false;
    if (!command({ type: 'unequip', actorId, slot: source.slot, index: source.index })) return false;
    const invIndex = actor.inv.indexOf(obj);
    if (invIndex < 0) return false;
    return !!command({ type: 'invMove', actorId, from: 'body', invIndex, to: container, x, y });
  }

  function itemClass(obj) {
    const slot = ITEMS[obj?.id]?.slot || 'item';
    return `inventory-item-icon shape-${slot} ${itemArt(obj?.id).className}`;
  }

  function appendItemIcon(node, obj, extra = '') {
    const icon = itemIconPath(obj?.id);
    if (icon) {
      const image = el('span', `${itemClass(obj)} has-rendered-icon ${extra}`.trim());
      image.style.backgroundImage = `url("./${icon}")`;
      node.append(image);
      return;
    }
    const art = itemArt(obj?.id);
    const shape = `shape-${ITEMS[obj?.id]?.slot || 'item'}`;
    if (art.src) {
      const image = el('img', `inventory-item-icon inventory-item-art ${shape} ${art.className} ${extra}`.trim());
      image.src = art.src; image.alt = ''; image.draggable = false; node.append(image);
    } else {
      node.append(el('span', `inventory-item-icon ${shape} ${art.className} ${extra}`.trim(), ''));
    }
  }
  function setPart(part, message = '') {
    selectedPart = part; partMessage = message; signature = ''; update();
  }

  function validSlots(actor, part, obj) {
    return EQUIPMENT_PARTS[part].slots.filter(([slot, index]) => canEquip(actor, obj, slot, index).ok);
  }

  function choosePartSlot(actor, part, slot, index) {
    const obj = sourceObject(actor);
    if (obj && selected) {
      const check = canEquip(actor, obj, slot, index);
      if (!check.ok) { setPart(part, check.reason || 'ここには装備できません'); return; }
      if (toEquipment(actor, selected, slot, index)) {
        selected = null; setPart(part, `${EQUIPMENT_PARTS[part].name}に装備しました`); return;
      }
      setPart(part, '装備できませんでした'); return;
    }
    const equipped = getSlot(actor, slot, index);
    selected = equipped ? { kind: 'equip', slot, index } : null;
    setPart(part, equipped ? `${SLOT_NAMES[slot] || EQUIPMENT_PARTS[part].name}：${ITEMS[equipped.id]?.name || equipped.id}` : `${EQUIPMENT_PARTS[part].name}は空です`);
  }

  function tapPart(actor, part, fixedSlot = null, fixedIndex = null) {
    const layered = EQUIPMENT_PARTS[part].slots.length > 1;
    const candidates = fixedSlot && (!layered || part === 'belt')
      ? [[fixedSlot, fixedIndex, EQUIPMENT_PARTS[part].name]] : EQUIPMENT_PARTS[part].slots;
    const obj = sourceObject(actor);
    if (obj && selected) {
      const valid = candidates.filter(([slot, index]) => canEquip(actor, obj, slot, index).ok);
      if (valid.length === 1) { choosePartSlot(actor, part, valid[0][0], valid[0][1]); return; }
      if (!valid.length) {
        const check = canEquip(actor, obj, candidates[0][0], candidates[0][1]);
        setPart(part, check.reason || 'この品は装備できません'); return;
      }
      setPart(part); return;
    }
    if (candidates.length === 1) { choosePartSlot(actor, part, candidates[0][0], candidates[0][1]); return; }
    const occupied = candidates.filter(([slot, index]) => !!getSlot(actor, slot, index));
    if (!layered && occupied.length === 1) { choosePartSlot(actor, part, occupied[0][0], occupied[0][1]); return; }
    selected = null; setPart(part);
  }

  function renderBodySlot(actor, part, slot, index, label, extra = '') {
    const obj = getSlot(actor, slot, index), def = ITEMS[obj?.id];
    const key = { kind: 'equip', slot, index };
    const buttonNode = button('', () => { if (obj && (!selected || selected.kind === 'equip')) selectForMenu(key); else { menuOpen = false; tapPart(actor, part, slot, index); } },
      `inventory-body-slot part-${part}${extra ? ` ${extra}` : ''}${obj ? ' is-filled' : ' is-empty'}${selected?.kind === 'equip' && selected.slot === slot && selected.index === index ? ' is-selected' : ''}${selectedPart === part ? ' is-part-selected' : ''}`);
    buttonNode.dataset.part = part; buttonNode.dataset.slot = slot;
    const slotPosition = {
      'body-head': 'head', 'body-torso-in': 'torsoIn', 'body-torso-out': 'torsoOut',
      'body-hand-l': 'handL', 'body-hand-r': 'handR', 'body-backpack': 'backpack',
      'body-legs-in': 'legsIn', 'body-legs-out': 'legsOut', 'body-feet': 'feet',
      'body-trinket-0': 'trinket0', 'body-trinket-1': 'trinket1',
      'body-trinket-2': 'trinket2', 'body-trinket-3': 'trinket3',
    }[extra];
    const slotLayout = INVENTORY_BODY_LAYOUT.slots[slotPosition];
    if (slotLayout) {
      buttonNode.style.left = `${slotLayout[0]}%`;
      buttonNode.style.top = `${slotLayout[1]}%`;
      buttonNode.style.transform = 'translate(-50%, -50%)';
    }
    if (index != null) buttonNode.dataset.index = String(index);
    buttonNode.setAttribute('aria-label', `${label}: ${def?.name || '空'}`);
    buttonNode.title = `${label}${def ? `：${def.name}` : ''}`;
    if (obj) appendItemIcon(buttonNode, obj);
    buttonNode.draggable = !!obj;
    if (obj) touchSource(buttonNode, key);
    if (obj) buttonNode.addEventListener('dragstart', (event) => {
      dragSource = key; event.dataTransfer?.setData('text/plain', 'inventory');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    buttonNode.addEventListener('dragend', () => {
      dragSource = null; root.querySelectorAll('.drop-ok,.drop-no').forEach((entry) => entry.classList.remove('drop-ok', 'drop-no'));
    });
    buttonNode.addEventListener('dragover', (event) => {
      if (!dragSource) return;
      event.preventDefault();
      const dragged = sourceObject(actor, dragSource), valid = dragged && canEquip(actor, dragged, slot, index).ok;
      buttonNode.classList.toggle('drop-ok', !!valid); buttonNode.classList.toggle('drop-no', !valid);
    });
    buttonNode.addEventListener('dragleave', () => buttonNode.classList.remove('drop-ok', 'drop-no'));
    buttonNode.addEventListener('drop', (event) => {
      event.preventDefault(); buttonNode.classList.remove('drop-ok', 'drop-no');
      if (dragSource && toEquipment(actor, dragSource, slot, index)) { selected = null; selectedPart = part; partMessage = `${label}に装備しました`; }
      else if (dragSource) { const dragged = sourceObject(actor, dragSource); partMessage = canEquip(actor, dragged, slot, index).reason || 'ここには装備できません'; selectedPart = part; }
      dragSource = null; signature = ''; update();
    });
    return buttonNode;
  }

function bodySilhouette(actor) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 220 430'); svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('inventory-body-art');
    const shape = document.createElementNS(ns, 'path');
    shape.setAttribute('d', INVENTORY_BODY_PATH);
    shape.setAttribute('class', 'inventory-body-shape');
    svg.append(shape);
  svg.append(bodyLimbOverlay(actor));
    return svg;
  }

  function renderBodyHit(actor, part, label, position) {
    const hit = button('', () => tapPart(actor, part), `inventory-body-hit body-hit-${position}`);
    hit.dataset.bodyPart = part;
    hit.setAttribute('aria-label', `${label}を選択`);
    return hit;
  }

  function renderEquipmentLeaders(stage) {
    const ns = 'http://www.w3.org/2000/svg';
    const layer = document.createElementNS(ns, 'svg');
    layer.setAttribute('viewBox', '0 0 1000 1000');
    layer.setAttribute('preserveAspectRatio', 'none');
    layer.setAttribute('aria-hidden', 'true');
    layer.classList.add('inventory-body-leaders');
    stage.prepend(layer);
    const artRect = stage.querySelector('.inventory-body-art').getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    for (const frame of stage.querySelectorAll('.inventory-body-slot')) {
      const slot = frame.dataset.slot;
      const idx = frame.dataset.index == null ? null : Number(frame.dataset.index);
      let target = INVENTORY_BODY_ANCHORS[slot];
      if (slot === 'weapon') target = INVENTORY_BODY_ANCHORS[idx === 0 ? 'handL' : 'handR'];
      if (slot === 'trinket') target = INVENTORY_BODY_ANCHORS[`trinket${idx}`];
      if (slot === 'acc' || slot === 'quiver') target = null;
      if (!target) continue;
      const rect = frame.getBoundingClientRect();
      const centerX = (rect.left + rect.width / 2 - stageRect.left) / stageRect.width;
      const fromX = centerX < .5 ? rect.right - stageRect.left : rect.left - stageRect.left;
      const fromY = rect.top + rect.height / 2 - stageRect.top;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(fromX / stageRect.width * 1000));
      line.setAttribute('y1', String(fromY / stageRect.height * 1000));
      const targetX = artRect.left + target[0] / 220 * artRect.width - stageRect.left;
      const targetY = artRect.top + target[1] / 430 * artRect.height - stageRect.top;
      line.setAttribute('x2', String(targetX / stageRect.width * 1000));
      line.setAttribute('y2', String(targetY / stageRect.height * 1000));
      line.classList.add('inventory-body-leader');
      layer.append(line);
    }
    const belt = stage.querySelector('.inventory-belt-hits');
    if (belt) [...belt.querySelectorAll('.inventory-body-slot')].forEach((frame, index) => {
      const rect = frame.getBoundingClientRect();
      const centerX = (rect.left + rect.width / 2 - stageRect.left) / stageRect.width;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(centerX * 1000));
      line.setAttribute('y1', String((rect.top - stageRect.top) / stageRect.height * 1000));
      const waist = INVENTORY_BODY_ANCHORS.belt;
      const bodyX = 89 + index * (150 - 89) / 4;
      const targetX = artRect.left + bodyX / 220 * artRect.width - stageRect.left;
      const targetY = artRect.top + waist[1] / 430 * artRect.height - stageRect.top;
      line.setAttribute('x2', String(targetX / stageRect.width * 1000));
      line.setAttribute('y2', String(targetY / stageRect.height * 1000));
      line.classList.add('inventory-body-leader');
      layer.append(line);
    });
  }

  function renderLayerPicker(actor, part) {
    if (selectedPart !== part || EQUIPMENT_PARTS[part].slots.length < 2) return null;
    const choices = EQUIPMENT_PARTS[part].slots;
    const picker = el('div', 'inventory-layer-picker');
    picker.setAttribute('aria-label', `${EQUIPMENT_PARTS[part].name}の層を選択`);
    for (const [slot, index, label] of choices) {
      const obj = getSlot(actor, slot, index), can = sourceObject(actor) && selected ? canEquip(actor, sourceObject(actor), slot, index) : null;
      const option = button('', () => choosePartSlot(actor, part, slot, index), 'inventory-layer-choice');
      appendItemIcon(option, obj || { id: can?.ok ? sourceObject(actor).id : slot });
      option.append(el('span', '', label));
      option.setAttribute('aria-label', `${label}${obj ? `：${ITEMS[obj.id]?.name || obj.id}` : '：空'}`);
      if (can && !can.ok) option.disabled = true;
      picker.append(option);
    }
    return picker;
  }

  function renderEquipmentSlot(actor, slot, label, index, extraClass = '') {
    const obj = getSlot(actor, slot, index), def = ITEMS[obj?.id];
    const key = { kind: 'equip', slot, index };
    const node = button('', () => {
      if (selected && selected.kind !== 'equip') {
        const current = sourceObject(actor);
        if (current && toEquipment(actor, selected, slot, index)) selected = null;
      } else {
        if (obj) { selectForMenu(key); return; }
      }
      menuOpen = false; signature = ''; update();
    }, `inventory-slot-card slot-${slot} ${extraClass}${obj ? ' is-filled' : ''}${selected?.kind === 'equip' && selected.slot === slot && selected.index === index ? ' is-selected' : ''}`);
    node.dataset.slot = slot;
    if (index != null) node.dataset.index = String(index);
    node.setAttribute('aria-label', `${label}: ${def?.name || '空'}`);
    if (obj) {
      node.draggable = true;
      touchSource(node, key);
      node.addEventListener('dragstart', (event) => {
        dragSource = key; event.dataTransfer?.setData('text/plain', 'inventory');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
      node.addEventListener('dragend', () => { dragSource = null; root.querySelectorAll('.drop-ok,.drop-no').forEach((entry) => entry.classList.remove('drop-ok', 'drop-no')); });
      appendItemIcon(node, obj);
      node.append(el('span', 'inventory-slot-label', label), el('strong', 'inventory-slot-name', def?.name || obj.id));
    } else {
      node.append(el('span', 'inventory-item-icon is-empty', ''), el('span', 'inventory-slot-label', label), el('span', 'inventory-slot-name is-empty-text', '空'));
    }
    node.addEventListener('dragover', (event) => {
      if (!dragSource) return;
      event.preventDefault();
      const obj = sourceObject(actor, dragSource);
      const valid = obj && equipChoice(actor, obj, slot, index).check.ok;
      node.classList.toggle('drop-ok', !!valid);
      node.classList.toggle('drop-no', !valid);
    });
    node.addEventListener('dragleave', () => node.classList.remove('drop-ok', 'drop-no'));
    node.addEventListener('drop', (event) => {
      event.preventDefault(); node.classList.remove('drop-ok', 'drop-no');
      const source = dragSource;
      if (source && toEquipment(actor, source, slot, index)) selected = null;
      dragSource = null; signature = ''; update();
    });
    return node;
  }

  function renderEquipment(actor) {
    const area = el('section', 'inventory-equipment-area inventory-body-layout');
    area.setAttribute('aria-label', '人の体の絵から装備を選ぶ');
    const stage = el('div', 'inventory-body-stage');
    stage.append(bodySilhouette(actor));
    stage.style.setProperty('--body-left', `${INVENTORY_BODY_LAYOUT.silhouette.left}%`);
    stage.style.setProperty('--body-top', `${INVENTORY_BODY_LAYOUT.silhouette.top}%`);
    stage.style.setProperty('--body-width', `${INVENTORY_BODY_LAYOUT.silhouette.width}%`);
    stage.style.setProperty('--body-height', `${INVENTORY_BODY_LAYOUT.silhouette.height}%`);
    for (const [part, label, position] of [
      ['head', '頭', 'head'], ['torso', '胴', 'torso'], ['handL', '左手', 'hand-l'], ['handR', '右手', 'hand-r'],
      ['belt', '腰・ベルト', 'belt'], ['legs', '脚', 'legs'], ['feet', '足', 'feet'],
    ]) stage.append(renderBodyHit(actor, part, label, position));
    const add = (part, slot, index, label, cls) => stage.append(renderBodySlot(actor, part, slot, index, label, cls));
    add('head', 'head', null, '頭', 'body-head');
    add('torso', 'upperIn', null, '胴・内側／シャツ', 'body-torso-in');
    add('torso', 'upperOut', null, '胴・外側／防具', 'body-torso-out');
    add('handL', 'weapon', 0, '左手／武器 I', 'body-hand-l');
    add('handR', 'weapon', 1, '右手／武器 II', 'body-hand-r');
    add('backpack', 'backpack', null, '背中／背負い袋', 'body-backpack');
    add('legs', 'lowerIn', null, '脚・内側／ズボン', 'body-legs-in');
    add('legs', 'lowerOut', null, '脚・外側／防具', 'body-legs-out');
    add('feet', 'feet', null, '足／靴', 'body-feet');
    for (const [slot, index, label] of EQUIPMENT_PARTS.trinkets.slots) add('trinkets', slot, index, label, `body-trinket-${index}`);
    const belt = el('div', 'inventory-belt-hits');
    for (const [slot, index, label] of EQUIPMENT_PARTS.belt.slots) belt.append(renderBodySlot(actor, 'belt', slot, index, label, 'body-belt-slot'));
    stage.append(belt);
    const prostheticSection = el('section', 'inventory-prosthetic-equipment');
    prostheticSection.append(el('h3', '', '義肢の装備欄'));
    const prostheticSlots = el('div', 'inventory-prosthetic-slots');
    for (const [index, part] of PROSTHETIC_PARTS.entries()) {
      const label = ({ lArm: '左腕', rArm: '右腕', lLeg: '左脚', rLeg: '右脚' })[part.key];
      prostheticSlots.append(renderEquipmentSlot(actor, 'prosthetic', label, index, `prosthetic-part-${part.key}`));
    }
    prostheticSection.append(prostheticSlots);
    area.append(stage);
    area.append(prostheticSection);
    const swap = button('⇄ 武器を持ち替え', () => { command({ type: 'swapWeapon', actorId }); selected = null; signature = ''; update(); }, 'inventory-swap-weapons');
    swap.setAttribute('aria-label', '武器 I と武器 II を持ち替え'); swap.title = '持ち替え'; area.append(swap);
    for (const part of ['torso', 'legs']) {
      const picker = renderLayerPicker(actor, part);
      if (picker) area.append(picker);
    }
    if (selectedPart) {
      const hint = el('div', 'inventory-part-hint');
      const partName = EQUIPMENT_PARTS[selectedPart]?.name || selectedPart;
      const obj = sourceObject(actor);
      hint.textContent = partMessage || `${partName}${obj ? `：${ITEMS[obj.id]?.name || obj.id}を装備` : 'を選択'}`;
      area.append(hint);
    }
    return area;
  }

  function renderGrid(actor, container, title) {
    const dims = inventoryGrid(actor, container);
    const items = container === 'pack' ? actor.equip.backpack.contents : actor.inv;
    const section = el('section', `inventory-store inventory-store-${container}`);
    const heading = el('div', 'inventory-store-heading');
    heading.append(el('h3', '', title), el('span', 'inventory-grid-size', `${dims.w} × ${dims.h}`));
    if (container === 'body') heading.append(button('整理', () => { command({ type: 'invSort', actorId }); selected = null; signature = ''; update(); }, 'inventory-sort-button'));
    section.append(heading);
    const board = el('div', 'inventory-grid-board');
    board.style.gridTemplateColumns = `repeat(${dims.w}, var(--inventory-cell-size))`;
    board.style.gridTemplateRows = `repeat(${dims.h}, var(--inventory-cell-size))`;
    board.setAttribute('aria-label', `${title}のマス目`);
    const source = (index) => ({ kind: 'item', container, index });
    for (let y = 0; y < dims.h; y += 1) for (let x = 0; x < dims.w; x += 1) {
      const cell = button('', () => {
        if (selected && toGrid(actor, selected, container, x, y)) selected = null;
        else if (!selected) selected = null;
        signature = ''; update();
      }, 'inventory-cell');
      cell.style.gridColumn = String(x + 1); cell.style.gridRow = String(y + 1);
      cell.setAttribute('aria-label', `${title} ${x + 1}列 ${y + 1}行`);
      cell.addEventListener('dragover', (event) => {
        if (!dragSource) return;
        event.preventDefault();
        const obj = sourceObject(actor, dragSource), targetItems = container === 'pack' ? actor.equip.backpack.contents : actor.inv;
        const exclude = dragSource.kind === 'item' && dragSource.container === container ? obj : null;
        const valid = obj && atCanPlace(targetItems, obj, x, y, dims, exclude);
        cell.classList.toggle('drop-ok', !!valid); cell.classList.toggle('drop-no', !valid);
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drop-ok', 'drop-no'));
      cell.addEventListener('drop', (event) => {
        event.preventDefault(); cell.classList.remove('drop-ok', 'drop-no');
        const from = dragSource;
        if (from && toGrid(actor, from, container, x, y)) selected = null;
        dragSource = null; signature = ''; update();
      });
      board.append(cell);
    }
    items.forEach((obj, index) => {
      if (obj?.grid?.c !== container) return;
      const size = itemSize(obj.id), def = ITEMS[obj.id], itemSource = source(index);
      const narrow = size.w === 1 && size.h > 1;
      const card = button('', () => {
        selectForMenu(itemSource);
      }, `inventory-grid-item ${itemKindClass(obj)}${narrow ? ' is-narrow' : ''}${selected?.kind === 'item' && selected.container === container && selected.index === index ? ' is-selected' : ''}`);
      card.style.gridColumn = `${obj.grid.x + 1} / span ${size.w}`;
      card.style.gridRow = `${obj.grid.y + 1} / span ${size.h}`;
      card.draggable = true;
      touchSource(card, itemSource);
      const stolen = activeStolenMark(obj.stolen, getState()?.timeSec);
      const stolenText = stolen ? `盗品（${stolenTownName(getState(), stolen)}）` : '';
      card.setAttribute('aria-label', `${def?.name || obj.id}${obj.n > 1 ? ` ${obj.n}個` : ''}${stolen ? `、${stolenText}` : ''}、${size.w}×${size.h}マス`);
      if (stolen) {
        card.classList.add('is-stolen');
        card.title = stolenText;
        card.append(el('span', 'inventory-stolen-mark', '盗'));
      }
      appendItemArt(card, obj);
      card.append(el('span', 'inventory-grid-item-name', def?.name || obj.id));
      if (obj.n > 1 || obj.rank > 1) card.append(el('span', 'inventory-grid-item-count', obj.n > 1 ? `×${obj.n}` : `R${obj.rank}`));
      card.addEventListener('dragstart', (event) => {
        dragSource = itemSource; event.dataTransfer?.setData('text/plain', 'inventory');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => { dragSource = null; root.querySelectorAll('.drop-ok,.drop-no').forEach((entry) => entry.classList.remove('drop-ok', 'drop-no')); });
      card.addEventListener('dragover', (event) => {
        if (!dragSource) return;
        event.preventDefault(); card.classList.add('drop-no');
      });
      card.addEventListener('drop', (event) => {
        event.preventDefault(); card.classList.remove('drop-no');
        dragSource = null;
      });
      board.append(card);
    });
    section.append(board);
    const overflow = items.map((obj, index) => ({ obj, index })).filter(({ obj }) => obj?.grid?.c === 'overflow');
    if (overflow.length) {
      const tray = el('div', 'inventory-overflow');
      tray.append(el('strong', '', `入りきらない物 ${overflow.length}`));
      for (const { obj, index } of overflow) {
        const line = button(`${ITEMS[obj.id]?.name || obj.id}${obj.n > 1 ? ` ×${obj.n}` : ''}`, () => {
          selectForMenu(source(index));
        }, `inventory-overflow-item${selected?.kind === 'item' && selected.container === container && selected.index === index ? ' is-selected' : ''}`);
        line.draggable = true;
        touchSource(line, source(index));
        line.addEventListener('dragstart', (event) => { dragSource = source(index); event.dataTransfer?.setData('text/plain', 'inventory'); });
        tray.append(line);
      }
      section.append(tray);
    }
    return section;
  }

  function renderDetail(actor) {
    const obj = sourceObject(actor);
    const def = ITEMS[obj?.id];
    if (!obj || !def) return null;
    const detail = el('section', 'inventory-detail');
    detail.append(el('div', 'inventory-detail-title', def.name + (obj.n > 1 ? ` ×${obj.n}` : '')));
    detail.append(el('div', 'inventory-detail-meta', detailText(actor, obj)));
    const stolen = activeStolenMark(obj.stolen, getState()?.timeSec);
    if (stolen) detail.append(el('div', 'inventory-stolen-description', `盗品（${stolenTownName(getState(), stolen)}）`));
    if (def.desc) detail.append(el('div', 'inventory-description', def.desc));
    if (def.flavor) detail.append(el('div', 'inventory-flavor', def.flavor));
    if (selected.kind === 'item' && def.throwable) detail.append(el('div', '', '敵を選ぶと自動で投げます。'));
    if (selected.kind === 'item' && def.slot === 'prosthetic') {
      const options = PROSTHETIC_PARTS.map((part, index) => ({ part, index, check: canEquip(actor, obj, 'prosthetic', index) })).filter((entry) => entry.check.ok);
      for (const { part, index } of options) {
        const label = ({ lArm: '左腕', rArm: '右腕', lLeg: '左脚', rLeg: '右脚' })[part.key];
        detail.append(button(`${label}に装着`, () => {
          if (toEquipment(actor, selected, 'prosthetic', index)) selected = null;
          signature = ''; update();
        }, 'inventory-action'));
      }
      if (!options.length) {
        const part = PROSTHETIC_PARTS.find((entry) => entry.kind === def.prostheticPart);
        const index = part ? PROSTHETIC_PARTS.indexOf(part) : 0;
        detail.append(el('div', 'inventory-action-reason', canEquip(actor, obj, 'prosthetic', index).reason));
      }
    } else if (selected.kind === 'item' && !def.throwable) {
      const choice = equipChoice(actor, obj, def.slot);
      if (choice.check.ok) detail.append(button('装備', () => {
        if (toEquipment(actor, selected, def.slot, choice.index)) selected = null;
        signature = ''; update();
      }, 'inventory-action'));
      else detail.append(el('div', 'inventory-action-reason', choice.check.reason));
    } else if (selected.kind === 'equip') {
      detail.append(button('外す', () => {
        command({ type: 'unequip', actorId, slot: selected.slot, index: selected.index });
        selected = null; signature = ''; update();
      }, 'inventory-action'));
    }
    return detail;
  }

  function statusLabels(actor) {
    const labels = [];
    if (Number.isFinite(actor.hunger)) labels.push(`満腹度 ${Math.round(actor.hunger)}%`);
    if (Number.isFinite(actor.food)) labels.push(`食料 ${Math.max(0, Math.floor(actor.food))}`);
    if (Array.isArray(actor.missing) && actor.missing.length) labels.push(`欠損 ${actor.missing.map((key) => PART_NAMES[key] || key).join('・')}`);
    if (actor.parts && typeof actor.parts === 'object') {
      for (const [key, part] of Object.entries(actor.parts)) {
        if (Number.isFinite(part?.hp) && Number.isFinite(part?.max) && part.hp < part.max - .01) {
          labels.push(`${PART_NAMES[key] || key} ${Math.max(0, Math.round(part.hp))}/${Math.round(part.max)}`);
        }
      }
    }
    return labels;
  }

  function update() {
    if (actorId === null) return;
    const state = getState(), actor = state.actors.find((entry) => entry.id === actorId);
    if (!eligible(actor, state)) { close(); return; }
    // Keep the menu buttons stable while the simulation advances.
    if (menuOpen && signature) return;
    ensureInventoryLayout(actor);
    const theftState = [];
    const collectTheft = (item, seen = new Set()) => {
      if (!item || typeof item !== 'object' || seen.has(item)) return;
      seen.add(item);
      if (item.stolen) theftState.push([item.stolen.stolenAtSec, !!activeStolenMark(item.stolen, state.timeSec)]);
      for (const child of item.contents || []) collectTheft(child, seen);
      if (item.ammo) collectTheft(item.ammo, seen);
    };
    const seenTheft = new Set();
    for (const item of actor.inv || []) collectTheft(item, seenTheft);
    for (const value of Object.values(actor.equip || {})) for (const item of Array.isArray(value) ? value : [value]) collectTheft(item, seenTheft);
    const sig = JSON.stringify([actor.equip, actor.inv, theftState, actor.skills?.strength, actor.hunger, actor.parts, actor.missing, selected, selectedPart, partMessage]);
    if (sig === signature) return;
    signature = sig; root.replaceChildren();
    const head = el('div', 'inventory-head');
    const title = el('strong', '', `${actor.name} の持ち物`);
    const dismiss = button('×', close, 'inventory-close sheet-close');
    dismiss.setAttribute('aria-label', '閉じる');

    const ratio = loadRatio(actor), weight = carriedWeight(actor), capacity = carryCapacity(actor);
    const status = el('div', 'inventory-load');
    const readout = el('div', 'inventory-load-readout');
    readout.append(el('strong', '', `${weight.toFixed(1)}/${capacity.toFixed(1)}kg`), el('span', '', `${Math.round(ratio * 100)}%`));
    const track = el('div', 'inventory-track'), fill = el('div', `inventory-fill ${loadColor(ratio)}`);
    fill.style.width = `${Math.min(100, ratio / 1.2 * 100)}%`; track.append(fill);
    const statusLine = el('div', 'inventory-status-line');
    statusLine.append(el('span', 'inventory-penalty', loadPenalty(ratio)));
    const states = statusLabels(actor);
    if (states.length) statusLine.append(el('span', 'inventory-status-labels', states.join('　・　')));
    status.append(readout, track, statusLine);
    head.append(title, status, dismiss); root.append(head);

    const layout = el('div', 'inventory-layout');
    layout.append(renderEquipment(actor));
    const storage = el('section', 'inventory-storage-area');
    const grids = el('div', 'inventory-grids');
    grids.append(renderGrid(actor, 'body', '持ち物'));
    if (actor.equip?.backpack && ITEMS[actor.equip.backpack.id]?.slot === 'backpack') {
      actor.equip.backpack.contents ||= [];
      grids.append(renderGrid(actor, 'pack', `${ITEMS[actor.equip.backpack.id].name}の中`));
    }
    storage.append(grids); layout.append(storage); root.append(layout);
    renderEquipmentLeaders(layout.querySelector('.inventory-body-stage'));
    const detail = renderDetail(actor);
    if (detail) root.append(detail);
    if (menuOpen && selected && detail) {
      const anchor = root.querySelector('.inventory-body-slot.is-selected, .inventory-slot-card.is-selected, .inventory-grid-item.is-selected, .inventory-overflow-item.is-selected');
      if (anchor) {
        const menu = el('div', 'inventory-quick-menu');
        menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', '\u30a2\u30a4\u30c6\u30e0\u64cd\u4f5c');
        menu.append(el('strong', 'inventory-quick-title', ITEMS[sourceObject(actor)?.id]?.name || ''));
        for (const action of detail.querySelectorAll('.inventory-action')) {
          const copy = button(action.textContent, () => { menuOpen = false; action.click(); }, 'inventory-action');
          if (selected.kind === 'item' && ITEMS[sourceObject(actor)?.id]?.slot === 'prosthetic') copy.textContent = '\u7fa9\u80a2\u3092\u88c5\u7740\uff1a' + copy.textContent;
          menu.append(copy);
        }
        const reason = detail.querySelector('.inventory-action-reason');
        if (reason) menu.append(el('span', 'inventory-action-reason', reason.textContent));
        menu.append(button('\u9589\u3058\u308b', () => { menuOpen = false; selected = null; signature = ''; update(); }, 'inventory-quick-close'));
        root.append(menu);
        const rect = anchor.getBoundingClientRect(), box = menu.getBoundingClientRect();
        const left = rect.right + box.width + 8 <= innerWidth ? rect.right + 6 : rect.left - box.width - 6;
        menu.style.left = Math.max(4, Math.min(innerWidth - box.width - 4, left)) + 'px';
        menu.style.top = Math.max(4, Math.min(innerHeight - box.height - 4, rect.top)) + 'px';
      }
    }
  }

  return {
    open, close, update,
    selectSlot(slot, index = null) {
      const actor = getState()?.actors?.find(entry => entry.id === actorId);
      if (!getSlot(actor, slot, index)) return false;
      selectForMenu({ kind: 'equip', slot, index }); return true;
    },
    selectItem(id) {
      const actor = getState()?.actors?.find((entry) => entry.id === actorId);
      const index = actor?.inv?.findIndex((item) => item.id === id) ?? -1;
      if (index < 0) return false;
      selected = { kind: 'item', container: 'body', index }; signature = ''; update(); return true;
    },
    selectPart(part) {
      if (!EQUIPMENT_PARTS[part]) return false;
      if (!actorId && !open(getState()?.playerId)) return false;
      const actor = getState()?.actors?.find((entry) => entry.id === actorId);
      if (!actor) return false;
      selected = null; selectedPart = part; partMessage = '';
      const slots = EQUIPMENT_PARTS[part].slots;
      const occupied = slots.filter(([slot, index]) => !!getSlot(actor, slot, index));
      if (slots.length === 1 || occupied.length === 1) {
        const [slot, index] = slots.length === 1 ? slots[0] : occupied[0];
        const obj = getSlot(actor, slot, index);
        selected = obj ? { kind: 'equip', slot, index } : null;
        partMessage = obj ? `${EQUIPMENT_PARTS[part].name}：${ITEMS[obj.id]?.name || obj.id}` : `${EQUIPMENT_PARTS[part].name}は空です`;
      }
      signature = ''; update(); return true;
    },
    toggle(id) { if (actorId === id) close(); else open(id); },
  };
}

