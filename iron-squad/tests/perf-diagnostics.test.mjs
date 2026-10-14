import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {perfRequested,createPerfRecorder,installPerfDiagnostics,PERF_RECORD_LIMIT} from '../js/perf-diagnostics.js';

test('perf is strictly opt-in and disabled installation never touches functions, DOM, storage or observers',()=>{
  for(const search of ['', '?perf=0','?perf=true','?x=perf=1'])assert.equal(perfRequested(search),false);
  assert.equal(perfRequested('?foo=2&perf=1'),true);
  const sentinel=new Proxy({}, {get(){throw new Error('disabled diagnostics accessed runtime');}});
  assert.equal(installPerfDiagnostics(sentinel,{}, {search:''}),null);
});

test('100ms boundary, prior-frame work and intervening callbacks use non-overlapping timings',()=>{
  let now=0;const r=createPerfRecorder({now:()=>now,clock:()=> '2026-10-14T12:00:00Z',terrain:()=>({disabled:false,pending:3,rasterSize:512,tiles:24})});
  const inner=r.wrap('storage',()=>{now+=60;return 'kept';});
  const outer=r.wrap('save',()=>{now+=10;const result=inner();now+=20;return result;});
  r.frame(0);assert.equal(outer(),'kept');now=100;assert.equal(r.frame(100),null,'exactly 100ms is excluded');
  outer();const callback=r.wrap('worker',()=>{now+=20;});callback();now=220;
  const result=r.frame(220);assert.equal(result.frameMs,120);assert.equal(result.rafMs,120);assert.equal(result.sincePreviousSeconds,null);
  assert.deepEqual(result.timing.find(t=>t.name==='save'),{name:'save',ms:30,totalMs:90,calls:1});assert.equal(result.measuredMs,110);assert.equal(result.unmeasuredMs,10);
  assert.equal(result.terrain.pending,3);assert.equal(result.timing.find(t=>t.name==='worker').ms,20);
  const promise=Promise.resolve(8),wrapped=r.wrap('submit',function(value){now+=1;assert.equal(this.id,42);return value;});assert.equal(wrapped.call({id:42},promise),promise);
  assert.throws(()=>r.wrap('throw',()=>{now+=3;throw new Error('unchanged');})(),/unchanged/);
});

test('callback arrival clocks retain worker stalls even when rAF timestamps lag, without logging them twice',()=>{
  let now=0;const r=createPerfRecorder({now:()=>now});r.frame(0);
  r.wrap('bitmap callback',()=>now+=150)();now=151;const slow=r.frame(16);
  assert.equal(slow.frameMs,151);assert.equal(slow.rafMs,16);assert.equal(slow.timing[0].ms,150);
  now=167;assert.equal(r.frame(166),null,'a delayed rAF timestamp catches up without a second actual stop');assert.equal(r.records().length,1);
});

test('latest ten records remain bounded, interval survives normal frames and pause gaps are excluded',()=>{
  let now=0;const r=createPerfRecorder({now:()=>now});r.frame(0);
  now=150;r.frame(now);now=166;assert.equal(r.frame(now),null);now=316;
  assert.equal(r.frame(now).sincePreviousSeconds,.166);
  for(let i=0;i<15;i++){now+=150;r.frame(now);}assert.equal(r.records().length,PERF_RECORD_LIMIT);
  const copy=r.records();copy[0].frameMs=1;assert.equal(r.records()[0].frameMs,150);
  r.resetFrames();now+=60_000;assert.equal(r.frame(now),null);now+=16;assert.equal(r.frame(now),null);
  assert.equal(r.records().length,PERF_RECORD_LIMIT);
});

test('optional longtask entries correlate even when observer delivery follows the detected frame',()=>{
  let now=0;const r=createPerfRecorder({now:()=>now});r.frame(0);now=500;r.frame(500);r.longTask(100,200);
  assert.deepEqual(r.records()[0].longTasks,[{start:100,ms:200}]);r.longTask(600,100);assert.equal(r.records()[0].longTasks.length,1);
  for(let i=0;i<40;i++)r.longTask(1000+i,10);assert.equal(r.longTasks().length,30);
});

test('enabled hooks cover storage, newly created/replaced workers, fog, saves, maps and fully restore on disposal',()=>{
  const dom=new JSDOM('<div id="game"><div class="iron-squad"></div></div>',{url:'http://localhost/?perf=1',pretendToBeVisual:true});
  const win=dom.window,doc=win.document;let now=0,savedWrap,followWrap,savedCompletion,followBegin;
  class Terrain{
    constructor(){this.rasterSize=512;this.tiles=new Map();this._pendingTerrain=new Set();}
    takeSurface(){now+=5;return 'surface';}
    generate(){now+=20;this.takeSurface();now+=20;return 'tile';}
    drawOverview(){now+=2;}
    requestTile(){if(!this._terrainWorker){let handler;this._terrainWorker={get onmessage(){return handler;},set onmessage(fn){handler=fn;},dispatch(){handler({});}};this._terrainWorker.onmessage=()=>{now+=12;this.takeSurface();};}}
  }
  class Fog{revealAt(){now+=3;}forceRevealAt(){this.revealAt();}revealCamp(){now+=2;}drawFieldOverlay(){now+=1;}drawMapOverlay(){now+=1;}}
  const slots={list(){now+=2;return []},get(){return this.list()},update(){now+=3;},updateBackground(){now+=1;return Promise.resolve('same');}};
  const game={container:doc.getElementById('game'),worldTerrain:new Terrain(),fog:new Fog(),running:false,
    startGameLoop(){this.running=true;this.loop=function(){this.update();this.render();};},stopGameLoop(){this.running=false;},
    update(){followBegin();this.fog.revealAt();},render(){this.worldTerrain.requestTile();this.worldTerrain.generate();},
    saveGame(){slots.get();win.localStorage.setItem('game_studio_ironsquad_save_slots_v1','kept');},updateSpawns(){now+=1;},revealFogAroundPlayer(){this.fog.forceRevealAt();},renderMinimap(){now+=3;},openWorldMap(){this.worldTerrain.drawOverview();}};
  const original={generate:Terrain.prototype.generate,requestTile:Terrain.prototype.requestTile,save:game.saveGame,list:slots.list,storage:win.Storage.prototype.setItem,loop:game.startGameLoop};
  const api=installPerfDiagnostics(game,{WorldTerrain:Terrain,FogGrid:Fog,saveSlots:slots,
    profileSaveCompletions:wrap=>{savedWrap=wrap;savedCompletion=wrap(()=>{now+=7;});return ()=>savedWrap=null;},
    profileFollowerRecovery:wrap=>{followWrap=wrap;followBegin=wrap('追従.開始',()=>{now+=2;});return ()=>followWrap=null;}
  },{window:win,document:doc,now:()=>now,PerformanceObserver:false});
  try{
    assert.ok(doc.querySelector('.perf-diagnostics'));assert.notEqual(game.saveGame,original.save);assert.notEqual(win.Storage.prototype.setItem,original.storage);
    game.startGameLoop();game.loop(0);const firstWorker=game.worldTerrain._terrainWorker;firstWorker.dispatch();game.saveGame();savedCompletion();game.updateSpawns();game.revealFogAroundPlayer();game.renderMinimap();game.openWorldMap();
    win.localStorage.getItem('game_studio_ironsquad_save_slots_v1');win.localStorage.setItem('other_game','untimed');
    now=300;game.loop(300);const record=api.snapshot().records[0],labels=record.timing.map(t=>t.name);
    for(const label of ['地形.generate','地形.takeSurface','地形受信','枠.get','枠.list','LS書く','LS読む','フォグ公開','ミニマップ','地図再描画','保存完了','追従.開始','敵出現'])assert.ok(labels.includes(label),label);
    assert.equal(win.localStorage.getItem('game_studio_ironsquad_save_slots_v1'),'kept');assert.equal(win.localStorage.getItem('other_game'),'untimed');assert.equal(record.timing.find(t=>t.name==='LS書く').calls,1);
    game.worldTerrain._terrainWorker=null;game.worldTerrain.requestTile();game.worldTerrain._terrainWorker.dispatch();now=600;game.loop(600);assert.ok(api.snapshot().records[1].timing.some(t=>t.name==='地形受信'));
    api.refresh();assert.equal(doc.querySelectorAll('.perf-records li').length,2);doc.querySelector('[data-perf-freeze]').click();const frozen=api.json();
    now=900;game.loop(900);api.refresh();assert.equal(api.json(),frozen,'screen and copied data remain fixed together');doc.querySelector('[data-perf-freeze]').click();assert.notEqual(api.json(),frozen);
    game.stopGameLoop();now=60_000;game.startGameLoop();game.loop(60_000);assert.equal(api.snapshot().records.length,3,'loop restart excludes idle gap');
    doc.dispatchEvent(new win.Event('visibilitychange'));now+=60_000;game.loop(120_000);assert.equal(api.snapshot().records.length,3,'visibility gap is excluded');
    assert.equal(api.snapshot().longTaskSupported,false);
  }finally{api.dispose();api.dispose();}
  assert.equal(game.saveGame,original.save);assert.equal(game.startGameLoop,original.loop);assert.equal(Terrain.prototype.generate,original.generate);assert.equal(Terrain.prototype.requestTile,original.requestTile);assert.equal(slots.list,original.list);assert.equal(win.Storage.prototype.setItem,original.storage);assert.equal(savedWrap,null);assert.equal(followWrap,null);assert.equal(doc.querySelector('.perf-diagnostics'),null);dom.window.close();
});

test('longtask observer is optional, reports entries and disconnects on disposal',()=>{
  const dom=new JSDOM('<div id="game"><div class="iron-squad"></div></div>',{url:'http://localhost/?perf=1'});let received,disconnected=false,observed;
  class Observer{static supportedEntryTypes=['longtask'];constructor(callback){received=callback;}observe(value){observed=value;}disconnect(){disconnected=true;}}
  class Empty{}const g={container:dom.window.document.getElementById('game')};
  const api=installPerfDiagnostics(g,{WorldTerrain:Empty,FogGrid:Empty,saveSlots:{}},{document:dom.window.document,window:dom.window,PerformanceObserver:Observer});
  assert.deepEqual(observed,{type:'longtask',buffered:false});received({getEntries:()=>[{startTime:100,duration:250}]});assert.equal(api.snapshot().longTasks[0].ms,250);assert.equal(api.snapshot().longTaskSupported,true);
  api.dispose();assert.equal(disconnected,true);dom.window.close();
});
