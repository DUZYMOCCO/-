import assert from 'node:assert/strict';
import {test} from 'node:test';
import {encodeSaveList,unpackSave,SAVE_ENCODING} from '../js/save-codec.js';
const memory=new Map(),key='game_studio_ironsquad_save_slots_v1';
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
let controlled;
globalThis.Worker=class{
  constructor(){controlled=this;this.queue=[];this.sent=0;this.peak=0;}
  postMessage(message){controlled=this;this.queue.push(structuredClone(message));this.sent++;this.peak=Math.max(this.peak,this.queue.length);}
  terminate(){this.queue=[];this.terminated=true;}
  fail(index=0){const message=this.queue.splice(index,1)[0];this.onmessage({data:{id:message.id,error:'worker codec failure'}});}
  finish(index=0){
    const message=this.queue.splice(index,1)[0],stored=JSON.parse(message.base);
    const slots=stored?.encoding===SAVE_ENCODING?JSON.parse(unpackSave(stored)):stored;
    Object.assign(slots.find(s=>s.id===message.slotId),message.values,{savedAt:message.savedAt});
    const json=JSON.stringify(slots);this.onmessage({data:{id:message.id,raw:encodeSaveList(json),json}});
  }
};
const {saveSlots}=await import('../js/save-slots.js');

test('50 background requests retain one running plus one waiting and save the frozen final state',async()=>{
  const {saveSlots:slots}=await import('../js/save-slots.js?event-burst');
  const a=slots.create('burst',{data:{gold:100},checkpoint:{data:{gold:7}}}),b=slots.create('untouched',{data:{gold:99}});
  for(const reverse of [false,true]){
    const pending=[];
    for(let i=0;i<50;i++)pending.push(slots.updateBackground(a.id,{data:{gold:100-i,upgrade:i,restTimer:Math.max(0,8-i),restReport:{count:i,spent:i}},state:'active'}));
    assert.equal(controlled.queue.length,1);const sent=controlled.sent;assert.equal((await Promise.all(pending.slice(1,-1))).every(r=>r.status==='superseded'),true);
    while(controlled.queue.length)controlled.finish(reverse?controlled.queue.length-1:0);
    assert.deepEqual(await Promise.all(pending),[...Array.from({length:49},()=>({status:'superseded'})),{status:'saved'}]);
    assert.deepEqual(slots.get(a.id).data,{gold:51,upgrade:49,restTimer:0,restReport:{count:49,spent:49}});
    assert.equal(slots.get(a.id).checkpoint.data.gold,7);assert.equal(slots.get(b.id).data.gold,99);assert.equal(controlled.sent-sent,1,'only the newest waiting job is dispatched');assert.equal(controlled.peak,1);
  }
});

test('background save freezes its snapshot, commits atomically and retains checkpoint/other slots',async()=>{
  const a=saveSlots.create('A',{data:{gold:1},checkpoint:{data:{gold:7}}}),b=saveSlots.create('B',{data:{gold:99}});
  const value={data:{gold:2}},before=localStorage.getItem(key),pending=saveSlots.updateBackground(a.id,value);
  assert.equal(localStorage.getItem(key),before,'queueing performs no storage write');value.data.gold=1000;
  controlled.finish();assert.deepEqual(await pending,{status:'saved'});
  assert.equal(saveSlots.get(a.id).data.gold,2);assert.equal(saveSlots.get(a.id).checkpoint.data.gold,7);assert.equal(saveSlots.get(b.id).data.gold,99);
});

test('waiting snapshots are frozen, share the global bound, and manual/external writes cancel them before dispatch',async()=>{
  const {saveSlots:slots}=await import('../js/save-slots.js?waiting-races');
  const a=slots.create('waiting A',{data:{gold:1}}),b=slots.create('waiting B',{data:{gold:2}});
  const active=slots.updateBackground(a.id,{data:{gold:3}}),replaced=slots.updateBackground(a.id,{data:{gold:4}}),values={data:{gold:5}};
  const newest=slots.updateBackground(b.id,values);values.data.gold=999;
  assert.deepEqual(await replaced,{status:'superseded'});assert.equal(controlled.queue.length,1);
  controlled.finish();assert.equal(controlled.queue.length,1);controlled.finish();
  assert.deepEqual(await active,{status:'superseded'});assert.deepEqual(await newest,{status:'saved'});assert.equal(slots.get(a.id).data.gold,1);assert.equal(slots.get(b.id).data.gold,5);
  for(const external of [false,true]){
    const running=slots.updateBackground(a.id,{data:{gold:6}}),waiting=slots.updateBackground(a.id,{data:{gold:7}}),sent=controlled.sent;
    if(external){const list=slots.list();list.find(s=>s.id===a.id).data.gold=9;localStorage.setItem(key,JSON.stringify(list));}
    else slots.update(a.id,{data:{gold:8}}); // hidden/back/save-screen use this synchronous path.
    controlled.finish();assert.deepEqual(await running,{status:'superseded'});assert.deepEqual(await waiting,{status:'superseded'});assert.equal(controlled.sent,sent);assert.equal(slots.get(a.id).data.gold,external?9:8);
  }
});

test('fatal worker failure settles stale running work and synchronously saves the latest waiting snapshot',async()=>{
  const {saveSlots:slots}=await import('../js/save-slots.js?waiting-worker-crash');
  const a=slots.create('crash',{data:{gold:1}}),running=slots.updateBackground(a.id,{data:{gold:2}}),waiting=slots.updateBackground(a.id,{data:{gold:3}});
  controlled.onerror();assert.deepEqual(await running,{status:'superseded'});assert.deepEqual(await waiting,{status:'saved'});assert.equal(slots.get(a.id).data.gold,3);assert.equal(controlled.queue.length,0);
});

test('manual save/new slot/delete/external writes invalidate older background work',async()=>{
  const a=saveSlots.create('race',{data:{gold:1}});
  let pending=saveSlots.updateBackground(a.id,{data:{gold:2}});saveSlots.update(a.id,{data:{gold:3}});controlled.finish();
  assert.deepEqual(await pending,{status:'superseded'});assert.equal(saveSlots.get(a.id).data.gold,3);
  pending=saveSlots.updateBackground(a.id,{data:{gold:4}});const other=saveSlots.create('new',{data:{gold:5}});controlled.finish();
  assert.deepEqual(await pending,{status:'superseded'});assert.equal(saveSlots.get(other.id).data.gold,5);
  pending=saveSlots.updateBackground(a.id,{data:{gold:6}});saveSlots.delete(a.id);controlled.finish();
  assert.deepEqual(await pending,{status:'superseded'});assert.equal(saveSlots.get(a.id),undefined);
  pending=saveSlots.updateBackground(other.id,{data:{gold:7}});
  const slots=saveSlots.list();slots.find(s=>s.id===other.id).data.gold=8;localStorage.setItem(key,JSON.stringify(slots));controlled.finish();
  assert.deepEqual(await pending,{status:'superseded'});assert.equal(saveSlots.get(other.id).data.gold,8);
});

test('only the latest background request commits; quota rejection retains exact prior bytes',async()=>{
  const a=saveSlots.create('latest',{data:{gold:1}});
  const first=saveSlots.updateBackground(a.id,{data:{gold:2}}),second=saveSlots.updateBackground(a.id,{data:{gold:3}});
  controlled.finish();controlled.finish();assert.deepEqual(await first,{status:'superseded'});assert.deepEqual(await second,{status:'saved'});assert.equal(saveSlots.get(a.id).data.gold,3);
  const before=localStorage.getItem(key),pending=saveSlots.updateBackground(a.id,{data:{gold:4}}),set=localStorage.setItem,warn=console.warn;
  localStorage.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};console.warn=()=>{};
  try{controlled.finish();assert.deepEqual(await pending,{status:'failed'});}finally{localStorage.setItem=set;console.warn=warn;}
  assert.equal(localStorage.getItem(key),before);
});

test('worker failure preserves the current save via synchronous compatibility fallback',async()=>{
  const a=saveSlots.create('fallback',{data:{gold:1}}),pending=saveSlots.updateBackground(a.id,{data:{gold:2}});
  controlled.onerror();assert.deepEqual(await pending,{status:'saved'});assert.equal(saveSlots.get(a.id).data.gold,2);
  assert.deepEqual(await saveSlots.updateBackground(a.id,{data:{gold:3}}),{status:'saved'});
});

test('worker error messages retry only current frozen snapshots, reset after success, and disable after two consecutive errors',async()=>{
  const {saveSlots:slots}=await import('../js/save-slots.js?error-recovery');
  const a=slots.create('message recovery',{data:{gold:1},checkpoint:{data:{gold:7}}}),b=slots.create('other',{data:{gold:99}});
  const values={data:{gold:2}},pending=slots.updateBackground(a.id,values);values.data.gold=1000;controlled.fail();
  assert.deepEqual(await pending,{status:'saved'});assert.equal(slots.get(a.id).data.gold,2);assert.equal(slots.get(a.id).checkpoint.data.gold,7);assert.equal(slots.get(b.id).data.gold,99);
  const success=slots.updateBackground(a.id,{data:{gold:3}});controlled.finish();assert.deepEqual(await success,{status:'saved'});
  const stale=slots.updateBackground(a.id,{data:{gold:4}});slots.update(a.id,{data:{gold:5}});controlled.fail();assert.deepEqual(await stale,{status:'superseded'});assert.equal(slots.get(a.id).data.gold,5);
  const external=slots.updateBackground(a.id,{data:{gold:6}}),changed=slots.list();changed.find(s=>s.id===a.id).data.gold=8;localStorage.setItem(key,JSON.stringify(changed));const before=localStorage.getItem(key);controlled.fail();
  assert.deepEqual(await external,{status:'superseded'});assert.equal(localStorage.getItem(key),before);
  const older=slots.updateBackground(a.id,{data:{gold:9}}),latest=slots.updateBackground(a.id,{data:{gold:10}});controlled.fail();assert.deepEqual(await older,{status:'superseded'});controlled.fail();assert.deepEqual(await latest,{status:'saved'});
  const dormant=slots.updateBackground(a.id,{data:{gold:0}}),second=slots.updateBackground(a.id,{data:{gold:11}});assert.equal(controlled.queue.length,1,'only the running stale job was sent');controlled.fail();assert.deepEqual(await dormant,{status:'superseded'});controlled.fail();assert.deepEqual(await second,{status:'saved'});assert.deepEqual(await dormant,{status:'superseded'},'terminating the worker also settles old jobs that can no longer reply');assert.equal(controlled.terminated,true);
  const workerBefore=controlled;assert.deepEqual(await slots.updateBackground(a.id,{data:{gold:12}}),{status:'saved'});assert.equal(controlled,workerBefore);assert.equal(controlled.queue.length,0);assert.equal(slots.get(a.id).data.gold,12);
});

test('worker error followed by synchronous verification failure preserves all prior storage bytes',async()=>{
  const {saveSlots:slots}=await import('../js/save-slots.js?error-verification');
  const a=slots.create('safe fallback',{data:{gold:13}}),before=localStorage.getItem(key);
  const pending=slots.updateBackground(a.id,{data:{text:'再検証'.repeat(50_000)}}),Decoder=globalThis.TextDecoder,warn=console.warn;
  console.warn=()=>{};globalThis.TextDecoder=class{decode(){throw new Error('decoder failure');}};
  try{controlled.fail();assert.deepEqual(await pending,{status:'failed'});assert.equal(localStorage.getItem(key),before);}finally{globalThis.TextDecoder=Decoder;console.warn=warn;}
  assert.equal(slots.get(a.id).data.gold,13);
});
