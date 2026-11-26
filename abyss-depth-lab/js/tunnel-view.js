/**
 * ABYSS DIVE — スターフォックス風 背後視点・深海大海溝コースター描画（v3.15.0 立体海溝チューブ版）
 *
 * 刷新ポイント（v3.15.0）:
 *   1. ワイヤーフレームの「輪っか」を完全廃止し、奥→手前へ連続する立体ポリゴン面（玄武岩の崖・天井・海底）
 *      を1面ずつ法線シェーディング＋水中フォグで塗りつぶす実体のある海底大洞窟トンネルを構築。
 *   2. 「丸い穴あきフレーム板」を廃止し、左右から張り出す巨大な岩壁・天井からの鍾乳石・海底からの岩峰を
 *      立体シルエット＋実アセット（cliff_spire / cave_stalactite / hall_giant_kelp / volcanic_vent）で描画し、
 *      そのあいだの「自然な渓谷の隙間」をサーチライトで照らしながら抜ける没入感を実現。
 *   3. 進行度（0→1）に応じて景色が劇的に遷移：
 *      前半＝暗い玄武岩の大海溝 → 中盤＝地熱の亀裂・熱水脈 → 終盤＝青白＆黄金に輝く発光深淵の楽園へ！
 *   4. スクリューから螺旋状に千切れて飛ぶキャビテーション泡、深海マリンスノー、光のカーテンで水中感を強化。
 */

import { depthMetersAt, formatDepthDisplay } from './world-biomes.js?v=3';

const TAU = Math.PI * 2;
const METERS_PER_MILE = 1609.344;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** 自艇が位置する正規化深度プレーン（当たり判定と 100% 一致）。 */
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

function mixRgb(c0, c1, t) {
  const u = clamp(t, 0, 1);
  return [
    Math.round(lerp(c0[0], c1[0], u)),
    Math.round(lerp(c0[1], c1[1], u)),
    Math.round(lerp(c0[2], c1[2], u)),
  ];
}

export function createTunnelView(opts) {
  const ctx = opts.ctx;
  const VW = opts.VW || 1280;
  const VH = opts.VH || 720;

  // 既存の高精細深海アートを岩壁・岩柱・発光海草・クラゲとして立体配置
  const art = {
    kelp: loadOptImg('hall_giant_kelp.webp'),
    vent: loadOptImg('volcanic_vent.webp'),
    spire: loadOptImg('cliff_spire.webp'),
    overhang: loadOptImg('cliff_overhang.webp'),
    stalactite: loadOptImg('cave_stalactite.webp'),
    jelly: loadOptImg('creature_jelly.webp'),
    coral: loadOptImg('flora_coral_cyan.webp'),
  };

  /** 正規化トンネル空間 (nx, ny, depthZ) → 画面座標投影（自艇・岩柱・海流リング共通）。 */
  function project(nx, ny, depthZ, vanishX, vanishY) {
    const z = clamp(depthZ, 0.02, 1.35);
    const scale = 1 / (0.14 + z * 1.65);
    return {
      x: vanishX + nx * PROJ_X * scale,
      y: vanishY + ny * PROJ_Y * scale,
      scale,
    };
  }

  /** 進行度に応じた環境パレット（前半: 暗い玄武岩海溝 → 中盤: 地熱脈 → 終盤: 蒼金の楽園）。 */
  function samplePalette(th, prog) {
    if (th.id === 'corridor_up') {
      return {
        fog: mixRgb([14, 46, 72], [12, 62, 86], prog),
        wallDark: mixRgb([9, 20, 30], [10, 26, 38], prog),
        wallLit: mixRgb([34, 72, 92], [44, 108, 128], prog),
        vein: mixRgb([255, 208, 118], [120, 236, 255], prog),
        stream: mixRgb([255, 214, 128], [130, 240, 255], prog),
      };
    }
    if (th.id === 'blackhole') {
      return {
        fog: mixRgb([12, 8, 28], [26, 14, 42], prog),
        wallDark: [8, 6, 18],
        wallLit: [52, 34, 88],
        vein: [198, 154, 255],
        stream: [255, 210, 140],
      };
    }
    // corridor_down: 海溝の岩壁 → 地熱帯の裂け目 → マントル楽園の蒼金光
    const mid = clamp((prog - 0.15) / 0.45, 0, 1);
    const end = clamp((prog - 0.55) / 0.45, 0, 1);
    const fog0 = mixRgb([6, 24, 40], [28, 18, 22], mid);
    const fog = mixRgb(fog0, [14, 54, 82], end);
    const wDark0 = mixRgb([6, 14, 22], [16, 10, 12], mid);
    const wallDark = mixRgb(wDark0, [10, 28, 42], end);
    const wLit0 = mixRgb([22, 54, 76], [74, 34, 24], mid);
    const wallLit = mixRgb(wLit0, [48, 118, 138], end);
    const vein0 = mixRgb([76, 198, 236], [255, 132, 64], mid);
    const vein = mixRgb(vein0, [160, 246, 255], end);
    const stream = mixRgb([108, 232, 255], [255, 230, 148], end * 0.65);
    return { fog, wallDark, wallLit, vein, stream };
  }

  /** トンネル断面リングの頂点配列（12角形の自然な岩洞断面、左右がやや狭く上下に凹凸）。 */
  function ringVertices(z, segIdx, cx, cy, pScale, thDir) {
    const sides = 12;
    const rx = 270 * pScale;
    const ry = 178 * pScale;
    const pts = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * TAU;
      // 岩肌の自然な凹凸（セグメント番号に紐づくため奥から手前へ岩の形がそのまま迫ってくる！）
      const n1 = Math.sin(k * 2.3 + segIdx * 1.15) * 0.11;
      const n2 = Math.cos(k * 4.1 - segIdx * 0.73 * thDir) * 0.06;
      const rMul = 1.0 + n1 + n2;
      pts.push({
        x: cx + Math.cos(a) * rx * rMul,
        y: cy + Math.sin(a) * ry * rMul,
        a,
      });
    }
    return pts;
  }

  function render(dive, shieldOn) {
    if (!dive) return;
    const st = dive.state();
    const th = st.theme;
    const t = st.time;
    const cur = dive.curveAt(st.progress);
    const pal = samplePalette(th, st.progress);

    const shakeX = st.shake > 0 ? Math.sin(t * 62) * 14 * st.shake : 0;
    const shakeY = st.shake > 0 ? Math.cos(t * 53) * 10 * st.shake : 0;
    const vanishX = VW * 0.5 + cur.cx * VW * 0.24 - st.px * 48 + shakeX;
    const vanishY = VH * 0.49 + cur.cy * VH * 0.20 - st.py * 34 + shakeY;

    ctx.save();

    const isBH = th.id === 'blackhole';

    if (isBH) {
      /* 1〜4 (ブラックホール専用): 漆黒の宇宙・星々・重力レンズで湾曲する光環・美しく巨大な降着円盤 */
      drawBlackHoleSpace(st, vanishX, vanishY, t);
    } else {
      /* 1. 深淵の水中背景（奥のフォグ色） */
      const [fr, fg, fb] = pal.fog;
      ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
      ctx.fillRect(0, 0, VW, VH);

      /* 2. 最奥の水中出口光（白飛びさせず神秘的な蒼金の深海光） */
      const exitR = 135 + st.progress * 145;
      const [er, eg, eb] = th.exitCol;
      const [gr, gg, gb] = th.exitGold;
      const egd = ctx.createRadialGradient(vanishX, vanishY, 6, vanishX, vanishY, exitR);
      egd.addColorStop(0, `rgba(230,252,255,${(0.32 + 0.24 * st.progress).toFixed(3)})`);
      egd.addColorStop(0.35, `rgba(${gr},${gg},${gb},${(0.28 + 0.16 * st.progress).toFixed(3)})`);
      egd.addColorStop(0.72, `rgba(${er},${eg},${eb},0.14)`);
      egd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = egd;
      ctx.beginPath(); ctx.arc(vanishX, vanishY, exitR, 0, TAU); ctx.fill();

      /* 3. 実体のある立体・深海大洞窟チューブ（連続する岩盤クワッドを奥→手前へ塗りつぶし！） */
      const segCount = 18;
      const rawPhase = t * 2.5 * st.speed + st.progress * 22;
      const baseIdx = Math.floor(rawPhase);
      const frac = rawPhase - baseIdx;

      const rings = [];
      for (let i = 0; i <= segCount; i++) {
        const z = Math.max(0.02, (i - frac) / segCount);
        const ahead = dive.curveAt(st.progress + z * 0.15);
        const cx = vanishX + (ahead.cx - cur.cx) * VW * 0.36 * (1 - z);
        const cy = vanishY + (ahead.cy - cur.cy) * VH * 0.28 * (1 - z);
        const p = project(0, 0, z, cx, cy);
        rings.push({
          z, cx, cy, scale: p.scale, segIdx: baseIdx + i,
          pts: ringVertices(z, baseIdx + i, cx, cy, p.scale, th.dir),
        });
      }

      const [vr, vg, vb] = pal.vein;
      for (let i = segCount - 1; i >= 0; i--) {
        const farR = rings[i + 1];
        const nearR = rings[i];
        if (nearR.z <= 0.025) continue;

        const fogT = clamp(Math.pow(farR.z, 0.85), 0.08, 0.96);
        const sides = farR.pts.length;
        const bandShade = (farR.segIdx & 1) ? 1.0 : 0.82;

        for (let k = 0; k < sides; k++) {
          const k2 = (k + 1) % sides;
          const aMid = (farR.pts[k].a + Math.PI / sides);
          const lit = clamp(0.45 + 0.38 * Math.sin(aMid) + 0.18 * Math.cos(aMid * 2 + farR.segIdx), 0, 1) * bandShade;
          const rock = mixRgb(pal.wallDark, pal.wallLit, lit);
          const col = mixRgb(rock, pal.fog, fogT);

          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
          ctx.beginPath();
          ctx.moveTo(farR.pts[k].x, farR.pts[k].y);
          ctx.lineTo(farR.pts[k2].x, farR.pts[k2].y);
          ctx.lineTo(nearR.pts[k2].x, nearR.pts[k2].y);
          ctx.lineTo(nearR.pts[k].x, nearR.pts[k].y);
          ctx.closePath();
          ctx.fill();

          if (((farR.segIdx + k * 3) % 7) === 0 && fogT < 0.82) {
            ctx.strokeStyle = `rgba(${vr},${vg},${vb},${((1 - fogT) * 0.42).toFixed(3)})`;
            ctx.lineWidth = Math.max(1.2, 3.2 * nearR.scale * 0.34);
            ctx.beginPath();
            ctx.moveTo(farR.pts[k].x, farR.pts[k].y);
            ctx.lineTo(nearR.pts[k].x, nearR.pts[k].y);
            ctx.stroke();
          }
        }

        if ((farR.segIdx % 2) === 0 && farR.z > 0.14 && farR.z < 0.90) {
          const slot = ((farR.segIdx * 5) % sides + sides) % sides;
          const anchor = farR.pts[slot];
          const sideAng = anchor.a;
          const alpha = clamp((1 - farR.z) * 1.15, 0, 0.72);
          let propImg = art.spire;
          if (st.progress > 0.55 || th.id === 'corridor_up') {
            propImg = (slot % 3 === 0) ? art.kelp : ((slot % 3 === 1) ? art.coral : art.jelly);
          } else if (st.progress > 0.22 && (slot % 2 === 0)) {
            propImg = art.vent;
          } else if (Math.sin(sideAng) < -0.35) {
            propImg = art.stalactite;
          }
          if (imgReady(propImg)) {
            const pw = (propImg === art.jelly ? 76 : 165) * farR.scale * 0.55;
            const ph = pw * (propImg.naturalHeight / propImg.naturalWidth);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(anchor.x, anchor.y);
            ctx.drawImage(propImg, -pw * 0.5, -ph * 0.5, pw, ph);
            ctx.restore();
          }
        }
      }

      /* 4. 水中の光筋（海流のうねりリボン＋高速マリンスノー泡） */
      const [sr, sg, sb] = pal.stream;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        for (let k = 0; k <= 24; k++) {
          const z = 0.08 + (k / 24) * 0.90;
          const a = s * (TAU / 3) + z * 4.6 - t * 3.8 * st.speed * th.dir;
          const p = project(Math.cos(a) * 0.96, Math.sin(a) * 0.88, z, vanishX, vanishY);
          if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(${sr},${sg},${sb},${st.boostT > 0 ? 0.24 : 0.12})`;
        ctx.lineWidth = st.boostT > 0 ? 4.2 : 2.2;
        ctx.stroke();
      }

      const bubbleCount = st.boostT > 0 ? 48 : 32;
      for (let i = 0; i < bubbleCount; i++) {
        const ang = (i * 2.39996) % TAU;
        const ph = ((t * (1.35 + (i % 5) * 0.24) * st.speed + i * 0.173) % 1);
        const r0 = 26 + ph * ph * 690;
        const r1 = r0 + (26 + ph * 96) * (st.boostT > 0 ? 1.55 : 1.0);
        const a = Math.sin(ph * Math.PI) * (st.boostT > 0 ? 0.52 : 0.30);
        const x0 = vanishX + Math.cos(ang) * r0;
        const y0 = vanishY + Math.sin(ang) * r0 * 0.68;
        const x1 = vanishX + Math.cos(ang) * r1;
        const y1 = vanishY + Math.sin(ang) * r1 * 0.68;
        ctx.strokeStyle = `rgba(195,244,255,${a.toFixed(3)})`;
        ctx.lineWidth = 1.2 + ph * 2.4;
        ctx.beginPath();
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.stroke();
        if (i % 2 === 0) {
          ctx.fillStyle = `rgba(220,250,255,${(a * 0.85).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x1, y1, 1.4 + ph * 3.0, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    /* 5. 自然な岩壁の張り出し（渓谷の隙間）＆海流スリップストリーム（奥→手前へソート） */
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
      const alpha = clamp((1.06 - z) * 1.35, 0.08, 1);
      if (item.kind === 'gate') drawCanyonObstacle(item, z, alpha, vanishX, vanishY, pal);
      else if (item.kind === 'ring') drawSlipstreamRing(item, z, alpha, vanishX, vanishY, pal, t);
    }

    /* 5.5. スターフォックス式・進路予測レティクル（次のゲートと同じ奥行き z に自艇の進路を投影し、体感＝判定を完全一致させる） */
    drawAimReticle(st, behindList, vanishX, vanishY, t);

    /* 6. 自艇リアビュー（サーチライト＋スクリュー螺旋泡＋ロール連動） */
    drawPlayerRear(st, vanishX, vanishY, shieldOn, t);

    /* 通過直後（自艇より手前）の岩壁・水流を後ろへ流し去る */
    for (const { item, z } of frontList) {
      const alpha = clamp((z / TUNNEL_PLAYER_Z) * 0.68, 0, 0.68);
      if (item.kind === 'gate') drawCanyonObstacle(item, z, alpha, vanishX, vanishY, pal);
      else if (item.kind === 'ring') drawSlipstreamRing(item, z, alpha, vanishX, vanishY, pal, t);
    }

    /* 7. ブースト＆かすりフラッシュ */
    if (st.clearFlash > 0) {
      ctx.fillStyle = `rgba(160,248,255,${(st.clearFlash * 0.12).toFixed(3)})`;
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

  /**
   * 3,960 マイル・ブラックホール突入専用描画（美しい事象の地平線＋重力レンズ光環＋黄金＆蒼の降着円盤）。
   */
  function drawBlackHoleSpace(st, vx, vy, t) {
    // 1) 深宇宙グラデーション
    const bg = ctx.createRadialGradient(vx, vy, 30, vx, vy, VW * 0.78);
    bg.addColorStop(0, '#120826');
    bg.addColorStop(0.45, '#050310');
    bg.addColorStop(1, '#010105');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VW, VH);

    // 2) 宇宙空間の星々と青方偏移ストリーク
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const ang = (i * 2.399963) % TAU;
      const ph = ((t * (0.35 + (i % 7) * 0.09) * st.speed + i * 0.137) % 1);
      const r0 = 75 + ph * ph * 760;
      const r1 = r0 + (6 + ph * 44) * (st.boostT > 0 ? 1.6 : 1.0);
      const a = Math.sin(ph * Math.PI) * 0.82;
      const blue = (i % 3 === 0);
      ctx.strokeStyle = blue ? `rgba(148,214,255,${a.toFixed(3)})` : `rgba(255,236,196,${a.toFixed(3)})`;
      ctx.lineWidth = 1.0 + ph * 1.8;
      ctx.beginPath();
      ctx.moveTo(vx + Math.cos(ang) * r0, vy + Math.sin(ang) * r0 * 0.72);
      ctx.lineTo(vx + Math.cos(ang) * r1, vy + Math.sin(ang) * r1 * 0.72);
      ctx.stroke();
    }

    // 3) 迫りくる超大質量ブラックホール（進行度で圧倒的に大きくなる）
    const bhR = 46 + st.progress * 155;

    // 外側の重力レンズ・ハロー（蒼紫〜黄金の柔らかな光暈）
    const halo = ctx.createRadialGradient(vx, vy, bhR * 0.9, vx, vy, bhR * 3.4);
    halo.addColorStop(0, 'rgba(255,226,162,0.52)');
    halo.addColorStop(0.28, 'rgba(255,158,86,0.28)');
    halo.addColorStop(0.60, 'rgba(116,138,255,0.16)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(vx, vy, bhR * 3.4, 0, TAU); ctx.fill();

    // 重力レンズで上側・下側へ湾曲した降着円盤の背面光弧（インターステラー風！）
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(-0.14 + Math.sin(t * 0.35) * 0.04);
    for (const side of [-1, 1]) {
      ctx.strokeStyle = side < 0 ? 'rgba(255,228,172,0.72)' : 'rgba(176,196,255,0.48)';
      ctx.lineWidth = Math.max(4, bhR * 0.16);
      ctx.beginPath();
      ctx.arc(0, side * bhR * 0.08, bhR * 1.18, side < 0 ? Math.PI : 0, side < 0 ? TAU : Math.PI);
      ctx.stroke();
    }
    // 回転する降着円盤（奥側半分）
    const diskRx = bhR * 2.75;
    const diskRy = bhR * 0.56;
    const dg = ctx.createLinearGradient(-diskRx, 0, diskRx, 0);
    dg.addColorStop(0, 'rgba(255,244,210,0.92)');   // 左側：ドップラー増光で眩しく輝く
    dg.addColorStop(0.42, 'rgba(255,176,88,0.68)');
    dg.addColorStop(0.75, 'rgba(180,104,216,0.42)');
    dg.addColorStop(1, 'rgba(110,164,255,0.28)');
    ctx.strokeStyle = dg;
    ctx.lineWidth = Math.max(8, bhR * 0.28);
    ctx.beginPath();
    ctx.ellipse(0, 0, diskRx, diskRy, 0, Math.PI, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // 4) 漆黒の事象の地平線（イベント・ホライズン）＋鋭い光子球リング
    ctx.save();
    ctx.fillStyle = '#000002';
    ctx.beginPath(); ctx.arc(vx, vy, bhR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,244,214,0.92)';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(vx, vy, bhR * 1.02, 0, TAU); ctx.stroke();

    // 降着円盤（手前側半分：事象の地平線の前を横切る！）
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(vx, vy);
    ctx.rotate(-0.14 + Math.sin(t * 0.35) * 0.04);
    const diskRx2 = bhR * 2.85;
    const diskRy2 = bhR * 0.58;
    const dg2 = ctx.createLinearGradient(-diskRx2, 0, diskRx2, 0);
    dg2.addColorStop(0, 'rgba(255,250,224,0.96)');
    dg2.addColorStop(0.38, 'rgba(255,192,102,0.82)');
    dg2.addColorStop(0.72, 'rgba(186,128,255,0.52)');
    dg2.addColorStop(1, 'rgba(128,196,255,0.34)');
    ctx.strokeStyle = dg2;
    ctx.lineWidth = Math.max(7, bhR * 0.24);
    ctx.beginPath();
    ctx.ellipse(0, 0, diskRx2, diskRy2, 0, 0, Math.PI);
    ctx.stroke();

    // 順行（プログレード）軌道の細い黄金流線
    ctx.strokeStyle = 'rgba(255,232,168,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, diskRx2 * 1.24, diskRy2 * 1.24, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 岩盤の張り出し＆鍾乳石アーチ（丸い枠ではなく自然な海溝の岩の隙間！）。
   * 隙間の中心 (gapX, gapY) と半径 (gapR) は判定と 100% 一致する。
   */
  function drawCanyonObstacle(item, z, alpha, vx, vy, pal) {
    const gap = project(item.gapX, item.gapY, z, vx, vy);
    const gapRx = item.gapR * PROJ_X * gap.scale;
    const gapRy = item.gapR * PROJ_Y * gap.scale;
    const outer = project(0, 0, z, vx, vy);
    const outerRx = 310 * outer.scale;
    const outerRy = 205 * outer.scale;
    const fogT = clamp(Math.pow(z, 0.9), 0.05, 0.85);
    const rockBase = mixRgb(pal.wallDark, pal.fog, fogT * 0.75);
    const rockRim = mixRgb(pal.wallLit, pal.vein, 0.45);
    const cleared = item.result === 'clear';

    ctx.save();
    ctx.globalAlpha = alpha * (item.resolved ? 0.36 : 0.96);

    // 外側の岩盤シルエットから、ギザギザした自然な渓谷の開口部をくり抜く（当たり楕円の外側を岩肌にする）
    ctx.beginPath();
    const outSides = 16;
    for (let k = 0; k <= outSides; k++) {
      const a = (k / outSides) * TAU;
      const jag = 1.25 + 0.10 * Math.sin(k * 3.1 + item.at * 27);
      const px = outer.x + Math.cos(a) * outerRx * jag;
      const py = outer.y + Math.sin(a) * outerRy * jag;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // 開口部の岩肌（見た目の穴 ≦ 実際のセーフ判定 gapR+0.08 にして「抜けたのに当たった」を根絶）
    const inSides = 20;
    for (let k = 0; k <= inSides; k++) {
      const a = (k / inSides) * TAU;
      const crag = 0.96 + 0.05 * Math.sin(k * 4.3 + item.at * 19) + 0.03 * Math.cos(k * 7.1);
      const px = gap.x + Math.cos(a) * gapRx * crag;
      const py = gap.y + Math.sin(a) * gapRy * crag;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const rIn = Math.max(2, gapRx * 0.85);
    const rOut = Math.max(rIn + 30, outerRx * 1.45);
    const wgGrad = ctx.createRadialGradient(gap.x, gap.y, rIn, gap.x, gap.y, rOut);
    wgGrad.addColorStop(0, `rgb(${Math.min(255, rockBase[0] + 18)},${Math.min(255, rockBase[1] + 24)},${Math.min(255, rockBase[2] + 30)})`);
    wgGrad.addColorStop(1, `rgb(${Math.max(2, rockBase[0] - 8)},${Math.max(4, rockBase[1] - 8)},${Math.max(8, rockBase[2] - 8)})`);
    ctx.fillStyle = wgGrad;
    ctx.fill('evenodd');

    // 岩の縁にサーチライトと発光苔のリム光（人工的な枠ではなく岩肌の光沢として見せる）
    ctx.strokeStyle = cleared
      ? `rgba(160,255,224,${(0.75 * (1 - fogT * 0.5)).toFixed(3)})`
      : `rgba(${rockRim[0]},${rockRim[1]},${rockRim[2]},${(0.68 * (1 - fogT * 0.4)).toFixed(3)})`;
    ctx.lineWidth = Math.max(2.0, 4.4 * gap.scale * 0.42);
    ctx.beginPath();
    for (let k = 0; k <= inSides; k++) {
      const a = (k / inSides) * TAU;
      const crag = 0.96 + 0.05 * Math.sin(k * 4.3 + item.at * 19) + 0.03 * Math.cos(k * 7.1);
      const px = gap.x + Math.cos(a) * gapRx * crag;
      const py = gap.y + Math.sin(a) * gapRy * crag;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // 隙間の奥をほのかに照らす海流の光霧（視線誘導）
    if (!item.resolved) {
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(gap.x, gap.y, 4, gap.x, gap.y, gapRx * 0.9);
      glow.addColorStop(0, `rgba(${pal.stream[0]},${pal.stream[1]},${pal.stream[2]},0.16)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.ellipse(gap.x, gap.y, gapRx * 0.9, gapRy * 0.9, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /** 自然な水流の渦（スリップストリーム）：くぐると加速＋資源ゲット。 */
  function drawSlipstreamRing(item, z, alpha, vx, vy, pal, t) {
    const p = project(item.x, item.y, z, vx, vy);
    const rx = item.r * PROJ_X * p.scale;
    const ry = item.r * PROJ_Y * p.scale;
    const [sr, sg, sb] = pal.stream;
    const spin = t * 4.5 + z * 6;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (item.resolved ? 0.22 : 0.88);

    // 渦巻く水流の弧（3本の流線アーク）
    for (let i = 0; i < 3; i++) {
      const a0 = spin + i * (TAU / 3);
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.82)`;
      ctx.lineWidth = Math.max(2.4, 5.4 * p.scale * 0.40);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, ry, 0, a0, a0 + 1.35);
      ctx.stroke();
    }
    // 内側の泡リング
    ctx.strokeStyle = 'rgba(230,252,255,0.65)';
    ctx.lineWidth = Math.max(1.2, 2.0 * p.scale * 0.38);
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * 0.82, ry * 0.82, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * スターフォックス式・進路予測レティクル。
   * 次に迫る未通過ゲートと同じ奥行き z に自艇の進路 (st.px, st.py) を直接投影し、
   * セーフコースならシアン、衝突コースならアンバーで表示することで遠近錯覚を 100% 解消する。
   */
  function drawAimReticle(st, behindList, vanishX, vanishY, t) {
    // 一番手前に迫っている未通過ゲートを探す（無ければ中間奥行き z=0.52 に表示）
    let target = null;
    for (const entry of behindList) {
      if (entry.item.kind === 'gate' && !entry.item.resolved) {
        if (!target || entry.z < target.z) target = entry;
      }
    }
    const zRef = target ? target.z : 0.52;
    const safe = !target || (Math.hypot(st.px - target.item.gapX, st.py - target.item.gapY) <= target.item.gapR + 0.08);

    const pFar = project(st.px, st.py, zRef, vanishX, vanishY);
    const pMid = project(st.px, st.py, (zRef + TUNNEL_PLAYER_Z) * 0.5, vanishX, vanishY);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const col = safe ? 'rgba(130,248,255,' : 'rgba(255,152,78,';

    // 手前側の小さな補助リング（遠近の奥行きライン）
    ctx.strokeStyle = col + '0.32)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(pMid.x, pMid.y, 12, 0, TAU);
    ctx.stroke();

    // ゲート面上のメイン進路レティクル（四隅ブラケット＋中央ドット）
    const r = Math.max(14, 22 * pFar.scale * 0.62);
    const pulse = safe ? 1.0 : (0.92 + 0.14 * Math.sin(t * 22));
    const rr = r * pulse;
    ctx.strokeStyle = col + (safe ? '0.82)' : '0.95)');
    ctx.lineWidth = safe ? 2.2 : 2.8;
    const arm = rr * 0.45;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(pFar.x + sx * rr, pFar.y + sy * (rr - arm));
        ctx.lineTo(pFar.x + sx * rr, pFar.y + sy * rr);
        ctx.lineTo(pFar.x + sx * (rr - arm), pFar.y + sy * rr);
        ctx.stroke();
      }
    }
    ctx.fillStyle = col + '0.92)';
    ctx.beginPath();
    ctx.arc(pFar.x, pFar.y, 2.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** 自艇リアビュー（サーチライト＋スクリュー螺旋キャビテーション泡＋ロール連動）。 */
  function drawPlayerRear(st, vanishX, vanishY, shieldOn, t) {
    const pos = project(st.px, st.py, TUNNEL_PLAYER_Z, vanishX, vanishY);
    const sx = pos.x;
    const sy = pos.y;

    // 1) 水中を切り裂くツインサーチライト
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      const lx = sx + side * 32;
      const ly = sy - 8;
      const tx = vanishX + (sx - vanishX) * 0.20 + side * 48;
      const ty = vanishY + (sy - vanishY) * 0.20;
      const lg = ctx.createLinearGradient(lx, ly, tx, ty);
      lg.addColorStop(0, st.boostT > 0 ? 'rgba(180,252,255,0.34)' : 'rgba(232,248,255,0.22)');
      lg.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(lx - 7, ly);
      ctx.lineTo(lx + 7, ly);
      ctx.lineTo(tx + 46, ty);
      ctx.lineTo(tx - 46, ty);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 2) 潜水艇リア本体
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(st.roll);
    ctx.scale(0.92, 0.92 * (1 - Math.abs(st.pitch) * 0.14));

    // 左右ダイブフィン
    ctx.fillStyle = '#2d4250';
    ctx.strokeStyle = '#7bb4cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-42, 4); ctx.lineTo(-90, 16); ctx.lineTo(-82, 28); ctx.lineTo(-36, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(42, 4); ctx.lineTo(90, 16); ctx.lineTo(82, 28); ctx.lineTo(36, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // セイル（司令塔の後ろ姿）
    ctx.fillStyle = '#253744';
    ctx.beginPath();
    ctx.moveTo(-14, -22); ctx.lineTo(-9, -44); ctx.lineTo(9, -44); ctx.lineTo(14, -22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 耐圧船体リア
    const hullGrad = ctx.createRadialGradient(-10, -14, 6, 0, 4, 52);
    hullGrad.addColorStop(0, '#7294a6');
    hullGrad.addColorStop(0.55, '#3b5362');
    hullGrad.addColorStop(1, '#16232d');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 46, 33, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#92cce0';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 船尾ダクトシュラウド
    ctx.fillStyle = '#13202a';
    ctx.strokeStyle = '#d8a65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 8, 21, 0, TAU);
    ctx.fill(); ctx.stroke();

    // 高速回転スクリュー
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

    // スクリューから螺旋状に千切れて手前へ飛ぶキャビテーション泡
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const ph = ((t * (st.boostT > 0 ? 4.2 : 2.8) + i * 0.1) % 1);
      const ang = spin * 0.6 + i * 1.4;
      const rad = 10 + ph * 34;
      const bx = Math.cos(ang) * rad;
      const by = 10 + Math.sin(ang) * rad * 0.6 + ph * 36;
      const br = (1 - ph) * (st.boostT > 0 ? 6.5 : 4.2) + 1.2;
      ctx.fillStyle = `rgba(190,246,255,${((1 - ph) * 0.58).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    }

    const jetR = st.boostT > 0 ? 54 : 30;
    const jg = ctx.createRadialGradient(0, 12, 3, 0, 16, jetR);
    jg.addColorStop(0, st.boostT > 0 ? 'rgba(180,255,244,0.82)' : 'rgba(130,228,255,0.48)');
    jg.addColorStop(0.5, st.boostT > 0 ? 'rgba(92,232,255,0.34)' : 'rgba(72,188,235,0.16)');
    jg.addColorStop(1, 'rgba(40,140,200,0)');
    ctx.fillStyle = jg;
    ctx.beginPath(); ctx.arc(0, 14, jetR, 0, TAU); ctx.fill();

    // 翼端ポジションランプ
    ctx.fillStyle = 'rgba(255,140,95,0.9)';
    ctx.beginPath(); ctx.arc(-82, 21, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,255,195,0.9)';
    ctx.beginPath(); ctx.arc(82, 21, 3.6, 0, TAU); ctx.fill();

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

  /** 爆速カウントアップ・マイル深度計＆進行バー。 */
  function drawTunnelHud(dive, st) {
    const isBH = st.theme.id === 'blackhole';
    const wy = dive.currentWorldY();
    const meters = depthMetersAt(wy);
    const miles = isBH ? (3920 + st.progress * 40) : (meters / METERS_PER_MILE);
    const depthKmStr = isBH ? `${Math.round(miles * 1.609344).toLocaleString('en-US')} km` : formatDepthDisplay(wy);

    const eps = 0.008;
    const yNext = st.theme.startY + (st.theme.endY - st.theme.startY) * clamp(st.progress + eps, 0, 1);
    const yPrev = st.theme.startY + (st.theme.endY - st.theme.startY) * clamp(st.progress - eps, 0, 1);
    const dmPerProg = Math.abs(depthMetersAt(yNext) - depthMetersAt(yPrev)) / (2 * eps);
    const miPerSec = isBH ? (40 / st.theme.duration) * st.speed : (dmPerProg / METERS_PER_MILE) * (st.speed / st.theme.duration);

    const boost = st.boostT > 0;
    const dirArrow = st.theme.dir > 0 ? '▼' : '▲';
    const miStr = miles.toFixed(2).padStart(6, ' ');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = VW * 0.5;
    const by = VH - 50;

    const barW = 340;
    ctx.fillStyle = 'rgba(6,20,32,0.74)';
    ctx.fillRect(cx - barW * 0.5, by + 20, barW, 8);
    ctx.fillStyle = boost ? '#9affdf' : '#6ee2ff';
    ctx.fillRect(cx - barW * 0.5, by + 20, barW * st.progress, 8);
    ctx.strokeStyle = 'rgba(160,232,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - barW * 0.5, by + 20, barW, 8);

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

    ctx.font = 'bold 14px Consolas,"Yu Gothic UI",monospace';
    ctx.fillStyle = boost ? '#ffe99c' : 'rgba(176,232,250,0.88)';
    const spdStr = `${dirArrow} ${miPerSec.toFixed(1)} mi/s  |  ${depthKmStr}${boost ? '  ⚡ BOOST' : ''}`;
    ctx.fillText(spdStr, cx, by - 36);

    if (st.time < 2.6) {
      ctx.globalAlpha = clamp(1 - Math.max(0, st.time - 1.8) / 0.8, 0, 1) * 0.88;
      ctx.font = 'bold 16px "Yu Gothic UI","Hiragino Sans",sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('スティック／WASD で岩の隙間を抜けろ！', cx, VH * 0.76);
    }
    ctx.restore();
  }

  return { render };
}
