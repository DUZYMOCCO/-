import {normalizeMahjong,MAHJONG_TOP_MULTIPLE} from './mahjong-rules.js?v=322';
export const CASINO_BET=10;
export const casinoBaseBet=level=>[10,25,50,100,250,500][Math.max(0,Math.min(5,Math.floor(Number(level)||0)))];
export const CASINO_POLICY=Object.freeze({betBaseMultiplier:200,slotReturn:[1.08,1.12],pokerReturn:[1.12,1.2],ordinaryReturn:[1.08,1.12],slotMs:1050,pokerMs:850,reducedMs:350,arenaSeconds:15,arenaTrials:800,arenaReturn:1.2,arenaOddsRange:[1.2,12],arenaBetMultiplier:5,bigWinMultiple:5});
export const casinoMaxBet=level=>casinoBaseBet(level)*CASINO_POLICY.betBaseMultiplier;
export const MAX_CASINO_BET=casinoMaxBet(5);
export const casinoArenaMaxBet=level=>casinoMaxBet(level)*CASINO_POLICY.arenaBetMultiplier;
export const MAX_CASINO_ARENA_BET=casinoArenaMaxBet(5);
// v7.1.0: Mahjong takes minutes per game, so its stake cap is the arena's (5x the slot/poker cap). The largest single payout is that cap times the best multiple.
export const MAHJONG_BET_MULTIPLIER=5;
export const casinoMahjongMaxBet=level=>casinoMaxBet(level)*MAHJONG_BET_MULTIPLIER;
export const MAX_CASINO_MAHJONG_BET=casinoMahjongMaxBet(5);
/** Largest possible mahjong payout = the stake cap x the best table multiple (v7.1.4: 500,000 x 6.4 = 3,200,000, the 1-hand game against the master; asserted by the tests). Stays below the poker royal flush (7.5M at the slot cap) and the arena maximum. */
export const MAX_MAHJONG_PAYOUT=MAX_CASINO_MAHJONG_BET*MAHJONG_TOP_MULTIPLE;
export const casinoPageMaxBet=(level,page)=>page==='arena'?casinoArenaMaxBet(level):page==='mahjong'?casinoMahjongMaxBet(level):casinoMaxBet(level);
export const validCasinoBet=(n,minimum=CASINO_BET,maximum=MAX_CASINO_BET)=>Number.isSafeInteger(Number(n))&&Number(n)>=minimum&&Number(n)<=maximum;
export const normalizeCasinoBet=n=>validCasinoBet(n)?Number(n):CASINO_BET;
// Re-tuned for the 54-card deck (2 wild jokers): returns ~1.17 with perfect play, ~1.11 with simple play.
export const POKER_PAYOUTS=[
  {key:'fiveKind',name:'ファイブカード',mult:150},
  {key:'royalFlush',name:'ロイヤルフラッシュ',mult:75},
  {key:'straightFlush',name:'ストレートフラッシュ',mult:25},
  {key:'fourKind',name:'フォーカード',mult:8},{key:'fullHouse',name:'フルハウス',mult:4},
  {key:'flush',name:'フラッシュ',mult:3},{key:'straight',name:'ストレート',mult:2.5},
  {key:'threeKind',name:'スリーカード',mult:1.5},{key:'twoPair',name:'ツーペア',mult:1.3},
  {key:'highPair',name:'10以上のワンペア',mult:1.1},{key:'nothing',name:'役なし',mult:0}
];
// 54-card deck: 52 cards plus two jokers (ids 52 and 53). Jokers are wild.
export const POKER_DECK_SIZE=54;
export const POKER_JOKERS=Object.freeze([52,53]);
// Double-up: at most this many consecutive wins, and a prize never doubles beyond the stake cap.
export const DOUBLE_UP_MAX_WINS=10;
export const DOUBLE_UP_MAX_STAKE=1_000_000_000_000;
export const SLOT_SYMBOLS=[
  {id:'cherry',icon:'🍒',name:'チェリー',weight:28,mult:1},
  {id:'lemon',icon:'🍋',name:'レモン',weight:24,mult:1},
  {id:'bell',icon:'🔔',name:'ベル',weight:18,mult:2},
  {id:'clover',icon:'🍀',name:'クローバー',weight:14,mult:4},
  {id:'gem',icon:'💎',name:'ダイヤ',weight:10,mult:12},
  {id:'seven',icon:'7',name:'セブン',weight:6,mult:200}
];
export const SLOT_CHERRY_TWO=.14;
export const POKER_PAIR_MIN_RANK=10;
export const SLOT_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
// Linearity of expectation includes every overlapping win, without assuming independent lines.
export const exactSlotReturn=()=>SLOT_LINES.length*(SLOT_SYMBOLS.reduce((n,s)=>n+(s.weight/100)**3*s.mult,0)+3*.28**2*.72*SLOT_CHERRY_TWO);
const integer=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
const unit=random=>Math.max(0,Math.min(.999999999,Number(random())||0));
const isJoker=id=>id>=52;
const rank=id=>id%13+2,suit=id=>Math.floor(id/13);
export const pokerCardPower=id=>isJoker(id)?15:rank(id);
export function cardFace(id) {
  if(isJoker(id))return {rank:'JOKER',suit:'🃏',red:id===53,joker:true,name:'ジョーカー'};
  return {rank:({11:'J',12:'Q',13:'K',14:'A'})[rank(id)]||String(rank(id)),suit:['♠','♥','♦','♣'][suit(id)],red:[1,2].includes(suit(id))};
}
const ROYAL_RANKS=[10,11,12,13,14].reduce((m,r)=>m|1<<r,0);
const STRAIGHT_WINDOWS=[...Array(9)].map((_,i)=>[0,1,2,3,4].reduce((m,k)=>m|1<<(i+2+k),0)).concat([[14,2,3,4,5].reduce((m,r)=>m|1<<r,0)]);
export function evaluatePoker(hand) {
  if(!Array.isArray(hand)||hand.length!==5||new Set(hand).size!==5||hand.some(id=>!Number.isInteger(id)||id<0||id>=POKER_DECK_SIZE))throw new Error('Invalid poker hand');
  const jokers=hand.filter(isJoker).length,natural=hand.filter(id=>!isJoker(id)),counts=new Map();
  for(const id of natural)counts.set(rank(id),(counts.get(rank(id))||0)+1);
  const groups=[...counts.values()].sort((a,b)=>b-a),top=groups[0]||0,mask=[...counts.keys()].reduce((m,r)=>m|1<<r,0),highest=Math.max(...counts.keys());
  const suited=natural.every(id=>suit(id)===suit(natural[0])),distinct=top===1;
  const straight=distinct&&STRAIGHT_WINDOWS.some(w=>(mask&~w)===0),royal=distinct&&(mask&~ROYAL_RANKS)===0;
  // Wild jokers always make the best hand: categories are tried from strongest to weakest.
  const key=top+jokers>=5?'fiveKind':suited&&straight?(royal?'royalFlush':'straightFlush'):top+jokers>=4?'fourKind':
    (jokers===0&&groups[0]===3&&groups[1]===2)||(jokers===1&&groups[0]===2&&groups[1]===2)?'fullHouse':suited?'flush':straight?'straight':
    top+jokers>=3?'threeKind':jokers===0&&groups[0]===2&&groups[1]===2?'twoPair':
    (jokers===0?[...counts].some(([r,n])=>r>=POKER_PAIR_MIN_RANK&&n===2):jokers===1&&highest>=POKER_PAIR_MIN_RANK)?'highPair':'nothing';
  return POKER_PAYOUTS.find(row=>row.key===key);
}
export function dealPoker(phase,random=Math.random,bet=CASINO_BET) {
  const cards=Array.from({length:POKER_DECK_SIZE},(_,i)=>i);
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(unit(random)*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return {phase:integer(phase),bet:normalizeCasinoBet(bet),hand:cards.slice(0,5),deck:cards.slice(5),held:[false,false,false,false,false],status:'draw',payout:0,result:'',double:null};
}
export function finishPoker(poker) {
  if(!poker||poker.status!=='draw')return false;
  for(let i=0;i<5;i++)if(!poker.held[i])poker.hand[i]=poker.deck.shift();
  const result=evaluatePoker(poker.hand);
  poker.status='settled';poker.result=result.name;poker.payout=Math.round(normalizeCasinoBet(poker.bet)*result.mult);
  // The prize is already in the wallet; a pending double-up only records how much of it may be wagered.
  poker.double=poker.payout>0&&poker.payout*2<=DOUBLE_UP_MAX_STAKE?{stake:poker.payout,prev:0,wins:0,status:'offer',outcome:null,dealer:null,player:null,end:''}:null;
  return poker.payout;
}
export function canDoubleUp(poker,gold=Infinity) {
  const d=poker?.double;
  return !!(poker?.status==='settled'&&d?.status==='offer'&&d.stake>0&&d.wins<DOUBLE_UP_MAX_WINS&&d.stake*2<=DOUBLE_UP_MAX_STAKE&&gold>=d.stake);
}
// Two distinct cards from a fresh 54-card deck; the joker beats every rank, two jokers tie.
export function drawDoubleUp(random=Math.random) {
  const dealer=Math.floor(unit(random)*POKER_DECK_SIZE);let player=Math.floor(unit(random)*(POKER_DECK_SIZE-1));if(player>=dealer)player++;
  return {dealer,player};
}
// delta is the change to the wallet: the prize is already inside it (+stake on a win, -stake on a loss, 0 on a tie).
export function playDoubleUp(poker,random=Math.random) {
  if(!canDoubleUp(poker))return false;
  const d=poker.double,stake=d.stake,{dealer,player}=drawDoubleUp(random),a=pokerCardPower(player),b=pokerCardPower(dealer);
  d.dealer=dealer;d.player=player;d.prev=stake;
  if(a===b){d.outcome='tie';return {outcome:'tie',delta:0,dealer,player,stake,prize:stake};}
  if(a<b){d.outcome='lose';d.stake=0;d.status='ended';d.end='lost';return {outcome:'lose',delta:-stake,dealer,player,stake,prize:0};}
  d.outcome='win';d.wins++;d.stake=stake*2;
  if(d.wins>=DOUBLE_UP_MAX_WINS||d.stake*2>DOUBLE_UP_MAX_STAKE){d.status='ended';d.end='limit';}
  return {outcome:'win',delta:stake,dealer,player,stake,prize:d.stake};
}
export function takeDoubleUp(poker) {
  const d=poker?.double;if(poker?.status!=='settled'||d?.status!=='offer')return false;
  d.status='ended';d.end='taken';return true;
}
function normalizeDouble(data,payout) {
  if(!data||typeof data!=='object'||payout<=0)return null;
  const int=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max,card=v=>v===null||(Number.isInteger(v)&&v>=0&&v<POKER_DECK_SIZE);
  const status=data.status,wins=data.wins,stake=data.stake,dealer=data.dealer??null,player=data.player??null,outcome=data.outcome??null;
  if(!['offer','ended'].includes(status)||!int(wins,DOUBLE_UP_MAX_WINS)||!int(stake,DOUBLE_UP_MAX_STAKE)||!int(data.prev??0,DOUBLE_UP_MAX_STAKE))return null;
  if(!card(dealer)||!card(player)||(dealer===null)!==(player===null)||(dealer!==null&&dealer===player)||![null,'win','lose','tie'].includes(outcome))return null;
  if(status==='offer'&&(stake<=0||wins>=DOUBLE_UP_MAX_WINS||stake*2>DOUBLE_UP_MAX_STAKE||outcome==='lose'))return null;
  return {stake,prev:data.prev??0,wins,status,outcome,dealer,player,end:status==='ended'?(['taken','lost','limit'].includes(data.end)?data.end:'taken'):''};
}
function normalizePoker(data) {
  if(!data||!['draw','settled'].includes(data.status))return null;
  const hand=Array.isArray(data.hand)?data.hand.slice(0,5):[],deck=Array.isArray(data.deck)?data.deck.slice(0,POKER_DECK_SIZE-5):[];
  const cards=[...hand,...deck];
  // Older saves used a 52-card deck (47 left after the deal); both sizes are accepted.
  if(hand.length!==5||(data.status==='draw'&&![47,POKER_DECK_SIZE-5].includes(deck.length))||new Set(cards).size!==cards.length||cards.some(n=>!Number.isInteger(n)||n<0||n>=POKER_DECK_SIZE))return null;
  const bet=normalizeCasinoBet(data.bet),payout=data.status==='settled'?Math.round(bet*evaluatePoker(hand).mult):0;
  return {phase:integer(data.phase),bet,hand,deck,held:Array.from({length:5},(_,i)=>!!data.held?.[i]),status:data.status,
    payout,result:data.status==='settled'?evaluatePoker(hand).name:'',double:data.status==='settled'?normalizeDouble(data.double,payout):null};
}
export function pokerWinningCards(hand) {
  const key=evaluatePoker(hand).key;if(key==='nothing')return [];
  if(['fiveKind','royalFlush','straightFlush','fullHouse','flush','straight'].includes(key))return [0,1,2,3,4];
  if(hand.some(isJoker)) {
    const counts=new Map();for(const id of hand)if(!isJoker(id))counts.set(rank(id),(counts.get(rank(id))||0)+1);
    const best=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0];
    return hand.map((id,i)=>isJoker(id)||rank(id)===best?i:-1).filter(i=>i>=0);
  }
  return hand.map((id,i)=>hand.filter(c=>rank(c)===rank(id)).length>1?i:-1).filter(i=>i>=0);
}
export function slotResult(reels,bet=CASINO_BET) {
  const wins=[];
  SLOT_LINES.forEach((cells,line)=>{
    const symbols=cells.map(i=>reels[i]),triple=symbols.every(id=>id===symbols[0]),cherries=symbols.filter(id=>id==='cherry').length;
    const symbol=SLOT_SYMBOLS.find(s=>s.id===symbols[0]);
    const mult=triple?(symbol?.mult||0):cherries===2?SLOT_CHERRY_TWO:0;
    if(mult)wins.push({line,cells,mult,key:triple?symbol.id:'cherryTwo',payout:normalizeCasinoBet(bet)*mult});
  });
  return {bet:normalizeCasinoBet(bet),reels,wins,payout:Math.round(wins.reduce((n,w)=>n+w.payout,0)),result:wins.length?`${wins.length}本の当たり！`:'はずれ'};
}
export function rollSlots(random=Math.random,bet=CASINO_BET) {
  const reels=Array.from({length:9},()=>{
    let r=unit(random)*100;for(const s of SLOT_SYMBOLS){r-=s.weight;if(r<0)return s.id;}return 'seven';
  });
  return slotResult(reels,bet);
}
export function normalizeCasino(data={},legacyPhase=0,level=0) {
  const slot=data?.slot,valid=Array.isArray(slot?.reels)&&slot.reels.length===9&&slot.reels.every(id=>SLOT_SYMBOLS.some(s=>s.id===id));
  const base=casinoBaseBet(level);
  return {bet:data?.bet==null?base:Math.min(casinoArenaMaxBet(level),Math.max(base,Number.isSafeInteger(Number(data.bet))?Number(data.bet):base)),poker:normalizePoker(data?.poker),
    slot:valid?slotResult([...slot.reels],slot.bet):null,mahjong:normalizeMahjong(data?.mahjong)};
}
