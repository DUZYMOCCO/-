// Single-cast commander skills through the real runtime. No ordinary attacks or balance edits.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile,emptyAttributePractice,canChannelWeaponMagic} from '../js/unit-attributes.js';
import {canUseEquipment,requiredWeaponStrength} from '../js/weapon-requirements.js';
import {TIERS} from '../js/equipment-tiers.js';
import {weaponCombatProfile} from '../js/equipment-rules.js';
import {WORLD_SIZE} from '../js/world.js';

const out='iron-squad/docs/previews/melee-weapons-20261013';
mkdirSync(out,{recursive:true});
const sourceFiles=['iron-squad/sw-assets.js',...readdirSync('iron-squad/js').filter(p=>p.endsWith('.js')).sort().map(p=>`iron-squad/js/${p}`)];
const fingerprint=()=>Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const sourceStart=fingerprint(),manifest={GAME_ASSETS:{}};
new Function('self',readFileSync(sourceFiles[0],'utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'];
// Mix consecutive seed IDs so a single-cast test does not share almost identical first rolls.
const randomFor=seed=>{let n=seed>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);n=(n^(n>>>15))>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
const originalRandom=Math.random;Math.random=randomFor(20261013);
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SLOT_INFO}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('MELEE SKILL SIMULATION ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const basePlayer=structuredClone(g.player),baseNation=structuredClone(g.nation);
for(const name of ['saveGame','updateStatsUI','refreshSupplyUI','updateQuestUI','revealFogAroundPlayer','changeTimePeriod','updateSpawns','updateDemonInvasion','deployReserves','updatePowerAtkButtonUI'])g[name]=noop;
const realRecalc=IronSquadGame.recalcPlayerStats,realAttack=IronSquadGame.performAttack;
let stats=null,attackDepth=0;
function freezeProgress(){g.player.weaponMastery={};g.player.attributeProfile.practice=emptyAttributePractice();g.player._attributesDirty=false;}
g.performAttack=function(attacker,target,...args){
  const hp=target.hp;let result;attackDepth++;
  try{result=realAttack.call(this,attacker,target,...args);}finally{attackDepth--;}
  if(stats&&attacker===this.player){
    if(args[3]==='magic'){stats.magicalFollowups++;stats.magicalDamage+=hp-target.hp;}
    if(attackDepth===0){stats.damage+=hp-target.hp;stats.hits+=hp>target.hp?1:0;freezeProgress();}
  }
  return result;
};
const neutralTraits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
const fixtures={},level=12,tier=9,seeds=8;
const shapes={
  single:[[80,0]],
  circle5:Array.from({length:5},(_,i)=>[80*Math.cos(i*Math.PI*2/5),80*Math.sin(i*Math.PI*2/5)]),
  forward5:[[40,0],[70,0],[100,0],[130,0],[160,0]]
};
function setup(style){
  const origin=WORLD_SIZE/2+4000;
  Object.assign(g,{player:structuredClone(basePlayer),nation:structuredClone(baseNation),rankIndex:0,rescueBonuses:{},squad:[],reserves:[],monsters:[],outposts:[],merchants:[],gateGuards:[],medicalPosts:[],dungeons:[],civilians:[],remains:[],projectiles:[],particles:[],dropsOnField:[],magicBursts:[],damageFields:[],powerFx:[],currentQuest:null,currentDungeon:null,restTimer:0,inBattle:true,phase:1,phaseTimer:100000,worldTerrain:{tiles:new Map()},camera:{x:origin,y:origin},joystick:{active:true,dirX:1,dirY:0},_monsterGrid:null});
  Object.assign(g.player,{id:'skill-commander',isPlayer:true,combatClass:'COMMANDER',level,talent:'AVERAGE',survivedWaves:0,minionKills:0,bossKills:0,kills:0,isAdvanced:false,advancedClass:null,isDown:false,dead:false,x:origin,y:origin,facingAngle:0,slashAngle:0,slashAnim:0,atkCooldown:100000,powerAtkCooldown:0,weaponMastery:{},hitGrowthHp:0,hitGrowthDef:0,hitGrowthPct:0,hitGrowthVersion:2,attributeProfile:rollAttributeProfile('COMMANDER','AVERAGE',()=>.5,true)});
  g.equipped={};g.player.equipped=g.equipped;
  for(const [type,{key}]of Object.entries(SLOT_INFO)){
    const item=g.createSupplyEquipment(type,g.player,tier);
    if(type==='WEAPON'){
      item.weaponStyle=style;item.baseName=TIERS[tier-1][{sword:'weapon',spear:'spear',hammer:'hammer',axe:'axe'}[style]];item.name=item.baseName;
      item.weaponTraits={...neutralTraits};
    }
    if(type!=='WEAPON')delete item.armorStyle;
    g.applyEquipmentUpgrade(item,0);g.equipped[key]=item;
  }
  realRecalc.call(g);g.recalcPlayerStats=noop;
  assert.ok(Object.values(g.equipped).every(item=>canUseEquipment(g.player,item)),'every commander item must be legal');
  assert.ok(Object.values(g.equipped).every(item=>item.rollMult===1&&item.upgrade===0),'standard quality, no upgrades');
  g.player.hp=g.player.maxHp;g.player.mana=g.player.maxMana;
  const p=g.player,w=g.equipped.weapon,profile=weaponCombatProfile(w);
  const snapshot={level,tier,strength:p.strength,magic:p.magicPower,hp:p.maxHp,def:p.def,atk:p.atk,crit:p.crit,mana:p.mana,magicAttack:p.magicAttack,weaponAttack:w.stats.atk,requiredStrength:requiredWeaponStrength(w),canChannelWeaponMagic:canChannelWeaponMagic(p),profile};
  if(fixtures[style])assert.deepEqual(snapshot,fixtures[style]);else fixtures[style]=snapshot;
  stats={damage:0,hits:0,magicalFollowups:0,magicalDamage:0};
  return p;
}
function cast(style,shape,seed){
  Math.random=randomFor(seed);const p=setup(style);Math.random=randomFor(seed^0x73eca1);
  g.monsters=shapes[shape].map(([dx,dy],i)=>({id:`skill-target-${i}`,type:'goblin',x:p.x+dx,y:p.y+dy,hp:1e12,maxHp:1e12,def:100,magicDef:100,dmgReduction:0,atk:0,speed:0,radius:8,atkTimer:0,exp:0,color:'#444'}));
  const homes=g.monsters.map(m=>({x:m.x,y:m.y})),startingHp=p.hp,startingMana=p.mana;
  g.triggerPowerAttack();const cooldown=p.powerAtkCooldown;
  for(let i=0;i<20;i++){
    // Keep the same stance/geometry for the delayed sword hit; no enemy AI or flight impacts.
    g.monsters.forEach((m,j)=>Object.assign(m,homes[j]));g.updatePowerFx(.05);freezeProgress();
  }
  const targetDamage=g.monsters.map(m=>m.maxHp-m.hp),hpLost=targetDamage.reduce((a,b)=>a+b,0);
  assert.equal(stats.damage,hpLost,'accounting must exactly equal actual HP loss, including magical followups');
  assert.ok(hpLost>0);assert.equal(g.powerFx.length,0,'all delayed skill effects consumed');
  assert.equal(g.projectiles.length,0,'no ordinary/projectile attacks');assert.equal(p.hp,startingHp,'no incoming damage');
  assert.equal(p.atk,fixtures[style].atk,'no combat stat growth');
  assert.ok(Object.values(p.weaponMastery).every(x=>x===0),'mastery frozen');
  assert.ok(Object.values(p.attributeProfile.practice).every(x=>x===0),'practice frozen');
  assert.equal(p.isAdvanced,false);assert.equal(g.restTimer,0);assert.equal(g.phase,1);
  return {seed,damage:stats.damage,physicalDamage:stats.damage-stats.magicalDamage,targetDamage,hitTargets:targetDamage.filter(x=>x>0).length,hits:stats.hits,cooldown,skillDamagePerCooldown:stats.damage/cooldown,manaUsed:startingMana-p.mana,magicalFollowups:stats.magicalFollowups,magicalDamage:stats.magicalDamage,control:g.monsters.map(m=>({stunSeconds:m.atkTimer,knockDistance:m.knockV0?(m.knockV0/m.knockDecay):0,flightSeconds:m.knockTime||0}))};
}
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const report={version:release.gameVersion,cache:release.version,accountingVersion:2,kind:'commander-single-cast-skills',settings:{level,tier,seeds,quality:1,upgrade:0,advanced:false,rankIndex:0,frozenProgress:true,neutralWeaponTraits:neutralTraits,targetDef:100,targetMagicDef:100,targetHp:1e12,targetRadius:8,shapes,followupStep:.05,followupSeconds:1},fixtures,results:[],sourceHashes:sourceStart,checks:[],notes:[
  'Real triggerPowerAttack, performAttack and updatePowerFx. Exactly one strong skill activation; ordinary attacks, enemy AI and knockback collision damage are never run.',
  'Fixed geometry before every delayed-effects tick. Sword delayed second slash is included; no repositioning or flight damage. Control fields describe applied launch/stun state, not a survival simulation.',
  'Actual melee sweet spots and crit RNG remain enabled. With neutral traits the commander uses playerReach110 for sword/hammer/axe and reach145 for spear.',
  'Weapon-magic followups remain enabled and would be counted once, but normal COMMANDER is excluded by canChannelWeaponMagic family eligibility. All measured skill damage is physical; MP use is zero.',
  'Damage per cooldown is the marginal skill contribution if the same geometry could be repeated, not total DPS and not additive to soldier results.',
  'Weapons and all defense equipment are legal. Normal armor, quality1, upgrade0; rank/kill/wave/rescue bonuses and combat progression are zero.'
]};
try{
  for(const style of ['sword','spear','hammer','axe'])for(const shape of Object.keys(shapes)){
    const runs=Array.from({length:seeds},(_,i)=>cast(style,shape,202610130+i));
    const row={style,shape,seeds,meanDamage:mean(runs.map(r=>r.damage)),minDamage:Math.min(...runs.map(r=>r.damage)),maxDamage:Math.max(...runs.map(r=>r.damage)),meanTargets:mean(runs.map(r=>r.hitTargets)),cooldown:runs[0].cooldown,meanSkillDamagePerCooldown:mean(runs.map(r=>r.skillDamagePerCooldown)),meanManaUsed:mean(runs.map(r=>r.manaUsed)),meanPhysicalDamage:mean(runs.map(r=>r.physicalDamage)),meanMagicalDamage:mean(runs.map(r=>r.magicalDamage)),meanPerTargetDamage:shapes[shape].map((_,i)=>mean(runs.map(r=>r.targetDamage[i]))),runs};
    report.results.push(row);console.log(JSON.stringify({...row,runs:undefined}));
  }
  assert.deepEqual(fingerprint(),sourceStart,'source changed during the run');
  report.checks.push('all equipment legal','fixed starting stats across seeds','actual HP loss reconciled with damage accounting','no ordinary attacks or incoming damage','delayed sword second hit processed','growth and mastery frozen','single skill activation only','game source hash stability');
  writeFileSync(`${out}/skills.json`,JSON.stringify(report,null,2));console.log(`PASS commander skills: ${report.results.length} scenarios / ${report.results.length*seeds} runs`);
}finally{stats=null;Math.random=originalRandom;g.destroy();dom.window.close();}
