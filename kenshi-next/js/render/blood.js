import * as THREE from 'three';
import { BLOOD_DECAL_CAP, addDecal, bleedRate, bloodPoolColor, bloodPoolRoughness, fluidColor } from './blood_logic.js';
import { bodyFluid } from '../sim/body_fluid.js';

// 血の飛沫の形。円をいくつか重ねて、縁を少しゆらした1枚のジオメトリにする
// （ただの丸だと「円盤」に見えるので、しずく・とびちりを混ぜて血糊らしくする）。
function splatGeometry(lobes) {
  const positions = [];
  const colors = [];
  const add = (cx, cz, r, segments = 14) => {
    const rim = [];
    for (let i = 0; i < segments; i += 1) rim.push(r * (0.82 + Math.random() * 0.34));
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      // 中心を濃く、ふちを薄く（溜まっている所と乾いた所の差）
      positions.push(cx, 0, cz);
      colors.push(0.78, 0.78, 0.78);
      positions.push(cx + Math.cos(a0) * rim[i], 0, cz + Math.sin(a0) * rim[i]);
      colors.push(1, 1, 1);
      positions.push(cx + Math.cos(a1) * rim[(i + 1) % segments], 0, cz + Math.sin(a1) * rim[(i + 1) % segments]);
      colors.push(1, 1, 1);
    }
  };
  for (const [cx, cz, r] of lobes) add(cx, cz, r);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function makeSplats(count = 5) {
  const shapes = [];
  for (let s = 0; s < count; s += 1) {
    // 主たる血だまり
    const lobes = [[0, 0, 1]];
    // 飛び散ったしずく
    const drops = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < drops; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const d = 0.62 + Math.random() * 0.8;
      lobes.push([Math.cos(a) * d, Math.sin(a) * d, 0.15 + Math.random() * 0.26]);
    }
    // 細かいとびちり
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i += 1) {
      const a = Math.random() * Math.PI * 2;
      const d = 1.15 + Math.random() * 1.05;
      lobes.push([Math.cos(a) * d, Math.sin(a) * d, 0.045 + Math.random() * 0.075]);
    }
    shapes.push(splatGeometry(lobes));
  }
  return shapes;
}

// Fixed-size particles and decals; all randomness is cosmetic only.
export function createBlood(scene, heightAt) {
  const cap = 160, coords = new Float32Array(cap * 3), particles = [];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  const colors = new Float32Array(cap * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, vertexColors: true, size: 0.085, transparent: true, opacity: 0.92, depthWrite: false }));
  points.frustumCulled = false; scene.add(points);
  const splats = makeSplats(), decals = [], snapshots = new Map(), clocks = new Map();
  function particle(x, y, z, spray, fluid) {
    if (particles.length >= cap) particles.shift();
    particles.push({ x, y, z, vx: (Math.random() - .5) * (spray ? 2.6 : .12), vy: spray ? .7 + Math.random() * 1.8 : -.15, vz: (Math.random() - .5) * (spray ? 2.6 : .12), life: spray ? .7 : .5, color: fluidColor(fluid) });
  }
  function pool(a, trail = 0) {
    let mesh;
    if (decals.length >= BLOOD_DECAL_CAP) { mesh = decals[0].mesh; }
    else {
      mesh = new THREE.Mesh(splats[0], new THREE.MeshStandardMaterial({ color: 0x70060a, roughness: .72, transparent: true, opacity: .78, depthWrite: false, side: THREE.DoubleSide, vertexColors: true }));
      scene.add(mesh);
    }
    const x = a.x - Math.sin(a.rot || 0) * trail + (Math.random() - .5) * .18;
    const z = a.z - Math.cos(a.rot || 0) * trail + (Math.random() - .5) * .18;
    mesh.position.set(x, heightAt(x, z) + .03, z);
    const fluid = bodyFluid(a);
    // 毎回ちがう飛沫の形・向きにする（同じ丸が並ばない）
    mesh.geometry = splats[Math.floor(Math.random() * splats.length)];
    mesh.rotation.set(-Math.PI / 2, 0, trail ? -(a.rot || 0) : Math.random() * Math.PI * 2);
    const base = (fluid === 'oil' ? .6 : .52) + Math.random() * .14;
    if (trail) {
      // 引きずった跡は進行方向に細長く（円ではなく「すり傷」に見える）
      mesh.scale.set(base * .42, base * 1.25, 1);
    } else {
      mesh.scale.set(base * (.86 + Math.random() * .32), base * (.86 + Math.random() * .32), 1);
    }
    mesh.material.color.setHex(bloodPoolColor(fluid));
    mesh.material.roughness = bloodPoolRoughness(fluid);
    mesh.material.opacity = fluid === 'oil' ? .9 : .8; mesh.visible = true;
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
      // 血しぶきは控えめに（数より形で見せる）
      if (hit > 0 && bleedRate(a) > 0) for (let i = 0; i < Math.min(7, 2 + Math.round(hit / 5)); i++) particle(a.x, ground + (down ? .3 : 1.05), a.z, true, fluid);
      const rate = bleedRate(a);
      if (rate <= 0 || a.state === 'dead' || a.carriedBy != null) { clocks.delete(a.id); continue; }
      const c = clocks.get(a.id) || { drip: 0, pool: 0, wasDown: false };
      if (down && !c.wasDown) {
        pool(a);
        pool(a, .55);
      }
      c.wasDown = down;
      c.drip += dt * Math.min(4.5, .35 + rate * 1.8);
      if (c.drip >= 1) { c.drip %= 1; particle(a.x, ground + (down ? .3 : .8), a.z, false, fluid); }
      if (down) { c.pool += dt * Math.min(1.1, .1 + rate * .5); if (c.pool >= 1) { c.pool %= 1; pool(a); } }
      else c.pool = 0;
      if (!down && old && (a.crawling || a.movedThisTick || a.movedRunThisTick || a.movedCarry) && (old.x !== a.x || old.z !== a.z)) {
        const distance = Math.hypot(a.x - (c.trailX ?? old.x ?? a.x), a.z - (c.trailZ ?? old.z ?? a.z));
        c.trailDist = (c.trailDist || 0) + distance;
        if (c.trailDist >= 2.2) { c.trailDist = 0; pool(a); }
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
    // 血糊はゆっくり乾く（長く残すので、数は少なくて済む）
    for (let i = decals.length - 1; i >= 0; i--) { const d = decals[i]; d.age += dt; d.mesh.material.opacity = .72 * Math.max(0, 1 - d.age / 70); if (d.age >= 70) { d.mesh.visible = false; scene.remove(d.mesh); d.mesh.material.dispose(); decals.splice(i, 1); } }
  }
  return {
    update,
    resetActor(id, actor) {
      if (actor?.parts) snapshots.set(id, Object.fromEntries(Object.entries(actor.parts).map(([key, part]) => [key, part.hp])));
      if (actor?.state === 'down' && bleedRate(actor) > 0) {
        pool(actor);
        pool(actor, .55);
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
