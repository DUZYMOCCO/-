import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const mode=process.argv[2]||'after',before=mode.startsWith('before'),out='iron-squad/docs/validation/town-crowd-v6.11.22';mkdirSync(out,{recursive:true});
const server=await startQaServer(before?'iron-squad/docs/backups/town-reference-v6.11.21':null),browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={mode,version:before?'6.11.21':'6.11.22',viewport:'390x844',cpu:4,framesPerSite:420,disposableStorage:true,sites:[]};
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try {
 await page.addInitScript(()=>{let seed=272;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};});
 await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('街のにぎわい計測');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 await page.evaluate(()=>{const g=qaGame;g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.updateSpawns=()=>{};g.merchants=[];g.gateGuards=[];g.civilians=[];g.outposts=[];g.restTimer=0;g.phaseTimer=100000;g.invasions.stage='idle';g.baseRaidActive=false;g.currentQuest=null;g.worldTime=80;g.ambientDensity='normal';
  g.squad=[];g.reserves=[];for(let i=0;i<48;i++){const s=g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE',level:4});s.id=`crowd-${String(i).padStart(2,'0')}`;s.isPersonalGuard=false;g.squad.push(s);const r=g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE',level:4});r.id=`farm-${String(i).padStart(2,'0')}`;r.isPersonalGuard=false;r.campPose='sit';g.reserves.push(r);}window.qaStep=0;
 });
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 async function scene(name) {
  return page.evaluate(async name=>{
   const g=qaGame,{normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=277'),{WORLD_SIZE,TAVERN_SITE,SETTLEMENTS}=await import('/iron-squad/js/world.js?v=277'),{messPoint,gardenPoint}=await import('/iron-squad/js/camp-leisure.js?v=277'),{FARM_X,FARM_Y}=await import('/iron-squad/js/reserve-farm.js?v=277'),C=WORLD_SIZE/2;
   g.currentDungeon=null;g.inBattle=true;g.worldTime=80;g.nation=normalizeNation({investment:name==='tavern'?90000:0});for(const r of Object.values(g.nation.economy.regions)){r.discovered=true;r.liberated=true;r.level=1;}
   const town=SETTLEMENTS.find(s=>s.kind==='town');const loc=name==='hq'?{x:C,y:C+100}:name==='tavern'?{x:TAVERN_SITE.x,y:TAVERN_SITE.y+230}:name==='farm'?{x:FARM_X+350,y:FARM_Y+60}:{x:C+town.ox,y:C+town.oy};
   g._campYardQuiet=true;g._campAtTavern=name==='tavern';g.squad.forEach((s,i)=>{const seat=(name==='tavern'?gardenPoint:messPoint)(i,'sit');Object.assign(s,{x:seat.x,y:seat.y,campPose:'sit',_leisureSeat:seat,hp:s.maxHp,isDown:false,dead:false});});
   Object.assign(g.player,loc);g.camera={...loc};g.zoom=1;g.phaseTimer=100000;window.qaScene={...loc,name};
   const coldStart=performance.now();if(g.updateAmbientCrowd)g.updateAmbientCrowd(1/60);g.render();return {...loc,coldEntryMs:performance.now()-coldStart};
  },name);
 }
 if(mode!=='screens')for(const name of ['hq','tavern','farm']) {
  const entry=await scene(name);await page.waitForTimeout(800);
  // The same controlled 2D trajectory, actual update/render and army on each version.
  await page.evaluate(async()=>{const g=qaGame;for(let i=0;i<90;i++){g.update(1/60);g.camera={x:qaScene.x,y:qaScene.y};g.render();await new Promise(requestAnimationFrame);}});
  await page.evaluate(()=>{if(qaGame.updateAmbientCrowd)for(let i=0;i<1000;i++)qaGame.updateAmbientCrowd(1/60);});
  const measured=await page.evaluate(async framesWanted=>{
   const g=qaGame,frames=[],gaps=[];let previous=null,peakResidents=0,peakWalkers=0;const mod=g.updateAmbientCrowd?await import('/iron-squad/js/town-ambient.js?v=277'):null;
   for(let i=0;i<framesWanted;i++){
    const timestamp=await new Promise(requestAnimationFrame);if(previous!==null)gaps.push(timestamp-previous);previous=timestamp;
    const x=qaScene.x+Math.sin(i/65)*70,y=qaScene.y+Math.cos(i/75)*40;Object.assign(g.player,{x,y});
    const start=performance.now();g.update(1/60);g.camera={x,y};g.render();frames.push(performance.now()-start);
    if(mod){const snap=mod.ambientSnapshot(g);peakResidents=Math.max(peakResidents,snap.residents);peakWalkers=Math.max(peakWalkers,snap.walkers);}
   }
   const summary=xs=>({mean:xs.reduce((n,v)=>n+v,0)/xs.length,max:Math.max(...xs),p95:[...xs].sort((a,b)=>a-b)[Math.floor(xs.length*.95)],over100:xs.filter(v=>v>100).length,count:xs.length});
   return {work:summary(frames),raf:summary(gaps),peakResidents,peakWalkers,frames,gaps,cohort:{quiet:g._campYardQuiet,tavern:g._campAtTavern,guards:g.squad.filter(s=>s.isPersonalGuard).length,poses:g.squad.filter(s=>s.campPose).length,seats:g.squad.filter(s=>s._leisureSeat).length,healthy:g.squad.filter(s=>s.hp>=s.maxHp*.98).length,sample:g.squad.slice(0,3).map(s=>({id:s.id,x:s.x,y:s.y,hp:s.hp,maxHp:s.maxHp,seat:s._leisureSeat,pose:s.campPose,magic:s.magicRecovering,hero:s.heroPartyId,expedition:s.reserveExpeditionPlatoon}))}};
  },mode.endsWith('probe')?2:420);report.sites.push({name,coldEntryMs:entry.coldEntryMs,...measured});if(!before&&!mode.endsWith('probe'))assert.ok(measured.peakWalkers>0,`${name}: real off-duty walking must be observed`);console.log(JSON.stringify({name,work:measured.work,raf:measured.raf,residents:measured.peakResidents,walkers:measured.peakWalkers,cohort:measured.cohort}));
 }
 if(!before){
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  for(const name of ['hq','tavern','farm','inn'])for(const night of [false,true]){
   await scene(name);await page.evaluate(async night=>{const g=qaGame;g.worldTime=night?300:80;for(let i=0;i<600;i++){g.updateAmbientCrowd(1/60);}g.camera={x:qaScene.x,y:qaScene.y};g.render();},night);
   await page.screenshot({path:`${out}/${name}-${night?'night':'day'}-390.png`});
  }
  report.behavior=await page.evaluate(async()=>{
   const g=qaGame,mod=await import('/iron-squad/js/town-ambient.js?v=277');g.currentDungeon=null;g.civilians=[];g.camera={x:79360,y:79460};g.nation.level=0;g.worldTime=80;g.monsters=[];g.ambientDensity='many';mod.resetAmbientCrowd(g);for(let i=0;i<1000;i++)g.updateAmbientCrowd(1/60);
   const before=mod.ambientSnapshot(g),save=g.saveGame({persist:false});g.monsters=[{x:79360,y:79460,hp:100,maxHp:100}];for(let i=0;i<180;i++)g.updateAmbientCrowd(1/60);const danger=mod.ambientSnapshot(g);g.monsters=[];for(let i=0;i<900;i++)g.updateAmbientCrowd(1/60);const returned=mod.ambientSnapshot(g);
   const logicalSaveClean=!Object.keys(save).some(k=>/ambient|crowd/i.test(k))&&!JSON.stringify(save).includes('ambient:hq');return {before,danger,returned,logicalSaveClean,civilians:g.civilians.length};
  });assert.equal(report.behavior.danger.residents,0);assert.equal(report.behavior.danger.walkers,0);assert.ok(report.behavior.returned.residents>0);assert.ok(report.behavior.logicalSaveClean);assert.equal(report.behavior.civilians,0);
  await page.evaluate(()=>{qaGame.openStrategyModal();qaGame._selectStratTab('overview');document.getElementById('ambient-settings').open=true;});
  await page.locator('#ambient-density').selectOption('none');assert.equal(await page.evaluate(()=>qaGame.ambientDensity),'none');await page.locator('#ambient-density').selectOption('normal');await page.screenshot({path:`${out}/settings-390.png`});
  await page.evaluate(()=>{qaGame.closeStrategyModal();qaGame.perfSettings.setEnabled(true);qaGame.startGameLoop();});await page.waitForTimeout(1000);
  const perf=await page.evaluate(()=>{qaGame.stopGameLoop();return qaGame.perfDiagnostics.snapshot();});report.perfNames=perf.latestTiming.map(t=>t.name);assert.ok(report.perfNames.includes('住民更新'));assert.ok(report.perfNames.includes('住民描画'));await page.screenshot({path:`${out}/perf-390.png`});
 }
 assert.deepEqual(errors,[]);report.errors=errors;writeFileSync(`${out}/${mode}-measurement.json`,JSON.stringify(report,null,2));
}finally{report.errors=errors;writeFileSync(`${out}/${mode}-measurement.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
