import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/random-merchant-v6.11.8';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');
  await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    const stock=await page.evaluate(async()=>{
      const g=qualityGame;g.stopGameLoop();g._merchantShopClose?.();g.closeStrategyModal();g.closeSoldierDetail();
      const {generateRandomDrop}=await import('/iron-squad/js/index.js'),{ensureMerchantCatalog}=await import('/iron-squad/js/merchant-catalog.js?v=258');
      g.currentDungeon=null;g.player.hp=g.player.maxHp;g.player.isDown=false;g.gold=1e7;
      const m=g.merchants.find(m=>!m.dead);m.featuredSoldPhase=0;m.returningToBase=false;m.isDown=false;m.hp=m.maxHp;
      ensureMerchantCatalog(g,m,generateRandomDrop,true);g.player.x=m.x;g.player.y=m.y;
      window.randomMerchantQA={g,m};g.openMerchantShop(m);
      return m.stock.map(i=>({id:i.id,type:i.type,weaponStyle:i.weaponStyle,armorStyle:i.armorStyle}));
    });
    assert.equal(stock.filter(i=>i.type==='WEAPON').length,2);assert.equal(stock.filter(i=>i.type!=='WEAPON').length,4);
    await page.locator('[data-merchant-section="trade"]').click();
    await page.locator('[data-shop-group="weapon"]').click();
    assert.equal(await page.locator('.merchant-stock-card').count(),2);
    await page.screenshot({path:`${out}/weapons-${size}.png`});
    await page.locator('[data-shop-group="armor"]').click();
    assert.equal(await page.locator('.merchant-stock-card').count(),4);
    await page.screenshot({path:`${out}/armor-${size}.png`});
    const overflow=await page.locator('.transfer-popup-container').evaluate(el=>el.scrollWidth>innerWidth);
    assert.equal(overflow,false);
    await page.locator('[data-shop-group="weapon"]').click();
    const bought=await page.locator('[data-buy]:not([data-inherit])').first().getAttribute('data-buy-id');
    await page.locator('[data-buy]:not([data-inherit])').first().click();
    const after=await page.evaluate(()=>{
      const {g,m}=randomMerchantQA,ids=m.stock.map(i=>i.id),saved=structuredClone(g.saveGame());
      g._merchantShopClose();g.resumeSavedGame(saved);g.stopGameLoop();g.closeStrategyModal();
      const restored=g.merchants.find(u=>u.id===m.id);g.player.x=restored.x;g.player.y=restored.y;g.openMerchantShop(restored);
      return {ids,restored:restored.stock.map(i=>i.id),total:restored.stock.length};
    });
    assert.equal(after.total,5);assert.equal(after.ids.includes(bought),false);assert.deepEqual(after.restored,after.ids);
    results.push({viewport,stock,overflow,bought,after});
  }
  assert.deepEqual(errors,[]);
  writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.11.8',results,pageErrors:errors,disposableBrowserStorage:true},null,2)+'\n');
  console.log(JSON.stringify({screenshots:4,results:results.map(r=>({viewport:r.viewport,total:r.stock.length,remaining:r.after.total})),pageErrors:errors}));
  await context.close();
}finally{await browser.close();}
