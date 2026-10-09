import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {regularInvasionStrength,REGULAR_INVASION_RULES} from '../js/games/iron-squad/invasion-rules.js?v=139';
let now=0,seed=1;const oldRandom=Math.random,oldNow=Date.now,oldPerformance=globalThis.performance;
Date.now=()=>1700000000000;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats,SLOT_INFO}=await import('../js/games/iron-squad/index.js');const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame),c=WORLD_SIZE/2;Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:c,y:c},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;game.setupUI();game.activeSlotId=saveSlots.create('HQ BALANCE TEST ONLY').id;
function fresh(value){seed=value;game.startFreshGame(false);game.closeStrategyModal();Object.assign(game,{updateSpawns:noop,monsters:[],restMonsters:[],currentQuest:null});for(let wave=0;wave<2;wave++){game.completePhase();for(let i=0;i<8;i++)game.processRestSecond();game.finishRest();game.monsters=[];game.restMonsters=[];}game.closeStrategyModal();game.phaseTimer=100;Object.assign(game.player,{x:c+4000,y:c+4000});}
function fight(){game.startDemonInvasion();game.arriveDemonInvasion();const army=[...game.squad],strength={...game.invasions.strength};assert.equal(game.monsters.filter(m=>m.isDemonInvasion).length,28);assert.ok(game.monsters.some(m=>m.y<c)&&game.monsters.some(m=>m.x<c),'three approaches pressure separate defenses');let peak=0;for(let i=0;i<1000&&game.invasions.stage==='battle';i++){now+=100;game.update(.1);peak=Math.max(peak,army.filter(s=>s.dead||s.isDown).length);}return {peak,total:army.length,dead:army.filter(s=>s.dead).length,outcome:game.invasions.lastResult?.outcome||'ongoing',strength};}
const results=[];for(const value of [1,2,3,7,24701]){fresh(value);const result=fight();results.push({seed:value,...result});console.log(JSON.stringify({case:'early',seed:value,...result}));}
assert.ok(results.every(r=>r.peak>=r.total*.7),'initial equipment suffers at least 70 percent simultaneous casualties across the fixed seeds');
assert.ok(results.filter(r=>r.outcome!=='victory').length>=3,'most initial forces fail to repel the invasion');
// Equipment and level growth can overcome the same bounded enemy force; no skill or invulnerability cheats.
fresh(24701);for(const s of game.squad){s.level=18;s.reqExp=14000;for(const [type,slot] of Object.entries(SLOT_INFO)){const item={id:`trained-${s.id}-${type}`,type,tier:10,name:'育成防衛装備',weaponStyle:s.equipped?.weapon?.weaponStyle||'sword',stats:{},rollMult:1};applyUpgradeStats(item,8);s.equipped[slot.key]=item;}game.recalcSoldierStats(s);s.hp=s.maxHp;}
const trained=fight();console.log(JSON.stringify({case:'trained',...trained}));assert.equal(trained.outcome,'victory');assert.ok(trained.peak<=trained.total*.25,'developed equipment is a meaningful answer to invasion pressure');
const floor=regularInvasionStrength({hp:1,atk:1,def:0,heroHp:1,heroDef:0}),ceiling=regularInvasionStrength({hp:1e12,atk:1e12,def:1e12,heroHp:1e12,heroDef:1e12});
assert.equal(floor.hp,REGULAR_INVASION_RULES.hpFloor);assert.equal(floor.atk,REGULAR_INVASION_RULES.atkFloor);assert.equal(ceiling.hp,REGULAR_INVASION_RULES.hpCeiling);assert.equal(ceiling.atk,REGULAR_INVASION_RULES.atkCeiling);
// Live mobilized units, including damage and flanking coordinates, survive reload unchanged.
fresh(7);game.startDemonInvasion();game.arriveDemonInvasion();game.monsters[4].hp-=100;const mobs=structuredClone(game.monsters),save=structuredClone(game.saveGame());game.resumeSavedGame(save);assert.deepEqual(game.monsters.filter(m=>m.isDemonInvasion).map(m=>[m.id,m.x,m.y,m.hp,m.atk,m.attackReach,m.cleaveRadius]),mobs.map(m=>[m.id,m.x,m.y,m.hp,m.atk,m.attackReach,m.cleaveRadius]));
console.log('PASS: early HQ collapse across five RNG seeds, trained victory, bounded opposition, three approaches, mobilized army save/reload');
Math.random=oldRandom;Date.now=oldNow;Object.defineProperty(globalThis,'performance',{configurable:true,value:oldPerformance});dom.window.close();
