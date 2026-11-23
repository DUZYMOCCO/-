/**
 * ABYSS DIVE — 冒頭ストーリー（導入）の描画と入力（Canvas2D）
 *
 * ルール・文言は intro-rules.js（純粋）。ここは描画・タップ・スキップだけ。
 * 潜航・探索・基地の描画には触れない。game.js の render()/update() から
 * state==='intro' のときだけ呼ばれる独立モジュール。
 *
 * 画づくり: 既存の海底基地（格納庫）と同じトーン（冷たい青緑＋局所の暖色灯）。
 *   登場人物は既存アセット（エリー＝倉庫 GIRL、相棒＝倉庫 ponco、回収ロボ＝倉庫 scavenger）。
 */
import {
  INTRO_CLOSE_T,
  createIntroState, introView, advanceIntro, skipIntro, tickIntro, introFinished,
} from './intro-rules.js';

const TAU = Math.PI * 2;
const GY = 566;                              // 風景スプライトの立ち位置（基地の床と同じ）
const BOX_H = 150;                           // 会話枠の高さ（drawDialogue と共有）
const BOX_MARGIN = 44;                       // 会話枠の下余白

export function createIntro(opts){
  const ctx = opts.ctx;
  const VW = opts.VW, VH = opts.VH;
  const view = opts.view || { dpr: 1, scale: 1, ox: 0, oy: 0 };
  const toLogical = opts.toLogical || ((x, y) => ({ x, y }));
  const art = opts.art || {};
  const store = opts.store || { markSeen(){} };
  const onFinish = opts.onFinish || function(){};
  const onAdvance = opts.onAdvance || function(){};
  const onSkip = opts.onSkip || function(){};

  const ready = img => !!(img && img.complete && img.naturalWidth > 0);

  let st = createIntroState();
  let active = false;
  let reported = false;
  let sceneT = 0;
  let lastScene = null;
  const parts = [];                          // 気泡・塵（軽い演出）

  /* スキップボタン（右上。DOM の「← もどる」＝左上と重ならない） */
  const SKIP = { x: VW - 196, y: 22, w: 168, h: 48 };

  /* --- 背景板（格納庫の帯を切り出して整える。base.js と同じ発想。毎フレームは作らない） --- */
  const CROP = { x: 0, y: 1560, w: 1080, h: 608 };
  let plate = null, plateSrc = null;
  function ensurePlate(){
    if (plate && plateSrc === art.interior) return plate;
    const img = art.interior;
    if (!ready(img)) return null;
    const c = document.createElement('canvas');
    c.width = VW; c.height = VH;
    const g = c.getContext('2d');
    g.fillStyle = '#05141a'; g.fillRect(0, 0, VW, VH);
    g.drawImage(img, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, VW, VH);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#a2c6c2'; g.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = 'source-over';
    const dg = g.createLinearGradient(0, VH * 0.42, 0, VH);
    dg.addColorStop(0, 'rgba(3,16,22,0)'); dg.addColorStop(1, 'rgba(2,9,13,0.62)');
    g.fillStyle = dg; g.fillRect(0, VH * 0.42, VW, VH * 0.58);
    const tg = g.createLinearGradient(0, 0, 0, VH * 0.42);
    tg.addColorStop(0, 'rgba(4,18,24,0.55)'); tg.addColorStop(1, 'rgba(4,18,24,0)');
    g.fillStyle = tg; g.fillRect(0, 0, VW, VH * 0.42);
    plate = c; plateSrc = img;
    return plate;
  }

  /* ==================================================================
     ライン
     ================================================================== */
  function enter(){
    st = createIntroState();
    active = true;
    reported = false;
    sceneT = 0; lastScene = null;
    parts.length = 0;
    for (let i = 0; i < 34; i++) parts.push(newPart(true));
  }
  function leave(){ active = false; }
  function isActive(){ return active; }
  function isFinished(){ return introFinished(st); }
  function reset(){ st = createIntroState(); }

  function newPart(seed){
    return {
      x: Math.random() * VW,
      y: seed ? Math.random() * VH : VH + 10,
      r: 1.2 + Math.random() * 3.4,
      vy: -(8 + Math.random() * 26),
      vx: (Math.random() - 0.5) * 8,
      a: 0.12 + Math.random() * 0.26,
    };
  }

  function update(dt){
    if (!active) return;
    tickIntro(st, dt);
    const v = introView(st);
    if (v.scene !== lastScene){ lastScene = v.scene; sceneT = 0; }
    sceneT += dt;
    for (const p of parts){
      p.y += p.vy * dt; p.x += p.vx * dt;
      if (p.y < -8 || p.x < -8 || p.x > VW + 8){ Object.assign(p, newPart(false)); }
    }
    if (introFinished(st) && !reported){
      reported = true;
      try { store.markSeen(); } catch (e) { /* noop */ }
      onFinish();
    }
  }

  /* ==================================================================
     入力（タップで次へ / スキップ）。連打・二重発火はロックで防ぐ。
     ================================================================== */
  function tap(x, y){
    if (!active || st.done) return;
    if (st.lock > 0) return;                       // 直前の入力からまだ間がない
    if (x != null && inSkip(x, y)){ skipIntro(st); onSkip(); return; }
    advanceIntro(st);
    onAdvance();
  }
  function inSkip(x, y){
    return x >= SKIP.x && x <= SKIP.x + SKIP.w && y >= SKIP.y && y <= SKIP.y + SKIP.h;
  }
  function touchStart(e){
    if (!active) return;
    /* 指ごとに処理するが、1 コマだけ進める（同時マルチタッチで飛ばさない） */
    const ts = e.changedTouches && e.changedTouches.length ? e.changedTouches : (e.touches || []);
    if (!ts.length) return;
    const p = toLogical(ts[0].clientX, ts[0].clientY);
    tap(p.x, p.y);
  }
  function key(code){
    if (!active || st.done || st.lock > 0) return;
    if (code === 'Escape'){ skipIntro(st); onSkip(); return; }
    if (code === 'Enter' || code === 'Space' || code === 'KeyE'){ advanceIntro(st); onAdvance(); }
  }

  /* ==================================================================
     描画
     ================================================================== */
  function drawScene(v){
    const plateImg = ensurePlate();
    if (plateImg) ctx.drawImage(plateImg, 0, 0, VW, VH);
    else { ctx.fillStyle = '#07242c'; ctx.fillRect(0, 0, VW, VH); }

    if (v.scene === 'base') drawBaseMood();
    else if (v.scene === 'signal') drawSignalMood(v);
    else drawDepartMood(v);
  }

  function warmLamps(list, mul){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of list){
      const pulse = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(st.t * 1.8 + l[0] * 0.01));
      const r = 150 * pulse * (mul || 1);
      const g = ctx.createRadialGradient(l[0], l[1], 2, l[0], l[1], r);
      g.addColorStop(0, 'rgba(255,196,120,0.38)');
      g.addColorStop(0.5, 'rgba(255,152,72,0.11)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l[0], l[1], r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,228,176,0.85)';
      ctx.beginPath(); ctx.arc(l[0], l[1], 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawBaseMood(){
    warmLamps([[430, 228], [742, 200], [1006, 246]], 1);
    drawBubbles(0.5);
  }

  function drawSignalMood(v){
    /* ざわめき・暗さを増し、右の端末に青ホロ */
    ctx.save();
    ctx.fillStyle = 'rgba(4,14,22,0.42)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
    warmLamps([[742, 200]], 0.55);
    drawConsole(1010, 372, v);
    drawBubbles(0.8);
  }

  function drawDepartMood(v){
    /* 暖色を落とし、行き先（右下）の暗がりを強める。出港ゲートの明かり。 */
    ctx.save();
    ctx.fillStyle = 'rgba(2,8,13,0.42)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
    warmLamps([[430, 228]], 0.5);

    /* ゲート（左寄り）の暖色光 */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(250, GY - 150, 10, 250, GY - 150, 300);
    gg.addColorStop(0, 'rgba(255,206,140,0.34)');
    gg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, 620, VH);
    ctx.restore();

    /* はるか下の暗がり（右下へ抜ける） */
    const dg = ctx.createLinearGradient(740, 110, VW, VH);
    dg.addColorStop(0, 'rgba(0,0,0,0)');
    dg.addColorStop(1, 'rgba(0,3,7,0.85)');
    ctx.fillStyle = dg; ctx.fillRect(700, 80, VW - 700, VH - 80);

    /* ずっと下へ続く信号の筋（弱い青） */
    const pulse = 0.4 + 0.3 * Math.sin(st.t * 2.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sx = 980 + Math.sin(st.t * 0.7) * 6;
    const lg = ctx.createLinearGradient(sx, 140, sx, VH + 40);
    lg.addColorStop(0, 'rgba(120,214,255,0)');
    lg.addColorStop(0.4, 'rgba(120,214,255,' + (0.16 * pulse).toFixed(3) + ')');
    lg.addColorStop(1, 'rgba(120,214,255,0)');
    ctx.strokeStyle = lg; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, 140); ctx.lineTo(sx, VH + 40); ctx.stroke();
    ctx.restore();
    drawBubbles(1.1);
  }

  function drawBubbles(mul){
    ctx.save();
    ctx.fillStyle = 'rgba(180,226,235,1)';
    for (const p of parts){
      ctx.globalAlpha = p.a * (mul || 1);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* 受信端末（鋼の筐体＋青ホロ＋波形） */
  function drawConsole(cx, cy, v){
    const w = 236, h = 168;
    ctx.save();
    /* 筐体 */
    ctx.fillStyle = 'rgb(9,22,29)';
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(58,96,108,0.9)'; ctx.lineWidth = 3; ctx.stroke();
    /* ホロ画面 */
    const sx = cx - w / 2 + 16, sy = cy - h / 2 + 16, sw = w - 32, sh = h - 32;
    const bg = ctx.createLinearGradient(0, sy, 0, sy + sh);
    bg.addColorStop(0, 'rgba(30,92,132,0.55)');
    bg.addColorStop(1, 'rgba(10,40,66,0.62)');
    ctx.fillStyle = bg; ctx.fillRect(sx, sy, sw, sh);
    /* 走査線 */
    ctx.globalAlpha = 0.12; ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 1;
    for (let y = sy + 4; y < sy + sh; y += 7){ ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + sw, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    /* 波形（受信） */
    const amp = 10 + (v.appear * 12);
    ctx.strokeStyle = 'rgba(160,232,255,0.95)'; ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= sw; i += 3){
      const ph = i * 0.14 + st.t * (3.0 + (v.scene === 'signal' ? 1.6 : 0.4));
      const y = sy + sh / 2 + Math.sin(ph) * amp * (0.5 + 0.5 * Math.sin(i * 0.03 + st.t));
      if (i === 0) ctx.moveTo(sx + i, y); else ctx.lineTo(sx + i, y);
    }
    ctx.stroke();
    /* 点滅ドット */
    const blink = 0.5 + 0.5 * Math.sin(st.t * 6);
    ctx.fillStyle = 'rgba(255,196,120,' + (0.5 + 0.5 * blink).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(cx + w / 2 - 24, cy - h / 2 + 24, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,220,255,' + (0.35 + 0.4 * blink).toFixed(3) + ')';
    ctx.font = '600 15px "Yu Gothic UI","Hiragino Sans",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SIGNAL', cx, cy + h / 2 + 18);
    ctx.restore();
  }

  /* ==================================================================
     登場人物
     ================================================================== */
  function shadowAt(x, w){
    ctx.save();
    const sg = ctx.createRadialGradient(x, GY + 4, 2, x, GY + 4, w);
    sg.addColorStop(0, 'rgba(0,0,0,0.56)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(x, GY + 4, w * 0.96, w * 0.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* 登場人物の背後の柔らかい暖色ライト（合成は lighter。薄暗い場面で人物を浮かせる）。 */
  function keyLight(x, y, r, a){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, 'rgba(255,206,150,' + a + ')');
    g.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawSprite(img, x, hgt, facing, alpha, footFrac){
    shadowAt(x, hgt * 0.34);
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (facing < 0){ ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    if (ready(img)){
      const aspect = img.naturalWidth / img.naturalHeight;
      const w = hgt * aspect;
      const bottom = GY + (footFrac || 0);
      ctx.drawImage(img, x - w / 2, bottom - hgt, w, hgt);
    } else {
      ctx.fillStyle = '#8aa0a8';
      ctx.fillRect(x - hgt * 0.3, GY - hgt, hgt * 0.6, hgt);
    }
    ctx.restore();
  }

  /* ==================================================================
     会話・UI
     ================================================================== */
  function wrapText(text, maxW, font){
    ctx.font = font;
    const out = [];
    let line = '';
    for (const ch of text){
      if (ch === '\n'){ out.push(line); line = ''; continue; }
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = ch; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  function drawDialogue(v){
    const bx = 64, bw = VW - 128, bh = 150, by = VH - bh - 44;
    ctx.save();
    ctx.fillStyle = 'rgba(4,14,20,0.82)';
    roundRect(ctx, bx, by, bw, bh, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(176,120,58,0.85)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(84,134,146,0.5)'; ctx.lineWidth = 1.5;
    roundRect(ctx, bx + 5, by + 5, bw - 10, bh - 10, 11); ctx.stroke();

    const appear = v.appear;
    ctx.globalAlpha = 0.35 + 0.65 * appear;

    /* 話者 */
    const hasSpeaker = !!(v.speaker && v.speaker.length);
    if (hasSpeaker){
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 26px "Yu Gothic UI","Hiragino Sans",system-ui,sans-serif';
      ctx.fillStyle = '#ffd79a';
      ctx.fillText(v.speaker, bx + 34, by + 46);
    }

    /* 本文 */
    const font = (hasSpeaker ? '500 31px ' : '500 33px ') + '"Yu Gothic UI","Hiragino Sans",system-ui,sans-serif';
    const lines = wrapText(v.text, bw - 68, font);
    ctx.font = font;
    ctx.fillStyle = '#e8f6fb';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const ty = by + (hasSpeaker ? 92 : 66);
    lines.forEach((ln, i) => ctx.fillText(ln, bx + 34, ty + i * 40));

    /* 進行ドット */
    ctx.globalAlpha = 0.8;
    const dotY = by + bh - 20;
    const dw = 14, gap = 9;
    const total = v.total;
    const startX = bx + bw - 34 - (total * dw + (total - 1) * gap);
    for (let i = 0; i < total; i++){
      ctx.fillStyle = i <= v.step ? 'rgba(255,205,130,0.95)' : 'rgba(120,160,175,0.4)';
      ctx.beginPath();
      ctx.arc(startX + i * (dw + gap) + dw / 2, dotY, i === v.step ? 4.4 : 3.0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* つぎへ の案内（会話枠の内側・右上。枠の外だと地に溶けるため内へ） */
    if (!v.done){
      const a = 0.55 + 0.45 * Math.sin(st.t * 3.2);
      ctx.globalAlpha = a;
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = '600 22px "Yu Gothic UI","Hiragino Sans",system-ui,sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('▶ タップで つぎへ', bx + bw - 30, by + 40);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawSkip(){
    ctx.save();
    ctx.fillStyle = 'rgba(8,22,34,0.7)';
    roundRect(ctx, SKIP.x, SKIP.y, SKIP.w, SKIP.h, 999); ctx.fill();
    ctx.strokeStyle = 'rgba(140,200,235,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#cfe8ff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 22px "Yu Gothic UI","Hiragino Sans",system-ui,sans-serif';
    ctx.fillText('スキップ ▷▷', SKIP.x + SKIP.w / 2, SKIP.y + SKIP.h / 2 + 1);
    ctx.restore();
  }

  function drawHandoff(){
    /* 完了/スキップ後に暗転してタイトルへ */
    const k = Math.max(0, Math.min(1, 1 - st.closeT / INTRO_CLOSE_T));
    ctx.save();
    ctx.fillStyle = 'rgba(0,3,7,' + (0.9 * k).toFixed(3) + ')';
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }

  function render(){
    if (!active) return;
    const v = introView(st);
    drawScene(v);
    drawScenery(v);
    drawPortraits(v);
    drawDialogue(v);
    drawSkip();
    if (v.done) drawHandoff();
  }

  /* 風景/歩行レイヤのスプライト。名前つきの登場人物（エリー/ポンコ）は会話用の
     立ち絵で示すので、ここには置かない（二重にしない）。ここは “その他のロボット” だけ。 */
  function drawScenery(v){
    if (v.scene === 'base'){
      drawSprite(art.scavenger, 918, 150, -1, 0.5, 0);
      drawSprite(art.scavenger, 1096, 118, 1, 0.42, 0);
    } else if (v.scene === 'signal'){
      drawSprite(art.scavenger, 1010, 122, 1, 0.46, 0);
    } else {
      drawDepartSub(250, GY - 74);              // 潜水艇（出港）
      drawSprite(art.scavenger, 1010, 112, -1, 0.42, 0);
    }
  }

  /* 会話用の立ち絵レイヤ（発話者を立ち絵＋話者名で明示）。歩行/風景スプライトとは別レイヤ。
     顔・文字・タップに重ならないよう、会話枠の上・左へ、枠に重ねずに置く。
     画像が読めないときは代用を勝手に描かず、何も出さない（話者名は会話枠に出る）。 */
  function drawPortraits(v){
    const key = v.portrait;
    if (!key) return;                          // ナレーションは立ち絵なし
    const img = art.portraits ? art.portraits[key] : null;
    if (!ready(img)) return;
    const boxTop = VH - BOX_H - BOX_MARGIN;
    const cx = 300;
    const h = /^girl:/.test(key) ? 430 : 386;  // エリーは胸上、ポンコは全身
    const w = h * img.naturalWidth / img.naturalHeight;
    keyLight(cx, boxTop - h * 0.58, w * 0.72, 0.30);
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.drawImage(img, cx - w / 2, boxTop - h, w, h);
    ctx.restore();
  }

  function drawDepartSub(cx, baseY){
    const img = art.sub;
    if (!ready(img)) return;
    const w = 300, h = w * img.naturalHeight / img.naturalWidth;   // 512x200
    ctx.save();
    ctx.globalAlpha = 0.96;
    /* わずかに下向き（出港） */
    ctx.translate(cx, baseY - h * 0.5);
    ctx.rotate(0.06);
    /* 船体の灯（暖色） */
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(w * 0.62, 0, 4, w * 0.62, 0, 150);
    lg.addColorStop(0, 'rgba(255,206,140,0.34)');
    lg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(w * 0.62, 0, 150, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function roundRect(g, x, y, w, h, r){
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
  }

  return {
    enter, leave, isActive, isFinished, reset, update, render, tap, touchStart, key,
    state(){ return introView(st); },
    SKIP,
  };
}
