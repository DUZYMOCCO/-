import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const profile=process.argv[4]==='profile';
const version=process.argv[2]||'7.0.1',reference=process.argv[3]&&process.argv[3]!=='current'?process.argv[3]:null,out=`iron-squad/docs/validation/biomes-v${version}`;
mkdirSync(out,{recursive:true});
const server=await startQaServer(reference),browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],report={version,reference,viewport:{width:390,height:844},cpu:4,disposableStorage:true,biomes:[],screens:[]};
try{
 const context=await browser.newContext({viewport:report.viewport,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=13579;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
 await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('地形と敵の検証');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 await page.evaluate(async()=>{
  const g=qaGame,{stopAutoSave}=await import('/iron-squad/js/auto-save.js?v=269');g.stopGameLoop();stopAutoSave(g);g.closeStrategyModal();
  Object.assign(g,{inBattle:true,restTimer:0,currentQuest:null,currentDungeon:null,reserves:[],projectiles:[],particles:[],damageTexts:[],merchants:[],civilians:[],gateGuards:[],phaseTimer:1e9,worldTime:80,_monsterGrid:null});
  g.updateSpawns=()=>{};g.updateDemonInvasion=()=>{};g.joystick={active:true,dirX:1,dirY:0};g.zoom=1;
  Object.assign(g.player,{level:50,hp:1e12,maxHp:1e12,atkCooldown:1e9,powerAtkCooldown:1e9,isDown:false});
  g.squad=[];for(let i=0;i<48;i++){const s=g.createNewSoldier(null,{classKey:i%5===0?'MEDIC':i%3===0?'HEAVY':'LIGHT',talent:'AVERAGE',level:30});Object.assign(s,{isPersonalGuard:i<6,hp:s.maxHp,atkCooldown:1e9,weaponSkillCooldown:1e9});g.squad.push(s);}
 });
 await page.evaluate(()=>{window.qaFullSquad=[...qaGame.squad];});
 const cdp=await context.newCDPSession(page);
 const scenes=[['east',26000,3000],['south',3000,26000],['north',3000,-26000],['west',-26000,3000]];
 for(const [name,ox,oy,period,time] of (profile?scenes.flatMap(s=>[['day',80],['night',320]].map(p=>[...s,...p])):scenes.map(s=>[...s,'day',80]))){
  await page.evaluate(async({ox,oy,name,version,time})=>{
   const g=qaGame,x=Math.floor((79360+ox)/1024)*1024+512,y=Math.floor((79360+oy)/1024)*1024+512;
   g.squad=[...qaFullSquad];g.joystick.active=true;g.worldTime=time;window.qaWorkerTimes=[];window.qaLongTasks=[];
   Object.assign(g.player,{x:x-130,y:y+25});delete g.player._openX;delete g.player._openY;g.camera={x:x-130,y:y+25};window.qaOrigin={x:x-130,y:y+25};
   for(let i=0;i<g.squad.length;i++){const s=g.squad[i];Object.assign(s,{x:g.player.x+(i%8-4)*25,y:g.player.y+55+Math.floor(i/8)*22,isDown:false,hp:1e9,maxHp:1e9});delete s._openX;delete s._openY;}
   g.monsters=[];for(let i=0;i<40;i++)g.monsters.push({id:`qa-${i}`,type:i%2?'orc':'goblin',x:x+(i%8-4)*32,y:y-120-Math.floor(i/8)*28,hp:1e12,maxHp:1e12,atk:0,speed:15,radius:12,atkTimer:1e9});if(version!=='7.0.1'){
    const {biomeEnemyStats}=await import('/iron-squad/js/biome-encounters.js?v=279');
    const types={east:['road_archer','bandit_rider','wild_dog','plains_bull'],south:['salt_scorpion','sand_worm','salt_mummy','dust_spirit'],north:['goat_ogre','snow_wolf','rock_troll','harpy'],west:['bog_slime','giant_frog','lizard_spearman','marsh_wisp']}[name].concat(['orc','wolf','wraith','vampire_bat','imp','demon_lancer','demon_mage','hellhound']);
    g.monsters.forEach((m,i)=>{const stats=biomeEnemyStats({type:types[i%types.length],band:2},'ZONE_CHAOS');Object.assign(m,{type:stats.type,radius:stats.radius,flying:stats.flying,charge:stats.charge,rangedKind:stats.rangedKind,speed:stats.speed*.3,chargeCooldown:2,attackReach:stats.attackReach});});
   }
   g.updateStatsUI();g.render();
  },{ox,oy,name,version,time});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const result=await page.evaluate(async()=>{
   const g=qaGame,work=[],gaps=[],arrivalGaps=[],positions=[],edges=[];let previous,previousArrival;
   const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())window.qaLongTasks.push({start:e.startTime,duration:e.duration});});observer.observe({entryTypes:['longtask']});
   const hookWorker=()=>{const w=g.worldTerrain._terrainWorker;if(w&&!w._qaTimed&&w.onmessage){w._qaTimed=true;const callback=w.onmessage;w.onmessage=function(event){const start=performance.now();try{return callback.call(this,event);}finally{qaWorkerTimes.push({start,ms:performance.now()-start});}};}};
   for(let i=0;i<420;i++){
    const ts=await new Promise(requestAnimationFrame),start=performance.now();hookWorker();g.update(1/60);g.camera={x:g.player.x,y:g.player.y};g.render();hookWorker();
    if((i>=50&&i<=70)||(previous!==undefined&&ts-previous>90))edges.push({frame:i,ts,arrival:start,work:performance.now()-start,rafGap:ts-previous,arrivalGap:start-previousArrival});
    if(i>=60){work.push(performance.now()-start);if(previous!==undefined){gaps.push(ts-previous);arrivalGaps.push(start-previousArrival);}if(i%60===0)positions.push({x:g.player.x,y:g.player.y});}previous=ts;previousArrival=start;
   }
   const stats=a=>({count:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p95:[...a].sort((x,y)=>x-y)[Math.floor(a.length*.95)],max:Math.max(...a),over100:a.filter(v=>v>100).length});
   observer.disconnect();
   return {work:stats(work),raf:stats(gaps),arrival:stats(arrivalGaps),arrivalGaps,edges,workerTimes:qaWorkerTimes,longTasks:qaLongTasks,positions,frames:work,gaps,actors:g.squad.length,enemies:g.monsters.length};
  });await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});report.biomes.push({name,period,...result});
  if(!reference&&!profile){
   // Return to an unvisited terrain cell; show the real field with old and new enemies together.
   await page.evaluate(async({ox,oy,name,version})=>{
    const g=qaGame,x=Math.floor((79360+ox)/1024)*1024+512,y=Math.floor((79360+oy)/1024)*1024+512;
    g.player.x=x;g.player.y=y+95;g.player.atkCooldown=0;g.camera={x,y};g.joystick.active=false;g.monsters=[];g.squad=g.squad.slice(0,6);g.squad.forEach((s,i)=>{s.x=x+(i-3)*29;s.y=y+155;});
    const types={east:['road_archer','bandit_rider','wild_dog','plains_bull'],south:['salt_scorpion','sand_worm','salt_mummy','dust_spirit'],north:['goat_ogre','snow_wolf','rock_troll','harpy'],west:['bog_slime','giant_frog','lizard_spearman','marsh_wisp']}[name];
    const ids=version==='7.0.1'?['goblin','wolf','orc','slime']:types.concat(['goblin','wolf','wraith','vampire_bat','imp','demon_lancer','demon_mage','hellhound']);
    ids.forEach((type,i)=>g.monsters.push({id:`screen-${i}`,type,x:x+(i%3-1)*91,y:y-240+Math.floor(i/3)*95,hp:100,maxHp:100,atk:0,speed:0,radius:18,facingAngle:0,hitPulse:0}));g.worldTime=80;
    // Reveal this local view as ordinary exploration does, without touching persistent storage.
    g.fog?.reveal?.(x,y,1200);g.fog?.revealWorld?.(x,y,1200);g.updateStatsUI();g.render();
   },{ox,oy,name,version});
   for(const [period,time] of [['day',80],['night',320]]){
    await page.evaluate(time=>{qaGame.worldTime=time;qaGame.player.atkCooldown=0;qaGame.player.powerAtkCooldown=0;qaGame.updatePowerAtkButtonUI();qaGame.render();},time);const file=`${name}-${period}-390.png`;await page.screenshot({path:`${out}/${file}`});report.screens.push(file);
   }
  }
 }
 if(version==='7.0.4'&&!reference&&!profile){
  report.features=[];
  for(const [region,kind] of [['east','ruin'],['south','camp'],['north','shrine'],['west','tower']]){
   const initial=await page.evaluate(async({region,kind})=>{
    const g=qaGame,site=g.wildernessSites.find(s=>s.region===region&&s.kind===kind&&!s.cleared);window.qaSite=site;
    Object.assign(g,{monsters:[],projectiles:[],particles:[],damageTexts:[],merchants:[],currentDungeon:null,restTimer:0,inBattle:true});g.gainExp=()=>{};
    Object.assign(g.player,{x:site.x,y:site.y+175,hp:1e12,maxHp:1e12,powerAtkCooldown:0,atkCooldown:1e9});delete g.player._openX;delete g.player._openY;g.camera={x:site.x,y:site.y};g.joystick.active=false;
    g.squad=g.squad.slice(0,2);g.squad.forEach((s,i)=>{s.x=site.x+(i?22:-22);s.y=site.y+220;});
    g.fog.forceRevealAt(site.x,site.y,1200);
    const {updateWildernessSites}=await import('/iron-squad/js/wilderness-sites.js?v=281');updateWildernessSites(g,.3);g.updatePowerAtkButtonUI();g.updateStatsUI();g.render();
    return {site:site.id,guards:g.monsters.filter(m=>m.wildernessSiteId===site.id).length,loot:g.dropsOnField.length,gold:g.gold,fog:g.fog.isExploredWorld(site.x+3500,site.y)};
   },{region,kind});
   for(const [period,time] of [['day',80],['night',320]]){
    await page.evaluate(time=>{qaGame.worldTime=time;qaGame.render();},time);const file=`site-${region}-${kind}-${period}-390.png`;await page.screenshot({path:`${out}/${file}`});report.screens.push(file);
   }
   const claimed=await page.evaluate(()=>{
    const g=qaGame,s=qaSite,claim=g.claimWildernessSite;let lootCreated=0;g.claimWildernessSite=function(site){const before=this.dropsOnField.length,result=claim.call(this,site);if(result)lootCreated+=this.dropsOnField.length-before;return result;};
    if(s.kind==='camp')for(const m of [...g.monsters])if(m.wildernessSiteId===s.id){m.hp=0;g.killMonster(m,g.player,true);}
    g.player.x=s.x;g.player.y=s.y+65;delete g.player._openX;delete g.player._openY;g.update(.3);g.claimWildernessSite=claim;g.camera={x:s.x,y:s.y};g.render();
    return {lootCreated,cleared:s.cleared,guardsDefeated:s.guardsDefeated,loot:g.dropsOnField.length,gold:g.gold,blessing:g.wildernessBlessing,fog:g.fog.isExploredWorld(s.x+3500,s.y)};
   });
   assert.equal(claimed.cleared,true);if(kind==='camp'){assert.equal(initial.guards,4);assert.equal(claimed.guardsDefeated,4);}if(kind==='ruin'||kind==='camp'){assert.ok(claimed.gold>initial.gold);assert.ok(claimed.lootCreated>=(kind==='camp'?3:2));}if(kind==='shrine')assert.equal(claimed.blessing,180);if(kind==='tower'){assert.equal(initial.fog,false);assert.equal(claimed.fog,true);}
   report.features.push({region,kind,initial,claimed});
  }
  report.save=await page.evaluate(()=>{const g=qaGame,data=g.saveGame({immediate:true});return {sites:data.wildernessSites.length,cleared:data.wildernessSites.filter(s=>s.cleared).length,blessing:data.wildernessBlessing,medicalPosts:g.medicalPosts.length};});assert.equal(report.save.sites,48);assert.equal(report.save.medicalPosts,22);
  await page.evaluate(()=>qaGame.openWorldMap());await page.screenshot({path:`${out}/world-map-390.png`});report.screens.push('world-map-390.png');
 }
 assert.deepEqual(errors,[]);report.errors=errors;
 console.log(JSON.stringify({...report,biomes:report.biomes.map(({frames,gaps,arrivalGaps,edges,workerTimes,longTasks,...b})=>b)}));
}finally{report.errors=errors;writeFileSync(`${out}/${profile?'profile-':''}${reference?'before':'after'}.json`,JSON.stringify(report,null,2).split('\n').join('\r\n'));await browser.close();await server.close();}
