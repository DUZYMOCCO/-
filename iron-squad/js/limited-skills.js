/** v7.2.1 忍者・獣人の上位職の特技（軽いもの）。数値は1か所にまとめ、人間の同じ段階とおおむねつり合う強さに抑える。 */
import {limitedLineOf,limitedTierOf} from './limited-lines.js?v=335';
export const LIMITED_SKILL_RULES=Object.freeze({
 howl:Object.freeze({radius:150,trigger:260,duration:5,cooldown:12,bonus:[0,.10,.12,.15]}), // 狼: 周りの味方のATK+
 hawkEye:Object.freeze({distance:220,bonus:[0,.10,.12,.15]}), // 鳥: 遠い敵への矢の威力+
 followUp:Object.freeze({minTier:2,ratio:.4}), // 猫: 会心のあとにもう一撃（会心前の威力の4割）
 brace:Object.freeze({minTier:2,hpRatio:.5,cut:.15}), // 熊: HP半分以下で被ダメージ-15%
 lastStand:Object.freeze({bearHeal:.35,catShield:2}) // 熊・猫のクラス3: 1作戦期に1回、倒れずに踏みとどまる
});
const alive=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
const clock=game=>Number(game?.worldTime)||0;
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
/** 見た目だけの短い演出。最大40件で古いものから捨てる。 */
export function addLimitedFx(game,fx){const list=game.limitedFx||=[];if(list.length>=40)list.shift();list.push({...fx,start:clock(game)});}
export function tickLimitedSkills(game,s,dt){
 if(game.restTimer>0||!alive(s))return;
 const line=limitedLineOf(s);if(!line)return;const tier=limitedTierOf(s);if(!tier)return;
 if(line==='BEAST_WOLF')howl(game,s,tier);
}
function howl(game,s,tier){
 const R=LIMITED_SKILL_RULES.howl,t=clock(game);if((s._howlReadyAt||0)>t)return;
 const enemy=game.getNearestMonster?.(s.x,s.y);if(!alive(enemy)||!near(enemy,s,R.trigger))return;
 s._howlReadyAt=t+R.cooldown;const bonus=R.bonus[tier]||0;
 for(const u of [game.player,...(game.squad||[])])if(alive(u)&&near(u,s,R.radius)&&((u._howlUntil||0)<=t||(u._howlBonus||0)<=bonus)){u._howlUntil=t+R.duration;u._howlBonus=bonus;}
 addLimitedFx(game,{kind:'ring',x:s.x,y:s.y,radius:R.radius,life:.7,color:'#c9d6da'});
 game.spawnDamageText?.(s.x,s.y-26,'🐺遠吠え','#c9d6da');
}
/** 与ダメージ倍率（遠吠えの効果中・鷹の目）。 */
export function limitedAttackMult(game,attacker,target){
 if(!attacker)return 1;let mult=1;const t=clock(game);
 if((attacker._howlUntil||0)>t)mult*=1+(attacker._howlBonus||0);
 if(target&&limitedLineOf(attacker)==='BEAST_BIRD'){
  const R=LIMITED_SKILL_RULES.hawkEye,tier=limitedTierOf(attacker);
  if(tier&&!near(attacker,target,R.distance)){mult*=1+(R.bonus[tier]||0);if((attacker._hawkFxAt||0)<=t){attacker._hawkFxAt=t+2;game.spawnSparks?.(target.x,target.y,'#f5e7bd',4);}}
 }
 return mult;
}
/** 猫のクラス2以上: 会心のあとの追撃の割合（0なら無し）。 */
export const limitedCritFollowUp=attacker=>limitedLineOf(attacker)==='BEAST_CAT'&&limitedTierOf(attacker)>=LIMITED_SKILL_RULES.followUp.minTier?LIMITED_SKILL_RULES.followUp.ratio:0;
/** 熊のクラス2以上: HPが半分以下のときの被ダメージ倍率。 */
export function limitedDamageTakenMult(target){
 const R=LIMITED_SKILL_RULES.brace;
 return limitedLineOf(target)==='BEAST_BEAR'&&limitedTierOf(target)>=R.minTier&&target.maxHp>0&&target.hp/target.maxHp<=R.hpRatio?1-R.cut:1;
}
/** 熊・猫のクラス3: 倒れるはずの一撃を1作戦期に1回だけ踏みとどまる。true なら呼び出し側はダメージを入れない。 */
export function limitedLastStand(game,target){
 if(!target||target===game.player||limitedTierOf(target)<3)return false;
 const line=limitedLineOf(target);if(line!=='BEAST_BEAR'&&line!=='BEAST_CAT')return false;
 const phase=game.phase||1;if(target._lastStandPhase===phase)return false;
 target._lastStandPhase=phase;const R=LIMITED_SKILL_RULES.lastStand;
 if(line==='BEAST_BEAR'){target.hp=Math.max(target.hp,Math.ceil(target.maxHp*R.bearHeal));game.spawnDamageText?.(target.x,target.y-28,'🐻山王の再起','#efe2c8');addLimitedFx(game,{kind:'ring',x:target.x,y:target.y,radius:46,life:.8,color:'#efe2c8'});}
 else{target.hp=Math.max(1,Math.min(target.hp,1));target.shieldTimer=Math.max(target.shieldTimer||0,R.catShield);game.spawnDamageText?.(target.x,target.y-28,'🐾身返し','#f3e6d4');addLimitedFx(game,{kind:'ring',x:target.x,y:target.y,radius:34,life:.6,color:'#f3e6d4'});}
 return true;
}
/** 演出の描画（ワールド座標）。期限切れはここで捨てる。 */
export function drawLimitedFx(c,game){
 const list=game.limitedFx;if(!list?.length)return;const t=clock(game);
 for(let i=list.length-1;i>=0;i--)if(t-list[i].start>list[i].life||t<list[i].start)list.splice(i,1);
 if(!list.length)return;c.save();
 for(const f of list){
  const k=Math.min(1,(t-f.start)/f.life);c.globalAlpha=Math.max(0,.75*(1-k));c.strokeStyle=f.color;c.fillStyle=f.color;
  if(f.kind==='ring'){c.lineWidth=2.5;c.beginPath();c.arc(f.x,f.y,Math.max(4,f.radius*(.35+.65*k)),0,Math.PI*2);c.stroke();}
 }
 c.restore();
}
