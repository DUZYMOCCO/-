import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {lightVisibilityPolygon,drawSceneDarkness,sceneLightSources} from '../js/scene-lighting.js';
import {releaseSceneCaches} from '../js/canvas-surface.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};

// A wall one cell thick must block the bright floor on its far side.
const layout={width:280,height:280,cols:7,rows:7,floor:new Uint8Array(49),solids:[{x:160,y:40,w:40,h:200}]};
for(let y=1;y<6;y++)for(let x=1;x<6;x++)if(x!==4)layout.floor[y*7+x]=1;
const polygon=lightVisibilityPolygon(layout,{id:'test-light',x:100,y:140,radius:230}),surface=createCanvas(280,280),c=surface.getContext('2d');
c.fillStyle='#fff';c.beginPath();polygon.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();
assert.ok(c.getImageData(140,140,1,1).data[3]>240,'near-side floor sees the lantern');
assert.equal(c.getImageData(220,140,1,1).data[3],0,'the light cannot reveal floor behind a thin wall');
assert.ok(polygon.some(p=>p.x>160&&p.x<185),'only the wall face receives a small light margin');
assert.equal(lightVisibilityPolygon(layout,{id:'invalid-source',x:180,y:140,radius:200}).length,0,'a light inside a solid cannot reveal rooms');

const game={width:700,height:500,zoom:1,camera:{x:350,y:250},player:{x:350,y:250},worldTime:120,worldObjs:[],currentDungeon:{kind:'dungeon',theme:'dragon',width:1600,height:500}};
const scene=createCanvas(700,500),ctx=scene.getContext('2d');
const sample=()=>{ctx.fillStyle='#808080';ctx.fillRect(0,0,700,500);drawSceneDarkness(ctx,game,1200);return {near:[...ctx.getImageData(350,250,1,1).data],far:[...ctx.getImageData(650,250,1,1).data]};};
const day=sample(),mask=game._lightingMask;game.worldTime=300;assert.deepEqual(sample(),day,'caves stay dark independently of the outdoor clock');
assert.ok(day.near[0]>100&&day.far[0]<8,`only the lantern radius reveals the floor: ${JSON.stringify(day)}`);
assert.equal(game._lightingMask,mask,'frames reuse the same bounded darkness canvas');
assert.ok(mask.width<=900&&mask.height<=900);
game.player.x+=30;assert.equal(sceneLightSources(game)[0].x,380,'the lantern follows movement without persisting extra state');
game.width=844;game.height=390;drawSceneDarkness(ctx,game);assert.equal(game._lightingMask,mask,'rotation reuses the lighting surface');
releaseSceneCaches(game);assert.equal(game._lightingMask,null);assert.deepEqual([mask.width,mask.height],[1,1],'scene teardown releases lighting pixels');
game.currentDungeon=null;game.worldTime=120;assert.deepEqual(sceneLightSources(game),[],'daytime has no active lantern or nightlife light');
console.log('PASS: wall occlusion and lit wall faces, no light inside solids, near/far cave pixels, clock independence, carried lantern, bounded mask reuse/rotation/release, daylight extinction');
