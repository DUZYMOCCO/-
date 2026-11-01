// Shared treatment geometry. Rendered bone landmarks and the fallback pose
// both pass through the same pure horizontal-frame calculation.
export function treatmentFrameFromLandmarks(head, footA, footB, center, fallbackYaw = 0) {
  const footX = (footA.x + footB.x) * 0.5;
  const footZ = (footA.z + footB.z) * 0.5;
  let dx = footX - head.x;
  let dz = footZ - head.z;
  let length = Math.hypot(dx, dz);
  if (length < 1e-6) {
    dx = Math.sin(fallbackYaw);
    dz = Math.cos(fallbackYaw);
    length = 1;
  }
  const axisX = dx / length;
  const axisZ = dz / length;
  return {
    headX: head.x, headZ: head.z, footX, footZ,
    centerX: center.x, centerZ: center.z,
    axisX, axisZ, sideX: axisZ, sideZ: -axisX,
  };
}

// Fallback used before the first rendered bone sample (and in simulation-only contexts).
export function treatmentFrameFromActor(actor) {
  const yaw = Number.isFinite(actor?.rot) ? actor.rot : 0;
  const headX = actor?.x || 0;
  const headZ = actor?.z || 0;
  const axisX = Math.sin(yaw);
  const axisZ = Math.cos(yaw);
  return {
    headX, headZ, footX: headX + axisX, footZ: headZ + axisZ,
    centerX: headX, centerZ: headZ,
    axisX, axisZ, sideX: axisZ, sideZ: -axisX,
  };
}

// Project a local skeletal landmark through the doll's yaw and X lean, then
// use the same frame function as the renderer. Exported for geometry tests.
export function treatmentFrameFromPose(actor, landmarks) {
  const yaw = Number.isFinite(actor?.rot) ? actor.rot : 0;
  const lean = Number.isFinite(actor?.downLean) ? actor.downLean : 0;
  const transform = (point) => {
    const z = point.y * Math.sin(lean) + point.z * Math.cos(lean);
    return {
      x: (point.x * Math.cos(yaw) + z * Math.sin(yaw)) + (actor?.x || 0),
      z: (-point.x * Math.sin(yaw) + z * Math.cos(yaw)) + (actor?.z || 0),
    };
  };
  return treatmentFrameFromLandmarks(
    transform(landmarks.head), transform(landmarks.footA),
    transform(landmarks.footB), transform(landmarks.center), yaw,
  );
}
