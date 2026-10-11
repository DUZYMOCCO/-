// Connected halls and short treasure spurs. The authored central boss route stays open.
export const DUNGEON_GRID = 40;
const cache = new WeakMap();
const inside = (r,x,y,pad=0) => x>=r.x+pad&&x<r.x+r.w-pad&&y>=r.y+pad&&y<r.y+r.h-pad;
const snap = n => Math.round(n/DUNGEON_GRID)*DUNGEON_GRID;
export function explorationLayout(dungeon) {
  if(!dungeon||!['dungeon','ruin'].includes(dungeon.kind))return null;
  const known=cache.get(dungeon);if(known)return known;
  const width=dungeon.width,height=dungeon.height,mid=height/2,areas=[];
  const add=(id,kind,x,y,w,h)=>{
    x=Math.max(40,snap(x));y=Math.max(40,snap(y));
    const r={id,kind,x,y,w:Math.min(snap(w),width-40-x),h:Math.min(snap(h),height-40-y)};
    if(r.w>0&&r.h>0)areas.push(r);return r;
  };
  add('entry','entry',80,mid-180,320,360);
  add('main','corridor',240,mid-100,width-380,200);
  const northX=snap(width*.31),southX=snap(width*.58);
  add('front-hall','hall',northX-220,mid-220,440,440);
  add('deep-hall','hall',southX-200,mid-180,400,360);
  add('boss-hall','boss',width-680,mid-260,600,520);
  add('north-spur','branch',northX-80,200,160,mid-160);
  add('north-stash','stash',northX-160,80,320,200);
  add('south-spur','branch',southX-80,mid+40,160,height-mid-240);
  add('south-stash','stash',southX-160,height-280,320,200);
  const branches=[{id:'north',x:northX,y:160},{id:'south',x:southX,y:height-160}];
  const cols=Math.ceil(width/DUNGEON_GRID),rows=Math.ceil(height/DUNGEON_GRID),floor=new Uint8Array(cols*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(areas.some(r=>inside(r,x*40+20,y*40+20)))floor[y*cols+x]=1;
  const solids=[],active=new Map();
  // Merge adjacent blocked cells into wall strips, shared by art and the minimap.
  for(let y=0;y<rows;y++){
    const next=new Map();
    for(let x=0;x<cols;){
      if(floor[y*cols+x]){x++;continue;}
      const start=x;while(x<cols&&!floor[y*cols+x])x++;
      const key=`${start}:${x}`,prior=active.get(key);
      const r=prior||{x:start*40,y:y*40,w:Math.min(width,x*40)-start*40,h:0};
      r.h=Math.min(height,(y+1)*40)-r.y;next.set(key,r);if(!prior)solids.push(r);
    }
    active.clear();for(const [k,r]of next)active.set(k,r);
  }
  const links=areas.map(()=>[]);
  for(let i=0;i<areas.length;i++)for(let j=i+1;j<areas.length;j++){
    const a=areas[i],b=areas[j],x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),x2=Math.min(a.x+a.w,b.x+b.w),y2=Math.min(a.y+a.h,b.y+b.h);
    if(x2-x>=20&&y2-y>=20){const portal={x:(x+x2)/2,y:(y+y2)/2};links[i].push({index:j,portal});links[j].push({index:i,portal});}
  }
  const layout={width,height,theme:dungeon.kind==='ruin'?'ruin':dungeon.theme||'catacombs',areas,solids,branches,links,floor,cols,rows,boss:{x:width-350,y:mid},exit:{x:180,y:mid}};
  cache.set(dungeon,layout);return layout;
}
export function explorationBlocks(dungeon,x,y) {
  const l=explorationLayout(dungeon);if(!l)return false;
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=l.width||y>=l.height)return true;
  return !l.floor[Math.floor(y/40)*l.cols+Math.floor(x/40)];
}
export function nearestDungeonFloor(dungeon,point,pad=20) {
  const l=explorationLayout(dungeon);if(!l||!explorationBlocks(dungeon,point.x,point.y))return {x:point.x,y:point.y};
  let best=null,distance=Infinity;
  for(const r of l.areas){
    const x=Math.max(r.x+pad,Math.min(r.x+r.w-pad,point.x)),y=Math.max(r.y+pad,Math.min(r.y+r.h-pad,point.y)),d=(point.x-x)**2+(point.y-y)**2;
    if(d<distance){distance=d;best={x,y};}
  }
  return best;
}
export function dungeonSegmentOpen(dungeon,a,b) {
  const l=explorationLayout(dungeon);if(!l)return true;
  if(l.areas.some(r=>inside(r,a.x,a.y)&&inside(r,b.x,b.y)))return true;
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/20));
  for(let i=0;i<=n;i++)if(explorationBlocks(dungeon,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;
  return true;
}
export function dungeonSpawnPoint(dungeon,index=0,elite=false,random=Math.random) {
  const l=explorationLayout(dungeon);if(!l)return null;
  const pool=l.areas.filter(r=>elite?r.kind==='hall'||r.kind==='boss':r.kind==='hall'||r.kind==='stash');
  const r=pool[index%pool.length],margin=55;
  return {x:r.x+margin+random()*(r.w-margin*2),y:r.y+margin+random()*(r.h-margin*2)};
}
/** A few room portals suffice; no per-frame map-wide path search. */
export function dungeonSteeringTarget(dungeon,unit,target) {
  const l=explorationLayout(dungeon);if(!l)return target;
  const goal=nearestDungeonFloor(dungeon,target);
  if(dungeonSegmentOpen(dungeon,unit,goal))return goal;
  const starts=l.areas.map((r,i)=>inside(r,unit.x,unit.y)?i:-1).filter(i=>i>=0),ends=new Set(l.areas.map((r,i)=>inside(r,goal.x,goal.y)?i:-1));
  const queue=starts.map(index=>({index,first:null})),seen=new Set(starts);
  for(let head=0;head<queue.length;head++){
    const node=queue[head];if(ends.has(node.index))return node.first||goal;
    for(const edge of l.links[node.index])if(!seen.has(edge.index)){seen.add(edge.index);queue.push({index:edge.index,first:node.first||edge.portal});}
  }
  return nearestDungeonFloor(dungeon,unit);
}
