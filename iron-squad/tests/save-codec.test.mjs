import assert from 'node:assert/strict';
import {test} from 'node:test';
import {packSave,unpackSave} from '../js/save-codec.js';

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
