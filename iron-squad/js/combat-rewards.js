// Relative threat uses full health and permanent combat stats, never remaining HP.
// A slow victory over a durable enemy deserves its bonus even on the last hit.
export const STRONG_ENEMY_XP_CAP=25;
const positive=(v,fallback=1)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):fallback;
export function combatPower(unit) {
  const hp=positive(unit?.maxHp,positive(unit?.hp));
  const atk=positive(unit?.atk);
  const def=Math.max(0,Number(unit?.def)||0);
  const reduction=Math.max(0,Math.min(.4,(Number(unit?.dmgReduction)||0)/100));
  return Math.sqrt(hp*atk*(1+def*.012)/(1-reduction));
}
export function strongEnemyReward(baseExp,enemy,defeater) {
  const base=Math.max(1,Math.round(positive(baseExp)));
  const ratio=enemy&&defeater?combatPower(enemy)/combatPower(defeater):1;
  // Any stronger opponent earns at least twice the XP: 2x power → 5x XP,
  // 3x power → 8x XP. The cap contains extreme authored dungeon bosses.
  const multiplier=ratio>1?Math.min(STRONG_ENEMY_XP_CAP,2+3*(ratio-1)):1;
  const exp=Math.round(base*multiplier);
  return {baseExp:base,exp,bonusExp:exp-base,multiplier,ratio};
}
