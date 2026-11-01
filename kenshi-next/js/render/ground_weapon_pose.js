// Deterministic, terrain-aligned placement shared by ground-weapon rendering and tests.
export function groundWeaponPose(id, x, z, groundY, slopeX = 0, slopeZ = 0) {
  const key = String(id ?? 'weapon');
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const yaw = ((hash >>> 0) / 0x100000000) * Math.PI * 2;
  const invLength = 1 / Math.hypot(slopeX, 1, slopeZ);
  return {
    x, y: groundY + 0.045, z, yaw,
    normal: [-slopeX * invLength, invLength, -slopeZ * invLength],
  };
}
