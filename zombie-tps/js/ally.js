// v0.9.0: なかま（けいさつロボ・けいさつおじさん）の きょうつうの うごき
// v0.14.0: アーミーロボ・よっぱらいおじさん も いっしょ（allyList）
// a: { x,y,z,yaw,vy, stuckT, fireT, aimT, target, onScreen, phase, moving, kick, hurtT }
// m: モデル（root, inner, legs, aim, holder, muzzle, headPivot）／ S: すうち（back, side, speed, runSpeed, near, range, spread, fireRate, dmg）
import * as THREE from '../vendor/three.module.min.js';
import { robotFollowPoint, pickRobotTarget, castShot, collideCircle, groundHeight } from './rules.js?v=23';

const PLAYER_R = 0.35, ROBOT_BACK = 0.3;
const _o = new THREE.Vector3(), _t = new THREE.Vector3(), _m = new THREE.Vector3(), _p = new THREE.Vector3();
export const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// teleport の しきい（S.teleport / teleportDy / stuckTime）
export function allyShouldTeleport(S, dist, dy, onScreen, stuckT) {
  if (onScreen) return false;
  return dist > S.teleport || Math.abs(dy) > S.teleportDy || stuckT > S.stuckTime;
}

export const AllyMixin = {
  // ワープする ばしょ（プレイヤーの うしろ・よこ。カメラの まえには でない）
  allyWarpSpot(S) {
    const yaw = this.yaw, PF = this.pFloor ?? this.pos.y, sd = S.side >= 0 ? 1 : -1;
    const opts = [robotFollowPoint(this.pos.x, this.pos.z, yaw, S.back, S.side), robotFollowPoint(this.pos.x, this.pos.z, yaw, 1.6, 0.6 * sd),
      robotFollowPoint(this.pos.x, this.pos.z, yaw, 1.2, -1.2 * sd), robotFollowPoint(this.pos.x, this.pos.z, yaw, 0, 1.4 * sd),
      robotFollowPoint(this.pos.x, this.pos.z, yaw, ROBOT_BACK, 1.5 * sd)];
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
  allyTeleport(a, S, color = 0x7cc8ff) {
    const p = this.allyWarpSpot(S);
    if (!p) return false;
    this.fx.poof(_p.set(a.x, a.y + 0.8, a.z), 0.8);
    a.x = p.x; a.z = p.z; a.y = p.y; a.vy = 0; a.stuckT = 0; a.warps = (a.warps || 0) + 1;
    this.fx.burst(_p.set(a.x, a.y + 1, a.z), 12, { color, color2: 0xffffff, speed: 2, up: 1.5, size: 0.07, life: 0.5, gravity: 2 });
    return true;
  },
  allyCanSee(a, z) {
    if (Math.abs(z.y - a.y) > 3.2) return false;
    const ox = a.x, oy = a.y + 1.1, oz = a.z;
    const tx = z.x, ty = z.y + (z.kind === 'crawler' ? 0.35 : 1.0 * z.scale), tz = z.z;
    let dx = tx - ox, dy = ty - oy, dz = tz - oz; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const hit = castShot(ox, oy, oz, dx, dy, dz, this.zombies, this.sCol, L + 0.5);
    return hit.kind === 'zombie';
  },
  // 1ぱつ うつ。たおしたら true
  allyShoot(a, m, z, dmg, S, opt = {}) {
    m.root.updateMatrixWorld(true);
    const muz = m.muzzle.getWorldPosition(_m);
    const ox = a.x, oy = a.y + 1.1, oz = a.z;
    const ty = z.y + (z.kind === 'crawler' ? 0.35 : (0.95 + Math.random() * 0.35) * z.scale);
    _t.set(z.x - ox, ty - oy, z.z - oz).normalize();
    const sp = S.spread;
    _t.x += (Math.random() - 0.5) * sp * 2; _t.y += (Math.random() - 0.5) * sp * 2; _t.z += (Math.random() - 0.5) * sp * 2; _t.normalize();
    const hit = castShot(ox, oy, oz, _t.x, _t.y, _t.z, this.zombies, this.sCol, S.range + 3);
    const hp = _o.set(hit.x, hit.y, hit.z);
    this.fx.tracer(muz, hp);
    this.fx.burst(muz, 3, { color: 0xfff0a0, color2: 0xffffff, speed: 1.2, up: 0.3, size: 0.07, life: 0.08, gravity: 0 });
    a.shots = (a.shots || 0) + 1;
    let killed = false;
    if (hit.kind === 'zombie') {
      const zz = this.zombies[hit.index];
      this.fx.greenHit(hp.clone(), _t.clone(), hit.head);
      killed = this.hitZombie(zz, dmg * (hit.head ? 1.6 : 1), hit.head, hp.clone(), _t.clone(), { knock: 0.35, bot: opt.who || true });
    }
    const d = Math.hypot(a.x - this.pos.x, a.z - this.pos.z);
    this.sfx.robotShot?.(Math.max(0.15, 0.6 - d / 40) * (opt.vol || 1));
    a.kick = 1;
    return killed;
  },
  // ついていく（nav・かいだん・ワープ）→ { sp, mvx, mvz }
  allyFollow(a, S, dt, canWarp = true) {
    const PF = this.pFloor ?? this.pos.y;
    const fp = robotFollowPoint(this.pos.x, this.pos.z, this.yaw, S.back, S.side);
    const dP = Math.hypot(this.pos.x - a.x, this.pos.z - a.z), dyP = PF - a.y;
    const fx = fp.x - a.x, fz = fp.z - a.z; const dF = Math.hypot(fx, fz);
    let mvx = 0, mvz = 0, sp = 0;
    if (dF > S.near) {
      const nav = this.nav;
      if (Math.abs(dyP) < 0.4 && nav.lineClear(a.x, a.y, a.z, fp.x, PF, fp.z)) { mvx = fx / dF; mvz = fz / dF; }
      else {
        const d = nav.dir(a.x, a.y, a.z);
        if (d) { mvx = d.x; mvz = d.z; } else { mvx = fx / dF; mvz = fz / dF; }
      }
      sp = Math.min(dP > 5 ? S.runSpeed : S.speed, dF * 3.5);
    }
    this.allyStep(a, S, dt, mvx, mvz, sp);
    if (canWarp && this.state === 'play' && allyShouldTeleport(S, dP, dyP, a.onScreen, a.stuckT)) this.allyTeleport(a, S, a.warpColor);
    return { sp, mvx, mvz };
  },
  // うごく（かべ・プレイヤー・かいだん・じゅうりょく）
  allyStep(a, S, dt, mvx, mvz, sp) {
    const ox = a.x, oz = a.z;
    if (sp > 0) {
      const steps = Math.max(1, Math.ceil(sp * dt / 0.15));
      for (let i = 0; i < steps; i++) {
        let nx = a.x + mvx * sp * dt / steps, nz = a.z + mvz * sp * dt / steps;
        const c = collideCircle(nx, nz, 0.32, a.y, this.pCol); nx = c.x; nz = c.z;
        const px = nx - this.pos.x, pz = nz - this.pos.z, pd = Math.hypot(px, pz), minD = PLAYER_R + 0.4;
        if (pd < minD && pd > 1e-4 && Math.abs(this.pos.y - a.y) < 1.2) { nx = this.pos.x + px / pd * minD; nz = this.pos.z + pz / pd * minD; }
        // なかま どうしも めりこまない
        for (const o of this.allyList()) {
          if (!o || o === a || o.state !== 'on') continue;
          const qx = nx - o.x, qz = nz - o.z, qd = Math.hypot(qx, qz);
          if (qd < 0.7 && qd > 1e-4 && Math.abs(o.y - a.y) < 1.2) { nx = o.x + qx / qd * 0.7; nz = o.z + qz / qd * 0.7; }
        }
        a.x = Math.max(-this.half + 0.6, Math.min(this.half - 0.6, nx)); a.z = Math.max(-this.half + 0.6, Math.min(this.half - 0.6, nz));
      }
    }
    const gy = groundHeight(a.x, a.z, 0.15, a.y + 0.001, this.pCol);
    if (gy >= a.y - 0.001 && a.vy >= 0) { a.y = gy; a.vy = 0; }
    else if (a.y - gy < 0.36 && a.vy === 0) { a.y = gy; }
    else { a.vy -= 20 * dt; a.y += a.vy * dt; if (a.y <= gy) { a.y = gy; a.vy = 0; } }
    const moved = Math.hypot(a.x - ox, a.z - oz);
    a.moving = sp > 0 ? Math.min(1, moved / Math.max(1e-4, dt) / S.speed) : 0;
    if (sp > 0.8 && moved < sp * dt * 0.2) a.stuckT += dt; else a.stuckT = Math.max(0, a.stuckT - dt * 2);
    a.phase += dt * moved / Math.max(dt, 1e-4) * 3.2;
  },
  // ねらって うつ。shoot(z) は うった ときに よばれる
  allyAimFire(a, m, S, dt, mv, fireRate, shoot, pick = null) {
    a.aimT -= dt; a.fireT -= dt;
    if (a.aimT <= 0) {
      a.aimT = 0.2;
      a.target = this.state !== 'play' ? -1 : pick ? pick(a) : pickRobotTarget(this.zombies, this.pos.x, this.pos.z, this.yaw, a.x, a.z, (z) => this.allyCanSee(a, z), S.range);
    }
    const tz = a.target >= 0 ? this.zombies[a.target] : null;
    let wantYaw;
    if (tz && tz.alive) {
      wantYaw = Math.atan2(-(tz.x - a.x), -(tz.z - a.z));
      const hd = Math.hypot(tz.x - a.x, tz.z - a.z);
      m.aim.rotation.x = Math.atan2((tz.y + 0.9 * tz.scale) - (a.y + 1.16), hd || 1);
    } else {
      a.target = -1;
      wantYaw = mv.sp > 1.5 ? Math.atan2(-mv.mvx, -mv.mvz) : this.yaw + Math.PI * (S.side >= 0 ? 0.8 : -0.8);
      m.aim.rotation.x *= Math.max(0, 1 - dt * 6);
    }
    const dyaw = wrapA(wantYaw - a.yaw);
    a.yaw = wrapA(a.yaw + dyaw * Math.min(1, dt * 9));
    if (tz && tz.alive && a.fireT <= 0 && Math.abs(dyaw) < 0.35 && this.state === 'play') {
      a.fireT = fireRate * (0.9 + Math.random() * 0.2);
      shoot(tz);
    }
  },
  allyAnim(a, m, dt, holderZ = -0.44) {
    const sw = a.moving > 0.05 ? Math.sin(a.phase) * 0.6 * Math.min(1, a.moving + 0.3) : 0;
    m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
    m.headPivot.rotation.y *= 0.9;
    a.kick = Math.max(0, (a.kick || 0) - dt * 10);
    if (m.holder) m.holder.position.z = holderZ + a.kick * 0.05;
    m.inner.position.y = Math.abs(sw) * 0.03;
    if (a.hurtT > 0) m.inner.position.x = (Math.random() - 0.5) * 0.07;
    m.root.position.set(a.x, a.y, a.z); m.root.rotation.y = a.yaw;
    if (this.cullOn) m.root.visible = this.levelVisible(a.x, a.y, a.z);
  },
  // ゾンビが ねらう なかま（いちばん ちかい・うごいている もの）
  allyFor(z) {
    if (this.state !== 'play' || z.demo) return null;
    let best = null, bd = Infinity;
    for (const o of this.allyList()) {
      if (!o || o.state !== 'on') continue;
      const d = Math.hypot(o.x - z.x, o.z - z.z);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  },
  // なかまの リスト（まいフレーム つかう ので おなじ はいれつを つかいまわす）
  allyList() {
    const L = this._allyL || (this._allyL = [null, null, null, null]);
    L[0] = this.robot; L[1] = this.army; L[2] = this.cop; L[3] = this.drunk;
    return L;
  },
  hurtAlly(a, d) {
    if (a === this.robot) this.hurtRobot(d); else if (a === this.army) this.hurtArmy(d);
    else if (a === this.cop) this.hurtCop(d); else if (a === this.drunk) this.hurtDrunk(d);
  },
};
