// こうか: マズルフラッシュ・トレーサー・やっきょう・つぶ（みどりの しぶき／けむり）・しみ（みどり）・だんこん
import * as THREE from '../vendor/three.module.min.js';
import { makeMagMesh } from './models.js?v=9';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);

export class FX {
  constructor(scene, tex, { groundAt }) {
    this.scene = scene; this.groundAt = groundAt;
    // つぶ（InstancedMesh 1こ）
    this.maxP = 520;
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
    this.lightDecay = 120; this.lightBoost = 1;
    // ばくはつ: ひかりの たま・じめんの わ（プール）
    this.booms = [];
    const bMat = () => new THREE.SpriteMaterial({ map: tex.flash, color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const rGeo = new THREE.RingGeometry(0.7, 1, 28); rGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(bMat()); sp.visible = false; scene.add(sp);
      const ring = new THREE.Mesh(rGeo, new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.visible = false; scene.add(ring);
      this.booms.push({ sp, ring, life: 0, r: 1 });
    }
    this.bi = 0;
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
    // ブロックの かけら（ばくはつで くだけた ゾンビ。InstancedMesh 1こ）
    this.maxChunks = 160;
    this.cMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), this.maxChunks);
    this.cMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cMesh.setColorAt(0, _c.set(0xffffff));
    this.cMesh.frustumCulled = false; this.cMesh.count = 0; this.cMesh.castShadow = false;
    scene.add(this.cMesh);
    this.chunkList = [];
    this.splats = mk(tex.splats, 24, 1); this.si = 0;
    this.holes = mk(tex.hole, 40, 0.12); this.hi = 0;
  }

  // ---- つぶ ----
  burst(pos, n, { color = 0x55d23a, color2 = null, speed = 3, up = 2, size = 0.07, life = 0.5, gravity = 12, dir = null, spread = 1, grow = 0, drag = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= this.maxP) this.parts.shift();
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2).multiplyScalar(speed * spread);
      if (dir) v.addScaledVector(dir, speed * (0.6 + Math.random() * 0.8));
      v.y += up * Math.random();
      this.parts.push({ p: pos.clone(), v, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random() * 0.8), col: (color2 && Math.random() < 0.4) ? color2 : color, g: gravity, grow, drag });
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

  // ---- ばくはつ（はでに！）----
  explosion(pos, radius = 4.5) {
    const b = this.booms[this.bi++ % this.booms.length];
    b.sp.position.copy(pos); b.sp.position.y = Math.max(0.8, pos.y);
    b.ring.position.set(pos.x, this.groundAt(pos.x, pos.z, pos.y + 0.5) + 0.06, pos.z);
    b.life = b.max = 0.42; b.r = radius; b.sp.visible = b.ring.visible = true;
    const p = _p.copy(pos); p.y = Math.max(0.3, p.y);
    this.burst(p, 34, { color: 0xffd060, color2: 0xff8a1f, speed: 5.5, up: 3, size: 0.42, life: 0.42, gravity: -3, drag: 3 });   // ほのお
    this.burst(p, 10, { color: 0xfff4c8, speed: 3, up: 1.5, size: 0.6, life: 0.2, gravity: 0, drag: 4 });                         // まんなかの ひかり
    this.burst(p, 18, { color: 0x6b6b6b, color2: 0x9a9a9a, speed: 2.4, up: 3, size: 0.5, life: 1.4, gravity: -2.2, grow: 1.6, drag: 2 }); // けむり
    this.burst(p, 18, { color: 0x8a5a32, color2: 0x8d857a, speed: 6.5, up: 8, size: 0.17, life: 1.5, gravity: 18 });              // がれき（はこ・つち）
    this.burst(p, 16, { color: 0xfff0a0, speed: 11, up: 3, size: 0.05, life: 0.35, gravity: 6 });                                  // ひばな
    this.light.position.copy(p); this.light.position.y += 1;
    this.light.distance = 18; this.light.intensity = 70 * this.lightBoost; this.lightDecay = 160;
    // こげあと（すすの しみ）
    const d = this.holes[this.hi++ % this.holes.length];
    d.m.position.set(pos.x, this.groundAt(pos.x, pos.z, pos.y + 0.5) + 0.03, pos.z);
    d.m.quaternion.setFromUnitVectors(FWD, UP); d.m.scale.setScalar(radius * 0.75);
    d.life = d.max = 10; d.m.material.opacity = 0.8; d.m.visible = true;
  }
  // ロケットの けむりの すじ
  trail(pos, dir) {
    this.burst(pos, 1, { color: 0xb8b8b8, color2: 0xe0e0e0, speed: 0.25, up: 0.2, size: 0.2, life: 0.9, gravity: -0.6, grow: 1.4, drag: 1.5 });
    this.burst(pos, 1, { color: 0xffb040, speed: 0.4, up: 0, size: 0.12, life: 0.12, gravity: 0, dir, spread: 0.3 });
  }
  // うしろの ふきだし（ロケット はっしゃ）
  backblast(pos, dir) {
    this.burst(pos, 7, { color: 0xd0d0d0, color2: 0x9a9a9a, speed: 3.2, up: 0.3, size: 0.2, life: 0.45, gravity: -0.5, grow: 0.9, drag: 4, dir, spread: 0.35 });
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
    if (this.lightDecay > 120 && this.light.intensity > 8) return; // ばくはつの ひかりを けさない
    this.light.position.copy(this.flash.position);
    this.light.distance = 9 * (this.lightBoost > 1 ? 1.4 : 1); this.lightDecay = 120;
    this.light.intensity = 6 * scale * this.lightBoost;
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

  // ---- ブロックに くだける（ばくはつ）----
  // colors: [[いろ, ぶい]]（ぶい 0=あし 1=からだ 2=あたま 3=うで）、v: ふっとぶ はやさ {vx,vy,vz}
  shatter(x, y, z, scale, yaw, colors, v, n = 16) {
    const room = this.maxChunks - this.chunkList.length;
    if (room < n) this.chunkList.splice(0, n - room); // ふるい ものから けす
    const band = [[0.05, 0.7], [0.75, 1.4], [1.45, 1.95], [0.9, 1.4]];
    for (let i = 0; i < n; i++) {
      const [col, part] = colors[i % colors.length];
      const [y0, y1] = band[part];
      const lx = (Math.random() - 0.5) * (part === 3 ? 0.9 : 0.5), lz = (Math.random() - 0.5) * 0.35;
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      const p = new THREE.Vector3(x + (lx * c + lz * sn) * scale, y + (y0 + Math.random() * (y1 - y0)) * scale, z + (-lx * sn + lz * c) * scale);
      const k = 0.45 + Math.random() * 0.7;
      const vel = new THREE.Vector3(v.vx * k + (Math.random() - 0.5) * 5, v.vy * (0.5 + Math.random() * 0.7) + Math.random() * 3, v.vz * k + (Math.random() - 0.5) * 5);
      // うえの ぶぶんほど たかく とぶ
      vel.y += (p.y - y) * 1.2;
      const size = (part === 2 ? 0.2 : 0.15 + Math.random() * 0.12) * scale;
      this.chunkList.push({ p, v: vel, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, 0)),
        av: new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16),
        size, col, life: 2.2 + Math.random() * 1.0, bounces: 0, rest: false });
    }
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
    d.m.quaternion.setFromUnitVectors(FWD, normal); d.m.scale.setScalar(0.12);
    d.life = d.max = 8; d.m.material.opacity = 1; d.m.visible = true;
  }

  update(dt) {
    // つぶ
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life -= dt;
      if (q.life <= 0) { this.parts.splice(i, 1); continue; }
      q.v.y -= q.g * dt; if (q.drag) q.v.multiplyScalar(Math.exp(-q.drag * dt)); q.p.addScaledVector(q.v, dt);
      if (q.p.y < 0.02 && q.g > 0) { q.p.y = 0.02; q.v.multiplyScalar(0.4); q.v.y = 0; }
    }
    for (const q of this.parts) {
      const k = q.grow ? Math.min(1, q.life / (q.max * 0.35)) * (1 + (1 - q.life / q.max) * q.grow) : Math.min(1, q.life / (q.max * 0.5));
      _s.setScalar(q.size * k);
      _m.compose(q.p, _q.identity(), _s);
      this.pMesh.setMatrixAt(n, _m);
      this.pMesh.setColorAt(n, _c.set(q.col));
      n++;
    }
    this.pMesh.count = n;
    this.pMesh.instanceMatrix.needsUpdate = true;
    if (this.pMesh.instanceColor) this.pMesh.instanceColor.needsUpdate = true;
    // ブロックの かけら: じゅうりょく・はねる・くるくる・ちいさく なって きえる
    if (this.chunkList.length || this.cMesh.count) {
      let k = 0;
      const _e2 = this._e2 || (this._e2 = new THREE.Euler()), _q2 = this._q2 || (this._q2 = new THREE.Quaternion());
      for (let i = this.chunkList.length - 1; i >= 0; i--) {
        const c = this.chunkList[i];
        c.life -= dt;
        if (c.life <= 0) { this.chunkList.splice(i, 1); continue; }
        if (!c.rest) {
          c.v.y -= 20 * dt; c.p.addScaledVector(c.v, dt);
          const gy = this.groundAt(c.p.x, c.p.z, c.p.y + 0.3) + c.size * 0.5;
          if (c.p.y < gy) {
            c.p.y = gy;
            if (c.bounces++ < 3 && c.v.y < -2) { c.v.y = -c.v.y * 0.38; c.v.x *= 0.6; c.v.z *= 0.6; c.av.multiplyScalar(0.6); }
            else { c.v.set(0, 0, 0); c.rest = true; }
          }
          _q2.setFromEuler(_e2.set(c.av.x * dt, c.av.y * dt, c.av.z * dt)); c.q.multiply(_q2);
        }
      }
      for (const c of this.chunkList) {
        const sh = Math.min(1, c.life / 0.5);
        _s.setScalar(c.size * sh);
        _m.compose(c.p, c.q, _s);
        this.cMesh.setMatrixAt(k, _m); this.cMesh.setColorAt(k, _c.set(c.col)); k++;
      }
      this.cMesh.count = k;
      this.cMesh.instanceMatrix.needsUpdate = true;
      if (this.cMesh.instanceColor) this.cMesh.instanceColor.needsUpdate = true;
    }
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
    this.light.intensity = Math.max(0, this.light.intensity - dt * this.lightDecay * Math.max(1, this.light.intensity / 20));
    for (const b of this.booms) {
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0) { b.sp.visible = b.ring.visible = false; continue; }
      const t = 1 - b.life / b.max;
      const s = b.r * (0.9 + Math.sqrt(t) * 1.6);
      b.sp.scale.set(s, s, 1); b.sp.material.opacity = (1 - t) * (1 - t);
      b.sp.material.rotation = t * 0.6;
      const rs = b.r * (0.3 + t * 1.3); b.ring.scale.set(rs, 1, rs); b.ring.material.opacity = (1 - t) * 0.8;
    }
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
