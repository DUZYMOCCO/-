import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {CASINO_BET,MAX_CASINO_BET,POKER_PAYOUTS,SLOT_SYMBOLS,evaluatePoker,dealPoker,finishPoker,normalizeCasino,rollSlots,validCasinoBet} from '../js/casino-rules.js';
import {normalizeNation} from '../js/nation-rules.js';
const card=(r,s=0)=>s*13+r-2;
const h=(...cards)=>cards.map(([r,s])=>card(r,s));
const hands={
  royalFlush:h([10,0],[11,0],[12,0],[13,0],[14,0]),straightFlush:h([2,1],[3,1],[4,1],[5,1],[14,1]),
  fourKind:h([7,0],[7,1],[7,2],[7,3],[2,0]),fullHouse:h([9,0],[9,1],[9,2],[8,0],[8,1]),
  flush:h([2,2],[6,2],[8,2],[11,2],[14,2]),straight:h([2,0],[3,1],[4,2],[5,3],[14,0]),
  threeKind:h([5,0],[5,1],[5,2],[7,0],[10,0]),twoPair:h([3,0],[3,1],[8,0],[8,1],[14,0]),
  highPair:h([11,0],[11,1],[6,0],[8,1],[10,2]),nothing:h([2,0],[4,1],[6,2],[8,3],[10,0])
};
for(const [key,hand] of Object.entries(hands))assert.equal(evaluatePoker(hand).key,key);
assert.equal(evaluatePoker(h([10,0],[10,1],[3,0],[7,1],[14,2])).key,'nothing','low pairs have no payout');
assert.equal(evaluatePoker(h([2,0],[3,1],[4,2],[13,0],[14,1])).key,'nothing','ace cannot bridge the middle of a straight');
assert.throws(()=>evaluatePoker([0,0,1,2,3]));
for(let n=0;n<80;n++){
  let seed=n+1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  const p=dealPoker(3,random,10000),first=[...p.hand];assert.equal(new Set([...p.hand,...p.deck]).size,52);
  p.held=[true,false,true,false,false];const payout=finishPoker(p);assert.equal(p.hand[0],first[0]);assert.equal(p.hand[2],first[2]);
  assert.ok(!first.includes(p.hand[1]));assert.equal(new Set([...p.hand,...p.deck]).size,p.hand.length+p.deck.length);
  assert.equal(payout,evaluatePoker(p.hand).mult*10000);assert.equal(finishPoker(p),false,'settlement cannot repeat');
  assert.deepEqual(normalizeCasino({poker:p}).poker,p);
}
for(const row of POKER_PAYOUTS){const p=dealPoker(1,()=>.5,1000000);p.hand=hands[row.key];p.held.fill(true);assert.equal(finishPoker(p),row.mult*1000000);}
let weight=0;
for(const symbol of SLOT_SYMBOLS){const midpoint=(weight+symbol.weight/2)/100;const slot=rollSlots(()=>midpoint,25000);assert.deepEqual(slot.reels,[symbol.id,symbol.id,symbol.id]);assert.equal(slot.payout,symbol.mult*25000);weight+=symbol.weight;}
const sequence=values=>()=>values.shift();
assert.equal(rollSlots(sequence([.1,.2,.4]),5000).payout,5000,'two cherries return the original stake');
assert.equal(rollSlots(sequence([.3,.6,.95]),5000).payout,0);
assert.equal(normalizeCasino({slot:{reels:['seven','seven','seven'],payout:1,result:'<img>',bet:500}}).slot.payout,100000);
assert.equal(normalizeCasino({poker:{hand:[0,0,1,2,3],deck:[],status:'draw'}}).poker,null);
assert.equal(normalizeCasino({},8).pokerPhase,8,'an already used legacy casino phase stays used');
for(const bet of [100,101,1000000,MAX_CASINO_BET])assert.equal(validCasinoBet(bet),true);
for(const bet of [0,99,-100,100.5,NaN,Infinity,MAX_CASINO_BET+1])assert.equal(validCasinoBet(bet),false);

const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:375,height:780,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('CASINO TEST ONLY').id;game.startFreshGame(false);
game.gold=2000000;game.nation=normalizeNation({investment:90000});assert.equal(game.startCasinoPoker(),false,'outside town cannot gamble');
game.enterDungeon(game.dungeons.find(d=>d.id==='royal_castle_town'));game.renderStrategyUI();
game.setCasinoBet(50000);const before=game.gold;assert.equal(game.startCasinoPoker(),true);assert.equal(game.gold,before-50000);assert.equal(game.startCasinoPoker(),false);
const initial=structuredClone(game.nation.casino.poker);assert.equal(game.holdCasinoCard(0),true);assert.equal(game.holdCasinoCard(5),false);
game.setCasinoBet(1000000);assert.equal(game.nation.casino.poker.bet,50000,'changing the next bet cannot increase an already paid hand');
const saved=structuredClone(game.saveGame());game.resumeSavedGame(saved);assert.equal(game.nation.casino.poker.held[0],true);assert.deepEqual(game.nation.casino.poker.hand,initial.hand);assert.deepEqual(game.nation.casino.poker.deck,initial.deck);
if(game.currentDungeon?.kind!=='town')game.enterDungeon(game.dungeons.find(d=>d.id==='royal_castle_town'));
const drawingGold=game.gold;assert.equal(game.drawCasinoPoker(),true);assert.equal(game.gold,drawingGold+game.nation.casino.poker.payout);assert.equal(game.drawCasinoPoker(),false);
const settledGold=game.gold;game.resumeSavedGame(structuredClone(game.saveGame()));assert.equal(game.gold,settledGold);assert.equal(game.drawCasinoPoker(),false,'reload never pays again');
if(game.currentDungeon?.kind!=='town')game.enterDungeon(game.dungeons.find(d=>d.id==='royal_castle_town'));
game.gold=100;game.setCasinoBet(1000);assert.equal(game.spinCasinoSlot(),false);assert.equal(game.startCasinoPoker(),false);assert.equal(game.gold,100);
game.gold=2000000;const random=Math.random;try{Math.random=()=>.99;assert.equal(game.spinCasinoSlot(),true);}finally{Math.random=random;}
assert.equal(game.gold,2000000-1000+200000);assert.equal(game.nation.casino.slot.bet,1000);assert.equal(game.spinCasinoSlot(),false);
game.phase++;assert.equal(game.startCasinoPoker(),true,'each game can be played again next phase');
game.renderStrategyUI();assert.ok(document.querySelector('.poker-hand'));assert.equal(document.querySelectorAll('.slot-reel').length,3);
const betInput=document.getElementById('casino-bet');betInput.value='20000';betInput.dispatchEvent(new window.Event('change'));assert.equal(game.nation.casino.bet,20000);
document.querySelector('[data-bet-mult="10"]').click();assert.equal(game.nation.casino.bet,200000);
assert.ok(!document.getElementById('nation-facilities').textContent.match(/ダイス|出目|一振り/));
game.nation=normalizeNation({investment:45000});assert.equal(game.spinCasinoSlot(),false,'locked casino cannot charge');
game.nation=normalizeNation({investment:90000});game.phase=50;game.gold=2000000;game.setCasinoBet(1000);assert.equal(game.startCasinoPoker(),true);
game.startFreshGame(true);assert.equal(game.nation.casino.poker,null);assert.equal(game.nation.casino.pokerPhase,0);assert.equal(game.nation.casino.slotPhase,0);assert.equal(game.nation.casino.bet,1000,'a new inherited expedition keeps the wager preference without inheriting a paid hand or future cooldown');
console.log('PASS: ten poker ranks, ace rules, deck/holds/one draw, weighted slots, variable million-G stakes, immutable paid wagers, locked/poor checks, independent phase limits, active-hand and settlement saves, live wager controls, no dice');
dom.window.close();
