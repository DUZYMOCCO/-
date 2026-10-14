import assert from 'node:assert/strict';
import {test} from 'node:test';
import {packSave,unpackSave,encodeSaveList,SAVE_ENCODING} from '../js/save-codec.js';

test('save compression round-trips JSON, Japanese, emoji, escapes and dictionary resets',()=>{
  let seed=1793;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const long=Array.from({length:180_000},()=>String.fromCharCode(32+(random()>>>16)%90)).join('');
  for(const value of ['',{name:'衛生術師🧿',text:'改行\n引用"と\\',items:[null,true,false,0,-1,1.25]},{random:long}]){
    const json=JSON.stringify(value),packed=packSave(json);
    assert.equal(unpackSave(packed),json);assert.deepEqual(JSON.parse(unpackSave(packed)),value);
  }
  const repetitive=JSON.stringify(Array.from({length:500},(_,id)=>({id,name:'魔法使い',level:40,mana:100,personnelLocked:true})));
  assert.ok(JSON.stringify(packSave(repetitive)).length<repetitive.length*.5);
});

test('truncated or altered saves fail integrity checks instead of being treated as empty',()=>{
  const packed=packSave(JSON.stringify({name:'保持する記録',gold:403855}));
  assert.throws(()=>unpackSave({...packed,data:packed.data.slice(0,-4)}));
  assert.throws(()=>unpackSave({...packed,checksum:packed.checksum^1}));
  assert.throws(()=>unpackSave({...packed,chars:packed.chars+1}));
});

test('encoding verifies compressed storage and refuses to overwrite existing slots on decoder failure',async()=>{
  const json=JSON.stringify([{name:'隊長🛡️',text:'同じ日本語と装備'.repeat(20_000)}]);
  const raw=encodeSaveList(json);assert.equal(JSON.parse(raw).encoding,SAVE_ENCODING);assert.equal(unpackSave(JSON.parse(raw)),json);
  assert.equal(encodeSaveList('[{"id":"small"}]'),'[{"id":"small"}]');
  const memory=new Map(),key='game_studio_ironsquad_save_slots_v1';
  globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
  const {saveSlots}=await import('../js/save-slots.js');
  const a=saveSlots.create('保持するA',{data:{gold:123}}),b=saveSlots.create('保持するB',{data:{gold:456}}),before=localStorage.getItem(key);
  const Decoder=globalThis.TextDecoder,warn=console.warn;console.warn=()=>{};
  try{
    for(const mode of ['mismatch','exception']){
      globalThis.TextDecoder=class{decode(bytes){if(mode==='exception')throw new Error('decoder fault');return new Decoder('utf-8',{fatal:true}).decode(bytes)+'x';}};
      assert.throws(()=>encodeSaveList(json));
      assert.equal(saveSlots.update(a.id,{data:{text:'保存前の検証'.repeat(30_000)}}),false);
      assert.equal(localStorage.getItem(key),before);
    }
  }finally{globalThis.TextDecoder=Decoder;console.warn=warn;}
  assert.equal(saveSlots.get(a.id).data.gold,123);assert.equal(saveSlots.get(b.id).data.gold,456);
});
