import {WORLD_SIZE} from './world.js?v=289';
import {HQ_FACILITY_LAYOUT} from './hq-facility-layout.js?v=201';
import {fieldWalls,fieldWallContext,gatePositions,wallBlocksAttack,outerWallBuilt} from './gate-rules.js?v=319';
const C=WORLD_SIZE/2,PAD=12;
const boxes=HQ_FACILITY_LAYOUT.map(p=>({left:C+p.x-p.w/2-PAD,right:C+p.x+p.w/2+PAD,top:C+p.y-52-PAD,bottom:C+p.y+2+PAD}));
const contains=(b,p)=>p.x>b.left&&p.x<b.right&&p.y>b.top&&p.y<b.bottom;
function intersects(b,a,z) {
  let lo=0,hi=1;
  for(const [v,d,min,max]of [[a.x,z.x-a.x,b.left,b.right],[a.y,z.y-a.y,b.top,b.bottom]]){
    if(!d){if(v<=min||v>=max)return false;continue;}
    const t1=(min-v)/d,t2=(max-v)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
    if(lo>=hi)return false;
  }
  return hi>0&&lo<1;
}
const open=(a,b)=>!boxes.some(r=>intersects(r,a,b));
function outside(p) {
  for(const b of boxes)if(contains(b,p)){
    const choices=[{x:b.left-12,y:p.y},{x:b.right+12,y:p.y},{x:p.x,y:b.top-12},{x:p.x,y:b.bottom+12}];
    return choices.sort((a,z)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(z.x-p.x,z.y-p.y))[0];
  }
  return p;
}
const corners=boxes.flatMap(b=>[{x:b.left-12,y:b.top-12},{x:b.right+12,y:b.top-12},{x:b.left-12,y:b.bottom+12},{x:b.right+12,y:b.bottom+12}]);
const networks=new Map();
function network(game) {
  const context=fieldWallContext(game),key=outerWallBuilt(context)?1:0;
  if(networks.has(key))return networks.get(key);
  const gates=fieldWalls(context).flatMap(w=>gatePositions(w).flatMap(g=>
    ['east','west'].includes(g.side)?[{x:g.x-30,y:g.y},{x:g.x+30,y:g.y}]:[{x:g.x,y:g.y-30},{x:g.x,y:g.y+30}]));
  const nodes=[...corners,...gates],visible=(a,b)=>open(a,b)&&!wallBlocksAttack(context,a,b);
  const links=nodes.map((a,i)=>nodes.map((b,j)=>i!==j&&visible(a,b)?Math.hypot(a.x-b.x,a.y-b.y):Infinity));
  const result={nodes,links,visible};networks.set(key,result);return result;
}
/** A tiny visibility graph around three buildings, independent of combat cover. */
export function headquartersMoveTarget(unit,target,game={}) {
  if(!unit||!target)return target;
  const start=outside(unit),goal=outside(target);
  if(start!==unit)return start;
  if(open(unit,goal)&&!unit._hqDetouring)return goal;
  const net=network(game);
  if(net.visible(unit,goal)){delete unit._hqDetouring;return goal;}
  unit._hqDetouring=true;
  const nodes=[unit,goal,...net.nodes],dist=nodes.map(()=>Infinity),prev=[],done=new Set();dist[0]=0;
  const visible=(i,k)=>i>1&&k>1?net.links[i-2][k-2]<Infinity:net.visible(nodes[i],nodes[k]);
  for(let n=0;n<nodes.length;n++){
    let i=-1;for(let k=0;k<nodes.length;k++)if(!done.has(k)&&(i<0||dist[k]<dist[i]))i=k;
    if(i<0||!Number.isFinite(dist[i]))break;if(i===1)break;done.add(i);
    for(let k=1;k<nodes.length;k++)if(!done.has(k)&&visible(i,k)){
      const d=dist[i]+Math.hypot(nodes[k].x-nodes[i].x,nodes[k].y-nodes[i].y);
      if(d<dist[k]){dist[k]=d;prev[k]=i;}
    }
  }
  if(!Number.isFinite(dist[1]))return unit;
  const path=[];for(let i=1;i!==0&&i!==undefined;i=prev[i])path.unshift(nodes[i]);
  if(path.length>1&&Math.hypot(path[0].x-unit.x,path[0].y-unit.y)<9&&net.visible(unit,path[1]))return path[1];
  return path[0];
}
