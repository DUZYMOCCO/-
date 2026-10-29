// タップ・ドラッグ・ピンチ・二本指回転・マウス操作。タップは Raycaster で命令に変える。

import * as THREE from 'three';

const TAP_MS = 350;
const TAP_PX = 8;
const TILT_PER_PX = 0.006; // マウス・二本指の縦移動 1px あたりの角度（ラジアン）
const TILT_DEADZONE = 10; // 二本指: ピンチ中の小さな上下ぶれは無視
const KEY_TILT = 0.05;
const KEY_ROTATE = 0.07;

export function createInput(options) {
  const canvas = options.canvas;
  const camera = options.camera;
  const rig = options.rig;
  const getPickables = options.getPickables || (() => []);
  const groundMesh = options.groundMesh || null;
  const onActorTap = options.onActorTap || (() => {});
  const onGroundTap = options.onGroundTap || (() => {});
  const onMove = options.onMove || (() => {});

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointers = new Map();
  let primary = null;
  let pinch = null;

  function readPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };
  }

  function beginPrimary(id, point, button) {
    primary = {
      id,
      x0: point.x,
      y0: point.y,
      t0: performance.now(),
      button,
      moved: 0,
      prev: point,
    };
  }

  function startPinch() {
    const list = Array.from(pointers.values());
    if (list.length < 2) return;
    const a = list[0];
    const b = list[1];
    pinch = {
      d0: Math.hypot(b.x - a.x, b.y - a.y),
      a0: Math.atan2(b.y - a.y, b.x - a.x),
      dist0: rig.getDistance(),
      yaw0: rig.getYaw(),
      my0: (a.y + b.y) / 2,
      pitch0: rig.getPitch ? rig.getPitch() : 0,
    };
  }

  function handleTap(x, y) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = (x / Math.max(1, rect.width)) * 2 - 1;
    ndc.y = -(y / Math.max(1, rect.height)) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);

    const pickables = getPickables();
    if (pickables.length > 0) {
      const hits = raycaster.intersectObjects(pickables, true);
      for (const hit of hits) {
        let obj = hit.object;
        while (obj) {
          if (obj.userData && obj.userData.actorId !== undefined) {
            // 全員（プレイヤー・死体を含む）が選べる。攻撃や担ぐは選択パネルから。
            onActorTap(obj.userData.actorId);
            return;
          }
          obj = obj.parent;
        }
      }
    }

    if (groundMesh) {
      const hits = raycaster.intersectObject(groundMesh, false);
      if (hits.length > 0) {
        onGroundTap();
        onMove(hits[0].point.x, hits[0].point.z);
      }
    }
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && (event.button === 2 || event.button === 1)) {
      event.preventDefault();
    }
    const point = readPoint(event);
    pointers.set(event.pointerId, point);
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (err) {
      // 取れなくても続行
    }

    if (pointers.size === 1) {
      beginPrimary(event.pointerId, point, event.button);
      pinch = null;
    } else {
      primary = null;
      if (pointers.size === 2) startPinch();
    }
  }

  function onPointerMove(event) {
    const point = readPoint(event);
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    pointers.set(event.pointerId, point);

    if (pointers.size >= 2 && pinch) {
      const list = Array.from(pointers.values());
      const a = list[0];
      const b = list[1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      if (pinch.d0 > 1) {
        rig.setDistance(pinch.dist0 * (pinch.d0 / Math.max(1, dist)));
      }
      rig.setYaw(pinch.yaw0 + (angle - pinch.a0));
      // 二本指を上下にそろえて動かすと角度が変わる（上へ＝低い角度）
      if (rig.setPitchClamped) {
        const dmy = (a.y + b.y) / 2 - pinch.my0;
        const eff = Math.abs(dmy) > TILT_DEADZONE ? dmy - Math.sign(dmy) * TILT_DEADZONE : 0;
        rig.setPitchClamped(pinch.pitch0 + eff * TILT_PER_PX);
      }
      rig.setFollow(false);
      return;
    }

    if (!primary || primary.id !== event.pointerId) return;
    const dx = point.x - prev.x;
    const dy = point.y - prev.y;
    primary.moved += Math.hypot(dx, dy);

    if (event.pointerType === 'mouse' && (primary.button === 2 || primary.button === 1)) {
      // 右／中ドラッグ: 左右で回転、上下で角度
      rig.rotate(-dx * 0.006);
      if (rig.tilt) rig.tilt(dy * TILT_PER_PX);
      rig.setFollow(false);
      return;
    }

    if (primary.moved > TAP_PX) {
      rig.panBy(dx, dy, point.h);
      rig.setFollow(false);
    }
  }

  function finishPointer(event, allowTap) {
    const point = readPoint(event);
    const wasPrimary = primary && primary.id === event.pointerId;
    pointers.delete(event.pointerId);
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (err) {
      // すでに離れている
    }

    if (wasPrimary && allowTap) {
      const duration = performance.now() - primary.t0;
      const total = Math.hypot(point.x - primary.x0, point.y - primary.y0);
      const tap =
        primary.button !== 2 &&
        primary.button !== 1 &&
        primary.moved < TAP_PX &&
        total < TAP_PX &&
        duration < TAP_MS &&
        pointers.size === 0;
      if (tap) handleTap(point.x, point.y);
    }

    if (pointers.size === 0) {
      primary = null;
      pinch = null;
      return;
    }
    if (pointers.size === 1) {
      const entry = Array.from(pointers.entries())[0];
      primary = {
        id: entry[0],
        x0: entry[1].x,
        y0: entry[1].y,
        t0: performance.now() - TAP_MS - 1,
        button: 0,
        moved: TAP_PX + 1,
        prev: entry[1],
      };
      pinch = null;
    }
  }

  function onPointerUp(event) {
    finishPointer(event, true);
  }

  function onPointerCancel(event) {
    finishPointer(event, false);
  }

  function onWheel(event) {
    event.preventDefault();
    rig.zoom(Math.exp(event.deltaY * 0.0012));
    rig.setFollow(false);
  }

  // キー: Q/E で回転、R/F（PageUp/PageDown）で角度
  function onKeyDown(event) {
    const t = event.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const k = event.key;
    if (k === 'q' || k === 'Q') rig.rotate(KEY_ROTATE);
    else if (k === 'e' || k === 'E') rig.rotate(-KEY_ROTATE);
    else if ((k === 'r' || k === 'R' || k === 'PageUp') && rig.tilt) rig.tilt(KEY_TILT);
    else if ((k === 'f' || k === 'F' || k === 'PageDown') && rig.tilt) rig.tilt(-KEY_TILT);
    else return;
    event.preventDefault();
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);

  function dispose() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onKeyDown);
  }

  return { dispose };
}
