// v0.10：あたらしい ぶき 4つ（かえんほうしゃき・じげんばくだん・スモークグレネード・レーザーガン）
// game.js から よばれる。DOM なし。ばくはつは game.explode（てき だけに あたる）を つかう
import {
  GROUND, GRAV, WEAPONS, GUN_GEOM, landOn, tickFlame, tickLaser, tickToss, rayBox, inFlame, inSmoke,
} from './rules.js?v=10';

const MAX_CLOUD_PARTS = 6;

export function initGear(g) {
  g.bombs = []; g.nades = []; g.clouds = []; g.lasers = [];
  g.flameT = 0; g.flameSnd = 0;
}

// じゅうこうの いち
function muzzle(p, id) {
  const G = GUN_GEOM[id];
  return { x: p.x + p.face * (16 + G.mx), y: p.y - 44 + G.my };
}
const alive = (e) => !e.dead && !(e.spawnT > 0) && !(e.doorIn > 0);

// プレイヤーが いま もってる あたらしい ぶきを つかう（うつ ボタン）
export function gearShoot(g, p, W, dt, held) {
  const a = p.ars;
  if (W.gear === 'flame') {
    const r = tickFlame(a, dt, held);
    if (r === 'out') { g.addText(p.x, p.y - 100, 'ねんりょう ぎれ！', '#ffb070', 15); g.ev('nofuel'); return; }
    if (!r) { if (held && a.guns.flame.out && g.time - (g.flameNag || -9) > 1.2) { g.flameNag = g.time; g.ev('nofuel'); } return; }
    p.flaming = true; p.shootT = 0.18; p.recoil = Math.max(p.recoil, 0.35); p.recoilW = 'flame';
    flameFx(g, p, dt);
    g.flameT -= dt;
    if (g.flameT <= 0) { g.flameT = W.flame.tick; flameHit(g, p, W); }
    g.flameSnd -= dt;
    if (g.flameSnd <= 0) { g.flameSnd = 0.14; g.ev('flame'); }
    return;
  }
  if (W.gear === 'laser') {
    const r = tickLaser(a, dt, held);
    if (r) fireLaser(g, p, W);
    if (r === 'over') { g.addText(p.x, p.y - 100, 'あつい！ ちょっと まって', '#ff9ad8', 14); g.ev('overheat'); }
    return;
  }
  if (W.gear === 'tbomb') {
    const r = tickToss(a, dt, held, g.bombs.length < W.bomb.max);
    if (r === 'full') { g.addText(p.x, p.y - 100, `ばくだんは ${W.bomb.max}こ まで！`, '#ffd0a0', 14); g.ev('nofuel'); }
    else if (r) placeBomb(g, p, W);
    return;
  }
  if (W.gear === 'smoke') {
    const r = tickToss(a, dt, held, true);
    if (r === true) throwSmoke(g, p, W);
  }
}

// ---------- かえんほうしゃき ----------
function flameFx(g, p, dt) {
  const m = muzzle(p, 'flame');
  const n = g.parts.length > (g.partCap || 260) - 40 ? 1 : 2;
  for (let i = 0; i < n; i++) {
    const s = 330 + g.rand() * 140;
    g.addPart({ kind: 'flame', x: m.x, y: m.y, vx: p.face * s + p.vx * 0.5, vy: (g.rand() - 0.5) * 80 - 12, life: 0.3 + g.rand() * 0.1, max: 0.4, size: 5 + g.rand() * 3, g: -0.22, seed: g.rand() });
  }
}
function flameHit(g, p, W) {
  const F = W.flame, m = muzzle(p, 'flame');
  let n = 0;
  for (const e of g.tg) {
    if (!alive(e)) continue;
    if (!inFlame(m.x, m.y, p.face, g.hurtBox(e), F.range)) continue;
    e.burnT = F.burn;
    g.damage(e, W.dmg, { knock: W.knock, name: 'ほのお' }, p.face, 'p', false);
    n++;
  }
  for (const c of g.crates) if (c.hp > 0 && inFlame(m.x, m.y, p.face, { x: c.x - 20, y: c.y - 40, w: 40, h: 40 }, F.range)) g.hitCrate(c, 3);
  return n;
}
// もえてる てきは すこし ずつ へる（たおす とき だけ damage を つかう → よろけっぱなし に ならない）
function updateBurn(g, dt) {
  const F = WEAPONS.flame.flame;
  for (const e of g.tg) {
    if (!(e.burnT > 0)) continue;
    if (e.dead) { e.burnT = 0; continue; }
    e.burnT -= dt; e.burnK = (e.burnK || 0) + dt;
    if (e.burnK < 0.25) continue;
    e.burnK -= 0.25;
    const d = F.burnDps * 0.25;
    if (e.kind === 'boss' || e.hp - d <= 0) g.damage(e, d, { knock: 1, name: 'やけど' }, e.face > 0 ? -1 : 1, 'p', false);
    else { e.hp -= d; e.flashT = Math.max(e.flashT, 0.05); }
    if (g.rand() < 0.5) g.addPart({ kind: 'flame', x: e.x + (g.rand() - 0.5) * e.w, y: e.y - e.h * (0.3 + g.rand() * 0.5), vx: (g.rand() - 0.5) * 30, vy: -60 - g.rand() * 40, life: 0.3, max: 0.3, size: 4, g: -0.2, seed: g.rand() });
  }
}

// ---------- レーザーガン ----------
export function fireLaser(g, p, W) {
  const L = W.laser, m = muzzle(p, 'laser');
  let ang = 0;
  const tgt = g.nearestTarget(p.x, p.y, p.face, L.len);
  if (tgt) {
    const hb = g.hurtBox(tgt);
    const ty = Math.min(Math.max(m.y, hb.y + 8), hb.y + hb.h - 8);
    ang = Math.max(-0.3, Math.min(0.3, Math.atan2(ty - m.y, Math.max(1, Math.abs(hb.x + hb.w / 2 - m.x)))));
  }
  const dx = Math.cos(ang) * p.face, dy = Math.sin(ang);
  const hits = [];
  for (const e of g.tg) {
    if (!alive(e)) continue;
    const t = rayBox(m.x, m.y, dx, dy, g.hurtBox(e), L.len);
    if (t >= 0) hits.push({ e, t });
  }
  hits.sort((u, v) => u.t - v.t);
  const n = Math.min(L.pierce, hits.length);
  for (let i = 0; i < n; i++) {
    const { e, t } = hits[i];
    g.damage(e, W.dmg, { knock: W.knock, name: 'レーザー' }, p.face, 'p', false);
    g.sparks(m.x + dx * t, m.y + dy * t, '#ff9af0', 3);
  }
  for (const c of g.crates) if (c.hp > 0 && rayBox(m.x, m.y, dx, dy, { x: c.x - 20, y: c.y - 40, w: 40, h: 40 }, L.len) >= 0) g.hitCrate(c, 6);
  let end = n >= L.pierce ? hits[n - 1].t + 12 : L.len;
  if (dy > 0) end = Math.min(end, (GROUND - m.y) / dy); // じめんで とまる
  g.lasers.push({ x0: m.x, y0: m.y, x1: m.x + dx * end, y1: m.y + dy * end, life: 0.13, max: 0.13 });
  g.addPart({ kind: 'muzzle', x: m.x, y: m.y, life: 0.06, max: 0.06, size: 9, face: p.face, color: '#ff8ae8', style: 'laser', seed: g.rand() });
  p.recoil = 1; p.recoilW = 'laser'; p.shootT = 0.18; p.flashN = (p.flashN || 0) + 1;
  if (n >= 3) g.addText(p.x + p.face * 120, p.y - 110, `${n}たい つらぬいた！`, '#ffb0f0', 16, true);
  g.ev('laser', { n });
  return n;
}

// ---------- じげんばくだん ----------
export function placeBomb(g, p, W) {
  const b = { x: p.x + p.face * 16, y: p.y, vy: p.onGround ? 0 : Math.max(0, p.vy), onGround: p.onGround, t: 0, fuse: W.bomb.fuse, sec: Math.ceil(W.bomb.fuse), seed: g.rand() };
  g.bombs.push(b);
  g.addText(b.x, b.y - 40, 'セット！', '#ffe27a', 14);
  g.ev('place');
  return b;
}
function boom(g, b) {
  if (b.done) return;
  b.done = true;
  const B = WEAPONS.tbomb.bomb;
  g.explode({ x: b.x, y: b.y - 14, blast: { ...B.blast }, owner: 'p' });
  g.addText(b.x, b.y - 70, 'ドカーン！', '#ffde3a', 24, true);
  for (const o of g.bombs) if (!o.done && Math.abs(o.x - b.x) < B.blast.r && Math.abs(o.y - b.y) < B.blast.r) o.t = Math.max(o.t, o.fuse - 0.15); // ゆうばく
}
function updateBombs(g, dt) {
  const B = WEAPONS.tbomb.bomb;
  for (const b of g.bombs) {
    if (b.done) continue;
    if (!b.onGround) {
      b.vy = Math.min(b.vy + GRAV * dt, 900);
      const ny = b.y + b.vy * dt, land = landOn(g.platforms, b.x, b.y, ny, 6);
      if (land !== null) { b.y = land; b.onGround = true; b.vy = 0; g.ev('thud'); }
      else if (ny >= GROUND) { b.y = GROUND; b.onGround = true; b.vy = 0; }
      else b.y = ny;
    }
    b.t += dt;
    const rem = b.fuse - b.t, sec = Math.ceil(rem);
    if (sec !== b.sec && rem > 0) { b.sec = sec; g.ev('beep', { last: sec <= 3 }); }
    if (rem <= 0) { boom(g, b); continue; }
    if (b.t < B.arm) continue;
    for (const e of g.tg) { // てきが ふんだら
      if (!alive(e)) continue;
      const hb = g.hurtBox(e), feet = hb.y + hb.h;
      if (Math.abs(feet - b.y) < 26 && hb.x < b.x + B.trig && hb.x + hb.w > b.x - B.trig) { boom(g, b); break; }
    }
  }
  for (let i = g.bombs.length - 1; i >= 0; i--) if (g.bombs[i].done) g.bombs.splice(i, 1);
}

// ---------- スモークグレネード ----------
export function throwSmoke(g, p, W) {
  const S = W.smoke;
  const n = { x: p.x + p.face * 18, y: p.y - 60, vx: p.face * S.vx + p.vx * 0.4, vy: S.vy, t: 0, rot: 0 };
  g.nades.push(n);
  g.ev('whoosh');
  return n;
}
export function popCloud(g, x, y) {
  const S = WEAPONS.smoke.smoke;
  while (g.clouds.length >= S.max) g.clouds.shift();
  const c = { x, y, t: 0, dur: S.dur, r: S.r, seed: Math.floor(g.rand() * 1000) };
  g.clouds.push(c);
  for (let i = 0; i < MAX_CLOUD_PARTS; i++) g.addPart({ kind: 'smoke', x: x + (g.rand() - 0.5) * 60, y: y - 20, vx: (g.rand() - 0.5) * 260, vy: -60 - g.rand() * 120, life: 0.7, max: 0.7, size: 12 + g.rand() * 10, color: '#c9ccd2', g: -0.05 });
  g.addText(x, y - 150, 'モクモク！', '#e6e9ee', 16, true);
  g.ev('smoke');
  return c;
}
function updateNades(g, dt) {
  for (const n of g.nades) {
    if (n.done) continue;
    const py = n.y;
    n.vy += GRAV * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.t += dt; n.rot += dt * 12 * Math.sign(n.vx || 1);
    if (g.lock && (n.x < g.lock.l + 8 || n.x > g.lock.r - 8)) { n.x = Math.min(Math.max(n.x, g.lock.l + 8), g.lock.r - 8); n.vx *= -0.4; }
    let land = n.vy > 0 ? landOn(g.platforms, n.x, py, n.y, 4) : null;
    if (land === null && n.y >= GROUND) land = GROUND;
    if (land !== null || n.t > 1.8) { n.done = true; popCloud(g, n.x, land ?? Math.min(n.y, GROUND)); }
  }
  for (let i = g.nades.length - 1; i >= 0; i--) if (g.nades[i].done) g.nades.splice(i, 1);
}
// てきから プレイヤーが みえない？（じぶんが けむりの なか か、あいてが けむりの なか）
export function blindTo(g, e, T) {
  if (!g.clouds.length || e.kind === 'boss') return false;
  if (inSmoke(g.clouds, e.x, e.y - e.h / 2)) return true;
  return !!T && Math.abs(T.x - e.x) > 50 && inSmoke(g.clouds, T.x, T.y - 36);
}
// みえない てきは うろうろ（ゆっくり・ときどき むきを かえる）
export function blindWalk(g, e, dt) {
  e.wT = (e.wT || 0) - dt;
  if (e.wT <= 0) { e.wT = 0.6 + g.rand() * 0.9; e.wDir = g.rand() < 0.25 ? 0 : g.rand() < 0.5 ? -1 : 1; }
  if (e.wDir) e.face = e.wDir;
  e.vx += ((e.wDir || 0) * e.def.speed * 0.35 - e.vx) * Math.min(1, dt * 6);
  e.aimX = undefined;
}

// まいフレーム
export function updateGear(g, dt) {
  for (const l of g.lasers) l.life -= dt;
  for (let i = g.lasers.length - 1; i >= 0; i--) if (g.lasers[i].life <= 0) g.lasers.splice(i, 1);
  for (const c of g.clouds) c.t += dt;
  for (let i = g.clouds.length - 1; i >= 0; i--) if (g.clouds[i].t >= g.clouds[i].dur) g.clouds.splice(i, 1);
  updateNades(g, dt);
  updateBombs(g, dt);
  updateBurn(g, dt);
}
