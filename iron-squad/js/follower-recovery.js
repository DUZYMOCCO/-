import {WORLD_SIZE} from './world.js?v=289';
import {economicFieldBlocked} from './regional-economy.js?v=277';
import {hqFacilityBlocks} from './hq-facility-layout.js?v=201';
import {dungeonSegmentOpen,explorationBlocks as dungeonBlocks} from './dungeon-layout.js?v=182';
const headquartersBuildingBlocks=(x,y)=>hqFacilityBlocks(x-WORLD_SIZE/2,y-WORLD_SIZE/2);

export const FOLLOW_RECOVERY = Object.freeze({seconds:8, away:160, progress:12, targetRadius:80, retry:.5});
// Neither the timer nor frame intent belongs in a save or a soldier spread.
const sessions=new WeakMap();
const live=u=>u&&!u.dead&&!u.isDown&&!u.dying&&u.hp>0;
const spaceOf=game=>game.currentDungeon?.id||game.currentDungeon||'field';
// Imported bindings remain live. No replacement occurs unless ?perf=1 installs the hook.
export function profileFollowerRecovery(wrap){
  const begin=beginFollowerRecovery,finish=finishFollowerRecovery;
  const timedBegin=wrap('追従.開始',begin),timedFinish=wrap('追従.復帰',finish);
  beginFollowerRecovery=timedBegin;finishFollowerRecovery=timedFinish;
  return ()=>{if(beginFollowerRecovery===timedBegin)beginFollowerRecovery=begin;if(finishFollowerRecovery===timedFinish)finishFollowerRecovery=finish;};
}
const eligible=(game,u,session)=>live(game.player)&&live(u)&&u.isPersonalGuard===true&&!u.heroPartyId&&!u.carrierId
  &&u.speed>0&&!u.magicRecovering&&!u.campPose&&!u.farmPose
  &&!session.carriers.has(String(u.id))&&!game._medicRescueAssign?.get(u.id)
  &&Math.hypot(u.x-game.player.x,u.y-game.player.y)>FOLLOW_RECOVERY.away;

/** Run only on an active simulation frame, before any ally AI. */
export function beginFollowerRecovery(game) {
  const space=spaceOf(game);let session=sessions.get(game);
  if(!session||session.space!==space||session.player!==game.player) {
    session={space,player:game.player,timers:new WeakMap()};sessions.set(game,session);
  }
  session.frame=new Map();
  session.carriers=new Set([game.player,...(game.squad||[]),...(game.civilians||[]),...(game.gateGuards||[])]
    .filter(u=>u&&!u.dead&&u.carrierId!=null).map(u=>String(u.carrierId)));
  for(const u of game.squad||[])if(u?.isPersonalGuard&&!u.heroPartyId)session.frame.set(u,{intent:false,suspended:false});
}

/** Raw goal, before pathfinding: an enemy/loot/rescue goal is not a follow order. */
export function noteFollowerIntent(game,u,goal) {
  const session=sessions.get(game),frame=session?.frame.get(u);
  if(!frame||frame.suspended||!goal||!eligible(game,u,session))return;
  if(Math.hypot(goal.x-game.player.x,goal.y-game.player.y)<=FOLLOW_RECOVERY.targetRadius
    &&Math.hypot(goal.x-u.x,goal.y-u.y)>8)frame.intent=true;
}

export function suspendFollowerRecovery(game,u) {
  const frame=sessions.get(game)?.frame.get(u);if(frame)frame.suspended=true;
}

/** The whole footprint must fit; stay on the commander's side of walls. */
export function followerLanding(game,u) {
  if(typeof game.followerWallBlocked!=='function')return null;
  const p=game.player,dungeon=game.currentDungeon,margin=Math.max(12,u.radius||10)+4;
  const blocked=(x,y)=>dungeon?x<margin||y<margin||x>dungeon.width-margin||y>dungeon.height-margin||dungeonBlocks(dungeon,x,y)
    :x<margin||y<margin||x>WORLD_SIZE-margin||y>WORLD_SIZE-margin||economicFieldBlocked(game,x,y)||headquartersBuildingBlocks(x,y);
  const slot=u._guardSlot||0;
  for(const radius of [40,60,80,100])for(let i=0;i<12;i++) {
    const angle=slot*1.25+i*Math.PI/6,candidate={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
    if(blocked(candidate.x,candidate.y)||game.followerWallBlocked(p,candidate)||(dungeon&&!dungeonSegmentOpen(dungeon,p,candidate)))continue;
    let open=true;
    for(let j=0;j<8;j++)if(blocked(candidate.x+Math.cos(j*Math.PI/4)*margin,candidate.y+Math.sin(j*Math.PI/4)*margin)){open=false;break;}
    if(open&&(game.squad||[]).every(other=>other===u||!live(other)||Math.hypot(other.x-candidate.x,other.y-candidate.y)>=22))return candidate;
  }
  return null;
}

/** Measure the settled position, never the move which a collider rejected. */
export function finishFollowerRecovery(game,dt) {
  const session=sessions.get(game);if(!session||!(dt>0)||!game.inBattle||game._merchantShopClose)return [];
  const recovered=[];
  for(const [u,frame] of session.frame) {
    if(frame.suspended||!frame.intent||!eligible(game,u,session)){session.timers.delete(u);continue;}
    let timer=session.timers.get(u);
    if(!timer){timer={x:u.x,y:u.y,elapsed:0};session.timers.set(u,timer);}
    if(Math.hypot(u.x-timer.x,u.y-timer.y)>=FOLLOW_RECOVERY.progress){timer.x=u.x;timer.y=u.y;timer.elapsed=0;continue;}
    timer.elapsed+=Math.min(dt,.1);
    if(timer.elapsed+1e-9<FOLLOW_RECOVERY.seconds)continue;
    const landing=followerLanding(game,u);
    if(!landing){timer.elapsed=FOLLOW_RECOVERY.seconds-FOLLOW_RECOVERY.retry;continue;}
    Object.assign(u,landing,{vx:0,vy:0,regrouping:false,_openX:landing.x,_openY:landing.y,
      _wallX:landing.x,_wallY:landing.y,_wallSpace:game.currentDungeon?.id||'field',_terrainSpace:game.currentDungeon?.id||'field'});
    delete u._hqDetouring;delete u._cachedEnemy;delete u._magicEnemy;
    session.timers.delete(u);recovered.push(u);
  }
  return recovered;
}
