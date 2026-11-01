// 見下ろしカメラ。注視点・距離・yaw を持ち、追従の切り替えも扱う。

import * as THREE from 'three';
import { clampToWorld } from '../sim/world_bounds.js';
import { heightAt } from '../sim/index.js';
import { cameraPlacement } from './camera_math.js';
import { EYE_FOV, EYE_NEAR, EYE_PITCH, EYE_GLIDE_SEC, LOOK_RETURN_RATE, stepEye, lookDir, clampLook } from './eyecam.js';

const DEG = Math.PI / 180;
const MIN_DIST = 3.8;
const MAX_DIST = 140;

// 見下ろし角の範囲（度）。低いほど肩越しに近い。
export const MIN_PITCH_DEG = -35;
export const MAX_PITCH_DEG = 88;

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

export function createCameraRig(camera, options) {
  const opt = options || {};
  const target = new THREE.Vector3(
    clampToWorld(Number(opt.x) || 0, Number(opt.z) || 0).x,
    0,
    clampToWorld(Number(opt.x) || 0, Number(opt.z) || 0).z
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

  // 目線カメラ（eyecam1）。eyeTarget があればそちらで置く（見下ろしの値は保ったまま）。
  let eyeTarget = null;
  const eyeCur = { x: 0, y: 0, z: 0, yaw: 0, has: false };
  let eyeGlide = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let lookHold = false;
  let savedLens = null;

  function setEye(pose) {
    if (!pose) {
      if (eyeTarget && savedLens) {
        camera.fov = savedLens.fov; camera.near = savedLens.near; camera.updateProjectionMatrix();
      }
      eyeTarget = null; savedLens = null; eyeCur.has = false; lookYaw = 0; lookPitch = 0; eyeGlide = 0;
      return;
    }
    if (!eyeTarget) {
      savedLens = { fov: camera.fov, near: camera.near };
      camera.fov = EYE_FOV; camera.near = EYE_NEAR; camera.updateProjectionMatrix();
    }
    eyeTarget = { x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw };
  }

  function isEye() { return !!eyeTarget; }
  function startEyeGlide() { if (eyeCur.has) eyeGlide = EYE_GLIDE_SEC; }
  // 目線の見回し（画面ドラッグの px）。離すと体の向きへゆっくり戻る。
  function lookBy(dxPx, dyPx, viewportHeight) {
    const h = Math.max(1, Number(viewportHeight) || 1);
    const f = (camera.fov * DEG) / h;
    const c = clampLook(lookYaw + (Number(dxPx) || 0) * f, lookPitch + (Number(dyPx) || 0) * f);
    lookYaw = c.yaw; lookPitch = c.pitch;
  }
  function setLookHold(on) { lookHold = !!on; }
  function eyeInfo() { return eyeTarget ? { x: eyeCur.x, y: eyeCur.y, z: eyeCur.z, yaw: eyeCur.yaw, lookYaw, lookPitch, fov: camera.fov, near: camera.near } : null; }

  function setTarget(x, z, y) {
    const {x: nx, z: nz} = clampToWorld(Number(x) || 0, Number(z) || 0);
    const ny = Number.isFinite(y) ? y : heightAt(nx, nz);
    target.set(nx, ny, nz);
  }

  function panBy(dxPx, dyPx, viewportHeight) {
    if (eyeTarget) { lookBy(dxPx, dyPx, viewportHeight); return; }
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
    const p = clampToWorld(nx, nz);
    target.set(p.x, heightAt(p.x, p.z), p.z);
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
    if (eyeTarget) { const c = clampLook(lookYaw - (Number(deltaYaw) || 0), lookPitch); lookYaw = c.yaw; return; }
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
    if (Number.isFinite(d)) rig.pitch = Math.max(MIN_PITCH_DEG, Math.min(89, d)) * DEG;
  }

  // 操作用: 角度を足す（ラジアン）。MIN_PITCH_DEG〜MAX_PITCH_DEG に収める。
  function tilt(deltaRad) {
    if (eyeTarget) { const c = clampLook(lookYaw, lookPitch - (Number(deltaRad) || 0)); lookPitch = c.pitch; return; }
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

  let lastPlacement;
  function camInfo() { return { pitchDeg: rig.pitch / DEG, distance: rig.distance, camY: camera.position.y, groundY: lastPlacement.groundY, lookY: lastPlacement.look.y }; }

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

    if (eyeTarget) {
      stepEye(eyeCur, eyeTarget, step, eyeGlide);
      if (eyeGlide > 0) eyeGlide = Math.max(0, eyeGlide - step);
      if (!lookHold && step > 0) {
        const k = 1 - Math.exp(-step * LOOK_RETURN_RATE);
        lookYaw -= lookYaw * k; lookPitch -= lookPitch * k;
      }
      // 地面より下に潜らない
      const gy = heightAt(eyeCur.x, eyeCur.z) + 0.3;
      const ey = Math.max(eyeCur.y, gy);
      const d = lookDir(eyeCur.yaw + lookYaw, EYE_PITCH + lookPitch);
      camera.position.set(eyeCur.x, ey, eyeCur.z);
      camera.lookAt(eyeCur.x + d.x, ey + d.y, eyeCur.z + d.z);
      lastPlacement = { x: eyeCur.x, y: ey, z: eyeCur.z, groundY: gy - 0.3, look: { x: eyeCur.x + d.x, y: ey + d.y, z: eyeCur.z + d.z }, lift: 0 };
      return;
    }
    const p = cameraPlacement(focus, rig.yaw, rig.pitch, rig.distance, heightAt);
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(p.look.x, p.look.y, p.look.z);
    lastPlacement = p;
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
    camInfo,
    setFollow,
    getFollow,
    getTarget,
    setSmooth,
    followActor,
    startGlide,
    isGliding,
    setEye,
    isEye,
    startEyeGlide,
    lookBy,
    setLookHold,
    eyeInfo,
    apply,
    target,
    focus,
    camera,
  };
}
