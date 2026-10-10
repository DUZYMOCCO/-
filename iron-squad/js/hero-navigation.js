// Incremental A*: search physical land, independently of the commander's fog.
import {WORLD_SIZE} from './world.js?v=175';
import {economicFieldBlocked} from './regional-economy.js?v=151';
import {wallBlocksAttack} from './gate-rules.js?v=151';
const STEP=256, key=(x,y)=>`${x},${y}`, field={currentDungeon:null};
export function heroSegmentOpen(game,a,b) {
  if(wallBlocksAttack(field,a,b))return false;
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/32));
  for(let i=0;i<=n;i++)if(economicFieldBlocked(game,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;
  return true;
}
function push(heap,node){heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;}
function pop(heap){const out=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return out;}
export function advanceHeroRoute(game,party,budget=80) {
  if(party.route?.length)return true;
  const goal=party.destination, h=(x,y)=>Math.hypot(x-goal.x,y-goal.y);
  if(!party._search){
    const gx=Math.round(party.x/STEP)*STEP,gy=Math.round(party.y/STEP)*STEP,candidates=[];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)candidates.push({x:gx+dx*STEP,y:gy+dy*STEP});
    candidates.sort((a,b)=>Math.hypot(a.x-party.x,a.y-party.y)-Math.hypot(b.x-party.x,b.y-party.y));
    const start=candidates.find(p=>heroSegmentOpen(game,party,p));if(!start)return false;
    const {x,y}=start;
    const node={x,y,g:0,f:h(x,y),parent:null};
    party._search={heap:[node],best:new Map([[key(x,y),node]]),count:0};
  }
  const search=party._search;
  while(search.heap.length&&budget-->0&&search.count++<30000){
    const a=pop(search.heap);if(search.best.get(key(a.x,a.y))!==a)continue;
    if(h(a.x,a.y)<STEP*1.5&&heroSegmentOpen(game,a,goal)){
      const route=[{x:goal.x,y:goal.y}];for(let n=a;n;n=n.parent)route.push({x:n.x,y:n.y});
      route.reverse();party.route=route;party.routeIndex=0;delete party._search;return true;
    }
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=a.x+dx*STEP,y=a.y+dy*STEP,k=key(x,y),g=a.g+Math.hypot(dx,dy)*STEP;
      if(x<32||y<32||x>WORLD_SIZE-32||y>WORLD_SIZE-32||(search.best.get(k)?.g??Infinity)<=g)continue;
      if(!heroSegmentOpen(game,a,{x,y}))continue;
      const node={x,y,g,f:g+h(x,y),parent:a};search.best.set(k,node);push(search.heap,node);
    }
  }
  return false;
}
