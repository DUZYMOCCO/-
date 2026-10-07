// NPC rescue rewards belong to the selected expedition, including reenlistment.
export const RESCUE_REWARDS=Object.freeze([
  {key:'hp',amount:5,weight:.35,label:'最大HP +5'},
  {key:'atk',amount:1,weight:.30,label:'攻撃力 +1'},
  {key:'def',amount:1,weight:.20,label:'防御力 +1'},
  {key:'speed',amount:1,weight:.10,label:'移動速度 +1'},
  {key:'atkSpeedPct',amount:1,weight:.05,label:'攻撃速度 +1%',jackpot:true}
]);
export const emptyRescueBonuses=()=>({hp:0,atk:0,def:0,speed:0,atkSpeedPct:0});
export function normalizeRescueBonuses(value) {
  const result=emptyRescueBonuses();
  for(const key of Object.keys(result)){const n=Number(value?.[key]);if(Number.isFinite(n)&&n>0)result[key]=n;}
  return result;
}
export function rollRescueReward(random=Math.random) {
  const roll=Math.max(0,Math.min(.999999999,Number(random())||0));let band=0;
  for(const reward of RESCUE_REWARDS){band+=reward.weight;if(roll<band)return reward;}
  return RESCUE_REWARDS.at(-1);
}
export function grantPermanentRescueReward(game,npc,random=Math.random) {
  if(!game?.player||!npc||npc.rescueRewardGranted)return null;
  game.rescueRewardIds ||= [];
  if(npc.id&&game.rescueRewardIds.includes(npc.id)){npc.rescueRewardGranted=true;return null;}
  const reward=rollRescueReward(random);
  npc.rescueRewardGranted=true;npc.rescueReward={key:reward.key,amount:reward.amount,label:reward.label};
  if(npc.id)game.rescueRewardIds.push(npc.id);
  game.rescueBonuses=normalizeRescueBonuses(game.rescueBonuses);
  game.rescueBonuses[reward.key]+=reward.amount;
  game.recalcPlayerStats?.();game.updateStatsUI?.();
  game.spawnDamageText?.(game.player.x,game.player.y-28,reward.label,reward.jackpot?'#deca99':'#9ee1b8');
  game.showToast?.(`${reward.jackpot?'大当たり！ ':''}${npc.name||'救出成功'}のお礼 · 隊長の${reward.label}（永続）`);
  game.saveGame?.();
  return reward;
}
export function rescueBonusSummary(value) {
  const b=normalizeRescueBonuses(value),parts=[];
  for(const [key,label] of [['hp','HP'],['atk','攻撃'],['def','防御'],['speed','移動']])if(b[key])parts.push(`${label}+${b[key]}`);
  if(b.atkSpeedPct)parts.push(`攻撃速度+${b.atkSpeedPct}%`);
  return parts.join(' / ')||'まだ獲得していません';
}
