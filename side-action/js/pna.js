// v0.9：とびらの そうこ の みため（グレーの ひらたい えのぐ・ふとい くろせん・みどりの ち）
// ドア・シャッター・くろスーツ・きえない ちの あと
import { H, GROUND } from './rules.js?v=10';
import { drawGun } from './guns.js?v=10';

const OUT = '#141416';
const TAU = Math.PI * 2;
export const PNA = {
  wall: '#8d8f94', wall2: '#83858a', wallHi: '#9a9ca1', ceil: '#5b5d62', floor: '#5f6166', floor2: '#55575c', line: '#141416',
  box: '#7c7e83', box2: '#6c6e73', boxHi: '#9fa1a6', dark: '#1a1a1d', door: '#9fa1a5', door2: '#7d7f84', shutter: '#b9bbbf', shutter2: '#8f9196',
};
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function box(ctx, x, y, w, h, c = PNA.box) { // くろい ふちの はこ
  ctx.fillStyle = OUT; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x, y + h - 4, w, 4);
}

// ---- かざり（タイル ごとに きまった ものを おく）----
const TILE = 340;
function nearDoor(g, x, m) { const H2 = g.horde; if (!H2) return false; for (const d of H2.doors) if (Math.abs(d.x - x) < m + d.w / 2) return true; for (const R of H2.rooms) if (Math.abs(R.gateL.x - x) < m || (R.gateR && Math.abs(R.gateR.x - x) < m)) return true; return false; }
function decoTile(ctx, g, i) {
  const x0 = i * TILE, h1 = hash(i), h2 = hash(i + 91), h3 = hash(i + 177);
  // かべの つなぎめ と はしら
  ctx.fillStyle = PNA.wall2; ctx.fillRect(x0 + 2, 26, 2, GROUND - 26);
  ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(x0 + 4, 26, 10, GROUND - 26);
  // たかい ところの まど（よこ じま の ルーバー：さんこう しゃしんの シャッター）
  if (h1 < 0.55) {
    const wx = x0 + 60 + h2 * 160, wy = 52 + h3 * 30, ww = 92 + h1 * 40, wh = 62;
    ctx.fillStyle = OUT; ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    ctx.fillStyle = PNA.shutter; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = PNA.shutter2; for (let y = wy + 6; y < wy + wh; y += 9) ctx.fillRect(wx, y, ww, 2.5);
  }
  const cx = x0 + 40 + h3 * 220;
  if (nearDoor(g, cx + 60, 110)) return;
  if (h2 < 0.42) { // かさなった はこ（さんこう しゃしん）
    const bw = 150 + h1 * 60;
    box(ctx, cx, GROUND - 36, bw, 36); box(ctx, cx + 18, GROUND - 70, bw - 40, 32, PNA.box2); box(ctx, cx + 46, GROUND - 102, bw - 90, 30);
  } else if (h2 < 0.7) { // かいだん（てすり つき）
    const n = 7, sw = 22, sh = 15;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(cx - 3, GROUND); for (let k = 0; k < n; k++) { ctx.lineTo(cx - 3 + k * sw, GROUND - (k + 1) * sh - 3); ctx.lineTo(cx + (k + 1) * sw, GROUND - (k + 1) * sh - 3); } ctx.lineTo(cx + n * sw + 3, GROUND); ctx.fill();
    ctx.fillStyle = PNA.box2; ctx.beginPath(); ctx.moveTo(cx, GROUND); for (let k = 0; k < n; k++) { ctx.lineTo(cx + k * sw, GROUND - (k + 1) * sh); ctx.lineTo(cx + (k + 1) * sw, GROUND - (k + 1) * sh); } ctx.lineTo(cx + n * sw, GROUND); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 8, GROUND - sh - 30); ctx.lineTo(cx + n * sw, GROUND - n * sh - 30);
    for (let k = 1; k < n; k += 2) { ctx.moveTo(cx + k * sw + 10, GROUND - (k + 1) * sh); ctx.lineTo(cx + k * sw + 10, GROUND - (k + 1) * sh - 30); } ctx.stroke();
    box(ctx, cx + n * sw, GROUND - n * sh - 4, 70, 8, PNA.box2);
  } else if (h2 < 0.86) { // ドラムかん と あしば の はこ
    for (let k = 0; k < 2; k++) { const bx = cx + k * 34; ctx.fillStyle = OUT; rr(ctx, bx - 2, GROUND - 52, 32, 52, 4); ctx.fill(); ctx.fillStyle = PNA.box2; rr(ctx, bx, GROUND - 50, 28, 50, 3); ctx.fill(); ctx.fillStyle = OUT; ctx.fillRect(bx, GROUND - 38, 28, 2); ctx.fillRect(bx, GROUND - 16, 28, 2); }
    box(ctx, cx + 80, GROUND - 44, 60, 44);
  }
}

// ---- ドア・シャッター ----
function drawDoor(ctx, d, t) {
  const x = d.x - d.w / 2, y = GROUND - d.h, w = d.w, h = d.h, o = d.open;
  const shake = d.st === 'bang' && !d.kicked ? Math.sin(t * 90) * 2.2 : 0;
  // わく
  ctx.fillStyle = OUT; ctx.fillRect(x - 7, y - 7, w + 14, h + 7);
  ctx.fillStyle = PNA.door2; ctx.fillRect(x - 4, y - 4, w + 8, h + 4);
  // なかは まっくら
  ctx.fillStyle = PNA.dark; ctx.fillRect(x, y, w, h);
  if (d.kind === 'shutter') {
    const sh = h * (1 - o);
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = PNA.shutter; ctx.fillRect(x, y, w, sh);
    ctx.fillStyle = PNA.shutter2; for (let yy = y + sh - 4; yy > y; yy -= 9) ctx.fillRect(x, yy, w, 2.5);
    ctx.fillStyle = OUT; ctx.fillRect(x, y + sh - 3, w, 3);
    ctx.restore();
    ctx.fillStyle = OUT; ctx.fillRect(x - 8, y - 14, w + 16, 10); // まきあげ ボックス
  } else {
    // ひらき ど（よこから みた はばが へる）
    const ow = w * (1 - o * 0.92);
    const steel = d.kind === 'steel';
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, ow + 2, h + 1);
    ctx.fillStyle = steel ? '#a4a7ab' : PNA.door; ctx.fillRect(x, y, ow, h);
    if (ow > 10) {
      ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(x + ow * 0.12, y + 10, ow * 0.76, h * 0.36); ctx.fillRect(x + ow * 0.12, y + h * 0.54, ow * 0.76, h * 0.36);
      ctx.fillStyle = OUT; ctx.fillRect(x + ow - 10, y + h * 0.52, 6, 3);
      if (steel) { ctx.fillStyle = OUT; for (const yy of [y + 14, y + h - 22]) ctx.fillRect(x + 3, yy, ow - 6, 5); ctx.fillStyle = '#e8c23a'; ctx.fillRect(x + 4, y + h * 0.44, ow - 8, 4); }
    }
    ctx.restore();
  }
  // ためしに ひかる「！」（もうすぐ ひらく）
  if (d.st === 'bang' && Math.sin(t * 24) > -0.2) {
    ctx.font = '900 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.strokeText('！', d.x, y - 18); ctx.fillStyle = '#fff'; ctx.fillText('！', d.x, y - 18);
  }
}
// へやの しきり（ゲート）：たかい かべ＋ シャッター
function drawGate(ctx, G, t) {
  const x = G.x - 14, top = 26, h = GROUND - top;
  ctx.fillStyle = OUT; ctx.fillRect(x - 4, top, 36, h);
  ctx.fillStyle = PNA.ceil; ctx.fillRect(x, top, 28, 24);
  const sh = (h - 24) * (1 - Math.max(0, Math.min(1, G.open)));
  if (sh > 1) {
    ctx.fillStyle = PNA.shutter2; ctx.fillRect(x, top + 24, 28, sh);
    ctx.fillStyle = OUT; for (let yy = top + 24 + sh - 3; yy > top + 24; yy -= 10) ctx.fillRect(x, yy, 28, 2);
    ctx.fillStyle = '#e8c23a'; ctx.fillRect(x, top + 24 + sh - 9, 28, 5);
    ctx.fillStyle = OUT; ctx.fillRect(x, top + 24 + sh - 4, 28, 4);
  }
}

// はいけい ぜんぶ（スクリーン ざひょう で よばれる）
export function drawPnaBg(ctx, g, cam, vw) {
  const t = g.time;
  ctx.fillStyle = PNA.wall; ctx.fillRect(0, 0, vw, GROUND);
  ctx.save(); ctx.translate(-cam, 0);
  // てんじょう の はり
  ctx.fillStyle = PNA.ceil; ctx.fillRect(cam - 2, 0, vw + 4, 26); ctx.fillStyle = OUT; ctx.fillRect(cam - 2, 24, vw + 4, 4);
  for (let i = Math.floor((cam - 40) / 120); i * 120 < cam + vw + 40; i++) { ctx.fillStyle = OUT; ctx.fillRect(i * 120, 0, 4, 26); }
  for (let i = Math.floor((cam - TILE) / TILE); i * TILE < cam + vw + 20; i++) decoTile(ctx, g, i);
  const HZ = g.horde;
  if (HZ) {
    for (const d of HZ.doors) if (d.x > cam - 80 && d.x < cam + vw + 80) drawDoor(ctx, d, t);
    for (const R of HZ.rooms) for (const G of [R.gateL, R.gateR]) if (G && G.x > cam - 40 && G.x < cam + vw + 40) drawGate(ctx, G, t);
  }
  // ゆか
  ctx.fillStyle = PNA.floor; ctx.fillRect(cam - 2, GROUND, vw + 4, H - GROUND);
  ctx.fillStyle = PNA.floor2; for (let i = Math.floor(cam / 90); i * 90 < cam + vw; i++) ctx.fillRect(i * 90, GROUND + 18, 46, 3);
  ctx.fillStyle = OUT; ctx.fillRect(cam - 2, GROUND - 2, vw + 4, 5);
  ctx.restore();
}
// てまえ：てんじょう から さがる くさり と ライト（はやく うごく）
export function drawPnaFore(ctx, g, cam, vw) {
  const off = cam * 1.25;
  ctx.fillStyle = OUT;
  for (let i = Math.floor((off - 60) / 520); i * 520 < off + vw + 60; i++) {
    const x = i * 520 + 140 - off, L = 30 + hash(i) * 40;
    ctx.fillRect(x - 1, 0, 3, L); ctx.beginPath(); ctx.moveTo(x - 16, L + 10); ctx.lineTo(x + 16, L + 10); ctx.lineTo(x + 8, L); ctx.lineTo(x - 8, L); ctx.fill();
  }
}
export function drawPnaPlatforms(ctx, g, cam, vw) {
  for (const p of g.platforms) {
    if (p.x - cam > vw + 20 || p.x + p.w - cam < -20) continue;
    box(ctx, p.x, p.y, p.w, 10, PNA.box2);
    ctx.fillStyle = OUT;
    for (const bx of [p.x + 10, p.x + p.w - 16]) ctx.fillRect(bx, p.y + 10, 6, GROUND - p.y - 10);
    ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(p.x + 13, p.y + 10); ctx.lineTo(p.x + p.w - 13, GROUND - 6); ctx.moveTo(p.x + p.w - 13, p.y + 10); ctx.lineTo(p.x + 13, GROUND - 6); ctx.stroke();
  }
}
export function drawPnaCrate(ctx, c) {
  const x = c.x - 20 + (c.hit > 0 ? (Math.random() - 0.5) * 4 : 0), y = c.y - 40;
  box(ctx, x, y, 40, 40, c.hit > 0 ? PNA.boxHi : PNA.box);
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.strokeRect(x + 5, y + 5, 30, 30); ctx.beginPath(); ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + 35, y + 35); ctx.stroke();
}

// ---- きえない みどりの ち（とびちり・したたり）----
export function drawPnaSplat(ctx, s) {
  const r = Math.min(26, s.r * 0.62), sd = s.seed;
  ctx.fillStyle = s.color; ctx.globalAlpha = 0.95;
  if (s.wall) {
    const grow = Math.min(1, s.age * 6 + 0.35), drip = Math.min(1, s.age * 0.35 + 0.05);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 0.75 * grow, r * 0.95 * grow, sd * 3, 0, TAU); ctx.fill();
    // とげとげ（とびちり）
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = sd * 9 + k * 0.9, L = r * (0.9 + hash(sd * 100 + k) * 1.2) * grow;
      ctx.moveTo(s.x + Math.cos(a + 0.18) * r * 0.4, s.y + Math.sin(a + 0.18) * r * 0.4); ctx.lineTo(s.x + Math.cos(a) * L, s.y + Math.sin(a) * L); ctx.lineTo(s.x + Math.cos(a - 0.18) * r * 0.4, s.y + Math.sin(a - 0.18) * r * 0.4);
    }
    ctx.fill();
    for (let k = 0; k < 5; k++) { const a = sd * 5 + k * 1.3, L = r * (1.4 + hash(sd * 50 + k) * 0.9) * grow; ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * L, s.y + Math.sin(a) * L, 1.4 + hash(k + sd) * 2, 0, TAU); ctx.fill(); }
    // したたり（ゆかに むかって のびる）
    const room = Math.max(0, GROUND - 4 - s.y);
    for (let k = 0; k < 3; k++) { const dx = (hash(sd * 30 + k) - 0.5) * r * 1.2, L = Math.min(room, r * (1.2 + hash(sd * 70 + k) * 3) * drip); ctx.fillRect(s.x + dx - 1.3, s.y, 2.6, L); ctx.beginPath(); ctx.arc(s.x + dx, s.y + L, 2, 0, TAU); ctx.fill(); }
  } else {
    const grow = Math.min(1, s.age * 5 + 0.4);
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, r * 1.5 * grow, r * 0.26, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s.x + (sd - 0.5) * r * 2.4, s.y + 2.5, r * 0.6 * grow, r * 0.14, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(s.x + (hash(sd * 20 + k) - 0.5) * r * 4.4, s.y + 2 + hash(k) * 3, 1.6, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

// ---- くろスーツ（じゅうじの かお＋ サングラス）----
function limb(ctx, pts, w, col) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = OUT; ctx.lineWidth = w + 3.4; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
function suitHead(ctx, hx, hy, r, flash, shades, boss) {
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx, hy, r + 2, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : boss ? '#d9dad6' : '#b5b7b4'; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(hx - r * 0.3, hy - r * 0.35, r * 0.45, 0, TAU); ctx.fill();
  // じゅうじの かお（よこ むき）
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx + r * 0.45, hy - r * 0.85); ctx.quadraticCurveTo(hx + r * 0.62, hy, hx + r * 0.45, hy + r * 0.85); ctx.moveTo(hx - r * 0.5, hy + r * 0.05); ctx.lineTo(hx + r * 0.98, hy + r * 0.05); ctx.stroke();
  if (shades) { // サングラス
    ctx.fillStyle = OUT; ctx.fillRect(hx - r * 0.35, hy - r * 0.36, r * 1.38, r * 0.2);
    rr(ctx, hx + r * 0.1, hy - r * 0.38, r * 0.78, r * 0.42, r * 0.16); ctx.fill();
  }
}
// e: てき（または ボス）。sc：おおきさ。pose: { walk, ph, wind, atk, gunUp, summon, recoil }
export function drawSuitBody(ctx, gear, sc, P, flash) {
  const jk = flash ? '#fff' : P.boss ? '#1b1c20' : '#2a2b30', pants = flash ? '#fff' : '#1e1f23', shirt = flash ? '#fff' : '#eceeea';
  ctx.save(); ctx.scale(sc, sc);
  const sw = P.walk ? Math.sin(P.ph) * 11 : 0;
  // あし（おく→てまえ）
  limb(ctx, [-2, -28, -2 - sw * 0.5, -14, -3 - sw, -1], 6.5, flash ? '#fff' : '#17181b');
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-sw + 1, -1.5, 6, 2.8, 0, 0, TAU); ctx.fill();
  // おくの うで
  const back = P.atk ? [-12, -40] : P.wind && !gearGun(gear) ? [-14, -46] : [6, -38];
  limb(ctx, [-2, -52, (back[0] - 2) / 2 - 3, (back[1] - 52) / 2 - 18, back[0], back[1]], 5.5, flash ? '#fff' : '#202125');
  // コート（ボス）
  if (P.boss) { ctx.fillStyle = flash ? '#fff' : '#111215'; ctx.beginPath(); ctx.moveTo(-11, -56); ctx.lineTo(-15 - Math.sin(P.t * 4) * 1.5, -8); ctx.lineTo(12, -10); ctx.lineTo(10, -56); ctx.fill(); }
  // からだ（ジャケット・シャツ・ネクタイ）
  ctx.fillStyle = OUT; rr(ctx, -11.5, -60, 23, 34, 6); ctx.fill();
  ctx.fillStyle = jk; rr(ctx, -9.5, -58, 19, 30, 5); ctx.fill();
  ctx.fillStyle = shirt; ctx.beginPath(); ctx.moveTo(1, -58); ctx.lineTo(9, -58); ctx.lineTo(5, -45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(4.2, -57); ctx.lineTo(6.4, -57); ctx.lineTo(6.2, -46); ctx.lineTo(5, -44); ctx.lineTo(4, -46); ctx.closePath(); ctx.fill();
  limb(ctx, [2, -28, 2 + sw * 0.5, -14, 3 + sw, -1], 6.5, pants);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(sw + 7, -1.5, 6.4, 2.9, 0, 0, TAU); ctx.fill();
  suitHead(ctx, 2, -71, 11.5, flash, true, P.boss);
  // てまえの うで と もちもの
  let hand;
  if (P.summon) hand = [21, -92];
  else if (gearGun(gear)) hand = [16, -47 - (P.gunUp ? 2 : 0)];
  else if (P.atk) hand = [26, -50];
  else if (P.wind) hand = [-8, -52];
  else hand = [10 + (P.walk ? Math.cos(P.ph) * 4 : 0), -36];
  const ex = P.summon ? 19 : (hand[0] + 2) / 2, ey = P.summon ? -64 : (hand[1] - 52) / 2 - 10;
  if (gearGun(gear) && !P.summon) {
    const id = gear === 'shotgun' ? 'shotgun' : 'pistol', ang = P.gunUp ? -0.05 : 0.08;
    drawGun(ctx, id, hand[0] - 1, hand[1] + 2, ang - (P.recoil || 0) * 0.4, 1, 1, P.recoil || 0, 0);
    if (id === 'shotgun') limb(ctx, [-1, -52, 14, -44, 30, -45], 5.5, jk);
  }
  limb(ctx, [2, -53, ex, ey, hand[0], hand[1]], 6, jk);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hand[0], hand[1], 4.4, 0, TAU); ctx.fill(); ctx.fillStyle = flash ? '#fff' : '#b5b7b4'; ctx.beginPath(); ctx.arc(hand[0], hand[1], 3, 0, TAU); ctx.fill();
  if (gear === 'knife' && !P.summon) { // ナイフ
    ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(P.atk ? 0 : -0.9);
    ctx.fillStyle = OUT; ctx.fillRect(-1, -2.5, 7, 5); ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(19, -0.5); ctx.lineTo(5, 3); ctx.fill();
    ctx.fillStyle = '#d6dadd'; ctx.beginPath(); ctx.moveTo(6, -1.8); ctx.lineTo(17, -0.4); ctx.lineTo(6, 1.6); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
const gearGun = (g) => g === 'pistol' || g === 'shotgun';
export function drawSuitEnemy(ctx, e, g, flash, walk, ph, wind, atk) {
  const d = e.def, sc = (d.scale || 1) * (e.h / 72);
  if (e.doorIn > 0) { const k = 1 - e.doorIn / (e.doorMax || 0.34); ctx.globalAlpha = 0.25 + k * 0.75; }
  drawSuitBody(ctx, d.gear, sc, { walk, ph, wind, atk, gunUp: wind, recoil: e.state === 'walk' && e.cool > d.cool * 0.85 ? 0.6 : 0, t: g.time }, flash);
  ctx.globalAlpha = 1;
}
export function drawDoorBoss(ctx, b, g) {
  const flash = b.flashT > 0.06, st = b.state, t = g.time;
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, GROUND - b.y, 46, 7, 0, 0, TAU); ctx.fill();
  if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.t / 2); ctx.rotate(-Math.min(1.4, b.t)); }
  if (st === 'intro' && b.t > 1.5) ctx.globalAlpha = 0.35 + (2 - b.t) * 1.2;
  ctx.scale(b.face, 1);
  if (st === 'charge') ctx.rotate(0.22);
  if (st === 'dazed' || st === 'down') ctx.rotate(-0.15);
  const wind = st.endsWith('Wind'), walk = Math.abs(b.vx) > 20 && b.onGround;
  const gun = st === 'burst' || st === 'burstWind';
  drawSuitBody(ctx, gun ? 'pistol' : 'fist', 2.05, { walk, ph: b.anim * 9, wind: wind && !gun, atk: st === 'punch' || st === 'slam', gunUp: gun, summon: st === 'summon', boss: true, t, recoil: st === 'burst' && Math.sin(t * 40) > 0 ? 0.7 : 0 }, flash);
  ctx.restore();
  if (st === 'summon') { // ゆびぱっちん
    const hx = b.x + b.face * 12, hy = b.y - 195;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + t * 2; ctx.moveTo(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10); ctx.lineTo(hx + Math.cos(a) * 20, hy + Math.sin(a) * 20); } ctx.stroke();
  }
}
