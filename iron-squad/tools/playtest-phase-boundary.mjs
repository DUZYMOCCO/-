import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/phase-boundary-v6.11.15';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={version:'6.11.15',cpuThrottle:4,disposableStorage:true};
async function measure(legacy){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:8000/?perf=1');await page.locator('[data-game-id="iron-squad"]').click();
  await page.locator('#expedition-name').fill('600KBの休憩計測');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
  await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.restGame=g;return true;},null,{timeout:120000});
  const fixture=await page.evaluate(async()=>{
    const g=restGame,{generateRandomDrop}=await import('/iron-squad/js/index.js'),{saveSlots}=await import('/iron-squad/js/save-slots.js?v=262');
    g.stopGameLoop();g.closeStrategyModal();g.fastTravelTo(80000,76000,'計測開始');g.player.hp=g.player.maxHp;g.player.invulnerableTimer=120;g.monsters=[];g.currentQuest=null;
    for(const s of g.squad)s.gold=6;g.squad[0].gold=1000;g.gold=50;g.treasury=50;
    const gear=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:'sword',tier:15,merchant:true,random:()=>.5});
    const slot=saveSlots.get(g.activeSlotId),encoder=new TextEncoder(),activeInventory=g.inventory,active=g.saveGame({persist:false});g.inventory=[...activeInventory];let bytes=0,checkpoint;
    // A real historical checkpoint makes the persisted list large without also
    // making live procurement scan hundreds of unused items every phase.
    while(bytes<610000){g.inventory.push({...structuredClone(gear),id:`perf-gear-${g.inventory.length}`});const historical=g.saveGame({persist:false});historical.squad=historical.squad.slice(0,8);checkpoint={place:'本陣',savedAt:Date.now(),data:historical};bytes=encoder.encode(JSON.stringify([{...slot,data:active,checkpoint}])).length;}
    const historicalInventory=g.inventory.length;g.inventory=activeInventory;saveSlots.update(g.activeSlotId,{data:active,checkpoint});window.restSlots=saveSlots;
    return {jsonUtf8Bytes:bytes,jsonCharacters:JSON.stringify([{...slot,data:active,checkpoint}]).length,storedUtf8Bytes:encoder.encode(localStorage.getItem('game_studio_ironsquad_save_slots_v1')).length,inventory:g.inventory.length,historicalInventory,soldiers:g.squad.length};
  });console.log('fixture',JSON.stringify(fixture));assert.ok(fixture.jsonUtf8Bytes>=600000&&fixture.jsonUtf8Bytes<640000,JSON.stringify(fixture));
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>{restGame.startGameLoop();restGame.autoSaveClock=-100;});await page.waitForTimeout(4000);
  await page.evaluate(async legacy=>{
    const g=restGame;g.stopGameLoop();g.perfSettings.setEnabled(false,false);g.perfSettings.setEnabled(true,false);g.phaseTimer=1;g.autoSaveClock=8;g.worldTime=236;g.monsters=[];
    const runTick=g.processRestSecond;window.tickCount=0;g.processRestSecond=function(){tickCount++;runTick.call(this);};
    if(legacy){const old=await import('/iron-squad/tests/fixtures/phase-boundary-v6.11.14-reference.mjs');g.processSharedEquipmentBox=old.legacyProcessSharedEquipmentBox;g.supplyMissingEquipment=old.legacySupplyMissingEquipment;}
    const save=g.saveGame;window.saveCalls=[];g.saveGame=function(options){const t=performance.now(),data=save.call(this,options);saveCalls.push({time:t,ms:performance.now()-t,background:!!options?.background,restTimer:this.restTimer});return data;};
    window.methodCosts={};for(const name of ['equipmentValueFor','createSupplyEquipment','recalcPlayerStats','recalcSoldierStats','processSharedEquipmentBox','supplyMissingEquipment','supplyReinforcements','investNation','advanceArmamentResearch','seedInitialMonsters','updateStatsUI','renderStrategyUI']){const fn=g[name];g[name]=function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{const cost=methodCosts[name]||={calls:0,ms:0};cost.calls++;cost.ms+=performance.now()-start;if(name==='recalcSoldierStats'){const kind=args[0]?._equipmentTrial?'trial':'actual';cost[kind]=(cost[kind]||0)+1;}}};}
    window.phaseEvents=[];for(const name of ['completePhase','finishRest','changeTimePeriod']){const fn=g[name];g[name]=function(...args){const event={name,time:performance.now()},before=structuredClone(methodCosts);phaseEvents.push(event);const result=fn.apply(this,args);event.ms=performance.now()-event.time;event.costs=Object.fromEntries(Object.entries(methodCosts).map(([key,values])=>[key,Object.fromEntries(Object.entries(values).map(([field,value])=>[field,value-(before[key]?.[field]||0)]))]));if(name==='completePhase')this.joystick={active:true,dirX:0,dirY:1};return result;};}
    window.frameGaps=[];window.frameSamples=[];window.measureStart=performance.now();window.startX=g.player.x;window.startY=g.player.y;window.probeDone=false;let last=null;
    const probe=()=>{const now=performance.now();if(last!==null){frameGaps.push(now-last);frameSamples.push({start:last,end:now,ms:now-last});}last=now;if(!probeDone)requestAnimationFrame(probe);};
    requestAnimationFrame(probe);g.startGameLoop();g.joystick={active:true,dirX:0,dirY:1};
  },legacy);
  await page.waitForFunction(()=>phaseEvents.some(e=>e.name==='finishRest'),null,{timeout:60000});await page.waitForTimeout(3500);
  const result=await page.evaluate(async()=>{
    const g=restGame;probeDone=true;g.joystick.active=false;g.stopGameLoop();await g._pendingAutoSave;g.perfDiagnostics.refresh();
    const finish=phaseEvents.find(e=>e.name==='finishRest'),start=phaseEvents.find(e=>e.name==='completePhase'),diagnostic=g.perfDiagnostics.snapshot();
    const records=diagnostic.records.filter(r=>r.intervalStart>=measureStart),sorted=[...frameGaps].sort((a,b)=>a-b),saved=restSlots.get(g.activeSlotId).data;
    return {durationMs:performance.now()-measureStart,events:phaseEvents.map(e=>({...e,frameMs:frameSamples.find(f=>f.start<=e.time&&f.end>=e.time+e.ms)?.ms??null})),methodCosts,ticks:tickCount,restDurationMs:finish.time-start.time,saveCalls,frames:frameGaps.length,maxFrameMs:Math.max(...frameGaps),p95FrameMs:sorted[Math.floor(sorted.length*.95)],over100:frameGaps.filter(t=>t>100).length,records,diagnostic,moved:Math.hypot(g.player.x-startX,g.player.y-startY),saved:{restTimer:saved.restTimer,count:saved.restReport.count,spent:saved.restReport.spent,gold:saved.squad[0].gold,upgrade:saved.squad[0].equipped.weapon.upgrade},current:{count:g.restReport.count,spent:g.restReport.spent,gold:g.squad[0].gold,upgrade:g.squad[0].equipped.weapon.upgrade}};
  });
  await page.screenshot({path:`${out}/${legacy?'legacy-phase-boundary':'fixed-phase-boundary'}-mobile.png`});
  if(!legacy){
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
    result.realWorkerBurst=await page.evaluate(async()=>{
      const g=restGame,pending=[];
      for(let i=0;i<12;i++){g.gold=200+i;g.saveGame({background:true});pending.push(g._pendingAutoSave);}
      const results=await Promise.all(pending),finalGold=restSlots.get(g.activeSlotId).data.gold;
      g.gold=999;g.saveGame({background:true});const old=g._pendingAutoSave;g.gold=222;
      Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;
      const oldResult=await old,hiddenGold=restSlots.get(g.activeSlotId).data.gold;
      return {results,finalGold,oldResult,hiddenGold,hiddenSaveSynchronous:saveCalls.at(-1).background===false};
    });
    assert.deepEqual(result.realWorkerBurst.results,[...Array.from({length:11},()=>({status:'superseded'})),{status:'saved'}]);
    assert.equal(result.realWorkerBurst.finalGold,211);assert.equal(result.realWorkerBurst.hiddenGold,222);assert.equal(result.realWorkerBurst.oldResult.status,'superseded');assert.equal(result.realWorkerBurst.hiddenSaveSynchronous,true);
  }
  await context.close();return {fixture,...result};
}
try{
  report.legacy=await measure(true);report.fixed=await measure(false);
  assert.equal(report.legacy.ticks,8);assert.ok(report.legacy.over100>=2,'frozen shared-box code reproduces the phase boundary stalls');
  assert.equal(report.fixed.ticks,8);assert.ok(report.fixed.moved>1000);assert.equal(report.fixed.saveCalls.some(c=>!c.background),false);
  assert.equal(report.fixed.saved.restTimer,0);for(const key of ['count','spent','gold','upgrade'])assert.equal(report.fixed.saved[key],report.fixed.current[key]);
  assert.ok(report.fixed.events.some(e=>e.name==='changeTimePeriod'));assert.ok(report.fixed.saveCalls.length>=4,'phase, rest completion, daylight and 10-second saves all run');
  assert.deepEqual(errors,[]);report.errors=errors;report.phaseBoundariesAtMost100ms=report.fixed.events.filter(e=>e.name!=='changeTimePeriod').every(e=>e.frameMs!==null&&e.frameMs<=100);report.allFramesAtMost100ms=report.fixed.over100===0;
  writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({version:report.version,legacy:{bytes:report.legacy.fixture.jsonUtf8Bytes,maxFrameMs:report.legacy.maxFrameMs,over100:report.legacy.over100},fixed:{bytes:report.fixed.fixture.jsonUtf8Bytes,maxFrameMs:report.fixed.maxFrameMs,over100:report.fixed.over100,ticks:report.fixed.ticks,saves:report.fixed.saveCalls,moved:report.fixed.moved},errors}));
  // The instruction allows reporting the remaining measured cost when the target is missed.
  console.log('phase-boundary target',report.phaseBoundariesAtMost100ms);
}catch(error){writeFileSync(`${out}/failure.json`,JSON.stringify({error:String(error),report,errors},null,2)+'\n');throw error;}
finally{await browser.close();}
