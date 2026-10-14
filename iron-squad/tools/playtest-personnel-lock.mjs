import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/personnel-lock-v6.11.4-20261014';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const size=viewport.width===390?'mobile':'desktop';await page.setViewportSize(viewport);
  await page.evaluate(()=>{
   const g=qualityGame;g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.career.status='enlisted';g.currentDungeon=null;g.monsters=[];
   const make=(id,name)=>Object.assign(g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'}),{id,name,isPersonalGuard:false,platoonId:0,x:79360,y:79360});
   g.uiExpandedSoldierId=null;g.squad=[make('lock-target','大切な兵士'),make('lock-b','遠征兵B'),make('lock-c','遠征兵C'),make('lock-d','遠征兵D')];g.reserves=[];g.initPlatoons();g.render();g.openStrategyModal(true);window.lockQA={g};
  });
  await page.click('#tab-strat-troops');await page.locator('.roster-entry[data-soldier-id="lock-target"] summary').click();await page.click('.roster-entry[data-soldier-id="lock-target"] .btn-personnel-lock');
  assert.equal(await page.locator('.roster-entry[data-soldier-id="lock-target"] .btn-dismiss').isDisabled(),true);assert.equal(await page.evaluate(()=>lockQA.g.dismissSoldier('lock-target')),false);await page.screenshot({path:`${out}/roster-locked-${size}.png`});
  await page.click('.roster-entry[data-soldier-id="lock-target"] .btn-soldier-detail');assert.equal(await page.locator('#soldier-detail-host .btn-personnel-lock').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:`${out}/detail-locked-${size}.png`});await page.click('#soldier-detail-host .btn-close-soldier-detail');
  await page.evaluate(()=>{const g=lockQA.g,snapshot=structuredClone(g.saveGame());g.resumeSavedGame(snapshot);g.stopGameLoop();g.closeStrategyModal();g.openStrategyModal(true);g._openNationPage('operations','expedition');});
  await page.locator('.expedition-members[data-pid="0"] summary').click();const protectedBox=page.locator('.expedition-pick[data-sid="lock-target"]');assert.equal(await protectedBox.isDisabled(),true);assert.equal(await protectedBox.isChecked(),false);assert.ok((await protectedBox.locator('..').textContent()).includes('保護中'));await page.screenshot({path:`${out}/expedition-locked-${size}.png`});
  await page.click('.btn-danger-tier[data-tier="4"]');await page.click('.btn-expedition-send[data-pid="0"]');
  const dispatched=await page.evaluate(()=>({ids:lockQA.g.platoons[0].expeditionMemberIds,locked:lockQA.g.squad.find(s=>s.id==='lock-target').personnelLocked}));assert.deepEqual(dispatched.ids,['lock-b','lock-c','lock-d']);assert.equal(dispatched.locked,true);
  await page.click('.btn-expedition-recall[data-pid="0"]');await page.evaluate(()=>lockQA.g.openSoldierDetail('lock-target'));await page.click('#soldier-detail-host .btn-personnel-lock');assert.equal(await page.locator('#soldier-detail-host .btn-personnel-lock').getAttribute('aria-pressed'),'false');
  const result=await page.evaluate(()=>({locked:lockQA.g.squad.find(s=>s.id==='lock-target').personnelLocked,selectedTab:document.querySelector('#soldier-detail-host [aria-selected="true"]').dataset.detailTab,focusReturned:document.activeElement.classList.contains('btn-personnel-lock')}));assert.equal(result.locked,false);assert.equal(result.focusReturned,true);
  results.push({viewport,saveResumePreserved:true,dismissalBlocked:true,expeditionChoiceDisabled:true,dispatched,...result});await page.click('#soldier-detail-host .btn-close-soldier-detail');
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.11.4',results,pageErrors:errors,disposableStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
