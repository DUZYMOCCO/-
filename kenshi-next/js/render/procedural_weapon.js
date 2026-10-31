import * as THREE from '../vendor/three/build/three.module.min.js';
import { WEAPONS } from '../sim/data.js';

const steel = new THREE.MeshStandardMaterial({ color: 0x89969a, metalness: .5, roughness: .65 });
const wood = new THREE.MeshStandardMaterial({ color: 0x58402a, roughness: .9 });
const cache = new Map();
// Models have their grip at the origin and extend along +Z, as do existing models.
export function proceduralWeapon(id, variant = 0) {
  const w = WEAPONS[id];
  if (!w) return null;
  const family = w.family || ({ sword: 'katana', sabre: 'sabre', machete: 'cleaver', hammer: 'hammer', club: 'club' })[id];
  if (!family) return null;
  const v = Math.abs(Math.trunc(Number(variant) || 0)) % 3;
  const key = id + ':' + v;
  let template = cache.get(key);
  if (!template) {
    template = new THREE.Group();
    const box = (x,y,z,px,py,pz,material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(x,y,z), material);
      mesh.position.set(px,py,pz); template.add(mesh);
    };
    const pole = family === 'polearm';
    const heavy = ['hammer','axe','club'].includes(family);
    const length = Math.max(.55, Math.min(1.5, w.reach / 23));
    box(.065,.065,pole ? length*.8 : .28,0,0,pole ? length*.35 : .05,wood);
    if (pole) {
      box(.12 + v*.025,.045,length*.38,0,0,length*.88,steel);
      box(.2,.06,.08,0,0,length*.7,steel);
    } else if (heavy) {
      box(.065,.065,length*.65,0,0,length*.42,wood);
      box((family === 'axe' ? .3 : .2) + v*.045,.16 + v*.025,.2,0,0,length*.76,steel);
    } else {
      box(.22 + v*.04,.045,.07,0,0,.2,steel);
      box((family === 'cleaver' ? .19 : .1) + v*.025,.045,length*.7,0,0,.23+length*.35,steel);
    }
    cache.set(key, template);
  }
  return template.clone();
}
