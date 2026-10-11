// Real entry buttons and transactions, using only the disposable review-page save.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report=[],out='iron-squad/docs/previews';
mkdirSync(out,{recursive:true});
try {
  for(const [width,height] of [[390,844],[844,390]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${process.argv[2]||'http://127.0.0.1:8001'}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
    await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();g.monsters=[];g.restTimer=0;g.phaseTimer=100;g.screenShake=0;g.updateSpawns=()=>{};g.closeStrategyModal();g.zoom=.65;g.worldTime=120;g.camera={x:79360,y:79360};g.render();});
    await page.screenshot({path:`${out}/hq-facilities-new-${width}-v5.7.0.png`});
    await page.evaluate(async()=>{const g=qualityGame,{normalizeNation}=await import('/iron-squad/js/nation-rules.js?v=198');g.nation=normalizeNation({investment:90000});g.gold=200000;g.worldTime=300;g.render();g.updateStatsUI(true);});
    await page.screenshot({path:`${out}/hq-facilities-night-${width}-v5.7.0.png`});
    const walkTo=async id=>page.evaluate(async id=>{
      const g=qualityGame,{HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js?v=198');const p=HEADQUARTERS_FACILITIES.find(p=>p.id===id);
      const x=p.x,y=p.y+24;Object.assign(g.player,{x,y,_openX:x,_openY:y,_wallX:x,_wallY:y,_wallSpace:'field'});g.camera={x,y:y-55};g.zoom=1;g.inBattle=true;g.render();g.updateStatsUI(true);
      return {name:p.name,gold:g.gold,items:g.inventory.length,time:g.worldTime};
    },id);
    const smith=await walkTo('smith');await page.click('#btn-hq-facility');
    assert.equal(await page.locator('#hq-facility-dialog').getAttribute('aria-label'),'鍛冶工房');
    assert.equal(await page.evaluate(()=>qualityGame.inBattle),false);assert.equal(await page.locator('#strategy-modal').isVisible(),false);
    await page.click('#btn-workshop-buy');
    const supply=await page.evaluate(()=>({gold:qualityGame.gold,items:qualityGame.inventory.length}));assert.ok(supply.gold<smith.gold);assert.equal(supply.items,smith.items+1);
    await page.evaluate(()=>{const g=qualityGame;for(const k of Object.keys(g.materials))g.materials[k]=10000;g.refreshHeadquartersFacility();});
    await page.locator('#btn-workshop-craft').scrollIntoViewIfNeeded();await page.click('#btn-workshop-craft');
    assert.equal(await page.evaluate(()=>qualityGame.inventory.at(-1).craftOnly),true);
    await page.locator('.hq-facility-body').evaluate(e=>{e.scrollTop=0;});
    await page.screenshot({path:`${out}/hq-workshop-${width}-v5.7.0.png`});
    await page.keyboard.press('Escape');assert.equal(await page.locator('#hq-facility-dialog').count(),0);assert.equal(await page.evaluate(()=>qualityGame.inBattle),true);
    const guild=await walkTo('guild');await page.click('#btn-hq-facility');await page.click('[data-hq-service="guild"]');
    assert.equal(await page.locator('[data-hq-service="guild"]').isDisabled(),true);
    const reward=await page.evaluate(()=>{const g=qualityGame;for(let i=0;i<20;i++)g.onNationKill();g.renderStrategyUI();return g.nation.guild.reward;});
    await page.screenshot({path:`${out}/hq-guild-${width}-v5.7.0.png`});await page.click('[data-hq-service="guild"]');assert.equal(await page.evaluate(()=>qualityGame.gold),guild.gold+reward);await page.click('#btn-hq-facility-close');
    const casino=await walkTo('casino');await page.click('#btn-hq-facility');
    await page.locator('#casino-bet').fill('1000');await page.locator('#casino-bet').dispatchEvent('change');
    await page.click('#btn-casino-poker');assert.equal(await page.evaluate(()=>qualityGame.gold),casino.gold-1000);
    await page.click('[data-poker-hold="0"]');assert.equal(await page.locator('[data-poker-hold="0"]').getAttribute('aria-pressed'),'true');
    await page.locator('.poker-hand').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/hq-casino-${width}-v5.7.0.png`});
    const ui=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,sheetOverflow:document.querySelector('.hq-facility-body').scrollWidth>document.querySelector('.hq-facility-body').clientWidth,workshopNodes:document.querySelectorAll('#workshop-tier').length,casinoNodes:document.querySelectorAll('#casino-bet').length,time:qualityGame.worldTime}));
    assert.equal(ui.overflow,false);assert.equal(ui.sheetOverflow,false);assert.equal(ui.workshopNodes,0);assert.equal(ui.casinoNodes,1);assert.equal(ui.time,casino.time);
    await page.click('#btn-hq-facility-close');
    await walkTo('smith');
    const collision=await page.evaluate(async()=>{
      const g=qualityGame,{HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js?v=198'),p=HEADQUARTERS_FACILITIES[0];
      g.joystick.active=true;g.joystick.dirX=0;g.joystick.dirY=-1;for(let i=0;i<30;i++)g.update(1/60);g.joystick.active=false;g.render();return {y:g.player.y,front:p.y+2,recovery:!!g._renderProblem};
    });
    assert.ok(collision.y>=collision.front,'walking into a shop stops at its facade');assert.equal(collision.recovery,false);
    report.push({width,height,supply,reward,ui,collision});await context.close();
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();writeFileSync(`${out}/hq-facilities-v5.7.0.json`,JSON.stringify({report,errors},null,2));}
console.log('PASS: two phone orientations, three headquarters buildings and actual entry, buy/craft, guild acceptance/reward, poker/holds, one scrolling sheet, frozen clock, Escape/return, building collision');
