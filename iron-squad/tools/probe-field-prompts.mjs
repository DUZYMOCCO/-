import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:8001/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  console.log(await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();Object.assign(g.player,{x:79160,y:80020});g.update(.01);g.render();return ['#btn-field-tavern','#btn-hq-facility','#merchant-prompt-banner'].map(id=>{const e=document.querySelector(id),s=getComputedStyle(e);return {id,text:e.innerText,background:s.backgroundColor,color:s.color,border:s.border,padding:s.padding,font:s.fontSize};});}));
  for(const width of [320,375,390,420,844]){await page.setViewportSize({width,height:width===844?390:844});console.log({width,potion:await page.locator('#btn-pad-potion').boundingBox()});}
}finally{await browser.close();}
