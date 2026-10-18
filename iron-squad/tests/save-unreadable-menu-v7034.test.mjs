import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
// v7.0.34 UI: an unreadable save store shows "読み込めませんでした" + a retry button; a genuine first run keeps the old text.
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
const memory=new Map(),writes=[];let blind=false;
const mock={getItem:k=>blind?null:(memory.get(k)??null),setItem:(k,v)=>{writes.push(k);memory.set(k,String(v));},removeItem:k=>{memory.delete(k);}};
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:mock});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js?v=311');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:noop});
g.setupUI();
const text=()=>document.querySelector('#save-slot-list').textContent;
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// Genuine first run: the old wording, no retry button.
g.showSaveMenu();
assert.match(text(),/まだ遠征の記録はありません/);assert.equal(document.querySelector('#btn-save-reload'),null);

// Two saves exist, then the store reads as missing (iOS launch glitch).
saveSlots.create('A');saveSlots.create('B');const before=memory.get('game_studio_ironsquad_save_slots_v1');
g.showSaveMenu();assert.equal(document.querySelectorAll('.save-card').length,2);
writes.length=0;blind=true;
g.showSaveMenu();
assert.match(text(),/保存を確認しています/,'retrying first');
await wait(1300);
assert.match(text(),/読み込めませんでした/);assert.ok(document.querySelector('#btn-save-reload'));
assert.doesNotMatch(text(),/まだ遠征の記録はありません/);assert.equal(document.querySelectorAll('.save-card').length,0);

// New game is refused with the same retry notice, and nothing is written.
document.querySelector('#new-expedition-form').dispatchEvent(new window.Event('submit',{cancelable:true,bubbles:true}));
assert.match(text(),/新しい遠征の作成を中止しました/);assert.ok(document.querySelector('#btn-save-reload'));
assert.equal(writes.length,0,'nothing written while unreadable');

// Reload button re-reads and the saves are back.
blind=false;document.querySelector('#btn-save-reload').click();await wait(50);
assert.equal(document.querySelectorAll('.save-card').length,2);assert.equal(memory.get('game_studio_ironsquad_save_slots_v1'),before);
dom.window.close();console.log('PASS: unreadable save store shows retry UI, refuses new game, recovers on retry; first run unchanged');
