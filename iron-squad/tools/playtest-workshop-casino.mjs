// One disposable Chrome context, followed by a resize of the same page.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const version=manifest.GAME_ASSETS['iron-squad'].gameVersion,out='iron-squad/docs/previews',errors=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{
    const g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.squad=[];g.reserves=[];g.monsters=[];g.merchants=[];g.civilians=[];g.gateGuards=[];g.updateSpawns=()=>{};g.restTimer=0;g.currentQuest=null;
    g.enterDungeon(g.dungeons.find(d=>d.id==='dungeon_goblin_mines'));g.monsters=[];g.dungeonVault.unlocked=false;
    Object.assign(g.player,{x:850,y:g.currentDungeon.height/2,atkCooldown:100});g.camera={x:860,y:g.player.y-15};g.zoom=1.8;
    g.materials={};g.dropsOnField=Array.from({length:3},(_,i)=>({x:g.player.x+60+i*20,y:g.player.y-28+i*20,remainingLife:60,
      item:{type:'MATERIAL',tier:1,name:'堅木材などの素材',materials:{wood:4,essence:2},color:'#b19165'}}));
    window.__materialBag=g.inventory.length;g.resizeCanvas();g.updateStatsUI(true);g.render();
  });
  await page.screenshot({path:`${out}/material-ground-mobile-v${version}.png`});
  const pickup=await page.evaluate(()=>{const g=qualityGame;g.update(.6);g.render();return {wood:g.materials.wood,essence:g.materials.essence,drops:g.dropsOnField.length,bagUnchanged:g.inventory.length===__materialBag};});
  assert.equal(pickup.wood,12);assert.equal(pickup.essence,6);assert.equal(pickup.drops,0);assert.ok(pickup.bagUnchanged);
  await page.evaluate(async()=>{
    const g=qualityGame;g.exitDungeon();const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=277');
    g.nation=normalizeNation({investment:90000});g.gold=100000;g.enterDungeon(g.dungeons.find(d=>d.id==='royal_castle_town'));g.render();
  });
  await page.click('#btn-strategy');await page.click('#tab-strat-nation');
  await page.selectOption('#workshop-tier','9');await page.selectOption('#workshop-supply','weapon-axe');
  const beforeBuy=await page.evaluate(()=>({gold:qualityGame.gold,count:qualityGame.inventory.length}));
  await page.click('#btn-workshop-buy');
  const supply=await page.evaluate(()=>{const g=qualityGame,i=g.inventory.at(-1);return {gold:g.gold,count:g.inventory.length,type:i.type,weapon:i.weaponStyle,tier:i.tier};});
  assert.equal(supply.weapon,'axe');assert.equal(supply.tier,9);assert.equal(supply.count,beforeBuy.count+1);assert.ok(supply.gold<beforeBuy.gold);
  await page.selectOption('#workshop-tier','1');await page.selectOption('#workshop-craft','weapon-sword');
  await page.locator('#btn-workshop-craft').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/workshop-craft-mobile-v${version}.png`});
  await page.click('#btn-workshop-craft');
  const craft=await page.evaluate(()=>{const g=qualityGame,i=g.inventory.at(-1);return {wood:g.materials.wood,essence:g.materials.essence,crafted:i.craftOnly,protected:i.favorite,recipe:i.craftRecipeId,tier:i.tier};});
  assert.equal(craft.wood,2);assert.equal(craft.essence,3);assert.equal(craft.recipe,'weapon-sword');assert.ok(craft.crafted&&craft.protected);
  await page.selectOption('#workshop-craft','armor');assert.equal(await page.locator('#btn-workshop-craft').isDisabled(),true,'missing material disables the next recipe');
  await page.locator('#casino-bet').fill('500');await page.locator('#casino-bet').dispatchEvent('change');
  await page.click('[data-bet-mult="2"]');await page.click('[data-bet-mult="10"]');await page.click('[data-bet-add]');
  assert.equal(await page.evaluate(()=>qualityGame.nation.casino.bet),10100);
  const pokerGold=await page.evaluate(()=>qualityGame.gold);await page.click('#btn-casino-poker');
  assert.equal(await page.evaluate(()=>qualityGame.gold),pokerGold-10100);
  await page.click('[data-poker-hold="0"]');await page.click('[data-poker-hold="2"]');
  await page.locator('#casino-bet').fill('50000');await page.locator('#casino-bet').dispatchEvent('change');
  await page.locator('.poker-hand').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/casino-poker-mobile-v${version}.png`});
  const active=await page.evaluate(()=>{
    const g=qualityGame,p=structuredClone(g.nation.casino.poker),saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.stopGameLoop();
    if(g.currentDungeon?.kind!=='town')g.enterDungeon(g.dungeons.find(d=>d.id==='royal_castle_town'));
    g.openStrategyModal(true);g._selectStratTab('nation');return {before:p,after:structuredClone(g.nation.casino.poker),nextBet:g.nation.casino.bet};
  });
  assert.deepEqual(active.before,active.after);assert.equal(active.after.bet,10100);assert.equal(active.nextBet,50000);
  const drawGold=await page.evaluate(()=>qualityGame.gold);await page.click('#btn-casino-poker');
  const poker=await page.evaluate(()=>{const g=qualityGame;return {gold:g.gold,payout:g.nation.casino.poker.payout,status:g.nation.casino.poker.status,bet:g.nation.casino.poker.bet,held:g.nation.casino.poker.held};});
  assert.equal(poker.gold,drawGold+poker.payout);assert.equal(poker.status,'settled');assert.equal(poker.bet,10100);
  assert.equal(await page.locator('#btn-casino-poker').isDisabled(),true);
  const slotGold=await page.evaluate(()=>qualityGame.gold);await page.click('#btn-casino-slot');
  const slot=await page.evaluate(()=>({gold:qualityGame.gold,...qualityGame.nation.casino.slot}));
  assert.equal(slot.gold,slotGold-50000+slot.payout);assert.equal(slot.bet,50000);assert.equal(await page.locator('#btn-casino-slot').isDisabled(),true);
  await page.locator('.slot-reels').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/casino-slot-mobile-v${version}.png`});
  const mobile=await page.evaluate(()=>({noOverflow:document.documentElement.scrollWidth<=innerWidth,cardsFit:[...document.querySelectorAll('.poker-card')].every(e=>e.getBoundingClientRect().width>35),cardsReadable:[...document.querySelectorAll('button.poker-card')].every(e=>{
    const s=getComputedStyle(e);return ['rgb(238, 233, 217)','rgb(255, 246, 206)'].includes(s.backgroundColor)&&['rgb(34, 44, 50)','rgb(168, 63, 69)'].includes(s.color);
  }),dice:document.getElementById('nation-facilities').textContent.match(/ダイス|一振り|出目/)}));
  assert.ok(mobile.noOverflow&&mobile.cardsFit&&mobile.cardsReadable);assert.equal(mobile.dice,null);
  await page.setViewportSize({width:1280,height:800});await page.locator('.poker-hand').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/casino-desktop-v${version}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);const report={gameVersion:version,pickup,supply,craft,activeHandSaved:true,paidBetUnchanged:true,poker,slot,mobile,pageErrors:errors};
  writeFileSync(`${out}/workshop-casino-playtest-v${version}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
