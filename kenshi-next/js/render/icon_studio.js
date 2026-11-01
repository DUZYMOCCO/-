import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { ITEMS } from '../sim/items.js';
import { WEAPONS } from '../sim/data.js';
import { weaponModel, weaponGeneration } from './weapons_v3.js';
import { proceduralWeapon } from './procedural_weapon.js';
import { buildCrossbowGeometry, CROSSBOW_IDS } from './crossbow_geometry.js';
import { armorPlan, buildArmorGeometry } from './armor_look.js';
import { loadArmour, createV4 } from './armour_v4.js';
import { createTrapRenderer } from './traps.js';

const SIZE = 512;
const OUTPUT_SIZE = 128;
const canvas = document.querySelector('#icon');
const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff3de, 0x4b3e34, 2.1));
const keyLight = new THREE.DirectionalLight(0xfff5e5, 3.0);
keyLight.position.set(-3, 5, 7);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xb8c9df, 1.2);
fillLight.position.set(4, 1, 5);
scene.add(fillLight);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

const MATERIALS = {
  wood: new THREE.MeshStandardMaterial({ color: 0x765037, roughness: 0.82 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa3adb0, metalness: 0.4, roughness: 0.62 }),
};
const models = new Map();
const info = new Map();
const missing = [];
let listed = [];
let categoryFrustum = new Map();

function waitForWeaponModels() {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      if (weaponGeneration() > 0 || performance.now() - start > 12000) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
}

function loadGLTF(url) {
  return new Promise((resolve, reject) => new GLTFLoader().load(url, resolve, undefined, reject));
}

function armorCategory(slot) {
  if (slot === 'head') return 'head';
  if (slot === 'feet') return 'feet';
  if (slot.startsWith('upper')) return 'torso';
  return 'legs';
}

function makeArmor(id, slot, template, v4) {
  const root = cloneSkinned(template.scene);
  const idle = template.animations.find((clip) => clip.name.toLowerCase() === 'idle');
  if (idle) {
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(idle).play();
    mixer.update(0.45);
    mixer.timeScale = 0;
  }
  const meshes = [];
  root.traverse((object) => { if (object.isSkinnedMesh) meshes.push(object); });
  const body = meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count)[0];
  if (!body) throw new Error('doll.glb に素体メッシュがありません');
  const actor = { id: 41, faction: 'sand_veil_raiders', equip: { [slot]: { id, variant: 0, rank: 5 } } };
  const plan = armorPlan(actor, 'm');
  const doll = { root, kind: 'm', armorSrc: { mesh: body, geometry: body.geometry, boneNames: body.skeleton.bones.map((bone) => bone.name) } };
  const absent = v4.attach(doll, plan, false, actor);
  if (absent.length) {
    const fallbackPlan = { ...plan, pieces: absent, key: `${plan.key}|icon-fallback` };
    const geometry = buildArmorGeometry(THREE, { geometry: body.geometry, boneNames: doll.armorSrc.boneNames }, fallbackPlan);
    if (geometry.index?.count) {
      const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
      mesh.bind(body.skeleton, body.bindMatrix);
      body.parent.add(mesh);
    }
  }
  for (const mesh of meshes) mesh.visible = false;
  root.rotation.y = 0.12;
  root.updateMatrixWorld(true);
  return root;
}

function makeTrap(id) {
  const trapScene = new THREE.Scene();
  const traps = createTrapRenderer(trapScene);
  traps.update({ traps: [{ id: `icon-${id}`, type: id, state: 'armed', x: 0, z: 0 }], actors: [], tick: 0 }, null);
  const model = trapScene.children.find((child) => child.userData.type === id);
  if (!model) throw new Error(`${id} の3Dトラップが作れません`);
  trapScene.remove(model);
  traps.dispose();
  model.rotation.x = -Math.PI / 2;
  return model;
}

function prepareModel(id, definition, dollTemplate, v4) {
  let category;
  let model;
  if (CROSSBOW_IDS.includes(id)) {
    category = 'weapon';
    model = buildCrossbowGeometry(THREE, id, 0, MATERIALS);
    model.rotation.x = -Math.PI / 2;
  } else if (definition.slot === 'weapon' && WEAPONS[id]) {
    category = 'weapon';
    model = weaponModel(id, 0) || proceduralWeapon(id, 0);
    if (!model) throw new Error('weaponModel と proceduralWeapon の両方にモデルがありません');
    model.rotation.x = -Math.PI / 2;
  } else if (['head', 'upperIn', 'upperOut', 'lowerIn', 'lowerOut', 'feet'].includes(definition.slot)) {
    category = armorCategory(definition.slot);
    model = makeArmor(id, definition.slot, dollTemplate, v4);
  } else if (id === 'bear_trap' || id === 'net_trap') {
    category = 'trap';
    model = makeTrap(id);
  }
  if (!model) return null;
  model.updateMatrixWorld(true);
  const visibleBounds = new THREE.Box3();
  model.traverse((object) => {
    if (object.isMesh && object.visible) visibleBounds.expandByObject(object);
  });
  if (visibleBounds.isEmpty()) throw new Error('生成モデルが空です');
  const center = visibleBounds.getCenter(new THREE.Vector3());
  const centered = new THREE.Group();
  centered.add(model);
  centered.position.sub(center);
  centered.updateMatrixWorld(true);
  const size = visibleBounds.getSize(new THREE.Vector3());
  info.set(id, { category, maxDimension: Math.max(size.x, size.y, size.z) });
  return centered;
}

async function initialize() {
  await waitForWeaponModels();
  const [dollTemplate, armourPieces] = await Promise.all([loadGLTF('assets/doll.glb'), loadArmour()]);
  const v4 = createV4(THREE, armourPieces);
  for (const [id, definition] of Object.entries(ITEMS)) {
    try {
      const model = prepareModel(id, definition, dollTemplate, v4);
      if (model) models.set(id, model);
      else missing.push({ id, name: definition.name || id, reason: missingReason(id, definition) });
    } catch (error) {
      missing.push({ id, name: definition.name || id, reason: `3D生成に失敗: ${error?.message || error}` });
    }
  }
  // 長柄武器は別の縮尺にし、短い武器が小さくなりすぎないようにする。
  const weaponMax = Math.max(0, ...[...info.values()].filter((entry) => entry.category === 'weapon').map((entry) => entry.maxDimension));
  for (const entry of info.values()) if (entry.category === 'weapon' && entry.maxDimension > weaponMax * 0.62) entry.category = 'weapon_long';
  const maxima = new Map();
  for (const [id, model] of models) {
    const { category, maxDimension } = info.get(id);
    maxima.set(category, Math.max(maxima.get(category) || 0, maxDimension));
  }
  for (const [category, maximum] of maxima) categoryFrustum.set(category, Math.max(maximum * 1.24, 0.1));
  listed = [...models.keys()].map((id) => ({ id, category: info.get(id).category }));
  status.textContent = `${listed.length} アイテムを撮影できます / 3Dモデルなし ${missing.length} 件`;
  v4.dispose();
}

function missingReason(id, definition) {
  if (definition.slot === 'backpack') return '背負い袋の独立した3Dアイテムモデルがありません';
  if (definition.slot === 'ammo' || definition.stackable || definition.slot === 'throwable') return '材料・弾薬・投げ物の独立した3Dアイテムモデルがありません';
  if (definition.slot === 'acc' || definition.slot === 'quiver' || definition.slot === 'prosthetic') return '独立した装備アイテムの3Dモデルがありません';
  if (definition.slot === 'weapon') return '武器モデル生成コードに対応する形状がありません';
  return 'ゲーム内に独立した3Dアイテムモデルがありません';
}

function withSoftOutline(source) {
  const work = document.createElement('canvas');
  work.width = SIZE;
  work.height = SIZE;
  const ctx = work.getContext('2d');
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'rgba(255, 244, 218, 0.52)';
  ctx.shadowBlur = 7;
  ctx.drawImage(source, 0, 0);
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(source, 0, 0);
  const output = document.createElement('canvas');
  output.width = OUTPUT_SIZE;
  output.height = OUTPUT_SIZE;
  const outputContext = output.getContext('2d');
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = 'high';
  outputContext.drawImage(work, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return output.toDataURL('image/png');
}

async function render(id, variant = 0) {
  await window.__iconStudio.ready;
  const template = models.get(id);
  if (!template) throw new Error(`撮影できる3Dモデルがありません: ${id}`);
  const model = cloneSkinned(template);
  if (variant) model.rotation.z += (Math.trunc(variant) % 3) * 0.025;
  scene.add(model);
  const extent = categoryFrustum.get(info.get(id).category) || 2;
  camera.left = -extent / 2;
  camera.right = extent / 2;
  camera.top = extent / 2;
  camera.bottom = -extent / 2;
  camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
  const result = withSoftOutline(canvas);
  scene.remove(model);
  return result;
}

window.__iconStudio = {
  ready: initialize(),
  list: () => listed.map((entry) => ({ ...entry })),
  missing,
  render,
};

