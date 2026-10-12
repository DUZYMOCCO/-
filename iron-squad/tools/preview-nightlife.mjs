// Real game scene + software Canvas. Works without a browser or network permissions.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {JSDOM}=createRequire(`${process.cwd()}/__pycache__/ui-tools/entry.cjs`)('jsdom');
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Yu Gothic');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','sans-serif');
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{document:dom.window.document,window:dom.window,localStorage:dom.window.localStorage});
const backing=new WeakMap(),proto=window.HTMLCanvasElement.prototype;
for(const key of ['width','height']){
  const descriptor=Object.getOwnPropertyDescriptor(proto,key);
  Object.defineProperty(proto,key,{...descriptor,set(value){descriptor.set.call(this,value);if(backing.has(this))backing.get(this)[key]=value;}});
}
proto.getContext=function(){
  if(!backing.has(this)){
    const canvas=createCanvas(this.width,this.height),context=canvas.getContext('2d'),draw=context.drawImage.bind(context);
    context.drawImage=(source,...args)=>draw(backing.get(source)||source,...args);backing.set(this,canvas);
  }
  return backing.get(this).getContext('2d');
};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
// Keep unrelated flame/actor animations identical when comparing the light pass.
Object.defineProperty(performance,'now',{value:()=>1200,configurable:true});
const {IronSquadGame}=await import('../js/index.js');
const {HEADQUARTERS_FACILITIES}=await import('../js/hq-facilities.js?v=207');
const {FIELD_TAVERN,ensureTavernRoster}=await import('../js/tavern.js?v=207');
const {normalizeNation}=await import('../js/nation-rules.js?v=201');
const {refreshCampQuiet,assignCampSeats}=await import('../js/camp-leisure.js?v=202');
const {daylightAt}=await import('../js/day-night.js?v=197');
const {drawCasinoSign,drawTavernFixtures,drawNightlifeLights}=await import('../js/nightlife-visuals.js?v=207');
const out='iron-squad/docs/previews/nightlife-20261012';mkdirSync(out,{recursive:true});
const report={renderer:'real IronSquadGame scene with @napi-rs/canvas and JSDOM; browser not verified',scenes:[],checks:{}};
const game=Object.create(IronSquadGame);game.init(document.getElementById('game'),()=>{});
let view={width:390,height:700};game.canvasContainer.getBoundingClientRect=()=>view;
document.querySelector('#new-expedition-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));document.querySelector('#btn-commander-confirm').click();
game.stopGameLoop();game.closeStrategyModal();game.monsters=[];game.restTimer=0;game.phaseTimer=200;game.inBattle=true;game.screenShake=0;game.currentQuest=null;game.updateSpawns=()=>{};
ensureTavernRoster(game);
const casino=HEADQUARTERS_FACILITIES.find(p=>p.id==='casino'),sites={casino,tavern:FIELD_TAVERN};
try{
  for(const [width,height,zoom]of [[390,700,1],[844,340,.85],[1080,700,1.6]]){
    view={width,height};game.resizeCanvas();
    for(const [name,site]of Object.entries(sites))for(const [period,time]of [['day',120],['night',300]]){
      game.worldTime=time;game.zoom=zoom;Object.assign(game.player,{x:site.x,y:site.y+80});game.camera={x:site.x,y:site.y-(name==='casino'?55:5)};
      game.revealFogAroundPlayer(true);game.render();assert.ok(!game._renderProblem);
      const lights=game.drawNightLights;game.drawNightLights=()=>{};game.render();
      const unlit=game.ctx.getImageData(0,0,game.canvas.width,game.canvas.height).data;
      game.drawNightLights=lights;game.render();const lit=game.ctx.getImageData(0,0,game.canvas.width,game.canvas.height).data;
      let changed=0;for(let i=0;i<lit.length;i+=4)if(lit[i]>unlit[i]+8||lit[i+1]>unlit[i+1]+8||lit[i+2]>unlit[i+2]+8)changed++;
      if(period==='day')assert.equal(changed,0);else assert.ok(changed>1000);
      const filename=`canvas-${name}-${period}-${width}.png`;writeFileSync(`${out}/${filename}`,backing.get(game.canvas).toBuffer('image/png'));
      report.scenes.push({name,period,width,height,zoom,changed,filename});
    }
  }
  game.nation=normalizeNation({...game.nation,investment:45000});view={width:800,height:850};game.resizeCanvas();game.zoom=1.3;game.worldTime=300;
  game.invasions.stage='idle';game.baseRaidActive=false;game.commandActiveUntil=0;
  refreshCampQuiet(game,performance.now());assignCampSeats(game,game.squad);
  for(const s of game.squad){const p=s._leisureSeat;if(p)Object.assign(s,{x:p.x,y:p.y,campPose:p.pose,facingAngle:p.facing});}
  Object.assign(game.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+75});game.camera={x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+95};game.revealFogAroundPlayer(true);game.render();
  writeFileSync(`${out}/canvas-tavern-garden-night.png`,backing.get(game.canvas).toBuffer('image/png'));
  const surface=createCanvas(600,600),c=surface.getContext('2d');
  const render=(time)=>{c.clearRect(0,0,600,600);c.save();c.translate(300,300);drawCasinoSign(c,170,110,time,1,true);drawTavernFixtures(c,time,1,true);c.restore();return c.getImageData(0,0,600,600).data;};
  const first=render(0),next=render(600);let changed=0;for(let i=0;i<first.length;i++)if(first[i]!==next[i])changed++;assert.ok(changed>100);
  c.clearRect(0,0,600,600);drawNightlifeLights(c,{...game,currentDungeon:{id:'town'}},1000,1,{left:0,right:1e6,top:0,bottom:1e6});assert.ok(!c.getImageData(0,0,600,600).data.some(v=>v!==0));
  report.checks.animation={changed,dungeonUnchanged:true,fade:[120,240,243,300,470,480].map(t=>({time:t,strength:daylightAt(t).nightLight}))};
  for(const [name,site]of Object.entries(sites)){
    Object.assign(game.player,{x:site.x,y:site.y+22});game.update(.01);
    if(name==='casino'){document.getElementById('btn-hq-facility').click();assert.ok(document.getElementById('hq-facility-dialog'));document.getElementById('btn-hq-facility-close').click();}
    else{document.getElementById('btn-field-tavern').click();assert.ok(document.getElementById('tavern-dialog'));document.getElementById('btn-tavern-close').click();}
  }
  report.checks.facilityEntrances=true;
  game.worldTime=300;Object.assign(game.player,{x:95000,y:95000});game.camera={x:95000,y:95000};game.zoom=.65;
  game.fog.bytes.fill(0);game.fog._campSeeded=true;game.fog._exploredHint=false;game.revealFogAroundPlayer(true);
  game.width=game.height=1400;game.canvas.width=game.canvas.height=1400;
  const drawField=game.drawBattlefield;game.drawBattlefield=function(c,t){drawField.call(this,c,t);this.worldObjs.push({type:'torch',x:94000,y:94000,ph:1});};
  game.render();report.checks.fogPixel=Array.from(game.ctx.getImageData(50,50,1,1).data);game.drawBattlefield=drawField;assert.deepEqual(report.checks.fogPixel,[0,0,0,255]);
  console.log(JSON.stringify(report.checks));
}catch(error){report.failure=error.stack;throw error;}
finally{writeFileSync(`${out}/canvas-validation.json`,JSON.stringify(report,null,2));game.destroy();dom.window.close();}
