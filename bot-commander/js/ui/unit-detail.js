import { robotHue, robotHueCss } from '../names/robot-hue.js?v=1';
import { KINDS, unitWeaponInfo, UNIT_CLASSES } from '../sim/sim.js?v=30';
import { TILE_PX, roundHalf } from '../sim/loadout-effects.js?v=5';
import { robotNameOf, robotNameHtml } from '../names/robot-names.js?v=1';
import { STAT_CATEGORIES } from '../stats/unit-stats.js?v=6';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const art = { ponco: 'ponco', scav: 'scavenger', flyer: 'alt-flyer-bright', amph: 'alt-amphi' };
const number = n => Math.round((n || 0) * 10) / 10;

// sim と u は観察だけ。表示用の新しい値を作る。
export function unitDetailView(sim, u, { statsRow = null, classes = null } = {}) {
  const kind = KINDS[u.kind] || sim?.neKinds?.[u.kind];
  const cls = u.cls ? (classes || UNIT_CLASSES).find(c => c.key === u.cls) : null;
  const primary = !u.human && !u.object ? unitWeaponInfo(u)?.row : null;
  const weapons = primary ? [{ name: primary.name, power: Math.round(u.atk), range: roundHalf(u.range / TILE_PX), interval: u.cooldown }] : [];
  for (const gun of u.loadoutFx?.guns || []) weapons.push({ name: gun.row.name, power: Math.round(u.atk * gun.mul), range: roundHalf(gun.range / TILE_PX), interval: u.cooldown });
  const name = robotNameOf(sim, u);
  return { name, hue: u.side === 'ally' && !u.human && !u.object ? robotHue(name) : null, kind: kind?.name || u.kind, mark: cls?.mark || '', className: cls?.name || '',
    image: art[u.kind] ? new URL(`../../assets/art-v2/${art[u.kind]}.webp`, import.meta.url).href : '',
    hp: number(u.hp), maxHp: number(u.maxHp), shield: number(u.shieldHp), shieldMax: number(u.shieldMax),
    speed: (u.speed / TILE_PX).toFixed(1), attack: weapons.length ? weapons[0].power : '—',
    range: roundHalf(u.range / TILE_PX), cooldown: u.cooldown, sight: u.sight, armor: u.armor,
    cargo: Math.floor(u.cargo || 0), kits: u.kits, spareShields: u.spareShields, weapons,
    stats: statsRow ? { rank: statsRow.rank, score: statsRow.score, values: STAT_CATEGORIES.map(c => ({ label: c.icon + c.short, value: statsRow[c.id] + c.unit })) } : null };
}

export function unitDetailHtml(v) {
  const bar = (label, value, max, color) => `<div class="bc-d-bar"><div><span>${label}</span><b>${value} / ${max}${label === 'シールド' && !value ? '（壊れている）' : ''}</b></div><i><em class="${color}" style="width:${max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0}%"></em></i></div>`;
  const row = (label, value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  const portrait = v.image ? `<img src="${esc(v.image)}" style="filter:${robotHueCss(v.hue)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="bc-d-fallback" hidden>${esc(v.mark || v.kind[0])}</span>` : `<span class="bc-d-fallback">${esc(v.mark || v.kind[0])}</span>`;
  return `<header class="bc-d-head"><div class="bc-d-portrait">${portrait}</div><div><h2>${robotNameHtml(v.name)}</h2><p>${esc(v.kind)}</p>${v.className ? `<p><b class="bc-d-mark">${esc(v.mark)}</b> ${esc(v.className)}</p>` : ''}</div></header>
    ${bar('HP', v.hp, v.maxHp, 'hp')}${v.shieldMax > 0 ? bar('シールド', v.shield, v.shieldMax, 'shield') : ''}
    <h3>能力</h3><dl class="bc-d-grid">${row('移動速度', v.speed + ' マス/秒')}${row('攻撃', v.attack)}${row('射程', v.range + ' マス')}${row('攻撃の間隔', v.cooldown + ' 秒')}${row('視界', v.sight + ' マス')}${v.armor > 0 ? row('装甲', v.armor) : ''}${row('積載', v.cargo)}${v.kits != null ? row('修理キット', v.kits) : ''}${v.spareShields != null ? row('予備の盾', v.spareShields) : ''}</dl>
    <h3>武器</h3>${v.weapons.length ? `<ul class="bc-d-weapons">${v.weapons.map(w => `<li><b>${esc(w.name)}</b><span>威力 ${esc(w.power)}　射程 ${esc(w.range)} マス　間隔 ${esc(w.interval)} 秒</span></li>`).join('')}</ul>` : '<p>武器なし</p>'}
    ${v.stats ? `<h3>このミッションの成績</h3><dl class="bc-d-grid">${v.stats.values.map(s => row(s.label, s.value)).join('')}${row('総合点', v.stats.score + '点')}${row('順位', v.stats.rank + '位')}</dl>` : ''}`;
}
