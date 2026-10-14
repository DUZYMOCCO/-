import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:noop});
g.setupUI();g.activeSlotId=saveSlots.create('保持する既存セーブ').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const key='game_studio_ironsquad_save_slots_v1',set=window.Storage.prototype.setItem,warn=console.warn,id=g.activeSlotId;
const oldData=structuredClone(g.saveGame({persist:false})),oldSlot={...saveSlots.get(id),data:oldData,checkpoint:{place:'本陣',savedAt:1,data:oldData}};
// A single legacy slot with a large but valid inventory reproduces both failing choices.
localStorage.setItem(key,JSON.stringify([oldSlot]));
const gear=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:'sword',tier:20,merchant:true,random:()=>.5});
g.inventory=Array.from({length:2500},(_,i)=>({...structuredClone(gear),id:`kept-equipment-${i}`}));g.phase=50;g.gold=403855;
const snapshot=g.saveGame({persist:false}),pending={...oldSlot,data:snapshot,checkpoint:{place:'本陣',savedAt:2,data:snapshot}};
assert.ok(JSON.stringify([pending]).length*2>5*1024*1024,'one-slot checkpoint would exceed the 5MiB raw storage limit');
let budget=5*1024*1024;console.warn=noop;
window.Storage.prototype.setItem=function(k,v){
  let bytes=2*(String(k).length+String(v).length);
  for(let i=0;i<this.length;i++){const other=this.key(i);if(other!==k)bytes+=2*(other.length+this.getItem(other).length);}
  if(bytes>budget)throw new window.DOMException('Capacity fixture','QuotaExceededError');return set.call(this,k,v);
};
try{
  assert.equal(g.saveCheckpoint(),true);assert.equal(saveSlots.list().length,1);
  const overwrite=structuredClone(saveSlots.get(id));
  assert.equal(overwrite.data.inventory.length,2500);assert.equal(overwrite.checkpoint.data.inventory.length,2500);
  assert.deepEqual(overwrite.data.inventory,snapshot.inventory);assert.equal(overwrite.data.gold,403855);
  const savedBytes=localStorage.getItem(key).length*2;
  assert.ok(savedBytes<JSON.stringify([pending]).length,'compression significantly reduces storage');
  assert.equal(g.saveCheckpoint({newSlot:true}),true);const newId=g.activeSlotId;
  assert.notEqual(newId,id);assert.deepEqual(saveSlots.get(id),overwrite);assert.equal(saveSlots.list().length,2);
  g.gold=99;assert.ok(g.saveGame());assert.equal(saveSlots.get(newId).data.gold,99);assert.equal(saveSlots.get(newId).checkpoint.data.gold,403855);
  assert.deepEqual(saveSlots.get(id),overwrite);
  assert.equal(g.loadCheckpoint(),true);assert.equal(g.gold,403855);assert.equal(g.inventory.length,2500);
  // If even the compressed write is denied, keep all bytes and the active ID intact.
  const before=localStorage.getItem(key),active=g.activeSlotId;budget=0;
  for(const newSlot of [false,true]){
    assert.equal(g.saveCheckpoint({newSlot}),false);assert.equal(g.activeSlotId,active);assert.equal(localStorage.getItem(key),before);
    assert.equal(document.querySelector('.checkpoint-notice').textContent,'セーブに失敗しました（保存容量不足）');
  }
  budget=5*1024*1024;
  // Corrupt data must never trigger the legacy-cleanup path and erase the list.
  const packed=JSON.parse(before);packed.checksum^=1;const corrupted=JSON.stringify(packed);set.call(localStorage,key,corrupted);
  assert.throws(()=>saveSlots.list());assert.equal(localStorage.getItem(key),corrupted);
  set.call(localStorage,key,before);
  console.log(JSON.stringify({singleSlotRawBytes:JSON.stringify([pending]).length*2,compressedBytes:savedBytes,slotsAfter:saveSlots.list().length}));
}finally{window.Storage.prototype.setItem=set;console.warn=warn;dom.window.close();}
console.log('PASS: single large legacy save, 5MiB quota, lossless overwrite/new/autosave/checkpoint reload, intact equipment/other slot, atomic denied writes and corrupt-save preservation');
