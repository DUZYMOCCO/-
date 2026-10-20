// v7.1.6 Classed-up units (passesWalls: the commander from Warlord on, advanced soldiers) keep their wall-passing ability,
// but now hop over what they cross instead of walking through it: take off at the edge, a short arc, land on the far side.
// The hop state (_vault, _jumpLift, _vaultCd, _vaultPX/PY) uses underscore keys, so persistentUnit never saves it.
import {wallBlocksAttack} from './gate-rules.js?v=352';

export const WALL_VAULT=Object.freeze({
  minTime:.3,maxTime:.45,     // seconds in the air for ordinary obstacles (walls, buildings, rocks, up to `wide` px)
  speed:900,                  // px/s that maps distance to air time before clamping
  wide:360,longMaxTime:.65,longSpeed:2400, // thick dungeon rock: a faster, slightly longer hop instead of walking inside it
  scan:1000,step:6,margin:6,  // how far ahead a landing spot is searched, and the clearance around it
  cooldown:.25,               // after landing; a unit waits at the next edge instead of hopping every frame
  height:10,heightPerPx:.05,maxHeight:20,reducedHeight:4,
  maxStep:200                 // a bigger jump in one frame is a teleport/space change, not walking
});
export const reducedMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const clear=unit=>{if(!unit)return;delete unit._vault;unit._jumpLift=0;};
export function clearWallVault(unit){clear(unit);if(unit){delete unit._vaultPX;delete unit._vaultPY;}}

/** First open landing spot beyond the obstacle met on the way from -> to, or null when it is too thick to hop. */
export function vaultLanding(game,unit,from,to,blocked){
  const dx=to.x-from.x,dy=to.y-from.y,d=Math.hypot(dx,dy);if(!(d>.01))return null;
  const ux=dx/d,uy=dy/d,clearance=(unit.radius||10)+WALL_VAULT.margin;
  let passed=false;
  for(let s=WALL_VAULT.step;s<=WALL_VAULT.scan;s+=WALL_VAULT.step){
    const x=from.x+ux*s,y=from.y+uy*s;
    if(blocked(x,y)){passed=true;continue;}
    const p={x,y};
    if(!passed&&!wallBlocksAttack(game,from,p))continue; // still before the obstacle
    const back={x:x-ux*clearance,y:y-uy*clearance},ahead={x:x+ux*clearance,y:y+uy*clearance};
    if(blocked(ahead.x,ahead.y)||blocked(back.x,back.y)){passed=true;continue;} // too close to the next block: clear both in one hop
    if(wallBlocksAttack(game,back,p)||wallBlocksAttack(game,p,ahead))continue;    // straddling a wall line
    return p;
  }
  return null;
}
function dust(game,x,y){
  if(typeof game.pushParticle!=='function'||!Array.isArray(game.particles))return;
  const n=reducedMotion()?2:4;
  for(let i=0;i<n;i++){const a=Math.PI*(i/(n-1||1))+Math.PI*.5+(i%2?.2:-.2),v=30+i*7;game.pushParticle({x:x+Math.cos(a)*4,y:y+3,vx:Math.cos(a)*v,vy:-Math.abs(Math.sin(a))*v*.35,color:'#b9a98a',size:2.2+(i%2)*.8,life:.3});}
}
/** Runs inside settleTerrain for a wall-passing walker. Returns true when the position was handled (in the air or waiting at an edge). */
export function stepWallVault(game,unit,blocked,dt,space){
  if(!unit||unit.flying||unit.isDown||unit.dead||unit.carrierId||typeof blocked!=='function'){clear(unit);return false;}
  if(!(dt>0))return !!unit._vault;
  const v=unit._vault;
  if(v){
    if(v.space!==space||![v.fx,v.fy,v.tx,v.ty,v.dur].every(Number.isFinite)){clear(unit);unit._vaultPX=unit.x;unit._vaultPY=unit.y;return false;}
    v.t=Math.min(v.dur,(v.t||0)+dt);const k=v.t/v.dur;
    unit.x=v.fx+(v.tx-v.fx)*k;unit.y=v.fy+(v.ty-v.fy)*k;
    unit._jumpLift=4*v.h*k*(1-k);
    if(k>=1){clear(unit);unit._vaultCd=WALL_VAULT.cooldown;unit._openX=unit.x;unit._openY=unit.y;dust(game,unit.x,unit.y);}
    unit._vaultPX=unit.x;unit._vaultPY=unit.y;return true;
  }
  unit._jumpLift=0;
  unit._vaultCd=Math.max(0,(unit._vaultCd||0)-dt);
  const px=unit._vaultPX,py=unit._vaultPY,remember=()=>{unit._vaultPX=unit.x;unit._vaultPY=unit.y;unit._vaultSpace=space;};
  if(unit._vaultSpace!==space||!Number.isFinite(px)||!Number.isFinite(py)){remember();return false;}
  const dx=unit.x-px,dy=unit.y-py,d2=dx*dx+dy*dy;
  if(d2<.01||d2>WALL_VAULT.maxStep*WALL_VAULT.maxStep){remember();return false;}
  const from={x:px,y:py},to={x:unit.x,y:unit.y};
  const entering=(blocked(to.x,to.y)&&!blocked(px,py))||wallBlocksAttack(game,from,to);
  if(!entering){remember();return false;}
  if(unit._vaultCd>0){unit.x=px;unit.y=py;return true;} // wait on the near side; never stand inside
  const land=vaultLanding(game,unit,from,to,blocked);
  if(!land){remember();return false;} // thicker than the hop range: the previous pass-through behaviour
  // The AI goal (e.g. a formation spot) lies inside this obstacle: wait at the edge instead of hopping past it and back.
  const goal=unit._moveGoal;
  if(goal&&(unit._moveGoalTick??-9)>=(game._terrainTick||0)-1&&Number.isFinite(goal.x)&&Number.isFinite(goal.y)&&blocked(goal.x,goal.y)
    &&Math.hypot(goal.x-px,goal.y-py)<Math.hypot(land.x-px,land.y-py)){unit.x=px;unit.y=py;return true;}
  const dist=Math.hypot(land.x-px,land.y-py);
  const dur=dist<=WALL_VAULT.wide?Math.max(WALL_VAULT.minTime,Math.min(WALL_VAULT.maxTime,WALL_VAULT.minTime+dist/WALL_VAULT.speed))
    :Math.min(WALL_VAULT.longMaxTime,WALL_VAULT.maxTime+(dist-WALL_VAULT.wide)/WALL_VAULT.longSpeed);
  const h=reducedMotion()?WALL_VAULT.reducedHeight:Math.min(WALL_VAULT.maxHeight,WALL_VAULT.height+dist*WALL_VAULT.heightPerPx);
  unit._vault={fx:px,fy:py,tx:land.x,ty:land.y,t:0,dur,h,space};
  unit.x=px;unit.y=py;unit._jumpLift=0;
  return true;
}
/** Where a unit should be saved: its landing spot while in the air, so a load never starts inside an obstacle. */
export function restingPosition(unit){const v=unit?._vault;return v&&Number.isFinite(v.tx)&&Number.isFinite(v.ty)?{x:v.tx,y:v.ty}:{x:unit?.x,y:unit?.y};}
