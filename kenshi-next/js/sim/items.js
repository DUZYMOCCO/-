import { WEAPONS } from './data.js';
import { SMITH_MATERIALS, RESEARCH_ARTIFACTS } from '../data/smith_materials.js';

export const QUALITY_RANKS = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1, res: 0.65 + i * 0.075, weight: 1.1 - i * (0.2 / 9), value: 1 + i * i * (39 / 81),
}));

// ランクを1〜10に収め、品質倍率を返す。
export function qualityOf(rank) {
  return QUALITY_RANKS[Math.max(0, Math.min(QUALITY_RANKS.length - 1, Math.round(Number(rank) || 1) - 1))];
}

// 防具の共通データを作る。
const armor = (name, slot, cutRes, bluntRes, deflect, cover, weight, value, metal = false) => ({
  name, slot, cutRes, bluntRes, deflect, cover, weight, value, metal,
});
const torso = { chest: 0.95, stomach: 0.9, arms: 0.55 };
const legs = { legs: 0.95 };
export const ITEMS = {
  rag_top: armor('ぼろ布の上着', 'upperOut', .1, .03, .3, torso, 1, 10),
  rag_pants: armor('ぼろ布のズボン', 'lowerOut', .1, .03, .3, legs, 1, 10),
  cloth_shirt: armor('布の肌着', 'upperIn', .08, .024, .3, torso, 1, 25),
  cloth_pants: armor('布のズボン', 'lowerIn', .08, .024, .3, legs, 1, 25),
  leather_vest: armor('革の胴着', 'upperOut', .35, .1, .6, torso, 3, 90),
  leather_cap: armor('革の帽子', 'head', .35, .1, .6, { head: .85 }, .7, 50),
  leather_leggings: armor('革の脚絆', 'lowerOut', .35, .1, .6, legs, 2, 70),
  chain_shirt: armor('鎖の肌着', 'upperIn', .44, .096, .8, torso, 5, 250, true),
  chain_coat: armor('鎖の上衣', 'upperOut', .55, .12, .8, torso, 7, 320, true),
  iron_helmet: armor('鉄の兜', 'head', .75, .25, .9, { head: .9 }, 2, 200, true),
  plate_body: armor('板金の胴', 'upperOut', .75, .25, .9, torso, 10, 500, true),
  plate_legs: armor('板金の脚甲', 'lowerOut', .75, .25, .9, legs, 7, 400, true),
  sandals: armor('草鞋', 'feet', .1, .03, .3, { legs: .15 }, .4, 15),
  leather_shoes: armor('革靴', 'feet', .35, .1, .6, { legs: .2 }, .8, 45),
  iron_boots: armor('鉄の靴', 'feet', .75, .25, .9, { legs: .25 }, 2, 130, true),
  fist_guard: { name: '拳ガード', slot: 'acc', weight: .4, value: 80, martial: 4, fistProtection: true, attack: 1.05 },
  leg_guard: { name: '脚ガード', slot: 'acc', weight: .4, value: 60, martial: 2, legProtection: true, attack: 1 },
  small_pack: { name: '小さな背負い袋', slot: 'backpack', weight: 1, value: 60, capacity: 10, slots: 8 },
  large_pack: { name: '大きな背負い袋', slot: 'backpack', weight: 2, value: 120, capacity: 25, slots: 16 },
  quiver: { name: '矢筒', slot: 'quiver', weight: .5, value: 40, ammoCap: 30 },
  bolts: { name: '矢の束', slot: 'ammo', weight: .05, value: 2, stackable: true },
  crossbow: { name: 'クロスボウ', slot: 'weapon', weight: 4, value: 180 },
  ...Object.fromEntries(['sword', 'sabre', 'machete', 'hammer', 'club'].map((id, i) => [id, {
    name: ['剣', '曲刀', '鉈', '槌', '棍棒'][i], slot: 'weapon', weight: WEAPONS[id].weight, value: 100,
  }])),
  ...SMITH_MATERIALS,
  ...RESEARCH_ARTIFACTS,
};
