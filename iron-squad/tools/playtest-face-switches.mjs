// Disposable browser storage; UI history, real cached field heads and portraits.
// node iron-squad/tools/playtest-face-switches.mjs [server URL]
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const base=process.argv[2]||'http://localhost:8000',out='iron-squad/docs/previews',errors=[],report={};
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    qualityGame.stopGameLoop();
    const {openCommanderEditor}=await import('/iron-squad/js/commander-editor.js?v=193');
    const {applyCommanderIdentity}=await import('/iron-squad/js/commander-identity.js?v=193');
    qualityGame.setDialogState(true);
    window.__editor=openCommanderEditor({host:qualityGame.container.querySelector('.game-wrapper'),onConfirm:r=>{
      window.__confirmed=r;applyCommanderIdentity(qualityGame.player,r);qualityGame.saveGame();
    }});
    window.__stats=JSON.stringify([qualityGame.player.hp,qualityGame.player.atk,qualityGame.player.def,qualityGame.gold]);
  });
  const choose=async(id,name)=>{await page.locator(`#${id}`).getByRole('button',{name,exact:true}).click();};
  const frames=()=>page.evaluate(()=>[...document.querySelectorAll('.ce-preview canvas')].map(c=>c.toDataURL()));
  for(const [gender,label,hair]of [['male','男','つるつる'],['female','女','ピクシー']]){
    await page.locator('#ce-gender').getByRole('radio',{name:label,exact:true}).click();await choose('ce-hair',hair);
    await choose('ce-face','丸顔');await choose('ce-jaw','ふつう');
    const baseline=await frames(),seen=new Set(),seenFull=new Set();
    for(const face of ['角ばった顔','丸顔','面長','細いりんかく','はば広の顔']){
      await choose('ce-face',face);await choose('ce-jaw','四角いあご');
      const [bust,full]=await frames();seen.add(bust);seenFull.add(full);
      assert.equal(await page.locator('#ce-face [aria-pressed="true"]').innerText(),face);
    }
    // "ふつう" keeps the legacy face, which can be the same as an explicit outline.
    assert.equal(seen.size,5,'each explicit outline differs even with a square chin');assert.equal(seenFull.size,5,'cached field heads reflect every outline');
    for(let i=0;i<3;i++){
      await choose('ce-jaw','とがったあご');await choose('ce-face','丸顔');await choose('ce-jaw','ふつう');
      assert.deepEqual(await frames(),baseline,'switching back restores exactly the original pixels in both previews');
      await choose('ce-face','面長');await choose('ce-jaw','四角いあご');
    }
    await choose('ce-face','丸顔');await choose('ce-jaw','とがったあご');
    await page.locator('.ce-preview').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/face-switch-${gender}-mobile-v5.5.3.png`});
    report[gender]={distinctOutlines:seen.size,distinctFieldHeads:seenFull.size,restoredPixels:true};
  }
  const before=await frames();await page.click('#btn-commander-confirm');
  await page.evaluate(()=>qualityGame.openCommanderGrooming());
  assert.deepEqual(await frames(),before,'confirm and reopen preserves the exact face');
  report.saved=await page.evaluate(()=>({outline:qualityGame.saveGame().player.appearance.faceOutline,jaw:qualityGame.saveGame().player.appearance.jaw,
    statsUnchanged:__stats===JSON.stringify([qualityGame.player.hp,qualityGame.player.atk,qualityGame.player.def,qualityGame.gold]),overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(report.saved.outline,'round');assert.equal(report.saved.jaw,'pointed');assert.ok(report.saved.statsUnchanged);assert.equal(report.saved.overflow,false);
  await page.click('#btn-commander-back');
  // A contact sheet of all 72 combinations, with the same renderer as the editor.
  await page.setViewportSize({width:1250,height:1050});
  await page.evaluate(async()=>{
    document.querySelector('#game').style.display='none';
    const {buildCommanderAppearance}=await import('/iron-squad/js/commander-identity.js?v=193');
    const {drawSoldierPortrait}=await import('/iron-squad/js/soldier-appearance.js?v=193');
    const {FACE_OUTLINES,JAW_TYPES}=await import('/iron-squad/js/appearance-features.js?v=193');
    document.body.style.cssText='height:auto;overflow:auto;background:#17242c';
    const cv=document.createElement('canvas');cv.id='face-sheet';cv.width=1250;cv.height=1040;const c=cv.getContext('2d');
    c.fillStyle='#17242c';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#ddd8c6';c.font='22px sans-serif';c.fillText('輪郭と顎の組み合わせ（左：男 ／ 右：女）',24,34);
    for(const [j,jaw]of Object.keys(JAW_TYPES).entries())for(const [i,faceOutline]of Object.keys(FACE_OUTLINES).entries()){
      const x=24+i*204,y=60+j*160;c.fillStyle='#ddd8c6';c.font='14px sans-serif';c.fillText(`${FACE_OUTLINES[faceOutline]} / ${JAW_TYPES[jaw]}`,x,y);
      for(const [k,gender]of ['male','female'].entries()){
        const portrait=document.createElement('canvas');portrait.width=96;portrait.height=132;
        drawSoldierPortrait(portrait.getContext('2d'),{id:'sheet',gender,soldierClass:'COMMANDER',appearance:buildCommanderAppearance(gender,{faceOutline,jaw,hairStyle:gender==='male'?'bald':'pixie'})},96,132);
        c.drawImage(portrait,x+k*96,y+10);
      }
    }
    document.body.append(cv);
  });
  await page.locator('#face-sheet').screenshot({path:`${out}/face-combinations-v5.5.3.png`});
  assert.deepEqual(errors,[]);report.pageErrors=errors;
  writeFileSync(`${out}/face-switch-playtest-v5.5.3.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
