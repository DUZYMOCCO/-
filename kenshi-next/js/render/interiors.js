// 入れる小屋（bldg1）の見た目: 壁・屋根・扉の板・家具。
// 選んだ／追っている仲間が中にいる小屋は、屋根と手前（カメラ側）の壁を隠す（Kenshi と同じ見せ方）。
// 当たり判定とルールは js/sim/town.js。ここは描くだけ。
import * as THREE from 'three';
import { heightAt, houseAt } from '../sim/index.js';
import { instancedModel, bakeStatic } from './models.js';
import { shackPieces, wallColorFor, WALL_H } from './asset_plan.js';

const ROOF_MOON = '#7f8fb0';
const ROOF_NIGHT_GLOW = 0.32;
const LEAF_H = 2.05;
const LEAF_T = 0.06;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// 地形と同じ高さの取り方（terrain.js の小屋と合わせる）
export function houseBase(b) {
  const y0 =
    Math.min(
      heightAt(b.x - b.w / 2, b.z - b.d / 2),
      heightAt(b.x + b.w / 2, b.z - b.d / 2),
      heightAt(b.x - b.w / 2, b.z + b.d / 2),
      heightAt(b.x + b.w / 2, b.z + b.d / 2),
      heightAt(b.x, b.z)
    ) - 0.08;
  const y1 = Math.max(
    heightAt(b.x - b.w / 2, b.z - b.d / 2),
    heightAt(b.x + b.w / 2, b.z - b.d / 2),
    heightAt(b.x - b.w / 2, b.z + b.d / 2),
    heightAt(b.x + b.w / 2, b.z + b.d / 2)
  );
  return { y0, wallSy: (WALL_H + (y1 - y0)) / WALL_H };
}

// 隠す壁（純粋な関数・テスト用）: 中にいる小屋で、外向きの向きがカメラ側を向く壁
export function nearWall(normal, center, cam) {
  const dx = cam.x - center.x;
  const dz = cam.z - center.z;
  return normal.x * dx + normal.z * dz > 0.15 * Math.hypot(dx, dz);
}

// 扉の板の開き具合 0..1 から、蝶番まわりの回転（y）を出す
export function leafAngle(door, k) {
  const theta = Math.atan2(-door.uz, door.ux);
  // +90° 回した時の向き (uz, -ux) が内向き（-n）なら +、そうでなければ -
  const sign = door.uz * door.nx - door.ux * door.nz < 0 ? 1 : -1;
  return theta + sign * (Math.PI / 2) * k;
}

export function createInteriors(scene, state, opts) {
  const o = opts || {};
  const models = o.models || {};
  const props = o.props || {};
  const group = new THREE.Group();
  group.name = 'interiors';
  scene.add(group);
  const dummy = new THREE.Object3D();
  const leafGeo = new THREE.BoxGeometry(1, LEAF_H, LEAF_T);
  leafGeo.translate(0.5, LEAF_H / 2, 0);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.95, metalness: 0 });
  const lockMat = new THREE.MeshStandardMaterial({ color: 0x9a8a60, roughness: 0.6, metalness: 0.3 });
  const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x5b4030, roughness: 0.95 });
  const bedGeo = new THREE.BoxGeometry(0.95, 0.32, 2.0);
  bedGeo.translate(0, 0.16, 0);
  const roofMats = [];
  let houses = [];
  let built = null;
  let lastKey = '';
  const stats = { houses: 0, hidden: null, nearHidden: 0, doorAngles: {}, furniture: 0 };

  const shackOk = !!(models.wall_orange && models.door_orange && models.roof);
  const colorOf = (b) => {
    const c = wallColorFor(Math.round(b.x * 7) * 131 + Math.round(b.z * 7));
    return models['wall_' + c] && models['door_' + c] ? c : 'orange';
  };

  function clear() {
    for (const c of [...group.children]) {
      group.remove(c);
      if (c.isInstancedMesh && c.dispose) c.dispose();
    }
    houses = [];
    roofMats.length = 0;
    built = null;
    lastKey = '';
  }

  function build(st) {
    clear();
    const t = st && st.town;
    if (!t || !shackOk) return;
    built = t;
    const furnByRole = {};
    for (const h of t.houses) {
      const b = st.buildings[h.b];
      if (!b) continue;
      const { y0, wallSy } = houseBase(b);
      const color = colorOf(b);
      const pieces = shackPieces(b, h.side);
      const counts = {};
      for (const pc of pieces) if (pc.type !== 'roof') counts[pc.type] = (counts[pc.type] || 0) + 1;
      const sets = {};
      for (const k of Object.keys(counts)) {
        const base = models[k + '_' + color];
        // 戸口の壁は扉の板を抜いた形を使う（板は下の開く扉で描く）
        sets[k] = instancedModel(k === 'door' && base.noDoor ? base.noDoor : base, counts[k], { name: 'house_' + h.id + '_' + k });
        sets[k].setCount(counts[k]);
      }
      const idx = {};
      const walls = [];
      let roofMeshes = [];
      for (const pc of pieces) {
        dummy.rotation.set(0, pc.rot, 0);
        if (pc.type === 'roof') {
          dummy.position.set(b.x + pc.x, y0 + WALL_H * wallSy - 0.02, b.z + pc.z);
          dummy.scale.set(pc.scaleX, 1, pc.scaleZ);
          dummy.updateMatrix();
          roofMeshes = bakeStatic(models.roof, [dummy.matrix.clone()], {
            name: 'house_' + h.id + '_roof',
            worldUv: true,
            material: (m) => {
              const c = m.clone();
              if (c.map) c.emissiveMap = c.map;
              c.emissive = new THREE.Color(ROOF_MOON);
              c.emissiveIntensity = 0;
              return c;
            },
          });
          for (const m of roofMeshes) {
            group.add(m);
            roofMats.push(m.material);
          }
          continue;
        }
        dummy.position.set(b.x + pc.x, y0, b.z + pc.z);
        dummy.scale.set(pc.scaleX, wallSy, 1);
        dummy.updateMatrix();
        idx[pc.type] = idx[pc.type] || 0;
        const i = idx[pc.type];
        sets[pc.type].set(i, dummy.matrix);
        walls.push({ set: sets[pc.type], i, m: dummy.matrix.clone(), n: { x: Math.sin(pc.rot), z: Math.cos(pc.rot) }, door: pc.type === 'door', hidden: false });
        idx[pc.type] += 1;
      }
      for (const k of Object.keys(sets)) {
        sets[k].finish();
        sets[k].addTo(group);
      }
      // 扉の板（蝶番は戸口の片端）
      const d = h.door;
      const pivot = new THREE.Group();
      pivot.name = 'door_' + h.id;
      const leafW = Math.max(0.5, d.opening - 0.04);
      const hingeX = d.x - d.ux * (leafW / 2);
      const hingeZ = d.z - d.uz * (leafW / 2);
      pivot.position.set(hingeX, Math.max(y0 + 0.02, heightAt(d.x, d.z) - 0.02), hingeZ);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.set(leafW, 1, 1);
      leaf.castShadow = true;
      pivot.add(leaf);
      // 錠前（鍵のかかる扉の目印）
      const lockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.1), lockMat);
      lockMesh.position.set(leafW - 0.12, 1.05, 0);
      pivot.add(lockMesh);
      const k0 = d.open ? 1 : 0;
      pivot.rotation.y = leafAngle(d, k0);
      group.add(pivot);
      for (const f of h.furn || []) (furnByRole[f.role] = furnByRole[f.role] || []).push(f);
      houses.push({ h, b, y0, walls, roofMeshes, pivot, lockMesh, k: k0, center: { x: b.x, z: b.z } });
    }
    // 家具（役目ごとに1つのインスタンス）
    let nf = 0;
    for (const [role, list] of Object.entries(furnByRole)) {
      if (!props[role]) continue;
      const set = instancedModel(props[role], list.length, { name: 'furn_' + role });
      list.forEach((f, i) => {
        dummy.position.set(f.x, heightAt(f.x, f.z) - 0.02, f.z);
        dummy.rotation.set(0, f.rot || 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        set.set(i, dummy.matrix);
      });
      set.setCount(list.length);
      set.finish();
      set.addTo(group);
      nf += list.length;
    }
    // 寝台の枠（寝袋の glb の下に木の台）
    const beds = (st.bedrolls || []).filter((b) => b.kind === 'bed');
    if (beds.length) {
      const bm = new THREE.InstancedMesh(bedGeo, bedFrameMat, beds.length);
      bm.name = 'bed_frames';
      beds.forEach((bd, i) => {
        dummy.position.set(bd.x, heightAt(bd.x, bd.z) - 0.04, bd.z);
        dummy.rotation.set(0, bd.rot || 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bm.setMatrixAt(i, dummy.matrix);
      });
      bm.instanceMatrix.needsUpdate = true;
      bm.castShadow = true;
      bm.receiveShadow = true;
      group.add(bm);
      nf += beds.length;
    }
    stats.houses = houses.length;
    stats.furniture = nf;
  }

  build(state);

  // focus: 選んだ／追っている仲間（x,z）。cam: カメラの位置
  function update(st, focus, cam, dt) {
    if (!st || st.town !== built) build(st);
    if (!houses.length) return;
    const inside = focus ? houseAt(st, focus.x, focus.z, 0.15) : null;
    const hsIn = inside ? houses.find((x) => x.h.id === inside.id) : null;
    const key = (inside ? inside.id : '-') + ':' + (hsIn && cam ? Math.round(Math.atan2(cam.x - hsIn.center.x, cam.z - hsIn.center.z) * 4) : 0);
    if (key !== lastKey) {
      lastKey = key;
      let nh = 0;
      for (const hs of houses) {
        const isIn = inside && hs.h.id === inside.id;
        for (const m of hs.roofMeshes) m.visible = !isIn;
        for (const w of hs.walls) {
          const hide = !!(isIn && cam && nearWall(w.n, hs.center, cam));
          if (hide !== w.hidden) {
            w.hidden = hide;
            w.set.set(w.i, hide ? ZERO : w.m);
            w.set.finish(false);
          }
          if (hide) nh += 1;
        }
      }
      stats.hidden = inside ? inside.id : null;
      stats.nearHidden = nh;
    }
    const step = Math.min(1, (dt || 0.016) * 5);
    for (const hs of houses) {
      const d = hs.h.door;
      const target = d.open ? 1 : 0;
      if (hs.k !== target) {
        hs.k += Math.sign(target - hs.k) * step;
        if (Math.abs(target - hs.k) < 0.01 || Math.sign(target - hs.k) !== Math.sign(target - (hs.k - Math.sign(target - hs.k) * step))) hs.k = target;
        hs.k = Math.max(0, Math.min(1, hs.k));
        hs.pivot.rotation.y = leafAngle(d, hs.k);
      }
      hs.lockMesh.visible = !!d.locked;
      stats.doorAngles[hs.h.id] = Math.round(hs.k * 100) / 100;
    }
  }

  function setNight(k) {
    for (const m of roofMats) m.emissiveIntensity = ROOF_NIGHT_GLOW * Math.max(0, Math.min(1, k));
  }

  return { group, update, setNight, reset: build, stats, houseIndices: () => new Set(houses.map((x) => x.h.b)) };
}

// terrain.js へ渡す: 町の入れる小屋（ここで描く）の建物番号
export function townBuildingSet(state) {
  const t = state && state.town;
  return new Set(t ? t.houses.map((h) => h.b) : []);
}
