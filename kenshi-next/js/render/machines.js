// 古代の暴走機械（ロボット・機械の獣）の見た目。assets/mech/ の glb を骨ごと複製して動かす。
// sim では faction 'beast'（誰にでも襲いかかる）。role で模型を選ぶ（spawn_data.js の MACHINE_ROLES）。
// 人形と違い doll.root は持たない（クロスボウ・灯り・受けの構えの処理に入らないように）。

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { modelGroup } from './models.js';

import { MECH_DIR, MECH_MODELS, machineModelFor } from './mech_plan.js';

export { MECH_DIR, MECH_MODELS, machineModelFor };

// 全部読む。読めなかった物は入れない（その役目は従来の獣の形で描く）。
export async function loadMachineTemplates(names) {
  const loader = new GLTFLoader();
  const keys = names || Object.keys(MECH_MODELS);
  const out = {};
  await Promise.all(
    keys.map(async (k) => {
      try {
        const gltf = await loader.loadAsync(MECH_DIR + MECH_MODELS[k].file);
        const scene = gltf.scene;
        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene, true);
        const h = Math.max(0.01, box.max.y - box.min.y);
        scene.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false;
          const m = o.material;
          if (m) {
            m.metalness = Math.min(m.metalness ?? 0, 0.35); // 環境マップが無いと黒くつぶれる
            m.roughness = Math.max(m.roughness ?? 1, 0.6);
            if (m.emissive && m.emissive.getHex() !== 0) {
              m.emissiveIntensity = 2.2; // 光る目
              m.userData.glow = true;
            }
            m.userData.shared = true;
          }
        });
        const clips = {};
        for (const c of gltf.animations) clips[c.name] = c;
        const drop = measureDrops(scene, clips, box.min.y);
        out[k] = { scene, clips, drop, scale: MECH_MODELS[k].height ? MECH_MODELS[k].height / h : 1, minY: box.min.y, def: MECH_MODELS[k] };
      } catch (err) {
        console.warn('機械の glb を読めませんでした: ' + k, err);
      }
    })
  );
  return out;
}

// 倒れる動き（Down/Fall）の終わりの姿勢で、胴（腰・背・胸・腹）の一番低い点が地面（立ち姿の足の高さ）より
// 浮いている分（模型の単位）。読み込み時に一度だけ測り、その動きの間は体を下げて胴を地面に付ける。
// 今の模型では全部 0（胴は既に地面に付いている）と測れる。模型を差し替えた時の保険。
const BODY_BONE = /^(hips|spine|chest|abdomen|thorax|pelvis|torso)/i;

function bodyVertices(scene) {
  const list = [];
  scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const si = o.geometry.attributes.skinIndex;
    const sw = o.geometry.attributes.skinWeight;
    if (!si || !sw) return;
    const bones = o.skeleton.bones;
    const idx = [];
    for (let i = 0; i < si.count; i += 1) {
      let best = 0;
      let bw = -1;
      for (let k = 0; k < 4; k += 1) {
        const w = sw.getComponent(i, k);
        if (w > bw) {
          bw = w;
          best = si.getComponent(i, k);
        }
      }
      const bone = bones[best];
      if (bone && BODY_BONE.test(bone.name)) idx.push(i);
    }
    if (idx.length) list.push([o, idx]);
  });
  return list;
}

function bodyMinY(list) {
  const v = new THREE.Vector3();
  let min = Infinity;
  for (const [mesh, idx] of list) {
    for (let n = 0; n < idx.length; n += 1) {
      mesh.getVertexPosition(idx[n], v);
      v.applyMatrix4(mesh.matrixWorld);
      if (v.y < min) min = v.y;
    }
  }
  return min;
}

function measureDrops(scene, clips, standMinY) {
  const drop = {};
  const names = ['Down', 'Fall'].filter((n) => clips[n]);
  if (!names.length) return drop;
  const body = bodyVertices(scene);
  const saved = [];
  scene.traverse((o) => saved.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  const mixer = new THREE.AnimationMixer(scene);
  for (const n of names) {
    const a = mixer.clipAction(clips[n]);
    a.reset();
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.play();
    mixer.setTime(clips[n].duration);
    scene.updateMatrixWorld(true);
    const low = body.length ? bodyMinY(body) : new THREE.Box3().setFromObject(scene, true).min.y;
    const d = low - standMinY;
    drop[n] = Number.isFinite(d) && d > 0.005 ? d : 0;
    a.stop();
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(scene);
  // 骨を元の姿勢に戻す
  for (const [o, p, q, sc] of saved) {
    o.position.copy(p);
    o.quaternion.copy(q);
    o.scale.copy(sc);
  }
  scene.updateMatrixWorld(true);
  return drop;
}

// 遺跡に貼る錆の模様（機械の獣の 'Ancient rusted panels' の色の模様）。無ければ null。
export function ruinTextureFrom(templates) {
  for (const k of ['mech_dog', 'mech_boar', 'mech_spider', 'mech_lizard']) {
    const t = templates && templates[k];
    if (!t) continue;
    let map = null;
    t.scene.traverse((o) => {
      if (!map && o.isMesh && o.material && o.material.map && !o.material.userData.glow) map = o.material.map;
    });
    if (map) return map;
  }
  return null;
}

function deadMaterial(m) {
  const d = m.clone();
  d.color.multiplyScalar(0.38);
  if (d.emissive) d.emissive.setHex(0);
  d.userData.shared = false;
  return d;
}

export function createMachine(actor, tpl, katanaModel) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.add(visual);
  const root = SkeletonUtils.clone(tpl.scene);
  root.scale.setScalar(tpl.scale);
  root.position.y = -tpl.minY * tpl.scale;
  visual.add(root);
  root.traverse((o) => {
    if (o.isMesh) o.userData.shared = true;
  });
  if (tpl.def.katana && katanaModel) {
    const hand = root.getObjectByName('hand_r');
    if (hand) {
      // katanaModel は models.js の bake 済み（glb の座標そのまま）。行列は骨の倍率も含めて求めてある。
      const k = modelGroup(katanaModel);
      const holder = new THREE.Group();
      holder.name = 'katana_holder';
      holder.matrixAutoUpdate = false;
      holder.matrix.fromArray(tpl.def.katana);
      holder.add(k);
      hand.add(holder);
      k.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
          o.userData.shared = true;
        }
      });
    }
  }
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const [name, clip] of Object.entries(tpl.clips)) actions[name] = mixer.clipAction(clip);
  return {
    group,
    visual,
    machineRoot: root,
    machine: true,
    beast: true, // 人形用の処理（目印・構え・クロスボウ）からは獣と同じく外す
    fallback: false,
    humanoid: !!tpl.def.humanoid,
    mixer,
    actions,
    current: null,
    animTick: -1,
    drop: tpl.drop || {},
    dropScale: tpl.scale,
    baseY: root.position.y,
    deadDark: false,
    skipDt: 0,
  };
}

const ONCE = new Set(['Attack', 'Punch', 'Hit', 'Fall', 'GetUp', 'Down']);

// 状態 → 動き。四つ足は Run/Fall/GetUp を持たないので近い物で代える。
export function machineClipFor(doll, actor) {
  const a = doll.actions;
  if (actor.state === 'dead' || actor.state === 'down') return a.Down ? 'Down' : 'Fall';
  if (actor.state === 'getup') return a.GetUp ? 'GetUp' : 'Idle';
  let n = actor.anim || 'Idle';
  if (n === 'Run' && !a.Run) n = 'Walk';
  if (n === 'Punch' && !a.Punch) n = 'Attack';
  if (n === 'Fall') n = a.Fall ? 'Fall' : 'Down';
  if (!a[n]) n = 'Idle';
  return n;
}

export function updateMachine(doll, actor, dt, speed) {
  const name = machineClipFor(doll, actor);
  if (doll.current !== name) {
    const next = doll.actions[name];
    if (next) {
      next.reset();
      if (ONCE.has(name)) {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      } else next.setLoop(THREE.LoopRepeat, Infinity);
      const prev = doll.current ? doll.actions[doll.current] : null;
      next.play();
      if (prev) prev.crossFadeTo(next, 0.2, false);
    }
    doll.current = name;
    doll.animTick = actor.animTick;
  } else if (ONCE.has(name) && name !== 'Down' && name !== 'Fall' && actor.animTick !== doll.animTick) {
    // 同じ振りをもう一度（連続の斬り・噛みつき）
    doll.actions[name].reset().play();
    doll.animTick = actor.animTick;
  }
  // 歩き・走りの速さ（四つ足は Run が無いので Walk を速める）
  const run = actor.anim === 'Run' && !doll.actions.Run ? 1.7 : 1;
  doll.mixer.timeScale = Math.max(0, speed) * run;
  doll.mixer.update(dt);
  // 倒れる動きの間は浮いた分だけ下げる（動きの進みに合わせて）
  const d = doll.drop[name] || 0;
  let y = doll.baseY;
  if (d > 0) {
    const act = doll.actions[name];
    const t = act && act.getClip().duration > 0 ? Math.min(1, act.time / act.getClip().duration) : 1;
    y -= d * doll.dropScale * t;
  }
  doll.machineRoot.position.y = y;
}

export function darkenMachine(doll) {
  if (doll.deadDark) return;
  doll.deadDark = true;
  const cache = new Map();
  doll.group.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const m = o.material;
    if (!cache.has(m)) cache.set(m, deadMaterial(m));
    o.material = cache.get(m);
    o.userData.shared = false;
  });
}
