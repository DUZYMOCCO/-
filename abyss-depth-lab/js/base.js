/**
 * ABYSS DIVE — 海底基地の描画・入力（室内）と、潜航側の外観マーカー
 *
 * v1.10.0: 最初のボスの先の入港可能な前哨基地。室内は倉庫 hangar.webp から横持ちに必要な帯を
 *   切り出して格納庫にし、スーツなしのエリー（GIRL idle/walk）が待機・歩行、船に戻れば出港。
 *
 * v1.11.0:
 *   - 潜航側の外観を「単一の四角い塊」から、岩盤に沿って並ぶ複数の耐圧モジュール
 *     （円筒・リブ・梁・接岸口・導灯）へ作り替える。濁った青緑の外海に、局所的な暖色の
 *     作業灯だけを置く（全体を高コントラストで塗らない）。進入灯 → 外壁（モジュール群）
 *     → 暖色の入港ドック の段階表示はそのまま。
 *   - 格納庫の縮尺を修正。潜水艇を、エリーを搭載できる大きさ（船体がエリーの約2倍目安）と
 *     長さで接岸させる。エリーと艇の接地ラインは同じ床に揃え、整備架台と作業灯で停泊を示す。
 *   - 船のそば（船首寄り）に整備端末。近づいて整備を開くと、船体修理と 7 項目の改造を
 *     資源で購入できる。選択／確認／閉じるは出港と別の操作（パネルを閉じてから出港）。
 *
 * 純粋ルールは base-rules.js（室内メニュー・背景のエリー）と upgrade-rules.js（整備）。
 * ここは描画と入力の割り当てだけ。
 *
 * v1.16.0:
 *   - 徒歩で設備まで歩く方式をやめ、入港直後に親メニュー（整備・改造 / 艇の換装 /
 *     武器（製作・換装） / 出港）を出す。子メニュー（既存パネル）を閉じると親へ戻る。
 *     選択（カーソル）と実行（決定）は別操作＝誤出港しない。出港は他と明確に分離。
 *   - エリーは操作対象ではなく背景で自律行動する（base-rules の stepEllie）。既存の
 *     idle / walk だけで、待つ・歩く・周囲を見る・設備を点検する。操作・資源・装備・
 *     出港には影響しない。子メニュー中も止めない。
 *   - 親メニューと整備・艇・武器の各パネルを共通のスチームパンク風の外装
 *     （drawPanelChrome: 黒鉄の地＋擦れた真鍮の多重枠・四隅リベット・彫刻銘板・
 *     目盛り/ゲージ・小さな装飾歯車・琥珀の選択インジケータ）へ。70℃ の青ホロは
 *     情報表示の内側に残す。文字・価格・選択・確認と装飾は重ねない。タッチ領域は縮めない。
 */
import { BASE_WORLD as W, createBaseState, stepEllie, menuMove, menuSelected, BASE_MENU,
  BASE_UI, menuActionLabel, rowActionLabel, ACTION_KEY_HINT } from './base-rules.js?v=9';
import { shipDef, SHIP_ORDER } from './ship-rules.js?v=1';
import { drawShipRig, drawShipBody, hasBespokeHull } from './ship-rig.js?v=3';
import { itemShort, qualityColor, statDisplay, WEAPON_TYPES, manufactureCost } from './weapon-rules.js?v=5';
/* v1.17.0: 弾体・軌跡・近接/レーザーの形（実戦 game.js の drawTorpedoShape/drawMissileShot と同形を共有）。 */
import { drawProjectileShape, drawTrajectoryIcon, drawBeamIcon, drawReflectIcon, drawMeleeShape, normalizedPattern } from './projectile-shapes.js?v=1';
/* v1.19.0: 製作/開発の成功結果モーダル（実ロールをそのまま出す純粋モデル）。 */
import { craftResultTitle, openCraftResult } from './craft-result.js?v=2';

const TAU = Math.PI * 2;
const wrap01 = v => ((v % 1) + 1) % 1;
const d2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/* v1.19.0: 基地 UI の書体は 1 か所に集約（サイズは BASE_UI.fonts）。 */
const FF = '"Yu Gothic UI","Hiragino Sans",sans-serif';
const font = (px, bold = true) => (bold ? 'bold ' : '') + px + 'px ' + FF;
function roundRect(g, x, y, w, h, r){
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/* 横倒しの円筒（耐圧モジュール）のパス。左右が丸いカプセル。 */
function cylinderPath(g, cx, cy, rx, ry){
  const r = Math.min(ry, rx);
  g.beginPath();
  g.moveTo(cx - rx + r, cy - r);
  g.lineTo(cx + rx - r, cy - r);
  g.arc(cx + rx - r, cy, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(cx - rx + r, cy + r);
  g.arc(cx - rx + r, cy, r, Math.PI / 2, Math.PI * 1.5);
  g.closePath();
}

/* GIRL（エリー）のアトラス。倉庫 chars/GIRL の m60（frame 104x66、足元アンカー 52,64.4）。 */
const GIRL = {
  frameW: 104, frameH: 66, idleCols: 4, walkCols: 12,
  anchorX: 52, anchorY: 64.4, scale: 1.35,
};
const IDLE_SEQ = [0, 1, 2, 1, 0, 3];   // frames.json の idle sequence
const IDLE_FPS = 3;

/* v1.11.0: 潜水艇の縮尺。船体ハルがエリーの約 2 倍の高さになる大きさで接岸させる。
   スプライトは 512x200、船体ハルの下端は y≈185/200、船体ハルは高さの約 55% を占める。 */
const SUB = (() => {
  const ellieH = 81;                                         // シートの透明余白を除いた表示上の全高
  const hullFrac = 0.55;                                     // スプライト高さに対する船体ハルの割合
  const h = Math.round(2 * ellieH / hullFrac / 10) * 10;    // 船体 ≈ 2 × エリー
  const w = Math.round(h * (512 / 200));
  const bottomFrac = 185 / 200;                              // 船体ハルの下端（接地）
  const rightX = 820;                                        // 船首（右端）。艇の全体が画面に収まる
  return { h, w, bottomFrac, leftX: rightX - w, rightX, ellieH };
})();

export function createBase(opts){
  const ctx = opts.ctx;
  const view = opts.view;
  const VW = opts.VW, VH = opts.VH;
  const Input = opts.Input;
  const toLogical = opts.toLogical || ((x, y) => ({ x, y }));
  const art = opts.art || {};
  const onDepart = opts.onDepart || function(){};
  const panel = opts.panel || null;                 // v1.11.0: 整備・改造パネル
  const shipPanel = opts.shipPanel || null;         // v1.13.0: 艇選択（乗り換え）パネル
  const weaponPanel = opts.weaponPanel || null;     // v1.15.0: 武器製作台（製造・換装）パネル
  const forgePanel = opts.forgePanel || null;       // v1.16.0: 指定開発（追加兵装・全自動近接）パネル
  const currentShip = opts.ship || (() => '09');    // v1.13.0: 現在の艇 id
  const balance = opts.balance || (() => 0);        // v1.11.0: 所持資源
  const ready = img => !!(img && img.complete && img.naturalWidth > 0);

  let st = createBaseState();
  let t = 0;
  let active = false;
  let pendingAction = false;
  const prevNav = { up:false, down:false, esc:false, discard:false, enhance:false, padV:false, left:false, right:false };

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
    st.msg = '船内インターミッション — 整備・開発'; st.msgT = 2.2;
    pendingAction = false;
    prevNav.up = prevNav.down = prevNav.esc = false;
    prevNav.discard = false;
    prevNav.enhance = false;
    prevNav.padV = false;
    if (panel) panel.close();
    if (shipPanel) shipPanel.close();
    if (weaponPanel) weaponPanel.close();
    if (forgePanel) forgePanel.close();
    t = 0;
  }
  function enter(){ active = true; clearTransient(); }
  function leave(){ active = false; pendingAction = false; if (panel) panel.close(); if (shipPanel) shipPanel.close(); if (weaponPanel) weaponPanel.close(); if (forgePanel) forgePanel.close(); }
  function reset(){ st = createBaseState(); if (active) clearTransient(); }

  /* 開いている子メニュー（整備／艇／武器／開発）。無ければ null。 */
  function openChild(){
    return (panel && panel.isOpen()) ? panel
      : ((shipPanel && shipPanel.isOpen()) ? shipPanel
      : ((weaponPanel && weaponPanel.isOpen()) ? weaponPanel
      : ((forgePanel && forgePanel.isOpen()) ? forgePanel : null)));
  }
  /* 子メニューを閉じたあとは親メニューへ戻る（画面の状態だけ戻す）。 */
  function backToMenu(){ st.screen = 'menu'; }

  /* 親メニューの「決定」＝選択中の項目を実行する（項目を開く／出港）。 */
  function activateMenu(){
    const item = menuSelected(st);
    if (!item) return;
    if (item.id === 'upgrade' && panel){ st.screen = 'upgrade'; panel.open(); }
    else if (item.id === 'ship' && shipPanel){ st.screen = 'ship'; shipPanel.open(); }
    else if (item.id === 'weapon' && weaponPanel){ st.screen = 'weapon'; weaponPanel.open(); }
    else if (item.id === 'forge' && forgePanel){ st.screen = 'forge'; forgePanel.open(); }
    else if (item.id === 'depart'){ onDepart(); }
  }

  /* 親メニューでその項目が選ばれている（または子メニューを開いている）とき、対応する設備を仄かに強調する。 */
  function menuHighlight(id){
    const sel = menuSelected(st);
    return st.screen === 'menu' && !!(sel && sel.id === id);
  }

  function update(dt){
    if (!active) return;
    t += dt;
    st.msgT = Math.max(0, st.msgT - dt);

    /* v1.16.0: 背景のエリーは操作と独立に、常に自律行動する（子メニュー中も止めない）。 */
    stepEllie(st.ellie, dt);

    /* 子メニューが閉じていれば親メニューへ戻す（× でフレーム外に閉じた場合も含む）。 */
    if (!openChild() && st.screen !== 'menu') backToMenu();

    const up = !!(Input.keys['KeyW'] || Input.keys['ArrowUp']);
    const down = !!(Input.keys['KeyS'] || Input.keys['ArrowDown']);
    const esc = !!Input.keys['Escape'];
    const action = pendingAction || Input.wantDock || !!(Input.pad && Input.pad.actionEdge);
    Input.wantDock = false; pendingAction = false;

    /* --- v1.19.0: 製作/開発の結果モーダル中。背後（選択/決定/キー/押しっぱなし/連打）を
           一切通さない（二重製作を防ぐ）。閉じるのは Esc か「閉じる」ボタンだけ。
           製作キー（E）は閉じるにも使わない＝連打しても次を作らない。自動では消えない。 --- */
    if (st.craftResult){
      if (esc && !prevNav.esc) st.craftResult = null;
      prevNav.up = up; prevNav.down = down; prevNav.esc = esc;
      return;
    }

    /* --- 子メニュー（整備／艇／武器）を開いている間は、その操作だけ（選択／決定／閉じる）。
           選択と実行は分ける（決定だけが買う・換装する）。閉じたら親メニューへ戻る。 --- */
    const openNav = openChild();
    if (openNav){
      if (up && !prevNav.up) openNav.move(-1);
      if (down && !prevNav.down) openNav.move(1);
      prevNav.up = up; prevNav.down = down;
      /* Esc: 開発の設計画面なら一覧へ戻る（閉じは × ボタン）。他は閉じる（閉じたら親へ戻る）。 */
      if (esc && !prevNav.esc){
        if (openNav === forgePanel && openNav.screen && openNav.screen() === 'design' && openNav.back) openNav.back();
        else openNav.close();
      }
      prevNav.esc = esc;
      /* 武器パネルの「強化」「捨てる」（整理）。標準装備・上限は無消費（パネル側で担保）。 */
      if (openNav === weaponPanel){
        const disc = !!(Input.keys['KeyX'] || Input.keys['Delete']);
        if (disc && !prevNav.discard) openNav.discard();
        prevNav.discard = disc;
        const enh = !!Input.keys['KeyC'];
        if (enh && !prevNav.enhance) openNav.enhance();
        prevNav.enhance = enh;
      }
      /* 開発パネル: 設計画面は左右（←→/A D）で値を選ぶ。強化は C（所持品を選択中のみ）。 */
      if (openNav === forgePanel){
        const design = !!(openNav.screen && openNav.screen() === 'design');
        const left = !!(Input.keys['ArrowLeft'] || Input.keys['KeyA']);
        const right = !!(Input.keys['ArrowRight'] || Input.keys['KeyD']);
        if (design && left && !prevNav.left) openNav.adjust(-1);
        if (design && right && !prevNav.right) openNav.adjust(1);
        prevNav.left = left; prevNav.right = right;
        const enh = !!Input.keys['KeyC'];
        if (enh && !prevNav.enhance && openNav.enhance) openNav.enhance();
        prevNav.enhance = enh;
      }
      if (action && openNav.activate){
        /* v1.19.0: 通常製作/指定開発が成功し保存された時だけ結果モーダルを開く（装備・強化・売却は開かない）。 */
        const res = openNav.activate();
        if (res && res.ok && (res.type === 'make' || res.type === 'design')) openCraftResult(st, res);
      }
      if (!openNav.isOpen()) backToMenu();          // 閉じたら親へ
      return;
    }
    prevNav.up = prevNav.down = prevNav.esc = false;
    prevNav.discard = false;
    prevNav.enhance = false;
    prevNav.left = prevNav.right = false;

    /* --- 親メニュー: 上下で選択、決定で実行。出港は他と分離した項目。 --- */
    let dir = 0;
    if (up && !prevNav.up) dir -= 1;
    if (down && !prevNav.down) dir += 1;
    prevNav.up = up; prevNav.down = down;
    /* ゲームパッドの上下（スティック/十字キー）も選択に使える。 */
    const padV = Input.pad ? Math.abs(Input.pad.y || 0) > 0.5 : false;
    if (padV && !prevNav.padV) dir += (Input.pad.y < 0 ? -1 : 1);
    prevNav.padV = padV;
    if (dir) menuMove(st, dir);

    if (action) activateMenu();
  }

  /* ==================================================================
     室内の描画
     ================================================================== */
  /* ==================================================================
     施設の造作（v1.11.0）: 天井の鉄骨トラス・循環配管、頑丈な金属エアロック、
     短い減圧蒸気、整備の痕跡。倉庫ではなく「動いている前哨基地」に見せる。
     ================================================================== */

  /* 天井の鉄骨トラス（I形鋼）と、使い込んだ循環配管（3系統）。 */
  function drawCeilingRig(){
    ctx.save();
    /* 上端の暗がりで梁を浮かせる */
    const tg = ctx.createLinearGradient(0, 0, 0, 150);
    tg.addColorStop(0, 'rgba(3,12,16,0.72)');
    tg.addColorStop(1, 'rgba(3,12,16,0)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, VW, 150);

    /* 主トラス */
    const by = 58, bh = 26;
    ctx.fillStyle = 'rgb(15,29,37)';
    ctx.fillRect(0, by, VW, bh);
    ctx.fillStyle = 'rgba(86,128,140,0.42)';
    ctx.fillRect(0, by, VW, 3);
    ctx.fillStyle = 'rgba(2,7,10,0.72)';
    ctx.fillRect(0, by + bh - 4, VW, 4);
    for (let x = 46; x < VW; x += 132){
      ctx.fillStyle = 'rgb(20,38,47)';
      ctx.fillRect(x, by - 6, 11, bh + 12);
      ctx.fillStyle = 'rgba(96,140,152,0.36)';
      ctx.fillRect(x, by - 6, 2, bh + 12);
      for (let k = 0; k < 3; k++){
        ctx.fillStyle = 'rgba(150,188,198,0.5)';
        ctx.beginPath(); ctx.arc(x + 5.5, by + 6 + k * 8, 1.6, 0, TAU); ctx.fill();
      }
    }

    /* 吊り下げケーブル束 */
    ctx.strokeStyle = 'rgba(12,24,30,0.9)'; ctx.lineWidth = 3;
    for (const cx of [300, 706, 1052]){
      ctx.beginPath();
      ctx.moveTo(cx - 62, by + bh);
      ctx.quadraticCurveTo(cx, by + bh + 48, cx + 62, by + bh);
      ctx.stroke();
    }

    /* 循環配管（太い主管 → 冷却管 → 蒸気管）。冷色のハイライトで浮かせる。 */
    const pipes = [[96, 8], [116, 5], [132, 5]];
    for (const [py, thick] of pipes){
      const grad = ctx.createLinearGradient(0, py - thick, 0, py + thick);
      grad.addColorStop(0, 'rgb(66,100,110)');
      grad.addColorStop(0.36, 'rgb(30,52,62)');
      grad.addColorStop(1, 'rgb(11,22,28)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, py - thick, VW, thick * 2);
      ctx.fillStyle = 'rgba(158,210,226,0.4)';
      ctx.fillRect(0, py - thick, VW, 1.5);
      ctx.fillStyle = 'rgba(2,7,10,0.6)';
      ctx.fillRect(0, py + thick - 2, VW, 2);
      for (let x = 74; x < VW; x += 168){
        ctx.fillStyle = 'rgb(22,40,50)';
        ctx.fillRect(x - 4, py - thick - 5, 9, thick * 2 + 10);
        ctx.fillStyle = 'rgba(120,164,176,0.4)';
        ctx.fillRect(x - 4, py - thick - 5, 2, thick * 2 + 10);
      }
    }

    /* 吊り下げのケージランタン（暖色・局所）。鎖がわずかに揺れる＝稼働の気配。 */
    for (const lx of [430, 906]){
      const sway = Math.sin(t * 1.3 + lx * 0.013) * 3;
      ctx.strokeStyle = 'rgba(20,36,44,0.92)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, by + bh); ctx.lineTo(lx + sway, 152); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(lx + sway, 158, 1, lx + sway, 158, 118);
      g.addColorStop(0, 'rgba(255,206,140,0.32)');
      g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx + sway, 158, 118, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,226,170,0.92)';
      ctx.beginPath(); ctx.arc(lx + sway, 158, 4, 0, TAU); ctx.fill();
      /* ケージ */
      ctx.strokeStyle = 'rgba(24,44,54,0.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(lx + sway, 158, 9, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  /* 頑丈な金属エアロック（右壁の隔壁扉）。厚い枠・丁番・敷居・ドアの継ぎ目・
     ハンドルホイール・黄黒の警戒帯・青い気密シールと暖色の状態灯。 */
  function drawAirlock(){
    const gy = W.GROUND_Y;
    const w = 168, h = 316, x0 = VW - 190, y0 = gy - h;
    const fx = x0 + 14, fy = y0 + 18, fw = w - 28, fh = h - 18;   // 扉本体（開口）
    ctx.save();
    /* 壁面の土台（暗がりから扉を分離） */
    ctx.fillStyle = 'rgba(4,11,15,0.92)';
    roundRect(ctx, x0 - 16, y0 - 16, w + 30, h + 18, 8); ctx.fill();

    /* 厚い枠（外枠 → 内枠） */
    ctx.strokeStyle = 'rgb(23,42,52)'; ctx.lineWidth = 24;
    roundRect(ctx, x0, y0, w, h, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(104,150,164,0.55)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(6,14,18,0.9)'; ctx.lineWidth = 6;
    roundRect(ctx, fx - 3, fy - 3, fw + 6, fh + 6, 4); ctx.stroke();

    /* まぐさ（上部の梁）と敷居 */
    ctx.fillStyle = 'rgb(28,50,60)';
    roundRect(ctx, x0 - 6, y0 - 20, w + 12, 20, 3); ctx.fill();
    ctx.fillStyle = 'rgba(120,166,180,0.45)';
    ctx.fillRect(x0 - 6, y0 - 20, w + 12, 3);
    ctx.fillStyle = 'rgb(30,52,62)';
    roundRect(ctx, fx - 8, gy - 12, fw + 16, 14, 3); ctx.fill();
    ctx.fillStyle = 'rgba(150,188,198,0.4)';
    ctx.fillRect(fx - 8, gy - 12, fw + 16, 2);

    /* 扉本体 */
    const dg = ctx.createLinearGradient(fx, 0, fx + fw, 0);
    dg.addColorStop(0, 'rgb(30,52,62)');
    dg.addColorStop(0.5, 'rgb(19,36,44)');
    dg.addColorStop(1, 'rgb(12,25,31)');
    ctx.fillStyle = dg;
    roundRect(ctx, fx, fy, fw, fh, 4); ctx.fill();
    /* 内側の面（はめ込みパネル） */
    ctx.strokeStyle = 'rgba(96,138,150,0.4)'; ctx.lineWidth = 1.6;
    roundRect(ctx, fx + 12, fy + 12, fw - 24, fh - 24, 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(6,14,18,0.7)'; ctx.lineWidth = 1.2;
    roundRect(ctx, fx + 15, fy + 15, fw - 30, fh - 30, 3); ctx.stroke();
    /* 縦のドアの継ぎ目（2枚観音開き） */
    ctx.fillStyle = 'rgba(6,14,18,0.75)';
    ctx.fillRect(x0 + w / 2 - 2, fy + 4, 4, fh - 8);
    ctx.fillStyle = 'rgba(120,164,176,0.28)';
    ctx.fillRect(x0 + w / 2 - 3, fy + 4, 1, fh - 8);
    /* 縁のボルト */
    ctx.fillStyle = 'rgba(158,196,206,0.6)';
    for (let yy = fy + 16; yy < fy + fh - 10; yy += 22){
      for (const bx of [fx + 8, fx + fw - 8]){ ctx.beginPath(); ctx.arc(bx, yy, 2, 0, TAU); ctx.fill(); }
    }
    /* 丁番（右側・3連） */
    for (const hy of [fy + 24, fy + fh / 2, fy + fh - 30]){
      ctx.fillStyle = 'rgb(34,58,68)';
      roundRect(ctx, fx + fw - 6, hy - 8, 16, 16, 3); ctx.fill();
      ctx.fillStyle = 'rgba(150,188,198,0.5)';
      ctx.beginPath(); ctx.arc(fx + fw + 2, hy, 2.4, 0, TAU); ctx.fill();
    }

    /* 黄黒の警戒帯（下端） */
    ctx.save();
    roundRect(ctx, fx + 10, gy - 46, fw - 20, 22, 3); ctx.clip();
    for (let s = -24; s < fw + 24; s += 18){
      ctx.fillStyle = 'rgba(200,166,72,0.85)';
      ctx.beginPath();
      ctx.moveTo(x0 + s, gy - 46);
      ctx.lineTo(x0 + s + 9, gy - 46);
      ctx.lineTo(x0 + s + 9 - 22, gy - 24);
      ctx.lineTo(x0 + s - 22, gy - 24);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    /* ハンドルホイール（左扉の内寄り） */
    const hx = x0 + w * 0.36, hy = fy + fh * 0.46, hr = 27;
    ctx.strokeStyle = 'rgb(36,60,70)'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,188,198,0.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke();
    for (let k = 0; k < 4; k++){
      const a = k * Math.PI / 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(hx - Math.cos(a) * hr, hy - Math.sin(a) * hr);
      ctx.lineTo(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgb(24,44,54)';
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, TAU); ctx.fill();

    /* 青い気密シールのライン（枠と扉の合わせ目） */
    ctx.strokeStyle = 'rgba(120,214,240,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx, fy + 6); ctx.lineTo(fx + fw, fy + 6); ctx.stroke();
    /* 状態灯（暖色・局所） */
    const pulse = 0.7 + 0.3 * Math.sin(t * 2.0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,190,110,' + (0.9 * pulse).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x0 + w - 26, y0 + 22, 3.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* 短い減圧蒸気（基地内部のみ）。濃霧にはしない。局所・短命・低アルファ。 */
  function drawSteam(){
    const srcs = [
      { x: VW - 178, y: 452, dir: -1, s: 1.0 },   // エアロックの気密シール
      { x: 300, y: 138, dir: 1, s: 0.85 },         // 配管の継手
      { x: 1052, y: 138, dir: -1, s: 0.75 },
      { x: 906, y: 150, dir: 1, s: 0.5 },          // ランタン横の排気
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let si = 0; si < srcs.length; si++){
      const src = srcs[si];
      for (let i = 0; i < 4; i++){
        const ph = wrap01(t * (0.20 + si * 0.03) + i / 4);
        const life = Math.sin(ph * Math.PI);
        if (life <= 0.03) continue;
        const rise = ph * 100 * src.s;
        const x = src.x + src.dir * rise * 0.45 + Math.sin(ph * 7 + i * 2.1) * 10;
        const y = src.y - rise;
        const r = (15 + ph * 66) * src.s;
        const a = 0.12 * life * src.s;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, 'rgba(202,234,240,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(150,200,210,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* 生活／整備の痕跡（小さめ・暗め。読みやすさを最優先で邪魔しない）。 */
  function drawTraces(){
    const gy = W.GROUND_Y;
    ctx.save();
    /* 工具箱（暖色のリムで金属の面を拾う） */
    const bx = 1044, bw = 40, bh = 26;
    ctx.fillStyle = 'rgb(20,34,40)';
    roundRect(ctx, bx - bw / 2, gy - bh, bw, bh, 3); ctx.fill();
    ctx.fillStyle = 'rgba(120,168,180,0.4)';
    ctx.fillRect(bx - bw / 2, gy - bh, bw, 2);
    ctx.strokeStyle = 'rgba(150,110,70,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, gy - bh * 0.55); ctx.lineTo(bx + bw / 2, gy - bh * 0.55); ctx.stroke();
    ctx.fillStyle = 'rgba(196,150,96,0.5)';
    ctx.fillRect(bx - 4, gy - bh - 6, 8, 6);
    /* 床に寝かせたホース（緩い曲線） */
    ctx.strokeStyle = 'rgba(16,30,36,0.9)'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(842, gy + 3);
    ctx.bezierCurveTo(872, gy - 8, 912, gy + 10, 946, gy + 1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(96,140,152,0.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(842, gy + 2);
    ctx.bezierCurveTo(872, gy - 9, 912, gy + 9, 946, gy);
    ctx.stroke();
    ctx.restore();
  }

  function drawInterior(){
    const plate = ensurePlate();
    if (plate) ctx.drawImage(plate, 0, 0, VW, VH);
    else { ctx.fillStyle = '#07242c'; ctx.fillRect(0, 0, VW, VH); }

    drawCeilingRig();
    drawAirlock();

    /* 暖色の作業灯（格納庫の灯）— 局所的に。全体は照らさない */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of [[500, 232], [742, 196], [1010, 244]]){
      const pulse = 0.82 + 0.18 * Math.sin(t * 1.8 + l[0] * 0.01);
      const r = 158 * pulse;
      const g = ctx.createRadialGradient(l[0], l[1], 2, l[0], l[1], r);
      g.addColorStop(0, 'rgba(255,196,120,0.40)');
      g.addColorStop(0.5, 'rgba(255,152,72,0.12)');
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

  /* v1.11.0: 停泊を示す整備架台（クレードル）。船体の手前に描き、下から抱える。 */
  function drawCradle(){
    const gy = W.GROUND_Y;
    ctx.save();
    for (const cx of [260, 480, 660]){
      const w = 64, h = 36;
      ctx.fillStyle = 'rgb(11,24,30)';
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 - 10, gy);
      ctx.lineTo(cx - w / 2 + 8, gy - h);
      ctx.lineTo(cx + w / 2 - 8, gy - h);
      ctx.lineTo(cx + w / 2 + 10, gy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(44,72,84,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgb(46,74,86)';
      ctx.fillRect(cx - w / 2 + 4, gy - h - 6, w - 8, 10);
      ctx.fillStyle = 'rgba(120,168,182,0.5)';
      ctx.fillRect(cx - w / 2 + 4, gy - h - 6, w - 8, 3);
      ctx.fillStyle = 'rgba(150,200,215,0.5)';
      for (let k = -1; k <= 1; k++){ ctx.beginPath(); ctx.arc(cx + k * 18, gy - h + 18, 2.4, 0, TAU); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const lx of [150, 570, 780]){
      const g = ctx.createRadialGradient(lx, gy - 6, 1, lx, gy - 6, 130);
      g.addColorStop(0, 'rgba(255,190,110,0.34)');
      g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, gy - 6, 130, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawShip(){
    const img = art.sub;
    const x = SUB.leftX, y = W.GROUND_Y - SUB.h * SUB.bottomFrac;
    /* 接岸の灯（船体のそばの暖色。局所） */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(SUB.rightX - 150, W.GROUND_Y - 150, 6, SUB.rightX - 150, W.GROUND_Y - 150, 300);
    g.addColorStop(0, 'rgba(255,200,130,0.18)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(SUB.rightX - 150, W.GROUND_Y - 150, 300, 0, TAU); ctx.fill();
    ctx.restore();
    if (hasBespokeHull(currentShip())){
      /* v1.20.0: 火力型は専用の船体（09 素材に箱/筒を貼らない）。格納庫の床に接して置く。 */
      const Wd = SUB.w * 0.94, H = Wd / 3.1;
      ctx.save();
      ctx.shadowColor = 'rgba(255,180,110,0.30)'; ctx.shadowBlur = 16;
      ctx.translate(x + SUB.w * 0.5, y + SUB.h * 0.925 - 0.54 * H);
      drawShipBody(ctx, currentShip(), Wd, H, { glow: true });
      ctx.restore();
    } else if (ready(img)){
      ctx.save();
      ctx.shadowColor = 'rgba(255,180,110,0.30)'; ctx.shadowBlur = 16;
      ctx.drawImage(img, x, y, SUB.w, SUB.h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#14303c'; ctx.fillRect(x, y, SUB.w, SUB.h);
      ctx.strokeStyle = 'rgba(150,220,210,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, SUB.w, SUB.h);
    }
    /* v1.13.0: 艇の差分（格納庫でも形で見分ける）。09 と火力型（専用船体）は何も足さない。 */
    if (currentShip() !== '09' && !hasBespokeHull(currentShip())){
      ctx.save();
      ctx.translate(x + SUB.w * 0.5, y + SUB.h * 0.65);
      drawShipRig(ctx, currentShip(), SUB.w * 0.86, SUB.h * 0.52);
      ctx.restore();
    }
    /* 乗り込み口の灯（船体の右寄り・船首側） */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,220,160,0.85)';
    ctx.beginPath(); ctx.arc(SUB.rightX - 150, W.GROUND_Y - 150, 5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* v1.11.0: 整備端末（船のそばの船首寄り）。無骨な金属筐体の上に、
     青いホログラムのスクリーンを浮かせる（筐体の硬さとホロの軽さの対比）。 */
  function drawTerminal(){
    const x = W.TERMINAL_X, gy = W.GROUND_Y;
    const near = menuHighlight('upgrade');
    const flick = 0.86 + 0.14 * Math.sin(t * 13.0) * Math.sin(t * 3.1);
    ctx.save();

    /* 無骨な筐体（暗い鋼材・ボルト・通気スリット・摩耗） */
    ctx.fillStyle = 'rgba(8,17,22,0.98)';
    roundRect(ctx, x - 36, gy - 96, 72, 96, 7); ctx.fill();
    const bg = ctx.createLinearGradient(x - 32, 0, x + 32, 0);
    bg.addColorStop(0, 'rgba(32,56,66,0.92)');
    bg.addColorStop(0.5, 'rgba(15,30,36,0.92)');
    bg.addColorStop(1, 'rgba(6,14,18,0.96)');
    ctx.fillStyle = bg;
    roundRect(ctx, x - 32, gy - 92, 64, 88, 6); ctx.fill();
    ctx.strokeStyle = near ? 'rgba(150,220,245,0.6)' : 'rgba(74,116,128,0.55)';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(150,190,200,0.5)';
    for (const bxx of [x - 28, x + 28])
      for (const byy of [gy - 88, gy - 48, gy - 8]){ ctx.beginPath(); ctx.arc(bxx, byy, 1.8, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(90,130,142,0.4)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++){ ctx.beginPath(); ctx.moveTo(x - 22, gy - 26 + i * 7); ctx.lineTo(x + 22, gy - 26 + i * 7); ctx.stroke(); }

    /* 投影リング（発光器） */
    ctx.fillStyle = 'rgb(28,52,62)';
    roundRect(ctx, x - 24, gy - 108, 48, 12, 3); ctx.fill();
    ctx.fillStyle = near ? '#cbf2ff' : '#7cc2d8';
    ctx.beginPath(); ctx.ellipse(x, gy - 102, 12, 3.4, 0, 0, TAU); ctx.fill();

    /* 青いホログラム（筐体の上に浮く半透明スクリーン＋走査線） */
    const hw = 66, hh = 52, hy = gy - 170 + flick * 2, hx = x;
    ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(hx, hy + hh / 2, 4, hx, hy + hh / 2, 134);
    gg.addColorStop(0, near ? 'rgba(120,220,255,0.30)' : 'rgba(90,180,215,0.17)');
    gg.addColorStop(1, 'rgba(50,120,160,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(hx, hy + hh / 2, 134, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = near ? 0.96 : 0.82;
    ctx.fillStyle = 'rgba(70,180,225,0.16)';
    roundRect(ctx, hx - hw / 2, hy, hw, hh, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(150,230,255,' + (near ? 0.9 : 0.58) + ')';
    ctx.lineWidth = 1.5; ctx.stroke();
    /* 走査線 */
    ctx.strokeStyle = 'rgba(160,235,255,0.26)'; ctx.lineWidth = 1;
    for (let yy = hy + 7; yy < hy + hh - 3; yy += 6){ ctx.beginPath(); ctx.moveTo(hx - hw / 2 + 4, yy); ctx.lineTo(hx + hw / 2 - 4, yy); ctx.stroke(); }
    /* ホロのバー（整備項目の気配） */
    ctx.fillStyle = 'rgba(180,240,255,0.55)';
    ctx.fillRect(hx - hw / 2 + 8, hy + 11, 26, 3);
    ctx.fillRect(hx - hw / 2 + 8, hy + 20, 42, 3);
    ctx.fillRect(hx - hw / 2 + 8, hy + 29, 18, 3);
    ctx.fillRect(hx - hw / 2 + 8, hy + 38, 34, 3);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* v1.13.0: 艇ドック（乗り換え）。低い架台＋青白い投影で、現在の艇の形を見せる。
     4 艇の違いは「色」ではなく突起（フィン／ポッド／リング）の形で読ませる。 */
  function drawShipStation(){
    const x = W.SHIP_STATION_X, gy = W.GROUND_Y;
    const near = menuHighlight('ship');
    ctx.save();
    /* 架台（低い鋼の台・ボルト） */
    ctx.fillStyle = 'rgba(8,17,22,0.98)';
    roundRect(ctx, x - 50, gy - 30, 100, 30, 5); ctx.fill();
    const bg = ctx.createLinearGradient(0, gy - 30, 0, gy);
    bg.addColorStop(0, 'rgba(34,58,68,0.9)');
    bg.addColorStop(1, 'rgba(8,16,20,0.96)');
    ctx.fillStyle = bg;
    roundRect(ctx, x - 46, gy - 27, 92, 24, 4); ctx.fill();
    ctx.strokeStyle = near ? 'rgba(150,220,245,0.6)' : 'rgba(74,116,128,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(150,190,200,0.5)';
    for (const bxx of [x - 42, x + 42]){ ctx.beginPath(); ctx.arc(bxx, gy - 15, 1.8, 0, TAU); ctx.fill(); }
    /* 支柱と投影リング */
    ctx.fillStyle = 'rgb(20,38,47)';
    ctx.fillRect(x - 3, gy - 92, 6, 64);
    ctx.fillStyle = near ? '#cbf2ff' : '#7cc2d8';
    ctx.beginPath(); ctx.ellipse(x, gy - 92, 14, 4, 0, 0, TAU); ctx.fill();
    /* 立ちのぼる投影コーン */
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createLinearGradient(0, gy - 92, 0, gy - 168);
    cg.addColorStop(0, near ? 'rgba(120,220,255,0.30)' : 'rgba(90,180,215,0.16)');
    cg.addColorStop(1, 'rgba(60,150,190,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(x - 14, gy - 92); ctx.lineTo(x + 14, gy - 92);
    ctx.lineTo(x + 30, gy - 176); ctx.lineTo(x - 30, gy - 176); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    /* 投影された現在の艇（形で見分ける） */
    ctx.globalAlpha = near ? 0.95 : 0.72;
    ctx.save();
    ctx.translate(x, gy - 150);
    /* v1.20.0: 火力型は専用の船体を投影する（09 素材＋差分ではない）。 */
    if (hasBespokeHull(currentShip())) drawShipBody(ctx, currentShip(), 150, 48, { glow: true });
    else drawShipRig(ctx, currentShip(), 150, 40);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawEllie(){
    const el = st.ellie;
    const px = el.x, feet = W.GROUND_Y, S = GIRL.scale;
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

    const walking = el.anim === 'walk';
    const sheet = walking ? art.ellieWalk : art.ellieIdle;
    const cols = walking ? GIRL.walkCols : GIRL.idleCols;
    let idx;
    if (walking) idx = Math.min(cols - 1, Math.floor(wrap01(el.walkPhase) * cols));
    else idx = IDLE_SEQ[Math.floor(el.idleT * IDLE_FPS) % IDLE_SEQ.length];
    const sx = (idx % cols) * GIRL.frameW;
    const dx = px - GIRL.anchorX * S;
    const dy = feet - GIRL.anchorY * S;

    ctx.save();
    if (el.facing < 0){ ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
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

  function drawHUD(){
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    /* 文字の裏に暗い帯を敷いて、暗い海の上でも読ませる（文字裏はコントラスト）。 */
    const base = '船内インターミッション — 整備・開発';
    ctx.font = font(F.hud);
    const w0 = ctx.measureText(base).width;
    ctx.fillStyle = 'rgba(3,10,14,0.55)';
    roundRect(ctx, VW - 26 - w0 - 14, 20, w0 + 28, 32, 8); ctx.fill();
    ctx.fillStyle = '#8affd0';
    ctx.fillText(base, VW - 26, 36);
    if (st.screen === 'menu'){
      ctx.font = font(F.hudHint,false);
      const hint = Input.mode === 'touch'
        ? '項目をタップで選択 ／ 下のボタンで実行 ／ エリーは基地内を自由に歩く'
        : '↑↓ で選択    E で実行   エリーは基地内を自由に歩く';
      const w1 = ctx.measureText(hint).width;
      ctx.fillStyle = 'rgba(3,10,14,0.5)';
      roundRect(ctx, VW - 26 - w1 - 14, 54, w1 + 28, 28, 8); ctx.fill();
      ctx.fillStyle = 'rgba(185,225,235,0.92)';
      ctx.fillText(hint, VW - 26, 68);
    }

    if (st.msgT > 0){
      ctx.globalAlpha = Math.min(1, st.msgT / 0.5);
      ctx.textAlign = 'center';
      ctx.font = font(F.toast);
      const w2 = ctx.measureText(st.msg).width;
      ctx.fillStyle = 'rgba(3,10,14,0.5)';
      roundRect(ctx, VW / 2 - w2 / 2 - 16, VH - 108, w2 + 32, 34, 8); ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(st.msg, VW / 2, VH - 92);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ==================================================================
     v1.16.0: 共通のスチームパンク風パネル枠（黒鉄の地に擦れた真鍮の多重枠・
     四隅リベット・彫刻銘板・目盛り/ゲージ・装飾歯車）。中は呼び出し側が描く
     （70℃ の既存青ホロは情報表示の内側に残す）。親メニューと整備・艇・武器の
     各パネルが同じ設備に見えるよう、ここへ集約する（後続の武器開発 UI も乗せられる）。
     ================================================================== */
  const BRASS = {
    iron0:'#1b2127', iron1:'#0b0f13',
    dark:'#3a2f18', mid:'#8a6a34', bright:'#c9a558', edge:'#e0c078', shadow:'#241b0c',
    amber:'#ffb347', amberDim:'#c98a2e',
  };
  function drawRivet(x, y, r = 3.4){
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.5, x, y, r);
    g.addColorStop(0, '#e8c98a');
    g.addColorStop(0.5, BRASS.mid);
    g.addColorStop(1, '#4a3a1c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,8,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }
  function drawGear(cx, cy, r, teeth, rot, col){
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = col;
    for (let i = 0; i < teeth; i++){
      const a = (i / teeth) * TAU;
      ctx.save(); ctx.rotate(a);
      ctx.fillRect(-r * 0.22, -r * 1.18, r * 0.44, r * 0.42);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(10,8,4,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* 目盛り（ゲージ）: 小さな扇形ダイヤル。文字や選択と重ならない余白にだけ置く。 */
  function drawDial(cx, cy, r){
    ctx.save();
    ctx.fillStyle = 'rgba(12,10,6,0.7)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = BRASS.mid; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(224,192,120,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, TAU); ctx.stroke();
    for (let i = 0; i <= 6; i++){
      const a = Math.PI * 0.75 + (i / 6) * Math.PI * 1.5;
      const r0 = r * 0.62, r1 = r * 0.86;
      ctx.strokeStyle = 'rgba(200,170,110,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    const na = Math.PI * 0.75 + Math.PI * 1.5 * 0.62;
    ctx.strokeStyle = BRASS.amber; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * r * 0.72, cy + Math.sin(na) * r * 0.72); ctx.stroke();
    ctx.fillStyle = '#e8c98a';
    ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /*
   * パネルの外装（黒鉄＋真鍮）。呼び出し側は中身（見出し右の残高・閉じる・行・比較・決定）を描く。
   *   L: { x0, y0, w, h }（panelLayout と同じ座標系）
   *   title: 左上の銘板に彫る見出し
   *   rightReserve: 見出し右側に空けておく幅（残高や閉じるボタンのぶん）。目盛り/歯車はこの手前にだけ置く。
   */
  function drawPanelChrome(L, title, rightReserve = 300, opts){
    const { x0, y0, w, h } = L;
    const plate = !(opts && opts.plate === false);   // 結果モーダルは銘板を出さない（大見出しを自前で描く）
    ctx.save();
    /* 外への落ち影 */
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, x0 + 5, y0 + 8, w, h, 18); ctx.fill();
    /* 黒鉄の地 */
    const bg = ctx.createLinearGradient(0, y0, 0, y0 + h);
    bg.addColorStop(0, BRASS.iron0);
    bg.addColorStop(0.5, '#141a1f');
    bg.addColorStop(1, BRASS.iron1);
    ctx.fillStyle = bg;
    roundRect(ctx, x0, y0, w, h, 16); ctx.fill();
    /* 鉄板の縦筋（ごく薄い） */
    ctx.save();
    roundRect(ctx, x0, y0, w, h, 16); ctx.clip();
    for (let x = x0 + 10; x < x0 + w - 8; x += 7){
      ctx.fillStyle = 'rgba(255,255,255,0.014)';
      ctx.fillRect(x, y0, 3, h);
    }
    ctx.restore();
    /* v1.16.0+: 赤銅の板枠（ほどよく太い帯）＋面取り。細い真鍮縁から作り替え。
       外縁と内縁を暗く、帯の中央を明るい銅に。文字/価格/ボタンの当たり領域には重ねない
       （帯は既存余白の縁のみ。内側の情報域は呼び出し側がそのまま使える）。 */
    ctx.lineJoin = 'round';
    const bandC = 7.75, bandW = 10.5, bandR = 12;
    const copper = ctx.createLinearGradient(0, y0, 0, y0 + h);
    copper.addColorStop(0, '#b5723c');
    copper.addColorStop(0.16, '#8a4a26');
    copper.addColorStop(0.5, '#c47e46');
    copper.addColorStop(0.82, '#7c4020');
    copper.addColorStop(1, '#5a2c16');
    roundRect(ctx, x0 + bandC, y0 + bandC, w - bandC * 2, h - bandC * 2, bandR);
    ctx.strokeStyle = copper; ctx.lineWidth = bandW; ctx.stroke();
    /* 面取り: 外縁（暗→明）と内縁（明→暗）を細く重ねて板の厚みを出す。 */
    roundRect(ctx, x0 + 2.4, y0 + 2.4, w - 4.8, h - 4.8, 15);
    ctx.strokeStyle = 'rgba(28,14,7,0.9)'; ctx.lineWidth = 2.6; ctx.stroke();
    roundRect(ctx, x0 + 3.9, y0 + 3.9, w - 7.8, h - 7.8, 14);
    ctx.strokeStyle = 'rgba(236,182,120,0.5)'; ctx.lineWidth = 1.3; ctx.stroke();
    roundRect(ctx, x0 + 12.2, y0 + 12.2, w - 24.4, h - 24.4, 10);
    ctx.strokeStyle = 'rgba(20,10,6,0.82)'; ctx.lineWidth = 2.2; ctx.stroke();
    roundRect(ctx, x0 + 13.6, y0 + 13.6, w - 27.2, h - 27.2, 9);
    ctx.strokeStyle = 'rgba(234,186,128,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    /* 擦り傷（帯を横切る微かなブラシ目。暗幕の上の縁だけ） */
    ctx.strokeStyle = 'rgba(255,224,186,0.05)'; ctx.lineWidth = 1;
    for (let x = x0 + 26; x < x0 + w - 26; x += 9){
      ctx.beginPath(); ctx.moveTo(x, y0 + 3.4); ctx.lineTo(x + 3, y0 + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y0 + h - 3.4); ctx.lineTo(x + 3, y0 + h - 12); ctx.stroke();
    }
    for (let y = y0 + 26; y < y0 + h - 26; y += 9){
      ctx.beginPath(); ctx.moveTo(x0 + 3.4, y); ctx.lineTo(x0 + 12, y + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + w - 3.4, y); ctx.lineTo(x0 + w - 12, y + 3); ctx.stroke();
    }
    /* 外周に間隔を置いて見えるリベット（四隅だけでなく全周）。帯の中心線に置く。 */
    const rvR = 3.4, rvC = 7.75, rvStep = 86, rvCorner = 30;
    for (let x = x0 + rvCorner; x <= x0 + w - rvCorner; x += rvStep){
      drawRivet(x, y0 + rvC, rvR); drawRivet(x, y0 + h - rvC, rvR);
    }
    for (let y = y0 + rvCorner; y <= y0 + h - rvCorner; y += rvStep){
      drawRivet(x0 + rvC, y, rvR); drawRivet(x0 + w - rvC, y, rvR);
    }
    for (const [rx, ry] of [[x0 + rvCorner, y0 + rvCorner], [x0 + w - rvCorner, y0 + rvCorner],
                            [x0 + rvCorner, y0 + h - rvCorner], [x0 + w - rvCorner, y0 + h - rvCorner]])
      drawRivet(rx, ry, rvR);
    if (plate){
    /* 銘板（見出し）: 擦れた真鍮板に彫る */
    ctx.font = font(F.title);
    const tw = ctx.measureText(title).width;
    const px = x0 + 22, py = y0 + 12, pw = tw + 34, ph = 42;
    const pg = ctx.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, '#6d5526');
    pg.addColorStop(0.46, '#8a6a34');
    pg.addColorStop(1, '#5a4520');
    ctx.fillStyle = pg;
    roundRect(ctx, px, py, pw, ph, 7); ctx.fill();
    ctx.strokeStyle = BRASS.shadow; ctx.lineWidth = 2;
    roundRect(ctx, px + 1.5, py + 1.5, pw - 3, ph - 3, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(228,200,140,0.6)'; ctx.lineWidth = 1;
    roundRect(ctx, px + 3.5, py + 3.5, pw - 7, ph - 7, 5); ctx.stroke();
    for (const [sx, sy] of [[px + 8, py + 8], [px + pw - 8, py + 8], [px + 8, py + ph - 8], [px + pw - 8, py + ph - 8]])
      drawRivet(sx, sy, 2.4);
    /* 彫刻（暗い文字＋下の淡い縁で「彫った」感じ。可読性は確保する） */
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(232,210,150,0.5)';
    ctx.fillText(title, px + 18, py + ph / 2 + 2.2);
    ctx.fillStyle = '#241b0c';
    ctx.fillText(title, px + 18, py + ph / 2 + 1);
    /* 見出しと右側コンテンツの間の余白にだけ、目盛りときわめて小さな装飾歯車 */
    const decorX0 = px + pw + 26, decorX1 = x0 + w - rightReserve;
    if (decorX1 - decorX0 > 90){
      const cy = y0 + 33;
      ctx.strokeStyle = 'rgba(180,150,96,0.5)'; ctx.lineWidth = 1;
      for (let x = decorX0; x < decorX1 - 8; x += 11){
        const tall = ((x - decorX0) % 44 < 22) ? 7 : 4;
        ctx.beginPath(); ctx.moveTo(x, cy - tall); ctx.lineTo(x, cy + tall); ctx.stroke();
      }
      if (decorX1 - decorX0 > 150) drawDial(decorX1 - 26, cy, 22);
      if (decorX1 - decorX0 > 110) drawGear(decorX0 + 14, y0 + h - 26, 13, 9, t * 0.25, 'rgba(138,106,52,0.55)');
    }
    /* 下辺にも小さな歯車を一つだけ（行・決定と重ならない枠の内側） */
    drawGear(x0 + 30, y0 + h - 26, 14, 10, -t * 0.18, 'rgba(138,106,52,0.5)');
    }
    ctx.restore();
  }

  /* 選択行の琥珀インジケータ（控えめ）。行の塗りと文字は呼び出し側が先に描く。 */
  function drawAmberSelect(rect, on){
    if (!on) return;
    ctx.save();
    /* 左端の琥珀バー */
    ctx.fillStyle = BRASS.amber;
    roundRect(ctx, rect.x + 2, rect.y + 5, 4.5, rect.h - 10, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,179,71,0.85)'; ctx.lineWidth = 1.8;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8); ctx.stroke();
    ctx.restore();
  }

  /* ==================================================================
     v1.17.0: 基地 UI の段取り（一覧＋詳細・銅枠・キー表示）。
     主要文字を約 2 倍にし、パネルは上部の一覧へ寄せる。下の帯
     （BASE_UI.bandTop 以降）はエリーの全身と動きが見える領域として空ける。
     選択（行タップ／↑↓）と実行（下の行為ボタン／E）は分けたまま。
     ボタンは『決定』『捨てる』ではなく、起きることを書く（装備する/製作する/強化する/売却する/出港する/戻る）。
     ================================================================== */
  const UI = BASE_UI;
  const F = UI.fonts;                       // v1.19.0: 書体サイズ（拡大した主要文字はここで一括管理）

  /* 一覧・詳細・操作ボタンの共通の枠（上部に固定。下の帯は空ける）。 */
  function bigLayout(){
    const x0 = UI.panelX, w = UI.panelW, y0 = UI.panelY, h = UI.panelH;
    const rowsX = x0 + 24, rowsW = w - 48;
    const rowsTop = UI.childRowsTop;                 // 78
    const L = {
      x0, y0, w, h, rowsX, rowsW, rowsTop,
      close: { x: x0 + w - 62, y: y0 + 8, w: 50, h: 50 },
      detail: { x: rowsX, y: UI.detailTop, w: rowsW, h: UI.detailH },
      action: { x0: rowsX, y: UI.actionTop, w: rowsW, h: UI.actionH },
      row(i){ return { x: rowsX, y: rowsTop + i * (UI.rowH + UI.rowGap), w: rowsW, h: UI.rowH }; },
    };
    return L;
  }
  /* 可視ウィンドウ（カーソルに追従。全件に到達できる）。 */
  function windowFor(pnl, vis){
    const rows = pnl.rows();
    const cur = pnl.cursor();
    const maxStart = Math.max(0, rows.length - vis);
    const start = Math.max(0, Math.min(maxStart, cur - Math.floor(vis / 2)));
    return { rows, cur, start, count: Math.min(vis, rows.length), maxStart, total: rows.length };
  }
  const WPN_VIS = UI.childVisible;      // 4
  const FORGE_VIS = UI.childVisible;    // 4
  const wpnWindow = pnl => windowFor(pnl, WPN_VIS);
  const forgeWindow = pnl => windowFor(pnl, FORGE_VIS);

  /* --- 親メニュー --- */
  function menuLayout(){
    const x0 = UI.panelX, w = UI.panelW, y0 = UI.panelY, h = UI.panelH;
    const rowsX = x0 + 30, rowsW = w - 60;
    const rowH = UI.menuRowH, rowGap = UI.menuRowGap, gapBeforeDepart = 12;
    const top = y0 + 56;                      // 72
    const rowY = i => {
      let y = top + i * (rowH + rowGap);
      if (BASE_MENU[i] && BASE_MENU[i].separate) y += gapBeforeDepart;
      return y;
    };
    return {
      x0, y0, w, h, rowH, rowGap, gap: gapBeforeDepart,
      row(i){ return { x: rowsX, y: rowY(i), w: rowsW, h: rowH }; },
      confirm: { x: x0 + w / 2 - 160, y: y0 + 382, w: 320, h: 54 },
      close: { x: x0 + w - 62, y: y0 + 8, w: 50, h: 50 },
    };
  }
  function menuRowAt(p){
    if (st.screen !== 'menu') return -1;
    const L = menuLayout();
    for (let i = 0; i < BASE_MENU.length; i++){ if (inRect(p, L.row(i))) return i; }
    return -1;
  }
  const MENU_ICON = { gear:'整', hull:'艇', shell:'武', forge:'開', depart:'出' };

  /* --- 行為ボタン（選択行に応じて文言を変える。キー表示付き） --- */
  function rowButtons(panelKind, row, designScreen){
    const defs = [];
    defs.push({ id:'back', label:(panelKind === 'forge' && designScreen) ? '一覧へ' : '戻る',
      key:ACTION_KEY_HINT.back, tone:'back' });
    if (panelKind === 'weapon'){
      defs.push({ id:'sell', label:'売却する', key:ACTION_KEY_HINT.sell, tone:'sell',
        enabled: !!(row && row.kind === 'item' && !row.initial && row.sellable) });
      defs.push({ id:'enhance', label:'強化する', key:ACTION_KEY_HINT.enhance, tone:'enhance',
        enabled: !!(row && row.kind === 'item' && !row.initial && row.enhState === 'buy') });
    } else if (panelKind === 'forge' && !designScreen){
      defs.push({ id:'sell', label:'売却する', key:ACTION_KEY_HINT.sell, tone:'sell',
        enabled: !!(row && row.kind === 'item' && row.sellable) });
      defs.push({ id:'enhance', label:'強化する', key:ACTION_KEY_HINT.enhance, tone:'enhance',
        enabled: !!(row && ((row.kind === 'item' && row.enhState === 'buy') ||
                            (row.kind === 'melee' && row.unlocked && row.enhState === 'buy'))) });
    }
    let label, enabled = true;
    if (panelKind === 'weapon'){
      label = rowActionLabel('weapon', row);
      if (row && row.kind === 'make') enabled = (row.state === 'buy');
    } else if (panelKind === 'forge'){
      if (designScreen){ label = '製作する'; enabled = !!(row && row.kind === 'confirm' && !row.full && row.affordable); }
      else { label = rowActionLabel('forge', row); }
    } else {
      label = rowActionLabel(panelKind, row);
      if (panelKind === 'upgrade' && row) enabled = (row.state === 'buy');
    }
    defs.push({ id:'primary', label, key:ACTION_KEY_HINT.primary, tone:'primary', enabled, primary:true });
    return defs;
  }
  function layoutButtons(L, defs){
    const h = L.action.h, gap = 12, pad = 20, minW = 148;
    const ws = defs.map(d => {
      ctx.save(); ctx.font = BTN_FONT;
      const tw = ctx.measureText(d.label).width + pad * 2 + (d.key ? 46 : 0);
      ctx.restore();
      return Math.max(minW, Math.ceil(tw));
    });
    let x = L.action.x0 + L.action.w;
    const rects = defs.map(() => null);
    for (let i = defs.length - 1; i >= 0; i--){ x -= ws[i]; rects[i] = { x, y: L.action.y, w: ws[i], h }; x -= gap; }
    return defs.map((d, i) => Object.assign({}, d, { rect: rects[i] }));
  }
  const BTN_FONT = font(F.btn);
  function drawButtons(L, btns){
    for (const b of btns || []){
      const r = b.rect; if (!r) continue;
      const on = b.enabled !== false;
      let fill, edge, txt;
      if (!on){ fill = 'rgba(24,30,34,0.9)'; edge = 'rgba(120,140,150,0.45)'; txt = 'rgba(170,190,200,0.6)'; }
      else if (b.tone === 'primary'){ fill = 'rgba(120,74,32,0.96)'; edge = 'rgba(255,190,120,0.85)'; txt = '#fff2da'; }
      else if (b.tone === 'sell'){ fill = 'rgba(74,38,40,0.95)'; edge = 'rgba(240,170,160,0.7)'; txt = '#ffdcd4'; }
      else { fill = 'rgba(30,56,68,0.95)'; edge = 'rgba(160,220,235,0.65)'; txt = '#eafcff'; }
      roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = b.primary && on ? 2.4 : 1.6; ctx.stroke();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = BTN_FONT;
      ctx.fillStyle = txt;
      ctx.fillText(b.label, r.x + r.w / 2 - (b.key ? 14 : 0), r.y + r.h / 2 + 1);
      if (b.key){
        /* キー表示は右寄せで（中央寄せのままだと右端で切れる）。 */
        ctx.textAlign = 'right';
        ctx.font = font(F.key, false);
        ctx.fillStyle = on ? 'rgba(235,245,250,0.75)' : 'rgba(160,180,190,0.5)';
        ctx.fillText('[' + b.key + ']', r.x + r.w - 12, r.y + r.h / 2 + 1);
      }
    }
  }

  /* --- 行の中身（ラベル・中央の一言・プレビュー・右の状態） --- */
  function drawRowBase(L, v, opts){
    const rect = L.row(v);
    const sel = opts.selected;
    ctx.fillStyle = sel ? (opts.accent ? 'rgba(96,58,34,0.95)' : 'rgba(40,84,104,0.95)')
                        : (opts.accent ? 'rgba(34,24,16,0.92)' : 'rgba(14,30,38,0.92)');
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
    drawAmberSelect(rect, sel);
    /* 左のラベル（大きめ） */
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = font(F.rowLabel);
    ctx.fillStyle = opts.labelColor || (opts.dim ? 'rgba(168,196,208,0.7)' : '#f2fbff');
    ctx.fillText(opts.label, rect.x + 20, rect.y + rect.h / 2 + 1);
    /* 中央の一言 */
    if (opts.mid){
      ctx.font = font(F.rowMid);
      ctx.fillStyle = opts.midColor || 'rgba(190,225,240,0.92)';
      ctx.fillText(opts.mid, rect.x + 440, rect.y + rect.h / 2 + 1);
    }
    return rect;
  }

  /* 行の中のプレビュー（実戦の弾形・軌跡・近接/レーザーの形）。 */
  function drawRowPreview(spec, x, y, w, h){
    if (!spec) return;
    const cx = x + w / 2, cy = y + h / 2;
    if (spec.shape){
      ctx.save();
      ctx.translate(cx - w * 0.06, cy);
      const sc = Math.min(0.72, (h * 0.5) / 16);
      ctx.scale(sc, sc);
      drawProjectileShape(ctx, spec.shape.typeId, spec.shape.shapeId, 1);
      ctx.restore();
    } else if (spec.melee){
      ctx.save(); ctx.translate(cx, cy); drawMeleeShape(ctx, spec.melee.id, h * 1.15); ctx.restore();
    } else if (spec.traj){
      drawTrajectoryIcon(ctx, { x, y: y + 2, w, h: h - 4, count: spec.traj.count, pattern: spec.traj.pattern,
        color: spec.traj.typeId === 'missile' ? '#ffcf8a' : '#bfe9ff' });
    } else if (spec.beam){
      if (spec.beam.reflect) drawReflectIcon(ctx, { x, y, w, h, color:'#b8f0d0' });
      else drawBeamIcon(ctx, { x, y, w, h, color:'#8fe0ff' });
    }
  }

  function drawMenu(){
    if (st.screen !== 'menu') return;
    const L = menuLayout();
    const cur = Math.max(0, Math.min(BASE_MENU.length - 1, Math.floor(Number(st.cursor) || 0)));
    const sel = BASE_MENU[cur].id;

    ctx.save();
    ctx.fillStyle = 'rgba(2,8,12,0.45)';
    ctx.fillRect(0, 0, VW, BASE_UI.bandTop);   // 下の帯（エリーの帯）は暗くしない
    drawPanelChrome(L, '船内 — 整備・開発', 420);

    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    ctx.font = font(F.status);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('資源 ' + fmt(balance()), L.x0 + L.w - 84, L.y0 + 34);
    /* 閉じる（潜航へは戻らず、親メニューは出港で抜ける。×はヒント用に置かない） */

    for (let i = 0; i < BASE_MENU.length; i++){
      const item = BASE_MENU[i];
      const rect = L.row(i);
      const on = i === cur;
      if (item.separate){
        ctx.strokeStyle = 'rgba(180,150,96,0.35)'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(rect.x + 8, rect.y - L.gap / 2 - L.rowGap / 2 + 2);
        ctx.lineTo(rect.x + rect.w - 8, rect.y - L.gap / 2 - L.rowGap / 2 + 2);
        ctx.stroke();
      }
      ctx.fillStyle = item.separate
        ? (on ? 'rgba(96,58,34,0.95)' : 'rgba(40,28,20,0.9)')
        : (on ? 'rgba(40,64,78,0.95)' : 'rgba(16,24,30,0.92)');
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
      /* アイコン窓 */
      ctx.fillStyle = 'rgba(10,14,18,0.85)';
      roundRect(ctx, rect.x + 12, rect.y + 10, rect.h - 20, rect.h - 20, 8); ctx.fill();
      ctx.strokeStyle = item.separate ? 'rgba(255,179,71,0.7)' : 'rgba(150,190,205,0.5)';
      ctx.lineWidth = 1.4; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = font(F.menuIcon);
      ctx.fillStyle = item.separate ? '#ffd79a' : '#cfe8ff';
      ctx.fillText(MENU_ICON[item.icon] || '・', rect.x + 12 + (rect.h - 20) / 2, rect.y + rect.h / 2 + 1);
      /* 項目名（大きめ）と短い説明（同じ行に並べる＝縦に詰めない） */
      ctx.textAlign = 'left';
      ctx.font = font(F.menuLabel);
      ctx.fillStyle = item.separate ? '#ffd79a' : '#f2fbff';
      const tx = rect.x + rect.h + 6;
      ctx.fillText(item.label, tx, rect.y + rect.h / 2 + 1);
      ctx.font = font(F.menuNote,false);
      ctx.fillStyle = 'rgba(178,208,222,0.85)';
      ctx.fillText(item.note, rect.x + 600, rect.y + rect.h / 2 + 2);
      drawAmberSelect(rect, on);
    }

    /* 実行（選択中に応じて、起きることを書く） */
    const label = menuActionLabel(sel);
    const c = L.confirm;
    ctx.fillStyle = sel === 'depart' ? 'rgba(120,74,32,0.96)' : 'rgba(34,72,90,0.95)';
    roundRect(ctx, c.x, c.y, c.w, c.h, 10); ctx.fill();
    ctx.strokeStyle = sel === 'depart' ? 'rgba(255,190,120,0.85)' : 'rgba(160,225,240,0.6)';
    ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = '#eafcff'; ctx.textAlign = 'center';
    ctx.font = font(F.btn);
    ctx.fillText(label, c.x + c.w / 2 - 14, c.y + c.h / 2 + 1);
    ctx.textAlign = 'right';
    ctx.font = font(F.key, false);
    ctx.fillStyle = 'rgba(235,245,250,0.75)';
    ctx.fillText('[E]', c.x + c.w - 14, c.y + c.h / 2 + 1);
    ctx.restore();
  }

  /* --- 整備パネル（一覧＋詳細。選択／実行は別。下の帯はエリーに空ける） --- */
  function panelLayout(){ return bigLayout(); }
  function panelRowAt(pnl, p){
    if (!pnl || !pnl.isOpen()) return -1;
    const L = bigLayout();
    const win = windowFor(pnl, UI.childVisible);
    for (let v = 0; v < win.count; v++){ if (inRect(p, L.row(v))) return win.start + v; }
    return -1;
  }
  function rowAt(p){ return panelRowAt(panel, p); }

  const STATE_COL = { buy:'#9cf0b4', insufficient:'#ff8d7a', max:'#c8b57a', full:'#9fd0dc' };

  /* 子パネルの共通の見出し（銅枠・×で戻る・資源・ページ）。 */
  function drawChildHeader(L, title, rightReserve, win){
    drawPanelChrome(L, title, Math.max(rightReserve, 400));   // 資源/ページ表示と装飾を重ねない
    ctx.fillStyle = 'rgba(30,58,70,0.95)';
    roundRect(ctx, L.close.x, L.close.y, L.close.w, L.close.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,235,0.6)'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = '#dff2ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(F.title);
    ctx.fillText('×', L.close.x + L.close.w / 2, L.close.y + L.close.h / 2 + 1);
    ctx.textAlign = 'right';
    ctx.font = font(F.status);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('資源 ' + fmt(balance()), L.close.x - 22, L.y0 + 34);
    if (win && win.total > win.count){
      ctx.textAlign = 'center';
      ctx.font = font(F.bodySmall);
      ctx.fillStyle = 'rgba(190,215,230,0.9)';
      ctx.fillText((win.cur + 1) + ' / ' + win.total, L.x0 + L.w / 2, L.y0 + 34);
    }
  }

  function drawPanel(){
    if (!panel || !panel.isOpen()) return;
    const L = bigLayout();
    const win = windowFor(panel, UI.childVisible);
    const rows = win.rows, cur = win.cur;

    ctx.save();
    ctx.fillStyle = 'rgba(2,8,12,0.5)';
    ctx.fillRect(0, 0, VW, BASE_UI.bandTop);   // 下の帯（エリーの帯）は暗くしない
    drawChildHeader(L, '整備・改造', 250, win);

    for (let v = 0; v < win.count; v++){
      const i = win.start + v;
      const r = rows[i], sel = i === cur;
      const det = (r.kind === 'repair')
        ? (r.state === 'full' ? '満タン' : ('船体 ' + r.displayFrom + ' → ' + r.displayTo))
        : (r.displayFrom + ' → ' + r.displayTo);
      const rect = drawRowBase(L, v, {
        selected: sel, label: r.label, mid: det,
        midColor: (r.state === 'max' || r.state === 'full') ? 'rgba(196,218,226,0.9)' : '#bfe9ff',
      });
      if (r.kind === 'upgrade' && r.maxLevel > 1){
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = font(F.bodySmall,false);
        ctx.fillStyle = 'rgba(170,210,225,0.85)';
        ctx.fillText('Lv ' + r.level + '/' + r.maxLevel, rect.x + 800, rect.y + rect.h / 2 + 1);
      }
      ctx.textAlign = 'right';
      ctx.font = font(F.status);
      ctx.fillStyle = STATE_COL[r.state] || '#cfe8ff';
      const priceTxt = r.state === 'max' ? '上限' : (r.state === 'full' ? '—' : ('資源 ' + fmt(r.price)));
      ctx.fillText(priceTxt, rect.x + rect.w - 20, rect.y + rect.h / 2 + 1);
    }

    /* 詳細（選択行の残高と操作） */
    const crow = rows[cur];
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = font(F.body);
    const after = (crow && crow.state === 'buy') ? balance() - crow.price : null;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('残高 ' + fmt(balance()) + (after !== null ? ('  → 購入後 ' + fmt(Math.max(0, after))) : ''),
      L.detail.x, L.detail.y + 30);
    ctx.font = font(F.hint,false);
    ctx.fillStyle = 'rgba(175,215,230,0.9)';
    ctx.fillText(Input.mode === 'touch'
      ? '行をタップで選択 ／ 下のボタンで実行 ／ ×で戻る'
      : '↑↓ で選択    E で実行    Esc で戻る', L.detail.x, L.detail.y + 78);

    drawButtons(L, layoutButtons(L, rowButtons('upgrade', crow)));
    ctx.restore();
  }

  /* v1.13.0 / v1.17.0: 艇選択パネル（一覧＋詳細）。4 艇の得意・不得手と「搭乗中」。
     換装は資源を消費しない。銅枠は他と同じ。 */
  function drawShipPanel(){
    if (!shipPanel || !shipPanel.isOpen()) return;
    const L = bigLayout();
    const win = windowFor(shipPanel, UI.childVisible);
    const rows = win.rows, cur = win.cur;

    ctx.save();
    ctx.fillStyle = 'rgba(2,8,12,0.5)';
    ctx.fillRect(0, 0, VW, BASE_UI.bandTop);   // 下の帯（エリーの帯）は暗くしない
    drawChildHeader(L, '艇の換装（ドック）', 250, win);

    for (let v = 0; v < win.count; v++){
      const i = win.start + v;
      const r = rows[i], sel = i === cur;
      const rect = drawRowBase(L, v, { selected: sel, label: r.name, mid: r.note });
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.font = font(F.status);
      if (r.current){ ctx.fillStyle = '#9cf0b4'; ctx.fillText('搭乗中', rect.x + rect.w - 20, rect.y + rect.h / 2 + 1); }
    }

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = font(F.body);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('共有の改造・資源はそのまま（換装で回復・弾増やしは無し）', L.detail.x, L.detail.y + 30);
    ctx.font = font(F.hint,false);
    ctx.fillStyle = 'rgba(175,215,230,0.9)';
    ctx.fillText(Input.mode === 'touch'
      ? '艇をタップで選択 ／ 換装するで決定 ／ ×で戻る'
      : '↑↓ で選択    E で換装    Esc で戻る', L.detail.x, L.detail.y + 78);

    drawButtons(L, layoutButtons(L, rowButtons('ship', rows[cur])));
    ctx.restore();
  }

  /* v1.15.0: 武器製作台。鋼の作業台＋万力＋青白いホロの弾。整備端末・艇ドックとは別の造作。 */
  function drawWeaponStation(){
    const x = W.WEAPON_STATION_X, gy = W.GROUND_Y;
    const near = menuHighlight('weapon');
    ctx.save();
    /* 作業台（脚＋天板） */
    ctx.fillStyle = 'rgba(10,20,26,0.98)';
    roundRect(ctx, x - 46, gy - 46, 92, 46, 5); ctx.fill();
    const bg = ctx.createLinearGradient(0, gy - 46, 0, gy);
    bg.addColorStop(0, 'rgba(40,64,74,0.92)');
    bg.addColorStop(1, 'rgba(10,18,22,0.96)');
    ctx.fillStyle = bg;
    roundRect(ctx, x - 42, gy - 42, 84, 40, 4); ctx.fill();
    ctx.strokeStyle = near ? 'rgba(150,220,245,0.6)' : 'rgba(74,116,128,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    /* 天板の縁（金属） */
    ctx.strokeStyle = 'rgba(150,200,215,0.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 42, gy - 42); ctx.lineTo(x + 42, gy - 42); ctx.stroke();
    /* 万力（左）と工具（右） */
    ctx.fillStyle = 'rgba(70,110,120,0.7)';
    roundRect(ctx, x - 36, gy - 54, 22, 14, 3); ctx.fill();
    ctx.fillStyle = 'rgba(120,160,170,0.7)';
    ctx.fillRect(x + 16, gy - 52, 4, 12); ctx.fillRect(x + 26, gy - 52, 4, 12);
    ctx.fillStyle = 'rgba(150,190,200,0.5)';
    for (const bxx of [x - 38, x + 38]){ ctx.beginPath(); ctx.arc(bxx, gy - 22, 1.8, 0, TAU); ctx.fill(); }
    /* 立ちのぼる青白いホロの光 */
    ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(x, gy - 96, 4, x, gy - 96, 120);
    gg.addColorStop(0, near ? 'rgba(120,220,255,0.28)' : 'rgba(90,180,215,0.15)');
    gg.addColorStop(1, 'rgba(50,120,160,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, gy - 96, 120, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    /* ホロの弾（浮遊。品質は形では表さない） */
    ctx.globalAlpha = near ? 0.92 : 0.7;
    const fy = gy - 104 + Math.sin(t * 2.0) * 3;
    ctx.strokeStyle = 'rgba(150,235,255,0.7)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - 30, fy - 16, 60, 32);
    ctx.fillStyle = 'rgba(180,240,255,0.85)';
    ctx.beginPath(); ctx.moveTo(x - 12, fy - 6); ctx.lineTo(x + 12, fy); ctx.lineTo(x - 12, fy + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,200,230,0.6)';
    ctx.fillRect(x - 18, fy - 3, 6, 6);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* v1.15.0/v1.17.0: 武器パネル（一覧＋詳細・銅枠）。各武器行に実戦の弾形と軌跡アイコン。
     装備中と候補を比較し、実行は下の行為ボタン（装備する/製作する/強化する/売却する）。満杯/不足は消費なし。 */
  function weaponPreview(r){
    if (!r) return null;
    if (r.kind === 'make') return { shape:{ typeId:r.type, shapeId:'stock' } };
    const item = r.item;
    const shapeId = (item && item.projectile) ? item.projectile : (r.initial ? 'stock' : (r.style || 'stock'));
    return {
      shape:{ typeId:r.type, shapeId },
      traj:{ typeId:r.type, count:r.count || 1, pattern:r.pattern || 'single' },
    };
  }

  /* 選択行の比較（前→後・実値・斉射・外観）と売却の事前提示。 */
  /* 文字を右へ並べ、幅を超えたら次の行へ送る（長い日本語を切らない）。次に使う y を返す。 */
  function drawTokens(tokens, x, y, maxW, lineH){
    let cx = x, cy = y;
    for (const tk of tokens){
      ctx.font = font(tk.size || F.body, tk.bold !== false);
      const w = ctx.measureText(tk.text).width;
      if (cx > x && cx + w > x + maxW){ cx = x; cy += lineH; }
      ctx.textAlign = 'left';
      ctx.fillStyle = tk.color || '#d7f0ff';
      ctx.fillText(tk.text, cx, cy);
      cx += w + (tk.gap != null ? tk.gap : 22);
    }
    return cy;
  }
  function drawWeaponDetail(L, row){
    const d = L.detail;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (!row) return;
    if (row.kind === 'make'){
      ctx.font = font(F.body);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('実行で製作 → 資源を使ってランダムに 1 個つくる（初期品は劣らない基準）', d.x, d.y + 28);
      return;
    }
    const cmp = weaponPanel.compare();
    if (cmp){
      ctx.font = font(F.body);
      ctx.fillStyle = '#cfe8ff'; ctx.textAlign = 'left';
      ctx.fillText('装備中 ' + cmp.fromLabel + '  →  この個体 ' + cmp.toLabel, d.x, d.y + 24);
      const toks = cmp.lines.map(ln => {
        const fv = (ln.fromReal != null) ? ln.fromReal : ln.from.toFixed(2);
        const tv = (ln.toReal != null) ? ln.toReal : ln.to.toFixed(2);
        const arrow = ln.dir > 0 ? '▲' : (ln.dir < 0 ? '▼' : '=');
        return { text: ln.name + ' ' + fv + '→' + tv + arrow,
          color: ln.dir > 0 ? '#9cf0b4' : (ln.dir < 0 ? '#ff9d8a' : 'rgba(190,215,222,0.9)'), size:F.body, bold:false };
      });
      const s = cmp.salvo;
      const extra = '斉射 ' + s.fromShots + '→' + s.toShots + '（実効火力 ' + s.fromPower.toFixed(2) + '→' + s.toPower.toFixed(2) + '）' +
        (s.toHeat != null ? ('　発熱/斉射 ' + s.fromHeat.toFixed(3) + '→' + s.toHeat.toFixed(3))
                          : ('　消費弾 ' + s.fromAmmo + '→' + s.toAmmo)) +
        (s.fromAmmoCap != null ? ('　装弾 ' + s.fromAmmoCap + '→' + s.toAmmoCap) : '') +   // ミサイルのみ
        '　外観 ' + s.fromStyle + '→' + s.toStyle;
      toks.push({ text: extra, color:'#d7f0ff', size:F.bodySmall, bold:false });
      drawTokens(toks, d.x, d.y + 52, d.w - 24, 30);
    }
    /* 売却の事前提示（二度押しで確定）。 */
    const sp = weaponPanel.sellPreview();
    ctx.textAlign = 'right';
    ctx.font = font(F.body);
    if (sp){
      ctx.fillStyle = sp.armed ? '#ffd0c4' : 'rgba(240,190,170,0.92)';
      ctx.fillText(sp.armed ? ('売却する？ 資源 +' + fmt(sp.amount) + '（売却するで確定）') : ('売却 資源 +' + fmt(sp.amount)),
        d.x + d.w, d.y + 24);
    }
    const msg = weaponPanel.message();
    if (msg){
      ctx.fillStyle = '#ffe9a8';
      ctx.font = font(F.body);
      ctx.textAlign = 'right';
      ctx.fillText(msg, d.x + d.w, d.y + d.h - 16);
    }
  }

  function drawWeaponPanel(){
    if (!weaponPanel || !weaponPanel.isOpen()) return;
    const L = bigLayout();
    const win = windowFor(weaponPanel, WPN_VIS);
    const rows = win.rows, cur = win.cur;

    ctx.save();
    ctx.fillStyle = 'rgba(2,8,12,0.5)';
    ctx.fillRect(0, 0, VW, BASE_UI.bandTop);   // 下の帯（エリーの帯）は暗くしない
    drawChildHeader(L, '武器（製作・換装）', 250, win);

    for (let v = 0; v < win.count; v++){
      const i = win.start + v;
      const r = rows[i], sel = i === cur;
      const isMake = r.kind === 'make';
      const label = isMake ? r.label : (r.short || r.label);
      const mid = isMake ? '' : (r.shots + (r.enh > 0 ? (' 強化+' + r.enh) : ''));
      const rect = drawRowBase(L, v, {
        selected: sel, label, labelColor: isMake ? '#f2fbff' : qualityColor(r),
        mid, midColor: 'rgba(190,225,240,0.95)',
      });
      /* プレビュー（実戦の弾形＋発射数の軌跡） */
      const spec = weaponPreview(r);
      if (spec && spec.shape) drawRowPreview({ shape: spec.shape }, rect.x + rect.w - 540, rect.y + 6, 160, rect.h - 12);
      if (spec && spec.traj) drawRowPreview({ traj: spec.traj }, rect.x + rect.w - 366, rect.y + 6, 196, rect.h - 12);
      /* 右の状態 */
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.font = font(F.status);
      if (isMake){
        ctx.fillStyle = r.state === 'insufficient' ? '#ff8d7a' : (r.state === 'full' ? '#c8b57a' : '#9cf0b4');
        ctx.fillText(r.state === 'full' ? '倉庫が満杯' : (r.state === 'insufficient' ? '資源不足' : ('資源 ' + fmt(r.price))),
          rect.x + rect.w - 20, rect.y + rect.h / 2 + 1);
      } else if (r.equipped){
        ctx.fillStyle = '#9cf0b4';
        ctx.fillText('装備中', rect.x + rect.w - 20, rect.y + rect.h / 2 + 1);
      }
    }

    drawWeaponDetail(L, rows[cur]);
    drawButtons(L, layoutButtons(L, rowButtons('weapon', rows[cur])));
    ctx.restore();
  }

  /* v1.16.0 / v1.17.0: 指定開発パネル（一覧＋詳細・銅枠）。武器選択 → 開発の選択と確定。
     解放済み・型互換の値だけを選べる。項目の変更はその場でプレビューへ即反映する。 */
  function shapeForType(t){
    if (t === 'laser' || t === 'reflaser') return { beam:{ reflect: t === 'reflaser' } };
    if (t === 'reftorp') return { beam:{ reflect:true }, shape:{ typeId:'reftorp', shapeId:'stock' } };
    if (t === 'missile') return { shape:{ typeId:'missile', shapeId:'stock' } };
    return { shape:{ typeId:'torpedo', shapeId:'stock' } };
  }
  /* 行のプレビュー（弾形・軌跡・近接/レーザー/反射の形）。設計中の変更も即反映。 */
  function forgePreview(r, designType, sel){
    if (!r) return null;
    if (r.kind === 'shot') return shapeForType(r.typeId);
    if (r.kind === 'missile') return { shape:{ typeId:'missile', shapeId:'stock' } };
    if (r.kind === 'melee') return { melee:{ id:r.id } };
    if (r.kind === 'design') return shapeForType(r.typeId);
    if (r.kind === 'item'){
      const it = r.item || {};
      return {
        shape:{ typeId:r.typeId, shapeId: it.projectile || 'stock' },
        traj:{ typeId:r.typeId, count: it.count || 1, pattern: it.pattern || 'single' },
      };
    }
    if (r.kind === 'trait'){
      if (r.cat === 'projectile') return { shape:{ typeId:designType, shapeId:r.value } };
      if (r.cat === 'count' || r.cat === 'pattern'){
        const count = (r.cat === 'count') ? Math.max(1, Number(r.value) || 1) : Math.max(1, Number(sel && sel.count) || 1);
        const pattern = (r.cat === 'pattern') ? r.value : ((sel && sel.pattern) || 'single');
        return { traj:{ typeId:designType, count, pattern } };
      }
      return null;
    }
    return null;
  }

  function drawForgeDetail(L, design, row){
    const d = L.detail;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (design){
      const conf = forgePanel.rows().find(x => x.kind === 'confirm');
      ctx.font = font(F.body);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText('開発費 資源 ' + (conf ? fmt(conf.cost) : '—') + '　—— 製作するで 1 個つくる（満杯・不足は消費なし）', d.x, d.y + 30);
    } else if (row && (row.kind === 'shot' || row.kind === 'missile' || row.kind === 'melee' || row.kind === 'item' || row.kind === 'design')){
      ctx.font = font(F.body);
      ctx.fillStyle = '#cfe8ff';
      const hint = (row.kind === 'design') ? '製作するで開く → 特性（同時発射/方向/弾の形/音）を選ぶ'
        : (row.kind === 'melee') ? '回収で解放。解放後は装備と強化ができる'
        : '装備するで換装。所持品は強化・売却もできる';
      ctx.fillText(hint, d.x, d.y + 30);
    }
    /* 売却の事前提示（所持品の行のみ）。 */
    if (!design){
      const sp = forgePanel.sellPreview();
      ctx.textAlign = 'right';
      ctx.font = font(F.body);
      if (sp){
        ctx.fillStyle = sp.armed ? '#ffd0c4' : 'rgba(240,190,170,0.92)';
        ctx.fillText(sp.armed ? ('売却する？ 資源 +' + fmt(sp.amount) + '（売却するで確定）') : ('売却 資源 +' + fmt(sp.amount)),
          d.x + d.w, d.y + 24);
      }
      const msg = forgePanel.message();
      if (msg){
        ctx.fillStyle = '#ffe9a8';
        ctx.font = font(F.body);
        ctx.textAlign = 'right';
        ctx.fillText(msg, d.x + d.w, d.y + d.h - 16);
      }
    }
  }

  function drawForgePanel(){
    if (!forgePanel || !forgePanel.isOpen()) return;
    const L = bigLayout();
    const design = !!(forgePanel.screen && forgePanel.screen() === 'design');
    const win = windowFor(forgePanel, FORGE_VIS);
    const rows = win.rows, cur = win.cur;
    const designType = design ? forgePanel.designType() : null;
    const sel = design ? forgePanel.selection() : null;

    ctx.save();
    ctx.fillStyle = 'rgba(2,8,12,0.5)';
    ctx.fillRect(0, 0, VW, BASE_UI.bandTop);   // 下の帯（エリーの帯）は暗くしない
    drawChildHeader(L, design ? '開発 — 指定（項目ごとに選ぶ）' : '開発（武器・近接）', 250, win);

    for (let v = 0; v < win.count; v++){
      const i = win.start + v;
      const r = rows[i], selRow = i === cur;
      const dim = (r.kind === 'melee' && r.unlocked === false);
      let label = r.label, mid = '';
      if (r.kind === 'item') mid = '強化 ' + r.enh + '/' + r.enhMax;
      else if (r.kind === 'melee') mid = r.unlocked ? ('強化 ' + r.enh + '/' + r.enhMax) : '';   // 未解放は右の状態欄に一度だけ
      else if (r.kind === 'shot' || r.kind === 'missile') mid = r.note || '';
      else if (r.kind === 'trait') mid = r.valueLabel;
      const rect = drawRowBase(L, v, {
        selected: selRow, label, dim,
        labelColor: r.equipped ? '#c9f0ff' : undefined,
        mid, midColor: (r.kind === 'trait') ? (r.editable ? '#bfe9ff' : 'rgba(190,215,222,0.85)') : 'rgba(200,225,235,0.9)',
      });
      /* プレビュー（形・軌跡。設計中の変更は即反映）。設計の trait 行はコスト/◀▶と重ねない左位置へ。 */
      const spec = forgePreview(r, designType, sel);
      const shapeX = rect.x + rect.w - 540;
      const trajX = rect.x + rect.w - ((r.kind === 'trait') ? 620 : 366);
      if (spec && spec.shape) drawRowPreview({ shape: spec.shape }, shapeX, rect.y + 6, 160, rect.h - 12);
      if (spec && spec.beam && !spec.shape) drawRowPreview({ beam: spec.beam }, shapeX, rect.y + 6, 330, rect.h - 12);
      if (spec && spec.melee) drawRowPreview({ melee: spec.melee }, shapeX, rect.y + 6, 310, rect.h - 12);
      if (spec && spec.traj) drawRowPreview({ traj: spec.traj }, trajX, rect.y + 6, (r.kind === 'trait') ? 176 : 196, rect.h - 12);
      /* 右の状態 */
      const cy = rect.y + rect.h / 2 + 1;
      const right = rect.x + rect.w;
      if (r.kind === 'trait' && r.editable){
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center'; ctx.font = font(F.status);
        ctx.fillStyle = '#bfe9ff';
        ctx.fillText('◀', right - 190, cy);
        ctx.fillText('▶', right - 40, cy);
        ctx.textAlign = 'right'; ctx.font = font(F.body);
        if (r.cost) ctx.fillText('資源 ' + fmt(r.cost), right - 236, cy);
      } else if (r.kind === 'confirm'){
        ctx.textAlign = 'right'; ctx.font = font(F.status);
        ctx.fillStyle = r.full ? '#c8b57a' : (r.affordable ? '#9cf0b4' : '#ff8d7a');
        ctx.fillText(r.full ? '倉庫が満杯' : ('資源 ' + fmt(r.cost)), right - 20, cy);
      } else if (r.kind === 'design'){
        ctx.textAlign = 'right'; ctx.font = font(F.status);
        ctx.fillStyle = '#d8c0ff';
        ctx.fillText('開く ▶', right - 20, cy);
      } else if (r.kind === 'shot' || r.kind === 'missile' || r.kind === 'item' || r.kind === 'melee'){
        ctx.textAlign = 'right'; ctx.font = font(F.status);
        ctx.fillStyle = r.equipped ? '#9cf0b4' : 'rgba(200,225,235,0.9)';
        const state = r.equipped ? '装備中'
          : (r.kind === 'melee' ? (r.unlocked ? '' : '未解放') : '');
        if (state) ctx.fillText(state, right - 20, cy);
      }
    }

    drawForgeDetail(L, design, rows[cur]);
    drawButtons(L, layoutButtons(L, rowButtons('forge', rows[cur], design)));
    ctx.restore();
  }

  /* ==================================================================
     v1.19.0: 製作/開発の成功結果モーダル。
     成功が確定・保存された時だけ、画面中央に基地の赤銅枠で開く。
     大きく「{実際の武器名}ができました」、実際の弾形・射出パターン（該当時）、
     品質、威力等のその個体の結果（カテゴリ別・装弾数は該当時）を出す。
     自動で消えない・自動装備しない。閉じると元の製作画面へ戻る。
     ================================================================== */
  function resultLayout(){
    const R = UI.result;
    const x0 = Math.round((VW - R.w) / 2), y0 = Math.round((VH - R.h) / 2);   // 170, 36
    return {
      x0, y0, w:R.w, h:R.h, R,
      artY: y0 + R.artY, artH: R.artH,
      artLabelY: y0 + R.artY + R.artH + R.artLabelGap,
      rule: { x0: x0 + 40, x1: x0 + R.w - 40, y: y0 + R.ruleY },
      stats: { x0: x0 + 60, y: y0 + R.statsY, rowH: R.statsRowH },
      close: { x: x0 + R.w / 2 - 180, y: y0 + R.closeY, w: 360, h: R.closeH },
    };
  }
  /* その個体の実値（real があればそれを、無ければ倍率）を表示する。 */
  function statValueText(s){
    return (s.real != null) ? s.real : ('×' + s.value.toFixed(2));
  }
  /* 結果用の大きめプレビュー（実ロールの弾形 / ビーム）。プレビュー API を通すが形は実値。 */
  function drawResultArt(v, x, y, w, h){
    const cx = x + w / 2, cy = y + h / 2;
    if (v.shape){
      ctx.save(); ctx.translate(cx, cy);
      const sc = Math.min(2.6, (h * 0.86) / 16);
      ctx.scale(sc, sc);
      drawProjectileShape(ctx, v.shape.typeId, v.shape.shapeId, 1);
      ctx.restore();
    } else if (v.beam){
      if (v.beam.reflect) drawReflectIcon(ctx, { x:x + 14, y:y + 12, w:w - 28, h:h - 24, color:'#b8f0d0' });
      else drawBeamIcon(ctx, { x:x + 14, y:y + 12, w:w - 28, h:h - 24, color:'#8fe0ff' });
    }
  }
  /* 射出パターンを大きく読ませるアイコン（並列＝平行にずらす／扇＝上下へ開く）。 */
  function drawResultTraj(count, pattern, x, y, w, h, color){
    const n = Math.max(1, Math.floor(Number(count) || 1));
    const pat = normalizedPattern(n, pattern);
    const ox = x + 18, oy = y + h / 2, len = w - 40, half = Math.max(1, (n - 1) / 2);
    ctx.save(); ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(200,235,255,0.85)';
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, TAU); ctx.fill();
    for (let i = 0; i < n; i++){
      const t = (i - (n - 1) / 2) / half;
      const lat = (pat === 'parallel') ? t * (h * 0.22) : 0;
      const endY = (pat === 'fan') ? (oy + t * (h * 0.34)) : (oy + lat);
      ctx.strokeStyle = color; ctx.globalAlpha = 0.26; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(ox, oy + lat); ctx.lineTo(ox + len, endY); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.moveTo(ox, oy + lat); ctx.lineTo(ox + len, endY); ctx.stroke();
    }
    ctx.restore();
  }
  function drawCraftResult(){
    const v = st.craftResult;
    if (!v) return;
    const L = resultLayout(), x0 = L.x0, y0 = L.y0, w = L.w;
    ctx.save();
    /* 背を暗くし、操作を結果へ集中させる（背後の盤面は見えるが触れない）。 */
    ctx.fillStyle = 'rgba(2,6,10,0.74)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textBaseline = 'middle';
    drawPanelChrome(L, '', 10, { plate:false });

    /* 大見出し: 「{実際の武器名}ができました」 */
    ctx.textAlign = 'center';
    ctx.font = font(F.resultTitle);
    ctx.fillStyle = '#fff2da';
    ctx.fillText(craftResultTitle(v), x0 + w / 2, y0 + L.R.titleY);
    ctx.font = font(F.body, false);
    ctx.fillStyle = 'rgba(206,228,238,0.92)';
    ctx.fillText(v.source + '：' + v.name, x0 + w / 2, y0 + L.R.subY);

    /* --- 図の帯: 実際にロールされた弾形・射出パターン（該当時）。ラベルは図の直下。 --- */
    const hasTraj = !!v.salvo;
    const artW = hasTraj ? 300 : 380;
    const leftX = hasTraj ? (x0 + w * 0.5 - artW - 30) : (x0 + w / 2 - artW / 2);
    drawResultArt(v, leftX, L.artY, artW, L.artH);
    ctx.textAlign = 'center'; ctx.font = font(F.bodySmall, false);
    ctx.fillStyle = 'rgba(200,226,238,0.95)';
    ctx.fillText(v.beam ? 'ビーム' : '弾の形', leftX + artW / 2, L.artLabelY);
    if (hasTraj){
      const trajX = x0 + w * 0.5 + 30;
      drawResultTraj(v.salvo.count, v.salvo.pattern, trajX, L.artY, artW, L.artH,
        v.typeId === 'missile' ? '#ffcf8a' : '#bfe9ff');
      ctx.font = font(F.bodySmall, false);
      ctx.fillStyle = 'rgba(200,226,238,0.95)';
      ctx.fillText('射出パターン ' + v.salvo.label, trajX + artW / 2, L.artLabelY);
    }

    /* --- 仕切り（図の帯と数値の帯を分ける） --- */
    ctx.strokeStyle = 'rgba(196,126,70,0.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(L.rule.x0, L.rule.y); ctx.lineTo(L.rule.x1, L.rule.y); ctx.stroke();

    /* --- 数値の帯: その個体の結果（カテゴリ別・装弾数は該当時・品質・外観/音）。 --- */
    const entries = [{ label:'品質', value:v.quality.label, color:v.quality.color }];
    for (const s of v.stats) entries.push({ label:s.name, value:statValueText(s) });
    if (v.ammoCap != null && !v.stats.some(s => s.id === 'ammo')) entries.push({ label:'装弾数', value:String(v.ammoCap) + ' 発' });
    if (v.salvo) entries.push({ label:'同時発射', value:v.salvo.label });
    for (const tr of (v.traits || [])) entries.push({ label:tr.name, value:tr.value });
    if (v.enhance > 0) entries.push({ label:'強化', value:'+' + v.enhance });

    const colW = (w - 120) / 2, perCol = Math.ceil(entries.length / 2);
    ctx.textAlign = 'left';
    entries.forEach((e, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const bx = L.stats.x0 + col * colW, by = L.stats.y + row * L.stats.rowH;
      ctx.font = font(F.body, false);
      ctx.fillStyle = 'rgba(178,206,220,0.95)';
      ctx.fillText(e.label, bx, by);
      ctx.font = font(F.status);
      ctx.fillStyle = e.color || '#f2fbff';
      ctx.fillText(e.value, bx + 168, by);
    });

    /* 大きな「閉じる」（自動では消えない。押すと元の製作画面へ戻る）。 */
    const c = L.close;
    ctx.fillStyle = 'rgba(120,74,32,0.96)';
    roundRect(ctx, c.x, c.y, c.w, c.h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,120,0.9)'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = font(F.btn);
    ctx.fillStyle = '#fff2da';
    ctx.fillText('閉じる', c.x + c.w / 2 - 16, c.y + c.h / 2 + 1);
    ctx.textAlign = 'right';
    ctx.font = font(F.key, false);
    ctx.fillStyle = 'rgba(235,245,250,0.78)';
    ctx.fillText('[Esc]', c.x + c.w - 20, c.y + c.h / 2 + 1);
    ctx.restore();
  }

  /* ==================================================================
     船内インターミッション背景＆立ち絵アニメーション（v3.3.0）
     旧格納庫の 2D 歩行スプライトを廃止し、1 枚の船内ワークショップイラスト＋
     環境アニメーション（深海窓・作業灯ゆらぎ・溶接火花・ホログラム）＋
     エリー／ponco MarkII／Gem の立ち絵アニメーションで構成する。
     ================================================================== */
  function drawCabinScene(){
    // 1) 船内ワークショップ背景イラスト (1280x720)
    if (ready(art.cabin)) {
      ctx.drawImage(art.cabin, 0, 0, VW, VH);
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, VH);
      bg.addColorStop(0, '#07141c');
      bg.addColorStop(1, '#04090e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, VW, VH);
    }

    // 2) 丸窓越しの深海マリンスノーと揺らめく青緑の光筋（生きている船内演出）
    ctx.save();
    ctx.beginPath();
    ctx.arc(822, 186, 172, 0, TAU);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const u = ((t * (0.04 + (i % 4) * 0.015) + i * 0.13) % 1);
      const sx = 665 + ((i * 73) % 315) + Math.sin(t * 0.8 + i) * 14;
      const sy = 20 + u * 340;
      const a = (0.14 + 0.14 * Math.sin(t * 1.6 + i * 2.1)) * Math.sin(u * Math.PI);
      ctx.fillStyle = `rgba(140, 232, 248, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4 + (i % 3) * 0.9, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // 3) 琥珀ケージランプの揺らぎグロー＆作業台のシアンホログラム脈動＆溶接火花
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lampPts = [
      { x: 96, y: 152, r: 120, ph: 0.2 },
      { x: 608, y: 274, r: 95, ph: 1.9 },
      { x: 1156, y: 234, r: 115, ph: 3.7 },
    ];
    for (const lp of lampPts) {
      const fl = 0.82 + 0.18 * Math.sin(t * 2.6 + lp.ph);
      const g = ctx.createRadialGradient(lp.x, lp.y, 2, lp.x, lp.y, lp.r);
      g.addColorStop(0, `rgba(255, 198, 112, ${(0.24 * fl).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255, 130, 48, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lp.x, lp.y, lp.r, 0, TAU); ctx.fill();
    }
    // 潜水艇ホログラムの柔らかい脈動
    const holoPulse = 0.72 + 0.28 * Math.sin(t * 2.8);
    const hg = ctx.createRadialGradient(978, 412, 8, 978, 412, 118);
    hg.addColorStop(0, `rgba(80, 235, 255, ${(0.18 * holoPulse).toFixed(3)})`);
    hg.addColorStop(1, 'rgba(40, 180, 220, 0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(978, 412, 118, 0, TAU); ctx.fill();
    // 溶接火花スパーク（周期的にパチッと光る）
    const sparkCycle = (t * 0.7) % 1;
    if (sparkCycle < 0.28) {
      const sp = Math.sin((sparkCycle / 0.28) * Math.PI);
      const sg = ctx.createRadialGradient(1172, 482, 1, 1172, 482, 48 * sp + 12);
      sg.addColorStop(0, `rgba(255, 236, 170, ${(0.55 * sp).toFixed(3)})`);
      sg.addColorStop(1, 'rgba(255, 140, 40, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(1172, 482, 48 * sp + 12, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // 4) メニュー下部エリアに 3 人のアニメ調 4 コマアニメーション（くつろぎ・溶接・ホログラム作業）を配置
    const sel = menuSelected(st);
    const selId = sel ? sel.id : st.screen;
    const childOpen = !!openChild();
    const charAlpha = childOpen ? 0.52 : 0.98;

    const drawAnimSheet2x2 = (sheet, cx, footY, size, fps, phase, focus, glowCol) => {
      if (!ready(sheet)) return 0;
      const frameIdx = Math.floor((t * fps + phase) % 4);
      const col = frameIdx % 2;
      const row = Math.floor(frameIdx / 2);
      const sw = sheet.naturalWidth / 2;
      const sh = sheet.naturalHeight / 2;
      const scaleF = focus ? 1.05 : 0.98;
      const bob = Math.sin(t * 2.0 + phase * 1.7) * 1.6;
      ctx.save();
      ctx.globalAlpha = charAlpha;
      // 床の接地影（船内床に自然に馴染ませる）
      ctx.fillStyle = 'rgba(2, 6, 10, 0.56)';
      ctx.beginPath();
      ctx.ellipse(cx, footY - 8, size * 0.34, size * 0.075, 0, 0, TAU);
      ctx.fill();
      // 作業・フォーカスに応じた柔らかい環境光の照り返し
      if (glowCol) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, footY - size * 0.42, 8, cx, footY - size * 0.42, size * 0.56);
        g.addColorStop(0, glowCol);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, footY - size * 0.42, size * 0.56, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.translate(cx, footY + bob);
      ctx.scale(scaleF, scaleF);
      ctx.drawImage(sheet, col * sw, row * sh, sw, sh, -size * 0.5, -size, size, size);
      ctx.restore();
      return frameIdx;
    };

    // 左下: Gem（溶接・重工作アニメ）、中央下: エリー（マグカップでくつろぎアニメ）、右下: ponco MarkII（ホログラム作業アニメ）
    const gemF = drawAnimSheet2x2(
      art.gemAnim, 235, VH - 6, 268, 0.88, 0.2,
      selId === 'upgrade' || selId === 'ship',
      'rgba(255, 178, 72, 0.14)'
    );
    // Gem が溶接中（フレーム1）のときは足元にパチッと暖かい照り返しを追加
    if (gemF === 1 && !childOpen) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fl = 0.72 + 0.28 * Math.sin(t * 26);
      const wg = ctx.createRadialGradient(192, VH - 48, 2, 192, VH - 48, 76);
      wg.addColorStop(0, `rgba(255, 224, 130, ${(0.42 * fl).toFixed(3)})`);
      wg.addColorStop(1, 'rgba(255, 130, 30, 0)');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(192, VH - 48, 76, 0, TAU); ctx.fill();
      ctx.restore();
    }

    drawAnimSheet2x2(
      art.ellieAnim, 640, VH - 4, 276, 0.72, 1.4,
      selId === 'depart' || st.screen === 'menu',
      'rgba(255, 212, 152, 0.12)'
    );

    drawAnimSheet2x2(
      art.poncoAnim, 1045, VH - 6, 264, 1.05, 2.5,
      selId === 'weapon' || selId === 'forge',
      'rgba(78, 226, 255, 0.16)'
    );

    // 上部メニューの視認性を保つための柔らかな暗グラデーション
    const topDim = ctx.createLinearGradient(0, 0, 0, VH * 0.65);
    topDim.addColorStop(0, 'rgba(2, 8, 13, 0.46)');
    topDim.addColorStop(1, 'rgba(2, 8, 13, 0.08)');
    ctx.fillStyle = topDim;
    ctx.fillRect(0, 0, VW, VH * 0.65);
  }

  function render(){
    if (!active) return;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#01060a';
    ctx.fillRect(0, 0, view.cssW, view.cssH);

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

    drawCabinScene();
    drawVignette();
    drawHUD();
    drawMenu();         // 親メニュー（整備・改造 / 艇 / 武器 / 指定開発 / 潜航へ戻る）
    drawPanel();
    drawShipPanel();    // 艇選択
    drawWeaponPanel();  // 武器（製造・換装）
    drawForgePanel();   // 開発（指定開発・追加兵装・全自動近接）
    drawCraftResult();  // 製作/開発の成功結果モーダル（最前面）

    ctx.restore();
  }

  /* ==================================================================
     潜航側の外観マーカー（render() から呼ぶ。潜航の描画関数には触らない）
     進入灯 → 岩盤に沿った耐圧モジュール群 → 暖色の入港ドック と段階的に見える。
     ＝単一の四角い塊をやめ、円筒・リブ・梁・接岸口・導灯でシルエットを読ませる。
     ================================================================== */

  /* 耐圧モジュール（横倒しの円筒＋リブ＋端のフランジ＋暖色の覗き窓）。 */
  function drawModule(cx, cy, rx, ry, pulse, lit){
    const r = Math.min(ry, rx);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r + 12, rx * 0.96, r * 0.5, 0, 0, TAU); ctx.fill();

    const bg = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    bg.addColorStop(0, 'rgb(29,52,62)');
    bg.addColorStop(0.5, 'rgb(20,40,49)');
    bg.addColorStop(1, 'rgb(11,23,29)');
    cylinderPath(ctx, cx, cy, rx, ry);
    ctx.fillStyle = bg; ctx.fill();

    /* リブ（輪）＝縦の帯。等間隔に。 */
    ctx.save();
    cylinderPath(ctx, cx, cy, rx, ry); ctx.clip();
    const step = Math.max(26, rx / 5);
    for (let x = cx - rx + r; x <= cx + rx - r; x += step){
      ctx.fillStyle = 'rgba(7,14,19,0.85)'; ctx.fillRect(x - 3, cy - r, 6, r * 2);
      ctx.fillStyle = 'rgba(74,112,124,0.4)'; ctx.fillRect(x + 3, cy - r, 2, r * 2);
      ctx.fillStyle = 'rgba(150,188,198,0.45)';
      for (const yy of [cy - r * 0.55, cy + r * 0.5]){ ctx.beginPath(); ctx.arc(x + 6, yy, 1.5, 0, TAU); ctx.fill(); }
    }
    /* 冷たい環境光のリム（上辺・左辺）。70℃世界観の冷色。 */
    ctx.fillStyle = 'rgba(90,150,172,0.26)'; ctx.fillRect(cx - rx, cy - r, rx * 2, 8);
    ctx.fillStyle = 'rgba(126,196,214,0.5)'; ctx.fillRect(cx - rx, cy - r, rx * 2, 3);
    /* 下辺の陰と錆（使い込まれた設備） */
    ctx.fillStyle = 'rgba(2,7,10,0.6)'; ctx.fillRect(cx - rx, cy + r - 3, rx * 2, 3);
    for (const s of [[-0.55, 0.7], [0.15, 1.0], [0.62, 0.55]]){
      const sx = cx + s[0] * rx;
      const rg = ctx.createLinearGradient(sx, cy, sx, cy + r);
      rg.addColorStop(0, 'rgba(66,38,22,0)');
      rg.addColorStop(1, 'rgba(66,38,22,' + (0.42 * s[1]).toFixed(3) + ')');
      ctx.fillStyle = rg; ctx.fillRect(sx - 6, cy, 12, r);
    }
    /* 点検ハッチ（大きいモジュールのみ） */
    if (rx > 150){
      ctx.fillStyle = 'rgb(15,31,39)';
      ctx.beginPath(); ctx.arc(cx + rx * 0.30, cy + r * 0.20, r * 0.29, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(96,138,150,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(96,138,150,0.36)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++){
        const a = k * Math.PI / 3 + 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + rx * 0.30 - Math.cos(a) * r * 0.22, cy + r * 0.20 - Math.sin(a) * r * 0.22);
        ctx.lineTo(cx + rx * 0.30 + Math.cos(a) * r * 0.22, cy + r * 0.20 + Math.sin(a) * r * 0.22);
        ctx.stroke();
      }
    }
    ctx.restore();

    /* 端のフランジ（ボルト付き） */
    for (const sgn of [-1, 1]){
      ctx.fillStyle = 'rgb(24,44,54)';
      ctx.fillRect(cx + sgn * (rx - r - 6) - 4, cy - r, 8, r * 2);
      ctx.fillStyle = 'rgba(78,120,132,0.45)';
      ctx.fillRect(cx + sgn * (rx - r - 6) - 4, cy - r, 2, r * 2);
      ctx.fillStyle = 'rgba(150,188,198,0.4)';
      for (let yy = cy - r + 8; yy < cy + r; yy += 16){ ctx.beginPath(); ctx.arc(cx + sgn * (rx - r - 6), yy, 1.4, 0, TAU); ctx.fill(); }
    }

    /* 暖色の覗き窓（局所） */
    const n = Math.max(2, Math.floor(rx / 90));
    for (let i = 0; i < n; i++){
      const px = cx - rx * 0.6 + (i / Math.max(1, n - 1)) * rx * 1.2;
      const py = cy - r * 0.28;
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(px, py, 1, px, py, 26);
      gl.addColorStop(0, 'rgba(255,206,140,' + (0.5 * pulse).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(px, py, 26, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,236,190,0.92)';
      ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill();
    }

    /* 上部の小塔・アンテナ（大きいモジュールのみ） */
    if (rx > 180 && lit){
      ctx.fillStyle = 'rgb(22,42,52)';
      ctx.fillRect(cx - 24, cy - r - 26, 48, 28);
      ctx.fillStyle = 'rgba(78,120,132,0.5)';
      ctx.fillRect(cx - 24, cy - r - 26, 4, 28);
      ctx.strokeStyle = 'rgba(120,160,172,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + 12, cy - r - 26); ctx.lineTo(cx + 20, cy - r - 66); ctx.stroke();
    }
    ctx.restore();
  }

  /* 岩盤（海底）に沿った暗い基盤。四角い塊にしない。 */
  function drawBedrock(x, y){
    ctx.save();
    const g = ctx.createLinearGradient(0, y + 30, 0, y + 360);
    g.addColorStop(0, 'rgb(16,30,37)');
    g.addColorStop(1, 'rgb(6,13,17)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 760, y + 150);
    const pts = [[-560, 110], [-360, 140], [-120, 120], [120, 150], [360, 130], [560, 150], [760, 120]];
    for (const p of pts) ctx.lineTo(x + p[0], y + p[1]);
    ctx.lineTo(x + 760, y + 380);
    ctx.lineTo(x - 760, y + 380);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,92,104,0.18)'; ctx.lineWidth = 2;
    for (let i = -5; i <= 5; i++){
      ctx.beginPath();
      ctx.moveTo(x + i * 130, y + 150 + ((i * 37) % 40));
      ctx.lineTo(x + i * 130 + 24, y + 300);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* 梁・支柱（鉄の梁・斜材・ガセット・垂れケーブル）。 */
  function drawBeams(x, y){
    ctx.save();
    ctx.strokeStyle = 'rgba(30,54,64,0.95)'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(x - 560, y - 80); ctx.lineTo(x + 560, y - 40); ctx.stroke();
    ctx.strokeStyle = 'rgba(58,96,108,0.45)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 560, y - 86); ctx.lineTo(x + 560, y - 46); ctx.stroke();
    /* トラスの斜材 */
    ctx.strokeStyle = 'rgba(22,42,52,0.95)'; ctx.lineWidth = 7;
    for (let i = 0; i < 6; i++){
      const bx = x - 480 + i * 190;
      ctx.beginPath(); ctx.moveTo(bx, y - 78 + i * 6); ctx.lineTo(bx + 95, y - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 95, y - 20); ctx.lineTo(bx + 190, y - 72 + i * 6); ctx.stroke();
    }
    /* 支柱（ガセット付き） */
    ctx.strokeStyle = 'rgba(24,44,54,0.95)'; ctx.lineWidth = 10;
    for (const bx of [-420, 0, 420]){
      ctx.beginPath(); ctx.moveTo(x + bx, y - 20); ctx.lineTo(x + bx - 70, y + 150); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + bx, y - 20); ctx.lineTo(x + bx + 70, y + 150); ctx.stroke();
      ctx.fillStyle = 'rgba(30,54,64,0.95)';
      roundRect(ctx, x + bx - 26, y - 34, 52, 26, 4); ctx.fill();
      ctx.fillStyle = 'rgba(90,134,146,0.4)';
      ctx.fillRect(x + bx - 26, y - 34, 52, 2);
    }
    /* 垂れ下がるケーブル束 */
    ctx.strokeStyle = 'rgba(12,24,30,0.85)'; ctx.lineWidth = 2.4;
    for (const cxd of [-300, 180, 500]){
      ctx.beginPath();
      ctx.moveTo(x + cxd, y - 40);
      ctx.quadraticCurveTo(x + cxd + 30, y + 30, x + cxd + 10, y + 92);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* 使い込まれた設備（給排気スタック・パラボラ・係留具）。海の冷色に置く。 */
  function drawEquipment(x, y, pulse){
    ctx.save();
    /* 給排気スタック */
    ctx.fillStyle = 'rgb(20,38,47)';
    ctx.fillRect(x - 430, y - 200, 26, 92);
    ctx.fillStyle = 'rgba(90,134,146,0.4)';
    ctx.fillRect(x - 430, y - 200, 26, 4);
    ctx.fillStyle = 'rgba(10,20,26,0.9)';
    roundRect(ctx, x - 438, y - 212, 42, 14, 3); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const vg = ctx.createRadialGradient(x - 417, y - 228, 2, x - 417, y - 228, 62);
    vg.addColorStop(0, 'rgba(200,228,234,' + (0.10 * pulse).toFixed(3) + ')');
    vg.addColorStop(1, 'rgba(150,200,210,0)');
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.arc(x - 417, y - 228, 62, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    /* パラボラ */
    const dx = x + 470, dy = y - 188;
    ctx.strokeStyle = 'rgba(120,160,172,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(dx, dy, 26, 18, -0.5, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dx - 4, dy + 6); ctx.lineTo(dx - 10, dy + 30); ctx.stroke();
    ctx.fillStyle = 'rgba(96,138,150,0.45)';
    ctx.beginPath(); ctx.arc(dx - 1, dy - 1, 3.5, 0, TAU); ctx.fill();
    /* 係留ボラード */
    for (const bx of [-230, 250]){
      ctx.fillStyle = 'rgb(26,46,56)';
      roundRect(ctx, x + bx - 9, y + 120, 18, 34, 4); ctx.fill();
      ctx.fillStyle = 'rgba(150,188,198,0.4)';
      ctx.fillRect(x + bx - 9, y + 120, 18, 3);
    }
    ctx.restore();
  }

  /* 局所的な暖色の作業灯（モジュールの合わせ目の灯）。全体は塗らない。 */
  function drawWorkLights(x, y, pulse){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lights = [[-520, -20, 68], [-300, -10, 92], [-120, -62, 80], [40, -52, 92], [225, -32, 76], [360, 10, 92], [520, 26, 66]];
    for (const [dx, dy, rr] of lights){
      const lx = x + dx, ly = y + dy;
      const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, rr);
      g.addColorStop(0, 'rgba(255,208,146,' + (0.42 * pulse).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, ly, rr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,232,186,0.92)';
      ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* 暖色に照らされた入港ドックの開口（中央モジュールに開いた口）。 */
  function drawDockMouth(x, y, pulse){
    const w = 260, top = y - 146, bottom = y + 143;
    const left = x - w * 0.5;
    ctx.save();
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#070f13');
    g.addColorStop(0.55, '#0f1d20');
    g.addColorStop(1, '#32312a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(left, top + 56);
    ctx.quadraticCurveTo(x, top - 26, left + w, top + 56);
    ctx.lineTo(left + w, bottom);
    ctx.closePath(); ctx.fill();
    /* 厚い防圧リム（多重フレーム）。ここが基地の要。 */
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,16,20,0.95)'; ctx.lineWidth = 46; ctx.stroke();
    ctx.strokeStyle = '#26383c'; ctx.lineWidth = 34; ctx.stroke();
    ctx.strokeStyle = '#3c5256'; ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = '#8fa2a1'; ctx.lineWidth = 3; ctx.stroke();
    /* リムを留めるボルト（開口の周囲に多点） */
    const archTop = top + 56;
    const rimPts = [];
    for (let i = 0; i <= 3; i++) rimPts.push([left, bottom - i * (bottom - archTop) / 3]);
    for (let i = 1; i < 20; i++){
      const u = i / 20, v = 1 - u;
      rimPts.push([v * v * left + 2 * u * v * x + u * u * (left + w),
                   v * v * archTop + 2 * u * v * (top - 26) + u * u * archTop]);
    }
    for (let i = 0; i <= 3; i++) rimPts.push([left + w, bottom - i * (bottom - archTop) / 3]);
    ctx.fillStyle = 'rgba(150,188,198,0.55)';
    for (let i = 0; i < rimPts.length; i++){
      const p = rimPts[i];
      const q = rimPts[Math.min(i + 1, rimPts.length - 1)];
      const pr = rimPts[Math.max(i - 1, 0)];
      let nx = -(q[1] - pr[1]), ny = (q[0] - pr[0]);
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const ox = p[0] - x, oy = p[1] - (y + 45);
      if (nx * ox + ny * oy < 0){ nx = -nx; ny = -ny; }
      ctx.beginPath(); ctx.arc(p[0] + nx * 20, p[1] + ny * 20, 2.2, 0, TAU); ctx.fill();
    }
    // 開口は暗いまま。奥の軌条と足元の誘導灯でドックの奥行きを出す。
    ctx.beginPath(); ctx.moveTo(left + 34, bottom - 7); ctx.lineTo(x - 27, y + 45);
    ctx.moveTo(left + w - 34, bottom - 7); ctx.lineTo(x + 27, y + 45); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]){
      for (let i = 0; i < 4; i++){
        const lx = x + side * (105 - i * 22), ly = bottom - 11 - i * 25;
        const cg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 44 - i * 7);
        cg.addColorStop(0, `rgba(255,191,110,${0.55 + 0.28 * pulse})`);
        cg.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = cg; ctx.fillRect(lx - 44, ly - 44, 88, 88);
        ctx.fillStyle = '#efc184'; ctx.fillRect(lx - 4, ly - 1, 8, 2);
      }
    }
    ctx.restore();
  }

  /* 基地全体（岩盤・モジュール群・梁・導灯）。stage に応じて入港ドックも。 */
  function drawBaseStructures(x, y, pulse, stage){
    const dock = stage === 'dock';
    drawBedrock(x, y);
    drawBeams(x, y);
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawModule(x + 560, y + 30, 130, 92, pulse, false);
    drawModule(x - 620, y + 40, 110, 80, pulse, false);
    ctx.restore();
    drawModule(x - 350, y - 20, 175, 122, pulse, false);
    drawModule(x + 330, y - 6, 182, 126, pulse, false);
    drawModule(x - 40, y - 60, 236, 162, pulse, true);
    drawEquipment(x, y, pulse);
    if (dock) drawDockMouth(x - 40, y - 60, pulse);
    drawWorkLights(x, y, pulse);
  }

  function renderDiveMarker(camX, camY, m, overlay = false){
    const marker = m && m.marker;
    if (!marker) return;
    const x = marker.x - camX, y = marker.y - camY;
    if (x < -1000 || x > VW + 1000 || y < -1000 || y > VH + 1000) return;
    const stage = m.stage || 'none';
    const pulse = 0.72 + 0.28 * Math.sin(((m.time || 0)) * 2.2);

    ctx.save();

    /* 進入灯: 遠くから見える暖色のビーム＋点列（上空へ伸びるビーコン） */
    if (!overlay && stage !== 'none'){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(0, y - 520, 0, y + 30);
      beam.addColorStop(0, 'rgba(255,205,140,0)');
      beam.addColorStop(1, 'rgba(255,190,120,' + (0.16 * pulse).toFixed(3) + ')');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x - 46, y - 520); ctx.lineTo(x + 46, y - 520);
      ctx.lineTo(x + 150, y + 20); ctx.lineTo(x - 150, y + 20);
      ctx.closePath(); ctx.fill();
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

    /* 岩盤に沿った耐圧モジュール群（wall / dock で見える） */
    if (!overlay){
      if (stage === 'wall' || stage === 'dock') drawBaseStructures(x, y, pulse, stage);
      ctx.restore();
      return;
    }

    /* ラベルとプロンプト */
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(F.bodySmall);
    ctx.fillStyle = 'rgba(232,250,255,0.94)';
    ctx.fillText((m && m.label) || '海底前哨基地', x, y - 300);
    if (m.near){
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin((m.time || 0) * 6);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = font(F.hud);
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
  /* PC マウスクリックもタッチと同じロジックでメニュー・パネルを直接操作できるようにする */
  function handlePoint(p){
    if (st.craftResult){
      const L = resultLayout();
      if (inRect(p, L.close)) st.craftResult = null;
      return;
    }
    const pnl = openChild();
    if (pnl){
      const L = bigLayout();
      if (inRect(p, L.close)){ pnl.close(); return; }
      const isForge = (pnl === forgePanel);
      const design = !!(isForge && pnl.screen && pnl.screen() === 'design');
      const kind = (pnl === panel) ? 'upgrade' : (pnl === shipPanel) ? 'ship' : (pnl === weaponPanel) ? 'weapon' : 'forge';
      const vis = (pnl === weaponPanel) ? WPN_VIS : (pnl === forgePanel) ? FORGE_VIS : UI.childVisible;
      const win = windowFor(pnl, vis);
      const btns = layoutButtons(L, rowButtons(kind, win.rows[win.cur], design));
      for (const b of btns){
        if (b.enabled === false || !b.rect || !inRect(p, b.rect)) continue;
        if (b.id === 'back'){ if (isForge && design && pnl.back) pnl.back(); else pnl.close(); }
        else if (b.id === 'sell') pnl.sell();
        else if (b.id === 'enhance') pnl.enhance();
        else if (b.id === 'primary') pendingAction = true;
        return;
      }
      for (let v = 0; v < win.count; v++){
        const rect = L.row(v);
        if (!inRect(p, rect)) continue;
        const idx = win.start + v;
        pnl.setCursor(idx);
        if (design && win.rows[idx].editable && pnl.adjust){
          pnl.adjust(p.x < rect.x + rect.w / 2 ? -1 : 1);
        }
        return;
      }
      return;
    }
    const L = menuLayout();
    if (inRect(p, L.confirm)){ pendingAction = true; return; }
    const idx = menuRowAt(p);
    if (idx >= 0) st.cursor = idx;
  }

  function click(x, y){
    if (!active) return;
    handlePoint({ x, y });
  }

  function touchStart(e){
    Input.mode = 'touch';
    for (const touch of e.changedTouches){
      handlePoint(toLogical(touch.clientX, touch.clientY));
    }
    e.preventDefault();
  }

  function state(){
    const el = st.ellie;
    return {
      active,
      screen: st.screen,                 // v1.16.0: 'menu' | 'upgrade' | 'ship' | 'weapon' | 'forge'
      menuOpen: st.screen === 'menu',
      cursor: st.cursor,
      selectedId: menuSelected(st) ? menuSelected(st).id : null,
      ellie: {                           // v1.16.0: 背景で自律行動するエリー（観測用）
        x: Math.round(el.x), facing: el.facing, anim: el.anim, mode: el.mode,
      },
      ship: currentShip(),               // v1.13.0: 現在の艇
      msg: st.msg,
      craftResult: st.craftResult ? Object.assign({}, st.craftResult) : null,   // v1.19.0: 結果モーダル（観測用）
      panel: panel ? { open: panel.isOpen(), cursor: panel.cursor(), rows: panel.isOpen() ? panel.rows().length : 0 } : null,
      shipPanel: shipPanel ? { open: shipPanel.isOpen(), cursor: shipPanel.cursor(), rows: shipPanel.isOpen() ? shipPanel.rows().length : 0 } : null,
      weaponPanel: weaponPanel ? { open: weaponPanel.isOpen(), cursor: weaponPanel.cursor(), rows: weaponPanel.isOpen() ? weaponPanel.rows().length : 0 } : null,
      forgePanel: forgePanel ? { open: forgePanel.isOpen(), screen: forgePanel.screen ? forgePanel.screen() : null, cursor: forgePanel.cursor(), rows: forgePanel.isOpen() ? forgePanel.rows().length : 0 } : null,
    };
  }

  return { enter, leave, reset, update, render, renderDiveMarker: () => {}, touchStart, click, state, isActive: () => active };
}
