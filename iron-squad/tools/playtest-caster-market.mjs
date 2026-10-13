import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/caster-market-v6.8.3-20261013';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    const fixture=await page.evaluate(async()=>{
      const g=qualityGame;g.stopGameLoop();g._merchantShopClose?.();g.closeSoldierDetail();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.currentDungeon=null;g.career.status='enlisted';g.restTimer=0;g.monsters=[];g.squad=[];g.reserves=[];
      const {rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js'),{WORLD_SIZE,northSouthRoadX}=await import('/iron-squad/js/world.js');const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y);
      const units=[];for(const [i,cls] of ['MEDIC','MEDIC','MAGE','MAGE'].entries()){
        const p=rollAttributeProfile(cls,'AVERAGE',()=>.5,true);p.innate.strength=3;const u=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',attributeProfile:p});u.name=cls==='MAGE'?'魔法使いの確認':'衛生術師の確認';u.isPersonalGuard=true;u.gold=100;g.recalcSoldierStats(u);
        Object.assign(u,{x:x+(i%2?55:-35),y:y+(i<2?0:85),facingAngle:i%2?0:Math.PI,atkAnim:0,vx:0,vy:0,mana:cls==='MEDIC'?8:0,magicRecovering:cls==='MAGE'});units.push(u);
      }
      g.squad=units;Object.assign(g.player,{x:x-70,y:y-70,hp:g.player.maxHp,isDown:false});g.joystick={active:false,dirX:0,dirY:0};g.zoom=1.7;g.camera={x:x+10,y:y+115};g.resizeCanvas();g.updateStatsUI(true);
      const labels=[],original=g.ctx.fillText;g.ctx.fillText=function(text,...args){if(text==='MP不足'||text==='瞑想'){const t=this.getTransform();labels.push({text,a:t.a,d:t.d});}return original.call(this,text,...args);};g.render();g.ctx.fillText=original;
      window.casterMarketQA={g,units};return {labels,mageId:units[2].id,medicId:units[0].id};
    });assert.equal(fixture.labels.filter(l=>l.text==='MP不足').length,2);assert.equal(fixture.labels.filter(l=>l.text==='瞑想').length,2);assert.ok(fixture.labels.every(l=>l.a>0&&l.d>0));await page.screenshot({path:`${out}/readable-labels-${size}.png`});
    const stock=await page.evaluate(()=>{const q=casterMarketQA,{g}=q,m=g.merchants[0];g.player.x=m.x;g.player.y=m.y;g.gold=1e7;g.openMerchantShop(m);document.querySelector('#merchant-shop-popup [data-merchant-section="trade"]')?.click();q.m=m;return m.stock.filter(i=>i.merchantCasterSupply).map(i=>({id:i.id,type:i.type,weaponStyle:i.weaponStyle,armorStyle:i.armorStyle,stats:i.stats}));});assert.equal(stock.length,8);
    await page.selectOption('#merchant-recipient',fixture.mageId);assert.equal(await page.locator('[data-shop-group="caster"]').getAttribute('aria-selected'),'true');
    await page.screenshot({path:`${out}/caster-tab-${size}.png`});
    const mageHood=stock.find(i=>i.type==='HELMET'&&i.armorStyle==='arcane'),wand=stock.find(i=>i.weaponStyle==='wand');
    const card=page.locator('.merchant-stock-card').filter({has:page.locator(`[data-buy-id="${mageHood.id}"]`)});await card.scrollIntoViewIfNeeded();assert.match(await card.innerText(),/頭巾/);assert.match(await card.innerText(),/魔力補正/);assert.match(await card.innerText(),/装備可/);await page.screenshot({path:`${out}/mage-hood-${size}.png`});await card.locator('[data-buy]:not([data-inherit])').click();
    await page.locator(`[data-buy-id="${wand.id}"]:not([data-inherit])`).click();
    await page.selectOption('#merchant-recipient',fixture.medicId);const medicGloves=stock.find(i=>i.type==='GLOVES'&&i.armorStyle==='healing'),staff=stock.find(i=>i.weaponStyle==='staff');
    const gloveCard=page.locator('.merchant-stock-card').filter({has:page.locator(`[data-buy-id="${medicGloves.id}"]`)});await gloveCard.scrollIntoViewIfNeeded();assert.match(await gloveCard.innerText(),/手袋/);assert.match(await gloveCard.innerText(),/回復補正/);await page.screenshot({path:`${out}/healer-gloves-${size}.png`});await gloveCard.locator('[data-buy]:not([data-inherit])').click();await page.locator(`[data-buy-id="${staff.id}"]:not([data-inherit])`).click();
    const purchased=await page.evaluate(()=>{const {g,units,m}=casterMarketQA;return {mageHelmet:units[2].equipped.helmet.armorStyle,mageWeapon:units[2].weapon.weaponStyle,medicGloves:units[0].equipped.gloves.armorStyle,medicWeapon:units[0].weapon.weaponStyle,mageGold:units[2].gold,medicGold:units[0].gold,remainingSupplies:m.stock.filter(i=>i.merchantCasterSupply).length,overflow:document.querySelector('#merchant-shop-popup .transfer-popup-container').scrollWidth>innerWidth};});assert.equal(purchased.mageHelmet,'arcane');assert.equal(purchased.mageWeapon,'wand');assert.equal(purchased.medicGloves,'healing');assert.equal(purchased.medicWeapon,'staff');assert.equal(purchased.mageGold,100);assert.equal(purchased.medicGold,100);assert.equal(purchased.remainingSupplies,4);assert.equal(purchased.overflow,false);results.push({viewport,labels:fixture.labels,stock,purchased});
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.8.3',results,pageErrors:errors,disposableBrowserStorage:true},null,2)+'\n');console.log(JSON.stringify({results:results.map(r=>({viewport:r.viewport,labels:r.labels,purchased:r.purchased})),pageErrors:errors}));await context.close();
}finally{await browser.close();}
