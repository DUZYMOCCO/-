import assert from 'node:assert/strict';
import {createStallRecorder,describeRecord,MAX_RECORDS,GAME_VERSION} from '../js/games/iron-squad/stall-recorder.js';

const mem=new Map();
const goodStore={get:(k,d)=>mem.has(k)?mem.get(k):d,set:(k,v)=>{mem.set(k,JSON.parse(JSON.stringify(v)));return true;}};
const make=(extra={})=>createStallRecorder({storage:goodStore,clock:()=>'2026-10-10T00:00:00.000Z',getContext:()=>({player:{x:1,y:2},terrain:{tiles:3,rasterSize:512},enemies:4,allies:5}),...extra});

mem.clear();
// detection: normal frames, hitch (300-1000), stall (>=1000)
{
  const r=make();
  let t=1000;
  assert.equal(r.frame(t),null,'first frame only primes');
  for(let i=0;i<10;i++){t+=16;assert.equal(r.frame(t),null);}
  t+=450;assert.equal(r.frame(t),null);assert.equal(r.hitches,1,'450ms counts as a hitch');
  t+=999;assert.equal(r.frame(t),null);assert.equal(r.hitches,2);
  r.action('joystick',t-100);r.mark('セーブ中',t-50);
  t+=2500;
  const rec=r.frame(t,7);
  assert.ok(rec);assert.equal(rec.type,'stall');assert.equal(rec.gapMs,2500);assert.equal(rec.version,GAME_VERSION);
  assert.equal(rec.hitches300to1000,2);assert.equal(rec.enemies,4);assert.equal(rec.terrain.rasterSize,512);
  assert.equal(rec.activity,'セーブ中');
  assert.deepEqual(rec.lastActions.map(a=>a.type),['joystick']);
  assert.equal(r.records().length,1);
  assert.ok(describeRecord(rec).join('\n').includes('2.5秒'));
}
// exactly 1000ms is a stall
{const r=make();r.frame(100);assert.ok(r.frame(1100));}

mem.clear();
// hidden / pageshow / loop restart gaps are ignored
{
  const r=make();let t=100;r.frame(t);t+=16;r.frame(t);
  r.reset();                     // visibilitychange / pagehide
  t+=60000;assert.equal(r.frame(t),null,'first frame after hidden only primes');
  t+=16;assert.equal(r.frame(t),null);
  assert.equal(r.records().length,0);assert.equal(r.hitches,0);
  r.reset();t+=5000;r.frame(t);t+=16;r.frame(t);assert.equal(r.records().length,0,'paused/stopped loop ignored');
  // listeners wired by attach() reset on visibilitychange
  const handlers={};const doc={addEventListener:(n,f)=>handlers['d'+n]=f,removeEventListener(){}};
  const win={addEventListener:(n,f)=>handlers['w'+n]=f,removeEventListener(){}};
  r.attach(win,doc);
  t+=16;r.frame(t);handlers.dvisibilitychange();t+=30000;assert.equal(r.frame(t),null);
  handlers.wpagehide();t+=30000;assert.equal(r.frame(t),null);
  handlers.wpageshow();t+=30000;assert.equal(r.frame(t),null);
  assert.equal(r.records().length,0);
  // errors are logged in the same list
  handlers.werror({error:new Error('boom')});handlers.wunhandledrejection({reason:'nope'});
  const [e1,e2]=r.records();assert.equal(e1.type,'error');assert.equal(e1.message,'boom');assert.ok(e1.stack.length>0);assert.equal(e2.kind,'unhandledrejection');assert.equal(e2.message,'nope');
}
mem.clear();
// action ring keeps only the last 5, newest first
{
  const r=make();for(let i=0;i<8;i++)r.action('a'+i,i*10);
  r.frame(100);const rec=r.frame(3000);
  assert.deepEqual(rec.lastActions.map(a=>a.type),['a7','a6','a5','a4','a3']);
  assert.equal(rec.lastActions[0].msBefore,100-70);
}
// record limit and persistence
{
  mem.clear();const r=make();let t=10;r.frame(t);
  for(let i=0;i<MAX_RECORDS+10;i++){t+=1500;r.frame(t);}
  assert.equal(r.records().length,MAX_RECORDS);
  assert.equal(mem.get('iron_squad_stall_log').length,MAX_RECORDS,'persisted');
  const again=make();assert.equal(again.records().length,MAX_RECORDS,'reloaded from storage');
  again.clear();assert.equal(mem.get('iron_squad_stall_log').length,0);assert.equal(again.records().length,0);
}
// storage failure never throws
{
  const bad={get(){throw new Error('denied');},set(){throw new Error('quota');}};
  const r=make({storage:bad});r.frame(10);assert.ok(r.frame(2000));assert.equal(r.records().length,1);r.clear();
  const none=make({storage:null});none.frame(10);assert.ok(none.frame(2000));
  const badCtx=make({getContext(){throw new Error('x');}});badCtx.frame(10);assert.ok(badCtx.frame(2000),'context failure still records');
}
console.log('stall-recorder tests passed');
