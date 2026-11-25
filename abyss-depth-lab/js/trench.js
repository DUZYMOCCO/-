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
import { TRENCH, createTrench } from './trench-rules.js?v=2';

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

  /** 壁・岩棚を 1 枚の岩ブロックとして描く（矩形そのもの＝衝突と一致）。biome ごとに質感・リム色・鉱脈を分ける。 */
  function drawRockRect(s, deep){
    const { x, y, w, h } = s;
    const b = s.biome || 'trench';
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (b === 'volcanic') {
      g.addColorStop(0, 'rgb(20,14,13)');
      g.addColorStop(0.55, 'rgb(12,8,8)');
      g.addColorStop(1, 'rgb(5,3,4)');
    } else if (b === 'cave') {
      g.addColorStop(0, 'rgb(10,16,23)');
      g.addColorStop(0.55, 'rgb(6,10,16)');
      g.addColorStop(1, 'rgb(2,4,8)');
    } else if (b === 'hall') {
      g.addColorStop(0, 'rgb(14,28,36)');
      g.addColorStop(0.55, 'rgb(8,18,25)');
      g.addColorStop(1, 'rgb(4,9,14)');
    } else {
      g.addColorStop(0, deep ? 'rgb(11,20,26)' : 'rgb(14,25,31)');
      g.addColorStop(0.55, 'rgb(7,14,19)');
      g.addColorStop(1, 'rgb(3,7,10)');
    }
    ctx.fillStyle = g;
    /* 当たり判定は厳密な矩形 s と一致させたまま、上端・下端に自然な岩の凹凸シルエットを重ねて WebGL2 岩肌と馴染ませる */
    const segs = Math.max(4, Math.min(28, Math.round(w / 52)));
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const jag = (i === 0 || i === segs) ? 0 : (hash(s.id + 't', i) - 0.5) * Math.min(18, h * 0.22);
      ctx.lineTo(x + w * u, y + jag);
    }
    ctx.lineTo(x + w, y + h);
    for (let i = segs; i >= 0; i--) {
      const u = i / segs;
      const jag = (i === 0 || i === segs) ? 0 : (hash(s.id + 'b', i) - 0.5) * Math.min(16, h * 0.22);
      ctx.lineTo(x + w * u, y + h + jag);
    }
    ctx.closePath();
    ctx.fill();

    /* 上端のリム（岩の稜線） */
    ctx.strokeStyle = b === 'volcanic' ? 'rgba(206,118,68,0.52)' : (b === 'cave' ? 'rgba(84,128,150,0.48)' : (b === 'hall' ? 'rgba(122,206,226,0.64)' : 'rgba(102,172,184,0.58)'));
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const jag = (i === 0 || i === segs) ? 0 : (hash(s.id + 't', i) - 0.5) * Math.min(18, h * 0.22);
      if (i === 0) ctx.moveTo(x, y + jag);
      else ctx.lineTo(x + w * u, y + jag);
    }
    ctx.stroke();

    ctx.fillStyle = b === 'volcanic' ? 'rgba(196,112,62,0.22)' : (b === 'hall' ? 'rgba(132,208,224,0.26)' : 'rgba(122,189,192,0.22)');
    ctx.fillRect(x, y, 2, h);
    ctx.fillRect(x + w - 2, y, 2, h);

    /* 下端の陰 */
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y + h - 4, w, 4);

    /* ひび・岩の割れ / 熱水帯はほのかな赤錆・琥珀鉱脈 */
    ctx.strokeStyle = b === 'volcanic' ? 'rgba(218,108,42,0.38)' : 'rgba(40,66,78,0.35)';
    ctx.lineWidth = b === 'volcanic' ? 1.8 : 1.4;
    const n = Math.min(18, Math.max(2, Math.round(w / 150)));
    for (let i = 0; i < n; i++){
      const sx = x + hash(s.id, i) * w;
      ctx.beginPath();
      ctx.moveTo(sx, y + 4);
      ctx.lineTo(sx + (hash(s.id, i + 50) - 0.5) * 28, y + Math.min(h - 6, 180) * (0.4 + hash(s.id, i + 90) * 0.4));
      ctx.stroke();
    }
    /* 点々とした鉱物 */
    ctx.fillStyle = b === 'volcanic' ? 'rgba(240,140,68,0.34)' : (b === 'hall' ? 'rgba(160,210,248,0.36)' : 'rgba(130,180,196,0.26)');
    for (let i = 0; i < 5; i++){
      ctx.beginPath();
      ctx.arc(x + hash(s.id, i + 200) * w, y + hash(s.id, i + 300) * Math.min(h, 420), 1.3 + hash(s.id, i + 400), 0, TAU);
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

  /** 熱水噴出口（黒玄武岩チムニー＋上昇する熱水プルーム）。 */
  function drawVents(layout, camX, camY, t){
    if (!layout.vents) return;
    for (const v of layout.vents){
      if (v.x < camX - 240 || v.x > camX + VW + 240 || v.y < camY - 360 || v.y > camY + VH + 200) continue;
      // 黒玄武岩チムニー台座
      ctx.fillStyle = '#120b0a';
      ctx.beginPath();
      ctx.moveTo(v.x - 36 * v.power, v.y);
      ctx.lineTo(v.x - 16 * v.power, v.y - 54 * v.power);
      ctx.lineTo(v.x + 16 * v.power, v.y - 54 * v.power);
      ctx.lineTo(v.x + 36 * v.power, v.y);
      ctx.closePath();
      ctx.fill();
      // 噴出口の赤熱リップ
      const flick = 0.78 + 0.22 * Math.sin(t * 3.4 + v.seed);
      ctx.fillStyle = 'rgba(255,134,54,' + (0.72 * flick).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(v.x, v.y - 52 * v.power, 14 * v.power, 4.5 * v.power, 0, 0, TAU);
      ctx.fill();
      // 上昇する熱水プルーム（黒煙＋熱気泡）
      ctx.save();
      for (let i = 0; i < 7; i++){
        const u = ((t * 0.42 + i / 7 + v.seed * 0.03) % 1);
        const py = v.y - 54 * v.power - u * 230 * v.power;
        const px = v.x + Math.sin(t * 2.2 + i * 1.9 + v.seed) * (8 + u * 28);
        const rad = (10 + u * 34) * v.power;
        ctx.fillStyle = 'rgba(28,16,12,' + ((1 - u) * 0.34).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  /** 不透明の地形（岩盤・壁・岩棚・下り口のリップ・熱水噴出口）。depthActive時はWebGL2背景を隠さない。 */
  function renderTerrain(camX, camY, layout, t, depthActive){
    if (!layout) return;
    if (layout.regionX1 < camX - 400 || layout.regionX0 > camX + VW + 400) return;
    if (!depthActive) {
      drawBedrock(layout);
      /* v1.15.0: 奥〜中距離の視差背景（Depth OFF 時のみ Canvas2D 側で描く） */
      drawBackLayers(camX, camY, layout, t);
    }

    /* 下り口のリップ（開口の左の平らな棚）。海底の縁として一段明るく。 */
    ctx.fillStyle = 'rgb(15,27,33)';
    ctx.fillRect(layout.lipX0, layout.wallTop - 6, layout.lipX1 - layout.lipX0 + 6, 10);
    ctx.fillStyle = 'rgba(150,204,220,0.42)';
    ctx.fillRect(layout.lipX0, layout.wallTop - 6, layout.lipX1 - layout.lipX0 + 6, 2);

    /* 壁と岩棚（描画＝衝突）。画面外カリング付き。 */
    for (const s of layout.solids){
      if (s.x + s.w < camX - 180 || s.x > camX + VW + 180 || s.y + s.h < camY - 180 || s.y > camY + VH + 180) continue;
      const deep = (s.y - layout.wallTop) / Math.max(1, layout.deepFloorY - layout.wallTop);
      drawRockRect(s, deep > 0.4);
    }
    /* 合流広間の底床（y = deepFloorY） */
    if (camY + VH >= layout.deepFloorY - 45){
      drawRockRect({ id:'hall-floor', biome:'hall', x:layout.hallX0 - 160, y:layout.deepFloorY - 1,
        w:(layout.hallX1 - layout.hallX0) + 320, h:180 }, true);
    }

    drawVents(layout, camX, camY, t);
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

    /* 熱水噴出口の局所琥珀・赤錆グロー */
    if (layout.vents) {
      for (const v of layout.vents){
        if (v.x < camX - 280 || v.x > camX + VW + 280 || v.y < camY - 280 || v.y > camY + VH + 240) continue;
        const flick = 0.8 + 0.2 * Math.sin(t * 3.1 + v.seed);
        const r = 165 * v.power;
        const vg = ctx.createRadialGradient(v.x, v.y - 52 * v.power, 2, v.x, v.y - 52 * v.power, r);
        vg.addColorStop(0, 'rgba(255,154,64,' + (0.46 * flick).toFixed(3) + ')');
        vg.addColorStop(0.45, 'rgba(220,86,32,' + (0.20 * flick).toFixed(3) + ')');
        vg.addColorStop(1, 'rgba(180,50,18,0)');
        ctx.fillStyle = vg;
        ctx.beginPath(); ctx.arc(v.x, v.y - 52 * v.power, r, 0, TAU); ctx.fill();
      }
    }

    /* 発光植物（青白い／合流広間は淡い青紫も混ざる）。局所の淡い光＝暗い水全体は塗らない。 */
    for (const pl of layout.plants){
      const sway = Math.sin(t * 1.1 + pl.seed * 0.05) * 4;
      const x = pl.x + sway, y = pl.y;
      if (x < camX - 155 || x > camX + VW + 155 || y < camY - 100 || y > camY + VH + 160) continue;
      const size = pl.s * (pl.biome === 'hall' ? 1.85 : (pl.y >= layout.floorY - 300 ? 1.7 : 1));
      const g = ctx.createRadialGradient(x, y - 24 * size, 1, x, y - 24 * size, 61 * size);
      if (pl.biome === 'hall' && pl.kind === 'bloom') {
        g.addColorStop(0, 'rgba(164,136,245,0.34)');
        g.addColorStop(1, 'rgba(90,96,210,0)');
      } else {
        g.addColorStop(0, 'rgba(110,213,227,0.31)');
        g.addColorStop(1, 'rgba(60,180,200,0)');
      }
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

  /* ========================================================================
   * v1.15.0: 2D 海溝の「水中の動きとスケール感」（Three 側 v2 と同じ発想の Canvas2D 実装）
   *   ・視差レイヤー: 奥の崖（0.30/0.88）／中距離の岩壁（0.58/0.94）／手前の岩影（画面固定＋1.10）。
   *     カメラが上下左右へ動くと、層ごとに違う速度で流れる。奥は低コントラストのシルエット。
   *   ・停船中も動く水: 海雪（緩く沈む点）と水流の筋（緩く下へ流れる）。t で連続（停止しても動く）。
   *   ・時折、数画面級の巨大生物の影が奥を横切る（衝突なし・敵/ボスとは別系統の純背景）。
   *   ・負荷: 崖・岩・雪・水流は layout.ax 単位で 1 回だけ生成（キャッシュ）。描画は画面範囲で間引く。
   *   ・地形の判定（solids）には一切触れない（見た目だけ。暗部は維持し、対比は控えめ）。
   * ==================================================================== */

  /* 視差係数（1=世界固定、小=奥、大=手前）。Three 側 v2 と同じ値。 */
  const PARALLAX = Object.freeze({ farX:0.30, farY:0.88, midX:0.58, midY:0.94, shadowX:0.24, shadowY:0.80, foreX:1.10, foreY:1.05 });
  const CAM_REF = 2700;                 // 侵入量を設計する基準の camY
  const SNOW_N = 96, CUR_N = 10, EDGE_SEG = 12;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* 決定的な値ノイズ（毎フレーム乱数を使わない）。 */
  function vnoise(x, y){ const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n); }

  /* 生成キャッシュ（layout.ax 単位。崖・岩・雪・水流は 1 回だけ作る）。 */
  const _fx = { ax:null, built:false, C0:0, C1:0, far:[], mid:[], fore:[], snow:[], cur:[], shadowW:0 };
  const _fxState = { t:null, shadow:{ active:false, wait:9, dir:1, x:0, y:0, speed:0 } };

  /* 1 層ぶんの「上下から迫る岩」。設計 x は world の PX 倍（画面 = PX*(worldX - camX)）。 */
  function buildIntrusions(PX, openTop, openBot, opt){
    const out = [];
    let i = 0;
    for (let w0 = _fx.C0; w0 < _fx.C1; ){
      const w = opt.wMin + ((i * 97) % 5) * (opt.wMax - opt.wMin) / 4;
      out.push({ baseX0: PX * w0,             w: PX * w, edge:'bot', open: openBot, h: opt.h, seed: i * 7.3 + opt.seed, jag: opt.jag, amp: opt.amp, wob: opt.wob });
      out.push({ baseX0: PX * (w0 + w * 0.34), w: PX * w, edge:'top', open: openTop, h: opt.h, seed: 41 + i * 5.1 + opt.seed, jag: opt.jag, amp: opt.amp, wob: opt.wob });
      w0 += w * 0.58; i++;
    }
    return out;
  }

  function buildFx(layout){
    if (_fx.built && _fx.ax === layout.ax) return _fx;
    _fx.C0 = layout.regionX0 - VW - 600;
    _fx.C1 = layout.regionX1 + 600;
    _fx.far = buildIntrusions(PARALLAX.farX, VH * 0.30, VH * 0.72, { h:760, wMin:520, wMax:1300, jag:150, amp:20, wob:50, seed:0 });
    _fx.mid = buildIntrusions(PARALLAX.midX, VH * 0.24, VH * 0.76, { h:840, wMin:440, wMax:1080, jag:120, amp:28, wob:44, seed:137 });
    /* 手前の岩影（画面固定・上端/下端をふさぐ）。 */
    _fx.fore = [];
    { const SW = VW + 1600; let x = -SW / 2, i = 0;
      while (x < SW / 2){
        const w = 520 + ((i * 61) % 5) * 200;
        _fx.fore.push({ cx:x + w * 0.5,          w, h:460, side:'top', seed:3 + i * 2.9, y0:34 });
        _fx.fore.push({ cx:x + w * 0.5 + 180,    w, h:460, side:'bot', seed:5 + i * 3.4, y0:VH - 34 });
        x += w * 0.6; i++;
      } }
    /* 海雪（画面固定・緩く沈む点）。 */
    _fx.snow = [];
    { const SW = VW + 420, SH = VH + 420;
      for (let i = 0; i < SNOW_N; i++){
        _fx.snow.push({
          baseX: vnoise(i * 1.7 + 3, 11) * SW, baseY: vnoise(i * 2.3 + 7, 29) * SH,
          z: 0.5 + vnoise(i * 3.1, 53) * 0.9, s: 0.7 + vnoise(i * 2.9, 47) * 1.5,
          spd: 8 + vnoise(i * 4.1, 71) * 20, sway: 3 + vnoise(i * 5.3, 91) * 7, ph: vnoise(i * 6.7, 13) * TAU,
        });
      } }
    /* 水流の筋（画面固定・緩く下へ流れる）。 */
    _fx.cur = [];
    for (let i = 0; i < CUR_N; i++){
      _fx.cur.push({
        baseX: (vnoise(i * 1.9 + 2, 17) - 0.5) * (VW + 240), baseY: vnoise(i * 2.7 + 5, 23) * (VH + 240),
        w: 10 + vnoise(i * 2.2, 5) * 8, h: 80 + vnoise(i * 3.3, 7) * 130,
        spd: 20 + vnoise(i * 4.4, 31) * 24, sway: 5 + vnoise(i * 5.5, 37) * 8, ph: vnoise(i * 6.1, 41) * TAU,
      });
    }
    _fx.shadowW = VW * 2.0;
    _fx.ax = layout.ax; _fx.built = true;
    return _fx;
  }

  /* 上端（または下端）がギザつく岩塊の多角形。down=true は yEdge から下へ、false は上へ。 */
  function makeCliff(x0, w, yEdge, h, down, seed, jag){
    const pts = [];
    for (let i = 0; i <= EDGE_SEG; i++){
      const u = i / EDGE_SEG;
      const edge = (0.28 + 0.72 * Math.abs(Math.sin(u * Math.PI))) * jag
                 * (0.42 + 0.58 * vnoise(seed * 1.7 + u * 7.3, seed * 0.9));
      pts.push([x0 + w * u, down ? (yEdge - edge) : (yEdge + edge)]);
    }
    /* 反対側（画面外寄り）も左右の縁と底を揺らし、直線的な縦の辺を残さない（Three 側 cliffMesh と同じ狙い）。 */
    const far = down ? (yEdge + h) : (yEdge - h);
    const sag = (down ? 1 : -1) * (14 + vnoise(seed * 3.7, 19) * 28);
    pts.push([x0 + w + (vnoise(seed * 2.1, 7) - 0.5) * jag * 0.5, far]);
    pts.push([x0 + w * 0.5 + (vnoise(seed * 4.3, 23) - 0.5) * jag * 0.6, far + sag]);
    pts.push([x0 + (vnoise(seed * 2.9, 13) - 0.5) * jag * 0.5, far]);
    return pts;
  }

  function fillCliff(pts, yEdge, h, down, edgeCol, midCol, deepCol, rimCol){
    const g = ctx.createLinearGradient(0, yEdge, 0, yEdge + (down ? h : -h));
    g.addColorStop(0, edgeCol); g.addColorStop(0.55, midCol); g.addColorStop(1, deepCol);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath(); ctx.fill();
    if (rimCol){
      ctx.strokeStyle = rimCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k <= EDGE_SEG; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
    }
  }

  function drawLayer(camX, camY, items, PX, PY, cols){
    /* 縦の視差は境界付近で必ず「通路」を残すよう上限を設ける（深く潜っても全画面をふさがない）。 */
    const vpar = clamp((CAM_REF - camY) * PY * 0.12, -90, 90);
    for (const it of items){
      const x0 = it.baseX0 - PX * camX;
      if (x0 > VW + 420 || x0 + it.w < -420) continue;                 // 画面範囲で間引く（負荷抑制）
      const wob = (vnoise(it.seed, 3) - 0.5) * it.wob;
      const yEdge = it.open + vpar + wob;
      const down = it.edge === 'bot';
      fillCliff(makeCliff(x0, it.w, yEdge, it.h, down, it.seed, it.jag), yEdge, it.h, down,
        cols.edge, cols.mid, cols.deep, cols.rim);
    }
  }

  /* 巨大生物の影（奥＝far と mid の間。数画面級。衝突なし・純背景）。 */
  function drawGiantShadow(camX, camY, t){
    const s = _fxState.shadow;
    const dt = (_fxState.t === null) ? 0 : Math.max(0, Math.min(0.1, t - _fxState.t));
    const W = _fx.shadowW;
    if (!s.active){
      s.wait -= dt;
      if (s.wait <= 0){
        s.active = true; s.dir = s.dir >= 0 ? -1 : 1;
        s.x = s.dir > 0 ? -W * 0.62 : VW + W * 0.62;
        const span = VW + W * 1.24, dur = 18 + vnoise(t, 3.3) * 8;
        s.speed = s.dir * span / dur;
        s.y = VH * (0.24 + vnoise(t, 9.1) * 0.26);
      }
    } else {
      s.x += s.speed * dt;
      const done = s.dir > 0 ? (s.x > VW + W * 0.62 + 40) : (s.x < -W * 0.62 - 40);
      if (done){ s.active = false; s.wait = 12 + vnoise(t, 21.7) * 14; }
    }
    if (!s.active) return;
    const L = W, hs = W * 0.10;
    ctx.save();
    ctx.globalAlpha = 0.72;
    const g = ctx.createLinearGradient(0, s.y - hs, 0, s.y + hs);
    g.addColorStop(0, 'rgba(5,12,18,0.94)');
    g.addColorStop(0.5, 'rgba(2,6,10,0.97)');
    g.addColorStop(1, 'rgba(5,12,18,0.94)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s.x - L * 0.5, s.y);
    ctx.bezierCurveTo(s.x - L * 0.30, s.y - hs * 1.05, s.x + L * 0.22, s.y - hs, s.x + L * 0.42, s.y - hs * 0.30);
    ctx.lineTo(s.x + L * 0.50 - 46, s.y - hs * 1.5);
    ctx.lineTo(s.x + L * 0.50, s.y);
    ctx.lineTo(s.x + L * 0.50 - 46, s.y + hs * 1.5);
    ctx.lineTo(s.x + L * 0.42, s.y + hs * 0.30);
    ctx.bezierCurveTo(s.x + L * 0.22, s.y + hs, s.x - L * 0.30, s.y + hs * 1.05, s.x - L * 0.5, s.y);
    ctx.closePath(); ctx.fill();
    /* 淡い青白い輪郭（暗い遠景でも読める）。 */
    ctx.strokeStyle = 'rgba(134,186,210,0.46)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }

  /* 奥〜中距離の視差背景。renderTerrain（world 変換中）から、変換を打ち消して画面座標で呼ぶ。 */
  function drawBackLayers(camX, camY, layout, t){
    if (!layout) return;
    if (layout.regionX1 < camX - VW - 500 || layout.regionX0 > camX + VW + 500) return;
    const fx = buildFx(layout);
    ctx.save();
    ctx.translate(camX, camY);                 // 呼び出し元の world 変換を打ち消す（画面座標へ）
    /* far: 低コントラストのシルエット（暗部を維持）。 */
    drawLayer(camX, camY, fx.far, PARALLAX.farX, PARALLAX.farY,
      { edge:'#2b4653', mid:'#13232b', deep:'#060e13', rim:'rgba(116,164,180,0.22)' });
    /* 巨影（最も奥） */
    drawGiantShadow(camX, camY, t);
    /* mid: 少しだけ彫りの深い岩壁 */
    drawLayer(camX, camY, fx.mid, PARALLAX.midX, PARALLAX.midY,
      { edge:'#3a5664', mid:'#16262f', deep:'#040b10', rim:'rgba(146,196,212,0.30)' });
    ctx.restore();
    _fxState.t = t;
  }

  /* 停船中も動く水（海雪＋水流。drawWorld の地形の後・実体の前で呼ぶ想定）。 */
  function renderDrift(camX, camY, layout, t){
    if (!layout) return;
    if (layout.regionX1 < camX - VW - 500 || layout.regionX0 > camX + VW + 500) return;
    const fx = buildFx(layout);
    const SW = VW + 420, SH = VH + 420;
    ctx.save();
    ctx.translate(camX, camY);                 // 呼び出し元の world 変換を打ち消す（画面座標へ）
    /* 水流の筋（加算・ごく淡く） */
    ctx.globalCompositeOperation = 'lighter';
    for (const c of fx.cur){
      const sy = ((c.baseY + t * c.spd) % SH + SH) % SH - 210;
      if (sy < -140 || sy > VH + 140) continue;
      const sx = c.baseX + Math.sin(t * 0.6 + c.ph) * c.sway - camX * 0.10;
      ctx.strokeStyle = 'rgba(120,170,200,0.13)';
      ctx.lineWidth = c.w * 0.4;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 4, sy + c.h); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    /* 海雪（画面固定・緩く沈む） */
    ctx.fillStyle = '#bfe9ff';
    for (const s of fx.snow){
      const sy = ((s.baseY + t * s.spd) % SH + SH) % SH - 210;
      if (sy < -20 || sy > VH + 20) continue;
      const sx = ((s.baseX - camX * 0.14) % SW + SW) % SW - 210;
      ctx.globalAlpha = 0.17 * s.z;
      ctx.beginPath(); ctx.arc(sx, sy, s.s * 0.7, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* 手前の岩影（上端/下端をふさぐ。地形の後・実体の前＝艇や弾を隠さない）。 */
  function renderForeground(camX, camY, layout, t){
    if (!layout) return;
    if (layout.regionX1 < camX - VW - 500 || layout.regionX0 > camX + VW + 500) return;
    const fx = buildFx(layout);
    ctx.save();
    ctx.translate(camX, camY);                 // 呼び出し元の world 変換を打ち消す（画面座標へ）
    const dx = (PARALLAX.foreX - 1) * (camX - layout.regionX0);   // 左右は世界より少し速く
    const dy = (PARALLAX.foreY - 1) * (camY - CAM_REF);           // 上下はわずかに
    for (const f of fx.fore){
      const cx = f.cx - dx;
      if (cx - f.w * 0.55 > VW + 220 || cx + f.w * 0.55 < -220) continue;
      const down = f.side === 'bot';
      const yEdge = f.y0 + dy;
      fillCliff(makeCliff(cx - f.w * 0.5, f.w, yEdge, f.h, down, f.seed, 170), yEdge, f.h, down,
        '#2b3d47', '#0f1a21', '#03080c', 'rgba(150,205,220,0.28)');
    }
    ctx.restore();
  }

  /* 検証用: 生成済みレイヤーの数と巨影の状態（通常描画には影響しない）。 */
  function debugFx(){
    return {
      ax: _fx.ax, built: _fx.built,
      counts: { far: _fx.far.length, mid: _fx.mid.length, fore: _fx.fore.length, snow: _fx.snow.length, cur: _fx.cur.length },
      shadow: { active: _fxState.shadow.active, x: Math.round(_fxState.shadow.x), y: Math.round(_fxState.shadow.y), wait: +_fxState.shadow.wait.toFixed(1) },
    };
  }
  /* 検証用: 巨影を強制表示（描画の通常動作には影響しない）。 */
  function forceShadow(x){
    const W = _fx.shadowW || VW * 2.0;
    const s = _fxState.shadow;
    s.active = true; s.dir = -1;
    s.x = (x === undefined || x === null) ? VW + W * 0.62 : x;
    s.y = VH * 0.34; s.speed = -(VW + W * 1.24) / 20;
    return true;
  }

  return { renderTerrain, renderGlow, lightPunches, renderLabel,
    renderDrift, renderForeground, debugFx, forceShadow };
}
