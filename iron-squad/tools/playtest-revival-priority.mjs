import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/revival-priority-v6.11.5-20261014';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR:',e.message);});
 await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const size=viewport.width===390?'mobile':'desktop';await page.setViewportSize(viewport);
  await page.evaluate(()=>{
   const g=qualityGame;g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.reserves=[];g.civilians=[];g.currentDungeon=null;g.random=()=>.999;Object.assign(g.player,{x:80560,y:79360});g.camera={x:g.player.x,y:g.player.y};g.inBattle=true;
   const make=(id,name,cls,distance)=>Object.assign(g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE'}),{id,name,isPersonalGuard:true,isDown:true,hp:0,downTimer:45,x:g.player.x+distance,y:g.player.y});
   const mage=make('mage','魔法使い','MAGE',2),other=make('light','軽装兵','LIGHT',60),heavy=make('heavy','重装兵','HEAVY',1),medic=make('medic','衛生術師','MEDIC',70);g.squad=[mage,other,heavy,medic];g.revivalPotion=2;window.revivalQA={g,mage,other,heavy,medic};g.updateStatsUI();g.render();
  });
  assert.ok((await page.locator('#btn-pad-revive').getAttribute('title')).includes('衛生術師'));await page.screenshot({path:`${out}/all-down-${size}.png`});await page.click('#btn-pad-revive');
  const first=await page.evaluate(()=>{const {g,medic,heavy}=revivalQA;g.render();return {medicDown:medic.isDown,fullHp:medic.hp===medic.maxHp,heavyDown:heavy.isDown,potions:g.revivalPotion};});assert.deepEqual(first,{medicDown:false,fullHp:true,heavyDown:true,potions:1});await page.screenshot({path:`${out}/medic-first-${size}.png`});
  assert.ok((await page.locator('#btn-pad-revive').getAttribute('title')).includes('重装兵'));await page.click('#btn-pad-revive');
  const second=await page.evaluate(()=>{const {g,heavy,mage,other}=revivalQA;g.render();return {heavyDown:heavy.isDown,fullHp:heavy.hp===heavy.maxHp,mageDown:mage.isDown,otherDown:other.isDown,potions:g.revivalPotion};});assert.deepEqual(second,{heavyDown:false,fullHp:true,mageDown:true,otherDown:true,potions:0});await page.screenshot({path:`${out}/heavy-second-${size}.png`});
  await page.evaluate(()=>{revivalQA.g.revivalPotion=1;revivalQA.g.refreshSupplyUI();});assert.ok((await page.locator('#btn-pad-revive').getAttribute('title')).includes('軽装兵'));await page.click('#btn-pad-revive');
  const third=await page.evaluate(()=>{const {g,mage,other}=revivalQA;g.render();return {otherDown:other.isDown,fullHp:other.hp===other.maxHp,mageDown:mage.isDown,potions:g.revivalPotion};});assert.deepEqual(third,{otherDown:false,fullHp:true,mageDown:true,potions:0});await page.screenshot({path:`${out}/other-random-${size}.png`});results.push({viewport,first,second,third});
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.11.5',results,pageErrors:errors,disposableStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
