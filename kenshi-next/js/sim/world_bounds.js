import { WORLD_LAYOUT } from '../data/world_layout.js';

export const WORLD_BOUNDS = Object.freeze({
  minX: WORLD_LAYOUT.bounds.minX + 50, maxX: WORLD_LAYOUT.bounds.maxX - 50,
  minZ: WORLD_LAYOUT.bounds.minZ + 50, maxZ: WORLD_LAYOUT.bounds.maxZ - 50,
});
export function clampToWorld(x, z) {
  return { x: Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, x)),
    z: Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, z)) };
}
export const clampWorldX = x => Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, x));
export const clampWorldZ = z => Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, z));
