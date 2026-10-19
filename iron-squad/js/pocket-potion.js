// v7.0.28: soldier pocket-potion treatment ("手当て").
// Each soldier may use it a limited number of times per wave (phase), like the commander's squad potions.
export const POCKET_POTION=Object.freeze({
  cost:8,            // gold per use (unchanged since v7.0.27)
  healPct:0.30,      // fraction of max HP restored per use
  usesPerWave:3,     // uses per wave (phase)
  triggerBelow:0.45, // used while HP is below this fraction of max HP
  cooldown:4         // seconds between uses
});

/** Remaining uses this wave. A record from another wave counts as unused, so old saves start with a full 3. */
export function pocketPotionLeft(soldier,phase){
  const record=soldier?.pocketPotion;
  if(!record||record.phase!==phase)return POCKET_POTION.usesPerWave;
  return Math.max(0,POCKET_POTION.usesPerWave-Math.max(0,Math.floor(Number(record.used)||0)));
}

export function pocketPotionLabel(soldier,phase){
  return `手当て ${Math.round(POCKET_POTION.healPct*100)}%・1作戦期${POCKET_POTION.usesPerWave}回（残り${pocketPotionLeft(soldier,phase)}回）`;
}

/** Tick the cooldown and, if the conditions are met, pay and heal. Returns true when a potion was used. */
export function tickPocketPotion(soldier,dt,phase){
  soldier.medCooldown=(soldier.medCooldown||0)-dt;
  if(!(soldier.hp<soldier.maxHp*POCKET_POTION.triggerBelow)||soldier.medCooldown>0)return false;
  if(pocketPotionLeft(soldier,phase)<=0||(soldier.gold||0)<POCKET_POTION.cost)return false;
  const used=soldier.pocketPotion?.phase===phase?Math.floor(Number(soldier.pocketPotion.used)||0):0;
  soldier.pocketPotion={phase,used:used+1};
  soldier.gold-=POCKET_POTION.cost;
  soldier.medCooldown=POCKET_POTION.cooldown;
  soldier.hp=Math.min(soldier.maxHp,soldier.hp+Math.floor(soldier.maxHp*POCKET_POTION.healPct));
  return true;
}
