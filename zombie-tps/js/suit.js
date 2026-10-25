// v0.10.0: パワードスーツ（45びょう だけ とんでもなく つよい）
// マップの どこかに 1つ。さわると きる → マシンキャノン・かえんほうしゃ・キャノン・ミサイル（v0.11.0）・パンチ。
// じかんが きれると ぬいで、すこしの あいだ むてき。つかったら 3ウェーブ あとに べつの ばしょへ また でる。
import * as THREE from '../vendor/three.module.min.js';
import {
  SUIT, SUIT_WEAPONS, SUIT_ORDER, wearSuit, tickSuit, suitClockRuns, tickGrace, routeSuitDamage, suitNextWave, pickSuitSpot, suitTouched,
  flameHits, punchTargets, punchLaunch, burnTick, groundHeight, edgeArrow, castShot, castPierce, aabbNormal, WEAPON_ORDER,
} from './rules.js?v=19';
import { makePowerSuit, makeSuitShell, SUIT_CHUNKS } from './models.js?v=19';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const CHAR_MAT = new THREE.MeshLambertMaterial({ color: 0x3b3430 }); // こげた ゾンビ（ちは でない）

export const SuitMixin = {
  initSuit() {
    this.suitM = makePowerSuit(this.fxTex?.glow);
    this.suitM.root.visible = false;
    this.scene.add(this.suitM.root);
    this.suit = null; this.suitPick = null; this.suitGraceT = 0; this.suitNext = 1; this.suitCamK = 0;
    this.shells = []; this.shellPool = [];
  },
  // ラウンドの はじめ／ぬいだ あと: ぜんぶ けす
  endSuit() {
    this.suit = null; this.suitPick = null; this.suitGraceT = 0; this.suitNext = 1; this.punchT = 0;
    if (this.suitM) this.suitM.root.visible = false;
    for (const s of this.shells || []) this.releaseShell(s);
    if (this.shells) this.shells.length = 0;
    if (this.suitHudOn) { this.suitHudOn = false; this.hud.suit?.(null); }
  },
  // あるいて いける ばしょに おく（ロボの ばしょ とは はなす）
  placeSuit(r1 = Math.random()) {
    const s = this.gk && this.map.gk ? this.gkSpotFrom() : this.map.playerStart, sy = s.y || 0; // v0.16.1: ガンキックは いまの へや・v0.17.0: たかい ゆか
    this.nav.update(s.x, sy, s.z);
    let cells = this.nav.openCells(this.half - 3);
    const same = cells.filter((c) => Math.abs((c[2] || 0) - sy) < 0.5);
    if (same.length) cells = same;
    if (this.gk && this.map.gk) cells = this.gkSpotFilter(cells); // v0.16.1: しまった へやには おかない
    const A = this.army; // v0.14.0: アーミーロボとも かさならない
    if (A) { const f = cells.filter((c) => Math.hypot(c[0] - A.x, c[1] - A.z) > 4); if (f.length) cells = f; }
    if (!cells.length) return null;
    const [x, z, cy] = pickSuitSpot(cells, s.x, s.z, r1, this.robot);
    const y = groundHeight(x, z, 0.3, (cy || 0) + 0.6, this.pCol);
    const m = this.suitM;
    m.root.visible = true; m.root.scale.setScalar(SUIT.scale);
    m.marker.visible = true; if (m.glow) m.glow.visible = true;
    const yaw = Math.atan2(-(s.x - x), -(s.z - z));
    this.suitPick = { x, y, z, yaw, t: 0 };
    m.root.position.set(x, y, z); m.root.rotation.y = yaw;
    this.poseSuitIdle(0);
    // なおす（プレイヤーの いちに もどす）
    if (this.state === 'play') this.nav.update(this.pos.x, this.pFloor ?? this.pos.y, this.pos.z);
    return this.suitPick;
  },
  poseSuitIdle(t) {
    const m = this.suitM;
    m.inner.position.y = -0.12; m.inner.rotation.set(0.04, 0, 0);
    for (const l of m.legs) l.rotation.x = 0;
    m.legs[0].rotation.x = 0.25; m.legs[1].rotation.x = -0.1;
    m.arms[0].rotation.x = -1.25; m.arms[1].rotation.x = -1.25;
    m.head.rotation.y = Math.sin(t * 0.8) * 0.4;
  },
  wearSuitNow() {
    const p = this.suitPick; if (!p) return;
    this.suit = wearSuit(); this.suitPick = null; this.suitWave = this.wave;
    const m = this.suitM; m.marker.visible = false; if (m.glow) m.glow.visible = false;
    this.burnT = 0; this.zapT = 0; this.pk.set(0, 0, 0);
    this.fx.burst(_a.set(p.x, p.y + 1.6, p.z), 30, { color: 0xffb050, color2: 0xffffff, speed: 3, up: 3, size: 0.12, life: 0.8, gravity: 2 });
    this.hud.banner('パワードスーツ！', `${SUIT.time}びょう だけ とんでもなく つよい！`);
    this.hud.kill('1〜4 で ぶきを かえられるよ');
    this.sfx.robotOn?.(); this.sfx.slam?.(0.6);
    this.shake = Math.max(this.shake, 0.3);
    this.pushHud(true);
  },
  ejectSuit() {
    if (!this.suit) return;
    this.suit = null; this.suitGraceT = SUIT.grace; this.punchT = 0;
    this.suitNext = suitNextWave(this.suitWave || this.wave);
    const P = this.pos;
    this.fx.shatter(P.x, P.y, P.z, 1.6, this.yaw, SUIT_CHUNKS, { vx: 0, vy: 4, vz: 0 }, 22);
    this.fx.poof(_a.set(P.x, P.y + 1.4, P.z), 1.6);
    this.suitM.root.visible = false;
    this.vy = 6; this.onGround = false;
    this.hud.banner('スーツの じかん おわり！', `また ${SUIT.every}ウェーブ あとに どこかに でるよ`);
    this.sfx.robotBreak?.();
    this.pushHud(true);
  },
  // ダメージを うけた とき（damagePlayer の まえ）。true なら プレイヤーは へらない
  suitBlocksDamage(d) {
    if (!this.suit && !(this.suitGraceT > 0)) return false;
    const r = routeSuitDamage(this.suit, this.suitGraceT, d);
    if (r.armor && Math.random() < 0.3) this.sfx.clink?.(0.3);
    if (r.eject) this.ejectSuit();
    return true;
  },
  // ぶきの きりかえ・ジャンプ（スーツの とき）。しょりしたら true
  suitEvent(ev) {
    const s = this.suit; if (!s) return false;
    if (ev === 'reload') return true;
    if (ev === 'jump') { if (this.onGround) { this.vy = SUIT.jump; this.onGround = false; } return true; }
    if (ev.startsWith('ws:')) { const nid = SUIT_ORDER[+ev.slice(3)]; if (nid) this.switchSuitWeapon(nid); return true; } // v0.15.0: すうじ キー
    if (ev.startsWith('w:')) {
      const id = ev.slice(2);
      const nid = SUIT_WEAPONS[id] ? id : SUIT_ORDER[WEAPON_ORDER.indexOf(id)];
      if (nid) this.switchSuitWeapon(nid);
      return true;
    }
    if (ev === 'next' || ev === 'prev' || ev === 'swap') {
      const i = SUIT_ORDER.indexOf(s.weapon), n = SUIT_ORDER.length;
      this.switchSuitWeapon(SUIT_ORDER[(i + (ev === 'prev' ? n - 1 : 1)) % n]);
      return true;
    }
    return false;
  },
  switchSuitWeapon(id) {
    const s = this.suit; if (!s || !SUIT_WEAPONS[id] || s.weapon === id) return;
    s.weapon = id; s.cd = Math.max(s.cd, 0.12); this.sfx.swap(); this.pushHud(true);
  },

  updateSuit(dt) {
    const frozen = !suitClockRuns(this.interT); // v0.14.0: ウェーブの あいだは とまる
    this.suitFrozen = frozen;
    this.suitGraceT = tickGrace(this.suitGraceT, dt, frozen);
    // つぎの スーツ
    if (!this.suit && !this.suitPick && this.state === 'play' && this.wave >= this.suitNext && this.wave > 0) {
      if (this.placeSuit()) { this.hud.kill('パワードスーツが どこかに あらわれた！', true); this.sfx.robotOn?.(); }
    }
    const m = this.suitM;
    if (this.suitPick) {
      const p = this.suitPick; p.t += dt;
      const k = 0.5 + 0.5 * Math.sin(p.t * 4);
      m.ring.scale.setScalar(1 + k * 0.15); m.ring.material.opacity = 0.5 + k * 0.4; m.beam.material.opacity = 0.18 + k * 0.2;
      if (m.glow) m.glow.material.opacity = 0.6 + k * 0.4;
      this.poseSuitIdle(p.t);
      if (this.state === 'play' && suitTouched(this.pos.x - p.x, this.pos.z - p.z, this.pos.y - p.y)) this.wearSuitNow();
    }
    if (this.suit) {
      if (tickSuit(this.suit, dt, frozen) === 'eject') this.ejectSuit();
      else this.poseSuit(dt);
    }
    this.updateBurning(dt);
    this.updateShells(dt);
  },

  // からだを プレイヤーに あわせる
  poseSuit(dt) {
    const m = this.suitM, s = this.suit;
    m.root.visible = true;
    m.root.position.copy(this.pos); m.root.rotation.y = this.yaw;
    m.inner.position.y = 0; m.inner.rotation.set(0, 0, 0);
    const sw = Math.sin(this.walkPhase * 0.8) * this.moveAmt * 0.55;
    m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
    m.inner.position.y = Math.abs(Math.cos(this.walkPhase * 0.8)) * this.moveAmt * 0.06;
    const pitch = this.pitch;
    m.head.rotation.set(pitch * 0.5, 0, 0);
    m.cannon.rotation.x = pitch;
    m.pod.rotation.x = pitch * 0.7;
    const pt = this.punchT > 0 ? this.punchT / 0.22 : 0;
    // みぎうで: キャノンじゅう（ねらう）・ひだりうで: パンチ／ほのお
    m.arms[1].rotation.x = pitch * 0.9;
    const ext = pt > 0 ? Math.sin(pt * Math.PI) : 0;
    m.arms[0].rotation.x = pitch * 0.9;
    m.arms[0].position.z = -ext * 0.85; m.arms[0].rotation.y = ext * 0.25;
    m.body.rotation.y = -ext * 0.3;
    if (this.punchT > 0) this.punchT = Math.max(0, this.punchT - dt);
    m.gatling.rotation.z += (s.spin || 0) * 40 * dt;
    s.spin = Math.max(0, (s.spin || 0) - dt * 2.5);
    m.pilot.visible = s.weapon === 'flamer';
    m.cockpit.material.emissive.setHex(s.t < 10 && Math.sin(s.t * 12) > 0 ? 0x7a2a10 : 0x1d5a78);
  },

  // ---- うつ ----
  updateSuitFire(dt, held) {
    const s = this.suit; if (!s) return;
    const W = SUIT_WEAPONS[s.weapon];
    if (s.weapon === 'mcannon') {
      let n = 0;
      if (held) while (s.cd <= 0 && n < 2) { s.cd += W.interval; n++; this.suitShoot(W); }
      if (!held && s.cd < 0) s.cd = 0;
    } else if (s.weapon === 'flamer') {
      if (held) this.suitFlame(dt, W); else s.flameT = 0;
    } else if (s.weapon === 'cannon') {
      if (held && s.cd <= 0) { s.cd = W.interval; this.suitCannon(W); }
    } else if (s.weapon === 'missile') {
      if (held && s.cd <= 0) { s.cd = W.interval; this.suitMissiles(W); }
    }
  },
  // v0.15.0: なぐる ボタン（V）→ スーツの パンチ。いまの ぶきは そのまま（うちながら なぐれる）
  suitMelee(held) {
    const s = this.suit; if (!s || !held || this.state !== 'play') return;
    if (!(s.punchCd > 0)) { const W = SUIT_WEAPONS.punch; s.punchCd = W.interval; this.suitPunch(W); }
  },
  suitAimRay() {
    const cam = this.camera;
    const d = _a.set(0, 0, -1).applyQuaternion(this.camBaseQ).normalize();
    const o = _b.copy(cam.position).addScaledVector(d, Math.max(0, _c.copy(this.shoulder).sub(cam.position).dot(d)));
    return { o, d };
  },
  // ねらいの おてつだい: まんなかの ちかくの ゾンビ（かべの むこうは だめ）へ むける
  suitAssist(o, d, range) {
    const h = castShot(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, this.sCol, range);
    if (h.kind === 'zombie') return d;
    let best = null, ba = SUIT.assist;
    for (let i = 0; i < this.zombies.length; i++) {
      const z = this.zombies[i]; if (!z.alive || z.demo || z.fly) continue;
      const tx = z.x - o.x, ty = z.y + 1.0 * z.scale - o.y, tz = z.z - o.z, l = Math.hypot(tx, ty, tz);
      if (l > range || l < 0.5) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (tx * d.x + ty * d.y + tz * d.z) / l)));
      if (ang >= ba) continue;
      const c = castShot(o.x, o.y, o.z, tx / l, ty / l, tz / l, this.zombies, this.sCol, l + 1);
      if (c.kind !== 'zombie' || c.index !== i) continue;
      ba = ang; best = [tx / l, ty / l, tz / l];
    }
    return best ? d.set(best[0], best[1], best[2]) : d;
  },
  suitShoot(W) {
    const { o, d: d0 } = this.suitAimRay(), m = this.suitM, s = this.suit;
    const d = this.suitAssist(o, d0, W.range);
    const muzzle = m.gunMuzzle.getWorldPosition(_e);
    const r = Math.sqrt(Math.random()) * W.spread, a = Math.random() * Math.PI * 2;
    const up = _c.set(0, 1, 0).applyQuaternion(this.camBaseQ), rt = _d.set(1, 0, 0).applyQuaternion(this.camBaseQ);
    const dir = d.clone().addScaledVector(rt, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    const pr = castPierce(o.x, o.y, o.z, dir.x, dir.y, dir.z, this.zombies, this.sCol, W.range, W.pierce, W.pierceMul);
    const hit = pr.end, hp = new THREE.Vector3(hit.x, hit.y, hit.z);
    this.fx.tracer(muzzle, hp);
    let killed = 0, any = false;
    for (const zh of pr.hits) {
      const z = this.zombies[zh.index]; if (!z) continue;
      const zp = new THREE.Vector3(zh.x, zh.y, zh.z);
      this.fx.greenHit(zp, dir, zh.head);
      any = true;
      if (this.hitZombie(z, W.dmg * zh.mul * (zh.head ? 1.6 : 1), zh.head, zp, dir, { knock: W.knock })) killed++;
    }
    if (hit.kind === 'wall') {
      const nn = aabbNormal(hit.x, hit.y, hit.z, this.sCol[hit.index]);
      const nv = new THREE.Vector3(nn.x, nn.y, nn.z);
      this.fx.dust(hp, nv); this.fx.hole(hp, nv);
      const vb = this.sCol[hit.index];
      if (vb && vb.veh != null) this.hitVehicle(vb.veh, W.dmg, hp);
    } else if (hit.kind === 'ground') { this.fx.dust(hp, UP); this.fx.hole(hp, UP); }
    if (killed >= 2) this.multiKill(killed);
    if (any) { this.hud.hitmarker(false); this.sfx.hit(false); }
    this.fx.muzzle(m.gunMuzzle, 1.7);
    this.sfx.shot('minigun');
    s.spin = 1;
    this.shake = Math.min(0.3, this.shake + 0.04);
    this.recoilP += 0.004;
  },
  suitFlame(dt, W) {
    const s = this.suit, m = this.suitM;
    const fxv = -Math.sin(this.yaw), fzv = -Math.cos(this.yaw);
    const nz = m.flameMuzzle.getWorldPosition(_e);
    // ほのおの つぶ（かずを きめて かるく）
    s.emitT = (s.emitT || 0) - dt;
    const room = this.fx.maxP - this.fx.parts.length;
    while (s.emitT <= 0) {
      s.emitT += 1 / 40;
      if (room < 24) continue;
      const dir = _d.set(0, 0, -1).applyQuaternion(this.camBaseQ);
      dir.y = Math.max(-0.3, dir.y + 0.04);
      this.fx.burst(nz, 2, { color: 0xffa020, color2: 0xffe060, speed: 14, up: 0.8, size: 0.45, life: SUIT.maxFlames / 80, gravity: -3, dir, spread: 0.08, grow: 2.4, drag: 1.6 });
    }
    s.flameT = (s.flameT || 0) - dt;
    if (s.flameT <= 0) {
      s.flameT = W.tick;
      const dir = new THREE.Vector3(fxv, 0, fzv);
      let killed = 0;
      for (const { i } of flameHits(this.pos.x, this.pos.z, fxv, fzv, this.zombies)) {
        const z = this.zombies[i]; if (!z || !z.alive || z.demo) continue;
        if (Math.abs(z.y - this.pos.y) > 3) continue;
        z.burnT = W.burn; z.burnDps = W.burnDps;
        if (this.hitZombie(z, W.dps * W.tick, false, _c.set(z.x, z.y + 1, z.z), dir, { fire: true, knock: 0.4 })) killed++;
      }
      if (killed >= 2) this.multiKill(killed);
      if (Math.random() < 0.5) this.sfx.fire?.(0.25);
    }
  },
  // もえている ゾンビ（すこしずつ へる・ほのおの つぶは すこし だけ）
  updateBurning(dt) {
    let fxN = 0;
    for (const z of this.zombies) {
      if (!z.alive || !(z.burnT > 0)) continue;
      z.burnAcc = (z.burnAcc || 0) + burnTick(z, dt, z.burnDps || undefined); // v0.15.0: ほのおの しゅるいで ちがう
      if (fxN < 8 && Math.random() < 0.35) { fxN++; this.fx.burst(_c.set(z.x + (Math.random() - 0.5) * 0.4, z.y + (0.5 + Math.random()) * z.scale, z.z), 1, { color: 0xff8a20, color2: 0xffe070, speed: 0.6, up: 1.8, size: 0.26, life: 0.45, gravity: -3, grow: 1.2 }); }
      if (z.burnAcc >= 6 || z.burnT <= 0) {
        const d = z.burnAcc; z.burnAcc = 0;
        this.hitZombie(z, d, false, _c.set(z.x, z.y + 1, z.z), _d.set(0, 0, 1), { fire: true });
      }
    }
  },
  // ほのおで たおれた: こげて たおれる（ちは でない）
  charZombie(z) {
    for (const mm of z.model.meshes) mm.material = CHAR_MAT;
    z.flashOn = false; z.flash = 0;
    this.fx.burst(_c.set(z.x, z.y + 1 * z.scale, z.z), 6, { color: 0x6b625a, color2: 0xff9a30, speed: 1, up: 2, size: 0.2, life: 0.7, gravity: -2 });
  },
  suitCannon(W) {
    const { o, d: d0 } = this.suitAimRay(), m = this.suitM;
    const d = this.suitAssist(o, d0, 60);
    const hit = castShot(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, this.sCol, 120);
    const start = m.cannonMuzzle.getWorldPosition(new THREE.Vector3());
    const aimP = new THREE.Vector3(hit.x, hit.y, hit.z);
    const fdir = aimP.sub(start), dist = fdir.length();
    if (dist < 3 || fdir.dot(d) < 0) fdir.copy(d);
    fdir.normalize();
    let sh = this.shellPool.pop();
    if (!sh) sh = { mdl: makeSuitShell(), pos: new THREE.Vector3(), vel: new THREE.Vector3() };
    this.scene.add(sh.mdl.group); sh.mdl.group.visible = true;
    sh.pos.copy(start); sh.vel.copy(fdir).multiplyScalar(W.speed); sh.vel.y += 0.5 * W.gravity * Math.min(1.5, Math.max(3, dist) / W.speed); sh.life = W.life; sh.trailT = 0;
    sh.mdl.group.position.copy(start);
    this.shells.push(sh);
    this.fx.muzzle(m.cannonMuzzle, 2.4);
    this.fx.burst(start, 8, { color: 0xbdb3a0, color2: 0xe8e0d0, speed: 1.5, up: 1, size: 0.25, life: 0.6, gravity: -1 });
    this.sfx.rocket();
    this.shake = Math.min(0.5, this.shake + 0.25);
    this.recoilP += 0.03;
  },
  // v0.11.0: かたの ミサイル: 6ぱつ（まえの ちかい ゾンビへ ホーミング）
  suitMissiles(W) {
    const { o, d: d0 } = this.suitAimRay(), m = this.suitM;
    const d = this.suitAssist(o, d0, 60);
    const hit = castShot(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, this.sCol, 120);
    const start = m.podMuzzle.getWorldPosition(new THREE.Vector3());
    const fdir = new THREE.Vector3(hit.x, hit.y, hit.z).sub(start);
    if (fdir.length() < 3 || fdir.dot(d) < 0) fdir.copy(d);
    fdir.normalize();
    this.launchSalvo(start, fdir, W, hit);
    this.fx.burst(start, 6, { color: 0xbdb3a0, color2: 0xe8e0d0, speed: 1.2, up: 1.2, size: 0.25, life: 0.6, gravity: -1 });
    this.sfx.rocket();
    this.shake = Math.min(0.4, this.shake + 0.12);
  },
  releaseShell(s) { this.scene.remove(s.mdl.group); this.shellPool.push(s); },
  updateShells(dt) {
    const W = SUIT_WEAPONS.cannon;
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= dt;
      s.vel.y -= W.gravity * dt;
      const sp = s.vel.length(), step = sp * dt;
      const dx = s.vel.x / sp, dy = s.vel.y / sp, dz = s.vel.z / sp;
      const hit = castShot(s.pos.x, s.pos.y, s.pos.z, dx, dy, dz, this.zombies, this.sCol, step);
      if (hit.kind !== 'none' || s.life <= 0) {
        const p = new THREE.Vector3(hit.x - dx * 0.2, Math.max(0.1, hit.y - dy * 0.2), hit.z - dz * 0.2);
        this.explode(p, W); // ゾンビ だけ（プレイヤー・なかまは だいじょうぶ）
        this.shells.splice(i, 1); this.releaseShell(s);
        continue;
      }
      s.pos.addScaledVector(s.vel, dt);
      s.mdl.group.position.copy(s.pos);
      s.mdl.group.quaternion.setFromUnitVectors(_a.set(0, 0, -1), _b.copy(s.vel).normalize());
      s.mdl.flame.scale.setScalar(0.7 + Math.random() * 0.7);
      s.trailT -= dt;
      if (s.trailT <= 0) { s.trailT = 0.03; this.fx.trail(_c.copy(s.pos), _d.copy(s.vel).multiplyScalar(-0.03 / sp)); }
    }
  },
  // パンチ: あたった ゾンビは がめんの そとまで ふっとぶ（アイテムは あたった ばしょに おちる）
  suitPunch(W) {
    this.punchT = 0.22;
    const fxv = -Math.sin(this.yaw), fzv = -Math.cos(this.yaw);
    const px = this.pos.x + fxv * 0.6, pz = this.pos.z + fzv * 0.6;
    const list = punchTargets(px, pz, fxv, fzv, this.zombies.map((z) => (z.alive && !z.demo && Math.abs(z.y - this.pos.y) < 2.5 ? z : null)), W);
    const dir = new THREE.Vector3(fxv, 0.2, fzv);
    let killed = 0;
    for (const { i } of list) {
      const z = this.zombies[i];
      const hitAt = { x: z.x, y: z.y, z: z.z };
      const pos = new THREE.Vector3(z.x, z.y + 1.1 * z.scale, z.z);
      this.fx.burst(pos, 14, { color: 0xffffff, color2: 0xffe080, speed: 5, up: 2, size: 0.1, life: 0.3, gravity: 4 });
      if (z.kind === 'boss') {
        this.hitZombie(z, W.bossDmg, false, pos, dir, { knock: 4, dropAt: hitAt });
        if (z.alive) { z.kvx += fxv * W.bossKnock; z.kvz += fzv * W.bossKnock; z.stagger = Math.max(z.stagger, 0.8); }
        continue;
      }
      const v = punchLaunch(fxv, fzv, Math.random(), W);
      if (this.hitZombie(z, W.dmg, false, pos, dir, { knock: 2, punch: v, dropAt: hitAt })) killed++;
      else { z.kvx += fxv * W.bossKnock; z.kvz += fzv * W.bossKnock; z.vy = Math.max(z.vy, 6); z.y = Math.max(z.y, 0.02); z.stagger = Math.max(z.stagger, 1); }
    }
    if (killed >= 2) this.multiKill(killed);
    if (list.length) { this.hitstop = 0.06; this.shake = Math.max(this.shake, 0.35); this.sfx.slam?.(0.7); this.hud.hitmarker(true); this.sfx.hit(true); }
    else this.sfx.thud?.();
  },
  // hitZombie から: パンチで たおした ゾンビを とばす。とべたら true
  punchFly(z, v) {
    let n = 0; for (const q of this.zombies) if (q.fly && q.fly.ghost) n++;
    if (n >= SUIT.maxFly) return false;
    this.launchZombie(z, v);
    Object.assign(z.fly, { vx: v.vx, vy: v.vy, vz: v.vz, ghost: true });
    return true;
  },
  // とんでいる（かべも ぬける → がめんの そとで キラーン）
  updateGhostFly(z, dt) {
    const f = z.fly, m = z.model;
    f.vy -= SUIT.flyG * dt;
    z.x += f.vx * dt; z.z += f.vz * dt; z.y += f.vy * dt;
    const rot = m.inner.rotation;
    rot.x += f.sx * 1.6 * dt; rot.z += f.sz * dt; z.yaw += f.sy * dt;
    const fl = Math.sin(f.t * 22) * 0.9;
    m.legs[0].rotation.x = fl; m.legs[1].rotation.x = -fl;
    m.arms[0].rotation.x = -1.6 + fl * 0.6; m.arms[1].rotation.x = -1.6 - fl * 0.6;
    m.root.position.set(z.x, z.y, z.z); m.root.rotation.y = z.yaw;
    if (f.t > SUIT.flyTime || (f.vy < 0 && z.y < -1)) {
      this.fx.burst(_c.set(z.x, z.y, z.z), 10, { color: 0xfff2a0, color2: 0xffffff, speed: 3, up: 1, size: 0.3, life: 0.5, gravity: 0 }); // キラーン
      z.fly = null; z.deadT = 0.56; z.poofed = true;
    }
  },

  // ---- HUD ----
  updateSuitHud() {
    const playing = this.state === 'play';
    if (!playing || (!this.suit && !this.suitPick)) { if (this.suitHudOn) { this.suitHudOn = false; this.hud.suit?.(null); } return; }
    this.suitHudOn = true;
    if (this.suit) {
      const s = this.suit, W = SUIT_WEAPONS[s.weapon];
      this.hud.suit?.({ mode: 'ride', t: s.t, frozen: !!this.suitFrozen, frac: s.t / SUIT.time, armor: s.armor / SUIT.armor, weapon: s.weapon,
        ready: W.interval ? 1 - Math.min(1, s.cd / W.interval) : 1 });
      return;
    }
    const p = this.suitPick;
    const v = _a.set(p.x, p.y + 3.4, p.z).project(this.camera);
    const e = edgeArrow(v.x, v.y, v.z > 1);
    this.hud.suit?.({ mode: 'pick', onScreen: e.onScreen, x: e.x, y: e.y, ang: e.ang });
  },
};
