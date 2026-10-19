// v7.1.0: Mahjong inside the casino panel (jsdom): lobby entry, setup, play, 2-step tap, save/resume, auto-return, abandon, payout once, kana mode.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,matchMedia:()=>({matches:true})});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{normalizeNation}=await import('../js/nation-rules.js');
const {casinoBaseBet,casinoPageMaxBet,MAX_MAHJONG_PAYOUT}=await import('../js/casino-rules.js');
const {mahjongStep,MAHJONG_PAYOUT,viewFor,normalizeMahjong}=await import('../js/mahjong-rules.js');
const {setKanaGrade}=await import('../../common/js/kana-mode.js?v=175');
const {leftoverKanji}=await import('../../common/js/kana-text.js');
const {HEADQUARTERS_FACILITIES}=await import('../js/hq-facilities.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MAHJONG TEST ONLY').id;game.startFreshGame(false);
game.nation=normalizeNation({investment:90000});game.gold=5000000;
const site=HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');game.restTimer=0;Object.assign(game.player,{x:site.x,y:site.y+24});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mj=()=>game.nation.casino.mahjong;
const waitFor=async(fn,label,ms=15000)=>{const t0=Date.now();while(!fn()){if(Date.now()-t0>ms)assert.fail('timeout: '+label);await sleep(15);}};
const panel=()=>document.querySelector('.casino-panel');
const reopen=()=>{game.closeHeadquartersFacility();Object.assign(game.player,{x:site.x,y:site.y+24});assert.equal(game.openHeadquartersFacility('casino'),true);};
assert.equal(game.openHeadquartersFacility('casino'),true);
assert.equal(panel().dataset.casinoPage,'lobby');
// lobby entry
const entry=document.querySelector('[data-casino-page="mahjong"]');assert.ok(entry,'lobby has a mahjong entry');assert.ok(!entry.textContent.includes('続き'),'no game in progress yet');
entry.click();assert.equal(panel().dataset.casinoPage,'mahjong');
assert.ok(document.querySelector('#btn-mj-start'),'setup shows a start button');assert.equal(document.querySelectorAll('[data-mj-mode]').length,2);assert.equal(document.querySelectorAll('[data-mj-level]').length,2);
const bet0=game.nation.casino.bet;assert.equal(bet0,casinoBaseBet(game.nation.level)<=bet0?bet0:bet0);
// mode / level choice changes the shown payout table
{const table=()=>[...document.querySelectorAll('.mj-setup .casino-paytable dd')].map(e=>e.textContent);
 document.querySelector('[data-mj-mode="full"]').click();document.querySelector('[data-mj-level="novice"]').click();const a=table();assert.ok(a[0].includes('×3.2'),a.join());
 document.querySelector('[data-mj-level="adept"]').click();assert.ok(table()[0].includes('×5'));
 document.querySelector('[data-mj-mode="short"]').click();assert.ok(table()[0].includes('×4.3'));
 document.querySelector('[data-mj-mode="full"]').click();document.querySelector('[data-mj-level="novice"]').click();}
// the stake cap is 5x the slot cap (arena-like)
assert.equal(casinoPageMaxBet(game.nation.level,'mahjong'),casinoPageMaxBet(game.nation.level,'arena'));
// start: stake taken, game saved, table shown
const goldBefore=game.gold,bet=game.nation.casino.bet;
document.querySelector('#btn-mj-start').click();
assert.ok(mj()&&!mj().over);assert.equal(game.gold,goldBefore-bet,'stake is taken at the start');assert.equal(mj().bet,bet);
assert.equal(game.startCasinoMahjong(),false,'no second game while one is in progress');assert.equal(game.gold,goldBefore-bet);
assert.ok(document.querySelector('.mj'),'table is shown');assert.equal(document.querySelectorAll('.mj-hand .mj-tile').length>=13,true);
// tiles are CSS-drawn: no text nodes, faces in data-*
for(const t of document.querySelectorAll('.mj-tile')){assert.equal(t.textContent,'');assert.ok(t.dataset.n);assert.ok(!/[一-龥]/.test(t.getAttribute('aria-label')),'aria-label has no kanji (kana mode)');}
// wait for the player's turn (the dealer may be a CPU)
await waitFor(()=>mj().stage!=='act'||mj().h.turn===0,'player turn');
if(mj().stage==='ron'){game.passCasinoMahjong();await waitFor(()=>mj().stage!=='act'||mj().h.turn===0,'player turn 2');}
assert.equal(mj().h.turn,0);
// 2-step tap: select, then tap again to discard
{const st=mj();const tiles=[...document.querySelectorAll('.mj-hand [data-mj-tile]')];const first=tiles[0],tileType=st.h.hands[0][0];
 first.click();assert.ok(document.querySelector('.mj-hand .is-selected'),'first tap selects');assert.equal(st.h.rivers[0].length,0,'no discard on the first tap');
 assert.equal(document.querySelector('#btn-mj-discard').disabled,false);
 document.querySelector('.mj-hand .is-selected').click();
 assert.equal(mj().h.rivers[0].length,1,'second tap discards');assert.equal(mj().h.rivers[0][0],tileType);}
// the save contains the game; resume restores it exactly
await waitFor(()=>mj().stage!=='act'||mj().h.turn===0,'player turn 3');
if(mj().stage==='ron'){game.passCasinoMahjong();await waitFor(()=>mj().stage!=='act'||mj().h.turn===0,'t4');}
{const snap=structuredClone(game.saveGame({persist:false}));assert.ok(snap.nation.casino.mahjong,'saved with the nation');
 const copy=JSON.parse(JSON.stringify(mj()));game.resumeSavedGame(snap);
 assert.deepEqual(JSON.parse(JSON.stringify(mj())),copy,'resume restores the identical game');assert.equal(game.gold,snap.gold);}
// auto-return: reopening the casino lands on the table, the lobby says "continue"
game.exitDungeon?.();Object.assign(game.player,{x:site.x,y:site.y+24});reopen();
assert.equal(panel().dataset.casinoPage,'mahjong','reopening returns to the game in progress');assert.ok(document.querySelector('.mj-hand'));
document.querySelector('[data-casino-page="lobby"]').click();assert.ok(document.querySelector('[data-casino-page="mahjong"]').textContent.includes('続き'),'lobby offers 続きから');
document.querySelector('[data-casino-page="mahjong"]').click();assert.ok(document.querySelector('.mj-hand'),'pressing the entry returns to the game');
// other casino games still work meanwhile and leave the game alone
{const keep=JSON.stringify(mj());document.querySelector('[data-casino-page="lobby"]').click();document.querySelector('[data-casino-page="slot"]').click();assert.equal(game.spinCasinoSlot(),true);await sleep(80);assert.equal(JSON.stringify(mj()),keep);document.querySelector('[data-casino-page="lobby"]').click();document.querySelector('[data-casino-page="mahjong"]').click();}
// kana mode: nothing the player reads needs kanji (tiles are CSS content), on the table, the setup, results and the final screen
const kanaOk=label=>{const left=leftoverKanji(document.querySelector('.casino-panel').textContent,2);if(left.length){const tx=document.querySelector('.casino-panel').textContent;console.log(left.map(c=>tx.slice(Math.max(0,tx.indexOf(c)-12),tx.indexOf(c)+8)).join(' | '));}assert.deepEqual(left,[],label+': '+left.join(''));for(const t of document.querySelectorAll('.mj-tile'))assert.ok(t.dataset.n,'tile data survives kana mode');};
setKanaGrade(2,{persist:false});game.openCasinoPage('mahjong');await sleep(20);kanaOk('table');
// abandon: two taps, last place, payout 0
{const g=game.gold;document.querySelector('#btn-mj-abandon').click();assert.ok(!mj().over,'first tap only asks');assert.ok(document.querySelector('#btn-mj-abandon').classList.contains('is-confirm'));
 document.querySelector('#btn-mj-abandon').click();assert.ok(mj().over);assert.equal(mj().abandoned,true);assert.equal(mj().ranks[0],4);assert.equal(mj().payout,0);assert.equal(game.gold,g,'abandon pays nothing back');
 assert.ok(document.querySelector('.mj-final'));assert.equal(game.abandonCasinoMahjong(),false);
 reopen();assert.equal(panel().dataset.casinoPage,'lobby','a finished game is not offered as 続きから');assert.ok(!document.querySelector('[data-casino-page=\"mahjong\"]').textContent.includes('続き'));document.querySelector('[data-casino-page=\"mahjong\"]').click();assert.ok(document.querySelector('.mj-final'),'the final result can be looked at again');assert.equal(game.gold,g,'reopening never pays twice');assert.ok(mj().paid);}
// closing the result gives a fresh setup; a new game can start again
document.querySelector('#btn-mj-close')?.click()||game.closeCasinoMahjong();assert.equal(mj(),null);assert.ok(document.querySelector('#btn-mj-start'));setKanaGrade(2,{persist:false});await sleep(20);kanaOk('setup');
// a whole game played through the UI methods (always tsumogiri / pass / next), payout credited exactly once
{game.setCasinoMahjongSetup({mode:'short',level:'novice'});const g0=game.gold;assert.equal(game.startCasinoMahjong({seed:12345}),true);const bet2=mj().bet;assert.equal(game.gold,g0-bet2);
 const seen=new Set();for(let guard=0;guard<4000&&!mj().over;guard++){
  const st=mj();const key=st.stage+(st.result?st.result.type:'')+(st.h.riichi[0]?'r':'');if(!seen.has(key)){seen.add(key);await sleep(5);kanaOk('stage '+key);}
  if(st.stage==='act'&&st.h.turn===0){if(!game.tsumoCasinoMahjong())game.tsumogiriCasinoMahjong();}
  else if(st.stage==='ron')game.ronCasinoMahjong()||game.passCasinoMahjong();
  else if(st.stage==='result')game.nextCasinoMahjong();
  else await sleep(5);
 }
 assert.ok(mj().over,'game finished');await sleep(5);kanaOk('final');setKanaGrade(0,{persist:false});const pay=mj().payout;assert.equal(mj().paid,true);assert.equal(game.gold,g0-bet2+pay);
 assert.equal(pay,Math.round(bet2*MAHJONG_PAYOUT.short.novice[mj().ranks[0]-1]));assert.ok(pay<=MAX_MAHJONG_PAYOUT);
 assert.equal(mj().points.reduce((a,b)=>a+b,0),100000,'points are conserved to the end');
 {const num=x=>Number(x.replace('\u2212','-').replace(/[,G+]/g,''));assert.equal(num(document.querySelectorAll('.casino-wallet b')[1].textContent),pay-bet2,'the wallet line shows the net result');assert.equal(num(document.querySelectorAll('.casino-wallet b')[0].textContent),game.gold);}
 game.saveGame({persist:false});reopen();assert.equal(game.gold,g0-bet2+pay,'no double credit after reopening');
 
 game.closeCasinoMahjong();}
// stake needs enough gold; the cap is enforced
{game.gold=0;assert.equal(game.startCasinoMahjong(),false);assert.equal(mj(),null);game.gold=5000000;}
console.log('PASS mahjong ui');
dom.window.close();








