// Disposable in-memory save; real rendering, facility interaction and offline cache checks.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/nightlife-20261012',base=process.argv[2]||'http://127.0.0.1:8001';
mkdirSync(out,{recursive:true});
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'];
const report={version:release.gameVersion,errors:[],scenes:[],checks:{}},browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    window.g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.updateSpawns=()=>{};
    Object.defineProperty(performance,'now',{value:()=>1200,configurable:true});
    g.restTimer=0;g.phaseTimer=200;g.inBattle=true;g.currentQuest=null;g.screenShake=0;
    window.casino=(await import('/iron-squad/js/hq-facilities.js?v=277')).HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');
    const tavern=await import('/iron-squad/js/tavern.js?v=277');window.tavern=tavern.FIELD_TAVERN;tavern.ensureTavernRoster(g);
  });
  for(const [width,height]of [[390,844],[844,390],[1280,800]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
    for(const name of ['casino','tavern'])for(const [period,time]of [['day',120],['night',300]]){
      const check=await page.evaluate(({name,time})=>{
        const site=window[name];g.worldTime=time;g.zoom=innerWidth>1000?1.6:innerWidth>600?.85:1;
        Object.assign(g.player,{x:site.x,y:site.y+75});g.camera={x:site.x,y:site.y-(name==='casino'?70:20)};
        g.revealFogAroundPlayer(true);g.resizeCanvas();g.updateStatsUI(true);g.render();
        const lights=g.drawNightLights;g.drawNightLights=()=>{};g.render();const unlit=g.ctx.getImageData(0,0,g.canvas.width,g.canvas.height).data;
        g.drawNightLights=lights;g.render();const lit=g.ctx.getImageData(0,0,g.canvas.width,g.canvas.height).data;
        let changed=0;for(let i=0;i<lit.length;i+=4)if(lit[i]>unlit[i]+8||lit[i+1]>unlit[i+1]+8||lit[i+2]>unlit[i+2]+8)changed++;
        return {changed,recovery:g._renderProblem||null,overflow:document.documentElement.scrollWidth-innerWidth};
      },{name,time});
      assert.equal(check.recovery,null);assert.ok(check.overflow<=1);
      if(period==='night')assert.ok(check.changed>1000);else assert.equal(check.changed,0);
      const filename=`${name}-${period}-${width}.png`;await page.screenshot({path:`${out}/${filename}`});report.scenes.push({name,period,width,height,filename,...check});
    }
  }
  report.checks.animation=await page.evaluate(async()=>{
    const {drawCasinoSign,drawTavernFixtures,drawNightlifeLights}=await import('/iron-squad/js/nightlife-visuals.js?v=277');
    const surface=document.createElement('canvas');surface.width=600;surface.height=600;const c=surface.getContext('2d');
    const render=(time)=>{c.clearRect(0,0,600,600);c.save();c.translate(300,300);drawCasinoSign(c,170,110,time,1,true);drawTavernFixtures(c,time,1,true);c.restore();return c.getImageData(0,0,600,600).data;};
    const first=render(0),next=render(600);let changed=0;for(let i=0;i<first.length;i++)if(first[i]!==next[i])changed++;
    c.clearRect(0,0,600,600);drawNightlifeLights(c,{...g,currentDungeon:{id:'town'}},1000,1,{left:0,right:1e6,top:0,bottom:1e6});
    const dungeonPixels=c.getImageData(0,0,600,600).data.some(v=>v!==0);
    // Existing world clock owns both dusk fade and dawn extinction.
    const {daylightAt}=await import('/iron-squad/js/day-night.js?v=197');
    return {changed,dungeonPixels,fade:[120,240,243,300,470,480].map(t=>({time:t,strength:daylightAt(t).nightLight}))};
  });
  assert.ok(report.checks.animation.changed>100);assert.equal(report.checks.animation.dungeonPixels,false);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
  for(const name of ['casino','tavern']){
    await page.evaluate(name=>{const site=window[name];g.worldTime=300;Object.assign(g.player,{x:site.x,y:site.y+22});g.update(.01);g.updateStatsUI(true);},name);
    await page.click(name==='casino'?'#btn-hq-facility':'#btn-field-tavern');
    assert.equal(await page.locator(name==='casino'?'#hq-facility-dialog':'#tavern-dialog').count(),1);
    await page.click(name==='casino'?'#btn-hq-facility-close':'#btn-tavern-close');
  }
  report.checks.facilityEntrances=true;
  // Move to an unexplored region, insert a light, then run the normal fog pipeline.
  report.checks.fog=await page.evaluate(()=>{
    g.worldTime=300;Object.assign(g.player,{x:95000,y:95000});g.camera={x:95000,y:95000};g.zoom=.65;
    g.fog.bytes.fill(0);g.fog._campSeeded=true;g.fog._exploredHint=false;g.revealFogAroundPlayer(true);
    g.width=g.height=1400;g.canvas.width=g.canvas.height=1400;
    const drawField=g.drawBattlefield;g.drawBattlefield=function(c,t){drawField.call(this,c,t);this.worldObjs.push({type:'torch',x:94000,y:94000,ph:1});};
    g.render();const pixel=Array.from(g.ctx.getImageData(50,50,1,1).data);g.drawBattlefield=drawField;g.resizeCanvas();
    return pixel;
  });assert.deepEqual(report.checks.fog,[0,0,0,255]);
  await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
  await tab.goto(base);await tab.waitForFunction(()=>navigator.serviceWorker.controller);
  const cached=await tab.evaluate(async({cache,files})=>{
    const expected=files.map(f=>new URL(`/iron-squad/${f}`,location.origin).href);
    const entries=await(await caches.open(cache)).keys();return expected.filter(url=>!entries.some(e=>e.url===url));
  },{cache:`game-iron-squad-${release.version}`,files:release.files});assert.deepEqual(cached,[]);
  await offline.setOffline(true);
  await tab.reload();await tab.click('[data-game-id="iron-squad"]');
  await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');
  await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  const offlineResult=await tab.evaluate(async()=>{
    const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();g.worldTime=300;
    const site=(await import('/iron-squad/js/hq-facilities.js?v=277')).HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');
    Object.assign(g.player,{x:site.x,y:site.y+50});g.camera={x:site.x,y:site.y-50};g.revealFogAroundPlayer(true);g.render();
    return {moduleLoaded:true,recovery:g._renderProblem||null};
  });assert.equal(offlineResult.recovery,null);report.checks.offline=offlineResult;
  await tab.screenshot({path:`${out}/casino-offline-390.png`});await offline.close();assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report.checks));
}catch(error){report.failure=error.stack;throw error;}
finally{await browser.close();writeFileSync(`${out}/validation.json`,JSON.stringify(report,null,2));}
