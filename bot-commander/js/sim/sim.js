// ゲームの中身（固定ステップ・決まった乱数）。DOM と Pixi は import しない。描画側は state を読むだけ。
// v0.2.0: ミッション（資材集め・巡回・脱出）を追加。createSim({ mission }) で有効になる。mission なしは従来の撃ち合い。
// v0.4.0-dev: 部隊をやめた。味方は1機ずつ命令する。人間（少年・少女）は別枠で出せる。
//   上限はロボット12機＋人間3人。敵の異星生物は「群れ」（AI の単位）のまま。
// v0.4.0-dev（10/23）: 着弾の演出と被弾の反応。撃つたびに武器の重さで相手がのけぞる・押される・よろける（js/fx/react.js）。
// v0.4.0-dev（10/23 09:2x〜09:37 の決定）: 巨大機も1枠。隊長の仕組みはぜんぶなし（決定2）。
//   AI で動く味方（5-5）はどの枠にも数えない。人間を捕まえた異星生物は、その場に残らず巣へ運んでいく。
// v0.4.0-dev（10/23 23:29 の決定）: 遮蔽物（js/sim/cover.js）。弾を止める・撃たれて壊れる・壊れたら物を落とす。見通しと通行は変えない。
// v0.4.0-dev（10/24 0:07 の決定）: 落とし物の武器パーツをやめて「武器が手に入る」。拾った機体は、持てて強ければそのミッションの間その武器に持ちかえる（u.weapon / u.wmul）。
// v0.4.1（10/24）: 敵の攻撃ペースを少し遅く。ENEMY_ATTACK_INTERVAL_MULT（下）で敵の攻撃間隔だけ×1.33。味方・移動・全体のテンポは同じ。
// v0.4.2（10/24）: 兵種「リペアラー」（cls: 'repairer'。サポーターから分けた新しい兵種）の能力をデータで持つ（UNIT_CLASS_CAPS）。KINDS に cls: 'repairer' の機体を足せば、
//   近くの味方にもキットを使い（回復が多い）、届けた資材からキットを作る。いまの試作にリペアラーの機体はまだない（PONCO・射撃型・重装型・ツギハギ号・人間）。
// v0.4.4（10/24）: シールド。味方ロボットは開始時に1枚（耐久＝最大HP×SHIELD_HP_FRAC）。攻撃は確率で盾が受ける（受けた一撃はよろけない。
//   盾が壊れる一撃のあまりは捨てる＝体には通らない）。撤退など DEFENSIVE_ORDERS の間は撃たずに盾で守る（盾があれば全部受ける）。
//   兵種ごとの盾の得意（UNIT_CLASS_CAPS.*.shield）: ガンナーは受ける確率 0.5・すり減り 0.7 倍。サポーターは資材から盾を作って壊れた機体に渡し、
//   リペアラーは盾を少しずつ直す（資材なし）。作る物（キット・盾）に使える資材は1回の出撃で CRAFT_SPEND_CAP まで（目標の100を割らないため）。
//   ミッションの機体に兵種を付けた（MISSION_1.ally の cls）: PONCO 8機＝ガンナー6・リペアラー1・サポーター1、ツギハギ号4機＝スカベンジャー。
// v0.4.3（10/24）: 兵種の一覧 UNIT_CLASSES（design_robot_identity_v3.md 11章 unitClasses。キーは小文字）。KINDS の cls で兵種を付ける。
//   KINDS（体の種類）には兵種を付けない。v0.4.4 からミッションの機体ごとに付ける（MISSION_1.ally の cls → makeUnit の extra.cls）。
// v0.4.2（10/24）: リペアキット。味方ロボットは開始時に START_REPAIR_KITS 個持ち、HP が AUTO_REPAIR_HP_FRAC を切ると勝手に使う。使い切ると fx 'kitEmpty'。
// v0.4.1（10/24）: よろけは強い一撃だけ（STUN_MIN_HP_FRAC・STUN_HEAVY_KINDS）。よろけた後は STUN_IMMUNE_SEC 秒よろけない。敵味方どちらも同じ。
import { registerRobotName } from '../names/robot-names.js?v=1';
import { createRng } from './rng.js?v=5';
import { generateMap, TILE, TERRAIN, T, tileAt, toTile, tileCenter, passable, nearestPassable, costAt } from './map.js?v=6';
import { createSearch, stepSearch } from './path.js?v=6';
// v0.4.7-dev 高さ（10/24 13:18・13:21 の決定）: 機体は z（既定 0）と動き方の一覧 moves（既定は地上だけ）を持つ。
//   狙う相手・当たるか・遮蔽物・地形の守りは altitude.js の表で決める。両方地上なら今までと同じ（結果も1つも変わらない）。
import { ALT_KINDS, ALT_SUBMERGED_WEAPON } from './alt-units.js?v=3'; // 飛ぶ機体・水陸両用機（?altunits=1 のお試しだけ。本編のミッションには出さない）
import { canHit, coverApplies, terrainDefApplies, altDistance, rangeVs, settleZ, DEFAULT_MOVES } from './altitude.js?v=1';
import { reaches, groupReaches } from './targeting.js?v=2'; // 敵の群れが追う相手を「届くか」で選ぶ（両方地上なら今までと同じ）
import { stepFuel, isRefueling } from './fuel.js?v=1'; // 飛ぶ機体の燃料（FUEL_TABLE にある種類だけ。本編の機体には何もしない）
import { initStory3, stepStory3, checkStory3Result, story3HashValues, story3Status } from './story3-sim.js?v=1'; // 第 3 章（?storych=3）のミッション 3-1・3-2 の仕掛け。sim.story3 がなければ何もしない
import { initStrike, stepStrike, applyStrikeCommand, STRIKE_COMMANDS, strikeHashValues, strikeStatus } from './strike.js?v=2'; // 物語の最初のミッション（v1.0.2）: ミサイル・発射台・調べる。sim.strike がなければ何もしない
import { NEW_ENEMY_KINDS, newEnemiesMission, initNewEnemies, stepNewEnemies, newEnemiesHashValues } from './new-enemies.js?v=2'; // 新しい敵 14 種（?newenemies=1 の試作）。createSim({ newEnemies: true }) でなければ何もしない
import { initStory2, stepStory2, checkStory2Result, story2Status, story2HashValues, story2PatrolTarget } from './story2-rules.js?v=2'; // 物語 第 2 章（?storych=2 の試作）: ミッションに story2 がある時だけ動く。ロウ（wolf）は KINDS に隠して足す
import { SHIELD_TABLE } from './shield-table.js?v=2'; // 機体ごとの盾と体の表（v0.4.12-dev）。createSim({ shieldTable }) で差しかえられる
import { FogGrid } from './fog.js?v=5';
import { ALERT, GATHER_RADIUS, EXTRACT_RADIUS, FIND, CAPTURE, LEASH } from './mission.js?v=10';
import { weaponById, KIND_WEAPON } from './weapons.js?v=7';
import { classify, hitReact, reactStep } from '../fx/react.js?v=2';
import { COVER, COVER_LAYOUT, DROPS, ITEMS, PICKUP, createCover, findCover, damageCover, rollDrop, canPickUp, applyItem, atkOf, gearTier, rollWeapon } from './cover.js?v=8';
import { applyLoadout } from '../armory/loadout.js?v=6'; // 武器庫の装備を出撃の時に機体へ反映（省いた・空なら何もしない）
import { pickShot, healByLoadout, withLoadoutShield } from './loadout-effects.js?v=5'; // 武器庫の装備の効き目（u.loadoutFx のある機体だけ。ない機体では何も起こらない）
import { LAUNCHER_KINDS, bindLauncher, createLauncherState, applyLauncherCommand, stepLauncher, hashLauncher } from './launcher.js?v=4'; // 発射台（?launcher=1 の試作）。sim.launcher が無ければ何もしない
import { initPowersuit, stepPowersuit, applyPowersuitCommand, breakSuit, isSuitSafe, powersuitHashValues, POWERSUIT_COMMANDS } from './powersuit.js?v=1'; // パワードスーツ（?powersuit=1 のお試し）。sim.powersuit がなければ何もしない・乱数も引かない
import { stepRide, onHostHit, cannotBeCaptured, riderCannotShoot, issueBoard, issueAlight, RIDE_MODE } from './ride.js?v=3'; // 人間がロボの背中・中に乗る（js/sim/ride.js）。だれも乗らない時（sim.ride なし）は何もしない

export const TICK = 1 / 30;          // 1ステップ＝1/30秒
export const SEARCH_BUDGET = 250;    // 1機1ステップで広げる A* ノード数
/** 敵の攻撃の間隔にかける倍率（v0.4.1）。1＝元のまま、1.33＝攻撃が約3/4の頻度。近接・射撃の連射間隔だけ変わる（弾の速さ・移動・味方は変えない） */
export const ENEMY_ATTACK_INTERVAL_MULT = 1.0; // v0.4.5: 1.33→1.0 に戻した（調整用に定数は残す）
/** よろけ（撃てない・動けない）は強い一撃だけ（v0.4.1）。1発のダメージが相手の最大HPのこの割合以上か、重い・爆発の武器なら。ふつうの弾は小さくのけぞるだけ */
export const STUN_MIN_HP_FRAC = 0.25;
/** よろけた後、この秒数はよろけない（よろけの連続で何もできなくなるのを防ぐ）。よろけが終わってから数える */
export const STUN_IMMUNE_SEC = 1.5;
/** 重い・爆発の武器（js/fx/react.js の classify の kind）。これはダメージが小さくてもよろける */
export const STUN_HEAVY_KINDS = Object.freeze(['heavy', 'explosion', 'shock']);
/** リペアキット（v0.4.2）。味方のロボット（人間以外）が出た時に持っている数 */
export const START_REPAIR_KITS = 1;
/** HP がこの割合を切ったら、持っているキットを勝手に1つ使う（撃つ・動くは止めない） */
export const AUTO_REPAIR_HP_FRAC = 0.40;
/** キット1つで回復する量（最大HPの割合）。落とし物の修理キット（cover.js の ITEMS.repair.heal）と同じ値 */
export const REPAIR_KIT_HEAL_FRAC = ITEMS.repair.heal;
/** 持てるキットの数の上限 */
export const MAX_CARRIED_KITS = 2;
/** リペアラー（兵種 cls: 'repairer'）: 持てる数・ほかの味方に使う時の回復量・届く距離 px・使う間隔 秒 */
export const REPAIRER_MAX_KITS = 3;
export const REPAIRER_KIT_HEAL_FRAC = 0.75;
export const REPAIRER_HEAL_RANGE = 80;
export const REPAIRER_HEAL_CD = 1;
/** リペアラーはキットを資材から作る: 1つ REPAIRER_KIT_BUILD_SEC 秒・REPAIRER_KIT_COST 資材（届けた資材「資材 n／100」から、作り始めに払う） */
export const REPAIRER_KIT_BUILD_SEC = 10;
export const REPAIRER_KIT_COST = 5;
/** 兵種の一覧（設計書 11章 unitClasses。データで足す）。key は KINDS の cls・UNIT_CLASS_CAPS・描画の CLASS_ICONS と同じ */
export const UNIT_CLASSES = Object.freeze([
  { key: 'rookie', name: '新入り', mark: '新' },
  { key: 'gunner', name: 'ガンナー', mark: 'ガ' },
  { key: 'scout', name: 'スカウト', mark: 'ス' },
  { key: 'supporter', name: 'サポーター', mark: 'サ' },
  { key: 'scavenger', name: 'スカベンジャー', mark: 'カ' },
  { key: 'stealth', name: 'ストーカー', mark: 'ト' },
  { key: 'repairer', name: 'リペアラー', mark: 'リ' },
  { key: 'giant', name: '巨大機', mark: '巨', giantOnly: true },
].map(c => Object.freeze(c)));
/** シールド（v0.4.4）: 耐久＝最大HPのこの割合・攻撃を盾が受ける確率（決まった乱数）。盾が壊れる一撃のあまりは捨てる */
export const SHIELD_HP_FRAC = 0.40;
export const SHIELD_BLOCK_CHANCE = 0.35;
/** 盾で守る命令（order.mode）。この間は撃たず、盾があれば DEFENSIVE_BLOCK_CHANCE で受ける。「防御」の命令を足すならここに足す */
export const DEFENSIVE_ORDERS = Object.freeze(['retreat']);
export const DEFENSIVE_BLOCK_CHANCE = 1.0;
/** ガンナーは盾が得意: 受ける確率・すり減り（受けたダメージ×この倍率だけ耐久が減る） */
export const GUNNER_SHIELD_BLOCK_CHANCE = 0.50;
export const GUNNER_SHIELD_WEAR_MULT = 0.7;
/** サポーター: 資材から盾を作り（SUPPORTER_SHIELD_BUILD_SEC 秒・SUPPORTER_SHIELD_COST 資材・予備は SUPPORTER_MAX_SHIELDS 枚まで）、
 *  SUPPORTER_GIVE_RANGE px 以内の盾が壊れた味方ロボット（自分も）に渡す。歩いては行かない */
export const SUPPORTER_SHIELD_BUILD_SEC = 15;
export const SUPPORTER_SHIELD_COST = 8;
export const SUPPORTER_MAX_SHIELDS = 1;
export const SUPPORTER_GIVE_RANGE = 80;
/** リペアラー: REPAIRER_SHIELD_RANGE px 以内のいちばん傷んだ盾（壊れた盾も。自分も）を、毎秒 盾の耐久×REPAIRER_SHIELD_REPAIR_FRAC ずつ直す（資材なし） */
export const REPAIRER_SHIELD_RANGE = 80;
export const REPAIRER_SHIELD_REPAIR_FRAC = 0.06;
/** 作る物（リペアキット・盾）に使える資材の上限（1回の出撃）。資材の山は計160・目標100で余りは60。上限 40 なら作り切っても 120 届く */
export const CRAFT_SPEND_CAP = 40;
/** 兵種ごとの能力（データ）。機体の cls で引く。repairOthers＝ほかの味方にキットを使う、kitCraft＝資材からキットを作る、maxKits＝持てる数、
 *  shieldRepair＝盾を直す、shieldCraft＝盾を作って渡す、shield＝盾の得意（blockChance 受ける確率・wearMult すり減りの倍率） */
export const UNIT_CLASS_CAPS = Object.freeze({
  repairer: Object.freeze({ repairOthers: true, kitCraft: true, maxKits: REPAIRER_MAX_KITS, shieldRepair: true }),
  supporter: Object.freeze({ shieldCraft: true }),
  gunner: Object.freeze({ shield: Object.freeze({ blockChance: GUNNER_SHIELD_BLOCK_CHANCE, wearMult: GUNNER_SHIELD_WEAR_MULT }) }),
});

/** 一度に出せる数。ロボット12機（決定）と人間3人（決定 09:25）は別枠。AI の味方（aiAlly）はどちらにも数えない */
export const FIELD_CAP = Object.freeze({ robots: 12, humans: 3 });

// 兵種（仮）。range/speed はワールド座標（1タイル=32）。gather＝1機が毎秒集める資材
export const KINDS = Object.freeze({
  gunner: { name: '射撃型', short: '射撃', hp: 100, atk: 8, range: 112, cooldown: 0.9, speed: 22, sight: 4.5, gather: 0.1 },
  heavy: { name: '重装型', short: '重装', hp: 160, atk: 13, range: 88, cooldown: 1.3, speed: 17, sight: 4, gather: 0.1 },
  // v0.2.0 ミッション用
  scav: { name: 'ツギハギ号', short: 'ツギハギ', hp: 60, atk: 1, range: 40, cooldown: 1.2, speed: 22, sight: 4.5, gather: 0.5, noFight: true },
  ponco: { name: 'PONCO02', short: 'PONCO', hp: 120, atk: 10, range: 112, cooldown: 0.9, speed: 20, sight: 4.5, gather: 0.1 },
  alien: { name: '異星生物', short: '異星', hp: 360, atk: 14, range: 44, cooldown: 1.2, speed: 16, sight: 4, gather: 0, regen: true },
  // v0.4.0-dev 人間（5-4: 足は速い・戦う力はゼロ・触られると捕まる）。数値は仮
  boy: { name: '少年', short: '少年', hp: 30, atk: 0, range: 0, cooldown: 1, speed: 30, sight: 4, gather: 0.2, noFight: true, human: true },
  girl: { name: '少女', short: '少女', hp: 30, atk: 0, range: 0, cooldown: 1, speed: 30, sight: 4.5, gather: 0.2, noFight: true, human: true },
  // v0.4.0-dev 巨大機（ラストタイタン・ZA-25 などの代わりの仮の数値。絵はまだない。ミッションには出していない）
  giant: { name: '巨大機（仮）', short: '巨大機', hp: 900, atk: 40, range: 128, cooldown: 1.6, speed: 12, sight: 5, gather: 0, giant: true },
  // v1.0.2 物語の発射台（掘り出したミサイルの台）。動かない物（object）: 盾・キットなし・ロボの枠に数えない・選べない。ネジがひっぱって動かす（strike.js）
  launcher: { name: 'ミサイル発射台', short: '発射台', hp: 150, atk: 0, range: 0, cooldown: 1, speed: 0, sight: 2, gather: 0, noFight: true, object: true },
  ...ALT_KINDS, // flyer（飛ぶ機体）・amph（水陸両用機）: js/sim/alt-units.js
}); // 新しい敵 14 種（js/sim/new-enemies.js の NEW_ENEMY_KINDS）は KINDS には足さない。?newenemies=1（createSim({ newEnemies: true })）の時だけ、そのシムの sim.neKinds に入れて引く（kindOf）
/** 種類の数値を引く。KINDS → 新しい敵（そのシムが ?newenemies=1 の時だけ）の順 */
const kindOf = (sim, kind) => KINDS[kind] || sim?.neKinds?.[kind];
export const isHuman = kind => !!KINDS[kind]?.human;
export const isGiant = kind => !!KINDS[kind]?.giant;
/** その機体がロボットの枠をいくつ使うか。巨大機も1枠（決定 09:23）。人間は別枠なので 0 */
export const isObject = kind => !!KINDS[kind]?.object;
export const slotCost = kind => (isHuman(kind) || isObject(kind) ? 0 : 1); // 発射台（物）も 0

// 従来の撃ち合い（ミッションなし）の配置。count 機を1マスずつ散らして置く
export const UNIT_SETUP = Object.freeze({
  ally: [
    { kind: 'gunner', tx: 13, ty: 52, count: 4 },
    { kind: 'heavy', tx: 20, ty: 50, count: 4 },
    { kind: 'gunner', tx: 27, ty: 52, count: 4 },
  ],
  enemy: [
    { name: '赤1', kind: 'heavy', tx: 20, ty: 9, role: 'guard', count: 4 },
    { name: '赤2', kind: 'gunner', tx: 11, ty: 14, role: 'raid', count: 4 },
    { name: '赤3', kind: 'gunner', tx: 29, ty: 14, role: 'raid', count: 4 },
  ],
});

// cover: 遮蔽物の置き場所（COVER_LAYOUT の形）。省くと、ミッションありなら COVER_LAYOUT、なしなら置かない
// mapEdit: 生成したマップを書き換える関数（テスト・お試し用。高さのお試しの池など）。本編では使わない
// loadout: 武器庫で選んだ装備 { 機体の名前: entry }（armory/loadout.js の applyLoadout）。省く・空なら今までと1つも変わらない
// shieldTable: 機体ごとの盾と体の表（shield-table.js の形）。省くと SHIELD_TABLE。SHIELD_TABLE_V0411 を渡すと v0.4.11 までの結果に戻る
// newEnemies: true なら、ミッションの異星生物を新しい敵 14 種（js/sim/new-enemies.js）に入れ替える（?newenemies=1）。省く・false なら今までと1つも変わらない
export function createSim({ seed = 1, mapSeed = 7, setup = UNIT_SETUP, mission = null, cover, mapEdit = null, loadout = null, shieldTable = SHIELD_TABLE, launcher = false, powersuit = false, newEnemies = false } = {}) {
  if (mission && newEnemies && !mission.ownAliens) mission = newEnemiesMission(mission); // ownAliens: 物語 2 章は自分で敵を決める（入れ替えない）
  const map = generateMap(mapSeed);
  if (mapEdit) mapEdit(map);
  const sim = {
    seed, tick: 0, time: 0, rng: createRng(seed), map,
    fog: new FogGrid(map.w, map.h),
    units: [], groups: [], commands: [], fx: [], result: null, resultReason: null, nextId: 1,
    mission: null, benched: [], shieldTable,
    ...(newEnemies || mission?.story2 ? { neKinds: NEW_ENEMY_KINDS } : {}), // ?newenemies=1 の時だけ、新しい敵 14 種をこのシムの種類の表に足す（ふつうは作らない。第 2 章のミッションも新しい敵を使うので入れる）
    cover: createCover(cover ?? (mission ? COVER_LAYOUT : [])), items: [], nextItemId: 1, loot: [], // loot: このミッションで拾った武器の id（拾った順）
  };
  if (mission) {
    sim.mission = createMissionState(map, mission);
    setup = {
      ally: mission.ally,
      enemy: mission.aliens.map(a => ({ ...a, role: a.role || 'patrol', tx: a.tx ?? a.route[0].tx, ty: a.ty ?? a.route[0].ty })),
    };
  }
  for (const def of setup.ally) {
    const n = Math.max(1, def.count ?? 1);
    const spots = spreadTiles(map, def.tx, def.ty, n, 4, def.moves);
    for (let j = 0; j < n; j++) {
      const cls = Array.isArray(def.cls) ? def.cls[j] ?? null : def.cls ?? null; // 兵種は機体ごと（配列なら j 機目）
      const u = deployUnit(sim, def.kind, spots[j], { label: n === 1 ? def.name : null, cd: j * 0.2, aiAlly: !!def.ai, cls, z: def.z, moves: def.moves });
      if (!u) sim.benched.push(def.kind); // 上限を超えた分は出さない（控え）
    }
  }
  setup.enemy.forEach((def, i) => spawnGroup(sim, def, i));
  if (newEnemies || mission?.story2) sim.ne = initNewEnemies(sim); // 新しい敵の状態（地雷など）と装甲
  if (loadout && !mission?.story2) applyLoadout(sim, loadout);
  if (mission?.survey) initStrike(sim, mission); // 物語の最初のミッション（v1.0.2）だけ
  if (launcher && sim.mission) sim.launcher = createLauncherState(); // 発射台（?launcher=1）。省く・false なら sim.launcher は作らない＝今までと1つも変わらない
  if (powersuit || mission?.suit) initPowersuit(sim); // ?powersuit=1（と、第 3 章のミッション）: 持ち主（少年）に殻が 1 着。ふつうは何もしない
  if (mission?.story3) initStory3(sim, mission); // 第 3 章（?storych=3）だけ
  if (mission?.story2) initStory2(sim, mission); // 物語 第 2 章（?storych=2）だけ
  updateFog(sim);
  return sim;
}

function createMissionState(map, m) {
  const ex = nearestPassable(map, m.extraction.tx, m.extraction.ty);
  return {
    id: m.id, target: m.target, delivered: 0, lost: 0, finds: [], humansLost: 0,
    salvage: m.salvage.map((p, i) => { const q = nearestPassable(map, p.tx, p.ty); return { id: i, tx: q.tx, ty: q.ty, amount: p.amount, max: p.amount, gathered: 0, nextFind: 0 }; }),
    extraction: { tx: ex.tx, ty: ex.ty },
    // 異星生物の巣（捕まえた人間を運んでいく先）。ない地図では null（その時は運ぶ個体の出てきた場所へ）
    nest: m.nest ? nearestPassable(map, m.nest.tx, m.nest.ty) : null,
  };
}

/** (tx,ty) の近くの、歩いてつながっているマスを近い順に n 個（足りなければ最後を繰り返す） */
export function spreadTiles(map, tx, ty, n, radius = 4, moves) {
  const c = nearestPassable(map, tx, ty, moves);
  if (!c) return Array(n).fill({ tx, ty });
  const seen = new Set([c.ty * map.w + c.tx]), q = [c], out = [];
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.tx + dx, y = p.ty + dy, k = y * map.w + x;
      if (seen.has(k) || Math.abs(x - c.tx) > radius || Math.abs(y - c.ty) > radius || !passable(map, x, y, moves)) continue;
      seen.add(k); q.push({ tx: x, ty: y });
    }
  }
  for (const p of q) out.push({ ...p, d: (p.tx - c.tx) ** 2 + (p.ty - c.ty) ** 2, a: Math.atan2(p.ty - c.ty, p.tx - c.tx) });
  out.sort((a, b) => a.d - b.d || a.a - b.a);
  const res = out.slice(0, n).map(p => ({ tx: p.tx, ty: p.ty }));
  while (res.length < n) res.push(res[res.length - 1]);
  return res;
}

function makeUnit(sim, side, kind, tile, extra = {}) {
  const k = KINDS[kind] || LAUNCHER_KINDS[kind] || sim.neKinds?.[kind]; // 新しい敵は ?newenemies=1 のシムだけ（sim.neKinds）。 発射台（?launcher=1）は KINDS には入れない（機体の表の数を変えない）
  const sr = side === 'ally' && !k.human ? sim.shieldTable?.[kind] : null; // 機体ごとの盾と体の表の行（なければ既定）
  const hp0 = sr?.hp ?? k.hp, shield0 = side === 'ally' && !k.human && !k.object ? Math.round(hp0 * (sr?.shieldFrac ?? SHIELD_HP_FRAC)) : 0;
  return {
    id: sim.nextId++, side, kind, label: extra.label || null, human: !!k.human, groupId: extra.groupId ?? null,
    x: tileCenter(tile.tx), y: tileCenter(tile.ty), hp: hp0, maxHp: hp0, atk: k.atk, range: k.range,
    cooldown: k.cooldown, cd: (extra.cd || 0) % k.cooldown, speed: k.speed, sight: k.sight,
    facing: side === 'ally' ? 1 : -1, moving: false, targetId: null, lastHit: -99,
    kits: side === 'ally' && !k.human && !k.object ? START_REPAIR_KITS : 0, // リペアキットの数（v0.4.2）
    shieldMax: shield0, // シールド（v0.4.4）。shieldHp 0＝壊れている。耐久は機体の表（v0.4.12-dev）
    shieldHp: shield0,
    shieldBlock: sr?.blockChance ?? SHIELD_BLOCK_CHANCE, shieldWear: sr?.wearMult ?? 1, armor: sr?.armor ?? 0, // 受ける確率・すり減り・体の装甲（機体の表。shieldStats と updateCombat が読む）
    cls: extra.cls || k.cls || null, // 兵種（'repairer' など。UNIT_CLASS_CAPS）。ミッションの機体ごと（MISSION_1.ally の cls）
    order: null, engaged: false, stance: extra.stance || 'hold', anchor: null, cargo: 0, gathering: null, speedMul: 1,
    captured: null, carrying: null, aiAlly: !!extra.aiAlly, home: { tx: tile.tx, ty: tile.ty },
    z: extra.z ?? k.z ?? 0, moves: extra.moves || k.moves || DEFAULT_MOVES, // 高さ（altitude.js）。今の機体はみな 0・地上だけ
    ...(k.object ? { object: true } : {}), // 物（発射台）だけ
  };
}

/** 出撃している数（ロボットの枠と人間の枠は別に数える。AI で動く味方は数えない） */
export function fieldCount(sim) {
  let robots = 0, humans = 0, ai = 0;
  for (const u of sim.units) {
    if (u.side !== 'ally') continue;
    if (u.aiAlly) { ai++; continue; }
    if (u.human) humans++; else robots += slotCost(u.kind);
  }
  return { robots, humans, ai, capRobots: FIELD_CAP.robots, capHumans: FIELD_CAP.humans };
}
export function canDeploy(sim, kind, { aiAlly = false } = {}) {
  if (aiAlly) return true; // 旅の仲間など AI の味方は枠の外（5-5。決定 09:25）
  const c = fieldCount(sim);
  return isHuman(kind) ? c.humans < FIELD_CAP.humans : c.robots + slotCost(kind) <= FIELD_CAP.robots;
}

/** 味方を1機出す。上限を超えるなら null（出さない）。aiAlly: true は AI で動く味方（枠に数えない・プレイヤーは選べない） */
export function deployUnit(sim, kind, tile, { label = null, cd = 0, aiAlly = false, cls = null, z, moves } = {}) {
  if (!(KINDS[kind] || LAUNCHER_KINDS[kind]) || !canDeploy(sim, kind, { aiAlly })) return null;
  const t = nearestPassable(sim.map, tile.tx, tile.ty, moves) || tile;
  const u = makeUnit(sim, 'ally', kind, t, { cd, stance: sim.mission && !aiAlly ? 'hold' : 'free', aiAlly, cls, z, moves });
  if (u.moves !== DEFAULT_MOVES) u.z = settleZ(u, TERRAIN[tileAt(sim.map, t.tx, t.ty)].key);
  const same = sim.units.filter(v => v.side === 'ally' && v.kind === kind).length;
  u.label = label || ((KINDS[kind] || LAUNCHER_KINDS[kind]).human ? KINDS[kind].short : `${(KINDS[kind] || LAUNCHER_KINDS[kind]).short}${same + 1}`);
  if (aiAlly && !label) u.label = `仲間の${u.label}`;
  registerRobotName(sim, u, label); // 表示名はシム外だけに保存
  sim.units.push(u);
  return u;
}

function spawnGroup(sim, def, index) {
  const g = {
    id: `e${index + 1}`, side: 'enemy', name: def.name, kind: def.kind ?? def.kinds?.[0], role: def.role || null, unitIds: [],
    aiTimer: index * 1.3, speedMul: 1,
  };
  if (g.role === 'patrol') {
    g.route = def.route.map(w => nearestPassable(sim.map, w.tx, w.ty));
    Object.assign(g, { routeIdx: 0, ai: 'patrol', alert: 0, lostTimer: 0, targetId: null, lastSeen: null, provokedBy: null });
  }
  const n = def.kinds ? def.kinds.length : Math.max(1, def.count ?? 4); // kinds: 1体ずつ種類がちがう群れ（新しい敵）
  const spots = spreadTiles(sim.map, def.tx, def.ty, n, 4, def.moves);
  for (let j = 0; j < n; j++) {
    const u = makeUnit(sim, 'enemy', def.kinds ? def.kinds[j] : def.kind, spots[j], { groupId: g.id, cd: j * 0.2, stance: g.role === 'patrol' ? 'hold' : 'free', z: def.z, moves: def.moves });
    if (u.moves !== DEFAULT_MOVES) u.z = settleZ(u, TERRAIN[tileAt(sim.map, spots[j].tx, spots[j].ty)].key);
    u.label = def.kinds ? kindOf(sim, u.kind).name : def.name;
    sim.units.push(u); g.unitIds.push(u.id);
  }
  sim.groups.push(g);
}

export const unitById = (sim, id) => sim.units.find(u => u.id === id) || null;
export const groupById = (sim, id) => sim.groups.find(g => g.id === id) || null;
export const groupUnits = (sim, g) => g.unitIds.map(id => unitById(sim, id)).filter(Boolean);
export const allyUnits = sim => sim.units.filter(u => u.side === 'ally');
const ids = x => (Array.isArray(x) ? x : [x]);
const wpList = waypoints => waypoints.map(w => ({ tx: w.tx, ty: w.ty }));

// ---- 命令（次のステップの頭で反映。入力のタイミングに左右されない＝再現できる） ----
/** 移動。mode: 'fight'＝戦闘移動（敵がいたら止まって撃つ） / 'rush'＝急行（撃たずに走り抜ける） */
export function issueOrder(sim, unitIds, waypoints, { mode = 'fight' } = {}) {
  sim.commands.push({ type: 'move', unitIds: ids(unitIds), waypoints: wpList(waypoints), mode });
}
/** この敵を狙う（届くところまで寄って撃つ） */
export function issueAttack(sim, unitIds, targetId) { sim.commands.push({ type: 'attack', unitIds: ids(unitIds), targetId }); }
/** 構え: 'hold'＝その場を守る（自分から寄らない） / 'free'＝迎撃（見えた敵に自分から寄る） */
export function issueStance(sim, unitIds, stance) { sim.commands.push({ type: 'stance', unitIds: ids(unitIds), stance }); }
/** 止まる（いまの命令を取り消す） */
export function issueStop(sim, unitIds) { sim.commands.push({ type: 'stop', unitIds: ids(unitIds) }); }
/** 撤退: 撃たずに味方の基地へ走る */
export function issueRetreat(sim, unitIds) { sim.commands.push({ type: 'retreat', unitIds: ids(unitIds) }); }

function applyOrder(sim, u, waypoints, mode = 'fight', attackId = null) {
  const wps = waypoints.slice(0, 4).map(w => nearestPassable(sim.map, w.tx, w.ty, u.moves)).filter(Boolean);
  if (!wps.length) { u.order = null; return; }
  // 新しい経路ができるまでは、前の経路のまま進む（命令を続けて出しても止まらないように）
  const old = u.order, prev = old && (old.planned.length ? old : old.prev) || null;
  u.order = {
    waypoints: wps, wpIndex: 0, from: { tx: toTile(u.x), ty: toTile(u.y) }, search: null, path: [], pathIdx: 0, planned: [],
    prev: prev ? { planned: prev.planned, pathIdx: prev.pathIdx } : null, mode, attackId, repath: 1,
  };
}

/** 何機かに同じ場所を命令したとき: 目的地のまわりに1マスずつ散らす（固まって範囲攻撃を受けないように） */
function applyGroupMove(sim, units, waypoints, mode) {
  if (!units.length || !waypoints.length) return;
  // 動き方がみな同じなら、その動き方で散らす（水陸両用機だけの組なら深い水の中にも散る）。混ざっていれば地上で散らし、各機が自分の通れる所へ寄せる
  const mv = units.every(u => u.moves === units[0].moves) ? units[0].moves : undefined;
  const last = nearestPassable(sim.map, waypoints[waypoints.length - 1].tx, waypoints[waypoints.length - 1].ty, mv);
  if (!last) return;
  if (units.length === 1) { applyOrder(sim, units[0], waypoints, mode); return; }
  const free = spreadTiles(sim.map, last.tx, last.ty, units.length, 4, mv);
  const lx = tileCenter(last.tx), ly = tileCenter(last.ty);
  const order = units.slice().sort((a, b) => Math.hypot(a.x - lx, a.y - ly) - Math.hypot(b.x - lx, b.y - ly) || a.id - b.id);
  for (const u of order) {
    let bi = 0, bd = Infinity;
    free.forEach((s, i) => { const d = Math.hypot(tileCenter(s.tx) - u.x, tileCenter(s.ty) - u.y); if (d < bd) { bd = d; bi = i; } });
    const s = free.splice(bi, 1)[0] || last;
    applyOrder(sim, u, [...waypoints.slice(0, -1), s], mode);
  }
}

/** 経路は経由点ごとに区切って差分 A* で作る。全区間がつながると order.planned に全体が入る（表示用） */
function advancePlanning(sim, u) {
  const o = u.order; if (!o) return;
  let budget = SEARCH_BUDGET;
  while (budget > 0 && o.planIndex !== o.waypoints.length) {
    o.planIndex ??= 0; o.segments ??= [];
    if (o.planIndex >= o.waypoints.length) break;
    const from = o.planIndex === 0 ? o.from : o.waypoints[o.planIndex - 1], to = o.waypoints[o.planIndex];
    o.search ??= createSearch(sim.map, from.tx, from.ty, to.tx, to.ty, u.moves);
    const before = o.search.expanded, st = stepSearch(o.search, budget);
    budget -= Math.max(1, o.search.expanded - before);
    if (st === 'running') return;
    const seg = st === 'found' ? o.search.path : [from, to];
    o.segments.push(o.planIndex === 0 ? seg : seg.slice(1));
    o.search = null; o.planIndex++;
    o.planned = o.segments.flat();
  }
}

// v0.4.0-dev 被弾の反応（js/fx/react.js）: のけぞり・押し戻し・よろけ。よろけている間（stun）は撃たない・動かない・捕まえない
const MASS = { alien: 1.5, giant: 3 };
export const massOf = kind => MASS[kind] || 1;
export const isStunned = u => (u._hr?.stun || 0) > 0; // 当たったその場から（reactStep を待たない）
const WCLASS = new Map();
/** その種類の武器の行と、演出の分類（kind/proj/w）。武器のない種類（人間）は null */
export function weaponInfo(kind) { return weaponInfoById(KIND_WEAPON[kind]); }
/** 武器の id → 行と演出の分類（拾った武器を持っている機体用） */
export function weaponInfoById(id) {
  if (!id) return null;
  if (!WCLASS.has(id)) { const row = weaponById(id); WCLASS.set(id, row ? { row, ...classify(row) } : null); }
  return WCLASS.get(id);
}
/** その機体がいま撃つ武器（拾った武器があればそれ） */
// v1.0.0: 水陸両用機は潜っている間（z<0）は魚雷（W3-12。altitude.js の WEAPON_TAGS で torpedo）を使う → 水中の相手も、水中から水面の相手も撃てる
const submergedWeapon = u => (u.z < 0 && ALT_SUBMERGED_WEAPON[u.kind] ? weaponInfoById(ALT_SUBMERGED_WEAPON[u.kind]) : null);
export const unitWeaponInfo = u => submergedWeapon(u) || (u.weapon && weaponInfoById(u.weapon)) || weaponInfo(u.kind);
/** 届くかの判定に渡す武器の行（446 行目・updateCombat と同じ。武器なしは null） */
const weaponRowOf = u => unitWeaponInfo(u)?.row ?? null;
const inMap = (sim, x, y) => x >= 0 && y >= 0 && x < sim.map.w * TILE && y < sim.map.h * TILE;
const canStand = (sim, x, y, moves) => inMap(sim, x, y) && passable(sim.map, toTile(x), toTile(y), moves);
/** 押し戻し: 水・マップの外へは押されない。まっすぐ行けなければ横か縦だけ動く（壁ぞいに滑る） */
export function pushUnit(sim, u, mx, my) {
  if (!mx && !my) return;
  if (canStand(sim, u.x + mx, u.y + my, u.moves)) { u.x += mx; u.y += my; }
  else if (mx && canStand(sim, u.x + mx, u.y, u.moves)) u.x += mx;
  else if (my && canStand(sim, u.x, u.y + my, u.moves)) u.y += my;
}
/** 強い一撃か（よろけてよいか）。よろけの後の無敵の間は強くてもよろけない */
export const isStrongHit = (sim, target, wi, dmg) =>
  !((target.stunImmuneUntil ?? -1) > sim.time) && (dmg >= STUN_MIN_HP_FRAC * target.maxHp || STUN_HEAVY_KINDS.includes(wi.kind));
/** 当たった時の反応。強い一撃はいままでどおり（のけぞる・押される・よろける）。ふつうの一撃は小さくのけぞる＋押し戻し（距離はそのまま）だけで、撃つ・動くは止めない。押し戻しを消すと異星生物が密着して3体で囲み、かえって早くやられた（10/24 計測） */
function applyHitReact(sim, best, wi, dir, dmg) {
  const o = { w: wi.w, dir, human: best.human, mass: massOf(best.kind), kind: wi.kind, dead: best.hp <= 0 };
  if (isStrongHit(sim, best, wi, dmg)) {
    const r = hitReact(best, o);
    if ((best._hr?.stun || 0) > 0) best.stunImmuneUntil = sim.time + best._hr.stun + STUN_IMMUNE_SEC;
    return r;
  }
  const R = best._hr, keep = R ? { stun: R.stun, hold: R.hold, T: R.T, res: R.res, down: R.down, hurt: R.hurt, hurtHold: R.hurtHold } : null;
  const tv0 = R ? R.tv : 0;
  const r = hitReact(best, o), H = best._hr;
  if (keep) Object.assign(H, keep);
  else Object.assign(H, { stun: 0, hold: 0, T: 0, res: 0, down: null, hurt: -1, hurtHold: 0 });
  H.tv = tv0 + (H.tv - tv0) * 0.3; H.tier = 0; // 小さくのけぞるだけ
  return { ...r, tier: 0, stun: 0, knockdown: false };
}
function updateReactions(sim, dt) {
  for (const u of sim.units) {
    if (!u._hr) continue;
    const q = reactStep(u, dt);
    if (u.captured == null) pushUnit(sim, u, q.moveX, q.moveY);
    if (q.stun) u.moving = false;
  }
}

function terrainSpeed(sim, x, y, moves) { return 1 / costAt(sim.map, toTile(x), toTile(y), moves); }

function moveToward(sim, u, tx, ty, speedMul, dt) {
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 0.5) { u.moving = false; return true; }
  const step = Math.min(d, u.speed * speedMul * terrainSpeed(sim, u.x, u.y, u.moves) * dt);
  const nx = u.x + dx / d * step, ny = u.y + dy / d * step;
  if (passable(sim.map, toTile(nx), toTile(ny), u.moves)) { u.x = nx; u.y = ny; }
  if (Math.abs(dx) > 1) u.facing = dx > 0 ? 1 : -1;
  u.moving = true;
  return d - step < 0.5;
}

/** 走っている間は撃たない・止まらない機体（急行・撤退中、戦わない機体の移動中） */
export const isPassive = u => !!u.order && (u.order.mode !== 'fight' || (!!KINDS[u.kind]?.noFight && !u.suitOn)); // スーツを着ている人間は戦闘移動で撃てる

function updateUnitMovement(sim, u, dt) {
  if (u.captured != null || isStunned(u) || isRefueling(u)) { u.moving = false; return; } // 燃料をためている飛ぶ機体は動けない
  const o = u.order, mul = (u.speedMul || 1) * (u.carrying != null ? CAPTURE.carryMul : 1);
  let stopped = u.engaged && !isPassive(u);
  if (o && o.attackId != null) {
    const t = unitById(sim, o.attackId);
    if (!t) { u.order = null; u.anchor = { x: u.x, y: u.y }; u.moving = false; return; }
    if (Math.hypot(t.x - u.x, t.y - u.y) <= u.range) stopped = true;
    // 相手が動いたら、1秒ごとに経路を作り直す（見えている間だけ）
    o.repath -= dt;
    if (o.repath <= 0) {
      o.repath = 1;
      const last = o.waypoints[o.waypoints.length - 1];
      if (sim.fog.isVisible(toTile(t.x), toTile(t.y)) && (last.tx !== toTile(t.x) || last.ty !== toTile(t.y))) applyOrder(sim, u, [{ tx: toTile(t.x), ty: toTile(t.y) }], 'fight', t.id);
    }
  }
  const ord = u.order;
  if (ord) advancePlanning(sim, u);
  if (ord && ord.planned.length) ord.prev = null;
  const pp = ord && !ord.planned.length && ord.prev && ord.prev.pathIdx < ord.prev.planned.length ? ord.prev : null;
  if (pp && !stopped) {
    const p = pp.planned[pp.pathIdx];
    if (moveToward(sim, u, tileCenter(p.tx), tileCenter(p.ty), mul, dt)) pp.pathIdx++;
  } else if (ord && !stopped && ord.planned.length) {
    // 経路の最初は自分のいるマスの中心。次のマスのほうへもう進んでいたら、戻らずに次へ
    if (ord.pathIdx === 0 && ord.planned.length > 1) {
      const q0 = ord.planned[0], q1 = ord.planned[1], x1 = tileCenter(q1.tx), y1 = tileCenter(q1.ty);
      if (Math.hypot(x1 - u.x, y1 - u.y) <= Math.hypot(x1 - tileCenter(q0.tx), y1 - tileCenter(q0.ty))) ord.pathIdx = 1;
    }
    const p = ord.planned[Math.min(ord.pathIdx, ord.planned.length - 1)];
    if (moveToward(sim, u, tileCenter(p.tx), tileCenter(p.ty), mul, dt)) {
      ord.pathIdx++;
      const wp = ord.waypoints[ord.wpIndex];
      if (wp && p.tx === wp.tx && p.ty === wp.ty) ord.wpIndex++;
      if (ord.pathIdx >= ord.planned.length && ord.planIndex >= ord.waypoints.length) { u.order = null; u.anchor = { x: u.x, y: u.y }; }
    }
  } else if (!ord && !u.engaged && u.stance === 'free' && (!KINDS[u.kind]?.noFight || u.suitOn) && u.atk > 0) {
    // 迎撃: 視界に入った敵へ自分から近づく。ミッションでは最後に止まった場所から LEASH マスまで
    const a = u.anchor || (u.anchor = { x: u.x, y: u.y });
    const leash = sim.mission ? LEASH * TILE : Infinity;
    let near = null, nd = u.sight * TILE;
    for (const e of sim.units) {
      if (e.side === u.side || (u.side === 'enemy' && e.human && !e.suitOn)) continue;
      if (!canHit(u, e, unitWeaponInfo(u)?.row)) continue; // 届かない帯の相手（地上の近接 → 空など）には寄らない
      const d = Math.hypot(e.x - u.x, e.y - u.y);
      if (d < nd && Math.hypot(e.x - a.x, e.y - a.y) <= leash + u.range) { nd = d; near = e; }
    }
    if (near && Math.hypot(u.x - a.x, u.y - a.y) < leash) moveToward(sim, u, near.x, near.y, 1, dt);
    else if (!near && Math.hypot(u.x - a.x, u.y - a.y) > 4) moveToward(sim, u, a.x, a.y, 1, dt);
    else u.moving = false;
  } else u.moving = false;
}

// 止まっている機体どうしが重ならないように、少しだけ押し合う（見た目と範囲攻撃のため）
const SEP = { robot: 14, alien: 24, human: 10 };
function separate(sim) {
  const us = sim.units;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (a.captured != null || a.ride) continue; // 乗っている人はロボと同じ場所（押し合わない）
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (b.captured != null || b.ride || a.side !== b.side) continue;
      if (a.moving && b.moving) continue;
      const r = Math.max(a.kind === 'alien' ? SEP.alien : a.human ? SEP.human : SEP.robot, b.kind === 'alien' ? SEP.alien : b.human ? SEP.human : SEP.robot);
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d < 0.01) { const ang = (a.id * 7 + b.id * 13) % 628 / 100; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
      const push = (r - d) * 0.15, px = dx / d * push, py = dy / d * push;
      if (!a.moving && passable(sim.map, toTile(a.x - px), toTile(a.y - py), a.moves)) { a.x -= px; a.y -= py; }
      if (!b.moving && passable(sim.map, toTile(b.x + px), toTile(b.y + py), b.moves)) { b.x += px; b.y += py; }
    }
  }
}

function updateCombat(sim, dt) {
  for (const u of sim.units) u.engaged = false;
  for (const u of sim.units) {
    u.cd = Math.max(0, u.cd - dt);
    if (u.captured != null || u.atk <= 0 || u.range <= 0 || riderCannotShoot(u)) { u.targetId = null; continue; } // v1.0.0: 乗っている人（背中・中）は撃てない
    if (isStunned(u)) { u.engaged = u.targetId != null && !isPassive(u); continue; } // よろけ中は撃たない（狙いはそのまま）。走っている機体は交戦扱いにしない（v0.4.1）
    const want = u.order?.attackId != null ? unitById(sim, u.order.attackId) : null;
    const wrow = unitWeaponInfo(u)?.row ?? null; // 帯をまたいで届くかは武器で決まる（altitude.js の REACH）
    let best = null, bd = Infinity;
    if (want && canHit(u, want, wrow) && altDistance(u, want) <= rangeVs(u, want, u.range)) best = want;
    else for (const e of sim.units) {
      if (e.side === u.side || e.hp <= 0) continue;
      if (u.side === 'enemy' && e.human && !e.suitOn) continue; // 人間は撃たない（捕まえる）。スーツを着ている人は撃つ（捕まらない）
      if (!canHit(u, e, wrow)) continue;
      const d = altDistance(u, e);
      if (d <= rangeVs(u, e, u.range) && d < bd) { bd = d; best = e; }
    }
    const lfs = u.loadoutFx ? pickShot(sim, u, best, want) : null; // 武器庫: 2つ目以降の武器のほうが強い・1つ目が届かない相手に届く時だけ値が返る
    if (lfs) best = lfs.target;
    u.targetId = best ? best.id : null;
    if (!best) continue;
    if (isPassive(u)) continue; // 走っている間は撃たない
    u.engaged = true;
    if (Math.abs(best.x - u.x) > 1) u.facing = best.x > u.x ? 1 : -1;
    if (u.cd > 0) continue;
    u.cd = u.side === 'enemy' ? u.cooldown * ENEMY_ATTACK_INTERVAL_MULT : u.cooldown;
    const def = terrainDefApplies(best) ? TERRAIN[tileAt(sim.map, toTile(best.x), toTile(best.y))].def : 1; // 空の相手には森・山の守りは効かない
    let dmg = Math.max(1, Math.round((lfs ? lfs.atk : atkOf(u)) * def * (0.85 + 0.3 * sim.rng())));
    // 撃たれた異星生物の群れは、撃ってきた相手にすぐ気づく（遮蔽物に止められても）
    const g = best.groupId ? groupById(sim, best.groupId) : null;
    if (g && g.role === 'patrol') g.provokedBy = u.id;
    // 遮蔽物: 相手が遮蔽物の中かすぐ横にいて、間にあれば、確率で弾を止める（乱数はそのときだけ引く）
    // 空・水中の相手には地上の遮蔽物は効かない（altitude.js の COVER_APPLIES）
    const cv = sim.cover.length && !(lfs && lfs.indirect) && coverApplies(u, best) ? findCover(sim.cover, u.x, u.y, best.x, best.y) : null; // 曲射(indirect)の武器は遮蔽物を越える
    if (cv && sim.rng() < COVER.kinds[cv.cover.kind].block) { hitCover(sim, u, best, cv, dmg); continue; }
    if (shieldBlocks(sim, best)) { hitShield(sim, u, best, dmg); continue; }
    if (best.armor > 0) dmg = Math.max(1, dmg - best.armor); // 体の装甲（機体の表）。体に当たる一撃だけ減らす。0 なら今までと同じ数
    best.hp -= dmg; best.lastHit = sim.time;
    if (best.hp <= 0 && best.suitOn) breakSuit(sim, best); // 殻が壊れた: 脱げて人間に戻る（あまりは捨てる）
    if (sim.ride) onHostHit(sim, best, dmg); // 背中に人が乗っていれば、確率でその人にも当たる
    if (best.hp > 0) autoRepair(sim, best);
    const wi = lfs ? weaponInfoById(lfs.row.id) : unitWeaponInfo(u);
    const react = wi ? applyHitReact(sim, best, wi, Math.atan2(best.y - u.y, best.x - u.x), dmg) : null;
    sim.fx.push({ type: 'shot', side: u.side, kind: u.kind, x1: u.x, y1: u.y - 10, x2: best.x, y2: best.y - 8, t: sim.time, dmg,
      weapon: wi?.row.id ?? null, from: u.id, to: best.id, toKind: best.kind, toSide: best.side, tier: react ? react.tier : -1, kill: best.hp <= 0 });
  }
  removeDead(sim);
}

// ---- シールド（v0.4.4） ----
/** 盾で守る命令の最中か（撤退など。DEFENSIVE_ORDERS） */
export const isDefensive = u => !!u.order && DEFENSIVE_ORDERS.includes(u.order.mode);
/** その機体の盾の得意: 機体の表（u.shieldBlock・u.shieldWear）の上に、兵種の得意（ガンナー: 受ける確率が既定より +0.15・すり減り ×0.7）を掛ける。
 *  守る命令の間の確率は 1.0。表が既定（0.35・1）の機体は、兵種の値そのもの（ガンナー 0.5・0.7）になる */
export function shieldStats(u) {
  const c = capsOf(u).shield || {};
  const base = u.shieldBlock ?? SHIELD_BLOCK_CHANCE;
  const lifted = c.blockChance == null ? base : Math.min(1, base + (c.blockChance - SHIELD_BLOCK_CHANCE));
  const s = { blockChance: isDefensive(u) ? DEFENSIVE_BLOCK_CHANCE : lifted, wearMult: (u.shieldWear ?? 1) * (c.wearMult ?? 1) };
  return u.loadoutFx ? withLoadoutShield(s, u) : s; // 武器庫のバリアの道具: 受ける確率を上から足す（loadout-effects.js）
}
/** この一撃を盾が受けるか。盾がなければ乱数を引かない。確率 1 以上なら引かない */
function shieldBlocks(sim, u) {
  if (!(u.shieldHp > 0)) return false;
  const p = shieldStats(u).blockChance;
  return p >= 1 || (p > 0 && sim.rng() < p);
}
/** 盾が受けた: 耐久が減る（よろけない・体は無傷）。壊れたら shieldBreak（あまりは捨てる） */
function hitShield(sim, u, best, dmg) {
  const wi = unitWeaponInfo(u);
  best.shieldHp = Math.max(0, best.shieldHp - dmg * shieldStats(best).wearMult); best.lastHit = sim.time;
  sim.fx.push({ type: 'shot', side: u.side, kind: u.kind, x1: u.x, y1: u.y - 10, x2: best.x, y2: best.y - 8, t: sim.time, dmg,
    weapon: wi?.row.id ?? null, from: u.id, to: best.id, toKind: best.kind, toSide: best.side, tier: -1, kill: false, shield: true });
  sim.fx.push({ type: 'shieldHit', unit: best.id, x: best.x, y: best.y, t: sim.time, dmg, left: best.shieldHp });
  if (best.shieldHp > 0) return;
  sim.fx.push({ type: 'shieldBreak', unit: best.id, unitKind: best.kind, label: unitName(best), x: best.x, y: best.y, t: sim.time });
}
/** 作る物に資材を払えるか（届けた資材が足りて、出撃ごとの上限 CRAFT_SPEND_CAP を超えない）。払えたら払う */
function payCraft(sim, cost) {
  const m = sim.mission;
  if (!m || m.delivered < cost || (m.spentOnCraft || 0) + cost > CRAFT_SPEND_CAP) return false;
  m.delivered -= cost; m.spentOnCraft = (m.spentOnCraft || 0) + cost;
  return true;
}
const shieldUser = u => carriesKits(u) && u.shieldMax > 0 && u.hp > 0 && u.captured == null;
/** サポーター: 盾を作り（予備が上限未満で資材があれば）、近くの盾が壊れた機体に渡す */
function supporterShield(sim, s, dt) {
  if (s.hp <= 0 || s.captured != null) return;
  if (s.shieldBuild != null) {
    s.shieldBuild += dt;
    if (s.shieldBuild >= SUPPORTER_SHIELD_BUILD_SEC - 1e-6) { s.shieldBuild = null; s.spareShields = (s.spareShields || 0) + 1; sim.fx.push({ type: 'shieldBuilt', unit: s.id, label: unitName(s), x: s.x, y: s.y, t: sim.time }); }
  }
  if ((s.spareShields || 0) > 0) {
    let best = null, bd = Infinity;
    for (const u of sim.units) {
      if (!shieldUser(u) || u.shieldHp > 0) continue;
      const d = Math.hypot(u.x - s.x, u.y - s.y);
      if (d <= SUPPORTER_GIVE_RANGE && d < bd) { bd = d; best = u; }
    }
    if (best) {
      s.spareShields--; best.shieldHp = best.shieldMax;
      sim.fx.push({ type: 'shieldGive', unit: best.id, label: unitName(best), by: s.id, x: best.x, y: best.y, bx: s.x, by2: s.y, t: sim.time });
    }
  }
  if (s.shieldBuild == null && (s.spareShields || 0) < SUPPORTER_MAX_SHIELDS && payCraft(sim, SUPPORTER_SHIELD_COST)) s.shieldBuild = 0;
}
/** リペアラー: 近くでいちばん傷んだ盾（壊れた盾も・自分も）を少しずつ直す。直している相手は s.shieldFix */
function repairerShield(sim, s, dt) {
  s.shieldFix = null;
  if (s.hp <= 0 || s.captured != null) return;
  let best = null;
  for (const u of sim.units) {
    if (!shieldUser(u) || u.shieldHp >= u.shieldMax) continue;
    if (Math.hypot(u.x - s.x, u.y - s.y) > REPAIRER_SHIELD_RANGE) continue;
    if (!best || u.shieldHp / u.shieldMax < best.shieldHp / best.shieldMax) best = u;
  }
  if (!best) return;
  const was = best.shieldHp;
  best.shieldHp = Math.min(best.shieldMax, best.shieldHp + best.shieldMax * REPAIRER_SHIELD_REPAIR_FRAC * dt);
  s.shieldFix = best.id;
  if (was <= 0) sim.fx.push({ type: 'shieldRestored', unit: best.id, label: unitName(best), by: s.id, x: best.x, y: best.y, t: sim.time });
}

// 弾が遮蔽物に止められた: 遮蔽物が代わりに傷む。壊れたら落とし物の抽選
function hitCover(sim, u, best, { cover: c, t }, dmg) {
  const wi = unitWeaponInfo(u);
  // 当たる位置: 弾の線が足場に入る所（足元の高さ）
  const hx = u.x + (best.x - u.x) * t, hy = u.y + (best.y - u.y) * t;
  const res = damageCover(c, dmg);
  sim.fx.push({ type: 'shot', side: u.side, kind: u.kind, x1: u.x, y1: u.y - 10, x2: hx, y2: hy - 8, t: sim.time, dmg,
    weapon: wi?.row.id ?? null, from: u.id, to: null, toKind: null, toSide: null, cover: c.id, coverKind: c.kind, tier: -1, kill: false });
  sim.fx.push({ type: 'coverHit', id: c.id, kind: c.kind, x: hx, y: hy, t: sim.time, dmg, state: c.state });
  if (res !== 'broke') return;
  sim.fx.push({ type: 'coverBreak', id: c.id, kind: c.kind, x: c.x, y: c.y, cx: c.cx, cy: c.cy, rx: c.rx, ry: c.ry, t: sim.time });
  dropFromCover(sim, c);
}

/** 壊れた遮蔽物の落とし物の抽選（弾で壊れた時と、発射台の爆発で壊れた時。乱数を引くのは壊れた時だけ） */
function dropFromCover(sim, c) {
  const type = rollDrop(DROPS[COVER.kinds[c.kind].drop], sim.rng());
  if (!type) return;
  const it = { id: sim.nextItemId++, type, x: c.x, y: c.y + 4, t: sim.time, from: c.id };
  if (type === 'weapon') { // 中身はここで決める（いまの装備の格の少し上が出やすい）。候補がなければ何も落とさない
    it.weapon = rollWeapon(gearTier(sim.units), sim.rng());
    if (!it.weapon) return;
  }
  sim.items.push(it);
  sim.fx.push({ type: 'drop', item: type, weapon: it.weapon ?? null, itemId: it.id, x: it.x, y: it.y, t: sim.time });
}

/** キットを持てる機体か（味方のロボット。人間はまだ持たない） */
export const carriesKits = u => u.side === 'ally' && !u.human;
const unitName = u => u.label || KINDS[u.kind]?.name || '味方';
/** その機体の兵種の能力（なければ空） */
export const capsOf = u => (u.side === 'ally' && UNIT_CLASS_CAPS[u.cls]) || {};
export const maxKits = u => capsOf(u).maxKits ?? MAX_CARRIED_KITS;
/** キットを1つ使って回復する（by が使う機体。自分かリペアラー）。使い切ったら kitEmpty を出す */
function useKit(sim, u, auto, by = u) {
  const before = u.hp, frac = by !== u ? REPAIRER_KIT_HEAL_FRAC : REPAIR_KIT_HEAL_FRAC;
  by.kits--; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * frac);
  sim.fx.push({ type: 'kitUse', auto, unit: u.id, unitKind: u.kind, label: unitName(u), by: by.id, byLabel: unitName(by), heal: Math.round(u.hp - before), kits: by.kits,
    x: u.x, y: u.y, bx: by.x, by_: by.y, t: sim.time });
  if (by.kits === 0) sim.fx.push({ type: 'kitEmpty', unit: by.id, unitKind: by.kind, label: unitName(by), x: by.x, y: by.y, t: sim.time });
}
/** リペアラー: 近くの味方ロボット（自分以外）で HP が AUTO_REPAIR_HP_FRAC を切っている機体に、キットを使う（いちばん減っている機体から）。歩いては行かない */
function repairerHeal(sim, s) {
  if (s.hp <= 0 || s.captured != null || !(s.kits > 0) || (s.healCd || 0) > 0) return;
  let best = null;
  for (const u of sim.units) {
    if (u === s || !carriesKits(u) || u.hp <= 0 || u.captured != null || u.hp >= u.maxHp * AUTO_REPAIR_HP_FRAC) continue;
    if ((u.kits || 0) > 0 && u.hp >= s.hp) continue; // 自分のキットがあれば自分で使う
    if (Math.hypot(u.x - s.x, u.y - s.y) > REPAIRER_HEAL_RANGE) continue;
    if (!best || u.hp / u.maxHp < best.hp / best.maxHp) best = u;
  }
  if (!best) return;
  useKit(sim, best, true, s); s.healCd = REPAIRER_HEAL_CD;
}
/** リペアラー: キットが上限未満で、届けた資材が足りれば、キットを作る（作り始めに資材を払う） */
function repairerBuild(sim, s, dt) {
  if (s.kitBuild != null) {
    s.kitBuild += dt;
    if (s.kitBuild >= REPAIRER_KIT_BUILD_SEC - 1e-6) { s.kitBuild = null; s.kits = (s.kits || 0) + 1; sim.fx.push({ type: 'kitBuilt', unit: s.id, label: unitName(s), kits: s.kits, x: s.x, y: s.y, t: sim.time }); }
    return;
  }
  if (s.hp <= 0 || s.captured != null || (s.kits || 0) >= maxKits(s)) return;
  if (payCraft(sim, REPAIRER_KIT_COST)) s.kitBuild = 0;
}
function updateKits(sim, dt) {
  if (sim.result) return;
  for (const u of sim.units) {
    const c = capsOf(u);
    if (c.repairOthers) { u.healCd = Math.max(0, (u.healCd || 0) - dt); repairerHeal(sim, u); }
    if (c.kitCraft) repairerBuild(sim, u, dt);
    if (c.shieldRepair) repairerShield(sim, u, dt);
    if (c.shieldCraft) supporterShield(sim, u, dt);
  }
  healByLoadout(sim, dt); // 武器庫の修理の道具（u.loadoutFx.heal のある機体だけ）
}
/** HP が AUTO_REPAIR_HP_FRAC を切っていて、キットがあれば勝手に使う */
export function autoRepair(sim, u) {
  if (u.hp <= 0 || u.captured != null || !(u.kits > 0) || u.hp >= u.maxHp * AUTO_REPAIR_HP_FRAC) return false;
  useKit(sim, u, true);
  return true;
}
/** 落ちている修理キットを拾うか。HP が減っていれば拾ってその場で使う。減っていなければ持ち物に足す（MAX_CARRIED_KITS まで）。どちらでもなければ拾わない */
function canTake(u, it) {
  if (u.suitOn) return false; // スーツを着ている間は拾えない（修理キットで殻は直らない・武器は小銃で固定）
  if (it.type !== 'repair') return canPickUp(u, it);
  if (u.hp < u.maxHp) return canPickUp(u, it);
  if (!carriesKits(u) || (u.kits || 0) >= maxKits(u)) return false;
  return canPickUp({ ...u, hp: u.maxHp - 1 }, it); // 満タンでも持ち物に足せる（距離などはいつもの判定）
}

// 落とし物: 味方が足元を通ると拾う。時間がたつと消える
function updatePickups(sim) {
  if (!sim.items.length) return;
  sim.items = sim.items.filter(it => sim.time - it.t < PICKUP.life);
  for (const it of sim.items) {
    const u = sim.units.find(v => canTake(v, it));
    if (!u) continue;
    let stored = false, equipped = false;
    if (it.type === 'repair' && u.hp >= u.maxHp) { u.kits = (u.kits || 0) + 1; stored = true; } // 減っていなければ持ち物へ
    else ({ equipped } = applyItem(u, it));
    it.taken = true;
    const w = it.weapon ? weaponById(it.weapon) : null;
    if (w) sim.loot.push(w.id);
    sim.fx.push({ type: 'pickup', item: it.type, name: w ? w.name : ITEMS[it.type].name, weapon: w?.id ?? null, equipped, stored, kits: u.kits || 0, unit: u.id, unitKind: u.kind, label: u.label, x: u.x, y: u.y, t: sim.time });
  }
  sim.items = sim.items.filter(it => !it.taken);
}

// 倒れた機体を消す。運んでいた資材はその機体の分だけ失う。捕まえていた敵が倒れたら人間は助かる。
function removeDead(sim) {
  const dead = sim.units.filter(u => u.hp <= 0);
  if (!dead.length) return;
  for (const d of dead) {
    sim.fx.push({ type: 'boom', x: d.x, y: d.y, t: sim.time, side: d.side, kind: d.kind, human: d.human });
    if (sim.mission && d.side === 'ally') { sim.mission.lost += d.cargo; if (d.human) sim.mission.humansLost++; }
  }
  sim.units = sim.units.filter(u => u.hp > 0);
  for (const u of sim.units) {
    // 運ばれている途中で、運んでいた個体が倒れた → その場に落ちて、すぐ動ける（＝救出）
    if (typeof u.captured === 'number' && !unitById(sim, u.captured)) freeHuman(sim, u);
  }
  for (const g of sim.groups) g.unitIds = g.unitIds.filter(id => unitById(sim, id));
  sim.groups = sim.groups.filter(g => g.unitIds.length);
}

function freeHuman(sim, h) {
  h.captured = null; h.heldAt = null; h.anchor = { x: h.x, y: h.y };
  sim.fx.push({ type: 'rescue', id: h.id, x: h.x, y: h.y, t: sim.time, side: 'ally' });
}

/** 捕まえた人間を運んでいく先: 巣（ミッションの nest）。巣がない地図では、その個体が出てきた場所。それもなければ地図の上の端 */
export function carryTarget(sim, e) {
  const n = sim.mission?.nest;
  if (n) return { tx: n.tx, ty: n.ty, nest: true };
  const h = e?.home && nearestPassable(sim.map, e.home.tx, e.home.ty);
  if (h) return { ...h, nest: false };
  return { ...(nearestPassable(sim.map, toTile(e?.x ?? 0), 0) || { tx: 0, ty: 0 }), nest: false };
}

// 人間は、異星生物（敵）に触られると捕まる（5-4）。捕まえた個体は群れを離れ、人間を抱えて巣へ運ぶ（決定 09:37）。
// 運んでいる間は遅い・撃たない（CAPTURE.carryMul）。途中で倒されると人間はその場に落ちて助かる。
// 巣に着くと人間は巣に置かれ、運んだ個体は巣に残る（仮）。ロボが巣に入り、巣のまわりに敵がいなくなると助かる（仮）。
function updateCaptures(sim) {
  for (const h of sim.units) {
    if (h.side !== 'ally' || !h.human || h.captured != null || cannotBeCaptured(h) || isSuitSafe(sim, h) || h.noCatch) continue; // スーツを着ている間・脱げて1.5秒は捕まらない。noCatch: 2 章のロウ。v1.0.0: 乗り終わっている人は背中でも中でも捕まらない（乗る途中・降りる途中は外にいる）
    for (const e of sim.units) {
      if (e.side !== 'enemy' || e.carrying != null || isStunned(e) || (e.z || 0) > 0) continue; // 1体で運べるのは1人。よろけ中は捕まえない。空の敵（z>0）は捕まえない
      if (Math.hypot(e.x - h.x, e.y - h.y) > CAPTURE.radius) continue;
      h.captured = e.id; h.heldAt = null; h.order = null; h.gathering = null; h.moving = false;
      if (sim.mission && h.cargo > 0) { sim.mission.lost += h.cargo; h.cargo = 0; }
      e.carrying = h.id; e.stance = 'hold'; e.speedMul = 1; e.targetId = null;
      const g = e.groupId ? groupById(sim, e.groupId) : null;
      if (g) { g.unitIds = g.unitIds.filter(id => id !== e.id); e.groupId = null; }
      sim.groups = sim.groups.filter(q => q.unitIds.length);
      const dest = carryTarget(sim, e);
      applyOrder(sim, e, [dest], 'carry');
      sim.fx.push({ type: 'captured', x: h.x, y: h.y, t: sim.time, side: 'ally', label: h.label });
      break;
    }
  }
}

/** 運ばれている人間は、運んでいる個体にくっついて動く。巣に着いたら巣に置く。巣の人間は、ロボが来て敵がいなくなると助かる */
function updateCarry(sim) {
  for (const e of sim.units) {
    if (e.carrying == null) continue;
    const h = unitById(sim, e.carrying);
    if (!h || h.captured !== e.id) { e.carrying = null; continue; }
    h.x = e.x + CAPTURE.holdOffset.x * (e.facing || 1); h.y = e.y + CAPTURE.holdOffset.y; h.facing = e.facing;
    const dest = carryTarget(sim, e), dx = tileCenter(dest.tx), dy = tileCenter(dest.ty);
    if (Math.hypot(e.x - dx, e.y - dy) <= CAPTURE.arriveRadius * TILE) {
      // 着いた: 人間を巣に置く。運んだ個体はその場に残り、巣の番をする（仮）
      const k = sim.units.filter(u => u.heldAt).length;
      h.captured = 'nest'; h.heldAt = { tx: dest.tx, ty: dest.ty, nest: dest.nest };
      h.x = dx + (k % 3 - 1) * 12; h.y = dy + 6;
      e.carrying = null; e.order = null; e.moving = false; e.stance = 'free'; e.anchor = { x: e.x, y: e.y };
      sim.fx.push({ type: 'nested', x: h.x, y: h.y, t: sim.time, side: 'ally', label: h.label });
    } else if (!e.order) applyOrder(sim, e, [dest], 'carry'); // 押し合いなどで止まったら、もう一度向かう
  }
  // 巣（または運ばれた先）に置かれた人間: そばにロボがいて、そばに敵がいなければ助かる
  for (const h of sim.units) {
    if (h.captured !== 'nest') continue;
    const r = CAPTURE.nestRescueRadius * TILE;
    const robot = sim.units.some(u => u.side === 'ally' && !u.human && !u.object && Math.hypot(u.x - h.x, u.y - h.y) <= r);
    const guard = sim.units.some(u => u.side === 'enemy' && Math.hypot(u.x - h.x, u.y - h.y) <= r);
    if (robot && !guard) freeHuman(sim, h);
  }
}

function groupMove(sim, g, wp) { applyGroupMove(sim, groupUnits(sim, g), [wp], 'fight'); }
const groupHasOrder = (sim, g) => groupUnits(sim, g).some(u => u.order);

// 敵のとても簡単な思考（従来の撃ち合い用）: 近くに味方が見えたら向かう。いなければ巡回。
function updateEnemyAI(sim, dt) {
  for (const g of sim.groups) {
    if (g.role === 'patrol') continue;
    g.aiTimer -= dt; if (g.aiTimer > 0) continue;
    g.aiTimer = 3 + sim.rng() * 2;
    const members = groupUnits(sim, g), c = members[0]; if (!c) continue;
    let near = null, nd = 7 * TILE;
    // 群れの誰か1体でも届く相手だけ追う（空・水中の相手に届かない群れは、近くにいても追わない＝「近くに味方がいない」時と同じ動き）
    for (const u of sim.units) if (u.side === 'ally') { const d = Math.hypot(u.x - c.x, u.y - c.y); if (d < nd && groupReaches(members, u, weaponRowOf)) { nd = d; near = u; } }
    if (near) { groupMove(sim, g, { tx: toTile(near.x), ty: toTile(near.y) }); continue; }
    if (groupHasOrder(sim, g)) continue;
    const m = sim.map, hq = m.hq.enemy;
    const t = g.role === 'guard'
      ? { tx: hq.tx - 6 + Math.floor(sim.rng() * 13), ty: hq.ty + 3 + Math.floor(sim.rng() * 7) }
      : { tx: 3 + Math.floor(sim.rng() * (m.w - 6)), ty: 8 + Math.floor(sim.rng() * 22) };
    groupMove(sim, g, t);
  }
}

/** 異星生物の群れが見ている味方の中で、一番近いもの（森の中の機体は近づかないと見えない）。捕まった人間は数えない */
export function groupSees(sim, g) {
  let best = null, bd = Infinity, closeness = 0;
  for (const a of groupUnits(sim, g)) {
    for (const u of sim.units) {
      if (u.side !== 'ally' || u.captured != null) continue;
      const inForest = tileAt(sim.map, toTile(u.x), toTile(u.y)) === T.FOREST;
      const range = a.sight * TILE * (inForest ? ALERT.forestSight : 1);
      const d = Math.hypot(u.x - a.x, u.y - a.y);
      if (d <= range && d < bd && reaches(a, u, weaponRowOf)) { bd = d; best = u; closeness = 1 - d / range; } // 見ている本人が届く相手だけ（届かない相手では気づきのゲージも上がらない）
    }
  }
  return best ? { unit: best, closeness } : null;
}

// 巡回する異星生物: 巡回 → 気づき（ゲージ）→ 追跡 → 見失ってあきらめる → 巡回路へ戻る
function updatePatrols(sim, dt) {
  for (const g of sim.groups) {
    if (g.role !== 'patrol') continue;
    const members = groupUnits(sim, g), c = members[0]; if (!c) continue;
    const seen = (sim.story2 && story2PatrolTarget(sim, g)) || groupSees(sim, g);
    if (g.provokedBy != null) {
      const p = unitById(sim, g.provokedBy);
      g.provokedBy = null;
      if (p && groupReaches(members, p, weaponRowOf)) { g.alert = 1; g.lastSeen = { tx: toTile(p.x), ty: toTile(p.y) }; if (g.ai !== 'chase') { g.ai = 'chase'; g.targetId = p.id; g.aiTimer = 0; } }
    }
    if (seen) {
      g.lostTimer = 0;
      g.alert = Math.min(1, g.alert + ALERT.rise * (1 + seen.closeness) * dt);
      if (g.ai === 'chase') g.targetId = seen.unit.id;
      g.lastSeen = { tx: toTile(seen.unit.x), ty: toTile(seen.unit.y) };
    } else {
      g.alert = Math.max(0, g.alert - ALERT.decay * dt);
    }
    if (g.ai !== 'chase' && g.alert >= 1 && seen) { g.ai = 'chase'; g.targetId = seen.unit.id; g.aiTimer = 0; }
    if (g.ai === 'chase') {
      g.speedMul = ALERT.chaseMul;
      if (!seen) g.lostTimer += dt;
      if (g.lostTimer >= ALERT.giveUp) {
        g.ai = 'return'; g.targetId = null; g.lastSeen = null; g.speedMul = 1; g.alert = Math.min(g.alert, 0.5);
        let bi = 0, bd = Infinity;
        g.route.forEach((w, i) => { const d = Math.hypot(tileCenter(w.tx) - c.x, tileCenter(w.ty) - c.y); if (d < bd) { bd = d; bi = i; } });
        g.routeIdx = bi; groupMove(sim, g, g.route[bi]);
      } else {
        g.aiTimer -= dt;
        if (g.aiTimer <= 0) {
          g.aiTimer = ALERT.repath;
          if (g.lastSeen && (seen || !groupHasOrder(sim, g))) groupMove(sim, g, g.lastSeen);
        }
      }
    } else {
      g.speedMul = 1;
      if (!groupHasOrder(sim, g)) {
        if (g.ai === 'return') g.ai = 'patrol';
        else g.routeIdx = (g.routeIdx + 1) % g.route.length;
        groupMove(sim, g, g.route[g.routeIdx]);
      }
    }
    for (const u of members) u.speedMul = g.speedMul;
  }
}

function updateRegen(sim, dt) {
  for (const u of sim.units) {
    const rg = kindOf(sim, u.kind)?.regen;
    if (!rg || u.hp >= u.maxHp) continue;
    if (sim.time - u.lastHit < ALERT.regenDelay) continue;
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * (ALERT.regenRate * (rg === true ? 1 : rg)) * dt); // rg が数なら回復力の倍率（新しい敵の 低0.5・中1・高2。異星生物は true＝1）
  }
}

// 回収と脱出: 止まっている機体は回収ポイントの近くで資材を集める（1機ずつ自分で運ぶ）。脱出口に入った機体が届ける。
// v1.0.0: ロボに乗っている人も集められる（決定）。狼の獣人（KINDS にない 'wolf'）はふつうの人間と同じ速さで集める
const STRIKE_API = Object.freeze({ deployUnit: (...a) => deployUnit(...a), removeDead: s => removeDead(s), gatherOf: u => gatherOf(u), isStunned: u => isStunned(u) });
const NE_API = Object.freeze({ reaches: (a, b) => reaches(a, b, weaponRowOf), applyOrder: (...a) => applyOrder(...a), removeDead: s => removeDead(s), autoRepair: (s, u) => autoRepair(s, u), cannotBeCaptured: h => cannotBeCaptured(h) || !!h.noCatch, isStunned: u => isStunned(u) });
const STORY2_API = Object.freeze({ deployUnit: (...a) => deployUnit(...a), applyOrder: (...a) => applyOrder(...a), removeDead: s => removeDead(s), gatherOf: u => gatherOf(u), isStunned: u => isStunned(u) }); // 物語 2 章（story2-rules.js）が使う
const gatherOf = u => (u.suitOn ? u.suitGather : KINDS[u.kind]?.gather ?? (u.human ? KINDS.boy.gather : 0));
function updateMission(sim, dt) {
  const m = sim.mission; if (!m) return;
  const allies = sim.units.filter(u => u.side === 'ally');
  for (const u of allies) u.gathering = null;
  const free = new Set(allies.filter(u => !u.order && !u.engaged && u.captured == null && !isStunned(u) && gatherOf(u) > 0));
  for (const p of m.salvage) {
    if (p.amount <= 0 || !free.size) continue;
    const px = tileCenter(p.tx), py = tileCenter(p.ty), r = GATHER_RADIUS * TILE;
    const near = [...free].filter(u => Math.hypot(u.x - px, u.y - py) <= r);
    if (!near.length) continue;
    const rate = near.reduce((a, u) => a + gatherOf(u), 0);
    const take = Math.min(p.amount, rate * dt);
    if (take <= 0) continue;
    p.amount = Math.max(0, p.amount - take); if (p.amount < 1e-6) p.amount = 0;
    const before = p.gathered; p.gathered += take;
    for (const u of near) { u.cargo += take * gatherOf(u) / rate; u.gathering = p.id; free.delete(u); }
    if (Math.floor(p.gathered) > Math.floor(before)) {
      const u = near[Math.floor(p.gathered) % near.length];
      sim.fx.push({ type: 'gain', x: u.x, y: u.y, t: sim.time, side: 'ally', n: 1, pile: p.id });
    }
    // 掘り出し物（小さなおまけ。乱数は seed 付き）。見つけた機体が持つ
    while (p.nextFind < FIND.at.length && p.gathered >= FIND.at[p.nextFind]) {
      p.nextFind++;
      if (sim.rng() < FIND.chance) {
        const name = FIND.names[Math.floor(sim.rng() * FIND.names.length)];
        const u = near[0];
        u.cargo += FIND.bonus;
        m.finds.push({ name, t: sim.time, unitId: u.id, pile: p.id });
        sim.fx.push({ type: 'find', x: u.x, y: u.y, t: sim.time, side: 'ally', name, n: FIND.bonus });
      }
    }
  }
  const ex = tileCenter(m.extraction.tx), ey = tileCenter(m.extraction.ty);
  for (const u of allies) {
    if (u.cargo > 0 && u.captured == null && Math.hypot(u.x - ex, u.y - ey) <= EXTRACT_RADIUS * TILE) {
      m.delivered += u.cargo; u.cargo = 0;
      sim.fx.push({ type: 'deliver', x: u.x, y: u.y, t: sim.time, side: 'ally' });
    }
  }
}

/** ミッションの集計（HUD 用）: 届けた量・運んでいる量・経過時間・掘り出し物・人間（制限時間はない） */
export function missionStatus(sim) {
  const m = sim.mission; if (!m) return null;
  const allies = sim.units.filter(u => u.side === 'ally');
  const carrying = allies.reduce((a, u) => a + u.cargo, 0);
  const left = m.salvage.reduce((a, p) => a + p.amount, 0);
  const humans = allies.filter(u => u.human);
  return {
    delivered: m.delivered, carrying, target: m.target, elapsed: sim.time, salvageLeft: left, finds: m.finds.length,
    ...fieldCount(sim), captured: humans.filter(h => h.captured != null).length,
    boyCaptured: humans.some(h => h.kind === 'boy' && h.captured != null),
    carried: humans.filter(h => typeof h.captured === 'number').length, atNest: humans.filter(h => h.captured === 'nest').length,
    ...(sim.strike ? { strike: strikeStatus(sim) } : {}), // 物語のミサイル・調べる（v1.0.2）
    ...(sim.story3 ? { story3: story3Status(sim) } : {}), // 第 3 章（?storych=3）
    ...(sim.story2 ? { story2: story2Status(sim) } : {}), // 物語 2 章
  };
}

function updateFog(sim) {
  const f = sim.fog; f.begin();
  const hq = sim.map.hq.ally; f.stamp(hq.tx, hq.ty, 6);
  if (sim.mission) f.stamp(sim.mission.extraction.tx, sim.mission.extraction.ty, 2);
  for (const u of sim.units) if (u.side === 'ally') f.stamp(toTile(u.x), toTile(u.y), u.captured != null ? 1.5 : u.sight);
  f.commit();
}

function applyCommands(sim) {
  for (const cmd of sim.commands.splice(0)) {
    if (cmd.type?.startsWith('launcher')) { applyLauncherCommand(sim, cmd); continue; } // 発射台の命令（sim.launcher が無ければ何もしない）
    if (STRIKE_COMMANDS.includes(cmd.type)) { applyStrikeCommand(sim, cmd); continue; } // v1.0.2 物語: つなぐ・はずす・撃つ
    if (POWERSUIT_COMMANDS.includes(cmd.type)) { applyPowersuitCommand(sim, cmd); continue; } // ?powersuit=1: 着る・脱ぐ
    if (cmd.type === 'board') { issueBoard(sim, cmd.humanId, cmd.hostId, cmd.mode || RIDE_MODE.BACK); continue; } // v1.0.2: 乗り降りもリプレイに残る命令にする（効くのは同じステップの stepRide）
    if (cmd.type === 'alight') { issueAlight(sim, cmd.humanIds || []); continue; }
    const us = (cmd.unitIds || []).map(id => unitById(sim, id)).filter(u => u && u.side === 'ally' && u.captured == null && !u.object);
    if (!us.length) continue;
    if (cmd.type === 'move') applyGroupMove(sim, us, cmd.waypoints, cmd.mode === 'rush' ? 'rush' : 'fight');
    else if (cmd.type === 'attack') {
      const t = unitById(sim, cmd.targetId);
      if (!t || t.side === 'ally') continue;
      for (const u of us) if (u.atk > 0 && (!KINDS[u.kind]?.noFight || u.suitOn)) applyOrder(sim, u, [{ tx: toTile(t.x), ty: toTile(t.y) }], 'fight', t.id);
    } else if (cmd.type === 'stance') {
      for (const u of us) { u.stance = cmd.stance === 'free' ? 'free' : 'hold'; u.anchor = { x: u.x, y: u.y }; }
    } else if (cmd.type === 'stop') {
      for (const u of us) { u.order = null; u.moving = false; u.anchor = { x: u.x, y: u.y }; }
    } else if (cmd.type === 'retreat') {
      const hq = sim.map.hq.ally;
      applyGroupMove(sim, us, [{ tx: hq.tx, ty: hq.ty - 2 }], 'retreat');
    }
  }
}

/** 一時停止中に命令を出したとき用: 時間を進めずに命令を反映し、経路を最後まで作る（経路の表示のため） */
export function applyCommandsNow(sim) {
  applyCommands(sim);
  for (const u of sim.units) for (let k = 0; k < 200 && u.order && u.order.planIndex !== u.order.waypoints.length; k++) advancePlanning(sim, u);
}

function checkResult(sim) {
  if (sim.result) return;
  const allies = sim.units.filter(u => u.side === 'ally');
  if (sim.mission) {
    const m = sim.mission;
    if (sim.strike) { checkStoryResult(sim, allies); return; }
    if (sim.story3) { checkStory3Result(sim, allies); return; } // 第 3 章（?storych=3）
    if (sim.story2) { checkStory2Result(sim, allies); return; } // 物語 2 章
    const robots = allies.filter(u => !u.human && !u.aiAlly && !u.object).length; // AI の味方だけ残っても続けられない（v1.0.4: 発射台＝物も数えない）
    const freeHumans = allies.filter(u => u.human && !u.aiAlly && u.captured == null).length;
    const boyCaptured = allies.some(u => u.kind === 'boy' && u.captured != null);
    // 少年が捕まったままでは、脱出（勝ち）にならない（5-4。仮）
    if (m.delivered >= m.target - 1e-6 && !boyCaptured) { sim.result = 'win'; sim.resultReason = 'extracted'; }
    else if (!robots && boyCaptured) { sim.result = 'lose'; sim.resultReason = 'boyCaptured'; }
    else if (!robots && !freeHumans) { sim.result = 'lose'; sim.resultReason = 'wiped'; }
    // 制限時間はない（決定）。時間がたつだけでは負けない
    return;
  }
  const e = sim.units.some(u => u.side === 'enemy');
  if (!e) sim.result = 'win'; else if (!allies.length) sim.result = 'lose';
}

// v1.0.2 物語の最初のミッション: 設計図のありかを調べ終えたら勝ち。ネジが壊れる・少年が捕まる・少年が倒れたら負け（発射台が壊れても負けにはしない）
function checkStoryResult(sim, allies) {
  const S = sim.strike, boy = allies.find(u => u.kind === 'boy');
  if (!allies.some(u => u.id === S.nejiId)) { sim.result = 'lose'; sim.resultReason = 'nejiDown'; }
  else if (!boy) { sim.result = 'lose'; sim.resultReason = 'boyDown'; }
  else if (boy.captured != null) { sim.result = 'lose'; sim.resultReason = 'boyCaptured'; }
  else if (S.survey.done) { sim.result = 'win'; sim.resultReason = 'blueprint'; }
}

/** 1ステップ進める */
export function stepSim(sim) {
  const dt = TICK;
  applyCommands(sim);
  updateEnemyAI(sim, dt);
  updatePatrols(sim, dt);
  updateCombat(sim, dt);
  stepNewEnemies(sim, dt, NE_API); // 新しい敵の特別な動き（sim.ne がなければ何もしない）
  updateRegen(sim, dt);
  updateReactions(sim, dt);
  for (const u of sim.units) updateUnitMovement(sim, u, dt);
  separate(sim);
  updateAltitude(sim);
  stepFuel(sim, dt, u => TERRAIN[tileAt(sim.map, toTile(u.x), toTile(u.y))].key === 'water'); // 飛ぶ機体だけ（表にない機体は何もしない）
  updateCaptures(sim);
  updateCarry(sim);
  if (sim.launcher) stepLauncher(sim, dt); // 発射台の建造・引く・構え・着弾（?launcher=1 の時だけ）
  stepPowersuit(sim, dt); // スーツの着る・脱ぐ・直す（sim.powersuit がなければ何もしない）
  stepRide(sim, dt); // 乗っている人をロボに合わせて動かす・乗り降り・壊れたら降ろす（sim.ride がなければ何もしない）
  updatePickups(sim);
  updateKits(sim, dt);
  updateMission(sim, dt);
  stepStrike(sim, dt, STRIKE_API); // 物語のミサイル・調べる（sim.strike がなければ何もしない）
  stepStory3(sim, dt, STRIKE_API); // 第 3 章（?storych=3）の仕掛け（sim.story3 がなければ何もしない）
  stepStory2(sim, dt, STORY2_API); // 物語 2 章（sim.story2 がなければ何もしない）
  updateFog(sim);
  sim.fx = sim.fx.filter(f => sim.time - f.t < (f.type === 'find' || f.type === 'captured' || f.type === 'rescue' || f.type === 'nested' || f.type === 'pickup' || f.type === 'coverBreak' || f.type === 'shieldGive' || f.type === 'shieldRestored' || f.type === 'missileFound' || f.type === 'strikeHit' || f.type === 'strikeLaunch' || f.type === 'launcherLost' || f.type === 'surveyDone' || f.type === 'strikeArm' || f.type === 'mintFound' || f.type === 'gateDone' ? 2.2 : f.type === 'gain' ? 1 : 0.8));
  sim.tick++; sim.time = sim.tick * TICK;
  checkResult(sim);
}

/** 足元の地形に合わせて z を決める（水陸両用機が深い水に入ると潜る）。既定の動き方（地上だけ）の機体は何もしない */
function updateAltitude(sim) {
  for (const u of sim.units) if (u.moves !== DEFAULT_MOVES && u.captured == null) u.z = settleZ(u, TERRAIN[tileAt(sim.map, toTile(u.x), toTile(u.y))].key);
}

export function runSim(sim, steps) { for (let i = 0; i < steps; i++) stepSim(sim); return sim; }

/** 状態の要約ハッシュ（同じ seed・同じ命令なら同じ値になることをテストで確かめる） */
export function hashSim(sim) {
  let h = 2166136261 >>> 0;
  const mix = v => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; };
  mix(sim.tick); mix(sim.rng.state());
  for (const u of sim.units) { mix(u.id); mix(Math.round(u.x * 100)); mix(Math.round(u.y * 100)); mix(Math.round(u.hp * 100)); mix(Math.round(u.cargo * 1000)); mix(u.captured === 'nest' ? -2 : u.captured ?? -1); }
  for (const b of sim.fog.seen) mix(b);
  if (sim.mission) {
    mix(Math.round(sim.mission.delivered * 1000));
    for (const p of sim.mission.salvage) mix(Math.round(p.amount * 1000));
    mix(sim.mission.finds.length);
  }
  for (const g of sim.groups) mix(Math.round((g.alert || 0) * 1000));
  for (const c of sim.cover) mix(Math.round(c.hp * 100));
  for (const it of sim.items) { mix(it.id); mix(Math.round(it.x)); mix(Math.round(it.y)); }
  for (const u of sim.units) if (u.weapon) mix(Math.round((u.wmul || 1) * 1000));
  for (const u of sim.units) if (u.z) { mix(u.id); mix(Math.round(u.z * 100)); } // 高さ（0 の機体は混ぜない＝今までのハッシュと同じ）
  if (sim.powersuit) for (const v of powersuitHashValues(sim)) mix(v); // スーツ入りの局面だけ（ふつうは混ぜない＝今までのハッシュと同じ）
  if (sim.ne) for (const v of newEnemiesHashValues(sim)) mix(v); // 新しい敵（?newenemies=1 だけ。ほかでは混ぜない＝今までのハッシュと同じ）
  if (sim.strike) for (const v of strikeHashValues(sim)) mix(v); // 物語のミサイル（ほかのミッションでは混ぜない＝今までのハッシュと同じ）
  if (sim.launcher) h = hashLauncher(sim, h); // 発射台（使っていない間は何も混ぜない）
  if (sim.story3) for (const v of story3HashValues(sim)) mix(v); // 第 3 章（?storych=3）だけ
  if (sim.story2) for (const v of story2HashValues(sim)) mix(v); // 物語 2 章（ほかでは混ぜない）
  return h.toString(16);
}

/** hashSim が混ぜていない値（盾・キット・構え・撃つ間隔・命令の進み・群れの状態・作る資材の枠）も混ぜた深いハッシュ（テスト用）。今の hashSim の値は変えない */
export function hashSimDeep(sim) {
  let h = parseInt(hashSim(sim), 16) >>> 0;
  const mix = v => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; };
  for (const u of sim.units) {
    mix(u.id); mix(Math.round((u.shieldHp || 0) * 100)); mix(u.kits || 0); mix(u.stance === 'free' ? 1 : 0); mix(Math.round((u.cd || 0) * 1000));
    mix(u.order ? Math.round(u.order.pathIdx || 0) + 1 : 0); mix(u.order ? (u.order.planIndex || 0) + 1 : 0); mix(u.order ? (u.order.wpIndex || 0) + 1 : 0);
    mix(u.engaged ? 1 : 0); mix(Math.round((u.speedMul || 1) * 1000));
  }
  for (const g of sim.groups) { mix(g.ai === 'chase' ? 2 : g.ai === 'return' ? 1 : 0); mix(g.routeIdx || 0); }
  if (sim.mission) mix(Math.round((sim.mission.spentOnCraft || 0) * 1000));
  return h.toString(16);
}

// 発射台（js/sim/launcher.js）に、機体を出す・探す・移動命令を渡す（launcher.js は sim.js を import しない）
bindLauncher({ deployUnit, issueOrder, dropFromCover }); // dropFromCover: 爆発で壊れた遮蔽物も、弾で壊れた時と同じ落とし物の抽選（佳之さんの決定 10/26）
