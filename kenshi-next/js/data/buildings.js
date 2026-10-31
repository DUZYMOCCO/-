// 建築 MVP の部品表。sim は表示色・メッシュを参照せず、この定義の寸法と素材だけを使う。
export const BUILDINGS = Object.freeze({
  outpost_flag: { name: '拠点の旗', place: 'grid', size: [1, 2, 1], work: 0, cost: {}, solid: false },
  wood_fence: { name: '木柵', place: 'wall', size: [1, 1.8, 0.35], work: 24, cost: { wood: 3 } },
  stone_wall: { name: '石壁', place: 'wall', size: [1, 2.4, 0.55], work: 45, cost: { stone: 4 } },
  wood_gate: { name: '木の門', place: 'wallInsert', size: [1, 2, 0.35], work: 30, cost: { wood: 5 }, door: true },
  storage_box: { name: '物置箱', place: 'grid', indoor: 'either', size: [1.2, 1, 0.8], work: 18, cost: { wood: 4 }, storage: true },
  bedroll: { name: '寝袋', place: 'grid', indoor: 'either', size: [1.6, 0.2, 0.7], work: 8, cost: { cloth: 2 }, bed: true },
  bed: { name: '寝台', place: 'interior', size: [2, 0.7, 1], work: 24, cost: { wood: 5, cloth: 1 }, bed: true },
  workbench: { name: '作業台', place: 'grid', indoor: 'either', size: [1.6, 1.1, 1], work: 36, cost: { wood: 6, stone: 2 }, bench: true },
  small_farm: { name: '小さな畑', place: 'grid', size: [3, 0.4, 3], work: 40, cost: { wood: 3, stone: 2 }, farm: true },
  shop_counter: { name: '店のカウンター', place: 'interior', size: [1.8, 1, 0.6], work: 18, cost: { wood: 4 }, counter: true },
  forge: { name: '鍛冶炉', place: 'grid', size: [1.5, 1.2, 1.5], work: 50, cost: { stone: 5, metal: 2 }, bench: true },
});

export const BUILDING_CATEGORIES = Object.freeze([
  { id: 'walls', name: '壁・門', items: ['wood_fence', 'stone_wall', 'wood_gate'] },
  { id: 'storage', name: '収納', items: ['storage_box'] },
  { id: 'beds', name: '寝床', items: ['bedroll', 'bed'] },
  { id: 'work', name: '作業', items: ['workbench', 'forge'] },
  { id: 'farm', name: '畑', items: ['small_farm'] },
  { id: 'shop', name: '店', items: ['shop_counter'] },
]);

export const BUILD_MATERIALS = Object.freeze({
  stone: '石材', wood: '木材', metal: '金属板', cloth: '布',
});

export const FLAG_KIT_RECIPE = Object.freeze({ materials: { stone: 4, cloth: 2 }, seconds: 60 });
