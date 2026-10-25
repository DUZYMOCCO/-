// v0.11.0: ホーミング ミサイル（スーツの ミサイル・ミサイルランチャー）
// すこし うえに ひろがって でて → いちばん ちかい まえの ゾンビへ まがって とぶ → ばくはつ（ゾンビ だけ）
// とべる かずと けむりの かずには じょうげん（iPhone SE でも かるく）
import * as THREE from '../vendor/three.module.min.js';
import { MISSILE, missileTargets, salvoDirs, steerMissile, salvoRoom, castShot } from './rules.js?v=19';
import { makeMissile } from './models.js?v=19';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const FWD = new THREE.Vector3(0, 0, -1);

export const MissileMixin = {
  initMissiles() { this.missiles = []; this.missilePool = { s: [], b: [] }; },
  clearMissiles() {
    for (const m of this.missiles || []) this.releaseMissile(m);
    if (this.missiles) this.missiles.length = 0;
  },
  releaseMissile(m) { this.scene.remove(m.mdl.group); (m.big ? this.missilePool.b : this.missilePool.s).push(m); },
  // start: はっしゃ ばしょ・fdir: ねらう むき（ながさ 1）・W: ぶき（dmg・blast・speed・salvo・life）
  launchSalvo(start, fdir, W, aim = null) { // aim: ゾンビが いない ときの ねらう ばしょ（くるま・かべ）
    const n = salvoRoom(this.missiles.length, W.salvo || 1);
    if (!n) return 0;
    // まえの ちかい ゾンビ（12たいまで）のうち たてものの むこうに いない ものを ねらう（ミサイルは やまなり なので すこし うえから みる）
    const near = [...new Set(missileTargets(start.x, start.z, fdir.x, fdir.z, this.zombies, 12))];
    const vis = near.filter((i) => {
      const z = this.zombies[i], sy = start.y + 1, dx = z.x - start.x, dy = z.y + 1.5 * z.scale - sy, dz = z.z - start.z, L = Math.hypot(dx, dy, dz);
      const h = castShot(start.x, sy, start.z, dx / L, dy / L, dz / L, this.zombies, this.sCol, L);
      return h.kind === 'zombie' || h.kind === 'none';
    });
    const tg = vis.length ? Array.from({ length: n }, (_, k) => vis[k % vis.length]) : [];
    const dirs = salvoDirs(fdir.x, fdir.y, fdir.z, n);
    const big = !!W.big, pool = big ? this.missilePool.b : this.missilePool.s;
    const rx = -fdir.z, rz = fdir.x, rl = Math.hypot(rx, rz) || 1;
    for (let k = 0; k < n; k++) {
      let m = pool.pop();
      if (!m) m = { mdl: makeMissile(big), pos: new THREE.Vector3(), vel: new THREE.Vector3(), big };
      const off = n > 1 ? (k / (n - 1) - 0.5) * (big ? 0.35 : 0.14) : 0;
      m.pos.copy(start); m.pos.x += rx / rl * off; m.pos.z += rz / rl * off; m.pos.y += (k % 2) * (big ? 0.1 : 0.04);
      const d = dirs[k];
      m.vel.set(d[0], d[1], d[2]);
      if (tg.length) { // ねらった ゾンビの ほうへ すこし むけて でる（よこの ゾンビでも かべに ぶつからない）
        const z = this.zombies[tg[k]], tx = z.x - m.pos.x, ty = z.y + 0.9 * z.scale - m.pos.y, tz = z.z - m.pos.z, tl = Math.hypot(tx, ty, tz) || 1;
        m.vel.x += 0.7 * (tx / tl - fdir.x); m.vel.y += 0.7 * (ty / tl - fdir.y); m.vel.z += 0.7 * (tz / tl - fdir.z);
      }
      m.vel.normalize().multiplyScalar(W.speed * 0.55);
      if (tg.length) m.target = this.zombies[tg[k]];
      else if (aim) { const sp = m.spot || (m.spot = { x: 0, y: 0, z: 0, alive: true, scale: 1, spot: true }); sp.x = aim.x; sp.y = aim.y - 0.9; sp.z = aim.z; m.target = sp; }
      else m.target = null;
      m.W = W; m.age = -k * 0.045; m.life = W.life; m.trailT = k * 0.012; // すこし ずつ ずらして でる（シュシュシュ）
      m.mdl.group.visible = false;
      m.mdl.group.position.copy(m.pos);
      this.scene.add(m.mdl.group);
      this.missiles.push(m);
    }
    return n;
  },
  updateMissiles(dt) {
    if (!this.missiles || !this.missiles.length) return;
    let trails = 0;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i], W = m.W;
      m.age += dt;
      if (m.age < 0) continue; // まだ でていない
      m.mdl.group.visible = true;
      m.life -= dt;
      // はやく なる
      const sp0 = m.vel.length();
      if (sp0 < W.speed) m.vel.multiplyScalar(Math.min(W.speed, sp0 + MISSILE.accel * dt) / sp0);
      // ねらいの ゾンビへ まがる（たおれたら まっすぐ）
      const t = m.target;
      if (t && (!t.alive || t.fly)) m.target = null;
      if (m.target && m.age > MISSILE.arm) {
        const tx = m.target.x - m.pos.x, ty = m.target.y + 0.9 * m.target.scale - m.pos.y, tz = m.target.z - m.pos.z;
        if (Math.hypot(tx, ty, tz) < MISSILE.near * m.target.scale) { this.missileBoom(i, m.pos); continue; }
        const v = steerMissile(m.vel.x, m.vel.y, m.vel.z, tx, ty, tz, MISSILE.turn * dt * (1 + m.age));
        m.vel.set(v[0], v[1], v[2]);
      } else if (!m.target) m.vel.y -= 2 * dt; // ねらいが ない: すこし さがる
      const sp = m.vel.length(), step = sp * dt;
      const dx = m.vel.x / sp, dy = m.vel.y / sp, dz = m.vel.z / sp;
      const hit = castShot(m.pos.x, m.pos.y, m.pos.z, dx, dy, dz, this.zombies, this.sCol, step);
      if (hit.kind !== 'none' || m.life <= 0) {
        this.missileBoom(i, _c.set(hit.x - dx * 0.15, Math.max(0.1, hit.y - dy * 0.15), hit.z - dz * 0.15));
        continue;
      }
      m.pos.addScaledVector(m.vel, dt);
      m.mdl.group.position.copy(m.pos);
      m.mdl.group.quaternion.setFromUnitVectors(FWD, _a.set(dx, dy, dz));
      m.mdl.flame.scale.setScalar(0.7 + Math.random() * 0.7);
      m.trailT -= dt;
      if (m.trailT <= 0 && trails < MISSILE.maxTrail) {
        m.trailT = MISSILE.trailDt; trails++;
        this.fx.burst(_b.copy(m.pos).addScaledVector(m.vel, -0.25 / sp), 1, { color: 0xc8c8c8, color2: 0xeeeeee, speed: 0.2, up: 0.2, size: m.big ? 0.34 : 0.26, life: 0.9, gravity: -0.5, grow: 1.5, drag: 1.5 });
      }
    }
  },
  // ばくはつ（ゾンビ だけ。プレイヤー・ロボ・けいさつ・おじさんは へいき）
  missileBoom(i, p) {
    const m = this.missiles[i];
    this.missiles.splice(i, 1);
    this.explode(new THREE.Vector3(p.x, p.y, p.z), m.W, { vol: 0.55, soft: true });
    this.releaseMissile(m);
  },
};
