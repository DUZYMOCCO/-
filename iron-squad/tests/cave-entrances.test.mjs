import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {WORLD_SIZE,fieldTerrainAt,biomeAt}=await import('../js/world.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {WILDERNESS_ANCHORS}=await import('../js/wilderness-layout.js');
const {wildernessLayout}=await import('../js/wilderness-sites.js');
const C=WORLD_SIZE/2;
// The four cave/dungeon entrances (goblin mines, catacombs, dragon cavern, demon castle) must always exist on open, reachable ground.
const caves=['dungeon_goblin_mines','dungeon_catacombs','dungeon_dragon_cavern','dungeon_demon_castle'].map(id=>{const d=DUNGEON_DEFS.find(d=>d.id===id);assert.ok(d,id+' is defined');assert.equal(d.kind,'dungeon');assert.ok(d.entrance&&d.boss,id+' has an entrance and a boss');return d;});
assert.deepEqual(caves.map(d=>[Math.round(d.entrance.x-C),Math.round(d.entrance.y-C)]),[[-2600,-2400],[4600,4400],[7200,-7000],[42000,42000]],'cave entrances keep their fixed positions');
for(const d of DUNGEON_DEFS.filter(d=>d.entrance)){
  assert.equal(fieldTerrainAt(d.entrance.x,d.entrance.y),d.id==='wolf_hamlet'?'water':'open',d.id+' entrance stands on open ground');
}
for(const d of caves)for(const r of [60,120,240,480])for(let k=0;k<16;k++)assert.equal(fieldTerrainAt(d.entrance.x+Math.cos(k*Math.PI/8)*r,d.entrance.y+Math.sin(k*Math.PI/8)*r),'open',d.id+' approach is free of ridges at '+r);
// Wilderness sites: every anchor yields a site, none is lost to the ridge terrain.
const game={medicalPosts:[],outposts:[],dungeons:DUNGEON_DEFS.filter(d=>d.entrance).map(d=>({entrance:d.entrance}))};
const sites=wildernessLayout(game);
assert.equal(WILDERNESS_ANCHORS.length,48);assert.equal(sites.length,WILDERNESS_ANCHORS.length,'every wilderness anchor is placed (100%)');
for(const region of ['east','south','north','west'])assert.equal(sites.filter(s=>s.region===region).length,12,region+' keeps all 12 sites');
for(const s of sites){assert.equal(fieldTerrainAt(s.x,s.y),'open');assert.equal(biomeAt(s.x,s.y).id,s.region);}
// Reachability from the headquarters on a 160px grid (a rock cell blocks; diagonals cannot cut corners).
const cell=160,N=Math.floor(WORLD_SIZE/cell),known=new Uint8Array(N*N),blocked=new Uint8Array(N*N),seen=new Uint8Array(N*N);
const blk=(i,j)=>{const k=j*N+i;if(!known[k]){known[k]=1;blocked[k]=fieldTerrainAt(i*cell+cell/2,j*cell+cell/2)==='rock'?1:0;}return blocked[k];};
const start=Math.floor(C/cell)+Math.floor(C/cell)*N,queue=[start];seen[start]=1;
for(let h=0;h<queue.length;h++){const k=queue[h],i=k%N,j=(k-i)/N;for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(seen[kk]||blk(a,b))continue;if(di&&dj&&(blk(i+di,j)||blk(i,j+dj)))continue;seen[kk]=1;queue.push(kk);}}
const reach=(x,y)=>{const i=Math.floor(x/cell),j=Math.floor(y/cell);for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(i+a>=0&&j+b>=0&&i+a<N&&j+b<N&&seen[(j+b)*N+i+a])return true;return false;};
for(const d of DUNGEON_DEFS.filter(d=>d.entrance))assert.ok(reach(d.entrance.x,d.entrance.y),d.id+' entrance is reachable on foot from the headquarters');
for(const s of sites)assert.ok(reach(s.x,s.y),s.id+' is reachable on foot from the headquarters');
assert.ok(queue.length/(N*N)>.9,'over 90% of the world is one connected walkable area');
console.log('PASS: 4 cave entrances present/open/reachable, 48/48 wilderness sites placed on open ground and reachable, ridge terrain leaves >90% of the world connected');