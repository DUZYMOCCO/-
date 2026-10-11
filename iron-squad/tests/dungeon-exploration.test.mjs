import assert from 'node:assert/strict';
import {DUNGEON_DEFS,dungeonBlocks,dungeonSolids} from '../js/dungeon.js';
import {explorationLayout,dungeonSegmentOpen,dungeonSteeringTarget,dungeonSpawnPoint,nearestDungeonFloor} from '../js/dungeon-layout.js';
import {dungeonSideChests,normalizeDungeonExploration,updateDungeonSideChests} from '../js/dungeon-exploration.js';
import {attackBlocked} from '../js/gate-rules.js';
const combat=DUNGEON_DEFS.filter(d=>['dungeon','ruin'].includes(d.kind));
function walk(d,a,b) {
  const u={...a};let steps=0;
  while(Math.hypot(u.x-b.x,u.y-b.y)>3&&steps++<1000){
    const goal=dungeonSteeringTarget(d,u,b),dx=goal.x-u.x,dy=goal.y-u.y,dist=Math.hypot(dx,dy),step=Math.min(8,dist);
    assert.ok(dist>0,'route must progress');
    const next={x:u.x+dx/dist*step,y:u.y+dy/dist*step};
    assert.ok(dungeonSegmentOpen(d,u,next),'walking may not cross a wall');Object.assign(u,next);
  }
  assert.ok(steps<1000,`reachable endpoint in ${d.id}`);return u;
}
for(const d of combat){
  const l=explorationLayout(d),entry={x:240,y:d.height/2},boss={x:d.width-350,y:d.height/2},vault={x:d.width-240,y:d.height/2};
  assert.ok(dungeonSegmentOpen(d,entry,boss));assert.ok(dungeonSegmentOpen(d,boss,vault));
  assert.ok(!dungeonBlocks(d,180,d.height/2));assert.ok(dungeonSolids(d).length>0);
  for(const endpoint of l.branches){const arrived=walk(d,entry,endpoint);walk(d,arrived,boss);walk(d,boss,entry);}
  for(let i=0;i<60;i++)for(const elite of [false,true]){
    const p=dungeonSpawnPoint(d,i,elite,()=>i/60);assert.ok(!dungeonBlocks(d,p.x,p.y),'all enemy spawns are on the floor');
  }
  const rescued=nearestDungeonFloor(d,{x:d.width/2,y:12});assert.ok(!dungeonBlocks(d,rescued.x,rescued.y));
  // Chest corners are set back from the walls, so no opposite-side proximity opens them.
  for(const c of l.branches)for(const [dx,dy] of [[48,0],[-48,0],[0,48],[0,-48]])assert.ok(!dungeonBlocks(d,c.x+dx,c.y+dy));
}
assert.equal(explorationLayout(DUNGEON_DEFS.find(d=>d.kind==='town')),null);
const d=combat[0],l=explorationLayout(d),p={x:l.branches[0].x,y:l.branches[0].y+100,hp:100},rewards=[];
const game={currentDungeon:d,player:p,dungeonExploration:{},collectDrop:item=>rewards.push(item),saveGame(){this.saved=JSON.parse(JSON.stringify(this.dungeonExploration));}};
let rolled=0;const create=()=>({id:`chest-${++rolled}`,type:'HELMET',tier:1});
updateDungeonSideChests(game,create);assert.equal(rolled,0,'unopened boxes do not move or trigger from afar');
p.y=l.branches[0].y;p.isDown=true;updateDungeonSideChests(game,create);assert.equal(rolled,0);
p.isDown=false;updateDungeonSideChests(game,create);assert.equal(rolled,1);assert.equal(rewards.length,1);
updateDungeonSideChests(game,create);assert.equal(rolled,1,'opening is idempotent');
game.dungeonExploration=normalizeDungeonExploration(game.saved);updateDungeonSideChests(game,create);assert.equal(rolled,1,'reload/reentry never rerolls a looted chest');
assert.equal(dungeonSideChests(game)[0].opened,true);assert.equal(dungeonSideChests(game)[1].opened,false);
Object.assign(p,l.branches[1]);updateDungeonSideChests(game,create);assert.equal(rolled,2);
assert.deepEqual(normalizeDungeonExploration(null),Object.create(null));
const ruin=combat.find(d=>d.kind==='ruin'),blocked={x:360,y:40},floor={x:360,y:ruin.height/2};
assert.equal(attackBlocked({currentDungeon:ruin},blocked,floor),true,'ruin attacks use the same walls as walking');
console.log(`PASS: ${combat.length} connected dungeon/ruin layouts, boss routes, treasure-spur round trips, floor spawns, chest persistence, down-state and wall consistency`);
