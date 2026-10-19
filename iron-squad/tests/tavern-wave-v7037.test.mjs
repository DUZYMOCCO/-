// v7.0.37: the tavern's strangers (recruit candidates) are replaced every wave (= game.phase).
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {ensureTavernRoster,tavernWaveChanged,FIELD_TAVERN,TAVERN_HIRE_COST} from '../js/tavern.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
const toasts=[];for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=m=>toasts.push(String(m));
game.setupUI();game.activeSlotId=saveSlots.create('TAVERN WAVE TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();
game.phase=5;game.gold=1e6;Object.assign(game.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+60});
// ---------- same wave: the roster is stable ----------
const r1=ensureTavernRoster(game);assert.equal(r1.phase,5);assert.equal(r1.people.length,4);
const ids1=r1.people.map(p=>p.unit.id);
assert.equal(ensureTavernRoster(game),r1,'same wave, same roster object');assert.deepEqual(ensureTavernRoster(game).people.map(p=>p.unit.id),ids1);
// ---------- next wave: replaced even though nobody was hired ----------
game.phase=6;const r2=ensureTavernRoster(game);assert.notEqual(r2,r1);assert.equal(r2.phase,6);assert.equal(r2.people.length,4);
const ids2=r2.people.map(p=>p.unit.id);assert.ok(ids2.every(id=>!ids1.includes(id)),'all new faces');assert.ok(r2.people.every(p=>!p.joined));
// ---------- someone hired this wave stays hired after the next wave ----------
assert.ok(game.recruitTavernPerson(ids2[0],'gold'));const hired=r2.people[0].unit;assert.equal(r2.people[0].joined,true);
const inGame=()=>[...(game.squad||[]),...(game.reserves||[]),...(game.taverns.waiting||[])].some(s=>s.id===hired.id);assert.ok(inGame(),'hired unit lives outside the roster');
game.phase=7;const r3=ensureTavernRoster(game);assert.equal(r3.phase,7);assert.ok(r3.people.every(p=>!p.joined&&p.unit.id!==hired.id));assert.ok(inGame(),'a hired friend is unaffected by the refresh');
// ---------- all hired (old condition) still refreshes; hire again works on the new faces ----------
for(const p of r3.people.filter(p=>!p.joined))assert.ok(game.recruitTavernPerson(p.unit.id,'gold'));game.phase=8;const r4=ensureTavernRoster(game);assert.equal(r4.phase,8);assert.ok(r4.people.every(p=>!p.joined));
// ---------- save compatibility: roster persists inside a wave; an old save's roster is replaced at the next wave ----------
game.saveGame({immediate:true});const saved=JSON.parse(JSON.stringify(game.saveGame({immediate:true})));
assert.equal(saved.taverns.roster.phase,8);const keep=r4.people.map(p=>p.unit.id);
game.resumeSavedGame(structuredClone(saved));assert.deepEqual(ensureTavernRoster(game).people.map(p=>p.unit.id),keep,'same wave after a load: same candidates');
const old=structuredClone(saved);old.phase=3;old.wave=3;old.taverns.roster.phase=3;old.taverns.roster.people[0].joined=false; // an old save: partially hired roster from an earlier wave
game.resumeSavedGame(old);assert.equal(game.taverns.roster.phase,3);const oldIds5=game.taverns.roster.people.map(p=>p.unit?.id);game.phase=4;const r5=ensureTavernRoster(game);assert.equal(r5.phase,4,'replaced by the next wave update');assert.ok(r5.people.every(p=>!oldIds5.includes(p.unit.id)&&!p.joined));
const none=structuredClone(saved);delete none.taverns;game.resumeSavedGame(none);assert.equal(ensureTavernRoster(game).people.length,4,'a save without a roster still gets one');
// ---------- the open tavern menu is redrawn when the wave changes; nothing stale can be hired ----------
game.phase=10;Object.assign(game.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+60});game.gold=1e6;
assert.ok(game.openTavern());const oldRoster=ensureTavernRoster(game),oldIds=oldRoster.people.map(p=>p.unit.id),oldNames=oldRoster.people.map(p=>p.unit.name);
const dialog=()=>document.getElementById('tavern-dialog');
assert.ok(dialog().textContent.includes('第10期の人たちです'),'wave note shown');
document.querySelector('.tavern-portrait').click();assert.ok(document.getElementById('tavern-person-detail'),'a spec sheet is open');
const staleHire=document.querySelector('.tavern-detail-hire');
toasts.length=0;game.phase=11;assert.equal(tavernWaveChanged(game),true);
assert.equal(document.getElementById('tavern-person-detail'),null,'the stale spec sheet is closed');
assert.ok(toasts.some(t=>t.includes('大酒場の人が入れかわった')),toasts.join('|'));
assert.ok(dialog().textContent.includes('第11期の人たちです'));const newIds=ensureTavernRoster(game).people.map(p=>p.unit.id);assert.ok(newIds.every(id=>!oldIds.includes(id)));
const shownNames=[...document.querySelectorAll('.tavern-person-text strong')].map(e=>e.textContent);for(const n of ensureTavernRoster(game).people.map(p=>p.unit.name))assert.ok(shownNames.includes(n));
const walletBefore=game.gold,squadBefore=game.squad.length;staleHire.onclick?.();
assert.equal(game.recruitTavernPerson(oldIds[0],'gold'),false,'an old candidate can no longer be hired');assert.equal(game.gold,walletBefore,'nothing charged');assert.equal(game.squad.length,squadBefore);
assert.equal(tavernWaveChanged(game),false,'no second notice for the same wave');
// all hired: the note says so
for(const p of ensureTavernRoster(game).people.filter(p=>!p.joined))assert.ok(game.recruitTavernPerson(p.unit.id,'gold'));
game.renderTavern();assert.ok(dialog().textContent.includes('全員雇用済み'));
// a wave change with the menu closed: no UI work, no toast; rebuilt silently
dialog().querySelector('#btn-tavern-close').click();assert.equal(dialog(),null);toasts.length=0;game.phase=12;assert.equal(tavernWaveChanged(game),false);assert.equal(toasts.length,0);assert.equal(ensureTavernRoster(game).phase,12);
// the real wave step calls the hook (source check: the phase increment is followed by it)
import fs from 'node:fs';const src=fs.readFileSync(new URL('../js/index.js',import.meta.url),'utf8');assert.ok(/this\.wave = this\.phase;\s*tavernWaveChanged\(this\)/.test(src),'endPhase calls tavernWaveChanged right after the increment');
console.log('tavern v7.0.37: strangers replaced every wave; hired friends untouched; open menu refreshed; old saves replaced next wave');
