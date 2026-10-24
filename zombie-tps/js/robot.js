// v0.7.0: けいさつロボ（なかま）
// マップに 1たい。さわると なかまに なって、プレイヤーの ひだり うしろに ついて、
// うしろ・よこの ゾンビを ライフルで うつ。HP が 0 に なると ブロックに くだける。
import * as THREE from '../vendor/three.module.min.js';
import {
  ROBOT, robotFollowPoint, pickRobotTarget, pickRobotSpot, robotTouched, shouldTeleportRobot, damageRobot,
  castShot, collideCircle, groundHeight, edgeArrow,
} from './rules.js?v=9';
import { makePoliceRobot, ROBOT_CHUNKS } from './models.js?v=9';

const PLAYER_R = 0.35;
const _o = new THREE.Vector3(), _t = new THREE.Vector3(), _m = new THREE.Vector3(), _p = new THREE.Vector3();
const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export const RobotMixin = {
  initRobot() {
    this.robotM = makePoliceRobot(this.fxTex?.glow);
    this.robotM.root.visible = false;
    this.scene.add(this.robotM.root);
    this.robot = null;
  },
  // ラウンドの はじめに まだ うごいていない ロボを おく
  spawnRobot(r1 = Math.random()) {
    this.endRobot();
    const s = this.map.playerStart, sy = 0;
    this.nav.update(s.x, sy, s.z);
    let cells = this.nav.openCells(this.half - 3);
    const same = cells.filter((c) => Math.abs((c[2] || 0) - sy) < 0.5); // おなじ たかさ（みつけやすい）
    if (same.length) cells = same;
    if (!cells.length) return null;
    const [x, z, cy] = pickRobotSpot(cells, s.x, s.z, r1);
    const y = groundHeight(x, z, 0.3, (cy || 0) + 0.6, this.pCol);
    const m = this.robotM;
    m.root.visible = true; m.root.scale.setScalar(ROBOT.scale);
    m.marker.visible = true; if (m.glow) m.glow.visible = true;
    const yaw = Math.atan2(-(s.x - x), -(s.z - z)); // スタートの ほうを むく
    this.robot = { x, y, z, yaw, vy: 0, hp: ROBOT.hp, state: 'idle', t: 0, fireT: 0.6, aimT: 0, target: -1, stuckT: 0, hurtT: 0, phase: 0, moving: 0, onScreen: false, shots: 0, kills: 0 };
    m.root.position.set(x, y, z); m.root.rotation.y = yaw;
    return this.robot;
  },
  endRobot() {
    this.robot = null;
    if (this.robotM) this.robotM.root.visible = false;
    this.robotHudOn && this.hud.robot?.(null); this.robotHudOn = false;
  },
  activateRobot() {
    const r = this.robot; if (!r || r.state !== 'idle') return;
    r.state = 'on'; r.t = 0; r.fireT = 0.5;
    const m = this.robotM; m.marker.visible = false; if (m.glow) m.glow.visible = false;
    this.fx.burst(_p.set(r.x, r.y + 1.2, r.z), 26, { color: 0x7cc8ff, color2: 0xffffff, speed: 2.4, up: 2.4, size: 0.09, life: 0.8, gravity: 2 });
    this.hud.banner('けいさつロボが なかまに なった！', 'うしろを まもって くれるよ');
    this.hud.kill('けいさつロボ「まかせて！」');
    this.sfx.robotOn?.();
    this.pushHud(true);
  },
  hurtRobot(d) {
    const r = this.robot; if (!r || r.state !== 'on') return;
    r.hurtT = 0.2;
    if (damageRobot(r, d)) this.breakRobot();
    else if (Math.random() < 0.5) this.sfx.clink?.(0.25);
  },
  breakRobot() {
    const r = this.robot; if (!r) return;
    const m = this.robotM;
    this.fx.shatter(r.x, r.y, r.z, 1, r.yaw, ROBOT_CHUNKS, { vx: 0, vy: 3, vz: 0 }, 22);
    this.fx.burst(_p.set(r.x, r.y + 1.1, r.z), 18, { color: 0xffe080, color2: 0x9ad6ff, speed: 4, up: 2.5, size: 0.06, life: 0.5, gravity: 8 });
    this.fx.poof(_p.set(r.x, r.y + 0.8, r.z), 1);
    this.sfx.robotBreak?.();
    this.hud.banner('けいさつロボが こわれちゃった…', 'ここまで まもって くれて ありがとう！');
    this.hud.kill('けいさつロボ「あとは たのんだ…」');
    for (const z of this.zombies) if (z.botT) z.botT = false;
    m.root.visible = false;
    this.robot = null;
    this.hud.robot?.(null); this.robotHudOn = false;
  },
  // ワープする ばしょ（プレイヤーの うしろ・よこ。カメラの まえには でない）
  robotWarpSpot() {
    const yaw = this.yaw, PF = this.pFloor ?? this.pos.y;
    const opts = [robotFollowPoint(this.pos.x, this.pos.z, yaw), robotFollowPoint(this.pos.x, this.pos.z, yaw, 1.6, 0.6),
      robotFollowPoint(this.pos.x, this.pos.z, yaw, 1.2, -1.2), robotFollowPoint(this.pos.x, this.pos.z, yaw, 0, 1.4)];
    for (const p of opts) {
      if (Math.abs(p.x) > this.half - 1 || Math.abs(p.z) > this.half - 1) continue;
      if (!this.nav.free(p.x, PF, p.z)) continue;
      const gy = groundHeight(p.x, p.z, 0.3, PF + 0.35, this.pCol);
      if (Math.abs(gy - PF) > 0.35) continue;
      const c = collideCircle(p.x, p.z, 0.32, gy, this.pCol);
      if (Math.hypot(c.x - p.x, c.z - p.z) > 0.05) continue;
      return { x: p.x, z: p.z, y: gy };
    }
    return null;
  },
  teleportRobot() {
    const r = this.robot, p = this.robotWarpSpot();
    if (!p) return false;
    this.fx.poof(_p.set(r.x, r.y + 0.8, r.z), 0.8);
    r.x = p.x; r.z = p.z; r.y = p.y; r.vy = 0; r.stuckT = 0; r.warps = (r.warps || 0) + 1;
    this.fx.burst(_p.set(r.x, r.y + 1, r.z), 12, { color: 0x7cc8ff, color2: 0xffffff, speed: 2, up: 1.5, size: 0.07, life: 0.5, gravity: 2 });
    return true;
  },
  robotCanSee(z) {
    const r = this.robot;
    if (Math.abs(z.y - r.y) > 3.2) return false;
    const ox = r.x, oy = r.y + 1.1, oz = r.z;
    const tx = z.x, ty = z.y + (z.kind === 'crawler' ? 0.35 : 1.0 * z.scale), tz = z.z;
    let dx = tx - ox, dy = ty - oy, dz = tz - oz; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const hit = castShot(ox, oy, oz, dx, dy, dz, this.zombies, this.sCol, L + 0.5);
    return hit.kind === 'zombie';
  },
  robotShoot(z) {
    const r = this.robot, m = this.robotM;
    m.root.updateMatrixWorld(true);
    const muz = m.muzzle.getWorldPosition(_m);
    const ox = r.x, oy = r.y + 1.1, oz = r.z;
    const ty = z.y + (z.kind === 'crawler' ? 0.35 : (0.95 + Math.random() * 0.35) * z.scale);
    _t.set(z.x - ox, ty - oy, z.z - oz).normalize();
    const sp = ROBOT.spread;
    _t.x += (Math.random() - 0.5) * sp * 2; _t.y += (Math.random() - 0.5) * sp * 2; _t.z += (Math.random() - 0.5) * sp * 2; _t.normalize();
    const hit = castShot(ox, oy, oz, _t.x, _t.y, _t.z, this.zombies, this.sCol, ROBOT.range + 3);
    const hp = _o.set(hit.x, hit.y, hit.z);
    this.fx.tracer(muz, hp);
    this.fx.burst(muz, 3, { color: 0xfff0a0, color2: 0xffffff, speed: 1.2, up: 0.3, size: 0.07, life: 0.08, gravity: 0 });
    r.shots++;
    if (hit.kind === 'zombie') {
      const zz = this.zombies[hit.index];
      this.fx.greenHit(hp.clone(), _t.clone(), hit.head);
      if (this.hitZombie(zz, ROBOT.dmg * (hit.head ? 1.6 : 1), hit.head, hp.clone(), _t.clone(), { knock: 0.35, bot: true })) r.kills++;
    }
    const d = Math.hypot(r.x - this.pos.x, r.z - this.pos.z);
    this.sfx.robotShot?.(Math.max(0.15, 0.6 - d / 40));
    r.kick = 1;
  },
  updateRobot(dt) {
    const r = this.robot; if (!r) return;
    const m = this.robotM;
    r.t += dt; r.hurtT -= dt;
    const PF = this.pFloor ?? this.pos.y;
    m.inner.position.set(0, 0, 0);
    if (r.state === 'idle') {
      // めじるし: ひかる わ と はしら・あたまの ライトが ゆっくり ひかる
      const k = 0.5 + 0.5 * Math.sin(r.t * 4);
      m.ring.scale.setScalar(1 + k * 0.25); m.ring.material.opacity = 0.45 + 0.4 * k;
      m.beam.material.opacity = 0.18 + 0.15 * k;
      if (m.glow) m.glow.position.y = 2.05 + Math.sin(r.t * 3) * 0.08;
      m.lamp.color.setHex(Math.sin(r.t * 5) > 0 ? 0x3aa0ff : 0x9ad6ff);
      m.headPivot.rotation.y = Math.sin(r.t * 0.9) * 0.5;
      m.aim.rotation.x = -0.35; // ぶきを したに むけて まっている
      if (this.state === 'play' && robotTouched(this.pos.x - r.x, this.pos.z - r.z, this.pos.y - r.y)) this.activateRobot();
      m.root.position.set(r.x, r.y, r.z); m.root.rotation.y = r.yaw;
      if (this.cullOn) m.root.visible = this.levelVisible(r.x, r.y, r.z);
      return;
    }
    if (r.state !== 'on') return;
    m.lamp.color.setHex(Math.floor(r.t * 3) % 2 ? 0x3aa0ff : 0xcfe8ff);
    // ---- ついていく ----
    const fp = robotFollowPoint(this.pos.x, this.pos.z, this.yaw);
    const dP = Math.hypot(this.pos.x - r.x, this.pos.z - r.z), dyP = PF - r.y;
    let fx = fp.x - r.x, fz = fp.z - r.z; const dF = Math.hypot(fx, fz);
    let mvx = 0, mvz = 0, sp = 0;
    if (dF > ROBOT.near) {
      const nav = this.nav;
      if (Math.abs(dyP) < 0.4 && nav.lineClear(r.x, r.y, r.z, fp.x, PF, fp.z)) { mvx = fx / dF; mvz = fz / dF; }
      else {
        const d = nav.dir(r.x, r.y, r.z);
        if (d) { mvx = d.x; mvz = d.z; } else { mvx = fx / dF; mvz = fz / dF; }
      }
      sp = Math.min(dP > 5 ? ROBOT.runSpeed : ROBOT.speed, dF * 3.5);
    }
    const ox = r.x, oz = r.z;
    if (sp > 0) {
      const steps = Math.max(1, Math.ceil(sp * dt / 0.15));
      for (let i = 0; i < steps; i++) {
        let nx = r.x + mvx * sp * dt / steps, nz = r.z + mvz * sp * dt / steps;
        const c = collideCircle(nx, nz, 0.32, r.y, this.pCol); nx = c.x; nz = c.z;
        // プレイヤーに めりこまない
        const px = nx - this.pos.x, pz = nz - this.pos.z, pd = Math.hypot(px, pz), minD = PLAYER_R + 0.4;
        if (pd < minD && pd > 1e-4 && Math.abs(this.pos.y - r.y) < 1.2) { nx = this.pos.x + px / pd * minD; nz = this.pos.z + pz / pd * minD; }
        r.x = Math.max(-this.half + 0.6, Math.min(this.half - 0.6, nx)); r.z = Math.max(-this.half + 0.6, Math.min(this.half - 0.6, nz));
      }
    }
    // かいだん: 1だんずつ のぼる・おりる（おちる ときは じゅうりょく）
    const gy = groundHeight(r.x, r.z, 0.15, r.y + 0.001, this.pCol);
    if (gy >= r.y - 0.001 && r.vy >= 0) { r.y = gy; r.vy = 0; }
    else if (r.y - gy < 0.36 && r.vy === 0) { r.y = gy; } // ちいさい だんさは そのまま おりる
    else { r.vy -= 20 * dt; r.y += r.vy * dt; if (r.y <= gy) { r.y = gy; r.vy = 0; } }
    const moved = Math.hypot(r.x - ox, r.z - oz);
    r.moving = sp > 0 ? Math.min(1, moved / Math.max(1e-4, dt) / ROBOT.speed) : 0;
    if (sp > 0.8 && moved < sp * dt * 0.2) r.stuckT += dt; else r.stuckT = Math.max(0, r.stuckT - dt * 2);
    r.phase += dt * moved / Math.max(dt, 1e-4) * 3.2;
    // みえない ときに とおすぎ／べつの かい／うごけない → そばへ ワープ
    if (this.state === 'play' && shouldTeleportRobot(dP, dyP, r.onScreen, r.stuckT)) this.teleportRobot();
    // ---- ねらう・うつ ----
    r.aimT -= dt; r.fireT -= dt;
    if (r.aimT <= 0) {
      r.aimT = 0.2;
      r.target = this.state === 'play' ? pickRobotTarget(this.zombies, this.pos.x, this.pos.z, this.yaw, r.x, r.z, (z) => this.robotCanSee(z)) : -1;
    }
    const tz = r.target >= 0 ? this.zombies[r.target] : null;
    let wantYaw;
    if (tz && tz.alive) {
      wantYaw = Math.atan2(-(tz.x - r.x), -(tz.z - r.z));
      const hd = Math.hypot(tz.x - r.x, tz.z - r.z);
      m.aim.rotation.x = Math.atan2((tz.y + 0.9 * tz.scale) - (r.y + 1.16), hd || 1);
    } else {
      r.target = -1;
      // うしろを みはる（プレイヤーの せなかの ほう）
      wantYaw = sp > 1.5 ? Math.atan2(-mvx, -mvz) : this.yaw + Math.PI * 0.8;
      m.aim.rotation.x *= Math.max(0, 1 - dt * 6);
    }
    const dyaw = wrapA(wantYaw - r.yaw);
    r.yaw = wrapA(r.yaw + dyaw * Math.min(1, dt * 9));
    if (tz && tz.alive && r.fireT <= 0 && Math.abs(dyaw) < 0.35 && this.state === 'play') {
      r.fireT = ROBOT.fireRate * (0.9 + Math.random() * 0.2);
      this.robotShoot(tz);
    }
    // ---- アニメ ----
    const sw = r.moving > 0.05 ? Math.sin(r.phase) * 0.6 * Math.min(1, r.moving + 0.3) : 0;
    m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
    m.headPivot.rotation.y *= 0.9;
    r.kick = Math.max(0, (r.kick || 0) - dt * 10);
    m.holder.position.z = -0.44 + r.kick * 0.05;
    m.inner.position.y = Math.abs(sw) * 0.03;
    if (r.hurtT > 0) m.inner.position.x = (Math.random() - 0.5) * 0.07;
    m.root.position.set(r.x, r.y, r.z); m.root.rotation.y = r.yaw;
    if (this.cullOn) m.root.visible = this.levelVisible(r.x, r.y, r.z);
  },
  updateRobotHud() {
    const r = this.robot;
    if (!r || this.state !== 'play') { if (this.robotHudOn) { this.robotHudOn = false; this.hud.robot?.(null); } return; }
    const v = _p.set(r.x, r.y + 2.0, r.z).project(this.camera);
    const behind = v.z > 1;
    const e = edgeArrow(v.x, v.y, behind);
    const c = _o.set(r.x, r.y + 0.9, r.z).project(this.camera);
    r.onScreen = !(c.z > 1) && Math.abs(c.x) < 1.08 && Math.abs(c.y) < 1.08;
    this.robotHudOn = true;
    this.hud.robot?.({ mode: r.state === 'idle' ? 'idle' : 'on', onScreen: e.onScreen && (r.state === 'idle' || Math.hypot(r.x - this.pos.x, r.z - this.pos.z) < 30),
      x: e.x, y: e.y, ang: e.ang, hp: r.hp / ROBOT.hp });
  },
};
