/**
 * ABYSS DIVE — スターフォックス風 背後視点・連続3D海底洞窟パイプ描画（v3.18.0）
 *
 * 根本刷新（v3.18.0）:
 *   - 「仕切り板（ゲート）」と「境界の縁取り線」を完全撤去！
 *   - 洞窟パイプそのもの（32段の連続リング×16角形＝512面）が dive.pipeAt(p) に従って
 *     奥から手前へ滑らかに蛇行・くびれ変形する 1 本の継ぎ目ない 3D 岩盤パイプとして描画。
 *   - 各リング断面には ComfyUI 生成の玄武岩テクスチャ＋1面ごとの法線シェーディング＋水中フォグを合成し、
 *     層と層の境界線や不自然な縁取りを一切出さない。
 *   - 当たり判定（現在位置のパイプ内壁）と見た目（手前パイプ内壁）が同一数式のため、体感と接触が 100% 一致。
 */

import { depthMetersAt, formatDepthDisplay } from './world-biomes.js?v=3';
import { createTunnelThree } from './tunnel-three.js?v=3';
import { createTunnelGL } from './tunnel-gl.js?v=3';

const TAU = Math.PI * 2;
const METERS_PER_MILE = 1609.344;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

export const TUNNEL_PLAYER_Z = 0.22;
const LOOK_AHEAD_PROG = 0.24;
const PROJ_X = 245;
const PROJ_Y = 152;

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

  // Phase 1: 本格 Three.js 3D レンダラー（3D潜水艇＋PBR洞窟＋3D加速リング＋重力レンズBH）
  const three3d = createTunnelThree({ width: 960, height: 540 });
  // フォールバック用 WebGL2 レイマーチングレンダラー
  const gl3d = three3d ? null : createTunnelGL({ width: 854, height: 480 });

  const art = {
    wall: loadOptImg('tunnel_canyon_wall.webp'),
    kelp: loadOptImg('hall_giant_kelp.webp'),
    vent: loadOptImg('volcanic_vent.webp'),
    stalactite: loadOptImg('cave_stalactite.webp'),
    jelly: loadOptImg('creature_jelly.webp'),
    coral: loadOptImg('flora_coral_cyan.webp'),
  };
  let wallPattern = null;
  function getWallPattern() {
    if (!wallPattern && imgReady(art.wall)) {
      wallPattern = ctx.createPattern(art.wall, 'repeat');
    }
    return wallPattern;
  }

  /**
   * ワールド正規化空間 (wx, wy, depthZ) → 画面座標投影。
   * カメラは自艇の少し後ろから現在パイプ中心を見つめるため、パイプ全体が自然にうねって迫ってくる。
   */
  function project(wx, wy, depthZ, camX, camY, shakeX, shakeY) {
    const z = clamp(depthZ, 0.02, 1.45);
    const scale = 1 / (0.14 + z * 1.65);
    return {
      x: VW * 0.5 + (wx - camX) * PROJ_X * scale + shakeX,
      y: VH * 0.50 + (wy - camY) * PROJ_Y * scale + shakeY,
      scale,
    };
  }

  function samplePalette(th, prog) {
    if (th.id === 'corridor_up') {
      return {
        fog: mixRgb([14, 46, 72], [12, 62, 86], prog),
        wallDark: mixRgb([8, 18, 28], [10, 26, 38], prog),
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
    const mid = clamp((prog - 0.15) / 0.45, 0, 1);
    const end = clamp((prog - 0.55) / 0.45, 0, 1);
    const fog0 = mixRgb([5, 22, 38], [28, 17, 22], mid);
    const fog = mixRgb(fog0, [14, 54, 82], end);
    const wDark0 = mixRgb([5, 13, 21], [16, 10, 12], mid);
    const wallDark = mixRgb(wDark0, [10, 28, 42], end);
    const wLit0 = mixRgb([22, 54, 76], [74, 34, 24], mid);
    const wallLit = mixRgb(wLit0, [48, 118, 138], end);
    const vein0 = mixRgb([76, 198, 236], [255, 132, 64], mid);
    const vein = mixRgb(vein0, [160, 246, 255], end);
    const stream = mixRgb([108, 232, 255], [255, 230, 148], end * 0.65);
    return { fog, wallDark, wallLit, vein, stream };
  }

  /**
   * 連続パイプの断面頂点（16角形）。
   * 中心 (pipe.cx, pipe.cy)・半径 pipe.r に連動し、セグメント番号に紐づく自然な岩肌凹凸を持つ。
   */
  function pipeRingPoints(pipe, z, segIdx, camX, camY, shakeX, shakeY) {
    const sides = 16;
    const pts = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * TAU;
      // 岩肌の自然な凹凸（連続するセグメント間で滑らかに繋がるよう低周波ノイズ）
      const crag = 1.0 + Math.sin(k * 2.0 + segIdx * 0.48) * 0.08 + Math.cos(k * 3.0 - segIdx * 0.33) * 0.05;
      const wx = pipe.cx + Math.cos(a) * pipe.r * crag;
      const wy = pipe.cy + Math.sin(a) * pipe.r * crag;
      const p = project(wx, wy, z, camX, camY, shakeX, shakeY);
      pts.push({ x: p.x, y: p.y, a, scale: p.scale });
    }
    const center = project(pipe.cx, pipe.cy, z, camX, camY, shakeX, shakeY);
    return { pts, cx: center.x, cy: center.y, scale: center.scale };
  }

  function render(dive, shieldOn) {
    if (!dive) return;
    const st = dive.state();
    const th = st.theme;
    const t = st.time;
    const pal = samplePalette(th, st.progress);
    const curPipe = dive.pipeAt(st.progress);

    // カメラは自艇と現在パイプ中心のあいだを滑らかに追従
    const camX = lerp(curPipe.cx, st.px, 0.45);
    const camY = lerp(curPipe.cy, st.py, 0.45);
    const shakeX = st.shake > 0 ? Math.sin(t * 62) * 14 * st.shake : 0;
    const shakeY = st.shake > 0 ? Math.cos(t * 53) * 10 * st.shake : 0;

    // 遠方出口の投影座標
    const farPipe = dive.pipeAt(st.progress + LOOK_AHEAD_PROG);
    const vanish = project(farPipe.cx, farPipe.cy, 1.05, camX, camY, shakeX, shakeY);

    ctx.save();

    if (three3d) {
      /* Three.js 本格 3D 空間を描画（3D 潜水艇・PBR 岩盤洞窟・3D 加速リング・重力レンズ BH を一括描画） */
      const frame = three3d.renderFrame(st, camX, camY, shieldOn);
      ctx.drawImage(frame, 0, 0, VW, VH);

      /* 前方進路予測レティクル（壁に近いときだけアンバー警告） */
      drawAimReticle(dive, st, camX, camY, shakeX, shakeY, t);
    } else if (gl3d) {
      /* 本物の WebGL2 3D 空間を描画（海底大洞窟レイマーチング＋法線照光 / 重力レンズブラックホール） */
      const frame = gl3d.renderFrame(st, camX, camY);
      ctx.drawImage(frame, 0, 0, VW, VH);

      /* 海底洞窟の中を走っている間（BH モードは宇宙境界 0.48 を抜けるまで）水中気泡ストリークを重ねる */
      if (th.id !== 'blackhole' || st.progress < 0.48) {
        const [sr, sg, sb] = pal.stream;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bubbleCount = st.boostT > 0 ? 44 : 26;
        for (let i = 0; i < bubbleCount; i++) {
          const ang = (i * 2.39996) % TAU;
          const ph = ((t * (1.35 + (i % 5) * 0.24) * st.speed + i * 0.173) % 1);
          const r0 = 34 + ph * ph * 680;
          const r1 = r0 + (24 + ph * 92) * (st.boostT > 0 ? 1.55 : 1.0);
          const a = Math.sin(ph * Math.PI) * (st.boostT > 0 ? 0.46 : 0.24);
          const x0 = vanish.x + Math.cos(ang) * r0;
          const y0 = vanish.y + Math.sin(ang) * r0 * 0.68;
          const x1 = vanish.x + Math.cos(ang) * r1;
          const y1 = vanish.y + Math.sin(ang) * r1 * 0.68;
          ctx.strokeStyle = `rgba(195,244,255,${a.toFixed(3)})`;
          ctx.lineWidth = 1.1 + ph * 2.2;
          ctx.beginPath();
          ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
          ctx.stroke();
          if (i % 2 === 0) {
            ctx.fillStyle = `rgba(${sr},${sg},${sb},${(a * 0.80).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(x1, y1, 1.3 + ph * 2.6, 0, TAU);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    } else if (th.id === 'blackhole') {
      drawBlackHoleSpace(st, vanish.x, vanish.y, t);
    } else {
      /* 1. 深淵の水中背景（最奥フォグ色） */
      const [fr, fg, fb] = pal.fog;
      ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
      ctx.fillRect(0, 0, VW, VH);

      /* 2. 最奥の水中出口光（パイプの先に広がるマントル楽園の蒼金光） */
      const exitR = 140 + st.progress * 140;
      const [er, eg, eb] = th.exitCol;
      const [gr, gg, gb] = th.exitGold;
      const egd = ctx.createRadialGradient(vanish.x, vanish.y, 6, vanish.x, vanish.y, exitR);
      egd.addColorStop(0, `rgba(230,252,255,${(0.32 + 0.24 * st.progress).toFixed(3)})`);
      egd.addColorStop(0.35, `rgba(${gr},${gg},${gb},${(0.28 + 0.16 * st.progress).toFixed(3)})`);
      egd.addColorStop(0.72, `rgba(${er},${eg},${eb},0.14)`);
      egd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = egd;
      ctx.beginPath(); ctx.arc(vanish.x, vanish.y, exitR, 0, TAU); ctx.fill();

      /* 3. 完全に連続する 3D 海底洞窟パイプ（カメラ手前 z=0.02 の画面外端〜最奥 z=1.10 まで隙間なく覆う！） */
      const segCount = 28;
      const behindSegs = 8; // 自艇より手前（カメラ横〜画面外端）まで岩壁を連続延長するセグメント数
      const segProgStep = LOOK_AHEAD_PROG / segCount;
      const baseSeg = Math.floor(st.progress / segProgStep);
      const frac = (st.progress / segProgStep) - baseSeg;

      const rings = [];
      for (let i = -behindSegs; i <= segCount; i++) {
        const segIdx = baseSeg + i;
        const pAt = segIdx * segProgStep;
        const relStep = i - frac; // 0 = 自艇の位置(TUNNEL_PLAYER_Z)
        const z = TUNNEL_PLAYER_Z + (relStep / segCount) * (1.10 - TUNNEL_PLAYER_Z);
        const safeZ = Math.max(0.015, z);
        const pipe = dive.pipeAt(pAt);
        const rp = pipeRingPoints(pipe, safeZ, segIdx, camX, camY, shakeX, shakeY);
        rings.push({ z: safeZ, segIdx, pAt, pipe, ...rp });
      }

      const wPat = getWallPattern();
      const [vr, vg, vb] = pal.vein;
      const pipeScroll = (st.progress * 2600) % 512;

      // 奥から手前（画面四隅の外側）まで 1 セグメントずつ隙間なく塗りつぶす
      for (let i = rings.length - 2; i >= 0; i--) {
        const farR = rings[i + 1];
        const nearR = rings[i];
        if (farR.z <= 0.016) continue;

        const fogT = clamp(Math.pow((farR.z - 0.10) / 0.95, 0.85), 0.04, 0.96);
        const sides = farR.pts.length;
        const useTex = !!(wPat && fogT < 0.80);

        // 1) セグメント全体の岩肌ベース（全セグメントで連続する単一スクロール座標を使い、継ぎ目段差を完全消滅！）
        if (useTex) {
          ctx.save();
          ctx.beginPath();
          for (let k = 0; k < sides; k++) {
            const pt = nearR.pts[k];
            if (k === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          for (let k = 0; k < sides; k++) {
            const pt = farR.pts[k];
            if (k === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.clip('evenodd');
          const texScale = clamp(lerp(nearR.scale, farR.scale, 0.5) * 0.44, 0.28, 1.35);
          ctx.translate(VW * 0.5, VH * 0.5);
          ctx.scale(texScale, texScale);
          ctx.translate(0, pipeScroll);
          ctx.fillStyle = wPat;
          ctx.fillRect(-1800, -1400, 3600, 2800);
          ctx.restore();
        }

        // 2) 各クワッド面へ滑らかな連続シェーディング＋水中フォグ（同色 1.6px ストロークで Canvas2D の隙間線も完全消去）
        for (let k = 0; k < sides; k++) {
          const k2 = (k + 1) % sides;
          const aMid = farR.pts[k].a + Math.PI / sides;
          const lit = clamp(0.42 + 0.36 * Math.sin(aMid) + 0.14 * Math.cos(aMid * 2), 0, 1);
          const rock = mixRgb(pal.wallDark, pal.wallLit, lit);
          const col = mixRgb(rock, pal.fog, fogT);
          const shadeAlpha = useTex ? clamp(0.32 + fogT * 0.66, 0.32, 0.97) : 1.0;

          const fillCol = shadeAlpha < 0.99
            ? `rgba(${col[0]},${col[1]},${col[2]},${shadeAlpha.toFixed(3)})`
            : `rgb(${col[0]},${col[1]},${col[2]})`;
          ctx.fillStyle = fillCol;
          ctx.beginPath();
          ctx.moveTo(farR.pts[k].x, farR.pts[k].y);
          ctx.lineTo(farR.pts[k2].x, farR.pts[k2].y);
          ctx.lineTo(nearR.pts[k2].x, nearR.pts[k2].y);
          ctx.lineTo(nearR.pts[k].x, nearR.pts[k].y);
          ctx.closePath();
          ctx.fill();
          if (!useTex) {
            ctx.strokeStyle = fillCol;
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }
        }

        // 3) パイプ壁面に生える深海アセット（鍾乳石・熱水チムニー・発光海草・発光サンゴ・クラゲ）
        if ((farR.segIdx % 3) === 0 && farR.z > 0.24 && farR.z < 0.92) {
          const slot = ((farR.segIdx * 7) % sides + sides) % sides;
          const anchor = farR.pts[slot];
          const sideAng = anchor.a;
          const propAlpha = clamp((1 - fogT) * 0.95, 0, 0.78);
          let propImg = null;
          if (st.progress > 0.52 || th.id === 'corridor_up') {
            propImg = (slot % 3 === 0) ? art.kelp : ((slot % 3 === 1) ? art.coral : art.jelly);
          } else if (st.progress > 0.22 && (slot % 2 === 0)) {
            propImg = art.vent;
          } else if (Math.sin(sideAng) < -0.3) {
            propImg = art.stalactite;
          }
          if (propImg && imgReady(propImg) && propAlpha > 0.06) {
            const pw = (propImg === art.jelly ? 72 : 145) * farR.scale * 0.52;
            const ph = pw * (propImg.naturalHeight / propImg.naturalWidth);
            ctx.save();
            ctx.globalAlpha = propAlpha;
            ctx.translate(anchor.x, anchor.y);
            ctx.drawImage(propImg, -pw * 0.5, -ph * 0.5, pw, ph);
            ctx.restore();
          }
        }
      }

      /* 4. 水中の気泡＆マリンスノー（スピード感と水中感） */
      const [sr, sg, sb] = pal.stream;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bubbleCount = st.boostT > 0 ? 48 : 30;
      for (let i = 0; i < bubbleCount; i++) {
        const ang = (i * 2.39996) % TAU;
        const ph = ((t * (1.35 + (i % 5) * 0.24) * st.speed + i * 0.173) % 1);
        const r0 = 26 + ph * ph * 680;
        const r1 = r0 + (26 + ph * 96) * (st.boostT > 0 ? 1.55 : 1.0);
        const a = Math.sin(ph * Math.PI) * (st.boostT > 0 ? 0.52 : 0.28);
        const x0 = vanish.x + Math.cos(ang) * r0;
        const y0 = vanish.y + Math.sin(ang) * r0 * 0.68;
        const x1 = vanish.x + Math.cos(ang) * r1;
        const y1 = vanish.y + Math.sin(ang) * r1 * 0.68;
        ctx.strokeStyle = `rgba(195,244,255,${a.toFixed(3)})`;
        ctx.lineWidth = 1.2 + ph * 2.3;
        ctx.beginPath();
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.stroke();
        if (i % 2 === 0) {
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${(a * 0.85).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x1, y1, 1.4 + ph * 2.8, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    /* 5. フォールバック時のみ 2D レティクル＆自艇リアビューを描画（没入感優先でリングは非表示） */
    if (!three3d) {
      drawAimReticle(dive, st, camX, camY, shakeX, shakeY, t);
      drawPlayerRear(st, camX, camY, shakeX, shakeY, vanish.x, vanish.y, shieldOn, t);
    }

    /* 7. 海流ブースト＆壁擦りフラッシュ */
    if (st.clearFlash > 0) {
      ctx.fillStyle = `rgba(160,248,255,${(st.clearFlash * 0.045).toFixed(3)})`;
      ctx.fillRect(0, 0, VW, VH);
    }
    if (st.hitFlash > 0) {
      const hg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.24, VW / 2, VH / 2, VH * 0.85);
      hg.addColorStop(0, 'rgba(255,60,30,0)');
      hg.addColorStop(1, `rgba(255,70,40,${(st.hitFlash * 0.42).toFixed(3)})`);
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, VW, VH);
    }

    /* 8. 爆速マイル深度計＆進行バー */
    drawTunnelHud(dive, st);

    ctx.restore();
  }

  /** 3,960 マイル・ブラックホール突入専用描画。 */
  function drawBlackHoleSpace(st, vx, vy, t) {
    const bg = ctx.createRadialGradient(vx, vy, 30, vx, vy, VW * 0.78);
    bg.addColorStop(0, '#120826');
    bg.addColorStop(0.45, '#050310');
    bg.addColorStop(1, '#010105');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VW, VH);

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

    const bhR = 46 + st.progress * 155;
    const halo = ctx.createRadialGradient(vx, vy, bhR * 0.9, vx, vy, bhR * 3.4);
    halo.addColorStop(0, 'rgba(255,226,162,0.52)');
    halo.addColorStop(0.28, 'rgba(255,158,86,0.28)');
    halo.addColorStop(0.60, 'rgba(116,138,255,0.16)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(vx, vy, bhR * 3.4, 0, TAU); ctx.fill();

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
    const diskRx = bhR * 2.75;
    const diskRy = bhR * 0.56;
    const dg = ctx.createLinearGradient(-diskRx, 0, diskRx, 0);
    dg.addColorStop(0, 'rgba(255,244,210,0.92)');
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

    ctx.save();
    ctx.fillStyle = '#000002';
    ctx.beginPath(); ctx.arc(vx, vy, bhR, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,244,214,0.92)';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(vx, vy, bhR * 1.02, 0, TAU); ctx.stroke();

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

    ctx.strokeStyle = 'rgba(255,232,168,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, diskRx2 * 1.24, diskRy2 * 1.24, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /** 自然な水流の渦（スリップストリーム）：くぐると加速＋資源ゲット。 */
  function drawSlipstreamRing(item, z, alpha, camX, camY, shakeX, shakeY, pal, t) {
    const p = project(item.x, item.y, z, camX, camY, shakeX, shakeY);
    const rx = item.r * PROJ_X * p.scale;
    const ry = item.r * PROJ_Y * p.scale;
    const [sr, sg, sb] = pal.stream;
    const spin = t * 4.5 + z * 6;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (item.resolved ? 0.20 : 0.88);
    for (let i = 0; i < 3; i++) {
      const a0 = spin + i * (TAU / 3);
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.82)`;
      ctx.lineWidth = Math.max(2.4, 5.2 * p.scale * 0.40);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, ry, 0, a0, a0 + 1.35);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(230,252,255,0.62)';
    ctx.lineWidth = Math.max(1.2, 2.0 * p.scale * 0.38);
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * 0.82, ry * 0.82, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /** 前方パイプ断面上の進路予測レティクル（壁に近いときだけ警告アンバー）。 */
  function drawAimReticle(dive, st, camX, camY, shakeX, shakeY, t) {
    const aheadPipe = dive.pipeAt(st.progress + 0.06);
    const dAhead = Math.hypot(st.px - aheadPipe.cx, st.py - aheadPipe.cy);
    const warn = ((st.theme.id !== 'blackhole') || st.progress < 0.48) && (dAhead > Math.max(0.32, aheadPipe.r - 0.14) || st.wallRatio > 0.85);

    const pFar = project(st.px, st.py, 0.44, camX, camY, shakeX, shakeY);
    const pMid = project(st.px, st.py, 0.32, camX, camY, shakeX, shakeY);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const col = warn ? 'rgba(255,152,78,' : 'rgba(130,248,255,';

    ctx.strokeStyle = col + '0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pMid.x, pMid.y, 11, 0, TAU);
    ctx.stroke();

    const r = 18 * (warn ? (0.94 + 0.12 * Math.sin(t * 22)) : 1.0);
    ctx.strokeStyle = col + (warn ? '0.92)' : '0.75)');
    ctx.lineWidth = warn ? 2.6 : 2.0;
    const arm = r * 0.44;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(pFar.x + sx * r, pFar.y + sy * (r - arm));
        ctx.lineTo(pFar.x + sx * r, pFar.y + sy * r);
        ctx.lineTo(pFar.x + sx * (r - arm), pFar.y + sy * r);
        ctx.stroke();
      }
    }
    ctx.fillStyle = col + '0.88)';
    ctx.beginPath();
    ctx.arc(pFar.x, pFar.y, 2.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** 自艇リアビュー。 */
  function drawPlayerRear(st, camX, camY, shakeX, shakeY, vanishX, vanishY, shieldOn, t) {
    const pos = project(st.px, st.py, TUNNEL_PLAYER_Z, camX, camY, shakeX, shakeY);
    const sx = pos.x;
    const sy = pos.y;

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

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(st.roll);
    ctx.scale(0.92, 0.92 * (1 - Math.abs(st.pitch) * 0.14));

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

    ctx.fillStyle = '#253744';
    ctx.beginPath();
    ctx.moveTo(-14, -22); ctx.lineTo(-9, -44); ctx.lineTo(9, -44); ctx.lineTo(14, -22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

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

    ctx.fillStyle = '#13202a';
    ctx.strokeStyle = '#d8a65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 8, 21, 0, TAU);
    ctx.fill(); ctx.stroke();

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
      ctx.fillText('スティック／WASD で洞窟の流れに乗れ！', cx, VH * 0.76);
    }
    // テスト反映確認用の極小バッジ
    ctx.globalAlpha = 0.72;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Consolas,monospace';
    ctx.fillStyle = '#9edcf2';
    const engineTag = three3d ? 'THREE-3D' : (gl3d ? '3D-GL' : '2D-FB');
    ctx.fillText(`${engineTag} v4.1.0`, 14, VH - 14);
    ctx.restore();
  }

  return { render };
}
