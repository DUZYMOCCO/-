import { panels } from './panels.js';
import { beginTrapCraft, beginTrapPlacement, canPlaceTrap, recoverTrap, trapLevel } from '../sim/traps.js';

export function createTrapUi(options = {}) {
  const getState = options.getState || (() => null), getActor = options.getActor || (() => null);
  const button = document.createElement('button'); button.type = 'button'; button.className = 'hud-menu-item'; button.textContent = '罠'; button.title = '罠を仕掛ける・作る';
  const root = document.createElement('section'); root.className = 'trap-panel'; root.hidden = true;
  const head = document.createElement('header'); const status = document.createElement('div'); status.className = 'trap-status';
  const actions = document.createElement('div'); actions.className = 'trap-actions';
  const place = document.createElement('div'); place.className = 'trap-place-status';
  root.append(head, status, actions, place); document.body.appendChild(root);
  let active = false, selected = null, deep = false, pending = null;
  const btn = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); return b; };
  function refresh() {
    const state = getState(), actor = getActor();
    status.textContent = actor ? `${actor.name}　罠 Lv${trapLevel(actor)}　トラバサミ ${actor.inv?.filter(i=>i.id==='bear_trap').reduce((n,i)=>n+(i.n||1),0)||0}・網 ${actor.inv?.filter(i=>i.id==='net_trap').reduce((n,i)=>n+(i.n||1),0)||0}・シャベル ${actor.inv?.some(i=>i.id==='shovel')?'有':'無'}` : '操作キャラを選んでください';
    actions.replaceChildren();
    actions.append(btn('仕掛ける：トラバサミ', () => choose('bear')), btn('仕掛ける：網', () => choose('net')), btn('落とし穴を掘る', () => choose('pit')));
    if (actor && trapLevel(actor) >= 100) actions.append(btn(`深く掘る：${deep?'ON':'OFF'}`, () => { deep = !deep; refresh(); }));
    actions.append(btn('作る：トラバサミ', () => showResult(beginTrapCraft(state, actor?.id, 'bear'))), btn('作る：網', () => showResult(beginTrapCraft(state, actor?.id, 'net'))), btn('作る：シャベル', () => showResult(beginTrapCraft(state, actor?.id, 'shovel'))));
    if (actor && trapLevel(actor) >= 150 && (actor.targetId != null || actor.state === 'fight')) {
      actions.append(btn('足元に即置き：トラバサミ', () => showResult(beginTrapPlacement(state, actor.id, 'bear', actor.x, actor.z, { quick:true }))), btn('足元に即置き：網', () => showResult(beginTrapPlacement(state, actor.id, 'net', actor.x, actor.z, { quick:true }))));
    }
    if (pending) actions.append(btn('ここに置く', () => { const result = beginTrapPlacement(state, actor?.id, selected, pending.x, pending.z, { deep }); showResult(result); if (result.ok) { pending = null; selected = null; options.onPreview?.(null); refresh(); } }), btn('やめる', cancelPlacement));
  }
  function showResult(result) { place.textContent = result?.ok ? '作業を始めました' : (result?.reason || '操作できません'); }
  function choose(kind) { const actor = getActor(); if (!actor) return showResult({ reason:'操作キャラがいません' }); selected = kind; pending = null; place.textContent = '地面をタップして場所を選んでください'; refresh(); }
  function cancelPlacement() { selected = null; pending = null; options.onPreview?.(null); place.textContent = ''; refresh(); }
  function groundTap(point) {
    if (!active || !selected || !point) return false;
    const result = canPlaceTrap(getState(), getActor(), selected, point.x, point.z, { deep });
    pending = { ...point, ok: result.ok, reason: result.reason };
    options.onPreview?.(pending, result.ok);
    place.textContent = result.ok ? '緑：ここに罠を置けます' : `赤：${result.reason}`;
    refresh(); return true;
  }
  function open() { active = true; root.hidden = false; panels.open('trap'); refresh(); }
  function close() { active = false; root.hidden = true; options.onPreview?.(null); panels.close('trap'); }
  button.addEventListener('click', open); head.replaceChildren(document.createTextNode('罠'), btn('閉じる', close));
  // 置き場所選び中は地面（canvas）のタップでパネルを閉じない
  panels.register('trap', { contains: t => root.contains(t) || button.contains(t) || (!!selected && t?.tagName === 'CANVAS'), close: () => { active=false; root.hidden=true; options.onPreview?.(null); } });
  // 開いている間は持ち数・戦闘中の即置きボタンの出し入れだけ追う（毎フレーム作り直さない）
  let lastKey = '';
  function tick() {
    if (!active) return;
    const actor = getActor();
    const key = actor ? [actor.id, trapLevel(actor), actor.targetId != null || actor.state === 'fight', (actor.inv||[]).filter(i=>i.id==='bear_trap'||i.id==='net_trap'||i.id==='shovel').map(i=>i.id+(i.n||1)).join()].join('|') : '';
    if (key !== lastKey) { lastKey = key; refresh(); }
  }
  return { button, open, close, isActive: () => active, groundTap, refresh, tick, message: (text) => { place.textContent = text || ''; } };
}
