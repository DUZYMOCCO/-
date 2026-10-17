import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {MAGE_IDS,MAGE_HP_MULT,classHpScale,MAGIC_CLASSES} from '../js/magic-rules.js';
import {levelGrowthSteps} from '../js/level-growth.js';
// v7.0.19: all mage tiers have 0.8x max HP; medics and other classes are unchanged; saves are simply recomputed on load.
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,generateRandomDrop,applyUpgradeStats}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
assert.equal(MAGE_HP_MULT,0.8);assert.deepEqual(MAGE_IDS,['MAGE','ARCHMAGE','ELEMENTAL_SAGE','ARCANE_SOVEREIGN']);
for(const id of MAGE_IDS)assert.equal(classHpScale(id),0.8);
for(const id of ['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL','HEAVY','LIGHT','ARCHER','CROSSBOW','CANNON','PALADIN',undefined])assert.equal(classHpScale(id),1,`${id} is not scaled`);
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MAGE HP V7019 TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();game.squad=[];game.restTimer=0;game.outposts=[];
const armor=(tier)=>{const a=generateRandomDrop(0,'normal',{type:'ARMOR',tier,upgrade:0,quality:1,merchant:true,random:()=>.5});a.id=`mage-hp-armor-${tier}`;return a;};
// A clean soldier of a given class: level 1, no waves/kills/honours, talent AVERAGE, no deathline, no hit growth, no grit -> maxHp is exactly floor(base * class mult * scale).
const make=(classKey,tier=0)=>{const s=game.createNewSoldier(null,{classKey,talent:'AVERAGE'});Object.assign(s,{soldierClass:classKey,combatClass:classKey,level:1,survivedWaves:0,minionKills:0,bossKills:0,midbossKills:0,isNamed:false,isVeteran:false,deathlineSkills:[],inferiorGrit:0,hitGrowth:undefined,hitGrowthHp:0,hitGrowthDef:0});
  s.attributeProfile.innate.strength=400;const a=tier?armor(tier):null;s.equipped={weapon:null,shield:null,helmet:null,armor:a,gloves:null,legs:null,amulet:null};s.weapon=null;s.maxHp=70;s.hp=70;s.isDown=false;game.recalcSoldierStats(s);return {s,equipHp:a?.stats?.hp||0};};
const unscaled=(classKey,equipHp)=>{const cls=SOLDIER_CLASSES[classKey];const mult=cls.isAdvanced?1+(cls.hpMultBonus||0):1;return Math.floor((70+(cls.bonusHp||0)+levelGrowthSteps(1)*8+equipHp)*mult);};
const rows=[];
for(const tier of [0,1,6,10])for(const key of [...MAGE_IDS,'MEDIC','HIGH_PRIEST','HEAVY','LIGHT','ARCHER']){
  const {s,equipHp}=make(key,tier),old=unscaled(key,equipHp);
  if(tier)assert.ok(equipHp>0,'armor carries HP');
  const expected=MAGE_IDS.includes(key)?Math.floor(old*0.8):old;
  assert.equal(s.maxHp,expected,`${key} tier ${tier}: maxHp ${s.maxHp} vs ${expected} (old ${old})`);
  if(MAGE_IDS.includes(key)){assert.ok(s.maxHp<old,'mage HP went down');assert.ok(Math.abs(s.maxHp-old*0.8)<1,'0.8x of the old value (floor)');if(tier)assert.ok(equipHp>0&&s.maxHp>Math.floor((old-equipHp)*0.8),'equipment HP is inside the scaling');}
  else assert.equal(s.maxHp,old,`${key} unchanged`);
  rows.push(`${key}@T${tier}: ${old} -> ${s.maxHp}`);
}
// Upper mage jobs are scaled exactly once (not once per class tier): ARCHMAGE T0 = floor((70+10)*0.8)=64, not 51.
assert.equal(make('ARCHMAGE').s.maxHp,64);assert.equal(make('ELEMENTAL_SAGE').s.maxHp,96);assert.equal(make('ARCANE_SOVEREIGN').s.maxHp,128);assert.equal(make('MAGE').s.maxHp,36);assert.equal(make('MEDIC').s.maxHp,unscaled('MEDIC',0));
// Absolute HP gains (hit growth, grit) are outside the multiplier: scaling applies to the multiplied part only.
{const {s}=make('MAGE');const base=s.maxHp;s.inferiorGrit=4;game.recalcSoldierStats(s);assert.equal(s.maxHp,Math.floor(base*1.2),'grit keeps working on top of the scaled HP');}
// Named / veteran multipliers still stack with the mage scale (all multiplicative on the same base).
{const {s}=make('MAGE');s.isNamed=true;s.isVeteran=true;game.recalcSoldierStats(s);const base=70+SOLDIER_CLASSES.MAGE.bonusHp+levelGrowthSteps(1)*8+50+30;assert.equal(s.maxHp,Math.floor(base*1.3*1.15*0.8));}
// Descriptions say so.
assert.ok(MAGIC_CLASSES.MAGE.desc.includes('0.8')&&MAGIC_CLASSES.ARCHMAGE.desc.includes('最大HP'));
// Real save -> load: an old save (mage with the previous max HP, full health) is recomputed to 0.8x on load; medic and swordsman are unchanged; a second save/load is stable.
{const m=make('MAGE',6),med=make('MEDIC',6),hv=make('HEAVY',6);const oldMage=unscaled('MAGE',m.equipHp),oldMed=med.s.maxHp,oldHv=hv.s.maxHp;
  game.squad=[m.s,med.s,hv.s];game.saveGame({immediate:true});const saved=structuredClone(saveSlots.get(game.activeSlotId).data);
  const byId={};for(const e of saved.squad){byId[e.id]=e;}
  byId[m.s.id].maxHp=oldMage;byId[m.s.id].hp=oldMage; // as stored by v7.0.18
  for(let load=0;load<2;load++){game.resumeSavedGame(load?structuredClone(game.saveGame({immediate:true})):structuredClone(saved));
    const find=id=>game.squad.find(s=>s.id===id)||(game.reserves||[]).find(s=>s.id===id);
    assert.equal(find(m.s.id).maxHp,Math.floor(oldMage*0.8),`load ${load}: mage recomputed`);assert.ok(find(m.s.id).hp<=find(m.s.id).maxHp,'HP is clamped to the new max');
    assert.equal(find(med.s.id).maxHp,oldMed,'medic unchanged');assert.equal(find(hv.s.id).maxHp,oldHv,'heavy unchanged');}
}
console.log('PASS: mage max HP x0.8 (all tiers, once); medic/heavy/light/archer unchanged;\n'+rows.join('\n'));
dom.window.close();