// Local Chrome check; a fresh browser profile keeps the user's saves untouched.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const manifest={GAME_ASSETS:{}};
new Function('self',readFileSync(new URL('../sw-assets.js',import.meta.url),'utf8'))(manifest);
const {version,gameVersion,files}=manifest.GAME_ASSETS['iron-squad'];
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:667}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async dialog=>{errors.push(dialog.message());await dialog.dismiss();});
  await page.goto('http://localhost:8000/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  const cacheName=`game-iron-squad-${version}`;
  await page.waitForFunction(async({cacheName,count})=>navigator.serviceWorker.controller&&(await caches.has(cacheName))&&(await(await caches.open(cacheName)).keys()).length>=count,{cacheName,count:files.length});
  // Controlled online reload also caches the manifest fetched by the hub badge.
  await page.reload();
  await page.waitForFunction(v=>document.querySelector('[data-version-for="iron-squad"]')?.textContent.includes(v),gameVersion);
  const cached=await page.evaluate(async cacheName=>{
    const cache=await caches.open(cacheName);
    return Promise.all(['/common/js/load-css.js',...['dungeon-layout','dungeon-interior-visuals','dungeon-exploration','appearance-features','crafting-rules','workshop','casino-rules','casino'].map(name=>`/iron-squad/js/${name}.js`)].map(url=>cache.match(url,{ignoreSearch:true}).then(Boolean)));
  },cacheName);
  assert.ok(cached.every(Boolean),'all exploration modules are precached');
  await context.setOffline(true);await page.reload();
  await page.click('[data-game-id="iron-squad"]');
  await page.locator('#new-expedition-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await page.click('#btn-commander-confirm');
  await page.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  const result=await page.evaluate(()=>{
    const g=window.gameStudioInstance.activeGame;g.stopGameLoop();g.restTimer=0;
    g.enterDungeon(g.dungeons.find(d=>d.id==='dungeon_goblin_mines'));g.render();
    return {dungeon:g.currentDungeon.id,bossBody:g.monsters.some(m=>m.type==='goblin_king'),canvasReady:g.canvas.width>0&&g.canvas.height>0};
  });
  assert.equal(result.dungeon,'dungeon_goblin_mines');assert.ok(result.bossBody&&result.canvasReady);assert.deepEqual(errors,[]);
  const report={gameVersion,cache:cacheName,newModulesCached:cached.every(Boolean),offlineNewExpedition:true,offlineDungeonEntryAndRender:true,result,pageErrors:errors};
  writeFileSync(`iron-squad/docs/previews/dungeon-offline-v${gameVersion}.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
