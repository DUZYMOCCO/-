import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/checkpoint-ux-v6.11.3-20261014';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const size=viewport.width===390?'mobile':'desktop';await page.setViewportSize(viewport);
  await page.evaluate(async()=>{
   const g=qualityGame,{saveSlots}=await import('/iron-squad/js/save-slots.js?v=253');g._merchantShopClose?.();g.stopGameLoop();g.activeSlotId=saveSlots.create('画面確認用').id;g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.career.status='enlisted';g.gold=403973;
   const m=g.merchants[0];g.player.x=m.x;g.player.y=m.y;g.saveCheckpoint();g.render();g.openMerchantShop(m);document.querySelector('[data-merchant-section="save"]').click();
   window.saveQA={g,saveSlots,oldId:g.activeSlotId,old:JSON.stringify(saveSlots.get(g.activeSlotId)),resumes:0};const resume=window.saveQAOriginalResume||g.resumeSavedGame;window.saveQAOriginalResume=resume;g.resumeSavedGame=function(data){saveQA.resumes++;return resume.call(this,data);};
  });
  await page.locator('.checkpoint-notice').waitFor({state:'detached'});
  await page.click('#merchant-shop-popup [data-supply="save"]');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.checkpointChoice),'cancel');assert.equal(await page.evaluate(()=>document.getElementById('merchant-shop-popup').inert),true);
  const bounds=await page.locator('#checkpoint-confirm button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};}));for(const b of bounds){assert.ok(b.x>=0&&b.right<=viewport.width);assert.ok(b.y>=0&&b.bottom<=viewport.height);assert.ok(b.height>=44);}
  await page.screenshot({path:`${out}/save-choice-${size}.png`});await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.checkpointChoice),'overwrite');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.checkpointChoice),'cancel');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>JSON.stringify(saveQA.saveSlots.get(saveQA.oldId))===saveQA.old),true,'Enter defaults to cancellation');
  await page.evaluate(()=>saveQA.g.gold=403974);await page.click('#merchant-shop-popup [data-supply="save"]');await page.click('[data-checkpoint-choice="overwrite"]');
  assert.equal(await page.locator('.checkpoint-notice').textContent(),'セーブしました');assert.equal(await page.evaluate(()=>saveQA.saveSlots.get(saveQA.oldId).checkpoint.data.gold),403974);
  await page.screenshot({path:`${out}/saved-${size}.png`});await page.locator('.checkpoint-notice').waitFor({state:'detached',timeout:2500});
  await page.evaluate(()=>saveQA.g.gold=403975);await page.click('#merchant-shop-popup [data-supply="load"]');assert.equal(await page.evaluate(()=>document.activeElement.dataset.checkpointChoice),'cancel');await page.screenshot({path:`${out}/return-confirm-${size}.png`});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>saveQA.g.gold),403975);assert.equal(await page.evaluate(()=>saveQA.resumes),0);
  await page.click('#merchant-shop-popup [data-supply="load"]');await page.evaluate(()=>{const b=document.querySelector('[data-checkpoint-choice="load"]');b.click();b.click();document.querySelector('#merchant-shop-popup [data-supply="load"]').click();});assert.equal(await page.evaluate(()=>saveQA.resumes),1);assert.equal(await page.evaluate(()=>saveQA.g.gold),403974);assert.equal(await page.locator('#merchant-shop-popup').getAttribute('data-section'),'save');
  await page.locator('.checkpoint-notice').waitFor({state:'detached'});
  await page.evaluate(()=>{saveQA.old=JSON.stringify(saveQA.saveSlots.get(saveQA.oldId));saveQA.count=saveQA.saveSlots.list().length;saveQA.g.gold=403976;});await page.click('#merchant-shop-popup [data-supply="save"]');await page.click('[data-checkpoint-choice="new"]');
  const newResult=await page.evaluate(()=>({newId:saveQA.g.activeSlotId,oldId:saveQA.oldId,oldUnchanged:JSON.stringify(saveQA.saveSlots.get(saveQA.oldId))===saveQA.old,count:saveQA.saveSlots.list().length,previousCount:saveQA.count,gold:saveQA.saveSlots.get(saveQA.g.activeSlotId).checkpoint.data.gold}));assert.notEqual(newResult.newId,newResult.oldId);assert.equal(newResult.oldUnchanged,true);assert.equal(newResult.count,newResult.previousCount+1);assert.equal(newResult.gold,403976);
  await page.locator('.checkpoint-notice').waitFor({state:'detached'});
  await page.click('#merchant-shop-popup [data-supply="save"]');await page.evaluate(()=>{saveQA.set=localStorage.setItem;saveQA.slots=JSON.stringify(saveQA.saveSlots.list());localStorage.setItem=()=>{throw new Error('quota fixture');};});await page.click('[data-checkpoint-choice="new"]');await page.evaluate(()=>localStorage.setItem=saveQA.set);
  assert.equal(await page.locator('.checkpoint-notice').textContent(),'セーブに失敗しました');assert.equal(await page.evaluate(()=>JSON.stringify(saveQA.saveSlots.list())===saveQA.slots),true);await page.screenshot({path:`${out}/save-failed-${size}.png`});
  results.push({viewport,buttons:bounds,defaultCancel:true,cancelAndEscapePreserveData:true,overwriteUpdatedRecord:true,noticeAutoDismissed:true,returnExecutedOnce:true,newResult,failurePreservedSlots:true});await page.locator('.checkpoint-notice').waitFor({state:'detached'});
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.11.3',results,pageErrors:errors,disposableStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
