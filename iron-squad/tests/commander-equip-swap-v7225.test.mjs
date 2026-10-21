// v7.2.25: the 隊長 window's 装備 tab links straight to the gear-swap screen (部隊 › バッグ).
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ["startGameLoop","showToast","spawnSparks","spawnDamageText"])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('COMMANDER EQUIP SWAP TEST ONLY').id;game.startFreshGame(false);
const $=id=>document.getElementById(id);let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const view=$('view-strat-commander'),visible=n=>{for(let e=n;e;e=e.parentElement)if(e.hidden||e.classList?.contains('hidden'))return false;return true;};
// 1. The entry sits in the 装備 tab of the 隊長 window and only shows there.
game.openStrategyModal(true);$('tab-strat-commander').click();
const btn=$('btn-commander-equip-swap'),tab=k=>view.querySelector(`[data-cmd-tab="${k}"]`).click();
ok(btn,'entry exists');ok(view.querySelector('[data-cmd-pane="equip"]').contains(btn),'entry in the equip pane');
eq(btn.textContent,'装備を付け替える');
tab('ability');ok(!visible(btn),'hidden on 能力');tab('equip');ok(visible(btn),'visible on 装備');
game.renderStrategyUI();ok($('btn-commander-equip-swap')===btn&&visible(btn),'survives a redraw');
// 2. It opens the bag, where commander gear is swapped.
const item=game.createSupplyEquipment('WEAPON',game.player,2);game.inventory.push(item);game.renderStrategyUI();
btn.click();eq(game.rosterManageTab,'equip');eq($('strat-window-title').textContent,'部隊');
ok(visible($('view-strat-equip')),'bag visible');ok(!visible(view),'commander window closed');
const row=[...document.querySelectorAll('#inventory-list .equip-btn')].find(b=>visible(b));ok(row,'equip button reachable');
// 3. The swap itself behaves as before.
row.click();eq(game.equipped.weapon?.id,item.id,'commander wears the new weapon');
console.log(`PASS commander-equip-swap-v7225 (${checks} checks)`);
