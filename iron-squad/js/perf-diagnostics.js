// Opt-in, in-memory instrumentation. No hooks, observers, timers or storage writes at import time.
import {gameText} from './game-text.js?v=322';
export const PERF_VERSION='7.0.4',PERF_THRESHOLD_MS=100,PERF_RECORD_LIMIT=10;
export const PERF_SETTING_KEY='game_studio_ironsquad_perf_enabled';
export const perfRequested=search=>new URLSearchParams(search??globalThis.window?.location?.search??'').get('perf')==='1';

/** rAF gaps include synchronous work AND worker callbacks between frames. Nested times are exclusive. */
export function createPerfRecorder({now=()=>performance.now(),clock=()=>new Date().toISOString(),terrain=()=>({})}={}) {
  let previousFrame=null,previousNow=null,lastSlow=null,bucket=new Map(),records=[],longTasks=[];
  const stack=[];let latestTiming=[];
  const api={
    wrap(name,fn){
      return function(...args){
        const entry={start:now(),children:0};stack.push(entry);
        try{return fn.apply(this,args);}
        finally{
          const elapsed=Math.max(0,now()-entry.start);stack.pop();
          if(stack.length)stack[stack.length-1].children+=elapsed;
          const value=bucket.get(name)||{name,ms:0,totalMs:0,calls:0};
          value.ms+=Math.max(0,elapsed-entry.children);value.totalMs+=elapsed;value.calls++;bucket.set(name,value);
        }
      };
    },
    resetFrames(){previousFrame=null;previousNow=null;bucket=new Map();},
    frame(timestamp){
      const end=now(),start=previousNow,rafMs=previousFrame===null?0:timestamp-previousFrame;
      // rAF's supplied timestamp can lag a worker task, then catch up a frame later.
      // Callback arrival intervals align with the timers and count that stall once.
      const gap=start===null?0:end-start;
      previousFrame=timestamp;previousNow=end;
      const timing=[...bucket.values()];latestTiming=timing;bucket=new Map();
      if(start===null||!(gap>PERF_THRESHOLD_MS))return null;
      const measuredMs=timing.reduce((n,t)=>n+t.ms,0);
      const record={time:clock(),frameMs:gap,rafMs,sincePreviousSeconds:lastSlow===null?null:(end-lastSlow)/1000,
        intervalStart:start,intervalEnd:end,timing,measuredMs,unmeasuredMs:Math.max(0,gap-measuredMs),terrain:terrain(),
        longTasks:longTasks.filter(t=>t.start<end&&t.start+t.ms>start)};
      lastSlow=end;records.push(record);if(records.length>PERF_RECORD_LIMIT)records.shift();return record;
    },
    longTask(start,ms){
      const task={start,ms};longTasks.push(task);if(longTasks.length>30)longTasks.shift();
      // Observer delivery can follow the rAF that detected the gap.
      for(const record of records)if(start<record.intervalEnd&&start+ms>record.intervalStart)record.longTasks.push(task);
    },
    records(){return structuredClone(records);},
    latestTiming(){return structuredClone(latestTiming);},
    longTasks(){return longTasks.slice();}
  };
  return api;
}

const terrainState=game=>{
  const t=game.worldTerrain;
  return {disabled:!!t?._terrainWorkerDisabled,pending:t?._pendingTerrain?.size??0,rasterSize:t?.rasterSize??null,
    tiles:t?.tiles?.size??0,workerActive:!!t?._terrainWorker,workerSupported:typeof globalThis.Worker==='function',
    offscreenSupported:typeof globalThis.OffscreenCanvas==='function',bitmapSupported:typeof globalThis.ImageBitmap==='function'};
};
const stateText=t=>`W${Number(t.disabled)} Q${t.pending} R${t.rasterSize??'—'} C${t.tiles}`;
const ms=n=>Math.round(n);
const gameKey=key=>/^game_studio_(?:ironsquad_|iron_squad_)/.test(String(key));
const shortName=name=>({
  '更新その他':'更新','描画その他':'描画','ゲーム保存':'保存','フレーム本体':'本体',
  '地形.generate':'生成','地形.takeSurface':'面取得','地形.drawOverview':'地図地形',
  '枠.update':'枠更新','枠.updateBackground':'背景受付','枠.list':'一覧','枠.get':'枠読む',
  '霧.revealAt':'霧公開','霧.forceRevealAt':'霧強制','霧.revealCamp':'霧本陣','霧.drawFieldOverlay':'霧描画','霧.drawMapOverlay':'霧地図'
})[name]||name;

export function installPerfDiagnostics(game,{WorldTerrain,FogGrid,saveSlots,profileSaveCompletions,profileFollowerRecovery},options={}) {
  if(!(options.enabled??perfRequested(options.search??options.window?.location?.search)))return null;
  const doc=options.document||document,win=options.window||window,root=game.container.querySelector('.iron-squad');
  if(!root)return null;
  const recorder=createPerfRecorder({now:options.now,clock:options.clock,terrain:()=>terrainState(game)}),restore=[],seenWorkers=new WeakSet();
  let disposed=false,observer=null,longTaskSupported=false,frozen=null,lastSignature='';
  const replace=(object,key,make)=>{
    if(typeof object?.[key]!=='function')return;
    const descriptor=Object.getOwnPropertyDescriptor(object,key),wrapped=make(object[key]);
    Object.defineProperty(object,key,{configurable:true,writable:true,enumerable:descriptor?.enumerable??true,value:wrapped});
    restore.push(()=>{if(object[key]===wrapped){if(descriptor)Object.defineProperty(object,key,descriptor);else delete object[key];}});
  };
  const time=(object,key,label)=>replace(object,key,fn=>recorder.wrap(label,fn));
  const hookTerrainWorker=worker=>{
    if(!worker||seenWorkers.has(worker)||typeof worker.onmessage!=='function')return;
    seenWorkers.add(worker);
    const original=worker.onmessage,timed=recorder.wrap('地形受信',original);
    // Use the native event-handler setter, rather than shadowing it with a data property.
    worker.onmessage=timed;restore.push(()=>{if(worker.onmessage===timed)worker.onmessage=original;});
  };
  for(const [method,label] of [['update','更新その他'],['render','描画その他'],['saveGame','ゲーム保存'],['updateSpawns','敵出現'],['revealFogAroundPlayer','フォグ公開'],['renderMinimap','ミニマップ'],['openWorldMap','地図再描画']])time(game,method,label);
  time(game,'updateAmbientCrowd','住民更新');time(game,'drawAmbientResident','住民描画');
  for(const method of ['generate','takeSurface','drawOverview'])time(WorldTerrain.prototype,method,`地形.${method}`);
  for(const method of ['revealAt','forceRevealAt','revealCamp','drawFieldOverlay','drawMapOverlay'])time(FogGrid.prototype,method,`霧.${method}`);
  for(const method of ['update','updateBackground','list','get'])time(saveSlots,method,`枠.${method}`);
  if(profileSaveCompletions)restore.push(profileSaveCompletions(fn=>recorder.wrap('保存完了',fn)));
  if(profileFollowerRecovery)restore.push(profileFollowerRecovery((label,fn)=>recorder.wrap(label,fn)));
  // Attach to each newly created terrain worker; timing includes takeSurface and bitmap drawImage.
  replace(WorldTerrain.prototype,'requestTile',fn=>function(...args){
    try{return fn.apply(this,args);}
    finally{
      hookTerrainWorker(this._terrainWorker);
    }
  });
  hookTerrainWorker(game.worldTerrain?._terrainWorker);
  let storageSupported=false;
  try{
    const storage=win.localStorage;
    for(const method of ['getItem','setItem']){
      let owner=storage;while(owner&&!Object.getOwnPropertyDescriptor(owner,method))owner=Object.getPrototypeOf(owner);
      if(owner&&typeof owner[method]==='function'){
        replace(owner,method,fn=>{
          const timed=recorder.wrap(method==='getItem'?'LS読む':'LS書く',fn);
          return function(key,...args){return this===storage&&gameKey(key)?timed.call(this,key,...args):fn.call(this,key,...args);};
        });storageSupported=true;
      }
    }
  }catch{/* WebKit may refuse method replacement. Show that explicitly; never change storage policy. */}
  replace(game,'startGameLoop',fn=>function(...args){recorder.resetFrames();return fn.apply(this,args);});
  replace(game,'stopGameLoop',fn=>function(...args){recorder.resetFrames();return fn.apply(this,args);});
  // startGameLoop assigns and queues this.loop. Intercept that assignment only in perf mode.
  const loopDescriptor=Object.getOwnPropertyDescriptor(game,'loop');let loopSource=game.loop,loopWrapper=loopSource;
  Object.defineProperty(game,'loop',{configurable:true,enumerable:loopDescriptor?.enumerable??true,get:()=>loopWrapper,set:fn=>{
    loopSource=fn;const timed=recorder.wrap('フレーム本体',fn);
    loopWrapper=function(timestamp){
      if(disposed)return fn.call(this,timestamp);
      if(doc.hidden||!game.running)recorder.resetFrames();else recorder.frame(timestamp);
      return timed.call(this,timestamp);
    };
  }});
  if(typeof loopSource==='function')game.loop=loopSource;
  const reschedule=()=>{
    if(game.running&&game.animFrameId&&typeof win.cancelAnimationFrame==='function'&&typeof win.requestAnimationFrame==='function'){
      win.cancelAnimationFrame(game.animFrameId);game.animFrameId=win.requestAnimationFrame(game.loop);
    }
  };
  reschedule();
  restore.push(()=>Object.defineProperty(game,'loop',{configurable:true,writable:true,enumerable:loopDescriptor?.enumerable??true,value:loopSource}));
  const reset=()=>recorder.resetFrames();doc.addEventListener('visibilitychange',reset);win.addEventListener('pagehide',reset);win.addEventListener('pageshow',reset);
  restore.push(()=>{doc.removeEventListener('visibilitychange',reset);win.removeEventListener('pagehide',reset);win.removeEventListener('pageshow',reset);});
  try{
    const Observer=options.PerformanceObserver??win.PerformanceObserver;
    if(Observer&&(Observer.supportedEntryTypes?.includes('longtask')??true)){
      observer=new Observer(list=>{for(const entry of list.getEntries())recorder.longTask(entry.startTime,entry.duration);});
      observer.observe({type:'longtask',buffered:false});longTaskSupported=true;
    }
  }catch{observer?.disconnect();observer=null;}
  const panel=doc.createElement('aside');panel.className='perf-diagnostics';panel.setAttribute('aria-label',gameText('停止の計測'));
  panel.innerHTML=gameText(`<header><strong>PERF v${PERF_VERSION} · 100ms超</strong><div><button type="button" data-perf-freeze>表示固定</button><button type="button" data-perf-copy>コピー</button></div></header><p class="perf-state"></p><p class="perf-legend">W:Worker停止 Q:待機 R:解像度 C:画像枚数<br>内訳は重複を除く上位3処理(ms)・全内訳はコピー</p><ol class="perf-records"></ol><p class="perf-feedback"></p><textarea class="perf-copy hidden" readonly aria-label="計測データ"></textarea>`);
  root.append(panel);
  const state=panel.querySelector('.perf-state'),list=panel.querySelector('.perf-records'),feedback=panel.querySelector('.perf-feedback');
  const snapshot=()=>({version:PERF_VERSION,thresholdMs:PERF_THRESHOLD_MS,terrain:terrainState(game),storageSupported,longTaskSupported,latestTiming:recorder.latestTiming(),records:recorder.records(),longTasks:recorder.longTasks()});
  const refresh=recorder.wrap('計測表示',()=>{
    if(disposed||frozen)return;
    const t=terrainState(game),tasks=recorder.longTasks();
    state.textContent=gameText(`${stateText(t)} · OC${Number(t.offscreenSupported)} · LS${Number(storageSupported)} · LT${longTaskSupported?(tasks.length?`${ms(tasks.at(-1).ms)}ms`:'待機'):'非対応'}`);
    const timing=recorder.latestTiming(),crowdUpdate=timing.find(t=>t.name==='住民更新')?.totalMs||0,crowdDraw=timing.find(t=>t.name==='住民描画')?.totalMs||0;
    state.textContent+=gameText(` · 住民 更新${crowdUpdate.toFixed(1)} / 描画${crowdDraw.toFixed(1)}ms`);
    const rows=recorder.records(),signature=JSON.stringify(rows);
    if(signature===lastSignature)return;lastSignature=signature;list.replaceChildren();
    if(!rows.length){const empty=doc.createElement('li');empty.textContent=gameText('100ms超のフレームを待っています');list.append(empty);}
    for(const record of rows.toReversed()){
      const item=doc.createElement('li'),head=doc.createElement('strong'),body=doc.createElement('div');
      const time=new Date(record.time).toLocaleTimeString('ja-JP',{hour12:false}),gap=record.sincePreviousSeconds===null?'初回':`+${record.sincePreviousSeconds.toFixed(1)}s`;
      head.textContent=`${time} ${gap} ${ms(record.frameMs)}ms · ${stateText(record.terrain)}`;
      if(record.longTasks.length)head.textContent+=` LT${ms(Math.max(...record.longTasks.map(t=>t.ms)))}`;
      const top=record.timing.filter(t=>t.ms>=.5).sort((a,b)=>b.ms-a.ms).slice(0,3);
      body.textContent=top.map(t=>`${shortName(t.name)} ${ms(t.ms)}`).join(' / ')||'計測処理 <1ms';
      if(record.unmeasuredMs>=1)body.textContent+=` / 未計測 ${ms(record.unmeasuredMs)}`;
      head.textContent=gameText(head.textContent);body.textContent=gameText(body.textContent);
      item.append(head,body);list.append(item);
    }
  });
  panel.querySelector('[data-perf-freeze]').onclick=event=>{
    if(frozen){frozen=null;event.currentTarget.textContent=gameText('表示固定');refresh();}
    else{refresh();frozen=snapshot();event.currentTarget.textContent=gameText('表示再開');}
  };
  panel.querySelector('[data-perf-copy]').onclick=async()=>{
    const text=JSON.stringify(frozen||snapshot(),null,2);
    try{await win.navigator.clipboard.writeText(text);feedback.textContent=gameText('コピーしました');}
    catch{const area=panel.querySelector('.perf-copy');area.value=text;area.classList.remove('hidden');area.focus();area.select();feedback.textContent=gameText('下の枠を長押ししてコピー');}
  };
  const timer=win.setInterval(refresh,500);refresh();
  return {recorder,snapshot,json:()=>JSON.stringify(frozen||snapshot(),null,2),refresh,
    dispose(){if(disposed)return;disposed=true;win.clearInterval(timer);observer?.disconnect();for(const undo of restore.reverse())undo();reschedule();panel.remove();}};
}

/** Preference/controller only. OFF never installs the instrumentation above. */
export function configurePerfSettings(game,dependencies,options={}){
  const doc=options.document||document,win=options.window||window,host=game.container.querySelector('#view-strat-overview');
  if(!host)return null;
  const queryOn=perfRequested(options.search??win.location?.search);
  let savedOn=false;try{savedOn=win.localStorage.getItem(PERF_SETTING_KEY)==='1';}catch{/* Default OFF when storage is inaccessible. */}
  const section=doc.createElement('details');section.id='perf-settings';section.className='command-fold perf-settings';
  section.innerHTML=gameText('<summary>計測表示</summary><div class="fold-content"><button type="button" class="action-btn secondary" id="btn-perf-toggle" role="switch" aria-checked="false">計測表示 OFF</button><p class="perf-setting-status" role="status"></p></div>');host.append(section);
  const button=section.querySelector('button'),status=section.querySelector('.perf-setting-status');
  const render=(saved=true)=>{
    const on=!!game.perfDiagnostics;button.setAttribute('aria-checked',String(on));button.textContent=gameText(`計測表示 ${on?'ON':'OFF'}`);
    status.textContent=gameText(!saved?'表示は変えましたが、設定を保存できませんでした。':on?'ON · 次の起動でも計測します。':queryOn?'OFF · URL指定中は次の起動でONになります。':'OFF · 計測していません。');
  };
  const setEnabled=(on,persist=true)=>{
    if(on&&!game.perfDiagnostics)game.perfDiagnostics=installPerfDiagnostics(game,dependencies,{...options,enabled:true});
    if(!on){game.perfDiagnostics?.dispose();game.perfDiagnostics=null;}
    let saved=true;if(persist)try{if(on)win.localStorage.setItem(PERF_SETTING_KEY,'1');else win.localStorage.removeItem(PERF_SETTING_KEY);}catch{saved=false;}
    render(saved);return !!game.perfDiagnostics;
  };
  button.onclick=()=>setEnabled(!game.perfDiagnostics);
  setEnabled(queryOn||savedOn,false);
  return {setEnabled,dispose(){button.onclick=null;game.perfDiagnostics?.dispose();game.perfDiagnostics=null;section.remove();}};
}
