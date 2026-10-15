import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/perf-diagnostics-v6.11.12';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={version:'6.11.12',disposableBrowserStorage:true};let activePage;
const listen=page=>{
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  page.on('console',m=>{if(m.type()==='error')console.error('Browser console:',m.text());});
};
const boot=async(page,query)=>{
  await page.goto(`http://127.0.0.1:8000/${query}`);await page.locator('[data-game-id="iron-squad"]').click();
  await page.locator('#expedition-name').fill('計測表示の検証');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
  await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.perfGame=g;return true;},null,{timeout:90000});
};
try{
  const ordinary=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),normal=activePage=await ordinary.newPage();listen(normal);
  await boot(normal,'');
  report.disabled=await normal.evaluate(async()=>{
    const g=perfGame,{WorldTerrain}=await import('/iron-squad/js/world.js?v=277'),{saveSlots}=await import('/iron-squad/js/save-slots.js?v=262');
    return {panel:!!document.querySelector('.perf-diagnostics'),api:!!g.perfDiagnostics,updateWrapped:g.update.name!=='update',loopAccessor:!!Object.getOwnPropertyDescriptor(g,'loop')?.get,
      terrainWrapped:WorldTerrain.prototype.generate.name!=='generate',slotsWrapped:saveSlots.list.name!=='list',nativeStorage:Storage.prototype.setItem.toString().includes('[native code]')};
  });
  assert.deepEqual(report.disabled,{panel:false,api:false,updateWrapped:false,loopAccessor:false,terrainWrapped:false,slotsWrapped:false,nativeStorage:true});
  await normal.screenshot({path:`${out}/normal-mobile.png`});await ordinary.close();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  // Artificial delays are confined to this disposable test context. Production code has no busy-waits.
  await context.addInitScript(()=>{
    window.qaLSDelay=0;window.qaLSGetDelay=0;window.qaBitmapDelay=0;
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.qaClipboardText=text}});
    const nativeSet=Storage.prototype.setItem;window.qaNativeSet=nativeSet;
    Storage.prototype.setItem=function(key,value){if(window.qaLSDelay&&key==='game_studio_ironsquad_save_slots_v1'){const wait=window.qaLSDelay;window.qaLSDelay=0;const until=performance.now()+wait;while(performance.now()<until){}}return nativeSet.call(this,key,value);};
    const nativeGet=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){if(window.qaLSGetDelay&&key==='game_studio_ironsquad_save_slots_v1'){const wait=window.qaLSGetDelay;window.qaLSGetDelay=0;const until=performance.now()+wait;while(performance.now()<until){}}return nativeGet.call(this,key);};
    const draw=CanvasRenderingContext2D.prototype.drawImage;window.qaNativeDraw=draw;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){if(window.qaBitmapDelay&&image instanceof ImageBitmap){const wait=window.qaBitmapDelay;window.qaBitmapDelay=0;const until=performance.now()+wait;while(performance.now()<until){}}return draw.call(this,image,...args);};
    window.qaBaseSet=Storage.prototype.setItem;
  });
  const page=activePage=await context.newPage();listen(page);
  await boot(page,'?perf=1');await page.locator('.perf-diagnostics').waitFor();
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{
    const g=perfGame;g.closeStrategyModal();g.player.hp=g.player.maxHp;g.fastTravelTo(85000,79360,'計測開始');g.autoSaveClock=0;
    g.player.invulnerableTimer=60;g.monsters=[];window.qaStart={x:g.player.x,y:g.player.y,time:performance.now()};
  });
  const stick=await page.locator('#dpad-base').boundingBox();assert.ok(stick);await page.mouse.move(stick.x+stick.width/2+stick.width*.35,stick.y+stick.height/2);await page.mouse.down();
  await page.waitForTimeout(16_000);await page.mouse.up();
  report.walk=await page.evaluate(()=>({milliseconds:performance.now()-qaStart.time,moved:Math.hypot(perfGame.player.x-qaStart.x,perfGame.player.y-qaStart.y),state:perfGame.perfDiagnostics.snapshot(),workerActive:!!perfGame.worldTerrain._terrainWorker}));
  assert.ok(report.walk.moved>100,'native joystick moves the actual game');assert.equal(report.walk.workerActive,true);
  await page.screenshot({path:`${out}/natural-walk-mobile.png`});await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  // Make one actual bitmap transfer slow inside the onmessage callback.
  await page.evaluate(()=>{window.qaBitmapDelay=130;perfGame.worldTerrain.requestTile(200,145);});
  await page.waitForFunction(()=>perfGame.perfDiagnostics.snapshot().records.some(r=>r.timing.some(t=>t.name==='地形受信'&&t.totalMs>=120)),null,{timeout:30000});
  report.bitmapCallback=await page.evaluate(()=>perfGame.perfDiagnostics.snapshot().records.findLast(r=>r.timing.some(t=>t.name==='地形受信'&&t.totalMs>=120)));
  await page.evaluate(()=>{window.qaLSGetDelay=130;window.qaLSDelay=140;perfGame.saveGame({background:true});});
  await page.waitForFunction(()=>perfGame.perfDiagnostics.snapshot().records.some(r=>r.timing.some(t=>t.name==='保存完了'&&t.totalMs>=130)),null,{timeout:30000});
  report.backgroundCommit=await page.evaluate(async()=>({result:await perfGame._pendingAutoSave,record:perfGame.perfDiagnostics.snapshot().records.findLast(r=>r.timing.some(t=>t.name==='保存完了'&&t.totalMs>=130)),submission:perfGame.perfDiagnostics.snapshot().records.findLast(r=>r.timing.some(t=>t.name==='枠.updateBackground'&&t.totalMs>=120))}));
  assert.equal(report.backgroundCommit.result.status,'saved');assert.ok(report.backgroundCommit.record.timing.some(t=>t.name==='LS書く'&&t.ms>=130));
  await page.evaluate(async()=>{
    const g=perfGame,{saveSlots}=await import('/iron-squad/js/save-slots.js?v=262');saveSlots.list();saveSlots.get(g.activeSlotId);
    const tile=g.worldTerrain.generate(195,180);tile.canvas.width=tile.canvas.height=1;
    g.revealFogAroundPlayer();g.renderMinimap();g.openWorldMap();document.querySelector('#btn-world-map-close').click();window.qaLSDelay=140;g.saveGame();
  });
  await page.waitForFunction(()=>perfGame.perfDiagnostics.snapshot().records.some(r=>r.timing.some(t=>t.name==='ゲーム保存'&&t.totalMs>=130)),null,{timeout:30000});
  report.syncSaveAndMap=await page.evaluate(()=>perfGame.perfDiagnostics.snapshot().records.findLast(r=>r.timing.some(t=>t.name==='ゲーム保存'&&t.totalMs>=130)));
  assert.ok(report.backgroundCommit.submission,'submission time is separate from the later worker completion');
  const coverage=new Set([...report.walk.state.records,report.bitmapCallback,report.backgroundCommit.record,report.backgroundCommit.submission,report.syncSaveAndMap].flatMap(r=>r.timing.map(t=>t.name)));
  for(const name of ['地形.generate','地形.takeSurface','地形受信','保存完了','ゲーム保存','枠.update','枠.updateBackground','枠.list','枠.get','LS読む','LS書く','フォグ公開','ミニマップ','地図再描画','追従.開始','追従.復帰','敵出現'])assert.ok(coverage.has(name),`missing actual-game timer ${name}`);
  report.timers=[...coverage];
  // Ten deterministic diagnostic rows; this is evidence of detection/layout, not reproduction of the iPhone bug.
  await page.evaluate(async()=>{
    for(let i=0;i<13;i++){await new Promise(requestAnimationFrame);window.qaLSDelay=105;const key='game_studio_ironsquad_save_slots_v1';localStorage.setItem(key,localStorage.getItem(key));}
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);perfGame.perfDiagnostics.refresh();
    document.querySelector('.perf-diagnostics header strong').textContent='PERF v6.11.12 · 検証用の遅延';
  });
  await page.locator('[data-perf-freeze]').click();
  report.injected=await page.evaluate(()=>({snapshot:JSON.parse(perfGame.perfDiagnostics.json()),rows:document.querySelectorAll('.perf-records li').length}));assert.equal(report.injected.rows,10);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    const bounds=await page.locator('.perf-diagnostics').evaluate(el=>({width:innerWidth,height:innerHeight,rect:{x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right,y:el.getBoundingClientRect().y,bottom:el.getBoundingClientRect().bottom},scroll:el.scrollHeight-el.clientHeight,rows:[...el.querySelectorAll('.perf-records li')].map(n=>({text:n.textContent,bottom:n.getBoundingClientRect().bottom}))}));
    assert.ok(bounds.rect.x>=0&&bounds.rect.right<=viewport.width&&bounds.rect.y>=0&&bounds.rect.bottom<=viewport.height);assert.equal(bounds.scroll,0,'all ten records must fit one screenshot');assert.ok(bounds.rows.every(row=>row.bottom<=bounds.rect.bottom));
    report[size]=bounds;await page.screenshot({path:`${out}/injected-ten-${size}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('[data-perf-copy]').click();
  await page.waitForFunction(()=>window.qaClipboardText);const copy=await page.evaluate(()=>JSON.parse(qaClipboardText));assert.equal(copy.records.length,10);assert.equal(copy.version,'6.11.12');report.copyWorks=true;
  await page.evaluate(()=>navigator.clipboard.writeText=async()=>{throw new Error('Clipboard unavailable');});await page.locator('[data-perf-copy]').click();await page.locator('.perf-copy:not(.hidden)').waitFor();assert.equal(JSON.parse(await page.locator('.perf-copy').inputValue()).records.length,10);report.copyFallbackWorks=true;
  report.cleanup=await page.evaluate(async()=>{
    const g=perfGame,{WorldTerrain}=await import('/iron-squad/js/world.js?v=277'),{saveSlots}=await import('/iron-squad/js/save-slots.js?v=262');g.destroy();
    return {panelGone:!document.querySelector('.perf-diagnostics'),gameUpdateRestored:g.update.name==='update',terrainRestored:WorldTerrain.prototype.generate.name==='generate',slotsRestored:saveSlots.list.name==='list',storageRestored:Storage.prototype.setItem===qaBaseSet};
  });assert.ok(Object.values(report.cleanup).every(Boolean));await context.close();
  const fallback=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await fallback.addInitScript(()=>{window.Worker=undefined;window.OffscreenCanvas=undefined;window.PerformanceObserver=undefined;});
  const legacy=await fallback.newPage();legacy.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});await boot(legacy,'?perf=1');
  report.fallback=await legacy.evaluate(()=>({snapshot:perfGame.perfDiagnostics.snapshot(),label:document.querySelector('.perf-state').textContent,live:perfGame.running}));assert.equal(report.fallback.snapshot.longTaskSupported,false);assert.equal(report.fallback.snapshot.terrain.offscreenSupported,false);assert.equal(report.fallback.snapshot.terrain.workerSupported,false);assert.equal(report.fallback.live,true);
  await legacy.screenshot({path:`${out}/unsupported-mobile.png`});await fallback.close();
  const files=[...readFileSync('iron-squad/sw-assets.js','utf8').matchAll(/^\s*'([^']+)',?$/gm)].map(m=>m[1]);
  for(const file of files){const response=await fetch(new URL(file,'http://127.0.0.1:8000/iron-squad/'));assert.equal(response.status,200,file);assert.equal(Buffer.compare(Buffer.from(await response.arrayBuffer()),readFileSync(`iron-squad/${file}`)),0,file);}
  assert.deepEqual(errors,[]);report.pageErrors=errors;report.servedAssets=files.length;writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({version:report.version,disabled:report.disabled,moved:report.walk.moved,naturalSlowFrames:report.walk.state.records.length,actualTimers:report.timers,tenRows:true,copyWorks:report.copyWorks,cleanup:report.cleanup,servedAssets:files.length,pageErrors:errors}));
}catch(error){
  if(activePage&&!activePage.isClosed()){
    const state=await activePage.evaluate(()=>({snapshot:window.perfGame?.perfDiagnostics?.snapshot(),bitmapDelay:window.qaBitmapDelay,storageDelay:window.qaLSDelay,workerHandler:window.perfGame?.worldTerrain?._terrainWorker?.onmessage?.name,running:window.perfGame?.running,body:document.body.innerText.slice(0,2500)})).catch(()=>null);
    writeFileSync(`${out}/failure-state.json`,JSON.stringify({error:String(error),pageErrors:errors,partial:report,state},null,2)+'\n');await activePage.screenshot({path:`${out}/failure-state.png`}).catch(()=>{});
    console.error(JSON.stringify({bitmapDelay:state?.bitmapDelay,storageDelay:state?.storageDelay,running:state?.running,workerHandler:state?.workerHandler,records:state?.snapshot?.records.map(r=>({frame:r.frameMs,raf:r.rafMs,timing:r.timing.filter(t=>t.totalMs>100)}))}));
  }throw error;
}finally{await browser.close();}
