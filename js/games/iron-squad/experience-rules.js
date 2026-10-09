/** 実回復量からの個人EXP。小さな継続回復も、兵士ごとに端数を積み立てる。 */
export const HEALING_HP_PER_EXP = 5;
export const REVIVAL_EXP_PER_MAX_HP = 3;
export const COMMANDER_EXP_SHARE = .2;
const nonnegative = value => Number.isFinite(value) ? Math.max(0, value) : 0;

/** 蘇生対象の最大HPの300%を、そのまま個人EXPとして評価する。 */
export const revivalExperience = unit => Math.floor(nonnegative(unit?.maxHp) * REVIVAL_EXP_PER_MAX_HP);

/** 救護・回復に共通の個人レベル処理。gameがある場合は能力と演出も更新する。 */
export function grantPersonalExp(game, unit, amount) {
  if (!unit || !Number.isFinite(amount) || amount <= 0) return false;
  const isPlayer = unit === game?.player || unit.isPlayer || unit.isHero;
  if(isPlayer&&game)shareCommanderExp(game,amount);
  unit.exp = nonnegative(unit.exp) + amount;
  let leveled = false;
  for (let guard = 0; guard < 30; guard++) {
    const required = nonnegative(unit.reqExp) || (isPlayer ? 20 : 14);
    if (unit.exp < required) break;
    const cost = Math.max(isPlayer ? 10 : 8, required);
    unit.exp -= cost;
    unit.level = (unit.level || 1) + 1;
    unit.reqExp = Math.floor(cost * (isPlayer ? 1.45 : 1.5) + (isPlayer ? 10 : 8));
    leveled = true;
    if (isPlayer) {
      game?.sound?.playHighScore?.();
      game?.spawnDamageText?.(unit.x, unit.y - 30, `⚡ Lv.${unit.level} UP!`, '#34d399');
      game?.showToast?.(`⚡ 功績でレベルアップ！ Lv.${unit.level} に到達！`);
    } else {
      game?.spawnDamageText?.(unit.x, unit.y - 45, `⚡ Lv.${unit.level}!`, '#00f0ff');
    }
  }
  if (leveled) {
    if (isPlayer) game?.recalcPlayerStats?.();
    else game?.recalcSoldierStats?.(unit);
    if(unit.isDown)unit.hp=0;
  }
  return leveled;
}

/** Bonus is per current personal guard, additional to the commander's award. */
export function shareCommanderExp(game,amount) {
  if(!Number.isFinite(amount)||amount<=0)return 0;
  const seen=new Set();let paid=0;
  for(const unit of game.squad||[]) {
    if(!unit||unit===game.player||unit.dead||!unit.isPersonalGuard||seen.has(unit.id))continue;
    seen.add(unit.id);
    const accumulated=nonnegative(unit.commanderBonusRemainder)+amount*COMMANDER_EXP_SHARE;
    const earned=Math.floor(accumulated+1e-9);unit.commanderBonusRemainder=Math.max(0,accumulated-earned);
    unit.commanderBonusExp=nonnegative(unit.commanderBonusExp)+earned;
    if(earned){grantPersonalExp(game,unit,earned);paid+=earned;}
  }
  return paid;
}

/** 通常・継続回復だけを対象にする。蘇生は最大HPに応じた救命EXPで別途評価する。 */
export function grantHealingExp(game, healer, restored) {
  if (!healer || healer.dead || healer.isDown || !(healer.hp > 0) || !Number.isFinite(restored) || restored <= 0) return 0;
  const accumulated = nonnegative(healer.healingExpRemainder) % HEALING_HP_PER_EXP + restored;
  const earned = Math.floor((accumulated + 1e-9) / HEALING_HP_PER_EXP);
  healer.healingExpRemainder = Math.max(0, accumulated - earned * HEALING_HP_PER_EXP);
  healer.healingHp = nonnegative(healer.healingHp) + restored;
  healer.healingExp = nonnegative(healer.healingExp) + earned;
  if (earned > 0) grantPersonalExp(game, healer, earned);
  return earned;
}
