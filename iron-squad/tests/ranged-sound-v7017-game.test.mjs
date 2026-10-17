import assert from 'node:assert/strict';
import {strongEnemyReward,combatPower} from '../js/combat-rewards.js';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {AMMO_CAPACITY,ammoCapacity,LETHAL_GUARD_COOLDOWN,initializeSupplies,updateSupplies,distributeAmmo,supplyLocation,ammoCombatProfile} from '../js/supply-rules.js';
import {weaponCombatProfile} from '../js/equipment-rules.js';
import {masteryReloadMult} from '../js/growth-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,DEPLOYMENT_CAPACITY,ENEMY_LIMIT}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);game.container=document.getElementById('game');
Object.assign(game,{width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('V7017 SOUND TEST ONLY').id;game.startFreshGame(false);game.career.status='enlisted';
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.monsters.length,ENEMY_LIMIT);
assert.equal(game.squadPotion,1);assert.ok(game.squad.every(s=>s.ammo===ammoCapacity(s)));assert.equal(saveSlots.get(game.activeSlotId).data.squadPotion,1,'initial auto-save records the issued potion');assert.equal(saveSlots.get(game.activeSlotId).data.player.ammo,30);
const baseline=structuredClone(game.saveGame({immediate:true}));
function field() {
  game.resumeSavedGame(structuredClone(baseline));game.closeStrategyModal();
  Object.assign(game.player,{x:81000,y:81000,atk:100,atkCooldown:0,powerAtkCooldown:0,speed:0,dodge:0});
  game.camera={x:81000,y:81000};game.joystick={active:false,dirX:0,dirY:0};
  game.squad=[];game.reserves=[];game.outposts=[];game.merchants=[];game.civilians=[];game.projectiles=[];game.dropsOnField=[];game.monsters=[];
  game.updateSpawns=noop;game.restTimer=0;game.currentQuest=null;
}
const enemy=(x=81090,y=81000)=>({x,y,type:'goblin',hp:1e6,maxHp:1e6,radius:12,speed:0,atk:1,atkCooldown:100});
const weapon=style=>({id:`test-${style}`,type:'WEAPON',weaponStyle:style,stats:{atk:0}});
// Loaded shots consume actual rounds; empty mode uses a single defensive blade without projectiles.
// v7.0.17: real game loop. A SNIPER's 3-arrow volley makes one allied sound (no engine slot); the commander's shot still goes to the engine.
const {sound}=await import('../../common/js/audio.js?v=151');
const started=[],calls=[];
const audioCtx={currentTime:100,state:'running',sampleRate:44100,createBuffer:(ch,n)=>({duration:n/44100,getChannelData:()=>new Float32Array(n)}),createGain:()=>({connect(){},disconnect(){},gain:{value:1}}),createStereoPanner:()=>({connect(){},disconnect(){},pan:{value:0}}),createBufferSource(){const s={playbackRate:{value:1},connect(){},disconnect(){},stop(){},start(){started.push(s);}};return s;}};
Object.assign(sound,{ctx:audioCtx,effects:{},isMuted:false,pageHidden:false,effectVolume:.65,spatialListener:()=>({x:81000,y:81000}),buffers:new Map(),playWeapon:(...a)=>{calls.push(a);return true;}});
field();game.equipped.weapon=weapon('sword');game.player.atkCooldown=100;
const sniper=structuredClone(baseline.squad[0]);Object.assign(sniper,{soldierClass:'SNIPER',x:81000,y:81000,isPersonalGuard:true,ammo:10,atkCooldown:0,speed:0,isDown:false,hp:1000,maxHp:1000,equipped:{weapon:weapon('bow')},weapon:weapon('bow'),_cachedEnemy:null,_pgTick:0});
game.squad=[sniper];game.monsters=[enemy()];game.update(.01);
assert.equal(game.projectiles.filter(p=>p.type==='STAR_ARROW').length,3,'the sniper still fires three arrows');
assert.equal(started.length,1,'but the volley makes a single allied sound');assert.equal(calls.length,0,'and uses none of the engine\'s shared combat slots');
audioCtx.currentTime+=2;
field();game.equipped.weapon=weapon('bow');game.player.equipped=game.equipped;game.player.ammo=5;game.monsters=[enemy()];game.rebuildMonsterSpatial();game.manualAttack();
assert.deepEqual(calls,[['bow',81000,81000]],'the commander\'s shot goes to sound.playWeapon exactly as before');
assert.equal(started.length,1,'and adds no allied voice');
process.exit(0);