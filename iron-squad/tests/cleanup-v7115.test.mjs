// v7.1.15: meta text trimmed, 作戦期 wording, unused hidden tabs removed (live ids/handlers kept).
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('V7115 CLEANUP TEST ONLY').id;game.startFreshGame(false);
const $=id=>document.getElementById(id);let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const {pocketPotionLabel}=await import('../js/pocket-potion.js');const {formatFiscalReportHtml}=await import('../js/economy-rules.js');
game.openStrategyModal(true);
for(const id of ['tab-strat-squad','tab-strat-equip','tab-econ-invest','tab-econ-box','tab-strat-rankings','view-strat-rankings'])ok(!$(id),`${id} removed`);
for(const id of ['tab-strat-commander','tab-strat-overview','tab-strat-troops','tab-strat-nation','tab-strat-report','tab-strat-travel','tab-strat-settings','tab-econ-roster','tab-econ-scout','tab-econ-equip','tab-econ-rankings','btn-command-status','btn-fast-travel','btn-world-map','btn-heal-all','view-econ-invest','view-econ-box'])ok($(id),`${id} kept`);
const texts=[];
for(const key of ['commander','overview','troops','nation','report','travel','settings']){game._selectStratTab(key);game.renderStrategyUI();texts.push($('strategy-modal').textContent);$('btn-strat-window-back')?.click();}
const all=texts.join('\n').replace(/ホーリーウェーブ|ゆるいウェーブ/g,'');
ok(!/ウェーブ|ラウンド/.test(all),'menu speaks of 作戦期, not waves/rounds');
for(const phrase of ['ここに記録されます','重要な出来事だけを','自費で自己強化します','財政報告は作戦期終了後','ランキングが記録されます','遠征は国家運営','募集する職種を選び','軍備研究で作れる装備'])ok(!all.includes(phrase),`meta text gone: ${phrase}`);
ok(/最新\d+件/.test(all),'report keeps its numeric limit');
eq(pocketPotionLabel({pocketPotion:{phase:3,used:1}},3),'手当て 30%・1作戦期3回（残り2回）');
ok(!/ウェーブ/.test(formatFiscalReportHtml(null)),'empty fiscal report');
ok($('btn-start-next-wave'),'next-phase button id kept');
console.log(`PASS cleanup-v7115 (${checks} checks)`);
