// 武器庫の画面（?armory=1）。出撃の前に、ロボット1機ずつの武器と修理・バリアの道具を選ぶ。計算は loadout.js（DOM なし）。
// 一覧（12機）→ 1機の枠 → カードの一覧、の3つの画面を .bca の中で切りかえる。出撃で onDeploy(loadout) を呼ぶだけ（ミッションは index.js が始める）。
// お試しの画面: 持っている武器の仕組みがまだないので、選べる物は全部出す（【仮】）。選んだ装備は localStorage の bc-armory-v1 に保存する。
import { storage } from '../../../common/js/storage.js';
import { loadCss } from '../../../common/js/load-css.js';
import { KINDS, UNIT_CLASSES } from '../sim/sim.js?v=23';
import { MISSION_1 } from '../sim/mission.js?v=10';
import { WEAPON_DROP } from '../sim/cover.js?v=6';
import { KIND_WEAPON } from '../sim/weapons.js?v=5';
import { rangeTiles } from '../sim/loadout-effects.js?v=3';
import {
  buildRoster, sanitizeLoadout, normalizeEntry, emptyEntry, entryIsEmpty, slotCounts, candidates, simEffect, toggleSlot, attachIt01,
  JSON_CLASS_NAME,
} from './loadout.js?v=4';

export const STORE_KEY = 'bc-armory-v1';
const DATA_URL = new URL('../../assets/weapons/armory-data.json', import.meta.url).href;
const imgUrl = name => new URL(`../../assets/weapons/${name}.webp`, import.meta.url).href;
const CSS_URL = new URL('../../css/armory.css?v=2', import.meta.url).href;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SLOT_LABEL = { weapon: '武器', back: '背中', support: '修理・バリア' };
const clsName = key => UNIT_CLASSES.find(c => c.key === key)?.name || '兵種なし';
const clsMark = key => UNIT_CLASSES.find(c => c.key === key)?.mark || '・';
/** 射程が 0 の物は、資料の range_key の読み方（roster の射程の列）で出す */
const RANGE_ZERO = { self: '自分だけ', place: '置く場所' };

/** 武器庫を開く。opts: { it01: &it01=1 の時 1（IT-01 を1個持っている【仮】）, onDeploy(loadout) }。返り値: { destroy() } */
export async function openArmory(game, opts = {}) {
  await loadCss(CSS_URL);
  const data = await (await fetch(DATA_URL)).json();
  const byId = new Map(data.weapons.map(r => [r.id, r]));
  const roster = buildRoster(MISSION_1, KINDS);
  const it01Total = opts.it01 ? 1 : 0;
  let loadout = sanitizeLoadout(data, roster, (storage.get(STORE_KEY, null) || {}).loadout);
  const st = { screen: 'list', label: null, slotKind: null, index: 0, classOnly: true, type: '', stage: null, scroll: 0 };

  const root = document.createElement('div');
  root.className = 'bca';
  root.innerHTML = `
    <header class="bca-head"><button class="bca-back" data-a="back" aria-label="もどる">◀</button><h1 class="bca-title"></h1><button class="bca-menu-btn" data-a="menu" aria-label="メニューを開く">☰</button></header>
    <main class="bca-body"></main>
    <footer class="bca-foot"><button class="bca-go" data-a="go">出撃</button></footer>
    <div class="bca-menu" hidden><div class="bca-menu-box" role="dialog" aria-modal="true" aria-label="メニュー">
      <h2>メニュー</h2>
      <button data-a="reset">（お試し）全部もとにもどす</button>
      <button data-a="hub">工房へ戻る</button>
      <button class="bca-menu-close" data-a="menu-close">とじる</button>
    </div></div>`;
  game.el.root.appendChild(root);
  const $ = s => root.querySelector(s);
  const body = $('.bca-body'), title = $('.bca-title'), backBtn = $('.bca-back'), foot = $('.bca-foot'), menu = $('.bca-menu');

  const entryOf = u => normalizeEntry(data, u.body, loadout[u.label] || emptyEntry());
  const unitOf = label => roster.find(r => r.label === label);
  const save = () => { storage.set(STORE_KEY, { v: 1, loadout }); };
  const setEntry = (u, e) => { if (entryIsEmpty(e)) delete loadout[u.label]; else loadout[u.label] = e; save(); };
  const it01Left = () => Math.max(0, it01Total - roster.filter(u => entryOf(u).it01).length);

  const thumb = (row, cls = '') => row && row.image
    ? `<span class="bca-thumb ${cls}"><img src="${imgUrl(row.image)}" alt="" width="64" height="64" draggable="false"></span>`
    : `<span class="bca-thumb empty ${cls}"></span>`;
  const tierLine = r => `段階${r.stage}・T${r.tier}・${esc(r.category)}`;

  /** v1.0.0: 1つ目の武器の枠が空いている時は、その機体の標準の武器（KIND_WEAPON）を薄く出す（「空き」に見えないように）。選んではいない */
  const stdRow = (u, kind, index) => (kind === 'weapon' && index === 0 ? byId.get(KIND_WEAPON[u.kind]) || null : null);
  // ---- 一覧 ----
  function renderList() {
    title.textContent = '武器庫';
    backBtn.style.visibility = 'hidden';
    foot.hidden = false;
    body.innerHTML = `<div class="bca-list">${roster.map(u => {
      const e = entryOf(u), n = slotCounts(data, u.body, e.it01);
      const cells = [];
      for (const k of ['weapon', 'back', 'support']) for (let i = 0; i < n[k]; i++) { const row = byId.get(e[k][i]), std = row ? null : stdRow(u, k, i); cells.push(thumb(row || std, `mini ${k}${std ? ' std' : ''}`)); }
      return `<button class="bca-row" data-a="unit" data-label="${esc(u.label)}">
        <span class="bca-mark c-${u.cls}">${esc(clsMark(u.cls))}</span>
        <span class="bca-who"><b>${esc(u.label)}</b><small>${esc(clsName(u.cls))}</small></span>
        <span class="bca-slots">${cells.join('')}</span></button>`;
    }).join('')}</div>`;
  }

  // ---- 1機の枠 ----
  function slotNote(u, kind, index, row) {
    const accepts = WEAPON_DROP.accepts[u.kind];
    if (kind === 'weapon' && index === 0 && !accepts) return { text: 'この試作ではまだ武器を持てません', warn: true };
    if (!row) return null;
    if (simEffect(u.kind, row, kind, index) !== 'active') return { text: 'この試作ではまだ効きません', warn: true };
    if (kind === 'support') return { text: row.type === 'repair' ? '出撃で効く（味方を直す）' : '出撃で効く（バリアが強くなる）', ok: true };
    return { text: kind === 'weapon' && index === 0 ? '出撃で効く' : '出撃で効く（強い時・遠い相手に使う）', ok: true };
  }
  /** 選んだ機体の説明の行「武器: A / B」: 1つ目（空なら元の武器）と、2つ目以降・背中の武器の名前 */
  function weaponsLine(u, e) {
    const first = e.weapon[0] ? byId.get(e.weapon[0]) : (WEAPON_DROP.accepts[u.kind] ? byId.get(KIND_WEAPON[u.kind]) : null);
    const names = [first, ...e.weapon.slice(1).map(id => byId.get(id)), ...e.back.map(id => byId.get(id))].filter(Boolean).map(r => r.name);
    return names.length ? `武器: ${names.join(' / ')}` : '';
  }
  function renderUnit() {
    const u = unitOf(st.label), e = entryOf(u), n = slotCounts(data, u.body, e.it01), s = data.SLOTS[u.body];
    title.textContent = u.label;
    backBtn.style.visibility = 'visible';
    foot.hidden = true;
    const slotBtn = (kind, index, label) => {
      const row = byId.get(e[kind][index]), note = slotNote(u, kind, index, row), std = row ? null : stdRow(u, kind, index);
      return `<button class="bca-slot ${row ? 'has' : std ? 'std' : ''}" data-a="pick" data-kind="${kind}" data-i="${index}">
        <span class="bca-slot-lab">${esc(label).replace('|', '<br>')}</span>${thumb(row || std, std ? 'std' : '')}
        <span class="bca-slot-main">${row ? `<b>${esc(row.name)}</b><small>${tierLine(row)}</small>` : std ? `<b class="dim">${esc(std.name)}</b><small>標準装備</small>` : '<b class="dim">空き</b>'}
          ${note ? `<em class="bca-note ${note.warn ? 'warn' : 'ok'}">${esc(note.text)}</em>` : ''}</span></button>`;
    };
    const rows = [];
    for (let i = 0; i < n.weapon; i++) rows.push(slotBtn('weapon', i, e.it01 && i === n.weapon - 1 ? `武器${i + 1} IT-01` : `武器${i + 1}`));
    for (let i = 0; i < n.back; i++) rows.push(slotBtn('back', i, '背中'));
    for (let i = 0; i < n.support; i++) rows.push(slotBtn('support', i, n.support > 1 ? `修理・|バリア${i + 1}` : '修理・|バリア')); // | は表示で改行にする
    const x = data.SLOT_EXPANDER;
    const it = e.it01
      ? `<div class="bca-it"><span class="bca-thumb"><img src="${imgUrl('IT-01')}" alt="" width="64" height="64"></span><span class="bca-slot-main"><b>${esc(x.name)}（${esc(x.id)}）</b><small>付いている（外せない）</small></span></div>`
      : it01Left() > 0
        ? `<button class="bca-it go" data-a="it01"><span class="bca-thumb"><img src="${imgUrl('IT-01')}" alt="" width="64" height="64"></span><span class="bca-slot-main"><b>${esc(x.name)}（${esc(x.id)}）</b><small>付ける（付けたら外せない・武器の枠が1つ増える）</small></span></button>`
        : '';
    body.innerHTML = `<div class="bca-unit">
      <div class="bca-info"><span class="bca-mark c-${u.cls}">${esc(clsMark(u.cls))}</span>
        <span class="bca-who"><b>${esc(clsName(u.cls))}</b><small>${esc(s.label)}（仮）</small></span>
        <span class="bca-counts">武器${n.total}・修理/バリア${n.support}（仮）</span></div>
      ${weaponsLine(u, e) ? `<p class="bca-now">${esc(weaponsLine(u, e))}</p>` : ''}
      ${rows.join('')}${it}</div>`;
  }

  // ---- カードの一覧 ----
  function renderPicker() {
    const u = unitOf(st.label), e = entryOf(u), kind = st.slotKind, cur = e[kind][st.index];
    const pool = candidates(data, { slotKind: kind, cls: u.cls, classOnly: st.classOnly });
    const types = [...new Map(pool.map(r => [r.type, r.category])).entries()];
    const stages = [...new Set(pool.map(r => r.stage))].sort((a, b) => a - b);
    // 絞り込みで選べなくなった種類・段階は、「すべて」に戻す
    if (st.type && !types.some(([t]) => t === st.type)) st.type = '';
    if (st.stage != null && !stages.includes(st.stage)) st.stage = null;
    const list = candidates(data, { slotKind: kind, cls: u.cls, classOnly: st.classOnly, type: st.type, stage: st.stage });
    title.textContent = `${u.label}　${kind === 'weapon' ? `武器${st.index + 1}` : SLOT_LABEL[kind]}`;
    backBtn.style.visibility = 'visible';
    foot.hidden = true;
    const accepts = WEAPON_DROP.accepts[u.kind];
    const head = (kind === 'weapon' || kind === 'back') && !accepts ? '<p class="bca-warn">この機体は、この試作ではまだ武器を持てません（選んでも出撃では効きません）</p>' : '';
    const chip = (a, val, label, on) => `<button class="bca-chip ${on ? 'on' : ''}" data-a="${a}" data-v="${esc(val)}">${esc(label)}</button>`;
    const cards = list.map(r => {
      const on = r.id === cur;
      const eff = (kind === 'support' || accepts) && simEffect(u.kind, r, kind, st.index) !== 'active' ? '<em class="bca-note warn">この試作ではまだ効きません</em>' : '';
      const sp = r.special_text ? esc(r.special_text.replace(/\*\*/g, '')) : r.special.length ? esc(r.special.map(k => (data.SPECIAL_NAMES || {})[k] || k).join('・')) : ''; // 資料に読み方がない key は、そのまま出す
      const cl = r.classes.map(c => JSON_CLASS_NAME[c] || c).join('・');
      const tiles = rangeTiles(r), rng = tiles != null ? `${tiles}マス` : (RANGE_ZERO[r.range_key] || r.range); // 射程はマス（1マス＝32px）
      return `<button class="bca-card ${on ? 'on' : ''}" data-a="card" data-id="${esc(r.id)}">
        ${thumb(r)}
        <span class="bca-card-main"><b>${esc(r.name)}</b>${on ? '<i class="bca-tag">付いている</i>' : ''}
          <small>${tierLine(r)}</small>
          <span class="bca-stats"><span>モーション ${r.motion_s}秒</span><span>射程 ${rng}</span><span>範囲 ${r.splash}</span><span>弾数 ${r.pellets}</span></span>
          ${sp ? `<span class="bca-sp">${sp}</span>` : ''}
          <span class="bca-cl">向く兵種 ${esc(cl)}</span>${eff}</span></button>`;
    }).join('');
    body.innerHTML = `<div class="bca-picker">
      <div class="bca-filter">
        <div class="bca-seg" role="radiogroup" aria-label="絞り込み">
          <button class="${st.classOnly ? 'on' : ''}" data-a="class-only" data-v="1" role="radio">${esc(clsName(u.cls))}に向く物だけ</button>
          <button class="${st.classOnly ? '' : 'on'}" data-a="class-only" data-v="0" role="radio">全部</button>
        </div>
        <div class="bca-chips">${chip('type', '', 'すべて', !st.type)}${types.map(([t, c]) => chip('type', t, c, st.type === t)).join('')}</div>
        <div class="bca-chips">${chip('stage', '', '全段階', st.stage == null)}${stages.map(s => chip('stage', String(s), `段階${s}`, st.stage === s)).join('')}</div>
      </div>
      ${head}<div class="bca-cards">${cards || '<p class="bca-empty">この絞り込みには、ありません</p>'}</div></div>`;
  }

  function render(keepScroll = false) {
    const sc = keepScroll ? body.scrollTop : 0;
    if (st.screen === 'list') renderList(); else if (st.screen === 'unit') renderUnit(); else renderPicker();
    body.scrollTop = sc;
  }
  function go(screen, scroll = 0) { st.screen = screen; render(); body.scrollTop = scroll; }

  const resetMenuText = '（お試し）全部もとにもどす';
  let resetArmed = 0;
  const closeMenu = () => { menu.hidden = true; resetArmed = 0; const b = menu.querySelector('[data-a="reset"]'); if (b) b.textContent = resetMenuText; };

  root.addEventListener('click', ev => {
    const el = ev.target.closest('[data-a]');
    if (ev.target === menu) return closeMenu();
    if (!el) return;
    const a = el.dataset.a;
    if (a === 'unit') { st.label = el.dataset.label; st.scroll = body.scrollTop; go('unit'); }
    else if (a === 'back') {
      if (st.screen === 'picker') go('unit'); else if (st.screen === 'unit') go('list', st.scroll);
    } else if (a === 'pick') { st.slotKind = el.dataset.kind; st.index = Number(el.dataset.i); st.classOnly = true; st.type = ''; st.stage = null; go('picker'); }
    else if (a === 'card') {
      const u = unitOf(st.label);
      setEntry(u, toggleSlot(entryOf(u), st.slotKind, st.index, el.dataset.id));
      render(true);
    } else if (a === 'class-only') { st.classOnly = el.dataset.v === '1'; render(true); body.scrollTop = 0; }
    else if (a === 'type') { st.type = el.dataset.v; render(true); body.scrollTop = 0; }
    else if (a === 'stage') { st.stage = el.dataset.v === '' ? null : Number(el.dataset.v); render(true); body.scrollTop = 0; }
    else if (a === 'it01') {
      const u = unitOf(st.label), e2 = attachIt01(data, u.body, entryOf(u), it01Left());
      if (e2) { setEntry(u, e2); render(true); }
    } else if (a === 'go') { opts.onDeploy && opts.onDeploy(sanitizeLoadout(data, roster, loadout)); }
    else if (a === 'menu') { menu.hidden = false; }
    else if (a === 'menu-close') closeMenu();
    else if (a === 'hub') { closeMenu(); game.exit(); }
    else if (a === 'reset') {
      // 押し間違い対策: 1回目は確かめの文字に変えて、もう一度押すと消す
      if (!resetArmed) { resetArmed = 1; el.textContent = 'もう一度押すと消えます'; return; }
      loadout = {}; save(); closeMenu(); st.label = null; go('list');
    }
  });
  // 地図へタップ・ドラッグを通さない（武器庫の下には、まだ何も出していない）
  for (const evn of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) root.addEventListener(evn, e => e.stopPropagation(), { passive: true });

  render();
  return {
    el: root, data, roster,
    getLoadout: () => sanitizeLoadout(data, roster, loadout),
    destroy() { root.remove(); },
  };
}
