/**
 * ABYSS DIVE — 徒歩探索シーン（描画・入力の割り当て）
 *
 * 潜航側（game.js）とは分離したモジュール。game.js は createExplore({...}) を作り、
 * 「探索中は update()/render() をこちらに委譲する」だけ。潜航の描画・戦闘・HUD・
 * 既存タッチには手を入れない。
 *
 * 見た目: 既存の assets/sunken-city.webp を青緑に寄せた遠景に使い、暗い前景、
 * 暖色ライト、床の輪郭と操作 UI をはっきり見せる。
 *
 * 座標は潜航と同じ 1280x720 論理解像度。walk のルールは explore-rules.js。
 */
import { EXPLORE_WORLD as W, createExploreState, stepExplore } from './explore-rules.js?v=8';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const d2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };

/* キャラ素材（384x384, 足元 y=363, 頭 y=96）の基準 */
const SPR = { size: 384, feet: 363, headY: 96, cx: 192, scale: 0.78 };

function roundRect(g, x, y, w, h, r){
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function createExplore(opts){
  const ctx = opts.ctx;
  const view = opts.view;
  const VW = opts.VW, VH = opts.VH;
  const Input = opts.Input;
  const toLogical = opts.toLogical || ((x, y) => ({ x, y }));
  const art = opts.art || {};
  const onSurvey = opts.onSurvey || function(){};
  const onReturn = opts.onReturn || function(){};
  const ready = (img) => !!(img && img.complete && img.naturalWidth > 0);

  let st = createExploreState();
  let cam = 0;
  let t = 0;
  let active = false;
  let pendingAction = false;

  /* --- 決定的に配置する装飾（毎回同じ遺跡） --- */
  const decor = (function(){
    let s = 20261122;
    const rr = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const pillars = [];
    for (let x = 90; x < W.W + 200; x += 200){
      pillars.push({ x: x + rr() * 70, w: 44 + rr() * 56, h: 240 + rr() * 270, broken: rr() < 0.5 });
    }
    const lamps = [];
    for (let x = 260; x < W.W; x += 500){ lamps.push({ x: x + rr() * 150, y: W.GROUND_Y - (120 + rr() * 90) }); }
    const rocks = [];
    for (let x = 0; x < W.W; x += 170){ rocks.push({ x: x + rr() * 90, w: 26 + rr() * 46, h: 10 + rr() * 22 }); }
    const motes = [];
    for (let i = 0; i < 70; i++) motes.push({ x: rr() * W.W, y: rr() * VH, r: 0.8 + rr() * 1.8, sp: 4 + rr() * 10, ph: rr() * TAU });
    return { pillars, lamps, rocks, motes };
  })();

  /* --- 事前描画: sunken-city を青緑に染めた板（毎フレーム色計算しない） --- */
  let cityPlate = null, cityPlateSrc = null;
  function ensurePlate(){
    if (cityPlate && cityPlateSrc === art.city) return cityPlate;
    const img = art.city;
    if (!ready(img)) return null;
    const c = document.createElement('canvas');
    c.width = 1660; c.height = 920;
    const g = c.getContext('2d');
    g.fillStyle = '#06232b'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#8bc8cc'; g.fillRect(0, 0, c.width, c.height);   // 石造都市の明暗を残して青緑へ寄せる
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(3,16,22,0.14)'; g.fillRect(0, 0, c.width, c.height);
    cityPlate = c; cityPlateSrc = img;
    return cityPlate;
  }

  /* ==================================================================
     更新
     ================================================================== */
  function clearTransient(){
    st.x = W.SPAWN_X; st.facing = 1; st.moving = false; st.animT = 0; st.frame = 0;
    st.interactCd = 0; st.near = null; st.msg = ''; st.msgT = 0;
    pendingAction = false;
    cam = clamp(st.x - VW * 0.45, 0, W.W - VW);
  }
  function enter(){ active = true; clearTransient(); }
  function leave(){ active = false; pendingAction = false; }
  function reset(){ st = createExploreState(); if (active) clearTransient(); }

  function update(dt){
    if (!active) return;
    t += dt;

    /* 移動: PC キー → スティック → パッド（パッド優先）。アナログ量はそのまま使う */
    let move = 0;
    if (Input.keys['KeyA'] || Input.keys['ArrowLeft']) move -= 1;
    if (Input.keys['KeyD'] || Input.keys['ArrowRight']) move += 1;
    if (move === 0 && Input.stick.active) move = Input.stick.dx;
    if (Input.pad && Math.abs(Input.pad.x) > 0) move = Input.pad.x;

    /* 調べる／戻る: 押した瞬間のエッジ。パッド A・E キー・画面ボタン。 */
    const action = pendingAction || Input.wantDock || !!(Input.pad && Input.pad.actionEdge);
    Input.wantDock = false;
    pendingAction = false;

    const ev = stepExplore(st, { move, action }, dt);
    if (ev.survey !== null) onSurvey(ev.survey);
    if (ev.return) onReturn();

    cam = clamp(st.x - VW * 0.45, 0, W.W - VW);
  }

  /* ==================================================================
     描画
     ================================================================== */
  function drawWater(){
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#0a313b');
    g.addColorStop(0.45, '#07242c');
    g.addColorStop(1, '#02121a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  function drawFarCity(){
    const plate = ensurePlate();
    const py = -130 - cam * 0.05;
    if (plate){
      const sw = plate.width, sh = plate.height;
      const start = -((cam * 0.24) % sw) - sw;
      ctx.save();
      ctx.globalAlpha = 0.74;
      for (let x = start; x < VW + sw; x += sw) ctx.drawImage(plate, x, py, sw, sh);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(20,60,68,0.5)';
      ctx.fillRect(0, 190, VW, 300);
    }
    /* 遠景のほのかな暖色（都市の残光） */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 180, 0, 460);
    g.addColorStop(0, 'rgba(90,150,150,0)');
    g.addColorStop(1, 'rgba(80,140,130,0.10)');
    ctx.fillStyle = g; ctx.fillRect(0, 160, VW, 340);
    ctx.restore();
  }

  function drawScrim(){
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, 'rgba(2,12,18,0.32)');
    g.addColorStop(0.55, 'rgba(2,10,16,0.44)');
    g.addColorStop(1, 'rgba(1,7,12,0.66)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  function drawPillars(par, near){
    ctx.save();
    for (const p of decor.pillars){
      const sx = p.x - cam * par;
      if (sx < -p.w - 40 || sx > VW + p.w + 40) continue;
      const gy = W.GROUND_Y;
      const top = gy - p.h;
      ctx.fillStyle = near ? 'rgba(1,7,11,0.94)' : 'rgba(4,18,24,0.66)';
      ctx.beginPath();
      ctx.moveTo(sx - p.w / 2, gy + 6);
      ctx.lineTo(sx - p.w / 2, top + (p.broken ? 26 : 0));
      if (p.broken){
        ctx.lineTo(sx - p.w * 0.12, top);
        ctx.lineTo(sx + p.w * 0.16, top + 14);
      } else {
        ctx.lineTo(sx - p.w / 2, top);
        ctx.lineTo(sx + p.w / 2, top);
      }
      ctx.lineTo(sx + p.w / 2, gy + 6);
      ctx.closePath();
      ctx.fill();
      /* 暖色のリム（輪郭を視認できるように） */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = near ? 'rgba(255,175,110,0.16)' : 'rgba(180,210,190,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - p.w / 2, gy + 4);
      ctx.lineTo(sx - p.w / 2, top + (p.broken ? 26 : 0));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,220,205,0.22)';
      ctx.beginPath();
      ctx.moveTo(sx + p.w / 2, gy + 4);
      ctx.lineTo(sx + p.w / 2, top);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGround(){
    const gy = W.GROUND_Y;
    const g = ctx.createLinearGradient(0, gy, 0, VH);
    g.addColorStop(0, '#0b1e24');
    g.addColorStop(1, '#020a0e');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, VW, VH - gy);

    /* 歩ける床のエッジを暖色で光らせ、はっきり見せる */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createLinearGradient(0, gy - 7, 0, gy + 11);
    rg.addColorStop(0, 'rgba(255,205,140,0)');
    rg.addColorStop(0.5, 'rgba(255,200,135,0.42)');
    rg.addColorStop(1, 'rgba(255,175,105,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, gy - 7, VW, 18);
    ctx.restore();

    ctx.strokeStyle = 'rgba(150,220,210,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy + 1); ctx.lineTo(VW, gy + 1); ctx.stroke();

    /* 瓦礫の輪郭（足場の描き込み） */
    for (const r of decor.rocks){
      const sx = r.x - cam;
      if (sx < -60 || sx > VW + 60) continue;
      ctx.fillStyle = 'rgba(3,14,18,0.9)';
      ctx.beginPath();
      ctx.moveTo(sx - r.w, gy + 2);
      ctx.lineTo(sx - r.w * 0.5, gy - r.h);
      ctx.lineTo(sx + r.w * 0.55, gy - r.h * 0.7);
      ctx.lineTo(sx + r.w, gy + 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(140,205,195,0.28)';
      ctx.lineWidth = 1.6; ctx.stroke();
    }
  }

  function drawLampGlows(){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of decor.lamps){
      const sx = l.x - cam * 0.85;
      if (sx < -180 || sx > VW + 180) continue;
      const pulse = 0.8 + 0.2 * Math.sin(t * 1.6 + l.x * 0.01);
      const r = 150 * pulse;
      const g = ctx.createRadialGradient(sx, l.y, 2, sx, l.y, r);
      g.addColorStop(0, 'rgba(255,198,122,0.5)');
      g.addColorStop(0.5, 'rgba(255,150,70,0.14)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, l.y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,228,176,0.9)';
      ctx.beginPath(); ctx.arc(sx, l.y, 4.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawRelics(){
    const gy = W.GROUND_Y;
    for (let i = 0; i < W.RELICS.length; i++){
      const rx = W.RELICS[i].x - cam;
      if (rx < -220 || rx > VW + 220) continue;
      const done = st.relicDone[i];

      /* 台座（輪郭つき） */
      ctx.fillStyle = '#0c2026';
      ctx.beginPath();
      ctx.moveTo(rx - 34, gy + 2);
      ctx.lineTo(rx - 24, gy - 54);
      ctx.lineTo(rx + 24, gy - 54);
      ctx.lineTo(rx + 34, gy + 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,220,210,0.42)'; ctx.lineWidth = 2; ctx.stroke();

      /* 浮遊する遺物 */
      const bob = Math.sin(t * 1.6 + i) * 4;
      ctx.save();
      ctx.translate(rx, gy - 96 + bob);
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, 74);
      gr.addColorStop(0, done ? 'rgba(150,220,255,0.42)' : 'rgba(255,205,130,0.8)');
      gr.addColorStop(1, done ? 'rgba(80,150,200,0)' : 'rgba(255,140,50,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, 74, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(done ? 0 : Math.sin(t * 0.9 + i) * 0.2);
      ctx.fillStyle = done ? '#8fb8c8' : '#ffd9a0';
      ctx.beginPath();
      ctx.moveTo(0, -22); ctx.lineTo(13, 0); ctx.lineTo(0, 22); ctx.lineTo(-13, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(16,28,34,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();

      /* 床のマーカー輪（調査地点だと分かるように） */
      ctx.strokeStyle = done ? 'rgba(140,190,210,0.45)' : 'rgba(255,200,130,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(rx, gy + 2, 42, 10, 0, 0, TAU); ctx.stroke();
    }
  }

  function drawExit(){
    const ex = W.EXIT_X - cam;
    if (ex < -240 || ex > VW + 240) return;
    const gy = W.GROUND_Y;
    ctx.save();
    /* エアロックの輪郭 */
    ctx.strokeStyle = 'rgba(150,220,210,0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ex - 42, gy + 2);
    ctx.lineTo(ex - 42, gy - 150);
    ctx.quadraticCurveTo(ex, gy - 214, ex + 42, gy - 150);
    ctx.lineTo(ex + 42, gy + 2);
    ctx.stroke();
    /* 縞の警告帯 */
    ctx.fillStyle = 'rgba(255,190,90,0.5)';
    for (let i = 0; i < 4; i++) ctx.fillRect(ex - 40 + i * 20, gy - 34, 10, 7);
    /* 内部の暖色光 */
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(ex, gy - 92, 2, ex, gy - 92, 130);
    g.addColorStop(0, 'rgba(255,214,156,0.5)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ex, gy - 92, 130, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawMotes(){
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#cfeef0';
    for (const m of decor.motes){
      const sx = ((m.x - cam * 0.85) % (W.W + 120) + W.W + 120) % (W.W + 120) - 60;
      if (sx < -20 || sx > VW + 20) continue;
      const sy = ((m.y + t * m.sp) % VH + VH) % VH;
      ctx.globalAlpha = 0.16 + 0.16 * Math.sin(t * 1.4 + m.ph);
      ctx.beginPath(); ctx.arc(sx, sy, m.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer(){
    const px = st.x - cam;
    const feet = W.GROUND_Y;
    const S = SPR.scale;

    /* 暖色のキーライト */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(px, feet - 112, 4, px, feet - 112, 180);
    lg.addColorStop(0, 'rgba(255,190,120,0.18)');
    lg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(px, feet - 112, 180, 0, TAU); ctx.fill();
    ctx.restore();

    /* 影（足元に固定） */
    ctx.save();
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(px, feet + 3, 58, 11, 0, 0, TAU); ctx.fill();
    ctx.restore();

    const img = st.frame === 0 ? art.idle : (st.frame === 1 ? art.walk0 : art.walk1);
    if (ready(img)){
      const w = SPR.size * S, h = SPR.size * S;
      const dx = px - SPR.cx * S;
      const dy = feet - SPR.feet * S;            // 足元を床へ固定
      ctx.save();
      if (st.facing < 0){ ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
      /* バイザーのほのかな発光 */
      const hy = feet - (SPR.feet - SPR.headY) * S;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const vg = ctx.createRadialGradient(px + st.facing * 12, hy + 8, 1, px + st.facing * 12, hy + 8, 28);
      vg.addColorStop(0, 'rgba(140,255,240,0.45)');
      vg.addColorStop(1, 'rgba(80,220,220,0)');
      ctx.fillStyle = vg;
      ctx.beginPath(); ctx.arc(px + st.facing * 12, hy + 8, 28, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      /* 画像が読めないときの簡易表示 */
      ctx.fillStyle = '#c9b48c';
      ctx.fillRect(px - 16, feet - 120, 32, 120);
      ctx.strokeStyle = 'rgba(150,220,210,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(px - 16, feet - 120, 32, 120);
    }
  }

  function drawCaveFrame(){
    ctx.save();
    ctx.fillStyle = 'rgba(1,6,10,0.92)';
    /* 天井（洞窟／船内の枠）。cam で少し揺れる */
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(VW, 0);
    ctx.lineTo(VW, 30);
    for (let x = VW; x >= 0; x -= 60){
      ctx.lineTo(x, 30 + 26 * Math.abs(Math.sin(x * 0.011 + cam * 0.012)));
    }
    ctx.closePath(); ctx.fill();
    /* 左右下の暗いふち */
    ctx.beginPath();
    ctx.moveTo(0, VH); ctx.lineTo(0, VH - 120);
    ctx.quadraticCurveTo(60, VH - 40, 140, VH);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(VW, VH); ctx.lineTo(VW, VH - 120);
    ctx.quadraticCurveTo(VW - 60, VH - 40, VW - 140, VH);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawVignette(){
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.32, VW / 2, VH / 2, VH * 0.98);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VW, VH);
  }

  function promptAt(x, y, text){
    ctx.save();
    ctx.font = 'bold 19px "Yu Gothic UI","Hiragino Sans",sans-serif';
    const tw = ctx.measureText(text).width;
    const pad = 16, keyW = Input.mode === 'touch' ? 0 : 34;
    const w = tw + pad * 2 + keyW, h = 38;
    const bx = clamp(x - w / 2, 12, VW - w - 12), by = y - h / 2;
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

    /* 左上はハブへ戻るボタン用に空け、右上に調査進捗だけ出す。 */
    ctx.textAlign = 'right';
    ctx.fillStyle = st.surveyedCount >= W.RELICS.length ? '#8affd0' : '#ffe9a8';
    ctx.font = 'bold 18px "Yu Gothic UI",sans-serif';
    ctx.fillText('調査 ' + st.surveyedCount + ' / ' + W.RELICS.length, VW - 26, 34);

    /* 操作ヒント */
    ctx.fillStyle = 'rgba(175,220,230,0.82)';
    ctx.font = '14px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillText(Input.mode === 'touch'
      ? '左をドラッグで移動 ／ 右下のボタンで調べる・戻る'
      : 'A・D ／ ←→ で移動    E で調べる・戻る   （パッド: スティック + A）', VW - 26, 62);

    /* 対象プロンプト */
    if (st.near === 'relic'){
      let idx = -1, bd = 1e9;
      for (let i = 0; i < W.RELICS.length; i++){ const d = Math.abs(st.x - W.RELICS[i].x); if (d < bd){ bd = d; idx = i; } }
      const label = st.relicDone[idx] ? '調査済み' : '遺物を調べる';
      promptAt(W.RELICS[idx].x - cam, W.GROUND_Y - 257, label);
    } else if (st.near === 'exit'){
      promptAt(W.EXIT_X - cam, W.GROUND_Y - 234, '潜航へ戻る');
    }

    /* 一時メッセージ */
    if (st.msgT > 0){
      ctx.globalAlpha = clamp(st.msgT / 0.5, 0, 1);
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px "Yu Gothic UI","Hiragino Sans",sans-serif';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(st.msg, VW / 2, VH - 92);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function exploreButton(){
    const label = st.near === 'exit' ? '戻る' : '調べる';
    return { id: 'action', x: VW - 140, y: VH - 140, r: 74, label, col: '#ffe08a' };
  }

  function drawTouchUI(){
    const b = exploreButton();
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

    /* 移動スティック（潜航と同じ見た目を踏襲） */
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
    cam = clamp(st.x - VW * 0.45, 0, W.W - VW);

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#01060a';
    ctx.fillRect(0, 0, view.cssW, view.cssH);

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

    drawWater();
    drawFarCity();
    drawScrim();
    drawPillars(0.55, false);
    drawLampGlows();
    drawPillars(1.0, true);      // 舞台の手前側。調査員と遺物には重ねない。
    drawGround();
    drawRelics();
    drawExit();
    drawMotes();
    drawPlayer();
    drawCaveFrame();
    drawVignette();
    drawHUD();
    if (Input.mode === 'touch') drawTouchUI();

    ctx.restore();
  }

  /* ==================================================================
     潜航側の入口マーカー（render() から呼ぶ。潜航の描画関数には触らない）
     ================================================================== */
  function renderDiveEntrance(camX, camY, m){
    const x = m.x - camX, y = m.y - camY;
    if (x < -280 || x > VW + 280 || y < -280 || y > VH + 280) return;
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.0);

    ctx.save();
    /* 上へ伸びるビーコン（遠くからでも見える） */
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(x, y - 250, x, y + 30);
    beam.addColorStop(0, 'rgba(255,205,140,0)');
    beam.addColorStop(1, 'rgba(255,190,120,' + (0.16 * pulse).toFixed(3) + ')');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 26, y - 250); ctx.lineTo(x + 26, y - 250);
    ctx.lineTo(x + m.r, y + 20); ctx.lineTo(x - m.r, y + 20);
    ctx.closePath(); ctx.fill();
    const g = ctx.createRadialGradient(x, y, 4, x, y, m.r * 2.4);
    g.addColorStop(0, 'rgba(255,220,160,' + (0.5 * pulse).toFixed(2) + ')');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, m.r * 2.4, 0, TAU); ctx.fill();
    ctx.restore();

    /* ドック本体 */
    ctx.save();
    ctx.fillStyle = 'rgba(6,20,26,0.75)';
    ctx.beginPath(); ctx.arc(x, y, m.r - 14, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,150,0.9)'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(x, y, m.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,200,200,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, m.r - 14, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - m.r + 22, y); ctx.lineTo(x + m.r - 22, y);
    ctx.moveTo(x, y - m.r + 22); ctx.lineTo(x, y + m.r - 22);
    ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = 'rgba(232,250,255,0.94)';
    ctx.fillText('沈没都市 遺跡エアロック', x, y - m.r - 30);
    if (m.near){
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
      ctx.fillText(Input.mode === 'touch' ? '右のボタンで降艇' : 'E で降艇', x, y + m.r + 30);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(255,200,130,0.7)'; ctx.lineWidth = 3;
      const oy = (t * 46) % 30;
      ctx.beginPath();
      ctx.moveTo(x - 16, y - m.r - 74 - oy);
      ctx.lineTo(x, y - m.r - 58 - oy);
      ctx.lineTo(x + 16, y - m.r - 74 - oy);
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
    const b = exploreButton();
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
      frame: st.frame,
      moving: st.moving,
      near: st.near,
      relics: st.relicDone.slice(),
      surveyed: st.surveyedCount,
      msg: st.msg,
    };
  }

  return { enter, leave, reset, update, render, renderDiveEntrance, touchStart, state, isActive: () => active };
}
