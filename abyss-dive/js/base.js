/**
 * ABYSS DIVE — 海底基地の描画・入力（室内）と、潜航側の外観マーカー
 *
 * v1.10.0: 最初のボスの先の入港可能な前哨基地。外観（潜航中）は「進入灯 → 鋼鉄の外壁 →
 *   暖色に照らされた入港ドック」を段階的に描き（室内とは別素材・別描画で、遠くからでも
 *   ドックとして読めるようにする）、室内は倉庫 `hangar.webp`（縦長）から横持ちに必要な帯を
 *   切り出して格納庫にする。スーツなしのエリー（倉庫 GIRL の idle/walk m60）が待機・歩行でき、
 *   船に戻れば出港する。室内は有限の安全区画で敵もダメージも無い。
 *
 * 純粋ルールは base-rules.js。ここは描画と入力の割り当てだけ（潜航側の既存描画には触れない）。
 */
import { BASE_WORLD as W, createBaseState, stepBase } from './base-rules.js?v=1';

const TAU = Math.PI * 2;
const wrap01 = v => ((v % 1) + 1) % 1;
const d2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
function roundRect(g, x, y, w, h, r){
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* GIRL（エリー）のアトラス。倉庫 chars/GIRL の m60（frame 104x66、足元アンカー 52,64.4）。 */
const GIRL = {
  frameW: 104, frameH: 66, idleCols: 4, walkCols: 12,
  anchorX: 52, anchorY: 64.4, scale: 3.0,
};
const IDLE_SEQ = [0, 1, 2, 1, 0, 3];   // frames.json の idle sequence
const IDLE_FPS = 3;

export function createBase(opts){
  const ctx = opts.ctx;
  const view = opts.view;
  const VW = opts.VW, VH = opts.VH;
  const Input = opts.Input;
  const toLogical = opts.toLogical || ((x, y) => ({ x, y }));
  const art = opts.art || {};
  const onDepart = opts.onDepart || function(){};
  const ready = img => !!(img && img.complete && img.naturalWidth > 0);

  let st = createBaseState();
  let t = 0;
  let active = false;
  let pendingAction = false;

  /* --- 縦長の格納庫から横持ちに必要な帯を切り出して整える（毎フレーム色計算しない） ---
     hangar.webp は 1080x2340。下段（床と暖色の灯が読める帯）を 16:9 で切り出す。 */
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
    /* 青緑の外海と暗い鋼材のトーンへ寄せつつ、暖色の作業灯は残す */
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#a2c6c2'; g.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = 'source-over';
    const dg = g.createLinearGradient(0, VH * 0.42, 0, VH);
    dg.addColorStop(0, 'rgba(3,16,22,0)'); dg.addColorStop(1, 'rgba(2,9,13,0.6)');
    g.fillStyle = dg; g.fillRect(0, VH * 0.42, VW, VH * 0.58);
    const tg = g.createLinearGradient(0, 0, 0, VH * 0.42);
    tg.addColorStop(0, 'rgba(4,18,24,0.55)'); tg.addColorStop(1, 'rgba(4,18,24,0)');
    g.fillStyle = tg; g.fillRect(0, 0, VW, VH * 0.42);
    plate = c; plateSrc = img;
    return plate;
  }

  /* ==================================================================
     更新
     ================================================================== */
  function clearTransient(){
    st = createBaseState();
    st.msg = '入港 — 格納庫'; st.msgT = 2.2;
    pendingAction = false;
    t = 0;
  }
  function enter(){ active = true; clearTransient(); }
  function leave(){ active = false; pendingAction = false; }
  function reset(){ st = createBaseState(); if (active) clearTransient(); }

  function update(dt){
    if (!active) return;
    t += dt;
    let move = 0;
    if (Input.keys['KeyA'] || Input.keys['ArrowLeft']) move -= 1;
    if (Input.keys['KeyD'] || Input.keys['ArrowRight']) move += 1;
    if (move === 0 && Input.stick.active) move = Input.stick.dx;
    if (Input.pad && Math.abs(Input.pad.x) > 0) move = Input.pad.x;

    const action = pendingAction || Input.wantDock || !!(Input.pad && Input.pad.actionEdge);
    Input.wantDock = false;
    pendingAction = false;

    const ev = stepBase(st, { move, action }, dt);
    if (ev.depart) onDepart();
  }

  /* ==================================================================
     室内の描画
     ================================================================== */
  function drawInterior(){
    const plate = ensurePlate();
    if (plate) ctx.drawImage(plate, 0, 0, VW, VH);
    else { ctx.fillStyle = '#07242c'; ctx.fillRect(0, 0, VW, VH); }

    /* 暖色の作業灯（格納庫の灯） */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of [[520, 250], [770, 210], [1000, 260]]){
      const pulse = 0.82 + 0.18 * Math.sin(t * 1.8 + l[0] * 0.01);
      const r = 170 * pulse;
      const g = ctx.createRadialGradient(l[0], l[1], 2, l[0], l[1], r);
      g.addColorStop(0, 'rgba(255,196,120,0.42)');
      g.addColorStop(0.5, 'rgba(255,152,72,0.13)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l[0], l[1], r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,228,176,0.9)';
      ctx.beginPath(); ctx.arc(l[0], l[1], 4.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawFloor(){
    const gy = W.GROUND_Y;
    const g = ctx.createLinearGradient(0, gy - 10, 0, VH);
    g.addColorStop(0, 'rgba(3,14,18,0)');
    g.addColorStop(0.18, 'rgba(3,12,16,0.5)');
    g.addColorStop(1, 'rgba(1,6,9,0.9)');
    ctx.fillStyle = g; ctx.fillRect(0, gy - 10, VW, VH - gy + 10);

    /* 歩ける床のエッジを暖色で（安全区画の目印） */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createLinearGradient(0, gy - 7, 0, gy + 11);
    rg.addColorStop(0, 'rgba(255,205,140,0)');
    rg.addColorStop(0.5, 'rgba(255,200,135,0.4)');
    rg.addColorStop(1, 'rgba(255,175,105,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, gy - 7, VW, 18);
    ctx.restore();
    ctx.strokeStyle = 'rgba(150,220,210,0.32)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy + 1); ctx.lineTo(VW, gy + 1); ctx.stroke();
  }

  function drawShip(){
    const img = art.sub;
    const h = 120, w = h * (512 / 200);
    const x = W.SHIP_X - w / 2, y = W.GROUND_Y - h + 8;
    /* 接岸の灯・暖色 */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(W.SHIP_X, W.GROUND_Y - 30, 4, W.SHIP_X, W.GROUND_Y - 30, 220);
    g.addColorStop(0, 'rgba(255,200,130,0.22)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(W.SHIP_X, W.GROUND_Y - 30, 220, 0, TAU); ctx.fill();
    ctx.restore();
    if (ready(img)){
      ctx.save();
      ctx.shadowColor = 'rgba(255,180,110,0.35)'; ctx.shadowBlur = 18;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#14303c'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(150,220,210,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    }
    /* 乗り込み口の灯 */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,220,160,0.85)';
    ctx.beginPath(); ctx.arc(x + w - 30, y + h * 0.5, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawEllie(){
    const px = st.x, feet = W.GROUND_Y, S = GIRL.scale;
    /* キーライト＋影 */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(px, feet - 120, 4, px, feet - 120, 190);
    lg.addColorStop(0, 'rgba(255,196,128,0.16)');
    lg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(px, feet - 120, 190, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save();
    const sg = ctx.createRadialGradient(px, feet + 4, 2, px, feet + 4, 62);
    sg.addColorStop(0, 'rgba(0,0,0,0.58)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(px, feet + 4, 60, 13, 0, 0, TAU); ctx.fill();
    ctx.restore();

    const walking = st.anim === 'walk';
    const sheet = walking ? art.ellieWalk : art.ellieIdle;
    const cols = walking ? GIRL.walkCols : GIRL.idleCols;
    let idx;
    if (walking) idx = Math.min(cols - 1, Math.floor(wrap01(st.walkPhase) * cols));
    else idx = IDLE_SEQ[Math.floor(st.idleT * IDLE_FPS) % IDLE_SEQ.length];
    const sx = (idx % cols) * GIRL.frameW;
    const dx = px - GIRL.anchorX * S;
    const dy = feet - GIRL.anchorY * S;

    ctx.save();
    if (st.facing < 0){ ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
    if (ready(sheet)){
      ctx.drawImage(sheet, sx, 0, GIRL.frameW, GIRL.frameH, dx, dy, GIRL.frameW * S, GIRL.frameH * S);
    } else {
      ctx.fillStyle = '#c9a06a';
      ctx.fillRect(px - 22, feet - 150, 44, 150);
      ctx.strokeStyle = 'rgba(150,220,210,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(px - 22, feet - 150, 44, 150);
    }
    ctx.restore();
  }

  function drawVignette(){
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.34, VW / 2, VH / 2, VH * 0.98);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  }

  function promptAt(x, y, text){
    ctx.save();
    ctx.font = 'bold 19px "Yu Gothic UI","Hiragino Sans",sans-serif';
    const tw = ctx.measureText(text).width;
    const pad = 16, keyW = Input.mode === 'touch' ? 0 : 34;
    const w = tw + pad * 2 + keyW, h = 38;
    const bx = Math.max(12, Math.min(x - w / 2, VW - w - 12)), by = y - h / 2;
    ctx.fillStyle = 'rgba(6,18,24,0.82)';
    roundRect(ctx, bx, by, w, h, 19); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,150,0.7)'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.textBaseline = 'middle';
    if (Input.mode !== 'touch'){
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); roundRect(ctx, bx + 10, by + 8, 22, 22, 6); ctx.fill();
      ctx.fillStyle = '#08202a'; ctx.font = 'bold 14px "Yu Gothic UI",sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('E', bx + 21, by + 20);
    }
    ctx.fillStyle = '#f2fbff';
    ctx.font = 'bold 19px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, bx + 10 + keyW + (Input.mode === 'touch' ? 0 : 8), by + h / 2 + 1);
    ctx.restore();
  }

  function drawHUD(){
    ctx.save();
    ctx.textBaseline = 'middle';
    /* 右上に「安全区画」と分かる表示 */
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#8affd0';
    ctx.fillText('前哨基地 格納庫 — 安全区画', VW - 26, 34);
    ctx.font = '14px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = 'rgba(175,220,230,0.82)';
    ctx.fillText(Input.mode === 'touch'
      ? '左をドラッグで移動 ／ 船のそばで右下のボタン → 出港'
      : 'A・D ／ ←→ で移動    船のそばで E → 出港', VW - 26, 62);

    if (st.near) promptAt(W.SHIP_X + 150, W.GROUND_Y - 250, '出港する');

    if (st.msgT > 0){
      ctx.globalAlpha = Math.min(1, st.msgT / 0.5);
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px "Yu Gothic UI","Hiragino Sans",sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(st.msg, VW / 2, VH - 92);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function actionButton(){
    return { id: 'depart', x: VW - 140, y: VH - 140, r: 74, label: '出港', col: '#ffe08a' };
  }

  function drawTouchUI(){
    const b = actionButton();
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = 'rgba(6,18,26,0.55)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = st.near ? b.col : 'rgba(120,160,180,0.5)';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.92;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(b.r * 0.32) + 'px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = st.near ? '#eafcff' : 'rgba(180,205,220,0.6)';
    ctx.fillText(b.label, b.x, b.y + 1);

    const s = Input.stick;
    if (s.active){
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(160,225,255,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.ox, s.oy, s.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(120,220,255,0.28)';
      ctx.beginPath(); ctx.arc(s.ox, s.oy, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(190,245,255,0.85)';
      ctx.beginPath(); ctx.arc(s.ox + s.dx * s.r, s.oy + s.dy * s.r, 30, 0, TAU); ctx.fill();
    } else {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = 'rgba(160,225,255,0.8)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(190, VH - 150, 78, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = 'rgba(190,240,255,0.9)';
      ctx.font = 'bold 15px "Yu Gothic UI",sans-serif';
      ctx.fillText('ここをドラッグで移動', 190, VH - 150);
    }
    ctx.restore();
  }

  function render(){
    if (!active) return;
    t += 0;   /* t は update で進む。render は状態を描くだけ */
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#01060a';
    ctx.fillRect(0, 0, view.cssW, view.cssH);

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

    drawInterior();
    drawFloor();
    drawShip();
    drawEllie();
    drawVignette();
    drawHUD();
    if (Input.mode === 'touch') drawTouchUI();

    ctx.restore();
  }

  /* ==================================================================
     潜航側の外観マーカー（render() から呼ぶ。潜航の描画関数には触らない）
     進入灯 → 鋼鉄の外壁 → 暖色に照らされた入港ドック と段階的に見える。
     ================================================================== */
  function drawSteelWall(x, y, pulse){
    const top = y - 300, bottom = y + 330;
    ctx.save();
    /* 鋼鉄の外壁（青緑の海から暗い鋼材として浮かぶ。暗すぎず板として読める明度） */
    const wg = ctx.createLinearGradient(0, top, 0, bottom);
    wg.addColorStop(0, 'rgb(20,36,45)');
    wg.addColorStop(0.5, 'rgb(24,42,52)');
    wg.addColorStop(1, 'rgb(14,27,35)');
    ctx.fillStyle = wg;
    ctx.fillRect(x - 580, top, 1160, bottom - top);
    /* 縦のフレーム材（分厚い柱） */
    for (let i = -3; i <= 3; i++){
      const px = x + i * 190;
      ctx.fillStyle = 'rgb(27,48,58)';
      ctx.fillRect(px - 22, top, 44, bottom - top);
      ctx.fillStyle = 'rgba(78,120,132,0.55)';
      ctx.fillRect(px - 22, top, 5, bottom - top);
      ctx.fillStyle = 'rgba(6,14,20,0.7)';
      ctx.fillRect(px + 17, top, 5, bottom - top);
    }
    /* 横の装甲板の継ぎ目（上に明るい縁を入れて板として読ませる）＋リベット */
    for (let j = 0; j < 5; j++){
      const py = top + 90 + j * 108;
      ctx.fillStyle = 'rgba(5,13,18,1)'; ctx.fillRect(x - 580, py, 1160, 7);
      ctx.fillStyle = 'rgba(74,112,124,0.5)'; ctx.fillRect(x - 580, py - 2, 1160, 2);
      ctx.fillStyle = 'rgba(96,138,150,0.5)';
      for (let rx = x - 570; rx <= x + 570; rx += 38){
        ctx.beginPath(); ctx.arc(rx, py - 12, 2, 0, TAU); ctx.fill();
      }
    }
    /* 暖色のリム（上下の縁）と作業灯 */
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,180,116,' + (0.34 + 0.12 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 580, top + 2); ctx.lineTo(x + 580, top + 2);
    ctx.moveTo(x - 580, bottom - 2); ctx.lineTo(x + 580, bottom - 2);
    ctx.stroke();
    for (let i = -2; i <= 2; i++){
      for (const ly of [top + 46, bottom - 40]){
        const lx = x + i * 240;
        const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 56);
        g.addColorStop(0, 'rgba(255,208,146,' + (0.66 * pulse).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(lx, ly, 56, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,232,186,0.95)';
        ctx.beginPath(); ctx.arc(lx, ly, 3.8, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawDockMouth(x, y, pulse){
    const w = 340, top = y - 250, bottom = y + 300;
    const left = x - w * 0.5;
    ctx.save();
    /* 暖色に照らされた入港ドックの開口（鋼鉄の外壁に開いた口） */
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, 'rgba(255,168,86,0.10)');
    g.addColorStop(0.5, 'rgba(255,186,104,0.30)');
    g.addColorStop(1, 'rgba(255,214,150,0.62)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(left, top + 60);
    ctx.quadraticCurveTo(x, top - 20, left + w, top + 60);
    ctx.lineTo(left + w, bottom);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,150,' + (0.7 + 0.2 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 5; ctx.stroke();
    /* 内部の作業灯 */
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(x, y + 60, 4, x, y + 60, 200);
    cg.addColorStop(0, 'rgba(255,228,176,0.6)');
    cg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(x, y + 60, 200, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawDockMouth(x, y, pulse){
    const w = 300, h = 340;
    const left = x - w * 0.5, top = y - h;
    ctx.save();
    /* 暖色に照らされた入港ドックの開口 */
    const g = ctx.createLinearGradient(0, top, 0, y);
    g.addColorStop(0, 'rgba(255,168,86,0.10)');
    g.addColorStop(0.55, 'rgba(255,186,104,0.34)');
    g.addColorStop(1, 'rgba(255,214,150,0.6)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left, top + 40);
    ctx.quadraticCurveTo(x, top - 30, left + w, top + 40);
    ctx.lineTo(left + w, y);
    ctx.closePath(); ctx.fill();
    /* 開口の枠 */
    ctx.strokeStyle = 'rgba(255,210,150,' + (0.7 + 0.2 * pulse).toFixed(3) + ')';
    ctx.lineWidth = 5;
    ctx.stroke();
    /* 内部の作業灯 */
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(x, y - 90, 4, x, y - 90, 150);
    cg.addColorStop(0, 'rgba(255,228,176,0.6)');
    cg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(x, y - 90, 150, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function renderDiveMarker(camX, camY, m){
    const marker = m && m.marker;
    if (!marker) return;
    const x = marker.x - camX, y = marker.y - camY;
    if (x < -900 || x > VW + 900 || y < -900 || y > VH + 900) return;
    const stage = m.stage || 'none';
    const pulse = 0.72 + 0.28 * Math.sin(((m.time || 0)) * 2.2);

    ctx.save();

    /* 進入灯: 遠くから見える暖色のビーム＋点列 */
    if (stage !== 'none'){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      /* 上空へ伸びるビーコン（遠くからでも前哨基地だと分かる） */
      const beam = ctx.createLinearGradient(0, y - 520, 0, y + 30);
      beam.addColorStop(0, 'rgba(255,205,140,0)');
      beam.addColorStop(1, 'rgba(255,190,120,' + (0.16 * pulse).toFixed(3) + ')');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x - 46, y - 520); ctx.lineTo(x + 46, y - 520);
      ctx.lineTo(x + 150, y + 20); ctx.lineTo(x - 150, y + 20);
      ctx.closePath(); ctx.fill();
      /* 進入灯の点列 */
      for (let i = 0; i < 6; i++){
        const lx = x - 300 + i * 120;
        const ly = y - 150 + Math.sin(i * 1.7) * 10;
        const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 34);
        g.addColorStop(0, 'rgba(255,206,138,' + (0.62 * pulse).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(lx, ly, 34, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,232,182,0.95)';
        ctx.beginPath(); ctx.arc(lx, ly, 4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    /* 鋼鉄の外壁 */
    if (stage === 'wall' || stage === 'dock') drawSteelWall(x, y, pulse);
    /* 暖色に照らされた入港ドック */
    if (stage === 'dock') drawDockMouth(x, y, pulse);

    /* ラベルとプロンプト */
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = 'rgba(232,250,255,0.94)';
    ctx.fillText('海底前哨基地', x, y - 300);
    if (m.near){
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin((m.time || 0) * 6);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
      ctx.fillText(Input.mode === 'touch' ? '右のボタンで入港' : 'E で入港', x, y + 34);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(255,200,130,0.7)'; ctx.lineWidth = 3;
      const oy = ((m.time || 0) * 46) % 30;
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 78 + oy);
      ctx.lineTo(x, y + 94 + oy);
      ctx.lineTo(x + 16, y + 78 + oy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ==================================================================
     タッチ（潜航の touchStart から分岐して呼ぶ。move/end は共通の Input.stick を使う）
     ================================================================== */
  function touchStart(e){
    Input.mode = 'touch';
    const b = actionButton();
    for (const touch of e.changedTouches){
      const p = toLogical(touch.clientX, touch.clientY);
      if (d2(p.x, p.y, b.x, b.y) < (b.r + 20) * (b.r + 20)){
        pendingAction = true;
        Input.btnTouch[touch.identifier] = b.id;
        continue;
      }
      if (!Input.stick.active && p.x < VW * 0.66){
        Input.stick.active = true; Input.stick.id = touch.identifier;
        Input.stick.ox = p.x; Input.stick.oy = p.y;
        Input.stick.x = p.x; Input.stick.y = p.y;
        Input.stick.dx = Input.stick.dy = 0;
      }
    }
    e.preventDefault();
  }

  function state(){
    return {
      active,
      x: Math.round(st.x),
      facing: st.facing,
      anim: st.anim,
      near: st.near,
      msg: st.msg,
    };
  }

  return { enter, leave, reset, update, render, renderDiveMarker, touchStart, state, isActive: () => active };
}
