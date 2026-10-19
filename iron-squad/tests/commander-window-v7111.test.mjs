// v7.1.11: the commander's own window (隊長), tabbed like a soldier's record; growth tab with bars; hit count saved.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {MASTERY_STYLES,hitGrowthProgress} from '../js/growth-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ["startGameLoop","showToast","spawnSparks","spawnDamageText"])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('COMMANDER WINDOW TEST ONLY').id;game.startFreshGame(false);
const $=id=>document.getElementById(id);let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const view=$('view-strat-commander'),visible=n=>{for(let e=n;e;e=e.parentElement)if(e.hidden||e.classList?.contains('hidden'))return false;return true;};
// 1. One window, one tile; tabs in the soldier-record layout.
game.openStrategyModal(true);ok(view,'commander window exists');eq($('tab-strat-commander').textContent,'隊長');
$('tab-strat-commander').click();eq($('strat-window-title').textContent,'隊長');ok(visible(view));
assert.deepEqual([...view.querySelectorAll('[data-cmd-tab]')].map(b=>b.textContent),['能力','成長','装備','覚醒・魔法','身だしなみ']);checks++;
for(const id of ['player-record-box','player-equip-box','player-magic-affinity','btn-edit-commander','rescue-permanent-summary'])ok(view.contains($(id)),`${id} lives in the commander window`);
ok(!$('view-strat-overview').querySelector('#player-record-box,#commander-record'),'no commander record left in the overview');
ok(!$('view-strat-troops').contains($('player-equip-box')),'commander gear is no longer in the troops window');
const tab=k=>view.querySelector(`[data-cmd-tab="${k}"]`).click();
for(const [k,id] of [['ability','commander-hit-growth'],['growth','commander-hit-growth'],['equip','player-equip-box'],['awaken','player-magic-affinity'],['groom','btn-edit-commander']]){
  tab(k);eq(view.querySelector(`[data-cmd-tab="${k}"]`).getAttribute('aria-selected'),'true');
  for(const pane of view.querySelectorAll('[data-cmd-pane]'))eq(pane.hidden,pane.dataset.cmdPane!==k,`${k}: only its pane shows`);
  if(k!=='ability')ok(visible($(id)),`${id} visible on ${k}`);else ok(!visible($(id)),'growth bar hidden on ability');
}
// 2. Growth tab: EXP bar, hit growth (HP, bar to the next milestone, DEF, hit count), mastery bars, rescue, front-line experience.
const P=game.player;Object.assign(P,{exp:7,reqExp:20,hitGrowthHp:250,hitGrowthDef:31.6,hitGrowthEvents:42,survivedWaves:3});
game.renderStrategyUI();tab('growth');const g=view.querySelector('[data-cmd-pane="growth"]');
ok(/経験値/.test(g.textContent)&&/7 \/ 20/.test(g.textContent),'EXP meter');
eq(hitGrowthProgress(P).next,300);ok(/HP \+250/.test($('commander-hit-growth').textContent)&&/次 \+300/.test($('commander-hit-growth').textContent),'hit HP and next milestone');
eq($('commander-hit-growth').querySelector('.commander-bar > span').style.width,'50%');
ok(/防御 \+31/.test(g.textContent)&&/被弾 42回/.test(g.textContent),'DEF growth and hit count');
eq(g.querySelectorAll('.commander-mastery').length,MASTERY_STYLES.length);ok(/救出の永続強化/.test(g.textContent)&&/戦線経験 3回/.test(g.textContent));
eq(game._commanderTab,'growth');game.renderStrategyUI();eq(view.querySelector('[data-cmd-pane="growth"]').hidden,false,'tab survives a redraw');
// 3. Equipment pane has no meta explanations.
for(const meta of ['鍛冶屋で強化可能','職制限なし','熟練＝','上限なし'])ok(!$('player-equip-box').textContent.includes(meta),`no "${meta}"`);
// 4. Hit count saved; older saves read 0.
const save=structuredClone(game.saveGame({immediate:true}));eq(save.player.hitGrowthEvents,42);
game.resumeSavedGame(structuredClone(save));eq(game.player.hitGrowthEvents,42);
const old=structuredClone(save);delete old.player.hitGrowthEvents;game.resumeSavedGame(old);eq(game.player.hitGrowthEvents,0,'old saves read 0');
// 5. Crossing a milestone goes to the report as growth (commander only).
game.player.hitGrowthHp=99;const before=(game.battleReport||[]).length;game.trainFromHit(game.player,1000);
const added=(game.battleReport||[]).slice(before);ok(added.some(e=>e.kind==='growth'&&/隊長の体躯鍛錬/.test(e.text)),'milestone in 🌱成長');
const s=game.squad[0];s.hitGrowthHp=99;const b2=game.battleReport.length;game.trainFromHit(s,1000);eq(game.battleReport.length,b2,'soldier milestones stay out of the report');
// 6. The shortcut opens the same window.
game.openStrategyModal(true);$('btn-player-stats').click();ok(visible(view));eq(game._commanderTab,'ability');
console.log(`PASS commander-window-v7111 (${checks} checks)`);
