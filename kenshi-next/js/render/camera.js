// 見下ろしカメラ。注視点・距離・yaw を持ち、追従の切り替えも扱う。

import * as THREE from 'three';
import { heightAt } from '../sim/index.js';

const DEG = Math.PI / 180;
const MIN_DIST = 8;
const MAX_DIST = 140;
const WORLD_LIMIT = 196;
// 見下ろし角の範囲（度）。低いほど肩越しに近い。
export const MIN_PITCH_DEG = 25;
export const MAX_PITCH_DEG = 88;

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

export function createCameraRig(camera, options) {
  const opt = options || {};
  const target = new THREE.Vector3(
    clamp(Number(opt.x) || 0, -WORLD_LIMIT, WORLD_LIMIT),
    0,
    clamp(Number(opt.z) || 0, -WORLD_LIMIT, WORLD_LIMIT)
  );
  target.y = heightAt(target.x, target.z);

  // 表示に使う注視点。target へ指数平滑で寄せる（ドラッグ中は合わせる）。
  const focus = target.clone();
  const focusOut = { x: target.x, z: target.z };
  let dragFrame = false;
  let smooth = true;
  // 追従先を替えた時だけゆっくり寄せる（近づいたら通常の速さへ）。
  let glide = false;
  let glideT = 0;

  const rig = {
    distance: clamp(Number(opt.distance) || 30, MIN_DIST, MAX_DIST),
    yaw: Number(opt.yaw) || 0,
    pitch: 55 * DEG,
    follow: opt.follow !== false,
  };

  function setTarget(x, z, y) {
    const nx = clamp(Number(x) || 0, -WORLD_LIMIT, WORLD_LIMIT);
    const nz = clamp(Number(z) || 0, -WORLD_LIMIT, WORLD_LIMIT);
    const ny = Number.isFinite(y) ? y : heightAt(nx, nz);
    target.set(nx, ny, nz);
  }

  function panBy(dxPx, dyPx, viewportHeight) {
    dragFrame = true;
    const height = Math.max(1, Number(viewportHeight) || 1);
    const span = 2 * rig.distance * Math.tan((camera.fov * DEG) / 2);
    const scale = span / height;
    const rightX = Math.cos(rig.yaw);
    const rightZ = -Math.sin(rig.yaw);
    const upX = -Math.sin(rig.yaw);
    const upZ = -Math.cos(rig.yaw);
    const nx = target.x - rightX * dxPx * scale + upX * dyPx * scale;
    const nz = target.z - rightZ * dxPx * scale + upZ * dyPx * scale;
    target.set(
      clamp(nx, -WORLD_LIMIT, WORLD_LIMIT),
      heightAt(clamp(nx, -WORLD_LIMIT, WORLD_LIMIT), clamp(nz, -WORLD_LIMIT, WORLD_LIMIT)),
      clamp(nz, -WORLD_LIMIT, WORLD_LIMIT)
    );
  }

  function zoom(factor) {
    const f = Number(factor) || 1;
    rig.distance = clamp(rig.distance * f, MIN_DIST, MAX_DIST);
  }

  function setDistance(v) {
    rig.distance = clamp(Number(v) || MIN_DIST, MIN_DIST, MAX_DIST);
  }

  // Screenshot framing can be closer than the normal gameplay zoom limit.
  function setDebugDistance(v) {
    rig.distance = clamp(Number(v) || 3, 2, MAX_DIST);
  }

  function rotate(deltaYaw) {
    rig.yaw += Number(deltaYaw) || 0;
  }

  function setYaw(v) {
    rig.yaw = Number(v) || 0;
  }

  function setFollow(on) {
    rig.follow = !!on;
  }

  function getFollow() {
    return rig.follow;
  }

  function getTarget() {
    focusOut.x = focus.x;
    focusOut.z = focus.z;
    return focusOut;
  }

  function setSmooth(on) {
    smooth = !!on;
  }

  function getDistance() {
    return rig.distance;
  }

  function getYaw() {
    return rig.yaw;
  }

  // 検証・撮影用: 見下ろしの角度（度）
  function setPitch(deg) {
    const d = Number(deg);
    if (Number.isFinite(d)) rig.pitch = Math.max(10, Math.min(89, d)) * DEG;
  }

  // 操作用: 角度を足す（ラジアン）。MIN_PITCH_DEG〜MAX_PITCH_DEG に収める。
  function tilt(deltaRad) {
    const v = rig.pitch + (Number(deltaRad) || 0);
    rig.pitch = clamp(v, MIN_PITCH_DEG * DEG, MAX_PITCH_DEG * DEG);
  }

  function setPitchClamped(rad) {
    const v = Number(rad);
    if (Number.isFinite(v)) rig.pitch = clamp(v, MIN_PITCH_DEG * DEG, MAX_PITCH_DEG * DEG);
  }

  function getPitch() {
    return rig.pitch;
  }

  function apply(dt) {
    const step = Number(dt) || 0;
    if (step > 0 && smooth && !dragFrame) {
      const rate = glide ? 3.2 + 8.8 * Math.min(1, glideT / 1.4) : 12;
      const k = 1 - Math.exp(-step * rate);
      focus.x += (target.x - focus.x) * k;
      focus.y += (target.y - focus.y) * k;
      focus.z += (target.z - focus.z) * k;
    } else {
      focus.copy(target);
    }
    if (glide) glideT += step;
    if (glide && (glideT > 1.4 || Math.hypot(target.x - focus.x, target.z - focus.z) < 0.3)) glide = false;
    dragFrame = false;

    const cosP = Math.cos(rig.pitch);
    const sinP = Math.sin(rig.pitch);
    const ox = Math.sin(rig.yaw) * cosP * rig.distance;
    const oz = Math.cos(rig.yaw) * cosP * rig.distance;
    const oy = sinP * rig.distance;
    const cx = focus.x + ox;
    const cz = focus.z + oz;
    // 低い角度で丘にめり込まないよう、地面より少し上に保つ
    const floor = heightAt(cx, cz) + 1.5;
    camera.position.set(cx, Math.max(focus.y + oy, floor), cz);
    camera.lookAt(focus.x, focus.y, focus.z);
  }

  // 追従先の切り替え: 注視点をなめらかに移す。
  function startGlide() {
    glide = true;
    glideT = 0;
  }

  function isGliding() {
    return glide;
  }

  function followActor(actor) {
    if (rig.follow && actor) setTarget(actor.x, actor.z);
  }

  apply();

  return {
    setTarget,
    panBy,
    zoom,
    setDistance,
    setDebugDistance,
    getDistance,
    rotate,
    setYaw,
    getYaw,
    setPitch,
    setPitchClamped,
    tilt,
    getPitch,
    setFollow,
    getFollow,
    getTarget,
    setSmooth,
    followActor,
    startGlide,
    isGliding,
    apply,
    target,
    focus,
    camera,
  };
}
