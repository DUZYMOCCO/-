// 司令部メニュー（ランチャー）と各ウィンドウの見本を390px幅で撮る。保存しない確認ページを使う。
// 要: ローカルサーバー (python -m http.server 8000) と同梱 Playwright / Chrome。
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.updateSpawns=()=>{};g.inBattle=true;g.restTimer=0;g.render();});
  mkdirSync('iron-squad/docs/previews',{recursive:true});
  await page.click('#btn-strategy');await page.waitForTimeout(400);
  const base='iron-squad/docs/previews/menu-window-v4.2.18';
  await page.screenshot({path:`${base}-launcher.png`});
  for(const [name,tab] of [['situation','overview'],['squad','troops'],['nation','nation']]){
    await page.click(`#tab-strat-${tab}`);await page.waitForTimeout(300);
    console.log(name,await page.evaluate(()=>{const b=document.querySelector('#strategy-modal .dialog-body').getBoundingClientRect();return [b.top,b.height,innerHeight];}));
    await page.screenshot({path:`${base}-${name}.png`});
    await page.click('#btn-strat-window-back');await page.waitForTimeout(200);
  }
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
