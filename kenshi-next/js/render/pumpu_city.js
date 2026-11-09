// パンプアップ・シティの見た目追加（道路・港・看板・街灯・クレーン・公園）。
// 既存の state.buildings は当たり判定と基本箱を担当する。この模块は
// 景観だけを足す。リグやモーションには触らない。
import * as THREE from 'three';
import { heightAt } from '../sim/terrain.js';
import { PUMPU_CENTER, PUMPU_STREET, PUMPU_SIGNS, PUMPU_ZONES } from '../world/pumpu_city.js';

const C = (hex) => new THREE.Color(hex);

function makeSignTexture(text, sub, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = sub ? 192 : 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#11151a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(text, canvas.width / 2, sub ? 76 : canvas.height / 2, canvas.width - 36);
  if (sub) {
    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, canvas.width / 2, 145, canvas.width - 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPumpuCity(scene) {
  const group = new THREE.Group();
  group.name = 'pumpu-city';
  const { x: cx, z: cz } = PUMPU_CENTER;
  const yAt = (rX, rZ) => heightAt(cx + rX, cz + rZ);
  const mats = new Map();
  const mat = (color, rough = 0.95, extra = {}) => {
    const key = color + '|' + rough + '|' + JSON.stringify(extra);
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: C(color), roughness: rough, metalness: 0, ...extra }));
    return mats.get(key);
  };

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, rX, rZ, color, yOff = 0, rotY = 0, material = null) {
    const mesh = new THREE.Mesh(boxGeo, material || mat(color));
    mesh.scale.set(w, h, d);
    mesh.position.set(cx + rX, yAt(rX, rZ) + yOff + h / 2, cz + rZ);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function flat(w, d, rX, rZ, color, yOff = 0.03) {
    return box(w, 0.06, d, rX, rZ, color, yOff);
  }

  // —— 通り（車道・店先歩道・向かいの歩道・横断歩道） ——
  flat(56, PUMPU_STREET.width, 0, PUMPU_STREET.z, '#25282c', 0.02);
  flat(56, 4.7, 0, PUMPU_STREET.northSidewalk, '#8d8880', 0.05);
  flat(56, 3.45, 0, PUMPU_STREET.southSidewalk, '#8d8880', 0.05);
  for (const x of [-10, 0.8, 10]) {
    flat(2.2, PUMPU_STREET.width - 0.4, x, PUMPU_STREET.z, '#e8e2d4', 0.06);
  }

  // —— 店先の庇（北側） ——
  for (const [x, w] of [[-9.2, 4.2], [0.8, 4.8], [6.75, 4.8], [-3, 5.4], [12.6, 4.6], [18.6, 4.0]]) {
    box(w, 0.16, 1.4, x, -6.4, '#7a3a32', 2.8);
  }
  // 南側の庇（店先が北向き）
  for (const [x, w] of [[-17, 5.2], [-11, 5.4], [-5, 5.4], [1, 5.4], [7, 5.4], [13, 5.2], [19, 5.2]]) {
    box(w, 0.16, 1.3, x, 11.9, '#31536a', 2.8);
  }

  // —— 電柱と電線（ケーブルはロープの代わり） ——
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 8);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x222222 });
  const poleTops = [];
  for (const x of [-24, -8, 8, 24]) {
    const pole = new THREE.Mesh(poleGeo, mat('#4c3b2c'));
    pole.position.set(cx + x, yAt(x, -6.2) + 3.5, cz - 6.2);
    pole.castShadow = true;
    group.add(pole);
    box(1.2, 0.12, 0.12, x, -6.2, '#4c3b2c', 6.5);
    poleTops.push(new THREE.Vector3(cx + x, yAt(x, -6.2) + 7, cz - 6.2));
  }
  for (const off of [0, -0.35, 0.35]) {
    const pts = poleTops.map((p) => new THREE.Vector3(p.x, p.y + off, p.z));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, wireMat));
  }

  // —— 公園（西公園: 芝 11.2×8.2 + 園路 1.4m） ——
  const park = PUMPU_ZONES.park;
  flat(park.w, park.d, park.x, park.z, '#3f6d3a', 0.06);
  flat(park.w - 1.2, 1.4, park.x, park.z, '#b9b0a1', 0.08);
  for (const [x, z] of [[-24, 0], [-18, 5], [-19, -2]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 8), mat('#5b4636'));
    trunk.position.set(cx + x, yAt(x, z) + 1.2, cz + z);
    group.add(trunk);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), mat('#3f6d3a'));
    leaf.position.set(cx + x, yAt(x, z) + 3.0, cz + z);
    leaf.castShadow = true;
    group.add(leaf);
  }
  for (const x of [-23, -19]) box(2.2, 0.45, 0.7, x, 5, '#6b4f36', 0.4);

  // —— 港（水面・岸壁・桟橋・クレーン・船・コンテナ） ——
  const harbor = PUMPU_ZONES.harbor;
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(harbor.w, harbor.d),
    new THREE.MeshStandardMaterial({ color: C('#2e6f8f'), roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.9 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx + harbor.x, yAt(harbor.x, harbor.z) + 0.02, cz + harbor.z);
  water.receiveShadow = true;
  group.add(water);
  // 岸壁（北の縁）と桟橋
  box(56, 0.8, 0.8, 0, 23.2, '#5b605f', 0.2);
  for (const x of [-21, -7, 7, 21]) box(3.2, 0.25, 7, x, 24.8, '#6e5540', 0.25);
  // 岸壁灯
  for (const x of [-24, -12, 0, 12, 24]) {
    box(0.22, 1.8, 0.22, x, 23.6, '#3d454b', 0.9);
    box(0.5, 0.3, 0.5, x, 23.6, '#ffd98a', 1.9, 0, mat('#ffe9a8', 0.3, { emissive: C('#ffcf55'), emissiveIntensity: 0.7 }));
  }
  // クレーン（2基）
  function crane(x, z) {
    box(0.5, 12, 0.5, x, z, '#c66b32', 6);
    box(0.5, 12, 0.5, x + 2.4, z, '#c66b32', 6);
    box(9, 0.5, 0.5, x + 1.2, z, '#c66b32', 12);
    box(0.5, 0.5, 6, x + 1.2, z, '#c66b32', 12.2);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 6), mat('#222222'));
    cable.position.set(cx + x + 4.6, yAt(x, z) + 8, cz + z);
    group.add(cable);
    box(1.4, 1.4, 1.4, x + 4.6, z, '#8d6b45', 3.8);
  }
  crane(-14, 22.6);
  crane(10, 22.6);
  // 船（2隻: 船体 + 上部構造）
  function boat(x, z, rot = 0) {
    const hull = box(8, 1.4, 2.4, x, z, '#334457', 0.8, rot);
    hull.castShadow = false;
    box(2.2, 1.2, 1.8, x, z, '#e5e0d5', 1.9, rot);
  }
  boat(-19, 26.5);
  boat(17, 26.2);
  // コンテナ群（港の荷役）
  const containerColors = ['#b65342', '#3f6f9f', '#4d7a52', '#c39a3b', '#6b5a8c'];
  containerColors.forEach((color, i) => {
    const x = -22 + i * 3.4;
    box(3, 1.5, 1.5, x, 21.5 - (i % 2) * 1.8, color, 0.8 + (i % 2) * 1.5);
  });

  // —— 駐車（路上: セダン相当の箱） ——
  for (const [x, z, color] of [[-13, 1.6, '#586876'], [5, 5.4, '#7a5a40'], [16, 1.8, '#49606a']]) {
    box(3.4, 0.8, 1.5, x, z, color, 0.45);
    box(1.8, 0.55, 1.3, x, z, color, 1.0);
  }

  // —— 看板 ——
  for (const sign of PUMPU_SIGNS) {
    const [rx, rz, w, h] = sign.rect;
    const texture = makeSignTexture(sign.text, sign.sub, sign.color || '#f8ead0');
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    );
    mesh.position.set(cx + rx, yAt(rx, rz) + (sign.sub ? 3.4 : 2.9), cz + rz);
    mesh.rotation.y = sign.rotY || 0;
    group.add(mesh);
  }

  scene.add(group);
  return {
    group,
    update() {},
    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
      scene.remove(group);
    },
  };
}
