import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/notices-20261012',base=process.argv[2]||'http://127.0.0.1:8001';mkdirSync(out,{recursive:true});
const report={errors:[],checks:{},screens:[]},browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{window.g=qualityGame;g.stopGameLoop();g.monsters=[];g.updateSpawns=()=>{};g.currentQuest=null;g.restTimer=0;g.phaseTimer=300;g.inBattle=true;g.resizeCanvas();});
  const shot=async name=>{await page.evaluate(()=>{g.resizeCanvas();g.render();});await page.screenshot({path:`${out}/${name}.png`});report.screens.push(name);};
  const reward=await page.evaluate(async()=>{
    const {grantPermanentRescueReward}=await import('/iron-squad/js/rescue-rewards.js?v=204'),before=g.player.maxHp;
    const reward=grantPermanentRescueReward(g,{id:'important-notice-qa',name:'救出した旅人'},()=>.1);return {key:reward.key,before,after:g.player.maxHp};
  });assert.equal(reward.key,'hpPct');assert.ok(reward.after>reward.before);assert.ok((await page.locator('#battle-log-stream').innerText()).includes('永続'));
  await page.waitForTimeout(4100);await page.evaluate(()=>{g.damageTexts=[];g.showToast('鉄の盾をドロップ');});
  assert.ok((await page.locator('#battle-log-stream').innerText()).includes('永続'));assert.equal(await page.locator('.battle-log-window').evaluate(e=>e.classList.contains('has-field-note')),true);
  const styles=await page.locator('.battle-log-msg').evaluate(e=>({background:getComputedStyle(e).backgroundColor,overflow:e.scrollWidth-e.clientWidth}));assert.equal(styles.background,'rgb(240, 240, 240)');assert.ok(styles.overflow<=2);
  await shot('01-permanent-reward-after-four-seconds');await page.waitForTimeout(4200);assert.equal(await page.locator('.battle-log-window').evaluate(e=>e.classList.contains('has-field-note')),false);
  report.checks.permanent={...reward,visibleAfterFourSeconds:true,protectedFromLoot:true,expiredAfterEightSeconds:true,...styles};
  await page.evaluate(()=>g.showToast('通常の素材をドロップ'));await page.waitForTimeout(3300);assert.equal(await page.locator('.battle-log-window').evaluate(e=>e.classList.contains('has-field-note')),false);report.checks.normalThreeSeconds=true;
  const shrine=await page.evaluate(()=>{
    const c=79360,s={id:'notice-qa-shrine',type:'SHRINE',x:c+200,y:c+140,radius:30,hp:1,maxHp:1,color:'#aabbee'};g.outposts.push(s);Object.assign(g.player,{x:c+150,y:c+190});g.camera={x:s.x,y:s.y};g.damageOutpost(s,1);
    const initial=g.dialogue.resultNotice.life;g.inBattle=false;g.update(10);const paused=g.dialogue.resultNotice.life;g.inBattle=true;g.dialogue.update(4);return {initial,paused,afterFour:g.dialogue.resultNotice.life,lines:g.dialogue.resultNotice.lines};
  });assert.equal(shrine.initial,8);assert.equal(shrine.paused,8);assert.equal(shrine.afterFour,4);report.checks.shrine=shrine;await shot('02-shrine-eight-second-result');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await shot('03-shrine-landscape');
  const ordinary=await page.evaluate(()=>{g.dialogue.update(4.01);const expired=!g.dialogue.resultNotice;g.dialogue.notifyResult(g.player,['通常の結果']);return {importantExpired:expired,ordinaryResultLife:g.dialogue.resultNotice.life,chatterLife:g.dialogue.bubbleLifetime,damageLife:(g.spawnDamageText(g.player.x,g.player.y,'通常ダメージ','#fff'),g.damageTexts.at(-1).life)};});
  assert.deepEqual(ordinary,{importantExpired:true,ordinaryResultLife:3,chatterLife:1.8,damageLife:.6});report.checks.ordinary=ordinary;await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
  await tab.goto(base);await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');
  await tab.waitForFunction(async()=>navigator.serviceWorker.controller&&(await(await caches.open('game-iron-squad-v204')).keys()).length>=114);
  await tab.evaluate(()=>gameStudioInstance.activeGame.saveGame());await offline.setOffline(true);await tab.reload();await tab.waitForTimeout(500);const version=await tab.locator('[data-version-for="iron-squad"]').textContent();assert.ok(version.includes('6.1.3'));
  await tab.click('[data-game-id="iron-squad"]');await tab.locator('[data-slot-id]').first().click();await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  await tab.evaluate(async()=>{const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();const {grantPermanentRescueReward}=await import('/iron-squad/js/rescue-rewards.js?v=204');grantPermanentRescueReward(g,{id:'offline-important-qa',name:'助けた商人'},()=>.7);});
  assert.ok((await tab.locator('#battle-log-stream').innerText()).includes('防御力 +1%（永続）'));assert.equal(await tab.evaluate(()=>gameStudioInstance.activeGame._activeFieldNotice.important),true);
  report.checks.offline={version,permanentNotice:true};await offline.close();assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
}finally{await browser.close();writeFileSync(`${out}/ui.json`,JSON.stringify(report,null,2));}
