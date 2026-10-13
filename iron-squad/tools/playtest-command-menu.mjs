import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/command-menu-v6.10.0-20261014';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
  for(const viewport of [{width:390,height:844},{width:390,height:664},{width:1280,height:800},{width:844,height:390}]) {
    const size=`${viewport.width}x${viewport.height}`;await page.setViewportSize(viewport);
    await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.currentDungeon=null;g.career.status='enlisted';g.gold=400000;g.treasury=100000;g.monsters=[];g.medicalPosts[0].discovered=true;g.medicalPosts[1].discovered=false;g.player.x+=1000;g.render();g.openStrategyModal(true);});
    const fit=await page.evaluate(()=>[...document.querySelectorAll('#strategy-modal .dialog-tabs button')].filter(b=>!b.classList.contains('hidden')).map(b=>({text:b.textContent,top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom,height:b.getBoundingClientRect().height})));
    assert.ok(fit.every(b=>b.top>=0&&b.bottom<=viewport.height),`${size}: all launcher buttons visible`);assert.ok(fit.every(b=>b.height>=44));
    await page.screenshot({path:`${out}/menu-${size}.png`});
    await page.locator('#tab-strat-nation').click();assert.equal(await page.locator('#nation-home button').count(),4);assert.equal(await page.locator('#nation-status').isVisible(),false);assert.equal(await page.locator('#view-econ-invest').isVisible(),false,'home hides donation');assert.equal(await page.locator('#nation-expedition-panel').isVisible(),false);assert.equal(await page.locator('#nation-shared-box').isVisible(),false);
    await page.screenshot({path:`${out}/nation-home-${size}.png`});
    const routes=await page.evaluate(async()=>Object.entries((await import('/iron-squad/js/command-navigation.js')).NATION_GROUPS).flatMap(([group,d])=>d.pages.map(([key,label])=>({group,key,label}))));
    for(const route of routes) {
      await page.locator(`[data-nation-group="${route.group}"]`).click();await page.locator(`[data-nation-page="${route.key}"]`).click();
      assert.equal(await page.locator('#strat-window-title').innerText(),route.label);
      const overflow=await page.evaluate(()=>{const body=document.querySelector('#strategy-modal .dialog-body');return body.scrollWidth>body.clientWidth+1||document.documentElement.scrollWidth>innerWidth;});assert.equal(overflow,false,`${size}: ${route.key} does not overflow horizontally`);
      if(viewport.width===390&&viewport.height===844)await page.screenshot({path:`${out}/nation-${route.key}-${size}.png`});
      if(route.key==='regions') {
        const before=await page.evaluate(()=>({gold:qualityGame.gold,treasury:qualityGame.treasury}));
        await page.locator('#economic-investment-amount').fill('100');await page.locator('[data-economic-page="regions"] [data-economic-source="personal"]').first().click();
        const after=await page.evaluate(()=>({gold:qualityGame.gold,treasury:qualityGame.treasury,page:qualityGame._nationRoute.page}));assert.equal(after.gold,before.gold-100);assert.equal(after.treasury,before.treasury);assert.equal(after.page,'regions');
      }
      await page.locator('#btn-strat-window-back').click();assert.equal(await page.locator('#nation-home').isVisible(),true);
    }
    await page.locator('#btn-strat-window-back').click();await page.locator('#btn-fast-travel').click();
    assert.equal(await page.locator('#world-map-canvas').isVisible(),false);assert.equal(await page.locator('#fast-travel-list').isVisible(),true);
    const destination=await page.locator('#fast-travel-list button').first().boundingBox();assert.ok(destination.y+destination.height<=viewport.height,'first destination visible immediately');
    assert.match(await page.locator('#fast-travel-list').innerText(),/第1救護所/);assert.doesNotMatch(await page.locator('#fast-travel-list').innerText(),/第2救護所/);
    await page.screenshot({path:`${out}/fast-travel-${size}.png`});
    await page.locator('#btn-world-map-close').click();assert.equal(await page.evaluate(()=>qualityGame.inBattle),false);assert.equal(await page.locator('#btn-fast-travel').evaluate(n=>n===document.activeElement),true);
    await page.locator('#btn-world-map').click();assert.equal(await page.locator('#world-map-canvas').isVisible(),true);await page.screenshot({path:`${out}/map-${size}.png`});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>qualityGame.inBattle),false);
    await page.locator('#btn-fast-travel').click();await page.locator('#fast-travel-list button').first().click();assert.equal(await page.locator('#world-map-modal').isVisible(),false);assert.equal(await page.locator('#strategy-modal').isVisible(),false);assert.equal(await page.evaluate(()=>qualityGame.inBattle),true);
    await page.evaluate(()=>qualityGame.render());await page.screenshot({path:`${out}/battlefield-${size}.png`});
    results.push({viewport,launcher:fit,pages:routes.length,firstDestination:destination,realPersonalInvestment:true,menuReturnPaused:true,successfulTravelClosesMenu:true});
  }
  // Save compatibility and kana mode in the same disposable session.
  const save=await page.evaluate(async()=>{const g=qualityGame;g.openStrategyModal(true);g._openNationPage('territory','regions');const snapshot=structuredClone(g.saveGame()),before={gold:g.gold,treasury:g.treasury,nation:JSON.stringify(g.nation)};g.resumeSavedGame(snapshot);const after={gold:g.gold,treasury:g.treasury,nation:JSON.stringify(g.nation)};return {before,after,routeSaved:Object.hasOwn(snapshot,'_nationRoute')};});assert.deepEqual(save.before,save.after);assert.equal(save.routeSaved,false);
  await page.setViewportSize({width:390,height:844});await page.evaluate(async()=>{const kana=await import('/common/js/kana-mode.js?v=175');window.commandKanaQA=kana;kana.setKanaMode(true);qualityGame.openStrategyModal(true);qualityGame._selectStratTab('nation');qualityGame._nationRoute={group:null,page:null};qualityGame._refreshCommandNavigation();});
  await page.waitForTimeout(100);await page.screenshot({path:`${out}/nation-home-kana.png`});await page.evaluate(()=>commandKanaQA.setKanaMode(false));
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.10.0',results,save,pageErrors:errors,disposableBrowserStorage:true},null,2)+'\n');console.log(JSON.stringify({viewports:results.map(r=>r.viewport),pages:13,pageErrors:errors,saveStable:true}));await context.close();
} catch(error) {console.error(JSON.stringify({pageErrors:errors}));throw error;} finally {await browser.close();}
