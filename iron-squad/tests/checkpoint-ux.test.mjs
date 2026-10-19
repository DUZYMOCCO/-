import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{SAVE_NOTICE_MS}=await import('../js/checkpoint-ui.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:noop});
g.setupUI();g.activeSlotId=saveSlots.create('SAVE UX TEST ONLY').id;g.startFreshGame(false);g.career.status='enlisted';g.gold=123;
const oldId=g.activeSlotId;assert.equal(g.saveCheckpoint(),true);
const popup=()=>document.getElementById('merchant-shop-popup'),choice=kind=>document.querySelector(`[data-checkpoint-choice="${kind}"]`),saveButton=()=>popup().querySelector('[data-supply="save"]'),loadButton=()=>popup().querySelector('[data-supply="load"]');
const m=g.merchants[0];g.player.x=m.x;g.player.y=m.y;g.openStrategyModal(true);g.openMerchantShop(m);popup().querySelector('[data-merchant-section="save"]').click();
// Use a deterministic UI clock to check expiry and the rapid-tap cooldown without sleeping.
let timers=[];window.setTimeout=(callback,ms)=>{const id={callback,ms};timers.push(id);return id;};window.clearTimeout=id=>{timers=timers.filter(t=>t!==id);};
const advance=ms=>{const ready=timers.filter(t=>t.ms<=ms);timers=timers.filter(t=>t.ms>ms);for(const t of ready)t.callback();};
const notice=()=>document.querySelector('.checkpoint-notice'),dialog=()=>document.querySelector('#checkpoint-confirm');
const before=structuredClone(saveSlots.get(oldId)),beforeGold=g.gold,beforeXY=[g.player.x,g.player.y];
saveButton().click();saveButton().click();assert.equal(document.querySelectorAll('#checkpoint-confirm').length,1);assert.deepEqual(saveSlots.get(oldId),before);
assert.deepEqual([...dialog().querySelectorAll('button')].map(b=>b.textContent),['既存のセーブデータに上書き','新しいセーブデータとして保存','キャンセル']);
assert.equal(document.activeElement,choice('cancel'));assert.equal(popup().inert,true);assert.equal(g.inBattle,false);assert.equal(dialog().getAttribute('aria-modal'),'true');
choice('cancel').click();assert.equal(dialog(),null);assert.equal(popup().inert,false);assert.equal(document.activeElement,saveButton());assert.deepEqual(saveSlots.get(oldId),before);
saveButton().click();dialog().dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(dialog(),null);assert.deepEqual(saveSlots.get(oldId),before);
// Overwrite is one storage write; the active merchant record updates immediately.
g.gold=222;const originalSet=window.Storage.prototype.setItem;let writes=0;
window.Storage.prototype.setItem=function(...args){writes++;return originalSet.apply(this,args);};
saveButton().click();const overwrite=choice('overwrite');overwrite.click();overwrite.click();window.Storage.prototype.setItem=originalSet;
assert.equal(writes,1);assert.equal(g.activeSlotId,oldId);assert.equal(saveSlots.list().length,1);assert.equal(saveSlots.get(oldId).data.gold,222);assert.equal(saveSlots.get(oldId).checkpoint.data.gold,222);
assert.equal(notice().textContent,'セーブしました');assert.equal(notice().getAttribute('role'),'status');assert.equal(SAVE_NOTICE_MS,1800);assert.ok(timers.some(t=>t.ms===1800));
const cp=saveSlots.get(oldId).checkpoint;assert.ok(popup().querySelector('.checkpoint-summary').textContent.includes(new Date(cp.savedAt).toLocaleString('ja-JP')));assert.equal(document.activeElement,saveButton());
saveButton().click();assert.equal(dialog(),null,'second tap cannot reopen another operation');advance(450);
advance(1800);assert.equal(notice(),null,'notice disappears even though the battle is paused');
// New save atomically creates a fully populated slot and leaves the old slot untouched.
const originalSlot=structuredClone(saveSlots.get(oldId));g.gold=333;saveButton().click();choice('new').click();const newId=g.activeSlotId;
assert.notEqual(newId,oldId);assert.equal(saveSlots.list().length,2);assert.deepEqual(saveSlots.get(oldId),originalSlot);assert.equal(saveSlots.get(newId).data.gold,333);assert.equal(saveSlots.get(newId).checkpoint.data.gold,333);assert.equal(saveSlots.get(newId).rulesVersion,originalSlot.rulesVersion);
assert.equal(popup().dataset.section,'save');advance(450);g.gold=444;g.saveGame({immediate:true});assert.equal(saveSlots.get(newId).data.gold,444);assert.deepEqual(saveSlots.get(oldId),originalSlot,'later autosaves use only the new slot');
// Both overwrite and new-slot quota failures preserve every existing record and active ID.
const originalWarn=console.warn;console.warn=noop;
try {
 for(const action of ['overwrite','new']){
  const slots=structuredClone(saveSlots.list()),id=g.activeSlotId,summary=popup().querySelector('.checkpoint-summary').textContent;
  saveButton().click();window.Storage.prototype.setItem=()=>{throw new Error('quota fixture');};choice(action).click();window.Storage.prototype.setItem=originalSet;
  assert.equal(notice().textContent,'セーブに失敗しました');assert.equal(notice().getAttribute('role'),'alert');assert.equal(g.activeSlotId,id);assert.deepEqual(saveSlots.list(),slots);assert.equal(popup().querySelector('.checkpoint-summary').textContent,summary);advance(450);
 }
}finally{window.Storage.prototype.setItem=originalSet;console.warn=originalWarn;}
// Return is opt-in; Escape, Enter on default cancel and cancel preserve progress.
g.gold=555;g.player.x+=5;const xy=[g.player.x,g.player.y];let resumes=0;const originalResume=g.resumeSavedGame;g.resumeSavedGame=function(data){resumes++;return originalResume.call(this,data);};
loadButton().click();assert.equal(dialog().querySelector('p').textContent,'最後に地点セーブした場所へ戻ります。よろしいですか？');assert.equal(document.activeElement,choice('cancel'));assert.equal(resumes,0);choice('cancel').click();assert.equal(g.gold,555);assert.deepEqual([g.player.x,g.player.y],xy);
loadButton().click();dialog().dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(resumes,0);assert.equal(g.gold,555);
loadButton().click();const load=choice('load');load.click();load.click();loadButton().click();assert.equal(resumes,1);assert.equal(g.gold,333);assert.equal(dialog(),null);assert.equal(popup().dataset.section,'save');const clock=g.worldTime;g.update(1);assert.equal(g.worldTime,clock,'merchant still pauses after load');assert.equal(notice().textContent,'地点セーブへ戻りました');advance(450);
// A removed checkpoint after confirmation opened fails visibly rather than moving.
loadButton().click();saveSlots.update(newId,{checkpoint:null});choice('load').click();assert.equal(resumes,1);assert.equal(notice().textContent,'地点セーブを読み込めませんでした');advance(450);
// The overview shares the same confirmation flow; stale hidden controls cannot operate.
g._merchantShopClose();g.openStrategyModal(true);g._selectStratTab('travel');const overview=document.querySelector('#view-strat-travel [data-supply="save"]');Object.assign(g.player,{x:79360,y:79360});g.renderSupplyPanel();overview.click();assert.ok(dialog());choice('cancel').click();g.closeStrategyModal();overview.click();assert.equal(dialog(),null);
const css=readFileSync('iron-squad/css/iron-squad-interface.css','utf8');assert.match(css,/checkpoint-notice.*z-index:610/);
assert.equal(beforeGold,123);assert.equal(beforeXY.length,2);g.resumeSavedGame=originalResume;dom.window.close();
console.log('PASS: save choice/cancel/Escape/focus/inert, atomic overwrite and new slot, old-slot retention/autosave routing, immediate record/1800ms notice, quota failures, return confirmation/cancel, duplicate taps, merchant pause, stale controls and missing checkpoint');
