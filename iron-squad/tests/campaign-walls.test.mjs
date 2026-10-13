import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {campaignScaling,campaignScalingV1,migrateCampaignEnemy,CAMPAIGN_SCALE_VERSION} from '../js/campaign-scaling.js';
import {ammoCapacity,recalcAmmoCapacity} from '../js/supply-rules.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {WORLD_SIZE} from '../js/world.js';
import {DUNGEON_DEFS} from '../js/dungeon.js';
assert.equal(CAMPAIGN_SCALE_VERSION,2);
for(const [d,leftHp,rightHp,leftAtk,rightAtk] of [[8000,1.25,12.5,1.25,6],[22000,25,250,12,60],[48000,600,6000,120,600]]){
  assert.equal(campaignScaling(d-1).hp,leftHp);assert.equal(campaignScaling(d).hp,rightHp);
  assert.equal(campaignScaling(d-.001).hp,leftHp,'no ramp across the 1cm border samples');
  assert.equal(campaignScaling(d-1).atk,leftAtk);assert.equal(campaignScaling(d).atk,rightAtk);
  for(const k of ['exp','gold'])assert.ok(Math.abs(campaignScaling(d)[k]/campaignScaling(d-1)[k]-Math.sqrt(10))<1e-8);
}
assert.equal(campaignScaling(79360).hp,1_000_000);assert.equal(campaignScaling(79360,100).hp,1_600_000);
assert.equal(campaignScaling(79360).atk,20000);assert.equal(campaignScaling(79360).exp,26000);assert.equal(campaignScaling(79360).gold,22000);
const castle=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle'),atCastle=campaignScaling(castle.distance);
assert.ok(atCastle.hp>38000&&atCastle.hp<40000);assert.equal(atCastle.atk,1000);
for(const dungeonBoss of [false,true]){
  const old={id:'retained',type:'wyvern',campaignScaleVersion:1,hp:400,maxHp:1000,atk:80,isDungeonBoss:dungeonBoss,magicSlowTimer:3,magicStunTimer:2,buff:{duration:8,multiplier:1.2}};
  const prev=campaignScalingV1(castle.distance,25),next=campaignScaling(castle.distance,25),buff=old.buff;
  migrateCampaignEnemy(old,castle.distance,25);assert.equal(old.maxHp,Math.round(1000*next.hp/prev.hp));assert.equal(old.atk,Math.round(80*next.atk/prev.atk));assert.equal(old.hp,Math.round(old.maxHp*.4));assert.equal(old.buff,buff);assert.equal(old.magicSlowTimer,3);
  const once=JSON.stringify(old);migrateCampaignEnemy(old,castle.distance,25);assert.equal(JSON.stringify(old),once);
}
const king={type:'demon_king',campaignScaleVersion:1,maxHp:1_200_000_000,hp:480_000_000,atk:80000,buff:1.2};migrateCampaignEnemy(king,castle.distance);assert.equal(king.maxHp,1_200_000_000);assert.equal(king.hp,480_000_000);assert.equal(king.atk,80000);
for(const special of [{isRaidMob:true},{isColossal:true}]){const m={...special,campaignScaleVersion:1,maxHp:500,hp:100,atk:70};migrateCampaignEnemy(m,79360,100);assert.deepEqual([m.maxHp,m.hp,m.atk],[500,100,70]);}
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,FIELD_ZONES}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{sound}=await import('../../common/js/audio.js?v=151');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2;Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set(),commandActiveUntil:0});g.startGameLoop=noop;g.showToast=noop;g.setupUI();g.activeSlotId=saveSlots.create('WALL CACHE TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();
const notes=[],oldBomb=sound.playBomb;let bombs=0;sound.playBomb=()=>bombs++;g.showToast=t=>notes.push(t);
try{
  assert.ok(FIELD_ZONES.every(z=>!('reqDef' in z)));
  for(const boundary of [8000,22000,48000]){
    g._zonePreviousDistance=null;g._zoneApproachWarned=0;g.lastZoneId=null;
    const step=d=>{g.player.x=C+d;g.player.y=C;g.checkZoneTransition();};
    const count=()=>notes.filter(n=>n.startsWith('⚠️')).length;
    step(boundary-1700);const before=count();step(boundary-1499);assert.equal(count(),before+1);assert.match(notes.at(-1),/HP約10倍・攻撃約5倍/);
    for(let i=0;i<200;i++)step(boundary-1400+i);assert.equal(count(),before+1,'one approach warning only');
    step(boundary-1450);step(boundary-1390);assert.equal(count(),before+1,'small jitter does not repeatedly warn');
    step(boundary-1700);step(boundary-1400);assert.equal(count(),before+2,'retreat re-arms approach warning');
    const old=bombs;step(boundary);assert.equal(bombs,old+1);assert.equal(g.zoneAlertFlash,1);assert.equal(g.screenShake,.55);assert.match(notes.at(-1),/突入.*HP約10倍・攻撃約5倍/);assert.doesNotMatch(notes.at(-1),/推奨DEF/);
    step(boundary-100);step(boundary-90);assert.equal(count(),before+3,'crossing inward re-arms the next approach');
  }
  const u=g.createNewSoldier(null,{classKey:'ARCHER',talent:'AVERAGE',attributeProfile:rollAttributeProfile('ARCHER','AVERAGE',()=>.5,true)});u.level=14;g.recalcSoldierStats(u);assert.equal(u._ammoCapacity,ammoCapacity(u));
  const profile=u.attributeProfile,aptitudes=profile.aptitudes;let recalculations=0;Object.defineProperty(profile,'aptitudes',{configurable:true,enumerable:true,get(){recalculations++;throw Error('hot path calculated attributes');}});
  for(let i=0;i<10000;i++)assert.equal(ammoCapacity(u),u._ammoCapacity);assert.equal(recalculations,0);
  Object.defineProperty(profile,'aptitudes',{value:aptitudes,configurable:true,enumerable:true,writable:true});
  const held=u.equipped.weapon;held.weaponStyle='crossbow';g.recalcSoldierStats(u);const cross=ammoCapacity(u);held.weaponStyle='cannon';g.recalcSoldierStats(u);assert.ok(ammoCapacity(u)<cross);
  const before=ammoCapacity(u);u.level=30;g.recalcSoldierStats(u);assert.ok(ammoCapacity(u)>before);
  const permanent=ammoCapacity(u);u._casterStrengthBonus=100;u._casterStrengthTimer=8;g.recalcSoldierStats(u);assert.equal(ammoCapacity(u),permanent);u._casterStrengthTimer=0;u._casterStrengthBonus=0;g.recalcSoldierStats(u);assert.equal(ammoCapacity(u),permanent);
  g.equipped.weapon=held;g.player.level=14;g.recalcPlayerStats();assert.equal(g.player._ammoCapacity,ammoCapacity(g.player));g.player.level=30;g.recalcPlayerStats();assert.equal(g.player._ammoCapacity,ammoCapacity(g.player));
  for(const phase of [1,100])for(const [type,elite] of [...castle.mobTypes.map(type=>[type,false]),[castle.mobTypes.at(-1),true]]){g.phase=phase;const m=g.createDungeonMob(type,900,1000,castle,elite,false);assert.ok(m.atk<85000,`${type} ${phase} ${elite}`);assert.ok(m.maxHp<1_000_000_000);}
  const plain={strength:90,weapon:{weaponStyle:'bow'}};assert.equal(ammoCapacity(plain),180);plain._casterStrengthTimer=8;plain._casterStrengthBonus=50;assert.equal(ammoCapacity(plain),130);plain.weapon.weaponStyle='crossbow';assert.equal(ammoCapacity(plain),65);
  g.showToast=IronSquadGame.showToast;g.lastZoneId=null;g._zonePreviousDistance=null;g._zoneApproachWarned=0;g.player.x=C+6300;g.player.y=C;g.checkZoneTransition();g.player.x=C+6600;g.checkZoneTransition();assert.match(document.getElementById('battle-log-stream').textContent,/この先.*HP約10倍・攻撃約5倍/);g.player.x=C+8000;g.checkZoneTransition();assert.match(document.getElementById('battle-log-stream').textContent,/突入.*HP約10倍・攻撃約5倍/);clearTimeout(g._battleLogTimer);
  console.log('PASS: exact border walls, rewards and rim, version 1 migration/buffs/no repeat, invariant bosses/raids, approach hysteresis/alerts, warm ammo cache/no attribute computation, equipment/growth/buff refresh, castle enemies below demon king');
}finally{sound.playBomb=oldBomb;dom.window.close();}
