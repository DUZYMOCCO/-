/**
 * ABYSS DIVE — Phase 2: 完全 3D 背後視点・深海探査エンジン（Three.js）
 *
 * 2D 版『ABYSS DIVE』の広大な縦深海世界（表層サンゴ礁 → 薄明海草帯 → 深海棚 →
 * 狭洞窟・熱水火山帯 → 大空洞・マントル上層の楽園 → 最深海溝・BH 接続）を、
 * 背後視点の完全 3D 空間として再現する。
 *
 * 既存の純粋資産をそのまま活用:
 *   - world-biomes.js: sampleBiomeAt / zoneNameAt / depthMetersAt / formatDepthDisplay
 *   - tunnel-three.js: createSubmarineRig（マット塗装 3D 潜水艇＋PBR スポットライト）
 *   - ComfyUI + Depth Anything V2 の法線・発光付き WebP アセット群
 */

import * as THREE from '../vendor/three.module.min.js';
import { createSubmarineRig } from './tunnel-three.js?v=3';
import { createAudio3D } from './audio-3d.js?v=1';
import { sampleBiomeAt, zoneNameAt, depthMetersAt, formatDepthDisplay } from './world-biomes.js?v=3';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// 3D ワールド Y（0 = 海面 .. -260 = マントル深部） ↔ world-biomes.js の worldY（0 .. 9200）
const WORLD_Y_SPAN = 9200;
const DEPTH_3D_SPAN = 260;
const y3dToWorldY = (y3d) => clamp((-y3d / DEPTH_3D_SPAN) * WORLD_Y_SPAN, 0, WORLD_Y_SPAN);
const worldYToY3d = (wy) => -(clamp(wy, 0, WORLD_Y_SPAN) / WORLD_Y_SPAN) * DEPTH_3D_SPAN;

/** 深度に応じた 3D 海底渓谷の横幅半径と中心蛇行を返す（上は広く、熱水帯は狭く、マントル広間で再び開く）。 */
function canyonProfileAt(y3d) {
  const t = clamp(-y3d / DEPTH_3D_SPAN, 0, 1);
  // 中心の緩やかな蛇行
  const cx = Math.sin(t * Math.PI * 3.2) * 5.5 + Math.cos(t * Math.PI * 6.0) * 2.2;
  const cz = Math.cos(t * Math.PI * 2.6) * 5.0 - Math.sin(t * Math.PI * 5.4) * 2.0;

  // 半径プロファイル:
  // 表層 (0..0.15): 24m の開けた海
  // 薄明〜深海棚 (0.15..0.42): 17m の大断崖
  // 熱水・火山帯 (0.42..0.72): 12.5m の狭い渓谷・洞窟
  // 大空洞・マントル楽園 (0.72..1.0): 22m の澄んだ巨大空洞！
  let r;
  if (t < 0.16) {
    r = lerp(24.0, 18.0, t / 0.16);
  } else if (t < 0.45) {
    r = lerp(18.0, 12.5, (t - 0.16) / 0.29);
  } else if (t < 0.72) {
    r = 12.5 + Math.sin((t - 0.45) / 0.27 * Math.PI * 2.0) * 1.8;
  } else {
    r = lerp(13.5, 22.5, (t - 0.72) / 0.28);
  }
  return { cx, cz, r };
}

function createGlowTex(innerCol, midCol) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, innerCol);
  grad.addColorStop(0.38, midCol);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** 縦に深く沈み込む 3D 海底渓谷シャフトメッシュを構築。 */
function buildAbyssShaft(textures) {
  const segY = 120;
  const segT = 36;
  const vertCount = (segY + 1) * (segT + 1);
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const colors = new Float32Array(vertCount * 3);
  const indices = [];

  let vi = 0, ui = 0, ci = 0;
  for (let iy = 0; iy <= segY; iy++) {
    const fy = iy / segY;
    const y3d = 6.0 - fy * (DEPTH_3D_SPAN + 18.0);
    const prof = canyonProfileAt(y3d);

    // バイオームごとの岩盤色味（表層: 明るい砂岩青 / 中層: 暗玄武岩 / 熱水帯: 溶岩赤褐 / マントル: 蒼金鉱脈）
    const volcanic = Math.exp(-Math.pow((fy - 0.56) / 0.14, 2));
    const mantle = clamp((fy - 0.72) / 0.20, 0, 1);

    for (let it = 0; it <= segT; it++) {
      const ft = it / segT;
      const ang = ft * TAU;
      const crag =
        Math.sin(ang * 5.0 + y3d * 0.14) * Math.cos(y3d * 0.09 - ang * 3.0) * 1.45 +
        Math.sin(ang * 11.0 - y3d * 0.32) * 0.65 +
        Math.cos(ang * 3.0 + y3d * 0.22) * 0.90;
      const rad = prof.r + crag;

      positions[vi++] = prof.cx + Math.cos(ang) * rad;
      positions[vi++] = y3d;
      positions[vi++] = prof.cz + Math.sin(ang) * rad;

      uvs[ui++] = ft * 4.0;
      uvs[ui++] = fy * 22.0;

      const ao = 0.65 + 0.35 * clamp((crag + 2.2) / 4.4, 0, 1);
      const rCol = ao * (0.78 + volcanic * 0.52 + mantle * 0.12);
      const gCol = ao * (0.90 - volcanic * 0.24 + mantle * 0.28);
      const bCol = ao * (1.00 - volcanic * 0.42 + mantle * 0.32);
      colors[ci++] = rCol;
      colors[ci++] = gCol;
      colors[ci++] = bCol;
    }
  }

  for (let iy = 0; iy < segY; iy++) {
    for (let it = 0; it < segT; it++) {
      const a = iy * (segT + 1) + it;
      const b = a + (segT + 1);
      const c = b + 1;
      const d = a + 1;
      // 内向き法線
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // 360° 継ぎ目の法線を平均化
  const nAttr = geo.attributes.normal;
  for (let iy = 0; iy <= segY; iy++) {
    const i0 = iy * (segT + 1);
    const i1 = i0 + segT;
    const nx = nAttr.getX(i0) + nAttr.getX(i1);
    const ny = nAttr.getY(i0) + nAttr.getY(i1);
    const nz = nAttr.getZ(i0) + nAttr.getZ(i1);
    const len = Math.hypot(nx, ny, nz) || 1;
    nAttr.setXYZ(i0, nx / len, ny / len, nz / len);
    nAttr.setXYZ(i1, nx / len, ny / len, nz / len);
  }
  nAttr.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: textures.wallAlbedo,
    normalMap: textures.wallNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    emissiveMap: textures.wallEmissive,
    emissive: new THREE.Color(0x30c8f0),
    emissiveIntensity: 1.15,
    vertexColors: true,
    roughness: 0.84,
    metalness: 0.10,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/** 2 枚の交差板（クロスビルボード）で WebP 透明アセットを 360° 立体配置するヘルパー。 */
function createCrossProp(tex, normalTex, emissiveTex, width, height, opts = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    normalMap: normalTex || null,
    emissiveMap: emissiveTex || null,
    emissive: new THREE.Color(opts.emissiveColor ?? (emissiveTex ? 0x62e8ff : 0x000000)),
    emissiveIntensity: opts.emissiveIntensity ?? (emissiveTex ? 1.2 : 0),
    transparent: true,
    alphaTest: 0.14,
    roughness: 0.72,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(width, height);
  const p1 = new THREE.Mesh(geo, mat);
  const p2 = new THREE.Mesh(geo, mat);
  p2.rotation.y = Math.PI * 0.5;
  group.add(p1, p2);
  return group;
}

/**
 * 完全 3D 背後視点・深海探査セッションを生成する。
 * @param {object} opts { container, onExit, onLaunchTunnel }
 */
export function createDive3D(opts) {
  const container = opts.container;
  const onExit = opts.onExit || (() => {});
  const onLaunchTunnel = opts.onLaunchTunnel || null;

  const rootEl = document.createElement('div');
  rootEl.className = 'd3d-root';
  rootEl.innerHTML = `
    <canvas class="d3d-canvas" id="d3d-canvas"></canvas>
    <div class="d3d-hud-top">
      <div class="d3d-zone-card">
        <div class="d3d-zone-name" id="d3d-zone">表層・サンゴ礁</div>
        <div class="d3d-depth-val" id="d3d-depth">30 m</div>
      </div>
      <div class="d3d-warp-bar" id="d3d-warps">
        <button type="button" class="d3d-pill active" data-wy="160">表層</button>
        <button type="button" class="d3d-pill" data-wy="2300">深海棚</button>
        <button type="button" class="d3d-pill" data-wy="5200">熱水帯</button>
        <button type="button" class="d3d-pill" data-wy="7900">マントル楽園</button>
        <button type="button" class="d3d-pill bh" data-action="bh">◉ BH</button>
      </div>
      <div class="d3d-right-meta">
        <span class="d3d-res" id="d3d-res">資源 0</span>
        <button type="button" class="d3d-pill" id="d3d-mute" title="音量切替">🔊</button>
        <button type="button" class="d3d-exit-btn" id="d3d-exit">× 戻る</button>
      </div>
    </div>
    <div class="d3d-crosshair" id="d3d-crosshair"></div>
    <div class="d3d-stick-zone" id="d3d-stick-zone">
      <div class="d3d-stick-base" id="d3d-stick-base">
        <div class="d3d-stick-knob" id="d3d-stick-knob"></div>
      </div>
    </div>
    <div class="d3d-actions">
      <button type="button" class="d3d-act-btn thrust" id="d3d-btn-thrust">▲ 前進</button>
      <button type="button" class="d3d-act-btn boost" id="d3d-btn-boost">⚡ 加速</button>
      <button type="button" class="d3d-act-btn fire" id="d3d-btn-fire">🔥 魚雷</button>
      <button type="button" class="d3d-act-btn flare" id="d3d-btn-flare">💡 照明弾</button>
    </div>
    <div class="d3d-badge" id="d3d-badge">THREE-3D DIVE v4.1.0</div>
  `;
  container.appendChild(rootEl);

  const canvas = rootEl.querySelector('#d3d-canvas');
  const zoneEl = rootEl.querySelector('#d3d-zone');
  const depthEl = rootEl.querySelector('#d3d-depth');
  const resEl = rootEl.querySelector('#d3d-res');
  const badgeEl = rootEl.querySelector('#d3d-badge');
  const stickZone = rootEl.querySelector('#d3d-stick-zone');
  const stickBase = rootEl.querySelector('#d3d-stick-base');
  const stickKnob = rootEl.querySelector('#d3d-stick-knob');

  // Three.js レンダラー初期化
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x0b5a78, 0.022);
  scene.fog = fog;
  scene.background = new THREE.Color(0x0b5a78);

  const camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 150);
  const audio3d = createAudio3D(camera, scene);
  const unlockAudioOnce = () => audio3d.unlock();
  rootEl.addEventListener('pointerdown', unlockAudioOnce, { passive: true });

  function resize() {
    const w = rootEl.clientWidth || window.innerWidth;
    const h = rootEl.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // 環境光＆太陽光（表層ほど明るく、深海ほど減衰）
  const hemiLight = new THREE.HemisphereLight(0x88eeff, 0x0b2638, 1.3);
  scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight(0xd8fbff, 1.6);
  sunLight.position.set(12, 45, 8);
  scene.add(sunLight);

  // テクスチャ読み込み
  const loader = new THREE.TextureLoader();
  const loadTex = (rel, isSRGB = true, repeat = false) => {
    const tex = loader.load(new URL('../assets/' + rel, import.meta.url).href);
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    tex.anisotropy = 4;
    return tex;
  };
  const tex = {
    wallAlbedo: loadTex('tunnel_canyon_wall.webp', true, true),
    wallNormal: loadTex('tunnel_canyon_wall_n.webp', false, true),
    wallEmissive: loadTex('tunnel_canyon_wall_e.webp', true, true),
    coral: loadTex('flora_coral_cyan.webp'),
    coralN: loadTex('flora_coral_cyan_n.webp', false),
    coralE: loadTex('flora_coral_cyan_e.webp'),
    kelp: loadTex('flora_kelp.webp'),
    kelpN: loadTex('flora_kelp_n.webp', false),
    hallKelp: loadTex('hall_giant_kelp.webp'),
    hallKelpN: loadTex('hall_giant_kelp_n.webp', false),
    hallKelpE: loadTex('hall_giant_kelp_e.webp'),
    vent: loadTex('volcanic_vent.webp'),
    ventN: loadTex('volcanic_vent_n.webp', false),
    ventE: loadTex('volcanic_vent_e.webp'),
    stalactite: loadTex('cave_stalactite.webp'),
    stalactiteN: loadTex('cave_stalactite_n.webp', false),
    jelly: loadTex('creature_jelly.webp'),
    jellyE: loadTex('creature_jelly_e.webp'),
    manta: loadTex('creature_manta.webp'),
    mantaE: loadTex('creature_manta_e.webp'),
    lantern: loadTex('fish_lantern.webp'),
    lanternE: loadTex('fish_lantern_e.webp'),
    ruins: loadTex('mid_ruins_arch.webp'),
    ruinsN: loadTex('mid_ruins_arch_n.webp', false),
    dotCyan: createGlowTex('rgba(255,255,255,1)', 'rgba(130,238,255,0.65)'),
    dotGold: createGlowTex('rgba(255,252,220,1)', 'rgba(255,180,82,0.65)'),
  };

  // 1) 縦深海 3D 渓谷シャフト
  const shaft = buildAbyssShaft(tex);
  scene.add(shaft.mesh);

  // 2) 海面＋ボリューメトリック太陽光シャフト（表層 0..38m）
  const surfaceGeo = new THREE.CircleGeometry(36, 40);
  surfaceGeo.rotateX(Math.PI * 0.5);
  const surfaceMat = new THREE.MeshBasicMaterial({
    color: 0x7ef2ff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  surfaceMesh.position.set(0, 4.0, 0);
  scene.add(surfaceMesh);

  const godRays = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const r = 4.5 + (i % 3) * 4.2;
    const rayGeo = new THREE.CylinderGeometry(0.9, 3.8, 34, 12, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x9cf8ff,
      transparent: true,
      opacity: 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set(Math.cos(a) * r, -13, Math.sin(a) * r);
    ray.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.14;
    ray.rotation.x = 0.08;
    scene.add(ray);
    godRays.push(ray);
  }

  // 3) マントル上層の楽園（y = -195..-255）：黄金＆蒼の光柱（修羅 vs 楽園の対比！）
  const mantlePillars = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const prof = canyonProfileAt(-225);
    const pGeo = new THREE.CylinderGeometry(1.4, 2.8, 56, 12, 1, true);
    const pMat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0x62f4ff : 0xffdf8c,
      transparent: true,
      opacity: 0.052,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const pillar = new THREE.Mesh(pGeo, pMat);
    pillar.position.set(prof.cx + Math.cos(a) * 9.5, -225, prof.cz + Math.sin(a) * 9.5);
    scene.add(pillar);
    mantlePillars.push(pillar);
  }

  // 4) 第1基地ビーコン（表層 y=-14）＆ 最深部 BH 突入ゲート（y=-256）
  const base1Prof = canyonProfileAt(-14);
  const base1Group = new THREE.Group();
  base1Group.position.set(base1Prof.cx + 7.5, -14, base1Prof.cz - 4.0);
  const baseDome = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 20, 14, 0, TAU, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x324b5c, roughness: 0.55, metalness: 0.35 })
  );
  const basePad = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.6, 0.8, 20),
    new THREE.MeshStandardMaterial({ color: 0x263844, roughness: 0.7, metalness: 0.3 })
  );
  basePad.position.y = -0.35;
  const baseBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd27a })
  );
  baseBeacon.position.y = 2.6;
  const baseLight = new THREE.PointLight(0xffcf78, 12, 22, 1.5);
  baseLight.position.y = 3.0;
  base1Group.add(baseDome, basePad, baseBeacon, baseLight);
  scene.add(base1Group);

  // 最深部のブラックホール境界ポータル（近づくと BH 突入へ接続！）
  const deepProf = canyonProfileAt(-254);
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0xffb85c,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const portalMesh = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.32, 12, 40), portalMat);
  portalMesh.rotation.x = Math.PI * 0.5;
  portalMesh.position.set(deepProf.cx, -254, deepProf.cz);
  const portalCore = new THREE.Mesh(
    new THREE.CircleGeometry(4.3, 32),
    new THREE.MeshBasicMaterial({ color: 0x05020c, side: THREE.DoubleSide })
  );
  portalCore.rotation.x = Math.PI * 0.5;
  portalCore.position.set(deepProf.cx, -254.2, deepProf.cz);
  const portalLight = new THREE.PointLight(0xffb85c, 22, 34, 1.4);
  portalLight.position.set(deepProf.cx, -250, deepProf.cz);
  scene.add(portalMesh, portalCore, portalLight);
  // 最深部 BH ポータルへ 3D 立体低音ドローンを配置
  audio3d.attachSpatialLoop(portalMesh, 'drone', { refDist: 10, maxDist: 55, volume: 0.72 });

  // 5) バイオームごとの 3D 環境プロップ（サンゴ・海草・遺跡アーチ・熱水噴出孔・鍾乳石・巨大発光海草）
  const swayingProps = [];
  for (let i = 0; i < 64; i++) {
    const fy = (i + 0.5) / 64;
    const y3d = -6 - fy * (DEPTH_3D_SPAN - 12);
    const prof = canyonProfileAt(y3d);
    const ang = (i * 2.399963) % TAU;
    const wallR = prof.r - 1.3;
    const px = prof.cx + Math.cos(ang) * wallR;
    const pz = prof.cz + Math.sin(ang) * wallR;

    let prop = null;
    if (fy < 0.22) {
      // 表層：サンゴ＆海草
      if (i % 2 === 0) {
        prop = createCrossProp(tex.coral, tex.coralN, tex.coralE, 4.4, 3.8, { emissiveColor: 0x4ae8ff, emissiveIntensity: 1.1 });
      } else {
        prop = createCrossProp(tex.kelp, tex.kelpN, null, 3.4, 7.6);
        swayingProps.push({ obj: prop, ph: i * 1.3, amp: 0.08 });
      }
    } else if (fy < 0.44) {
      // 薄明〜深海棚：遺跡アーチ＆海草
      if (i % 4 === 0) {
        prop = createCrossProp(tex.ruins, tex.ruinsN, null, 7.2, 6.2);
      } else {
        prop = createCrossProp(tex.kelp, tex.kelpN, null, 3.8, 8.2);
        swayingProps.push({ obj: prop, ph: i * 1.7, amp: 0.07 });
      }
    } else if (fy < 0.72) {
      // 熱水・火山帯：熱水噴出孔＆鍾乳石
      if (i % 2 === 0) {
        prop = createCrossProp(tex.vent, tex.ventN, tex.ventE, 4.6, 6.4, { emissiveColor: 0xff6222, emissiveIntensity: 1.8 });
      } else {
        prop = createCrossProp(tex.stalactite, tex.stalactiteN, null, 4.2, 5.8);
      }
    } else {
      // マントル楽園：巨大発光海草＆サンゴ
      if (i % 2 === 0) {
        prop = createCrossProp(tex.hallKelp, tex.hallKelpN, tex.hallKelpE, 5.2, 11.5, { emissiveColor: 0x52f6ff, emissiveIntensity: 1.5 });
        swayingProps.push({ obj: prop, ph: i * 1.1, amp: 0.06 });
      } else {
        prop = createCrossProp(tex.coral, tex.coralN, tex.coralE, 4.8, 4.2, { emissiveColor: 0xffdf82, emissiveIntensity: 1.3 });
      }
    }
    if (prop) {
      prop.position.set(px, y3d, pz);
      prop.rotation.y = ang + Math.PI * 0.5;
      scene.add(prop);
    }
  }

  // 6) 3D 生き物群（表層のマンタ・各層のクラゲ・中深層の敵性ランタン魚）
  const creatures = [];

  // 表層を優雅に旋回する巨大マンタ
  const mantaMat = new THREE.MeshStandardMaterial({
    map: tex.manta,
    emissiveMap: tex.mantaE,
    emissive: new THREE.Color(0x6ae8ff),
    emissiveIntensity: 0.9,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  const mantaMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.2), mantaMat);
  mantaMesh.rotation.x = -Math.PI * 0.42;
  scene.add(mantaMesh);
  creatures.push({ kind: 'manta', mesh: mantaMesh, baseY: -22, orbitR: 8.5, speed: 0.32, ph: 0, hp: 999, hostile: false });

  // バイオ発光クラゲ（表層〜マントル楽園まで浮遊）
  for (let i = 0; i < 18; i++) {
    const fy = 0.08 + (i / 18) * 0.88;
    const y3d = -fy * DEPTH_3D_SPAN;
    const prof = canyonProfileAt(y3d);
    const ang = (i * 1.9) % TAU;
    const r = 2.5 + (i % 4) * 2.2;
    const isMantle = fy > 0.72;
    const jMesh = createCrossProp(tex.jelly, null, tex.jellyE, isMantle ? 2.4 : 1.9, isMantle ? 2.9 : 2.3, {
      emissiveColor: isMantle ? 0xffe494 : 0x5ae8ff,
      emissiveIntensity: 1.65,
    });
    jMesh.position.set(prof.cx + Math.cos(ang) * r, y3d, prof.cz + Math.sin(ang) * r);
    scene.add(jMesh);
    creatures.push({
      kind: 'jelly',
      mesh: jMesh,
      baseY: y3d,
      cx: prof.cx,
      cz: prof.cz,
      orbitR: r,
      speed: 0.22 + (i % 3) * 0.08,
      ph: ang,
      hp: 2,
      hostile: false,
      alive: true,
    });
  }

  // 深海棚〜熱水帯の敵性深海魚（魚雷で撃破すると資源ドロップ！）
  for (let i = 0; i < 14; i++) {
    const fy = 0.24 + (i / 14) * 0.48;
    const y3d = -fy * DEPTH_3D_SPAN;
    const prof = canyonProfileAt(y3d);
    const ang = (i * 2.6) % TAU;
    const r = 3.2 + (i % 3) * 2.4;
    const fMesh = createCrossProp(tex.lantern, null, tex.lanternE, 2.3, 1.7, {
      emissiveColor: 0xff9248,
      emissiveIntensity: 1.7,
    });
    fMesh.position.set(prof.cx + Math.cos(ang) * r, y3d, prof.cz + Math.sin(ang) * r);
    scene.add(fMesh);
    creatures.push({
      kind: 'hostile',
      mesh: fMesh,
      baseY: y3d,
      cx: prof.cx,
      cz: prof.cz,
      orbitR: r,
      speed: 0.55 + (i % 4) * 0.14,
      ph: ang,
      hp: 2,
      hostile: true,
      alive: true,
    });
  }

  // 7) 回収できる深海鉱石クリスタル（近づくだけで自動回収）
  const crystals = [];
  const crysGeo = new THREE.OctahedronGeometry(0.52, 0);
  for (let i = 0; i < 24; i++) {
    const fy = 0.05 + (i / 24) * 0.90;
    const y3d = -fy * DEPTH_3D_SPAN;
    const prof = canyonProfileAt(y3d);
    const ang = (i * 2.1 + 0.7) % TAU;
    const r = 3.0 + (i % 4) * 2.0;
    const crysMat = new THREE.MeshStandardMaterial({
      color: fy > 0.70 ? 0xffe488 : 0x62f0ff,
      emissive: fy > 0.70 ? 0xffb844 : 0x22c8ff,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.35,
    });
    const m = new THREE.Mesh(crysGeo, crysMat);
    m.position.set(prof.cx + Math.cos(ang) * r, y3d, prof.cz + Math.sin(ang) * r);
    scene.add(m);
    crystals.push({ mesh: m, collected: false, value: 15 + Math.round(fy * 45) });
  }

  // 8) 3D マリンスノー＆気泡パーティクル（カメラ周囲を常時周回）
  const P_COUNT = 260;
  const pPos = new Float32Array(P_COUNT * 3);
  for (let i = 0; i < P_COUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 34;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 28;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 34;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xc2f6ff,
    map: tex.dotCyan,
    size: 0.26,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const waterPoints = new THREE.Points(pGeo, pMat);
  waterPoints.frustumCulled = false;
  scene.add(waterPoints);

  // 9) 自艇 3D リグ（回廊と共有のマット塗装 3D 潜水艇！）
  const sub = createSubmarineRig();
  sub.root.scale.setScalar(2.4);
  sub.spotLight.distance = 48;
  sub.spotLight.intensity = 52;
  scene.add(sub.root);

  // プレイヤー 3D 状態（ニュートラル時は完全静止ホバリング）
  const player = {
    pos: new THREE.Vector3(0, -10, 4),
    yaw: 0,       // ラジアン（0 = -Z 方向を向く）
    pitch: 0.0,   // 0 = 水平（正 = 上昇、負 = 下降）
    roll: 0,
    speed: 0,     // 現在の前進速度（ニュートラル時は 0 へ減衰）
    vSpeed: 0,    // 上下昇降速度
    thrustHeld: false,
    boostT: 0,
    fireCd: 0,
    flareCd: 0,
    resources: 0,
  };

  // 3D 魚雷＆3D 照明弾（本物の PointLight つき！）
  const torpedoes = [];
  const flares = [];
  const sparks = [];

  const torpGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.9, 8);
  torpGeo.rotateX(Math.PI * 0.5);
  const torpMat = new THREE.MeshBasicMaterial({ color: 0x9ef8ff });
  const flareGeo = new THREE.SphereGeometry(0.18, 10, 10);
  const flareMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });

  function fireTorpedo() {
    if (player.fireCd > 0) return;
    player.fireCd = 0.26;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')).normalize();
    // 前方の敵性魚への軽いオートエイム補助
    let bestTarget = null, bestDot = 0.86;
    for (const c of creatures) {
      if (!c.hostile || !c.alive) continue;
      const toC = c.mesh.position.clone().sub(player.pos);
      const dist = toC.length();
      if (dist > 36 || dist < 1) continue;
      const d = toC.divideScalar(dist).dot(dir);
      if (d > bestDot) { bestDot = d; bestTarget = c; }
    }
    if (bestTarget) {
      dir.copy(bestTarget.mesh.position).sub(player.pos).normalize();
    }
    const mesh = new THREE.Mesh(torpGeo, torpMat);
    mesh.position.copy(player.pos).addScaledVector(dir, 1.3);
    mesh.lookAt(mesh.position.clone().add(dir));
    scene.add(mesh);
    torpedoes.push({ mesh, dir, life: 2.4 });
    audio3d.playTorpedoFire();
  }

  function dropFlare() {
    if (player.flareCd > 0) return;
    player.flareCd = 0.9;
    // 最大 3 発までリアルタイム PointLight を保持（スマホ 60fps 維持）
    if (flares.length >= 3) {
      const old = flares.shift();
      scene.remove(old.group);
    }
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')).normalize();
    const group = new THREE.Group();
    group.position.copy(player.pos).addScaledVector(dir, 1.8);
    const orb = new THREE.Mesh(flareGeo, flareMat);
    const light = new THREE.PointLight(0xffc966, 28, 36, 1.35);
    group.add(orb, light);
    scene.add(group);
    flares.push({ group, light, vel: dir.multiplyScalar(7.5).add(new THREE.Vector3(0, -1.2, 0)), life: 10.0 });
    audio3d.playFlareIgnite();
  }

  function spawnBurst(pos, colHex) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 10, 10),
      new THREE.MeshBasicMaterial({ color: colHex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    m.position.copy(pos);
    scene.add(m);
    sparks.push({ mesh: m, life: 0.42 });
  }

  function warpToWorldY(wy) {
    const y3d = worldYToY3d(wy);
    const prof = canyonProfileAt(y3d);
    player.pos.set(prof.cx, y3d, prof.cz + 2.0);
    player.yaw = 0;
    player.pitch = 0.0;
    player.speed = 0;
    player.vSpeed = 0;
    syncWarpButtons(wy);
  }

  function syncWarpButtons(wy) {
    rootEl.querySelectorAll('.d3d-pill[data-wy]').forEach((b) => {
      const targetWy = Number(b.dataset.wy);
      b.classList.toggle('active', Math.abs(targetWy - wy) < 1200);
    });
  }

  // 入力（キーボード + 仮想スティック + 右アクションボタン）
  const keys = {};
  const onKeyDown = (e) => {
    audio3d.unlock();
    keys[e.code] = true;
    if (e.code === 'Space') fireTorpedo();
    if (e.code === 'KeyF') dropFlare();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.boostT = 1.2;
  };
  const onKeyUp = (e) => { keys[e.code] = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  stickZone.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    stick.active = true; stick.id = e.pointerId;
    stick.ox = e.clientX; stick.oy = e.clientY;
    stick.dx = 0; stick.dy = 0;
    stickZone.setPointerCapture(e.pointerId);
  });
  stickZone.addEventListener('pointermove', (e) => {
    if (!stick.active || e.pointerId !== stick.id) return;
    const maxR = 46;
    const dx = (e.clientX - stick.ox) / maxR;
    const dy = (e.clientY - stick.oy) / maxR;
    const m = Math.hypot(dx, dy);
    stick.dx = m > 1 ? dx / m : dx;
    stick.dy = m > 1 ? dy / m : dy;
    stickKnob.style.transform = `translate(${(stick.dx * 34).toFixed(1)}px, ${(stick.dy * 34).toFixed(1)}px)`;
  });
  const endStick = (e) => {
    if (e.pointerId === stick.id) {
      stick.active = false; stick.dx = 0; stick.dy = 0;
      stickKnob.style.transform = 'translate(0px, 0px)';
    }
  };
  stickZone.addEventListener('pointerup', endStick);
  stickZone.addEventListener('pointercancel', endStick);

  const thrustBtn = rootEl.querySelector('#d3d-btn-thrust');
  const setThrust = (on) => {
    player.thrustHeld = on;
    thrustBtn.classList.toggle('active', on);
  };
  thrustBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); audio3d.unlock(); setThrust(true); thrustBtn.setPointerCapture(e.pointerId); });
  thrustBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); setThrust(false); });
  thrustBtn.addEventListener('pointercancel', () => setThrust(false));

  rootEl.querySelector('#d3d-btn-fire').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio3d.unlock(); fireTorpedo(); });
  rootEl.querySelector('#d3d-btn-flare').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio3d.unlock(); dropFlare(); });
  rootEl.querySelector('#d3d-btn-boost').addEventListener('pointerdown', (e) => { e.stopPropagation(); audio3d.unlock(); player.boostT = 1.4; });
  const muteBtn = rootEl.querySelector('#d3d-mute');
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audio3d.unlock();
    const next = !audio3d.isMuted();
    audio3d.setMuted(next);
    muteBtn.textContent = next ? '🔇' : '🔊';
  });
  rootEl.querySelector('#d3d-exit').addEventListener('click', (e) => { e.stopPropagation(); destroy(); onExit(); });

  rootEl.querySelectorAll('.d3d-pill[data-wy], .d3d-pill[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      audio3d.unlock();
      if (btn.dataset.action === 'bh') {
        destroy();
        if (onLaunchTunnel) onLaunchTunnel('blackhole');
        else onExit();
        return;
      }
      if (btn.dataset.wy) {
        warpToWorldY(Number(btn.dataset.wy));
        audio3d.playSonarPing();
      }
    });
  });

  // URL パラメータ（テストラボ用 ?wy=5200 等）
  if (Number.isFinite(opts.initialWorldY)) {
    warpToWorldY(opts.initialWorldY);
  }

  let rafId = 0;
  let destroyed = false;
  let lastT = performance.now();
  let elapsed = 0;
  let fps = 60;
  const colBg = new THREE.Color();
  const colVein = new THREE.Color();

  function loop(now) {
    if (destroyed) return;
    rafId = requestAnimationFrame(loop);

    const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    elapsed += dt;
    fps = fps * 0.92 + (1 / dt) * 0.08;

    player.boostT = Math.max(0, player.boostT - dt);
    player.fireCd = Math.max(0, player.fireCd - dt);
    player.flareCd = Math.max(0, player.flareCd - dt);

    // 入力集計
    let ix = stick.active ? stick.dx : 0;
    let iy = stick.active ? stick.dy : 0;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy -= 1;
    if (keys.KeyS || keys.ArrowDown) iy += 1;
    ix = clamp(ix, -1, 1);
    iy = clamp(iy, -1, 1);

    // 背後視点 3D 操縦:
    // - ニュートラル（入力なし）なら完全静止ホバリング（勝手に前進しない）
    // - 上入力 (iy < 0 / W / ↑) = 上昇（非リバース！）
    // - 下入力 (iy > 0 / S / ↓) = 下降（非リバース！）
    // - 左/右入力 (ix) = 旋回
    // - ▲ 前進ボタン長押し（または KeyE / Shift / ⚡加速）= 向いている方向へ前進
    player.yaw -= ix * 1.85 * dt;
    const targetPitch = Math.abs(iy) > 0.05
      ? clamp(-iy * 0.72, -0.85, 0.85)
      : 0.0;
    player.pitch = lerp(player.pitch, targetPitch, Math.min(1, dt * 6.5));
    player.roll = lerp(player.roll, -ix * 0.45, Math.min(1, dt * 8));

    const boostAmt = Math.min(1, player.boostT / 0.6);
    const forwardInput = player.thrustHeld || keys.KeyE || keys.ShiftLeft || keys.ShiftRight || boostAmt > 0.05;
    const targetSpd = boostAmt > 0.05 ? (10.5 + boostAmt * 8.5) : (forwardInput ? 9.5 : 0.0);
    player.speed = lerp(player.speed, targetSpd, Math.min(1, dt * (targetSpd > player.speed ? 6.0 : 5.2)));

    // 上下スティック単体でもその場で直感的に上昇・下降できる（ニュートラルで 0 へ静止）
    const targetVSpd = Math.abs(iy) > 0.05 ? (-iy * 7.8) : 0.0;
    player.vSpeed = lerp(player.vSpeed, targetVSpd, Math.min(1, dt * 6.5));

    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')).normalize();
    if (player.speed > 0.02) {
      player.pos.addScaledVector(fwd, player.speed * dt);
    }
    if (Math.abs(player.vSpeed) > 0.02 && !forwardInput) {
      player.pos.y += player.vSpeed * dt;
    }

    // 海面と最深部のクランプ＋3D 渓谷壁との滑らかな押し戻し
    player.pos.y = clamp(player.pos.y, -DEPTH_3D_SPAN, -2.2);
    const prof = canyonProfileAt(player.pos.y);
    const dxW = player.pos.x - prof.cx;
    const dzW = player.pos.z - prof.cz;
    const distW = Math.hypot(dxW, dzW);
    const maxR = prof.r - 2.2;
    if (distW > maxR) {
      const k = maxR / (distW || 1);
      player.pos.x = prof.cx + dxW * k;
      player.pos.z = prof.cz + dzW * k;
    }

    // 最深部の BH ポータルへ飛び込んだら BH 突入シーケンスへ自動遷移！
    if (player.pos.y < -250 && player.pos.distanceTo(portalMesh.position) < 5.5 && onLaunchTunnel) {
      destroy();
      onLaunchTunnel('blackhole');
      return;
    }

    // 自艇 3D ポーズ更新（静止中はスクリューもゆっくりアイドリング）
    const moveFactor = clamp(player.speed / 9.5 + Math.abs(player.vSpeed) / 10.0, 0, 1.5);
    sub.root.position.copy(player.pos);
    sub.root.rotation.order = 'YXZ';
    sub.root.rotation.set(player.pitch, player.yaw, player.roll);
    sub.propeller.rotation.z += dt * (2.5 + moveFactor * 18 + boostAmt * 22);
    sub.jet.scale.set(0.55 + moveFactor * 0.45 + boostAmt * 0.35, 0.55 + moveFactor * 0.45 + boostAmt * 0.35, 0.25 + moveFactor * 0.85 + boostAmt * 0.95);
    sub.jetMat.opacity = 0.08 + moveFactor * 0.28 + boostAmt * 0.42;

    // 3D 背後追従カメラ
    const camBack = new THREE.Vector3(0, 1.35, 4.6).applyEuler(new THREE.Euler(player.pitch * 0.45, player.yaw, 0, 'YXZ'));
    const camTargetPos = player.pos.clone().add(camBack);
    camera.position.lerp(camTargetPos, Math.min(1, dt * 8.5));
    const lookTarget = player.pos.clone().addScaledVector(fwd, 9.5);
    camera.lookAt(lookTarget);
    camera.fov = lerp(camera.fov, 64 + boostAmt * 10, Math.min(1, dt * 7));
    camera.updateProjectionMatrix();

    // 深度バイオーム連動（world-biomes.js の公式パレット・濁度・環境光を 3D 空間へ完全同期！）
    const worldY = y3dToWorldY(player.pos.y);
    const biome = sampleBiomeAt(0, worldY);
    const depthFrac = clamp(-player.pos.y / DEPTH_3D_SPAN, 0, 1);
    const inMantle = depthFrac > 0.72;
    const inVolcanic = depthFrac > 0.44 && depthFrac <= 0.72;

    const [bgR, bgG, bgB] = biome.waterMid || [10, 42, 68];
    colBg.setRGB(bgR / 255, bgG / 255, bgB / 255);
    if (inVolcanic) colBg.lerp(new THREE.Color(0x1f0d0c), 0.55);
    if (inMantle) colBg.lerp(new THREE.Color(0x0b364a), 0.65);
    scene.background.copy(colBg);
    fog.color.copy(colBg);
    // マントル上層は「プールみたいに水が澄んでいる」を 3D フォグ密度でそのまま再現！
    fog.density = inMantle ? 0.014 : lerp(0.018, 0.036, clamp(biome.turbidity ?? 0.5, 0, 1));

    const sunFade = Math.exp(-depthFrac * 7.5);
    sunLight.intensity = 1.8 * sunFade;
    hemiLight.intensity = inMantle ? 1.05 : lerp(1.35, 0.42, clamp(depthFrac * 1.4, 0, 1));
    sub.spotLight.intensity = lerp(24, 68, clamp(depthFrac * 1.6, 0, 1)) + boostAmt * 20;

    if (inVolcanic) colVein.setHex(0xff5a22);
    else if (inMantle) colVein.setHex(0x62f4ff);
    else colVein.setHex(0x32c8f0);
    shaft.mat.emissive.copy(colVein);

    // 揺れる海草・生き物・クリスタル更新
    for (const s of swayingProps) {
      s.obj.rotation.z = Math.sin(elapsed * 1.4 + s.ph) * s.amp;
    }
    for (const c of creatures) {
      if (c.kind === 'manta') {
        const a = elapsed * c.speed;
        const pM = canyonProfileAt(c.baseY);
        c.mesh.position.set(pM.cx + Math.cos(a) * c.orbitR, c.baseY + Math.sin(elapsed * 0.9) * 1.4, pM.cz + Math.sin(a) * c.orbitR);
        c.mesh.rotation.z = -a;
      } else if (c.alive) {
        const a = c.ph + elapsed * c.speed;
        c.mesh.position.x = c.cx + Math.cos(a) * c.orbitR;
        c.mesh.position.z = c.cz + Math.sin(a) * c.orbitR;
        c.mesh.position.y = c.baseY + Math.sin(elapsed * 1.6 + c.ph) * 0.9;
        c.mesh.rotation.y = -a;
      }
    }
    for (const cr of crystals) {
      if (cr.collected) continue;
      cr.mesh.rotation.y = elapsed * 1.8;
      if (cr.mesh.position.distanceToSquared(player.pos) < 6.2) {
        cr.collected = true;
        cr.mesh.visible = false;
        player.resources += cr.value;
        spawnBurst(cr.mesh.position, 0x8ef8ff);
        audio3d.playSonarPing();
      }
    }

    // 魚雷・照明弾・エフェクト更新
    for (let i = torpedoes.length - 1; i >= 0; i--) {
      const tr = torpedoes[i];
      tr.life -= dt;
      tr.mesh.position.addScaledVector(tr.dir, 34 * dt);
      let hit = false;
      for (const c of creatures) {
        if (!c.hostile || !c.alive) continue;
        if (tr.mesh.position.distanceToSquared(c.mesh.position) < 4.5) {
          c.hp--;
          hit = true;
          spawnBurst(c.mesh.position, 0xffaa44);
          audio3d.playTorpedoHit(c.mesh.position);
          if (c.hp <= 0) {
            c.alive = false;
            c.mesh.visible = false;
            player.resources += 35;
          }
          break;
        }
      }
      if (hit || tr.life <= 0) {
        scene.remove(tr.mesh);
        torpedoes.splice(i, 1);
      }
    }
    for (let i = flares.length - 1; i >= 0; i--) {
      const fl = flares[i];
      fl.life -= dt;
      fl.vel.multiplyScalar(Math.pow(0.28, dt));
      fl.vel.y -= 1.6 * dt;
      fl.group.position.addScaledVector(fl.vel, dt);
      fl.light.intensity = 28 * clamp(fl.life / 2.5, 0, 1) * (0.92 + 0.08 * Math.sin(elapsed * 22 + i));
      if (fl.life <= 0) {
        scene.remove(fl.group);
        flares.splice(i, 1);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.life -= dt;
      sp.mesh.scale.addScalar(dt * 4.5);
      sp.mesh.material.opacity = clamp(sp.life * 2.2, 0, 1);
      if (sp.life <= 0) {
        scene.remove(sp.mesh);
        sparks.splice(i, 1);
      }
    }

    // 水中パーティクルをプレイヤー周囲へループ再配置
    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < P_COUNT; i++) {
      let x = arr[i * 3] - player.pos.x;
      let y = arr[i * 3 + 1] - player.pos.y;
      let z = arr[i * 3 + 2] - player.pos.z;
      if (x > 17) x -= 34; else if (x < -17) x += 34;
      if (y > 14) y -= 28; else if (y < -14) y += 28;
      if (z > 17) z -= 34; else if (z < -17) z += 34;
      arr[i * 3] = player.pos.x + x;
      arr[i * 3 + 1] = player.pos.y + y;
      arr[i * 3 + 2] = player.pos.z + z;
    }
    pGeo.attributes.position.needsUpdate = true;
    portalMesh.rotation.z = elapsed * 0.9;

    audio3d.updateMotion(boostAmt, depthFrac);

    // HUD 更新
    const zLabel = inMantle ? 'マントル上層・楽園' : (inVolcanic ? '熱水・火山帯' : zoneNameAt(0, worldY));
    zoneEl.textContent = zLabel;
    depthEl.textContent = formatDepthDisplay(worldY);
    resEl.textContent = `資源 ${player.resources}`;
    badgeEl.textContent = `THREE-3D DIVE v4.2.1 | ${Math.round(fps)}fps`;

    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(loop);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    audio3d.destroy();
    renderer.dispose();
    if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
  }

  return { destroy, warpToWorldY };
}
