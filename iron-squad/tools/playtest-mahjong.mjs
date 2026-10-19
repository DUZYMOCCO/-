// v7.1.2: browser check of the mahjong screens at phone width (390x844), including call prompts (pon/chi/kan/ron/skip), melds and the result screens.
// Run from the repository root: node iron-squad/tools/playtest-mahjong.mjs [outDir]
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out=process.argv[2]||'iron-squad/docs/validation/mahjong-v7.1.2';mkdirSync(out,{recursive:true});
const server=await startQaServer(),browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={screens:[],seen:{},games:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('mahjong check');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 await page.evaluate(async()=>{
  const g=qaGame,{HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js');g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.restTimer=0;g.currentDungeon=null;g.gold=5000000;
  const site=HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');Object.assign(g.player,{x:site.x,y:site.y+24});g.camera={x:site.x,y:site.y};g.render();g.openHeadquartersFacility('casino');
 });
 const measure=()=>page.locator('.casino-panel').evaluate(root=>{
  const r=root.getBoundingClientRect(),over=[...root.querySelectorAll('button,.mj-tile,.mj-claim,.mj-river,.mj-hand,.mj-result,.mj-final')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+1||b.left<-1);}).map(e=>e.className||e.id);
  return {scrollWidth:root.scrollWidth,width:root.clientWidth,bodyScrollWidth:document.body.scrollWidth,viewport:innerWidth,off:over.slice(0,5),mjHeight:document.querySelector('.mj')?.getBoundingClientRect().height||0};});
 const check=async()=>{const d=await measure();assert.ok(d.scrollWidth<=d.width+1,'panel overflows: '+JSON.stringify(d));assert.ok(d.bodyScrollWidth<=d.viewport,'body overflows: '+JSON.stringify(d));assert.deepEqual(d.off,[],'elements outside the 390px viewport: '+JSON.stringify(d));return d;};
 const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});report.screens.push({name,...await check()});};
 await shot('lobby');await page.locator('[data-casino-page="mahjong"]').click();await shot('setup');
 const levels=await page.locator('[data-mj-level]').count();assert.equal(levels,3,'three CPU levels in the lobby');report.levels=levels;
 await page.emulateMedia({reducedMotion:'reduce'});
 const configs=[{seed:424242,mode:'full',level:'adept'},{seed:7,mode:'full',level:'master'},{seed:99,mode:'short',level:'novice'},{seed:31337,mode:'full',level:'master'}];
 for(const cfg of configs){
  await page.evaluate(c=>qaGame.startCasinoMahjong(c),cfg);
  const counts={tsumo:0,ron:0,pon:0,chi:0,kan:0,pass:0,steps:0};let lastKey='',guard=0;
  for(let i=0;i<20000;i++){
   const info=await page.evaluate(()=>{const s=qaGame.nation.casino.mahjong;if(!s)return {gone:true};return {over:s.over,stage:s.stage,turn:s.h?.turn,type:s.result?.type,claim:!!document.querySelector('.mj-claim'),btns:[...document.querySelectorAll('.mj-claim button')].map(b=>b.id||b.dataset.mjChi&&'chi')};});
   if(info.gone||info.over)break;counts.steps++;
   const key=info.stage+(info.type||'')+(info.claim?'C':'')+(info.btns||[]).join(',');
   if(key!==lastKey){lastKey=key;
    const tag=info.claim?'claim-'+(info.btns.filter(Boolean).join('-')):'stage-'+info.stage+(info.type||'');
    if(!report.seen[tag]&&Object.keys(report.seen).length<40){report.seen[tag]=cfg.level+'/'+cfg.seed;await page.waitForTimeout(30);await shot(tag.replace(/[^a-z0-9-]/gi,'_'));}else await check();
   }
   if(info.claim){
    await page.waitForTimeout(480);
    for(const [sel,k] of [['#btn-mj-ron','ron'],['#btn-mj-kan','kan'],['#btn-mj-pon','pon'],['[data-mj-chi]','chi'],['#btn-mj-pass','pass']]){
     const el=page.locator(sel).first();if(await el.count()&&await el.isEnabled()){const take=k==='ron'||k==='kan'||(k==='pon'&&counts.pon<6)||(k==='chi'&&counts.chi<6)||k==='pass';if(take){await el.click();counts[k]++;break;}}
    }
   } else if(info.stage==='act'&&info.turn===0){
    const t=page.locator('#btn-mj-tsumo');
    if(await t.count()){await t.click();counts.tsumo++;}
    else{
     const ak=page.locator('[data-mj-ankan]').first();
     if(await ak.count()&&counts.kan<3){await ak.click();counts.kan++;} else await page.evaluate(()=>{if(qaGame.tsumogiriCasinoMahjong())return;for(const t of qaGame.nation.casino.mahjong.h.hands[0])if(qaGame.discardCasinoMahjong(t))return;});
    }
   } else if(info.stage==='result'){await page.locator('#btn-mj-next').click();}
   else await page.waitForTimeout(25);
   if(++guard>60000)throw new Error('loop guard');
  }
  await page.waitForSelector('.mj-final',{timeout:30000});await shot(`final-${cfg.level}-${cfg.mode}`);
  report.games.push({...cfg,...counts});
  await page.locator('#btn-mj-close').click();
 }
 assert.deepEqual(errors,[]);
 const need=['pon','chi'];for(const k of need)assert.ok(report.games.some(g=>g[k]>0),`a ${k} prompt was exercised in the browser`);
 report.errors=errors;writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({screens:report.screens.length,games:report.games,seen:Object.keys(report.seen),errors}));
}finally{await browser.close();await server.close();}
