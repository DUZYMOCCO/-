// ゲームの なかみ（DOM なし）。render.js が これを えがく
import {
  H, GROUND, GRAV, PHYS, WEAPONS, MOVES, COMBO_WINDOW, CHAIN_GRACE, ENEMIES, BOSSES, STAGES, ALLIES, ALLY_DOWN_TIME,
  createArsenal, giveWeapon, addAmmo, nextWeapon, tickGun, pickMove, moveBox, overlap, knockOf, comboWord,
  allyDecide, landOn, makePlatforms, scoreFor,
} from './rules.js?v=3';

export const BLOOD = {
  green: ['#63e64b', '#2fae3a', '#a6ff6e', '#1f7d2b'],
  purple: ['#b04aff', '#7a2fd0', '#e08bff', '#4e1a8c'],
};
const MAX_PARTS = 260, MAX_SPLATS = 90;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const bodyBox = (e) => ({ x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h });

export const EMPTY_INPUT = { left: false, right: false, up: false, down: false, jump: false, jumpHeld: false, shoot: false, kick: false, punch: false, swap: false };

export class Game {
  constructor(stageIdx = 0, opts = {}) {
    this.stageIdx = stageIdx;
    this.stage = STAGES[stageIdx];
    this.viewW = opts.viewW || 667;
    this.rand = rng(opts.seed ?? 12345);
    this.platforms = makePlatforms(this.stage);
    this.state = 'play';
    this.time = 0; this.score = 0; this.kills = 0; this.combo = 0; this.comboT = 0; this.maxCombo = 0; this.continues = 0;
    this.hitstop = 0; this.shake = 0; this.flash = 0; this.slowmo = 0;
    this.events = []; this.parts = []; this.splats = []; this.texts = []; this.bullets = []; this.hazards = [];
    this.enemies = []; this.boss = null; this.bossDone = 0; this.go = 0;
    this.player = this.makeFighter(90, { hp: 100, kind: 'player' });
    this.player.ars = createArsenal(['pistol']);
    this.player.lives = 3;
    this.allies = (opts.allies === false ? [] : ALLIES).map((d) => {
      const a = this.makeFighter(90 + d.offset, { hp: d.hp, kind: 'ally' });
      a.def = d; a.ars = createArsenal([d.weapon]); a.ars.guns[d.weapon].ammo = Infinity; a.down = 0; a.think = 0; a.mode = 'follow';
      return a;
    });
    this.pickups = this.stage.pickups.map(([x, kind, y]) => ({ x, y: y ?? GROUND, kind, t: this.rand() * 6, taken: false }));
    this.crates = this.stage.crates.map(([x]) => ({ x, y: GROUND, w: 40, h: 40, hp: 18, hit: 0 }));
    this.arenaIdx = 0; this.arena = null; this.lock = null;
    this.camX = 0;
    this.say(this.stage.name, this.stage.sub);
  }
  makeFighter(x, { hp, kind }) {
    return { kind, x, y: GROUND, vx: 0, vy: 0, w: 26, h: 72, face: 1, hp, maxHp: hp, onGround: true, jumps: 0, coyote: 0, jumpBuf: 0,
      move: null, moveId: null, moveT: 0, step: 0, sinceMove: 9, queued: null, hitSet: null, inv: 0, hurtT: 0, runT: 0, dropT: 0,
      shootT: 0, anim: 0, recoil: 0 };
  }
  say(big, small = '', t = 2) { this.banner = { big, small, t }; }
  ev(type, data = {}) { if (this.events.length < 80) this.events.push({ type, ...data }); }

  // ---------- まいフレーム ----------
  update(dt, input = EMPTY_INPUT) {
    dt = Math.min(dt, 1 / 30);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.updateFx(dt);
    if (this.state !== 'play') { if (this.state === 'win') { this.winT -= dt; if (this.winT <= 0) this.state = 'clear'; } }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.4; }
    if (this.state === 'over' || this.state === 'clear') return;
    this.time += dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.state === 'play') this.updatePlayer(dt, input);
    for (const a of this.allies) this.updateAlly(a, dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    if (this.boss) this.updateBoss(this.boss, dt);
    this.updateBullets(dt);
    this.updateHazards(dt);
    this.updatePickups(dt);
    this.enemies = this.enemies.filter((e) => !e.gone);
    this.updateProgress(dt);
    this.updateCamera(dt);
  }

  // ---------- プレイヤー ----------
  updatePlayer(dt, inp) {
    const p = this.player;
    p.anim += dt; p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt);
    p.recoil = Math.max(0, p.recoil - dt * 8); p.sinceMove += dt; p.shootT = Math.max(0, p.shootT - dt);
    if (p.hp <= 0) return this.updateDeadPlayer(p, dt);
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (inp.swap) { const w = nextWeapon(p.ars); this.ev('swap', { w }); this.addText(p.x, p.y - 96, WEAPONS[w].name, '#fff', 15); }
    if (inp.jump) p.jumpBuf = PHYS.jumpBuffer; else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    if (inp.kick) p.queued = 'kick';
    if (inp.punch) p.queued = 'punch';

    // わざ
    if (p.move) {
      p.moveT += dt;
      const M = p.move;
      if (p.moveId === 'flykick') { p.vy = Math.min(p.vy + GRAV * 0.5 * dt, 640); }
      else if (p.moveId === 'slide') { p.vx *= Math.pow(0.12, dt); }
      else if (!M.air) p.vx = p.vx * Math.pow(0.0005, dt);
      if (p.moveT >= M.t0 && p.moveT <= M.t1) this.meleeHits(p, M, 1, true);
      const canChain = p.moveT >= M.chain;
      if (canChain && p.queued && p.moveId !== 'flykick') { this.startMove(p, p.queued, inp, true); p.queued = null; }
      else if (p.moveT >= M.dur || (M.air && p.onGround && p.moveT > 0.08)) { p.move = null; p.moveId = null; p.sinceMove = 0; }
    } else if (p.queued) {
      const chain = p.sinceMove < CHAIN_GRACE;
      this.startMove(p, p.queued, inp, chain); p.queued = null;
    }
    if (!p.move) {
      const acc = p.onGround ? PHYS.accel : PHYS.airAccel;
      if (dir) { p.vx = clamp(p.vx + dir * acc * dt, -PHYS.speed, PHYS.speed); p.face = dir; p.runT += dt; }
      else { p.runT = 0; const f = PHYS.friction * dt * (p.onGround ? 1 : 0.35); p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
      if (Math.abs(p.vx) > PHYS.speed) p.vx -= Math.sign(p.vx) * PHYS.friction * dt;
      // ジャンプ
      if (p.jumpBuf > 0) {
        if (inp.down && p.onGround && p.y < GROUND - 1) { p.dropT = 0.25; p.onGround = false; p.jumpBuf = 0; }
        else if (p.onGround || p.coyote > 0) { p.vy = -PHYS.jumpV; p.onGround = false; p.coyote = 0; p.jumps = 1; p.jumpBuf = 0; this.ev('jump'); this.dust(p.x, p.y, 5); }
        else if (p.jumps < 2) { p.vy = -PHYS.jump2V; p.jumps = 2; p.jumpBuf = 0; this.ev('jump2'); this.ring(p.x, p.y, '#ffffff'); }
      }
      if (!inp.jumpHeld && p.vy < -260) p.vy += GRAV * 1.1 * dt; // みじかく おすと ひくい ジャンプ
      // うつ
      const W = tickGun(p.ars, dt, inp.shoot);
      if (W) { this.fire(p, W, 'p'); p.shootT = 0.18; if (!dir && p.onGround) p.vx -= p.face * W.knock * 0.25; }
    }
    this.physics(p, dt);
    // カメラ ロック
    const minX = this.lock ? this.lock.l + 14 : 14;
    const maxX = this.lock ? this.lock.r - 14 : this.stage.length - 14;
    if (p.x < minX) { p.x = minX; p.vx = Math.max(0, p.vx); }
    if (p.x > maxX) { p.x = maxX; p.vx = Math.min(0, p.vx); }
  }
  updateDeadPlayer(p, dt) {
    p.deadT = (p.deadT || 0) + dt;
    this.physics(p, dt);
    p.vx *= Math.pow(0.05, dt);
    if (p.deadT > 1.4) {
      if (p.lives > 1) { p.lives--; this.revivePlayer(); }
      else { p.lives = 0; this.state = 'over'; this.ev('over'); }
    }
  }
  revivePlayer() {
    const p = this.player;
    p.hp = p.maxHp; p.inv = 2.5; p.deadT = 0; p.vy = -500; p.move = null; p.hurtT = 0;
    this.ring(p.x, p.y - 40, '#9dff6a'); this.addText(p.x, p.y - 110, 'ふっかつ！', '#9dff6a', 22); this.ev('revive');
  }
  continueGame() { // やさしい コンティニュー：その ばしょ から
    if (this.state !== 'over') return;
    this.continues++; this.player.lives = 3; this.state = 'play'; this.score = Math.floor(this.score / 2);
    this.revivePlayer();
    for (const e of this.enemies) if (Math.abs(e.x - this.player.x) < 140) { e.x += (e.x < this.player.x ? -1 : 1) * 160; }
  }
  startMove(p, kind, inp, chain) {
    const air = !p.onGround;
    const step = chain && p.moveKind !== undefined ? p.step + 1 : 0;
    if (inp.left) p.face = -1; else if (inp.right) p.face = 1;
    const id = pickMove(kind, { air, step: step % 3, running: Math.abs(p.vx) > 180 ? p.runT : 0, down: inp.down && !air });
    if (air && p.airMoves >= 2 && id === 'flykick') return;
    const M = MOVES[id];
    p.move = M; p.moveId = id; p.moveT = 0; p.hitSet = new Set(); p.step = id === 'slide' || M.air ? 0 : step % 3; p.moveKind = kind;
    if (air) p.airMoves = (p.airMoves || 0) + 1;
    if (id === 'flykick') { p.vx = p.face * 470; p.vy = Math.max(p.vy, -120); }
    else if (id === 'slide') { p.vx = p.face * 470; }
    else if (id === 'airjab') { p.vy = Math.min(p.vy, -60); }
    else { p.vx = p.face * (id === 'high' ? 170 : id === 'spin' ? 90 : 120); }
    this.ev(kind === 'kick' ? 'whoosh' : 'whoosh2', { id });
  }

  // わざが あたる
  meleeHits(src, M, mult, isPlayer) {
    const box = moveBox(M, src.x, src.y, src.face);
    const boxB = M.both ? moveBox(M, src.x, src.y, -src.face) : null;
    let hit = false;
    const targets = this.boss && this.boss.hp > 0 && this.boss.state !== 'intro' ? [...this.enemies, this.boss] : this.enemies;
    for (const e of targets) {
      if (e.dead || src.hitSet.has(e)) continue;
      const hb = this.hurtBox(e);
      const inA = overlap(box, hb), inB = boxB && overlap(boxB, hb);
      if (!inA && !inB) continue;
      src.hitSet.add(e);
      const face = inA ? src.face : -src.face;
      this.damage(e, M.dmg * mult, M, face, isPlayer ? 'p' : 'a', true);
      hit = true;
    }
    for (const c of this.crates) {
      if (c.hp <= 0 || src.hitSet.has(c)) continue;
      if (overlap(box, { x: c.x - 20, y: c.y - 40, w: 40, h: 40 }) || (boxB && overlap(boxB, { x: c.x - 20, y: c.y - 40, w: 40, h: 40 }))) { src.hitSet.add(c); this.hitCrate(c, 12); hit = true; }
    }
    if (hit && isPlayer) {
      this.hitstop = Math.max(this.hitstop, M.stop);
      this.shake = Math.max(this.shake, M.big ? 9 : 4);
      if (src.moveId === 'flykick') { src.vy = -430; src.vx = -src.face * 120; src.move = null; src.moveId = null; src.sinceMove = 0; src.airMoves = 0; src.jumps = 1; }
      if (M.big) { this.flash = 0.12; this.slowmo = 0.12; }
    }
    return hit;
  }
  hurtBox(e) {
    if (e.id === 'hydra') return { x: e.x - 70, y: e.lowered ? GROUND - 120 : GROUND - 175, w: 140, h: e.lowered ? 120 : 175 };
    return bodyBox(e);
  }
  // ダメージ（melee=true は パンチ・キック）
  damage(e, dmg, M, face, owner, melee) {
    if (e.dead) return;
    const isBoss = e.kind === 'boss';
    if (e.shieldHp > 0 && Math.sign(face) === -e.face && !(e.state === 'hurt' || e.state === 'air')) {
      e.shieldHp -= melee ? dmg * 1.6 : dmg * 0.25;
      this.sparks(e.x + e.face * 18, e.y - 40, '#ffe27a', 5); this.ev(melee ? 'clang' : 'ting');
      if (e.shieldHp <= 0) { e.shieldHp = 0; this.addText(e.x, e.y - 100, 'タテ こわれた！', '#ffe27a', 16); this.ev('break'); this.debris(e.x + e.face * 18, e.y - 40, '#8a93a0', 8); e.state = 'hurt'; e.t = 0.5; e.vx = face * 200; }
      else if (melee) { e.vx = face * 160; }
      return;
    }
    let mult = 1;
    if (e.id === 'agent' && e.state === 'dazed') mult = 2;
    if (e.id === 'hydra') mult = e.lowered ? 1.6 : 0.45;
    const real = dmg * mult;
    e.hp -= real;
    e.flashT = 0.1;
    const def = e.def;
    const hb = this.hurtBox(e);
    const hy = isBoss && e.id === 'hydra' ? hb.y + hb.h * 0.45 : e.y - e.h * 0.6;
    this.blood(e.x - face * 6, hy, face, def.blood, melee ? 9 : 4);
    if (melee && this.rand() < 0.35) this.splat(e.x + face * (10 + this.rand() * 40), hy - 10 + (this.rand() - 0.5) * 50, def.blood, true);
    if (!melee) this.sparks(e.x - face * 8, hy, '#fff1c4', 2);
    if (owner === 'p' || owner === 'a') {
      if (owner === 'p') { this.combo++; this.comboT = COMBO_WINDOW; this.maxCombo = Math.max(this.maxCombo, this.combo); const w = comboWord(this.combo); if (w && [6, 12, 20, 30].includes(this.combo)) this.addText(this.player.x, this.player.y - 120, w, '#ffe14a', 22); }
    }
    if (melee) {
      this.impact(e.x - face * 10, hy, M);
      this.ev('hit', { big: !!M.big, id: M.name });
    } else this.ev('bhit');
    if (isBoss) {
      e.stag = (e.stag || 0) + real;
      if (e.hp <= 0) this.killBoss(e, face);
      return;
    }
    // ふっとび
    const kb = melee ? knockOf(M, def.weight, face, def.armor || 0) : { vx: face * (M.knock || 60) / def.weight, vy: M.blast ? -420 : 0 };
    const superArmor = def.armor && !M.big && !M.launch && e.state === 'wind' && melee;
    if (!superArmor) {
      e.vx = kb.vx;
      if (kb.vy < -150 || !e.onGround) { e.vy = Math.min(e.vy, kb.vy); e.onGround = false; e.state = 'air'; }
      else { e.state = 'hurt'; e.t = melee ? 0.36 : 0.12; }
      if (M.big) e.wallBounce = true;
    }
    if (e.hp <= 0) {
      e.dead = true; e.state = 'air'; e.onGround = false; e.vy = Math.min(e.vy, -380); e.vx = face * Math.max(Math.abs(e.vx), 260); e.deadT = 0;
      this.kills++;
      const pts = scoreFor(def.score, this.combo);
      this.score += pts; this.addText(e.x, e.y - e.h - 10, `+${pts}`, '#fff', 14);
      this.ev('kill');
    }
  }
  impact(x, y, M) {
    const word = M.big ? 'ドカッ！' : M.launch ? 'バキッ！' : M.limb === 'spin' ? 'ズバン！' : M.limb === 'fly' ? 'ドゴッ！' : M.limb.startsWith('hand') ? 'バシッ！' : 'ドンッ！';
    this.addText(x, y - 20, word, M.big ? '#ffde3a' : '#fff', M.big ? 26 : 18, true);
    this.ring(x, y, '#ffffff');
    this.sparks(x, y, '#fff7c2', M.big ? 10 : 5);
  }
  hitCrate(c, dmg) {
    c.hp -= dmg; c.hit = 0.12; this.ev('wood');
    if (c.hp <= 0) {
      this.debris(c.x, c.y - 20, '#8b5a2b', 12); this.smoke(c.x, c.y - 20, 4); this.ev('break');
      const r = this.rand();
      this.pickups.push({ x: c.x, y: c.y, kind: r < 0.45 ? 'heal' : 'ammo', t: 0, taken: false, vy: -300 });
    }
  }
  killBoss(b, face) {
    b.dead = true; b.state = 'dead'; b.t = 0; b.hp = 0;
    const pts = scoreFor(BOSSES[b.id].score, this.combo);
    this.score += pts; this.kills++;
    this.addText(b.x, GROUND - 200, `+${pts}`, '#ffe14a', 22);
    this.slowmo = 1.2; this.flash = 0.3; this.shake = 16; this.ev('bossDie');
    this.hazards.length = 0;
    for (const bl of this.bullets) if (bl.owner === 'e') bl.life = 0;
    for (const e of this.enemies) if (!e.dead) { e.hp = 0; this.damage(e, 1, MOVES.kick, e.x < b.x ? -1 : 1, 'x', false); }
  }

  // ---------- うつ ----------
  fire(src, W, owner, dmgMul = 1) {
    const gx = src.x + src.face * 34, gy = src.y - 44 + (src.onGround ? 0 : 0);
    let base = src.face > 0 ? 0 : Math.PI;
    // すこし じどう ねらい
    const tgt = this.nearestTarget(src.x, src.y, src.face, 520);
    if (tgt) {
      const hb = this.hurtBox(tgt);
      const ty = clamp(gy, hb.y + 8, hb.y + hb.h - 8);
      const ang = Math.atan2(ty - gy, Math.abs(hb.x + hb.w / 2 - gx));
      const a = clamp(ang, -0.35, 0.35);
      base = src.face > 0 ? a : Math.PI - a;
    }
    for (let i = 0; i < W.pellets; i++) {
      const a = base + (this.rand() - 0.5) * W.spread * 2;
      this.bullets.push({ owner, x: gx, y: gy, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed, life: W.life * (0.85 + this.rand() * 0.3), dmg: W.dmg * dmgMul, knock: W.knock, w: W.id, blast: W.blast, r: W.id === 'bazooka' ? 7 : 3 });
    }
    src.recoil = 1;
    if (W.id !== 'bazooka' && this.parts.length < MAX_PARTS) this.parts.push({ kind: 'shell', x: gx - src.face * 20, y: gy - 4, vx: -src.face * (60 + this.rand() * 60), vy: -200 - this.rand() * 80, life: 2.2, max: 2.2, size: 3, color: '#b89a52', g: 1 });
    this.parts.push({ kind: 'muzzle', x: gx + src.face * 8, y: gy, life: 0.05, max: 0.05, size: W.id === 'shotgun' || W.id === 'bazooka' ? 16 : 10, face: src.face, color: '#fff3a0' });
    this.ev('shoot', { w: W.id, owner });
  }
  nearestTarget(x, y, face, range) {
    let best = null, bd = range;
    const list = this.boss && !this.boss.dead && this.boss.state !== 'intro' ? [...this.enemies, this.boss] : this.enemies;
    for (const e of list) {
      if (e.dead || e.spawnT > 0) continue;
      const dx = (e.x - x) * face;
      if (dx < -10 || dx > bd) continue;
      if (Math.abs((e.y - (e.h || 60) / 2) - (y - 44)) > 170) continue;
      bd = dx; best = e;
    }
    return best;
  }
  updateBullets(dt) {
    const targetsP = this.boss && !this.boss.dead && this.boss.state !== 'intro' ? [...this.enemies, this.boss] : this.enemies;
    for (const b of this.bullets) {
      b.life -= dt;
      if (b.grav) b.vy += GRAV * b.grav * dt;
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0) { if (b.blast) this.explode(b); continue; }
      if (b.y > GROUND) { b.life = 0; if (b.blast) this.explode(b); else if (b.owner === 'e') this.blood(b.x, GROUND - 2, 0, 'purple', 3); else this.sparks(b.x, GROUND, '#ffd38a', 2); continue; }
      const bb = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      if (b.owner === 'e') {
        for (const f of this.fighters()) {
          if (f.hp <= 0 || f.inv > 0 || (f.down > 0)) continue;
          if (overlap(bb, bodyBox(f))) { b.life = 0; this.hurtFighter(f, b.dmg, Math.sign(b.vx) || 1, 180); break; }
        }
        continue;
      }
      for (const e of targetsP) {
        if (e.dead || e.spawnT > 0) continue;
        if (overlap(bb, this.hurtBox(e))) {
          b.life = 0;
          if (b.blast) { this.explode(b); break; }
          this.damage(e, b.dmg, { knock: b.knock, name: 'たま' }, Math.sign(b.vx) || 1, b.owner, false);
          if (b.owner === 'p' && b.w === 'shotgun') this.hitstop = Math.max(this.hitstop, 0.02);
          break;
        }
      }
      if (b.life > 0) for (const c of this.crates) if (c.hp > 0 && overlap(bb, { x: c.x - 20, y: c.y - 40, w: 40, h: 40 })) { b.life = 0; this.hitCrate(c, b.dmg); if (b.blast) this.explode(b); break; }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }
  explode(b) {
    const B = b.blast; b.blast = null;
    this.shake = Math.max(this.shake, 12); this.flash = 0.1; this.ev('boom');
    for (let i = 0; i < 14; i++) { const a = this.rand() * Math.PI * 2, s = 80 + this.rand() * 260; this.addPart({ kind: 'fire', x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.5, max: 0.5, size: 10 + this.rand() * 10, color: i % 2 ? '#ffb43a' : '#ffe27a', g: -0.1 }); }
    this.smoke(b.x, b.y, 8); this.ring(b.x, b.y, '#ffd25a', B.r);
    const targets = this.boss && !this.boss.dead && this.boss.state !== 'intro' ? [...this.enemies, this.boss] : this.enemies;
    for (const e of targets) {
      if (e.dead) continue;
      const hb = this.hurtBox(e);
      const cx = clamp(b.x, hb.x, hb.x + hb.w), cy = clamp(b.y, hb.y, hb.y + hb.h);
      if (Math.hypot(cx - b.x, cy - b.y) > B.r) continue;
      const face = e.x >= b.x ? 1 : -1;
      this.damage(e, B.dmg, { kx: B.knock, ky: -520, name: 'バクハツ', big: true, limb: 'foot', blast: true, knock: B.knock }, face, b.owner, false);
      if (!e.dead && e.kind !== 'boss') { e.vy = -520 / e.def.weight; e.onGround = false; e.state = 'air'; }
    }
    for (const c of this.crates) if (c.hp > 0 && Math.abs(c.x - b.x) < B.r) this.hitCrate(c, 99);
  }
  fighters() { return this.allies.length ? [this.player, ...this.allies] : [this.player]; }
  hurtFighter(f, dmg, face, kx = 220) {
    if (f.hp <= 0 || f.inv > 0 || f.down > 0) return false;
    if (f.kind === 'ally') dmg *= 0.7;
    f.hp -= dmg; f.inv = f.kind === 'player' ? 0.9 : 0.6; f.hurtT = 0.3; f.vx = face * kx; f.vy = -220; f.onGround = false;
    f.move = null; f.moveId = null; f.queued = null;
    this.sparks(f.x, f.y - 50, '#ffffff', 5); this.ring(f.x, f.y - 46, '#ff6a6a');
    if (f.kind === 'player') {
      this.combo = 0; this.comboT = 0; this.shake = Math.max(this.shake, 6); this.ev('hurt');
      if (f.hp <= 0) { f.hp = 0; f.deadT = 0; f.vy = -420; this.addText(f.x, f.y - 110, 'やられた…', '#ffb0b0', 20); this.ev('down'); }
    } else if (f.hp <= 0) { f.hp = 0; f.down = ALLY_DOWN_TIME; this.addText(f.x, f.y - 100, `${f.def.name} ダウン`, '#ffd0d0', 14); this.ev('down'); }
    return true;
  }

  // ---------- なかま ----------
  updateAlly(a, dt) {
    a.anim += dt; a.inv = Math.max(0, a.inv - dt); a.hurtT = Math.max(0, a.hurtT - dt); a.recoil = Math.max(0, a.recoil - dt * 8); a.think -= dt; a.shootT = Math.max(0, a.shootT - dt);
    if (a.down > 0) {
      a.down -= dt; this.physics(a, dt); a.vx *= Math.pow(0.02, dt);
      if (a.down <= 0 || this.state === 'win') { a.down = 0; a.hp = Math.round(a.maxHp * 0.6); a.inv = 1.5; this.addText(a.x, a.y - 100, `${a.def.name} ふっかつ！`, '#9dff6a', 14); this.ring(a.x, a.y - 40, '#9dff6a'); }
      return;
    }
    const p = this.player;
    if (a.think <= 0) {
      a.think = 0.15 + this.rand() * 0.1;
      a.target = this.nearestAny(a.x, a.y, 460);
      a.mode = allyDecide(a, a.target && { x: a.target.x, y: a.target.kind === 'boss' ? GROUND - 40 : a.target.y, h: a.target.kind === 'boss' ? 80 : a.target.h }, p);
    }
    if (a.mode === 'warp' || (this.lock && (a.x < this.lock.l + 5 || a.x > this.lock.r - 5))) {
      a.x = p.x - p.face * (40 + Math.abs(a.def.offset) * 0.4); a.y = Math.min(p.y, GROUND); a.vy = 0; a.vx = 0;
      if (this.lock) a.x = clamp(a.x, this.lock.l + 20, this.lock.r - 20);
      this.smoke(a.x, a.y - 30, 3); this.ev('warp'); a.mode = 'follow'; a.think = 0.3;
    }
    if (a.move) {
      a.moveT += dt; a.vx *= Math.pow(0.002, dt);
      if (a.moveT >= a.move.t0 && a.moveT <= a.move.t1) this.meleeHits(a, a.move, a.def.kickDmg, false);
      if (a.moveT >= a.move.dur) { a.move = null; a.moveId = null; }
    } else if (a.hurtT <= 0) {
      let goal = p.x + a.def.offset * p.face * -1 * -1;
      goal = p.x + (p.face > 0 ? a.def.offset : -a.def.offset);
      const t = a.target;
      if (t && (a.mode === 'shoot' || a.mode === 'kick')) {
        a.face = t.x > a.x ? 1 : -1;
        const want = a.mode === 'kick' ? t.x - a.face * 40 : (Math.abs(t.x - a.x) > 300 ? t.x - a.face * 260 : a.x);
        goal = want;
      }
      const dx = goal - a.x;
      if (Math.abs(dx) > 18) { a.vx = clamp(a.vx + Math.sign(dx) * PHYS.accel * dt, -PHYS.speed * 0.95, PHYS.speed * 0.95); if (!t) a.face = Math.sign(dx); }
      else a.vx *= Math.pow(0.001, dt);
      if (a.onGround && ((p.y < a.y - 60 && Math.abs(p.x - a.x) < 200) || (t && t.y < a.y - 70 && Math.abs(t.x - a.x) < 150)) && this.rand() < dt * 3) { a.vy = -PHYS.jumpV; a.onGround = false; }
      if (a.onGround && a.y < GROUND - 1 && p.y > a.y + 40 && this.rand() < dt * 2) { a.dropT = 0.25; a.onGround = false; }
      if (a.mode === 'kick' && t && a.onGround && this.rand() < dt * 6) {
        const id = ['kick', 'spin', 'high'][Math.floor(this.rand() * 3)];
        a.move = MOVES[id]; a.moveId = id; a.moveT = 0; a.hitSet = new Set(); a.face = t.x > a.x ? 1 : -1; this.ev('whoosh', { ally: true });
      } else if (a.mode === 'shoot' && t) {
        const W = tickGun(a.ars, dt, this.rand() < 0.8);
        if (W) { this.fire(a, W, 'a', a.def.gunDmg); a.shootT = 0.18; a.ars.cool += W.rate * 0.6; }
      }
    }
    this.physics(a, dt);
    const minX = this.lock ? this.lock.l + 14 : 14, maxX = this.lock ? this.lock.r - 14 : this.stage.length - 14;
    a.x = clamp(a.x, minX, maxX);
  }
  nearestAny(x, y, range) {
    let best = null, bd = range;
    const list = this.boss && !this.boss.dead && this.boss.state !== 'intro' ? [...this.enemies, this.boss] : this.enemies;
    for (const e of list) { if (e.dead || e.spawnT > 0) continue; const d = Math.abs(e.x - x) + Math.abs(e.y - y) * 0.5; if (d < bd) { bd = d; best = e; } }
    return best;
  }

  // ---------- からだの うごき ----------
  physics(f, dt) {
    const prevY = f.y;
    f.vy = Math.min(f.vy + GRAV * dt, PHYS.maxFall);
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.dropT = Math.max(0, (f.dropT || 0) - dt);
    const wasGround = f.onGround;
    if (f.vy >= 0) {
      const land = landOn(f.dropT > 0 ? [] : this.platforms, f.x, prevY, f.y, 10);
      if (land !== null) { f.y = land; if (!wasGround && f.vy > 500) this.dust(f.x, f.y, 4); f.vy = 0; f.onGround = true; f.jumps = 0; f.coyote = PHYS.coyote; f.airMoves = 0; }
      else { if (wasGround) f.coyote = PHYS.coyote; f.onGround = false; f.coyote = Math.max(0, (f.coyote || 0) - dt); }
    } else { f.onGround = false; f.coyote = 0; }
    // あしば から はみでたら おちる
    if (f.onGround && f.y < GROUND - 0.5 && !this.platforms.some((p) => f.y === p.y && f.x + 10 >= p.x && f.x - 10 <= p.x + p.w)) f.onGround = false;
  }

  // ---------- てき ----------
  spawnEnemy(type, side, i) {
    const d = ENEMIES[type];
    const x = side > 0 ? this.camX + this.viewW + 30 + i * 40 : this.camX - 30 - i * 40;
    const r = type === 'crawler' ? this.rand() : 1;
    const fromTop = r < 0.25, fromWall = !fromTop && r < 0.7;
    const near = clamp(this.player.x + (this.rand() < 0.5 ? -1 : 1) * (110 + this.rand() * 150), this.camX + 50, this.camX + this.viewW - 120);
    const e = { kind: 'enemy', type, def: d, x: fromTop || fromWall ? near : x,
      y: fromTop ? -30 : GROUND, vx: 0, vy: 0, w: d.w, h: d.h, face: -side, hp: d.hp, maxHp: d.hp, state: 'walk', t: 0, cool: 0.8 + this.rand(),
      onGround: !fromTop, anim: this.rand() * 5, shieldHp: d.shieldHp || 0, spawnT: fromWall ? 0.9 : 0, spawnMax: 0.9, wallY: GROUND - 70 - this.rand() * 60, flashT: 0, hitDone: false, dropT: 0 };
    if (fromWall) e.face = this.player.x > e.x ? 1 : -1;
    if (fromTop || fromWall) this.ev('creep');
    this.enemies.push(e);
    return e;
  }
  updateEnemy(e, dt) {
    e.anim += dt; e.flashT = Math.max(0, e.flashT - dt);
    const d = e.def;
    if (e.dead) {
      e.deadT += dt;
      this.physics(e, dt);
      if (this.lock && (e.x < this.lock.l || e.x > this.lock.r)) { e.x = clamp(e.x, this.lock.l, this.lock.r); e.vx *= -0.4; }
      if ((e.onGround && e.deadT > 0.25) || e.deadT > 1.2) this.poof(e);
      return;
    }
    // かべの しみから はいでて くる あいだ
    if (e.spawnT > 0) { e.spawnT -= dt; e.vx = 0; if (e.spawnT <= 0) { e.spawnT = 0; this.ev('hiss'); this.dust(e.x, GROUND, 4); } return; }
    // ねらう あいて
    if (!e.tgt || e.tgt.hp <= 0 || e.tgt.down > 0 || this.rand() < dt * 0.4) {
      const opts = this.fighters().filter((f) => f.hp > 0 && !(f.down > 0));
      e.tgt = opts.length ? (this.rand() < 0.65 || opts.length === 1 ? this.player.hp > 0 ? this.player : opts[0] : opts[1 + Math.floor(this.rand() * (opts.length - 1))]) : this.player;
    }
    const T = e.tgt;
    const dx = T.x - e.x, adx = Math.abs(dx);
    if (e.state === 'air') {
      this.physics(e, dt);
      e.vx *= Math.pow(0.6, dt);
      if (this.lock && e.wallBounce && (e.x < this.lock.l + 10 || e.x > this.lock.r - 10)) { e.vx = -e.vx * 0.6; e.wallBounce = false; this.shake = Math.max(this.shake, 6); this.blood(e.x, e.y - 40, Math.sign(e.vx), d.blood, 6); this.ev('wall'); this.addText(e.x, e.y - 80, 'ガン！', '#fff', 16, true); this.splat(e.x < this.camX + this.viewW / 2 ? this.lock.l : this.lock.r, e.y - 40, d.blood, true); }
      if (e.onGround) { e.state = 'down'; e.t = 0.5; e.wallBounce = false; this.dust(e.x, e.y, 4); this.ev('thud'); }
      return;
    }
    this.physics(e, dt);
    if (this.lock) e.x = clamp(e.x, this.lock.l - 40, this.lock.l + this.viewW + 40);
    if (e.state === 'hurt' || e.state === 'down') {
      e.vx *= Math.pow(0.004, dt); e.t -= dt;
      if (e.t <= 0) { e.state = 'walk'; e.cool = Math.max(e.cool, 0.4); }
      return;
    }
    e.cool -= dt;
    if (e.state === 'walk') {
      e.face = dx >= 0 ? 1 : -1;
      let want = 0;
      if (e.type === 'gunner') {
        if (adx < d.range[0]) want = -e.face; else if (adx > d.range[1]) want = e.face;
        if (e.cool <= 0 && adx < 460 && Math.abs(T.y - e.y) < 120) { e.state = 'wind'; e.t = d.wind; this.ev('aim'); }
      } else {
        if (adx > d.reach * 0.8) want = e.face;
        if (e.type === 'crawler' && e.onGround && adx < 170 && adx > 60 && e.cool <= 0) { e.vy = -560; e.vx = e.face * 330; e.onGround = false; e.cool = d.cool; e.state = 'leap'; e.hitDone = false; this.ev('hiss'); return; }
        if (adx <= d.reach && Math.abs(T.y - e.y) < 60 && e.cool <= 0) { e.state = 'wind'; e.t = d.wind; e.hitDone = false; }
      }
      // じめんの てきは あしばの うえの あいてに むかって ジャンプ
      if (e.onGround && T.y < e.y - 70 && adx < 140 && this.rand() < dt * 1.5) { e.vy = -700; e.onGround = false; }
      if (e.onGround && T.y > e.y + 40 && e.y < GROUND - 1 && this.rand() < dt * 2) { e.dropT = 0.25; e.onGround = false; }
      const spd = d.speed * (e.shieldHp > 0 ? 1 : e.type === 'shield' ? 1.4 : 1);
      e.vx += (want * spd - e.vx) * Math.min(1, dt * 8);
      // かさならない
      for (const o of this.enemies) if (o !== e && !o.dead && Math.abs(o.x - e.x) < 22 && Math.abs(o.y - e.y) < 20) e.vx += (e.x < o.x ? -1 : 1) * 60;
    } else if (e.state === 'leap') {
      if (!e.hitDone) for (const f of this.fighters()) if (overlap(bodyBox(e), bodyBox(f)) && this.hurtFighter(f, d.dmg, e.face)) { e.hitDone = true; break; }
      if (e.onGround) { e.state = 'walk'; e.vx *= 0.3; }
    } else if (e.state === 'wind') {
      e.vx *= Math.pow(0.002, dt); e.t -= dt;
      if (e.t <= 0) {
        if (e.type === 'gunner') {
          const gy = e.y - 46, ty = T.y - 40;
          const ang = Math.atan2(ty - gy, Math.abs(dx));
          const s = d.shotSpeed;
          this.bullets.push({ owner: 'e', x: e.x + e.face * 26, y: gy, vx: Math.cos(ang) * s * e.face, vy: Math.sin(ang) * s, life: 2.2, dmg: d.dmg, r: 6, w: 'orb' });
          this.addPart({ kind: 'muzzle', x: e.x + e.face * 30, y: gy, life: 0.07, max: 0.07, size: 12, face: e.face, color: '#e9a0ff' });
          this.ev('eshoot'); e.cool = d.cool; e.state = 'walk';
        } else { e.state = 'attack'; e.t = 0.22; }
      }
    } else if (e.state === 'attack') {
      e.t -= dt; e.vx = e.face * 60;
      if (!e.hitDone) {
        const box = { x: e.face > 0 ? e.x : e.x - d.reach, y: e.y - e.h * 0.8, w: d.reach, h: e.h * 0.6 };
        for (const f of this.fighters()) if (f.hp > 0 && overlap(box, bodyBox(f)) && this.hurtFighter(f, d.dmg, e.face, d.weight > 2 ? 380 : 220)) { e.hitDone = true; if (d.weight > 2) this.shake = Math.max(this.shake, 8); }
      }
      if (e.t <= 0) { e.state = 'walk'; e.cool = d.cool * (0.8 + this.rand() * 0.5); }
    }
  }
  poof(e) {
    e.gone = true;
    this.smoke(e.x, e.y - e.h / 2, 9);
    this.blood(e.x, e.y - e.h / 2, 0, e.def.blood, 12);
    this.splat(e.x, GROUND, e.def.blood);
    for (let i = 0; i < 4; i++) this.addPart({ kind: 'star', x: e.x, y: e.y - e.h / 2, vx: (this.rand() - 0.5) * 300, vy: -200 - this.rand() * 200, life: 0.7, max: 0.7, size: 7, color: '#ffe46a', g: 0.6 });
    this.ev('poof');
    if (this.rand() < 0.14) this.pickups.push({ x: e.x, y: GROUND, kind: this.rand() < 0.6 ? 'heal' : 'ammo', t: 0, taken: false, vy: -320 });
  }

  // ---------- ボス ----------
  spawnBoss() {
    const bd = this.stage.boss, D = BOSSES[bd.id];
    const b = { kind: 'boss', id: bd.id, def: D, w: D.w, h: D.h, hp: D.hp, maxHp: D.hp, face: -1, vx: 0, vy: 0, t: 1.8, state: 'intro', anim: 0, stag: 0, flashT: 0, onGround: false, dropT: 99, n: 0 };
    if (bd.id === 'agent') { b.x = this.lock.r - 140; b.y = -200; }
    else { b.x = this.lock.r - 95; b.y = GROUND; b.lowered = false; b.rise = 0; this.shake = 10; }
    this.boss = b;
    this.say('ボス！', D.name, 2.2); this.ev('roar');
  }
  updateBoss(b, dt) {
    b.anim += dt; b.flashT = Math.max(0, b.flashT - dt);
    if (b.dead) { b.t += dt; if (b.t > 0.2 && this.rand() < dt * 14) { this.smoke(b.x + (this.rand() - 0.5) * b.w, GROUND - this.rand() * b.h, 2); this.blood(b.x, GROUND - this.rand() * b.h, 0, 'purple', 3); } if (b.t > 1.8 && !b.poofed) { b.poofed = true; this.smoke(b.x, GROUND - b.h / 2, 20); this.splat(b.x, GROUND, 'purple'); this.splat(b.x - 50, GROUND, 'green'); this.ev('poof'); } return; }
    if (b.id === 'agent') this.updateAgent(b, dt); else this.updateHydra(b, dt);
  }
  updateAgent(b, dt) {
    const p = this.player, D = b.def, rage = b.hp < b.maxHp * 0.5 ? 1.35 : 1;
    const T = p.hp > 0 ? p : this.allies.find((a) => !a.down) || p;
    const dx = T.x - b.x;
    this.physicsBig(b, dt);
    if (b.state === 'intro') { b.t -= dt; if (b.onGround && !b.landed) { b.landed = true; this.shake = 14; this.dust(b.x, GROUND, 10); this.ev('slam'); } if (b.t <= 0) { b.state = 'walk'; b.t = 1; } return; }
    if (b.stag > 150 && b.state !== 'down' && b.state !== 'dazed') { b.stag = 0; b.state = 'down'; b.t = 1.3; b.vx = -b.face * 160; this.addText(b.x, GROUND - 170, 'よろけた！', '#ffe14a', 20); this.ev('thud'); }
    b.stag = Math.max(0, b.stag - dt * 25);
    b.t -= dt;
    // さわると いたい
    if (b.state === 'charge') for (const f of this.fighters()) if (overlap(bodyBox(b), bodyBox(f))) this.hurtFighter(f, D.dmg, b.face, 520);
    switch (b.state) {
      case 'walk': {
        b.face = dx >= 0 ? 1 : -1;
        b.vx = Math.abs(dx) > 90 ? b.face * D.speed * rage : 0;
        if (b.t <= 0) {
          b.n++;
          const far = Math.abs(dx) > 200, r = this.rand();
          if (b.n % 4 === 0) { b.state = 'slamWind'; b.t = 0.5; }
          else if (far) { if (r < 0.55) { b.state = 'burstWind'; b.t = 0.55 / rage; b.shots = 0; } else { b.state = 'chargeWind'; b.t = 0.75 / rage; this.ev('aim'); } }
          else { if (r < 0.6) { b.state = 'punchWind'; b.t = 0.5 / rage; } else { b.state = 'slamWind'; b.t = 0.45; } }
          b.vx = 0;
        }
        break;
      }
      case 'burstWind': b.vx = 0; b.face = dx >= 0 ? 1 : -1; if (b.t <= 0) { b.state = 'burst'; b.t = 0; b.shots = 0; } break;
      case 'burst':
        if (b.t <= 0) {
          b.t = 0.13; b.shots++;
          const gy = GROUND - 56;
          this.bullets.push({ owner: 'e', x: b.x + b.face * 60, y: gy, vx: b.face * 420, vy: 0, life: 2.2, dmg: 9, r: 6, w: 'orb' });
          this.ev('eshoot');
          if (b.shots === 3) b.t = 0.55;
          if (b.shots >= (rage > 1 ? 9 : 6)) { b.state = 'walk'; b.t = 1.1 / rage; }
        }
        break;
      case 'chargeWind': b.vx = 0; b.face = dx >= 0 ? 1 : -1; if (b.t <= 0) { b.state = 'charge'; this.ev('charge'); } break;
      case 'charge':
        b.vx = b.face * 560 * rage;
        if ((b.face > 0 && b.x > this.lock.r - b.w / 2 - 4) || (b.face < 0 && b.x < this.lock.l + b.w / 2 + 4)) { b.x = clamp(b.x, this.lock.l + b.w / 2, this.lock.r - b.w / 2); b.state = 'dazed'; b.t = 1.8; b.vx = -b.face * 120; this.shake = 14; this.ev('wall'); this.addText(b.x, GROUND - 170, 'ピヨピヨ… チャンス！', '#ffe14a', 18); this.debris(b.x + b.face * 40, GROUND - 100, '#6b7280', 10); }
        break;
      case 'dazed': b.vx *= Math.pow(0.02, dt); if (b.t <= 0) { b.state = 'walk'; b.t = 0.8; } break;
      case 'down': b.vx *= Math.pow(0.02, dt); if (b.t <= 0) { b.state = 'walk'; b.t = 0.4; } break;
      case 'punchWind': b.vx = 0; if (b.t <= 0) { b.state = 'punch'; b.t = 0.25; b.hitDone = false; b.vx = b.face * 260; this.ev('whoosh'); } break;
      case 'punch': {
        b.vx *= Math.pow(0.01, dt);
        const box = { x: b.face > 0 ? b.x : b.x - 110, y: GROUND - 120, w: 110, h: 80 };
        if (!b.hitDone) for (const f of this.fighters()) if (overlap(box, bodyBox(f)) && this.hurtFighter(f, D.dmg, b.face, 460)) b.hitDone = true;
        if (b.t <= 0) { b.state = 'walk'; b.t = 0.9 / rage; }
        break;
      }
      case 'slamWind': b.vx = 0; if (b.t <= 0) { b.state = 'slam'; b.vy = -900; b.onGround = false; b.vx = clamp(dx * 1.1, -520, 520); b.face = dx >= 0 ? 1 : -1; this.ev('jump'); } break;
      case 'slam':
        if (b.onGround) {
          b.vx = 0; this.shake = 16; this.dust(b.x, GROUND, 12); this.ev('slam');
          for (const s of [-1, 1]) this.hazards.push({ kind: 'wave', x: b.x + s * 40, y: GROUND - 26, w: 34, h: 26, vx: s * 400, life: 1.5, warn: 0, dmg: 12, hit: new Set(), color: '#c06bff' });
          b.state = 'walk'; b.t = 1.2 / rage;
        }
        break;
    }
  }
  physicsBig(b, dt) {
    b.vy = Math.min(b.vy + GRAV * dt, 1400);
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y >= GROUND) { b.y = GROUND; b.vy = 0; b.onGround = true; } else b.onGround = false;
    if (this.lock) b.x = clamp(b.x, this.lock.l + b.w / 2, this.lock.r - b.w / 2);
  }
  updateHydra(b, dt) {
    const p = this.player, rage = b.hp < b.maxHp * 0.5 ? 1.3 : 1;
    b.t -= dt;
    b.rise = Math.min(1, b.rise + dt * 0.8);
    if (b.state === 'intro') { if (b.t <= 0) { b.state = 'idle'; b.t = 1.2; } return; }
    const targets = this.fighters().filter((f) => f.hp > 0 && !(f.down > 0));
    switch (b.state) {
      case 'idle':
        if (b.t <= 0) {
          b.n++;
          if (b.n % 3 === 0) { b.state = 'lower'; b.t = 3.4; b.lowered = true; this.addText(b.x - 40, GROUND - 160, 'あたまが さがった！ チャンス！', '#ffe14a', 16); this.ev('thud'); this.shake = 8; break; }
          const r = this.rand();
          if (r < 0.34) { b.state = 'sweep'; b.t = 0.9; this.hazards.push({ kind: 'sweepWarn', x: this.lock.l, y: GROUND - 34, w: this.lock.r - this.lock.l - 160, h: 34, life: 0.9, warn: 0.9, dmg: 0, hit: new Set() }); this.ev('hiss'); }
          else if (r < 0.67) {
            b.state = 'spikes'; b.t = 1.4;
            const xs = targets.map((f) => f.x);
            if (rage > 1) xs.push(p.x - 110, p.x + 110);
            for (const x of xs) this.hazards.push({ kind: 'spike', x: clamp(x, this.lock.l + 20, b.x - 120) - 24, y: GROUND - 120, w: 48, h: 120, life: 1.45, warn: 0.85, dmg: 12, hit: new Set() });
            this.ev('creep');
          } else {
            b.state = 'spit'; b.t = 1.2;
            const n = rage > 1 ? 5 : 3;
            for (let i = 0; i < n; i++) {
              const tx = p.x + (i - (n - 1) / 2) * 70, sx = b.x - 50, sy = GROUND - 150;
              const tt = 0.9 + i * 0.05, vx = (tx - sx) / tt, vy = (GROUND - sy - 0.5 * GRAV * 0.6 * tt * tt) / tt;
              this.bullets.push({ owner: 'e', x: sx, y: sy, vx, vy, grav: 0.6, life: 3, dmg: 10, r: 8, w: 'blob' });
            }
            this.ev('spit');
          }
          if (this.enemies.length < 2 && b.n % 2 === 0) { this.spawnEnemy('crawler', -1, 0); }
        }
        break;
      case 'sweep':
        if (b.t <= 0) { this.hazards.push({ kind: 'sweep', x: b.x - 120, y: GROUND - 30, w: 60, h: 30, vx: -760 * rage, life: 1.4, warn: 0, dmg: 12, hit: new Set() }); this.ev('whoosh'); b.state = 'idle'; b.t = 1.6 / rage; }
        break;
      case 'spikes': case 'spit': if (b.t <= 0) { b.state = 'idle'; b.t = 1.2 / rage; } break;
      case 'lower': if (b.t <= 0) { b.lowered = false; b.state = 'idle'; b.t = 1.0; this.ev('roar'); } break;
    }
  }
  updateHazards(dt) {
    for (const h of this.hazards) {
      h.life -= dt; if (h.warn > 0) { h.warn -= dt; if (h.warn <= 0 && h.kind === 'spike') { this.ev('spike'); this.blood(h.x + h.w / 2, GROUND - 20, 0, 'purple', 4); } continue; }
      if (h.vx) h.x += h.vx * dt;
      if (!h.dmg) continue;
      for (const f of this.fighters()) if (!h.hit.has(f) && overlap(h, bodyBox(f)) && this.hurtFighter(f, h.dmg, h.vx ? Math.sign(h.vx) : (f.x < h.x + h.w / 2 ? -1 : 1), 260)) h.hit.add(f);
    }
    this.hazards = this.hazards.filter((h) => h.life > 0);
  }

  // ---------- ひろう ----------
  updatePickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      if (k.taken) continue;
      k.t += dt;
      if (k.vy !== undefined && k.vy !== null) { k.vy += GRAV * dt; k.y += k.vy * dt; if (k.y >= GROUND) { k.y = GROUND; k.vy = null; } }
      if (p.hp > 0 && Math.abs(p.x - k.x) < 28 && p.y > k.y - 70 && p.y < k.y + 40) {
        k.taken = true; this.ev('pickup');
        if (k.kind === 'heal') { p.hp = Math.min(p.maxHp, p.hp + 35); for (const a of this.allies) if (!a.down) a.hp = Math.min(a.maxHp, a.hp + 20); this.addText(k.x, k.y - 60, 'かいふく！', '#9dff6a', 16); }
        else if (k.kind === 'ammo') { addAmmo(p.ars); this.addText(k.x, k.y - 60, 'たま ゲット！', '#ffe27a', 16); }
        else { const fresh = giveWeapon(p.ars, k.kind); this.addText(k.x, k.y - 60, fresh ? `${WEAPONS[k.kind].name}！` : 'たま ゲット！', '#ffe27a', 18); }
        this.sparks(k.x, k.y - 20, '#ffffff', 6);
      }
    }
    this.pickups = this.pickups.filter((k) => !k.taken);
  }

  // ---------- すすみ かた ----------
  updateProgress(dt) {
    const p = this.player, st = this.stage;
    if (this.go > 0) this.go -= dt;
    if (this.state === 'win') return;
    if (this.arena) {
      const A = this.arena;
      const alive = this.enemies.filter((e) => !e.dead).length;
      if (alive === 0) {
        if (A.wave < A.def.waves.length) {
          A.delay -= dt;
          if (A.delay <= 0) {
            const list = A.def.waves[A.wave++];
            list.forEach((t, i) => this.spawnEnemy(t, i % 2 === 0 ? 1 : -1, Math.floor(i / 2)));
            A.delay = 0.7;
          }
        } else if (this.enemies.length === 0) {
          this.arena = null; this.lock = null; this.go = 2.5; this.arenaIdx++; this.ev('go');
        }
      }
      return;
    }
    if (this.boss) {
      if (this.boss.dead && this.boss.t > 2.4 && this.state === 'play') {
        this.state = 'win'; this.winT = 1.6; this.say('ステージ クリア！', '', 3); this.ev('clear');
        this.result = { score: this.score, time: this.time, maxCombo: this.maxCombo, kills: this.kills, hpLeft: p.hp / p.maxHp, continues: this.continues };
      }
      return;
    }
    const nextA = st.arenas[this.arenaIdx];
    if (nextA && p.x >= nextA.x) {
      const l = clamp(nextA.x - this.viewW * 0.5, 0, st.length - this.viewW);
      this.lock = { l, r: l + this.lockW() };
      this.arena = { def: nextA, wave: 0, delay: 0.35 };
      this.ev('lock');
    } else if (!nextA && p.x >= st.boss.x - this.viewW * 0.2) {
      const l = clamp(st.boss.x - this.viewW * 0.5, 0, st.length - this.viewW);
      this.lock = { l, r: l + this.lockW() };
      this.spawnBoss();
    }
  }
  // みぎ はしは ボタンで かくれるので、たたかう はんいを すこし せまく する
  lockW() { return this.viewW >= 560 ? this.viewW - 110 : this.viewW; }
  updateCamera(dt) {
    const p = this.player;
    let target = this.lock ? this.lock.l : p.x - this.viewW * 0.38;
    target = clamp(target, 0, this.stage.length - this.viewW);
    const k = this.lock ? 6 : 10;
    this.camX += (target - this.camX) * Math.min(1, dt * k);
    if (Math.abs(target - this.camX) < 0.3) this.camX = target;
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt);
  }

  // ---------- エフェクト ----------
  addPart(o) { if (this.parts.length < MAX_PARTS) this.parts.push(o); }
  addText(x, y, text, color = '#fff', size = 16, pop = false) { if (this.texts.length < 24) this.texts.push({ x, y, text, color, size, life: pop ? 0.6 : 1.0, max: pop ? 0.6 : 1.0, pop }); }
  blood(x, y, face, kind, n) {
    const cols = BLOOD[kind] || BLOOD.green;
    for (let i = 0; i < n; i++) this.addPart({ kind: 'blood', x, y, vx: (face || (this.rand() - 0.5) * 2) * (80 + this.rand() * 260) + (this.rand() - 0.5) * 120, vy: -120 - this.rand() * 280, life: 0.7 + this.rand() * 0.4, max: 1.1, size: 2.5 + this.rand() * 4, color: cols[i % cols.length], g: 1, splat: kind });
  }
  splat(x, y, kind, wall = false) {
    const cols = BLOOD[kind] || BLOOD.green;
    this.splats.push({ x, y, r: 10 + this.rand() * 14, color: cols[Math.floor(this.rand() * 2)], life: wall ? 30 : 45, wall, seed: this.rand() });
    if (this.splats.length > MAX_SPLATS) this.splats.shift();
  }
  smoke(x, y, n) { for (let i = 0; i < n; i++) this.addPart({ kind: 'smoke', x: x + (this.rand() - 0.5) * 30, y: y + (this.rand() - 0.5) * 30, vx: (this.rand() - 0.5) * 120, vy: -30 - this.rand() * 80, life: 0.8 + this.rand() * 0.5, max: 1.3, size: 14 + this.rand() * 16, color: this.rand() < 0.5 ? '#2a2633' : '#4a4458', g: -0.05 }); }
  sparks(x, y, color, n) { for (let i = 0; i < n; i++) { const a = this.rand() * Math.PI * 2, s = 120 + this.rand() * 300; this.addPart({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25, max: 0.25, size: 2, color, g: 0.3 }); } }
  debris(x, y, color, n) { for (let i = 0; i < n; i++) this.addPart({ kind: 'chunk', x, y, vx: (this.rand() - 0.5) * 420, vy: -150 - this.rand() * 300, life: 0.9, max: 0.9, size: 4 + this.rand() * 5, color, g: 1, rot: this.rand() * 6 }); }
  dust(x, y, n) { for (let i = 0; i < n; i++) this.addPart({ kind: 'dust', x: x + (this.rand() - 0.5) * 20, y: y - 3, vx: (this.rand() - 0.5) * 200, vy: -20 - this.rand() * 50, life: 0.4, max: 0.4, size: 5 + this.rand() * 6, color: '#8a8794', g: 0 }); }
  ring(x, y, color, r = 30) { this.addPart({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: r, color, g: 0 }); }
  updateFx(dt) {
    for (const q of this.parts) {
      q.life -= dt;
      if (q.g) q.vy += GRAV * q.g * dt;
      q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt;
      if (q.kind === 'smoke') { q.vx *= 0.96; q.size += dt * 18; }
      if (q.kind === 'blood' && q.y >= GROUND && q.vy > 0) { q.life = 0; if (this.rand() < 0.3) this.splat(q.x, GROUND, q.splat); }
      if ((q.kind === 'chunk' || q.kind === 'shell') && q.y >= GROUND && q.vy > 0) { q.y = GROUND; q.vy *= -0.35; q.vx *= 0.6; }
    }
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= dt * (t.pop ? 20 : 40); }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const s of this.splats) s.life -= dt;
    this.splats = this.splats.filter((s) => s.life > 0);
  }
  drainEvents() { const e = this.events; this.events = []; return e; }
}

// ---------- テスト・デモ よう の じどう プレイ ----------
export function botInput(g, mem = {}) {
  const p = g.player;
  const inp = { ...EMPTY_INPUT };
  mem.t = (mem.t || 0) + 1;
  const foes = g.enemies.filter((e) => !e.dead);
  const boss = g.boss && !g.boss.dead && g.boss.state !== 'intro' ? g.boss : null;
  // よける
  for (const h of g.hazards) {
    const near = h.kind === 'wave' || h.kind === 'sweep' ? Math.abs(h.x + h.w / 2 - p.x) < 130 && Math.sign(h.vx) === Math.sign(p.x - h.x) : h.kind === 'spike' && p.x > h.x - 30 && p.x < h.x + h.w + 30 && h.warn > 0;
    if (near) { if (h.kind === 'spike') { inp.right = p.x < h.x + h.w / 2 ? false : true; inp.left = !inp.right; } else if (p.onGround) { inp.jump = true; inp.jumpHeld = true; } }
  }
  if (inp.left || inp.right || inp.jump) return inp;
  if (boss && boss.id === 'agent' && (boss.state === 'burst' || boss.state === 'burstWind') && p.onGround && mem.t % 30 === 0) { inp.jump = true; inp.jumpHeld = true; }
  if (boss && boss.id === 'agent' && boss.state === 'chargeWind' && p.onGround) { inp.jump = true; inp.jumpHeld = true; }
  let tgt = null, bd = 1e9;
  for (const e of foes) { const d = Math.abs(e.x - p.x); if (d < bd) { bd = d; tgt = e; } }
  if (!tgt && boss) { tgt = boss; bd = Math.abs(boss.x - p.x); }
  if (!tgt) { inp.right = true; if (g.go > 0 || mem.t % 90 < 3) inp.jumpHeld = false; return inp; }
  const dx = tgt.x - p.x, reach = tgt.kind === 'boss' ? tgt.w / 2 + 40 : 50;
  if (p.onGround && p.y < GROUND - 1 && tgt.y >= GROUND - 1 && mem.t % 20 === 0) { inp.down = true; inp.jump = true; return inp; }
  if (Math.abs(dx) > reach) {
    if (dx > 0) inp.right = true; else inp.left = true;
    if (Math.abs(dx) < 380 && (tgt.kind !== 'boss' || tgt.id !== 'hydra' || tgt.lowered)) { inp.shoot = Math.abs(dx) > 120; if (inp.shoot && Math.abs(dx) > 250) { inp.left = inp.right = false; p.face = Math.sign(dx); } }
    if (tgt.kind === 'boss' && tgt.id === 'hydra' && !tgt.lowered) { inp.shoot = true; }
  } else {
    if ((dx > 0) !== (p.face > 0)) { if (dx > 0) inp.right = true; else inp.left = true; }
    if (mem.t % 7 === 0) { if ((mem.t / 7) % 4 < 3) inp.kick = true; else inp.punch = true; }
  }
  if (p.ars.cur === 'pistol' && Object.keys(p.ars.guns).length > 1 && mem.t % 120 === 0) inp.swap = true;
  return inp;
}
