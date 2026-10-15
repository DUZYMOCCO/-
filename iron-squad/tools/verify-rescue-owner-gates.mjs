// Disposable real-Chrome checks for rescue ownership and recovered gate posts.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const base=process.argv[2]||'http://127.0.0.1:8002',out='iron-squad/docs/previews/rescue-gates-20261012';
mkdirSync(out,{recursive:true});
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'],report={version:release.gameVersion,cache:release.version,checks:{},screenshots:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    const {WORLD_SIZE}=await import('/iron-squad/js/world.js');window.C=WORLD_SIZE/2;window.g=qualityGame;g.stopGameLoop();g.closeStrategyModal();
    window.initial=structuredClone(g.saveGame());window.notes=[];const toast=g.showToast.bind(g);g.showToast=(t,...args)=>{notes.push(t);return toast(t,...args);};
    window.reset=()=>{g.resumeSavedGame(structuredClone(initial));g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.phaseTimer=300;g.monsters=[];g.inBattle=true;g.worldTime=120;notes.length=0;};
    window.draw=(x=C,y=C)=>{g.camera={x,y};g.resizeCanvas();g.revealFogAroundPlayer(true);g.updateStatsUI(true);g.render();};reset();
    window.casualty=await import('/iron-squad/js/casualty-rules.js?v=215');window.gates=await import('/iron-squad/js/gate-rules.js?v=277');
    // Reconstruct the old saved courtyard homes without modifying the live user saves.
    const hq=g.gateGuards.filter(u=>u.gatePostId.startsWith('hq_gate_'));
    hq.forEach((u,i)=>Object.assign(u,{homeX:C+(i-2)*42,homeY:C+35,x:C+(i-2)*42,y:C+35,rescuedToBase:true,returningToBase:false}));
    window.legacy=structuredClone(g.saveGame());draw();
  });
  const shot=async name=>{const file=`${name}.png`;await page.screenshot({path:`${out}/${file}`});report.screenshots.push(file);};
  await shot('legacy-courtyard-390');
  report.checks.legacy=await page.evaluate(()=>{
    g.resumeSavedGame(structuredClone(legacy));g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.monsters=[];g.worldTime=120;draw();
    const hq=g.gateGuards.filter(u=>u.gatePostId.startsWith('hq_gate_'));
    return {count:g.gateGuards.length,expected:legacy.gateGuards.length,guards:hq.map(u=>{const p=g.gatePosts.find(p=>p.id===u.gatePostId);return {id:u.id,offset:Math.hypot(u.x-p.x,u.y-p.y),refuge:u.rescuedToBase,level:u.level};})};
  });assert.equal(report.checks.legacy.count,report.checks.legacy.expected);assert.ok(report.checks.legacy.guards.every(u=>u.offset<1&&!u.refuge));
  await shot('repaired-gates-390');
  for(const [width,height]of [[844,390],[1280,800]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(80);const render=await page.evaluate(()=>{g.zoom=innerWidth>1000?1.35:1;draw();return {recovery:g._renderProblem||null,overflow:document.documentElement.scrollWidth-innerWidth};});
    assert.equal(render.recovery,null);assert.ok(render.overflow<=1);await shot(`repaired-gates-${width}`);
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);
  report.checks.passive=await page.evaluate(()=>{
    reset();g.zoom=1;const guard=g.gateGuards.find(u=>u.gatePostId==='hq_gate_4');Object.assign(guard,{x:C+500,y:C});casualty.markSoldierDown(g,guard);
    Object.assign(g.player,{x:C+450,y:C,hp:0,isDown:true,downTimer:33});const hp=g.player.maxHp;guard.x=C;guard.y=C;casualty.updateWounded(g,0);g.worldTime=300;draw(g.player.x,g.player.y);
    return {commanderDown:g.player.isDown,guardRecovered:!guard.isDown,hpBefore:hp,hpAfter:g.player.maxHp,rewards:g.rescueRewardIds.length,permanentNotes:notes.filter(t=>t.includes('（永続）')),refuge:guard.rescuedToBase};
  });assert.equal(report.checks.passive.commanderDown,true);assert.equal(report.checks.passive.guardRecovered,true);assert.equal(report.checks.passive.hpBefore,report.checks.passive.hpAfter);assert.equal(report.checks.passive.rewards,0);assert.deepEqual(report.checks.passive.permanentNotes,[]);
  await shot('down-commander-no-unearned-bonus-390');
  report.checks.ownership=await page.evaluate(()=>{
    const results=[],random=Math.random;Math.random=()=>.1;
    try{
      for(const actor of ['soldier','personal-guard','medic','commander']){
        reset();const guard=g.gateGuards.find(u=>u.gatePostId==='hq_gate_4');Object.assign(guard,{x:C+500,y:C});casualty.markSoldierDown(g,guard);
        const helper=actor==='commander'?g.player:g.squad[0];Object.assign(helper,{x:guard.x,y:guard.y,hp:helper.maxHp});
        if(actor==='medic'){Object.assign(helper,{soldierClass:'MEDIC',mana:100});casualty.treatWounded(g,helper,guard,1);}
        else{helper.isPersonalGuard=actor==='personal-guard';casualty.attachWounded(g,helper,guard);helper.x=C;helper.y=C;casualty.syncDragged(g,1);casualty.updateWounded(g,0);}
        const before=g.rescueBonuses.hpPct;casualty.grantRescueBonus(g,guard,{carrier:g.player});
        results.push({actor,revived:!guard.isDown,hpBonus:before,duplicate:g.rescueBonuses.hpPct,notices:notes.filter(t=>t.includes('（永続）')).length,refuge:guard.rescuedToBase});
      }
      const saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.stopGameLoop();results.push({actor:'save-reload',hpBonus:g.rescueBonuses.hpPct,rewards:g.rescueRewardIds.length});
    }finally{Math.random=random;}
    return results;
  });for(const r of report.checks.ownership){const expected=['commander','save-reload'].includes(r.actor)?1:0;assert.equal(r.hpBonus,expected);if(r.actor!=='save-reload'){assert.equal(r.duplicate,expected);assert.equal(r.notices,expected);assert.equal(r.revived,true);assert.equal(r.refuge,false);}}
  report.checks.guardRescuesCommander=await page.evaluate(()=>{
    reset();g.squad=[];Object.assign(g.player,{x:C+320,y:C+200});casualty.downCommander(g);
    for(let i=0;i<160;i++){casualty.updateNpcRescue(g,.1);casualty.syncDragged(g,.1);casualty.updateWounded(g,.1);gates.updateGateGuards(g,.1);}
    const helper=g.gateGuards.find(u=>u.commanderRescues>0),post=g.gatePosts.find(p=>p.id===helper?.gatePostId);
    return {commanderRecovered:!g.player.isDown,helper:helper?.id,backAtGate:helper&&Math.hypot(helper.x-post.x,helper.y-post.y)<5,rewards:g.rescueRewardIds.length,permanentNotes:notes.filter(t=>t.includes('（永続）'))};
  });assert.equal(report.checks.guardRescuesCommander.commanderRecovered,true);assert.equal(report.checks.guardRescuesCommander.backAtGate,true);assert.equal(report.checks.guardRescuesCommander.rewards,0);
  report.checks.town=await page.evaluate(()=>{
    reset();const town=g.dungeons.find(d=>d.id==='royal_castle_town');g.enterDungeon(town);g.stopGameLoop();g.monsters=[];
    const guard=g.gateGuards.find(u=>u.gatePostId===`${town.id}_inner_guard_3`);Object.assign(g.player,{x:guard.x,y:guard.y});casualty.markSoldierDown(g,guard);casualty.attachWounded(g,g.player,guard);Object.assign(g.player,{x:230,y:town.height/2});casualty.syncDragged(g,1);casualty.updateWounded(g,0);
    const post=g.gatePosts.find(p=>p.id===guard.gatePostId);for(let i=0;i<100;i++)gates.updateGateGuards(g,.1);draw(guard.x,guard.y);
    return {revived:!guard.isDown,space:guard.gateSpace,expected:town.id,offset:Math.hypot(guard.x-post.x,guard.y-post.y),refuge:guard.rescuedToBase};
  });assert.equal(report.checks.town.revived,true);assert.equal(report.checks.town.space,report.checks.town.expected);assert.ok(report.checks.town.offset<5);assert.equal(report.checks.town.refuge,false);await shot('town-guard-returned-390');
  await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
  await tab.goto(base);await tab.waitForFunction(()=>navigator.serviceWorker.controller);
  await tab.waitForFunction(async({cache,total})=>(await(await caches.open(cache)).keys()).length>=total,{cache:`game-iron-squad-${release.version}`,total:release.files.length},{timeout:60000});
  const missing=await tab.evaluate(async({cache,files})=>{const keys=await(await caches.open(cache)).keys();return files.filter(f=>!keys.some(k=>k.url===new URL(`/iron-squad/${f}`,location.origin).href));},{cache:`game-iron-squad-${release.version}`,files:release.files});assert.deepEqual(missing,[]);
  await offline.setOffline(true);await tab.reload();await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  report.checks.offline=await tab.evaluate(async()=>{
    const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.monsters=[];
    const gates=await import('/iron-squad/js/gate-rules.js?v=277'),{grantRescueBonus}=await import('/iron-squad/js/casualty-rules.js?v=215');
    const guard=g.gateGuards.find(u=>u.gatePostId==='hq_gate_0');guard.homeX=g.player.x;guard.homeY=g.player.y;guard.x=g.player.x;guard.y=g.player.y;guard.rescuedToBase=true;gates.restoreGateGuardPost(g,guard,{snap:true});
    grantRescueBonus(g,guard);const post=g.gatePosts.find(p=>p.id===guard.gatePostId);g.camera={x:g.player.x,y:g.player.y};g.render();
    return {recovery:g._renderProblem||null,rewards:g.rescueRewardIds.length,offset:Math.hypot(guard.x-post.x,guard.y-post.y),refuge:guard.rescuedToBase};
  });assert.deepEqual(report.checks.offline,{recovery:null,rewards:0,offset:0,refuge:false});report.checks.offline.cachedFiles=release.files.length;await tab.screenshot({path:`${out}/offline-repaired-gates-390.png`});report.screenshots.push('offline-repaired-gates-390.png');await offline.close();
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
}catch(error){report.failure=error.stack;throw error;}
finally{await browser.close();writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2));}
