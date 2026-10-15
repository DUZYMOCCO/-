import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/casino-v6.11.21';mkdirSync(out,{recursive:true});
const server=await startQaServer(),browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={version:'6.11.21',screens:[],disposableStorage:true,expectation:JSON.parse(readFileSync('iron-squad/docs/backups/casino-expectation-v6.11.21.json','utf8'))};
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]) {
  const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('カジノ画面の検証');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
  await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
  await page.evaluate(async()=>{
   const g=qaGame,{HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js?v=277');g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.restTimer=0;g.currentDungeon=null;g.gold=50000;
   const site=HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');Object.assign(g.player,{x:site.x,y:site.y+24});g.camera={x:site.x,y:site.y};g.render();g.openHeadquartersFacility('casino');
   window.casinoRedraws=0;g.renderStrategyUI=()=>casinoRedraws++;
  });
  const shot=async name=>{await page.screenshot({path:`${out}/${viewport.width}-${name}.png`});const dims=await page.locator('.casino-panel').evaluate(root=>({scrollWidth:root.scrollWidth,width:root.clientWidth,bodyScrollWidth:document.body.scrollWidth,viewport:innerWidth}));assert.ok(dims.scrollWidth<=dims.width+1,JSON.stringify(dims));assert.ok(dims.bodyScrollWidth<=dims.viewport);report.screens.push({viewport,name,...dims});};
  await shot('lobby');await page.locator('[data-casino-page="slot"]').click();
  const slot=await page.evaluate(()=>{const original=Math.random;try{Math.random=()=>.99;const gold=qaGame.gold,first=qaGame.spinCasinoSlot(),second=qaGame.spinCasinoSlot();return {first,second,gold,after:qaGame.gold,result:qaGame.nation.casino.slot};}finally{Math.random=original;}});
  assert.ok(slot.first);assert.equal(slot.second,false);assert.equal(slot.result.wins.length,8);await page.waitForTimeout(1150);await shot('slot-win');
  await page.locator('[data-casino-page="lobby"]').click();await page.locator('[data-casino-page="poker"]').click();await page.locator('#btn-casino-poker').click();await page.waitForTimeout(220);await shot('poker-dealing');await page.waitForTimeout(700);
  // Deterministic already-dealt fixture, then the actual hold and settle buttons.
  await page.evaluate(()=>{const h=qaGame.nation.casino.poker;h.hand=[9,22,35,48,0];h.deck=Array.from({length:52},(_,i)=>i).filter(i=>!h.hand.includes(i));h.held.fill(false);qaGame.setCasinoBet(10);});
  for(let i=0;i<5;i++)await page.locator(`[data-poker-hold="${i}"]`).click();await page.locator('#btn-casino-poker').click();await page.waitForTimeout(950);assert.equal(await page.locator('.casino-award strong').textContent(),'フォーカード');await shot('poker-settled');
  await page.locator('[data-casino-page="lobby"]').click();await page.evaluate(()=>{qaGame.squad=[];qaGame.reserves=[];});await page.locator('[data-casino-page="arena"]').click();assert.ok((await page.locator('.casino-panel').textContent()).includes('6人必要'));
  await page.evaluate(()=>{const g=qaGame;g.squad=[];g.reserves=[];for(let i=0;i<6;i++){const s=g.createNewSoldier(null,{classKey:['LIGHT','HEAVY','ARCHER'][i%3],talent:'AVERAGE',level:5});s.isPersonalGuard=true;g.squad.push(s);}g.shuffleCasinoArena();window.arenaBefore=JSON.stringify(g.squad.map(s=>({...s,arenaRecord:undefined})));});
  await shot('arena-before');await page.locator('[data-arena-bet="0"]').click();await page.waitForTimeout(1500);await shot('arena-fight');await page.locator('#btn-arena-fast').click();await shot('arena-result');
  const result=await page.evaluate(()=>({redraws:casinoRedraws,unchanged:arenaBefore===JSON.stringify(qaGame.squad.map(s=>({...s,arenaRecord:undefined}))),records:qaGame.squad.map(s=>s.arenaRecord)}));assert.equal(result.redraws,0);assert.ok(result.unchanged);assert.ok(result.records.every(r=>r.wins+r.losses===1));report[viewport.width]={slot,result};
  // Reduced motion is shorter, but still enforces the action lock.
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>qaGame.openCasinoPage('slot'));await page.locator('#btn-casino-slot').click();assert.ok(await page.locator('#btn-casino-slot').isDisabled());await page.waitForTimeout(400);assert.ok(await page.locator('#btn-casino-slot').isEnabled());
  await context.close();
 }
 assert.deepEqual(errors,[]);report.errors=errors;writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({screens:report.screens.length,errors}));
}finally{await browser.close();await server.close();}
