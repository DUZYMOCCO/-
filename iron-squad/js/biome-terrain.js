// Shared deterministic geometry: worker paint, collision and shallow-water movement.
// Every 1024px cell has open edges and a cross through its centre. Solid islands
// are disjoint convex shapes; they cannot enclose a walkable pocket.
const C=79360, CELL=1024, TAU=Math.PI*2, DEG=Math.PI/180;
export function terrainHash(x,y){let n=Math.imul(x+31,73856093)^Math.imul(y+17,19349663);n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967296;}
export function biomeKeyAt(x,y){
 const dx=x-C,dy=y-C,d=Math.hypot(dx,dy);if(d<3200)return 'home';
 // Stable small patches mix the adjacent regions over a 700px boundary.
 const jitter=(terrainHash(Math.floor(x/96),Math.floor(y/96))-.5)*700;
 return Math.abs(dx)-Math.abs(dy)>jitter?(dx>0?'east':'west'):(dy>0?'south':'north');
}
// ---- Ridge geometry (v7.0.12): ONE convex shape per peak, shared by collision and paint. ----
// Five families, all convex with every corner rounded by a radius >= 18px:
//  egg      rotated super-ellipse with a slight egg taper (smooth, no corners)
//  capsule  segment (+) disc r        long ridge line
//  drop     two discs of different radius, hulled (a tapered capsule / teardrop)
//  wedge    triangle (+) disc r       rounded triangle
//  poly     4-5 gon (+) disc r        rounded trapezoid / pentagon
// "core (+) disc r" means: inside <=> distance(point, core) < r. The painted outline is exactly the offset curve of that same core
// (straight offset edges + circular arcs of radius r), so the hit boundary and the picture can not differ.
// Everything is a pure function of terrainHash(cell, peak): no saves, no draw order, no tile dependence.
// Budget that guarantees the passages: centres stay at +-218/+-152 from the cell centre and every peak keeps its axis-aligned
// half extent hx<=150, hy<=98, so neighbours are always >=136px apart horizontally and >=108px vertically (and a peak stays within 448px
// of its cell centre). When a random shape exceeds that, only its core shrinks (deterministic steps); the rounding radius is kept.
const RIDGE_HX=150, RIDGE_HY=98, RIDGE_REACH=448, RIDGE_FLOW_CELLS=24, RIDGE_JITTER=9;
const sgnPow=(t,e)=>t<0?-Math.pow(-t,e):Math.pow(t,e);
const smooth01=t=>t*t*(3-2*t);
const flowNode=(i,j)=>terrainHash(i*7+1003,j*13+2011)*2-1;
// Ridge "flow" direction of a cell: smooth value noise over a 24-cell lattice, +-30deg. Neighbouring cells differ by < 6deg, so long
// peaks line up over large areas like a mountain range.
export function ridgeFlowAngle(ix,iy){
 const gx=ix/RIDGE_FLOW_CELLS,gy=iy/RIDGE_FLOW_CELLS,i0=Math.floor(gx),j0=Math.floor(gy),tx=smooth01(gx-i0),ty=smooth01(gy-j0);
 const a=flowNode(i0,j0),b=flowNode(i0+1,j0),c=flowNode(i0,j0+1),d=flowNode(i0+1,j0+1);
 return ((a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty)*30*DEG;
}
function eggPoint(f,th){
 const e=2/f.p,U=sgnPow(Math.cos(th),e),V=sgnPow(Math.sin(th),e),u=f.a*(1+f.tau*V)*U,v=f.b*V;
 return {x:f.x+u*f.cs-v*f.sn,y:f.y+u*f.sn+v*f.cs};
}
const placeDiscs=(discs,x,y)=>{
 let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
 for(const d of discs){x0=Math.min(x0,d.x-d.r);x1=Math.max(x1,d.x+d.r);y0=Math.min(y0,d.y-d.r);y1=Math.max(y1,d.y+d.r);}
 const ox=x-(x0+x1)/2,oy=y-(y0+y1)/2;return discs.map(d=>({x:d.x+ox,y:d.y+oy,r:d.r}));
};
function buildRidge(type,hh,rot,sc,x,y){
 const cs=Math.cos(rot),sn=Math.sin(rot);
 if(type==='egg'){
  const f={geo:'egg',shape:type,x,y,a:(85+30*hh(0))*sc,b:(62+36*hh(1))*sc,rot,cs,sn,p:2+.4*hh(3),tau:(hh(4)-.5)*.2,rr:0};
  const pts=[];for(let i=0;i<112;i++)pts.push(eggPoint(f,i/112*TAU));
  f.prim=[{t:'p',pts}];f.discs=pts.map(q=>({x:q.x,y:q.y,r:0}));return f;
 }
 if(type==='capsule'||type==='drop'){
  let r1,r2,len;
  if(type==='capsule'){r1=r2=36+14*hh(1);len=2*Math.max(70+80*hh(0)-r1,6)*sc;}
  else{r1=20+10*hh(1);r2=40+12*hh(4);len=Math.max(Math.max(140+160*hh(0)-r1-r2,Math.abs(r2-r1)+30)*sc,Math.abs(r2-r1)+10);}
  const th=rot+(hh(6)<.5?Math.PI:0),discs=placeDiscs([{x:0,y:0,r:r1},{x:Math.cos(th)*len,y:Math.sin(th)*len,r:r2}],x,y);
  const c1=discs[0],c2=discs[1],hl=Math.hypot(c2.x-c1.x,c2.y-c1.y),ux=(c2.x-c1.x)/hl,uy=(c2.y-c1.y)/hl;
  // tangent normals n=+-a*perp+b*w; hull of the two discs = the union of linearly interpolated discs
  const b=(r1-r2)/hl,a=Math.sqrt(1-b*b),ph=Math.acos(b),tw=Math.atan2(uy,ux);
  return {geo:'cone',shape:type,x,y,rot,cs,sn,c1x:c1.x,c1y:c1.y,c2x:c2.x,c2y:c2.y,r1,r2,wx:ux,wy:uy,len:hl,cb:b,ca:a,rr:Math.max(r1,r2),
   prim:[{cx:c2.x,cy:c2.y,r:r2,a0:tw-ph,a1:tw+ph},{cx:c1.x,cy:c1.y,r:r1,a0:tw+ph,a1:tw-ph+TAU}],discs};
 }
 // wedge (rounded triangle) and poly (rounded 4-5 gon): vertices on an ellipse are always in convex position
 const wedge=type==='wedge',n=wedge?3:(hh(7)<.5?4:5),t0=hh(3)*TAU,ang=[];
 const ea=wedge?70+40*hh(0):62+40*hh(0),eb=wedge?38+30*hh(1):44+32*hh(1),r=wedge?22+12*hh(4):20+12*hh(4);
 if(wedge){const g1=(95+45*hh(6))*DEG,g2=(95+45*hh(7))*DEG;ang.push(t0,t0+g1,t0+g1+g2);}
 else{const st=TAU/n;for(let i=0;i<n;i++)ang.push(t0+i*st+(hh(8+i)*2-1)*.3*st);}
 const raw=ang.map(t=>{const u=ea*sc*Math.cos(t),v=eb*sc*Math.sin(t);return {x:u*cs-v*sn,y:u*sn+v*cs,r};});
 const discs=placeDiscs(raw,x,y),vx=discs.map(d=>d.x),vy=discs.map(d=>d.y),nx=[],ny=[],dd=[],prim=[];
 for(let i=0;i<n;i++){const j=(i+1)%n,ex=vx[j]-vx[i],ey=vy[j]-vy[i],l=Math.hypot(ex,ey)||1;nx.push(ey/l);ny.push(-ex/l);dd.push(ey/l*vx[i]-ex/l*vy[i]);}
 for(let i=0;i<n;i++){
  const p=(i+n-1)%n,a0=Math.atan2(ny[p],nx[p]);let ext=Math.atan2(ny[i],nx[i])-a0;ext=((ext%TAU)+TAU)%TAU;
  prim.push({cx:vx[i],cy:vy[i],r,a0,a1:a0+ext});
 }
 let apex=-1,bx=0,by=0,cx0=0,cy0=0;for(let i=0;i<n;i++){cx0+=vx[i]/n;cy0+=vy[i]/n;}
 if(wedge){
  let best=9;for(let i=0;i<n;i++){const p=(i+2)%3,q=(i+1)%3,ax=vx[p]-vx[i],ay=vy[p]-vy[i],cx=vx[q]-vx[i],cy=vy[q]-vy[i],ang0=Math.acos(Math.max(-1,Math.min(1,(ax*cx+ay*cy)/(Math.hypot(ax,ay)*Math.hypot(cx,cy)||1))));if(ang0<best){best=ang0;apex=i;}}
  const q=(apex+1)%3,p=(apex+2)%3;bx=(vx[q]+vx[p])/2;by=(vy[q]+vy[p])/2;
 }
 return {geo:'poly',shape:type,x,y,rot,cs,sn,n,vx,vy,nx,ny,dd,rr:r,cenx:cx0,ceny:cy0,apex,bmx:bx,bmy:by,prim,discs};
}
function ridgeBounds(discs,x,y,cx,cy){
 let hx=0,hy=0,rc=0,reach=0;
 for(const d of discs){hx=Math.max(hx,Math.abs(d.x-x)+d.r);hy=Math.max(hy,Math.abs(d.y-y)+d.r);rc=Math.max(rc,Math.hypot(d.x-x,d.y-y)+d.r);reach=Math.max(reach,Math.hypot(d.x-cx,d.y-cy)+d.r);}
 return {hx,hy,rc,reach};
}
function makeRidge(ix,iy,idx,x,y,h,cx,cy){
 const hh=i=>terrainHash(ix*512+idx*64+i,iy*3+11+i*131),s=hh(5);
 const type=s<.20?'egg':s<.45?'capsule':s<.60?'drop':s<.80?'wedge':'poly',elong=type==='capsule'||type==='drop';
 const rot=ridgeFlowAngle(ix,iy)+(hh(2)*2-1)*(elong?RIDGE_JITTER:35)*DEG;
 let d,b;
 for(let k=0;k<40;k++){
  d=buildRidge(type,hh,rot,Math.max(.04,1-.04*k),x,y);b=ridgeBounds(d.discs,x,y,cx,cy);
  const tol=type==='egg'?.5:0;
  if(b.hx<=RIDGE_HX-tol&&b.hy<=RIDGE_HY-tol&&b.reach<=RIDGE_REACH-tol)break;
 }
 delete d.discs;
 const f=Object.assign({kind:'ridge',solid:true,h},d);
 f.hx=b.hx;f.hy=b.hy;f.rx=b.hx;f.ry=b.hy;f.R=b.rc+.5;f.R2=f.R*f.R;
 return f;
}
// Inside test of the very same outline that paintBiomeTerrain draws.
export function ridgeInside(f,x,y){
 const dx=x-f.x,dy=y-f.y;if(dx*dx+dy*dy>=f.R2)return false;
 if(f.geo==='egg'){
  const u=dx*f.cs+dy*f.sn,v=(dy*f.cs-dx*f.sn)/f.b;
  return Math.pow(Math.abs(u)/(f.a*(1+f.tau*v)),f.p)+Math.pow(Math.abs(v),f.p)<1;
 }
 if(f.geo==='cone'){
  const px=x-f.c1x,py=y-f.c1y,yy=px*f.wx+py*f.wy,xa=Math.abs(py*f.wx-px*f.wy),k=yy*f.ca-xa*f.cb;
  if(k<0)return xa*xa+yy*yy<f.r1*f.r1;
  if(k>f.ca*f.len){const q=yy-f.len;return xa*xa+q*q<f.r2*f.r2;}
  return xa*f.ca+yy*f.cb<f.r1;
 }
 const n=f.n;let pd=-1e9;
 for(let i=0;i<n;i++){const t=f.nx[i]*x+f.ny[i]*y-f.dd[i];if(t>pd)pd=t;}
 if(pd>=f.rr)return false;if(pd<=0)return true;
 let m=1e18;
 for(let i=0;i<n;i++){
  const j=i+1===n?0:i+1,ax=f.vx[i],ay=f.vy[i],ex=f.vx[j]-ax,ey=f.vy[j]-ay;
  const t=Math.max(0,Math.min(1,((x-ax)*ex+(y-ay)*ey)/(ex*ex+ey*ey||1))),qx=x-ax-ex*t,qy=y-ay-ey*t,d2=qx*qx+qy*qy;if(d2<m)m=d2;
 }
 return m<f.rr*f.rr;
}
// The outline as points with outward normals, spaced about `step`px apart (egg: its 112 polyline points). Cached per feature.
export function ridgeOutline(f,step=3){
 const cacheKey=f._o||(f._o=new Map());if(cacheKey.has(step))return cacheKey.get(step);
 const out=[];
 if(f.geo==='egg'){
  const pts=f.prim[0].pts,n=pts.length;
  for(let i=0;i<n;i++){const a=pts[(i+n-1)%n],b=pts[(i+1)%n],tx=b.x-a.x,ty=b.y-a.y,l=Math.hypot(tx,ty)||1;out.push({x:pts[i].x,y:pts[i].y,nx:ty/l,ny:-tx/l});}
 }else{
  const A=f.prim;
  for(let i=0;i<A.length;i++){
   const s=A[i],t=A[(i+1)%A.length],na=Math.max(1,Math.ceil(s.r*(s.a1-s.a0)/step));
   for(let j=0;j<=na;j++){const a=s.a0+(s.a1-s.a0)*j/na,c=Math.cos(a),sn=Math.sin(a);out.push({x:s.cx+s.r*c,y:s.cy+s.r*sn,nx:c,ny:sn});}
   const ex=s.cx+s.r*Math.cos(s.a1),ey=s.cy+s.r*Math.sin(s.a1),sx=t.cx+t.r*Math.cos(t.a0),sy=t.cy+t.r*Math.sin(t.a0),L=Math.hypot(sx-ex,sy-ey),m=Math.ceil(L/step);
   for(let j=1;j<m;j++)out.push({x:ex+(sx-ex)*j/m,y:ey+(sy-ey)*j/m,nx:Math.cos(s.a1),ny:Math.sin(s.a1)});
  }
 }
 cacheKey.set(step,out);return out;
}
export function ridgeBoundaryPoint(f,th){
 if(f.geo==='egg')return eggPoint(f,th);
 const o=ridgeOutline(f,2),i=Math.floor((((th/TAU)%1)+1)%1*o.length)%o.length;return {x:o[i].x,y:o[i].y};
}
const cache=new Map();
export function terrainCell(ix,iy,allowed=()=>true){
 const key=`${ix},${iy}`;if(cache.has(key))return cache.get(key);
 const x=ix*CELL+CELL/2,y=iy*CELL+CELL/2,h=terrainHash(ix,iy),kind=biomeKeyAt(x,y);
 const features=[];
 if(Math.hypot(x-C,y-C)>3900&&allowed(x,y,450)){
  if(kind==='north'){let idx=0;for(const side of [-1,1])for(const row of [-1,1])features.push(makeRidge(ix,iy,idx++,x+side*218,y+row*152,h,x,y));}
  if(kind==='west')features.push({kind:'water',x,y,rx:346,ry:232,ford:42,h});
  if(kind==='south')features.push({kind:'saltbed',x,y,rx:354,ry:78,h});
  if(kind==='east'&&h<.7)features.push({kind:'hill',x,y,rx:220,ry:138,h});
 }
 cache.set(key,features);if(cache.size>256)cache.delete(cache.keys().next().value);return features;
}
export function terrainFeaturesAt(x,y,allowed){return terrainCell(Math.floor(x/CELL),Math.floor(y/CELL),allowed);}
export function naturalTerrainAt(x,y,allowed){
 for(const f of terrainFeaturesAt(x,y,allowed)){
  if(f.kind==='ridge'){if(ridgeInside(f,x,y))return 'rock';continue;}
  const nx=(x-f.x)/f.rx,ny=(y-f.y)/f.ry;
  if(nx*nx+ny*ny<1){if(f.solid)return 'rock';if(f.kind==='water'&&Math.abs(y-f.y)>f.ford)return 'water';}
 }
 return 'open';
}
// A point inside a ridge -> the NEAREST point of its outline, pushed `margin`px out along the outline normal (or null).
// The unit moves along the normal, so a unit pressed against a peak slides around it instead of stopping; the push never exceeds
// the distance to the outline (at most the inscribed radius).
export function ridgeExit(x,y,allowed,margin=.8){
 for(const f of terrainFeaturesAt(x,y,allowed)){
  if(f.kind!=='ridge'||!ridgeInside(f,x,y))continue;
  const o=ridgeOutline(f,2);let bi=0,bd=1e18;
  for(let i=0;i<o.length;i++){const d=(o[i].x-x)*(o[i].x-x)+(o[i].y-y)*(o[i].y-y);if(d<bd){bd=d;bi=i;}}
  const q=o[bi];
  for(let m=margin,i=0;i<5;i++,m*=2){const ex=q.x+q.nx*m,ey=q.y+q.ny*m;if(!ridgeInside(f,ex,ey))return {x:ex,y:ey};}
  return null;
 }
 return null;
}
const oval=(c,x,y,rx,ry,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
// ---- North ridge art. Everything solid is drawn INSIDE the collision outline (clip); outside it only a faint ground shadow. ----
const RIDGE_LIGHT=(()=>{const l=Math.hypot(.55,.5,.67);return [-.55/l,-.5/l,.67/l];})();
const RIDGE_DARK=[23,35,42],RIDGE_MID=[84,102,108],RIDGE_LIT=[182,196,186];
const mixRgb=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const rgbCss=(v,m=1)=>`rgb(${Math.max(0,Math.min(255,v[0]*m))|0},${Math.max(0,Math.min(255,v[1]*m))|0},${Math.max(0,Math.min(255,v[2]*m))|0})`;
const pt=(x,y,z=0)=>({x,y,z});
// Oblique projection: height lifts a point up the screen.
const rsy=p=>p.y-p.z*.55;
function ridgeTone(tri,noise,tint,zk=1){
 const [a,b,d]=tri,ux=b.x-a.x,uy=b.y-a.y,uz=(b.z-a.z)*zk,vx=d.x-a.x,vy=d.y-a.y,vz=(d.z-a.z)*zk;
 let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;if(nz<0){nx=-nx;ny=-ny;nz=-nz;}
 const l=Math.hypot(nx,ny,nz)||1,t=(nx*RIDGE_LIGHT[0]+ny*RIDGE_LIGHT[1]+nz*RIDGE_LIGHT[2])/l;
 const k=Math.max(0,Math.min(1,(t+.3)/1.3+noise)),base=k<.5?mixRgb(RIDGE_DARK,RIDGE_MID,k*2):mixRgb(RIDGE_MID,RIDGE_LIT,(k-.5)*2);
 return {rgb:[base[0]+tint[0],base[1]+tint[1],base[2]+tint[2]],k};
}
function ridgeTri(c,tri,noise,tint,bright,zk=1){
 const tone=ridgeTone(tri,noise,tint,zk),col=rgbCss(tone.rgb,bright);
 c.fillStyle=col;c.strokeStyle=col;c.lineWidth=1.2;c.lineJoin='round';
 c.beginPath();c.moveTo(tri[0].x,rsy(tri[0]));c.lineTo(tri[1].x,rsy(tri[1]));c.lineTo(tri[2].x,rsy(tri[2]));c.closePath();c.fill();c.stroke();
}
function ridgeRand(f,j=0){const fx=Math.round(f.x),fy=Math.round(f.y);return i=>terrainHash(fx+i*7919+j*131071,fy+i*104729+i+j*65537);}
function ridgeMeta(f){
 const r=ridgeRand(f);
 return {r,H:f.b*(.8+.5*r(3)),tint:[(r(6)-.5)*14,(r(7)-.5)*12,(r(8)-.5)*16],bright:.9+.18*r(9)};
}
// The collision outline as a canvas path (k scales it about the peak centre, ox/oy shift it; only the shadow uses those).
function ridgePath(c,f,k=1,ox=0,oy=0){
 c.beginPath();
 if(f.geo==='egg'){
  const pts=f.prim[0].pts;
  for(let i=0;i<pts.length;i++){const x=f.x+(pts[i].x-f.x)*k+ox,y=f.y+(pts[i].y-f.y)*k+oy;if(i)c.lineTo(x,y);else c.moveTo(x,y);}
 }else for(const s of f.prim)c.arc(f.x+(s.cx-f.x)*k+ox,f.y+(s.cy-f.y)*k+oy,s.r*k,s.a0,s.a1,false);
 c.closePath();
}
// Faceted relief over a boundary ring P (ground points). Free to be jagged: the caller clips it to the outline.
function ridgeFacets(c,cx,cy,P,H,r,tint,bright,ring,sx,sy){
 const N=P.length,S=pt(cx+sx,cy+sy,H),Q=[];
 if(ring)for(let k=0;k<N;k++){
  const p=P[k],rho=.3+.34*r(70+k),z=H*(k%2?.28+.26*r(110+k):.46+.36*r(110+k));
  Q.push(pt(cx+(p.x-cx)*rho+(r(90+k)-.5)*6,cy+(p.y-cy)*rho+(r(95+k)-.5)*6,z));
 }
 const tris=[];
 for(let k=0;k<N;k++){const j=(k+1)%N;if(ring)tris.push([S,Q[k],Q[j]],[Q[k],P[k],P[j]],[Q[k],P[j],Q[j]]);else tris.push([S,P[k],P[j]]);}
 tris.sort((a,b)=>(a[0].y+a[1].y+a[2].y)-(b[0].y+b[1].y+b[2].y));
 for(let i=0;i<tris.length;i++)ridgeTri(c,tris[i],(r(130+i%48)-.5)*.16,tint,bright);
 // crest lines (summit -> inner knot -> foot) and short rock striations
 for(let k=0;k<N;k++){
  const a=Math.atan2(P[k].y-cy,P[k].x-cx),lit=Math.cos(a)*RIDGE_LIGHT[0]+Math.sin(a)*RIDGE_LIGHT[1],M=ring?Q[k]:null;
  c.lineCap='round';
  if(k%2===0){
   c.strokeStyle=lit>0?'rgba(214,224,208,.58)':'rgba(7,14,18,.55)';c.lineWidth=lit>0?1.6:1.8;
   c.beginPath();c.moveTo(S.x,rsy(S));if(M)c.lineTo(M.x,rsy(M));c.lineTo(P[k].x,rsy(P[k]));c.stroke();
  }else if(ring){
   const u=.3+.2*r(150+k),v=.7+.2*r(170+k),ox=(r(190+k)-.5)*9;
   c.strokeStyle=lit>0?'rgba(30,44,50,.38)':'rgba(5,11,15,.42)';c.lineWidth=1.1;
   c.beginPath();c.moveTo(Q[k].x+(P[k].x-Q[k].x)*u+ox,rsy(Q[k])+(rsy(P[k])-rsy(Q[k]))*u);c.lineTo(Q[k].x+(P[k].x-Q[k].x)*v+ox*.5,rsy(Q[k])+(rsy(P[k])-rsy(Q[k]))*v);c.stroke();
  }
 }
 return S;
}
// Main relief: a height field with one long spine (along the peak's own long axis) built on 3 rings, so big planes slope off the
// ridge line (sunny flank / shaded flank) instead of a star of spokes. The outer ring sits at z=0 on the collision outline.
function ridgeMassif(c,f,m,P,r){
 const N=P.length,{H,tint,bright}=m,u0=(r(4)-.5)*.5*f.a,rings=[.36,.68],V=[];
 const zf=(x,y,k)=>{
  const dx=x-f.x,dy=y-f.y,u=dx*f.cs+dy*f.sn,v=(dy*f.cs-dx*f.sn)/f.b,t=(u-u0)/(f.a*1.15);
  return H*Math.pow(Math.max(0,1-t*t),.7)*Math.max(0,1-Math.pow(Math.abs(v),1.5))*(.72+.56*r(100+k));
 };
 for(let ri=0;ri<rings.length;ri++){V.push([]);for(let k=0;k<N;k++){
  const p=P[k],rho=rings[ri]*(.9+.2*r(300+ri*40+k)),x=f.x+(p.x-f.x)*rho+(r(340+ri*40+k)-.5)*8,y=f.y+(p.y-f.y)*rho+(r(380+ri*40+k)-.5)*8;
  V[ri].push(pt(x,y,zf(x,y,ri*N+k)));
 }}
 const top=pt(f.x+u0*f.cs,f.y+u0*f.sn,zf(f.x+u0*f.cs,f.y+u0*f.sn,0)*1.15),tris=[],ring=[V[0],V[1],P];
 for(let k=0;k<N;k++){
  const j=(k+1)%N;tris.push([top,V[0][k],V[0][j]]);
  for(let ri=0;ri<2;ri++){const A=ring[ri],B=ring[ri+1];tris.push([A[k],B[k],B[j]],[A[k],B[j],A[j]]);}
 }
 tris.sort((x,y)=>(x[0].y+x[1].y+x[2].y)-(y[0].y+y[1].y+y[2].y));
 for(let i=0;i<tris.length;i++)ridgeTri(c,tris[i],(r(130+i%48)-.5)*.16,tint,bright);
 // spine crest and a few rib lines running down the flanks
 const sp=[];for(let j=-4;j<=4;j++){const u=u0+j*f.a*.2,x=f.x+u*f.cs,y=f.y+u*f.sn;sp.push(pt(x,y,zf(x,y,j+60)*1.1));}
 c.lineCap='round';c.lineJoin='round';
 c.strokeStyle='rgba(7,14,18,.45)';c.lineWidth=2.4;c.beginPath();sp.forEach((p,i)=>{if(i)c.lineTo(p.x+1,rsy(p)+2);else c.moveTo(p.x+1,rsy(p)+2);});c.stroke();
 c.strokeStyle='rgba(214,224,208,.62)';c.lineWidth=2;c.beginPath();sp.forEach((p,i)=>{if(i)c.lineTo(p.x,rsy(p));else c.moveTo(p.x,rsy(p));});c.stroke();
 for(let k=0;k<N;k+=2){
  const a=Math.atan2(P[k].y-f.y,P[k].x-f.x),lit=Math.cos(a)*RIDGE_LIGHT[0]+Math.sin(a)*RIDGE_LIGHT[1],A=V[0][k],B=V[1][k];
  c.strokeStyle=lit>0?'rgba(214,224,208,.4)':'rgba(5,11,15,.5)';c.lineWidth=1.4;
  c.beginPath();c.moveTo(A.x,rsy(A));c.lineTo(B.x,rsy(B));c.lineTo(P[k].x,rsy(P[k]));c.stroke();
 }
 return top;
}
// Dark rim (inner half only: the clip removes the rest) and a lit rim on the sun-facing edge. The outline is exactly the collision boundary.
function paintRidgeRim(c,f){
 ridgePath(c,f);c.lineJoin='round';c.strokeStyle='rgba(8,15,19,.8)';c.lineWidth=5;c.stroke();
 const o=ridgeOutline(f,3),n=o.length;c.lineCap='round';c.lineWidth=3.6;
 for(let i=0;i<n;i++){
  const a=o[i],b=o[(i+1)%n],lit=a.nx*RIDGE_LIGHT[0]+a.ny*RIDGE_LIGHT[1];
  if(lit>.1){c.strokeStyle=`rgba(204,216,203,${Math.min(.65,lit*.85).toFixed(2)})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
 }
}
function paintRidgePeak(c,f,m){
 const {r,bright}=m,N=20+Math.floor(r(0)*5),step=TAU/N,ph=r(1)*TAU,P=[];
 for(let k=0;k<N;k++)P.push(Object.assign(ridgeBoundaryPoint(f,ph+k*step+(r(10+k)-.5)*step*.5),{z:0}));
 c.save();ridgePath(c,f);c.clip();
 ridgePath(c,f);c.fillStyle=rgbCss(mixRgb(RIDGE_DARK,RIDGE_MID,.45),bright);c.fill();
 const S=ridgeMassif(c,f,m,P,r);
 // a shoulder summit on the crest: the peak reads as a ridge with two tops instead of a single cone
 if(r(13)<.75){
  const rr=ridgeRand(f,9),t=(rr(2)<.5?-1:1)*(.3+.28*rr(3)),mx=f.x+(r(4)-.5)*.5*f.a*f.cs+t*f.a*f.cs+(rr(7)-.5)*14*f.sn,my=f.y+(r(4)-.5)*.5*f.a*f.sn+t*f.a*f.sn+(rr(8)-.5)*14*f.cs,n2=8+Math.floor(rr(5)*3),P2=[],sc=.2+.1*rr(9);
  for(let k=0;k<n2;k++){const q=rr(6)*TAU+k*TAU/n2+(rr(10+k)-.5)*.3,s=.8+.2*rr(20+k);P2.push(pt(mx+Math.cos(q)*f.a*sc*s,my+Math.sin(q)*f.b*sc*s*1.1,0));}
  const S2=ridgeFacets(c,mx,my,P2,m.H*(.55+.25*rr(4)),rr,m.tint,bright,false,0,0);
  c.lineCap='round';c.lineWidth=2.2;c.strokeStyle='rgba(214,224,208,.5)';c.beginPath();c.moveTo(S.x,rsy(S));c.lineTo(S2.x,rsy(S2));c.stroke();
 }
 paintRidgeRim(c,f);
 c.restore();
}
// Closest point of the (filled) core polygon of a wedge / poly peak.
function polyCore(f,p){
 const n=f.n;let pd=-1e9;for(let i=0;i<n;i++)pd=Math.max(pd,f.nx[i]*p.x+f.ny[i]*p.y-f.dd[i]);
 if(pd<=0)return {x:p.x,y:p.y};
 let best=1e18,bx=0,by=0;
 for(let i=0;i<n;i++){
  const j=(i+1)%n,ax=f.vx[i],ay=f.vy[i],ex=f.vx[j]-ax,ey=f.vy[j]-ay,t=Math.max(0,Math.min(1,((p.x-ax)*ex+(p.y-ay)*ey)/(ex*ex+ey*ey||1)));
  const qx=ax+ex*t,qy=ay+ey*t,d2=(p.x-qx)*(p.x-qx)+(p.y-qy)*(p.y-qy);if(d2<best){best=d2;bx=qx;by=qy;}
 }
 return {x:bx,y:by};
}
// capsule / drop / wedge / poly relief. The outline P sits at z=0; each point is pulled toward its closest CORE point (rings at
// 0 / .4 / .75 / 1 of the way) and lifted, so the flanks slope up to the core: a capsule/drop gets a true crest line along its core
// segment, wedge/poly get a hip roof (crest = core edges; the wedge also has a spine from its tip to the middle of its base).
function paintSdfPeak(c,f,m){
 const {r,tint,bright}=m,H=f.rr*.98*(.85+.3*r(3)),dense=ridgeOutline(f,3),M=dense.length,N=Math.max(12,Math.round(M/9)),ph=r(1),P=[];
 for(let k=0;k<N;k++)P.push(dense[Math.floor((k+ph)*M/N)%M]);
 const cone=f.geo==='cone',wedge=f.shape==='wedge';
 const core=cone?p=>{const t=Math.max(0,Math.min(1,((p.x-f.c1x)*f.wx+(p.y-f.c1y)*f.wy)/f.len));return {x:f.c1x+f.wx*f.len*t,y:f.c1y+f.wy*f.len*t};}:p=>polyCore(f,p);
 const k1=.045+.02*r(22),k2=.05+.02*r(23),p1=r(20)*TAU,p2=r(21)*TAU;
 const vr=(x,y)=>.82+.36*(.5+.25*Math.sin(x*k1+p1+y*.02)+.25*Math.sin(y*k2+p2-x*.015));
 const W=[0,.4,.75,1],V=W.map(()=>[]),apex=wedge?{x:f.vx[f.apex],y:f.vy[f.apex]}:null;
 for(let k=0;k<N;k++){
  const p=P[k],q=core(p);
  for(let wi=0;wi<4;wi++){
   const w=W[wi];let x=p.x+(q.x-p.x)*w,y=p.y+(q.y-p.y)*w;
   if(wi===1||wi===2){x+=(r(340+wi*40+k)-.5)*8;y+=(r(380+wi*40+k)-.5)*8;}
   let z=w===0?0:H*Math.pow(w,.85)*vr(x,y);
   if(wi===3&&apex&&Math.hypot(x-apex.x,y-apex.y)<.6)z*=1.28;
   V[wi].push(pt(x,y,z));
  }
 }
 const tris=[];
 for(let wi=0;wi<3;wi++)for(let k=0;k<N;k++){const j=(k+1)%N;tris.push([V[wi][k],V[wi+1][k],V[wi+1][j]],[V[wi][k],V[wi+1][j],V[wi][j]]);}
 let top=null;
 if(!cone){
  const tx=wedge?f.bmx:f.cenx,ty=wedge?f.bmy:f.ceny;top=pt(tx,ty,H*1.08*vr(tx,ty));
  for(let k=0;k<N;k++)tris.push([top,V[3][k],V[3][(k+1)%N]]);
 }
 c.save();ridgePath(c,f);c.clip();
 ridgePath(c,f);c.fillStyle=rgbCss(mixRgb(RIDGE_DARK,RIDGE_MID,.45),bright);c.fill();
 tris.sort((a,b)=>(a[0].y+a[1].y+a[2].y)-(b[0].y+b[1].y+b[2].y));
 for(let i=0;i<tris.length;i++)ridgeTri(c,tris[i],(r(130+i%48)-.5)*.2,tint,bright,2);
 // rock strata: broken contour lines on the two inner rings
 c.lineCap='round';c.lineJoin='round';c.lineWidth=1;c.strokeStyle='rgba(5,11,15,.22)';
 for(let wi=1;wi<=2;wi++)for(let k=0;k<N;k++){if(r(500+wi*50+k)<.4){const a=V[wi][k],b=V[wi][(k+1)%N];c.beginPath();c.moveTo(a.x,rsy(a));c.lineTo(b.x,rsy(b));c.stroke();}}
 // ribs down the flanks, lit on the sun side
 for(let k=0;k<N;k+=2){
  const lit=P[k].nx*RIDGE_LIGHT[0]+P[k].ny*RIDGE_LIGHT[1],A=V[1][k],B=V[2][k];
  c.strokeStyle=lit>0?'rgba(214,224,208,.4)':'rgba(5,11,15,.5)';c.lineWidth=1.4;
  c.beginPath();c.moveTo(B.x,rsy(B));c.lineTo(A.x,rsy(A));c.lineTo(P[k].x,P[k].y);c.stroke();
 }
 // crest lines
 const crest=(pts,lw)=>{
  c.strokeStyle='rgba(7,14,18,.45)';c.lineWidth=lw+.6;c.beginPath();pts.forEach((p,i)=>{if(i)c.lineTo(p.x+1,rsy(p)+2);else c.moveTo(p.x+1,rsy(p)+2);});c.stroke();
  c.strokeStyle='rgba(214,224,208,.62)';c.lineWidth=lw;c.beginPath();pts.forEach((p,i)=>{if(i)c.lineTo(p.x,rsy(p));else c.moveTo(p.x,rsy(p));});c.stroke();
 };
 if(cone){
  const sp=[];for(let i=0;i<=10;i++){const x=f.c1x+f.wx*f.len*i/10,y=f.c1y+f.wy*f.len*i/10;sp.push(pt(x,y,H*vr(x,y)));}
  crest(sp,2);
 }else{
  const cv=[];for(let i=0;i<f.n;i++){const z=H*vr(f.vx[i],f.vy[i])*(i===f.apex?1.28:1);cv.push(pt(f.vx[i],f.vy[i],z));}
  for(let i=0;i<f.n;i++){const a=cv[i],b=cv[(i+1)%f.n],lit=f.nx[i]*RIDGE_LIGHT[0]+f.ny[i]*RIDGE_LIGHT[1];
   c.strokeStyle=lit>0?'rgba(214,224,208,.55)':'rgba(7,14,18,.5)';c.lineWidth=1.8;c.beginPath();c.moveTo(a.x,rsy(a));c.lineTo(b.x,rsy(b));c.stroke();}
  if(wedge)crest([cv[f.apex],top],2);
 }
 paintRidgeRim(c,f);
 c.restore();
}
function paintRidgeCluster(c,ridges,x0,y0){
 let cx=0,cy=0;for(const f of ridges){cx+=f.x;cy+=f.y;}cx/=ridges.length;cy/=ridges.length;
 const reach=480;if(cx+reach<x0||cx-reach>x0+512||cy+reach<y0||cy-reach>y0+512)return;
 // faint ground shadow only (never solid-looking): drawn first for the whole cell so it cannot cover a neighbouring peak
 for(const f of ridges){ridgePath(c,f,1,7,11);c.fillStyle='rgba(6,12,16,.28)';c.fill();ridgePath(c,f,1.12,4,7);c.fillStyle='rgba(6,12,16,.1)';c.fill();}
 ridges.slice().sort((a,b)=>a.y-b.y||a.x-b.x).forEach(f=>{const m=ridgeMeta(f);if(f.geo==='egg')paintRidgePeak(c,f,m);else paintSdfPeak(c,f,m);});
}
export function paintBiomeTerrain(c,x0,y0,allowed){
 c.save();c.translate(-x0,-y0);
 for(let iy=Math.floor((y0-400)/CELL);iy<=Math.floor((y0+912)/CELL);iy++)for(let ix=Math.floor((x0-400)/CELL);ix<=Math.floor((x0+912)/CELL);ix++){
  const feats=terrainCell(ix,iy,allowed),ridges=feats.filter(f=>f.kind==='ridge');
  if(ridges.length)paintRidgeCluster(c,ridges,x0,y0);
  for(const f of feats){
   if(f.kind==='ridge')continue;
   if(f.x+f.rx<x0||f.x-f.rx>x0+512||f.y+f.ry<y0||f.y-f.ry>y0+512)continue;
   if(f.kind==='water'){
    oval(c,f.x,f.y,f.rx+12,f.ry+12,'#52634b');oval(c,f.x,f.y,f.rx,f.ry,'#294e50');oval(c,f.x-25,f.y-12,f.rx-38,f.ry-29,'#396466');
    c.strokeStyle='#8eb2a177';c.lineWidth=2;
    for(let i=0;i<16;i++){const a=i*2.4,xx=f.x+Math.cos(a)*f.rx*.73,yy=f.y+Math.sin(a)*f.ry*.8;if(Math.abs(yy-f.y)<50)continue;c.beginPath();c.moveTo(xx-13,yy);c.quadraticCurveTo(xx,yy+3,xx+17,yy);c.stroke();}
    // The same 84px strip used by movement is a dry, clearly visible boardwalk.
    c.fillStyle='#61583e';c.fillRect(f.x-f.rx-13,f.y-f.ford,f.rx*2+26,f.ford*2);
    c.strokeStyle='#b7aa7c';c.lineWidth=2;for(let xx=f.x-f.rx-10;xx<f.x+f.rx+12;xx+=17){c.beginPath();c.moveTo(xx,f.y-f.ford+4);c.lineTo(xx,f.y+f.ford-4);c.stroke();}
    c.strokeStyle='#302f25';c.lineWidth=4;for(const yy of [f.y-f.ford,f.y+f.ford]){c.beginPath();c.moveTo(f.x-f.rx-14,yy);c.lineTo(f.x+f.rx+14,yy);c.stroke();}
   }else if(f.kind==='saltbed'){
    oval(c,f.x,f.y,f.rx,f.ry+12,'#9a9275');oval(c,f.x,f.y,f.rx-8,f.ry,'#b7ad8c');oval(c,f.x,f.y,f.rx-12,f.ry-21,'#d5cba7');
    c.strokeStyle='#8c846a';c.lineWidth=2;for(let i=0;i<12;i++){const xx=f.x-310+i*54;c.beginPath();c.moveTo(xx,f.y-11);c.lineTo(xx+12,f.y+3);c.lineTo(xx+3,f.y+20);c.stroke();}
    for(const side of [-1,1])for(let i=0;i<4;i++){const xx=f.x-210+i*130,yy=f.y+side*(f.ry+18);c.fillStyle='#eee8cc';c.strokeStyle='#777b78';c.lineWidth=2;c.beginPath();c.moveTo(xx-12,yy+8);c.lineTo(xx-4,yy-22);c.lineTo(xx+9,yy-12);c.lineTo(xx+14,yy+7);c.closePath();c.fill();c.stroke();}
   }else{
    const g=c.createRadialGradient(f.x-40,f.y-35,4,f.x,f.y,f.rx);g.addColorStop(0,'#84914b66');g.addColorStop(1,'#77753b00');c.save();c.translate(f.x,f.y);c.scale(1,f.ry/f.rx);c.fillStyle=g;c.restore();
    oval(c,f.x,f.y,f.rx,f.ry,'#77834628');c.strokeStyle='#a29f5e44';c.lineWidth=3;c.beginPath();c.ellipse(f.x,f.y,f.rx-30,f.ry-24,0,Math.PI,TAU);c.stroke();
    // A short open-ended fence marks the hill, never a hidden collision wall.
    c.strokeStyle='#8a7952';c.lineWidth=3;c.beginPath();c.moveTo(f.x-90,f.y+90);c.lineTo(f.x+50,f.y+90);c.stroke();for(let i=0;i<5;i++){const xx=f.x-90+i*35;c.beginPath();c.moveTo(xx,f.y+79);c.lineTo(xx,f.y+103);c.stroke();}
   }
  }
 }
 c.restore();
}
