import {startQaServer} from './qa-server.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const mode=process.argv[2]||'after',cache=mode==='before'?'268':'269',out='iron-squad/docs/validation/save-policy-v6.11.19';mkdirSync(out,{recursive:true});
const server=await startQaServer(mode==='before'?'iron-squad/docs/backups/save-policy-v6.11.18-reference':null);
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={mode,cpuThrottle:4,disposableStorage:true};
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('保存頻度の1分計測');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 report.fixture=await page.evaluate(async cache=>{
  const g=qaGame;window.qaSlots=(await import('/iron-squad/js/save-slots.js?v='+cache)).saveSlots;
  g.stopGameLoop();g.closeStrategyModal();g.player.x=80000;g.player.y=76000;g.player.invulnerableTimer=600;g.player.hp=g.player.maxHp;g.camera={x:g.player.x,y:g.player.y};g.gold=1000000;g.currentQuest=null;g.updateSpawns=()=>{};g.monsters=[];g.phaseTimer=10000;
  g.equipped.weapon=g.createSupplyEquipment('WEAPON',g.player,1);g.recalcPlayerStats();g.saveGame({immediate:true});
  const active=g.saveGame({persist:false}),historical=structuredClone(active);historical.squad=historical.squad.slice(0,8);historical.dungeons=[];historical.fogExplored=[];historical.inventory=[];
  const slot=qaSlots.get(g.activeSlotId);slot.data=active;slot.checkpoint={place:'本陣',data:historical,savedAt:Date.now()};let bytes=0;
  do{historical.inventory.push({...structuredClone(g.equipped.weapon),id:`old-${historical.inventory.length}`});bytes=new TextEncoder().encode(JSON.stringify([slot])).length;}while(bytes<610000);
  qaSlots.update(slot.id,slot);return {jsonUtf8Bytes:bytes,storedBytes:new TextEncoder().encode(localStorage.getItem('game_studio_ironsquad_save_slots_v1')).length,soldiers:g.squad.length};
 },cache);await page.evaluate(()=>qaGame._pendingAutoSave);
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.evaluate(async({cache,mode})=>{
  const g=qaGame;window.qaProbe={writes:[],spans:[],frames:[],events:[],calls:[],done:false};window.qaStart=performance.now();
  const wrap=(fn,kind)=>function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{qaProbe.spans.push({start,end:performance.now(),kind});}};
  const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){const start=performance.now();try{return set.call(this,key,value);}finally{if(key==='game_studio_ironsquad_save_slots_v1'){qaProbe.writes.push({at:performance.now()-qaStart,ms:performance.now()-start});}}};
  g.saveGame=wrap(g.saveGame,'snapshot');(await import('/iron-squad/js/save-slots.js?v='+cache)).profileSaveCompletions(fn=>wrap(fn,'completion'));
  if(mode==='after'){const a=await import('/iron-squad/js/auto-save.js?v=269');a.stopAutoSave(g);a.startAutoSave(g);}
  for(const key of ['completePhase','finishRest']){const fn=g[key];g[key]=function(...args){qaProbe.events.push({key,at:performance.now()-qaStart});return fn.apply(this,args);};}
  let last=performance.now();const frame=()=>{const now=performance.now();qaProbe.frames.push({start:last,end:now,ms:now-last});last=now;if(!qaProbe.done)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  g.startGameLoop();g.openStrategyModal(true);g.rosterManageTab='equip';g._selectStratTab('troops');g._syncTroopsSubView('equip');document.getElementById('commander-equipment').open=true;
  window.qaTaps=setInterval(()=>{if(performance.now()-qaStart<20000)document.querySelector('.btn-up-equipped[data-slot="weapon"]')?.click();},500);
  setTimeout(()=>{clearInterval(qaTaps);g.closeStrategyModal();g.restTimer=10;g.restMonsters=[];g.monsters=[];},21000);
  setTimeout(()=>{g.restTimer=0;g.phaseTimer=.1;},34000);
  setTimeout(()=>{g.restTimer=0;g.phaseTimer=1000;g.spawnMonster(g.player.x+200,g.player.y);for(const m of g.monsters){m.atk=1;m.hp=m.maxHp=1000000;}},45000);
 },{cache,mode});console.log('ready',JSON.stringify(report.fixture));
 await page.waitForTimeout(60500);
 report.measure=await page.evaluate(async()=>{
  const g=qaGame;qaProbe.done=true;g.stopGameLoop();clearInterval(qaTaps);await g._pendingAutoSave;
  const union=(frame)=>{const intervals=qaProbe.spans.filter(s=>s.end>=frame.start&&s.start<=frame.end).map(s=>[Math.max(frame.start,s.start),Math.min(frame.end,s.end)]).sort((a,b)=>a[0]-b[0]);let sum=0,end=-Infinity;for(const [a,b]of intervals){sum+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return sum;};
  const slow=qaProbe.frames.filter(f=>f.ms>100).map(f=>({...f,saveMs:union(f)}));
  return {durationMs:performance.now()-qaStart,writes:qaProbe.writes,writeCount:qaProbe.writes.length,maxSaveTaskMs:Math.max(0,...qaProbe.spans.map(s=>s.end-s.start)),slowFrames:slow,saveOver100:slow.filter(f=>f.saveMs>100),events:qaProbe.events,finalSaved:qaSlots.get(g.activeSlotId).data.equipped.weapon.upgrade,liveUpgrade:g.equipped.weapon.upgrade};
 });
 await page.screenshot({path:`${out}/${mode}.png`});report.errors=errors;assert.deepEqual(errors,[]);writeFileSync(`${out}/${mode}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 if(mode==='after'){assert.ok(report.measure.writeCount>=5&&report.measure.writeCount<=7);assert.equal(report.measure.saveOver100.length,0);}
}catch(e){writeFileSync(`${out}/${mode}-failure.json`,JSON.stringify({error:String(e),report,errors},null,2)+'\n');throw e;}finally{await browser.close();await server.close();}
