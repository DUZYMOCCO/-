import {POKER_PAYOUTS,POKER_PAIR_MIN_RANK,POKER_DECK_SIZE,SLOT_SYMBOLS,SLOT_LINES,SLOT_CHERRY_TWO,exactSlotReturn,CASINO_POLICY} from '../js/casino-rules.js';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// Only the number of 2-cherry lines is fractional. Enumerating the 512 cherry
// occupancy masks accounts exactly for overlapping lines and final G rounding.
export function roundedSlotReturn(bet) {
  const triple=SLOT_LINES.length*SLOT_SYMBOLS.reduce((n,s)=>n+(s.weight/100)**3*s.mult,0);let cherries=0;
  for(let mask=0;mask<512;mask++){
    const count=mask.toString(2).replaceAll('0','').length,probability=.28**count*.72**(9-count);
    const lines=SLOT_LINES.filter(cells=>cells.filter(i=>mask&(1<<i)).length===2).length;
    cherries+=probability*Math.round(bet*SLOT_CHERRY_TWO*lines)/bet;
  }
  return triple+cherries;
}

export function buildPokerOracle() {
  const N=POKER_DECK_SIZE,choose=Array.from({length:N+1},()=>new Float64Array(6));
  for(let n=0;n<=N;n++){choose[n][0]=1;for(let k=1;k<=5;k++)choose[n][k]=n?choose[n-1][k-1]+choose[n-1][k]:0;}
  const sums=Array.from({length:6},(_,k)=>new Float64Array(choose[N][k])),hits=Array.from({length:6},(_,k)=>new Uint32Array(choose[N][k])),bits=Array.from({length:32},(_,m)=>m.toString(2).replaceAll('0','').length);
  const top=Array.from({length:32},(_,m)=>Math.floor(Math.log2(m))),prev=Array.from({length:32},(_,m)=>m^(1<<top[m]));
  const counts=new Uint8Array(13),keys=new Float64Array(32),cards=new Uint8Array(5),pay=Object.fromEntries(POKER_PAYOUTS.map(p=>[p.key,p.mult]));
  // Jokers (ids 52, 53) are wild: same category order as evaluatePoker, tried strongest first.
  function value(h) {
    counts.fill(0);let mask=0,max=0,pairs=0,triple=false,high=false,jokers=0,natural=0,suit0=-1,suited=true,highest=-1;
    for(let i=0;i<5;i++){
      const c=h[i];if(c>=52){jokers++;continue;}
      const r=c%13,s=Math.floor(c/13);counts[r]++;mask|=1<<r;natural++;if(suit0<0)suit0=s;else if(s!==suit0)suited=false;
    }
    for(let r=0;r<13;r++){max=Math.max(max,counts[r]);if(counts[r]>0)highest=r;if(counts[r]===2){pairs++;if(r>=POKER_PAIR_MIN_RANK-2)high=true;}if(counts[r]===3)triple=true;}
    let straight=false;if(max===1){straight=(mask&~0x100f)===0;for(let r=0;r<9&&!straight;r++)straight=(mask&~(31<<r))===0;}
    const royal=max===1&&(mask&~(31<<8))===0;
    return max+jokers>=5?pay.fiveKind:suited&&straight?(royal?pay.royalFlush:pay.straightFlush):max+jokers>=4?pay.fourKind:
      (jokers===0&&triple&&pairs===1)||(jokers===1&&pairs===2)?pay.fullHouse:suited?pay.flush:straight?pay.straight:max+jokers>=3?pay.threeKind:
      jokers===0&&pairs===2?pay.twoPair:(jokers===0?high:jokers===1&&highest>=POKER_PAIR_MIN_RANK-2)?pay.highPair:0;
  }
  for(let a=0;a<N-4;a++)for(let b=a+1;b<N-3;b++)for(let c=b+1;c<N-2;c++)for(let d=c+1;d<N-1;d++)for(let e=d+1;e<N;e++) {
    cards[0]=a;cards[1]=b;cards[2]=c;cards[3]=d;cards[4]=e;
    const v=value(cards);if(!v)continue;sums[0][0]+=v;hits[0][0]++;
    for(let m=1;m<32;m++){keys[m]=keys[prev[m]]+choose[cards[top[m]]][bits[m]];sums[bits[m]][keys[m]]+=v;hits[bits[m]][keys[m]]++;}
  }
  const values=new Float64Array(32),chances=new Float64Array(32);
  return {
    value,
    chances,
    // Inclusion-exclusion removes all discarded initial cards from each draw pool.
    returns(hand) {
      values[0]=sums[0][0];chances[0]=hits[0][0];for(let m=1;m<32;m++){keys[m]=keys[prev[m]]+choose[hand[top[m]]][bits[m]];values[m]=sums[bits[m]][keys[m]];chances[m]=hits[bits[m]][keys[m]];}
      for(let b=1;b<32;b<<=1)for(let m=0;m<32;m++)if(!(m&b)){values[m]-=values[m|b];chances[m]-=chances[m|b];}
      for(let m=0;m<32;m++){values[m]/=choose[N-5][5-bits[m]];chances[m]/=choose[N-5][5-bits[m]];}
      return values;
    },
    ordinaryHold(hand) {
      const v=value(hand);if(v>=pay.straight)return 31;
      // Jokers are always kept; the usual rules then apply to the natural cards only.
      let jokers=0;hand.forEach((c,i)=>{if(c>=52)jokers|=1<<i;});
      const idx=hand.map((c,i)=>i).filter(i=>hand[i]<52),ranks=idx.map(i=>hand[i]%13),n=ranks.map(r=>ranks.filter(v=>v===r).length);
      if(n.some(v=>v>=2))return jokers|idx.reduce((m,i,k)=>m|(n[k]>=2?1<<i:0),0);
      const suits=idx.map(i=>Math.floor(hand[i]/13));for(let s=0;s<4;s++)if(suits.filter(v=>v===s).length===4)return jokers|idx.reduce((m,i,k)=>m|(suits[k]===s?1<<i:0),0);
      // Simple high-card rule: keep two suited J+ cards, otherwise the highest J+.
      const high=idx.map((i,k)=>({c:hand[i],i})).filter(v=>v.c%13>=9);
      for(let s=0;s<4;s++){const suited=high.filter(v=>Math.floor(v.c/13)===s);if(suited.length>=2)return jokers|suited.reduce((m,v)=>m|1<<v.i,0);}
      return jokers|(high.length?1<<high.sort((a,b)=>b.c%13-a.c%13)[0].i:0);
    }
  };
}
export function measurePoker(hands=1_000_000,seed=271) {
  const oracle=buildPokerOracle(),random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  let optimal=0,ordinary=0,optimalHit=0,ordinaryHit=0;const hand=[];
  for(let i=0;i<hands;i++){
    hand.length=0;while(hand.length<5){const c=Math.floor(random()*POKER_DECK_SIZE);if(!hand.includes(c))hand.push(c);}hand.sort((a,b)=>a-b);
    const values=oracle.returns(hand),best=values.indexOf(Math.max(...values)),basic=oracle.ordinaryHold(hand);optimal+=values[best];ordinary+=values[basic];optimalHit+=oracle.chances[best];ordinaryHit+=oracle.chances[basic];
  }
  return {hands,method:'1000000 seeded initial deals; exact replacement EV for all 32 holds via full 3162510 final-hand table (54 cards incl. 2 wild jokers) and inclusion-exclusion',optimal:optimal/hands,ordinary:ordinary/hands,optimalHit:optimalHit/hands,ordinaryHit:ordinaryHit/hands,slotExact:exactSlotReturn(),slotRoundedByBet:Object.fromEntries([10,25,50,100,250,500,101,1999].map(bet=>[bet,roundedSlotReturn(bet)])),rounding:'Nearest 1G, at most 0.5G per hand/spin',policy:CASINO_POLICY};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(measurePoker(),null,2));
