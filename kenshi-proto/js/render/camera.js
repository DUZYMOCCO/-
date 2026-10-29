// 見下ろしカメラ。注視点・距離・yaw を持ち、追従の切り替えも扱う。

import * as THREE from 'three';
import { heightAt } from '../sim/index.js';

const DEG = Math.PI / 180;
const MIN_DIST = 8;
const MAX_DIST = 140;
const WORLD_LIMIT = 196;

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

  const rig = {
    distance: clamp(Number(opt.distance) || 30, MIN_DIST, MAX_DIST),
    yaw: Number(opt.yaw) || 0,
    pitch: 55 * DEG,
    follow: opt.follow !== false,
  };

  function setTarget(x, z) {
    const nx = clamp(Number(x) || 0, -WORLD_LIMIT, WORLD_LIMIT);
    const nz = clamp(Number(z) || 0, -WORLD_LIMIT, WORLD_LIMIT);
    target.set(nx, heightAt(nx, nz), nz);
  }

  function panBy(dxPx, dyPx, viewportHeight) {
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
    return { x: target.x, z: target.z };
  }

  function getDistance() {
    return rig.distance;
  }

  function getYaw() {
    return rig.yaw;
  }

  function apply() {
    const cosP = Math.cos(rig.pitch);
    const sinP = Math.sin(rig.pitch);
    const ox = Math.sin(rig.yaw) * cosP * rig.distance;
    const oz = Math.cos(rig.yaw) * cosP * rig.distance;
    const oy = sinP * rig.distance;
    camera.position.set(target.x + ox, target.y + oy, target.z + oz);
    camera.lookAt(target.x, target.y, target.z);
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
    getDistance,
    rotate,
    setYaw,
    getYaw,
    setFollow,
    getFollow,
    getTarget,
    followActor,
    apply,
    target,
    camera,
  };
}
