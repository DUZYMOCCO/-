import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/captives-20261012',base=process.argv[2]||'http://127.0.0.1:8001';mkdirSync(out,{recursive:true});
const report={errors:[],checks:{},screens:[]},browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('requestfailed',r=>console.log(`Request failed: ${r.url()} ${r.failure()?.errorText}`));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{window.g=qualityGame;g.stopGameLoop();g.monsters=[];g.updateSpawns=()=>{};g.currentQuest=null;g.restTimer=0;g.phaseTimer=300;g.inBattle=true;window.baseline=structuredClone(g.saveGame());});
  const shot=async name=>{await page.evaluate(()=>{g.resizeCanvas();g.zoom=1.8;g.render();});await page.screenshot({path:`${out}/${name}.png`});report.screens.push(name);};
  const absent=await page.evaluate(async()=>{
    const {prepareLimitedEncounter}=await import('/iron-squad/js/limited-allies.js?v=203'),d=g.dungeons.find(d=>d.id==='place_north_fort');
    const miss=prepareLimitedEncounter(g,d,()=>.9);g.enterDungeon(d);g.monsters=[];Object.assign(g.player,{x:d.width*.62-65,y:d.height*.7});g.camera={x:g.player.x+65,y:g.player.y-20};g.updateStatsUI(true);
    return {miss:miss===null,checked:g.limitedAllies.captiveChecks,cages:g.limitedAllies.encounters.filter(e=>e.dungeonId===d.id).length};
  });assert.equal(absent.miss,true);assert.equal(absent.cages,0);assert.equal(await page.locator('#btn-limited-ally').isVisible(),false);report.checks.absent=absent;await shot('01-no-captive');
  const absentReload=await page.evaluate(async()=>{
    const {prepareLimitedEncounter}=await import('/iron-squad/js/limited-allies.js?v=203');const saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.stopGameLoop();
    const d=g.dungeons.find(d=>d.id==='place_north_fort');for(let i=0;i<20;i++){if(g.currentDungeon)g.exitDungeon();g.enterDungeon(d);}
    const result=prepareLimitedEncounter(g,d,()=>{throw new Error('empty result rerolled');});return {miss:result===null,checks:g.limitedAllies.captiveChecks.filter(id=>id===d.id).length};
  });assert.deepEqual(absentReload,{miss:true,checks:1});report.checks.absentSaveAndReentry=absentReload;
  const people=[];
  for(let i=0;i<5;i++){
    const person=await page.evaluate(async i=>{
      g.resumeSavedGame(structuredClone(baseline));g.stopGameLoop();g.closeStrategyModal();
      const {prepareLimitedEncounter}=await import('/iron-squad/js/limited-allies.js?v=203'),d=g.dungeons.find(d=>d.id==='dungeon_goblin_mines'),draws=[0,(i+.5)/5];
      const e=prepareLimitedEncounter(g,d,()=>draws.shift());g.enterDungeon(d);g.monsters=[];g.restTimer=0;
      Object.assign(g.player,{x:e.x-60,y:e.y+28});g.camera={x:e.x-15,y:e.y-25};g.updateStatsUI(true);
      return {id:e.unit.id,classId:e.unit.soldierClass,species:e.unit.species,name:e.unit.name,x:e.x,y:e.y,gold:g.gold};
    },i);assert.equal(await page.locator('#btn-limited-ally').isVisible(),true);people.push(person);await shot(`02-captive-${person.species}`);
    const reload=await page.evaluate(async()=>{
      const old=g.limitedAllies.encounters.find(e=>e.dungeonId==='dungeon_goblin_mines'),unit=structuredClone(old.unit),saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.stopGameLoop();
      const {prepareLimitedEncounter}=await import('/iron-squad/js/limited-allies.js?v=203');const d=g.dungeons.find(d=>d.id==='dungeon_goblin_mines'),e=prepareLimitedEncounter(g,d,()=>{throw new Error('captive rerolled');});
      g.closeStrategyModal();if(!g.currentDungeon)g.enterDungeon(d);g.monsters=[];Object.assign(g.player,{x:e.x-60,y:e.y+28});g.updateStatsUI(true);return {sameId:unit.id===e.unit.id,sameSpecies:unit.species===e.unit.species,sameEquipment:JSON.stringify(unit.equipped)===JSON.stringify(e.unit.equipped),current:g.currentDungeon?.id};
    });assert.equal(reload.sameId,true);assert.equal(reload.sameSpecies,true);assert.equal(reload.sameEquipment,true);assert.equal(reload.current,'dungeon_goblin_mines');
    if(i===0){
      await page.evaluate(()=>{const e=g.limitedAllies.encounters.find(e=>e.dungeonId==='dungeon_goblin_mines');g.monsters=[{id:'near-cage-enemy',type:'goblin',hp:20,maxHp:20,x:e.x+10,y:e.y,atk:1}];});
      await page.click('#btn-limited-ally');assert.equal(await page.evaluate(()=>g.limitedAllies.encounters.find(e=>e.dungeonId==='dungeon_goblin_mines').joined),false);
      await page.evaluate(()=>{g.monsters=[];});report.checks.enemyGate=true;
    }
    if(i===3){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await shot('03-fox-landscape');assert.equal(await page.locator('#btn-limited-ally').isVisible(),true);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);}
    await page.click('#btn-limited-ally');
    const joined=await page.evaluate(async()=>{
      const e=g.limitedAllies.encounters.find(e=>e.dungeonId==='dungeon_goblin_mines'),s=g.squad.find(s=>s.id===e.unit.id);
      const saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.stopGameLoop();g.monsters=[];if(g.currentDungeon)g.exitDungeon();g.enterDungeon(g.dungeons.find(d=>d.id==='dungeon_goblin_mines'));g.updateStatsUI(true);
      return {joined:e.joined,personal:s.isPersonalGuard,gold:g.gold,copies:[...g.squad,...g.reserves,...g.taverns.waiting].filter(s=>s.id===e.unit.id).length,unrescued:g.limitedAllies.encounters.filter(e=>e.dungeonId==='dungeon_goblin_mines'&&!e.joined).length};
    });assert.equal(joined.joined,true);assert.equal(joined.personal,true);assert.equal(joined.gold,person.gold);assert.equal(joined.copies,1);assert.equal(joined.unrescued,0);assert.equal(await page.locator('#btn-limited-ally').isVisible(),false);
  }
  assert.deepEqual(people.map(p=>p.species),['wolf','bear','cat','fox','bird']);report.checks.speciesAndRescue=people;report.checks.savedCaptivesAndOnceOnlyRescue=true;
  await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
  await tab.goto(base);await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');
  await tab.waitForFunction(async()=>navigator.serviceWorker.controller&&(await(await caches.open('game-iron-squad-v203')).keys()).length>=114);
  const foxId=await tab.evaluate(async()=>{
    const g=gameStudioInstance.activeGame,{prepareLimitedEncounter}=await import('/iron-squad/js/limited-allies.js?v=203');g.stopGameLoop();const d=g.dungeons.find(d=>d.id==='dungeon_goblin_mines'),draws=[0,.7],e=prepareLimitedEncounter(g,d,()=>draws.shift());g.enterDungeon(d);g.monsters=[];g.restTimer=0;Object.assign(g.player,{x:e.x-50,y:e.y+25});g.saveGame();return e.unit.id;
  });await offline.setOffline(true);await tab.reload();await tab.waitForTimeout(500);const version=await tab.locator('[data-version-for="iron-squad"]').textContent();assert.ok(version.includes('6.1.2'));
  await tab.click('[data-game-id="iron-squad"]');await tab.locator('[data-slot-id]').first().click();await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  const restored=await tab.evaluate(()=>{const g=gameStudioInstance.activeGame;g.stopGameLoop();g.restTimer=0;g.closeStrategyModal();if(!g.currentDungeon)g.enterDungeon(g.dungeons.find(d=>d.id==='dungeon_goblin_mines'));g.monsters=[];const e=g.limitedAllies.encounters.find(e=>e.dungeonId==='dungeon_goblin_mines');Object.assign(g.player,{x:e.x-50,y:e.y+25});g.updateStatsUI(true);return {id:e.unit.id,species:e.unit.species,current:g.currentDungeon?.id};});assert.equal(restored.id,foxId);assert.equal(restored.species,'fox');assert.equal(restored.current,'dungeon_goblin_mines');
  await tab.click('#btn-limited-ally');assert.equal(await tab.evaluate(id=>gameStudioInstance.activeGame.squad.some(s=>s.id===id&&s.isPersonalGuard),foxId),true);
  report.checks.offline={version,sameFox:true,revisitedDungeon:true,rescued:true};await offline.close();assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
}finally{await browser.close();writeFileSync(`${out}/ui.json`,JSON.stringify(report,null,2));}
