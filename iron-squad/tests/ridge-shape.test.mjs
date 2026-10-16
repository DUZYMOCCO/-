import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fieldBlocks,settleUnit,fieldRockExit,biomeTerrainAllowed,WORLD_SIZE} from '../js/world.js';
import {terrainCell,ridgeInside,ridgeOutline,ridgeExit,ridgeFlowAngle,paintBiomeTerrain} from '../js/biome-terrain.js?v=289';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const C=WORLD_SIZE/2,TAU=Math.PI*2,DEG=Math.PI/180;
const FAMILIES=['egg','capsule','drop','wedge','poly'],SHARE={egg:.20,capsule:.25,drop:.15,wedge:.20,poly:.20};
// every ridge peak of the north biome in a wide window (a cell has 4 peaks); `peaks` is the dense 28x26 cell block used for the heavy checks
const all=[];for(let iy=8;iy<62;iy++)for(let ix=10;ix<146;ix++)for(const f of terrainCell(ix,iy,biomeTerrainAllowed))if(f.kind==='ridge')all.push({ix,iy,f});
const peaks=all.filter(p=>p.ix>=66&&p.ix<94&&p.iy>=36);
assert.ok(all.length>4000&&peaks.length>150,'enough north ridge peaks to test');
const byFamily=Object.fromEntries(FAMILIES.map(n=>[n,all.filter(p=>p.f.shape===n)]));
for(const n of FAMILIES)assert.ok(byFamily[n].length>200,`family ${n} exists`);
const sample=(n,k)=>{const l=byFamily[n],step=Math.max(1,Math.floor(l.length/k));return l.filter((_,i)=>i%step===0).slice(0,k);};

// 1) ONE shared outline for every family: collision flips exactly at the drawn boundary (0.5px in = rock, 0.5px out = open)
let probes=0;
for(const n of FAMILIES)for(const {f} of sample(n,30)){
 const o=ridgeOutline(f,2);assert.ok(o.length>60);
 for(let i=0;i<o.length;i+=2){
  const q=o[i],pin={x:q.x-q.nx*.5,y:q.y-q.ny*.5},pout={x:q.x+q.nx*.5,y:q.y+q.ny*.5};
  assert.equal(ridgeInside(f,pin.x,pin.y),true,`${n}: inside the outline`);assert.equal(fieldBlocks(pin.x,pin.y),true);
  assert.equal(ridgeInside(f,pout.x,pout.y),false,`${n}: outside the outline`);assert.equal(fieldBlocks(pout.x,pout.y),false);probes+=2;
 }
}
assert.ok(probes>=20000);

// 2) share of every family within +-5 points of the plan, parameter ranges, centres unchanged, shapes really differ
for(const n of FAMILIES){const share=byFamily[n].length/all.length;assert.ok(Math.abs(share-SHARE[n])<=.05,`${n} share ${(share*100).toFixed(1)}%`);}
const seen=new Set();
for(const {ix,iy,f} of all){
 const cx=ix*1024+512,cy=iy*1024+512;assert.equal(Math.abs(f.x-cx),218);assert.equal(Math.abs(f.y-cy),152);
 if(f.shape==='egg'){assert.ok(f.p>=2&&f.p<=2.4+1e-9&&Math.abs(f.tau)<=.1+1e-9);assert.ok(f.a<=115+1e-9&&f.b<=98+1e-9);}
 if(f.shape==='capsule'){assert.equal(f.r1,f.r2);assert.ok(f.r1>=36&&f.r1<=50);}
 if(f.shape==='drop'){assert.ok(f.r1>=20&&f.r1<=30&&f.r2>=40&&f.r2<=52&&f.len>Math.abs(f.r2-f.r1));}
 if(f.shape==='wedge'){assert.equal(f.n,3);assert.ok(f.rr>=22&&f.rr<=34);}
 if(f.shape==='poly'){assert.ok(f.n===4||f.n===5);assert.ok(f.rr>=20&&f.rr<=32);}
 if(f.geo!=='egg')assert.ok(Math.min(f.r1??f.rr,f.r2??f.rr)>=18,'rounding radius >= 18px by construction');
 if(seen.size<4000)seen.add([f.shape,Math.round(f.hx),Math.round(f.hy),Math.round(f.rot*50)].join());
}
assert.ok(seen.size>2500,'peaks do not repeat one shape');

// 3) convex with no sharp corner: never turns the wrong way, chord midpoints stay inside, and the smallest radius of curvature is >= 16px
let minRadius=Infinity;
for(const n of FAMILIES)for(const {f} of sample(n,40)){
 const o=ridgeOutline(f,3),m=o.length;
 for(let i=0;i<m;i++){
  const a=o[i],b=o[(i+1)%m],c=o[(i+2)%m],cr=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);assert.ok(cr>=-1e-6,`${n}: never concave`);
 }
 for(let k=0;k<50;k++){const i=(k*37)%m,j=(i+Math.floor(m/6)+((k*53)%Math.floor(m*2/3)))%m;assert.equal(ridgeInside(f,(o[i].x+o[j].x)/2*.999+f.x*.001,(o[i].y+o[j].y)/2*.999+f.y*.001),true,`${n}: chord midpoints stay inside`);}
 const o1=ridgeOutline(f,1),m1=o1.length,k1=4;
 for(let i=0;i<m1;i++){
  const a=o1[(i-k1+m1)%m1],b=o1[i],c=o1[(i+k1)%m1],ab=Math.hypot(b.x-a.x,b.y-a.y),bc=Math.hypot(c.x-b.x,c.y-b.y),ca=Math.hypot(a.x-c.x,a.y-c.y);
  const area2=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));if(area2<1e-6)continue;
  minRadius=Math.min(minRadius,ab*bc*ca/(2*area2));
 }
}
assert.ok(minRadius>=16,`smallest radius of curvature ${minRadius.toFixed(1)}px`);

// 4) passages: every outline point of any two peaks (also across cells, all 9 neighbouring cells) is >= 90px apart
let minGap=Infinity;const outlines=peaks.map(p=>({f:p.f,o:ridgeOutline(p.f,5)}));
for(let i=0;i<outlines.length;i++)for(let j=i+1;j<outlines.length;j++){
 const A=outlines[i],B=outlines[j];if(Math.hypot(A.f.x-B.f.x,A.f.y-B.f.y)>1000)continue;
 for(const p of A.o)for(const q of B.o){const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<minGap)minGap=d;}
}
assert.ok(minGap>=90,`minimum gap ${minGap.toFixed(1)}px`);
// ...and by construction: half extents hx<=150, hy<=98 about centres 436px / 304px apart -> >=136px sideways, >=108px up/down
for(const {f} of all){assert.ok(f.hx<=150&&f.hy<=98,'bounding half extents');assert.ok(436-2*f.hx>=136&&304-2*f.hy>=108);}
{const by=new Map(all.map(p=>[`${p.ix},${p.iy}`,[]]));for(const p of all)by.get(`${p.ix},${p.iy}`).push(p.f);
 for(const fs of by.values()){const [a,b,c,d]=fs;assert.ok(Math.abs(a.x-c.x)===436&&Math.abs(a.y-b.y)===304&&d);}}

// 5) extent: every outline point stays within 450px of its cell centre, the measured half extents are exact, inside its own cell
for(const {ix,iy,f} of peaks){
 const cx=ix*1024+512,cy=iy*1024+512;let hx=0,hy=0;
 for(const p of ridgeOutline(f,3)){assert.ok(Math.hypot(p.x-cx,p.y-cy)<=450,'within 450px of the cell centre');hx=Math.max(hx,Math.abs(p.x-f.x));hy=Math.max(hy,Math.abs(p.y-f.y));assert.ok(Math.abs(p.x-cx)<500&&Math.abs(p.y-cy)<500);}
 assert.ok(hx<=150.01&&hy<=98.01&&hx<=f.hx+.6&&hy<=f.hy+.6,`bounding box ${hx.toFixed(1)}x${hy.toFixed(1)}`);
}

// 6) HQ surroundings untouched: no ridge anywhere within 3km, and none is generated for a cell centre within 3900px
for(const {f} of peaks)for(const p of ridgeOutline(f,12))assert.ok(Math.hypot(p.x-C,p.y-C)>3000);
for(let iy=Math.floor((C-4600)/1024);iy<=Math.floor((C+4600)/1024);iy++)for(let ix=Math.floor((C-4600)/1024);ix<=Math.floor((C+4600)/1024);ix++){
 const x=ix*1024+512,y=iy*1024+512;if(Math.hypot(x-C,y-C)<=3900)assert.equal(terrainCell(ix,iy,biomeTerrainAllowed).some(f=>f.kind==='ridge'),false,'no ridge near HQ');
}
for(let i=0;i<2000;i++){const a=i*2.399963,r=Math.sqrt(i/2000)*3100;assert.notEqual(fieldBlocks(C+Math.cos(a)*r,C+Math.sin(a)*r),true,'no rock within 3km of HQ');}

// 7) no closed pocket: flood every open sample of a block of cells from its edges
for(const {ix,iy} of peaks.filter((c,i)=>i%24===0).slice(0,14)){
 const n=64,open=new Set(),seen2=new Set(),queue=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!fieldBlocks(ix*1024+x*16+8,iy*1024+y*16+8)){const k=y*n+x;open.add(k);if(x===0||y===0||x===n-1||y===n-1){seen2.add(k);queue.push(k);}}
 for(let i=0;i<queue.length;i++){const k=queue[i],x=k%n,y=Math.floor(k/n);for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(nx<0||ny<0||nx>=n||ny>=n)continue;const m=ny*n+nx;if(open.has(m)&&!seen2.has(m)){seen2.add(m);queue.push(m);}}}
 assert.equal(seen2.size,open.size,`no closed pocket in ${ix},${iy}`);
}

// 8) ridge flow: long peaks (capsule / drop) follow the smooth cell flow angle (+-30deg, jitter +-9deg), so neighbouring long peaks
//    (same cell and the 8 neighbouring cells) never differ by more than 25deg
const axis=f=>Math.atan2(f.wy,f.wx),angDiff=(a,b)=>{let d=Math.abs(a-b)%Math.PI;return Math.min(d,Math.PI-d)/DEG;};
{
 for(const {ix,iy,f} of all){const fl=ridgeFlowAngle(ix,iy);assert.ok(Math.abs(fl)<=30*DEG+1e-9);if(f.geo==='cone')assert.ok(angDiff(axis(f),fl)<=9+1e-6,`long peak follows the flow (${angDiff(axis(f),fl).toFixed(1)}deg)`);}
 const cells=new Map();for(const p of all)if(p.f.geo==='cone'){const k=`${p.ix},${p.iy}`;(cells.get(k)||cells.set(k,[]).get(k)).push(p);}
 let worst=0,pairs=0;
 for(const [k,list] of cells){const [ix,iy]=k.split(',').map(Number);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const other=cells.get(`${ix+dx},${iy+dy}`);if(!other)continue;
   for(const a of list)for(const b of other){if(a===b)continue;const d=angDiff(axis(a.f),axis(b.f));worst=Math.max(worst,d);pairs++;}}
 }
 assert.ok(pairs>1000&&worst<=25,`neighbouring long peaks differ by at most ${worst.toFixed(1)}deg over ${pairs} pairs`);
 for(let i=0;i<400;i++){const ix=10+i%130,iy=8+(i*7)%54;assert.ok(Math.abs(ridgeFlowAngle(ix,iy)-ridgeFlowAngle(ix+1,iy))/DEG<6&&Math.abs(ridgeFlowAngle(ix,iy)-ridgeFlowAngle(ix,iy+1))/DEG<6,'flow is smooth');}
}

// 9) painted pixels follow the collision outline for every family (transparent canvas: rock is opaque, the ground shadow is faint);
//    tiles join without a seam; painting is deterministic
const paint=(x0,y0)=>{const cv=createCanvas(512,512),c=cv.getContext('2d');paintBiomeTerrain(c,x0,y0,biomeTerrainAllowed);return {cv,c};};
let painted=0;
for(const n of FAMILIES)for(const {f} of sample(n,4)){
 const x0=Math.round(f.x-256),y0=Math.round(f.y-256),{c}=paint(x0,y0),px=(x,y)=>c.getImageData(Math.round(x-x0),Math.round(y-y0),1,1).data[3],o=ridgeOutline(f,10);
 for(const q of o){
  assert.ok(px(q.x-q.nx*3,q.y-q.ny*3)>=250,`${n}: rock painted just inside the hit boundary`);
  assert.ok(px(q.x+q.nx*3.5,q.y+q.ny*3.5)<200,`${n}: no solid paint just outside the hit boundary`);painted++;
 }
}
assert.ok(painted>400);
{
 const pick=byFamily.capsule[5].f,x0=Math.round(pick.x-256),y0=Math.round(pick.y-256),A=paint(x0,y0),B=paint(x0+256,y0),da=A.c.getImageData(256,0,256,512).data,db=B.c.getImageData(0,0,256,512).data;
 let differ=0,visible=0;for(let i=0;i<da.length;i+=4){let m=0;for(let k=0;k<4;k++)m=Math.max(m,Math.abs(da[i+k]-db[i+k]));if(m>0)differ++;if(m>8)visible++;}
 // identical geometry; only float rounding of the AA edge may differ by a level or two on a handful of pixels
 assert.ok(differ<da.length/4*.01&&visible<da.length/4*.001,`tiles join without a seam (${differ} rounding-level, ${visible} visible of ${da.length/4})`);
 assert.deepEqual(paint(x0,y0).cv.toBuffer('image/png'),A.cv.toBuffer('image/png'),'painting is deterministic');
}
// determinism of the geometry itself: a second copy of the module (fresh cache) builds identical peaks
{
 const other=await import('../js/biome-terrain.js?det=7012'),sig=f=>[f.shape,f.x,f.y,f.hx,f.hy,f.rot,f.R,f.prim.length].join(),A=all.slice(0,300).map(p=>sig(p.f));
 assert.deepEqual(all.slice(0,300).map(p=>sig(other.terrainCell(p.ix,p.iy,biomeTerrainAllowed).filter(f=>f.kind==='ridge')[all.slice(0,300).indexOf(p)%4])),A,'same peaks every time');
}

// 10) ridgeExit: nearest outline point, pushed out along the normal; the push never exceeds the way out (+ margin)
let exits=0,worstPush=0;
for(const n of FAMILIES)for(const {f} of sample(n,12)){
 const o=ridgeOutline(f,.5),dense=o;
 for(let k=0;k<40;k++){
  const q=ridgeOutline(f,3)[(k*17)%ridgeOutline(f,3).length],depth=[4,12,25,40][k%4],p={x:q.x-q.nx*depth,y:q.y-q.ny*depth};if(!ridgeInside(f,p.x,p.y))continue;
  let nearest=1e9;for(const s of dense)nearest=Math.min(nearest,Math.hypot(s.x-p.x,s.y-p.y));
  const e=ridgeExit(p.x,p.y,biomeTerrainAllowed);assert.ok(e,'exit exists');
  assert.equal(ridgeInside(f,e.x,e.y),false,`${n}: exit is outside`);assert.equal(fieldBlocks(e.x,e.y),false);
  const push=Math.hypot(e.x-p.x,e.y-p.y);assert.ok(push<=nearest+2.2,`${n}: push ${push.toFixed(1)} vs nearest ${nearest.toFixed(1)}`);assert.ok(nearest<=100,'within the inscribed radius');
  worstPush=Math.max(worstPush,push);exits++;
 }
}
assert.ok(exits>400);
assert.equal(ridgeExit(all[3].f.x+all[3].f.hx*2+60,all[3].f.y,biomeTerrainAllowed),null,'nothing to push out of in the open');

// 11) pressed against a peak, a unit slides round it (also round the rounded corners) instead of sticking; old saves are rescued
const blocked=(x,y)=>fieldBlocks(x,y);
for(const n of FAMILIES)for(const {f} of sample(n,6)){
 const o=ridgeOutline(f,3),q=o[Math.floor(o.length*.3)],nx=q.nx,ny=q.ny,tx=-ny,ty=nx;
 const u={x:q.x+nx*2,y:q.y+ny*2};assert.equal(settleUnit(u,blocked,fieldRockExit),false);
 let moved=0;
 for(let i=0;i<40;i++){const px=u.x,py=u.y;u.x+=tx*6-nx*3;u.y+=ty*6-ny*3;settleUnit(u,blocked,fieldRockExit);assert.equal(blocked(u.x,u.y),false,`${n}: never left inside rock`);moved+=Math.hypot(u.x-px,u.y-py);}
 assert.ok(moved>170,`${n}: slides along the wall (${moved.toFixed(0)}px of ~268px pushed)`);
 // straight at the wall: stops on the outline, never inside
 const w={x:q.x+nx*2,y:q.y+ny*2};settleUnit(w,blocked,fieldRockExit);for(let i=0;i<20;i++){w.x-=nx*5;w.y-=ny*5;settleUnit(w,blocked,fieldRockExit);assert.equal(blocked(w.x,w.y),false);}
 assert.ok(Math.hypot(w.x-q.x,w.y-q.y)<12,`${n}: stops at the outline`);
}
// a saved position inside a peak: with the slide helper, without it (legacy call) and with a far remembered open spot
let rescued=0;
for(const n of FAMILIES)for(const {f:g} of sample(n,30)){
 const o=ridgeOutline(g,6);
 for(const [i,depth] of [[1,6],[Math.floor(o.length*.4),14],[Math.floor(o.length*.7),30],[Math.floor(o.length*.9),44]]){
  const q=o[i%o.length],old={x:q.x-q.nx*depth,y:q.y-q.ny*depth};if(!blocked(old.x,old.y))continue;
  const a={...old};assert.equal(settleUnit(a,blocked,fieldRockExit),true);assert.equal(blocked(a.x,a.y),false);assert.ok(Math.hypot(a.x-old.x,a.y-old.y)<=depth+8,'nearest way out');
  const b={...old};settleUnit(b,blocked);assert.equal(blocked(b.x,b.y),false,'ring search rescue still works (no remembered spot, no helper)');
  const e={...old,_openX:g.x+g.hx+60,_openY:g.y};settleUnit(e,blocked);assert.equal(blocked(e.x,e.y),false,'far remembered open spot rescue still works');
  const m={...old,_openX:q.x+q.nx*5,_openY:q.y+q.ny*5};settleUnit(m,blocked,fieldRockExit);assert.equal(blocked(m.x,m.y),false,'remembered open spot + slide helper');
  const z={...old};settleUnit(z,blocked,()=>null);assert.equal(blocked(z.x,z.y),false,'a helper that finds nothing falls back to the old rescue');rescued++;
 }
}
assert.ok(rescued>300,`${rescued} rescue scenarios`);
console.log(`PASS: shared outline/hit boundary for 5 families (${probes} probes, ${all.length} peaks, shares ${FAMILIES.map(n=>(byFamily[n].length/all.length*100).toFixed(0)+'%').join('/')}), convex, min curvature radius ${minRadius.toFixed(1)}px, min gap ${minGap.toFixed(1)}px, extent <=150x98 / 450px, flow within 25deg, nothing within 3km of HQ, no closed pocket, painted pixels follow the hit boundary, tile seams, determinism, nearest-point exit (max push ${worstPush.toFixed(0)}px), slide and old-save rescue (${rescued})`);
