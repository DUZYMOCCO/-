import { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WEAPONS } from '../sim/data.js';
import { hasOwnLook } from './own_weapon_look.js';

const legacy = { sword:'katana', sabre:'sabre', machete:'cleaver', hammer:'hammer', club:'club' };
const pieces = new Map();
let generation = 0;
const WEAPONS_URL = 'assets/weapons_v3.glb';
new GLTFLoader().load(WEAPONS_URL, gltf => {
  gltf.scene.updateMatrixWorld(true);
  for (const child of gltf.scene.children) pieces.set(child.name, child);
  generation++;
  console.info('[weapons] loaded ' + WEAPONS_URL);
}, undefined, error => console.warn('weapons_v3 load failed', error));
export function weaponGeneration() { return generation; }
export function weaponModel(id, variant = 0) {
  // wb_ の武器は専用の手続き的な形を使う（既存系統の glb は使わない）。
  if (typeof id === 'string' && id.startsWith('wb_')) return null;
  // 専用の手続き的な形を持つ武器（wa_）は glb の系統見た目を使わない。
  if (hasOwnLook(id)) return null;
  const family = id?.includes('crossbow') ? 'crossbow' : WEAPONS[id]?.family || legacy[id];
  const look = Math.abs(Math.trunc(Number(variant) || 0)) % 3 + 1;
  const source = pieces.get(family + '_look' + look);
  if (!source) return null;
  // Source geometry points along +Y; the renderer's grip convention is +Z.
  const group = new Group(); const axes = new Group();
  axes.rotation.x = Math.PI / 2;
  axes.add(source.clone(true)); group.add(axes); return group;
}
