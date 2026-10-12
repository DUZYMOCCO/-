import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),out='iron-squad/docs/previews/full-audit-20261012';
try {
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2}),page=await context.newPage();
  await page.goto(`${process.argv[2]||'http://127.0.0.1:8001'}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  const traffic=await page.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();g.inBattle=true;g.currentDungeon=null;g.monsters=[];
    const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=198');
    const {economicState,ECONOMIC_REGIONS}=await import('/iron-squad/js/regional-economy.js?v=182');
    const {spawnTradeParty,updateRegionalTraffic,tradeSegmentOpen}=await import('/iron-squad/js/trade-routes.js?v=199');
    const {wallBlocksAttack,fieldWallContext}=await import('/iron-squad/js/gate-rules.js?v=198');
    const C=79360;g.nation=normalizeNation({investment:18000});const e=economicState(g),region=ECONOMIC_REGIONS.find(p=>p.id!=='hq');
    e.regions[region.id].safety=1;e.regions[region.id].discovered=e.regions[region.id].liberated=true;
    const route={id:'audit-existing-route',to:region.id,points:[[C+512,C+400],[C+1400,C+400]],length:888};e.routes=[route];e.traffic=[];
    const actor=spawnTradeParty(g,route,'merchant',false);actor.speed=200;actor.progress=188;actor.x=C+700;actor.y=C+400;
    const before={x:actor.x,y:actor.y},oldOpen=tradeSegmentOpen(g,[C+700,C+400],[C+900,C+400]);
    g.nation.level=3;
    // Simulate the completed route search. The actor still owns a clone of the retired path.
    e.routes=[{...route,points:[[C+512,C],[C+1024,C],[C+1400,C+400]],length:1061}];
    updateRegionalTraffic(g,1);
    const after={x:actor.x,y:actor.y};Object.assign(g.player,{x:C+800,y:C+400});g.camera={x:C+800,y:C+350};g.zoom=1;g.render();
    return {oldOpen,before,after,wallCrossed:wallBlocksAttack(fieldWallContext(g),before,after),newRoutePoints:e.routes[0].points,actorPoints:actor.points};
  });
  await page.screenshot({path:`${out}/29-traffic-through-outer-wall.png`});
  const building=await page.evaluate(async()=>{
    const g=qualityGame,{HEADQUARTERS_FACILITIES,headquartersBuildingBlocks}=await import('/iron-squad/js/hq-facilities.js?v=198');
    const p=HEADQUARTERS_FACILITIES.find(p=>p.id==='smith'),soldier=g.squad.find(s=>s.soldierClass==='LIGHT'&&!s.isAdvanced);
    Object.assign(g.player,{x:p.x,y:p.y-20,_terrainSpace:'field'});Object.assign(soldier,{x:p.x,y:p.y-20,_terrainSpace:'field'});
    delete g.player._openX;delete g.player._openY;delete soldier._openX;delete soldier._openY;
    g.settleTerrain();return {commanderInside:headquartersBuildingBlocks(g.player.x,g.player.y),soldierInside:headquartersBuildingBlocks(soldier.x,soldier.y),soldierClass:soldier.soldierClass};
  });
  const follower=await page.evaluate(async()=>{
    const g=qualityGame,{HEADQUARTERS_FACILITIES,headquartersBuildingBlocks}=await import('/iron-squad/js/hq-facilities.js?v=198'),p=HEADQUARTERS_FACILITIES[0];
    g.updateSpawns=()=>{};g.monsters=[];g.currentQuest=null;g.restTimer=0;g.phaseTimer=100;g.inBattle=true;
    const s=g.squad.find(s=>s.soldierClass==='LIGHT'&&!s.isAdvanced);s.isPersonalGuard=true;s.overflowGuard=false;s.isDown=false;s.dead=false;s.hp=s.maxHp;g.syncPersonalGuardSlots(null,g.limitedGuardLimit());
    Object.assign(g.player,{x:p.x,y:p.y-150,_terrainSpace:'field',_openX:p.x,_openY:p.y-150});
    Object.assign(s,{x:p.x,y:p.y+50,_terrainSpace:'field',_openX:p.x,_openY:p.y+50});
    let insideFrames=0,firstInside=null;
    for(let i=0;i<240;i++){g.update(1/30);if(headquartersBuildingBlocks(s.x,s.y)){insideFrames++;firstInside||={x:s.x,y:s.y};}}
    return {insideFrames,firstInside,end:{x:s.x,y:s.y},commander:{x:g.player.x,y:g.player.y},class:s.soldierClass};
  });
  const map=await page.evaluate(()=>{const g=qualityGame;g.openWorldMap();return {text:document.getElementById('world-map-modal')?.innerText||g.worldMapModal?.innerText,outerWallLevel:g.nation.level};});
  await page.screenshot({path:`${out}/30-developed-world-map.png`});
  const tavernFunds=await page.evaluate(async()=>{
    const g=qualityGame;g.worldMapModal?.classList.add('hidden');g.setDialogState(false);g.closeStrategyModal();g.restTimer=0;g.gold=1000;
    Object.assign(g.player,{x:79160,y:80020});g.updateStatsUI(true);g.openTavern();
    const before=document.getElementById('strategy-modal').innerText;
    const person=g.taverns.roster.people.find(p=>!p.joined),startingGold=g.gold;g.recruitTavernPerson(person.unit.id,'gold');
    document.getElementById('btn-tavern-close').click();
    return {startingGold,cost:person.cost,actualGold:g.gold,before,after:document.getElementById('strategy-modal').innerText};
  });
  await page.screenshot({path:`${out}/31-stale-tavern-funds.png`});
  writeFileSync(`${out}/edge-cases.json`,JSON.stringify({traffic,building,follower,map,tavernFunds},null,2));
  console.log(JSON.stringify({traffic,building,follower,tavernFunds:{startingGold:tavernFunds.startingGold,cost:tavernFunds.cost,actualGold:tavernFunds.actualGold,menuText:tavernFunds.after.slice(0,450)}}));await context.close();
} finally {await browser.close();}
