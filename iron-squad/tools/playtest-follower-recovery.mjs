import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/follower-recovery-v6.11.1-20261014';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]) {
  const size=viewport.width===390?'mobile':'desktop';await page.setViewportSize(viewport);
  const setup=await page.evaluate(async()=>{
   const g=qualityGame;g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.updateSpawns=()=>{};
   g.monsters=[];g.reserves=[];g.civilians=[];g.gateGuards=[];g.merchants=[];g.dropsOnField=[];g.currentQuest=null;g.currentDungeon=null;g.phaseTimer=100000;
   const {createLimitedAlly}=await import('/iron-squad/js/limited-allies.js?v=277');const u=createLimitedAlly(g,'NINJA','browser-recovery');
   Object.assign(u,{isPersonalGuard:true,x:79360+95,y:79360-130,atkCooldown:100000,_guardSlot:0});g.squad=[u];
   Object.assign(g.player,{x:79360+285,y:79360-155,atkCooldown:100000,powerAtkCooldown:100000});g.camera={x:g.player.x,y:g.player.y};g.joystick={active:true,dirX:0,dirY:0};
   window.recoveryQA={g,u,resources:{hp:u.hp,mana:u.mana,ammo:u.ammo,equipment:JSON.stringify(u.equipped)}};
   for(let i=0;i<120;i++)g.update(.05);recoveryQA.resources={hp:u.hp,mana:u.mana,ammo:u.ammo,equipment:JSON.stringify(u.equipped)};g.render();return {x:u.x,y:u.y,resources:recoveryQA.resources,distance:Math.hypot(u.x-g.player.x,u.y-g.player.y)};
  });assert.ok(setup.distance>160);await page.screenshot({path:`${out}/blocked-${size}.png`});
  const result=await page.evaluate(()=>{
   const {g,u,resources}=recoveryQA;let warpedAt=null,jump=0,unearnedTravel=false;
   for(let i=0;i<80;i++){const old={x:u.x,y:u.y,travel:u.attributeProfile.practice.travel||0};g.update(.05);const d=Math.hypot(u.x-old.x,u.y-old.y);if(d>100){warpedAt=6+(i+1)*.05;jump=d;unearnedTravel=(u.attributeProfile.practice.travel||0)!==old.travel;break;}}
   g.render();return {warpedAt,jump,distance:Math.hypot(u.x-g.player.x,u.y-g.player.y),unearnedTravel,resourcesUnchanged:resources.hp===u.hp&&resources.mana===u.mana&&resources.ammo===u.ammo&&resources.equipment===JSON.stringify(u.equipped)};
  });console.log(JSON.stringify(result));assert.ok(result.warpedAt>=8&&result.warpedAt<10);assert.ok(result.distance<=100);assert.equal(result.resourcesUnchanged,true);assert.equal(result.unearnedTravel,false);
  await page.screenshot({path:`${out}/rejoined-${size}.png`});results.push({viewport,setup,result});
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.11.1',results,pageErrors:errors,disposableStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
} finally {await browser.close();}
