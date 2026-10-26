// 発射台（?launcher=1 の試作）の ☰ メニューの項目と、撃つ地点を選ぶ画面。地図の上にボタンは増やさない（☰ の中だけ）。
// 決まり・計算は js/sim/launcher.js。ここは画面（DOM）と、出来事（sim.fx）を短い知らせにするところだけ。
// ☰ は一時停止中なので、命令は applyNow（一時停止中の命令の入れ方）で入れる。
import { loadCss } from '../../../common/js/load-css.js';
import { unitById } from '../sim/sim.js?v=27';
import {
  LAUNCHER, LAUNCHER_MESSAGES, canBuild, canTow, canFire, launchersOf, issueLauncherBuild, issueLauncherHitch, issueLauncherUnhitch, issueLauncherFire,
} from '../sim/launcher.js?v=3';
import { TILE } from '../sim/map.js?v=6';

export const loadLauncherCss = () => loadCss(new URL('../../css/launcher.css?v=1', import.meta.url).href);

const stop = e => e.stopPropagation();

/**
 * 項目を作る。root: .bc-root、sim、r: 描画（r.ui.selected・cam・screenToWorld・app）、view: createLauncherView の返り値、
 * toast(text, tone)、menu: ☰ の枠（.bc-menu）、hooks: { closeMenu(), setPaused(v), isPaused(), applyNow() }
 * 返り値: { refresh() ☰ を開いた時・0.2 秒ごと, scan() 毎フレーム（出来事の知らせ）, destroy() }
 */
export function mountLauncherMenu({ root, sim, r, view, toast, menu, hooks }) {
  const box = menu.querySelector('.bc-menu-box');
  const sec = document.createElement('div');
  sec.className = 'bc-lm';
  sec.innerHTML = `<div class="bc-lm-title">発射台（試作）</div><div class="bc-lm-status"></div>
    <button data-lm="build"></button>
    <div class="bc-lm-pair"><button data-lm="hitch">発射台を引く</button><button data-lm="unhitch">外す</button></div>
    <button data-lm="fire">ミサイルを撃つ</button>`;
  box.insertBefore(sec, box.querySelector('.bc-menu-close')); // 「ゲームにもどる」の上
  const $ = s => sec.querySelector(s), status = $('.bc-lm-status');
  const btn = { build: $('[data-lm="build"]'), hitch: $('[data-lm="hitch"]'), unhitch: $('[data-lm="unhitch"]'), fire: $('[data-lm="fire"]') };

  // 撃つ地点を選ぶ重ね（地図の上。☰ を閉じたあと、この間は一時停止）
  const pick = document.createElement('div'); pick.className = 'bc-lpick'; pick.hidden = true;
  const bar = document.createElement('div'); bar.className = 'bc-lbar'; bar.hidden = true;
  bar.innerHTML = `<div class="bc-lbar-msg"></div><div class="bc-lbar-btns"><button data-lb="go">ここに撃つ</button><button data-lb="cancel">やめる</button></div>`;
  const stage = root.querySelector('.bc-stage');
  stage.after(pick); root.appendChild(bar);
  for (const el of [bar]) for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) el.addEventListener(ev, stop);
  const msg = bar.querySelector('.bc-lbar-msg'), go = bar.querySelector('[data-lb="go"]'), cancel = bar.querySelector('[data-lb="cancel"]');
  let picking = null; // { id, prevPaused, target }

  const selectedTowers = () => (r.ui.selected || []).map(id => unitById(sim, id)).filter(u => u && canTow(u));
  const selectedTowing = () => (r.ui.selected || []).map(id => unitById(sim, id)).filter(u => u?.tow != null);
  const towedLauncher = () => launchersOf(sim).find(l => l.launch.towId != null) || null;
  const freeLauncher = () => launchersOf(sim).find(l => l.launch.towId == null && !l.launch.phase) || null;
  const fireable = () => launchersOf(sim).find(l => !l.launch.phase) || null;

  function refresh() {
    const L = sim.launcher; if (!L) return;
    const built = L.builds[0], ls = launchersOf(sim), l = ls[0], shot = L.shots[0];
    const m = sim.mission, c = canBuild(sim);
    let text;
    if (built) text = `発射台を作成中… あと ${Math.ceil(built.left)} 秒（資材の届け先で作っています）`;
    else if (l?.launch.phase === 'aim') text = `ミサイルを構え中… あと ${Math.ceil(l.launch.left)} 秒（この間に壊されると消える）`;
    else if (l) text = `発射台 HP ${Math.ceil(l.hp)}／${l.maxHp}（${l.launch.towId != null ? 'ロボが引いている' : '置いてある'}）`;
    else if (shot) text = `ミサイル飛行中… あと ${Math.ceil(shot.left)} 秒`;
    else text = `資材 ${Math.floor(m.delivered)}／${m.target}。発射台は資材 ${LAUNCHER.cost} と ${LAUNCHER.buildSec} 秒で作れます`;
    if (!built && !l && !c.ok) text += `　（${LAUNCHER_MESSAGES[c.reason] || ''}）`;
    status.textContent = text;
    btn.build.textContent = `発射台を作る（資材${LAUNCHER.cost}・${LAUNCHER.buildSec}秒）`;
    btn.build.disabled = !c.ok;
    const towers = selectedTowers(), free = freeLauncher();
    btn.hitch.disabled = !(towers.length && free);
    btn.hitch.title = !free ? '発射台がありません' : !towers.length ? '引けるロボを選んでください' : '';
    btn.unhitch.disabled = !(selectedTowing().length || towedLauncher());
    btn.fire.disabled = !fireable();
  }

  const hit = () => { if (hooks.isPaused()) hooks.applyNow(); };
  btn.build.addEventListener('click', () => {
    const res = issueLauncherBuild(sim);
    if (!res.ok) { toast(LAUNCHER_MESSAGES[res.reason] || LAUNCHER_MESSAGES.busy, 'warn'); refresh(); return; }
    hit(); toast(`発射台を作り始めた（資材 -${LAUNCHER.cost}）`); refresh();
  });
  btn.hitch.addEventListener('click', () => {
    const towers = selectedTowers(), free = freeLauncher();
    if (!free) { toast(LAUNCHER_MESSAGES.none, 'warn'); return; }
    if (!towers.length) { toast(LAUNCHER_MESSAGES.noTower, 'warn'); return; }
    const t = towers.slice().sort((a, b) => Math.hypot(a.x - free.x, a.y - free.y) - Math.hypot(b.x - free.x, b.y - free.y))[0]; // 選んだロボのうち、発射台にいちばん近い 1 機が引く
    const res = issueLauncherHitch(sim, t.id);
    if (!res.ok) { toast(LAUNCHER_MESSAGES[res.reason] || LAUNCHER_MESSAGES.busy, 'warn'); return; }
    hit(); hooks.closeMenu();
    toast(Math.hypot(t.x - free.x, t.y - free.y) > LAUNCHER.hitchRange ? `${t.label}が発射台へ向かいます` : `${t.label}が発射台をつなぎました`);
  });
  btn.unhitch.addEventListener('click', () => {
    const t = selectedTowing()[0] || unitById(sim, towedLauncher()?.launch.towId);
    const res = t ? issueLauncherUnhitch(sim, t.id) : { ok: false, reason: 'notTowed' };
    if (!res.ok) { toast(LAUNCHER_MESSAGES[res.reason] || LAUNCHER_MESSAGES.busy, 'warn'); return; }
    hit(); toast('発射台を外しました'); refresh();
  });
  btn.fire.addEventListener('click', () => startPick());

  // ---- 撃つ地点を選ぶ → 確認 → 撃つ ----
  function startPick() {
    const l = fireable(); if (!l) { toast(LAUNCHER_MESSAGES.none, 'warn'); return; }
    hooks.closeMenu();
    picking = { id: l.id, prevPaused: hooks.isPaused(), target: null };
    hooks.setPaused(true);
    view.setRange(l.id); view.setPreview(null);
    r.cam.x = l.x; r.cam.y = l.y; r.cam.zoom = Math.min(r.cam.zoom, 0.55); r.clampCam(); // 届く距離の円が入るように引く
    pick.hidden = false; bar.hidden = false; go.disabled = true;
    msg.textContent = `狙う場所をタップ（青い円の中に届く。爆発は半径 3 タイル・味方には当たらない）`;
  }
  function endPick(restore) {
    if (!picking) return;
    const pp = picking.prevPaused; picking = null;
    pick.hidden = true; bar.hidden = true; view.setRange(null); view.setPreview(null);
    if (restore) hooks.setPaused(pp);
  }
  pick.addEventListener('pointerup', e => {
    if (!picking) return;
    const l = unitById(sim, picking.id);
    if (!l || l.hp <= 0) { toast(LAUNCHER_MESSAGES.none, 'warn'); endPick(true); return; }
    const rect = r.app.canvas.getBoundingClientRect(), w = r.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    picking.target = { x: Math.round(w.x), y: Math.round(w.y) };
    const c = canFire(sim, l, w.x, w.y);
    view.setPreview(picking.target);
    go.disabled = !c.ok;
    const tiles = (Math.hypot(w.x - l.x, w.y - l.y) / TILE).toFixed(1);
    msg.textContent = c.ok ? `ここに撃ちますか？（発射台から ${tiles} タイル）構え ${LAUNCHER.aimSec} 秒＋飛ぶ ${LAUNCHER.flightSec} 秒。撃つと発射台はなくなります` : `${LAUNCHER_MESSAGES[c.reason] || ''}（発射台から ${tiles} タイル。届くのは ${LAUNCHER.range / TILE} タイルまで）`;
  });
  for (const ev of ['pointerdown', 'pointermove']) pick.addEventListener(ev, stop);
  go.addEventListener('click', () => {
    if (!picking?.target) return;
    const res = issueLauncherFire(sim, picking.id, picking.target.x, picking.target.y);
    if (!res.ok) { toast(LAUNCHER_MESSAGES[res.reason] || LAUNCHER_MESSAGES.busy, 'warn'); return; }
    const pp = picking.prevPaused;
    endPick(false);
    hooks.setPaused(true); hooks.applyNow(); // 命令を入れてから、前の一時停止の状態へ
    hooks.setPaused(pp);
    toast(`構え開始！ ${LAUNCHER.aimSec} 秒後に発射。発射台を守って！`);
  });
  cancel.addEventListener('click', () => endPick(true));

  // ☰ が開いた時に書き直す（開いている間は止まっているので、そのあとは変わらない）
  const mo = new MutationObserver(() => { if (!menu.hidden) refresh(); });
  mo.observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  // 一時停止中の命令（ここから入れた物）が終わったら、ボタンの状態を新しくする
  const seen = new WeakSet();
  function scan() {
    for (const f of sim.fx) {
      if (seen.has(f) || !String(f.type).startsWith('launcher')) continue;
      seen.add(f);
      if (f.type === 'launcherBuilt') toast('発射台ができました（資材の届け先）');
      else if (f.type === 'launcherHitch') toast('発射台をつないだ（遅くなります）');
      else if (f.type === 'launcherLaunch') toast(`発射！ ${LAUNCHER.flightSec} 秒で着弾`);
      else if (f.type === 'launcherBlast') toast(f.hits ? `着弾！ ${f.hits} 体に当たった` : '着弾！ 何にも当たらなかった');
      else if (f.type === 'launcherProvoke') toast('着弾に気づいた敵が、こちらへ向かってくる！', 'warn'); // 10/26 の決定
      else if (f.type === 'launcherLost') toast(f.aiming ? '発射台が壊された！ ミサイルも消えた' : '発射台が壊された！', 'warn');
    }
    if (picking && !launchersOf(sim).some(l => l.id === picking.id)) { endPick(true); } // 選んでいる間に壊された
  }

  refresh();
  return {
    refresh, scan, startPick,
    get picking() { return !!picking; },
    destroy() { mo.disconnect(); sec.remove(); pick.remove(); bar.remove(); },
  };
}

/**
 * index.js が呼ぶ入口（?launcher=1 の時だけ）。CSS と描く部品（Pixi）を読んでから、☰ の項目をつける。
 * 返り値: { sync(now) 毎フレーム（r.sync の後で）, refresh(), destroy() }。ctx は mountLauncherMenu と同じ（view は除く）
 */
export async function mountLauncher(ctx) {
  await loadLauncherCss();
  const { createLauncherView } = await import('../render/launcher-view.js?v=3');
  const view = createLauncherView(ctx.r, ctx.sim);
  const menu = mountLauncherMenu({ ...ctx, view });
  return {
    sync(now) { view.sync(now); menu.scan(); },
    refresh: menu.refresh,
    startPick: menu.startPick,
    get picking() { return menu.picking; },
    destroy() { menu.destroy(); view.destroy(); },
  };
}
