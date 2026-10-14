import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const mode=process.argv[2]||'before',out='iron-squad/docs/validation/upgrade-taps-v6.11.18';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={mode,cpuThrottle:4,disposableStorage:true,input:'30 consecutive actual DOM button clicks in one main-thread task'};
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(()=>{
 const NativeWorker=Worker;window.saveProbe={sent:0,pending:0,peak:0,replies:0,firstBaseBytes:0,heap:[]};
 window.Worker=class extends NativeWorker{
  constructor(url,opts){super(url,opts);this.saveProbe=String(url).includes('/save-worker.js');if(this.saveProbe)this.addEventListener('message',()=>{saveProbe.pending--;saveProbe.replies++;});}
  postMessage(data,...args){if(this.saveProbe){saveProbe.sent++;saveProbe.pending++;saveProbe.peak=Math.max(saveProbe.peak,saveProbe.pending);if(!saveProbe.firstBaseBytes)saveProbe.firstBaseBytes=new TextEncoder().encode(data.base).length;}return super.postMessage(data,...args);}
 };
});
try{
 await page.goto('http://127.0.0.1:8000/');await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('強化の連打確認');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 report.fixture=await page.evaluate(async cache=>{
  const g=qaGame,{saveSlots}=await import('/iron-squad/js/save-slots.js?v='+cache);
  window.qaSlots=saveSlots;g.stopGameLoop();g.closeStrategyModal();g.gold=100000000;g.equipped.weapon=g.createSupplyEquipment('WEAPON',g.player,1);g.recalcPlayerStats();g.saveGame();
  const slots=saveSlots.list(),slot=slots.find(s=>s.id===g.activeSlotId),snapshot=g.saveGame({persist:false});
  snapshot.inventory=[];snapshot.dungeons=[];snapshot.fogExplored=[];snapshot.squad=snapshot.squad.slice(0,8);let bytes=0;do{snapshot.inventory.push({...structuredClone(g.equipped.weapon),id:`historical-${snapshot.inventory.length}`});slot.checkpoint={place:'本陣',data:snapshot,savedAt:Date.now()};bytes=new TextEncoder().encode(JSON.stringify(slots)).length;}while(bytes<610000);
  localStorage.setItem('game_studio_ironsquad_save_slots_v1',JSON.stringify(slots));saveSlots.list();g.openStrategyModal(true);g.renderStrategyUI();
  g._selectStratTab('troops');g._syncTroopsSubView('equip');document.getElementById('commander-equipment').open=true;
  window.qaSourceRaw=JSON.stringify(slots);window.qaStart={gold:g.gold,upgrade:g.equipped.weapon.upgrade||0};return {sourceUtf8Bytes:bytes,sourceCharacters:JSON.stringify(slots).length};
 },mode==='before'?'262':'268');
 await page.waitForFunction(()=>saveProbe.pending===0,null,{timeout:120000});await page.evaluate(()=>{localStorage.setItem('game_studio_ironsquad_save_slots_v1',qaSourceRaw);qaSlots.list();Object.assign(saveProbe,{sent:0,pending:0,peak:0,replies:0,firstBaseBytes:0,heap:[]});});
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 report.burst=await page.evaluate(async()=>{
  const start=performance.now(),heapStart=performance.memory?.usedJSHeapSize;
  for(let i=0;i<30;i++){document.querySelector('.btn-up-equipped[data-slot="weapon"]').click();saveProbe.heap.push(performance.memory?.usedJSHeapSize||null);}
  return {elapsedMs:performance.now()-start,heapStart,heapPeak:Math.max(...saveProbe.heap.filter(Boolean)),...saveProbe,heap:undefined,gold:qaGame.gold,upgrade:qaGame.equipped.weapon.upgrade};
 });
 await page.waitForFunction(()=>saveProbe.pending===0,null,{timeout:120000});await page.evaluate(()=>qaGame._pendingAutoSave);
 report.final=await page.evaluate(()=>{const saved=qaSlots.get(qaGame.activeSlotId).data;return {...saveProbe,heap:undefined,upgrade:saved.equipped.weapon.upgrade,gold:saved.gold,expectedUpgrade:qaGame.equipped.weapon.upgrade,expectedGold:qaGame.gold};});
 assert.equal(report.final.upgrade,report.final.expectedUpgrade);assert.equal(report.final.gold,report.final.expectedGold);assert.equal(report.final.upgrade,30+(await page.evaluate(()=>qaStart.upgrade)));
 if(mode==='before')assert.ok(report.burst.peak>1,'must verify the suspected queued-worker cause before editing');else assert.equal(report.final.peak,1);
 await page.screenshot({path:`${out}/${mode}-single-upgrades.png`});
 if(mode!=='before'){
  report.bulkQuote=await page.evaluate(async()=>{
   const g=qaGame,{planEvenUpgrades}=await import('/iron-squad/js/even-upgrade.js?v=268');
   for(const [slot,type]of Object.entries({weapon:'WEAPON',shield:'SHIELD',helmet:'HELMET',armor:'ARMOR',gloves:'GLOVES',legs:'LEGS',amulet:'AMULET'}))g.equipped[slot]=g.createSupplyEquipment(type,g.player,1);
   g.gold=5000;g.recalcPlayerStats();g.renderStrategyUI();window.qaBulkBefore=JSON.stringify(g.equipped);
   const q=planEvenUpgrades(g.equipped,g.gold);window.qaBulkCounts={};
   for(const key of ['saveGame','recalcPlayerStats','renderStrategyUI','updateStatsUI']){const original=g[key];g[key]=function(...args){qaBulkCounts[key]=(qaBulkCounts[key]||0)+1;return original.apply(this,args);};}
   return {count:q.count,spent:q.spent,levels:q.entries.map(e=>e.to)};
  });
  await page.locator('#btn-even-upgrade').click();
  const text=await page.locator('#even-upgrade-message').innerText();assert.ok(text.includes(report.bulkQuote.count.toLocaleString()));assert.ok(text.includes(report.bulkQuote.spent.toLocaleString()));
  await page.screenshot({path:`${out}/even-confirm-mobile.png`});await page.locator('[data-even-upgrade="cancel"]').click();
  assert.equal(await page.evaluate(()=>qaGame.gold===5000&&qaBulkBefore===JSON.stringify(qaGame.equipped)&&Object.keys(qaBulkCounts).length===0),true);
  await page.locator('#btn-even-upgrade').click();await page.locator('[data-even-upgrade="accept"]').click();await page.evaluate(()=>qaGame._pendingAutoSave);
  report.bulkResult=await page.evaluate(()=>({counts:{...qaBulkCounts},gold:qaGame.gold,levels:Object.values(qaGame.equipped).map(i=>i.upgrade),savedGold:qaSlots.get(qaGame.activeSlotId).data.gold}));
  assert.deepEqual(report.bulkResult.counts,{recalcPlayerStats:1,saveGame:1,renderStrategyUI:1,updateStatsUI:1});assert.equal(report.bulkResult.gold,5000-report.bulkQuote.spent);assert.equal(report.bulkResult.savedGold,report.bulkResult.gold);assert.deepEqual(report.bulkResult.levels,report.bulkQuote.levels);assert.ok(Math.max(...report.bulkResult.levels)-Math.min(...report.bulkResult.levels)<=1);
  await page.screenshot({path:`${out}/even-completed-mobile.png`});
  // A real synchronous visibility handler must win over a running and a waiting upgrade save.
  report.hidden=await page.evaluate(()=>{
   const g=qaGame;g.gold=10000;const pending=[];
   for(let i=0;i<5;i++){document.querySelector('.btn-up-equipped[data-slot="weapon"]').click();pending.push(g._pendingAutoSave);}
   g.gold=777;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});g.handleVisibility();delete document.hidden;
   window.qaHiddenPending=Promise.all(pending);return {expectedUpgrade:g.equipped.weapon.upgrade,expectedGold:g.gold};
  });await page.evaluate(()=>qaHiddenPending);await page.waitForFunction(()=>saveProbe.pending===0);
  Object.assign(report.hidden,await page.evaluate(()=>{const data=qaSlots.get(qaGame.activeSlotId).data;return {gold:data.gold,upgrade:data.equipped.weapon.upgrade};}));assert.equal(report.hidden.gold,report.hidden.expectedGold);assert.equal(report.hidden.upgrade,report.hidden.expectedUpgrade);
  await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>{qaGame.gold=5000;qaGame.renderStrategyUI();});await page.locator('#btn-even-upgrade').click();await page.screenshot({path:`${out}/even-confirm-desktop.png`});await page.locator('[data-even-upgrade="cancel"]').click();
 }
 report.errors=errors;assert.deepEqual(errors,[]);writeFileSync(`${out}/${mode}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(e){writeFileSync(`${out}/${mode}-failure.json`,JSON.stringify({error:String(e),report,errors},null,2)+'\n');throw e;}
finally{await browser.close();}

