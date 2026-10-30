// 人形の生成・複製・アニメ・勢力色。glb が読めない時は手続き人形で代用する。

import * as THREE from 'three';
import { hitPose } from '../sim/hitreact.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { heightAt, FACTIONS } from '../sim/index.js';
import { createBeast, updateBeast, darkenBeast } from './beasts.js';
import { createMachine, updateMachine, darkenMachine, machineModelFor } from './machines.js';
import { lookFor, femaleLookFor, createLookCache, dollKindFor } from './doll_textures.js';
import { shouldShowSquadLabel } from '../ui/labels.js';
import { SNEAK, sneakPose, sneakProgress, sneakAllowed, sneakHands } from './sneak_pose.js';

const CLIP_FALLBACK = ['Idle', 'Walk', 'Run', 'Punch', 'Attack', 'Hit', 'Fall', 'GetUp'];
// 画面外の人形を描画・影の両方から外すための使い回しオブジェクト（毎フレーム new しない）
const _frustum = new THREE.Frustum();
const _projView = new THREE.Matrix4();
const _sphere = new THREE.Sphere(new THREE.Vector3(), 2.6);

// 隠密の印（目・太陽・矢印）と頭上の名前の位置合わせ用。毎フレーム new しない。
const _anchor = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _ndcA = new THREE.Vector3();
const _ndcB = new THREE.Vector3();

// 画面上の大きさ（CSS px）。引きの画面でも小さくならないよう、距離に合わせて実寸を広げる。
// 近い時は元の実寸（目 0.5m）より小さくしない。label は頭上の名前の高さ（css の .name-label と合わせる）。
export const ICON_PX = { eye: 34, sun: 26, arrow: 30, label: 20, gap: 3 };
export const HEAD_Y = 1.95;
export const LYING_Y = 0.55;

// 頭の上の基準点（世界座標）。倒れている・担がれている時は低くする。
export function headAnchor(doll, actor, out) {
  const scale = doll.group.scale.y || 1;
  const lying =
    actor.state === 'down' ||
    actor.state === 'dead' ||
    (actor.carriedBy !== null && actor.carriedBy !== undefined);
  out.copy(doll.group.position);
  out.y += (lying ? LYING_Y : HEAD_Y) * scale;
  return out;
}

// 観察者を指す矢印（上向き・白）。太い矢じりと短い軸で、向きが一目でわかる形。
// 色は材質の color で黄・赤にする。
function makeArrowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(32, 3);
  ctx.lineTo(60, 36);
  ctx.lineTo(42, 36);
  ctx.lineTo(42, 61);
  ctx.lineTo(22, 61);
  ctx.lineTo(22, 36);
  ctx.lineTo(4, 36);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// 隠密の目を出すか（name_labels の重なり避けでも使う）。
export function indicatorShown(actor) {
  return (
    !!actor &&
    actor.faction === 'player' &&
    !!actor.sneaking &&
    actor.state !== 'dead' &&
    actor.state !== 'down' &&
    actor.state !== 'getup' &&
    !!actor.eye &&
    actor.eye !== 'none'
  );
}

const ONE_SHOT = new Set(['Punch', 'Attack', 'Hit', 'Fall', 'GetUp']);
// 20:42: 1回だけの動きは全部最後の形で止める。止めないと終わった瞬間に重みが 0 になり、
// 次の動きがふわっと入る 0.2秒の間 Tポーズ（腕を横に広げた形）が混ざって見えていた（男女とも）。
const CLAMP_ONE_SHOT = ONE_SHOT;

// 隠密の目のスプライト用。端末ごとに1回だけ描く。
function makeEyeTexture(color) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.beginPath();
  ctx.ellipse(32, 32, 26, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.68)';
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(32, 32, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.arc(32, 32, 5, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// 隠密の太陽アイコン用。丸・半分・陰の3枚を端末ごとに1回だけ描く。
function makeSunTexture(kind) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  if (kind === 'dark') {
    // 陰: 黒く塗った太陽（光の筋も黒）を明るい縁取りで描き、中に細い三日月を入れる。
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(a) * 23, 32 + Math.sin(a) * 23);
      ctx.lineTo(32 + Math.cos(a) * 29, 32 + Math.sin(a) * 29);
      ctx.strokeStyle = 'rgba(205, 215, 255, 0.95)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(16, 18, 34, 1)';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(16, 18, 34, 0.97)';
    ctx.beginPath();
    ctx.arc(32, 32, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(205, 215, 255, 0.95)';
    ctx.stroke();
    // 三日月（明るい丸に、ずらした暗い丸を重ねる）
    ctx.save();
    ctx.beginPath();
    ctx.arc(32, 32, 11, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(215, 225, 255, 0.95)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(16, 18, 34, 1)';
    ctx.beginPath();
    ctx.arc(37, 28, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255, 232, 128, 0.96)';
    ctx.beginPath();
    ctx.arc(32, 32, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(120, 90, 20, 0.7)';
    ctx.stroke();
    if (kind === 'half') {
      ctx.fillStyle = 'rgba(30, 30, 34, 0.92)';
      ctx.beginPath();
      ctx.arc(32, 32, 20, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 232, 128, 0.9)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24);
        ctx.lineTo(32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30);
        ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function loadDollTemplate(url) {
  const source = url || 'assets/doll.glb';
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      source,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    );
  });
}

function factionColor(actor) {
  const f = FACTIONS[actor.faction];
  const color = new THREE.Color(f ? f.color : '#cccccc');
  if (actor.isPlayer) color.lerp(new THREE.Color('#ffffff'), 0.25);
  return color;
}

function tintMesh(root, color) {
  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;
    obj.userData.baseColor = color.clone();
    const paint = (material) => {
      const next = material.clone();
      if (next.color) next.color.copy(color);
      if (next.emissive) next.emissive.setRGB(0, 0, 0);
      return next;
    };
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(paint);
    } else if (obj.material) {
      obj.material = paint(obj.material);
    }
  });
}

function darkenDoll(doll, looks) {
  if (doll.deadDark) return;
  doll.deadDark = true;
  if (doll.lookCache) looks = doll.lookCache; // 女性の人形は女性用の材質置き場
  if (doll.look && looks) {
    // 服テクスチャの人形は共有材質なので書き換えず、暗い版の共有材質に差し替える。
    const dark = looks.material(doll.look, true);
    doll.group.traverse((obj) => {
      if ((obj.isMesh || obj.isSkinnedMesh) && obj.userData.look) obj.material = dark;
    });
    return;
  }
  doll.group.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    const base = obj.userData.baseColor;
    const paint = (material) => {
      if (material.color) {
        if (base) material.color.copy(base);
        material.color.multiplyScalar(0.34);
      }
      return material;
    };
    if (Array.isArray(obj.material)) obj.material.forEach(paint);
    else if (obj.material) paint(obj.material);
  });
}

function makeFallbackDoll(actor, color) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.add(visual);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.6),
    roughness: 0.9,
    metalness: 0,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.6, 4, 8), material);
  body.position.y = 1.0;
  body.castShadow = true;
  visual.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), material);
  head.position.y = 1.66;
  head.castShadow = true;
  visual.add(head);

  function limb(x, y, width, height, depth, mat) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.y = -height / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    visual.add(pivot);
    return pivot;
  }

  function leg(x) {
    const upper = limb(x, 0.92, 0.15, 0.43, 0.15, darkMaterial);
    const knee = new THREE.Group();
    knee.position.y = -0.43;
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.43, 0.15), darkMaterial);
    lower.position.y = -0.215;
    lower.castShadow = true;
    knee.add(lower);
    upper.add(knee);
    upper.userData.knee = knee;
    return upper;
  }
  const legL = leg(-0.14);
  const legR = leg(0.14);
  const armL = limb(-0.37, 1.42, 0.13, 0.62, 0.13, material);
  const armR = limb(0.37, 1.42, 0.13, 0.62, 0.13, material);

  return {
    group,
    visual,
    fallback: true,
    parts: { body, head, legL, legR, armL, armR, materials: [material, darkMaterial] },
    phase: 0,
    deadDark: false,
  };
}

// 失った手足（sim の actor.missing）は骨を縮めて見えなくする。アニメの更新の後に毎回かける。
const LIMB_BONES = { lArm: 'upperarm_l', rArm: 'upperarm_r', lLeg: 'thigh_l', rLeg: 'thigh_r', head: 'Head' };
function hideMissing(doll, actor) {
  const missing = actor.missing;
  if (!missing || !missing.length || !doll.group) return;
  if (!doll.limbBones) {
    doll.limbBones = {};
    doll.group.traverse((o) => {
      if (!o.isBone) return;
      for (const [k, name] of Object.entries(LIMB_BONES)) if (o.name === name) doll.limbBones[k] = o;
    });
  }
  for (const k of missing) {
    const b = doll.limbBones[k];
    if (b) b.scale.setScalar(0.001);
  }
}

function makeGlbDoll(actor, template, color, lookMaterial) {
  const root = SkeletonUtils.clone(template.scene);
  if (lookMaterial) {
    // 肌＋服のテクスチャ。M_Main と M_Joints の両方に同じ共有材質を貼る（人形ごとの複製なし）。
    root.traverse((obj) => {
      if (!obj.isMesh && !obj.isSkinnedMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;
      obj.userData.look = true;
      obj.material = lookMaterial;
    });
  } else {
    tintMesh(root, color);
  }
  const group = new THREE.Group();
  group.add(root);

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of template.animations || []) {
    actions[clip.name] = mixer.clipAction(clip);
  }
  return {
    group,
    root,
    mixer,
    actions,
    currentAction: null,
    animName: null,
    animTick: -1,
    fallback: false,
    deadDark: false,
  };
}

function playAction(doll, name) {
  if (!doll.actions) return;
  let key = name;
  if (!doll.actions[key]) {
    if (CLIP_FALLBACK.includes(name)) {
      const found = Object.keys(doll.actions).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      if (found) key = found;
      else key = doll.actions.Idle ? 'Idle' : Object.keys(doll.actions)[0];
    } else {
      key = doll.actions.Idle ? 'Idle' : Object.keys(doll.actions)[0];
    }
  }
  if (!key) return;
  const next = doll.actions[key];
  if (!next) return;

  if (ONE_SHOT.has(key)) {
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = CLAMP_ONE_SHOT.has(key);
  } else {
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = false;
  }

  const previous = doll.currentAction;
  if (previous === next) {
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(1);
    next.play();
    return;
  }

  next.reset();
  next.enabled = true;
  next.setEffectiveWeight(1);
  next.setEffectiveTimeScale(1);
  next.play();
  if (previous && previous.enabled) {
    // 前の動き（止まった最後の形も含む）から 0.2秒で移る。重みの合計が 1 を割ると
    // 足りない分が Tポーズになるので、前の動きは重み 1 に戻し、他の消えかけは止める。
    for (const k in doll.actions) {
      const a = doll.actions[k];
      if (a !== previous && a !== next && a.enabled) a.stop();
    }
    previous.stopFading();
    previous.setEffectiveWeight(1);
    previous.crossFadeTo(next, 0.2, false);
  } else {
    if (previous) previous.stop();
  }
  doll.currentAction = next;
  doll.animName = key;
}

// mixer の間引きフレームでも前回の加算を取り除いてから再適用する。
function restoreSneakBones(doll) {
  if (!doll.sneakBones) return;
  for (const entry of Object.values(doll.sneakBones)) {
    if (!entry.saved) continue;
    entry.bone.quaternion.copy(entry.quaternion);
    entry.bone.position.copy(entry.position);
    entry.saved = false;
  }
}

function applySneakBones(doll, pose, armed, hands) {
  if (!doll.sneakBones) {
    doll.sneakBones = {};
    for (const name of ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r']) {
      const bone = doll.root.getObjectByName(name);
      if (bone) doll.sneakBones[name] = { bone, quaternion: new THREE.Quaternion(), position: new THREE.Vector3(), saved: false };
    }
  }
  const bones = doll.sneakBones;
  function rotate(name, angle) {
    const entry = bones[name];
    if (!entry || !angle) return;
    if (!entry.saved) {
      entry.quaternion.copy(entry.bone.quaternion);
      entry.position.copy(entry.bone.position);
      entry.saved = true;
    }
    entry.bone.rotateX(angle);
  }
  if (pose.drop && bones.pelvis) {
    const entry = bones.pelvis;
    entry.quaternion.copy(entry.bone.quaternion);
    entry.position.copy(entry.bone.position);
    entry.saved = true;
    // 両 GLB の pelvis の親 root は X=-90°。親の Z が人形の高さ。
    entry.bone.position.z -= pose.drop;
  }
  for (const side of ['l', 'r']) {
    rotate(`thigh_${side}`, pose.thigh);
    rotate(`calf_${side}`, pose.calf);
    rotate(`foot_${side}`, pose.foot);
    if (!armed) {
      rotate(`upperarm_${side}`, pose.arm);
      rotate(`lowerarm_${side}`, pose.elbow);
    }
    if (hands) {
      rotate(`upperarm_${side}`, hands[side].upper);
      rotate(`lowerarm_${side}`, hands[side].lower);
      rotate(`hand_${side}`, hands[side].hand);
    }
  }
  for (const name of ['spine_01', 'spine_02', 'spine_03']) rotate(name, pose.spine);
  rotate('neck_01', pose.neck + (bones.head ? 0 : pose.head));
  rotate('head', pose.head + (bones.neck_01 ? 0 : pose.neck));
}

function animateFallback(doll, actor, dt, speed) {
  const parts = doll.parts;
  const moving = actor.anim === 'Walk' || actor.anim === 'Run';
  const active = sneakAllowed(actor);
  const interrupted = !!actor.sneaking && !active;
  doll.sneakProgress = sneakProgress(doll.sneakProgress || 0, active, interrupted, dt);
  const pose = sneakPose(doll.sneakProgress);
  const rate = (actor.anim === 'Run' ? 11 : 7) * (1 - pose.weight * 0.4);
  doll.phase += dt * Math.max(0, speed) * (moving ? rate : 2.2);
  const swing = moving ? Math.sin(doll.phase) * (actor.anim === 'Run' ? 0.95 : 0.55) * (1 - pose.weight * 0.55) : 0;
  const targetLean =
    actor.state === 'dead' || actor.state === 'down' || actor.resting
      ? 1.35
      : actor.state === 'getup'
        ? 0.6
        : 0;

  doll.visual.rotation.x += (targetLean - doll.visual.rotation.x) * Math.min(1, dt * 8);
  parts.body.position.y = 1.0 - pose.drop;
  parts.head.position.y = 1.66 - pose.drop;
  parts.armL.position.y = parts.armR.position.y = 1.42 - pose.drop;
  parts.legL.position.y = parts.legR.position.y = 0.92 - pose.drop;
  parts.legL.rotation.x = swing - pose.thigh;
  parts.legR.rotation.x = -swing - pose.thigh;
  parts.legL.userData.knee.rotation.x = parts.legR.userData.knee.rotation.x = -pose.calf;
  parts.armL.rotation.x = -swing * 0.8;

  if (actor.anim === 'Punch' || actor.anim === 'Attack') {
    parts.armR.rotation.x = -1.2 + Math.sin(doll.phase * 2.4) * 0.9;
  } else {
    parts.armR.rotation.x = swing * 0.8;
  }

  if (actor.state === 'dead' && !doll.deadDark) {
    doll.deadDark = true;
    for (const mat of parts.materials) mat.color.multiplyScalar(0.34);
  }
}

// female: { template, lookImages } を渡すと sex==='f' の人を女性の人形で描く（20:42）。無ければ全員男の人形。
export function createDollManager(scene, template, lookImages, female) {
  const dolls = new Map();
  const looks = lookImages ? createLookCache(THREE, lookImages) : null;
  const femaleTemplate = female && female.template && female.template.scene ? female.template : null;
  const femaleLooks = femaleTemplate && female.lookImages ? createLookCache(THREE, female.lookImages) : null;
  // 21:xx 髪型ごとの女性の型（tex_f3_beauty の5人をモブの見た目に）。読めなければ無し。
  const hairTemplates = femaleTemplate && femaleLooks && female.hairTemplates ? female.hairTemplates : null;
  let simState = null;
  const animations = template && Array.isArray(template.animations) ? template.animations : [];
  const hasTemplate = !!template && !!template.scene;

  const ringGeo = new THREE.RingGeometry(0.5, 0.74, 28);
  ringGeo.rotateX(-Math.PI / 2);
  const playerRing = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: 0xe0b84a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const targetRing = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: 0xd84a3f,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const selectionRing = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: 0xf2f0e8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  playerRing.visible = false;
  targetRing.visible = false;
  selectionRing.visible = false;
  playerRing.renderOrder = 2;
  targetRing.renderOrder = 2;
  selectionRing.renderOrder = 2;
  scene.add(playerRing);
  scene.add(targetRing);
  scene.add(selectionRing);

  // 隠密の目。青・黄・赤の3枚を最初に1回だけ描き、材質を使い回す。
  const eyeMaterials = {};
  for (const [key, color] of [
    ['blue', '#4a9be0'],
    ['yellow', '#e8cf4a'],
    ['red', '#e04a3f'],
  ]) {
    const texture = makeEyeTexture(color);
    eyeMaterials[key] = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }

  // 観察者を指す三角。絵は1枚を共有し、向き（rotation）と色は矢印ごとの材質で持つ。
  const arrowTexture = makeArrowTexture();
  const ARROW_YELLOW = 0xe8cf4a;
  const ARROW_RED = 0xe04a3f;

  // 太陽アイコン。丸・半分・陰の3枚を最初に1回だけ描き、材質を使い回す。
  const sunMaterials = {};
  for (const key of ['full', 'half', 'dark']) {
    const texture = makeSunTexture(key);
    sunMaterials[key] = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }

  let showNames = true;
  let viewW = 800;
  let viewH = 800;
  let fovTan = Math.tan((45 * Math.PI) / 360);

  // 印は人形の子にせず scene 直下に置く（画面の上下左右に合わせて並べるため）。
  // 隠密を初めて使う時に作る。NPC には作らない。
  function ensureIndicator(doll) {
    if (doll.ind) return doll.ind;
    const eye = new THREE.Sprite(eyeMaterials.blue);
    eye.renderOrder = 4;
    eye.visible = false;
    scene.add(eye);
    const sun = new THREE.Sprite(sunMaterials.full);
    sun.renderOrder = 4;
    sun.visible = false;
    scene.add(sun);
    const arrows = [];
    for (let i = 0; i < 4; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: arrowTexture,
        color: ARROW_YELLOW,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const arrow = new THREE.Sprite(material);
      arrow.renderOrder = 4;
      arrow.visible = false;
      arrow.userData.red = false;
      scene.add(arrow);
      arrows.push(arrow);
    }
    doll.ind = { eye, sun, arrows };
    return doll.ind;
  }

  function hideIndicator(doll) {
    const ind = doll.ind;
    if (!ind) return;
    ind.eye.visible = false;
    ind.sun.visible = false;
    for (let i = 0; i < ind.arrows.length; i += 1) ind.arrows[i].visible = false;
  }

  function removeIndicator(doll) {
    const ind = doll.ind;
    if (!ind) return;
    scene.remove(ind.eye);
    scene.remove(ind.sun);
    for (const arrow of ind.arrows) {
      scene.remove(arrow);
      arrow.material.dispose();
    }
    doll.ind = null;
  }

  function updateIndicator(doll, actor, state, camera) {
    if (
      !camera ||
      !doll.group.visible ||
      !indicatorShown(actor)
    ) {
      hideIndicator(doll);
      return;
    }
    const ind = ensureIndicator(doll);
    headAnchor(doll, actor, _anchor);
    const dist = Math.max(0.1, camera.position.distanceTo(_anchor));
    // 1 CSS px が、この距離で何 m か。
    const w = (2 * dist * fovTan) / viewH;

    let eyePx = ICON_PX.eye;
    if (actor.eye === 'yellow') {
      const level = typeof actor.eyeLevel === 'number' ? actor.eyeLevel : 0;
      eyePx *= 0.85 + 0.3 * Math.max(0, Math.min(1, level));
    }
    const eyeWorld = Math.max(0.5 * (eyePx / ICON_PX.eye), eyePx * w);
    const k = eyeWorld / (eyePx * w);
    const eyeReal = eyePx * k;
    const sunReal = ICON_PX.sun * k;
    const arrowReal = ICON_PX.arrow * k;
    const labelShown = shouldShowSquadLabel(state, actor, showNames);
    // nudgePx: 引きの画面で仲間同士が重ならないよう name_labels が決めた上ずらし（1フレーム前の値）。
    const nudge = typeof doll.nudgePx === 'number' ? doll.nudgePx : 0;
    const up = (labelShown ? ICON_PX.label + ICON_PX.gap * 2 : ICON_PX.gap) + eyeReal / 2 + nudge;

    const eye = ind.eye;
    const material = eyeMaterials[actor.eye];
    if (material && eye.material !== material) eye.material = material;
    eye.position.copy(_anchor).addScaledVector(_camUp, up * w);
    eye.scale.set(eyeWorld, eyeWorld, 1);
    eye.visible = true;

    // 太陽は目の右。矢印の輪の外に置いて重ならないようにする。
    const sun = ind.sun;
    const light =
      typeof actor.light === 'number' && Number.isFinite(actor.light) ? actor.light : 1;
    const key = light > 0.66 ? 'full' : light >= 0.33 ? 'half' : 'dark';
    const sunMaterial = sunMaterials[key];
    if (sunMaterial && sun.material !== sunMaterial) sun.material = sunMaterial;
    const sunOff = eyeReal / 2 + arrowReal + ICON_PX.gap + 3 + sunReal / 2;
    sun.position.copy(eye.position).addScaledVector(_camRight, sunOff * w);
    sun.scale.set(sunReal * w, sunReal * w, 1);
    sun.visible = true;

    // 矢印: 観察者ごとに1本。画面上の向きで目の周りに置く。
    const watchers = Array.isArray(actor.watchers) ? actor.watchers : null;
    const arrows = ind.arrows;
    let projected = false;
    const radius = (eyeReal / 2 + arrowReal / 2 + 3) * w;
    for (let i = 0; i < arrows.length; i += 1) {
      const arrow = arrows[i];
      const watcher = watchers && i < watchers.length ? watchers[i] : null;
      const observer = watcher ? dolls.get(watcher.id) : null;
      if (!watcher || !observer || !observer.group) {
        arrow.visible = false;
        continue;
      }
      if (!projected) {
        _ndcA.copy(doll.group.position).project(camera);
        projected = true;
      }
      _ndcB.copy(observer.group.position).project(camera);
      let sx = (_ndcB.x - _ndcA.x) * viewW;
      let sy = (_ndcB.y - _ndcA.y) * viewH;
      if (_ndcB.z > 1) {
        sx = -sx;
        sy = -sy;
      }
      const angle = Math.atan2(sx, sy);
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      let ox = s * radius;
      let oy = c * radius;
      // 名前が目の下にある時、下向きの矢印は名前に重なるので目の横へ逃がす（向きはそのまま）。
      const floor = -eyeReal * 0.25 * w;
      if (labelShown && oy < floor) {
        oy = floor;
        const side = s < 0 ? -1 : s > 0 ? 1 : -1;
        ox = side * Math.max(Math.abs(ox), radius);
      }
      arrow.position
        .copy(eye.position)
        .addScaledVector(_camRight, ox)
        .addScaledVector(_camUp, oy);
      arrow.material.rotation = -angle;
      const red = watcher.state === 'red';
      if (arrow.userData.red !== red) {
        arrow.userData.red = red;
        arrow.material.color.setHex(red ? ARROW_RED : ARROW_YELLOW);
      }
      arrow.scale.set(arrowReal * w, arrowReal * w, 1);
      arrow.visible = true;
    }
  }

  function createDoll(actor) {
    const color = factionColor(actor);
    const isBeast = actor.faction === 'beast';
    let doll;
    const mech = machines && machineModelFor(actor);
    if (mech && machines.templates[mech]) {
      doll = createMachine(actor, machines.templates[mech], machines.katana);
    } else if (isBeast) {
      doll = createBeast(actor, color);
    } else if (hasTemplate) {
      const kind = dollKindFor(actor, !!femaleTemplate, simState);
      const cache = kind === 'f' ? femaleLooks : looks;
      const look = cache ? (kind === 'f' ? femaleLookFor(actor, !!hairTemplates, female.beautyForce) : lookFor(actor)) : null;
      const tpl = kind === 'f' ? (look && look.hair && hairTemplates[look.hair]) || femaleTemplate : template;
      doll = makeGlbDoll(actor, tpl, color, look ? cache.material(look, false) : null);
      doll.look = look;
      doll.lookCache = cache;
      doll.kind = kind;
      if (Object.keys(doll.actions).length === 0) {
        doll = makeFallbackDoll(actor, color);
      }
    } else {
      doll = makeFallbackDoll(actor, color);
    }
    doll.actorId = actor.id;
    doll.actor = actor;
    doll.group.userData.actorId = actor.id;
    doll.group.userData.isPlayer = !!actor.isPlayer;
    // 獣は beasts.js 側で実寸（全長約1.6m・高さ約1m）に作ってあるので renderScale は使わない。
    doll.group.scale.setScalar(isBeast ? 1 : actor.renderScale || 1);
    doll.group.name = 'actor-' + actor.id;
    doll.ind = null;
    doll.skipDt = 0;
    doll.farFrames = 0;
    if (!doll.fallback && !doll.beast) playAction(doll, actor.anim || 'Idle');
    return doll;
  }

  function disposeDoll(doll) {
    removeIndicator(doll);
    doll.group.traverse((obj) => {
      if (!obj.isMesh && !obj.isSkinnedMesh) return;
      if (obj.userData.shared || obj.userData.look) return;
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else if (obj.material) obj.material.dispose();
    });
  }

  // 生成・削除と状態の反映だけ。位置と向きは update で補間して置く。
  const seen = new Set();
  function sync(state) {
    simState = state;
    seen.clear();
    for (const actor of state.actors) {
      seen.add(actor.id);
      let doll = dolls.get(actor.id);
      if (!doll) {
        doll = createDoll(actor);
        dolls.set(actor.id, doll);
        scene.add(doll.group);
      }
      doll.actor = actor;
      doll.group.userData.attackable = !actor.isPlayer && actor.state !== 'dead';
      doll.group.userData.pickable = true;
      if (actor.state === 'dead') {
        if (doll.machine) darkenMachine(doll);
        else if (doll.beast) darkenBeast(doll);
        else darkenDoll(doll, looks);
      }
    }
    for (const [id, doll] of dolls) {
      if (seen.has(id)) continue;
      scene.remove(doll.group);
      disposeDoll(doll);
      dolls.delete(id);
    }
  }

  // prev（step 前）と curr（いまの state）を alpha で線形補間する。3m 以上飛んだら補間しない。
  const MAX_STEP_DIST2 = 3 * 3;
  function placeDoll(doll, actor, alpha, prevMap) {
    const prev = prevMap ? prevMap.get(actor.id) : null;
    let x = actor.x;
    let z = actor.z;
    let rot = actor.rot;
    if (prev) {
      const dx = actor.x - prev.x;
      const dz = actor.z - prev.z;
      if (dx * dx + dz * dz <= MAX_STEP_DIST2) {
        x = prev.x + dx * alpha;
        z = prev.z + dz * alpha;
        let dr = actor.rot - prev.rot;
        dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        rot = prev.rot + dr * alpha;
      }
    }
    doll.group.position.set(x, heightAt(x, z), z);
    doll.group.rotation.set(0, rot, 0);
  }

  const playerPos = { x: 0, y: 0, z: 0, has: false };
  const FAR_DIST2 = 90 * 90;
  let selectedId = null;

  // 選択は画面側の状態なので state には入れない。main から毎フレーム渡す。
  function setSelected(id) {
    selectedId = id === undefined ? null : id;
  }

  function update(dt, speed, state, alpha, prevMap, camera) {
    const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;

    for (const doll of dolls.values()) {
      const actor = doll.actor;
      if (!actor) continue;
      if (typeof actor.carriedBy === 'number') continue;
      placeDoll(doll, actor, a, prevMap);
    }
    // 運ばれている人物は、運んでいる人の補間位置の上（y+1.35）に横向きで置く。
    for (const doll of dolls.values()) {
      const actor = doll.actor;
      if (!actor || typeof actor.carriedBy !== 'number') continue;
      const carrier = dolls.get(actor.carriedBy);
      const prev = prevMap ? prevMap.get(actor.id) : null;
      let rot = actor.rot;
      if (prev) {
        let dr = actor.rot - prev.rot;
        dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        rot = prev.rot + dr * a;
      }
      if (carrier) {
        doll.group.position.set(
          carrier.group.position.x,
          carrier.group.position.y + 1.35,
          carrier.group.position.z
        );
      }
      doll.group.rotation.set(0, rot, Math.PI / 2);
    }

    const camX = camera ? camera.position.x : 0;
    const camZ = camera ? camera.position.z : 0;
    if (camera) {
      camera.updateMatrixWorld();
      _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      _camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      fovTan = Math.tan(((camera.fov || 45) * Math.PI) / 360);
      if (typeof window !== 'undefined') {
        viewW = Math.max(1, window.innerWidth || viewW);
        viewH = Math.max(1, window.innerHeight || viewH);
      }
      _projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_projView);
    }
    for (const doll of dolls.values()) {
      const actor = doll.actor;
      if (!actor) continue;
      // frustumCulled=false の部品が多いので、人形単位でまとめて画面外判定する。
      // 半径は影が画面に入る分の余裕を見て 2.6m。
      let onScreen = true;
      if (camera) {
        _sphere.center.copy(doll.group.position);
        _sphere.center.y += 0.9;
        onScreen = _frustum.intersectsSphere(_sphere);
      }
      if (actor.eaten) onScreen = false; // 食い尽くされた亡骸は描かない
      doll.group.visible = onScreen;
      // 機械は画面の外でも倒れる動きだけは進める（戻った時に立ったまま死んでいないように）
      if (!onScreen && doll.beast && !(doll.machine && (actor.state === 'dead' || actor.state === 'down'))) continue;
      if (!doll.beast) updateIndicator(doll, actor, state, camera);
      if (doll.machine) {
        updateMachine(doll, actor, dt, speed);
        continue;
      }
      if (doll.beast) {
        updateBeast(doll, actor, dt, speed);
        continue;
      }
      if (doll.fallback) {
        animateFallback(doll, actor, dt, speed);
        if (doll.parts && Array.isArray(actor.missing)) {
          const m = actor.missing;
          doll.parts.armL.visible = !m.includes('lArm');
          doll.parts.armR.visible = !m.includes('rArm');
          doll.parts.legL.visible = !m.includes('lLeg');
          doll.parts.legR.visible = !m.includes('rLeg');
          if (doll.parts.head) doll.parts.head.visible = !m.includes('head');
        }
        continue;
      }

      const hp = hitPose(actor, state ? state.tick : 0);
      const reacting = hp.lean !== 0 || hp.squash !== 1;
      const busy = ONE_SHOT.has(doll.animName) && doll.currentAction && doll.currentAction.isRunning();
      const sneaking = sneakAllowed(actor, reacting || busy);
      const interrupted = !!actor.sneaking && !sneaking;
      doll.sneakProgress = sneakProgress(doll.sneakProgress || 0, sneaking, interrupted, dt);
      const pose = sneakPose(doll.sneakProgress);
      restoreSneakBones(doll);
      if (doll.mixer) {
        const rate = actor.anim === 'Run' ? SNEAK.runRate : SNEAK.walkRate;
        const sneakSlow = (actor.anim === 'Walk' || actor.anim === 'Run') ? 1 - pose.weight * (1 - rate) : 1;
        doll.mixer.timeScale = Math.max(0, speed) * sneakSlow;
        const dx = doll.group.position.x - camX;
        const dz = doll.group.position.z - camZ;
        if (camera && (!onScreen || dx * dx + dz * dz > FAR_DIST2)) {
          // 画面外は 4フレームに1回へまとめる（dt をためて一度に渡す）。
          doll.skipDt += dt;
          doll.farFrames += 1;
          if (doll.farFrames % 4 === 0) {
            doll.mixer.update(doll.skipDt);
            doll.skipDt = 0;
          }
        } else {
          doll.farFrames = 0;
          doll.mixer.update(dt + doll.skipDt);
          doll.skipDt = 0;
        }
      }

      hideMissing(doll, actor);
      const action = doll.currentAction;
      const duration = action && action.getClip().duration;
      const phase = duration > 0 ? action.time / duration : 0;
      const hands = sneaking && actor.carryingId == null ? sneakHands(actor.anim, phase, pose.weight) : null;
      applySneakBones(doll, pose, !!actor.crossbow || (actor.weapon && actor.weapon !== 'fists' && actor.weapon !== 'bite'), hands);

      // root の変形はよろけ専用。隠密は上の骨の姿勢で表現する。
      if (doll.root) {
        const k = Math.min(1, dt * (reacting ? 16 : 8));
        doll.root.rotation.x += (hp.lean - doll.root.rotation.x) * k;
        doll.root.scale.y += (hp.squash - doll.root.scale.y) * k;
      }

      // 20:13 チャンバラ: よろけ（Stagger）は Hit の動きをゆっくり流す（速さは combat_fx.js）。
      // 受け（Block）は専用の動きが無いので Idle の上に combat_fx.js が腕の構えを重ねる。
      const simAnim = actor.anim === 'Stagger' ? 'Hit' : actor.anim;
      const desired = doll.actions[simAnim] ? simAnim : 'Idle';
      let go = null;
      if (desired !== doll.animName) {
        const busy =
          doll.animName === 'Punch' ||
          doll.animName === 'Attack' ||
          doll.animName === 'Hit' ||
          doll.animName === 'GetUp';
        const running = doll.currentAction && doll.currentAction.isRunning();
        // 受けは攻撃の振りを止めて構えに移る（移動扱いにしない）
        const toLocomotion = actor.anim === 'Idle' || actor.anim === 'Walk' || actor.anim === 'Run';
        if (busy && running && toLocomotion) {
          // 攻撃や起き上がりの振りは最後まで見せる
        } else {
          go = desired;
        }
      } else if (
        (desired === 'Punch' || desired === 'Attack' || desired === 'Hit') &&
        actor.animTick !== doll.animTick
      ) {
        go = desired;
      }
      if (go) playAction(doll, go);
      doll.animTick = actor.animTick;
    }

    if (!state) {
      playerPos.has = false;
      playerRing.visible = false;
      targetRing.visible = false;
      selectionRing.visible = false;
      return;
    }
    const playerDoll = state.playerId !== null && state.playerId !== undefined
      ? dolls.get(state.playerId)
      : null;
    if (playerDoll && playerDoll.actor) {
      const px = playerDoll.group.position.x;
      const pz = playerDoll.group.position.z;
      playerPos.x = px;
      playerPos.y = playerDoll.group.position.y;
      playerPos.z = pz;
      playerPos.has = true;
      playerRing.visible = true;
      playerRing.position.set(px, playerDoll.group.position.y + 0.06, pz);
      const targetId = playerDoll.actor.targetId;
      const targetDoll =
        targetId !== null && targetId !== undefined ? dolls.get(targetId) : null;
      if (targetDoll) {
        targetRing.visible = true;
        targetRing.position.set(
          targetDoll.group.position.x,
          targetDoll.group.position.y + 0.06,
          targetDoll.group.position.z
        );
      } else {
        targetRing.visible = false;
      }
    } else {
      playerPos.has = false;
      playerRing.visible = false;
      targetRing.visible = false;
    }

    const selectedDoll = selectedId !== null ? dolls.get(selectedId) : null;
    if (selectedDoll && selectedDoll.group) {
      selectionRing.visible = true;
      // プレイヤーの金の輪と重なってもちらつかないよう、少しだけ上に置く。
      selectionRing.position.set(
        selectedDoll.group.position.x,
        selectedDoll.group.position.y + 0.07,
        selectedDoll.group.position.z
      );
    } else {
      selectionRing.visible = false;
    }
  }

  function reset(state) {
    for (const doll of dolls.values()) {
      scene.remove(doll.group);
      disposeDoll(doll);
    }
    dolls.clear();
    playerPos.has = false;
    selectionRing.visible = false;
    sync(state);
  }

  function getPickables() {
    const out = [];
    for (const doll of dolls.values()) out.push(doll.group);
    return out;
  }

  function dispose() {
    reset({ actors: [] });
    scene.remove(playerRing);
    scene.remove(targetRing);
    scene.remove(selectionRing);
    ringGeo.dispose();
    playerRing.material.dispose();
    targetRing.material.dispose();
    selectionRing.material.dispose();
    if (looks) looks.dispose();
    if (femaleLooks) femaleLooks.dispose();
    if (arrowTexture) arrowTexture.dispose();
    for (const key of Object.keys(sunMaterials)) {
      const material = sunMaterials[key];
      if (material.map) material.map.dispose();
      material.dispose();
    }
    for (const key of Object.keys(eyeMaterials)) {
      const material = eyeMaterials[key];
      if (material.map) material.map.dispose();
      material.dispose();
    }
  }

  function setShowNames(on) {
    showNames = !!on;
  }

  function getDoll(id) {
    return dolls.get(id) || null;
  }

  // 古代の暴走機械の模型（machines.js）。読めなかった時は null のまま＝従来の獣の形。
  let machines = null;
  function setMachines(templates, katana) {
    machines = templates && Object.keys(templates).length ? { templates, katana: katana || null } : null;
  }

  return {
    sync,
    update,
    setMachines,
    setShowNames,
    getDoll,
    reset,
    getPickables,
    dispose,
    setSelected,
    animations,
    playerPos,
    get femaleReady() {
      return !!femaleTemplate;
    },
    countKinds() {
      let f = 0;
      let m = 0;
      let hair = 0;
      for (const d of dolls.values()) {
        if (d.kind === 'f') f += 1;
        else if (d.kind === 'm') m += 1;
        if (d.look && d.look.hair) hair += 1;
      }
      return { f, m, hair };
    },
  };
}
