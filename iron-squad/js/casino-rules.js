export const CASINO_BET=10;
export const casinoBaseBet=level=>[10,25,50,100,250,500][Math.max(0,Math.min(5,Math.floor(Number(level)||0)))];
export const CASINO_POLICY=Object.freeze({betBaseMultiplier:200,slotReturn:[1.08,1.12],pokerReturn:[1.08,1.14],ordinaryReturn:[1.04,1.12],slotMs:1050,pokerMs:850,reducedMs:350,arenaSeconds:15,arenaTrials:800,arenaReturn:1.2,arenaOddsRange:[1.2,12],arenaBetMultiplier:5,bigWinMultiple:5});
export const casinoMaxBet=level=>casinoBaseBet(level)*CASINO_POLICY.betBaseMultiplier;
export const MAX_CASINO_BET=casinoMaxBet(5);
export const casinoArenaMaxBet=level=>casinoMaxBet(level)*CASINO_POLICY.arenaBetMultiplier;
export const MAX_CASINO_ARENA_BET=casinoArenaMaxBet(5);
export const casinoPageMaxBet=(level,page)=>page==='arena'?casinoArenaMaxBet(level):casinoMaxBet(level);
export const validCasinoBet=(n,minimum=CASINO_BET,maximum=MAX_CASINO_BET)=>Number.isSafeInteger(Number(n))&&Number(n)>=minimum&&Number(n)<=maximum;
export const normalizeCasinoBet=n=>validCasinoBet(n)?Number(n):CASINO_BET;
export const POKER_PAYOUTS=[
  {key:'royalFlush',name:'ロイヤルフラッシュ',mult:800},
  {key:'straightFlush',name:'ストレートフラッシュ',mult:50},
  {key:'fourKind',name:'フォーカード',mult:25},{key:'fullHouse',name:'フルハウス',mult:9},
  {key:'flush',name:'フラッシュ',mult:6},{key:'straight',name:'ストレート',mult:4},
  {key:'threeKind',name:'スリーカード',mult:3},{key:'twoPair',name:'ツーペア',mult:2},
  {key:'highPair',name:'10以上のワンペア',mult:1.3},{key:'nothing',name:'役なし',mult:0}
];
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
const rank=id=>id%13+2,suit=id=>Math.floor(id/13);
export function cardFace(id) {
  return {rank:({11:'J',12:'Q',13:'K',14:'A'})[rank(id)]||String(rank(id)),suit:['♠','♥','♦','♣'][suit(id)],red:[1,2].includes(suit(id))};
}
export function evaluatePoker(hand) {
  if(!Array.isArray(hand)||hand.length!==5||new Set(hand).size!==5||hand.some(id=>!Number.isInteger(id)||id<0||id>=52))throw new Error('Invalid poker hand');
  const ranks=hand.map(rank).sort((a,b)=>a-b),counts=new Map();
  for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
  const groups=[...counts.values()].sort((a,b)=>b-a),flush=hand.every(id=>suit(id)===suit(hand[0]));
  const straight=counts.size===5&&(ranks[4]-ranks[0]===4||ranks.join(',')==='2,3,4,5,14');
  const key=flush&&straight?(ranks[0]===10?'royalFlush':'straightFlush'):
    groups[0]===4?'fourKind':groups[0]===3&&groups[1]===2?'fullHouse':flush?'flush':straight?'straight':
    groups[0]===3?'threeKind':groups[0]===2&&groups[1]===2?'twoPair':
    [...counts].some(([r,n])=>r>=POKER_PAIR_MIN_RANK&&n===2)?'highPair':'nothing';
  return POKER_PAYOUTS.find(row=>row.key===key);
}
export function dealPoker(phase,random=Math.random,bet=CASINO_BET) {
  const cards=Array.from({length:52},(_,i)=>i);
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(unit(random)*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return {phase:integer(phase),bet:normalizeCasinoBet(bet),hand:cards.slice(0,5),deck:cards.slice(5),held:[false,false,false,false,false],status:'draw',payout:0,result:''};
}
export function finishPoker(poker) {
  if(!poker||poker.status!=='draw')return false;
  for(let i=0;i<5;i++)if(!poker.held[i])poker.hand[i]=poker.deck.shift();
  const result=evaluatePoker(poker.hand);
  poker.status='settled';poker.result=result.name;poker.payout=Math.round(normalizeCasinoBet(poker.bet)*result.mult);
  return poker.payout;
}
function normalizePoker(data) {
  if(!data||!['draw','settled'].includes(data.status))return null;
  const hand=Array.isArray(data.hand)?data.hand.slice(0,5):[],deck=Array.isArray(data.deck)?data.deck.slice(0,47):[];
  const cards=[...hand,...deck];
  if(hand.length!==5||(data.status==='draw'&&deck.length!==47)||new Set(cards).size!==cards.length||cards.some(n=>!Number.isInteger(n)||n<0||n>=52))return null;
  const bet=normalizeCasinoBet(data.bet);
  return {phase:integer(data.phase),bet,hand,deck,held:Array.from({length:5},(_,i)=>!!data.held?.[i]),status:data.status,
    payout:data.status==='settled'?Math.round(bet*evaluatePoker(hand).mult):0,result:data.status==='settled'?evaluatePoker(hand).name:''};
}
export function pokerWinningCards(hand) {
  const key=evaluatePoker(hand).key;if(key==='nothing')return [];
  if(['royalFlush','straightFlush','fullHouse','flush','straight'].includes(key))return [0,1,2,3,4];
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
    slot:valid?slotResult([...slot.reels],slot.bet):null};
}
