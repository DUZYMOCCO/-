/**
 * Depth Stacking — 品質検証用シーン構築＆連続時間ワールド更新 (v2: 荘厳な深海構図・空間の抜け・シネマティックフレーミング)
 */
import { clamp, lerp } from './depth-math.js';

export class AbyssVerificationScene {
  constructor(manifest) {
    this.manifest = manifest;

    // 操作可能な潜水艇（操作層 z = 0）：左側三分の一の黄金位置に配置し、右前方の深海空間と巨大生物を照らす
    this.sub = {
      x: -250,
      y: 28,
      z: 0.0,
      vx: 0,
      vy: 0,
      facing: 1,
      pitch: 0,
      lampPulse: 0,
    };

    this.staticItems = this._buildStaticWorld();
    this.fishSchools = this._buildFishSchools();

    // 発光クラゲ（独立軌道＋Tier 1 光源帯同：岩肌や遺跡を照らしながら優雅に漂う）
    this.jellies = [
      { id: 'jelly_near', cx: 365,  cy: -45,  z: 0.28, rx: 195, ry: 95,  fx: 0.21, fy: 0.33, phase: 0.5,  scale: 0.44, color: [0.26, 0.95, 1.00], warm: [1.0, 0.72, 0.30] },
      { id: 'jelly_mid',  cx: -560, cy: -115, z: 1.35, rx: 240, ry: 105, fx: 0.16, fy: 0.27, phase: 2.4,  scale: 0.52, color: [0.22, 0.88, 1.00], warm: [0.98, 0.68, 0.28] },
      { id: 'jelly_far',  cx: 960,  cy: -35,  z: 2.30, rx: 250, ry: 95,  fx: 0.13, fy: 0.21, phase: 4.6,  scale: 0.64, color: [0.36, 0.86, 1.00], warm: [0.95, 0.70, 0.38] },
    ];

    // 巨大遮蔽生物（中景と遠景で独立回遊：光源の前を横切って背景に大きな影を落とす）
    this.giants = [
      {
        id: 'manta_mid_occluder',
        layerKey: 'mid_2',
        z: 0.92,
        yBase: -95,
        yAmp: 52,
        yFreq: 0.25,
        speed: 52,
        spanMin: -2100,
        spanMax: 2100,
        phase: 0.535, // 初期視界で右上の開けた深海空間を優雅に滑空し、ライトと遺跡光を遮る位置
        scale: 0.94,
        occluderWeight: 0.96,
      },
      {
        id: 'manta_far_silhouette',
        layerKey: 'far_2',
        z: 3.35,
        yBase: -175,
        yAmp: 68,
        yFreq: 0.18,
        speed: -36,
        spanMin: -3400,
        spanMax: 3400,
        phase: 0.44,
        scale: 1.55,
        occluderWeight: 0.65,
      },
    ];
  }

  _sizeOf(key, scale = 1.0) {
    const m = this.manifest[key];
    if (!m) return { w: 256 * scale, h: 256 * scale };
    return { w: m.w * scale, h: m.h * scale };
  }

  _buildStaticWorld() {
    const map = new Map();
    const add = (layerKey, item) => {
      if (!map.has(layerKey)) map.set(layerKey, []);
      const sz = this._sizeOf(item.asset, item.scale ?? 1.0);
      map.get(layerKey).push({
        ...item,
        w: item.w ?? sz.w,
        h: item.h ?? sz.h,
      });
    };

    // --- 最遠景 (abyss_0, z=9.2): 巨大海溝バックドロップ（ズーム 0.55x まで引いても上下左右に黒帯ゼロ） ---
    for (let i = -1; i <= 1; i++) {
      add('abyss_0', {
        asset: 'far_abyss',
        x: i * 8200,
        y: -120,
        w: 8240,
        h: 4900,
        flipX: Math.abs(i) % 2 === 1,
        noRefract: true,
        fillRatio: 1.0,
        turbidityMul: 0.25,
        lightInfluenceMul: 0.42,
        brightness: 0.96,
      });
    }

    // --- 遠景 (far_0, far_1, far_2): 海溝の奥へと連なる巨大スケール ---
    // far_0 (z=6.2): 遥か彼方に霞む沈没都市シルエット（中央の抜けを活かす高さに配置）
    for (let i = -1; i <= 1; i++) {
      add('far_0', {
        asset: 'far_city_ridge',
        x: i * 3800 + 260,
        y: 340,
        w: 4000,
        h: 2150,
        flipX: i !== 0,
        opacity: 0.72,
        turbidityMul: 1.05,
        fillRatio: 0.50,
      });
    }

    // far_1 (z=4.4): 左右にそびえる巨大な海底山脈・玄武岩尖塔（中央に海溝の谷＝視線誘導の抜けを作る！）
    const farSpires = [
      { x: -2450, y: 260, scale: 2.30, flipX: false },
      { x: -1280, y: 310, scale: 1.95, flipX: true  },
      { x:  1320, y: 280, scale: 2.15, flipX: false },
      { x:  2620, y: 240, scale: 2.35, flipX: true  },
    ];
    for (const s of farSpires) {
      add('far_1', {
        asset: 'cliff_spire',
        x: s.x, y: s.y, scale: s.scale, flipX: s.flipX,
        emissiveMul: 0.45,
        occluderWeight: 0.42,
        fillRatio: 0.48,
      });
    }

    // far_2 (z=3.1): 遠景の崩落石造遺跡（谷の両翼を荘厳に支える）
    const farRuins = [
      { asset: 'mid_ruins_arch', x: -1780, y: 220, scale: 1.48, flipX: true  },
      { asset: 'mid_ruins_arch', x:  1520, y: 210, scale: 1.52, flipX: false },
      { asset: 'cliff_overhang', x:  -780, y: 410, scale: 1.45, flipX: false },
      { asset: 'cliff_overhang', x:   780, y: 420, scale: 1.42, flipX: true  },
    ];
    for (const r of farRuins) {
      add('far_2', { ...r, occluderWeight: 0.55, fillRatio: 0.46 });
    }

    // --- 中景 (mid_0, mid_1, mid_2): 光と影がドラマチックに交差する主舞台 ---
    // mid_0 (z=2.2): 切り立った玄武岩崖（発光鉱脈が闇に青白く光る）
    const mid0Cliffs = [
      { asset: 'cliff_spire',    x: -1580, y: 260, scale: 1.40, flipX: false },
      { asset: 'cliff_overhang', x:  -880, y: 345, scale: 1.28, flipX: true  },
      { asset: 'cliff_overhang', x:   940, y: 330, scale: 1.32, flipX: false },
      { asset: 'cliff_spire',    x:  1720, y: 255, scale: 1.42, flipX: true  },
    ];
    for (const c of mid0Cliffs) {
      add('mid_0', { ...c, occluderWeight: 0.72, fillRatio: 0.52 });
    }

    // mid_1 (z=1.5): 主役の巨大古代石造アーチ（画面中央〜やや左下に堂々と構え、アーチの穴から奥の光と海溝が抜ける！）
    const mid1Ruins = [
      { x: -1620, y: 215, scale: 1.12, flipX: true  },
      { x:   -90, y: 210, scale: 1.16, flipX: false },
      { x:  1520, y: 225, scale: 1.10, flipX: true  },
    ];
    for (const r of mid1Ruins) {
      add('mid_1', {
        asset: 'mid_ruins_arch',
        x: r.x, y: r.y, scale: r.scale, flipX: r.flipX,
        occluderWeight: 0.82,
        normalMul: 1.35,
        fillRatio: 0.44,
      });
    }

    // mid_2 (z=0.95): 左右の岩盤崖（中央の泳げる水路を大きく空け、潜水艇ライトが岩肌に当たって立体的に浮かび上がる）
    const mid2Terrain = [
      { asset: 'cliff_spire',    x: -1180, y: 315, scale: 1.05, flipX: false },
      { asset: 'cliff_overhang', x:  -670, y: 385, scale: 0.96, flipX: false },
      { asset: 'cliff_overhang', x:   685, y: 365, scale: 1.04, flipX: true  },
      { asset: 'cliff_spire',    x:  1290, y: 310, scale: 1.06, flipX: true  },
    ];
    for (const t of mid2Terrain) {
      add('mid_2', { ...t, occluderWeight: 0.80, normalMul: 1.38, fillRatio: 0.50 });
    }

    // --- 近景 (near_0, near_1, near_2): 海底斜面の生態系（中央の視界を塞がず下部・左右に群生） ---
    // near_0 (z=0.62): 海底岩礁・琥珀ポリプ岩・シアン発光サンゴ
    const near0Flora = [
      { asset: 'flora_polyps_boulder', x: -1020, y: 375, scale: 0.84, flipX: false },
      { asset: 'flora_coral_cyan',     x:  -690, y: 365, scale: 0.64, flipX: false, deformMode: 1, swayAmp: 8, swayFreq: 1.12, swayPhase: 0.5 },
      { asset: 'flora_polyps_boulder', x:  -220, y: 405, scale: 0.82, flipX: true  },
      { asset: 'flora_coral_cyan',     x:   430, y: 360, scale: 0.68, flipX: true,  deformMode: 1, swayAmp: 9, swayFreq: 1.06, swayPhase: 2.1 },
      { asset: 'flora_polyps_boulder', x:   860, y: 385, scale: 0.86, flipX: false },
      { asset: 'flora_coral_cyan',     x:  1240, y: 365, scale: 0.66, flipX: false, deformMode: 1, swayAmp: 8, swayFreq: 1.18, swayPhase: 3.8 },
    ];
    for (const f of near0Flora) {
      add('near_0', { ...f, normalMul: 1.25, emissiveMul: 0.85, fillRatio: 0.40 });
    }

    // near_1 (z=0.36): 水流にたなびく深海ケルプ（左右と海底の要所にリズム良く配置、中央の潜水艇前を塞がない！）
    const kelpSpots = [
      { x: -1280, y: 350, s: 0.90 },
      { x:  -840, y: 365, s: 0.82 },
      { x:  -510, y: 395, s: 0.72 },
      { x:   195, y: 415, s: 0.68 },
      { x:   630, y: 365, s: 0.86 },
      { x:  1060, y: 350, s: 0.92 },
    ];
    kelpSpots.forEach((k, idx) => {
      add('near_1', {
        asset: 'flora_kelp',
        x: k.x, y: k.y, scale: k.s, flipX: idx % 2 === 1,
        deformMode: 1, swayAmp: 26, swayFreq: 1.02 + (idx % 3) * 0.14, swayPhase: idx * 1.91,
        brightness: 0.86,
        fillRatio: 0.30,
      });
    });

    // near_2 (z=0.16): 操作層すぐ下・奥の繊細なサンゴとポリプ岩
    const near2Spots = [
      { asset: 'flora_coral_cyan',     x: -760, y: 400, scale: 0.56, flipX: true,  deformMode: 1, swayAmp: 7, swayFreq: 1.15, swayPhase: 1.2 },
      { asset: 'flora_polyps_boulder', x:  105, y: 425, scale: 0.68, flipX: false },
      { asset: 'flora_coral_cyan',     x:  820, y: 395, scale: 0.58, flipX: false, deformMode: 1, swayAmp: 7, swayFreq: 1.08, swayPhase: 2.9 },
    ];
    for (const f of near2Spots) {
      add('near_2', { ...f, emissiveMul: 0.88, fillRatio: 0.34 });
    }

    // --- 前景 (fg_0, fg_1, fg_2): 映画的な四隅の暗部フレーミング（中央の空間を広く開放！） ---
    // fg_0 (z=-0.14)
    add('fg_0', { asset: 'flora_kelp', x: -820, y: 385, scale: 0.88, flipX: false, deformMode: 1, swayAmp: 32, swayFreq: 1.14, swayPhase: 0.9, brightness: 0.72, fillRatio: 0.28 });
    add('fg_0', { asset: 'flora_kelp', x:  830, y: 385, scale: 0.90, flipX: true,  deformMode: 1, swayAmp: 34, swayFreq: 1.05, swayPhase: 2.8, brightness: 0.72, fillRatio: 0.28 });
    add('fg_0', { asset: 'flora_polyps_boulder', x: -490, y: 455, scale: 0.74, flipX: false, brightness: 0.76, fillRatio: 0.40 });
    add('fg_0', { asset: 'flora_polyps_boulder', x:  540, y: 458, scale: 0.76, flipX: true,  brightness: 0.76, fillRatio: 0.40 });

    // fg_1 (z=-0.26): 上部の垂れ下がる純粋な深海蔓天蓋（画面左右上隅のみ）＋左右下隅のシルエット岩
    add('fg_1', { asset: 'fg_canopy', x: -640, y: -335, scale: 0.88, flipX: true,  deformMode: 2, swayAmp: 15, swayFreq: 0.92, swayPhase: 0.4, brightness: 0.62, fillRatio: 0.28 });
    add('fg_1', { asset: 'fg_canopy', x:  650, y: -338, scale: 0.90, flipX: false, deformMode: 2, swayAmp: 16, swayFreq: 0.86, swayPhase: 2.2, brightness: 0.62, fillRatio: 0.28 });
    add('fg_1', { asset: 'cliff_overhang', x: -920, y: 445, scale: 0.88, flipX: false, brightness: 0.58, fillRatio: 0.42 });
    add('fg_1', { asset: 'cliff_overhang', x:  940, y: 450, scale: 0.90, flipX: true,  brightness: 0.58, fillRatio: 0.42 });

    // fg_2 (z=-0.38): 強い視差・ソフトボケの左右端ケルプ
    add('fg_2', { asset: 'flora_kelp', x: -720, y: 410, scale: 1.02, flipX: true,  deformMode: 1, swayAmp: 40, swayFreq: 1.22, swayPhase: 1.6, brightness: 0.55, fillRatio: 0.24 });
    add('fg_2', { asset: 'flora_kelp', x:  735, y: 412, scale: 1.04, flipX: false, deformMode: 1, swayAmp: 42, swayFreq: 1.12, swayPhase: 3.9, brightness: 0.55, fillRatio: 0.24 });

    // front_0 (z=-0.48): 最前景のソフトボケ天蓋（最隅）
    add('front_0', { asset: 'fg_canopy', x: -790, y: -355, scale: 0.92, flipX: true,  deformMode: 2, swayAmp: 20, swayFreq: 1.06, swayPhase: 4.1, brightness: 0.48, fillRatio: 0.20 });
    add('front_0', { asset: 'fg_canopy', x:  800, y: -355, scale: 0.92, flipX: false, deformMode: 2, swayAmp: 20, swayFreq: 0.98, swayPhase: 1.3, brightness: 0.48, fillRatio: 0.20 });

    return map;
  }

  _buildFishSchools() {
    // 繊細なサイズの深海魚群（複数奥行きで優雅に回遊）
    return [
      { layerKey: 'far_2',  z: 3.05, count: 8, yBase: -135, speed:  38, span: 4400, phase: 0.15, scale: 0.24, dir:  1 },
      { layerKey: 'mid_1',  z: 1.48, count: 9, yBase:  -40, speed: -48, span: 3600, phase: 0.62, scale: 0.30, dir: -1 },
      { layerKey: 'near_0', z: 0.58, count: 7, yBase: -165, speed:  64, span: 3000, phase: 0.38, scale: 0.34, dir:  1 },
      { layerKey: 'near_2', z: 0.18, count: 6, yBase:  155, speed: -74, span: 2800, phase: 0.81, scale: 0.36, dir: -1 },
      { layerKey: 'fg_0',   z: -0.15, count: 3, yBase:  -20, speed: 118, span: 3600, phase: 0.25, scale: 0.48, dir:  1 },
    ];
  }

  _buildExtraLayerItems(layer) {
    const hash = (s) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 10000) / 10000;
    };
    const h0 = hash(layer.key);
    const items = [];
    const assetPool = layer.z > 2.5
      ? ['cliff_spire', 'cliff_overhang']
      : (layer.z > 0 ? ['flora_kelp', 'flora_coral_cyan', 'flora_polyps_boulder'] : ['flora_kelp', 'fg_canopy']);

    const count = layer.z < 0 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const asset = assetPool[(Math.floor(h0 * 100) + i) % assetPool.length];
      const baseScale = layer.z > 2.5 ? 1.22 : (layer.z > 0 ? 0.68 : 0.85);
      const sz = this._sizeOf(asset, baseScale);
      const isTop = asset === 'fg_canopy';
      const isFlora = asset === 'flora_kelp' || asset === 'flora_coral_cyan';
      // 中央の抜けを残すため左右寄り中心に配置
      const side = i % 2 === 0 ? -1 : 1;
      items.push({
        asset,
        x: side * (580 + i * 380 + h0 * 240),
        y: isTop ? -350 : (330 + ((i + Math.floor(h0 * 7)) % 3) * 28),
        w: sz.w,
        h: sz.h,
        flipX: (i + Math.floor(h0 * 10)) % 2 === 1,
        deformMode: isTop ? 2 : (isFlora ? 1 : 0),
        swayAmp: isFlora ? 20 : (isTop ? 14 : 0),
        swayFreq: 0.95 + h0 * 0.35,
        swayPhase: h0 * 6.28 + i * 1.7,
        brightness: layer.z < 0 ? 0.62 : 0.90,
        fillRatio: 0.34,
      });
    }
    return items;
  }

  updateSubmarine(dt, input, worldTime) {
    const accel = 760;
    const maxSpd = 380;
    const drag = Math.exp(-3.4 * dt);

    let ax = input.ax || 0, ay = input.ay || 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (input.up) ay -= 1;
    if (input.down) ay += 1;
    const alen = Math.hypot(ax, ay);
    if (alen > 1.0) {
      ax /= alen;
      ay /= alen;
    }

    this.sub.vx = (this.sub.vx + ax * accel * dt) * drag;
    this.sub.vy = (this.sub.vy + ay * accel * dt) * drag;
    const spd = Math.hypot(this.sub.vx, this.sub.vy);
    if (spd > maxSpd) {
      this.sub.vx = (this.sub.vx / spd) * maxSpd;
      this.sub.vy = (this.sub.vy / spd) * maxSpd;
    }

    this.sub.x = clamp(this.sub.x + this.sub.vx * dt, -1450, 1450);
    this.sub.y = clamp(this.sub.y + this.sub.vy * dt, -320, 270);

    if (Math.abs(this.sub.vx) > 22) {
      this.sub.facing = this.sub.vx >= 0 ? 1 : -1;
    }
    const targetPitch = clamp((this.sub.vy / 340) * 0.34, -0.34, 0.34) * this.sub.facing;
    this.sub.pitch = lerp(this.sub.pitch, targetPitch, clamp(dt * 6.5, 0, 1));
    this.sub.lampPulse = 0.96 + 0.04 * Math.sin(worldTime * 3.1 + Math.sin(worldTime * 1.7));
  }

  buildFrameData(layers, cfg, cam, worldTime) {
    const t = cfg.enableAnim ? worldTime : 0.0;
    const lt = t * cfg.lightSpeed;

    const itemsByLayerKey = new Map();
    const activeKeys = new Set(layers.map(l => l.key));

    for (const layer of layers) {
      const base = this.staticItems.get(layer.key);
      if (base) {
        itemsByLayerKey.set(layer.key, base.slice());
      } else if (layer.isExtra) {
        itemsByLayerKey.set(layer.key, this._buildExtraLayerItems(layer));
      } else {
        itemsByLayerKey.set(layer.key, []);
      }
    }

    const pushToNearestLayer = (targetZ, preferredKey, item) => {
      if (activeKeys.has(preferredKey)) {
        itemsByLayerKey.get(preferredKey).push(item);
        return;
      }
      let best = layers[0];
      let bestDiff = Infinity;
      for (const l of layers) {
        const d = Math.abs(l.z - targetZ);
        if (d < bestDiff) { bestDiff = d; best = l; }
      }
      itemsByLayerKey.get(best.key).push(item);
    };

    // 操作層：潜水艇 09（白飛びを抑え、塗装質感と暖色窓灯りを美しく見せる）
    const subHoverY = Math.sin(t * 1.35) * 5.0;
    const subX = this.sub.x;
    const subY = this.sub.y + subHoverY;
    const subSz = this._sizeOf('submersible_09', 0.42);
    pushToNearestLayer(0.0, 'play_0', {
      asset: 'submersible_09',
      x: subX,
      y: subY,
      z: 0.0,
      w: subSz.w,
      h: subSz.h,
      rotation: this.sub.pitch,
      flipX: this.sub.facing < 0,
      brightness: 0.88,
      normalMul: 1.35,
      emissiveMul: 1.55,
      lightInfluenceMul: 0.72, // 自身のスポットライトで白飛びせず渋い金属質感を維持
      noRefract: true,
      fillRatio: 0.60,
    });

    // 巨大生物（中景・遠景で光を遮りながら優雅に回遊）
    for (const g of this.giants) {
      const span = g.spanMax - g.spanMin;
      const raw = (g.phase * span + t * g.speed) % span;
      const wrapped = raw < 0 ? raw + span : raw;
      const gx = g.spanMin + wrapped;
      const gy = g.yBase + Math.sin(t * g.yFreq + g.phase * 6.28) * g.yAmp;
      const sz = this._sizeOf('creature_manta', g.scale);
      pushToNearestLayer(g.z, g.layerKey, {
        asset: 'creature_manta',
        x: gx,
        y: gy,
        z: g.z,
        w: sz.w,
        h: sz.h,
        flipX: g.speed < 0,
        deformMode: 3,
        swayAmp: 15 * g.scale,
        swayFreq: 1.32,
        swayPhase: g.phase * 9.0,
        occluderWeight: g.occluderWeight,
        emissiveMul: 1.05,
        fillRatio: 0.48,
      });
    }

    // 発光クラゲ（自律移動しつつ Tier 1 高品質動的光源を帯同）
    const jellyPositions = [];
    for (const j of this.jellies) {
      const jx = j.cx + Math.sin(lt * j.fx + j.phase) * j.rx + Math.cos(lt * j.fx * 0.618 + j.phase) * (j.rx * 0.24);
      const jy = j.cy + Math.cos(lt * j.fy + j.phase * 1.3) * j.ry;
      const pulse = 0.78 + 0.22 * Math.sin(t * 2.0 + j.phase * 2.7);
      const tilt = Math.cos(lt * j.fx + j.phase) * 0.14;
      const sz = this._sizeOf('creature_jelly', j.scale);
      jellyPositions.push({ ...j, x: jx, y: jy, pulse });

      pushToNearestLayer(j.z, j.z < 0.5 ? 'near_2' : (j.z < 1.6 ? 'mid_1' : 'mid_0'), {
        asset: 'creature_jelly',
        x: jx,
        y: jy,
        z: j.z,
        w: sz.w * (0.97 + 0.05 * pulse),
        h: sz.h * (1.03 - 0.04 * pulse),
        rotation: tilt,
        deformMode: 2,
        swayAmp: 12,
        swayFreq: 1.75,
        swayPhase: j.phase,
        emissiveMul: 1.15 * pulse,
        lightInfluenceMul: 0.45,
        fillRatio: 0.38,
      });
    }

    // 複数奥行きの発光深海魚群
    for (const sc of this.fishSchools) {
      const basePos = ((sc.phase * sc.span + t * sc.speed) % sc.span + sc.span) % sc.span - sc.span * 0.5;
      for (let i = 0; i < sc.count; i++) {
        const offX = (i - sc.count * 0.5) * 46 * sc.scale + Math.sin(i * 2.13 + t * 0.8) * 18;
        const offY = Math.sin(i * 1.77 + sc.phase * 9.0) * 52 + Math.sin(t * (1.2 + (i % 3) * 0.25) + i * 1.9) * 12;
        const fx = basePos + offX;
        const fy = sc.yBase + offY;
        const sz = this._sizeOf('fish_lantern', sc.scale * (0.85 + (i % 3) * 0.12));
        pushToNearestLayer(sc.z, sc.layerKey, {
          asset: 'fish_lantern',
          x: fx,
          y: fy,
          z: sc.z,
          w: sz.w,
          h: sz.h,
          flipX: sc.dir < 0,
          rotation: Math.cos(t * 1.3 + i) * 0.08,
          emissiveMul: 1.05,
          fillRatio: 0.30,
        });
      }
    }

    // Tier 1 高品質動的光源（1〜6灯）
    const aimAngle = this.sub.facing >= 0 ? this.sub.pitch : (Math.PI + this.sub.pitch);
    const dirX = Math.cos(aimAngle);
    const dirY = Math.sin(aimAngle);
    // 船首ランプの少し前方を起点にすることで、潜水艇本体を白飛びさせず前方空間と岩壁を強く照らす
    const subLampX = subX + dirX * 96;
    const subLampY = subY + dirY * 96;

    const allHighLights = [
      // #0: 潜水艇ヘッドライト（暖白の指向性ビーム）
      {
        id: 'sub_headlight',
        x: subLampX,
        y: subLampY,
        z: 0.0,
        radius: 960,
        zRange: 2.5,
        color: [1.0, 0.93, 0.76],
        intensity: 1.85 * this.sub.lampPulse,
        dirX,
        dirY,
        cosHalfAngle: Math.cos(0.42),
        coneSoftness: 0.22,
      },
      // #1: 近景の発光クラゲ
      {
        id: 'jelly_near_light',
        x: jellyPositions[0].x,
        y: jellyPositions[0].y,
        z: jellyPositions[0].z,
        radius: 560,
        zRange: 1.6,
        color: [
          lerp(jellyPositions[0].color[0], jellyPositions[0].warm[0], 0.28),
          lerp(jellyPositions[0].color[1], jellyPositions[0].warm[1], 0.28),
          lerp(jellyPositions[0].color[2], jellyPositions[0].warm[2], 0.28),
        ],
        intensity: 1.25 * jellyPositions[0].pulse,
        cosHalfAngle: -2.0,
      },
      // #2: 古代石造アーチ奥の共鳴コア（アーチの穴から神秘的なティール光が溢れ、前を通る巨大マンタが影を落とす）
      {
        id: 'ruin_resonance_core',
        x: -90 + Math.sin(lt * 0.21) * 55,
        y: 35 + Math.cos(lt * 0.17) * 30,
        z: 1.75,
        radius: 820,
        zRange: 2.9,
        color: [0.28, 0.96, 0.92],
        intensity: 1.38 * (0.76 + 0.24 * Math.sin(t * 0.85 + Math.sin(t * 0.37))),
        cosHalfAngle: -2.0,
      },
      // #3: 中景の発光クラゲ
      {
        id: 'jelly_mid_light',
        x: jellyPositions[1].x,
        y: jellyPositions[1].y,
        z: jellyPositions[1].z,
        radius: 600,
        zRange: 1.9,
        color: [0.24, 0.86, 1.0],
        intensity: 1.15 * jellyPositions[1].pulse,
        cosHalfAngle: -2.0,
      },
      // #4: 右側熱水鉱脈の暖色揺らぎ光
      {
        id: 'hydrothermal_vent',
        x: 720,
        y: 260,
        z: 1.05,
        radius: 620,
        zRange: 1.9,
        color: [1.0, 0.60, 0.24],
        intensity: 1.2 * (0.82 + 0.18 * Math.sin(t * 2.7) * Math.cos(t * 1.13)),
        cosHalfAngle: -2.0,
      },
      // #5: 遠景クラゲ
      {
        id: 'jelly_far_light',
        x: jellyPositions[2].x,
        y: jellyPositions[2].y,
        z: jellyPositions[2].z,
        radius: 660,
        zRange: 2.5,
        color: [0.36, 0.88, 1.0],
        intensity: 1.05 * jellyPositions[2].pulse,
        cosHalfAngle: -2.0,
      },
    ];
    const highLights = allHighLights.slice(0, clamp(cfg.highLightCount, 0, 6));

    // Tier 2 簡易光源（発光サンゴ・琥珀ポリプ・鉱脈）
    const simpleLights = [
      { x: -690, y: 335, z: 0.62, radius: 280, color: [0.16, 0.92, 0.96], intensity: 0.62 * (0.85 + 0.15 * Math.sin(t * 1.1 + 0.3)) },
      { x:  430, y: 330, z: 0.62, radius: 300, color: [0.18, 0.94, 0.98], intensity: 0.65 * (0.85 + 0.15 * Math.sin(t * 0.95 + 1.8)) },
      { x: -220, y: 375, z: 0.62, radius: 250, color: [1.00, 0.66, 0.22], intensity: 0.58 * (0.86 + 0.14 * Math.sin(t * 1.4 + 2.4)) },
      { x:  860, y: 355, z: 0.62, radius: 260, color: [1.00, 0.64, 0.20], intensity: 0.56 * (0.86 + 0.14 * Math.sin(t * 1.2 + 4.1)) },
      { x: -760, y: 370, z: 0.16, radius: 240, color: [0.20, 0.94, 0.96], intensity: 0.52 * (0.85 + 0.15 * Math.sin(t * 1.3 + 0.8)) },
      { x:  105, y: 395, z: 0.16, radius: 240, color: [1.00, 0.68, 0.26], intensity: 0.54 * (0.85 + 0.15 * Math.sin(t * 1.05 + 3.2)) },
      { x:  820, y: 365, z: 0.16, radius: 250, color: [0.18, 0.92, 0.96], intensity: 0.56 * (0.85 + 0.15 * Math.sin(t * 1.15 + 5.0)) },
      { x: -1180, y: 245, z: 0.95, radius: 340, color: [0.26, 0.88, 0.98], intensity: 0.52 * (0.88 + 0.12 * Math.sin(t * 0.83 + 2.9)) },
      { x: 1290, y: 245, z: 0.95, radius: 340, color: [0.26, 0.88, 0.98], intensity: 0.52 * (0.88 + 0.12 * Math.sin(t * 0.77 + 3.7)) },
      { x: -1020, y: 345, z: 0.62, radius: 260, color: [1.00, 0.66, 0.24], intensity: 0.50 * (0.85 + 0.15 * Math.sin(t * 1.25 + 1.5)) },
    ];

    // 潜水艇ツインヘッドライトのボリュメトリック光条（遮蔽マスク反応＋優雅な水中散乱）
    const perpX = -dirY;
    const perpY = dirX;
    const beams = cfg.highLightCount >= 1 ? [
      {
        x: subLampX + perpX * -16,
        y: subLampY + perpY * -16,
        z: 0.0,
        angle: aimAngle - 0.025,
        length: 840,
        halfStart: 10,
        halfEnd: 215,
        color: [0.76, 0.95, 1.0],
        intensity: 0.30 * this.sub.lampPulse,
      },
      {
        x: subLampX + perpX * 18,
        y: subLampY + perpY * 18,
        z: 0.0,
        angle: aimAngle + 0.035,
        length: 780,
        halfStart: 10,
        halfEnd: 195,
        color: [1.0, 0.92, 0.74],
        intensity: 0.25 * this.sub.lampPulse,
      },
    ] : [];

    return {
      cam,
      cfg,
      layers,
      itemsByLayerKey,
      highLights,
      simpleLights,
      beams,
      worldTime: t,
    };
  }
}
