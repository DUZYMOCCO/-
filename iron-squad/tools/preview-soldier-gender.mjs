// 兵士の名前と見た目の性別の一致を撮る。要: ローカルサーバー :8000 と同梱 Playwright。
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:667},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();
    const {drawSoldierPortrait,isFeminineLook}=await import('/iron-squad/js/soldier-appearance.js?v=182');
    const panel=document.createElement('div');panel.style.cssText='position:fixed;inset:0;z-index:99999;background:#0b0d14;color:#e2e8f0;font:11px sans-serif;padding:6px 8px;overflow:hidden';
    panel.innerHTML='<div style="margin-bottom:4px">兵士の名前と見た目の性別（男=青 / 女=桃）</div>';
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:4px';panel.append(grid);
    const classes=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];
    for(let i=0;i<20;i++){
      const s=g.createNewSoldier(null,{classKey:classes[i%5]}),cell=document.createElement('div');
      const cv=document.createElement('canvas');cv.width=160;cv.height=160;cv.style.cssText='width:80px;height:80px;display:block;margin:auto';
      drawSoldierPortrait(cv.getContext('2d'),s,160,160,{compact:true});
      const t=document.createElement('div');t.style.cssText=`text-align:center;font-size:9.5px;line-height:1.2;color:${s.gender==='female'?'#f9a8d4':'#93c5fd'}`;
      t.textContent=`${s.name.split('・')[0]}（${s.gender==='female'?'女':'男'}）`;cell.append(cv,t);grid.append(cell);
    }
    document.body.append(panel);
  });
  await page.waitForTimeout(300);
  await page.screenshot({path:'iron-squad/docs/previews/soldier-gender-names-v5.0.1.png'});
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
