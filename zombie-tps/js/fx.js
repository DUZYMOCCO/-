// こうか: マズルフラッシュ・トレーサー・やっきょう・つぶ（みどりの しぶき／けむり）・しみ（みどり）・だんこん
import * as THREE from '../vendor/three.module.min.js';
import { makeMagMesh } from './models.js?v=1';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);

export class FX {
  constructor(scene, tex, { groundAt }) {
    this.scene = scene; this.groundAt = groundAt;
    // つぶ（InstancedMesh 1こ）
    this.maxP = 360;
    this.pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), this.maxP);
    this.pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pMesh.setColorAt(0, _c.set(0xffffff));
    this.pMesh.frustumCulled = false; this.pMesh.count = 0;
    scene.add(this.pMesh);
    this.parts = [];
    // トレーサー
    const trMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const trGeo = new THREE.BoxGeometry(0.035, 0.035, 1); trGeo.translate(0, 0, -0.5);
    this.tracers = [];
    for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(trGeo, trMat); m.visible = false; m.frustumCulled = false; scene.add(m); this.tracers.push({ m, life: 0 }); }
    // マズルフラッシュ
    const fMat = new THREE.MeshBasicMaterial({ map: tex.flash, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.flash = new THREE.Group();
    const plane = new THREE.PlaneGeometry(1, 1);
    const f1 = new THREE.Mesh(plane, fMat); this.flash.add(f1);            // まえむき
    const f2 = new THREE.Mesh(plane, fMat); f2.rotation.y = Math.PI / 2; f2.scale.set(1.8, 0.7, 1); f2.position.z = -0.35; this.flash.add(f2);
    const f3 = new THREE.Mesh(plane, fMat); f3.rotation.set(Math.PI / 2, 0, 0); f3.scale.set(0.7, 1.8, 1); f3.position.z = -0.35; this.flash.add(f3);
    this.flash.visible = false; scene.add(this.flash);
    this.flashLife = 0;
    this.light = new THREE.PointLight(0xffc070, 0, 9, 1.6); scene.add(this.light);
    // やっきょう
    this.casingGeo = { rifle: new THREE.BoxGeometry(0.018, 0.018, 0.055), pistol: new THREE.BoxGeometry(0.016, 0.016, 0.03), shotgun: new THREE.BoxGeometry(0.03, 0.03, 0.07) };
    this.casingMat = { rifle: new THREE.MeshLambertMaterial({ color: 0xd9a63c, emissive: 0x3a2a08 }), pistol: new THREE.MeshLambertMaterial({ color: 0xd9a63c, emissive: 0x3a2a08 }), shotgun: new THREE.MeshLambertMaterial({ color: 0xc0392b }) };
    this.casings = [];
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(this.casingGeo.rifle, this.casingMat.rifle); m.visible = false; scene.add(m); this.casings.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 }); }
    this.ci = 0;
    // おちる マガジン
    this.mags = [];
    for (let i = 0; i < 4; i++) { const m = makeMagMesh(); m.visible = false; scene.add(m); this.mags.push({ m, v: new THREE.Vector3(), life: 0 }); }
    this.mi = 0;
    // しみ（みどり）・だんこん
    this.decals = [];
    const dGeo = new THREE.PlaneGeometry(1, 1);
    const mk = (map, n, size) => {
      const arr = [];
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshBasicMaterial({ map: Array.isArray(map) ? map[i % map.length] : map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        const m = new THREE.Mesh(dGeo, mat); m.visible = false; m.scale.setScalar(size); m.renderOrder = 1; scene.add(m);
        arr.push({ m, life: 0, max: 1 });
      }
      return arr;
    };
    this.splats = mk(tex.splats, 24, 1); this.si = 0;
    this.holes = mk(tex.hole, 40, 0.12); this.hi = 0;
  }

  // ---- つぶ ----
  burst(pos, n, { color = 0x55d23a, color2 = null, speed = 3, up = 2, size = 0.07, life = 0.5, gravity = 12, dir = null, spread = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= this.maxP) this.parts.shift();
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2).multiplyScalar(speed * spread);
      if (dir) v.addScaledVector(dir, speed * (0.6 + Math.random() * 0.8));
      v.y += up * Math.random();
      this.parts.push({ p: pos.clone(), v, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random() * 0.8), col: (color2 && Math.random() < 0.4) ? color2 : color, g: gravity });
    }
  }

  // みどりの しぶき（ヒット）
  greenHit(pos, dir, head) {
    this.burst(pos, head ? 22 : 14, { color: 0x45c932, color2: 0xa6f26e, speed: head ? 2.8 : 2.2, up: 2.4, size: head ? 0.12 : 0.1, life: 0.6, dir, spread: 0.75 });
  }
  // ポン！と きえる（しんだ ゾンビ）
  poof(pos, scale = 1) {
    this.burst(pos, 22, { color: 0xeaf7e0, color2: 0x7ee35a, speed: 1.6 * scale, up: 1.5, size: 0.16 * scale, life: 0.7, gravity: -1.5 });
  }
  dust(pos, normal) {
    this.burst(pos, 6, { color: 0xbdb3a0, color2: 0x8d857a, speed: 1.2, up: 0.6, size: 0.05, life: 0.4, dir: normal, gravity: 4 });
    this.burst(pos, 2, { color: 0xffd27a, speed: 2.5, up: 0.5, size: 0.025, life: 0.15, dir: normal, gravity: 0 });
  }

  // ---- トレーサー ----
  tracer(from, to) {
    const t = this.tracers.find((x) => x.life <= 0) || this.tracers[0];
    const d = _p.subVectors(to, from); const len = d.length();
    if (len < 0.5) return;
    t.from = from.clone(); t.dir = d.clone().divideScalar(len); t.len = len; t.pos = 0; t.life = 1;
    t.m.visible = true;
    t.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), t.dir);
  }

  muzzle(muzzleObj, scale = 1) {
    muzzleObj.getWorldPosition(this.flash.position);
    muzzleObj.getWorldQuaternion(this.flash.quaternion);
    const s = (0.35 + Math.random() * 0.25) * scale;
    this.flash.scale.setScalar(s);
    this.flash.children[0].rotation.z = Math.random() * Math.PI;
    this.flash.visible = true; this.flashLife = 0.045;
    this.light.position.copy(this.flash.position);
    this.light.intensity = 6 * scale;
  }

  casing(ejectObj, kind, rightDir) {
    const c = this.casings[this.ci++ % this.casings.length];
    ejectObj.getWorldPosition(c.m.position);
    c.m.geometry = this.casingGeo[kind] || this.casingGeo.rifle;
    c.m.material = this.casingMat[kind] || this.casingMat.rifle;
    c.v.copy(rightDir).multiplyScalar(2.2 + Math.random() * 1.2); c.v.y += 1.8 + Math.random() * 1.2;
    c.v.x += (Math.random() - 0.5) * 0.6; c.v.z += (Math.random() - 0.5) * 0.6;
    c.spin.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);
    c.life = 2.2; c.m.visible = true; c.bounces = 0;
  }

  dropMag(fromObj) {
    const g = this.mags[this.mi++ % this.mags.length];
    fromObj.getWorldPosition(g.m.position); fromObj.getWorldQuaternion(g.m.quaternion);
    g.v.set((Math.random() - 0.5) * 0.4, -0.5, (Math.random() - 0.5) * 0.4); g.life = 3; g.m.visible = true; g.rest = false;
  }

  // ---- しみ（じめん／かべ） ----
  splat(pos, normal = UP, size = 1) {
    const d = this.splats[this.si++ % this.splats.length];
    d.m.position.copy(pos).addScaledVector(normal, 0.02);
    d.m.quaternion.setFromUnitVectors(FWD, normal);
    d.m.rotateZ(Math.random() * Math.PI * 2);
    d.m.scale.setScalar(size * (0.7 + Math.random() * 0.5));
    d.life = d.max = 6; d.m.material.opacity = 0.9; d.m.visible = true;
  }
  hole(pos, normal) {
    const d = this.holes[this.hi++ % this.holes.length];
    d.m.position.copy(pos).addScaledVector(normal, 0.01);
    d.m.quaternion.setFromUnitVectors(FWD, normal);
    d.life = d.max = 8; d.m.material.opacity = 1; d.m.visible = true;
  }

  update(dt) {
    // つぶ
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life -= dt;
      if (q.life <= 0) { this.parts.splice(i, 1); continue; }
      q.v.y -= q.g * dt; q.p.addScaledVector(q.v, dt);
      if (q.p.y < 0.02 && q.g > 0) { q.p.y = 0.02; q.v.multiplyScalar(0.4); q.v.y = 0; }
    }
    for (const q of this.parts) {
      const k = Math.min(1, q.life / (q.max * 0.5));
      _s.setScalar(q.size * k);
      _m.compose(q.p, _q.identity(), _s);
      this.pMesh.setMatrixAt(n, _m);
      this.pMesh.setColorAt(n, _c.set(q.col));
      n++;
    }
    this.pMesh.count = n;
    this.pMesh.instanceMatrix.needsUpdate = true;
    if (this.pMesh.instanceColor) this.pMesh.instanceColor.needsUpdate = true;
    // トレーサー（はやく とぶ）
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.pos += dt * 260;
      const segLen = Math.min(3.5, t.len * 0.5);
      const head = Math.min(t.pos, t.len), tail = Math.max(0, t.pos - segLen);
      if (tail >= t.len) { t.life = 0; t.m.visible = false; continue; }
      t.m.position.copy(t.from).addScaledVector(t.dir, head);
      t.m.scale.set(1, 1, Math.max(0.05, head - tail));
    }
    // フラッシュ
    if (this.flashLife > 0) { this.flashLife -= dt; if (this.flashLife <= 0) { this.flash.visible = false; } }
    this.light.intensity = Math.max(0, this.light.intensity - dt * 120);
    // やっきょう
    for (const c of this.casings) {
      if (c.life <= 0) continue;
      c.life -= dt;
      if (c.life <= 0) { c.m.visible = false; continue; }
      c.v.y -= 14 * dt; c.m.position.addScaledVector(c.v, dt);
      const gy = this.groundAt(c.m.position.x, c.m.position.z, c.m.position.y) + 0.01;
      if (c.m.position.y < gy) {
        c.m.position.y = gy;
        if (c.bounces++ < 2) { c.v.y = Math.abs(c.v.y) * 0.35; c.v.x *= 0.5; c.v.z *= 0.5; c.spin.multiplyScalar(0.5); }
        else { c.v.set(0, 0, 0); c.spin.set(0, 0, 0); }
      }
      c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
    }
    for (const g of this.mags) {
      if (g.life <= 0) continue;
      g.life -= dt;
      if (g.life <= 0) { g.m.visible = false; continue; }
      if (!g.rest) {
        g.v.y -= 12 * dt; g.m.position.addScaledVector(g.v, dt); g.m.rotation.x += dt * 3;
        const gy = this.groundAt(g.m.position.x, g.m.position.z, g.m.position.y) + 0.03;
        if (g.m.position.y < gy) { g.m.position.y = gy; g.rest = true; g.m.rotation.set(Math.PI / 2, g.m.rotation.y, 0); }
      }
    }
    for (const arr of [this.splats, this.holes]) for (const d of arr) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) { d.m.visible = false; continue; }
      d.m.material.opacity = Math.min(1, d.life / (d.max * 0.4)) * 0.9;
    }
  }
}
