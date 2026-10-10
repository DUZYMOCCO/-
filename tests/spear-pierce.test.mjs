import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE,northSouthRoadX} from '../js/games/iron-squad/world.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats}=await import('../js/games/iron-squad/index.js');
const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const originalRandom=Math.random;let randomSeed=1701;
Math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('SPEAR TEST ONLY').id;g.startFreshGame(false);
const saved=structuredClone(g.saveGame()),y=WORLD_SIZE/2+6000,x=northSouthRoadX(y);
function fixture(mode,frontHp=1,rearHp=1,reverse=false){
 g.resumeSavedGame(structuredClone(saved));g.closeStrategyModal();g.currentQuest=null;g.currentDungeon=null;g.restTimer=0;g.updateSpawns=noop;g.outposts=[];g.merchants=[];g.dungeons=[];g.medicalPosts=[];g.civilians=[];g.gateGuards=[];g.reserves=[];g.projectiles=[];g.dropsOnField=[];g._hazardClock=0;
 const spear={id:'test-spear',type:'WEAPON',name:'木の槍',weaponStyle:'spear',tier:1,stats:{}};applyUpgradeStats(spear,0);
 g.equipped.weapon=spear;g.recalcPlayerStats();Object.assign(g.player,{x,y,hp:g.player.maxHp,atkCooldown:0,crit:0,isAdvanced:mode==='warlord-auto',slashAngle:0,facingAngle:0});g.joystick={active:false,dirX:0,dirY:0};g.camera={x,y};g.rankIndex=2;
 const soldier=g.squad.find(s=>s.soldierClass==='HEAVY');g.squad=mode==='soldier'?[soldier]:[];
 if(mode==='soldier'){
  soldier.attributeProfile.innate.strength=80;soldier.equipped.weapon=structuredClone(spear);g.recalcSoldierStats(soldier);Object.assign(soldier,{x,y,hp:soldier.maxHp,isPersonalGuard:true,dead:false,isDown:false,atkCooldown:0,_pgTick:3,reqExp:1e9,crit:0,speed:0});g.player.atkCooldown=1e6;
 }
 const monster=(id,dx,dy,hp)=>({id,type:'goblin',x:x+dx,y:y+dy,hp,maxHp:hp,radius:10,def:0,speed:0,atk:0,atkTimer:100});
 const front=monster('front',25,0,frontHp),rear=monster('rear',60,0,rearHp),side=monster('side',30,100,10000),far=monster('far',500,0,10000);
 g.monsters=reverse?[rear,front,side,far]:[front,rear,side,far];
 const hits=[],perform=g.performAttack;g.performAttack=function(...args){hits.push(args[1].id);return perform.call(this,...args);};
 try{
  const attack=()=>{if(mode==='manual')g.manualAttack();else if(mode==='power')g.triggerPowerAttack();else g.update(.001);};
  attack();const hitCount=hits.length;attack();assert.equal(hits.length,hitCount,`${mode}: cooldown prevents an immediate second attack`);
 }finally{g.performAttack=perform;}
 return {mode,front:front.hp,rear:rear.hp,frontHp,rearHp,side:side.hp,far:far.hp,hits,remaining:g.monsters.map(m=>m.id)};
}
const results=[];
for(const mode of ['manual','auto','soldier','power','warlord-auto']){
 results.push(fixture(mode));results.push(fixture(mode,1,10000));results.push(fixture(mode,10000,10000));results.push(fixture(mode,1,1,true));
}
for(const r of results){
 assert.ok(r.hits.includes('front')&&r.hits.includes('rear'),`${r.mode}: a lethal first hit must not skip the target behind it (${r.hits})`);
 assert.ok(r.front<r.frontHp&&r.rear<r.rearHp,`${r.mode}: both targets take real damage ${JSON.stringify(r)}`);
 if(r.mode==='warlord-auto')assert.ok(r.side<10000,'advanced automatic attack retains its existing circular area');
 else assert.equal(r.side,10000,`${r.mode}: target outside the thrust/fan stays unharmed`);
 assert.equal(r.far,10000,`${r.mode}: target beyond reach stays unharmed`);
 assert.equal(r.hits.filter(id=>id==='front').length,1);assert.equal(r.hits.filter(id=>id==='rear').length,1);
}
console.log('PASS: real manual/auto/soldier/power/advanced spear attacks pierce after kills, hit survivors, retain geometry and never double-hit');
dom.window.close();
Math.random=originalRandom;
