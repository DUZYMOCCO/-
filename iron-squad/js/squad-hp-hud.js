import {formatCompact} from './number-format.js?v=282';
// Translucent HP list of the commander's own squad on the left edge (number + gauge).
// Only own-squad members are listed; the main army, NPCs and civilians are not.
import {isOwnSquad} from './own-squad-marker.js?v=182';
import {downLabel} from './casualty-rules.js?v=313';
import {isMagicUser,ensureMana} from './magic-rules.js?v=296';
import {isRangedUnit,ensureAmmo,ammoCapacity} from './supply-rules.js?v=313';

const REFRESH = .15;
const shortName = name => String(name || '').split(/[・\s]/)[0] || '兵士';

/** Row data for the list (pure; also used by tests). */
export function squadHpRows(game) {
  return (game.squad || []).filter(isOwnSquad)
    .map(s => {
      const max = Math.max(1, Math.round(s.maxHp || 1)), hp = s.isDown || s.dying ? 0 : Math.max(0, Math.min(max, Math.round(s.hp || 0)));
      const ratio = hp / max, state = s.dying ? 'dead' : s.isDown ? 'down' : ratio <= .3 ? 'low' : ratio <= .6 ? 'mid' : 'ok';
      const gone = s.isDown || s.dying;
      return {id: s.id, name: shortName(s.name), hp, max, ratio, state, text: gone ? downLabel(s) : formatCompact(hp) /* 幅100pxの枠に収めるため現在HPだけ（割合はバーで見せる） */, res: gone ? null : resourceOf(game, s)};
    });
}

/** Second gauge: MP for magic users, ammo for ranged units, nothing for the rest. */
function resourceOf(game, s) {
  if (isMagicUser(s)) {
    const max = Math.max(1, Math.round(ensureMana(s) ? s.maxMana : 0)), cur = Math.max(0, Math.min(max, Math.floor(s.mana || 0)));
    return s.maxMana > 0 ? {kind: 'mp', cur, max, ratio: cur / max, text: `MP ${formatCompact(cur)}/${formatCompact(max)}`} : null;
  }
  if (isRangedUnit(game, s)) {
    const cur = ensureAmmo(s), max = ammoCapacity(s);
    return {kind: 'ammo', cur, max, ratio: cur / max, text: `弾 ${cur}/${max}`};
  }
  return null;
}

export function updateSquadHpHud(game, dt = 0, force = false) {
  game._squadHpHudClock = (game._squadHpHudClock || 0) - dt;
  if (!force && game._squadHpHudClock > 0) return;
  game._squadHpHudClock = REFRESH;
  const host = game.container?.querySelector('#canvas-container');
  if (!host) return;
  let box = host.querySelector('#squad-hp-hud');
  const rows = game.inBattle && !game.spectating ? squadHpRows(game) : []; // the spectate panel replaces it
  if (!rows.length) { if (box) box.hidden = true; return; }
  if (!box) {
    box = document.createElement('div'); box.id = 'squad-hp-hud'; box.className = 'squad-hp-hud';
    box.setAttribute('aria-label', '自部隊のHP'); host.append(box);
  }
  box.hidden = false;
  box.classList.toggle('compact', rows.length > 6); // up to 12 members still fit in landscape
  // Structure (who, name, state, which gauge) rebuilds the DOM; numbers/widths are updated in place.
  const struct = rows.map(r => `${r.id}:${r.name}:${r.res?.kind || ''}`).join('|');
  if (box.dataset.struct !== struct) {
    box.dataset.struct = struct; delete box.dataset.key;
    const nodes = [];
    box.replaceChildren(...rows.map(r => {
      const row = document.createElement('div'); row.className = `squad-hp-row ${r.state}`;
      const label = document.createElement('div'); label.className = 'squad-hp-label';
      const name = document.createElement('span'); name.className = 'squad-hp-name'; name.textContent = r.name;
      const num = document.createElement('span'); num.className = 'squad-hp-num';
      const bar = document.createElement('div'); bar.className = 'squad-hp-bar';
      const fill = document.createElement('i');
      label.append(name, num); bar.append(fill); row.append(label, bar);
      const node = {row, num, fill, resText: null, resFill: null};
      if (r.res) {
        const res = document.createElement('div'); res.className = `squad-hp-res ${r.res.kind}`;
        const rf = document.createElement('i'), rt = document.createElement('span');
        res.append(rf, rt); row.append(res); node.resFill = rf; node.resText = rt;
      }
      nodes.push(node);
      return row;
    }));
    box._nodes = nodes;
  }
  const key = rows.map(r => `${r.state}:${r.text}:${r.res ? r.res.text : ''}`).join('|');
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  rows.forEach((r, i) => {
    const n = box._nodes[i];
    n.row.className = `squad-hp-row ${r.state}`; n.num.textContent = r.text; n.fill.style.width = `${Math.round(r.ratio * 100)}%`;
    if (r.res) { n.resText.textContent = r.res.text; n.resFill.style.width = `${Math.round(r.res.ratio * 100)}%`; }
  });
}
