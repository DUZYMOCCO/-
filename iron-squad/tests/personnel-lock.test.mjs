import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {expeditionCandidates,expeditionMembers,canStartExpedition,isSoldierOnExpedition,clearExpeditionState,startExpeditionState} from '../js/expedition-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
let confirmations=0;Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>{confirmations++;return true;},alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:noop});
g.setupUI();g.activeSlotId=saveSlots.create('PERSONNEL LOCK TEST ONLY').id;g.startFreshGame(false);g.career.status='enlisted';g.gold=10000;
const make=id=>Object.assign(g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'}),{id,name:id,platoonId:0,isPersonalGuard:false,x:79360,y:79360});
const a=make('protected'),b=make('candidate-b'),c=make('candidate-c'),d=make('candidate-d'),reserve=make('reserve'),personal=make('personal');personal.isPersonalGuard=true;
g.squad=[a,b,c,d,personal];g.reserves=[reserve];g.initPlatoons();g.openStrategyModal(true);
const fingerprint=u=>JSON.stringify({hp:u.hp,maxHp:u.maxHp,atk:u.atk,def:u.def,mana:u.mana,ammo:u.ammo,gold:u.gold,equipped:u.equipped,x:u.x,y:u.y});
const before=fingerprint(a),beforePicks=g.getExpeditionPicks(0).map(String);assert.ok(beforePicks.includes(a.id));
// Lock using the real roster button; an already captured dismissal button cannot bypass it.
const row=()=>[...document.querySelectorAll('.roster-entry')].find(n=>n.dataset.soldierId===a.id),staleDismiss=row().querySelector('.btn-dismiss');row().querySelector('.btn-personnel-lock').click();
assert.equal(a.personnelLocked,true);assert.equal(fingerprint(a),before);assert.equal(saveSlots.get(g.activeSlotId).data.squad.find(u=>u.id===a.id).personnelLocked,true);
assert.match(row().querySelector('.roster-identity strong').textContent,/🔒/);assert.equal(row().querySelector('.btn-dismiss').disabled,true);assert.equal(row().querySelector('.btn-personnel-lock').getAttribute('aria-pressed'),'true');
const funds=[g.gold,g.treasury,JSON.stringify(g.inventory),JSON.stringify(g.sharedEquipBox)];staleDismiss.click();assert.equal(g.dismissSoldier(a.id),false);assert.equal(confirmations,0);assert.ok(g.squad.includes(a));assert.deepEqual([g.gold,g.treasury,JSON.stringify(g.inventory),JSON.stringify(g.sharedEquipBox)],funds);
// Both the selection UI and actual dispatch reject the lock, including stale cached IDs.
g.expeditionPicks[0]=[a.id,b.id,c.id,d.id];assert.deepEqual(g.getExpeditionPicks(0).map(String),[b.id,c.id,d.id]);assert.equal(g.toggleExpeditionPick(0,a.id),false);
g.renderExpeditionPanel();const checkbox=document.querySelector(`.expedition-pick[data-sid="${a.id}"]`);assert.equal(checkbox.disabled,true);assert.equal(checkbox.checked,false);assert.match(checkbox.parentElement.textContent,/保護中/);
assert.equal(canStartExpedition(g,0,[a.id,b.id,c.id]),false);assert.equal(g.startPlatoonExpedition(0,4,[a.id,b.id,c.id]),false);assert.equal(g.platoons[0].mission,'idle');assert.equal(g.startPlatoonExpedition(0,4,[]),false,'an explicit empty selection never sends everyone');
for(const tier of [1,2,3,4]){assert.equal(g.startPlatoonExpedition(0,tier,[a.id,b.id,c.id,d.id]),true);assert.deepEqual(g.platoons[0].expeditionMemberIds,[b.id,c.id,d.id]);assert.equal(isSoldierOnExpedition(g.platoons[0],a),false);clearExpeditionState(g.platoons[0]);}
// A lock applied during an existing expedition must not remove its actual members/rewards.
assert.equal(g.startPlatoonExpedition(0,4,[b.id,c.id,d.id]),true);const activeIds=[...g.platoons[0].expeditionMemberIds];assert.equal(g.toggleSoldierLock(b.id),true);assert.deepEqual(g.platoons[0].expeditionMemberIds,activeIds);assert.equal(g.platoons[0].mission,'expedition');assert.equal(isSoldierOnExpedition(g.platoons[0],b),true);assert.ok(expeditionMembers(g,0,activeIds).includes(b));assert.ok(!expeditionCandidates(g,0).includes(b));clearExpeditionState(g.platoons[0]);
const direct={};startExpeditionState(direct,{x:1,y:1},[a,b,c,d],4);assert.deepEqual(direct.expeditionMemberIds,[c.id,d.id]);
// The detail sheet exposes the same state, stays on its chosen tab and supports unlocking.
g.openSoldierDetail(a.id);document.querySelector('[data-detail-tab="record"]').click();const oldSheet=document.getElementById('soldier-detail-host');oldSheet.querySelector('.btn-personnel-lock').click();assert.equal(a.personnelLocked,false);assert.equal(document.getElementById('soldier-detail-host'),oldSheet);assert.equal(document.querySelector('[data-detail-tab="record"]').getAttribute('aria-selected'),'true');assert.equal(document.querySelector('#soldier-detail-host .btn-personnel-lock').getAttribute('aria-pressed'),'false');g.closeSoldierDetail();
assert.equal(g.dismissSoldier(a.id),true);assert.equal(confirmations,1);assert.ok(!g.squad.some(u=>u.id===a.id));
// Personal companions and reserves keep protection across ordinary/checkpoint resumes.
assert.equal(g.toggleSoldierLock(reserve.id),true);assert.equal(g.toggleSoldierLock(personal.id),true);const snapshot=structuredClone(g.saveGame());g.resumeSavedGame(snapshot);g.closeStrategyModal();
for(const id of [reserve.id,personal.id]){const u=[...g.squad,...g.reserves].find(u=>u.id===id);assert.equal(u.personnelLocked,true);assert.equal(g.dismissSoldier(id),false);}
Object.assign(g.player,{x:79360,y:79360});assert.equal(g.saveCheckpoint(),true);assert.equal(g.toggleSoldierLock(reserve.id),true);assert.equal(g.loadCheckpoint(),true);assert.equal([...g.squad,...g.reserves].find(u=>u.id===reserve.id).personnelLocked,true);
// Storage failure rolls the toggle back and cannot clear an existing protection.
const current=[...g.squad,...g.reserves].find(u=>u.id===reserve.id),set=window.Storage.prototype.setItem,warn=console.warn;console.warn=noop;
try{window.Storage.prototype.setItem=()=>{throw new Error('quota fixture');};assert.equal(g.toggleSoldierLock(current.id),false);assert.equal(current.personnelLocked,true);}finally{window.Storage.prototype.setItem=set;console.warn=warn;}
assert.equal([...saveSlots.get(g.activeSlotId).data.squad,...saveSlots.get(g.activeSlotId).data.reserves].find(u=>u.id===current.id).personnelLocked,true);
const legacy=structuredClone(snapshot);for(const u of [...legacy.squad,...legacy.reserves])delete u.personnelLocked;g.resumeSavedGame(legacy);g.closeStrategyModal();assert.ok([...g.squad,...g.reserves].every(u=>u.personnelLocked!==true));assert.ok(expeditionCandidates(g,0).some(u=>u.id===b.id));
assert.equal(g.toggleSoldierLock('missing'),false);const hero=g.squad[0];hero.heroPartyId='independent';assert.equal(g.toggleSoldierLock(hero.id),false);hero.dead=true;assert.equal(g.toggleSoldierLock(hero.id),false);
dom.window.close();console.log('PASS: roster/detail protection and unlock, stale/direct dismissal guards, unchanged stats/economy, all four dispatch tiers and empty picks, selection pruning, active mission continuity, personal/reserve ordinary and checkpoint saves, quota rollback, legacy unlocked, hero/dead guards');
