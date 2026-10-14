import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/walking-save-performance';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
  const result=await page.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.player.hp=g.player.maxHp;g.monsters=[];g.updateSpawns=()=>{};g.currentQuest=null;
    const time=fn=>{const start=performance.now();fn();return +(performance.now()-start).toFixed(1);};
    const sync=Array.from({length:3},()=>time(()=>g.saveGame()));
    g.autoSaveClock=0;g.joystick={active:true,dirX:1,dirY:0};g.player.speed=700;
    const updates=[],renders=[];for(let i=0;i<120;i++){updates.push(time(()=>g.update(1/60)));renders.push(time(()=>g.render()));}
    g.autoSaveClock=9.999;const autoSaveFrame=time(()=>g.update(1/60));
    const start=performance.now(),saveX=g.player.x;g.startGameLoop();const autoSaveResult=await g._pendingAutoSave;const backgroundWaitMs=+(performance.now()-start).toFixed(1);g.stopGameLoop();const movedDuringSave=Math.abs(g.player.x-saveX);
    const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
    return {syncSaveMs:sync,walkingUpdateMs:{p50:percentile(updates,.5),p95:percentile(updates,.95),max:Math.max(...updates)},renderMs:{p50:percentile(renders,.5),p95:percentile(renders,.95),max:Math.max(...renders)},autoSaveFrameMs:autoSaveFrame,autoSaveResult,backgroundWaitMs,movedDuringSave,worldTiles:g.worldTerrain.tiles.size};
  });
  writeFileSync(`${out}/${process.argv[2]||'current'}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await page.screenshot({path:`${out}/${process.argv[2]||'current'}.png`});await context.close();
}finally{await browser.close();}
