/**
 * Depth Stacking — 実験環境デバッグ UI (要件 8 全項目 + 比較プリセット + ベンチマーク)
 */
import { RESOLUTION_PRESETS, LIGHT_RES_PRESETS } from './depth-math.js';

export const CAMERA_PRESETS = Object.freeze([
  { id: 'hero',    label: '全景・遺跡', x: 0,    y: 10,   zoom: 1.00 },
  { id: 'close',   label: '近接ズーム', x: -120, y: 25,   zoom: 1.55 },
  { id: 'wide',    label: '広角スケール', x: 140, y: -25, zoom: 0.72 },
  { id: 'ruin',    label: 'アーチ光影', x: -60,  y: -30,  zoom: 1.22 },
  { id: 'reef',    label: '深海サンゴ', x: 420,  y: 140,  zoom: 1.32 },
]);

export function createDebugUI(panelEl, hudEl, cfg, callbacks) {
  const sliders = [];

  const section = (title) => {
    const h = document.createElement('h2');
    h.textContent = title;
    panelEl.appendChild(h);
  };

  const addRange = (label, key, min, max, step, fmt = (v) => v.toFixed(2)) => {
    const row = document.createElement('div');
    row.className = 'ctrl-row';
    const lab = document.createElement('label');
    lab.textContent = label;
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = fmt(cfg[key]);
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(cfg[key]);
    inp.addEventListener('input', () => {
      cfg[key] = parseFloat(inp.value);
      val.textContent = fmt(cfg[key]);
      callbacks.onConfigChange?.(key);
    });
    row.append(lab, val, inp);
    panelEl.appendChild(row);
    sliders.push({ key, inp, val, fmt });
  };

  const addSelect = (label, key, options) => {
    const row = document.createElement('div');
    row.className = 'ctrl-row';
    const lab = document.createElement('label');
    lab.textContent = label;
    const sel = document.createElement('select');
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = String(o.value);
      opt.textContent = o.label;
      if (String(cfg[key]) === String(o.value)) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => {
      cfg[key] = sel.value;
      callbacks.onConfigChange?.(key);
    });
    row.append(lab, sel);
    panelEl.appendChild(row);
    return sel;
  };

  // --- 1. レイヤー・解像度 ---
  section('Depth Stacking & Resolution');
  addRange('レイヤー数 (5〜30)', 'layerCount', 5, 30, 1, (v) => `${Math.round(v)}層`);
  addSelect('内部描画解像度', 'resPreset', RESOLUTION_PRESETS.map(p => ({ value: p.id, label: p.label })));
  addSelect('ライトバッファ解像度 (×5群)', 'lightResPreset', LIGHT_RES_PRESETS.map(p => ({ value: p.id, label: p.label })));

  // --- 2. カメラ・視差 ---
  section('Camera & Parallax');
  addRange('カメラズーム', 'zoom', 0.55, 2.0, 0.01, (v) => `${v.toFixed(2)}x`);
  addRange('パララックス強度', 'parallaxStrength', 0.0, 1.8, 0.05);
  addRange('奥行き拡大率強度', 'depthScaleStrength', 0.0, 1.5, 0.05);

  const camRow = document.createElement('div');
  camRow.className = 'btn-row';
  for (const p of CAMERA_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = p.label;
    btn.addEventListener('click', () => callbacks.onCameraPreset?.(p));
    camRow.appendChild(btn);
  }
  const followBtn = document.createElement('button');
  followBtn.type = 'button';
  followBtn.textContent = '艇に追従';
  followBtn.addEventListener('click', () => callbacks.onFollowSub?.());
  camRow.appendChild(followBtn);
  panelEl.appendChild(camRow);

  // --- 3. 空間ライティング ---
  section('Spatial Lighting (5 Groups)');
  addRange('高品質動的光源の数', 'highLightCount', 0, 6, 1, (v) => `${Math.round(v)}灯`);
  addRange('光源の移動速度', 'lightSpeed', 0.0, 3.0, 0.1, (v) => `${v.toFixed(1)}x`);
  addRange('光の遮蔽・影の強度', 'shadowStrength', 0.0, 1.0, 0.05);
  addRange('水中光散乱 (ビーム/霧)', 'scatterStrength', 0.0, 2.0, 0.05);
  addRange('発光強度 (Emissive)', 'emissiveBoost', 0.0, 2.5, 0.05);
  addRange('ブルーム強度', 'bloomStrength', 0.0, 1.2, 0.05);
  addRange('法線マップ立体感', 'normalStrength', 0.0, 2.5, 0.05);
  addRange('深海環境光ベース', 'ambientBoost', 0.2, 2.0, 0.05);

  // --- 4. 深海環境・水流・粒子 ---
  section('Water, Current & Particles');
  addRange('水中の濁り (Fog)', 'turbidity', 0.0, 1.8, 0.05);
  addRange('水流の強度 (揺れ/屈折)', 'currentStrength', 0.0, 2.5, 0.05);
  addRange('浮遊粒子数', 'particleCount', 0, 1200, 25, (v) => `${Math.round(v)}`);

  // --- 5. 個別機能 ON/OFF ---
  section('Feature Toggles');
  const toggleGrid = document.createElement('div');
  toggleGrid.className = 'toggle-grid';
  const toggles = [
    ['動的ライティング', 'enableLighting'],
    ['法線立体照光', 'enableNormal'],
    ['遮蔽シャドウ', 'enableShadows'],
    ['水中光散乱', 'enableScatter'],
    ['海面コースティクス', 'enableCaustics'],
    ['ブルーム', 'enableBloom'],
    ['水中濁り/霧', 'enableFog'],
    ['水流屈折', 'enableRefraction'],
    ['深度ボケ', 'enableBlur'],
    ['浮遊粒子', 'enableParticles'],
    ['背景アニメーション', 'enableAnim'],
    ['自動カメラ巡航', 'autoCruise'],
  ];
  for (const [label, key] of toggles) {
    const lab = document.createElement('label');
    lab.className = 'toggle-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = Boolean(cfg[key]);
    cb.addEventListener('change', () => {
      cfg[key] = cb.checked;
      callbacks.onConfigChange?.(key);
    });
    const sp = document.createElement('span');
    sp.textContent = label;
    lab.append(cb, sp);
    toggleGrid.appendChild(lab);
  }
  panelEl.appendChild(toggleGrid);

  // --- 6. デバッグ可視化＆ベンチマーク ---
  section('Inspection & Benchmark');
  const viewRow = document.createElement('div');
  viewRow.className = 'btn-row';
  const views = [
    [0, '最終描画'],
    [1, '5群ライト'],
    [2, '遮蔽マスク'],
    [3, 'ブルーム'],
  ];
  const viewBtns = [];
  for (const [id, label] of views) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cfg.debugView === id) b.classList.add('active');
    b.addEventListener('click', () => {
      cfg.debugView = id;
      viewBtns.forEach(x => x.classList.toggle('active', x === b));
    });
    viewBtns.push(b);
    viewRow.appendChild(b);
  }
  panelEl.appendChild(viewRow);

  const benchRow = document.createElement('div');
  benchRow.className = 'btn-row';
  const benchBtn = document.createElement('button');
  benchBtn.type = 'button';
  benchBtn.textContent = '▶ 5〜30層ベンチ計測';
  benchBtn.addEventListener('click', () => callbacks.onRunBenchmark?.(benchBtn, benchOut));
  benchRow.appendChild(benchBtn);
  panelEl.appendChild(benchRow);

  const benchOut = document.createElement('pre');
  benchOut.id = 'bench-output';
  panelEl.appendChild(benchOut);

  return {
    syncSliders() {
      for (const s of sliders) {
        s.inp.value = String(cfg[s.key]);
        s.val.textContent = s.fmt(cfg[s.key]);
      }
    },
    updateHud(fps, msAvg, msP95, stats, sceneW, sceneH, lightW, lightH) {
      const fpsClass = fps >= 55 ? 'good' : (fps >= 40 ? 'warn' : '');
      hudEl.innerHTML = `
        <span class="stat-chip"><span class="k">FPS</span><span class="v ${fpsClass}">${fps.toFixed(1)}</span></span>
        <span class="stat-chip"><span class="k">avg/p95</span><span class="v">${msAvg.toFixed(1)}/${msP95.toFixed(1)}ms</span></span>
        <span class="stat-chip"><span class="k">Layers</span><span class="v">${stats.drawnLayers}/${stats.activeLayers}</span></span>
        <span class="stat-chip"><span class="k">Res</span><span class="v">${sceneW}×${sceneH}</span></span>
        <span class="stat-chip"><span class="k">Light×5</span><span class="v">${lightW}×${lightH}</span></span>
        <span class="stat-chip"><span class="k">Draws</span><span class="v">${stats.drawCalls}</span></span>
        <span class="stat-chip"><span class="k">Sprites</span><span class="v">${stats.visibleSprites} (-${stats.culledSprites})</span></span>
        <span class="stat-chip"><span class="k">Overdraw</span><span class="v">${stats.overdrawRatio.toFixed(2)}x</span></span>
        <span class="stat-chip"><span class="k">VRAM</span><span class="v">${stats.vramMB.toFixed(1)}MB</span></span>
      `;
    },
  };
}
