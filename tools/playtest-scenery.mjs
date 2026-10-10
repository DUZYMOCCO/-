// Disposable browser saves only. Requires the bundled Playwright and local serve.py.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),reports=[],errors=[];
try{
 for(const [width,height,zoom] of [[390,844,1],[1280,900,.65]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  const cases=await page.evaluate(async()=>{
   const {SETTLEMENTS,WORLD_SIZE}=await import('/js/games/iron-squad/world.js?v=165'),C=WORLD_SIZE/2;
   const g=qualityGame;g.stopGameLoop();g.monsters=[];g.updateSpawns=()=>{};
   const props=[];
   for(const [type,x,y] of [['oak',C,C],['pine',C,C-14000]]){
    const tile=g.worldTerrain.get(Math.floor(x/512),Math.floor(y/512));const p=tile.objects.find(o=>o.type===type);if(!p)throw new Error('Missing '+type);props.push({id:type,x:p.x,y:p.y-20});
   }
   for(const type of ['house','ruinwall']){
    const s=SETTLEMENTS.find(s=>s.props.some(p=>p.type===type)),p=s.props.find(p=>p.type===type);
    props.push({id:type,x:C+s.ox+p.dx,y:C+s.oy+p.dy-20});
   }
   props.push({id:'hq-wall',x:C+350,y:C+100});
   const {ECONOMIC_REGIONS}=await import('/js/games/iron-squad/regional-economy.js?v=151');const village=ECONOMIC_REGIONS.find(r=>r.id!=='hq'&&r.kind==='village');
   Object.assign(g.nation.economy.regions[village.id],{discovered:true,liberated:true,level:3});props.push({id:'developed-village',x:village.x,y:village.y});
   window.sceneryMetrics={};
   for(const name of ['update','render','renderMinimap']){const fn=g[name];g[name]=function(...args){const t=performance.now();try{return fn.apply(this,args);}finally{const a=sceneryMetrics[name]||(sceneryMetrics[name]=[]);a.push(performance.now()-t);}};}
   return props;
  });
  for(const site of cases){
   const result=await page.evaluate(async({site,zoom})=>{
    const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.zoom=zoom;g.inBattle=true;g.phaseTimer=100;g.restTimer=0;
    const x=site.x-100,y=site.y;Object.assign(g.player,{x,y,_openX:x,_openY:y,_wallX:x,_wallY:y,_wallSpace:'field',hp:100000,maxHp:100000});Object.assign(g.camera,{x,y});
    g.revealFogAroundPlayer(true);g.render();window.sceneryMetrics={};const generated=g.worldTerrain.generated;
    Object.assign(g.joystick,{active:true,dirX:1,dirY:0});g.startGameLoop();
    const gaps=[];let previous=performance.now();
    for(let i=0;i<90;i++)await new Promise(resolve=>requestAnimationFrame(t=>{gaps.push(t-previous);previous=t;resolve();}));
    g.stopGameLoop();g.joystick.active=false;
    const max=name=>Math.max(0,...(sceneryMetrics[name]||[]));
    return {id:site.id,frames:gaps.length,maxFrameGap:Math.max(...gaps),maxUpdate:max('update'),maxRender:max('render'),maxMinimap:max('renderMinimap'),newTiles:g.worldTerrain.generated-generated,move:g.player.x-x,recovery:!!g._renderProblem,pixels:g.worldTerrain.rasterSize,cache:g.worldTerrain.tiles.size};
   },{site,zoom});reports.push({width,height,zoom,...result});console.log(JSON.stringify(reports.at(-1)));
   if(result.recovery||result.maxFrameGap>2000)throw new Error('Scene stopped: '+site.id);
   if(site.id==='hq-wall'&&result.move>55)throw new Error('Basic commander crossed the solid HQ wall');
  }
  await page.evaluate(()=>{const g=qualityGame;g.currentDungeon=null;Object.assign(g.player,{x:79340,y:79340});Object.assign(g.camera,{x:79340,y:79340});g.zoom=1;g.revealFogAroundPlayer(true);g.render();g.updateStatsUI(true);});
  mkdirSync('docs/previews',{recursive:true});
  if(width===390){await page.screenshot({path:'docs/previews/scenery-mobile-v4.2.16.png'});}
  await context.close();
 }
}finally{await browser.close();mkdirSync('__pycache__',{recursive:true});writeFileSync('__pycache__/scenery-playtest-v4.2.16.json',JSON.stringify({reports,errors},null,2));}
if(errors.length)throw new Error(errors.join('\n'));
console.log('PASS: oak/pine/house/ruined wall/HQ wall/developed village, live update/render/minimap, no 2-second stall or JS error');
