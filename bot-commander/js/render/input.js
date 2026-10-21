// タッチ／マウス操作（v0.1.2）: 味方の部隊をタップで選ぶ → 行き先をタップで移動。
// ドラッグはどこでも画面移動、2本指でズーム。選んでいる部隊をもう一度タップすると選択解除。
import { toTile } from '../sim/map.js?v=5';
import { issueOrder, squadUnits } from '../sim/sim.js?v=5';

const TAP_SLOP = 10; // これより指が動いたらタップではなくドラッグ（画面移動）

export function attachInput(canvas, sim, r, hooks = {}) {
  const pts = new Map(); // pointerId → {x,y}
  let mode = null, start = null, pinch = null, lastPan = null, dragged = false;

  const pos = e => { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };

  function squadAt(sx, sy) {
    const w = r.screenToWorld(sx, sy), reach = Math.max(24, 30 / r.cam.zoom);
    let best = null, bd = reach;
    for (const s of sim.squads) {
      if (s.side !== 'ally') continue;
      for (const u of squadUnits(sim, s)) { const d = Math.hypot(u.x - w.x, u.y - 12 - w.y); if (d < bd) { bd = d; best = s; } }
    }
    return best;
  }

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture?.(e.pointerId);
    const p = pos(e); pts.set(e.pointerId, p);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: r.cam.zoom, mid: r.screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
      mode = 'pinch'; return;
    }
    if (pts.size > 2) return;
    start = p; lastPan = p; dragged = false; mode = 'pan';
  });

  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.set(e.pointerId, p);
    if (mode === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      r.cam.zoom = pinch.zoom * d / Math.max(10, pinch.d); r.clampCam();
      const w = r.screenToWorld(mid.x, mid.y); r.cam.x += pinch.mid.x - w.x; r.cam.y += pinch.mid.y - w.y;
    } else if (mode === 'pan') {
      if (!dragged && Math.hypot(p.x - start.x, p.y - start.y) > TAP_SLOP) dragged = true;
      if (dragged) { r.cam.x -= (p.x - lastPan.x) / r.cam.zoom; r.cam.y -= (p.y - lastPan.y) / r.cam.zoom; }
      lastPan = p;
    }
  });

  function tap(p) {
    const s = squadAt(p.x, p.y);
    if (s) {
      if (r.ui.selected === s.id) { r.ui.selected = null; hooks.onSelect?.(null); }
      else { r.ui.selected = s.id; hooks.onSelect?.(s.id); }
      return;
    }
    if (r.ui.selected == null) return;
    const w = r.screenToWorld(p.x, p.y);
    const wps = [{ tx: toTile(w.x), ty: toTile(w.y) }];
    issueOrder(sim, r.ui.selected, wps); hooks.onOrder?.(r.ui.selected, wps);
  }

  function end(e) {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.delete(e.pointerId);
    if (mode === 'pinch') { if (pts.size === 0) mode = null; else { mode = 'pan'; dragged = true; lastPan = [...pts.values()][0]; } return; }
    if (mode === 'pan' && !dragged && e.type === 'pointerup') tap(p);
    mode = null;
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const p = pos(e), before = r.screenToWorld(p.x, p.y);
    r.cam.zoom *= Math.exp(-e.deltaY * 0.0015); r.clampCam();
    const after = r.screenToWorld(p.x, p.y); r.cam.x += before.x - after.x; r.cam.y += before.y - after.y;
  }, { passive: false });
}
