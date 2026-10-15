import assert from 'node:assert/strict';
import {test} from 'node:test';
const memory=new Map(),writes=[];
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>{writes.push(k);memory.set(k,String(v));},removeItem:k=>memory.delete(k)};
const {saveSlots,requestPersistentSaves}=await import('../js/save-slots.js?v=285');
const KEY='game_studio_ironsquad_save_slots_v1',VERSION_KEY='game_studio_ironsquad_rules_version';

test('an empty storage read never overwrites the save list; real saves survive a missing rules version',()=>{
  // Fresh install / empty read: returns nothing and writes nothing (even with the rules version already set).
  assert.deepEqual(saveSlots.list(),[]);assert.equal(writes.length,0,'no write on a fresh/empty read');
  memory.set(VERSION_KEY,'5');assert.deepEqual(saveSlots.list(),[]);assert.equal(writes.length,0,'no empty list written over a missing key');
  assert.equal(memory.has(KEY),false);
  // Creating the first expedition still works and later reads return it.
  memory.delete(VERSION_KEY);
  const slot=saveSlots.create('GUARD TEST');
  assert.deepEqual(saveSlots.list().map(s=>s.id),[slot.id]);
  // A storage read where the rules-version key came back empty keeps current-rules saves.
  memory.delete(VERSION_KEY);
  assert.deepEqual(saveSlots.list().map(s=>s.id),[slot.id]);assert.equal(memory.get(VERSION_KEY),'5');
  console.log('PASS: empty reads never write an empty save list; saves survive a missing rules-version key');
});

test('persistent storage is requested once and stays silent without the API',async()=>{
  let asked=0;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{persisted:async()=>false,persist:async()=>{asked++;return true;}}}});
  requestPersistentSaves();await new Promise(r=>setTimeout(r,0));assert.equal(asked,1);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{persisted:async()=>true,persist:async()=>{asked++;return true;}}}});
  requestPersistentSaves();await new Promise(r=>setTimeout(r,0));assert.equal(asked,1,'already persistent: no second request');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
  assert.doesNotThrow(()=>requestPersistentSaves());
});
