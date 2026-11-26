/**
 * ABYSS DIVE × Depth Stacking ハイブリッド統合ブリッジ
 *
 * 責務:
 * 1. 下層 WebGL2 キャンバスに、本編のカメラ・ズーム・深度・照明弾・爆発・ヘッドライトと
 *    1px のズレもなく同期する無限横スクロール多層2D深海世界 (5〜30層可変 / 5ライティンググループ) を描画。
 * 2. 上層 Canvas2D (drawGlowPass の直後 / drawHUD の直前) に、操作層より手前の
 *    前景レイヤー (z < 0: 深海蔓天蓋・揺れる手前海藻・前景ボケ粒子) を視認性配慮しつつ合成。
 * 3. 実機試遊中に旧背景比較・レイヤー数・解像度・前景濃さ・暗幕・光設定を即変更できる軽量パネルを提供。
 */
import {
  RESOLUTION_PRESETS,
  LIGHT_RES_PRESETS,
  buildLayerDefinitions,
  clamp,
  lerp,
  projectWorldToView,
} from './depth-math.js?v=2';
import { DepthStackingRenderer } from './renderer-webgl2.js?v=3';
import { sampleBiomeAt } from './world-biomes.js?v=3';

function hashInt(n) {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function createDepthBridge({ glCanvas, rootEl }) {
  const baseUrl = new URL('../', import.meta.url).href;
  const manifestUrl = new URL('assets/manifest.json', baseUrl).href;

  // 実プレイ最適化デフォルト設定（要件 11.6 基準 + 戦闘視認性バランス）
  const cfg = {
    enabled: true,
    layerCount: 15,
    resPreset: 'std',         // 1748×804
    lightResPreset: 'half',   // 874×402 × 5群
    parallaxStrength: 1.0,
    depthScaleStrength: 1.0,
    fgOpacity: 0.65,          // 前景レイヤーの濃さ（0..1）
    darkMaskMul: 0.50,        // 本編暗幕の強さ倍率（WebGL2空間光と調和）
    bgBrightness: 1.0,
    highLightCount: 5,        // ヘッドライト + 照明弾(最大3) + 爆発/クラゲ/遺跡コア
    lightSpeed: 1.0,
    shadowStrength: 0.78,
    scatterStrength: 1.05,
    emissiveBoost: 1.15,
    bloomStrength: 0.40,
    normalStrength: 1.20,
    ambientBoost: 1.0,
    turbidity: 1.0,
    currentStrength: 1.0,
    particleCount: 500,
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
    showStats: false,
    debugView: 0,
  };

  let renderer = null;
  let manifest = null;
  let ready = false;
  let failed = false;
  let disposed = false;
  let layers = buildLayerDefinitions(cfg.layerCount);

  // 前景 Canvas2D 用イメージ（z < 0 レイヤー）
  const fgImages = {};
  const loadFgImage = (key) => {
    const img = new Image();
    img.src = new URL(`assets/${key}.webp`, baseUrl).href;
    fgImages[key] = img;
  };
  loadFgImage('fg_canopy');
  loadFgImage('flora_kelp');
  loadFgImage('cliff_overhang');
  loadFgImage('fish_lantern');

  // 前景ボケ粒子シード（操作層の手前をゆっくり横切る）
  const fgParticles = [];
  for (let i = 0; i < 42; i++) {
    fgParticles.push({
      x: hashInt(i * 17 + 1) * 2600,
      y: hashInt(i * 31 + 2) * 1400,
      z: -0.18 - hashInt(i * 47 + 3) * 0.32,
      r: 2.2 + hashInt(i * 59 + 4) * 5.8,
      spd: 0.5 + hashInt(i * 71 + 5) * 0.9,
      phase: hashInt(i * 83 + 6) * Math.PI * 2,
      bio: hashInt(i * 97 + 7) > 0.76,
    });
  }

  // FPS 計測
  const frameTimes = [];
  let lastFrameNow = performance.now();
  let hudAccum = 0;

  function applyResolution() {
    if (!renderer) return;
    const rp = RESOLUTION_PRESETS.find(p => p.id === cfg.resPreset) || RESOLUTION_PRESETS[1];
    const lp = LIGHT_RES_PRESETS.find(p => p.id === cfg.lightResPreset) || LIGHT_RES_PRESETS[1];
    renderer.setResolution(rp.w, rp.h, lp.w, lp.h);
  }

  // 非同期初期化（ロード中は本編の従来背景へ自然フォールバック）
  (async () => {
    try {
      renderer = new DepthStackingRenderer(glCanvas);
      applyResolution();
      manifest = await renderer.loadManifestAssets(manifestUrl, baseUrl);
      if (disposed) {
        renderer.dispose();
        return;
      }
      ready = true;
    } catch (err) {
      console.warn('[DepthBridge] WebGL2 init failed, falling back to Canvas2D:', err);
      failed = true;
      glCanvas.style.display = 'none';
    }
  })();

  function sizeOf(key, scale = 1.0) {
    const m = manifest && manifest[key];
    if (!m) return { w: 256 * scale, h: 256 * scale };
    return { w: m.w * scale, h: m.h * scale };
  }

  /**
   * 無限横スクロール＆多段海底棚・ストーリー準拠バイオームに対応した背景レイヤーアイテム構築 (z >= 0)
   */
  function buildWorldBackgroundFrame(snap) {
    const t = cfg.enableAnim ? snap.worldTime : 0;
    const lt = t * cfg.lightSpeed;
    const cam = { x: snap.camCenterX, y: snap.camCenterY, zoom: snap.zoom };
    const dt = clamp(snap.depthT || 0, 0, 1);

    // ストーリー準拠バイオームをカメラ中心で連続サンプリング（境界スパイクゼロ・深度と明るさを直結させない）
    const bio = sampleBiomeAt(cam.x, cam.y, snap.trench || null);
    const bw = bio.weights;
    const depthDim = lerp(1.08, 0.42, Math.pow(dt, 0.85));
    // 深層でもバイオーム固有の明るさ（合流広間の抜け・狭洞窟の暗さ・熱水帯の琥珀）を優先
    const biomeAmbScale = lerp(depthDim, bio.ambientBoost, clamp(1 - bw.sunken_city, 0, 1));

    const effectiveCfg = {
      ...cfg,
      ambientBoost: cfg.ambientBoost * biomeAmbScale * cfg.bgBrightness,
      turbidity: clamp(cfg.turbidity * lerp(0.90, 1.22, dt) * bio.turbidity, 0.0, 1.8),
      enableCaustics: cfg.enableCaustics && bio.caustics > 0.02 && dt < 0.78,
    };

    // 背景レイヤー（z > 0）＋ 操作層実地形レイヤー（z = 0.0: 当たり判定と 1px ズレずに一致する高精細岩盤）
    const bgLayers = [
      ...layers.filter(l => l.z > 0.001),
      {
        key: 'terrain_0',
        z: 0.0,
        scaleMul: 1.0,
        opacity: 1.0,
        brightness: 0.94,
        saturation: 0.96,
        tint: [1.0, 1.0, 1.0],
        turbidity: 0.04,
        blur: 0.0,
        emissiveBoost: 1.05,
        lightInfluence: 1.12,
        swayStrength: 0.5,
        animSpeed: 1.0,
        lightBlend: { g0: 2, g1: 2, weight: 0.0 },
      },
    ];
    const itemsByLayerKey = new Map();
    const activeKeys = new Set(bgLayers.map(l => l.key));
    for (const l of bgLayers) itemsByLayerKey.set(l.key, []);

    const pushToLayer = (targetZ, preferredKey, item) => {
      if (activeKeys.has(preferredKey)) {
        itemsByLayerKey.get(preferredKey).push(item);
        return;
      }
      if (bgLayers.length === 0) return;
      let best = bgLayers[0];
      let bestDiff = Infinity;
      for (const l of bgLayers) {
        const d = Math.abs(l.z - targetZ);
        if (d < bestDiff) { bestDiff = d; best = l; }
      }
      itemsByLayerKey.get(best.key).push(item);
    };

    // 1) 最遠景 (abyss_0, z=9.2): カメラ位置に合わせて無限シームレスミラー配置
    {
      const tileW = 7600;
      const baseIdx = Math.round(cam.x / tileW);
      const baseY = cam.y * 0.84 - 160;
      for (let i = baseIdx - 1; i <= baseIdx + 1; i++) {
        pushToLayer(9.2, 'abyss_0', {
          asset: 'far_abyss',
          x: i * tileW,
          y: baseY,
          w: tileW + 60,
          h: 4800,
          flipX: Math.abs(i) % 2 === 1,
          noRefract: true,
          fillRatio: 1.0,
          turbidityMul: 0.25,
          lightInfluenceMul: 0.45,
          brightness: lerp(0.98, 0.46, dt) * cfg.bgBrightness,
        });
      }
    }

    // 2) 遠景 (far_0, far_1, far_2): 無限周期の沈没都市・巨大山脈・遠方遺跡
    {
      const cityW = 3600;
      const cIdx = Math.round(cam.x / cityW);
      const cityY = lerp(520, cam.y + 240, 0.55);
      for (let i = cIdx - 1; i <= cIdx + 1; i++) {
        pushToLayer(6.2, 'far_0', {
          asset: 'far_city_ridge',
          x: i * cityW,
          y: cityY,
          w: cityW + 180,
          h: 2050,
          flipX: Math.abs(i) % 2 === 1,
          opacity: 0.74,
          turbidityMul: 1.0,
          fillRatio: 0.48,
        });
      }

      const spireStep = 1480;
      const sIdx = Math.round(cam.x / spireStep);
      for (let i = sIdx - 3; i <= sIdx + 3; i++) {
        const h = hashInt(i * 73 + 11);
        if (h < 0.26) continue; // 谷（海溝の抜け）をランダム決定論で残す
        const sc = 1.85 + hashInt(i * 41 + 3) * 0.65;
        const sz = sizeOf('cliff_spire', sc);
        pushToLayer(4.4, 'far_1', {
          asset: 'cliff_spire',
          x: i * spireStep + (h - 0.5) * 420,
          y: cam.y * 0.62 + 480 + (hashInt(i * 19) - 0.5) * 240,
          w: sz.w, h: sz.h,
          flipX: hashInt(i * 53) > 0.5,
          emissiveMul: 0.45,
          occluderWeight: 0.40,
          fillRatio: 0.45,
        });
      }

      const farRuinStep = 1750;
      const rIdx = Math.round(cam.x / farRuinStep);
      const ruinFade = clamp(bw.sunken_city || 0, 0, 1);
      for (let i = rIdx - 2; i <= rIdx + 2; i++) {
        const h = hashInt(i * 97 + 5);
        // 常に玄武岩の崖をベースに置き、沈没都市エリアでのみ遺跡アーチを連続 opacity で滑らかに重ねる（パチンと消えない）
        const cSz = sizeOf('cliff_overhang', 1.35 + h * 0.25);
        pushToLayer(3.1, 'far_2', {
          asset: 'cliff_overhang',
          x: i * farRuinStep + (h - 0.5) * 320,
          y: cam.y * 0.72 + 520,
          w: cSz.w, h: cSz.h,
          flipX: (i & 1) === 1,
          occluderWeight: 0.52,
          fillRatio: 0.44,
        });
        if (ruinFade > 0.02 && h > 0.35) {
          const rSz = sizeOf('mid_ruins_arch', 1.35 + h * 0.28);
          pushToLayer(3.1, 'far_2', {
            asset: 'mid_ruins_arch',
            x: i * farRuinStep + (h - 0.5) * 320,
            y: cam.y * 0.72 + 360,
            w: rSz.w, h: rSz.h,
            flipX: (i & 1) === 1,
            opacity: ruinFade,
            occluderWeight: 0.52 * ruinFade,
            fillRatio: 0.44,
          });
        }
      }
    }

    // 3) 中景 (mid_0, mid_1, mid_2): 各バンド自身の固定ワールド深度のバイオームで決め、距離端は連続フェード（ポップイン根絶）
    const shelfBands = [680, 1480, 2320, 3150, 4050, 4900, 5750, 6550, 7400, 8250, 9050, 9750];
    const visibleBands = shelfBands.filter(by => Math.abs(by - cam.y) < 1950);
    if (visibleBands.length === 0) {
      const b0 = Math.floor(cam.y / 800) * 800 + 250;
      visibleBands.push(b0, b0 + 800);
    }

    const simpleLights = [];
    const inHall = (bw.confluence_hall || 0) > 0.35;
    const hallMantleFade = clamp((bw.confluence_hall || 0) + (bw.mantle_upper || 0), 0, 1);

    for (const bandY of visibleBands) {
      const bandSeed = Math.round(bandY / 100);
      // 画面外 1350..1950px にかけて滑らかにフェードさせ、ある深さでスッと消える違和感を完全に無くす
      const bandDist = Math.abs(bandY - cam.y);
      const bandAlpha = clamp(1 - (bandDist - 1350) / 600, 0, 1);
      if (bandAlpha <= 0.01) continue;

      // このバンド自身の固定座標 (cam.x, bandY) におけるバイオームを参照（カメラ移動で背景がパチンと差し替わらない）
      const bBio = sampleBiomeAt(cam.x, bandY, snap.trench || null);
      const bbw = bBio.weights;
      const bCave = (bbw.narrow_cave || 0) > 0.40;
      const bVolcanic = (bbw.hydrothermal || 0) > 0.40;
      const bHall = (bbw.confluence_hall || 0) > 0.40;
      const bCorridor = (bbw.abyss_corridor || 0) > 0.40;
      const bMantle = (bbw.mantle_upper || 0) > 0.40;
      const bRuins = clamp(bbw.sunken_city || 0, 0, 1);

      // mid_0 (z=2.2): 切り立った玄武岩崖 / 火山帯・回廊は熱水チムニー
      const m0Step = 1180;
      const m0Idx = Math.round(cam.x / m0Step);
      for (let i = m0Idx - 2; i <= m0Idx + 2; i++) {
        const h = hashInt(i * 61 + bandSeed * 13);
        const asset = (bVolcanic || bCorridor) && h > 0.35 ? 'volcanic_vent' : (h > 0.46 ? 'cliff_spire' : 'cliff_overhang');
        const sc = asset === 'volcanic_vent' ? (1.15 + hashInt(i * 29 + bandSeed) * 0.35) : (1.18 + hashInt(i * 29 + bandSeed) * 0.32);
        const sz = sizeOf(asset, sc);
        pushToLayer(2.2, 'mid_0', {
          asset,
          x: i * m0Step + (h - 0.5) * 280,
          y: bandY + (asset === 'cliff_spire' || asset === 'volcanic_vent' ? -40 : 40),
          w: sz.w, h: sz.h,
          flipX: hashInt(i * 37 + bandSeed) > 0.5,
          opacity: bandAlpha,
          occluderWeight: 0.68 * bandAlpha,
          emissiveMul: asset === 'volcanic_vent' ? 1.25 : 0.75,
          fillRatio: 0.48,
        });
      }

      // mid_1 (z=1.5): 主役構造物（ステップ間隔を全バイオーム共通 1480px に固定してワープを根絶）
      const archStep = 1480;
      const aIdx = Math.round(cam.x / archStep);
      for (let i = aIdx - 2; i <= aIdx + 2; i++) {
        const h = hashInt(i * 89 + bandSeed * 23);
        if (h < 0.22) continue;
        const ax = i * archStep + (h - 0.5) * 260;
        if (bCave) {
          const sc = 0.95 + h * 0.30;
          const sz = sizeOf('cave_stalactite', sc);
          pushToLayer(1.5, 'mid_1', {
            asset: 'cave_stalactite',
            x: ax, y: bandY - 190, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            occluderWeight: 0.85 * bandAlpha,
            normalMul: 1.42,
            brightness: 0.78,
            fillRatio: 0.46,
          });
        } else if (bVolcanic || bCorridor) {
          const sc = 0.92 + h * 0.32;
          const sz = sizeOf('volcanic_vent', sc);
          pushToLayer(1.5, 'mid_1', {
            asset: 'volcanic_vent',
            x: ax, y: bandY + 10, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            occluderWeight: 0.80 * bandAlpha,
            normalMul: 1.38,
            emissiveMul: bCorridor ? 0.95 : 1.35,
            fillRatio: 0.44,
          });
        } else if (bHall || bMantle) {
          const sc = (bMantle ? 1.30 : 1.15) + h * 0.45;
          const sz = sizeOf('hall_giant_kelp', sc);
          pushToLayer(1.5, 'mid_1', {
            asset: 'hall_giant_kelp',
            x: ax, y: bandY + 40, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            deformMode: 1, swayAmp: 22, swayFreq: 0.85 + (i % 3) * 0.1, swayPhase: i * 1.9,
            occluderWeight: 0.48 * bandAlpha,
            emissiveMul: bMantle ? 1.45 : 1.05,
            fillRatio: 0.34,
          });
        } else if (bRuins > 0.05) {
          const sc = 1.05 + h * 0.22;
          const sz = sizeOf('mid_ruins_arch', sc);
          pushToLayer(1.5, 'mid_1', {
            asset: 'mid_ruins_arch',
            x: ax, y: bandY - 35, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha * bRuins,
            occluderWeight: 0.80 * bandAlpha * bRuins,
            normalMul: 1.35,
            fillRatio: 0.42,
          });
        }
      }

      // mid_2 (z=0.95): 手前中景の岩盤
      const m2Step = 1040;
      const m2Idx = Math.round(cam.x / m2Step);
      for (let i = m2Idx - 2; i <= m2Idx + 2; i++) {
        const h = hashInt(i * 43 + bandSeed * 31);
        if (h < 0.30) continue;
        let asset = h > 0.62 ? 'cliff_spire' : 'cliff_overhang';
        if (bCave && h > 0.50) asset = 'cave_stalactite';
        else if (bVolcanic && h > 0.52) asset = 'volcanic_vent';
        const sc = 0.86 + hashInt(i * 59 + bandSeed) * 0.24;
        const sz = sizeOf(asset, sc);
        const rx = i * m2Step + (h - 0.5) * 220;
        const ry = bandY + (asset === 'cave_stalactite' ? -150 : 120);
        pushToLayer(0.95, 'mid_2', {
          asset,
          x: rx, y: ry, w: sz.w, h: sz.h,
          flipX: hashInt(i * 17 + bandSeed) > 0.5,
          opacity: bandAlpha,
          occluderWeight: 0.78 * bandAlpha,
          normalMul: 1.38,
          emissiveMul: asset === 'volcanic_vent' ? 1.35 : 0.85,
          fillRatio: 0.46,
        });
      }

      // 近景 (near_0, near_1, near_2): バンド固有バイオームの植物・噴出口・発光体
      const floraStep = 460;
      const fIdx = Math.round(cam.x / floraStep);
      for (let i = fIdx - 4; i <= fIdx + 4; i++) {
        const h = hashInt(i * 101 + bandSeed * 19);
        const fx = i * floraStep + (h - 0.5) * 160;
        const fy = bandY + 185 + (hashInt(i * 23 + bandSeed) - 0.5) * 70;
        if ((bHall || bMantle) && h < 0.62) {
          const sc = 0.72 + h * 0.58;
          const sz = sizeOf('hall_giant_kelp', sc);
          pushToLayer(0.38, 'near_1', {
            asset: 'hall_giant_kelp',
            x: fx, y: fy - 45, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            deformMode: 1, swayAmp: 26, swayFreq: 0.9 + (i % 3) * 0.12, swayPhase: i * 1.7,
            emissiveMul: bMantle ? 1.35 : 1.15,
            fillRatio: 0.30,
          });
          if (simpleLights.length < 14 && Math.abs(fx - cam.x) < 1100) {
            simpleLights.push({
              x: fx, y: fy - 65, z: 0.45, radius: 290,
              color: (i & 1) ? [0.28, 0.92, 0.98] : (bMantle ? [1.0, 0.86, 0.48] : [0.58, 0.52, 1.0]),
              intensity: 0.62 * bandAlpha * (0.85 + 0.15 * Math.sin(t * 1.0 + i)),
            });
          }
        } else if (bVolcanic && h < 0.55) {
          const sc = 0.68 + h * 0.55;
          const sz = sizeOf('flora_polyps_boulder', sc);
          pushToLayer(0.22, 'near_2', {
            asset: 'flora_polyps_boulder',
            x: fx, y: fy + 25, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            emissiveMul: 1.25,
            fillRatio: 0.40,
          });
          if (simpleLights.length < 14 && Math.abs(fx - cam.x) < 1100) {
            simpleLights.push({
              x: fx, y: fy - 15, z: 0.25, radius: 260,
              color: [1.0, 0.52, 0.16],
              intensity: 0.68 * bandAlpha * (0.84 + 0.16 * Math.sin(t * 2.1 + i)),
            });
          }
        } else if (h < 0.38) {
          const sc = 0.64 + h * 0.55;
          const sz = sizeOf('flora_kelp', sc);
          pushToLayer(0.36, 'near_1', {
            asset: 'flora_kelp',
            x: fx, y: fy - 15, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            deformMode: 1, swayAmp: 24, swayFreq: 1.0 + (i % 3) * 0.12, swayPhase: i * 1.7,
            brightness: bCave ? 0.55 : 0.84,
            fillRatio: 0.28,
          });
        } else if (h < 0.70) {
          const sc = 0.52 + (h - 0.38) * 0.45;
          const sz = sizeOf('flora_coral_cyan', sc);
          pushToLayer(0.62, 'near_0', {
            asset: 'flora_coral_cyan',
            x: fx, y: fy, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            deformMode: 1, swayAmp: 8, swayFreq: 1.1, swayPhase: i * 2.1,
            emissiveMul: bCave ? 0.55 : 0.88,
            fillRatio: 0.36,
          });
          if (simpleLights.length < 12 && Math.abs(fx - cam.x) < 1100) {
            simpleLights.push({
              x: fx, y: fy - 25, z: 0.62, radius: 240,
              color: [0.18, 0.94, 0.98],
              intensity: (bCave ? 0.30 : 0.55) * bandAlpha * (0.85 + 0.15 * Math.sin(t * 1.1 + i)),
            });
          }
        } else {
          const sc = 0.64 + (h - 0.70) * 0.6;
          const sz = sizeOf('flora_polyps_boulder', sc);
          pushToLayer(0.18, 'near_2', {
            asset: 'flora_polyps_boulder',
            x: fx, y: fy + 25, w: sz.w, h: sz.h,
            flipX: (i & 1) === 1,
            opacity: bandAlpha,
            emissiveMul: 0.92,
            fillRatio: 0.40,
          });
          if (simpleLights.length < 14 && Math.abs(fx - cam.x) < 1100) {
            simpleLights.push({
              x: fx, y: fy - 15, z: 0.22, radius: 210,
              color: [1.0, 0.68, 0.24],
              intensity: 0.50 * (0.86 + 0.14 * Math.sin(t * 1.3 + i)),
            });
          }
        }
      }
    }

    // 熱水・火山帯の実地形噴出口（trench.vents）を Tier 2 琥珀光源へ流し込む
    if (snap.trench && Array.isArray(snap.trench.vents)) {
      for (const v of snap.trench.vents) {
        if (simpleLights.length >= 16) break;
        if (Math.abs(v.x - cam.x) > 1300 || Math.abs(v.y - cam.y) > 950) continue;
        const flick = 0.82 + 0.18 * Math.sin(t * 3.1 + v.seed);
        simpleLights.push({
          x: v.x, y: v.y - 48, z: 0.15,
          radius: 360 * v.power,
          color: [1.0, 0.48, 0.14],
          intensity: 0.95 * v.power * flick,
        });
      }
    }

    // 4) 16〜30層拡張時の中間補間サブレイヤー
    for (const l of bgLayers) {
      if (!l.isExtra) continue;
      const step = 980;
      const idx = Math.round(cam.x / step);
      const ls = Math.round(l.z * 100);
      for (let i = idx - 2; i <= idx + 2; i++) {
        const h = hashInt(i * 131 + ls);
        const asset = l.z > 2.2 ? 'cliff_overhang' : (h > 0.5 ? 'flora_kelp' : 'flora_coral_cyan');
        const sc = l.z > 2.2 ? 1.1 : 0.62;
        const sz = sizeOf(asset, sc);
        pushToLayer(l.z, l.key, {
          asset,
          x: i * step + (h - 0.5) * 280,
          y: cam.y * 0.75 + 310 + (h - 0.5) * 140,
          w: sz.w, h: sz.h,
          flipX: (i & 1) === 1,
          deformMode: asset === 'cliff_overhang' ? 0 : 1,
          swayAmp: asset === 'flora_kelp' ? 20 : 8,
          swayFreq: 1.05,
          swayPhase: i * 1.4 + ls,
          fillRatio: 0.34,
        });
      }
    }

    // 5) 生きた背景：巨大遮蔽マンタは開けた外洋〜沈没都市の固定深度（y≈1180）に 1 体だけ荘厳に回遊
    //    （カメラ Y に追従させず、深層・洞窟・マントルへ使い回し出現しないようにする）
    {
      const g = { layerKey: 'far_2', z: 3.10, speed: -34, span: 12000, worldY: 1180, scale: 1.35, occ: 0.65, phase: 0.42 };
      const gy = g.worldY + Math.sin(t * 0.22 + g.phase * 6.28) * 85;
      const mantaFade = clamp(1 - Math.abs(gy - cam.y) / 1150, 0, 1) * clamp(bw.sunken_city || 0, 0, 1);
      if (mantaFade > 0.02) {
        const worldX = g.phase * g.span + t * g.speed;
        const relX = ((worldX - cam.x + g.span * 0.5) % g.span + g.span) % g.span - g.span * 0.5;
        const gx = cam.x + relX;
        const sz = sizeOf('creature_manta', g.scale);
        pushToLayer(g.z, g.layerKey, {
          asset: 'creature_manta',
          x: gx, y: gy, z: g.z, w: sz.w, h: sz.h,
          flipX: g.speed < 0,
          opacity: mantaFade,
          deformMode: 3, swayAmp: 14 * g.scale, swayFreq: 1.3, swayPhase: g.phase * 8,
          occluderWeight: g.occ * mantaFade,
          emissiveMul: 1.05,
          fillRatio: 0.46,
        });
      }
    }

    // 6) 生きた背景：発光クラゲ（合流広間・マントル上層では連続フェードで群れを増やし、急出現させない）
    const jellyWorldPos = [];
    const jellyDefs = [
      { z: 0.42, span: 2600, speed: 18, yOff: -90, scale: 0.40, phase: 0.32, col: [0.30, 0.94, 0.98], op: 1.0 },
      { z: 1.45, span: 3200, speed: -14, yOff: 40, scale: 0.50, phase: 0.74, col: [0.46, 0.68, 1.0], op: 1.0 },
    ];
    if (hallMantleFade > 0.02) {
      jellyDefs.push(
        { z: 0.78, span: 2200, speed: 12, yOff: -160, scale: 0.46, phase: 0.15, col: [0.62, 0.52, 1.0], op: hallMantleFade },
        { z: 2.10, span: 3300, speed: -10, yOff: 120, scale: 0.62, phase: 0.58, col: [0.32, 0.92, 0.96], op: hallMantleFade }
      );
    }
    for (const jd of jellyDefs) {
      const rawX = jd.phase * jd.span + lt * jd.speed;
      const relX = ((rawX - cam.x + jd.span * 0.5) % jd.span + jd.span) % jd.span - jd.span * 0.5;
      const jx = cam.x + relX + Math.sin(lt * 0.25 + jd.phase * 7) * 90;
      const jy = cam.y + jd.yOff + Math.cos(lt * 0.31 + jd.phase * 5) * 85;
      const pulse = 0.78 + 0.22 * Math.sin(t * 2.0 + jd.phase * 9);
      const sz = sizeOf('creature_jelly', jd.scale);
      jellyWorldPos.push({ x: jx, y: jy, z: jd.z, pulse: pulse * jd.op, col: jd.col });
      pushToLayer(jd.z, jd.z < 0.8 ? 'near_1' : 'mid_1', {
        asset: 'creature_jelly',
        x: jx, y: jy, z: jd.z,
        w: sz.w * (0.97 + 0.05 * pulse),
        h: sz.h * (1.03 - 0.04 * pulse),
        opacity: jd.op,
        rotation: Math.cos(lt * 0.25 + jd.phase * 7) * 0.12,
        deformMode: 2, swayAmp: 11, swayFreq: 1.7, swayPhase: jd.phase * 6,
        emissiveMul: (inHall ? 1.28 : 1.1) * pulse,
        lightInfluenceMul: 0.48,
        fillRatio: 0.35,
      });
    }

    // 7) 複数奥行きの発光深海魚群
    const schools = [
      { key: 'far_2', z: 3.05, count: 6, speed: 42, span: 3600, yOff: -150, scale: 0.22, dir: 1, phase: 0.18 },
      { key: 'mid_1', z: 1.48, count: 7, speed: -54, span: 3000, yOff: -35, scale: 0.28, dir: -1, phase: 0.64 },
      { key: 'near_0', z: 0.58, count: 5, speed: 68, span: 2600, yOff: 120, scale: 0.32, dir: 1, phase: 0.41 },
    ];
    for (const sc of schools) {
      const rawX = sc.phase * sc.span + t * sc.speed;
      const relX = ((rawX - cam.x + sc.span * 0.5) % sc.span + sc.span) % sc.span - sc.span * 0.5;
      const bx = cam.x + relX;
      for (let i = 0; i < sc.count; i++) {
        const fx = bx + (i - sc.count * 0.5) * 44 * sc.scale + Math.sin(i * 2.1 + t * 0.8) * 16;
        const fy = cam.y + sc.yOff + Math.sin(i * 1.8 + sc.phase * 9) * 52 + Math.sin(t * 1.3 + i) * 12;
        const sz = sizeOf('fish_lantern', sc.scale);
        pushToLayer(sc.z, sc.key, {
          asset: 'fish_lantern',
          x: fx, y: fy, z: sc.z, w: sz.w, h: sz.h,
          flipX: sc.dir < 0,
          emissiveMul: 1.0,
          fillRatio: 0.28,
        });
      }
    }

    // 7b) 操作層実地形（z = 0.0: 当たり判定と 1px ズレずに一致する高精細 WebGL2 岩盤・海底・岩障害物）
    //     旧 Canvas2D の単色矩形・ギザギザ多角形を廃止し、ノーマルマップ＋遮蔽シャドウ対応アートで統一する。
    const terrainItems = itemsByLayerKey.get('terrain_0');
    const halfViewW = (snap.viewW / Math.max(0.25, cam.zoom)) * 0.65 + 420;
    const halfViewH = (snap.viewH / Math.max(0.25, cam.zoom)) * 0.65 + 420;

    // (a) 浅場〜中深層の円形岩障害物 (G.rocks)
    if (snap.rocks && snap.rocks.length) {
      for (let i = 0; i < snap.rocks.length; i++) {
        const r = snap.rocks[i];
        if (Math.abs(r.x - cam.x) > halfViewW || Math.abs(r.y - cam.y) > halfViewH) continue;
        const h = hashInt(Math.round(r.x) * 31 + Math.round(r.y) * 17);
        const asset = h > 0.55 ? 'cliff_overhang' : 'flora_polyps_boulder';
        const d = r.r * 2.25;
        terrainItems.push({
          asset,
          x: r.x,
          y: r.y,
          z: 0.0,
          w: d,
          h: d * 0.92,
          rotation: (h - 0.5) * 0.45,
          flipX: h > 0.5,
          occluderWeight: 0.85,
          normalMul: 1.45,
          emissiveMul: asset === 'flora_polyps_boulder' ? 0.55 : 0.0,
          brightness: 0.88,
          fillRatio: 0.62,
        });
      }
    }

    // (b) 浅場の海底ライン (FLOOR_Y = 2600、海溝開口 gorgeX0..gorgeX1 は抜く)
    const floorY = Number.isFinite(snap.floorY) ? snap.floorY : 2600;
    if (Math.abs(floorY - cam.y) < halfViewH + 260) {
      const step = 460;
      const i0 = Math.floor((cam.x - halfViewW) / step);
      const i1 = Math.ceil((cam.x + halfViewW) / step);
      const tr = snap.trench;
      for (let i = i0; i <= i1; i++) {
        const fx = i * step;
        if (tr && fx > tr.gorgeX0 + 80 && fx < tr.gorgeX1 - 80) continue;
        const h = hashInt(i * 83 + 29);
        const asset = h > 0.65 ? 'cliff_spire' : 'cliff_overhang';
        terrainItems.push({
          asset,
          x: fx,
          y: floorY + 180 + (h - 0.5) * 36,
          z: 0.0,
          w: 620,
          h: 480,
          flipX: (i & 1) === 1,
          occluderWeight: 0.78,
          normalMul: 1.42,
          brightness: 0.84,
          fillRatio: 0.65,
        });
      }
    }

    // (c) 海溝・深棚・狭洞窟・熱水帯・合流広間の実地形 (trench.solids)
    if (snap.trench && Array.isArray(snap.trench.solids)) {
      const tr = snap.trench;
      for (let si = 0; si < tr.solids.length; si++) {
        const s = tr.solids[si];
        if (s.x + s.w < cam.x - halfViewW || s.x > cam.x + halfViewW || s.y + s.h < cam.y - halfViewH || s.y > cam.y + halfViewH) {
          continue;
        }
        const b = s.biome || 'trench';
        const isLedge = s.kind === 'ledge';
        if (isLedge) {
          // 岩棚（張り出し）: 横幅に合わせて高精細岩塊を並べる
          const tileW = Math.min(340, Math.max(200, s.w * 0.55));
          const cols = Math.max(1, Math.ceil(s.w / (tileW * 0.72)));
          for (let c = 0; c < cols; c++) {
            const u = cols === 1 ? 0.5 : c / (cols - 1);
            const tx = s.x + tileW * 0.42 + u * Math.max(0, s.w - tileW * 0.84);
            const h = hashInt(si * 97 + c * 41);
            const asset = b === 'cave' ? 'cave_stalactite' : (b === 'volcanic' && h > 0.5 ? 'volcanic_vent' : 'cliff_overhang');
            terrainItems.push({
              asset,
              x: tx,
              y: s.y + s.h * 0.55,
              z: 0.0,
              w: tileW * 1.18,
              h: Math.max(s.h * 2.1, 145),
              flipX: ((si + c) & 1) === 1,
              occluderWeight: 0.90,
              normalMul: 1.48,
              emissiveMul: b === 'volcanic' ? 1.15 : 0.35,
              brightness: b === 'cave' ? 0.72 : 0.88,
              fillRatio: 0.58,
            });
          }
        } else {
          // 壁・大岩盤: 画面に見える縁（左右・上端・下端）に沿って高精細岩をタイリング（過密オーバードロー防止）
          const tileS = 340;
          const xStart = Math.max(s.x, cam.x - halfViewW);
          const xEnd = Math.min(s.x + s.w, cam.x + halfViewW);
          const yStart = Math.max(s.y, cam.y - halfViewH);
          const yEnd = Math.min(s.y + s.h, cam.y + halfViewH);
          const stepX = Math.max(220, tileS * 0.72);
          const stepY = Math.max(220, tileS * 0.72);
          const ix0 = Math.floor((xStart - s.x) / stepX);
          const ix1 = Math.ceil((xEnd - s.x) / stepX);
          const iy0 = Math.floor((yStart - s.y) / stepY);
          const iy1 = Math.ceil((yEnd - s.y) / stepY);
          for (let iy = iy0; iy <= iy1; iy++) {
            const ty = clamp(s.y + iy * stepY + tileS * 0.36, s.y + 40, s.y + s.h - 40);
            for (let ix = ix0; ix <= ix1; ix++) {
              const tx = clamp(s.x + ix * stepX + tileS * 0.36, s.x + 40, s.x + s.w - 40);
              const h = hashInt(si * 131 + ix * 53 + iy * 29);
              let asset = 'cliff_overhang';
              if (b === 'volcanic') asset = h > 0.45 ? 'volcanic_vent' : 'cliff_spire';
              else if (b === 'cave') asset = (iy === 0 && h > 0.4) ? 'cave_stalactite' : 'cliff_overhang';
              else if (h > 0.5) asset = 'cliff_spire';
              terrainItems.push({
                asset,
                x: tx,
                y: ty,
                z: 0.0,
                w: Math.min(tileS * 1.25, s.w + 90),
                h: Math.min(tileS * 1.25, s.h + 90),
                flipX: ((ix + iy + si) & 1) === 1,
                occluderWeight: 0.92,
                normalMul: 1.46,
                emissiveMul: b === 'volcanic' ? 1.05 : 0.25,
                brightness: b === 'cave' ? 0.68 : 0.84,
                fillRatio: 0.68,
              });
            }
          }
        }
      }

      // (d) 合流広間の底床 (deepFloorY)
      if (Number.isFinite(tr.deepFloorY) && Math.abs(tr.deepFloorY - cam.y) < halfViewH + 260) {
        const step = 420;
        const i0 = Math.floor(Math.max(tr.hallX0 - 160, cam.x - halfViewW) / step);
        const i1 = Math.ceil(Math.min(tr.hallX1 + 160, cam.x + halfViewW) / step);
        for (let i = i0; i <= i1; i++) {
          const fx = i * step;
          const h = hashInt(i * 71 + 911);
          terrainItems.push({
            asset: h > 0.5 ? 'cliff_overhang' : 'cliff_spire',
            x: fx,
            y: tr.deepFloorY + 150,
            z: 0.0,
            w: 560,
            h: 420,
            flipX: (i & 1) === 1,
            occluderWeight: 0.85,
            normalMul: 1.42,
            brightness: 0.88,
            fillRatio: 0.62,
          });
        }
      }

      // (e) 熱水噴出口チムニー (trench.vents)
      if (Array.isArray(tr.vents)) {
        for (const v of tr.vents) {
          if (Math.abs(v.x - cam.x) > halfViewW || Math.abs(v.y - cam.y) > halfViewH) continue;
          const sz = sizeOf('volcanic_vent', 0.34 * v.power);
          terrainItems.push({
            asset: 'volcanic_vent',
            x: v.x,
            y: v.y - sz.h * 0.42,
            z: 0.0,
            w: sz.w,
            h: sz.h,
            flipX: (v.seed & 1) === 1,
            occluderWeight: 0.80,
            normalMul: 1.40,
            emissiveMul: 1.55,
            fillRatio: 0.45,
          });
        }
      }
    }

    // 8) Tier 1 高品質動的光源（本編の潜水艇ライト・照明弾・爆発閃光＋環境発光生物をリアルタイム統合！）
    const highLights = [];
    const beams = [];

    // #0: 本編の潜水艇ヘッドライト
    if (snap.player && snap.player.alive) {
      const p = snap.player;
      const facing = (p.facing !== undefined && p.facing < 0) ? -1 : 1;
      const ang = p.rotate || 0;
      const dirX = Math.cos(ang) * facing;
      const dirY = Math.sin(ang);
      const beamAng = Math.atan2(dirY, dirX);
      const lx = p.x + dirX * 56;
      const ly = p.y + dirY * 56;
      highLights.push({
        x: lx, y: ly, z: 0.0,
        radius: 860,
        zRange: 2.6,
        color: [1.0, 0.94, 0.78],
        intensity: 1.75,
        dirX, dirY,
        cosHalfAngle: Math.cos(0.46),
        coneSoftness: 0.26,
      });
      beams.push({
        x: lx, y: ly, z: 0.0,
        angle: beamAng,
        length: 720,
        halfStart: 14,
        halfEnd: 190,
        color: [0.80, 0.96, 1.0],
        intensity: 0.22,
      });
    }

    // #1..#3: 本編の照明弾（フレア）→ 沈みながら背景の多層遺跡や岩肌を広く乳白琥珀で照らす！
    if (snap.flares && snap.flares.length) {
      for (const f of snap.flares) {
        if (highLights.length >= 6) break;
        if (f.intensity <= 0.02) continue;
        highLights.push({
          x: f.x, y: f.y, z: 0.08,
          radius: 940 * (0.82 + 0.18 * f.intensity),
          zRange: 3.4,
          color: [1.0, 0.95, 0.84],
          intensity: 1.65 * f.intensity,
          cosHalfAngle: -2.0,
        });
      }
    }

    // 本編の爆発閃光（最も強い爆発を Tier 1 に昇格、残りは Tier 2 へ）
    if (snap.lights && snap.lights.length) {
      const sortedExp = [...snap.lights].sort((a, b) => (b.strength * b.r) - (a.strength * a.r));
      for (const ex of sortedExp) {
        if (highLights.length < 6 && ex.strength > 0.25) {
          highLights.push({
            x: ex.x, y: ex.y, z: 0.0,
            radius: Math.max(360, ex.r * 2.2),
            zRange: 2.6,
            color: [1.0, 0.74, 0.36],
            intensity: 1.75 * ex.strength,
            cosHalfAngle: -2.0,
          });
        } else if (simpleLights.length < 16) {
          simpleLights.push({
            x: ex.x, y: ex.y, z: 0.0,
            radius: Math.max(240, ex.r * 1.8),
            color: [1.0, 0.72, 0.34],
            intensity: 1.15 * ex.strength,
          });
        }
      }
    }

    // 残り枠に自律発光クラゲと遺跡共鳴コアを配置
    for (const jp of jellyWorldPos) {
      if (highLights.length < 6) {
        highLights.push({
          x: jp.x, y: jp.y, z: jp.z,
          radius: inHall ? 640 : 560,
          zRange: 2.2,
          color: jp.col || [0.30, 0.94, 0.98],
          intensity: (inHall ? 1.28 : 1.15) * jp.pulse,
          cosHalfAngle: -2.0,
        });
      }
    }

    // 本編の発光する敵・基地灯を Tier 2 簡易光源へ流し込む
    if (snap.bioLights && snap.bioLights.length) {
      for (const bl of snap.bioLights) {
        if (simpleLights.length >= 16) break;
        simpleLights.push({
          x: bl.x, y: bl.y, z: 0.05,
          radius: bl.r,
          color: bl.color,
          intensity: bl.intensity,
        });
      }
    }

    return {
      cam,
      cfg: effectiveCfg,
      biome: bio,
      viewW: snap.viewW,
      viewH: snap.viewH,
      layers: bgLayers,
      itemsByLayerKey,
      highLights: highLights.slice(0, clamp(cfg.highLightCount, 0, 6)),
      simpleLights: simpleLights.slice(0, 16),
      beams,
      worldTime: t,
      skipForegroundParticles: true,
    };
  }

  /**
   * 下層 WebGL2 背景描画（game.js の render() 冒頭で呼ばれる）
   * 戻り値: true = Depth Stacking が背景を描画済み（game.js は透過クリア＆旧背景スキップ）
   */
  function renderBackground(snap) {
    const now = performance.now();
    const ms = now - lastFrameNow;
    lastFrameNow = now;
    if (ms > 0 && ms < 200) {
      frameTimes.push(ms);
      if (frameTimes.length > 60) frameTimes.shift();
    }

    if (!cfg.enabled || !ready || failed || snap.suspend) {
      glCanvas.style.opacity = '0';
      return false;
    }

    glCanvas.style.opacity = '1';
    const frame = buildWorldBackgroundFrame(snap);
    renderer.render(frame);

    hudAccum += ms;
    if (hudAccum >= 220) {
      hudAccum = 0;
      updateMiniStats();
    }
    return true;
  }

  /**
   * 上層 Canvas2D 前景レイヤー描画（drawGlowPass の直後・drawHUD の直前）
   * 操作層より手前 (z < 0: 前景3層 + 最前景1層) を中央の戦闘領域を妨げず映画的にフレーミング
   */
  function renderForeground(ctx, snap) {
    if (!cfg.enabled || !ready || failed || snap.suspend || cfg.fgOpacity <= 0.01) return;

    const vw = snap.vw;
    const vh = snap.vh;
    const cam = { x: snap.camCenterX, y: snap.camCenterY, zoom: snap.zoom };
    const t = cfg.enableAnim ? snap.worldTime : 0;
    const fgOp = cfg.fgOpacity;
    const fgLayers = layers.filter(l => l.z < -0.001);
    if (fgLayers.length === 0) return;

    ctx.save();

    // 1) 上端の垂れ下がる深海蔓天蓋（z = -0.26）と下端の揺れる暗い海藻（z = -0.18 / -0.36）
    const canopyImg = fgImages.fg_canopy;
    const kelpImg = fgImages.flora_kelp;

    const topLayer = fgLayers.find(l => l.z <= -0.20) || fgLayers[0];
    if (canopyImg && canopyImg.complete && canopyImg.naturalWidth > 0 && topLayer) {
      const step = 1240;
      const baseIdx = Math.round(cam.x / step);
      const projOpts = { parallaxStrength: cfg.parallaxStrength, depthScaleStrength: cfg.depthScaleStrength };
      for (let i = baseIdx - 2; i <= baseIdx + 2; i++) {
        const h = hashInt(i * 149 + 7);
        if (h < 0.35) continue; // 疎に配置して画面上部の抜けを確保
        const wx = i * step + (h - 0.5) * 280;
        const proj = projectWorldToView(wx, cam.y, topLayer.z, cam, vw, vh, projOpts);
        const w = 420 * proj.scale;
        const hImg = (canopyImg.naturalHeight / canopyImg.naturalWidth) * w;
        if (proj.sx + w * 0.6 < -60 || proj.sx - w * 0.6 > vw + 60) continue;
        const sway = Math.sin(t * 0.95 + i * 2.1) * 10 * cfg.currentStrength;
        ctx.save();
        ctx.globalAlpha = 0.52 * fgOp;
        ctx.translate(proj.sx + sway, -hImg * 0.24);
        if ((i & 1) === 1) ctx.scale(-1, 1);
        ctx.drawImage(canopyImg, -w * 0.5, 0, w, hImg);
        ctx.restore();
      }
    }

    const botLayer = fgLayers[0];
    if (kelpImg && kelpImg.complete && kelpImg.naturalWidth > 0 && botLayer) {
      const step = 920;
      const baseIdx = Math.round(cam.x / step);
      const projOpts = { parallaxStrength: cfg.parallaxStrength, depthScaleStrength: cfg.depthScaleStrength };
      for (let i = baseIdx - 2; i <= baseIdx + 2; i++) {
        const h = hashInt(i * 173 + 19);
        if (h < 0.38) continue;
        const wx = i * step + (h - 0.5) * 240;
        const proj = projectWorldToView(wx, cam.y, botLayer.z, cam, vw, vh, projOpts);
        const w = 175 * proj.scale;
        const hImg = (kelpImg.naturalHeight / kelpImg.naturalWidth) * w;
        if (proj.sx + w < -60 || proj.sx - w > vw + 60) continue;
        const sway = Math.sin(t * 1.15 + i * 1.8) * 0.08 * cfg.currentStrength;
        ctx.save();
        ctx.globalAlpha = 0.46 * fgOp;
        // 下端からそっと覗くシルエット（中央の戦闘空間を絶対に邪魔しない高さ）
        ctx.translate(proj.sx, vh + hImg * 0.46);
        ctx.rotate(sway);
        if ((i & 1) === 1) ctx.scale(-1, 1);
        ctx.drawImage(kelpImg, -w * 0.5, -hImg, w, hImg);
        ctx.restore();
      }
    }

    // 2) 最前景の柔らかいボケ浮遊粒子（z = -0.18..-0.50、強い視差でスピード感と奥行きを演出）
    if (cfg.enableParticles && cfg.particleCount > 0) {
      const spanX = 2400;
      const spanY = 1350;
      const projOpts = { parallaxStrength: cfg.parallaxStrength, depthScaleStrength: cfg.depthScaleStrength };
      for (const fp of fgParticles) {
        const dx = t * 18 * fp.spd * cfg.currentStrength + Math.sin(t * 0.6 + fp.phase) * 24;
        const dy = t * 8 * fp.spd + Math.cos(t * 0.5 + fp.phase) * 16;
        const relX = ((fp.x + dx - cam.x) % spanX + spanX) % spanX - spanX * 0.5;
        const relY = ((fp.y + dy - cam.y) % spanY + spanY) % spanY - spanY * 0.5;
        const proj = projectWorldToView(cam.x + relX, cam.y + relY, fp.z, cam, vw, vh, projOpts);
        if (proj.sx < -30 || proj.sx > vw + 30 || proj.sy < -30 || proj.sy > vh + 30) continue;
        const r = clamp(fp.r * proj.scale, 2, 18);
        const twinkle = 0.65 + 0.35 * Math.sin(t * 1.7 + fp.phase * 2.3);
        const grad = ctx.createRadialGradient(proj.sx, proj.sy, 0, proj.sx, proj.sy, r);
        if (fp.bio) {
          grad.addColorStop(0, `rgba(110, 240, 255, ${(0.36 * fgOp * twinkle).toFixed(3)})`);
          grad.addColorStop(1, 'rgba(50, 180, 210, 0)');
        } else {
          grad.addColorStop(0, `rgba(180, 224, 240, ${(0.22 * fgOp * twinkle).toFixed(3)})`);
          grad.addColorStop(1, 'rgba(130, 180, 200, 0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // --- インゲーム Depth 調整オーバーレイ UI（開閉は index.js の統合「☰ メニュー」から呼ぶ） ---
  const miniStats = document.createElement('div');
  miniStats.className = 'adl-mini-stats';
  miniStats.style.display = 'none';
  miniStats.textContent = 'Depth 15層';

  const panel = document.createElement('aside');
  panel.className = 'adl-panel collapsed';

  const closePanelBtn = document.createElement('button');
  closePanelBtn.type = 'button';
  closePanelBtn.className = 'adl-panel-close';
  closePanelBtn.textContent = '× Depth 設定を閉じる';
  closePanelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.add('collapsed');
  });
  panel.appendChild(closePanelBtn);

  const stopProp = (e) => e.stopPropagation();
  panel.addEventListener('pointerdown', stopProp);
  panel.addEventListener('touchstart', stopProp, { passive: true });

  function updateMiniStats() {
    if (!cfg.showStats || !cfg.enabled || !renderer) {
      miniStats.style.display = 'none';
      return;
    }
    miniStats.style.display = '';
    const avg = frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 16.6;
    const fps = avg > 0 ? 1000 / avg : 60;
    const st = renderer.stats;
    miniStats.textContent = `${fps.toFixed(0)}fps · ${cfg.layerCount}層 · DC ${st.drawCalls} · OD ${st.overdrawRatio.toFixed(1)}x`;
  }

  // パネル中身を構築
  const addSection = (title) => {
    const h = document.createElement('h2');
    h.textContent = title;
    panel.appendChild(h);
  };
  const addToggle = (label, key, onChange) => {
    const lab = document.createElement('label');
    lab.className = 'toggle-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = Boolean(cfg[key]);
    cb.addEventListener('change', () => {
      cfg[key] = cb.checked;
      onChange?.();
    });
    const sp = document.createElement('span');
    sp.textContent = label;
    lab.append(cb, sp);
    return lab;
  };
  const addRange = (label, key, min, max, step, fmt = (v) => v.toFixed(2), onChange) => {
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
      onChange?.();
    });
    row.append(lab, val, inp);
    panel.appendChild(row);
  };
  const addSelect = (label, key, options, onChange) => {
    const row = document.createElement('div');
    row.className = 'ctrl-row';
    const lab = document.createElement('label');
    lab.textContent = label;
    const sel = document.createElement('select');
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.label;
      if (cfg[key] === o.id) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => {
      cfg[key] = sel.value;
      onChange?.();
    });
    row.append(lab, sel);
    panel.appendChild(row);
  };

  addSection('Depth Stacking（本編統合）');
  const topGrid = document.createElement('div');
  topGrid.className = 'toggle-grid';
  topGrid.append(
    addToggle('Depth Stacking ON', 'enabled', () => updateMiniStats()),
    addToggle('FPSバッジ表示', 'showStats', () => updateMiniStats()),
  );
  panel.appendChild(topGrid);

  addRange('レイヤー数 (5〜30)', 'layerCount', 5, 30, 1, (v) => `${Math.round(v)}層`, () => {
    layers = buildLayerDefinitions(cfg.layerCount);
  });
  addSelect('内部描画解像度', 'resPreset', RESOLUTION_PRESETS, applyResolution);
  addSelect('ライトバッファ (×5群)', 'lightResPreset', LIGHT_RES_PRESETS, applyResolution);

  addSection('戦闘視認性・バランス');
  addRange('前景レイヤー濃さ', 'fgOpacity', 0.0, 1.0, 0.05, (v) => `${Math.round(v * 100)}%`);
  addRange('本編暗幕の濃さ', 'darkMaskMul', 0.0, 1.0, 0.05, (v) => `${Math.round(v * 100)}%`);
  addRange('背景の明るさ', 'bgBrightness', 0.4, 1.6, 0.05);
  addRange('パララックス強度', 'parallaxStrength', 0.0, 1.6, 0.05);

  addSection('空間ライティング・水中表現');
  addRange('遮蔽シャドウ強度', 'shadowStrength', 0.0, 1.0, 0.05);
  addRange('水中光散乱', 'scatterStrength', 0.0, 2.0, 0.05);
  addRange('発光強度', 'emissiveBoost', 0.0, 2.2, 0.05);
  addRange('ブルーム強度', 'bloomStrength', 0.0, 1.0, 0.05);
  addRange('水中の濁り', 'turbidity', 0.0, 1.6, 0.05);
  addRange('浮遊粒子数', 'particleCount', 0, 1000, 50, (v) => `${Math.round(v)}`);

  const featGrid = document.createElement('div');
  featGrid.className = 'toggle-grid';
  featGrid.append(
    addToggle('動的ライティング', 'enableLighting'),
    addToggle('法線立体照光', 'enableNormal'),
    addToggle('遮蔽シャドウ', 'enableShadows'),
    addToggle('ブルーム', 'enableBloom'),
    addToggle('水流屈折', 'enableRefraction'),
    addToggle('浮遊粒子', 'enableParticles'),
  );
  panel.appendChild(featGrid);

  rootEl.append(miniStats, panel);

  return {
    cfg,
    get ready() { return ready && !failed; },
    get stats() { return renderer ? renderer.stats : null; },
    renderBackground,
    renderForeground,
    togglePanel() { panel.classList.toggle('collapsed'); },
    openPanel() { panel.classList.remove('collapsed'); },
    closePanel() { panel.classList.add('collapsed'); },
    isPanelOpen() { return !panel.classList.contains('collapsed'); },
    destroy() {
      disposed = true;
      if (renderer) {
        renderer.dispose();
        renderer = null;
      }
      miniStats.remove();
      panel.remove();
    },
  };
}
