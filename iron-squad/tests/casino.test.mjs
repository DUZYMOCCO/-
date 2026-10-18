import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {CASINO_BET,MAX_CASINO_BET,POKER_PAYOUTS,SLOT_SYMBOLS,evaluatePoker,dealPoker,finishPoker,normalizeCasino,rollSlots,validCasinoBet,POKER_DECK_SIZE,pokerWinningCards,pokerCardPower,canDoubleUp,playDoubleUp,takeDoubleUp,drawDoubleUp,DOUBLE_UP_MAX_WINS,DOUBLE_UP_MAX_STAKE} from '../js/casino-rules.js';
import {normalizeNation} from '../js/nation-rules.js';
const card=(r,s=0)=>s*13+r-2;
const h=(...cards)=>cards.map(([r,s])=>card(r,s));
const J1=52,J2=53;
const hands={
  fiveKind:[card(7,0),card(7,1),card(7,2),card(7,3),J1],
  royalFlush:h([10,0],[11,0],[12,0],[13,0],[14,0]),straightFlush:h([2,1],[3,1],[4,1],[5,1],[14,1]),
  fourKind:h([7,0],[7,1],[7,2],[7,3],[2,0]),fullHouse:h([9,0],[9,1],[9,2],[8,0],[8,1]),
  flush:h([2,2],[6,2],[8,2],[11,2],[14,2]),straight:h([2,0],[3,1],[4,2],[5,3],[14,0]),
  threeKind:h([5,0],[5,1],[5,2],[7,0],[10,0]),twoPair:h([3,0],[3,1],[8,0],[8,1],[14,0]),
  highPair:h([11,0],[11,1],[6,0],[8,1],[10,2]),nothing:h([2,0],[4,1],[6,2],[8,3],[10,0])
};
for(const [key,hand] of Object.entries(hands))assert.equal(evaluatePoker(hand).key,key);
assert.equal(evaluatePoker(h([9,0],[9,1],[3,0],[7,1],[14,2])).key,'nothing','pairs below ten have no payout');
assert.equal(evaluatePoker(h([2,0],[3,1],[4,2],[13,0],[14,1])).key,'nothing','ace cannot bridge the middle of a straight');
assert.throws(()=>evaluatePoker([0,0,1,2,3]));

let seed=271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
// Jokers (ids 52/53) are wild: the best hand wins; five of a kind is the top hand.
{const key=(...cards)=>evaluatePoker(cards).key,c=card;
 assert.equal(POKER_DECK_SIZE,54);assert.equal(POKER_PAYOUTS[0].key,'fiveKind');assert.ok(POKER_PAYOUTS.every((r,i)=>!i||r.mult<POKER_PAYOUTS[i-1].mult||r.mult===0),'payouts fall with hand rank');
 assert.equal(key(...hands.fiveKind),'fiveKind');assert.equal(key(J1,c(5,0),c(5,1),c(5,2),c(5,3)),'fiveKind');assert.equal(key(J1,J2,c(9,0),c(9,1),c(9,2)),'fiveKind','two jokers + three of a kind');
 // one joker
 assert.equal(key(J1,c(13,0),c(13,1),c(13,2),c(2,3)),'fourKind');assert.equal(key(J2,c(13,0),c(13,1),c(2,2),c(2,3)),'fullHouse');
 assert.equal(key(J1,c(2,0),c(5,0),c(9,0),c(13,0)),'flush');assert.equal(key(J1,c(10,0),c(11,0),c(12,0),c(13,0)),'royalFlush','wild completes royal');
 assert.equal(key(J1,c(9,2),c(10,2),c(11,2),c(12,2)),'straightFlush','9-Q suited + joker is not royal');assert.equal(key(J1,c(2,1),c(3,1),c(4,1),c(5,1)),'straightFlush');
 assert.equal(key(J1,c(4,0),c(5,1),c(6,2),c(7,3)),'straight');assert.equal(key(J1,c(4,0),c(5,1),c(7,2),c(8,3)),'straight','gap filled by the joker');
 assert.equal(key(J1,c(14,0),c(2,1),c(3,2),c(4,3)),'straight','joker + A-2-3-4 is the wheel');assert.equal(key(J1,c(14,0),c(13,1),c(12,2),c(11,3)),'straight','joker + A-K-Q-J');
 assert.equal(key(J1,c(13,0),c(14,1),c(2,2),c(3,3)),'highPair','K-A-2-3 + joker cannot wrap around: just a high pair');
 assert.equal(key(J1,c(13,0),c(13,1),c(2,2),c(5,3)),'threeKind');assert.equal(key(J1,c(3,0),c(3,1),c(8,2),c(10,3)),'threeKind','a low pair + joker is three of a kind');
 assert.equal(key(J1,c(14,0),c(9,1),c(5,2),c(2,3)),'highPair','the joker pairs the ace');assert.equal(key(J1,c(9,0),c(7,1),c(5,2),c(2,3)),'nothing','a pair of nines or lower pays nothing');
 assert.equal(key(J1,c(10,0),c(7,1),c(5,2),c(2,3)),'highPair','the joker pairs the ten');
 // two jokers
 assert.equal(key(J1,J2,c(7,0),c(7,1),c(2,2)),'fourKind');assert.equal(key(J1,J2,c(7,0),c(9,1),c(2,2)),'threeKind');assert.equal(key(J1,J2,c(2,0),c(3,1),c(4,2)),'straight','a straight beats three of a kind');
 assert.equal(key(J1,J2,c(2,0),c(3,0),c(13,0)),'flush');assert.equal(key(J1,J2,c(12,0),c(13,0),c(14,0)),'royalFlush');assert.equal(key(J1,J2,c(2,3),c(4,3),c(6,3)),'straightFlush');
 assert.equal(key(J1,J2,c(2,1),c(7,2),c(13,3)),'threeKind');
 // jokers never count twice, and invalid hands still throw
 assert.throws(()=>evaluatePoker([J1,J1,0,1,2]));assert.throws(()=>evaluatePoker([54,0,1,2,3]));assert.throws(()=>evaluatePoker([-1,0,1,2,3]));
 // winning-card highlight includes the joker
 assert.deepEqual(pokerWinningCards([J1,c(13,0),c(13,1),c(2,2),c(5,3)]),[0,1,2]);assert.deepEqual(pokerWinningCards([J1,c(14,0),c(9,1),c(5,2),c(2,3)]),[0,1]);assert.deepEqual(pokerWinningCards(hands.fiveKind),[0,1,2,3,4]);
 assert.deepEqual(pokerWinningCards([J1,J2,c(9,0),c(4,1),c(2,2)]),[0,1,2],'two jokers + highest card');
 // legacy 52-card saves (47 cards left in the deck) still load
 const legacy=dealPoker(1,random,100);Object.assign(legacy,{hand:[0,1,2,3,4],deck:Array.from({length:47},(_,k)=>k+5)});
 assert.equal(legacy.deck.length,47);assert.ok(normalizeCasino({poker:legacy}).poker,'47-card deck still valid');
}
// Double-up: the prize is already in the wallet; win +stake, lose -stake, tie 0.
{const rig=(dealer,player)=>{const q=[(dealer+.5)/54,((player<dealer?player:player-1)+.5)/53];return ()=>q.shift();};
 const settled=(bet=1000,hand=hands.twoPair)=>{const p=dealPoker(1,random,bet);p.hand=[...hand];p.deck=p.deck.filter(n=>!p.hand.includes(n));p.deck.push(...Array.from({length:POKER_DECK_SIZE},(_,n)=>n).filter(n=>!p.hand.includes(n)&&!p.deck.includes(n)));p.held.fill(true);finishPoker(p);return p;};
 const nothing=settled(1000,hands.nothing);assert.equal(nothing.payout,0);assert.equal(nothing.double,null,'no prize, no double-up');assert.equal(canDoubleUp(nothing),false);assert.equal(playDoubleUp(nothing,rig(0,1)),false);
 assert.equal(canDoubleUp(dealPoker(1,random,1000)),false,'not while still drawing');
 let p=settled();assert.equal(p.payout,1300);assert.deepEqual({s:p.double.stake,w:p.double.wins,st:p.double.status},{s:1300,w:0,st:'offer'});assert.equal(canDoubleUp(p,1300),true);assert.equal(canDoubleUp(p,1299),false,'needs the stake in the wallet');
 // win doubles the prize, again and again
 let r=playDoubleUp(p,rig(card(5),card(9)));assert.deepEqual([r.outcome,r.delta,p.double.stake,p.double.wins,p.double.status],['win',1300,2600,1,'offer']);
 r=playDoubleUp(p,rig(card(2),card(14)));assert.deepEqual([r.outcome,r.delta,p.double.stake,p.double.wins],['win',2600,5200,2]);
 assert.deepEqual(normalizeCasino({poker:p}).poker,p,'offer survives a save');
 // tie keeps the prize and the win count
 r=playDoubleUp(p,rig(card(7,0),card(7,1)));assert.deepEqual([r.outcome,r.delta,p.double.stake,p.double.wins,p.double.status,p.double.outcome],['tie',0,5200,2,'offer','tie']);
 // loss removes the whole prize and ends the double-up
 r=playDoubleUp(p,rig(card(14),card(13)));assert.deepEqual([r.outcome,r.delta,p.double.stake,p.double.status,p.double.end,p.double.prev],['lose',-5200,0,'ended','lost',5200]);
 assert.equal(canDoubleUp(p),false);assert.equal(playDoubleUp(p,rig(0,1)),false);assert.equal(takeDoubleUp(p),false);assert.deepEqual(normalizeCasino({poker:p}).poker,p,'ended state survives a save');
 // ace is the strongest card; the joker beats the ace; two jokers tie
 p=settled();assert.equal(playDoubleUp(p,rig(card(14),card(13))).outcome,'lose');
 p=settled();assert.equal(playDoubleUp(p,rig(card(14),J1)).outcome,'win');p=settled();assert.equal(playDoubleUp(p,rig(J2,card(14))).outcome,'lose');p=settled();assert.equal(playDoubleUp(p,rig(J1,J2)).outcome,'tie');
 assert.equal(pokerCardPower(J1),15);assert.equal(pokerCardPower(J2),pokerCardPower(J1));assert.equal(pokerCardPower(card(14)),14);assert.equal(pokerCardPower(card(2)),2);
 // suit never matters
 p=settled();assert.equal(playDoubleUp(p,rig(card(9,0),card(9,3))).outcome,'tie');
 // the winning streak is capped
 p=settled();for(let i=0;i<DOUBLE_UP_MAX_WINS;i++){assert.equal(canDoubleUp(p),true);assert.equal(playDoubleUp(p,rig(card(2),card(14))).outcome,'win');}
 assert.deepEqual([p.double.wins,p.double.status,p.double.end,p.double.stake],[DOUBLE_UP_MAX_WINS,'ended','limit',1300*2**DOUBLE_UP_MAX_WINS]);assert.equal(canDoubleUp(p),false);assert.equal(playDoubleUp(p,rig(card(2),card(14))),false);
 // the prize never doubles past the stake cap
 p=settled();p.double.stake=DOUBLE_UP_MAX_STAKE/2;assert.equal(canDoubleUp(p),true);assert.equal(playDoubleUp(p,rig(card(2),card(14))).outcome,'win');assert.deepEqual([p.double.stake,p.double.status,p.double.end],[DOUBLE_UP_MAX_STAKE,'ended','limit']);
 p=settled();p.double.stake=DOUBLE_UP_MAX_STAKE/2+1;assert.equal(canDoubleUp(p),false);assert.ok(Number.isSafeInteger(DOUBLE_UP_MAX_STAKE*2));
 // taking the prize ends it (the money is already in the wallet)
 p=settled();assert.equal(takeDoubleUp(p),true);assert.equal(p.double.status,'ended');assert.equal(p.double.end,'taken');assert.equal(p.double.stake,1300);assert.equal(canDoubleUp(p),false);assert.equal(takeDoubleUp(p),false);assert.deepEqual(normalizeCasino({poker:p}).poker,p);
 // a rebuilt hand without a double-up (old save) has no offer; tampered double-up data is dropped
 p=settled();const old=structuredClone(p);delete old.double;assert.equal(normalizeCasino({poker:old}).poker.double,null);
 for(const bad of [{stake:-1},{stake:1.5},{wins:11},{status:'x'},{dealer:3,player:3},{dealer:60,player:1},{outcome:'lose'},{stake:0}]){const t=structuredClone(p);Object.assign(t.double,bad);assert.equal(normalizeCasino({poker:t}).poker.double,null,JSON.stringify(bad));}
 const drawing=dealPoker(1,random,1000);drawing.double={stake:5,prev:0,wins:0,status:'offer',outcome:null,dealer:null,player:null,end:''};assert.equal(normalizeCasino({poker:drawing}).poker.double,null,'no double-up while drawing');
 // fairness: draws are two distinct cards, ties refund, so each resolved round is a fair 50/50
 let win=0,lose=0,tie=0,delta=0;const N=300000;for(let i=0;i<N;i++){const {dealer,player}=drawDoubleUp(random);assert.notEqual(dealer,player);const a=pokerCardPower(player),b=pokerCardPower(dealer);if(a>b){win++;delta++;}else if(a<b){lose++;delta--;}else tie++;}
 assert.ok(Math.abs(win/(win+lose)-.5)<.01,'win rate excluding ties '+win/(win+lose));assert.ok(Math.abs(delta/N)<.01);assert.ok(Math.abs(tie/N-154/2862)<.005,'tie rate '+tie/N);
}
// Poker odds with jokers: category frequency and return (exact table in tools/casino-expectation.mjs).
{let counts={},n=200000;for(let i=0;i<n;i++){const k=evaluatePoker(dealPoker(0,random).hand).key;counts[k]=(counts[k]||0)+1;}
 assert.ok(counts.fiveKind>0&&counts.fiveKind/n<.0002,'five of a kind is rare on the first deal');assert.ok(counts.highPair/n>.15&&counts.highPair/n<.30);assert.ok((counts.nothing+counts.highPair)/n>.8);}

const {casinoBaseBet,casinoMaxBet,casinoArenaMaxBet,slotResult,SLOT_LINES,exactSlotReturn,CASINO_POLICY}=await import('../js/casino-rules.js');
const {measurePoker,buildPokerOracle}=await import('../tools/casino-expectation.mjs');
const {arenaCandidates,arenaProfile,chooseArena,simulateArena,estimateArena}=await import('../js/casino-arena.js');
assert.equal(arenaProfile({id:'angel',soldierClass:'ARCHANGEL',hp:10},{baseClassId:'MEDIC'}).healer,true);assert.equal(arenaProfile({id:'sage',soldierClass:'ELEMENTAL_SAGE',hp:10},{baseClassId:'MAGE'}).magic,true);
for(let n=0;n<80;n++){
 const p=dealPoker(3,random,1000),first=[...p.hand];assert.equal(new Set([...p.hand,...p.deck]).size,POKER_DECK_SIZE);
 p.held=[true,false,true,false,false];const payout=finishPoker(p);assert.equal(p.hand[0],first[0]);assert.equal(p.hand[2],first[2]);
 assert.ok(!first.includes(p.hand[1]));assert.equal(payout,Math.round(evaluatePoker(p.hand).mult*1000));assert.equal(finishPoker(p),false);
 assert.deepEqual(normalizeCasino({poker:p}).poker,p);
}
for(const row of POKER_PAYOUTS){const p=dealPoker(1,random,1000);p.hand=hands[row.key];p.held.fill(true);assert.equal(finishPoker(p),row.mult*1000);}
for(const symbol of SLOT_SYMBOLS){const result=slotResult(Array(9).fill(symbol.id),100);assert.equal(result.wins.length,8);assert.equal(result.payout,symbol.mult*800);}
assert.ok(Math.abs(slotResult(['cherry','cherry','lemon','lemon','gem','bell','clover','gem','seven'],100).wins.find(w=>w.line===0).payout-14)<1e-9);
assert.equal(new Set(SLOT_LINES.map(l=>l.join())).size,8);
assert.equal(normalizeCasino({pokerPhase:999,slotPhase:999}).pokerPhase,undefined);
assert.equal(normalizeCasino({slot:{reels:Array(9).fill('seven'),bet:500,payout:1}}).slot.payout,800000);
for(let level=0;level<=5;level++){assert.equal(casinoMaxBet(level),casinoBaseBet(level)*200);assert.equal(normalizeCasino({bet:MAX_CASINO_BET},0,level).bet,Math.min(MAX_CASINO_BET,casinoArenaMaxBet(level)));assert.equal(casinoArenaMaxBet(level),casinoMaxBet(level)*5);assert.equal(normalizeCasino({bet:1e9},0,level).bet,casinoArenaMaxBet(level));}
assert.equal(casinoArenaMaxBet(5),500000);assert.equal(CASINO_POLICY.arenaReturn,1.2);assert.deepEqual(CASINO_POLICY.arenaOddsRange,[1.2,12]);assert.equal(CASINO_POLICY.arenaBetMultiplier,5);
assert.equal(evaluatePoker(h([10,0],[10,1],[3,0],[7,1],[14,2])).key,'highPair');
const report=measurePoker();
assert.ok(report.hands>=1_000_000);assert.ok(report.optimalHit>.49&&report.ordinaryHit>.48);assert.ok(report.optimal>=CASINO_POLICY.pokerReturn[0]&&report.optimal<=CASINO_POLICY.pokerReturn[1],JSON.stringify(report));
assert.ok(report.ordinary>=CASINO_POLICY.ordinaryReturn[0]&&report.ordinary<=CASINO_POLICY.ordinaryReturn[1]);assert.ok(exactSlotReturn()>=CASINO_POLICY.slotReturn[0]&&exactSlotReturn()<=CASINO_POLICY.slotReturn[1]);
for(const value of Object.values(report.slotRoundedByBet))assert.ok(value>=CASINO_POLICY.slotReturn[0]&&value<=CASINO_POLICY.slotReturn[1]);
const oracle=buildPokerOracle();
for(let n=0;n<300;n++){const p=dealPoker(1,random);assert.equal(oracle.value(p.hand),evaluatePoker(p.hand).mult);const sorted=[...p.hand].sort((a,b)=>a-b);assert.ok(Math.abs(oracle.returns(sorted)[31]-evaluatePoker(sorted).mult)<1e-8);}
// Check inclusion-exclusion against direct enumeration of all one-card replacements.
const sorted=[...hands.highPair].sort((a,b)=>a-b),values=[...oracle.returns(sorted)];
for(let drop=0;drop<5;drop++){let total=0;for(let c=0;c<POKER_DECK_SIZE;c++)if(!sorted.includes(c)){const hand=[...sorted];hand[drop]=c;total+=evaluatePoker(hand).mult;}assert.ok(Math.abs(values[31^(1<<drop)]-total/(POKER_DECK_SIZE-5))<1e-8);}

const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,matchMedia:()=>({matches:true})});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('CASINO TEST ONLY').id;game.startFreshGame(false);
game.gold=2000000;assert.equal(game.startCasinoPoker(),false);
game.nation=normalizeNation({investment:90000});game.enterDungeon(game.dungeons.find(d=>d.id==='royal_castle_town'));
const bet=casinoBaseBet(game.nation.level)*10;assert.equal(game.setCasinoBet(bet),true);
let redraws=0;game.renderStrategyUI=()=>redraws++;
const before=game.gold;assert.equal(game.startCasinoPoker(),true);assert.equal(game.gold,before-bet);assert.equal(game.startCasinoPoker(),false);assert.equal(game.drawCasinoPoker(),false,'locked while dealing');
await new Promise(r=>setTimeout(r,380));
assert.equal(game.holdCasinoCard(0),true);assert.equal(game.holdCasinoCard(5),false);
const initial=structuredClone(game.nation.casino.poker);game.setCasinoBet(bet*2);assert.equal(game.nation.casino.poker.bet,bet);
const saved=structuredClone(game.saveGame({persist:false}));game.resumeSavedGame(saved);assert.deepEqual(game.nation.casino.poker,initial);
if(game.currentDungeon?.kind!=='town')game.enterDungeon(game.dungeons.find(d=>d.id==='royal_castle_town'));
const drawingGold=game.gold;assert.equal(game.drawCasinoPoker(),true);assert.equal(game.gold,drawingGold+game.nation.casino.poker.payout);assert.equal(game.drawCasinoPoker(),false);
assert.equal(game.startCasinoPoker(),false,'cannot skip exchange animation');await new Promise(r=>setTimeout(r,380));
assert.equal(game.startCasinoPoker(),true,'repeat within SAME phase');await new Promise(r=>setTimeout(r,380));game.drawCasinoPoker();await new Promise(r=>setTimeout(r,380));
{ // double-up through the game: wallet, animation lock, save/load, new deal
 const rig=(dealer,player)=>{const q=[(dealer+.5)/54,((player<dealer?player:player-1)+.5)/53];return ()=>q.shift();};
 const prize=(hand=hands.threeKind)=>{const p=dealPoker(1,random,bet);p.hand=[...hand];p.deck=Array.from({length:POKER_DECK_SIZE},(_,n)=>n).filter(n=>!p.hand.includes(n));p.held.fill(true);finishPoker(p);game.nation.casino.poker=p;game.gold=500000+p.payout;return p;};
 let p=prize(),stake=p.payout,g=game.gold;assert.ok(stake>0);
 assert.equal(game.doubleUpCasinoPoker(rig(card(5),card(9))),true);assert.equal(game.gold,g+stake,'win adds the prize once more');assert.equal(game.doubleUpCasinoPoker(rig(card(5),card(9))),false,'locked while the cards are revealed');assert.equal(game.takeCasinoPoker(),false);
 await new Promise(r=>setTimeout(r,380));assert.equal(p.double.stake,stake*2);assert.equal(game.takeCasinoPoker(),true);assert.equal(game.gold,g+stake,'taking does not change the wallet again');assert.equal(game.takeCasinoPoker(),false);assert.equal(game.doubleUpCasinoPoker(rig(1,2)),false);
 p=prize();stake=p.payout;g=game.gold;assert.equal(game.doubleUpCasinoPoker(rig(card(14),card(2))),true);assert.equal(game.gold,g-stake,'loss removes the whole prize');await new Promise(r=>setTimeout(r,380));assert.equal(game.doubleUpCasinoPoker(rig(1,2)),false);
 p=prize();g=game.gold;assert.equal(game.doubleUpCasinoPoker(rig(J1,J2)),true);assert.equal(game.gold,g,'tie changes nothing');await new Promise(r=>setTimeout(r,380));assert.equal(canDoubleUp(game.nation.casino.poker,game.gold),true);
 // consecutive wins accumulate in the wallet
 p=prize();stake=p.payout;g=game.gold;for(let i=0;i<3;i++){assert.equal(game.doubleUpCasinoPoker(rig(card(2),card(14))),true);await new Promise(r=>setTimeout(r,380));}
 assert.equal(game.gold,g+stake*(1+2+4));assert.equal(p.double.wins,3);
 // the offer survives save/load; leaving and reloading never loses or invents money
 const saved=structuredClone(game.saveGame({persist:false}));const gold=game.gold;game.resumeSavedGame(saved);if(game.currentDungeon?.kind!=='town')game.enterDungeon(game.dungeons.find(d=>d.id==='royal_castle_town'));
 assert.equal(game.gold,gold);assert.deepEqual(game.nation.casino.poker.double,p.double);assert.equal(game.nation.casino.poker.double.status,'offer');
 // not enough gold to risk the prize
 p=game.nation.casino.poker;game.gold=p.double.stake-1;assert.equal(game.doubleUpCasinoPoker(rig(card(2),card(14))),false);
 // dealing a new hand simply takes the prize
 game.gold=500000;g=game.gold;assert.equal(game.startCasinoPoker(),true);assert.equal(game.gold,g-game.nation.casino.bet);assert.equal(game.nation.casino.poker.double,null);await new Promise(r=>setTimeout(r,380));game.drawCasinoPoker();await new Promise(r=>setTimeout(r,380));game.gold=2000000;
}
assert.equal(game.spinCasinoSlot(),true);assert.equal(game.spinCasinoSlot(),false,'double spin blocked');assert.equal(game.setCasinoBet(bet),false,'bet locked in animation');await new Promise(r=>setTimeout(r,380));assert.equal(game.spinCasinoSlot(),true,'same phase repeat slot');await new Promise(r=>setTimeout(r,380));
assert.equal(redraws,0,'casino never redraws strategy');
game.gold=0;assert.equal(game.spinCasinoSlot(),false);assert.equal(game.startCasinoPoker(),false);game.gold=2000000;
game.exitDungeon();const site=(await import('../js/hq-facilities.js')).HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');game.restTimer=0;Object.assign(game.player,{x:site.x,y:site.y+24});
assert.equal(game.openHeadquartersFacility('casino'),true);assert.equal(document.querySelector('.casino-panel').dataset.casinoPage,'lobby');
document.querySelector('[data-casino-page="slot"]').click();assert.equal(document.querySelectorAll('.slot-reel').length,9);assert.ok(!document.querySelector('.poker-hand'));
assert.equal(game.setCasinoBet(casinoMaxBet(game.nation.level)+1),false);
game.setCasinoBet(casinoMaxBet(game.nation.level));document.querySelector('[data-bet-mult="10"]').click();assert.equal(game.nation.casino.bet,casinoMaxBet(game.nation.level));
// Pure arena and real soldier isolation, except the permitted W/L counters.
game.squad=[];game.reserves=[];game.platoons=[];assert.equal(chooseArena(game),null);
for(let i=0;i<6;i++){const s=game.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE',level:4});s.isPersonalGuard=true;s.hp=s.maxHp;game.squad.push(s);}
assert.equal(arenaCandidates(game).length,6);game.squad[0].isDown=true;assert.equal(chooseArena(game),null);game.squad[0].isDown=false;
for(const flag of ['carrierId','heroPartyId']){game.squad[0][flag]='x';assert.equal(arenaCandidates(game).length,5);delete game.squad[0][flag];}
game._merchantWounded=[{id:'arena-npc-patient',isMerchant:true,isDown:true,carrierId:game.squad[0].id}];assert.equal(arenaCandidates(game).length,5,'carrying an allied NPC also excludes the carrier');game._merchantWounded=[];
game.openCasinoPage('arena');assert.equal(document.querySelectorAll('[data-arena-face]').length,6);
// Arena stake cap is 5x the shared cap and is clamped when moving between pages.
{const lv=game.nation.level,arenaMax=casinoArenaMaxBet(lv),slotMax=casinoMaxBet(lv);game.gold=arenaMax*3;
assert.equal(game.setCasinoBet(arenaMax),true);assert.equal(game.setCasinoBet(arenaMax+1),false);assert.equal(game.nation.casino.bet,arenaMax);
assert.ok(document.querySelector('.casino-wager').textContent.includes(arenaMax.toLocaleString()),'arena page shows its cap');
document.querySelector('[data-bet-mult="10"]').click();assert.equal(game.nation.casino.bet,arenaMax);
game.openCasinoPage('slot');assert.equal(game.nation.casino.bet,slotMax,'slot page clamps arena stake');assert.ok(document.querySelector('.casino-wager').textContent.includes(slotMax.toLocaleString()));
game.openCasinoPage('arena');assert.equal(game.setCasinoBet(arenaMax),true);game.openCasinoPage('poker');assert.equal(game.nation.casino.bet,slotMax);
// Poker page: joker card, double-up panel, buttons.
{const ps=dealPoker(1,random,100);ps.hand=[J1,card(13,0),card(13,1),card(13,2),card(2,3)];ps.deck=Array.from({length:POKER_DECK_SIZE},(_,n)=>n).filter(n=>!ps.hand.includes(n));ps.held.fill(true);finishPoker(ps);game.nation.casino.poker=ps;game.gold=1000000;game.openCasinoPage('poker');
 assert.ok(document.querySelector('.poker-card.joker'),'joker is drawn');assert.ok(document.querySelector('.poker-hand').textContent.includes('JOKER'));assert.ok(document.querySelector('[aria-label*="ジョーカー"]'));
 assert.ok(document.querySelector('.casino-paytable').textContent.includes('ファイブカード'));assert.ok(document.querySelector('.poker-double').textContent.includes('0/'+DOUBLE_UP_MAX_WINS));
 const up=document.querySelector('#btn-double-up'),take=document.querySelector('#btn-double-take');assert.ok(up&&take&&!up.disabled&&!take.disabled);assert.ok(up.textContent.includes((ps.double.stake*2).toLocaleString()));
 const gb=game.gold,st=ps.double.stake;up.click();assert.ok([gb-st,gb,gb+st].includes(game.gold));assert.ok(!document.querySelector('#btn-double-up')||document.querySelector('#btn-double-up').disabled);
 await new Promise(r=>setTimeout(r,380));assert.equal(document.querySelectorAll('.double-card').length,2);
 const after=game.nation.casino.poker.double;if(after.status==='offer'){document.querySelector('#btn-double-take').click();assert.equal(game.nation.casino.poker.double.end,'taken');}
 assert.ok(!document.querySelector('#btn-double-up'));assert.ok(document.querySelector('.poker-double .casino-award').textContent.length>0);}
game.openCasinoPage('arena');game.setCasinoBet(arenaMax);const g0=game.gold;assert.equal(game.betCasinoArena(1),true);assert.equal(game.gold-g0<=arenaMax*(CASINO_POLICY.arenaOddsRange[1]-1)&&g0-game.gold<=arenaMax,true);game.finishCasinoArena();
game.openCasinoPage('slot');game.openCasinoPage('arena');for(const u of game.squad)delete u.arenaRecord;game.shuffleCasinoArena();}
// Odds clamp: heavy underdog is capped at 12x (EV below 1.2); even/favourite never drops below 1.2x.
{const strong=p=>({...p,hp:2000,atk:300,def:60}),weak=p=>({...p,hp:40,atk:5,def:0}),base=chooseArena(game).teams,lopsided=[base[0].map(strong),base[1].map(weak)];
const e=estimateArena(lopsided,random,400);assert.equal(e.odds[1],CASINO_POLICY.arenaOddsRange[1]);assert.ok(e.probability[1]*e.odds[1]<1.2);assert.ok(e.odds[0]>=CASINO_POLICY.arenaOddsRange[0]&&e.odds[0]<1.21);}
const realBefore=structuredClone(game.squad);assert.equal(game.betCasinoArena(0),true);assert.equal(game.betCasinoArena(0),false);assert.equal(game.finishCasinoArena(),true);assert.equal(game.finishCasinoArena(),false);
for(let i=0;i<6;i++){const s=game.squad[i];assert.equal(s.arenaRecord.wins+s.arenaRecord.losses,1);const actual=structuredClone(s);delete actual.arenaRecord;assert.deepEqual(actual,realBefore[i]);}
const snapshot=game.saveGame({persist:false});assert.ok(snapshot.squad.every(s=>s.arenaRecord));
const match=chooseArena(game,random);match.teams=match.teams.map(team=>team.map(p=>({...p,hp:400,atk:55,def:20,interval:.7,crit:.1,healer:false,magic:false,ranged:false})));const odds=estimateArena(match.teams,random,10000);let red=0;
for(let i=0;i<20000;i++)red+=simulateArena(match.teams,random).winner===0?1:0;
for(const [p,i]of [[red/20000,0],[1-red/20000,1]])assert.ok(p*odds.odds[i]>1.14&&p*odds.odds[i]<1.26,`${p*odds.odds[i]}`);
console.log('PASS casino pages',JSON.stringify(report),JSON.stringify({red:red/20000,odds:odds.odds}));
dom.window.close();
