import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const before=process.argv[2]==='before',screensOnly=process.argv[2]==='screens',out='iron-squad/docs/validation/death-shatter-v7.0.6';
const reference=before?(process.argv[3]||'iron-squad/docs/backups/death-shatter-reference-v7.0.5'):null;
mkdirSync(out,{recursive:true});
const server=await startQaServer(reference);
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={version:before?(process.argv[3]?'7.0.6-pre-review':'7.0.5'):'7.0.6',reference,viewport:{width:390,height:844},cpu:4,disposableStorage:true,screens:[],errors:[]};
try{
  const context=await browser.newContext({viewport:report.viewport,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{let seed=13579;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();
  await page.locator('#expedition-name').fill('撃破演出の検証');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
  await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
  await page.evaluate(async()=>{
    const g=qaGame,{stopAutoSave}=await import('/iron-squad/js/auto-save.js?v=269');
    g.stopGameLoop();stopAutoSave(g);g.closeStrategyModal();
    Object.assign(g,{inBattle:true,restTimer:0,currentQuest:null,currentDungeon:null,monsters:[],reserves:[],projectiles:[],particles:[],damageTexts:[],deathShatters:[],outposts:[],merchants:[],civilians:[],gateGuards:[],medicalPosts:[],phaseTimer:1e9,worldTime:80,_monsterGrid:null});
    g.updateSpawns=()=>{};g.updateDemonInvasion=()=>{};
    // Preserve real 48-soldier AI/render work; disable attacks until the fixture's area strike.
    const x=84360,y=84360;window.qaOrigin={x,y};
    Object.assign(g.player,{x,y,level:50,hp:1e12,maxHp:1e12,atkCooldown:1e9,powerAtkCooldown:1e9,isDown:false,isAdvanced:true});g.camera={x,y};g.zoom=1;
    g.equipped.weapon={id:'qa-axe',type:'WEAPON',name:'検証の斧',weaponStyle:'axe',tier:1,stats:{atk:1}};
    g.squad=[];for(let i=0;i<48;i++){
      const s=g.createNewSoldier(null,{classKey:i%5===0?'MEDIC':i%3===0?'HEAVY':'LIGHT',talent:'AVERAGE',level:30});
      Object.assign(s,{x:x+(i%8-4)*28,y:y+40+Math.floor(i/8)*24,isPersonalGuard:i<6,hp:s.maxHp,atkCooldown:1e9,weaponSkillCooldown:1e9});g.squad.push(s);
    }
    window.qaPopulate=(count=40,boss=false)=>{
      g.monsters=[];g.particles=[];g.damageTexts=[];g.deathShatters=[];g.shockwaves=[];g._deathShatterSequence=0;
      for(let i=0;i<count;i++)g.monsters.push({id:`death-${i}`,type:boss?'goblin_king':i%2?'orc':'goblin',name:boss?'検証の中ボス':undefined,
        x:x+(i%8-3.5)*22,y:y-45-Math.floor(i/8)*17,hp:1,maxHp:100,atk:0,def:0,speed:0,radius:boss?36:12,
        color:boss?'#b49a52':i%2?'#998363':'#789569',atkTimer:1e9,isBoss:boss,hitPulse:0});
      if(count===1){g.monsters[0].x=x+45;g.monsters[0].y=y-100;}
      g._monsterGrid=null;
    };
    window.qaSweep=()=>{g.player.powerAtkCooldown=0;g.player.atk=1000;g.triggerPowerAttack();};
    g.joystick={active:false,dirX:0,dirY:0};g.fog.forceRevealAt(x,y,1200);qaPopulate();g.updateStatsUI();g.render();
  });
  const cdp=await context.newCDPSession(page);
  if(screensOnly)report.measurement=JSON.parse(readFileSync(`${out}/after.json`)).measurement;
  else{
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  report.measurement=await page.evaluate(async()=>{
    const g=qaGame,work=[],gaps=[],bursts=[];let previous,peakGroups=0,peakShards=0;
    for(let i=0;i<420;i++){
      const ts=await new Promise(requestAnimationFrame),start=performance.now();
      // Six measured sweeps, 40 live targets immediately before each real AoE.
      if(i>=60&&(i-60)%60===0){
        qaPopulate();const targets=g.monsters.length;
        qaSweep();
        bursts.push({frame:i,targets,remaining:g.monsters.length,groups:g.deathShatters.length,shards:g.deathShatters.reduce((n,e)=>n+e.shards.length,0)});
      }
      g.update(1/60);g.camera={...qaOrigin};g.render();
      peakGroups=Math.max(peakGroups,g.deathShatters.length);peakShards=Math.max(peakShards,g.deathShatters.reduce((n,e)=>n+e.shards.length,0));
      if(i>=60){work.push(performance.now()-start);if(previous!==undefined)gaps.push(ts-previous);}previous=ts;
    }
    const stats=a=>({count:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p95:[...a].sort((x,y)=>x-y)[Math.floor(a.length*.95)],max:Math.max(...a),over100:a.filter(v=>v>100).length});
    return {work:stats(work),raf:stats(gaps),frames:work,gaps,bursts,peakGroups,peakShards,actors:g.squad.length};
  });
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  }
  assert.ok(report.measurement.bursts.every(b=>b.targets===40&&b.remaining===0),'area attack kills all 40 targets');
  if(!before){
    assert.equal(report.measurement.peakGroups,12);assert.ok(report.measurement.peakShards<=96);
    report.audio=await page.evaluate(async()=>{
      const {sound}=await import('/common/js/audio.js?v=151'),g=qaGame,calls=[],play=sound.play;
      sound.play=function(name,opts){calls.push({name,...opts});return play.call(this,name,opts);};
      try{
        qaPopulate(1);qaSweep();
        qaPopulate(1,true);qaSweep();
      }finally{sound.play=play;}
      return {calls:calls.filter(c=>c.name==='stone'||c.name==='blast'),contextState:sound.ctx?.state,loadedStone:!!sound.buffers?.get?.('stone')};
    });
    assert.equal(report.audio.calls.filter(c=>c.name==='stone').length,1);assert.equal(report.audio.calls.filter(c=>c.name==='blast').length,1);
    // Single enemy, crowded sweep, midboss and a true boss: freeze actual effect ages.
    for(const [name,count,boss,age] of [['ordinary',1,false,.035],['ordinary-fragments',1,false,.18],['ordinary-gray-fragments',1,false,.18],['crowd',40,false,.12],['midboss',1,true,.035],['boss',1,true,.12]]){
      await page.evaluate(async({count,boss,age,name})=>{
        const g=qaGame;qaPopulate(count,boss);
        if(name==='ordinary-gray-fragments')delete g.monsters[0].color;
        if(name==='boss')Object.assign(g.monsters[0],{isDungeonBoss:true,bossPlaceId:'qa-death-boss'});
        if(count===1){g.monsters[0].maxHp=1000;g.performAttack(g.player,g.monsters[0],true,30);}else qaSweep();
        const {updateDeathShatters}=await import('/iron-squad/js/death-shatter.js?v=283');updateDeathShatters(g,age);
        g.camera={...qaOrigin};g.screenShake=0;g.updateStatsUI();g.render();
      },{count,boss,age,name});
      const file=`${name}-390.png`;await page.screenshot({path:`${out}/${file}`});report.screens.push(file);
    }
    report.lifecycle=await page.evaluate(()=>{
      const g=qaGame,data=g.saveGame({persist:false}),transientSaved=JSON.stringify(data).includes('deathShatter');
      g.resumeSavedGame(structuredClone(data));g.stopGameLoop();const afterLoad=g.deathShatters.length;
      g.destroy();return {transientSaved,afterLoad,afterDestroy:g.deathShatters.length};
    });
    assert.deepEqual(report.lifecycle,{transientSaved:false,afterLoad:0,afterDestroy:0});
  }
  assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify({...report,measurement:{...report.measurement,frames:undefined,gaps:undefined}}));
}finally{
  writeFileSync(`${out}/${before?'before':'after'}.json`,JSON.stringify(report,null,2)+'\n');
  await browser.close();await server.close();
}
