// タッチ／マウス操作: 部隊をタップで選ぶ → そのまま指でなぞると経路、離すと命令。何もない所はドラッグで移動、2本指でズーム。
import { strokeToWaypoints } from '../sim/stroke.js?v=2';
import { issueOrder, squadUnits } from '../sim/sim.js?v=2';

export function attachInput(canvas, sim, r, hooks = {}) {
  const pts = new Map(); // pointerId → {x,y}
  let mode = null, start = null, pinch = null, lastPan = null;

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
    if (pts.size === 2) { // ピンチ開始（なぞり中なら取り消し）
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: r.cam.zoom, mid: r.screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
      mode = 'pinch'; r.ui.stroke = null; return;
    }
    if (pts.size > 2) return;
    start = p; lastPan = p;
    const s = squadAt(p.x, p.y);
    if (s) { r.ui.selected = s.id; mode = 'draw'; r.ui.stroke = [r.screenToWorld(p.x, p.y)]; hooks.onSelect?.(s.id); }
    else mode = 'pan';
  });

  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.set(e.pointerId, p);
    if (mode === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      r.cam.zoom = pinch.zoom * d / Math.max(10, pinch.d); r.clampCam();
      // 指の中心にあったワールドの点が、指の中心に残るように
      const w = r.screenToWorld(mid.x, mid.y); r.cam.x += pinch.mid.x - w.x; r.cam.y += pinch.mid.y - w.y;
    } else if (mode === 'pan') {
      r.cam.x -= (p.x - lastPan.x) / r.cam.zoom; r.cam.y -= (p.y - lastPan.y) / r.cam.zoom; lastPan = p;
    } else if (mode === 'draw') {
      const w = r.screenToWorld(p.x, p.y), last = r.ui.stroke.at(-1);
      if (Math.hypot(w.x - last.x, w.y - last.y) > 6 / r.cam.zoom) r.ui.stroke.push(w);
    }
  });

  function end(e) {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e); pts.delete(e.pointerId);
    if (mode === 'pinch') { if (pts.size === 0) mode = null; else { mode = 'pan'; lastPan = [...pts.values()][0]; } return; }
    if (mode === 'draw') {
      const moved = start && Math.hypot(p.x - start.x, p.y - start.y) > 14;
      if (moved && r.ui.stroke.length > 1) {
        const wps = strokeToWaypoints(sim.map, r.ui.stroke);
        if (wps.length) { issueOrder(sim, r.ui.selected, wps); hooks.onOrder?.(r.ui.selected, wps); }
      }
      r.ui.stroke = null;
    } else if (mode === 'pan' && start && Math.hypot(p.x - start.x, p.y - start.y) < 8) {
      r.ui.selected = null; hooks.onSelect?.(null); // 何もない所をタップ＝選択解除
    }
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
