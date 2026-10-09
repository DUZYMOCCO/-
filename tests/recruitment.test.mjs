import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const method of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('RECRUITMENT TEST ONLY').id;game.startFreshGame(false);
game.openStrategyModal(true);document.getElementById('tab-strat-troops').click();document.getElementById('tab-econ-scout').click();
const recruitmentDialog=document.getElementById('recruitment-dialog');
assert.equal(recruitmentDialog.classList.contains('hidden'),false);assert.equal(recruitmentDialog.getAttribute('aria-label'),'雇用候補');assert.equal(document.getElementById('strategy-modal').inert,true);
game.rollScoutTalent=()=> 'AVERAGE';
const job=document.getElementById('scout-class');job.value='MAGE';job.dispatchEvent(new window.Event('change'));
assert.equal(game.scoutClass,'MAGE');assert.equal(game.scoutCandidates.length,1);assert.equal(game.scoutCandidates[0].classKey,'MAGE');
const list=document.getElementById('scout-candidates-list');assert.equal(list.children.length,1);
for(const text of ['筋力','魔力','魔法防御','速さ','回避','搬送','成長素質','雇用費'])assert.ok(list.textContent.includes(text),text);
const first=game.scoutCandidates[0],firstGold=game.gold;document.getElementById('btn-refresh-scouts').click();
assert.notEqual(game.scoutCandidates[0].id,first.id);assert.equal(game.gold,firstGold,'rolling is still free');
assert.equal(game.scoutCandidates[0].classKey,'MAGE');
assert.equal(list.querySelectorAll('.recruit-stat-grid > span').length,12,'all candidate combat and base abilities appear together');
const nextButton=document.getElementById('btn-refresh-scouts'),hireButton=document.querySelector('#recruitment-dialog .btn-scout-main');
for(let i=0;i<8;i++){
 const oldPortrait=list.querySelector('canvas');nextButton.focus();nextButton.click();
 assert.equal(document.getElementById('btn-refresh-scouts'),nextButton);assert.equal(document.activeElement,nextButton);assert.equal(document.querySelector('#recruitment-dialog .btn-scout-main'),hireButton);
 assert.ok(oldPortrait.width<=1&&oldPortrait.height<=1,'discarded portraits release their Canvas buffer');assert.equal(game.gold,firstGold);
}

// Full personal squads open a real swap dialog and return focus to recruitment.
game.gold=1e6;game.rankIndex=2;
for(const unit of game.squad.slice(0,3))unit.isPersonalGuard=true;
const swapCandidate=game.scoutCandidates[0],swapGold=game.gold,previousGuard=game.squad[0];
assert.equal(game.scoutSoldier(swapCandidate.id,'personal'),false);
assert.ok(document.getElementById('scout-personal-swap-popup'));assert.equal(recruitmentDialog.inert,true);
document.querySelector('.btn-cancel-scout-swap').click();assert.equal(game.gold,swapGold);assert.equal(game.scoutCandidates[0].id,swapCandidate.id);assert.equal(recruitmentDialog.inert,false);assert.equal(document.getElementById('strategy-modal').inert,true);
game.scoutSoldier(swapCandidate.id,'personal');document.querySelector('.scout-swap-pick').click();
assert.equal(document.getElementById('scout-personal-swap-popup'),null);assert.equal(previousGuard.isPersonalGuard,false);assert.ok(game.squad.some(unit=>unit.id===swapCandidate.id&&unit.isPersonalGuard));assert.equal(game.gold,swapGold-swapCandidate.cost);assert.equal(game.listPersonalGuardsAlive().length,3);assert.equal(document.getElementById('strategy-modal').inert,true);

// Run the scheduled UI flow deterministically, without waiting or letting background timers run.
const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let scheduled;
globalThis.setTimeout=(callback,ms)=>{assert.equal(ms,1200);scheduled=callback;return 99;};globalThis.clearTimeout=()=>{};
try {
  assert.equal(game.startScoutAuto(),true);assert.equal(game._scoutAuto,true);
  game.rollScoutTalent=()=> 'GENIUS';scheduled();
  assert.equal(game._scoutAuto,false);assert.equal(game.scoutCandidates[0].talent,'GENIUS');
  const genius=structuredClone(game.scoutCandidates[0]);assert.equal(document.getElementById('btn-auto-scouts').getAttribute('aria-pressed'),'false');
  assert.equal(game.startScoutAuto(),false);assert.equal(game.scoutCandidates[0].id,genius.id);
  window.confirm=()=>false;assert.equal(game.nextScoutCandidate(),false);assert.equal(game.scoutCandidates[0].id,genius.id);
  const saved=structuredClone(game.saveGame());game.resumeSavedGame(saved);
  assert.equal(game.scoutClass,'MAGE');assert.equal(game.scoutCandidates[0].id,genius.id);assert.deepEqual(game.scoutCandidates[0].soldier.attributeProfile,genius.soldier.attributeProfile);
  game.gold=1e7;game.rollScoutTalent=()=> 'AVERAGE';const preview=structuredClone(game.scoutCandidates[0].soldier),cost=game.scoutCandidates[0].cost,beforeMoney=game.gold;
  assert.equal(game.scoutSoldier(genius.id,'main'),true);const hired=[...game.squad,...game.reserves].find(u=>u.id===genius.id);
  assert.ok(hired);assert.equal(hired.soldierClass,'MAGE');assert.equal(game.gold,beforeMoney-cost);
  assert.deepEqual(hired.attributeProfile,preview.attributeProfile);assert.deepEqual(hired.appearance,preview.appearance);
  for(const field of ['strength','magicPower','magicDef','quickness','dodge','atk','maxHp','magicAttack'])assert.equal(hired[field],preview[field],`preview matches hired ${field}`);
  assert.equal(game._scoutAuto,false,'hiring does not resume auto rolling');
  // Leaving the screen stops its pending timer and cannot discard the held person.
  game.openStrategyModal(true);document.getElementById('tab-strat-troops').click();document.getElementById('tab-econ-scout').click();game.startScoutAuto();
  const held=game.scoutCandidates[0].id,queued=scheduled;game.closeStrategyModal();queued();assert.equal(game._scoutAuto,false);assert.equal(game.scoutCandidates[0].id,held);assert.equal(recruitmentDialog.classList.contains('hidden'),true);assert.equal(document.getElementById('strategy-modal').inert,false);
} finally {globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;game.stopScoutAuto();game.destroy();dom.window.close();}
console.log('PASS: selected profession, one detailed candidate, free individual rolls, real timer/genius stop and protection, held-candidate save/resume, no reroll on hire/portrait/stats, exact cost and modal teardown');
