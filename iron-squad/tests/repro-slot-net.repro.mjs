import {rollSlots,slotResult,casinoBaseBet,casinoMaxBet,exactSlotReturn} from '../js/casino-rules.js';
const money=n=>`${Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1})}G`;
let N=2000000,stat={};
for(const bet of [10,25,50,100,250,500,3000,100000]){
 let wins=0,winLoss=0,winZero=0,winGain=0,ex=null;
 for(let i=0;i<N/8;i++){const r=rollSlots(Math.random,bet);if(!r.wins.length)continue;wins++;const net=r.payout-r.bet;
  if(net<0){winLoss++;ex??={reels:r.reels.join(','),wins:r.wins.map(w=>w.key+':'+w.payout),payout:r.payout,net};}else if(net===0)winZero++;else winGain++;}
 console.log(bet,{wins,winLoss,winZero,winGain,pctLossOfWins:(winLoss/wins*100).toFixed(1)+'%',ex});
}
console.log('RTP',exactSlotReturn());
// rounding example
const r=slotResult(['cherry','cherry','lemon','bell','seven','clover','gem','bell','lemon'],25);console.log(r.wins,r.payout,r.result);
