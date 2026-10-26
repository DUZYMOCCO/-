// 武器庫で選んだ装備を、戦闘で効かせる計算。DOM・Pixi・Math.random なし（乱数は1回も引かない）。
// v0.4.12-dev（10/25 お試し）: 2つ目以降の武器・背中・IT-01 の枠・修理の道具・バリアの道具を戦闘に効かせる。
// 装備を選んだ機体（applyLoadout が u.loadoutFx を付けた機体）だけで動く。付けていない機体・省いた loadout では、
// ここの関数は何も起こさない（sim.js からは「u.loadoutFx があれば呼ぶ」だけ）。
// 1つ目の武器（u.weapon・u.wmul・u.range）のふるまいは変えない。
import { weaponById, weaponPower, TIER_BASE } from './weapons.js?v=7';
import { WEAPON_DROP, weaponMul, weaponOfUnit } from './cover.js?v=8';
import { canHit, altDistance, rangeVs, unitBand, BAND } from './altitude.js?v=1';

// ---- 射程（マス） ----
/** 射程の分け方（資料 roster の 近/短/中/長/超長）→ シムでの距離（px）。1マス＝32px。
 *  シムの機体の射程に合わせた表: PONCO02 の今の射程 112px＝3.5マス＝「中」。資料の range（150・280 など）は別の物差しなので使わない（CHANGES.md） */
export const RANGE_PX = Object.freeze({ melee: 40, short: 80, mid: 112, long: 160, xlong: 224 });
export const TILE_PX = 32;
/** 0.5 マスきざみに丸める */
export const roundHalf = v => Math.round(v * 2) / 2;
/** カードに出す射程（マス）。表にある range_key はその値（melee 1.25・short 2.5・mid 3.5・long 5・xlong 7）。
 *  表にない物で range（px）があれば range÷32 を 0.5 マスきざみに丸める。自分・置く場所など距離のない物は null */
export function rangeTiles(row) {
  if (!row) return null;
  const px = RANGE_PX[row.range_key];
  if (px) return px / TILE_PX;
  return row.range > 0 ? roundHalf(row.range / TILE_PX) : null;
}

// ---- 武器ごとの射程の分けと特殊効果（armory-data.json の range_key・special の写し。tests/loadout-effects.test.mjs が同じか確かめる） ----
// 'id': '射程の分け|特殊効果,特殊効果'。sim は armory-data.json を読めない（DOM なしの同期）ので、ここに持つ。
const TRAITS = Object.freeze({
  'W1-01': 'short',
  'W1-02': 'mid|suppress',
  'W1-07': 'melee',
  'W1-03': 'short',
  'W1-09': 'short',
  'W1-04': 'long',
  'W1-12': 'mid|jam',
  'W1-05': 'mid|suppress',
  'W1-06': 'mid',
  'W1-08': 'melee',
  'WB1-03': 'short',
  'WB1-04': 'short',
  'WR1-02': 'melee|hold_target',
  'WR1-03': 'melee|hold_target',
  'WB1-01': 'self|front_only',
  'WB1-02': 'self|front_only',
  'W1-11': 'melee',
  'WR1-01': 'melee',
  'W2-01': 'mid',
  'W2-02': 'melee',
  'W2-03': 'long',
  'W2-05': 'long',
  'W2-06': 'xlong',
  'W2-08': 'melee',
  'W2-07': 'short',
  'WB2-03': 'mid',
  'W2-04': 'melee|hold_target',
  'WR2-03': 'short|hold_target',
  'WB2-01': 'short|front_only',
  'WB2-02': 'short',
  'WR2-01': 'melee',
  'WR2-02': 'melee',
  'W3-01': 'mid|suppress',
  'W3-02': 'short|burn_regen_stop',
  'W3-05': 'melee|interrupt',
  'W3-03': 'melee|pierce_armor',
  'W3-07': 'long|track',
  'W3-09': 'mid|jam,debuff',
  'W3-04': 'xlong|indirect',
  'W3-11': 'mid|antiair',
  'W3-12': 'long',
  'W3-13': 'short|armor_down',
  'W3-10': 'xlong|line_pierce',
  'W3-14': 'xlong|charge',
  'W3-15': 'xlong|stealth_keep',
  'W3-17': 'melee|knockback',
  'W3-16': 'xlong|vs_large',
  'WB3-03': 'mid|reach_air',
  'WB3-04': 'mid',
  'WR3-03': 'short|hold_target',
  'WR3-04': 'mid|hold_target',
  'WB3-01': 'short|front_only',
  'WB3-02': 'short',
  'W3-08': 'short|heal_in_combat',
  'WR3-01': 'short|heal_in_combat',
  'WR3-02': 'short|heal_in_combat',
  'W4-01': 'melee',
  'W4-03': 'xlong|track',
  'W4-02': 'melee|pierce_armor',
  'W4-04': 'xlong|line_pierce',
  'WB4-01': 'mid|front_only',
  'WR4-01': 'self|self_only',
});
const traitCache = new Map();
/** 武器の id → { rangeKey, special: [...] }（武器の枠・修理/バリアの枠の物だけ。ない id は null） */
export function traitsOf(id) {
  if (!traitCache.has(id)) {
    const t = TRAITS[id];
    if (!t) traitCache.set(id, null);
    else { const [rangeKey, sp = ''] = t.split('|'); traitCache.set(id, Object.freeze({ rangeKey, special: Object.freeze(sp ? sp.split(',') : []) })); }
  }
  return traitCache.get(id);
}
export const traitIds = () => Object.keys(TRAITS);

/** 特殊効果が戦闘で効くか。'active'＝効く／'name'＝名前とカードの説明だけ（まだ効かない） */
export const SPECIAL_EFFECT = Object.freeze({
  vs_large: 'active', antiair: 'active', indirect: 'active', heal_in_combat: 'active', self_only: 'active',
  suppress: 'name', burn_regen_stop: 'name', root: 'name', interrupt: 'name', pierce_armor: 'name', track: 'name', armor_down: 'name', line_pierce: 'name',
  charge: 'name', stealth_keep: 'name', knockback: 'name', hold_target: 'name', front_only: 'name', jam: 'name', debuff: 'name', reach_air: 'name',
});

// ---- 数値（仮。資料に絶対値がない物は、ここで調整する） ----
export const FX = Object.freeze({
  largeHp: 300,            // vs_large: 最大HPがこれ以上の敵を「巨大」とみなす（異星生物 360・巨大機 900）【仮】
  vsLargeMul: 1.5,         // vs_large: 巨大な敵への攻撃力の倍率【仮】
  antiairMul: 1.5,         // antiair: 空の敵への攻撃力の倍率【仮】
  healK: 0.001,            // 修理: 1秒あたりに直す割合（相手の最大HPに対して）＝ weaponPower(道具) × この値。溶接トーチ(T1・1秒)で 1%/秒【仮】
  healCap: 0.10,           // 修理: 1秒あたりに直す割合の上限【仮】
  healQuietSec: 2,         // 修理: 戦闘中も直す(heal_in_combat)でない道具は、相手がこの秒数 撃たれていない時だけ直す【仮】
  healMinRange: 40,        // 修理: 近(melee)の道具でも、このpx 以内の味方は直せる
  healAreaTargets: 3,      // 修理: 範囲(splash>0)の道具が一度に直す数（資料 WR2-03「範囲・3体まで」）
  shieldBlockFast: 0.10,   // バリア: 速い小盾(モーション2秒未満)が足す「受ける確率」の基本【仮】
  shieldBlockPerTier: 0.005, // バリア: 格(T)ごとの上乗せ
  shieldBlockCap: 0.30,    // バリア: 足す確率の合計の上限
  fastMotion: 2,           // 速い小盾の境（モーション秒）
});

// ---- 出撃の時に作る「効き目」 ----
/** 修理の道具 1つ → { id, rate, range, targets, inCombat, selfOnly }。rate＝1秒に直す割合（相手の最大HPの） */
function repairFx(row, tr) {
  const sp = tr.special;
  const px = RANGE_PX[tr.rangeKey] || 0;
  return {
    id: row.id, rate: Math.min(FX.healCap, weaponPower(row) * FX.healK), range: Math.max(px, FX.healMinRange),
    targets: row.splash > 0 ? FX.healAreaTargets : 1, inCombat: sp.includes('heal_in_combat'), selfOnly: sp.includes('self_only') || tr.rangeKey === 'self',
  };
}
/** バリアの道具 1つ → { hp, block }。hp＝足すシールドの耐久（資料 7-1「防ぐ量＝格の基本値×モーション^1.75」。機体の最大HPまで）、block＝足す「受ける確率」（速い小盾だけ） */
function barrierFx(row, maxHp) {
  const hp = Math.round(Math.min(maxHp, TIER_BASE(row.tier) * Math.pow(row.motion_s, 1.75)));
  const block = row.motion_s < FX.fastMotion ? Math.min(FX.shieldBlockCap, FX.shieldBlockFast + FX.shieldBlockPerTier * row.tier) : 0;
  return { hp, block };
}

/**
 * 1機の装備（entry）→ 戦闘の効き目 { guns, heal, shield }。何も効かなければ null（u.loadoutFx を付けない）。
 * - guns: 2つ目以降の武器の枠（IT-01 で増えた枠も）と背中の枠のうち、この機体が持てる type の物。{ id, row, range(px), mul, power, special }
 * - heal: 修理の道具（支援の枠）。repairFx
 * - shield: バリアの道具の合計 { hp, block }
 */
export function buildLoadoutFx(u, entry) {
  const acc = WEAPON_DROP.accepts[u.kind] || [];
  const guns = [];
  for (const id of [...(entry.weapon || []).slice(1), ...(entry.back || [])]) {
    const row = id ? weaponById(id) : null, tr = row && traitsOf(id);
    if (!row || !tr || row.slot !== 'weapon' || !acc.includes(row.type) || !RANGE_PX[tr.rangeKey]) continue;
    guns.push({ id, row, range: RANGE_PX[tr.rangeKey], mul: weaponMul(u.kind, row), power: weaponPower(row), special: tr.special });
  }
  const heal = [];
  let hp = 0, block = 0;
  for (const id of entry.support || []) {
    const row = id ? weaponById(id) : null, tr = row && traitsOf(id);
    if (!row || !tr || row.slot !== 'support') continue;
    if (row.type === 'repair') heal.push(repairFx(row, tr));
    else if (row.type === 'barrier') { const b = barrierFx(row, u.maxHp); hp += b.hp; block += b.block; }
  }
  const shield = hp > 0 || block > 0 ? { hp, block: Math.min(FX.shieldBlockCap, block) } : null;
  return guns.length || heal.length || shield ? { guns, heal, shield } : null;
}

// ---- 戦闘: 2つ目以降の武器の使い分け ----
const visibleTo = (sim, e) => sim.fog.isVisible(Math.floor(e.x / TILE_PX), Math.floor(e.y / TILE_PX));

/**
 * 撃つ時に、いま狙う相手に届く武器のうち一番強い物（weaponPower）を選ぶ。1つ目の武器（u.weapon か種類の武器・射程 u.range）も候補に入れる。
 * best＝1つ目の武器で見つけた相手（なければ null）、want＝命令で指定された相手（なければ null）。
 * - 1つ目の武器が一番強い（同じ強さも）、または2つ目以降で届く物がなければ null（今までの撃ち方のまま）
 * - 1つ目の武器が届く相手がいなければ、2つ目以降の武器が届く相手を探す（命令の相手→いちばん近い相手。見えている相手だけ）
 * 返り値: { target, row, atk, indirect }。atk はこの一撃の攻撃力（機体の atk × 武器の倍率 × 特殊効果）。撃つ間隔は1つ目と同じ（u.cooldown）
 * 空の敵への届き方は altitude.js の canHit・rangeVs（今の決まり）。乱数は引かない
 */
export function pickShot(sim, u, best, want) {
  const fx = u.loadoutFx;
  if (!fx || !fx.guns.length) return null;
  const reach = (row, range, e) => canHit(u, e, row) && altDistance(u, e) <= rangeVs(u, e, range);
  let target = best;
  if (!target) {
    const ok = e => e.hp > 0 && e.side !== u.side && visibleTo(sim, e) && fx.guns.some(g => reach(g.row, g.range, e));
    if (want && ok(want)) target = want;
    else {
      let bd = Infinity;
      for (const e of sim.units) { if (!ok(e)) continue; const d = altDistance(u, e); if (d < bd) { bd = d; target = e; } }
    }
    if (!target) return null;
  }
  const primary = weaponOfUnit(u);
  let top = primary && reach(primary, u.range, target) ? weaponPower(primary) : -Infinity, pick = null;
  for (const g of fx.guns) if (g.power > top && reach(g.row, g.range, target)) { top = g.power; pick = g; }
  if (!pick) return null;
  let atk = u.atk * pick.mul;
  if (pick.special.includes('vs_large') && target.maxHp >= FX.largeHp) atk *= FX.vsLargeMul;
  if (pick.special.includes('antiair') && unitBand(target) === BAND.AIR) atk *= FX.antiairMul;
  return { target, row: pick.row, atk, indirect: pick.special.includes('indirect') };
}

// ---- 戦闘: 修理の道具 ----
/**
 * 修理の道具を持つ機体が、近くの味方ロボット（自分も）を毎ステップ少しずつ直す。直す量は 相手の最大HP × rate × dt。
 * 一番傷んだ相手（HP の割合が低い順。同じなら id 順）から h.targets 体まで。heal_in_combat でない道具は、相手が healQuietSec 秒 撃たれていない時だけ。
 * self_only の道具（自己修復炉）は自分だけ。乱数は引かない
 */
export function healByLoadout(sim, dt) {
  for (const s of sim.units) {
    const fx = s.loadoutFx;
    if (!fx || !fx.heal.length || s.hp <= 0 || s.captured != null) continue;
    for (const h of fx.heal) {
      const near = [];
      for (const u of sim.units) {
        if (u.side !== 'ally' || u.human || u.hp <= 0 || u.captured != null || u.hp >= u.maxHp) continue;
        if (h.selfOnly ? u !== s : Math.hypot(u.x - s.x, u.y - s.y) > h.range) continue;
        if (!h.inCombat && sim.time - u.lastHit < FX.healQuietSec) continue;
        near.push(u);
      }
      near.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id);
      for (const u of near.slice(0, h.targets)) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * h.rate * dt);
    }
  }
}

// ---- 戦闘: バリア（shieldStats の最後で呼ぶ） ----
/** shieldStats の値 s（{ blockChance, wearMult }）に、バリアの道具の「受ける確率」を足す（1を超えない）。耐久は applyLoadout が u.shieldMax・u.shieldHp に足してある */
export function withLoadoutShield(s, u) {
  const sh = u.loadoutFx && u.loadoutFx.shield;
  return sh && sh.block > 0 ? { blockChance: Math.min(1, s.blockChance + sh.block), wearMult: s.wearMult } : s;
}
