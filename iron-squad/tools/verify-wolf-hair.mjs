import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/wolf-20261012',base=process.argv[2]||'http://127.0.0.1:8001';mkdirSync(out,{recursive:true});
const report={errors:[],checks:{},screens:[]},browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('requestfailed',r=>console.log(`Request failed: ${r.url()} ${r.failure()?.errorText}`));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{window.g=qualityGame;g.stopGameLoop();g.monsters=[];g.openCommanderGrooming();});
  await page.getByRole('radio',{name:'女',exact:true}).click();await page.getByRole('button',{name:'ウルフ',exact:true}).click();
  await page.getByRole('button',{name:'はば広の顔',exact:true}).click();await page.locator('#commander-editor .ce-body').evaluate(e=>e.scrollTop=0);
  await page.locator('#commander-editor .ce-preview').screenshot({path:`${out}/editor-portrait.png`});report.screens.push('editor-portrait');
  await page.screenshot({path:`${out}/editor-390.png`});report.screens.push('editor-390');
  const overflow=await page.locator('#commander-editor').evaluate(e=>e.scrollWidth-e.clientWidth);assert.ok(overflow<=2);report.checks.portraitOverflow=overflow;
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await page.screenshot({path:`${out}/editor-844.png`});report.screens.push('editor-844');
  await page.click('#btn-commander-confirm');
  const identity=await page.evaluate(()=>{g.stopGameLoop();g.resizeCanvas();g.zoom=2;g.camera={x:g.player.x,y:g.player.y};g.render();return {gender:g.player.gender,hair:g.player.appearance.medicHair,outline:g.player.appearance.faceOutline};});
  assert.deepEqual(identity,{gender:'female',hair:'wolf',outline:'broad'});report.checks.selection=identity;
  const cached=await page.evaluate(async()=>{
    const {drawSoldierHead}=await import('/iron-squad/js/soldier-appearance.js?v=206');const image=document.createElement('canvas');image.width=320;image.height=360;
    const c=image.getContext('2d');c.translate(160,150);c.scale(16,16);drawSoldierHead(c,g.player,{small:true});
    return image.toDataURL('image/png');
  });writeFileSync(`${out}/cached-field-head.png`,Buffer.from(cached.split(',')[1],'base64'));report.screens.push('cached-field-head');
  const saved=await page.evaluate(()=>{const a=structuredClone(g.player.appearance),before={hp:g.player.maxHp,atk:g.player.atk,def:g.player.def},saved=g.saveGame();g.resumeSavedGame(structuredClone(saved));g.stopGameLoop();return {sameAppearance:JSON.stringify(a)===JSON.stringify(g.player.appearance),before,after:{hp:g.player.maxHp,atk:g.player.atk,def:g.player.def}};});
  assert.equal(saved.sameAppearance,true);assert.deepEqual(saved.before,saved.after);report.checks.saved=saved;
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.checks));await context.close();
}finally{await browser.close();writeFileSync(`${out}/ui.json`,JSON.stringify(report,null,2));}
