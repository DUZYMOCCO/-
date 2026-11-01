import * as THREE from 'three';
import { BLOOD_DECAL_CAP, addDecal, bleedRate, bloodPoolColor, bloodPoolRoughness, fluidColor } from './blood_logic.js';
import { bodyFluid } from '../sim/body_fluid.js';

// Fixed-size particles and decals; all randomness is cosmetic only.
export function createBlood(scene, heightAt) {
  const cap = 160, coords = new Float32Array(cap * 3), particles = [];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  const colors = new Float32Array(cap * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, vertexColors: true, size: 0.095, transparent: true, opacity: 0.92, depthWrite: false }));
  points.frustumCulled = false; scene.add(points);
  const disk = new THREE.CircleGeometry(1, 10), decals = [], snapshots = new Map(), clocks = new Map();
  function particle(x, y, z, spray, fluid) {
    if (particles.length >= cap) particles.shift();
    particles.push({ x, y, z, vx: (Math.random() - .5) * (spray ? 2.6 : .12), vy: spray ? .7 + Math.random() * 1.8 : -.15, vz: (Math.random() - .5) * (spray ? 2.6 : .12), life: spray ? .7 : .5, color: fluidColor(fluid) });
  }
  function pool(a, trail = 0) {
    let mesh;
    if (decals.length >= BLOOD_DECAL_CAP) { mesh = decals[0].mesh; }
    else {
      mesh = new THREE.Mesh(disk, new THREE.MeshStandardMaterial({ color: 0x70060a, roughness: .72, transparent: true, opacity: .78, depthWrite: false, side: THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2; scene.add(mesh);
    }
    const x = a.x - Math.sin(a.rot || 0) * trail + (Math.random() - .5) * .18;
    const z = a.z - Math.cos(a.rot || 0) * trail + (Math.random() - .5) * .18;
    mesh.position.set(x, heightAt(x, z) + .035, z);
    const fluid = bodyFluid(a);
    mesh.scale.setScalar(trail ? .2 + Math.random() * .06 : (fluid === 'oil' ? .58 : .5) + Math.random() * .12);
    mesh.material.color.setHex(bloodPoolColor(fluid));
    mesh.material.roughness = bloodPoolRoughness(fluid);
    mesh.material.opacity = fluid === 'oil' ? .9 : .82; mesh.visible = true;
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
      const ground = heightAt(a.x, a.z), down = a.state === 'down' || a.state === 'dead', fluid = bodyFluid(a);
      if (hit > 0 && bleedRate(a) > 0) for (let i = 0; i < Math.min(12, 4 + Math.ceil(hit / 3)); i++) particle(a.x, ground + (down ? .3 : 1.05), a.z, true, fluid);
      const rate = bleedRate(a);
      if (rate <= 0 || a.state === 'dead' || a.carriedBy != null) { clocks.delete(a.id); continue; }
      const c = clocks.get(a.id) || { drip: 0, pool: 0, wasDown: false };
      if (down && !c.wasDown) {
        pool(a);
        pool(a, .48);
        pool(a, .96);
      }
      c.wasDown = down;
      c.drip += dt * Math.min(9, .7 + rate * 4);
      if (c.drip >= 1) { c.drip %= 1; particle(a.x, ground + (down ? .3 : .8), a.z, false, fluid); }
      if (down) { c.pool += dt * Math.min(3, .25 + rate); if (c.pool >= 1) { c.pool %= 1; pool(a); } }
      else c.pool = 0;
      if (!down && old && (a.crawling || a.movedThisTick || a.movedRunThisTick || a.movedCarry) && (old.x !== a.x || old.z !== a.z)) {
        const distance = Math.hypot(a.x - (c.trailX ?? old.x ?? a.x), a.z - (c.trailZ ?? old.z ?? a.z));
        c.trailDist = (c.trailDist || 0) + distance;
        if (c.trailDist >= 1.2) { c.trailDist = 0; pool(a); }
      }
      c.trailX = a.x; c.trailZ = a.z;
      clocks.set(a.id, c);
    }
    for (const id of snapshots.keys()) if (!alive.has(id)) { snapshots.delete(id); clocks.delete(id); }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; p.vy -= 5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.life <= 0 || p.y < heightAt(p.x, p.z)) particles.splice(i, 1);
    }
    for (let i = 0; i < cap; i++) { const p = particles[i]; coords[i * 3] = p?.x || 0; coords[i * 3 + 1] = p?.y || -10000; coords[i * 3 + 2] = p?.z || 0; const color = new THREE.Color(p?.color ?? 0x000000); colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    for (let i = decals.length - 1; i >= 0; i--) { const d = decals[i]; d.age += dt; d.mesh.material.opacity = .72 * Math.max(0, 1 - d.age / 45); if (d.age >= 45) { d.mesh.visible = false; scene.remove(d.mesh); d.mesh.material.dispose(); decals.splice(i, 1); } }
  }
  return {
    update,
    resetActor(id, actor) {
      if (actor?.parts) snapshots.set(id, Object.fromEntries(Object.entries(actor.parts).map(([key, part]) => [key, part.hp])));
      if (actor?.state === 'down' && bleedRate(actor) > 0) {
        pool(actor);
        pool(actor, .48);
        pool(actor, .96);
        clocks.set(id, { drip: 0, pool: 0, wasDown: true, trailX: actor.x, trailZ: actor.z });
      } else clocks.delete(id);
    },
    inspectPools: () => decals.map(({ mesh }) => ({
      addedToScene: mesh.parent === scene,
      color: mesh.material.color.getHex(),
      roughness: mesh.material.roughness,
      opacity: mesh.material.opacity,
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
    })),
  };
}
