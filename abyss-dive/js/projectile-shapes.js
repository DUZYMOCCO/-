/**
 * ABYSS DIVE — 弾体・軌跡・近接/レーザーの「形」の共有描画（DOM 非依存）
 *
 * 目的:
 *   - 基地 UI（base.js）の武器プレビューを、実戦（game.js の drawTorpedoShot / drawMissileShot）と
 *     **同じパス**で描く。ここに形を集約し、実戦側もここを呼べば見た目と意味が一致する。
 *   - 発射数/方向（count/pattern）に一致する軌跡アイコンと、短いラベル（例 3ウェイ / 3連・並列）。
 *   - 近接 6 種・レーザー・反射の「形」のアイコン。
 *
 * 使い方（プレビュー側）: 原点に translate してから呼ぶ。弾体は原点・+x（右）向き。
 * 実戦側へ差し替える場合（game.js）:
 *   `import { drawTorpedoShape, drawMissileShape } from './projectile-shapes.js?v=1';`
 *   drawTorpedoShot の中身を `drawTorpedoShape(ctx, b.projectile || b.style || 'stock')` に、
 *   drawMissileShot を `drawMissileShape(ctx, b.projectile || b.style || 'stock', b.vscale || 1)` に置き換える
 *   （どちらも事前に ctx.translate 済みであること。game.js は既に弾の位置へ translate している）。
 *
 * ここは数値・形だけ。乱数・保存・当たり判定には関与しない。
 */

const TAU = Math.PI * 2;

/* --------------------------------------------------------------------------
 * 弾体の形（魚雷 / ミサイル）。game.js の実戦描画と同一のパス。
 * projectiles の id は weapon-rules / advanced-weapons の projectile 集合に一致する。
 * ------------------------------------------------------------------------ */
export const TORPEDO_SHAPES = Object.freeze(['stock', 'slender', 'stout', 'sleek']);
export const MISSILE_SHAPES = Object.freeze(['stock', 'finned', 'stout', 'sleek']);
/** 型ごとに表示できる弾の形（UI の選択肢と同じ）。 */
export const SHAPES_BY_TYPE = Object.freeze({
  torpedo: TORPEDO_SHAPES,
  missile: MISSILE_SHAPES,
  reftorp: Object.freeze(['stock', 'stout']),
  laser: Object.freeze(['stock', 'slender']),
  reflaser: Object.freeze(['stock', 'slender']),
});
export const SHAPE_LABELS = Object.freeze({
  stock: '標準', slender: '細身', stout: 'ずんぐり', finned: '尾翼', sleek: '流線',
});
export function shapeLabel(id){ return SHAPE_LABELS[id] || '標準'; }
export function shapesFor(typeId){ return SHAPES_BY_TYPE[typeId] || TORPEDO_SHAPES; }

/** 魚雷の弾体（原点・+x 向き）。game.js drawTorpedoShot と同形。 */
export function drawTorpedoShape(ctx, shapeId){
  const st = shapeId || 'stock';
  if (st === 'slender'){
    ctx.fillStyle = 'rgba(120,200,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-30, 0, 28, 3.4, 0, 0, TAU); ctx.fill();
    const sg = ctx.createLinearGradient(0, -4.2, 0, 4.2);
    sg.addColorStop(0, '#eaf6ff'); sg.addColorStop(0.5, '#8fb6cf'); sg.addColorStop(1, '#3f5a6b');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(26, 0); ctx.lineTo(10, -4.2); ctx.lineTo(-18, -4.2);
    ctx.lineTo(-18, 4.2); ctx.lineTo(10, 4.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(16,26,34,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#b9c9d4';
    for (const sgn of [-1, 1]){
      ctx.beginPath(); ctx.moveTo(-12, sgn * 4.2); ctx.lineTo(-20, sgn * 9); ctx.lineTo(-19, sgn * 4.2); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(12, -3); ctx.lineTo(12, 3); ctx.closePath(); ctx.fill();
    return;
  }
  if (st === 'stout'){
    ctx.fillStyle = 'rgba(255,170,60,0.65)';
    ctx.beginPath(); ctx.ellipse(-22, 0, 22, 7.5, 0, 0, TAU); ctx.fill();
    const bg = ctx.createLinearGradient(0, -8.5, 0, 8.5);
    bg.addColorStop(0, '#ffe6b0'); bg.addColorStop(0.5, '#d08a34'); bg.addColorStop(1, '#5e3a10');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(15, 0); ctx.lineTo(6, -8.5); ctx.lineTo(-11, -8.5);
    ctx.lineTo(-11, 8.5); ctx.lineTo(6, 8.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,17,4,0.72)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath(); ctx.arc(9, 0, 4.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,225,170,0.9)';
    ctx.fillRect(-10, -5, 6, 3); ctx.fillRect(-10, 2, 6, 3);
    return;
  }
  if (st === 'sleek'){
    ctx.fillStyle = 'rgba(150,210,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-31, 0, 13, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9fb7c6'; ctx.strokeStyle = 'rgba(14,26,34,0.7)'; ctx.lineWidth = 1;
    for (const sgn of [-1, 1]){
      ctx.beginPath();
      ctx.moveTo(-14, sgn * 5.6);
      ctx.quadraticCurveTo(-23, sgn * 12.4, -30, sgn * 12.6);
      ctx.quadraticCurveTo(-26, sgn * 6.2, -21, sgn * 5.0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#2b3a44';
    ctx.beginPath(); ctx.arc(-27, 0, 5.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9fd6ff';
    ctx.beginPath(); ctx.arc(-27, 0, 2.6, 0, TAU); ctx.fill();
    const bg = ctx.createLinearGradient(0, -7, 0, 7);
    bg.addColorStop(0, '#eef6fb'); bg.addColorStop(0.45, '#8fb0c6'); bg.addColorStop(1, '#3c5566');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(20, -6.5, 8, -6.8);
    ctx.lineTo(-13, -6.2);
    ctx.quadraticCurveTo(-23, -6, -23, 0);
    ctx.quadraticCurveTo(-23, 6, -13, 6.2);
    ctx.lineTo(8, 6.8);
    ctx.quadraticCurveTo(20, 6.5, 24, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(16,26,34,0.65)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(30,46,56,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(4, -6.7); ctx.lineTo(4, 6.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -6.4); ctx.lineTo(-8, 6.4); ctx.stroke();
    ctx.fillStyle = 'rgba(210,230,240,0.5)';
    ctx.fillRect(4.6, -6.7, 2.6, 13.4);
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(18, -3.2); ctx.lineTo(18, 3.2); ctx.closePath(); ctx.fill();
    return;
  }
  /* stock */
  ctx.fillStyle = 'rgba(255,170,60,0.6)';
  ctx.beginPath(); ctx.ellipse(-26, 0, 26, 4.5, 0, 0, TAU); ctx.fill();
  const bg = ctx.createLinearGradient(0, -6, 0, 6);
  bg.addColorStop(0, '#ffe6b0'); bg.addColorStop(0.5, '#d08a34'); bg.addColorStop(1, '#6b4212');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.lineTo(8, -6); ctx.lineTo(-14, -6);
  ctx.lineTo(-14, 6); ctx.lineTo(8, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fffdf0';
  ctx.beginPath(); ctx.arc(17, 0, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,225,170,0.9)';
  ctx.fillRect(-13, -3.4, 7, 2.2); ctx.fillRect(-13, 1.2, 7, 2.2);
}

/** ミサイルの弾体（原点・+x 向き、scale=S で大型化）。game.js drawMissileShot と同形。 */
export function drawMissileShape(ctx, shapeId, scale = 1){
  const S = scale || 1;
  const st = shapeId || 'stock';
  if (st === 'sleek'){
    const noseX = 20 * S, tailX = -24 * S, br = 7.4 * S;
    ctx.fillStyle = 'rgba(255,180,90,0.4)';
    ctx.beginPath(); ctx.ellipse(tailX - 15 * S, 0, 20 * S, 5 * S, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,238,200,0.5)';
    ctx.beginPath(); ctx.ellipse(tailX - 7 * S, 0, 11 * S, 3.2 * S, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8fa9bd'; ctx.strokeStyle = 'rgba(30,22,10,0.5)'; ctx.lineWidth = Math.max(1, S);
    for (const sgn of [-1, 1]){
      ctx.beginPath();
      ctx.moveTo(tailX + 11 * S, sgn * br);
      ctx.quadraticCurveTo(tailX - 2 * S, sgn * (br + 11 * S), tailX - 8 * S, sgn * (br + 11 * S));
      ctx.quadraticCurveTo(tailX - 4 * S, sgn * (br + 2 * S), tailX + 6 * S, sgn * br * 0.7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#2b3a44';
    ctx.beginPath(); ctx.arc(tailX + 2 * S, 0, 4.6 * S, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9fd6ff';
    ctx.beginPath(); ctx.arc(tailX + 2 * S, 0, 2.3 * S, 0, TAU); ctx.fill();
    const mg = ctx.createLinearGradient(0, -br, 0, br);
    mg.addColorStop(0, '#eef6fb'); mg.addColorStop(0.45, '#8fb0c6'); mg.addColorStop(1, '#3c5566');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.moveTo(noseX, 0);
    ctx.quadraticCurveTo(noseX - 5 * S, -br * 0.9, 8 * S, -br);
    ctx.lineTo(tailX + 8 * S, -br * 0.92);
    ctx.quadraticCurveTo(tailX, -br * 0.85, tailX, 0);
    ctx.quadraticCurveTo(tailX, br * 0.85, tailX + 8 * S, br * 0.92);
    ctx.lineTo(8 * S, br);
    ctx.quadraticCurveTo(noseX - 5 * S, br * 0.9, noseX, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,20,0.65)'; ctx.lineWidth = Math.max(1, 1.1 * S); ctx.stroke();
    ctx.strokeStyle = 'rgba(32,48,58,0.55)'; ctx.lineWidth = Math.max(1, 1.2 * S);
    ctx.beginPath(); ctx.moveTo(4 * S, -br * 0.95); ctx.lineTo(4 * S, br * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8 * S, -br * 0.9); ctx.lineTo(-8 * S, br * 0.9); ctx.stroke();
    ctx.fillStyle = 'rgba(210,230,240,0.5)';
    ctx.fillRect(4.4 * S, -br * 0.95, 2.6 * S, br * 1.9);
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath(); ctx.moveTo(noseX, 0); ctx.lineTo(11 * S, -br * 0.75); ctx.lineTo(11 * S, br * 0.75); ctx.closePath(); ctx.fill();
    return;
  }
  const br = (st === 'stout' ? 8.6 : 7) * S;
  const nose = (st === 'stout' ? 14 : 16) * S;
  const tail = (st === 'stout' ? -22 : -26) * S;
  ctx.fillStyle = 'rgba(255,170,60,0.4)';
  ctx.beginPath(); ctx.ellipse(tail - 16 * S, 0, 22 * S, 5.5 * S, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,238,200,0.5)';
  ctx.beginPath(); ctx.ellipse(tail - 8 * S, 0, 12 * S, 3.5 * S, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b9842f';
  ctx.strokeStyle = 'rgba(38,22,6,0.55)'; ctx.lineWidth = Math.max(1, 1.2 * S);
  const fw = (st === 'finned' ? 13 : 8) * S;
  for (const sgn of [-1, 1]){
    ctx.beginPath();
    ctx.moveTo(tail + 8 * S, sgn * br);
    ctx.lineTo(tail - 8 * S, sgn * (br + fw));
    ctx.lineTo(tail + 8 * S, sgn * (br + 1));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const mg = ctx.createLinearGradient(0, -br, 0, br);
  mg.addColorStop(0, '#ffe6b0'); mg.addColorStop(0.5, '#d08a34'); mg.addColorStop(1, '#6b4212');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.moveTo(nose, 0);
  ctx.lineTo(8 * S, -br); ctx.lineTo(tail + 8 * S, -br);
  ctx.lineTo(tail + 8 * S, br); ctx.lineTo(8 * S, br);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(30,17,4,0.7)'; ctx.lineWidth = Math.max(1, 1.1 * S); ctx.stroke();
  ctx.fillStyle = '#fffdf0';
  ctx.beginPath(); ctx.moveTo(nose, 0); ctx.lineTo(8 * S, -br * 0.72); ctx.lineTo(8 * S, br * 0.72); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,225,170,0.9)';
  ctx.fillRect(tail + 12 * S, -br * 0.5, 6 * S, br);
}

/** 型に応じて弾体を描く（ミサイルは scale で大型化）。 */
export function drawProjectileShape(ctx, typeId, shapeId, scale = 1){
  if (typeId === 'missile') drawMissileShape(ctx, shapeId, scale);
  else drawTorpedoShape(ctx, shapeId);
}

/* --------------------------------------------------------------------------
 * 発射数 / 方向（count / pattern）に一致する軌跡アイコンとラベル。
 *   ・単発        … まっすぐ 1 本
 *   ・並列 n連    … 平行に n 本（発射位置を横へ振る）
 *   ・扇 n ウェイ … 照準軸から上下対称に n 本の角度差
 *   ・4 以上は扇状のみ（並列は最大 3）＝実戦の salvoSpread と同じ規則。
 *   ・ミサイルは別扱い（最大 2）。typeId でラベルを分ける。
 * ------------------------------------------------------------------------ */
export function trajectoryLabel(typeId, count, pattern){
  const n = Math.max(1, Math.floor(Number(count) || 1));
  if (n < 2) return '単発';
  const p = (n >= 4 || pattern === 'fan') ? 'fan' : 'parallel';
  return (p === 'fan') ? (n + 'ウェイ') : (n + '連・並列');
}
/** 実戦と同じ規則で pattern を正規化する（4 以上・扇は fan、それ以外 parallel、1 は single）。 */
export function normalizedPattern(count, pattern){
  const n = Math.max(1, Math.floor(Number(count) || 1));
  if (n < 2) return 'single';
  return (n >= 4 || pattern === 'fan') ? 'fan' : 'parallel';
}

/* 実戦の salvoSpread（weapon-rules）と同じ幾何。アイコン描画用に複製（値は一致させる）。 */
const PARALLEL_SPACING = 26;
const FAN_HALF_ANGLE = 0.09;
export function salvoPaths(count, pattern){
  const n = Math.max(1, Math.floor(Number(count) || 1));
  const p = normalizedPattern(n, pattern);
  const out = [];
  for (let i = 0; i < n; i++){
    const t = i - (n - 1) / 2;
    if (n < 2 || p === 'single') out.push({ dAng:0, lat:0 });
    else if (p === 'fan') out.push({ dAng:Math.max(-0.52, Math.min(0.52, t * FAN_HALF_ANGLE)), lat:0 });
    else out.push({ dAng:0, lat:t * PARALLEL_SPACING });
  }
  return out;
}

/**
 * 軌跡アイコンを描く（原点まわりではなく指定矩形の左寄り起点から右へ）。
 * opts: { x, y, w, h, count, pattern, color, glow }
 *   左端の小さな口（発射点）から、方向ごとに線を伸ばす。並列は平行、扇は扇状。
 */
export function drawTrajectoryIcon(ctx, opts){
  const { x, y, w, h } = opts;
  const count = opts.count || 1;
  const pattern = opts.pattern || 'single';
  const color = opts.color || '#bfe9ff';
  const paths = salvoPaths(count, pattern);
  const ox = x + 6, oy = y + h / 2;
  const len = w - 14;
  const off = Math.min(h * 0.28, 14);
  ctx.save();
  ctx.lineCap = 'round';
  /* 発射点 */
  ctx.fillStyle = 'rgba(200,235,255,0.7)';
  ctx.beginPath(); ctx.arc(ox, oy, 2.6, 0, TAU); ctx.fill();
  for (const p of paths){
    const lat = Math.max(-off, Math.min(off, p.lat * (off / (PARALLEL_SPACING * 1.5) || 1)));
    const ex = ox + Math.cos(p.dAng) * len;
    const ey = oy + lat * 0.2 + Math.sin(p.dAng) * len;
    /* 芯（明るい）＋にじみ（太く薄い） */
    if (opts.glow !== false){
      ctx.strokeStyle = color; ctx.globalAlpha = 0.22;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ox, oy + lat * 0.2); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ox, oy + lat * 0.2); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.restore();
}

/* --------------------------------------------------------------------------
 * レーザー（可視経路＝実当たり）と反射の折れ線。
 * ------------------------------------------------------------------------ */
/** 直線レーザーの形（太い色＋白い芯。game.js の G.beams 描画と同形）。 */
export function drawBeamIcon(ctx, opts){
  const { x, y, w, h } = opts;
  const color = opts.color || '#8fe0ff';
  const oy = y + h / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color; ctx.globalAlpha = 0.55; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x + 4, oy); ctx.lineTo(x + w - 4, oy); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.globalAlpha = 0.9; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x + 4, oy); ctx.lineTo(x + w - 4, oy); ctx.stroke();
  ctx.restore();
}

/** 反射 1 回の折れ線（右へ進み、壁で上下いずれかへ跳ねる）。 */
export function drawReflectIcon(ctx, opts){
  const { x, y, w, h } = opts;
  const color = opts.color || '#b8f0d0';
  const midY = y + h / 2;
  const bx = x + w * 0.56;
  const dy = (opts.down === false ? -1 : 1);
  const ey = midY + dy * (h * 0.32);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 4, midY); ctx.lineTo(bx, midY); ctx.lineTo(x + w - 4, ey);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.globalAlpha = 0.9; ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x + 4, midY); ctx.lineTo(bx, midY); ctx.lineTo(x + w - 4, ey);
  ctx.stroke();
  /* 反射点 */
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(220,255,235,0.95)';
  ctx.beginPath(); ctx.arc(bx, midY, 2.6, 0, TAU); ctx.fill();
  /* 壁 */
  ctx.strokeStyle = 'rgba(150,188,198,0.5)'; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(bx, midY - h * 0.42); ctx.lineTo(bx, midY + h * 0.42);
  ctx.stroke();
  ctx.restore();
}

/* --------------------------------------------------------------------------
 * 近接 6 種の「形」（自動近接。基地で 1 種を選ぶ）。
 * 形で見分ける（色だけに頼らない）。id は melee-rules の MELEE_TYPES に一致。
 * ------------------------------------------------------------------------ */
export const MELEE_IDS = Object.freeze(['punch', 'chainsaw', 'beamsaber', 'axe', 'phaseblade', 'hammer']);
export const MELEE_LABELS = Object.freeze({
  punch: 'パンチ', chainsaw: 'チェーンソー', beamsaber: 'ビームソード',
  axe: '斧', phaseblade: '実体剣', hammer: 'ハンマー',
});
export function meleeLabel(id){ return MELEE_LABELS[id] || id; }

/** 近接武器の形を描く（原点中心・+x 向き・size は全長の目安）。 */
export function drawMeleeShape(ctx, id, size = 44){
  const s = size / 44;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  switch (id){
    case 'punch': {
      ctx.fillStyle = 'rgba(140,170,190,0.6)';
      ctx.beginPath(); ctx.arc(13, 0, 12, -1.1, 1.1); ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(200,240,255,0.55)'; ctx.stroke();
      ctx.fillStyle = '#9fb0bd'; ctx.strokeStyle = 'rgba(20,30,38,0.7)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(6, -10);
      ctx.quadraticCurveTo(12, 0, 6, 10); ctx.lineTo(-12, 9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (const yy of [-5, 0, 5]){ ctx.beginPath(); ctx.arc(4, yy, 1.8, 0, TAU); ctx.fill(); }
      break;
    }
    case 'chainsaw': {
      ctx.fillStyle = '#3a4650'; ctx.strokeStyle = 'rgba(16,24,30,0.8)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(14, -6); ctx.lineTo(16, 0); ctx.lineTo(14, 6); ctx.lineTo(-16, 6); ctx.closePath();
      ctx.fill(); ctx.stroke();
      /* 歯（三角の連なり） */
      ctx.fillStyle = '#c8d6e0';
      for (let i = -14; i <= 12; i += 6){ ctx.beginPath(); ctx.moveTo(i, -6); ctx.lineTo(i + 3, -11); ctx.lineTo(i + 6, -6); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(120,180,200,0.6)';
      ctx.fillRect(-6, -3, 12, 6);
      break;
    }
    case 'beamsaber': {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(-16, 0, 18, 0);
      g.addColorStop(0, 'rgba(120,220,255,0.2)'); g.addColorStop(1, 'rgba(200,245,255,0.95)');
      ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#586a76';
      ctx.fillRect(-20, -4, 8, 8);
      break;
    }
    case 'axe': {
      ctx.strokeStyle = '#7a6a4c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.fillStyle = '#b7c2cc'; ctx.strokeStyle = 'rgba(18,26,32,0.75)'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(2, -12); ctx.quadraticCurveTo(18, -14, 20, 0);
      ctx.quadraticCurveTo(18, 14, 2, 12);
      ctx.quadraticCurveTo(8, 0, 2, -12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(16, -7); ctx.lineTo(16, -3); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill();
      break;
    }
    case 'phaseblade': {
      /* 実体剣：細長い鋼の刃＋つば＋柄 */
      ctx.fillStyle = '#cfd8de'; ctx.strokeStyle = 'rgba(20,28,34,0.75)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-14, -3.2); ctx.lineTo(14, -3.2); ctx.lineTo(18, 0); ctx.lineTo(14, 3.2); ctx.lineTo(-14, 3.2); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-12, -2.2, 24, 1.2);
      ctx.fillStyle = '#8a9aa6';
      ctx.fillRect(-16, -7, 4, 14);          // つば
      ctx.fillStyle = '#5a4a34';
      ctx.fillRect(-24, -2.6, 8, 5.2);       // 柄
      break;
    }
    case 'hammer': {
      ctx.strokeStyle = '#7a6a4c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(2, 0); ctx.stroke();
      ctx.fillStyle = '#9aa6b0'; ctx.strokeStyle = 'rgba(18,26,32,0.78)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); roundRectPath(ctx, 0, -12, 20, 24, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(2, -10, 3, 20);
      ctx.fillStyle = 'rgba(120,150,170,0.6)';
      ctx.fillRect(12, -12, 6, 24);
      break;
    }
    default: {
      ctx.fillStyle = '#9fb0bd';
      ctx.beginPath(); ctx.arc(0, 0, size * 0.32, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

/** 型（撃つ枠）に応じたアイコン種別。UI が「何を描くか」を決めるのに使う。 */
export function weaponShapeKind(typeId){
  if (typeId === 'laser' || typeId === 'reflaser') return 'beam';
  if (typeId === 'reftorp') return 'reflect';
  if (typeId === 'missile') return 'missile';
  return 'torpedo';
}

function roundRectPath(g, x, y, w, h, r){
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
