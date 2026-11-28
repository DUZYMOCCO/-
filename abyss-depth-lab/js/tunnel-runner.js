/**
 * ABYSS DIVE — 3D 回廊＆ブラックホール突入ランナー（Phase 1 独立モジュール / 2D game.js 非依存）
 *
 * 3D 深海探査（dive-3d.js）からシームレスに接続され、
 * 大深度下降海流回廊・上昇海流リフト・3,960 マイル ブラックホール突入を
 * Three.js（tunnel-three.js + Hermes 錆仕上げ .glb 自艇）で駆動する。
 */

import { createTunnelDive } from './tunnel-rules.js?v=6';
import { createTunnelView } from './tunnel-view.js?v=24';
import { createResourceLedger, RESOURCE_KEY } from './resources.js?v=2';
import { storage } from '../../common/js/storage.js';

const VW = 1280;
const VH = 720;

const COMPLETION_TARGET_WY = {
  corridor_down: 7900, // マントル上層・楽園へ着水
  corridor_up: 160,    // 表層基地エリアへ帰還
  blackhole: 7900,     // 突破後の探査復帰先
};

/**
 * 3D 回廊／ブラックホール突入セッションを起動する。
 * @param {object} opts { container, theme, onComplete, onAbort }
 */
export function createTunnelRunner(opts) {
  const container = opts.container;
  const theme = opts.theme || 'corridor_down';
  const onComplete = opts.onComplete || (() => {});
  const onAbort = opts.onAbort || (() => {});

  const ledger = createResourceLedger({
    load: () => storage.get(RESOURCE_KEY, 0),
    save: (v) => storage.set(RESOURCE_KEY, v),
  });

  const rootEl = document.createElement('div');
  rootEl.className = 'trun-root';
  rootEl.innerHTML = `
    <canvas class="trun-canvas" id="trun-canvas"></canvas>
    <div class="trun-top-bar">
      <button type="button" class="trun-btn" id="trun-abort">× 探査へ戻る</button>
    </div>
    <div class="trun-bottom-bar">
      <button type="button" class="trun-btn shield" id="trun-shield">🛡 バリア: OFF</button>
    </div>
    <div class="trun-clear-overlay hidden" id="trun-clear">
      <div class="trun-clear-card">
        <div class="trun-clear-tag" id="trun-clear-tag">3,960 MILES — EVENT HORIZON</div>
        <div class="trun-clear-title" id="trun-clear-title">ブラックホール通過</div>
        <div class="trun-clear-desc" id="trun-clear-desc">
          地球中心の特異点境界を抜け、4,000 マイルの先——木星内部海へ到達しました。<br />
          （次章：木星内部海・総計 4 万マイル航路は開発中）
        </div>
        <div class="trun-clear-bonus" id="trun-clear-bonus">獲得資源 +0</div>
        <div class="trun-clear-actions">
          <button type="button" class="trun-btn primary" id="trun-back-dive">🌊 深海探査へ戻る</button>
          <button type="button" class="trun-btn" id="trun-retry">↻ もう一度突入</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(rootEl);

  const cvs = rootEl.querySelector('#trun-canvas');
  const ctx = cvs.getContext('2d');
  const shieldBtn = rootEl.querySelector('#trun-shield');
  const abortBtn = rootEl.querySelector('#trun-abort');
  const clearEl = rootEl.querySelector('#trun-clear');
  const clearBonusEl = rootEl.querySelector('#trun-clear-bonus');
  const backDiveBtn = rootEl.querySelector('#trun-back-dive');
  const retryBtn = rootEl.querySelector('#trun-retry');

  const view = { dpr: 1, w: 1280, h: 720, scale: 1, ox: 0, oy: 0 };
  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    view.w = rootEl.clientWidth || window.innerWidth;
    view.h = rootEl.clientHeight || window.innerHeight;
    cvs.width = Math.round(view.w * view.dpr);
    cvs.height = Math.round(view.h * view.dpr);
    view.scale = Math.min(view.w / VW, view.h / VH);
    view.ox = (view.w - VW * view.scale) * 0.5;
    view.oy = (view.h - VH * view.scale) * 0.5;
  }
  resize();
  window.addEventListener('resize', resize);

  const tunnelView = createTunnelView({ ctx, VW, VH });
  let dive = createTunnelDive({ theme });
  let shieldOn = false;
  let finished = false;
  let destroyed = false;

  const keys = {};
  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };

  function syncShieldBtn() {
    shieldBtn.textContent = shieldOn ? '🛡 バリア: ON' : '🛡 バリア: OFF';
    shieldBtn.classList.toggle('active', shieldOn);
  }

  const onKeyDown = (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      shieldOn = !shieldOn;
      syncShieldBtn();
    }
    if (e.code === 'Escape') {
      destroy();
      onAbort({ theme });
    }
  };
  const onKeyUp = (e) => { keys[e.code] = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  cvs.addEventListener('pointerdown', (e) => {
    if (finished) return;
    stick.active = true;
    stick.id = e.pointerId;
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    stick.dx = 0;
    stick.dy = 0;
    cvs.setPointerCapture(e.pointerId);
  });
  cvs.addEventListener('pointermove', (e) => {
    if (!stick.active || e.pointerId !== stick.id) return;
    const r = 68;
    const dx = (e.clientX - stick.ox) / r;
    const dy = (e.clientY - stick.oy) / r;
    const m = Math.hypot(dx, dy);
    stick.dx = m > 1 ? dx / m : dx;
    stick.dy = m > 1 ? dy / m : dy;
  });
  const endStick = (e) => {
    if (e.pointerId === stick.id) {
      stick.active = false;
      stick.dx = 0;
      stick.dy = 0;
    }
  };
  cvs.addEventListener('pointerup', endStick);
  cvs.addEventListener('pointercancel', endStick);

  shieldBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    shieldOn = !shieldOn;
    syncShieldBtn();
  });
  abortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    destroy();
    onAbort({ theme });
  });
  backDiveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetWorldY = COMPLETION_TARGET_WY[theme] ?? 7900;
    destroy();
    onComplete({ theme, targetWorldY, bonus: 0 });
  });
  retryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    finished = false;
    clearEl.classList.add('hidden');
    dive = createTunnelDive({ theme });
  });

  let rafId = 0;
  let last = performance.now();

  function loop(now) {
    if (destroyed) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;

    if (!finished) {
      let ix = 0, iy = 0;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1;
      if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (keys.KeyW || keys.ArrowUp) iy -= 1;
      if (keys.KeyS || keys.ArrowDown) iy += 1;
      if (stick.active) { ix += stick.dx; iy += stick.dy; }
      const m = Math.hypot(ix, iy);
      if (m > 1) { ix /= m; iy /= m; }

      const res = dive.step(dt, ix, iy, shieldOn);
      if (res.done) {
        finished = true;
        const st = dive.state();
        const bonus = Math.max(30, Math.round(st.bonusResource || 0));
        ledger.add(bonus);
        if (theme === 'blackhole') {
          clearBonusEl.textContent = `獲得資源 +${bonus}（保有資源 ${ledger.total()}）`;
          clearEl.classList.remove('hidden');
        } else {
          const targetWorldY = COMPLETION_TARGET_WY[theme] ?? 7900;
          destroy();
          onComplete({ theme, targetWorldY, bonus });
          return;
        }
      }
    }

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#01040a';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.clip();
    tunnelView.render(dive, shieldOn);
    ctx.restore();
  }
  rafId = requestAnimationFrame(loop);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    if (tunnelView && tunnelView.destroy) tunnelView.destroy();
    if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
  }

  return { destroy };
}
