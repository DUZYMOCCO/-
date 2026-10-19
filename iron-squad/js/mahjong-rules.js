// v7.1.0: Mahjong (4 players, you vs 3 CPUs, closed hands only). Pure rules + a serialisable, deterministic game state.
// Tiles: 0-8 manzu, 9-17 pinzu, 18-26 souzu, 27-30 winds (E S W N), 31-33 dragons (haku hatsu chun). 136 tiles, 4 of each.
export const MAHJONG_START_POINTS=25000,MAHJONG_TOTAL_POINTS=100000,RIICHI_STICK=1000,WALL_SIZE=136,LIVE_END=122,DORA_INDEX=130,ROUND_WIND=27;
export const MAHJONG_MODES=Object.freeze({full:{key:'full',name:'東風戦',hands:4,minutes:7},short:{key:'short',name:'1局戦',hands:1,minutes:2}});
export const MAHJONG_LEVELS=Object.freeze({novice:{key:'novice',name:'見習い'},adept:{key:'adept',name:'雀士'}});
/** Payout multiples by finishing place (1st..4th) x bet. Calibrated by tools/mahjong-calibrate.mjs: the reference player (basic defence) returns about 1.15 against novice
 *  and 1.25 against adept, a random player well under 1. Winner-take-all shaped because a game takes minutes, not seconds. The one-hand game pays less at the top. */
export const MAHJONG_PAYOUT=Object.freeze({
  full:Object.freeze({novice:Object.freeze([3.2,0.4,0.1,0]),adept:Object.freeze([5,0.6,0.15,0])}),
  short:Object.freeze({novice:Object.freeze([3,0.9,0.3,0]),adept:Object.freeze([4.3,1,0.4,0])})
});
export const MAHJONG_TOP_MULTIPLE=Math.max(...Object.values(MAHJONG_PAYOUT).flatMap(m=>Object.values(m).map(t=>t[0])));
export const mahjongPayout=(mode,level,rank,bet)=>Math.round((Number(bet)||0)*((MAHJONG_PAYOUT[mode]?.[level]||[0,0,0,0])[Math.max(1,Math.min(4,rank))-1]||0));
export const TILE_CHARS=['一','二','三','四','五','六','七','八','九','①','②','③','④','⑤','⑥','⑦','⑧','⑨','1','2','3','4','5','6','7','8','9','東','南','西','北','白','\u767c','中'];
export const tileSuit=t=>t<27?Math.floor(t/9):3,tileNum=t=>t<27?t%9+1:0,isHonor=t=>t>=27,isTerminal=t=>t<27&&(t%9===0||t%9===8);
export const SUIT_LABEL=['\u842c','\u7b52','\u7d22'];
export const tileFace=t=>t<9?{n:String(t+1),s:'\u842c',suit:'m'}:t<18?{n:String(t-8),s:'\u7b52',suit:'p'}:t<27?{n:String(t-17),s:'\u7d22',suit:'s'}:{n:TILE_CHARS[t],s:'',suit:t>=33?'r':t===32?'g':t===31?'w':'h'};
export const doraTile=ind=>ind<27?(ind%9===8?ind-8:ind+1):ind<31?27+(ind-27+1)%4:31+(ind-31+1)%3;
export function mulberry32(seed) {let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function makeWall(seed,hand=0) {
  const wall=Array.from({length:WALL_SIZE},(_,i)=>Math.floor(i/4)),rand=mulberry32((seed>>>0)^Math.imul(hand+1,0x9E3779B1));
  for(let i=wall.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[wall[i],wall[j]]=[wall[j],wall[i]];}
  return wall;
}
export const countsOf=tiles=>{const c=new Array(34).fill(0);for(const t of tiles)c[t]++;return c;};
// ---------------- completion, decomposition, shanten ----------------
function canMelds(c,i=0) {
  while(i<34&&c[i]===0)i++;
  if(i>=34)return true;
  if(c[i]>=3){c[i]-=3;const ok=canMelds(c,i);c[i]+=3;if(ok)return true;}
  if(i<27&&i%9<=6&&c[i+1]>0&&c[i+2]>0){c[i]--;c[i+1]--;c[i+2]--;const ok=canMelds(c,i);c[i]++;c[i+1]++;c[i+2]++;if(ok)return true;}
  return false;
}
export const isChiitoi=c=>{let n=0;for(let i=0;i<34;i++){if(c[i]===0)continue;if(c[i]!==2)return false;n++;}return n===7;};
/** True for a complete 14-tile hand: four melds + a pair, or seven distinct pairs. */
export function isComplete(c) {
  if(isChiitoi(c))return true;
  for(let p=0;p<34;p++)if(c[p]>=2){c[p]-=2;const ok=canMelds(c);c[p]+=2;if(ok)return true;}
  return false;
}
/** Every way to read a complete hand as a pair + four melds ({k:'s'|'t',t}); chiitoi is not included. */
export function decompositions(c) {
  const out=[];
  const rest=(i,melds,pair)=>{
    while(i<34&&c[i]===0)i++;
    if(i>=34){out.push({pair,melds:melds.slice()});return;}
    if(c[i]>=3){c[i]-=3;melds.push({k:'t',t:i});rest(i,melds,pair);melds.pop();c[i]+=3;}
    if(i<27&&i%9<=6&&c[i+1]>0&&c[i+2]>0){c[i]--;c[i+1]--;c[i+2]--;melds.push({k:'s',t:i});rest(i,melds,pair);melds.pop();c[i]++;c[i+1]++;c[i+2]++;}
  };
  for(let p=0;p<34;p++)if(c[p]>=2){c[p]-=2;rest(0,[],p);c[p]+=2;}
  return out;
}
// Per-suit table (memoised): best number of taatsu t for every (melds m, head h) reading of one suit's tiles; index m*2+h, -1 = impossible.
const suitCache=new Map();
function suitBest(c,off,seq) {
  const n=seq?9:7;let key=seq?1:0;for(let i=0;i<n;i++)key=key*5+c[off+i];
  let r=suitCache.get(key);if(r)return r;
  r=new Int8Array(10).fill(-1);const a=[];for(let i=0;i<n;i++)a.push(c[off+i]);
  const scan=(i,m,t,pair)=>{
    while(i<n&&a[i]===0)i++;
    if(i>=n){const k=m*2+(pair?1:0);if(t>r[k])r[k]=t;return;}
    if(a[i]>=3){a[i]-=3;scan(i,m+1,t,pair);a[i]+=3;}
    if(seq&&i<=6&&a[i+1]>0&&a[i+2]>0){a[i]--;a[i+1]--;a[i+2]--;scan(i,m+1,t,pair);a[i]++;a[i+1]++;a[i+2]++;}
    if(!pair&&a[i]>=2){a[i]-=2;scan(i,m,t,true);a[i]+=2;}
    if(a[i]>=2){a[i]-=2;scan(i,m,t+1,pair);a[i]+=2;}
    if(seq&&i<=7&&a[i+1]>0){a[i]--;a[i+1]--;scan(i,m,t+1,pair);a[i]++;a[i+1]++;}
    if(seq&&i<=6&&a[i+2]>0){a[i]--;a[i+2]--;scan(i,m,t+1,pair);a[i]++;a[i+2]++;}
    a[i]--;scan(i,m,t,pair);a[i]++;
  };
  scan(0,0,0,false);
  if(suitCache.size>150000)suitCache.clear();
  suitCache.set(key,r);return r;
}
function shantenRegular(c) {
  let dp=new Int8Array(10).fill(-1);dp[0]=0;
  for(const [off,seq] of [[0,true],[9,true],[18,true],[27,false]]){
    const tbl=suitBest(c,off,seq),nd=new Int8Array(10).fill(-1);
    for(let k1=0;k1<10;k1++){if(dp[k1]<0)continue;
      for(let k2=0;k2<10;k2++){if(tbl[k2]<0)continue;
        const m=(k1>>1)+(k2>>1),p=(k1&1)+(k2&1);if(m>4||p>1)continue;
        const k=m*2+p,v=Math.min(8,dp[k1]+tbl[k2]);if(v>nd[k])nd[k]=v;}}
    dp=nd;
  }
  let best=8;
  for(let k=0;k<10;k++){if(dp[k]<0)continue;const m=k>>1,p=k&1,s=8-2*m-Math.min(dp[k],4-m)-p;if(s<best)best=s;}
  return best;
}
export function shantenChiitoi(c) {let pairs=0,kinds=0;for(let i=0;i<34;i++){if(c[i]>0)kinds++;if(c[i]>=2)pairs++;}return 6-pairs+Math.max(0,7-kinds);}
/** Shanten of a 13- or 14-tile hand (14 tiles: -1 = complete). Four-of-a-kind counts as given; no kokushi. */
export const shanten=c=>Math.min(shantenRegular(c),shantenChiitoi(c));
/** Tiles that complete a 13-tile hand (ignores yaku and furiten). */
export function waitsOf(c) {
  const out=[];
  for(let t=0;t<34;t++){if(c[t]>=4)continue;c[t]++;if(isComplete(c))out.push(t);c[t]--;}
  return out;
}
// ---------------- yaku and scoring (closed hands, fixed fu) ----------------
export const YAKU_NAMES=Object.freeze({riichi:'リーチ',tsumo:'ツモ',pinfu:'ピンフ',tanyao:'タンヤオ',iipeikou:'イーペーコー',chiitoi:'チートイツ',dora:'ドラ'});
export const HONOR_NAMES=Object.freeze({27:'トン',28:'ナン',29:'シャー',30:'ペー',31:'ハク',32:'ハツ',33:'チュン'});
const ryanmen=(decomp,win)=>decomp.melds.some(m=>{if(m.k!=='s'||win<m.t||win>m.t+2)return false;const pos=win-m.t;return pos===1?false:pos===0?m.t%9!==6:m.t%9!==0;});
function yakuOfForm(c,form,ctx) {
  const list=[];
  if(ctx.riichi)list.push(['riichi','リーチ',1]);
  if(ctx.tsumo)list.push(['tsumo','ツモ',1]);
  let tanyao=true;for(let t=0;t<34;t++)if(c[t]>0&&(t>=27||isTerminal(t))){tanyao=false;break;}
  if(tanyao)list.push(['tanyao','タンヤオ',1]);
  if(form==='chiitoi')list.push(['chiitoi','チートイツ',2]);
  else {
    const seqs=form.melds.filter(m=>m.k==='s');
    if(seqs.length===4&&!(form.pair>=31||form.pair===ctx.seatWind||form.pair===ctx.roundWind)&&ryanmen(form,ctx.winTile))list.push(['pinfu','ピンフ',1]);
    if(seqs.some((m,i)=>seqs.findIndex(o=>o.t===m.t)!==i))list.push(['iipeikou','イーペーコー',1]);
    for(const m of form.melds){if(m.k!=='t')continue;
      if(m.t>=31)list.push(['yakuhai',`役牌 ${HONOR_NAMES[m.t]}`,1]);
      if(m.t===ctx.roundWind)list.push(['yakuhai',`役牌 ${HONOR_NAMES[m.t]}（場風）`,1]);
      if(m.t===ctx.seatWind)list.push(['yakuhai',`役牌 ${HONOR_NAMES[m.t]}（自風）`,1]);}
  }
  return list;
}
/** Best reading of a complete 14-tile hand. null = not complete, or no yaku (dora alone never wins). ctx: {winTile,tsumo,riichi,seatWind,roundWind,dora:[tile…]} */
export function evaluateHand(c,ctx) {
  if(!isComplete(c))return null;
  const forms=decompositions(c);if(isChiitoi(c))forms.push('chiitoi');
  let best=null;
  for(const form of forms){
    const yaku=yakuOfForm(c,form,ctx);if(!yaku.length)continue;
    const han=yaku.reduce((n,y)=>n+y[2],0);
    if(!best||han>best.yakuHan)best={yaku,yakuHan:han,form};
  }
  if(!best)return null;
  const doras=(ctx.dora||[]).reduce((n,t)=>n+c[t],0),list=best.yaku.map(([key,name,han])=>({key,name,han}));
  if(doras)list.push({key:'dora',name:`ドラ ${doras}`,han:doras});
  return {han:best.yakuHan+doras,yakuHan:best.yakuHan,doras,yaku:list,chiitoi:best.form==='chiitoi'};
}
const CHILD_RON=[0,1000,2000,3900,7700,8000,12000,12000,16000,16000,16000,24000,24000,32000];
const DEALER_RON=[0,1500,2900,5800,11600,12000,18000,18000,24000,24000,24000,36000,36000,48000];
/** Simplified score: han only (fu fixed). Ron amount for a child / the dealer; 13+ han is capped. */
export const handPoints=(han,dealer)=>(dealer?DEALER_RON:CHILD_RON)[Math.max(1,Math.min(13,Math.floor(han)))];
const up100=n=>Math.ceil(n/100)*100;
/** Wallet changes (without riichi sticks) for one win. loser=null means tsumo. */
export function winDeltas(winner,loser,han,dealer) {
  const d=[0,0,0,0],T=handPoints(han,winner===dealer);
  if(loser!=null){d[loser]-=T;d[winner]+=T;return d;}
  for(let s=0;s<4;s++){if(s===winner)continue;const pay=winner===dealer?up100(T/3):s===dealer?up100(T/2):up100(T/4);d[s]-=pay;d[winner]+=pay;}
  return d;
}
// ---------------- game state ----------------
const sortTiles=a=>a.sort((x,y)=>x-y);
const seatWindOf=(h,seat)=>27+((seat-h.dealer+4)%4);
function wallOf(st) {
  if(!st.h._wall||st.h._wallHand!==st.hand){Object.defineProperty(st.h,'_wall',{value:makeWall(st.seed,st.hand),enumerable:false,writable:true,configurable:true});Object.defineProperty(st.h,'_wallHand',{value:st.hand,enumerable:false,writable:true,configurable:true});}
  return st.h._wall;
}
const dealerOfHand=(st,hand)=>(st.firstDealer+hand)%4;
function dealHand(st) {
  const wall=makeWall(st.seed,st.hand),hands=[0,1,2,3].map(s=>sortTiles(wall.slice(s*13,s*13+13)));
  st.h={dealer:dealerOfHand(st,st.hand),hands,rivers:[[],[],[],[]],riichi:[false,false,false,false],furitenTemp:[false,false,false,false],furitenPerm:[false,false,false,false],pos:52,turn:0,drawn:-1,doraInd:wall[DORA_INDEX],claim:null};
  st.h.turn=st.h.dealer;st.h.drawn=wall[st.h.pos++];st.stage='act';st.result=null;
  wallOf(st);
}
export function newMahjong({mode='full',level='novice',bet=10,seed=Math.floor(Math.random()*4294967296)}={}) {
  const st={v:1,mode:MAHJONG_MODES[mode]?mode:'full',level:MAHJONG_LEVELS[level]?level:'novice',bet:Math.max(1,Math.floor(bet)),seed:seed>>>0,hand:0,firstDealer:0,points:[25000,25000,25000,25000],pot:0,stage:'act',over:false,abandoned:false,ranks:null,payout:0,paid:false,h:null,result:null};
  st.firstDealer=st.mode==='short'?(st.seed>>>5)%4:0;dealHand(st);return st;
}
export const handsTotal=st=>MAHJONG_MODES[st.mode].hands;
const ctxFor=(st,seat,tsumo,winTile)=>({winTile,tsumo,riichi:st.h.riichi[seat],seatWind:seatWindOf(st.h,seat),roundWind:ROUND_WIND,dora:[doraTile(st.h.doraInd)]});
const with14=(st,seat,tile)=>{const c=countsOf(st.h.hands[seat]);c[tile]++;return c;};
export function isFuriten(st,seat) {
  const h=st.h;if(h.furitenTemp[seat]||h.furitenPerm[seat])return true;
  const w=waitsOf(countsOf(h.hands[seat]));return w.some(t=>h.rivers[seat].includes(t));
}
/** Evaluate a ron by `seat` on `tile` (null when not allowed: no yaku, not a win, or furiten). */
export function ronInfo(st,seat,tile) {
  const info=evaluateHand(with14(st,seat,tile),ctxFor(st,seat,false,tile));
  return info&&!isFuriten(st,seat)?info:null;
}
export function tsumoInfo(st,seat=st.h.turn) {
  if(st.stage!=='act'||st.h.turn!==seat||st.h.drawn<0)return null;
  return evaluateHand(with14(st,seat,st.h.drawn),ctxFor(st,seat,true,st.h.drawn));
}
export const liveWallLeft=st=>Math.max(0,LIVE_END-st.h.pos);
/** Tiles of the current 14 that may be thrown with riichi (the hand stays closed and is tenpai afterwards). */
export function riichiOptions(st,seat=st.h.turn) {
  const h=st.h;if(st.stage!=='act'||h.turn!==seat||h.riichi[seat]||st.points[seat]<RIICHI_STICK||liveWallLeft(st)<4)return [];
  const c=with14(st,seat,h.drawn),out=[];
  for(let t=0;t<34;t++){if(!c[t])continue;c[t]--;if(waitsOf(c).length)out.push(t);c[t]++;}
  return out;
}
export function discardWaits(st,seat,tile) {
  const c=with14(st,seat,st.h.drawn>=0?st.h.drawn:tile);if(!c[tile])return [];c[tile]--;return waitsOf(c);
}
export const currentWaits=(st,seat=0)=>waitsOf(countsOf(st.h.hands[seat]));
function takeTile(st,seat,tile) {
  const h=st.h;
  if(h.drawn===tile){h.drawn=-1;return true;}
  const i=h.hands[seat].indexOf(tile);if(i<0)return false;
  h.hands[seat].splice(i,1);if(h.drawn>=0){h.hands[seat].push(h.drawn);sortTiles(h.hands[seat]);}h.drawn=-1;return true;
}
function applyDeltas(st,deltas){for(let s=0;s<4;s++)st.points[s]+=deltas[s];}
function endWin(st,winner,loser,tile,info) {
  const h=st.h,deltas=winDeltas(winner,loser,info.han,h.dealer);deltas[winner]+=st.pot;const pot=st.pot;st.pot=0;applyDeltas(st,deltas);
  st.result={type:loser==null?'tsumo':'ron',winner,loser,tile,han:info.han,yaku:info.yaku,deltas,pot,hand:[...h.hands[winner]],dealer:h.dealer};
  st.stage='result';return st.result;
}
function endDraw(st) {
  const h=st.h,tenpai=[0,1,2,3].map(s=>waitsOf(countsOf(h.hands[s])).length>0),k=tenpai.filter(Boolean).length,deltas=[0,0,0,0];
  if(k>0&&k<4)for(let s=0;s<4;s++)deltas[s]=tenpai[s]?3000/k:-3000/(4-k);
  applyDeltas(st,deltas);st.result={type:'draw',tenpai,deltas,hands:h.hands.map((x,s)=>tenpai[s]?[...x]:null),dealer:h.dealer};st.stage='result';return st.result;
}
function advanceTurn(st,from) {
  const h=st.h;h.claim=null;
  if(h.pos>=LIVE_END)return endDraw(st);
  h.turn=(from+1)%4;h.drawn=wallOf(st)[h.pos++];st.stage='act';return null;
}
function resolveRon(st,from,tile,queue) {
  const h=st.h;
  while(queue.length){
    const s=queue.shift(),info=ronInfo(st,s,tile);if(!info)continue;
    if(s===0){h.claim={tile,from,queue:[...queue]};st.stage='ron';return {t:'ronChoice'};}
    endWin(st,s,from,tile,info);return {t:'ron',seat:s};
  }
  advanceTurn(st,from);return null;
}
function discardTile(st,seat,tile,riichi) {
  const h=st.h;
  if(riichi&&!riichiOptions(st,seat).includes(tile))riichi=false;
  if(!takeTile(st,seat,tile))return null;
  if(riichi){h.riichi[seat]=true;st.points[seat]-=RIICHI_STICK;st.pot+=RIICHI_STICK;}
  h.rivers[seat].push(tile);h.furitenTemp[seat]=false;
  const queue=[1,2,3].map(o=>(seat+o)%4);
  const ev=resolveRon(st,seat,tile,queue);
  return {t:'discard',seat,tile,riichi,next:ev};
}
export function humanDiscard(st,tile,riichi=false) {
  const h=st.h;if(st.stage!=='act'||h.turn!==0||h.drawn<0)return null;
  if(h.riichi[0]&&tile!==h.drawn)return null;
  if(tile!==h.drawn&&!h.hands[0].includes(tile))return null;
  return discardTile(st,0,tile,!!riichi);
}
export function humanTsumo(st) {const info=tsumoInfo(st,0);if(!info)return null;endWin(st,0,null,st.h.drawn,info);return {t:'tsumo',seat:0};}
export function humanRon(st) {
  if(st.stage!=='ron'||!st.h.claim)return null;const {tile,from}=st.h.claim,info=ronInfo(st,0,tile);if(!info)return null;
  st.h.claim=null;endWin(st,0,from,tile,info);return {t:'ron',seat:0};
}
export function humanPass(st) {
  const h=st.h;if(st.stage!=='ron'||!h.claim)return null;const {tile,from,queue}=h.claim;
  h.furitenTemp[0]=true;if(h.riichi[0])h.furitenPerm[0]=true;h.claim=null;st.stage='act';
  return resolveRon(st,from,tile,[...queue])||{t:'pass'};
}
/** What a CPU at `seat` may know: its own tiles, the rivers, riichi calls, dora indicator, points. Never the wall or other hands. */
export function viewFor(st,seat) {
  const h=st.h;
  return {seat,hand:[...h.hands[seat]],drawn:h.drawn,rivers:h.rivers.map(r=>[...r]),riichi:[...h.riichi],dealer:h.dealer,doraInd:h.doraInd,doraTile:doraTile(h.doraInd),points:[...st.points],
    wallLeft:liveWallLeft(st),seatWind:seatWindOf(h,seat),roundWind:ROUND_WIND,turn:h.turn};
}
const rngFor=st=>mulberry32((st.seed>>>0)^Math.imul(st.h.pos+1,0x85EBCA6B)^Math.imul(st.hand+7,0xC2B2AE35)^(st.h.turn<<3));
/** One automatic action (a CPU turn, a forced riichi tsumogiri). null = waiting for the player (or the hand/game is over). */
export function mahjongStep(st,ai) {
  const h=st.h;
  if(st.over||st.stage!=='act')return null;
  const seat=h.turn;
  if(seat===0){
    if(!h.riichi[0])return null;
    if(tsumoInfo(st,0))return null;
    return discardTile(st,0,h.drawn,false);
  }
  const act=ai.choose(viewFor(st,seat),st.level,rngFor(st));
  if(act.action==='tsumo'){const info=tsumoInfo(st,seat);if(info){endWin(st,seat,null,h.drawn,info);return {t:'tsumo',seat};}}
  const own=new Set([...h.hands[seat],h.drawn]);
  const tile=act.action==='discard'&&own.has(act.tile)?act.tile:h.drawn;
  return discardTile(st,seat,tile,!!act.riichi&&act.action==='discard');
}
/** Ranks by points; ties go to the seat that comes first in turn order from the first dealer (??). */
export function rankPlayers(points,first=0) {
  const pri=s=>(s-first+4)%4;
  const order=[0,1,2,3].sort((a,b)=>points[b]-points[a]||pri(a)-pri(b)),ranks=[0,0,0,0];order.forEach((s,i)=>{ranks[s]=i+1;});return ranks;
}
function finish(st,abandoned=false) {
  let ranks;
  if(abandoned){const others=[1,2,3].sort((a,b)=>st.points[b]-st.points[a]||(a-st.firstDealer+4)%4-(b-st.firstDealer+4)%4);ranks=[4,0,0,0];others.forEach((s,i)=>{ranks[s]=i+1;});}
  else{const top=rankPlayers(st.points,st.firstDealer).indexOf(1);st.points[top]+=st.pot;st.pot=0;ranks=rankPlayers(st.points,st.firstDealer);}
  st.ranks=ranks;st.over=true;st.abandoned=abandoned;st.stage='over';st.payout=abandoned?0:mahjongPayout(st.mode,st.level,ranks[0],st.bet);st.h.claim=null;
  return st.payout;
}
/** After a hand result: deal the next hand, or finish the game after the last one. Returns 'next' | 'over' | false. */
export function nextHand(st) {
  if(st.stage!=='result')return false;
  if(st.hand+1>=handsTotal(st)){finish(st);return 'over';}
  st.hand++;dealHand(st);return 'next';
}
export function abandonMahjong(st) {if(st.over)return st.payout;return finish(st,true);}
/** Run everything that needs no player input; `policy` (view → action) plays seat 0 (used by tests and the calibration tool). */
export function runMahjong(st,ai,policy=null,limit=100000) {
  let n=0;
  while(!st.over&&n++<limit){
    if(mahjongStep(st,ai))continue;
    if(st.stage==='act'&&st.h.turn===0){
      if(!policy)return st;
      const act=policy(viewFor(st,0),st);
      if(act.action==='tsumo'&&humanTsumo(st))continue;
      if(!humanDiscard(st,st.h.riichi[0]||act.tile==null?st.h.drawn:act.tile,!!act.riichi))humanDiscard(st,st.h.drawn,false);
    }else if(st.stage==='ron'){
      if(!policy)return st;
      if(!humanRon(st))humanPass(st);
    }else if(st.stage==='result'){
      if(!policy)return st;
      nextHand(st);
    }else break;
  }
  return st;
}
/** Validate and copy saved data (null = unusable). The tiles in play must be exactly the first `pos` tiles of the seeded wall. */
export function normalizeMahjong(data) {
  try {
    if(!data||data.v!==1||!MAHJONG_MODES[data.mode]||!MAHJONG_LEVELS[data.level])return null;
    const int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
    if(!int(data.bet,1,1e13)||!int(data.seed,0,4294967295)||!int(data.hand,0,MAHJONG_MODES[data.mode].hands-1)||!int(data.firstDealer,0,3))return null;
    if(!Array.isArray(data.points)||data.points.length!==4||!data.points.every(p=>int(p,-1e6,1e6))||!int(data.pot,0,4000))return null;
    if(!['act','ron','result','over'].includes(data.stage))return null;
    const st={v:1,mode:data.mode,level:data.level,bet:data.bet,seed:data.seed,hand:data.hand,firstDealer:data.firstDealer,points:[...data.points],pot:data.pot,stage:data.stage,over:data.stage==='over',abandoned:!!data.abandoned,
      ranks:null,payout:0,paid:!!data.paid,h:null,result:data.result&&typeof data.result==='object'?JSON.parse(JSON.stringify(data.result)):null};
    if(st.points.reduce((a,b)=>a+b,0)+st.pot!==MAHJONG_TOTAL_POINTS)return null;
    const hd=data.h;if(!hd||typeof hd!=='object')return null;
    if(!int(hd.dealer,0,3)||hd.dealer!==dealerOfHand(st,st.hand)||!int(hd.turn,0,3)||!int(hd.pos,52,WALL_SIZE)||!int(hd.drawn,-1,33))return null;
    const tile=t=>int(t,0,33),hands=hd.hands,rivers=hd.rivers;
    if(!Array.isArray(hands)||hands.length!==4||!hands.every(x=>Array.isArray(x)&&x.length===13&&x.every(tile)))return null;
    if(!Array.isArray(rivers)||rivers.length!==4||!rivers.every(x=>Array.isArray(x)&&x.length<=30&&x.every(tile)))return null;
    for(const k of ['riichi','furitenTemp','furitenPerm'])if(!Array.isArray(hd[k])||hd[k].length!==4)return null;
    const wall=makeWall(st.seed,st.hand),inPlay=countsOf([...hands.flat(),...rivers.flat(),...(hd.drawn>=0?[hd.drawn]:[])]),expect=countsOf(wall.slice(0,hd.pos));
    if(hands.flat().length+rivers.flat().length+(hd.drawn>=0?1:0)!==hd.pos||inPlay.some((n,i)=>n!==expect[i]))return null;
    if(hd.doraInd!==wall[DORA_INDEX])return null;
    st.h={dealer:hd.dealer,hands:hands.map(x=>sortTiles([...x])),rivers:rivers.map(x=>[...x]),riichi:hd.riichi.map(Boolean),furitenTemp:hd.furitenTemp.map(Boolean),furitenPerm:hd.furitenPerm.map(Boolean),pos:hd.pos,turn:hd.turn,drawn:hd.drawn,doraInd:hd.doraInd,claim:null};
    if(st.stage==='act'&&st.h.drawn<0)return null;
    if(st.stage==='ron'){const c=hd.claim;if(!c||!tile(c.tile)||!int(c.from,0,3)||!Array.isArray(c.queue)||!c.queue.every(s=>int(s,0,3)))return null;st.h.claim={tile:c.tile,from:c.from,queue:[...c.queue]};}
    if(st.stage==='result'&&!st.result)return null;
    if(st.over){
      if(!Array.isArray(data.ranks)||data.ranks.length!==4||[...data.ranks].sort().join()!=='1,2,3,4')return null;
      st.ranks=[...data.ranks];st.payout=st.abandoned?0:mahjongPayout(st.mode,st.level,st.ranks[0],st.bet);
    }
    wallOf(st);return st;
  } catch { return null; }
}
