import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/review-fixes-v6.11.11';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.stack);});
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
  const saves=await page.evaluate(async()=>{
    const g=qualityGame,{saveSlots}=await import('/iron-squad/js/save-slots.js?v=261'),{generateRandomDrop}=await import('/iron-squad/js/index.js');
    g.stopGameLoop();g.closeStrategyModal();g.career.status='enlisted';g.phase=4;
    Object.assign(g.player,{x:79360,y:79360,givenName:'青空',familyName:'山田',level:12});
    const oldId=g.activeSlotId;saveSlots.update(oldId,{name:'第一遠征隊・山田家の冒険記録'.repeat(3).slice(0,40)});assertBrowser(g.saveCheckpoint(),'initial checkpoint');
    const original=JSON.stringify(saveSlots.get(oldId));assertBrowser(g.saveCheckpoint({newSlot:true}),'new checkpoint');assertBrowser(g.saveCheckpoint({newSlot:true}),'second copy');
    const active=g.activeSlotId,old=saveSlots.get(oldId);assertBrowser(JSON.stringify(old)===original,'old slot preserved');
    assertBrowser(saveSlots.list().every(s=>s.name===old.name),'names stay bounded');
    const data=g.saveGame({persist:false}),post=g.medicalPosts[0];data.phase=9;Object.assign(data.player,{x:post.x,y:post.y,level:23});
    const normal=await saveSlots.updateBackground(active,{data});assertBrowser(normal.status==='saved','real Worker saved');
    const queued=saveSlots.updateBackground(active,{data:{...data,gold:999}});saveSlots.update(active,{data:{...data,gold:1234}});const stale=await queued;
    assertBrowser(stale.status==='superseded','manual write supersedes real Worker');
    const equipment=generateRandomDrop(0,'normal',{type:'ARMOR',armorStyle:'ward',tier:1,merchant:true,random:()=>.5});g.equipped.armor=equipment;g.recalcPlayerStats();g.player.equipmentBarrier=g.player.equipmentBarrierMax;
    assertBrowser(g.player.equipmentBarrierMax>0,'commander barrier');g.saveGame({persist:false});
    // Use a detached slot module to exercise browser worker error messages without touching the normal worker.
    const RealWorker=window.Worker;let failures=0;
    window.Worker=class{postMessage(m){const job=structuredClone(m);failures++;queueMicrotask(()=>this.onmessage({data:{id:job.id,error:'test worker failure'}}));}terminate(){}};
    try{
      const {saveSlots:faultSlots}=await import('/iron-squad/js/save-slots.js?review-worker-error');faultSlots.list();
      for(const gold of [2001,2002,2003])assertBrowser((await faultSlots.updateBackground(active,{data:{...data,gold}})).status==='saved','message fallback saves');
      assertBrowser(failures===2,'worker disabled after consecutive errors');
    }finally{window.Worker=RealWorker;}
    saveSlots.update(active,{data:{...data,gold:1234}});
    window.reviewQA={g,saveSlots,active,oldId,original,normalData:structuredClone(data),postName:post.name};g.showSaveMenu();
    return {slots:saveSlots.list().length,active,name:old.name,realWorker:normal.status,staleWorker:stale.status,errorWorkerAttempts:failures,commanderBarrierMax:g.player.equipmentBarrierMax};
    function assertBrowser(value,label){if(!value)throw new Error(label);}
  });
  assert.equal(saves.realWorker,'saved');assert.equal(saves.staleWorker,'superseded');assert.equal(saves.errorWorkerAttempts,2);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    await page.evaluate(()=>{reviewQA.g.showSaveMenu();const body=document.querySelector('#save-menu .dialog-body');body.scrollTop=document.querySelector('#save-slot-list').offsetTop-body.offsetTop;});
    await page.locator(`#save-menu [data-save-slot="${saves.active}"]`).scrollIntoViewIfNeeded();
    const ui=await page.locator(`#save-menu [data-save-slot="${saves.active}"]`).evaluate(card=>({text:card.textContent,rows:[...card.querySelectorAll('.save-date')].map(n=>n.textContent),rect:{x:card.getBoundingClientRect().x,right:card.getBoundingClientRect().right},overflow:card.scrollWidth-card.clientWidth,activeMarks:document.querySelectorAll('.save-active-mark').length,pageOverflow:document.documentElement.scrollWidth-innerWidth}));
    assert.match(ui.text,/隊長 青空・山田 · Lv\.23/);assert.match(ui.rows[0],/通常記録（オートセーブ）.*第9期/);assert.match(ui.rows[1],/地点記録：本陣 · 第4期/);assert.equal(ui.activeMarks,1);assert.equal(ui.overflow,0);assert.equal(ui.pageOverflow,0);assert.ok(ui.rect.x>=0&&ui.rect.right<=viewport.width);
    await page.screenshot({path:`${out}/save-menu-${size}.png`});
    await page.locator(`[data-slot-id="${saves.active}"]`).click();
    assert.equal(await page.evaluate(()=>qualityGame.phase),9);assert.equal(await page.evaluate(()=>qualityGame.gold),1234);
    await page.evaluate(()=>{qualityGame.stopGameLoop();qualityGame.closeStrategyModal();qualityGame.render();});await page.screenshot({path:`${out}/normal-loaded-${size}.png`});
    await page.evaluate(()=>qualityGame.showSaveMenu());await page.locator(`[data-checkpoint-slot="${saves.active}"]`).click();
    assert.equal(await page.evaluate(()=>qualityGame.phase),4);assert.equal(await page.evaluate(()=>qualityGame.player.level),12);
    await page.evaluate(()=>{const q=reviewQA;q.g.stopGameLoop();q.g.closeStrategyModal();q.g.render();q.saveSlots.update(q.active,{data:{...q.normalData,gold:1234}});});
    await page.screenshot({path:`${out}/checkpoint-loaded-${size}.png`});results.push({viewport,ui,normalLoad:true,checkpointLoad:true});
  }
  assert.deepEqual(errors,[]);
  const manifest=readFileSync('iron-squad/sw-assets.js','utf8'),files=[...manifest.matchAll(/^\s*'([^']+)',?$/gm)].map(m=>m[1]);
  for(const file of files){const response=await context.request.get(new URL(file,'http://127.0.0.1:8000/iron-squad/').href);assert.equal(response.status(),200,file);assert.equal(Buffer.compare(await response.body(),readFileSync(`iron-squad/${file}`)),0,file);}
  const report={version:'6.11.11',saves,results,pageErrors:errors,servedAssets:files.length,disposableBrowserStorage:true};
  writeFileSync(`${out}/browser-playtest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
