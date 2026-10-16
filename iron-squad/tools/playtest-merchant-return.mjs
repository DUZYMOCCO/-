import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/merchant-return-v6.11.17';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={version:'6.11.17',disposableStorage:true};
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:8000/');await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('帰還する商人の確認');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 await page.evaluate(async()=>{
  const g=qaGame;window.qaCasualty=await import('/iron-squad/js/casualty-rules.js?v=286');window.qaAssist=await import('/iron-squad/js/rescue-assistance.js?v=267');
  g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.updateSpawns=()=>{};g.squad=[];g.reserves=[];g.civilians=[];g.gateGuards=[];g.currentQuest=null;g.currentDungeon=null;g.phaseTimer=100000;g.autoSaveClock=-10000;g.restTimer=0;
  g.player.x=80000;g.player.y=78900;g.camera={x:g.player.x,y:g.player.y};g.gold=10000000;g.revivalPotion=2;
  const m=g.merchants[0];Object.assign(m,{x:80040,y:78900});for(const e of m.escorts)Object.assign(e,{x:m.x+30,y:m.y+30});g.merchants=[m];g._merchantById=new Map([[m.id,m]]);window.qaMerchant=m;
  qaCasualty.markSoldierDown(g,m);g.refreshSupplyUI();g.render();
 });
 assert.equal(await page.locator('#btn-pad-revive').isEnabled(),true);
 await page.screenshot({path:`${out}/01-downed-merchant.png`});await page.locator('#btn-pad-revive').click();
 report.rescued=await page.evaluate(()=>({down:qaMerchant.isDown,returning:qaMerchant.returningToBase,reward:qaMerchant.rescueRewardGranted,potions:qaGame.revivalPotion}));assert.equal(report.rescued.down,false);assert.equal(report.rescued.returning,true);assert.equal(report.rescued.reward,true);assert.equal(report.rescued.potions,1);
 await page.evaluate(()=>{const g=qaGame;for(let i=0;i<60;i++)g.update(1/60);g.player.x=qaMerchant.x-35;g.player.y=qaMerchant.y;g.player.hp=g.player.maxHp*.5;g.checkMerchantProximity();g.render();});
 await page.screenshot({path:`${out}/02-returning-nearby.png`});await page.locator('#btn-open-merchant').click();
 assert.equal(await page.evaluate(()=>qaGame._tradingMerchant===qaMerchant),true);
 await page.locator('[data-merchant-section="recovery"]').click();assert.ok(await page.locator('.merchant-heal-button').isEnabled());await page.locator('.merchant-heal-button').click();await page.locator('.merchant-revival-button').click();
 report.services=await page.evaluate(()=>({hp:qaGame.player.hp,maxHp:qaGame.player.maxHp,potions:qaGame.revivalPotion}));assert.equal(report.services.hp,report.services.maxHp);assert.equal(report.services.potions,2);
 await page.screenshot({path:`${out}/03-recovery-while-returning.png`});await page.locator('.btn-close-merchant').click();await page.locator('[data-merchant-section="trade"]').click();
 const gold=await page.evaluate(()=>qaGame.gold);await page.locator('[data-buy]:not(:disabled)').first().click();assert.ok(await page.evaluate(()=>qaGame.gold)<gold);
 await page.screenshot({path:`${out}/04-trade-while-returning.png`});
 report.paused=await page.evaluate(async()=>{const g=qaGame,m=qaMerchant,start={x:m.x,y:m.y};const {updateMerchants}=await import('/iron-squad/js/merchant-rules.js?v=286');for(let i=0;i<300;i++)updateMerchants(g,1/60);return {same:m.x===start.x&&m.y===start.y,open:!!g._merchantShopClose};});assert.ok(report.paused.same&&report.paused.open);
 await page.locator('.btn-close-merchant').click();await page.locator('[data-merchant-section="save"]').click();assert.ok(await page.locator('#merchant-shop-popup [data-supply="save"]').isEnabled());
 // Invoke the actual checkpoint method; the chooser UI is already covered by checkpoint tests.
 assert.equal(await page.evaluate(()=>qaGame.saveCheckpoint()),true);await page.screenshot({path:`${out}/05-checkpoint-while-returning.png`});
 report.checkpointRestored=await page.evaluate(()=>{const g=qaGame;if(!g.loadCheckpoint())return false;g.stopGameLoop();window.qaMerchant=g._tradingMerchant;return !!qaMerchant?.returningToBase&&!!g._merchantShopClose;});assert.equal(report.checkpointRestored,true);
 await page.locator('.btn-close-merchant').click();await page.locator('.transfer-popup-close-btn').click();
 report.arrived=await page.evaluate(()=>{const g=qaGame,m=qaMerchant,bonuses=JSON.stringify(g.rescueBonuses),ids=JSON.stringify(g.rescueRewardIds),start=m.x;for(let i=0;i<1200&&m.returningToBase;i++)g.update(1/60);g.player.x=m.x-35;g.player.y=m.y;g.camera.x=g.player.x;g.camera.y=g.player.y;g.render();return {moved:m.x!==start,returning:m.returningToBase,atHome:Math.hypot(m.x-m.homeX,m.y-m.homeY)<1,rewardUnchanged:bonuses===JSON.stringify(g.rescueBonuses)&&ids===JSON.stringify(g.rescueRewardIds),markerCleared:g._tradingMerchant===null};});assert.ok(report.arrived.moved&&report.arrived.atHome&&report.arrived.rewardUnchanged&&report.arrived.markerCleared);assert.equal(report.arrived.returning,false);await page.screenshot({path:`${out}/06-arrived.png`});
 await page.evaluate(()=>{
  const g=qaGame;g.player.x=80000;g.player.y=76000;g.camera.x=80000;g.camera.y=76000;
  const medic=g.createNewSoldier(null,{classKey:'MEDIC',talent:'AVERAGE'});Object.assign(medic,{name:'ルチア',isPersonalGuard:true,x:80000,y:76000,mana:100,maxMana:100,speed:100});g.squad=[medic];
  Object.assign(qaMerchant,{x:80260,y:76000});qaMerchant.escorts=[];qaCasualty.markSoldierDown(g,qaMerchant);g.update(1/60);g.render();
 });
 assert.equal(await page.locator('.npc-rescue-request').count(),1);
 report.nonmodal=await page.evaluate(()=>{const g=qaGame,before=g.worldTime;g.joystick={active:true,dirX:0,dirY:1};const y=g.player.y;for(let i=0;i<30;i++)g.update(1/60);g.joystick.active=false;g.render();return {clockAdvanced:g.worldTime>before,moved:g.player.y>y,unpaused:g.inBattle&&!g.container.classList.contains('dialog-open'),stillDown:qaMerchant.isDown};});assert.ok(Object.values(report.nonmodal).every(Boolean));
 await page.screenshot({path:`${out}/07-medic-question-mobile.png`});await page.locator('[data-rescue-answer="true"]').click();
 report.medic=await page.evaluate(()=>{const g=qaGame,start=g.squad[0].x;for(let i=0;i<300&&qaMerchant.isDown;i++)g.update(1/60);g.render();return {approached:g.squad[0].x>start,revived:!qaMerchant.isDown,returning:qaMerchant.returningToBase,promptGone:!document.querySelector('.npc-rescue-request')};});assert.ok(Object.values(report.medic).every(Boolean));await page.screenshot({path:`${out}/08-medic-revived.png`});
 report.range=await page.evaluate(()=>{
  const g=qaGame;g.merchants=[];g._merchantWounded=[];const u=g.squad[0];Object.assign(u,{x:g.player.x+200,y:g.player.y});qaCasualty.markSoldierDown(g,u);g.revivalPotion=2;g.refreshSupplyUI();const far=document.getElementById('btn-pad-revive').disabled;u.x=g.player.x+120;g.refreshSupplyUI();const near=!document.getElementById('btn-pad-revive').disabled;g.useRevivalPotion();return {farDisabled:far,nearEnabled:near,revived:!u.isDown};
 });assert.ok(Object.values(report.range).every(Boolean));
 report.commander=await page.evaluate(()=>{
  const g=qaGame;const u=g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE'});Object.assign(u,{name:'ゲオルグ',isPersonalGuard:true,x:g.player.x+350,y:g.player.y,speed:100});g.squad=[u];g.revivalPotion=2;qaCasualty.downCommander(g);const start=u.x;g.update(1/60);const approaching=u.x<start&&g.player.isDown;for(let i=0;i<300&&g.player.isDown;i++)g.update(1/60);for(let i=0;i<30;i++)g.update(1/60);g.render();return {approaching,revived:!g.player.isDown,fullHP:g.player.hp===g.player.maxHp,potions:g.revivalPotion,notCarried:!g.player.carrierId};
 });assert.ok(report.commander.approaching&&report.commander.revived&&report.commander.fullHP&&report.commander.notCarried);assert.equal(report.commander.potions,1);await page.screenshot({path:`${out}/09-light-revives-commander.png`});
 await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>{const g=qaGame;g.squad[0].soldierClass='MEDIC';g.squad[0].mana=100;g.squad[0].maxMana=100;g.squad[0].revivalSkillCooldownUntil=0;g.squad[0].regrouping=false;g.squad[0].x=g.player.x;const m=qaMerchant;g.merchants=[m];Object.assign(m,{x:g.player.x+240,y:g.player.y,isDown:false,dead:false,hp:100});qaCasualty.markSoldierDown(g,m);g.update(1/60);g.render();});assert.equal(await page.locator('.npc-rescue-request').count(),1);await page.screenshot({path:`${out}/10-medic-question-desktop.png`});
 report.errors=errors;assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});writeFileSync(`${out}/failure.json`,JSON.stringify({error:String(error),report,errors,body:await page.locator('body').innerText().catch(()=>null)},null,2)+'\n');throw error;}
finally{await browser.close();}

