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
assert.equal(evaluatePoker(h([9,0],[9,1],[3,0],[7,1],[14,2])).key,'nothing','pairs below ten have no payout');
assert.equal(evaluatePoker(h([2,0],[3,1],[4,2],[13,0],[14,1])).key,'nothing','ace cannot bridge the middle of a straight');
assert.throws(()=>evaluatePoker([0,0,1,2,3]));

const {casinoBaseBet,casinoMaxBet,casinoArenaMaxBet,slotResult,SLOT_LINES,exactSlotReturn,CASINO_POLICY}=await import('../js/casino-rules.js');
const {measurePoker,buildPokerOracle}=await import('../tools/casino-expectation.mjs');
const {arenaCandidates,arenaProfile,chooseArena,simulateArena,estimateArena}=await import('../js/casino-arena.js');
assert.equal(arenaProfile({id:'angel',soldierClass:'ARCHANGEL',hp:10},{baseClassId:'MEDIC'}).healer,true);assert.equal(arenaProfile({id:'sage',soldierClass:'ELEMENTAL_SAGE',hp:10},{baseClassId:'MAGE'}).magic,true);
let seed=271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let n=0;n<80;n++){
 const p=dealPoker(3,random,1000),first=[...p.hand];assert.equal(new Set([...p.hand,...p.deck]).size,52);
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
for(let drop=0;drop<5;drop++){let total=0;for(let c=0;c<52;c++)if(!sorted.includes(c)){const hand=[...sorted];hand[drop]=c;total+=evaluatePoker(hand).mult;}assert.ok(Math.abs(values[31^(1<<drop)]-total/47)<1e-8);}

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
