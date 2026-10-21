// v7.2.24: the true demon king is drawn 1.75× larger (art only); hitbox, reach and strength are unchanged; the gauge sits above the larger body.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const V=await import('../js/visuals.js');
const T=await import('../js/true-demon-castle.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {IronSquadGame}=await import('../js/index.js');
function recorder(){const calls=[];const fn=name=>(...a)=>{calls.push({name,a});if(/^create.*Gradient$|^createPattern$/.test(name))return {addColorStop(){}};if(name==='measureText')return {width:10};};
  const st={};return new Proxy(st,{get:(t,k)=>k==='calls'?calls:k in t?t[k]:typeof k==='string'?fn(k):undefined,set:(t,k,v)=>{t[k]=v;calls.push({name:'set:'+String(k),a:[v]});return true;}});}
assert.ok(V.TRUE_KING_VISUAL_SCALE>=1.5&&V.TRUE_KING_VISUAL_SCALE<=2,'1.5–2× the old true king');
assert.equal(V.TRUE_KING_ART_TOP,Math.round(102*V.TRUE_KING_VISUAL_SCALE));
{ // hitbox, reach and strength are unchanged
  const def=DUNGEON_DEFS.find(d=>d.id==='dungeon_true_demon_castle').boss;assert.equal(def.radius,80);
  const k=T.shapeTrueDemonKing({radius:def.radius});assert.equal(k.radius,80);assert.equal(k.attackReach,96);assert.equal(k.cleaveRadius,90);
  assert.equal(k.maxHp,T.TRUE_KING_RULES.hp);assert.equal(k.atk,T.TRUE_KING_RULES.atk);
}
{ // art: scaled after the cast ring, so the warning ring keeps its real radius
  const m={type:'true_demon_king',radius:80,hitPulse:0,x:0,y:0,isColossal:true,tk:{cast:{kind:'judgment',t:0,total:2,radius:650},barrier:0}};
  const c=recorder();assert.equal(V.drawFieldBoss(c,m,0),true);
  const ring=c.calls.findIndex(x=>x.name==='ellipse'),big=c.calls.findIndex(x=>x.name==='scale'&&x.a[0]===V.TRUE_KING_VISUAL_SCALE);
  assert.ok(ring>=0&&big>ring,'the body is scaled up after the cast ring is drawn');assert.equal(c.calls[ring].a[2],650,'the judgment ring keeps its world radius');
  const saves=c.calls.filter(x=>x.name==='save').length,restores=c.calls.filter(x=>x.name==='restore').length;assert.equal(saves,restores,'canvas state is balanced');
  const dk=recorder();V.drawFieldBoss(dk,{type:'demon_king',radius:72,hitPulse:0,isColossal:true},0);assert.ok(!dk.calls.some(x=>x.name==='scale'&&x.a[0]===V.TRUE_KING_VISUAL_SCALE),'the demon king keeps his size');
}
{ // gauge above the larger body; the demon king's gauge stays where it was
  const game=Object.create(IronSquadGame);game.zoom=1;
  const y=type=>{const c=recorder();game.drawBossGauge(c,{type,x:0,y:0,hp:5,maxHp:10,name:'x',radius:80});return c.calls.find(x=>x.name==='fillRect').a[1];};
  assert.equal(y('true_demon_king'),-(V.TRUE_KING_ART_TOP+22)-2);assert.equal(y('demon_king'),-112-2);
  assert.ok(-y('true_demon_king')>V.TRUE_KING_ART_TOP+15,'clear of the halo');
}
console.log('true king size v7.2.24 ok');
