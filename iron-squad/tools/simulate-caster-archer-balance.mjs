import {ammoCapacity} from '../js/supply-rules.js';
// Controlled comparisons through the real game update/damage/projectile code.
// This tool does not alter balance parameters or read a user's browser save.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {canUseEquipment} from '../js/weapon-requirements.js';
import {WORLD_SIZE} from '../js/world.js';
import {TIERS} from '../js/equipment-tiers.js';

const flag=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:Number(process.argv[i+1]);};
const sampleCount=flag('--seeds',24),duration=flag('--duration',180),dt=flag('--dt',.05);
const out='iron-squad/docs/previews/caster-archer-balance-20261013';mkdirSync(out,{recursive:true});
const sourceFiles=['iron-squad/sw-assets.js',...readdirSync('iron-squad/js').filter(p=>p.endsWith('.js')).sort().map(p=>`iron-squad/js/${p}`)];
const fingerprint=()=>Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const sourceStart=fingerprint(),manifest={GAME_ASSETS:{}};new Function('self',readFileSync(sourceFiles[0],'utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'];
const randomFor=seed=>{let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
const originalRandom=Math.random;Math.random=randomFor(20261013);
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SLOT_INFO}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('BALANCE SIMULATION ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const basePlayer=structuredClone(g.player),baseNation=structuredClone(g.nation);
for(const name of ['saveGame','updateStatsUI','refreshSupplyUI','updateQuestUI','revealFogAroundPlayer','changeTimePeriod','updateSpawns','updateDemonInvasion','deployReserves'])g[name]=noop;
const realRecalc=IronSquadGame.recalcSoldierStats,realAttack=IronSquadGame.performAttack,realShot=IronSquadGame.spawnRangedProjectile;
let stats=null,clock=0,attackDepth=0;
const realImpact=IronSquadGame.knockImpactDamage;
g.knockImpactDamage=function(monster,rawDamage,by,byPlayer){
  const hp=monster?.hp,result=realImpact.call(this,monster,rawDamage,by,byPlayer);
  if(stats&&by===stats.actor&&Number.isFinite(hp)){const damage=hp-monster.hp;stats.damage+=damage;stats.impactDamage+=damage;}
  return result;
};
g.performAttack=function(attacker,target,...args){
  const hp=target.hp,kind=args[3],hitDistance=typeof args[2]==='number'?args[2]:Math.hypot(target.x-attacker.x,target.y-attacker.y);let result;
  attackDepth++;try{result=realAttack.call(this,attacker,target,...args);}finally{attackDepth--;}
  // A magical arrow recursively applies its extra hit. Its parent HP delta already includes that hit.
  if(stats&&attacker===stats.actor&&kind==='magic')stats.magicalDamage+=hp-target.hp;
  if(stats&&attacker===stats.actor&&attackDepth===0){const damage=hp-target.hp;stats.damage+=damage;stats.hits+=damage>0?1:0;
    if(damage>0&&kind!=='magic'){stats.attackDistanceSum+=hitDistance;stats.physicalHits++;}
    if(this.__simRangedKind==='loaded'||stats.loadedRawDamages.has(args[1])||(['bow','crossbow','cannon'].includes(attacker.weapon?.weaponStyle)&&kind!=='sidearm'&&kind!=='magic')){stats.loadedDamage+=damage;stats.loadedHits+=damage>0?1:0;}
    if(this.__simRangedKind==='stone'||stats.stoneRawDamages.has(args[1]))stats.stoneDamage+=damage;
    if(this.__simRangedKind==='sidearm'||kind==='sidearm')stats.sidearmDamage+=damage;
    if(kind==='magic'&&stats.lastCast!==clock){stats.casts++;stats.lastCast=clock;}}
  return result;
};
g.spawnRangedProjectile=function(attacker,target,...args){
  const mine=stats&&attacker===stats.actor,loaded=attacker.ammo>0,before=this.projectiles.length;
  const result=realShot.call(this,attacker,target,...args);
  if(mine&&this.projectiles.length>before){stats.shots++;if(!loaded)stats.stones++;}
  if(mine)for(const shot of this.projectiles.slice(before)){(loaded?stats.loadedRawDamages:stats.stoneRawDamages).add(shot.damage);if(shot.magicDamage>0)stats.infusedShots++;}
  return result;
};
const phases=[{id:'early',level:1,tier:1,pressure:30},{id:'middle',level:10,tier:9,pressure:150},{id:'late',level:30,tier:21,pressure:600}];
const fixtures={};
function setup(stage,role,{supply='none',affinity='fire',ward=false,liveGrowth=false,weaponStyle,initialAmmo=null,neutralTraits=false}={}) {
  const origin=supply==='hq-defense'?WORLD_SIZE/2:WORLD_SIZE/2+4000;
  Object.assign(g,{player:structuredClone(basePlayer),nation:structuredClone(baseNation),squad:[],reserves:[],monsters:[],outposts:[],merchants:[],gateGuards:[],medicalPosts:[],dungeons:[],civilians:[],remains:[],projectiles:[],particles:[],dropsOnField:[],magicBursts:[],damageFields:[],magicReserve:0,ammoReserve:0,currentQuest:null,currentDungeon:null,restTimer:0,inBattle:true,phase:1,phaseTimer:100000,worldTime:0,totalBattleTime:0,baseRaidActive:false,baseRaidMobs:[],_monsterGrid:null,_squadGrid:null,_tankHeavies:null,_tankAllies:null,_baseThreatList:[],_hazardClock:0,_civSpawnClock:-100000,autoSaveClock:0,reserveCheckTimer:0,_supplyClock:0,_manaSupplyClock:0,heroJourney:{party:null},worldTerrain:{tiles:new Map()},camera:{x:origin+100,y:origin},joystick:{active:false,dirX:0,dirY:0}});
  g.invasions.stage=supply==='hq-defense'?'battle':'idle';
  Object.assign(g.player,{x:origin,y:origin,hp:g.player.maxHp,speed:0,atkCooldown:100000,powerAtkCooldown:100000,isAdvanced:false,isDown:false});
  if(supply==='camp')g.worldTerrain.tiles.set('simulation-camp',{camps:[{id:'simulation-camp',x:origin+100,y:origin}]});
  g.recalcSoldierStats=realRecalc;
  const u=g.createNewSoldier(null,{classKey:role,talent:'AVERAGE',attributeProfile:rollAttributeProfile(role,'AVERAGE',()=>.5,true)});
  Object.assign(u,{id:`sim-${role}`,soldierClass:role,combatClass:role,level:stage.level,talent:'AVERAGE',survivedWaves:0,minionKills:0,bossKills:0,kills:0,isNamed:false,isVeteran:false,isPersonalGuard:true,isDown:false,dead:false,platoonId:0,_pgTick:0,_guardSlot:0,gold:0,atkCooldown:0,magicRecovering:false,magicAffinity:affinity,equipped:{},weapon:null,deathlineSkills:[],hitGrowthHp:0,hitGrowthDef:0,hitGrowthPct:0,hitGrowthVersion:2,weaponMastery:{},inferiorGrit:0,x:origin+100,y:origin});
  u.attributeProfile=rollAttributeProfile(role,'AVERAGE',()=>.5,true);u._attributesNormalized=false;
  for(const [type,{key}]of Object.entries(SLOT_INFO)){
    const item=g.createSupplyEquipment(type,u,stage.tier);
    if(type==='WEAPON'){
      item.weaponStyle=weaponStyle||(role==='MAGE'?'wand':'bow');
      if(weaponStyle){item.baseName=TIERS[stage.tier-1][{sword:'weapon',spear:'spear',hammer:'hammer',axe:'axe',bow:'bow',crossbow:'crossbow',cannon:'cannon'}[weaponStyle]];u.favoriteWeapon=weaponStyle;}
      if(neutralTraits)item.weaponTraits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
      g.applyEquipmentUpgrade(item,0);
    }
    if(ward&&type==='ARMOR'){item.armorStyle='ward';g.applyEquipmentUpgrade(item,0);}
    u.equipped[key]=item;if(key==='weapon')u.weapon=item;
  }
  realRecalc.call(g,u);assert.ok(Object.values(u.equipped).every(item=>canUseEquipment(u,item)),'every simulated item must be legal');
  u.hp=u.maxHp;u.mana=u.maxMana;u.ammo=initialAmmo??ammoCapacity(u);u.equipmentBarrier=u.equipmentBarrierMax;u.equipmentBarrierDelay=0;g.squad=[u];
  const key=`${stage.id}-${role}${weaponStyle?'-'+weaponStyle:''}${ward?'-ward':''}`,snapshot={level:u.level,tier:stage.tier,hp:u.maxHp,def:u.def,magicDef:u.magicDef,barrier:u.equipmentBarrierMax,atk:u.atk,magicAttack:u.magicAttack,strength:u.strength,magic:u.magicPower,dodge:u.dodge,crit:u.crit,armor:u.equipped.armor.name,equipmentMagicBonus:u.equipmentMagicBonus};
  if(fixtures[key])assert.deepEqual(snapshot,fixtures[key],'only combat RNG can differ between repetitions');else fixtures[key]=snapshot;
  if(!liveGrowth)g.recalcSoldierStats=noop;
  stats={actor:u,damage:0,hits:0,casts:0,lastCast:-1,shots:0,stones:0,infusedShots:0,loadedDamage:0,stoneDamage:0,sidearmDamage:0,magicalDamage:0,impactDamage:0,attackDistanceSum:0,physicalHits:0,loadedHits:0,loadedRawDamages:new Set(),stoneRawDamages:new Set()};clock=0;
  return u;
}
function fixedProgress(u,liveGrowth){if(liveGrowth)return;u.weaponMastery={};u.attributeProfile.practice={strength:0,magic:0,magicDefense:0,travel:0,evasion:0};u._attributesDirty=false;u.hitGrowthHp=0;u.hitGrowthDef=0;}
const quantile=(xs,p)=>{const s=[...xs].sort((a,b)=>a-b),i=(s.length-1)*p;return s[Math.floor(i)]+(s[Math.ceil(i)]-s[Math.floor(i)])*(i%1);};
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
function offense(stage,role,config,seed) {
  Math.random=randomFor(seed);const u=setup(stage,role,config);Math.random=randomFor(seed^0x37ac19);
  const center=u.x+(config.distance??150),ys=u.y,positions=config.positions??(config.targets===5?[[0,0],[-20,0],[20,0],[0,-20],[0,20]]:[[0,0]]);
  g.monsters=positions.map(([dx,dy],i)=>({id:`target-${i}`,type:'goblin',isBoss:config.targets===1,x:center+dx,y:ys+dy,hp:1e12,maxHp:1e12,def:config.def??100,magicDef:config.magicDef??100,dmgReduction:0,atk:0,speed:config.targetSpeed??0,radius:8,atkTimer:100000,attackInterval:100000,exp:0,color:'#444'}));
  const homes=g.monsters.map(m=>({x:m.x,y:m.y}));
  let meditation=0,ammoEmpty=null,burst=0,at60=0,manaUsed=0,downAt=null,pressureIncoming=0,closeSeconds=0;const trace=[];
  const count=Math.round(duration/dt);
  for(let tick=1;tick<=count;tick++){
    clock=tick*dt;
    if(config.anchorTargets)g.monsters.forEach((m,i)=>Object.assign(m,homes[i]));
    const mana=u.mana;g.update(dt);if(mana>u.mana)manaUsed+=mana-u.mana;
    if(config.closePressure){
      const nearest=g.getNearestMonster(u.x,u.y),distance=nearest?Math.hypot(nearest.x-u.x,nearest.y-u.y):Infinity;
      if(distance<=65){closeSeconds+=dt;if(tick%Math.round(.5/dt)===0){pressureIncoming+=config.closePressure;g.damageTarget(u,config.closePressure,{attacker:nearest,damageKind:'physical'});}}
    }
    if(config.anchorTargets)g.monsters.forEach((m,i)=>Object.assign(m,homes[i]));
    if(u.magicRecovering)meditation+=dt;if(u.ammo===0&&ammoEmpty===null)ammoEmpty=clock;
    fixedProgress(u,config.liveGrowth);
    if(Math.abs(clock-15)<dt/2)burst=stats.damage;if(Math.abs(clock-60)<dt/2)at60=stats.damage;
    if(tick%Math.round(5/dt)===0)trace.push({seconds:clock,damage:stats.damage,mp:u.mana??0,ammo:u.ammo,meditating:!!u.magicRecovering});
    if(config.allowDown&&(u.isDown||u.hp<=0)){downAt=clock;break;}
  }
  assert.ok(stats.damage>0||config.allowIdle);assert.equal(g.phase,1);assert.equal(g.restTimer,0);if(!config.allowDown)assert.equal(u.isDown,false);
  assert.equal(stats.damage,g.monsters.reduce((total,m)=>total+m.maxHp-m.hp,0),'damage accounting must equal actual HP lost, including magical arrows');
  assert.equal(g.invasions.stage,config.supply==='hq-defense'?'battle':'idle');
  return {seed,dps:stats.damage/duration,burstDps:burst/15,lateDps:duration>60?(stats.damage-at60)/(duration-60):null,damage:stats.damage,magicalDamage:stats.magicalDamage,impactDamage:stats.impactDamage,meanAttackDistance:stats.physicalHits?stats.attackDistanceSum/stats.physicalHits:null,hits:stats.hits,casts:stats.casts,shots:stats.shots,stones:stats.stones,infusedShots:stats.infusedShots,loadedDamage:stats.loadedDamage,stoneDamage:stats.stoneDamage,sidearmDamage:stats.sidearmDamage,loadedHits:stats.loadedHits,loadedShots:stats.shots-stats.stones,meditationSeconds:meditation,ammoEmptyAt:ammoEmpty,manaUsed,downAt,pressureIncoming,closeSeconds,targetDamage:g.monsters.map(m=>m.maxHp-m.hp),trace};
}
function durability(stage,role,mix,seed,{ward=false,liveGrowth=false,weaponStyle}={}) {
  Math.random=randomFor(seed);const u=setup(stage,role,{ward,liveGrowth,weaponStyle});Math.random=randomFor(seed^0x65af22);
  const pressure=randomFor(seed^0x912fae),attacker={id:'pressure-source',x:u.x+20,y:u.y,hp:1e12,maxHp:1e12,type:'goblin'};
  let raw=0,downAt=null,hitCount=0,timeSinceHit=0;const durationLimit=180;
  for(let tick=1;tick<=Math.round(durationLimit/dt);tick++){
    clock=tick*dt;g.update(dt);fixedProgress(u,liveGrowth);timeSinceHit+=dt;
    if(timeSinceHit>=.5-1e-9){timeSinceHit-=.5;attacker.x=u.x+20;attacker.y=u.y;
      const roll=pressure(),power=Math.round(stage.pressure*(.8+pressure()*.4));
      const magical=mix==='magic'||mix==='mixed'&&roll<.25;raw+=power;hitCount++;
      g.damageTarget(u,power,{attacker,damageKind:magical?'magic':'physical'});
      if(u.isDown||u.hp<=0){downAt=clock;break;}
    }
  }
  return {seed,downAt,censored:downAt===null,rawIncoming:raw,hitCount,aliveAt30:downAt===null||downAt>30,aliveAt60:downAt===null||downAt>60};
}
const report={version:release.gameVersion,cache:release.version,accountingVersion:2,settings:{sampleCount,duration,dt,seedBase:202610130,frozenProgress:true,quality:1,upgrade:0,classTier:0,boss:{def:100,magicDef:100},note:'Continuous encounter; no wave breaks, healing, tank cover, resurrections, kills or leveling. Real update/damage/mana/ammo/projectile routines. Starting HP/MP/ammo/barrier full.'},fixtures,offense:[],durability:[],sensitivity:[],sourceHashes:sourceStart,checks:[]};
export {offense,durability,phases,fixtures,sourceStart,fingerprint,release,dt,duration,mean,quantile};
export function cleanup(){stats=null;Math.random=originalRandom;g.destroy();dom.window.close();}
const isMain=!!process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isMain){
try{
 for(const stage of phases){
   for(const supply of ['none','camp','hq-defense'])for(const role of ['ARCHER','MAGE'])for(const affinity of role==='MAGE'?['fire','ice','lightning','explosion']:['none']){
     const rows=[];for(let i=0;i<(role==='ARCHER'?sampleCount:1);i++)rows.push(offense(stage,role,{supply,affinity,targets:1},202610130+i));
     const result={stage:stage.id,role,supply,affinity,targets:1,dps:mean(rows.map(r=>r.dps)),dpsP10:quantile(rows.map(r=>r.dps),.1),dpsP90:quantile(rows.map(r=>r.dps),.9),burstDps:mean(rows.map(r=>r.burstDps)),lateDps:mean(rows.map(r=>r.lateDps)),meditationPct:100*mean(rows.map(r=>r.meditationSeconds))/duration,ammoEmptyAt:rows[0].ammoEmptyAt,casts:rows[0].casts,shots:rows[0].shots,stones:rows[0].stones,trace:rows[0].trace};
     report.offense.push(result);
   }
   for(const mix of ['physical','mixed','magic'])for(const role of ['ARCHER','MAGE']){
     const rows=[];for(let i=0;i<sampleCount;i++)rows.push(durability(stage,role,mix,202610130+i));
     report.durability.push({stage:stage.id,role,mix,rawDps:stage.pressure*2,medianSeconds:quantile(rows.map(r=>r.downAt??180),.5),p10Seconds:quantile(rows.map(r=>r.downAt??180),.1),p90Seconds:quantile(rows.map(r=>r.downAt??180),.9),medianRawIncoming:quantile(rows.map(r=>r.rawIncoming),.5),survival30:mean(rows.map(r=>+r.aliveAt30)),survival60:mean(rows.map(r=>+r.aliveAt60)),censoredCount:rows.filter(r=>r.censored).length,runs:rows});
   }
   console.log(JSON.stringify({stage:stage.id,offense:report.offense.filter(r=>r.stage===stage.id&&r.supply==='none').map(({role,affinity,dps,meditationPct})=>({role,affinity,dps,meditationPct})),durability:report.durability.filter(r=>r.stage===stage.id).map(({role,mix,medianSeconds})=>({role,mix,medianSeconds}))}));
 }
 const main=phases[1];
 for(const role of ['ARCHER','MAGE'])for(const affinity of role==='MAGE'?['fire','ice','lightning','explosion']:['none']){
   const rows=[];for(let i=0;i<(role==='ARCHER'?sampleCount:1);i++)rows.push(offense(main,role,{supply:'none',affinity,targets:5},202610130+i));
   report.offense.push({stage:main.id,role,supply:'none',affinity,targets:5,dps:mean(rows.map(r=>r.dps)),burstDps:mean(rows.map(r=>r.burstDps)),lateDps:mean(rows.map(r=>r.lateDps)),trace:rows[0].trace});
 }
 for(const role of ['ARCHER','MAGE']){
   const row=offense(main,role,{supply:'none',affinity:'fire',targets:1,liveGrowth:true},202610130);
   report.sensitivity.push({kind:'live-growth',role,dps:row.dps,burstDps:row.burstDps,lateDps:row.lateDps});
 }
 for(const mix of ['physical','mixed','magic']){
   const rows=[];for(let i=0;i<sampleCount;i++)rows.push(durability(main,'MAGE',mix,202610130+i,{ward:true}));
   report.sensitivity.push({kind:'ward-robe',role:'MAGE',mix,medianSeconds:quantile(rows.map(r=>r.downAt??180),.5)});
 }
 // Verify core scenario assumptions and that source files did not change underneath the run.
 const rows=report.offense.filter(r=>r.stage==='middle'&&r.targets===1),archer=rows.find(r=>r.role==='ARCHER'&&r.supply==='none');
 assert.equal(archer.stones,0);assert.ok(archer.ammoEmptyAt!==null);assert.ok(rows.filter(r=>r.role==='MAGE'&&r.supply==='none').every(r=>r.meditationPct>0));
 assert.ok(rows.filter(r=>r.role==='MAGE'&&r.supply==='camp').every(r=>r.meditationPct===0));
 assert.ok(rows.filter(r=>r.role==='ARCHER'&&r.supply==='camp').every(r=>r.stones===0));
 assert.deepEqual(fingerprint(),sourceStart,'game source changed during the run; rerun against one consistent revision');
 report.checks.push('legal gear','actual damage > 0','no unintended rest/phase/death','field ammo depletion without stones','field mage meditation','camp MP/ammo refill','source hash stability');
 writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));console.log(`PASS: ${report.offense.length} damage scenarios and ${report.durability.length*sampleCount} durability trials; results written`);
}finally{cleanup();}
}
