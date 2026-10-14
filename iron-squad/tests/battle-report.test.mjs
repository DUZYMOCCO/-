import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {reportKindOf,normalizeBattleReport,REPORT_LIMIT} from '../js/battle-report.js';
import {RANKER_BONUS_SALARY,calcAllRankerBonuses,rankerHonorBudget} from '../js/troop-rankings.js';
import {createPayrollPlan,paySoldiers} from '../js/payroll-rules.js';

// Ranker honors: 5,000 / 3,000 / 1,000G per department, scaled down when the treasury is short.
assert.deepEqual({...RANKER_BONUS_SALARY},{1:5000,2:3000,3:1000});
const vet=(id,k)=>({id,name:id,level:5,minionKills:k,bossKills:k%3,atk:20+k,maxHp:200+k,def:5,survivedWaves:3,gold:0});
const army=()=>[vet('a',90),vet('b',60),vet('c',30),vet('d',10)];
const total=map=>[...map.values()].reduce((n,r)=>n+r.totalBonus,0);
const rich={squad:army(),treasury:1e9,nation:{level:0,economy:{}},phase:5};
const full=calcAllRankerBonuses(rich),fullTotal=total(full);
assert.ok(fullTotal>0);
for(const r of full.values())for(const b of r.breakdowns)assert.equal(b.bonus,RANKER_BONUS_SALARY[b.rank],'a rich treasury pays the full amounts');
const reserveFloor=rankerHonorBudget({...rich,treasury:0})===0?1e9-rankerHonorBudget(rich):0;
const poor={...rich,squad:army(),treasury:reserveFloor+Math.floor(fullTotal/4)};
const budget=rankerHonorBudget(poor),scaledTotal=total(calcAllRankerBonuses(poor));
assert.ok(budget>0&&budget<fullTotal);assert.equal(scaledTotal,budget,'short treasury: honors scaled to exactly what is left');
assert.equal(total(calcAllRankerBonuses({...rich,squad:army(),treasury:0})),0,'an empty treasury pays no honors');
// The actual payday still scales by what is left after regular pay.
const pay={squad:army(),treasury:3000},plan=createPayrollPlan(pay,new Map([['a',{totalBonus:9000}]])),res=paySoldiers(pay,plan,1);
assert.ok(res.rankerPaid<=Math.max(0,3000-plan.regular));assert.ok(pay.treasury>=0);
console.log('PASS: ranker honors 5,000/3,000/1,000G with proportional scaling');

// Report patterns: important events only.
for(const [text,kind] of [['🎖️ 【昇進】伍長へ！','growth'],['🔱⚡【天命覚醒！】X が【騎士】へ昇格！','growth'],['👑【ボス戦利品獲得！】[T9 鉄] 剣！','rare'],['📦 ⚡神鍛ぶっ飛び！[T5 鉄] 槍 を取得！','rare'],['ルチアは力尽きました','death'],['🧒 子供を安全な場所へ送り届けた！','rescue'],['捕虜2名を救助・実戦へ2名合流・予備へ0名','rescue']])assert.equal(reportKindOf(text),kind,text);
for(const text of ['📦 [T3 鉄] 剣 を取得！','HPが半分以下','+12G','衛生救護！【A】が戦線復帰','👑 大金星！兵士【A】がボスにトドメ！'])assert.equal(reportKindOf(text),null,text);
assert.equal(reportKindOf('門番は力尽きました',{field:false}),null,'merchant/guard casualties are not our dead');
assert.equal(normalizeBattleReport(Array.from({length:REPORT_LIMIT+20},(_,i)=>({id:i,kind:'boss',text:'x'}))).length,REPORT_LIMIT);
assert.deepEqual(normalizeBattleReport([{kind:'junk',text:'x'},null]),[]);

// Live game: windows, recording, saving, and the hidden hero record.
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{ageLevelMarks,raiseLevelMark}=await import('../js/experience-rules.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('REPORT TEST ONLY').id;game.startFreshGame(false);
assert.deepEqual(game.battleReport,[]);
game.showToast('🎖️ 【昇進】伍長へ！');game.showToast('📦 [T3 鉄] 剣 を取得！');game.showToast('ルチアは力尽きました');
const own=game.squad[0];own.isPersonalGuard=true;own.level=7;raiseLevelMark(own);ageLevelMarks(game,.016);ageLevelMarks(game,.016);
const other=game.squad[1];other.isPersonalGuard=false;other.overflowGuard=false;other.level=9;raiseLevelMark(other);ageLevelMarks(game,.016);
assert.deepEqual(game.battleReport.map(e=>e.kind),['growth','death','growth'],'promotion, death and own-squad level-up only (no common loot, no main-army level-up)');
assert.match(game.battleReport.at(-1).text,/（自部隊）がLv\.7に成長/);
game.openStrategyModal(true);
assert.ok(document.getElementById('tab-strat-hero').classList.contains('hidden'),'no hero yet: hero record hidden');
document.getElementById('tab-strat-report').click();
const view=document.getElementById('view-strat-report');assert.equal(view.classList.contains('hidden'),false);
assert.equal(document.getElementById('strat-window-title').textContent,'戦闘報告書');
assert.equal(view.querySelectorAll('.report-entry').length,3);assert.match(view.querySelector('.report-entry').textContent,/自部隊/,'newest first');
[...view.querySelectorAll('.report-filter')].find(b=>b.dataset.kind==='death').click();
assert.equal(document.querySelectorAll('#view-strat-report .report-entry').length,1);assert.match(document.querySelector('#view-strat-report .report-entry').textContent,/力尽きました/);
game.showToast('🧒 子供を安全な場所へ送り届けた！');assert.equal(document.querySelectorAll('#view-strat-report .report-entry').length,1,'filter kept while new entries arrive');
const saved=JSON.parse(JSON.stringify(game.saveGame({immediate:true})));game.resumeSavedGame(saved);assert.equal(game.battleReport.length,4,'report survives save/resume');
// A hero appears: the record window shows up with the party.
const {rollHeroRevelation}=await import('../js/hero-party.js');game.phase=10;rollHeroRevelation(game,()=>0);assert.ok(game.heroJourney.party);
game.renderStrategyUI();assert.equal(document.getElementById('tab-strat-hero').classList.contains('hidden'),false,'hero record appears once a hero is born');
document.getElementById('tab-strat-hero').click();assert.equal(document.getElementById('strat-window-title').textContent,'勇者の記録');
assert.match(document.getElementById('view-strat-hero').textContent,/勇者パーティ/);assert.ok(!document.querySelector('#view-strat-overview #hero-journey'),'moved out of the overview');
game.destroy();dom.window.close();
console.log('PASS: battle report (boss/growth/rare/death/rescue), saved, filtered window; hero record hidden until a hero is born');
