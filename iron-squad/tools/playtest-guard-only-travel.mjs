import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/guard-only-travel-v6.11.2-20261014';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]) {
  const size=viewport.width===390?'mobile':'desktop';await page.setViewportSize(viewport);
  await page.evaluate(()=>{
   const g=qualityGame;g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.currentDungeon=null;g.career.status='enlisted';g.monsters=[];
   const make=(id,personal,dx)=>Object.assign(g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE'}),{id,name:id,isPersonalGuard:personal,x:g.player.x+dx,y:g.player.y+50});
   const main=make('本隊',false,-60),guard=make('直属',true,60),hero=make('勇者',true,120),reserve=make('予備',true,0);hero.heroPartyId='travel-qa';g.squad=[main,guard,hero];g.reserves=[reserve];
   const resources=[guard.hp,guard.mana,guard.ammo,JSON.stringify(guard.equipped)];window.travelQA={g,guard,stationary:[main,hero,reserve],positions:[main,hero,reserve].map(u=>[u.x,u.y]),resources};g.medicalPosts[0].discovered=true;g.render();
  });
  await page.screenshot({path:`${out}/before-${size}.png`});
  await page.evaluate(()=>qualityGame.openStrategyModal(true));await page.click('#btn-fast-travel');
  await page.locator('#fast-travel-list button').filter({hasText:'第1救護所'}).click();
  const result=await page.evaluate(()=>{
   const {g,guard,stationary,positions,resources}=travelQA;g.render();return {stationaryPositions:stationary.map(u=>[u.x,u.y]),positions,guardDistance:Math.hypot(guard.x-g.player.x,guard.y-g.player.y),resourcesUnchanged:JSON.stringify(resources)===JSON.stringify([guard.hp,guard.mana,guard.ammo,JSON.stringify(guard.equipped)]),destinationScreenClosed:document.getElementById('world-map-modal').classList.contains('hidden'),battleResumed:g.inBattle};
  });
  assert.deepEqual(result.stationaryPositions,result.positions);assert.ok(result.guardDistance<=60);assert.equal(result.resourcesUnchanged,true);assert.equal(result.destinationScreenClosed,true);assert.equal(result.battleResumed,true);
  await page.screenshot({path:`${out}/after-${size}.png`});results.push({viewport,...result});
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.11.2',results,pageErrors:errors,disposableStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
} finally {await browser.close();}
