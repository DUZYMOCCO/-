import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/campaign-walls-v6.7.1-20261013';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const suffix=viewport.width===390?'mobile':'desktop';
    const approach=await page.evaluate(async()=>{
      const g=qualityGame,{WORLD_SIZE}=await import('/iron-squad/js/world.js'),{resetBattleLog}=await import('/iron-squad/js/battle-log.js?v=241');g.stopGameLoop();g.closeSoldierDetail();g.closeStrategyModal();g.career.status='enlisted';
      Object.assign(g,{currentDungeon:null,currentQuest:null,squad:[],reserves:[],monsters:[],restMonsters:[],merchants:[],civilians:[],outposts:[],medicalPosts:[],gateGuards:[],projectiles:[],particles:[],damageTexts:[],restTimer:0,inBattle:true,_zonePreviousDistance:null,_zoneApproachWarned:0,lastZoneId:null});
      g.updateSpawns=()=>{};g.updateDemonInvasion=()=>{};g.deployReserves=()=>{};const C=WORLD_SIZE/2;Object.assign(g.player,{x:C+6500,y:C,hp:g.player.maxHp,isDown:false,atkCooldown:999});g.player.powerAtkCooldown=0;resetBattleLog(g);g.checkZoneTransition();
      g.joystick={active:true,dirX:1,dirY:0};g.update(1);g.joystick={active:false,dirX:0,dirY:0};g.camera={x:g.player.x,y:g.player.y};g.resizeCanvas();g.updateStatsUI(true);g.render();
      return {text:document.getElementById('battle-log-stream').textContent,count:g.battleLogHistory.filter(n=>n.text.startsWith('⚠️')).length,overflow:document.documentElement.scrollWidth>innerWidth};
    });assert.match(approach.text,/この先.*HP約10倍・攻撃約5倍/);assert.equal(approach.count,1);assert.equal(approach.overflow,false);await page.screenshot({path:`${out}/approach-${suffix}.png`});
    const entry=await page.evaluate(async()=>{
      const g=qualityGame,{WORLD_SIZE}=await import('/iron-squad/js/world.js');g.player.x=WORLD_SIZE/2+7999;g.player.y=WORLD_SIZE/2;g.checkZoneTransition();g.joystick={active:true,dirX:1,dirY:0};g.update(.1);g.joystick={active:false,dirX:0,dirY:0};g.camera={x:g.player.x,y:g.player.y};g.updateStatsUI(true);g.render();
      return {text:document.getElementById('battle-log-stream').textContent,flash:g.zoneAlertFlash,shake:g.screenShake,badge:document.getElementById('field-zone-badge').textContent,overflow:document.documentElement.scrollWidth>innerWidth};
    });assert.match(entry.text,/突入.*HP約10倍・攻撃約5倍/);assert.ok(entry.flash>0&&entry.shake>0);assert.doesNotMatch(entry.badge,/防御不足|推奨DEF/);assert.equal(entry.overflow,false);await page.screenshot({path:`${out}/entry-${suffix}.png`});results.push({viewport,approach,entry});
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({results,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
