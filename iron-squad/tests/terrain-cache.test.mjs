import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {WorldTerrain,WORLD_SIZE} from '../js/world.js';
const {createCanvas}=createRequire(resolve(process.argv[2]||'C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');
const allocated=[];globalThis.document={createElement:()=>{const c=createCanvas(1,1);allocated.push(c);return c;}};
const pixelBudget=24*512*512,bytes=()=>allocated.reduce((n,c)=>n+c.width*c.height*4,0);
const terrain=new WorldTerrain(),center=WORLD_SIZE/2;
const view=createCanvas(1,1).getContext('2d');
let camera={x:center,y:center};
const draw=(w=1280,h=900,z=.65)=>terrain.draw(view,camera,w,h,z);
const objects=JSON.stringify(draw()),generated=terrain.generated;
draw();assert.equal(terrain.generated,generated,'a stationary wide view must reuse every ground tile');
assert.equal(JSON.stringify(draw()),objects,'ground resolution does not change any scenery coordinates or density');
camera.x+=1;draw();assert.equal(terrain.generated,generated,'subpixel camera movement does not rebuild the whole view');
camera.x+=512;const beforeMove=terrain.generated;draw();
assert.ok(terrain.generated-beforeMove>0&&terrain.generated-beforeMove<=6,'crossing a tile boundary builds only the incoming strip');
assert.ok(bytes()<=pixelBudget*4+allocated.length*4,'all tile canvases stay within 24 MiB, including retired surfaces');
draw(1400,1400,.65);const wider=terrain.generated;draw(1400,1400,.65);
assert.equal(terrain.generated,wider,'a still larger view has no cache thrash');
assert.ok(bytes()<=pixelBudget*4+allocated.length*4);
draw(390,844,1);assert.equal(terrain.rasterSize,512,'returning to a phone view restores full ground resolution');
terrain.clear();assert.ok(allocated.every(c=>c.width===1&&c.height===1),'clear releases every retained pixel surface');
// Repainting a recycled surface must match freshly generated pixels, not retain
// the previous tile's strokes, alpha or content.
const original=terrain.get(141,156),expectedPixels=original.canvas.toBuffer('image/png'),expectedObjects=JSON.stringify(original.objects);
for(let i=0;i<35;i++)terrain.get(150+i,180);
const reused=terrain.get(141,156);
assert.equal(JSON.stringify(reused.objects),expectedObjects);
assert.deepEqual(reused.canvas.toBuffer('image/png'),expectedPixels,'recycled terrain is pixel-identical');
const freshCanvas=reused.canvas;reused.context.isContextLost=()=>true;
const recovered=terrain.get(141,156);assert.notEqual(recovered.canvas,freshCanvas);assert.equal(freshCanvas.width,1);
assert.deepEqual(recovered.canvas.toBuffer('image/png'),expectedPixels,'a lost cached context regenerates intact ground');
terrain.clear();
// A late prefetch must not revive a cleared cache or evict a visible ground tile.
let controlled,closed=0;
globalThis.OffscreenCanvas=function(){};
globalThis.Worker=class{constructor(){controlled=this;this.messages=[];}postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}};
try{
  const ahead=new WorldTerrain();ahead.requestTile(145,150);const worker=controlled,job=worker.messages[0];
  ahead.clear();const bitmap=createCanvas(512,512);bitmap.close=()=>{closed++;bitmap.width=bitmap.height=1;};
  worker.onmessage({data:{...job,bitmap,objects:[],camps:[]}});
  assert.equal(ahead.tiles.size,0);assert.equal(closed,1);assert.equal(worker.terminated,true);
  for(let x=120;x<144;x++)ahead.get(x,150);
  ahead._visibleTileBounds={minX:120,maxX:143,minY:150,maxY:150};
  const keys=[...ahead.tiles.keys()];ahead.requestTile(145,150);const freshJob=controlled.messages[0],incoming=createCanvas(512,512);incoming.close=()=>{closed++;incoming.width=incoming.height=1;};
  controlled.onmessage({data:{...freshJob,bitmap:incoming,objects:[],camps:[]}});
  assert.deepEqual([...ahead.tiles.keys()],keys,'prefetch never evicts any protected visible tile');assert.equal(closed,2);
  ahead.clear();for(let i=0;i<12;i++)ahead.requestTile(120+i,160);
  assert.equal(ahead._pendingTerrain.size,8,'worker queue stays bounded');
  controlled.onerror();assert.equal(ahead._pendingTerrain.size,0);assert.ok(ahead.get(145,150).canvas,'failed worker falls back to ordinary generation');ahead.clear();
}finally{delete globalThis.Worker;delete globalThis.OffscreenCanvas;}
console.log('PASS: wide-view reuse, moving-strip generation, 24 MiB budget, phone resolution, identical recycled pixels, lost-context recovery');
