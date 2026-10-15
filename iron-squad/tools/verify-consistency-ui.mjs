import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const base=process.argv[2]||'http://127.0.0.1:8001',out='iron-squad/docs/previews/consistency-fixes-20261012';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report={errors:[],screens:[],checks:{}};
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{window.g=qualityGame;g.stopGameLoop();g.monsters=[];g.restTimer=0;g.inBattle=true;g.gold=1000;Object.assign(g.player,{x:79160,y:80020});g.openTavern();});
  await page.getByRole('button',{name:/Gで雇う/}).first().click();
  const funds=await page.evaluate(()=>({gold:g.gold,shown:Number(document.getElementById('strat-gold').textContent.replaceAll(',',''))}));assert.equal(funds.gold,funds.shown);report.checks.tavernFunds=funds;
  await page.click('#btn-tavern-close');
  report.checks.fieldReturn=await page.evaluate(()=>({playing:g.inBattle,hidden:document.getElementById('strategy-modal').classList.contains('hidden'),inert:document.getElementById('strategy-modal').inert}));assert.deepEqual(report.checks.fieldReturn,{playing:true,hidden:true,inert:false});
  await page.click('#btn-strategy');await page.evaluate(()=>{g._selectStratTab('troops');g.openTavern();});await page.click('#btn-tavern-close');
  const nested=await page.evaluate(()=>({playing:g.inBattle,open:document.getElementById('strategy-modal').classList.contains('strat-window-open'),troops:!document.getElementById('view-strat-troops').classList.contains('hidden')}));assert.deepEqual(nested,{playing:false,open:true,troops:true});report.checks.menuReturn=nested;
  await page.evaluate(()=>{g.closeStrategyModal();Object.assign(g.player,{x:79360,y:79360});g.career.status='invited';g.openCareerInvitation();});await page.click('#btn-career-later');assert.equal(await page.evaluate(()=>g.inBattle),true);
  await page.evaluate(()=>g.openCareerInvitation());await page.click('#btn-career-accept');assert.equal(await page.evaluate(()=>g.inBattle&&g.career.status==='enlisted'),true);report.checks.invitationReturn=true;
  await page.evaluate(()=>{g.career.status='traveler';g.openStrategyModal(true);g._selectStratTab('overview');});
  assert.ok((await page.locator('#command-snapshot').innerText()).includes('地域への貢献'));
  const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});report.screens.push(name);};
  await shot('01-career-kanji');
  await page.evaluate(async()=>{const {setKanaGrade}=await import('/common/js/kana-mode.js?v=175');setKanaGrade(2,{persist:false});});await page.waitForTimeout(100);
  assert.ok((await page.locator('#command-snapshot').innerText()).includes('こうけん'));assert.ok(!(await page.locator('#command-snapshot').innerText()).includes('貢献'));await shot('02-career-kana');
  await page.evaluate(async()=>{const {setKanaGrade}=await import('/common/js/kana-mode.js?v=175');setKanaGrade(0,{persist:false});});await page.waitForTimeout(100);assert.ok((await page.locator('#command-snapshot').innerText()).includes('貢献'));report.checks.kanaRoundTrip=true;
  report.checks.follower=await page.evaluate(async()=>{
    g.closeStrategyModal();g.currentDungeon=null;g.updateSpawns=()=>{};g.monsters=[];g.currentQuest=null;g.restTimer=0;g.phaseTimer=200;g.inBattle=true;
    const {HEADQUARTERS_FACILITIES,headquartersBuildingBlocks}=await import('/iron-squad/js/hq-facilities.js?v=277'),p=HEADQUARTERS_FACILITIES[0];
    const s=g.squad.find(s=>s.soldierClass==='LIGHT'&&!s.isAdvanced);g.squad=[s];Object.assign(s,{isPersonalGuard:true,overflowGuard:false,isDown:false,dead:false,hp:s.maxHp});g.syncPersonalGuardSlots(null,5);
    Object.assign(g.player,{x:p.x,y:p.y-150,_openX:p.x,_openY:p.y-150});Object.assign(s,{x:p.x,y:p.y+50,_openX:p.x,_openY:p.y+50});
    let insideFrames=0;for(let i=0;i<360;i++){g.update(1/30);if(headquartersBuildingBlocks(s.x,s.y))insideFrames++;}
    g.render();return {insideFrames,distance:Math.hypot(s.x-g.player.x,s.y-g.player.y),unit:{x:s.x,y:s.y},commander:{x:g.player.x,y:g.player.y}};
  });assert.equal(report.checks.follower.insideFrames,0);assert.ok(report.checks.follower.distance<100);await shot('03-follower-detour');
  report.checks.chest=await page.evaluate(async()=>{
    const {dungeonSideChests,updateDungeonSideChests}=await import('/iron-squad/js/dungeon-exploration.js?v=200');
    const {generateRandomDrop}=await import('/iron-squad/js/index.js?v=277');g.currentDungeon=g.dungeons.find(d=>d.kind==='dungeon');
    const c=dungeonSideChests(g)[0];Object.assign(g.player,{x:c.x,y:c.y});const before={...g.materials};updateDungeonSideChests(g,generateRandomDrop,()=>.99);g.camera={x:c.x,y:c.y};g.render();
    const first={...g.materials};updateDungeonSideChests(g,generateRandomDrop,()=>.99);return {before,first,after:g.materials,text:document.querySelector('.treasure-receipt')?.innerText};
  });assert.ok(report.checks.chest.text.includes('素材庫'));assert.deepEqual(report.checks.chest.first,report.checks.chest.after);assert.notDeepEqual(report.checks.chest.before,report.checks.chest.after);await shot('04-side-chest-receipt');
  await page.evaluate(async()=>{
    const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=277');g.currentDungeon=null;g.nation=normalizeNation({investment:18000});g.gold=0;g.phaseTimer=200;g.restTimer=0;g.inBattle=true;
    Object.assign(g.player,{x:79170,y:79279});g.openHeadquartersFacility('smith');
  });assert.equal(await page.locator('#btn-workshop-buy').isDisabled(),true);assert.ok((await page.locator('#workshop-buy-reason').innerText()).includes('あと'));await shot('05-workshop-insufficient');
  await page.evaluate(()=>{g.gold=1000000;g.materials=Object.fromEntries(Object.keys(g.materials).map(k=>[k,1000]));g.refreshHeadquartersFacility();});
  assert.equal(await page.locator('#btn-workshop-buy').isDisabled(),false);const gold=await page.evaluate(()=>g.gold);await page.click('#btn-workshop-buy');assert.ok((await page.evaluate(()=>g.gold))<gold);
  for(const [w,h]of [[320,568],[390,844],[844,390]]){
    await page.setViewportSize({width:w,height:h});await page.waitForTimeout(100);await page.selectOption('#workshop-craft','armor');
    assert.ok((await page.locator('.workshop-craft-preview').innerText()).includes('今の装備とくらべる'));await page.locator('#workshop-craft').scrollIntoViewIfNeeded();await shot(`06-workshop-${w}`);
    const overflow=await page.locator('#hq-facility-dialog').evaluate(e=>e.scrollWidth-e.clientWidth);assert.ok(overflow<=2,`workshop overflow ${w}: ${overflow}`);
  }
  await page.click('#btn-workshop-craft');report.checks.workshop=await page.evaluate(()=>({last:g.inventory.at(-1).craftOnly,reasonGone:!document.querySelector('#workshop-buy-reason')}));assert.equal(report.checks.workshop.last,true);
  await page.evaluate(()=>{g.closeHeadquartersFacility();g.gold=123456789012;g.openStrategyModal(true);g.openMerchantShop(g.merchants[0]);for(const item of g.merchants[0].stock)item._merchantPrice=9876543210;g._merchantShopRefresh();});
  const layouts=[];
  for(const [w,h]of [[320,568],[375,667],[390,844],[844,390],[1280,800]]){
    await page.setViewportSize({width:w,height:h});await page.waitForTimeout(100);
    const metrics=await page.evaluate(()=>{
      const root=document.getElementById('merchant-shop-popup'),prices=[...root.querySelectorAll('.merchant-purchase-price')];
      return {width:innerWidth,overflow:root.scrollWidth-root.clientWidth,priceSizes:prices.map(e=>getComputedStyle(e).fontSize),priceText:prices.map(e=>e.textContent),walletSize:getComputedStyle(document.getElementById('strat-gold')).fontSize,priceOverflow:prices.map(e=>e.scrollWidth-e.clientWidth)};
    });assert.ok(metrics.overflow<=2);assert.ok(metrics.priceSizes.every(s=>parseFloat(s)>=18));assert.ok(metrics.priceText.every(s=>s.includes('9,876,543,210G')));assert.ok(metrics.priceOverflow.every(n=>n<=2));layouts.push(metrics);await shot(`07-merchant-${w}`);
  }
  report.checks.numericLayouts=layouts;
  const prior=await page.evaluate(()=>g.gold);await page.locator('[data-buy]:not([disabled])').first().click();assert.ok((await page.evaluate(()=>g.gold))<prior);report.checks.merchantPurchase=true;
  await context.close();

  // Fresh studio profile: the game manifest itself must survive the first offline restart.
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
  await tab.goto(base);await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');
  await tab.waitForFunction(async()=>{const requests=await(await caches.open('game-iron-squad-v200')).keys();return navigator.serviceWorker.controller&&requests.length>=112&&requests.some(r=>r.url.endsWith('/iron-squad/sw-assets.js'));});
  await tab.evaluate(()=>gameStudioInstance.activeGame.saveGame());await offline.setOffline(true);await tab.reload();await tab.waitForTimeout(500);
  const version=await tab.locator('[data-version-for="iron-squad"]').textContent();assert.ok(version.includes('6.0.1'));await tab.click('[data-game-id="iron-squad"]');await tab.locator('[data-slot-id]').first().click();await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);report.checks.offline={version,resumed:true};await tab.screenshot({path:`${out}/08-offline-resume.png`});
  await offline.close();assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
}finally{await browser.close();writeFileSync(`${out}/ui.json`,JSON.stringify(report,null,2));}
