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

/* --- 高精細ミサイルスプライト（ブラウザ環境でのみ遅延ロード、Nodeテスト非依存） --- */
const MISSILE_SPRITES = {};
const MISSILE_DIMS = {
  stock:  { w: 54, h: 17.5, tailX: -27, flame: 'amber' },
  finned: { w: 58, h: 17.2, tailX: -29, flame: 'cyan'  },
  stout:  { w: 52, h: 19.8, tailX: -26, flame: 'amber' },
  sleek:  { w: 60, h: 18.5, tailX: -30, flame: 'cyan'  },
};
function getMissileSprite(id){
  if (typeof Image === 'undefined') return null;
  const key = MISSILE_DIMS[id] ? id : 'stock';
  if (!MISSILE_SPRITES[key]){
    const img = new Image();
    img.src = new URL(`../assets/missile_${key}.webp`, import.meta.url).href;
    MISSILE_SPRITES[key] = img;
  }
  const img = MISSILE_SPRITES[key];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

/** ミサイルの弾体（原点・+x 向き、scale=S で大型化）。高精細スプライト＋動的スラスター推進炎。 */
export function drawMissileShape(ctx, shapeId, scale = 1, opts){
  const S = scale || 1;
  const st = MISSILE_DIMS[shapeId] ? shapeId : 'stock';
  const dim = MISSILE_DIMS[st];
  const noFlame = !!(opts && opts.noFlame);

  /* 1) 動的スラスター推進炎（加算光。burner: 0=未点火種火 .. 1=アフターバーナー全開で長く伸びる） */
  if (!noFlame){
    const now = (typeof performance !== 'undefined' ? performance.now() : 0) * 0.032;
    const flick = 0.86 + 0.14 * Math.sin(now * 2.3);
    const burner = (opts && Number.isFinite(opts.burner)) ? Math.max(0, Math.min(1.5, opts.burner)) : 0.55;
    const tx = dim.tailX * S;
    const isCyan = dim.flame === 'cyan';
    const lenMul = (0.28 + burner * 2.35) * flick;
    const radMul = 0.55 + burner * 0.72;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 外炎プルーム（アフターバーナー全開時は長く鋭く伸びる）
    const plumeL = 24 * S * lenMul;
    const og = ctx.createRadialGradient(tx - 4 * S, 0, 1, tx - plumeL * 0.55, 0, plumeL * 0.95);
    if (isCyan){
      og.addColorStop(0, 'rgba(210,252,255,0.95)');
      og.addColorStop(0.35, 'rgba(70,210,255,0.62)');
      og.addColorStop(1, 'rgba(20,110,230,0)');
    } else {
      og.addColorStop(0, 'rgba(255,244,195,0.95)');
      og.addColorStop(0.35, 'rgba(255,148,42,0.65)');
      og.addColorStop(1, 'rgba(220,56,12,0)');
    }
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.ellipse(tx - plumeL * 0.52, 0, plumeL * 0.82, 5.8 * S * radMul, 0, 0, TAU);
    ctx.fill();

    // 鋭いアフターバーナー・コアジェット（長い円錐炎）
    ctx.fillStyle = isCyan ? 'rgba(235,254,255,0.95)' : 'rgba(255,252,230,0.95)';
    ctx.beginPath();
    ctx.moveTo(tx + 1 * S, -2.8 * S * radMul);
    ctx.lineTo(tx - plumeL * 1.15, 0);
    ctx.lineTo(tx + 1 * S, 2.8 * S * radMul);
    ctx.closePath();
    ctx.fill();

    // 全開時のショックダイアモンド（超音速ジェットの節光）
    if (burner > 0.45){
      const da = Math.min(1, (burner - 0.45) / 0.55) * 0.85;
      ctx.fillStyle = isCyan ? `rgba(180,250,255,${da.toFixed(2)})` : `rgba(255,230,145,${da.toFixed(2)})`;
      for (let k = 1; k <= 2; k++){
        const dx = tx - (8 + k * 14 * burner) * S * flick;
        ctx.beginPath();
        ctx.ellipse(dx, 0, 4.2 * S, 2.0 * S * radMul, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* 2) 高精細ミサイルスプライト（ロード完了時は最優先で使用） */
  const img = getMissileSprite(st);
  if (img){
    const w = dim.w * S;
    const h = dim.h * S;
    ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h);
    return;
  }

  /* 3) スプライト読込前／テスト環境の重厚フォールバック（鉛筆造形を廃止しオジーブ弾頭＋装甲胴体） */
  const w = dim.w * S, h = dim.h * S, br = h * 0.34;
  const nose = w * 0.5, tail = -w * 0.44;
  ctx.save();
  // 後部ノズル
  ctx.fillStyle = '#303942';
  ctx.beginPath();
  ctx.moveTo(tail, -br * 0.55); ctx.lineTo(tail - 5 * S, -br * 0.78);
  ctx.lineTo(tail - 5 * S, br * 0.78); ctx.lineTo(tail, br * 0.55);
  ctx.closePath(); ctx.fill();
  // 安定翼
  ctx.fillStyle = st === 'finned' || st === 'sleek' ? '#586d80' : '#7a6952';
  for (const sgn of [-1, 1]){
    ctx.beginPath();
    ctx.moveTo(tail + 12 * S, sgn * br * 0.85);
    ctx.lineTo(tail - 2 * S, sgn * h * 0.5);
    ctx.lineTo(tail + 4 * S, sgn * h * 0.5);
    ctx.lineTo(tail + 16 * S, sgn * br * 0.85);
    ctx.closePath(); ctx.fill();
  }
  // 装甲胴体＋オジーブ曲線ノーズ
  const mg = ctx.createLinearGradient(0, -br, 0, br);
  if (st === 'finned' || st === 'sleek'){
    mg.addColorStop(0, '#c6d8e6'); mg.addColorStop(0.45, '#596e80'); mg.addColorStop(1, '#222d38');
  } else {
    mg.addColorStop(0, '#d8c59e'); mg.addColorStop(0.45, '#7a7568'); mg.addColorStop(1, '#2c2924');
  }
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.moveTo(nose, 0);
  ctx.quadraticCurveTo(nose - 7 * S, -br, nose - 15 * S, -br);
  ctx.lineTo(tail + 3 * S, -br * 0.88);
  ctx.lineTo(tail, -br * 0.6);
  ctx.lineTo(tail, br * 0.6);
  ctx.lineTo(tail + 3 * S, br * 0.88);
  ctx.lineTo(nose - 15 * S, br);
  ctx.quadraticCurveTo(nose - 7 * S, br, nose, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(12,18,24,0.78)'; ctx.lineWidth = Math.max(1, S); ctx.stroke();
  // 識別センサー帯
  ctx.fillStyle = (st === 'finned' || st === 'sleek') ? '#5be8ff' : '#e8762c';
  ctx.fillRect(nose - 14 * S, -br * 0.92, 3.2 * S, br * 1.84);
  ctx.restore();
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
