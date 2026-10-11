// v5.0.0: あきらめボタン付きダウン画面と、自小隊リング/名前の混雑野営地を撮る。要: :8000 と同梱 Playwright。
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:667},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.updateSpawns=()=>{};g.inBattle=true;g.restTimer=0;
    const p=g.player;
    const sq=g.squad||[];
    sq.forEach((s,i)=>{s.dead=false;s.isDown=false;s.hp=s.maxHp||100;const a=i/Math.max(1,sq.length)*Math.PI*2,r=70+(i%4)*40;s.x=p.x+Math.cos(a)*r;s.y=p.y+Math.sin(a)*r*.8;s.campPose=null;s.isPersonalGuard=i<6;s.name=s.name||'名無し・兵';});
    if(sq[1])sq[1].isDown=true;
    g.camera.x=p.x;g.camera.y=p.y;g.updateStatsUI();g.render();});
  await page.waitForTimeout(300);
  await page.screenshot({path:'iron-squad/docs/previews/own-squad-marker-v5.0.0.png'});
  await page.evaluate(()=>{const g=qualityGame,p=g.player;p.hp=0;p.isDown=true;p.downTimer=32;g.render();});
  await page.waitForTimeout(300);
  await page.screenshot({path:'iron-squad/docs/previews/commander-giveup-v5.0.0.png'});
  await context.close();
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
