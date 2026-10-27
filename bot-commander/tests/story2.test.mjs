import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createSim,stepSim,runSim,issueOrder,hashSim,KINDS,applyCommandsNow,TICK} from '../js/sim/sim.js?v=30';
import {MISSION_1} from '../js/sim/mission.js?v=10';
import {STORY_2_1,STORY_2_2} from '../js/story/story2-missions.js?v=2';
import {toggleStory2Ride} from '../js/story/story2-ops.js?v=1';
import {STORY_2,story2Requested,newStory2State,nextStory2,story2Rewards,saveStory2Reward} from '../js/story/story-2.js?v=2';
import {checkScript,startDialog,skipToEnd} from '../js/dialog/dialog-script.js?v=3';
const file = f => new URL(f,import.meta.url);
const make = (step=1) => createSim({seed:1,mission:step===1?STORY_2_1:STORY_2_2});
const boy = s => s.units.find(u=>u.kind==='boy');
const n = s => s.units.find(u=>u.id===s.story2.nejiId);
function quiet(s){s.units=s.units.filter(u=>u.side==='ally');s.groups=[];}
function atTower(s){quiet(s);const b=boy(s);b.ride=null;b.order=null;b.x=24*32+16;b.y=23*32+16;return b;}
export function play21(seed=1) {
 const s=createSim({seed,mission:STORY_2_1});const n=s.units.find(u=>u.kind==='scav');
 let k=0,back=false;
 for(let i=0;i<30*600&&!s.result;i++){
  if(!n.order){
   if(back){back=false;k++;}
   const p=s.mission.salvage[k];
   if(p && p.amount>0 && n.cargo<20) issueOrder(s,[n.id],[{tx:p.tx,ty:p.ty}],{mode:'rush'});
  }
  const p=s.mission.salvage[k];
  if(!back && (n.cargo>=19.99 || p?.amount<=0 && n.cargo>0)) {issueOrder(s,[n.id],[s.mission.extraction],{mode:'rush'});back=true;}
  stepSim(s);
 }
 return s;
}
export function play22(seed=1){
 const s=createSim({seed,mission:STORY_2_2});const n=s.units.find(u=>u.kind==='scav'), p=s.units.find(u=>u.kind==='ponco'), b=s.units.find(u=>u.kind==='boy');
 let phase='fight',dis=false;
 for(let i=0;i<30*600&&!s.result;i++){
  if(i%30===0){
   const es=s.units.filter(u=>u.side==='enemy');
   if(es.length){
    const e=es.sort((a,c)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(c.x-p.x,c.y-p.y))[0];
    issueOrder(s,[p.id],[{tx:Math.floor(e.x/32),ty:Math.floor(e.y/32)}],{mode:'fight',targetId:e.id});
   } else if(phase==='fight'){phase='travel';issueOrder(s,[n.id],[{tx:24,ty:24}],{mode:'rush'});}
   if(phase==='travel'&&!n.order&&!dis){toggleStory2Ride(s);dis=true;phase='survey';}
   if(phase==='survey'&&!b.ride&&!b.order)issueOrder(s,[b.id],[{tx:24,ty:23}],{mode:'rush'});
  }
  stepSim(s);
 }
 return s;
}

test('2章: フラグなしのseed1〜5は不変、ロウは共通表にいない',()=>{
 const hashes=['6cc93eb6','2a60b985','24994a28','5558d677','6e46d4aa'];
 for(let seed=1;seed<=5;seed++){const s=createSim({seed,mission:MISSION_1});runSim(s,300);assert.equal(hashSim(s),hashes[seed-1]);assert.equal(s.story2,undefined);assert.equal(s.ne,undefined);}
 assert.equal(KINDS.wolf,undefined);
});
test('2章: URL入口はstorych=2だけ、通常の☰には出さない',()=>{
 for(const q of ['', '?story=1','?storych=1','?storych=3','?storych=20'])assert.equal(story2Requested(q),false);
 assert.equal(story2Requested('?storych=2'),true);
 const src=readFileSync(file('../js/index.js'),'utf8');assert.match(src,/chaptersRequested\(location.search\).*showChapterChoices/);
 const st=newStory2State();assert.equal(STORY_2.mission(st).id,'story2_1');assert.equal(nextStory2(st),true);assert.equal(STORY_2.mission(st).id,'story2_2');assert.equal(nextStory2(st),false);
});
test('2章: 既存の顔と背景による台本8本が最後まで流れる',()=>{
 const P=JSON.parse(readFileSync(file('../assets/portraits/portraits.json'),'utf8')).chars;
 const fs=readdirSync(file('../assets/story/')).filter(f=>f.startsWith('story2_'));assert.equal(fs.length,8);
 for(const f of fs){const sc=JSON.parse(readFileSync(file('../assets/story/'+f),'utf8'));assert.deepEqual(checkScript(sc,P),[],f);assert.equal(skipToEnd(startDialog(sc,P)).done,true);}
 for(const step of [1,2])for(const k of ['intro','win','lose','suit'])assert.ok(readFileSync(new URL(STORY_2.scriptUrl(k,{step}))));
});
test('2章: 初期の少年はネジの背中、PONCOは2-2から、新敵は専用配置',()=>{
 const a=make(), b=make(2);assert.equal(boy(a).ride.host,n(a).id);assert.equal(a.units.filter(u=>u.kind==='ponco').length,0);assert.equal(b.units.filter(u=>u.kind==='ponco').length,1);
 assert.deepEqual(a.units.filter(u=>u.side==='enemy').map(u=>u.kind),['G01']);assert.deepEqual(b.units.filter(u=>u.side==='enemy').map(u=>u.kind),['G01','G01','G08','G08']);assert.ok(!b.strike);assert.ok(b.ne);
});
test('2-1: 命令だけで資材を運び勝つ seed1〜5・コアの合図・3山',()=>{
 for(const seed of [1,2,3,4,5]){const s=play21(seed);assert.equal(s.result,'win');assert.equal(s.resultReason,'materials');assert.ok(s.mission.delivered>=60);assert.ok(s.time<240);assert.ok(s.story2.cues.includes('core'));}
});
test('2-1: 59では未勝利、60で勝ち（運搬中は数えない）',()=>{
 const s=make();quiet(s);n(s).x=14*32;n(s).y=52*32;s.mission.delivered=59;n(s).cargo=20;stepSim(s);assert.equal(s.result,null);s.mission.delivered=60;stepSim(s);assert.equal(s.result,'win');
});
test('2章: ネジ破壊・少年消失・両ロボ破壊で負け、PONCOだけの破壊は続行',()=>{
 for(const step of [1,2]){let s=make(step);n(s).hp=0;runSim(s,2);assert.equal(s.resultReason,'nejiDown');s=make(step);s.units=s.units.filter(u=>u.kind!=='boy');stepSim(s);assert.equal(s.resultReason,'boyDown');}
 let s=make(2);s.units.find(u=>u.kind==='ponco').hp=0;runSim(s,2);assert.equal(s.result,null);n(s).hp=0;runSim(s,2);assert.equal(s.resultReason,'robotsDown');
});
test('2-2: 捕獲から奪還可能、巣に届いたら負け、捕獲中は調べ済みでも勝てない',()=>{
 const s=make(2);quiet(s);boy(s).ride=null;boy(s).captured=999;stepSim(s);assert.equal(s.result,null);s.story2.survey.done=true;stepSim(s);assert.equal(s.result,null);boy(s).captured='nest';boy(s).x=4*32+16;boy(s).y=22*32+16;stepSim(s);assert.equal(s.resultReason,'boyCaptured');
});
test('2-2: 降りて静止した少年だけが約15秒調べる、乗ったまま・命令中・敵5マス以内は停止',()=>{
 let s=make(2);quiet(s);n(s).x=24*32+16;n(s).y=23*32+16;runSim(s,120);assert.equal(s.story2.survey.amount,3);
 s=make(2);atTower(s);issueOrder(s,[boy(s).id],[{tx:30,ty:23}],{mode:'rush'});runSim(s,2);assert.equal(s.story2.survey.amount,3);
 s=make(2);const b=atTower(s);const e=make(2).units.find(u=>u.side==='enemy');e.x=b.x+100;e.y=b.y;e.order=null;e.atk=0;s.units.push(e);runSim(s,30);assert.equal(s.story2.survey.amount,3);assert.equal(s.story2.survey.blocked,true);
 s=make(2);atTower(s);runSim(s,449);assert.equal(s.result,null);runSim(s,2);assert.equal(s.result,'win');
});
test('2-2: ロウは3秒で登場、戦わず走り去り、仲間には残らず、KINDSは不変',()=>{
 const s=make(2);atTower(s);runSim(s,95);const w=s.units.find(u=>u.kind==='wolf');assert.ok(w);assert.equal(w.human,true);assert.equal(w.aiAlly,true);assert.equal(w.atk,0);assert.equal(w.noCatch,true);assert.ok(w.order);assert.ok(s.story2.cues.includes('wolf'));runSim(s,355);assert.equal(s.result,'win');assert.equal(s.units.some(u=>u.kind==='wolf'),false);assert.equal(KINDS.wolf,undefined);
});
test('2-2: 命令だけで戦闘→移動→降りる→調べる→勝つ seed1〜5',()=>{for(const seed of [1,2,3,4,5]){const s=play22(seed);assert.equal(s.result,'win');assert.ok(s.time<180);assert.ok(s.story2.survey.done);}});
test('2章: 同じseed・同じ命令で同じ結果',()=>{assert.equal(hashSim(play21(3)),hashSim(play21(3)));assert.equal(hashSim(play22(3)),hashSim(play22(3)));});
test('2章: ☰の乗り降りが実際の命令として効く',()=>{const s=make(2);assert.equal(toggleStory2Ride(s).ok,true);applyCommandsNow(s);runSim(s,60);assert.ok(!boy(s).ride);assert.equal(toggleStory2Ride(s).ok,true);runSim(s,60);assert.equal(boy(s).ride.phase,'on');});
test('2章: 報酬はPONCO1体・部品3つ、専用キー以外に保存しない・保存不可でも継続',()=>{
 assert.deepEqual(story2Rewards(1),{ponco02:1,ponco02Blueprint:true});assert.equal(story2Rewards(2).suitParts,3);assert.equal(story2Rewards(2).wolfCompanion,false);
 const writes=[];saveStory2Reward(2,{setItem:(...v)=>writes.push(v)});assert.equal(writes.length,1);assert.equal(writes[0][0],'bot-commander.story2.proto');assert.doesNotThrow(()=>saveStory2Reward(2,{setItem:()=>{throw Error('private');}}));
});

test('2-2: ロウのおとりは少年が近くてもG08の巡回AIを引きつけ、ロウは捕まらない',()=>{
 const s=make(2), ants=s.units.filter(u=>u.kind==='G08'), gs=s.groups.filter(g=>g.unitIds.includes(ants[0].id));
 atTower(s);runSim(s,95);const w=s.units.find(u=>u.kind==='wolf');assert.ok(w);
 s.units.push(...ants);s.groups=gs;
 for(const a of ants){a.x=boy(s).x+60;a.y=boy(s).y;a.order=null;}
 runSim(s,30);assert.equal(s.groups[0].targetId,w.id);assert.equal(w.captured,null);assert.equal(boy(s).captured,null);
});
test('2-2: G08が降りた少年を実際に捕まえ、運ぶ敵を倒すと助かる',()=>{
 const s=make(2),b=boy(s),e=s.units.find(u=>u.kind==='G08');b.ride=null;b.x=e.x;b.y=e.y;b.order=null;
 stepSim(s);assert.equal(b.captured,e.id);assert.equal(s.result,null);e.hp=0;runSim(s,2);assert.equal(b.captured,null);assert.equal(s.result,null);assert.equal(b.atk,0);
});
