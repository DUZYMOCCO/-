import {ammoCapacity} from '../js/supply-rules.js';
// Analysis only: authentic invasion, dungeon and independent hero AI in isolated memory.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'file:///D:/%E3%82%B9%E3%83%9E%E3%83%9B%E3%82%B2%E3%83%BC%E3%83%A0%E5%B7%A5%E6%88%BF/__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {DUNGEON_DEFS} from '../js/dungeon.js';
import {distanceScaling,zoneRingPower} from '../js/equipment-rules.js';
import {rollAttributeProfile,attributeFamily} from '../js/unit-attributes.js';
import {canUseEquipment} from '../js/weapon-requirements.js';
import {rollHeroRevelation} from '../js/hero-party.js';
import {equipmentUpgradeCost} from '../js/payroll-rules.js';
const arg=(k,f)=>{const i=process.argv.indexOf(k);return i<0?f:process.argv[i+1];};
const part=arg('--part','stats'),stageId=arg('--stage','all'),seeds=Number(arg('--seeds','4')),out=arg('--out','iron-squad/docs/previews/campaign-feasibility-20261013');mkdirSync(out,{recursive:true});
const files=['iron-squad/sw-assets.js',...readdirSync('iron-squad/js').filter(p=>p.endsWith('.js')).sort().map(p=>`iron-squad/js/${p}`)];
const fingerprint=()=>Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const sourceStart=fingerprint(),manifest={GAME_ASSETS:{}};new Function('self',readFileSync(files[0],'utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'],random=Math.random,originalPerformance=performance,originalNow=Date.now;
let clock=0,state=1;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
Date.now=()=>1700000000000+Math.round(clock*1000);Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock*1000}});
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,SLOT_INFO,applyUpgradeStats}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2,castle=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle');
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])g[m]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('CAMPAIGN SIMULATION ONLY').id;g.startFreshGame(false);g.closeStrategyModal();
const initial=structuredClone(g.saveGame({persist:false}));
for(const m of ['saveGame','updateStatsUI','refreshSupplyUI','updateQuestUI','revealFogAroundPlayer','changeTimePeriod','deployReserves'])g[m]=noop;
const mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),sum=(a,k)=>a.reduce((n,v)=>n+(v[k]||0),0);
const fixture=u=>({class:u.soldierClass,level:u.level,hp:u.maxHp,atk:u.atk,def:u.def,magicAttack:u.magicAttack,magicDef:u.magicDef,strength:u.strength,dodge:u.dodge,barrier:u.equipmentBarrierMax||0,tier:u.equipped?.weapon?.tier,upgrade:u.equipped?.weapon?.upgrade||0});
function reset(seed){
  state=seed;clock=0;delete g.updateDemonInvasion;g.resumeSavedGame(structuredClone(initial));g.closeStrategyModal();g.career.status='enlisted';
  Object.assign(g,{monsters:[],restMonsters:[],reserves:[],currentQuest:null,currentDungeon:null,projectiles:[],powerFx:[],particles:[],shockwaves:[],damageTexts:[],dropsOnField:[],damageFields:[],magicBursts:[],restTimer:0,inBattle:true,phase:1,phaseTimer:1e6,worldTime:0,totalBattleTime:0,_hazardClock:0,_civSpawnClock:-1e9,_monsterGrid:null,_squadGrid:null,autoSaveClock:0,reserveCheckTimer:0});
  g.updateSpawns=noop;g.joystick={active:false,dirX:0,dirY:0};g.heroJourney={party:null,history:[],sequence:0,lastRollPhase:0,demonKingDefeat:null,castleScene:null};
  g.invasions.stage='idle';g.invasions.nextMajorPhase=11;g.invasions.majorCount=0;g.invasions.majorReference=null;g.baseRaidActive=false;
  Object.assign(g.player,{x:C+4000,y:C+4000,atkCooldown:1e6,powerAtkCooldown:1e6,hp:g.player.maxHp,isDown:false});
}
const legendary={HEAVY:'IMMORTAL_AEGIS',LIGHT:'VOID_EDGE',ARCHER:'STAR_HUNTER',MEDIC:'ARCHANGEL',MAGE:'ARCANE_SOVEREIGN'};
const stages=[
  {id:'initial',level:1,tier:1,upgrade:0},
  {id:'early-equipped',level:8,tier:5,upgrade:3},
  {id:'middle',level:14,tier:9,upgrade:0},
  {id:'trained',level:18,tier:10,upgrade:8},
  {id:'legendary40',level:40,tier:20,upgrade:10,legendary:true,waves:30},
  {id:'legendary60',level:60,tier:24,upgrade:20,legendary:true,waves:60},
  {id:'generous100',level:100,tier:28,upgrade:50,legendary:true,waves:100}
];
function equip(u,stage,style){
  if(stage.legendary){u.soldierClass=legendary[attributeFamily(u)];u.combatClass=u.soldierClass;}
  u.level=stage.level;u.survivedWaves=stage.waves||0;u.exp=0;u.reqExp=14;for(let lv=1;lv<u.level;lv++)u.reqExp=Math.floor(u.reqExp*1.5+8);
  u.equipped={};u.weapon=null;g.recalcSoldierStats(u);
  if(style)u.favoriteWeapon=style;
  for(const [type,{key}] of Object.entries(SLOT_INFO)){
    let item;
    for(let tier=stage.tier;tier>=1;tier--){
      item=g.createSupplyEquipment(type,u,tier);item.id=`analysis-${u.id}-${key}`;item.rollMult=1;
      if(type==='WEAPON'){
        if(style)item.weaponStyle=style;
        item.weaponTraits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
      }
      applyUpgradeStats(item,stage.upgrade);if(canUseEquipment(u,item))break;
    }
    assert.ok(canUseEquipment(u,item));u.equipped[key]=item;
  }
  u.weapon=u.equipped.weapon;g.recalcSoldierStats(u);Object.assign(u,{hp:u.maxHp,mana:u.maxMana,ammo:ammoCapacity(u),equipmentBarrier:u.equipmentBarrierMax||0,atkCooldown:0,weaponSkillCooldown:undefined,isDown:false,dead:false,reqExp:u.reqExp});
}
function hq(stage,kind,seed,captainMode='basic'){
  reset(seed);g.phase=kind==='major'?11:3;
  if(stage.natural){
    g.phase=1;g.heroJourney.lastRollPhase=1e6;
    for(let wave=0;wave<(kind==='major'?10:2);wave++){g.completePhase();for(let t=0;t<8;t++)g.processRestSecond();g.finishRest();g.monsters=[];g.restMonsters=[];}
    g.restTimer=0;g.phaseTimer=1e6;g.closeStrategyModal();
  }else if(stage.id!=='initial')for(const u of g.squad)equip(u,stage);
  if(captainMode==='grown'){
    g.player.level=stage.level;g.player.classTier=stage.legendary?3:1;g.player.isAdvanced=true;
    g.equipped=structuredClone(g.squad.find(u=>attributeFamily(u)==='LIGHT').equipped);g.recalcPlayerStats();g.player.hp=g.player.maxHp;
  }
  g.invasions.stage='idle';g.invasions.majorReference=null;g.invasions.majorCount=0;g.invasions.nextMajorPhase=11;
  Object.assign(g.player,{x:C+4000,y:C+4000,atkCooldown:1e6,powerAtkCooldown:1e6});
  const army=[...g.squad],fixtures=army.map(fixture);g.startDemonInvasion();g.arriveDemonInvasion();
  assert.equal(g.invasions.kind,kind);const enemies=[...g.monsters],strength={...g.invasions.strength};
  let peak=0,firstDown=null;const dt=.1;
  while(g.invasions.stage==='battle'&&clock<160&&g.inBattle){clock+=dt;g.update(dt);const downs=army.filter(u=>u.dead||u.isDown).length;peak=Math.max(peak,downs);if(downs&&firstDown===null)firstDown=clock;}
  const result={stage:stage.id,kind,captainMode,seed,seconds:clock,outcome:g.invasions.lastResult?.outcome||'unresolved',army:army.length,peakDown:peak,dead:army.filter(u=>u.dead).length,ready:army.filter(u=>!u.dead&&!u.isDown).length,firstDown,kills:enemies.filter(m=>m.hp<=0).length,enemyCount:enemies.length,units:enemies.map(m=>({hp:m.maxHp,atk:m.atk,commander:!!m.isInvasionCommander,elite:!!m.isMajorElite})),totalThreat:enemies.reduce((n,m)=>n+m.maxHp*m.atk,0),enemyHp:sum(enemies,'maxHp'),enemyHpRemaining:enemies.reduce((n,m)=>n+Math.max(0,m.hp),0),enemyAtkMin:Math.min(...enemies.map(m=>m.atk)),enemyAtkMax:Math.max(...enemies.map(m=>m.atk)),strength,fixtures};
  console.log(JSON.stringify({...result,fixtures:undefined}));return result;
}
function ordinaryParty(stage){
  const roles=['HEAVY','LIGHT','LIGHT','ARCHER','MEDIC','MAGE'],styles=['hammer','sword','spear','cannon','staff','wand'];
  g.squad=roles.map((role,i)=>{
    const u=g.createNewSoldier(null,{classKey:role,talent:'AVERAGE',attributeProfile:rollAttributeProfile(role,'AVERAGE',()=>.5,true)});u.id=`party-${i}`;equip(u,stage,styles[i]);u.isPersonalGuard=true;u._guardSlot=i;return u;
  });
  return g.squad;
}
function castleFight(stage,mode,seed){
  const single=mode!=='full',wall=mode.startsWith('wall'),encounter=wall?{...castle,distance:mode==='wall-before'?47999:48000}:castle;
  reset(seed);g.phase=25;g.phaseTimer=1e6;g.outposts=[];g.merchants=[];g.gateGuards=[];g.medicalPosts=[];g.civilians=[];g.updateDemonInvasion=noop;
  const army=ordinaryParty(stage),fixtures=army.map(fixture);g.currentDungeon=castle;g.instanceCargoIds=army.map(u=>u.id);
  // Stay clear of the real exit trigger at x=180; use a comparably equipped passive captain.
  g.player.level=stage.level;g.player.classTier=3;g.player.isAdvanced=true;g.equipped=structuredClone(army[1].equipped);g.recalcPlayerStats();
  Object.assign(g.player,{x:single?570:240,y:1000,hp:g.player.maxHp,atkCooldown:1e6,powerAtkCooldown:1e6});g.camera={x:500,y:1000};
  const captain={hp:g.player.maxHp,def:g.player.def,atk:g.player.atk};
  const enemies=single
    ?[wall?g.createDungeonMob('wyvern',850,1000,encounter,false,false):g.createDungeonBoss(castle.boss,850,1000,castle)]
    :[...Array.from({length:castle.mobCount},(_,i)=>g.createDungeonMob(castle.mobTypes[i%castle.mobTypes.length],460+(i%7)*62,260+Math.floor(i/7)*350,castle,false)),...Array.from({length:castle.eliteCount},(_,i)=>g.createDungeonMob(castle.mobTypes.at(-1),1200+(i%3)*110,400+Math.floor(i/3)*900,castle,true)),g.createDungeonBoss(castle.boss,castle.width-350,castle.height/2,castle)];
  g.monsters=[...enemies]; // Keep references for killed targets after killMonster splices the live array.
  army.forEach((u,i)=>Object.assign(u,{x:single?730-i*15:200-i*10,y:1000+(i-2)*22}));
  let firstDown=null,allDown=null,peak=0,damage=0;const dt=.05;
  while(clock<180&&g.inBattle&&g.monsters.length){
    if(mode==='full'){const target=g.monsters.reduce((best,m)=>!best||Math.hypot(m.x-g.player.x,m.y-g.player.y)<Math.hypot(best.x-g.player.x,best.y-g.player.y)?m:best,null),dx=target.x-g.player.x,dy=target.y-g.player.y,d=Math.hypot(dx,dy);g.joystick={active:d>160,dirX:dx/Math.max(1,d),dirY:dy/Math.max(1,d)};}
    clock+=dt;g.update(dt);if(g.currentDungeon?.id!==castle.id)break;const downs=army.filter(u=>u.dead||u.isDown).length;peak=Math.max(peak,downs);if(downs&&firstDown===null)firstDown=clock;if(downs===army.length){allDown=clock;break;}}
  damage=enemies.reduce((n,m)=>n+m.maxHp-Math.max(0,m.hp),0);
  assert.equal(enemies.length,single?1:castle.mobCount+castle.eliteCount+1);
  const kills=enemies.filter(m=>m.hp<=0).length;
  const result={stage:stage.id,mode,seed,distance:encounter.distance/100,enemyAtk:enemies.map(m=>m.atk),seconds:clock,firstDown,allDown,peakDown:peak,dead:army.filter(u=>u.dead).length,ready:army.filter(u=>!u.dead&&!u.isDown).length,kills,enemyCount:enemies.length,enemyHp:sum(enemies,'maxHp'),damage,damagePct:100*damage/sum(enemies,'maxHp'),outcome:kills===enemies.length?'victory':g.currentDungeon?.id!==castle.id?'retreated':allDown?'all-down':!g.inBattle?'captain-lost':g.player.isDown?'captain-down':'time-limit',fixtures,captain};
  assert.ok(result.outcome!=='victory'||result.damagePct>=99.999,'victory must mean actual enemy HP loss');
  console.log(JSON.stringify({...result,fixtures:undefined}));return result;
}
function heroRoute(seed){
  reset(seed);g.squad=[];g.reserves=[];g.outposts=[];g.merchants=[];g.gateGuards=[];g.medicalPosts=[];g.civilians=[];g.updateDemonInvasion=noop;g.phase=10;g.phaseTimer=1e6;
  Object.assign(g.player,{x:C,y:C,atkCooldown:1e6,powerAtkCooldown:1e6});
  assert.equal(rollHeroRevelation(g,()=>0),true);const p=g.heroJourney.party,initial=p.members.map(fixture),trace=[];let maxDistance=0,enteredAt=null,kills=0,firstDown=null;
  const dt=.1;
  while(clock<1800&&p.status!=='fallen'&&!g.heroJourney.demonKingDefeat){clock+=dt;g.update(dt);
    if(p.space==='field')maxDistance=Math.max(maxDistance,Math.hypot(p.x-C,p.y-C));else if(enteredAt===null)enteredAt=clock;
    if(firstDown===null&&p.members.some(u=>u.dead||u.isDown))firstDown=clock;
    if(Math.round(clock/dt)%300===0)trace.push({seconds:clock,distance:maxDistance/100,status:p.status,ready:p.members.filter(u=>!u.dead&&!u.isDown).length,levels:p.members.map(u=>u.level)});
  }
  const result={seed,seconds:clock,maxDistance:maxDistance/100,castleDistance:castle.distance/100,enteredAt,status:p.status,firstDown,defeated:!!g.heroJourney.demonKingDefeat,initial,members:p.members.map(u=>({...fixture(u),dead:u.dead,isDown:u.isDown,kills:u.minionKills,bossKills:u.bossKills})),trace};
  console.log(JSON.stringify({...result,trace:undefined}));return result;
}
function statAudit(){
  reset(1701);g.phase=10;
  const scales=[0,7999,8000,21999,22000,47999,48000,castle.distance,70000,79360].map(distance=>({distance:distance/100,ring:zoneRingPower(distance),...distanceScaling(distance,10)}));
  const castleEnemies=castle.mobTypes.map(type=>({...g.createDungeonMob(type,900,1000,castle,false,false),kind:'ordinary'})).concat([{...g.createDungeonMob(castle.mobTypes.at(-1),900,1000,castle,true,false),kind:'elite'},g.createDungeonBoss(castle.boss,900,1000,castle)]);
  const partyStats=stages.filter(s=>s.legendary).map(stage=>{const units=ordinaryParty(stage);return {stage,units:units.map(fixture),totalHp:sum(units,'maxHp'),totalAtk:sum(units,'atk')};});
  const costOfAllUpgrades=(tier,n)=>{const item={tier,upgrade:0};let cost=0;for(let i=0;i<n;i++){item.upgrade=i;cost+=equipmentUpgradeCost(item);}return cost;};
  const forging=[20,50,100,1000,10000].map(upgrade=>({tier:28,upgrade,attackMultiplier:1+upgrade*.25,costPerItem:costOfAllUpgrades(28,upgrade)}));
  const castleEnemyLimits=[1,100].flatMap(phase=>{g.phase=phase;return [...castle.mobTypes.map(type=>[type,false]),[castle.mobTypes.at(-1),true]].map(([type,elite])=>{const m=g.createDungeonMob(type,900,1000,castle,elite,false);assert.ok(m.atk<castle.boss.atk&&m.maxHp<castle.boss.hp);return {phase,phaseMultiplier:distanceScaling(castle.distance,phase).phaseBonus,type,elite,hp:m.maxHp,atk:m.atk};});});
  return {castleEnemyLimits,scales,castle:{distance:castle.distance/100,mobCount:castle.mobCount,eliteCount:castle.eliteCount,enemies:castleEnemies},partyStats,forging};
}

function commanderEquip(stage){
  ordinaryParty(stage);g.player.level=stage.level;g.player.isAdvanced=!!stage.legendary;g.player.survivedWaves=stage.waves||0;g.player.bossKills=stage.legendary?(Number(release.gameVersion.split('.')[2])>=24?4:32):0;g.player.midbossKills=stage.legendary&&Number(release.gameVersion.split('.')[2])>=24?28:0;
  g.equipped=structuredClone(g.squad[1].equipped);g.rankIndex=stage.legendary?5:stage.level>10?2:0;g.recalcPlayerStats();g.player.hp=g.player.maxHp;
}
function commanderAudit(stage){
  reset(777);commanderEquip(stage);g.squad=[];g.reserves=[];g.currentQuest=null;g.currentDungeon=null;
  Object.assign(g.player,{x:83000,y:83000,atkCooldown:0});g.camera={x:83000,y:83000};
  const profile=g.combatProfileFor(g.player,g.equipped.weapon,true),distance=profile.playerReach*.52;
  const m={type:'goblin',x:g.player.x+distance,y:g.player.y,hp:1e12,maxHp:1e12,atk:0,def:0,radius:10,speed:0};
  g.monsters=[m];g.manualAttack();const interval=g.player.atkCooldown;let damage=0;
  const base=structuredClone(g.player);
  for(let i=0;i<2000;i++){
    g.player=structuredClone(base);m.hp=1e12;m.x=g.player.x+distance;m.y=g.player.y;g.performAttack(g.player,m,true,g.player.atk,false,'physical',{hitDist:distance});damage+=1e12-m.hp;
  }
  const result={kind:'commander-dps',stage:stage.id,hp:base.maxHp,atk:base.atk,def:base.def,crit:base.crit,interval,meanHit:damage/2000,dps:damage/2000/interval,traits:g.equipped.weapon.weaponTraits};
  console.log(JSON.stringify(result));return result;
}
function targetAudit(stage,type){
  reset(778);commanderEquip(stage);g.squad=[];g.reserves=[];g.gateGuards=[];g.merchants=[];g.medicalPosts=[];g.civilians=[];g.outposts=[];g.updateDemonInvasion=noop;
  Object.assign(g.player,{x:83000,y:83000,atkCooldown:0});
  const def=DUNGEON_DEFS.find(d=>d.id==='dungeon_catacombs');
  const m=type==='dungeon'?g.createDungeonBoss(def.boss,83050,83000,def):g.spawnColossalBoss('colossal_dragon',83050,83000);
  const authoredAtk=m.atk;m.atk=0;m.speed=0;m.atkTimer=1e9;m.skillTimer=1e9;g.monsters=[m];g._monsterGrid=null;
  // Isolated offensive time-to-kill: target cannot attack and commander stays in the sweet spot.
  const base=structuredClone(g.player);let seconds=0,cd=0;
  while(m.hp>0&&seconds<600){
    g.player=structuredClone(base);g.player.atkCooldown=cd;m.x=g.player.x+50;m.y=g.player.y;g.monsters=[m];g.manualAttack();cd=g.player.atkCooldown;
    if(cd<=0)break;if(m.hp>0)seconds+=cd;cd=0;g.projectiles=[];
  }
  const result={kind:'time-to-kill',stage:stage.id,type,hp:m.maxHp,authoredAtk,seconds,killed:m.hp<=0,damage:m.maxHp-Math.max(0,m.hp),passiveTarget:true};console.log(JSON.stringify(result));return result;
}
function levelAudit(){
  const rows=[];for(const level of [10,30,50,80]){reset(777);g.player.level=level;g.player.isAdvanced=false;g.player.bossKills=0;g.player.survivedWaves=0;g.equipped={};g.rankIndex=0;g.recalcPlayerStats();
    const u=g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE',attributeProfile:rollAttributeProfile('LIGHT','AVERAGE',()=>.5,true)});u.level=level;u.equipped={};u.weapon=null;u.survivedWaves=0;u.minionKills=0;u.bossKills=0;g.recalcSoldierStats(u);
    rows.push({level,commander:{hp:g.player.maxHp,atk:g.player.atk,def:g.player.def,strength:g.player.strength},soldier:{hp:u.maxHp,atk:u.atk,def:u.def,strength:u.strength}});
  }return rows;
}

const report={version:release.gameVersion,cache:release.version,part,sourceHashes:sourceStart,settings:{seeds,castleCaptain:'passive in boss-only; native joystick approach toward nearest enemy in full encounter',stageGrowth:'allowed during combat',freshMemory:true,userSavesAccessed:false,unrelatedSpawns:false},runs:[]};
try{
  if(part==='balance'){
    for(const stage of stages.filter(s=>['early-equipped','trained','generous100'].includes(s.id))){
      report.runs.push(commanderAudit(stage));
      for(const kind of ['regular','major'])for(let i=0;i<seeds;i++)report.runs.push(hq(stage,kind,202610130+i));
      for(const type of ['dungeon','midboss'])report.runs.push(targetAudit(stage,type));
    }
    report.levels=levelAudit();
  }
  else if(part==='stats')report.audit=statAudit();
  else if(part==='hq'){
    for(const stage of [...stages,{id:'natural-maintenance',natural:true}].filter(s=>stageId==='all'||s.id===stageId))for(const kind of ['regular','major'])for(let i=0;i<seeds;i++)report.runs.push(hq(stage,kind,202610130+i));
    for(const stage of stages.slice(2,5).filter(s=>stageId==='all'||s.id===stageId))for(let i=0;i<seeds;i++)report.runs.push(hq(stage,'regular',202610130+i,'grown'));
  }
  else if(part==='castle')for(const stage of stages.filter(s=>s.legendary&&(stageId==='all'||s.id===stageId)))for(const mode of ['boss','full'])for(let i=0;i<seeds;i++)report.runs.push(castleFight(stage,mode,202610130+i));
  else if(part==='wall')for(const mode of ['wall-before','wall-after'])for(let i=0;i<seeds;i++)report.runs.push(castleFight(stages.find(s=>s.id==='legendary40'),mode,202610130+i));
  else if(part==='hero')for(let i=0;i<seeds;i++)report.runs.push(heroRoute(202610130+i));
  else throw Error(`Unknown part ${part}`);
  assert.deepEqual(fingerprint(),sourceStart,'game code changed during the measurement; repeat on a stable source');
  writeFileSync(`${out}/${part}.json`,JSON.stringify(report,null,2)+'\n');console.log(`PASS ${part}: ${report.runs.length} runs, unchanged source hashes`);
}finally{Math.random=random;Date.now=originalNow;Object.defineProperty(globalThis,'performance',{configurable:true,value:originalPerformance});dom.window.close();}
