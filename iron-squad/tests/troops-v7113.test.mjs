// v7.1.13: 部隊 = 兵士名簿・予備兵・雇用・バッグ・遠征・ランキング (reserves own subtab; expedition from 国家; rankings from its own window).
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {NATION_GROUPS} from '../js/command-navigation.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('TROOPS WINDOW TEST ONLY').id;game.startFreshGame(false);
const $=id=>document.getElementById(id);let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const visible=n=>{for(let e=n;e;e=e.parentElement){if(e.hidden||e.classList?.contains('hidden')||e.style?.display==='none')return false;}return true;};
game.reserves.push(game.createNewSoldier());game.openStrategyModal(true);
eq($('tab-strat-troops').textContent,'部隊');ok(!$('tab-strat-rankings')&&!$('view-strat-rankings'),'no separate rankings tile');
$('tab-strat-troops').click();eq($('strat-window-title').textContent,'部隊');
assert.deepEqual([...document.querySelectorAll('#view-strat-troops .economy-tab-row [data-econ]')].filter(b=>!b.classList.contains('hidden')).map(b=>b.textContent),['兵士名簿','予備兵','雇用','バッグ','遠征','ランキング']);checks++;
const panes={roster:'squad-roster-list',reserve:'reserve-roster',equip:'view-strat-equip',expedition:'nation-expedition-panel',rankings:'command-troop-rankings'};
for(const [sub,id] of Object.entries(panes)){
  $(`tab-econ-${sub}`).click();eq(game.rosterManageTab,sub);eq($(`tab-econ-${sub}`).classList.contains('active'),true);
  for(const [other,oid] of Object.entries(panes))eq(visible($(oid)),other===sub,`${sub}: ${oid} ${other===sub?'shown':'hidden'}`);
}
ok($('view-strat-troops').contains($('nation-expedition-panel'))&&$('view-strat-troops').contains($('command-troop-rankings')));
$('tab-econ-reserve').click();ok($('reserve-roster-list').querySelector('.mini-btn'),'reserve rows keep their detail button');
// 国家 no longer lists the expedition page.
assert.deepEqual(NATION_GROUPS.operations.pages,[['quest','軍令']]);checks++;
ok(!Object.values(NATION_GROUPS).some(g=>g.pages.some(([k])=>k==='expedition')));
// v7.1.15: the hidden rankings tile is gone; rankings live only in the 部隊 subtab.
$('btn-strat-window-back').click();$('tab-strat-troops').click();$('tab-econ-rankings').click();eq($('strat-window-title').textContent,'部隊');eq(game.rosterManageTab,'rankings');ok(visible($('command-troop-rankings')));
console.log(`PASS troops-v7113 (${checks} checks)`);
