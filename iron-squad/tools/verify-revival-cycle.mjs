import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const base=process.argv[2]||'http://127.0.0.1:8002',out='iron-squad/docs/previews/medic-revival-20261012';mkdirSync(out,{recursive:true});
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);const release=manifest.GAME_ASSETS['iron-squad'];
const report={version:release.gameVersion,cache:release.version,checks:{},errors:[],screenshots:[]},browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    window.g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.currentQuest=null;g.restTimer=0;
    window.initial=structuredClone(g.saveGame());window.C=79360;
    window.casualty=await import('/iron-squad/js/casualty-rules.js?v=286');window.phase=await import('/iron-squad/js/phase-rules.js?v=218');
    window.motion=await import('/iron-squad/js/weapon-motion.js?v=218');window.art=await import('/iron-squad/js/visuals.js?v=218');
    window.reset=()=>{g._merchantShopClose?.();g.resumeSavedGame(structuredClone(initial));g.stopGameLoop();g.closeStrategyModal();g.inBattle=true;g.restTimer=0;g.phaseTimer=120;g.monsters=[];g.currentQuest=null;g.updateSpawns=()=>{};g.screenShake=0;};
    window.draw=()=>{g.camera={x:g.player.x,y:g.player.y};g.resizeCanvas();g.revealFogAroundPlayer(true);g.updateStatsUI(true);g.render();};
    reset();g.worldTime=300;window.patient=g.squad[0];window.medic=g.squad.find(s=>s.soldierClass==='MEDIC');
    Object.assign(patient,{x:C+600,y:C,isPersonalGuard:true});Object.assign(medic,{x:patient.x,y:patient.y,mana:100});g.squad=[patient,medic];g.reserves=[];
    Object.assign(g.player,{x:patient.x+55,y:patient.y});
  });
  const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});report.screenshots.push(`${name}.png`);};
  report.checks.repeat=await page.evaluate(()=>{
    const first=casualty.markSoldierDown(g,patient)&&casualty.treatWounded(g,medic,patient,1),deadline=medic.revivalSkillCooldownUntil;
    casualty.markSoldierDown(g,patient);const rescues=patient.timesRescued,mana=medic.mana;
    for(let i=0;i<30;i++)casualty.treatWounded(g,medic,patient,1);
    const blockedMana=medic.mana===mana;for(let i=0;i<100;i++)g.update(.1);
    Object.assign(g.player,{x:patient.x,y:patient.y});draw();
    return {first,deadline,blockedMana,isDown:patient.isDown,rescuesBefore:rescues,rescuesAfter:patient.timesRescued,remaining:casualty.revivalSkillCooldownLeft(g,medic),patientLock:!!patient.revivalCooldownUntil,buttonEnabled:!document.getElementById('btn-pad-revive').disabled};
  });
  assert.equal(report.checks.repeat.first,true);assert.equal(report.checks.repeat.deadline,360);assert.equal(report.checks.repeat.blockedMana,true);assert.equal(report.checks.repeat.isDown,true);assert.equal(report.checks.repeat.rescuesAfter,report.checks.repeat.rescuesBefore);assert.ok(Math.abs(report.checks.repeat.remaining-50)<.001);assert.equal(report.checks.repeat.patientLock,false);assert.equal(report.checks.repeat.buttonEnabled,true);
  await shot('medicine-ready-390');
  report.checks.menuPause=await page.evaluate(()=>{const before=g.worldTime;g.openStrategyModal(true);g.update(30);g.closeStrategyModal();return g.worldTime===before;});assert.equal(report.checks.menuPause,true);
  report.checks.otherMedic=await page.evaluate(()=>{
    const other=g.createNewSoldier(null,{classKey:'MEDIC'});Object.assign(other,{x:patient.x,y:patient.y,mana:100,isPersonalGuard:true});g.squad.push(other);
    for(let i=0;i<30&&patient.isDown;i++)g.update(.1);draw();return {rescued:!patient.isDown,originalOnCooldown:casualty.revivalSkillCooldownLeft(g,medic)>0,newCasterCooldown:casualty.revivalSkillCooldownLeft(g,other),noPatientLock:!patient.revivalCooldownUntil};
  });assert.equal(report.checks.otherMedic.rescued,true);assert.equal(report.checks.otherMedic.originalOnCooldown,true);assert.ok(report.checks.otherMedic.newCasterCooldown>59);assert.equal(report.checks.otherMedic.noPatientLock,true);await shot('another-medic-rescue-390');
  await page.evaluate(()=>{casualty.markSoldierDown(g,patient);window.medicineCooldownBefore=casualty.revivalSkillCooldownLeft(g,medic);draw();});
  await page.click('#btn-pad-revive');report.checks.medicine=await page.evaluate(()=>{draw();return {full:patient.hp===patient.maxHp,isDown:patient.isDown,stock:g.revivalPotion,casterCooldownUnchanged:casualty.revivalSkillCooldownLeft(g,medic)===medicineCooldownBefore,patientLock:!!patient.revivalCooldownUntil,disabled:document.getElementById('btn-pad-revive').disabled};});
  assert.deepEqual(report.checks.medicine,{full:true,isDown:false,stock:0,casterCooldownUnchanged:true,patientLock:false,disabled:true});await shot('medicine-used-390');
  report.checks.casterSave=await page.evaluate(()=>{const id=medic.id,before=casualty.revivalSkillCooldownLeft(g,medic),state=structuredClone(g.saveGame());g.resumeSavedGame(state);g.stopGameLoop();g.closeStrategyModal();medic=g.squad.find(s=>s.id===id);return {before,after:casualty.revivalSkillCooldownLeft(g,medic)};});assert.equal(report.checks.casterSave.before,report.checks.casterSave.after);
  await page.evaluate(()=>{g.openStrategyModal(true);g.openSoldierDetail(medic.id);[...document.querySelectorAll('.soldier-detail-block > div')].find(n=>n.textContent.startsWith('蘇生魔法')).scrollIntoView({block:'center'});});
  assert.match(await page.locator('#soldier-detail-host').innerText(),/蘇生魔法.*再使用まで/);await shot('caster-cooldown-390');await page.evaluate(()=>{g.closeSoldierDetail();g.closeStrategyModal();});
  await page.evaluate(()=>{window.shop=g.merchants.find(m=>!m.dead&&!m.isDown&&!m.returningToBase);Object.assign(g.player,{x:shop.x,y:shop.y});g.gold=20000;g.openMerchantShop(shop);document.querySelector('.merchant-services').open=true;});
  await page.locator('.merchant-revival-button').scrollIntoViewIfNeeded();await shot('medicine-shop-390');await page.click('.merchant-revival-button');
  report.checks.shop=await page.evaluate(()=>{const result={stock:g.revivalPotion,gold:g.gold,disabled:document.querySelector('.merchant-revival-button').disabled};g._merchantShopClose();const saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);g.stopGameLoop();g.closeStrategyModal();result.loadedStock=g.revivalPotion;return result;});
  assert.deepEqual(report.checks.shop,{stock:1,gold:10000,disabled:true,loadedStock:1});
  report.checks.noTarget=await page.evaluate(()=>{g.refreshSupplyUI();const disabled=document.getElementById('btn-pad-revive').disabled,used=g.useRevivalPotion();g.player.isDown=true;g.player.hp=0;const selfUsed=g.useRevivalPotion();g.player.isDown=false;g.player.hp=g.player.maxHp;return {disabled,used,selfUsed,stock:g.revivalPotion};});assert.deepEqual(report.checks.noTarget,{disabled:true,used:false,selfUsed:false,stock:1});
  report.checks.reserves=await page.evaluate(async()=>{
    reset();g.worldTime=300;g.squad=g.squad.slice(0,g.deploymentCapacity()-1);const injured=g.createNewSoldier(),healthy=g.createNewSoldier();Object.assign(injured,{x:C+600,y:C,hp:0,isDown:true,downTimer:45,revivalCooldownUntil:360});g.reserves=[injured,healthy];
    const deployed=g.deployReserves(),result={deployed,healthyDeployed:g.squad.includes(healthy),injuredWaiting:g.reserves.includes(injured),down:injured.isDown,hp:injured.hp};
    Object.assign(g.player,{x:injured.x,y:injured.y});draw();result.drawnAtActualPosition=g._lanternActors.some(a=>a.id.endsWith(`:${injured.id}`)&&a.x===injured.x&&a.y===injured.y);result.target=casualty.nearestRevivalPotionTarget(g)?.id===injured.id;
    const farm=await import('/iron-squad/js/reserve-farm.js?v=277');Object.assign(g.player,{x:farm.FARM_X+250,y:farm.FARM_Y});draw();result.ghostOnFarm=g._lanternActors.some(a=>a.id.endsWith(`:${injured.id}`));return result;
  });assert.deepEqual(report.checks.reserves,{deployed:1,healthyDeployed:true,injuredWaiting:true,down:true,hp:0,drawnAtActualPosition:true,target:true,ghostOnFarm:false});
  report.checks.headquarters=await page.evaluate(()=>{
    reset();g.worldTime=300;patient=g.squad[0];medic=g.squad.find(s=>s.soldierClass==='MEDIC');Object.assign(patient,{x:C+600,y:C});Object.assign(medic,{x:patient.x,y:patient.y,mana:100});casualty.markSoldierDown(g,patient);casualty.treatWounded(g,medic,patient,1);g.worldTime=310;casualty.markSoldierDown(g,patient);Object.assign(g.player,{x:C,y:C});Object.assign(patient,{x:C,y:C});g.startDemonInvasion();g.arriveDemonInvasion();casualty.updateWounded(g,0);draw();return {battle:g.invasions.stage,paused:casualty.headquartersRevivalPaused(g),stillDown:patient.isDown,originalCasterRemaining:casualty.revivalSkillCooldownLeft(g,medic)};
  });assert.deepEqual(report.checks.headquarters,{battle:'battle',paused:true,stillDown:true,originalCasterRemaining:50});await shot('invasion-hq-revival-paused-390');
  report.checks.clinic=await page.evaluate(()=>{const clinic=g.medicalPosts[0];Object.assign(patient,{x:clinic.x,y:clinic.y});Object.assign(g.player,{x:clinic.x,y:clinic.y});casualty.updateWounded(g,0);draw();return {invasion:g.invasions.stage,revived:!patient.isDown,full:patient.hp===patient.maxHp,casterStillWaiting:casualty.revivalSkillCooldownLeft(g,medic)===50};});assert.deepEqual(report.checks.clinic,{invasion:'battle',revived:true,full:true,casterStillWaiting:true});await shot('invasion-clinic-rescue-390');
  report.checks.afterInvasion=await page.evaluate(()=>{Object.assign(patient,{x:C+600,y:C});casualty.markSoldierDown(g,patient);Object.assign(patient,{x:C,y:C});Object.assign(g.player,{x:C,y:C});g.finishDemonInvasion('victory');casualty.updateWounded(g,0);return {stage:g.invasions.stage,paused:casualty.headquartersRevivalPaused(g),revived:!patient.isDown};});assert.deepEqual(report.checks.afterInvasion,{stage:'idle',paused:false,revived:true});
  report.checks.waitLabel=await page.evaluate(()=>{
    reset();g.worldTime=300;Object.assign(g.player,{x:C+600,y:C});const healer=g.squad.find(s=>s.soldierClass==='MEDIC');Object.assign(healer,{x:g.player.x,y:g.player.y,mana:100});casualty.downCommander(g);casualty.treatWounded(g,healer,g.player,1);casualty.downCommander(g);g.invasions.stage='battle';
    const texts=[],old=g.ctx.fillText;g.ctx.fillText=function(...args){texts.push(args[0]);return old.apply(this,args);};draw();g.ctx.fillText=old;
    return {patientLockLabel:texts.some(t=>t.includes('次の蘇生まで')),hqPausedLabel:texts.some(t=>t.includes('本陣の復活停止中')),drugDisabled:document.getElementById('btn-pad-revive').disabled};
  });assert.deepEqual(report.checks.waitLabel,{patientLockLabel:false,hqPausedLabel:true,drugDisabled:true});await shot('commander-invasion-rescue-390');
  report.checks.waves=await page.evaluate(()=>{
    reset();patient=g.squad[0];medic=g.squad.find(s=>s.soldierClass==='MEDIC');const rows=[];
    for(let wave=1;wave<=5;wave++){
      if(g.restTimer>0)phase.advanceRest(g,10);g.worldTime=(wave-1)*128;Object.assign(medic,{x:patient.x,y:patient.y});
      for(let down=0;down<2;down++){if(down)g.worldTime+=60;casualty.markSoldierDown(g,patient);medic.mana=100;if(!casualty.treatWounded(g,medic,patient,1))throw Error('Spaced revival failed');}
      const recent=phase.recentDownCount(patient,g.phase);g.completePhase();rows.push({wave,recent,awakened:g.deathlineReport.awakenedList.length});
      if(wave===4){const id=patient.id,mid=medic.id;g.resumeSavedGame(structuredClone(g.saveGame()));g.stopGameLoop();g.closeStrategyModal();patient=g.squad.find(s=>s.id===id);medic=g.squad.find(s=>s.id===mid);}
    }
    const result={rows,qualified:g.deathlineReport.qualifiedCount,recipient:g.deathlineReport.awakenedList[0]?.id,patient:patient.id,others:g.squad.filter(s=>s!==patient).reduce((n,s)=>n+(s.survivedDeathlines||0),0),consumed:phase.recentDownCount(patient,g.phase),window:g.deathlineReport.windowPhases};
    g.openStrategyModal(true);g._selectStratTab('overview');document.getElementById('command-report').open=true;document.getElementById('strat-report').scrollIntoView();return result;
  });
  assert.deepEqual(report.checks.waves.rows.map(r=>r.awakened),[0,0,0,0,1]);assert.equal(report.checks.waves.qualified,1);assert.equal(report.checks.waves.recipient,report.checks.waves.patient);assert.equal(report.checks.waves.others,0);assert.equal(report.checks.waves.consumed,0);assert.equal(report.checks.waves.window,5);await shot('five-wave-awakening-390');
  await page.evaluate(()=>{g.closeStrategyModal();reset();Object.assign(g.player,{x:C+600,y:C,facingAngle:0});g.equipped.weapon={type:'WEAPON',tier:6,weaponStyle:'cannon'};g.worldTime=300;g.zoom=1.6;g.squad=[];g.reserves=[];draw();});
  await shot('cannon-right-390');await page.evaluate(()=>{g.player.facingAngle=Math.PI;draw();});await shot('cannon-left-390');
  report.checks.controls=[];
  for(const [width,height]of [[320,700],[375,812],[390,844],[844,390],[1280,800]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(80);const layout=await page.evaluate(()=>{
      draw();const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
      return {width:innerWidth,height:innerHeight,recovery:rect('btn-pad-potion'),revival:rect('btn-pad-revive'),stick:rect('dpad-base'),attack:rect('btn-pad-attack'),overflow:document.documentElement.scrollWidth>innerWidth,recoveryError:g._renderProblem||null};
    });
    assert.equal(layout.overflow,false);assert.equal(layout.recoveryError,null);assert.ok(Math.abs(layout.recovery.y-layout.revival.y)<1);assert.ok(layout.revival.x>=layout.recovery.right);assert.ok(layout.recovery.w>=44&&layout.recovery.h>=44&&layout.revival.w>=44&&layout.revival.h>=44);assert.ok(layout.recovery.x>=0&&layout.revival.right<=width&&layout.revival.bottom<=height);
    const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;assert.equal(overlaps(layout.revival,layout.stick),false);assert.equal(overlaps(layout.recovery,layout.stick),false);assert.equal(overlaps(layout.revival,layout.attack),false);report.checks.controls.push(layout);await shot(`controls-${width}`);
  }
  await page.setViewportSize({width:1100,height:700});await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.id='cannon-review';canvas.width=1080;canvas.height=680;Object.assign(canvas.style,{position:'fixed',inset:'0',zIndex:10000,width:'1080px',height:'680px'});document.body.append(canvas);
    const c=canvas.getContext('2d');c.fillStyle='#18292f';c.fillRect(0,0,1080,680);c.fillStyle='#eadcbd';c.font='bold 24px sans-serif';c.fillText('火砲：左向きでも照星は上・握りは下',24,38);
    const colors={cloth:'#708881',gloves:'#987b5b',blade:'#b5bfb8',hand:'#bd9975',weaponProfile:{detail:2}};
    for(const [i,angle,label]of [[0,0,'右向き'],[1,Math.PI,'左向き']]){c.save();c.translate(270+i*510,210);c.scale(6,6);motion.drawRangedWeapon(c,{atkAnim:0,facingAngle:angle},'cannon',colors,false,false);c.restore();c.fillStyle='#d3c5a6';c.font='20px sans-serif';c.fillText(label,240+i*510,300);}
    const unit={...structuredClone(initial.squad[0]),x:0,y:0,equipped:{weapon:{tier:6,weaponStyle:'cannon'},armor:{tier:3}}};
    for(let i=0;i<8;i++){c.save();c.translate(65+i*135,495);c.scale(2.4,2.4);art.drawFieldSoldier(c,{...unit,atkAnim:.57,attackAngle:i*Math.PI/4,facingAngle:i*Math.PI/4},2400,{baseClassId:'HEAVY'},'#789181',false);c.restore();c.fillStyle='#b7c7c1';c.font='16px sans-serif';c.fillText(`${i*45}°`,48+i*135,570);}
  });await page.locator('#cannon-review').screenshot({path:`${out}/cannon-directions.png`});report.screenshots.push('cannon-directions.png');await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));await tab.goto(base);await tab.waitForFunction(()=>navigator.serviceWorker.controller);
  await tab.waitForFunction(async({cache,total})=>(await(await caches.open(cache)).keys()).length>=total,{cache:`game-iron-squad-${release.version}`,total:release.files.length},{timeout:60000});
  await offline.setOffline(true);await tab.reload();await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  report.checks.offline=await tab.evaluate(async()=>{const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();const cr=await import('/iron-squad/js/casualty-rules.js?v=286'),pr=await import('/iron-squad/js/phase-rules.js?v=218');g.camera={x:g.player.x,y:g.player.y};g.render();return {stock:g.revivalPotion,disabled:document.getElementById('btn-pad-revive').disabled,cooldown:cr.REVIVAL_COOLDOWN,casterHelper:typeof cr.revivalSkillCooldownLeft,window:pr.DEATHLINE_WINDOW_PHASES,recovery:g._renderProblem||null};});assert.deepEqual(report.checks.offline,{stock:1,disabled:true,cooldown:60,casterHelper:'function',window:5,recovery:null});report.checks.offline.assets=release.files.length;await tab.screenshot({path:`${out}/offline.png`});report.screenshots.push('offline.png');await offline.close();assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
}catch(error){report.failure=error.stack;throw error;}
finally{await browser.close();writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2));}
