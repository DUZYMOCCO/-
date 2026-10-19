// v7.1.0: payout calibration for Mahjong. Plays seat 0 with a reference policy (adept algorithm = "basic defence") or a random policy against
// three CPUs of one level, and prints the finishing-place distribution and the expected return of each payout table.
//   node tools/mahjong-calibrate.mjs [games=3000]        → distributions + EV of the shipped MAHJONG_PAYOUT
import {newMahjong,runMahjong,mulberry32,MAHJONG_PAYOUT,MAHJONG_MODES} from '../js/mahjong-rules.js';
import {mahjongAi,referencePolicy,randomPolicy} from '../js/mahjong-ai.js';
import {exactSlotReturn,CASINO_POLICY,MAHJONG_BET_MULTIPLIER} from '../js/casino-rules.js';
export function distribution(mode,level,who,games,seed0=1) {
  const dist=[0,0,0,0];
  for(let i=0;i<games;i++){
    const seed=(seed0*7919+i*104729)>>>0,rand=mulberry32(seed^0x5bd1e995),st=newMahjong({mode,level,bet:10,seed});
    runMahjong(st,mahjongAi,who==='random'?randomPolicy(rand):referencePolicy(rand));
    if(!st.over)throw new Error('game did not finish');dist[st.ranks[0]-1]++;
  }
  return dist.map(n=>n/games);
}
export const expected=(dist,table)=>dist.reduce((n,p,i)=>n+p*table[i],0);
/** Payout tables are (a, a*0.12, a*0.03, 0) rounded to 0.1 / 0.1 / 0.05, i.e. nearly winner-take-all with small refunds for 2nd/3rd. Pick a so the reference EV hits the target. */
export const shape=(a)=>[Math.round(a*10)/10,Math.round(a*1.2)/10,Math.round(a*0.6)/20,0];
export function solveTop(refDist,target,lo=1.5,hi=9) {
  let best=null;
  for(let a=lo;a<=hi+1e-9;a+=0.1){const tb=shape(a),ev=expected(refDist,tb);if(!best||Math.abs(ev-target)<Math.abs(best.ev-best.target)){best={table:tb,ev,target};}}
  return best;
}
const isMain=process.argv[1]&&import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop());
if(isMain) {
  const games=Number(process.argv[2])||3000,outFile=process.argv[3],out={};
  const targets={novice:1.15,adept:1.25};
  for(const mode of Object.keys(MAHJONG_MODES))for(const level of ['novice','adept']){
    const ref=distribution(mode,level,'reference',games),rnd=distribution(mode,level,'random',Math.max(500,games>>2));
    const solved=solveTop(ref,targets[level]),cur=MAHJONG_PAYOUT[mode][level];
    out[mode+'/'+level]={refDist:ref.map(x=>+x.toFixed(4)),randomDist:rnd.map(x=>+x.toFixed(4)),solved:solved.table,solvedRefEV:+solved.ev.toFixed(3),solvedRandomEV:+expected(rnd,solved.table).toFixed(3),shipped:cur,shippedRefEV:+expected(ref,cur).toFixed(3),shippedRandomEV:+expected(rnd,cur).toFixed(3),equalSkillMean:+(cur.reduce((a,b)=>a+b,0)/4).toFixed(3)};
    // Profit per minute in units of the slot/poker stake cap: slot = (EV-1) x spins per minute; mahjong = (EV-1) x 5 (its stake cap) / minutes per game.
    const minutes=MAHJONG_MODES[mode].minutes,mjPerMin=(out[mode+'/'+level].shippedRefEV-1)*MAHJONG_BET_MULTIPLIER/minutes;
    const slotFast=(exactSlotReturn()-1)*60/(CASINO_POLICY.slotMs/1000),slotTapping=(exactSlotReturn()-1)*60/2.5;
    Object.assign(out[mode+'/'+level],{minutes,profitPerMinute:+mjPerMin.toFixed(3),slotFastPerMinute:+slotFast.toFixed(2),slotTappingPerMinute:+slotTapping.toFixed(2),ratioVsSlotFast:+(mjPerMin/slotFast).toFixed(3),ratioVsSlotTapping:+(mjPerMin/slotTapping).toFixed(3)});
    console.error(mode+'/'+level+' done');
  }
  const json=JSON.stringify(out,null,1);if(outFile)(await import('node:fs')).writeFileSync(outFile,json);else console.log(json);
}
