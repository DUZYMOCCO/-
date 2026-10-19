// v7.1.12: 記録 window = 報告書・戦闘ログ・作戦報告 (the old 戦闘報告書 window); the field 履歴 button opens its log tab.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{addBattleReport,renderBattleReport}=await import('../js/battle-report.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('RECORD WINDOW TEST ONLY').id;game.startFreshGame(false);
const $=id=>document.getElementById(id);let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const view=$('view-strat-report'),visible=n=>{for(let e=n;e;e=e.parentElement)if(e.hidden||e.classList?.contains('hidden'))return false;return true;};
game.openStrategyModal(true);eq($('tab-strat-report').textContent,'記録');$('tab-strat-report').click();eq($('strat-window-title').textContent,'記録');
assert.deepEqual([...view.querySelectorAll('[data-rec-tab]')].map(b=>b.textContent),['報告書','戦闘ログ','作戦報告']);checks++;
for(const id of ['battle-report-pane','command-battle-log','battle-log-history','command-report','strat-report'])ok(view.contains($(id)),`${id} in 記録`);
ok(!$('view-strat-overview').querySelector('#command-battle-log,#command-report'),'overview keeps neither log nor last report');
// Report tab is the default; redraws keep the tabs.
ok(visible($('battle-report-pane')));ok(!visible($('battle-log-history')));
addBattleReport(game,'growth','テストの成長');renderBattleReport(game);ok(view.querySelector('#record-tabs'),'tabs survive a report redraw');ok(/テストの成長/.test($('battle-report-pane').textContent));
const tab=k=>view.querySelector(`[data-rec-tab="${k}"]`).click();
tab('ops');ok(visible($('strat-report')));ok(!visible($('battle-report-pane')));
ok(!/叙勲・投資・スカウトを行えます|装備の強化鍛冶/.test($('strat-report').textContent),'no guide to features in the last report');
tab('log');ok(visible($('battle-log-history')));eq($('command-battle-log').open,true);
// Field 履歴 opens 記録 on the log tab.
game.closeStrategyModal();game._recordTab='report';for(let i=0;i<5;i++)game.showToast(`ログ${i}`);
$('btn-battle-log-history').click();eq($('strategy-modal').classList.contains('hidden'),false);eq($('strat-window-title').textContent,'記録');
ok(visible($('battle-log-history')),'history lands on the log');eq(view.querySelector('[data-rec-tab="log"]').getAttribute('aria-selected'),'true');
ok($('battle-log-history').children.length>=5);
console.log(`PASS record-window-v7112 (${checks} checks)`);
process.exit(0);
