/**
 * ABYSS DIVE — スターフォックス風 背後視点・高速トンネルコースター描画（1280×720 Canvas2D）
 *
 * v3.14.0:
 *   - 「見た目＝当たり 100% 一致」: 自艇とゲート／リングが同一の遠近投影（PLAYER_Z プレーン）を共有し、
 *     ゲートが自艇を通過する瞬間の穴の位置・大きさが判定と 1px のズレもなく一致する。
 *   - 景色クオリティ大幅強化: 実体感のある多層岩盤チューブ、螺旋海流リボン、壁面の発光結晶＆
 *     深海アセット（岩峰・巨大海草・発光クラゲ）の高速通過、立体感のある岩盤アーチゲート。
 */

import { depthMetersAt, formatDepthDisplay } from './world-biomes.js?v=3';

const TAU = Math.PI * 2;
const METERS_PER_MILE = 1609.344;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 自艇が位置する正規化深度プレーン（ゲート／リングがここを通過した瞬間に判定される）。 */
export const TUNNEL_PLAYER_Z = 0.24;
const VISIBLE_WINDOW = 0.28;
const PROJ_X = 225;
const PROJ_Y = 140;

function loadOptImg(rel) {
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.decoding = 'async';
  img.src = new URL('../assets/' + rel, import.meta.url).href;
  return img;
}
function imgReady(img) { return !!(img && img.complete && img.naturalWidth > 0); }

export function createTunnelView(opts) {
  const ctx = opts.ctx;
  const VW = opts.VW || 1280;
  const VH = opts.VH || 720;

  // 既存の深海アートをトンネル壁面の通過アクセントとして軽量流用（未読込でも安全）
  const art = {
    kelp: loadOptImg('hall_giant_kelp.webp'),
    vent: loadOptImg('volcanic_vent.webp'),
    spire: loadOptImg('cliff_spire.webp'),
    jelly: loadOptImg('creature_jelly.webp'),
  };

  /**
   * 正規化トンネル空間 (nx, ny, depthZ) → 画面座標投影。
   * 自艇・ゲート・加速リングすべてがこの同一関数を使うことで「見た目＝当たり」を完全一致させる。
   */
  function project(nx, ny, depthZ, vanishX, vanishY) {
    const z = clamp(depthZ, 0.02, 1.35);
    const scale = 1 / (0.14 + z * 1.65);
    return {
      x: vanishX + nx * PROJ_X * scale,
      y: vanishY + ny * PROJ_Y * scale,
      scale,
    };
  }

  function render(dive, shieldOn) {
    if (!dive) return;
    const st = dive.state();
    const th = st.theme;
    const t = st.time;
    const cur = dive.curveAt(st.progress);

    // 画面揺れ＆コースのうねり（自艇とゲートが同じ vanish を共有するため、うねってもズレない）
    const shakeX = st.shake > 0 ? Math.sin(t * 62) * 14 * st.shake : 0;
    const shakeY = st.shake > 0 ? Math.cos(t * 53) * 10 * st.shake : 0;
    const vanishX = VW * 0.5 + cur.cx * VW * 0.24 - st.px * 48 + shakeX;
    const vanishY = VH * 0.49 + cur.cy * VH * 0.20 - st.py * 34 + shakeY;

    ctx.save();

    /* 1. 深淵の奥行き背景グラデーション */
    const bg = ctx.createRadialGradient(vanishX, vanishY, 24, vanishX, vanishY, VW * 0.78);
    bg.addColorStop(0, th.bgTop);
    bg.addColorStop(0.55, th.bgBot);
    bg.addColorStop(1, '#01040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VW, VH);

    /* 2. 消失点（出口に待ち受けるマントル楽園の青白・黄金光／ブラックホール光：白飛び防止の上限付き） */
    const exitGrow = 0.38 + st.progress * 0.52;
    const exitR = (110 + st.progress * 155) * (st.boostT > 0 ? 1.12 : 1.0);
    const [er, eg, eb] = th.exitCol;
    const [gr, gg, gb] = th.exitGold;
    const egd = ctx.createRadialGradient(vanishX, vanishY, 6, vanishX, vanishY, exitR);
    egd.addColorStop(0, `rgba(255,255,255,${(0.32 + 0.24 * st.progress).toFixed(3)})`);
    egd.addColorStop(0.32, `rgba(${gr},${gg},${gb},${(0.30 * exitGrow).toFixed(3)})`);
    egd.addColorStop(0.65, `rgba(${er},${eg},${eb},${(0.18 * exitGrow).toFixed(3)})`);
    egd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = egd;
    ctx.beginPath(); ctx.arc(vanishX, vanishY, exitR, 0, TAU); ctx.fill();

    /* 3. 実体感のある多層岩盤チューブ（奥→手前へ岩壁リング＋発光結晶＋通過アート） */
    const ringCount = 22;
    const scroll = (t * 2.5 * st.speed + st.progress * 20) % 1;
    const [rr, rg, rb] = th.ringCol;
    const [wr, wg, wb] = th.wallCol;
    const [rmr, rmg, rmb] = th.wallRim;

    for (let i = ringCount - 1; i >= 0; i--) {
      const z = (i + (1 - scroll)) / ringCount;
      const ahead = dive.curveAt(st.progress + z * 0.14);
      const cx = vanishX + (ahead.cx - cur.cx) * VW * 0.36 * (1 - z);
      const cy = vanishY + (ahead.cy - cur.cy) * VH * 0.28 * (1 - z);
      const p = project(0, 0, z, cx, cy);
      const rx = 258 * p.scale;
      const ry = 166 * p.scale;
      const near = clamp(1 - z, 0, 1);
      const fade = Math.sin(near * Math.PI * 0.90);

      // 岩盤チューブの帯（外縁を暗く塗り、内縁に光の反射リム）
      const sides = 12;
      const rot = z * 1.15 + t * 0.18 * th.dir;
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * TAU + rot;
        const jag = 1 + 0.08 * Math.sin(k * 3.7 + i * 2.1);
        const vx = cx + Math.cos(a) * rx * jag;
        const vy = cy + Math.sin(a) * ry * jag;
        if (k === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      // 岩盤の立体リムストローク（奥は淡く、手前は太く重厚に）
      ctx.strokeStyle = `rgba(${wr + 10},${wg + 14},${wb + 18},${(fade * 0.55).toFixed(3)})`;
      ctx.lineWidth = Math.max(4, 24 * p.scale * 0.35);
      ctx.stroke();

      ctx.strokeStyle = i % 2 === 0
        ? `rgba(${rr},${rg},${rb},${(fade * 0.32).toFixed(3)})`
        : `rgba(${rmr},${rmg},${rmb},${(fade * 0.22).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.2, 3.0 * p.scale * 0.36);
      ctx.stroke();

      // 壁面に張り付く発光結晶・深海海草・漂うクラゲ（奥から手前へ飛んでくる景色！）
      if (i % 2 === 0 && near > 0.10 && near < 0.96) {
        const slot = ((i * 7 + Math.floor(t * 2.5 * st.speed + st.progress * 20)) % 6 + 6) % 6;
        const sideAng = (slot * 1.05 + 0.45) % TAU;
        const ax = cx + Math.cos(sideAng) * rx * 0.94;
        const ay = cy + Math.sin(sideAng) * ry * 0.94;
        const propImg = (slot % 3 === 0) ? art.kelp : ((slot % 3 === 1) ? art.spire : art.jelly);
        if (imgReady(propImg)) {
          const pw = (slot % 3 === 2 ? 70 : 120) * p.scale * 0.55;
          const ph = pw * (propImg.naturalHeight / propImg.naturalWidth);
          ctx.globalAlpha = fade * (slot % 3 === 2 ? 0.55 : 0.48);
          ctx.drawImage(propImg, ax - pw * 0.5, ay - ph * 0.5, pw, ph);
        }
        // 壁面の発光クリスタル点
        ctx.globalCompositeOperation = 'lighter';
        const cr = Math.max(3, 14 * p.scale * 0.42);
        const cg = ctx.createRadialGradient(ax, ay, 0.5, ax, ay, cr * 2.6);
        const gold = (slot % 2 === 0);
        cg.addColorStop(0, gold ? `rgba(${gr},${gg},${gb},${(fade * 0.65).toFixed(3)})` : `rgba(${rr},${rg},${rb},${(fade * 0.65).toFixed(3)})`);
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(ax, ay, cr * 2.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    /* 4. 螺旋を描く海流リボン＆放射状スピードライン */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 3; s++) {
      ctx.beginPath();
      for (let k = 0; k <= 26; k++) {
        const z = 0.08 + (k / 26) * 0.92;
        const a = s * (TAU / 3) + z * 5.2 - t * 4.4 * st.speed * th.dir;
        const p = project(Math.cos(a) * 0.98, Math.sin(a) * 0.92, z, vanishX, vanishY);
        if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${rr},${rg},${rb},${st.boostT > 0 ? 0.28 : 0.16})`;
      ctx.lineWidth = st.boostT > 0 ? 4.5 : 2.6;
      ctx.stroke();
    }

    const streakCount = st.boostT > 0 ? 46 : 30;
    for (let i = 0; i < streakCount; i++) {
      const ang = (i * 2.39996) % TAU;
      const ph = ((t * (1.6 + (i % 5) * 0.22) * st.speed + i * 0.173) % 1);
      const r0 = 32 + ph * ph * 680;
      const r1 = r0 + (44 + ph * 155) * (st.boostT > 0 ? 1.48 : 1.0);
      const a = Math.sin(ph * Math.PI) * (st.boostT > 0 ? 0.56 : 0.34);
      ctx.strokeStyle = `rgba(${rr},${rg},${rb},${a.toFixed(3)})`;
      ctx.lineWidth = 1.5 + ph * 2.4;
      ctx.beginPath();
      ctx.moveTo(vanishX + Math.cos(ang) * r0, vanishY + Math.sin(ang) * r0 * 0.68);
      ctx.lineTo(vanishX + Math.cos(ang) * r1, vanishY + Math.sin(ang) * r1 * 0.68);
      ctx.stroke();
    }
    ctx.restore();

    /* 5. コース障害ゲート（隙間を抜ける）＆加速リング（奥→手前へソート）
       ※ dz = 0（通過判定の瞬間）でちょうど z = TUNNEL_PLAYER_Z になるように統一！ */
    const behindList = [];
    const frontList = [];
    for (const item of st.course) {
      const dz = item.at - st.progress;
      if (dz < -0.055 || dz > VISIBLE_WINDOW) continue;
      const z = TUNNEL_PLAYER_Z + (dz / VISIBLE_WINDOW) * (1.0 - TUNNEL_PLAYER_Z);
      if (z < 0.025) continue;
      const entry = { item, z };
      if (z >= TUNNEL_PLAYER_Z) behindList.push(entry);
      else frontList.push(entry);
    }
    behindList.sort((a, b) => b.z - a.z);
    frontList.sort((a, b) => b.z - a.z);

    for (const { item, z } of behindList) {
      const alpha = clamp((1.08 - z) * 1.35, 0.10, 1);
      if (item.kind === 'gate') drawGate(item, z, alpha, vanishX, vanishY, th);
      else if (item.kind === 'ring') drawBoostRing(item, z, alpha, vanishX, vanishY, th, t);
    }

    /* 6. 自艇リアビュー（ゲートと完全に同じ project(px, py, TUNNEL_PLAYER_Z) 上に描画！） */
    drawPlayerRear(st, vanishX, vanishY, shieldOn, t);

    /* 通過直後（自艇より手前）のゲート／リングを薄く手前へ流し去る（抜けた実感が爆増！） */
    for (const { item, z } of frontList) {
      const alpha = clamp((z / TUNNEL_PLAYER_Z) * 0.72, 0, 0.72);
      if (item.kind === 'gate') drawGate(item, z, alpha, vanishX, vanishY, th);
      else if (item.kind === 'ring') drawBoostRing(item, z, alpha, vanishX, vanishY, th, t);
    }

    /* 7. ブースト＆かすりフラッシュ */
    if (st.clearFlash > 0) {
      ctx.fillStyle = `rgba(160,248,255,${(st.clearFlash * 0.14).toFixed(3)})`;
      ctx.fillRect(0, 0, VW, VH);
    }
    if (st.hitFlash > 0) {
      const hg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.22, VW / 2, VH / 2, VH * 0.85);
      hg.addColorStop(0, 'rgba(255,60,30,0)');
      hg.addColorStop(1, `rgba(255,70,40,${(st.hitFlash * 0.44).toFixed(3)})`);
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, VW, VH);
    }

    /* 8. 爆速マイル深度計＆進行バー */
    drawTunnelHud(dive, st);

    ctx.restore();
  }

  /** 隙間がはっきり見える立体岩盤ゲート（穴の半径も PROJ_X / PROJ_Y と完全一致）。 */
  function drawGate(item, z, alpha, vx, vy, th) {
    const gap = project(item.gapX, item.gapY, z, vx, vy);
    const gapRx = item.gapR * PROJ_X * gap.scale;
    const gapRy = item.gapR * PROJ_Y * gap.scale;
    const outer = project(0, 0, z, vx, vy);
    const outerRx = 278 * outer.scale;
    const outerRy = 182 * outer.scale;
    const [wr, wg, wb] = th.wallCol;
    const [rr, rg, rb] = th.wallRim;
    const cleared = item.result === 'clear';

    ctx.save();
    ctx.globalAlpha = alpha * (item.resolved ? 0.42 : 0.94);

    // 外輪（ギザギザ岩盤）から「隙間の楕円」をくり抜く
    ctx.beginPath();
    const sides = 16;
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * TAU;
      const jag = 1.15 + 0.08 * Math.sin(k * 3.3 + item.at * 20);
      const px = outer.x + Math.cos(a) * outerRx * jag;
      const py = outer.y + Math.sin(a) * outerRy * jag;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.ellipse(gap.x, gap.y, gapRx, gapRy, 0, 0, TAU);
    const rIn = Math.max(2, gapRx * 0.72);
    const rOut = Math.max(rIn + 24, outerRx * 1.35);
    const wgGrad = ctx.createRadialGradient(gap.x, gap.y, rIn, gap.x, gap.y, rOut);
    wgGrad.addColorStop(0, `rgba(${wr + 16},${wg + 26},${wb + 34},0.88)`);
    wgGrad.addColorStop(1, `rgba(${Math.max(2, wr - 8)},${Math.max(4, wg - 8)},${Math.max(8, wb - 8)},0.94)`);
    ctx.fillStyle = wgGrad;
    ctx.fill('evenodd');

    // 隙間の内縁を鮮やかに光らせて「ここを抜ける」を一目で示す
    ctx.strokeStyle = cleared ? 'rgba(155,255,220,0.95)' : `rgba(${rr},${rg},${rb},0.94)`;
    ctx.lineWidth = Math.max(2.2, 4.8 * gap.scale * 0.42);
    ctx.beginPath();
    ctx.ellipse(gap.x, gap.y, gapRx, gapRy, 0, 0, TAU);
    ctx.stroke();

    // 隙間の四隅ガイドティック
    ctx.strokeStyle = cleared ? 'rgba(210,255,235,0.9)' : 'rgba(225,250,255,0.82)';
    ctx.lineWidth = Math.max(1.6, 2.5 * gap.scale * 0.4);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI * 0.5 + Math.PI * 0.25;
      ctx.beginPath();
      ctx.moveTo(gap.x + Math.cos(a) * gapRx * 0.87, gap.y + Math.sin(a) * gapRy * 0.87);
      ctx.lineTo(gap.x + Math.cos(a) * gapRx * 1.05, gap.y + Math.sin(a) * gapRy * 1.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** くぐると加速するスリップストリームリング（当たり半径 r と完全一致）。 */
  function drawBoostRing(item, z, alpha, vx, vy, th, t) {
    const p = project(item.x, item.y, z, vx, vy);
    const rx = item.r * PROJ_X * p.scale;
    const ry = item.r * PROJ_Y * p.scale;
    const [br, bg, bb] = th.boostCol;
    const pulse = 0.85 + 0.15 * Math.sin(t * 9 + z * 8);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (item.resolved ? 0.30 : 0.96);
    ctx.strokeStyle = `rgba(${br},${bg},${bb},${(0.90 * pulse).toFixed(3)})`;
    ctx.lineWidth = Math.max(2.8, 6.2 * p.scale * 0.42);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(1.2, 2.2 * p.scale * 0.4);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * 0.84, ry * 0.84, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /** 自艇リアビュー（project(st.px, st.py, TUNNEL_PLAYER_Z) に描くため見た目＝当たりが完全一致）。 */
  function drawPlayerRear(st, vanishX, vanishY, shieldOn, t) {
    const pos = project(st.px, st.py, TUNNEL_PLAYER_Z, vanishX, vanishY);
    const sx = pos.x;
    const sy = pos.y;

    // 1) 奥へ伸びるツインサーチライト
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      const lx = sx + side * 32;
      const ly = sy - 8;
      const tx = vanishX + (sx - vanishX) * 0.22 + side * 46;
      const ty = vanishY + (sy - vanishY) * 0.22;
      const lg = ctx.createLinearGradient(lx, ly, tx, ty);
      lg.addColorStop(0, st.boostT > 0 ? 'rgba(175,252,255,0.36)' : 'rgba(230,248,255,0.24)');
      lg.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(lx - 7, ly);
      ctx.lineTo(lx + 7, ly);
      ctx.lineTo(tx + 40, ty);
      ctx.lineTo(tx - 40, ty);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 2) 潜水艇リア本体（ロール＆チルトで生き生きと傾く）
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(st.roll);
    ctx.scale(0.92, 0.92 * (1 - Math.abs(st.pitch) * 0.14));

    // 左右ダイブフィン（安定翼）
    ctx.fillStyle = '#334856';
    ctx.strokeStyle = '#7db5cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-42, 4); ctx.lineTo(-90, 16); ctx.lineTo(-82, 28); ctx.lineTo(-36, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(42, 4); ctx.lineTo(90, 16); ctx.lineTo(82, 28); ctx.lineTo(36, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 背びれ（司令塔の後ろ姿）
    ctx.fillStyle = '#2a3d4a';
    ctx.beginPath();
    ctx.moveTo(-14, -22); ctx.lineTo(-9, -44); ctx.lineTo(9, -44); ctx.lineTo(14, -22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 耐圧船体リア
    const hullGrad = ctx.createRadialGradient(-10, -14, 6, 0, 4, 52);
    hullGrad.addColorStop(0, '#7294a6');
    hullGrad.addColorStop(0.55, '#3b5362');
    hullGrad.addColorStop(1, '#182630');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 46, 33, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#92cce0';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 船尾の推進シュラウド
    ctx.fillStyle = '#13202a';
    ctx.strokeStyle = '#d8a65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 8, 21, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 高速回転するスクリュープロペラ
    const spin = t * (st.boostT > 0 ? 34 : 20);
    ctx.save();
    ctx.translate(0, 8);
    ctx.rotate(spin);
    ctx.fillStyle = '#d9b574';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, -10, 4.5, 10, 0.25, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fff0c8';
    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
    ctx.restore();

    // 推進水流ジェット＆ブーストグロー
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const jetR = st.boostT > 0 ? 54 : 32;
    const jg = ctx.createRadialGradient(0, 12, 3, 0, 16, jetR);
    jg.addColorStop(0, st.boostT > 0 ? 'rgba(180,255,244,0.85)' : 'rgba(130,228,255,0.55)');
    jg.addColorStop(0.5, st.boostT > 0 ? 'rgba(92,232,255,0.38)' : 'rgba(72,188,235,0.18)');
    jg.addColorStop(1, 'rgba(40,140,200,0)');
    ctx.fillStyle = jg;
    ctx.beginPath(); ctx.arc(0, 14, jetR, 0, TAU); ctx.fill();

    // 左右翼端ポジションランプ
    ctx.fillStyle = 'rgba(255,140,95,0.9)';
    ctx.beginPath(); ctx.arc(-82, 21, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,255,195,0.9)';
    ctx.beginPath(); ctx.arc(82, 21, 3.6, 0, TAU); ctx.fill();

    // バリア展開中の電磁フィールド球
    if (shieldOn) {
      const bg = ctx.createRadialGradient(0, 0, 32, 0, 0, 74);
      bg.addColorStop(0, 'rgba(120,235,255,0.05)');
      bg.addColorStop(0.75, 'rgba(130,240,255,0.28)');
      bg.addColorStop(1, 'rgba(180,252,255,0.65)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(0, 2, 74, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  /** 爆速カウントアップ・マイル深度計＆進行バー（等幅デジタル計器風）。 */
  function drawTunnelHud(dive, st) {
    const wy = dive.currentWorldY();
    const meters = depthMetersAt(wy);
    const miles = meters / METERS_PER_MILE;
    const depthKmStr = formatDepthDisplay(wy);

    const eps = 0.008;
    const yNext = st.theme.startY + (st.theme.endY - st.theme.startY) * clamp(st.progress + eps, 0, 1);
    const yPrev = st.theme.startY + (st.theme.endY - st.theme.startY) * clamp(st.progress - eps, 0, 1);
    const dmPerProg = Math.abs(depthMetersAt(yNext) - depthMetersAt(yPrev)) / (2 * eps);
    const miPerSec = (dmPerProg / METERS_PER_MILE) * (st.speed / st.theme.duration);

    const boost = st.boostT > 0;
    const dirArrow = st.theme.dir > 0 ? '▼' : '▲';
    const miStr = miles.toFixed(2).padStart(6, ' ');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = VW * 0.5;
    const by = VH - 50;

    // 進行バー
    const barW = 340;
    ctx.fillStyle = 'rgba(6,20,32,0.74)';
    ctx.fillRect(cx - barW * 0.5, by + 20, barW, 8);
    ctx.fillStyle = boost ? '#9affdf' : '#6ee2ff';
    ctx.fillRect(cx - barW * 0.5, by + 20, barW * st.progress, 8);
    ctx.strokeStyle = 'rgba(160,232,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - barW * 0.5, by + 20, barW, 8);

    // メイン：爆速カウントアップするマイル表示
    const pulseScale = boost ? (1.06 + 0.04 * Math.sin(st.time * 24)) : 1.0;
    ctx.save();
    ctx.translate(cx, by - 8);
    ctx.scale(pulseScale, pulseScale);
    ctx.font = 'bold 34px Consolas,"SFMono-Regular","Yu Gothic UI",monospace';
    ctx.fillStyle = boost ? '#b8fff0' : '#f2fbff';
    ctx.shadowColor = boost ? 'rgba(110,255,220,0.85)' : 'rgba(92,224,255,0.65)';
    ctx.shadowBlur = boost ? 16 : 9;
    ctx.fillText(`${miStr} mi`, 0, 0);
    ctx.restore();

    // サブ行：瞬間マイル速度＋キロ換算＋ブースト表示
    ctx.font = 'bold 14px Consolas,"Yu Gothic UI",monospace';
    ctx.fillStyle = boost ? '#ffe99c' : 'rgba(176,232,250,0.88)';
    const spdStr = `${dirArrow} ${miPerSec.toFixed(1)} mi/s  |  ${depthKmStr}${boost ? '  ⚡ BOOST' : ''}`;
    ctx.fillText(spdStr, cx, by - 36);

    if (st.time < 2.6) {
      ctx.globalAlpha = clamp(1 - Math.max(0, st.time - 1.8) / 0.8, 0, 1) * 0.88;
      ctx.font = 'bold 16px "Yu Gothic UI","Hiragino Sans",sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('スティック／WASD で隙間を抜けろ！', cx, VH * 0.76);
    }
    ctx.restore();
  }

  return { render };
}
