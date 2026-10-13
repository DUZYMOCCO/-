import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'],browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000');await page.locator('[data-version-for="iron-squad"]').filter({hasText:release.gameVersion}).waitFor();
  await page.click('[data-game-id="iron-squad"]');await page.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await page.click('#btn-commander-confirm');
  await page.waitForFunction(async release=>{if(!navigator.serviceWorker.controller)return false;const c=await caches.open('game-iron-squad-'+release.version);for(const f of release.files)if(!await c.match(new URL('/iron-squad/'+f,location.href),{ignoreSearch:true}))return false;return true;},release);
  await context.setOffline(true);await page.reload();await page.locator('[data-game-id="iron-squad"]').waitFor();await page.click('[data-game-id="iron-squad"]');await page.locator('[data-slot-id]').first().click();
  await page.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);await page.evaluate(()=>gameStudioInstance.activeGame.stopGameLoop());
  const evidence=await page.evaluate(async cache=>{const {campaignScaling,CAMPAIGN_SCALE_VERSION}=await import(`/iron-squad/js/campaign-scaling.js?v=${cache}`),{DUNGEON_DEFS}=await import(`/iron-squad/js/dungeon.js?v=${cache}`),{weaponCombatProfile}=await import(`/iron-squad/js/equipment-rules.js?v=${cache}`),{ammoCapacity}=await import(`/iron-squad/js/supply-rules.js?v=${cache}`);return {rimHp:campaignScaling(79360).hp,borderHp:campaignScaling(48000).hp,scaleVersion:CAMPAIGN_SCALE_VERSION,ammoCache:gameStudioInstance.activeGame.player._ammoCapacity,bossHp:DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle').boss.hp,bowCooldown:weaponCombatProfile({weaponStyle:'bow'}).baseCooldown,bowAmmo:ammoCapacity({weapon:{weaponStyle:'bow'},strength:30})};},release.version.slice(1));
  assert.equal(evidence.rimHp,1_000_000);assert.equal(evidence.borderHp,6000);assert.equal(evidence.scaleVersion,2);assert.ok(evidence.ammoCache>0);assert.equal(evidence.bossHp,1_000_000_000);assert.equal(evidence.bowCooldown,.60);assert.equal(evidence.bowAmmo,120);assert.deepEqual(errors,[]);
  const report={version:release.gameVersion,cache:release.version,assets:release.files.length,allAssetsCached:true,offlineResume:true,evidence,pageErrors:errors,disposableBrowserStorage:true};writeFileSync(`${process.argv[2]||'iron-squad/docs/previews/campaign-ranged-v6.7.0-20261013'}/offline-playtest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
