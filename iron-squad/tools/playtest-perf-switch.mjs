import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/perf-switch-v6.11.13';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={version:'6.11.13',disposableStorage:true};
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const key='game_studio_ironsquad_perf_enabled';
const enter=async(slot,query='')=>{
  await page.goto(`http://127.0.0.1:8000/${query}`);await page.locator('[data-game-id="iron-squad"]').click();
  if(slot)await page.locator(`[data-slot-id="${slot}"]`).click();
  else{await page.locator('#expedition-name').fill('いつもの遠征・切替検証');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();}
  await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.switchGame=g;g.autoSaveClock=-300;return true;},null,{timeout:120000});
};
const settings=async()=>{await page.locator('#btn-strategy').click();await page.locator('#tab-strat-overview').click();await page.locator('#perf-settings summary').click();await page.locator('#btn-perf-toggle').scrollIntoViewIfNeeded();};
const disabled=()=>page.evaluate(()=>({panel:!!document.querySelector('.perf-diagnostics'),api:!!switchGame.perfDiagnostics,updateWrapped:switchGame.update.name!=='update',loopAccessor:!!Object.getOwnPropertyDescriptor(switchGame,'loop')?.get,nativeStorage:Storage.prototype.setItem.toString().includes('[native code]')}));
const off={panel:false,api:false,updateWrapped:false,loopAccessor:false,nativeStorage:true};
try{
  await enter();report.defaultOff=await disabled();assert.deepEqual(report.defaultOff,off);
  const slot=await page.evaluate(()=>{switchGame.saveGame();return switchGame.activeSlotId;});
  await enter(slot);assert.equal(await page.evaluate(()=>switchGame.activeSlotId),slot);assert.deepEqual(await disabled(),off);
  await settings();await page.locator('#perf-settings').screenshot({path:`${out}/setting-off-mobile.png`});
  await page.evaluate(()=>{window.originalUpdate=switchGame.update;window.originalLoop=switchGame.loop;window.saveBytes=localStorage.getItem('game_studio_ironsquad_save_slots_v1');window.samePlayer=switchGame.player;window.sameTerrain=switchGame.worldTerrain;});
  await page.locator('#btn-perf-toggle').click();await page.locator('.perf-diagnostics').waitFor();
  report.liveOn=await page.evaluate(key=>({stored:localStorage.getItem(key),samePlayer:switchGame.player===samePlayer,sameTerrain:switchGame.worldTerrain===sameTerrain,saveUnchanged:localStorage.getItem('game_studio_ironsquad_save_slots_v1')===saveBytes,wrapped:switchGame.update!==originalUpdate}),key);assert.ok(Object.values(report.liveOn).every(Boolean));assert.equal(report.liveOn.stored,'1');
  await page.locator('#btn-strat-window-close').click();await page.evaluate(()=>switchGame.closeStrategyModal());
  // Only the disposable test context contains this delay. It verifies the live loop records slow frames.
  await page.evaluate(async()=>{await new Promise(requestAnimationFrame);const until=performance.now()+130;while(performance.now()<until){}await new Promise(requestAnimationFrame);});
  await page.waitForFunction(()=>switchGame.perfDiagnostics.snapshot().records.length>0);report.liveRecords=await page.evaluate(()=>{switchGame.perfDiagnostics.refresh();return switchGame.perfDiagnostics.snapshot();});
  await page.screenshot({path:`${out}/live-on-mobile.png`});
  await enter(slot);report.restartOn=await page.evaluate(key=>({stored:localStorage.getItem(key),panel:!!document.querySelector('.perf-diagnostics'),slot:switchGame.activeSlotId,version:switchGame.perfDiagnostics.snapshot().version}),key);assert.equal(report.restartOn.slot,slot);assert.equal(report.restartOn.version,'6.11.13');assert.ok(report.restartOn.panel);
  await settings();await page.locator('#perf-settings').screenshot({path:`${out}/setting-on-mobile.png`});
  await page.locator('#btn-perf-toggle').click();report.liveOff=await disabled();assert.deepEqual(report.liveOff,off);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
  await page.locator('#btn-strat-window-close').click();await page.evaluate(()=>switchGame.closeStrategyModal());
  const start=await page.evaluate(()=>({x:switchGame.player.x,y:switchGame.player.y}));
  const stick=await page.locator('#dpad-base').boundingBox();assert.ok(stick);await page.mouse.move(stick.x+stick.width*.85,stick.y+stick.height*.5);await page.mouse.down();await page.waitForTimeout(2000);await page.mouse.up();
  report.offMoved=await page.evaluate(start=>Math.hypot(switchGame.player.x-start.x,switchGame.player.y-start.y),start);assert.ok(report.offMoved>5,'game loop continues after OFF');
  await enter(slot);report.restartOff=await disabled();assert.deepEqual(report.restartOff,off);
  await settings();for(let i=0;i<3;i++){await page.locator('#btn-perf-toggle').click();assert.equal(await page.locator('.perf-diagnostics').count(),1);await page.locator('#btn-perf-toggle').click();assert.deepEqual(await disabled(),off);}report.repeatedToggle=true;
  await page.setViewportSize({width:1280,height:800});await page.locator('#perf-settings').screenshot({path:`${out}/setting-off-desktop.png`});
  await enter(slot,'?perf=1');assert.ok(await page.locator('.perf-diagnostics').count());await settings();await page.locator('#btn-perf-toggle').click();assert.deepEqual(await disabled(),off);assert.match(await page.locator('.perf-setting-status').innerText(),/URL/);report.queryStillWorks=true;
  await page.locator('#btn-perf-toggle').click();report.destroy=await page.evaluate(()=>{switchGame.destroy();return {panelGone:!document.querySelector('.perf-diagnostics'),settingsGone:!document.querySelector('#perf-settings'),updateRestored:switchGame.update.name==='update',storageNative:Storage.prototype.setItem.toString().includes('[native code]')};});assert.ok(Object.values(report.destroy).every(Boolean));
  const files=[...readFileSync('iron-squad/sw-assets.js','utf8').matchAll(/^\s*'([^']+)',?$/gm)].map(m=>m[1]);
  for(const file of files){
    let response;
    for(let attempt=0;attempt<5;attempt++){
      try{response=await fetch(new URL(file,'http://127.0.0.1:8000/iron-squad/'));break;}
      catch(error){if(error.cause?.code!=='EADDRINUSE'||attempt===4)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
    }
    assert.equal(response.status,200,file);assert.equal(Buffer.compare(Buffer.from(await response.arrayBuffer()),readFileSync(`iron-squad/${file}`)),0,file);
  }
  report.servedAssets=files.length;report.errors=errors;assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});writeFileSync(`${out}/failure.json`,JSON.stringify({error:String(error),errors,report,body:await page.locator('body').innerText().catch(()=>null)},null,2));throw error;}
finally{await browser.close();}
