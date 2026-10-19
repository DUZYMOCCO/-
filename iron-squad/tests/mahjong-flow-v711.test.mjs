// v7.1.1: Mahjong game flow — calls (chi/pon/daiminkan/ankan/kakan/chankan/kuikae), furiten, riichi (ippatsu, double riichi, stick return), abortive and exhaustive draws,
// renchan / honba / bust / agari-yame, AI-vs-AI conservation over thousands of games, save/resume (incl. mid-claim), tamper rejection, v7.1.0 saves, payout economy, AI fairness, performance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as R from '../js/mahjong-rules.js';
import {chooseAction,chooseCall,mahjongAi,referencePolicy,randomPolicy} from '../js/mahjong-ai.js';
import {MAX_MAHJONG_PAYOUT,MAX_CASINO_MAHJONG_BET,casinoMahjongMaxBet,casinoMaxBet,casinoArenaMaxBet,POKER_PAYOUTS,CASINO_POLICY,normalizeCasino} from '../js/casino-rules.js';
const {newMahjong,mahjongStep,humanDiscard,humanTsumo,humanAnkan,humanKakan,humanKyuushu,humanClaim,claimPrompt,viewFor,nextHand,abandonMahjong,normalizeMahjong,runMahjong,mulberry32,tsumoInfo,ronInfo,isFuriten}=R;
let checks=0;const ok=(c,m)=>{checks++;assert.ok(c,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const report={};const QUICK=process.argv[2]==='quick';
const parse=s=>{const out=[];for(const [,d,suit] of s.matchAll(/(\d+)([mpsz])/g))for(const x of d)out.push({m:0,p:9,s:18,z:27}[suit]+Number(x)-1);return out;};
const J=o=>JSON.parse(JSON.stringify(o));
const FILLER=['1m9m1p9p1s9s2z3z4z5z6z7z2m','1m9m1p9p1s9s2z3z4z5z6z7z3m','1m9m1p9p1s9s2z3z4z5z6z7z4m','1m9m1p9p1s9s2z3z4z5z6z7z6m'];
/** A real new game whose hands / turn / drawn are replaced. Ids come from a per-scenario pool so every tile is unique; each given hand must have 13 tiles. */
function scen({mode='full',level='adept',seed=3,turn=0,hands={},drawn=null,dealer=0,pos=null,late=false}={}) {
  const st=newMahjong({mode,level,seed,bet:100}),h=st.h,used=new Set();
  const take=k=>{for(const red of [false,true])for(let n=3;n>=0;n--){const id=k*4+n;if(!used.has(id)&&(red||!R.isRedId(id))){used.add(id);return id;}}throw new Error('no tile '+k);};
  h.dealer=dealer;h.turn=turn;
  for(let s=0;s<4;s++){const ks=parse(hands[s]||FILLER[s]);assert.ok([13,10].includes(ks.length),`hand ${s} has 13 (or 10, with a meld) tiles`);h.hands[s]=ks.map(take).sort((a,b)=>a-b);}
  h.drawn=drawn==null?-1:take(parse(drawn)[0]);if(pos!=null)h.pos=pos;
  if(late)for(let s=0;s<4;s++){const id=take(27);h.log.push([s,id]);h.rivers[s].push(id);} // every seat has thrown something: no tenhou / chiihou
  st.stage='act';return {st,h,take,id:s=>take(parse(s)[0])};
}
const fake=(discard,call=()=>({action:'pass'}))=>({choose:v=>discard(v),chooseCall:(v,c)=>call(v,c)});
const keepDrawn=fake(v=>({action:'discard',tile:v.drawn,riichi:false}));
const sum=st=>st.points.reduce((a,b)=>a+b,0)+st.pot;
const keys=info=>info.yaku.map(y=>y.key);
// ---------- 1. calls ----------
{
  const {st,h}=scen({turn:3,hands:{0:'23m456p789s11z2z3z4z'},drawn:'4m'});
  const ev=mahjongStep(st,keepDrawn);ok(ev.t==='discard'&&ev.tile>>2===3,'seat 3 threw 4m');
  eq(st.stage,'claim');const p=claimPrompt(st);ok(p&&!p.ron&&!p.pon&&p.chi.length===1,'one chi option (2m3m)');eq(p.chi[0].map(i=>i>>2).sort((a,b)=>a-b),[1,2]);
  const c=humanClaim(st,{t:'chi',ids:p.chi[0]});eq([c.t,c.type,c.seat,c.from],['call','chi',0,3]);
  eq(h.melds[0].length,1);eq(h.melds[0][0].type,'chi');eq(h.hands[0].length,11);eq(h.turn,0);ok(h.mustDiscard,'must discard after a call');eq(st.stage,'act');eq(h.taken.length,1,'the called tile leaves the river');eq(h.calls,1);
  ok(h.kuikae.includes(3)&&h.kuikae.includes(0),'kuikae: the called kind 4m and the swap twin 1m are forbidden (2m3m + 4m)');
  eq(sum(st),100000);
}
{
  // kuikae blocks the forbidden tile only while another tile can be thrown
  const {st,h}=scen({turn:3,hands:{0:'23m1m456p789s11z2z3z'},drawn:'4m'});mahjongStep(st,keepDrawn);humanClaim(st,{t:'chi',ids:claimPrompt(st).chi[0]});
  const one=h.hands[0].find(i=>i>>2===0);ok(one!==undefined);eq(humanDiscard(st,one),null,'1m is a swap-call tile: refused');
  const calledKind=h.hands[0].find(i=>i>>2===3);eq(calledKind,undefined);
  const ok1=humanDiscard(st,h.hands[0].find(i=>i>>2===27));ok(ok1&&ok1.t==='discard','another tile is fine');
  // 2m called with 3m4m: 2m and 5m forbidden (and a hand with only forbidden tiles may throw them)
  const b=scen({turn:3,hands:{0:'34m5m456p789s11z2z3z'},drawn:'2m'});mahjongStep(b.st,keepDrawn);const pr=claimPrompt(b.st);
  const opt=pr.chi.find(x=>x.map(i=>i>>2).sort((a,c)=>a-c).join()==='2,3');ok(opt);humanClaim(b.st,{t:'chi',ids:opt});
  ok(b.h.kuikae.includes(1)&&b.h.kuikae.includes(4),'2m with 3m4m: 2m and 5m are forbidden');
  eq(humanDiscard(b.st,b.h.hands[0].find(i=>i>>2===4)),null,'5m refused');
  // a pon forbids only its own kind
  const pn=scen({turn:2,hands:{0:'55p123m456s11z2z3z7z'},drawn:'5p'});mahjongStep(pn.st,keepDrawn);humanClaim(pn.st,{t:'pon'});eq(pn.h.kuikae,[13]);
}
{
  const {st,h}=scen({turn:2,hands:{0:'55p123m456s11z2z3z7z'},drawn:'5p'});
  mahjongStep(st,keepDrawn);const p=claimPrompt(st);ok(p&&p.pon&&!p.kan&&!p.ron,'pon offered');eq(p.chi,[],'chi only from the player on the left');
  const e=humanClaim(st,{t:'pon'});eq([e.t,e.type,e.from],['call','pon',2]);eq(h.melds[0][0].tiles.map(i=>i>>2),[13,13,13]);eq(h.turn,0);eq(h.hands[0].length,11);
  ok(humanDiscard(st,h.hands[0].find(i=>i>>2===27))!==null,'discard after pon');eq(h.rivers[0].length,1);
  const q=scen({turn:2,hands:{0:'55p123m456s11z2z3z7z'},drawn:'5p'});mahjongStep(q.st,keepDrawn);humanClaim(q.st,{t:'pass'});
  ok(q.st.stage==='act'&&q.h.turn===3,'after skipping, play goes on with the next seat');eq(q.h.melds[0].length,0);
  // a call clears every ippatsu
  const r=scen({turn:2,hands:{0:'55p123m456s11z2z3z7z'},drawn:'5p'});r.h.riichi[1]=true;r.h.ippatsu[1]=true;r.h.riichiAt[1]=0;r.h.log.push([1,0]);r.h.rivers[1].push(0);
  mahjongStep(r.st,keepDrawn);humanClaim(r.st,{t:'pon'});eq(r.h.ippatsu,[false,false,false,false],'a call ends ippatsu');
}
{
  const sc=scen({turn:2,hands:{0:'555p123m456s11z67z'},drawn:'5p'});
  mahjongStep(sc.st,keepDrawn);const p=claimPrompt(sc.st);ok(p.kan&&p.pon,'kan and pon offered');
  const e=humanClaim(sc.st,{t:'kan'});eq([e.t,e.type],['call','minkan']);
  eq(sc.h.kans,1);eq(sc.h.melds[0][0].tiles.length,4);ok(sc.h.drawn>=0&&sc.h.fromRinshan,'rinshan tile drawn');eq(sc.h.doraInds.length,1);eq(sc.h.pendDora,1);ok(!sc.h.mustDiscard);
  ok(humanDiscard(sc.st,sc.h.drawn)!==null);eq(sc.h.doraInds.length,2,'the new dora indicator shows after the discard');eq(sc.h.pendDora,0);
}
{
  // ankan reveals the indicator at once; a rinshan win scores rinshan
  const s2=scen({turn:0,hands:{0:'222m456p789s111z8s'},drawn:'2m'});
  ok(R.ankanOptions(s2.st,0).includes(1),'ankan on 2m');
  const e=humanAnkan(s2.st,1);eq([e.t,e.type],['kan','ankan']);eq(s2.h.kans,1);eq(s2.h.doraInds.length,2);ok(s2.h.fromRinshan);eq(s2.h.melds[0][0].type,'ankan');eq(s2.h.melds[0][0].tiles.length,4);ok(!R.ankanOptions(s2.st,0).includes(1));
  const win=s2.take(25);s2.h.drawn=win;const info=tsumoInfo(s2.st,0);ok(info,'rinshan tsumo wins');ok(keys(info).includes('rinshan')&&keys(info).includes('yakuhai')&&keys(info).includes('tsumo'),'rinshan + east + tsumo');
  eq(humanTsumo(s2.st).t,'tsumo');eq(s2.st.result.type,'tsumo');eq(sum(s2.st),100000);
}
{
  // kakan: when nobody can rob it, it completes; with a waiting hand the kan is robbed (chankan)
  const make=(rob)=>{const sc=scen({turn:0,hands:{0:'123m456s55s67z',1:rob?'123m456m789m46p99s':undefined},drawn:'5p'});
    const t=[sc.take(13),sc.take(13),sc.take(13)];sc.h.melds[0].push({type:'pon',tiles:t.sort((a,b)=>a-b),from:2,called:t[2]});return sc;};
  const free=make(false);eq(free.h.hands[0].length,10);ok(R.kakanOptions(free.st,0).includes(13));
  const e=humanKakan(free.st,13);eq([e.t,e.type],['kan','kakan']);eq(free.h.melds[0][0].type,'kakan');eq(free.h.melds[0][0].tiles.length,4);eq(free.h.kans,1);ok(free.h.drawn>=0,'rinshan drawn');
  const rob=make(true);eq(rob.h.hands[1].length,13);const ev=humanKakan(rob.st,13);
  eq([ev.t,ev.seat,ev.loser],['ron',1,0],'seat 1 robs the kan');ok(rob.st.result.chankan&&rob.st.result.yaku.some(y=>y.key==='chankan'),'chankan yaku');eq(rob.h.melds[0][0].type,'pon','the kan did not happen');eq(sum(rob.st),100000);
}
// ---------- 2. furiten ----------
{
  const T0='34m456p234p678s55p';
  const a=scen({turn:3,hands:{0:T0},drawn:'2m'});mahjongStep(a.st,keepDrawn);
  const p=claimPrompt(a.st);ok(p&&p.ron,'ron offered on 2m (tanyao)');
  humanClaim(a.st,{t:'pass'});ok(a.h.furitenTemp[0],'passing a ron makes the player furiten for the turn');ok(isFuriten(a.st,0));
  eq(ronInfo(a.st,0,a.id('5m')),null,'no ron on the other wait while furiten');
  while(claimPrompt(a.st))humanClaim(a.st,{t:'pass'});eq(a.st.stage,'act');ok(!a.h.furitenPerm[0]);ok(humanDiscard(a.st,a.h.drawn));ok(!a.h.furitenTemp[0],'temporary furiten ends with the own discard');
  const b=scen({turn:3,hands:{0:T0},drawn:'2m'});b.h.riichi[0]=true;b.h.riichiAt[0]=0;b.h.log.push([0,0]);b.h.rivers[0].push(0);b.st.points[0]-=1000;b.st.pot+=1000;
  mahjongStep(b.st,keepDrawn);ok(claimPrompt(b.st)?.ron);humanClaim(b.st,{t:'pass'});ok(b.h.furitenPerm[0],'after riichi a passed ron is furiten for good');
  const c=scen({turn:0,hands:{0:T0},drawn:'5m'});c.h.rivers[0].push(c.id('2m'));ok(isFuriten(c.st,0),'a wait tile in the own river is furiten');
  eq(ronInfo(c.st,0,c.id('5m')),null);ok(tsumoInfo(c.st,0),'but the tsumo still wins');
  const d=scen({turn:0,hands:{0:T0},drawn:'5m'});ok(!isFuriten(d.st,0));ok(ronInfo(d.st,0,d.id('2m')));
}
// ---------- 3. riichi: double riichi, ippatsu, stick return ----------
{
  const T='123m456m789m22p55s';
  const sc=scen({turn:1,hands:{1:T},drawn:'7z'});
  const ev=mahjongStep(sc.st,fake(v=>({action:'discard',tile:v.drawn,riichi:true})));ok(ev.t==='discard'&&ev.riichi,'seat 1 declares riichi');
  eq(sc.st.points[1],24000);eq(sc.st.pot,1000);ok(sc.h.riichi[1]&&sc.h.wriichi[1]&&sc.h.ippatsu[1],'double riichi on the first discard, ippatsu live');eq(sum(sc.st),100000);
  sc.h.turn=1;sc.h.drawn=sc.take(10);sc.st.stage='act';sc.h.claim=null;
  const info=tsumoInfo(sc.st,1);ok(info);ok(keys(info).includes('wriichi')&&keys(info).includes('ippatsu')&&keys(info).includes('tsumo')&&!keys(info).includes('riichi'),'double riichi + ippatsu + tsumo');
  sc.h.ippatsu[1]=false;ok(!keys(tsumoInfo(sc.st,1)).includes('ippatsu'),'no ippatsu once it is gone');
  const late=scen({turn:1,hands:{1:T},drawn:'7z'});late.h.rivers[1].push(late.take(27));late.h.log.push([1,0]);
  mahjongStep(late.st,fake(v=>({action:'discard',tile:v.drawn,riichi:true})));ok(late.h.riichi[1]&&!late.h.wriichi[1],'riichi after an earlier discard is a normal riichi');
  const nc=scen({turn:1,hands:{1:T},drawn:'7z'});nc.h.calls=1;mahjongStep(nc.st,fake(v=>({action:'discard',tile:v.drawn,riichi:true})));ok(!nc.h.wriichi[1],'no double riichi after a call');
  // the riichi stick comes back when the declaration tile is robbed
  const r=scen({turn:1,hands:{1:T,2:'123m456m789m123p7z'},drawn:'7z'});
  const e2=mahjongStep(r.st,fake(v=>({action:'discard',tile:v.drawn,riichi:true})));eq(e2.next.t,'ron');eq(e2.next.seat,2);
  ok(!r.h.riichi[1],'the riichi is void');eq(r.st.result.pot,0,'no stick to collect: it went back');eq(r.st.points[1],25000+r.st.result.deltas[1]);eq(sum(r.st),100000);
  // a riichi stick on the table goes to the winner
  const w=scen({turn:0,hands:{0:'123m456m789m123p5s'},drawn:'5s',late:true});w.st.pot=2000;w.st.points[1]-=2000;const t=humanTsumo(w.st);eq(t.t,'tsumo');eq(w.st.result.pot,2000);eq(w.st.pot,0);eq(sum(w.st),100000);
}
// ---------- 4. abortive draws ----------
{
  const sf=scen({turn:0,dealer:0});
  for(let i=0;i<4;i++){const seat=sf.h.turn;sf.h.drawn=sf.id('1z');if(seat===0)ok(humanDiscard(sf.st,sf.h.drawn));else mahjongStep(sf.st,keepDrawn);}
  eq([sf.st.stage,sf.st.result.type,sf.st.result.reason],['result','abort','suufon'],'suufon renda');eq(sf.st.result.deltas,[0,0,0,0]);eq(sf.st.result.next,'renchan','an abortive draw keeps the dealer');
  const n=nextHand(sf.st);eq(n,'renchan');eq(sf.st.honba,1,'abort adds a honba');eq(sf.st.hand,0);eq(sf.st.deal,1);
  const sc=scen({turn:1});sc.h.riichi=[true,true,true,true];sc.h.drawn=sc.id('1z');mahjongStep(sc.st,keepDrawn);eq(sc.st.result?.reason,'suucha','four riichi');
  const sk=scen({turn:1});sk.h.kans=4;sk.h.kanSeats=[2,2,0,0];sk.h.drawn=sk.id('1z');mahjongStep(sk.st,keepDrawn);eq(sk.st.result?.reason,'suukan','four kans by two players');
  const one=scen({turn:1});one.h.kans=4;one.h.kanSeats=[4,0,0,0];one.h.drawn=one.id('1z');mahjongStep(one.st,keepDrawn);ok(one.st.result?.type!=='abort','four kans by one player (suukantsu) is not an abort');
  const ky=scen({turn:0});ky.h.drawn=ky.id('1z');ok(R.kyuushuOk(ky.st,0));const k=humanKyuushu(ky.st);eq([k.t,k.reason],['abort','kyuushu']);eq(ky.st.result.next,'renchan');
  const no=scen({turn:0});no.h.drawn=no.id('1z');no.h.rivers[0].push(no.take(27));ok(!R.kyuushuOk(no.st,0),'not after a discard');const no2=scen({turn:0});no2.h.drawn=no2.id('1z');no2.h.calls=1;ok(!R.kyuushuOk(no2.st,0),'not after a call');
}
// ---------- 5. renchan / honba / bust / agari-yame ----------
{
  const W='123m456m789m123p5s';
  const d=scen({turn:0,hands:{0:W},drawn:'5s',late:true});const before=[...d.st.points];humanTsumo(d.st);eq(d.st.result.next,'renchan','a dealer win keeps the deal');ok(d.st.points[0]>before[0]);eq(sum(d.st),100000);
  eq(nextHand(d.st),'renchan');eq([d.st.hand,d.st.deal,d.st.honba,d.st.h.dealer],[0,1,1,0]);eq(d.st.stage,'act');
  const n=scen({turn:1,hands:{1:W},drawn:'5s',late:true});mahjongStep(n.st,keepDrawn);eq(n.st.result.type,'tsumo');eq(n.st.result.next,'advance');eq(nextHand(n.st),'advance');eq([n.st.hand,n.st.honba,n.st.h.dealer],[1,0,1],'a child win moves the deal and resets honba');
  // honba adds 300 to a ron and 100 per payer to a tsumo
  const hb=scen({turn:1,hands:{1:W},drawn:'5s',late:true});hb.st.honba=2;mahjongStep(hb.st,keepDrawn);const base=R.basePoints(hb.st.result.han,hb.st.result.fu,hb.st.result.yakuman);
  eq(hb.st.result.deltas,R.scoreDeltas(1,null,base,0,2));eq(hb.st.result.deltas[1],-(hb.st.result.deltas[0]+hb.st.result.deltas[2]+hb.st.result.deltas[3]));
  // last hand: the dealer who wins and leads ends the game (agari-yame); a dealer who is not first goes on
  const ly=scen({turn:3,dealer:3,hands:{3:W},drawn:'5s',late:true});ly.st.hand=3;mahjongStep(ly.st,keepDrawn);eq(ly.st.result.next,'over','top dealer wins the last hand: the game ends');
  const lr=scen({turn:3,dealer:3,hands:{3:W},drawn:'5s',late:true});lr.st.hand=3;lr.st.points=[40000,30000,30000,0];mahjongStep(lr.st,keepDrawn);eq(lr.st.result.next,'renchan','a dealer who is still behind plays on');
  const sh=scen({mode:'short',turn:1,hands:{1:W},drawn:'5s',late:true});sh.h.dealer=0;mahjongStep(sh.st,keepDrawn);eq(sh.st.result.next,'over','the 1-hand game ends after one hand');
  // bust
  const bu=scen({turn:0,hands:{0:'123m456m789m123p5s'},drawn:'5s',late:true});bu.st.points=[97000,1000,1000,1000];humanTsumo(bu.st);ok(bu.st.points.some(p=>p<0));ok(bu.st.result.bust);eq(bu.st.result.next,'over','a player below 0 ends the game');
  eq(nextHand(bu.st),'over');ok(bu.st.over);eq(bu.st.ranks[0],1);eq(sum(bu.st),100000);
}
// ---------- 6. exhaustive draw payments ----------
{
  const T=['234m567m234p567p9s','234p567p234s567s9m','234s567s234m567m9p','345m678m345p678p1s'];
  const draw=(tenpai,turn=0,dealer=0)=>{const hands={};for(let s=0;s<4;s++)if(tenpai.includes(s))hands[s]=T[s];
    const sc=scen({turn,dealer,hands,pos:R.LIVE_END,drawn:'8s'});if(turn===0)humanDiscard(sc.st,sc.h.drawn);else mahjongStep(sc.st,keepDrawn);return sc;};
  const want={0:[0,0,0,0],1:[3000,-1000,-1000,-1000],2:[1500,1500,-1500,-1500],3:[1000,1000,1000,-3000],4:[0,0,0,0]};
  for(const k of [0,1,2,3,4]){const sc=draw([0,1,2,3].slice(0,k));eq(sc.st.result.type,'draw');eq(sc.st.result.deltas,want[k],`${k} tenpai`);eq(sum(sc.st),100000);eq(sc.st.result.next,k>=1&&k<=4?'renchan':'advance',`dealer tenpai (${k}) continues`);}
  const nd=draw([1,2]);eq(nd.st.result.next,'advance','dealer noten: the deal passes');eq(nextHand(nd.st),'advance');eq(nd.st.honba,1,'a draw adds a honba');
  const tp=draw([0]);eq(nextHand(tp.st),'renchan');eq(tp.st.honba,1);eq(tp.st.h.dealer,0);
  const sh=scen({mode:'short',turn:0,pos:R.LIVE_END,drawn:'8s',hands:{0:T[0]}});humanDiscard(sh.st,sh.h.drawn);eq(sh.st.result.next,'over','a one-hand game is over after a draw');
}
console.log('scenarios ok',checks);
// ---------- 7. AI-vs-AI conservation ----------
const features={calls:0,pon:0,chi:0,minkan:0,ankan:0,kakan:0,riichi:0,renchan:0,honba:0,abort:0,draw:0,tsumo:0,ron:0,bust:0,yakuman:0,doubleRiichi:0,ippatsu:0,chankan:0,rinshan:0,aka:0,ura:0,hands:0,games:0,steps:0};
function checkState(st) {
  eq(sum(st),100000,'points + pot are conserved');
  if(st.h){const h=st.h,tiles=[...h.hands.flat(),...h.melds.flat().flatMap(m=>m.tiles),...h.log.map(e=>e[1]).filter((_,i)=>!h.taken.includes(i)),...(h.drawn>=0?[h.drawn]:[])];ok(new Set(tiles).size===tiles.length,'no tile appears twice');ok(tiles.every(t=>t>=0&&t<136));eq(tiles.length,h.pos+h.kans,'tiles in play = tiles drawn');for(const t of [...tiles])ok(t>=0);}
}
function simulate(n,{modes,levels,seedBase,snapEvery=0}) {
  const t0=performance.now();
  for(let g=0;g<n;g++){
    const mode=modes[g%modes.length],level=levels[g%levels.length],st=newMahjong({mode,level,bet:100,seed:(seedBase+g*7919)>>>0}),rand=mulberry32(g*13+5);
    const policy=g%3===0?referencePolicy(rand):(view,claim)=>claim?chooseCall(view,claim,level,rand):chooseAction(view,level,rand);
    runMahjong(st,mahjongAi,policy,400000,s=>{
      features.hands++;const r=s.result;checkState(s);
      if(r.type==='draw')features.draw++;else if(r.type==='abort')features.abort++;else{features[r.type]++;if(r.yakuman)features.yakuman++;for(const y of r.yaku){if(y.key==='wriichi')features.doubleRiichi++;if(y.key==='ippatsu')features.ippatsu++;if(y.key==='chankan')features.chankan++;if(y.key==='rinshan')features.rinshan++;if(y.key==='aka')features.aka++;if(y.key==='ura')features.ura++;}}
      if(r.next==='renchan')features.renchan++;if(r.bust)features.bust++;if(s.honba>0)features.honba++;
      for(const ms of s.h.melds)for(const m of ms){features.calls++;if(m.type==='pon')features.pon++;if(m.type==='chi')features.chi++;if(m.type==='minkan')features.minkan++;if(m.type==='ankan')features.ankan++;if(m.type==='kakan')features.kakan++;}
      if(s.h.riichi.some(Boolean))features.riichi++;
      if(snapEvery&&features.hands%snapEvery===0){const copy=normalizeMahjong(J(s));ok(copy,'a finished hand survives a save');eq(J(copy),J(s),'save round trip is exact');}
    });
    ok(st.over,'every game ends');checkState(st);eq([...st.ranks].sort((a,b)=>a-b),[1,2,3,4]);ok(st.payout>=0&&st.payout<=Math.round(100*R.MAHJONG_TOP_MULTIPLE));
    ok(st.points.every(p=>Number.isInteger(p)),'integer points');
    if(mode==='short')eq(st.hand,0);features.games++;
  }
  return performance.now()-t0;
}
{
  const t1=simulate(QUICK?700:7000,{modes:['short'],levels:['novice','adept','master'],seedBase:1000003,snapEvery:97});
  const t2=simulate(QUICK?180:1800,{modes:['full'],levels:['novice','adept','master'],seedBase:77777,snapEvery:31});
  report.simulation={games:features.games,hands:features.hands,seconds:Math.round((t1+t2)/1000)};report.features=features;
  if(QUICK)console.log(JSON.stringify(features));ok(QUICK||features.hands>=10000,`at least 10,000 hands were played (${features.hands})`);
  for(const k of QUICK?[]:['pon','chi','minkan','ankan','kakan','riichi','renchan','abort','draw','tsumo','ron','doubleRiichi','ippatsu','rinshan','aka','ura'])ok(features[k]>0,`the simulation exercised ${k}`);
}
// ---------- 8. save / resume ----------
{
  const flags={};const note=(k)=>{flags[k]=(flags[k]||0)+1;};
  const passRon=st=>(st.h.log.length%3)===0; // the player sometimes lets a ron go: that makes furiten
  const cont=(st,policy)=>{runMahjong(st,mahjongAi,policy,400000,null,passRon);return J(st);};
  const polFor=level=>{const rand=()=>0.5;return (view,claim)=>claim?chooseCall(view,claim,level,rand):chooseAction(view,level,rand);};
  let tested=0;
  for(let g=0;g<260&&tested<150;g++){
    const mode=g%2?'full':'short',level=['novice','adept','master'][g%3],st=newMahjong({mode,level,bet:500,seed:900001+g*31}),pol=polFor(level),seen=new Set();
    for(let i=0;i<6000&&!st.over;i++){
      runMahjong(st,mahjongAi,pol,1,null,passRon);
      const h=st.h,fs=[];
      if(h.melds.some(m=>m.length))fs.push('melds');if(h.kans>0)fs.push('kan');if(h.riichi.some(Boolean))fs.push('riichi');if(h.furitenTemp.some(Boolean)||h.furitenPerm.some(Boolean))fs.push('furiten');
      if(st.honba>0)fs.push('honba');if(st.pot>0)fs.push('pot');if(st.stage==='claim'&&h.claim.wait==='human')fs.push('claimHuman');if(h.mustDiscard)fs.push('mustDiscard');if(h.pendDora>0)fs.push('pendDora');if(st.deal>st.hand)fs.push('renchan');if(h.doraInds.length>1)fs.push('doraInds');if(st.stage==='result')fs.push('result');
      if(h.ippatsu.some(Boolean))fs.push('ippatsu');if(h.wriichi.some(Boolean))fs.push('wriichi');if(h.melds.some(m=>m.some(x=>x.type==='ankan')))fs.push('ankan');if(h.melds.some(m=>m.some(x=>x.type==='kakan')))fs.push('kakan');
      const fresh=fs.filter(f=>!seen.has(f));
      if(fresh.length&&!st.over){
        fresh.forEach(f=>{seen.add(f);note(f);});
        const snap=J(st),a=normalizeMahjong(J(snap)),b=normalizeMahjong(J(snap));ok(a&&b,`snapshot loads (${fresh})`);eq(J(a),snap,'a snapshot round-trips unchanged');
        const orig=J(snap),ra=cont(a,pol),rb=cont(b,pol),ro=cont(normalizeMahjong(orig),pol);eq(ra,rb,'two resumes agree');eq(ra,ro,'resuming equals playing on');tested++;
      }
    }
  }
  report.resume={snapshots:tested,flags};
  for(const f of ['melds','kan','riichi','furiten','honba','pot','claimHuman','mustDiscard','pendDora','renchan','doraInds','ippatsu','ankan','kakan'])ok(flags[f]>0,`resume was tested with ${f}`);
  ok(tested>=100);
}
// ---------- 9. tamper rejection / junk ----------
{
  const st=newMahjong({mode:'full',level:'adept',seed:2026,bet:100});for(let i=0;i<40;i++)mahjongStep(st,mahjongAi);
  const base=J(st);ok(normalizeMahjong(J(base)),'the untouched save loads');
  const bad=(name,fn)=>{const c=J(base);fn(c);eq(normalizeMahjong(c),null,'rejected: '+name);};
  bad('duplicate tile',c=>{c.h.hands[1][0]=c.h.hands[2][0];});bad('tile not in the wall prefix',c=>{c.h.hands[1][0]=135;});bad('bad point sum',c=>{c.points[0]+=100;});bad('dealer mismatch',c=>{c.h.dealer=(c.h.dealer+1)%4;});
  bad('dora indicator not from the wall',c=>{c.h.doraInds[0]=(c.h.doraInds[0]+4)%136;});bad('hand length',c=>{c.h.hands[2].pop();});bad('pos too high',c=>{c.h.pos=130;});bad('bad meld',c=>{c.h.melds[1]=[{type:'chi',tiles:[0,8,12],from:0,called:0}];});
  bad('kanSeats vs kans',c=>{c.h.kans=1;});bad('negative bet',c=>{c.bet=-5;});bad('unknown stage',c=>{c.stage='boom';});bad('unknown level',c=>{c.level='god';});bad('pot not in sticks',c=>{c.pot=500;c.points[0]-=500;});bad('log tile out of range',c=>{c.h.log.push([0,999]);});
  bad('taken index',c=>{c.h.taken=[999];});bad('riichi without index',c=>{c.h.riichi[1]=true;c.h.riichiAt[1]=-1;});bad('no hand',c=>{delete c.h;});bad('claim without data',c=>{c.stage='claim';});
  for(const junk of [null,undefined,0,'x',[],{},{v:3},{v:2}])eq(normalizeMahjong(junk),null);
  const kept=normalizeCasino({bet:100,mahjong:J(base)},0,3);eq(J(kept.mahjong),base,'the casino keeps a good game');eq(normalizeCasino({bet:100,mahjong:{v:3}},0,3).mahjong,null);eq(normalizeCasino({bet:100},0,3).mahjong,null);
  // mid-claim saves
  let claimSnap=null;for(let g=0;g<400&&!claimSnap;g++){const s=newMahjong({mode:'full',level:'adept',seed:500+g,bet:100}),pol=referencePolicy(()=>0.5);for(let i=0;i<4000&&!s.over;i++){runMahjong(s,mahjongAi,pol,1);if(s.stage==='claim'&&s.h.claim.wait==='human'&&s.h.claim.prompt.chi.length){claimSnap=J(s);break;}}}
  ok(claimSnap,'found a chi prompt to snapshot');const ld=normalizeMahjong(J(claimSnap));ok(ld);eq(claimPrompt(ld).chi,claimSnap.h.claim.prompt.chi);
  const x=J(claimSnap);x.h.claim.prompt.chi[0][0]=0;eq(normalizeMahjong(x),null,'a chi pair that is not in the hand is rejected');
}
// ---------- 10. v7.1.0 saves ----------
{
  const old={v:1,mode:'full',level:'adept',bet:200,seed:5,hand:2,points:[30000,20000,25000,25000],pot:0,stage:'act',over:false,paid:false,payout:0,h:{}};
  const a=normalizeMahjong(J(old));ok(a&&a.over&&a.refund&&a.legacy,'an unfinished v7.1.0 game ends at once');eq(a.payout,200,'the stake is refunded in full');eq(a.paid,false,'and is credited once by settle');ok(!a.abandoned===false||a.abandoned,'flagged as not played out');
  ok(a.ranks.slice().sort().join()==='1,2,3,4');eq(sum(a),100000);
  const fin={...old,stage:'over',over:true,ranks:[1,2,3,4],payout:640,paid:false};const f=normalizeMahjong(J(fin));ok(f&&f.over&&!f.refund,'a finished unpaid game keeps its payout');eq(f.payout,640);
  eq(normalizeMahjong({...fin,paid:true}),null,'a finished and paid game is dropped');
  eq(normalizeMahjong({...old,points:[1,2,3]}),null);eq(normalizeMahjong({...old,bet:0}),null);eq(normalizeMahjong({...old,mode:'x'}),null);
  const viaCasino=normalizeCasino({bet:100,mahjong:J(old)},0,3);ok(viaCasino.mahjong?.refund);
  const fixed=normalizeMahjong(J(normalizeMahjong(J(old))));ok(fixed&&fixed.refund&&fixed.payout===200,'a converted save survives another save');
}
// ---------- 11. abandon ----------
for(const mode of ['full','short']){
  const st=newMahjong({mode,level:'adept',bet:1000,seed:5});for(let i=0;i<3;i++)mahjongStep(st,mahjongAi);
  abandonMahjong(st);ok(st.over&&st.abandoned);eq(st.ranks[0],4);eq(st.payout,0);eq(sum(st),100000);eq(abandonMahjong(st),0,'abandoning twice changes nothing');ok(normalizeMahjong(J(st)).abandoned,'an abandoned game survives a save');
  const rich=newMahjong({mode,seed:6,bet:100});rich.points=[97000,1000,1000,1000];abandonMahjong(rich);eq(rich.ranks[0],4);eq(rich.payout,0);
  const mid=scen({turn:2,hands:{0:'55p123m456s11z2z3z7z'},drawn:'5p'});mahjongStep(mid.st,keepDrawn);abandonMahjong(mid.st);ok(mid.st.over,'abandoning during a claim');eq(mid.st.stage,'over');
}
// ---------- 12. payout economy ----------
{
  const P=R.MAHJONG_PAYOUT;
  for(const mode of ['full','short'])for(const level of ['novice','adept','master']){
    const t=P[mode][level];ok(Array.isArray(t)&&t.length===4);ok(t[0]>t[1]&&t[1]>=t[2]&&t[2]>=t[3]&&t[3]===0,`${mode}/${level} pays by rank`);
  }
  for(const mode of ['full','short'])ok(P[mode].novice[0]<P[mode].adept[0]&&P[mode].adept[0]<P[mode].master[0],`${mode}: a stronger table pays more`);
  eq(R.mahjongPayout('full','adept',1,1000),P.full.adept[0]*1000);eq(R.mahjongPayout('full','adept',4,1000),0);
  eq(MAX_CASINO_MAHJONG_BET,casinoMaxBet(5)*5);eq(casinoMahjongMaxBet(5),casinoArenaMaxBet(5));eq(MAX_MAHJONG_PAYOUT,MAX_CASINO_MAHJONG_BET*R.MAHJONG_TOP_MULTIPLE);
  const royal=POKER_PAYOUTS.find(p=>p.key==='royalFlush').mult*casinoMaxBet(5),arena=casinoArenaMaxBet(5)*CASINO_POLICY.arenaOddsRange[1];
  ok(MAX_MAHJONG_PAYOUT<royal&&MAX_MAHJONG_PAYOUT<arena,`mahjong max ${MAX_MAHJONG_PAYOUT} < poker royal ${royal} and arena ${arena}`);
  for(let lv=0;lv<=5;lv++)for(const mode of ['full','short'])for(const level of ['novice','adept','master'])ok(R.mahjongPayout(mode,level,1,casinoMahjongMaxBet(lv))<=MAX_MAHJONG_PAYOUT);
  report.maxPayout=MAX_MAHJONG_PAYOUT;
  // a random player loses, over a modest sample (the full calibration is tools/mahjong-calibrate.mjs)
  const games=500;
  for(const [mode,level] of [['full','novice'],['full','master'],['short','master']]){
    const d=[0,0,0,0];for(let i=0;i<games;i++){const seed=(i*104729+31)>>>0,rand=mulberry32(seed^0x5bd1e995),st=newMahjong({mode,level,bet:10,seed});runMahjong(st,mahjongAi,randomPolicy(rand));d[st.ranks[0]-1]++;}
    const ev=d.reduce((s,n,i)=>s+n*P[mode][level][i],0)/games;ok(ev<1,`random play loses (${mode}/${level} EV ${ev.toFixed(3)})`);(report.randomEv||(report.randomEv={}))[mode+'/'+level]=+ev.toFixed(3);
  }
}
// ---------- 13. the CPUs only see their own view ----------
{
  const src=readFileSync(new URL('../js/mahjong-ai.js',import.meta.url),'utf8');
  ok(!/makeWall|_wall|\.hands\b|\.seed\b|\bst\./.test(src),'the AI source never touches the wall, other hands or the seed');
  const st=newMahjong({mode:'full',level:'master',seed:4242,bet:100});let n=0;while(n++<300){if(st.stage==='act'&&st.h.turn!==0&&st.h.log.length>=8)break;if(!mahjongStep(st,mahjongAi)){if(st.stage==='act'&&st.h.turn===0)humanDiscard(st,st.h.drawn);else if(st.stage==='claim')humanClaim(st,{t:'pass'});else break;}}
  const seat=st.h.turn;if(seat===0)throw new Error('setup');
  const v1=viewFor(st,seat);const keysOf=Object.keys(v1).sort();
  eq(keysOf,['calls','dealer','doraInds','doraTiles','drawn','hand','handNo','handsTotal','honba','kans','kuikae','log','melds','mode','mustDiscard','opts','points','pot','riichi','riichiAt','rivers','roundWind','seat','seatWind','taken','turn','wallLeft'].sort(),'the view has a fixed key set');
  const a1=chooseAction(v1,'master',()=>0.5);
  const other=[0,1,3].filter(s=>s!==seat);const tmp=st.h.hands[other[0]];st.h.hands[other[0]]=st.h.hands[other[1]];st.h.hands[other[1]]=tmp;
  const v2=viewFor(st,seat);eq(v2,v1,'other hands do not leak into the view');eq(chooseAction(v2,'master',()=>0.5),a1);
  // decisions are deterministic in the view
  eq(chooseAction(J(v1),'master',()=>0.5),a1);
}
// ---------- 14. performance ----------
{
  const t0=performance.now(),st=newMahjong({mode:'full',level:'master',seed:8,bet:100});let steps=0,worst=0;
  while(!st.over&&steps<100000){const a=performance.now();if(!mahjongStep(st,mahjongAi)){if(st.stage==='result'){nextHand(st);}else{const h=st.h,pol=referencePolicy(()=>0.5);if(st.stage==='act'&&h.turn===0){if(h.drawn>=0&&tsumoInfo(st,0))humanTsumo(st);else{const x=pol(viewFor(st,0),null);humanDiscard(st,x.tile??h.drawn,false)||humanDiscard(st,h.drawn>=0?h.drawn:h.hands[0][0],false);}}else if(st.stage==='claim'){const p=claimPrompt(st);if(p.ron)humanClaim(st,{t:'ron'});else humanClaim(st,{t:'pass'});}}}worst=Math.max(worst,performance.now()-a);steps++;}
  const total=performance.now()-t0;report.perf={fullGameMs:Math.round(total),worstStepMs:+worst.toFixed(1),steps};
  ok(total<4000,`a whole 東風戦 plays out in ${Math.round(total)} ms`);ok(worst<250,`no single step takes ${worst.toFixed(0)} ms`);
  const s2=newMahjong({mode:'full',level:'adept',seed:909,bet:100});runMahjong(s2,mahjongAi,referencePolicy(()=>0.5),20);const snap=J(s2);const n0=performance.now();for(let i=0;i<200;i++)normalizeMahjong(J(snap));const norm=(performance.now()-n0)/200;report.perf.normalizeMs=+norm.toFixed(2);ok(norm<10,`loading a save takes ${norm.toFixed(2)} ms`);
  let vms=0;for(let i=0;i<500;i++){const a=performance.now();viewFor(s2,1);vms+=performance.now()-a;}ok(vms/500<1,'a view builds in under 1 ms');
}
console.log('PASS mahjong flow v7.1.1',JSON.stringify(report),checks,'checks');
