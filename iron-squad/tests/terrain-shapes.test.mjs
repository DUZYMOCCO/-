import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {hazardContour,insideHazard,terrainSeed,containsContour,drawNaturalPond,traceContour} from '../js/terrain-shapes.js';
import {fieldsNear,updateHazards,hazardMethods} from '../js/hazard-fields.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {WorldTerrain}=await import('../js/world.js');
const shapes=new Map();
for(let y=0;y<30;y++)for(let x=0;x<30;x++){
 const f={x,y,radius:95};shapes.set(terrainSeed(x,y)%4,f);
 assert.ok(insideHazard(f,f),'each terrain center remains hazardous');
 assert.ok(hazardContour(f).every(([px,py])=>Math.hypot(px-x,py-y)<=95.00001),'no hazard exceeds its existing outer envelope');
}
assert.equal(shapes.size,4);
for(const f of shapes.values()){
 const canvas=createCanvas(240,240),c=canvas.getContext('2d');c.translate(120-f.x,120-f.y);traceContour(c,hazardContour(f));c.fill();
 let safeInside=0,dangerInside=0;
 for(let y=-100;y<=100;y+=5)for(let x=-100;x<=100;x+=5){
  const u={x:f.x+x+.5,y:f.y+y+.5},inside=insideHazard(f,u);
  assert.equal(c.isPointInPath(u.x-f.x+120,u.y-f.y+120),inside,'Canvas fill and damage use the same contour');
  const a=c.getImageData(x+120,y+120,1,1).data[3];if(a===255)assert.ok(inside);if(a===0)assert.ok(!inside);
  if(Math.hypot(x,y)<90){if(inside)dangerInside++;else safeInside++;}
 }
 assert.ok(safeInside>10&&dangerInside>10,'a visibly irregular footprint replaces the circular field');
}
// Stable across cache eviction/reload, with four distinct silhouettes.
const first={x:80100,y:79780,radius:95},saved=JSON.stringify(hazardContour(first));
for(let i=0;i<200;i++)hazardContour({x:i*913,y:i*227,radius:95});
assert.equal(JSON.stringify(hazardContour(first)),saved);
const canvas=createCanvas(220,160),c=canvas.getContext('2d'),ponds=[];
for(let i=0;i<5;i++){c.clearRect(0,0,220,160);const p=drawNaturalPond(c,110,80,42,i);assert.ok(p.every(([x,y])=>Math.abs(x-110)<=78&&Math.abs(y-80)<=46));ponds.push(canvas.toBuffer('image/png'));}
assert.equal(new Set(ponds.map(b=>b.toString('base64'))).size,5);
// Actual half-second damage and warning agree at center, inlet, and outside.
const f=fieldsNear(first.x,first.y).find(f=>f.id==='hazard-borderland'),unit={...f,hp:100,maxHp:100};
const notices=[],warning={classList:{toggle:(name,hidden)=>notices.push(hidden)}};
document.getElementById=()=>warning;document.querySelector=()=>null;
const game={player:unit,squad:[],monsters:[],inBattle:true,restTimer:0,damageTarget:(u,n)=>u.hp-=n};
updateHazards(game,.5);assert.equal(unit.hp,90);hazardMethods.refreshHazardUI.call(game);assert.equal(notices.at(-1),false);
let inlet;
for(let x=-80;x<=80&&!inlet;x+=4)for(let y=-80;y<=80;y+=4){const p={x:f.x+x,y:f.y+y};if(Math.hypot(x,y)<85&&!insideHazard(f,p)){inlet=p;break;}}
assert.ok(inlet);Object.assign(unit,inlet);updateHazards(game,.5);assert.equal(unit.hp,90);hazardMethods.refreshHazardUI.call(game);assert.equal(notices.at(-1),true);
Object.assign(unit,{x:f.x,y:f.y});game.monsters=[{x:f.x,y:f.y,hp:40,maxHp:40},{...inlet,hp:40,maxHp:40}];updateHazards(game,.5);assert.equal(game.monsters[0].hp,30);assert.equal(game.monsters[1].hp,40);
game.currentDungeon={kind:'town'};const hp=unit.hp;updateHazards(game,.5);assert.equal(unit.hp,hp);game.currentDungeon=null;game.restTimer=1;updateHazards(game,.5);assert.equal(unit.hp,hp);
const terrain=new WorldTerrain(),tile=terrain.get(153,151),bytes=tile.canvas.toBuffer('image/png'),objects=JSON.stringify(tile.objects);
terrain.clear();assert.equal(JSON.stringify(terrain.get(153,151).objects),objects);assert.deepEqual(terrain.get(153,151).canvas.toBuffer('image/png'),bytes);terrain.clear();
console.log('PASS: five pond silhouettes, four irregular hazard contours, Canvas fill matches hits, unchanged tick damage, safe inlets/UI/hostiles/towns/rest, deterministic eviction/regeneration');
