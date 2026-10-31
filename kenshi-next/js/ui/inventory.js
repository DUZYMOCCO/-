import { panels } from './panels.js';
import { ITEMS, qualityOf } from '../sim/items.js';
import { canEquip, carriedWeight, carryCapacity, loadRatio, encumbranceFromLoad } from '../sim/inventory.js';

export const SLOT_GROUPS = [
  ['頭', [['head', '頭']]], ['上半身', [['upperIn', '内'], ['upperOut', '外']]],
  ['下半身', [['lowerIn', '内'], ['lowerOut', '外']]], ['足', [['feet', '足']]],
  ['アクセサリ', [0, 1, 2, 3].map((i) => ['acc', String(i + 1), i])],
  ['背負い袋', [['backpack', '袋']]], ['矢筒', [['quiver', '矢筒']]],
  ['武器', [['weapon', '主', 0], ['weapon', '予備', 1]]],
];
const SLOT_NAMES = { head: '頭', upperIn: '上半身・内', upperOut: '上半身・外', lowerIn: '下半身・内', lowerOut: '下半身・外', feet: '足', acc: 'アクセサリ', backpack: '背負い袋', quiver: '矢筒', weapon: '武器', ammo: '矢' };
const PART_NAMES = { head: '頭', chest: '胸', stomach: '腹', arms: '腕', legs: '脚' };
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
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function eligible(a, state) {
  return !!a && a.faction === 'player' && !a.machine && !a.swordsman && a.state !== 'dead' && (state.squadIds?.length ? state.squadIds.includes(a.id) : a.id === state.playerId);
}
export function createInventoryUI(getState, command) {
  const root = el('section', 'inventory-panel hidden');
  root.setAttribute('aria-label', '持ち物');
  document.body.appendChild(root);
  let actorId = null, selected = null, signature = '';
  panels.register('inventory', { parent: 'status', contains: target => root.contains(target), close: () => { actorId = null; selected = null; root.classList.add('hidden'); } });
  function close() { panels.close('inventory'); }
  function open(id) {
    const state = getState();
    const actor = state.actors.find((a) => a.id === id);
    if (!eligible(actor, state)) return false;
    panels.open('inventory');
    actorId = id; selected = null; signature = ''; root.classList.remove('hidden'); update(); return true;
  }
  function button(text, fn, cls = '') {
    const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b;
  }
  function update() {
    if (actorId === null) return;
    const state = getState(), a = state.actors.find((x) => x.id === actorId);
    if (!eligible(a, state)) { close(); return; }
    const sig = JSON.stringify([a.equip, a.inv, a.skills?.strength, selected]);
    if (sig === signature) return;
    signature = sig; root.replaceChildren();
    const head = el('div', 'inventory-head');
    const dismiss = button('×', close, 'inventory-close sheet-close'); dismiss.setAttribute('aria-label', '閉じる');
    head.append(el('strong', '', `${a.name} の持ち物`), dismiss);
    root.append(head);
    const ratio = loadRatio(a), weight = carriedWeight(a), capacity = carryCapacity(a);
    root.append(el('div', '', `${weight.toFixed(1)} / ${capacity.toFixed(1)} kg`));
    const track = el('div', 'inventory-track'), fill = el('div', `inventory-fill ${loadColor(ratio)}`);
    fill.style.width = `${Math.min(100, ratio / 1.2 * 100)}%`; track.append(fill); root.append(track, el('div', 'inventory-penalty', loadPenalty(ratio)));
    const grid = el('div', 'inventory-grid');
    for (const [title, slots] of SLOT_GROUPS) {
      const group = el('div', `inventory-group${title === 'アクセサリ' ? ' accessories' : ''}`); group.append(el('strong', '', title));
      for (const [slot, label, index] of slots) {
        const obj = index == null ? a.equip?.[slot] : a.equip?.[slot]?.[index];
        group.append(button(obj ? `${label}: ${ITEMS[obj.id]?.name || '—'}` : '—', () => { selected = { kind: 'equip', slot, index }; signature = ''; update(); }, 'inventory-slot'));
      }
      if (title === '武器') group.append(button('持ち替え', () => command({ type: 'swapWeapon', actorId }), 'inventory-slot'));
      grid.append(group);
    }
    root.append(el('h3', '', '装備枠'), grid);
    const maxSlots = 12 + (ITEMS[a.equip?.backpack?.id]?.slots || 0);
    root.append(el('h3', '', `持ち物 ${a.inv.length}/${maxSlots}`));
    const list = el('div', 'inventory-list');
    a.inv.forEach((obj, i) => {
      const d = ITEMS[obj.id]; if (!d) return;
      const row = button('', () => { selected = { kind: 'inv', i }; signature = ''; update(); }, 'inventory-row');
      row.append(el('span', '', d.name), el('span', `rank ${rankColor(obj.rank || 1)}`, `R${obj.rank || 1}`), el('span', '', `${((d.weight || 0) * qualityOf(obj.rank).weight * (d.stackable ? obj.n || 1 : 1)).toFixed(1)} kg`), el('span', '', SLOT_NAMES[d.slot] || d.slot));
      list.append(row);
    });
    root.append(list);
    if (!selected) return;
    const obj = selected.kind === 'inv' ? a.inv[selected.i] : selected.index == null ? a.equip?.[selected.slot] : a.equip?.[selected.slot]?.[selected.index];
    const d = ITEMS[obj?.id]; if (!d) return;
    const detail = el('div', 'inventory-detail');
    detail.append(el('strong', '', d.name));
    const info = [];
    if (d.cutRes != null) info.push(`切り耐性 ${Math.round(Math.min(0.9, d.cutRes * qualityOf(obj.rank).res) * 100)}%`, `打撃耐性 ${Math.round(Math.min(0.9, d.bluntRes * qualityOf(obj.rank).res) * 100)}%`);
    if (d.cover) info.push(Object.entries(d.cover).map(([k, v]) => `${PART_NAMES[k] || k} ${Math.round(v * 100)}%`).join(' / '));
    if (d.martial) info.push(`格闘 +${d.martial}`);
    if (obj.ammo) info.push(`矢 ${obj.ammo.n}本`);
    if (obj.stats) {
      if (obj.stats.atkBonus) info.push(`攻撃 +${obj.stats.atkBonus}`);
      if (obj.stats.defBonus) info.push(`防御 +${obj.stats.defBonus}`);
      if (obj.stats.dmgBonus) info.push(`切断 +${Math.round(obj.stats.dmgBonus * 100)}%`);
    }
    if (d.upgrade_effect) info.push(`効果: ${d.upgrade_effect}`);
    detail.append(el('div', '', info.join('・')));
    if (selected.kind === 'inv') {
      let index;
      if (d.slot === 'weapon') { index = a.equip.weapon.findIndex((x) => !x); if (index < 0) index = 0; }
      const check = canEquip(a, obj, d.slot, index);
      if (!check.ok) detail.append(el('div', '', check.reason));
      const act = button('装備', () => { command({ type: 'equip', actorId, invIndex: selected.i, index }); selected = null; signature = ''; }, 'inventory-action');
      act.disabled = !check.ok; detail.append(act);
    } else detail.append(button('外す', () => { command({ type: 'unequip', actorId, slot: selected.slot, index: selected.index }); selected = null; signature = ''; }, 'inventory-action'));
    root.append(detail);
  }
  return { open, close, update, toggle(id) { if (actorId === id) close(); else open(id); } };
}
