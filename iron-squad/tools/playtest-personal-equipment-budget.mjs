import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const {gameVersion}=manifest.GAME_ASSETS['iron-squad'],errors=[],out='iron-squad/docs/previews';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  const budgets=await page.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.reserves=[];g.sharedEquipBox=[];g.phase=2;g.restTimer=0;g.gold=10000;g.treasury=1000000;
    const {normalizeNation}=await import('/iron-squad/js/nation-rules.js');
    const {standardEquipmentCost}=await import('/iron-squad/js/armament-rules.js');
    g.nation=normalizeNation({investment:180000});
    const make=(name,gold)=>{const s=g.createNewSoldier(null,{classKey:'LIGHT'});s.name=name;s.gold=gold;s.equipped={};s.weapon=null;s.attributeProfile.innate.strength=10000;g.recalcSoldierStats(s);return s;};
    const low=standardEquipmentCost({tier:1}),high=standardEquipmentCost({tier:21});
    g.squad=[make('資金待ち',0),make('一品分の予算',low+6),make('整備資金あり',high*7+6)];
    const before=g.squad.map(s=>({name:s.name,gold:s.gold,parts:Object.keys(s.equipped).length})),result=g.supplyMissingEquipment();
    g.lastFiscalReport={...g.phaseFiscal,startBalance:g.treasury,endBalance:g.treasury};
    return {before,after:g.squad.map(s=>({name:s.name,gold:s.gold,parts:Object.values(s.equipped).filter(Boolean).length,tiers:Object.values(s.equipped).filter(Boolean).map(i=>i.tier)})),treasury:g.treasury,result};
  });
  assert.equal(budgets.treasury,1000000);assert.deepEqual(budgets.after.map(s=>s.parts),[0,1,7]);assert.deepEqual(budgets.after.map(s=>s.gold),[0,6,6]);assert.deepEqual(budgets.after[1].tiers,[1]);assert.ok(budgets.after[2].tiers.every(t=>t===21));
  await page.evaluate(()=>{const g=qualityGame;g.enterDungeon(g.dungeons.find(d=>d.id==='royal_castle_town'));g.render();});
  await page.click('#btn-strategy');await page.click('#tab-strat-nation');
  await page.locator('.workshop-panel > strong').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/personal-equipment-workshop-mobile-v${gameVersion}.png`});
  await page.selectOption('#workshop-tier','1');await page.selectOption('#workshop-supply','shield');
  const before=await page.evaluate(()=>({gold:qualityGame.gold,treasury:qualityGame.treasury,soldiers:qualityGame.squad.map(s=>s.gold)}));await page.click('#btn-workshop-buy');
  const after=await page.evaluate(()=>({gold:qualityGame.gold,treasury:qualityGame.treasury,soldiers:qualityGame.squad.map(s=>s.gold),item:qualityGame.inventory.at(-1).type}));
  assert.ok(after.gold<before.gold);assert.equal(after.treasury,before.treasury);assert.deepEqual(after.soldiers,before.soldiers);assert.equal(after.item,'SHIELD');
  const saved=await page.evaluate(()=>{const g=qualityGame;const data=structuredClone(g.saveGame());g.resumeSavedGame(data);g.stopGameLoop();const before=JSON.stringify(g.squad.map(s=>[s.gold,s.equipped]));g.supplyMissingEquipment();return {unchanged:before===JSON.stringify(g.squad.map(s=>[s.gold,s.equipped]))};});assert.ok(saved.unchanged);
  await page.evaluate(()=>{qualityGame.openStrategyModal(true);qualityGame._selectStratTab('nation');});
  await page.locator('#nation-status .armament-policies').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/personal-equipment-budget-mobile-v${gameVersion}.png`});
  const mobile=await page.evaluate(()=>({noOverflow:document.documentElement.scrollWidth<=innerWidth,explainsPersonalFunds:document.getElementById('nation-status').textContent.includes('各兵士の所持G')}));assert.ok(mobile.noOverflow&&mobile.explainsPersonalFunds);
  await page.setViewportSize({width:1280,height:800});await page.locator('.workshop-panel > strong').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/personal-equipment-workshop-desktop-v${gameVersion}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);const report={gameVersion,budgets,commanderPaysOwnWallet:after.gold<before.gold,publicTreasuryPreserved:true,saveGuard:saved,mobile,pageErrors:errors};
  writeFileSync(`${out}/personal-equipment-budget-playtest-v${gameVersion}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
