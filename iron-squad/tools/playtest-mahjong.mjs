// v7.1.0: browser check of the mahjong screens at phone width (390x844). Run from the repository root: node iron-squad/tools/playtest-mahjong.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out=process.argv[2]||'iron-squad/docs/validation/mahjong-v7.1.0';mkdirSync(out,{recursive:true});
const server=await startQaServer(),browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={screens:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('mahjong check');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 await page.evaluate(async()=>{
  const g=qaGame,{HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js');g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.restTimer=0;g.currentDungeon=null;g.gold=500000;
  const site=HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');Object.assign(g.player,{x:site.x,y:site.y+24});g.camera={x:site.x,y:site.y};g.render();g.openHeadquartersFacility('casino');
 });
 const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});const dims=await page.locator('.casino-panel').evaluate(root=>({scrollWidth:root.scrollWidth,width:root.clientWidth,bodyScrollWidth:document.body.scrollWidth,viewport:innerWidth,mjHeight:document.querySelector('.mj')?.getBoundingClientRect().height||0}));assert.ok(dims.scrollWidth<=dims.width+1,JSON.stringify(dims));assert.ok(dims.bodyScrollWidth<=dims.viewport);report.screens.push({name,...dims});};
 await shot('lobby');await page.locator('[data-casino-page="mahjong"]').click();await shot('setup');
 await page.evaluate(()=>qaGame.startCasinoMahjong({seed:424242,mode:'full',level:'adept'}));
 await page.waitForFunction(()=>{const s=qaGame.nation.casino.mahjong;return s.stage!=='act'||s.h.turn===0;},null,{timeout:20000});
 if(await page.evaluate(()=>qaGame.nation.casino.mahjong.stage==='ron')){await shot('ron');await page.locator('#btn-mj-pass').click();await page.waitForFunction(()=>{const s=qaGame.nation.casino.mahjong;return s.stage!=='act'||s.h.turn===0;},null,{timeout:20000});}
 await shot('table');await page.locator('.mj-hand [data-mj-tile]').nth(3).click();await shot('selected');
 await page.emulateMedia({reducedMotion:'reduce'});let seen=new Set();
 for(let i=0;i<4000;i++){
  const info=await page.evaluate(()=>{const s=qaGame.nation.casino.mahjong;return {over:s.over,stage:s.stage,turn:s.h.turn,type:s.result?.type,riichi:s.h.riichi[0]};});
  if(info.over)break;
  const key=info.stage+(info.type||'');if(info.stage==='result'||(info.stage==='act'&&info.turn===0&&!seen.has('act'))){if(!seen.has(key)){seen.add(key);await page.waitForTimeout(50);await shot('stage-'+key);}}
  if(info.stage==='act'&&info.turn===0){await page.evaluate(()=>{if(!qaGame.tsumoCasinoMahjong())qaGame.tsumogiriCasinoMahjong();});}
  else if(info.stage==='ron')await page.evaluate(()=>{qaGame.ronCasinoMahjong()||qaGame.passCasinoMahjong();});
  else if(info.stage==='result')await page.evaluate(()=>qaGame.nextCasinoMahjong());
  else await page.waitForTimeout(40);
 }
 await page.waitForSelector('.mj-final',{timeout:30000});await shot('final');
 await page.evaluate(()=>qaGame.closeCasinoMahjong());
 assert.deepEqual(errors,[]);report.errors=errors;writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({screens:report.screens.length,errors}));
}finally{await browser.close();await server.close();}

