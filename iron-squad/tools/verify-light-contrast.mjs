// Real Chrome scene snapshots, wall/visibility pixels, movement, cache and offline checks.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const base=process.argv[2]||'http://127.0.0.1:8002',stage=process.argv[3]||'after',out='iron-squad/docs/previews/lighting-20261012';mkdirSync(out,{recursive:true});
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'],report={stage,version:release.gameVersion,errors:[],scenes:[],checks:{}};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{
    window.g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.updateSpawns=()=>{};g.currentQuest=null;g.restTimer=0;g.phaseTimer=300;g.inBattle=true;g.screenShake=0;
    Object.defineProperty(performance,'now',{value:()=>2400,configurable:true});
  });
  const scenes=[['mines','dungeon_goblin_mines',120],['catacombs','dungeon_undead_catacombs',120],...(stage==='after'?[['dragon','dungeon_dragon_lair',120],['demon','dungeon_demon_castle',120]]:[]),['night-field',null,300],['night-casino',null,300],['night-tavern',null,300],['day-field',null,120],['town-night','royal_castle_town',300]];
  for(const [width,height]of [[390,844],[844,390],[1280,800]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(80);
    for(const [name,id,time]of scenes){
      const result=await page.evaluate(async({name,id,time})=>{
        if(g.currentDungeon)g.exitDungeon();g.stopGameLoop();g.monsters=[];g.restTimer=0;g.worldTime=time;g.zoom=innerWidth>1000?1.4:innerWidth>600?.9:1;
        let x=79360,y=79360;
        if(id){
          const d=g.dungeons.find(d=>d.id===id)||g.dungeons.find(d=>d.theme===name);if(!d)throw Error(`Missing dungeon ${id}`);
          // Approach the real field entrance before entering so a previous teleported town scene
          // does not leave a merchant prompt in the screenshot of an unrelated underground room.
          Object.assign(g.player,{x:d.entrance.x,y:d.entrance.y});g.checkMerchantProximity();
          g.enterDungeon(d);g.stopGameLoop();g.monsters=[];x=name==='town-night'?230:640;y=d.height/2;
        }
        else{
          const {WORLD_SIZE,TAVERN_SITE}=await import('/iron-squad/js/world.js?v=198');x=y=WORLD_SIZE/2;
          if(name==='night-field'||name==='day-field'){x+=1100;y+=160;}
          if(name==='night-casino'){x+=190;y+=255;}
          if(name==='night-tavern'){x=TAVERN_SITE.x;y=TAVERN_SITE.y;}
        }
        Object.assign(g.player,{x,y});g.update(.001);g.worldTime=time;g.camera={x,y:y-(name==='night-casino'?65:20)};g.resizeCanvas();g.revealFogAroundPlayer(true);g.updateStatsUI(true);g.render();
        return {dungeon:g.currentDungeon?.id||null,recovery:g._renderProblem||null,overflow:document.documentElement.scrollWidth-innerWidth};
      },{name,id,time});assert.equal(result.recovery,null);assert.ok(result.overflow<=1);
      const filename=`${stage}-${name}-${width}.png`;await page.screenshot({path:`${out}/${filename}`});report.scenes.push({name,width,height,filename,...result});
    }
  }
  if(stage==='before'){console.log('Captured baseline browser scenes.');await context.close();}
  else{
    report.checks.cave=await page.evaluate(async()=>{
      if(g.currentDungeon)g.exitDungeon();g.restTimer=0;g.enterDungeon(g.dungeons.find(d=>d.theme==='mines'));g.stopGameLoop();g.monsters=[];g.zoom=1;
      Object.assign(g.player,{x:1000,y:g.currentDungeon.height/2});g.camera={x:g.player.x,y:g.player.y};g.resizeCanvas();g.worldTime=120;
      const lighting=await import('/iron-squad/js/scene-lighting.js?v=208');
      const surface=document.createElement('canvas');surface.width=700;surface.height=500;const c=surface.getContext('2d');
      // Isolate the real illumination on a neutral floor to measure range without unrelated art.
      const probe={...g,width:700,height:500,camera:{x:g.player.x,y:g.player.y},worldObjs:[],_lightingMask:null};
      const sample=(time,player)=>{probe.worldTime=time;probe.player={...g.player,...player};c.fillStyle='#808080';c.fillRect(0,0,700,500);lighting.drawSceneDarkness(c,probe,2400);return {near:Array.from(c.getImageData(350,250,1,1).data),far:Array.from(c.getImageData(650,250,1,1).data)};};
      const day=sample(120),night=sample(300);
      const oldPlayer={x:g.player.x,y:g.player.y},start=g.player.x;g.inBattle=true;g.joystick.active=true;g.joystick.dirX=1;g.joystick.dirY=0;
      for(let i=0;i<12;i++)g.update(1/60);g.joystick.active=false;g.camera={x:g.player.x,y:g.player.y};g.render();
      const sources=lighting.sceneLightSources(g,2400);return {day,night,moved:g.player.x-start,lantern:sources.find(l=>l.id==='player-lantern'),player:{x:g.player.x,y:g.player.y},oldPlayer};
    });
    assert.ok(report.checks.cave.day.near[0]>60);assert.ok(report.checks.cave.day.far[0]<12);
    assert.deepEqual(report.checks.cave.day,report.checks.cave.night);assert.ok(report.checks.cave.moved>0);
    assert.equal(report.checks.cave.lantern.x,report.checks.cave.player.x);assert.equal(report.checks.cave.lantern.y,report.checks.cave.player.y);
    report.checks.mask=await page.evaluate(()=>{
      const original=g.player.x,start=Date.now();for(let i=0;i<30;i++){g.player.x=original+i*.2;g.render();}const ms=Date.now()-start;g.player.x=original;g.render();
      return {movingRenderMeanMs:ms/30,maskPixels:g._lightingMask.width*g._lightingMask.height,canvasPixels:g.canvas.width*g.canvas.height,renderer:'desktop Chrome; not iPhone'};
    });
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(80);
    await page.evaluate(()=>{g.camera={x:g.player.x,y:g.player.y};g.resizeCanvas();g.render();});await page.screenshot({path:`${out}/after-cave-moving-844.png`});
    const saved=await page.evaluate(()=>{
      const time=g.worldTime,d=g.currentDungeon.id,gold=g.gold,data=g.saveGame();g.resumeSavedGame(structuredClone(data));g.stopGameLoop();
      const fieldPositionRestored=g.player.x===data.player.x&&g.player.y===data.player.y&&!g.currentDungeon;
      const sameClock=g.worldTime===time,sameGold=g.gold===gold,noLightingInSave=!Object.keys(data).some(k=>/lighting|lantern/i.test(k));
      g.restTimer=0;g.enterDungeon(g.dungeons.find(p=>p.id===d));g.stopGameLoop();g.camera={x:g.player.x,y:g.player.y};g.render();
      return {fieldPositionRestored,sameClock,sameGold,noLightingInSave,reentered:g.currentDungeon.id===d,recovery:g._renderProblem||null};
    });
    assert.deepEqual(saved,{fieldPositionRestored:true,sameClock:true,sameGold:true,noLightingInSave:true,reentered:true,recovery:null});report.checks.saveResume=saved;
    await context.close();
    const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
    await tab.goto(base);await tab.waitForFunction(()=>navigator.serviceWorker.controller);
    const missing=await tab.evaluate(async({cache,files})=>{const entries=await(await caches.open(cache)).keys();return files.filter(f=>!entries.some(e=>e.url===new URL(`/iron-squad/${f}`,location.origin).href));},{cache:`game-iron-squad-${release.version}`,files:release.files});assert.deepEqual(missing,[]);
    await offline.setOffline(true);await tab.reload();await tab.click('[data-game-id="iron-squad"]');
    await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
    report.checks.offline=await tab.evaluate(()=>{const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.enterDungeon(g.dungeons.find(d=>d.theme==='mines'));g.stopGameLoop();g.monsters=[];g.camera={x:g.player.x,y:g.player.y};g.render();return {dungeon:g.currentDungeon.id,recovery:g._renderProblem||null,mask:!!g._lightingMask};});
    assert.equal(report.checks.offline.recovery,null);assert.equal(report.checks.offline.mask,true);await tab.screenshot({path:`${out}/after-cave-offline-390.png`});await offline.close();assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
  }
}catch(error){report.failure=error.stack;throw error;}
finally{await browser.close();writeFileSync(`${out}/${stage}-browser.json`,JSON.stringify(report,null,2));}
