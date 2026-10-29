// 部隊カードの顔絵。人形を小さな別シーンへ複製して一度だけ撮り、dataURL で覚えておく。

import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const SIZE = 112;
// 撮ってよい状態（倒れている・担がれている時は姿勢が崩れるので待つ）
const STANDING = new Set(['idle', 'move', 'fight', 'flee', 'loot', 'carry', 'eat', 'sneak']);

export function createPortraits(renderer) {
  const cache = new Map(); // id -> dataURL
  const tries = new Map(); // id -> 失敗回数
  const owner = new Map(); // id -> 撮った時の人形
  let version = 0;
  let target = null;
  let scene = null;
  let camera = null;
  let pixels = null;
  let canvas = null;

  function setup() {
    if (target) return;
    target = new THREE.WebGLRenderTarget(SIZE, SIZE, { depthBuffer: true });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x33302b);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3a2a, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(0.8, 2.6, 2.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfd4ff, 0.8);
    rim.position.set(-1.5, 2.2, -1.5);
    scene.add(rim);
    camera = new THREE.PerspectiveCamera(24, 1, 0.05, 20);
    pixels = new Uint8Array(SIZE * SIZE * 4);
    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
  }

  function headPoint(root) {
    let bone = null;
    root.traverse((obj) => {
      if (bone || !obj.isBone) return;
      if (/head/i.test(obj.name) && !/top|end/i.test(obj.name)) bone = obj;
    });
    const out = new THREE.Vector3();
    if (bone) {
      bone.getWorldPosition(out);
      return out;
    }
    return null;
  }

  // 人形 doll を撮って dataURL を返す（撮れなければ null）。
  function shoot(doll) {
    setup();
    const clone = doll.fallback ? doll.group.clone(true) : SkeletonUtils.clone(doll.group);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.visible = true;
    clone.traverse((obj) => {
      obj.visible = obj.visible !== false;
      if (obj.isMesh || obj.isSkinnedMesh) obj.frustumCulled = false;
    });
    if (clone.children[0] && !doll.fallback) clone.children[0].rotation.x = 0;
    scene.add(clone);
    clone.updateMatrixWorld(true);
    const scale = doll.group.scale.y || 1;
    let head = headPoint(clone);
    if (!head || !(head.y > 0.6 * scale) || head.y > 2.6 * scale) head = new THREE.Vector3(0, 1.6 * scale, 0);
    const lookY = head.y + 0.03 * scale;
    camera.position.set(0.12 * scale, lookY + 0.03 * scale, 1.0 * scale);
    camera.lookAt(0, lookY - 0.02 * scale, 0);
    camera.updateMatrixWorld();

    const prevTarget = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.enabled;
    const prevAuto = renderer.shadowMap.autoUpdate;
    let url = null;
    try {
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(target);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(SIZE, SIZE);
      // WebGL は下から上の順なので上下を入れ替える
      for (let y = 0; y < SIZE; y += 1) {
        const src = (SIZE - 1 - y) * SIZE * 4;
        img.data.set(pixels.subarray(src, src + SIZE * 4), y * SIZE * 4);
      }
      ctx.putImageData(img, 0, 0);
      url = canvas.toDataURL('image/png');
    } catch (err) {
      url = null;
    } finally {
      renderer.setRenderTarget(prevTarget);
      renderer.shadowMap.enabled = prevShadow;
      renderer.shadowMap.autoUpdate = prevAuto;
      scene.remove(clone);
    }
    return url;
  }

  // 1フレームに1枚まで撮る。actors は部隊員、getDoll(id) で人形。
  function ensure(actors, getDoll, ready) {
    if (ready === false) return false;
    for (const actor of actors) {
      const doll = getDoll(actor.id);
      // 人形が作り直された時（女性モデルの読み込み後など）は撮り直す
      if (cache.has(actor.id) && owner.get(actor.id) === doll) continue;
      if ((tries.get(actor.id) || 0) > 4) continue;
      if (!STANDING.has(actor.state) || (actor.carriedBy !== null && actor.carriedBy !== undefined)) continue;
      if (!doll || !doll.group) continue;
      const url = shoot(doll);
      if (url) {
        cache.set(actor.id, url);
        owner.set(actor.id, doll);
        version += 1;
      }
      else tries.set(actor.id, (tries.get(actor.id) || 0) + 1);
      return true;
    }
    return false;
  }

  function get(id) {
    return cache.get(id) || null;
  }

  function reset() {
    cache.clear();
    tries.clear();
    owner.clear();
    version += 1;
  }

  return { ensure, get, reset, size: SIZE, count: () => cache.size, version: () => version };
}
