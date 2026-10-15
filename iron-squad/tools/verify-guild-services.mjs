import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/services-20261012',base=process.argv[2]||'http://127.0.0.1:8001';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report={errors:[],checks:{},screens:[]};
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{window.g=qualityGame;g.stopGameLoop();g.updateSpawns=()=>{};g.monsters=[];g.currentQuest=null;g.restTimer=0;g.phaseTimer=300;g.worldTime=300;g.inBattle=true;});
  const shot=async name=>{await page.evaluate(()=>{if(!g.container.classList.contains('dialog-open')){g.resizeCanvas();g.render();}});await page.screenshot({path:`${out}/${name}.png`});report.screens.push(name);};
  const move=async(id,side='south')=>{
    await page.evaluate(async({id,side})=>{
      if(document.querySelector('#hq-facility-dialog'))g.closeHeadquartersFacility();if(document.querySelector('#tavern-dialog'))document.querySelector('#btn-tavern-close').click();
      if(!document.querySelector('#strategy-modal').classList.contains('hidden'))g.closeStrategyModal();
      g.resizeCanvas();
      const {HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js?v=277'),{FIELD_TAVERN}=await import('/iron-squad/js/tavern.js?v=277');
      const p=id==='tavern'?{...FIELD_TAVERN,w:344,h:150,roof:62}:HEADQUARTERS_FACILITIES.find(p=>p.id===id),roof=p.roof??35;
      const [x,y]=side==='north'?[p.x,p.y-p.h-roof-18]:side==='west'?[p.x-p.w/2-20,p.y-p.h/2]:side==='east'?[p.x+p.w/2+20,p.y-p.h/2]:[p.x,p.y+22];
      g.currentDungeon=null;Object.assign(g.player,{x,y,_openX:x,_openY:y,_wallX:x,_wallY:y});g.inBattle=true;g.restTimer=0;g.update(.01);g.camera={x,y};g.render();
    },{id,side});
  };
  const contact=[];
  for(const id of ['smith','guild','casino','tavern'])for(const side of ['north','east','south','west']){
    await move(id,side);const button=id==='tavern'?'#btn-field-tavern':'#btn-hq-facility';assert.equal(await page.locator(button).isVisible(),true,`${id} ${side}`);
    const styles=await page.locator(button).evaluate(e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,color:s.color,border:s.borderWidth};});assert.equal(styles.bg,'rgb(240, 240, 240)');assert.equal(styles.border,'1px');contact.push({id,side,...styles});
    await page.click(button);assert.equal(await page.locator(id==='tavern'?'#tavern-dialog':'#hq-facility-dialog').isVisible(),true);
  }
  report.checks.buildingContact=contact;await move('tavern','north');await shot('01-tavern-white-prompt');
  await move('guild','west');
  const walkStart=await page.evaluate(()=>{Object.assign(g.player,{x:79420,y:79230,_openX:79420,_openY:79230,_wallX:79420,_wallY:79230});g.update(.01);g.updateStatsUI(true);g.startGameLoop();return {x:g.player.x,y:g.player.y};});
  const stick=await page.locator('#dpad-base').boundingBox();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width/2+36,stick.y+stick.height/2);await page.waitForTimeout(450);await page.mouse.up();
  const walked=await page.evaluate(start=>{g.stopGameLoop();g.updateStatsUI(true);return {distance:Math.hypot(g.player.x-start.x,g.player.y-start.y),x:g.player.x,y:g.player.y,prompt:!document.querySelector('#btn-hq-facility').classList.contains('hidden')};},walkStart);assert.ok(walked.distance>10);assert.equal(walked.prompt,true);report.checks.realSideApproach=walked;await shot('02a-real-west-approach');
  await move('guild','north');await shot('02-guild-north-prompt');await page.click('#btn-hq-facility');
  assert.equal(await page.locator('.facility-note').count(),0);assert.equal(await page.locator('[data-guild-accept]').count(),13);
  for(const id of ['slime','goblin','boss','goblin-king'])await page.click(`[data-guild-accept="${id}"]`);
  const accepted=await page.evaluate(()=>structuredClone(g.nation.guild.active));assert.equal(accepted.length,4);await page.locator('.hq-facility-body').evaluate(e=>e.scrollTop=0);await shot('03-guild-multiple-jobs');
  await page.click('[data-guild-filter="boss"]');const filtered=await page.locator('[data-guild-accept]').count();assert.ok(filtered<13);report.checks.guildFilters={allAtLevel0:13,bossRemaining:filtered};
  await page.evaluate(()=>{g.closeHeadquartersFacility();g.onNationKill({type:'goblin_king',isBoss:true,isDungeonBoss:true});for(let i=0;i<5;i++)g.onNationKill({type:'slime'});});
  await page.evaluate(async()=>{
    const m={id:'ui-guild-slime',name:'スライム',type:'slime',hp:0,maxHp:10,x:g.player.x,y:g.player.y,lootDistance:0};g.monsters=[m];const random=Math.random;Math.random=()=>.99;
    try{g.killMonster(m,g.player,true);}finally{Math.random=random;}g.render();
  });assert.ok((await page.locator('.battle-log-msg').innerText()).includes('依頼達成'));
  const notification=await page.locator('.battle-log-msg').evaluate(e=>({text:e.innerText,bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,whiteSpace:getComputedStyle(e).whiteSpace,overflow:e.scrollWidth-e.clientWidth}));assert.equal(notification.bg,'rgb(240, 240, 240)');assert.equal(notification.whiteSpace,'normal');assert.ok(notification.overflow<=2);report.checks.completionNotice=notification;await shot('04-guild-completion-notice');
  await move('guild','east');await page.click('#btn-hq-facility');const before=await page.evaluate(()=>g.gold);await page.click('[data-guild-claim="slime"]');
  const after=await page.evaluate(()=>({gold:g.gold,active:g.nation.guild.active.map(q=>q.id),completed:g.nation.guild.totalCompleted}));assert.equal(after.gold,before+120);assert.deepEqual(after.active,['goblin','boss','goblin-king']);assert.equal(await page.locator('[data-guild-accept="slime"]').count(),0,'boss filter hides species');
  await page.click('[data-guild-filter="all"]');assert.equal(await page.locator('[data-guild-accept="slime"]').isDisabled(),true);
  await page.click('[data-guild-abandon="goblin"]');assert.equal(await page.evaluate(()=>g.nation.guild.active.length),2);await shot('05-guild-report-and-withdraw');report.checks.guildReward={before,...after};
  await page.evaluate(async()=>{const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=277');g.nation.investment=180000;g.nation=normalizeNation(g.nation);g.refreshHeadquartersFacility();});
  assert.equal(await page.evaluate(()=>g.nation.guild.active.every(q=>q.level===0)),true);
  report.checks.growth=await page.evaluate(async()=>{const {guildBoard}=await import('/iron-squad/js/guild-contracts.js?v=201');return {catalog:guildBoard(g).length,accepted:g.nation.guild.active,quote:guildBoard(g).find(q=>q.id==='wolf')};});assert.equal(report.checks.growth.catalog,26);
  const guildLayouts=[];
  for(const [width,height]of [[320,568],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);await page.locator('[data-guild-filter="all"]').scrollIntoViewIfNeeded();const overflow=await page.locator('#hq-facility-dialog').evaluate(e=>e.scrollWidth-e.clientWidth);assert.ok(overflow<=2);guildLayouts.push({width,height,overflow});await shot(`06-guild-${width}`);
  }
  report.checks.guildLayouts=guildLayouts;await page.evaluate(()=>{const state=g.saveGame();g.resumeSavedGame(structuredClone(state));g.stopGameLoop();});assert.equal(await page.evaluate(()=>g.nation.guild.active.length),2);report.checks.guildReload=true;
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=277');g.nation=normalizeNation();g.gold=50;});await move('casino','west');await page.click('#btn-hq-facility');
  assert.equal(await page.locator('.facility-note').count(),0);assert.equal(await page.locator('#casino-bet').inputValue(),'10');await page.click('#btn-casino-poker');assert.equal(await page.evaluate(()=>g.gold),40);await page.click('[data-poker-hold="0"]');await shot('07-casino-level-zero');
  await page.evaluate(async()=>{const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=277');g.nation.investment=180000;g.nation=normalizeNation(g.nation);g.gold=1000000;g.refreshHeadquartersFacility();});
  assert.equal(await page.locator('#casino-bet').inputValue(),'500');assert.equal(await page.evaluate(()=>g.nation.casino.poker.bet),10);const stake=await page.evaluate(()=>g.gold);await page.click('#btn-casino-poker');assert.equal(await page.evaluate(()=>g.gold),stake+await page.evaluate(()=>g.nation.casino.poker.payout));report.checks.paidHand={bet:10,nextBet:500};
  await page.evaluate(()=>{g.phase++;g.refreshHeadquartersFacility();});await page.fill('#casino-bet','1000000');await page.dispatchEvent('#casino-bet','change');assert.equal(await page.evaluate(()=>g.nation.casino.bet),1000000);await page.setViewportSize({width:844,height:390});await shot('08-casino-scaled-free-stake');
  const bets=await page.evaluate(async()=>{const {casinoBaseBet}=await import('/iron-squad/js/casino-rules.js?v=201');return [0,1,2,3,4,5].map(casinoBaseBet);});assert.deepEqual(bets,[10,25,50,100,250,500]);report.checks.baseBets=bets;
  await page.evaluate(()=>g.closeHeadquartersFacility());await page.setViewportSize({width:320,height:568});await move('guild','south');
  for(const text of ['国庫買取 +100G','隊長のHPが半分以下 · 残り60/130','仲間が力尽きました']){
    await page.evaluate(text=>g.showToast(text,{field:true}),text);const bg=await page.locator('.battle-log-msg').evaluate(e=>getComputedStyle(e).backgroundColor);assert.equal(bg,'rgb(240, 240, 240)');
  }await shot('09-light-combat-warning');
  const controls=[];
  for(const [width,height]of [[320,568],[375,667],[390,844],[844,390]]){await page.setViewportSize({width,height});const box=await page.locator('#btn-pad-potion').boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.ok(box.x>=0&&box.x+box.width<=width&&box.y+box.height<=height);controls.push({width,height,...box});}
  report.checks.potionTargets=controls;await page.setViewportSize({width:320,height:568});await page.waitForTimeout(100);await move('guild','south');
  await page.evaluate(()=>{
    clearTimeout(g._battleLogTimer);document.querySelector('#battle-log-stream').replaceChildren();document.querySelector('.battle-log-window').classList.remove('has-field-note');
    const s=g.squad.find(s=>s.hp>0&&!s.isDown);Object.assign(s,{x:g.player.x+45,y:g.player.y+40});g.dialogue.reset();g.dialogue.say(s,'組合の依頼をいっしょに進めよう');g.dialogue.update(.3);g.render();
  });await shot('12-light-speech');
  await page.evaluate(()=>{g.dialogue.notifyResult({x:g.player.x+40,y:g.player.y,radius:12},['討伐完了','組合で報酬を受け取れます']);g.render();});await shot('13-light-result');
  await page.evaluate(async()=>{const {showTreasureReceipt}=await import('/iron-squad/js/treasure-receipt.js?v=200');showTreasureReceipt(g,['青銅片 × 5 → 素材庫','魔力粉 × 2 → 素材庫']);});assert.equal(await page.locator('.treasure-receipt').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 240, 240)');await shot('10-light-treasure-receipt');
  const bannerChecks=await page.evaluate(()=>{
    const checks=[],position=(x,y)=>{Object.assign(g.player,{x,y,_openX:x,_openY:y,_wallX:x,_wallY:y});g.update(.01);g.updateStatsUI(true);g.camera={x,y};g.render();};
    const m=g.merchants.find(m=>!m.dead);position(m.x,m.y);const merchant=document.querySelector('#merchant-prompt-banner');checks.push({type:'merchant',visible:!merchant.classList.contains('hidden')&&getComputedStyle(merchant).display!=='none',background:getComputedStyle(merchant).backgroundColor});
    const d=g.dungeons.find(d=>d.kind==='dungeon');d.discovered=true;position(d.entrance.x,d.entrance.y);const dungeon=document.querySelector('#dungeon-prompt-banner');checks.push({type:'dungeon',visible:!dungeon.classList.contains('hidden')&&getComputedStyle(dungeon).display!=='none',background:getComputedStyle(dungeon).backgroundColor});return checks;
  });for(const b of bannerChecks){assert.equal(b.visible,true);assert.equal(b.background,'rgb(240, 240, 240)');}report.checks.entryBanners=bannerChecks;await shot('14-light-dungeon-entry');
  await page.evaluate(async()=>{g.openStrategyModal(true);const {setKanaGrade}=await import('/common/js/kana-mode.js?v=175');setKanaGrade(2,{persist:false});});await move('guild','north');await page.click('#btn-hq-facility');await page.waitForTimeout(100);
  const kana=await page.locator('.guild-board').innerText();assert.ok(kana.includes('いらい'));assert.ok(!kana.includes('討伐'));report.checks.kana=true;await shot('11-guild-kana');await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));
  await tab.goto(base);await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');
  await tab.waitForFunction(async()=>navigator.serviceWorker.controller&&(await(await caches.open('game-iron-squad-v201')).keys()).length>=114);
  await tab.evaluate(()=>gameStudioInstance.activeGame.saveGame());await offline.setOffline(true);await tab.reload();await tab.waitForTimeout(500);const version=await tab.locator('[data-version-for="iron-squad"]').textContent();assert.ok(version.includes('6.1.0'));
  await tab.click('[data-game-id="iron-squad"]');await tab.locator('[data-slot-id]').first().click();await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);report.checks.offline={version,resumed:true};await offline.close();assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));
}finally{await browser.close();writeFileSync(`${out}/ui.json`,JSON.stringify(report,null,2));}
