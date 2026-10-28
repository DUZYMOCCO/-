// v0.15.0: レーザーじゅう・かえんほうしゃき・ビームじゅう・スモークグレネード（プレイヤーの ぶき）
// ・レーザー: ほそい ひかりが いっしゅんで とどく。4たいまで つらぬく（かべで とまる）。うつと ねつが たまる → オーバーヒート
// ・ほのお: まえの ちかくに ほのお（かべの むこうには とどかない）。もえて じわじわ（こげて たおれる・ちは でない）
// ・ビーム: おしっぱなしで ためて → ふとい ビームが でつづける（ながい あいだ ぜんぶ つらぬく）
// ・けむり: やまなりに なげる → 6びょう けむり。なかの ゾンビは プレイヤーを みうしなう（ボスには きかない）
// どれも ゾンビ だけに あたる（プレイヤー・なかまには あたらない）。けむりの なかでも うてる
import * as THREE from '../vendor/three.module.min.js';
import {
  WEAPONS, WEAPON_ORDER, SMOKE, useGauge, gunStats, laserHits, flameHits, castShot, damageAt, knockAt, groundHeight,
  addSmokeCloud, smokeAffects,
} from './rules.js?v=36';
import { makeSmokeCan } from './models.js?v=36';

const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Vector3(), _c = new THREE.Vector3();
const NO_Z = [];
const LASERS = 4, LASER_T = 0.07, GRENADES = 3;
const mkMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(238,240,244,1)'); g.addColorStop(0.5, 'rgba(220,224,230,0.85)'); g.addColorStop(1, 'rgba(200,205,212,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const EnergyMixin = {
  initEnergy() {
    const S = this.scene, box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5); // うしろが はじまり（v0.14 と おなじ）
    // レーザー（あかい そと・しろい しん。つかいまわし）
    this.pLasers = [];
    for (let i = 0; i < LASERS; i++) {
      const outer = new THREE.Mesh(box, mkMat(0xff3048, 0.6)), core = new THREE.Mesh(box, mkMat(0xd8fbff, 0.95));
      outer.visible = core.visible = false; outer.renderOrder = core.renderOrder = 6;
      S.add(outer); S.add(core); this.pLasers.push({ outer, core, t: 0 });
    }
    this.pLaserI = 0;
    // ビーム（むらさきの ふとい ひかり 3そう）
    this.pBeam = [mkMat(0x9a4dff, 0.35), mkMat(0xd890ff, 0.55), mkMat(0xffffff, 0.9)].map((m) => {
      const b = new THREE.Mesh(box, m); b.visible = false; b.renderOrder = 6; S.add(b); return b;
    });
    const glowTex = this.fxTex && this.fxTex.glow;
    this.pCharge = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xd890ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.pCharge.visible = false; this.pCharge.renderOrder = 7; S.add(this.pCharge);
    this.pBeamEnd = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xc070ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.pBeamEnd.visible = false; this.pBeamEnd.renderOrder = 7; S.add(this.pBeamEnd);
    // けむり（2つ ぶん・それぞれ SMOKE.puffs まいの いた）
    const st = smokeTexture();
    this.smokeVis = [];
    for (let k = 0; k < SMOKE.max; k++) {
      const g = new THREE.Group(); g.visible = false; S.add(g);
      const puffs = [];
      for (let i = 0; i < SMOKE.puffs; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, color: 0xc4c8cc, transparent: true, opacity: 0, depthWrite: false }));
        g.add(sp); puffs.push(sp);
      }
      this.smokeVis.push({ g, puffs, cloud: null });
    }
    // なげた かん（つかいまわし）
    this.grenades = []; this.grenPool = [];
    for (let i = 0; i < GRENADES; i++) { const m = makeSmokeCan(); m.visible = false; S.add(m); this.grenPool.push(m); }
    this.smokes = [];
  },
  resetEnergy() {
    if (!this.pLasers) return;
    for (const L of this.pLasers) { L.t = 0; L.outer.visible = L.core.visible = false; }
    this.hideBeam();
    for (const gr of this.grenades) { gr.mesh.visible = false; this.grenPool.push(gr.mesh); }
    this.grenades.length = 0;
    this.smokes.length = 0;
    for (const v of this.smokeVis) { v.g.visible = false; v.cloud = null; }
  },
  hideBeam() { for (const b of this.pBeam) b.visible = false; this.pCharge.visible = false; this.pBeamEnd.visible = false; },

  // めあての せん（fireShot と おなじ: カメラの まんなか、プレイヤーの よこから）
  aimRay() {
    const cam = this.camera;
    const d = _d.set(0, 0, -1).applyQuaternion(this.camBaseQ).normalize();
    const o = _o.copy(cam.position).addScaledVector(d, Math.max(0, _c.copy(this.shoulder).sub(cam.position).dot(d)));
    return { o, d };
  },

  // 1フレーム: いまの ぶき（ゲージ）を うつ・ほかの ゲージは もどる
  updateEnergy(dt, held) {
    let beamOn = false;
    for (const id of WEAPON_ORDER) {
      if (!WEAPONS[id].gauge) continue;
      const g = this.guns[id], cur = id === this.cur && !this.suit;
      const wasLock = g.lock;
      const res = useGauge(g, cur && held, dt);
      if (!cur) continue;
      const w = gunStats(g);
      if (res === 'fire') this.fireLaser(g, w);
      else if (res === 'stream' && w.gauge === 'fuel') this.fireFlame(dt, g, w);
      else if (res === 'stream' || res === 'charge') { this.fireBeam(dt, g, w, res === 'charge'); beamOn = true; }
      else g.tickT = 0;
      if (g.lock && !wasLock) { this.sfx.overheat?.(); this.hud.kill(w.gauge === 'heat' ? 'オーバーヒート！ ひやしてね' : w.gauge === 'fuel' ? 'ねんりょう ぎれ！ すこし まってね' : 'エネルギー ぎれ！ すこし まってね', false); }
      if (res === 'locked' && !(this.lockClick > 0)) { this.sfx.empty(); this.lockClick = 0.4; }
      if (res !== 'none' || g.en < 1) this.pushHud();
    }
    if (this.lockClick > 0) this.lockClick -= dt;
    if (!beamOn) this.hideBeam();
    this.updateLasers(dt);
  },

  // ---- レーザー ----
  fireLaser(g, w) {
    const { o, d } = this.aimRay();
    const wall = castShot(o.x, o.y, o.z, d.x, d.y, d.z, NO_Z, this.sCol, w.range);
    let endT = wall.t;
    const hits = laserHits(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, endT, w.pierce, w.beamW);
    if (hits.length >= w.pierce) endT = hits[hits.length - 1].t + 0.3;
    let killed = 0, any = false, anyHead = false, mul = 1;
    for (const h of hits) {
      const z = this.zombies[h.i]; if (!z || !z.alive || z.demo) continue;
      _p.set(o.x + d.x * h.t, o.y + d.y * h.t, o.z + d.z * h.t);
      const head = _p.y > z.y + 1.5 * (z.scale || 1);
      this.fx.greenHit(_p.clone(), d.clone(), head);
      if (this.hitZombie(z, damageAt(w, h.t, head) * mul, head, _p.clone(), d.clone(), { knock: knockAt(w, h.t) * mul })) killed++;
      any = true; anyHead = anyHead || head; mul *= 0.85;
    }
    if (killed >= 2) this.multiKill(killed);
    if (any) { this.hud.hitmarker(anyHead); this.sfx.hit(anyHead); }
    const muz = this.weapons[this.cur].muzzle.getWorldPosition(_m);
    _e.set(o.x + d.x * endT, o.y + d.y * endT, o.z + d.z * endT);
    this.laserBeam(muz, _e);
    if (!any && wall.kind !== 'none') this.fx.burst(_e, 3, { color: 0xff4a5a, color2: 0xffffff, speed: 1.8, up: 0.5, size: 0.05, life: 0.15, gravity: 2 });
    this.kick = 0.4;
    this.shake = Math.min(0.2, this.shake + w.shake);
    this.recoilP += w.recoilPitch * 0.75;
    this.sfx.laser?.(0.55);
  },
  laserBeam(a, b) {
    const L = this.pLasers[this.pLaserI]; this.pLaserI = (this.pLaserI + 1) % LASERS;
    const len = a.distanceTo(b);
    for (const [mesh, w] of [[L.outer, 0.07], [L.core, 0.025]]) { mesh.position.copy(a); mesh.lookAt(b); mesh.scale.set(w, w, len); mesh.visible = true; }
    L.t = LASER_T;
  },
  updateLasers(dt) {
    for (const L of this.pLasers) {
      if (L.t <= 0) continue;
      L.t -= dt;
      if (L.t <= 0) { L.outer.visible = L.core.visible = false; continue; }
      const k = L.t / LASER_T;
      L.outer.material.opacity = 0.6 * k; L.core.material.opacity = 0.95 * k;
    }
  },

  // ---- かえんほうしゃき ----
  fireFlame(dt, g, w) {
    const fxv = -Math.sin(this.yaw), fzv = -Math.cos(this.yaw);
    // かべの むこうには とどかない
    const wl = castShot(this.pos.x, this.pos.y + 1.0, this.pos.z, fxv, 0, fzv, NO_Z, this.sCol, w.range);
    const R = Math.max(1.2, Math.min(w.range, wl.t + 0.3));
    const nz = this.weapons[this.cur].muzzle.getWorldPosition(_m);
    g.emitT = (g.emitT || 0) - dt;
    const room = this.fx.maxP - this.fx.parts.length;
    while (g.emitT <= 0) {
      g.emitT += 1 / 34;
      if (room < 24) continue;
      const dir = _e.set(0, 0, -1).applyQuaternion(this.camBaseQ);
      dir.y = Math.max(-0.3, dir.y + 0.05);
      this.fx.burst(nz, 2, { color: 0xff8a18, color2: 0xffe060, speed: 16, up: 0.6, size: 0.3, life: 0.42 * R / 7, gravity: -3, dir, spread: 0.16, grow: 2.2, drag: 1.6 });
    }
    g.tickT = (g.tickT || 0) - dt;
    if (g.tickT > 0) return;
    g.tickT += w.tick; if (g.tickT < 0) g.tickT = 0;
    const dir = new THREE.Vector3(fxv, 0, fzv);
    let killed = 0, any = false;
    for (const { i } of flameHits(this.pos.x, this.pos.z, fxv, fzv, this.zombies, R, w.cone)) {
      const z = this.zombies[i]; if (!z || !z.alive || z.demo) continue;
      if (Math.abs(z.y - this.pos.y) > 3) continue;
      z.burnT = w.burn; z.burnDps = w.burnDps;
      any = true;
      if (this.hitZombie(z, w.dmg * w.tick, false, _c.set(z.x, z.y + 1, z.z), dir, { fire: true, knock: w.knock })) killed++;
    }
    if (killed >= 2) this.multiKill(killed);
    if (any) this.hud.hitmarker(false);
    if (Math.random() < 0.45) this.sfx.fire?.(0.2);
    this.shake = Math.min(0.15, this.shake + w.shake * 0.3);
  },

  // ---- ビームじゅう ----
  fireBeam(dt, g, w, charging) {
    const muz = this.weapons[this.cur].muzzle.getWorldPosition(_m);
    const t = performance.now() * 0.001;
    if (charging) {
      const k = g.charge || 0;
      this.pCharge.visible = true; this.pCharge.position.copy(muz); this.pCharge.scale.setScalar(0.15 + k * 0.55 + Math.sin(t * 40) * 0.03);
      this.pCharge.material.opacity = 0.5 + k * 0.5;
      for (const b of this.pBeam) b.visible = false; this.pBeamEnd.visible = false;
      g.chT = (g.chT || 0) - dt; if (g.chT <= 0) { g.chT = 0.12; this.sfx.charge?.(k); }
      return;
    }
    const { o, d } = this.aimRay();
    const wall = castShot(o.x, o.y, o.z, d.x, d.y, d.z, NO_Z, this.sCol, w.range);
    const endT = wall.t;
    _e.set(o.x + d.x * endT, o.y + d.y * endT, o.z + d.z * endT);
    const len = muz.distanceTo(_e), pulse = 1 + Math.sin(t * 30) * 0.12;
    const W = [w.beamW * 0.55 * pulse, w.beamW * 0.3, w.beamW * 0.1];
    this.pBeam.forEach((b, i) => { b.position.copy(muz); b.lookAt(_e); b.scale.set(W[i], W[i], len); b.visible = true; });
    this.pCharge.visible = true; this.pCharge.position.copy(muz); this.pCharge.scale.setScalar(0.6 * pulse); this.pCharge.material.opacity = 0.9;
    this.pBeamEnd.visible = wall.kind !== 'none'; this.pBeamEnd.position.copy(_e); this.pBeamEnd.scale.setScalar(1.1 * pulse);
    this.shake = Math.min(0.12, this.shake + w.shake * dt * 2);
    this.kick = Math.max(this.kick, 0.25);
    g.tickT = (g.tickT || 0) - dt;
    if (g.tickT > 0) return;
    g.tickT += w.tick; if (g.tickT < 0) g.tickT = 0;
    this.sfx.beam?.(0.6);
    if (wall.kind !== 'none' && Math.random() < 0.5) this.fx.burst(_e, 3, { color: 0xc070ff, color2: 0xffffff, speed: 2.5, up: 1, size: 0.07, life: 0.25, gravity: 3 });
    const hits = laserHits(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, endT, w.pierce, w.beamW);
    let killed = 0;
    for (const h of hits) {
      const z = this.zombies[h.i]; if (!z || !z.alive || z.demo) continue;
      _p.set(o.x + d.x * h.t, o.y + d.y * h.t, o.z + d.z * h.t);
      if (Math.random() < 0.5) this.fx.greenHit(_p.clone(), d.clone(), false);
      if (this.hitZombie(z, w.dmg * w.tick, false, _p.clone(), d.clone(), { knock: w.knock * 0.35 })) killed++;
    }
    if (killed >= 2) this.multiKill(killed);
    if (hits.length) { this.hud.hitmarker(false); this.sfx.hit(false); }
  },

  // ---- スモークグレネード ----
  throwSmoke() {
    const g = this.guns.smoke, w = gunStats(g);
    const start = this.weapons.smoke.mag.getWorldPosition(new THREE.Vector3());
    const { d } = this.aimRay();
    const vel = new THREE.Vector3(d.x, 0, d.z).normalize().multiplyScalar(w.speed * Math.max(0.35, Math.cos(this.pitch)));
    vel.y = w.up + Math.sin(this.pitch) * w.speed * 0.6;
    const mesh = this.grenPool.pop() || makeSmokeCan();
    if (!mesh.parent) this.scene.add(mesh);
    mesh.visible = true; mesh.position.copy(start);
    if (this.grenades.length >= GRENADES) this.popGrenade(this.grenades[0], 0);
    this.grenades.push({ mesh, pos: start, vel, t: w.fuse, time: w.time, rest: false });
    this.kick = 0.6;
    this.sfx.toss?.();
  },
  popGrenade(gr, idx = this.grenades.indexOf(gr)) {
    if (idx >= 0) this.grenades.splice(idx, 1);
    gr.mesh.visible = false; this.grenPool.push(gr.mesh);
    const gone = addSmokeCloud(this.smokes, gr.pos.x, gr.pos.z, gr.time);
    const c = this.smokes[this.smokes.length - 1]; c.y = gr.pos.y;
    let v = this.smokeVis.find((s) => s.cloud === gone && gone) || this.smokeVis.find((s) => !s.cloud);
    if (!v) v = this.smokeVis[0];
    v.cloud = c; c.vis = v;
    v.g.position.set(c.x, c.y, c.z); v.g.visible = true;
    v.puffs.forEach((sp, i) => {
      const a = (i / v.puffs.length) * Math.PI * 2 + Math.random() * 0.6, r = i === 0 ? 0 : c.r * (0.35 + Math.random() * 0.4);
      sp.position.set(Math.cos(a) * r, 0.9 + Math.random() * 1.4, Math.sin(a) * r);
      sp.userData.s = 3.8 + Math.random() * 1.6; sp.scale.setScalar(0.5); sp.material.rotation = Math.random() * 6;
    });
    this.sfx.smoke?.();
  },
  updateSmoke(dt) {
    if (!this.smokes) return;
    // とんでいる かん
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i], P = gr.pos, V = gr.vel;
      gr.t -= dt;
      if (!gr.rest) {
        V.y -= WEAPONS.smoke.gravity * dt;
        const sx = V.x * dt, sz = V.z * dt, sl = Math.hypot(sx, sz);
        if (sl > 1e-5) { // かべで はねかえる
          const h = castShot(P.x, P.y, P.z, sx / sl, 0, sz / sl, NO_Z, this.sCol, sl + 0.1);
          if (h.kind === 'wall') { V.x *= -0.35; V.z *= -0.35; } else { P.x += sx; P.z += sz; }
        }
        P.y += V.y * dt;
        const gy = groundHeight(P.x, P.z, 0.05, P.y + 0.3, this.pCol);
        if (P.y < gy + 0.06) { P.y = gy + 0.06; if (V.y < 0) V.y = -V.y * 0.3; V.x *= 0.6; V.z *= 0.6; if (Math.hypot(V.x, V.z) < 0.4 && Math.abs(V.y) < 1) gr.rest = true; }
        gr.mesh.rotation.x += dt * 9; gr.mesh.rotation.z += dt * 4;
      }
      gr.mesh.position.copy(P);
      if (gr.t <= 0) this.popGrenade(gr, i);
    }
    // けむり
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const c = this.smokes[i];
      c.t -= dt;
      const v = c.vis;
      if (c.t <= 0) { this.smokes.splice(i, 1); if (v && v.cloud === c) { v.g.visible = false; v.cloud = null; } continue; }
      if (v && v.cloud === c) {
        const age = c.t0 - c.t, inK = Math.min(1, age / 0.5), outK = Math.min(1, c.t / SMOKE.fade), o = 0.82 * inK * outK;
        for (const sp of v.puffs) { sp.material.opacity = o; sp.scale.setScalar(sp.userData.s * (0.45 + 0.55 * inK) * (1 + age * 0.02)); sp.material.rotation += dt * 0.15; }
      }
      // なかの ゾンビは みうしなう（ボスは べつ）
      for (const z of this.zombies) {
        if (!z.alive || z.demo || !smokeAffects(z.kind)) continue;
        if (Math.abs(z.y - c.y) < 3 && Math.hypot(z.x - c.x, z.z - c.z) < c.r) z.smokeT = SMOKE.linger;
      }
    }
  },
};
