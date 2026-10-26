import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSim as baseCreateSim, stepSim, runSim, hashSim, fieldCount, deployUnit, TICK } from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { STORY_1 } from '../js/story/story-mission.js?v=3';
import { STORY_3_1, STORY_3_2, STORY3_SCRIPT_FILES, markStageClear, loadChapterMarks } from '../js/story/story-3.js?v=2';
import { chapterFlag, newChapterStory, stageOf, nextStage } from '../js/story/chapters.js?v=2';
import { breakSuit, isSuitSafe, repairRate, canDon, issueDoff } from '../js/sim/powersuit.js?v=1';
import { canBoard, RIDE_MODE } from '../js/sim/ride.js?v=3';
import { checkScript, startDialog, skipToEnd } from '../js/dialog/dialog-script.js?v=3';
import { story3Hud, story3ResultText } from '../js/story/story3-ops.js?v=2';
const createSim = options => baseCreateSim({ ...options, newEnemies: !!options?.mission?.story3 });
const get = (s,k) => s.units.find(u=>u.side==='ally' && u.kind===k);
const json = p => JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));

// 実際の命令だけで進める。座標・HP・敵・乱数を編集しない。
export function playChapter(stage, seed=1) {
  const s=createSim({seed, mission:stage==='3-1'?STORY_3_1:STORY_3_2});
  const boy=get(s,'boy'), pc=get(s,'ponco');
  for(let t=0;t<300/TICK && !s.result;t++) {
    if(t%15===0) {
      const M=s.story3.mint, mint=M && s.units.find(u=>u.id===M.id);
      const enemies=s.units.filter(u=>u.side==='enemy');
      const near=enemies.filter(e=>Math.hypot(e.x-pc.x,e.y-pc.y)<32*10).sort((a,b)=>Math.hypot(a.x-pc.x,a.y-pc.y)-Math.hypot(b.x-pc.x,b.y-pc.y));
      const target=typeof mint?.captured==='number'?s.units.find(u=>u.id===mint.captured):near[0];
      const ids=[pc,boy].filter(u=>s.units.includes(u)).map(u=>u.id);
      if(target && pc.order?.attackId!==target.id) s.commands.push({type:'attack',unitIds:ids,targetId:target.id});
      else if(!target && !pc.order) {
        let dest;
        if(stage==='3-1') dest=enemies.length?{tx:26,ty:41}:{tx:26,ty:38};
        else if(M.phase==='guard') dest=enemies.some(e=>e.label===M.guard)?{tx:24,ty:30}:{tx:24,ty:27};
        else dest=M.phase==='escort'?{tx:26,ty:37}:{tx:24,ty:27};
        s.commands.push({type:'move',unitIds:ids,waypoints:[dest],mode:'fight'});
      }
    }
    stepSim(s);
  }
  return s;
}

test('3章: フラグなし seed1〜5 のハッシュ・1章の編成と仕掛けはそのまま',()=>{
  const hashes=['6cc93eb6','2a60b985','24994a28','5558d677','6e46d4aa'];
  for(let seed=1;seed<=5;seed++) { const s=createSim({seed,mission:MISSION_1}); runSim(s,300); assert.equal(hashSim(s),hashes[seed-1]); assert.equal(s.story3,undefined); assert.equal(s.powersuit,undefined); }
  const one=createSim({mission:STORY_1}); assert.equal(one.story3,undefined); assert.equal(one.powersuit,undefined); assert.equal(get(one,'boy').ride.phase,'on');
});
test('3章: 共通の章表から URL とミッションと次の段を引く',()=>{
  assert.equal(chapterFlag(''),null); assert.equal(chapterFlag('?storych=2'),2); assert.equal(chapterFlag('?storych=3'),3);
  const s=newChapterStory(3); assert.equal(s.stage,'3-1'); assert.equal(stageOf(3,s.stage).mission,STORY_3_1);
  assert.equal(stageOf(2,'2-1').mission.id,'story2_1'); assert.equal(nextStage(3,'3-1'),'3-2'); assert.equal(nextStage(3,'3-2'),null);
  const src=readFileSync(new URL('../js/index.js',import.meta.url),'utf8');
  assert.match(src,/this.storyCh === 3/); assert.match(src,/showChapterChoices/);
});
test('3章: 全9台本が検証を通り最後まで読める・着た少年の素顔を出さない',()=>{
  const P=json('../assets/portraits/portraits.json').chars;
  const files=[...new Set(Object.values(STORY3_SCRIPT_FILES).flatMap(Object.values))]; assert.equal(files.length,9);
  for(const f of files) { const sc=json('../assets/story/'+f); assert.deepEqual(checkScript(sc,P),[],f); assert.ok(skipToEnd(startDialog(sc,P)).done); if(!/broken|lose/.test(f)) for(const l of sc.lines) assert.ok(![l.who,l.enter].includes('BOY'),f); }
});
for(const mission of [STORY_3_1,STORY_3_2]) {
  test(`${mission.id}: powersuitフラグなしでAを1着着用・人間枠・小銃固定・乗車禁止・修理と脱衣`,()=>{
    const s=createSim({mission}), b=get(s,'boy'), pc=get(s,'ponco');
    assert.ok(b.suitOn); assert.equal(b.hp,70); assert.equal(b.weapon,'W1-02'); assert.equal(s.powersuit.suit.type,'A');
    assert.equal(fieldCount(s).humans,1); assert.equal(fieldCount(s).robots,2);
    const girl=deployUnit(s,'girl',{tx:21,ty:56}); assert.ok(girl); assert.equal(canDon(s,girl).ok,false);
    assert.equal(canBoard(s,b,pc,RIDE_MODE.BACK).reason,'suited');
    b.x=600;b.y=1400; assert.equal(repairRate(s,b).per,0);
    breakSuit(s,b); assert.ok(!b.suitOn); assert.equal(b.hp,30); assert.equal(b.atk,0); assert.equal(isSuitSafe(s,b),true);
    s.time=b.suitGrace; assert.equal(isSuitSafe(s,b),false); assert.equal(s.powersuit.suit.broken,true);
    b.x=(mission.extraction.tx+.5)*32;b.y=(mission.extraction.ty+.5)*32;assert.equal(repairRate(s,b).by,'base');
    b.x=600;b.y=1400;pc.x=b.x+20;pc.y=b.y;pc.cls='repairer';assert.equal(repairRate(s,b).by,'repairer');
  });
  test(`${mission.id}: ネジ破壊・少年捕獲は負け、スーツ破損だけなら続けられる`,()=>{
    for(const reason of ['nejiDown','boyCaptured']) { const s=createSim({mission}); if(reason==='nejiDown') get(s,'scav').hp=0;else { const b=get(s,'boy');b.captured='nest';b.x=144;b.y=720;b.heldAt={tx:4,ty:22}; } stepSim(s); assert.equal(s.result,'lose');assert.equal(s.resultReason,reason); }
    const s=createSim({mission});breakSuit(s,get(s,'boy'));stepSim(s); assert.equal(s.result,null);
  });
}
test('3-1: 敵が近いと調査が止まる・離れると進み勝つ',()=>{
  const s=createSim({mission:STORY_3_1}), g=s.story3.gate, n=get(s,'scav');
  n.x=(g.tx+.5)*32;n.y=(g.ty+.5)*32;n.anchor={x:n.x,y:n.y};
  const e=s.units.find(u=>u.side==='enemy');e.x=n.x+80;e.y=n.y;
  stepSim(s);assert.equal(g.blocked,true);assert.equal(g.amount,g.max);assert.match(story3Hud(s).text,/敵が近い/);
  s.units=s.units.filter(u=>u.side==='ally');s.groups=[];runSim(s,600);assert.equal(s.result,'win');assert.equal(s.resultReason,'gate');
});
test('3-1と3-2: seed1〜5で命令だけで勝つ・ミントは仲間となりPONCO02に乗って門に着く・同条件は同じ',()=>{
  for(const stage of ['3-1','3-2']) for(const seed of [1,2,3,4,5]) {
    const s=playChapter(stage,seed);assert.equal(s.result,'win',`${stage} seed${seed}`);
    if(stage==='3-2') { assert.equal(s.story3.mint.phase,'done');assert.ok(get(s,'girl').ride);assert.equal(fieldCount(s).humans,2);assert.match(story3ResultText(s).why,/なかま/); }
  }
  for(const stage of ['3-1','3-2']) assert.equal(hashSim(playChapter(stage,3)),hashSim(playChapter(stage,3)));
});
test('3-2: ミントを巣に運ばれてもPONCO02がいれば続行・救助手段がなければ負け',()=>{
  const s=createSim({mission:STORY_3_2});const m=deployUnit(s,'girl',{tx:4,ty:22});s.story3.mint.id=m.id;s.story3.mint.phase='found';m.captured='nest';m.heldAt={tx:4,ty:22};
  stepSim(s);assert.equal(s.result,null);
  s.units=s.units.filter(u=>u.kind!=='ponco');stepSim(s);assert.equal(s.resultReason,'mintLost');
});
test('3-2: 本物の捕獲判定でミントが運ばれ、運び手を倒すと取り返せる',()=>{
  const s=createSim({mission:STORY_3_2}), b=get(s,'boy'),pc=get(s,'ponco');
  const carrier=s.units.find(u=>u.label==='ハサミアリ');
  s.units=s.units.filter(u=>u.label!=='センシャヤドカリ');
  b.x=784;b.y=850;b.anchor={x:b.x,y:b.y};
  stepSim(s);const mint=get(s,'girl');assert.ok(mint);
  carrier.x=mint.x+4;carrier.y=mint.y;carrier.order=null;carrier.groupId=null;carrier.cd=999;
  s.groups=[]; stepSim(s);
  assert.equal(mint.captured,carrier.id);assert.equal(carrier.carrying,mint.id);assert.ok(s.story3.mint.everCaptured);
  const before={x:carrier.x,y:carrier.y};runSim(s,30);assert.ok(Math.hypot(carrier.x-before.x,carrier.y-before.y)>0,'巣へ運んで動く');
  carrier.hp=0;stepSim(s);assert.equal(mint.captured,null);
  assert.equal(s.story3.mint.phase,'escort');
});
test('3章: 別キーの記録・保存不可でも遊びを止めない',()=>{
  const data=new Map();const store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  assert.equal(markStageClear('3-2',store),true);assert.equal(loadChapterMarks(store)['3-2'],true);assert.equal(data.size,1);
  assert.equal(markStageClear('3-2',{getItem(){throw Error();},setItem(){throw Error();}}),false);
});
test('3章の実戦: 敵はスーツを撃ち、破損直後1.5秒は捕まらず、その後は捕まる',()=>{
  for(const mission of [STORY_3_1,STORY_3_2]) {
    const s=createSim({mission}),b=get(s,'boy'),e=s.units.find(u=>u.side==='enemy');
    s.units=s.units.filter(u=>u.side==='ally'||u===e);s.groups=[];
    b.x=656;b.y=1424;b.anchor={x:b.x,y:b.y};
    e.x=b.x+20;e.y=b.y;e.anchor={x:e.x,y:e.y};e.groupId=null;e.order=null;e.stance='hold';
    runSim(s,150);assert.equal(b.captured,null);assert.ok(b.hp<70,'殻に被弾');assert.equal(s.powersuit.suit.bodyHp,30);
    breakSuit(s,b);e.x=b.x+4;e.y=b.y;e.order=null;e.cd=999;
    runSim(s,44);assert.equal(b.captured,null);assert.equal(s.result,null);
    runSim(s,3);assert.equal(b.captured,e.id);assert.equal(s.resultReason,'boyCaptured');
  }
});
