import {soldierEquipmentValue,observeEquipment,standardEquipmentCost,RESERVE_ARMAMENT_COUNT} from './armament-rules.js?v=119';
import {TIERS,MAX_EQUIPMENT_TIER,MAX_POWER_RANK,POWER_RANK_STEP,GENERATION_COUNT,TRADE_MAX_TIER,powerRank,tierDescription} from './equipment-tiers.js?v=119';
import {fieldAdaptiveScaling} from './field-scaling.js?v=119';
import {activeSquad,inCurrentInstance} from './instance-rules.js?v=119';
import {recordBattleLog,resetBattleLog} from './battle-log.js?v=119';
import {rollDropExclusive,applyDropExclusive,dropExclusiveLabel} from './drop-exclusives.js?v=119';
import {latestEquipmentTier,recordMerchantEquipment,ensureMerchantCatalog,refreshWaveCatalogs,markMerchantPurchase} from './merchant-catalog.js?v=119';
import {initializeMedicalPosts,updateMedicalPosts,serializeMedicalPosts,nearestKnownMedicalPost,drawMedicalPost,drawMedicalMap,drawMedicalMarker,drawTownMedicalReception,drawRescueDirection} from './medical-posts.js?v=119';
import {invasionMethods,initializeInvasions,serializeInvasions,shouldTriggerRandomRaid,makeEnemyRoom,drawInvasionRoute} from './invasion-rules.js?v=119';
import {gateMethods,serializeGatePosts,replenishTownGateGuards,initializeGateGuards,ensureTownGuards,serializeGateGuards,updateGateGuards,gateGuardVisible,applyFortifications,drawFortification,exitGateTown,townExitReached,wallBlocksAttack} from './gate-rules.js?v=119';
import {nationMethods,normalizeNation,nationalIncome,headquartersDamageMult,drawNationalDevelopment} from './nation-rules.js?v=119';
/**
 * ゲーム3: IRON SQUAD (アイアン・スクワッド: 雑兵立身出世録)
 * ローグライク・アクションRPG
 * 
 * [新リアリズム仕様]
 *  - 主人公は最初ただの雑兵！部隊は主人公に付いてこず、独自の判断で自律進軍・迎撃する！
 *  - 部隊と一緒に動かないと極めて危険（孤立死リスク＆部隊壊滅リスク）！
 *  - ソロで遠くの宝箱を漁りに行くのも自由だが、部隊がモンスターに囲まれて全滅することも…
 *  - 生き延びて「伍長」以上に立身出世して初めて【号令・指揮権】がアンロックされる！
 *  - 名もなき兵士たちは生き残ると二つ名と名前が授与され、やがて主人公の頼もしい戦友に。
 */
import { sound } from '../../audio.js?v=119';
import { storage } from '../../storage.js';
import { drawFieldSoldier, drawFieldMob, drawFieldCommander, drawFieldBoss, drawRemains, contactShadow } from './visuals.js?v=119';
import { drawMeleeRangeCue, meleeDrawReach, attackAnimationRate } from './weapon-motion.js?v=119';
import {emptyRescueBonuses,normalizeRescueBonuses,rescueBonusSummary} from './rescue-rewards.js?v=119';
import {drawFieldCivilian} from './civilian-visuals.js?v=119';
import { saveSlots } from './save-slots.js';
import { soldierDialogue } from './soldier-dialogue.js?v=119';
import {MAGIC_CLASSES,MAGIC_AFFINITIES,magicMethods,isMage,isMagicUser,ensureMana,initializeMagic,updateMagic,distributeMagicStones,castMedicBuff,updateMageAI,drawMagicBursts,spendMana} from './magic-rules.js?v=119';
import {hazardMethods,updateHazards,drawHazards} from './hazard-fields.js?v=119';
import {strongEnemyReward} from './combat-rewards.js?v=119';
import {supplyMethods, initializeSupplies, updateSupplies, takeRangedShot, ammoCombatProfile, isRangedUnit, distributeAmmo, preventLethalHit, normalizeFieldSave, SQUAD_POTION_COST, ensureAmmo, RANGED_DAMAGE_MULT, supplyLocation} from './supply-rules.js?v=119';
import { configureInterface, compactSoldierCard, refreshInterface, setSubDialog } from './interface.js?v=119';
import { ensureSoldierAppearance, drawSoldierPortrait, describeSoldierAppearance } from './soldier-appearance.js?v=119';
import { attachSurfaceEvents, detachSurfaceEvents, frameSurfaceReady, releaseSceneCaches, releaseCanvas, surfaceCanResume } from './canvas-surface.js?v=119';
import { WORLD_SIZE, WORLD_VERSION, WorldTerrain, biomeAt, routeNameAt, eastWestRoadY, northSouthRoadX, riverCenterY, drawFieldDepth } from './world.js?v=119';
import { FogGrid, FOG_REVEAL_RADIUS, FOG_CAMP_REVEAL } from './fog.js?v=119';
import {
  classTierOf, nextClassId, classUpCostForNext, canAffordClassUp, formatClassUpCostJa, classUpShortageJa,
  playerClassTier, nextPlayerStage, playerStageById, CLASS_TIER_LABELS, PLAYER_CLASS_STAGES
} from './class-up-rules.js';
import { PHASE_DURATION, REST_DURATION, SOLDIER_SALARY, MIN_REINFORCEMENTS, emptyActivity, advancePhase, advanceRest, recordCombat, recordHealing, healByMedic, participated, finishExperience } from './phase-rules.js';
import {HEALING_HP_PER_EXP,REVIVAL_EXP_PER_MAX_HP} from './experience-rules.js';
import {
  emptyFiscalLedger, calcTreasuryGrossIncome, calcCommanderStipend, calcBuyoutGold,
  shouldAbsorbToSharedBox, calcScoutCost, estimateSoldierScoutValue, calcDismissSettlement,
  formatFiscalReportJa, formatFiscalReportHtml, distributeSharedBoxToSoldiers, sellWeakSurplusFromBox,
  SHARED_BOX_MAX_TIER, SCOUT_COST_BY_TALENT, defaultDonateAmount, donatePresetAmounts
} from './economy-rules.js?v=119';

import { EQUIPMENT_TYPES, saleValue, equippedIds, canSell, lowValueIds, chooseLootTier, distanceScaling, shrineUpgradeCap, compareEquipment, equipmentScore, compareEquipmentStrength, rollWeaponTraits, weaponCombatProfile, evaluateMeleeSweetSpot, isGodRollProtected, zoneRingPower, zoneRingLabelJa } from './equipment-rules.js?v=119';
import {
  WEAPON_STYLES, WEAPON_STYLE_LABELS, WEAPON_STYLE_ICONS,
  MELEE_STYLES, RANGED_STYLES, HIT_GROWTH_SOFT_CAP,
  emptyMastery, normalizeMastery, isRangedStyle, isMeleeStyle,
  hitGrowthMult, applyHitGrowth, masteryAtkMult, masteryPctDisplay,
  masteryReloadMult, masterySplashMult, applyMasteryToCombatProfile,
  gainWeaponMastery, masteryGainForStyle, pickFavoriteWeapon, rollWeaponStyle,
  weaponStyleOf, favoriteWeaponBias, MASTERY_GAIN_PER_HIT,
  migrateFavoriteForClass, migrateWeaponStyleFromName
} from './growth-rules.js?v=119';

import {
  initMerchants, ensureMerchants, updateMerchants, drawMerchantBody, drawMerchantEscort,
  nearestLivingMerchant, refreshMerchantStock, merchantBuyPrice, merchantSellTier,
  applyMerchantSave, serializeMerchants, MERCHANT_INTERACT_R,
  merchantHealingStatus, merchantHealWavesLeft, useMerchantHealing, MERCHANT_HEAL_COST, recalcEscortStats, finishEscortPhase
} from './merchant-rules.js?v=119';

import { daylightAt, advanceWorldClock, periodEnemy, enemyAvailable, PERIOD_ENEMIES } from './day-night.js';

import { RESCUE_TIMEOUT, rescueUnits, carryingCapacity, carriedSoldiers, carriedCivilians, carriedCount, carrierOf, transportSpeedFactor, releaseWounded, sanitizeCarriers, updateWounded, receiveTownCargo, leaveCivilianSpace, handleTransportAI, syncDragged, treatWounded, orbDropChance, hasActiveRopePull, playerHasActiveRopePull, ensureCiviliansSpawned, buildMedicRescueAssign, markSoldierDown, CIV_KINDS, isMedic, spendMedicStamina, medicHasStamina, MEDIC_HEAL_COST, MEDIC_AURA_COST } from './casualty-rules.js?v=119';
import { DUNGEON_DEFS, drawDungeonEntrance, drawDungeonEnvironment, drawDungeonVault } from './dungeon.js?v=119';
import {
  EXPEDITION_CHECK_INTERVAL, EXPEDITION_RETURN_HOME, EXPEDITION_ENGAGE_R,
  EXPEDITION_DANGER_TIERS, EXPEDITION_MIN_MEMBERS,
  getDangerTier, expeditionMembers, expeditionCombatReady, shouldAutoReturn, pickExpeditionTarget,
  canStartExpedition, startExpeditionState, beginReturnState, clearExpeditionState,
  isPlatoonAway, persistPlatoonMissions, restorePlatoonMissions, missionStatusJa,
  computeExpeditionReturnRewards, isInferiorSurvivor, applyInferiorExpeditionGrit,
  INFERIOR_EXPEDITION_EXTRA_XP, INFERIOR_DEATHLINE_LUCK,
  expeditionHazardTakenMult, expeditionEngageRadius, isSoldierOnExpedition
} from './expedition-rules.js';

import { viewport, circleInView, strokeVisibleRing, persistentUnit } from './render-support.js';

export const DEPLOYMENT_CAPACITY=48; // was 50/72 — 本隊 soft cap for iPhone (v1.24.2)
export const PERSONAL_GUARD_MAX=12; // 直属小隊 ceiling (ranks ≤12; rope-tow default stays 2)
export const ENEMY_LIMIT=40; // was 48/60/72 — aggressive soft load (v1.24.1)
export const ENEMY_SPAWN_INTERVAL=.85; // was .72/.55 — fewer spawn spikes (v1.24.1)
/** Field mid-bosses (ZONE_CHAOS dragons): rarer, capped, stronger. Excludes colossal/raid/dungeon. */
export const FIELD_BOSS_CAP=2;
/** Perf (v1.24.2): army48, personal12, AI cheapen (retarget/spatial, main/pg throttle, boids far-skip). */
export const PARTICLE_CAP=48; // was 80/110 (v1.24.1)
export const DAMAGE_TEXT_CAP=16; // was 28/36 (v1.24.1)
export const SPATIAL_CELL=420;
export const MINIMAP_INTERVAL_MS=220; // was 150/100 (v1.24.1)
export const STATS_UI_INTERVAL_MS=450; // was 320/250 (v1.24.1)
export const GUARD_ASSIGN_INTERVAL=0.5;
export const FIELD_BOSS_CHANCE=0.08; // was 0.25
export const FIELD_BOSS_HP_MULT=2.5; // raw 280 → 700
export const FIELD_BOSS_ATK_MULT=2.0; // raw 28 → 56
/** Colossal world bosses: slower respawn, stronger. Max 1 (unchanged). */
export const COLOSSAL_FIRST_SPAWN=60; // was 12
export const COLOSSAL_RESPAWN=210; // was 75
// Colossal HP/ATK baked into COLOSSAL_BOSS_DEFS (×1.75 HP / ×1.6 ATK vs v1.23.1)
/** Base-camp raid (本陣強襲): v1.23.3 — 本隊ほぼ壊滅・精鋭のみ辛うじて生存。プレイヤー帰還は倒せる範囲。 */
/** Perf patch v1.24.7: 異質/神鍛 never auto-sell / never 国庫共有 deposit; SW v69. */
/** v1.25.0: donate-scale / 国家運営・部隊管理 hub / civilian rope rescue / medic triage; SW v70. */
/** v1.25.7: platoon expedition -> nation hub / main-army pick / danger tier (live map) / return rewards + inferior bonus; SW v77. */
/** v1.25.8: fog never full-black / multi-stage class-up / zone ring x10 softcap 1e6 / 魔王城~10M fixedStats; SW v78. */
/** v1.25.11: fog player-cell fail-safe + viewport reseed + camp→player _lastX fix / module ?v=81; SW v81. */
/** v2.0.0: unified ammunition, squad potion, hero lethal-hit guard and independent checkpoints; SW v101. */
/** v1.27.11: field merchants(inn+camp)+escort loot / mastery gain mult by weapon / raid withdraw+rarer; SW v95. */
/** v1.27.10: town/inn entry only captain+personal guard; main platoons keep field doctrine; SW v94. */
/** v1.27.9: manual 本隊→自部隊 pull + full-squad swap confirm; auto-guard no longer overwrites; SW v93. */
/** v1.27.8: HQ downs mortal (slow bleed, no farm) + medic stamina soft-cap; SW v92. */
/** v1.27.7: HQ rescue-bonus once-per-down latch (no farm loop) + base raids from phase 4; SW v91. */
/** v1.27.6: rescue XP/gold attribution to acting unit (not always captain); SW v90. */
/** v1.27.4: melee swing sweet spots (sword wide / spear tip / hammer mid; ranged fixed); SW v88. */
/** v1.26.0: command UI hierarchy / compact roster / bag filters / nested dialog focus / New Game and awakening UI fixes; SW v82. */
/** v1.25.5: スカウト候補5枠 / 天才再募集確認 / 天才出現率低下(0.25%); SW v75. */
/** v1.25.4: 作戦期切替待機 10s→8s / UI「休息」→「次のラウンド開始まで」; SW v74. */
/** v1.25.3: 手動攻撃ボタンが atkCooldown を共有（連打で攻撃速度無視バグ修正）; SW v73. */
/** v1.25.2: 剣/槍/鎚マスタリー=ATK+攻撃速度（弓と同じCD短縮カーブ）; SW v72. */
/** v1.25.1: 本陣救援ワープ≠地図FT / 槍突き可視化 / 弓石弓熟練=ATK+リロード・火砲=爆発+リロード / 強撃武器別; SW v71. */
export const RAID_SCALE_DIST=28000; // chaos-tier scale (was 4500)
export const RAID_HP_MULT=2.85; // was 2.4 (v1.23.2) / 0.85 (old)
export const RAID_ATK_MULT=1.95; // was 1.25 — melt 本隊 fodder; elites scrape through
export const RAID_GRUNT_DEF=72;
export const RAID_GRUNT_DMG_RED=33;
export const RAID_BOSS_DEF=108;
export const RAID_BOSS_DMG_RED=42;
/** v1.27.11: raids rarer after unlock — gap between raid phases + later mid-phase trigger. */
export const RAID_MIN_PHASE=8;
export const RAID_PHASE_GAP=8;
export const RAID_TRIGGER_REMAIN_FRAC=0.28;

const MAP_WIDTH = WORLD_SIZE;
const MAP_HEIGHT = WORLD_SIZE;
const BASE_CAMP = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: 150 };

// フィールド危険度ゾーン定義（本陣からの距離に応じて敵の強さ・種類・ドロップが劇的にスケールアップ！）
export const FIELD_ZONES = [
  {
    id: 'ZONE_PEACE',
    name: '本陣防衛圏 (近郊平原)',
    shortName: '本陣防衛圏',
    icon: '🛡️',
    minDist: 0,
    maxDist: 8000,
    reqDef: 0,
    dangerLevel: 1,
    dangerStars: '★☆☆☆☆',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.08)',
    monsters: ['slime', 'goblin'],
    hpMult: 1.0,
    atkMult: 1.0,
    speedMult: 0.90,
    expMult: 1.0,
    goldMult: 1.0,
    tierRange: [1, 8],
    desc: '安全な近郊平原。スライムや小鬼が徘徊。新兵の訓練と本隊の防衛拠点'
  },
  {
    id: 'ZONE_WILD',
    name: '警戒辺境 (昏き森林)',
    shortName: '警戒辺境',
    icon: '🌲',
    minDist: 8000,
    maxDist: 22000,
    reqDef: 45,
    dangerLevel: 2,
    dangerStars: '★★☆☆☆',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    monsters: ['goblin', 'orc', 'wolf'],
    hpMult: 6.0,
    atkMult: 6.0,
    speedMult: 1.05,
    expMult: 2.8,
    goldMult: 2.5,
    tierRange: [1, 16],
    desc: '安全圏を出ると敵倍率がx10（リング1）。推奨DEF 45+'
  },
  {
    id: 'ZONE_CHAOS',
    name: '魔境深部 (死霊荒野)',
    shortName: '魔境深部',
    icon: '💀',
    minDist: 22000,
    maxDist: 48000,
    reqDef: 140,
    dangerLevel: 3,
    dangerStars: '★★★☆☆',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.08)',
    monsters: ['orc', 'wyvern'],
    hpMult: 35.0,
    atkMult: 32.0,
    speedMult: 1.15,
    expMult: 7.5,
    goldMult: 6.0,
    tierRange: [5, 20],
    desc: 'リング2：敵倍率x100。凶暴な魔獣地帯。推奨DEF 140+'
  },
  {
    id: 'ZONE_ABYSS',
    name: '最果て (巨獣の巣窟・極限死地)',
    shortName: '最果ての死地',
    icon: '👑',
    minDist: 48000,
    maxDist: 90000,
    reqDef: 320,
    dangerLevel: 4,
    dangerStars: '★★★★★',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    monsters: ['wyvern', 'colossal_dragon', 'behemoth_king', 'colossal_titan'],
    hpMult: 180.0,
    atkMult: 160.0,
    speedMult: 1.25,
    expMult: 16.0,
    goldMult: 13.0,
    tierRange: [9, 28],
    desc: 'リング3+：敵倍率x1000〜最大約100万倍（外縁ソフトキャップ）。推奨DEF 320+'
  }
];

export function getFieldZone(x, y) {
  const dist = Math.hypot(x - BASE_CAMP.x, y - BASE_CAMP.y);
  for (let i = FIELD_ZONES.length - 1; i >= 0; i--) {
    if (dist >= FIELD_ZONES[i].minDist) {
      return FIELD_ZONES[i];
    }
  }
  return FIELD_ZONES[0];
}

// どでかい大ボス（COLOSSAL BOSS）定義（通常モンスターの4倍サイズ・専用スキル・確定至宝ドロップ）
export const COLOSSAL_BOSS_DEFS = {
  colossal_dragon: {
    id: 'colossal_dragon',
    name: '超巨大古竜エンシェントドラゴン',
    title: '【原初の滅竜】',
    icon: '🐉🔥',
    color: '#ef4444',
    radius: 56,
    baseHp: 101500,
    baseAtk: 2000,
    speed: 46,
    skillCooldown: 4.5,
    skillName: '超火炎ブレス',
    desc: '画面を覆い尽くす巨躯を誇る伝説の古竜！扇状広角に灼熱の業火弾を連続放射！'
  },
  behemoth_king: {
    id: 'behemoth_king',
    name: '巨獣王ベヒーモスキング',
    title: '【大地を揺るがす暴君】',
    icon: '🦏⚡',
    color: '#f59e0b',
    radius: 62,
    baseHp: 119000,
    baseAtk: 2320,
    speed: 42,
    skillCooldown: 5.0,
    skillName: '大地粉砕（アースクエイク）',
    desc: '巨大な四本角と無敵の毛皮装甲を持つ超巨獣！全方位衝撃波と激しい地響きで周囲を粉砕！'
  },
  colossal_titan: {
    id: 'colossal_titan',
    name: '古代巨神コロッサスタイタン',
    title: '【神話の破壊巨兵】',
    icon: '🗿✨',
    color: '#06b6d4',
    radius: 58,
    baseHp: 131250,
    baseAtk: 2208,
    speed: 38,
    skillCooldown: 4.8,
    skillName: '神話殲滅光線',
    desc: '古代遺跡の守護神。発光する全身コアから全方位へ神聖レーザーを撃ち放つ！'
  }
};


// 階級データ (雑兵から始まり、出世で直属小隊を率いる指揮権が解禁される！)
export const RANKS = [
  { level: 1, title: '二等雑兵', reqExp: 0, canCommand: false, personalGuards: 0, maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 0, bonusAtk: 0, desc: '指揮権なし。本隊は大軍(約70名)で勝手に行動。ソロで自由に戦え！' },
  { level: 2, title: '一等兵', reqExp: 1800, canCommand: false, personalGuards: 1, maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 45, bonusAtk: 10, desc: '死線を潜った古参。戦友1名が直属随伴。本隊は大軍で作戦行動。' },
  { level: 3, title: '伍長 (班長昇進)', reqExp: 5500, canCommand: true, personalGuards: 3, commandType: 'WHISTLE', maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 120, bonusAtk: 25, desc: '【直属小隊(3名)】を率いる！本隊(約68名)は防衛行動。呼集笛解禁。' },
  { level: 4, title: '軍曹 (小隊長代理)', reqExp: 13000, canCommand: true, personalGuards: 5, commandType: 'RALLY', maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 250, bonusAtk: 55, desc: '【直属小隊(5名)】を指揮！本隊と連携。突撃号令解禁。' },
  { level: 5, title: '百人隊長 (部隊司令)', reqExp: 26000, canCommand: true, personalGuards: 7, commandType: 'FULL', maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 480, bonusAtk: 100, desc: '【直属精鋭小隊(7名)】を率いる！本隊は大部隊(約64名)で本陣警戒。' },
  { level: 6, title: '千人将', reqExp: 46000, canCommand: true, personalGuards: 8, commandType: 'FULL', maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 800, bonusAtk: 160, desc: '【直属親衛小隊(8名)】を率いる大隊指揮官。' },
  { level: 7, title: '近衛騎士団長', reqExp: 72000, canCommand: true, personalGuards: 9, commandType: 'FULL', maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 1300, bonusAtk: 250, desc: '【近衛直属小隊(9名)】を率いる王国近衛騎士団長。' },
  { level: 8, title: '軍団総司令官', reqExp: 105000, canCommand: true, personalGuards: 10, commandType: 'FULL', maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 2000, bonusAtk: 380, desc: '【最高司令直属小隊(10名)】を率いる全軍の最高司令官。' },
  { level: 9, title: '救国の英雄神将', reqExp: 150000, canCommand: true, personalGuards: 12, commandType: 'FULL', maxSquad: DEPLOYMENT_CAPACITY, bonusHp: 3200, bonusAtk: 600, desc: '【英雄直属神聖小隊(12名)】を率いる伝説の神将。100戦錬磨の覇者！' }
];

const TITLES = ['不屈の', '疾風の', '鉄壁の', '歴戦の', '鬼神の', '紅蓮の', '隻眼の', '魔刃の', '金剛の', '閃光の'];
const NAMES = ['ボブ', 'ガッツ', 'ルーク', 'ジーク', 'レオ', 'ジャック', 'トール', 'ハンス', 'マルコ', 'オットー', 'クルト', 'フィン', 'クラーク', 'エリック', 'ロイ', 'アル', 'レオン', 'ギル', 'セドリック', 'バルト', 'オスカー', 'アラン', 'ブルーノ', 'ダン'];

// 新兵の才能定義（確率で決まる生まれつきの素質・大半は凡庸、稀に天才が紛れ込む！）
export const TALENTS = {
  INFERIOR: {
    id: 'INFERIOR',
    name: 'へっぽこ',
    icon: '🍂',
    color: '#a8a29e',
    hpMult: 0.85,
    atkMult: 0.88,
    speedBonus: -6,
    expMult: 0.85,
    tag: '🍂へっぽこ',
    desc: '足手まといの劣等生。だが生き延びれば大化けのロマンも…？'
  },
  AVERAGE: {
    id: 'AVERAGE',
    name: '凡庸',
    icon: '👤',
    color: '#94a3b8',
    hpMult: 1.0,
    atkMult: 1.0,
    speedBonus: 0,
    expMult: 1.0,
    tag: '凡庸',
    desc: '標準的な新兵。大半の新兵(約65%)はここから始まる。'
  },
  TALENTED: {
    id: 'TALENTED',
    name: '有望株',
    icon: '✨',
    color: '#38bdf8',
    hpMult: 1.20,
    atkMult: 1.22,
    speedBonus: 8,
    expMult: 1.25,
    critBonus: 8,
    tag: '✨有望',
    desc: '筋の良い有望な新兵。全能力が高めで成長が早い。'
  },
  ELITE: {
    id: 'ELITE',
    name: '英才',
    icon: '🔮',
    color: '#c084fc',
    hpMult: 1.40,
    atkMult: 1.42,
    speedBonus: 16,
    expMult: 1.5,
    critBonus: 18,
    tag: '🔮英才',
    desc: '一騎当千の素質を秘めた英才。圧倒的な戦闘力。'
  },
  GENIUS: {
    id: 'GENIUS',
    name: '稀代の天才',
    icon: '🌟',
    color: '#fbbf24',
    hpMult: 1.70,
    atkMult: 1.75,
    speedBonus: 28,
    expMult: 2.0,
    critBonus: 30,
    dodgeBonus: 20,
    tag: '🌟天才',
    desc: '万人に一人の神童！異次元の素質と回避・攻撃センスを誇る！'
  }
};

// 死線覚醒スキル定義 (激戦・部隊高死亡率を生き延びた兵士が覚醒獲得する固有特性・完全パーセンテージ設計で終盤まで永続スケール！)
export const DEATHLINE_SKILLS = {
  SURVIVAL_INSTINCT: {
    id: 'SURVIVAL_INSTINCT',
    name: '不屈の生存本能',
    icon: '❤️‍🔥',
    color: '#f87171',
    desc: 'ピンチを生き抜いた本能：最大HP +35%, 被ダメージ-15% (HP35%以下で被ダメ半減＆速+30%)',
    hpMultBonus: 0.35,
    dmgReduction: 15
  },
  BLOOD_RAGE: {
    id: 'BLOOD_RAGE',
    name: '修羅の闘志',
    icon: '🔥',
    color: '#ef4444',
    desc: '戦友の屍を越えて宿った怒り：ATK +40%, クリティカル率 +20%',
    atkMultBonus: 0.40,
    bonusCrit: 20
  },
  IRON_RESOLVE: {
    id: 'IRON_RESOLVE',
    name: '鋼鉄の不退転',
    icon: '🛡️',
    color: '#38bdf8',
    desc: '死地で鍛え上げられた鉄壁：DEF +50%, 最大HP +45%, ブロック率 +20%',
    hpMultBonus: 0.45,
    defMultBonus: 0.50,
    bonusBlock: 20
  },
  PHANTOM_STEP: {
    id: 'PHANTOM_STEP',
    name: '疾風の残影',
    icon: '⚡',
    color: '#fbbf24',
    desc: '死線を潜り抜けた神速：移動速度 +30%, 攻撃速度 +25%, 完全回避率 +15%',
    speedMultBonus: 0.30,
    atkSpeedBonus: 25,
    dodgeBonus: 15
  },
  DEADLY_FOCUS: {
    id: 'DEADLY_FOCUS',
    name: '極限の狙撃眼',
    icon: '🎯',
    color: '#34d399',
    desc: '生死の狭間で研ぎ澄まされた集中：ATK +35%, 射程 +30%, クリティカル率 +25%',
    atkMultBonus: 0.35,
    rangeMultBonus: 0.30,
    bonusCrit: 25
  },
  MIRACLE_PRAYER: {
    id: 'MIRACLE_PRAYER',
    name: '奇跡の祈祷',
    icon: '✨',
    color: '#10b981',
    desc: '死の淵から仲間を呼び戻す祈り：回復力 +60%, 救助速度 2.5倍',
    healMultBonus: 0.60,
    rescueSpeedMult: 2.5
  },
  VETERAN_GRIT: {
    id: 'VETERAN_GRIT',
    name: '死生の悟り',
    icon: '💀',
    color: '#e2e8f0',
    desc: '死すら恐れぬ不滅の覚悟：HP・ATK・DEF +25%, 毎秒最大HPの2%自然治癒',
    allStatsMultBonus: 0.25,
    regenPct: 2
  }
};

// 防具スロット定義
export const SLOT_INFO = {
  WEAPON: { key: 'weapon', name: '武器', icon: '🗡️' },
  SHIELD: { key: 'shield', name: '盾', icon: '🛡️' },
  HELMET: { key: 'helmet', name: '兜', icon: '🪖' },
  ARMOR:  { key: 'armor',  name: '鎧', icon: '🥋' },
  GLOVES: { key: 'gloves', name: '手', icon: '🧤' },
  LEGS:   { key: 'legs',   name: '脚', icon: '🥾' },
  AMULET: { key: 'amulet', name: '装飾', icon: '📿' }
};

export const MEDIC_SELF_DEFENSE_COST = 10, MEDIC_SELF_DEFENSE_MIN_MANA = 40;
// v2.7クラスバランス: 武器ATK二重加算の解消(約-35〜50%)の補填＋非魔導兵の底上げ。兵士の通常攻撃（旧/新武器の両経路）にのみ掛かる
export const SOLDIER_PHYS_DMG_MULT = 2.2;
export const SOLDIER_SPEAR_DMG_MULT = 1.15, SOLDIER_HAMMER_DMG_MULT = 1.35;
// 兵種（クラス）定義
export const SOLDIER_CLASSES = {
  ...MAGIC_CLASSES,
  HEAVY: {
    id: 'HEAVY',
    classTier: 0,
    name: '重装歩兵',
    icon: '🛡️',
    color: '#38bdf8',
    range: 38,
    speed: 78,
    atkCooldown: 0.95,
    bonusHp: 120,
    bonusDef: 60,
    advancedClassId: 'PALADIN',
    desc: '大盾と重甲冑で前線を支える鉄壁のタンク'
  },
  LIGHT: {
    id: 'LIGHT',
    classTier: 0,
    name: '軽装遊撃兵',
    icon: '🗡️',
    color: '#f59e0b',
    range: 44,
    speed: 130,
    atkCooldown: 0.52,
    bonusCrit: 25,
    bonusAtk: 4,
    advancedClassId: 'BLADEMASTER',
    desc: '俊敏な身のこなしで敵陣側面を強襲'
  },
  ARCHER: {
    id: 'ARCHER',
    classTier: 0,
    name: '弓兵',
    icon: '🏹',
    color: '#34d399',
    range: 250,
    speed: 102,
    atkCooldown: 1.15,
    bonusAtk: 3,
    advancedClassId: 'SNIPER',
    desc: '後方から矢を放ち安全に援護射撃'
  },
  MEDIC: {
    id: 'MEDIC',
    classTier: 0,
    name: '衛生術師',
    icon: '🌿',
    color: '#10b981',
    range: 160,
    speed: 98,
    atkCooldown: 1.25,
    bonusHp: 35,
    advancedClassId: 'HIGH_PRIEST',
    desc: '魔力で遠隔回復・蘇生。自然回復は遅く、拠点・魔法石で補給。昇格すると攻撃・守護のバフを使用'
  },

  // ===== 🔱 上位職（ADVANCED CLASSES - 世界が変わる覚醒強化・パーセンテージ乗算倍率！） =====
  PALADIN: {
    id: 'PALADIN',
    classTier: 1,
    baseClassId: 'HEAVY',
    isAdvanced: true,
    advancedClassId: 'TEMPLAR',
    name: '聖騎士',
    icon: '👑🛡️',
    color: '#38bdf8',
    glowColor: '#67e8f9',
    range: 48,
    speed: 92,
    atkCooldown: 0.82,
    bonusHp: 240,
    bonusDef: 60,
    bonusAtk: 24,
    hpMultBonus: 0.55,   // 最大HP +55% (乗算スケール)
    defMultBonus: 0.65,  // 防御力 +65% (乗算スケール)
    atkMultBonus: 0.30,  // 攻撃力 +30% (乗算スケール)
    tag: '👑聖騎士',
    desc: '世界が変わる守護神！HP+55%, DEF+65%, 聖なる衝撃波で敵群ノックバック、周囲味方の被ダメージ-30%'
  },
  BLADEMASTER: {
    id: 'BLADEMASTER',
    classTier: 1,
    baseClassId: 'LIGHT',
    isAdvanced: true,
    advancedClassId: 'SWORD_EMPEROR',
    name: '剣聖',
    icon: '⚔️⚡',
    color: '#f59e0b',
    glowColor: '#fbbf24',
    range: 54,
    speed: 155,
    atkCooldown: 0.35,
    bonusCrit: 45,
    bonusAtk: 38,
    bonusHp: 130,
    atkMultBonus: 0.55,  // 攻撃力 +55% (乗算スケール)
    hpMultBonus: 0.30,   // 最大HP +30% (乗算スケール)
    speedMultBonus: 0.30,// 移動速度 +30%
    tag: '⚔️剣聖',
    desc: '世界が変わる神速連撃！ATK+55%, 速度+30%, 疾風真空刃を飛ばし遠敵を一刀両断、攻撃を25%残影完全回避'
  },
  SNIPER: {
    id: 'SNIPER',
    classTier: 1,
    baseClassId: 'ARCHER',
    isAdvanced: true,
    advancedClassId: 'STORM_BOW',
    name: '神射手',
    icon: '🎯💫',
    color: '#10b981',
    glowColor: '#34d399',
    range: 360,
    speed: 115,
    atkCooldown: 1.0,
    bonusAtk: 46,
    bonusCrit: 40,
    bonusHp: 120,
    atkMultBonus: 0.60,  // 攻撃力 +60% (乗算スケール)
    hpMultBonus: 0.25,   // 最大HP +25% (乗算スケール)
    rangeMultBonus: 0.40,// 射程 +40%
    tag: '🎯神射手',
    desc: '世界が変わる超絶射程！ATK+60%, 射程360px, 3条の天星魔導光矢を一斉マルチ斉射し大群を爆砕'
  },
  HIGH_PRIEST: {
    id: 'HIGH_PRIEST',
    classTier: 1,
    baseClassId: 'MEDIC',
    isAdvanced: true,
    advancedClassId: 'SAINT',
    name: '大司教',
    icon: '🕊️💖',
    color: '#ec4899',
    glowColor: '#f472b6',
    range: 220,
    speed: 110,
    atkCooldown: 1.05,
    bonusHp: 160,
    bonusDef: 26,
    healMultBonus: 0.85, // 治癒力 +85% (乗算スケール)
    hpMultBonus: 0.45,   // 最大HP +45% (乗算スケール)
    defMultBonus: 0.50,  // 防御力 +50% (乗算スケール)
    tag: '🕊️大司教',
    desc: '世界が変わる奇跡の使徒！治癒力+85%, HP+45%, DEF+50%, 味方全体リジェネ結界＆倒れた仲間を超速即座に蘇生'
  },

  // ===== 極職 (MASTER / Tier2) =====
  TEMPLAR: {
    id: 'TEMPLAR', classTier: 2, baseClassId: 'HEAVY', isAdvanced: true, isMaster: true,
    advancedClassId: 'IMMORTAL_AEGIS',
    name: '神殿騎士', icon: '🏛️🛡️', color: '#38bdf8', glowColor: '#a5f3fc',
    range: 52, speed: 98, atkCooldown: 0.75,
    bonusHp: 420, bonusDef: 95, bonusAtk: 48,
    hpMultBonus: 0.90, defMultBonus: 1.05, atkMultBonus: 0.55,
    tag: '⚜️神殿騎士',
    desc: '極職タンク！HP+90% DEF+105%。聖域の盾で味方守護を強化'
  },
  SWORD_EMPEROR: {
    id: 'SWORD_EMPEROR', classTier: 2, baseClassId: 'LIGHT', isAdvanced: true, isMaster: true,
    advancedClassId: 'VOID_EDGE',
    name: '剣帝', icon: '🗡️👑', color: '#f59e0b', glowColor: '#fde68a',
    range: 58, speed: 170, atkCooldown: 0.28,
    bonusCrit: 55, bonusAtk: 72, bonusHp: 220,
    atkMultBonus: 0.95, hpMultBonus: 0.50, speedMultBonus: 0.45,
    tag: '⚜️剣帝',
    desc: '極職遊撃！ATK+95% 速度+45%。帝剣の連撃で戦線を切り裂く'
  },
  STORM_BOW: {
    id: 'STORM_BOW', classTier: 2, baseClassId: 'ARCHER', isAdvanced: true, isMaster: true,
    advancedClassId: 'STAR_HUNTER',
    name: '嵐弓士', icon: '🌪️🏹', color: '#10b981', glowColor: '#6ee7b7',
    range: 400, speed: 125, atkCooldown: 0.88,
    bonusAtk: 80, bonusCrit: 50, bonusHp: 200,
    atkMultBonus: 1.00, hpMultBonus: 0.40, rangeMultBonus: 0.55,
    tag: '⚜️嵐弓士',
    desc: '極職射手！ATK+100% 射程拡大。嵐矢の斉射で縦深を制圧'
  },
  SAINT: {
    id: 'SAINT', classTier: 2, baseClassId: 'MEDIC', isAdvanced: true, isMaster: true,
    advancedClassId: 'ARCHANGEL',
    name: '聖女', icon: '✨🕊️', color: '#ec4899', glowColor: '#f9a8d4',
    range: 250, speed: 118, atkCooldown: 0.95,
    bonusHp: 280, bonusDef: 48,
    healMultBonus: 1.25, hpMultBonus: 0.70, defMultBonus: 0.75,
    tag: '⚜️聖女',
    desc: '極職支援！治癒+125%。聖域リジェネと高速蘇生'
  },

  // ===== 伝説職 (LEGEND / Tier3) — 神話宝玉が必要 =====
  IMMORTAL_AEGIS: {
    id: 'IMMORTAL_AEGIS', classTier: 3, baseClassId: 'HEAVY', isAdvanced: true, isMaster: true, isLegendary: true,
    name: '不滅の守護', icon: '🌌🛡️', color: '#67e8f9', glowColor: '#ecfeff',
    range: 56, speed: 105, atkCooldown: 0.70,
    bonusHp: 720, bonusDef: 150, bonusAtk: 80,
    hpMultBonus: 1.45, defMultBonus: 1.60, atkMultBonus: 0.85,
    tag: '🌌不滅守護',
    desc: '伝説タンク！HP+145% DEF+160%。不滅の壁が戦場を支える'
  },
  VOID_EDGE: {
    id: 'VOID_EDGE', classTier: 3, baseClassId: 'LIGHT', isAdvanced: true, isMaster: true, isLegendary: true,
    name: '虚空剣', icon: '🌌⚔️', color: '#fbbf24', glowColor: '#fffbeb',
    range: 62, speed: 185, atkCooldown: 0.22,
    bonusCrit: 70, bonusAtk: 120, bonusHp: 360,
    atkMultBonus: 1.50, hpMultBonus: 0.80, speedMultBonus: 0.65,
    tag: '🌌虚空剣',
    desc: '伝説遊撃！ATK+150%。虚空の一閃で敵将を斬る'
  },
  STAR_HUNTER: {
    id: 'STAR_HUNTER', classTier: 3, baseClassId: 'ARCHER', isAdvanced: true, isMaster: true, isLegendary: true,
    name: '星狩人', icon: '🌌🎯', color: '#34d399', glowColor: '#d1fae5',
    range: 460, speed: 135, atkCooldown: 0.78,
    bonusAtk: 130, bonusCrit: 65, bonusHp: 320,
    atkMultBonus: 1.55, hpMultBonus: 0.65, rangeMultBonus: 0.75,
    tag: '🌌星狩人',
    desc: '伝説射手！ATK+155%。星屑の斉射が最果てを貫く'
  },
  ARCHANGEL: {
    id: 'ARCHANGEL', classTier: 3, baseClassId: 'MEDIC', isAdvanced: true, isMaster: true, isLegendary: true,
    name: '大天使', icon: '🌌👼', color: '#f472b6', glowColor: '#fce7f3',
    range: 280, speed: 128, atkCooldown: 0.85,
    bonusHp: 420, bonusDef: 72,
    healMultBonus: 1.80, hpMultBonus: 1.10, defMultBonus: 1.10,
    tag: '🌌大天使',
    desc: '伝説支援！治癒+180%。大天使の光で部隊を蘇らせる'
  }

};

// 隊長（主人公）の上位職
export const PLAYER_ADVANCED_CLASS = {
  id: 'WARLORD',
  name: '覇王ウォーロード',
  icon: '👑🔥',
  color: '#f59e0b',
  bonusHp: 280,
  bonusAtk: 50,
  bonusDef: 36,
  hpMultBonus: 0.45,   // 最大HP +45% (乗算スケール)
  atkMultBonus: 0.50,  // 攻撃力 +50% (乗算スケール)
  defMultBonus: 0.55,  // 防御力 +55% (乗算スケール)
  squadAtkBonus: 0.25, // 率いる部隊全員ATK+25%オーラ
  desc: '戦場を支配する軍神！HP+45%, ATK+50%, DEF+55%乗算、全方位覇気スラッシュ＆部隊全員ATK+25%'
};

// 素材・ティア制ドロップ生成


/** 同一ティア同一武器種でも個体差が出るよう、生成時に確定する倍率・異質タグを振る。再装備では再抽選しない。 */
export function rollItemQuality(item, random = Math.random) {
  if (!item) return item;
  if (item.rollMult != null && Number.isFinite(Number(item.rollMult))) return item;

  const tier = Math.max(1, Math.min(MAX_EQUIPMENT_TIER, item.tier || 1));
  const cur = TIERS.find(t => t.tier === tier) || TIERS[0];
  const next = TIERS.find(t => t.tier === Math.min(MAX_EQUIPMENT_TIER, tier + 1)) || cur;
  const skip2 = TIERS.find(t => t.tier === Math.min(MAX_EQUIPMENT_TIER, tier + 2)) || next;
  const nextRatio = next.mult / cur.mult;
  const skip2Ratio = skip2.mult / cur.mult;
  const r = Math.min(0.999999999, Math.max(0, random()));

  // 神鍛 ~0.3% / 異質 ~0.7%（合計~1%）/ 通常は ±12% 程度の個体差
  if (r < 0.003) {
    if (tier >= MAX_EQUIPMENT_TIER) {
      item.rollMult = Math.round((1.55 + random() * 0.45) * 1000) / 1000;
    } else {
      const lo = nextRatio * 1.12;
      const hi = skip2Ratio * 1.08;
      item.rollMult = Math.round((lo + random() * Math.max(0.01, hi - lo)) * 1000) / 1000;
    }
    item.forgeTag = '神鍛';
    item.powerSkip = 2;
    item.isGodRoll = true;
  } else if (r < 0.01) {
    if (tier >= MAX_EQUIPMENT_TIER) {
      item.rollMult = Math.round((1.25 + random() * 0.25) * 1000) / 1000;
    } else {
      item.rollMult = Math.round(nextRatio * (0.92 + random() * 0.26) * 1000) / 1000;
    }
    item.forgeTag = '異質';
    item.powerSkip = 1;
    item.isGodRoll = true;
  } else {
    const band=r<.18?{label:'粗悪',lo:.65,span:.2}:r<.78?{label:'標準',lo:.88,span:.24}:r<.95?{label:'良品',lo:1.12,span:.18}:{label:'極上',lo:1.3,span:.25};
    item.qualityLabel=band.label;
    item.rollMult = Math.round((band.lo + random() * band.span) * 1000) / 1000;
    item.forgeTag = null;
    item.powerSkip = 0;
    item.isGodRoll = false;
  }

  if (item.forgeTag) {
    const bare = String(item.baseName || item.name || '').replace(/【(?:異質|神鍛)】/g, '').replace(/\+\d+$/, '');
    item.baseName = `${bare}【${item.forgeTag}】`;
    item.name = item.upgrade > 0 ? `${item.baseName}+${item.upgrade}` : item.baseName;
    item.color = item.forgeTag === '神鍛' ? '#ffd700' : '#e879f9';
  }
  return item;
}

export function applyUpgradeStats(item, upgradeLevel) {
  item.upgrade = upgradeLevel;
  if (!item.baseName) item.baseName = item.name.replace(/\+\d+$/, '');
  // 異質/神鍛サフィックスを baseName に保持
  item.name = item.upgrade > 0 ? `${item.baseName}+${item.upgrade}` : item.baseName;
  const chosenTier = TIERS.find(t => t.tier === item.tier) || TIERS[0];
  const plusMult = 1 + item.upgrade * 0.25;
  const rank=chosenTier.powerRank;
  const baseValue = 10 + rank * 5;
  const rm = (item.rollMult != null && Number.isFinite(Number(item.rollMult))) ? Number(item.rollMult) : 1;
  // ぶっ飛び個体は付帯効果判定だけ上位ティア相当（ドロップ・ティア自体は変えない＝T7 vault制限維持）
  const effTier = Math.min(MAX_POWER_RANK, powerRank(chosenTier.tier) + (item.powerSkip || 0)*POWER_RANK_STEP);
  item.stats = item.stats || {};

  if (item.type === 'WEAPON') {
    const style = item.weaponStyle || 'sword';
    const profile = weaponCombatProfile(item);
    // 攻速低下分を攻撃力で補填。鎚/クロスボウ/火砲は実ヒット頻度低下前提で厚め。
    item.stats.atk = Math.floor(baseValue * chosenTier.mult * plusMult * (profile.atkMult || 1) * rm);
    // 攻速は武器種の個性として固定（個体倍率は攻撃力側に載せる）
    if (style === 'spear') {
      item.stats.atkSpeed = Math.floor(-18 - rank * 2);
      item.pierce = true;
    } else if (style === 'hammer') {
      item.stats.atkSpeed = Math.floor(-24 - rank * 3);
      delete item.pierce;
    } else if (style === 'bow') {
      item.stats.atkSpeed = Math.floor(4 + rank);
      delete item.pierce;
    } else if (style === 'crossbow') {
      item.stats.atkSpeed = Math.floor(-20 - rank * 2);
      delete item.pierce;
    } else if (style === 'cannon') {
      item.stats.atkSpeed = Math.floor(-32 - rank * 3);
      delete item.pierce;
    } else {
      delete item.stats.atkSpeed;
      delete item.pierce;
    }
    if (effTier >= 4) item.stats.crit = Math.min(80, Math.floor(effTier * 10 * Math.min(1.35, Math.max(0.85, rm))));
    else delete item.stats.crit;
    if (effTier >= 6) item.stats.lightning = true;
    else delete item.stats.lightning;
  } else if (item.type === 'SHIELD') {
    item.stats.def = Math.floor(baseValue * 1.5 * chosenTier.mult * plusMult * rm);
    item.stats.hp = Math.floor(baseValue * 1.5 * Math.pow(rank, 1.3) * plusMult * rm);
    item.stats.blockChance = Math.floor(Math.min(45, 15 + effTier * 5));
  } else if (item.type === 'HELMET') {
    item.stats.def = Math.floor(baseValue * 1.1 * chosenTier.mult * plusMult * rm);
    item.stats.hp = Math.floor(baseValue * 2.0 * Math.pow(rank, 1.3) * plusMult * rm);
  } else if (item.type === 'ARMOR') {
    item.stats.def = Math.floor(baseValue * 2.2 * chosenTier.mult * plusMult * rm);
    item.stats.hp = Math.floor(baseValue * 3.0 * Math.pow(rank, 1.3) * plusMult * rm);
    if (effTier >= 5) item.stats.regen = Math.floor(effTier * 2 * Math.min(1.4, Math.max(0.85, rm)));
    else delete item.stats.regen;
  } else if (item.type === 'GLOVES') {
    item.stats.def = Math.floor(baseValue * 0.8 * chosenTier.mult * plusMult * rm);
    item.stats.atk = Math.floor(baseValue * 0.5 * chosenTier.mult * plusMult * rm);
    item.stats.atkSpeed = Math.floor((5 + rank * 3 + item.upgrade) * rm);
  } else if (item.type === 'LEGS') {
    item.stats.def = Math.floor(baseValue * 0.9 * chosenTier.mult * plusMult * rm);
    item.stats.speed = Math.floor((6 + rank * 3 + item.upgrade * 2) * rm);
  } else if (item.type === 'AMULET') {
    item.stats.speed = Math.floor((8 + rank * 2 + item.upgrade) * rm);
    item.stats.atkSpeed = Math.floor((10 + rank * 5 + item.upgrade * 2) * rm);
    if (effTier >= 5) item.stats.vampire = 0.2;
    else delete item.stats.vampire;
  }
  if(item.type==='WEAPON'&&item.weaponTraits)item.stats.crit=(item.stats.crit||0)+Math.max(0,Math.min(8,item.weaponTraits.crit||0));
  applyDropExclusive(item);
}

// 装備ビジュアル解析ヘルパー（武器・防具・装身具の見た目を解析）
export function getEquipVisual(item, defaultTier = 1, defaultColor = null) {
  if (!item) {
    const tDef = TIERS.find(t => t.tier === defaultTier) || TIERS[0];
    return {
      tier: defaultTier,
      color: defaultColor || tDef.color,
      mat: tDef.mat,
      upgrade: 0,
      isGod: false,
      hasItem: false
    };
  }
  return {
    tier: item.tier || defaultTier,
    color: item.color || '#64748b',
    mat: item.mat || '',
    upgrade: item.upgrade || 0,
    isGod: powerRank(item.tier) >= 6 || (item.upgrade || 0) >= 5 || !!item.isGodRoll,
    forgeTag: item.forgeTag || null,
    hasItem: true
  };
}

export function generateRandomDrop(distance, kind = 'normal', options = {}) {
  const random=options.random||Math.random;
  const forcedTier=Number.isFinite(options.tier)?Math.max(1,Math.min(MAX_EQUIPMENT_TIER,Math.floor(options.tier))):null;
  const chosenTier = TIERS[(forcedTier||chooseLootTier(distance, kind))-1];

  // 兜、鎧、脚、手、盾、武器、装飾
  const types = EQUIPMENT_TYPES;
  const type = types.includes(options.type)?options.type:types[Math.floor(random() * types.length)];

  let rawName = '';
  let weaponStyle = 'sword';
  if (type === 'WEAPON') {
    // 近接70%（剣/槍/鎚）+ 遠隔30%（弓/クロスボウ/火砲）。隊長は職制限なしで全種装備可。
    weaponStyle = rollWeaponStyle('any',random);
    if (weaponStyle === 'spear') rawName = chosenTier.spear || '木の槍';
    else if (weaponStyle === 'hammer') rawName = chosenTier.hammer || '木の戦鎚';
    else if (weaponStyle === 'bow') rawName = chosenTier.bow || '木の短弓';
    else if (weaponStyle === 'crossbow') rawName = chosenTier.crossbow || '木の石弓';
    else if (weaponStyle === 'cannon') rawName = chosenTier.cannon || '木造の手砲';
    else rawName = chosenTier.weapon;
  }
  else if (type === 'SHIELD') rawName = chosenTier.shield;
  else if (type === 'HELMET') rawName = chosenTier.helmet;
  else if (type === 'ARMOR') rawName = chosenTier.armor;
  else if (type === 'GLOVES') rawName = chosenTier.gloves;
  else if (type === 'LEGS') rawName = chosenTier.legs;
  else rawName = chosenTier.amulet;

  const plusVal = options.upgrade ?? (random() < 0.28 ? (random() < 0.35 ? 2 : 1) : 0);
  const item = {
    id: options.id || random().toString(36).substring(2, 9),
    name: rawName,
    baseName: rawName,
    upgrade: 0,
    type,
    weaponStyle: type === 'WEAPON' ? weaponStyle : undefined,
    tier: chosenTier.tier,
    mat: chosenTier.mat,
    color: chosenTier.color,
    stats: {},
    isGod: chosenTier.powerRank >= 6,
    rollMult: null,
    forgeTag: null,
    powerSkip: 0,
    isGodRoll: false
  };
  rollWeaponTraits(item,random);
  if(!options.merchant)rollDropExclusive(item,kind,random);
  if(Number.isFinite(options.quality)){item.rollMult=options.quality;item.qualityLabel=options.merchant?'商人厳選':'品質指定';}
  else rollItemQuality(item,random);
  applyUpgradeStats(item, plusVal);
  return item;
}


export const OUTPOST_DEFS = {
  FORT: {
    type: 'FORT',
    name: '黒鬼の前線砦',
    icon: '🏴',
    color: '#ef4444',
    maxHp: 340,
    radius: 36,
    x: 280,
    y: 280,
    desc: '大量ゴールド＆確定高ティア宝箱！'
  },
  CAGE: {
    type: 'CAGE',
    name: '捕虜収容所',
    icon: '⛓️',
    color: '#f59e0b',
    maxHp: 190,
    radius: 28,
    x: 1520,
    y: 1520,
    desc: '囚われた友軍2名が即座に自軍へ加入！'
  },
  SHRINE: {
    type: 'SHRINE',
    name: '古代鍛冶の祭壇',
    icon: '🏛️',
    color: '#38bdf8',
    maxHp: 240,
    radius: 32,
    x: 1520,
    y: 280,
    desc: '装備を+1強化。無料強化上限は本陣からの距離で変化'
  },
  SUPPLY: {
    type: 'SUPPLY',
    name: '補給物資集積所',
    icon: '📦',
    color: '#34d399',
    maxHp: 160,
    radius: 30,
    x: 280,
    y: 1520,
    desc: '全員HP全快＆兵士に臨時給与支給！'
  }
};

export const QUEST_TEMPLATES = [
  {
    type: 'FORT',
    title: '🏴【強襲制圧】敵の前線砦を破壊せよ！',
    targetType: 'FORT',
    desc: '北西の砦を攻略し、オーク前哨部隊を叩け',
    rewardGold: 110,
    rewardExp: 40
  },
  {
    type: 'CAGE',
    title: '⛓️【友軍奪還】囚われた友軍を救出せよ！',
    targetType: 'CAGE',
    desc: '南東の牢獄を解放し、友軍兵士を救出せよ',
    rewardGold: 80,
    rewardExp: 35
  },
  {
    type: 'SHRINE',
    title: '🏛️【神託調査】古代鍛冶の祭壇を確保せよ！',
    targetType: 'SHRINE',
    desc: '北東の古代祭壇を制圧し、神聖鍛冶の祝福を受けよ',
    rewardGold: 90,
    rewardExp: 36
  },
  {
    type: 'SUPPLY',
    title: '📦【兵站奪還】強奪された物資を回収せよ！',
    targetType: 'SUPPLY',
    desc: '南西の補給庫を制圧し、部隊の物資を奪還せよ',
    rewardGold: 95,
    rewardExp: 32
  },
  {
    type: 'MASSACRE',
    title: '⚔️【掃討作戦】敵軍勢を35体以上撃滅せよ！',
    targetType: null,
    targetKills: 35,
    desc: '迫り来る敵兵を掃討し、前線を押し上げよ',
    rewardGold: 75,
    rewardExp: 30
  }
];

export const IronSquadGame = {
  ...gateMethods,
  ...invasionMethods,
  ...nationMethods,
  ...supplyMethods,
  ...magicMethods,
  ...hazardMethods,
  id: 'iron-squad',
  title: 'IRON SQUAD',
  subtitle: '雑兵立身出世録',
  icon: '🛡️',
  color: '#ffaa00',
  description: '自律行動する部隊と共に生き残れ！部隊と離れると危険だがソロ冒険も自由。伍長・隊長へ出世して初めて指揮権を掴み取れ。',

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.highWave = storage.get('ironsquad_max_wave', 1);
    this.gold = 50;
    this.formation = 'GUARD';
    this.camera = { x: BASE_CAMP.x, y: BASE_CAMP.y };
    this.commandActiveUntil = 0; // 号令の有効期限
    this.zoom = 1.0;
    this.zoomLevels = [1.0, 1.25, 1.5, 0.75];
    this.zoomIndex = 0;
    this.player = null;
    this.squad = [];
    this.activeSlotId = null;
    this.selectedSaleIds=new Set();this.soldierSlotSelections={};
    this.saveMenu = null;
    this.worldMapModal = null;
    this.autoSaveClock = 0;
    this._surfaceLost = false; this._renderProblem = null;
    this.inBattle = false;
    this.setupUI();
    this.setupGame();
    sound.setListener(()=>this.player);sound.startBGM();

    this.showSaveMenu();
  },

  setupUI() {
    this.container.innerHTML = `
      <div class="game-wrapper iron-squad">
        <header class="game-header">
          <button id="btn-back" class="icon-btn" title="工房へ戻る">🏠</button>
          <div class="game-stats" style="flex: 1; justify-content: space-around;">
            <div class="stat-box">
              <span class="stat-label">階級</span>
              <span id="player-rank" class="stat-value" style="color: #e1cf9d;">二等雑兵</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">HP</span>
              <span id="player-hp" class="stat-value" style="color: #34d399;">130/130</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">作戦期</span>
              <span id="current-wave" class="stat-value" style="color: #d7d3c4;">第1期</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">作戦残時</span>
              <span id="phase-timer-display" class="stat-value" style="color: #e4d2a4; font-family: monospace;">02:00</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">小隊 / 本隊</span>
              <span id="squad-alive" class="stat-value" style="color: #d7d3c4;">0 / 48</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">軍資金</span>
              <span id="current-gold" class="stat-value" style="color: #e1cf9d;">50G</span>
                  <span class="stat-label" style="margin-left:6px;">国庫</span>
                  <span id="current-treasury" class="stat-value" style="color: #67e8f9;">200G</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">秘宝</span>
              <span id="current-orbs" class="stat-value" style="color: #e4d2a4;">💎0</span>
            </div>
          </div>
          <button id="btn-strategy" class="icon-btn" title="戦略会議・本陣">⛺</button>
        </header>

        <div class="canvas-container" id="canvas-container">
          <canvas id="game-canvas"></canvas>

          <!-- 現在地危険度ゾーン表示（画面左上上部） -->
          <div id="field-zone-badge" class="proximity-badge" style="top: 10px; left: 10px;">
            🛡️ 本陣防衛圏 (★☆☆☆☆)
          </div>

          <div id="day-night-badge" class="proximity-badge" aria-label="時間帯と時刻">☀ 昼 06:00</div>

          <!-- 部隊距離インジケーター（画面左上2段目） -->
          <div id="squad-proximity-badge" class="proximity-badge proximity-close" style="top: 38px; left: 10px;">
            🟢 部隊と共闘中 (安全)
          </div>

          <!-- 作戦期完了・シームレス戦略会議案内バナー（画面中央上部） -->
          <div id="phase-complete-banner" class="phase-banner hidden" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 25; background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(2, 132, 199, 0.95)); border: 1px solid #fbbf24; box-shadow: 0 4px 16px rgba(0,0,0,0.6); color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.3s ease;">
            <span id="phase-banner-text">🚨 作戦期完了！新兵補充＆死線覚醒！</span>
            <button id="btn-banner-strat" style="background: #fbbf24; color: #000; border: none; padding: 2px 8px; border-radius: 8px; font-weight: bold; font-size: 10px; cursor: pointer;">⛺ 会議</button>
          </div>

          <!-- ダンジョン接近・突入案内バナー (画面中央上部) -->
          <div id="dungeon-prompt-banner" class="phase-banner hidden" style="position: absolute; top: 48px; left: 50%; transform: translateX(-50%); z-index: 26; background: rgba(36, 32, 26, 0.94); border: 1px solid #8a8170; box-shadow: none; color: #e1cf9d; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            <span id="dungeon-banner-text">入口が近い</span>
            <button id="btn-enter-dungeon" style="background: #d7c4a2; color: #1c1610; border: none; padding: 3px 10px; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">入る</button>
          </div>


          <!-- 行商人・交易バナー -->
          <div id="merchant-prompt-banner" class="phase-banner hidden" style="position: absolute; top: 48px; left: 50%; transform: translateX(-50%); z-index: 26; background: rgba(36, 28, 18, 0.95); border: 1px solid #d7b56a; color: #fde68a; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            <span id="merchant-banner-text">🏪 行商人</span>
            <button id="btn-open-merchant" style="background: #d7b56a; color: #1c1610; border: none; padding: 3px 10px; border-radius: 8px; font-weight: bold; font-size: 11px; cursor: pointer;">品定め</button>
          </div>
          <!-- 本陣強襲・防衛救援バナー (画面中央上部) -->
          <div id="base-raid-banner" class="phase-banner hidden" style="position: absolute; top: 86px; left: 50%; transform: translateX(-50%); z-index: 27; background: linear-gradient(135deg, rgba(220, 38, 38, 0.96), rgba(153, 27, 27, 0.96)); border: 1px solid #f87171; box-shadow: 0 4px 18px rgba(220, 38, 38, 0.6); color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
            <span id="base-raid-banner-text">🚨【本陣強襲！】魔境の強敵が本拠地へ殺到中！</span>
            <button id="btn-raid-warp" style="background: #fbbf24; color: #000; border: none; padding: 3px 10px; border-radius: 10px; font-weight: bold; font-size: 11px; cursor: pointer;">本陣救援ワープ 🌀</button>
          </div>

          <!-- 軍令（作戦目標HUD・画面左上・タップで開閉） -->
          <div id="quest-banner" class="quest-banner" title="タップで詳細を開閉">
            <div class="quest-banner-header">
              <span class="quest-badge">📜 司令部軍令</span>
              <span id="quest-status" class="quest-status">遂行中</span>
            </div>
            <div id="quest-title" class="quest-title">⚔️ 作戦待機中</div>
            <div id="quest-desc" class="quest-desc">戦況を確認せよ</div>
          </div>

          <!-- 拠点治癒インジケータ -->
          <div id="base-heal-badge" class="base-badge hidden">💚 砦本陣で部隊治癒中</div>

          <!-- 下部戦闘・通知ログウィンドウ (視界を塞がないテロップエリア) -->
          <div id="battle-log-window" class="battle-log-window">
            <div id="battle-log-stream" class="battle-log-stream"></div>
          </div>
          <div id="drop-banner" class="drop-banner hidden" style="display:none !important;"></div>

          <!-- 画面下部 バーチャルゲームパッド -->
          <div id="virtual-gamepad" class="virtual-gamepad">
            <div class="pad-stick-zone">
              <div id="dpad-base" class="dpad-base">
                <div id="dpad-knob" class="dpad-knob"></div>
              </div>
            </div>
            <div class="pad-buttons-column">
              <!-- 搬送・救助ステータス（コントローラ右ボタン上部） -->
              <div id="transport-badge" class="transport-badge hidden">
                <span id="transport-status"></span>
                <button id="btn-release-wounded" type="button">紐を外す</button>
              </div>
              <div class="pad-buttons-zone">
                <button type="button" id="btn-pad-potion" class="pad-btn pad-btn-potion" aria-label="隊長と直属兵のHP・弾薬・魔力を回復">回復薬 1</button>
                <button id="btn-pad-command" class="pad-btn pad-btn-command hidden" title="号令">
                  <span class="pad-btn-icon">📢</span>
                  <span class="pad-btn-label">呼集</span>
                </button>
                <button id="btn-pad-power" class="pad-btn pad-btn-power ready" title="渾身強撃 (パワーアタック)">
                  <span class="pad-btn-icon">💥</span>
                  <span class="pad-btn-label">強撃</span>
                  <div id="pad-power-cd-overlay" class="pad-cd-overlay hidden">
                    <span id="pad-power-cd-text" class="pad-cd-text">0.0</span>
                  </div>
                </button>
                <button id="btn-pad-attack" class="pad-btn pad-btn-attack" title="攻撃（自動と同CD）">
                  <span class="pad-btn-icon">🗡️</span>
                  <span class="pad-btn-label">攻撃</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ミニマップレーダー -->
          <div class="minimap-container">
            <canvas id="minimap-canvas" width="70" height="70"></canvas>
          </div>
          <!-- カメラ倍率切替ボタン -->
          <button id="btn-zoom-toggle" class="zoom-toggle-btn" title="カメラ倍率切替">🔍 1.0x</button>
          <button id="btn-world-map" class="world-map-toggle" title="全体地図を開く">地図</button>

          <!-- 戦略タイム（宿営地）モーダル -->
          <div id="strategy-modal" class="game-overlay hidden">
            <div class="overlay-content" style="max-width: 380px; max-height: 88vh; overflow-y: auto; text-align: left; padding: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 id="strat-title" style="color: #ffaa00; font-size: 18px; margin: 0;">⛺ 本陣戦略会議</h3>
                <span style="font-size: 11px; color: #ffe600;">💰<strong id="strat-gold">50</strong>G | 🏛<strong id="strat-treasury" style="color:#67e8f9;">200</strong>G | 💎秘宝: <strong id="strat-orbs" style="color:#fbbf24;">0</strong>個</span>
              </div>
              <p id="strat-report" style="font-size: 12px; color: #b0bacd; margin-bottom: 12px;"></p>

              <!-- 野戦治療 -->
              <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--surface-border); border-radius: 10px; padding: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 12px; font-weight: bold; color: #34d399;">🏥 隊長のおごり治療 (未完治兵士を全快)</div>
                  <div style="font-size: 10px; color: #889;">各自の自費治療で足りない負傷を一括手当て</div>
                </div>
                <button id="btn-heal-all" class="mini-btn" style="background:#10b981; color:#fff;">おごる (25G)</button>
              </div>

              <!-- 隊長武勲（撃墜数ボーナス）ボックス -->
              <div id="player-record-box" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 7px 10px; margin-bottom: 10px; font-size: 11px;"></div>

              <!-- タブ切り替え -->
              <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                <button id="tab-strat-nation" class="sub-tab-btn">🏛 国家運営</button>
                <button id="tab-strat-troops" class="sub-tab-btn active">⚔ 部隊管理</button>
                <button id="tab-strat-squad" class="sub-tab-btn hidden">👥 部隊名簿＆サイフ</button>
                <button id="tab-strat-equip" class="sub-tab-btn hidden">🎒 装備＆鍛冶屋</button>
              </div>

              <!-- 部隊名簿 ＆ 叙勲タブ -->
              <div id="view-strat-squad">
                <div id="reinforcement-summary" class="reinforcement-summary"></div>
                <details id="reserve-roster" class="reserve-roster"><summary id="reserve-roster-title">本陣の予備兵</summary><div id="reserve-roster-list"></div></details>
                <!-- 💰 自部隊投資 / 国庫寄付 ・ スカウト（全軍一括支給は廃止） -->
                <div id="economy-manage-bar" class="economy-manage-bar">
                  <div class="economy-tab-row">
                    <button type="button" id="tab-econ-roster" class="roster-filter-btn active" data-econ="roster">名簿</button>
                    <button type="button" id="tab-econ-scout" class="roster-filter-btn" data-econ="scout">🔍 スカウト</button>
                    <button type="button" id="tab-econ-equip" class="roster-filter-btn" data-econ="equip">🎒 装備</button>
                    <button type="button" id="tab-econ-invest" class="roster-filter-btn hidden" data-econ="invest">🏛 国庫</button>
                    <button type="button" id="tab-econ-box" class="roster-filter-btn hidden" data-econ="box">📦 共有箱</button>
                  </div>
                  <div id="view-econ-invest" class="hidden" style="background:rgba(2,132,199,0.12);border:1px solid rgba(14,116,144,0.45);border-radius:6px;padding:8px;margin-bottom:8px;font-size:11px;">
                    <div style="color:#67e8f9;font-weight:bold;margin-bottom:4px;">🏛 国庫寄付（所持軍資金に応じた推奨額）</div>
                    <div style="color:#94a3b8;margin-bottom:6px;line-height:1.4;">寄付の75%は国庫・開発に残し、25%を全国兵士へ均等配分。既定額は所持金の約1割（最低100G）。クイック指定も所持金に合わせて変わります。</div>
                    <div id="donate-quick-presets" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;"></div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                      <span style="color:#fde047;">額:</span>
                      <select id="select-global-fund-amount" class="mini-select" style="background:#0f172a;color:#fde047;border:1px solid #0284c7;border-radius:4px;padding:2px 6px;font-weight:bold;font-size:11px;">
                        <option value="100">100 G</option>
                        <option value="max">所持全額</option>
                      </select>
                      <button id="btn-donate-treasury" class="mini-btn" style="background:linear-gradient(135deg,#0e7490,#06b6d4);color:#fff;font-size:10px;font-weight:bold;padding:4px 8px;border:none;border-radius:4px;">🏛 国家へ寄付</button>
                    </div>
                    <div id="treasury-status-line" style="margin-top:6px;color:#a5f3fc;">国庫残高: —</div>
                  </div>
                  <div id="view-econ-scout" class="hidden" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);border-radius:6px;padding:8px;margin-bottom:8px;font-size:11px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                      <span style="color:#fbbf24;font-weight:bold;">🔍 スカウト / 放逐</span>
                      <button id="btn-refresh-scouts" class="mini-btn" style="background:#92400e;color:#fff;font-size:10px;padding:3px 8px;border:none;border-radius:4px;cursor:pointer;flex-shrink:0;">🔄 候補を再募集 (無料)</button>
                    </div>
                    <div style="color:#94a3b8;margin-bottom:6px;">本隊・自部隊ともに雇用可。強い候補ほど高額。名簿の各兵士から放逐できます。</div>
                    <div id="scout-candidates-list"></div>
                  </div>
                  <div id="view-econ-box" class="hidden" style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:6px;padding:8px;margin-bottom:8px;font-size:11px;">
                    <div style="color:#38bdf8;font-weight:bold;margin-bottom:4px;">📦 国庫共有ボックス</div>
                    <div style="color:#94a3b8;margin-bottom:4px;">T3以下かつ隊長装備より弱い拾得品は自動吸収（相当額で買い取り）。ウェーブ終了時に新兵・予備兵を含めて先に支給。誰にも不要な余剰は売値の1.6倍で外販。保護装備は対象外。</div>
                    <div id="shared-box-list" style="max-height:120px;overflow-y:auto;"></div>
                  </div>
                </div>

                <p id="roster-experience-note" style="font-size: 11px; color: #aaa; margin-bottom: 6px;">
                  攻撃・被攻撃・実回復を行った戦線だけ経験を記録。経験2戦線で叙勲可能。
                </p>
                <div id="squad-roster-list" class="squad-list-box" style="margin-bottom: 12px; max-height: 200px; overflow-y: auto;"></div>
              </div>

              <!-- 装備タブ -->
              <div id="view-strat-equip" class="hidden">
                <div id="player-equip-box" class="reward-box" style="margin-bottom: 10px;"></div>
                <div style="font-size: 11px; font-weight: bold; color: #889; margin-bottom: 4px;">【所持品バッグ】</div>
                <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px; line-height: 1.45; background: rgba(0,0,0,0.25); padding: 5px 8px; border-radius: 6px; border: 1px solid #334155;">
                  💡 <strong style="color:#e2e8f0;">[装備]</strong>: そのまま換装（旧装備はバッグに残ります）<br>
                  ✨ <strong style="color:#c084fc;">[+X引継]</strong>: 旧装備の強化値(+X)を乗り換え（<strong style="color:#f87171;">※古い装備は消滅します</strong>）
                </div>
                <div id="inventory-list" class="squad-list-box" style="margin-bottom: 12px; max-height: 140px; overflow-y: auto;"></div>
              </div>

              <button id="btn-start-next-wave" class="action-btn" style="margin-top: 4px;">⚔️ 戦場へ復帰する (会議終了)</button>
              <button id="btn-close-strat" class="action-btn secondary hidden" style="margin-top: 6px;">戦場に戻る</button>
              <button id="btn-restart-from-strat" class="action-btn secondary" style="margin-top: 10px; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">ニューゲーム・セーブ選択</button>
            </div>
          </div>

          <!-- ゲームオーバー画面 -->
          <div id="game-overlay" class="game-overlay hidden">
            <div class="overlay-content">
              <h2 class="overlay-title">討死</h2>
              <p class="overlay-score">到達作戦期: <span id="final-wave">第1期</span></p>
              <p style="font-size: 13px; color: #aaa; margin-bottom: 4px;">最終階級: <strong id="final-rank" style="color:#ffaa00;">-</strong></p>
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">
                討伐戦果: ⚔️ 雑魚 <strong id="final-minions" style="color:#fff;">0</strong>体 / 👑 ボス <strong id="final-bosses" style="color:#ffd700;">0</strong>体
              </p>
              <p id="overlay-veteran-note" style="font-size: 11px; color: #38bdf8; margin-bottom: 14px;">※生存兵士は次戦に先輩として引き継がれます</p>
              <button id="btn-restart" class="action-btn">新兵として再入隊</button>
              <button id="btn-gameover-save-select" class="action-btn secondary">ニューゲーム・セーブ選択</button>
              <button id="btn-overlay-back" class="action-btn secondary">工房へ戻る</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.configureStrategyPanel();
    document.getElementById('btn-world-map').addEventListener('click',()=>this.openWorldMap());
    document.querySelector('.minimap-container')?.addEventListener('click',()=>this.openWorldMap());

    document.getElementById('btn-back').addEventListener('click', () => {
      sound.playTap();
      this.saveGame();
      this.destroy();
      this.onBackToHub();
    });

    document.getElementById('btn-strategy').addEventListener('click', () => {
      sound.playTap();
      this.openStrategyModal(true);
    });

    const bannerStratBtn = document.getElementById('btn-banner-strat');
    if (bannerStratBtn) {
      bannerStratBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playTap();
        document.getElementById('phase-complete-banner').classList.add('hidden');
        this.openStrategyModal(true);
      });
    }
    document.getElementById('btn-release-wounded').onclick=()=>{releaseWounded(this,this.player);this.saveGame();this.updateStatsUI();};
    const phaseBanner = document.getElementById('phase-complete-banner');
    if (phaseBanner) {
      phaseBanner.addEventListener('click', () => {
        sound.playTap();
        phaseBanner.classList.add('hidden');
        this.openStrategyModal(true);
      });
    }

    const enterDungeonBtn = document.getElementById('btn-enter-dungeon');
    const openMerchantBtn = document.getElementById('btn-open-merchant');
    if (openMerchantBtn) {
      openMerchantBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openMerchantShop();
      });
    }

    if (enterDungeonBtn) {
      enterDungeonBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playTap();
        if (this.nearDungeon) {
          this.enterDungeon(this.nearDungeon);
        }
      });
    }
    const dungeonBanner = document.getElementById('dungeon-prompt-banner');
    if (dungeonBanner) {
      dungeonBanner.addEventListener('click', () => {
        sound.playTap();
        if (this.nearDungeon) {
          this.enterDungeon(this.nearDungeon);
        }
      });
    }

    const raidWarpBtn = document.getElementById('btn-raid-warp');
    if (raidWarpBtn) {
      raidWarpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playLaunch();
        // 本陣救援ワープは地図ファストトラベルと別扱い（紐牽引中でも本陣へ帰還可・搬送対象も追従）
        this.fastTravelTo(BASE_CAMP.x, BASE_CAMP.y, '本陣 (防衛救援)', { rescueWarp: true });
        this.showToast('🌀 本陣へ緊急救援ワープ！部隊全員で本拠地を死守せよ！');
      });
    }

    const restartStratBtn = document.getElementById('btn-restart-from-strat');
    if (restartStratBtn) {
      restartStratBtn.addEventListener('click', () => {
        sound.playTap();
        this.saveGame();
        this.showSaveMenu();
      });
    }

    document.getElementById('btn-restart').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('game-overlay').classList.add('hidden');
      this.setDialogState(false);
      this.startFreshGame();
    });

    document.getElementById('btn-gameover-save-select').addEventListener('click',()=>this.showSaveMenu());

    document.getElementById('btn-overlay-back').addEventListener('click', () => {
      sound.playTap();
      this.destroy();
      this.onBackToHub();
    });

    document.getElementById('btn-start-next-wave').addEventListener('click', () => {
      sound.playTap();
      this.closeStrategyModal();
      this.inBattle = true;
    });

    document.getElementById('btn-close-strat').addEventListener('click', () => {
      sound.playTap();
      this.closeStrategyModal();
      this.inBattle = true;
    });

    document.getElementById('btn-heal-all').addEventListener('click', () => {
      this.healAllSquad();
    });

    // 号令ボタン（伍長以上）
    const cmdBtn = document.getElementById('btn-pad-command');
    if (cmdBtn) {
      cmdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerCommand();
      });
    }

    // パワーアタック（渾身強撃 💥）ボタン
    const powerBtn = document.getElementById('btn-pad-power');
    if (powerBtn) {
      const handlePowerAttack = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sound.unlock();
        this.triggerPowerAttack();
      };
      powerBtn.addEventListener('mousedown', handlePowerAttack);
      powerBtn.addEventListener('touchstart', handlePowerAttack, { passive: false });
    }

    // 手動攻撃ボタン
    const atkBtn = document.getElementById('btn-pad-attack');
    if (atkBtn) {
      const handleManualAttack = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sound.unlock();
        this.manualAttack();
      };
      atkBtn.addEventListener('mousedown', handleManualAttack);
      atkBtn.addEventListener('touchstart', handleManualAttack, { passive: false });
    }

    // PCキーボードショートカット (Space/E/K: 強撃, J/F: 手動通常攻撃)
    window.addEventListener('keydown', (e) => {
      if (!this.inBattle || !this.player || this.player.hp <= 0) return;
      if (document.querySelector('.dialog-open') || document.querySelector('#strategy-modal:not(.hidden)')) return;
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'KeyK') {
        e.preventDefault();
        this.triggerPowerAttack();
      } else if (e.code === 'KeyJ' || e.code === 'KeyF') {
        e.preventDefault();
        this.manualAttack();
      }
    });


    const zoomBtn = document.getElementById('btn-zoom-toggle');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playTap();
        this.toggleZoom();
      });
    }
  },

  configureStrategyPanel() {
    const modal = document.getElementById('strategy-modal');
    const wrapper = this.container.querySelector('.game-wrapper');
    wrapper.append(modal, document.getElementById('game-overlay'));
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'strat-title');
    const panel = modal.firstElementChild;
    panel.classList.add('strategy-panel');
    const heading = panel.firstElementChild; heading.classList.add('dialog-heading');
    const close = document.createElement('button');
    close.id='btn-dialog-close'; close.className='dialog-close'; close.textContent='閉じる ×';
    close.addEventListener('click',()=>this.closeStrategyModal()); heading.append(close);
    const nav=document.getElementById('tab-strat-nation')?.parentElement || document.getElementById('tab-strat-squad').parentElement;
    nav.classList.add('dialog-tabs');
    const overview=document.createElement('div'); overview.id='view-strat-overview';
    const nation=document.createElement('div'); nation.id='view-strat-nation'; nation.className='hidden hub-panel hub-nation';
    const troops=document.createElement('div'); troops.id='view-strat-troops'; troops.className='hidden hub-panel hub-troops';
    const body=document.createElement('div'); body.className='dialog-body';
    body.tabIndex=0; body.setAttribute('aria-label','会議の内容');
    // Retain live nodes before moving them into the detached body. Document ID
    // lookup cannot find detached descendants while this dialog is assembled.
    const squadView=document.getElementById('view-strat-squad');
    const equipView=document.getElementById('view-strat-equip');
    const invest=document.getElementById('view-econ-invest');
    const box=document.getElementById('view-econ-box');
    let node=heading.nextElementSibling;
    while(node && node.id!=='btn-start-next-wave') {
      const next=node.nextElementSibling;
      if(node!==nav) {
        if(node.id==='view-strat-squad' || node.id==='view-strat-equip') body.append(node);
        else overview.append(node);
      }
      node=next;
    }
    overview.append(document.getElementById('btn-restart-from-strat'));
    const nationIntro=document.createElement('div');
    nationIntro.className='hub-intro';
    nationIntro.innerHTML='<div style="font-weight:bold;color:#67e8f9;margin-bottom:4px;">🏛 国家運営</div><div style="font-size:11px;color:#94a3b8;line-height:1.45;margin-bottom:8px;">国庫寄付・共有装備・大目標・財政・本隊の小隊遠征をここに集約。叙勋は部隊管理の名簿から。直属は自分で魔境へ連れていけるため遠征対象外。</div>';
    nation.append(nationIntro);
    const nationQuest=document.createElement('div'); nationQuest.id='nation-quest-panel'; nationQuest.className='hub-section';
    nation.append(nationQuest);
    const nationFiscal=document.createElement('div'); nationFiscal.id='nation-fiscal-panel'; nationFiscal.className='hub-section';
    nation.append(nationFiscal);
    const nationExpedition=document.createElement('div'); nationExpedition.id='nation-expedition-panel'; nationExpedition.className='hub-section';
    nation.append(nationExpedition);
    if(invest){invest.classList.remove('hidden');nation.append(invest);}
    if(box){box.classList.remove('hidden');nation.append(box);}
    const troopsIntro=document.createElement('div');
    troopsIntro.className='hub-intro';
    troopsIntro.innerHTML='<div style="font-weight:bold;color:#fde68a;margin-bottom:4px;">⚔ 部隊管理</div><div style="font-size:11px;color:#94a3b8;line-height:1.45;margin-bottom:6px;">兵士詳細・スカウト／放逐・編成・装備・直属をここに集約。下のタブで切替。</div>';
    troops.append(troopsIntro);
    const formationBar=document.createElement('div');
    formationBar.id='formation-bar';
    formationBar.className='hub-section';
    formationBar.innerHTML='<div style="font-size:11px;color:#cbd5e1;margin-bottom:6px;">🧭 編成：<strong style="color:#e1cf9d;">防衛陣形</strong>（直属は隊長追従／本隊は本陣防衛圏） · 上限 本隊48 / 直属12 · 遠征は国家運営</div>';
    troops.append(formationBar);
    if(squadView){squadView.classList.remove('hidden');troops.append(squadView);}
    if(equipView){equipView.classList.add('hidden');troops.append(equipView);}
    body.prepend(overview);
    body.append(nation, troops);
    const legacySquad=document.getElementById('tab-strat-squad');
    const legacyEquip=document.getElementById('tab-strat-equip');
    if(legacySquad) legacySquad.classList.add('hidden');
    if(legacyEquip) legacyEquip.classList.add('hidden');
    let overviewTab=document.getElementById('tab-strat-overview');
    if(!overviewTab){
      overviewTab=document.createElement('button');
      overviewTab.id='tab-strat-overview'; overviewTab.className='sub-tab-btn'; overviewTab.textContent='状況';
      nav.prepend(overviewTab);
    }
    const nationTab=document.getElementById('tab-strat-nation');
    const troopsTab=document.getElementById('tab-strat-troops');
    if(nationTab) nationTab.textContent='🏛 国家運営';
    if(troopsTab) troopsTab.textContent='⚔ 部隊管理';
    panel.insertBefore(nav,heading.nextSibling); panel.insertBefore(body,nav.nextSibling);
    const footer=document.createElement('div'); footer.className='dialog-footer';
    footer.append(document.getElementById('btn-start-next-wave'),document.getElementById('btn-close-strat'));
    panel.append(footer);
    const selectTab=(name)=>{
      for(const key of ['overview','nation','troops']) {
        const view=document.getElementById(`view-strat-${key}`);
        if(view) view.classList.toggle('hidden',key!==name);
        const tab=document.getElementById(`tab-strat-${key}`);
        if(tab){ tab.classList.toggle('active',key===name); tab.setAttribute('aria-pressed',String(key===name)); }
      }
      if(name==='troops' && typeof this._syncTroopsSubView==='function') this._syncTroopsSubView(this.rosterManageTab||'roster');
      body.scrollTop=0;
    };
    this._selectStratTab=selectTab;
    this._syncTroopsSubView=(sub)=>{
      const rosterList=document.getElementById('squad-roster-list');
      const scout=document.getElementById('view-econ-scout');
      const equip=document.getElementById('view-strat-equip');
      const showRoster=sub==='roster';
      const showScout=sub==='scout';
      const showEquip=sub==='equip';
      squadView.classList.toggle('hidden',showEquip);
      if(rosterList) rosterList.style.display=(showRoster||showScout)?'':'none';
      if(scout) scout.classList.toggle('hidden',!showScout);
      if(equip) equip.classList.toggle('hidden',!showEquip);
      ['roster','scout','equip'].forEach(n=>{
        const btn=document.getElementById(`tab-econ-${n}`);
        if(btn) btn.classList.toggle('active',n===sub);
      });
    };
    for(const key of ['overview','nation','troops']) {
      document.getElementById(`tab-strat-${key}`)?.addEventListener('click',()=>selectTab(key));
    }
    selectTab('overview');
    this.dialogKeyHandler=e=>{
      if(modal.classList.contains('hidden')) return;
      if(e.key==='Escape') { e.preventDefault(); this.closeStrategyModal(); }
      if(e.key==='Tab') {
        const buttons=[...modal.querySelectorAll('button,select,input,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length && !el.disabled && !el.closest('[inert]'));
        const first=buttons[0],last=buttons[buttons.length-1];
        if(e.shiftKey && document.activeElement===first) { e.preventDefault(); last?.focus(); }
        else if(!e.shiftKey && document.activeElement===last) { e.preventDefault(); first?.focus(); }
      }
    };
    modal.addEventListener('keydown',this.dialogKeyHandler);
    configureInterface(this);
    document.getElementById('btn-pad-potion').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();this.useSquadPotion();});
  },

  setDialogState(open) {
    sound.setBGMMode(open?'quiet':daylightAt(this.worldTime||0).period);
    this.container.classList.toggle('dialog-open', open);
    this.container.querySelector('.game-header').inert = open;
    document.getElementById('canvas-container').inert = open;
  },

  resetMovementInput() {
    if(this.joystick) Object.assign(this.joystick,{active:false,dirX:0,dirY:0});
    const knob=document.getElementById('dpad-knob');
    if(knob) knob.style.transform='translate(-50%, -50%)';
  },

  closeStrategyModal(resume = true) {
    this.closeSoldierDetail();
    const transfer = document.getElementById('equipment-transfer-popup');
    if (transfer) { transfer.classList.add('hidden'); setSubDialog(this, transfer, false); }
    document.getElementById('strategy-modal').classList.add('hidden');
    this.setDialogState(false);
    this.resetMovementInput();
    if(resume) this.inBattle = true;
    document.getElementById('btn-strategy')?.focus();
  },

  showSaveMenu() {
    this._merchantShopClose?.();
    this.stopGameLoop();
    this.inBattle = false;
    this.resetMovementInput();
    document.getElementById('strategy-modal').classList.add('hidden');
    document.getElementById('game-overlay').classList.add('hidden');
    this.worldMapModal?.classList.add('hidden');
    if (!this.saveMenu) {
      this.saveMenu = document.createElement('div');
      this.saveMenu.id = 'save-menu'; this.saveMenu.className = 'game-overlay';
      this.saveMenu.setAttribute('role','dialog'); this.saveMenu.setAttribute('aria-modal','true');
      this.saveMenu.setAttribute('aria-labelledby','save-menu-title');
      this.container.querySelector('.game-wrapper').append(this.saveMenu);
    }
    this.saveMenu.innerHTML = `
      <section class="strategy-panel save-panel">
        <header class="save-heading"><span class="save-eyebrow">IRON SQUAD</span>
          <h2 id="save-menu-title" tabindex="-1">遠征を選ぶ</h2><p>新しい部隊で出発するか、記録した遠征を続けます。</p></header>
        <div class="dialog-body">
          <form id="new-expedition-form" class="new-expedition">
            <label for="expedition-name">新しい遠征の名前</label>
            <input id="expedition-name" class="save-name" type="text" maxlength="40" placeholder="例：第一遠征隊" autocomplete="off">
            <button class="action-btn" type="submit">ニューゲーム</button>
            <p>第1期・新兵48名・部隊回復薬1個から開始。既存の遠征はそのまま残ります。</p>
          </form>
          <h3 class="save-section-title">保存した遠征</h3><div id="save-slot-list"></div>
        </div>
        <footer class="dialog-footer"><button id="btn-save-menu-back" class="action-btn secondary">工房へ戻る</button></footer>
      </section>`;
    const list=this.saveMenu.querySelector('#save-slot-list');
    try {
      const slots=saveSlots.list().sort((a,b)=>b.savedAt-a.savedAt);
      if (!slots.length) list.textContent='まだ遠征の記録はありません。ニューゲームから出発できます。';
      for(const slot of slots) {
        const card=document.createElement('article');card.className='save-card';
        const name=document.createElement('h4');name.textContent=slot.name;
        const details=document.createElement('p');
        const data=slot.data;
        details.textContent=data ? `第${data.phase || data.wave || 1}期 · Lv.${data.player?.level || 1} · ${(data.gold || 0).toLocaleString()}G · 生存${data.squad?.length || 0}名` : '生存部隊の引き継ぎ記録';
        const date=document.createElement('p');date.className='save-date';
        date.textContent=`${slot.state==='fallen'?'討死 · ':''}${new Date(slot.savedAt).toLocaleString('ja-JP')}`;
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex; gap:8px; align-items:center; margin-top:8px;';
        const button=document.createElement('button');button.className='action-btn';button.dataset.slotId=slot.id;
        button.style.flex = '1';
        button.textContent=slot.state==='fallen'?'先輩を引き継いで再入隊':'このセーブで続ける';
        button.addEventListener('click',()=>this.selectSaveSlot(slot.id));

        const delButton = document.createElement('button');
        delButton.className = 'action-btn secondary save-delete-btn';
        delButton.type = 'button';
        delButton.title = `「${slot.name}」を削除`;
        delButton.style.cssText = 'min-width:74px; color:#f87171; border-color:#991b1b; padding:8px 10px; font-size:12px;';
        delButton.textContent = '🗑️ 削除';
        delButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const confirmed = window.confirm(`遠征「${slot.name}」を本当に削除しますか？\n\n※この操作は取り消せません。`);
          if (confirmed) {
            try {
              saveSlots.delete(slot.id);
              if (this.activeSlotId === slot.id) this.activeSlotId = null;
              sound.playTap();
              this.showSaveMenu();
            } catch (err) {
              alert(err.message);
            }
          }
        });

        btnGroup.append(button, delButton);
        card.append(name,details,date,btnGroup);
        if(slot.checkpoint?.data) {
          const point=document.createElement('p');point.className='save-date';point.textContent=`地点記録：${slot.checkpoint.place} · 第${slot.checkpoint.data.phase}期 · ${new Date(slot.checkpoint.savedAt).toLocaleString('ja-JP')}`;
          const restore=document.createElement('button');restore.type='button';restore.className='action-btn secondary save-checkpoint-button';restore.dataset.checkpointSlot=slot.id;restore.textContent='地点セーブから再開';
          restore.addEventListener('click',()=>this.selectSaveSlot(slot.id,true));card.append(point,restore);
        }
        list.append(card);
      }
    } catch(error) { list.textContent=error.message; }
    this.saveMenu.querySelector('#new-expedition-form').addEventListener('submit',e=>{
      e.preventDefault();
      try {
        const slot=saveSlots.create(this.saveMenu.querySelector('#expedition-name').value);
        this.selectSaveSlot(slot.id);
      } catch(error) { list.textContent=error.message; }
    });
    this.saveMenu.querySelector('#btn-save-menu-back').addEventListener('click',()=>{
      this.destroy();this.onBackToHub();
    });
    this.saveMenu.classList.remove('hidden');this.setDialogState(true);
    this.saveMenu.querySelector('#save-menu-title').focus({preventScroll:true});
  },

  beginSelectedExpedition() {
    this.clearRenderProblem();
    this.saveMenu.classList.add('hidden');
    this.setDialogState(false);this.resetMovementInput();
    sound.setListener(()=>this.player);sound.startBGM();
    const slot=saveSlots.get(this.activeSlotId);
    document.getElementById('btn-back').title=`${slot?.name || '遠征'}を保存して工房へ戻る`;
  },

  selectSaveSlot(id,fromCheckpoint=false) {
    const slot=saveSlots.get(id);
    if(!slot||fromCheckpoint&&!slot.checkpoint?.data) return false;
    this.activeSlotId=id;
    try {
      // Keep the menu until initialization succeeds. Previously a startup
      // exception was written into the already-hidden menu, leaving only HUD.
      if(fromCheckpoint)this.resumeSavedGame(JSON.parse(JSON.stringify(slot.checkpoint.data)));
      else if(slot.state==='fallen' || !slot.data) this.startFreshGame(slot.state==='fallen');
      else this.resumeSavedGame(slot.data);
      this.beginSelectedExpedition();
      this.resizeCanvas?.();
      this.render(); this._sceneDirty=false;
      return true;
    } catch (error) {
      console.error('Expedition startup failed:', error);
      this.inBattle=false; this.stopGameLoop(); this.resetMovementInput();
      this.showSaveMenu();
      const notice=document.createElement('p');notice.id='save-start-error';notice.className='save-start-error';notice.setAttribute('role','alert');
      notice.textContent=`v2.5.0 · 開始できませんでした：${error.message || error}`;
      this.saveMenu.querySelector('.save-heading').append(notice);
      this.showRenderProblem('startup',error);
      return false;
    }
  },

  fastTravelTo(targetX, targetY, targetName, options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const isRescueWarp = !!opts.rescueWarp;
    if (this.currentDungeon) {
      this.showToast('⚠️ ダンジョン内ではファストトラベルできません。外界への帰還門を使ってください');
      return;
    }
    // 本陣救援ワープは紐牽引ブロック対象外（搬送中も syncDragged で本陣へ同送）
    // 地図ファストトラベルは隊長本人が牽引中のみ禁止（AI搬送はロックしない）。壊れたフラグは掃除済み。
    if (!isRescueWarp && playerHasActiveRopePull(this)) {
      this.showToast('⚠️ 隊長が紐で牽引中は地図転送できません。本陣救援ワープか、本陣・救護所・町・拠点へ送り届けてから転送してください');
      return;
    }
    if (!this.player || this.player.hp <= 0) return;

    // 隊長を指定座標へ転送
    this.player.x = targetX;
    this.player.y = targetY;

    // 生存部隊も隊長周囲に一斉ワープ
    if (this.squad) {
      this.squad.forEach((s, idx) => {
        if (!s.dead) {
          const ang = (idx / Math.max(1, this.squad.length)) * Math.PI * 2;
          const dist = 30 + (idx % 4) * 15;
          s.x = targetX + Math.cos(ang) * dist;
          s.y = targetY + Math.sin(ang) * dist;
        }
      });
    }

    // カメラ同期
    this.camera = { x: targetX, y: targetY };
    // v1.25.8: teleport must reveal destination (prevents full-black after FT)
    this.revealFogAroundPlayer(true);

    // 転送魔法陣パーティクル（青〜エメラルド光）
    for (let i = 0; i < 40; i++) {
      const pAng = Math.random() * Math.PI * 2;
      const pDist = Math.random() * 65;
      this.particles.push({
        x: targetX + Math.cos(pAng) * pDist,
        y: targetY + Math.sin(pAng) * pDist,
        vx: (Math.random() - 0.5) * 80,
        vy: -50 - Math.random() * 70,
        color: i % 2 ? 'rgba(56, 189, 248, 0.9)' : 'rgba(167, 243, 208, 0.9)',
        size: 3 + Math.random() * 3,
        life: 0.65
      });
    }

    sound.playLaunch();
    if (isRescueWarp) {
      this.showToast(`🌀【本陣救援】「${targetName}」へ緊急展開！死守せよ！`);
    } else {
      this.showToast(`🌀【転送完了】「${targetName}」へ部隊を展開しました！`);
    }

    // モーダルが開いていれば閉じる
    if (this.worldMapModal && !this.worldMapModal.classList.contains('hidden')) {
      this.worldMapModal.classList.add('hidden');
      this.setDialogState(false);
      this.inBattle = true;
    }
  },

  openWorldMap() {
    this.inBattle=false;this.resetMovementInput();
    if(!this.worldMapModal) {
      this.worldMapModal=document.createElement('div');
      this.worldMapModal.id='world-map-modal';this.worldMapModal.className='game-overlay';
      this.worldMapModal.setAttribute('role','dialog');this.worldMapModal.setAttribute('aria-modal','true');
      this.worldMapModal.setAttribute('aria-labelledby','world-map-title');
      this.worldMapModal.innerHTML=`<section class="strategy-panel">
        <header class="map-heading"><h2 id="world-map-title">遠征地図・ファストトラベル</h2><button id="btn-world-map-close" class="dialog-close">閉じる ×</button></header>
        <div class="dialog-body world-map-body">
          <canvas id="world-map-canvas" width="600" height="600" role="img" aria-label="本陣・拠点・発見済み救護所・現在地・ダンジョンを示す全体地図" style="touch-action:none; cursor:pointer; max-width:100%; border-radius:8px; border:1px solid #334155;"></canvas>
          <p style="font-size:11px; color:#94a3b8; margin:4px 0;">白：現在地　淡黄：本陣　黄土：ダンジョン　砂：宿場　灰：廃墟　赤：大ボス　緑の十字：発見済み救護所（搬送で復活）。近場はリストから入る。</p>
          <p id="world-location" style="font-weight:bold; color:#f1f5f9;"></p>
          <div id="fast-travel-container" style="margin-top:10px; border-top:1px solid #334155; padding-top:10px;">
            <h4 style="margin:0 0 8px; color:#38bdf8; font-size:13px; display:flex; align-items:center; gap:6px;">
              <span>🌀 転送ポータル (部隊一斉ファストトラベル)</span>
            </h4>
            <div id="fast-travel-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:6px;"></div>
          </div>
        </div></section>`;
      this.container.querySelector('.game-wrapper').append(this.worldMapModal);
      const close=()=>{this.worldMapModal.classList.add('hidden');this.setDialogState(false);this.inBattle=true;};
      this.worldMapModal.querySelector('#btn-world-map-close').addEventListener('click',close);
      this.worldMapModal.addEventListener('keydown',e=>{if(e.key==='Escape')close();});

      // 地図キャンバスクリックでの直接転送
      const canvas=this.worldMapModal.querySelector('canvas');
      canvas.addEventListener('click', (e) => {
        if (this.currentDungeon) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;
        const scale = canvas.width / WORLD_SIZE;
        const worldX = clickX / scale;
        const worldY = clickY / scale;
        const slop = 14 / scale;
        const picks = [{ x: BASE_CAMP.x, y: BASE_CAMP.y, name: '本陣 (中央司令部)' },...(this.medicalPosts||[]).filter(p=>p.discovered)];
        for (const op of (this.outposts || [])) {
          if (op.cleared) picks.push({ x: op.x, y: op.y, name: op.name });
        }
        for (const d of (this.dungeons || [])) {
          if (d.cleared || d.discovered) picks.push({ x: d.entrance.x, y: d.entrance.y, name: `${d.name}入口` });
        }
        let best = null;
        let bestD = slop;
        for (const p of picks) {
          const dist = Math.hypot(worldX - p.x, worldY - p.y);
          if (dist < bestD) { bestD = dist; best = p; }
        }
        if (best) this.fastTravelTo(best.x, best.y, best.name);
      });
    }

    this.worldMapModal.classList.remove('hidden');this.setDialogState(true);
    const canvas=this.worldMapModal.querySelector('canvas');
    const wctx=canvas.getContext('2d');
    this.worldTerrain.drawOverview(wctx,canvas.width,this);
    this.ensureFog().drawMapOverlay(wctx,canvas.width,WORLD_SIZE);
    drawMedicalMap(wctx,this,x=>x*canvas.width/WORLD_SIZE,y=>y*canvas.height/WORLD_SIZE);
    this.worldMapModal.querySelector('#world-location').textContent=
      this.currentDungeon
        ? `⛩️ 【ダンジョン内】${this.currentDungeon.name} · 最奥ボス討伐へ進撃中`
        : `${biomeAt(this.player.x,this.player.y).name} · 本陣から${Math.round(Math.hypot(this.player.x-BASE_CAMP.x,this.player.y-BASE_CAMP.y))}m · 制圧${this.outposts.filter(o=>o.cleared).length}/${this.outposts.length}`;

    // 転送先リスト生成
    const travelList = this.worldMapModal.querySelector('#fast-travel-list');
    travelList.innerHTML = '';

    if (this.currentDungeon) {
      travelList.innerHTML = '<p style="grid-column:1/-1; color:#f87171; font-size:12px; margin:4px 0;">※ダンジョン内では転送ポータルは遮断されています。西側の帰還門より外界へ脱出してください。</p>';
    } else {
      const destinations = [
        { name: '本陣司令部', icon: '🛡️', x: BASE_CAMP.x, y: BASE_CAMP.y, desc: '回復・出撃拠点' }
      ];

      (this.medicalPosts||[]).filter(p=>p.discovered).forEach(p=>destinations.push({...p,icon:'✚',desc:'救出受付・搬送で復活'}));
      (this.outposts || []).filter(o => o.cleared).forEach(op => {
        destinations.push({ name: op.name, icon: op.icon || '🚩', x: op.x, y: op.y, desc: '制圧前哨基地' });
      });

      (this.dungeons || []).filter(d => d.cleared || d.discovered).forEach(d => {
        const placeDesc = d.kind === 'town' ? '町・搬送で復活' : d.kind === 'ruin' ? (d.cleared ? '探索済' : '発見済') : (d.cleared ? '踏破済' : '発見済');
        destinations.push({ name: d.name, icon: d.icon || '⛩️', x: d.entrance.x, y: d.entrance.y, desc: placeDesc });
      });

      destinations.forEach(dest => {
        const btn = document.createElement('button');
        btn.className = 'action-btn secondary';
        btn.style.cssText = 'padding:6px 8px; font-size:11px; text-align:left; display:flex; flex-direction:column; gap:2px;';
        btn.innerHTML = `<span style="font-weight:bold; color:#e2e8f0;">${dest.icon} ${dest.name}</span><span style="font-size:10px; color:#94a3b8;">${dest.desc}</span>`;
        btn.addEventListener('click', () => {
          this.fastTravelTo(dest.x, dest.y, dest.name);
        });
        travelList.appendChild(btn);
      });
    }

    this.worldMapModal.querySelector('#btn-world-map-close').focus();
  },

  toggleZoom() {
    this.zoomIndex = ((this.zoomIndex || 0) + 1) % this.zoomLevels.length;
    this.setZoom(this.zoomLevels[this.zoomIndex]);
  },

  setZoom(val) {
    this.zoom = Math.max(0.65, Math.min(1.65, Number(val.toFixed(2))));
    const btn = document.getElementById('btn-zoom-toggle');
    if (btn) btn.textContent = `🔍 ${this.zoom.toFixed(2)}x`;
    const labels = { '0.75': '広域俯瞰', '1.00': '標準', '1.25': '近接', '1.50': '超拡大' };
    const label = labels[this.zoom.toFixed(2)] || '任意倍率';
    this.showToast(`🔍 カメラ倍率: ${this.zoom.toFixed(2)}x (${label})`);
  },

  setupGame() {
    this.dialogue = soldierDialogue;
    this.dialogue.reset();
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasContainer = document.getElementById('canvas-container');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.resizeCanvas = () => {
      const rect = this.canvasContainer ? this.canvasContainer.getBoundingClientRect() : null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // v1.24.1: cap DPR (was 3)
      this.width = (rect && rect.width > 10) ? rect.width : (window.innerWidth > 10 ? window.innerWidth : 390);
      this.height = (rect && rect.height > 10) ? rect.height : (window.innerHeight > 90 ? window.innerHeight - 80 : 600);
      const pixelWidth = Math.max(1, Math.round(this.width * dpr));
      const pixelHeight = Math.max(1, Math.round(this.height * dpr));
      if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
      if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
      this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._sceneDirty=true;
    };

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    window.visualViewport?.addEventListener('resize', this.resizeCanvas);
    if (typeof ResizeObserver !== 'undefined') {
      this.surfaceResizeObserver = new ResizeObserver(this.resizeCanvas);
      this.surfaceResizeObserver.observe(this.canvasContainer);
    }
    attachSurfaceEvents(this);
    this.handleOrientation = () => {
      this.resizeCanvas?.();
      setTimeout(() => this.resizeCanvas?.(), 100);
      setTimeout(() => this.resizeCanvas?.(), 300);
    };
    window.addEventListener('orientationchange', this.handleOrientation);
    const screenObj = typeof screen !== 'undefined' ? screen : (typeof window !== 'undefined' ? window.screen : null);
    screenObj?.orientation?.addEventListener?.('change', this.handleOrientation);

    // 画面切り替え（タブ・別アプリ移動からの復帰）時のデルタタイム＆リサイズ安全化
    this.handleVisibility = () => {
      sound.setPageHidden(document.hidden);
      if (document.hidden) this.saveGame();
      if (!document.hidden) {
        this.lastTime = performance.now();
        if (this.resizeCanvas) this.resizeCanvas();
      }
    };
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.buildTerrain();
    this.setupInput();
  },

  startGameLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.running = true;
    this.lastTime = performance.now();
    this._sceneDirty=true;
    this._lastRenderBattle=false;
    this.loop = (t) => {
      if (!this.running) return;
      const dt = Math.max(0.001, Math.min((t - this.lastTime) / 1000, 0.1));
      this.lastTime = t;
      let stage = 'render';
      try {
        // Paint the initial/resized surface even if the following update fails.
        if (this._sceneDirty && this.player) { this.render(); this._sceneDirty = false; }
        stage = 'update';
        this.update(dt);
        stage = 'render';
        const draw=this.inBattle || this._lastRenderBattle || this._sceneDirty;
        if(draw){this.render();this._sceneDirty=false;}
        this._lastRenderBattle=!!this.inBattle;
        if (draw && (!this._nextMinimapAt || t >= this._nextMinimapAt)) {
          this._nextMinimapAt = t + MINIMAP_INTERVAL_MS;
          this.renderMinimap();
        }
      } catch (err) {
        console.error('Frame loop stopped:', err);
        this._surfaceResumeBattle = !!this.inBattle;
        if (stage === 'update' && this.player) {
          try { this.render(); } catch (_) { /* retain the diagnostic below */ }
        }
        this.inBattle=false;this.stopGameLoop();
        this.resetMovementInput();
        this.showRenderProblem(stage, err);
        return;
      }
      this.animFrameId = requestAnimationFrame(this.loop);
    };
    this.animFrameId = requestAnimationFrame(this.loop);
  },

  stopGameLoop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  },

  showRenderProblem(stage, error) {
    this._renderProblem = { stage, message: String(error?.message || error), at: Date.now() };
    if (!this.container) return;
    let notice = this.container.querySelector('#field-recovery');
    if (!notice) {
      notice = document.createElement('section'); notice.id = 'field-recovery'; notice.className = 'field-recovery';
      notice.setAttribute('role', 'alert');
      notice.innerHTML = '<strong>ゲーム画面の表示が停止しました</strong><p>部隊の進行を停止しています。表示の復旧を試せます。</p><div class="field-recovery-actions"><button type="button" id="btn-recover-field">表示を復旧</button><button type="button" id="btn-recovery-save-menu">セーブ選択</button></div><details><summary>不具合の情報</summary><pre></pre></details>';
      this.container.querySelector('.game-wrapper').append(notice);
      notice.querySelector('#btn-recover-field').onclick = () => this.recoverFieldSurface();
      notice.querySelector('#btn-recovery-save-menu').onclick = () => { this.clearRenderProblem(); this.showSaveMenu(); };
    }
    notice.querySelector('pre').textContent = `v1.26.1 / ${stage}\n${this._renderProblem.message}\n画面 ${this.width}×${this.height} / Canvas ${this.canvas?.width}×${this.canvas?.height}`;
    notice.classList.remove('hidden');
  },

  clearRenderProblem() {
    this._renderProblem = null;
    this.container?.querySelector('#field-recovery')?.classList.add('hidden');
  },

  recoverFieldSurface() {
    try {
      releaseSceneCaches(this);
      const width = this.canvas.width, height = this.canvas.height;
      releaseCanvas(this.canvas); this.canvas.width = width; this.canvas.height = height;
      this.ctx = this.canvas.getContext('2d'); this._surfaceLost = false;
      this.resizeCanvas(); this.render();
      this.inBattle = surfaceCanResume(this);
      this.clearRenderProblem(); this.startGameLoop();
      return true;
    } catch (error) { this.inBattle = false; this.stopGameLoop(); this.showRenderProblem('recovery', error); return false; }
  },

  startFreshGame(inheritVeterans = true) {
    resetBattleLog(this);
    this.dialogue?.reset();
    this._merchantShopClose?.();
    this.phase = 1;
    this.phaseTimer = PHASE_DURATION;
    this.restTimer=0;this.restUpgradeClock=0;this.restReport=null;this.restMonsters=[];
    this.totalBattleTime = 0;
    this.worldTime=0;
    this.lastStrongKill=null;
    this.treatmentReport = null;
    this.deathlineReport = null;
    this.rescueBuffTimer = 0;
    this.autoSaveClock = 0;
    this.recruitSequence = 0;
    this.lastReinforcements = null;
    this.reserveCheckTimer = 0;
    this.wave = 1;
    this.exp = 0;
    this.gold = 50;
    this.rankIndex = 0;
    this.inBattle = true;
    this.commandActiveUntil = 0;
    this.awakeningOrbs = 0;
    this.awakeningGems = 0;
    this.globalFundAmount = String(defaultDonateAmount(50));
    this.treasury = 6000;
    this.nation=normalizeNation();
    this.sharedEquipBox = [];
    this.fiscalLedger = emptyFiscalLedger(1, 6000);
    this.lastFiscalReport = null;
    this.phaseFiscal = emptyFiscalLedger(1, 6000);
    this.scoutCandidates = [];
    this.investTarget = 'personal'; // 'personal' | 'treasury'
    this.rosterManageTab = 'roster'; // roster | scout | equip
    this.civilians = [];
    this.civilianRescues = 0;
    this.moraleBonusTimer = 0;

    // 主人公（一介の二等雑兵）
    this.player = {
      x: BASE_CAMP.x - 20,
      y: BASE_CAMP.y - 20,
      isHero: true,
      level: 1,
      isAdvanced: false,
      advancedClass: null,
      exp: 0,
      reqExp: 20,
      minionKills: 0,
      bossKills: 0,
      kills: 0,
      survivedWaves: 0,
      phaseActivity: emptyActivity(),
      hitGrowthPct: 0,
      weaponMastery: emptyMastery(),
      hp: 130,
      maxHp: 130,
      def: 0,
      atk: 25,
      atkSpeed: 1.0,
      speed: 165, // 部隊(105px/s)より快適に速く動ける基礎速度
      atkCooldown: 0,
      powerAtkCooldown: 0,
      powerAtkMaxCd: 8.0,
      crit: 10,
      vampire: 0,
      lightning: false,
      dmgReduction: 0,
      slashAngle: 0,
      slashAnim: 0,
      facingAngle: 0
    };

    // 兜、鎧、脚、手、盾、武器、装飾の7スロット
    this.equipped = {
      weapon: null,
      shield: null,
      helmet: null,
      armor: null,
      gloves: null,
      legs: null,
      amulet: null
    };

    this.inventory = [];
    this.selectedSaleIds=new Set();this.soldierSlotSelections={};
    this.projectiles = []; // 弓矢・ヒール光弾

    // 先輩兵士引き継ぎチェック
    const inherited = inheritVeterans ? saveSlots.get(this.activeSlotId) : null;
    this.merchantEquipmentTier=inheritVeterans?(inherited?.data?.merchantEquipmentTier||1):1;
    this.rescueBonuses=normalizeRescueBonuses(inheritVeterans?(inherited?.data?.rescueBonuses||this.rescueBonuses):null);
    this.rescueRewardIds=inheritVeterans?[...(inherited?.data?.rescueRewardIds||this.rescueRewardIds||[])]:[];
    const veterans = inherited?.veterans;
    this.reserves = inherited?.reserveSurvivors || [];
    this.squad = [];
    this.fog = new FogGrid();
    this.fog.revealCamp(BASE_CAMP.x, BASE_CAMP.y);
    this.fog._campSeeded = true;
    let hasVeterans = false;

    if (veterans && Array.isArray(veterans) && veterans.length > 0) {
      hasVeterans = true;
      veterans.forEach((vet) => {
        vet.dead = false;
        vet.isDown = false;
        vet.downTimer = 0;
        vet.rescueProgress = 0;
        vet.isVeteran = true;
        vet.phaseActivity = emptyActivity();
        vet.x = BASE_CAMP.x + (Math.random() - 0.5) * 120;
        vet.y = BASE_CAMP.y + (Math.random() - 0.5) * 120;
        this.recalcSoldierStats(vet);
        vet.hp = vet.maxHp;
        this.squad.push(vet);
      });
      // Veteran inheritance belongs to this expedition only.
    }

    this.recruitSequence=[...this.squad,...this.reserves].reduce((max,s)=>Math.max(max,Number(s.name?.match(/#(\d+)/)?.[1] || 0)),0);
    this.normalizeDeployment();
    this.deployReserves();
    // Start a new commander with a full 30-person detachment.
    while (this.squad.length < DEPLOYMENT_CAPACITY) this.squad.push(this.createNewSoldier());

    this.initPlatoons();
    this.initOutposts();
    this.initDungeons();
    this.merchantCampSeed=Math.floor(Math.random()*4294967296);
    initMerchants(this, generateRandomDrop, BASE_CAMP);
    ensureCiviliansSpawned(this, { targetCount: 4 });
    this.assignWaveQuest();
    this.recalcPlayerStats();
    this.initBattlefield();
    initializeGateGuards(this);initializeInvasions(this);initializeMedicalPosts(this);
    saveSlots.update(this.activeSlotId, {state:'active', veterans:[], reserveSurvivors:[]});
    initializeSupplies(this);
    initializeMagic(this);this.damageFields=[];this._hazardClock=0;
    this.saveGame();
    this.updateStatsUI();
    this.camera = { x: BASE_CAMP.x, y: BASE_CAMP.y };
    if (this.joystick) {
      this.joystick.active = false;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
    }
    const stickKnob = document.getElementById('dpad-knob');
    if (stickKnob) stickKnob.style.transform = 'translate(-50%, -50%)';

    this.startGameLoop();
    if (hasVeterans) {
      this.showToast('🎖️ 【歴戦の先輩兵士が合流！】前線部隊の古参兵たちが新兵のあなたを援護します！');
    } else {
      this.showToast('⚔️ 48名の本隊として出動！本隊と連携し、直属小隊を率いて戦え！');
    }
  },

  initPlatoons() {
    this.platoons = [
      { id: 0, name: '第1小隊 (前衛突撃)', color: '#38bdf8', icon: '⚔️', x: BASE_CAMP.x + 80, y: BASE_CAMP.y - 60, mission: 'idle', expeditionStartCount: 0 },
      { id: 1, name: '第2小隊 (機動遊撃)', color: '#f59e0b', icon: '🏹', x: BASE_CAMP.x - 80, y: BASE_CAMP.y + 60, mission: 'idle', expeditionStartCount: 0 },
      { id: 2, name: '第3小隊 (本陣防衛)', color: '#34d399', icon: '🛡️', x: BASE_CAMP.x, y: BASE_CAMP.y, mission: 'idle', expeditionStartCount: 0 }
    ];
  },

  startPlatoonExpedition(platoonId, tierId = null, pickedIds = null) {
    if (!this.platoons) this.initPlatoons();
    if (this.currentDungeon) { this.showToast('\u30c0\u30f3\u30b8\u30e7\u30f3\u5185\u3067\u306f\u5c0f\u968a\u9060\u5f81\u3067\u304d\u307e\u305b\u3093'); return false; }
    const platoon = this.platoons[platoonId % 3];
    if (!platoon) return false;
    if (isPlatoonAway(platoon)) { this.showToast('\u305d\u306e\u5c0f\u968a\u306f\u3059\u3067\u306b\u9060\u5f81\uff0f\u5e30\u9084\u4e2d\u3067\u3059'); return false; }
    const tier = getDangerTier(tierId != null ? tierId : (this.expeditionDangerTier || 2));
    const picks = pickedIds || (this.expeditionPicks && this.expeditionPicks[platoonId]) || null;
    if (!canStartExpedition(this, platoonId, picks)) {
      this.showToast('\u9060\u5f81\u306b\u306f\u672c\u968a\u306e\u6226\u95d8\u53ef\u80fd3\u540d\u4ee5\u4e0a\u304c\u5fc5\u8981\u3067\u3059\uff08\u76f4\u5c5e\u306f\u5bfe\u8c61\u5916\uff09');
      return false;
    }
    const target = pickExpeditionTarget(this, BASE_CAMP, 2200, tier.id);
    const members = expeditionMembers(this, platoonId, picks);
    const n = startExpeditionState(platoon, target, members, tier.id);
    this.showToast(`${platoon.icon}${platoon.name.split(' ')[0]} \u9060\u5f81\u6d3e\u9063\uff08\u672c\u968a${n}\u540d\u30fb${tier.icon}${tier.label}\uff09\u2192 ${target.label}`);
    this.saveGame();
    return true;
  },

  recallPlatoonExpedition(platoonId, reason = 'manual') {
    if (!this.platoons) return false;
    const platoon = this.platoons[platoonId % 3];
    if (!platoon || !isPlatoonAway(platoon)) { this.showToast('\u9060\u5f81\u4e2d\u306e\u5c0f\u968a\u3067\u306f\u3042\u308a\u307e\u305b\u3093'); return false; }
    beginReturnState(platoon, reason);
    const label = reason === 'manual' ? '\u53ec\u9084' : '\u81ea\u52d5\u5e30\u9084';
    this.showToast(`${platoon.icon}${platoon.name.split(' ')[0]} ${label} \u2014 \u751f\u5b58\u8005\u306f\u672c\u9663\u3078`);
    this.saveGame();
    return true;
  },

  grantExpeditionReturnRewards(platoon, members) {
    const phase = this.phase || this.wave || 1;
    const rewards = computeExpeditionReturnRewards(platoon, members, phase);
    const tier = rewards.tier || getDangerTier(platoon.expeditionDangerTier);
    this.gold = (this.gold || 0) + rewards.gold;
    this.gainExp(rewards.playerExp);
    this.inventory = this.inventory || [];
    const lootNames = [];
    for (let i = 0; i < rewards.lootCount; i++) {
      const item = generateRandomDrop(rewards.lootDistance, rewards.lootKind);
      this.inventory.push(item);
      lootNames.push(item.name);
    }
    const inferiorNotes = [];
    for (const s of rewards.survivors) {
      let xp = rewards.soldierExp;
      if (isInferiorSurvivor(s)) {
        xp = Math.round(xp * INFERIOR_EXPEDITION_EXTRA_XP);
        const grit = applyInferiorExpeditionGrit(s);
        // deathline luck roll (rarity spice only — combat was live map)
        const luckChance = INFERIOR_DEATHLINE_LUCK + Math.min(0.35, (s.inferiorDeathlineLuck || 0) * 0.5);
        let awoke = null;
        if (Math.random() < luckChance) {
          awoke = this.tryAwakenDeathlineSkill(s);
        }
        if (grit && grit.gained) {
          inferiorNotes.push(`${s.name || '\u5175\u58eb'} grit${grit.grit}${awoke ? '/' + awoke.name : ''}`);
        }
      }
      s.exp = (s.exp || 0) + xp;
      let guard = 0;
      while (s.exp >= (s.reqExp || 14) && guard++ < 30) {
        const req = Math.max(8, s.reqExp || 14);
        s.exp -= req;
        s.level = (s.level || 1) + 1;
        s.reqExp = Math.floor(req * 1.5 + 8);
      }
      this.recalcSoldierStats(s);
    }
    const lootTxt = lootNames.length ? ` / \u90e8\u54c1 ${lootNames.slice(0, 2).join('\u30fb')}${lootNames.length > 2 ? '\u4ed6' : ''}` : '';
    const infTxt = inferiorNotes.length ? ` / \ud83c\udf42\u3078\u3063\u307d\u3053\u5927\u5316 ${inferiorNotes.length}\u540d` : '';
    this.showToast(`${platoon.icon}\u5e30\u9084\u5831\u916c ${tier.icon}${tier.label}: +${rewards.gold}G / EXP${rewards.playerExp}${lootTxt}${infTxt}`);
    if (inferiorNotes.length) {
      this.showToast(`\ud83c\udf42\u3078\u3063\u307d\u3053\u9060\u5f81\u751f\u5b58\u88dc\u6b63\uff01 ${inferiorNotes.slice(0, 3).join(' / ')}`);
    }
    try { sound.playHighScore(); } catch (_) {}
    return rewards;
  },

  completePlatoonExpeditionReturn(platoon) {
    if (!platoon) return;
    const members = expeditionMembers(this, platoon.id, platoon.expeditionMemberIds);
    // Grant before clear so tier/startCount still available
    this.grantExpeditionReturnRewards(platoon, members);
    clearExpeditionState(platoon);
    this.saveGame();
  },

  getExpeditionPicks(platoonId) {
    if (!this.expeditionPicks) this.expeditionPicks = {};
    const key = platoonId % 3;
    if (!this.expeditionPicks[key]) {
      // default: all combat-ready main-army members of the platoon
      this.expeditionPicks[key] = expeditionCombatReady(expeditionMembers(this, key)).map((s) => s.id);
    }
    return this.expeditionPicks[key];
  },

  toggleExpeditionPick(platoonId, soldierId) {
    const key = platoonId % 3;
    const picks = this.getExpeditionPicks(key).map(String);
    const sid = String(soldierId);
    const idx = picks.indexOf(sid);
    if (idx >= 0) picks.splice(idx, 1);
    else picks.push(sid);
    this.expeditionPicks[key] = picks;
  },

  renderExpeditionPanel() {
    const host = document.getElementById('nation-expedition-panel');
    if (!host) return;
    const openMembers = new Set([...host.querySelectorAll('.expedition-members[open]')].map(node => Number(node.dataset.pid)));
    if (!this.platoons) this.initPlatoons();
    if (!this.expeditionDangerTier) this.expeditionDangerTier = 2;
    const tier = getDangerTier(this.expeditionDangerTier);
    const tierBtns = EXPEDITION_DANGER_TIERS.map((t) => {
      const on = t.id === tier.id;
      return `<button type="button" class="mini-btn btn-danger-tier ${on ? 'active' : ''}" aria-pressed="${on}" data-tier="${t.id}" style="background:${on ? t.color : '#334155'};color:${on ? '#0f172a' : '#e2e8f0'};font-size:10px;padding:3px 7px;font-weight:${on ? 'bold' : 'normal'};">${t.icon}${t.label}<span style="opacity:.8;font-size:9px;"> x${t.rewardMult}</span></button>`;
    }).join('');
    const rows = this.platoons.map((p) => {
      const allMembers = expeditionMembers(this, p.id);
      const picks = this.getExpeditionPicks(p.id);
      const pickSet = new Set(picks.map(String));
      const selected = allMembers.filter((s) => pickSet.has(String(s.id)));
      const ready = expeditionCombatReady(selected);
      const downed = selected.filter((s) => s.isDown).length;
      const away = isPlatoonAway(p);
      const status = missionStatusJa(p);
      const statusColor = p.mission === 'expedition' ? '#f59e0b' : (p.mission === 'returning' ? '#f87171' : '#94a3b8');
      const canGo = !away && ready.length >= EXPEDITION_MIN_MEMBERS && !this.currentDungeon;
      const btn = away
        ? `<button type="button" class="mini-btn btn-expedition-recall" data-pid="${p.id}" style="background:#7f1d1d;color:#fecaca;font-size:10px;padding:3px 8px;">\u21a9 \u53ec\u9084</button>`
        : `<button type="button" class="mini-btn btn-expedition-send" data-pid="${p.id}" ${canGo ? '' : 'disabled'} style="background:${canGo ? '#a16207' : '#334155'};color:#fff;font-size:10px;padding:3px 8px;">\ud83d\udea9 \u9060\u5f81\u6d3e\u9063</button>`;
      const memberChecks = allMembers.slice(0, 24).map((s) => {
        const checked = pickSet.has(String(s.id)) ? 'checked' : '';
        const talent = (s.talent === 'INFERIOR') ? ' \ud83c\udf42' : '';
        const down = s.isDown ? '(\u8ca0\u50b7)' : '';
        const label = `${s.name || '\u5175'}${talent}${down}`;
        return `<label style="display:inline-flex;align-items:center;gap:2px;margin:1px 4px 1px 0;font-size:9.5px;color:#cbd5e1;"><input type="checkbox" class="expedition-pick" data-pid="${p.id}" data-sid="${s.id}" ${checked} ${away ? 'disabled' : ''}>${label}</label>`;
      }).join('');
      const more = allMembers.length > 24 ? `<span style="font-size:9px;color:#64748b;">\u2026\u4ed6${allMembers.length - 24}\u540d</span>` : '';
      return `<div class="expedition-card" style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed rgba(148,163,184,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:10.5px;">
          <div style="min-width:0;flex:1;">
            <span style="color:${p.color};font-weight:bold;">${p.icon}${p.name.split(' ')[0]}</span>
            <span style="color:#64748b;"> \u672c\u968a\u9078\u629c${ready.length}/\u8ca0\u50b7${downed} (\u5728\u7c4d${allMembers.length})</span>
            <div style="color:${statusColor};font-size:9.5px;">${status}</div>
          </div>
          ${btn}
        </div>
        <details class="expedition-members" data-pid="${p.id}" ${openMembers.has(p.id) ? 'open' : ''}>
          <summary>派遣兵士を選ぶ · 選抜 ${ready.length}名</summary>
          <div class="expedition-member-grid">${memberChecks}${more}</div>
        </details>
      </div>`;
    }).join('');
    host.innerHTML = `
      <div class="section-heading"><h4>本隊の小隊遠征</h4><p>危険度と参加兵士を確認して派遣します。</p></div>
      <div style="font-size:9.5px;color:#94a3b8;line-height:1.4;margin-bottom:6px;">\u672c\u968a\u304b\u3089\u30e1\u30f3\u30d0\u30fc\u3092\u9078\u3073\u3001\u5371\u967a\u5ea6\u30c6\u30a3\u30a2\u306e\u5730\u57df\u3078\u5b9f\u30de\u30c3\u30d7\u6d3e\u9063\u3002\u9ad8\u30ea\u30b9\u30af\u307b\u3069\u5f37\u6575\u30fb\u640d\u8017\u30ea\u30b9\u30af\u5897\u3001\u5e30\u9084\u5831\u916c\u3082\u5897\u3002\u6b7b\u306b\u305d\u3046\u306a\u3089\u81ea\u52d5\u5e30\u9084\uff08\u76f4\u5c5e\u306f\u5bfe\u8c61\u5916\uff09\u3002</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${tierBtns}</div>
      <div style="font-size:9.5px;color:${tier.color};margin-bottom:8px;">${tier.icon}<strong>${tier.label}</strong> \u2014 ${tier.desc} \u5831\u916cx${tier.rewardMult} / \u88ab\u30c0\u30e1x${tier.hazardTaken}</div>
      ${rows}
    `;
    host.querySelectorAll('.btn-danger-tier').forEach((btn) => {
      btn.onclick = () => {
        this.expeditionDangerTier = Number(btn.dataset.tier) || 2;
        this.renderExpeditionPanel();
      };
    });
    host.querySelectorAll('.expedition-pick').forEach((box) => {
      box.onchange = () => {
        this.toggleExpeditionPick(Number(box.dataset.pid), box.dataset.sid);
        this.renderExpeditionPanel();
      };
    });
    host.querySelectorAll('.btn-expedition-send').forEach((btn) => {
      btn.onclick = () => {
        const pid = Number(btn.dataset.pid);
        if (this.startPlatoonExpedition(pid, this.expeditionDangerTier, this.getExpeditionPicks(pid))) this.renderStrategyUI();
      };
    });
    host.querySelectorAll('.btn-expedition-recall').forEach((btn) => {
      btn.onclick = () => {
        if (this.recallPlatoonExpedition(Number(btn.dataset.pid), 'manual')) this.renderStrategyUI();
      };
    });
  },

  initOutposts() {
    const types=['FORT','CAGE','SHRINE','SUPPLY'];
    this.outposts=[];
    for(let ring=0;ring<3;ring++) for(let i=0;i<4;i++) {
      const type=types[i],def=OUTPOST_DEFS[type],angle=(i*90+45+ring*22)*Math.PI/180;
      const radius=[1800,4500,7800][ring];
      this.outposts.push({id:`outpost_${type.toLowerCase()}_${ring}`,type,
        name:`${def.name} ${ring+1}`,icon:def.icon,color:def.color,
        x:BASE_CAMP.x+Math.cos(angle)*radius,y:BASE_CAMP.y+Math.sin(angle)*radius,
        hp:Math.round(def.maxHp*distanceScaling(radius).hp),maxHp:Math.round(def.maxHp*distanceScaling(radius).hp),radius:def.radius,cleared:false,clearedWave:0});
    }
  },

  initDungeons() {
    this.dungeons = DUNGEON_DEFS.map(d => ({
      ...d,
      cleared: false,
      discovered: false,
      clearedWave: 0
    }));
    this.currentDungeon = null;
    this.instanceCargoIds = [];
    this.savedFieldPos = null;
    this.savedFieldMonsters = null;
    this.savedFieldDrops = null;
    this.dungeonVault = null;
  },

  assignWaveQuest() {
    if (!this.outposts) this.initOutposts();
    const unclearedOutposts = this.outposts.filter(o => !o.cleared);
    let chosenTemplate = null;
    let targetId = null;

    if (unclearedOutposts.length > 0 && Math.random() < 0.8) {
      const origin=this.player || BASE_CAMP;
      const nearby=unclearedOutposts.sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y)).slice(0,4);
      const targetOp = nearby[Math.floor(Math.random() * nearby.length)];
      targetId = targetOp.id;
      chosenTemplate = QUEST_TEMPLATES.find(q => q.targetType === targetOp.type) || QUEST_TEMPLATES[0];
    } else {
      chosenTemplate = QUEST_TEMPLATES[QUEST_TEMPLATES.length - 1]; // 掃討作戦
    }

    this.currentQuest = {
      ...chosenTemplate,
      targetId,
      completed: false,
      currentKills: 0
    };

    this.updateQuestUI(true);
  },

  updateQuestUI(isNewQuest = false) {
    const banner = document.getElementById('quest-banner');
    const statusEl = document.getElementById('quest-status');
    const titleEl = document.getElementById('quest-title');
    const descEl = document.getElementById('quest-desc');
    if (!banner || !this.currentQuest) return;

    if (!banner._hasClickListener) {
      banner._hasClickListener = true;
      banner.addEventListener('click', () => {
        sound.playTap();
        banner.classList.toggle('collapsed');
        clearTimeout(this.questCollapseTimer);
        if (!banner.classList.contains('collapsed')) {
          this.questCollapseTimer = setTimeout(() => {
            banner.classList.add('collapsed');
          }, 4500);
        }
      });
    }

    titleEl.textContent = this.currentQuest.title;

    if (this.currentQuest.completed) {
      statusEl.className = 'quest-status completed';
      statusEl.textContent = '達成！';
      descEl.textContent = `報奨金+${this.currentQuest.rewardGold}G / 武勲+${this.currentQuest.rewardExp}`;
      banner.classList.remove('collapsed');
      clearTimeout(this.questCollapseTimer);
      this.questCollapseTimer = setTimeout(() => {
        banner.classList.add('collapsed');
      }, 4000);
    } else {
      statusEl.className = 'quest-status';
      statusEl.textContent = '遂行中';
      if (this.currentQuest.targetType) {
        const op = this.outposts.find(o => this.currentQuest.targetId ? o.id === this.currentQuest.targetId : o.type === this.currentQuest.targetType);
        if (op) {
          const px = this.player ? this.player.x : BASE_CAMP.x;
          const py = this.player ? this.player.y : BASE_CAMP.y;
          const dist = Math.floor(Math.hypot(op.x - px, op.y - py));
          descEl.textContent = `${op.name}へ進軍！(残${Math.floor(op.hp)}HP / 距離${dist}m)`;
        } else {
          descEl.textContent = this.currentQuest.desc;
        }
      } else if (this.currentQuest.targetKills) {
        descEl.textContent = `敵掃討: ${this.currentQuest.currentKills || 0} / ${this.currentQuest.targetKills}体`;
      }
    }

    if (isNewQuest) {
      banner.classList.remove('collapsed');
      clearTimeout(this.questCollapseTimer);
      this.questCollapseTimer = setTimeout(() => {
        banner.classList.add('collapsed');
      }, 4000);
    }
  },

  damageOutpost(outpost, rawDmg, attacker = this.player) {
    if (!outpost || outpost.cleared || !(rawDmg > 0)) return;
    recordCombat(attacker);
    outpost.hp -= rawDmg;
    this.spawnDamageText(outpost.x, outpost.y - 15, Math.floor(rawDmg), '#ffd700');
    sound.playHit(0);
    this.spawnSparks(outpost.x, outpost.y, outpost.color, 4);

    if (outpost.hp <= 0) {
      outpost.hp = 0;
      outpost.cleared = true;
      outpost.clearedWave = this.wave;
      this.clearOutpost(outpost);
    }
    this.updateQuestUI();
  },

  clearOutpost(outpost) {
    sound.playHighScore();
    this.spawnSparks(outpost.x, outpost.y, outpost.color, 24);

    if (outpost.type === 'FORT') {
      const bonusG = Math.round(95 * distanceScaling(Math.hypot(outpost.x-BASE_CAMP.x,outpost.y-BASE_CAMP.y)).gold);
      this.gold += bonusG;
      for (let k = 0; k < 3; k++) {
        const dropItem = generateRandomDrop(Math.hypot(outpost.x-BASE_CAMP.x,outpost.y-BASE_CAMP.y), 'chest');
        this.dropsOnField.push({
          x: outpost.x + (Math.random() - 0.5) * 60,
          y: outpost.y + (Math.random() - 0.5) * 60,
          item: dropItem,
          isBoss: k === 0
        });
      }
      this.showToast(`🏴【前線砦陥落！】+${bonusG}G獲得！レア武具宝箱を大量鹵獲！`);
    } else if (outpost.type === 'CAGE') {
      const newS1 = this.createNewSoldier();
      const newS2 = this.createNewSoldier();
      newS1.x = outpost.x - 15; newS1.y = outpost.y;
      newS2.x = outpost.x + 15; newS2.y = outpost.y;
      this.reserves ||= [];
      let joined=0;
      for(const soldier of [newS1,newS2]) {
        if(this.squad.filter(s=>!s.dead).length<RANKS[this.rankIndex].maxSquad) {this.squad.push(soldier);joined++;}
        else this.reserves.push(soldier);
      }
      this.showToast(`捕虜2名を救助・実戦へ${joined}名合流・予備へ${2-joined}名`);
    } else if (outpost.type === 'SHRINE') {
      const cap=shrineUpgradeCap(Math.hypot(outpost.x-BASE_CAMP.x,outpost.y-BASE_CAMP.y));
      const seen=new Set();let count=0;
      for(const equipment of [this.equipped,...this.squad.filter(s=>!s.dead).map(s=>s.equipped)]) {
        for(const item of Object.values(equipment || {})) {
          if(item && !seen.has(item.id) && (item.upgrade || 0)<cap) {applyUpgradeStats(item,(item.upgrade || 0)+1);count++;seen.add(item.id);}
        }
      }
      this.squad.forEach(s=>this.recalcSoldierStats(s));this.recalcPlayerStats();
      this.showToast(`祭壇の祝福：${count}部位を+1強化！（無限強化解禁中！）`);
    } else if (outpost.type === 'SUPPLY') {
      this.player.hp = this.player.maxHp;
      this.squad.forEach(s => {
        if (!s.dead && !s.isDown) {
          if(!s.isDown)s.hp=s.maxHp;
          s.gold = (s.gold || 0) + 18;
        }
      });
      this.showToast(`📦【兵站奪還完了！】部隊全員のHPが全快！兵士各自に臨時給与+18G支給！`);
    }

    if (this.currentQuest && !this.currentQuest.completed && this.currentQuest.targetType === outpost.type && (!this.currentQuest.targetId || this.currentQuest.targetId === outpost.id)) {
      this.completeQuest();
    }
  },

  completeQuest() {
    if (!this.currentQuest || this.currentQuest.completed) return;
    this.currentQuest.completed = true;
    sound.playHighScore();
    const gReward = this.currentQuest.rewardGold || 70;
    const expReward = this.currentQuest.rewardExp || 30;
    this.gold += gReward;
    this.gainExp(expReward);
    this.showToast(`🎉【軍令達成！】司令部より特別武勲金+${gReward}G＆功績EXP+${expReward}授与！`);
    this.updateStatsUI();
    this.updateQuestUI();
  },

  recalcPlayerStats() {
    if (!this.player) return;
    const rank = RANKS[this.rankIndex] || RANKS[0];
    const lv = this.player.level || 1;
    const rescue=normalizeRescueBonuses(this.rescueBonuses);
    const waves = this.player.survivedWaves || 0;
    const minionKills = this.player.minionKills || 0;
    const bossKills = this.player.bossKills || 0;

    // 雑魚撃墜枠ボーナス (倒した数で地道に鍛錬)
    const minionAtk = Math.floor(minionKills / 5) * 1;
    const minionHp = Math.floor(minionKills / 15) * 10;
    const minionSpeed = Math.min(25, Math.floor(minionKills / 30) * 2);

    // ボス撃破枠ボーナス (討伐による英雄の覚醒)
    const bossAtk = bossKills * 8;
    const bossHp = bossKills * 50;
    const bossCrit = bossKills * 2;
    const bossReduction = Math.min(30, bossKills * 2); // 被ダメ軽減率(%)

    // 全部位装備ボーナス (武器, 盾, 兜, 鎧, 手, 脚, 装飾)
    let equipDef = 0;
    let equipHp = 0;
    let equipAtk = 0;
    let equipSpeed = 0;
    let equipAtkSpeed = 0;
    let equipVampire = 0;
    let equipCrit = 10;
    let equipBlock = 0;
    let equipLightning = false;

    if (this.equipped) {
      Object.keys(SLOT_INFO).forEach((slotKey) => {
        const item = this.equipped[SLOT_INFO[slotKey].key];
        if (item && item.stats) {
          if (item.stats.def) equipDef += item.stats.def;
          if (item.stats.hp) equipHp += item.stats.hp;
          if (item.stats.atk) equipAtk += item.stats.atk;
          if (item.stats.speed) equipSpeed += item.stats.speed;
          if (item.stats.atkSpeed) equipAtkSpeed += item.stats.atkSpeed;
          if (item.stats.vampire) equipVampire += item.stats.vampire;
          if (item.stats.crit) equipCrit += item.stats.crit;
          if (item.stats.blockChance) equipBlock += item.stats.blockChance;
          if (item.stats.lightning) equipLightning = true;
        }
      });
    }

    // 覇王ウォーロード (WARLORD) の世界が変わる覚醒乗算倍率
    const isWarlord = !!this.player.isAdvanced;
    const warlordHpMult = isWarlord ? 1.45 : 1.0;
    const warlordAtkMult = isWarlord ? 1.50 : 1.0;
    const warlordDefMult = isWarlord ? 1.55 : 1.0;

    // 階級による軍神乗算スケーリング (階級1ごとに+6%, 救国神将で+48%永続底上げ！)
    const rankStatMult = 1.0 + (this.rankIndex * 0.06);

    // 最大HPの更新 (基礎成長＋武勲＋装備＋被弾鍛錬に、階級倍率と覇王倍率が乗算で炸裂！)
    if (this.player.hitGrowthPct == null) this.player.hitGrowthPct = 0;
    if (!this.player.weaponMastery) this.player.weaponMastery = emptyMastery();
    else this.player.weaponMastery = normalizeMastery(this.player.weaponMastery);
    const tankMult = hitGrowthMult(this.player);
    const oldMaxHp = this.player.maxHp || 130;
    const baseRawHp = 130 + (rank.bonusHp || 0) + (lv - 1) * 16 + waves * 20 + minionHp + bossHp + equipHp + (isWarlord ? 150 : 0);
    const rescueHpMult = 1.0 + (rescue.hpPct || 0) * 0.01;
    const rescueDefMult = 1.0 + (rescue.defPct || 0) * 0.01;
    const rescueAtkMult = 1.0 + (rescue.atkPct || 0) * 0.01;
    const rescueSpeedMult = 1.0 + (rescue.speedPct || 0) * 0.01;
    const rescueAtkSpeedMult = 1.0 + (rescue.atkSpeedPct || 0) * 0.01;
    const newMaxHp = Math.floor(baseRawHp * rankStatMult * warlordHpMult * tankMult * rescueHpMult);
    this.player.maxHp = newMaxHp;
    if (this.player.hp > newMaxHp) {
      this.player.hp = newMaxHp;
    } else if (newMaxHp > oldMaxHp) {
      this.player.hp = Math.min(newMaxHp, this.player.hp + (newMaxHp - oldMaxHp));
    }

    const baseRawDef = equipDef + (isWarlord ? 24 : 0);
    this.player.def = Math.floor(baseRawDef * warlordDefMult * rescueDefMult);

    const wpnStyle = weaponStyleOf(this.equipped && this.equipped.weapon);
    const masteryMult = masteryAtkMult(this.player.weaponMastery, wpnStyle);
    const baseRawAtk = 25 + (rank.bonusAtk || 0) + (lv - 1) * 4 + waves * 4 + minionAtk + bossAtk + equipAtk + (isWarlord ? 25 : 0);
    this.player.atk = Math.floor(baseRawAtk * rankStatMult * warlordAtkMult * masteryMult * rescueAtkMult);
    this.player.weaponStyle = wpnStyle;
    this.player.speed = Math.floor((165 + minionSpeed + equipSpeed + (isWarlord ? 24 : 0)) * rescueSpeedMult);
    this.player.atkSpeed = (1.0 + equipAtkSpeed * 0.01 + (isWarlord ? 0.30 : 0)) * rescueAtkSpeedMult;
    this.player.crit = equipCrit + bossCrit + (isWarlord ? 30 : 0);
    this.player.vampire = equipVampire + (isWarlord ? 5 : 0);
    this.player.lightning = equipLightning;
    this.player.dmgReduction = Math.min(55, bossReduction + Math.floor(equipBlock * 0.3) + (isWarlord ? 15 : 0));
    this.player.kills = minionKills + bossKills;
  },

  recalcSoldierStats(s) {
    if(s?.isMerchantEscort){recalcEscortStats(s);return;}
    ensureSoldierAppearance(s);
    if (!s) return;
    if (s.title === '巨頭狩り') {
      s.title = '';
      s.isNamed = false;
    }
    const lv = s.level || 1;
    const waves = s.survivedWaves || 0;
    const minionKills = s.minionKills || 0;
    const bossKills = s.bossKills || 0;
    const clsKey = s.soldierClass || 'HEAVY';
    const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;

    // 雑魚撃墜枠ボーナス
    const minionAtk = Math.floor(minionKills / 5) * 1;
    const minionHp = Math.floor(minionKills / 15) * 6;

    // ボス撃破枠ボーナス (大金星ボーナス)
    const bossAtk = bossKills * 8;
    const bossHp = bossKills * 45;
    const bossReduction = Math.min(30, bossKills * 3);

    // 叙勲ボーナス
    const honorHp = s.isNamed ? 50 : 0;
    const honorAtk = s.isNamed ? 15 : 0;
    const honorDef = s.isNamed ? 12 : 0;

    // 先輩ボーナス
    const vetHp = s.isVeteran ? 30 : 0;
    const vetAtk = s.isVeteran ? 6 : 0;
    const vetDef = s.isVeteran ? 8 : 0;

    // 全部位装備ボーナス
    let equipDef = 0;
    let equipHp = 0;
    let equipAtk = 0;
    let equipSpeed = 0;
    let equipBlock = 0;

    if (!s.equipped) s.equipped = { weapon: s.weapon || null, shield: null, helmet: null, armor: null, gloves: null, legs: null, amulet: null };
    if (s.weapon && !s.equipped.weapon) s.equipped.weapon = s.weapon;
    if (s.equipped.weapon) s.weapon = s.equipped.weapon;

    Object.keys(SLOT_INFO).forEach((slotKey) => {
      const item = s.equipped[SLOT_INFO[slotKey].key];
      if (item && item.stats) {
        if (item.stats.def) equipDef += item.stats.def;
        if (item.stats.hp) equipHp += item.stats.hp;
        if (item.stats.atk) equipAtk += item.stats.atk;
        if (item.stats.speed) equipSpeed += item.stats.speed;
        if (item.stats.blockChance) equipBlock += item.stats.blockChance;
      }
    });

    // 才能（Talent）補正
    const talentKey = s.talent || 'AVERAGE';
    const talent = TALENTS[talentKey] || TALENTS.AVERAGE;

    // 死線覚醒スキル（Deathline Skills）の合算ボーナス（パーセンテージ割合設計で終盤まで永続スケール！）
    let deathlineHpMult = 1.0;
    let deathlineAtkMult = 1.0;
    let deathlineDefMult = 1.0;
    let deathlineSpeedMult = 1.0;
    let deathlineCrit = 0;
    let deathlineDmgRed = 0;
    let deathlineHealMult = 1.0;
    let deathlineRangeMult = 1.0;
    let deathlineBlock = 0;
    let deathlineDodge = 0;

    if (s.deathlineSkills && Array.isArray(s.deathlineSkills)) {
      s.deathlineSkills.forEach((skId) => {
        const sk = DEATHLINE_SKILLS[skId];
        if (sk) {
          if (sk.hpMultBonus) deathlineHpMult += sk.hpMultBonus;
          if (sk.atkMultBonus) deathlineAtkMult += sk.atkMultBonus;
          if (sk.defMultBonus) deathlineDefMult += sk.defMultBonus;
          if (sk.speedMultBonus) deathlineSpeedMult += sk.speedMultBonus;
          if (sk.allStatsMultBonus) {
            deathlineHpMult += sk.allStatsMultBonus;
            deathlineAtkMult += sk.allStatsMultBonus;
            deathlineDefMult += sk.allStatsMultBonus;
          }
          if (sk.healMultBonus) deathlineHealMult += sk.healMultBonus;
          if (sk.rangeMultBonus) deathlineRangeMult += sk.rangeMultBonus;
          if (sk.bonusCrit) deathlineCrit += sk.bonusCrit;
          if (sk.dmgReduction) deathlineDmgRed += sk.dmgReduction;
          if (sk.bonusBlock) deathlineBlock += sk.bonusBlock;
          if (sk.dodgeBonus) deathlineDodge += sk.dodgeBonus;
        }
      });
    }

    // 上位職（Advanced Class）の世界が変わる覚醒乗算倍率
    let classHpMult = 1.0;
    let classAtkMult = 1.0;
    let classDefMult = 1.0;
    let classSpeedMult = 1.0;
    let classHealMult = 1.0;

    if (cls.isAdvanced) {
      if (cls.hpMultBonus) classHpMult += cls.hpMultBonus;
      if (cls.atkMultBonus) classAtkMult += cls.atkMultBonus;
      if (cls.defMultBonus) classDefMult += cls.defMultBonus;
      if (cls.speedMultBonus) classSpeedMult += cls.speedMultBonus;
      if (cls.healMultBonus) classHealMult += cls.healMultBonus;
    }

    // 叙勲ボーナス（二つ名と名前を持つ英雄兵は全ステータス+30%乗算！）
    const honorMult = s.isNamed ? 1.30 : 1.0;

    // 先輩ボーナス（前戦を生き抜いた歴戦の古参兵は全ステータス+15%乗算！）
    const vetMult = s.isVeteran ? 1.15 : 1.0;

    if (s.hitGrowthPct == null) s.hitGrowthPct = 0;
    if (!s.weaponMastery) s.weaponMastery = emptyMastery();
    else s.weaponMastery = normalizeMastery(s.weaponMastery);
    if (!s.favoriteWeapon || !WEAPON_STYLES.includes(s.favoriteWeapon)) {
      s.favoriteWeapon = pickFavoriteWeapon(clsKey);
    }
    const tankMult = hitGrowthMult(s);
    const oldMaxHp = s.maxHp || 70;
    const baseCalcHp = (70 + (cls.bonusHp || 0) + (lv - 1) * 8 + waves * 14 + minionHp + bossHp + honorHp + vetHp + equipHp);
    const newMaxHp = Math.floor(baseCalcHp * (talent.hpMult || 1.0) * deathlineHpMult * classHpMult * honorMult * vetMult * tankMult);
    s.maxHp = newMaxHp;
    if (s.hp > newMaxHp) {
      s.hp = newMaxHp;
    } else if (newMaxHp > oldMaxHp) {
      s.hp = Math.min(newMaxHp, s.hp + (newMaxHp - oldMaxHp));
    }

    if(s.isDown)s.hp=0;

    const baseCalcDef = (cls.bonusDef || 0) + honorDef + vetDef + equipDef;
    s.def = Math.floor(baseCalcDef * deathlineDefMult * classDefMult * honorMult * vetMult);

    const wpnStyle = weaponStyleOf(s.equipped ? s.equipped.weapon : s.weapon);
    const masteryMult = masteryAtkMult(s.weaponMastery, wpnStyle);
    const baseCalcAtk = 11 + (cls.bonusAtk || 0) + (lv - 1) * 2 + waves * 3 + minionAtk + bossAtk + honorAtk + vetAtk + equipAtk;
    s.atk = Math.floor(baseCalcAtk * (talent.atkMult || 1.0) * deathlineAtkMult * classAtkMult * honorMult * vetMult * masteryMult);
    // へっぽこ遠征生存グリット（永続の小補正）
    const grit = Math.min(8, s.inferiorGrit || 0);
    if (grit > 0) {
      s.maxHp = Math.floor(s.maxHp + grit * 10);
      if (!s.isDown) s.hp = Math.min(s.maxHp, (s.hp || 0) + grit * 2);
      s.atk = Math.floor(s.atk + grit * 2);
      s.def = Math.floor((s.def || 0) + grit);
    }
    s.weaponStyle = wpnStyle;
    if(isMagicUser(s))ensureMana(s);

    const baseCalcSpeed = (cls.speed || 100) + equipSpeed + (talent.speedBonus || 0);
    s.speed = Math.max(50, Math.floor(baseCalcSpeed * deathlineSpeedMult * classSpeedMult));

    s.dmgReduction = Math.min(65, bossReduction + Math.floor((equipBlock + deathlineBlock) * 0.3) + deathlineDmgRed);
    s.crit = 10 + (cls.bonusCrit || 0) + (talent.critBonus || 0) + deathlineCrit;
    s.dodge = (talent.dodgeBonus || 0) + deathlineDodge;
    s.deathlineRangeMult = deathlineRangeMult * (cls.rangeMultBonus ? (1.0 + cls.rangeMultBonus) : 1.0);
    s.deathlineHealMult = deathlineHealMult * classHealMult;
    s.kills = minionKills + bossKills;

    // 衛生兵（MEDIC / HIGH_PRIEST）の回復力（Heal Power）計算：上位職・叙勲・死線スキルが全乗算で極限治癒！
    if (clsKey === 'MEDIC' || clsKey === 'HIGH_PRIEST' || clsKey === 'SAINT' || clsKey === 'ARCHANGEL') {
      const wItem = s.equipped ? s.equipped.weapon : null;
      const wAtk = wItem && wItem.stats ? (wItem.stats.atk || 0) : 0;
      const wUp = wItem ? (wItem.upgrade || 0) : 0;
      const wTier = wItem ? powerRank(wItem.tier) : 1;
      const rawHeal = 26 + (lv - 1) * 7 + waves * 6 + minionKills * 0.5 + bossKills * 18 + wAtk * 1.6 + wUp * 12 + (wTier - 1) * 9 + (s.isNamed ? 30 : 0) + (s.isVeteran ? 15 : 0) + (cls.isAdvanced ? 60 : 0);
      s.healPower = Math.floor(rawHeal * (talent.atkMult || 1.0) * deathlineHealMult * classHealMult * honorMult * vetMult);
    }

    // 称号の動的更新
    if (!s.isNamed) {
      const prefix = s.isVeteran ? '⭐歴戦' : '';
      if (cls.isAdvanced) {
        s.rankTitle = `${prefix}${cls.icon}${cls.name}`;
      } else if (minionKills >= 30) {
        s.rankTitle = `${prefix}⚔️百人斬り (${cls.name})`;
      } else if (waves >= 2) {
        s.rankTitle = `${prefix}🎖️叙勲候補 (${cls.name})`;
      } else {
        s.rankTitle = `${prefix}${cls.name}`;
      }
    }
  },

  resumeSavedGame(saved) {
    resetBattleLog(this);
    this._merchantShopClose?.();
    if (!saved) {
      this.startFreshGame();
      return;
    }
    this.dialogue?.reset();

    this.phase = saved.phase || saved.wave || 1;
    this.wave = this.phase;
    this.phaseDuration = PHASE_DURATION;
    this.phaseTimer = saved.phaseTimer !== undefined ? saved.phaseTimer : this.phaseDuration;
    this.restTimer=Math.max(0,Math.min(REST_DURATION,Number(saved.restTimer)||0));
    this.restUpgradeClock=Math.max(0,Math.min(.999999,Number(saved.restUpgradeClock)||0));
    this.restReport=saved.restReport || null;
    this.restMonsters=this.restTimer>0?(saved.restMonsters || []):[];
    this.totalBattleTime = saved.totalBattleTime || 0;
    this.worldTime=Math.max(0,Number(saved.worldTime)||0);
    this.lastStrongKill=saved.lastStrongKill||null;
    this.rescueBuffTimer = 0;
    this.rescueBonuses=normalizeRescueBonuses(saved.rescueBonuses);
    this.rescueRewardIds=Array.isArray(saved.rescueRewardIds)?saved.rescueRewardIds.filter(id=>typeof id==='string'):[];
    this.exp = saved.exp || 0;
    this.gold = saved.gold ?? 50;
    this.awakeningOrbs = saved.awakeningOrbs || 0;
    this.awakeningGems = saved.awakeningGems || 0;
    this.globalFundAmount = saved.globalFundAmount || String(defaultDonateAmount(saved.gold ?? 50));
    this.treasury = saved.treasury ?? 200;
    this.nation=normalizeNation(saved.nation);
    this.sharedEquipBox = Array.isArray(saved.sharedEquipBox) ? saved.sharedEquipBox : [];
    this.lastFiscalReport = saved.lastFiscalReport || null;
    this.phaseFiscal = saved.phaseFiscal?.phase===this.phase?saved.phaseFiscal:emptyFiscalLedger(this.phase || 1, this.treasury);
    this.fiscalLedger = this.phaseFiscal;
    this.scoutCandidates = [];
    this.investTarget = saved.investTarget || 'personal';
    this.rosterManageTab = 'roster';
    this.civilians = Array.isArray(saved.civilians) ? saved.civilians : [];
    this.civilianRescues = saved.civilianRescues || 0;
    this.moraleBonusTimer = 0;
    this.rankIndex = saved.rankIndex || 0;
    this.equipped = saved.equipped || { weapon: null, armor: null, amulet: null };
    this.inventory = saved.inventory || [];
    this.merchantEquipmentTier=Math.max(1,Math.min(MAX_EQUIPMENT_TIER,Number(saved.merchantEquipmentTier)||1));
    this.selectedSaleIds=new Set();this.soldierSlotSelections={};
    this.squad = saved.squad || [];
    this.reserves = saved.reserves || [];
    this.recruitSequence = saved.recruitSequence ?? [...this.squad,...this.reserves].reduce((max,s)=>Math.max(max,Number(s.name?.match(/#(\d+)/)?.[1] || 0)),0);
    this.lastReinforcements = saved.lastReinforcements || null;
    this.fog = new FogGrid();
    if (saved.fogExplored) {
      const ok = this.fog.deserialize(saved.fogExplored);
      if (!ok) console.warn('[fog] deserialize rejected — reseeding camp');
    }
    // v1.24.3 / v1.25.8: always (re)seed camp+ensure valid exploration
    this.fog.revealCamp(BASE_CAMP.x, BASE_CAMP.y);
    this.fog._campSeeded = true;
    if (!(this.civilians || []).filter(c => c && !c.rescued).length) ensureCiviliansSpawned(this, { targetCount: 4 });

    this.normalizeDeployment();
    this.deployReserves();
    while (this.squad.length < DEPLOYMENT_CAPACITY) {
      this.squad.push(this.createNewSoldier());
    }
    const legacyWorld = saved.worldVersion !== WORLD_VERSION;
    if (legacyWorld) for (const soldier of this.squad) {
      soldier.x = BASE_CAMP.x + ((soldier.x ?? 900)-900);
      soldier.y = BASE_CAMP.y + ((soldier.y ?? 900)-900);
    }

    // 既存セーブの兵士データを補填（レベル・財布・キル数・武勲）
    this.squad.forEach((s) => {
      if (s.level === undefined) s.level = 1;
      if (s.exp === undefined) s.exp = 0;
      if (s.reqExp === undefined) s.reqExp = 14;
      if (s.minionKills === undefined) s.minionKills = s.kills || 0;
      if (s.bossKills === undefined) s.bossKills = 0;
      if (s.kills === undefined) s.kills = (s.minionKills || 0) + (s.bossKills || 0);
      if (s.gold === undefined) s.gold = 15 + Math.floor(Math.random() * 15);
      if (s.medCooldown === undefined) s.medCooldown = 0;
      if (s.talent === undefined) s.talent = 'AVERAGE';
      if (s.survivedDeathlines === undefined) s.survivedDeathlines = 0;
      if (!s.deathlineSkills || !Array.isArray(s.deathlineSkills)) s.deathlineSkills = [];
      if (s.hitGrowthPct == null) s.hitGrowthPct = 0;
      if (s.timesDown == null) s.timesDown = 0;
      if (s.timesRescued == null) s.timesRescued = 0;
      if (s.rescues == null) s.rescues = 0;
      if (s.hitGrowthEvents == null) s.hitGrowthEvents = 0;
      if (!Array.isArray(s.careerPhases)) s.careerPhases = [];
      s.weaponMastery = normalizeMastery(s.weaponMastery);
      s.favoriteWeapon = migrateFavoriteForClass(s.soldierClass || 'HEAVY', s.favoriteWeapon);
      if (s.equipped?.weapon) migrateWeaponStyleFromName(s.equipped.weapon);
      if (s.weapon) migrateWeaponStyleFromName(s.weapon);
      this.recalcSoldierStats(s);
    });
    for (const s of (this.reserves || [])) {
      ensureSoldierAppearance(s);
      if (s.hitGrowthPct == null) s.hitGrowthPct = 0;
      s.weaponMastery = normalizeMastery(s.weaponMastery);
      s.favoriteWeapon = migrateFavoriteForClass(s.soldierClass || 'HEAVY', s.favoriteWeapon);
      if (s.equipped?.weapon) migrateWeaponStyleFromName(s.equipped.weapon);
      if (s.weapon) migrateWeaponStyleFromName(s.weapon);
    }
    // 隊長装備・バッグも名称プレースホルダを実スタイルへ（隊長は全種装備可・制限なし）
    for (const it of Object.values(this.equipped || {})) {
      if (it) migrateWeaponStyleFromName(it);
    }
    for (const it of (this.inventory || [])) {
      if (it) migrateWeaponStyleFromName(it);
    }

    for(const soldier of [...this.squad,...this.reserves]) {
      if(soldier.isDown){soldier.hp=0;soldier.rescueProgress=0;delete soldier.rescueHealerId;}
    }
    const pSave = saved.player || {};
    this.player = {
      x: legacyWorld ? BASE_CAMP.x-20 : (pSave.x ?? BASE_CAMP.x-20),
      y: legacyWorld ? BASE_CAMP.y-20 : (pSave.y ?? BASE_CAMP.y-20),
      isHero: true,
      level: pSave.level || 1,
      isAdvanced: !!pSave.isAdvanced,
      advancedClass: pSave.advancedClass || null,
      exp: pSave.exp || 0,
      reqExp: pSave.reqExp || 20,
      minionKills: pSave.minionKills !== undefined ? pSave.minionKills : (pSave.kills || 0),
      bossKills: pSave.bossKills || 0,
      kills: (pSave.minionKills !== undefined ? pSave.minionKills : (pSave.kills || 0)) + (pSave.bossKills || 0),
      survivedWaves: pSave.survivedWaves || 0,
      phaseActivity: pSave.phaseActivity || emptyActivity(),
      hitGrowthPct: Math.max(0, Math.min(HIT_GROWTH_SOFT_CAP, Number(pSave.hitGrowthPct) || 0)),
      weaponMastery: normalizeMastery(pSave.weaponMastery),
      magicAttackTimer:Math.max(0,Math.min(11,Number(pSave.magicAttackTimer)||0)),
      magicAttackBonus:Math.max(0,Math.min(.25,Number(pSave.magicAttackBonus)||0)),
      magicWardTimer:Math.max(0,Math.min(11,Number(pSave.magicWardTimer)||0)),
      magicWardBonus:Math.max(0,Math.min(.2,Number(pSave.magicWardBonus)||0)),
      ammo:pSave.ammo,
      hp: pSave.hp || 130,
      maxHp: pSave.maxHp || 130,
      atk: 25,
      atkSpeed: 1.0,
      speed: 165,
      atkCooldown: 0,
      powerAtkCooldown: 0,
      powerAtkMaxCd: 8.0,
      crit: 10,
      vampire: 0,
      lightning: false,
      dmgReduction: 0,
      slashAngle: 0,
      slashAnim: 0,
      facingAngle: 0
    };
    sanitizeCarriers(this);
    this.recalcPlayerStats();

    this.initPlatoons();
    if (saved.platoonMissions) restorePlatoonMissions(this.platoons, saved.platoonMissions);
    this.initOutposts();
    this.initDungeons();
    this.merchantCampSeed=Number.isInteger(saved.merchantCampSeed)?saved.merchantCampSeed:Math.floor(Math.random()*4294967296);
    initMerchants(this, generateRandomDrop, BASE_CAMP);
    if (saved.merchants) applyMerchantSave(this, saved.merchants, generateRandomDrop, BASE_CAMP);
    sanitizeCarriers(this);
    if (!legacyWorld && saved.dungeons) {
      this.dungeons = this.dungeons.map(d=>({...d,...saved.dungeons.find(old=>old.id===d.id)}));
    } else if(saved.dungeons) {
      for(const old of saved.dungeons) {
        const d = this.dungeons.find(x => x.id === old.id);
        if (d) Object.assign(d, { cleared: old.cleared, discovered: old.discovered, clearedWave: old.clearedWave });
      }
    }
    if (!legacyWorld && saved.outposts) this.outposts = saved.outposts;
    else if(saved.outposts) for(const old of saved.outposts) {
      const op=this.outposts.find(o=>o.type===old.type);
      if(op) Object.assign(op,{hp:old.hp,cleared:old.cleared,clearedWave:old.clearedWave});
    }
    for(const op of this.outposts) {
      const ratio=Math.max(0,Math.min(1,op.hp/Math.max(1,op.maxHp)));
      op.maxHp=Math.round(OUTPOST_DEFS[op.type].maxHp*distanceScaling(Math.hypot(op.x-BASE_CAMP.x,op.y-BASE_CAMP.y)).hp);
      op.hp=op.cleared?0:Math.round(op.maxHp*ratio);
    }
    if (!legacyWorld && saved.currentQuest) {
      this.currentQuest=saved.currentQuest; this.updateQuestUI();
    } else this.assignWaveQuest();
    this.recalcPlayerStats();
    if (pSave.hp) this.player.hp = Math.min(this.player.maxHp, pSave.hp);

    this.initBattlefield();
    this.phaseCasualties = saved.phaseCasualties ?? 0;
    this.phaseInitialSquadCount = saved.phaseInitialSquadCount ?? this.squad.length;
    initializeGateGuards(this,saved);initializeInvasions(this,saved);initializeMedicalPosts(this,saved);
    initializeSupplies(this,saved);
    initializeMagic(this,saved);this.damageFields=[];this._hazardClock=0;
    this.updateStatsUI();
    this.camera = { x: BASE_CAMP.x, y: BASE_CAMP.y };
    this.startGameLoop();
    this.camera = {x:this.player.x,y:this.player.y};
    this.autoSaveClock = 0;
    this.saveGame();
    this.showToast(`第${this.wave}期から遠征を再開しました`);
  },

  ensureFog() {
    if (!this.fog) this.fog = new FogGrid();
    return this.fog;
  },

  revealFogAroundPlayer(force = false) {
    const fog = this.ensureFog();
    if (!this.player || this.currentDungeon) return;
    if (!Number.isFinite(this.player.x) || !Number.isFinite(this.player.y)) return;
    const empty = typeof fog.hasExploration === 'function' ? !fog.hasExploration() : true;
    const invalid = typeof fog.isValid === 'function' && !fog.isValid();
    const playerDark = typeof fog.isExploredWorld === 'function' && !fog.isExploredWorld(this.player.x, this.player.y);
    // v1.25.11: empty/invalid/force → camp seed; then ALWAYS clear _lastX before player stamp
    // (revealCamp sets _lastX to camp, which made revealAt early-out via REVEAL_MOVE_EPS)
    if (force || empty || invalid || !fog._campSeeded) {
      fog._lastX = NaN;
      fog._lastY = NaN;
      fog.revealCamp(BASE_CAMP.x, BASE_CAMP.y);
      fog._campSeeded = true;
    }
    if (force || playerDark || empty || invalid) {
      fog._lastX = NaN;
      fog._lastY = NaN;
    }
    if (typeof fog.forceRevealAt === 'function' && (force || playerDark)) {
      fog.forceRevealAt(this.player.x, this.player.y, FOG_REVEAL_RADIUS);
    } else {
      fog.revealAt(this.player.x, this.player.y, FOG_REVEAL_RADIUS);
    }
    if (fog.mark) {
      const cell = fog.cell || 512;
      fog.mark(Math.floor(this.player.x / cell), Math.floor(this.player.y / cell));
    }
    // If still nothing under player, force one more camp+player stamp (never leave pitch-black)
    if (typeof fog.isExploredWorld === 'function' && !fog.isExploredWorld(this.player.x, this.player.y)) {
      fog._lastX = NaN; fog._lastY = NaN;
      fog.revealCamp(BASE_CAMP.x, BASE_CAMP.y);
      if (typeof fog.forceRevealAt === 'function') {
        fog.forceRevealAt(this.player.x, this.player.y, Math.max(FOG_REVEAL_RADIUS, FOG_CAMP_REVEAL));
      } else {
        fog._lastX = NaN; fog._lastY = NaN;
        fog.revealAt(this.player.x, this.player.y, Math.max(FOG_REVEAL_RADIUS, FOG_CAMP_REVEAL));
      }
      fog.mark(Math.floor(this.player.x / (fog.cell || 512)), Math.floor(this.player.y / (fog.cell || 512)));
    }
  },

  initBattlefield() {
    this.inBattle = true;
    this.monsters = [];
    this.particles = [];
    const fog = this.ensureFog();
    // v1.24.3: always re-seed camp on battlefield entry (idempotent OR into bitgrid)
    fog.revealCamp(BASE_CAMP.x, BASE_CAMP.y);
    fog._campSeeded = true;
    this.revealFogAroundPlayer(true);
    this.damageTexts = [];
    this.dropsOnField = [];
    this.projectiles = [];
    this.spawnTimer = 0;
    this.screenShake = 0;

    // シームレス時間区切り制パラメーター
    this.phase = this.phase || this.wave || 1;
    this.wave = this.phase;
    this.phaseDuration = PHASE_DURATION; // 1作戦期＝120秒
    this.phaseTimer = this.phaseTimer || this.phaseDuration;
    this.phaseCasualties = 0;
    this.phaseInitialSquadCount = this.squad ? this.squad.filter(s => !s.dead).length : DEPLOYMENT_CAPACITY;
    this.colossalBossRespawnTimer = COLOSSAL_FIRST_SPAWN; // 初回降臨まで（v1.23.2: 12→60秒）

    // 初期の戦場モンスターを各ゾーンに自然配置
    if(!(this.restTimer>0))this.seedInitialMonsters();
  },

  createNewSoldier(index = null) {
    index ??= (this.recruitSequence || 0) + 1;
    this.recruitSequence = Math.max(this.recruitSequence || 0, index);
    const classKeys = ['HEAVY', 'LIGHT', 'ARCHER', 'MEDIC', 'MAGE'];
    const classKey = classKeys[(index - 1) % classKeys.length];
    const soldierCls = SOLDIER_CLASSES[classKey];
    const platoonId = (index - 1) % 3;

    // クラスごとの初期武器・初期防具の支給
    const favoriteWeapon = pickFavoriteWeapon(classKey);
    const starterNameByStyle = {
      sword: '木の短剣', spear: '木の槍', hammer: '木の戦鎚',
      bow: '木の短弓', crossbow: '木の石弓', cannon: '木造の手砲'
    };
    let starterStyle = favoriteWeapon;
    let starterName = starterNameByStyle[starterStyle] || '木の短剣';
    if (classKey === 'MEDIC' || classKey === 'HIGH_PRIEST' || classKey === 'MAGE') {
      starterStyle = 'sword';
      starterName = '樫の杖';
    } else if (classKey === 'ARCHER' || classKey === 'SNIPER') {
      // 旧バグ: 名称だけ「短弓」で weaponStyle が sword だった。実スタイルへ。
      starterStyle = RANGED_STYLES.includes(favoriteWeapon) ? favoriteWeapon : 'bow';
      starterName = starterNameByStyle[starterStyle] || '木の短弓';
    } else if (!MELEE_STYLES.includes(starterStyle)) {
      starterStyle = 'sword';
      starterName = '木の短剣';
    }
    const initialEquip = {
      weapon: {
        id: Math.random().toString(36).substring(2, 9),
        name: starterName,
        baseName: starterName,
        type: 'WEAPON',
        tier: 1,
        upgrade: 0,
        mat: '木/布',
        color: '#94a3b8',
        weaponStyle: starterStyle,
        stats: { atk: classKey === 'ARCHER' ? 12 : (classKey === 'LIGHT' ? 14 : (classKey === 'HEAVY' ? 10 : 8)) }
      },
      shield: classKey === 'HEAVY' ? {
        id: Math.random().toString(36).substring(2, 9),
        name: '木の丸盾',
        baseName: '木の丸盾',
        type: 'SHIELD',
        tier: 1,
        upgrade: 0,
        mat: '木/布',
        color: '#94a3b8',
        stats: { def: 15, hp: 30, blockChance: 25 }
      } : null,
      helmet: null,
      armor: {
        id: Math.random().toString(36).substring(2, 9),
        name: '布の服',
        baseName: '布の服',
        type: 'ARMOR',
        tier: 1,
        upgrade: 0,
        mat: '木/布',
        color: '#94a3b8',
        stats: { def: 8, hp: 25 }
      },
      gloves: null,
      legs: null,
      amulet: null
    };

    if(classKey==='MAGE')initialEquip.armor.stats={def:0,hp:0};
    if (initialEquip.weapon && classKey !== 'MEDIC' && classKey !== 'HIGH_PRIEST' && classKey !== 'MAGE') {
      applyUpgradeStats(initialEquip.weapon, 0);
    }

    // 才能（Talent）の抽選：大半は凡庸(~65%)・へっぽこ(15%)、有望(14%)、英才(~5.75%)、稀代の天才(0.25%)！
    const roll = Math.random();
    let talentKey = 'AVERAGE';
    if (roll < 0.0025) {
      talentKey = 'GENIUS';
      this.showToast(`🌟【奇跡の新兵！】稀代の天才【兵士#${index}】が入隊！(全能力+70%, 成長率2倍)`);
      sound.playHighScore();
    } else if (roll < 0.06) {
      talentKey = 'ELITE';
    } else if (roll < 0.20) {
      talentKey = 'TALENTED';
    } else if (roll < 0.35) {
      talentKey = 'INFERIOR';
    } else {
      talentKey = 'AVERAGE';
    }

    const soldier = {
      id: Math.random().toString(36).substring(2, 9),
      isNamed: false,
      isVeteran: false,
      title: '',
      name: `兵士#${index}`,
      soldierClass: classKey,
      platoonId,
      talent: talentKey,
      survivedDeathlines: 0,
      deathlineSkills: [],
      survivedWaves: 0,
      phaseActivity: emptyActivity(),
      favoriteWeapon,
      hitGrowthPct: 0,
      weaponMastery: emptyMastery(),
      timesDown: 0,
      timesRescued: 0,
      rescues: 0,
      hitGrowthEvents: 0,
      careerPhases: [],
      level: 1,
      exp: 0,
      reqExp: 14,
      healingHp: 0,
      healingExp: 0,
      healingExpRemainder: 0,
      revivalExp: 0,
      minionKills: 0,
      bossKills: 0,
      kills: 0,
      gold: 18 + Math.floor(Math.random() * 18),
      medCooldown: 0,
      rankTitle: `${soldierCls.name}`,
      hp: 75,
      maxHp: 75,
      def: 0,
      atk: 12,
      dmgReduction: 0,
      equipped: initialEquip,
      weapon: initialEquip.weapon,
      atkCooldown: 0,
      facingAngle: 0,
      atkAnim: 0,
      x: BASE_CAMP.x + (Math.random() - 0.5) * 120,
      y: BASE_CAMP.y + (Math.random() - 0.5) * 120,
      vx: 0,
      vy: 0,
      isDown: false,
      downTimer: 0,
      rescueProgress: 0,
      dead: false
    };

    this.recalcSoldierStats(soldier);
    soldier.hp = soldier.maxHp;
    return soldier;
  },

  saveGame() {
    if (!this.activeSlotId || !this.player || this.player.hp <= 0) return null;
    try {
      const data = {
        ammoReserve:this.ammoReserve||0,
        magicReserve:this.magicReserve||0,
        squadPotion:this.squadPotion?1:0,
        worldVersion: WORLD_VERSION,
        phase: this.phase || this.wave || 1,
        phaseTimer: this.phaseTimer,
        restTimer:this.restTimer || 0,
        restUpgradeClock:this.restUpgradeClock || 0,
        restReport:this.restReport,
        restMonsters:this.restTimer>0?(this.restMonsters || []).map(persistentUnit):[],
        phaseCasualties: this.phaseCasualties || 0,
        phaseInitialSquadCount: this.phaseInitialSquadCount,
        totalBattleTime: this.totalBattleTime || 0,
        worldTime:this.worldTime || 0,
        lastStrongKill:this.lastStrongKill||null,
        wave: this.phase || this.wave || 1,
        exp: this.exp,
        gold: this.gold,
        awakeningOrbs: this.awakeningOrbs || 0,
        awakeningGems: this.awakeningGems || 0,
        globalFundAmount: this.globalFundAmount || String(defaultDonateAmount(this.gold || 0)),
        treasury: this.treasury || 0,
        nation: normalizeNation(this.nation),
        invasions:serializeInvasions(this),
        gateGuards:serializeGateGuards(this),
        gatePosts:serializeGatePosts(this),
        medicalPostIds:serializeMedicalPosts(this),
        sharedEquipBox: this.sharedEquipBox || [],
        civilians: (this.civilians || []).filter(c => c && !c.rescued).slice(0, 8),
        civilianRescues: this.civilianRescues || 0,
        lastFiscalReport: this.lastFiscalReport || null,
        phaseFiscal: this.phaseFiscal || null,
        investTarget: this.investTarget || 'personal',
        rankIndex: this.rankIndex,
        player: {
          x: this.player.x, y: this.player.y,
          magicAttackTimer:this.player.magicAttackTimer||0,
          magicAttackBonus:this.player.magicAttackBonus||0,
          magicWardTimer:this.player.magicWardTimer||0,
          magicWardBonus:this.player.magicWardBonus||0,
          ammo:this.player.ammo,
          invulnerableTimer:this.player.invulnerableTimer||0,
          lethalGuardCooldown:this.player.lethalGuardCooldown||0,
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          level: this.player.level || 1,
          isAdvanced: !!this.player.isAdvanced,
          advancedClass: this.player.advancedClass || null,
          exp: this.player.exp || 0,
          reqExp: this.player.reqExp || 20,
          minionKills: this.player.minionKills || 0,
          bossKills: this.player.bossKills || 0,
          kills: this.player.kills || 0,
          survivedWaves: this.player.survivedWaves || 0,
          phaseActivity: this.player.phaseActivity || emptyActivity(),
          hitGrowthPct: this.player.hitGrowthPct || 0,
          weaponMastery: normalizeMastery(this.player.weaponMastery)
        },
        equipped: this.equipped,
        inventory: this.inventory,
        squad: this.squad.filter(s => !s.dead).map(persistentUnit),
        reserves: (this.reserves || []).map(persistentUnit),
        recruitSequence: this.recruitSequence || 0,
        lastReinforcements: this.lastReinforcements,
        outposts: this.outposts,
        merchants: serializeMerchants(this.merchants),
        rescueBonuses:normalizeRescueBonuses(this.rescueBonuses),
        rescueRewardIds:this.rescueRewardIds||[],
        merchantCampSeed:this.merchantCampSeed,
        merchantEquipmentTier:latestEquipmentTier(this),
        dungeons: this.dungeons,
        currentQuest: this.currentQuest,
        fogExplored: this.ensureFog().serialize(),
        platoonMissions: persistPlatoonMissions(this.platoons)
      };
      normalizeFieldSave(this,data);
      if (!saveSlots.update(this.activeSlotId, {data, state:'active'})) throw new Error('保存容量が不足しています');
      return data;
    } catch (e) {
      console.warn('Save failed:', e);
      this.showToast('保存に失敗しました。ブラウザの空き容量を確認してください');
      return null;
    }
  },

  setupInput() {
    this.joystick = { active: false, x: 0, y: 0, dirX: 0, dirY: 0 };

    const stickBase = document.getElementById('dpad-base');
    const stickKnob = document.getElementById('dpad-knob');

    // 下部バーチャルアナログパッドのタッチハンドラ
    if (stickBase && stickKnob) {
      let touchId = null;

      const handleStickStart = (e) => {
        if (!this.inBattle) return;
        sound.unlock();
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches ? e.touches[0] : e;
        if (e.touches) touchId = touch.identifier;
        updateStick(touch);
      };

      const handleStickMove = (e) => {
        if (!this.inBattle || !this.joystick.active) return;
        e.preventDefault();
        e.stopPropagation();
        let touch = e;
        if (e.touches) {
          for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === touchId) {
              touch = e.touches[i];
              break;
            }
          }
        }
        updateStick(touch);
      };

      const handleStickEnd = (e) => {
        this.joystick.active = false;
        this.joystick.dirX = 0;
        this.joystick.dirY = 0;
        touchId = null;
        stickKnob.style.transform = 'translate(-50%, -50%)';
      };

      const updateStick = (pointer) => {
        const rect = stickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = pointer.clientX - centerX;
        const dy = pointer.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const maxRadius = rect.width * 0.42;

        this.joystick.active = true;
        if (dist > 0) {
          this.joystick.dirX = dx / Math.max(dist, 1);
          this.joystick.dirY = dy / Math.max(dist, 1);
        } else {
          this.joystick.dirX = 0;
          this.joystick.dirY = 0;
        }

        const clampedDist = Math.min(dist, maxRadius);
        const knobX = (dx / (dist || 1)) * clampedDist;
        const knobY = (dy / (dist || 1)) * clampedDist;
        stickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      };

      this.stickHandlers = { start: handleStickStart, move: handleStickMove, end: handleStickEnd };
      stickBase.addEventListener('mousedown', handleStickStart);
      window.addEventListener('mousemove', handleStickMove);
      window.addEventListener('mouseup', handleStickEnd);

      stickBase.addEventListener('touchstart', handleStickStart, { passive: false });
      window.addEventListener('touchmove', handleStickMove, { passive: false });
      window.addEventListener('touchend', handleStickEnd);
      window.addEventListener('touchcancel', handleStickEnd);
    }

    // キャンバス上の直接スワイプ ＆ ピンチズーム ＆ ホイールズーム
    let canvasDown = false;
    let originX = 0, originY = 0;
    let pinchStartDist = null;
    let pinchStartZoom = 1.0;

    const onCanvasStart = (e) => {
      if (!this.inBattle) return;
      // コントローラー以外の場所を触った時
      if (e.target.closest('#virtual-gamepad') || e.target.closest('#strategy-modal')) return;
      sound.unlock();

      if (e.touches && e.touches.length >= 2) {
        // 2本指ピンチ開始
        canvasDown = false;
        this.joystick.active = false;
        const t0 = e.touches[0], t1 = e.touches[1];
        pinchStartDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        pinchStartZoom = this.zoom || 1.0;
        return;
      }

      canvasDown = true;
      const pos = this.getEventPos(e);
      originX = pos.x;
      originY = pos.y;
      this.joystick.active = true;
    };

    const onCanvasMove = (e) => {
      if (!this.inBattle) { canvasDown = false; pinchStartDist = null; return; }
      if (e.touches && e.touches.length >= 2 && pinchStartDist) {
        if (e.cancelable) e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        const curDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const ratio = curDist / Math.max(15, pinchStartDist);
        const newZoom = Math.max(0.65, Math.min(1.65, pinchStartZoom * ratio));
        this.zoom = Number(newZoom.toFixed(2));
        const btn = document.getElementById('btn-zoom-toggle');
        if (btn) btn.textContent = `🔍 ${this.zoom.toFixed(2)}x`;
        return;
      }

      if (!canvasDown) return;
      const pos = this.getEventPos(e);
      const dx = pos.x - originX;
      const dy = pos.y - originY;
      const dist = Math.hypot(dx, dy);
      if (dist > 5) {
        this.joystick.dirX = dx / dist;
        this.joystick.dirY = dy / dist;
      }
    };

    const onCanvasEnd = (e) => {
      if (e.touches && e.touches.length < 2) {
        pinchStartDist = null;
      }
      if (!e.touches || e.touches.length === 0) {
        canvasDown = false;
        this.joystick.active = false;
        this.joystick.dirX = 0;
        this.joystick.dirY = 0;
        pinchStartDist = null;
      }
    };

    const onWheel = (e) => {
      if (e.cancelable) e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      this.setZoom(Math.max(0.65, Math.min(1.65, (this.zoom || 1.0) + delta)));
    };

    this.boundDown = onCanvasStart;
    this.boundMove = onCanvasMove;
    this.boundUp = onCanvasEnd;
    this.boundWheel = onWheel;

    this.canvas.addEventListener('mousedown', onCanvasStart);
    window.addEventListener('mousemove', onCanvasMove);
    window.addEventListener('mouseup', onCanvasEnd);

    this.canvas.addEventListener('touchstart', onCanvasStart, { passive: false });
    window.addEventListener('touchmove', onCanvasMove, { passive: false });
    window.addEventListener('touchend', onCanvasEnd);
    window.addEventListener('touchcancel', onCanvasEnd);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });
  },

  getEventPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  },

  getNearestUnclearedOutpost(x, y) {
    if (!this.outposts) return null;
    let nearest = null;
    let minDist = 9999;
    for (const op of this.outposts) {
      if (op.cleared) continue;
      const d = Math.hypot(op.x - x, op.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = op;
      }
    }
    return nearest;
  },

  // 右手パッド手動攻撃（自動攻撃と同一 atkCooldown を共有・タップ連打でCD無視しない）
  manualAttack() {
    if (!this.inBattle || !this.player || this.player.hp <= 0) return;
    if ((this.player.atkCooldown || 0) > 0) return; // クール中は無視（自動攻撃と共有）

    const nearest = this.getNearestMonster(this.player.x, this.player.y);
    const nearestOp = this.getNearestUnclearedOutpost(this.player.x, this.player.y);
    const wProf = this.combatProfileFor(this.player, (this.equipped && this.equipped.weapon) || null, true);
    const isWarlord = !!this.player.isAdvanced;
    const reach = isWarlord ? wProf.reachWarlord : (wProf.playerReach||Math.max(110,wProf.reach));
    const baseCd = isWarlord ? Math.min(0.42/(wProf.stone?.75:1), wProf.baseCooldown * 0.8) : wProf.baseCooldown;
    const applySharedCd = () => {
      // 自動攻撃ループと同じ式（manual/auto で攻撃速度共有）
      this.player.atkCooldown = baseCd / (this.player.atkSpeed || 1);
      this.player.slashAnim = 1;
    };

    if (nearest && Math.hypot(nearest.x - this.player.x, nearest.y - this.player.y) <= reach) {
      applySharedCd();
      this.player.slashAngle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
      if (wProf.ranged) {
        this.spawnRangedProjectile(this.player, nearest, this.player.atk, wProf, true);

      } else if (wProf.pierce) {
        const ang = this.player.slashAngle;
        const cos = Math.cos(ang), sin = Math.sin(ang);
        let hit = false;
        for (const m of this.monsters || []) {
          if (!m || m.hp <= 0) continue;
          const dx = m.x - this.player.x, dy = m.y - this.player.y;
          const along = dx * cos + dy * sin;
          if (along < -8 || along > reach) continue;
          const perp = Math.abs(-dy * cos + dx * sin);
          if (perp <= wProf.pierceHalfWidth + (m.radius || 12)) {
            this.performAttack(this.player, m, true, undefined, along);
            hit = true;
          }
        }
        if (!hit) this.performAttack(this.player, nearest, true);
      } else {
        this.performMeleeSweep(this.player,nearest,true,undefined,wProf,reach);
      }
    } else if (nearestOp && Math.hypot(nearestOp.x - this.player.x, nearestOp.y - this.player.y) <= nearestOp.radius + (wProf.ranged ? wProf.reach : 60)) {
      applySharedCd();
      this.player.slashAngle = Math.atan2(nearestOp.y - this.player.y, nearestOp.x - this.player.x);
      sound.playSlash();
      this.damageOutpost(nearestOp,wProf.ranged?takeRangedShot(this.player,this.player.atk*1.5).damage:this.player.atk*1.5);
    } else {
      // 射程外の素振りはCD消費なし（ダメージなし）。連打ダメージは上のCDゲートで阻止済み。
      sound.playSlash();
      this.player.slashAnim = 1;
      if (this.joystick.dirX !== 0 || this.joystick.dirY !== 0) {
        this.player.slashAngle = Math.atan2(this.joystick.dirY, this.joystick.dirX);
      }
    }
  },

  /** 装備とスタイルにマスタリー（攻撃速度・リロード/爆発）を乗せた戦闘プロファイル */
  applyEquipmentUpgrade(item,level) {applyUpgradeStats(item,level);},

  equipmentValueFor(soldier,item,key) {return soldierEquipmentValue(this,soldier,item,key,SOLDIER_CLASSES);},

  combatProfileFor(unit, item, isPlayer = false) {
    const base = weaponCombatProfile(item || null);
    const mastery = isPlayer
      ? (this.player && this.player.weaponMastery)
      : (unit && unit.weaponMastery);
    return ammoCombatProfile(unit,applyMasteryToCombatProfile(base, mastery));
  },

  pushShockwave(x, y, maxRadius, color, subColor, life = 0.45, lineWidth = 4) {
    if (!this.shockwaves) this.shockwaves = [];
    this.shockwaves.push({
      x, y, maxRadius, currentRadius: Math.min(24, maxRadius * 0.12),
      color, subColor, life, maxLife: life, lineWidth
    });
  },

  powerFacingAngle() {
    const p = this.player;
    if (!p) return 0;
    if (Number.isFinite(p.slashAngle) && (p.slashAnim || 0) > 0) return p.slashAngle;
    if (this.joystick && (this.joystick.dirX || this.joystick.dirY)) {
      return Math.atan2(this.joystick.dirY, this.joystick.dirX);
    }
    return Number.isFinite(p.facingAngle) ? p.facingAngle : 0;
  },

  powerKnockStun(m, knockDist, stunSec) {
    if (!m || m.hp <= 0) return;
    if (!m.isColossal && knockDist > 0) {
      const knockAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
      m.x += Math.cos(knockAngle) * knockDist;
      m.y += Math.sin(knockAngle) * knockDist;
    }
    m.atkTimer = Math.max(m.atkTimer || 0, stunSec);
  },

  powerHitOutpost(radius, dmg) {
    const nearestOp = this.getNearestUnclearedOutpost(this.player.x, this.player.y);
    if (!nearestOp) return;
    const distOp = Math.hypot(nearestOp.x - this.player.x, nearestOp.y - this.player.y);
    if (distOp <= nearestOp.radius + radius * 0.75) {
      this.damageOutpost(nearestOp, Math.round(dmg * 0.85));
      this.spawnSparks(nearestOp.x, nearestOp.y, '#f59e0b', 14);
    }
  },

  updatePowerFx(dt) {
    if (!this.powerFx || !this.powerFx.length) return;
    const px = this.player ? this.player.x : 0;
    const py = this.player ? this.player.y : 0;
    for (let i = this.powerFx.length - 1; i >= 0; i--) {
      const fx = this.powerFx[i];
      fx.delay = (fx.delay || 0) - dt;
      if (fx.delay > 0) continue;
      if (fx.spent) { this.powerFx.splice(i, 1); continue; }
      fx.spent = true;
      if (fx.kind === 'sword_second') {
        let n = 0;
        for (const m of this.monsters || []) {
          if (!m || m.hp <= 0) continue;
          if (Math.hypot(m.x - (fx.x || px), m.y - (fx.y || py)) <= fx.radius) {
            n++;
            this.performAttack(this.player, m, true, fx.dmg);
            this.powerKnockStun(m, 40, 0.55);
          }
        }
        this.pushShockwave(fx.x || px, fx.y || py, fx.radius * 0.85, '#fde047', '#38bdf8', 0.28, 3);
        if (n > 0) this.spawnDamageText(px, py - 50, `二連目 ×${n}`, '#fde047');
      } else if (fx.kind === 'arrow_rain') {
        let n = 0;
        for (const m of this.monsters || []) {
          if (!m || m.hp <= 0) continue;
          if (Math.hypot(m.x - fx.x, m.y - fx.y) <= fx.radius) {
            n++;
            this.performAttack(this.player, m, true, fx.dmg);
          }
        }
        for (let k = 0; k < 6; k++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * fx.radius;
          this.pushParticle({
            x: fx.x + Math.cos(ang) * dist, y: fx.y + Math.sin(ang) * dist - 50,
            vx: 0, vy: 160, color: '#bae6fd', size: 2, life: 0.35
          });
        }
      } else if (fx.kind === 'cluster_blast') {
        let n = 0;
        for (const m of this.monsters || []) {
          if (!m || m.hp <= 0) continue;
          if (Math.hypot(m.x - fx.x, m.y - fx.y) <= fx.radius) {
            n++;
            this.performAttack(this.player, m, true, fx.dmg);
            this.powerKnockStun(m, 42, 0.7);
          }
        }
        this.pushShockwave(fx.x, fx.y, fx.radius, '#f59e0b', '#ef4444', 0.35, 4);
        this.spawnSparks(fx.x, fx.y, '#fbbf24', 12);
        sound.playBomb();
      }
      this.powerFx.splice(i, 1);
    }
  },

  // 右手パッド パワーアタック（武器スタイル別強撃）
  triggerPowerAttack() {
    if (!this.inBattle || !this.player || this.player.hp <= 0) return;

    if ((this.player.powerAtkCooldown || 0) > 0) {
      sound.playTap();
      this.spawnDamageText(this.player.x, this.player.y - 24, `⏳CT中 (${this.player.powerAtkCooldown.toFixed(1)}s)`, '#fbbf24');
      return;
    }

    const isWarlord = !!this.player.isAdvanced;
    const wpn = (this.equipped && this.equipped.weapon) || null;
    const style = weaponStyleOf(wpn);
    // CTは全スタイル概ね公平（8秒基準）
    const cdByStyle = { sword: 7.5, spear: 8.0, hammer: 8.2, bow: 8.0, crossbow: 8.2, cannon: 8.6 };
    this.player.powerAtkCooldown = cdByStyle[style] || 8.0;
    this.updatePowerAtkButtonUI();

    // A ranged strong attack uses one round per rain tick / cluster shell.
    // With no rounds, throw a single stone without explosive or area effects.
    let powerShots=0;
    if(RANGED_STYLES.includes(style)) {
      if(ensureAmmo(this.player)===0) {
        const profile=this.combatProfileFor(this.player,wpn,true);
        const target=this.getNearestMonster(this.player.x,this.player.y);
        const factor=style==='cannon'?(isWarlord?2.1:1.65):style==='crossbow'?(isWarlord?5:3.9):(isWarlord?.95:.78);
        if(target&&Math.hypot(target.x-this.player.x,target.y-this.player.y)<=profile.reach)this.spawnRangedProjectile(this.player,target,this.player.atk*factor,profile,true);
        else {const op=this.getNearestUnclearedOutpost(this.player.x,this.player.y);if(op&&Math.hypot(op.x-this.player.x,op.y-this.player.y)<=op.radius+profile.reach)this.damageOutpost(op,takeRangedShot(this.player,this.player.atk*factor).damage);}
        this.player.slashAnim=1;this.showToast('弾切れ：石投げ（75%）。補給地点へ戻ってください');return;
      }
      const requested=style==='bow'?(isWarlord?6:4):style==='cannon'?(isWarlord?5:4):1;
      powerShots=Math.min(ensureAmmo(this.player),requested);this.player.ammo-=powerShots;
    }
    this.player.slashAnim = 1.6;
    const face = this.powerFacingAngle();
    this.player.slashAngle = face;
    this.player.facingAngle = face;
    this.screenShake = isWarlord ? 0.75 : 0.55;
    sound.playWeapon(style,this.player.x,this.player.y);

    let hitCount = 0;
    let skillName = '💥【渾身強撃】';
    let skillColor = isWarlord ? '#f59e0b' : '#00f0ff';
    const baseAtk = (this.player.atk || 15)*(RANGED_STYLES.includes(style)?RANGED_DAMAGE_MULT:1);
    const px = this.player.x, py = this.player.y;

    if (style === 'spear') {
      skillName = isWarlord ? '🔱【覇王穿衝扇】' : '🔱【烈槍扇穿】';
      skillColor = '#a7f3d0';
      const reach = isWarlord ? 290 : 230;
      const halfAngle = isWarlord ? 0.72 : 0.58;
      const dmg = Math.round(baseAtk * (isWarlord ? 4.6 : 3.5));
      const cos = Math.cos(face), sin = Math.sin(face);
      for (const m of this.monsters || []) {
        if (!m || m.hp <= 0) continue;
        const dx = m.x - px, dy = m.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist > reach || dist < 1) continue;
        const ang = Math.atan2(dy, dx);
        let diff = ang - face;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > halfAngle) continue;
        hitCount++;
        this.performAttack(this.player, m, true, dmg);
        this.powerKnockStun(m, isWarlord ? 70 : 48, isWarlord ? 1.2 : 0.85);
      }
      this.powerHitOutpost(reach * 0.7, dmg);
      for (let i = 0; i < 7; i++) {
        const a = face - halfAngle + (halfAngle * 2 * i) / 6;
        this.pushParticle({
          x: px + Math.cos(a) * 30, y: py + Math.sin(a) * 30,
          vx: Math.cos(a) * reach * 2.2, vy: Math.sin(a) * reach * 2.2,
          color: i === 3 ? '#f7f3e8' : '#86efac', size: 2.5, life: 0.28
        });
      }
      this.pushShockwave(px + cos * reach * 0.55, py + sin * reach * 0.55, 70, '#6ee7b7', '#ecfdf5', 0.35, 3);
    } else if (style === 'hammer') {
      skillName = isWarlord ? '🔨【覇王滅砕撃】' : '🔨【剛鎚滅殺】';
      skillColor = '#fdba74';
      const nearest = this.getNearestMonster(px, py);
      const dmg = Math.round(baseAtk * (isWarlord ? 8.4 : 6.6));
      if (nearest && Math.hypot(nearest.x - px, nearest.y - py) <= (isWarlord ? 150 : 120)) {
        hitCount = 1;
        this.player.slashAngle = Math.atan2(nearest.y - py, nearest.x - px);
        this.performAttack(this.player, nearest, true, dmg);
        this.powerKnockStun(nearest, isWarlord ? 130 : 100, isWarlord ? 2.0 : 1.4);
        this.spawnSparks(nearest.x, nearest.y, '#f59e0b', 22);
        this.pushShockwave(nearest.x, nearest.y, 90, '#f59e0b', '#ef4444', 0.4, 5);
      } else {
        this.powerHitOutpost(120, dmg);
        this.pushShockwave(px, py, 80, '#f59e0b', '#fb923c', 0.35, 4);
      }
      this.screenShake = isWarlord ? 0.95 : 0.7;
    } else if (style === 'bow') {
      skillName = isWarlord ? '🏹【覇王星雨】' : '🏹【蒼穹箭雨】';
      skillColor = '#7dd3fc';
      const radius = isWarlord ? 210 : 160;
      const ticks = powerShots;
      const tickDmg = Math.round(baseAtk * (isWarlord ? 0.95 : 0.78));
      if (!this.powerFx) this.powerFx = [];
      for (let t = 0; t < ticks; t++) {
        this.powerFx.push({
          kind: 'arrow_rain', delay: 0.06 + t * 0.08, radius, dmg: tickDmg,
          x: px, y: py, spent: false
        });
      }
      for (const m of this.monsters || []) {
        if (!m || m.hp <= 0) continue;
        if (Math.hypot(m.x - px, m.y - py) <= radius) {
          hitCount++;
          this.performAttack(this.player, m, true, tickDmg);
        }
      }
      this.powerHitOutpost(radius, tickDmg * 2);
      this.pushShockwave(px, py, radius, '#38bdf8', '#e0f2fe', 0.5, 3);
      for (let i = 0; i < 16; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        this.pushParticle({
          x: px + Math.cos(ang) * dist, y: py + Math.sin(ang) * dist - 40,
          vx: (Math.random() - 0.5) * 40, vy: 120 + Math.random() * 160,
          color: '#bae6fd', size: 2.2, life: 0.45
        });
      }
    } else if (style === 'crossbow') {
      skillName = isWarlord ? '🎯【覇王穿貫筒】' : '🎯【剛矢貫筒】';
      skillColor = '#c4b5fd';
      const reach = isWarlord ? 420 : 340;
      const halfW = isWarlord ? 34 : 26;
      const dmg = Math.round(baseAtk * (isWarlord ? 5.0 : 3.9));
      const cos = Math.cos(face), sin = Math.sin(face);
      for (const m of this.monsters || []) {
        if (!m || m.hp <= 0) continue;
        const dx = m.x - px, dy = m.y - py;
        const along = dx * cos + dy * sin;
        if (along < -10 || along > reach) continue;
        const perp = Math.abs(-dy * cos + dx * sin);
        if (perp > halfW + (m.radius || 12)) continue;
        hitCount++;
        this.performAttack(this.player, m, true, dmg);
        this.powerKnockStun(m, isWarlord ? 55 : 40, isWarlord ? 1.1 : 0.8);
      }
      this.powerHitOutpost(reach * 0.45, dmg);
      for (let i = 0; i < 10; i++) {
        const tt = (i + 1) / 10;
        this.pushParticle({
          x: px + cos * reach * tt, y: py + sin * reach * tt,
          vx: cos * 40, vy: sin * 40,
          color: i % 2 ? '#ddd6fe' : '#8b5cf6', size: 3.5, life: 0.35
        });
      }
      this.pushShockwave(px + cos * reach * 0.7, py + sin * reach * 0.7, 55, '#a78bfa', '#ede9fe', 0.3, 3);
      if (!this.projectiles) this.projectiles = [];
      this.projectiles.push({
        x: px, y: py, vx: cos * 620, vy: sin * 620,
        attacker: this.player, isPlayer: true,
        type: 'SWORD_BEAM', damage: Math.round(dmg * 0.35), life: 0.55,
        hitEnemies: [], color: '#c4b5fd'
      });
    } else if (style === 'cannon') {
      skillName = isWarlord ? '💣【覇王散華砲】' : '💣【榴散クラスター】';
      skillColor = '#fbbf24';
      const count = powerShots;
      const blastR = isWarlord ? 78 : 62;
      const subDmg = Math.round(baseAtk * (isWarlord ? 2.1 : 1.65));
      if (!this.powerFx) this.powerFx = [];
      const aim = this.getNearestMonster(px, py);
      const baseAng = aim ? Math.atan2(aim.y - py, aim.x - px) : face;
      const baseDist = aim ? Math.min(220, Math.hypot(aim.x - px, aim.y - py)) : 140;
      for (let i = 0; i < count; i++) {
        const a = baseAng + (i - (count - 1) / 2) * 0.35;
        const dist = baseDist + (i % 2 ? 25 : -10);
        const bx = px + Math.cos(a) * dist;
        const by = py + Math.sin(a) * dist;
        this.powerFx.push({
          kind: 'cluster_blast', delay: 0.08 + i * 0.1,
          x: bx, y: by, radius: blastR, dmg: subDmg, spent: false
        });
        this.pushParticle({
          x: px, y: py, vx: Math.cos(a) * dist * 2.5, vy: Math.sin(a) * dist * 2.5,
          color: '#f59e0b', size: 4, life: 0.3
        });
      }
      const ix = px + Math.cos(baseAng) * baseDist;
      const iy = py + Math.sin(baseAng) * baseDist;
      for (const m of this.monsters || []) {
        if (!m || m.hp <= 0) continue;
        if (Math.hypot(m.x - ix, m.y - iy) <= blastR) {
          hitCount++;
          this.performAttack(this.player, m, true, subDmg);
          this.powerKnockStun(m, 50, 0.9);
        }
      }
      this.pushShockwave(ix, iy, blastR, '#f59e0b', '#ef4444', 0.4, 5);
      this.powerHitOutpost(150, subDmg * 2);
    } else {
      // sword default: 範囲二連撃
      skillName = isWarlord ? '⚡【覇王烈風二閃】' : '⚔️【剛剣二連斬】';
      skillColor = isWarlord ? '#f59e0b' : '#38bdf8';
      const radius = isWarlord ? 200 : 150;
      const dmg = Math.round(baseAtk * (isWarlord ? 2.55 : 2.0));
      for (const m of this.monsters || []) {
        if (!m || m.hp <= 0) continue;
        if (Math.hypot(m.x - px, m.y - py) <= radius) {
          hitCount++;
          this.performAttack(this.player, m, true, dmg);
          this.powerKnockStun(m, isWarlord ? 70 : 50, isWarlord ? 1.1 : 0.75);
        }
      }
      if (!this.powerFx) this.powerFx = [];
      this.powerFx.push({
        kind: 'sword_second', delay: 0.18, radius, dmg, x: px, y: py, spent: false
      });
      this.powerHitOutpost(radius, dmg * 1.6);
      this.pushShockwave(px, py, radius, skillColor, isWarlord ? '#ef4444' : '#00f0ff', 0.4, isWarlord ? 5 : 4);
      this.pushShockwave(px, py, radius * 0.7, '#fde047', '#fff7ed', 0.25, 2);
    }

    const pCount = isWarlord ? 18 : 12;
    for (let i = 0; i < pCount; i++) {
      const pAng = Math.random() * Math.PI * 2;
      const pSpeed = 90 + Math.random() * 240;
      this.pushParticle({
        x: px, y: py,
        vx: Math.cos(pAng) * pSpeed, vy: Math.sin(pAng) * pSpeed,
        color: skillColor, size: 3 + Math.random() * 3, life: 0.45 + Math.random() * 0.3
      });
    }

    this.spawnDamageText(px, py - 38, `${skillName} [${hitCount}体!]`, skillColor);
    this.showToast(`${skillName}`);
  },

  updatePowerAtkButtonUI() {
    const btn = document.getElementById('btn-pad-power');
    const overlay = document.getElementById('pad-power-cd-overlay');
    const textEl = document.getElementById('pad-power-cd-text');
    if (!btn || !overlay || !textEl) return;

    const cd = this.player ? (this.player.powerAtkCooldown || 0) : 0;
    if (cd > 0) {
      if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        btn.classList.remove('ready');
      }
      const formatted = cd.toFixed(1);
      if (textEl.textContent !== formatted) {
        textEl.textContent = formatted;
      }
    } else {
      if (!overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
        btn.classList.add('ready');
        sound.playItem();
      }
    }
  },

  // 伍長以上の号令発動（呼集の笛）
  triggerCommand() {
    const currentRank = RANKS[this.rankIndex];
    if (!currentRank.canCommand) return;

    sound.playLaunch();
    this.commandActiveUntil = performance.now() + 6000;
    this.showToast(`📢 呼集の笛！「隊長だ！こちらへ集まれ！」`);
  },

  updateStatsUI(force = true) {
    const nowUi = performance.now();
    if (!force && this._lastStatsUiAt && (nowUi - this._lastStatsUiAt) < STATS_UI_INTERVAL_MS) return;
    this._lastStatsUiAt = nowUi;
    const location=this.currentDungeon?.kind==='town'?'town':this.currentDungeon?'dungeon':'field';
    if(this.container?.dataset)this.container.dataset.location=location;
    const fieldRoot=this.container?.querySelector?.('.iron-squad');if(fieldRoot)fieldRoot.dataset.location=location;
    sound.setBGMMode(this.container?.classList.contains('dialog-open')?'quiet':daylightAt(this.worldTime||0).period);
    this.refreshSupplyUI();
    const rank = RANKS[this.rankIndex];
    const pLv = this.player ? (this.player.level || 1) : 1;
    const isWarlord = this.player && this.player.isAdvanced;
    const rankTitle = isWarlord ? `👑覇王 ${rank.title}` : rank.title;
    document.getElementById('player-rank').textContent = `${rankTitle} [Lv.${pLv}]`;
    const hpEl = document.getElementById('player-hp');
    if (hpEl) {
      const cur = this.player ? Math.max(0, Math.floor(this.player.hp || 0)) : 0;
      const mx = this.player ? Math.max(1, Math.floor(this.player.maxHp || 1)) : 1;
      hpEl.textContent = `${cur}/${mx}`;
      const ratio = mx > 0 ? cur / mx : 1;
      hpEl.setAttribute('data-condition', ratio <= 0.25 ? 'critical' : ratio <= 0.55 ? 'hurt' : 'healthy');
      hpEl.style.color = ratio <= 0.25 ? '#f87171' : (ratio <= 0.55 ? '#fbbf24' : '#34d399');
    }
    document.getElementById('current-wave').textContent = `第${this.phase || this.wave || 1}期`;

    // 作戦残時タイマー表示
    const timerEl = document.getElementById('phase-timer-display');
    if (timerEl) {
      const remSec = Math.max(0, Math.ceil(this.phaseTimer || 0));
      const m = Math.floor(remSec / 60);
      const s = remSec % 60;
      timerEl.textContent = this.restTimer>0?`待機 ${Math.ceil(this.restTimer)}秒`:`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    const dragged=carriedSoldiers(this,this.player),civDrag=carriedCivilians(this,this.player),ropeCount=dragged.length+civDrag.length,transportBadge=document.getElementById('transport-badge');
    if(transportBadge){
      const releaseBtn = document.getElementById('btn-release-wounded');
      if(this.rescueBuffTimer > 0 && !ropeCount) {
        transportBadge.classList.remove('hidden');
        transportBadge.style.background = 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(14,165,233,0.35))';
        transportBadge.style.borderColor = '#38bdf8';
        const statusEl = document.getElementById('transport-status');
        if(statusEl) statusEl.textContent = `✨ 救助の英雄加速中 (${Math.ceil(this.rescueBuffTimer)}秒)`;
        if(releaseBtn) releaseBtn.style.display = ropeCount > 0 ? '' : 'none';
      } else {
        transportBadge.classList.toggle('hidden',!ropeCount);
        transportBadge.style.background = '';
        transportBadge.style.borderColor = '';
        const statusEl = document.getElementById('transport-status');
        if(statusEl) {
          const post=nearestKnownMedicalPost(this);
          const d=post?Math.round(Math.hypot(post.x-this.player.x,post.y-this.player.y)):0;
          const directions=['→','↘','↓','↙','←','↖','↑','↗'];
          const arrow=post?directions[(Math.round(Math.atan2(post.y-this.player.y,post.x-this.player.x)/(Math.PI/4))+8)%8]:'';
          const guide=this.currentDungeon?(this.currentDungeon.kind==='town'?'町の救護受付へ':'出口から町・救護所へ'):post?`${arrow} ${post.name} ${d.toLocaleString()}m`:'救護所は未発見 · 本陣・町・拠点へ';
          statusEl.textContent=`搬送 負傷${dragged.length}+民${civDrag.length}/${carryingCapacity(this.player)} · ${guide}`;
        }
        if(releaseBtn) releaseBtn.style.display = '';
      }
    }
    const clock=daylightAt(this.worldTime);
    const waveEl = document.getElementById('current-wave');
    if (waveEl) waveEl.textContent = `第${this.phase || 1}期`;
    const clockBadge = document.getElementById('day-night-badge');
    if (clockBadge) {
      clockBadge.textContent = `${clock.icon} ${clock.label} ${clock.clock}`;
      clockBadge.setAttribute('data-period', clock.period);
    }
    const zoneBadge = document.getElementById('field-zone-badge');
    if (zoneBadge && this.player) {
      const zone = getFieldZone(this.player.x, this.player.y);
      const unsafe = !this.currentDungeon && (this.player.def || 0) < zone.reqDef;
      const route = this.currentDungeon ? '' : routeNameAt(this.player.x, this.player.y);
      const where = route || (this.currentDungeon ? '' : biomeAt(this.player.x, this.player.y).name);
      zoneBadge.textContent = this.currentDungeon ? `探索中：${this.currentDungeon.name || 'ダンジョン'}` : `${zone.icon} ${zone.shortName}${where ? ` · ${where}` : ''} ${zone.dangerStars}${unsafe ? ` · 防御不足 ${this.player.def || 0}/${zone.reqDef}` : ''}`;
      zoneBadge.setAttribute('data-danger', String(unsafe));
    }

    const restBanner=document.getElementById('phase-complete-banner'),restText=document.getElementById('phase-banner-text');
    if(restBanner && restText) {
      restBanner.classList.toggle('hidden',!(this.restTimer>0));
      restText.textContent=this.restTimer>0?`次のラウンド開始まで ${Math.ceil(this.restTimer)}秒 · 敵は休止中 · 自己強化 ${this.restReport?.count||0}回（${this.restReport?.spent||0}G） · 会議を開く`:'';
    }

    const aliveSquad = this.squad ? this.squad.filter(s => !s.dead) : [];
    const guardCount = aliveSquad.filter(s => s.isPersonalGuard).length;
    const armyCount = aliveSquad.length - guardCount;
    const squadCounter=document.getElementById('squad-alive');
    if (squadCounter) {
      squadCounter.textContent=`${guardCount} / ${armyCount}`;
      squadCounter.title=`直属小隊 ${guardCount}名 / 本隊 ${armyCount}名 (予備 ${(this.reserves || []).length}名)`;
    }
    const goldEl = document.getElementById('current-gold');
    if (goldEl) goldEl.textContent = `${(this.gold || 0).toLocaleString()}G`;
    const treasEl = document.getElementById('current-treasury');
    if (treasEl) treasEl.textContent = `国庫${(this.treasury || 0).toLocaleString()}G`;

    const orbEl = document.getElementById('current-orbs');
    if (orbEl) {
      const gems = this.awakeningGems || 0;
      orbEl.textContent = gems > 0 ? `💎${this.awakeningOrbs || 0} 💠${gems}` : `💎${this.awakeningOrbs || 0}`;
    }

    // 号令ボタンの表示切替
    const cmdBtn = document.getElementById('btn-pad-command');
    if (cmdBtn) {
      if (rank.canCommand || isWarlord) {
        cmdBtn.classList.remove('hidden');
      } else {
        cmdBtn.classList.add('hidden');
      }
    }

    // パワーアタックボタン：装備武器スタイル別ラベル
    const pwrBtn = document.getElementById('btn-pad-power');
    if (pwrBtn) {
      const iconEl = pwrBtn.querySelector('.pad-btn-icon');
      const labelEl = pwrBtn.querySelector('.pad-btn-label');
      if (iconEl && labelEl) {
        const st = weaponStyleOf(this.equipped && this.equipped.weapon);
        const labels = {
          sword:    { icon: isWarlord ? '⚡' : '⚔️', label: isWarlord ? '二閃' : '二連斬', title: isWarlord ? '覇王烈風二閃' : '剛剣二連斬' },
          spear:    { icon: '🔱', label: isWarlord ? '穿衝扇' : '扇穿', title: isWarlord ? '覇王穿衝扇' : '烈槍扇穿' },
          hammer:   { icon: '🔨', label: isWarlord ? '滅砕' : '滅殺', title: isWarlord ? '覇王滅砕撃' : '剛鎚滅殺' },
          bow:      { icon: '🏹', label: isWarlord ? '星雨' : '箭雨', title: isWarlord ? '覇王星雨' : '蒼穹箭雨' },
          crossbow: { icon: '🎯', label: '貫筒', title: isWarlord ? '覇王穿貫筒' : '剛矢貫筒' },
          cannon:   { icon: '💣', label: isWarlord ? '散華' : '簇弾', title: isWarlord ? '覇王散華砲' : '榴散クラスター' }
        };
        const L = labels[st] || labels.sword;
        iconEl.textContent = L.icon;
        labelEl.textContent = L.label;
        pwrBtn.title = `${L.title} (強撃)`;
      }
    }
  },

  // 初期の戦場モンスターを各ゾーンに自然配置
  seedInitialMonsters() {
    // ゾーン1 (近郊平原): 10体 (スライム・ゴブリン)
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 300 + Math.random() * 1500;
      this.spawnMonster(BASE_CAMP.x + Math.cos(ang) * dist, BASE_CAMP.y + Math.sin(ang) * dist);
    }
    // ゾーン2 (警戒森林): 24体 (ゴブリン・黒狼・オーク)
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 2600 + Math.random() * 2400;
      this.spawnMonster(BASE_CAMP.x + Math.cos(ang) * dist, BASE_CAMP.y + Math.sin(ang) * dist);
    }
    // ゾーン3 (魔境深部): 24体 (狂暴オーク・ワイバーン・エリート)
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 5800 + Math.random() * 3000;
      this.spawnMonster(BASE_CAMP.x + Math.cos(ang) * dist, BASE_CAMP.y + Math.sin(ang) * dist);
    }
    // ゾーン4 (最果ての死地): 12体 (ワイバーン)
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 9500 + Math.random() * 4500;
      this.spawnMonster(BASE_CAMP.x + Math.cos(ang) * dist, BASE_CAMP.y + Math.sin(ang) * dist);
    }
  },

  // どでかい大ボス（COLOSSAL BOSS）を四隅の最果て地点に降臨召喚！
  spawnColossalBoss(customBossId = null, px = undefined, py = undefined) {
    if(this.restTimer>0 || this.monsters.length>=ENEMY_LIMIT)return null;
    const bossKeys = Object.keys(COLOSSAL_BOSS_DEFS);
    const chosenKey = customBossId || bossKeys[Math.floor(Math.random() * bossKeys.length)];
    const def = COLOSSAL_BOSS_DEFS[chosenKey] || COLOSSAL_BOSS_DEFS.colossal_dragon;

    let x = px;
    let y = py;
    if (x === undefined || y === undefined) {
      // 四隅の最果てのいずれかにスポーン
      const corners = [
        { x: 180, y: 180 },
        { x: MAP_WIDTH - 180, y: 180 },
        { x: MAP_WIDTH - 180, y: MAP_HEIGHT - 180 },
        { x: 180, y: MAP_HEIGHT - 180 }
      ];
      const corner = corners[Math.floor(Math.random() * corners.length)];
      x = corner.x + (Math.random() - 0.5) * 80;
      y = corner.y + (Math.random() - 0.5) * 80;
    }

    const curPhase = Math.max(1, this.phase || this.wave || 1);
    const pScale = distanceScaling(Math.hypot(x-BASE_CAMP.x,y-BASE_CAMP.y),curPhase).phaseBonus;
    const hp = Math.floor(def.baseHp * pScale);
    const atk = Math.floor(def.baseAtk * pScale);

    const colossalMonster = {
      x, y, homeX:x, homeY:y, lootDistance:Math.hypot(x-BASE_CAMP.x,y-BASE_CAMP.y),
      hp, maxHp: hp,
      atk, speed: def.speed,
      radius: def.radius,
      color: def.color,
      type: def.id,
      isBoss: true,
      isColossal: true,
      bossDef: def,
      name: def.name,
      title: def.title,
      skillTimer: def.skillCooldown,
      hitPulse: 0
    };

    this.monsters.push(colossalMonster);
    sound.playLaunch();
    this.screenShake = 0.4;
    this.showToast(`🚨【超巨大魔獣出現！】${def.title}${def.name}が最果ての死地に姿を現した！`);
    return colossalMonster;
  },

  // ゾーン制モンスター生成（本陣からの距離ゾーンに応じてステータス・種別が完全スケーリング）
  spawnMonster(px, py, forceZone = null) {
    if(this.restTimer>0 || this.monsters.length>=ENEMY_LIMIT)return null;
    let x = px;
    let y = py;
    if (x === undefined || y === undefined) {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { x = Math.random() * MAP_WIDTH; y = 40; }
      else if (side === 1) { x = MAP_WIDTH - 40; y = Math.random() * MAP_HEIGHT; }
      else if (side === 2) { x = Math.random() * MAP_WIDTH; y = MAP_HEIGHT - 40; }
      else { x = 40; y = Math.random() * MAP_HEIGHT; }
    }
    x = Math.max(30, Math.min(MAP_WIDTH - 30, x));
    y = Math.max(30, Math.min(MAP_HEIGHT - 30, y));

    const zone = forceZone || getFieldZone(x, y);
    const curPhase = Math.max(1, this.phase || this.wave || 1);
    const scaling = distanceScaling(Math.hypot(x-BASE_CAMP.x,y-BASE_CAMP.y),curPhase);

    let type = 'goblin';
    let rawHp = 55;
    let rawAtk = 13;
    let speed = 76;
    let radius = 11;
    let color = '#10b981';
    let isBoss = false;
    let isElite = false;

    if (zone.id === 'ZONE_PEACE') {
      // 本陣防衛圏 (近郊): スライム(60%) or ゴブリン(40%)
      if (Math.random() < 0.60) {
        type = 'slime';
        rawHp = 45;
        rawAtk = 10;
        speed = 65;
        radius = 10;
        color = '#34d399';
      } else {
        type = 'goblin';
        rawHp = 60;
        rawAtk = 14;
        speed = 74;
        radius = 11;
        color = '#10b981';
      }
    } else if (zone.id === 'ZONE_WILD') {
      // 警戒辺境: ゴブリン(30%) or 黒狼(35%) or オーク(35%)
      const roll = Math.random();
      if (roll < 0.30) {
        type = 'goblin';
        rawHp = 75;
        rawAtk = 15;
        speed = 78;
        radius = 11;
        color = '#10b981';
      } else if (roll < 0.65) {
        type = 'wolf';
        rawHp = 90;
        rawAtk = 18;
        speed = 114;
        radius = 12;
        color = '#64748b';
      } else {
        type = 'orc';
        rawHp = 120;
        rawAtk = 22;
        speed = 66;
        radius = 15;
        color = '#d97706';
      }
    } else if (zone.id === 'ZONE_CHAOS') {
      // 魔境深部: オーク(35%) or ワイバーン(~57%) or 中ボスドラゴン(8%, cap FIELD_BOSS_CAP)
      const roll = Math.random();
      if (roll < 0.35) {
        type = 'orc';
        rawHp = 100;
        rawAtk = 16;
        speed = 70;
        radius = 15;
        color = '#d97706';
        isElite = true;
      } else if (roll < 1.0 - FIELD_BOSS_CHANCE) {
        type = 'wyvern';
        rawHp = 140;
        rawAtk = 20;
        speed = 84;
        radius = 18;
        color = '#a855f7';
      } else {
        let fieldBossN = 0;
        for (let bi = 0; bi < this.monsters.length; bi++) {
          const bm = this.monsters[bi];
          if (bm.isBoss && !bm.isColossal && !bm.isRaidMob && !bm.isDungeonBoss) fieldBossN++;
        }
        if (fieldBossN >= FIELD_BOSS_CAP) {
          type = 'wyvern';
          rawHp = 140;
          rawAtk = 20;
          speed = 84;
          radius = 18;
          color = '#a855f7';
        } else {
          type = 'dragon';
          rawHp = Math.round(280 * FIELD_BOSS_HP_MULT);
          rawAtk = Math.round(28 * FIELD_BOSS_ATK_MULT);
          speed = 58;
          radius = 28;
          color = '#ef4444';
          isBoss = true;
        }
      }
    } else {
      // 最果ての死地: ワイバーン or ドラゴン魔獣 (超強力・一撃必殺級)
      const roll = Math.random();
      if (roll < 0.5) {
        type = 'wyvern';
        rawHp = 160;
        rawAtk = 14;
        speed = 92;
        radius = 20;
        color = '#ef4444';
        isElite = true;
      } else {
        type = 'dragon';
        rawHp = 240;
        rawAtk = 18;
        speed = 65;
        radius = 28;
        color = '#dc2626';
        isElite = true;
      }
    }

    const exclusive=periodEnemy(zone.id,this.worldTime);
    if(exclusive) {
      type=exclusive.type;rawHp=exclusive.hp;rawAtk=exclusive.atk;speed=exclusive.speed;
      radius=exclusive.radius;color=exclusive.color;isElite=!!exclusive.elite;isBoss=false;
    }

    const adaptive=fieldAdaptiveScaling(this,Math.hypot(x-BASE_CAMP.x,y-BASE_CAMP.y));
    const hp = Math.floor(rawHp * scaling.hp * adaptive.hp);
    const atk = Math.floor(rawAtk * scaling.atk * adaptive.atk);

    this.monsters.push({
      x, y, homeX:x, homeY:y, lootDistance:Math.hypot(x-BASE_CAMP.x,y-BASE_CAMP.y),
      hp, maxHp: hp,
      atk, speed: speed * (zone.speedMult || 1.0),
      radius, color,
      type, isBoss, isElite, name:exclusive?.name,activePeriod:exclusive?daylightAt(this.worldTime).period:null,
      zoneId: zone.id, fieldAdaptive:{hp:adaptive.hp,atk:adaptive.atk,reward:adaptive.reward},
      hitPulse: 0
    });
  },

  // シームレス自律リポップ制御（戦場全体で最大72体を維持＋大ボス再臨管理）
  updateSpawns(dt) {
    if(this.restTimer>0 || this.currentDungeon)return;
    // 1. 大ボス再臨チェック（フィールド超巨頭のみ。ダンジョンボスは currentDungeon で除外済み）
    const hasColossal = this.monsters.some(m => m.isColossal && !m.isDungeonBoss);
    if (!hasColossal) {
      this.colossalBossRespawnTimer = (this.colossalBossRespawnTimer || 0) - dt;
      if (this.colossalBossRespawnTimer <= 0 && this.monsters.length<ENEMY_LIMIT) {
        this.spawnColossalBoss();
        this.colossalBossRespawnTimer = COLOSSAL_RESPAWN; // v1.23.2: 75→210秒
      }
    }

    // Soft-cap excess field mid-bosses (save-safe: cull farthest when over CAP & far from player)
    let fieldBossN = 0;
    for (let i = 0; i < this.monsters.length; i++) {
      const m = this.monsters[i];
      if (m.isBoss && !m.isColossal && !m.isRaidMob && !m.isDungeonBoss) fieldBossN++;
    }
    if (fieldBossN > FIELD_BOSS_CAP) {
      let farIdx = -1, farDist = -1;
      for (let i = 0; i < this.monsters.length; i++) {
        const m = this.monsters[i];
        if (!(m.isBoss && !m.isColossal && !m.isRaidMob && !m.isDungeonBoss)) continue;
        const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
        if (d > 1600 && d > farDist) { farDist = d; farIdx = i; }
      }
      if (farIdx >= 0) this.monsters.splice(farIdx, 1);
    }

    // Keep local encounters populated without simulating the entire expanded world.
    const cullR2 = 1700 * 1700, keepR2 = 1100 * 1100;
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.isBoss || m.isColossal || m.isRaidMob) continue;
      if (this._distSq(m.x, m.y, this.player.x, this.player.y) > cullR2) {
        let keep = false;
        const sq = this.squad || [];
        for (let si = 0; si < sq.length; si++) {
          const s = sq[si];
          if (s.dead) continue;
          if (this._distSq(m.x, m.y, s.x, s.y) < keepR2) { keep = true; break; }
        }
        if (!keep) this.monsters.splice(i, 1);
      }
    }
    this.spawnTimer += dt;
    if(this.spawnTimer>=ENEMY_SPAWN_INTERVAL && this.monsters.length<ENEMY_LIMIT) {
      this.spawnTimer=0;
      const ang=Math.random()*Math.PI*2,dist=450+Math.random()*450;
      const sx=Math.max(40,Math.min(MAP_WIDTH-40,this.player.x+Math.cos(ang)*dist));
      const sy=Math.max(40,Math.min(MAP_HEIGHT-40,this.player.y+Math.sin(ang)*dist));
      this.spawnMonster(sx,sy,getFieldZone(sx,sy));
    }
  },

  // 🚨 本陣強襲イベント（Base Camp Raid）トリガー判定
  checkBaseRaidTrigger() {
    const oldRoll=this.invasions?.raidRollPhase;
    const trigger=shouldTriggerRandomRaid(this);
    if(this.invasions?.raidRollPhase!==oldRoll)this.saveGame();
    if(trigger)this.triggerBaseRaid();
  },

  // 本陣強襲イベントの発生
  triggerBaseRaid() {
    if(this.invasions?.stage!=='idle'||this.baseRaidActive||this.currentDungeon||this.restTimer>0)return;
    this.baseRaidActive = true;
    this.invasions.raidLastPhase=this.phase||1;this.invasions.raidScheduledPhase=0;
    this.baseRaidTriggeredPhase = this.phase || 1;
    this.baseRaidTimer = 40.0; // 40秒の防衛猶予（ワープ帰還は間に合う／本隊は単独だと壊滅寄り）

    this.zoneAlertFlash = 1.0;
    this.screenShake = 0.55;
    sound.playBomb();
    this.showToast('🚨【緊急警報！】魔境の強襲軍団が本陣へ一斉侵攻！本隊が包囲されています！急ぎ本陣へ救援に向かえ！');

    const raidBanner = document.getElementById('base-raid-banner');
    if (raidBanner) raidBanner.classList.remove('hidden');

    makeEnemyRoom(this.monsters,17);
    const raidCount = Math.min(17,40-this.monsters.length);
    const curPhase = Math.max(1, this.phase || 1);
    // v1.23.3: 本隊ほぼ壊滅・精鋭のみ生存。スケール距離28000維持、ATK/DEF/数を引き上げ（帰還プレイヤーは倒せる）
    const scaling = distanceScaling(RAID_SCALE_DIST, curPhase);

    for (let i = 0; i < raidCount; i++) {
      const ang = (i / raidCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const dist = 750 + Math.random() * 200;
      const rx = BASE_CAMP.x + Math.cos(ang) * dist;
      const ry = BASE_CAMP.y + Math.sin(ang) * dist;

      let type = 'orc';
      let rawHp = 190;
      let rawAtk = 26;
      let speed = 68;
      let radius = 16;
      let color = '#ea580c';
      let isBoss = false;
      let isRaidBoss = false;
      let def = RAID_GRUNT_DEF;
      let dmgReduction = RAID_GRUNT_DMG_RED;
      let name = '強襲オーク突撃兵';
      let title = '【本陣侵攻兵】';

      if (i === 0) {
        // 本陣強襲隊長！特大ボス（高耐久・高火力／帰還部隊なら撃破可）
        type = 'orc';
        rawHp = 1350;
        rawAtk = 52;
        speed = 58;
        radius = 30;
        color = '#dc2626';
        isBoss = true;
        isRaidBoss = true;
        def = RAID_BOSS_DEF;
        dmgReduction = RAID_BOSS_DMG_RED;
        name = '魔境強襲隊長・ブラッドオーク';
        title = '【侵攻軍司令官】';
      } else if (i % 3 === 0) {
        type = 'wolf';
        rawHp = 165;
        rawAtk = 24;
        speed = 105;
        radius = 13;
        color = '#78716c';
        name = '強襲凶狼';
        title = '【遊撃急襲牙】';
      } else if (i % 5 === 0) {
        type = 'wyvern';
        rawHp = 250;
        rawAtk = 32;
        speed = 78;
        radius = 19;
        color = '#c084fc';
        name = '魔境強襲飛竜';
        title = '【急襲翼竜】';
      }

      const hp = Math.floor(rawHp * scaling.hp * RAID_HP_MULT);
      const atk = Math.floor(rawAtk * scaling.atk * RAID_ATK_MULT);

      this.monsters.push({
        x: rx, y: ry, homeX: rx, homeY: ry,
        lootDistance: RAID_SCALE_DIST,
        hp, maxHp: hp,
        atk, speed,
        def, dmgReduction,
        radius, color,
        type,
        name, title,
        isBoss,
        isRaidBoss,
        id:`random_raid_${curPhase}_${i}`,isRaidMob: true,
        atkTimer: 0,
        hitPulse: 0
      });
    }
  },

  // 本陣強襲イベントの毎フレーム監視
  updateBaseRaid(dt) {
    if (!this.baseRaidActive || this.currentDungeon || this.restTimer>0) return;

    this.baseRaidTimer = Math.max(0, (this.baseRaidTimer || 40) - dt);
    const aliveRaidMobs = this.monsters.filter(m => m.isRaidMob && !m.isDemonInvasion && m.hp > 0);

    const mainForce = (this.squad || []).filter(s => s && !s.isPersonalGuard && !s.dead);
    const mainAllDown = mainForce.length > 0 && mainForce.every(s => s.isDown);
    const mainWiped = mainForce.length === 0;

    const bannerText = document.getElementById('base-raid-banner-text');
    if (bannerText) {
      bannerText.textContent = `🚨【本陣強襲中！】残存強襲敵: ${aliveRaidMobs.length}体！本隊を守れ！(${Math.ceil(this.baseRaidTimer)}秒)`;
    }

    if (aliveRaidMobs.length === 0) {
      this.completeBaseRaid(true);
    } else if (mainAllDown || mainWiped) {
      this.withdrawBaseRaid(mainWiped ? 'wiped' : 'downed');
    } else if (this.baseRaidTimer <= 0) {
      this.completeBaseRaid(false);
    }
  },

  withdrawBaseRaid(reason = 'downed') {
    if (!this.baseRaidActive) return;
    this.baseRaidActive = false;
    this.monsters = (this.monsters || []).filter(m => !m.isRaidMob || m.isDemonInvasion);
    const raidBanner = document.getElementById('base-raid-banner');
    if (raidBanner) raidBanner.classList.add('hidden');
    sound.playBomb();
    const tip = reason === 'wiped'
      ? '本隊が戦場から姿を消したため、強襲軍は戦利を得たと判断し撤退した…'
      : '本隊が全員ダウンしたため、強襲軍は本陣制圧完了と見て撤退した…';
    this.showToast(`🏳️【強襲軍撤退】${tip}`);
  },

  // 本陣強襲イベントの終了・解決
  completeBaseRaid(isSuccess) {
    if (!this.baseRaidActive) return;
    this.baseRaidActive = false;
    for(const key of ['monsters','savedFieldMonsters','restMonsters'])if(this[key])this[key]=this[key].filter(m=>!m.isRaidMob||m.isDemonInvasion);
    const raidBanner = document.getElementById('base-raid-banner');
    if (raidBanner) raidBanner.classList.add('hidden');

    if (isSuccess) {
      const rewardGold = 650 + (this.phase || 1) * 45;
      const rewardExp = 1200 + (this.phase || 1) * 70;
      this.gold += rewardGold;
      this.gainExp(rewardExp);

      // 本陣中央に「本陣防衛の至宝箱」をドロップ！
      const drops = [
        generateRandomDrop(4500, 'boss'),
        generateRandomDrop(4500, 'boss')
      ];
      for (const eq of drops) {
        if (eq) {
          this.dropsOnField.push({
            x: BASE_CAMP.x + (Math.random() - 0.5) * 80,
            y: BASE_CAMP.y + (Math.random() - 0.5) * 80,
            isBoss: true,
            item: eq
          });
        }
      }

      // 本隊全員の士気回復・手当て全快
      if (this.squad) {
        this.squad.forEach(s => {
          if (!s.dead && !s.isDown) s.hp = s.maxHp;
        });
      }

      sound.playHighScore();
      this.showToast(`🏆【本陣死守成功！】強襲軍団を撃滅！防衛特別報奨金 +${rewardGold}G & EXP +${rewardExp} & 至宝装備獲得！`);
    } else {
      // 防衛失敗・放置：本陣の兵士が甚大な被害（ダウン）
      let downCount = 0;
      if (this.squad) {
        for (const s of this.squad) {
          if (!s.dead && !s.isDown && !s.isPersonalGuard && Math.random() < 0.35) {
            if (markSoldierDown(this, s)) downCount++;
          }
        }
      }
      sound.playBomb();
      this.showToast(`⚠️【本陣が甚大な損害！】救援が間に合わず、本隊の兵士${downCount}名が負傷・ダウンしました…！`);
    }
  },

  // 互換用メソッド
  startNextWave() {
    this.completePhase();
  },

  spawnPack(size) {
    for (let i = 0; i < size; i++) {
      this.spawnMonster();
    }
  },

  leaveRemains(soldier) {
    this.remains ||= [];
    this.remains.push({
      x: soldier.x, y: soldier.y,
      cloth: soldier.equipped?.armor?.color || '#6a6258',
      steel: soldier.equipped?.helmet?.color || '#8d8680',
      life: 1
    });
    if (this.remains.length > 56) this.remains.shift();
  },

  ageRemains(dt) {
    if (!this.remains?.length || !(dt > 0)) return;
    for (const remains of this.remains) remains.life -= dt / 26;
    this.remains = this.remains.filter(remains => remains.life > 0);
  },

  normalizeDeployment() {
    this.reserves ||= [];
    this.squad=this.squad.filter(s=>!s.dead);
    const capacity=RANKS[this.rankIndex].maxSquad;
    while(this.squad.length>capacity) {
      // Injured soldiers keep receiving rescue treatment in the field.
      let index=this.squad.length-1;
      while(index>=0 && this.squad[index].isDown) index--;
      if(index<0) break;
      const [soldier]=this.squad.splice(index,1);
      soldier.x=BASE_CAMP.x;soldier.y=BASE_CAMP.y;
      this.reserves.push(soldier);
    }
  },

  deployReserves(announce = false) {
    if (!this.reserves?.length) return 0;
    const capacity = RANKS[this.rankIndex].maxSquad;
    if (this.squad.filter(s=>!s.dead).length >= capacity) return 0;
    this.squad=this.squad.filter(s=>!s.dead);
    let deployed=0;
    while(this.squad.length<capacity && this.reserves.length) {
      const soldier=this.reserves.shift();
      if(soldier.dead) continue;
      Object.assign(soldier,{x:BASE_CAMP.x+(Math.random()-.5)*80,y:BASE_CAMP.y+(Math.random()-.5)*80,
        isDown:false,downTimer:0,rescueProgress:0,phaseActivity:emptyActivity()});
      this.squad.push(soldier);deployed++;
    }
    if(announce && deployed) {
      this.showToast(`本陣の予備兵${deployed}名が実戦部隊へ合流・予備${this.reserves.length}名`);
      this.updateStatsUI();
    }
    return deployed;
  },

  supplyReinforcements() {
    this.normalizeDeployment();
    this.reserves ||= [];
    const capacity=RANKS[this.rankIndex].maxSquad;
    const received=Math.max(MIN_REINFORCEMENTS,capacity-this.squad.length-this.reserves.length);
    for(let i=0;i<received;i++) {
      const soldier=this.createNewSoldier();soldier.recruitedPhase=this.phase;
      this.reserves.push(soldier);
    }
    const deployed=this.deployReserves();
    this.lastReinforcements={phase:this.phase,received,deployed,waiting:this.reserves.length};
    return this.lastReinforcements;
  },

  // 作戦期完了処理（時間区切り制・死線生還判定＆新兵合流＆作戦給与支給）
  completePhase() {
    if(this.restTimer>0)return;
    if (this.baseRaidActive) {
      this.completeBaseRaid(false);
    }
    // 財政台帳: 期中の買取等を保持したまま期首残高を確定
    if (!this.phaseFiscal) this.beginPhaseFiscal();
    this.phaseFiscal.startBalance = this.phaseFiscal.startBalance ?? (this.treasury || 0);
    this.phase = (this.phase || this.wave || 1) + 1;
    this.wave = this.phase;
    this.phaseTimer = this.phaseDuration;

    if (this.phase > this.highWave) {
      this.highWave = this.phase;
      storage.set('ironsquad_max_wave', this.highWave);
    }

    // 国家財政: 国庫歳入 → 指揮手当 → 兵士給与（国庫から）
    if (!this.phaseFiscal || (this.phaseFiscal.phase !== (this.phase - 1) && this.phaseFiscal.income === 0 && this.phaseFiscal.salariesPaid === 0)) {
      // 期中累計（買取等）を引き継ぎつつ期番号を確定
      const carry = this.phaseFiscal || emptyFiscalLedger(this.phase - 1, this.treasury || 0);
      this.phaseFiscal = { ...carry, phase: this.phase - 1, startBalance: carry.startBalance ?? (this.treasury || 0) };
    }
    this.phaseFiscal.phase = this.phase - 1;
    if (this.phaseFiscal.startBalance == null) this.phaseFiscal.startBalance = (this.treasury || 0);

    const livingForPay = [...(this.squad || []).filter(s => !s.dead), ...(this.reserves || []).filter(s => !s.dead)];
    const grossIncome = nationalIncome(this,this.phase - 1, livingForPay.length);
    const stipend = calcCommanderStipend(this.phase - 1, grossIncome);
    const netToTreasury = grossIncome - stipend;
    this.treasury = (this.treasury || 0) + netToTreasury;
    this.gold = (this.gold || 0) + stipend;
    this.phaseFiscal.income = (this.phaseFiscal.income || 0) + grossIncome;
    this.phaseFiscal.commanderStipend = (this.phaseFiscal.commanderStipend || 0) + stipend;

    replenishTownGateGuards(this);
    finishEscortPhase(this);
    finishExperience(this.player);
    this.recalcPlayerStats();
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 60);

    // 死線生還判定 (直前の作戦期中の部隊損耗率を算出)
    const initSquadCount = this.phaseInitialSquadCount || this.squad.length;
    const aliveSoldiers = this.squad.filter(s => !s.dead);
    const reserveParticipants=(this.reserves || []).filter(participated);
    const activeExperiencedCount=aliveSoldiers.filter(participated).length;
    const experiencedCount=activeExperiencedCount+reserveParticipants.length;
    const deadInPhase = Math.max(0, this.phaseCasualties || 0);
    const casualtyRate = initSquadCount > 0 ? (deadInPhase / initSquadCount) : 0;
    const isDeathline = (initSquadCount >= 3 && casualtyRate >= 0.30 && deadInPhase >= 2) || (deadInPhase >= 4);

    const awakenedList = [];
    if (isDeathline) {
      sound.playHighScore();
      const allDeathSkills = Object.keys(DEATHLINE_SKILLS);
      [...aliveSoldiers.filter(participated),...reserveParticipants].forEach((s) => {
        s.survivedDeathlines = (s.survivedDeathlines || 0) + 1;
        s.deathlineSkills = s.deathlineSkills || [];

        if (s.deathlineSkills.length < 4) {
          let preferredSkill = null;
          if (s.soldierClass === 'HEAVY') preferredSkill = 'IRON_RESOLVE';
          else if (s.soldierClass === 'LIGHT') preferredSkill = 'PHANTOM_STEP';
          else if (s.soldierClass === 'ARCHER') preferredSkill = 'DEADLY_FOCUS';
          else if (s.soldierClass === 'MEDIC') preferredSkill = 'MIRACLE_PRAYER';

          let chosenSkillId = null;
          if (preferredSkill && !s.deathlineSkills.includes(preferredSkill)) {
            chosenSkillId = preferredSkill;
          } else {
            const availableSkills = allDeathSkills.filter(skId => !s.deathlineSkills.includes(skId));
            if (availableSkills.length > 0) {
              chosenSkillId = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            }
          }

          if (chosenSkillId) {
            s.deathlineSkills.push(chosenSkillId);
            awakenedList.push({ soldier: s, name: s.name, skill: DEATHLINE_SKILLS[chosenSkillId] });
          }
        }
        this.recalcSoldierStats(s);
      });

      this.showToast(`🚨【死線生還！】作戦第${this.phase - 1}期完了：損耗率${Math.round(casualtyRate * 100)}%の死線を越え、生存兵士${awakenedList.length}名が覚醒！`);
    } else {
      this.showToast(`🚩【作戦第${this.phase - 1}期完了】国庫歳入+${netToTreasury}G / 指揮手当+${stipend}G`);
    }

    // 給与を国庫から兵士サイフへ。治療を優先し、強化は休息中に進める。
    {
      const payroll = [...aliveSoldiers, ...(this.reserves || []).filter(s => !s.dead)];
      const need = payroll.length * SOLDIER_SALARY;
      let paid = 0;
      let shortfall = 0;
      if ((this.treasury || 0) >= need) {
        this.treasury -= need;
        paid = need;
        for (const soldier of payroll) {
          soldier.gold = (soldier.gold || 0) + SOLDIER_SALARY;
          soldier.lastMaintenance = { phase: this.phase - 1, count: 0, spent: 0, status: '次ラウンド開始前に整備予定' };
        }
      } else {
        const avail = Math.max(0, this.treasury || 0);
        const per = payroll.length ? Math.floor(avail / payroll.length) : 0;
        paid = per * payroll.length;
        shortfall = need - paid;
        this.treasury = (this.treasury || 0) - paid;
        for (const soldier of payroll) {
          soldier.gold = (soldier.gold || 0) + per;
          soldier.lastMaintenance = { phase: this.phase - 1, count: 0, spent: 0, status: per < SOLDIER_SALARY ? '給与不足・開始前整備予定' : '次ラウンド開始前に整備予定' };
        }
      }
      if (this.phaseFiscal) {
        this.phaseFiscal.salariesPaid = (this.phaseFiscal.salariesPaid || 0) + paid;
        this.phaseFiscal.salaryHeadcount = payroll.length;
        this.phaseFiscal.salaryShortfall = (this.phaseFiscal.salaryShortfall || 0) + shortfall;
      }
    }

    // 新兵への支給を先に行い、真の余剰だけを外販。給与原資を残して町へ投資。
    const supply=this.supplyReinforcements();
    this.processSharedEquipmentBox();
    this.advanceArmamentResearch();
    this.supplyMissingEquipment();
    this.investNation();
    const fiscal = this.finalizePhaseFiscal();
    this.beginPhaseFiscal();
    this.showToast(formatFiscalReportJa(fiscal));
    // 兵士たちの自費治療
    aliveSoldiers.forEach((s) => {
      if (finishExperience(s)) {
        s.careerPhases = s.careerPhases || [];
        s.careerPhases.push(this.phase - 1);
        if (s.careerPhases.length > 40) s.careerPhases = s.careerPhases.slice(-40);
      }
      if(s.isDown){s.hp=0;return;}
      const missingHp = s.maxHp - s.hp;
      if (missingHp > 0) {
        const treatCost = Math.ceil(missingHp / 10) * 2;
        if ((s.gold || 0) >= treatCost) {
          s.gold -= treatCost;
          if(!s.isDown)s.hp=s.maxHp;
        } else {
          const affordable = Math.floor((s.gold || 0) / 2) * 10;
          s.hp = Math.min(s.maxHp, s.hp + affordable);
          s.gold = (s.gold || 0) % 2;
        }
      }
      this.recalcSoldierStats(s);
    });

    for(const soldier of reserveParticipants) {
      if (finishExperience(soldier)) {
        soldier.careerPhases = soldier.careerPhases || [];
        soldier.careerPhases.push(this.phase - 1);
        if (soldier.careerPhases.length > 40) soldier.careerPhases = soldier.careerPhases.slice(-40);
      }
      this.recalcSoldierStats(soldier);
    }
    supply.experienced=experiencedCount;
    supply.waited=aliveSoldiers.length-activeExperiencedCount;
    this.showToast(`新兵${supply.received}名受領・実戦へ${supply.deployed}名配備・予備${supply.waiting}名`);

    this.restTimer=REST_DURATION;this.restUpgradeClock=0;
    this.restReport={phase:this.phase-1,count:0,spent:0,trainedIds:[],salary:SOLDIER_SALARY};
    this.restMonsters=this.monsters || [];this.monsters=[];
    this.projectiles=[];this.screenShake=0;
    if(this.joystick)this.resetMovementInput();
    for(const soldier of [...this.squad,...(this.reserves||[])]) {soldier.vx=0;soldier.vy=0;}
    if (this.squad?.length) {
      const nearSoldier = this.squad.find(s => !s.dead && !s.isDown && Math.hypot(s.x - (this.player?.x || 0), s.y - (this.player?.y || 0)) < 350) || this.squad[0];
      if (nearSoldier) this.dialogue?.trigger(nearSoldier, 'REST_START', Date.now(), true);
    }

    // 拠点の再活性化（定期復活）
    if (this.outposts) {
      this.outposts.forEach(op => {
        if (op.cleared && (this.phase - (op.clearedWave || 0)) >= 2) {
          op.cleared = false;
          op.hp = op.maxHp;
        }
      });
    }

    // 次期パラメーター初期化
    this.phaseCasualties = 0;
    this.phaseInitialSquadCount = this.squad.filter(s => !s.dead).length;

    refreshWaveCatalogs(this,generateRandomDrop);
    this._merchantShopRefresh?.();
    this.saveGame();
    this.updateStatsUI();
    if(!this.container?.querySelector('#strategy-modal')?.classList.contains('hidden'))this.renderStrategyUI();
  },

  changeTimePeriod() {
    const time=daylightAt(this.worldTime);
    const filter=enemies=>(enemies||[]).filter(m=>{
      if(enemyAvailable(m,time.period))return true;
      m.retreated=true;return false;
    });
    this.monsters=filter(this.monsters);this.restMonsters=filter(this.restMonsters);
    this.projectiles=(this.projectiles||[]).filter(p=>!p.target?.retreated);
    this.showToast(time.period==='night'?'夜になりました。昼の敵が退き、夜の敵が現れます。':'夜が明けました。夜の敵が退き、昼の敵が現れます。');
    this.saveGame();
  },

  maintenanceSummary() {
    const report=this.restReport;
    if(!report)return `戦線${PHASE_DURATION}秒 → 次のラウンド開始まで${REST_DURATION}秒。その間は敵と戦闘を休止し、兵士が自費で自己強化します（定期給与${SOLDIER_SALARY}G）。`;
    return `${this.restTimer>0?`次のラウンド開始まで残り${Math.ceil(this.restTimer)}秒`:`第${report.phase}期の整備結果`}：${report.trainedIds.length}名が計${report.count}回強化 / 自費${report.spent}G。定期給与は既存兵士に各${report.salary}G。会議中は待機時計も停止。`;
  },

  processRestSecond() {
    if(!this.restReport)return;
    const seen=new Set();
    for(const soldier of [...this.squad,...(this.reserves||[])].filter(s=>!s.dead)) {
      const record=soldier.lastMaintenance ||= {phase:this.restReport.phase,count:0,spent:0,status:''};
      if(soldier.isDown) {record.status='負傷ダウン中';continue;}
      const equipment=[...new Map(Object.values(soldier.equipped||{}).filter(Boolean).map(i=>[i.id,i])).values()];
      const candidates=equipment.filter(i=>!seen.has(i.id))
        .sort((a,b)=>(a.upgrade||0)-(b.upgrade||0)||this.getUpgradeCost(a)-this.getUpgradeCost(b));
      const chosen=candidates.find(i=>(soldier.gold||0)>=this.getUpgradeCost(i)+6);
      if(!chosen){record.status=!equipment.length?'装備なし':'資金不足（維持費6Gを確保）';continue;}
      const cost=this.getUpgradeCost(chosen);soldier.gold-=cost;
      applyUpgradeStats(chosen,(chosen.upgrade||0)+1);seen.add(chosen.id);
      record.count++;record.spent+=cost;record.status=`${chosen.name}を整備`;
      this.restReport.count++;this.restReport.spent+=cost;
      if(!this.restReport.trainedIds.includes(soldier.id))this.restReport.trainedIds.push(soldier.id);
      this.recalcSoldierStats(soldier);
    }
    this.saveGame();
  },

  finishRest() {
    this.restTimer=0;this.restUpgradeClock=0;
    this.monsters=(this.restMonsters||[]).filter(m=>m.hp>0 && enemyAvailable(m,daylightAt(this.worldTime).period));this.restMonsters=[];
    if(!this.monsters.length && !this.currentDungeon)this.seedInitialMonsters();
    this.spawnTimer=0;
    if(!this.phaseFiscal||this.phaseFiscal.phase!==this.phase)this.beginPhaseFiscal();
    this.processSharedEquipmentBox();
    this.showToast(`第${this.phase}期開始 · 自己強化${this.restReport?.count||0}回完了`);
    this.saveGame();this.updateStatsUI();
  },

  checkPeriodicDialogue(dt) {
    if (!this.dialogue || this.restTimer > 0 || !this.squad?.length || !this.player) return;

    // 1. 本陣帰還チェック（CAMP_RETURN）
    const insideBase = !this.currentDungeon && Math.hypot(this.player.x - BASE_CAMP.x, this.player.y - BASE_CAMP.y) < BASE_CAMP.radius;
    if (insideBase && !this._wasInsideBaseCamp) {
      const nearSoldier = this.squad.find(s => !s.dead && !s.isDown && Math.hypot(s.x - this.player.x, s.y - this.player.y) < 300);
      if (nearSoldier) this.dialogue.trigger(nearSoldier, 'CAMP_RETURN', Date.now(), true);
    }
    this._wasInsideBaseCamp = insideBase;

    // 2. 周期的なパトロールつぶやき & ボス遭遇チェック（4.5秒ごと）
    this._dialogueTimer = (this._dialogueTimer || 0) + dt;
    if (this._dialogueTimer >= 4.5) {
      this._dialogueTimer = 0;
      const camX = this.camera ? this.camera.x : this.player.x;
      const camY = this.camera ? this.camera.y : this.player.y;
      const nearSoldiers = this.squad.filter(s => !s.dead && !s.isDown && Math.hypot(s.x - camX, s.y - camY) < 320);
      if (nearSoldiers.length > 0) {
        const lucky = nearSoldiers[Math.floor(Math.random() * nearSoldiers.length)];
        const nearBoss = (this.monsters || []).find(m => (m.isBoss || m.isColossal) && m.hp > 0 && Math.hypot(m.x - lucky.x, m.y - lucky.y) < 280);
        if (nearBoss) {
          this.dialogue.trigger(lucky, 'BOSS_ENCOUNTER');
        } else if (Math.random() < 0.40) {
          this.dialogue.trigger(lucky, 'PATROL');
        }
      }
    }
  },

  update(dt) {
    if (!this.inBattle) return;
    this.dialogue?.update(dt);
    this.checkPeriodicDialogue(dt);
    updateMedicalPosts(this,dt);
    updateSupplies(this,dt);
    updateMagic(this,dt,supplyLocation);
    this.ageRemains(dt);
    this.autoSaveClock = (this.autoSaveClock || 0) + dt;
    if (this.autoSaveClock >= 10) { this.autoSaveClock = 0; this.saveGame(); }
    this.reserveCheckTimer = (this.reserveCheckTimer || 0) + dt;
    if(this.reserveCheckTimer>=1) { this.reserveCheckTimer=0; this.deployReserves(true); }

    // シームレス作戦期タイマー進行
    if(advanceWorldClock(this,dt))this.changeTimePeriod();
    if(this.restTimer>0)updateWounded(this,0);
    if(advanceRest(this,dt)) {this.updateStatsUI(false);return;}
    this.totalBattleTime = (this.totalBattleTime || 0) + dt;
    advancePhase(this,dt);
    if(this.restTimer>0) {updateWounded(this,0);this.updateStatsUI(false);return;}

    updateHazards(this,dt);if(!this.inBattle||this.player.hp<=0)return;
    // 画面揺れ減衰 & 救助快足バフ減衰
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 2.5);
    }
    if (this.rescueBuffTimer > 0) {
      this.rescueBuffTimer = Math.max(0, this.rescueBuffTimer - dt);
    }

    // シームレス自律リポップ更新
    this.updateSpawns(dt);

    const aliveSquad = activeSquad(this);
    const raidDefenders=aliveSquad.concat((this.gateGuards||[]).filter(g=>gateGuardVisible(this,g)&&!g.isDown&&g.hp>0));
    const now = performance.now();
    const isCommandActive = now < this.commandActiveUntil;
    const currentRank = RANKS[this.rankIndex];
    this.rebuildMonsterSpatial();
    try {
      if (typeof this.rebuildSquadSpatial === 'function') this.rebuildSquadSpatial(aliveSquad);
    } catch (e) { console.warn('rebuildSquadSpatial', e); }
    const BASE_TERRITORY_RADIUS = 2200;
    const BASE_TERRITORY_R2 = BASE_TERRITORY_RADIUS * BASE_TERRITORY_RADIUS;
    // Precompute base-territory threats once/frame (avoids O(squad*monsters) filter hypot).
    const threatR = BASE_TERRITORY_RADIUS + 250;
    const threatR2 = threatR * threatR;
    const btx = BASE_CAMP.x, bty = BASE_CAMP.y;
    const threatList = this._baseThreatList || (this._baseThreatList = []);
    threatList.length = 0;
    for (let ti = 0; ti < (this.monsters || []).length; ti++) {
      const tm = this.monsters[ti];
      if (tm.isRaidMob || this._distSq(tm.x, tm.y, btx, bty) <= threatR2) threatList.push(tm);
    }
    this.revealFogAroundPlayer();

    // 部隊の重心を計算
    let squadCenterX = BASE_CAMP.x;
    let squadCenterY = BASE_CAMP.y;
    if (aliveSquad.length > 0) {
      squadCenterX = aliveSquad.reduce((sum, s) => sum + s.x, 0) / aliveSquad.length;
      squadCenterY = aliveSquad.reduce((sum, s) => sum + s.y, 0) / aliveSquad.length;
    }

    // 主人公と部隊の距離チェック
    const distToSquad = Math.hypot(this.player.x - squadCenterX, this.player.y - squadCenterY);

    // プレイヤー移動（ソロで自由に動け、部隊方向へ向かう時はダッシュ追従ブースト！）
    let playerMoveSpeed = this.player.speed;
    let isCatchingUp = false;

    if (this.joystick.active) {
      if (distToSquad > 80 && aliveSquad.length > 0) {
        // 部隊重心への方向とスティック入力の内積
        const toSquadX = (squadCenterX - this.player.x) / distToSquad;
        const toSquadY = (squadCenterY - this.player.y) / distToSquad;
        const dot = this.joystick.dirX * toSquadX + this.joystick.dirY * toSquadY;
        if (dot > 0.25) {
          // 部隊へ駆け寄っている時はダッシュブースト！（最大1.32倍 ≒ 218px/s）
          playerMoveSpeed = this.player.speed * (1.18 + dot * 0.14);
          isCatchingUp = true;
          if (Math.random() < 0.12) {
            this.pushParticle({
              x: this.player.x + (Math.random() - 0.5) * 6,
              y: this.player.y + 8,
              vx: -this.joystick.dirX * 20,
              vy: -this.joystick.dirY * 20,
              color: 'rgba(210, 200, 180, 0.45)',
              size: 2.5,
              life: 0.25
            });
          }
        }
      }

      if (this.rescueBuffTimer > 0) {
        playerMoveSpeed *= 1.35; // ✨ 救助の英雄 快足バフ (+35%ダッシュ)
        if (Math.random() < 0.18) {
          this.pushParticle({
            x: this.player.x + (Math.random() - 0.5) * 16,
            y: this.player.y + 8,
            vx: -this.joystick.dirX * 30 + (Math.random() - 0.5) * 15,
            vy: -this.joystick.dirY * 30 + (Math.random() - 0.5) * 15,
            color: 'rgba(56, 189, 248, 0.75)',
            size: 3.2,
            life: 0.3
          });
        }
      }

      playerMoveSpeed*=transportSpeedFactor(this,this.player);
      this.player.x += this.joystick.dirX * playerMoveSpeed * dt;
      this.player.y += this.joystick.dirY * playerMoveSpeed * dt;
      const boundW = this.currentDungeon ? this.currentDungeon.width : MAP_WIDTH;
      const boundH = this.currentDungeon ? this.currentDungeon.height : MAP_HEIGHT;
      this.player.x = Math.max(30, Math.min(boundW - 30, this.player.x));
      this.player.y = Math.max(30, Math.min(boundH - 30, this.player.y));

      if (Math.hypot(this.joystick.dirX, this.joystick.dirY) > 0.05) {
        this.player.facingAngle = Math.atan2(this.joystick.dirY, this.joystick.dirX);
      }
    }

    // カメラ追従（画面中央にプレイヤーを捉え、ズーム境界を安全クランプ）
    const z = this.zoom || 1.0;
    this.camera.x += (this.player.x - this.camera.x) * 0.12;
    this.camera.y += (this.player.y - this.camera.y) * 0.12;
    const boundW = this.currentDungeon ? this.currentDungeon.width : MAP_WIDTH;
    const boundH = this.currentDungeon ? this.currentDungeon.height : MAP_HEIGHT;
    const halfW = (this.width / 2) / z;
    const halfH = (this.height / 2) / z;
    this.camera.x = Math.max(halfW, Math.min(boundW - halfW, this.camera.x));
    this.camera.y = Math.max(halfH, Math.min(boundH - halfH, this.camera.y));

    // ゾーン監視＆ダンジョン処理
    if (!this.currentDungeon) {
      this.checkZoneTransition();
      this.checkDungeonProximity();
    } else {
      if (this.currentDungeon.kind === 'town') this.checkMerchantProximity();
      // ダンジョン内: 入口帰還ポータル (x: 180, y: h/2) 接触判定
      const exitDist = Math.hypot(this.player.x - 180, this.player.y - (this.currentDungeon.height / 2));
      if (this.currentDungeon.kind==='town'?townExitReached(this):exitDist < 42) {
        this.exitDungeon();
      }
      // ダンジョン内: 最奥至宝箱 (x: w - 240, y: h/2) 接近判定
      if (this.dungeonVault && !this.dungeonVault.opened && this.dungeonVault.unlocked) {
        const vaultDist = Math.hypot(this.player.x - this.dungeonVault.x, this.player.y - this.dungeonVault.y);
        if (vaultDist < 48) {
          this.openDungeonVault();
        }
      }
    }

    if (this.zoneAlertFlash > 0) {
      this.zoneAlertFlash = Math.max(0, this.zoneAlertFlash - dt * 1.2);
    }

    // 定期侵攻と低頻度のランダム強襲。休息・屋内は進行を待つ。
    this.updateDemonInvasion(dt);
    updateGateGuards(this,dt);
    this.checkBaseRaidTrigger();
    this.updateBaseRaid(dt);

    if (!this.currentDungeon) {
      ensureMerchants(this, generateRandomDrop, BASE_CAMP);
      updateMerchants(this, dt, generateRandomDrop, {
        damageEscort:(escort,raw)=>this.damageTarget(escort,raw),
        damageMonster: (esc, mon, dmg) => {
          if (!mon || mon.hp <= 0) return;
          this.performAttack(esc, mon, false, dmg);
        },
        onMerchantDied: (m) => {
          this.showToast(`☠️【行商人死亡】${m.placeName}の${m.name}がモンスターに襲われ命を落とした…しばらくすると後任が来る`);
          if (this.nearMerchant && this.nearMerchant.id === m.id) this.nearMerchant = null;
          this.updateMerchantBanner();
        },
        onMerchantRespawn: (m) => {
          this.showToast(`🏪【行商人再訪】${m.placeName}に${m.name}が露店を開き直した`);
        }
      });
      this.checkMerchantProximity();
    }

    // 拠点（BASE CAMP）／宿場でのリジェネ治癒判定
    const distToBase = Math.hypot(this.player.x - BASE_CAMP.x, this.player.y - BASE_CAMP.y);
    const inBaseCamp = !this.currentDungeon && distToBase < BASE_CAMP.radius;
    const inInn = !!(this.currentDungeon && this.currentDungeon.kind === 'town');
    const healBadge = document.getElementById('base-heal-badge');

    if (inBaseCamp || inInn) {
      if (healBadge) {
        healBadge.classList.remove('hidden');
        healBadge.textContent = inInn ? '🛏️ 宿場で休息回復中' : '💚 砦本陣で部隊治癒中';
      }
      // 宿場は長距離行軍の安全な休息所：本陣よりやや速い快適回復
      const healAmt = (inInn ? 20 : 12)*(1+(this.nation?.level||0)*.1) * dt;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
      this.squad.forEach((s) => {
        if (s.dead || s.isDown) return;
        // 宿場回復は同行中の直属のみ。本隊は野外に残っているのでリモート回復しない。
        if (inInn) {
          if (!s.isPersonalGuard) return;
          s.hp = Math.min(s.maxHp, s.hp + healAmt * 0.75);
          return;
        }
        if (Math.hypot(s.x-BASE_CAMP.x,s.y-BASE_CAMP.y)<BASE_CAMP.radius) {
          s.hp = Math.min(s.maxHp, s.hp + healAmt * 0.6);
        }
      });
    } else {
      if (healBadge) {
        healBadge.classList.add('hidden');
        healBadge.textContent = '💚 砦本陣で部隊治癒中';
      }
    }

    // 直属小隊: 手動の編成を尊重。野外で定員超過時のみ降格（毎フレーム sort 回避）。
    const maxGuards = Math.min(currentRank.personalGuards || 0, PERSONAL_GUARD_MAX);
    this._guardAssignClock = (this._guardAssignClock == null) ? GUARD_ASSIGN_INTERVAL : this._guardAssignClock + dt;
    if (!this.currentDungeon && this._guardAssignClock >= GUARD_ASSIGN_INTERVAL) {
      this._guardAssignClock = 0;
      this.syncPersonalGuardSlots(aliveSquad, maxGuards);
    }
    let personalGuardCount = 0;
    for (let gi = 0; gi < aliveSquad.length; gi++) if (aliveSquad[gi].isPersonalGuard) personalGuardCount++;
    const mainBodyCount = this.squad.filter(s=>!s.dead&&!s.isPersonalGuard).length;

    // プロキシミティバッジ（テキスト変化時のみ DOM 更新）
    const proxBadge = document.getElementById('squad-proximity-badge');
    if (proxBadge) {
      let proxCls, proxTxt;
      if (!this.squad.some(s=>!s.dead)) {
        proxCls = 'proximity-badge proximity-danger';
        proxTxt = '☠️ 部隊全滅！完全孤立！';
      } else if (personalGuardCount > 0) {
        proxCls = 'proximity-badge proximity-close';
        proxTxt = '👑 直属小隊: ' + personalGuardCount + '名追従 | 🏰 本隊: ' + mainBodyCount + (this.currentDungeon?'名野外待機':'名作戦中');
      } else {
        proxCls = 'proximity-badge proximity-far';
        proxTxt = '🗡️ 単独遊撃中 (雑兵) | 🏰 本隊: ' + mainBodyCount + (this.currentDungeon?'名野外待機':'名作戦中');
      }
      if (proxBadge.className !== proxCls) proxBadge.className = proxCls;
      if (proxBadge.textContent !== proxTxt) proxBadge.textContent = proxTxt;
    }

    // 小隊（Platoons）ナビゲーション重心の更新 (本隊約48名は本陣防衛圏内をテリトリーとし、危険ゾーン奥地へ勝手に迷い込むのを完全防止！)
    if (!this.platoons) this.initPlatoons();
    this._nearBaseClock = (this._nearBaseClock || 0) + dt;
    if (!this._nearBaseMonsters || this._nearBaseClock >= 0.2) {
      this._nearBaseClock = 0;
      const nb = [];
      let nearestM = null, nearestD = Infinity;
      for (let mi = 0; mi < this.monsters.length; mi++) {
        const m = this.monsters[mi];
        const dsq = this._distSq(m.x, m.y, BASE_CAMP.x, BASE_CAMP.y);
        if (dsq <= BASE_TERRITORY_R2) {
          nb.push(m);
          if (dsq < nearestD) { nearestD = dsq; nearestM = m; }
        }
      }
      this._nearBaseMonsters = nb;
      this._nearestNearBaseMonster = nearestM;
    }
    const nearBaseMonsters = this._nearBaseMonsters;
    const nearestNearBaseMonster = this._nearestNearBaseMonster;

    // 小隊遠征: 死線手前チェック（間引き）→ 自動帰還
    this._expeditionCheckClock = (this._expeditionCheckClock || 0) + dt;
    if (this._expeditionCheckClock >= EXPEDITION_CHECK_INTERVAL) {
      this._expeditionCheckClock = 0;
      for (const platoon of this.platoons) {
        if (platoon.mission !== 'expedition') continue;
        const members = expeditionMembers(this, platoon.id, platoon.expeditionMemberIds);
        if (shouldAutoReturn(platoon, members)) {
          beginReturnState(platoon, 'casualty');
          this.showToast(`${platoon.icon}${platoon.name.split(' ')[0]} 死にそうなので帰還！生存者は本陣へ`);
        }
      }
    }

    this.platoons.forEach((platoon) => {
      if (this.currentDungeon) return; // 本隊の野外座標と作戦重心を維持。

      // 小隊遠征 / 自動帰還（テリトリー外OK・LODは兵士側で既存）
      if (platoon.mission === 'returning') {
        const hx = BASE_CAMP.x, hy = BASE_CAMP.y;
        platoon.x += (hx - platoon.x) * 1.6 * dt;
        platoon.y += (hy - platoon.y) * 1.6 * dt;
        if (Math.hypot(platoon.x - hx, platoon.y - hy) < EXPEDITION_RETURN_HOME) {
          this.completePlatoonExpeditionReturn(platoon);
        }
        return;
      }
      if (platoon.mission === 'expedition') {
        let tx = platoon.expeditionTargetX, ty = platoon.expeditionTargetY;
        // Prefer nearby threat (throttled scan — LOD-friendly)
        platoon._threatClock = (platoon._threatClock || 0) + dt;
        if (platoon._threatClock >= 0.2 || !platoon._cachedThreat) {
          platoon._threatClock = 0;
          let nearThreat = null, nearD = expeditionEngageRadius(platoon);
          for (let mi = 0; mi < this.monsters.length; mi++) {
            const m = this.monsters[mi];
            if (!m || (m.hp || 0) <= 0) continue;
            const d = Math.hypot(m.x - platoon.x, m.y - platoon.y);
            if (d < nearD) { nearD = d; nearThreat = m; }
          }
          platoon._cachedThreat = nearThreat;
        }
        const nearThreat = platoon._cachedThreat && (platoon._cachedThreat.hp || 0) > 0 ? platoon._cachedThreat : null;
        if (!nearThreat) platoon._cachedThreat = null;
        if (nearThreat) { tx = nearThreat.x; ty = nearThreat.y; }
        else if (tx == null || ty == null) {
          const retarget = pickExpeditionTarget(this, BASE_CAMP, BASE_TERRITORY_RADIUS, platoon.expeditionDangerTier);
          platoon.expeditionTargetX = retarget.x;
          platoon.expeditionTargetY = retarget.y;
          platoon.expeditionLabel = retarget.label;
          tx = retarget.x; ty = retarget.y;
        }
        platoon.x += (tx - platoon.x) * 1.35 * dt;
        platoon.y += (ty - platoon.y) * 1.35 * dt;
        // Arrived at objective with no fight: nudge further out
        if (!nearThreat && Math.hypot((tx || 0) - platoon.x, (ty || 0) - platoon.y) < 80) {
          const retarget = pickExpeditionTarget(this, BASE_CAMP, BASE_TERRITORY_RADIUS, platoon.expeditionDangerTier);
          platoon.expeditionTargetX = retarget.x;
          platoon.expeditionTargetY = retarget.y;
          platoon.expeditionLabel = retarget.label;
        }
        return; // no territory clamp while away
      }

      if (isCommandActive) {
        // 号令発動中のみ一時的に主人公へ駆け寄る
        platoon.x += (this.player.x - platoon.x) * 2.2 * dt;
        platoon.y += (this.player.y - platoon.y) * 2.2 * dt;
      } else {
        if (platoon.id === 0) {
          // 第1小隊: 前衛突撃隊（本陣防衛圏内の未制圧砦・近郊ボスへ向かって進軍）
          let targetOutpost = (this.outposts || []).find(o => !o.cleared && Math.hypot(o.x - BASE_CAMP.x, o.y - BASE_CAMP.y) <= BASE_TERRITORY_RADIUS);
          const p0Boss = nearBaseMonsters.find(m => m.isBoss || m.isElite);
          const pTarget = p0Boss || targetOutpost || nearestNearBaseMonster;
          if (pTarget) {
            platoon.x += (pTarget.x - platoon.x) * 1.5 * dt;
            platoon.y += (pTarget.y - platoon.y) * 1.5 * dt;
          } else {
            // 近郊に敵がいなければ本陣北東近郊で防衛哨戒
            const homeX = BASE_CAMP.x + 180;
            const homeY = BASE_CAMP.y - 140;
            platoon.x += (homeX - platoon.x) * 1.2 * dt;
            platoon.y += (homeY - platoon.y) * 1.2 * dt;
          }
        } else if (platoon.id === 1) {
          // 第2小隊: 機動遊撃隊（本陣防衛圏内のドロップ宝箱、または近郊モンスターへ）
          const p1Drop = this.dropsOnField.find(d => Math.hypot(d.x - BASE_CAMP.x, d.y - BASE_CAMP.y) <= BASE_TERRITORY_RADIUS);
          if (p1Drop) {
            platoon.x += (p1Drop.x - platoon.x) * 1.8 * dt;
            platoon.y += (p1Drop.y - platoon.y) * 1.8 * dt;
          } else if (nearestNearBaseMonster) {
            platoon.x += (nearestNearBaseMonster.x - platoon.x) * 1.2 * dt;
            platoon.y += (nearestNearBaseMonster.y - platoon.y) * 1.2 * dt;
          } else {
            // 近郊に敵がいなければ本陣南西近郊で防衛哨戒
            const homeX = BASE_CAMP.x - 180;
            const homeY = BASE_CAMP.y + 140;
            platoon.x += (homeX - platoon.x) * 1.2 * dt;
            platoon.y += (homeY - platoon.y) * 1.2 * dt;
          }
        } else {
          // 第3小隊: 本陣防衛隊（本陣直近400px内の敵を迎撃、いなければ本陣周囲を旋回哨戒）
          const nearBaseEnemy = nearBaseMonsters.find(m => Math.hypot(m.x - BASE_CAMP.x, m.y - BASE_CAMP.y) < 400);
          if (nearBaseEnemy) {
            platoon.x += (nearBaseEnemy.x - platoon.x) * 2.0 * dt;
            platoon.y += (nearBaseEnemy.y - platoon.y) * 2.0 * dt;
          } else {
            const patrolAngle = now * 0.0008;
            platoon.x = BASE_CAMP.x + Math.cos(patrolAngle) * 90;
            platoon.y = BASE_CAMP.y + Math.sin(patrolAngle) * 90;
          }
        }
      }

      // 小隊重心が安全テリトリー外へ出ないようクランプ（遠征中はスキップ済）
      if (!this.currentDungeon) {
        const pDist = Math.hypot(platoon.x - BASE_CAMP.x, platoon.y - BASE_CAMP.y);
        if (pDist > BASE_TERRITORY_RADIUS) {
          platoon.x = BASE_CAMP.x + ((platoon.x - BASE_CAMP.x) / pDist) * BASE_TERRITORY_RADIUS;
          platoon.y = BASE_CAMP.y + ((platoon.y - BASE_CAMP.y) / pDist) * BASE_TERRITORY_RADIUS;
        }
      }
    });

    updateWounded(this,dt);
    for(let i=aliveSquad.length-1;i>=0;i--)if(aliveSquad[i].dead)aliveSquad.splice(i,1);
    this._medicRescueAssign = buildMedicRescueAssign(rescueUnits(this).filter(s=>!this.currentDungeon||inCurrentInstance(this,s)));
    // Shared mana regeneration and supply are processed once by updateMagic.
    if (!this.currentDungeon) {
      this._civSpawnClock = (this._civSpawnClock || 0) + dt;
      if (this._civSpawnClock >= 12) { this._civSpawnClock = 0; ensureCiviliansSpawned(this, { targetCount: 4 }); }
    }

    // 各兵士の自律行動・兵種戦闘・救助
    aliveSquad.forEach((soldier, idx) => {
      const clsKey = soldier.soldierClass || 'HEAVY';
      const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;
      const platoon = this.platoons[soldier.platoonId % 3] || this.platoons[0];

      if(soldier.shieldTimer > 0) soldier.shieldTimer = Math.max(0, soldier.shieldTimer - dt);
      if(soldier.dead||soldier.isDown)return;
      if(isMage(soldier)&&(soldier.magicRecovering||soldier.mana<MAGIC_AFFINITIES[soldier.magicAffinity].cost)){updateMageAI(this,soldier,dt,platoon,cls);return;}
      if(handleTransportAI(this,soldier,dt))return;
      if(isMage(soldier)){updateMageAI(this,soldier,dt,platoon,cls);return;}
      if(isMedic(soldier))castMedicBuff(this,soldier);

      // Far LOD v1.24.2: keep 2200 + 7/8 skip; expose farCam for boids.
      const lodR = 2200;
      let farCam = false;
      if (!soldier.isPersonalGuard && !this.currentDungeon && this.camera && this.player) {
        farCam = Math.abs(soldier.x - this.camera.x) > lodR || Math.abs(soldier.y - this.camera.y) > lodR;
        const farPl = Math.hypot(soldier.x - this.player.x, soldier.y - this.player.y) > lodR;
        if (farCam && farPl) {
          soldier._lodTick = (soldier._lodTick || 0) + 1;
          if ((soldier._lodTick & 7) !== 0) {
            const pdx = platoon.x - soldier.x, pdy = platoon.y - soldier.y;
            const pd = Math.hypot(pdx, pdy) || 1;
            if (pd > 48) {
              const sp = (soldier.speed || 90) * 0.28 * dt;
              soldier.x += (pdx / pd) * sp;
              soldier.y += (pdy / pd) * sp;
            }
            return;
          }
        }
      } else if (this.camera) {
        farCam = Math.abs(soldier.x - this.camera.x) > lodR || Math.abs(soldier.y - this.camera.y) > lodR;
      }

      // Personal-squad AI throttle: heavy every 4th frame (orbit/move every frame).
      soldier._pgTick = (soldier._pgTick || 0) + 1;
      const pgLight = !!soldier.isPersonalGuard && ((soldier._pgTick % 4) !== 0);

      // Main-body near-cam: light move every frame; nearest/attack every 3 frames unless in range of cache.
      soldier._mbTick = (soldier._mbTick || 0) + 1;
      let mbCombatLight = false;
      if (!soldier.isPersonalGuard) {
        const ce = soldier._cachedEnemy;
        const inRange = ce && !ce.dead && (ce.hp || 0) > 0 && this._distSq(ce.x, ce.y, soldier.x, soldier.y) <= (200 * 200);
        if (!inRange && (soldier._mbTick % 3) !== 0) mbCombatLight = true;
      }
      const aiLight = pgLight || mbCombatLight;

      // 衛生兵（MEDIC）および大司教（HIGH_PRIEST）の自動救助 — 負傷者へ分散割当
      if (clsKey === 'MEDIC' || clsKey === 'HIGH_PRIEST' || clsKey === 'SAINT' || clsKey === 'ARCHANGEL') {
        if (!this._medicRescueAssign) this._medicRescueAssign = buildMedicRescueAssign(rescueUnits(this).filter(s=>!this.currentDungeon||inCurrentInstance(this,s)));
        const downedMate = this._medicRescueAssign.get(soldier.id) || null;
        if (downedMate && downedMate.isDown && !downedMate.dead) {
          const mdx = downedMate.x - soldier.x;
          const mdy = downedMate.y - soldier.y;
          const mdist = Math.hypot(mdx, mdy);
          const moveSpeed = soldier.speed * (clsKey === 'HIGH_PRIEST' ? 1.45 : 1.3);
          if (mdist > 40) {
            soldier.x += (mdx / mdist) * moveSpeed * dt;
            soldier.y += (mdy / mdist) * moveSpeed * dt;
            soldier.facingAngle = Math.atan2(mdy, mdx);
          } else {
            treatWounded(this,soldier,downedMate,dt);
          }
          return;
        }
      }

      // 大司教（HIGH_PRIEST）のパッシブ: 聖域リジェネ結界 (周囲140pxの味方に毎秒最大HP1.5%持続治癒)
      // v1.24.2: timer every frame; skip O(squad) heal pulse on AI light frames
      if (clsKey === 'HIGH_PRIEST') {
        soldier.regenTimer = (soldier.regenTimer || 0) + dt;
        if (!aiLight && soldier.regenTimer >= 1.0) {
          soldier.regenTimer = 0;
          if (medicHasStamina(soldier, MEDIC_AURA_COST)) {
            const healTargets = [this.player, ...aliveSquad.filter(m => !m.isDown)];
            let any = 0;
            for (const ht of healTargets) {
              if (Math.hypot(ht.x - soldier.x, ht.y - soldier.y) <= 140) {
                const regAmt = Math.max(3, Math.floor(ht.maxHp * 0.015));
                const restored=healByMedic(soldier,ht,regAmt,this);
                if(restored>0) { any += restored; this.spawnDamageText(ht.x, ht.y - 14, `+${Math.round(restored)}`, '#34d399'); }
              }
            }
            if (any > 0) spendMedicStamina(soldier, MEDIC_AURA_COST);
          }
        }
      }

      // 兵士同士のBoid反発 (団子化防止)
      // Boid separation (v1.24.2: near-camera only; skip farCam/off-screen + light frames)
      let offScreenBoid = false;
      if (this.camera && this.width && this.height) {
        const z = this.camera.zoom || 1;
        const halfW = (this.width / 2) / z + 80;
        const halfH = (this.height / 2) / z + 80;
        offScreenBoid = Math.abs(soldier.x - this.camera.x) > halfW || Math.abs(soldier.y - this.camera.y) > halfH;
      }
      if (!aiLight && !farCam && !offScreenBoid && ((idx + (soldier._lodTick || 0)) & 1) === 0) {
        for (let j = 0; j < aliveSquad.length; j++) {
          if (idx === j) continue;
          const other = aliveSquad[j];
          if (other.isDown) continue;
          const odx = soldier.x - other.x;
          const ody = soldier.y - other.y;
          const odist = Math.hypot(odx, ody);
          if (odist > 0 && odist < 22) {
            const pushForce = (22 - odist) * 2.2 * dt;
            soldier.x += (odx / odist) * pushForce;
            soldier.y += (ody / odist) * pushForce;
          }
        }
      }

      // 携帯ポーション手当
      soldier.medCooldown = (soldier.medCooldown || 0) - dt;
      if (soldier.hp < soldier.maxHp * 0.45 && soldier.medCooldown <= 0) {
        if ((soldier.gold || 0) >= 8) {
          soldier.gold -= 8;
          soldier.medCooldown = 4.0;
          soldier.hp = Math.min(soldier.maxHp, soldier.hp + Math.floor(soldier.maxHp * 0.4));
          this.spawnDamageText(soldier.x, soldier.y - 24, '💚手当て! (-8G)', '#34d399');
          sound.playItem();
        }
      }

      // 衛生兵（MEDIC）＆大司教（HIGH_PRIEST）の治癒魔法 ＆ 神聖浄化弾
      // v1.24.2: skip O(squad) hurt find on AI light frames (downed rescue above stays every frame)
      if ((clsKey === 'MEDIC' || clsKey === 'HIGH_PRIEST' || clsKey === 'SAINT' || clsKey === 'ARCHANGEL') && !aiLight) {
        soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
        if (soldier.atkCooldown <= 0) {
          // 治癒対象の選定（プレイヤーまたはHP低下中の味方）
          let hurtTarget = this.player.hp < this.player.maxHp * 0.85 ? this.player : null;
          for (const m of aliveSquad) {
            if (!m.isDown && m.hp < m.maxHp * 0.75) {
              if (!hurtTarget || (m.hp / m.maxHp) < (hurtTarget.hp / hurtTarget.maxHp)) {
                hurtTarget = m;
              }
            }
          }

          if (hurtTarget && Math.hypot(hurtTarget.x - soldier.x, hurtTarget.y - soldier.y) <= (cls.range || 180)) {
            if (!medicHasStamina(soldier, MEDIC_HEAL_COST)) { soldier.atkCooldown = 0.4; }
            else if (spendMedicStamina(soldier, MEDIC_HEAL_COST)) {
            soldier.atkCooldown = cls.atkCooldown;
            soldier.atkAnim = 1.0;
            soldier.facingAngle = Math.atan2(hurtTarget.y - soldier.y, hurtTarget.x - soldier.x);
            if (!this.projectiles) this.projectiles = [];
            let healAmt = soldier.healPower || (26 + Math.floor((soldier.atk || 12) * 1.5));
            // 仲間の最大HPに対する割合治癒を保証（衛生兵: 最低18%回復、大司教: 最低35%大回復！）
            const minPctHeal = Math.floor(hurtTarget.maxHp * (clsKey === 'HIGH_PRIEST' ? 0.35 : 0.18));
            healAmt = Math.max(healAmt, minPctHeal);
            const isHigh = healAmt >= 50;
            this.projectiles.push({
              x: soldier.x, y: soldier.y,
              target: hurtTarget,
              type: 'HEAL',
              healer: soldier,
              amount: healAmt,
              speed: 280,
              color: clsKey === 'HIGH_PRIEST' ? '#f472b6' : (isHigh ? '#00f0ff' : '#34d399'),
              isHighHeal: isHigh
            });
            sound.playHeal(soldier.x,soldier.y);
            }
          } else if (clsKey === 'HIGH_PRIEST' || clsKey === 'MEDIC') {
            // 大司教は全員が元気な場合、敵へ「神聖浄化弾 (SMITE)」を放ち攻撃に参加！
            // 基本衛生兵は護身用の弱い単体弾（ATK×1.0）。治癒・蘇生が最優先のため、魔力は治癒用に残す（残量40以上のときのみ）
            const basicMedic = clsKey === 'MEDIC';
            const nearestEnemyToHealer = this.getNearestMonster(soldier.x, soldier.y);
            if (nearestEnemyToHealer && Math.hypot(nearestEnemyToHealer.x - soldier.x, nearestEnemyToHealer.y - soldier.y) <= cls.range && (!basicMedic || ensureMana(soldier) >= MEDIC_SELF_DEFENSE_MIN_MANA) && spendMana(soldier,basicMedic?MEDIC_SELF_DEFENSE_COST:20)) {
              soldier.atkCooldown = cls.atkCooldown;
              soldier.atkAnim = 1.0;
              soldier.facingAngle = Math.atan2(nearestEnemyToHealer.y - soldier.y, nearestEnemyToHealer.x - soldier.x);
              if (!this.projectiles) this.projectiles = [];
              const smiteDmg = Math.round(soldier.atk * (basicMedic ? 1.0 : 1.6));
              this.projectiles.push({
                x: soldier.x, y: soldier.y,
                target: nearestEnemyToHealer,
                attacker: soldier,
                type: 'SMITE',
                noSplash: basicMedic,
                damage: smiteDmg,
                speed: 320,
                color: '#f472b6'
              });
              sound.playMagic('lightning',soldier.x,soldier.y);
            }
          }
        }
      }

      // 自律移動目標の決定（直属小隊ならプレイヤーに追従！本隊なら小隊重心で防衛圏内を作戦行動！）
      let targetX, targetY;
      if (soldier.isPersonalGuard) {
        const guardIndex = soldier._guardSlot != null ? soldier._guardSlot : 0;
        const guardAngle = (guardIndex * 1.25) + (now * 0.001);
        const guardDist = 32 + (guardIndex % 4) * 10;
        targetX = this.player.x + Math.cos(guardAngle) * guardDist;
        targetY = this.player.y + Math.sin(guardAngle) * guardDist;
      } else {
        // 本隊: 遠征選抜メンバーのみ小隊重心に追随。未選抜は本陣防衛圏に残留。
        const onExpedition = isSoldierOnExpedition(platoon, soldier);
        const pAngle = (idx * 1.1) + (now * 0.0006);
        const pDist = 28 + (idx % 6) * 14;
        if (onExpedition) {
          targetX = platoon.x + Math.cos(pAngle) * pDist;
          targetY = platoon.y + Math.sin(pAngle) * pDist;
        } else {
          const homeX = BASE_CAMP.x + (platoon.id - 1) * 70;
          const homeY = BASE_CAMP.y + (platoon.id === 1 ? 80 : -40);
          targetX = homeX + Math.cos(pAngle) * pDist;
          targetY = homeY + Math.sin(pAngle) * pDist;
        }

        // 本隊兵士が安全防衛圏から勝手に外へ飛び出さないようクランプ（遠征選抜のみ免除）
        if (!this.currentDungeon && !onExpedition) {
          const dBase = Math.hypot(targetX - BASE_CAMP.x, targetY - BASE_CAMP.y);
          if (dBase > BASE_TERRITORY_RADIUS) {
            targetX = BASE_CAMP.x + ((targetX - BASE_CAMP.x) / dBase) * BASE_TERRITORY_RADIUS;
            targetY = BASE_CAMP.y + ((targetY - BASE_CAMP.y) / dBase) * BASE_TERRITORY_RADIUS;
          }
        }
      }

      // 敵索敵（直属／ダンジョン／遠征選抜は自由索敵。通常本隊は防衛圏内＋強襲）
      let nearestEnemy;
      const platoonAwayFight = isSoldierOnExpedition(platoon, soldier);
      if (soldier.isPersonalGuard || this.currentDungeon || platoonAwayFight) {
        if (aiLight && soldier._cachedEnemy && !soldier._cachedEnemy.dead && (soldier._cachedEnemy.hp || 0) > 0) {
          nearestEnemy = soldier._cachedEnemy;
        } else {
          nearestEnemy = this.getNearestMonster(soldier.x, soldier.y);
          soldier._cachedEnemy = nearestEnemy;
        }
      } else if (aiLight && soldier._cachedEnemy && !soldier._cachedEnemy.dead && (soldier._cachedEnemy.hp || 0) > 0) {
        nearestEnemy = soldier._cachedEnemy;
      } else {
        nearestEnemy = this.getNearestFromList(soldier.x, soldier.y, this._baseThreatList);
        soldier._cachedEnemy = nearestEnemy;
      }
      const enemyDist = nearestEnemy ? Math.hypot(nearestEnemy.x - soldier.x, nearestEnemy.y - soldier.y) : 9999;

      // AI light frame: orbit/move only, skip auto-attack & class skills this tick.
      if (aiLight && enemyDist >= 360) {
        const dxL = targetX - soldier.x, dyL = targetY - soldier.y;
        const distL = Math.hypot(dxL, dyL);
        if (distL > 6) {
          const moveStep = Math.min(distL * 3.5, soldier.speed) * dt;
          soldier.x += (dxL / distL) * moveStep;
          soldier.y += (dyL / distL) * moveStep;
          soldier.facingAngle = Math.atan2(dyL, dxL);
        }
        if (soldier.atkAnim > 0) soldier.atkAnim = Math.max(0,soldier.atkAnim-dt*attackAnimationRate(soldier.equipped?.weapon||soldier.weapon,soldier.atkSpeed));
        soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
        return;
      }

      // 兵種ごとの交戦間合い
      if (nearestEnemy && enemyDist < 360) {
        if (isRangedUnit(this,soldier)) {
          // 弓兵/神射手: 接近されすぎたら後退、射程内なら立ち止まって射撃
          const rkWpn = (soldier.equipped && soldier.equipped.weapon) || soldier.weapon;
          const rkBase = this.combatProfileFor(soldier,rkWpn,false);
          const rkProf = rkBase.ranged?rkBase:this.combatProfileFor(soldier,{weaponStyle:'bow'},false);
          const reachHint = (rkProf.ranged ? rkProf.reach : 250) || 250;
          const safeDist = clsKey === 'SNIPER' ? 95 : (rkProf.style === 'cannon' ? 110 : 75);
          const maxDist = rkProf.stone?Math.max(cls.range*.75,reachHint)*.92:Math.max(clsKey === 'SNIPER' ? 340 : 230, reachHint * 0.92);
          if (enemyDist < safeDist) {
            targetX = soldier.x - (nearestEnemy.x - soldier.x);
            targetY = soldier.y - (nearestEnemy.y - soldier.y);
          } else if (enemyDist < maxDist) {
            targetX = soldier.x;
            targetY = soldier.y;
          } else if(rkProf.stone) {
            targetX=nearestEnemy.x;targetY=nearestEnemy.y;
          }
        } else if (clsKey === 'HEAVY' || clsKey === 'PALADIN' || clsKey === 'TEMPLAR' || clsKey === 'IMMORTAL_AEGIS') {
          // 重装/聖騎士: 敵に真っ向から突進
          targetX = nearestEnemy.x;
          targetY = nearestEnemy.y;
        } else if (clsKey === 'LIGHT' || clsKey === 'BLADEMASTER' || clsKey === 'SWORD_EMPEROR' || clsKey === 'VOID_EDGE') {
          // 軽装/剣聖: 敵の側面に回り込む（剣聖は素早く回り込み）
          const sideAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x) + 0.8;
          targetX = nearestEnemy.x + Math.cos(sideAngle) * 35;
          targetY = nearestEnemy.y + Math.sin(sideAngle) * 35;
        }
      }

      const dx = targetX - soldier.x;
      const dy = targetY - soldier.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const moveStep = Math.min(dist * 3.5, soldier.speed) * dt;
        soldier.x += (dx / dist) * moveStep;
        soldier.y += (dy / dist) * moveStep;
        soldier.facingAngle = Math.atan2(dy, dx);
      }

      if (soldier.atkAnim > 0) soldier.atkAnim = Math.max(0,soldier.atkAnim-dt*attackAnimationRate(soldier.equipped?.weapon||soldier.weapon,soldier.atkSpeed));

      // オート攻撃（兵種・上位職ごとの固有スキル）
      soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
      if (nearestEnemy && soldier.atkCooldown <= 0) {
        // 主人公が覇王（WARLORD）なら部隊全員のATK+25%オーラ付与
        const warlordMult = this.player.isAdvanced ? 1.25 : 1.0;
        // soldier.atk は recalcSoldierStats で武器ATKを既に含む（二重加算しない）
        const totalAtk = Math.round(soldier.atk * warlordMult * SOLDIER_PHYS_DMG_MULT);

        if (isRangedUnit(this,soldier)) {
          const rWpn = (soldier.equipped && soldier.equipped.weapon) || soldier.weapon || null;
          const rProf = this.combatProfileFor(soldier, rWpn, false);
          // 遠隔武器未装備時はクラス既定の弓扱い
          const rangedProf = rProf.ranged ? rProf : this.combatProfileFor(soldier, { weaponStyle: 'bow' }, false);
          const shotRange = rangedProf.stone?Math.max(cls.range*.75,rangedProf.reach):Math.max(cls.range, rangedProf.reach || cls.range);
          if (enemyDist <= shotRange) {
            const cd = Math.max(0.35/(rangedProf.stone?.75:1), (rangedProf.baseCooldown || cls.atkCooldown) / Math.max(0.55, (soldier.atkSpeed || 1)));
            soldier.atkCooldown = clsKey === 'SNIPER' ? cd * 0.88 : cd;
            soldier.atkAnim = 1.0;
            soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
            soldier.attackAngle = soldier.facingAngle;
            if (!this.projectiles) this.projectiles = [];
            const dmg = Math.round(totalAtk * (rangedProf.atkMult ? 1 : 1)); // atk already includes weapon mult via stats
            if (clsKey === 'SNIPER' && rangedProf.style === 'bow') {
              for (const off of [-0.18, 0, 0.18])this.spawnRangedProjectile(soldier,nearestEnemy,Math.round(dmg*.9),{...rangedProf,starOffset:off},false);
            } else {
              this.spawnRangedProjectile(soldier, nearestEnemy, dmg, rangedProf, false);

            }
          }
        } else if (clsKey === 'PALADIN' && enemyDist <= cls.range + 25) {
          // 聖騎士（PALADIN）: 光輝の盾衝撃波（前方広角スプラッシュ＆ノックバック）
          soldier.atkCooldown = cls.atkCooldown;
          soldier.atkAnim = 1.0;
          soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
          soldier.attackAngle = soldier.facingAngle;
          // 前方扇状範囲（100px以内、前方80度）の敵全員を一網打尽
          const bashRange = 85;
          let hitCount = 0;
          for (const m of this.monsters) {
            const mDist = Math.hypot(m.x - soldier.x, m.y - soldier.y);
            if (mDist <= bashRange) {
              const mAng = Math.atan2(m.y - soldier.y, m.x - soldier.x);
              let diffAng = Math.abs(mAng - soldier.facingAngle);
              if (diffAng > Math.PI) diffAng = Math.PI * 2 - diffAng;
              if (diffAng <= 1.0) { // 角度約60度
                this.performAttack(soldier, m, false, totalAtk);
                // ノックバック
                m.x += Math.cos(mAng) * 20;
                m.y += Math.sin(mAng) * 20;
                hitCount++;
              }
            }
          }
          this.spawnSparks(soldier.x, soldier.y, '#67e8f9', 12);
          sound.playBomb();
        } else if (clsKey === 'BLADEMASTER' && enemyDist <= cls.range + 40) {
          // 剣聖（BLADEMASTER）: 神速二刀連撃 ＆ 疾風飛翔真空刃（SWORD_BEAM）射出
          soldier.atkCooldown = cls.atkCooldown;
          soldier.atkAnim = 1.0;
          soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
          soldier.attackAngle = soldier.facingAngle;
          this.performAttack(soldier, nearestEnemy, false, totalAtk);

          // 疾風真空刃を前方へ飛ばす（貫通弾）
          if (!this.projectiles) this.projectiles = [];
          this.projectiles.push({
            x: soldier.x, y: soldier.y,
            vx: Math.cos(soldier.facingAngle) * 380,
            vy: Math.sin(soldier.facingAngle) * 380,
            attacker: soldier,
            type: 'SWORD_BEAM',
            damage: Math.round(totalAtk * 0.85),
            life: 0.55,
            hitEnemies: [],
            color: '#fbbf24'
          });
          sound.playSlash();
        } else if (clsKey !== 'ARCHER' && clsKey !== 'MEDIC' && clsKey !== 'HIGH_PRIEST' && clsKey !== 'SNIPER') {
          const sWpn = (soldier.equipped && soldier.equipped.weapon) || soldier.weapon || null;
          const sProf = this.combatProfileFor(soldier, sWpn, false);
          const meleeReach = Math.max(cls.range, sProf.style === 'spear' ? Math.floor(sProf.reach * 0.55) : (sProf.style === 'hammer' ? Math.max(cls.range,52)*(sWpn?.weaponTraits?.length||1) : cls.range*(sWpn?.weaponTraits?.length||1)));
          if (enemyDist <= meleeReach) {
            // 近接通常攻撃（槍=貫通、鎚=高威力ノックバック）。マスタリーで攻撃速度↑（baseCooldown短縮と同カーブ）
            const cdMult = sProf.style === 'spear' ? 1.5 : (sProf.style === 'hammer' ? 1.85 : 1.0);
            // 遅い武器の火力補填（槍×1.15／鎚×1.35）。新旧武器どちらの兵士経路にも同じ式を適用
            const styleDmgMult = sProf.style === 'spear' ? SOLDIER_SPEAR_DMG_MULT : (sProf.style === 'hammer' ? SOLDIER_HAMMER_DMG_MULT : 1);
            const meleeAtk = Math.max(1, Math.round(totalAtk * styleDmgMult));
            const masteryCd = masteryReloadMult(soldier.weaponMastery, sProf.style);
            soldier.atkCooldown = cls.atkCooldown * cdMult * masteryCd / Math.max(.55,sWpn?.weaponTraits?(soldier.atkSpeed||1)*(sWpn.weaponTraits.attackTempo||1):1);
            soldier.atkAnim = 1.0;
            soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
            soldier.attackAngle = soldier.facingAngle;
            if (sProf.pierce) {
              const ang = soldier.facingAngle;
              const cos = Math.cos(ang), sin = Math.sin(ang);
              for (const m of this.monsters) {
                if (!m || m.hp <= 0) continue;
                const dx = m.x - soldier.x, dy = m.y - soldier.y;
                const along = dx * cos + dy * sin;
                if (along < -6 || along > meleeReach) continue;
                const perp = Math.abs(-dy * cos + dx * sin);
                if (perp <= sProf.pierceHalfWidth + (m.radius || 12)) {
                  this.performAttack(soldier, m, false, meleeAtk, along);
                }
              }
            } else {
              this.performMeleeSweep(soldier,nearestEnemy,false,meleeAtk,sProf,meleeReach);
            }
          }
        }

        // 敵が近くにおらず、未制圧拠点の至近距離なら拠点を攻撃！
        if (!nearestEnemy || enemyDist > 160) {
          const nearOp = this.getNearestUnclearedOutpost(soldier.x, soldier.y);
          if (nearOp && Math.hypot(nearOp.x - soldier.x, nearOp.y - soldier.y) <= nearOp.radius + 55 && soldier.atkCooldown <= 0) {
            soldier.atkCooldown = cls.atkCooldown;
            soldier.atkAnim = 1.0;
            soldier.facingAngle = Math.atan2(nearOp.y - soldier.y, nearOp.x - soldier.x);
            this.damageOutpost(nearOp,isRangedUnit(this,soldier)?takeRangedShot(soldier,totalAtk).damage:totalAtk,soldier);
          }
        }
      }
    });

    // 弾丸・矢・ヒール光弾・真空刃・魔導矢の更新
    if (this.projectiles) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];

        // 1. 直進貫通弾（SWORD_BEAM: 疾風真空刃）
        if (proj.type === 'SWORD_BEAM') {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.life -= dt;
          if (proj.life <= 0) {
            this.projectiles.splice(i, 1);
            continue;
          }
          // 触れた敵に貫通ヒット
          for (const m of this.monsters) {
            if (proj.hitEnemies.includes(m)) continue;
            if (Math.hypot(m.x - proj.x, m.y - proj.y) <= 30) {
              proj.hitEnemies.push(m);
              this.performAttack(proj.attacker, m, false, proj.damage, false);
              this.spawnSparks(m.x, m.y, '#fbbf24', 6);
            }
          }
          continue;
        }

        // 2. 直進・誘導光矢（STAR_ARROW: 神射手の天星光矢）
        if (proj.type === 'STAR_ARROW') {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.life -= dt;
          let hit = false;
          // 敵との衝突判定
          for (const m of this.monsters) {
            if (Math.hypot(m.x - proj.x, m.y - proj.y) <= 24) {
              hit = true;
              break;
            }
          }
          if (hit || proj.life <= 0) {
            this.projectiles.splice(i, 1);
            // 星屑スプラッシュ爆発（周囲35pxの敵全員にダメージ）
            for (const m of this.monsters) {
              if (Math.hypot(m.x - proj.x, m.y - proj.y) <= 38) {
                this.performAttack(proj.attacker, m, false, proj.damage, false);
              }
            }
            this.spawnSparks(proj.x, proj.y, '#34d399', 10);
            sound.playBomb();
            continue;
          }
          continue;
        }

        // 3. 神聖浄化弾（SMITE: 大司教）
        if (proj.type === 'SMITE') {
          const tgt = proj.target;
          if (!tgt || tgt.hp <= 0) {
            this.projectiles.splice(i, 1);
            continue;
          }
          const pdx = tgt.x - proj.x;
          const pdy = tgt.y - proj.y;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist < 20) {
            this.projectiles.splice(i, 1);
            // 十字爆発スプラッシュ
            for (const m of proj.noSplash ? [tgt] : this.monsters) {
              if (proj.noSplash || Math.hypot(m.x - tgt.x, m.y - tgt.y) <= 42) {
                this.performAttack(proj.attacker, m, false, proj.damage, false);
              }
            }
            this.spawnSparks(tgt.x, tgt.y, '#f472b6', 12);
            sound.playBomb();
          } else {
            proj.x += (pdx / pdist) * proj.speed * dt;
            proj.y += (pdy / pdist) * proj.speed * dt;
          }
          continue;
        }

        // 4. 敵大ボスの火炎ブレス弾（BREATH_FLAME）
        if (proj.type === 'BREATH_FLAME') {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.life -= dt;
          if (proj.life <= 0) {
            this.projectiles.splice(i, 1);
            continue;
          }
          // プレイヤーまたは生存兵士へのヒット判定
          const hitTargets = [this.player, ...aliveSquad.filter(s => !s.isDown)];
          let hitAny = false;
          for (const ht of hitTargets) {
            if (Math.hypot(ht.x - proj.x, ht.y - proj.y) <= (ht === this.player ? 22 : 16)) {
              this.damageTarget(ht, proj.damage);
              this.spawnSparks(ht.x, ht.y, '#ef4444', 8);
              hitAny = true;
              break;
            }
          }
          if (hitAny) {
            this.projectiles.splice(i, 1);
            continue;
          }
          continue;
        }

        // 5. 敵大ボスの古代光線弾（TITAN_BEAM）
        if (proj.type === 'TITAN_BEAM') {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.life -= dt;
          if (proj.life <= 0) {
            this.projectiles.splice(i, 1);
            continue;
          }
          const hitTargets = [this.player, ...aliveSquad.filter(s => !s.isDown)];
          let hitAny = false;
          for (const ht of hitTargets) {
            if (Math.hypot(ht.x - proj.x, ht.y - proj.y) <= (ht === this.player ? 22 : 16)) {
              this.damageTarget(ht, proj.damage);
              this.spawnSparks(ht.x, ht.y, '#06b6d4', 8);
              hitAny = true;
              break;
            }
          }
          if (hitAny) {
            this.projectiles.splice(i, 1);
            continue;
          }
          continue;
        }

        // 6b. 火砲弾（直進・着弾スプラッシュ）
        if (proj.type === 'CANNONBALL') {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.life -= dt;
          let impact = null;
          for (const m of this.monsters) {
            if (!m || m.hp <= 0) continue;
            if (Math.hypot(m.x - proj.x, m.y - proj.y) <= 22) { impact = m; break; }
          }
          if (impact || proj.life <= 0) {
            const ix = impact ? impact.x : proj.x;
            const iy = impact ? impact.y : proj.y;
            const rad = proj.splash || 52;
            this.projectiles.splice(i, 1);
            for (const m of this.monsters) {
              if (!m || m.hp <= 0) continue;
              if (Math.hypot(m.x - ix, m.y - iy) <= rad) {
                this.performAttack(proj.attacker, m, !!proj.isPlayer, proj.damage, false);
                if ((proj.knockback || 0) > 0 && !m.isColossal) {
                  const ka = Math.atan2(m.y - iy, m.x - ix);
                  m.x += Math.cos(ka) * proj.knockback;
                  m.y += Math.sin(ka) * proj.knockback;
                }
              }
            }
            this.spawnSparks(ix, iy, proj.color || '#f59e0b', 14);
            sound.playBomb();
          }
          continue;
        }

        // 6. 通常矢（ARROW）/ ボルト（BOLT）/ ヒール光弾（HEAL）
        const tgt = proj.target;
        if (!tgt || (tgt.hp <= 0 && ['ARROW','BOLT','STONE'].includes(proj.type))) {
          this.projectiles.splice(i, 1);
          continue;
        }

        const pdx = tgt.x - proj.x;
        const pdy = tgt.y - proj.y;
        const pdist = Math.hypot(pdx, pdy);

        if (pdist < 18) {
          this.projectiles.splice(i, 1);
          if (['ARROW','BOLT','STONE'].includes(proj.type)) {
            this.performAttack(proj.attacker, tgt, !!proj.isPlayer, proj.damage, false);
            if(proj.type!=='STONE')this.spawnSparks(tgt.x, tgt.y, proj.color || '#e2e8f0', proj.type === 'BOLT' ? 7 : 5);
            if ((proj.knockback || 0) > 0 && !tgt.isColossal) {
              const ka = Math.atan2(tgt.y - (proj.attacker?.y || tgt.y), tgt.x - (proj.attacker?.x || tgt.x));
              tgt.x += Math.cos(ka) * proj.knockback;
              tgt.y += Math.sin(ka) * proj.knockback;
            }
          } else if (proj.type === 'HEAL') {
            const restored=healByMedic(proj.healer,tgt,proj.amount,this);
            if(restored<=0) continue;
            const isHigh = proj.isHighHeal || proj.amount >= 50;
            const healText = isHigh ? `💚+${Math.round(restored)}HP 大治癒!` : `+${Math.round(restored)}HP`;
            const healColor = proj.color || (isHigh ? '#00f0ff' : '#34d399');
            this.spawnDamageText(tgt.x, tgt.y - 18, healText, healColor);
            this.spawnSparks(tgt.x, tgt.y, healColor, isHigh ? 12 : 6);
            if (isHigh) sound.playHighScore();
          }
        } else {
          proj.x += (pdx / pdist) * proj.speed * dt;
          proj.y += (pdy / pdist) * proj.speed * dt;
        }
      }
    }

    // 主人公の自動攻撃 (敵モンスター or 近くの未制圧拠点)
    this.player.atkCooldown -= dt;
    if (this.player.slashAnim > 0) this.player.slashAnim = Math.max(0,this.player.slashAnim-dt*attackAnimationRate(this.equipped?.weapon,this.player.atkSpeed));

    // パワーアタック（渾身強撃 💥）のクールタイム減算 ＆ UI更新
    if ((this.player.powerAtkCooldown || 0) > 0) {
      this.player.powerAtkCooldown = Math.max(0, this.player.powerAtkCooldown - dt);
      this.updatePowerAtkButtonUI();
    }
    this.updatePowerFx(dt);

    const nearestMonster = this.getNearestMonster(this.player.x, this.player.y);
    const nearestOp = this.getNearestUnclearedOutpost(this.player.x, this.player.y);

    if (nearestMonster && this.player.atkCooldown <= 0) {
      const dist = Math.hypot(nearestMonster.x - this.player.x, nearestMonster.y - this.player.y);
      const isWarlord = this.player.isAdvanced;
      const wpn = (this.equipped && this.equipped.weapon) || null;
      const wProf = this.combatProfileFor(this.player, wpn, true);
      const reach = isWarlord ? wProf.reachWarlord : wProf.ranged?wProf.reach:(wProf.playerReach||wProf.reach);
      const baseCd = isWarlord ? Math.min(0.42/(wProf.stone?.75:1), wProf.baseCooldown * 0.8) : wProf.baseCooldown;

      if (dist <= reach) {
        this.player.atkCooldown = baseCd / (this.player.atkSpeed || 1);
        this.player.slashAngle = Math.atan2(nearestMonster.y - this.player.y, nearestMonster.x - this.player.x);
        this.player.slashAnim = 1;

        // 隊長は職制限なし。遠隔装備時は射撃、近接時は従来モーション。
        if (wProf.ranged) {
          this.spawnRangedProjectile(this.player, nearestMonster, this.player.atk, wProf, true);

        } else if (isWarlord) {
          // 覇王ウォーロード: 全方位360度「覇王紅蓮絶刃」！周囲の敵全員を切り裂く！
          const warReach = Math.max(115, reach);
          for (const m of this.monsters) {
            if (Math.hypot(m.x - this.player.x, m.y - this.player.y) <= warReach) {
              this.performAttack(this.player, m, true, this.player.atk);
            }
          }
          this.spawnSparks(this.player.x, this.player.y, '#f59e0b', 12);
        } else if (wProf.pierce) {
          // 槍: 視線方向の直線上を貫通（中距離・複数ヒット）
          const ang = this.player.slashAngle;
          const cos = Math.cos(ang), sin = Math.sin(ang);
          let hitAny = false;
          for (const m of this.monsters) {
            if (!m || m.hp <= 0) continue;
            const dx = m.x - this.player.x, dy = m.y - this.player.y;
            const along = dx * cos + dy * sin;
            if (along < -8 || along > reach) continue;
            const perp = Math.abs(-dy * cos + dx * sin);
            if (perp <= wProf.pierceHalfWidth + (m.radius || 12)) {
              this.performAttack(this.player, m, true, undefined, along);
              hitAny = true;
            }
          }
          if (!hitAny) this.performAttack(this.player, nearestMonster, true);
          this.spawnSparks(
            this.player.x + cos * Math.min(reach * 0.55, dist),
            this.player.y + sin * Math.min(reach * 0.55, dist),
            '#c4b48a', 8
          );
        } else {
          this.performMeleeSweep(this.player,nearestMonster,true,undefined,wProf,reach);
        }
      }
    } else if (nearestOp && this.player.atkCooldown <= 0) {
      const distOp = Math.hypot(nearestOp.x - this.player.x, nearestOp.y - this.player.y);
      const wProfOp = this.combatProfileFor(this.player, (this.equipped && this.equipped.weapon) || null, true);
      const opReach = (wProfOp.ranged ? (wProfOp.reach || 250) : 50);
      if (distOp <= nearestOp.radius + opReach) {
        this.player.atkCooldown = wProfOp.baseCooldown / (this.player.atkSpeed || 1);
        this.player.slashAngle = Math.atan2(nearestOp.y - this.player.y, nearestOp.x - this.player.x);
        this.player.slashAnim = 1;
        const opDmg = wProfOp.ranged ? Math.round(this.player.atk * 0.85) : this.player.atk;
        this.damageOutpost(nearestOp,wProfOp.ranged?takeRangedShot(this.player,opDmg).damage:opDmg);
        if (wProfOp.ranged) sound.playSlash();
      }
    }

    syncDragged(this,dt);

    // モンスターの追跡＆攻撃＆大ボス固有スキル
    // Perf: awaken by camera/player/platoon — skip O(squad) scans for sleeping far mobs
    const awakenR2 = 900 * 900; // v1.24.1 was 1100
    const camAx = this.camera.x, camAy = this.camera.y;
    const camWake = 1200; // v1.24.1 was 1500
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.hitPulse > 0) m.hitPulse -= dt * 4;
      if(m.magicStunTimer>0)continue;

      const pDistSq = this._distSq(this.player.x, this.player.y, m.x, m.y);
      let target = this.player;
      let minDist = Math.sqrt(pDistSq);

      if (!m.isRaidMob && !m.isColossal) {
        let awake = (Math.abs(m.x - camAx) < camWake && Math.abs(m.y - camAy) < camWake) || pDistSq <= awakenR2;
        if (!awake && this.platoons) {
          for (let pi = 0; pi < this.platoons.length; pi++) {
            const pl = this.platoons[pi];
            if (this._distSq(pl.x, pl.y, m.x, m.y) <= 700 * 700) { awake = true; break; }
          }
        }
        if (!awake) {
          if (m.homeX !== undefined && (m.returningHome || this._distSq(m.x, m.y, m.homeX, m.homeY) > (m.isBoss ? 810000 : 422500))) {
            const dx = m.homeX - m.x, dy = m.homeY - m.y, d = Math.sqrt(dx * dx + dy * dy);
            m.returningHome = d > 30;
            if (d > 30) { const step = Math.min(d, m.speed * dt * 0.55*(m.magicSlowTimer>0?.55:1)); m.x += dx / d * step; m.y += dy / d * step; }
          }
          continue;
        }
      }

      if (m.isRaidMob) {
        minDist = 999999;
        target = null;
        for (const s of raidDefenders) {
          if (s.isDown) continue;
          const d = Math.sqrt(this._distSq(s.x, s.y, m.x, m.y));
          if (d < minDist) { minDist = d; target = s; }
        }
        const pDist = Math.sqrt(pDistSq);
        if (pDist < minDist) { minDist = pDist; target = this.player; }
        if (!target || minDist > 400) {
          target = { x: BASE_CAMP.x, y: BASE_CAMP.y };
          minDist = Math.sqrt(this._distSq(BASE_CAMP.x, BASE_CAMP.y, m.x, m.y));
        }
      } else {
        // v1.24.2: near=every frame; mid=every 2; far=every 4. Prefer spatial nearby-only when not near player.
        m._aiTick = (m._aiTick || 0) + 1;
        const nearPlayer = pDistSq <= (520 * 520);
        const farPlayer = pDistSq > (900 * 900);
        const retargetPeriod = nearPlayer ? 1 : (farPlayer ? 4 : 2);
        if (nearPlayer || (m._aiTick % retargetPeriod) === 0) {
          if (nearPlayer) {
            for (const s of aliveSquad) {
              if (s.isDown) continue;
              const dsq = this._distSq(s.x, s.y, m.x, m.y);
              if (dsq < minDist * minDist) {
                minDist = Math.sqrt(dsq);
                target = s;
              }
            }
          } else {
            let nearS = null;
            try {
              if (typeof this.getNearestSquadInSpatial === 'function') {
                nearS = this.getNearestSquadInSpatial(m.x, m.y, minDist);
              }
            } catch (e) { nearS = null; }
            if (nearS) {
              target = nearS.s;
              minDist = nearS.dist;
            } else {
              // Fallback linear scan if spatial missing/throws
              for (const s of aliveSquad) {
                if (s.isDown) continue;
                const dsq = this._distSq(s.x, s.y, m.x, m.y);
                if (dsq < minDist * minDist) {
                  minDist = Math.sqrt(dsq);
                  target = s;
                }
              }
            }
          }
        } else if (m._cachedTarget && !m._cachedTarget.dead && (m._cachedTarget.hp || 0) > 0 && !m._cachedTarget.isDown) {
          target = m._cachedTarget;
          minDist = Math.sqrt(this._distSq(target.x, target.y, m.x, m.y));
        }
        m._cachedTarget = target;
      }

      if (!m.isRaidMob) {
        if (m.homeX !== undefined && (m.returningHome || this._distSq(m.x,m.y,m.homeX,m.homeY)>(m.isBoss?810000:422500))) {
          const dx=m.homeX-m.x,dy=m.homeY-m.y,d=Math.sqrt(dx*dx+dy*dy);m.returningHome=d>30;
          if(d>30){const step=Math.min(d,m.speed*dt*(m.magicSlowTimer>0?.55:1));m.x+=dx/d*step;m.y+=dy/d*step;}continue;
        }
        if (minDist > 800) continue;
      }

      // 大ボスの固有スキルタイマー・発動処理
      if (m.isColossal) {
        m.skillTimer = (m.skillTimer || 5.0) - dt;
        if (m.skillTimer <= 0) {
          m.skillTimer = m.bossDef ? m.bossDef.skillCooldown : 5.0;

          if (m.type === 'behemoth_king') {
            // 巨獣王：大地粉砕（アースクエイク）！全方位衝撃波＋画面大揺れ
            this.screenShake = 0.55;
            const shockTargets = [this.player, ...aliveSquad.filter(s => !s.isDown)];
            for (const tgt of shockTargets) {
              const td = Math.hypot(tgt.x - m.x, tgt.y - m.y);
              if (td <= 180) {
                this.damageTarget(tgt, Math.round(m.atk * 0.9));
                const knockAng = Math.atan2(tgt.y - m.y, tgt.x - m.x);
                tgt.x += Math.cos(knockAng) * 35;
                tgt.y += Math.sin(knockAng) * 35;
              }
            }
            this.spawnDamageText(m.x, m.y - 45, '💥大地粉砕(アースクエイク)!', '#f59e0b');
            this.spawnSparks(m.x, m.y, '#f59e0b', 28);
            sound.playBomb();
          } else if (m.type === 'colossal_dragon') {
            // 超巨大古竜：超火炎ブレス！扇状広角に炎弾6発一斉放射
            this.screenShake = 0.35;
            const baseAng = Math.atan2(target.y - m.y, target.x - m.x);
            if (!this.projectiles) this.projectiles = [];
            for (let fi = -3; fi <= 3; fi++) {
              const fAng = baseAng + fi * 0.16;
              this.projectiles.push({
                x: m.x, y: m.y,
                vx: Math.cos(fAng) * 320,
                vy: Math.sin(fAng) * 320,
                damage: Math.round(m.atk * 0.85),
                life: 0.9,
                type: 'BREATH_FLAME',
                color: '#ef4444'
              });
            }
            this.spawnDamageText(m.x, m.y - 45, '🔥超火炎ブレス!', '#ef4444');
            sound.playLaser();
          } else if (m.type === 'colossal_titan') {
            // 古代巨神：古代殲滅光線！8方位へレーザー光弾斉射
            this.screenShake = 0.4;
            if (!this.projectiles) this.projectiles = [];
            for (let bi = 0; bi < 8; bi++) {
              const bAng = (bi / 8) * Math.PI * 2;
              this.projectiles.push({
                x: m.x, y: m.y,
                vx: Math.cos(bAng) * 300,
                vy: Math.sin(bAng) * 300,
                damage: Math.round(m.atk * 0.8),
                life: 1.0,
                type: 'TITAN_BEAM',
                color: '#06b6d4'
              });
            }
            this.spawnDamageText(m.x, m.y - 45, '✨神話殲滅光線!', '#06b6d4');
            sound.playLaser();
          }
        }
      }

      const dx = target.x - m.x;
      const dy = target.y - m.y;
      const dist = Math.hypot(dx, dy);

      const wallBlocked=m.isMajorInvasion&&wallBlocksAttack(this,m,target);
      if (dist > (m.attackReach||(m.radius ? m.radius * 0.8 : 12)) || wallBlocked) {
        const slow=m.magicSlowTimer>0?.55:1;
        m.x += (dx / dist) * m.speed * slow * dt;
        m.y += (dy / dist) * m.speed * slow * dt;
      } else {
        m.atkTimer = (m.atkTimer || 0) - dt;
        if (m.atkTimer <= 0) {
          m.atkTimer = m.attackInterval||1.0;
          if (target && target.hp !== undefined) {
            this.damageTarget(target, m.atk);
            if(m.cleaveRadius){let swept=0;for(const unit of [this.player,...raidDefenders]){
              if(unit===target||unit.dead||unit.isDown||unit.hp<=0||Math.hypot(unit.x-target.x,unit.y-target.y)>m.cleaveRadius||Math.hypot(unit.x-m.x,unit.y-m.y)>m.attackReach+m.cleaveRadius||wallBlocksAttack(this,m,unit))continue;
              this.damageTarget(unit,Math.round(m.atk*.65));if(++swept>=2)break;
            }}
          }
        }
      }
    }

    applyFortifications(this,dt);

    // ドロップ回収: 1. 兵士による回収 (上位装備なら自動着替え＆強化引き継ぎ！)
    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      if (drop.isBoss || drop.isOrb) continue; // ボスドロップ・覚醒宝珠は兵士は触らない！

      for (const s of aliveSquad) {
        if (s.isDown) continue;
        const distS = Math.hypot(drop.x - s.x, drop.y - s.y);
        if (distS < 26) {
          if(drop.isMagicStone){this.dropsOnField.splice(i,1);distributeMagicStones(this,drop.mana);this.spawnDamageText(s.x,s.y-20,`魔法石 +${drop.mana}MP`,'#bcaed4');break;}
          if(drop.isAmmo){this.dropsOnField.splice(i,1);distributeAmmo(this,drop.ammo);this.spawnDamageText(s.x,s.y-20,`弾薬 +${drop.ammo}`,'#d8cfb0');break;}
          const item = drop.item;recordMerchantEquipment(this,item);
          this.dropsOnField.splice(i, 1);
          const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;

          if (slotKey) {
            if (!s.equipped) s.equipped = {};
            const curItem = s.equipped[slotKey];
            const fav = s.favoriteWeapon || 'sword';
            // 得意武器タイプを優先して自動装備（スコア+好み補正）
            const curScore = curItem ? this.equipmentValueFor(s,curItem,slotKey) : 0;
            const newScore = this.equipmentValueFor(s,item,slotKey);
            const isBetter = Number.isFinite(newScore) && (!curItem || newScore > curScore+1e-6) && !curItem?.favorite && !isGodRollProtected(curItem) && !item.favorite && !isGodRollProtected(item);

            if (isBetter) {
              s.equipped[slotKey] = item;
              if (slotKey === 'weapon') s.weapon = item;
              if(curItem)(this.sharedEquipBox ||= []).push(curItem);
              this.recalcSoldierStats(s);
              this.spawnDamageText(s.x, s.y - 20, `🛡️[${item.name}]着用!`, '#38bdf8');
            } else {
              // 配布してから余剰を外販。拾った本人だけで不要と判断しない。
              (this.sharedEquipBox ||= []).push(item);
              this.spawnDamageText(s.x, s.y - 20, '📦部隊共有へ', '#b8c7ae');
            }
          }
          sound.playItem();
          break;
        }
      }
    }

    // ドロップ回収: 2. プレイヤーによる回収 (ボスドロップ ＆ 兵士が拾わなかったドロップの横取り😈)
    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      const distP = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
      if (distP < 44) {
        const item = drop.item;
        const isBossDrop = drop.isBoss;
        this.dropsOnField.splice(i, 1);
        if(drop.isMagicStone){distributeMagicStones(this,drop.mana);this.spawnDamageText(this.player.x,this.player.y-20,`魔法石 +${drop.mana}MP`,'#bcaed4');}
        else if(drop.isAmmo){distributeAmmo(this,drop.ammo);this.spawnDamageText(this.player.x,this.player.y-20,`弾薬 +${drop.ammo}`,'#d8cfb0');}
        else this.collectDrop(item, isBossDrop);
      }
    }

    // ダメージテキスト (swap-pop — avoid O(n) splice shifts / GC)
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = this.damageTexts[i];
      dtObj.y -= 28 * dt;
      dtObj.life -= dt;
      if (dtObj.life <= 0) {
        this.damageTexts[i] = this.damageTexts[this.damageTexts.length - 1];
        this.damageTexts.pop();
      }
    }

    // パーティクル (swap-pop)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    // パワーアタック衝撃波（SHOCKWAVES）の寿命管理
    if (this.shockwaves) {
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.life -= dt;
        if (sw.life <= 0) this.shockwaves.splice(i, 1);
      }
    }
    this.updateStatsUI(false); // Refresh HUD during quiet exploration, with the existing throttle.
  },

  _distSq(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  },

  rebuildMonsterSpatial() {
    const cell = SPATIAL_CELL;
    const grid = this._monsterGrid || (this._monsterGrid = new Map());
    grid.clear();
    const monsters = this.monsters || [];
    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      const cx = Math.floor(m.x / cell);
      const cy = Math.floor(m.y / cell);
      const key = cx + ',' + cy;
      let bucket = grid.get(key);
      if (!bucket) { bucket = []; grid.set(key, bucket); }
      bucket.push(m);
    }
  },

  /** v1.24.2: alive non-down soldiers spatial hash for cheap enemy retarget. */
  rebuildSquadSpatial(aliveSquad) {
    const cell = SPATIAL_CELL;
    const grid = this._squadGrid || (this._squadGrid = new Map());
    grid.clear();
    const arr = aliveSquad || [];
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      if (!s || s.isDown) continue;
      const cx = Math.floor(s.x / cell);
      const cy = Math.floor(s.y / cell);
      const key = cx + ',' + cy;
      let bucket = grid.get(key);
      if (!bucket) { bucket = []; grid.set(key, bucket); }
      bucket.push(s);
    }
  },

  /** Nearby-only nearest soldier via squad spatial (3x3 cells). Returns {s, dist} or null. */
  getNearestSquadInSpatial(x, y, maxDist) {
    const cell = SPATIAL_CELL;
    const grid = this._squadGrid;
    if (!grid || !grid.size) return null;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    let nearest = null;
    let minDistSq = (maxDist != null ? maxDist : 9999) * (maxDist != null ? maxDist : 9999);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const bucket = grid.get((cx + ox) + ',' + (cy + oy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const s = bucket[i];
          if (!s || s.isDown || s.dead) continue;
          const dsq = this._distSq(s.x, s.y, x, y);
          if (dsq < minDistSq) { minDistSq = dsq; nearest = s; }
        }
      }
    }
    return nearest ? { s: nearest, dist: Math.sqrt(minDistSq) } : null;
  },

  getNearestMonster(x, y, filterFn = null) {
    const cell = SPATIAL_CELL;
    const grid = this._monsterGrid;
    let nearest = null;
    let minDistSq = 9999 * 9999;
    if (grid && grid.size) {
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const bucket = grid.get((cx + ox) + ',' + (cy + oy));
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i++) {
            const m = bucket[i];
            if (filterFn && !filterFn(m)) continue;
            const dsq = this._distSq(m.x, m.y, x, y);
            if (dsq < minDistSq) { minDistSq = dsq; nearest = m; }
          }
        }
      }
      if (nearest) return nearest;
    }
    for (const m of this.monsters || []) {
      if (filterFn && !filterFn(m)) continue;
      const dsq = this._distSq(m.x, m.y, x, y);
      if (dsq < minDistSq) { minDistSq = dsq; nearest = m; }
    }
    return nearest;
  },

  getNearestFromList(x, y, list) {
    let nearest = null;
    let minDistSq = 9999 * 9999;
    const arr = list || [];
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (!m || m.dead || (m.hp != null && m.hp <= 0)) continue;
      const dsq = this._distSq(m.x, m.y, x, y);
      if (dsq < minDistSq) { minDistSq = dsq; nearest = m; }
    }
    return nearest;
  },

  /** 遠隔弾生成。隊長は職制限なく全武器種を装備・射撃可。 */
  spawnRangedProjectile(attacker, target, damage, profile, isPlayer) {
    if (!attacker || !target) return;
    if (!this.projectiles) this.projectiles = [];
    const shot=takeRangedShot(attacker,damage);damage=shot.damage;
    sound.playWeapon(shot.loaded?(profile?.style||'bow'):'stone',attacker.x,attacker.y);
    const style = profile?.style || 'bow';
    const speed = (profile?.projSpeed || 360)*(shot.loaded||profile?.stone?1:.75);
    if(!shot.loaded){
      this.projectiles.push({x:attacker.x,y:attacker.y,target,attacker,isPlayer:!!isPlayer,type:'STONE',damage,speed,color:'#a8a29e',splash:0,knockback:0});return;
    }
    if(profile?.starOffset!=null){
      const ang=Math.atan2(target.y-attacker.y,target.x-attacker.x)+profile.starOffset;
      this.projectiles.push({x:attacker.x,y:attacker.y,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,target,attacker,isPlayer:!!isPlayer,type:'STAR_ARROW',damage,life:.9,color:'#34d399'});return;
    }
    const color = profile?.color || '#e2e8f0';
    const splash = profile?.splash || 0;
    const knock = isPlayer && this.player?.isAdvanced
      ? (profile?.knockbackWarlord || 0)
      : (profile?.knockback || 0);
    if (style === 'cannon' || profile?.projType === 'CANNONBALL') {
      const ang = Math.atan2(target.y - attacker.y, target.x - attacker.x);
      this.projectiles.push({
        x: attacker.x, y: attacker.y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        target, attacker, isPlayer: !!isPlayer,
        type: 'CANNONBALL', damage, life: 1.35, color,
        splash, knockback: knock, hitEnemies: []
      });
      return;
    }
    if (style === 'crossbow' || profile?.projType === 'BOLT') {
      this.projectiles.push({
        x: attacker.x, y: attacker.y,
        target, attacker, isPlayer: !!isPlayer,
        type: 'BOLT', damage, speed, color, knockback: knock
      });
      return;
    }
    this.projectiles.push({
      x: attacker.x, y: attacker.y,
      target, attacker, isPlayer: !!isPlayer,
      type: 'ARROW', damage, speed, color
    });
  },

  performMeleeSweep(attacker,target,isPlayer,attack,profile,reach) {
    this.performAttack(attacker,target,isPlayer,attack);
    if(!profile.sweepArc)return;
    const aim=Math.atan2(target.y-attacker.y,target.x-attacker.x);let swept=0;
    for(const m of [...this.monsters]){
      if(m===target||m.hp<=0||Math.hypot(m.x-attacker.x,m.y-attacker.y)>reach||wallBlocksAttack(this,attacker,m))continue;
      const a=Math.atan2(m.y-attacker.y,m.x-attacker.x)-aim,delta=Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));
      if(delta>profile.sweepArc/2)continue;
      this.performAttack(attacker,m,isPlayer,Math.max(1,Math.round((attack??attacker.atk??1)*.35)));if(++swept>=1)break;
    }
  },

  performAttack(attacker, monster, isPlayer, customAtk, sweetOpt) {
    if(monster?.retreated || this.restTimer>0)return;
    if (!monster || monster.hp <= 0) return;
    const baseAtk = customAtk !== undefined ? customAtk : (attacker ? (attacker.atk || 10) : 10);
    let dmg = baseAtk*(attacker?.magicAttackTimer>0?1+(attacker.magicAttackBonus||0):1);
    let isCrit = false;

    // 近接スイートスポット: sweetOpt===false でスキップ（スキル弾など）
    // sweetOpt が数値ならその距離を使用、未指定なら攻撃者〜対象のユークリッド距離
    const wItemEarly = isPlayer
      ? (this.equipped && this.equipped.weapon)
      : ((attacker && attacker.equipped && attacker.equipped.weapon) || (attacker && attacker.weapon));
    const wProfEarly = weaponCombatProfile(wItemEarly);
    let sweet = { dmgMult: 1, critBonus: 0, inSweet: false, band: 'fixed' };
    if (sweetOpt !== false && !wProfEarly.ranged) {
      const ax = attacker?.x ?? this.player?.x ?? monster.x;
      const ay = attacker?.y ?? this.player?.y ?? monster.y;
      const hitDist = (typeof sweetOpt === 'number')
        ? sweetOpt
        : Math.hypot(monster.x - ax, monster.y - ay);
      const isAdv = !!(isPlayer ? this.player?.isAdvanced : attacker?.isAdvanced);
      const reach = isAdv ? (wProfEarly.reachWarlord || wProfEarly.reach) : isPlayer&&wItemEarly?.weaponTraits?wProfEarly.playerReach:wProfEarly.reach;
      sweet = evaluateMeleeSweetSpot(wItemEarly||wProfEarly.style, hitDist, reach);
      dmg = Math.max(1, Math.round(dmg * sweet.dmgMult));
    }

    // クリ: プレイヤーは装備クリ＋スイート補正。兵士は既存どおり通常クリ無しだが、スイート内のみ補正分でクリ判定
    if (isPlayer) {
      const chance = (this.player.crit ?? 10) + (sweet.critBonus || 0);
      if (Math.random() * 100 < chance) {
        dmg = Math.floor(dmg * 2.2);
        isCrit = true;
      }
    } else {
      // 兵士: 兵種／才能／死線の s.crit（recalcSoldierStatsは装備クリを含まない）＋新武器の装備クリ＋スイート補正。魔導兵の魔法は対象外
      const soldierCrit = (attacker && !isMage(attacker) && Number.isFinite(attacker.crit)) ? attacker.crit : 0;
      const chance = soldierCrit + (wItemEarly?.weaponTraits?(wItemEarly.stats?.crit||0):0) + (sweet.inSweet?(sweet.critBonus||0):0);
      if (chance > 0 && Math.random() * 100 < chance) {
        dmg = Math.floor(dmg * 2.2);
        isCrit = true;
      }
    }

    if(!(dmg>0)) return;
    // Monster bulk (raid etc.): DEF + %軽減。通常モブは0のまま
    if ((monster.def || 0) > 0 || (monster.dmgReduction || 0) > 0) {
      const defFactor = 100 / (100 + (monster.def || 0) * 1.2);
      const red = monster.dmgReduction ? Math.min(0.45, monster.dmgReduction / 100) : 0;
      dmg = Math.max(1, Math.round(dmg * defFactor * (1 - red)));
    }
    recordCombat(attacker);
    monster.hp -= dmg;
    monster.hitPulse = 1;

    monster._damageOwner=isPlayer?this.player:attacker;monster._damageIsPlayer=!!isPlayer;
    // 武器マスタリー成長（プレイヤー=装備武器、兵士=得意武器へ投資／装備一致時は多め）
    const atkUnit = isPlayer ? this.player : attacker;
    // 行商護衛も同じ熟練度成長を受ける。
    if (atkUnit) {
      if (isPlayer) {
        const style = weaponStyleOf(this.equipped && this.equipped.weapon);
        const beforePct = masteryPctDisplay(this.player.weaponMastery, style);
        gainWeaponMastery(this.player, style);
        const afterPct = masteryPctDisplay(this.player.weaponMastery, style);
        if (Math.floor(afterPct) > Math.floor(beforePct) && Math.floor(afterPct) % 5 === 0) {
          this.recalcPlayerStats();
          this.showToast(`⚔️武器熟練（${WEAPON_STYLE_LABELS[style] || style}）+${Math.floor(afterPct)}%ATK`);
        }
      } else {
        const fav = (atkUnit.favoriteWeapon && WEAPON_STYLES.includes(atkUnit.favoriteWeapon))
          ? atkUnit.favoriteWeapon
          : weaponStyleOf((atkUnit.equipped && atkUnit.equipped.weapon) || atkUnit.weapon);
        const held = weaponStyleOf((atkUnit.equipped && atkUnit.equipped.weapon) || atkUnit.weapon);
        const gainAmt = masteryGainForStyle(fav) * ((held === fav) ? 1 : 0.35);
        const beforePct = masteryPctDisplay(atkUnit.weaponMastery, fav);
        gainWeaponMastery(atkUnit, fav, gainAmt);
        const afterPct = masteryPctDisplay(atkUnit.weaponMastery, fav);
        if (Math.floor(afterPct) > Math.floor(beforePct) && Math.floor(afterPct) % 5 === 0) {
          this.recalcSoldierStats(atkUnit);
        }
      }
    }

    // 鎚の強ノックバック（巨頭は軽減）
    const wItem = isPlayer
      ? (this.equipped && this.equipped.weapon)
      : ((attacker && attacker.equipped && attacker.equipped.weapon) || (attacker && attacker.weapon));
    const wProf = weaponCombatProfile(wItem);
    if (wProf.style === 'hammer' && !monster.isColossal) {
      const knock = isPlayer && this.player.isAdvanced
        ? (wProf.knockbackWarlord || 78)
        : (wProf.knockback || 62);
      const ang = Math.atan2(monster.y - (attacker?.y ?? this.player.y), monster.x - (attacker?.x ?? this.player.x));
      monster.x += Math.cos(ang) * knock;
      monster.y += Math.sin(ang) * knock;
      monster.atkTimer = Math.max(monster.atkTimer || 0, 0.45);
    }

    const armored=['goblin','orc','skeleton','colossus_titan','colossal_titan'].includes(monster.type);
    sound.playImpact(isMage(attacker)?'magic':armored?wProf.style:'flesh',monster.x,monster.y);
    if (isPlayer) {
      if (this.player.vampire > 0) {
        const heal = Math.ceil(dmg * this.player.vampire);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      }
    }

    this.spawnDamageText(monster.x, monster.y - 10, dmg, isCrit ? '#ffaa00' : '#ffffff');
    this.spawnSparks(monster.x, monster.y, monster.color, 6);

    if (monster.hp <= 0) {
      this.killMonster(monster, attacker, isPlayer);
    }
  },

  damageTarget(target, rawDmg, options={}) {
    const environmental=!!options.environmental;
    if (!target || target.dead || target.isDown || target.hp <= 0 || !(rawDmg > 0)) return;
    if(target===this.player&&target.invulnerableTimer>0)return;
    if(!environmental)recordCombat(target);
    // 剣聖（BLADEMASTER）のパッシブ: 残影完全回避 (25%の確率でダメージ0で回避)
    if (!environmental && target && target.soldierClass === 'BLADEMASTER' && Math.random() < 0.25) {
      this.spawnDamageText(target.x, target.y - 14, '⚡残影回避!', '#fbbf24');
      this.spawnSparks(target.x, target.y, '#fbbf24', 5);
      sound.playSlash();
      return;
    }

    // 聖騎士（PALADIN）の聖域加護 (周囲140pxに生存中の聖騎士がいれば被ダメージ-30%カット)
    let paladinGuarded = false;
    if (!environmental && this.squad) {
      const guard=this.squad.find(s => !s.dead && !s.isDown && s.soldierClass === 'PALADIN' || s.soldierClass === 'TEMPLAR' || s.soldierClass === 'IMMORTAL_AEGIS' && Math.hypot(s.x - target.x, s.y - target.y) <= 140);
      paladinGuarded=!!guard;
      if(guard) recordCombat(guard);
    }

    const defVal = target.def || 0;
    const defFactor = environmental?1:100 / (100 + defVal * 1.2);
    let reduction = !environmental&&target.dmgReduction ? Math.min(0.40, target.dmgReduction / 100) : 0;
    let dmg = Math.max(1, Math.round(rawDmg * defFactor * (1 - reduction)));

    if (paladinGuarded) {
      dmg = Math.max(1, Math.round(dmg * 0.70)); // 聖域加護で-30%
      if (Math.random() < 0.35) {
        this.spawnDamageText(target.x, target.y - 20, '🛡️聖域加護!', '#67e8f9');
      }
    }

    if (!environmental && target.shieldTimer > 0) {
      dmg = Math.max(1, Math.round(dmg * 0.50)); // 生還シールドで被ダメ50%カット
      if (Math.random() < 0.45) {
        this.spawnDamageText(target.x, target.y - 20, '🛡️生還シールド!', '#38bdf8');
      }
    }

    // 遠征選抜の本隊のみ危険度ティア被ダメ増（実マップ戦闘の難度）
    if (!environmental && target !== this.player && this.platoons && !target.isPersonalGuard) {
      const ep = this.platoons[(target.platoonId || 0) % 3];
      if (isSoldierOnExpedition(ep, target)) {
        const haz = expeditionHazardTakenMult(ep);
        if (haz > 1) dmg = Math.max(1, Math.round(dmg * haz));
      }
    }

    if(!environmental)dmg=Math.max(1,Math.round(dmg*headquartersDamageMult(this,target)));
    if(target.magicWardTimer>0)dmg=Math.max(1,Math.round(dmg*(1-(target.magicWardBonus||0))));
    if(preventLethalHit(this,target,dmg))return;
    target.hp -= dmg;
    this.spawnDamageText(target.x, target.y - 12, dmg, '#ff3344');
    sound.playHurt(target.x,target.y);

    // 被弾によるHP成長（前線タンクほどタフに。大ダメージほど有利・ソフトキャップあり）
    const growth = applyHitGrowth(target, dmg);
    if (growth.gain > 0) {
      target.hitGrowthEvents = (target.hitGrowthEvents || 0) + 1;
      const beforeMax = target.maxHp || 1;
      if (target === this.player) this.recalcPlayerStats();
      else this.recalcSoldierStats(target);
      // 成長分だけ現在HPも少し底上げ（即死ループ防止のため差分の半額）
      const gainedMax = Math.max(0, (target.maxHp || beforeMax) - beforeMax);
      if (gainedMax > 0 && target.hp > 0) {
        target.hp = Math.min(target.maxHp, target.hp + Math.ceil(gainedMax * 0.5));
      }
      if (growth.crossed != null && growth.crossed > 0 && growth.crossed % 10 === 0) {
        const who = target === this.player ? '隊長' : (target.name || '兵士');
        this.showToast(`💪${who}の体躯鍛錬 +${growth.crossed}%HP（被弾成長）`);
      }
    }

    if (target !== this.player && target.hp > 0 && !target.isDown && target.hp / target.maxHp <= 0.3) {
      this.dialogue?.trigger(target, 'LOW_HP');
    }

    if (target.hp <= 0) {
      if (target === this.player) {
        this.player.hp = 0;
        this.gameOver();
      } else {
        if (!target.isDown) {
          releaseWounded(this,target);
          markSoldierDown(this, target);
          sound.playDown(target.x,target.y);
          this.spawnDamageText(target.x, target.y - 20, '🆘 行動不能！', '#f87171');
          const nameDisp = target.isNamed ? `【${target.title}${target.name}】` : target.name;
          this.showToast(`🆘 ${nameDisp}が倒れた！搬送か衛生兵の救助が必要！（未搬送の猶予${RESCUE_TIMEOUT}秒）`);
        }
      }
    }
  },

  checkZoneTransition() {
    if (this.currentDungeon || !this.player) return;
    const curZone = getFieldZone(this.player.x, this.player.y);
    if (!this.lastZoneId) {
      this.lastZoneId = curZone.id;
      return;
    }
    if (this.lastZoneId !== curZone.id) {
      const oldZone = FIELD_ZONES.find(z => z.id === this.lastZoneId) || FIELD_ZONES[0];
      this.lastZoneId = curZone.id;

      // 危険度が上がった場合の強烈な警報演出（画面赤脈動・強シェイク・重低音・警告トースト）
      if (curZone.dangerLevel > oldZone.dangerLevel) {
        this.zoneAlertFlash = 1.0;
        this.screenShake = 0.55;
        sound.playBomb();
        const ring = zoneRingLabelJa(Math.hypot(this.player.x - BASE_CAMP.x, this.player.y - BASE_CAMP.y));
        this.showToast(`🚨【危険地帯突入！】${curZone.name}！${ring.tip}（推奨DEF ${curZone.reqDef}+）`);
      } else {
        this.showToast(`🏕️【安全エリアへ移動】${curZone.name}に入りました`);
      }
    }
  },

  checkMerchantProximity() {
    const banner = document.getElementById('merchant-prompt-banner');
    const textEl = document.getElementById('merchant-banner-text');
    if (this.nearDungeon && !this.currentDungeon) {
      this.nearMerchant = null;
      if (banner) banner.classList.add('hidden');
      return;
    }
    const m = nearestLivingMerchant(this, this.player?.x || 0, this.player?.y || 0, MERCHANT_INTERACT_R);
    this.nearMerchant = m;
    if (banner && textEl) {
      if (m) {
        banner.classList.remove('hidden');
        const tier = merchantSellTier(this);
        const escorts = (m.escorts || []).filter(e => e && !e.dead).length;
        textEl.textContent = `${m.icon || '🏪'} ${m.name} · T${tier} · 護衛${escorts}`;
        textEl.title = `${m.placeName} · ${m.name} · 販売帯T${tier} · 護衛${escorts}`;
      } else {
        banner.classList.add('hidden');
      }
    }
  },

  updateMerchantBanner() {
    this.checkMerchantProximity();
  },

  openMerchantShop(merchant = null) {
    const m = merchant || this.nearMerchant || nearestLivingMerchant(this, this.player?.x || 0, this.player?.y || 0, MERCHANT_INTERACT_R + 40);
    if (!m || m.dead || m.isDown || m.returningToBase) {
      this.showToast('行商人は居ないか、すでに命を落としています');
      return;
    }
    ensureMerchants(this, generateRandomDrop, BASE_CAMP);
    ensureMerchantCatalog(this,m,generateRandomDrop);

    let popup = document.getElementById('merchant-shop-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'merchant-shop-popup';
      popup.className = 'transfer-popup-overlay';
      (document.querySelector('.iron-squad') || document.body).appendChild(popup);
    }
    const close = () => { popup.classList.add('hidden'); this._merchantShopRefresh=null; this._merchantShopClose=null; setSubDialog(this, popup, false); };
    this._merchantShopClose=close;
    let shopGroup=(m.stock||[]).some(i=>i.type==='WEAPON')?'weapon':'armor';
    const render = () => {
      const gold = this.gold || 0;
      const healStatus=merchantHealingStatus(this,m);
      const healWaves=merchantHealWavesLeft(this,m);
      const healLabels={available:`隊長を全回復 · ${MERCHANT_HEAL_COST}G`,cooldown:`あと${healWaves}ウェーブ`,full:'HPは満タンです',poor:`${MERCHANT_HEAL_COST}G 必要です`,unavailable:'現在は利用できません'};
      const phase=this.phase||1,rank=latestEquipmentTier(this);
      const stock=(m.stock||[]).map((item,idx)=>({item,idx}));
      const groups=[['weapon','武器',stock.filter(({item})=>item.type==='WEAPON')],['armor','防具・装飾',stock.filter(({item})=>item.type!=='WEAPON')]];
      const rows = groups.find(([id])=>id===shopGroup)[2].sort((a,b)=>compareEquipmentStrength(a.item,b.item)).map(({item,idx}) => {
        const slot=SLOT_INFO[item.type],current=slot?this.equipped?.[slot.key]:null,cmp=compareEquipment(item,current);
        let inherited='';
        if(current&&(current.upgrade||0)>(item.upgrade||0)){
          const preview=structuredClone(item);applyUpgradeStats(preview,current.upgrade);const after=compareEquipment(preview,current);
          inherited=`<div class="equipment-comparison ${after.kind}"><div class="equip-cmp-head">+${current.upgrade}引継後の参考値：<strong>${after.label}</strong></div>${after.html}<small>通常購入では強化を引き継がず、旧装備をバッグに保持します。</small></div>`;
        }

        const price = item._merchantPrice || merchantBuyPrice(item);
        const can = gold >= price && !m.dead && !m.isDown && !m.returningToBase;
        return `<div class="transfer-item-card merchant-stock-card ${item.merchantFeatured?'merchant-featured':''}" data-idx="${idx}">
          ${item.merchantFeatured?`<div class="merchant-featured-label">今ウェーブの目玉 · 特選品（1点限り）</div>`:''}
          <div class="transfer-card-header">
            <span class="transfer-item-name" style="color:${item.color || '#e2e8de'};">[T${item.tier}] ${item.name}</span>
            <span class="transfer-comp-badge">${price.toLocaleString()}G</span>
          </div>
          <p class="merchant-quality">${slot?.name||item.type} · ${item.merchantQuality||'厳選'} · 品質補正×${Number(item.rollMult||1).toFixed(2)} · 強化+${item.upgrade||0}</p>
          <div class="equipment-comparison ${cmp.kind}"><div class="equip-cmp-head">隊長の現装備比：<strong>${cmp.label}</strong></div><small>現在：${current?.name||'未装備'}</small>${cmp.html}</div>
          ${inherited}
          <div class="transfer-card-meta">
            <span class="merchant-price-note">${item.mat||''} · 基準売値の約${(price/Math.max(1,saleValue(item))).toFixed(1)}倍（品質込み）</span>
            <button type="button" class="transfer-tap-btn" data-buy="${idx}" ${can ? '' : 'disabled'}>${can ? '購入して装備' : '所持金不足'}</button>
          </div>
        </div>`;
      }).join('') || `<div class="transfer-empty-msg"><p>${stock.length?'この分類の装備はありません。もう一方のタブをご覧ください。':'今ウェーブは売り切れです。次のウェーブに仕入れ直します。'}</p></div>`;
      popup.innerHTML = `
        <div class="transfer-popup-container">
          <div class="transfer-popup-header">
            <div>
              <h3 class="transfer-popup-title">🏪 ${m.name}</h3>
              <p class="transfer-popup-sub">${m.title || ''} · ${m.placeName} · 所持金 <strong style="color:#fbbf24;">${gold.toLocaleString()}G</strong></p>
            </div>
            <button type="button" class="transfer-popup-close-btn" aria-label="閉じる">✕</button>
          </div>
          <div class="transfer-popup-hint">製造技術T${this.nation?.armament?.techTier||1} → 交易品T${m.stockTier}（最高素材世代T${TRADE_MAX_TIER+1}〜${MAX_EQUIPMENT_TIER}は非売）。高品質の厳選武具・第${phase}ウェーブの品揃え。次ウェーブまで${Math.ceil((this.phaseTimer||0)+(this.restTimer||0))}秒。目玉は商人ごとに1点。${m.featuredSoldPhase===phase?'今ウェーブの目玉は購入済みです。':'特選品には目玉の印が付いています。'}</div>
          <div class="transfer-item-list">
            <details class="merchant-services"><summary>回復・補給・セーブ ${healWaves?`· 回復はあと${healWaves}ウェーブ`:''}</summary>
            <section class="merchant-heal-service" aria-label="商人の回復サービス">
              <div><h4>隊長の回復サービス</h4><p>${MERCHANT_HEAL_COST}G · 利用後2ウェーブで再開</p><p class="merchant-heal-countdown">${healWaves?`再利用まで あと${healWaves}ウェーブ`:healStatus==='available'?'利用できます':healLabels[healStatus]}</p></div>
              <button type="button" class="transfer-tap-btn merchant-heal-button" ${healStatus==='available'?'':'disabled'}>${healLabels[healStatus]}</button>
            </section>
            <section class="merchant-heal-service" aria-label="部隊ポーション">
              <div><h4>部隊回復ポーション</h4><p>隊長と行動可能な直属兵のHP・弾薬・魔力を全回復 · 携帯1個</p><p>${this.squadPotion?'携帯中 1/1':`${SQUAD_POTION_COST}G · 本陣では無料補給`}</p></div>
              <button type="button" class="transfer-tap-btn merchant-potion-button" ${this.squadPotion||gold<SQUAD_POTION_COST||m.dead||m.isDown||m.returningToBase?'disabled':''}>${this.squadPotion?'携帯中':`購入 · ${SQUAD_POTION_COST}G`}</button>
            </section>
            <div class="merchant-checkpoint"></div>
            </details>
            <div class="equipment-group-tabs" role="tablist" aria-label="販売装備の分類">${groups.map(([id,label,goods])=>`<button type="button" role="tab" aria-selected="${id===shopGroup}" data-shop-group="${id}">${label}<small>${goods.length}件</small></button>`).join('')}</div>
            <p class="equipment-sort-note">強い順（総合性能） · 購入すると隊長が即装備。外した装備はバッグへ。</p>
            <div role="tabpanel" aria-label="${shopGroup==='weapon'?'武器':'防具・装飾'}の販売一覧">${rows}</div>
          </div>
          <div class="transfer-popup-footer">
            <button type="button" class="action-btn secondary btn-close-merchant" style="min-height:36px;padding:6px;font-size:12px;">閉じる</button>
          </div>
        </div>`;
      popup.classList.remove('hidden');
      popup.querySelector('.transfer-popup-close-btn')?.addEventListener('click', close);
      popup.querySelector('.btn-close-merchant')?.addEventListener('click', close);
      for(const button of popup.querySelectorAll('[data-shop-group]'))button.onclick=()=>{shopGroup=button.dataset.shopGroup;render();};
      popup.onclick = (e) => { if (e.target === popup) close(); };
      this.renderSupplyPanel(popup.querySelector('.merchant-checkpoint'));
      popup.querySelector('.merchant-potion-button').addEventListener('click',()=>{this.replenishSquadPotion(m);render();});
      popup.querySelector('.merchant-heal-button').addEventListener('click',()=>{
        const result=useMerchantHealing(this,m);
        if(result.ok) {
          this.showToast(`隊長のHPを全回復（+${Math.ceil(result.restored)}） · ${MERCHANT_HEAL_COST}G`);
          this.saveGame();this.updateStatsUI();
        } else this.showToast(healLabels[result.reason]);
        render();
      });
      popup.querySelectorAll('[data-buy]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = Number(btn.getAttribute('data-buy'));
          const item = m.stock?.[idx];
          if (!item) return;
          if(!(this.merchants||[]).includes(m)||m.dead||m.isDown||m.returningToBase){this.showToast('商人は救助・本陣への避難が必要です');render();return;}
          const price = item._merchantPrice || merchantBuyPrice(item);
          if ((this.gold || 0) < price) {
            this.showToast('所持金が足りない');
            return;
          }
          this.gold -= price;
          markMerchantPurchase(m,item,this.phase||1);
          m.stock.splice(idx, 1);
          this.collectDrop(item, false, {purchased:true});
          this.showToast(`🏪【購入・装備】[T${item.tier}] ${item.name} · ${price.toLocaleString()}G`);
          this.saveGame();
          this.updateStatsUI();
          render();
        });
      });
      this._merchantShopRefresh=()=>{if(!popup.classList.contains('hidden'))render();};
      setSubDialog(this, popup, true, close);
    };
    render();
  },

  checkDungeonProximity() {
    const banner = document.getElementById('dungeon-prompt-banner');
    const textEl = document.getElementById('dungeon-banner-text');
    if (this.currentDungeon || !this.player) {
      this.nearDungeon = null;
      if (banner) banner.classList.add('hidden');
      return;
    }
    let nearest = null;
    let minD = 999999;
    for (const d of (this.dungeons || [])) {
      const dist = Math.hypot(this.player.x - d.entrance.x, this.player.y - d.entrance.y);
      if (dist < (d.entrance.radius + 40)) {
        d.discovered = true;
        if (dist < minD) {
          minD = dist;
          nearest = d;
        }
      }
    }
    this.nearDungeon = nearest;
    const enterBtn = document.getElementById('btn-enter-dungeon');
    if (banner && textEl) {
      if (nearest) {
        banner.classList.remove('hidden');
        if (nearest.kind === 'town') {
          textEl.textContent = `${nearest.icon} ${nearest.name}`;
          if (enterBtn) enterBtn.textContent = '入る';
        } else if (nearest.kind === 'ruin') {
          textEl.textContent = `${nearest.icon} ${nearest.name}`;
          if (enterBtn) enterBtn.textContent = '踏み込む';
        } else {
          textEl.textContent = `${nearest.icon} ${nearest.name} (推奨DEF ${nearest.reqDef}+ / Lv${nearest.reqLv}+)`;
          if (enterBtn) enterBtn.textContent = '部隊突入';
        }
      } else {
        banner.classList.add('hidden');
        if (enterBtn) enterBtn.textContent = '入る';
      }
    }
  },

  enterDungeon(dungeonDef) {
    if (this.currentDungeon) return;
    this.nearDungeon = null;
    document.getElementById('dungeon-prompt-banner')?.classList.add('hidden');
    this.savedFieldPos = { x: this.player.x, y: this.player.y };
    this.savedFieldMonsters = [...this.monsters];
    this.savedFieldDrops = [...this.dropsOnField];
    if(dungeonDef.kind==='town'){updateWounded(this,0);receiveTownCargo(this,dungeonDef);} // Town arrival accepts commander cargo before changing coordinates.
    this.currentDungeon = dungeonDef;

    // ダンジョン内モンスター・ドロップ・パーティクル初期化
    this.monsters = [];
    this.dropsOnField = [];
    this.particles = [];
    this.damageTexts = [];
    this.projectiles = [];this.magicBursts=[];

    const w = dungeonDef.width;
    const h = dungeonDef.height;

    // 全インスタンスは隊長＋直属のみ。搬送中の負傷兵は同行させる。
    const isTown = dungeonDef.kind === 'town';
    if(isTown)ensureTownGuards(this,dungeonDef);
    const carriers=new Set(['player',...(this.squad||[]).filter(s=>s.isPersonalGuard&&!s.dead).map(s=>s.id)]);
    this.instanceCargoIds=rescueUnits(this).filter(s=>s.isDown&&!s.dead&&carriers.has(s.carrierId)).map(s=>s.id);
    this.savedFieldSquadPos = null;
    this.savedFieldPlatoonPos = null;
    if (this.squad) {
      this.savedFieldSquadPos = this.squad.map((s) => ({
        id: s.id, x: s.x, y: s.y, isPersonalGuard: !!s.isPersonalGuard
      }));
      if (this.platoons) {
        this.savedFieldPlatoonPos = this.platoons.map((p) => ({
          id: p.id, x: p.x, y: p.y, mission: p.mission || null
        }));
      }
    }
    this.player.x = 240;
    this.player.y = h / 2;
    if (this.squad) {
      this.squad.forEach((s) => {
        if (s.dead) return;
        if (!inCurrentInstance(this,s)) return; // 本隊は野外に残す。
        delete s._cachedEnemy;delete s._magicEnemy;
        s.x = 180 + (Math.random() - 0.5) * 60;
        s.y = h / 2 + (Math.random() - 0.5) * 60;
      });
    }
    this.camera = { x: 180, y: h / 2 };

    const mobTypes = dungeonDef.mobTypes || [];
    for (let i = 0; i < (dungeonDef.mobCount || 0); i++) {
      const mx = 460 + Math.random() * Math.min(420, Math.max(80, w - 980));
      const my = 180 + Math.random() * Math.max(80, h - 360);
      const mType = mobTypes[i % Math.max(1, mobTypes.length)] || 'goblin';
      this.monsters.push(this.createDungeonMob(mType, mx, my, dungeonDef, false));
    }
    for (let i = 0; i < (dungeonDef.eliteCount || 0); i++) {
      const mx = Math.min(w - 560, 1100) + Math.random() * Math.min(320, Math.max(40, w * 0.16));
      const my = 220 + Math.random() * Math.max(80, h - 440);
      const mType = mobTypes[mobTypes.length - 1] || 'orc';
      this.monsters.push(this.createDungeonMob(mType, mx, my, dungeonDef, true));
    }

    if (dungeonDef.boss) {
      this.monsters.push(this.createDungeonBoss(dungeonDef.boss, w - 350, h / 2, dungeonDef));
      this.dungeonVault = {
        x: w - 240, y: h / 2, name: `${dungeonDef.name}の至宝箱`,
        opened: false, unlocked: false, dungeon: dungeonDef
      };
      this.showToast(`⛩️【ダンジョン突入】「${dungeonDef.name}」へ侵入！最奥のボスを討ち果たせ！`);
    } else if (dungeonDef.guardian) {
      const gDef = dungeonDef.guardian;
      const scaling = distanceScaling(dungeonDef.distance, this.phase || 1);
      const g = this.createDungeonMob(gDef.type || 'orc', w - 350, h / 2, dungeonDef, true);
      const hp = Math.round(gDef.hp * Math.max(1, scaling.hp * 0.75));
      const atk = Math.round(gDef.atk * Math.max(1, scaling.atk * 0.75));
      g.name = gDef.name;
      g.hp = hp;
      g.maxHp = hp;
      g.atk = atk;
      g.radius = gDef.radius || g.radius;
      g.speed = gDef.speed || g.speed;
      g.isDungeonBoss = true;
      g.isBoss = false;
      g.isColossal = false;
      this.monsters.push(g);
      this.dungeonVault = {
        x: w - 240, y: h / 2, name: `${dungeonDef.name}の残宝`,
        opened: false, unlocked: false, dungeon: dungeonDef
      };
      this.showToast(`🏚️「${dungeonDef.name}」へ踏み込んだ。番を倒すと奥の箱が開く。`);
    } else {
      this.dungeonVault = null;
      if (dungeonDef.kind === 'town') {
        // 宿場到着ボーナス: 欠損HPの45%を即座に回復（戦闘バランスを壊さない安全休息）
        const comfort = (unit) => {
          if (!unit || unit.dead || unit.isDown) return;
          const missing = Math.max(0, (unit.maxHp || 0) - (unit.hp || 0));
          if (missing > 0) unit.hp = Math.min(unit.maxHp, unit.hp + Math.ceil(missing * 0.45));
        };
        comfort(this.player);
        (this.squad || []).forEach((s) => { if (s && s.isPersonalGuard) comfort(s); });
        this.showToast(`🛏️「${dungeonDef.name}」に入った。直属のみ同行。本隊は野外待機。施設は司令部の国家タブから。西側の門で退場。`);
      } else {
        this.showToast(`「${dungeonDef.name}」へ入った。`);
      }
    }
    this.refreshInvasionUI();
    this.updateStatsUI();
    sound.playLaunch();
  },

  exitDungeon() {
    if (!this.currentDungeon) return;
    const townId=this.currentDungeon.id;
    const wasTown = this.currentDungeon.kind === 'town';
    const returnPos = this.savedFieldPos || { x: BASE_CAMP.x, y: BASE_CAMP.y };
    this.player.x = returnPos.x;
    this.player.y = returnPos.y;

    const savedPos = this.savedFieldSquadPos;
    const byId = savedPos ? new Map(savedPos.map((p) => [p.id, p])) : null;
    if (this.squad) {
      this.squad.forEach((s) => {
        if (s.dead) return;
        if (!inCurrentInstance(this,s)) {
          if(!byId?.has(s.id))return;
          const p = byId.get(s.id);
          s.x = p.x;
          s.y = p.y;
          return;
        }
        // 同行者のみ隊長帰還点付近へ。
        delete s._cachedEnemy;delete s._magicEnemy;
        s.x = returnPos.x + (Math.random() - 0.5) * 60;
        s.y = returnPos.y + (Math.random() - 0.5) * 60;
      });
    }
    if (this.savedFieldPlatoonPos && this.platoons) {
      const pmap = new Map(this.savedFieldPlatoonPos.map((p) => [p.id, p]));
      for (const pl of this.platoons) {
        const sp = pmap.get(pl.id);
        if (!sp) continue;
        // 遠征中は野外AIが進めていた座標を優先（保存時点へ巻き戻さない）
        if (pl.mission === 'expedition' || pl.mission === 'returning') continue;
        pl.x = sp.x;
        pl.y = sp.y;
      }
    }
    this.savedFieldSquadPos = null;
    this.savedFieldPlatoonPos = null;
    for(const s of rescueUnits(this))if(this.instanceCargoIds?.includes(s.id)&&!this.squad.includes(s)){s.x=returnPos.x-28;s.y=returnPos.y+12;}
    this.instanceCargoIds = [];
    this.projectiles=[];this.magicBursts=[];this._nearBaseClock=.2;

    this.camera = { x: returnPos.x, y: returnPos.y };
    this.monsters = this.savedFieldMonsters || [];
    this.dropsOnField = this.savedFieldDrops || [];
    this.savedFieldMonsters = null;
    this.savedFieldDrops = null;
    this.currentDungeon = null;
    this.dungeonVault = null;
    if(wasTown)exitGateTown(this,townId);
    leaveCivilianSpace(this,townId);
    this.revealFogAroundPlayer(true);
    this.refreshInvasionUI();
    this.updateStatsUI();

    sound.playLaunch();
    this.showToast(wasTown ? '🚪 宿場を出た。本隊は野外のまま作戦継続中。' : '🌀 外界へ無事帰還しました！');
  },

  createDungeonMob(type, x, y, dungeonDef, isElite = false) {
    const scaling = distanceScaling(dungeonDef.distance, this.phase || 1);
    let rawHp = isElite ? 180 : 80;
    let rawAtk = isElite ? 32 : 16;
    let speed = 72;
    let radius = isElite ? 18 : 12;
    let color = dungeonDef.color;

    if (type === 'slime') { rawHp = 50; rawAtk = 10; radius = 11; color = '#34d399'; }
    else if (type === 'wolf') { rawHp = 90; rawAtk = 22; speed = 108; radius = 13; color = '#64748b'; }
    else if (type === 'orc') { rawHp = 160; rawAtk = 28; speed = 64; radius = 16; color = '#d97706'; }
    else if (type === 'wyvern') { rawHp = 220; rawAtk = 36; speed = 82; radius = 20; color = '#a855f7'; }
    else if (type === 'colossal_dragon') { rawHp = 450; rawAtk = 48; speed = 60; radius = 28; color = '#ef4444'; }

    return {
      type,
      x,
      y,
      hp: Math.round(rawHp * scaling.hp * (isElite ? 1.6 : 1.0)),
      maxHp: Math.round(rawHp * scaling.hp * (isElite ? 1.6 : 1.0)),
      atk: Math.round(rawAtk * scaling.atk * (isElite ? 1.4 : 1.0)),
      speed,
      radius,
      color,
      isBoss: false,
      isElite,
      isDungeonMob: true,
      lootDistance: dungeonDef.distance,
      atkTimer: 0,
      hitPulse: 0
    };
  },

  createDungeonBoss(bossDef, x, y, dungeonDef) {
    const scaling = distanceScaling(dungeonDef.distance, this.phase || 1);
    // v1.25.8: fixedStats bosses (魔王など) keep authored ~10M scale — no distance/ring multiply
    const useFixed = !!(bossDef && bossDef.fixedStats);
    const hp = useFixed ? Math.round(bossDef.hp) : Math.round(bossDef.hp * Math.max(1, scaling.hp * 0.75));
    const atk = useFixed ? Math.round(bossDef.atk) : Math.round(bossDef.atk * Math.max(1, scaling.atk * 0.75));
    return {
      type: bossDef.type,
      name: bossDef.name,
      title: bossDef.title,
      icon: bossDef.icon,
      x,
      y,
      hp,
      maxHp: hp,
      atk,

      speed: bossDef.speed,
      radius: bossDef.radius,
      color: bossDef.color,
      isBoss: true,
      isColossal: true,
      isDungeonBoss: true,
      isDemonKing: bossDef.type === 'demon_king',
      skillCooldown: bossDef.skillCooldown,
      skillTimer: bossDef.skillCooldown,
      skillName: bossDef.skillName,
      desc: bossDef.desc,
      lootDistance: dungeonDef.distance,
      atkTimer: 0,
      hitPulse: 0
    };
  },

  openDungeonVault() {
    if (!this.dungeonVault || this.dungeonVault.opened || !this.dungeonVault.unlocked) return;
    this.dungeonVault.opened = true;
    sound.playHighScore();
    this.screenShake = 0.8;

    const def = this.dungeonVault.dungeon;
    const reward = def.reward;

    // 1. 大量ゴールド & EXP
    this.gold += reward.gold;
    this.gainExp(reward.exp);
    this.spawnDamageText(this.player.x, this.player.y - 45, `👑至宝開錠! +${reward.gold}G / +${reward.exp}EXP`, '#ffd700');

    // v1.25.8: 魔王城などのボーナス宝珠・神話宝玉
    if (reward.bonusOrbs) {
      this.awakeningOrbs = (this.awakeningOrbs || 0) + reward.bonusOrbs;
      this.showToast(`💎 覚醒宝珠 +${reward.bonusOrbs}（所持 ${this.awakeningOrbs}）`);
    }
    if (reward.bonusGems) {
      this.awakeningGems = (this.awakeningGems || 0) + reward.bonusGems;
      this.showToast(`💠 神話宝玉 +${reward.bonusGems}（所持 ${this.awakeningGems}）`);
    }

    // 2. 超高Tier確定アイテム（3〜5個）ドロップ
    for (let i = 0; i < reward.itemCount; i++) {
      const dropItem = generateRandomDrop(def.distance, reward.lootKind);
      const ang = (i / reward.itemCount) * Math.PI * 2;
      this.dropsOnField.push({
        x: this.dungeonVault.x + Math.cos(ang) * 45,
        y: this.dungeonVault.y + Math.sin(ang) * 45,
        item: dropItem,
        isBoss: true
      });
    }

    // 3. 宝箱周囲の黄金花火パーティクル
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 180;
      this.particles.push({
        x: this.dungeonVault.x,
        y: this.dungeonVault.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: i % 2 ? '#fbbf24' : '#f59e0b',
        size: 3.5 + Math.random() * 3.5,
        life: 0.7 + Math.random() * 0.4
      });
    }

    // ダンジョン完全踏破記録
    const dRecord = (this.dungeons || []).find(d => d.id === def.id);
    if (dRecord) {
      dRecord.cleared = true;
      dRecord.clearedWave = this.wave || this.phase || 1;
    }
    def.cleared = true;

    this.showToast(`🏆【${def.name} 完全踏破！】黄金+${reward.gold}G＆至宝武具を大量獲得！脱出門より外界へ帰還可能です！`);
  },

  killMonster(monster, attacker, isPlayer) {
    if(monster?.retreated)return;
    const idx = this.monsters.indexOf(monster);
    if (idx !== -1) this.monsters.splice(idx, 1);
    this.waveKills++;
    this.onNationKill();

    // 掃討軍令の進捗カウント
    if (this.currentQuest && !this.currentQuest.completed && this.currentQuest.targetKills) {
      this.currentQuest.currentKills = (this.currentQuest.currentKills || 0) + 1;
      if (this.currentQuest.currentKills >= this.currentQuest.targetKills) {
        this.completeQuest();
      } else {
        this.updateQuestUI();
      }
    }

    if(Math.random()<.28)this.dropsOnField.push({x:monster.x+10,y:monster.y,isAmmo:true,ammo:2+Math.floor(Math.random()*5)});
    if(Math.random()<.22)this.dropsOnField.push({x:monster.x-10,y:monster.y+5,isMagicStone:true,mana:18+Math.floor(Math.random()*13)});
    const isBoss = !!monster.isBoss;
    const isElite = !!monster.isElite;

    const curPhase = this.phase || this.wave || 1;
    const expBase = isBoss ? 80 : (isElite ? 24 : 6);
    const goldBase = isBoss ? 120 : (isElite ? 36 : 8);
    const lootDistance=monster.lootDistance ?? Math.hypot(monster.x-BASE_CAMP.x,monster.y-BASE_CAMP.y);
    const orbCount=Math.random()<orbDropChance(monster,lootDistance)?1:0;
    const rewards=distanceScaling(lootDistance, curPhase);
    const baseExpGain=Math.max(2,Math.round(expBase*rewards.exp*(monster.fieldAdaptive?.reward||1)));
    const xpReward=strongEnemyReward(baseExpGain,monster,isPlayer?this.player:attacker);
    const expGain=xpReward.exp;
    if(xpReward.bonusExp>0)this.lastStrongKill={...xpReward,enemy:monster.name||'強敵',who:isPlayer?'隊長':attacker?.name||'兵士',phase:curPhase};
    const goldGain = Math.max(1,Math.round(goldBase*rewards.gold*(monster.fieldAdaptive?.reward||1)));

    // 軸1: 【敵を倒したらレベルアップ】＆【撃墜したキャラにお金が入る】
    // 軸4: 【撃墜数パワーアップ（雑魚枠とボス枠で別）】
    if (isPlayer) {
      this.gold += goldGain;
      this.player.exp = (this.player.exp || 0) + expGain;
      this.spawnDamageText(monster.x, monster.y - 16, `+${goldGain}G`, '#ffe600');

      if (isBoss) {
        this.player.bossKills = (this.player.bossKills || 0) + 1;
        sound.playHighScore();
        this.spawnDamageText(this.player.x, this.player.y - 36, '👑 巨頭討伐！ ATK+8/HP+50', '#ffd700');
        this.showToast('👑【巨頭撃破ボーナス！】ボス討伐武勲！(ATK+8, MaxHP+50, 会心+2%, 被ダメ軽減+2%)');
      } else {
        this.player.minionKills = (this.player.minionKills || 0) + 1;
        const mK = this.player.minionKills;
        if (mK % 5 === 0) {
          this.spawnDamageText(this.player.x, this.player.y - 20, `⚔️ 雑魚武勲! ATK+1`, '#60a5fa');
        }
        if (mK % 15 === 0) {
          this.spawnDamageText(this.player.x, this.player.y - 32, `❤️ 体躯錬磨! HP+10`, '#34d399');
        }
      }

      // プレイヤーのレベルアップ判定 (無限ループ・NaN防止ガード)
      let pGuard = 0;
      while (this.player.exp >= (this.player.reqExp || 20) && pGuard++ < 30) {
        const req = Math.max(10, this.player.reqExp || 20);
        this.player.exp -= req;
        this.player.level = (this.player.level || 1) + 1;
        this.player.reqExp = Math.floor(req * 1.45 + 10);
        sound.playHighScore();
        this.spawnDamageText(this.player.x, this.player.y - 30, `⚡ Lv.${this.player.level} UP!`, '#34d399');
        this.showToast(`⚡ レベルアップ！ Lv.${this.player.level} に到達！ (HP+16, ATK+4)`);
      }

      this.recalcPlayerStats();
    } else if (attacker && !attacker.dead) {
      // 兵士がトドメを刺した！
      attacker.gold = (attacker.gold || 0) + goldGain;
      attacker.exp = (attacker.exp || 0) + expGain;
      this.spawnDamageText(monster.x, monster.y - 16, `+${goldGain}G`, '#ffd700');

      if (isBoss) {
        attacker.bossKills = (attacker.bossKills || 0) + 1;
        const bossBonusGold = Math.round(80 * rewards.gold);
        attacker.gold = (attacker.gold || 0) + bossBonusGold; // 討伐臨時ボーナスも距離・難易度スケール！
        if (attacker.name && attacker.name.includes('#')) {
          attacker.name = NAMES[Math.floor(Math.random() * NAMES.length)];
        }
        sound.playHighScore();
        this.spawnDamageText(attacker.x, attacker.y - 32, '👑 ボス討伐英雄！', '#ffd700');
        this.showToast(`👑 大金星！兵士【${attacker.name}】がボスにトドメ！(ボス討伐履歴+1, +${bossBonusGold}Gボーナス)`);
        this.dialogue?.trigger(attacker, 'CRITICAL_KILL', Date.now(), true);
      } else {
        attacker.minionKills = (attacker.minionKills || 0) + 1;
        if (Math.random() < 0.20) this.dialogue?.trigger(attacker, 'CRITICAL_KILL');
        const mK = attacker.minionKills;
        if (mK % 5 === 0) {
          this.spawnDamageText(attacker.x, attacker.y - 20, `⚔️ ATK+1!`, '#60a5fa');
        }
      }

      // 兵士のレベルアップ判定 (無限ループ・NaN防止ガード)
      let sGuard = 0;
      while (attacker.exp >= (attacker.reqExp || 14) && sGuard++ < 30) {
        const req = Math.max(8, attacker.reqExp || 14);
        attacker.exp -= req;
        attacker.level = (attacker.level || 1) + 1;
        attacker.reqExp = Math.floor(req * 1.5 + 8);
        this.spawnDamageText(attacker.x, attacker.y - 25, `⚡ Lv.${attacker.level}!`, '#00f0ff');
      }

      this.recalcSoldierStats(attacker);
    }

    // 部隊全体の戦果として昇進EXPを加算
    this.gainExp(expGain);
    this.updateStatsUI();

    // ⛩️ ダンジョンボス討伐時の至宝解錠判定
    if (monster.isDemonKing) {
      this.showToast(`😈👑【魔王討伐！！】『${monster.name || '魔王'}』を撃破！約1000万規模の脅威を打ち破った！`);
    }
    if (monster.isDungeonBoss) {
      sound.playHighScore();
      this.screenShake = 0.95;
      if (this.dungeonVault) {
        this.dungeonVault.unlocked = true;
      }
      const place = this.currentDungeon;
      this.showToast(place && place.kind === 'ruin'
        ? `🏚️「${place.name}」の番を倒した。奥の箱が開く。`
        : `⛩️【ダンジョンボス討滅！】最奥の「${place ? place.name : ''}の至宝箱」の封印が解かれた！`);
    }

    // 👑 どでかい大ボス（COLOSSAL BOSS）撃破時の超豪華報酬！
    if (monster.isColossal) {
      sound.playHighScore();
      this.screenShake = 0.8;

      // 画面大爆発パーティクル
      for (let bi = 0; bi < 32; bi++) {
        const bAng = Math.random() * Math.PI * 2;
        const bSpeed = 60 + Math.random() * 220;
        this.particles.push({
          x: monster.x,
          y: monster.y,
          vx: Math.cos(bAng) * bSpeed,
          vy: Math.sin(bAng) * bSpeed,
          color: bi % 2 === 0 ? '#fbbf24' : '#ef4444',
          size: 4 + Math.random() * 4,
          life: 0.8 + Math.random() * 0.5
        });
      }

      // 1. 大量ゴールドボーナス
      const colossalGold = Math.round((700+Math.floor(Math.random()*500))*rewards.gold);
      if (isPlayer) {
        this.gold += colossalGold;
        this.spawnDamageText(this.player.x, this.player.y - 45, `👑超巨頭討滅! +${colossalGold}G`, '#ffd700');
      } else if (attacker) {
        attacker.gold = (attacker.gold || 0) + colossalGold;
        this.spawnDamageText(attacker.x, attacker.y - 45, `👑超巨頭討滅! +${colossalGold}G`, '#ffd700');
      }

      // 3. 高ティア（T5〜T6）宝箱を 2〜3 個確定ドロップ（T7神話は最奥宝箱のみ）
      for (let ci = 0; ci < 3; ci++) {
        // T5〜T6（T7は dungeon_vault 専用）
        const highTierDrop = generateRandomDrop(lootDistance, 'colossal');

        this.dropsOnField.push({
          x: monster.x + (Math.random() - 0.5) * 80,
          y: monster.y + (Math.random() - 0.5) * 80,
          item: highTierDrop,
          isBoss: true
        });
      }

      this.showToast(`👑【超巨大巨頭討滅！】神話級大ボス『${monster.name || '大魔獣'}』の撃滅に成功！${orbCount?'（覚醒宝珠1個）':''}`);

    } else {
      // 通常モンスター・通常ボスのドロップ生成
      const dropRate = isBoss ? 1.0 : (isElite ? 0.65 : (0.16+Math.min(0.08,lootDistance/7400*0.08)));
      if (Math.random() < dropRate) {
        const dropItem = generateRandomDrop(lootDistance,isBoss?'boss':(isElite?'elite':'normal'));
        this.dropsOnField.push({
          x: monster.x,
          y: monster.y,
          item: dropItem,
          isBoss
        });
      }

    }
    if(orbCount) {
      this.dropsOnField.push({x:monster.x,y:monster.y,isBoss:!!monster.isBoss,isOrb:true,item:{
        id:Math.random().toString(36).substring(2,9),name:'覚醒の英雄宝珠',type:'ORB',tier:5,isOrb:true,
        mat:'神聖秘宝',color:'#fbbf24',desc:'上位職への覚醒に使う希少な秘宝'
      }});
    }
    // v1.25.8: 超巨頭撃破で低確率の神話宝玉（伝説職に必要）
    if (monster.isColossal && Math.random() < 0.35) {
      this.dropsOnField.push({x:monster.x + 12, y:monster.y + 8, isBoss:true, isOrb:true, item:{
        id:Math.random().toString(36).substring(2,9), name:'神話の覚醒宝玉', type:'GEM', tier:7, isGem:true, isOrb:false
      }});
    }

    if(xpReward.bonusExp>0)this.spawnDamageText(monster.x,monster.y-32,`格上討伐 +${expGain}EXP ×${xpReward.multiplier.toFixed(1)}`,'#d8d6a5');
    this.spawnSparks(monster.x, monster.y, monster.color, monster.isColossal ? 30 : 14);
  },

  gainExp(amt) {
    this.exp += amt;
    let rankGuard = 0;
    while (this.rankIndex < RANKS.length - 1 && this.exp >= RANKS[this.rankIndex + 1].reqExp && rankGuard++ < 20) {
      this.rankIndex++;
      const nextRank = RANKS[this.rankIndex];
      this.recalcPlayerStats();
      this.player.hp = this.player.maxHp;
      sound.playHighScore();
      this.showToast(`🎖️ 【昇進】${nextRank.title}へ！${nextRank.canCommand ? '号令解禁！' : ''}`);
      this.saveGame();
      this.updateStatsUI();
    }
  },

  collectDrop(item, isBossDrop = false, options = {}) {
    recordMerchantEquipment(this,item);
    if (item.type === 'GEM' || item.isGem) {
      this.awakeningGems = (this.awakeningGems || 0) + 1;
      sound.playHighScore();
      this.showToast(`💠【神話秘宝！】『神話の覚醒宝玉』入手！(所持: ${this.awakeningGems}個 / 伝説職の覚醒に必要)`);
      this.updateStatsUI();
      return;
    }
    if (item.type === 'ORB' || item.isOrb) {
      this.awakeningOrbs = (this.awakeningOrbs || 0) + 1;
      sound.playHighScore();
      this.showToast(`🔱【ボス秘宝獲得！】『覚醒の英雄宝珠』を入手！(所持数: ${this.awakeningOrbs}個 / 上位クラスへ覚醒昇格可能！)`);
      this.saveGame();
      this.updateStatsUI();
      return;
    }

    sound.playItem();
    const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;

    // 国庫共有ボックス: T≤3 かつ隊長の同スロットより弱い装備は吸収＆相当額買い取り
    if (!options.purchased && slotKey && shouldAbsorbToSharedBox(item, this.equipped, slotKey) && (this.treasury||0)>=calcBuyoutGold(item)) {
      const buyout = calcBuyoutGold(item);
      this.sharedEquipBox = this.sharedEquipBox || [];
      this.sharedEquipBox.push(item);
      this.gold = (this.gold || 0) + buyout;
      this.treasury-=buyout;
      if (this.phaseFiscal) {
        this.phaseFiscal.buyouts = (this.phaseFiscal.buyouts || 0) + buyout;
        this.phaseFiscal.buyoutCount = (this.phaseFiscal.buyoutCount || 0) + 1;
      }
      this.showToast(`📦【国庫買取】[T${item.tier}] ${item.name} を共有ボックスへ · 買い取り+${buyout}G`);
      this.saveGame();
      this.updateStatsUI();
      return;
    }

    if (!this.inventory) this.inventory = [];
    this.inventory.push(item);

    let autoEquipped = false;
    if (slotKey && (options.purchased || !this.equipped[slotKey])) {
      this.equipItem(item);
      autoEquipped = true;
    }

    let toastText = '';
    const forgeNote = item.forgeTag === '神鍛'
      ? '⚡神鍛ぶっ飛び！'
      : (item.forgeTag === '異質' ? '✨ドロップランダム補正（異質）！' : '');
    if (isBossDrop) {
      toastText = `👑【ボス戦利品獲得！】${forgeNote}[T${item.tier} ${item.mat}] ${item.name}！`;
    } else {
      toastText = `😈 ${forgeNote}[T${item.tier} ${item.mat}] ${item.name} を横取り！${autoEquipped ? ' (即装備)' : ''}`;
    }
    this.showToast(toastText);
    this.saveGame();
  },

  equipItem(item, inheritUpgradeFromCurrent = false) {
    const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;
    if (!slotKey) return;

    const curItem = this.equipped[slotKey];
    if (inheritUpgradeFromCurrent && curItem && (curItem.upgrade || 0) > (item.upgrade || 0)) {
      const inheritedVal = curItem.upgrade;
      const oldName = curItem.name;
      applyUpgradeStats(item, inheritedVal);
      // 古い装備は強化抽出・乗り換えにより消滅（インベントリから破棄）
      this.inventory = (this.inventory || []).filter(i => i.id !== curItem.id);
      this.showToast(`✨「${oldName}」の強化値(+${inheritedVal})を引き継いで「${item.name}」を装備！（※古い装備は消滅）`);
    } else if (curItem && curItem.id !== item.id) {
      // 通常乗り換え: 外した装備は必ずバッグへ戻す（以前装備していても未保護なら売却可）
      if (!this.inventory) this.inventory = [];
      if (!this.inventory.some(i => i.id === curItem.id)) this.inventory.push(curItem);
      const cmp = compareEquipment(item, curItem);
      const tag = item.forgeTag ? `【${item.forgeTag}】` : '';
      this.showToast(`着替え ${item.name}${tag}｜${cmp.label}｜${cmp.text}`);
    }

    this.equipped[slotKey] = item;
    if (!this.inventory) this.inventory = [];
    if (!this.inventory.some(i => i.id === item.id)) this.inventory.push(item);
    this.recalcPlayerStats();
    sound.playTap();
    this.saveGame();
    this.updateStatsUI();
  },

  inheritUpgrade(sourceItem, targetItem) {
    if (!sourceItem || !targetItem) return;
    const srcUp = sourceItem.upgrade || 0;
    const tgtUp = targetItem.upgrade || 0;
    if (srcUp <= tgtUp) {
      alert('引き継ぎ元の強化値が対象より低いため引き継げません');
      return;
    }
    applyUpgradeStats(targetItem, srcUp);
    applyUpgradeStats(sourceItem, 0);
    this.recalcPlayerStats();
    sound.playHighScore();
    this.showToast(`✨ 鍛冶屋の魔術！「${sourceItem.name}」の強化値を「${targetItem.name}」へ引き継ぎました！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  tryAwakenDeathlineSkill(soldier) {
    if (!soldier || soldier.dead) return null;
    soldier.deathlineSkills = soldier.deathlineSkills || [];
    if (soldier.deathlineSkills.length >= 4) return null;
    if (Math.random() >= 0.40) return null; // 40%の確率で救助生還時に覚醒

    const allDeathSkills = Object.keys(DEATHLINE_SKILLS);
    let preferredSkill = null;
    if (soldier.soldierClass === 'HEAVY') preferredSkill = 'IRON_RESOLVE';
    else if (soldier.soldierClass === 'LIGHT') preferredSkill = 'PHANTOM_STEP';
    else if (soldier.soldierClass === 'ARCHER') preferredSkill = 'DEADLY_FOCUS';
    else if (soldier.soldierClass === 'MEDIC') preferredSkill = 'MIRACLE_PRAYER';

    let chosenSkillId = null;
    if (preferredSkill && !soldier.deathlineSkills.includes(preferredSkill)) {
      chosenSkillId = preferredSkill;
    } else {
      const availableSkills = allDeathSkills.filter(skId => !soldier.deathlineSkills.includes(skId));
      if (availableSkills.length > 0) {
        chosenSkillId = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      }
    }

    if (chosenSkillId) {
      soldier.deathlineSkills.push(chosenSkillId);
      this.recalcSoldierStats(soldier);
      const skill = DEATHLINE_SKILLS[chosenSkillId];
      this.spawnDamageText(soldier.x, soldier.y - 35, `✨死線覚醒: ${skill.name}!`, skill.color || '#f87171');
      return skill;
    }
    return null;
  },

  grantSoldierHonor(soldierId) {
    const s = this.squad.find(s => s.id === soldierId);
    if (!s || s.isNamed) return;

    s.isNamed = true;
    s.title = TITLES[Math.floor(Math.random() * TITLES.length)];
    s.name = NAMES[Math.floor(Math.random() * NAMES.length)];
    s.rankTitle = '叙勲勇士';
    this.recalcSoldierStats(s);
    if(!s.isDown)s.hp=s.maxHp;

    sound.playHighScore();
    this.showToast(`✨ 【叙勲】${s.title}${s.name} が誕生した！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  getUpgradeCost(item) {
    const up = item.upgrade || 0;
    const tierFactor = Math.max(1, powerRank(item.tier) * 0.8);
    return Math.floor((20 + up * 18 + Math.pow(up, 1.4) * 6) * tierFactor);
  },

  upgradeItem(item, isFree = false) {
    const cost = this.getUpgradeCost(item);
    if (!isFree && this.gold < cost) {
      alert(`軍資金が足りません (必要: ${cost}G)`);
      return false;
    }
    if (!isFree) this.gold -= cost;

    const nextUp = (item.upgrade || 0) + 1;
    applyUpgradeStats(item, nextUp);

    sound.playHighScore();
    this.showToast(`🔨 鍛冶完了！「${item.name}」に強化成功！`);

    this.recalcPlayerStats();
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  upgradeSoldierEquip(soldierId, slotKey = 'weapon') {
    const s = this.squad.find(sol => sol.id === soldierId);
    if (!s || !s.equipped || !s.equipped[slotKey]) return;
    const item = s.equipped[slotKey];
    const cost = this.getUpgradeCost(item);
    if ((s.gold || 0) < cost) {
      alert(`兵士の予算が足りません (兵士所持金: ${s.gold || 0}G / 必要: ${cost}G)`);
      return;
    }
    s.gold -= cost;
    applyUpgradeStats(item, (item.upgrade || 0) + 1);
    this.recalcSoldierStats(s);
    sound.playHighScore();
    this.showToast(`🔨 ${s.name}が自費で「${item.name}」を強化！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  // 🔱 兵士の多段階クラスアップ（基本→上位→極→伝説）
  promoteSoldier(soldierId) {
    const s = this.squad.find(sol => sol.id === soldierId);
    if (!s) return false;

    const curCls = SOLDIER_CLASSES[s.soldierClass] || SOLDIER_CLASSES.HEAVY;
    const advClsId = nextClassId(curCls);
    const advCls = advClsId ? SOLDIER_CLASSES[advClsId] : null;
    if (!advCls) {
      alert('この兵士は既に最高峰の伝説職へ覚醒済みです！');
      return false;
    }
    const cost = classUpCostForNext(curCls);
    if (!canAffordClassUp(this.awakeningOrbs, this.awakeningGems, cost)) {
      alert(classUpShortageJa(this.awakeningOrbs, this.awakeningGems, cost));
      return false;
    }

    this.awakeningOrbs -= cost.orbs || 0;
    this.awakeningGems = Math.max(0, (this.awakeningGems || 0) - (cost.gems || 0));
    s.soldierClass = advClsId;
    this.recalcSoldierStats(s);
    if (!s.isDown) s.hp = s.maxHp;

    const tierName = CLASS_TIER_LABELS[classTierOf(advCls)] || '上位職';
    sound.playHighScore();
    this.showToast(`🔱⚡【天命覚醒！】${s.name} が${tierName}【${advCls.name}】へ昇格！（消費: ${formatClassUpCostJa(cost)}）`);
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  // 👑 隊長  // 👑 隊長の多段階覚醒（隊長→覇王→帝皇→神話帝）
  promotePlayer() {
    const next = nextPlayerStage(this.player);
    if (!next || !next.id) {
      alert('隊長は既に最高位【神話帝ミトラス】へ覚醒済みです！');
      return false;
    }
    const cost = { 1: { orbs: 1, gems: 0 }, 2: { orbs: 3, gems: 0 }, 3: { orbs: 5, gems: 1 } }[next.tier];
    if (!canAffordClassUp(this.awakeningOrbs, this.awakeningGems, cost)) {
      alert(classUpShortageJa(this.awakeningOrbs, this.awakeningGems, cost));
      return false;
    }

    this.awakeningOrbs -= cost.orbs || 0;
    this.awakeningGems = Math.max(0, (this.awakeningGems || 0) - (cost.gems || 0));
    this.player.isAdvanced = true;
    this.player.advancedClass = next.id;
    this.recalcPlayerStats();
    this.player.hp = this.player.maxHp;

    sound.playHighScore();
    this.showToast(`👑🔥【覚醒昇格！】隊長が【${next.name}】へ！（消費: ${formatClassUpCostJa(cost)}）`);
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  healAllSquad() {
    if (this.gold < 25) {
      alert('軍資金が足りません (必要: 25G)');
      return;
    }
    this.gold -= 25;
    sound.playItem();
    this.player.hp = this.player.maxHp;
    this.squad.forEach((s) => {
      if (!s.dead && !s.isDown) s.hp = s.maxHp;
    });
    this.showToast('💚 行動可能な兵士を治療しました。負傷ダウンは搬送か衛生兵の処置が必要です。');
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
  },

  // 💰 自部隊（直属）兵士への個別資金援助のみ（全軍一括は廃止→国庫寄付）
  fundSoldier(soldierId, amountInput = 10000) {
    let amount = 0;
    if (amountInput === 'max') {
      amount = this.gold;
    } else {
      amount = parseInt(amountInput, 10) || 1000;
    }

    if (amount <= 0) {
      this.showToast('⚠️ 渡す軍資金が0以下です');
      return false;
    }

    if (this.gold < amount) {
      alert(`隊長の軍資金が足りません (所持金: ${this.gold.toLocaleString()}G / 必要: ${amount.toLocaleString()}G)`);
      return false;
    }
    const s = this.squad.find(sol => sol.id === soldierId);
    if (!s) return false;
    if (!this.isPersonalSquadSoldier(s)) {
      this.showToast('⚠️ 個人援助は自部隊（直属）兵士のみ。本隊への支援は「国庫へ寄付→全国配分」を使ってください');
      return false;
    }

    this.gold -= amount;
    s.gold = (s.gold || 0) + amount;
    sound.playItem();

    // 資金援助を受けた兵士が自主的に装備強化を判定！（大金があれば所持金の許す限り連続フル強化！）
    let upgradedCount = 0;
    const upgradedNames = [];
    if (s.equipped) {
      const slotKeys = ['weapon', 'armor', 'shield', 'helmet', 'legs', 'gloves', 'amulet'];
      let canUpgradeMore = true;
      let loopGuard = 0;
      while (canUpgradeMore && loopGuard < 80) {
        loopGuard++;
        let anyUpgraded = false;
        // 強化可能な装備を抽出し、強化値が低い順に優先してバランスよく底上げ
        const candidates = slotKeys
          .map(k => s.equipped[k])
          .filter(it => it); // 無限強化可能！
        
        candidates.sort((a, b) => (a.upgrade || 0) - (b.upgrade || 0));

        for (const eqItem of candidates) {
          const cost = this.getUpgradeCost(eqItem);
          if (s.gold >= cost) {
            s.gold -= cost;
            const nextUp = (eqItem.upgrade || 0) + 1;
            applyUpgradeStats(eqItem, nextUp);
            upgradedCount++;
            if (!upgradedNames.includes(eqItem.name)) upgradedNames.push(eqItem.name);
            anyUpgraded = true;
            break; // 1回強化したら再ソートして次へ
          }
        }
        if (!anyUpgraded) canUpgradeMore = false;
      }
    }

    let autoUpgradedMsg = '';
    if (upgradedCount > 0) {
      autoUpgradedMsg = ` ➔ 兵士「隊長ッ、感謝します！」大金で装備を【計${upgradedCount}回】連続自主強化！(${upgradedNames.slice(0, 3).join(', ')}等)`;
    } else {
      autoUpgradedMsg = ` (兵士サイフ: ${s.gold.toLocaleString()}G)`;
    }

    this.showToast(`💰【資金援助】${s.name} に ${amount.toLocaleString()}G を渡した！${autoUpgradedMsg}`);
    this.recalcSoldierStats(s);
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  normalizeSoldierCareer(s) {
    if (!s) return s;
    if (s.timesDown == null) s.timesDown = 0;
    if (s.timesRescued == null) s.timesRescued = 0;
    if (s.rescues == null) s.rescues = 0;
    if (s.hitGrowthEvents == null) s.hitGrowthEvents = 0;
    if (s.hitGrowthPct == null) s.hitGrowthPct = 0;
    if (!Array.isArray(s.careerPhases)) s.careerPhases = [];
    s.weaponMastery = normalizeMastery(s.weaponMastery);
    return s;
  },

  buildSoldierDetailHtml(s) {
    this.normalizeSoldierCareer(s);
    const clsKey = s.soldierClass || 'HEAVY';
    const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;
    const talent = TALENTS[s.talent] || TALENTS.AVERAGE;
    const phases = s.careerPhases || [];
    const recent = phases.slice(-12);
    const phaseText = recent.length
      ? recent.map(p => `第${p}期`).join(' · ') + (phases.length > 12 ? ` …他${phases.length - 12}期` : '')
      : 'まだ戦線経験の記録なし';
    const masteryRows = WEAPON_STYLES.map(st => {
      const pct = masteryPctDisplay(s.weaponMastery, st);
      const fav = (s.favoriteWeapon || 'sword') === st ? ' ★' : '';
      return `<div class="soldier-detail-mastery-row"><span>${WEAPON_STYLE_ICONS[st] || ''}${WEAPON_STYLE_LABELS[st] || st}${fav}</span><strong>${pct}%</strong></div>`;
    }).join('');
    const deathSkills = s.deathlineSkills || [];
    const deathHtml = deathSkills.length
      ? deathSkills.map(id => {
          const sk = DEATHLINE_SKILLS[id];
          return sk ? `<span class="soldier-detail-chip" style="border-color:${sk.color};color:${sk.color};">${sk.icon} ${sk.name}</span>` : '';
        }).join('')
      : '<span style="color:#64748b;">なし</span>';
    const eq = s.equipped || {};
    const slotJa = {weapon:'武器',shield:'盾',helmet:'兜',armor:'鎧',gloves:'手',legs:'脚',amulet:'装飾'};
    const eqLines = ['weapon','shield','helmet','armor','gloves','legs','amulet'].map(k => {
      const it = eq[k];
      if (!it) return `<div>${slotJa[k]||k}: <span style="color:#64748b;">未装備</span></div>`;
      const st = it.stats || {};
      const bits = [];
      if (st.atk) bits.push(`攻${st.atk}`);
      if (st.def) bits.push(`防${st.def}`);
      if (st.hp) bits.push(`HP${st.hp}`);
      if (it.forgeTag) bits.push(it.forgeTag);
      const bitTxt = bits.length ? ` (${bits.join(' ')})` : '';
      const up = it.upgrade > 0 ? `+${it.upgrade}` : '';
      return `<div>${slotJa[k]||k}: <span style="color:${it.color || '#e2e8f0'};">[T${it.tier}] ${it.name}${up}</span>${bitTxt}</div>`;
    }).join('');
    const role = (this.reserves || []).includes(s) ? '予備兵' : s.isPersonalGuard ? '⭐ 自部隊（直属）' : '🏰 本隊';
    const hitPct = Math.round((s.hitGrowthPct || 0) * 1000) / 10;
    return `
      <div class="soldier-detail-panel">
        <div class="soldier-detail-head">
          <div>
            <div style="font-size:13px;font-weight:bold;color:#fde68a;">${cls.icon} ${s.isNamed ? `${s.title || ''}${s.name}` : s.name}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Lv.${s.level || 1} ${cls.name} · <span style="color:${talent.color};">[${talent.tag}]</span> · ${role}</div>
          </div>
          <button type="button" class="mini-btn btn-close-soldier-detail" style="background:#334155;color:#e2e8f0;font-size:11px;">閉じる</button>
        </div>
        <section class="soldier-personal-profile"><canvas class="soldier-face-portrait" width="240" height="260" role="img"></canvas><div><span class="profile-eyebrow">PERSONNEL FILE</span><h4>素顔</h4><p class="soldier-look-description"></p><p class="profile-note">兜を外した姿。装備・能力はそのまま。</p></div></section>
        <div class="soldier-detail-grid">
          <div class="soldier-detail-block">
            <div class="soldier-detail-label">基本ステータス</div>
            <div>HP <strong style="color:#34d399;">${Math.floor(s.hp || 0)}</strong> / ${s.maxHp || 0}</div>
            <div>ATK <strong>${s.atk || 0}</strong> · DEF <strong style="color:#38bdf8;">${s.def || 0}</strong></div>
            <div>サイフ <strong style="color:#fde047;">${(s.gold || 0).toLocaleString()}G</strong></div>
            <div>経験 ${s.exp || 0} / 次${s.reqExp || 14}</div>
            ${isMagicUser(s)?`<div class="soldier-mana-state">${this.magicUnitDescription(s)}</div>`:''}
            ${isRangedUnit(this,s)?`<div class="soldier-ammo-state">弾薬 ${ensureAmmo(s)}/30 ${s.ammo===0?'· 弾切れ／要補給（石投げ75%）':''}</div>`:''}
          </div>
          <div class="soldier-detail-block">
            <div class="soldier-detail-label">戦績・成長</div>
            <div>雑魚討伐 ⚔️ <strong>${s.minionKills || 0}</strong></div>
            <div>ボス討伐 👑 <strong style="color:#38bdf8;">${s.bossKills || 0}</strong></div>
            <div>総キル <strong>${s.kills || ((s.minionKills || 0) + (s.bossKills || 0))}</strong></div>
            <div>戦線経験 <strong>${s.survivedWaves || 0}</strong>期（記録${phases.length}件）</div>
            ${isMedic(s) ? `<div>実回復 💚 <strong>${Math.floor(s.healingHp || 0).toLocaleString()}HP</strong> · 回復EXP <strong>${(s.healingExp || 0).toLocaleString()}</strong></div><div>蘇生EXP <strong>${(s.revivalExp || 0).toLocaleString()}</strong></div><div style="font-size:10px;color:#94a3b8;">実回復${HEALING_HP_PER_EXP}HPで1EXP（継続回復含む）。蘇生は対象の最大HPの${REVIVAL_EXP_PER_MAX_HP*100}%をEXPで獲得。</div>` : ''}
            <div>死線生還 💀 <strong style="color:#f87171;">${s.survivedDeathlines || 0}</strong></div>
          </div>
          <div class="soldier-detail-block">
            <div class="soldier-detail-label">ダウン・救護</div>
            <div>負傷ダウン回数 🆘 <strong>${s.timesDown || 0}</strong></div>
            <div>被救護回数 🚑 <strong style="color:#34d399;">${s.timesRescued || 0}</strong></div>
            <div>他者救護回数 💚 <strong>${s.rescues || 0}</strong></div>
            <div>被弾鍛錬回数 <strong>${s.hitGrowthEvents || 0}</strong></div>
            <div>被弾HP成長 💪 <strong style="color:#fbbf24;">+${hitPct}%</strong>（軟上限内）</div>
          </div>
          <div class="soldier-detail-block">
            <div class="soldier-detail-label">武器マスタリー</div>
            <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">得意: ${WEAPON_STYLE_ICONS[s.favoriteWeapon] || ''}${WEAPON_STYLE_LABELS[s.favoriteWeapon] || '剣'}</div>
            ${masteryRows}
          </div>
          <div class="soldier-detail-block soldier-detail-span2">
            <div class="soldier-detail-label">作戦期履歴（直近）</div>
            <div style="font-size:10.5px;line-height:1.5;color:#cbd5e1;">${phaseText}</div>
          </div>
          <div class="soldier-detail-block soldier-detail-span2">
            <div class="soldier-detail-label">死線覚醒スキル</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">${deathHtml}</div>
          </div>
          <div class="soldier-detail-block soldier-detail-span2">
            <div class="soldier-detail-label">装備一覧</div>
            <div style="font-size:10.5px;line-height:1.45;">${eqLines}</div>
          </div>
        </div>
      </div>`;
  },

  openSoldierDetail(soldierId) {
    const s = [...(this.squad || []), ...(this.reserves || [])].find(x => x && x.id === soldierId);
    if (!s) {
      this.showToast('⚠️ 兵士が見つかりません');
      return;
    }
    this.selectedSoldierDetailId = soldierId;
    let host = document.getElementById('soldier-detail-host');
    if (!host) {
      const modal = document.querySelector('#strategy-modal .overlay-content') || document.getElementById('strategy-modal');
      host = document.createElement('div');
      host.id = 'soldier-detail-host';
      host.className = 'soldier-detail-host';
      if (modal) modal.appendChild(host);
      else document.body.appendChild(host);
    }
    host.classList.remove('hidden');
    for (const old of host.querySelectorAll('canvas')) releaseCanvas(old);
    host.innerHTML = this.buildSoldierDetailHtml(s);
    const portrait=host.querySelector('.soldier-face-portrait');
    portrait.setAttribute('aria-label', `${s.name}の素顔：${describeSoldierAppearance(s)}`);
    const faceContext=portrait.getContext('2d');
    if(faceContext)drawSoldierPortrait(faceContext,s,portrait.width,portrait.height);
    host.querySelector('.soldier-look-description').textContent=describeSoldierAppearance(s);
    const closeBtn = host.querySelector('.btn-close-soldier-detail');
    if (closeBtn) closeBtn.onclick = () => this.closeSoldierDetail();
    host.onclick = (e) => { if (e.target === host) this.closeSoldierDetail(); };
    setSubDialog(this, host, true, () => this.closeSoldierDetail());
  },

  closeSoldierDetail() {
    this.selectedSoldierDetailId = null;
    const host = document.getElementById('soldier-detail-host');
    if (host) {
      host.classList.add('hidden');
      setSubDialog(this, host, false);
      for (const canvas of host.querySelectorAll('canvas')) releaseCanvas(canvas);
      host.innerHTML = '';
    }
  },

  isPersonalSquadSoldier(s) {
    if (!s || s.dead) return false;
    const currentRank = RANKS[this.rankIndex] || RANKS[0];
    const maxGuards = Math.min(currentRank.personalGuards || 0, PERSONAL_GUARD_MAX);
    if (maxGuards > 0) return !!s.isPersonalGuard;
    return ((s.platoonId || 0) % 3) === 0;
  },

  beginPhaseFiscal() {
    this.phaseFiscal = emptyFiscalLedger(this.phase || 1, this.treasury || 0);
    this.fiscalLedger = this.phaseFiscal;
    // v1.25.11: phase boundary — keep camp/player explored before next draw
    if (typeof this.revealFogAroundPlayer === 'function') this.revealFogAroundPlayer(true);
  },

  finalizePhaseFiscal() {
    if (!this.phaseFiscal) this.beginPhaseFiscal();
    this.phaseFiscal.endBalance = this.treasury || 0;
    this.lastFiscalReport = { ...this.phaseFiscal };
    return this.lastFiscalReport;
  },

  /** 寄付セレクト／クイックボタンを所持軍資金に合わせて再構築 */
  refreshDonateAmountSelect() {
    const gold = this.gold || 0;
    const suggested = defaultDonateAmount(gold);
    const sel = document.getElementById('select-global-fund-amount');
    const presets = donatePresetAmounts(gold);
    const prev = this._donateUserPicked ? (this.globalFundAmount || '') : '';
    let chosen = prev;
    if (!chosen || (chosen !== 'max' && parseInt(chosen, 10) > gold && gold > 0)) {
      chosen = String(suggested);
      this._donateUserPicked = false;
    }
    if (!chosen) chosen = String(suggested);
    this.globalFundAmount = chosen;
    if (sel) {
      const opts = presets.filter(n => n <= Math.max(gold, suggested) || n === suggested).slice(0, 10);
      // 大きめ固定段階も残す（所持以上でも選べる＝不足アラートで止められる）。既定だけ低額に。
      const extra = [100, 1000, 10000, 50000, 100000, 500000, 1000000].filter(n => !opts.includes(n));
      const all = [...opts, ...extra].filter((n, i, a) => a.indexOf(n) === i).sort((a, b) => a - b);
      sel.innerHTML = all.map(n => `<option value="${n}">${n.toLocaleString()} G</option>`).join('')
        + `<option value="max">所持全額 (${gold.toLocaleString()}G)</option>`;
      const ok = [...sel.options].some(o => o.value === chosen);
      sel.value = ok ? chosen : String(suggested);
      this.globalFundAmount = sel.value;
    }
    const quick = document.getElementById('donate-quick-presets');
    if (quick) {
      const qvals = [suggested, Math.min(gold, Math.max(100, Math.round(gold * 0.25))), Math.min(gold, Math.max(100, Math.round(gold * 0.5))), gold]
        .map(n => Math.max(0, Math.floor(n || 0)))
        .filter((n, i, a) => n > 0 && a.indexOf(n) === i);
      quick.innerHTML = qvals.map(n => `<button type="button" class="mini-btn donate-preset-btn" data-amt="${n}" style="font-size:10px;padding:3px 7px;background:#0e7490;color:#fff;border:none;border-radius:4px;">${n === gold ? '全額 ' : ''}${n.toLocaleString()}G</button>`).join('');
      quick.querySelectorAll('.donate-preset-btn').forEach(btn => {
        btn.onclick = () => {
          const amt = btn.getAttribute('data-amt');
          this.globalFundAmount = amt;
          this._donateUserPicked = true;
          if (sel) {
            if (![...sel.options].some(o => o.value === amt)) {
              const opt = document.createElement('option'); opt.value = amt; opt.textContent = `${Number(amt).toLocaleString()} G`;
              sel.appendChild(opt);
            }
            sel.value = amt;
          }
        };
      });
    }
  },

  /** 国庫へ寄付 → 全国兵士へ均等配分（余りは国庫残留） */
  donateToTreasury(amountInput = 10000) {
    const living = [...(this.squad || []), ...(this.reserves || [])].filter(s => s && !s.dead);
    let amount = 0;
    if (amountInput === 'max') amount = this.gold || 0;
    else amount = parseInt(amountInput, 10) || 0;
    if (amount <= 0) {
      this.showToast('⚠️ 寄付額が0以下です');
      return false;
    }
    if ((this.gold || 0) < amount) {
      alert(`軍資金が足りません (所持: ${(this.gold || 0).toLocaleString()}G / 必要: ${amount.toLocaleString()}G)`);
      return false;
    }
    if (!confirm(`🏛 国庫へ ${amount.toLocaleString()}G を寄付しますか？\n75%は国庫・開発へ、25%は生存兵士${living.length}名へ配分します。`)) return false;

    this.gold -= amount;
    this.treasury = (this.treasury || 0) + amount;
    if (this.phaseFiscal) this.phaseFiscal.donations = (this.phaseFiscal.donations || 0) + amount;

    this.nation=normalizeNation(this.nation);this.nation.totalDonations+=amount;
    const per = living.length?Math.floor(amount*.25 / living.length):0;
    let distributed = 0;
    if (per > 0) {
      for (const s of living) {
        s.gold = (s.gold || 0) + per;
        distributed += per;
      }
      this.treasury -= distributed;
    }
    if (this.phaseFiscal) {
      this.phaseFiscal.distributed = (this.phaseFiscal.distributed || 0) + distributed;
      this.phaseFiscal.distributeHeadcount = living.length;
      this.phaseFiscal.endBalance = this.treasury;
    }

    // 受け取った兵士は自費で軽く強化を試みる（旧全軍支給の自主強化を縮小継承）
    let totalUpgrades = 0;
    for (const s of living) {
      if (!s.equipped) continue;
      const slotKeys = ['weapon', 'armor', 'shield', 'helmet', 'legs', 'gloves', 'amulet'];
      let guard = 0;
      while (guard < 20) {
        guard++;
        const candidates = slotKeys.map(k => s.equipped[k]).filter(Boolean)
          .sort((a, b) => (a.upgrade || 0) - (b.upgrade || 0));
        let any = false;
        for (const eqItem of candidates) {
          const cost = this.getUpgradeCost(eqItem);
          if ((s.gold || 0) >= cost) {
            s.gold -= cost;
            applyUpgradeStats(eqItem, (eqItem.upgrade || 0) + 1);
            totalUpgrades++;
            any = true;
            break;
          }
        }
        if (!any) break;
      }
      this.recalcSoldierStats(s);
    }

    sound.playHighScore();
    this.showToast(`🏛【国庫寄付】${amount.toLocaleString()}G → 全国${living.length}名へ各${per.toLocaleString()}G配分（強化${totalUpgrades}回） / 国庫残${(this.treasury || 0).toLocaleString()}G`);
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  /** @deprecated 全軍一括支給は廃止。国庫寄付へ誘導 */
  fundAllSoldiers(amountInput = 10000) {
    this.showToast('ℹ️ 全軍一括支給は廃止されました。国庫へ寄付して全国配分するか、自部隊へ個別援助してください');
    return this.donateToTreasury(amountInput);
  },

  rollScoutTalent() {
    // 天才 0.25% / 英才 ~5.75% / 有望 14% / へっぽこ 15% / 凡庸 ~65%
    const roll = Math.random();
    if (roll < 0.0025) return 'GENIUS';
    if (roll < 0.06) return 'ELITE';
    if (roll < 0.20) return 'TALENTED';
    if (roll < 0.35) return 'INFERIOR';
    return 'AVERAGE';
  },

  refreshScoutCandidates() {
    const classKeys = ['HEAVY', 'LIGHT', 'ARCHER', 'MEDIC', 'MAGE'];
    const phase = this.phase || 1;
    this.scoutCandidates = [0, 1, 2, 3, 4].map((i) => {
      const talent = this.rollScoutTalent();
      const classKey = classKeys[Math.floor(Math.random() * classKeys.length)];
      const level = 1 + Math.floor(Math.random() * Math.min(5, 1 + Math.floor(phase / 8)));
      const cost = calcScoutCost(phase, talent, level);
      return {
        id: `scout-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        talent,
        classKey,
        level,
        cost
      };
    });
    return this.scoutCandidates;
  },

  personalGuardScore(s) {
    if (!s) return 0;
    return (s.isNamed ? 100 : 0) + (s.isVeteran ? 50 : 0) + (s.level || 1) + ((s.bossKills || 0) * 3);
  },

  /** Keep _guardSlot indices; fill vacant personal slots; demote excess only (manual pull sticks). */
  syncPersonalGuardSlots(aliveList, maxGuards) {
    const alive = aliveList || (this.squad || []).filter(s => s && !s.dead);
    const cap = Math.max(0, maxGuards | 0);
    let guards = alive.filter(s => s.isPersonalGuard);
    if (cap <= 0) {
      for (const s of alive) {
        s.isPersonalGuard = false;
        s._guardSlot = -1;
      }
      return;
    }
    // Over capacity (rank drop): demote weakest guards first
    if (guards.length > cap) {
      guards.sort((a, b) => this.personalGuardScore(a) - this.personalGuardScore(b));
      while (guards.length > cap) {
        const drop = guards.shift();
        drop.isPersonalGuard = false;
        drop._guardSlot = -1;
      }
    }
    // 空き枠は自動補充しない（引き抜き／スカウトのみで編入）。超過時の降格のみ自動化。
    // Refresh slot indices for formation orbit
    const finalGuards = alive.filter(s => s.isPersonalGuard);
    for (const s of alive) s._guardSlot = -1;
    finalGuards.forEach((s, i) => { s._guardSlot = i; });
  },

  listPersonalGuardsAlive() {
    return (this.squad || []).filter(s => s && !s.dead && s.isPersonalGuard);
  },

  /** 本隊→自部隊。満員なら replaceId で入れ替え、未指定なら選択ダイアログ。 */
  assignToPersonalSquad(soldierId, replaceId = null) {
    if(this.currentDungeon){this.showToast('直属の編成変更は野外で行ってください');return false;}
    const soldier = (this.squad || []).find(s => s && s.id === soldierId);
    if (!soldier || soldier.dead) {
      this.showToast?.('⚠️ 対象の兵士が見つかりません');
      return false;
    }
    if ((this.reserves || []).includes(soldier)) {
      this.showToast?.('⚠️ 予備兵は本隊合流後に引き抜いてください');
      return false;
    }
    if (soldier.isPersonalGuard) {
      this.showToast?.('すでに自部隊（直属）です');
      return false;
    }
    const currentRank = RANKS[this.rankIndex] || RANKS[0];
    const maxGuards = Math.min(currentRank.personalGuards || 0, PERSONAL_GUARD_MAX);
    if (maxGuards <= 0) {
      alert('直属小隊を編成できる階級ではありません。昇進してください');
      return false;
    }
    const guards = this.listPersonalGuardsAlive();
    if (guards.length >= maxGuards) {
      if (replaceId == null) {
        this.openPersonalSwapDialog(soldier);
        return false;
      }
      const outgoing = guards.find(s => s.id === replaceId);
      if (!outgoing) {
        this.showToast?.('⚠️ 入れ替え対象が見つかりません');
        return false;
      }
      outgoing.isPersonalGuard = false;
      outgoing._guardSlot = -1;
      soldier.isPersonalGuard = true;
      this.syncPersonalGuardSlots(null, maxGuards);
      this.showToast?.(`⭐【引き抜き】${soldier.name} を自部隊へ（代わりに ${outgoing.name} を本隊へ）`);
      sound.playHighScore?.();
      this.saveGame();
      this.renderStrategyUI();
      this.updateStatsUI();
      return true;
    }
    soldier.isPersonalGuard = true;
    this.syncPersonalGuardSlots(null, maxGuards);
    this.showToast?.(`⭐【引き抜き】${soldier.name} を自部隊（直属）へ編入`);
    sound.playHighScore?.();
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  returnToMainForce(soldierId) {
    if(this.currentDungeon){this.showToast('直属の編成変更は野外で行ってください');return false;}
    const soldier = (this.squad || []).find(s => s && s.id === soldierId);
    if (!soldier || soldier.dead) {
      this.showToast?.('⚠️ 対象の兵士が見つかりません');
      return false;
    }
    if (!soldier.isPersonalGuard) {
      this.showToast?.('すでに本隊所属です');
      return false;
    }
    soldier.isPersonalGuard = false;
    soldier._guardSlot = -1;
    const currentRank = RANKS[this.rankIndex] || RANKS[0];
    const maxGuards = Math.min(currentRank.personalGuards || 0, PERSONAL_GUARD_MAX);
    this.syncPersonalGuardSlots(null, maxGuards);
    this.showToast?.(`🏰【編成変更】${soldier.name} を本隊へ戻した`);
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  openPersonalSwapDialog(incoming) {
    if (!incoming) return;
    const currentRank = RANKS[this.rankIndex] || RANKS[0];
    const maxGuards = Math.min(currentRank.personalGuards || 0, PERSONAL_GUARD_MAX);
    const guards = this.listPersonalGuardsAlive();
    const old = document.getElementById('personal-swap-popup');
    if (old) old.remove();
    const popup = document.createElement('div');
    popup.id = 'personal-swap-popup';
    popup.className = 'transfer-popup-overlay';
    popup.style.cssText = 'position:fixed;inset:0;z-index:12000;background:rgba(2,6,23,0.72);display:flex;align-items:center;justify-content:center;padding:12px;';
    const inCls = SOLDIER_CLASSES[incoming.soldierClass] || SOLDIER_CLASSES.HEAVY;
    const inTalent = TALENTS[incoming.talent] || TALENTS.AVERAGE;
    const rows = guards.map(g => {
      const cls = SOLDIER_CLASSES[g.soldierClass] || SOLDIER_CLASSES.HEAVY;
      const talent = TALENTS[g.talent] || TALENTS.AVERAGE;
      return `<button type="button" class="personal-swap-pick" data-id="${g.id}" style="display:block;width:100%;text-align:left;margin:0 0 6px;padding:8px 10px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;cursor:pointer;">
        <div style="font-size:12px;font-weight:bold;">${cls.icon || ''} ${g.name} <span style="color:${talent.color};font-size:10px;">[${talent.tag}]</span></div>
        <div style="font-size:10px;color:#94a3b8;">Lv.${g.level || 1} ${cls.name} · HP ${Math.floor(g.hp||0)}/${g.maxHp||0} · 本隊へ戻す</div>
      </button>`;
    }).join('');
    popup.innerHTML = `
      <div style="width:min(420px,96vw);max-height:86vh;overflow:auto;background:#020617;border:1px solid #475569;border-radius:12px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,0.55);">
        <div style="font-size:14px;font-weight:bold;color:#fde68a;margin-bottom:6px;">自部隊は定員一杯です</div>
        <p style="font-size:11px;color:#cbd5e1;line-height:1.5;margin:0 0 10px;">
          定員 ${guards.length}/${maxGuards}。本隊の
          <strong style="color:#fff;">${inCls.icon || ''} ${incoming.name}</strong>
          <span style="color:${inTalent.color};">[${inTalent.tag}]</span>
          を引き抜くには、代わりに本隊へ戻す直属を選んでください。
        </p>
        <div>${rows || '<p style="color:#94a3b8;font-size:11px;">入れ替え可能な直属がいません</p>'}</div>
        <button type="button" class="action-btn secondary btn-close-personal-swap" style="width:100%;margin-top:8px;min-height:36px;">キャンセル</button>
      </div>`;
    const close = () => {
      popup.remove();
      setSubDialog?.(this, popup, false);
    };
    popup.querySelector('.btn-close-personal-swap')?.addEventListener('click', close);
    popup.addEventListener('click', (e) => { if (e.target === popup) close(); });
    popup.querySelectorAll('.personal-swap-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        const rid = btn.getAttribute('data-id');
        close();
        this.assignToPersonalSquad(incoming.id, rid);
      });
    });
    document.body.appendChild(popup);
    setSubDialog?.(this, popup, true, close);
  },

  scoutSoldier(candidateId, destination = 'main') {
    if(this.currentDungeon&&destination==='personal'){this.showToast('直属への雇用は野外で行ってください。本隊への雇用は可能です');return false;}
    const cand = (this.scoutCandidates || []).find(c => c.id === candidateId);
    if (!cand) {
      this.showToast('⚠️ スカウト候補が見つかりません。再募集してください');
      return false;
    }
    const cost = cand.cost || calcScoutCost(this.phase || 1, cand.talent, cand.level);
    if ((this.gold || 0) < cost) {
      alert(`スカウト費用が足りません (必要: ${cost.toLocaleString()}G / 所持: ${(this.gold || 0).toLocaleString()}G)`);
      return false;
    }
    const currentRank = RANKS[this.rankIndex] || RANKS[0];
    const maxGuards = Math.min(currentRank.personalGuards || 0, PERSONAL_GUARD_MAX);
    const guardCount = (this.squad || []).filter(s => !s.dead && s.isPersonalGuard).length;

    if (destination === 'personal') {
      if (maxGuards <= 0) {
        alert('直属小隊を編成できる階級ではありません。本隊へスカウトするか、昇進してください');
        return false;
      }
      if (guardCount >= maxGuards) {
        // 満員: 入れ替え対象を選んでから雇用を続行
        this.openScoutPersonalSwapDialog(cand, cost);
        return false;
      }
    }

    this.gold -= cost;
    if (this.phaseFiscal) this.phaseFiscal.scoutSpent = (this.phaseFiscal.scoutSpent || 0) + cost;

    const soldier = this.createNewSoldier();
    soldier.talent = cand.talent;
    soldier.soldierClass = cand.classKey;
    soldier.level = cand.level || 1;
    soldier.recruitedPhase = this.phase || 1;
    soldier.scoutHired = true;
    // レベル分の軽い成長
    const cls = SOLDIER_CLASSES[cand.classKey] || SOLDIER_CLASSES.HEAVY;
    soldier.maxHp = Math.floor((soldier.maxHp || 80) * (1 + (soldier.level - 1) * 0.08));
    soldier.hp = soldier.maxHp;
    soldier.atk = Math.floor((soldier.atk || 12) * (1 + (soldier.level - 1) * 0.06));

    if (destination === 'personal') {
      soldier.isPersonalGuard = true;
      if ((this.squad || []).length >= DEPLOYMENT_CAPACITY) {
        // 本隊枠が満杯なら弱い本隊兵士を予備へ下げて枠を確保
        const demote = (this.squad || []).find(s => !s.dead && !s.isPersonalGuard);
        if (demote) {
          this.squad = this.squad.filter(s => s.id !== demote.id);
          this.reserves = this.reserves || [];
          this.reserves.push(demote);
        }
      }
      this.squad.push(soldier);
    } else {
      if ((this.squad || []).length < DEPLOYMENT_CAPACITY) {
        soldier.isPersonalGuard = false;
        this.squad.push(soldier);
      } else {
        soldier.isPersonalGuard = false;
        this.reserves = this.reserves || [];
        this.reserves.push(soldier);
      }
    }

    this.scoutCandidates = (this.scoutCandidates || []).filter(c => c.id !== candidateId);
    this.recalcSoldierStats(soldier);
    const talent = TALENTS[cand.talent] || TALENTS.AVERAGE;
    const destLabel = destination === 'personal' ? '自部隊' : '本隊';
    sound.playHighScore();
    this.showToast(`🔍【スカウト成功】[${talent.tag}] ${cls.icon}${cls.name} Lv.${soldier.level} を${destLabel}へ雇用 (−${cost.toLocaleString()}G)`);
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  dismissSoldier(soldierId) {
    const inSquad = (this.squad || []).find(s => s.id === soldierId);
    const inReserve = (this.reserves || []).find(s => s.id === soldierId);
    const s = inSquad || inReserve;
    if (!s) return false;
    if (s.isDown) {
      alert('負傷ダウン中の兵士は放逐できません。救護後に行ってください');
      return false;
    }
    const settle = calcDismissSettlement(s, this.phase || 1);
    const dest = s.isPersonalGuard ? '自部隊' : '本隊';
    if (!confirm(`放逐: ${s.name}（${dest}）\n返還 約${settle.refundToPlayer.toLocaleString()}G（隊長）\nサイフ還流 ${settle.goldReturnToTreasury.toLocaleString()}G + 高Tier換金 ${settle.gearSellToTreasury.toLocaleString()}G → 国庫\n装備T≤3は共有ボックスへ\n実行しますか？`)) return false;

    this.gold = (this.gold || 0) + settle.refundToPlayer;
    this.treasury = (this.treasury || 0) + settle.goldReturnToTreasury + settle.gearSellToTreasury;
    this.sharedEquipBox = this.sharedEquipBox || [];
    for (const it of settle.gearToBox) this.sharedEquipBox.push(it);
    // 異質/神鍛 returned to personal inventory (never shared-box / auto-sell on dismiss)
    if (settle.gearToPlayer && settle.gearToPlayer.length) {
      this.inventory = this.inventory || [];
      for (const it of settle.gearToPlayer) {
        if (it && !this.inventory.some(i => i && i.id === it.id)) this.inventory.push(it);
      }
    }
    if (this.phaseFiscal) {
      this.phaseFiscal.dismissRefund = (this.phaseFiscal.dismissRefund || 0) + settle.refundToPlayer;
      this.phaseFiscal.treasuryReturns=(this.phaseFiscal.treasuryReturns||0)+settle.goldReturnToTreasury;
      this.phaseFiscal.surplusSales = (this.phaseFiscal.surplusSales || 0) + settle.gearSellToTreasury;
      this.phaseFiscal.endBalance = this.treasury;
    }

    if (inSquad) this.squad = this.squad.filter(x => x.id !== soldierId);
    if (inReserve) this.reserves = this.reserves.filter(x => x.id !== soldierId);

    sound.playItem();
    this.showToast(`🚪【放逐】${s.name} を解雇 · 返還+${settle.refundToPlayer.toLocaleString()}G / 国庫+${(settle.goldReturnToTreasury + settle.gearSellToTreasury).toLocaleString()}G`);
    this.normalizeDeployment?.();
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  /** 共有ボックス配布＋弱余剰の国庫換金 */
  createSupplyEquipment(type,soldier,tier=1) {
    const item=generateRandomDrop(0,'normal',{type,tier,upgrade:0,quality:1,merchant:true,random:()=>.5,id:`issue-${soldier.id}-${this.phase}-${type}-t${tier}`});
    item.nationalIssue=true;item.qualityLabel='標準支給';delete item.weaponTraits;
    if(type==='WEAPON'){
      item.weaponStyle=soldier.favoriteWeapon||'sword';
      const cls=SOLDIER_CLASSES[soldier.soldierClass]||SOLDIER_CLASSES.HEAVY,family=cls.baseClassId||soldier.soldierClass;
      if(family==='MAGE'||family==='MEDIC')item.weaponStyle='sword';
      else if(family==='ARCHER'&&!RANGED_STYLES.includes(item.weaponStyle))item.weaponStyle='bow';
      else if(family!=='ARCHER'&&!MELEE_STYLES.includes(item.weaponStyle))item.weaponStyle='sword';
      const names={sword:'weapon',spear:'spear',hammer:'hammer',bow:'bow',crossbow:'crossbow',cannon:'cannon'};
      item.baseName=TIERS[tier-1][names[item.weaponStyle]||'weapon'];
      if(family==='MAGE'||family==='MEDIC')item.baseName=`${TIERS[tier-1].mat}の術杖・${TIERS[tier-1].generation}型`;item.name=item.baseName;
    }
    applyUpgradeStats(item,0);return item;
  },

  processSharedEquipmentBox() {
    this.sharedEquipBox = this.sharedEquipBox || [];
    // 異質/神鍛 that somehow landed in 国庫共有 → repatriate to personal inventory (never auto-sell/distribute as weak surplus)
    const stay = [];
    this.inventory = this.inventory || [];
    for (const it of this.sharedEquipBox) {
      if (isGodRollProtected(it)) {
        if (it && !this.inventory.some(i => i && i.id === it.id)) this.inventory.push(it);
      } else {
        stay.push(it);
      }
    }
    this.sharedEquipBox = stay;
    const soldiers = [...(this.squad || []), ...(this.reserves || [])];
    const value=(unit,item,key)=>this.equipmentValueFor(unit,item,key);
    const dist = distributeSharedBoxToSoldiers(this.sharedEquipBox, soldiers, (s) => this.recalcSoldierStats(s),value);
    this.sharedEquipBox = dist.remaining;
    if(this.phaseFiscal)this.phaseFiscal.sharedEquipmentIssued=(this.phaseFiscal.sharedEquipmentIssued||0)+dist.equippedCount;
    const sample=soldiers.find(s=>!s.dead)||{id:'stock',soldierClass:'HEAVY'};
    const strength=i=>equipmentScore({...i,tier:1,upgrade:0});
    const minimum=new Map();
    const sold = sellWeakSurplusFromBox(this.sharedEquipBox, soldiers,value,{perSlot:RESERVE_ARMAMENT_COUNT,keep:item=>{if(!minimum.has(item.type))minimum.set(item.type,strength(this.createSupplyEquipment(item.type,sample,1)));return strength(item)>minimum.get(item.type);}});
    this.sharedEquipBox = sold.remaining;
    this.nation=normalizeNation(this.nation);this.nation.totalExports+=sold.soldGold;
    if (sold.soldGold > 0) {
      this.treasury = (this.treasury || 0) + sold.soldGold;
      if (this.phaseFiscal) {
        this.phaseFiscal.surplusSales = (this.phaseFiscal.surplusSales || 0) + sold.soldGold;
        this.phaseFiscal.surplusCount = (this.phaseFiscal.surplusCount || 0) + sold.soldCount;
      }
    }
    return { equippedCount: dist.equippedCount, soldGold: sold.soldGold, soldCount: sold.soldCount };
  },

  // 🎁 任意の兵士への装備譲渡（旧装備はバッグへ返却＆強化引き継ぎ、さらに兵士自費強化も！）
  giveItemToSoldier(soldierId, item) {
    const soldier = this.squad.find(s => s.id === soldierId && !s.dead);
    const slotKey=SLOT_INFO[item?.type]?.key;
    if(!soldier || !slotKey)return false;
    const source=this.transferItems(slotKey,soldier).find(i=>i.id===item.id);
    if(!source)return false;item=source;
    soldier.equipped ||= {};
    const oldItem=soldier.equipped[slotKey];
    for(const owner of [this,...this.squad,...(this.reserves || [])]) {
      for(const key of Object.keys(owner.equipped || {})) {
        if(owner.equipped[key]?.id===item.id) {owner.equipped[key]=null;if(key==='weapon' && owner!==this)owner.weapon=null;}
      }
    }
    if(oldItem && (oldItem.upgrade||0)>(item.upgrade||0))applyUpgradeStats(item,oldItem.upgrade);
    soldier.equipped[slotKey]=item;
    if(slotKey==='weapon')soldier.weapon=item;
    this.inventory=(this.inventory || []).filter(i=>i.id!==item.id);
    const held=equippedIds(this.equipped,[...this.squad,...(this.reserves || [])]);
    if(oldItem && !held.has(oldItem.id) && !this.inventory.some(i=>i.id===oldItem.id))this.inventory.push(oldItem);
    this.recalcPlayerStats();this.squad.forEach(s=>this.recalcSoldierStats(s));
    this.updateStatsUI();
    this.dialogue?.trigger(soldier, 'GEAR_ACQUIRED', Date.now(), true);

    // 装備をもらった兵士が興奮して手持ちのお金で自発強化を検討！
    const upCost = this.getUpgradeCost(item);
    if ((soldier.gold || 0) >= upCost + 10) {
      soldier.gold -= upCost;
      applyUpgradeStats(item, (item.upgrade || 0) + 1);
      this.showToast(`🎁 ${soldier.name}に「${item.name}」を譲渡！兵士は自費でさらに自主強化(+${item.upgrade})！`);
    } else {
      this.showToast(`🎁 ${soldier.name}に「${item.name}」を譲渡！${oldItem ? '(旧装備はバッグへ返却)' : ''}`);
    }

    this.recalcSoldierStats(soldier);
    sound.playHighScore();
    this.saveGame();
    this.renderStrategyUI();
  },

  transferItems(slotKey,soldier) {
    const held=equippedIds({},[...this.squad,...(this.reserves||[])]);
    const items=[...(this.inventory||[]),...Object.values(this.equipped||{})].filter(Boolean);
    return [...new Map(items.map(i=>[i.id,i])).values()].filter(i=>SLOT_INFO[i.type]?.key===slotKey && !held.has(i.id) && soldier.equipped?.[slotKey]?.id!==i.id);
  },

  sellInventoryItems(ids) {
    const held=equippedIds(this.equipped,[...this.squad,...(this.reserves||[])]);
    const requested=new Set(ids),sold=new Map();
    for(const item of this.inventory||[])if(requested.has(item.id)&&canSell(item,held))sold.set(item.id,item);
    const value=[...sold.values()].reduce((sum,item)=>sum+saleValue(item),0);
    if(!sold.size)return {count:0,value:0};
    this.inventory=this.inventory.filter(i=>!sold.has(i.id));this.gold=(this.gold||0)+value;
    this.selectedSaleIds=new Set();this.saveGame();this.updateStatsUI();this.renderStrategyUI();
    this.showToast(`${sold.size}個を売却：+${value}G`);return {count:sold.size,value};
  },

  renderSoldierEquipment(row, soldier) {
    const grid = document.createElement('div');
    grid.className = 'soldier-equipment';
    for (const info of Object.values(SLOT_INFO)) {
      const button = document.createElement('button');
      button.dataset.slot = info.key;
      button.type = 'button';
      button.className = 'soldier-equip-slot-btn';
      const equipped = soldier.equipped?.[info.key];
      const hasEq = !!equipped;
      button.innerHTML = `
        <span class="slot-header">${info.icon} ${info.name}</span>
        <span class="slot-item-text" style="color:${hasEq ? (equipped.color || '#fef08a') : '#718096'};">
          ${hasEq ? equipped.name : '（空き）'}
        </span>
      `;
      button.onclick = () => this.openEquipmentTransferPopup(soldier, info.key);
      grid.append(button);
    }
    row.append(grid);
  },

  openEquipmentTransferPopup(soldier, slotKey = 'weapon') {
    let popup = document.getElementById('equipment-transfer-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'equipment-transfer-popup';
      popup.className = 'transfer-popup-overlay';
      const container = document.querySelector('.iron-squad') || document.body;
      container.appendChild(popup);
    }
    popup.classList.remove('hidden');
    const closePopup = () => { popup.classList.add('hidden'); setSubDialog(this, popup, false); };

    const renderPopupContent = (activeSlot) => {
      const info = Object.values(SLOT_INFO).find(i => i.key === activeSlot) || SLOT_INFO.WEAPON;
      const current = soldier.equipped?.[activeSlot];
      const items = this.transferItems(activeSlot, soldier);

      // 強い順（旧装備の強化引き継ぎを考慮したプレビュースコア降順）にソート
      items.sort((a, b) => {
        const prevB = structuredClone(b);
        if ((current?.upgrade || 0) > (prevB.upgrade || 0)) applyUpgradeStats(prevB, current.upgrade);
        const prevA = structuredClone(a);
        if ((current?.upgrade || 0) > (prevA.upgrade || 0)) applyUpgradeStats(prevA, current.upgrade);
        return equipmentScore(prevB) - equipmentScore(prevA);
      });

      popup.innerHTML = `
        <div class="transfer-popup-container">
          <div class="transfer-popup-header">
            <div>
              <h3 class="transfer-popup-title">🎁 装備譲渡：${soldier.name}</h3>
              <p class="transfer-popup-sub">${info.icon} ${info.name} · 現在：<strong style="color:${current?.color || '#e2e8de'};">${current ? current.name : '（空きスロット）'}</strong></p>
            </div>
            <button type="button" class="transfer-popup-close-btn" aria-label="閉じる">✕</button>
          </div>

          <div class="transfer-slot-tabs">
            ${Object.values(SLOT_INFO).map(s => {
              const sEq = soldier.equipped?.[s.key];
              const isActive = s.key === activeSlot;
              return `
                <button type="button" class="transfer-slot-tab-btn ${isActive ? 'active' : ''}" data-slot="${s.key}">
                  ${s.icon} ${s.name}${sEq ? '●' : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div class="transfer-popup-hint">
            ⭐ 強い順に並んでいます。タップで即座に譲渡（旧装備の強化値は自動引き継ぎ）
          </div>

          <div class="transfer-item-list">
            ${items.length === 0 ? `
              <div class="transfer-empty-msg">
                <p>この部位に譲渡可能な装備はありません。</p>
                <span style="font-size:10px; color:#64748b;">（バッグまたは隊長装備に譲渡可能な${info.name}がありません）</span>
              </div>
            ` : items.map(item => {
              const preview = structuredClone(item);
              const inherited = (current?.upgrade || 0) > (preview.upgrade || 0);
              if (inherited) applyUpgradeStats(preview, current.upgrade);
              const comp = compareEquipment(preview, current);
              const heroEquipped = Object.values(this.equipped || {}).some(i => i?.id === item.id);

              return `
                <div class="transfer-item-card ${heroEquipped ? 'is-hero-eq' : ''}" data-item-id="${item.id}">
                  <div class="transfer-card-header">
                    <span class="transfer-item-name" style="color:${item.color || '#e2e8de'};">
                      [T${item.tier}] ${preview.name}
                    </span>
                    <span class="transfer-comp-badge ${comp.kind}">${comp.label}</span>
                  </div>
                  <div class="transfer-card-stats">
                    <div class="stat-delta-block">${comp.html}</div>
                  </div>
                  <div class="transfer-card-meta">
                    <span class="transfer-meta-note">
                      ${heroEquipped ? '<span style="color:#f59e0b; font-weight:bold;">👑隊長装備中 (外れます)</span>' : '<span style="color:#94a3b8;">🎒バッグ内</span>'}
                      ${inherited ? `<span style="color:#34d399; margin-left:4px;">(強化+${current.upgrade}引継)</span>` : ''}
                    </span>
                    <button type="button" class="transfer-tap-btn">タップして譲渡</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="transfer-popup-footer">
            <button type="button" class="action-btn secondary btn-close-transfer" style="min-height:36px; padding:6px; font-size:12px;">閉じる</button>
          </div>
        </div>
      `;

      popup.querySelector('.transfer-popup-close-btn')?.addEventListener('click', closePopup);
      popup.querySelector('.btn-close-transfer')?.addEventListener('click', closePopup);
      popup.onclick = (e) => {
        if (e.target === popup) closePopup();
      };

      popup.querySelectorAll('.transfer-slot-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          renderPopupContent(e.currentTarget.dataset.slot);
        });
      });

      popup.querySelectorAll('.transfer-item-card').forEach(card => {
        card.addEventListener('click', () => {
          const itemId = card.dataset.itemId;
          const targetItem = items.find(i => i.id === itemId);
          if (targetItem) {
            this.giveItemToSoldier(soldier.id, targetItem);
            renderPopupContent(activeSlot);
          }
        });
      });
      setSubDialog(this, popup, true, closePopup);
    };

    renderPopupContent(slotKey);
  },

  renderSaleToolbar(invList) {
    let toolbar=document.getElementById('equipment-sale-toolbar');
    if(!toolbar){toolbar=document.createElement('details');toolbar.id='equipment-sale-toolbar';invList.before(toolbar);}
    this.selectedSaleIds ||= new Set();
    const protectedIds=equippedIds(this.equipped,[...this.squad,...(this.reserves||[])]);
    const selected=[...new Map((this.inventory||[]).filter(i=>this.selectedSaleIds.has(i.id)&&canSell(i,protectedIds)).map(i=>[i.id,i])).values()];
    this.selectedSaleIds=new Set(selected.map(i=>i.id));
    toolbar.innerHTML=`<summary>余剰装備の一括売却 · 選択${selected.length}個 / ${selected.reduce((n,i)=>n+saleValue(i),0)}G</summary><p>装備中・保護中の品は対象外。「弱い余剰」は未強化の下位互換を選択します。選択数と売却額を確認してください。</p>`;
    const tier=document.createElement('select');tier.setAttribute('aria-label','余剰選択のTier上限');
    for(let n=1;n<=GENERATION_COUNT*4;n++){const option=document.createElement('option');option.value=n;option.textContent=`T${n}以下`;tier.append(option);}tier.value=this.saleMaxTier||2;
    tier.onchange=()=>{this.saleMaxTier=Number(tier.value);};
    const choose=document.createElement('button');choose.textContent='弱い余剰を選択';
    choose.onclick=()=>{this.selectedSaleIds=new Set(lowValueIds(this.inventory||[],this.equipped,[...this.squad,...(this.reserves||[])],Number(tier.value)));this.renderStrategyUI();};
    const clear=document.createElement('button');clear.textContent='選択解除';clear.onclick=()=>{this.selectedSaleIds.clear();this.renderStrategyUI();};
    const sell=document.createElement('button');sell.textContent=`選択 ${selected.length}個を売却 · ${selected.reduce((sum,i)=>sum+saleValue(i),0)}G`;sell.disabled=!selected.length;
    sell.className='sell-selected';
    sell.onclick=()=>this.sellInventoryItems(this.selectedSaleIds);
    toolbar.append(tier,choose,clear,sell);
  },

  renderSaleControls(row,item) {
    const held=equippedIds(this.equipped,[...this.squad,...(this.reserves||[])]);
    const controls=document.createElement('div');controls.className='sale-controls';
    const label=document.createElement('label'),checkbox=document.createElement('input');checkbox.type='checkbox';
    checkbox.checked=this.selectedSaleIds.has(item.id);checkbox.disabled=!canSell(item,held);checkbox.setAttribute('aria-label',`${item.name}を売却選択`);
    checkbox.onchange=()=>{if(checkbox.checked)this.selectedSaleIds.add(item.id);else this.selectedSaleIds.delete(item.id);this.renderStrategyUI();};
    label.append(checkbox,document.createTextNode(`${saleValue(item)}G${held.has(item.id)?' · 装備中':''}`));
    const protect=document.createElement('button');protect.textContent=item.favorite?'★ 保護中':'☆ 保護';protect.setAttribute('aria-pressed',String(!!item.favorite));
    protect.onclick=()=>{item.favorite=!item.favorite;this.saveGame();this.renderStrategyUI();};controls.append(label,protect);row.append(controls);
  },

  completeWave() { this.completePhase(); },

  openStrategyModal(isManualOpen = false) {
    const modal = document.getElementById('strategy-modal');
    const titleEl = document.getElementById('strat-title');
    const reportEl = document.getElementById('strat-report');
    const nextBtn = document.getElementById('btn-start-next-wave');
    const closeBtn = document.getElementById('btn-close-strat');

    if (isManualOpen) {
      titleEl.textContent = `司令部 · 作戦第${this.phase || this.wave || 1}期`;
      const fr = this.lastFiscalReport;
      reportEl.innerHTML = (fr ? formatFiscalReportHtml(fr) : '') + '<div style="font-size:12px;color:#b0bacd;">装備の強化鍛冶、武器防具の支給、兵士の叙勲・投資・スカウトを行えます。</div>';
      nextBtn.textContent = this.restTimer>0?`待機へ戻る（残り${Math.ceil(this.restTimer)}秒）`:'戦場へ戻る';
      nextBtn.classList.remove('hidden');
      closeBtn.classList.add('hidden');
      this.inBattle = false;
    } else {
      titleEl.textContent = `司令部 · 作戦第${this.phase || this.wave || 1}期`;
      const alive = this.squad.filter(s => !s.dead);
      const deadCount = this.squad.length - alive.length;
      const clearedOps = (this.outposts || []).filter(o => o.cleared).length;
      const questStatusText = (this.currentQuest && this.currentQuest.completed)
        ? `<span style="color:#00ffaa;">達成！(+${this.currentQuest.rewardGold}G / 武勲+${this.currentQuest.rewardExp})</span>`
        : `<span style="color:#f59e0b;">未達 (次戦継続)</span>`;

      const rep = this.treatmentReport || { fullHealedCount: 0, brokeSoldiersCount: 0, autoUpgradedCount: 0 };
      const dl = this.deathlineReport;
      let deathlineBannerHtml = '';
      if (dl && dl.occurred) {
        deathlineBannerHtml = `
          <div style="background: linear-gradient(135deg, rgba(239,68,68,0.22), rgba(15,23,42,0.95)); border: 1.5px solid #ef4444; border-radius: 8px; padding: 9px 11px; margin-bottom: 8px; box-shadow: 0 0 14px rgba(239,68,68,0.35);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color: #f87171; font-size: 12.5px;">🚨【死線突破・極限生還】 損耗率 ${dl.casualtyRatePct}% (${dl.deadCount}名戦死)</strong>
              <span style="color: #fbbf24; font-size: 10.5px; font-weight: bold; background: rgba(251,191,36,0.15); border: 1px solid #fbbf24; border-radius: 4px; padding: 1px 5px;">🔥覚醒発動</span>
            </div>
            <div style="font-size: 10.5px; color: #fecaca; line-height: 1.4; margin-bottom: ${dl.awakenedList.length > 0 ? '6px' : '0'};">
              極限の死線を潜り抜けた兵士たちが、生と死の狭間で新たな固有スキルと能力覚醒を獲得！
            </div>
            ${dl.awakenedList.length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:3px;">
                ${dl.awakenedList.map(a => `
                  <div style="background: rgba(0,0,0,0.45); border-left: 3px solid ${a.skill.color}; padding: 3px 6px; border-radius: 4px; font-size: 10.5px; display:flex; justify-content:space-between; align-items:center;">
                    <span><strong>${a.name}</strong> <span style="color:#94a3b8; font-size:9.5px;">[${TALENTS[a.talent] ? TALENTS[a.talent].tag : ''}]</span></span>
                    <span><strong style="color:${a.skill.color};">${a.skill.icon} ${a.skill.name}</strong> <span style="color:#cbd5e1; font-size:9.5px;">(${a.skill.desc})</span></span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }

      const fiscalHtml = formatFiscalReportHtml(this.lastFiscalReport);
      reportEl.innerHTML = `
        ${deathlineBannerHtml}
        ${fiscalHtml}
        激戦を生き延びた！ 生存部隊: <strong style="color:#00ffaa;">${alive.length}名</strong> ${deadCount > 0 ? `<span style="color:#ff4444;">(${deadCount}名戦死 / 次戦新兵補充)</span>` : ''}<br>
        🗺️ <strong style="color:#ffd700;">【戦場制圧状況】</strong>拠点制圧: <strong style="color:#fff;">${clearedOps} / ${(this.outposts || []).length}箇所</strong> | 📜 軍令: ${questStatusText}<br>
        🛡️ <strong style="color:#38bdf8;">【生還ボーナス】</strong>交戦・回復に参加した兵士${this.lastReinforcements?.experienced || 0}名のみ戦線経験を獲得（待機者は対象外）<br>
        🏥 <strong style="color:#34d399;">【宿営手当て】</strong>各自の予算で治療完了（自費全快: <strong>${rep.fullHealedCount}名</strong> / 資金不足: <strong style="color:#f59e0b;">${rep.brokeSoldiersCount}名</strong>）<br>
        🔨 <strong style="color:#fbbf24;">【自費強化】</strong>兵士たちが予算で装備を自発的に強化！（計 <strong>${rep.autoUpgradedCount}件</strong> 成功）
      `;
      nextBtn.classList.remove('hidden');
      closeBtn.classList.add('hidden');
    }

    this.renderStrategyUI();
    this.inBattle = false;
    this.resetMovementInput();
    this.saveGame();
    modal.classList.remove('hidden');
    this.setDialogState(true);
    document.getElementById('btn-dialog-close').focus();
  },

  renderStrategyUI() {
    // UI rebuilds also retire native Canvas buffers; DOM removal alone waits for GC.
    for (const canvas of this.container?.querySelectorAll('.soldier-portrait, .commander-portrait') || []) releaseCanvas(canvas);
    const scrollBody=this.container?.querySelector('#strategy-modal .dialog-body');
    const scrollTop=scrollBody?.scrollTop || 0;
    // 兵士詳細が開いていれば再描画後に維持
    const keepDetailId = this.selectedSoldierDetailId;
    const overview=document.getElementById('view-strat-overview');
    this.renderSupplyPanel();
    let magicNote=document.getElementById('magic-rules-note');if(!magicNote){magicNote=document.createElement('p');magicNote.id='magic-rules-note';magicNote.className='reinforcement-summary';overview.append(magicNote);}
    magicNote.textContent='魔力：回復・蘇生・上位衛生術師のバフ・魔法攻撃で消費。本陣／町／キャンプ／商人で補給。魔法石は拾った人にかかわらず術者へ自動配分。魔法使いは魔力不足で移動を止め、40MPまで瞑想。危険な地形は継続ダメージ（被弾修練あり）。';
    let maintenance=document.getElementById('maintenance-summary');
    if(!maintenance){maintenance=document.createElement('p');maintenance.id='maintenance-summary';maintenance.className='reinforcement-summary';overview.prepend(maintenance);}
    maintenance.textContent=this.maintenanceSummary();
    let victory=document.getElementById('kill-xp-summary');
    if(!victory){victory=document.createElement('p');victory.id='kill-xp-summary';victory.className='reinforcement-summary';maintenance.after(victory);}
    const kill=this.lastStrongKill;victory.classList.toggle('hidden',!kill);
    victory.textContent=kill?`直近の格上討伐：${kill.who} → ${kill.enemy} · +${kill.exp.toLocaleString()}EXP（通常${kill.baseExp} + 格上補正${kill.bonusExp} / ×${kill.multiplier.toFixed(1)}）`:'';
    let timeSummary=document.getElementById('day-night-summary');
    if(!timeSummary){timeSummary=document.createElement('p');timeSummary.id='day-night-summary';timeSummary.className='reinforcement-summary';maintenance.after(timeSummary);}
    const time=daylightAt(this.worldTime),zone=getFieldZone(this.player.x,this.player.y);
    const dayEnemy=PERIOD_ENEMIES.day[zone.id],nightEnemy=PERIOD_ENEMIES.night[zone.id];
    let casualtySummary=document.getElementById('casualty-summary');
    if(!casualtySummary){casualtySummary=document.createElement('p');casualtySummary.id='casualty-summary';casualtySummary.className='reinforcement-summary';timeSummary.after(casualtySummary);}
    casualtySummary.textContent=`負傷${this.squad.filter(s=>s.isDown&&!s.dead).length}名。接近して紐で搬送：隊長2名・聖騎士2名・他兵士1名。本陣・救護所・町・制圧済み拠点へ運ぶと復活。発見済み救護所へ矢印案内。施設外で復活させられるのは衛生兵・大司教のみ。搬送中は死亡猶予停止。`;
    timeSummary.textContent=`${time.day}日目 · ${time.icon} ${time.label} ${time.clock} / ${time.period==='day'?'夜':'昼'}まで${Math.ceil(time.remaining)}秒。現在地：昼は${dayEnemy.name}、夜は${nightEnemy.name}。昼夜各4分、会議中は時計停止。`;
    document.getElementById('strat-gold').textContent = (this.gold || 0).toLocaleString();
    const _st = document.getElementById('strat-treasury'); if (_st) _st.textContent = String(this.treasury || 0);
    const reserveCount=(this.reserves || []).length;
    const activeCount=this.squad.filter(s=>!s.dead).length;
    const supply=this.lastReinforcements;
    document.getElementById('reinforcement-summary').textContent=
      `実戦 ${activeCount}/${RANKS[this.rankIndex].maxSquad}名 · 予備 ${reserveCount}名`+
      (supply ? ` · 前回の新兵 ${supply.received}名（配備${supply.deployed}名）` : ` · 各戦線終了時に最低${MIN_REINFORCEMENTS}名到着`);
    document.getElementById('reserve-roster-title').textContent=`本陣の予備兵 ${reserveCount}名（欠員時に合流）`;
    const reserveList=document.getElementById('reserve-roster-list');reserveList.replaceChildren();
    for(const soldier of this.reserves || []) {
      const row=document.createElement('div');row.className='reserve-row';
      const cls=SOLDIER_CLASSES[soldier.soldierClass] || SOLDIER_CLASSES.HEAVY;
      const talent=TALENTS[soldier.talent] || TALENTS.AVERAGE;
      row.textContent=`${soldier.name} · ${cls.name} · ${talent.tag} · Lv.${soldier.level || 1} · 経験${soldier.survivedWaves || 0}戦線`;
      if(soldier.lastMaintenance)row.textContent+=` · 自己強化${soldier.lastMaintenance.count}回 / ${soldier.lastMaintenance.spent}G · ${soldier.lastMaintenance.status}`;
      const info=document.createElement('span');info.textContent=row.textContent;
      const detail=document.createElement('button');detail.type='button';detail.className='mini-btn';detail.textContent='個人詳細';
      detail.setAttribute('aria-label',`${soldier.name}の個人詳細`);detail.onclick=()=>this.openSoldierDetail(soldier.id);
      row.replaceChildren(info,detail);
      reserveList.append(row);
    }
    if(this.restReport) {const note=document.createElement('p');note.className='maintenance-summary';note.textContent=this.maintenanceSummary();reserveList.append(note);}
    if(!reserveCount) reserveList.textContent='現在、待機中の予備兵はいません。';

    const orbEl = document.getElementById('strat-orbs');
    if (orbEl) {
      const g = this.awakeningGems || 0;
      orbEl.textContent = `${this.awakeningOrbs || 0} / ${g}`;
    }
    if (typeof this.renderExpeditionPanel === 'function') this.renderExpeditionPanel();

    const pRecordBox = document.getElementById('player-record-box');
    if (pRecordBox && this.player) {
      const p = this.player;
      const minionAtk = Math.floor((p.minionKills || 0) / 5) * 1;
      const minionHp = Math.floor((p.minionKills || 0) / 15) * 10;
      const minionSpd = Math.min(25, Math.floor((p.minionKills || 0) / 30) * 2);
      const bossAtk = (p.bossKills || 0) * 8;
      const bossHp = (p.bossKills || 0) * 50;
      const bossCrit = (p.bossKills || 0) * 2;
      const bossRed = Math.min(30, (p.bossKills || 0) * 2);
      const stage = PLAYER_CLASS_STAGES[playerClassTier(p)];
      const nextStage = nextPlayerStage(p);
      const awakeningCost = classUpCostForNext({ classTier: playerClassTier(p) });

      pRecordBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <strong style="color: #38bdf8; font-size: 12px;">🎖️ 隊長の総合武勲（撃墜数ボーナス＆防御力）</strong>
          <span style="color: #94a3b8; font-size: 10px;">総討伐: ${p.kills || 0}体</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3px; color: #cbd5e1; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span>🛡️ 防御力: <strong style="color: #38bdf8;">DEF ${p.def || 0}</strong> (軽減-${p.dmgReduction || 0}%)</span>
            <span>❤️ HP: <strong style="color: #34d399;">${Math.floor(p.hp)}/${p.maxHp}</strong> | ⚔️ ATK: <strong style="color: #fff;">${p.atk}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>⚔️ 雑魚撃墜: <strong style="color: #fff;">${p.minionKills || 0}体</strong></span>
            <span style="color: #6ee7b7;">(+${minionAtk}攻 / +${minionHp}HP / +${minionSpd}速)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>👑 ボス撃破: <strong style="color: #ffd700;">${p.bossKills || 0}体</strong></span>
            <span style="color: #fde047;">(+${bossAtk}攻 / +${bossHp}HP / 会心+${bossCrit}% / 軽減-${bossRed}%)</span>
          </div>
          <div style="margin-top: 5px; padding-top: 5px; border-top: 1px dashed rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
            <span class="commander-stage">現在：${stage.name}${nextStage ? `<br>次：${nextStage.name} · ${formatClassUpCostJa(awakeningCost)}` : ' · 最高位へ覚醒済み'}</span>
            ${nextStage ? `<button id="btn-promote-player" class="mini-btn" ${canAffordClassUp(this.awakeningOrbs,this.awakeningGems,awakeningCost) ? '' : 'disabled'}>${nextStage.name}へ覚醒</button>` : ''}
          </div>
        </div>
      `;

      const portrait=document.createElement('canvas');portrait.className='commander-portrait';
      portrait.width=112;portrait.height=128;portrait.setAttribute('role','img');portrait.setAttribute('aria-label','隊長の装備と姿');
      const pc=portrait.getContext('2d');pc.translate(56,112);pc.scale(2,2);
      drawFieldCommander(pc,{...p,x:0,y:0},this.equipped || {},0,this.rankIndex,RANKS[this.rankIndex].title,false,true);
      pRecordBox.prepend(portrait);
      const experience=document.createElement('p');experience.className='commander-experience';
      experience.textContent=`戦線経験 ${p.survivedWaves || 0}回 · 今期 ${participated(p)?'参加':'未参加'}`;
      pRecordBox.append(experience);
      const rescueRecord=document.createElement('p');rescueRecord.className='command-note';rescueRecord.id='rescue-permanent-summary';
      rescueRecord.textContent=`救出の永続強化 · ${rescueBonusSummary(this.rescueBonuses)}`;pRecordBox.append(rescueRecord);

      const pPromoteBtn = pRecordBox.querySelector('#btn-promote-player');
      if (pPromoteBtn) {
        pPromoteBtn.addEventListener('click', () => {
          this.promotePlayer();
        });
      }
    }

    const eq = this.equipped;
    const playerEquipBox = document.getElementById('player-equip-box');
    
    const slotsConfig = [
      { key: 'weapon', label: '武器', icon: '🗡️' },
      { key: 'shield', label: '盾', icon: '🛡️' },
      { key: 'helmet', label: '兜', icon: '🪖' },
      { key: 'armor', label: '鎧', icon: '🥋' },
      { key: 'gloves', label: '手', icon: '🧤' },
      { key: 'legs', label: '脚', icon: '🥾' },
      { key: 'amulet', label: '装飾', icon: '📿' }
    ];

    const renderEquipRow = (slotDef) => {
      const item = eq[slotDef.key];
      if (!item) {
        return `
          <div style="font-size: 11px; margin-bottom: 5px; color: #64748b; display:flex; justify-content:space-between; align-items:center;">
            <span>${slotDef.icon} ${slotDef.label}: <em>(未装備)</em></span>
          </div>`;
      }
      const cost = this.getUpgradeCost(item);
      const st = item.stats || {};
      let statParts = [];
      if (st.atk) statParts.push(`+${st.atk}攻`);
      if (st.def) statParts.push(`+${st.def}防`);
      if (st.hp) statParts.push(`+${st.hp}HP`);
      if (st.speed) statParts.push(`+${st.speed}速`);
      if (st.blockChance) statParts.push(`盾防${st.blockChance}%`);
      const statText = statParts.join(' ') || '装備品';

      return `
        <div style="font-size: 11px; margin-bottom: 5px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 2px 4px; border-radius:4px;">
          <div>
            <span style="color:${item.color}; font-weight:bold;">${slotDef.icon} [T${item.tier}] ${item.name}${item.type==='WEAPON' && item.weaponStyle ? ` (${WEAPON_STYLE_LABELS[item.weaponStyle]||''})` : ''}</span>
            <span style="color:#94a3b8; font-size:10px; margin-left:4px;">(${statText})</span>
          </div>
          <button class="mini-btn btn-up-equipped" data-slot="${slotDef.key}" style="background:#f59e0b; color:#0b0d14; font-size:10px; padding:2px 6px;">🔨 強化 [${cost}G]</button>
        </div>`;
    };

    const pTankPct = Math.round((this.player.hitGrowthPct || 0) * 1000) / 10;
    const pWpn = this.equipped && this.equipped.weapon;
    const pStyle = weaponStyleOf(pWpn);
    const pMast = masteryPctDisplay(this.player.weaponMastery, pStyle);
    const mastBits = WEAPON_STYLES.map(st => {
      const pct = masteryPctDisplay(this.player.weaponMastery, st);
      const mark = st === pStyle ? '●' : '';
      return `${WEAPON_STYLE_ICONS[st]}${WEAPON_STYLE_LABELS[st]}${mark}${pct}%`;
    }).join(' ');
    const meleeMast = MELEE_STYLES.map(st => {
      const pct = masteryPctDisplay(this.player.weaponMastery, st);
      const mark = st === pStyle ? '●' : '';
      return `${WEAPON_STYLE_ICONS[st]}${WEAPON_STYLE_LABELS[st]}${mark}${pct}%`;
    }).join(' ');
    const rangedMast = RANGED_STYLES.map(st => {
      const pct = masteryPctDisplay(this.player.weaponMastery, st);
      const mark = st === pStyle ? '●' : '';
      return `${WEAPON_STYLE_ICONS[st]}${WEAPON_STYLE_LABELS[st]}${mark}${pct}%`;
    }).join(' ');
    playerEquipBox.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: #ffaa00; margin-bottom: 6px;">【隊長装備（全7部位）】(鍛冶屋で強化可能)</div>
      <div style="font-size: 9.5px; color: #7dd3fc; margin-bottom: 4px;">隊長は職制限なし — 剣/槍/鎚/弓/クロスボウ/火砲を自由装備</div>
      <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px; line-height: 1.45;">
        💪被弾鍛錬 HP+${pTankPct}%（上限${Math.round(HIT_GROWTH_SOFT_CAP*100)}%）<br/>
        ⚔️近接熟練 ${meleeMast}<br/>
        🏹遠隔熟練 ${rangedMast}<br/>
        <span style="color:#67e8f9;">剣/槍/鎚熟練＝ATK+攻撃速度　弓/石弓熟練＝ATK+リロード短縮　火砲熟練＝爆発半径+リロード短縮</span>
      </div>
      ${slotsConfig.map(s => renderEquipRow(s)).join('')}
    `;

    // 装備中アイテムの強化イベント
    playerEquipBox.querySelectorAll('.btn-up-equipped').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotKey = btn.dataset.slot;
        const item = eq[slotKey];
        if (item) this.upgradeItem(item);
      });
    });

    const invList = document.getElementById('inventory-list');
    this.renderSaleToolbar(invList);
    if (!this.inventory || this.inventory.length === 0) {
      invList.innerHTML = '<div style="font-size: 11px; color: #64748b; text-align: center; padding: 8px;">バッグは空です (敵討伐や横取り😈で装備入手)</div>';
    } else {
      invList.innerHTML = '';
      [...this.inventory].sort(compareEquipmentStrength).forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'inventory-card';
        itemRow.dataset.itemId=item.id;
        itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 5px 6px; border-bottom: 1px solid #23273c; font-size: 11px;';
        
        const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;
        const curEquipped = eq[slotKey];
        itemRow.dataset.slot = slotKey || '';
        itemRow.dataset.improves = String(compareEquipment(item, curEquipped).changes.some(change => change.delta > 0));
        const isEquipped = curEquipped && curEquipped.id === item.id;
        const canInherit = curEquipped && !isEquipped && (curEquipped.upgrade || 0) > (item.upgrade || 0);
        const upCost = this.getUpgradeCost(item);

        const st = item.stats || {};
        let statParts = [];
        if (st.atk) statParts.push(`+${st.atk}攻`);
        if (st.def) statParts.push(`+${st.def}防`);
        if (st.hp) statParts.push(`+${st.hp}HP`);
        if (st.speed) statParts.push(`+${st.speed}速`);
        if (item.forgeTag) statParts.push(item.forgeTag);
        if (item.rollMult != null && Number(item.rollMult) !== 1) statParts.push(`ドロップランダム補正×${Number(item.rollMult).toFixed(2)}`);
        if(item.qualityLabel)statParts.push(item.qualityLabel);
        if(item.dropOnly)statParts.push(`🎖 ドロップ限定・非売品：${dropExclusiveLabel(item)}`);
        const statText = statParts.join(' ');
        const forgeClass = item.forgeTag === '神鍛' ? 'forge-tag-god' : (item.forgeTag === '異質' ? 'forge-tag-anomalous' : '');

        itemRow.innerHTML = `
          <div>
            <span class="${forgeClass}" style="color: ${item.color}; font-weight: bold;">[T${item.tier}] ${item.name}</span>
            <span style="font-size: 10px; color: #94a3b8; margin-left: 3px;">(${statText})</span>
          </div>
          <div style="display:flex; gap:3px; align-items:center;">
            <button class="mini-btn btn-up-inv" style="background:#f59e0b; color:#0b0d14; font-size:10px; padding:2px 5px;">🔨 [${upCost}G]</button>
            ${isEquipped ? '<span style="color: #00ffaa; font-size: 10px;">装備中</span>' : `
              <button class="mini-btn equip-btn" style="font-size:10px; padding:2px 5px;" title="現在の装備と交換（旧装備はバッグに残ります）">装備</button>
              ${canInherit ? `<button class="mini-btn inherit-btn" style="background:linear-gradient(135deg, #7c3aed, #9333ea); color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border:1px solid #c084fc; border-radius:4px;" title="現在装備の強化値(+${curEquipped.upgrade})を引き継いで乗り換え（※古い装備は消滅します）">✨+${curEquipped.upgrade}引継(旧装備消滅)</button>` : ''}
            `}
          </div>
        `;

        const equipBtn = itemRow.querySelector('.equip-btn');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.equipItem(item, false);
            this.renderStrategyUI();
          });
        }
        const inheritBtn = itemRow.querySelector('.inherit-btn');
        if (inheritBtn) {
          inheritBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const curName = curEquipped ? curEquipped.name : '現在装備';
            const confirmed = window.confirm(
              `【強化値引き継ぎ・装備乗り換え】\n\n` +
              `現在装備「${curName}」の強化値(+${curEquipped.upgrade})を「${item.name}」へ引き継いで装備します。\n\n` +
              `⚠️注意：引き継ぎ元の「${curName}」は消滅します。\n本当に乗り換えますか？`
            );
            if (!confirmed) return;
            this.equipItem(item, true);
            this.renderStrategyUI();
          });
        }
        const upBtn = itemRow.querySelector('.btn-up-inv');
        if (upBtn) {
          upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.upgradeItem(item);
          });
        }
        if(SLOT_INFO[item.type]) {
          const comparison=compareEquipment(item,curEquipped);
          const note=document.createElement('div');note.className='equipment-comparison '+comparison.kind;
          if(isEquipped){
            note.textContent='隊長装備中';
          } else {
            note.innerHTML=`<div class="equip-cmp-head">隊長の現装備比：<strong>${comparison.label}</strong></div><div class="stat-delta-block">${comparison.html}</div>`;
          }
          itemRow.firstElementChild.append(note);
          if(canInherit) {
            const preview=structuredClone(item);applyUpgradeStats(preview,curEquipped.upgrade);
            const inherited=compareEquipment(preview,curEquipped);
            if(inherited.changes.some(change => change.delta > 0)) itemRow.dataset.improves = 'true';
            const extra=document.createElement('div');extra.className='equipment-comparison '+inherited.kind;
            extra.innerHTML=`<div class="equip-cmp-head"><span style="color:#c084fc; font-weight:bold;">✨+${curEquipped.upgrade}引継後：</span><strong>${inherited.label}</strong> <span style="color:#f87171; font-size:9.5px; font-weight:bold;">(※古い装備は消滅)</span></div><div class="stat-delta-block">${inherited.html}</div>`;
            itemRow.firstElementChild.append(extra);
          }
          this.renderSaleControls(itemRow,item);
        }
        invList.appendChild(itemRow);
      });
    }

    const squadList = document.getElementById('squad-roster-list');
    const alive = this.squad.filter(s => !s.dead);
    squadList.innerHTML = '';

    // 国庫寄付UI（所持金スケール）＋部隊管理サブタブ
    this.refreshDonateAmountSelect?.();
    const globalFundSelect = document.getElementById('select-global-fund-amount');
    if (globalFundSelect) {
      globalFundSelect.onchange = (e) => {
        this.globalFundAmount = e.target.value;
        this._donateUserPicked = true;
        document.querySelectorAll('.select-soldier-fund').forEach(sel => { sel.value = this.globalFundAmount; });
      };
    }
    const donateBtn = document.getElementById('btn-donate-treasury');
    if (donateBtn) {
      donateBtn.onclick = () => {
        const amt = globalFundSelect ? globalFundSelect.value : (this.globalFundAmount || String(defaultDonateAmount(this.gold || 0)));
        this.donateToTreasury(amt);
      };
    }
    const treasLine = document.getElementById('treasury-status-line');
    if (treasLine) {
      const sug = defaultDonateAmount(this.gold || 0);
      treasLine.textContent = `国庫残高: ${(this.treasury || 0).toLocaleString()}G · 共有箱 ${(this.sharedEquipBox || []).length}件 · 軍資金 ${(this.gold || 0).toLocaleString()}G · 推奨寄付 ${sug.toLocaleString()}G`;
    }
    const stratTreas = document.getElementById('strat-treasury');
    if (stratTreas) stratTreas.textContent = `${(this.treasury || 0).toLocaleString()}`;

    // 国家運営パネル：大目標・財政
    const nq = document.getElementById('nation-quest-panel');
    if (nq) {
      const q = this.currentQuest;
      if (q) {
        nq.innerHTML = `<div style="font-size:11px;line-height:1.45;background:rgba(0,0,0,0.25);border:1px solid #334155;border-radius:8px;padding:8px;margin-bottom:8px;"><div style="color:#fde68a;font-weight:bold;margin-bottom:2px;">📜 大目標（司令部軍令）</div><div style="color:#e2e8f0;">${q.title || ''}</div><div style="color:#94a3b8;">${q.completed ? '達成済' : (q.desc || '')}</div><div style="color:#67e8f9;margin-top:2px;">報奨 ${q.rewardGold || 0}G / 武勲 ${q.rewardExp || 0}</div></div>`;
      } else nq.innerHTML = '';
    }
    const nf = document.getElementById('nation-fiscal-panel');
    this.renderNationStatus();this.refreshInvasionUI();
    if (nf) nf.innerHTML = formatFiscalReportHtml(this.lastFiscalReport) || '<div style="font-size:11px;color:#64748b;margin-bottom:8px;">財政報告は作戦期終了後に更新されます。</div>';

    const econTab = this.rosterManageTab || 'roster';
    const showEcon = (name) => {
      this.rosterManageTab = name;
      if (typeof this._syncTroopsSubView === 'function') this._syncTroopsSubView(name);
      else {
        ['roster', 'scout', 'equip', 'invest', 'box'].forEach((n) => {
          const btn = document.getElementById(`tab-econ-${n}`);
          if (btn) btn.classList.toggle('active', n === name);
        });
        const scout = document.getElementById('view-econ-scout');
        const equip = document.getElementById('view-strat-equip');
        if (scout) scout.classList.toggle('hidden', name !== 'scout');
        if (equip) equip.classList.toggle('hidden', name !== 'equip');
        const rosterList = document.getElementById('squad-roster-list');
        if (rosterList) rosterList.style.display = (name === 'roster' || name === 'scout') ? '' : (name === 'equip' ? 'none' : '');
      }
    };
    ['roster', 'scout', 'equip'].forEach((n) => {
      const btn = document.getElementById(`tab-econ-${n}`);
      if (btn) btn.onclick = () => { showEcon(n); if (n === 'scout' && !(this.scoutCandidates || []).length) { this.refreshScoutCandidates(); this.renderStrategyUI(); } };
    });
    showEcon(econTab);

    // スカウト候補描画
    const scoutList = document.getElementById('scout-candidates-list');
    if (scoutList) {
      if (!(this.scoutCandidates || []).length) this.refreshScoutCandidates();
      scoutList.innerHTML = '';
      (this.scoutCandidates || []).forEach((c) => {
        const talent = TALENTS[c.talent] || TALENTS.AVERAGE;
        const cls = SOLDIER_CLASSES[c.classKey] || SOLDIER_CLASSES.HEAVY;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);border-radius:6px;padding:6px;margin-bottom:4px;';
        row.innerHTML = `<div>${cls.icon}<strong>${cls.name}</strong> Lv.${c.level} <span style="color:${talent.color};">[${talent.tag}]</span> · <span style="color:#fde047;font-weight:bold;">${c.cost.toLocaleString()}G</span></div>
          <div style="display:flex;gap:4px;">
            <button type="button" class="mini-btn btn-scout-main" style="background:#0369a1;color:#fff;font-size:10px;padding:3px 6px;">本隊へ</button>
            <button type="button" class="mini-btn btn-scout-personal" style="background:#a16207;color:#fff;font-size:10px;padding:3px 6px;">自部隊へ</button>
          </div>`;
        row.querySelector('.btn-scout-main').onclick = () => this.scoutSoldier(c.id, 'main');
        row.querySelector('.btn-scout-personal').onclick = () => this.scoutSoldier(c.id, 'personal');
        scoutList.appendChild(row);
      });
    }
    const refreshScoutsBtn = document.getElementById('btn-refresh-scouts');
    if (refreshScoutsBtn) refreshScoutsBtn.onclick = () => {
      const hasGenius = (this.scoutCandidates || []).some((c) => c.talent === 'GENIUS');
      if (hasGenius) {
        const ok = window.confirm('天才が募集してきてますが切り替えますか？');
        if (!ok) return; // cancel: keep current roster
      }
      this.refreshScoutCandidates();
      this.renderStrategyUI();
    };

    // 共有ボックス一覧
    const boxList = document.getElementById('shared-box-list');
    if (boxList) {
      const box = this.sharedEquipBox || [];
      if (!box.length) boxList.innerHTML = '<div style="color:#64748b;text-align:center;padding:8px;">共有ボックスは空です</div>';
      else {
        boxList.innerHTML = box.slice(0, 40).map((it) =>
          `<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #1e293b;"><span style="color:${it.color || '#94a3b8'};">[T${it.tier}] ${it.name}</span> · 買取相当${calcBuyoutGold(it)}G</div>`
        ).join('') + (box.length > 40 ? `<div style="color:#64748b;">…他${box.length - 40}件</div>` : '');
      }
    }

    const currentRank = RANKS[this.rankIndex];
    const maxGuards = currentRank ? Math.min(currentRank.personalGuards || 0, PERSONAL_GUARD_MAX) : 0;
    const isMySquadSoldier = (s) => this.isPersonalSquadSoldier(s);

    const mySquad = alive.filter(s => isMySquadSoldier(s));
    const otherSquad = alive.filter(s => !isMySquadSoldier(s));
    const curFilter = this.rosterFilter || 'all';

    // フィルタータブバー
    const filterBar = document.createElement('div');
    filterBar.className = 'roster-filter-bar';
    filterBar.innerHTML = `
      <button type="button" class="roster-filter-btn ${curFilter === 'all' ? 'active' : ''}" data-filter="all">すべて (${alive.length}名)</button>
      <button type="button" class="roster-filter-btn ${curFilter === 'my' ? 'active' : ''}" data-filter="my">${maxGuards > 0 ? '👑 自小隊' : '⚔️ 自小隊'} (${mySquad.length}名)</button>
      <button type="button" class="roster-filter-btn ${curFilter === 'other' ? 'active' : ''}" data-filter="other">他小隊 (${otherSquad.length}名)</button>
    `;
    filterBar.querySelectorAll('.roster-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.rosterFilter = e.currentTarget.dataset.filter;
        this.updateStrategyModal();
      });
    });
    squadList.appendChild(filterBar);

    const createSoldierCard = (s) => {
      const row = document.createElement('div');
      const isNamed = s.isNamed;
      const isDown = s.isDown;
      const clsKey = s.soldierClass || 'HEAVY';
      const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;
      const platoon = this.platoons ? this.platoons[s.platoonId % 3] : null;
      const pColor = platoon ? platoon.color : '#38bdf8';
      const pName = platoon ? platoon.name : '小隊';

      row.style.cssText = `background: ${isDown ? 'rgba(239, 68, 68, 0.1)' : (isNamed ? 'rgba(255, 170, 0, 0.08)' : 'rgba(255, 255, 255, 0.02)')}; border-radius: 8px; padding: 7px; margin-bottom: 6px; border: 1px solid ${isDown ? '#ef4444' : (isNamed ? '#ffaa00' : '#23273c')};`;

      const eq = s.equipped || {};
      const talentKey = s.talent || 'AVERAGE';
      const talent = TALENTS[talentKey] || TALENTS.AVERAGE;
      const deathSkills = s.deathlineSkills || [];
      const survivedDl = s.survivedDeathlines || 0;

      const canHonor = !isNamed && s.survivedWaves >= 2;
      const wItem = s.equipped && s.equipped.weapon ? s.equipped.weapon : s.weapon;
      const wUpCost = wItem ? this.getUpgradeCost(wItem) : 0;
      const hasWUpBudget = wItem && (s.gold || 0) >= wUpCost;
      const fundVal = this.globalFundAmount || String(defaultDonateAmount(this.gold || 0));

      const platoonMatch = String(pName || '').match(/^(.+?)\s*[（(]\s*(.+?)\s*[）)]/);
      const platoonShort = platoonMatch ? platoonMatch[1].trim() : String(pName || '小隊').split(' ')[0];
      const platoonDoctrine = platoonMatch ? platoonMatch[2].trim() : '';
      const platoonLabelHtml = platoonDoctrine
        ? `[${platoonShort}] <span style="color:#64748b;font-weight:normal;">小隊方針:${platoonDoctrine}</span>`
        : `[${platoonShort}]`;

      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; margin-bottom: 3px;">
          <span>
            ${isNamed ? '👑' : (s.bossKills > 0 ? '⭐' : cls.icon)} 
            <strong style="color: ${isNamed ? '#ffe600' : (s.bossKills > 0 ? '#38bdf8' : '#fff')};">${isNamed ? `${s.title}${s.name}` : s.name}</strong> 
            <span style="color:${talent.color}; font-size: 10px; font-weight: bold; margin-left: 2px; background: rgba(0,0,0,0.3); border-radius: 3px; padding: 0 3px;" title="${talent.desc}">[${talent.tag}]</span>
            <span style="color:${pColor}; font-size: 10px; margin-left: 2px;">${platoonLabelHtml}</span>
            <span style="color:#00f0ff; font-size: 10px;">[Lv.${s.level || 1} ${cls.name}]</span>
            <span style="color:#b7c6a4; font-size:10px;">経験${s.survivedWaves || 0}戦線 / 今期${participated(s)?'参加':'未参加'}</span>
            ${s.isPersonalGuard ? '<span style="color:#fef08a; font-weight:bold; font-size:10px;">[⭐直属]</span>' : ''}
            ${s.isVeteran ? '<span style="color:#fbbf24; font-size:9px;">(先輩)</span>' : ''}
            ${(s.bossKills || 0) > 0 ? `<span style="color:#38bdf8; font-weight:bold; font-size:9.5px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.4); border-radius:3px; padding:0 3px;" title="ボス討伐履歴: ${s.bossKills}体">[👑ボス討伐×${s.bossKills}]</span>` : ''}
            ${survivedDl > 0 ? `<span style="color:#f87171; font-size:9.5px; font-weight:bold;" title="死線生還数: ${survivedDl}回">[💀生還×${survivedDl}]</span>` : ''}
            ${isDown ? '<span style="color:#ef4444; font-weight:bold;">[🆘負傷ダウン]</span>' : ''}
          </span>
          <span style="font-size: 10px;">💰 <strong style="color:#ffe600;">${(s.gold || 0).toLocaleString()}G</strong> | <span title="雑魚討伐数">⚔️${s.minionKills || 0}</span> <span title="ボス討伐履歴: ${s.bossKills || 0}体" style="color:${(s.bossKills || 0) > 0 ? '#38bdf8' : '#94a3b8'}; font-weight:${(s.bossKills || 0) > 0 ? 'bold' : 'normal'};">👑${s.bossKills || 0}</span></span>
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 3px; display: flex; justify-content: space-between; align-items:center;">
          <span>HP: <strong style="color:${s.hp < s.maxHp ? '#f87171' : '#34d399'};">${Math.floor(s.hp)}</strong>/${s.maxHp} | 🛡️ DEF: <strong style="color:#38bdf8;">${s.def || 0}</strong> | ATK: ${s.atk} ${clsKey === 'MEDIC' ? `| 💚回復: <strong style="color:#34d399;">${s.healPower || 26}HP</strong>` : ''}</span>
          ${wItem ? `<span style="color:${wItem.color}; font-weight:bold;">[${wItem.name}]</span>` : '<span style="color:#666;">[支給短剣]</span>'}
        </div>
        <div style="font-size: 9.5px; color: #7c8a9a; margin-bottom: 3px;">
          ${WEAPON_STYLE_ICONS[s.favoriteWeapon] || '🗡️'}得意:${WEAPON_STYLE_LABELS[s.favoriteWeapon] || '剣'}
          · 💪被弾+${Math.round((s.hitGrowthPct || 0) * 1000) / 10}%HP
          · ⚔️熟練 ${WEAPON_STYLES.map(st => `${WEAPON_STYLE_LABELS[st]}${masteryPctDisplay(s.weaponMastery, st)}%`).join('/')}
        </div>
        ${deathSkills.length > 0 ? `
          <div style="margin-top: 2px; margin-bottom: 4px; font-size: 9.5px; display: flex; gap: 3px; flex-wrap: wrap; align-items: center;">
            <span style="color: #f87171; font-weight: bold;">💀死線覚醒:</span>
            ${deathSkills.map(skId => {
              const sk = DEATHLINE_SKILLS[skId];
              return sk ? `<span style="background: rgba(239,68,68,0.18); border: 1px solid ${sk.color}; color: ${sk.color}; border-radius: 3px; padding: 0 4px;" title="${sk.desc}">${sk.icon} ${sk.name}</span>` : '';
            }).join('')}
          </div>
        ` : ''}
        <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
          ${isMySquadSoldier(s) ? `
          <div style="display: flex; align-items: center; gap: 2px;">
            <select class="mini-select select-soldier-fund select-fund-${s.id}" style="font-size: 10px; background: #0f172a; color: #fde047; border: 1px solid #0284c7; border-radius: 4px; padding: 2px 3px; font-weight: bold;">
              <option value="100" ${fundVal === '100' ? 'selected' : ''}>100G</option>
              <option value="1000" ${fundVal === '1000' ? 'selected' : ''}>1千G</option>
              <option value="10000" ${fundVal === '10000' ? 'selected' : ''}>1万G</option>
              <option value="50000" ${fundVal === '50000' ? 'selected' : ''}>5万G</option>
              <option value="100000" ${fundVal === '100000' ? 'selected' : ''}>10万G</option>
              <option value="500000" ${fundVal === '500000' ? 'selected' : ''}>50万G</option>
              <option value="1000000" ${fundVal === '1000000' ? 'selected' : ''}>100万G</option>
              <option value="max" ${fundVal === 'max' ? 'selected' : ''}>全額</option>
            </select>
            <button class="mini-btn btn-fund" style="background: #0284c7; color: #fff; font-size: 10px; font-weight: bold; padding: 3px 6px;" title="自部隊への個別援助（兵士は自主強化）">
              💰 自部隊援助
            </button>
          </div>` : `<span style="font-size:9.5px;color:#64748b;">本隊は国庫配分のみ</span>`}
          ${maxGuards > 0 && !(this.reserves || []).includes(s) ? (
            s.isPersonalGuard
              ? `<button type="button" class="mini-btn btn-return-main" style="background:#334155;color:#e2e8f0;font-size:10px;padding:3px 6px;" title="直属を解除して本隊へ">🏰 本隊へ戻す</button>`
              : `<button type="button" class="mini-btn btn-pull-personal" style="background:#a16207;color:#fff;font-size:10px;padding:3px 6px;font-weight:bold;" title="本隊から自部隊（直属）へ引き抜く">⭐ 自部隊へ引き抜</button>`
          ) : ''}
          <button class="mini-btn btn-soldier-detail" style="background:#1e3a5f;color:#93c5fd;font-size:10px;padding:3px 6px;" title="個人詳細">📋 詳細</button>
          <button class="mini-btn btn-dismiss" style="background:#7f1d1d;color:#fecaca;font-size:10px;padding:3px 6px;" title="放逐（一部返還）">🚪 放逐</button>
          ${cls.advancedClassId && SOLDIER_CLASSES[cls.advancedClassId] ? (() => {
            const next = SOLDIER_CLASSES[cls.advancedClassId];
            const cost = classUpCostForNext(cls);
            const costJa = formatClassUpCostJa(cost);
            const tierJa = CLASS_TIER_LABELS[classTierOf(next)] || '上位職';
            return `
            <button class="mini-btn btn-class-up" style="background:linear-gradient(135deg, #f59e0b, #ec4899); color:#fff; font-size:10px; font-weight:bold; box-shadow:0 0 6px rgba(245,158,11,0.5);" title="${tierJa}【${next.name}】へ覚醒（${costJa}）">
              🔱 ${tierJa}【${next.name}】へ！(${costJa})
            </button>`;
          })() : ''}
          ${wItem ? `
            <button class="mini-btn btn-soldier-up" style="background:${hasWUpBudget ? '#10b981' : '#4b5563'}; color:#fff; font-size:10px;" title="兵士が自費で武器を強化">
              🔨 武器自費強化 [${wUpCost}G]
            </button>
          ` : ''}
        </div>
      `;

      const portrait = document.createElement('canvas');
      portrait.className = 'soldier-portrait'; portrait.width = 88; portrait.height = 112;
      portrait.setAttribute('aria-label', `${cls.name} ${s.name}`);
      const pc = portrait.getContext('2d');
      if(pc)drawSoldierPortrait(pc,s,portrait.width,portrait.height,{compact:true});
      row.classList.add('soldier-card'); row.prepend(portrait);
      const maintenanceNote=document.createElement('p');maintenanceNote.className='maintenance-summary';
      const m=s.lastMaintenance;
      maintenanceNote.textContent=m?`第${m.phase}期の整備：強化${m.count}回 / ${m.spent}G · ${m.status}`:'次のラウンド開始前に所持金で自動整備（定期給与20G）';
      row.append(maintenanceNote);
      const transportNote=document.createElement('p');transportNote.className='maintenance-summary';
      const cargo=carriedSoldiers(this,s),carrier=s.carrierId?carrierOf(this,s):null;
      transportNote.textContent=s.isDown?(carrier?`搬送中：${carrier===this.player?'隊長':carrier.name} · 救護所・町・拠点到着で復活`:`負傷：救助猶予${Math.ceil(s.downTimer||0)}秒 · 搬送か衛生兵の処置が必要`):`搬送 ${cargo.length}/${carryingCapacity(s)}名${cargo.length?' · 拠点へ帰還中':''}`;
      row.append(transportNote);
      this.renderSoldierEquipment(row,s);

      const fundBtn = row.querySelector('.btn-fund');
      if (fundBtn) {
        fundBtn.addEventListener('click', () => {
          const fundSel = row.querySelector(`.select-fund-${s.id}`);
          const amt = fundSel ? fundSel.value : (this.globalFundAmount || '10000');
          this.fundSoldier(s.id, amt);
        });
      }

      const dismissBtn = row.querySelector('.btn-dismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => this.dismissSoldier(s.id));
      }

      const pullBtn = row.querySelector('.btn-pull-personal');
      if (pullBtn) {
        pullBtn.addEventListener('click', () => this.assignToPersonalSquad(s.id));
      }
      const returnBtn = row.querySelector('.btn-return-main');
      if (returnBtn) {
        returnBtn.addEventListener('click', () => this.returnToMainForce(s.id));
      }

      const detailBtn = row.querySelector('.btn-soldier-detail');
      if (detailBtn) {
        detailBtn.addEventListener('click', () => this.openSoldierDetail(s.id));
      }

      const classUpBtn = row.querySelector('.btn-class-up');
      if (classUpBtn) {
        classUpBtn.addEventListener('click', () => {
          this.promoteSoldier(s.id);
        });
      }

      const honorBtn = row.querySelector('.btn-honor');
      if (honorBtn) {
        honorBtn.addEventListener('click', () => {
          this.grantSoldierHonor(s.id);
        });
      }

      const sUpBtn = row.querySelector('.btn-soldier-up');
      if (sUpBtn) {
        sUpBtn.addEventListener('click', () => {
          this.upgradeSoldierEquip(s.id, 'weapon');
        });
      }

      return compactSoldierCard(this, row, s, cls, pName, talent);
    };

    const appendCategorySection = (title, count, desc, soldiers, isMy) => {
      const header = document.createElement('div');
      header.className = `roster-category-header ${isMy ? 'my-squad' : 'other-squad'}`;
      header.innerHTML = `<span>${title}</span><span class="roster-category-count">${count}名</span>`;
      squadList.appendChild(header);

      if (desc) {
        const descEl = document.createElement('div');
        descEl.className = 'roster-category-desc';
        descEl.textContent = desc;
        squadList.appendChild(descEl);
      }

      if (soldiers.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'font-size: 11px; color: #64748b; padding: 10px; text-align: center; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 8px;';
        emptyMsg.textContent = '現在、該当する所属兵士はいません';
        squadList.appendChild(emptyMsg);
      } else {
        soldiers.forEach(s => {
          squadList.appendChild(createSoldierCard(s));
        });
      }
    };

    const myTitle = maxGuards > 0 ? '👑 隊長直属小隊（随伴親衛隊）' : '⚔️ 所属小隊（第1小隊 前衛突撃隊）';
    const myDesc = maxGuards > 0 ? `隊長に付き従って最前線を切り拓く精鋭部隊（定員 ${maxGuards}名）` : 'プレイヤーが所属する最前線小隊（昇進すると隊長直属の親衛隊を率いられます）';

    const otherTitle = maxGuards > 0 ? '🏰 本隊・広域作戦隊（第1〜第3小隊）' : '🛡️ それ以外の小隊（第2・第3小隊）';
    const otherDesc = maxGuards > 0 ? '広域の拠点を制圧・防衛し独自に作戦行動を行う主力部隊' : '別方面の防衛・迎撃を担当する友軍小隊';

    if (curFilter === 'all' || curFilter === 'my') {
      appendCategorySection(myTitle, mySquad.length, myDesc, mySquad, true);
    }
    if (curFilter === 'all' || curFilter === 'other') {
      appendCategorySection(otherTitle, otherSquad.length, otherDesc, otherSquad, false);
    }
    refreshInterface(this, { rank: currentRank, time, zone });
    this.refreshInvasionUI();
    if(scrollBody)scrollBody.scrollTop=scrollTop;
    if (typeof keepDetailId !== 'undefined' && keepDetailId) {
      const still = [...(this.squad||[]),...(this.reserves||[])].some(x => x && x.id === keepDetailId);
      if (still) this.openSoldierDetail(keepDetailId);
      else this.closeSoldierDetail();
    }
  },

  spawnDamageText(x, y, text, color) {
    if (this.damageTexts.length >= DAMAGE_TEXT_CAP) {
      this.damageTexts[0] = this.damageTexts[this.damageTexts.length - 1];
      this.damageTexts.pop();
    }
    this.damageTexts.push({ x, y, text: String(text), color, life: 0.6 });
  },

  pushParticle(p) {
    if (this.particles.length >= PARTICLE_CAP) {
      this.particles[0] = this.particles[this.particles.length - 1];
      this.particles.pop();
    }
    this.particles.push(p);
  },

  spawnSparks(x, y, color, count) {
    const room = Math.max(0, PARTICLE_CAP - this.particles.length);
    // v1.24.1: hard cap sparks per burst (was up to 8/room)
    const n = Math.min(count | 0, 5, room > 0 ? room : 3);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 140 + 40;
      this.pushParticle({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        size: Math.random() * 3 + 2,
        life: 0.35
      });
    }
  },

  showToast(msg) {
    recordBattleLog(this,msg);
  },

  render() {
    if (!frameSurfaceReady(this)) throw new Error('Canvasの描画面が利用できません');
    if (!Number.isFinite(this.zoom) || this.zoom <= 0) this.zoom = 1;
    const boundW = this.currentDungeon?.width || WORLD_SIZE, boundH = this.currentDungeon?.height || WORLD_SIZE;
    if (this.player) {
      if (!Number.isFinite(this.player.x)) this.player.x = this.currentDungeon ? 180 : BASE_CAMP.x - 20;
      if (!Number.isFinite(this.player.y)) this.player.y = this.currentDungeon ? boundH / 2 : BASE_CAMP.y - 20;
      this.player.x = Math.max(16, Math.min(boundW - 16, this.player.x));
      this.player.y = Math.max(16, Math.min(boundH - 16, this.player.y));
    }
    if (!this.camera || !Number.isFinite(this.camera.x) || !Number.isFinite(this.camera.y)) {
      this.camera = { x: this.player?.x ?? BASE_CAMP.x, y: this.player?.y ?? BASE_CAMP.y };
    }
    const halfW = this.width / (2 * this.zoom), halfH = this.height / (2 * this.zoom);
    this.camera.x = Math.max(Math.min(halfW,boundW/2), Math.min(Math.max(boundW-halfW,boundW/2),this.camera.x));
    this.camera.y = Math.max(Math.min(halfH,boundH/2), Math.min(Math.max(boundH-halfH,boundH/2),this.camera.y));
    this.drawScene();
  },

  drawScene() {
    const now = performance.now();
    this.ctx.clearRect(0, 0, this.width, this.height);

    const z = this.zoom || 1.0;
    const view=viewport(this.camera,this.width,this.height,z,150);
    const inView=(o,r=80)=>circleInView(o.x,o.y,r,view);
    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 18 : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 18 : 0;
    this.ctx.save();
    try {
    this.ctx.translate(this.width / 2 + shakeX, this.height / 2 + shakeY);
    this.ctx.scale(z, z);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 1. ダンジョンインスタンス描画、または通常フィールド描画
    if (this.currentDungeon) {
      this.worldObjs = [];
      drawDungeonEnvironment(this.ctx, this.currentDungeon, this.camera, this.width, this.height, z, now * 0.001);
      if(this.currentDungeon.kind==='town'){drawNationalDevelopment(this.ctx,this,this.currentDungeon.width*.62,this.currentDungeon.height*.5,true);drawTownMedicalReception(this.ctx,this.currentDungeon);drawFortification(this.ctx,this);}
      if (this.dungeonVault) {
        drawDungeonVault(this.ctx, this.dungeonVault, now * 0.001);
      }
    } else {
      // 1. 大地・戦場フィールド
      this.drawBattlefield(this.ctx, now);
      drawHazards(this.ctx,this,view);
      for(const post of this.medicalPosts||[])if(inView(post,160))drawMedicalPost(this.ctx,post);

      // 2. 自軍砦本陣 (治癒砦・城塞壁・風になびく王国旗)
      if(inView(BASE_CAMP,460)){drawFortification(this.ctx,this);this.drawBaseCamp(this.ctx, now);}

      // 2.5 戦場の探索拠点 (敵前線砦・捕虜の檻・古代祭壇・補給集積所)
      if (this.outposts) {
        for (const op of this.outposts) {
          if(inView(op,(op.radius||40)+100))this.drawOutpost(this.ctx, op, now);
        }
      }

      // 2.8 フィールド上のダンジョン入口ポータル
      if (this.dungeons) {
        const reach = Math.max(this.width, this.height) / z + 220;
        for (const d of this.dungeons) {
          if (Math.hypot(d.entrance.x - this.camera.x, d.entrance.y - this.camera.y) > reach) continue;
          drawDungeonEntrance(this.ctx, d, now * 0.001, this.nearDungeon === d);
        }
      }

    }

    drawMagicBursts(this.ctx,this);
    drawRescueDirection(this.ctx,this,rescueUnits(this).some(u=>u.isDown&&!u.dead&&u.carrierId)||(this.civilians||[]).some(u=>!u.rescued&&u.carrierId));
    // 搬送役と負傷者／民間人を結ぶ紐。
    this.ctx.save();this.ctx.strokeStyle='#b0a07c';this.ctx.lineWidth=1.6;
    for(const wounded of rescueUnits(this)) {
      if(!wounded.isDown||wounded.dead||!wounded.carrierId)continue;
      const carrier=carrierOf(this,wounded);if(!carrier||carrier.isDown||carrier.dead)continue;
      this.ctx.beginPath();this.ctx.moveTo(carrier.x,carrier.y-4);
      this.ctx.quadraticCurveTo((carrier.x+wounded.x)/2,(carrier.y+wounded.y)/2+7,wounded.x,wounded.y-2);this.ctx.stroke();
    }
    this.ctx.strokeStyle='#7dd3fc';this.ctx.lineWidth=1.4;
    for(const civ of this.civilians||[]) {
      if(!civ||civ.rescued||!civ.carrierId)continue;
      const carrier=civ.carrierId==='player'?this.player:(this.squad||[]).find(s=>s.id===civ.carrierId);
      if(!carrier||carrier.dead)continue;
      this.ctx.beginPath();this.ctx.moveTo(carrier.x,carrier.y-4);
      this.ctx.quadraticCurveTo((carrier.x+civ.x)/2,(carrier.y+civ.y)/2+6,civ.x,civ.y-2);this.ctx.stroke();
    }
    this.ctx.restore();
    // 3. ドロップ宝箱
    for (const drop of this.dropsOnField) {
      if(inView(drop,50))this.drawChest(this.ctx, drop, now);
    }

    // One depth queue (reuse buffer; no per-item closures → less GC).
    const renderList = this._renderList || (this._renderList = []);
    renderList.length = 0;
    const margin = 150, halfW = this.width / (2 * z), halfH = this.height / (2 * z);
    const camX = this.camera.x, camY = this.camera.y;
    const visX = halfW + margin, visY = halfH + margin;
    const visible = (o) => Math.abs(o.x - camX) < visX && Math.abs(o.y - camY) < visY;
    for (const o of this.worldObjs || []) {
      if (visible(o)) renderList.push({ y: o.y, k: 0, ref: o });
    }
    if (this.monsters) {
      for (let i = 0; i < this.monsters.length; i++) {
        const m = this.monsters[i];
        if (visible(m)) renderList.push({ y: m.y, k: 1, ref: m });
      }
    }
    for (const remains of this.remains || []) {
      if (visible(remains)) renderList.push({ y: remains.y, k: 2, ref: remains });
    }
    if (this.squad) {
      for (let i = 0; i < this.squad.length; i++) {
        const s = this.squad[i];
        if (!s.dead && (!this.currentDungeon||inCurrentInstance(this,s)) && visible(s)) renderList.push({ y: s.y, k: 3, ref: s });
      }
    }
    if(!this.currentDungeon)for(const m of this.merchants||[]) {
      if(!m.dead&&visible(m))renderList.push({y:m.y,k:5,ref:m});
      for(const esc of m.escorts||[])if(!esc.dead&&(esc.hp>0||esc.isDown)&&visible(esc))renderList.push({y:esc.y,k:6,ref:esc});
    }
    if(this.currentDungeon)for(const npc of this._merchantWounded||[])if(inCurrentInstance(this,npc)&&visible(npc)&&!npc.isGateGuard)renderList.push({y:npc.y,k:npc.isMerchant?5:6,ref:npc});
    for(const guard of this.gateGuards||[])if(gateGuardVisible(this,guard)&&visible(guard))renderList.push({y:guard.y,k:6,ref:guard});
    for(const civ of this.civilians||[])if(!civ.rescued&&(!this.currentDungeon||civ.rescueSpace===this.currentDungeon.id)&&visible(civ))renderList.push({y:civ.y,k:7,ref:civ});
    if (this.player) renderList.push({ y: this.player.y, k: 4, ref: this.player });

    renderList.sort((a, b) => a.y - b.y);
    for (let i = 0; i < renderList.length; i++) {
      const it = renderList[i];
      if (it.k === 0) this.drawWorldObj(this.ctx, it.ref, now, false);
      else if (it.k === 1) this.drawMonster(this.ctx, it.ref, now);
      else if (it.k === 2) drawRemains(this.ctx, it.ref);
      else if (it.k === 3) this.drawSoldier(this.ctx, it.ref, now);
      else if(it.k===5)drawMerchantBody(this.ctx,it.ref);
      else if(it.k===6)drawMerchantEscort(this.ctx,it.ref,now);
      else if(it.k===7)drawFieldCivilian(this.ctx,it.ref,now);
      else this.drawPlayer(this.ctx, it.ref, now);
      if((it.k===3||it.k===4)&&!it.ref.isDown&&isRangedUnit(this,it.ref)&&ensureAmmo(it.ref)===0){this.ctx.save();this.ctx.font='bold 10px sans-serif';this.ctx.textAlign='center';this.ctx.fillStyle='#f5c278';this.ctx.fillText('要補給',it.ref.x,it.ref.y-45);this.ctx.restore();}
    }

    // 5. 矢（ARROW）＆ ヒール光弾（HEAL）
    if (this.projectiles) {
      for (const proj of this.projectiles) {
        this.drawProjectile(this.ctx, proj, now);
      }
    }

    // 7. ダメージポップアップ
    for (const dtObj of this.damageTexts) {
      this.ctx.fillStyle = dtObj.color;
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
    }

    // 7.5 パワーアタック衝撃波（SHOCKWAVES）
    if (this.shockwaves) {
      for (const sw of this.shockwaves) {
        const progress = Math.max(0, Math.min(1, 1 - (sw.life / sw.maxLife)));
        const r = sw.currentRadius + (sw.maxRadius - sw.currentRadius) * progress;
        const alpha = Math.max(0, sw.life / sw.maxLife);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
        this.ctx.strokeStyle = sw.color;
        this.ctx.globalAlpha = alpha * 0.9;
        this.ctx.lineWidth = (sw.lineWidth || 4) * (1 - progress * 0.45);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(sw.x, sw.y, r * 0.72, 0, Math.PI * 2);
        this.ctx.strokeStyle = sw.subColor || '#ffffff';
        this.ctx.globalAlpha = alpha * 0.6;
        this.ctx.lineWidth = (sw.lineWidth || 4) * 0.55;
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 8. パーティクル
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 8.2 兵士の一言フキダシ（操作を邪魔しない控えめな感情表現）
    this.dialogue?.draw(this.ctx, this.camera, this.zoom);

    // Fog of war (bit-grid fillRect; skip inside dungeons)
    // v1.25.11: camp seed + player-dark reseed; overlay gets player coords for fail-safe
    if (!this.currentDungeon) {
      const fog = this.ensureFog();
      if (fog) {
        if (!fog._campSeeded || (typeof fog.hasExploration === 'function' && !fog.hasExploration())) {
          fog.revealCamp(BASE_CAMP.x, BASE_CAMP.y);
          fog._campSeeded = true;
        }
        if (this.player && Number.isFinite(this.player.x) && Number.isFinite(this.player.y)) {
          const dark = typeof fog.isExploredWorld === 'function' && !fog.isExploredWorld(this.player.x, this.player.y);
          if (dark) this.revealFogAroundPlayer(true);
        }
        fog.drawFieldOverlay(
          this.ctx, this.camera, this.width, this.height, this.zoom || 1,
          this.player ? this.player.x : undefined,
          this.player ? this.player.y : undefined
        );
      }
    }

    } finally { this.ctx.restore(); } // カメラ復元（描画中の例外でも必ず戻す）

    // 8.5 大気（昼夜の色調・霧・ビネット）
    this.drawAtmosphere(this.ctx, now);

    // 8.6 危険地帯突入・警戒赤フラッシュ (境界越えアラート演出)
    if (this.zoneAlertFlash > 0) {
      this.ctx.save();
      const rGrad = this.ctx.createRadialGradient(this.width / 2, this.height / 2, this.width * 0.25, this.width / 2, this.height / 2, this.width * 0.72);
      rGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      rGrad.addColorStop(1, `rgba(239, 68, 68, ${Math.min(0.72, this.zoneAlertFlash * 0.72)})`);
      this.ctx.fillStyle = rGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    // 8.8 倒れた味方の画面端・方向インジケーター（矢印＆距離）
    this.drawCasualtyIndicators(this.ctx, now);

    // 9. ジョイスティックUI
    if (this.joystick && this.joystick.active) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.x - this.joystick.dirX * 20, this.joystick.y - this.joystick.dirY * 20, 36, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.x, this.joystick.y, 16, 0, Math.PI * 2);
      this.ctx.fill();
    }
  },

  drawCasualtyIndicators(ctx, now) {
    if (!this.squad || !this.player) return;
    const downedMates = rescueUnits(this).filter(s => s.isDown && !s.dead && (!this.currentDungeon||inCurrentInstance(this,s)));
    if (!downedMates.length) return;

    const z = this.zoom || 1.0;
    const cx = this.camera.x;
    const cy = this.camera.y;
    const w = this.width;
    const h = this.height;

    // 画面端の余白（HUD・ミニマップ・バーチャルパッドを避ける安全領域）
    const padL = 36;
    const padR = w - 36;
    const padT = 95;
    const padB = h - 65;

    for (const s of downedMates) {
      // 兵士のスクリーン座標
      const sx = w / 2 + (s.x - cx) * z;
      const sy = h / 2 + (s.y - cy) * z;

      // 画面内に収まっているか判定
      const onScreen = (sx >= padL && sx <= padR && sy >= padT && sy <= padB);
      if (onScreen) continue; // 画面内なら兵士本体の頭上表示が見えるので矢印は不要

      // 画面中心から負傷兵へのベクトル
      const vX = sx - w / 2;
      const vY = sy - h / 2;
      const angle = Math.atan2(vY, vX);

      // 境界矩形との交点（クランプ）
      const halfBoxW = (padR - padL) / 2;
      const halfBoxH = (padB - padT) / 2;
      const centerBoxX = (padL + padR) / 2;
      const centerBoxY = (padT + padB) / 2;

      let edgeX, edgeY;
      const tanA = Math.tan(angle);
      if (Math.abs(vX) * halfBoxH > Math.abs(vY) * halfBoxW) {
        // 左右の境界
        edgeX = vX > 0 ? padR : padL;
        edgeY = centerBoxY + (edgeX - centerBoxX) * tanA;
        edgeY = Math.max(padT, Math.min(padB, edgeY));
      } else {
        // 上下の境界
        edgeY = vY > 0 ? padB : padT;
        edgeX = centerBoxX + (edgeY - centerBoxY) / tanA;
        edgeX = Math.max(padL, Math.min(padR, edgeX));
      }

      // プレイヤーからの距離（メートル換算）
      const distM = Math.round(Math.hypot(s.x - this.player.x, s.y - this.player.y));

      // 搬送状況と緊急度
      const isBeingCarried = !!s.carrierId;
      const pulse = Math.sin(now * 0.014) > 0;
      const bgColor = isBeingCarried ? 'rgba(30, 58, 44, 0.94)' : (pulse ? '#dc2626' : '#991b1b');
      const borderColor = isBeingCarried ? '#34d399' : (pulse ? '#ffffff' : '#fca5a5');

      ctx.save();
      ctx.translate(edgeX, edgeY);

      // 1. 方向を示す三角矢印 ▲
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = borderColor;
      ctx.beginPath();
      ctx.moveTo(17, 0);       // 先端
      ctx.lineTo(4, -8);
      ctx.lineTo(7, 0);
      ctx.lineTo(4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. 丸型救護バッジ
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3. 救護十字マーク ✚
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -2.2, 14, 4.4);
      ctx.fillRect(-2.2, -7, 4.4, 14);

      // 4. 距離ラベル
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 0;
      const textY = edgeY < h - 75 ? 21 : -21;
      const labelText = isBeingCarried ? `搬送中 ${distM}m` : `${distM}m 救助!`;
      ctx.fillText(labelText, 0, textY);
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  },

  // =========================================================================
  // リッチ・プロシージャル描画システム
  // =========================================================================

  // ---- フィールド生成（起動時に1回だけ。地面は事前描画キャッシュ） ----
  buildTerrain() {
    this.worldTerrain = new WorldTerrain();
    const bx=BASE_CAMP.x,by=BASE_CAMP.y;
    this.campObjects = [
      {type:'tent',x:bx-100,y:by-55,s:1,color:'#7c2d12',ph:1},
      {type:'tent',x:bx+100,y:by-55,s:1,color:'#1e3a8a',ph:2},
      {type:'tent',x:bx-20,y:by+110,s:1,color:'#14532d',ph:3},
      {type:'fire',x:bx+72,y:by+74,s:1,ph:1.3},
      {type:'barrel',x:bx-82,y:by+92,s:1},
      {type:'crate',x:bx+100,y:by-6,s:1}
    ];
    this.worldObjs=[];this.motes=[];
  },

  drawBattlefield(ctx, now) {
    if(!this.worldTerrain) this.buildTerrain();
    this.worldObjs = this.worldTerrain.draw(ctx,this.camera,this.width,this.height,this.zoom || 1);
    this.worldObjs.push(...this.campObjects);
    drawFieldDepth(ctx, this.camera, this.width, this.height, this.zoom || 1);

    // 地帯の境は、地面に薄い筋だけ残す。名前は左上の札が持つ。
    ctx.save();
    FIELD_ZONES.forEach((z) => {
      if (z.minDist > 0) {
        ctx.strokeStyle = '#8a8170';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.14;
        ctx.setLineDash([10, 18]);
        strokeVisibleRing(ctx,BASE_CAMP.x,BASE_CAMP.y,z.minDist,viewport(this.camera,this.width,this.height,this.zoom||1,4));
      }
    });
    ctx.restore();
  },

  drawWorldObjects(ctx, now, after, py) {
    if (!this.worldObjs) return;
    const z = this.zoom || 1.0;
    const halfW = (this.width / 2) / z + 120;
    const halfH = (this.height / 2) / z + 140;
    const vx0 = this.camera.x - halfW, vx1 = this.camera.x + halfW;
    const vy0 = this.camera.y - halfH, vy1 = this.camera.y + halfH;
    for (const o of this.worldObjs) {
      if (o.y < vy0 || o.y > vy1 || o.x < vx0 || o.x > vx1) continue;
      if ((o.y > py) !== after) continue;
      this.drawWorldObj(ctx, o, now, after);
    }
  },

  sceneryCoversUnit(o, scale) {
    // v1.24.1: player-only (was O(squad) per visible prop → hitchy)
    const u = this.player;
    return !!(u && !u.dead && Math.abs(u.x - o.x) < 30 * scale && u.y < o.y + 10 && u.y > o.y - 65 * scale);
  },

  drawWorldObj(ctx, o, now, after) {
    const s = o.s || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    const sway = Math.sin(now * 0.0014 + (o.ph || 0)) * 2.2 * s;

    if (o.type === 'oak') {
      const pals = [
        ['#17361f', '#1f5a2b', '#2b7a38', '#4ba354'],
        ['#1a3a22', '#26622f', '#35853f', '#5bb35c'],
        ['#3a2a14', '#7a4a1a', '#b8661f', '#e08a35'],
        ['#16302a', '#1d5546', '#2a7a63', '#47a88a']
      ][o.tone % 4];
      ctx.fillStyle = 'rgba(0,0,0,0.33)';
      ctx.beginPath(); ctx.ellipse(4 * s, 3, 24 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3322';
      ctx.beginPath();
      ctx.moveTo(-5 * s, 2); ctx.lineTo(-3 * s, -22 * s); ctx.lineTo(3 * s, -22 * s); ctx.lineTo(5 * s, 2);
      ctx.fill();
      ctx.fillStyle = '#35241a';
      ctx.fillRect(1 * s, -20 * s, 2.5 * s, 20 * s);
      if (this.sceneryCoversUnit(o, s)) ctx.globalAlpha = 0.32;
      const blobs = [
        [0, -30, 21, 0], [-11, -37, 16, 1], [11, -36, 15, 1], [0, -48, 15, 2], [-6, -52, 7, 3]
      ];
      blobs.forEach(([bx, by, r, ci]) => {
        ctx.fillStyle = pals[ci];
        ctx.beginPath();
        ctx.arc(bx * s + sway * (0.4 + (-by) / 60), by * s, r * s, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (o.type === 'pine') {
      ctx.fillStyle = 'rgba(0,0,0,0.33)';
      ctx.beginPath(); ctx.ellipse(3 * s, 3, 18 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b2a1c';
      ctx.fillRect(-3 * s, -14 * s, 6 * s, 16 * s);
      if (this.sceneryCoversUnit(o, s)) ctx.globalAlpha = 0.32;
      const layers = [[-10, 24, '#12331f'], [-26, 20, '#17452a'], [-41, 15, '#1f5a35']];
      layers.forEach(([ly, hw, col], i) => {
        const sx = sway * (0.3 + i * 0.35);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo((-hw) * s, ly * s);
        ctx.lineTo(sx, (ly - 26) * s);
        ctx.lineTo(hw * s, ly * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(160,230,170,0.16)';
        ctx.beginPath();
        ctx.moveTo(sx, (ly - 26) * s);
        ctx.lineTo(hw * s, ly * s);
        ctx.lineTo(hw * 0.2 * s, ly * s);
        ctx.closePath();
        ctx.fill();
      });
    } else if (o.type === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(3 * s, 3, 14 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3128';
      ctx.lineCap = 'round';
      ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(1 * s, -28 * s); ctx.stroke();
      // v1.24.1: fewer branch strokes (was 4)
      ctx.lineWidth = 2.5 * s;
      [[-1, -14, -16, -30], [1, -20, 15, -38]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1 * s, y1 * s); ctx.lineTo(x2 * s + sway * 0.3, y2 * s); ctx.stroke();
      });
    } else if (o.type === 'rock') {
      const cols = [['#4b5563', '#6b7280', '#9ca3af'], ['#44403c', '#6b645d', '#9a9288'], ['#3f4b46', '#5f7168', '#8ea398']][o.tone % 3];
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(2 * s, 3, 15 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cols[0];
      ctx.beginPath();
      ctx.moveTo(-13 * s, 1); ctx.lineTo(-10 * s, -9 * s); ctx.lineTo(-2 * s, -14 * s);
      ctx.lineTo(8 * s, -11 * s); ctx.lineTo(14 * s, -2 * s); ctx.lineTo(11 * s, 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols[1];
      ctx.beginPath();
      ctx.moveTo(-10 * s, -9 * s); ctx.lineTo(-2 * s, -14 * s); ctx.lineTo(8 * s, -11 * s); ctx.lineTo(0, -5 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols[2];
      ctx.beginPath(); ctx.ellipse(-3 * s, -10 * s, 4 * s, 2 * s, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(80,140,60,0.5)';
      ctx.beginPath(); ctx.ellipse(-8 * s, -1 * s, 4 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === 'bush') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(1, 3, 15 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      const cols = [['#1f4a27', '#2f6b36'], ['#2a4a1f', '#46702e'], ['#1b3f33', '#2c6a55']][o.tone % 3];
      [[-8, -5, 8], [8, -5, 8], [0, -9, 9]].forEach(([bx, by, r], i) => {
        ctx.fillStyle = cols[i === 2 ? 1 : 0];
        ctx.beginPath(); ctx.arc((bx + sway * 0.15) * s, by * s, r * s, 0, Math.PI * 2); ctx.fill();
      });
      if (o.tone === 1) {
        ctx.fillStyle = '#ef4444';
        [[-6, -8], [3, -11], [8, -4]].forEach(([bx, by]) => {
          ctx.beginPath(); ctx.arc(bx * s, by * s, 1.6, 0, Math.PI * 2); ctx.fill();
        });
      }
    } else if (o.type === 'tent') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(4, 4, 36, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.moveTo(-32, 2); ctx.lineTo(0, -40); ctx.lineTo(32, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(32, 2); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#16100c';
      ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(0, -22); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
      // v1.24.1: drop white outline stroke; keep pole only
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -52); ctx.stroke();
      ctx.fillStyle = '#f5d142';
      const fw = Math.sin(now * 0.01 + o.ph) * 2;
      ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(10 + fw, -49); ctx.lineTo(0, -46); ctx.closePath(); ctx.fill();
    } else if (o.type === 'barrel') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(2, 3, 11 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(-8 * s, -16 * s, 16 * s, 18 * s);
      ctx.fillStyle = '#8a5a2e';
      ctx.beginPath(); ctx.ellipse(0, -16 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.fillRect(-8 * s, -11 * s, 16 * s, 2 * s);
      ctx.fillRect(-8 * s, -4 * s, 16 * s, 2 * s);
    } else if (o.type === 'crate') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(2, 3, 13 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(-10 * s, -18 * s, 20 * s, 20 * s);
      // v1.24.1: fill only (drop strokeRect + X)
      ctx.fillStyle = '#4b3220';
      ctx.fillRect(-10 * s, -18 * s, 20 * s, 1.5 * s);
      ctx.fillRect(-10 * s, 0, 20 * s, 1.5 * s);
    } else if (o.type === 'torch' || o.type === 'fire') {
      const big = o.type === 'fire';
      const fl = 0.78 + 0.22 * Math.sin(now * 0.021 + o.ph) + 0.1 * Math.sin(now * 0.047 + o.ph * 2);
      if (big) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#57534e';
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 12, 2 + Math.sin(a) * 5, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(9, -3); ctx.moveTo(-9, -3); ctx.lineTo(9, 3); ctx.stroke();
      } else {
        ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -22); ctx.stroke();
        ctx.fillStyle = '#374151';
        ctx.fillRect(-3, -26, 6, 5);
      }
      const fy = big ? -4 : -28;
      const fh = (big ? 20 : 13) * fl;
      const fw = big ? 9 : 5;
      ctx.globalCompositeOperation = 'lighter';
      const gr = (big ? 120 : 80) * fl;
      const lg = ctx.createRadialGradient(0, fy, 2, 0, fy, gr);
      lg.addColorStop(0, 'rgba(255,170,60,0.38)');
      lg.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-gr, fy - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-fw, fy); ctx.quadraticCurveTo(-fw * 0.6, fy - fh * 0.6, Math.sin(now * 0.02 + o.ph) * 2, fy - fh);
      ctx.quadraticCurveTo(fw * 0.6, fy - fh * 0.6, fw, fy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-fw * 0.5, fy); ctx.quadraticCurveTo(0, fy - fh * 0.8, fw * 0.5, fy); ctx.closePath(); ctx.fill();
    } else if (o.type === 'house') {
      const w = o.w || 48, h = o.h || 34;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(3, 4, w * 0.48, 8, 0, 0, Math.PI * 2); ctx.fill();
      if (this.sceneryCoversUnit(o, w / 30)) ctx.globalAlpha = 0.36;
      ctx.fillStyle = '#4a4036';
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.fillStyle = '#2e2924';
      ctx.fillRect(w / 2 - w * 0.28, -h, w * 0.28, h);
      ctx.fillStyle = o.roof || '#5c4632';
      ctx.beginPath();
      ctx.moveTo(-w / 2 - 5, -h + 5);
      ctx.lineTo(0, -h - 16);
      ctx.lineTo(w / 2 + 5, -h + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6e6a60';
      ctx.fillRect(-w / 2 - 2, -h + 3, w + 4, 3);
      ctx.fillStyle = '#1a1612';
      ctx.fillRect(-7, -18, 14, 18);
      ctx.fillStyle = '#8a8170';
      ctx.fillRect(-w * 0.28, -h + 10, 9, 7);
    } else if (o.type === 'ruinwall') {
      const w = o.w || 64, h = o.h || 30;
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(-w / 2, -2, w, 8);
      if (this.sceneryCoversUnit(o, w / 34)) ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#3a3832';
      ctx.beginPath();
      ctx.moveTo(-w / 2, 2);
      ctx.lineTo(-w / 2 + 5, -h);
      ctx.lineTo(w * 0.05, -h + 7);
      ctx.lineTo(w * 0.32, -h * 0.42);
      ctx.lineTo(w / 2 - 3, -h * 0.72);
      ctx.lineTo(w / 2, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6e6a60';
      ctx.fillRect(-w / 2 + 5, -h, w * 0.32, 3);
    } else if (o.type === 'column') {
      const k = s;
      if (o.fallen) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(8 * k, 4, 18 * k, 6 * k, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a564e';
        ctx.rotate(-0.45);
        ctx.fillRect(-4 * k, -6 * k, 42 * k, 12 * k);
        ctx.fillStyle = '#6e6a60';
        ctx.fillRect(-4 * k, -6 * k, 42 * k, 3 * k);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(2 * k, 3, 9 * k, 4 * k, 0, 0, Math.PI * 2); ctx.fill();
        if (this.sceneryCoversUnit(o, 0.7 * k)) ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#6a655c';
        ctx.fillRect(-6 * k, -32 * k, 12 * k, 34 * k);
        ctx.fillRect(-8 * k, -36 * k, 16 * k, 5 * k);
        ctx.fillStyle = '#8a8478';
        ctx.fillRect(-6 * k, -32 * k, 4 * k, 34 * k);
      }
    } else if (o.type === 'waystone') {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath(); ctx.ellipse(2, 4, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5e5a52';
      ctx.fillRect(-5, -24, 10, 28);
      ctx.fillStyle = '#8a8478';
      ctx.fillRect(-5, -24, 3, 28);
      ctx.fillStyle = '#d7c4a2';
      if (o.dir === 'e') ctx.fillRect(-7, -16, 4, 8);
      else if (o.dir === 'w') ctx.fillRect(3, -16, 4, 8);
      else if (o.dir === 'n') ctx.fillRect(-4, -4, 8, 4);
      else ctx.fillRect(-4, -20, 8, 4);
    } else if (o.type === 'gate') {
      const verticalRoad = o.axis === 'v';
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 4, verticalRoad ? 16 : 36, verticalRoad ? 36 : 12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (this.sceneryCoversUnit(o, 1.3)) ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#4a3828';
      if (verticalRoad) {
        ctx.fillRect(-40, -9, 16, 18);
        ctx.fillRect(24, -9, 16, 18);
        ctx.fillStyle = '#6a5038';
        ctx.fillRect(-40, -12, 80, 6);
      } else {
        ctx.fillRect(-9, -40, 18, 16);
        ctx.fillRect(-9, 24, 18, 16);
        ctx.fillStyle = '#6a5038';
        ctx.fillRect(-12, -40, 6, 80);
      }
      ctx.fillStyle = '#d7c4a2';
      ctx.fillRect(-3, -3, 6, 6);
    } else if (o.type === 'bridge') {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(-70, -6, 24, 12);
      ctx.fillRect(46, -6, 24, 12);
      ctx.fillStyle = '#5c584e';
      ctx.fillRect(-68, -18, 20, 20);
      ctx.fillRect(48, -18, 20, 20);
      ctx.fillStyle = '#7a7568';
      ctx.fillRect(-68, -18, 20, 4);
      ctx.fillRect(48, -18, 20, 4);
    } else if (o.type === 'cairn') {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath(); ctx.ellipse(2, 4, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3e4440';
      ctx.beginPath();
      ctx.moveTo(-16, 3); ctx.lineTo(-9, -8); ctx.lineTo(8, -6); ctx.lineTo(16, 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a7068';
      ctx.beginPath();
      ctx.moveTo(-8, -6); ctx.lineTo(-1, -18); ctx.lineTo(7, -15); ctx.lineTo(8, -5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9aa396';
      ctx.fillRect(-3, -24, 7, 7);
    } else if (o.type === 'well') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 5, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a564c';
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2426';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a342c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.lineTo(-12, -18); ctx.lineTo(12, -18); ctx.lineTo(12, 0);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawAmbientMotes(ctx, now) {
    if (!this.motes) return;
    const z = this.zoom || 1.0;
    const halfW = (this.width / 2) / z + 50;
    const halfH = (this.height / 2) / z + 50;
    const vx0 = this.camera.x - halfW, vx1 = this.camera.x + halfW;
    const vy0 = this.camera.y - halfH, vy1 = this.camera.y + halfH;
    for (const m of this.motes) {
      if (m.kind === 'fly') {
        const x = m.x + Math.sin(now * 0.0004 * m.sp + m.ph) * 45;
        const y = m.y + Math.cos(now * 0.0003 * m.sp + m.ph * 1.3) * 32;
        if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
        const a = 0.5 + 0.5 * Math.sin(now * 0.003 * m.sp + m.ph);
        if (a < 0.08) continue;
        ctx.fillStyle = `rgba(190,255,120,${0.14 * a})`;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(240,255,170,${0.85 * a})`;
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
      } else {
        const y = (m.y + now * 0.02 * m.sp) % MAP_HEIGHT;
        const x = m.x + Math.sin(now * 0.0008 * m.sp + m.ph) * 36;
        if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(now * 0.002 * m.sp + m.ph);
        ctx.fillStyle = m.ph > 3.1 ? 'rgba(200,110,40,0.75)' : 'rgba(120,150,60,0.7)';
        ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  },

  drawAtmosphere(ctx, now) {
    const W = this.width, H = this.height;
    if (!W || !H || W < 10 || H < 10) return;
    // 景観と出現敵を同じ保存可能な時計で制御する。
    const time=daylightAt(this.worldTime);
    ctx.fillStyle = `rgba(8,14,35,${time.darkness})`;
    ctx.fillRect(0,0,W,H);
    if(time.label==='夕暮れ'||time.label==='夜明け') {
      ctx.fillStyle='rgba(164,104,53,0.06)';ctx.fillRect(0,0,W,H);
    }

    // 流れる霧 (2 layers — was 3; radial gradients are expensive)
    for (let i = 0; i < 1; i++) {
      const x = ((now * 0.012 * (i + 1) + i * 330) % (W + 500)) - 250;
      const y = H * (0.28 + 0.32 * i);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(2.6, 1);
      const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 110);
      fg.addColorStop(0, 'rgba(190,210,225,0.07)');
      fg.addColorStop(1, 'rgba(190,210,225,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(-110, -110, 220, 220);
      ctx.restore();
    }

    // ビネット（画面端を暗く＝没入感）
    if (!this.vigCache || this.vigW !== W || this.vigH !== H || this.vigCache.getContext('2d')?.isContextLost?.() === true) {
      releaseCanvas(this.vigCache);
      const vc = document.createElement('canvas');
      vc.width = Math.max(1, Math.floor(W));
      vc.height = Math.max(1, Math.floor(H));
      const vx = vc.getContext('2d');
      if (!vx) { releaseCanvas(vc); throw new Error('画面の陰影Canvasを確保できません'); }
      const vg = vx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.62)');
      vx.fillStyle = vg;
      vx.fillRect(0, 0, W, H);
      this.vigCache = vc;
      this.vigW = W;
      this.vigH = H;
    }
    ctx.drawImage(this.vigCache, 0, 0, W, H);
  },

  drawBaseCamp(ctx, now) {
    drawNationalDevelopment(ctx,this,BASE_CAMP.x,BASE_CAMP.y);
    ctx.save();
    // 治癒エリアの優しい緑のオーラ
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.beginPath();
    ctx.arc(BASE_CAMP.x, BASE_CAMP.y, BASE_CAMP.radius, 0, Math.PI * 2);
    ctx.fill();

    // 外周のルーン境界線
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(BASE_CAMP.x, BASE_CAMP.y, BASE_CAMP.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 砦の石垣サークル（狭間マーク）
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(BASE_CAMP.x, BASE_CAMP.y, BASE_CAMP.radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 中央の石造り城塞（砦タワー）
    ctx.translate(BASE_CAMP.x, BASE_CAMP.y);
    
    // 石積みの天守
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -20, 48, 40, 6);
    ctx.fill();
    ctx.stroke();

    // 城塞の狭間（凸凹）
    ctx.fillStyle = '#334155';
    ctx.fillRect(-22, -26, 8, 6);
    ctx.fillRect(-4, -26, 8, 6);
    ctx.fillRect(14, -26, 8, 6);

    // アーチ状の門
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 10, 8, Math.PI, 0);
    ctx.lineTo(8, 20);
    ctx.lineTo(-8, 20);
    ctx.closePath();
    ctx.fill();

    // 風になびくエメラルド軍旗
    const waveFlag = Math.sin(now * 0.008) * 3;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -44);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(16 + waveFlag, -38);
    ctx.lineTo(0, -32);
    ctx.closePath();
    ctx.fill();

    // ラベル
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏰 自軍本陣 (治癒砦)', 0, 36);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('エリア内で部隊治癒', 0, 50);

    ctx.restore();
  },

  drawOutpost(ctx, op, now) {
    ctx.save();
    ctx.translate(op.x, op.y);

    const isCleared = op.cleared;

    if (op.type === 'FORT') {
      // ===== 🏴 敵の前線砦 =====
      ctx.fillStyle = isCleared ? 'rgba(30, 20, 20, 0.4)' : 'rgba(50, 20, 20, 0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.fill();

      // バリケード（木の柵）
      ctx.strokeStyle = isCleared ? '#4b5563' : '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeRect(-26, -20, 52, 40);

      // 砦本体
      ctx.fillStyle = isCleared ? '#374151' : '#1f2937';
      ctx.fillRect(-18, -14, 36, 28);

      if (!isCleared) {
        // オークの角付き頭蓋骨紋章
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-4, -6, 8, 8);

        // かがり火（アニメーション炎）
        const flame = Math.sin(now * 0.02) * 2;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-22, -18, 4 + flame, 0, Math.PI * 2);
        ctx.arc(22, -18, 4 + flame, 0, Math.PI * 2);
        ctx.fill();

        // 砦の軍旗
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -32); ctx.stroke();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(0, -32, 14, 10);
      } else {
        // 制圧後の煙
        ctx.fillStyle = 'rgba(150, 150, 150, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -10 + Math.sin(now * 0.005) * 4, 10, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (op.type === 'CAGE') {
      // ===== ⛓️ 捕虜収容所 =====
      ctx.fillStyle = 'rgba(40, 30, 20, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.fill();

      // 檻の枠
      ctx.strokeStyle = isCleared ? '#64748b' : '#334155';
      ctx.lineWidth = isCleared ? 1.5 : 2.5;
      ctx.strokeRect(-18, -16, 36, 32);

      // 鉄格子バー
      if (!isCleared) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        for (let bx = -12; bx <= 12; bx += 6) {
          ctx.beginPath();
          ctx.moveTo(bx, -16);
          ctx.lineTo(bx, 16);
          ctx.stroke();
        }

        // 檻の中の囚われた友軍兵士
        const bob = Math.sin(now * 0.008) * 1.5;
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(0, bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, -3 + bob, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 扉が破壊されて開放
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, -16);
        ctx.lineTo(28, -6);
        ctx.stroke();
      }

    } else if (op.type === 'SHRINE') {
      // ===== 🏛️ 古代鍛冶の祭壇 =====
      ctx.strokeStyle = isCleared ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.stroke();

      // 4本の古代石柱
      ctx.fillStyle = '#475569';
      [[-20, -20], [20, -20], [-20, 20], [20, 20]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 中央祭壇座
      ctx.fillStyle = '#334155';
      ctx.fillRect(-12, -10, 24, 20);

      // 浮遊する青き古代ルーン（パルス）
      const floatY = Math.sin(now * 0.005) * 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 4;
      ctx.fillStyle = isCleared ? '#94a3b8' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, floatY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (op.type === 'SUPPLY') {
      // ===== 📦 補給物資集積所 =====
      ctx.fillStyle = 'rgba(30, 45, 30, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.fill();

      // 積み上げられた木箱
      ctx.fillStyle = isCleared ? '#4b5563' : '#78350f';
      ctx.fillRect(-14, -6, 14, 14);
      ctx.fillRect(2, -6, 14, 14);
      ctx.fillRect(-6, -18, 14, 14);

      // 樽
      ctx.fillStyle = isCleared ? '#374151' : '#92400e';
      ctx.beginPath();
      ctx.arc(14, 10, 6, 0, Math.PI * 2);
      ctx.arc(-14, 10, 6, 0, Math.PI * 2);
      ctx.fill();

      if (!isCleared) {
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✚', 0, 16);
      }
    }

    // 頭上ラベル ＆ HPバー
    ctx.textAlign = 'center';
    if (!isCleared) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = op.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 0;
      ctx.fillText(`${op.icon} ${op.name}`, 0, -op.radius - 12);
      ctx.shadowBlur = 0;

      const barW = 44;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW / 2, -op.radius - 8, barW, 4);
      ctx.fillStyle = op.color;
      ctx.fillRect(-barW / 2, -op.radius - 8, barW * (op.hp / op.maxHp), 4);
    } else {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 0;
      ctx.fillText(`✨ 制圧完了`, 0, -op.radius - 6);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  drawChest(ctx, drop, now) {
    ctx.save();
    ctx.translate(drop.x, drop.y);

    if(drop.isMagicStone){ctx.fillStyle='#9b88b7';ctx.strokeStyle='#ddd0ee';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,-2);ctx.lineTo(3,7);ctx.lineTo(-4,6);ctx.lineTo(-6,-2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();return;}
    if(drop.isAmmo){ctx.fillStyle='#857960';ctx.fillRect(-7,-6,14,12);ctx.strokeStyle='#d3c6a5';ctx.strokeRect(-7,-6,14,12);ctx.fillStyle='#e6ddc7';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(String(drop.ammo),0,3);ctx.restore();return;}
    if (drop.isOrb) {
      // ===== 💎 覚醒の英雄宝珠（宙に浮遊・神聖秘宝の輝き） =====
      const floatBob = Math.sin(now * 0.006) * 4;
      const pulse = Math.sin(now * 0.014) * 3;

      // 接地シャドウ
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 12, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 外周の神聖オーラリング
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 5 + pulse * 0.35;
      ctx.beginPath();
      ctx.arc(0, floatBob, 13 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // 宝珠本体（光彩グラデーション）
      const grad = ctx.createRadialGradient(-3, floatBob - 3, 1, 0, floatBob, 9);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fef08a');
      grad.addColorStop(0.7, '#f59e0b');
      grad.addColorStop(1, '#b45309');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, floatBob, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // 宝珠上部の神聖アイコン
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔱', 0, floatBob - 13);
      ctx.shadowBlur = 0;
      ctx.restore();
      return;
    }

    if (drop.isBoss) {
      // ===== ボス確定ドロップの神々しいオーラ =====
      const pulse = Math.sin(now * 0.008) * 5;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6 + pulse * 0.35;

      // 金の宝箱
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-12, -9, 24, 18);

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-12, -9, 24, 18);

      // 王冠マーク
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', 0, -15);
    } else {
      // 足元グロー光彩
      ctx.shadowColor = drop.item.color;
      ctx.shadowBlur = 12 + Math.sin(now * 0.008) * 4;

      // 宝箱の木製本体
      ctx.fillStyle = '#5c2c16';
      ctx.fillRect(-10, -8, 20, 16);

      // 金具フレーム（レアリティ色）
      ctx.strokeStyle = drop.item.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-10, -8, 20, 16);

      // 宝箱の帯金具
      ctx.fillStyle = drop.item.color;
      ctx.fillRect(-10, -2, 20, 3);

      // 鍵穴
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(0, 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  drawMonster(ctx, m, now) {
    ctx.save();
    ctx.translate(m.x, m.y);

    const isLeft = (m.vx !== undefined && m.vx < -0.1) || ((this.player && this.player.x < m.x) && (!m.vx || Math.abs(m.vx) < 0.1));
    const bob = Math.sin(now * 0.014 + (m.x % 10)) * (m.isColossal ? 3.0 : 1.6);

    const plant = Math.abs(Math.sin(now * 0.017 + (m.x || 0)));
    const big = !!m.isColossal;
    contactShadow(ctx, big ? 2 : 1, big ? 8 : 2, m.radius * (big ? 1.02 : 0.92), m.radius * (big ? 0.34 : 0.3), plant);

    // 左右反転コンテキスト
    ctx.save();
    if (isLeft) ctx.scale(-1, 1);

    if ((m.isDemonInvasion?drawFieldMob(ctx,{...m,isBoss:false},now):drawFieldBoss(ctx, m, now) || drawFieldMob(ctx, m, now))) {
      // Bosses and common creatures share the live field illustration.
    } else if (m.type === 'slime') {
      // ===== 🟢 スライム (近郊安全ゾーン・ぷるぷる揺れる半透明ゲル) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#34d399';
      const squish = Math.sin(now * 0.016 + m.x) * 1.5;

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -6 + bob, 9 + squish, 7 - squish, 0, 0, Math.PI * 2);
      ctx.fill();

      // 頭部の光彩ハイライト
      ctx.fillStyle = '#a7f3d0';
      ctx.beginPath();
      ctx.ellipse(-2, -9 + bob, 3, 2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // つぶらな黒い瞳
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.arc(2, -6 + bob, 1.4, 0, Math.PI * 2);
      ctx.arc(6, -6 + bob, 1.4, 0, Math.PI * 2);
      ctx.fill();

    } else if (m.type === 'goblin') {
      // ===== 👺 ゴブリン (小型・緑の小鬼、前傾姿勢の立ち姿) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#22c55e';
      const darkColor = m.hitPulse > 0 ? '#ffffff' : '#15803d';

      // 二本の足（小走りステップ）
      const step = Math.sin(now * 0.02 + m.x) * 3;
      ctx.fillStyle = darkColor;
      ctx.fillRect(-4 + step, -3, 3, 4);
      ctx.fillRect(2 - step, -3, 3, 4);

      // 胴体 (猫背・前傾)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -9 + bob, 6.5, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // ボロ布の腰巻
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-5, -6 + bob, 9, 3);

      // 頭部
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(2, -15 + bob, 6, 0, Math.PI * 2);
      ctx.fill();

      // 尖った長いエルフ耳
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-2, -15 + bob);
      ctx.lineTo(-10, -19 + bob);
      ctx.lineTo(-3, -12 + bob);
      ctx.closePath();
      ctx.fill();

      // 赤い光る眼
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(3, -16 + bob, 2.2, 2.2);

      // トゲ棍棒 (斜め前方に構えて振り回す)
      ctx.save();
      ctx.translate(5, -9 + bob);
      ctx.rotate(0.3 + Math.sin(now * 0.015) * 0.25);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(10, -8);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(8, -10, 3, 3);
      ctx.fillRect(5, -6, 2.5, 2.5);
      ctx.restore();

    } else if (m.type === 'wolf') {
      // ===== 🐺 黒狼 (中域・四足の俊敏な野獣) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#475569';
      const darkColor = m.hitPulse > 0 ? '#ffffff' : '#1e293b';

      const runLeg = Math.sin(now * 0.024 + m.x) * 4;
      ctx.fillStyle = darkColor;
      ctx.fillRect(-7 + runLeg, -2, 3, 5);
      ctx.fillRect(5 - runLeg, -2, 3, 5);
      ctx.fillRect(-9 - runLeg, -2, 3, 5);
      ctx.fillRect(7 + runLeg, -2, 3, 5);

      // 胴体
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -7 + bob, 11, 6, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 首と頭
      ctx.beginPath();
      ctx.moveTo(4, -8 + bob);
      ctx.lineTo(13, -14 + bob);
      ctx.lineTo(15, -9 + bob);
      ctx.lineTo(6, -4 + bob);
      ctx.closePath();
      ctx.fill();

      // 尖った耳
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(8, -13 + bob);
      ctx.lineTo(10, -19 + bob);
      ctx.lineTo(12, -13 + bob);
      ctx.closePath();
      ctx.fill();

      // 赤い野生の眼
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(11, -12 + bob, 2, 2);

      // 尻尾
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, -8 + bob);
      ctx.quadraticCurveTo(-16, -14 + Math.sin(now * 0.02) * 3 + bob, -18, -8 + bob);
      ctx.stroke();

    } else if (m.type === 'orc') {
      // ===== 👹 オーク (中型エリート・筋肉質な蛮族ウォリアー) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#d97706';
      const shadowColor = m.hitPulse > 0 ? '#ffffff' : '#b45309';

      // 頑強なブーツ脚
      const step = Math.sin(now * 0.016 + m.x) * 3.5;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-6 + step, -5, 4.5, 6);
      ctx.fillRect(2 - step, -5, 4.5, 6);

      // 毛皮の腰巻
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -9 + bob, 16, 5);

      // 筋肉隆々の胴体 (厚い胸板)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -14 + bob, 10, 8.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shadowColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -14 + bob, 5, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // 角付き鉄兜＆頭部
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(2, -22 + bob, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // 兜の白い大角
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-2, -23 + bob);
      ctx.lineTo(-9, -30 + bob);
      ctx.lineTo(-1, -26 + bob);
      ctx.closePath();
      ctx.fill();

      // 獰猛な赤目と牙
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(3, -23 + bob, 2.5, 2.2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(4, -19 + bob, 1.8, 2.5);

      // 巨大バトルアックス
      ctx.save();
      ctx.translate(6, -12 + bob);
      ctx.rotate(-0.2 + Math.sin(now * 0.012) * 0.2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-3, 6);
      ctx.lineTo(12, -18);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(10, -16, 8, -Math.PI * 0.7, Math.PI * 0.3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

    } else if (m.type === 'wyvern') {
      // ===== 🦅 ワイバーン (深部・俊敏な双翼飛竜) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#7c3aed';
      const wingColor = m.hitPulse > 0 ? '#ffffff' : '#5b21b6';
      const flap = Math.sin(now * 0.01 + m.x) * 8;

      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.moveTo(-2, -12 + bob);
      ctx.lineTo(-18, -26 + flap + bob);
      ctx.lineTo(-10, -8 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -10 + bob, 11, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.moveTo(4, -12 + bob);
      ctx.lineTo(20, -25 + flap + bob);
      ctx.lineTo(12, -7 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(8, -16 + bob, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(9, -17 + bob, 2, 2);

    }

    ctx.restore(); // 反転復元

    // HPバー & 頭上ボス名表示
    if (m.isColossal) {
      // 大ボス特大ゲージ
      const barW = 100;
      const headH = 75;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(-barW / 2 - 2, -headH - 2, barW + 4, 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2, -headH, barW * (m.hp / m.maxHp), 5);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-barW / 2 - 2, -headH - 2, barW + 4, 8);

      // 頭上の金文字タイトル
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 0;
      ctx.fillText(`${m.title || ''}${m.name || '超巨大ボス'}`, 0, -headH - 6);
      ctx.shadowBlur = 0;
    } else {
      const barW = Math.max(22, m.radius * 2);
      const headH = m.activePeriod ? 43 : m.isBoss ? 46 : (m.type === 'orc' || m.type === 'wyvern' ? 44 : (m.type === 'goblin' ? 37 : 26));
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(-barW / 2, -headH, barW, 4);
      ctx.fillStyle = m.isBoss ? '#ef4444' : (m.isElite ? '#f59e0b' : '#34d399');
      ctx.fillRect(-barW / 2, -headH, barW * (m.hp / m.maxHp), 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-barW / 2, -headH, barW, 4);
      if(m.activePeriod){ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e4ddc5';ctx.fillText(`${m.activePeriod==='day'?'☀':'☾'} ${m.name}`,0,-headH-4);}
    }

    ctx.restore();
  },

  drawProjectile(ctx, proj, now) {
    ctx.save();
    ctx.translate(proj.x, proj.y);

    if(proj.type==='STONE'){ctx.fillStyle='#a8a29e';ctx.beginPath();ctx.ellipse(0,0,4,3,.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d6d3d1';ctx.fillRect(-1,-2,2,1);}
    else if (proj.type === 'ARROW') {
      const tgt = proj.target;
      const angle = tgt ? Math.atan2(tgt.y - proj.y, tgt.x - proj.x) : 0;
      ctx.rotate(angle);

      // 矢のシャフト
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      // 銀の矢尻
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();

      // 白い羽
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-6, -2.5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 2.5);
      ctx.closePath();
      ctx.fill();
    } else if (proj.type === 'BOLT') {
      const tgt = proj.target;
      const angle = tgt ? Math.atan2(tgt.y - proj.y, tgt.x - proj.x) : 0;
      ctx.rotate(angle);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
      ctx.fillStyle = proj.color || '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(3, -3.5);
      ctx.lineTo(3, 3.5);
      ctx.closePath();
      ctx.fill();
    } else if (proj.type === 'CANNONBALL') {
      const ang = Math.atan2(proj.vy || 0, proj.vx || 0);
      ctx.rotate(ang);
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = proj.color || '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(245,158,11,0.35)';
      ctx.beginPath();
      ctx.arc(-4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'STAR_ARROW') {
      // 神射手の天星魔導光矢 (エメラルドと白金の彗星光)
      const ang = Math.atan2(proj.vy || 0, proj.vx || 0);
      ctx.rotate(ang);

      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 5;

      // 尾を引く魔導光条
      const grad = ctx.createLinearGradient(-16, 0, 10, 0);
      grad.addColorStop(0, 'rgba(52, 211, 153, 0)');
      grad.addColorStop(0.5, 'rgba(52, 211, 153, 0.7)');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(8, -2.5);
      ctx.lineTo(12, 0);
      ctx.lineTo(8, 2.5);
      ctx.closePath();
      ctx.fill();

      // 先端の天星フラッシュ
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(10, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (proj.type === 'SWORD_BEAM') {
      // 剣聖の疾風飛翔真空刃 (黄金の鋭利な三日月衝撃波)
      const ang = Math.atan2(proj.vy || 0, proj.vx || 0);
      ctx.rotate(ang);

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;

      // 外郭の黄金刃
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      // 内郭の白い電光
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 14, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (proj.type === 'SMITE') {
      // 大司教の神聖浄化弾 (十字の光彩を放つ聖光球)
      const rot = now * 0.015;
      ctx.rotate(rot);

      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // 神聖十字光
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8, -1.8, 16, 3.6);
      ctx.fillRect(-1.8, -8, 3.6, 16);
      ctx.shadowBlur = 0;
    } else if (proj.type === 'HEAL') {
      // 脈動する治癒光弾 (大回復弾は巨大オーラを纏う！)
      const isHigh = proj.isHighHeal || proj.amount >= 50;
      const baseR = isHigh ? 6.5 : 4.5;
      const pulse = Math.sin(now * 0.018) * (isHigh ? 2.5 : 1.5);
      const glowColor = proj.color || (isHigh ? '#00f0ff' : '#34d399');
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isHigh ? 16 : 10;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, baseR + pulse, 0, Math.PI * 2);
      ctx.fill();

      // 内側の白い神聖核
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, isHigh ? 3.2 : 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (proj.type === 'BREATH_FLAME') {
      // 超火炎ブレスの業火弾 (燃え盛る炎球)
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 5;
      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fde047');
      grad.addColorStop(0.7, '#f97316');
      grad.addColorStop(1, '#ef4444');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (proj.type === 'TITAN_BEAM') {
      // 古代巨神の神話光線弾 (古代青白のパルス光球)
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  drawSoldier(ctx, s, now) {
    const cls = SOLDIER_CLASSES[s.soldierClass || 'HEAVY'] || SOLDIER_CLASSES.HEAVY;
    const platoon = this.platoons?.[s.platoonId % 3];
    // v1.24.1: edge-of-view / far soldiers skip gear+weapon detail strokes
    let simple = false;
    if (this.camera && !s.isDown && !s.isNamed && !s.isCommander) {
      const z = this.zoom || 1;
      const mx = (this.width / (2 * z)) * 0.68;
      const my = (this.height / (2 * z)) * 0.68;
      simple = Math.abs(s.x - this.camera.x) > mx || Math.abs(s.y - this.camera.y) > my;
    }
    drawFieldSoldier(ctx, s, now, cls, platoon?.color || '#829cae', simple);
  },

  drawPlayer(ctx, p, now) {
    const eq = this.equipped || {};
    const wStyle = weaponStyleOf(eq.weapon);
    if (['sword','spear','hammer'].includes(wStyle)) {
      const reach = meleeDrawReach(eq.weapon, !!p.isAdvanced);
      const ang = p.slashAnim > 0 && Number.isFinite(p.slashAngle) ? p.slashAngle : (p.facingAngle || 0);
      drawMeleeRangeCue(ctx,p.x,p.y,ang,reach,wStyle,p.slashAnim || 0,eq.weapon);
    }
    drawFieldCommander(ctx,p,eq,now,this.rankIndex,RANKS[this.rankIndex].title,
      !!this.joystick?.active);
  },

  renderMinimap() {
    const canvas = this.minimapCanvas;
    const mCtx = this.minimapCtx;
    if (!canvas || !mCtx || !this.player) return;
    const mw = 70, mh = 70;
    // iPhone Retina でぼやけないよう DPR を反映（論理座標は常に 70x70）
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = Math.round(mw * dpr), bh = Math.round(mh * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = mw + 'px';
      canvas.style.height = mh + 'px';
    }
    mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mCtx.clearRect(0, 0, mw, mh);
    mCtx.fillStyle = 'rgba(16, 24, 22, 0.88)';
    mCtx.fillRect(0, 0, mw, mh);
    mCtx.strokeStyle = '#7c8877';
    mCtx.lineWidth = 1;
    mCtx.strokeRect(0.5, 0.5, mw - 1, mh - 1);

    const dungeon = this.currentDungeon;
    const rawSpan = dungeon ? Math.max(dungeon.width || 0, dungeon.height || 0) : 5200;
    const span = Math.max(400, rawSpan || 5200);
    const originX = this.player.x - span / 2;
    const originY = this.player.y - span / 2;
    const scale = mw / span;
    const px = x => (x - originX) * scale;
    const py = y => (y - originY) * scale;
    const inside = (x, y) => x > originX - 30 && x < originX + span + 30 && y > originY - 30 && y < originY + span + 30;

    if (!dungeon) {
      const fog = this.ensureFog();
      for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) {
        const wx = originX + (gx + 0.5) * span / 8;
        const wy = originY + (gy + 0.5) * span / 8;
        const sx = gx * mw / 8, sy = gy * mh / 8, sw = mw / 8 + 1, sh = mh / 8 + 1;
        if (fog.shadeMinimapCell(mCtx, wx, wy, sx, sy, sw, sh)) continue;
        mCtx.fillStyle = biomeAt(wx, wy).ground;
        mCtx.fillRect(sx, sy, sw, sh);
      }
      const roadDot = (x, y, color) => {
        if (!fog.isExploredWorld(x, y)) return;
        mCtx.fillStyle = color;
        mCtx.fillRect(px(x) - 1.1, py(y) - 1.1, 2.2, 2.2);
      };
      for (let i = 0; i < 8; i++) {
        const x = originX + (i + 0.5) * span / 8;
        const y = originY + (i + 0.5) * span / 8;
        const roadY = eastWestRoadY(x);
        if (roadY > originY && roadY < originY + span) roadDot(x, roadY, x >= BASE_CAMP.x ? '#c4a574' : '#6a5344');
        const roadX = northSouthRoadX(y);
        if (roadX > originX && roadX < originX + span) roadDot(roadX, y, y < BASE_CAMP.y ? '#9aa396' : '#d2cbb4');
        const waterY = riverCenterY(x);
        if (waterY > originY && waterY < originY + span) roadDot(x, waterY, '#3d646c');
      }
      if (inside(BASE_CAMP.x, BASE_CAMP.y) && fog.isExploredWorld(BASE_CAMP.x, BASE_CAMP.y)) {
        mCtx.fillStyle = '#c4b48a';
        mCtx.fillRect(px(BASE_CAMP.x) - 2.4, py(BASE_CAMP.y) - 2.4, 4.8, 4.8);
      }
      let nearestOp = null, minOpDist = Infinity;
      for (const op of this.outposts || []) {
        if (op.cleared) continue;
        if (!fog.isExploredWorld(op.x, op.y)) continue;
        const d = Math.hypot(op.x - this.player.x, op.y - this.player.y);
        if (d < minOpDist) { minOpDist = d; nearestOp = op; }
      }
      for (const op of this.outposts || []) {
        if (!inside(op.x, op.y) || !fog.isExploredWorld(op.x, op.y)) continue;
        mCtx.fillStyle = op.cleared ? '#8a9a84' : (op === nearestOp ? '#d7b56a' : 'rgba(215,181,106,0.45)');
        mCtx.beginPath();
        mCtx.arc(px(op.x), py(op.y), op === nearestOp ? 2.2 : 1.3, 0, Math.PI * 2);
        mCtx.fill();
      }
      for (const d of this.dungeons || []) {
        if (!inside(d.entrance.x, d.entrance.y) || !fog.isExploredWorld(d.entrance.x, d.entrance.y)) continue;
        mCtx.fillStyle = d.kind === 'town' ? '#e1cf9d' : d.kind === 'ruin' ? '#8d7b68' : '#d7b56a';
        mCtx.fillRect(px(d.entrance.x) - 1.6, py(d.entrance.y) - 1.6, 3.2, 3.2);
      }
      drawMedicalMap(mCtx,this,px,py,inside);
      drawInvasionRoute(mCtx,this,px,py,inside);
      for (const m of this.monsters || []) {
        if (!m.isColossal || !inside(m.x, m.y) || !fog.isExploredWorld(m.x, m.y)) continue;
        mCtx.fillStyle = '#c45a4a';
        mCtx.beginPath();
        mCtx.arc(px(m.x), py(m.y), 2.4, 0, Math.PI * 2);
        mCtx.fill();
      }
    } else {
      mCtx.strokeStyle = '#6a6458';
      mCtx.strokeRect(px(0), py(0), dungeon.width * scale, dungeon.height * scale);
      if(dungeon.kind==='town')drawMedicalMarker(mCtx,px(230),py(dungeon.height/2),3);
      mCtx.fillStyle = '#8a9a84';
      mCtx.beginPath();
      mCtx.arc(px(180), py(dungeon.height / 2), 2, 0, Math.PI * 2);
      mCtx.fill();
      for (const m of this.monsters || []) {
        if (m.hp <= 0) continue;
        mCtx.fillStyle = m.isDungeonBoss || m.isBoss ? '#d7b56a' : '#8a5a48';
        mCtx.fillRect(px(m.x) - 1, py(m.y) - 1, 2, 2);
      }
    }

    const nowTime = performance.now();
    for (const s of rescueUnits(this)) {
      if (!s.isDown || s.dead || (dungeon&&!inCurrentInstance(this,s)) || !inside(s.x, s.y)) continue;
      const pulse = Math.sin(nowTime * 0.015) > 0;
      const sx = px(s.x), sy = py(s.y);
      mCtx.fillStyle = pulse ? '#c45a4a' : '#e7dcc4';
      mCtx.fillRect(sx - 3, sy - 1, 6, 2);
      mCtx.fillRect(sx - 1, sy - 3, 2, 6);
    }

    // 本陣が局所ミニマップ外なら、縁に骨色の方向マーカー
    if (!dungeon && !inside(BASE_CAMP.x, BASE_CAMP.y)) {
      const ang = Math.atan2(BASE_CAMP.y - this.player.y, BASE_CAMP.x - this.player.x);
      const ex = mw / 2 + Math.cos(ang) * (mw / 2 - 6);
      const ey = mh / 2 + Math.sin(ang) * (mh / 2 - 6);
      mCtx.save();
      mCtx.translate(ex, ey);
      mCtx.rotate(ang);
      mCtx.fillStyle = '#e7dcc4';
      mCtx.beginPath();
      mCtx.moveTo(4, 0);
      mCtx.lineTo(-3, -2.5);
      mCtx.lineTo(-3, 2.5);
      mCtx.closePath();
      mCtx.fill();
      mCtx.restore();
    }

    mCtx.save();
    mCtx.translate(px(this.player.x), py(this.player.y));
    mCtx.rotate(this.player.facingAngle || 0);
    mCtx.fillStyle = '#e7dcc4';
    mCtx.beginPath();
    mCtx.moveTo(5, 0);
    mCtx.lineTo(-3.5, -3.2);
    mCtx.lineTo(-1.8, 0);
    mCtx.lineTo(-3.5, 3.2);
    mCtx.closePath();
    mCtx.fill();
    mCtx.restore();

    const distToBase = Math.hypot(this.player.x - BASE_CAMP.x, this.player.y - BASE_CAMP.y);
    mCtx.fillStyle = '#e1cf9d';
    mCtx.font = '8px sans-serif';
    mCtx.textAlign = 'left';
    mCtx.textBaseline = 'bottom';
    mCtx.fillText(dungeon ? '屋内' : (distToBase < 200 ? '本陣' : `${Math.round(distToBase)}m`), 2.5, mh - 1.5);
  },

  gameOver() {
    this.stopGameLoop();
    sound.playGameOver();
    this.inBattle = false;

    // 先輩兵士として引き継ぐ（生存かつダウンしていない兵士）
    const aliveVeterans = this.squad ? this.squad.filter(s => !s.dead && !s.isDown) : [];
    saveSlots.update(this.activeSlotId, {state:'fallen', veterans:aliveVeterans.map(persistentUnit), reserveSurvivors:(this.reserves || []).map(persistentUnit)});

    const overlay = document.getElementById('game-overlay');
    document.getElementById('final-wave').textContent = this.wave;
    document.getElementById('final-rank').textContent = RANKS[this.rankIndex].title;
    const finalMinions = document.getElementById('final-minions');
    if (finalMinions) finalMinions.textContent = this.player ? (this.player.minionKills || 0) : 0;
    const finalBosses = document.getElementById('final-bosses');
    if (finalBosses) finalBosses.textContent = this.player ? (this.player.bossKills || 0) : 0;

    const vetNote = document.getElementById('overlay-veteran-note');
    if (vetNote) {
      if (aliveVeterans.length > 0) {
        vetNote.style.color = '#38bdf8';
        vetNote.textContent = `🎖️ 生き残った精鋭【${aliveVeterans.length}名】が、新兵として再入隊するあなたの「先輩兵士」として次戦に参戦します！`;
      } else {
        vetNote.style.color = '#ff5555';
        vetNote.textContent = '※生存者なし…過酷な戦場にて部隊は全滅しました';
      }
    }
    this.closeStrategyModal(false);
    this.setDialogState(true);
    overlay.classList.remove('hidden');
  },

  destroy() {
    clearTimeout(this._battleLogTimer);
    this.audioUIUnsubscribe?.();this.audioUIUnsubscribe=null;
    sound.stopBGM();sound.setListener(null);
    this.stopGameLoop();
    detachSurfaceEvents(this);
    releaseSceneCaches(this);
    this.surfaceResizeObserver?.disconnect(); this.surfaceResizeObserver = null;
    window.visualViewport?.removeEventListener('resize', this.resizeCanvas);
    this.fog = null;
    if (this.stickHandlers) {
      const {move,end} = this.stickHandlers;
      window.removeEventListener('mousemove',move);
      window.removeEventListener('touchmove',move);
      window.removeEventListener('mouseup',end);
      window.removeEventListener('touchend',end);
      window.removeEventListener('touchcancel',end);
      this.stickHandlers = null;
    }
    window.removeEventListener('resize', this.resizeCanvas);
    if (this.handleOrientation) {
      window.removeEventListener('orientationchange', this.handleOrientation);
      const screenObj = typeof screen !== 'undefined' ? screen : (typeof window !== 'undefined' ? window.screen : null);
      screenObj?.orientation?.removeEventListener?.('change', this.handleOrientation);
      this.handleOrientation = null;
    }
    if (this.handleVisibility) {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundDown);
      window.removeEventListener('mousemove', this.boundMove);
      window.removeEventListener('mouseup', this.boundUp);
      this.canvas.removeEventListener('touchstart', this.boundDown);
      window.removeEventListener('touchmove', this.boundMove);
      window.removeEventListener('touchend', this.boundUp);
      window.removeEventListener('touchcancel', this.boundUp);
      if (this.boundWheel) this.canvas.removeEventListener('wheel', this.boundWheel);
    }
    for (const canvas of this.container?.querySelectorAll('canvas') || []) releaseCanvas(canvas);
  }
};
