/**
 * ABYSS DIVE — 透過マップ（ハイドログラフ風の縦断面）の描画と入力。
 *
 * 潜航の描画（game.js）には触れず、上に 1 枚重ねるだけの独立モジュール。
 * 地形は **本物**（海底の式・海溝 solids・岩）をそのまま読み、勝手な形を作らない。
 * 後から都市や背景を足すときは、getModel() が返す model に項目を足して
 * ここへ描き分けを足せばよい（game.js 側は最小のフックだけ）。
 *
 * これはモーダル。開いている間は呼び出し側（game.js）が潜航を止める。
 * ここは「見え方・拡大・パン・現在地へ戻る・閉じる」だけを持つ。
 */

import {
  MAP, WORLD_BOTTOM, siteName, depthLabel, depthMarks,
  mapProject, mapViewRect, clampMapScale, stepMapScale,
  clampMapCenter, recenterTo, panByDrag,
} from './map-rules.js?v=3';
import { BIOMES } from './world-biomes.js?v=3';


const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* パネル（論理座標 1280x720 内）。左は深度目盛り、右は操作。 */
const PANEL = { x: 108, y: 38, w: 1064, h: 596 };
const HEADER_H = 56;
const LEFT_W = 126;
const RIGHT_W = 248;
const FOOT_H = 66;
const ROOT = { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: PANEL.h };

function plotRect(){
  return {
    x: PANEL.x + LEFT_W,
    y: PANEL.y + HEADER_H,
    w: PANEL.w - LEFT_W - RIGHT_W,
    h: PANEL.h - HEADER_H - FOOT_H,
  };
}

/* 操作ボタン（矩形・論理座標）。右欄は上半分を凡例、下半分を ＋/− ボタンに分けて重なりを防ぐ。 */
function buttons(){
  const p = plotRect();
  const btnW = 84, btnH = 74, gap = 16;
  const rowX = p.x + p.w + (RIGHT_W - (btnW * 2 + gap)) / 2;
  const rowY = p.y + p.h - btnH - 22;
  return {
    close:    { x: PANEL.x + PANEL.w - 66, y: PANEL.y + 10, w: 56, h: 52, kind: 'close', label: '×' },
    plus:     { x: rowX, y: rowY, w: btnW, h: btnH, kind: 'plus', label: '＋' },
    minus:    { x: rowX + btnW + gap, y: rowY, w: btnW, h: btnH, kind: 'minus', label: '−' },
    recenter: { x: PANEL.x + 18, y: PANEL.y + PANEL.h - 66, w: 240, h: 62, kind: 'recenter', label: '⊗ 現在地へ戻る' },
  };
}

function inRect(x, y, r, pad){
  const pd = pad || 0;
  return x >= r.x - pd && x <= r.x + r.w + pd && y >= r.y - pd && y <= r.y + r.h + pd;
}

function roundRect(g, x, y, w, h, r){
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * opts = {
 *   ctx, VW, VH,
 *   getModel: () => model,     // 本物の地形・現在地・発見済み地点（毎フレーム）
 *   onRequestClose: () => void // 閉じるボタン・Esc で呼ぶ
 * }
 *
 * model = {
 *   time, player:{x,y,aim} | null, camX, camY,
 *   floorY, worldBottom, seaFloorY:(x)=>y,
 *   trench: {solids:[{x,y,w,h}], gorgeX0, gorgeX1, floorY, wallTop} | null,
 *   deepVisible: bool,
 *   rocks: [{x,y,r}],
 *   sites: [{id,x,y}],          // 発見済みだけ（game.js が絞る）
 *   entrance: {x,y} | null,
 *   bounds: {xMin,xMax,yMin,yMax},
 *   zoneName: (y)=>string,
 * }
 */
export function createDiveMap(opts){
  const ctx = opts.ctx;
  const VW = opts.VW, VH = opts.VH;
  const getModel = opts.getModel || (() => ({}));
  const onRequestClose = opts.onRequestClose || (() => {});

  let open = false;
  let animT = 0;
  let lastAction = null;
  const view = { cx: 0, cy: 0, scale: MAP.SCALE_DEFAULT, scaleTarget: MAP.SCALE_DEFAULT };
  let drag = null;                    // { id, x, y, moved }

  function modelBounds(m){
    const b = (m && m.bounds) || {};
    const bot = Number.isFinite(m && m.worldBottom) ? m.worldBottom : WORLD_BOTTOM;
    return {
      xMin: Number.isFinite(b.xMin) ? b.xMin : 0,
      xMax: Number.isFinite(b.xMax) ? b.xMax : 20000,
      yMin: Number.isFinite(b.yMin) ? b.yMin : 0,
      yMax: Number.isFinite(b.yMax) ? b.yMax : bot,
    };
  }

  function recenter(){
    const m = getModel() || {};
    const p = m.player;
    const pl = plotRect();
    view.scale = clampMapScale(view.scale);
    view.scaleTarget = view.scale;
    const c = recenterTo(p ? p.x : 0, p ? p.y : 0, view.scale, pl.w, pl.h, modelBounds(m));
    view.cx = c.cx; view.cy = c.cy;
    lastAction = 'recenter';
  }

  function zoom(dir){
    view.scaleTarget = stepMapScale(view.scaleTarget, dir);
    lastAction = (dir > 0 ? 'zoom-in' : 'zoom-out');
  }

  function panPanel(dx, dy){
    const m = getModel() || {};
    const pl = plotRect();
    const moved = panByDrag(view.cx, view.cy, dx, dy, view.scale);
    const c = clampMapCenter(moved.cx, moved.cy, view.scale, pl.w, pl.h, modelBounds(m));
    view.cx = c.cx; view.cy = c.cy;
    lastAction = 'pan';
  }

  function openMap(){
    open = true; drag = null; animT = 0;
    const m = getModel() || {};
    const p = m.player;
    const pl = plotRect();
    view.scale = MAP.SCALE_DEFAULT; view.scaleTarget = MAP.SCALE_DEFAULT;
    const c = recenterTo(p ? p.x : 0, p ? p.y : 0, view.scale, pl.w, pl.h, modelBounds(m));
    view.cx = c.cx; view.cy = c.cy;
    lastAction = 'open';
  }
  function closeMap(){ open = false; drag = null; }
  function isOpen(){ return open; }

  function update(dt){
    if (!open) return;
    animT += Number.isFinite(dt) ? dt : 0;
    /* 拡大率は滑らかに目標へ（＋/−の 1 段を即座に飛ばさない）。 */
    const diff = view.scaleTarget - view.scale;
    if (Math.abs(diff) > 1e-4){
      view.scale += diff * (1 - Math.exp(-14 * (Number.isFinite(dt) ? dt : 0)));
      const m = getModel() || {};
      const pl = plotRect();
      const c = clampMapCenter(view.cx, view.cy, view.scale, pl.w, pl.h, modelBounds(m));
      view.cx = c.cx; view.cy = c.cy;
    } else {
      view.scale = view.scaleTarget;
    }
  }

  /* --- 入力（論理座標） ------------------------------------------------ */

  function hitButton(x, y){
    const b = buttons();
    for (const key of ['close', 'plus', 'minus', 'recenter']){
      if (inRect(x, y, b[key], 0)) return b[key];
    }
    return null;
  }

  function pressButton(btn){
    if (!btn) return;
    if (btn.kind === 'close') onRequestClose();
    else if (btn.kind === 'plus') zoom(1);       // 拡大（世界を大きく見る）
    else if (btn.kind === 'minus') zoom(-1);     // 縮小（世界を広く見る）
    else if (btn.kind === 'recenter') recenter();
  }

  function pointerDown(id, x, y){
    const btn = hitButton(x, y);
    if (btn){ pressButton(btn); drag = null; return true; }
    if (inRect(x, y, plotRect(), 0)){ drag = { id, x, y }; lastAction = 'drag-start'; return true; }
    /* パネル内のその他（ヘッダ・フッタ）は飲む。 */
    if (inRect(x, y, ROOT, 0)) return true;
    return false;
  }
  function pointerMove(id, x, y){
    if (!drag || drag.id !== id) return false;
    panPanel(x - drag.x, y - drag.y);
    drag.x = x; drag.y = y;
    return true;
  }
  function pointerUp(id){
    if (drag && drag.id === id){ drag = null; return true; }
    return false;
  }

  function touchStart(e){
    let handled = false;
    for (const t of e.changedTouches){
      const p = toLog(t.clientX, t.clientY);
      if (pointerDown(t.identifier, p.x, p.y)) handled = true;
    }
    return handled;
  }
  function touchMove(e){
    for (const t of e.changedTouches) pointerMove(t.identifier, ...pt(t));
  }
  function touchEnd(e){
    for (const t of e.changedTouches) pointerUp(t.identifier);
  }
  function toLog(clientX, clientY){
    return { x: (clientX - opts.view.ox) / opts.view.scale, y: (clientY - opts.view.oy) / opts.view.scale };
  }
  function pt(t){ const p = toLog(t.clientX, t.clientY); return [p.x, p.y]; }

  /* マウス（PC 検証）。座標はすでに論理。 */
  function mouseDown(x, y){ return pointerDown('mouse', x, y); }
  function mouseMove(x, y){ return pointerMove('mouse', x, y); }
  function mouseUp(){ return pointerUp('mouse'); }

  /** キー。処理したら true。 */
  function key(code){
    if (!open) return false;
    if (code === 'Escape' || code === 'KeyP'){ onRequestClose(); return true; }
    if (code === 'Equal' || code === 'NumpadAdd' || code === 'KeyE'){ zoom(1); return true; }
    if (code === 'Minus' || code === 'NumpadSubtract' || code === 'KeyQ'){ zoom(-1); return true; }
    if (code === 'KeyR'){ recenter(); return true; }
    if (code === 'ArrowLeft'){ panPanel(60, 0); return true; }
    if (code === 'ArrowRight'){ panPanel(-60, 0); return true; }
    if (code === 'ArrowUp'){ panPanel(0, 60); return true; }
    if (code === 'ArrowDown'){ panPanel(0, -60); return true; }
    return false;
  }

  /* --- 描画 ------------------------------------------------------------ */

  function render(){
    if (!open) return;
    const m = getModel() || {};
    const pl = plotRect();
    const vs = { cx: view.cx, cy: view.cy, scale: view.scale, pw: pl.w, ph: pl.h };
    const vr = mapViewRect(vs);

    ctx.save();
    /* 潜航の上に薄く幕（モーダル）。 */
    ctx.fillStyle = 'rgba(2,10,16,0.55)';
    ctx.fillRect(0, 0, VW, VH);

    /* パネル地（ハイドログラフ風の半透明）。 */
    ctx.save();
    roundRect(ctx, ROOT.x, ROOT.y, ROOT.w, ROOT.h, 18);
    ctx.fillStyle = 'rgba(4,20,30,0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(130,205,235,0.55)';
    ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();

    /* 見出し（中央。左上の DOM の「もどる」ボタンと重ならない）。 */
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = '#dff4ff';
    ctx.fillText('航海図 — 縦断面', ROOT.x + ROOT.w * 0.5, ROOT.y + 30);
    ctx.textAlign = 'right';
    ctx.font = 'bold 17px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = 'rgba(170,220,240,0.8)';
    ctx.fillText('透過マップ  ×' + view.scale.toFixed(2), ROOT.x + ROOT.w - 84, ROOT.y + 32);

    /* プロット（地形）。 */
    ctx.save();
    roundRect(ctx, pl.x, pl.y, pl.w, pl.h, 8);
    ctx.clip();
    drawPlot(m, pl, vs, vr);
    ctx.restore();
    ctx.save();
    roundRect(ctx, pl.x, pl.y, pl.w, pl.h, 8);
    ctx.strokeStyle = 'rgba(120,190,225,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();

    /* 深度目盛り（左の欄）。 */
    drawDepthGutter(m, pl, vs);

    /* 操作ボタン。 */
    drawButtons(m);

    /* フッタ: 現在地情報と父の信号。 */
    drawFooter(m, pl, vs);

    ctx.restore();
  }

  function drawPlot(m, pl, vs, vr){
    /* 水域（半透明の青）で一面を塗る。地形はこの上に載せる。 */
    const wg = ctx.createLinearGradient(0, pl.y, 0, pl.y + pl.h);
    wg.addColorStop(0, 'rgba(30,90,120,0.34)');
    wg.addColorStop(0.55, 'rgba(14,52,74,0.36)');
    wg.addColorStop(1, 'rgba(4,16,26,0.5)');
    ctx.fillStyle = wg;
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);

    const seaY = (typeof m.seaFloorY === 'function') ? m.seaFloorY : (() => (Number.isFinite(m.floorY) ? m.floorY : 2600));
    const floorY = Number.isFinite(m.floorY) ? m.floorY : 2600;
    const bot = Number.isFinite(m.worldBottom) ? m.worldBottom : WORLD_BOTTOM;
    const t = m.trench || null;
    const deep = !!m.deepVisible && !!t;

    /* パネル内の投影（mapProject はプロット内の局所座標。描画はグローバルへ pl を足す）。 */
    const P = (wx, wy) => { const s = mapProject(wx, wy, vs); return { x: s.x + pl.x, y: s.y + pl.y }; };
    const px = wx => P(wx, 0).x;
    const py = wy => P(0, wy).y;
    /* 地形をどれだけ細かく辿るか（世界座標の刻み）。寄るほど細かく。 */
    const stepW = Math.max(20, Math.min(600, 24 / vs.scale));

    /* 岩盤（海底より下）。海溝が発見済みなら開口を掘る。 */
    const rockTop = (x) => seaY(x);
    ctx.fillStyle = '#0a161c';
    ctx.beginPath();
    let x0 = vr.x0, x1 = vr.x1;
    ctx.moveTo(px(x0), py(Math.min(bot, bot)));
    ctx.lineTo(px(x0), py(rockTop(x0)));
    for (let x = x0; x <= x1; x += stepW) ctx.lineTo(px(x), py(rockTop(x)));
    ctx.lineTo(px(x1), py(rockTop(x1)));
    if (deep){
      /* 左肩 → 左壁の内側 → 溝底 → 右壁の内側 → 右肩 */
      const gx0 = t.gorgeX0, gx1 = t.gorgeX1, ty = t.floorY;
      ctx.lineTo(px(gx0), py(t.wallTop));
      ctx.lineTo(px(gx0), py(ty));
      ctx.lineTo(px(gx1), py(ty));
      ctx.lineTo(px(gx1), py(t.wallTop));
    }
    ctx.lineTo(px(x1), py(bot + 400));
    ctx.lineTo(px(x0), py(bot + 400));
    ctx.closePath();
    ctx.fill();
    /* 地表の輪郭線。 */
    ctx.strokeStyle = 'rgba(150,205,225,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += stepW){ const X = px(x), Y = py(rockTop(x)); (x <= x0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y)); }
    ctx.stroke();

    /* 海溝・深棚下 2 分岐・合流広間の実地形（発見済みのみ表示）。 */
    if (deep){
      /* 発見済み深層バイオームの海域トーンを薄く敷く（水色・空間の違いを地図上でも読めるように） */
      if (t.biomes) {
        for (const id of ['trench_shelf', 'narrow_cave', 'hydrothermal', 'confluence_hall']) {
          const br = t.biomes[id];
          const bDef = BIOMES[id];
          if (!br || !bDef) continue;
          const p0 = P(br.x0, br.y0);
          const p1 = P(br.x1, br.y1);
          ctx.fillStyle = bDef.mapTint;
          ctx.fillRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
        }
      }
      /* 岩（壁・岩棚）。実 solids をそのまま矩形で描き、バイオーム別に枠色を変える。 */
      for (const s of t.solids){
        if (s.x + s.w < vr.x0 || s.x > vr.x1) continue;
        const a = P(s.x, s.y);
        const rw = Math.max(1, s.w * vs.scale);
        const rh = Math.max(1, s.h * vs.scale);
        ctx.fillStyle = s.biome === 'volcanic' ? 'rgba(34,20,16,0.96)' : (s.biome === 'cave' ? 'rgba(12,20,28,0.96)' : 'rgba(18,36,44,0.96)');
        ctx.fillRect(a.x, a.y, rw, rh);
        ctx.strokeStyle = s.biome === 'volcanic' ? 'rgba(218,128,78,0.52)' : (s.biome === 'hall' ? 'rgba(130,218,236,0.50)' : 'rgba(140,195,220,0.4)');
        ctx.lineWidth = 1;
        ctx.strokeRect(a.x + 0.5, a.y + 0.5, rw - 1, rh - 1);
      }
      /* 合流広間の底床ライン */
      if (Number.isFinite(t.deepFloorY)) {
        const fp0 = P(t.hallX0, t.deepFloorY);
        const fp1 = P(t.hallX1, t.deepFloorY);
        ctx.strokeStyle = 'rgba(130,220,238,0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(fp0.x, fp0.y); ctx.lineTo(fp1.x, fp1.y); ctx.stroke();
      }
    } else {
      /* 未探索の深部: ぼかした「未探索」帯だけ（詳細・地点は出さない）。 */
      ctx.save();
      const bandTop = py(floorY + 40);
      ctx.fillStyle = 'rgba(6,20,28,0.75)';
      ctx.fillRect(pl.x, bandTop, pl.w, pl.y + pl.h - bandTop);
      ctx.setLineDash([10, 9]);
      ctx.strokeStyle = 'rgba(120,170,190,0.35)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(pl.x + 1, bandTop + 1, pl.w - 2, pl.y + pl.h - bandTop - 2);
      ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = 'rgba(150,195,215,0.6)';
      ctx.fillText('深部 未探索', pl.x + pl.w / 2, (bandTop + pl.y + pl.h) / 2);
      ctx.restore();
    }

    /* 岩（実 solids・円）。 */
    if (Array.isArray(m.rocks)){
      for (const r of m.rocks){
        if (r.x + r.r < vr.x0 || r.x - r.r > vr.x1 || r.y + r.r < vr.y0 || r.y - r.r > vr.y1) continue;
        const a = P(r.x, r.y);
        ctx.fillStyle = 'rgba(28,52,62,0.85)';
        ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(1.5, r.r * vs.scale), 0, Math.PI * 2); ctx.fill();
      }
    }

    /* 発見済みの拠点・遺跡。 */
    for (const s of (m.sites || [])) drawSiteMark(s, vs, pl);

    /* 自艇（現在地）。 */
    const p = m.player;
    if (p && Number.isFinite(p.x)){
      const a = P(p.x, p.y);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(p.aim || 0);
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, -9); ctx.lineTo(-4, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(20,30,10,0.8)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
      /* 現在地の縦ガイド。 */
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(255,224,138,0.55)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(a.x, pl.y); ctx.lineTo(a.x, pl.y + pl.h); ctx.stroke();
      ctx.restore();
    }
  }

  function drawSiteMark(s, vs, pl){
    const q = mapProject(s.x, s.y, vs);
    const a = { x: q.x + pl.x, y: q.y + pl.y };
    const col = SITE_COL[s.id] || '#8fd8ff';
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = col;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = 'rgba(4,20,26,0.85)'; ctx.lineWidth = 1.5; ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
    const label = siteName(s.id);
    ctx.font = 'bold 15px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width + 14;
    let lx = a.x + 12, ly = a.y;
    if (lx + w > pl.x + pl.w) lx = a.x - 12 - w;
    ctx.fillStyle = 'rgba(6,20,26,0.8)';
    roundRect(ctx, lx, ly - 12, w, 24, 6); ctx.fill();
    ctx.fillStyle = col;
    ctx.fillText(label, lx + 7, ly + 1);
  }

  function drawDepthGutter(m, pl, vs){
    const bot = Number.isFinite(m.worldBottom) ? m.worldBottom : WORLD_BOTTOM;
    ctx.save();
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
    for (const y of depthMarks(bot)){
      const Y = mapProject(0, y, vs).y + pl.y;
      if (Y < pl.y + 8 || Y > pl.y + pl.h - 6) continue;
      ctx.strokeStyle = 'rgba(120,180,205,0.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pl.x, Y); ctx.lineTo(pl.x + pl.w, Y); ctx.stroke();
      ctx.fillStyle = 'rgba(170,215,235,0.7)';
      ctx.fillText(depthLabel(y), pl.x - 8, Y);
    }
    /* 海面は強調。 */
    const surfY = mapProject(0, 0, vs).y + pl.y;
    if (surfY >= pl.y && surfY <= pl.y + pl.h){
      ctx.strokeStyle = 'rgba(180,235,255,0.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(pl.x, surfY); ctx.lineTo(pl.x + pl.w, surfY); ctx.stroke();
    }
    ctx.restore();
  }

  /* 発見済みの地点ごとの色（凡例とマーカーで共用）。 */
  const SITE_COL = {
    'outpost-1': '#8affd0',
    'deepshelf': '#8fd8ff',
    'ruin-entrance': '#ffcf7a',
    'cave-route': '#9cb8d4',
    'volcanic-vent': '#ff9a5a',
    'confluence-hall': '#88e8ff',
    'mantle-upper': '#b4f2ff',
    'stingray-hull': '#ffd27a',
    'mark1-weld': '#9beeff',
  };

  function drawButtons(m){
    const b = buttons();
    for (const key of ['close', 'plus', 'minus', 'recenter']){
      const r = b[key];
      ctx.save();
      ctx.fillStyle = 'rgba(8,26,36,0.9)';
      roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(140,205,235,0.7)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#e6f6ff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (r.kind === 'recenter' ? 26 : 34) + 'px "Yu Gothic UI",sans-serif';
      ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.restore();
    }
    /* 凡例（右欄の上半分）。発見済みの地点だけを並べる＝未発見の存在を漏らさない。 */
    const p = plotRect();
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px "Yu Gothic UI",sans-serif';
    let y = p.y + 18;
    /* 自艇（向きのある三角マーカー）。 */
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(p.x + p.w + 28, y); ctx.lineTo(p.x + p.w + 15, y - 7); ctx.lineTo(p.x + p.w + 15, y + 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,232,245,0.9)';
    ctx.fillText('自艇 現在地', p.x + p.w + 35, y + 1);
    y += 26;
    for (const s of (m && m.sites) || []){
      const col = SITE_COL[s.id] || '#8fd8ff';
      ctx.save();
      ctx.translate(p.x + p.w + 21, y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = col; ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = 'rgba(4,20,26,0.8)'; ctx.lineWidth = 1.2; ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
      ctx.fillStyle = 'rgba(200,232,245,0.9)';
      ctx.fillText(siteName(s.id), p.x + p.w + 35, y + 1);
      y += 26;
    }
    ctx.restore();
  }

  function drawFooter(m, pl, vs){
    const p = m.player;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = '#dff4ff';
    const zone = (typeof m.zoneName === 'function' && p) ? (' ／ ' + m.zoneName(p.y)) : '';
    ctx.fillText(p ? ('現在地  深度 ' + depthLabel(p.y) + zone) : '潜航していません', PANEL.x + 210, PANEL.y + PANEL.h - 32);

    /* 父の信号: ストーリー上「はるか下」から。下向きだけを示す（位置は出さない）。 */
    const cx = pl.x + pl.w / 2;
    const by = PANEL.y + PANEL.h - 46;
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Yu Gothic UI","Hiragino Sans",sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('◇ 父の信号 ・ はるか下 から', cx, by);
    /* 下向きの矢（ゆっくり明滅）。 */
    const ph = 0.5 + 0.5 * Math.sin(animT * 3.0);
    ctx.globalAlpha = 0.45 + 0.45 * ph;
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++){
      const ay = by + 16 + i * 8;
      ctx.beginPath();
      ctx.moveTo(cx - 12, ay); ctx.lineTo(cx, ay + 8); ctx.lineTo(cx + 12, ay);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function state(){
    return {
      open, scale: +view.scale.toFixed(4), scaleTarget: +view.scaleTarget.toFixed(4),
      cx: Math.round(view.cx), cy: Math.round(view.cy), dragging: !!drag, lastAction,
    };
  }

  return {
    open: openMap, close: closeMap, isOpen, update, render,
    touchStart, touchMove, touchEnd,
    mouseDown, mouseMove, mouseUp, key,
    recenter, zoom, panPanel, state,
    panel: ROOT, buttons,
  };
}
