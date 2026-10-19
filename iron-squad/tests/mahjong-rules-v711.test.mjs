// v7.1.1: Mahjong rules — completion vs a brute-force decomposer, shanten, ~150 hand-written yaku/fu/score hands (open hands and yakuman included), score tables.
import assert from 'node:assert/strict';
import * as R from '../js/mahjong-rules.js';
const {countsOf,isComplete,shanten,waitsOf,evaluateHand,basePoints,scoreDeltas,decompositions,isKokushi,isChiitoi}=R;
const report={};let checks=0;
// notation: "123m456p789s1122z" (z: 1-7 = E S W N haku hatsu chun) -> kinds
const tilesOf=s=>{const out=[];for(const [,digits,suit] of s.matchAll(/(\d+)([mpsz])/g))for(const d of digits)out.push({m:0,p:9,s:18,z:27}[suit]+Number(d)-1);return out;};
const H=s=>countsOf(tilesOf(s));
const T1=s=>tilesOf(s)[0];
// ---------- 1. completion vs an independent brute-force decomposer ----------
function brute(counts,M=0) {
  const list=[];counts.forEach((n,t)=>{for(let i=0;i<n;i++)list.push(t);});
  if(list.length!==14-3*M)return false;
  if(M===0){
    if(counts.every(n=>n===0||n===2)&&counts.filter(n=>n===2).length===7)return true;
    const yao=[0,8,9,17,18,26,27,28,29,30,31,32,33];if(yao.every(k=>counts[k]>=1)&&yao.reduce((n,k)=>n+counts[k],0)===14)return true;
  }
  const melds=(rest)=>{
    if(!rest.length)return true;
    const [a,...tail]=rest;
    if(tail.filter(x=>x===a).length>=2){const t=[...tail];t.splice(t.indexOf(a),1);t.splice(t.indexOf(a),1);if(melds(t))return true;}
    if(a<27&&a%9<=6){const t=[...tail],i=t.indexOf(a+1),j=t.indexOf(a+2);if(i>=0&&j>=0){const u=t.filter((_,k)=>k!==i&&k!==j);if(melds(u))return true;}}
    return false;
  };
  for(let p=0;p<34;p++){if(counts[p]<2)continue;const rest=[...list];rest.splice(rest.indexOf(p),1);rest.splice(rest.indexOf(p),1);if(melds(rest))return true;}
  return false;
}
let seedA=7;const rnd=()=>{seedA=(Math.imul(seedA,1664525)+1013904223)>>>0;return seedA/2**32;};
const pick=n=>Math.floor(rnd()*n);
function randomHand(kind,size=14) {
  const c=new Array(34).fill(0),add=t=>{if(c[t]<4){c[t]++;return true;}return false;};
  const total=()=>c.reduce((a,b)=>a+b,0);
  if(kind==='uniform'){while(total()<size)add(pick(34));}
  else if(kind==='cluster'){const base=pick(3)*9+pick(4);while(total()<size){const r=rnd();add(r<.85?Math.min(26,base+pick(6)):r<.93?27+pick(7):pick(34));}}
  else if(kind==='complete'){
    const nm=(size-2)/3;
    for(;;){c.fill(0);let ok=true;for(let i=0;i<nm&&ok;i++){const r=rnd();if(r<.6){const s=pick(3)*9+pick(7);ok=add(s)&&add(s+1)&&add(s+2);}else{const t=pick(34);ok=add(t)&&add(t)&&add(t);}}
      const p=pick(34);ok=ok&&add(p)&&add(p);if(ok&&total()===size)return c;}
  } else if(kind==='chiitoi'){c.fill(0);const used=new Set();while(used.size<7)used.add(pick(34));for(const t of used)c[t]=2;return c;}
  else if(kind==='kokushi'){c.fill(0);for(const k of [0,8,9,17,18,26,27,28,29,30,31,32,33])c[k]=1;c[[0,8,9,17,18,26,27,28,29,30,31,32,33][pick(13)]]++;if(rnd()<.3){const k=[0,8,9,17,18,26,27,28,29,30,31,32,33][pick(13)];if(c[k]===1){c[k]--;c[pick(34)]++;}}return c;}
  else if(kind==='near'){const h=randomHand('complete',size);const from=pick(34);if(h[from]>0){h[from]--;let to;do{to=pick(34);}while(h[to]>=4||to===from);h[to]++;}return h;}
  return c;
}
{let positives=0;
 for(const kind of ['uniform','cluster','complete','chiitoi','near','kokushi'])for(let i=0;i<5000;i++){
  const c=randomHand(kind),want=brute(c);if(want)positives++;
  assert.equal(isComplete(c),want,`${kind}: ${c.join('')}`);checks++;
  assert.equal(decompositions(c).length>0||isChiitoi(c)||isKokushi(c),want,'decompositions agree with completion');
  if(want&&!isChiitoi(c)&&!isKokushi(c))for(const f of decompositions(c)){const back=new Array(34).fill(0);back[f.pair]+=2;for(const m of f.melds){if(m.k==='t')back[m.t]+=3;else{back[m.t]++;back[m.t+1]++;back[m.t+2]++;}}assert.deepEqual(back,c,'a decomposition rebuilds the hand');}
 }
 // hands with fixed melds (11, 8, 5, 2 concealed tiles)
 for(const [M,size] of [[1,11],[2,8],[3,5],[4,2]])for(const kind of ['uniform','cluster','complete','near'])for(let i=0;i<1500;i++){
  const c=randomHand(kind,size),want=brute(c,M);assert.equal(isComplete(c,M),want,`M=${M} ${kind}: ${c.join('')}`);checks++;
 }
 assert.ok(positives>10000,`enough winning samples (${positives})`);report.winSamples={total:30000+6000*4,positives};
}
// ---------- 2. shanten: handwritten small cases ----------
{const S=(s,M=0)=>shanten(H(s),M);
 assert.equal(S('123456789m123p44p'),-1,'complete hand');assert.equal(S('1133557799m22p44z'),-1,'chiitoi is complete');
 assert.equal(S('123456789m1234p'),0);assert.deepEqual(waitsOf(H('123456789m1234p')).sort((a,b)=>a-b),[T1('1p'),T1('4p')]);
 assert.equal(S('1133557799m22p4p'),0,'chiitoi tenpai');assert.deepEqual(waitsOf(H('1133557799m22p4p')),[T1('4p')]);
 assert.deepEqual(waitsOf(H('1112345678999m')),[0,1,2,3,4,5,6,7,8],'nine-sided wait');
 assert.equal(S('13579m13579p135s'),4);
 assert.equal(S('19m19p19s1234567z'),0,'kokushi: 13 different terminals/honours is tenpai');assert.equal(S('19m19p19s123456z1m'),0,'kokushi: 12 kinds + a pair is tenpai');
 assert.equal(S('19m19p19s1234567z1m'),-1,'kokushi complete');assert.equal(S('19m19p19s12345z1m2p'),1,'kokushi: 11 kinds + pair, one short (14 tiles)');
 assert.deepEqual(waitsOf(H('19m19p19s1234567z')).sort((a,b)=>a-b),[0,8,9,17,18,26,27,28,29,30,31,32,33],'thirteen-sided kokushi wait');
 assert.equal(S('1234567m1234567p'),0,'four melds + two loose tiles (14): one discard from tenpai');
 assert.equal(S('123m456p789s12m11z'),0,'3 melds + pair + one taatsu wait');
 assert.equal(S('123m456p789s11z22z'),0,'3 melds + two pairs: shanpon wait');
 assert.equal(S('111m222p333s44z55z'),0,'3 triplets and two pairs');
 assert.equal(S('1111m2222p3333s5z'),2,'four of a kind counted as given');
 // with fixed melds: kokushi / chiitoi do not apply
 assert.equal(S('123456m11z',2),-1,'two melds out + 123m 456m + pair is complete');
 assert.equal(S('456p12m11z',2),0,'two melds out, 7 tiles: meld + taatsu + pair is tenpai');assert.equal(S('23m11z',3),0,'three melds out: taatsu + pair');
 assert.equal(S('11z',4),-1,'four melds + a pair is complete');assert.equal(S('1z',4),0,'tanki wait');
 assert.deepEqual(waitsOf(H('1z'),4),[T1('1z')]);assert.deepEqual(waitsOf(H('456p12m11z'),2),[T1('3m')]);assert.deepEqual(waitsOf(H('23m11z'),3).sort((a,b)=>a-b),[T1('1m'),T1('4m')]);
 assert.ok(S('19m19p19s1234567z',1)>0,'an open meld rules kokushi out');
 const used=H('1111z');assert.deepEqual(waitsOf(H('1z'),4,used),[],'a tile whose four copies are all in sight is not a wait');
}
// ---------- 3. shanten vs an independent whole-hand scan on random hands ----------
function slowShanten(c,M=0) {
  const a=[...c];let best=8;
  const scan=(i,m,t,pair)=>{
    while(i<34&&a[i]===0)i++;
    if(i>=34){best=Math.min(best,8-2*(m+M)-Math.min(t,4-m-M)-(pair?1:0));return;}
    if(a[i]>=3){a[i]-=3;scan(i,m+1,t,pair);a[i]+=3;}
    if(i<27&&i%9<=6&&a[i+1]&&a[i+2]){a[i]--;a[i+1]--;a[i+2]--;scan(i,m+1,t,pair);a[i]++;a[i+1]++;a[i+2]++;}
    if(!pair&&a[i]>=2){a[i]-=2;scan(i,m,t,true);a[i]+=2;}
    if(a[i]>=2){a[i]-=2;scan(i,m,t+1,pair);a[i]+=2;}
    if(i<27&&i%9<=7&&a[i+1]){a[i]--;a[i+1]--;scan(i,m,t+1,pair);a[i]++;a[i+1]++;}
    if(i<27&&i%9<=6&&a[i+2]){a[i]--;a[i+2]--;scan(i,m,t+1,pair);a[i]++;a[i+2]++;}
    a[i]--;scan(i,m,t,pair);a[i]++;
  };
  scan(0,0,0,false);
  if(M>0)return best;
  let pairs=0,kinds=0;for(const n of c){if(n>0)kinds++;if(n>=2)pairs++;}
  let ky=0,kp=0;for(const k of [0,8,9,17,18,26,27,28,29,30,31,32,33]){if(c[k]>0)ky++;if(c[k]>=2)kp=1;}
  return Math.min(best,6-pairs+Math.max(0,7-kinds),13-ky-kp);
}
{let n=0;
 for(const kind of ['uniform','cluster','near','complete'])for(let i=0;i<1500;i++){
   const c=randomHand(kind);assert.equal(shanten(c),slowShanten(c),`14 tiles ${kind}: ${c.join('')}`);n++;
   let bestAfter=99;for(let t=0;t<34;t++){if(!c[t])continue;c[t]--;bestAfter=Math.min(bestAfter,shanten(c));c[t]++;}
   assert.equal(bestAfter,Math.max(0,shanten(c)),`discard law ${c.join('')}`);
   for(let t=0;t<34;t++)if(c[t]){c[t]--;const s13=shanten(c);assert.equal(s13,slowShanten(c),'13 tiles');if(!c.some(n=>n>=4))assert.equal(s13===0,waitsOf(c).length>0,'tenpai <=> has a wait');c[t]++;break;}
 }
 for(const [M,size] of [[1,11],[2,8],[3,5]])for(const kind of ['uniform','cluster','near','complete'])for(let i=0;i<600;i++){const c=randomHand(kind,size);assert.equal(shanten(c,M),slowShanten(c,M),`M=${M} ${kind} ${c.join('')}`);n++;}
 report.shantenSamples=n;
}
// ---------- 4. yaku / fu / score: hand-written table ----------
const meldOf=s=>{const t=tilesOf(s.slice(1))[0],k=s[0];return k==='c'?{k:'s',t,open:true}:k==='p'?{k:'t',t,open:true}:k==='k'?{k:'k',t,open:true}:{k:'k',t,open:false};};
const ctxOf=(win,o={},melds=[])=>({winTile:T1(win),tsumo:!!o.tsumo,riichi:!!o.riichi,doubleRiichi:!!o.wr,ippatsu:!!o.ippatsu,seatWind:o.seat??27,roundWind:o.round??27,dora:(o.dora||[]).map(T1),ura:(o.ura||[]).map(T1),aka:o.aka||0,melds:melds.map(meldOf),
  haitei:!!o.haitei,houtei:!!o.houtei,rinshan:!!o.rinshan,chankan:!!o.chankan,tenhou:!!o.tenhou,chiihou:!!o.chiihou});
const keys=info=>info?[...new Set(info.yaku.map(y=>y.key))].sort().join(','):null;
// [name, concealed tiles incl. the win tile, win tile, options, melds ('c123m' chi, 'p555z' pon, 'k1111m' open kan, 'a1111m' closed kan), han, fu, yaku keys]
const TABLE=[
 ['pinfu+tanyao ron','234567m345p678s44p','4m',{},[],2,30,'pinfu,tanyao'],
 ['pinfu+tanyao tsumo (20 fu)','234567m345p678s44p','4m',{tsumo:1},[],3,20,'pinfu,tanyao,tsumo'],
 ['+riichi ron','234567m345p678s44p','4m',{riichi:1},[],3,30,'pinfu,riichi,tanyao'],
 ['+riichi tsumo','234567m345p678s44p','4m',{riichi:1,tsumo:1},[],4,20,'pinfu,riichi,tanyao,tsumo'],
 ['+ippatsu','234567m345p678s44p','4m',{riichi:1,ippatsu:1},[],4,30,'ippatsu,pinfu,riichi,tanyao'],
 ['double riichi counts 2','234567m345p678s44p','4m',{riichi:1,wr:1},[],4,30,'pinfu,tanyao,wriichi'],
 ['ippatsu needs riichi','234567m345p678s44p','4m',{ippatsu:1},[],2,30,'pinfu,tanyao'],
 ['pinfu with terminals','123m456p789s234m55p','4m',{},[],1,30,'pinfu'],
 ['dragon pair breaks pinfu: no yaku','123m456p789s234m55z','4m',{},[],0,0,null],
 ['kanchan/penchan: no pinfu, no yaku','123m456p789s234m55p','3m',{},[],0,0,null],
 ['penchan 789 waiting 7','123m456p789s234s55p','7s',{},[],0,0,null],
 ['tanyao triplets (tanki 40 fu)','222m345p678s444p55s','5s',{},[],1,40,'tanyao'],
 ['tanyao + tsumo (tanki)','222m345p678s444p55s','5s',{tsumo:1},[],2,40,'tanyao,tsumo'],
 ['chiitoi 25 fu','1133m5577p99s22s44z','4z',{},[],2,25,'chiitoi'],
 ['chiitoi + tanyao','2244m6688p3355s77p','7p',{},[],3,25,'chiitoi,tanyao'],
 ['chiitoi riichi tsumo tanyao','2244m6688p3355s77p','7p',{riichi:1,tsumo:1},[],5,25,'chiitoi,riichi,tanyao,tsumo'],
 ['chiitoi + a dora pair (2 dora)','1133m5577p99s22s44z','4z',{dora:['4z']},[],4,25,'chiitoi,dora'],
 ['iipeikou only (penchan wait, 40 fu)','223344m567p789s55p','7s',{},[],1,40,'iipeikou'],
 ['pinfu tanyao iipeikou','223344m567p678s55p','8s',{},[],3,30,'iipeikou,pinfu,tanyao'],
 ['haku triplet','555z234m456p789s11p','1p',{},[],1,40,'yakuhai'],
 ['hatsu triplet','666z234m456p789s11p','1p',{},[],1,40,'yakuhai'],
 ['chun triplet','777z234m456p789s11p','1p',{},[],1,40,'yakuhai'],
 ['seat wind triplet (south seat)','222z234m456p789s11p','1p',{seat:28},[],1,40,'yakuhai'],
 ['south triplet but east seat: no yaku','222z234m456p789s11p','1p',{},[],0,0,null],
 ['round wind triplet (south seat)','111z234m456p789s11p','1p',{seat:28},[],1,40,'yakuhai'],
 ['dealer east triplet counts twice','111z234m456p789s11p','1p',{seat:27},[],2,40,'yakuhai'],
 ['two dragon triplets','555z666z234m789s11p','1p',{},[],2,50,'yakuhai'],
 ['three dragon triplets: daisangen','555z666z777z234m11p','1p',{},[],13,0,'daisangen'],
 ['shousangen + 2 yakuhai (mangan)','555z666z77z234m789s','9s',{},[],4,50,'shousangen,yakuhai'],
 ['tanyao + 3 dora','222m345p678s444p55s','5s',{dora:['2m']},[],4,40,'dora,tanyao'],
 ['dora alone never wins','123m456p789s234s55p','3s',{dora:['5p']},[],0,0,null],
 ['riichi alone (kanchan 40 fu)','123m456p789s234s55p','3s',{riichi:1},[],1,40,'riichi'],
 ['tsumo alone (kanchan 30 fu)','123m456p789s234s55p','3s',{tsumo:1},[],1,30,'tsumo'],
 ['111222333m reads best as three concealed triplets','111222333m789s55p','7s',{},[],2,50,'sanankou'],
 ['dragon pair, tsumo only','234m567p678s345s66z','4m',{tsumo:1},[],1,30,'tsumo'],
 ['pair of non-yakuhai wind keeps pinfu','234m567p678s345s33z','4m',{},[],1,30,'pinfu'],
 ['pair of round wind breaks pinfu','234m567p678s345s11z','4m',{},[],0,0,null],
 ['pair of own wind breaks pinfu','234m567p678s345s22z','4m',{seat:28},[],0,0,null],
 ['pinfu 2-sided on the high side','234m567p678s345s99p','6s',{},[],1,30,'pinfu'],
 ['not a winning hand','1234567m1234567p','4m',{},[],0,0,null],
 ['terminal pair is not tanyao','234m567p678s345s99p','4m',{riichi:1},[],2,30,'pinfu,riichi'],
 ['all simples chiitoi + dora pair','2233m4455p6677s88p','8p',{dora:['8p']},[],5,25,'chiitoi,dora,tanyao'],
 ['yakuhai + riichi','555z234m456p789s11p','1p',{riichi:1},[],2,40,'riichi,yakuhai'],
 ['iipeikou + riichi + tsumo','112233m456p789s55p','5p',{riichi:1,tsumo:1},[],3,30,'iipeikou,riichi,tsumo'],
 ['pinfu riichi tsumo iipeikou tanyao','223344m567p678s55p','8s',{riichi:1,tsumo:1},[],5,20,'iipeikou,pinfu,riichi,tanyao,tsumo'],
 ['east triplet in the east seat + tsumo','111z234m456p789s11p','1p',{tsumo:1},[],3,40,'tsumo,yakuhai'],
 ['iipeikou + haku triplet + chanta','112233m555z789s11p','7s',{},[],4,40,'chanta,iipeikou,yakuhai'],
 ['ittsu + pinfu','123456789m234p55s','4p',{},[],3,30,'ittsu,pinfu'],
 ['sanshoku doujun + tanyao (tanki)','234m234p234s567m66p','6p',{},[],3,40,'sanshoku,tanyao'],
 ['sanshoku + tanyao + pinfu','234m234p234s567m66p','7m',{},[],4,30,'pinfu,sanshoku,tanyao'],
 ['ryanpeikou','112233m445566p77s','7s',{},[],3,40,'ryanpeikou'],
 ['ryanpeikou excludes iipeikou; with tanyao','223344m445566p88s','8s',{},[],4,40,'ryanpeikou,tanyao'],
 ['sanankou by ron on a shanpon + toitoi + yakuhai','111m999p333s555z77z','5z',{},[],5,60,'sanankou,toitoi,yakuhai'],
 ['sanshoku doukou + sanankou + tanyao','222m222p222s345m66p','6p',{},[],5,50,'sanankou,sanshokuDoukou,tanyao'],
 ['sanankou + tsumo (tanki)','222m555p888s345s99m','9m',{tsumo:1},[],3,40,'sanankou,tsumo'],
 ['honitsu closed (3 han)','234m567m888m222z11z','1z',{},[],3,50,'honitsu'],
 ['chinitsu + iipeikou + ittsu + pinfu (baiman)','123m123m456m789m55m','6m',{},[],10,30,'chinitsu,iipeikou,ittsu,pinfu'],
 ['junchan closed 3 han','123m789m123p999p11s','1s',{},[],3,40,'junchan'],
 ['chanta closed 2 han (double wind pair 4 fu)','123m789m123p999p11z','1z',{},[],2,50,'chanta'],
 ['honroutou + toitoi + sanankou (one open pon)','999m111p999p11z','1z',{},['p111m'],6,60,'honroutou,sanankou,toitoi'],
 ['ittsu closed 2 han (penchan wait)','123456789m123p55s','3p',{},[],2,40,'ittsu'],
 ['haitei raoyue','234567m345p678s44p','4m',{tsumo:1,haitei:1},[],4,20,'haitei,pinfu,tanyao,tsumo'],
 ['houtei raoyui','234567m345p678s44p','4m',{houtei:1},[],3,30,'houtei,pinfu,tanyao'],
 ['rinshan kaihou (tsumo)','222m345p678s444p55s','5s',{tsumo:1,rinshan:1},[],3,40,'rinshan,tanyao,tsumo'],
 ['chankan','222m345p678s444p55s','5s',{chankan:1},[],2,40,'chankan,tanyao'],
 ['aka dora (two reds)','234567m345p678s44p','4m',{aka:2},[],4,30,'aka,pinfu,tanyao'],
 ['ura dora needs riichi','234567m345p678s44p','4m',{ura:['4p']},[],2,30,'pinfu,tanyao'],
 ['ura dora with riichi (three uras)','234567m345p678s44p','4m',{riichi:1,ura:['4p']},[],6,30,'pinfu,riichi,tanyao,ura'],
 ['dora in a meld counts','567p678s345s44p','4p',{dora:['2m']},['c234m'],2,30,'dora,tanyao'],
 // ---- open hands (kuitan, yakuhai calls, open reductions) ----
 ['open tanyao (kuitan) 30 fu','567p678s345s44p','4p',{},['c234m'],1,30,'tanyao'],
 ['open pon of haku','234m456p789s11p','1p',{},['p555z'],1,30,'yakuhai'],
 ['open chi, no yaku','234m456p789s11p','1p',{},['c123m'],0,0,null],
 ['open honitsu + ittsu + haku','456m789m11m','1m',{},['c123m','p555z'],4,30,'honitsu,ittsu,yakuhai'],
 ['open chinitsu is 5 han','234m567m789m99m','9m',{},['c123m'],5,30,'chinitsu'],
 ['toitoi (open) 40 fu','888s333z11p','1p',{},['p222m','p555p'],2,40,'toitoi'],
 ['open sanshoku is 1 han (+ tanyao)','234s567p88s','8s',{},['c234m','c234p'],2,30,'sanshoku,tanyao'],
 ['open chanta is 1 han','789s123s11z','3s',{},['c123m','p999p'],1,30,'chanta'],
 ['open junchan is 2 han','789s123s11p','3s',{},['c123m','p999p'],2,30,'junchan'],
 ['open kan of haku: 16 fu','234m567p678s11p','1p',{},['k5555z'],1,40,'yakuhai'],
 ['closed kan of haku keeps menzen ron: 32 + 10 fu','234m567p678s11p','1p',{},['a5555z'],1,70,'yakuhai'],
 ['closed kan hand can still riichi','234m567p678s11p','1p',{riichi:1},['a5555z'],2,70,'riichi,yakuhai'],
 ['closed kan keeps tsumo','234m567p678s11p','1p',{tsumo:1},['a5555z'],2,60,'tsumo,yakuhai'],
 ['open ittsu is 1 han (+ yakuhai)','789p11m','1m',{},['c123p','c456p','p555z'],2,30,'ittsu,yakuhai'],
 ['three kans + toitoi','444z55z','5z',{},['k1111m','k2222p','a3333s'],4,80,'sankantsu,toitoi'],
 ['open: no iipeikou, only tanyao','234m234m567p88s','8s',{},['c234p'],1,30,'tanyao'],
 ['open hatsu pon + chi','234m567p88s','8s',{},['p666z','c345s'],1,30,'yakuhai'],
 ['double wind pair is 4 fu','234m567p11z','1z',{},['p666z','c345s'],1,30,'yakuhai'],
 // ---- yakuman ----
 ['kokushi','19m19p19s12345677z','1m',{},[],13,0,'kokushi'],
 ['kokushi thirteen-sided (double)','19m19p19s1234567z1m','1m',{},[],26,0,'kokushi13'],
 ['suuankou (tsumo, shanpon)','111m222p333s444z55z','4z',{tsumo:1},[],13,0,'suuankou'],
 ['ron on the shanpon is only sanankou + toitoi','111m222p333s444z55z','4z',{},[],4,60,'sanankou,toitoi'],
 ['suuankou tanki (double)','111m222p333s444z55z','5z',{},[],26,0,'suuankouTanki'],
 ['daisuushii (double) with an open pon','222z333z444z55p','5p',{},['p111z'],26,0,'daisuushii'],
 ['daisuushii + suuankou tanki stack to 4 yakuman','111z222z333z444z55p','5p',{},[],52,0,'daisuushii,suuankouTanki'],
 ['shousuushii','111z222z333z44z567p','7p',{},[],13,0,'shousuushii'],
 ['tsuuiisou (all honours) with an open pon','222z555z666z77z','7z',{},['p111z'],13,0,'tsuuiisou'],
 ['tsuuiisou + suuankou tanki','111z222z555z666z77z','7z',{},[],39,0,'suuankouTanki,tsuuiisou'],
 ['ryuuiisou (all green)','234s234s666s888s66z','6z',{},[],13,0,'ryuuiisou'],
 ['chinroutou (all terminals) with an open pon','999m111p999p11s','1s',{},['p111m'],13,0,'chinroutou'],
 ['chuuren poutou','11123445678999m','5m',{},[],13,0,'chuuren'],
 ['junsei chuuren (nine-sided, double)','11123456789999m','9m',{},[],26,0,'junseiChuuren'],
 ['suukantsu','55z','5z',{},['k1111m','k2222p','a3333s','k4444s'],13,0,'suukantsu'],
 ['tenhou (dealer tsumo on the first draw)','234567m345p678s44p','4m',{tsumo:1,tenhou:1},[],13,0,'tenhou'],
 ['chiihou','234567m345p678s44p','4m',{tsumo:1,chiihou:1},[],13,0,'chiihou'],
 ['yakuman ignores dora and other yaku','234567m345p678s44p','4m',{tsumo:1,tenhou:1,riichi:1,dora:['4m']},[],13,0,'tenhou'],
 ['open daisangen','234m11p','1p',{},['p555z','p666z','p777z'],13,0,'daisangen'],
 ['yakuhai + tsumo (tanki 40 fu)','555z234m456p789s11p','1p',{tsumo:1},[],2,40,'tsumo,yakuhai'],
 ['riichi tsumo, kanchan 30 fu','123m456p789s234s55p','3s',{riichi:1,tsumo:1},[],2,30,'riichi,tsumo'],
 ['pinfu tsumo 20 fu','123m456p789s234s88p','4s',{tsumo:1},[],2,20,'pinfu,tsumo'],
 ['sanshoku doukou open + tanyao','222s345m66p','6p',{},['p222m','p222p'],3,30,'sanshokuDoukou,tanyao'],
 ['chiitoi + honroutou','1199m1199p1199s11z','1z',{},[],4,25,'chiitoi,honroutou'],
 ['chiitoi of seven honours is tsuuiisou','11z22z33z44z55z66z77z','7z',{},[],13,0,'tsuuiisou'],
 ['chiitoi + honitsu','1133557799m11z22z','2z',{},[],5,25,'chiitoi,honitsu'],
 ['chinitsu 7 pairs reads as ryanpeikou + pinfu (10 han) rather than chiitoi (8)','11223344556677m','7m',{},[],10,30,'chinitsu,pinfu,ryanpeikou'],
 ['open tanyao with an open kan: 8 fu','234m567s678s44s','4s',{},['k2222p'],1,30,'tanyao'],
 ['closed kan: 16 fu + menzen ron','234m567s678s44s','4s',{},['a2222p'],1,50,'tanyao'],
 ['open honitsu + ittsu + double-wind triplet','456m789m111z22z','2z',{},['c123m'],5,30,'honitsu,ittsu,yakuhai'],
 ['houtei chiitoi','1133m5577p99s22s44z','4z',{houtei:1},[],3,25,'chiitoi,houtei'],
 ['junchan + sanshoku (closed)','123m123p123s789m99p','9p',{},[],5,40,'junchan,sanshoku'],
 ['dora + aka + ura together','234567m345p678s44p','4m',{riichi:1,tsumo:1,dora:['4m'],ura:['6m'],aka:1},[],7,20,'aka,dora,pinfu,riichi,tanyao,tsumo,ura'],
 ['haitei + riichi + ippatsu + tsumo (chiitoi)','2244m6688p3355s77p','7p',{riichi:1,ippatsu:1,tsumo:1,haitei:1},[],7,25,'chiitoi,haitei,ippatsu,riichi,tanyao,tsumo'],
 ['rinshan + yakuhai pon (open kan)','234m567p678s11p','1p',{tsumo:1,rinshan:1},['k5555z'],2,40,'rinshan,yakuhai'],
 ['chankan + open hand','234m567p678s11p','1p',{chankan:1},['p555z'],2,30,'chankan,yakuhai'],
 ['toitoi + yakuhai (two open pons + closed pair)','333s444z11p','1p',{},['p555z','p222m'],3,40,'toitoi,yakuhai'],
 ['seat-wind pon + dealer','222z456p789s11p','1p',{seat:28},['c123m'],1,30,'yakuhai'],
 ['ittsu closed with an east pair (4 fu)','123456789m234p234s11z','1z',{},[],2,40,'ittsu'],
 ['four open chi, tanyao','55p',   '5p',{},['c234m','c345p','c456s','c678m'],1,30,'tanyao'],
 ['all green via chi','66z',   '6z',{},['c234s','c234s','p666s','p888s'],13,0,'ryuuiisou'],
];
for(const [name,hand,win,o,melds,han,fu,want] of TABLE){
  const c=H(hand);
  const info=name.startsWith('kokushi')||name.startsWith('chuuren')||name.startsWith('junsei')?evaluateHand(c,ctxOf(win,o,melds)):evaluateHand(c,ctxOf(win,o,melds));
  if(want===null&&han===0){assert.equal(info,null,name);continue;}
  if(!info){assert.fail(`${name}: expected ${want}, got no win`);}
  if(han>0)assert.equal(info.han,han,`${name}: han (${keys(info)})`);
  if(fu>0)assert.equal(info.fu,fu,`${name}: fu`);
  if(want)assert.equal(keys(info),want,name);checks++;
}
report.yakuCases=TABLE.length;
export {TABLE};

// ---------- 5. score tables ----------
{
 const child=(han,fu)=>{const b=basePoints(han,fu);return Math.ceil(b*4/100)*100;},dealer=(han,fu)=>{const b=basePoints(han,fu);return Math.ceil(b*6/100)*100;};
 const ROWS=[ // han, fu, child ron, dealer ron, child tsumo [dealer, child], dealer tsumo (each)
  [1,30,1000,1500,[500,300],500],[1,40,1300,2000,[700,400],700],[1,50,1600,2400,[800,400],800],[1,60,2000,2900,[1000,500],1000],[1,70,2300,3400,[1200,600],1200],
  [2,20,1300,2000,[700,400],700],[2,25,1600,2400,[800,400],800],[2,30,2000,2900,[1000,500],1000],[2,40,2600,3900,[1300,700],1300],[2,50,3200,4800,[1600,800],1600],
  [3,25,3200,4800,[1600,800],1600],[3,30,3900,5800,[2000,1000],2000],[3,40,5200,7700,[2600,1300],2600],[3,50,6400,9600,[3200,1600],3200],[3,60,8000,12000,[4000,2000],4000],
  [4,20,5200,7700,[2600,1300],2600],[4,25,6400,9600,[3200,1600],3200],[4,30,8000,12000,[4000,2000],4000],[4,40,8000,12000,[4000,2000],4000],
  [5,30,8000,12000,[4000,2000],4000],[6,30,12000,18000,[6000,3000],6000],[7,30,12000,18000,[6000,3000],6000],[8,30,16000,24000,[8000,4000],8000],[10,30,16000,24000,[8000,4000],8000],
  [11,30,24000,36000,[12000,6000],12000],[12,30,24000,36000,[12000,6000],12000],[13,30,32000,48000,[16000,8000],16000],[20,30,32000,48000,[16000,8000],16000]];
 for(const [han,fu,cr,dr,ct,dt] of ROWS){
  assert.equal(child(han,fu),cr,`child ron ${han}/${fu}`);assert.equal(dealer(han,fu),dr,`dealer ron ${han}/${fu}`);
  const b=basePoints(han,fu);
  let d=scoreDeltas(1,2,b,0);assert.equal(d[1],cr);assert.equal(d[2],-cr,'child ron');
  d=scoreDeltas(0,3,b,0);assert.equal(d[0],dr,'dealer ron');
  d=scoreDeltas(1,null,b,0);assert.deepEqual([-d[0],-d[2],-d[3],d[1]],[ct[0],ct[1],ct[1],ct[0]+ct[1]*2],`child tsumo ${han}/${fu}`);
  d=scoreDeltas(0,null,b,0);assert.deepEqual([-d[1],-d[2],-d[3]],[dt,dt,dt],`dealer tsumo ${han}/${fu}`);
  checks+=5;
 }
 assert.equal(basePoints(1,30,0),240);assert.equal(basePoints(4,30),2000,'30 fu 4 han is rounded up to mangan (kiriage)');assert.equal(basePoints(3,60),2000);assert.equal(basePoints(4,25),1600);
 assert.equal(basePoints(13,0,1),8000);assert.equal(basePoints(26,0,2),16000);assert.equal(scoreDeltas(2,3,basePoints(26,0,2),0)[2],64000,'double yakuman (child)');
 assert.equal(R.limitOf(5,30),'mangan');assert.equal(R.limitOf(7,30),'haneman');assert.equal(R.limitOf(9,30),'baiman');assert.equal(R.limitOf(12,30),'sanbaiman');assert.equal(R.limitOf(14,0),'kazoe');assert.equal(R.limitOf(13,0,1),'yakuman');assert.equal(R.limitOf(26,0,2),'doubleYakuman');assert.equal(R.limitOf(2,30),'');
 // honba: ron +300 each, tsumo +100 from each of the three
 assert.deepEqual(scoreDeltas(1,2,basePoints(2,30),0,2),[0,2000+600,-(2000+600),0]);
 assert.deepEqual(scoreDeltas(1,null,basePoints(1,30),0,3),[-800,2000,-600,-600],'tsumo with 3 honba: +100 from each payer per honba');
 for(const honba of [0,1,5])for(const [winner,loser] of [[0,1],[1,0],[2,3],[3,null],[0,null],[1,null]]){const d=scoreDeltas(winner,loser,basePoints(3,40),0,honba);assert.equal(d.reduce((a,b)=>a+b,0),0,'a win moves points, never creates them');}
 // a kazoe yakuman: 13 han from yaku + dora counts as one yakuman
 const big=evaluateHand(H('234567m345p678s44p'),ctxOf('4m',{riichi:1,tsumo:1,ippatsu:1,dora:['4p','3p','5p','6m','7m'],aka:3,ura:['4p']}));assert.ok(big.han>=13&&big.yakuman===0&&big.limit==='kazoe'&&big.base===8000,`kazoe ${big.han}`);
}
console.log('PASS mahjong rules v7.1.1',JSON.stringify(report),checks,'checks');
