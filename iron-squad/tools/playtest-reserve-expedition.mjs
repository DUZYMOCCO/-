import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/reserve-expedition-v6.11.6-20261014';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log(e.message);});
 await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const size=viewport.width===390?'mobile':'desktop';await page.setViewportSize(viewport);
  await page.evaluate(async()=>{
   const g=qualityGame,{FARM_X,FARM_Y,farmPosts}=await import('/iron-squad/js/reserve-farm.js?v=256'),{activeExpeditionReserves}=await import('/iron-squad/js/expedition-rules.js?v=256');
   g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.career.status='enlisted';g.currentDungeon=null;g.expeditionPicks={};g.monsters=[];g.updateSpawns=()=>{};g.phaseTimer=1e6;
   for(const u of g.squad)u.isPersonalGuard=false;
   const make=(id,name,cls)=>Object.assign(g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE'}),{id,name,isPersonalGuard:false,platoonId:2,x:79360,y:79360});
   g.reserves=[make('reserve-a','予備の重装兵','HEAVY'),make('reserve-b','予備の衛生術師','MEDIC'),make('reserve-c','予備の弓兵','ARCHER'),make('reserve-locked','保護した予備兵','HEAVY')];g.reserves[3].personnelLocked=true;
   Object.assign(g.player,{x:FARM_X+300,y:FARM_Y});g.camera={x:g.player.x,y:g.player.y};g.render();g.openStrategyModal(true);g._openNationPage('operations','expedition');window.reserveQA={g,FARM_X,FARM_Y,farmPosts,activeExpeditionReserves};
  });
  if(!await page.locator('.expedition-members[data-pid="0"]').evaluate(n=>n.open))await page.locator('.expedition-members[data-pid="0"] summary').click();const checkedIds=await page.locator('.expedition-members[data-pid="0"] input:checked').evaluateAll(nodes=>nodes.map(n=>n.dataset.sid));for(const id of checkedIds)await page.locator(`.expedition-members[data-pid="0"] input[data-sid="${id}"]`).uncheck();
  for(const id of ['reserve-a','reserve-b','reserve-c'])await page.locator(`.expedition-members[data-pid="0"] input[data-sid="${id}"]`).check();assert.equal(await page.locator('.expedition-members[data-pid="0"] input[data-sid="reserve-locked"]').isDisabled(),true);
  await page.screenshot({path:`${out}/choose-reserves-${size}.png`});await page.click('.btn-expedition-send[data-pid="0"]');
  const dispatched=await page.evaluate(()=>{const {g,farmPosts,activeExpeditionReserves}=reserveQA;return {main:g.squad.length,reserves:g.reserves.length,ids:g.platoons[0].expeditionMemberIds,away:activeExpeditionReserves(g).length,farmWorkers:farmPosts(g.reserves).length};});assert.equal(dispatched.main,48);assert.deepEqual(dispatched.ids,['reserve-a','reserve-b','reserve-c']);assert.equal(dispatched.reserves,4);assert.equal(dispatched.away,3);assert.equal(dispatched.farmWorkers,1);await page.screenshot({path:`${out}/dispatched-${size}.png`});
  await page.click('#btn-strat-window-close');
  const moved=await page.evaluate(()=>{const {g,FARM_X,FARM_Y}=reserveQA,a=g.reserves.find(u=>u.id==='reserve-a'),before=[a.x,a.y];Object.assign(g.platoons[0],{x:a.x,y:a.y,expeditionTargetX:a.x+220,expeditionTargetY:a.y});for(let n=0;n<40;n++)g.update(.05);g.camera={x:FARM_X+300,y:FARM_Y};g.render();return Math.hypot(a.x-before[0],a.y-before[1]);});assert.ok(moved>1);await page.screenshot({path:`${out}/field-expedition-${size}.png`});
  const reloaded=await page.evaluate(()=>{const {g,activeExpeditionReserves}=reserveQA,snapshot=structuredClone(g.saveGame());g.resumeSavedGame(snapshot);g.stopGameLoop();g.closeStrategyModal();return {main:g.squad.length,away:activeExpeditionReserves(g).length};});assert.deepEqual(reloaded,{main:48,away:3});
  await page.evaluate(()=>{reserveQA.g.openStrategyModal(true);reserveQA.g._openNationPage('operations','expedition');});await page.click('.btn-expedition-recall[data-pid="0"]');await page.click('#btn-strat-window-close');
  const returned=await page.evaluate(()=>{const {g,FARM_X,FARM_Y,activeExpeditionReserves}=reserveQA;g.monsters=[];for(let n=0;n<120&&g.platoons[0].mission!=='idle';n++)g.update(.05);g.camera={x:FARM_X+300,y:FARM_Y};g.render();return {mission:g.platoons[0].mission,main:g.squad.length,reserves:g.reserves.length,away:activeExpeditionReserves(g).length,markersCleared:g.reserves.every(u=>u.reserveExpeditionPlatoon==null)};});assert.deepEqual(returned,{mission:'idle',main:48,reserves:4,away:0,markersCleared:true});await page.screenshot({path:`${out}/farm-return-${size}.png`});results.push({viewport,dispatched,moved,reloaded,returned});
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.11.6',results,pageErrors:errors,disposableStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
