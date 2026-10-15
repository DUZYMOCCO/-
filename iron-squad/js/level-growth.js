/** Fixed curve: gains through Lv10 unchanged; thereafter each level adds 4% to its base gain. */
export function levelGrowthSteps(level=1) {
  const lv=Math.max(1,Math.floor(Number(level)||1)),late=Math.max(0,lv-10);
  return lv-1+.02*late*(late+1);
}
/** Defense had no level term; only the additional late-level steps provide new defense. */
export const levelDefenseGrowth=(level,baseGain=1)=>Math.max(0,levelGrowthSteps(level)-Math.max(0,level-1))*baseGain;
