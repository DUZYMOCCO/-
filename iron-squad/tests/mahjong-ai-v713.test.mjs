// v7.1.3 / v7.1.4: the CPU ladder and the payout calibration. Safety reading (genbutsu / suji / kabe), push/fold, folding against riichi, the strength order 見習い < 雀士 < 達人 (measured with the reference player),
// and that no level ever sees hidden information. Run: node iron-squad/tests/mahjong-ai-v713.test.mjs [quick]
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {newMahjong,runMahjong,mulberry32,shanten,kindCounts,MAHJONG_PAYOUT} from '../js/mahjong-rules.js';
import {mahjongAi,referencePolicy,randomPolicy,dangerVs,ADEPT_SLOPPY,NOVICE_SLOPPY} from '../js/mahjong-ai.js';
const K=id=>id>>2;
const QUICK=process.argv[2]==='quick';
const sloppyRef=ADEPT_SLOPPY;
/** Reference player (seat 0) vs three CPUs of one level: average finishing place and win rate. */
function ladder(level,games,seed0,mode='full',random=false) {
  let sum=0,first=0,ev=0;const table=MAHJONG_PAYOUT[mode][level];
  for(let i=0;i<games;i++){
    const seed=(seed0+i*104729)>>>0,rand=mulberry32(seed^0x5bd1e995),st=newMahjong({mode,level,bet:10,seed});
    runMahjong(st,mahjongAi,random?randomPolicy(rand):referencePolicy(rand),300000);
    sum+=st.ranks[0];if(st.ranks[0]===1)first++;ev+=table[st.ranks[0]-1];
  }
  return {avg:sum/games,first:first/games,ev:ev/games};
}
/** What the CPUs throw when somebody else is in riichi and they are far from tenpai. */
function defence(level,games,seed0) {
  let n=0,safe=0,suji=0,total=0,dealIn=0,deals=0;
  const spy={choose(view,lv,rand){
    const act=mahjongAi.choose(view,lv,rand);total++;
    if(act&&act.action==='discard'&&!view.riichi[view.seat]&&view.seat!==0){
      const th=[1,2,3].filter(s=>s!==view.seat&&view.riichi[s]);
      if(th.length){
        const c=kindCounts([...view.hand,...(view.drawn>=0?[view.drawn]:[])]);c[K(act.tile)]--;
        if(shanten(c,view.melds[view.seat].length)>=2){
          n++;const seen=new Array(34).fill(0);
          const d=Math.max(...th.map(s=>dangerVs(view,s,K(act.tile),seen)));
          if(d===0)safe++;else if(d<=3.6)suji++;
        }
      }
    }
    return act;},chooseCall:mahjongAi.chooseCall};
  for(let i=0;i<games;i++){
    const seed=(seed0+i*7919)>>>0,rand=mulberry32(seed^0x1234567),st=newMahjong({mode:'full',level,bet:10,seed});
    runMahjong(st,spy,referencePolicy(rand),300000,s=>{deals++;const r=s.result;if(r.type==='ron'&&r.loser>0)dealIn++;});
  }
  return {n,safe:n?safe/n:0,safeOrSuji:n?(safe+suji)/n:0,dealInPerDeal:dealIn/deals};
}
if(!isMainThread){parentPort.postMessage(workerData.kind==='ladder'?ladder(workerData.level,workerData.games,workerData.seed,workerData.mode,workerData.random):defence(workerData.level,workerData.games,workerData.seed));}
else {
  let checks=0;const ok=(c,m)=>{checks++;assert.ok(c,m);};
  // ---- 1. safety reading on a hand-made table ----
  const view=(rivers,extra={})=>({seat:0,rivers,riichi:[false,true,false,false],riichiAt:[-1,0,-1,-1],log:[[1,0*4]],doraTiles:[],dealer:3,...extra});
  const seen0=new Array(34).fill(0);
  const rv=[[],[4*4,31*4+1],[],[]];// seat 1 threw 5m and 白(=kind 31)? (id/4 = kind) -> 5m: id 16, 白: id 124
  rv[1]=[16,124];
  const V=view(rv);const d=(t,seen=seen0)=>dangerVs(V,1,t,seen);
  ok(d(4)===0,'genbutsu (5m is in the riichi player\'s river) is zero');
  ok(d(31)===0,'so is the honour it threw');
  ok(d(1)<d(2)&&d(1)<d(0)+5,'2m is suji of 5m: safer than 3m (not suji)');
  ok(d(7)<d(6)||d(7)<d(8),'8m is suji of 5m: safer than 7m');
  ok(d(1)<d(12),'suji 2m is safer than a non-suji middle tile (4p)');
  ok(d(27)>0&&d(27)<d(13),'a fresh honour is safer than a middle tile');
  const seenHonor=seen0.slice();seenHonor[27]=3;ok(dangerVs(V,1,27,seenHonor)<d(27),'the last copy of an honour is nearly safe');
  const seenKabe=seen0.slice();seenKabe[1]=4;seenKabe[2]=4;ok(dangerVs(V,1,0,seenKabe)<dangerVs(V,1,0,seen0),'kabe: 1m is safer once 2m and 3m are gone');
  ok(dangerVs({...V,doraTiles:[13]},1,13,seen0)>d(13),'dora is more dangerous');
  ok(dangerVs({...V,dealer:1},1,13,seen0)>dangerVs({...V,dealer:0},1,13,seen0),'a riichi dealer is more dangerous');
  // ---- 2. no hidden information ----
  const src=readFileSync(new URL('../js/mahjong-ai.js',import.meta.url),'utf8');
  ok(!/\bst\.h\.hands|\.wall\b|makeWall|\bwallOf\b|process\.|globalThis|Math\.random\(\)/.test(src.replace(/rand=Math\.random/g,'')),'the AI reads only the view (no wall, no other hands, no environment switches)');
  ok(ADEPT_SLOPPY>0&&ADEPT_SLOPPY>=NOVICE_SLOPPY,'the adept is sloppier than a master (0) but not hopeless');
  if(QUICK){console.log(JSON.stringify({checks,quick:true}));process.exit(0);}
  // ---- 3. behaviour + strength (worker threads) ----
  const run=data=>new Promise((res,rej)=>{const w=new Worker(new URL(import.meta.url),{workerData:data});w.on('message',res);w.on('error',rej);});
  const levels=['novice','adept','master'],G=1500,D=500;
  const [lad,def]=await Promise.all([Promise.all(levels.map(l=>run({kind:'ladder',level:l,games:G,seed:900001}))),Promise.all(levels.map(l=>run({kind:'defence',level:l,games:D,seed:424243})))]);
  const L=Object.fromEntries(levels.map((l,i)=>[l,lad[i]])),F=Object.fromEntries(levels.map((l,i)=>[l,def[i]]));
  // the reference player does worse against stronger tables
  ok(L.novice.avg<L.adept.avg-0.2,`reference vs 見習い (${L.novice.avg.toFixed(3)}) is clearly easier than vs 雀士 (${L.adept.avg.toFixed(3)})`);
  ok(L.adept.avg<L.master.avg,`reference vs 雀士 (${L.adept.avg.toFixed(3)}) is easier than vs 達人 (${L.master.avg.toFixed(3)})`);
  ok(L.novice.first>L.adept.first&&L.adept.first>L.master.first,'and wins more often against the weaker tables');
  // defence: the adept and the master hand back safe tiles when far from tenpai against a riichi; the novice does not
  ok(F.novice.n>100&&F.adept.n>100&&F.master.n>100,`enough riichi situations (${F.novice.n}/${F.adept.n}/${F.master.n})`);
  ok(F.adept.safe>F.novice.safe+0.25,`adept folds to genbutsu (${F.adept.safe.toFixed(2)} vs novice ${F.novice.safe.toFixed(2)})`);
  ok(F.master.safe>F.novice.safe+0.25,`master folds to genbutsu (${F.master.safe.toFixed(2)} vs novice ${F.novice.safe.toFixed(2)})`);
  ok(F.master.safeOrSuji>=F.master.safe&&F.master.safeOrSuji>0.5,'and prefers suji when no genbutsu is left');
  // ---- 4. payout calibration: the reference player returns about 1.15 / 1.25 / 1.35 x the stake, a random player far less than 1 ----
  const [shortLad,rndFull,rndShort]=await Promise.all([Promise.all(levels.map(l=>run({kind:'ladder',level:l,games:3000,seed:555001,mode:'short'}))),Promise.all(levels.map(l=>run({kind:'ladder',level:l,games:300,seed:777001,mode:'full',random:true}))),Promise.all(levels.map(l=>run({kind:'ladder',level:l,games:1000,seed:888001,mode:'short',random:true})))]);
  const target={novice:1.15,adept:1.25,master:1.35},EV={full:{},short:{}},RND={full:{},short:{}};
  levels.forEach((l,i)=>{EV.full[l]=L[l].ev;EV.short[l]=shortLad[i].ev;RND.full[l]=rndFull[i].ev;RND.short[l]=rndShort[i].ev;});
  for(const mode of ['full','short'])for(const l of levels){
    ok(Math.abs(EV[mode][l]-target[l])<0.13,`${mode}/${l}: reference EV ${EV[mode][l].toFixed(3)} is near ${target[l]}`);
    ok(RND[mode][l]<0.6,`${mode}/${l}: random EV ${RND[mode][l].toFixed(3)} is far below 1`);
    ok(EV[mode][l]>1.0,`${mode}/${l}: a competent player profits`);
  }
  for(const mode of ['full','short'])ok(EV[mode].novice<EV[mode].master,`${mode}: the stronger table pays the reference player more (${EV[mode].novice.toFixed(2)} < ${EV[mode].master.toFixed(2)})`);
  console.log(JSON.stringify({checks,ladder:L,defence:F,ev:EV,random:RND}));
  console.log(`PASS mahjong ai v7.1.3-4 ${checks} checks`);
}
