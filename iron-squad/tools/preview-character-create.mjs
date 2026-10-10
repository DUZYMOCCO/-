// v4.2.24 隊長づくりの画面と、作った隊長（女・男）のフィールド表示を撮る。要: ローカルサーバー :8000 と同梱 Playwright。
// 保存しない検証ページ（canvas-quality-review.html）で動かす。ユーザーのセーブは読み書きしない。
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:667},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();
    const {openCommanderEditor}=await import('/iron-squad/js/commander-editor.js?v=175');
    window.__editor=openCommanderEditor({host:g.container.querySelector('.game-wrapper'),mode:'create',onConfirm:id=>{window.__made=id;}});
  });
  await page.screenshot({path:'iron-squad/docs/previews/character-create-v4.2.24.png'});
  await page.fill('#ce-family','ミラー');await page.fill('#ce-given','エミリア');
  await page.click('#ce-gender [role=radio]:nth-child(2)');
  await page.click('#ce-hair .ce-chip:nth-child(5)');await page.click('#ce-hair-color .ce-swatch:nth-child(9)');
  await page.click('#ce-eyes .ce-chip:nth-child(2)');
  await page.evaluate(()=>{document.querySelector('.ce-panel').scrollTop=0;});await page.waitForTimeout(200);
  await page.screenshot({path:'iron-squad/docs/previews/character-create-female-v4.2.24.png'});
  // 下までスクロールしても、押しやすい操作が残るか
  await page.evaluate(()=>{const p=document.querySelector('.ce-panel');p.scrollTop=p.scrollHeight;});
  await page.waitForTimeout(100);
  await page.screenshot({path:'iron-squad/docs/previews/character-create-bottom-v4.2.24.png'});
  await page.click('#btn-commander-confirm');
  const female=await page.evaluate(()=>window.__made);
  // 男の隊長も作る
  await page.evaluate(async()=>{
    const g=qualityGame;
    const {openCommanderEditor}=await import('/iron-squad/js/commander-editor.js?v=175');
    window.__editor=openCommanderEditor({host:g.container.querySelector('.game-wrapper'),mode:'create',onConfirm:id=>{window.__made2=id;}});
  });
  await page.fill('#ce-family','ブラント');await page.fill('#ce-given','オスカー');
  await page.click('#ce-hair .ce-chip:nth-child(8)');await page.click('#ce-hair-color .ce-swatch:nth-child(10)');await page.click('#ce-beard .ce-chip:nth-child(3)');
  await page.click('#btn-commander-confirm');
  const male=await page.evaluate(()=>window.__made2);
  // フィールド: 女・男の隊長を同じ場所で撮り、横に並べる
  const shots=[];
  for(const who of [female,male]){
    await page.evaluate(identity=>{
      const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.updateSpawns=()=>{};g.inBattle=true;g.restTimer=0;
      const p=g.player;Object.assign(p,{familyName:identity.familyName,givenName:identity.givenName,gender:identity.gender,appearance:identity.appearance});
      g.squad=[];g.reserves=[];g.gateGuards=[];g.merchants=[];g.civilians=[];g.camera.x=p.x;g.camera.y=p.y;g.updateStatsUI();g.render();
    },who);
    await page.waitForTimeout(300);
    shots.push((await page.screenshot()).toString('base64'));
  }
  const pair=await context.newPage();await pair.setViewportSize({width:750,height:667});
  await pair.setContent(`<body style="margin:0;display:flex;background:#000"><img width="375" height="667" src="data:image/png;base64,${shots[0]}"><img width="375" height="667" src="data:image/png;base64,${shots[1]}"></body>`);
  await pair.waitForTimeout(200);await pair.screenshot({path:'iron-squad/docs/previews/character-field-v4.2.24.png'});
  await context.close();
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
