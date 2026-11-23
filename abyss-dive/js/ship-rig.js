/**
 * ABYSS DIVE — 潜水艇の見分け用の「軽量な差分」＋火力型の専用船体（描画のみ / 色に依存しない）
 *
 * v1.13.0: 09 の絵柄を崩さず、艇ごとに輪郭が読み分けられる装備を足す。
 *   - 機動型：上下の増加フィン＋尾部の追加推進器（2 基）＝細く尖ったシルエット
 *   - バリア型：船体上のバリア発生器（突起したリング）＝頭上の環
 *   - 09 万能型：何も足さない（現行のまま）
 *
 * v1.20.0: 火力型だけは「09 素材に箱/筒を貼る」のをやめ、専用の船体を持つ別の艇にする。
 *   - `hasBespokeHull('firepower')` が true のとき、呼び出し側は 09 素材を描かず
 *     `drawShipBody` でこの船体（低く厚い耐圧胴＋一体の兵装区画＋荷重を支える継手＋短い排気）を描く。
 *   - 前面（+x＝船首）と後面でシルエットが非対称＝向きが読める。
 *   - 船首の灯火は潜航の光条の出所（game.js の LAMP_X=59 / LAMP_Y=17）と一致＝ライトが浮かない。
 *   - 09 のリベット・暖色灯・擦れ・素材（暗い青緑の鋼＋暖色の灯火＋冷たいリム）を基準にする。
 *   - 見た目だけ。当たり・照準・発射位置・物理・バリア・艇の実性能には触れない。
 *
 * どれも「形」で違う（色だけで区別しない）。ゲーム（game.js の潜航）と
 * 格納庫（base.js）の両方で同じ関数を使う。引数の (w, h) は船体の表示サイズ。
 */

const STEEL = 'rgba(38,50,58,0.96)';
const STEEL_D = 'rgba(18,26,32,0.96)';
const RIM = 'rgba(150,206,226,0.55)';
const RIM_HI = 'rgba(200,232,244,0.75)';

/* 縮尺の下限（潰れない目安。ドック等の小表示でも形を保つ）。 */
export const MIN_HULL = Object.freeze({ w: 60, h: 22 });

/* 潜航の光条の出所（game.js の LAMP_X / LAMP_Y と一致させる）。船体の灯火はここに載る。 */
const LAMP_X = 59, LAMP_Y = 17, LAMP_W = 150, LAMP_H = 54;

/* ==========================================================================
   v1.21.0: 火力型の船体は「オフライン（Blender/Cycles）で焼いた透過 WebP の板」で描く。
   - 板は設計座標（w=150/h=54 の船体ローカル、+x=船首・原点=船体中心）で作る。
     box = 板が覆う設計範囲。呼び出し側の (w,h) へ x/y 独立の比例で写す（潜航=150x54）。
   - 遅延ロード：火力型が最初に描かれるときだけ読み込む。未ロード／失敗はプロシージャルの船体へ戻す。
   - 形は v1.20.0 のプロシージャル船体と同じ（低く厚い胴・一体の兵装区画・前後の非対称）。
     灯火/発射口/排気の位置は設計座標で一致するので、潜航の光条・照準と浮かない。
   ========================================================================== */
export const FIREPOWER_PLATE = Object.freeze({
  file: 'firepower-hull.webp',
  design: Object.freeze({ w: 150, h: 54 }),
  /* 設計座標での板の範囲（低く厚い胴・衝角・発射口・継手・排気・船尾のプロペラまで収める）。 */
  box: Object.freeze({ x0: -96, y0: -42, x1: 88, y1: 38 }),
});

/** 板の描画矩形（純粋）。呼び出し側の (w,h) へ設計箱を比例で写す（潜航=150x54 で設計箱と一致）。 */
export function firepowerPlateRect(w, h){
  const d = FIREPOWER_PLATE.design, b = FIREPOWER_PLATE.box;
  const sx = (Number(w) || d.w) / d.w, sy = (Number(h) || d.h) / d.h;
  return { x: b.x0 * sx, y: b.y0 * sy, w: (b.x1 - b.x0) * sx, h: (b.y1 - b.y0) * sy };
}

/* 遅延ロード（モジュール内で 1 枚だけ）。失敗したら二度と試みない＝プロシージャルのまま。 */
let _plateReady = null;        // 読み込み済みの板（HTMLImageElement）
let _plateLoading = null;      // 読み込み中の板
let _plateFailed = false;      // 読み込みに失敗（以後プロシージャル）
function plateImage(){
  if (_plateReady) return _plateReady;
  if (_plateFailed) return null;
  if (!_plateLoading){
    let img;
    /* 画像が作れない環境（node テスト等）ではプロシージャルへ。 */
    try { img = new Image(); } catch (e) { _plateFailed = true; return null; }
    if (!img){ _plateFailed = true; return null; }
    img.onload = () => { if (img.naturalWidth > 0) _plateReady = img; else _plateFailed = true; };
    img.onerror = () => { _plateFailed = true; _plateLoading = null; };
    try { img.src = new URL('../assets/' + FIREPOWER_PLATE.file, import.meta.url).href; }
    catch (e) { _plateFailed = true; return null; }
    _plateLoading = img;
  }
  if (_plateLoading && _plateLoading.complete && _plateLoading.naturalWidth > 0){ _plateReady = _plateLoading; return _plateReady; }
  return null;
}

/** 焼き板が使えるか（読み込み済み）。検証用。 */
export function firepowerPlateReady(){ return !!plateImage(); }

/** いま船体を何で描くか（'plate' | 'procedural' | 'sprite'）。検証用。 */
export function hullSource(id){
  if (!hasBespokeHull(id)) return 'sprite';
  return plateImage() ? 'plate' : 'procedural';
}

/** 検証用：板を差し替える（null でローダを初期状態へ戻す）。本番では呼ばない。 */
export function setFirepowerPlate(img){
  _plateReady = img || null;
  _plateLoading = null;
  _plateFailed = false;
}

function tri(g, a, b, c, fill, stroke) {
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(1, stroke.w || 1.4); g.stroke(); }
}
function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}
function lw0(h) { return Math.max(1, h * 0.028); }

/* 付属物の下に落とす接地影（貼った箱に見せない）。 */
function contactShadow(g, cx, cy, rx, ry, a) {
  const A = (a == null ? 0.6 : a);
  const R = Math.max(rx, ry);
  const s = g.createRadialGradient(0, 0, 0, 0, 0, R);
  s.addColorStop(0, 'rgba(3,7,10,' + A + ')');
  s.addColorStop(0.68, 'rgba(3,7,10,' + (A * 0.34).toFixed(3) + ')');
  s.addColorStop(1, 'rgba(3,7,10,0)');
  g.save(); g.translate(cx, cy); g.scale(rx / R, ry / R);
  g.fillStyle = s; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  g.restore();
}

/* 小さな金属部品の面（上ほど明るい縦グラデ）。 */
function fittingGradient(g, top, bot, warm) {
  const gr = g.createLinearGradient(0, top, 0, bot);
  gr.addColorStop(0,    warm ? 'rgba(146,128,98,1)' : 'rgba(118,128,124,1)');
  gr.addColorStop(0.22, 'rgba(74,84,82,1)');
  gr.addColorStop(0.62, 'rgba(40,52,58,1)');
  gr.addColorStop(1,    'rgba(16,24,30,1)');
  return gr;
}

/** 火力型かどうか（専用の船体を持つ艇）。未知は 09 扱い＝false。 */
export function hasBespokeHull(id) { return id === 'firepower'; }

/**
 * 火力型の船体の作りを数値で表す（描画とテストで共有）。原点＝船体中心、+x＝船首。
 * 低く厚い（幅 > 高さ・下部が厚い）・前後が非対称（船首が張り出し船尾が絞る）を保証する。
 * 灯火は潜航の光条の出所（LAMP_X=59 / LAMP_Y=17）に、w=150・h=54 で一致する。
 */
export function firepowerLandmarks(w, h) {
  const bowX = w * 0.52, sternX = -w * 0.48;
  const topY = -h * 0.46, bottomY = h * 0.54;          // 低い胴＋下部（腹部）が厚い＝重い
  const lampX = w * (LAMP_X / LAMP_W);
  const lampY = h * (LAMP_Y / LAMP_H);
  return {
    w, h, bowX, sternX, topY, bottomY,
    muzzleX: w * 0.34,                                  // 主兵装の発射口（船首寄り）
    muzzle: [ { x: w * 0.34, y: -h * 0.19 }, { x: w * 0.34, y: h * 0.07 } ],   // 2 門
    sternTaper: 0.42,                                   // 船尾の絞り（<1）
    lamps: [ { x: lampX, y: -lampY }, { x: lampX, y: lampY } ],
    /* 一体の兵装区画（船体の内側）。舷＝見える側面、腹部＝下側。 */
    arms: [ { x: -w * 0.06, y: h * 0.30 }, { x: w * 0.02, y: -h * 0.02 } ],
    /* 荷重を支える継手（船体と区画をつなぐ短い支柱）。 */
    joints: [ { x: -w * 0.28, y: h * 0.36 }, { x: -w * 0.04, y: h * 0.46 }, { x: w * 0.16, y: h * 0.40 } ],
    /* 短い排気（上部後方）。 */
    exhausts: [ { x: -w * 0.20, y: topY * 0.62 }, { x: -w * 0.32, y: topY * 0.58 } ],
    /* 暖色の覗き窓。 */
    portholes: [ { x: w * 0.20, y: -h * 0.16 }, { x: w * 0.08, y: -h * 0.16 }, { x: -w * 0.04, y: -h * 0.14 } ],
  };
}

/**
 * 船体（中心＝原点、幅 w・高さ h）に艇の差分を重ねる。
 * opts.glow=true のとき縁を強め（潜航の発光下でも読める）。
 * 火力型は専用船体（drawShipBody）側で描くので、ここでは何も足さない。
 */
export function drawShipRig(g, id, w, h, opts) {
  if (id === 'mobility') return drawMobility(g, w, h);
  if (id === 'barrier') return drawBarrierRig(g, w, h);
  /* 09 = 差分なし。firepower = 専用船体を drawShipBody で描く（ここでは何もしない）。 */
}

/**
 * 専用の船体を描く（火力型のみ）。中心＝原点・+x＝船首。09 素材は呼び出し側が描かない。
 * v1.21.0: 焼き板（透過 WebP）があればそれを、無ければ従来のプロシージャル船体を描く。
 * @returns true を返したら船体を描いた（呼び出し側は 09 素材を描かない）。
 */
export function drawShipBody(g, id, w, h, opts) {
  if (!hasBespokeHull(id)) return false;
  const o = opts || {};
  const img = o.plate || plateImage();
  if (img) {
    /* 板を設計箱の比例で貼る（潜航=150x54 で設計箱そのもの）。灯火/発射口/排気の位置が設計座標と一致。 */
    const r = firepowerPlateRect(w, h);
    g.drawImage(img, r.x, r.y, r.w, r.h);
  } else {
    drawFirepowerHull(g, w, h, o);
  }
  return true;
}

/**
 * プロシージャルな船体（板が無い/読み込みに失敗したときのフォールバック。比較用にも使う）。
 * 見た目だけ。当たり・照準・発射位置・物理には触れない。
 */
export function drawFirepowerProcedural(g, w, h, opts) {
  drawFirepowerHull(g, w, h, opts || {});
}

/* ==========================================================================
   火力型：低く厚い耐圧胴の重装艇。兵装区画は船体と一体、継手と短い排気で重さを支える。
   ========================================================================== */
function drawFirepowerHull(g, w, h, opts) {
  const L = firepowerLandmarks(w, h);
  const lw = Math.max(1, h * 0.045);
  const lit = opts.glow !== false;
  const H = L.bottomY - L.topY;                 // 胴の全高

  g.save();

  /* --- 1. 低く厚い耐圧胴（船体）＝面で塗る --- */
  hullPath(g, L);
  const hl = g.createLinearGradient(0, L.topY, 0, L.bottomY);
  hl.addColorStop(0,    'rgba(164,146,108,1)');   // 上部の暖色リム（潜航/接岸の光）
  hl.addColorStop(0.12, 'rgba(104,102,86,1)');
  hl.addColorStop(0.34, 'rgba(58,68,70,1)');
  hl.addColorStop(0.62, 'rgba(34,46,52,1)');
  hl.addColorStop(0.85, 'rgba(18,28,34,1)');
  hl.addColorStop(1,    'rgba(7,12,16,1)');
  g.fillStyle = hl; g.fill();

  /* --- 2. 胴の中の回り込み・陰・板・リベット（船体にクリップ） --- */
  g.save();
  hullPath(g, L); g.clip();

  /* 上部の鏡面（いちばん明るい帯＝丸みを出す） */
  const spec = g.createLinearGradient(0, L.topY, 0, L.topY + H * 0.30);
  spec.addColorStop(0,    'rgba(255,244,214,0)');
  spec.addColorStop(0.28, 'rgba(255,242,208,' + (lit ? 0.34 : 0.22) + ')');
  spec.addColorStop(1,    'rgba(255,240,200,0)');
  g.fillStyle = spec; g.fillRect(-w, L.topY, w * 2.4, H * 0.32);
  /* 下部の陰（丸みの下側） */
  const occ = g.createLinearGradient(0, L.bottomY - H * 0.34, 0, L.bottomY + 2);
  occ.addColorStop(0, 'rgba(0,0,0,0)');
  occ.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = occ; g.fillRect(-w, L.bottomY - H * 0.34, w * 2.4, H * 0.4);
  /* 前後の暗がり（長さ＝丸みを出す） */
  for (const sgn of [1, -1]) {
    const x0 = sgn > 0 ? L.bowX - w * 0.3 : L.sternX;
    const eg = g.createLinearGradient(sgn > 0 ? L.bowX : L.sternX, 0, sgn > 0 ? L.bowX - w * 0.3 : L.sternX + w * 0.3, 0);
    eg.addColorStop(0, 'rgba(0,0,0,0.30)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = eg; g.fillRect(x0, L.topY, w * 0.32, H);
  }

  /* 板の合わせ目（緩く・影＋リム） */
  for (const sx of [-0.32, -0.16, 0.02, 0.20, 0.32]) {
    const x = sx * w;
    g.strokeStyle = 'rgba(6,11,14,0.45)'; g.lineWidth = Math.max(1, lw * 0.5);
    g.beginPath(); g.moveTo(x, L.topY); g.lineTo(x + w * 0.012, L.bottomY); g.stroke();
    g.strokeStyle = 'rgba(150,196,214,0.09)'; g.lineWidth = Math.max(1, lw * 0.34);
    g.beginPath(); g.moveTo(x + lw * 0.6, L.topY); g.lineTo(x + lw * 0.6 + w * 0.012, L.bottomY); g.stroke();
  }
  rivetRow(g, L, w, h, 'top');
  rivetRow(g, L, w, h, 'bottom');
  /* 錆/擦れの縦筋（下部寄り・後方寄り） */
  for (const s of [[-0.36, 0.7], [-0.14, 1.0], [0.05, 0.6], [0.24, 0.9]]) {
    const sx = s[0] * w;
    const rg = g.createLinearGradient(sx, L.topY, sx, L.bottomY);
    rg.addColorStop(0, 'rgba(120,66,34,0)');
    rg.addColorStop(0.55, 'rgba(120,66,34,' + (0.12 * s[1]).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(96,52,26,' + (0.30 * s[1]).toFixed(3) + ')');
    g.fillStyle = rg; g.fillRect(sx - w * 0.014, L.topY, w * 0.028, H);
  }
  /* 暖色の覗き窓（局所の発光。09 の灯火と同じ色） */
  for (const p of L.portholes) {
    g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(p.x, p.y, 1, p.x, p.y, h * 0.34);
    gl.addColorStop(0, 'rgba(255,205,140,0.5)');
    gl.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(p.x, p.y, h * 0.34, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    /* 座金 → ガラス → 上辺のハイライト */
    g.fillStyle = 'rgba(12,18,22,0.95)';
    roundRect(g, p.x - h * 0.065, p.y - h * 0.085, h * 0.13, h * 0.17, h * 0.045); g.fill();
    g.fillStyle = 'rgba(255,238,196,0.94)';
    roundRect(g, p.x - h * 0.05, p.y - h * 0.07, h * 0.10, h * 0.14, h * 0.04); g.fill();
    g.fillStyle = 'rgba(255,255,240,0.85)';
    g.fillRect(p.x - h * 0.05, p.y - h * 0.07, h * 0.10, h * 0.02);
  }
  /* 型の刻印（09 の「09」と同格）。薄い座金に載せて浮かせない。 */
  g.fillStyle = 'rgba(20,28,32,0.5)';
  roundRect(g, -w * 0.34, -h * 0.10, w * 0.09, h * 0.20, h * 0.02); g.fill();
  g.fillStyle = 'rgba(224,232,236,0.42)';
  g.font = 'bold ' + Math.max(7, Math.round(h * 0.17)) + 'px "Yu Gothic UI",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('重', -w * 0.295, 0);
  g.restore();

  /* --- 3. 船体の輪郭（面の後に締める。付属物はこの上に載る） --- */
  hullPath(g, L);
  g.strokeStyle = 'rgba(206,228,240,' + (lit ? 0.5 : 0.36) + ')'; g.lineWidth = Math.max(1, lw * 0.9); g.stroke();
  /* 甲板の稜線（上辺の冷たいリム） */
  g.save(); hullPath(g, L); g.clip();
  g.strokeStyle = 'rgba(228,244,252,' + (lit ? 0.55 : 0.4) + ')'; g.lineWidth = Math.max(1, lw * 0.7);
  g.beginPath(); g.moveTo(L.bowX - w * 0.34, L.topY); g.lineTo(-w * 0.30, L.topY * 0.98); g.stroke();
  g.restore();

  /* --- 4. 船首（前面）：装甲化した衝角＋ツインのヘッドライト＋主発射口 --- */
  drawFirepowerBow(g, L, w, h, lw, lit);

  /* --- 5. 上部の装甲ケーシング（一体）＋発射セル --- */
  drawFirepowerCasemate(g, L, w, h, lw, lit);

  /* --- 6. 舷/腹部の兵装区画（フェアリングで一体に見せる） --- */
  drawFirepowerBlister(g, L, w, h, lw);

  /* --- 7. 荷重を支える継手（腹部区画と船体をつなぐ短い支柱） --- */
  for (const j of L.joints) {
    const topX = j.x + w * 0.03, topY = j.y + h * 0.08, botX = j.x - w * 0.01, botY = j.y - h * 0.10;
    contactShadow(g, botX, botY, h * 0.10, h * 0.07, 0.45);
    g.strokeStyle = 'rgba(10,16,20,0.98)'; g.lineWidth = Math.max(1, lw * 1.9);
    g.beginPath(); g.moveTo(botX, botY); g.lineTo(topX, topY); g.stroke();
    g.strokeStyle = 'rgba(126,158,172,0.5)'; g.lineWidth = Math.max(1, lw * 0.55);
    g.beginPath(); g.moveTo(botX - lw * 0.5, botY); g.lineTo(topX - lw * 0.5, topY); g.stroke();
    g.fillStyle = 'rgba(206,220,228,0.55)';
    g.beginPath(); g.arc(topX, topY, Math.max(1, lw * 0.7), 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(botX, botY, Math.max(1, lw * 0.6), 0, Math.PI * 2); g.fill();
  }

  /* --- 8. 短い排気（上部後方）。接地影＋面＋リム＋煤で「貼った筒」にしない --- */
  for (const ex of L.exhausts) {
    const sx = ex.x, sy = ex.y, tw = w * 0.036, bh2 = h * 0.34;
    contactShadow(g, sx, sy + h * 0.03, w * 0.06, h * 0.055, 0.6);
    /* 台座のカラー（船体に載る土台）＝浮いた筒にしない */
    g.fillStyle = 'rgba(10,16,20,0.9)';
    roundRect(g, sx - tw * 1.05, sy - h * 0.02, tw * 2.1, h * 0.07, h * 0.02); g.fill();
    g.strokeStyle = 'rgba(120,152,164,0.4)'; g.lineWidth = Math.max(1, lw * 0.4); g.stroke();
    g.fillStyle = fittingGradient(g, sy - bh2, sy);
    roundRect(g, sx - tw * 0.5, sy - bh2, tw, bh2, h * 0.03); g.fill();
    g.strokeStyle = 'rgba(8,12,16,0.8)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
    g.strokeStyle = 'rgba(150,200,216,0.4)'; g.lineWidth = Math.max(1, lw * 0.4);
    g.beginPath(); g.moveTo(sx - tw * 0.5 + lw * 0.5, sy - bh2); g.lineTo(sx - tw * 0.5 + lw * 0.5, sy); g.stroke();
    g.fillStyle = 'rgba(10,14,18,0.98)';
    roundRect(g, sx - tw * 0.56, sy - bh2 - h * 0.01, tw * 1.12, h * 0.05, h * 0.02); g.fill();
    g.fillStyle = 'rgba(58,44,30,0.85)';
    roundRect(g, sx - tw * 0.5, sy - bh2 - h * 0.005, tw, h * 0.02, h * 0.01); g.fill();
  }

  /* --- 9. 船尾：シャウド＋プロペラ＋尾部スタビライザー（前面と非対称） --- */
  drawFirepowerStern(g, L, w, h, lw);

  g.restore();
}

/* 低く厚い耐圧胴のパス（前後で非対称・下部が厚い）。 */
function hullPath(g, L) {
  const { w, h, bowX, sternX, topY, bottomY } = L;
  g.beginPath();
  g.moveTo(bowX, 0);
  g.bezierCurveTo(bowX - w * 0.08, topY * 0.72, bowX - w * 0.20, topY * 0.98, bowX - w * 0.38, topY * 0.96);
  g.bezierCurveTo(-w * 0.06, topY * 1.04, -w * 0.28, topY * 0.98, sternX + w * 0.05, topY * 0.60);
  g.bezierCurveTo(sternX + w * 0.015, topY * 0.28, sternX, -h * 0.12, sternX, 0);
  g.bezierCurveTo(sternX, h * 0.16, sternX + w * 0.03, bottomY * 0.34, sternX + w * 0.09, bottomY * 0.60);
  g.bezierCurveTo(-w * 0.20, bottomY * 1.03, w * 0.10, bottomY * 1.05, w * 0.32, bottomY * 0.74);
  g.bezierCurveTo(bowX - w * 0.06, bottomY * 0.46, bowX - w * 0.02, h * 0.26, bowX, 0);
  g.closePath();
}

/* 上/下の縁に沿うリベット列（船体の弧になじませる）。 */
function rivetRow(g, L, w, h, edge) {
  const { bowX, sternX, topY, bottomY } = L;
  const y0 = edge === 'top' ? topY : bottomY;
  const n = Math.max(6, Math.round(w / (h * 0.34)));
  const s = lw0(h);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = bowX - t * (bowX - sternX);
    const edgeT = edge === 'top' ? Math.abs(t - 0.5) * 0.7 : Math.abs(t - 0.62) * 0.6;
    const y = y0 + edgeT * (edge === 'top' ? h * 0.20 : -h * 0.16);
    g.fillStyle = 'rgba(6,12,16,0.66)';
    g.fillRect(x - s * 0.5, y - s * 0.5, s, s);
    g.fillStyle = 'rgba(190,196,178,0.28)';
    g.fillRect(x - s * 0.5, y - s * 0.5 - 1, s * 0.7, 1);
  }
}

/* 船首：装甲化した衝角＋ツインのヘッドライト＋主発射口（何のための形か読める）。 */
function drawFirepowerBow(g, L, w, h, lw, lit) {
  const { bowX } = L;
  /* 主発射口（船首寄りに 2 門）。接地影＋面一の口。 */
  const mx = L.muzzleX, my = -h * 0.06;
  for (const dy of [-h * 0.13, h * 0.13]) {
    const cxm = mx + w * 0.04, cym = my + dy;
    contactShadow(g, cxm, cym, h * 0.16, h * 0.14, 0.45);
    g.fillStyle = 'rgba(10,16,20,0.98)';
    roundRect(g, mx - w * 0.09, cym - h * 0.10, w * 0.13, h * 0.20, h * 0.05); g.fill();
    g.strokeStyle = 'rgba(8,12,16,0.8)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
    g.fillStyle = 'rgba(6,10,12,1)';
    g.beginPath(); g.arc(cxm, cym, h * 0.075, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,158,172,0.55)'; g.lineWidth = Math.max(1, lw * 0.5);
    g.beginPath(); g.arc(cxm, cym, h * 0.075, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,178,104,0.42)';
    g.beginPath(); g.arc(cxm - h * 0.005, cym, h * 0.05, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,224,180,0.6)';
    g.fillRect(cxm - h * 0.075, cym - h * 0.075, h * 0.15, h * 0.018);
  }

  /* 装甲化した衝角（鎧板）＝面で描く */
  g.save();
  g.beginPath();
  g.moveTo(bowX, 0);
  g.bezierCurveTo(bowX - w * 0.08, -h * 0.30, bowX - w * 0.14, -h * 0.44, bowX - w * 0.20, -h * 0.46);
  g.lineTo(bowX - w * 0.20, h * 0.50);
  g.bezierCurveTo(bowX - w * 0.14, h * 0.50, bowX - w * 0.08, h * 0.34, bowX, 0);
  g.closePath();
  const bg = g.createLinearGradient(0, -h * 0.46, 0, h * 0.50);
  bg.addColorStop(0,    'rgba(120,110,88,1)');
  bg.addColorStop(0.28, 'rgba(62,66,62,1)');
  bg.addColorStop(0.7,  'rgba(30,40,46,1)');
  bg.addColorStop(1,    'rgba(12,18,22,1)');
  g.fillStyle = bg; g.fill();
  g.strokeStyle = 'rgba(196,220,232,0.34)'; g.lineWidth = Math.max(1, lw * 0.7); g.stroke();
  g.strokeStyle = 'rgba(8,12,16,0.5)'; g.lineWidth = Math.max(1, lw * 0.5);
  for (const t of [-0.28, -0.05, 0.2]) {
    g.beginPath(); g.moveTo(bowX - w * 0.10, t * h); g.lineTo(bowX - w * 0.02, t * h * 0.6); g.stroke();
  }
  g.fillStyle = 'rgba(6,12,16,0.55)';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(bowX - w * 0.19, -h * 0.36 + i * h * 0.14, lw0(h) * 0.7, 0, Math.PI * 2); g.fill(); }
  g.restore();

  /* ツイン・ヘッドライト（潜航の光条の出所と一致）。座→暗いベゼル→灯体→レンズ→グロー。 */
  for (const lamp of L.lamps) {
    g.save();
    g.translate(lamp.x, lamp.y);
    const R = Math.max(3, h * 0.14);
    /* 座の接地影（船体に載る）＋暗いベゼル（座ぐり） */
    contactShadow(g, 0, R * 0.5, R * 1.7, R * 1.2, 0.5);
    g.fillStyle = 'rgba(6,10,14,0.98)';
    g.beginPath(); g.arc(0, 0, R * 1.20, 0, Math.PI * 2); g.fill();
    g.fillStyle = fittingGradient(g, -R, R);
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(8,12,16,0.85)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
    g.strokeStyle = 'rgba(210,232,244,0.5)'; g.lineWidth = Math.max(1, lw * 0.4);
    g.beginPath(); g.arc(0, 0, R - lw * 0.4, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    if (lit) {
      const lg = g.createRadialGradient(-R * 0.25, -R * 0.25, 1, 0, 0, R * 0.86);
      lg.addColorStop(0, '#fffdf0'); lg.addColorStop(0.42, '#ffe9a0'); lg.addColorStop(1, '#a8741a');
      g.fillStyle = lg; g.beginPath(); g.arc(0, 0, R * 0.72, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'lighter';
      const halo = g.createRadialGradient(0, 0, R * 0.7, 0, 0, R * 1.7);
      halo.addColorStop(0, 'rgba(255,214,140,0.22)'); halo.addColorStop(1, 'rgba(255,180,90,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(0, 0, R * 1.7, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    } else {
      g.fillStyle = 'rgba(150,176,188,0.55)';
      g.beginPath(); g.arc(0, 0, R * 0.62, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
}

/* 上部の装甲ケーシング（船体と一体・低く流れる）＋発射セル（箱を貼らない）。 */
function drawFirepowerCasemate(g, L, w, h, lw, lit) {
  const { topY, bowX, sternX } = L;
  const deck = topY + h * 0.03;             // 甲板線（船体上辺のすぐ内側＝はみ出さない）
  const base = topY + h * 0.26;             // ケーシングの下辺
  const cy = (deck + base) / 2;
  const fx = bowX - w * 0.26;               // 前端（船首側でのはみ出しを避けて後方へ）
  contactShadow(g, -w * 0.02, base, w * 0.34, h * 0.09, 0.55);
  g.beginPath();
  g.moveTo(fx, deck + h * 0.03);
  g.bezierCurveTo(w * 0.12, deck - h * 0.01, -w * 0.12, deck - h * 0.01, sternX + w * 0.18, base - h * 0.03);
  g.lineTo(sternX + w * 0.18, base);
  g.bezierCurveTo(-w * 0.12, base - h * 0.02, w * 0.12, base - h * 0.02, fx, base);
  g.closePath();
  g.fillStyle = fittingGradient(g, deck - h * 0.01, base, true);
  g.fill();
  g.strokeStyle = 'rgba(8,12,16,0.7)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
  /* 上稜の明るいリム */
  g.strokeStyle = 'rgba(228,244,252,0.45)'; g.lineWidth = Math.max(1, lw * 0.5);
  g.beginPath(); g.moveTo(fx, deck + h * 0.03);
  g.bezierCurveTo(w * 0.12, deck - h * 0.01, -w * 0.12, deck - h * 0.01, sternX + w * 0.18, base - h * 0.03); g.stroke();
  /* 発射セル（凹んだハッチ・暖色の状態灯）を等間隔に */
  const cells = 3, c0 = fx - w * 0.04, c1 = sternX + w * 0.30;
  for (let i = 0; i < cells; i++) {
    const cx = c0 + (c1 - c0) * (i / (cells - 1));
    g.fillStyle = 'rgba(8,12,16,0.55)';
    roundRect(g, cx - w * 0.05, cy - h * 0.055, w * 0.10, h * 0.15, h * 0.02); g.fill();
    g.fillStyle = fittingGradient(g, cy - h * 0.045, cy + h * 0.09);
    roundRect(g, cx - w * 0.045, cy - h * 0.045, w * 0.09, h * 0.13, h * 0.02); g.fill();
    g.strokeStyle = 'rgba(8,12,16,0.7)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
    g.strokeStyle = 'rgba(196,224,236,0.35)'; g.lineWidth = Math.max(1, lw * 0.36);
    g.beginPath(); g.moveTo(cx - w * 0.045, cy - h * 0.045); g.lineTo(cx + w * 0.045, cy - h * 0.045); g.stroke();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,196,120,' + (lit ? 0.85 : 0.4) + ')';
    g.beginPath(); g.arc(cx, cy + h * 0.015, h * 0.045, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(255,236,196,' + (lit ? 0.95 : 0.5) + ')';
    g.beginPath(); g.arc(cx, cy + h * 0.015, Math.max(1, h * 0.022), 0, Math.PI * 2); g.fill();
  }
  /* 甲板のリベット列 */
  g.fillStyle = 'rgba(6,12,16,0.6)';
  const s = lw0(h);
  for (let i = 0; i <= 8; i++) {
    const x = (bowX - w * 0.16) - (bowX - sternX - w * 0.34) * (i / 8);
    g.fillRect(x, base - h * 0.015, s, s);
  }
}

/* 舷/腹部の兵装区画（フェアリングで船体と一体）。箱/筒を貼らない。 */
function drawFirepowerBlister(g, L, w, h, lw) {
  /* 腹部の大型区画（船体の内側に収める＝切り落とされない） */
  const bx = -w * 0.06, by = h * 0.24, bw = w * 0.46, bh = h * 0.38;
  contactShadow(g, bx, by, bw * 0.6, bh * 0.7, 0.45);
  g.beginPath();
  g.moveTo(bx - bw * 0.5, by);
  g.bezierCurveTo(bx - bw * 0.46, by - bh * 0.5, bx + bw * 0.46, by - bh * 0.5, bx + bw * 0.5, by);
  g.bezierCurveTo(bx + bw * 0.42, by + bh * 0.48, bx - bw * 0.42, by + bh * 0.48, bx - bw * 0.5, by);
  g.closePath();
  g.fillStyle = fittingGradient(g, by - bh * 0.5, by + bh * 0.5);
  g.fill();
  g.strokeStyle = 'rgba(8,12,16,0.7)'; g.lineWidth = Math.max(1, lw * 0.55); g.stroke();
  g.strokeStyle = 'rgba(196,224,236,0.3)'; g.lineWidth = Math.max(1, lw * 0.4);
  g.beginPath(); g.moveTo(bx - bw * 0.42, by - bh * 0.4); g.lineTo(bx + bw * 0.42, by - bh * 0.42); g.stroke();
  g.strokeStyle = 'rgba(8,12,16,0.5)'; g.lineWidth = Math.max(1, lw * 0.45);
  for (const t of [-0.22, 0.12]) { g.beginPath(); g.moveTo(bx + bw * t, by - bh * 0.42); g.lineTo(bx + bw * t, by + bh * 0.42); g.stroke(); }
  for (const t of [-0.30, 0.02, 0.30]) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,190,116,0.5)';
    g.beginPath(); g.arc(bx + bw * t, by, h * 0.045, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(255,236,196,0.9)';
    g.beginPath(); g.arc(bx + bw * t, by, Math.max(1, h * 0.026), 0, Math.PI * 2); g.fill();
  }
  /* 舷の小型区画（フェアリング・楕円で胴になじませる） */
  const sx = w * 0.02, sy = -h * 0.02, sw = w * 0.26, sh = h * 0.24;
  contactShadow(g, sx, sy + sh * 0.4, sw * 0.5, sh * 0.5, 0.4);
  g.beginPath(); g.ellipse(sx, sy, sw * 0.5, sh * 0.5, 0, 0, Math.PI * 2);
  const sgr = g.createLinearGradient(sx, sy - sh * 0.5, sx, sy + sh * 0.5);
  sgr.addColorStop(0, 'rgba(104,120,118,0.94)');
  sgr.addColorStop(0.5, 'rgba(46,60,64,0.94)');
  sgr.addColorStop(1, 'rgba(16,26,32,0.96)');
  g.fillStyle = sgr; g.fill();
  g.strokeStyle = 'rgba(150,196,214,0.3)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = 'rgba(255,196,120,0.5)';
  g.beginPath(); g.arc(sx, sy, h * 0.05, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(255,238,200,0.9)';
  g.beginPath(); g.arc(sx, sy, Math.max(1, h * 0.028), 0, Math.PI * 2); g.fill();
}

/* 船尾：シャウド＋プロペラ＋尾部スタビライザー（前面と非対称＝向きが読める）。 */
function drawFirepowerStern(g, L, w, h, lw) {
  const { sternX } = L;
  /* プロペラ＋シャウドを先に描き、その上へ尾部キャップを重ねる＝リングが船体に挿さって見える */
  const propX = sternX - w * 0.01, propR = h * 0.22;
  g.save();
  g.translate(propX, 0);
  contactShadow(g, propR * 0.5, 0, propR * 1.35, propR * 1.35, 0.4);
  g.fillStyle = 'rgba(10,18,24,0.98)';
  g.beginPath(); g.arc(0, 0, propR, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(120,160,176,0.55)'; g.lineWidth = Math.max(1, lw * 0.8); g.stroke();
  /* ブレード（3 枚・等間隔） */
  g.fillStyle = 'rgba(158,186,200,0.8)';
  for (let i = 0; i < 3; i++) {
    g.save(); g.rotate((Math.PI * 2) * i / 3 + 0.4);
    g.beginPath(); g.moveTo(0, -h * 0.02); g.quadraticCurveTo(propR * 0.6, -h * 0.025, propR * 0.26, -propR * 0.74);
    g.quadraticCurveTo(propR * 0.09, -propR * 0.38, 0, h * 0.02); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = 'rgba(180,204,214,0.9)';
  g.beginPath(); g.arc(0, 0, propR * 0.2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(8,12,16,0.8)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
  g.restore();
  /* 尾部の装甲キャップ（プロペラの根元を覆って接続＝切り離さない） */
  g.fillStyle = fittingGradient(g, -h * 0.30, h * 0.30);
  roundRect(g, sternX - w * 0.03, -h * 0.30, w * 0.09, h * 0.60, h * 0.10); g.fill();
  g.strokeStyle = 'rgba(8,12,16,0.8)'; g.lineWidth = Math.max(1, lw * 0.5); g.stroke();
  /* 上下の尾部スタビライザー（前面の衝角と非対称な三角・キャップの上に載る） */
  tri(g, [sternX + w * 0.05, -h * 0.16], [sternX - w * 0.04, -h * 0.54], [sternX - w * 0.01, -h * 0.10], 'rgba(44,58,66,0.98)', { w: lw * 0.7 });
  tri(g, [sternX + w * 0.05, h * 0.18], [sternX - w * 0.04, h * 0.56], [sternX - w * 0.01, h * 0.12], 'rgba(30,42,50,0.98)', { w: lw * 0.7 });
}

/* ==========================================================================
   機動型：細く尖る。上下のフィンと尾部の追加推進器 2 基。
   ========================================================================== */
function drawMobility(g, w, h) {
  const lw = Math.max(1, h * 0.05);
  tri(g, [w * 0.16, -h * 0.42], [w * 0.40, -h * 1.02], [w * 0.44, -h * 0.40], STEEL, { w: lw });
  tri(g, [w * 0.16, -h * 0.44], [w * 0.34, -h * 0.86], [w * 0.26, -h * 0.44], RIM_HI);
  tri(g, [w * 0.16, h * 0.42], [w * 0.40, h * 1.02], [w * 0.44, h * 0.40], STEEL, { w: lw });
  tri(g, [w * 0.16, h * 0.44], [w * 0.30, h * 0.84], [w * 0.24, h * 0.44], 'rgba(120,170,190,0.45)');
  for (const sy of [-1, 1]) {
    const cx = -w * 0.44, cy = sy * h * 0.30;
    g.fillStyle = STEEL_D;
    roundRect(g, cx - w * 0.05, cy - h * 0.16, w * 0.13, h * 0.32, h * 0.12); g.fill();
    g.strokeStyle = RIM; g.lineWidth = lw; g.stroke();
    g.fillStyle = 'rgba(150,225,255,0.85)';
    g.beginPath(); g.arc(cx - w * 0.045, cy, h * 0.10, 0, Math.PI * 2); g.fill();
  }
}

/* ==========================================================================
   バリア型：頭上の環（発生器）。突起したリングと支え。
   ========================================================================== */
function drawBarrierRig(g, w, h) {
  const lw = Math.max(1, h * 0.055);
  g.fillStyle = STEEL;
  roundRect(g, -w * 0.06, -h * 0.78, w * 0.26, h * 0.42, h * 0.10); g.fill();
  g.strokeStyle = RIM; g.lineWidth = lw; g.stroke();
  const cx = w * 0.03, cy = -h * 0.98;
  g.beginPath(); g.arc(cx, cy, h * 0.40, 0, Math.PI * 2);
  g.strokeStyle = RIM_HI; g.lineWidth = lw * 1.5; g.stroke();
  g.beginPath(); g.arc(cx, cy, h * 0.26, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(150,225,255,0.7)'; g.lineWidth = lw; g.stroke();
  g.strokeStyle = RIM; g.lineWidth = lw;
  g.beginPath(); g.moveTo(cx - h * 0.30, cy + h * 0.26); g.lineTo(-w * 0.04, -h * 0.52); g.stroke();
  g.beginPath(); g.moveTo(cx + h * 0.30, cy + h * 0.26); g.lineTo(w * 0.16, -h * 0.52); g.stroke();
  g.fillStyle = 'rgba(215,245,255,0.85)';
  g.beginPath(); g.arc(cx, cy, h * 0.10, 0, Math.PI * 2); g.fill();
}
