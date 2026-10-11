// Exercise mobile UI with the fixture's memory-only saves and one disposable Chrome.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),out='iron-squad/docs/previews',report={},errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.argv[2]||'http://localhost:8000'}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  const state=()=>page.evaluate(()=>({status:qualityGame.career.status,title:qualityGame.currentRank().title,followers:qualityGame.listPersonalGuardsAlive().length,waiting:qualityGame.taverns.waiting.length,gold:qualityGame.gold,overflow:document.documentElement.scrollWidth>innerWidth}));
  await page.evaluate(()=>{qualityGame.stopGameLoop();qualityGame.openStrategyModal(true);});report.start=await state();assert.equal(report.start.title,'在野の旅人');
  await page.screenshot({path:`${out}/traveler-overview-mobile-v5.6.0.png`});
  await page.evaluate(()=>{const g=qualityGame;g.closeStrategyModal();g.restTimer=0;Object.assign(g.player,{x:79160,y:80060});g.stopGameLoop();g.zoom=1;g.camera={x:79160,y:79950};g.render();});
  await page.screenshot({path:`${out}/tavern-town-mobile-v5.6.0.png`});await page.click('#btn-town-tavern');
  await page.screenshot({path:`${out}/tavern-strangers-mobile-v5.6.0.png`});
  for(const answer of ['できる範囲で力を貸す','無理をせず、皆で帰る道を探す','いっしょに旅をしよう']){
    await page.getByRole('button',{name:'会話する',exact:true}).first().click();await page.getByRole('button',{name:answer,exact:true}).click();
  }
  const wallet=(await state()).gold;await page.getByRole('button',{name:'旅の仲間に誘う',exact:true}).click();assert.equal((await state()).gold,wallet);
  await page.evaluate(()=>{qualityGame.gold=1e6;qualityGame.renderTavern();});
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/Gで雇う/}).first().click();
  await page.evaluate(()=>{qualityGame.phase++;qualityGame.renderTavern();});
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/Gで雇う/}).first().click();
  report.full=await state();assert.equal(report.full.followers,5);assert.equal(report.full.waiting,2);assert.equal(report.full.status,'traveler');
  await page.getByRole('button',{name:'酒場で待ってもらう',exact:true}).first().click();await page.getByRole('button',{name:'いっしょに出発する',exact:true}).first().click();
  await page.locator('.tavern-body').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:`${out}/tavern-waiting-mobile-v5.6.0.png`});
  await page.click('#btn-tavern-close');
  await page.evaluate(()=>{const g=qualityGame,saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.stopGameLoop();g.closeStrategyModal();for(let phase=10;phase<20;phase++){g.phase=phase;g.gainExp(700,{share:false,merit:700});}Object.assign(g.player,{x:79360,y:79360});g.updateStatsUI();});
  await page.click('#btn-career-invitation');await page.screenshot({path:`${out}/traveler-invitation-mobile-v5.6.0.png`});await page.click('#btn-career-later');
  report.declined=await state();assert.equal(report.declined.status,'invited');assert.equal(report.declined.followers,5);
  await page.click('#tab-strat-overview');await page.click('#btn-career-menu');await page.click('#btn-career-accept');report.enlisted=await state();assert.equal(report.enlisted.status,'enlisted');assert.equal(report.enlisted.followers,5);assert.equal(report.enlisted.waiting,0);
  await page.screenshot({path:`${out}/traveler-enlisted-mobile-v5.6.0.png`});
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=qualityGame;g.closeStrategyModal();Object.assign(g.player,{x:79160,y:80060});g.openTavern();});
  report.landscape=await state();const closeBox=await page.locator('#btn-tavern-close').boundingBox();assert.ok(closeBox&&closeBox.y>=0&&closeBox.y+closeBox.height<=390);
  await page.screenshot({path:`${out}/tavern-landscape-v5.6.0.png`});
  // A fresh profile also starts the new rules without ever launching the game online.
  const offlineContext=await browser.newContext({viewport:{width:375,height:780}}),offlinePage=await offlineContext.newPage();offlinePage.on('pageerror',e=>errors.push(e.message));
  await offlinePage.goto(process.argv[2]||'http://localhost:8000');await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
  await offlinePage.waitForFunction(async()=>navigator.serviceWorker.controller&&await caches.has('game-iron-squad-v195'));
  const modules=await offlinePage.evaluate(async()=>{const cache=await caches.open('game-iron-squad-v195');return Promise.all(['career-rules','tavern','traveler-clothes'].map(n=>cache.match(`/iron-squad/js/${n}.js`,{ignoreSearch:true}).then(Boolean)));});assert.ok(modules.every(Boolean));
  await offlineContext.setOffline(true);await offlinePage.reload();await offlinePage.click('[data-game-id="iron-squad"]');
  await offlinePage.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await offlinePage.click('#btn-commander-confirm');
  await offlinePage.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  report.offline=await offlinePage.evaluate(()=>{const g=window.gameStudioInstance.activeGame;g.stopGameLoop();g.restTimer=0;Object.assign(g.player,{x:79160,y:80060});g.openTavern();return {status:g.career.status,people:g.taverns.roster.people.length,dialog:!!document.querySelector('#tavern-dialog'),overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.equal(report.offline.status,'traveler');assert.equal(report.offline.people,4);assert.ok(report.offline.dialog);await offlineContext.close();
  for(const s of Object.values(report))assert.equal(s.overflow,false);assert.deepEqual(errors,[]);report.pageErrors=errors;
  writeFileSync(`${out}/traveler-taverns-playtest-v5.6.0.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
