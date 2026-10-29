// 獣（faction==='beast'）の四つ足の仮モデル。箱・円柱・円錐で組み、人形と同じく
// group の userData.actorId でタップ選択できるようにする。正面は +Z。

import * as THREE from 'three';

const FALL_ANGLE = Math.PI * 0.48;

function beastMaterial(color, shade) {
  return new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(shade),
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
}

export function createBeast(actor, color) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  // 設計寸法（全長約1.9m・高さ約1.1m）を 0.85 倍して、全長約1.6m・高さ約1mにする。
  visual.scale.setScalar(0.85);
  group.add(visual);

  const bodyMat = beastMaterial(color, 1);
  const darkMat = beastMaterial(color, 0.6);
  const lightMat = beastMaterial(color, 1.16);
  const materials = [bodyMat, darkMat, lightMat];

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 1), bodyMat);
  body.position.set(0, 0.66, 0);
  visual.add(body);

  const hump = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.5), darkMat);
  hump.position.set(0, 0.94, -0.12);
  visual.add(hump);

  // 首の付け根を回して噛みつきを表現する
  const neck = new THREE.Group();
  neck.position.set(0, 0.8, 0.42);
  neck.rotation.x = 0.75;
  visual.add(neck);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.4, 6), bodyMat);
  neckMesh.position.set(0, 0.2, 0);
  neck.add(neckMesh);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.36), bodyMat);
  head.position.set(0, 0.46, 0.05);
  neck.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.24), lightMat);
  snout.position.set(0, 0.4, 0.26);
  neck.add(snout);

  const earGeo = new THREE.ConeGeometry(0.055, 0.16, 4);
  const earL = new THREE.Mesh(earGeo, darkMat);
  earL.position.set(-0.08, 0.63, 0.02);
  neck.add(earL);
  const earR = new THREE.Mesh(earGeo, darkMat);
  earR.position.set(0.08, 0.63, 0.02);
  neck.add(earR);

  // しっぽ
  const tail = new THREE.Group();
  tail.position.set(0, 0.74, -0.5);
  tail.rotation.x = -2;
  visual.add(tail);
  const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 5), darkMat);
  tailMesh.position.set(0, 0.25, 0);
  tail.add(tailMesh);

  // 4本の脚（前左・前右・後左・後右）
  const legs = [];
  const legPositions = [
    [-0.17, 0.55, 0.34],
    [0.17, 0.55, 0.34],
    [-0.17, 0.55, -0.34],
    [0.17, 0.55, -0.34],
  ];
  const legGeo = new THREE.BoxGeometry(0.12, 0.55, 0.12);
  const footGeo = new THREE.BoxGeometry(0.14, 0.08, 0.2);
  for (const pos of legPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(pos[0], pos[1], pos[2]);
    const legMesh = new THREE.Mesh(legGeo, darkMat);
    legMesh.position.set(0, -0.275, 0);
    pivot.add(legMesh);
    const foot = new THREE.Mesh(footGeo, darkMat);
    foot.position.set(0, -0.54, 0.03);
    pivot.add(foot);
    visual.add(pivot);
    legs.push(pivot);
  }

  visual.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;
    obj.userData.baseColor = obj.material.color.clone();
  });

  return {
    group,
    visual,
    beast: true,
    fallback: false,
    parts: { body, hump, neck, head, snout, tail, legs, materials },
    phase: 0,
    deadDark: false,
  };
}

export function updateBeast(doll, actor, dt, speed) {
  const parts = doll.parts;
  const moving = actor.anim === 'Walk' || actor.anim === 'Run';
  const attacking = actor.anim === 'Punch' || actor.anim === 'Attack';
  const fallen = actor.state === 'dead' || actor.state === 'down';
  const timeScale = speed > 0 ? Math.max(0.3, speed) : 0;
  const rate = actor.anim === 'Run' ? 13 : 8;
  doll.phase += dt * timeScale * (moving ? rate : 2);

  // 対角の脚を同じ位相で前後に振る
  const amp = actor.anim === 'Run' ? 0.85 : 0.5;
  const swing = moving && !fallen ? Math.sin(doll.phase) * amp : 0;
  parts.legs[0].rotation.x = swing;
  parts.legs[3].rotation.x = swing;
  parts.legs[1].rotation.x = -swing;
  parts.legs[2].rotation.x = -swing;

  // 胴の上下（歩き・走りで跳ね、Idle では呼吸程度）
  const bob =
    moving && !fallen
      ? Math.abs(Math.sin(doll.phase)) * 0.04
      : Math.sin(doll.phase) * 0.008;
  doll.visual.position.y = bob;

  // 頭を前に突き出す噛みつき
  const lunge = attacking ? Math.sin(doll.phase * 2.6) * 0.5 + 0.5 : 0;
  const breathe = moving ? 0 : Math.sin(doll.phase) * 0.02;
  parts.neck.rotation.x = 0.75 + lunge * 0.5 + breathe;

  parts.tail.rotation.y = Math.sin(doll.phase * 1.4) * (moving ? 0.28 : 0.12);

  // 気絶・死は横倒し、getup で起き上がる
  let targetLean = 0;
  if (fallen) targetLean = FALL_ANGLE;
  else if (actor.state === 'getup') targetLean = Math.PI * 0.2;
  const k = Math.min(1, dt * 6);
  doll.visual.rotation.z += (targetLean - doll.visual.rotation.z) * k;
}

export function darkenBeast(doll) {
  if (doll.deadDark) return;
  doll.deadDark = true;
  for (const material of doll.parts.materials) {
    material.color.multiplyScalar(0.34);
  }
}
