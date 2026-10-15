// Disposable browser saves: compare local lighting, fog and phone orientations.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const out='iron-squad/docs/previews',errors=[],report=[];
mkdirSync(out,{recursive:true});
try {
  for(const [width,height,zoom] of [[390,844,1],[844,390,.75]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${process.argv[2]||'http://127.0.0.1:8001'}/iron-squad/tools/canvas-quality-review.html`);
    await page.waitForFunction(()=>window.qualityReady);
    await page.evaluate(zoom=>{const g=qualityGame;g.stopGameLoop();g.monsters=[];g.zoom=zoom;g.screenShake=0;g.restTimer=0;g.phaseTimer=100;},zoom);
    for(const site of ['hq','tavern','town']) {
      for(const [period,time] of [['day',120],['night',300]]) {
        const result=await page.evaluate(async({site,time})=>{
          const g=qualityGame,{WORLD_SIZE,TAVERN_SITE}=await import('/iron-squad/js/world.js?v=277');
          const C=WORLD_SIZE/2;
          if(g.currentDungeon)g.exitDungeon();
          g.stopGameLoop();
          let x=C,y=C+100;
          if(site==='tavern'){x=TAVERN_SITE.x;y=TAVERN_SITE.y-25;g.ensureTavernRoster?.();}
          if(site==='town'){
            g.enterDungeon(g.dungeons.find(d=>d.id==='royal_castle_town'));g.stopGameLoop();
            x=230;y=g.currentDungeon.height/2;
          }
          g.worldTime=time;Object.assign(g.player,{x,y});Object.assign(g.camera,{x,y});
          g.revealFogAroundPlayer(true);g.render();g.updateStatsUI(true);
          const c=g.ctx,pixel=(wx,wy)=>{
            const sx=(wx-g.camera.x)*g.zoom+g.width/2,sy=(wy-g.camera.y)*g.zoom+g.height/2;
            const p=c.getImageData(Math.round(sx*g.canvas.width/g.width),Math.round(sy*g.canvas.height/g.height),1,1).data;
            return Array.from(p);
          };
          const lamp=g.worldObjs.find(o=>o.type==='torch'&&Math.abs(o.x-x)<100&&Math.abs(o.y-y)<130);
          if(!lamp)throw new Error('Missing nearby torch: '+site);
          const lit=pixel(lamp.x+35,lamp.y-12);
          // Removing only the light pass leaves the same night scenery underneath.
          const drawLights=g.drawNightLights;g.drawNightLights=()=>{};g.render();
          const unlit=pixel(lamp.x+35,lamp.y-12);g.drawNightLights=drawLights;g.render();
          const torchSurface=document.createElement('canvas');torchSurface.width=torchSurface.height=80;
          const tc=torchSurface.getContext('2d');g.drawWorldObj(tc,{type:'torch',x:40,y:60,ph:1},1000);
          const flame=tc.getImageData(35,10,10,22).data;
          let flamePixels=0;for(let i=0;i<flame.length;i+=4)if(flame[i+3]>0)flamePixels++;
          return {site,time,lit,unlit,flamePixels,canvas:[g.width,g.height],recovery:!!g._renderProblem};
        },{site,time});
        assert.equal(result.recovery,false);
        if(period==='day'){assert.deepEqual(result.lit,result.unlit);assert.equal(result.flamePixels,0);}
        else {assert.ok(result.lit[0]>result.unlit[0]+10,'nearby ground receives warm light');assert.ok(result.flamePixels>0);}
        report.push({width,height,period,...result});
        await page.screenshot({path:`${out}/night-lighting-${site}-${period}-${width}-v5.6.2.png`});
      }
    }
    const validation=await page.evaluate(async()=>{
      const g=qualityGame;if(g.currentDungeon)g.exitDungeon();g.stopGameLoop();g.screenShake=0;g.worldTime=300;
      Object.assign(g.player,{x:95000,y:95000});g.camera={x:95000,y:95000};
      g.fog.bytes.fill(0);g.fog._campSeeded=true;g.fog._exploredHint=false;g.revealFogAroundPlayer(true);
      // Put a torch into a genuinely unexplored visible cell and render through the real pipeline.
      g.width=1400;g.height=1400;g.canvas.width=g.canvas.height=1400;g.zoom=.65;
      const drawField=g.drawBattlefield;
      g.drawBattlefield=function(c,t){drawField.call(this,c,t);this.worldObjs.push({type:'torch',x:94000,y:94000,ph:1});};
      g.render();const fogPixel=Array.from(g.ctx.getImageData(50,50,1,1).data);
      const nearTorchPixel=Array.from(g.ctx.getImageData(72,55,1,1).data);
      g.drawBattlefield=drawField;g.resizeCanvas();g.render();
      const startX=g.player.x;g.inBattle=true;g.joystick.active=true;g.joystick.dirX=1;g.joystick.dirY=0;
      for(let i=0;i<12;i++)g.update(1/60);
      g.joystick.active=false;g.render();
      return {fogPixel,nearTorchPixel,moved:g.player.x-startX,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.deepEqual(validation.fogPixel,[0,0,0,255]);
    assert.deepEqual(validation.nearTorchPixel,[0,0,0,255]);
    assert.ok(validation.moved>0);assert.equal(validation.overflow,false);
    report.push({width,height,validation});await context.close();
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();writeFileSync(`${out}/night-lighting-v5.6.2.json`,JSON.stringify({report,errors},null,2));}
console.log('PASS: day/night at HQ, tavern and town in two phone orientations; warm local light, extinguished daytime torches, fog masking and movement');
