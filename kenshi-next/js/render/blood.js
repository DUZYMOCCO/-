import * as THREE from 'three';
import { BLOOD_DECAL_CAP, addDecal, bleedRate } from './blood_logic.js';

// Fixed-size particles and decals; all randomness is cosmetic only.
export function createBlood(scene, heightAt) {
  const cap = 160, coords = new Float32Array(cap * 3), particles = [];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb20d12, size: 0.095, transparent: true, opacity: 0.92, depthWrite: false }));
  points.frustumCulled = false; scene.add(points);
  const disk = new THREE.CircleGeometry(1, 10), decals = [], snapshots = new Map(), clocks = new Map();
  function particle(x, y, z, spray) {
    if (particles.length >= cap) particles.shift();
    particles.push({ x, y, z, vx: (Math.random() - .5) * (spray ? 2.6 : .12), vy: spray ? .7 + Math.random() * 1.8 : -.15, vz: (Math.random() - .5) * (spray ? 2.6 : .12), life: spray ? .7 : .5 });
  }
  function pool(a) {
    let mesh;
    if (decals.length >= BLOOD_DECAL_CAP) { mesh = decals[0].mesh; }
    else {
      mesh = new THREE.Mesh(disk, new THREE.MeshBasicMaterial({ color: 0x70060a, transparent: true, opacity: .72, depthWrite: false, side: THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2; scene.add(mesh);
    }
    const x = a.x + (Math.random() - .5) * .35, z = a.z + (Math.random() - .5) * .35;
    mesh.position.set(x, heightAt(x, z) + .035, z);
    mesh.scale.setScalar(.28 + Math.random() * .25);
    mesh.material.opacity = .72; mesh.visible = true;
    addDecal(decals, { mesh, age: 0 });
  }
  function update(state, dt) {
    dt = Math.max(0, Math.min(.1, dt || 0));
    const alive = new Set();
    for (const a of state.actors || []) {
      alive.add(a.id);
      const old = snapshots.get(a.id), current = {};
      let hit = 0;
      for (const [key, p] of Object.entries(a.parts || {})) { current[key] = p.hp; if (old && Number.isFinite(old[key])) hit += Math.max(0, old[key] - p.hp); }
      snapshots.set(a.id, current);
      const ground = heightAt(a.x, a.z), down = a.state === 'down' || a.state === 'dead';
      if (hit > 0 && bleedRate(a) > 0) for (let i = 0; i < Math.min(12, 4 + Math.ceil(hit / 3)); i++) particle(a.x, ground + (down ? .3 : 1.05), a.z, true);
      const rate = bleedRate(a);
      if (rate <= 0 || a.state === 'dead' || a.carriedBy != null) { clocks.delete(a.id); continue; }
      const c = clocks.get(a.id) || { drip: 0, pool: 0 };
      c.drip += dt * Math.min(9, .7 + rate * 4);
      if (c.drip >= 1) { c.drip %= 1; particle(a.x, ground + (down ? .3 : .8), a.z, false); }
      if (down) { c.pool += dt * Math.min(3, .25 + rate); if (c.pool >= 1) { c.pool %= 1; pool(a); } }
      else c.pool = 0;
      clocks.set(a.id, c);
    }
    for (const id of snapshots.keys()) if (!alive.has(id)) { snapshots.delete(id); clocks.delete(id); }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; p.vy -= 5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.life <= 0 || p.y < heightAt(p.x, p.z)) particles.splice(i, 1);
    }
    for (let i = 0; i < cap; i++) { const p = particles[i]; coords[i * 3] = p?.x || 0; coords[i * 3 + 1] = p?.y || -10000; coords[i * 3 + 2] = p?.z || 0; }
    geo.attributes.position.needsUpdate = true;
    for (let i = decals.length - 1; i >= 0; i--) { const d = decals[i]; d.age += dt; d.mesh.material.opacity = .72 * Math.max(0, 1 - d.age / 45); if (d.age >= 45) { d.mesh.visible = false; scene.remove(d.mesh); d.mesh.material.dispose(); decals.splice(i, 1); } }
  }
  return { update };
}
