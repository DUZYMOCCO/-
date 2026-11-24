/**
 * ABYSS DIVE — Depth Lab アプリ本体（ハブ組込 & 単体起動 & iPhone タッチ操縦・ピンチズーム対応）
 */
import {
  RESOLUTION_PRESETS,
  LIGHT_RES_PRESETS,
  buildLayerDefinitions,
  clamp,
  lerp,
  stepContinuousTime,
} from './depth-math.js?v=1';
import { DepthStackingRenderer } from './renderer-webgl2.js?v=1';
import { AbyssVerificationScene } from './scene-builder.js?v=1';
import { createDebugUI } from './debug-ui.js?v=1';

export function createDepthLabApp({ container, onBackToHub }) {
  const listeners = [];
  const on = (target, type, fn, opt) => {
    target.addEventListener(type, fn, opt);
    listeners.push([target, type, fn, opt]);
  };

  container.innerHTML = `
    <div class="adl-root">
      <canvas class="adl-canvas"></canvas>
      <div class="adl-top-left">
        ${onBackToHub ? '<button class="adl-back" type="button">← もどる</button>' : ''}
        <div class="adl-hud">読み込み中...</div>
      </div>
      <button class="adl-toggle" type="button">⚙ 調整</button>
      <aside class="adl-panel collapsed"></aside>
      <div class="adl-stick-zone" aria-label="潜水艇移動スティック">
        <div class="adl-stick-knob"></div>
      </div>
      <div class="adl-zoom-pad">
        <button class="adl-zoom-btn" data-zoom="in" type="button" aria-label="ズームイン">＋</button>
        <button class="adl-zoom-btn" data-zoom="out" type="button" aria-label="ズームアウト">－</button>
      </div>
      <div class="adl-rotate">
        <div class="adl-rotate-icon">↻</div>
        <div>横向きにすると深海の広がりをより美しく見られます</div>
        <button class="adl-rotate-skip" type="button">このまま見る</button>
      </div>
    </div>
  `;

  const rootEl = container.querySelector('.adl-root');
  const canvas = rootEl.querySelector('.adl-canvas');
  const hudEl = rootEl.querySelector('.adl-hud');
  const panelEl = rootEl.querySelector('.adl-panel');
  const toggleBtn = rootEl.querySelector('.adl-toggle');
  const backBtn = rootEl.querySelector('.adl-back');
  const stickZone = rootEl.querySelector('.adl-stick-zone');
  const stickKnob = rootEl.querySelector('.adl-stick-knob');
  const rotateEl = rootEl.querySelector('.adl-rotate');
  const rotateSkip = rootEl.querySelector('.adl-rotate-skip');

  if (backBtn && onBackToHub) {
    on(backBtn, 'click', () => onBackToHub());
  }
  if (rotateSkip) {
    on(rotateSkip, 'click', () => rotateEl.classList.add('dismissed'));
  }

  // 初期性能検証基準構成（要件 11.6）
  const cfg = {
    layerCount: 15,
    resPreset: 'std',          // 1748×804
    lightResPreset: 'half',    // 874×402 × 5グループ
    zoom: 1.0,
    parallaxStrength: 1.0,
    depthScaleStrength: 1.0,
    highLightCount: 4,
    lightSpeed: 1.0,
    shadowStrength: 0.78,
    scatterStrength: 1.05,
    emissiveBoost: 1.15,
    bloomStrength: 0.42,
    normalStrength: 1.15,
    ambientBoost: 1.0,
    turbidity: 1.0,
    currentStrength: 1.0,
    particleCount: 550,
    enableLighting: true,
    enableNormal: true,
    enableShadows: true,
    enableScatter: true,
    enableCaustics: true,
    enableBloom: true,
    enableFog: true,
    enableRefraction: true,
    enableBlur: true,
    enableParticles: true,
    enableAnim: true,
    autoCruise: false,
    debugView: 0,
  };

  const cam = {
    x: 0,
    y: 10,
    zoom: cfg.zoom,
    targetX: 0,
    targetY: 10,
    followSub: true,
  };

  const input = { left: false, right: false, up: false, down: false, ax: 0, ay: 0 };
  let worldTime = 0;
  let destroyed = false;
  let rafId = 0;
  let renderer = null;
  let scene = null;
  let layers = buildLayerDefinitions(cfg.layerCount);
  let ui = null;

  function applyResolutions() {
    if (!renderer) return;
    const rp = RESOLUTION_PRESETS.find(p => p.id === cfg.resPreset) || RESOLUTION_PRESETS[1];
    const lp = LIGHT_RES_PRESETS.find(p => p.id === cfg.lightResPreset) || LIGHT_RES_PRESETS[1];
    renderer.setResolution(rp.w, rp.h, lp.w, lp.h);
  }

  // --- キーボード操作 ---
  on(window, 'keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')  { input.left = true; cam.followSub = true; cfg.autoCruise = false; }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') { input.right = true; cam.followSub = true; cfg.autoCruise = false; }
    if (e.code === 'KeyW' || e.code === 'ArrowUp')    { input.up = true; cam.followSub = true; cfg.autoCruise = false; }
    if (e.code === 'KeyS' || e.code === 'ArrowDown')  { input.down = true; cam.followSub = true; cfg.autoCruise = false; }
    if (e.key === '+' || e.key === '=') { cfg.zoom = clamp(cfg.zoom + 0.1, 0.55, 2.0); ui?.syncSliders(); }
    if (e.key === '-' || e.key === '_') { cfg.zoom = clamp(cfg.zoom - 0.1, 0.55, 2.0); ui?.syncSliders(); }
    if (e.code === 'KeyH') {
      const hidden = hudEl.style.display === 'none';
      hudEl.style.display = hidden ? '' : 'none';
      if (!hidden) panelEl.classList.add('collapsed');
    }
  });
  on(window, 'keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')  input.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp')    input.up = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown')  input.down = false;
  });

  // --- 仮想スティック（タッチ/ポインター操作で潜水艇を滑らかに360°操縦） ---
  let stickPointerId = null;
  let stickOriginX = 0;
  let stickOriginY = 0;
  const STICK_MAX_R = 34;

  const updateStick = (clientX, clientY) => {
    const dx = clientX - stickOriginX;
    const dy = clientY - stickOriginY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_MAX_R);
    const nx = dist > 2 ? (dx / dist) * (clamped / STICK_MAX_R) : 0;
    const ny = dist > 2 ? (dy / dist) * (clamped / STICK_MAX_R) : 0;
    input.ax = nx;
    input.ay = ny;
    stickKnob.style.transform = `translate(${(nx * STICK_MAX_R).toFixed(1)}px, ${(ny * STICK_MAX_R).toFixed(1)}px)`;
    cam.followSub = true;
    cfg.autoCruise = false;
  };

  on(stickZone, 'pointerdown', (e) => {
    e.stopPropagation();
    stickPointerId = e.pointerId;
    const rect = stickZone.getBoundingClientRect();
    stickOriginX = rect.left + rect.width * 0.5;
    stickOriginY = rect.top + rect.height * 0.5;
    stickZone.classList.add('active');
    stickZone.setPointerCapture(e.pointerId);
    updateStick(e.clientX, e.clientY);
  });
  on(stickZone, 'pointermove', (e) => {
    if (e.pointerId !== stickPointerId) return;
    e.stopPropagation();
    updateStick(e.clientX, e.clientY);
  });
  const resetStick = (e) => {
    if (e.pointerId !== stickPointerId) return;
    stickPointerId = null;
    input.ax = 0;
    input.ay = 0;
    stickZone.classList.remove('active');
    stickKnob.style.transform = 'translate(0px, 0px)';
  };
  on(stickZone, 'pointerup', resetStick);
  on(stickZone, 'pointercancel', resetStick);

  // --- キャンバス：1本指パン & 2本指ピンチズーム & ホイールズーム ---
  const activePointers = new Map();
  let lastPinchDist = 0;
  let lastSingleX = 0;
  let lastSingleY = 0;

  on(canvas, 'pointerdown', (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (activePointers.size === 1) {
      lastSingleX = e.clientX;
      lastSingleY = e.clientY;
    } else if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      lastPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  on(canvas, 'pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 1) {
      const dx = e.clientX - lastSingleX;
      const dy = e.clientY - lastSingleY;
      lastSingleX = e.clientX;
      lastSingleY = e.clientY;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        cam.followSub = false;
        cfg.autoCruise = false;
        const scale = (1748 / Math.max(320, canvas.clientWidth)) / Math.max(0.4, cam.zoom);
        cam.targetX = clamp(cam.targetX - dx * scale, -1450, 1450);
        cam.targetY = clamp(cam.targetY - dy * scale, -340, 320);
      }
    } else if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinchDist > 10) {
        const ratio = dist / lastPinchDist;
        cfg.zoom = clamp(cfg.zoom * ratio, 0.55, 2.0);
        ui?.syncSliders();
      }
      lastPinchDist = dist;
    }
  });
  const endCanvasPointer = (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 1) {
      const [only] = [...activePointers.values()];
      lastSingleX = only.x;
      lastSingleY = only.y;
    }
    if (activePointers.size < 2) lastPinchDist = 0;
  };
  on(canvas, 'pointerup', endCanvasPointer);
  on(canvas, 'pointercancel', endCanvasPointer);

  on(canvas, 'wheel', (e) => {
    e.preventDefault();
    cfg.zoom = clamp(cfg.zoom - Math.sign(e.deltaY) * 0.08, 0.55, 2.0);
    ui?.syncSliders();
  }, { passive: false });

  // ズーム＋/－ボタン
  for (const btn of rootEl.querySelectorAll('.adl-zoom-btn')) {
    on(btn, 'click', () => {
      const dir = btn.dataset.zoom === 'in' ? 1 : -1;
      cfg.zoom = clamp(cfg.zoom + dir * 0.16, 0.55, 2.0);
      ui?.syncSliders();
    });
  }

  on(toggleBtn, 'click', () => {
    panelEl.classList.toggle('collapsed');
  });

  // --- フレーム時間統計 ---
  const frameTimes = [];
  const MAX_SAMPLES = 90;
  let lastPerf = performance.now();
  let hudAccum = 0;

  function computeFrameMetrics() {
    if (frameTimes.length === 0) return { fps: 60, avg: 16.6, p50: 16.6, p95: 16.6 };
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    return { fps: avg > 0 ? 1000 / avg : 0, avg, p50, p95 };
  }

  async function runLayerBenchmark(btn, outEl) {
    if (btn) { btn.disabled = true; btn.textContent = '計測中...'; }
    if (outEl) { outEl.classList.add('visible'); outEl.textContent = '計測開始...\n'; }

    const savedLayers = cfg.layerCount;
    const counts = [5, 8, 12, 15, 20, 25, 30];
    const results = [];

    for (const n of counts) {
      if (destroyed) return results;
      cfg.layerCount = n;
      layers = buildLayerDefinitions(n);
      const samples = [];
      await new Promise((resolve) => {
        let f = 0;
        let prev = performance.now();
        const step = () => {
          if (destroyed) { resolve(); return; }
          const now = performance.now();
          if (f >= 12) samples.push(now - prev);
          prev = now;
          f++;
          if (f >= 52) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      if (samples.length === 0) continue;
      samples.sort((a, b) => a - b);
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const p95 = samples[Math.floor(samples.length * 0.95)];
      const fps = 1000 / avg;
      const row = {
        layers: n,
        fps: Number(fps.toFixed(1)),
        avgMs: Number(avg.toFixed(2)),
        p95Ms: Number(p95.toFixed(2)),
        draws: renderer.stats.drawCalls,
        overdraw: Number(renderer.stats.overdrawRatio.toFixed(2)),
      };
      results.push(row);
      if (outEl) {
        outEl.textContent += `${String(n).padStart(2)}層 | ${String(row.fps).padStart(5)}fps | avg ${row.avgMs.toFixed(1)}ms p95 ${row.p95Ms.toFixed(1)}ms | DC ${row.draws} | OD ${row.overdraw}x\n`;
      }
    }

    cfg.layerCount = savedLayers;
    layers = buildLayerDefinitions(savedLayers);
    ui?.syncSliders();
    if (btn) { btn.disabled = false; btn.textContent = '▶ 5〜30層ベンチ計測'; }
    return results;
  }

  // --- 起動 ---
  (async () => {
    try {
      renderer = new DepthStackingRenderer(canvas);
      applyResolutions();

      // モジュール基準の絶対 URL で読み込むためハブ経由でも単体でも 404 にならない
      const baseUrl = new URL('../', import.meta.url).href;
      const manifestUrl = new URL('assets/manifest.json', baseUrl).href;
      const manifest = await renderer.loadManifestAssets(manifestUrl, baseUrl);
      if (destroyed) return;

      scene = new AbyssVerificationScene(manifest);
      ui = createDebugUI(panelEl, hudEl, cfg, {
        onConfigChange(key) {
          if (key === 'layerCount') layers = buildLayerDefinitions(cfg.layerCount);
          if (key === 'resPreset' || key === 'lightResPreset') applyResolutions();
        },
        onCameraPreset(p) {
          cam.followSub = false;
          cfg.autoCruise = false;
          cam.targetX = p.x;
          cam.targetY = p.y;
          cfg.zoom = p.zoom;
          ui.syncSliders();
        },
        onFollowSub() {
          cam.followSub = true;
          cfg.autoCruise = false;
        },
        onRunBenchmark(btn, outEl) {
          runLayerBenchmark(btn, outEl);
        },
      });

      window.__depthLab = {
        cfg,
        cam,
        get stats() { return renderer ? renderer.stats : null; },
        get metrics() { return computeFrameMetrics(); },
        setConfig(patch) {
          Object.assign(cfg, patch);
          layers = buildLayerDefinitions(cfg.layerCount);
          applyResolutions();
          ui.syncSliders();
        },
        setCamera(x, y, zoom) {
          cam.followSub = false;
          cam.x = cam.targetX = x;
          cam.y = cam.targetY = y;
          if (zoom !== undefined) { cam.zoom = cfg.zoom = zoom; ui.syncSliders(); }
        },
        runLayerBenchmark: () => runLayerBenchmark(null, panelEl.querySelector('#bench-output')),
      };

      lastPerf = performance.now();
      const loop = (now) => {
        if (destroyed) return;
        const rawMs = now - lastPerf;
        lastPerf = now;
        const rawDt = rawMs / 1000;

        if (rawMs > 0 && rawMs < 200) {
          frameTimes.push(rawMs);
          if (frameTimes.length > MAX_SAMPLES) frameTimes.shift();
        }

        const stepped = stepContinuousTime(worldTime, rawDt, 1.0);
        worldTime = stepped.worldTime;
        const dt = stepped.dt;

        scene.updateSubmarine(dt, input, worldTime);

        if (cfg.autoCruise) {
          cam.targetX = Math.sin(worldTime * 0.22) * 520;
          cam.targetY = Math.cos(worldTime * 0.17) * 95;
          scene.sub.x = lerp(scene.sub.x, cam.targetX - 140, dt * 1.5);
          scene.sub.y = lerp(scene.sub.y, cam.targetY + 25, dt * 1.5);
          scene.sub.facing = Math.cos(worldTime * 0.22) >= 0 ? 1 : -1;
        } else if (cam.followSub) {
          cam.targetX = scene.sub.x + scene.sub.facing * 130;
          cam.targetY = scene.sub.y - 10;
        }

        const smooth = clamp(dt * 6.0, 0, 1);
        cam.x = lerp(cam.x, cam.targetX, smooth);
        cam.y = lerp(cam.y, cam.targetY, smooth);
        cam.zoom = lerp(cam.zoom, cfg.zoom, clamp(dt * 9.0, 0, 1));

        const frameData = scene.buildFrameData(layers, cfg, cam, worldTime);
        renderer.render(frameData);

        hudAccum += rawMs;
        if (hudAccum >= 200) {
          hudAccum = 0;
          const m = computeFrameMetrics();
          ui.updateHud(m.fps, m.avg, m.p95, renderer.stats, renderer.sceneW, renderer.sceneH, renderer.lightW, renderer.lightH);
        }

        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      if (!destroyed) hudEl.textContent = `初期化エラー: ${err.message}`;
    }
  })();

  return {
    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      for (const [target, type, fn, opt] of listeners) {
        target.removeEventListener(type, fn, opt);
      }
      listeners.length = 0;
      if (renderer && renderer.dispose) renderer.dispose();
      renderer = null;
      if (window.__depthLab) window.__depthLab = null;
    },
  };
}
