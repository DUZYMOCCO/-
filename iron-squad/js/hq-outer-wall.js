// Outer bailey (外郭) around the headquarters, as offsets from the HQ centre.
// The land is reserved from the start; the wall itself is built at development Lv3 (交易都市).
// The room south of the HQ is kept for a future town district around the field tavern.
export const OUTER_WALL_LEVEL=3;
export const OUTER_WALL=Object.freeze({left:-800,right:800,top:-800,bottom:1100});
// Each gate sits where a highway crosses the wall (tests check these against world.js roads).
// The wide city gate (half 150) also spans the HQ centre lines, so the 256px route grids of
// caravans and the hero party pass through it.
export const OUTER_GATE_HALF_WIDTH=150;
export const OUTER_GATES=Object.freeze([
  Object.freeze({side:'north',x:-111,y:-800,label:'外郭北門',half:OUTER_GATE_HALF_WIDTH}),
  Object.freeze({side:'east',x:800,y:86,label:'外郭東門',half:OUTER_GATE_HALF_WIDTH}),
  Object.freeze({side:'south',x:113,y:1100,label:'外郭南門',half:OUTER_GATE_HALF_WIDTH}),
  Object.freeze({side:'west',x:-800,y:-86,label:'外郭西門',half:OUTER_GATE_HALF_WIDTH})
]);
export const outerWallBuilt=game=>!game?.currentDungeon&&(game?.nation?.level||0)>=OUTER_WALL_LEVEL;
export const insideOuterWall=(x,y,pad=0)=>x>OUTER_WALL.left-pad&&x<OUTER_WALL.right+pad&&y>OUTER_WALL.top-pad&&y<OUTER_WALL.bottom+pad;
/** Offsets near the wall line or a gate approach; natural scenery is kept off them. */
export function outerWallLineNear(x,y,pad) {
  const w=OUTER_WALL;
  if(!insideOuterWall(x,y,pad))return false;
  if(Math.min(Math.abs(x-w.left),Math.abs(x-w.right))<pad||Math.min(Math.abs(y-w.top),Math.abs(y-w.bottom))<pad)return true;
  return OUTER_GATES.some(g=>Math.abs(x-g.x)<pad+g.half+20&&Math.abs(y-g.y)<pad+g.half+20);
}
