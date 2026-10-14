import assert from 'node:assert/strict';
import {test} from 'node:test';
import {encodeSaveList,unpackSave,SAVE_ENCODING} from '../js/save-codec.js';
const memory=new Map(),key='game_studio_ironsquad_save_slots_v1';
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
let controlled;
globalThis.Worker=class{
  constructor(){controlled=this;this.queue=[];}
  postMessage(message){this.queue.push(structuredClone(message));}
  terminate(){}
  finish(index=0){
    const message=this.queue.splice(index,1)[0],stored=JSON.parse(message.base);
    const slots=stored?.encoding===SAVE_ENCODING?JSON.parse(unpackSave(stored)):stored;
    Object.assign(slots.find(s=>s.id===message.slotId),message.values,{savedAt:message.savedAt});
    const json=JSON.stringify(slots);this.onmessage({data:{id:message.id,raw:encodeSaveList(json),json}});
  }
};
const {saveSlots}=await import('../js/save-slots.js');

test('background save freezes its snapshot, commits atomically and retains checkpoint/other slots',async()=>{
  const a=saveSlots.create('A',{data:{gold:1},checkpoint:{data:{gold:7}}}),b=saveSlots.create('B',{data:{gold:99}});
  const value={data:{gold:2}},before=localStorage.getItem(key),pending=saveSlots.updateBackground(a.id,value);
  assert.equal(localStorage.getItem(key),before,'queueing performs no storage write');value.data.gold=1000;
  controlled.finish();assert.deepEqual(await pending,{status:'saved'});
  assert.equal(saveSlots.get(a.id).data.gold,2);assert.equal(saveSlots.get(a.id).checkpoint.data.gold,7);assert.equal(saveSlots.get(b.id).data.gold,99);
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
  controlled.finish(1);controlled.finish();assert.deepEqual(await first,{status:'superseded'});assert.deepEqual(await second,{status:'saved'});assert.equal(saveSlots.get(a.id).data.gold,3);
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
