import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/escort-cover-v6.11.20';mkdirSync(out,{recursive:true});
const server=await startQaServer(),browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={version:'6.11.20',disposableStorage:true};
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('商人をかばう護衛');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 report.contact=await page.evaluate(()=>{
  const g=qaGame;g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.updateSpawns=()=>{};g.squad=[];g.reserves=[];g.gateGuards=[];g.medicalPosts=[];g.currentQuest=null;g.restTimer=0;g.phaseTimer=10000;
  const m=g.merchants[0];window.qaMerchant=m;Object.assign(m,{x:80000,y:76000,hp:1000,maxHp:1000,isDown:false,dead:false,returningToBase:false,rescuedToBase:false});
  m.escorts.forEach((e,i)=>Object.assign(e,{x:80000+(i?145:80),y:76000+(i?-45:20),hp:e.maxHp,isDown:false,dead:false,rescuedToBase:false,returningToBase:false,escortRegenWait:0}));
  g.merchants=[m];g._merchantById=new Map([[m.id,m]]);Object.assign(g.player,{x:79900,y:76110});g.camera={x:80025,y:76020};window.qaEscort=m.escorts[0];
  const mon={id:'cover-enemy',name:'ゴブリン',type:'goblin',x:m.x,y:m.y,hp:1000,maxHp:1000,atk:100,radius:14,speed:0};g.monsters=[mon];
  const feedback=[],draw=g.spawnDamageText;g.spawnDamageText=function(x,y,text,...args){feedback.push({x,y,text:String(text)});return draw.call(this,x,y,text,...args);};
  const before={merchant:m.hp,guardian:qaEscort.hp,other:m.escorts[1].hp};g.update(.01);g.render();
  return {before,after:{merchant:m.hp,guardian:qaEscort.hp,other:m.escorts[1].hp},wait:qaEscort.escortRegenWait,coverShown:feedback.some(f=>f.text.includes('みがわり')&&Math.hypot(f.x-qaEscort.x,f.y+24-qaEscort.y)<3)};
 });assert.equal(report.contact.before.merchant-report.contact.after.merchant,17.5);assert.ok(report.contact.after.guardian<report.contact.before.guardian);assert.equal(report.contact.after.other,report.contact.before.other);assert.ok(report.contact.coverShown);await page.screenshot({path:`${out}/01-cover-mobile.png`});
 report.regen=await page.evaluate(()=>{
  const g=qaGame,e=qaEscort;g.monsters=[];const before=e.hp;for(let i=0;i<180;i++)g.update(1/60);const afterThree=e.hp;for(let i=0;i<60;i++)g.update(1/60);const afterFour=e.hp;g.render();return {before,afterThree,afterFour,maxHp:e.maxHp,expectedAfterFour:Math.min(e.maxHp,before+e.maxHp*.01)};
 });assert.ok(Math.abs(report.regen.before-report.regen.afterThree)<.01);assert.ok(Math.abs(report.regen.afterFour-report.regen.expectedAfterFour)<.01);await page.screenshot({path:`${out}/02-regeneration-mobile.png`});
 report.far=await page.evaluate(async()=>{
  const g=qaGame,e=qaEscort,{updateMerchants}=await import('/iron-squad/js/merchant-rules.js?v=286');g.damageTarget(e,120,{attacker:{x:e.x,y:e.y},noCover:true});
  const before=e.hp,maxHp=e.maxHp;Object.assign(g.player,{x:100000,y:90000});g.camera={x:100000,y:90000};for(let i=0;i<10;i++)updateMerchants(g,1);
  return {before,after:e.hp,expected:Math.min(maxHp,before+maxHp*.07)};
 });assert.ok(Math.abs(report.far.after-report.far.expected)<.01);
 report.persistence=await page.evaluate(async()=>{
  const g=qaGame,e=qaEscort;const {saveSlots}=await import('/iron-squad/js/save-slots.js?v=269');g.damageTarget(e,20,{attacker:{x:e.x,y:e.y},noCover:true});g.saveGame({auto:true,background:true});await g._pendingAutoSave;
  const data=saveSlots.get(g.activeSlotId).data,oldId=qaMerchant.id,eid=e.id,wait=data.merchants.find(m=>m.id===oldId).escorts.find(u=>u.id===eid).escortRegenWait;
  g.resumeSavedGame(structuredClone(data));g.stopGameLoop();const m=g.merchants.find(m=>m.id===oldId),restored=m.escorts.find(u=>u.id===eid);Object.assign(g.player,{x:m.x-100,y:m.y+110});g.camera={x:m.x+25,y:m.y+20};g.monsters=[];g.render();return {savedWait:wait,loadedWait:restored.escortRegenWait};
 });assert.equal(report.persistence.savedWait,3);assert.equal(report.persistence.loadedWait,3);
 await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>qaGame.render());await page.screenshot({path:`${out}/03-restored-desktop.png`});
 report.errors=errors;assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});writeFileSync(`${out}/failure.json`,JSON.stringify({error:String(e),report,errors},null,2)+'\n');throw e;}finally{await browser.close();await server.close();}
