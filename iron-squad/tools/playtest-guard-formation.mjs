import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/guard-formation-v6.11.16';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={version:'6.11.16',disposableStorage:true,cases:[]};
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:8000/');await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('直属5人の前後配置');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
  await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.guardGame=g;return true;});
  await page.evaluate(async()=>{
    const g=guardGame,{prefersCasterMelee,rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js?v=248'),formation=await import('/iron-squad/js/guard-formation.js?v=266');window.guardFormation=formation;
    g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.updateSpawns=()=>{};g.reserves=[];g.civilians=[];g.gateGuards=[];g.merchants=[];g.currentQuest=null;g.currentDungeon=null;g.phaseTimer=100000;g.autoSaveClock=-10000;g.magicReserve=0;
    g.player.x=80000;g.player.y=76000;g.camera={x:80000,y:76000};g.player.speed=110;
    const specs=[['HEAVY','近接'],['ARCHER','弓兵'],['MAGE','魔法使い'],['MEDIC','衛生兵'],['MAGE','筋肉魔法使い']];
    g.squad=specs.map(([classKey,label],i)=>{
      const u=g.createNewSoldier(null,{classKey,talent:'AVERAGE',level:1});u.attributeProfile=rollAttributeProfile(classKey,'AVERAGE',()=>.5,true);
      if(i===4){u.attributeProfile.innate.strength=150;u.attributeProfile.innate.magic=8;u.attributeProfile.aptitudes.strength=2;u.attributeProfile.aptitudes.magic=.5;u.equipped.weapon=g.createSupplyEquipment('WEAPON',u,1);u.weapon=u.equipped.weapon;}
      Object.assign(u,{name:label,isPersonalGuard:true,_guardSlot:i,x:g.player.x,y:g.player.y,mana:i===2?52:100,magicRecovering:false,qaLabel:label});g.recalcSoldierStats(u);u.hp=u.maxHp;u.speed=150;
      if(i===4&&!prefersCasterMelee(u))throw new Error('fixture must use a genuine melee caster');return u;
    });
    const path=g.dungeonMoveTarget;g.dungeonMoveTarget=function(unit,target){if(this.squad.includes(unit))unit.qaLastGoal={...target};return path.call(this,unit,target);};
    formation.beginGuardFormation(g,1/60);for(const u of g.squad)Object.assign(u,formation.guardFormationTarget(g,u));
  });
  for(const [name,dx,dy]of [['right',1,0],['down',0,1],['left',-1,0],['up',0,-1]]){
    const result=await page.evaluate(({name,dx,dy})=>{
      const g=guardGame;g.joystick={active:true,dirX:dx,dirY:dy};const start={x:g.player.x,y:g.player.y};
      for(let i=0;i<240;i++)g.update(1/60);g.render();
      return {name,moved:Math.hypot(g.player.x-start.x,g.player.y-start.y),guards:g.squad.map(u=>({name:u.qaLabel,role:guardFormation.guardFormationRole(u),mana:u.mana,goalProjection:(u.qaLastGoal.x-g.player.x)*dx+(u.qaLastGoal.y-g.player.y)*dy,positionProjection:(u.x-g.player.x)*dx+(u.y-g.player.y)*dy,x:u.x,y:u.y}))};
    },{name,dx,dy});assert.ok(result.moved>100);for(const u of result.guards){assert.ok(u.role==='rear'?u.goalProjection<0:u.goalProjection>0,JSON.stringify(result));assert.ok(u.role==='rear'?u.positionProjection<0:u.positionProjection>0,'steady walking keeps the actual guards on their role side');}
    report.cases.push(result);await page.screenshot({path:`${out}/${name}-mobile.png`});
  }
  report.reversal=await page.evaluate(()=>{
    const g=guardGame;g.player.facingAngle=0;g.joystick={active:true,dirX:1,dirY:0};for(let i=0;i<150;i++)g.update(1/60);
    g.joystick={active:true,dirX:-1,dirY:0};let maxStep=0,frontTargets=0;
    for(let i=0;i<180;i++){const before=g.squad.map(u=>({x:u.x,y:u.y}));g.update(1/60);for(let j=0;j<g.squad.length;j++){const u=g.squad[j];maxStep=Math.max(maxStep,Math.hypot(u.x-before[j].x,u.y-before[j].y));if(guardFormation.guardFormationRole(u)==='rear'&&u.qaLastGoal.x<g.player.x-.01)frontTargets++;}}
    g.render();return {maxStep,frontTargets};
  });assert.equal(report.reversal.frontTargets,0);assert.ok(report.reversal.maxStep<20,'no teleport in a clear formation turn');await page.screenshot({path:`${out}/reversed-mobile.png`});
  report.exhaustedCaster=await page.evaluate(()=>{
    const g=guardGame,mage=g.squad[2];mage.mana=0;mage.magicRecovering=false;g.joystick={active:true,dirX:1,dirY:0};
    for(let i=0;i<120;i++)g.update(1/60);g.render();return {mana:mage.mana,recovering:mage.magicRecovering,goalBehind:mage.qaLastGoal.x<g.player.x,actualBehind:mage.x<g.player.x};
  });assert.equal(report.exhaustedCaster.recovering,true);assert.ok(report.exhaustedCaster.goalBehind);await page.screenshot({path:`${out}/mp-low-mobile.png`});
  report.casterCommander=await page.evaluate(()=>{
    const g=guardGame;g.equipped.weapon={...g.createSupplyEquipment('WEAPON',g.squad[2],1),weaponStyle:'wand'};g.player.equipped=g.equipped;g.player.weapon=g.equipped.weapon;
    g.joystick={active:true,dirX:1,dirY:0};for(let i=0;i<120;i++)g.update(1/60);g.render();return g.squad.filter(u=>guardFormation.guardFormationRole(u)==='rear').map(u=>({name:u.qaLabel,goalBehind:u.qaLastGoal.x<=g.player.x}));
  });assert.ok(report.casterCommander.every(u=>u.goalBehind));await page.screenshot({path:`${out}/caster-commander-mobile.png`});
  // The previous recovery skill's real collision/return behavior is covered by its own regression tests.
  report.carrying=await page.evaluate(()=>{
    const g=guardGame,mage=g.squad[2],patient=g.squad[0];mage.mana=0;mage.magicRecovering=true;
    patient.isDown=true;patient.hp=0;patient.downTimer=120;patient.carrierId=mage.id;patient.rescuedThisDown=true;
    const clock=mage._magicSearchClock;g.update(1/60);return {carrierKept:patient.carrierId===mage.id,mageAISkipped:mage._magicSearchClock===clock};
  });assert.ok(Object.values(report.carrying).every(Boolean));
  await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>{guardGame.render();});await page.screenshot({path:`${out}/desktop.png`});
  report.errors=errors;assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});writeFileSync(`${out}/failure.json`,JSON.stringify({error:String(error),report,errors,body:await page.locator('body').innerText().catch(()=>null)},null,2)+'\n');throw error;}
finally{await browser.close();}
