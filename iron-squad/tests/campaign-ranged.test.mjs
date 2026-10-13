import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {campaignScaling,campaignScalingV1,migrateCampaignEnemy,DEMON_KING_HP} from '../js/campaign-scaling.js';
import {ammoCapacity,ensureAmmo,takeRangedShot,ammoCombatProfile,updateSupplies} from '../js/supply-rules.js';
import {updatePiercingBolt,sidearmAttack,rangedDrawPose} from '../js/ranged-combat.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {WORLD_SIZE,northSouthRoadX} from '../js/world.js';
for(const strength of [30,50,90])for(const [style,base,weight] of [['bow',120,1],['crossbow',60,2],['cannon',30,4]]){
  const u={strength,equipped:{weapon:{weaponStyle:style}},ammo:5};assert.equal(ammoCapacity(u),base+Math.floor((strength-30)/weight));
  u.strength+=10;ensureAmmo(u);assert.equal(u.ammo,5,'capacity growth does not create rounds');
}
const buffed={soldierClass:'ARCHER',level:1,attributeProfile:rollAttributeProfile('ARCHER','AVERAGE',()=>.5,true),equipped:{weapon:{weaponStyle:'bow'}},_casterStrengthTimer:10,_casterStrengthBonus:90};
buffed.attributeProfile.innate.strength=50;assert.equal(ammoCapacity(buffed),140,'temporary strength is excluded');
assert.equal(takeRangedShot({...buffed,ammo:0},1000).damage,0,'empty magazines cannot produce ranged damage');
for(const d of [8000,22000,48000]){
  assert.ok(Math.abs(campaignScaling(d).hp/campaignScaling(d-.001).hp-10)<1e-6,'HP jumps at the border only');
  const ratio=campaignScaling(d).atk/campaignScaling(d-.001).atk;assert.ok(ratio>=4.8&&ratio<=5.00001);
  for(const stat of ['exp','gold'])assert.ok(Math.abs(campaignScaling(d)[stat]/campaignScaling(d-.001)[stat]-Math.sqrt(10))<1e-6);
}
for(const d of [4000,12000,30000,55000,Math.hypot(42000,42000),70000])for(const stat of ['hp','atk','exp','gold'])assert.ok(Math.abs(campaignScaling(d-.001)[stat]/campaignScaling(d+.001)[stat]-1)<1e-5,'smooth within a region');
let previous=0;for(let d=0;d<=80000;d+=100){const next=campaignScaling(d);assert.ok(next.hp>=previous);assert.ok(next.atk<=20000.0001);previous=next.hp;}
assert.ok(Math.abs(campaignScaling(80000).hp-1_000_000)<.0001);
const oldBoss={type:'demon_king',hp:2500000,maxHp:10000000,atk:85000};migrateCampaignEnemy(oldBoss,59400,10);assert.equal(oldBoss.maxHp,DEMON_KING_HP);assert.equal(oldBoss.hp,250000000);migrateCampaignEnemy(oldBoss,59400,10);assert.equal(oldBoss.hp,250000000);
const oldMob={type:'colossal_dragon',isDungeonMob:true,hp:1016225172*.4,maxHp:1016225172,atk:94199869};migrateCampaignEnemy(oldMob,Math.hypot(42000,42000),10);assert.ok(Math.abs(oldMob.maxHp-Math.round(450*campaignScaling(Math.hypot(42000,42000),10).hp))<=1);assert.ok(Math.abs(oldMob.hp/oldMob.maxHp-.4)<1e-5);const migrated=JSON.stringify(oldMob);migrateCampaignEnemy(oldMob,59400,10);assert.equal(JSON.stringify(oldMob),migrated);
const raid={isRaidMob:true,hp:100,maxHp:100,atk:50};migrateCampaignEnemy(raid,60000);assert.equal(raid.hp,100);assert.equal(raid.atk,50);
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,applyUpgradeStats,migrateRangedWeaponBalance}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText','updateSpawns'])g[m]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('CAMPAIGN RANGED TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y),random=Math.random;
function fixture(style){
  Object.assign(g,{currentDungeon:null,currentQuest:null,restTimer:0,monsters:[],squad:[],reserves:[],outposts:[],merchants:[],civilians:[],gateGuards:[],medicalPosts:[],projectiles:[],powerFx:[],_monsterGrid:null,_hazardClock:0,_civSpawnClock:-1e9});
  const u=g.createNewSoldier(null,{classKey:'ARCHER',talent:'AVERAGE',attributeProfile:rollAttributeProfile('ARCHER','AVERAGE',()=>.5,true)});u.level=14;
  const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier:9,quality:1,merchant:true,random:()=>.5});w.weaponTraits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};applyUpgradeStats(w,0);
  u.equipped.weapon=w;u.weapon=w;g.recalcSoldierStats(u);Object.assign(u,{x,y,hp:u.maxHp,ammo:ammoCapacity(u),isPersonalGuard:true,isDown:false,dead:false,atkCooldown:0,crit:0,speed:40,reqExp:1e12});g.squad=[u];
  Object.assign(g.player,{x,y,hp:g.player.maxHp,isDown:false,atkCooldown:1e6,isAdvanced:false});g.camera={x,y};g.rankIndex=2;g.joystick={active:false,dirX:0,dirY:0};return u;
}
const monster=(dx,hp=1e8)=>({x:x+dx,y,hp,maxHp:hp,type:'goblin',radius:8,def:0,speed:0,atk:0,atkTimer:1e6});
try{
  Math.random=()=>.99;
  {const u=fixture('crossbow'),m=[monster(40,1),monster(90),monster(140),monster(190)];g.monsters=[...m];const ammo=u.ammo;
    g.spawnRangedProjectile(u,m[0],100,g.combatProfileFor(u,u.equipped.weapon,false),false);const bolt=g.projectiles[0];assert.equal(bolt.type,'PIERCE_BOLT');assert.equal(u.ammo,ammo-1);
    assert.equal(updatePiercingBolt(g,bolt,.5),true);assert.ok(m[0].hp<=0);assert.equal(1e8-m[1].hp,84);assert.equal(1e8-m[2].hp,59);assert.equal(m[3].hp,1e8);assert.equal(bolt.hitEnemies.length,3,'works even when targets have no ids');
  }
  {const u=fixture('crossbow');g.currentDungeon={id:'wall',kind:'town',width:2000,height:2000};u.x=40;u.y=500;
    const front={...monster(0),x:44,y:500},behind={...monster(0),x:80,y:500};g.monsters=[front,behind];g.spawnRangedProjectile(u,front,100,g.combatProfileFor(u,u.equipped.weapon,false),false);
    assert.equal(updatePiercingBolt(g,g.projectiles[0],.1),true);assert.ok(front.hp<1e8);assert.equal(behind.hp,1e8,'wall stops the bolt after a near-side hit');
  }
  const hits=[];
  for(const style of ['bow','crossbow','cannon']){
    const u=fixture(style),m=monster(48);u.ammo=0;g.monsters=[m];const original=u.equipped.weapon;
    assert.equal(g.performRangedSidearm(u,m),true);hits.push(1e8-m.hp);assert.equal(g.projectiles.length,0);assert.equal(u.equipped.weapon,original);assert.equal(rangedDrawPose(u).equipped.weapon.weaponStyle,style==='cannon'?'cannon':'sword');
    assert.equal(g.performRangedSidearm(u,m),false,'shared cooldown prevents repeated melee');
    assert.equal(ammoCombatProfile(u,g.combatProfileFor(u,original,false)).sidearm,true);
  }
  assert.ok(Math.abs(hits[0]-hits[1])<=3,'ranged weapon ATK does not leak into dagger damage');
  assert.ok(Math.abs(hits[2]-hits[0]*1.6)<=3,'barrel bash has the approved 1.6 dagger multiplier');
  {const u=fixture('bow'),m=monster(200);u.ammo=0;u.x=x+60;g.monsters=[m];g.update(.05);assert.equal(m.hp,1e8);assert.equal(g.projectiles.length,0);assert.ok(u.x<x+60,'returns toward commander instead of chasing far enemy');
    g.player.x=u.x;g.player.y=u.y;g.worldTerrain={tiles:new Map([['test',{camps:[{x:u.x,y:u.y}]}]])};updateSupplies(g,.25);assert.equal(u.ammo,ammoCapacity(u));assert.equal(g.combatProfileFor(u,u.equipped.weapon,false).sidearm,undefined);
    assert.equal(rangedDrawPose(u),u);g.spawnRangedProjectile(u,m,100,g.combatProfileFor(u,u.equipped.weapon,false),false);assert.equal(g.projectiles[0].type,'ARROW');
  }
  {const u=fixture('crossbow'),fresh=structuredClone(u.equipped.weapon),old=structuredClone(fresh);delete old.rangedBalanceVersion;old.stats.atk=Math.floor(old.stats.atk*1.85/2.4);migrateRangedWeaponBalance(old);migrateRangedWeaponBalance(old);assert.equal(old.stats.atk,fresh.stats.atk);assert.equal(old.id,fresh.id);assert.deepEqual(old.weaponTraits,fresh.weaponTraits);}
  console.log('PASS: border walls and bounded logarithmic scaling, remaining-HP migration, permanent-strength carrying/no free ammo, swept 3-target piercing/kill order/walls, no stone, sidearm stats/cooldown/return/refill/visuals, repeat-safe crossbow migration');
}finally{Math.random=random;dom.window.close();}
