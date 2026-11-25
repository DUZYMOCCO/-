/**
 * ABYSS DIVE — 海溝・深棚・深層分岐の補助演出（WebGL2 Depth Stacking 対応版）
 *
 * 実地形（岩盤・壁・岩棚・熱水チムニー）の描画は WebGL2（depth-bridge.js, z=0.0 層）へ完全一本化し、
 * 旧 Canvas2D 時代のベクター多角形背景・ギザギザ岩影・単色矩形岩盤はすべて撤去した。
 *
 * このモジュールが担う責務:
 *   - renderTerrain(camX, camY, layout, t, depthActive):
 *       depthActive=true 時は何もしない（WebGL2 側でノーマルマップ付き実地形を描画）。
 *       depthActive=false（フォールバック／比較 OFF 時）のみ最小限の輪郭シルエットを描画。
 *   - renderGlow(camX, camY, layout, t):
 *       入口ビーコンの光柱、下向き誘導灯、熱水噴出口の局所グロー（加算光）。
 *   - lightPunches(layout, t):
 *       暗幕への局所光穴抜き（誘導灯・発光植物・熱水噴出口）。
 *   - renderLabel(camX, camY, layout, stage, t):
 *       下り口ラベル表示。
 */

const TAU = Math.PI * 2;

export function createTrenchView(opts){
  const ctx = opts.ctx;
  const VW = opts.VW, VH = opts.VH;

  /**
   * 地形描画。Depth Stacking 有効時 (depthActive=true) は WebGL2 側が実地形を
   * ノーマルマップ＋空間ライト付きで描くため、旧 Canvas2D ポリゴンは一切描かない。
   */
  function renderTerrain(camX, camY, layout, t, depthActive){
    if (!layout || depthActive) return;
    if (layout.regionX1 < camX - 400 || layout.regionX0 > camX + VW + 400) return;

    // WebGL2 無効時（Depth OFF 比較 / 非対応環境）のみの最小限クリーンな実地形シルエット
    ctx.save();
    for (const s of layout.solids){
      if (s.x + s.w < camX - 180 || s.x > camX + VW + 180 || s.y + s.h < camY - 180 || s.y > camY + VH + 180) continue;
      ctx.fillStyle = s.biome === 'volcanic' ? '#120a09' : (s.biome === 'cave' ? '#070c12' : '#09141b');
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = s.biome === 'volcanic' ? 'rgba(206,118,68,0.45)' : 'rgba(110,180,200,0.38)';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    }
    ctx.restore();
  }

  /** 加算の光（入口ビーコン・下向き誘導灯・熱水噴出口の局所グロー）。drawGlowPass の最後。 */
  function renderGlow(camX, camY, layout, t){
    if (!layout) return;
    if (layout.regionX1 < camX - 400 || layout.regionX0 > camX + VW + 400) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    /* 入口のビーコン（上へ伸びる）。遠くから下り口の在りかを示す。 */
    const bx = layout.beacon.x, by = layout.beacon.y;
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.0);
    const beam = ctx.createLinearGradient(0, by - 620, 0, by + 20);
    beam.addColorStop(0, 'rgba(150,210,235,0)');
    beam.addColorStop(1, 'rgba(140,205,235,' + (0.14 * pulse).toFixed(3) + ')');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(bx - 30, by - 620); ctx.lineTo(bx + 30, by - 620);
    ctx.lineTo(bx + 108, by + 20); ctx.lineTo(bx - 108, by + 20);
    ctx.closePath(); ctx.fill();

    /* 下向きの誘導灯（ビーコン列）。 */
    for (const gd of layout.guides){
      if (gd.x < camX - 140 || gd.x > camX + VW + 140 || gd.y < camY - 140 || gd.y > camY + VH + 140) continue;
      const down = gd.i / 7;
      const warm = 1 - down;
      const gr = ctx.createRadialGradient(gd.x, gd.y, 1, gd.x, gd.y, gd.r * 0.85);
      const c0 = 'rgba(' + Math.round(150 + warm * 80) + ',' + Math.round(200 + warm * 35) + ',235,' + (0.28 * pulse).toFixed(3) + ')';
      gr.addColorStop(0, c0);
      gr.addColorStop(1, 'rgba(90,160,200,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(gd.x, gd.y, gd.r * 0.85, 0, TAU); ctx.fill();

      ctx.strokeStyle = 'rgba(200,240,255,' + (0.45 * pulse).toFixed(3) + ')';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(gd.x - 9, gd.y + 6); ctx.lineTo(gd.x, gd.y + 16); ctx.lineTo(gd.x + 9, gd.y + 6);
      ctx.stroke();
    }

    /* 熱水噴出口の局所琥珀・赤錆グロー＆上昇熱水気泡 */
    if (layout.vents) {
      for (const v of layout.vents){
        if (v.x < camX - 280 || v.x > camX + VW + 280 || v.y < camY - 320 || v.y > camY + VH + 240) continue;
        const flick = 0.8 + 0.2 * Math.sin(t * 3.1 + v.seed);
        const r = 160 * v.power;
        const vg = ctx.createRadialGradient(v.x, v.y - 54 * v.power, 2, v.x, v.y - 54 * v.power, r);
        vg.addColorStop(0, 'rgba(255,152,62,' + (0.44 * flick).toFixed(3) + ')');
        vg.addColorStop(0.45, 'rgba(220,86,32,' + (0.18 * flick).toFixed(3) + ')');
        vg.addColorStop(1, 'rgba(180,50,18,0)');
        ctx.fillStyle = vg;
        ctx.beginPath(); ctx.arc(v.x, v.y - 54 * v.power, r, 0, TAU); ctx.fill();

        for (let i = 0; i < 6; i++){
          const u = ((t * 0.45 + i / 6 + v.seed * 0.03) % 1);
          const py = v.y - 56 * v.power - u * 220 * v.power;
          const px = v.x + Math.sin(t * 2.4 + i * 1.9 + v.seed) * (6 + u * 22);
          const rad = (2.5 + (1 - u) * 3.5) * v.power;
          ctx.fillStyle = 'rgba(255,186,112,' + ((1 - u) * 0.35 * flick).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  /** 暗幕に穴を開ける光（drawLighting の動的光へ渡す）。 */
  function lightPunches(layout, t){
    if (!layout) return [];
    const out = [];
    out.push({ x: layout.beacon.x, y: layout.beacon.y - 60, r: 300, s: 0.42 });
    for (const gd of layout.guides){
      const down = gd.i / 7;
      out.push({ x: gd.x, y: gd.y, r: 150, s: 0.3 + 0.16 * (1 - down) });
    }
    for (const pl of layout.plants){
      out.push({ x: pl.x, y: pl.y - 10, r: (pl.biome === 'hall' ? 140 : 95) * pl.s, s: pl.biome === 'hall' ? 0.42 : 0.32 });
    }
    if (layout.vents){
      for (const v of layout.vents){
        out.push({ x: v.x, y: v.y - 50 * v.power, r: 220 * v.power, s: 0.46 });
      }
    }
    return out;
  }

  /** 海溝の下り口を示すラベル（スクリーン座標）。近づいたときだけ。 */
  function renderLabel(camX, camY, layout, stage, t){
    if (!layout || stage === 'none') return;
    if (layout.regionX1 < camX - 200 || layout.regionX0 > camX + VW + 200) return;
    const x = layout.beacon.x - camX, y = layout.beacon.y - 340 - camY;
    if (x < -200 || x > VW + 200 || y < -120 || y > VH + 120) return;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = 'rgba(210,240,255,0.92)';
    ctx.fillText('海溝 下り口', x, y);
    if (stage === 'beacon' || stage === 'mouth'){
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.strokeStyle = 'rgba(150,215,245,0.8)'; ctx.lineWidth = 3;
      const oy = (t * 40) % 26;
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 20 + oy); ctx.lineTo(x, y + 36 + oy); ctx.lineTo(x + 16, y + 20 + oy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // 旧 Canvas2D 視差背景・ギザギザ岩影は撤去済み（互換スタブのみ維持）
  const noop = () => {};
  const debugFx = () => ({ legacyRemoved: true });
  const forceShadow = () => false;

  return {
    renderTerrain, renderGlow, lightPunches, renderLabel,
    renderDrift: noop, renderForeground: noop, debugFx, forceShadow,
  };
}
