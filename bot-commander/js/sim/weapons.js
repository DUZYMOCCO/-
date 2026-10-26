// 武器の表（68 種）。new-game-rts/weapons/weapons.json（10/23）から演出に要る列だけ写したもの。数字を変えるときは元の表を直して写し直す。
// v0.4.0-dev（10/24）: 落とし物の武器のために slot（weapon/support/carry/default）と bonus_group の列、強さの式（weaponPower）を足した。
// 演出（js/fx）は行をそのまま classify() に渡して「着弾の種類・弾・強さ」を決める。
import { ALT_KIND_WEAPON } from './alt-units.js?v=3';
import { NEW_ENEMY_WEAPON } from './new-enemies.js?v=2'; // 新しい敵 14 種（?newenemies=1）
export const WEAPONS = [
  {"id": "W0-01", "name": "素手（パンチ）", "stage": 0, "type": "melee", "tier": 0, "motion_s": 0.8, "pellets": 1, "splash": 0, "slot": "default"},
  {"id": "W0-02", "name": "投石", "stage": 0, "type": "throw", "tier": 0, "motion_s": 1.5, "pellets": 1, "splash": 0, "slot": "default"},
  {"id": "W0-03", "name": "角材", "stage": 0, "type": "melee", "tier": 0, "motion_s": 1.5, "pellets": 1, "splash": 0, "slot": "default"},
  {"id": "W1-01", "name": "拳銃", "stage": 1, "type": "shoot", "tier": 1, "motion_s": 0.6, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W1-02", "name": "AK型小銃", "stage": 1, "type": "shoot", "tier": 2, "motion_s": 0.3, "pellets": 1, "splash": 0, "special": ["suppress"], "slot": "weapon"},
  {"id": "W1-07", "name": "鉄パイプ・バール", "stage": 1, "type": "melee", "tier": 2, "motion_s": 1.2, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W1-10", "name": "トラバサミ", "stage": 1, "type": "trap", "tier": 2, "motion_s": 4.0, "pellets": 1, "splash": 0, "special": ["root"], "slot": "carry"},
  {"id": "W1-03", "name": "猟銃（散弾）", "stage": 1, "type": "shoot", "tier": 3, "motion_s": 1.5, "pellets": 6, "splash": 30, "slot": "weapon"},
  {"id": "W1-09", "name": "手製パイプ爆弾", "stage": 1, "type": "throw", "tier": 3, "motion_s": 2.5, "pellets": 1, "splash": 60, "slot": "weapon"},
  {"id": "W1-04", "name": "ボルト式狙撃銃", "stage": 1, "type": "shoot", "tier": 4, "motion_s": 3.0, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W1-12", "name": "業務用無線妨害器", "stage": 1, "type": "jam", "tier": 4, "motion_s": 3.0, "pellets": 1, "splash": 200, "special": ["jam"], "slot": "weapon"},
  {"id": "W1-05", "name": "軽機関銃", "stage": 1, "type": "shoot", "tier": 5, "motion_s": 0.15, "pellets": 1, "splash": 0, "special": ["suppress"], "slot": "weapon"},
  {"id": "W1-06", "name": "使い捨てロケット砲", "stage": 1, "type": "cannon", "tier": 6, "motion_s": 5.0, "pellets": 1, "splash": 60, "slot": "weapon"},
  {"id": "W1-08", "name": "解体ハンマー", "stage": 1, "type": "melee", "tier": 6, "motion_s": 3.0, "pellets": 1, "splash": 30, "slot": "weapon"},
  {"id": "WB1-03", "name": "防護パラソル", "stage": 1, "type": "barrier", "tier": 3, "motion_s": 5.0, "pellets": 1, "splash": 120, "slot": "support"},
  {"id": "WB1-04", "name": "鉄板付き大傘", "stage": 1, "type": "barrier", "tier": 8, "motion_s": 6.0, "pellets": 1, "splash": 130, "slot": "support"},
  {"id": "WR1-02", "name": "工具箱とジャッキ", "stage": 1, "type": "repair", "tier": 2, "motion_s": 5.0, "pellets": 1, "splash": 0, "special": ["hold_target"], "slot": "support"},
  {"id": "WR1-03", "name": "整備用ウインチ", "stage": 1, "type": "repair", "tier": 7, "motion_s": 6.0, "pellets": 1, "splash": 0, "special": ["hold_target"], "slot": "support"},
  {"id": "WB1-01", "name": "機動隊の盾", "stage": 1, "type": "barrier", "tier": 1, "motion_s": 0.5, "pellets": 1, "splash": 0, "special": ["front_only"], "slot": "support"},
  {"id": "WB1-02", "name": "鉄板の盾", "stage": 1, "type": "barrier", "tier": 6, "motion_s": 0.8, "pellets": 1, "splash": 0, "special": ["front_only"], "slot": "support"},
  {"id": "W1-11", "name": "溶接トーチ", "stage": 1, "type": "repair", "tier": 1, "motion_s": 1.0, "pellets": 1, "splash": 0, "slot": "support"},
  {"id": "WR1-01", "name": "ガス溶接機", "stage": 1, "type": "repair", "tier": 5, "motion_s": 0.8, "pellets": 1, "splash": 0, "slot": "support"},
  {"id": "W2-01", "name": "PONCO の制式ライフル（FW）", "stage": 2, "type": "shoot", "tier": 8, "motion_s": 0.8, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W2-02", "name": "アイアンフィストの拳（IF）", "stage": 2, "type": "melee", "tier": 10, "motion_s": 2.5, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W2-03", "name": "アイアンフィストの砲身（IF）", "stage": 2, "type": "cannon", "tier": 12, "motion_s": 6.0, "pellets": 1, "splash": 70, "slot": "weapon"},
  {"id": "W2-05", "name": "CE の発光センサー・レーザー銃（CE）", "stage": 2, "type": "shoot", "tier": 14, "motion_s": 1.2, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W2-09", "name": "単分子ワイヤー罠（MT）", "stage": 2, "type": "trap", "tier": 15, "motion_s": 5.0, "pellets": 1, "splash": 0, "slot": "carry"},
  {"id": "W2-06", "name": "EA-07 の長距離狙撃砲（CE）", "stage": 2, "type": "shoot", "tier": 20, "motion_s": 8.0, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W2-08", "name": "居合ブレード（MT・ミラージュブレイド由来）", "stage": 2, "type": "melee", "tier": 22, "motion_s": 4.0, "pellets": 1, "splash": 0, "slot": "weapon"},
  {"id": "W2-07", "name": "バリア発生器（CE・GUARDIAN DA 由来）", "stage": 2, "type": "barrier", "tier": 16, "motion_s": 4.0, "pellets": 1, "splash": 150, "slot": "support"},
  {"id": "WB2-03", "name": "ガーディアン大ドーム（CE）", "stage": 2, "type": "barrier", "tier": 24, "motion_s": 8.0, "pellets": 1, "splash": 180, "slot": "support"},
  {"id": "W2-04", "name": "ワケアリの補修アーム（WK）", "stage": 2, "type": "repair", "tier": 10, "motion_s": 5.0, "pellets": 1, "splash": 0, "special": ["hold_target"], "slot": "support"},
  {"id": "WR2-03", "name": "重整備アーム（WK）", "stage": 2, "type": "repair", "tier": 20, "motion_s": 8.0, "pellets": 1, "splash": 100, "special": ["hold_target"], "slot": "support"},
  {"id": "WB2-01", "name": "腕付き小型バリア（CE）", "stage": 2, "type": "barrier", "tier": 12, "motion_s": 0.6, "pellets": 1, "splash": 0, "special": ["front_only"], "slot": "support"},
  {"id": "WB2-02", "name": "ガーディアン小盾（CE）", "stage": 2, "type": "barrier", "tier": 20, "motion_s": 0.6, "pellets": 1, "splash": 0, "slot": "support"},
  {"id": "WR2-01", "name": "スポット溶接ガン（FW）", "stage": 2, "type": "repair", "tier": 10, "motion_s": 0.6, "pellets": 1, "splash": 0, "slot": "support"},
  {"id": "WR2-02", "name": "高速溶接ノズル（WK）", "stage": 2, "type": "repair", "tier": 16, "motion_s": 0.5, "pellets": 1, "splash": 0, "slot": "support"},
  {"id": "W3-01", "name": "ガトリング腕", "stage": 3, "type": "shoot", "tier": 15, "motion_s": 0.1, "pellets": 1, "splash": 0, "special": ["suppress"], "slot": "weapon", "bonus_group": "alien_fast"},
  {"id": "W3-02", "name": "両手火炎放射器", "stage": 3, "type": "shoot", "tier": 16, "motion_s": 0.2, "pellets": 1, "splash": 40, "special": ["burn_regen_stop"], "slot": "weapon", "bonus_group": "alien_fast"},
  {"id": "W3-06", "name": "粘着地雷", "stage": 3, "type": "trap", "tier": 17, "motion_s": 4.0, "pellets": 1, "splash": 40, "special": ["root"], "slot": "carry"},
  {"id": "W3-05", "name": "回転のこ顎", "stage": 3, "type": "melee", "tier": 19, "motion_s": 0.15, "pellets": 1, "splash": 0, "special": ["interrupt"], "slot": "weapon", "bonus_group": "alien_fast"},
  {"id": "W3-03", "name": "杭打ち角", "stage": 3, "type": "melee", "tier": 20, "motion_s": 5.0, "pellets": 1, "splash": 0, "special": ["pierce_armor"], "slot": "weapon"},
  {"id": "W3-07", "name": "誘導針ミサイル", "stage": 3, "type": "shoot", "tier": 20, "motion_s": 2.0, "pellets": 3, "splash": 0, "special": ["track"], "slot": "weapon"},
  {"id": "W3-09", "name": "超音波妨害皿", "stage": 3, "type": "jam", "tier": 20, "motion_s": 3.0, "pellets": 1, "splash": 220, "special": ["jam", "debuff"], "slot": "weapon"},
  {"id": "W3-04", "name": "触手長砲", "stage": 3, "type": "cannon", "tier": 22, "motion_s": 8.0, "pellets": 1, "splash": 80, "special": ["indirect"], "slot": "weapon"},
  {"id": "W3-11", "name": "お腹の対空砲", "stage": 3, "type": "shoot", "tier": 22, "motion_s": 0.2, "pellets": 1, "splash": 0, "special": ["antiair"], "slot": "weapon", "bonus_group": "alien_fast"},
  {"id": "W3-12", "name": "鼻先魚雷管", "stage": 3, "type": "shoot", "tier": 24, "motion_s": 4.0, "pellets": 1, "splash": 30, "slot": "weapon"},
  {"id": "W3-13", "name": "衝撃波ハサミ", "stage": 3, "type": "shoot", "tier": 25, "motion_s": 2.5, "pellets": 1, "splash": 0, "special": ["armor_down"], "slot": "weapon"},
  {"id": "W3-10", "name": "背負い艦砲", "stage": 3, "type": "cannon", "tier": 30, "motion_s": 12.0, "pellets": 1, "splash": 90, "special": ["line_pierce"], "slot": "weapon"},
  {"id": "W3-14", "name": "巻殻プラズマ砲", "stage": 3, "type": "cannon", "tier": 35, "motion_s": 10.0, "pellets": 1, "splash": 60, "special": ["charge"], "slot": "weapon"},
  {"id": "W3-15", "name": "透明スコープ光線銃", "stage": 3, "type": "shoot", "tier": 38, "motion_s": 8.0, "pellets": 1, "splash": 0, "special": ["stealth_keep"], "slot": "weapon"},
  {"id": "W3-17", "name": "シャコ拳", "stage": 3, "type": "melee", "tier": 40, "motion_s": 6.0, "pellets": 1, "splash": 40, "special": ["knockback"], "slot": "weapon"},
  {"id": "W3-16", "name": "双レール尾砲", "stage": 3, "type": "cannon", "tier": 42, "motion_s": 12.0, "pellets": 1, "splash": 0, "special": ["vs_large"], "slot": "weapon"},
  {"id": "WB3-03", "name": "傘膜ドーム", "stage": 3, "type": "barrier", "tier": 34, "motion_s": 8.0, "pellets": 1, "splash": 180, "special": ["reach_air"], "slot": "support"},
  {"id": "WB3-04", "name": "群体球膜", "stage": 3, "type": "barrier", "tier": 44, "motion_s": 10.0, "pellets": 1, "splash": 200, "slot": "support"},
  {"id": "WR3-03", "name": "繭の修復槽", "stage": 3, "type": "repair", "tier": 30, "motion_s": 10.0, "pellets": 1, "splash": 120, "special": ["hold_target"], "slot": "support"},
  {"id": "WR3-04", "name": "群体修復触手", "stage": 3, "type": "repair", "tier": 40, "motion_s": 10.0, "pellets": 1, "splash": 160, "special": ["hold_target"], "slot": "support"},
  {"id": "WB3-01", "name": "甲殻小盾", "stage": 3, "type": "barrier", "tier": 30, "motion_s": 0.8, "pellets": 1, "splash": 0, "special": ["front_only"], "slot": "support"},
  {"id": "WB3-02", "name": "はさみ盾", "stage": 3, "type": "barrier", "tier": 44, "motion_s": 0.6, "pellets": 1, "splash": 0, "slot": "support"},
  {"id": "W3-08", "name": "注射修理針", "stage": 3, "type": "repair", "tier": 22, "motion_s": 0.8, "pellets": 1, "splash": 0, "special": ["heal_in_combat"], "slot": "support"},
  {"id": "WR3-01", "name": "注射修理針・群", "stage": 3, "type": "repair", "tier": 32, "motion_s": 0.7, "pellets": 1, "splash": 0, "special": ["heal_in_combat"], "slot": "support"},
  {"id": "WR3-02", "name": "光液ニードル", "stage": 3, "type": "repair", "tier": 44, "motion_s": 0.6, "pellets": 1, "splash": 0, "special": ["heal_in_combat"], "slot": "support"},
  {"id": "W4-01", "name": "鉄塊メイス", "stage": 4, "type": "melee", "tier": 30, "motion_s": 8.0, "pellets": 1, "splash": 120, "slot": "weapon"},
  {"id": "W4-03", "name": "多連装ミサイル群", "stage": 4, "type": "shoot", "tier": 35, "motion_s": 6.0, "pellets": 24, "splash": 50, "special": ["track"], "slot": "weapon"},
  {"id": "W4-02", "name": "巨大パイルバンカー", "stage": 4, "type": "melee", "tier": 45, "motion_s": 12.0, "pellets": 1, "splash": 60, "special": ["pierce_armor"], "slot": "weapon"},
  {"id": "W4-04", "name": "主砲「大口径光砲」", "stage": 4, "type": "cannon", "tier": 50, "motion_s": 15.0, "pellets": 1, "splash": 80, "special": ["line_pierce"], "slot": "weapon"},
  {"id": "WB4-01", "name": "鉄壁の盾壁", "stage": 4, "type": "barrier", "tier": 50, "motion_s": 12.0, "pellets": 1, "splash": 260, "special": ["front_only"], "slot": "support"},
  {"id": "WR4-01", "name": "自己修復炉", "stage": 4, "type": "repair", "tier": 50, "motion_s": 12.0, "pellets": 1, "splash": 0, "special": ["self_only"], "slot": "support"}
];
export const weaponById = id => WEAPONS.find(w => w.id === id) || null;

// ユニットの種類 → 持っている武器（仮。キャラ別の装備が入ったら置きかえる）。人間は撃たない
export const KIND_WEAPON = Object.freeze({
  gunner: 'W1-02',  // AK型小銃
  heavy: 'W1-06',   // 使い捨てロケット砲
  scav: 'W1-07',    // 鉄パイプ・バール（殴る）
  ponco: 'W2-01',   // PONCO の制式ライフル
  alien: 'W3-03',   // 杭打ち角
  giant: 'W2-03',   // アイアンフィストの砲身
  ...ALT_KIND_WEAPON, // flyer・amph（js/sim/alt-units.js）
  ...NEW_ENEMY_WEAPON, // 新しい敵（js/sim/new-enemies.js。表にある武器の id を借りる）
});
export const weaponOfKind = kind => weaponById(KIND_WEAPON[kind]);

// 強さ（素の DPS）。weapons/weapons.js と同じ式: 格の基本値 × モーション^1.75 ÷ モーション × 底上げ。比べるためだけに使う【仮】
export const TIER_BASE = t => t <= 0 ? 7 : 10 * Math.pow(1.08, t - 1);
const DAMAGE_BONUS = { alien_fast: 1.3 };
export const weaponPower = w => TIER_BASE(w.tier) * Math.pow(w.motion_s, 0.75) * ((w.bonus_group && DAMAGE_BONUS[w.bonus_group]) || 1);
