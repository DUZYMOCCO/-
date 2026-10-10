import {HERO_RULES,heroMembers,heroSharesSpace,visibleHeroMembers} from './hero-rules.js';
import {advanceHeroRoute,heroSegmentOpen} from './hero-navigation.js';
import {WORLD_SIZE,settleUnit} from './world.js?v=175';
import {DUNGEON_DEFS,dungeonBlocks} from './dungeon.js?v=151';
import {economicFieldBlocked} from './regional-economy.js?v=151';
import {RECRUIT_CLASSES} from './recruitment.js?v=157';
import {persistentUnit} from './render-support.js';
import {grantPersonalExp} from './experience-rules.js';
import {formatDistance} from './distance-format.js';
import {practiceAttribute} from './unit-attributes.js';
import {isMedic,treatWounded,updateWounded} from './casualty-rules.js?v=151';
import {healByMedic,healAmountFor} from './phase-rules.js';
import {ensureMana,regenerateMana,spendMana,isMage} from './magic-rules.js?v=151';
import {takeRangedShot,supplyLocation} from './supply-rules.js?v=151';
import {distanceScaling} from './equipment-rules.js';
import {strongEnemyReward} from './combat-rewards.js?v=151';
import {RANGED_ENEMIES} from './enemy-ranged.js?v=151';
import {startHeroJournal,archiveHeroJournal,appendHeroDiary,recordHeroEquipmentGrant} from './hero-journal.js';
import {grantHeroEquipment} from './hero-equipment.js';
const C=WORLD_SIZE/2,castle=()=>DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle');
const ready=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
export function initializeHeroJourney(game,saved=null) {
  game.heroJourney=saved?structuredClone(saved):{lastRollPhase:0,sequence:0,party:null,history:[],demonKingDefeat:null,castleScene:null};
  const journey=game.heroJourney;journey.history||=[];journey.sequence||=0;
  let equipped=false;
  for(const u of heroMembers(game)){delete u._cachedEnemy;if(grantHeroEquipment(game,u))equipped=true;game.recalcSoldierStats(u);if(u.isDown)u.hp=0;}
  if(equipped)recordHeroEquipmentGrant(game,journey.party);
}
export function rollHeroRevelation(game,random=game.random||Math.random) {
  const j=game.heroJourney;if(!j||j.demonKingDefeat||game.phase<HERO_RULES.firstPhase||j.lastRollPhase>=game.phase)return false;
  j.lastRollPhase=game.phase;
  if(j.party?.members.some(u=>!u.dead)||random()>=HERO_RULES.revelationChance)return false;
  if(j.party)archiveHeroJournal(game,j.party,'全滅');
  const id=`hero_party_${++j.sequence}`,leader=game.createNewSoldier(null,{classKey:'LIGHT',talent:game.rollScoutTalent(),level:1});
  Object.assign(leader,{isChosenHero:true,isNamed:true,title:'天啓の勇者',rankTitle:'勇者',revelationPhase:game.phase});
  const members=[leader,...RECRUIT_CLASSES.map(classKey=>game.createNewSoldier(null,{classKey,talent:game.rollScoutTalent(),level:1}))];
  members.forEach((u,i)=>Object.assign(u,{heroPartyId:id,isPersonalGuard:false,x:C+Math.cos(i)*40,y:C+Math.sin(i)*40,campPose:null}));
  members.forEach(u=>grantHeroEquipment(game,u));
  const d=castle();
  j.party={id,leaderId:leader.id,name:leader.name,phase:game.phase,space:'field',status:'marching',x:C,y:C,members,
    destination:{...d.entrance},route:[{x:C+512,y:C}],routeIndex:0,spawnClock:0};
  startHeroJournal(game,j.party);
  game.showToast?.(`天啓！ 救いの御子【${leader.name}】が勇者となり、新兵5職と魔王城へ出発した！`);
  return true;
}
export function serializeHeroJourney(game) {
  syncHeroCastle(game);
  const j=game.heroJourney;if(!j)return null;
  const scene=j.castleScene&&{...j.castleScene,monsters:j.castleScene.monsters.map(persistentUnit)};
  return {...j,castleScene:scene,party:j.party?{...persistentUnit(j.party),members:j.party.members.map(persistentUnit)}:null};
}
export function syncHeroCastle(game) {
  if(game.currentDungeon?.id!=='dungeon_demon_castle'||!game.heroJourney?.castleScene)return;
  game.heroJourney.castleScene.monsters=game.restTimer>0?game.restMonsters:game.monsters;
  game.heroJourney.castleScene.vault=game.dungeonVault;
}
export function recordDemonKingDefeat(game,attacker=null) {
  const j=game.heroJourney;if(!j||j.demonKingDefeat)return;
  const by=attacker?.heroPartyId?'hero':'commander';
  j.demonKingDefeat={phase:game.phase,by,name:attacker?.name||'隊長'};
  if(j.party?.members.some(u=>!u.dead)){j.party.status='victorious';archiveHeroJournal(game,j.party,by==='hero'?'魔王討伐':'隊長側が魔王討伐');}
}
function enterHeroCastle(game,p) {
  const d=castle();
  const local=game.dungeons?.find(x=>x.id===d.id);if(local)local.discovered=true;
  const scene=ensureHeroCastle(game,d);
  p.space=d.id;p.status='castle';p.x=240;p.y=d.height/2;p.route=[{x:d.width-350,y:d.height/2}];p.routeIndex=0;
  p.members.forEach((u,i)=>{u.x=200-i*10;u.y=d.height/2+(i-2)*22;delete u._cachedEnemy;});
  if(game.currentDungeon?.id===d.id){scene.monsters=game.monsters;scene.vault=game.dungeonVault;}
  game.showToast?.(`勇者【${p.name}】のパーティが魔王城へ突入した！`);
}
export function ensureHeroCastle(game,d=castle()) {
  const j=game.heroJourney;if(j.castleScene)return j.castleScene;
  const monsters=[];
  // The same authored enemies and boss used by the commander's castle visit.
  for(let i=0;i<d.mobCount;i++)monsters.push(game.createDungeonMob(d.mobTypes[i%d.mobTypes.length],460+(i%7)*62,260+Math.floor(i/7)*350,d,false));
  for(let i=0;i<d.eliteCount;i++)monsters.push(game.createDungeonMob(d.mobTypes.at(-1),1200+(i%3)*110,400+Math.floor(i/3)*900,d,true));
  if(!j.demonKingDefeat)monsters.push(game.createDungeonBoss(d.boss,d.width-350,d.height/2,d));
  j.castleScene={monsters,vault:{x:d.width-240,y:d.height/2,name:`${d.name}の至宝箱`,opened:false,unlocked:!!j.demonKingDefeat,dungeon:d}};
  return j.castleScene;
}
function battleContext(game,p) {
  if(heroSharesSpace(game))return game;
  const ctx=Object.create(game);
  ctx.currentDungeon=p.space==='field'?null:castle();
  ctx.monsters=p.space==='field'?(game.savedFieldMonsters||[]):ensureHeroCastle(game).monsters;
  ctx.squad=p.members;ctx.heroJourney=null;ctx.reserves=[];ctx.civilians=[];ctx.gateGuards=[];ctx.merchants=[];ctx._merchantWounded=[];
  ctx.player={x:-1e8,y:-1e8,hp:0,isDown:false};ctx._monsterSpatial=null;ctx.projectiles=[];
  ctx.spawnDamageText=()=>{};ctx.spawnSparks=()=>{};ctx.dialogue=null;
  ctx.showToast=text=>game.showToast?.(text);ctx.leaveRemains=()=>{};
  ctx.killMonster=(m,u,isPlayer)=>{
    const index=ctx.monsters.indexOf(m);if(index<0)return;ctx.monsters.splice(index,1);
    const distance=m.lootDistance??Math.hypot(m.x-C,m.y-C),scale=distanceScaling(distance,game.phase);
    const exp=strongEnemyReward(Math.round((m.isBoss?80:m.isElite?24:6)*scale.exp),m,u).exp;
    awardHeroBattle(game,u,exp);
    u.gold=(u.gold||0)+Math.round((m.isBoss?120:8)*scale.gold);u[m.isBoss?'bossKills':'minionKills']=(u[m.isBoss?'bossKills':'minionKills']||0)+1;
    game.recalcSoldierStats(u);
    if(m.isDemonKing){recordDemonKingDefeat(game,u);game.heroJourney.castleScene.vault.unlocked=true;game.showToast?.(`勇者パーティが魔王【${m.name}】を討伐した！`);}
  };
  return ctx;
}
export function awardHeroBattle(game,killer,amount) {
  for(const u of heroMembers(game))if(ready(u)&&Math.hypot(u.x-killer.x,u.y-killer.y)<600)grantPersonalExp(game,u,amount);
}
function move(game,ctx,u,target,dt) {
  const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy);if(d<4){u.vx=u.vy=0;return;}
  const step=Math.min(d,(u.speed||100)*dt),from={x:u.x,y:u.y},next={x:u.x+dx/d*step,y:u.y+dy/d*step};
  const blocked=ctx.currentDungeon?(x,y)=>dungeonBlocks(ctx.currentDungeon,x,y):(x,y)=>economicFieldBlocked(game,x,y);
  if(ctx.currentDungeon||heroSegmentOpen(game,from,next)){u.x=next.x;u.y=next.y;settleUnit(u,blocked);}
  else {
    const angle=Math.atan2(dy,dx);
    for(const offset of [.55,-.55,1.1,-1.1,Math.PI/2,-Math.PI/2]){
      const detour={x:from.x+Math.cos(angle+offset)*step,y:from.y+Math.sin(angle+offset)*step};
      if(heroSegmentOpen(game,from,detour)){u.x=detour.x;u.y=detour.y;break;}
    }
  }
  u.vx=(u.x-from.x)/Math.max(.001,dt);u.vy=(u.y-from.y)/Math.max(.001,dt);u.facingAngle=Math.atan2(dy,dx);
  if(u.heroPartyId)practiceAttribute(u,'travel',Math.hypot(u.x-from.x,u.y-from.y));
}
function nearest(list,u,limit=Infinity){let found=null,dist=limit;for(const v of list){if(!ready(v))continue;const d=Math.hypot(u.x-v.x,u.y-v.y);if(d<dist){dist=d;found=v;}}return found;}
function stepHiddenEnemies(ctx,p,dt) {
  for(const m of [...ctx.monsters]){
    const target=nearest(p.members,m,800);if(!target)continue;
    const ranged=RANGED_ENEMIES[m.rangedKind||m.type],reach=ranged?.range||m.attackReach||(m.radius||12)*.8,dist=Math.hypot(m.x-target.x,m.y-target.y);
    if(dist>reach)move(ctx,ctx,m,target,dt);
    else {m.atkTimer=(m.atkTimer||0)-dt;if(m.atkTimer<=0){m.atkTimer=ranged?.interval||m.attackInterval||1;ctx.damageTarget(target,m.atk,{attacker:m,damageKind:ranged?.kind,element:ranged?.element});}}
    if(m.isDemonKing){m.skillTimer=(m.skillTimer??m.skillCooldown)-dt;if(m.skillTimer<=0){m.skillTimer=m.skillCooldown;for(const u of p.members)if(ready(u)&&Math.hypot(u.x-m.x,u.y-m.y)<300)ctx.damageTarget(u,m.atk*1.5,{attacker:m,damageKind:'magic'});}}
  }
}
export function updateHeroParty(game,dt,classes) {
  syncHeroCastle(game);
  const j=game.heroJourney,p=j?.party;if(!p||!(dt>0)||game.restTimer>0||p.status==='fallen')return;
  const ctx=battleContext(game,p),shared=ctx===game;
  // Shared-space bleeding/rescue is already ticked by the ordinary battlefield.
  if(!shared)updateWounded(ctx,dt);
  const living=p.members.filter(u=>!u.dead),fighters=living.filter(ready);
  if(!living.length){p.status='fallen';archiveHeroJournal(game,p,'全滅');game.showToast?.(`勇者【${p.name}】のパーティは全滅した。`);return;}
  p.status=j.demonKingDefeat?'victorious':fighters.length?(p.space==='field'?'marching':'castle'):'down';
  if(!fighters.length)return;
  for(const u of living){u.atkAnim=Math.max(0,(u.atkAnim||0)-dt*4);regenerateMana(u,dt);if(p.space==='field'&&supplyLocation(ctx,u)){u.ammo=30;ensureMana(u);u.mana=u.maxMana;}}
  if(p.space==='field'&&!j.demonKingDefeat){
    p.spawnClock=(p.spawnClock||0)+dt;
    if(p.spawnClock>=8){p.spawnClock=0;if(Math.hypot(p.x-C,p.y-C)>900&&!ctx.monsters.some(m=>ready(m)&&Math.hypot(m.x-p.x,m.y-p.y)<700))ctx.spawnMonster(p.x+200,p.y+180);}
  }
  const danger=ctx.monsters.some(m=>ready(m)&&Math.hypot(m.x-p.x,m.y-p.y)<420&&!ctx.attackBlocked(p,m)),wounded=living.some(u=>u.isDown);
  if(!danger&&!wounded&&!j.demonKingDefeat){
    if(p.space==='field'&&!p.route?.length)advanceHeroRoute(game,p);
    const target=p.route?.[p.routeIndex||0];
    if(target){const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy),speed=Math.min(...fighters.map(u=>u.speed||100)),step=Math.min(d,speed*dt*.85);
      if(d>0){p.x+=dx/d*step;p.y+=dy/d*step;}if(d<=speed*dt+8){p.routeIndex=(p.routeIndex||0)+1;if(p.routeIndex>=p.route.length){p.route=[];p.routeIndex=0;if(p.space==='field'&&Math.hypot(p.x-p.destination.x,p.y-p.destination.y)<120)enterHeroCastle(game,p);}}}
  }
  // Entering the castle changes coordinate space; start its combat next frame.
  if((ctx.currentDungeon?.id||'field')!==p.space)return;
  fighters.forEach((u,i)=>{
    u._heroAttackClock=Math.max(0,(u._heroAttackClock||0)-dt);
    const cls=classes[u.soldierClass]||classes.LIGHT;
    if(isMedic(u)){
      const down=living.find(v=>v.isDown&&!v.dead)||(shared&&game.player.isDown?game.player:null);
      if(down){if(Math.hypot(u.x-down.x,u.y-down.y)>35)move(game,ctx,u,down,dt);else treatWounded(ctx,u,down,dt);return;}
      const hurt=living.filter(ready).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      if(hurt&&hurt.hp<hurt.maxHp*.85){if(Math.hypot(u.x-hurt.x,u.y-hurt.y)>cls.range)move(game,ctx,u,hurt,dt);else if(u._heroAttackClock<=0&&spendMana(u,16)){healByMedic(u,hurt,healAmountFor(u,hurt),ctx);u._heroAttackClock=cls.atkCooldown;ctx.spawnDamageText(hurt.x,hurt.y-20,'救護','#34d399');}return;}
    }
    const nearestEnemy=nearest(ctx.monsters,u,500),enemy=nearestEnemy&&!ctx.attackBlocked(u,nearestEnemy)?nearestEnemy:null,profile=ctx.combatProfileFor(u,u.equipped?.weapon,false),mage=isMage(u),magic=mage||isMedic(u);
    const reach=magic?cls.range:profile.reach+(enemy?.radius||0)*.5;
    if(enemy){const dist=Math.hypot(u.x-enemy.x,u.y-enemy.y);if(dist>reach)move(game,ctx,u,enemy,dt);
      else if(u._heroAttackClock<=0){u._heroAttackClock=(profile.baseCooldown||cls.atkCooldown)/(u.atkSpeed||1);u.atkAnim=1;u.facingAngle=Math.atan2(enemy.y-u.y,enemy.x-u.x);
        if(magic){if(spendMana(u,mage?12:20))ctx.performAttack(u,enemy,false,u.magicAttack||u.atk,false,'magic');}
        else if(profile.ranged&&shared)ctx.spawnRangedProjectile(u,enemy,u.atk,profile,false);
        else ctx.performAttack(u,enemy,false,profile.ranged?takeRangedShot(u,u.atk).damage:u.atk);
      }
    }else move(game,ctx,u,{x:p.x+Math.cos(i*1.15)*34,y:p.y+Math.sin(i*1.15)*34},dt);
    if(u._attributesDirty)game.recalcSoldierStats(u);
  });
  if(!shared)stepHiddenEnemies(ctx,p,dt);
}
export function renderHeroJourney(game,classes,talents) {
  const host=game.container?.querySelector('#view-strat-overview');if(!host)return;
  let panel=host.querySelector('#hero-journey');if(!panel){panel=document.createElement('details');panel.id='hero-journey';panel.className='command-fold';host.append(panel);}
  const j=game.heroJourney,p=j?.party;
  panel.replaceChildren();const summary=document.createElement('summary');summary.textContent='勇者パーティ';panel.append(summary);
  const info=document.createElement('p');
  info.textContent=p?`第${p.phase}期に天啓 · ${p.name} · ${p.status==='fallen'?'全滅':p.status==='down'?'全員ダウン':p.status==='victorious'?'魔王討伐後':p.space==='field'?`魔王城へ進軍中 · 本陣から${formatDistance(Math.hypot(p.x-C,p.y-C))}`:'魔王城で交戦中'}`:`第10期から各期2%で、救いの御子が天啓を受け勇者となります。`;
  const body=document.createElement('div');body.className='fold-content';panel.append(body);
  body.append(info);const hint=document.createElement('p');hint.textContent='経験値・実戦練習は20倍。追って共闘、救助、放置、隊長側による魔王討伐を自由に選べます。';body.append(hint);
  if(p?.members.some(u=>u.heroEquipmentVersion)){const gear=document.createElement('p');gear.textContent='勇者と仲間は、勇者パーティ専用の武具を支給されて出発します。';body.append(gear);}
  if(p)for(const u of p.members){const row=document.createElement('p');row.textContent=`${u.isChosenHero?'勇者':classes[u.soldierClass]?.name||u.soldierClass} ${u.name} · ${talents[u.talent]?.tag||''} · Lv.${u.level} · ${u.dead?'戦死':u.isDown?`ダウン（残り${Math.ceil(u.downTimer)}秒）`:`HP ${Math.ceil(u.hp)} / ${u.maxHp}`}`;body.append(row);}
  if(p&&p.status!=='fallen'&&!j.demonKingDefeat){const b=document.createElement('button');b.className='mini-btn';b.textContent=game.heroFollowing?'追従をやめる':'勇者を追う';b.onclick=()=>{game.heroFollowing=!game.heroFollowing;delete game._heroFollowPath;game.closeStrategyModal();};body.append(b);}
  if(j?.demonKingDefeat){const result=document.createElement('p');result.textContent=`魔王討伐：第${j.demonKingDefeat.phase}期 · ${j.demonKingDefeat.by==='hero'?'勇者パーティ':'隊長側'}（${j.demonKingDefeat.name}）`;body.append(result);}
  if(p&&!j.history.some(h=>h.id===p.id))appendHeroDiary(body,p.journal,classes,talents);
  for(const h of [...j?.history||[]].reverse()){if(h.journal)appendHeroDiary(body,h.journal,classes,talents);else{const row=document.createElement('p');row.textContent=`第${h.phase}期 · ${h.name} · ${h.result}`;body.append(row);}}
}
export function updateHeroFollowing(game,dt) {
  const p=game.heroJourney?.party,u=game.player;
  if(!game.heroFollowing||!(dt>0)||u?.isDown)return;
  if(!p||p.status==='fallen'||game.heroJourney.demonKingDefeat||game.joystick?.active){game.heroFollowing=false;return;}
  const d=castle();
  if(game.currentDungeon){
    if(game.currentDungeon.id!==p.space){game.heroFollowing=false;return;}
    if(Math.hypot(u.x-p.x,u.y-p.y)>90)move(game,game,u,p,dt);
    return;
  }
  const destination=p.space==='field'?p:d.entrance;
  if(p.space!=='field'&&Math.hypot(u.x-destination.x,u.y-destination.y)<100){game.enterDungeon(d);delete game._heroFollowPath;return;}
  if(Math.hypot(u.x-destination.x,u.y-destination.y)<100)return;
  if(!game._heroFollowPath){const nearCamp=Math.hypot(u.x-C,u.y-C)<250;game._heroFollowPath={x:u.x,y:u.y,destination:{x:destination.x,y:destination.y},route:nearCamp?[{x:C+512,y:C}]:[],routeIndex:0};}
  const path=game._heroFollowPath;
  if(!path.route.length){path.x=u.x;path.y=u.y;advanceHeroRoute(game,path);}
  const target=path.route[path.routeIndex];if(!target)return;
  move(game,game,u,target,dt);
  if(Math.hypot(u.x-target.x,u.y-target.y)<12){path.routeIndex++;if(path.routeIndex>=path.route.length)delete game._heroFollowPath;}
}
export function drawHeroMarks(ctx,game) {
  for(const u of visibleHeroMembers(game)){if(!u.isChosenHero)continue;ctx.save();ctx.strokeStyle='#e1c77e';ctx.fillStyle='#e1c77e';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(u.x-12,u.y-38);ctx.lineTo(u.x-12,u.y-58);ctx.lineTo(u.x+3,u.y-54);ctx.lineTo(u.x-12,u.y-49);ctx.stroke();ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('勇者',u.x,u.y-65);ctx.restore();}
}
