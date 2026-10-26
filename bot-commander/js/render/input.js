// タッチ／マウス操作（v0.4.0-dev: 部隊なし・1機ずつ）
//   ロボットをタップ → その1機を選ぶ（もう一度タップで外す）
//   地面をタップ → 選んでいる機体が移動（戦闘移動／急行は下のボタンで切り替え）。見えている敵をタップ → 狙う
//   ロボットを長押し → 同じ種類をまとめて選ぶ。地面を長押ししてからなぞる → 枠の中をまとめて選ぶ
//   ドラッグはどこでも画面移動、2本指でズーム。
//   hooks.allow(op) が false の操作はしない（v1.0.0: チュートリアルで、教える段までしめす。op は tutorial-flow.js の ALL_OPS）
import { toTile } from '../sim/map.js?v=6';
import { issueOrder, issueAttack } from '../sim/sim.js?v=27';
import { allyAt, enemyAt, unitsInRect, selectKind, tapSelect } from '../sim/select.js?v=11';

const TAP_SLOP = 10;   // これより指が動いたらタップではなくドラッグ（画面移動）
const LONG_MS = 420;   // 長押しの長さ（仮）

export function attachInput(canvas, sim, r, hooks = {}) {
  const pts = new Map(); // pointerId → {x,y}
  let mode = null, start = null, pinch = null, lastPan = null, dragged = false, longTimer = 0, longDone = false;

  const pos = e => { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const reach = () => Math.max(20, 26 / r.cam.zoom);
  const unitAtScreen = p => { const w = r.screenToWorld(p.x, p.y); return allyAt(sim.units, w.x, w.y, reach()); };
  const visible = u => sim.fog.isVisible(toTile(u.x), toTile(u.y));
  const setSel = ids => { r.ui.selected = ids; hooks.onSelect?.(ids); };
  const ok = op => !hooks.allow || hooks.allow(op) !== false;
  const clearLong = () => { if (longTimer) clearTimeout(longTimer); longTimer = 0; };

  function onLong() {
    longTimer = 0; if (mode !== 'pan' || dragged) return;
    longDone = true;
    if (!ok('group')) return;
    const u = unitAtScreen(start);
    if (u) { setSel(selectKind(sim.units, u.human ? 'human' : u.kind)); hooks.onLong?.('kind', u.kind); return; }
    // 地面の長押し → 枠で囲む
    mode = 'box'; const w = r.screenToWorld(start.x, start.y);
    r.ui.box = { a: w, b: { ...w } }; hooks.onLong?.('box');
  }

  canvas.addEventListener('pointerdown', e => {
    // isPrimary＝ほかに指がないときの最初の指。そのとき pts に残っている物は、pointerup が届かなかった指（ゴースト）なので捨てる
    if (e.isPrimary && pts.size) { pts.clear(); clearLong(); r.ui.box = null; mode = null; pinch = null; }
    canvas.setPointerCapture?.(e.pointerId);
    const p = pos(e); pts.set(e.pointerId, p);
    if (pts.size === 2) {
      clearLong(); r.ui.box = null;
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: r.cam.zoom, mid: r.screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
      mode = 'pinch'; return;
    }
    if (pts.size > 2) return;
    start = p; lastPan = p; dragged = false; longDone = false; mode = 'pan';
    clearLong(); longTimer = setTimeout(onLong, LONG_MS);
  });

  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.set(e.pointerId, p);
    if (mode === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (!ok('zoom')) return;
      r.cam.zoom = pinch.zoom * d / Math.max(10, pinch.d); r.clampCam();
      const w = r.screenToWorld(mid.x, mid.y); r.cam.x += pinch.mid.x - w.x; r.cam.y += pinch.mid.y - w.y;
    } else if (mode === 'box') {
      r.ui.box.b = r.screenToWorld(p.x, p.y);
    } else if (mode === 'pan') {
      if (!dragged && Math.hypot(p.x - start.x, p.y - start.y) > TAP_SLOP) { dragged = true; clearLong(); }
      if (dragged && ok('pan')) { r.cam.x -= (p.x - lastPan.x) / r.cam.zoom; r.cam.y -= (p.y - lastPan.y) / r.cam.zoom; }
      lastPan = p;
    }
  });

  function tap(p) {
    const u = unitAtScreen(p);
    if (u) { if (ok('select')) setSel(tapSelect(r.ui.selected, u.id)); return; }
    const sel = r.ui.selected; if (!sel.length) { hooks.onNothing?.(); return; }
    const w = r.screenToWorld(p.x, p.y);
    const e = enemyAt(sim.units, w.x, w.y, reach() + 6, visible);
    if (e && !ok('attack')) return;
    if (e) { issueAttack(sim, sel, e.id); r.ui.mark = { x: e.x, y: e.y, t: performance.now() / 1000, attack: true }; hooks.onOrder?.(sel, null, e); return; }
    if (!ok('order')) return;
    const wps = [{ tx: toTile(w.x), ty: toTile(w.y) }];
    issueOrder(sim, sel, wps, { mode: r.ui.mode }); r.ui.mark = { x: w.x, y: w.y, t: performance.now() / 1000 };
    hooks.onOrder?.(sel, wps, null);
  }

  function end(e) {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.delete(e.pointerId); clearLong();
    if (mode === 'pinch') {
      if (pts.size === 0) mode = null;
      else if (pts.size >= 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: r.cam.zoom, mid: r.screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2) }; } // 3本以上から減った: 残りの2本で測り直す
      else { mode = 'pan'; dragged = true; lastPan = [...pts.values()][0]; }
      return;
    }
    if (mode === 'box') {
      const b = r.ui.box; r.ui.box = null; mode = null;
      if (b && e.type === 'pointerup') { const ids = unitsInRect(sim.units, b.a, b.b); if (ids.length) setSel(ids); else hooks.onNothing?.(); }
      return;
    }
    if (mode === 'pan' && !dragged && !longDone && e.type === 'pointerup') tap(p);
    mode = null;
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!ok('zoom')) return;
    const p = pos(e), before = r.screenToWorld(p.x, p.y);
    r.cam.zoom *= Math.exp(-e.deltaY * 0.0015); r.clampCam();
    const after = r.screenToWorld(p.x, p.y); r.cam.x += before.x - after.x; r.cam.y += before.y - after.y;
  }, { passive: false });
  return { destroy: clearLong };
}
