import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast'])game[m]=noop;game.setupUI();game.activeSlotId=saveSlots.create('KNOCK COLLISION TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();
Object.assign(game,{squad:[],updateSpawns:noop,outposts:[]});Object.assign(game.player,{x:83000,y:83000});
const mob=(id,dx,extra={})=>({id,type:'goblin',x:83000+dx,y:83000,hp:5000,maxHp:5000,radius:12,atk:0,def:0,speed:0,atkTimer:99,isRaidMob:true,isDemonInvasion:true,...extra});
// A thrown goblin crashes into a second one: both take impact damage, the second flies on.
const a=mob('a',40),b=mob('b',90),c=mob('c',400);game.monsters=[a,b,c];
game.throwMonster(a,0,600,1000,game.player,true);
assert.doesNotThrow(()=>JSON.stringify(game.saveGame()),'mid-flight runtime references are not persisted');
for(let i=0;i<4&&!(b.hp<5000);i++)game.updateMonsterKnock(a,1/60);
assert.ok(a.hp<5000&&b.hp<5000,'thrower and struck enemy are both hurt');assert.equal(5000-a.hp,5000-b.hp,'same impact on both');
assert.ok(b.knockFly>0,'the struck enemy is launched onward');assert.ok(Math.hypot(a.knockVx,a.knockVy)<a.knockV0,'the thrown enemy loses speed');
const aHp=a.hp;for(let i=0;i<5;i++)game.updateMonsterKnock(a,1/60);assert.equal(a.hp,aHp,'the same pair collides only once');
assert.ok(b._knockHits.includes(a),'the chain does not bounce back into the thrower');
assert.doesNotThrow(()=>JSON.stringify(game.saveGame()),'cross-referencing flights still save');
// Lethal crash credits the thrower; heavier targets are sent less far; colossi do not move.
const d=mob('d',40),e=mob('e',90,{hp:10,maxHp:10});game.monsters=[d,e];let credited=null;const kill=game.killMonster;game.killMonster=function(m,by,isPlayer){credited={m,by,isPlayer};return kill.call(this,m,by,isPlayer);};
game.throwMonster(d,0,600,1000,game.player,true);for(let i=0;i<4&&game.monsters.includes(e);i++)game.updateMonsterKnock(d,1/60);
assert.equal(credited?.m,e);assert.equal(credited.by,game.player);assert.equal(credited.isPlayer,true);game.killMonster=kill;
const f=mob('f',40),big=mob('big',95,{radius:30}),col=mob('col',140,{isColossal:true,radius:60});game.monsters=[f,big];
game.throwMonster(f,0,600,1000,game.player,true);for(let i=0;i<4&&!(big.hp<5000);i++)game.updateMonsterKnock(f,1/60);
const small=mob('s',90);const g=mob('g',40);game.monsters=[g,small];game.throwMonster(g,0,600,1000,game.player,true);for(let i=0;i<4&&!(small.hp<5000);i++)game.updateMonsterKnock(g,1/60);
assert.ok(big.knockTime<small.knockTime,'heavier enemies are sent a shorter distance');
const h=mob('h',90);game.monsters=[h,col];game.throwMonster(h,0,600,1000,game.player,true);for(let i=0;i<6;i++)game.updateMonsterKnock(h,1/60);
assert.ok(col.hp<5000&&!(col.knockFly>0),'colossi are hurt but never moved');
// v6.3.0 cannon: shells deal x2 damage, blast radius 62 (x1.2); out-of-ammo stones are not doubled.
const {CANNON_RULES}=await import('../js/index.js');const {weaponCombatProfile}=await import('../js/equipment-rules.js');
const cprof=weaponCombatProfile({weaponStyle:'cannon'});assert.equal(cprof.splash,62);assert.equal(CANNON_RULES.damageMult,2);
const shooter={x:83000,y:83000,ammo:5,maxAmmo:5},tgt=mob('t',200);game.projectiles=[];game.monsters=[tgt];
game.spawnRangedProjectile(shooter,tgt,100,cprof,false);const shell=game.projectiles.at(-1);
const {RANGED_DAMAGE_MULT}=await import('../js/supply-rules.js');assert.equal(shell.type,'CANNONBALL');assert.equal(shell.splash,62);assert.equal(shell.damage,Math.round(Math.max(1,Math.round(100*RANGED_DAMAGE_MULT))*2),'shell damage doubled');
const dry={x:83000,y:83000,ammo:0,maxAmmo:5};game.projectiles=[];game.spawnRangedProjectile(dry,tgt,100,cprof,false);const stone=game.projectiles.at(-1);
assert.equal(stone.type,'STONE');assert.ok(stone.damage<Math.round(100*RANGED_DAMAGE_MULT)*2,'stones are not doubled');
console.log('PASS: enemy-to-enemy crash damage on both, onward chain launch, speed loss, single collision per pair, no bounce-back, kill credit, weight, colossi, save-safe mid-flight, cannon x2 damage / x1.2 blast');dom.window.close();
