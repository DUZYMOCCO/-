/**
 * ABYSS DIVE — 海溝（固定地形）の描画（v1.12.0）
 *
 * 潜航の描画（game.js）には地形の分岐を足すだけで、ここに海溝の見た目をまとめる。
 * 描画するシルエットは trench-rules.js の solids（矩形）と同一＝当たり判定と一致する。
 *
 * 3 つの面を game.js の描画パイプラインへ差し込む:
 *   renderTerrain(camX,camY) … 岩盤・壁・岩棚（不透明。drawWorld の床の直後）
 *   renderGlow(camX,camY)    … 誘導灯と発光植物（加算。drawGlowPass の最後）
 *   lightPunches()           … 暗幕に穴を開ける光（drawLighting の動的光の位置）
 * 第 2 前哨基地の外観は base.js の renderDiveMarker を再利用する（別素材・別描画のまま）。
 */
import { TRENCH, createTrench } from './trench-rules.js?v=1';

const TAU = Math.PI * 2;

export function createTrenchView(opts){
  const ctx = opts.ctx;
  const VW = opts.VW, VH = opts.VH;

  /* 岩の質感のだま（id から決定的に配置。毎フレーム乱数を使わない） */
  function hash(id, i){
    let h = 2166136261;
    const s = id + ':' + i;
    for (let k = 0; k < s.length; k++){ h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000;
  }

  /** 壁・岩棚を 1 枚の岩ブロックとして描く（矩形そのもの＝衝突と一致）。 */
  function drawRockRect(s, deep){
    const { x, y, w, h } = s;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, deep ? 'rgb(11,20,26)' : 'rgb(14,25,31)');
    g.addColorStop(0.55, 'rgb(7,14,19)');
    g.addColorStop(1, 'rgb(3,7,10)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    /* 上端の冷たいリム（岩の稜線） */
    const rim = ctx.createLinearGradient(0, y, 0, y + Math.min(28, h));
    rim.addColorStop(0, 'rgba(93,159,169,0.70)');
    rim.addColorStop(1, 'rgba(37,76,84,0)');
    ctx.fillStyle = rim;
    ctx.fillRect(x, y, w, Math.min(28, h));
    ctx.fillStyle = 'rgba(122,189,192,0.42)';
    ctx.fillRect(x, y, 3, h);
    ctx.fillRect(x + w - 3, y, 3, h);
    /* 下端の陰 */
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y + h - 4, w, 4);
    /* ひび・岩の割れ（決定的） */
    ctx.strokeStyle = 'rgba(40,66,78,0.35)';
    ctx.lineWidth = 1.4;
    const n = Math.max(2, Math.round(w / 150));
    for (let i = 0; i < n; i++){
      const sx = x + hash(s.id, i) * w;
      ctx.beginPath();
      ctx.moveTo(sx, y + 4);
      ctx.lineTo(sx + (hash(s.id, i + 50) - 0.5) * 26, y + h * (0.4 + hash(s.id, i + 90) * 0.4));
      ctx.stroke();
    }
    /* 点々とした鉱物 */
    ctx.fillStyle = 'rgba(130,180,196,0.28)';
    for (let i = 0; i < 5; i++){
      ctx.beginPath();
      ctx.arc(x + hash(s.id, i + 200) * w, y + hash(s.id, i + 300) * h, 1.3 + hash(s.id, i + 400), 0, TAU);
      ctx.fill();
    }
  }

  /** 岩盤の基盤（海溝の左右と下を沈める）。 */
  function drawBedrock(layout){
    const y0 = layout.wallTop - 40;
    const y1 = layout.floorY + 260;
    const x0 = layout.regionX0 - 220;
    const x1 = layout.regionX1 + 220;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgb(12,22,28)');
    g.addColorStop(0.4, 'rgb(7,14,19)');
    g.addColorStop(1, 'rgb(2,5,8)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    /* 海溝の落ち込み（開口の内側）をわずかに明るい闇で抜く＝下へ続く気配 */
    const width = layout.gorgeX1 - layout.gorgeX0;
    const ig = ctx.createLinearGradient(layout.gorgeX0, 0, layout.gorgeX1, 0);
    ig.addColorStop(0, '#14262c');
    ig.addColorStop(0.23, '#0b181f');
    ig.addColorStop(0.56, '#08131c');
    ig.addColorStop(1, '#11252a');
    ctx.fillStyle = ig;
    ctx.fillRect(layout.gorgeX0, layout.wallTop, width, layout.floorY - layout.wallTop);
    // 遠い岩壁の縦の割れ目。手前の通れる水路と間違えないよう淡く描く。
    ctx.save();
    ctx.beginPath(); ctx.rect(layout.gorgeX0, layout.wallTop, width, layout.floorY - layout.wallTop); ctx.clip();
    for (let i = 0; i < 14; i++) {
      const x = layout.gorgeX0 + i * width / 13;
      ctx.fillStyle = i % 2 ? 'rgba(74,122,129,0.08)' : 'rgba(0,4,8,0.30)';
      ctx.beginPath(); ctx.moveTo(x, layout.wallTop);
      ctx.lineTo(x + 90 + hash('cliff', i) * 130, layout.wallTop);
      ctx.lineTo(x - 28, layout.floorY);
      ctx.lineTo(x - 130 + hash('crack', i) * 60, layout.floorY);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /** 下へ続く水流（ゆっくり沈む筋）。海溝の中だけ。 */
  function drawCurrent(layout, camX, camY, t){
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.gorgeX0, layout.wallTop, layout.gorgeX1 - layout.gorgeX0, layout.floorY - layout.wallTop);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++){
      const u = (i / 22 + (t * 0.05)) % 1;
      const x = layout.gorgeX0 + ((i * 137) % (layout.gorgeX1 - layout.gorgeX0));
      const y = layout.wallTop + 60 + u * (layout.floorY - layout.wallTop - 120);
      const a = 0.05 + 0.05 * Math.sin(t * 1.3 + i);
      ctx.strokeStyle = 'rgba(120,170,200,' + a.toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 40);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** 不透明の地形（岩盤・壁・岩棚・下り口のリップ）。 */
  function renderTerrain(camX, camY, layout, t){
    if (!layout) return;
    if (layout.regionX1 < camX - 400 || layout.regionX0 > camX + VW + 400) return;
    drawBedrock(layout);

    /* 下り口のリップ（開口の左の平らな棚）。海底の縁として一段明るく。 */
    ctx.fillStyle = 'rgb(15,27,33)';
    ctx.fillRect(layout.lipX0, layout.wallTop - 6, layout.lipX1 - layout.lipX0 + 6, 10);
    ctx.fillStyle = 'rgba(150,204,220,0.42)';
    ctx.fillRect(layout.lipX0, layout.wallTop - 6, layout.lipX1 - layout.lipX0 + 6, 2);

    /* 壁と岩棚（描画＝衝突）。深いほど暗く。 */
    for (const s of layout.solids){
      const deep = (s.y - layout.wallTop) / (layout.floorY - layout.wallTop);
      drawRockRect(s, deep > 0.5);
    }
    if (camY + VH >= layout.floorY - 45){
      drawRockRect({ id:'trench-floor', x:layout.gorgeX0, y:layout.floorY - 1,
        w:layout.gorgeX1 - layout.gorgeX0, h:160 }, true);
    }

    drawCurrent(layout, camX, camY, t);
  }

  /** 加算の光（誘導灯・発光植物・入口のビーコン）。drawGlowPass の最後。 */
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
    beam.addColorStop(1, 'rgba(140,205,235,' + (0.16 * pulse).toFixed(3) + ')');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(bx - 34, by - 620); ctx.lineTo(bx + 34, by - 620);
    ctx.lineTo(bx + 120, by + 20); ctx.lineTo(bx - 120, by + 20);
    ctx.closePath(); ctx.fill();

    /* 下向きの誘導灯（ビーコン列）。下ほど淡い青白＝底の気配。 */
    for (const gd of layout.guides){
      const down = gd.i / 7;
      const warm = 1 - down;
      const gr = ctx.createRadialGradient(gd.x, gd.y, 1, gd.x, gd.y, gd.r);
      const c0 = 'rgba(' + Math.round(150 + warm * 90) + ',' + Math.round(200 + warm * 40) + ',235,' + (0.34 * pulse).toFixed(3) + ')';
      gr.addColorStop(0, c0);
      gr.addColorStop(1, 'rgba(90,160,200,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(gd.x, gd.y, gd.r, 0, TAU); ctx.fill();
      /* 下向きの小さな矢印（流れの向き） */
      ctx.strokeStyle = 'rgba(200,240,255,' + (0.5 * pulse).toFixed(3) + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(gd.x - 9, gd.y + 6); ctx.lineTo(gd.x, gd.y + 16); ctx.lineTo(gd.x + 9, gd.y + 6);
      ctx.stroke();
    }

    /* 発光植物（青白い）。局所の淡い青緑＝暗い水全体は塗らない。 */
    for (const pl of layout.plants){
      const sway = Math.sin(t * 1.1 + pl.seed * 0.05) * 4;
      const x = pl.x + sway, y = pl.y;
      if (x < camX - 155 || x > camX + VW + 155 || y < camY - 100 || y > camY + VH + 160) continue;
      const size = pl.s * (pl.y >= layout.floorY - 300 ? 1.7 : 1);
      const g = ctx.createRadialGradient(x, y - 24 * size, 1, x, y - 24 * size, 61 * size);
      g.addColorStop(0, 'rgba(110,213,227,0.31)');
      g.addColorStop(1, 'rgba(60,180,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y - 24 * size, 61 * size, 0, TAU); ctx.fill();

      /* 形: bulb=丸い球の房 / frond=細い葉 / bloom=紫の花 */
      if (pl.kind === 'bloom'){
        ctx.strokeStyle = 'rgba(150,235,225,0.8)'; ctx.lineWidth = 2.2;
        const fx = x + sway * 0.5, fy = y - 58 * size;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 8, y - 25 * size, fx, fy); ctx.stroke();
        ctx.fillStyle = 'rgba(177,119,220,0.48)';
        for (let k = 0; k < 5; k++){
          const a = k * TAU / 5;
          ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 6 * size, fy + Math.sin(a) * 6 * size,
            9 * size, 3.8 * size, a, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(245,220,255,0.86)';
        ctx.beginPath(); ctx.arc(fx, fy, 3 * size, 0, TAU); ctx.fill();
      } else if (pl.kind === 'frond'){
        for (let k = -2; k <= 2; k++){
          const dx = k * 10 * size + sway, dy = (64 - Math.abs(k) * 9) * size;
          ctx.fillStyle = 'rgba(31,98,110,0.62)';
          ctx.strokeStyle = 'rgba(135,237,225,0.66)'; ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + dx * 0.25 - 10 * size, y - dy * 0.8, x + dx, y - dy);
          ctx.quadraticCurveTo(x + dx * 0.9 + 8 * size, y - dy * 0.7, x, y);
          ctx.fill(); ctx.stroke();
        }
      } else {
        for (let k = 0; k < 3; k++){
          const ox = (k - 1) * 7 * pl.s;
          ctx.fillStyle = 'rgba(170,245,240,0.9)';
          ctx.beginPath(); ctx.arc(x + ox + sway * 0.4, y - 20 * pl.s - k * 3, 4.2 * pl.s, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(120,220,215,0.6)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sway * 0.4, y - 22 * pl.s); ctx.stroke();
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
      out.push({ x: pl.x, y: pl.y - 10, r: 95 * pl.s, s: 0.32 });
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

  return { renderTerrain, renderGlow, lightPunches, renderLabel };
}
