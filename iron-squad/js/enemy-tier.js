/** Reward/progression rank. Rendering continues to use isBoss/isColossal. */
export function enemyTier(monster) {
  if(monster?.isDungeonBoss||monster?.isDemonKing||monster?.isPlaceBoss)return 'boss';
  if(monster?.isBoss||monster?.isColossal||monster?.isInvasionCommander)return 'midboss';
  return monster?.isElite?'elite':'ordinary';
}
export const ORB_REPEAT_CHANCE=.25,GEM_REPEAT_CHANCE=.25;
export const upperBoss=monster=>enemyTier(monster)==='boss'&&(monster.isDemonKing||['dungeon_catacombs','dungeon_dragon_cavern'].includes(monster.bossPlaceId));
export const bossOrbChance=(monster,defeats=0)=>enemyTier(monster)==='boss'?(defeats===0?1:ORB_REPEAT_CHANCE):0;
/** The per-place record survives room resets and is part of the existing dungeon save. */
export function rollBossTreasure(game,monster,random=Math.random) {
  if(enemyTier(monster)!=='boss'||monster._bossRewardCredited)return {orbs:0,gems:0,first:false};
  monster._bossRewardCredited=true;
  const id=monster.bossPlaceId||game.currentDungeon?.id||`boss_${monster.type}`;
  const place=(game.dungeons||[]).find(d=>d.id===id);
  // Authored runtime bosses always carry a place; support isolated encounter tools too.
  const record=place||((game.bossRewardRecords||={})[id]||={bossDefeats:0});
  const defeats=Math.max(0,record.bossDefeats||0),first=defeats===0;
  record.bossDefeats=defeats+1;
  return {first,orbs:random()<bossOrbChance(monster,defeats)?1:0,gems:upperBoss(monster)&&(first||random()<GEM_REPEAT_CHANCE)?1:0};
}
export const finalCriticalChance=(base=0,sweet=0)=>Math.max(0,Math.min(75,base+sweet));
export const bossCriticalBonus=kills=>Math.min(30,Math.max(0,kills||0)*2);
