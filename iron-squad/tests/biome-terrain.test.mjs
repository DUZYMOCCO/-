import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {WorldTerrain,WORLD_SIZE,fieldTerrainAt,fieldSpeedFactor,fieldBlocks,biomeTerrainAllowed,biomeAt} from '../js/world.js';
import {terrainCell,biomeKeyAt} from '../js/biome-terrain.js?v=278';
import {medicalPostLayout} from '../js/medical-posts.js';
const C=WORLD_SIZE/2;
assert.equal(biomeKeyAt(C+3199,C),'home');
for(const [key,dx,dy] of [['east',26000,3000],['south',3000,26000],['north',3000,-26000],['west',-26000,3000]]){
 assert.equal(biomeAt(C+dx,C+dy).id,key);
}
let rockCount=0,waterCount=0;
// Flood every open sample from the cell edges: no isolated walkable pockets.
for(let iy=46;iy<58;iy+=2)for(let ix=78;ix<90;ix+=2){
 const features=terrainCell(ix,iy,biomeTerrainAllowed);if(!features.some(f=>f.solid))continue;
 rockCount+=features.length;const n=64,open=new Set(),seen=new Set(),queue=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!fieldBlocks(ix*1024+x*16+8,iy*1024+y*16+8)){const k=y*n+x;open.add(k);if(x===0||y===0||x===n-1||y===n-1){seen.add(k);queue.push(k);}}
 for(let i=0;i<queue.length;i++){const k=queue[i],x=k%n,y=Math.floor(k/n);for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(nx<0||ny<0||nx>=n||ny>=n)continue;const next=ny*n+nx;if(open.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}}}
 assert.equal(seen.size,open.size,`no closed pocket in ${ix},${iy}`);
 for(const f of features){assert.equal(fieldBlocks(f.x,f.y),true);assert.equal(fieldTerrainAt(f.x,f.y),'rock');}
}
assert.ok(rockCount>10);
for(let iy=77;iy<86;iy++)for(let ix=44;ix<53;ix++)for(const f of terrainCell(ix,iy,biomeTerrainAllowed))if(f.kind==='water'){
 waterCount++;assert.equal(fieldSpeedFactor(f.x,f.y),1,'visible boardwalk has no slow');assert.equal(fieldSpeedFactor(f.x,f.y+90),.85);assert.equal(fieldBlocks(f.x,f.y+90),false,'shallow water is traversable');
}
assert.ok(waterCount>10);
const posts=medicalPostLayout();assert.equal(posts.length,22);for(const p of posts)assert.equal(fieldBlocks(p.x,p.y),false,p.id);
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');globalThis.document={createElement:()=>createCanvas(1,1)};
const terrain=new WorldTerrain();
for(const [ix,iy] of [[80,50],[49,80],[80,104],[104,80]]){
 const a=terrain.get(ix,iy),pixels=a.canvas.toBuffer('image/png');terrain.clear();const b=terrain.get(ix,iy);assert.deepEqual(b.canvas.toBuffer('image/png'),pixels,'worker/shared terrain remains deterministic');
}
terrain.clear();console.log('PASS: four biome geometries, visible solid ridges, zero closed pockets, matching water/boardwalk speed, 22 aid posts and deterministic regeneration');
