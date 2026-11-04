// Measurement only. All saves are fresh JSDOM memory; no browser/user data access.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance as hostPerformance} from 'node:perf_hooks';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {DUNGEON_DEFS} from '../js/dungeon.js';
import {collectAllSoldiers,computeRankings} from '../js/troop-rankings.js';
import {attributeFamily} from '../js/unit-attributes.js';
import {weaponCombatProfile,equipmentScore} from '../js/equipment-rules.js';
import {canUseEquipment} from '../js/weapon-requirements.js';
import {levelGrowthSteps} from '../js/level-growth.js';
import {activeSquad} from '../js/instance-rules.js';
import {expeditionCombatUnits,isPlatoonAway} from '../js/expedition-rules.js';
import {PHASE_DURATION,REST_DURATION} from '../js/phase-rules.js';
import {enemyTier} from '../js/enemy-tier.js';
import {stopAutoSave} from '../js/auto-save.js';

const arg=(key,defaultValue)=>{const i=process.argv.indexOf(key);return i<0?defaultValue:process.argv[i+1];};
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');process.chdir(root);
const out=resolve(process.env.MEASURE_OUT_DIR||'C:/Users/Yoshiyuki/.codex/visualizations/2026/10/16/01a144e3-14ff-75a2-820d-27d43b252d8d/iron-squad-measure2');
assert.ok(out.toLowerCase()!==root.toLowerCase()&&!out.toLowerCase().startsWith(root.toLowerCase()+'\\'));
mkdirSync(out,{recursive:true});
const seed=Number(arg('--seed','202610170')),phases=Number(arg('--phases','40')),joinAfter=Number(arg('--join-after','0')),mode=arg('--mode','skills'),runId=arg('--run',`seed-${seed}-join-${joinAfter}-${mode}`),dt=Number(arg('--dt','.1'));
const dir=join(out,runId);mkdirSync(dir,{recursive:true});
assert.ok(!existsSync(join(dir,'phases.jsonl')),'use a new --run name to prevent mixing runs');
const resumePath=arg('--from-checkpoint',null),dungeonPolicy=arg('--dungeons','off'),rawActions=process.argv.includes('--raw-actions');
const rookieT1=process.argv.includes('--rookie-t1')||joinAfter>0||mode==='auto'||runId.startsWith('native-catch-');
const measureImpact=process.argv.includes('--measure-impact');
const probe=process.argv.includes('--probe'),started=hostPerformance.now();
const sourceFiles=['iron-squad/sw-assets.js',...readdirSync('iron-squad/js').filter(p=>p.endsWith('.js')).sort().map(p=>`iron-squad/js/${p}`)];
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex'),sourceStart=Object.fromEntries(sourceFiles.map(p=>[p,hash(p)]));
writeFileSync(join(dir,'source-hashes.json'),JSON.stringify(sourceStart));
writeFileSync(join(dir,'git-status-before.txt'),execFileSync('git',['status','--short'],{encoding:'utf8'}));
let clock=0,rngState=seed>>>0,idCounter=0;
const original={random:Math.random,now:Date.now,performance:globalThis.performance,crypto:globalThis.crypto};
Math.random=()=>{rngState=(Math.imul(rngState,1664525)+1013904223)>>>0;return rngState/4294967296;};
Date.now=()=>1792108800000+Math.round(clock*1000);
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock*1000}});
Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:()=>`${seed.toString(16).padStart(8,'0')}-0000-4000-8000-${(++idCounter).toString(16).padStart(12,'0')}`}});
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,RANKS,DEPLOYMENT_CAPACITY}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2;
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText','saveGame'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('GROWTH MEASUREMENT FRESH MEMORY ONLY').id;g.startFreshGame(false);stopAutoSave(g);g.closeStrategyModal();
const freshPlayer=structuredClone(g.player),freshGear=structuredClone(g.equipped),freshCareer=structuredClone(g.career),freshGold=g.gold;
for(const name of ['updateStatsUI','refreshSupplyUI','updateQuestUI','revealFogAroundPlayer','updatePowerAtkButtonUI','checkPeriodicDialogue','renderStrategyUI','renderMerchantShop','renderTroopsUI','renderInventory','updateCareerUI','updateHeadquartersFacilityUI','changeTimePeriod'])g[name]=noop;
// Unlike the old fixed-stage harness, long runs need native day/night enemy retreats.
g.changeTimePeriod=IronSquadGame.changeTimePeriod;
g.dialogue=null;
// Pure visual work is suppressed. Combat effects with delayed damage remain live.
for(const name of ['pushParticle','pushShockwave','recordBattleLog'])g[name]=noop;
g._civSpawnClock=-1e9;
let joined=false,currentSkill=null,attackDepth=0,actionSerial=0,pendingAction=null,phaseActions=[],killEvents=[],allSnapshots=[],phaseStart=hostPerformance.now(),phaseClockStart=0,preShots=[],preDelayed=new Map();
const ordinaryByTick=new Map();
const people=new Map(),credits=new Map(),phaseDamage=new Map(),pendingDelayed=new Map();
let exposure=new Map(),activePeak=0,activeSeconds=0;
let impactEvents=[],impactContext=null;
const knockOrigins=new WeakMap();
const targetIds=new WeakMap();let targetSerial=0;
function targetId(m){if(!targetIds.has(m))targetIds.set(m,++targetSerial);return targetIds.get(m);}
const familyKeys=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];
g.squad=[];g.reserves=[];g.recruitSequence=0;g.career.status='enlisted';g.career.joinedPhase=1;g.rankIndex=0;g.exp=0;
for(let i=0;i<150;i++){
  const u=g.createNewSoldier(null,{classKey:familyKeys[i%5]});
  u.measureRosterIndex=i;u.recruitedPhase=1;people.set(u.id,u);
  if(i<48)g.squad.push(u);else g.reserves.push(u);
}
g.initPlatoons();
// The guard five are part of the 48 deployed slots.
g.squad.slice(0,5).forEach((u,i)=>{u.isPersonalGuard=true;u._guardSlot=i;});
g.normalizeDeployment();
assert.equal(collectAllSoldiers(g).length,150,'150 retained without merging seeds');
assert.equal(g.squad.length,48);assert.equal(g.reserves.length,102);
const retainedBefore=g.reserves.length;g.supplyReinforcements();assert.equal(g.reserves.length,retainedBefore,'automatic recruitment caps do not discard manually retained reserves');
const initialRoster=collectAllSoldiers(g).map(({soldier:u,platoon})=>({id:u.id,index:u.measureRosterIndex,family:attributeFamily(u),talent:u.talent,level:u.level,atk:u.atk,strength:u.strength,weapon:u.weapon?.weaponStyle,tier:u.weapon?.tier,platoon}));
writeFileSync(join(dir,'initial-roster.json'),JSON.stringify(initialRoster));
const trueKill=g.killMonster,trueAttack=g.performAttack,trueSkill=g.trySoldierMeleeSkill,truePower=g.triggerPowerAttack,trueShot=g.spawnRangedProjectile;
const shotActions=new WeakMap();
function location(monster=null){return monster?.isRaidMob||monster?.isDemonInvasion?'hq_invasion':g.currentDungeon?'dungeon':'field';}
function newAction(u,target,kind){
  const item=u===g.player?g.equipped.weapon:u?.equipped?.weapon||u?.weapon,p=weaponCombatProfile(item),reach=p.ranged?p.reach:u===g.player?p.playerReach:p.reach;
  const available=g.monsters.filter(m=>m.hp>0&&Math.hypot(m.x-u.x,m.y-u.y)<=reach+(m.radius||0)).length;
  return {id:++actionSerial,seed,phase:g.phase,clock,unit:u?.id||'player',is_player:u===g.player,weapon:p.style,family:u===g.player?'COMMANDER':attributeFamily(u),deployment:u===g.player?'commander':u.heroPartyId?'hero_party':g.reserves.includes(u)?'reserve_expedition':u.isPersonalGuard?'personal':people.has(u.id)?`platoon_${u.platoonId||0}`:'npc',location:location(target),kind,range_targets:available,hitTargets:new Set(),damage:0};
}
function retainAction(action){if(action&&!phaseActions.includes(action))phaseActions.push(action);}
g.performAttack=function(u,m,isPlayer,...args){
  const priorHp=m?.hp||0,top=attackDepth===0;
  let action=currentSkill||pendingAction;
  if(!action&&top){action=ordinaryByTick.get(u.id);if(!action){action=newAction(u,m,'normal');ordinaryByTick.set(u.id,action);retainAction(action);}}
  if(!action)action=this._measureCurrentAction;
  const old=this._measureCurrentAction;this._measureCurrentAction=action;attackDepth++;
  try{return trueAttack.call(this,u,m,isPlayer,...args);}finally{
    attackDepth--;this._measureCurrentAction=old;const dealt=Math.max(0,priorHp-Math.max(0,m?.hp||0));
    if(action&&top&&dealt>0){action.hitTargets.add(targetId(m));action.damage+=dealt;phaseDamage.set(u.id,(phaseDamage.get(u.id)||0)+dealt);}
  }
};
g.killMonster=function(m,u,isPlayer){
  const owner=isPlayer?this.player:u,kind=enemyTier(m),keys=['minionKills','midbossKills','bossKills'];
  const before=keys.map(k=>owner?.[k]||0);const result=trueKill.call(this,m,u,isPlayer);
  if(owner){const delta=keys.map((k,i)=>(owner[k]||0)-before[i]);assert.equal(delta.reduce((a,b)=>a+b,0),isPlayer||!owner.dead?1:0,'match native posthumous-credit policy');
    const sums=credits.get(owner.id)||[0,0,0];delta.forEach((v,i)=>sums[i]+=v);credits.set(owner.id,sums);
    killEvents.push({seed,phase:this.phase,clock,owner:owner.id,kind,location:location(m),weapon:(owner.equipped?.weapon||owner.weapon)?.weaponStyle,delta});}
  return result;
};
g.trySoldierMeleeSkill=function(u,target){
  if(!target||u.weaponSkillCooldown>0||!['HEAVY','LIGHT'].includes(attributeFamily(u)))return trueSkill.call(this,u,target);
  const action=newAction(u,target,'skill'),old=currentSkill;currentSkill=action;let fired;
  try{fired=trueSkill.call(this,u,target);}finally{currentSkill=old;}
  if(fired){retainAction(action);if(u.weaponSkillPending)pendingDelayed.set(u.id,action);}return fired;
};
g.triggerPowerAttack=function(){
  const u=this.player;if(!joined||mode==='auto'||u.powerAtkCooldown>0||u.isDown)return;
  const target=this.getNearestMonster(u.x,u.y);if(!target||Math.hypot(target.x-u.x,target.y-u.y)>220)return;
  const action=newAction(u,target,'skill'),old=currentSkill;currentSkill=action;const prior=u.powerAtkCooldown;
  const projectileStart=this.projectiles.length;try{truePower.call(this);}finally{currentSkill=old;}
  for(const p of this.projectiles.slice(projectileStart))shotActions.set(p,action);
  if(u.powerAtkCooldown>prior){retainAction(action);pendingDelayed.set(u.id,action);}
};
g.spawnRangedProjectile=function(u,target,...args){
  const old=pendingAction,action=currentSkill||newAction(u,target,'normal');pendingAction=action;const start=this.projectiles?.length||0;
  try{return trueShot.call(this,u,target,...args);}finally{pendingAction=old;if((this.projectiles?.length||0)>start){retainAction(action);for(const p of this.projectiles.slice(start))shotActions.set(p,action);}}
};
// Resolve projectile and delayed skill ownership at the final damage hook.
const wrappedAttack=g.performAttack;
g.performAttack=function(u,m,isPlayer,...args){
  const old=pendingAction;
  if(!currentSkill&&!pendingAction){
    const projectile=[...(this.projectiles||[]),...preShots].find(p=>{
      if(p.attacker!==u||!shotActions.has(p)||!(p.target===m||['CANNONBALL','PIERCE_BOLT','SWORD_BEAM'].includes(p.type)))return false;
      if(!measureImpact)return true;
      const expected=p.type==='PIERCE_BOLT'?Math.max(1,Math.round(p.damage*.7**Math.max(0,(p.hitEnemies?.length||1)-1))):p.damage;
      return Number.isFinite(args[0])&&Math.abs(args[0]-expected)<.5;
    });
    if(projectile)pendingAction=shotActions.get(projectile);
    else if(u?.weaponSkillPending&&pendingDelayed.has(u.id))pendingAction=pendingDelayed.get(u.id);
  }
  try{return wrappedAttack.call(this,u,m,isPlayer,...args);}finally{pendingAction=old;}
};
const trueSweep=g.performMeleeSweep;
g.performMeleeSweep=function(u,target,...args){
  const old=pendingAction,delayed=preDelayed.get(u.id);
  if(!currentSkill&&!pendingAction){pendingAction=delayed||ordinaryByTick.get(u.id)||newAction(u,target,'normal');retainAction(pendingAction);if(!measureImpact||!delayed)ordinaryByTick.set(u.id,pendingAction);if(delayed)preDelayed.delete(u.id);}
  try{return trueSweep.call(this,u,target,...args);}finally{pendingAction=old;}
};
const truePowerFx=g.updatePowerFx;
g.updatePowerFx=function(dt){const old=currentSkill;currentSkill=pendingDelayed.get(this.player.id)||null;try{return truePowerFx.call(this,dt);}finally{currentSkill=old;if(!this.powerFx?.length)pendingDelayed.delete(this.player.id);}};
if(measureImpact){
  const trueThrow=g.throwMonster,trueCollision=g.collideFlyingMonster,trueImpact=g.knockImpactDamage;
  g.throwMonster=function(m,ang,dist,slam,by,byPlayer,ignore=null){
    const origin=(ignore&&knockOrigins.get(ignore))||impactContext||currentSkill||pendingAction||this._measureCurrentAction||ordinaryByTick.get(by?.id);
    const result=trueThrow.call(this,m,ang,dist,slam,by,byPlayer,ignore);if(result>0){if(origin)knockOrigins.set(m,origin);else knockOrigins.delete(m);}return result;
  };
  g.collideFlyingMonster=function(m){const old=impactContext;impactContext=knockOrigins.get(m)||null;try{return trueCollision.call(this,m);}finally{impactContext=old;}};
  g.knockImpactDamage=function(m,raw,by,byPlayer){
    const hp=m?.hp||0,origin=impactContext||knockOrigins.get(m),result=trueImpact.call(this,m,raw,by,byPlayer),damage=Math.max(0,hp-Math.max(0,m?.hp||0));
    if(damage>0){
      impactEvents.push({seed,phase:this.phase,clock,target:targetId(m),unit:by?.id||'unknown',weapon:origin?.weapon||(by?.equipped?.weapon||by?.weapon)?.weaponStyle||'none',family:origin?.family||(by===this.player?'COMMANDER':attributeFamily(by)),deployment:origin?.deployment||(by===this.player?'commander':by?.heroPartyId?'hero_party':people.has(by?.id)?`platoon_${by?.platoonId||0}`:'npc'),location:location(m),kind:origin?.kind||'unknown',origin_known:!!origin,origin_action:origin?.id||null,origin_phase:origin?.phase||null,damage,inside_performAttack:attackDepth>0});
    }
    return result;
  };
}
function joinCommander(){
  if(joined)return;joined=true;
  g.player=structuredClone(freshPlayer);g.player.id='measurement-commander';g.equipped=structuredClone(freshGear);g.player.equipped=g.equipped;
  g.gold=freshGold;g.inventory=[];
  Object.assign(g.player,{x:C+240,y:C,hp:130,level:1,exp:0,reqExp:20,survivedWaves:0,minionKills:0,midbossKills:0,bossKills:0,weaponMastery:{},isDown:false,dead:false,atkCooldown:0,powerAtkCooldown:0});
  g.career={...structuredClone(freshCareer),status:'enlisted',joinedPhase:g.phase};g.rankIndex=0;g.exp=0;
  if(rookieT1){const w=g.createSupplyEquipment('WEAPON',g.player,1);assert.ok(canUseEquipment(g.player,w));g.equipped.weapon=w;g.player.equipped=g.equipped;}
  g.recalcPlayerStats();g.player.hp=g.player.maxHp;
  const arrivalRankings={};for(const category of ['kills','overall','atk']){
    const list=computeRankings([...collectAllSoldiers(g),{soldier:g.player,platoon:'hypothetical-commander'}],category,10000),index=list.findIndex(r=>r.soldier===g.player);
    arrivalRankings[category]={score:list[index].score,rank:index+1,soldier_scores:computeRankings(collectAllSoldiers(g),category,10000).map(r=>r.score)};
  }
  writeFileSync(join(dir,'join-event.json'),JSON.stringify({seed,join_after:joinAfter,phase:g.phase,clock,level:g.player.level,tier:g.equipped.weapon?.tier,gold:g.gold,inventory:g.inventory.length,rankIndex:g.rankIndex,arrival_rankings:arrivalRankings,source:'FRESH_COMMANDER_IN_SYNTHETIC_WORLD'}));
}
function command(dt){
  const p=g.player;
  if(!joined){p.atkCooldown=1e8;p.powerAtkCooldown=1e8;p.x=C;p.y=C;g.joystick={active:false,dirX:0,dirY:0};return;}
  if(p.isDown){g.joystick={active:false,dirX:0,dirY:0};return;}
  if(g.restTimer>0){g.joystick={active:false,dirX:0,dirY:0};return;}
  let goal;
  if(g.currentDungeon){
    if(p.hp<p.maxHp*.4||!g.monsters.length)goal={x:180,y:g.currentDungeon.height/2};
    else goal=g.getNearestMonster(p.x,p.y);
  }else{
    const enemy=g.getNearestMonster(p.x,p.y),distance=enemy?Math.hypot(enemy.x-p.x,enemy.y-p.y):Infinity;
    if(p.hp<p.maxHp*.4)goal={x:C,y:C};
    else if(enemy&&distance<650)goal=enemy;
    else{
      const theta=((g.phase-1)%8)*Math.PI/4,range=2700+Math.min(1200,(g.phase-1)*50);
      goal={x:C+Math.cos(theta)*range,y:C+Math.sin(theta)*range};
    }
    const dungeon=g.dungeons?.find(d=>d.id==='dungeon_goblin_mines');
    if(dungeonPolicy==='on'&&g.phase%5===0&&dungeon&&p.level>=dungeon.reqLv&&p.def>=dungeon.reqDef&&!g.baseRaidActive&&g.invasions?.stage!=='battle'){
      goal=dungeon.entrance;
      if(Math.hypot(p.x-goal.x,p.y-goal.y)<95)g.enterDungeon(dungeon);
    }
  }
  if(goal){
    const target=g.dungeonMoveTarget?.(p,goal)||goal,dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy),stop=g.currentDungeon?45:goal.hp?42:18;
    g.joystick={active:d>stop,dirX:d?dx/d:0,dirY:d?dy/d:0};
  }
  if(mode==='skills')g.triggerPowerAttack();
}
function phasePolicy(){
  if(!joined&&g.phase>joinAfter)joinCommander();
  for(const p of g.platoons||[])if(!isPlatoonAway(p))g.startPlatoonExpedition(p.id,1);
  // Equip the strongest legal inventory item by native item score; no purchases/grants.
  if(joined)for(const item of [...(g.inventory||[])]){
    const slot={WEAPON:'weapon',SHIELD:'shield',HELMET:'helmet',ARMOR:'armor',GLOVES:'gloves',LEGS:'legs',AMULET:'amulet'}[item.type];
    if(slot&&canUseEquipment(g.player,item)&&equipmentScore(item)>equipmentScore(g.equipped[slot]||{}))g.equipItem(item);
  }
}
function composition(u,isPlayer=false){
  const cls=SOLDIER_CLASSES[u.soldierClass]||{},equipAtk=Object.values(u.equipped||{}).reduce((s,item)=>s+(item?.stats?.atk||0),0),weaponAtk=(u.equipped?.weapon||u.weapon)?.stats?.atk||0;
  const levelTerm=levelGrowthSteps(u.level)*(isPlayer?4:2),wavesTerm=(u.survivedWaves||0)*(isPlayer?4:3),minionTerm=Math.floor((u.minionKills||0)/5),bossTerm=(u.bossKills||0)*8;
  const rankTerm=isPlayer?(g.currentRank()?.bonusAtk||0):0,honorTerm=!isPlayer&&u.isNamed?15:0,vetTerm=!isPlayer&&u.isVeteran?6:0,base=isPlayer?25:11,clsTerm=isPlayer?0:(cls.bonusAtk||0),advancedTerm=isPlayer&&u.isAdvanced?25:0;
  const total=base+clsTerm+rankTerm+levelTerm+wavesTerm+minionTerm+bossTerm+honorTerm+vetTerm+equipAtk+advancedTerm;
  return {level_steps:levelGrowthSteps(u.level),level_term:levelTerm,waves:u.survivedWaves||0,waves_term:wavesTerm,weapon_atk:weaponAtk,equipment_atk:equipAtk,minion_atk:minionTerm,boss_atk:bossTerm,honor_atk:honorTerm,vet_atk:vetTerm,rank_bonus_atk:rankTerm,base_atk:base,class_bonus_atk:clsTerm,advanced_atk:advancedTerm,base_calc_atk:total,level_share:levelTerm/total,waves_share:wavesTerm/total,kills_share:(minionTerm+bossTerm)/total,weapon_share:weaponAtk/total,other_share:1-(levelTerm+wavesTerm+minionTerm+bossTerm+weaponAtk)/total};
}
function snapshot(completed){
  for(const {soldier:u}of collectAllSoldiers(g))people.set(u.id,u);
  const units=[...people.values()].map(u=>({id:u.id,index:u.measureRosterIndex??-1,alive:!u.dead,down:!!u.isDown,level:u.level,minion:u.minionKills||0,midboss:u.midbossKills||0,boss:u.bossKills||0,atk:u.atk,magicAttack:u.magicAttack||0,healPower:u.healPower||0,hp:u.maxHp,def:u.def||0,magicDef:u.magicDef||0,quickness:u.quickness||0,dodge:u.dodge||0,gold:u.gold||0,weapon:(u.equipped?.weapon||u.weapon)?.weaponStyle||'none',tier:(u.equipped?.weapon||u.weapon)?.tier||0,upgrade:(u.equipped?.weapon||u.weapon)?.upgrade||0,family:attributeFamily(u),deployment:g.reserves.includes(u)?u.reserveExpeditionPlatoon!=null?'reserve_expedition':'reserve':u.isPersonalGuard?'personal':`platoon_${u.platoonId||0}`,composition:composition(u),damage:phaseDamage.get(u.id)||0}));
  for(const u of [...people.values(),g.player]){const counted=credits.get(u.id)||[0,0,0];assert.deepEqual(counted,[u.minionKills||0,u.midbossKills||0,u.bossKills||0],`kill hook accounting ${u.id}`);}
  const rankings={};for(const category of ['kills','overall','atk'])rankings[category]=computeRankings(collectAllSoldiers(g),category,10000).map(r=>({id:r.soldier.id,score:r.score}));
  const captain=joined?{id:g.player.id,level:g.player.level,minion:g.player.minionKills||0,midboss:g.player.midbossKills||0,boss:g.player.bossKills||0,atk:g.player.atk,magicAttack:g.player.magicAttack||0,healPower:g.player.healPower||0,hp:g.player.maxHp,def:g.player.def||0,magicDef:g.player.magicDef||0,quickness:g.player.quickness||0,dodge:g.player.dodge||0,tier:g.equipped?.weapon?.tier||0,rank_index:g.rankIndex,down:!!g.player.isDown,composition:composition(g.player,true)}:null;
  const actions=phaseActions.map(({hitTargets,...a})=>({...a,hit_targets:hitTargets.size}));
  if(captain){captain.overlay={};for(const category of ['kills','overall','atk']){const list=computeRankings([...collectAllSoldiers(g),{soldier:g.player,platoon:'hypothetical-commander'}],category,10000),index=list.findIndex(r=>r.soldier===g.player);captain.overlay[category]={score:list[index].score,rank:index+1};}}
  const row={seed,phase:completed,join_after:joinAfter,mode,clock,units,captain,rankings,counts:{living:units.filter(u=>u.alive).length,deployed:g.squad.filter(u=>!u.dead).length,reserve:g.reserves.filter(u=>!u.dead).length,active:activeSquad(g).length,active_peak:activePeak,active_mean:activeSeconds/PHASE_DURATION,hero_party:g.heroJourney?.party?.members?.filter(u=>!u.dead).length||0},economy:{treasury:g.treasury,gold:g.gold,nation_level:g.nation.level,tech_tier:g.nation.armament.techTier},wall_seconds:(hostPerformance.now()-phaseStart)/1000,sim_seconds:clock-phaseClockStart,actions:actions.length,kills:killEvents.length,source:'REAL_UPDATE_LOOP;SCRIPTED_PLAYER_AND_INITIAL_ROSTER'};
  appendFileSync(join(dir,'phases.jsonl'),JSON.stringify(row)+'\n');
  if(rawActions)appendFileSync(join(dir,'actions.jsonl'),actions.map(a=>JSON.stringify(a)).join('\n')+(actions.length?'\n':''));
  if(measureImpact)appendFileSync(join(dir,'actions-impact-base.jsonl'),phaseActions.map(({hitTargets,...a})=>JSON.stringify({...a,direct_hit_ids:[...hitTargets]})).join('\n')+(phaseActions.length?'\n':''));
  const summaries=new Map(),bucket=n=>n<1?'0':n===1?'1':n<=3?'2-3':n<=9?'4-9':'10+';
  for(const a of actions){const key=JSON.stringify([a.unit,a.weapon,a.family,a.deployment,a.location,a.kind,bucket(a.range_targets),bucket(a.hit_targets)]);let row=summaries.get(key);if(!row){const {id,clock,hitTargets,...base}=a;row={...base,range_bin:bucket(a.range_targets),hit_bin:bucket(a.hit_targets),attacks:0,damage:0,sum_range_targets:0,sum_hit_targets:0};summaries.set(key,row);}row.attacks++;row.damage+=a.damage;row.sum_range_targets+=a.range_targets;row.sum_hit_targets+=a.hit_targets;}
  appendFileSync(join(dir,'action-summary.jsonl'),[...summaries.values()].map(a=>JSON.stringify(a)).join('\n')+(summaries.size?'\n':''));
  appendFileSync(join(dir,'exposure.jsonl'),[...exposure.values()].map(e=>JSON.stringify(e)).join('\n')+(exposure.size?'\n':''));
  appendFileSync(join(dir,'kills.jsonl'),killEvents.map(k=>JSON.stringify(k)).join('\n')+(killEvents.length?'\n':''));
  if(measureImpact)appendFileSync(join(dir,'impact-events.jsonl'),impactEvents.map(e=>JSON.stringify(e)).join('\n')+(impactEvents.length?'\n':''));
  if(joinAfter===0&&mode==='skills'&&[1,5,10,15,20,30,40].includes(completed)){
    const data=IronSquadGame.saveGame.call(g,{persist:false});assert.ok(data?.player,'native synthetic checkpoint');
    writeFileSync(join(dir,`native-state-${completed}.json`),JSON.stringify({completed,clock,rngState,idCounter,data}));
  }
  allSnapshots.push(row);phaseActions=[];killEvents=[];impactEvents=[];phaseDamage.clear();exposure=new Map();activePeak=0;activeSeconds=0;phaseStart=hostPerformance.now();phaseClockStart=clock;
  writeFileSync(join(dir,'checkpoint.json'),JSON.stringify({seed,completed,clock,rngState,status:'running',rss:process.memoryUsage().rss,wall_seconds:(hostPerformance.now()-started)/1000}));
  console.log(JSON.stringify({run:runId,phase:completed,seconds:row.wall_seconds,living:row.counts.living,active:row.counts.active,kills:row.kills,captainKills:captain?captain.minion+captain.midboss+captain.boss:null,rss:process.memoryUsage().rss}));
}
let lastCompleted=0,outcome='complete',exception=null,awaitingComplete=null;
try{
  if(resumePath){
    const saved=JSON.parse(readFileSync(resumePath,'utf8'));g.resumeSavedGame(saved.data);stopAutoSave(g);g.closeStrategyModal();
    clock=saved.clock;rngState=saved.rngState;idCounter=saved.idCounter;lastCompleted=saved.completed;phaseClockStart=clock;people.clear();credits.clear();
    for(const {soldier:u}of collectAllSoldiers(g)){people.set(u.id,u);credits.set(u.id,[u.minionKills||0,u.midbossKills||0,u.bossKills||0]);}
    joinCommander();
  }else if(joinAfter===0)joinCommander();else{g.player.id='waiting-commander';g.player.minionKills=0;g.player.bossKills=0;g.player.midbossKills=0;}
  phasePolicy();
  const maxTime=phases*(PHASE_DURATION+REST_DURATION)+1;
  while(lastCompleted<phases&&clock<maxTime&&g.inBattle){
    const beforePhase=g.phase;command(dt);clock=Math.round((clock+dt)*1e6)/1e6;
    ordinaryByTick.clear();preShots=[...g.projectiles];preDelayed=new Map(g.squad.filter(u=>u.weaponSkillPending&&u.weaponSkillPending.delay<=dt).map(u=>[u.id,pendingDelayed.get(u.id)]));
    if(!g.restTimer){
      const actors=activeSquad(g).concat(joined?[g.player]:[]);activePeak=Math.max(activePeak,actors.length);activeSeconds+=actors.length*dt;
      for(const u of actors){if(u.dead)continue;const weapon=(u.equipped?.weapon||u.weapon)?.weaponStyle||'none',place=location(),deployment=u===g.player?'commander':u.heroPartyId?'hero_party':g.reserves.includes(u)?'reserve_expedition':u.isPersonalGuard?'personal':`platoon_${u.platoonId||0}`,key=JSON.stringify([u.id,weapon,place,deployment]);let e=exposure.get(key);if(!e){e={seed,phase:g.phase,unit:u.id,weapon,family:u===g.player?'COMMANDER':attributeFamily(u),location:place,deployment,seconds:0,ready_seconds:0};exposure.set(key,e);}e.seconds+=dt;if(!u.isDown&&u.hp>0)e.ready_seconds+=dt;}
    }
    g.update(dt);
    if(g.phase!==beforePhase)awaitingComplete=beforePhase;
    if(awaitingComplete!=null&&g.restTimer<=0){snapshot(awaitingComplete);lastCompleted=awaitingComplete;awaitingComplete=null;if(lastCompleted>=phases)break;phasePolicy();}
    if(Math.round(clock*10)%100===0){
      if(process.memoryUsage().rss>4*1024**3)throw Error('STOP_MEMORY_OVER_4GB');
      if((hostPerformance.now()-phaseStart)>30*60*1000)throw Error('STOP_PHASE_NO_PROGRESS_30_MIN');
    }
  }
  if(lastCompleted<phases)outcome=g.inBattle?'time_limit':'commander_lost';
  if(probe)writeFileSync(join(out,'benchmark.json'),JSON.stringify({seed,phases:lastCompleted,dt,wall_seconds:(hostPerformance.now()-started)/1000,first_phase_seconds:allSnapshots[0]?.wall_seconds,estimate_8_seeds_40_phases_seconds:(allSnapshots[0]?.wall_seconds||0)*8*40,counts:allSnapshots[0]?.counts,source:'REAL_UPDATE_LOOP'},null,2));
}catch(error){outcome='exception';exception=String(error.stack||error);console.error(exception);process.exitCode=1;}
finally{
  const numericHash=createHash('sha256').update(allSnapshots.map(({wall_seconds,...r})=>JSON.stringify(r)).join('\n')).digest('hex');
  const final={seed,phases:lastCompleted,requested_phases:phases,join_after:joinAfter,mode,dt,rookie_t1:rookieT1,measure_impact:measureImpact,dungeon_policy:dungeonPolicy,resume_path:resumePath,outcome,exception,clock,wall_seconds:(hostPerformance.now()-started)/1000,numericHash,existingGameSourcesUnchanged:sourceFiles.every(f=>hash(f)===sourceStart[f]),nestedDirectoryExists:existsSync('iron-squad/iron-squad'),jsdomBundleExists:existsSync('__pycache__/ui-tools/node_modules/jsdom/lib/api.js'),userDataAccessed:false,rss:process.memoryUsage().rss};
  writeFileSync(join(dir,'result.json'),JSON.stringify(final,null,2));writeFileSync(join(dir,'git-status-after.txt'),execFileSync('git',['status','--short'],{encoding:'utf8'}));
  g.destroy?.();dom.window.close();Math.random=original.random;Date.now=original.now;Object.defineProperty(globalThis,'performance',{configurable:true,value:original.performance});Object.defineProperty(globalThis,'crypto',{configurable:true,value:original.crypto});
  console.log(JSON.stringify(final));
}
