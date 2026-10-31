// タップ・ドラッグ・ピンチ・二本指回転・マウス操作。タップは Raycaster で命令に変える。

import * as THREE from 'three';
import { heightAt } from '../sim/terrain.js';
import { keyPanVector, edgePanVector } from '../render/camfollow.js';

const TAP_MS = 350;
const TAP_PX = 8;
const TILT_PER_PX = 0.006; // マウス・二本指の縦移動 1px あたりの角度（ラジアン）
const TILT_DEADZONE = 10; // 二本指: ピンチ中の小さな上下ぶれは無視
const KEY_TILT = 0.05;
const KEY_ROTATE = 0.07;
const KEY_PAN_SCREENS = 0.75; // WASD・矢印: 1秒で画面の高さの何倍ぶん動くか
const PAN_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

export function createInput(options) {
  const canvas = options.canvas;
  const camera = options.camera;
  const rig = options.rig;
  const getPickables = options.getPickables || (() => []);
  const groundMesh = options.groundMesh || null;
  const onActorTap = options.onActorTap || (() => {});
  const onGroundTap = options.onGroundTap || (() => {});
  const isBuildMode = options.isBuildMode || (() => false);
  const onBuildHover = options.onBuildHover || (() => {});
  const onBuildWallPreview = options.onBuildWallPreview || (() => {});
  const onBuildDrag = options.onBuildDrag || (() => {});
  const onMove = options.onMove || (() => {});
  const onContextMenu = options.onContextMenu || (() => {});
  const onBoxSelect = options.onBoxSelect || (() => {});
  // 地面から始めたドラッグ・キー移動で「見回し」に入る時に呼ぶ。
  const onLook = options.onLook || (() => {});
  // 追従に戻す（Space / Home）。
  const onReturnFollow = options.onReturnFollow || (() => {});
  // 見回しの綱: ドラッグ量に掛ける係数（半径の外で弱める）。
  const panFactor = options.panFactor || (() => 1);
  let edgeScroll = !!options.edgeScroll;
  const keysDown = new Set();
  const mouse = { x: NaN, y: NaN, w: 0, h: 0, inside: false };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointers = new Map();
  let primary = null;
  let pinch = null;
  let longPressTimer = null;
  let isBoxSelecting = false;

  const selectionBox = document.createElement('div');
  selectionBox.className = 'selection-box';
  document.body.appendChild(selectionBox);

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function readPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };
  }

  function beginPrimary(id, point, button, event) {
    clearLongPress();
    primary = {
      id,
      x0: point.x,
      y0: point.y,
      t0: performance.now(),
      button,
      moved: 0,
      prev: point,
      shiftKey: !!(event && event.shiftKey),
      clientX: event ? event.clientX : point.x,
      clientY: event ? event.clientY : point.y,
      longPressed: false,
    };
    if (!isBuildMode() && (button === 0 || (event && event.pointerType === 'touch'))) {
      longPressTimer = setTimeout(() => {
        if (primary && primary.id === id && primary.moved < TAP_PX) {
          primary.longPressed = true;
          onContextMenu(point.x, point.y, primary.clientX, primary.clientY);
        }
      }, 450);
    }
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

  function aim(x, y) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = (x / Math.max(1, rect.width)) * 2 - 1;
    ndc.y = -(y / Math.max(1, rect.height)) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
  }

  // 画面上の点にいる人物の id（いなければ null）。aim() の後に呼ぶ。
  function actorUnderRay() {
    const pickables = getPickables();
    if (pickables.length === 0) return null;
    const hits = raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.actorId !== undefined) return obj.userData.actorId;
        obj = obj.parent;
      }
    }
    return null;
  }

  function groundPoint(x, y) {
    aim(x, y);
    if (groundMesh) {
      const hits = raycaster.intersectObject(groundMesh, false);
      if (hits.length > 0) return hits[0].point.clone();
    }
    const ray = raycaster.ray, point = new THREE.Vector3();
    let previous = 0;
    for (let t = 4; t <= 1000; t += 4) {
      ray.at(t, point);
      if (point.y <= heightAt(point.x, point.z)) {
        let lo = previous, hi = t;
        for (let i = 0; i < 10; i += 1) {
          const mid = (lo + hi) / 2;
          ray.at(mid, point);
          if (point.y > heightAt(point.x, point.z)) lo = mid;
          else hi = mid;
        }
        ray.at(hi, point);
        return point.clone();
      }
      previous = t;
    }
    return null;
  }

  function handleTap(x, y, event) {
    aim(x, y);
    const building = isBuildMode();
    const actorId = building ? null : actorUnderRay();
    if (actorId !== null) {
      // 全員（プレイヤー・死体を含む）が選べる。攻撃や担ぐは選択パネルから。
      onActorTap(actorId, event);
      return;
    }

    const point = groundPoint(x, y);
    if (!point) return;
    if (building) { onGroundTap(event, { x: point.x, z: point.z }); return; }
    onGroundTap(event, { x: point.x, z: point.z });
    onMove(point.x, point.z);
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
      beginPrimary(event.pointerId, point, event.button, event);
      primary.building = isBuildMode();
      if (primary.building) {
        primary.buildStart = groundPoint(point.x, point.y - 60);
        if (primary.buildStart) onBuildHover(primary.buildStart.x, primary.buildStart.z);
      }
      // 人物の上から始めた一本指／左ドラッグは見回しにしない（選択の操作のまま）。
      if (!primary.building && event.button !== 2 && event.button !== 1) {
        aim(point.x, point.y);
        primary.onActor = actorUnderRay() !== null;
      }
      pinch = null;
    } else {
      clearLongPress();
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
      // ズーム・回転・角度は追従を切らない。
      return;
    }

    if (!primary || primary.id !== event.pointerId) return;
    const dx = point.x - prev.x;
    const dy = point.y - prev.y;
    primary.moved += Math.hypot(dx, dy);

    if (primary.moved > TAP_PX) {
      clearLongPress();
    }

    if (primary.building) {
      const hover = groundPoint(point.x, point.y - 60);
      if (hover) {
        onBuildHover(hover.x, hover.z);
        if (primary.buildStart) onBuildWallPreview({ x: primary.buildStart.x, z: primary.buildStart.z }, { x: hover.x, z: hover.z });
      }
      return;
    }

    if (event.pointerType === 'mouse' && (primary.button === 2 || primary.button === 1)) {
      // 右／中ドラッグ: 左右で回転、上下で角度
      rig.rotate(-dx * 0.006);
      if (rig.tilt) rig.tilt(dy * TILT_PER_PX);
      return;
    }

    if (event.pointerType === 'mouse' && primary.shiftKey && primary.button === 0) {
      if (primary.moved > TAP_PX) {
        isBoxSelecting = true;
        const x0 = Math.min(primary.clientX, event.clientX);
        const y0 = Math.min(primary.clientY, event.clientY);
        const x1 = Math.max(primary.clientX, event.clientX);
        const y1 = Math.max(primary.clientY, event.clientY);
        selectionBox.style.display = 'block';
        selectionBox.style.left = x0 + 'px';
        selectionBox.style.top = y0 + 'px';
        selectionBox.style.width = (x1 - x0) + 'px';
        selectionBox.style.height = (y1 - y0) + 'px';
      }
      return;
    }

    if (primary.moved > TAP_PX && !primary.onActor) {
      if (!primary.looking) {
        primary.looking = true;
        onLook();
      }
      const f = panFactor();
      rig.panBy(dx * f, dy * f, point.h);
    }
  }

  function finishPointer(event, allowTap) {
    const point = readPoint(event);
    const primaryPointer = primary && primary.id === event.pointerId ? primary : null;
    const wasPrimary = !!primaryPointer;
    clearLongPress();
    pointers.delete(event.pointerId);
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (err) {
      // すでに離れている
    }

    if (isBoxSelecting) {
      isBoxSelecting = false;
      selectionBox.style.display = 'none';
      if (wasPrimary) {
        const x0 = Math.min(primary.clientX, event.clientX);
        const y0 = Math.min(primary.clientY, event.clientY);
        const x1 = Math.max(primary.clientX, event.clientX);
        const y1 = Math.max(primary.clientY, event.clientY);
        if (x1 - x0 > 4 || y1 - y0 > 4) {
          onBoxSelect(x0, y0, x1, y1, primary.shiftKey);
          primary = null;
          pinch = null;
          return;
        }
      }
    }

    if (wasPrimary && allowTap) {
      const duration = performance.now() - primary.t0;
      const total = Math.hypot(point.x - primary.x0, point.y - primary.y0);
      const isRightClickTap =
        primary.button === 2 &&
        primary.moved < TAP_PX &&
        total < TAP_PX &&
        pointers.size === 0;

      if (primaryPointer.building) {
        if (pointers.size === 0 && primaryPointer.moved >= TAP_PX && primaryPointer.buildStart) {
          const end = groundPoint(point.x, point.y - 60);
          if (end) onBuildDrag({ x: primaryPointer.buildStart.x, z: primaryPointer.buildStart.z }, { x: end.x, z: end.z });
        } else if (pointers.size === 0 && !primaryPointer.longPressed) {
          handleTap(point.x, point.y, event);
        }
      } else if (isRightClickTap) {
        onContextMenu(point.x, point.y, event.clientX, event.clientY);
      } else if (!primary.longPressed) {
        const tap =
          primary.button !== 2 &&
          primary.button !== 1 &&
          primary.moved < TAP_PX &&
          total < TAP_PX &&
          duration < TAP_MS &&
          pointers.size === 0;
        if (tap) handleTap(point.x, point.y, event);
      }
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
        // 二本指の後に残った指では見回さない（ピンチの終わりで追従が切れないように）。
        onActor: true,
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
  }

  // キー: Q/E で回転、R/F（PageUp/PageDown）で角度
  function onKeyDown(event) {
    const t = event.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const k = event.key;
    const lower = typeof k === 'string' ? k.toLowerCase() : '';
    if (lower === 'i' || k === 'Escape') {
      if (!event.repeat) (lower === 'i' ? options.onInventoryToggle : options.onInventoryClose)?.();
      return;
    }
    if (PAN_KEYS.has(lower)) {
      keysDown.add(lower);
      event.preventDefault();
      return;
    }
    if (k === ' ' || k === 'Home') {
      if (event.repeat) return;
      if (t && t.tagName === 'BUTTON' && typeof t.blur === 'function') t.blur();
      onReturnFollow();
      event.preventDefault();
      return;
    }
    if (k === 'q' || k === 'Q') rig.rotate(KEY_ROTATE);
    else if (k === 'e' || k === 'E') rig.rotate(-KEY_ROTATE);
    else if ((k === 'r' || k === 'R' || k === 'PageUp') && rig.tilt) rig.tilt(KEY_TILT);
    else if ((k === 'f' || k === 'F' || k === 'PageDown') && rig.tilt) rig.tilt(-KEY_TILT);
    else return;
    event.preventDefault();
  }

  function onKeyUp(event) {
    const k = typeof event.key === 'string' ? event.key.toLowerCase() : '';
    keysDown.delete(k);
    // Shift などで大文字・小文字が変わっても止まるように両方消す。
    if (k.length === 1) keysDown.delete(k.toUpperCase());
  }

  function onBlur() {
    keysDown.clear();
    mouse.inside = false;
  }

  function onMouseTrack(event) {
    if (event.pointerType !== 'mouse') return;
    const point = readPoint(event);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.w = point.w;
    mouse.h = point.h;
    mouse.inside = true;
  }

  function onPointerLeave(event) {
    if (event.pointerType === 'mouse') mouse.inside = false;
  }

  // 毎フレーム: キー（WASD・矢印）と画面端で見回す。
  function update(dt) {
    const step = Math.min(0.1, Math.max(0, Number(dt) || 0));
    if (step <= 0) return;
    let v = keyPanVector(keysDown);
    if (v.x === 0 && v.y === 0 && edgeScroll && mouse.inside && pointers.size === 0) {
      v = edgePanVector(mouse.x, mouse.y, mouse.w, mouse.h, 14);
    }
    if (v.x === 0 && v.y === 0) return;
    const rect = canvas.getBoundingClientRect();
    const h = Math.max(1, rect.height);
    const px = h * KEY_PAN_SCREENS * step;
    if (rig.getFollow()) onLook();
    const f = panFactor();
    rig.panBy(-v.x * px * f, -v.y * px * f, h);
  }

  // 指・マウス・キーで見回しを動かしている最中か
  function isPanning() {
    if (primary && primary.looking && pointers.has(primary.id)) return true;
    const v = keyPanVector(keysDown);
    return v.x !== 0 || v.y !== 0;
  }

  function setEdgeScroll(on) {
    edgeScroll = !!on;
  }

  function onNativeContextMenu(event) {
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onNativeContextMenu);
  canvas.addEventListener('pointermove', onMouseTrack);
  canvas.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  function dispose() {
    clearLongPress();
    if (selectionBox.parentNode) selectionBox.parentNode.removeChild(selectionBox);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onNativeContextMenu);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointermove', onMouseTrack);
    canvas.removeEventListener('pointerleave', onPointerLeave);
  }

  return { dispose, update, setEdgeScroll, isPanning };
}
