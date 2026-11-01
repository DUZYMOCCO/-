// The bedroll is about 1.7 m long on local Z, with the pillow at the -Z end.
// Keep the rotated body above its surface and point its head toward that end.
export const BEDROLL_SURFACE_Y = 0.31;
// Includes the fallback capsule's 0.26 m radius after it is rotated onto its side.
export const SLEEP_BODY_HALF_DEPTH = 0.27;
export const SLEEP_CLEARANCE = 0.02;
export const SLEEP_PITCH = -Math.PI / 2;
// Doll assets use a feet/root pivot and are about 1.85 m tall when upright.
// After lying down, the head is this far from the pivot along the bedroll axis.
export const SLEEP_BODY_LENGTH = 1.85;

export function sleepPoseForBedroll(bedroll, groundY = 0) {
  const bedrollYaw = Number(bedroll?.rot) || 0;
  const y = groundY + BEDROLL_SURFACE_Y + SLEEP_BODY_HALF_DEPTH + SLEEP_CLEARANCE;
  // The cream pillow roll is on the -Z end of the bedroll geometry. The doll's
  // head points along its local +Y axis, which maps to -Z after the sleep pitch.
  const yaw = bedrollYaw;
  const headDirection = { x: -Math.sin(bedrollYaw), z: -Math.cos(bedrollYaw) };
  return {
    // The actor origin is at the feet. Move it back by half the body length so
    // the body center, rather than its feet, sits over the mat center.
    x: (Number(bedroll?.x) || 0) - headDirection.x * (SLEEP_BODY_LENGTH / 2),
    y,
    z: (Number(bedroll?.z) || 0) - headDirection.z * (SLEEP_BODY_LENGTH / 2),
    yaw,
    pitch: SLEEP_PITCH,
    bodyBottomY: y - SLEEP_BODY_HALF_DEPTH,
    headDirection,
  };
}

// Shared by the renderer and Object3D regression so the tested transform is
// exactly the one applied after animation updates.
export function applySleepPose(group, root, bedroll, groundY = 0) {
  if (!group || !root || !bedroll) return false;
  const pose = sleepPoseForBedroll(bedroll, groundY);
  group.position.set(pose.x, groundY, pose.z);
  group.rotation.set(0, pose.yaw, 0);
  root.position.set(0, pose.y - groundY, 0);
  root.rotation.set(pose.pitch, 0, 0);
  return true;
}
