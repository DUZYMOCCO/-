// 救助マーカーの束ねと左上の攻撃力・防御力表示の見本を撮る。要: ローカルサーバー :8000 と同梱 Playwright。
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  for(const [name,vp] of [['portrait',{width:375,height:667}],['landscape',{width:667,height:375}]]){
    const context=await browser.newContext({viewport:vp,deviceScaleFactor:2}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:8000/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
    await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.updateSpawns=()=>{};g.inBattle=true;g.restTimer=0;
      const downed=(g.squad||[]).slice(0,12);
      downed.forEach((s,i)=>{const a=(i<8?0.05+i*0.02:Math.PI+(i-8)*0.12),r=700+i*60;s.isDown=true;s.hp=0;s.dead=false;s.x=g.player.x+Math.cos(a)*r;s.y=g.player.y+Math.sin(a)*r;if(i%5===4)s.carrierId='x';});
      g.camera.x=g.player.x;g.camera.y=g.player.y;g.updateStatsUI();g.render();});
    await page.waitForTimeout(300);
    const n=await page.evaluate(()=>qualityGame.squad.length);console.log(name,'squad',n);
    await page.screenshot({path:name==='portrait'?'docs/previews/rescue-markers-v4.2.21.png':'docs/previews/hud-stats-landscape-v4.2.21.png'});
    if(name==='portrait'){await page.screenshot({path:'docs/previews/hud-stats-v4.2.21.png',clip:{x:0,y:0,width:375,height:110}});}
    await context.close();
  }
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
