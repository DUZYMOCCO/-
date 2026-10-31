import { panels } from './panels.js';
export const HUD_MENU_KEY = 'sunahate_opt_hudmenu';
export const HUD_MENU_ITEMS = Object.freeze(['trade', 'save', 'options', 'lantern', 'history']);

export function loadMenuOpen(storage) {
  try { return !!storage && storage.getItem(HUD_MENU_KEY) === '1'; }
  catch (err) { return false; }
}

export function saveMenuOpen(storage, open) {
  try { if (storage) storage.setItem(HUD_MENU_KEY, open ? '1' : '0'); }
  catch (err) { /* 保存できなくても操作は続ける */ }
}

export function createHudMenu(buttons) {
  let storage = null;
  try { storage = window.localStorage; } catch (err) { /* 使用不可 */ }
  const root = document.createElement('div');
  root.id = 'hud-menu';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hud-menu-toggle';
  toggle.textContent = '≡';
  toggle.title = 'メニュー';
  toggle.setAttribute('aria-label', 'メニュー');
  const items = document.createElement('div');
  items.className = 'hud-menu-items';
  items.id = 'hud-menu-items';
  toggle.setAttribute('aria-controls', items.id);
  for (const key of HUD_MENU_ITEMS) if (buttons[key]) items.appendChild(buttons[key]);
  if (buttons.squad) items.appendChild(buttons.squad);
  root.append(toggle, items);
  document.body.appendChild(root);
  let open = loadMenuOpen(storage);
  function render() {
    items.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }
  panels.register('menu', { contains: target => toggle.contains(target) || (!items.hidden && items.contains(target)), close: () => { open = false; saveMenuOpen(storage, false); render(); } });
  if (open) panels.open('menu');
  toggle.addEventListener('click', () => {
    if (open) { panels.close('menu'); return; }
    panels.open('menu');
    open = true;
    saveMenuOpen(storage, open);
    render();
  });
  function close() {
    panels.close('menu');
    if (open) {
      open = false;
      saveMenuOpen(storage, open);
      render();
    }
  }
  function badge() { toggle.classList.toggle('has-trade', buttons.trade.classList.contains('here')); }
  new MutationObserver(badge).observe(buttons.trade, { attributes: true, attributeFilter: ['class'] });
  badge();
  render();
  return {
    close,
    isOpen: () => open,
    render,
  };
}
