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
  name, slot, cutRes, bluntRes, deflect, cover, weight, value, metal, variants: 3,
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
  straw_hat: { ...armor('麦わら帽子', 'head', .12, .04, .25, { head: .6 }, .5, 40), shape: 'hat', variants: 3 },
  conical_hat: { ...armor('笠', 'head', .12, .04, .25, { head: .65 }, .6, 45), shape: 'cone', variants: 3 },
  kabuto_helm: { ...armor('鍔付き兜', 'head', .68, .23, .85, { head: .9 }, 2.5, 260, true), shape: 'kabuto', variants: 3 },
  bucket_helm: { ...armor('筒兜', 'head', .72, .24, .88, { head: .95 }, 3, 280, true), shape: 'bucket', variants: 3 },
  cloth_hood: { ...armor('布頭巾', 'head', .14, .05, .3, { head: .8 }, .7, 35), shape: 'hood', variants: 3 },
  bandana: { ...armor('頭布', 'head', .08, .02, .2, { head: .5 }, .2, 15), shape: 'bandana', variants: 3 },
  face_mask: { ...armor('面当て', 'head', .3, .09, .5, { head: .55 }, .6, 55), shape: 'mask', variants: 3 },
  scrap_vest: { ...armor('屑鉄の胴当て', 'upperOut', .4, .15, .6, torso, 5, 100, true), shape: 'scrap', variants: 3 },
  padded_coat: { ...armor('厚手の綿入れ', 'upperOut', .32, .24, .4, torso, 6, 160), shape: 'padded', variants: 3 },
  box_plate: { ...armor('重板金の胴', 'upperOut', .8, .35, .9, torso, 15, 700, true), shape: 'box', variants: 3 },
  guard_cuirass: { ...armor('衛兵の胸甲', 'upperOut', .65, .22, .85, torso, 8, 350, true), shape: 'plate', variants: 3 },
  leather_coat: { ...armor('革の外套', 'upperOut', .36, .13, .55, torso, 4, 130), shape: 'coat', variants: 3 },
  rag_poncho: { ...armor('ぼろ布のポンチョ', 'upperOut', .12, .04, .3, torso, 2, 25), shape: 'poncho', variants: 3 },
  traveler_cape: { ...armor('旅人のマント', 'upperOut', .13, .04, .3, torso, 2, 55), shape: 'cape', variants: 3 },
  cloth_robe: { ...armor('布の長衣', 'upperOut', .16, .06, .3, torso, 3, 70), shape: 'robe', variants: 3 },
  lamellar_body: { ...armor('小札の胴', 'upperOut', .6, .22, .8, torso, 9, 330, true), shape: 'lamellar', variants: 3 },
  padded_legs: { ...armor('綿入り脚衣', 'lowerOut', .3, .22, .4, legs, 4, 120), shape: 'padded', variants: 3 },
  scrap_greaves: { ...armor('屑鉄の脛当て', 'lowerOut', .4, .15, .6, legs, 4, 95, true), shape: 'scrap', variants: 3 },
  heavy_greaves: { ...armor('重い脚甲', 'lowerOut', .78, .32, .9, legs, 10, 480, true), shape: 'box', variants: 3 },
  guard_greaves: { ...armor('衛兵の脚甲', 'lowerOut', .6, .2, .8, legs, 6, 260, true), shape: 'plate', variants: 3 },
  cloth_wraps: { ...armor('布の脚巻き', 'lowerIn', .1, .04, .25, legs, 1, 30), shape: 'wrap', variants: 3 },
  leather_trousers: { ...armor('革の脚衣', 'lowerIn', .28, .1, .5, legs, 2, 80), shape: 'leather', variants: 3 },
  padded_shirt: { ...armor('綿入り肌着', 'upperIn', .22, .17, .35, torso, 3, 90), shape: 'padded', variants: 3 },
  cloth_tunic: { ...armor('布の胴衣', 'upperIn', .12, .04, .25, torso, 1.5, 45), shape: 'robe', variants: 3 },
  scrap_boots: { ...armor('屑鉄の靴', 'feet', .4, .15, .6, { legs: .25 }, 2, 80, true), shape: 'scrap', variants: 3 },
  padded_boots: { ...armor('綿入り靴', 'feet', .2, .15, .35, { legs: .25 }, 1.5, 65), shape: 'padded', variants: 3 },
  guard_boots: { ...armor('衛兵の長靴', 'feet', .55, .2, .8, { legs: .3 }, 2, 150, true), shape: 'plate', variants: 3 },
  heavy_boots: { ...armor('重い鉄靴', 'feet', .78, .3, .9, { legs: .35 }, 4, 220, true), shape: 'box', variants: 3 },
  fist_guard: { name: '拳ガード', slot: 'acc', weight: .4, value: 80, martial: 4, fistProtection: true, attack: 1.05 },
  leg_guard: { name: '脚ガード', slot: 'acc', weight: .4, value: 60, martial: 2, legProtection: true, attack: 1 },
  small_pack: { name: '小さな背負い袋', slot: 'backpack', weight: 1, value: 60, capacity: 10, slots: 8 },
  large_pack: { name: '大きな背負い袋', slot: 'backpack', weight: 2, value: 120, capacity: 25, slots: 16 },
  quiver: { name: '矢筒', slot: 'quiver', weight: .5, value: 40, ammoCap: 30 },
  bolts: { name: '矢の束', slot: 'ammo', weight: .05, value: 2, stackable: true },
  crossbow: { name: 'クロスボウ', slot: 'weapon', weight: 4, value: 180, ranged: true, variants: 3 },
  light_crossbow: { name: '軽弩', slot: 'weapon', weight: 3, value: 140, ranged: true, variants: 3 },
  heavy_crossbow: { name: '重弩', slot: 'weapon', weight: 6, value: 250, ranged: true, variants: 3 },
  scrap_crossbow: { name: '屑鉄の弩', slot: 'weapon', weight: 5, value: 100, ranged: true, variants: 3 },
  ...Object.fromEntries(Object.keys(WEAPONS).filter(id => WEAPONS[id].family).map(id => [id, { name: WEAPONS[id].name, slot: 'weapon', weight: WEAPONS[id].weight, value: Math.round(60 + WEAPONS[id].weight * 15), variants: 3 }])),
  ...Object.fromEntries(['sword', 'sabre', 'machete', 'hammer', 'club'].map((id, i) => [id, {
    name: ['剣', '曲刀', '鉈', '槌', '棍棒'][i], slot: 'weapon', weight: WEAPONS[id].weight, value: 100, variants: 3,
  }])),
  ...SMITH_MATERIALS,
  ...RESEARCH_ARTIFACTS,
};
