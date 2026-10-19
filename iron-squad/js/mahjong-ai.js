// v7.1.1+: Mahjong CPUs. They only ever see a `view` (own tiles, rivers, melds, riichi calls, dora indicators, points) — never the wall or other hands.
// Levels: 'novice' (efficiency, a little sloppy, no defence), 'basic' (the calibration reference: efficiency + defence, yakuhai calls), 'adept' (+ ukeire, tanyao / flush calls),
//         'master' (+ safety reading, push/fold by hand value and rank, riichi vs dama, kan, calls with value awareness).
import {countsOf,kindCounts,shanten,waitsOf,evaluateHand,isYaochu,isHonor,isTerminal,isRedId,RIICHI_STICK} from './mahjong-rules.js?v=319';
const K=id=>id>>2;
const CPU_RIICHI_MIN_WALL=4;
/** Share of discards where the novice picks a random not-much-worse tile instead of the best one. */
export const NOVICE_SLOPPY=0.1;
const handKinds=view=>kindCounts([...view.hand,...(view.drawn>=0?[view.drawn]:[])]);
const seenCounts=view=>{
  const c=handKinds(view);
  for(const r of view.rivers)for(const id of r)c[K(id)]++;
  for(const ms of view.melds)for(const m of ms)for(const id of m.tiles)if(id!==m.called)c[K(id)]++;
  for(const id of view.doraInds)c[K(id)]++;
  return c;
};
const isYakuhai=(view,t)=>t>=31||t===view.roundWind||t===view.seatWind;
const doraCount=(view,c)=>view.doraTiles.reduce((n,t)=>n+c[t],0);
const closedOf=(view,seat=view.seat)=>view.melds[seat].every(m=>m.type==='ankan');
/** How much we want to keep a tile (higher = keep). Cheap tiles to throw first: lone honours, then terminals, then the edges. */
function keepValue(view,c,t,adv=false) {
  const n=c[t];let v;
  if(isHonor(t))v=isYakuhai(view,t)?(n>=2?9:2.5):(n>=2?4:0.5);
  else {
    const pos=t%9,dist=Math.min(pos,8-pos);v=1.5+dist*0.7;
    if(n>=2)v+=1.5;
    const start=t-pos;
    for(const d of [-2,-1,1,2]){const q=pos+d;if(q>=0&&q<=8&&c[start+q]>0)v+=Math.abs(d)===1?1.2:0.6;}
  }
  if(view.doraTiles.includes(t))v+=3*view.doraTiles.filter(x=>x===t).length;
  return v;
}
const FLUSH_PULL=0.9;
/** Danger of throwing tile kind t against the seat `p` (lower = safer): 0 for genbutsu / tiles thrown after its riichi, then honours, terminals, suji, the rest. */
function dangerVs(view,p,t,seen) {
  if(view.rivers[p].some(id=>K(id)===t))return 0;
  const at=view.riichiAt[p];
  if(view.riichi[p]&&at>=0)for(let i=at+1;i<view.log.length;i++)if(view.log[i][0]!==p&&K(view.log[i][1])===t)return 0;
  let d;
  if(isHonor(t)){const left=4-seen[t];d=left<=0?0:left===1?1.2:left===2?2.5:4;}
  else {
    const pos=t%9,start=t-pos,has=q=>q>=0&&q<=8&&view.rivers[p].some(id=>K(id)===start+q);
    const suji=pos<=2?has(pos+3):pos>=6?has(pos-3):has(pos-3)&&has(pos+3),half=pos>=3&&pos<=5&&(has(pos-3)||has(pos+3));
    d=isTerminal(t)?(suji?2:4.5):suji?(pos===1||pos===7?3.5:pos===2||pos===6?4:3.5):half?6:pos===1||pos===7?6.5:pos===2||pos===6?7.5:9;
    // kabe: the tiles next to it are all gone, so a two-sided wait through it is impossible
    const gone=q=>q>=0&&q<=8&&seen[start+q]>=4;
    if(pos<=2&&(gone(pos+1)||gone(pos+2)))d-=1.5;if(pos>=6&&(gone(pos-1)||gone(pos-2)))d-=1.5;if(pos>=3&&pos<=5&&(gone(pos-1)&&gone(pos+1)))d-=2;
  }
  if(view.doraTiles.includes(t))d+=1.5;
  if(p===view.dealer)d*=1.15;
  return Math.max(0,d);
}
/** Seats that threaten us: riichi (weight 1); master also treats a heavily-open hand as a lesser threat. */
function threatsOf(view,level) {
  const out=[];
  for(let s=0;s<4;s++){
    if(s===view.seat)continue;
    if(view.riichi[s]){out.push({seat:s,w:1});continue;}
    if(level==='master'&&true){const ms=view.melds[s].filter(m=>m.type!=='ankan');const dora=ms.reduce((n,m)=>n+m.tiles.filter(id=>view.doraTiles.includes(K(id))||isRedId(id)).length,0);if(ms.length>=3||(ms.length>=2&&dora>=1)||(ms.length>=1&&dora>=2))out.push({seat:s,w:0.55});}
  }
  return out;
}
const dangerOf=(view,t,seen,threats)=>threats.reduce((m,th)=>Math.max(m,dangerVs(view,th.seat,t,seen)*th.w),0);
function ukeire(view,c13,best,seen,M,furi=null) {
  let n=0;
  for(let x=0;x<34;x++){
    if(c13[x]>=4||seen[x]>=4)continue;
    if(x<27){const pos=x%9,s=x-pos;let near=c13[x]>0;for(let d=-2;d<=2&&!near;d++){const q=pos+d;if(q>=0&&q<=8&&c13[s+q]>0)near=true;}if(!near)continue;}
    else if(!c13[x])continue;
    c13[x]++;const sh=shanten(c13,M);c13[x]--;
    if(sh<best)n+=(4-seen[x])*(furi&&best===0&&furi.has(x)?0.3:1);
  }
  return n;
}
/** A rough hand value: dora + red + yakuhai triplets + riichi (closed). Used for push/fold and riichi/dama only. */
function roughValue(view,c14) {
  const seat=view.seat,own=[...view.hand,...(view.drawn>=0?[view.drawn]:[]),...view.melds[seat].flatMap(m=>m.tiles)];
  const all=kindCounts(own);let v=doraCount(view,all)+own.filter(isRedId).length;
  for(let t=27;t<34;t++)if(all[t]>=3&&isYakuhai(view,t))v++;
  if(closedOf(view))v+=1;
  if(all.every((n,t)=>n===0||!isYaochu(t)))v+=1;
  for(let s=0;s<3;s++){let suit=0,off=0;for(let t=0;t<27;t++){if(all[t]){if(Math.floor(t/9)===s)suit+=all[t];else off+=all[t];}}if(off===0&&suit>0)v+=closedOf(view)?4:3;}
  return v;
}
const flushSuit=(view,c)=>{let best=-1,bn=0;for(let s=0;s<3;s++){let n=0;for(let i=0;i<9;i++)n+=c[s*9+i];if(n>bn){bn=n;best=s;}}return {suit:best,n:bn};};

const HAN_PTS=[0,1000,2000,3900,7700,8000,12000,12000,16000];
/** Expected-value push/fold against a riichi (or heavily open) table: is chasing our own win worth the deal-in risk of the safest tile that keeps our shanten? */
function pushEv(view,cands,best,seen,threats,c14,M,value,others) {
  if(best>=3)return false;
  const pool=cands.filter(x=>x.sh===best);
  let pick=pool[0],minD=1e9;
  for(const x of pool){const d=dangerOf(view,x.t,seen,threats);if(d<minD){minD=d;pick=x;}}
  const w=Math.max(...threats.map(t=>t.w)),dealerThreat=threats.some(t=>t.seat===view.dealer);
  const single=view.handsTotal===1,finalHand=view.handNo===view.handsTotal-1;
  const lead=view.points[view.seat]-Math.max(...others.map(s=>view.points[s]));
  const n=Math.max(1,Math.min(8,Math.floor(view.wallLeft/4)));
  let U=0;for(let k=0;k<34;k++)U+=Math.max(0,4-seen[k]);U=Math.max(20,U);
  c14[pick.t]--;const u=ukeire(view,c14,best,seen,M);c14[pick.t]++;
  const kw=Math.min(n,5),kd=Math.min(n,2);
  let pw;
  if(best===0)pw=1-Math.pow(1-u/U,kw);
  else if(best===1)pw=(1-Math.pow(1-u/U,kw))*0.9;
  else pw=0.15;
  const p=Math.min(0.3,0.008*minD*w);
  const pdi=1-Math.pow(1-p,kd);
  let V=HAN_PTS[Math.max(1,Math.min(8,Math.round(value)))]*(view.dealer===view.seat?1.5:1)+1000+1000*view.riichi.filter(Boolean).length;
  let L=(dealerThreat?7700:5200)*Math.max(0.5,w);
  if(single){V*=1.6;L*=0.6;}else if(finalHand&&lead<-4000)V*=1.5;else if(finalHand&&lead>6000)L*=1.6;
  return pw*V>=pdi*L;
}
/** Choose what to do with our own turn. view → {action:'discard',tile(id),riichi} | {action:'ankan'|'kakan',kind} | {action:'kyuushu'}. (A win is taken by the engine.) */
export function chooseAction(view,level,rand=Math.random) {
  const seat=view.seat,M=view.melds[seat].length,c14=handKinds(view),hasDrawn=view.drawn>=0;
  const adept=level==='adept'||level==='master',smart=level!=='novice';
  const others=[0,1,2,3].filter(s=>s!==seat);
  if(view.riichi[seat]){
    if(adept&&view.opts.ankan.length)return {action:'ankan',kind:view.opts.ankan[0]};
    return {action:'discard',tile:view.drawn,riichi:false};
  }
  const seen=seenCounts(view),threats=smart?threatsOf(view,level):[];
  if(view.opts.kyuushu&&adept){const ky=[0,8,9,17,18,26,27,28,29,30,31,32,33].filter(k=>c14[k]>0).length;if(ky<=10)return {action:'kyuushu'};}
  // ---- kans ----
  if(adept&&(view.opts.ankan.length||view.opts.kakan.length)&&!others.some(s=>view.riichi[s])){
    const before=(()=>{let b=9;for(let t=0;t<34;t++){if(!c14[t])continue;c14[t]--;b=Math.min(b,shanten(c14,M));c14[t]++;}return b;})();
    for(const k of view.opts.ankan){const c=c14.slice();c[k]=0;if(shanten(c,M+1)<=before)return {action:'ankan',kind:k};}
    if(level==='master'||before<=1)for(const k of view.opts.kakan)if(before<=2)return {action:'kakan',kind:k};
  }
  // ---- discard candidates (one per kind) ----
  const ids=[...view.hand,...(hasDrawn?[view.drawn]:[])];
  const forb=view.mustDiscard?view.kuikae:[];
  let kinds=[...new Set(ids.map(K))].filter(k=>!forb.includes(k));
  if(!kinds.length)kinds=[...new Set(ids.map(K))];
  const cands=kinds.map(t=>{c14[t]--;const sh=shanten(c14,M);c14[t]++;return {t,sh};});
  const best=Math.min(...cands.map(x=>x.sh));
  const threatened=threats.length>0;
  let pick;
  const value=level==='master'?roughValue(view,c14):0;
  const lastHandBehind=level==='master'&&view.handNo===view.handsTotal-1&&Math.max(...view.points)-view.points[seat]>8000&&view.points[seat]<=Math.min(...others.map(s=>view.points[s]))+4000;
  const fold=(()=>{
    if(!threatened||best<0)return false;
    if(level==='basic'||level==='adept')return best>=1&&threats.some(t=>t.w>=1);
    if(level==='master'){
      return !pushEv(view,cands,best,seen,threats,c14,M,value,others);
    }
    return false;
  })();
  if(level==='novice'){
    if(rand()<NOVICE_SLOPPY){const pool=cands.filter(x=>x.sh<=best+1);pick=pool[Math.floor(rand()*pool.length)];}
    else{const pool=cands.filter(x=>x.sh===best).map(x=>({...x,v:keepValue(view,c14,x.t)+rand()*0.4}));pool.sort((a,b)=>a.v-b.v);pick=pool[0];}
  } else if(fold){
    const pool=cands.map(x=>({...x,d:dangerOf(view,x.t,seen,threats),v:keepValue(view,c14,x.t)}));pool.sort((a,b)=>a.d-b.d||a.sh-b.sh||a.v-b.v);pick=pool[0];
  } else {
    const pool=cands.filter(x=>x.sh===best),full=level!=='basic';
    const ownKinds=new Set(view.rivers[seat].map(K));
    const fl=level==='master'&&true?flushSuit(view,kindCounts([...ids,...view.melds[seat].flatMap(m=>m.tiles)])):null;
    for(const x of pool){
      c14[x.t]--;x.u=full?ukeire(view,c14,best,seen,M,level==='master'&&true?ownKinds:null):0;c14[x.t]++;
      x.d=threatened?dangerOf(view,x.t,seen,threats):0;x.v=keepValue(view,c14,x.t);
      x.score=x.u*2-x.d*(level==='master'?1.4:1.4)-x.v*0.35;
      if(fl&&fl.n>=8&&x.t<27&&Math.floor(x.t/9)!==fl.suit)x.score+=FLUSH_PULL*3;
      if(fl&&fl.n>=8&&x.t<27&&Math.floor(x.t/9)===fl.suit)x.score-=FLUSH_PULL*3;
      if(level==='master'&&true&&isHonor(x.t)&&!isYakuhai(view,x.t)&&c14[x.t]===1)x.score+=1.2;
    }
    pool.sort((a,b)=>b.score-a.score);pick=pool[0];
  }
  // the tile id: throw a non-red copy first, the drawn copy if all equal
  const copies=ids.filter(id=>K(id)===pick.t),tile=copies.length===1?copies[0]:(copies.filter(id=>!isRedId(id)).find(id=>id===view.drawn)??copies.find(id=>!isRedId(id))??copies[0]);
  let riichi=false;
  if(pick.sh===0&&closedOf(view)&&view.opts.riichi.includes(tile)&&view.points[seat]>=RIICHI_STICK&&view.wallLeft>=CPU_RIICHI_MIN_WALL){
    c14[pick.t]--;const waits=waitsOf(c14,M),left=waits.reduce((n,w)=>n+4-seen[w],0);
    if(level==='novice')riichi=true;
    else if(level==='basic'||level==='adept')riichi=left>=2;
    else riichi=left>=2&&!damaOk(view,c14,waits,M)&&!(threatened&&left<3&&view.wallLeft<12);
    c14[pick.t]++;
  }
  return {action:'discard',tile,riichi};
}
/** True when a closed tenpai hand is already worth declaring nothing: it has a yaku and a high value without riichi (dama is stronger / safer). */
function damaOk(view,c13,waits,M) {
  const seat=view.seat,meldIds=view.melds[seat].flatMap(m=>m.tiles);
  const base={tsumo:false,riichi:false,seatWind:view.seatWind,roundWind:view.roundWind,dora:view.doraTiles,melds:view.melds[seat].map(m=>({k:m.type==='chi'?'s':m.type==='pon'?'t':'k',t:K(m.tiles[0]),open:m.type!=='ankan'}))};
  const aka=[...view.hand,...meldIds].filter(isRedId).length;
  let ok=waits.length>0;
  for(const w of waits){
    const c=c13.slice();c[w]++;
    const info=evaluateHand(c,{...base,winTile:w,aka});
    if(!info||info.base<2000){ok=false;break;}
  }
  return ok;
}
/** Answer a call prompt. claim: {tile(id), from, pon, kan, chi:[[idA,idB],...]}. → {action:'pass'|'pon'|'kan'|'chi', ids?}. (A ron is taken by the engine.) */
export function chooseCall(view,claim,level,rand=Math.random) {
  const pass={action:'pass'},seat=view.seat,t=K(claim.tile),M=view.melds[seat].length;
  const threats=level==='novice'?[]:threatsOf(view,level),riichiThreat=threats.some(x=>x.w>=1);
  if(level==='novice'||level==='basic'){
    if((claim.pon||claim.kan)&&isYakuhai(view,t)&&!riichiThreat)return {action:'pon'};
    return pass;
  }
  const hand=kindCounts(view.hand),sh0=shanten(hand,M),closed=closedOf(view);
  const meldAll=kindCounts(view.melds[seat].flatMap(m=>m.tiles));
  const hasYakuhaiMeld=view.melds[seat].some(m=>m.type!=='chi'&&isYakuhai(view,K(m.tiles[0])));
  const yc=(c)=>c.reduce((n,x,k)=>n+(isYaochu(k)?x:0),0);
  // can this hand still win (have a yaku) after the call? rest = concealed counts after the call, add = the kinds of the new meld
  const viable=(rest,add,yakuhaiMeld)=>{
    if(hasYakuhaiMeld||yakuhaiMeld)return true;
    const melds=meldAll.map((n,k)=>n+(add[k]||0)),tot=rest.map((n,k)=>n+melds[k]),lim=1;
    if(yc(melds)===0&&yc(rest)<=lim)return true; // tanyao
    for(let s=0;s<3;s++){let off=0;for(let k=0;k<27;k++)if(tot[k]&&Math.floor(k/9)!==s)off+=tot[k];if(off<=2&&tot.slice(s*9,s*9+9).reduce((a,b)=>a+b,0)>=7)return true;} // honitsu
    return false;
  };
  const eval1=(removeKinds,add,yakuhaiMeld)=>{
    const rest=hand.slice();for(const k of removeKinds)rest[k]--;
    const addC={};for(const k of add)addC[k]=(addC[k]||0)+1;
    return {sh:shanten(rest,M+1),ok:viable(rest,addC,yakuhaiMeld)};
  };
  const options=[];
  if(claim.pon)options.push({a:{action:'pon'},kind:'pon',...eval1([t,t],[t,t,t],isYakuhai(view,t))});
  if(claim.kan&&(level==='master'||level==='adept'))options.push({a:{action:'kan'},kind:'kan',...eval1([t,t,t],[t,t,t,t],isYakuhai(view,t))});
  for(const ids of claim.chi||[]){const ks=ids.map(K);options.push({a:{action:'chi',ids},kind:'chi',...eval1(ks,[...ks,t],false)});}
  let bestOpt=null;
  for(const o of options){
    if(riichiThreat&&o.sh>0)continue;
    const faster=o.kind==='kan'?o.sh<=sh0:o.sh<sh0||(o.kind!=='chi'&&isYakuhai(view,t)&&o.sh<=sh0);
    if(!o.ok||!faster)continue;
    if(o.kind==='kan'&&!(isYakuhai(view,t)||!closed))continue;
    if(!bestOpt||o.sh<bestOpt.sh||(o.sh===bestOpt.sh&&o.kind==='pon'&&bestOpt.kind==='chi')||(o.sh===bestOpt.sh&&o.kind==='kan'&&bestOpt.kind==='pon'))bestOpt=o;
  }
  return bestOpt?bestOpt.a:pass;
}
export const mahjongAi=Object.freeze({choose:chooseAction,chooseCall});
/** A deliberately bad player for calibration: throws a random tile, never riichi, never calls. */
export const randomPolicy=rand=>(view,claim)=>{
  if(claim)return {action:'pass'};
  const all=[...view.hand,view.drawn].filter(t=>t>=0),ok=all.filter(i=>!(view.mustDiscard&&view.kuikae.includes(K(i))));
  const pool=ok.length?ok:all;return {action:'discard',tile:pool[Math.floor(rand()*pool.length)],riichi:false};
};
/** The reference player used to calibrate the payouts: 'basic' = tile efficiency + simple defence (folds against riichi) + yakuhai pons, no ukeire counting. */
export const referencePolicy=rand=>(view,claim)=>claim?chooseCall(view,claim,'basic',rand):chooseAction(view,'basic',rand);
