import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {SOLDIER_MELEE_SKILLS,tickSoldierMeleeSkill,soldierMeleeSkillText} from '../js/soldier-melee-skills.js';
import {WORLD_SIZE,northSouthRoadX} from '../js/world.js';
import {applyHeroEquipmentUpgrade} from '../js/hero-equipment.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats,generateRandomDrop,migrateMeleeWeaponBalance}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText','updateSpawns'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('MELEE SKILLS TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y),random=Math.random;
const traits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
let serial=0;
function gear(style,tier=9){const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier,quality:1,merchant:true,random:()=>.5});w.id=`skill-weapon-${++serial}`;w.weaponTraits={...traits};applyUpgradeStats(w,0);return w;}
function fixture(style,cls='LIGHT'){
  g.currentDungeon=null;g.restTimer=0;g.inBattle=true;g.outposts=[];g.gateGuards=[];g.merchants=[];g.civilians=[];g.medicalPosts=[];g.reserves=[];g.projectiles=[];g.powerFx=[];g.damageTexts=[];g.shockwaves=[];g.dropsOnField=[];g._hazardClock=0;g._monsterGrid=null;
  Object.assign(g.player,{x,y,atkCooldown:1e6,isAdvanced:false,isDown:false,hp:g.player.maxHp});g.joystick={active:false,dirX:0,dirY:0};g.camera={x,y};g.rankIndex=2;
  const profile=rollAttributeProfile(cls,'AVERAGE',()=>.5,true);profile.innate.strength=150;profile.innate.magic=1;
  const u=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',attributeProfile:profile});const w=gear(style);u.equipped.weapon=w;u.weapon=w;g.recalcSoldierStats(u);
  Object.assign(u,{x,y,isPersonalGuard:true,dead:false,isDown:false,hp:u.maxHp,atkCooldown:1e6,weaponSkillCooldown:0,crit:0,mana:0,speed:0,reqExp:1e12});g.squad=[u];g.monsters=[];
  return u;
}
function enemy(id,dx=55,dy=0,hp=1e8){const m={id,type:'goblin',x:x+dx,y:y+dy,hp,maxHp:hp,radius:10,def:0,magicDef:0,speed:0,atk:0,atkTimer:100};g.monsters.push(m);return m;}
try{
  Math.random=()=>.99;
  // All four are called by the actual ordinary-soldier update, independently of normal attacks.
  for(const style of Object.keys(SOLDIER_MELEE_SKILLS)){
    const u=fixture(style),m=enemy(style,style==='spear'?105:55);g.update(.01);
    assert.ok(m.hp<1e8,`${style}: real AI casts while ordinary attack is cooling down`);
    assert.ok(u.weaponSkillCooldown>0);assert.match(soldierMeleeSkillText(u),/自動/);
    const before=m.hp;assert.equal(g.trySoldierMeleeSkill(u,m),false);assert.equal(m.hp,before,'immediate recast is blocked');
  }
  // Axe snapshots all-around targets, so removing a killed first target cannot skip the next.
  for(const reverse of [false,true]){
    const u=fixture('axe'),a=enemy('front',55,0,1),b=enemy('behind',-55,0,1),c=enemy('side',0,65),far=enemy('far',190);
    if(reverse)g.monsters.reverse();assert.equal(g.trySoldierMeleeSkill(u,a),true);
    assert.ok(a.hp<=0&&b.hp<=0);assert.ok(c.hp<1e8);assert.equal(far.hp,1e8);assert.ok(u.weaponSpinTime>0);
  }
  {
    const u=fixture('hammer'),a=enemy('front'),b=enemy('behind',-55),c=enemy('side',0,55);
    g.trySoldierMeleeSkill(u,a);assert.ok(a.hp<1e8&&a.magicStunTimer>0);assert.equal(b.hp,1e8);assert.equal(c.hp,1e8);
  }
  {
    const u=fixture('spear'),a=enemy('front',90,0,1),b=enemy('rear',130,0,1),side=enemy('outside-fan',30,100),far=enemy('far',210);
    g.trySoldierMeleeSkill(u,a);assert.ok(a.hp<=0&&b.hp<=0);assert.equal(side.hp,1e8);assert.equal(far.hp,1e8);
  }
  {
    const u=fixture('sword'),a=enemy('front',40,0,1),b=enemy('behind',-40);
    g.trySoldierMeleeSkill(u,a);assert.ok(a.hp<=0);assert.equal(b.hp,1e8);assert.ok(u.weaponSkillPending);
    tickSoldierMeleeSkill(g,u,.10);assert.equal(b.hp,1e8);
    tickSoldierMeleeSkill(g,u,.09);assert.ok(b.hp<1e8,'second slash finds another nearby enemy after a lethal first slash');assert.equal(u.weaponSkillPending,undefined);
    const after=b.hp;tickSoldierMeleeSkill(g,u,.2);assert.equal(b.hp,after,'follow-up executes once');
  }
  for(const cancel of ['weapon','space','down']){
    const u=fixture('sword'),a=enemy('front',40);g.trySoldierMeleeSkill(u,a);const before=a.hp;
    if(cancel==='weapon')u.equipped.weapon=gear('axe');
    if(cancel==='space')g.currentDungeon={id:'different-space',kind:'test'};
    if(cancel==='down'){u.isDown=true;u.hp=0;}
    tickSoldierMeleeSkill(g,u,.3);assert.equal(a.hp,before,`${cancel} cancels the delayed swing`);assert.equal(u.weaponSkillPending,undefined);
  }
  // A wall blocks skill damage without spending the cooldown.
  for(const style of Object.keys(SOLDIER_MELEE_SKILLS)){
    const u=fixture(style),c=WORLD_SIZE/2;u.x=c-320;u.y=c-190;
    const m=enemy('wall-target');m.x=c-275;m.y=u.y;
    assert.equal(g.trySoldierMeleeSkill(u,m),false);assert.equal(m.hp,1e8);assert.equal(u.weaponSkillCooldown,0);
  }
  // Unusable heavy gear and non-melee classes do not gain this extra skill.
  {const u=fixture('hammer');u.attributeProfile.innate.strength=1;assert.equal(g.trySoldierMeleeSkill(u,enemy('too-heavy')),false);}
  for(const cls of ['ARCHER','MAGE','MEDIC','NINJA']){const u=fixture('sword',cls);assert.equal(g.trySoldierMeleeSkill(u,enemy(cls)),false);}
  // Spear AI retreats from point-blank range and keeps a longer fighting distance than the sword.
  const held={};
  for(const style of ['sword','spear']){
    const u=fixture(style);u.speed=60;u.weaponSkillCooldown=1e6;const m=enemy('spacing',5);
    for(let i=0;i<80;i++)g.update(.05);
    held[style]=Math.hypot(u.x-m.x,u.y-m.y);
  }
  assert.ok(held.sword>30&&held.sword<55,JSON.stringify(held));assert.ok(held.spear>90&&held.spear<125,JSON.stringify(held));
  // v6.6.1 Heavy infantry closes in even with a sword or spear, so the pressure aura and cover stay in reach.
  for(const style of ['sword','spear']){
    const u=fixture(style,'HEAVY');u.speed=60;u.weaponSkillCooldown=1e6;const m=enemy('heavy-front',160);
    for(let i=0;i<80;i++)g.update(.05);
    const d=Math.hypot(u.x-m.x,u.y-m.y);assert.ok(d<30,`heavy ${style} closes in well inside the 48px pressure aura (${d})`);
  }
  // v7.0.18 The hero's holy sword uses the 1.8 sword base ATK coefficient (same effective ATK as v6.6.1 / v7.0.14); other hero weapons are unchanged.
  {
    const sword={type:'WEAPON',heroOnly:true,heroRole:'LIGHT',weaponStyle:'sword',baseName:'勇者の聖剣'};applyHeroEquipmentUpgrade(sword,0);
    assert.equal(sword.stats.atk,Math.floor(1600*1.8));
    const bow={type:'WEAPON',heroOnly:true,heroRole:'ARCHER',weaponStyle:'bow',baseName:'勇者の誓い弓'};applyHeroEquipmentUpgrade(bow,0);assert.equal(bow.stats.atk,1600);
    const old={type:'WEAPON',heroOnly:true,heroRole:'LIGHT',weaponStyle:'sword',baseName:'勇者の聖剣',name:'勇者の聖剣+2',upgrade:2,stats:{atk:Math.floor(1600*1.5)}};
    migrateMeleeWeaponBalance(old);migrateMeleeWeaponBalance(old);assert.equal(old.stats.atk,Math.floor(Math.floor(1600*1.5)*1.8),'saved holy sword migrates once, keeping its upgrade');
  }
  // Repeated migration/re-forging cannot multiply saved item attack again.
  for(const style of ['sword','spear']){
    const fresh=gear(style),old=structuredClone(fresh);delete old.meleeBalanceVersion;old.stats.atk=Math.floor(old.stats.atk/(style==='sword'?1.8:1.6/1.5));
    migrateMeleeWeaponBalance(old);migrateMeleeWeaponBalance(old);assert.equal(old.stats.atk,fresh.stats.atk);assert.equal(old.id,fresh.id);assert.deepEqual(old.weaponTraits,fresh.weaponTraits);
    applyUpgradeStats(old,0);assert.equal(old.stats.atk,fresh.stats.atk);
  }
  {
    const u=fixture('sword'),m=enemy('save-target',40);g.trySoldierMeleeSkill(u,m);
    const cooldown=u.weaponSkillCooldown;const saved=structuredClone(g.saveGame({immediate:true}));assert.doesNotThrow(()=>JSON.stringify(saved));
    g.resumeSavedGame(saved);const restored=g.squad.find(s=>s.id===u.id);assert.equal(restored.weaponSkillCooldown,cooldown);assert.ok(restored.weaponSkillPending);
  }
  {
    const u=fixture('sword'),reserve=fixture('spear');g.squad=[u];g.reserves=[reserve];g.inventory=[gear('sword')];g.sharedEquipBox=[gear('spear')];g.equipped.weapon=gear('sword');
    const saved=structuredClone(g.saveGame({immediate:true}));
    const items=[saved.equipped.weapon,saved.squad[0].equipped.weapon,saved.squad[0].weapon,saved.reserves[0].equipped.weapon,saved.reserves[0].weapon,saved.inventory[0],saved.sharedEquipBox[0]];
    const expected=new Map(items.map(w=>[w.id,w.stats.atk]));
    for(const w of items){delete w.meleeBalanceVersion;w.stats.atk=Math.floor(w.stats.atk/(w.weaponStyle==='sword'?1.8:1.6/1.5));}
    for(let load=0;load<2;load++){
      g.resumeSavedGame(load?structuredClone(g.saveGame({immediate:true})):saved);
      const restored=[...g.squad,...g.reserves];
      for(const w of [g.equipped.weapon,restored.find(s=>s.id===u.id).equipped.weapon,restored.find(s=>s.id===reserve.id).equipped.weapon,g.inventory[0],g.sharedEquipBox[0]])assert.equal(w.stats.atk,expected.get(w.id),'old owned gear migrates exactly once on load');
    }
  }
  console.log('PASS: ordinary AI weapon skills, cooldown, lethal target iteration, sword follow-up/retarget/cancellation, cone/area/single geometry, walls, equipment/class eligibility, spear spacing, save and repeat-safe migration');
}finally{Math.random=random;dom.window.close();}
