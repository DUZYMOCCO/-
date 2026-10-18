import assert from 'node:assert/strict';
import {test} from 'node:test';
// v7.0.34: iOS home-screen apps can return null from localStorage.getItem right after launch. The save list must read as
// "unreadable" (not empty), writes must be refused, and a retry must recover. A genuine first run must still start.
const memory=new Map(),writes=[];let blindUntil=0;
globalThis.localStorage={
  getItem:k=>Date.now()<blindUntil?null:(memory.get(k)??null),
  setItem:(k,v)=>{writes.push(k);memory.set(k,String(v));},
  removeItem:k=>{memory.delete(k);}
};
const {saveSlots}=await import('../js/save-slots.js?v=311');
const KEY='game_studio_ironsquad_save_slots_v1',MARK='game_studio_ironsquad_save_seen_v1';
const blind=ms=>{blindUntil=Date.now()+ms;},sighted=()=>{blindUntil=0;};

test('a genuine first run is untouched: empty probe, no writes on read, create works and leaves the mark',()=>{
  assert.equal(saveSlots.probe(),'empty');
  assert.deepEqual(saveSlots.list(),[]);assert.equal(writes.length,0);
  const slot=saveSlots.create('FIRST');
  assert.deepEqual(saveSlots.list().map(s=>s.id),[slot.id]);
  assert.equal(memory.get(MARK),'1');assert.equal(saveSlots.probe(),'ok');
});

test('unreadable store: list is empty with zero writes, create/delete/update/background are refused, data stays intact',async()=>{
  const second=saveSlots.create('SECOND');const before=memory.get(KEY);assert.ok(before);
  const ids=saveSlots.list().map(s=>s.id);assert.equal(ids.length,2);
  writes.length=0;blind(60_000);
  assert.equal(saveSlots.probe(),'unreadable');
  assert.deepEqual(saveSlots.list(),[]);assert.equal(writes.length,0,'list writes nothing');
  assert.throws(()=>saveSlots.create('OVERWRITE'),e=>e.code==='SAVE_UNREADABLE'&&/中止/.test(e.message));
  assert.throws(()=>saveSlots.delete(second.id),e=>e.code==='SAVE_UNREADABLE');
  assert.equal(saveSlots.update(second.id,{name:'x'}),false);
  assert.equal((await saveSlots.updateBackground(second.id,{data:{gold:1}})).status,'failed');
  assert.equal(saveSlots.lastWriteError?.code,'SAVE_UNREADABLE');
  assert.equal(writes.length,0,'no write of any kind while unreadable');
  sighted();
  assert.equal(memory.get(KEY),before,'stored save list is byte-identical');
  assert.deepEqual(saveSlots.list().map(s=>s.id),ids,'recovers as soon as the read works');
  assert.equal(saveSlots.probe(),'ok');
});

test('settle retries for about a second and returns once the read recovers',async()=>{
  blind(300);const started=Date.now();
  assert.equal(saveSlots.probe(),'unreadable');
  assert.equal(await saveSlots.settle(),'ok');
  const took=Date.now()-started;assert.ok(took>=150&&took<1100,`recovered after ${took} ms`);
  // A read that never recovers gives up after roughly one second and still reports unreadable.
  blind(60_000);const t0=Date.now();
  assert.equal(await saveSlots.settle(),'unreadable');
  const waited=Date.now()-t0;assert.ok(waited>=800&&waited<1400,`gave up after ${waited} ms`);
  sighted();
});

test('a save list that predates the mark gets marked on its first successful read, then is protected',async()=>{
  memory.delete(MARK);
  // simulate a fresh page load (new module instance, nothing cached): only the persisted keys remain
  const fresh=(await import('../js/save-slots.js?v=311-fresh')).saveSlots;
  assert.equal(fresh.probe(),'ok');
  assert.equal(fresh.list().length,2);assert.equal(memory.get(MARK),'1','mark added when saves are read');
  blind(60_000);assert.equal(fresh.probe(),'unreadable');
  assert.throws(()=>fresh.create('X'),e=>e.code==='SAVE_UNREADABLE');sighted();
});

test('the explicit escape hatch lets the player start over when the saves are really gone',()=>{
  memory.delete(KEY);
  assert.equal(saveSlots.probe(),'unreadable');
  assert.throws(()=>saveSlots.create('BLOCKED'),e=>e.code==='SAVE_UNREADABLE');
  saveSlots.forgetSaveMark();
  assert.equal(saveSlots.probe(),'empty');
  const slot=saveSlots.create('AGAIN');assert.deepEqual(saveSlots.list().map(s=>s.id),[slot.id]);
});

test('deleting the last save leaves an existing (empty) list, not an unreadable store',()=>{
  const [only]=saveSlots.list();assert.equal(saveSlots.delete(only.id),true);
  assert.equal(saveSlots.probe(),'ok');assert.deepEqual(saveSlots.list(),[]);
  const next=saveSlots.create('AFTER EMPTY');assert.ok(next.id);
});
