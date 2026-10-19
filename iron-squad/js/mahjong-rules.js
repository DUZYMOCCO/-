// v7.1.1+: Mahjong (4 players, you vs 3 CPUs). Pure rules + a serialisable, deterministic game state.
// Tiles are physical ids 0-135 (id>>2 = kind). Kinds: 0-8 manzu, 9-17 pinzu, 18-26 souzu, 27-30 winds (E S W N), 31-33 dragons (haku hatsu chun).
// Red fives: the first copy of each 5 (ids 16, 52, 88). The wall is regenerated from the seed, never saved.
export const MAHJONG_START_POINTS=25000,MAHJONG_TOTAL_POINTS=100000,RIICHI_STICK=1000,WALL_SIZE=136,LIVE_END=122,DORA_INDEX=130,ROUND_WIND=27,RINSHAN_TOP=135,HONBA_POINTS=300,MAX_DEALS=14;
export const MAHJONG_MODES=Object.freeze({full:{key:'full',name:'東風戦',hands:4,minutes:10},short:{key:'short',name:'1局戦',hands:1,minutes:2}});
export const MAHJONG_LEVELS=Object.freeze({novice:{key:'novice',name:'見習い'},adept:{key:'adept',name:'雀士'},master:{key:'master',name:'達人'}});
/** Payout multiples by finishing place (1st..4th) x bet. v7.1.4: calibrated with tools/mahjong-calibrate.mjs so the reference player (basic defence, no ukeire counting) returns about 1.15 / 1.25 / 1.35 x the stake against 見習い / 雀士 / 達人, while a random player returns well under 1 (see docs/CURRENT_WORK.md). */
export const MAHJONG_PAYOUT=Object.freeze({
  full:Object.freeze({novice:Object.freeze([2.7,0.3,0.1,0]),adept:Object.freeze([4.5,0.5,0.15,0]),master:Object.freeze([5.6,0.7,0.15,0])}),
  short:Object.freeze({novice:Object.freeze([3.5,0.4,0.1,0]),adept:Object.freeze([5.5,0.7,0.15,0]),master:Object.freeze([6.4,0.8,0.2,0])})
});
export const MAHJONG_TOP_MULTIPLE=Math.max(...Object.values(MAHJONG_PAYOUT).flatMap(m=>Object.values(m).map(t=>t[0])));
export const mahjongPayout=(mode,level,rank,bet)=>Math.round((Number(bet)||0)*((MAHJONG_PAYOUT[mode]?.[level]||[0,0,0,0])[Math.max(1,Math.min(4,rank))-1]||0));
export const TILE_CHARS=['一','二','三','四','五','六','七','八','九','①','②','③','④','⑤','⑥','⑦','⑧','⑨','1','2','3','4','5','6','7','8','9','東','南','西','北','白','\u767c','中'];
export const kindOf=id=>id>>2,isRedId=id=>id===16||id===52||id===88;
export const tileSuit=t=>t<27?Math.floor(t/9):3,tileNum=t=>t<27?t%9+1:0,isHonor=t=>t>=27,isTerminal=t=>t<27&&(t%9===0||t%9===8),isYaochu=t=>t>=27||t%9===0||t%9===8;
export const SUIT_LABEL=['\u842c','\u7b52','\u7d22'];
/** Face of a tile (kind 0-33 or id 0-135 via kindOf): number, suit character, css class. */
export const tileFace=t=>t<9?{n:String(t+1),s:'\u842c',suit:'m'}:t<18?{n:String(t-8),s:'\u7b52',suit:'p'}:t<27?{n:String(t-17),s:'\u7d22',suit:'s'}:{n:TILE_CHARS[t],s:'',suit:t>=33?'r':t===32?'g':t===31?'w':'h'};
export const doraTile=ind=>ind<27?(ind%9===8?ind-8:ind+1):ind<31?27+(ind-27+1)%4:31+(ind-31+1)%3;
export function mulberry32(seed) {let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
/** The 136 tile ids in wall order for a deal. Layout: 0-51 dealt, then draws; dead wall 122-135 (dora 130,128,.. / ura 131,129,.. / rinshan 135,134,..). */
export function makeWall(seed,deal=0) {
  const kinds=Array.from({length:WALL_SIZE},(_,i)=>i>>2),rand=mulberry32((seed>>>0)^Math.imul(deal+1,0x9E3779B1));
  for(let i=kinds.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
  const occ=new Array(34).fill(0);return kinds.map(k=>k*4+occ[k]++);
}
export const countsOf=tiles=>{const c=new Array(34).fill(0);for(const t of tiles)c[t]++;return c;};
export const kindCounts=ids=>{const c=new Array(34).fill(0);for(const t of ids)c[t>>2]++;return c;};
const sortIds=a=>a.sort((x,y)=>(x>>2)-(y>>2)||x-y);
const KOKUSHI=[0,8,9,17,18,26,27,28,29,30,31,32,33];
// ---------------- completion, decomposition, shanten (counts per kind; M = number of fixed melds outside the counted tiles) ----------------
function canMelds(c,i=0) {
  while(i<34&&c[i]===0)i++;
  if(i>=34)return true;
  if(c[i]>=3){c[i]-=3;const ok=canMelds(c,i);c[i]+=3;if(ok)return true;}
  if(i<27&&i%9<=6&&c[i+1]>0&&c[i+2]>0){c[i]--;c[i+1]--;c[i+2]--;const ok=canMelds(c,i);c[i]++;c[i+1]++;c[i+2]++;if(ok)return true;}
  return false;
}
export const isChiitoi=c=>{let n=0;for(let i=0;i<34;i++){if(c[i]===0)continue;if(c[i]!==2)return false;n++;}return n===7;};
export const isKokushi=c=>{let total=0,pair=0;for(const k of KOKUSHI){if(c[k]===0)return false;total+=c[k];if(c[k]===2)pair++;}return total===14&&pair===1;};
/** True for a complete hand: (4-M) melds + a pair, or (closed hand only) seven pairs / kokushi. */
export function isComplete(c,M=0) {
  if(M===0&&(isChiitoi(c)||isKokushi(c)))return true;
  for(let p=0;p<34;p++)if(c[p]>=2){c[p]-=2;const ok=canMelds(c);c[p]+=2;if(ok)return true;}
  return false;
}
/** Every way to read the counts as a pair + melds ({k:'s'|'t',t}); chiitoi / kokushi are not included. */
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
function shantenRegular(c,M=0) {
  let dp=new Int8Array(10).fill(-1);dp[0]=0;const cap=4-M;
  for(const [off,seq] of [[0,true],[9,true],[18,true],[27,false]]){
    const tbl=suitBest(c,off,seq),nd=new Int8Array(10).fill(-1);
    for(let k1=0;k1<10;k1++){if(dp[k1]<0)continue;
      for(let k2=0;k2<10;k2++){if(tbl[k2]<0)continue;
        const m=(k1>>1)+(k2>>1),p=(k1&1)+(k2&1);if(m>cap||p>1)continue;
        const k=m*2+p,v=Math.min(8,dp[k1]+tbl[k2]);if(v>nd[k])nd[k]=v;}}
    dp=nd;
  }
  let best=8;
  for(let k=0;k<10;k++){if(dp[k]<0)continue;const m=k>>1,p=k&1,s=8-2*(m+M)-Math.min(dp[k],4-m-M)-p;if(s<best)best=s;}
  return best;
}
export function shantenChiitoi(c) {let pairs=0,kinds=0;for(let i=0;i<34;i++){if(c[i]>0)kinds++;if(c[i]>=2)pairs++;}return 6-pairs+Math.max(0,7-kinds);}
export function shantenKokushi(c) {let kinds=0,pair=0;for(const k of KOKUSHI){if(c[k]>0)kinds++;if(c[k]>=2)pair=1;}return 13-kinds-pair;}
/** Shanten of a 13- or 14-tile hand with M fixed melds (14 tiles: -1 = complete). Seven pairs and kokushi only for closed hands. */
export const shanten=(c,M=0)=>M>0?shantenRegular(c,M):Math.min(shantenRegular(c,0),shantenChiitoi(c),shantenKokushi(c));
/** Kinds that complete a 13-tile hand (ignores yaku and furiten). `used` (counts of all visible tiles) removes kinds whose four copies are gone. */
export function waitsOf(c,M=0,used=null) {
  const out=[];
  for(let t=0;t<34;t++){if(c[t]>=4||(used&&used[t]>=4))continue;c[t]++;if(isComplete(c,M))out.push(t);c[t]--;}
  return out;
}
// ---------------- yaku, fu and scoring ----------------
export const YAKU_NAMES=Object.freeze({riichi:'リーチ',wriichi:'ダブルリーチ',ippatsu:'イッパツ',tsumo:'ツモ',pinfu:'ピンフ',tanyao:'タンヤオ',iipeikou:'イーペーコー',ryanpeikou:'リャンペーコー',chiitoi:'チートイツ',yakuhai:'役牌',
  haitei:'ハイテイ',houtei:'ホウテイ',rinshan:'リンシャン',chankan:'チャンカン',sanshoku:'サンショク',ittsu:'イッツー',chanta:'チャンタ',junchan:'ジュンチャン',toitoi:'トイトイ',sanankou:'サンアンコー',
  sanshokuDoukou:'サンショクドーコー',sankantsu:'サンカンツ',shousangen:'ショウサンゲン',honroutou:'ホンロートー',honitsu:'ホンイツ',chinitsu:'チンイツ',dora:'ドラ',aka:'アカドラ',ura:'ウラドラ',
  kokushi:'コクシムソウ',kokushi13:'ジュウサンメンマチ',daisangen:'ダイサンゲン',suuankou:'スーアンコー',suuankouTanki:'スーアンコータンキ',tsuuiisou:'ツーイーソー',ryuuiisou:'リューイーソー',chinroutou:'チンロートー',
  shousuushii:'ショウスーシー',daisuushii:'ダイスーシー',chuuren:'チューレンポートー',junseiChuuren:'ジュンセイチューレン',suukantsu:'スーカンツ',tenhou:'テンホー',chiihou:'チーホー'});
export const HONOR_NAMES=Object.freeze({27:'トン',28:'ナン',29:'シャー',30:'ペー',31:'ハク',32:'ハツ',33:'チュン'});
const GREEN=new Set([19,20,21,23,25,32]);
const allSimple=c=>{for(let t=0;t<34;t++)if(c[t]>0&&isYaochu(t))return false;return true;};
const SUIT_OF=t=>t<27?Math.floor(t/9):-1;
/** meld forms for evaluation: {k:'s'|'t'|'k', t:kind, open:bool, conc:bool}. */
function* readingsOf(c,ctx) {
  const fixed=(ctx.melds||[]).map(m=>({k:m.k,t:m.t,open:!!m.open,conc:!m.open})),w=ctx.winTile;
  if(!fixed.length&&isChiitoi(c))yield {chiitoi:true,pair:-1,melds:[],wait:'chiitoi'};
  for(const d of decompositions(c)){
    const base=d.melds.map(m=>({k:m.k,t:m.t,open:false,conc:true}));
    const mk=(idx,wait)=>{const melds=[...fixed,...base.map((m,i)=>i===idx&&m.k==='t'&&!ctx.tsumo?{...m,conc:false}:m)];return {pair:d.pair,melds,wait};};
    if(d.pair===w)yield mk(-1,'tanki');
    const seen=new Set();
    for(let i=0;i<d.melds.length;i++){
      const m=d.melds[i];if(w<m.t||w>m.t+(m.k==='s'?2:0))continue;
      const key=m.k+m.t;if(seen.has(key))continue;seen.add(key);
      if(m.k==='t')yield mk(i,'shanpon');
      else{const pos=w-m.t;yield mk(i,pos===1?'kanchan':pos===0?(m.t%9===6?'penchan':'ryanmen'):(m.t%9===0?'penchan':'ryanmen'));}
    }
  }
}
const up10=n=>Math.ceil(n/10)*10;
function fuOf(rd,ctx,menzen) {
  if(rd.chiitoi)return 25;
  const trips=rd.melds.filter(m=>m.k!=='s');
  const pinfuShape=!trips.length&&!(rd.pair>=31||rd.pair===ctx.seatWind||rd.pair===ctx.roundWind)&&rd.wait==='ryanmen';
  if(menzen&&pinfuShape)return ctx.tsumo?20:30;
  let fu=20;
  if(menzen&&!ctx.tsumo)fu+=10;if(ctx.tsumo)fu+=2;
  for(const m of rd.melds){if(m.k==='s')continue;const y=isYaochu(m.t),kan=m.k==='k';fu+=(kan?(m.conc?(y?32:16):(y?16:8)):(m.conc?(y?8:4):(y?4:2)));}
  if(rd.pair>=31)fu+=2;if(rd.pair===ctx.seatWind)fu+=2;if(rd.pair===ctx.roundWind)fu+=2;
  if(rd.wait==='kanchan'||rd.wait==='penchan'||rd.wait==='tanki')fu+=2;
  if(!menzen&&fu===20)fu=30;
  return Math.min(110,up10(fu));
}
export function basePoints(han,fu,yakuman=0) {
  if(yakuman>0)return 8000*yakuman;
  if(han>=13)return 8000;if(han>=11)return 6000;if(han>=8)return 4000;if(han>=6)return 3000;if(han>=5)return 2000;
  const b=fu*Math.pow(2,han+2);return b>=1920?2000:b;
}
export const limitOf=(han,fu,yakuman=0)=>yakuman>1?'doubleYakuman':yakuman>0?'yakuman':han>=13?'kazoe':han>=11?'sanbaiman':han>=8?'baiman':han>=6?'haneman':basePoints(han,fu)>=2000?'mangan':'';
/** Yaku + fu of one reading. Returns {yaku:[[key,han]], yakuman:[[key,n]], fu}. */
function evalReading(rd,ctx,all,menzen) {
  const yaku=[],yakuman=[],melds=rd.melds,trips=melds.filter(m=>m.k!=='s'),seqs=melds.filter(m=>m.k==='s'),kans=melds.filter(m=>m.k==='k');
  const dragons=trips.filter(m=>m.t>=31).length,winds=trips.filter(m=>m.t>=27&&m.t<=30).length,conc=trips.filter(m=>m.conc).length;
  const suits=new Set();let honors=0,terminals=0;for(let t=0;t<34;t++)if(all[t]>0){if(t<27)suits.add(SUIT_OF(t));else honors++;if(isTerminal(t))terminals++;}
  const yaochuOnly=(()=>{for(let t=0;t<34;t++)if(all[t]>0&&!isYaochu(t))return false;return true;})();
  // ---- yakuman ----
  if(ctx.tenhou)yakuman.push(['tenhou',1]);if(ctx.chiihou)yakuman.push(['chiihou',1]);
  if(dragons===3)yakuman.push(['daisangen',1]);
  if(!rd.chiitoi&&conc===4&&trips.length===4)yakuman.push([rd.wait==='tanki'?'suuankouTanki':'suuankou',rd.wait==='tanki'?2:1]);
  if(kans.length===4)yakuman.push(['suukantsu',1]);
  if(honors>0&&suits.size===0)yakuman.push(['tsuuiisou',1]);
  {let g=true;for(let t=0;t<34&&g;t++)if(all[t]>0&&!GREEN.has(t))g=false;if(g)yakuman.push(['ryuuiisou',1]);}
  if(yaochuOnly&&honors===0&&!rd.chiitoi)yakuman.push(['chinroutou',1]);
  if(winds===4)yakuman.push(['daisuushii',2]);else if(winds===3&&rd.pair>=27&&rd.pair<=30)yakuman.push(['shousuushii',1]);
  if(menzen&&!rd.chiitoi&&suits.size===1&&honors===0&&!melds.some(m=>m.open)&&!kans.length){
    const s=[...suits][0],base=[3,1,1,1,1,1,1,1,3];let ok=true,extra=-1;
    for(let i=0;i<9;i++){const n=all[s*9+i];if(n<base[i]){ok=false;break;}if(n>base[i])extra=i;}
    if(ok&&extra>=0){const without=all.slice();without[ctx.winTile]--;let pure=true;for(let i=0;i<9;i++)if(without[s*9+i]!==base[i])pure=false;yakuman.push([pure?'junseiChuuren':'chuuren',pure?2:1]);}
  }
  if(yakuman.length)return {yaku:[],yakuman,fu:0};
  // ---- normal yaku ----
  if(ctx.riichi)yaku.push([ctx.doubleRiichi?'wriichi':'riichi',ctx.doubleRiichi?2:1]);
  if(ctx.riichi&&ctx.ippatsu)yaku.push(['ippatsu',1]);
  if(ctx.tsumo&&menzen)yaku.push(['tsumo',1]);
  if(ctx.haitei)yaku.push(['haitei',1]);if(ctx.houtei)yaku.push(['houtei',1]);if(ctx.rinshan)yaku.push(['rinshan',1]);if(ctx.chankan)yaku.push(['chankan',1]);
  if(allSimple(all))yaku.push(['tanyao',1]);
  if(rd.chiitoi){yaku.push(['chiitoi',2]);if(yaochuOnly)yaku.push(['honroutou',2]);}
  else {
    const pairYaku=rd.pair>=31||rd.pair===ctx.seatWind||rd.pair===ctx.roundWind;
    if(menzen&&!trips.length&&!pairYaku&&rd.wait==='ryanmen')yaku.push(['pinfu',1]);
    if(menzen){const cnt={};for(const m of seqs)cnt[m.t]=(cnt[m.t]||0)+1;const pairs=Object.values(cnt).reduce((n,x)=>n+Math.floor(x/2),0);if(pairs>=2)yaku.push(['ryanpeikou',3]);else if(pairs===1)yaku.push(['iipeikou',1]);}
    for(const m of trips){if(m.t>=31)yaku.push(['yakuhai',1,HONOR_NAMES[m.t]]);if(m.t===ctx.roundWind)yaku.push(['yakuhai',1,HONOR_NAMES[m.t]+'（場風）']);if(m.t===ctx.seatWind)yaku.push(['yakuhai',1,HONOR_NAMES[m.t]+'（自風）']);}
    const hasS=(t)=>seqs.some(m=>m.t===t),hasT=(t)=>trips.some(m=>m.t===t);
    for(let n=0;n<7;n++)if(hasS(n)&&hasS(9+n)&&hasS(18+n)){yaku.push(['sanshoku',menzen?2:1]);break;}
    for(let s=0;s<3;s++)if(hasS(s*9)&&hasS(s*9+3)&&hasS(s*9+6)){yaku.push(['ittsu',menzen?2:1]);break;}
    if(trips.length===4)yaku.push(['toitoi',2]);
    if(conc===3)yaku.push(['sanankou',2]);
    for(let n=0;n<9;n++)if(hasT(n)&&hasT(9+n)&&hasT(18+n)){yaku.push(['sanshokuDoukou',2]);break;}
    if(kans.length===3)yaku.push(['sankantsu',2]);
    if(dragons===2&&rd.pair>=31)yaku.push(['shousangen',2]);
    if(yaochuOnly)yaku.push(['honroutou',2]);
    else if(seqs.length>0){
      const edge=m=>m.k==='s'?(m.t%9===0||m.t%9===6):isYaochu(m.t);
      if(melds.every(edge)&&isYaochu(rd.pair)){yaku.push(honors>0?['chanta',menzen?2:1]:['junchan',menzen?3:2]);}
    }
  }
  if(suits.size===1)yaku.push(honors>0?['honitsu',menzen?3:2]:['chinitsu',menzen?6:5]);
  return {yaku,yakuman,fu:fuOf(rd,ctx,menzen)};
}
/** Best reading of a complete hand. c = counts of the concealed tiles including the winning tile (14-3M tiles).
 *  ctx: {winTile,tsumo,riichi,doubleRiichi,ippatsu,seatWind,roundWind,dora:[kinds],ura:[kinds],aka,melds:[{k:'s'|'t'|'k',t,open}],haitei,houtei,rinshan,chankan,tenhou,chiihou}.
 *  null = not complete or no yaku (dora alone never wins). Result: {han,fu,yakuman,yaku:[{key,name,han}],doras,ura,aka,base,limit,menzen}. */
export function evaluateHand(c,ctx) {
  const M=(ctx.melds||[]).length,fixed=ctx.melds||[];
  if(M===0&&isKokushi(c)){
    const thirteen=c[ctx.winTile]===2,n=thirteen?2:1;
    const yaku=[{key:thirteen?'kokushi13':'kokushi',name:YAKU_NAMES[thirteen?'kokushi13':'kokushi'],han:13*n}];
    if(ctx.tenhou)yaku.push({key:'tenhou',name:YAKU_NAMES.tenhou,han:13});if(ctx.chiihou)yaku.push({key:'chiihou',name:YAKU_NAMES.chiihou,han:13});
    const ym=n+(ctx.tenhou?1:0)+(ctx.chiihou?1:0);
    return {han:13*ym,fu:0,yakuman:ym,yaku,doras:0,ura:0,aka:0,base:basePoints(13,0,ym),limit:limitOf(13,0,ym),menzen:true};
  }
  const all=c.slice();for(const m of fixed){const n=m.k==='k'?4:3;if(m.k==='s'){all[m.t]++;all[m.t+1]++;all[m.t+2]++;}else all[m.t]+=n;}
  const menzen=!fixed.some(m=>m.open);
  let best=null;
  for(const rd of readingsOf(c,ctx)){
    const r=evalReading(rd,ctx,all,menzen),ym=r.yakuman.reduce((n,x)=>n+x[1],0),yh=r.yaku.reduce((n,x)=>n+x[1],0);
    if(!ym&&!yh)continue;
    const doras=ym?0:(ctx.dora||[]).reduce((n,t)=>n+all[t],0),ura=ym||!ctx.riichi?0:(ctx.ura||[]).reduce((n,t)=>n+all[t],0),aka=ym?0:(ctx.aka||0);
    const han=ym?13*ym:yh+doras+ura+aka,base=basePoints(han,r.fu,ym);
    if(!best||base>best.base||(base===best.base&&han>best.han)||(base===best.base&&han===best.han&&r.fu>best.fu))best={r,ym,yh,doras,ura,aka,han,base,fu:r.fu};
  }
  if(!best)return null;
  const list=[];
  for(const [key,n,extra] of best.r.yakuman)list.push({key,name:YAKU_NAMES[key],han:13*n});
  for(const [key,han,extra] of best.r.yaku)list.push({key,name:extra?`${YAKU_NAMES[key]} ${extra}`:YAKU_NAMES[key],han});
  if(best.doras)list.push({key:'dora',name:YAKU_NAMES.dora,han:best.doras,count:best.doras});
  if(best.aka)list.push({key:'aka',name:YAKU_NAMES.aka,han:best.aka,count:best.aka});
  if(best.ura)list.push({key:'ura',name:YAKU_NAMES.ura,han:best.ura,count:best.ura});
  return {han:best.han,fu:best.fu,yakuman:best.ym,yaku:list,doras:best.doras,ura:best.ura,aka:best.aka,base:best.base,limit:limitOf(best.han,best.fu,best.ym),menzen};
}
const up100=n=>Math.ceil(n/100)*100;
/** Wallet changes for one win (without riichi sticks). loser=null means tsumo. `base` = basic points (see basePoints). Honba adds 300 (ron) / 100 from each payer (tsumo). */
export function scoreDeltas(winner,loser,base,dealer,honba=0) {
  const d=[0,0,0,0];
  if(loser!=null){const amt=up100(base*(winner===dealer?6:4))+HONBA_POINTS*honba;d[loser]-=amt;d[winner]+=amt;return d;}
  for(let s=0;s<4;s++){if(s===winner)continue;const pay=(winner===dealer||s===dealer?up100(base*2):up100(base))+HONBA_POINTS/3*honba;d[s]-=pay;d[winner]+=pay;}
  return d;
}
// ---------------- game state ----------------
const seatWindOf=(h,seat)=>27+((seat-h.dealer+4)%4);
const dealerOfHand=(st,hand)=>(st.firstDealer+hand)%4;
const liveEnd=h=>LIVE_END-h.kans;
export const liveWallLeft=st=>Math.max(0,liveEnd(st.h)-st.h.pos);
export const handsTotal=st=>MAHJONG_MODES[st.mode].hands;
function wallOf(st) {
  const h=st.h;
  if(!h._wall||h._wallDeal!==st.deal){Object.defineProperty(h,'_wall',{value:makeWall(st.seed,st.deal),enumerable:false,writable:true,configurable:true});Object.defineProperty(h,'_wallDeal',{value:st.deal,enumerable:false,writable:true,configurable:true});}
  return h._wall;
}
const meldForm=m=>({k:m.type==='chi'?'s':m.type==='pon'?'t':'k',t:m.tiles[0]>>2,open:m.type!=='ankan'});
const meldTiles=h=>h.melds.map(ms=>ms.flatMap(m=>m.tiles));
function dealHand(st) {
  const wall=makeWall(st.seed,st.deal),dealer=dealerOfHand(st,st.hand),f=()=>[false,false,false,false];
  const h=st.h={dealer,hands:[0,1,2,3].map(s=>sortIds(wall.slice(s*13,s*13+13))),melds:[[],[],[],[]],rivers:[[],[],[],[]],log:[],taken:[],riichi:f(),riichiAt:[-1,-1,-1,-1],wriichi:f(),ippatsu:f(),furitenTemp:f(),furitenPerm:f(),
    pos:52,kans:0,kanSeats:[0,0,0,0],doraInds:[wall[DORA_INDEX]],pendDora:0,turn:dealer,drawn:-1,fromRinshan:false,mustDiscard:false,kuikae:[],calls:0,claim:null};
  h.drawn=wall[h.pos++];st.stage='act';st.result=null;wallOf(st);
}
export function newMahjong({mode='full',level='novice',bet=10,seed=Math.floor(Math.random()*4294967296)}={}) {
  const st={v:2,mode:MAHJONG_MODES[mode]?mode:'full',level:MAHJONG_LEVELS[level]?level:'novice',bet:Math.max(1,Math.floor(bet)),seed:seed>>>0,deal:0,hand:0,honba:0,firstDealer:0,points:[25000,25000,25000,25000],pot:0,stage:'act',over:false,abandoned:false,refund:false,ranks:null,payout:0,paid:false,h:null,result:null};
  st.firstDealer=st.mode==='short'?(st.seed>>>5)%4:0;dealHand(st);return st;
}
const revealDora=st=>{const h=st.h;h.doraInds.push(wallOf(st)[DORA_INDEX-2*h.doraInds.length]);};
const uraIndicators=st=>{const w=wallOf(st),h=st.h;return h.doraInds.map((_,i)=>w[DORA_INDEX+1-2*i]);};
const usedCounts=(st,seat)=>kindCounts([...st.h.hands[seat],...st.h.melds[seat].flatMap(m=>m.tiles)]);
function ctxFor(st,seat,tsumo,winId,flags={}) {
  const h=st.h,melds=h.melds[seat].map(meldForm),riichi=h.riichi[seat];
  const aka=[...h.hands[seat],winId,...h.melds[seat].flatMap(m=>m.tiles)].filter(isRedId).length;
  const atEnd=h.pos>=liveEnd(h);
  return {winTile:winId>>2,tsumo,riichi,doubleRiichi:h.wriichi[seat],ippatsu:riichi&&h.ippatsu[seat],seatWind:seatWindOf(h,seat),roundWind:ROUND_WIND,
    dora:h.doraInds.map(i=>doraTile(i>>2)),ura:riichi?uraIndicators(st).map(i=>doraTile(i>>2)):[],aka,melds,
    haitei:tsumo&&!h.fromRinshan&&atEnd,houtei:!tsumo&&!flags.chankan&&atEnd,rinshan:tsumo&&h.fromRinshan,chankan:!!flags.chankan,
    tenhou:tsumo&&seat===h.dealer&&h.log.length===0&&h.calls===0&&!h.fromRinshan,chiihou:tsumo&&seat!==h.dealer&&h.calls===0&&h.rivers[seat].length===0&&!h.fromRinshan};
}
const with14=(st,seat,id)=>kindCounts([...st.h.hands[seat],id]);
export function isFuriten(st,seat) {
  const h=st.h;if(h.furitenTemp[seat]||h.furitenPerm[seat])return true;
  const w=waitsOf(kindCounts(h.hands[seat]),h.melds[seat].length);return w.some(t=>h.rivers[seat].some(id=>id>>2===t));
}
/** The hand a ron on `id` would score, ignoring furiten (null: not a win or no yaku). */
export function ronEval(st,seat,id,flags={}) {return evaluateHand(with14(st,seat,id),ctxFor(st,seat,false,id,flags));}
/** Ron by `seat` on tile id (null when not allowed: no yaku, not a win, or furiten). */
export function ronInfo(st,seat,id,flags={}) {const info=ronEval(st,seat,id,flags);return info&&!isFuriten(st,seat)?info:null;}
export function tsumoInfo(st,seat=st.h.turn) {
  if(st.stage!=='act'||st.h.turn!==seat||st.h.drawn<0)return null;
  return evaluateHand(with14(st,seat,st.h.drawn),ctxFor(st,seat,true,st.h.drawn));
}
/** Tile ids of the current 14 that may be thrown with riichi (the hand stays closed and is tenpai afterwards). */
export function riichiOptions(st,seat=st.h.turn) {
  const h=st.h;if(st.stage!=='act'||h.turn!==seat||h.drawn<0||h.riichi[seat]||st.points[seat]<RIICHI_STICK||liveWallLeft(st)<4||h.melds[seat].some(m=>m.type!=='ankan'))return [];
  const ids=[...h.hands[seat],h.drawn],c=kindCounts(ids),M=h.melds[seat].length,out=[];
  for(let t=0;t<34;t++){if(!c[t])continue;c[t]--;if(waitsOf(c,M,usedCounts(st,seat)).length)for(const id of ids)if(id>>2===t)out.push(id);c[t]++;}
  return out;
}
export function ankanOptions(st,seat=st.h.turn) {
  const h=st.h;if(st.stage!=='act'||h.turn!==seat||h.drawn<0||h.kans>=4||liveWallLeft(st)<1)return [];
  const c=kindCounts([...h.hands[seat],h.drawn]),M=h.melds[seat].length,out=[];
  for(let t=0;t<34;t++){
    if(c[t]!==4)continue;
    if(h.riichi[seat]){if((h.drawn>>2)!==t)continue;const hand=kindCounts(h.hands[seat]),before=waitsOf(hand,M).join();hand[t]-=3;if(before!==waitsOf(hand,M+1).join())continue;}
    out.push(t);
  }
  return out;
}
export function kakanOptions(st,seat=st.h.turn) {
  const h=st.h;if(st.stage!=='act'||h.turn!==seat||h.drawn<0||h.kans>=4||liveWallLeft(st)<1||h.riichi[seat])return [];
  const own=[...h.hands[seat],h.drawn];return h.melds[seat].filter(m=>m.type==='pon'&&own.some(id=>id>>2===m.tiles[0]>>2)).map(m=>m.tiles[0]>>2);
}
export function kyuushuOk(st,seat=st.h.turn) {
  const h=st.h;if(st.stage!=='act'||h.turn!==seat||h.drawn<0||h.calls>0||h.rivers[seat].length>0)return false;
  const c=kindCounts([...h.hands[seat],h.drawn]);return KOKUSHI.filter(k=>c[k]>0).length>=9;
}
export function ownOptions(st,seat=st.h.turn) {return {riichi:riichiOptions(st,seat),ankan:ankanOptions(st,seat),kakan:kakanOptions(st,seat),kyuushu:kyuushuOk(st,seat)};}
export function discardWaits(st,seat,id) {
  const h=st.h,ids=[...h.hands[seat],...(h.drawn>=0?[h.drawn]:[])];if(!ids.includes(id))return [];
  const c=kindCounts(ids);c[id>>2]--;return waitsOf(c,h.melds[seat].length,usedCounts(st,seat));
}
export function currentWaits(st,seat=0) {const h=st.h,M=h.melds[seat].length;if(h.hands[seat].length!==13-3*M)return [];return waitsOf(kindCounts(h.hands[seat]),M,usedCounts(st,seat));}
function takeTile(st,seat,id) {
  const h=st.h;
  if(h.drawn===id){h.drawn=-1;return true;}
  const i=h.hands[seat].indexOf(id);if(i<0)return false;
  h.hands[seat].splice(i,1);if(h.drawn>=0){h.hands[seat].push(h.drawn);sortIds(h.hands[seat]);}h.drawn=-1;return true;
}
const applyDeltas=(st,d)=>{for(let s=0;s<4;s++)st.points[s]+=d[s];};
const cloneMelds=h=>h.melds.map(ms=>ms.map(m=>({type:m.type,tiles:[...m.tiles],from:m.from,called:m.called})));
function planNext(st,res) {
  const h=st.h,dealer=h.dealer,bust=st.points.some(p=>p<0);
  const keeps=res.type==='draw'?!!res.tenpai[dealer]:res.type==='abort'?true:res.winner===dealer;
  let next;
  if(bust)next='over';
  else if(st.mode==='short')next='over';
  else if(keeps&&st.deal+1<MAX_DEALS){
    const last=st.hand===handsTotal(st)-1,top=rankPlayers(st.points,st.firstDealer)[dealer]===1;
    next=last&&top&&res.type!=='abort'?'over':'renchan';
  } else next=st.hand+1>=handsTotal(st)?'over':'advance';
  res.next=next;res.bust=bust;res.keeps=keeps;return res;
}
function endWin(st,winner,loser,tile,info,chankan=false) {
  const h=st.h;
  if(loser!=null&&!chankan&&h.riichi[loser]&&h.riichiAt[loser]===h.log.length-1){st.points[loser]+=RIICHI_STICK;st.pot-=RIICHI_STICK;h.riichi[loser]=false;}
  const deltas=scoreDeltas(winner,loser,info.base,h.dealer,st.honba),pot=st.pot;deltas[winner]+=pot;st.pot=0;applyDeltas(st,deltas);
  const res={type:loser==null?'tsumo':'ron',winner,loser,tile,han:info.han,fu:info.fu,yakuman:info.yakuman,limit:info.limit,base:info.base,yaku:info.yaku.map(y=>({key:y.key,name:y.name,han:y.han,...(y.count?{count:y.count}:{})})),deltas,pot,honba:st.honba,
    hand:[...h.hands[winner]],melds:cloneMelds(h)[winner],doraInds:[...h.doraInds],uraInds:h.riichi[winner]?uraIndicators(st):[],dealer:h.dealer,chankan};
  st.result=planNext(st,res);st.stage='result';h.claim=null;return res;
}
function endDraw(st) {
  const h=st.h,tenpai=[0,1,2,3].map(s=>waitsOf(kindCounts(h.hands[s]),h.melds[s].length,usedCounts(st,s)).length>0),k=tenpai.filter(Boolean).length,deltas=[0,0,0,0];
  if(k>0&&k<4)for(let s=0;s<4;s++)deltas[s]=tenpai[s]?3000/k:-3000/(4-k);
  applyDeltas(st,deltas);
  st.result=planNext(st,{type:'draw',tenpai,deltas,hands:h.hands.map((x,s)=>tenpai[s]?[...x]:null),melds:cloneMelds(h),dealer:h.dealer,honba:st.honba});st.stage='result';h.claim=null;return st.result;
}
function endAbort(st,reason) {
  const h=st.h;
  st.result=planNext(st,{type:'abort',reason,deltas:[0,0,0,0],dealer:h.dealer,honba:st.honba,hands:reason==='kyuushu'?h.hands.map((x,s)=>s===h.turn?[...x,h.drawn]:null):[null,null,null,null],melds:cloneMelds(h)});
  st.stage='result';h.claim=null;return st.result;
}
function advanceTurn(st,from) {
  const h=st.h;h.claim=null;
  if(h.pos>=liveEnd(h)){endDraw(st);return {t:'draw'};}
  h.turn=(from+1)%4;h.drawn=wallOf(st)[h.pos++];h.fromRinshan=false;st.stage='act';return null;
}
function drawRinshan(st,seat) {
  const h=st.h;h.drawn=wallOf(st)[RINSHAN_TOP-h.kans];h.kans++;h.fromRinshan=true;h.turn=seat;h.mustDiscard=false;h.claim=null;st.stage='act';
}
// ---------------- calls ----------------
const kindsIn=(ids,k)=>ids.filter(i=>i>>2===k);
function ponOwner(st,c) {
  const h=st.h;if(liveWallLeft(st)<1)return -1;const k=c.tile>>2;
  for(let o=1;o<4;o++){const s=(c.from+o)%4;if(!h.riichi[s]&&kindsIn(h.hands[s],k).length>=2)return s;}
  return -1;
}
/** Sequences seat can make with discarded tile id: [[idA,idB],...] (non-red copies preferred). */
export function chiOptions(st,seat,id) {
  const h=st.h,k=id>>2;if(k>=27||h.riichi[seat]||liveWallLeft(st)<1||st.h.log.length===0)return [];
  const last=h.log[h.log.length-1];if(!last||last[1]!==id||(last[0]+1)%4!==seat)return [];
  const pos=k%9,out=[],pickId=(kk,ex)=>{const l=kindsIn(h.hands[seat],kk).filter(i=>i!==ex);return l.find(i=>!isRedId(i))??l[0];};
  for(const [a,b] of [[-2,-1],[-1,1],[1,2]]){
    const p=pos+a,q=pos+b;if(p<0||q>8||p>8||q<0)continue;
    const ka=k-pos+p,kb=k-pos+q,ia=pickId(ka),ib=pickId(kb);if(ia==null||ib==null)continue;
    const rest=h.hands[seat].filter(i=>i!==ia&&i!==ib),forb=kuikaeKinds(k,ka,kb);
    if(!rest.some(i=>!forb.includes(i>>2)))continue;
    out.push([ia,ib]);
  }
  return out;
}
function kuikaeKinds(k,ka,kb) {
  const out=[k],lo=Math.min(k,ka,kb),hi=Math.max(k,ka,kb);
  if(k===lo&&k%9<=5)out.push(k+3);else if(k===hi&&k%9>=3)out.push(k-3);return out;
}
const claimOptions=(st,seat,c)=>{
  const h=st.h,k=c.tile>>2,own=kindsIn(h.hands[seat],k).length,canMeld=!h.riichi[seat]&&liveWallLeft(st)>0&&seat!==c.from;
  return {pon:canMeld&&own>=2,kan:canMeld&&own>=3&&h.kans<4,chi:chiOptions(st,seat,c.tile)};
};
function callTile(st,seat,type,used,from,called) {
  const h=st.h;
  for(const id of used)h.hands[seat].splice(h.hands[seat].indexOf(id),1);
  const idx=h.log.map(e=>e[1]).lastIndexOf(called);if(idx>=0)h.taken.push(idx);
  h.melds[seat].push({type,tiles:sortIds([...used,called]),from,called});
  h.calls++;h.ippatsu.fill(false);h.turn=seat;h.drawn=-1;h.claim=null;h.fromRinshan=false;st.stage='act';
  if(type==='minkan'){h.kanSeats[seat]++;h.pendDora++;h.mustDiscard=false;drawRinshan(st,seat);}
  else{h.mustDiscard=true;h.kuikae=type==='pon'?[called>>2]:kuikaeKinds(called>>2,used[0]>>2,used[1]>>2);}
  return {t:'call',type,seat,tile:called,from};
}
function claimStep(st,ai) {
  const h=st.h,c=h.claim;
  for(let guard=0;guard<20;guard++){
    if(c.phase==='ron'){
      const order=[1,2,3].map(o=>(c.from+o)%4),chankan=c.kind==='chankan';
      while(c.idx<3){
        const s=order[c.idx],info=ronInfo(st,s,c.tile,{chankan});
        if(!info){c.idx++;continue;}
        if(s===0){c.wait='human';c.prompt={ron:true,pon:false,kan:false,chi:[]};st.stage='claim';return {t:'claim'};}
        endWin(st,s,c.from,c.tile,info,chankan);return {t:'ron',seat:s,loser:c.from,tile:c.tile};
      }
      c.phase=chankan?'kakan':'abort';
    }
    if(c.phase==='kakan'){return finishKakan(st,c.from,c.tile);}
    if(c.phase==='abort'){
      const log=h.log;
      if(h.calls===0&&log.length===4&&log.every(e=>e[1]>>2>=27&&e[1]>>2<=30&&e[1]>>2===log[0][1]>>2)){endAbort(st,'suufon');return {t:'abort',reason:'suufon'};}
      if(h.riichi.every(Boolean)){endAbort(st,'suucha');return {t:'abort',reason:'suucha'};}
      if(h.kans===4&&!h.kanSeats.some(n=>n===4)){endAbort(st,'suukan');return {t:'abort',reason:'suukan'};}
      c.phase='pon';
    }
    if(c.phase==='pon'){
      const o=ponOwner(st,c);
      if(o>=0){
        const opt=claimOptions(st,o,c);
        if(o===0){c.wait='human';c.prompt={ron:false,pon:opt.pon,kan:opt.kan,chi:c.from===3?opt.chi:[]};if(c.prompt.chi.length)c.chiDone=true;st.stage='claim';return {t:'claim'};}
        if(!ai){c.wait='cpu';st.stage='claim';return {t:'wait'};}
        const act=ai.chooseCall(viewFor(st,o),{tile:c.tile,from:c.from,pon:opt.pon,kan:opt.kan,chi:[]},st.level,rngFor(st));
        if(act?.action==='kan'&&opt.kan){const ids=kindsIn(h.hands[o],c.tile>>2).slice(0,3);return callTile(st,o,'minkan',ids,c.from,c.tile);}
        if(act?.action==='pon'&&opt.pon){const ids=kindsIn(h.hands[o],c.tile>>2).slice(0,2);return callTile(st,o,'pon',ids,c.from,c.tile);}
      }
      c.phase='chi';
    }
    if(c.phase==='chi'){
      const n=(c.from+1)%4,opt=chiOptions(st,n,c.tile);
      if(opt.length&&!(n===0&&c.chiDone)){
        if(n===0){c.wait='human';c.prompt={ron:false,pon:false,kan:false,chi:opt};st.stage='claim';return {t:'claim'};}
        if(!ai){c.wait='cpu';st.stage='claim';return {t:'wait'};}
        const act=ai.chooseCall(viewFor(st,n),{tile:c.tile,from:c.from,pon:false,kan:false,chi:opt},st.level,rngFor(st));
        if(act?.action==='chi'&&act.ids&&opt.some(p=>p[0]===act.ids[0]&&p[1]===act.ids[1]))return callTile(st,n,'chi',act.ids,c.from,c.tile);
      }
      c.phase='end';
    }
    return advanceTurn(st,c.from);
  }
  return advanceTurn(st,c.from);
}
function discardTile(st,seat,id,riichi,ai=null) {
  const h=st.h;
  if(riichi&&!riichiOptions(st,seat).includes(id))riichi=false;
  if(!takeTile(st,seat,id))return null;
  const idx=h.log.length;h.log.push([seat,id]);h.rivers[seat].push(id);h.furitenTemp[seat]=false;h.ippatsu[seat]=false;h.mustDiscard=false;h.kuikae=[];h.fromRinshan=false;
  if(riichi){h.riichi[seat]=true;h.riichiAt[seat]=idx;h.ippatsu[seat]=true;h.wriichi[seat]=h.calls===0&&h.rivers[seat].length===1;st.points[seat]-=RIICHI_STICK;st.pot+=RIICHI_STICK;}
  while(h.pendDora>0){h.pendDora--;revealDora(st);}
  h.claim={kind:'discard',from:seat,tile:id,phase:'ron',idx:0,wait:null,prompt:null,chiDone:false};
  return {t:'discard',seat,tile:id,riichi,next:claimStep(st,ai)};
}
function doAnkan(st,seat,kind) {
  const h=st.h,ids=[...h.hands[seat],h.drawn].filter(i=>i>>2===kind);
  h.hands[seat]=h.hands[seat].filter(i=>i>>2!==kind);if(h.drawn>>2!==kind){h.hands[seat].push(h.drawn);sortIds(h.hands[seat]);}
  h.drawn=-1;h.melds[seat].push({type:'ankan',tiles:sortIds(ids),from:-1,called:-1});
  h.calls++;h.ippatsu.fill(false);h.kanSeats[seat]++;revealDora(st);drawRinshan(st,seat);
  return {t:'kan',type:'ankan',seat,kind};
}
function doKakan(st,seat,kind,ai) {
  const h=st.h,id=[...h.hands[seat],h.drawn].filter(i=>i>>2===kind).sort((a,b)=>(isRedId(a)?1:0)-(isRedId(b)?1:0))[0];
  h.claim={kind:'chankan',from:seat,tile:id,phase:'ron',idx:0,wait:null,prompt:null,chiDone:false,k:kind};
  const ev=claimStep(st,ai);return ev||{t:'kan',type:'kakan',seat,kind};
}
function finishKakan(st,seat,id) {
  const h=st.h,m=h.melds[seat].find(x=>x.type==='pon'&&x.tiles[0]>>2===id>>2);
  takeTile(st,seat,id);m.type='kakan';m.tiles=sortIds([...m.tiles,id]);h.calls++;h.ippatsu.fill(false);h.kanSeats[seat]++;h.pendDora++;drawRinshan(st,seat);
  return {t:'kan',type:'kakan',seat,kind:id>>2};
}
const kuikaeBlocked=(h,id)=>h.mustDiscard&&h.kuikae.includes(id>>2)&&[...h.hands[h.turn]].some(i=>!h.kuikae.includes(i>>2));
export function humanDiscard(st,id,riichi=false) {
  const h=st.h;if(st.stage!=='act'||h.turn!==0||(h.drawn<0&&!h.mustDiscard))return null;
  if(h.riichi[0]&&id!==h.drawn)return null;
  if(id!==h.drawn&&!h.hands[0].includes(id))return null;
  if(kuikaeBlocked(h,id))return null;
  return discardTile(st,0,id,!!riichi);
}
export function humanTsumo(st) {const info=tsumoInfo(st,0);if(!info)return null;const tile=st.h.drawn;endWin(st,0,null,tile,info);return {t:'tsumo',seat:0};}
export function humanAnkan(st,kind) {return ankanOptions(st,0).includes(kind)?doAnkan(st,0,kind):null;}
export function humanKakan(st,kind) {return kakanOptions(st,0).includes(kind)?doKakan(st,0,kind,null):null;}
export function humanKyuushu(st) {if(!kyuushuOk(st,0))return null;endAbort(st,'kyuushu');return {t:'abort',reason:'kyuushu'};}
/** The player's answer to a claim prompt: {t:'ron'|'pon'|'kan'|'chi'|'pass', ids:[a,b] (chi)}. */
export function humanClaim(st,choice,ai=null) {
  const h=st.h,c=h.claim;if(st.stage!=='claim'||!c||c.wait!=='human')return null;
  const p=c.prompt||{},type=choice?.t,k=c.tile>>2;
  const resume=()=>{c.wait=null;c.prompt=null;st.stage='act';return claimStep(st,ai)||{t:'pass'};};
  if(type==='ron'){if(!p.ron)return null;const info=ronInfo(st,0,c.tile,{chankan:c.kind==='chankan'});if(!info)return null;endWin(st,0,c.from,c.tile,info,c.kind==='chankan');return {t:'ron',seat:0,loser:c.from,tile:c.tile};}
  if(type==='pass'){
    if(p.ron){h.furitenTemp[0]=true;if(h.riichi[0])h.furitenPerm[0]=true;c.idx++;}
    else if(c.phase==='pon'){c.phase='chi';}else c.phase='end';
    return resume();
  }
  if(type==='pon'&&p.pon){const ids=kindsIn(h.hands[0],k).slice(0,2);c.wait=null;return callTile(st,0,'pon',ids,c.from,c.tile);}
  if(type==='kan'&&p.kan){const ids=kindsIn(h.hands[0],k).slice(0,3);c.wait=null;return callTile(st,0,'minkan',ids,c.from,c.tile);}
  if(type==='chi'&&Array.isArray(choice.ids)&&p.chi.some(x=>x[0]===choice.ids[0]&&x[1]===choice.ids[1])){c.wait=null;return callTile(st,0,'chi',[...choice.ids],c.from,c.tile);}
  return null;
}
export const humanRon=st=>humanClaim(st,{t:'ron'}),humanPass=st=>humanClaim(st,{t:'pass'});
/** What the player may do now (for the UI): the current claim prompt plus the discarded tile. */
export const claimPrompt=st=>st.stage==='claim'&&st.h.claim?.wait==='human'?{...st.h.claim.prompt,tile:st.h.claim.tile,from:st.h.claim.from,chankan:st.h.claim.kind==='chankan'}:null;
/** What a CPU at `seat` may know: its own tiles, every river and meld, riichi calls, revealed dora indicators, points. Never the wall or other hands. */
export function viewFor(st,seat) {
  const h=st.h;
  return {seat,hand:[...h.hands[seat]],drawn:h.turn===seat?h.drawn:-1,mustDiscard:h.turn===seat&&h.mustDiscard,kuikae:h.turn===seat?[...h.kuikae]:[],melds:cloneMelds(h),rivers:h.rivers.map(r=>[...r]),log:h.log.map(e=>[...e]),taken:[...h.taken],
    riichi:[...h.riichi],riichiAt:[...h.riichiAt],dealer:h.dealer,doraInds:[...h.doraInds],doraTiles:h.doraInds.map(i=>doraTile(i>>2)),points:[...st.points],pot:st.pot,honba:st.honba,wallLeft:liveWallLeft(st),
    seatWind:seatWindOf(h,seat),roundWind:ROUND_WIND,turn:h.turn,handNo:st.hand,handsTotal:handsTotal(st),mode:st.mode,kans:h.kans,calls:h.calls,opts:h.turn===seat&&st.stage==='act'?ownOptions(st,seat):{riichi:[],ankan:[],kakan:[],kyuushu:false}};
}
const rngFor=st=>mulberry32((st.seed>>>0)^Math.imul(st.h.pos+1,0x85EBCA6B)^Math.imul(st.deal+7,0xC2B2AE35)^(st.h.turn<<3)^Math.imul(st.h.log.length+3,0x27D4EB2F)^Math.imul(st.h.kans+11,0x165667B1));
const legalDiscard=(st,seat,id)=>{const h=st.h;return (id===h.drawn||h.hands[seat].includes(id))&&!kuikaeBlocked(h,id);};
/** True while the player has something to decide in a riichi hand (tsumo or kan); otherwise a riichi hand throws the drawn tile automatically. */
export const riichiNeedsPlayer=st=>st.stage==='act'&&st.h.turn===0&&st.h.riichi[0]&&(!!tsumoInfo(st,0)||ankanOptions(st,0).length>0);
/** One automatic action (a CPU turn or claim, a forced riichi tsumogiri). null = waiting for the player (or the hand/game is over). */
export function mahjongStep(st,ai) {
  const h=st.h;
  if(st.over)return null;
  if(st.stage==='claim'){return h.claim.wait==='human'?null:(claimStep(st,ai)||{t:'advance'});}
  if(st.stage!=='act')return null;
  const seat=h.turn;
  if(seat===0){
    if(!h.riichi[0]||riichiNeedsPlayer(st))return null;
    return discardTile(st,0,h.drawn,false,ai);
  }
  if(h.drawn>=0&&tsumoInfo(st,seat)){const tile=h.drawn;endWin(st,seat,null,tile,tsumoInfo(st,seat));return {t:'tsumo',seat};}
  const view=viewFor(st,seat),act=ai.choose(view,st.level,rngFor(st))||{};
  if(act.action==='ankan'&&view.opts.ankan.includes(act.kind))return doAnkan(st,seat,act.kind);
  if(act.action==='kakan'&&view.opts.kakan.includes(act.kind))return doKakan(st,seat,act.kind,ai);
  if(act.action==='kyuushu'&&view.opts.kyuushu){endAbort(st,'kyuushu');return {t:'abort',reason:'kyuushu'};}
  let tile=act.action==='discard'&&legalDiscard(st,seat,act.tile)?act.tile:-1;
  if(tile<0){const all=[...h.hands[seat],...(h.drawn>=0?[h.drawn]:[])];tile=h.drawn>=0&&legalDiscard(st,seat,h.drawn)?h.drawn:all.find(i=>legalDiscard(st,seat,i));}
  return discardTile(st,seat,tile,!!act.riichi&&act.action==='discard',ai);
}
/** Ranks by points; ties go to the seat that comes first in turn order from the first dealer. */
export function rankPlayers(points,first=0) {
  const pri=s=>(s-first+4)%4;
  const order=[0,1,2,3].sort((a,b)=>points[b]-points[a]||pri(a)-pri(b)),ranks=[0,0,0,0];order.forEach((s,i)=>{ranks[s]=i+1;});return ranks;
}
function finish(st,abandoned=false) {
  let ranks;
  if(abandoned){const others=[1,2,3].sort((a,b)=>st.points[b]-st.points[a]||(a-st.firstDealer+4)%4-(b-st.firstDealer+4)%4);ranks=[4,0,0,0];others.forEach((s,i)=>{ranks[s]=i+1;});}
  else{const top=rankPlayers(st.points,st.firstDealer).indexOf(1);st.points[top]+=st.pot;st.pot=0;ranks=rankPlayers(st.points,st.firstDealer);}
  st.ranks=ranks;st.over=true;st.abandoned=abandoned;st.stage='over';st.payout=abandoned?0:mahjongPayout(st.mode,st.level,ranks[0],st.bet);if(st.h)st.h.claim=null;
  return st.payout;
}
/** After a hand result: deal the next hand (the dealer stays after a dealer win / tenpai draw / abortive draw), or finish the game. Returns 'renchan' | 'advance' | 'over' | false. */
export function nextHand(st) {
  if(st.stage!=='result')return false;
  const r=st.result,next=r.next;
  if(next==='over'){finish(st);return 'over';}
  st.honba=(r.type==='draw'||r.type==='abort'||r.winner===r.dealer)?st.honba+1:0;
  st.deal++;if(next==='advance')st.hand++;
  dealHand(st);return next;
}
export function abandonMahjong(st) {if(st.over)return st.payout;return finish(st,true);}
/** Run everything that needs no player input; `policy` (view, claimPrompt|null → action) plays seat 0 (used by tests and the calibration tool). */
export function runMahjong(st,ai,policy=null,limit=300000,onResult=null,passRon=null) {
  let n=0;
  while(!st.over&&n++<limit){
    if(mahjongStep(st,ai))continue;
    if(st.stage==='act'&&st.h.turn===0){
      if(!policy)return st;
      const h=st.h;
      if(h.drawn>=0&&tsumoInfo(st,0)&&humanTsumo(st))continue;
      const act=policy(viewFor(st,0),null)||{};
      if(act.action==='kyuushu'&&humanKyuushu(st))continue;
      if(act.action==='ankan'&&humanAnkan(st,act.kind))continue;
      if(act.action==='kakan'&&humanKakan(st,act.kind))continue;
      const pick=h.riichi[0]?h.drawn:act.tile;
      if(!humanDiscard(st,pick,!!act.riichi)){const all=[...h.hands[0],...(h.drawn>=0?[h.drawn]:[])];const ok=all.find(i=>!kuikaeBlocked(h,i));humanDiscard(st,h.drawn>=0?h.drawn:ok,false)||humanDiscard(st,ok,false);}
    }else if(st.stage==='claim'){
      if(!policy)return st;
      const p=claimPrompt(st);if(p.ron&&passRon&&passRon(st)){humanPass(st);continue;}const act=p.ron&&humanRon(st)?{action:'done'}:policy(viewFor(st,0),p)||{};
      if(act.action==='done')continue;
      if(act.action==='pon'&&humanClaim(st,{t:'pon'}))continue;if(act.action==='kan'&&humanClaim(st,{t:'kan'}))continue;
      if(act.action==='chi'&&humanClaim(st,{t:'chi',ids:act.ids}))continue;
      humanPass(st);
    }else if(st.stage==='result'){
      if(!policy)return st;
      if(onResult)onResult(st);
      nextHand(st);
    }else break;
  }
  return st;
}
// ---------------- save validation ----------------
const int=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
/** A v7.1.0 save (closed hands, no dealer rotation record) is not playable any more: an unfinished game ends at once with the stake refunded; a finished unpaid one keeps its payout. */
function legacyMahjong(data) {
  const modeOk=MAHJONG_MODES[data.mode],lvl=data.level==='adept'?'adept':'novice';
  if(!modeOk||!int(data.bet,1,1e13)||!Array.isArray(data.points)||data.points.length!==4||!data.points.every(p=>int(p,-1e6,1e6)))return null;
  const finished=data.stage==='over';if(finished&&data.paid)return null;
  const payout=finished&&int(data.payout,0,data.bet*10)?data.payout:data.bet,pts=[...data.points];
  const seed=int(data.seed,0,4294967295)?data.seed:0,first=int(data.firstDealer,0,3)?data.firstDealer:0;
  const ranks=finished&&Array.isArray(data.ranks)&&[...data.ranks].sort().join()==='1,2,3,4'?[...data.ranks]:rankPlayers(pts,first);
  return {v:2,mode:data.mode,level:lvl,bet:data.bet,seed,deal:0,hand:0,honba:0,firstDealer:first,points:pts,pot:int(data.pot,0,MAHJONG_TOTAL_POINTS)&&data.pot%1000===0?data.pot:0,stage:'over',over:true,abandoned:!finished,refund:!finished,legacy:true,ranks,payout,paid:false,h:null,result:null};
}
const MELD_TYPES=['chi','pon','minkan','ankan','kakan'];
/** Validate and copy saved data (null = unusable). The tiles in play must be exactly the first `pos` tiles of the seeded wall (plus the rinshan tiles drawn). */
export function normalizeMahjong(data) {
  try {
    if(!data||typeof data!=='object')return null;
    if(data.v===1)return legacyMahjong(data);
    if(data.v===2&&data.legacy===true)return data.paid?null:legacyMahjong({...data,v:1,stage:data.refund?'act':'over'}); // a converted v7.1.0 game saved again
    if(data.v!==2||!MAHJONG_MODES[data.mode]||!MAHJONG_LEVELS[data.level])return null;
    const total=MAHJONG_MODES[data.mode].hands;
    if(!int(data.bet,1,1e13)||!int(data.seed,0,4294967295)||!int(data.hand,0,total-1)||!int(data.deal,data.hand,MAX_DEALS+total)||!int(data.honba,0,MAX_DEALS+total)||!int(data.firstDealer,0,3))return null;
    if(!Array.isArray(data.points)||data.points.length!==4||!data.points.every(p=>int(p,-1e6,1e6))||!int(data.pot,0,MAHJONG_TOTAL_POINTS)||data.pot%1000)return null;
    if(!['act','claim','result','over'].includes(data.stage))return null;
    const st={v:2,mode:data.mode,level:data.level,bet:data.bet,seed:data.seed,deal:data.deal,hand:data.hand,honba:data.honba,firstDealer:data.firstDealer,points:[...data.points],pot:data.pot,stage:data.stage,over:data.stage==='over',abandoned:!!data.abandoned,refund:false,
      ranks:null,payout:0,paid:!!data.paid,h:null,result:null};
    if(st.points.reduce((a,b)=>a+b,0)+st.pot!==MAHJONG_TOTAL_POINTS)return null;
    if(st.over){
      if(!Array.isArray(data.ranks)||data.ranks.length!==4||[...data.ranks].sort().join()!=='1,2,3,4')return null;
      st.ranks=[...data.ranks];st.payout=st.abandoned?0:mahjongPayout(st.mode,st.level,st.ranks[0],st.bet);
    }
    const hd=data.h;if(!hd||typeof hd!=='object')return null;
    const loose=st.stage==='result'||st.stage==='over',tile=t=>int(t,0,135),ids=a=>Array.isArray(a)&&a.every(tile);
    const four=(a,f)=>Array.isArray(a)&&a.length===4&&a.every(f);
    if(!int(hd.dealer,0,3)||hd.dealer!==dealerOfHand(st,st.hand)||!int(hd.turn,0,3)||!int(hd.kans,0,4)||!int(hd.pos,52,LIVE_END)||hd.pos>LIVE_END-hd.kans||!int(hd.drawn,-1,135)||!int(hd.pendDora,0,4)||!int(hd.calls,0,30))return null;
    if(!four(hd.hands,ids)||!four(hd.melds,Array.isArray)||!four(hd.kanSeats,x=>int(x,0,4))||hd.kanSeats.reduce((a,b)=>a+b,0)!==hd.kans)return null;
    for(const k of ['riichi','wriichi','ippatsu','furitenTemp','furitenPerm'])if(!four(hd[k],x=>typeof x==='boolean'))return null;
    if(!four(hd.riichiAt,x=>int(x,-1,300))||!Array.isArray(hd.log)||hd.log.length>200||!hd.log.every(e=>Array.isArray(e)&&e.length===2&&int(e[0],0,3)&&tile(e[1]))||!Array.isArray(hd.taken)||!hd.taken.every(i=>int(i,0,hd.log.length-1))||new Set(hd.taken).size!==hd.taken.length)return null;
    if(!ids(hd.doraInds)||hd.doraInds.length<1||hd.doraInds.length+hd.pendDora!==1+hd.kans||typeof hd.mustDiscard!=='boolean'||typeof hd.fromRinshan!=='boolean'||!Array.isArray(hd.kuikae)||!hd.kuikae.every(k=>int(k,0,33)))return null;
    const melds=[];
    for(const ms of hd.melds){
      const row=[];
      for(const m of ms){
        if(!m||!MELD_TYPES.includes(m.type)||!ids(m.tiles)||!int(m.from,-1,3)||!int(m.called,-1,135))return null;
        const ks=m.tiles.map(i=>i>>2),need=m.type==='chi'||m.type==='pon'?3:4;
        if(m.tiles.length!==need)return null;
        if(m.type==='chi'){if(ks[0]>=27||ks[1]!==ks[0]+1||ks[2]!==ks[0]+2||ks[0]%9>6)return null;}
        else if(!ks.every(k=>k===ks[0]))return null;
        row.push({type:m.type,tiles:sortIds([...m.tiles]),from:m.from,called:m.called});
      }
      if(row.length>4)return null;melds.push(row);
    }
    const w=makeWall(st.seed,st.deal),logIds=hd.log.map(e=>e[1]),takenSet=new Set(hd.taken);
    const inPlay=[...hd.hands.flat(),...melds.flat().flatMap(m=>m.tiles),...logIds.filter((_,i)=>!takenSet.has(i)),...(hd.drawn>=0?[hd.drawn]:[])];
    const expect=[...w.slice(0,hd.pos)];for(let i=0;i<hd.kans;i++)expect.push(w[RINSHAN_TOP-i]);
    if(inPlay.length!==expect.length||new Set(inPlay).size!==inPlay.length)return null;
    const ex=new Set(expect);if(!inPlay.every(i=>ex.has(i)))return null;
    if(!hd.doraInds.every((id,i)=>id===w[DORA_INDEX-2*i]))return null;
    const calledOk=melds.every(row=>row.every(m=>m.type==='ankan'||m.type==='kakan'||m.type==='pon'||m.type==='chi'||m.type==='minkan'));
    if(!calledOk)return null;
    const rivers=[[],[],[],[]];for(const [s,id] of hd.log)rivers[s].push(id);
    for(let s=0;s<4;s++){
      const M=melds[s].length,len=hd.hands[s].length;
      const want=13-3*M+((hd.mustDiscard&&hd.turn===s&&!loose)?1:0);
      if(loose?(len!==13-3*M&&len!==14-3*M):len!==want)return null;
      if(hd.riichi[s]&&!int(hd.riichiAt[s],0,hd.log.length-1))return null;
    }
    st.h={dealer:hd.dealer,hands:hd.hands.map(x=>sortIds([...x])),melds,rivers,log:hd.log.map(e=>[...e]),taken:[...hd.taken],riichi:[...hd.riichi],riichiAt:[...hd.riichiAt],wriichi:[...hd.wriichi],ippatsu:[...hd.ippatsu],furitenTemp:[...hd.furitenTemp],furitenPerm:[...hd.furitenPerm],
      pos:hd.pos,kans:hd.kans,kanSeats:[...hd.kanSeats],doraInds:[...hd.doraInds],pendDora:hd.pendDora,turn:hd.turn,drawn:hd.drawn,fromRinshan:hd.fromRinshan,mustDiscard:hd.mustDiscard,kuikae:[...hd.kuikae],calls:hd.calls,claim:null};
    const h=st.h;
    if(st.stage==='act'){if((h.drawn>=0)===h.mustDiscard)return null;}
    if(st.stage==='claim'){
      const c=hd.claim;if(!c||!['discard','chankan'].includes(c.kind)||!int(c.from,0,3)||!tile(c.tile)||!['ron','abort','pon','chi','end','kakan'].includes(c.phase)||!int(c.idx,0,3))return null;
      if(c.wait!==null&&c.wait!=='human'&&c.wait!=='cpu')return null;
      if(c.kind==='discard'){const last=h.log[h.log.length-1];if(!last||last[1]!==c.tile||last[0]!==c.from||h.drawn!==-1||h.mustDiscard)return null;}
      else{if(h.turn!==c.from||h.drawn<0||![...h.hands[c.from],h.drawn].includes(c.tile))return null;}
      let prompt=null;
      if(c.wait==='human'){
        const p=c.prompt;if(!p||typeof p!=='object'||!Array.isArray(p.chi)||!p.chi.every(x=>Array.isArray(x)&&x.length===2&&h.hands[0].includes(x[0])&&h.hands[0].includes(x[1])))return null;
        prompt={ron:!!p.ron,pon:!!p.pon,kan:!!p.kan,chi:p.chi.map(x=>[x[0],x[1]])};
      }
      h.claim={kind:c.kind,from:c.from,tile:c.tile,phase:c.phase,idx:c.idx,wait:c.wait,prompt,chiDone:!!c.chiDone,...(c.kind==='chankan'?{k:c.tile>>2}:{})};
    }
    if(st.stage==='result'||(st.over&&data.result)){
      const r=data.result;if(!r||typeof r!=='object'||!['tsumo','ron','draw','abort'].includes(r.type)||!four(r.deltas,x=>Number.isFinite(x))||!['renchan','advance','over'].includes(r.next))return null;
      if(r.yaku&&!(Array.isArray(r.yaku)&&r.yaku.every(y=>y&&typeof y.name==='string'&&int(y.han,0,200))))return null;
      st.result=JSON.parse(JSON.stringify(r));
    } else if(st.stage==='over'&&!data.result){st.result=null;}
    wallOf(st);return st;
  } catch { return null; }
}
