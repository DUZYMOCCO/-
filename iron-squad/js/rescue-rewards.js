// NPC rescue rewards belong to the selected expedition, including reenlistment.
export const RESCUE_REWARDS=Object.freeze([
  {key:'hpPct',amount:1,weight:.35,label:'最大HP +1%'},
  {key:'atkPct',amount:1,weight:.30,label:'攻撃力 +1%'},
  {key:'defPct',amount:1,weight:.20,label:'防御力 +1%'},
  {key:'speedPct',amount:1,weight:.075,label:'移動速度 +1%',jackpot:true},
  {key:'atkSpeedPct',amount:1,weight:.075,label:'攻撃速度 +1%',jackpot:true}
]);
export const emptyRescueBonuses=()=>({hpPct:0,atkPct:0,defPct:0,speedPct:0,atkSpeedPct:0});
export function normalizeRescueBonuses(value) {
  const result=emptyRescueBonuses();
  if(!value) return result;
  for(const key of Object.keys(result)){
    const n=Number(value?.[key]);
    if(Number.isFinite(n)&&n>0)result[key]=n;
  }
  // 旧絶対値セーブとの互換マイグレーション
  if(value.hp&&!result.hpPct) result.hpPct=Math.max(1,Math.round(Number(value.hp)/5));
  if(value.atk&&!result.atkPct) result.atkPct=Math.max(1,Number(value.atk));
  if(value.def&&!result.defPct) result.defPct=Math.max(1,Number(value.def));
  if(value.speed&&!result.speedPct) result.speedPct=Math.max(1,Number(value.speed));
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
  game.showToast?.(`${reward.jackpot?'✨ 大当たり！ ':''}${npc.name||'救出成功'}のお礼 · 隊長の${reward.label}（永続）`);
  game.saveGame?.();
  return reward;
}
export function rescueBonusSummary(value) {
  const b=normalizeRescueBonuses(value),parts=[];
  if(b.hpPct) parts.push(`HP+${b.hpPct}%`);
  if(b.atkPct) parts.push(`攻撃+${b.atkPct}%`);
  if(b.defPct) parts.push(`防御+${b.defPct}%`);
  if(b.speedPct) parts.push(`移動+${b.speedPct}%`);
  if(b.atkSpeedPct) parts.push(`攻速+${b.atkSpeedPct}%`);
  return parts.join(' / ')||'まだ獲得していません';
}
