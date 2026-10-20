/** v7.2.1 忍者・獣人の上位職の特技（軽いもの）。数値は1か所にまとめ、人間の同じ段階とおおむねつり合う強さに抑える。 */
import {limitedLineOf,limitedTierOf,limitedClassOf} from './limited-lines.js?v=341';
export const LIMITED_SKILL_RULES=Object.freeze({
 howl:Object.freeze({radius:150,trigger:260,duration:5,cooldown:12,bonus:[0,.10,.12,.15]}), // 狼: 周りの味方のATK+
 hawkEye:Object.freeze({distance:220,bonus:[0,.10,.12,.15]}), // 鳥: 遠い敵への矢の威力+
 followUp:Object.freeze({minTier:2,ratio:.4}), // 猫: 会心のあとにもう一撃（会心前の威力の4割）
 brace:Object.freeze({minTier:2,hpRatio:.5,cut:.15}), // 熊: HP半分以下で被ダメージ-15%
 lastStand:Object.freeze({bearHeal:.35,catShield:2}), // 熊・猫のクラス3: 1作戦期に1回、倒れずに踏みとどまる
 // v7.2.2 中くらいの特技
 taunt:Object.freeze({radius:160,cooldown:10,duration:[0,4,5,6],maxTargets:6,leash:260}), // 熊: 近くの敵の狙いを自分へ
 packHunt:Object.freeze({minTier:2,radius:120,perAlly:.06,maxAllies:3}), // 狼: 同じ敵を囲む味方1人につきATK+6%（最大3人）
 roar:Object.freeze({minTier:3,radius:130,minEnemies:2,cooldown:14,stun:.8}), // 天狼: 周りの敵をひるませる（ボスは半分、超巨頭は無効）
 foxfire:Object.freeze({cooldown:[0,6,5.5,5],ratio:.6,speed:260,life:2.2}), // 狐: 敵を追う狐火
 leap:Object.freeze({minTier:2,trigger:70,distance:90,speed:600,cooldown:6}), // 鳥: 近づかれたら跳んで退く
 arrowRain:Object.freeze({minTier:3,cooldown:12,radius:70,ticks:3,interval:.3,ratio:.35}), // 迦楼羅: 範囲の矢の雨
 smoke:Object.freeze({minTier:3,cooldown:15,trigger:120,minEnemies:3,radius:90,duration:3,miss:.4}) // 影頭領: 煙玉（中の敵の近接攻撃が外れやすい）
});
const alive=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
const clock=game=>Number(game?.worldTime)||0;
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
/** 見た目だけの短い演出。最大40件で古いものから捨てる。 */
export function addLimitedFx(game,fx){const list=game.limitedFx||=[];if(list.length>=40)list.shift();list.push({...fx,start:clock(game)});}
export function tickLimitedSkills(game,s,dt){
 if(game.restTimer>0||!alive(s))return;
 const line=limitedLineOf(s);if(!line)return;const tier=limitedTierOf(s);if(!tier)return;
 if(line==='BEAST_WOLF'){howl(game,s,tier);if(tier>=LIMITED_SKILL_RULES.roar.minTier)roar(game,s);}
 else if(line==='BEAST_BEAR')taunt(game,s,tier);
 else if(line==='BEAST_FOX')foxfire(game,s,tier);
 else if(line==='BEAST_BIRD'){if(tier>=LIMITED_SKILL_RULES.leap.minTier)leap(game,s,dt);if(tier>=LIMITED_SKILL_RULES.arrowRain.minTier)arrowRain(game,s);}
 else if(line==='NINJA'&&tier>=LIMITED_SKILL_RULES.smoke.minTier)smoke(game,s);
}
const enemiesNear=(game,s,r,limit=99)=>{const out=[];for(const m of game.monsters||[]){if(alive(m)&&!m.retreated&&near(m,s,r)){out.push(m);if(out.length>=limit)break;}}return out;};
function taunt(game,s,tier){
 const R=LIMITED_SKILL_RULES.taunt,t=clock(game);if((s._tauntReadyAt||0)>t)return;
 const foes=enemiesNear(game,s,R.radius,R.maxTargets);if(!foes.length)return;
 s._tauntReadyAt=t+R.cooldown;const duration=R.duration[tier]||0;
 for(const m of foes){m._tauntBy=s;m._tauntUntil=t+(m.isBoss||m.isColossal?duration/2:duration);}
 addLimitedFx(game,{kind:'ring',x:s.x,y:s.y,radius:R.radius,life:.6,color:'#d2bb98'});game.spawnDamageText?.(s.x,s.y-26,'🐻挑発','#d2bb98');
}
/** 挑発された敵の狙い（熊が倒れた・離れすぎた・時間切れなら null）。 */
export function limitedTauntTarget(game,m){
 const s=m?._tauntBy;if(!s)return null;
 if(!alive(s)||(m._tauntUntil||0)<=clock(game)||!near(m,s,LIMITED_SKILL_RULES.taunt.leash)){m._tauntBy=null;return null;}
 return s;
}
function roar(game,s){
 const R=LIMITED_SKILL_RULES.roar,t=clock(game);if((s._roarReadyAt||0)>t)return;
 const foes=enemiesNear(game,s,R.radius);if(foes.length<R.minEnemies)return;
 s._roarReadyAt=t+R.cooldown;
 for(const m of foes){if(m.isColossal)continue;m.magicStunTimer=Math.max(m.magicStunTimer||0,R.stun*(m.isBoss?.5:1));}
 addLimitedFx(game,{kind:'ring',x:s.x,y:s.y,radius:R.radius,life:.5,color:'#e2a2a2'});game.spawnDamageText?.(s.x,s.y-30,'🐺咆哮','#f1f7fa');
}
function foxfire(game,s,tier){
 const R=LIMITED_SKILL_RULES.foxfire,t=clock(game);if((s._foxfireReadyAt||0)>t||s.magicRecovering)return;
 const target=game.getNearestMonster?.(s.x,s.y),range=limitedClassOf(s)?.range||300;
 if(!alive(target)||!near(target,s,range))return;
 s._foxfireReadyAt=t+(R.cooldown[tier]||6);
 (game.projectiles||=[]).push({type:'FOXFIRE',attacker:s,target,x:s.x,y:s.y-10,damage:Math.max(1,Math.round((s.atk||1)*R.ratio)),speed:R.speed,life:R.life});
}
/** 狐火の移動と命中（true で消す）。 */
export function updateFoxfire(game,p,dt){
 p.life-=dt;if(!alive(p.target)||p.life<=0||!alive(p.attacker))return true;
 const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy)||1;
 if(d<=p.speed*dt+12){game.performAttack(p.attacker,p.target,false,p.damage,false,'magic');game.spawnSparks?.(p.target.x,p.target.y,'#f0a050',5);return true;}
 p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt+Math.sin(p.life*12)*.6;return false;
}
function leap(game,s,dt){
 const R=LIMITED_SKILL_RULES.leap,t=clock(game);
 if(s._leapLeft>0){const step=Math.min(s._leapLeft,R.speed*dt);s.x+=s._leapDx*step;s.y+=s._leapDy*step;s._leapLeft-=step;return;}
 if((s._leapReadyAt||0)>t)return;
 const m=game.getNearestMonster?.(s.x,s.y);if(!alive(m)||!near(m,s,R.trigger))return;
 const dx=s.x-m.x,dy=s.y-m.y,d=Math.hypot(dx,dy)||1;
 Object.assign(s,{_leapReadyAt:t+R.cooldown,_leapLeft:R.distance,_leapDx:dx/d,_leapDy:dy/d});
 addLimitedFx(game,{kind:'ring',x:s.x,y:s.y,radius:22,life:.35,color:'#d7e5dc'});game.spawnDamageText?.(s.x,s.y-24,'🪶跳び退き','#d7e5dc');
}
function arrowRain(game,s){
 const R=LIMITED_SKILL_RULES.arrowRain,t=clock(game),rain=s._arrowRain;
 if(rain){
  if(t>=rain.next){
   rain.next=t+R.interval;rain.left--;
   for(const m of enemiesNear(game,rain,R.radius))game.performAttack(s,m,false,Math.max(1,Math.round((s.atk||1)*R.ratio)),false,'thrown');
   if(rain.left<=0)s._arrowRain=null;
  }
  return;
 }
 if((s._arrowRainReadyAt||0)>t)return;
 const target=game.getNearestMonster?.(s.x,s.y);if(!alive(target)||!near(target,s,limitedClassOf(s)?.range||400))return;
 s._arrowRainReadyAt=t+R.cooldown;s._arrowRain={x:target.x,y:target.y,next:t+.25,left:R.ticks};
 addLimitedFx(game,{kind:'rain',x:target.x,y:target.y,radius:R.radius,life:.25+R.ticks*R.interval,color:'#f5e7bd'});game.spawnDamageText?.(s.x,s.y-26,'🦅矢の雨','#f5e7bd');
}
function smoke(game,s){
 const R=LIMITED_SKILL_RULES.smoke,t=clock(game);if((s._smokeReadyAt||0)>t)return;
 if(enemiesNear(game,s,R.trigger,R.minEnemies).length<R.minEnemies)return;
 s._smokeReadyAt=t+R.cooldown;
 addLimitedFx(game,{kind:'smoke',x:s.x,y:s.y,radius:R.radius,life:R.duration,color:'#9aa3b5'});game.spawnDamageText?.(s.x,s.y-26,'🥷煙玉','#c3cde0');
}
/** 煙玉の中の敵の近接攻撃が外れるか（true なら外れ）。 */
export function limitedSmokeMiss(game,m){
 const list=game.limitedFx;if(!list?.length)return false;const t=clock(game);
 for(const f of list)if(f.kind==='smoke'&&t>=f.start&&t-f.start<=f.life&&near(m,f,f.radius)){
  if(Math.random()<LIMITED_SKILL_RULES.smoke.miss){if(Math.random()<.3)game.spawnDamageText?.(m.x,m.y-18,'空振り','#c3cde0');return true;}
  return false;
 }
 return false;
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
 if(target&&limitedLineOf(attacker)==='BEAST_WOLF'&&limitedTierOf(attacker)>=LIMITED_SKILL_RULES.packHunt.minTier){
  const R=LIMITED_SKILL_RULES.packHunt;let allies=0;
  for(const u of game.squad||[])if(u!==attacker&&alive(u)&&near(u,target,R.radius)&&++allies>=R.maxAllies)break;
  mult*=1+allies*R.perAlly;
 }
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
  else if(f.kind==='smoke'){c.globalAlpha=.32*(1-k*k);for(let i=0;i<5;i++){const a=i*1.26+f.start,r=f.radius*(.45+.12*(i%3));c.beginPath();c.arc(f.x+Math.cos(a)*f.radius*.35,f.y+Math.sin(a)*f.radius*.3,r,0,Math.PI*2);c.fill();}}
  else if(f.kind==='rain'){c.globalAlpha=.55*(1-k);c.lineWidth=1.5;c.beginPath();c.arc(f.x,f.y,f.radius,0,Math.PI*2);c.stroke();c.beginPath();for(let i=0;i<8;i++){const a=i*.785,x=f.x+Math.cos(a)*f.radius*.6,y=f.y+Math.sin(a)*f.radius*.5,drop=((t*3+i*.37)%1)*26;c.moveTo(x,y-30+drop);c.lineTo(x-2,y-20+drop);}c.stroke();}
 }
 c.restore();
}
