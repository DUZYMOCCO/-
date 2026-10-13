// Translucent HP list of the commander's own squad on the left edge (number + gauge).
// Only own-squad members are listed; the main army, NPCs and civilians are not.
import {isOwnSquad} from './own-squad-marker.js?v=182';
import {downLabel} from './casualty-rules.js?v=234';

const REFRESH = .15;
const shortName = name => String(name || '').split(/[・\s]/)[0] || '兵士';

/** Row data for the list (pure; also used by tests). */
export function squadHpRows(game) {
  return (game.squad || []).filter(isOwnSquad)
    .map(s => {
      const max = Math.max(1, Math.round(s.maxHp || 1)), hp = s.isDown || s.dying ? 0 : Math.max(0, Math.min(max, Math.round(s.hp || 0)));
      const ratio = hp / max, state = s.dying ? 'dead' : s.isDown ? 'down' : ratio <= .3 ? 'low' : ratio <= .6 ? 'mid' : 'ok';
      return {id: s.id, name: shortName(s.name), hp, max, ratio, state, text: s.isDown || s.dying ? downLabel(s) : `${hp}/${max}`};
    });
}

export function updateSquadHpHud(game, dt = 0, force = false) {
  game._squadHpHudClock = (game._squadHpHudClock || 0) - dt;
  if (!force && game._squadHpHudClock > 0) return;
  game._squadHpHudClock = REFRESH;
  const host = game.container?.querySelector('#canvas-container');
  if (!host) return;
  let box = host.querySelector('#squad-hp-hud');
  const rows = game.inBattle ? squadHpRows(game) : [];
  if (!rows.length) { if (box) box.hidden = true; return; }
  if (!box) {
    box = document.createElement('div'); box.id = 'squad-hp-hud'; box.className = 'squad-hp-hud';
    box.setAttribute('aria-label', '自部隊のHP'); host.append(box);
  }
  box.hidden = false;
  box.classList.toggle('compact', rows.length > 6); // up to 12 members still fit in landscape
  const key = rows.map(r => `${r.id}:${r.name}:${r.state}:${r.text}`).join('|');
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.replaceChildren(...rows.map(r => {
    const row = document.createElement('div'); row.className = `squad-hp-row ${r.state}`;
    const label = document.createElement('div'); label.className = 'squad-hp-label';
    const name = document.createElement('span'); name.className = 'squad-hp-name'; name.textContent = r.name;
    const num = document.createElement('span'); num.className = 'squad-hp-num'; num.textContent = r.text;
    const bar = document.createElement('div'); bar.className = 'squad-hp-bar';
    const fill = document.createElement('i'); fill.style.width = `${Math.round(r.ratio * 100)}%`;
    label.append(name, num); bar.append(fill); row.append(label, bar);
    return row;
  }));
}
