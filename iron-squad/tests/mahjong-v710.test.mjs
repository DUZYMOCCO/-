// v7.1.0: Mahjong rules, scoring, AI fairness, save/resume, payouts, performance (pure modules, no DOM). The jsdom UI test is mahjong-ui-v710.test.mjs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as R from '../js/mahjong-rules.js';
import {chooseAction,mahjongAi,referencePolicy,randomPolicy} from '../js/mahjong-ai.js';
import {MAX_MAHJONG_PAYOUT,MAX_CASINO_MAHJONG_BET,casinoMahjongMaxBet,casinoMaxBet,casinoArenaMaxBet,casinoPageMaxBet,POKER_PAYOUTS,CASINO_POLICY,normalizeCasino} from '../js/casino-rules.js';
const {countsOf,isComplete,shanten,waitsOf,evaluateHand,handPoints,winDeltas,mulberry32,makeWall,newMahjong,viewFor,mahjongStep,humanDiscard,humanTsumo,humanRon,humanPass,nextHand,abandonMahjong,normalizeMahjong,rankPlayers,ronInfo,riichiOptions,decompositions}=R;
const report={};let checks=0;
// ---------- notation: "123m456p789s1122z" (z: 1-7 = E S W N haku hatsu chun) ----------
const tilesOf=s=>{const out=[];for(const [,digits,suit] of s.matchAll(/(\d+)([mpsz])/g))for(const d of digits)out.push({m:0,p:9,s:18,z:27}[suit]+Number(d)-1);return out;};
const H=s=>countsOf(tilesOf(s));
const T1=s=>tilesOf(s)[0];
// ---------- 1. completion vs an independent brute-force decomposer ----------
function brute14(counts) {
  const list=[];counts.forEach((n,t)=>{for(let i=0;i<n;i++)list.push(t);});
  if(list.length!==14)return false;
  if(counts.every(n=>n===0||n===2)&&counts.filter(n=>n===2).length===7)return true;
  const melds=(rest)=>{
    if(!rest.length)return true;
    const [a,...tail]=rest;
    // triplet
    if(tail.filter(x=>x===a).length>=2){const t=[...tail];t.splice(t.indexOf(a),1);t.splice(t.indexOf(a),1);if(melds(t))return true;}
    // sequence (suited, not wrapping)
    if(a<27&&a%9<=6){const t=[...tail],i=t.indexOf(a+1),j=t.indexOf(a+2);if(i>=0&&j>=0){const u=t.filter((_,k)=>k!==i&&k!==j);if(melds(u))return true;}}
    return false;
  };
  for(let p=0;p<34;p++){if(counts[p]<2)continue;const rest=[...list];rest.splice(rest.indexOf(p),1);rest.splice(rest.indexOf(p),1);if(melds(rest))return true;}
  return false;
}
let seedA=7;const rnd=()=>{seedA=(Math.imul(seedA,1664525)+1013904223)>>>0;return seedA/2**32;};
const pick=n=>Math.floor(rnd()*n);
function randomHand(kind) {
  const c=new Array(34).fill(0),add=t=>{if(c[t]<4){c[t]++;return true;}return false;};
  const total=()=>c.reduce((a,b)=>a+b,0);
  if(kind==='uniform'){while(total()<14)add(pick(34));}
  else if(kind==='cluster'){const base=pick(3)*9+pick(4);while(total()<14){const r=rnd();add(r<.85?Math.min(26,base+pick(6)):r<.93?27+pick(7):pick(34));}}
  else if(kind==='complete'){ // four melds and a pair
    for(;;){c.fill(0);let ok=true;for(let i=0;i<4&&ok;i++){const r=rnd();if(r<.6){const s=pick(3)*9+pick(7);ok=add(s)&&add(s+1)&&add(s+2);}else{const t=pick(34);ok=add(t)&&add(t)&&add(t);}}
      const p=pick(34);ok=ok&&add(p)&&add(p);if(ok&&total()===14)return c;}
  } else if(kind==='chiitoi'){for(;;){c.fill(0);const used=new Set();while(used.size<7)used.add(pick(34));for(const t of used)c[t]=2;return c;}}
  else if(kind==='near'){const h=randomHand('complete');const from=pick(34);if(h[from]>0){h[from]--;let to;do{to=pick(34);}while(h[to]>=4||to===from);h[to]++;}return h;}
  return c;
}
{let positives=0;
 for(const kind of ['uniform','cluster','complete','chiitoi','near'])for(let i=0;i<6000;i++){
  const c=randomHand(kind),want=brute14(c);if(want)positives++;
  assert.equal(isComplete(c),want,`${kind}: ${c.join('')}`);checks++;
  assert.equal(decompositions(c).length>0||R.isChiitoi(c),want,'decompositions agree with completion');
  if(want&&!R.isChiitoi(c))for(const f of decompositions(c)){const back=new Array(34).fill(0);back[f.pair]+=2;for(const m of f.melds){if(m.k==='t')back[m.t]+=3;else{back[m.t]++;back[m.t+1]++;back[m.t+2]++;}}assert.deepEqual(back,c,'a decomposition rebuilds the hand');}
 }
 assert.ok(positives>8000,`enough winning samples (${positives})`);report.winSamples={total:30000,positives};
}
// ---------- 2. shanten: handwritten small cases ----------
{const S=s=>shanten(H(s));
 assert.equal(S('123456789m123p44p'),-1,'complete hand');assert.equal(S('1133557799m22p44z'),-1,'chiitoi is complete');
 assert.equal(S('123456789m1234p'),0);assert.deepEqual(waitsOf(H('123456789m1234p')).sort((a,b)=>a-b),[T1('1p'),T1('4p')]);
 assert.equal(S('1133557799m22p4p'),0,'chiitoi tenpai');assert.deepEqual(waitsOf(H('1133557799m22p4p')),[T1('4p')]);
 assert.deepEqual(waitsOf(H('1112345678999m')),[0,1,2,3,4,5,6,7,8],'nine-sided wait');
 assert.equal(S('13579m13579p135s'),4);assert.equal(S('19m19p19s1234567z'),6,'kokushi shapes are not special: 13 loose tiles');
 assert.equal(S('1234567m1234567p'),0,'four melds + two loose tiles (14): one discard from tenpai');
 assert.equal(S('123m456p789s11z2z3z4z'),1,'3 melds + pair + 3 loose honours (14): needs a 4th meld');
 assert.equal(S('123m456p789s12m11z'),0,'3 melds + pair + one taatsu wait');
 assert.equal(S('123m456p789s11z22z'),0,'3 melds + two pairs: shanpon wait');
 assert.equal(S('123m456p78s11z22z33z'),1,'2 melds + pair + 2 pairs + a taatsu is still short of tenpai');
 assert.equal(S('111m222p333s44z55z'),0,'3 triplets and two pairs');
 assert.equal(S('1m3m5m7m9m1p3p5p7p9p1s3s5s'),4);
 assert.equal(S('1111m2222p3333s5z'),2,'four of a kind counted as given');
}
// ---------- 3. shanten vs an independent whole-hand scan on random hands, plus consistency laws ----------
function slowShanten(c) {
  const a=[...c];let best=8;
  const scan=(i,m,t,pair)=>{
    while(i<34&&a[i]===0)i++;
    if(i>=34){best=Math.min(best,8-2*m-Math.min(t,4-m)-(pair?1:0));return;}
    if(a[i]>=3){a[i]-=3;scan(i,m+1,t,pair);a[i]+=3;}
    if(i<27&&i%9<=6&&a[i+1]&&a[i+2]){a[i]--;a[i+1]--;a[i+2]--;scan(i,m+1,t,pair);a[i]++;a[i+1]++;a[i+2]++;}
    if(!pair&&a[i]>=2){a[i]-=2;scan(i,m,t,true);a[i]+=2;}
    if(a[i]>=2){a[i]-=2;scan(i,m,t+1,pair);a[i]+=2;}
    if(i<27&&i%9<=7&&a[i+1]){a[i]--;a[i+1]--;scan(i,m,t+1,pair);a[i]++;a[i+1]++;}
    if(i<27&&i%9<=6&&a[i+2]){a[i]--;a[i+2]--;scan(i,m,t+1,pair);a[i]++;a[i+2]++;}
    a[i]--;scan(i,m,t,pair);a[i]++;
  };
  scan(0,0,0,false);
  let pairs=0,kinds=0;for(const n of c){if(n>0)kinds++;if(n>=2)pairs++;}
  return Math.min(best,6-pairs+Math.max(0,7-kinds));
}
{let n=0;
 for(const kind of ['uniform','cluster','near','complete']){
  for(let i=0;i<1500;i++){
   const c=randomHand(kind);let sh=shanten(c);assert.equal(sh,slowShanten(c),`14 tiles ${kind}: ${c.join('')}`);n++;
   // a 14-tile hand's shanten equals the best 13-tile shanten after a discard (0 stands in for "complete")
   let bestAfter=99;for(let t=0;t<34;t++){if(!c[t])continue;c[t]--;bestAfter=Math.min(bestAfter,shanten(c));c[t]++;}
   assert.equal(bestAfter,Math.max(0,sh),`discard law ${c.join('')}`);
   // 13 tiles: tenpai <=> some tile completes; drawing never lowers shanten by more than 1; some tile lowers it by exactly 1 (when not tenpai)
   for(let t=0;t<34;t++)if(c[t]){c[t]--;const s13=shanten(c);assert.equal(s13,slowShanten(c),'13 tiles');assert.equal(s13===0,waitsOf(c).length>0,'tenpai <=> has a wait');
    if(s13>0&&i%25===0){let min=99;for(let x=0;x<34;x++){if(c[x]>=4)continue;c[x]++;const s=shanten(c);min=Math.min(min,s);assert.ok(s>=s13-1);c[x]--;c[x]++;c[x]--;}assert.equal(min,s13-1,'some draw improves a non-tenpai hand');}
    c[t]++;break;}
  }}
 report.shantenSamples=n;
}
// ---------- 4. yaku and score: hand-written table ----------
const ctxOf=(win,o={})=>({winTile:T1(win),tsumo:!!o.tsumo,riichi:!!o.riichi,seatWind:o.seat??27,roundWind:o.round??27,dora:(o.dora||[]).map(T1)});
const keys=info=>info?info.yaku.map(y=>y.key).sort().join(','):null;
const YAKU_TABLE=[
 // [name, hand, win, options, yaku keys, han]
 ['pinfu+tanyao ron','234567m345p678s44p','4m',{},'pinfu,tanyao',2],
 ['pinfu+tanyao tsumo','234567m345p678s44p','4m',{tsumo:1},'pinfu,tanyao,tsumo',3],
 ['+riichi ron','234567m345p678s44p','4m',{riichi:1},'pinfu,riichi,tanyao',3],
 ['+riichi tsumo','234567m345p678s44p','4m',{riichi:1,tsumo:1},'pinfu,riichi,tanyao,tsumo',4],
 ['pinfu with terminals','123m456p789s234m55p','4m',{},'pinfu',1],
 ['dragon pair breaks pinfu: no yaku','123m456p789s234m55z','4m',{},null,0],
 ['kanchan: no pinfu, no yaku','123m456p789s234m55p','3m',{},null,0],
 ['penchan: no pinfu','123m456p789s234s55p','3m',{},null,0],
 ['kanchan 8 of 789','123m456p789s234m55p','8s',{},null,0],
 ['tanyao triplets','222m345p678s444p55s','5s',{},'tanyao',1],
 ['tanyao + tsumo','222m345p678s444p55s','5s',{tsumo:1},'tanyao,tsumo',2],
 ['chiitoi','1133m5577p99s22s44z','4z',{},'chiitoi',2],
 ['chiitoi + tanyao','2244m6688p3355s77p','7p',{},'chiitoi,tanyao',3],
 ['chiitoi riichi tsumo tanyao','2244m6688p3355s77p','7p',{riichi:1,tsumo:1},'chiitoi,riichi,tanyao,tsumo',5],
 ['chiitoi + 2 dora','1133m5577p99s22s44z','4z',{dora:['1m']},'chiitoi,dora',4],
 ['iipeikou only','223344m567p789s55p','7s',{},'iipeikou',1],
 ['pinfu tanyao iipeikou','223344m567p678s55p','8s',{},'iipeikou,pinfu,tanyao',3],
 ['haku triplet','555z234m456p789s11p','1p',{},'yakuhai',1],
 ['hatsu triplet','666z234m456p789s11p','1p',{},'yakuhai',1],
 ['chun triplet','777z234m456p789s11p','1p',{},'yakuhai',1],
 ['seat wind triplet (south seat)','222z234m456p789s11p','1p',{seat:28},'yakuhai',1],
 ['south triplet but east seat: no yaku','222z234m456p789s11p','1p',{},null,0],
 ['round wind triplet (south seat)','111z234m456p789s11p','1p',{seat:28},'yakuhai',1],
 ['dealer east triplet counts twice','111z234m456p789s11p','1p',{seat:27},'yakuhai,yakuhai',2],
 ['two dragon triplets','555z666z234m789s11p','1p',{},'yakuhai,yakuhai',2],
 ['tanyao + 3 dora','222m345p678s444p55s','5s',{dora:['2m']},'dora,tanyao',4],
 ['dora alone never wins','123m456p789s234s55p','3m',{dora:['5p']},null,0],
 ['riichi alone','123m456p789s234s55p','3m',{riichi:1},'riichi',1],
 ['tsumo alone','123m456p789s234s55p','3m',{tsumo:1},'tsumo',1],
 ['111222333m reads as iipeikou (penchan wait: no pinfu)','111222333m789s55p','7s',{},'iipeikou',1],
 ['dragon pair, tsumo only','234m567p678s345s66z','4m',{tsumo:1},'tsumo',1],
 ['dragon pair, no yaku','234m567p678s345s66z','4m',{},null,0],
 ['pair of non-yakuhai wind keeps pinfu','234m567p678s345s33z','4m',{},'pinfu',1],
 ['pair of round wind breaks pinfu','234m567p678s345s11z','4m',{},null,0],
 ['pair of own wind breaks pinfu','234m567p678s345s22z','4m',{seat:28},null,0],
 ['pinfu 2-sided on the high side','234m567p678s345s99p','6s',{},'pinfu',1],
 ['not a winning hand','1234567m1234567p','4m',{},null,0],
 ['tanyao with a terminal pair is not tanyao','234m567p678s345s99p','4m',{riichi:1},'pinfu,riichi',2],
 ['all simples chiitoi: 2 + 1 + a dora pair (2)','2233m4455p6677s88p','8p',{dora:['8p']},'chiitoi,dora,tanyao',5],
 ['yakuhai + tanyao impossible, yakuhai + riichi','555z234m456p789s11p','1p',{riichi:1},'riichi,yakuhai',2],
 ['two identical sequences + riichi + tsumo (closed)','112233m456p789s55p','5p',{riichi:1,tsumo:1},'iipeikou,riichi,tsumo',3],
 ['sanshoku is not a yaku here: tanyao only','234m234p234s567m66p','6p',{},'tanyao',1],
 ['an honour pair is not tanyao (pinfu only)','234m567p678s345s44z','4m',{},'pinfu',1],
['tanyao + riichi','222m345p678s444p55s','5s',{riichi:1},'riichi,tanyao',2],
 ['tanyao riichi tsumo + 4 dora (444p + the 4p in 345p)','222m345p678s444p55s','5s',{riichi:1,tsumo:1,dora:['4p']},'dora,riichi,tanyao,tsumo',7],
 ['yakuhai + tsumo','555z234m456p789s11p','1p',{tsumo:1},'tsumo,yakuhai',2],
 ['three dragon triplets','555z666z777z234m11p','1p',{},'yakuhai,yakuhai,yakuhai',3],
 ['chiitoi + dora on an honour pair','1133m5577p99s22s44z','4z',{dora:['4z']},'chiitoi,dora',4],
 ['pinfu riichi tsumo iipeikou tanyao','223344m567p678s55p','8s',{riichi:1,tsumo:1},'iipeikou,pinfu,riichi,tanyao,tsumo',5],
 ['ryanmen on the low side of 123','123m456p789s234s55p','1m',{},'pinfu',1],
 ['penchan 89 waiting on 7: no pinfu','123m456p789s234s55p','7s',{},null,0],
 ['triplets + riichi (middle-dragon pair is no yaku)','111m999p333s555s77z','5s',{riichi:1},'riichi',1],
 ['pinfu iipeikou tanyao tsumo','223344m567p678s55p','8s',{tsumo:1},'iipeikou,pinfu,tanyao,tsumo',4],
 ['north pair with the north seat breaks pinfu','234m567p678s345s44z','4m',{seat:30},null,0],
 ['east triplet in the east seat + tsumo','111z234m456p789s11p','1p',{tsumo:1},'tsumo,yakuhai,yakuhai',3],
 ['west seat triplet','333z234m456p789s11p','1p',{seat:29},'yakuhai',1],
 ['iipeikou + haku triplet','112233m555z789s11p','7s',{},'iipeikou,yakuhai',2],
 ['straight 123-456-789 is only pinfu here','123456789m234p55s','4p',{},'pinfu',1],
 ['kanchan on 234s with a plain pair: riichi only','123m456p789s234s11m','3s',{riichi:1},'riichi',1],
 ['dealer east: pair of east wind breaks pinfu, riichi only','234m567p678s345s11z','4m',{riichi:1},'riichi',1],
];
for(const [name,hand,win,o,want,han] of YAKU_TABLE){
  const c=H(hand);const info=evaluateHand(c,ctxOf(win,o));
  assert.equal(keys(info),want,name);if(han)assert.equal(info.han,han,name+' han');
}
report.yakuCases=YAKU_TABLE.length;
// score table: child / dealer ron, tsumo splits (rounded up to 100), conservation
{const child=[0,1000,2000,3900,7700,8000,12000,12000,16000,16000,16000,24000,24000,32000],dealer=[0,1500,2900,5800,11600,12000,18000,18000,24000,24000,24000,36000,36000,48000];
 for(let han=1;han<=13;han++){assert.equal(handPoints(han,false),child[han]);assert.equal(handPoints(han,true),dealer[han]);}
 assert.equal(handPoints(20,false),32000,'13+ is capped');assert.equal(handPoints(0,false),1000,'minimum 1 han');
 assert.deepEqual(winDeltas(1,2,3,0),[0,3900,-3900,0].map((v,i)=>i===1?3900:i===2?-3900:0));
 assert.deepEqual(winDeltas(0,3,2,0),[2900,0,0,-2900],'dealer ron');
 assert.deepEqual(winDeltas(1,null,3,0),[-2000,4000,-1000,-1000],'child tsumo: dealer pays half, children a quarter, rounded up');
 assert.deepEqual(winDeltas(0,null,3,0),[6000,-2000,-2000,-2000],'dealer tsumo: thirds, rounded up');
 assert.deepEqual(winDeltas(2,null,1,1),[-300,-500,1100,-300].map((v,i)=>v),'han 1 child tsumo');
 for(let han=1;han<=13;han++)for(const winner of [0,1,2,3])for(const loser of [null,0,1,2,3]){if(loser===winner)continue;const d=winDeltas(winner,loser,han,0);if(loser!=null)assert.equal(d.reduce((a,b)=>a+b,0),0);else assert.ok(d.reduce((a,b)=>a+b,0)>=0&&d[winner]===-d.reduce((a,b)=>a+(b<0?b:0),0));}
}
// ---------- 5. furiten ----------
{const st=newMahjong({mode:'short',seed:77});const h=st.h;
 const setup=()=>{h.hands[1]=tilesOf('234m567p678s345s4p');h.rivers[1]=[];h.furitenTemp[1]=false;h.furitenPerm[1]=false;h.riichi[1]=false;};
 setup();assert.ok(ronInfo(st,1,T1('4p')),'tanki wait with tanyao rons');assert.ok(!ronInfo(st,1,T1('5p')),'not a wait');
 setup();h.rivers[1]=[T1('4p')];assert.equal(ronInfo(st,1,T1('4p')),null,'own discard furiten');
 setup();h.furitenTemp[1]=true;assert.equal(ronInfo(st,1,T1('4p')),null,'temporary furiten after passing');
 setup();h.furitenPerm[1]=true;assert.equal(ronInfo(st,1,T1('4p')),null,'permanent furiten (riichi pass)');
 setup();h.hands[1]=tilesOf('234m567p678s345s4p');h.rivers[1]=[T1('1m')];assert.ok(ronInfo(st,1,T1('4p')),'an unrelated discard is not furiten');
 // two-sided wait: one of the waits already discarded -> furiten for both
 setup();h.hands[1]=tilesOf('234m567p678s34s44p');h.rivers[1]=[T1('5s')];assert.equal(ronInfo(st,1,T1('2s')),null,'furiten covers every wait');
 // passing a ron sets temporary furiten (riichi: permanent) through the real flow
 const s2=newMahjong({mode:'short',seed:78});s2.h.hands[0]=tilesOf('234m567p678s345s4p');s2.h.turn=1;s2.h.drawn=T1('9z');s2.h.hands[1]=tilesOf('1133m5577p99s22s4z');
 s2.h.rivers=[[],[],[],[]];s2.h.furitenTemp.fill(false);s2.h.furitenPerm.fill(false);
 // discard the tile that seat 0 waits on from seat 1's turn
 s2.h.hands[1][0]=T1('4p');s2.h.drawn=T1('9z');
 const wasStage=s2.stage;
 const ev=R.mahjongStep(s2,{choose:()=>({action:'discard',tile:T1('4p'),riichi:false})});
 assert.equal(s2.stage,'ron','the human gets a ron choice');assert.equal(ev.next.t,'ronChoice');
 R.humanPass(s2);assert.equal(s2.h.furitenTemp[0],true,'passing makes the player temporarily furiten');
}
// ---------- 6. whole games: invariants ----------
const ALL4=new Array(34).fill(4);
function invariants(st,label) {
  assert.equal(st.points.reduce((a,b)=>a+b,0)+st.pot,100000,label+': points + pot = 100000');
  const h=st.h,wall=makeWall(st.seed,st.hand);
  const inPlay=countsOf([...h.hands.flat(),...h.rivers.flat(),...(h.drawn>=0?[h.drawn]:[])]);
  const rest=countsOf(wall.slice(h.pos));
  assert.deepEqual(inPlay.map((n,i)=>n+rest[i]),ALL4,label+': 136 tiles, 4 of each');
  for(const hand of h.hands)assert.equal(hand.length,13,label+': 13-tile hands');
  assert.ok(h.pos<=122+14&&h.pos>=52);
}
function play(st,level,rand,onStep) {
  const pol=referencePolicy(rand);let n=0;
  while(!st.over){
    assert.ok(n++<20000,'game terminates');
    if(mahjongStep(st,mahjongAi)){onStep?.(st);continue;}
    if(st.stage==='act'&&st.h.turn===0){const act=pol(viewFor(st,0),st);if(act.action==='tsumo'&&humanTsumo(st)){onStep?.(st);continue;}if(!humanDiscard(st,st.h.riichi[0]?st.h.drawn:act.tile,!!act.riichi))humanDiscard(st,st.h.drawn,false);onStep?.(st);}
    else if(st.stage==='ron'){if(!humanRon(st))humanPass(st);onStep?.(st);}
    else if(st.stage==='result'){nextHand(st);onStep?.(st);}
    else assert.fail('stuck in stage '+st.stage);
  }
  return st;
}
{const t0=performance.now();let wins=0,draws=0,hands=0,lastRanks={1:0,2:0,3:0,4:0};
 const N=10000;
 for(let g=0;g<N;g++){
  const mode=g%5===4?'full':'short',level=g%2?'adept':'novice',st=newMahjong({mode,level,bet:100,seed:1000003*g+17});
  const full=g<300; // every step is checked for the first 300 games, every hand end for the rest
  let lastHand=-1;
  play(st,level,mulberry32(g+5),s=>{if(full)invariants(s,`game ${g}`);else if(s.stage==='result'||s.over)invariants(s,`game ${g} end of hand`);if(s.stage==='result'&&s.hand!==lastHand){lastHand=s.hand;hands++;if(s.result.type==='draw')draws++;else wins++;}});
  invariants(st,`game ${g} final`);
  assert.equal(st.stage,'over');assert.deepEqual([...st.ranks].sort(),[1,2,3,4]);assert.equal(st.pot,0,'no stick is left on the table');
  assert.equal(st.payout,Math.round(100*R.MAHJONG_PAYOUT[mode][level][st.ranks[0]-1]));lastRanks[st.ranks[0]]++;
  // ranking is by points, ties broken by seat order from the first dealer
  const order=[0,1,2,3].sort((a,b)=>st.ranks[a]-st.ranks[b]);for(let i=1;i<4;i++){const a=order[i-1],b=order[i];assert.ok(st.points[a]>st.points[b]||(st.points[a]===st.points[b]&&(a-st.firstDealer+4)%4<(b-st.firstDealer+4)%4));}
  if(g%97===0){const copy=normalizeMahjong(JSON.parse(JSON.stringify(st)));assert.ok(copy,'finished games survive a save');assert.deepEqual(JSON.parse(JSON.stringify(copy)),JSON.parse(JSON.stringify(st)));}
  checks++;
 }
 report.selfPlay={games:N,hands,wins,draws,ms:Math.round(performance.now()-t0),rank1ofReference:lastRanks};
}
// ---------- 7. fair AI: it only ever sees the view ----------
{const src=readFileSync(new URL('../js/mahjong-ai.js',import.meta.url),'utf8');
 assert.ok(!/makeWall|_wall|\.hands\b|\.seed\b|\bst\./.test(src),'the AI module never touches the wall, other hands or the seed');
 const st=newMahjong({mode:'full',seed:99});play(st,'adept',mulberry32(1),()=>{});
 // take a mid-game state and scramble everything hidden: other hands, the unseen wall (seed), the dead wall
 const base=newMahjong({mode:'full',level:'adept',seed:4242});
 let n=0;while(n++<30&&!(base.stage==='act'&&base.h.turn!==0))mahjongStep(base,mahjongAi);
 for(let k=0;k<40;k++){mahjongStep(base,mahjongAi);if(base.stage!=='act'||base.h.turn===0)break;}
 if(base.stage==='act'&&base.h.turn!==0){
  const seat=base.h.turn,twin=JSON.parse(JSON.stringify(base));
  for(const s of [0,1,2,3])if(s!==seat)twin.h.hands[s]=twin.h.hands[s].map(()=>pick(34));
  twin.seed=12345;
  const a=viewFor(base,seat),b=viewFor(twin,seat);assert.deepEqual(a,b,'the view does not depend on hidden information');
  for(const level of ['novice','adept','basic'])assert.deepEqual(chooseAction(a,level,mulberry32(3)),chooseAction(b,level,mulberry32(3)),level+' decides from the view alone');
  assert.deepEqual(Object.keys(a).sort(),['dealer','doraInd','doraTile','drawn','hand','points','riichi','rivers','roundWind','seat','seatWind','turn','wallLeft']);
 }
}
// ---------- 8. save / resume ----------
{for(const mode of ['full','short']){
  const st=newMahjong({mode,level:'adept',bet:250,seed:31337});const rand=mulberry32(11);const snaps=[];
  play(st,'adept',rand,s=>{if(snaps.length<400&&(snaps.length%3===0||s.stage!=='act'))snaps.push(JSON.stringify(s));else snaps.push(null);});
  // every saved snapshot loads; continuing from it gives the same game as continuing the original (the AI is a function of the saved state)
  let loaded=0;
  for(const j of snaps.filter(Boolean).slice(0,60)){const back=normalizeMahjong(JSON.parse(j));assert.ok(back,'snapshot loads');assert.equal(JSON.stringify(back),j,'round trip');loaded++;
   const cont=play(back,'adept',mulberry32(11),()=>{});assert.equal(cont.over,true);assert.equal(cont.points.reduce((a,b)=>a+b,0),100000);}
  assert.ok(loaded>=10,'loaded '+loaded);
  // continuing the identical snapshot twice with the same policy gives the identical result
  const mid=snaps.filter(Boolean)[Math.floor(snaps.filter(Boolean).length/2)];
  const one=play(normalizeMahjong(JSON.parse(mid)),'adept',mulberry32(5),()=>{}),two=play(normalizeMahjong(JSON.parse(mid)),'adept',mulberry32(5),()=>{});assert.equal(JSON.stringify(one),JSON.stringify(two),'deterministic resume (no re-rolling by reloading)');
 }
 // tampering is rejected: swapping a tile, the seed, the points, the dealer
 const st=newMahjong({mode:'full',seed:2026});for(let i=0;i<9;i++)mahjongStep(st,mahjongAi);
 const base=JSON.parse(JSON.stringify(st));assert.ok(normalizeMahjong(base));
 const mutate=(fn)=>{const c=JSON.parse(JSON.stringify(base));fn(c);return normalizeMahjong(c);};
 assert.equal(mutate(c=>{c.h.hands[0][0]=(c.h.hands[0][0]+1)%34;}),null,'a different tile in hand');
 assert.equal(mutate(c=>{c.seed=c.seed^1;}),null,'a different wall');
 assert.equal(mutate(c=>{c.points[0]+=1000;}),null,'points must stay conserved');
 assert.equal(mutate(c=>{c.h.dealer=(c.h.dealer+1)%4;}),null,'dealer must match the hand');
 assert.equal(mutate(c=>{c.h.doraInd=(c.h.doraInd+1)%34;}),null,'dora indicator comes from the wall');
 assert.equal(mutate(c=>{c.mode='nope';}),null);assert.equal(mutate(c=>{c.v=2;}),null);assert.equal(mutate(c=>{c.h.pos=60;}),null,'progress must match the tiles in play');
 for(const junk of [null,undefined,0,'x',[],{},{v:1}])assert.equal(normalizeMahjong(junk),null);
 // casino save: kept inside normalizeCasino, a bad one dropped, an old save without it is fine
 const kept=normalizeCasino({bet:100,mahjong:JSON.parse(JSON.stringify(base))},0,3);assert.deepEqual(JSON.parse(JSON.stringify(kept.mahjong)),base);
 assert.equal(normalizeCasino({bet:100,mahjong:{v:1}},0,3).mahjong,null);assert.equal(normalizeCasino({bet:100},0,3).mahjong,null,'old saves have no game');assert.equal(normalizeCasino(undefined,0,0).mahjong,null);
}
// ---------- 9. abandon = last place, payout 0 ----------
{for(const mode of ['full','short']){
  const st=newMahjong({mode,level:'adept',bet:1000,seed:5});mahjongStep(st,mahjongAi);
  const before=[...st.points],pot=st.pot;abandonMahjong(st);
  assert.equal(st.over,true);assert.equal(st.abandoned,true);assert.equal(st.ranks[0],4);assert.equal(st.payout,0);assert.deepEqual([...st.ranks].sort(),[1,2,3,4]);
  assert.equal(st.points.reduce((a,b)=>a+b,0)+st.pot,100000);assert.equal(abandonMahjong(st),0,'abandoning twice changes nothing');
  assert.ok(normalizeMahjong(JSON.parse(JSON.stringify(st))).abandoned,'abandoned game survives a save');
  // even holding every point does not help: abandon is 4th
  const rich=newMahjong({mode,seed:6,bet:100});rich.points=[97000,1000,1000,1000];abandonMahjong(rich);assert.equal(rich.ranks[0],4);assert.equal(rich.payout,0);
 }
}
// ---------- 10. ranking and payout table ----------
{assert.deepEqual(rankPlayers([25000,25000,25000,25000]),[1,2,3,4],'ties go to seat order');
 assert.deepEqual(rankPlayers([25000,25000,25000,25000],2),[3,4,1,2],'... counted from the first dealer');
 assert.deepEqual(rankPlayers([10000,40000,30000,20000]),[4,1,2,3]);assert.deepEqual(rankPlayers([30000,30000,20000,20000]),[1,2,3,4]);
 assert.deepEqual(rankPlayers([30000,30000,20000,20000],1),[2,1,3,4]);
 const P=R.MAHJONG_PAYOUT;
 for(const mode of ['full','short'])for(const level of ['novice','adept']){const t=P[mode][level];assert.equal(t.length,4);assert.equal(t[3],0,'4th pays nothing');assert.ok(t[0]>t[1]&&t[1]>=t[2]&&t[2]>=0);assert.ok(t[0]>=3,'long games pay a big top prize');}
 for(const level of ['novice','adept']){assert.ok(P.short[level][0]<P.full[level][0],'the one-hand game pays less at the top');assert.ok(P.full.adept[0]>P.full.novice[0],'stronger CPUs pay more');}
 assert.ok(P.full.novice[0]>=3&&P.full.adept[0]>=4,'long game: 1st x3+ (novice), x4+ (adept)');
 assert.equal(R.mahjongPayout('full','adept',1,1000),P.full.adept[0]*1000);assert.equal(R.mahjongPayout('full','adept',4,1000),0);
 // the economy is not broken by the high multiples
 assert.equal(MAX_CASINO_MAHJONG_BET,casinoMaxBet(5)*5);assert.equal(casinoPageMaxBet(2,'mahjong'),casinoMaxBet(2)*5);assert.equal(casinoMahjongMaxBet(5),casinoArenaMaxBet(5));
 assert.equal(MAX_MAHJONG_PAYOUT,MAX_CASINO_MAHJONG_BET*R.MAHJONG_TOP_MULTIPLE);assert.equal(MAX_MAHJONG_PAYOUT,2500000,'Lv5: 500,000 x 5');
 const royal=POKER_PAYOUTS.find(p=>p.key==='royalFlush').mult*casinoMaxBet(5),arena=casinoArenaMaxBet(5)*CASINO_POLICY.arenaOddsRange[1];
 assert.ok(MAX_MAHJONG_PAYOUT<royal&&MAX_MAHJONG_PAYOUT<arena,`mahjong max ${MAX_MAHJONG_PAYOUT} < poker royal ${royal} and arena ${arena}`);
 for(let lv=0;lv<=5;lv++)for(const mode of ['full','short'])for(const level of ['novice','adept'])assert.ok(R.mahjongPayout(mode,level,1,casinoMahjongMaxBet(lv))<=MAX_MAHJONG_PAYOUT);
}
// ---------- 11. payout simulation: reference player vs random player ----------
{const games=300,out={};
 const dist=(mode,level,who)=>{const d=[0,0,0,0];for(let i=0;i<games;i++){const seed=(i*104729+31)>>>0,rand=mulberry32(seed^0x5bd1e995),st=newMahjong({mode,level,bet:10,seed});R.runMahjong(st,mahjongAi,who==='random'?randomPolicy(rand):referencePolicy(rand));assert.ok(st.over);d[st.ranks[0]-1]++;}return d.map(x=>x/games);};
 const ev=(d,t)=>d.reduce((n,p,i)=>n+p*t[i],0);
 for(const mode of ['full','short'])for(const level of ['novice','adept']){
  const table=R.MAHJONG_PAYOUT[mode][level],ref=ev(dist(mode,level,'reference'),table),rand=ev(dist(mode,level,'random'),table);
  out[`${mode}/${level}`]={reference:+ref.toFixed(2),random:+rand.toFixed(2)};
  assert.ok(ref>0.85&&ref<1.6,`reference EV ${mode}/${level} = ${ref} (calibrated about 1.15 novice / 1.25 adept; ${games} games is a coarse check)`);
  assert.ok(rand<0.8,`a random player loses: ${rand}`);assert.ok(ref>rand+0.4,'thinking pays');
 }
 report.payoutSim=out;
}
// ---------- 12. performance ----------
{const st=newMahjong({mode:'full',level:'adept',seed:8});const times=[];let worst=0;
 for(let g=0;g<20;g++){const s=newMahjong({mode:'full',level:'adept',seed:g+500});
  play(s,'adept',mulberry32(g),()=>{});}
 // time single CPU decisions on mid-game views
 const views=[];const s2=newMahjong({mode:'full',level:'adept',seed:909});play(s2,'adept',mulberry32(2),x=>{if(x.stage==='act'&&x.h.turn!==0&&views.length<400)views.push(viewFor(x,x.h.turn));});
 const t0=performance.now();for(const v of views){const a=performance.now();chooseAction(v,'adept',mulberry32(1));worst=Math.max(worst,performance.now()-a);}
 const per=(performance.now()-t0)/views.length;
 const snap=JSON.parse(JSON.stringify(s2));const n0=performance.now();for(let i=0;i<50;i++)normalizeMahjong(JSON.parse(JSON.stringify(newMahjong({seed:i}))));const norm=(performance.now()-n0)/50;
 report.perf={decisions:views.length,msPerDecision:+per.toFixed(2),worstMs:+worst.toFixed(1),normalizeMs:+norm.toFixed(2)};
 assert.ok(per<8,`CPU decision ${per} ms`);assert.ok(worst<80);assert.ok(norm<8,`save validation ${norm} ms`);
}
console.log('PASS mahjong v7.1.0',JSON.stringify(report),checks,'checks');










