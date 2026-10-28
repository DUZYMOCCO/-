// v0.12.0: たくさんの ゾンビを かるく かく しくみ
// とおくの ゾンビ → しゅるいごとに 1つの InstancedMesh（てあしは うごかさず ゆらゆら だけ）
// ちかくの ゾンビ → いままでどおりの モデル（ちかい じゅんに すこしだけ ほんものの かげ・ほかは まるい かげ）
import * as THREE from '../vendor/three.module.min.js';
import { zombieLod, zombieEyeGeo, EYE_MAT } from './models.js?v=38';
import { lodPlan, GOV_LEVELS } from './rules.js?v=38';

const CAP = 64;            // しゅるいごとの かず（こえたら ちゃんとした モデルで かく）
const BLOB_CAP = 160;
const _m = new THREE.Matrix4(), _e = new THREE.Matrix4(), _q = new THREE.Quaternion(), _eu = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _sp = new THREE.Sphere(), _fr = new THREE.Frustum(), _pm = new THREE.Matrix4();
const _order = [], _full = [];

// いつも ちゃんとした モデルで かく ばあい（うごきが だいじ・ちかくで みえる）
export function needsFull(z) {
  return !z.alive || !!z.fly || !!z.climb || !!z.flashOn || !!z.slam || !!z.charge || !!z.chargeWind || !!z.leap || z.fuse > 0 || z.scream > 0
    || z.kind === 'boss' || z.state === 'attack' || !!z.demo || z.down > 0;
}

export class Crowd {
  constructor(scene) {
    this.scene = scene; this.byKind = {};
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0c2208 });
    this.eyes = new THREE.InstancedMesh(zombieEyeGeo(), EYE_MAT, CAP * 4);
    this.eyes.frustumCulled = false; this.eyes.count = 0; scene.add(this.eyes);
    const bg = new THREE.CircleGeometry(0.42, 14); bg.rotateX(-Math.PI / 2);
    this.blob = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false }), BLOB_CAP);
    this.blob.frustumCulled = false; this.blob.count = 0; this.blob.renderOrder = 1; scene.add(this.blob);
    this.cfg = GOV_LEVELS[0]; this.blobsOn = true;
    this.stats = { full: 0, lod: 0, culled: 0, shadow: 0 };
  }
  kindMesh(kind) {
    let k = this.byKind[kind];
    if (!k) {
      const lod = zombieLod(kind);
      const mesh = new THREE.InstancedMesh(lod.geo, this.mat, CAP);
      mesh.frustumCulled = false; mesh.count = 0; mesh.castShadow = false; mesh.receiveShadow = true;
      this.scene.add(mesh);
      k = this.byKind[kind] = { mesh, eyeM: lod.eyeM, n: 0 };
    }
    return k;
  }
  setShadow(m, on) {
    if ((m.shadowOn !== false) === on) return;
    m.shadowOn = on;
    for (const mm of m.meshes) mm.castShadow = on;
  }
  // zs: ゾンビ, cam: カメラ, px/pz: プレイヤー
  update(zs, cam, px, pz, fogFar) {
    const cfg = this.cfg, stats = this.stats;
    for (const k in this.byKind) this.byKind[k].n = 0;
    let ne = 0, nb = 0; stats.full = stats.lod = stats.culled = stats.shadow = 0;
    for (const z of zs) { z.d = Math.hypot(z.x - px, z.z - pz); z.force = needsFull(z); }
    lodPlan(zs, cfg.near, cfg.lod, _order);
    cam.updateMatrixWorld(); _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
    const cx = cam.position.x, cz = cam.position.z, far2 = (fogFar + 2) * (fogFar + 2);
    _full.length = 0;
    const t = performance.now() * 0.001;
    for (const z of zs) {
      const m = z.model;
      if (!z.full) {
        const k = this.kindMesh(z.lk || z.kind);
        if (k.n >= CAP) z.full = true; // いっぱい → ちゃんとした モデルで
      }
      if (z.full) {
        if (z.lodOn) { z.lodOn = false; this.scene.add(m.root); } // もどす
        if (z.alive) _full.push(z);
        else this.setShadow(m, false);
        stats.full++;
        continue;
      }
      if (!z.lodOn) { z.lodOn = true; this.scene.remove(m.root); this.setShadow(m, false); } // シーンから はずす（行列の けいさんも しない）
      if (z.vis === false) { stats.culled++; continue; }
      const dx = z.x - cx, dz = z.z - cz;
      if (dx * dx + dz * dz > far2) { stats.culled++; continue; } // きりの むこう: みえない
      _sp.center.set(z.x, z.y + 0.9 * z.scale, z.z); _sp.radius = 1.3 * z.scale;
      if (!_fr.intersectsSphere(_sp)) { stats.culled++; continue; }
      const k = this.byKind[z.lk || z.kind];
      const moving = z.state === 'walk';
      const sw = moving ? Math.sin(z.phase) : 0;
      _eu.set(z.kind === 'crawler' ? 0 : -0.06, z.yaw, sw * 0.07 + (z.state === 'idle' ? Math.sin(t * 2 + z.phase) * 0.03 : 0));
      _q.setFromEuler(_eu);
      _p.set(z.x, z.y + Math.abs(sw) * 0.05, z.z); _s.setScalar(z.scale);
      _m.compose(_p, _q, _s);
      k.mesh.setMatrixAt(k.n++, _m);
      if (ne < this.eyes.instanceMatrix.count) { _e.multiplyMatrices(_m, k.eyeM); this.eyes.setMatrixAt(ne++, _e); }
      if (this.blobsOn && nb < BLOB_CAP) { _p.y = z.y + 0.03; _s.setScalar(z.scale); _q.identity(); _m.compose(_p, _q, _s); this.blob.setMatrixAt(nb++, _m); }
      stats.lod++;
    }
    // ちゃんとした モデル: ちかい じゅんに shadow たいだけ ほんものの かげ
    _full.sort((a, b) => a.d - b.d);
    for (let i = 0; i < _full.length; i++) {
      const z = _full[i], on = this.blobsOn && i < cfg.shadow;
      this.setShadow(z.model, on);
      if (on) stats.shadow++;
      else if (this.blobsOn && nb < BLOB_CAP && z.model.root.visible && z.y >= 0) { _p.set(z.x, z.y + 0.03, z.z); _s.setScalar(z.scale); _q.identity(); _m.compose(_p, _q, _s); this.blob.setMatrixAt(nb++, _m); }
    }
    for (const kk in this.byKind) { const k = this.byKind[kk]; k.mesh.count = k.n; k.mesh.visible = k.n > 0; if (k.n) k.mesh.instanceMatrix.needsUpdate = true; }
    this.eyes.count = ne; this.eyes.visible = ne > 0; if (ne) this.eyes.instanceMatrix.needsUpdate = true;
    this.blob.count = nb; this.blob.visible = nb > 0; if (nb) this.blob.instanceMatrix.needsUpdate = true;
  }
  // さいしょに つくっておく（はじめて でた ときに カクッと しない）
  warm(kinds) { for (const k of kinds) this.kindMesh(k); }
}
