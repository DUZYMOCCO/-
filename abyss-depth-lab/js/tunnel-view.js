/**
 * ABYSS DIVE — スターフォックス風 背後視点・高速トンネルコースター描画（1280×720 Canvas2D）
 *
 * 責務:
 *   - うねる深海海流トンネルの擬似 3D 遠近レンダリング（岩盤チューブ＋加速リング＋隙間ゲート）
 *   - 画面手前下での潜水艇リアビュー（ロール・チルト連動、回転スクリュー、水流ジェット、2本サーチライト）
 *   - リアルタイム深度計（m → km）と最小限のアトラクション HUD（ノンストップ無線は上位の game.js が重ねる）
 */

import { depthMetersAt, formatDepthDisplay } from './world-biomes.js?v=3';

const TAU = Math.PI * 2;
const METERS_PER_MILE = 1609.344;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createTunnelView(opts) {
  const ctx = opts.ctx;
  const VW = opts.VW || 1280;
  const VH = opts.VH || 720;

  /**
   * 正規化トンネル空間 (nx, ny, depthZ: 0=手前..1=最奥) → 画面座標投影。
   * depthZ が小さいほど大きく外へ広がる遠近法。
   */
  function project(nx, ny, depthZ, vanishX, vanishY) {
    const z = clamp(depthZ, 0.02, 1.25);
    const scale = 1 / (0.14 + z * 1.65);
    return {
      x: vanishX + nx * 245 * scale,
      y: vanishY + ny * 150 * scale,
      scale,
    };
  }

  function render(dive, shieldOn) {
    if (!dive) return;
    const st = dive.state();
    const th = st.theme;
    const t = st.time;
    const cur = dive.curveAt(st.progress);

    // 画面揺れ＆自艇位置に応じた軽いカメラ追従
    const shakeX = st.shake > 0 ? Math.sin(t * 62) * 14 * st.shake : 0;
    const shakeY = st.shake > 0 ? Math.cos(t * 53) * 10 * st.shake : 0;
    const vanishX = VW * 0.5 + cur.cx * VW * 0.34 - st.px * 82 + shakeX;
    const vanishY = VH * 0.44 + cur.cy * VH * 0.28 - st.py * 52 + shakeY;

    ctx.save();

    /* 1. 背景グラデーション */
    const bg = ctx.createLinearGradient(0, 0, 0, VH);
    bg.addColorStop(0, th.bgTop);
    bg.addColorStop(1, th.bgBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VW, VH);

    /* 2. 消失点（出口の楽園光／ブラックホール光） */
    const exitGrow = 0.35 + st.progress * 0.95;
    const exitR = (130 + st.progress * 260) * (st.boostT > 0 ? 1.15 : 1.0);
    const [er, eg, eb] = th.exitCol;
    const [gr, gg, gb] = th.exitGold;
    const egd = ctx.createRadialGradient(vanishX, vanishY, 6, vanishX, vanishY, exitR);
    egd.addColorStop(0, `rgba(255,255,255,${(0.45 + 0.45 * st.progress).toFixed(3)})`);
    egd.addColorStop(0.28, `rgba(${gr},${gg},${gb},${(0.36 * exitGrow).toFixed(3)})`);
    egd.addColorStop(0.62, `rgba(${er},${eg},${eb},${(0.22 * exitGrow).toFixed(3)})`);
    egd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = egd;
    ctx.beginPath(); ctx.arc(vanishX, vanishY, exitR, 0, TAU); ctx.fill();

    /* 3. 擬似 3D トンネルリング（奥→手前へ流れる海流チューブ） */
    const ringCount = 24;
    const scroll = (t * 2.4 * st.speed + st.progress * 18) % 1;
    const [rr, rg, rb] = th.ringCol;
    const [wr, wg, wb] = th.wallRim;
    for (let i = ringCount - 1; i >= 0; i--) {
      const z = (i + (1 - scroll)) / ringCount;
      const ahead = dive.curveAt(st.progress + z * 0.16);
      const cx = vanishX + (ahead.cx - cur.cx) * VW * 0.45 * (1 - z);
      const cy = vanishY + (ahead.cy - cur.cy) * VH * 0.36 * (1 - z);
      const p = project(0, 0, z, cx, cy);
      const rx = 250 * p.scale;
      const ry = 158 * p.scale;
      const fade = Math.sin(clamp(1 - z, 0, 1) * Math.PI * 0.85);
      const alpha = fade * (0.14 + (i % 3 === 0 ? 0.22 : 0.08));

      // 岩盤チューブの多角形シルエット
      ctx.strokeStyle = i % 2 === 0
        ? `rgba(${rr},${rg},${rb},${alpha.toFixed(3)})`
        : `rgba(${wr},${wg},${wb},${(alpha * 0.85).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.2, 2.8 * p.scale * 0.38);
      ctx.beginPath();
      const sides = 10;
      const rot = z * 1.4 + t * 0.25 * th.dir;
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * TAU + rot;
        const jag = 1 + 0.06 * Math.sin(k * 3.1 + i * 1.7);
        const vx = cx + Math.cos(a) * rx * jag;
        const vy = cy + Math.sin(a) * ry * jag;
        if (k === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }

    /* 4. 放射状スピードライン＆泡ストリーク */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const streakCount = st.boostT > 0 ? 44 : 28;
    for (let i = 0; i < streakCount; i++) {
      const ang = (i * 2.39996 + Math.floor(t * 2) * 0.01) % TAU;
      const ph = ((t * (1.5 + (i % 5) * 0.22) * st.speed + i * 0.173) % 1);
      const r0 = 36 + ph * ph * 680;
      const r1 = r0 + (40 + ph * 150) * (st.boostT > 0 ? 1.45 : 1.0);
      const a = Math.sin(ph * Math.PI) * (st.boostT > 0 ? 0.55 : 0.34);
      ctx.strokeStyle = `rgba(${rr},${rg},${rb},${a.toFixed(3)})`;
      ctx.lineWidth = 1.5 + ph * 2.4;
      ctx.beginPath();
      ctx.moveTo(vanishX + Math.cos(ang) * r0, vanishY + Math.sin(ang) * r0 * 0.68);
      ctx.lineTo(vanishX + Math.cos(ang) * r1, vanishY + Math.sin(ang) * r1 * 0.68);
      ctx.stroke();
    }
    ctx.restore();

    /* 5. コース障害ゲート（隙間を抜ける）＆加速リング（奥→手前へソート描画） */
    const visibleWindow = 0.28;
    const drawList = [];
    for (const item of st.course) {
      const dz = item.at - st.progress;
      if (dz < -0.025 || dz > visibleWindow) continue;
      drawList.push({ item, z: Math.max(0.015, dz / visibleWindow) });
    }
    drawList.sort((a, b) => b.z - a.z);

    for (const entry of drawList) {
      const { item, z } = entry;
      const alpha = clamp((1 - z) * 1.45, 0.08, 1);
      if (item.kind === 'gate') {
        drawGate(item, z, alpha, vanishX, vanishY, th);
      } else if (item.kind === 'ring') {
        drawBoostRing(item, z, alpha, vanishX, vanishY, th, t);
      }
    }

    /* 6. 自艇リアビュー（スターフォックス風：左スティックでロール＆チルト） */
    drawPlayerRear(st, vanishX, vanishY, shieldOn, t);

    /* 7. ブースト＆かすりフラッシュ */
    if (st.clearFlash > 0) {
      ctx.fillStyle = `rgba(160,248,255,${(st.clearFlash * 0.16).toFixed(3)})`;
      ctx.fillRect(0, 0, VW, VH);
    }
    if (st.hitFlash > 0) {
      const hg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.85);
      hg.addColorStop(0, 'rgba(255,60,30,0)');
      hg.addColorStop(1, `rgba(255,70,40,${(st.hitFlash * 0.45).toFixed(3)})`);
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, VW, VH);
    }

    /* 8. ミニマル・コースター HUD（リアルタイム深度計＋進行バー） */
    drawTunnelHud(dive, st);

    ctx.restore();
  }

  /** 隙間がはっきり見える岩盤ゲート。 */
  function drawGate(item, z, alpha, vx, vy, th) {
    const gap = project(item.gapX, item.gapY, z, vx, vy);
    const gapRx = item.gapR * 230 * gap.scale;
    const gapRy = item.gapR * 145 * gap.scale;
    const outer = project(0, 0, z, vx, vy);
    const outerRx = 270 * outer.scale;
    const outerRy = 175 * outer.scale;
    const [wr, wg, wb] = th.wallCol;
    const [rr, rg, rb] = th.wallRim;

    ctx.save();
    ctx.globalAlpha = alpha * (item.resolved ? 0.35 : 0.92);

    // 外輪から「隙間（円形穴）」をくり抜いた岩盤アーチ（evenodd でくっきり抜く）
    ctx.beginPath();
    ctx.ellipse(outer.x, outer.y, outerRx * 1.18, outerRy * 1.18, 0, 0, TAU);
    ctx.ellipse(gap.x, gap.y, gapRx, gapRy, 0, 0, TAU);
    ctx.fillStyle = `rgba(${wr},${wg},${wb},0.82)`;
    ctx.fill('evenodd');

    // 隙間の内縁を明るく光らせて「ここを抜けろ！」を直感的に誘導
    ctx.strokeStyle = `rgba(${rr},${rg},${rb},0.92)`;
    ctx.lineWidth = Math.max(2, 4.5 * gap.scale * 0.42);
    ctx.beginPath();
    ctx.ellipse(gap.x, gap.y, gapRx, gapRy, 0, 0, TAU);
    ctx.stroke();

    // 隙間の四隅に小さな誘導ティック
    ctx.strokeStyle = 'rgba(220,250,255,0.75)';
    ctx.lineWidth = Math.max(1.5, 2.4 * gap.scale * 0.4);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI * 0.5 + Math.PI * 0.25;
      ctx.beginPath();
      ctx.moveTo(gap.x + Math.cos(a) * gapRx * 0.88, gap.y + Math.sin(a) * gapRy * 0.88);
      ctx.lineTo(gap.x + Math.cos(a) * gapRx * 1.04, gap.y + Math.sin(a) * gapRy * 1.04);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** くぐると加速するスリップストリームリング。 */
  function drawBoostRing(item, z, alpha, vx, vy, th, t) {
    const p = project(item.x, item.y, z, vx, vy);
    const rx = item.r * 210 * p.scale;
    const ry = item.r * 138 * p.scale;
    const [br, bg, bb] = th.boostCol;
    const pulse = 0.85 + 0.15 * Math.sin(t * 9 + z * 8);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (item.resolved ? 0.25 : 0.95);
    ctx.strokeStyle = `rgba(${br},${bg},${bb},${(0.88 * pulse).toFixed(3)})`;
    ctx.lineWidth = Math.max(2.5, 6.0 * p.scale * 0.42);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1.2, 2.2 * p.scale * 0.4);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * 0.84, ry * 0.84, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /** 画面手前下の潜水艇リアビュー（スクリュー・安定翼・ツインサーチライト）。 */
  function drawPlayerRear(st, vanishX, vanishY, shieldOn, t) {
    const sx = VW * 0.5 + st.px * 390;
    const sy = VH * 0.62 + st.py * 210;

    // 1) 奥へ伸びるツインサーチライト（自艇から消失点方向へ）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      const lx = sx + side * 34;
      const ly = sy - 8;
      const tx = vanishX + (sx - VW * 0.5) * 0.25 + side * 52;
      const ty = vanishY + (sy - VH * 0.5) * 0.25;
      const lg = ctx.createLinearGradient(lx, ly, tx, ty);
      lg.addColorStop(0, st.boostT > 0 ? 'rgba(175,252,255,0.34)' : 'rgba(230,248,255,0.24)');
      lg.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(lx - 8, ly);
      ctx.lineTo(lx + 8, ly);
      ctx.lineTo(tx + 44, ty);
      ctx.lineTo(tx - 44, ty);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 2) 潜水艇リア本体（ロール＆チルトで生き生きと傾く）
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(st.roll);
    ctx.scale(1, 1 - Math.abs(st.pitch) * 0.14);

    // 左右ダイブフィン（安定翼）
    ctx.fillStyle = '#334856';
    ctx.strokeStyle = '#7db5cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-42, 4); ctx.lineTo(-92, 16); ctx.lineTo(-84, 28); ctx.lineTo(-36, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(42, 4); ctx.lineTo(92, 16); ctx.lineTo(84, 28); ctx.lineTo(36, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 背びれ（セイル・司令塔の後ろ姿）
    ctx.fillStyle = '#2a3d4a';
    ctx.beginPath();
    ctx.moveTo(-14, -22); ctx.lineTo(-9, -46); ctx.lineTo(9, -46); ctx.lineTo(14, -22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 耐圧船体リア（重厚な円筒ボディ＋リベット光沢）
    const hullGrad = ctx.createRadialGradient(-10, -14, 6, 0, 4, 52);
    hullGrad.addColorStop(0, '#7294a6');
    hullGrad.addColorStop(0.55, '#3b5362');
    hullGrad.addColorStop(1, '#182630');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 48, 34, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#92cce0';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 船尾の推進シュラウド（ダクトリング）
    ctx.fillStyle = '#13202a';
    ctx.strokeStyle = '#d8a65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 8, 22, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 高速回転するスクリュープロペラ（4枚羽根）
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

    // 左右翼端のポジションランプ
    ctx.fillStyle = 'rgba(255,140,95,0.9)';
    ctx.beginPath(); ctx.arc(-84, 21, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,255,195,0.9)';
    ctx.beginPath(); ctx.arc(84, 21, 3.6, 0, TAU); ctx.fill();

    // バリア展開中の青白い電磁フィールド球
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

    // 瞬間潜航速度（マイル/秒）を現在進行度付近の勾配から算出
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

    // 下部中央（上部中央はノンストップ無線会話が使うため干渉させない）
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

    // メイン：爆速カウントアップするマイル表示（等幅でブレずに超高速回転）
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

    // サブ行：瞬間マイル速度＋メートル/キロ換算＋ブースト表示
    ctx.font = 'bold 14px Consolas,"Yu Gothic UI",monospace';
    ctx.fillStyle = boost ? '#ffe99c' : 'rgba(176,232,250,0.88)';
    const spdStr = `${dirArrow} ${miPerSec.toFixed(1)} mi/s  |  ${depthKmStr}${boost ? '  ⚡ BOOST' : ''}`;
    ctx.fillText(spdStr, cx, by - 36);

    // 開始直後の 2.6 秒だけ控えめな操作ヒント
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
