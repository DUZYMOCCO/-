import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/tavern-20261012',base=process.argv[2]||'http://127.0.0.1:8001';mkdirSync(out,{recursive:true});
const report={errors:[],checks:{},screens:[]},browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('requestfailed',r=>console.log(`Request failed: ${r.url()} ${r.failure()?.errorText}`));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    window.g=qualityGame;g.stopGameLoop();g.monsters=[];g.updateSpawns=()=>{};g.currentQuest=null;g.worldTime=300;g.restTimer=0;g.phaseTimer=300;g.inBattle=true;
    const {FIELD_TAVERN}=await import('/iron-squad/js/tavern.js?v=202');window.site=FIELD_TAVERN;
    Object.assign(g.player,{x:site.x,y:site.y+300});g.update(.01);g.updateStatsUI(true);
  });
  assert.equal(await page.evaluate(()=>g.taverns.roster.people.length),4,'people sit outside before opening the tavern');
  const scene=async name=>{
    await page.evaluate(()=>{g.resizeCanvas();g.zoom=1;g.camera={x:site.x,y:site.y-15};g.render();});
    await page.screenshot({path:`${out}/${name}.png`});report.screens.push(name);
  };
  await scene('01-first-approach-seated');
  await page.evaluate(()=>{Object.assign(g.player,{x:site.x,y:site.y+22});g.gold=4999;g.update(.01);g.updateStatsUI(true);});
  await page.click('#btn-field-tavern');
  const actions=page.locator('.tavern-actions button');assert.equal(await actions.count(),4);
  for(const b of await actions.all()){assert.equal(await b.textContent(),'5,000Gで雇う');assert.equal(await b.isDisabled(),true);}
  assert.ok(!(await page.locator('#tavern-dialog').innerText()).match(/会話|信頼|意気投合|旅の仲間に誘う/));
  report.checks.insufficient={gold:4999,hireButtons:4,disabled:true,noConversation:true};
  await page.screenshot({path:`${out}/02-hire-insufficient.png`});report.screens.push('02-hire-insufficient');
  await page.evaluate(()=>{g.gold=5000;g.renderTavern();});
  const firstId=await page.evaluate(()=>g.taverns.roster.people[0].unit.id);
  await page.locator('.tavern-actions button').first().click();
  const first=await page.evaluate(id=>({gold:g.gold,followers:g.listPersonalGuardsAlive().length,joined:g.taverns.roster.people.find(p=>p.unit.id===id).joined,repeat:g.recruitTavernPerson(id),talk:g.recruitTavernPerson(g.taverns.roster.people.find(p=>!p.joined).unit.id,'talk')}),firstId);
  assert.deepEqual(first,{gold:0,followers:1,joined:true,repeat:false,talk:false});report.checks.exactPayment=first;
  await page.evaluate(()=>{g.gold=100000;g.renderTavern();});
  for(let i=0;i<7;i++){
    if(i===3)await page.evaluate(()=>{g.phase++;g.renderTavern();});
    const hire=page.getByRole('button',{name:'5,000Gで雇う',exact:true}).first();await hire.scrollIntoViewIfNeeded();await hire.click();
  }
  const crowd=await page.evaluate(()=>({gold:g.gold,followers:g.listPersonalGuardsAlive().length,waiting:g.taverns.waiting.length}));
  assert.deepEqual(crowd,{gold:65000,followers:5,waiting:3});report.checks.overflow=crowd;
  await page.evaluate(()=>{for(const s of [...g.listPersonalGuardsAlive()])g.parkTavernCompanion(s.id);g.phase++;g.renderTavern();});
  const swap=await page.evaluate(()=>{
    const s=g.taverns.waiting[0],before=JSON.stringify({id:s.id,appearance:s.appearance,equipped:s.equipped,level:s.level}),gold=g.gold;
    const rejoined=g.rejoinTavernCompanion(s.id),same=before===JSON.stringify({id:s.id,appearance:s.appearance,equipped:s.equipped,level:s.level});
    g.parkTavernCompanion(s.id);return {rejoined,same,charged:gold-g.gold,waiting:g.taverns.waiting.length,candidates:g.taverns.roster.people.filter(p=>!p.joined).length};
  });assert.deepEqual(swap,{rejoined:true,same:true,charged:0,waiting:8,candidates:4});report.checks.waitingReturn=swap;
  const layouts=[];
  for(const [width,height]of [[320,568],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);await page.locator('.tavern-body').evaluate(e=>e.scrollTop=0);
    const layout=await page.locator('#tavern-dialog').evaluate(e=>({overflow:e.scrollWidth-e.clientWidth,closeTop:e.querySelector('#btn-tavern-close').getBoundingClientRect().top,closeBottom:e.querySelector('#btn-tavern-close').getBoundingClientRect().bottom,height:innerHeight}));
    assert.ok(layout.overflow<=2);assert.ok(layout.closeTop>=0&&layout.closeBottom<=height);layouts.push({width,height,...layout});
    await page.screenshot({path:`${out}/03-tavern-${width}.png`});report.screens.push(`03-tavern-${width}`);
  }report.checks.layouts=layouts;
  const save=await page.evaluate(()=>{const saved=g.saveGame();g.resumeSavedGame(structuredClone(saved));g.stopGameLoop();g.monsters=[];g.worldTime=300;Object.assign(g.player,{x:site.x,y:site.y+22});g.updateStatsUI(true);return {waiting:g.taverns.waiting.length,costs:g.taverns.roster.people.map(p=>p.cost),conversationFields:g.taverns.roster.people.some(p=>'trust'in p||'talkStep'in p)};});
  assert.deepEqual(save,{waiting:8,costs:[5000,5000,5000,5000],conversationFields:false});report.checks.saved=save;
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
  await page.evaluate(()=>{if(document.querySelector('#tavern-dialog'))document.querySelector('#btn-tavern-close').click();g.closeStrategyModal();});
  await scene('04-twelve-guests-seated');
  const seats=await page.evaluate(async()=>{
    const {drawFieldTavern}=await import('/iron-squad/js/tavern.js?v=202');const {gardenPoint,GARDEN_SEAT_COUNT,TAVERN_TABLES}=await import('/iron-squad/js/camp-leisure.js?v=202');
    const drawn=[];drawFieldTavern(document.createElement('canvas').getContext('2d'),g,(s,x,y)=>drawn.push({id:s.id,x,y,pose:s.campPose,facing:s.facingAngle}));
    let minArmyGap=Infinity;for(const s of drawn)for(let i=0;i<GARDEN_SEAT_COUNT;i++){const army=gardenPoint(i,'sit');minArmyGap=Math.min(minArmyGap,Math.hypot(s.x-army.x,s.y-army.y));}
    return {drawn,tables:TAVERN_TABLES,minArmyGap};
  });assert.equal(seats.drawn.length,12);assert.ok(seats.minArmyGap>50);assert.ok(seats.drawn.some(s=>s.pose==='drink'));assert.ok(seats.drawn.some(s=>s.pose==='eat'));report.checks.seating=seats;
  await page.setViewportSize({width:900,height:980});await page.waitForTimeout(100);
  await page.evaluate(async()=>{
    const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=201');const {refreshCampQuiet,assignCampSeats}=await import('/iron-squad/js/camp-leisure.js?v=202');
    g.nation=normalizeNation({...g.nation,investment:45000});g.monsters=[];g.invasions.stage='idle';g.baseRaidActive=false;g.commandActiveUntil=0;
    refreshCampQuiet(g,performance.now());assignCampSeats(g,g.squad);for(const s of g.squad){const p=s._leisureSeat;if(p)Object.assign(s,{x:p.x,y:p.y,campPose:p.pose,facingAngle:p.facing});}
    g.resizeCanvas();g.zoom=1.3;g.camera={x:site.x,y:site.y+100};g.render();
  });assert.equal(await page.evaluate(()=>g.nation.level),3);await page.screenshot({path:`${out}/05-terrace-and-army.png`});report.screens.push('05-terrace-and-army');
  report.checks.army=await page.evaluate(()=>({level:g.nation.level,seated:g.squad.filter(s=>s.campPose).length}));assert.equal(report.checks.army.seated,48);
  await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
  await tab.goto(base);await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');
  await tab.waitForFunction(async()=>navigator.serviceWorker.controller&&(await(await caches.open('game-iron-squad-v202')).keys()).length>=114);
  await tab.evaluate(()=>gameStudioInstance.activeGame.saveGame());await offline.setOffline(true);await tab.reload();await tab.waitForTimeout(500);
  const version=await tab.locator('[data-version-for="iron-squad"]').textContent();assert.ok(version.includes('6.1.1'));
  await tab.click('[data-game-id="iron-squad"]');await tab.locator('[data-slot-id]').first().click();await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  await tab.evaluate(async()=>{const g=gameStudioInstance.activeGame,{FIELD_TAVERN}=await import('/iron-squad/js/tavern.js?v=202');g.stopGameLoop();Object.assign(g.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+22});g.gold=5000;g.updateStatsUI(true);});
  await tab.click('#btn-field-tavern');assert.equal(await tab.getByRole('button',{name:'5,000Gで雇う',exact:true}).count(),4);await tab.getByRole('button',{name:'5,000Gで雇う',exact:true}).first().click();assert.equal(await tab.evaluate(()=>gameStudioInstance.activeGame.gold),0);
  report.checks.offline={version,resumed:true,paidHire:true};await offline.close();assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
}finally{await browser.close();writeFileSync(`${out}/ui.json`,JSON.stringify(report,null,2));}
