import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {computeRankings,collectAllSoldiers,filterByFamily,rankingFamilies,RANKER_CUTOFF} from '../js/troop-rankings.js';

const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=noop;
try{
  game.setupUI();game.activeSlotId=saveSlots.create('RANKING PAGING TEST ONLY').id;game.startFreshGame(false);
  // Known roster: six own soldiers with distinct kill counts, plus one rival-platoon soldier who has no record sheet.
  const base=game.squad[0];
  const mk=(id,cls,kills)=>({...structuredClone(base),id,name:`兵${id}`,soldierClass:cls,minionKills:kills,bossKills:0,level:3,dead:false,isDown:false,isPlayer:false,isHero:false,combatClass:cls,baseClassId:cls});
  game.squad=[mk('a1','HEAVY',60),mk('a2','LIGHT',50),mk('a3','ARCHER',40),mk('a4','HEAVY',30),mk('a5','MEDIC',20),mk('a6','LIGHT',10)];
  game.reserves=[];game.reserveSoldiers=[];
  game.platoons=[{name:'第2小隊',members:[mk('z9','HEAVY',99)]}];
  game._troopRankingCategory='kills';game._troopRankingClass='all';
  game.renderTroopRankings();
  const section=document.getElementById('command-troop-rankings');
  const rows=()=>[...section.querySelectorAll('.ranking-item')];
  const ids=()=>rows().map(r=>r.dataset.soldierId);
  const host=()=>document.getElementById('soldier-detail-host');
  assert.deepEqual(ids(),['z9','a1','a2','a3','a4','a5','a6'],'overall kills order');
  assert.ok(!rows()[0].classList.contains('is-openable')&&!rows()[0].getAttribute('role'),'a unit with no record sheet is not tappable');
  assert.ok(rows()[1].classList.contains('is-openable')&&rows()[1].getAttribute('role')==='button'&&rows()[1].tabIndex===0);
  rows()[0].click();assert.equal(game.selectedSoldierDetailId??null,null,'non-tappable row does nothing');

  // Row tap opens the right record; paging follows the ranking order and wraps.
  rows()[3].click();
  assert.equal(game.selectedSoldierDetailId,'a3');assert.match(host().textContent,/兵a3/);assert.match(host().textContent,/PERSONNEL FILE/);
  assert.match(host().querySelector('.soldier-detail-pos').textContent,/3 \/ 6/,'position among the openable ranked soldiers');
  host().querySelector('.btn-soldier-next').click();assert.equal(game.selectedSoldierDetailId,'a4');
  host().querySelector('.btn-soldier-prev').click();host().querySelector('.btn-soldier-prev').click();assert.equal(game.selectedSoldierDetailId,'a2');
  host().querySelector('.btn-soldier-prev').click();assert.equal(game.selectedSoldierDetailId,'a1');
  host().querySelector('.btn-soldier-prev').click();assert.equal(game.selectedSoldierDetailId,'a6','wraps from first to last');
  assert.match(host().querySelector('.soldier-detail-pos').textContent,/6 \/ 6/);
  host().querySelector('.btn-soldier-next').click();assert.equal(game.selectedSoldierDetailId,'a1','wraps from last to first');
  game.closeSoldierDetail();
  rows()[2].dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(game.selectedSoldierDetailId,'a2','Enter opens the row');
  game.closeSoldierDetail();

  // Class filter: only classes that exist, narrows the list, positions are within the class, ranker marks stay overall.
  assert.deepEqual([...section.querySelectorAll('.ranking-class-btn')].map(b=>b.dataset.class),['all','HEAVY','LIGHT','ARCHER','MEDIC'],'MAGE has nobody so it is not offered');
  section.querySelector('[data-class="LIGHT"]').click();
  assert.equal(game._troopRankingClass,'LIGHT');
  assert.deepEqual(ids(),['a2','a6'],'only LIGHT soldiers, ordered by the stat category');
  assert.match(rows()[0].querySelector('.rank-pos-badge').textContent,/兵種内1位/);assert.match(rows()[1].querySelector('.rank-pos-badge').textContent,/兵種内2位/);
  assert.match(rows()[0].textContent,/全体3位/,'a2 is 3rd overall (z9, a1 ahead) and keeps the ranker mark');
  assert.ok(rows()[0].classList.contains('is-ranker')&&!rows()[1].classList.contains('is-ranker'),'a6 is outside the overall top 3');
  assert.ok(!/RANKER|首席/.test(rows()[1].textContent),'no ranker badge for a6 just because it is 2nd among LIGHT');
  assert.match(section.textContent,/ランカーのしるしと特別給与は、全体の順位/);
  // Paging inside the class view uses the filtered order.
  rows()[0].click();assert.match(host().querySelector('.soldier-detail-pos').textContent,/1 \/ 2/);
  host().querySelector('.btn-soldier-next').click();assert.equal(game.selectedSoldierDetailId,'a6');
  game.closeSoldierDetail();
  assert.equal(game._troopRankingClass,'LIGHT','class filter survives coming back from a record');
  assert.equal(game._troopRankingCategory,'kills','stat category survives too');
  // The salary / badge computation does not know about the filter.
  const all=collectAllSoldiers(game);
  assert.deepEqual(computeRankings(all,'kills',RANKER_CUTOFF).map(e=>e.soldier.id),['z9','a1','a2']);
  assert.deepEqual(filterByFamily(all,'HEAVY').map(e=>e.soldier.id).sort(),['a1','a4','z9']);
  assert.deepEqual(rankingFamilies(all).map(f=>f.id),['HEAVY','LIGHT','ARCHER','MEDIC']);
  assert.ok(section.querySelector('[data-class="LIGHT"]').textContent.includes('軽装遊撃兵'),'Japanese class names come from SOLDIER_CLASSES');
  // A class that disappears falls back to all.
  game._troopRankingClass='MAGE';game.renderTroopRankings();assert.equal(game._troopRankingClass,'all');
  // Roster/reserve entry point pages through the list it was given only.
  game.reserves=[game.squad.pop(),game.squad.pop()];game.openSoldierDetail(game.reserves[0].id,game.reserves.map(x=>x.id));
  assert.match(host().querySelector('.soldier-detail-pos').textContent,/1 \/ 2/);
  console.log('PASS: ranking rows open records, paging wraps, class filter keeps overall rankers');
}finally{game.destroy?.();dom.window.close();}
