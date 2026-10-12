import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  page.on('response',r=>{if(r.status()>=400)errors.push({url:r.url(),status:r.status(),serviceWorker:r.fromServiceWorker()});});
  await page.goto(process.argv[2]||'http://127.0.0.1:8001');await page.click('[data-game-id="iron-squad"]');
  await page.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await page.click('#btn-commander-confirm');
  await page.waitForFunction(async()=>navigator.serviceWorker.controller&&(await(await caches.open('game-iron-squad-v199')).keys()).length>=107);
  const online=await page.locator('[data-version-for="iron-squad"]').textContent();
  await context.setOffline(true);await page.reload();await page.waitForTimeout(500);
  const offline=await page.locator('[data-version-for="iron-squad"]').textContent();
  await page.click('[data-game-id="iron-squad"]');await page.waitForSelector('[data-slot-id]');await page.locator('[data-slot-id]').first().click();
  await page.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);await page.evaluate(()=>gameStudioInstance.activeGame.stopGameLoop());
  const report={onlineVersion:online,offlineVersion:offline,offlineResume:true,responseErrors:errors};
  writeFileSync('iron-squad/docs/previews/full-audit-20261012/offline-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await context.close();
} finally {await browser.close();}
