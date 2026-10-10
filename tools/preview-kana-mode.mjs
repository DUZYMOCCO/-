// ひらがなモード(小2)ON の見本。保存しない確認ページで、フキダシと戦況メニューを縦画面で撮る。
// 要: ローカルサーバー (python -m http.server 8000) と同梱 Playwright / Chrome。
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    const kana=await import('/js/kana-mode.js?v=168');kana.setKanaMode(true);
    const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.updateSpawns=()=>{};g.zoom=2;g.inBattle=true;g.restTimer=0;
    g.revealFogAroundPlayer(true);
    const cats=['BOSS_ENCOUNTER','LEVEL_UP_REACTION'];
    g.squad.slice(0,2).forEach((s,i)=>g.dialogue.trigger(s,cats[i],Date.now(),true));
    g.dialogue.notifyResult?.(g.player,['敵軍を撃破','戦利品を獲得しました']);
    for(let i=0;i<3;i++)g.dialogue.update(.2);
    g.render();
  });
  mkdirSync('docs/previews',{recursive:true});
  await page.screenshot({path:'docs/previews/kana-mode-v4.2.17.png'});
  await page.click('#btn-strategy');await page.waitForTimeout(400);
  await page.evaluate(()=>{const d=document.querySelector('#kana-settings');d.open=true;d.scrollIntoView({block:'center'});});await page.waitForTimeout(300);
  await page.screenshot({path:'docs/previews/kana-mode-menu-v4.2.17.png'});
  const text=await page.evaluate(()=>document.body.innerText.slice(0,400));console.log(text);
  console.log('toggle state',await page.evaluate(()=>document.querySelector('#kana-settings button')?.textContent));
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
