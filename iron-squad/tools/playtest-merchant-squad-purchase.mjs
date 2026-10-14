import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/merchant-squad-v6.8.2-20261013';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    const fixture=await page.evaluate(async()=>{
      const g=qualityGame;g.stopGameLoop();g._merchantShopClose?.();g.closeSoldierDetail();g.closeStrategyModal();g.currentDungeon=null;g.career.status='enlisted';g.restTimer=0;g.monsters=[];g.squad=[];g.reserves=[];
      const {generateRandomDrop}=await import('/iron-squad/js/index.js'),{rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js');
      const make=(cls,name,strength)=>{const p=rollAttributeProfile(cls,'AVERAGE',()=>.5,true);p.innate.strength=strength;const s=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',attributeProfile:p});s.level=12;s.name=name;s.isPersonalGuard=true;s.gold=700;s.isDown=false;s.dead=false;g.recalcSoldierStats(s);g.squad.push(s);return s;};
      const soldier=make('HEAVY','ヨウ・ガレイン',100),mage=make('MAGE','ミラ・セレス',3),main=make('LIGHT','本隊の兵士',60);main.isPersonalGuard=false;
      const weapon=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:'crossbow',tier:3,quality:1,id:'browser-squad-weapon',merchant:true,random:()=>.5});weapon._merchantPrice=250;
      const armor=generateRandomDrop(0,'normal',{type:'ARMOR',tier:7,quality:1,id:'browser-heavy-armor',merchant:true,random:()=>.5});armor._merchantPrice=350;
      const m=g.merchants[0];m.dead=false;m.isDown=false;m.returningToBase=false;m.hp=m.maxHp||100;Object.assign(m,{stock:[weapon,armor],catalogVersion:4,stockPhase:g.phase,stockTier:2});g.nation.armament.techTier=1;g.gold=2000;g.treasury=9000;Object.assign(g.player,{x:m.x,y:m.y,hp:g.player.maxHp,isDown:false});
      window.merchantSquadQA={g,soldier,mage,m,weapon,armor,oldWeapon:soldier.equipped.weapon,commander:g.equipped.weapon};g.openMerchantShop(m);document.querySelector('#merchant-shop-popup [data-merchant-section="trade"]')?.click();
      return {soldierId:soldier.id,mageId:mage.id,mainId:main.id};
    });
    const options=await page.locator('#merchant-recipient option').evaluateAll(nodes=>nodes.map(n=>n.value));assert.equal(options.length,3);assert.ok(!options.includes(fixture.mainId));assert.equal(await page.locator('#merchant-recipient').inputValue(),'commander');
    await page.selectOption('#merchant-recipient',fixture.soldierId);
    assert.match(await page.locator('.merchant-stock-card .equip-cmp-head').first().innerText(),/ヨウ・ガレインの現装備比/);assert.equal(await page.locator('[data-buy]:not([data-inherit])').first().isEnabled(),true);
    const ui=await page.evaluate(()=>{const popup=document.querySelector('#merchant-shop-popup'),select=popup.querySelector('#merchant-recipient');return {selectHeight:select.getBoundingClientRect().height,selectFont:parseFloat(getComputedStyle(select).fontSize),overflow:popup.querySelector('.transfer-popup-container').scrollWidth>innerWidth,paused:qualityGame.dialogOpen||qualityGame.isDialogOpen||qualityGame.inDialog};});
    assert.ok(ui.selectHeight>=44);assert.ok(ui.selectFont>=16);assert.equal(ui.overflow,false);await page.screenshot({path:`${out}/choose-soldier-${size}.png`});
    await page.locator('[data-buy]:not([data-inherit])').first().click();
    const purchase=await page.evaluate(()=>{const q=merchantSquadQA;return {gold:q.g.gold,treasury:q.g.treasury,soldierGold:q.soldier.gold,equipped:q.soldier.equipped.weapon.id,weaponMirror:q.soldier.weapon.id,commanderUnchanged:q.g.equipped.weapon===q.commander,oldInBag:q.g.inventory.some(i=>i.id===q.oldWeapon.id),stock:q.m.stock.map(i=>i.id),recipient:document.getElementById('merchant-recipient').value,open:!document.getElementById('merchant-shop-popup').classList.contains('hidden')};});
    assert.equal(purchase.gold,1750);assert.equal(purchase.soldierGold,700);assert.equal(purchase.treasury,9000);assert.equal(purchase.equipped,'browser-squad-weapon');assert.equal(purchase.weaponMirror,purchase.equipped);assert.equal(purchase.commanderUnchanged,true);assert.equal(purchase.oldInBag,true);assert.equal(purchase.open,true);assert.equal(purchase.recipient,fixture.soldierId);
    await page.locator('[data-shop-group="armor"]').click();await page.selectOption('#merchant-recipient',fixture.mageId);assert.equal(await page.locator('[data-buy]:not([data-inherit])').first().isDisabled(),true);assert.match(await page.locator('.weapon-requirement').innerText(),/筋力不足/);await page.screenshot({path:`${out}/mage-requirement-${size}.png`});
    const checkpoint=await page.evaluate(()=>{const q=merchantSquadQA,snapshot=structuredClone(q.g.saveGame());q.g.resumeSavedGame(snapshot);return {equip:q.g.squad.find(s=>s.id===q.soldier.id)?.equipped.weapon.id,gold:q.g.gold};});assert.equal(checkpoint.equip,'browser-squad-weapon');assert.equal(checkpoint.gold,1750);
    results.push({viewport,options,ui,purchase,checkpoint});
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.8.2',results,pageErrors:errors,disposableBrowserStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
