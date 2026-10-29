// 夜の灯り。置いた光源（町の灯り・焚き火）と、仲間が持つランタン。
// 軽くするための作り:
//  - 光源の見た目はまとめて InstancedMesh にする（種類ごとに 1 draw call）。
//  - 地面の明るい輪は加算合成の板（これも InstancedMesh）。昼は消す。
//  - 本物の点光源は POOL 個だけ。常に scene に置き、使わない時は強さ0にする
//    （光の数が変わるとシェーダーを作り直すので、数は変えない）。
//    注視点に近い光源から順に割り当てる。

import * as THREE from 'three';
import { heightAt, fixedLights, ambientLight, darknessOf, carriesLight, LANTERN } from '../sim/index.js';
import { instancedModel } from './models.js';
import { lampRoleFor, LAMP_ROLES } from './asset_plan.js';

export const POOL = 6;
const MAX_LANTERNS = 12;
const PICK_RANGE = 70;
const GLOW_LIFT = 0.07;
// 地面の光の輪: 地形に沿わせた円盤（輪 RINGS × 周り SEGS）。端へなめらかに消える。
const RINGS = 7;
const SEGS = 28;
const DISC_VERTS = 1 + RINGS * SEGS;
const GLOW_SPREAD = 1.15;

function discIndex(count) {
  const idx = [];
  for (let d = 0; d < count; d += 1) {
    const o = d * DISC_VERTS;
    for (let j = 0; j < SEGS; j += 1) {
      const j2 = (j + 1) % SEGS;
      idx.push(o, o + 1 + j2, o + 1 + j);
      for (let r = 0; r < RINGS - 1; r += 1) {
        const a = o + 1 + r * SEGS + j;
        const b = o + 1 + r * SEGS + j2;
        const c = o + 1 + (r + 1) * SEGS + j;
        const e = o + 1 + (r + 1) * SEGS + j2;
        idx.push(a, b, c, b, e, c);
      }
    }
  }
  return idx;
}

// 円盤 d 個ぶんの位置と色（明るさ込み）を書く。
function writeDisc(pos, col, d, cx, cz, r, c) {
  const R = r * GLOW_SPREAD;
  let o = d * DISC_VERTS * 3;
  const put = (x, z, t) => {
    // 明るさ: 中心1 → 端0 を2回なめらかに
    const f = Math.max(0, 1 - t * t);
    const w = f * f;
    pos[o] = x;
    pos[o + 1] = heightAt(x, z) + GLOW_LIFT;
    pos[o + 2] = z;
    col[o] = c.r * w;
    col[o + 1] = c.g * w;
    col[o + 2] = c.b * w;
    o += 3;
  };
  put(cx, cz, 0);
  for (let ri = 1; ri <= RINGS; ri += 1) {
    const t = ri / RINGS;
    for (let j = 0; j < SEGS; j += 1) {
      const a = (j / SEGS) * Math.PI * 2;
      put(cx + Math.cos(a) * R * t, cz + Math.sin(a) * R * t, t);
    }
  }
}

function makeDiscMesh(count, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(1, count) * DISC_VERTS * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(Math.max(1, count) * DISC_VERTS * 3), 3));
  geo.setIndex(discIndex(Math.max(1, count)));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return mesh;
}
const FIRE_COLOR = new THREE.Color('#ff9a45');
// 焚き火の地面の輪は橙が飛びやすいので、色を抑えて書く（光暈は FIRE_COLOR のまま）
const FIRE_GROUND = new THREE.Color('#ff9a45').multiplyScalar(0.55);
// 点光源の強さ（焚き火は 14 だと足元が白く飛んだので下げた）
const FIRE_INTENSITY = 9;
const LAMP_INTENSITY = 10.5;
const LAMP_COLOR = new THREE.Color('#ffc977');
const LANTERN_COLOR = new THREE.Color('#ffd08a');

function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 焚き火の点光源は炎の節点（地面から0.15m）のままだと足元だけが白く飛ぶので、そこから上へ持ち上げる。
const FIRE_LIGHT_LIFT = 1.55;

// models: 役目ごとの glb（campfire / lamp_a / lamp_b / lantern）。無いものは従来の箱・円柱で描く。
// 町の灯りは灯りの id ごとに lamp_a（大きい街灯）か lamp_b を選ぶ。
export function createLights(scene, initialState, models) {
  const md = models || {};
  const fireModel = md.campfire || null;
  const lanternModel = md.lantern || null;
  const flameY = fireModel && fireModel.nodes.flame ? fireModel.nodes.flame.y : 0.06;
  const lampModels = {};
  for (const r of LAMP_ROLES) if (md[r]) lampModels[r] = md[r];
  const lampModel = Object.keys(lampModels).length ? lampModels[LAMP_ROLES.find((r) => lampModels[r])] : null;
  const lampOf = (l) => lampModels[lampRoleFor(l.id)] || lampModel;
  const nodeOf = (m) => (m && m.nodes.light ? m.nodes.light : new THREE.Vector3(0, 2.9, 0));
  const lanternNode = lanternModel && lanternModel.nodes.light ? lanternModel.nodes.light : new THREE.Vector3(0, 0, 0);
  // 灯りの「glow」材質は夜だけ光らせる（昼は弱く）
  const glowMats = [];
  function collectGlow(model) {
    if (!model) return;
    for (const p of model.parts) {
      if (p.material && p.material.name === 'glow') {
        p.material.userData.baseEmissive = p.material.emissiveIntensity || 1;
        glowMats.push(p.material);
      }
    }
  }
  for (const m of new Set(Object.values(lampModels))) collectGlow(m);
  collectGlow(lanternModel);
  let fireSet = null;
  let lampSets = [];
  const tex = glowTexture();
  const tmp = new THREE.Object3D();
  const m4 = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const color = new THREE.Color();

  // 地面の輪（置いた光源）
  const groundMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  // 光の芯（炎・灯りの玉のまわりの光暈）。カメラを向く板。
  const haloGeo = new THREE.PlaneGeometry(1, 1);
  const haloMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
  });

  // 焚き火: 薪（箱）と炎（円錐）。町の灯り: 柱と灯り箱。
  // 焚き火: 立てかけた薪5本・まわりの石8個・炎は外（橙）と内（黄）の2重。
  const FIRE_LOGS = 5;
  const FIRE_STONES = 8;
  const logGeo = new THREE.CylinderGeometry(0.07, 0.085, 0.95, 6);
  logGeo.translate(0, 0.475, 0);
  const logMat = new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 1 });
  const stoneGeo = new THREE.DodecahedronGeometry(0.16, 0);
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#6d665c', roughness: 1 });
  const flameGeo = new THREE.ConeGeometry(0.34, 1.15, 8, 1, true);
  flameGeo.translate(0, 0.575, 0);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ff8a3a', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  const coreGeo = new THREE.ConeGeometry(0.2, 0.75, 8);
  coreGeo.translate(0, 0.375, 0);
  const coreMat = new THREE.MeshBasicMaterial({ color: '#ffe27a' });
  const emberGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.06, 10);
  const emberMat = new THREE.MeshBasicMaterial({ color: '#7a2a10' });
  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.8, 6);
  const postMat = new THREE.MeshStandardMaterial({ color: '#4a3b2c', roughness: 0.9 });
  const lampGeo = new THREE.BoxGeometry(0.34, 0.42, 0.34);
  const lampMat = new THREE.MeshBasicMaterial({ color: '#ffe0a0' });
  const lanternGeo = new THREE.BoxGeometry(0.16, 0.22, 0.16);
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffe3a8' });

  const group = new THREE.Group();
  group.name = 'lights';
  scene.add(group);

  let fixed = [];
  let logs = null;
  let flames = null;
  let cores = null;
  let stones = null;
  let embers = null;
  let fireList = [];
  let posts = null;
  let lamps = null;
  let grounds = null;
  let halos = null;

  // 持つ灯り（数は MAX_LANTERNS まで）
  const lanternMesh = new THREE.InstancedMesh(lanternGeo, lanternMat, MAX_LANTERNS);
  lanternMesh.count = 0;
  lanternMesh.frustumCulled = false;
  const lanternSet = lanternModel ? instancedModel(lanternModel, MAX_LANTERNS, { name: 'lantern', castShadow: false }) : null;
  if (lanternSet) {
    lanternSet.meshes.forEach((m) => {
      m.frustumCulled = false;
    });
    lanternSet.addTo(group);
    lanternMesh.visible = false;
  }
  const lanternGround = makeDiscMesh(MAX_LANTERNS, groundMat);
  lanternGround.geometry.setDrawRange(0, 0);
  const lanternHalo = new THREE.InstancedMesh(haloGeo, haloMat, MAX_LANTERNS);
  lanternHalo.count = 0;
  lanternHalo.frustumCulled = false;
  lanternHalo.renderOrder = 2;
  group.add(lanternMesh, lanternGround, lanternHalo);

  const pool = [];
  for (let i = 0; i < POOL; i += 1) {
    const p = new THREE.PointLight(0xffc070, 0, 10, 2);
    p.castShadow = false;
    group.add(p);
    pool.push(p);
  }

  function clearFixed() {
    for (const m of [logs, flames, cores, stones, embers, posts, lamps, halos]) {
      if (m) {
        group.remove(m);
        m.dispose();
      }
    }
    if (grounds) {
      group.remove(grounds);
      grounds.geometry.dispose();
    }
    if (fireSet) fireSet.dispose(group);
    for (const ls of lampSets) ls.set.dispose(group);
    lampSets = [];
    fireSet = null;
    logs = flames = cores = stones = embers = posts = lamps = grounds = halos = null;
  }

  function build(state) {
    clearFixed();
    fixed = fixedLights(state).map((l) => ({ ...l, y: heightAt(l.x, l.z) }));
    const fires = fixed.filter((l) => l.kind === 'campfire');
    const lampList = fixed.filter((l) => l.kind === 'lamp');
    fireList = fires;
    const nf = Math.max(1, fires.length);
    logs = new THREE.InstancedMesh(logGeo, logMat, nf * FIRE_LOGS);
    stones = new THREE.InstancedMesh(stoneGeo, stoneMat, nf * FIRE_STONES);
    embers = new THREE.InstancedMesh(emberGeo, emberMat, nf);
    flames = new THREE.InstancedMesh(flameGeo, flameMat, nf);
    cores = new THREE.InstancedMesh(coreGeo, coreMat, nf);
    posts = new THREE.InstancedMesh(postGeo, postMat, Math.max(1, lampList.length));
    lamps = new THREE.InstancedMesh(lampGeo, lampMat, Math.max(1, lampList.length));
    grounds = makeDiscMesh(fixed.length, groundMat);
    halos = new THREE.InstancedMesh(haloGeo, haloMat, Math.max(1, fixed.length));
    logs.count = fires.length * FIRE_LOGS;
    stones.count = fires.length * FIRE_STONES;
    embers.count = fires.length;
    flames.count = fires.length;
    cores.count = fires.length;
    posts.count = lampList.length;
    lamps.count = lampList.length;
    halos.count = fixed.length;
    if (fireModel) {
      fireSet = instancedModel(fireModel, nf, { name: 'campfire' });
      logs.count = 0;
      stones.count = 0;
      embers.count = 0;
    }
    const lampSetOf = new Map();
    if (lampModel) {
      for (const l of lampList) {
        const m = lampOf(l);
        if (!lampSetOf.has(m)) lampSetOf.set(m, { model: m, n: 0, count: 0, set: null });
        lampSetOf.get(m).count += 1;
      }
      for (const ls of lampSetOf.values()) {
        ls.set = instancedModel(ls.model, Math.max(1, ls.count), { name: 'street_lamp' });
        lampSets.push(ls);
      }
      posts.count = 0;
      lamps.count = 0;
    }
    fires.forEach((f, i) => {
      if (fireSet) {
        tmp.position.set(f.x, f.y - 0.02, f.z);
        tmp.rotation.set(0, f.id * 1.7, 0);
        tmp.scale.set(1.15, 1.15, 1.15);
        tmp.updateMatrix();
        fireSet.set(i, tmp.matrix);
      }
      for (let k = 0; k < FIRE_LOGS; k += 1) {
        // 薪は中心へ向けて立てかける（円錐の形）
        const a = (k / FIRE_LOGS) * Math.PI * 2 + f.id;
        tmp.position.set(f.x + Math.cos(a) * 0.42, f.y + 0.02, f.z + Math.sin(a) * 0.42);
        tmp.rotation.set(0, 0, 0);
        tmp.lookAt(f.x, f.y + 0.6, f.z);
        tmp.rotateX(Math.PI / 2);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        logs.setMatrixAt(i * FIRE_LOGS + k, tmp.matrix);
      }
      for (let k = 0; k < FIRE_STONES; k += 1) {
        const a = (k / FIRE_STONES) * Math.PI * 2;
        const sx = f.x + Math.cos(a) * 0.78;
        const sz = f.z + Math.sin(a) * 0.78;
        tmp.position.set(sx, heightAt(sx, sz) + 0.05, sz);
        tmp.rotation.set(k * 1.3, k * 0.7 + f.id, 0);
        const sc = 0.85 + ((k * 37 + f.id * 11) % 7) * 0.05;
        tmp.scale.set(sc, sc * 0.7, sc);
        tmp.updateMatrix();
        stones.setMatrixAt(i * FIRE_STONES + k, tmp.matrix);
      }
      tmp.position.set(f.x, f.y + 0.03, f.z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      embers.setMatrixAt(i, tmp.matrix);
      tmp.position.set(f.x, f.y + flameY, f.z);
      tmp.updateMatrix();
      flames.setMatrixAt(i, tmp.matrix);
      cores.setMatrixAt(i, tmp.matrix);
    });
    lampList.forEach((l, i) => {
      if (lampModel) {
        // 灯りの節点（腕の先）が sim の光源の真上に来るよう、柱を少しずらして立てる
        const ls = lampSetOf.get(lampOf(l));
        const lampNode = nodeOf(ls.model);
        const a = l.id * 2.3 + 0.4;
        const ox = Math.cos(a) * lampNode.x;
        const oz = -Math.sin(a) * lampNode.x;
        const px = l.x - ox;
        const pz = l.z - oz;
        tmp.position.set(px, heightAt(px, pz) - 0.03, pz);
        tmp.rotation.set(0, a, 0);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        ls.set.set(ls.n, tmp.matrix);
        ls.n += 1;
        l.lightY = heightAt(px, pz) - 0.03 + lampNode.y;
      }
      tmp.position.set(l.x, l.y + 1.4, l.z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      posts.setMatrixAt(i, tmp.matrix);
      tmp.position.set(l.x, l.y + 2.9, l.z);
      tmp.updateMatrix();
      lamps.setMatrixAt(i, tmp.matrix);
    });
    {
      const pos = grounds.geometry.attributes.position.array;
      const col = grounds.geometry.attributes.color.array;
      fixed.forEach((l, i) => {
        writeDisc(pos, col, i, l.x, l.z, l.r, l.kind === 'campfire' ? FIRE_GROUND : LAMP_COLOR);
        halos.setColorAt(i, l.kind === 'campfire' ? FIRE_COLOR : LAMP_COLOR);
      });
      grounds.geometry.attributes.position.needsUpdate = true;
      grounds.geometry.attributes.color.needsUpdate = true;
      grounds.geometry.setDrawRange(0, fixed.length * SEGS * (1 + (RINGS - 1) * 2) * 3);
    }
    for (const m of [logs, flames, cores, stones, embers, posts, lamps, halos]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
    if (fireSet) {
      fireSet.setCount(fires.length);
      fireSet.finish();
      fireSet.addTo(group);
    }
    for (const ls of lampSets) {
      ls.set.setCount(ls.n);
      ls.set.finish();
      ls.set.addTo(group);
    }
    logs.castShadow = true;
    stones.castShadow = true;
    posts.castShadow = true;
    halos.renderOrder = 2;
    halos.frustumCulled = false;
    flames.renderOrder = 3;
    group.add(logs, stones, embers, flames, cores, posts, lamps, grounds, halos);
  }

  build(initialState);

  const cands = [];
  let flickerT = 0;

  function handPos(doll, out) {
    if (doll.handL === undefined) {
      doll.handL = doll.root ? doll.root.getObjectByName('hand_l') || null : null;
    }
    if (doll.handL) {
      doll.handL.getWorldPosition(out);
      out.y -= 0.12;
      return out;
    }
    const g = doll.group.position;
    const s = doll.group.scale.x || 1;
    out.set(g.x + Math.cos(doll.group.rotation.y) * 0.35 * s, g.y + 0.95 * s, g.z - Math.sin(doll.group.rotation.y) * 0.35 * s);
    return out;
  }

  // focus: 注視点 {x,z}。dolls: createDollManager の戻り値。
  function update(state, dolls, focus, camera, dt) {
    const night = darknessOf(ambientLight(state));
    // 夕方から少しずつ。昼は全部消す（板も点光源も）。
    const k = Math.min(1, Math.max(0, (night - 0.15) / 0.6));
    flickerT += dt || 0;
    groundMat.opacity = 0.38 * k;
    for (const m of glowMats) m.emissiveIntensity = m.userData.baseEmissive * (0.12 + 0.88 * k);
    haloMat.opacity = 0.85 * k;
    const show = k > 0.001;
    if (grounds) grounds.visible = show;
    if (halos) halos.visible = show;
    lanternGround.visible = show;
    lanternHalo.visible = show;

    const q = camera.quaternion;
    // 炎のゆらぎ（数が少ないので毎フレーム）
    if (flames && fireList.length) {
      fireList.forEach((f, i) => {
        const a = 1 + 0.14 * Math.sin(flickerT * 9 + i * 2.1) + 0.07 * Math.sin(flickerT * 21 + i);
        tmp.position.set(f.x, f.y + flameY, f.z);
        tmp.rotation.set(0, flickerT * 1.5 + i, 0);
        tmp.scale.set(1, a, 1);
        tmp.updateMatrix();
        flames.setMatrixAt(i, tmp.matrix);
        tmp.scale.set(1, 2 - a, 1);
        tmp.updateMatrix();
        cores.setMatrixAt(i, tmp.matrix);
      });
      flames.instanceMatrix.needsUpdate = true;
      cores.instanceMatrix.needsUpdate = true;
    }
    // 置いた光源の光暈（カメラ向き）
    if (halos && show) {
      fixed.forEach((l, i) => {
        const fire = l.kind === 'campfire';
        tmp.position.set(l.x, fire ? l.y + 0.7 : l.lightY || l.y + 2.9, l.z);
        tmp.quaternion.copy(q);
        const s = (fire ? 1.8 : 1.6) * (fire ? 1 + 0.08 * Math.sin(flickerT * 9 + i) : 1);
        tmp.scale.set(s, s, s);
        tmp.updateMatrix();
        halos.setMatrixAt(i, tmp.matrix);
      });
      halos.instanceMatrix.needsUpdate = true;
    }

    cands.length = 0;
    const fx = focus ? focus.x : 0;
    const fz = focus ? focus.z : 0;
    for (const l of fixed) {
      const d = Math.hypot(l.x - fx, l.z - fz);
      if (d > PICK_RANGE) continue;
      const ly = l.kind === 'campfire' ? l.y + (fireModel ? flameY + FIRE_LIGHT_LIFT : 1.7) : l.lightY || l.y + 2.7;
      cands.push({ d, x: l.x, y: ly, z: l.z, r: l.r, kind: l.kind, id: 'f' + l.id });
    }

    let n = 0;
    for (const actor of state.actors) {
      if (!carriesLight(actor) || n >= MAX_LANTERNS) continue;
      const doll = dolls.getDoll(actor.id);
      if (!doll || !doll.group) continue;
      handPos(doll, v3);
      tmp.quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, doll.group.rotation.y);
      if (lanternSet) {
        // 取っ手の上端（原点）を手に。灯りの節点を光暈・点光源の位置にする。
        const s = (doll.group.scale.x || 1) * 1.3;
        tmp.position.copy(v3);
        tmp.position.y += 0.1;
        tmp.scale.setScalar(s);
        tmp.updateMatrix();
        lanternSet.set(n, tmp.matrix);
        v3.y += 0.1 + lanternNode.y * s;
      } else {
        tmp.position.copy(v3);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        lanternMesh.setMatrixAt(n, tmp.matrix);
      }
      tmp.position.copy(v3);
      tmp.quaternion.copy(q);
      tmp.scale.setScalar(0.9);
      tmp.updateMatrix();
      lanternHalo.setMatrixAt(n, tmp.matrix);
      lanternHalo.setColorAt(n, LANTERN_COLOR);
      if (show) {
        writeDisc(lanternGround.geometry.attributes.position.array, lanternGround.geometry.attributes.color.array, n, v3.x, v3.z, LANTERN.r, LANTERN_COLOR);
      }
      const d = Math.hypot(v3.x - fx, v3.z - fz);
      if (d <= PICK_RANGE) cands.push({ d: d - 20, x: v3.x, y: v3.y + (lanternSet ? 0 : 0.3), z: v3.z, r: LANTERN.r, kind: 'lantern', id: 'a' + actor.id });
      n += 1;
    }
    lanternMesh.count = n;
    if (lanternSet) {
      lanternSet.setCount(n);
      lanternSet.finish(false);
    }
    lanternHalo.count = n;
    lanternGround.geometry.setDrawRange(0, n * SEGS * (1 + (RINGS - 1) * 2) * 3);
    lanternGround.geometry.attributes.position.needsUpdate = true;
    lanternGround.geometry.attributes.color.needsUpdate = true;
    for (const m of [lanternMesh, lanternHalo]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    // 点光源の割り当て（持つ灯りを先に。d を 20m 近く数えている）
    cands.sort((a, b) => a.d - b.d);
    for (let i = 0; i < POOL; i += 1) {
      const p = pool[i];
      const c = show ? cands[i] : null;
      if (!c) {
        p.intensity = 0;
        continue;
      }
      p.position.set(c.x, c.y, c.z);
      // 届く距離を広げて、明るい所の端をなめらかに（強さは少し下げる）
      p.distance = c.r * (c.kind === 'lantern' ? 1.9 : 1.6);
      const base = c.kind === 'campfire' ? FIRE_INTENSITY : LAMP_INTENSITY;
      const flick = c.kind === 'campfire' ? 1 + 0.12 * Math.sin(flickerT * 11 + i * 1.7) + 0.06 * Math.sin(flickerT * 23 + i) : 1;
      p.intensity = base * k * flick;
      color.copy(c.kind === 'campfire' ? FIRE_COLOR : c.kind === 'lamp' ? LAMP_COLOR : LANTERN_COLOR);
      p.color.copy(color);
    }
    stats.active = show ? Math.min(POOL, cands.length) : 0;
    stats.lanterns = n;
  }

  const stats = { pool: POOL, active: 0, lanterns: 0, fixed: 0 };
  stats.fixed = fixed.length;

  function reset(state) {
    build(state);
    stats.fixed = fixed.length;
  }

  return { update, reset, stats, group, pool };
}
