// v7.2.23: the demon castle and the true demon castle are lit (no darkness mask, no lantern glow); other dungeons stay dark.
// Big boss gauges are drawn after the darkness / lantern passes, so light effects never hide them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null,createElement:()=>{throw new Error('no canvas should be made in a lit castle');}};
const L=await import('../js/scene-lighting.js');
const {IronSquadGame}=await import('../js/index.js');
const castle={id:'dungeon_demon_castle',kind:'dungeon'},trueCastle={id:'dungeon_true_demon_castle',kind:'dungeon'},cave={id:'dungeon_frozen_cave',kind:'dungeon'};
// a canvas context that records every call and never fails
function recorder(){const calls=[];const fn=name=>(...a)=>{calls.push({name,a});if(name==='createRadialGradient'||name==='createLinearGradient'||name==='createPattern')return {addColorStop(){}};if(name==='measureText')return {width:10};return undefined;};
  const props={};const ctx=new Proxy(props,{get:(t,k)=>k==='calls'?calls:k in t?t[k]:typeof k==='string'&&!['fillStyle','strokeStyle','font','textAlign','globalAlpha','lineWidth','shadowColor','shadowBlur','globalCompositeOperation','filter','lineCap','lineJoin','textBaseline','canvas'].includes(k)?fn(k):undefined,set:(t,k,v)=>{t[k]=v;calls.push({name:'set:'+String(k),a:[v]});return true;}});return ctx;}
{ // 1. which dungeons are lit
  assert.deepEqual([...L.BRIGHT_DUNGEON_IDS].sort(),['dungeon_demon_castle','dungeon_true_demon_castle']);
  assert.equal(L.brightDungeon({currentDungeon:castle}),true);assert.equal(L.brightDungeon({currentDungeon:trueCastle}),true);
  assert.equal(L.brightDungeon({currentDungeon:cave}),false,'other dungeons stay dark');assert.equal(L.brightDungeon({currentDungeon:null}),false,'the field keeps its day and night');
}
{ // 2. no darkness and no lantern sources inside the castles; a dark cave still has the commander's lantern
  for(const d of [castle,trueCastle]){
    const game={width:390,height:844,zoom:1,camera:{x:0,y:0},player:{x:10,y:10},currentDungeon:d,worldTime:0};
    const c=recorder();L.drawSceneDarkness(c,game,0);assert.equal(c.calls.length,0,`${d.id}: no darkness mask is drawn`);
    assert.deepEqual(L.sceneLightSources(game,0),[],`${d.id}: no lantern light`);
  }
  assert.equal(L.CAVE_DARKNESS>.9,true,'caves are still nearly black');
  const src=fs.readFileSync(new URL('../js/scene-lighting.js',import.meta.url),'utf8');
  assert.match(src,/const isCave=game=>game\.currentDungeon\?\.kind==='dungeon';/,'the cave rule itself is unchanged for other dungeons');
}
{ // 3. boss gauge: queued during the world pass, drawn on top afterwards
  const game=Object.create(IronSquadGame);game.player={x:0,y:0};game.zoom=1;
  const king={x:100,y:200,radius:40,hp:600,maxHp:1000,isColossal:true,isBoss:true,isDungeonBoss:true,isDemonKing:true,type:'demon_king',name:'魔王',title:'【終焉の魔王】'};
  game._bossGaugeQueue=[];const world=recorder();game.drawMonster(world,king,0);
  assert.deepEqual(game._bossGaugeQueue,[king],'the gauge waits for the top pass');
  assert.ok(!world.calls.some(x=>x.name==='fillText'&&String(x.a[0]).includes('魔王')),'the name and gauge are not drawn under the darkness');
  const top=recorder();game.drawBossGauges(top);assert.equal(game._bossGaugeQueue,null);
  assert.ok(top.calls.some(x=>x.name==='fillText'&&String(x.a[0])==='【終焉の魔王】魔王'),'name drawn on top');
  const bar=top.calls.findIndex(x=>x.name==='set:fillStyle'&&x.a[0]==='#ef4444');assert.ok(bar>=0&&top.calls[bar+1].name==='fillRect'&&top.calls[bar+1].a[2]===60,'red bar at 60%');
  const t=top.calls.find(x=>x.name==='translate');assert.deepEqual(t.a,[100,200],'drawn at the boss in camera space');
  // without a frame queue (other callers) it is drawn right away, as before
  const direct=recorder();game.drawMonster(direct,king,0);assert.ok(direct.calls.some(x=>x.name==='fillText'&&String(x.a[0]).includes('魔王')));
  // a dead boss leaves no gauge
  game._bossGaugeQueue=[{...king,hp:0}];const none=recorder();game.drawBossGauges(none);assert.equal(none.calls.length,0);
}
{ // 4. render order: world (queues gauges) → darkness → lantern glow → boss gauges → fog
  const src=fs.readFileSync(new URL('../js/index.js',import.meta.url),'utf8');
  const q=src.indexOf('this._bossGaugeQueue = [];'),atm=src.indexOf('this.drawAtmosphere(this.ctx, now, shakeX, shakeY);'),night=src.indexOf('this.drawNightLights(this.ctx, now);'),flush=src.indexOf('this.drawBossGauges(this.ctx);'),fog=src.indexOf('const fog = this.ensureFog();',flush);
  assert.ok(q>0&&q<atm&&atm<night&&night<flush&&flush<fog,'gauges are drawn after darkness and lights, before the field fog');
  assert.match(src,/brightDungeon\(this\)\)return; \/\/ v7\.2\.23/,'no lantern glow in the lit castles');
}
console.log('castle light v7.2.23 ok');
