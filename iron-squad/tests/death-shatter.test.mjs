import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {spawnDeathShatter,updateDeathShatters,drawDeathShatters,DEATH_SHATTER_CAP,DEATH_SHARD_CAP} from '../js/death-shatter.js';

const mob=(extra={})=>({x:100,y:100,radius:12,type:'goblin',color:'#789569',...extra});
const game={particles:[{color:'keep'}]},rng=Math.random;
let first;
try{Math.random=()=>{throw new Error('visuals must not consume gameplay RNG');};first=spawnDeathShatter(game,mob());}finally{Math.random=rng;}
assert.equal(game.deathShatters.length,1);assert.ok(first.shards.length>=6&&first.shards.length<=8);
assert.equal(first.color,'#789569');assert.equal(first.maxLife,.45);assert.deepEqual(game.particles,[{color:'keep'}]);
assert.ok(first.shards.every(s=>s.size>=4),'ordinary shards remain readable at native scale');
assert.ok(first.flashRadius>=12*1.3,'ordinary flash is wider than the body');
assert.ok(spawnDeathShatter({},mob({radius:8,scale:.25})).shards.every(s=>s.size>=4),'small enemies retain a visible minimum');
assert.equal(spawnDeathShatter({},mob({color:undefined})).color,'#9ca3af');
assert.equal(spawnDeathShatter({},mob({bodyColor:'#123456'})).color,'#123456');
assert.equal(spawnDeathShatter({},mob({scale:2})).flashRadius,first.flashRadius*2);
for(const flag of ['isBoss','isColossal','isInvasionCommander','isDungeonBoss','isPlaceBoss','isDemonKing']){
  const boss=spawnDeathShatter({},mob({[flag]:true}));
  assert.equal(boss.shards.length,first.shards.length*2,flag);assert.equal(boss.maxLife,first.maxLife*1.5,flag);
  assert.ok(boss.flashRadius>first.flashRadius,flag);
}
assert.equal(spawnDeathShatter({},mob({isElite:true})).shards.length,first.shards.length,'elite remains ordinary');

const pool={};for(let i=0;i<12;i++)spawnDeathShatter(pool,mob({x:i}));
const oldest=pool.deathShatters[0],second=pool.deathShatters[1];spawnDeathShatter(pool,mob());
assert.equal(pool.deathShatters.length,DEATH_SHATTER_CAP);assert.ok(!pool.deathShatters.includes(oldest));assert.equal(pool.deathShatters[0],second);
for(let i=0;i<40;i++){
  spawnDeathShatter(pool,mob({x:i,isDungeonBoss:i%2===0}));
  assert.ok(pool.deathShatters.length<=12);assert.ok(pool.deathShatters.reduce((n,e)=>n+e.shards.length,0)<=DEATH_SHARD_CAP);
}
const repeated=mob();assert.ok(spawnDeathShatter(pool,repeated));const size=pool.deathShatters.length;
assert.equal(spawnDeathShatter(pool,repeated),null);assert.equal(pool.deathShatters.length,size);
assert.equal(spawnDeathShatter(pool,mob({retreated:true})),null);

const physics={};const effect=spawnDeathShatter(physics,mob()),shard=effect.shards[0],start={...shard};
updateDeathShatters(physics,.1);assert.notEqual(shard.angle,start.angle);assert.ok(shard.vy>start.vy);
assert.ok(Math.abs(shard.y-(start.y+start.vy*.1+260*.01/2))<1e-9,'ballistic gravity');
updateDeathShatters(physics,-1);assert.equal(effect.life,.35);
spawnDeathShatter(physics,mob({isBoss:true}));updateDeathShatters(physics,.36);
assert.equal(physics.deathShatters.length,1,'boss lasts longer');updateDeathShatters(physics,1);assert.equal(physics.deathShatters.length,0);

function drawingContext(){
  const calls=[],stack=[],ctx={globalAlpha:.8,fillStyle:'#000',strokeStyle:'#123',lineWidth:3};
  ctx.save=()=>{calls.push('save');stack.push([ctx.globalAlpha,ctx.fillStyle,ctx.strokeStyle,ctx.lineWidth]);};
  ctx.restore=()=>{calls.push('restore');[ctx.globalAlpha,ctx.fillStyle,ctx.strokeStyle,ctx.lineWidth]=stack.pop();};
  ctx.stroke=()=>{assert.equal(ctx.strokeStyle,'rgba(0,0,0,.55)');assert.equal(ctx.lineWidth,1);calls.push('stroke');};
  for(const key of ['translate','beginPath','arc','moveTo','lineTo','closePath','fill'])ctx[key]=()=>calls.push(key);
  for(const key of ['shadowBlur','filter'])Object.defineProperty(ctx,key,{set(){assert.fail(`expensive ${key}`);}});
  return {ctx,calls,stack};
}
const visible={camera:{x:100,y:100},width:390,height:844,zoom:1};spawnDeathShatter(visible,mob());
const {ctx,calls,stack}=drawingContext();drawDeathShatters(visible,ctx);
assert.equal(calls.filter(c=>c==='save').length,1);assert.equal(calls.filter(c=>c==='restore').length,1);
assert.equal(calls.filter(c=>c==='fill').length,8,'one flash plus seven triangle fills');
assert.equal(calls.filter(c=>c==='stroke').length,7,'every shard has a thin dark outline');
assert.equal(ctx.globalAlpha,.8);assert.equal(ctx.fillStyle,'#000');assert.equal(stack.length,0);
assert.equal(ctx.strokeStyle,'#123');assert.equal(ctx.lineWidth,3,'outline state is restored once per group');
calls.length=0;updateDeathShatters(visible,.081);drawDeathShatters(visible,ctx);
assert.equal(calls.filter(c=>c==='fill').length,7,'flash stops after 0.08 seconds');
visible.camera.x=10000;calls.length=0;drawDeathShatters(visible,ctx);assert.equal(calls.length,0,'offscreen groups draw nothing');

const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},canvasCtx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>canvasCtx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{sound}=await import('../../common/js/audio.js?v=151');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx:canvasCtx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnDamageText'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('DEATH SHATTER TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();
const saved=structuredClone(g.saveGame({persist:false}));
spawnDeathShatter(g,mob());assert.deepEqual(structuredClone(g.saveGame({persist:false})),saved,'transient visual state is not saved');
g.resumeSavedGame(structuredClone(saved));g.closeStrategyModal();assert.equal(g.deathShatters.length,0);
const audio=[],play=sound.play;let sparkCalls=0;
g.spawnSparks=()=>sparkCalls++;
sound.play=(name,options)=>{audio.push({name,...options});};
try{
  const retreat=mob({retreated:true,hp:0});g.monsters=[retreat];const kills=g.waveKills;
  g.killMonster(retreat,g.player,true);assert.equal(g.deathShatters.length,0);assert.equal(g.waveKills,kills);assert.equal(audio.length,0);
  for(const boss of [false,true]){
    const victim=mob({x:g.player.x+50,y:g.player.y,hp:0,maxHp:100,atk:0,isBoss:boss,lootDistance:0});g.monsters=[victim];
    g.killMonster(victim,g.player,true);assert.equal(g.monsters.length,0);
    const relevant=audio.filter(c=>c.name===(boss?'blast':'stone'));assert.equal(relevant.length,1);
    assert.equal(relevant[0].volume,boss?.7:.45);assert.ok(relevant[0].gap>=.07);assert.equal(relevant[0].x,victim.x);assert.equal(relevant[0].y,victim.y);
    // A repeated notification must not replay the shatter sound or effect.
    const n=g.deathShatters.length;g.killMonster(victim,g.player,true);assert.equal(g.deathShatters.length,n);
    assert.equal(audio.filter(c=>c.name===(boss?'blast':'stone')).length,1);
  }
  assert.equal(sparkCalls,0,'ordinary and midboss deaths leave the shared spark pool alone');
}finally{sound.play=play;}
g.monsters=[];g.updateSpawns=noop;g.updateDemonInvasion=noop;g.update(1);
assert.equal(g.deathShatters.length,0,'real frame update ages the effects');
spawnDeathShatter(g,mob());g.initBattlefield();assert.equal(g.deathShatters.length,0);
spawnDeathShatter(g,mob());g.gameOver();assert.equal(g.deathShatters.length,0);
spawnDeathShatter(g,mob());g.destroy();assert.equal(g.deathShatters.length,0);
dom.window.close();
console.log('PASS: separate bounded shatters, boss tiers, local RNG, gravity/rotation/fade, cheap culled drawing, real kill/audio/save/update/lifecycle');
