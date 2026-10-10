// Real software Canvas + DOM lifecycle. No browser, real saves or live pixels.
// node tests/canvas-lifecycle.test.mjs [jsdom-directory] [canvas-packages-directory]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
const { JSDOM } = createRequire(resolve(process.argv[2] || '__pycache__/ui-tools', 'entry.cjs'))('jsdom');
const { createCanvas } = createRequire(resolve(process.argv[3] || 'C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules', 'entry.cjs'))('@napi-rs/canvas');
const dom = new JSDOM('<div id="game" class="game-container"></div>', {url:'http://localhost/'});
Object.assign(globalThis, { document:dom.window.document, window:dom.window, localStorage:dom.window.localStorage });
const backing = new WeakMap(), allocated = new Set(), proto = window.HTMLCanvasElement.prototype;
for (const key of ['width','height']) {
  const descriptor = Object.getOwnPropertyDescriptor(proto,key);
  Object.defineProperty(proto,key,{...descriptor,set(value){descriptor.set.call(this,value); if(backing.has(this))backing.get(this)[key]=value;}});
}
proto.getContext = function() {
  if (!backing.has(this)) {
    const canvas = createCanvas(this.width,this.height), context = canvas.getContext('2d'), drawImage = context.drawImage.bind(context);
    context.drawImage = (source,...args) => drawImage(backing.get(source) || source,...args);
    backing.set(this,canvas); allocated.add(canvas); // Deliberately defer GC, as on memory-limited devices.
  }
  return backing.get(this).getContext('2d');
};
let queue = new Map(), next = 1;
globalThis.requestAnimationFrame = callback => {const id=next++;queue.set(id,callback);return id;};
globalThis.cancelAnimationFrame = id => queue.delete(id);
let view = {width:390,height:774};
const { IronSquadGame } = await import('../js/games/iron-squad/index.js');
const { WorldTerrain } = await import('../js/games/iron-squad/world.js');
const { FogGrid } = await import('../js/games/iron-squad/fog.js');
const game = Object.create(IronSquadGame); game.init(document.getElementById('game'),()=>{});
game.canvasContainer.getBoundingClientRect = () => view; game.resizeCanvas();
const frame = () => {
  const [id,callback] = queue.entries().next().value || [];
  assert.ok(callback,'an active lifecycle schedules a frame'); queue.delete(id); callback(performance.now()+16);
};
const visiblePixels = () => {
  const canvas = backing.get(game.canvas), pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let visible=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>24 && pixels[i+3]>240)visible++;
  return visible / (pixels.length/4);
};
const visibleField = message => assert.ok(visiblePixels()>.75,`${message}: terrain must be visible, not just transparent/black pixels`);
document.querySelector('#new-expedition-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
visibleField('synchronous New Game first paint');
frame(); visibleField('New Game'); assert.equal(game.running,true);
game.showSaveMenu(); document.querySelector('[data-slot-id]').click(); frame(); visibleField('saved-game selection');
game.openStrategyModal(true); frame(); game.closeStrategyModal(); frame(); visibleField('return from command panel');
game.openWorldMap(); frame(); document.getElementById('btn-world-map-close').click(); frame(); visibleField('return from map');
for(const time of [0,240,460]) { game.worldTime=time; game.render(); visibleField(`day/night ${time}`); }
game.fog.bytes.fill(0); game.fog._exploredHint=false; game.fog._campSeeded=false; game.render(); visibleField('empty exploration save');
game.ctx.setTransform(0,0,0,0,0,0); game.ctx.globalAlpha=0; game.ctx.globalCompositeOperation='destination-out';
game.render(); visibleField('reset leaked drawing state');
const oldVignette=game.vigCache; oldVignette.getContext('2d').isContextLost=()=>true;
game.render(); visibleField('lost cached vignette'); assert.equal(oldVignette.width,1); assert.notEqual(game.vigCache,oldVignette);
game.camera={x:NaN,y:Infinity}; game.render(); visibleField('invalid camera');
const position={x:game.player.x,y:game.player.y};
game.player.x=game.camera.x=1e9; game.player.y=game.camera.y=-1e9;
game.restTimer=4; game.render(); visibleField('out-of-world saved position during rest');
Object.assign(game.player,position); game.camera={...position}; game.restTimer=0;
view={width:844,height:320}; Object.defineProperty(window,'devicePixelRatio',{value:3,configurable:true});
game.resizeCanvas(); frame(); visibleField('rotation / DPR 3'); assert.equal(game.canvas.width,1688,'DPR remains capped at 2');
// A genuinely empty canvas followed by an update exception previously remained black.
game.canvas.width=game.canvas.width;
const update=game.update; game.update=()=>{throw new Error('injected update failure');};
const log=console.error;console.error=()=>{};
game.startGameLoop(); frame(); console.error=log;
visibleField('first frame before update failure'); assert.equal(game.running,false);
assert.equal(document.getElementById('field-recovery').classList.contains('hidden'),false);
assert.equal(game._renderProblem.stage,'update'); game.update=update;
document.getElementById('btn-recover-field').click(); frame(); visibleField('manual surface recovery'); assert.equal(game.running,true);
const lost=new window.Event('contextlost',{cancelable:true}); game.canvas.dispatchEvent(lost);
assert.equal(lost.defaultPrevented,true); assert.equal(game.running,false); assert.equal(game.inBattle,false);
game.canvas.dispatchEvent(new window.Event('contextrestored')); frame(); visibleField('restored Canvas event'); assert.equal(game.inBattle,true);
game.openStrategyModal(true); frame(); game.canvas.dispatchEvent(new window.Event('contextlost',{cancelable:true}));
game.canvas.dispatchEvent(new window.Event('contextrestored')); frame();
assert.equal(game.inBattle,false,'restoring the surface must not resume combat behind a dialog');
game.closeStrategyModal(); frame(); visibleField('close command panel after context restoration');
const terrain=new WorldTerrain(), retired=[];
const allocatedBytes=()=>[...allocated].reduce((sum,canvas)=>sum+canvas.width*canvas.height*4,0);
const beforeTiles=allocatedBytes();
for(let y=0;y<6;y++)for(let x=0;x<6;x++)retired.push(terrain.get(x,y).canvas);
assert.equal(new Set(retired).size,24,'travel reuses 24 tile surfaces without allocating more while GC is deferred');
assert.ok(allocatedBytes()-beforeTiles<24*1024*1024+100000,'tile surfaces stay bounded even when GC is deferred');
terrain.clear(); assert.ok(retired.every(canvas=>canvas.width===1&&canvas.height===1));
// Unexplored cells are black again, while explored cells and the hero stay visible.
const fog=new FogGrid(), canvas=createCanvas(1400,1400), context=canvas.getContext('2d');
context.fillStyle='#a8b990'; context.fillRect(0,0,1400,1400); fog.mark(155,155);
context.translate(700-79360,700-79360); fog.drawFieldOverlay(context,{x:79360,y:79360},1400,1400,1);
const corner=context.getImageData(0,0,1,1).data;assert.deepEqual([...corner],[0,0,0,255],'unexplored edge is truly hidden');
const known=context.getImageData(900,900,1,1).data;assert.ok(known[0]+known[1]+known[2]>100,'explored terrain stays visible');
const exploration=fog.serialize(),restoredFog=new FogGrid();assert.equal(restoredFog.deserialize(exploration),true);assert.equal(restoredFog.serialize(),exploration,'fog appearance does not alter saved exploration');
context.resetTransform();context.fillStyle='#a8b990';context.fillRect(0,0,1400,1400);context.translate(700-90000,700-90000);
restoredFog.drawFieldOverlay(context,{x:90000,y:90000},1400,1400,1,90000,90000);assert.equal(restoredFog.isExploredWorld(90000,90000),true);const heroPixel=context.getImageData(700,700,1,1).data;assert.ok(heroPixel[0]+heroPixel[1]+heroPixel[2]>100,'teleport/missing player reveal cannot hide the hero');
if(process.env.CANVAS_REVIEW_DIR){mkdirSync(process.env.CANVAS_REVIEW_DIR,{recursive:true});writeFileSync(resolve(process.env.CANVAS_REVIEW_DIR,'field.png'),backing.get(game.canvas).toBuffer('image/png'));}
// A startup error must never be written to an already-hidden save menu.
game.showSaveMenu(); const fresh=game.startFreshGame;
game.startFreshGame=()=>{throw new Error('injected initialization failure');}; console.error=()=>{};
document.querySelector('#new-expedition-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})); console.error=log;
assert.equal(document.getElementById('save-menu').classList.contains('hidden'),false);
assert.match(document.getElementById('save-start-error').textContent,/injected initialization failure/); assert.equal(game.running,false);
game.startFreshGame=fresh; assert.equal(game.selectSaveSlot(game.activeSlotId),true); visibleField('retry initialized New Game'); frame();
// Real wide field render also applies the mask without a full-screen blackout.
view={width:1400,height:1400};Object.defineProperty(window,'devicePixelRatio',{value:1,configurable:true});game.resizeCanvas();game.zoom=.65;Object.assign(game.player,{x:95000,y:95000});game.camera={x:95000,y:95000};game.fog=new FogGrid();game.revealFogAroundPlayer(true);game.render();
const fieldContext=backing.get(game.canvas).getContext('2d'),unknownPixel=fieldContext.getImageData(0,0,1,1).data,centerPixel=fieldContext.getImageData(700,700,1,1).data;
assert.ok(unknownPixel[0]+unknownPixel[1]+unknownPixel[2]<24,'actual field hides unknown corners');assert.ok(centerPixel[0]+centerPixel[1]+centerPixel[2]>24,'actual field keeps the commander visible');assert.ok(visiblePixels()>.3,'fog must not cover the full field');
if(process.env.CANVAS_REVIEW_DIR)writeFileSync(resolve(process.env.CANVAS_REVIEW_DIR,'fog-restored-v2.7.3.png'),backing.get(game.canvas).toBuffer('image/png'));
game.destroy(); assert.equal(game.worldTerrain,null); assert.equal(game.vigCache,null); dom.window.close();
console.log('PASS: real Canvas pixels for new/resumed games, dialogs, fog, day/night, rotation, state reset, failure-before-first-update, recovery, context events and released tile buffers');
