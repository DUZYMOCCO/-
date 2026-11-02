import * as THREE from '../vendor/three/build/three.module.min.js';
import { WEAPONS } from '../sim/data.js';
import { WB_MELEE_IDS, buildWbMeleeGeometry } from './wb_weapon_geometry.js';

const steel = new THREE.MeshStandardMaterial({ color: 0x89969a, metalness: .5, roughness: .65 });
const wood = new THREE.MeshStandardMaterial({ color: 0x58402a, roughness: .9 });
const cache = new Map();
// Models have their grip at the origin and extend along +Z, as do existing models.
export function proceduralWeapon(id, variant = 0) {
  const w = WEAPONS[id];
  if (!w) return null;
  const family = w.family || ({ sword: 'katana', sabre: 'sabre', machete: 'cleaver', hammer: 'hammer', club: 'club', frying_pan: 'frying_pan' })[id];
  if (!family) return null;
  const v = Math.abs(Math.trunc(Number(variant) || 0)) % 3;
  const key = id + ':' + v;
  let template = cache.get(key);
  if (!template && WB_MELEE_IDS.includes(id)) {
    // wb_ の近接武器は系統の使い回しではなく、ID ごとの専用の形。
    template = buildWbMeleeGeometry(THREE, id, v, { steel, wood });
    if (template) cache.set(key, template);
    return template ? template.clone() : null;
  }
  if (!template) {
    template = new THREE.Group();
    const box = (x,y,z,px,py,pz,material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(x,y,z), material);
      mesh.position.set(px,py,pz); template.add(mesh);
    };
    // 追加武器（wa_）専用の形。握りは原点、刃先は +Z。
    if (id === 'wa_kazekiri_tachi') {
      const blade = 1.0 + v * .08;
      box(.052,.052,.26,0,0,.13,wood);                 // 柄
      box(.078,.078,.04,0,0,-.005,steel);              // 柄頭
      box(.16 + v*.015,.02,.05,0,0,.275,steel);        // 鍔
      box(.058,.026,.06,0,0,.305,steel);               // 刃の付け根
      for (let i = 0; i < 3; i += 1) {                 // 反った3枚の刃
        const seg = new THREE.Mesh(new THREE.BoxGeometry(.034,.013,blade / 3), steel);
        seg.position.set(0,0,.33 + blade / 6 + i * blade / 3);
        seg.rotation.y = (i - 1) * .05 - v * .01;
        template.add(seg);
      }
      if (v >= 1) box(.018,.016,blade * .55,0,.011,.33 + blade * .3,steel); // 峰の溝
      if (v === 2) box(.03,.03,.09,0,0,-.06,wood);     // 柄尻の飾り
      cache.set(key, template);
      return template.clone();
    }
    if (id === 'wa_iwari_otsuchi') {
      const len = .96 + v * .05;
      box(.062,.062,len,0,0,len / 2,wood);             // 柄
      box(.09,.09,.10,0,0,len - .06,steel);            // 柄の締め
      box(.26 + v*.035,.23 + v*.03,.34,0,0,len + .10,steel); // 槌の頭
      box(.28 + v*.035,.05,.07,0,.10,len + .10,steel); // 上の帯
      if (v >= 1) box(.30 + v*.03,.045,.07,0,-.10,len + .10,steel);
      if (v === 2) box(.055,.055,.18,0,0,len + .34,steel); // 先端の棘
      cache.set(key, template);
      return template.clone();
    }
    if (id === 'wa_tsukikage_yari') {
      const len = 1.22 + v * .06;
      box(.046,.046,len,0,0,len / 2,wood);             // 柄
      box(.06,.06,.07,0,0,-.005,steel);                // 石突
      box(.075,.075,.11,0,0,len - .04,steel);          // 穂の根元
      box(.085 + v*.012,.02,.36,0,0,len + .22,steel);  // 穂先
      if (v >= 1) box(.24,.02,.07,0,0,len + .10,steel); // 横の刃
      if (v === 2) box(.16,.018,.10,0,0,len + .32,steel); // 先端の飾り
      cache.set(key, template);
      return template.clone();
    }
    const pole = family === 'polearm';
    const heavy = ['hammer','axe','club'].includes(family);
    const length = Math.max(.55, Math.min(1.5, w.reach / 23));
    if (id === 'frying_pan') {
      box(.055,.055,.38,0,0,.28,wood);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.22,.19,.055,20), steel);
      bowl.rotation.x = Math.PI / 2;
      bowl.position.set(0, 0, .58);
      template.add(bowl);
      cache.set(key, template);
      return template.clone();
    }
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
