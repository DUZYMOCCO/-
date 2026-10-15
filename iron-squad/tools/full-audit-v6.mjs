// Read-only gameplay audit. Fresh Chrome profile; milestone conditions are accelerated explicitly.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/full-audit-20261012',base=process.argv[2]||'http://127.0.0.1:8001';
mkdirSync(out,{recursive:true});const report={stages:[],errors:[],warnings:[],requests:[],accelerated:true};
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});
const page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')report.warnings.push(m.text());});
page.on('requestfailed',r=>report.requests.push({url:r.url(),reason:r.failure()?.errorText}));
page.on('dialog',async d=>{report.warnings.push('Native dialog: '+d.message());await d.dismiss();});
const capture=async(name,data={})=>{
  const ui=await page.evaluate(()=>{
    const g=window.qa,visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
    const buttons=[...document.querySelectorAll('button')].filter(visible).map(e=>({id:e.id,text:e.textContent.trim().slice(0,75),disabled:e.disabled}));
    const scrollers=[...document.querySelectorAll('*')].filter(e=>visible(e)&&/(auto|scroll)/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+3).map(e=>({id:e.id,cls:String(e.className),height:e.clientHeight,scrollHeight:e.scrollHeight}));
    return {overflow:document.documentElement.scrollWidth>innerWidth,buttons,scrollers,text:document.body.innerText.slice(0,900),state:g?{phase:g.phase,worldTime:g.worldTime,career:g.career?.status,gold:g.gold,personal:g.squad.filter(s=>s.isPersonalGuard&&!s.dead).length,waiting:g.taverns?.waiting.length,inBattle:g.inBattle,dialogOpen:g.container.classList.contains('dialog-open'),strategyVisible:!document.getElementById('strategy-modal').classList.contains('hidden'),dungeon:g.currentDungeon?.id||null,renderProblem:g._renderProblem?.message||null,terrainTiles:g.worldTerrain?.tiles.size}:null};
  });
  report.stages.push({name,...data,...ui});await page.screenshot({path:`${out}/${name}.png`});console.log(name+': '+JSON.stringify(ui.state));return ui;
};
const moveTo=async(x,y)=>page.evaluate(({x,y})=>{const g=qa;g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.screenShake=0;Object.assign(g.player,{x,y,_openX:x,_openY:y,_wallX:x,_wallY:y,_terrainSpace:'field',_wallSpace:'field'});g.camera={x,y};g.updateStatsUI(true);g.render();},{x,y});
try {
  await page.goto(base);await page.locator('[data-game-id="iron-squad"]').click();
  await page.waitForSelector('#new-expedition-form');await capture('01-save-menu');
  await page.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await capture('02-character-creation');await page.click('#btn-commander-confirm');
  await page.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  await page.evaluate(()=>{window.qa=gameStudioInstance.activeGame;});await capture('03-first-field');
  const initial=await page.evaluate(()=>({x:qa.player.x,y:qa.player.y,time:qa.worldTime}));
  const stick=await page.locator('#dpad-base').boundingBox();
  await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width/2+35,stick.y+stick.height/2);await page.waitForTimeout(650);await page.mouse.up();
  const movement=await page.evaluate(p=>({distance:Math.hypot(qa.player.x-p.x,qa.player.y-p.y),timePassed:qa.worldTime-p.time}),initial);
  await page.evaluate(()=>qa.stopGameLoop());await capture('04-real-input',{movement});
  await page.click('#btn-strategy');await capture('05-traveler-menu');
  for(const key of ['overview','troops','nation']){await page.evaluate(key=>qa._selectStratTab(key),key);await capture(`06-traveler-${key}`);}
  await moveTo(79160,80020);await page.click('#btn-field-tavern');await capture('07-tavern');
  for(const answer of ['できる範囲で力を貸す','無理をせず、皆で帰る道を探す','いっしょに旅をしよう']){await page.getByRole('button',{name:'会話する',exact:true}).first().click();await page.getByRole('button',{name:answer,exact:true}).click();}
  await page.getByRole('button',{name:'旅の仲間に誘う',exact:true}).click();
  await page.evaluate(()=>{qa.gold=100000;qa.renderTavern();});
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/Gで雇う/}).first().click();
  await page.evaluate(()=>{qa.phase++;qa.renderTavern();});
  for(let i=0;i<3;i++)await page.getByRole('button',{name:/Gで雇う/}).first().click();
  await capture('08-party-and-waiting');await page.click('#btn-tavern-close');await capture('09-tavern-exit');
  await moveTo(79170,79279);await page.click('#btn-hq-facility');await capture('10-locked-smithy');await page.click('#btn-hq-facility-close');
  await page.evaluate(async()=>{const {normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=277');qa.nation=normalizeNation({investment:90000});qa.worldTime=300;qa.inBattle=true;qa.update(.1);qa.render();});
  await moveTo(79360,79680);await page.evaluate(()=>{qa.zoom=.65;qa.render();});await capture('11-developed-hq-night');
  await moveTo(79170,79279);await page.click('#btn-hq-facility');const shopGold=await page.evaluate(()=>qa.gold);await page.click('#btn-workshop-buy');
  await capture('12-workshop-purchase',{shopGold});await page.click('#btn-hq-facility-close');
  await moveTo(79550,79639);await page.click('#btn-hq-facility');await page.fill('#casino-bet','1000');await page.dispatchEvent('#casino-bet','change');await page.click('#btn-casino-poker');await page.click('[data-poker-hold="0"]');await capture('13-casino');await page.click('#btn-hq-facility-close');
  await moveTo(79360,79360);
  await page.evaluate(()=>{for(let i=10;i<20;i++){qa.phase=i;qa.gainExp(700,{share:false,merit:700});}qa.updateStatsUI(true);});
  await page.click('#btn-career-invitation');await capture('14-invitation');await page.click('#btn-career-later');await capture('15-decline');
  await page.evaluate(()=>{qa.closeStrategyModal();window.travelerBranch=structuredClone(qa.saveGame());qa.openCareerInvitation();});await page.click('#btn-career-accept');await capture('16-enlisted');
  await page.evaluate(()=>qa._selectStratTab('troops'));await capture('17-enlisted-roster');
  await page.setViewportSize({width:844,height:390});await capture('18-landscape-roster');
  await page.evaluate(()=>{qa.closeStrategyModal();qa.saveGame();qa.showSaveMenu();});await capture('19-save-selection');
  const slot=await page.evaluate(()=>qa.activeSlotId);await page.locator(`[data-slot-id="${slot}"]`).click();await page.evaluate(()=>qa.stopGameLoop());await capture('20-resumed');
  await page.evaluate(()=>{qa.closeStrategyModal();qa.restTimer=0;qa.enterDungeon(qa.dungeons.find(d=>d.id==='dungeon_goblin_mines'));qa.stopGameLoop();qa.render();});await capture('21-dungeon');
  await page.evaluate(()=>{qa.exitDungeon();qa.stopGameLoop();qa.openWorldMap();});await capture('22-world-map');await page.click('#btn-world-map-close');
  await page.evaluate(async()=>{qa.resumeSavedGame(structuredClone(travelerBranch));qa.stopGameLoop();qa.closeStrategyModal();const {rollHeroRevelation}=await import('/iron-squad/js/hero-party.js?v=277');qa.phase=Math.max(10,qa.phase);rollHeroRevelation(qa,()=>0);qa.openStrategyModal(true);qa._selectStratTab('overview');document.getElementById('hero-journey').open=true;});await capture('23-hero-revelation');
  await page.getByRole('button',{name:'勇者を追う',exact:true}).click();
  const follow=await page.evaluate(()=>{qa.stopGameLoop();const initial={x:qa.player.x,y:qa.player.y};for(let i=0;i<90;i++)qa.update(1/30);qa.render();return {following:qa.heroFollowing,distance:Math.hypot(qa.player.x-initial.x,qa.player.y-initial.y),hero:qa.heroJourney.party.status};});await capture('24-follow-hero',{follow});
  await page.evaluate(()=>{qa.heroFollowing=false;qa.restTimer=0;qa.closeStrategyModal();qa.enterDungeon(qa.dungeons.find(d=>d.id==='dungeon_demon_castle'));qa.stopGameLoop();const boss=qa.monsters.find(m=>m.isDemonKing);if(!boss)throw new Error('Demon king missing');qa.monsters=[boss];boss.hp=1;qa.player.x=boss.x-30;qa.player.y=boss.y;qa.player.atkCooldown=0;qa.camera={x:qa.player.x,y:qa.player.y};qa.screenShake=0;qa.render();});await capture('25-traveler-demon-castle');
  const victory=await page.evaluate(()=>{const boss=qa.monsters[0];qa.performAttack(qa.player,boss,true,qa.player.atk,false);qa.screenShake=0;qa.render();return {defeat:qa.heroJourney.demonKingDefeat,remainingBoss:qa.monsters.some(m=>m.isDemonKing),inBattle:qa.inBattle,overlays:[...document.querySelectorAll('.game-overlay')].filter(e=>!e.classList.contains('hidden')).map(e=>e.id)};});await capture('26-demon-victory',{victory});
  await page.evaluate(()=>{qa.openStrategyModal(true);qa._selectStratTab('overview');document.getElementById('hero-journey').open=true;});await capture('27-victory-record');
  await page.evaluate(()=>{qa.closeStrategyModal();qa.saveGame();});
  const cached=await page.evaluate(async()=>{await navigator.serviceWorker.ready;return {controller:!!navigator.serviceWorker.controller,caches:await caches.keys(),assets:await(await caches.open('game-iron-squad-v199')).keys().then(r=>r.length)};});report.cache=cached;
  await context.setOffline(true);await page.reload();await page.locator('[data-game-id="iron-squad"]').click();await page.waitForSelector('[data-slot-id]');await page.locator(`[data-slot-id="${slot}"]`).click();await page.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);await page.evaluate(()=>{window.qa=gameStudioInstance.activeGame;qa.stopGameLoop();});await capture('28-offline-resume');
} catch(error) {report.errors.push('Audit stopped: '+error.message);console.error(error.message);}
finally {writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2));await browser.close();}
console.log('AUDIT_DONE stages='+report.stages.length+' errors='+report.errors.length);
