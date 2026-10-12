import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const base=process.argv[2]||'http://127.0.0.1:8002',out='iron-squad/docs/previews/caster-defense-20261013';mkdirSync(out,{recursive:true});
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'],report={version:release.gameVersion,cache:release.version,checks:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
 await page.evaluate(async()=>{
   window.g=qualityGame;g.stopGameLoop();g.closeStrategyModal();
   window.gear=await import('/iron-squad/js/index.js');window.defense=await import('/iron-squad/js/defense-equipment.js?v=231');
   window.req=await import('/iron-squad/js/weapon-requirements.js?v=231');window.craft=await import('/iron-squad/js/crafting-rules.js?v=231');
   window.attributes=await import('/iron-squad/js/unit-attributes.js?v=231');window.nation=await import('/iron-squad/js/nation-rules.js?v=231');
   window.facilities=await import('/iron-squad/js/hq-facilities.js?v=201');window.initial=structuredClone(g.saveGame());
 });
 for(const [width,height]of [[390,844],[320,700],[844,390],[1280,800]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>{
     g.closeHeadquartersFacility(false);g.resumeSavedGame(structuredClone(initial));g.stopGameLoop();g.closeStrategyModal();
     g.nation=nation.normalizeNation({investment:18000});g.gold=1000000;g.workshopSelectedTier=9;
     g.workshopSupplyId='arcane-armor';g.workshopCraftId='ward-armor';g.materials=Object.fromEntries(Object.keys(craft.CRAFT_MATERIALS).map(k=>[k,10000]));
     const p=facilities.HEADQUARTERS_FACILITIES.find(f=>f.id==='smith');Object.assign(g.player,{x:p.x,y:p.y+24});g.openHeadquartersFacility('smith');
   });
   await page.waitForTimeout(150);
   const text=await page.locator('#hq-facility-dialog').innerText();assert.match(text,/魔導のローブ/);assert.match(text,/必要筋力3/);assert.match(text,/魔力補正/);assert.match(text,/バリア/);
   const before=await page.evaluate(()=>({gold:g.gold,bag:g.inventory.length}));await page.locator('#btn-workshop-buy').scrollIntoViewIfNeeded();await page.click('#btn-workshop-buy');
   const purchased=await page.evaluate(()=>({gold:g.gold,bag:g.inventory.length,item:g.inventory.at(-1)}));
   assert.equal(purchased.bag,before.bag+1);assert.ok(purchased.gold<before.gold);assert.equal(purchased.item.armorStyle,'arcane');assert.ok(purchased.item.stats.magicBonus>0);
   await page.locator('#btn-workshop-craft').scrollIntoViewIfNeeded();await page.click('#btn-workshop-craft');
   const crafted=await page.evaluate(()=>g.inventory.at(-1));assert.equal(crafted.armorStyle,'ward');assert.equal(crafted.craftOnly,true);assert.ok(crafted.stats.barrier>purchased.item.stats.barrier);
   const layout=await page.evaluate(()=>{const p=document.getElementById('hq-facility-dialog').getBoundingClientRect();return {left:p.left,right:p.right,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};});assert.ok(layout.left>=0&&layout.right<=layout.width);assert.equal(layout.overflow,false);
   await page.screenshot({path:`${out}/workshop-${width}.png`});report.checks.push({width,height,purchased:purchased.item.name,crafted:crafted.name,layout});
 }
 await page.setViewportSize({width:390,height:844});
 const result=await page.evaluate(()=>{
   g.closeHeadquartersFacility(false);g.closeStrategyModal();g.career.status='enlisted';g.sharedEquipBox=[];
   window.mage=g.createNewSoldier(null,{classKey:'MAGE',talent:'AVERAGE',attributeProfile:attributes.rollAttributeProfile('MAGE','AVERAGE',()=>.5,true)});
   mage.attributeProfile=attributes.rollAttributeProfile('MAGE','AVERAGE',()=>.5,true);mage._attributesNormalized=false;mage.isPersonalGuard=true;
   mage.equipped.armor=g.makeWorkshopItem(craft.craftRecipe('arcane-armor'),9);g.squad=[mage];g.reserves=[];g.recalcSoldierStats(mage);
   window.plate=gear.generateRandomDrop(0,'normal',{id:'test-heavy',type:'ARMOR',tier:25,armorStyle:null,quality:1,merchant:true,random:()=>.5});g.inventory.push(plate);
   const money=g.gold,old=g.equipped.armor;g.player.attributeProfile.innate.strength=10;g.recalcPlayerStats();const equip=g.equipItem(plate);
   const merchant=g.merchants[0];Object.assign(g.player,{x:merchant.x,y:merchant.y});Object.assign(merchant,{stock:[plate],catalogVersion:3,stockPhase:g.phase,stockTier:2});
   // This interaction uses an explicit ordinary market item, without a restock.
   plate._merchantPrice=100;g.nation.armament.techTier=1;g.openMerchantShop(merchant);
   return {equip,oldPreserved:g.equipped.armor===old,moneyPreserved:g.gold===money,canMage:req.canUseEquipment(mage,plate),requirement:req.equipmentRequirementText(mage,plate)};
 });
 assert.equal(result.equip,false);assert.equal(result.moneyPreserved,true);assert.equal(result.canMage,false);report.strength=result;
 await page.locator('[data-shop-group="armor"]').click();assert.match(await page.locator('.merchant-stock-card').innerText(),/筋力不足/);assert.match(await page.locator('[data-buy]').innerText(),/バッグへ/);
 const old=await page.evaluate(()=>g.equipped.armor?.id||null);await page.click('[data-buy]');assert.equal(await page.evaluate(()=>g.equipped.armor?.id||null),old);assert.ok(await page.evaluate(()=>g.inventory.some(i=>i.id==='test-heavy')));
 await page.screenshot({path:`${out}/heavy-unusable-390.png`});await page.evaluate(()=>g._merchantShopClose());
 await page.evaluate(()=>{g.openStrategyModal(true);document.getElementById('tab-strat-squad').click();g.openSoldierDetail(mage.id);});
 assert.match(await page.locator('.soldier-detail-panel').innerText(),/魔力補正/);assert.match(await page.locator('.soldier-detail-panel').innerText(),/バリア/);await page.screenshot({path:`${out}/mage-detail-390.png`});
 const combat=await page.evaluate(()=>{
   g.closeStrategyModal();g.closeSoldierDetail?.();Object.assign(g.player,{x:79360+220,y:79360+280});g.camera={x:g.player.x,y:g.player.y};
   Object.assign(mage,{x:g.player.x-30,y:g.player.y+20});mage.equipped.armor=g.makeWorkshopItem(craft.craftRecipe('ward-armor'),9);g.recalcSoldierStats(mage);mage.hp=mage.maxHp;mage.dodge=0;
   defense.updateEquipmentBarrier(mage,30);const full=mage.equipmentBarrier;g.damageTarget(mage,40,{environmental:true});const damaged=mage.equipmentBarrier;
   const saved=g.saveGame();g.resumeSavedGame(structuredClone(saved));g.stopGameLoop();g.closeStrategyModal();const restored=g.squad.find(u=>u.id===mage.id);g.camera={x:g.player.x,y:g.player.y};g.render();
   return {full,damaged,restored:restored.equipmentBarrier,delay:restored.equipmentBarrierDelay};
 });assert.ok(combat.damaged<combat.full);assert.equal(combat.restored,combat.damaged);assert.equal(combat.delay,8);report.combat=combat;
 await page.screenshot({path:`${out}/field-ward-390.png`});
 const missing=[];for(const path of release.files){const response=await context.request.get(`${base}/iron-squad/${path}`);if(!response.ok())missing.push(path);}assert.deepEqual(missing,[]);report.assets=release.files.length;
 await context.close();
 const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
 await tab.goto(base);await tab.waitForFunction(()=>navigator.serviceWorker.controller);
 await tab.waitForFunction(async({cache,total})=>(await(await caches.open(cache)).keys()).length>=total,{cache:`game-iron-squad-${release.version}`,total:release.files.length},{timeout:45000});
 await offline.setOffline(true);await tab.reload();await tab.click('[data-game-id="iron-squad"]');
 await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');
 await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
 const offlineResult=await tab.evaluate(async()=>{
   const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();g.nation=(await import('/iron-squad/js/nation-rules.js?v=231')).normalizeNation({investment:6000});
   const facilities=await import('/iron-squad/js/hq-facilities.js?v=201'),p=facilities.HEADQUARTERS_FACILITIES.find(f=>f.id==='smith');
   Object.assign(g.player,{x:p.x,y:p.y+24});g.gold=100000;g.workshopSelectedTier=1;g.workshopSupplyId='arcane-armor';g.openHeadquartersFacility('smith');
   document.getElementById('btn-workshop-buy').click();const item=g.inventory.at(-1);return {style:item.armorStyle,bonus:item.stats.magicBonus,receipt:document.querySelector('.workshop-receipt strong').textContent};
 });assert.equal(offlineResult.style,'arcane');assert.ok(offlineResult.bonus>0);assert.equal(offlineResult.receipt,'購入完了');report.offline=offlineResult;
 await tab.screenshot({path:`${out}/offline-390.png`});await offline.close();
 assert.deepEqual(report.errors,[]);console.log('PASS: 4 responsive workshops, purchases/crafts, unusable plate bag delivery, caster detail, barrier damage/save, all cache assets and offline cold boot/purchase');
}catch(error){report.failure=error.stack;throw error;}
finally{await browser.close();writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2));}
