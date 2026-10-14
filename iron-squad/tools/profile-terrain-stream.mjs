import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const mode=process.argv[2]||'after',out='iron-squad/docs/previews/walking-save-performance';mkdirSync(out,{recursive:true});
if(mode==='before'){
  const source=execFileSync('git',['show','d46faf3:iron-squad/js/world.js'],{encoding:'utf8'}).replaceAll("from './","from '../../js/");
  mkdirSync('iron-squad/docs/backups',{recursive:true});writeFileSync('iron-squad/docs/backups/world-before-performance.mjs',source);
}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
  const result=await page.evaluate(async mode=>{
    const g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.monsters=[];g.currentQuest=null;
    if(mode==='before'){const {WorldTerrain}=await import('/iron-squad/docs/backups/world-before-performance.mjs');g.worldTerrain.clear();g.worldTerrain=new WorldTerrain();}
    const terrain=g.worldTerrain,ctx=g.ctx,camera={x:79360+2000,y:79360+40};
    function sample(){const start=performance.now(),before=terrain.generated;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,390,844);ctx.translate(195-camera.x,422-camera.y);terrain.draw(ctx,camera,390,844,1);ctx.restore();return {ms:+(performance.now()-start).toFixed(1),generated:terrain.generated-before};}
    const cold=sample();let blockingCalls=0,blockingMs=0;const generate=terrain.generate;
    terrain.generate=function(...args){blockingCalls++;const start=performance.now();try{return generate.apply(this,args);}finally{blockingMs+=performance.now()-start;}};
    const frames=[];
    for(let i=0;i<260;i++){await new Promise(requestAnimationFrame);camera.x+=165/60;frames.push(sample());}
    const sorted=frames.map(f=>f.ms).sort((a,b)=>a-b);
    let identical=null;
    if(mode==='after'){
      const tx=172,ty=150;terrain.requestTile(tx,ty);
      for(let i=0;i<300&&!terrain.tiles.has(`${tx},${ty}`);i++)await new Promise(requestAnimationFrame);
      const tile=terrain.tiles.get(`${tx},${ty}`);if(!tile)throw new Error('Terrain worker did not complete');
      const baseline=generate.call(terrain,tx,ty),a=tile.context.getImageData(0,0,512,512).data,b=baseline.context.getImageData(0,0,512,512).data;
      let differences=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;
      identical={pixelDifferences:differences,objects:JSON.stringify(tile.objects)===JSON.stringify(baseline.objects),camps:JSON.stringify(tile.camps)===JSON.stringify(baseline.camps)};
      baseline.canvas.width=baseline.canvas.height=1;
    }
    return {mode,cold,frames:frames.length,blockingCalls,blockingMs:+blockingMs.toFixed(1),groundMs:{p50:sorted[130],p95:sorted[247],max:sorted.at(-1)},over50:frames.filter(f=>f.ms>50).length,identical};
  },mode);
  assert.deepEqual(errors,[]);if(mode==='after')assert.deepEqual(result.identical,{pixelDifferences:0,objects:true,camps:true});
  await page.screenshot({path:`${out}/terrain-${mode}.png`});writeFileSync(`${out}/terrain-${mode}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await context.close();
}finally{await browser.close();}
