// Soak playtest for freeze diagnosis. usage: node iron-squad/tools/soak-freeze.mjs <off|on> [minutes]
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const mode=process.argv[2]||'off',minutes=+(process.argv[3]||10),kanaOn=mode==='on';
const VW=+(process.argv[4]||390),VH=+(process.argv[5]||844),DPR=+(process.argv[6]||3),tag=process.argv[7]||'';
const out=`iron-squad/docs/previews/freeze/soak${tag}-${mode}`;mkdirSync('iron-squad/docs/previews/freeze',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:DPR,isMobile:true,hasTouch:true});
const page=await context.newPage();
const errors=[],samples=[],profiles=[];
page.on('pageerror',e=>errors.push({t:Date.now(),msg:e.message}));
page.on('console',m=>{if(m.type()==='error')errors.push({t:Date.now(),console:m.text().slice(0,300)});});
await page.addInitScript(()=>{
  const S=window.__soak={gaps:[],long:[],moCalls:0,moRecs:0,moSec:{},moTypes:{},moTargets:{},mapClears:0,errs:[],phase:'init',t0:performance.now()};
  const RMO=window.MutationObserver;
  window.MutationObserver=class extends RMO{constructor(cb){super((recs,o)=>{const t0=performance.now();S.moCalls++;S.moRecs+=recs.length;for(const r of recs){const k=r.type+(r.attributeName?':'+r.attributeName:'');S.moTypes[k]=(S.moTypes[k]||0)+1;const el=r.target.nodeType===1?r.target:r.target.parentElement;const id=el?(el.tagName+(el.id?'#'+el.id:'')+(el.className&&el.className.baseVal===undefined?'.'+String(el.className).split(' ')[0]:'')):'?';S.moTargets[id]=(S.moTargets[id]||0)+1;}const s=Math.floor((t0-S.t0)/1000);const e=S.moSec[s]||(S.moSec[s]={c:0,r:0,ms:0});e.c++;e.r+=recs.length;try{return cb(recs,o);}finally{e.ms+=performance.now()-t0;}});}};
  window.addEventListener('unhandledrejection',e=>S.errs.push('rej:'+String(e.reason&&e.reason.stack||e.reason).slice(0,300)));
  try{new PerformanceObserver(l=>{for(const e of l.getEntries())S.long.push({t:Math.round(e.startTime),d:Math.round(e.duration),phase:S.phase});}).observe({entryTypes:['longtask']});}catch(e){}
  const oc=Map.prototype.clear;Map.prototype.clear=function(){if(this.size>=3900)S.mapClears++;return oc.call(this);};
  let prev=performance.now();
  const tick=t=>{const gap=t-prev;prev=t;if(gap>100)S.gaps.push({t:Math.round(t),gap:Math.round(gap),phase:S.phase,g:window.qualityGame?{inB:!!qualityGame.inBattle,mons:qualityGame.monsters?.length,x:Math.round(qualityGame.player?.x),y:Math.round(qualityGame.player?.y),tiles:qualityGame.worldTerrain?.tiles?.size,gen:qualityGame.worldTerrain?.generated}:null});requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
});
const cdp=await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await cdp.send('Performance.enable');
await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});
await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
await page.evaluate(async(kanaOn)=>{
  const kana=await import('/common/js/kana-mode.js?v=175');window.__kana=kana;if(kanaOn)kana.setKanaMode(true);
  const g=qualityGame;g.currentDungeon=null;g.startGameLoop();
  const w=await import('/iron-squad/js/world.js?v=175');window.__w=w;
  window.__steer={tx:0,ty:0,until:0};
},kanaOn);
const start=Date.now();
const snap=async(label)=>{
  const m=await cdp.send('Performance.getMetrics');const mm=Object.fromEntries(m.metrics.map(x=>[x.name,x.value]));
  const st=await page.evaluate(()=>({kana:__kana.isKanaMode(),inB:!!qualityGame.inBattle,mons:qualityGame.monsters?.length,wave:qualityGame.wave,tiles:qualityGame.worldTerrain?.tiles?.size,moCalls:__soak.moCalls,moRecs:__soak.moRecs,gaps:__soak.gaps.length,long:__soak.long.length}));
  samples.push({t:Math.round((Date.now()-start)/1000),heap:Math.round(mm.JSHeapUsedSize/1048576*10)/10,nodes:mm.Nodes,listeners:mm.JSEventListeners,docs:mm.Documents,label,...st});
};
let profStart=null,segGaps=0,segLong=0;
const startProf=async()=>{await cdp.send('Profiler.start');profStart=Date.now();};
const stopProf=async(keep,why)=>{const {profile}=await cdp.send('Profiler.stop');if(keep){profiles.push({at:Math.round((profStart-start)/1000),why});writeFileSync(`${out}-prof-${profiles.length}.cpuprofile`,JSON.stringify(profile));}};
const setPhase=p=>page.evaluate(p=>{__soak.phase=p;},p);
const steer=()=>page.evaluate(()=>{
  const g=qualityGame,C=__w.WORLD_SIZE/2,now=performance.now(),s=__steer;
  if(g.player.hp<g.player.maxHp*.4)g.player.hp=g.player.maxHp;
  if(!g.inBattle||g.currentDungeon)return 'nobattle';
  const mode=Math.random();
  if(now>s.until){
    s.until=now+3000+Math.random()*5000;
    const px=g.player.x,py=g.player.y;
    if(mode<.55){
      const tx0=Math.floor(px/512),ty0=Math.floor(py/512),c=[];
      for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const t=g.worldTerrain.get(tx0+dx,ty0+dy);for(const o of t.objects||[])c.push(o);}
      if(c.length){const o=c[Math.floor(Math.random()*c.length)];s.tx=o.x;s.ty=o.y;s.kind=o.type;}
    }else if(mode<.75){
      const S=__w.SETTLEMENTS,st=S[Math.floor(Math.random()*S.length)],p=st.props[Math.floor(Math.random()*st.props.length)];
      Object.assign(g.player,{x:C+st.ox+p.dx-300,y:C+st.oy+p.dy});Object.assign(g.camera,{x:g.player.x,y:g.player.y});s.tx=C+st.ox+p.dx;s.ty=C+st.oy+p.dy;s.kind='town:'+p.type;
    }else{const a=Math.random()*6.283;s.tx=px+Math.cos(a)*2500;s.ty=py+Math.sin(a)*2500;s.kind='free';}
  }
  const dx=s.tx-g.player.x,dy=s.ty-g.player.y,d=Math.hypot(dx,dy)||1;
  if(d<30){s.until=0;}
  Object.assign(g.joystick,{active:true,dirX:dx/d,dirY:dy/d});
  return s.kind;
});
const ui=async(i)=>{
  const acts=['strategy','merchant','save','map'];const a=acts[i%acts.length];
  await setPhase('ui-'+a);
  try{
    if(a==='strategy'){
      await page.click('#btn-strategy',{timeout:3000});await page.waitForTimeout(500);
      for(const t of ['overview','troops','nation']){await page.click('#tab-strat-'+t,{timeout:2000}).catch(()=>{});await page.waitForTimeout(500);await page.click('#btn-strat-window-back',{timeout:1000}).catch(()=>{});await page.waitForTimeout(250);}
      await page.evaluate(()=>{document.getElementById('btn-start-next-wave')?.click();document.getElementById('btn-close-strat')?.click();});
    }else if(a==='merchant'){
      await page.evaluate(()=>{qualityGame.openMerchantShop();});await page.waitForTimeout(1200);
      await page.evaluate(()=>{document.querySelectorAll('[id*=merchant] button').forEach((b,i)=>{if(i<6&&/閉|戻|×/.test(b.textContent))b.click();});qualityGame.closeMerchantShop?.();});
    }else if(a==='save'){
      await page.evaluate(()=>{qualityGame.showSaveMenu();});await page.waitForTimeout(1200);
      await page.evaluate(()=>{qualityGame.hideSaveMenu?.();});
    }else{
      await page.click('#btn-world-map',{timeout:2000}).catch(()=>{});await page.waitForTimeout(800);await page.click('#btn-world-map-close',{timeout:1500}).catch(()=>{});
    }
  }catch(e){errors.push({ui:a,msg:String(e).slice(0,200)});}
  await page.evaluate(()=>{const g=qualityGame;if(!g.running)g.startGameLoop();});
  await setPhase('field');
};
await setPhase('field');await snap('start');await startProf();
let uiN=0,nextUi=15000,nextSnap=0,nextSeg=Date.now()+15000;const kanaToggles=[];
const log=[];
while(Date.now()-start<minutes*60000){
  const kind=await steer().catch(e=>'err:'+e);
  const now=Date.now()-start;
  if(now>=nextSnap){await snap(kind);nextSnap=now+5000;}
  if(now>=nextUi){await ui(uiN++);nextUi=now+20000;
    const st=await page.evaluate(()=>({inB:!!qualityGame.inBattle,rp:!!qualityGame._renderProblem,run:!!qualityGame.running}));log.push({t:Math.round(now/1000),after:'ui',...st});
    if(!st.inB)await page.evaluate(()=>{document.getElementById('btn-start-next-wave')?.click();document.getElementById('btn-close-strat')?.click();});}
  if(kanaOn){const k=Math.floor(now/180000);if(k>=1&&!kanaToggles.includes(k)){kanaToggles.push(k);await setPhase('kana-off');await page.evaluate(()=>__kana.setKanaMode(false));await page.waitForTimeout(3000);await setPhase('kana-on');await page.evaluate(()=>__kana.setKanaMode(true));await setPhase('field');}}
  if(Date.now()>=nextSeg){
    const c=await page.evaluate(()=>({g:__soak.gaps.filter(x=>x.gap>200).length,l:__soak.long.filter(x=>x.d>200).length}));
    const had=(c.g+c.l)>(segGaps+segLong);segGaps=c.g;segLong=c.l;
    await stopProf(had,'stall>200ms'); await startProf(); nextSeg=Date.now()+15000;
  }
  await page.waitForTimeout(700);
}
await stopProf(false);
await snap('end');
const data=await page.evaluate(()=>({...__soak}));
const rp=await page.evaluate(()=>!!qualityGame._renderProblem);
writeFileSync(`${out}.json`,JSON.stringify({mode,minutes,errors,pageErrs:data.errs,renderProblem:rp,samples,profiles,gaps:data.gaps,long:data.long,moCalls:data.moCalls,moTypes:data.moTypes,moTargets:Object.fromEntries(Object.entries(data.moTargets).sort((a,b)=>b[1]-a[1]).slice(0,15)),mapClears:data.mapClears,moRecs:data.moRecs,moSec:data.moSec,log},null,2));
await browser.close();
const big=data.gaps.filter(x=>x.gap>200);
console.log(mode,'done: gaps>100',data.gaps.length,'gaps>200',big.length,'max',Math.max(0,...data.gaps.map(x=>x.gap)),'long',data.long.length,'errors',errors.length+data.errs.length,'renderProblem',rp,'heap',samples[0].heap,'->',samples.at(-1).heap,'nodes',samples[0].nodes,'->',samples.at(-1).nodes,'mo',data.moCalls);
