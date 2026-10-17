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

// v7.0.22: kill-XP floor. Near-field kills used to fall to ~0.05% of a level (XP needs x1.45/x1.5 per level, the near-field reward does not grow).
// A normal kill now pays at least a share of the defeater's current "XP to next level". It is max()-ed against the old result, so early game,
// big-level-gap bonuses and far enemies are unchanged. XP only (no gold), bosses / mid-bosses excluded, no effect from 220 m outwards.
export const KILL_XP_FLOOR={nearRate:.003,wildRate:.005,nearLimit:8000,wildLimit:22000,eliteMult:2,levelCap:60};
const requirementTable=(first,growth,add,min,cap)=>{const t=[0,first];for(let l=2;l<=cap;l++)t[l]=Math.floor(Math.max(min,t[l-1])*growth+add);return t;};
// Same recurrence as the level-up code (captain 20 x1.45+10, soldier 14 x1.5+8); the table stops at the cap level so the number never explodes.
const CAPTAIN_REQUIREMENT=requirementTable(20,1.45,10,10,KILL_XP_FLOOR.levelCap);
const SOLDIER_REQUIREMENT=requirementTable(14,1.5,8,8,KILL_XP_FLOOR.levelCap);
export function killXpFloor({distance=0,required=0,level=1,captain=false,elite=false}={}) {
  const d=Number(distance);
  if(!Number.isFinite(d)||d>=KILL_XP_FLOOR.wildLimit)return 0;
  const rate=d<KILL_XP_FLOOR.nearLimit?KILL_XP_FLOOR.nearRate:KILL_XP_FLOOR.wildRate;
  const cap=KILL_XP_FLOOR.levelCap,table=captain?CAPTAIN_REQUIREMENT:SOLDIER_REQUIREMENT;
  const lv=Math.max(1,Math.min(cap,Math.floor(Number(level))||1));
  // Above the cap level the floor stops growing (and a broken reqExp can never push it past the cap value).
  const need=Math.min(table[cap],Number.isFinite(Number(required))&&Number(required)>0?Number(required):table[lv]);
  const amount=Math.round(need*rate*(elite?KILL_XP_FLOOR.eliteMult:1));
  return Number.isFinite(amount)&&amount>0?amount:0;
}
/** Final XP for a normal kill: the old strong-enemy result, raised to the floor when the floor is higher. */
export function killExpWithFloor(reward,floor) {
  const exp=Math.max(Number(reward?.exp)||0,Number.isFinite(floor)?Math.max(0,floor):0);
  return {...reward,exp,floorExp:exp>(Number(reward?.exp)||0)?exp:0};
}