import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile,soldierCombatTempo,evasionChance} from '../js/unit-attributes.js';
import {attackCooldown,weaponCombatProfile,soldierAttackCooldown} from '../js/equipment-rules.js';
import {soldierMeleeReload} from '../js/soldier-melee-skills.js';
import {buildTransportRescueAssign,transportInCombat,transportSpeedFactor,attachWounded,carryingCapacity} from '../js/casualty-rules.js';
import {rangedFrontlinePosition,rangedDrawPose,sidearmAttack} from '../js/ranged-combat.js';
import {ammoCapacity,updateSupplies} from '../js/supply-rules.js';
import {rangedPose} from '../js/weapon-motion.js';
import {WORLD_SIZE,northSouthRoadX} from '../js/world.js';
import {masteryReloadMult} from '../js/growth-rules.js';
import {sound} from '../../common/js/audio.js?v=151';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,applyUpgradeStats}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText','updateSpawns'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('LIGHT INFANTRY TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y),random=Math.random,playWeapon=sound.playWeapon;
let serial=0;
function reset(){
  Object.assign(g,{currentDungeon:null,currentQuest:null,restTimer:0,inBattle:true,monsters:[],squad:[],reserves:[],outposts:[],merchants:[],gateGuards:[],civilians:[],medicalPosts:[],projectiles:[],powerFx:[],_monsterGrid:null,_hazardClock:0,_civSpawnClock:-1e9});
  Object.assign(g.player,{x,y,hp:g.player.maxHp,isDown:false,dead:false,atkCooldown:1e6,isAdvanced:false});g.camera={x,y};g.rankIndex=2;g.joystick={active:false,dirX:0,dirY:0};
}
function soldier(cls='LIGHT',style='sword',dx=0,dy=0){
  const p=rollAttributeProfile(cls,'AVERAGE',()=>.5,true);p.innate.strength=150;p.innate.magic=1;
  const u=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',attributeProfile:p});
  const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier:9,quality:1,merchant:true,random:()=>.5});w.id=`light-test-${++serial}`;
  w.weaponTraits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};applyUpgradeStats(w,0);
  u.equipped.weapon=w;u.weapon=w;g.recalcSoldierStats(u);
  Object.assign(u,{x:x+dx,y:y+dy,isPersonalGuard:true,hp:u.maxHp,isDown:false,dead:false,atkCooldown:0,weaponSkillCooldown:1e6,crit:0,speed:0,reqExp:1e12});g.squad.push(u);return u;
}
function enemy(dx=45,dy=0){const m={id:`enemy-${++serial}`,type:'goblin',x:x+dx,y:y+dy,hp:1e10,maxHp:1e10,radius:8,def:0,atk:0,speed:0,atkTimer:1e6};g.monsters.push(m);return m;}
function patient(dx=80,dy=80){const u={id:`patient-${++serial}`,soldierClass:'HEAVY',isPersonalGuard:true,isDown:true,hp:0,maxHp:100,downTimer:40,x:x+dx,y:y+dy};g.squad.push(u);return u;}
try{
  Math.random=()=>.99;
  // Priority is decided once, before the native AI iterates heavy then light.
  for(const reverse of [false,true]){
    reset();const heavy=soldier('HEAVY','sword',0,0),light=soldier('LIGHT','sword',-40,0),p=patient(60,90);enemy(45);
    heavy.speed=light.speed=100;if(reverse)g.squad.reverse();
    const assignment=buildTransportRescueAssign(g);assert.equal(assignment.get(light),p);assert.equal(assignment.has(heavy),false);
    g.update(.05);assert.ok(light.y>y,'light moves toward wounded ally');assert.ok(heavy.x>x&&heavy.y===y,'heavy continues fighting at front');
  }
  // Fighting heavies are a last resort after any other available non-medic.
  for(const reverse of [false,true]){
    reset();const heavy=soldier('HEAVY','sword'),archer=soldier('ARCHER','bow',-40),p=patient(60,90);enemy(45);
    heavy.speed=archer.speed=100;if(reverse)g.squad.reverse();
    const assignment=buildTransportRescueAssign(g);assert.equal(assignment.get(archer),p);assert.equal(assignment.has(heavy),false);
    g.update(.05);assert.ok(archer.y>y,'archer rescues when light infantry is absent');assert.ok(heavy.x>x&&heavy.y===y,'heavy retains front instead of rescuing before archer');
    g.squad=[heavy,p];assert.equal(buildTransportRescueAssign(g).get(heavy),p,'fighting heavy rescues when truly alone');
  }
  reset();const fighting=soldier('HEAVY','sword'),safe=soldier('HEAVY','sword',350),nearArcher=soldier('ARCHER','bow',180,50),rankedPatient=patient(180,0);enemy(45);
  assert.equal(buildTransportRescueAssign(g).get(safe),rankedPatient,'non-fighting heavy precedes a closer archer');
  const nearerLight=soldier('LIGHT','sword',200,50);assert.equal(buildTransportRescueAssign(g).get(nearerLight),rankedPatient,'light remains first priority');
  // One combat scan per heavy, even with several patients to assign.
  reset();soldier('HEAVY','sword');soldier('HEAVY','sword',30);patient(80,30);patient(90,30);patient(100,30);
  const countedEnemy=enemy(45);let combatScans=0;Object.defineProperty(countedEnemy,'x',{get(){combatScans++;return x+45;},configurable:true});
  assert.equal(buildTransportRescueAssign(g).size,2);assert.equal(combatScans,2,'two heavies are each checked once across three patients');
  reset();const heavy=soldier('HEAVY'),light=soldier('LIGHT','sword',-30),p=patient(30,0),m=enemy(240);
  for(const [distance,combat] of [[239,true],[240,true],[241,false],[900,false]]){m.x=heavy.x+distance;assert.equal(transportInCombat(g,heavy),combat);}
  m.x=heavy.x+50;
  for(const state of ['dead','isDown','dying','retreated']){m[state]=true;assert.equal(transportInCombat(g,heavy),false);delete m[state];}
  for(const unavailable of ['absent','down','full','far','other-space']){
    light.isDown=false;light.hp=light.maxHp;light.x=x-30;g.currentDungeon=null;g.squad=[heavy,light,p];delete p.carrierId;
    if(unavailable==='absent')g.squad=[heavy,p];
    if(unavailable==='down'){light.isDown=true;light.hp=0;light.carrierId='test-other-carrier';}
    if(unavailable==='full'){for(let i=0;i<carryingCapacity(light);i++){const cargo=patient(-30,0);assert.equal(attachWounded(g,light,cargo),true);}}
    if(unavailable==='far')light.x=x-900;
    if(unavailable==='other-space'){g.currentDungeon={id:'other',kind:'test'};light.isPersonalGuard=false;}
    assert.equal(buildTransportRescueAssign(g).get(heavy),p,`${unavailable}: heavy fallback rescues during combat`);
    delete light.carrierId;light.isPersonalGuard=true;
  }
  reset();const towing=soldier('HEAVY'),cargo=patient(10,0);assert.equal(attachWounded(g,towing,cargo),true);assert.equal(transportSpeedFactor(g,towing),1,'heavy towing advantage survives');
  // Formula and post-mastery/phantom floor. Commander receives neither tempo nor a new floor.
  assert.equal(soldierCombatTempo({soldierClass:'HEAVY',quickness:15}),1);
  assert.ok(Math.abs(soldierCombatTempo({soldierClass:'LIGHT',quickness:28})-.804)<.002);
  assert.ok(Math.abs(soldierCombatTempo({soldierClass:'LIGHT',quickness:60})-.616)<.002);
  assert.equal(soldierCombatTempo({soldierClass:'LIGHT',quickness:255}),.6);
  for(const commander of [{quickness:255},{soldierClass:'LIGHT',quickness:255,isCommander:true},{soldierClass:'LIGHT',quickness:255,isPlayer:true}]){assert.equal(soldierCombatTempo(commander),1);assert.equal(soldierAttackCooldown(commander,.08),.08);}
  assert.equal(soldierAttackCooldown({soldierClass:'LIGHT',quickness:255},.02),.192);
  assert.equal(evasionChance(50),Math.min(48,50*.36+7.2*(50/255)**4),'dodge remains the existing formula');
  const timings=[];
  for(const style of ['sword','spear','hammer','axe']){
    const results=[];
    for(const cls of ['HEAVY','LIGHT']){
      reset();const u=soldier(cls,style),m=enemy(style==='spear'?90:35);u.attributeProfile.innate.quickness=cls==='HEAVY'?15:28;g.recalcSoldierStats(u);u.quickness=cls==='HEAVY'?15:28;u.weaponMastery={};
      g.update(.001);assert.ok(m.hp<1e10,'native normal attack hits');const normal=u.atkCooldown;
      u.weaponSkillCooldown=0;g.trySoldierMeleeSkill(u,m);const skill=u.weaponSkillCooldown;assert.ok(skill>0);
      const gearIndependent=soldierMeleeReload(u);
      for(const attackSpeed of [.1,.55,1,1.25,5,100]){u.atkSpeed=attackSpeed;assert.equal(soldierMeleeReload(u),gearIndependent,'equipment attack speed cannot change melee skill CT');}
      const savedMastery=u.weaponMastery;u.weaponMastery={...savedMastery,[style]:10000};
      assert.ok(soldierMeleeReload(u)<gearIndependent,'weapon mastery still shortens skill CT');
      assert.ok(Math.abs(soldierMeleeReload(u)/gearIndependent-masteryReloadMult(u.weaponMastery,style)/masteryReloadMult(savedMastery,style))<1e-9);u.weaponMastery=savedMastery;
      const reload=soldierMeleeReload(u);u.deathlineSkills=['PHANTOM_STEP'];g.recalcSoldierStats(u);u.quickness=cls==='HEAVY'?15:28;
      assert.equal(u.deathlineAtkSpeed,25);assert.ok(Math.abs(soldierMeleeReload(u)-reload/1.25)<1e-9,'actual phantom skill stacks with tempo');u.deathlineAtkSpeed=0;
      u.atkSpeed=100;u.quickness=255;u.atkCooldown=0;u.weaponSkillCooldown=1e6;m.x=x+35;m.y=y;g.update(.001);assert.equal(u.atkCooldown,weaponCombatProfile(u.weapon).baseCooldown*.6,'weapon-specific final ordinary CT floor');
      results.push({cls,normal,skill});
    }
    assert.ok(results[1].normal<results[0].normal*.81&&results[1].skill<results[0].skill*.81,style);
    timings.push({style,...Object.fromEntries(results.map(r=>[r.cls,r]))});
  }
  // Native repeated attacks/skills, not just evaluating a formula.
  for(const cls of ['HEAVY','LIGHT']){
    reset();const u=soldier(cls,'sword'),m=enemy(35);u.quickness=cls==='HEAVY'?15:28;u.weaponSkillCooldown=0;let attacks=0,skills=0;
    const original=g.performAttack;g.performAttack=function(a,...args){if(a===u)attacks++;return original.call(this,a,...args);};
    for(let i=0;i<1200;i++){const before=u.weaponSkillCooldown;g.update(.025);if(u.weaponSkillCooldown>before)skills++;}
    g.performAttack=original;timings.push({duration:30,cls,attacks,skills});
  }
  const [slow,fast]=timings.slice(-2);assert.ok(fast.attacks>slow.attacks&&fast.skills>slow.skills);
  reset();const floorUnit=soldier('LIGHT','sword'),floorEnemy=enemy(35);floorUnit.quickness=255;floorUnit.atkSpeed=100;floorUnit.deathlineAtkSpeed=25;
  const attack=g.performAttack,hitTimes=[];let clock=0;
  g.performAttack=function(a,...args){if(a===floorUnit)hitTimes.push(clock);return attack.call(this,a,...args);};
  for(let i=0;i<200;i++){clock=i*.005;g.update(.005);}g.performAttack=attack;
  assert.ok(hitTimes.length>=4);for(let i=1;i<hitTimes.length;i++)assert.ok(hitTimes[i]-hitTimes[i-1]>=weaponCombatProfile(floorUnit.weapon).baseCooldown*.6-1e-9,'phantom cannot bypass the weapon floor');
  // Front requires a live, nearby, same-space melee ally. Loaded mode immediately opts out.
  reset();const shooter=soldier('ARCHER','cannon'),target=enemy(150);shooter.ammo=0;
  assert.equal(rangedFrontlinePosition(g,shooter,target),null);
  const front=soldier('HEAVY','sword',120);assert.ok(rangedFrontlinePosition(g,shooter,target));
  for(const invalid of ['far','dead','down','ranged','space']){
    front.x=x+120;front.dead=false;front.isDown=false;front.weapon.weaponStyle='sword';g.currentDungeon=null;front.isPersonalGuard=true;
    if(invalid==='far')front.x=x+241;if(invalid==='dead')front.dead=true;if(invalid==='down')front.isDown=true;if(invalid==='ranged')front.weapon.weaponStyle='bow';if(invalid==='space'){g.currentDungeon={id:'test'};front.isPersonalGuard=false;}
    assert.equal(rangedFrontlinePosition(g,shooter,target),null,invalid);
  }
  g.currentDungeon=null;front.isPersonalGuard=true;front.weapon.weaponStyle='sword';front.x=x+240;assert.ok(rangedFrontlinePosition(g,shooter,target));shooter.ammo=1;assert.equal(rangedFrontlinePosition(g,shooter,target),null);
  // Barrel bash uses sidearm damage kind: no ranged weapon crit, magic followup, or flight.
  const hits=[];let hammerSounds=0;sound.playWeapon=style=>{if(style==='hammer')hammerSounds++;};
  for(const style of ['bow','crossbow','cannon']){
    reset();const u=soldier('ARCHER',style),m=enemy(45);u.ammo=0;u.quickness=15;
    u.weapon.weaponTraits.crit=100;u.weapon.stats.magic=1e6;u.weaponMagicFollowup=1e6;
    assert.equal(g.performRangedSidearm(u,m),true);hits.push(1e10-m.hp);assert.equal(u.atkCooldown,soldierAttackCooldown(u,attackCooldown(u.weapon,style==='cannon'?1.4:.9,u.atkSpeed)));assert.equal(g.projectiles.length,0);assert.ok(!m.knockState&&!m.knockTimer);
    assert.equal(m.x,x+45+(style==='cannon'?25:0));assert.equal(rangedDrawPose(u).weapon.weaponStyle,style==='cannon'?'cannon':'sword');
    if(style==='cannon')assert.equal(rangedDrawPose(u)._rangedBash,true);
    assert.ok(Math.abs(hits.at(-1)-Math.round(sidearmAttack(u)*(style==='cannon'?1.6:1)))<=1,'only sidearm damage applies');
  }
  assert.ok(Math.abs(hits[2]-hits[0]*1.6)<=3);assert.equal(hammerSounds,1);
  assert.equal(rangedPose('cannon',.8,0,null,true).bash,true);assert.notEqual(rangedPose('cannon',.8,0,null,false).bash,true);
  // Native positioning: join existing front, lone shooter falls back, refill retreats next tick.
  reset();const gun=soldier('ARCHER','cannon'),tank=soldier('HEAVY','sword',120),foe=enemy(150);gun.ammo=0;gun.speed=80;tank.atkCooldown=1e6;
  g.update(.05);assert.ok(gun.x>x,'empty gun joins nearby front');
  gun.x=x+100;foe.x=x+260;g.squad=[gun];const loneStart=gun.x;g.update(.05);assert.ok(gun.x<loneStart,'no front means returning from outside formation, not charging a distant enemy');
  gun.x=x+120;foe.x=x+150;gun.atkCooldown=0;g.squad=[gun,tank];g.player.x=gun.x;g.player.y=gun.y;
  g.worldTerrain={tiles:new Map([['test',{camps:[{x:gun.x,y:gun.y}]}]])};updateSupplies(g,.25);assert.equal(gun.ammo,ammoCapacity(gun));
  const loaded=gun.ammo,start=gun.x,spawn=g.spawnRangedProjectile;let firedType;
  g.spawnRangedProjectile=function(...args){const result=spawn.apply(this,args);firedType=this.projectiles.at(-1)?.type;return result;};
  g.update(.05);g.spawnRangedProjectile=spawn;assert.ok(gun.x<start,'next frame restores ranged retreat');assert.ok(gun.ammo<loaded);assert.equal(firedType,'CANNONBALL','native AI fires after refill, even if shot impacts in the same tick');assert.equal(rangedDrawPose(gun),gun);
  console.log('PASS: centralized light/non-fighting heavy/other/fighting heavy rescue priority, native archer rescue/front retention, one combat scan per heavy; tempo .60/commander exclusion/.12 floor; equipment-independent skill CT/mastery/phantom, native frequency; supported-front only, barrel bash and next-frame supply return');
  console.log(JSON.stringify({timings,emptyHits:hits}));
}finally{Math.random=random;sound.playWeapon=playWeapon;dom.window.close();}
