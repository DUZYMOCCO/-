// 人形の生成・複製・アニメ・勢力色。glb が読めない時は手続き人形で代用する。

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { heightAt, FACTIONS } from '../sim/index.js';

const CLIP_FALLBACK = ['Idle', 'Walk', 'Run', 'Punch', 'Attack', 'Hit', 'Fall', 'GetUp'];
const ONE_SHOT = new Set(['Punch', 'Attack', 'Fall', 'GetUp']);
const CLAMP_ONE_SHOT = new Set(['Fall', 'GetUp']);

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

function darkenDoll(doll) {
  if (doll.deadDark) return;
  doll.deadDark = true;
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

  const legL = limb(-0.14, 0.92, 0.15, 0.86, 0.15, darkMaterial);
  const legR = limb(0.14, 0.92, 0.15, 0.86, 0.15, darkMaterial);
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

function makeGlbDoll(actor, template, color) {
  const root = SkeletonUtils.clone(template.scene);
  tintMesh(root, color);
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
  if (previous && previous.isRunning()) {
    previous.crossFadeTo(next, 0.2, false);
  } else if (previous) {
    previous.stop();
    next.fadeIn(0.2);
  } else {
    next.fadeIn(0.2);
  }
  doll.currentAction = next;
  doll.animName = key;
}

function animateFallback(doll, actor, dt, speed) {
  const parts = doll.parts;
  const moving = actor.anim === 'Walk' || actor.anim === 'Run';
  const rate = actor.anim === 'Run' ? 11 : 7;
  doll.phase += dt * Math.max(0, speed) * (moving ? rate : 2.2);
  const swing = moving ? Math.sin(doll.phase) * (actor.anim === 'Run' ? 0.95 : 0.55) : 0;
  const targetLean =
    actor.state === 'dead' || actor.state === 'down'
      ? 1.35
      : actor.state === 'getup'
        ? 0.6
        : 0;

  doll.visual.rotation.x += (targetLean - doll.visual.rotation.x) * Math.min(1, dt * 8);
  parts.legL.rotation.x = swing;
  parts.legR.rotation.x = -swing;
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

export function createDollManager(scene, template) {
  const dolls = new Map();
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
  playerRing.visible = false;
  targetRing.visible = false;
  playerRing.renderOrder = 2;
  targetRing.renderOrder = 2;
  scene.add(playerRing);
  scene.add(targetRing);

  function createDoll(actor) {
    const color = factionColor(actor);
    let doll;
    if (hasTemplate) {
      doll = makeGlbDoll(actor, template, color);
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
    doll.group.scale.setScalar(actor.renderScale || 1);
    doll.group.name = 'actor-' + actor.id;
    if (!doll.fallback) playAction(doll, actor.anim || 'Idle');
    return doll;
  }

  function disposeDoll(doll) {
    doll.group.traverse((obj) => {
      if (!obj.isMesh && !obj.isSkinnedMesh) return;
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else if (obj.material) obj.material.dispose();
    });
  }

  function sync(state) {
    const seen = new Set();
    for (const actor of state.actors) {
      seen.add(actor.id);
      let doll = dolls.get(actor.id);
      if (!doll) {
        doll = createDoll(actor);
        dolls.set(actor.id, doll);
        scene.add(doll.group);
      }
      doll.actor = actor;
      doll.group.position.set(actor.x, heightAt(actor.x, actor.z), actor.z);
      doll.group.rotation.y = actor.rot;
      doll.group.userData.attackable = !actor.isPlayer && actor.state !== 'dead';
      if (actor.state === 'dead') darkenDoll(doll);
    }
    for (const [id, doll] of dolls) {
      if (seen.has(id)) continue;
      scene.remove(doll.group);
      disposeDoll(doll);
      dolls.delete(id);
    }
  }

  function update(dt, speed, state) {
    for (const doll of dolls.values()) {
      const actor = doll.actor;
      if (!actor) continue;
      if (doll.fallback) {
        animateFallback(doll, actor, dt, speed);
        continue;
      }

      if (doll.mixer) {
        doll.mixer.timeScale = Math.max(0, speed);
        doll.mixer.update(dt);
      }

      const desired = doll.actions[actor.anim] ? actor.anim : 'Idle';
      let go = null;
      if (desired !== doll.animName) {
        const busy =
          doll.animName === 'Punch' ||
          doll.animName === 'Attack' ||
          doll.animName === 'GetUp';
        const running = doll.currentAction && doll.currentAction.isRunning();
        const toLocomotion = desired === 'Idle' || desired === 'Walk' || desired === 'Run';
        if (busy && running && toLocomotion) {
          // 攻撃や起き上がりの振りは最後まで見せる
        } else {
          go = desired;
        }
      } else if (
        (desired === 'Punch' || desired === 'Attack') &&
        actor.animTick !== doll.animTick
      ) {
        go = desired;
      }
      if (go) playAction(doll, go);
      doll.animTick = actor.animTick;
    }

    if (!state) return;
    let player = null;
    for (const actor of state.actors) {
      if (actor.isPlayer) {
        player = actor;
        break;
      }
    }
    if (player) {
      playerRing.visible = true;
      playerRing.position.set(player.x, heightAt(player.x, player.z) + 0.06, player.z);
      let target = null;
      if (player.targetId !== null) {
        for (const actor of state.actors) {
          if (actor.id === player.targetId) {
            target = actor;
            break;
          }
        }
      }
      if (target) {
        targetRing.visible = true;
        targetRing.position.set(
          target.x,
          heightAt(target.x, target.z) + 0.06,
          target.z
        );
      } else {
        targetRing.visible = false;
      }
    } else {
      playerRing.visible = false;
      targetRing.visible = false;
    }
  }

  function reset(state) {
    for (const doll of dolls.values()) {
      scene.remove(doll.group);
      disposeDoll(doll);
    }
    dolls.clear();
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
    ringGeo.dispose();
    playerRing.material.dispose();
    targetRing.material.dispose();
  }

  return {
    sync,
    update,
    reset,
    getPickables,
    dispose,
    animations,
  };
}
