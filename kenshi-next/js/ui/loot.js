import { bindTouchDrag, touchGhost } from './inventory_touch.js';
import { panels } from './panels.js';
import { ITEMS } from '../sim/items.js';
import { lootItems, takeAllLoot } from '../sim/loot.js';
import { normalizeKits } from '../sim/medkit.js';
import { ensureInventoryLayout } from '../sim/inventory.js';
import { GOODS } from '../sim/trade.js';
import { BUILD_MATERIALS } from '../data/buildings.js';
import { itemArt } from '../data/item_art.js';
import { itemIconPath } from '../data/item_icons.js';
import { BODY_GRID } from '../data/item_sizes.js';
import { inventoryGrid } from '../sim/inventory.js';
import { appendItemArt, itemKindClass, placeGridItems } from './item_grid.js';
import { activeStolenMark, stolenTownName } from '../sim/stolen_goods.js';

const EXISTING_ITEM_NAMES = { flag_kit: '旗キット' };

export function lootItemName(item) {
  const id = item?.id;
  return ITEMS[id]?.name || GOODS[id]?.name || BUILD_MATERIALS[id] || EXISTING_ITEM_NAMES[id] || '不明な品';
}

export function compactLootGridDims(entries, dims) {
  for (let height = 1; height <= dims.h; height += 1) {
    if (placeGridItems(entries, { w: dims.w, h: height }).length === entries.length) {
      return { w: dims.w, h: Math.min(dims.h, height + 1) };
    }
  }
  return dims;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function lootItemIconSpec(item) {
  const path = itemIconPath(item?.id);
  if (path) {
    return { mode: 'rendered', className: 'loot-item-icon inventory-item-icon has-rendered-icon', src: `./${path}` };
  }
  const art = itemArt(item?.id);
  const shape = `shape-${ITEMS[item?.id]?.slot || 'item'}`;
  const classes = `loot-item-icon inventory-item-icon ${shape} ${art.className}`;
  if (art.src) return { mode: 'image', className: `${classes} inventory-item-art`, src: art.src };
  return { mode: 'shape', className: classes, src: null };
}

function itemIcon(item) {
  const spec = lootItemIconSpec(item);
  if (spec.mode === 'shape') return el('span', spec.className);
  if (spec.mode === 'image') {
    const image = el('img', spec.className);
    image.src = spec.src;
    image.alt = '';
    image.draggable = false;
    return image;
  }
  const icon = el('span', spec.className);
  icon.style.backgroundImage = `url("${spec.src}")`;
  return icon;
}

export function createLootUI(getState, command) {
  const root = el('section', 'loot-panel hidden');
  root.setAttribute('aria-label', 'あさる');
  document.body.append(root);
  let actorId = null, targetId = null, boxId = null, groundId = null, notice = '', noticeUntil = 0, signature = '', boxAllPending = false, boxAllObserved = false;

  let touchActive = false, mouseDrag = null;
  function sourceStillPresent(source, direction, item) {
    if (source.kind !== 'inv' && source.kind !== 'stored') return true;
    const state = getState();
    if (source.kind === 'stored') return state.town?.boxes?.find((box) => box.id === boxId)?.storedItems?.[source.index] === item;
    const owner = state.actors?.find((actor) => actor.id === (direction === 'return' ? actorId : targetId));
    return (source.container === 'pack' ? owner?.equip?.backpack?.contents : owner?.inv)?.[source.index] === item;
  }
  function touchSource(node, source, direction, item) {
    let ghost, target;
    const hover = (x, y) => {
      ghost?.move(x, y);
      target?.classList.remove('drop-ok');
      const side = document.elementFromPoint(x, y)?.closest('.loot-side');
      target = side && side.classList.contains(direction === 'take' ? 'loot-destination' : 'loot-source') ? side : null;
      target?.classList.add('drop-ok');
    };
    const cleanup = () => { ghost?.remove(); target?.classList.remove('drop-ok'); ghost = target = null; touchActive = false; };
    bindTouchDrag(node, {
      pending() { touchActive = true; },
      pendingEnd() { touchActive = false; },
      start(x, y) { touchActive = true; ghost = touchGhost(node, x, y); hover(x, y); },
      move: hover,
      end(x, y) { hover(x, y); const valid = !!target; cleanup(); if (valid && sourceStillPresent(source, direction, item)) transfer(source, direction); else { signature = ''; render(); } },
      cancel() { cleanup(); signature = ''; render(); },
    });
  }
  panels.register('loot', {
    contains: (target) => root.contains(target),
    close: () => { root.classList.add('hidden'); actorId = targetId = boxId = groundId = null; signature = ''; boxAllPending = boxAllObserved = false; },
  });

  function close() { panels.close('loot'); }
  function transfer(source, direction = 'take') {
    const ok = boxId == null
      ? command({ type: 'lootTransfer', actorId, targetId, source, direction })
      : direction === 'return' || source.kind === 'stored'
        ? command({ type: 'boxItemTransfer', actorId, boxId, source, direction })
        : command({ type: 'steal', actorId, boxId, good: source.good || undefined, all: direction === 'all' });
    notice = ok ? (direction === 'return' ? '戻しました' : '移しました') : '入りきらない / 重すぎる';
    noticeUntil = Date.now() + 1800;
    signature = '';
    render();
  }
  function itemButton(item, source, direction, label, opts = {}) {
    const button = el('button', `loot-grid-item inventory-grid-item ${itemKindClass(item)}${opts.narrow ? ' is-narrow' : ''}${opts.resource ? ` loot-resource-item is-${opts.resource}` : ''}`);
    button.type = 'button';
    button.disabled = !!opts.disabled;
    const name = opts.name || lootItemName(item);
    const count = Number(item?.n) || 0;
    const state = getState();
    const stolen = activeStolenMark(item?.stolen, state?.timeSec);
    const stolenText = stolen ? `盗品（${stolenTownName(state, stolen)}）` : '';
    button.setAttribute('aria-label', `${label} ${name}${count > 1 ? ` ${count}個` : ''}${stolen ? `、${stolenText}` : ''}`);
    button.title = stolen ? `${name}：${stolenText}` : name;
    if (stolen) {
      button.classList.add('is-stolen');
      button.append(el('span', 'inventory-stolen-mark', '盗'));
    }
    if (!opts.resource && itemIconPath(item?.id)) button.append(itemIcon(item));
    else appendItemArt(button, item, opts.resource ? `loot-resource-icon is-${opts.resource}` : '');
    button.append(el('span', 'inventory-grid-item-name', name));
    if (count > 1 || item?.rank > 1) button.append(el('span', 'inventory-grid-item-count', opts.countText || (count > 1 ? `×${count}` : `R${item.rank}`)));
    if (source && !opts.disabled) {
      touchSource(button, source, direction, item);
      button.draggable = true;
      button.addEventListener('dragstart', (event) => {
        mouseDrag = { source, direction, item }; event.dataTransfer?.setData('text/plain', 'loot');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });
      button.addEventListener('dragend', () => { mouseDrag = null; root.querySelectorAll('.drop-ok').forEach((side) => side.classList.remove('drop-ok')); });
      button.addEventListener('click', () => transfer(source, direction));
    }
    
    return button;
  }
  function board(title, dims, entries, { disabled = false, label = title, compact = false, kind = '' } = {}) {
    const boardDims = compact ? compactLootGridDims(entries, dims) : dims;
    const group = el('section', `loot-own-group loot-grid-group${kind ? ` ${kind}` : ''}`);
    group.append(el('h3', '', title));
    const grid = el('div', 'inventory-grid-board loot-grid-board');
    grid.style.gridTemplateColumns = `repeat(${boardDims.w}, var(--inventory-cell-size))`;
    grid.style.gridTemplateRows = `repeat(${boardDims.h}, var(--inventory-cell-size))`;
    grid.setAttribute('aria-label', `${title}のアイコングリッド`);
    for (let y = 0; y < boardDims.h; y += 1) for (let x = 0; x < boardDims.w; x += 1) {
      const cell = el('span', 'inventory-cell loot-grid-cell');
      cell.style.gridColumn = String(x + 1); cell.style.gridRow = String(y + 1); cell.setAttribute('aria-hidden', 'true');
      grid.append(cell);
    }
    for (const placed of placeGridItems(entries, boardDims)) {
      const { entry, x, y, size } = placed;
      const item = entry.item || entry;
      const button = itemButton(item, entry.source, entry.direction || 'take', entry.label || label, { disabled: disabled || entry.disabled, size, narrow: size.w === 1 && size.h > 1, name: entry.name });
      button.style.gridColumn = `${x + 1} / span ${size.w}`;
      button.style.gridRow = `${y + 1} / span ${size.h}`;
      grid.append(button);
    }
    group.append(grid);
    if (!entries.length) group.append(el('p', 'loot-empty', '空です'));
    return group;
  }
  function equipmentFrame(title, entries, disabled = false) {
    const group = el('section', 'loot-own-group loot-equipment-group');
    group.append(el('h3', '', title));
    const frame = el('div', 'loot-equipment-grid');
    for (const entry of entries) {
      const item = entry.item || entry;
      const button = itemButton(item, entry.source, entry.direction || 'take', entry.label || title, { disabled: disabled || entry.disabled, name: entry.name });
      button.classList.add('loot-equipment-item');
      button.append(el('span', 'loot-equipment-part', entry.label || '装備'));
      frame.append(button);
    }
    if (!entries.length) group.append(el('p', 'loot-empty', '装備はありません'));
    else group.append(frame);
    return group;
  }
  function resourceGrid(title, entries, disabled = false) {
    const group = el('section', 'loot-own-group loot-grid-group loot-resource-group');
    group.append(el('h3', '', title));
    if (!entries.length) { group.append(el('p', 'loot-empty', 'ありません')); return group; }
    const dims = { w: Math.min(4, entries.length), h: Math.ceil(entries.length / 4) };
    const grid = el('div', 'inventory-grid-board loot-resource-grid');
    grid.style.gridTemplateColumns = `repeat(${dims.w}, var(--inventory-cell-size))`;
    grid.style.gridTemplateRows = `repeat(${dims.h}, var(--inventory-cell-size))`;
    grid.setAttribute('aria-label', `${title}のアイコングリッド`);
    entries.forEach((entry, index) => {
      const item = entry.item || entry;
      const resource = entry.resource || 'kit';
      const name = entry.name || (resource === 'money' ? 'キャッシュ' : resource === 'food' ? '食料' : '手当ての道具');
      const btn = itemButton(item, entry.source, entry.direction || 'take', entry.label || title, { disabled: disabled || entry.disabled, resource, name, countText: resource === 'food' ? `${item.n}つ` : `×${item.n}` });
      btn.style.gridColumn = String(index % 4 + 1); btn.style.gridRow = String(Math.floor(index / 4) + 1);
      grid.append(btn);
    });
    group.append(grid); return group;
  }
  function dropSide(side, direction) {
    side.addEventListener('dragover', (event) => {
      if (!mouseDrag || mouseDrag.direction !== direction) return;
      event.preventDefault(); side.classList.add('drop-ok');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    });
    side.addEventListener('dragleave', (event) => { if (!side.contains(event.relatedTarget)) side.classList.remove('drop-ok'); });
    side.addEventListener('drop', (event) => {
      if (!mouseDrag || mouseDrag.direction !== direction) return;
      event.preventDefault(); side.classList.remove('drop-ok');
      const drag = mouseDrag; mouseDrag = null;
      if (sourceStillPresent(drag.source, drag.direction, drag.item)) transfer(drag.source, drag.direction);
      else { signature = ''; render(); }
    });
  }
  function render() {
    if (groundId != null) {
      const state = getState();
      const actor = state?.actors?.find((entry) => entry.id === actorId);
      const ground = state?.groundItems?.find((entry) => entry.id === groundId);
      if (!actor || !ground) { close(); return; }
      root.replaceChildren();
      const header = el('header', 'loot-head');
      const title = el('strong', '', '地面の品を拾う');
      const status = el('span', 'loot-notice', '品物を押すと持ち物へ移します');
      const all = el('button', 'loot-all', '全部拾う');
      all.type = 'button';
      all.addEventListener('click', () => {
        for (let i = ground.droppedItems.length - 1; i >= 0; i -= 1) command({ type: 'groundItemTransfer', actorId, groundId, itemIndex: i, quantity: ground.droppedItems[i].n || 1 });
        render();
      });
      const dismiss = el('button', 'loot-close', '閉じる');
      dismiss.type = 'button'; dismiss.addEventListener('click', close);
      header.append(title, status, all, dismiss);
      const panes = el('div', 'loot-panes');
      const source = el('section', 'loot-side loot-source');
      source.append(el('h2', '', '地面に置かれた品'));
      const grid = el('div', 'inventory-grid-board loot-grid-board');
      for (const [index, item] of (ground.droppedItems || []).entries()) {
        const btn = itemButton(item, null, 'take', '地面の品', { name: lootItemName(item) });
        btn.addEventListener('click', () => {
          const ok = command({ type: 'groundItemTransfer', actorId, groundId, itemIndex: index, quantity: item.n || 1 });
          if (!ok) status.textContent = '持ち物に空きがないか、重すぎます';
          render();
        });
        grid.append(btn);
      }
      source.append(grid);
      const destination = el('section', 'loot-side loot-destination');
      destination.append(el('h2', '', `${actor.name}の持ち物`));
      destination.append(board('持ち物', BODY_GRID, (actor.inv || []).map((item) => ({ item, disabled: true }))));
      panes.append(source, destination);
      root.append(header, panes);
      return;
    }
    if (touchActive || mouseDrag || actorId == null || (targetId == null && boxId == null)) return;
    const state = getState();
    const actor = state?.actors?.find((entry) => entry.id === actorId);
    const body = state?.actors?.find((entry) => entry.id === targetId);
    const box = boxId == null ? null : state?.town?.boxes?.find((entry) => entry.id === boxId);
    if (!actor || (boxId == null && (!body || body.state !== 'dead' && body.state !== 'down')) || (boxId != null && !box)) { close(); return; }
    if (box && boxAllPending) {
      if (actor.townTask?.kind === 'steal' && actor.townTask.box === box.id && actor.townTask.all) boxAllObserved = true;
      else if (boxAllObserved) {
        const left = Object.values(box.goods || {}).reduce((sum, count) => sum + count, 0) + (box.cash > 0 ? 1 : 0);
        notice = left ? `残り${left}点` : '全部取りました';
        noticeUntil = Date.now() + 3000; boxAllPending = boxAllObserved = false; signature = '';
      }
    }
    ensureInventoryLayout(actor);
    if (body) ensureInventoryLayout(body);
    const currentNotice = Date.now() < noticeUntil ? notice : '';
    const nextSignature = JSON.stringify([actor.inv, actor.equip?.backpack?.contents, actor.money, actor.food, actor.kits, body?.inv, body?.equip, body?.money, body?.food, body?.kits, box?.goods, box?.cash, box?.storedItems, currentNotice]);
    if (nextSignature === signature) return;
    signature = nextSignature;
    root.replaceChildren();
    const header = el('header', 'loot-head');
    const title = el('strong', '', box ? `${box.kind === 'display' ? '店の品' : '入れ物'}をあさる` : `${body.name}をあさる`);
    const status = el('span', 'loot-notice', currentNotice || (box ? '品ごとに盗み判定を行います' : '品を押すと移動します'));
    const all = el('button', 'loot-all', '全部取る');
    all.type = 'button';
    all.addEventListener('click', () => {
      if (box) {
        const ok = command({ type: 'steal', actorId, boxId, all: true });
        boxAllPending = !!ok; boxAllObserved = false;
        notice = ok ? '全部取る命令を出しました' : '取れませんでした';
        noticeUntil = Date.now() + 3000; signature = ''; render(); return;
      }
      const result = takeAllLoot(getState(), actorId, targetId);
      notice = result.left ? `残り${result.left}点` : (result.moved ? `${result.moved}点移しました` : '移せる品がありません');
      noticeUntil = Date.now() + 2400;
      render();
    });
    const dismiss = el('button', 'loot-close', '×');
    dismiss.type = 'button'; dismiss.setAttribute('aria-label', '閉じる'); dismiss.addEventListener('click', close);
    header.append(title, status, all, dismiss);

    const panes = el('div', 'loot-panes');
    const left = el('section', 'loot-side loot-source');
    dropSide(left, 'return');
    left.append(el('h2', '', `${box ? '入れ物' : body.name} · 相手の品`));
    if (box) {
      const goods = Object.entries(box.goods || {}).filter(([, count]) => count > 0).map(([good, count]) => ({ item: { id: good, n: count, rank: 1 }, source: { good }, label: '品物', name: lootItemName({ id: good }) }));
      const columns = 5, dims = { w: columns, h: Math.max(1, Math.ceil(goods.length / columns)) };
      goods.forEach((entry, index) => { entry.grid = { x: index % columns, y: Math.floor(index / columns) }; entry.source = { good: entry.item.id }; });
      left.append(board('品物', dims, goods));
      const stored = (box.storedItems || []).map((item, index) => ({ item, source: { kind: 'stored', index }, label: '預けた品' }));
      if (stored.length) left.append(board('預けた品', { w: 8, h: Math.max(8, stored.length * 4) }, stored, { compact: true }));
      const cashEntries = box.cash > 0 ? [{ item: { id: 'cash', n: box.cash }, resource: 'money', source: { good: 'cash' }, label: 'キャッシュ', name: `キャッシュ ${box.cash}` }] : [];
      if (cashEntries.length) left.append(resourceGrid('キャッシュ', cashEntries));
    } else {
      const entries = lootItems(body);
      const possessions = entries.filter((entry) => entry.source.kind === 'inv' && entry.source.container === 'body').map((entry) => ({ ...entry, direction: 'take' }));
      left.append(board('持ち物', BODY_GRID, possessions, { compact: true, kind: 'loot-possession-group' }));
      left.append(equipmentFrame('装備', entries.filter((entry) => entry.source.kind === 'equip')));
      left.append(resourceGrid('キャッシュ・食料・手当て', entries.filter((entry) => entry.resource).map((entry) => ({ ...entry, name: entry.resource === 'money' ? `キャッシュ ${entry.item.n}` : entry.resource === 'food' ? `食料 ${entry.item.n}つ` : '手当ての道具' }))));
    }

    const right = el('section', 'loot-side loot-destination');
    dropSide(right, 'take');
    right.append(el('h2', '', `${actor.name} · 自分の品`));
    const ownItems = (actor.inv || []).map((item, index) => ({ item, source: { kind: 'inv', container: 'body', index }, direction: 'return', label: '持ち物' }));
    right.append(board('持ち物', BODY_GRID, ownItems));
    if (actor.equip?.backpack) {
      const packItems = (actor.equip.backpack.contents || []).map((item, index) => ({ item, source: { kind: 'inv', container: 'pack', index }, direction: 'return', label: '袋' }));
      right.append(board(`${ITEMS[actor.equip.backpack.id]?.name || '背負い袋'}の中`, inventoryGrid(actor, 'pack'), packItems));
    }
    if (!box) {
      const resources = [];
      if ((actor.money || 0) > 0) resources.push({ item: { id: 'cash', n: actor.money }, resource: 'money', source: { kind: 'resource', resource: 'money' }, direction: 'return', label: 'キャッシュ', name: `キャッシュ ${actor.money}` });
      if ((actor.food || 0) > 0) resources.push({ item: { id: 'food', n: actor.food }, resource: 'food', source: { kind: 'resource', resource: 'food' }, direction: 'return', label: '食料', name: `食料 ${actor.food}つ` });
      normalizeKits(actor).forEach((kit, index) => resources.push({ item: { ...kit, id: kit.id || 'kit', n: kit.uses || 1 }, resource: 'kit', source: { kind: 'resource', resource: 'kit', index }, direction: 'return', label: '手当ての道具' }));
      right.append(resourceGrid('キャッシュ・食料・手当て', resources));
    }
    panes.append(left, right);
    root.append(header, panes);
  }
  function open(nextActorId, nextTargetId) {
    const state = getState();
    const actor = state?.actors?.find((entry) => entry.id === nextActorId);
    const body = state?.actors?.find((entry) => entry.id === nextTargetId);
    if (!actor || actor.faction !== 'player' || !body || body.faction === 'player' || !['down', 'dead'].includes(body.state)) return false;
    actorId = actor.id; targetId = body.id; boxId = null; groundId = null; notice = ''; noticeUntil = 0; signature = ''; boxAllPending = boxAllObserved = false;
    panels.open('loot'); root.classList.remove('hidden'); render(); return true;
  }
  function openBox(nextActorId, nextBoxId) {
    const actor = getState()?.actors?.find((entry) => entry.id === nextActorId);
    const box = getState()?.town?.boxes?.find((entry) => entry.id === nextBoxId);
    if (!actor || actor.faction !== 'player' || !box || box.locked) return false;
    actorId = actor.id; targetId = null; boxId = box.id; groundId = null; notice = ''; noticeUntil = 0; signature = ''; boxAllPending = boxAllObserved = false;
    panels.open('loot'); root.classList.remove('hidden'); render(); return true;
  }
  function openGround(nextActorId, nextGroundId) {
    const actor = getState()?.actors?.find((entry) => entry.id === nextActorId);
    const ground = getState()?.groundItems?.find((entry) => entry.id === nextGroundId);
    if (!actor || actor.faction !== 'player' || !ground?.droppedItems?.length) return false;
    actorId = actor.id; targetId = null; boxId = null; groundId = ground.id; notice = ''; noticeUntil = 0; signature = ''; boxAllPending = boxAllObserved = false;
    panels.open('loot'); root.classList.remove('hidden'); render(); return true;
  }
  return { open, openBox, openGround, close, update: render, dispose() { close(); root.remove(); } };
}
