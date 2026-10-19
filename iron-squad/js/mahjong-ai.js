// v7.1.0: Mahjong CPUs. They only ever see a `view` (own tiles, rivers, riichi calls, dora indicator, points) — never the wall or other hands.
import {countsOf,shanten,waitsOf,evaluateHand,isHonor,isTerminal,RIICHI_STICK} from './mahjong-rules.js?v=318';
const CPU_RIICHI_MIN_WALL=4;
/** Share of discards where the novice picks a random not-much-worse tile instead of the best one. */
export const NOVICE_SLOPPY=0.1;
const seenCounts=(view)=>{const c=countsOf(view.hand);if(view.drawn>=0)c[view.drawn]++;for(const r of view.rivers)for(const t of r)c[t]++;c[view.doraInd]++;return c;};
const isYakuhai=(view,t)=>t>=31||t===view.roundWind||t===view.seatWind;
/** How much we want to keep a tile (higher = keep). Cheap tiles to throw first: lone honours, then terminals, then the edges. */
function keepValue(view,hand14,t) {
  const n=hand14[t];
  if(isHonor(t))return isYakuhai(view,t)?(n>=2?9:2.5):(n>=2?4:0.5);
  const pos=t%9,dist=Math.min(pos,8-pos);
  let v=1.5+dist*0.7;
  if(n>=2)v+=1.5;
  const suitStart=t-pos;
  for(const d of [-2,-1,1,2]){const q=pos+d;if(q>=0&&q<=8&&hand14[suitStart+q]>0)v+=Math.abs(d)===1?1.2:0.6;}
  if(t===view.doraTile)v+=3;
  return v;
}
/** Danger of throwing tile t against riichi players (lower = safer). Genbutsu 0, then late honours, terminals, suji, the rest. */
function danger(view,t,seen) {
  const riichiSeats=[0,1,2,3].filter(s=>s!==view.seat&&view.riichi[s]);
  if(!riichiSeats.length)return 0;
  let worst=0;
  for(const s of riichiSeats){
    const river=view.rivers[s];let d;
    if(river.includes(t))d=0;
    else if(isHonor(t))d=seen[t]>=3?1:seen[t]>=2?2:3.5;
    else {
      const pos=t%9,start=t-pos,has=q=>q>=0&&q<=8&&river.includes(start+q);
      const suji=pos<=2?has(pos+3):pos>=6?has(pos-3):has(pos-3)&&has(pos+3);
      d=isTerminal(t)?(suji?2:4.5):suji?4:pos===1||pos===7?7:8;
    }
    if(t===view.doraTile)d+=1.5;
    worst=Math.max(worst,d);
  }
  return worst;
}
function ukeire(view,c13,best,seen) {
  let n=0;
  for(let x=0;x<34;x++){
    if(c13[x]>=4||seen[x]>=4)continue;
    if(x<27){const pos=x%9,s=x-pos;let near=c13[x]>0;for(let d=-2;d<=2&&!near;d++){const q=pos+d;if(q>=0&&q<=8&&c13[s+q]>0)near=true;}if(!near)continue;}
    else if(!c13[x])continue;
    c13[x]++;const sh=shanten(c13);c13[x]--;
    if(sh<best)n+=4-seen[x];
  }
  return n;
}
/** view → {action:'tsumo'} | {action:'discard',tile,riichi}. level: 'novice' (efficient but sloppy, no defence) | 'adept' (efficiency + ukeire + basic defence). */
export function chooseAction(view,level,rand=Math.random) {
  const c14=countsOf(view.hand);if(view.drawn>=0)c14[view.drawn]++;
  const ctx={winTile:view.drawn,tsumo:true,riichi:view.riichi[view.seat],seatWind:view.seatWind,roundWind:view.roundWind,dora:[view.doraTile]};
  if(view.drawn>=0&&evaluateHand(c14,ctx))return {action:'tsumo'};
  if(view.riichi[view.seat])return {action:'discard',tile:view.drawn,riichi:false};
  const adept=level!=='novice',full=level==='adept',seen=seenCounts(view),cands=[];
  for(let t=0;t<34;t++){if(!c14[t])continue;c14[t]--;cands.push({t,sh:shanten(c14)});c14[t]++;}
  const best=Math.min(...cands.map(x=>x.sh));
  const opp=[0,1,2,3].some(s=>s!==view.seat&&view.riichi[s]);
  let pick;
  if(!adept){
    if(rand()<NOVICE_SLOPPY){const pool=cands.filter(x=>x.sh<=best+1);pick=pool[Math.floor(rand()*pool.length)];}
    else{const pool=cands.filter(x=>x.sh===best).map(x=>({...x,v:keepValue(view,c14,x.t)+rand()*0.4}));pool.sort((a,b)=>a.v-b.v);pick=pool[0];}
  } else if(opp&&best>=1){
    // Not tenpai against a riichi: fold — the safest tile, lower shanten and lower keep value as tie-breaks.
    const pool=cands.map(x=>({...x,d:danger(view,x.t,seen),v:keepValue(view,c14,x.t)}));pool.sort((a,b)=>a.d-b.d||a.sh-b.sh||a.v-b.v);pick=pool[0];
  } else {
    const pool=cands.filter(x=>x.sh===best);
    for(const x of pool){c14[x.t]--;x.u=full?ukeire(view,c14,best,seen):0;c14[x.t]++;x.d=opp?danger(view,x.t,seen):0;x.v=keepValue(view,c14,x.t);x.score=x.u*2-x.d*1.4-x.v*0.35;}
    pool.sort((a,b)=>b.score-a.score);pick=pool[0];
  }
  let riichi=false;
  if(pick.sh===0&&view.points[view.seat]>=RIICHI_STICK&&view.wallLeft>=CPU_RIICHI_MIN_WALL){
    c14[pick.t]--;const waits=waitsOf(c14),left=waits.reduce((n,w)=>n+4-seen[w],0);c14[pick.t]++;
    riichi=adept?left>=2:true;
  }
  return {action:'discard',tile:pick.t,riichi};
}
export const mahjongAi=Object.freeze({choose:chooseAction});
/** A deliberately bad player for calibration: throws a random tile, never riichi. Wins when it can. */
export const randomPolicy=(rand)=>(view)=>{
  const c14=countsOf(view.hand);if(view.drawn>=0)c14[view.drawn]++;
  if(view.drawn>=0&&evaluateHand(c14,{winTile:view.drawn,tsumo:true,riichi:view.riichi[view.seat],seatWind:view.seatWind,roundWind:view.roundWind,dora:[view.doraTile]}))return {action:'tsumo'};
  const all=[...view.hand,view.drawn].filter(t=>t>=0);return {action:'discard',tile:all[Math.floor(rand()*all.length)],riichi:false};
};
/** The reference player used to calibrate the payouts: 'basic' = tile efficiency + simple defence (folds against riichi), but no ukeire counting, so it sits between novice and adept. */
export const referencePolicy=(rand)=>(view)=>chooseAction(view,'basic',rand);
