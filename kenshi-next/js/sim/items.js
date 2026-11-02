import { WEAPONS } from './data.js';
import THROWN_WEAPONS from '../data/thrown_weapons.js';
import { SMITH_MATERIALS, RESEARCH_ARTIFACTS } from '../data/smith_materials.js';
import gearNamesJa from '../data/gear_names_ja.js';
import itemFlavor from '../data/items_flavor.js';

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
  blackmarket_coat: armor('継ぎ目の外套', 'upperOut', .48, .14, .5, torso, 3, 1800),
  blackmarket_boots: armor('静歩の長靴', 'feet', .4, .12, .4, { legs: .2 }, 1, 1200),
  grain: { name: '穀物袋', slot: 'food', weight: .5, value: 30, stackable: true, food: true, nutrition: 14 },
  dried_meat: { name: '干し肉', slot: 'food', weight: .3, value: 60, stackable: true, food: true, nutrition: 28 },
  porridge: { name: '木の実粥', slot: 'food', weight: .4, value: 12, stackable: true, food: true, nutrition: 42 },
  roast_meat: { name: '香草焼き', slot: 'food', weight: .5, value: 18, stackable: true, food: true, nutrition: 48 },
  salted_rice: { name: '塩焼き団子', slot: 'food', weight: .3, value: 14, stackable: true, food: true, nutrition: 44 },
  stew: { name: '干し肉の煮込み', slot: 'food', weight: .6, value: 24, stackable: true, food: true, nutrition: 58 },
  sweet_dumpling: { name: '蜜なし団子', slot: 'food', weight: .3, value: 15, stackable: true, food: true, nutrition: 50 },
  bear_trap: { name: 'トラバサミ', slot: 'item', weight: 4, value: 90 },
  net_trap: { name: '網', slot: 'item', weight: 1, value: 35 },
  shovel: { name: 'シャベル', slot: 'item', weight: 3, value: 60 },
  rag_top: armor('ぼろ布の上着', 'upperOut', .1, .03, .3, torso, 1, 10),
  rag_pants: armor('ぼろ布のズボン', 'lowerOut', .1, .03, .3, legs, 1, 10),
  cloth_shirt: armor('布の肌着', 'upperIn', .08, .024, .3, torso, 1, 25),
  cloth_pants: armor('布のズボン', 'lowerIn', .08, .024, .3, legs, 1, 25),
  leather_vest: armor('革の胴着', 'upperOut', .35, .1, .6, torso, 3, 90),
  leather_cap: { ...armor('革の帽子', 'head', .35, .1, .6, { head: .85 }, .7, 50), vision: .04 },
  leather_leggings: armor('革の脚絆', 'lowerOut', .35, .1, .6, legs, 2, 70),
  chain_shirt: armor('鎖の肌着', 'upperIn', .44, .096, .8, torso, 5, 250, true),
  chain_coat: armor('鎖の上衣', 'upperOut', .55, .12, .8, torso, 7, 320, true),
  iron_helmet: { ...armor('鉄の兜', 'head', .75, .25, .9, { head: .9 }, 2, 200, true), vision: .09 },
  plate_body: armor('板金の胴', 'upperOut', .75, .25, .9, torso, 10, 500, true),
  plate_legs: armor('板金の脚甲', 'lowerOut', .75, .25, .9, legs, 7, 400, true),
  sandals: armor('草鞋', 'feet', .1, .03, .3, { legs: .15 }, .4, 15),
  leather_shoes: armor('革靴', 'feet', .35, .1, .6, { legs: .2 }, .8, 45),
  iron_boots: armor('鉄の靴', 'feet', .75, .25, .9, { legs: .25 }, 2, 130, true),
  straw_hat: { ...armor('麦わら帽子', 'head', .12, .04, .25, { head: .6 }, .5, 40), shape: 'hat', variants: 3, vision: .02 },
  conical_hat: { ...armor('笠', 'head', .12, .04, .25, { head: .65 }, .6, 45), shape: 'cone', variants: 3, vision: .02 },
  kabuto_helm: { ...armor('鍔付き兜', 'head', .68, .23, .85, { head: .9 }, 2.5, 260, true), shape: 'kabuto', variants: 3, vision: .11 },
  bucket_helm: { ...armor('筒兜', 'head', .72, .24, .88, { head: .95 }, 3, 280, true), shape: 'bucket', variants: 3, vision: .18 },
  cloth_hood: { ...armor('布頭巾', 'head', .14, .05, .3, { head: .8 }, .7, 35), shape: 'hood', variants: 3, vision: 0 },
  bandana: { ...armor('頭布', 'head', .08, .02, .2, { head: .5 }, .2, 15), shape: 'bandana', variants: 3, vision: 0 },
  face_mask: { ...armor('面当て', 'head', .3, .09, .5, { head: .55 }, .6, 55), shape: 'mask', variants: 3, vision: .05 },
  // Light, freely assignable trinkets for the four generic accessory slots.
  trinket_sunglasses: { name: '煤け硝子の色眼鏡', slot: 'trinket', trinket: true, weight: .1, value: 18, description: '砂塵よけの薄い色眼鏡。視界をわずかに守る。' },
  trinket_mask: { name: '旅人の布覆い', slot: 'trinket', trinket: true, weight: .1, value: 12, description: '埃と煙をしのぐ、使い古しの布。' },
  trinket_necklace: { name: '乾いた川の首飾り', slot: 'trinket', trinket: true, weight: .1, value: 22, description: '川石を紐に通した小さなお守り。' },
  trinket_ring: { name: '鉄屑の指輪', slot: 'trinket', trinket: true, weight: .1, value: 16, description: '磨いた鉄屑を輪にした指輪。' },
  trinket_charm: { name: '道標のお守り', slot: 'trinket', trinket: true, weight: .1, value: 20, description: '旅の無事を願う木札。' },
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
  hb_sand_hood: {
    ...armor('砂避けの頭衣', 'head', .15, .05, .3, { head: .75 }, .7, 45),
    shape: 'hb_veil', variants: 3, vision: .01,
    desc: '乾いた風と砂塵をよけるための薄い頭衣。通気がよく、長旅でも蒸れにくい。',
  },
  hb_ridged_cuirass: {
    ...armor('錆止めの胸甲', 'upperOut', .7, .24, .88, torso, 9, 380, true),
    shape: 'hb_ridged', variants: 3,
    desc: '継ぎ目を重ねた鉄板を胸に渡した鎧。丁寧に手入れすれば長く使える。',
  },
  hb_leather_leggings: {
    ...armor('泥除けの革脚絆', 'lowerOut', .37, .12, .6, legs, 2.5, 95),
    shape: 'hb_mudleg', variants: 3,
    desc: '膝から下を覆う厚めの革脚絆。泥や小石から脚を守る。',
  },
  hb_plate_boots: {
    ...armor('板継ぎの鉄靴', 'feet', .7, .24, .88, { legs: .28 }, 2.5, 150, true),
    shape: 'hb_sabaton', variants: 3,
    desc: '小さな鉄板を重ねて仕立てた踏靴。足元への一撃を受け止める。',
  },
  ha_crest_helm: { ...armor('峰守の兜', 'head', .74, .24, .88, { head: .92 }, 2.4, 240, true), shape: 'ha_crest_helm', variants: 3, vision: .08, desc: '峰の見張りがかぶる鉄の兜。頂の稜線で打撃を受け流すが、視界はわずかに狭い。' },
  ha_sash_coat: { ...armor('風切りの外衣', 'upperOut', .14, .05, .3, torso, 2.5, 65), shape: 'ha_sash_coat', variants: 3, desc: '乾いた風をはらむ薄手の外衣。腰の紐を締めると裾がはためきにくい。' },
  ha_lame_greaves: { ...armor('編鉄の脚甲', 'lowerOut', .72, .24, .88, legs, 6.5, 380, true), shape: 'ha_lame_greaves', variants: 3, desc: '細い鉄板を編み込んだ脚甲。重いが脛を広く守り、長く歩いても脚に沿う。' },
  ha_leather_boots: { ...armor('旅路の革靴', 'feet', .38, .12, .6, { legs: .22 }, 1.1, 60), shape: 'ha_trail_boots', variants: 3, desc: '砂と石を踏みしめる厚革の靴。足首の紐を締めれば長い道でも脱げにくい。' },
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
  wb_storm_crossbow: { name: '嵐呼びの弩', slot: 'weapon', weight: 6.2, value: 430, ranged: true, variants: 3 },
  ...Object.fromEntries(Object.keys(WEAPONS).filter(id => WEAPONS[id].family).map(id => [id, { name: WEAPONS[id].name, slot: 'weapon', weight: WEAPONS[id].weight, value: Math.round(60 + WEAPONS[id].weight * 15), variants: 3 }])),
  ...Object.fromEntries(['sword', 'sabre', 'machete', 'hammer', 'club'].map((id, i) => [id, {
    name: ['剣', '曲刀', '鉈', '槌', '棍棒'][i], slot: 'weapon', weight: WEAPONS[id].weight, value: 100, variants: 3,
  }])),
  // 追加武器（wa_）。系統から自動で入る分を、値段と説明文つきで上書きする。
  wa_kazekiri_tachi: { name: '風切りの太刀', slot: 'weapon', weight: WEAPONS.wa_kazekiri_tachi.weight, value: 170, variants: 3,
    desc: '薄く反った長い刃は振り抜きが速く、鎧の隙間を狙うのに向く。峰の溝が斬った後の血を落としやすくする。' },
  wa_iwari_otsuchi: { name: '岩割りの大槌', slot: 'weapon', weight: WEAPONS.wa_iwari_otsuchi.weight, value: 260, variants: 3,
    desc: '石を割るために鍛えた重い両手槌。振り下ろす一撃は受けを崩し、鎧ごと相手を沈める。' },
  wa_tsukikage_yari: { name: '月影の長槍', slot: 'weapon', weight: WEAPONS.wa_tsukikage_yari.weight, value: 190, variants: 3,
    desc: '月の光を映す長い穂先の槍。間合いの外から突き込み、横薙ぎで敵の足を止める。' },
  wa_arashi_crossbow: { name: '山颪の弩', slot: 'weapon', weight: 4.5, value: 230, ranged: true, variants: 3,
    desc: '嵐の音を模した弦を持つ大型の弩。重い矢を遠くへ運ぶが、装填には時間がかかる。' },
  frying_pan: { name: 'フライパン', slot: 'weapon', weight: 3, value: 40, variants: 1, shape: 'frying_pan' },
  prosthetic_arm: { name: '木の義手', slot: 'prosthetic', prostheticPart: 'arm', weight: 3, value: 400 },
  prosthetic_leg: { name: '木の義足', slot: 'prosthetic', prostheticPart: 'leg', weight: 4, value: 450 },
  iron_prosthetic_arm: { name: '鉄の義手', slot: 'prosthetic', prostheticPart: 'arm', weight: 5, value: 1200, metal: true },
  iron_prosthetic_leg: { name: '鉄の義足', slot: 'prosthetic', prostheticPart: 'leg', weight: 6, value: 1300, metal: true },
  ...Object.fromEntries(THROWN_WEAPONS.map(item => [item.id, {
    name: item.name, desc: item.desc, slot: 'throwable', weight: item.weight_kg,
    value: item.price_cash, stackable: true, maxStack: item.stack_max, throwable: true,
    thrownKind: item.kind, throw: item,
  }])),
  ...SMITH_MATERIALS,
  ...RESEARCH_ARTIFACTS,
};

// wb_ の武器の説明（1〜2文）。自動生成される近接武器にも表示用の説明を足す。
const WB_WEAPON_DESC = {
  wb_moonseam_katana: '細身の刃に三日月の透かしを入れた刀。軽く振れて、斬り結びの間合いを詰めやすい。',
  wb_quarry_maul: '採石場で岩を割る鉄槌を戦用に仕立て直したもの。重い一撃で相手の構えごと崩す。',
  wb_reed_glaive: '長い柄の先に反りのある刃を据えた得物。距離を保ったまま横に払える。',
  wb_storm_crossbow: '太い弓腕に補強を重ねた弩。扱いは重いが、遠間から鋭い矢を放てる。',
};
for (const [id, desc] of Object.entries(WB_WEAPON_DESC)) if (ITEMS[id]) ITEMS[id].desc = desc;

// 翻訳と説明は元の装備定義に混ぜず、表示用データだけを重ねる。
for (const entry of gearNamesJa) if (ITEMS[entry.id]) ITEMS[entry.id].name = entry.name;
for (const entry of itemFlavor) {
  if (!entry.inGame || !ITEMS[entry.id]) continue;
  ITEMS[entry.id].desc = entry.desc;
  ITEMS[entry.id].flavor = entry.flavor;
}
