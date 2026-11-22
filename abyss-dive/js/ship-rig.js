/**
 * ABYSS DIVE — 潜水艇の見分け用の「軽量な差分」（描画のみ / 色に依存しない）
 *
 * v1.13.0: 09 の絵柄を崩さず、艇ごとに輪郭が読み分けられる装備を足す。
 *   - 機動型：上下の増加フィン＋尾部の追加推進器（2 基）＝細く尖ったシルエット
 *   - 火力型：船体下の大型兵装ポッド＋上部の太い発射筒＝重く張り出したシルエット
 *   - バリア型：船体上のバリア発生器（突起したリング）＝頭上の環
 *   - 09 万能型：何も足さない（現行のまま）
 *
 * どれも「形」で違う（色だけで区別しない）。ゲーム（game.js の潜航）と
 * 格納庫（base.js）の両方で同じ関数を使う。引数の (w, h) は船体の表示サイズ。
 */

const STEEL = 'rgba(38,50,58,0.96)';
const STEEL_D = 'rgba(18,26,32,0.96)';
const RIM = 'rgba(150,206,226,0.55)';
const RIM_HI = 'rgba(200,232,244,0.75)';

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

/**
 * 船体（中心＝原点、幅 w・高さ h）に艇の差分を重ねる。
 * opts.glow=true のとき縁を強め（潜航の発光下でも読める）。
 */
export function drawShipRig(g, id, w, h, opts) {
  if (id === 'mobility') return drawMobility(g, w, h);
  if (id === 'firepower') return drawFirepower(g, w, h);
  if (id === 'barrier') return drawBarrierRig(g, w, h);
  /* 09 = 差分なし */
}

/* 機動型：細く尖る。上下のフィンと尾部の追加推進器 2 基。 */
function drawMobility(g, w, h) {
  const lw = Math.max(1, h * 0.05);
  /* 背部のフィン（後方へ流れる三角形） */
  tri(g, [w * 0.16, -h * 0.42], [w * 0.40, -h * 1.02], [w * 0.44, -h * 0.40], STEEL, { w: lw });
  tri(g, [w * 0.16, -h * 0.44], [w * 0.34, -h * 0.86], [w * 0.26, -h * 0.44], RIM_HI);
  /* 腹部のフィン（左右対称） */
  tri(g, [w * 0.16, h * 0.42], [w * 0.40, h * 1.02], [w * 0.44, h * 0.40], STEEL, { w: lw });
  tri(g, [w * 0.16, h * 0.44], [w * 0.30, h * 0.84], [w * 0.24, h * 0.44], 'rgba(120,170,190,0.45)');
  /* 尾部の追加推進器 2 基（上下） */
  for (const sy of [-1, 1]) {
    const cx = -w * 0.44, cy = sy * h * 0.30;
    g.fillStyle = STEEL_D;
    roundRect(g, cx - w * 0.05, cy - h * 0.16, w * 0.13, h * 0.32, h * 0.12); g.fill();
    g.strokeStyle = RIM; g.lineWidth = lw; g.stroke();
    g.fillStyle = 'rgba(150,225,255,0.85)';
    g.beginPath(); g.arc(cx - w * 0.045, cy, h * 0.10, 0, Math.PI * 2); g.fill();
  }
}

/* 火力型：重く張り出す。船体下の大型ポッドと上部の太い発射筒。 */
function drawFirepower(g, w, h) {
  const lw = Math.max(1, h * 0.05);
  /* 船体下の大型兵装ポッド */
  const px = -w * 0.18, py = h * 0.34, pw = w * 0.66, ph = h * 0.62;
  g.fillStyle = STEEL;
  roundRect(g, px, py, pw, ph, h * 0.16); g.fill();
  g.strokeStyle = RIM; g.lineWidth = lw; g.stroke();
  /* ポッドの端キャップと仕切り */
  g.fillStyle = STEEL_D;
  roundRect(g, px - w * 0.02, py + ph * 0.16, w * 0.06, ph * 0.68, h * 0.08); g.fill();
  g.strokeStyle = 'rgba(120,160,180,0.5)'; g.lineWidth = lw * 0.9;
  g.beginPath(); g.moveTo(px + pw * 0.34, py + ph * 0.08); g.lineTo(px + pw * 0.34, py + ph * 0.92); g.stroke();
  g.beginPath(); g.moveTo(px + pw * 0.66, py + ph * 0.08); g.lineTo(px + pw * 0.66, py + ph * 0.92); g.stroke();
  /* ポッド前面の発射口 */
  g.fillStyle = 'rgba(255,180,110,0.55)';
  g.beginPath(); g.arc(px + pw - w * 0.02, py + ph * 0.5, h * 0.11, 0, Math.PI * 2); g.fill();
  /* 上部の太い発射筒（2 連） */
  for (let i = 0; i < 2; i++) {
    const ty = -h * (0.30 + i * 0.30);
    g.fillStyle = STEEL_D;
    roundRect(g, -w * 0.16, ty - h * 0.10, w * 0.5, h * 0.22, h * 0.10); g.fill();
    g.strokeStyle = RIM; g.lineWidth = lw; g.stroke();
    g.fillStyle = 'rgba(210,235,245,0.5)';
    g.beginPath(); g.arc(w * 0.34, ty, h * 0.07, 0, Math.PI * 2); g.fill();
  }
}

/* バリア型：頭上の環（発生器）。突起したリングと支え。 */
function drawBarrierRig(g, w, h) {
  const lw = Math.max(1, h * 0.055);
  /* 船体上の発生器ハウジング（台座） */
  g.fillStyle = STEEL;
  roundRect(g, -w * 0.06, -h * 0.78, w * 0.26, h * 0.42, h * 0.10); g.fill();
  g.strokeStyle = RIM; g.lineWidth = lw; g.stroke();
  /* 突起したリング（発生器） */
  const cx = w * 0.03, cy = -h * 0.98;
  g.beginPath(); g.arc(cx, cy, h * 0.40, 0, Math.PI * 2);
  g.strokeStyle = RIM_HI; g.lineWidth = lw * 1.5; g.stroke();
  g.beginPath(); g.arc(cx, cy, h * 0.26, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(150,225,255,0.7)'; g.lineWidth = lw; g.stroke();
  /* 支え（2 本） */
  g.strokeStyle = RIM; g.lineWidth = lw;
  g.beginPath(); g.moveTo(cx - h * 0.30, cy + h * 0.26); g.lineTo(-w * 0.04, -h * 0.52); g.stroke();
  g.beginPath(); g.moveTo(cx + h * 0.30, cy + h * 0.26); g.lineTo(w * 0.16, -h * 0.52); g.stroke();
  /* 中央の発光コア（形の中心。色に頼らない明暗） */
  g.fillStyle = 'rgba(215,245,255,0.85)';
  g.beginPath(); g.arc(cx, cy, h * 0.10, 0, Math.PI * 2); g.fill();
}
