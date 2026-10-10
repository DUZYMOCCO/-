// 隊長ダウンの画面表示を撮る。要: ローカルサーバー :8000 と同梱 Playwright。
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:667},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.updateSpawns=()=>{};g.inBattle=true;g.restTimer=0;
    const p=g.player;p.hp=0;p.isDown=true;p.downTimer=32;p.timesDown=1;
    (g.squad||[]).slice(0,4).forEach((s,i)=>{s.x=p.x+60+i*25;s.y=p.y+40-i*20;});
    g.camera.x=p.x;g.camera.y=p.y;g.updateStatsUI();g.render();});
  await page.waitForTimeout(300);
  await page.screenshot({path:'docs/previews/commander-down-v4.2.23.png'});
  await context.close();
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
