// 入れる小屋（bldg1）の見た目: 壁・屋根・扉の板・家具。
// 選んだ／追っている仲間が中にいる小屋は、屋根と手前（カメラ側）の壁を隠す（Kenshi と同じ見せ方）。
// 当たり判定とルールは js/sim/town.js。ここは描くだけ。
import * as THREE from 'three';
import { heightAt, houseAt } from '../sim/index.js';
import { instancedModel, bakeStatic } from './models.js';
import { shackPieces, wallColorFor, WALL_H } from './asset_plan.js';
import { FLOOR_RISE, houseRoofFloor } from '../sim/floors.js';
import { showFloorLayer } from './floor_view.js';

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

function addBox(group, geometry, material, name, x, y, z, sx, sy, sz, rotationY = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
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
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6b5039, roughness: 0.94 });
  const plankMats = [0x806043, 0x896849, 0x76583d, 0x92704d].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 }));
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x826344, roughness: 1 });
  const furnitureMat = new THREE.MeshStandardMaterial({ color: 0x59412d, roughness: 0.9 });
  const furnitureLightMat = new THREE.MeshStandardMaterial({ color: 0xa17e54, roughness: 0.92 });
  const partitionMat = new THREE.MeshStandardMaterial({ color: 0xb89060, roughness: 0.93 });
  const upperWallMat = new THREE.MeshStandardMaterial({ color: 0xb18a5e, roughness: 0.91 });
  const stairMat = new THREE.MeshStandardMaterial({ color: 0x68452b, roughness: 0.95 });
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x71807f, roughness: 0.84 });
  const bridgeSupportMat = new THREE.MeshStandardMaterial({ color: 0x3c4948, roughness: 0.95 });
  const roofRailMat = new THREE.MeshStandardMaterial({ color: 0x785a3d, roughness: 0.94 });
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
      const floorDecks = [];
      const upperWalls = [];
      const partitions = [];
      const stairs = [];
      const roofDetails = [];
      const addRoofDetail = (...args) => {
        const mesh = addBox(...args);
        mesh.userData.floor = houseRoofFloor(h);
        roofDetails.push(mesh);
        return mesh;
      };
      for (const pc of pieces) {
        dummy.rotation.set(0, pc.rot, 0);
        if (pc.type === 'roof') {
          dummy.position.set(b.x + pc.x, y0 + (h.roofHeight || WALL_H * wallSy) - 0.02, b.z + pc.z);
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
      const groundDeck = addBox(group, new THREE.BoxGeometry(Math.max(1, b.w - 0.44), 0.14, Math.max(1, b.d - 0.44)), floorMat,
        'house_' + h.id + '_floor_0', b.x, y0 + 0.01, b.z, 1, 1, 1);
      groundDeck.userData.floor = 0;
      floorDecks.push({ floor: 0, mesh: groundDeck });
      if (h.levels > 0) {
        const floorY = y0 + FLOOR_RISE;
        const deckW = Math.max(1, b.w - 0.44);
        const deckD = Math.max(1, b.d - 0.44);
        const x0 = b.x - deckW / 2;
        const x1 = b.x + deckW / 2;
        const z0 = b.z - deckD / 2;
        const z1 = b.z + deckD / 2;
        const addUpperDeck = (name, ax, az, bx, bz) => {
          if (bx - ax < 0.12 || bz - az < 0.12) return;
          const mesh = addBox(group, new THREE.BoxGeometry(bx - ax, 0.18, bz - az), floorMat,
            'house_' + h.id + '_floor_1' + name, (ax + bx) / 2, floorY, (az + bz) / 2, 1, 1, 1);
          mesh.userData.floor = 1;
          floorDecks.push({ floor: 1, mesh });
          const spacing = 0.38;
          const rows = Math.max(1, Math.floor((bz - az) / spacing));
          const board = new THREE.BoxGeometry(Math.max(0.16, bx - ax - 0.1), 0.025, Math.max(0.08, (bz - az) / rows - 0.035));
          for (let colorIndex = 0; colorIndex < plankMats.length; colorIndex += 1) {
            const indices = Array.from({ length: rows }, (_, row) => row).filter((row) => row % plankMats.length === colorIndex);
            if (!indices.length) continue;
            const boards = new THREE.InstancedMesh(board, plankMats[colorIndex], indices.length);
            boards.name = `house_${h.id}_upper_planks_${name}_${colorIndex}`;
            indices.forEach((row, i) => {
              dummy.position.set((ax + bx) / 2, floorY + 0.105, az + (row + 0.5) * (bz - az) / rows);
              dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
              boards.setMatrixAt(i, dummy.matrix);
            });
            boards.instanceMatrix.needsUpdate = true;
            boards.userData.floor = 1;
            group.add(boards);
            floorDecks.push({ floor: 1, mesh: boards });
          }
        };
        const upperStair = (h.stairs?.points || []).find((point) => point.floor === 1);
        const roofStair = (h.stairs?.points || []).at(-1);
        if (upperStair && roofStair) {
          const halfGap = (h.stairs.width || 0.74) / 2 + 0.16;
          const gapX0 = Math.max(x0, Math.min(upperStair.x, roofStair.x) - halfGap);
          const gapX1 = Math.min(x1, Math.max(upperStair.x, roofStair.x) + halfGap);
          const gapZ0 = Math.max(z0, Math.min(upperStair.z, roofStair.z) - halfGap);
          const gapZ1 = Math.min(z1, Math.max(upperStair.z, roofStair.z) + halfGap);
          addUpperDeck('_west', x0, z0, gapX0, z1);
          addUpperDeck('_east', gapX1, z0, x1, z1);
          addUpperDeck('_north', gapX0, z0, gapX1, gapZ0);
          addUpperDeck('_south', gapX0, gapZ1, gapX1, z1);
        } else {
          addUpperDeck('', x0, z0, x1, z1);
        }
        const wallY = floorY + 1.15;
        const wallH = 2.2;
        const thickness = 0.22;
        for (const [name, x, z, sx, sz] of [
          ['north', b.x, b.z - b.d / 2 + thickness / 2, b.w, thickness],
          ['south', b.x, b.z + b.d / 2 - thickness / 2, b.w, thickness],
          ['west', b.x - b.w / 2 + thickness / 2, b.z, thickness, b.d],
          ['east', b.x + b.w / 2 - thickness / 2, b.z, thickness, b.d],
        ]) {
          const mesh = addBox(group, new THREE.BoxGeometry(sx, wallH, sz), upperWallMat,
            'house_' + h.id + '_upper_' + name, x, wallY, z, 1, 1, 1);
          mesh.userData.floor = 1;
          upperWalls.push(mesh);
        }
        const trimY = floorY + 0.22;
        for (const [name, x, z, sx, sz] of [
          ['north', b.x, z0 + 0.16, deckW - 0.55, 0.1], ['south', b.x, z1 - 0.16, deckW - 0.55, 0.1],
          ['west', x0 + 0.16, b.z, 0.1, deckD - 0.55], ['east', x1 - 0.16, b.z, 0.1, deckD - 0.55],
        ]) {
          const trim = addBox(group, new THREE.BoxGeometry(sx, 0.2, sz), furnitureMat,
            `house_${h.id}_upper_base_${name}`, x, trimY, z, 1, 1, 1);
          trim.userData.floor = 1; floorDecks.push({ floor: 1, mesh: trim });
        }
        // Place a compact, deterministic furniture group in the corner farthest from the stair opening.
        const corners = [
          { x: x0 + 1.35, z: z0 + 1.35 }, { x: x1 - 1.35, z: z0 + 1.35 },
          { x: x0 + 1.35, z: z1 - 1.35 }, { x: x1 - 1.35, z: z1 - 1.35 },
        ];
        const stairPoints = h.stairs?.points || [];
        const corner = corners.sort((a, b) => {
          const score = (p) => Math.min(...stairPoints.map((s) => Math.hypot(p.x - s.x, p.z - s.z)), Infinity);
          return score(b) - score(a);
        })[0];
        const fy = floorY + 0.12;
        const fx = corner.x, fz = corner.z;
        const addFurniture = (geometry, material, name, x, y, z) => {
          const mesh = addBox(group, geometry, material, `house_${h.id}_${name}`, x, y, z, 1, 1, 1);
          mesh.userData.floor = 1;
          floorDecks.push({ floor: 1, mesh });
          return mesh;
        };
        // Bed, low storage chest, and writing table stay against the room edge.
        addFurniture(new THREE.BoxGeometry(1.2, 0.24, 1.95), furnitureMat, 'upper_bed_frame', fx, fy + 0.12, fz);
        addFurniture(new THREE.BoxGeometry(1.08, 0.18, 1.82), rugMat, 'upper_bed_roll', fx, fy + 0.33, fz);
        addFurniture(new THREE.BoxGeometry(0.82, 0.58, 0.72), furnitureMat, 'upper_storage_chest', fx + 0.96, fy + 0.29, fz + 0.42);
        addFurniture(new THREE.BoxGeometry(1.02, 0.14, 0.76), furnitureLightMat, 'upper_table_top', fx + 0.35, fy + 0.76, fz - 1.18);
        for (const [dx, dz] of [[-0.34, -0.2], [0.34, -0.2], [-0.34, 0.2], [0.34, 0.2]]) {
          addFurniture(new THREE.BoxGeometry(0.09, 0.68, 0.09), furnitureMat, 'upper_table_leg', fx + 0.35 + dx, fy + 0.35, fz - 1.18 + dz);
        }
      }
      for (let i = 0; i < (h.partitions || []).length; i += 1) {
        const wall = h.partitions[i];
        const height = wall.height || 2.45;
        const baseY = y0 + (wall.floor ? FLOOR_RISE : 0);
        const mesh = addBox(group, new THREE.BoxGeometry(wall.hw * 2, height, wall.hd * 2), partitionMat,
          'house_' + h.id + '_partition_' + i, wall.x, baseY + height / 2, wall.z, 1, 1, 1);
        mesh.userData.floor = wall.floor || 0;
        partitions.push(mesh);
        const cap = addBox(group, new THREE.BoxGeometry(wall.hw * 2 + 0.05, 0.11, wall.hd * 2 + 0.05), furnitureLightMat,
          `house_${h.id}_partition_cap_${i}`, wall.x, baseY + height + 0.045, wall.z, 1, 1, 1);
        cap.userData.floor = wall.floor || 0;
        partitions.push(cap);
        const shadow = addBox(group, new THREE.BoxGeometry(wall.hw * 2 + 0.04, 0.13, wall.hd * 2 + 0.04), furnitureMat,
          `house_${h.id}_partition_shadow_${i}`, wall.x, baseY + 0.08, wall.z, 1, 1, 1);
        shadow.userData.floor = wall.floor || 0;
        partitions.push(shadow);
      }
      for (let i = 1; i < (h.stairs?.points || []).length; i += 1) {
        const from = h.stairs.points[i - 1];
        const to = h.stairs.points[i];
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const length = Math.hypot(dx, dz);
        const count = Math.max(5, Math.ceil(length / 0.32));
        const stepLength = Math.max(0.34, length / count + 0.05);
        for (let n = 1; n <= count; n += 1) {
          const t = n / (count + 1);
          const mesh = addBox(group, new THREE.BoxGeometry(h.stairs.width || 0.74, 0.13, stepLength), stairMat,
            'house_' + h.id + '_stair_' + i + '_' + n,
            from.x + dx * t, y0 + from.y + (to.y - from.y) * t, from.z + dz * t,
            1, 1, 1, Math.atan2(dx, dz));
          mesh.userData.floor = Math.min(from.floor, to.floor);
          stairs.push(mesh);
        }
      }
      // Low roof rails leave the stair landing open and give the watch post a clear silhouette.
      if (h.roofEntry && h.guardPoint) {
        const roofY = y0 + (h.roofHeight || WALL_H * wallSy) + 0.04;
        const railH = 0.72;
        const railT = 0.1;
        for (const [name, x, z, sx, sz] of [
          ['north', b.x, b.z - b.d / 2 + 0.22, b.w - 0.75, railT],
          ['south', b.x, b.z + b.d / 2 - 0.22, b.w - 0.75, railT],
          ['west', b.x - b.w / 2 + 0.22, b.z, railT, b.d - 0.75],
          ['east', b.x + b.w / 2 - 0.22, b.z, railT, b.d - 0.75],
        ]) {
          addRoofDetail(group, new THREE.BoxGeometry(sx, railH, sz), roofRailMat, `house_${h.id}_roof_rail_${name}`, x, roofY + railH / 2, z, 1, 1, 1);
        }
        const postGeo = new THREE.BoxGeometry(0.16, 0.95, 0.16);
        for (const [i, dx, dz] of [[0, -1, -1], [1, 1, -1], [2, -1, 1], [3, 1, 1]]) {
          addRoofDetail(group, postGeo, roofRailMat, `house_${h.id}_roof_post_${i}`,
            b.x + dx * (b.w / 2 - 0.22), roofY + 0.47, b.z + dz * (b.d / 2 - 0.22), 1, 1, 1);
        }
        // A small raised lookout marker beside, rather than over, the guard position.
        addRoofDetail(group, new THREE.BoxGeometry(1.35, 0.16, 1.05), furnitureLightMat,
          `house_${h.id}_lookout_deck`, h.guardPoint.x + 0.82, roofY + 0.14, h.guardPoint.z, 1, 1, 1);
        addRoofDetail(group, new THREE.BoxGeometry(1.42, 0.14, 1.12), roofRailMat,
          `house_${h.id}_lookout_canopy`, h.guardPoint.x + 0.82, roofY + 2.15, h.guardPoint.z, 1, 1, 1);
        for (const dx of [-0.58, 0.58]) for (const dz of [-0.43, 0.43]) {
          addRoofDetail(group, new THREE.BoxGeometry(0.09, 2, 0.09), roofRailMat,
            `house_${h.id}_lookout_post_${dx}_${dz}`, h.guardPoint.x + 0.82 + dx, roofY + 1.14, h.guardPoint.z + dz, 1, 1, 1);
        }
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
      houses.push({ h, b, y0, walls, roofMeshes, roofDetails, floorDecks, upperWalls, partitions, stairs, pivot, lockMesh, k: k0, center: { x: b.x, z: b.z } });
    }
    const roofLinks = st.town.roofLinks || [];
    for (const link of roofLinks) {
      const dx = link.bPoint.x - link.aPoint.x;
      const dz = link.bPoint.z - link.aPoint.z;
      const length = Math.hypot(dx, dz);
      const midY = (link.yA + link.yB) / 2;
      const mesh = addBox(group, new THREE.BoxGeometry(1.02, 0.24, Math.max(0.4, length)), bridgeMat,
        'roof_bridge_' + link.id, (link.aPoint.x + link.bPoint.x) / 2, midY + 0.06,
        (link.aPoint.z + link.bPoint.z) / 2, 1, 1, 1, Math.atan2(dx, dz));
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(dx, link.yB - link.yA, dz).normalize(),
      );
      mesh.userData.houses = [link.a, link.b];
      mesh.userData.floor = Math.max(houseRoofFloor(t.houses.find((h) => h.id === link.a)), houseRoofFloor(t.houses.find((h) => h.id === link.b)));
      houses.push({ bridge: true, link, roofBridge: mesh });
      const supports = [];
      for (const [end, point, y] of [['a', link.aPoint, link.yA], ['b', link.bPoint, link.yB]]) {
        const support = addBox(group, new THREE.BoxGeometry(0.92, 0.36, 0.62), bridgeSupportMat,
          `roof_bridge_${link.id}_support_${end}`, point.x, y + 0.02, point.z, 1, 1, 1, Math.atan2(dx, dz));
        supports.push(support);
      }
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
    stats.houses = houses.filter((house) => !house.bridge).length;
    stats.furniture = nf;
  }

  build(state);

  // focus: 選んだ／追っている仲間（x,z）。cam: カメラの位置
  function update(st, focus, cam, dt, requestedFloor = null) {
    if (!st || st.town !== built) build(st);
    if (!houses.length) return;
    const inside = focus ? houseAt(st, focus.x, focus.z, 0.15) : null;
    const hsIn = inside ? houses.find((x) => !x.bridge && x.h.id === inside.id) : null;
    const viewFloor = inside ? Math.max(0, Math.min(houseRoofFloor(inside), Number.isInteger(requestedFloor) ? requestedFloor : (focus?.floor || 0))) : null;
    const key = (inside ? inside.id : '-') + ':' + (viewFloor ?? '-') + ':' + (hsIn && cam ? Math.round(Math.atan2(cam.x - hsIn.center.x, cam.z - hsIn.center.z) * 4) : 0);
    if (key !== lastKey) {
      lastKey = key;
      let nh = 0;
      for (const hs of houses) {
          if (hs.bridge) {
            const hidden = (inside && (hs.link.a === inside.id || hs.link.b === inside.id) && viewFloor < houseRoofFloor(inside));
            hs.roofBridge.visible = !hidden;
            continue;
          }
        const isIn = inside && hs.h.id === inside.id;
          const floor = isIn ? viewFloor : null;
          for (const m of hs.roofMeshes) m.visible = !isIn || floor >= houseRoofFloor(hs.h);
          for (const m of hs.roofDetails) m.visible = !isIn || floor >= houseRoofFloor(hs.h);
          for (const layer of hs.floorDecks) layer.mesh.visible = showFloorLayer(!!isIn, layer.floor, floor);
          for (const wall of hs.upperWalls) wall.visible = !isIn;
          for (const m of hs.partitions) m.visible = !isIn || floor >= (m.userData.floor || 0);
          for (const m of hs.stairs) m.visible = true;
        for (const w of hs.walls) {
          const hide = !!(isIn && (floor > 0 || (cam && nearWall(w.n, hs.center, cam))));
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
      stats.viewFloor = viewFloor;
    }
    const step = Math.min(1, (dt || 0.016) * 5);
    for (const hs of houses) {
      if (hs.bridge) continue;
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

  return { group, update, setNight, reset: build, stats, houseIndices: () => new Set(houses.filter((x) => !x.bridge).map((x) => x.h.b)) };
}

// terrain.js へ渡す: 町の入れる小屋（ここで描く）の建物番号
export function townBuildingSet(state) {
  const t = state && state.town;
  return new Set(t ? t.houses.map((h) => h.b) : []);
}
