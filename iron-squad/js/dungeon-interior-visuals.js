/** Connected exploration rooms, drawn in world coordinates. No gameplay RNG or canvases. */
const GRID=40;
const SCENES={
 mines:{void:'#171611',floor:'#443a2b',tiles:['#504532','#49402f','#584a35'],seam:'#342f25',wall:'#373127',cap:'#72634a',edge:'#aa8c58',shade:'#211e19'},
 catacombs:{void:'#13161a',floor:'#3e4143',tiles:['#4b4f50','#464a4b','#535455'],seam:'#2e3438',wall:'#2c3338',cap:'#697171',edge:'#99988a',shade:'#1a2128'},
 dragon:{void:'#1f1413',floor:'#453c35',tiles:['#57473d','#4d433b','#605044'],seam:'#342d29',wall:'#382d29',cap:'#786052',edge:'#a37c5a',shade:'#201817'},
 demon:{void:'#10141b',floor:'#343b44',tiles:['#424851','#38404a','#474c55'],seam:'#232a32',wall:'#252d38',cap:'#5d6774',edge:'#b1a075',shade:'#141d29'},
 ruin:{void:'#1c2520',floor:'#454a3d',tiles:['#55594a','#4d5243','#63624f'],seam:'#363d31',wall:'#42473b',cap:'#86836a',edge:'#b8ae88',shade:'#293126'}
};
const GEOMETRY=new WeakMap();
const PRIORITY={corridor:0,branch:1,entry:2,hall:3,stash:4,boss:5};
const hash=(x,y,seed=0)=>{let n=Math.imul(x+17,73856093)^Math.imul(y+31,19349663)^Math.imul(seed+7,83492791);n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967296;};
const key=(x,y)=>`${x},${y}`;
const rectInView=(x,y,w,h,v)=>x+w>=v.left&&x<=v.right&&y+h>=v.top&&y<=v.bottom;
const inside=(p,r)=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h;
const polygon=(c,p,color,outline=null,width=1)=>{c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();if(outline){c.strokeStyle=outline;c.lineWidth=width;c.stroke();}};
const line=(c,p,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};

function mergeEdges(edges) {
 const groups=new Map();
 for(const e of edges){const k=`${e.side}:${e.fixed}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e.start);}
 const result=[];
 for(const [group,starts] of groups){
  const [side,position]=group.split(':');starts.sort((a,b)=>a-b);
  let start=starts[0],end=start+GRID;
  const finish=()=>result.push({side,fixed:Number(position),start,end,horizontal:side==='north'||side==='south'});
  for(let i=1;i<starts.length;i++){if(starts[i]<=end)end=Math.max(end,starts[i]+GRID);else{finish();start=starts[i];end=start+GRID;}}
  finish();
 }
 return result;
}

/** Cache only small coordinate lists. Solids remain the parent's physical source. */
function geometryFor(layout,theme) {
 let cached=GEOMETRY.get(layout);if(cached&&cached.theme===theme)return cached;
 const cells=new Map(),areas=(layout.areas||[]).filter(r=>r&&r.w>0&&r.h>0),solids=layout.solids||[];
 for(const area of areas){
  for(let y=Math.floor(area.y/GRID);y<Math.ceil((area.y+area.h)/GRID);y++)for(let x=Math.floor(area.x/GRID);x<Math.ceil((area.x+area.w)/GRID);x++){
   const p={x:x*GRID+GRID/2,y:y*GRID+GRID/2};
   if(!inside(p,area)||solids.some(r=>inside(p,r)))continue;
   const k=key(x,y),old=cells.get(k);
   if(!old||(PRIORITY[area.kind]||0)>(PRIORITY[old.kind]||0))cells.set(k,{x,y,kind:area.kind||'hall'});
  }
 }
 const raw=[];
 for(const {x,y} of cells.values()){
  if(!cells.has(key(x,y-1)))raw.push({side:'north',fixed:y*GRID,start:x*GRID});
  if(!cells.has(key(x,y+1)))raw.push({side:'south',fixed:(y+1)*GRID,start:x*GRID});
  if(!cells.has(key(x-1,y)))raw.push({side:'west',fixed:x*GRID,start:y*GRID});
  if(!cells.has(key(x+1,y)))raw.push({side:'east',fixed:(x+1)*GRID,start:y*GRID});
 }
 const edges=mergeEdges(raw),props=[];
 const nearImportant=(x,y)=>[layout.exit,layout.boss,...(layout.branches||[])].some(p=>p&&Math.hypot(x-p.x,y-p.y)<92);
 // Wall-mounted structures stay on the solid side of the exposed boundary.
 for(const e of edges){
  if(e.end-e.start<120)continue;
  const count=Math.max(1,Math.floor((e.end-e.start)/190));
  for(let i=0;i<count;i++){
   const along=e.start+(i+.5)*(e.end-e.start)/count;
   const x=e.horizontal?along:e.fixed+(e.side==='west'?-13:13),y=e.horizontal?e.fixed+(e.side==='north'?-8:24):along;
   if(nearImportant(x,y))continue;
   props.push({x,y,wall:true,side:e.side,type:theme==='mines'?'timber':theme==='catacombs'?(i%2?'niche':'candle'):theme==='dragon'?(i%2?'ledge':'basalt'):theme==='demon'?(i%2?'banner':'column'):(i%2?'vine':'broken-column'),seed:hash(Math.round(x),Math.round(y))});
  }
 }
 // Furniture uses room margins, leaving the main aisle and branch-end boxes clear.
 for(const a of areas){
  if(!['entry','hall','boss','stash'].includes(a.kind)||a.h<200||a.w<200)continue;
  const positions=[[a.x+56,a.y+50],[a.x+a.w-58,a.y+a.h-47]];
  if(a.kind==='boss'&&a.w>=440)positions.push([a.x+a.w-68,a.y+54],[a.x+66,a.y+a.h-49]);
  for(let i=0;i<positions.length;i++){
   const [x,y]=positions[i];if(nearImportant(x,y)||solids.some(r=>inside({x,y},r))||!cells.has(key(Math.floor(x/GRID),Math.floor(y/GRID))))continue;
   props.push({x,y,wall:false,type:theme==='mines'?(i%2?'ore':'cart'):theme==='catacombs'?(i%2?'urn':'sarcophagus'):theme==='dragon'?(i%2?'rock':'bones'):theme==='demon'?(i%2?'offering':'obelisk'):(i%2?'rubble':'fallen-column'),seed:hash(Math.round(x),Math.round(y),i)});
  }
 }
 for(const p of layout.props||[])if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))props.push({...p,type:p.type||p.kind||'rubble',seed:p.seed??hash(Math.round(p.x),Math.round(p.y))});
 props.sort((a,b)=>a.y-b.y);
 cached={theme,cells,areas,edges,props};GEOMETRY.set(layout,cached);return cached;
}

function floorCell(c,x,y,theme,s,detail) {
 const ix=x/GRID,iy=y/GRID,n=hash(ix,iy),tone=s.tiles[Math.floor(n*s.tiles.length)];
 c.fillStyle=tone;
 if(theme==='dragon'){
  polygon(c,[[x+3,y+8+n*4],[x+18,y+2],[x+36,y+4],[x+38,y+26],[x+25,y+38],[x+4,y+34]],tone);
  if(detail&&n>.62)line(c,[[x+6,y+18],[x+19,y+20],[x+25,y+29]],s.seam,1.5);
 }else if(theme==='mines'){
  c.fillRect(x+1,y+1,38,38);
  if(detail){line(c,[[x+5,y+30],[x+19,y+27],[x+31,y+31]],'#6b583a',.9);if(n>.65){ellipse(c,x+12,y+13,4,2,'#77715a');ellipse(c,x+28,y+20,2,1.5,'#9a8760');}}
 }else if(theme==='demon'){
  polygon(c,[[x+5,y+2],[x+35,y+2],[x+38,y+5],[x+38,y+35],[x+35,y+38],[x+5,y+38],[x+2,y+35],[x+2,y+5]],tone);
  if(detail&&n>.78)line(c,[[x+6,y+7],[x+28,y+7]],'#69717a',.7);
 }else{
  const slip=theme==='ruin'?(n-.5)*3:0;
  c.fillRect(x+2+slip,y+2,36,36);c.fillStyle=s.seam;c.fillRect(x+2+slip,y+34,36,4);
  if(detail&&n>.68)line(c,[[x+8,y+3],[x+11,y+15],[x+7,y+25]],theme==='ruin'?'#333c31':'#303739',1.2);
  if(theme==='ruin'&&n>.82){c.fillStyle='#58694b';c.fillRect(x+1,y+29,12,4);c.fillRect(x+4,y+25,4,4);}
 }
}

function drawRails(c,a,v) {
 const horizontal=a.w>=a.h,cross=horizontal?a.y+a.h/2:a.x+a.w/2;
 const from=Math.max(horizontal?a.x:a.y,horizontal?v.left:v.top),to=Math.min(horizontal?a.x+a.w:a.y+a.h,horizontal?v.right:v.bottom);
 if(to<=from)return;
 for(let k=Math.floor(from/32)*32;k<to;k+=32){c.fillStyle='#7a6040';if(horizontal)c.fillRect(k,cross-23,8,46);else c.fillRect(cross-23,k,46,8);}
 if(horizontal){line(c,[[from,cross-15],[to,cross-15]],'#a89a74',3);line(c,[[from,cross+15],[to,cross+15]],'#a89a74',3);line(c,[[from,cross-12],[to,cross-12]],'#413d31',1);}
 else{line(c,[[cross-15,from],[cross-15,to]],'#a89a74',3);line(c,[[cross+15,from],[cross+15,to]],'#a89a74',3);line(c,[[cross-12,from],[cross-12,to]],'#413d31',1);}
}

function drawRoomFloor(c,a,theme,v) {
 const cx=a.x+a.w/2,cy=a.y+a.h/2,horizontal=a.w>=a.h;
 if(theme==='mines'){
  if(a.kind!=='stash')drawRails(c,a,v);
  return;
 }
 if(theme==='demon'){
  if(a.kind==='corridor'||a.kind==='branch'){
   c.fillStyle='#69414a';if(horizontal)c.fillRect(a.x,cy-27,a.w,54);else c.fillRect(cx-27,a.y,54,a.h);
   c.fillStyle='#ae976c';if(horizontal){c.fillRect(a.x,cy-27,a.w,2);c.fillRect(a.x,cy+25,a.w,2);}else{c.fillRect(cx-27,a.y,2,a.h);c.fillRect(cx+25,a.y,2,a.h);}
  }
  if(['hall','boss'].includes(a.kind)){
   const radius=Math.min(a.w,a.h)*.22;
   c.strokeStyle='#7c735c';c.lineWidth=3;c.strokeRect(cx-radius,cy-radius,radius*2,radius*2);
   polygon(c,[[cx,cy-radius+8],[cx+radius-8,cy],[cx,cy+radius-8],[cx-radius+8,cy]],'#3d303c','#897454',2);
   line(c,[[cx-16,cy-12],[cx,cy+16],[cx+16,cy-12]],'#8e7a59',3);
  }
 }else if(theme==='catacombs'){
  if(a.kind==='corridor'||a.kind==='branch'){
   c.fillStyle='#545954';if(horizontal)c.fillRect(a.x,cy-15,a.w,30);else c.fillRect(cx-15,a.y,30,a.h);
   const from=Math.max(horizontal?a.x:a.y,horizontal?v.left:v.top),to=Math.min(horizontal?a.x+a.w:a.y+a.h,horizontal?v.right:v.bottom);
   for(let k=Math.floor(from/120)*120;k<to;k+=120){const x=horizontal?k:cx,y=horizontal?cy:k;polygon(c,[[x-5,y],[x,y-7],[x+5,y],[x,y+7]],'#777d73');}
  }
  if(a.kind==='boss'){ellipse(c,cx,cy,Math.min(110,a.w*.18),Math.min(90,a.h*.2),'#343c40');c.strokeStyle='#7f8275';c.lineWidth=2;c.beginPath();c.ellipse(cx,cy,86,65,0,0,Math.PI*2);c.stroke();line(c,[[cx-35,cy],[cx+35,cy]],'#676f68',3);line(c,[[cx,cy-38],[cx,cy+38]],'#676f68',3);}
 }else if(theme==='dragon'){
  if(['hall','boss'].includes(a.kind)){
   const r=Math.min(120,a.w*.19,a.h*.24);
   polygon(c,[[cx-r,cy-20],[cx-r*.6,cy-r*.55],[cx+r*.3,cy-r*.5],[cx+r,cy],[cx+r*.5,cy+r*.4],[cx-r*.6,cy+r*.35]],'#56483b');
   line(c,[[cx-r*.7,cy-r*.15],[cx-r*.2,cy+13],[cx+r*.2,cy-12],[cx+r*.6,cy+r*.2]],'#2f2824',3);
  }
 }else if(theme==='ruin'&&['entry','hall','stash'].includes(a.kind)){
  // A broken roof admits a small, still patch of daylight, not a full-screen glow.
  polygon(c,[[a.x+20,a.y+10],[a.x+84,a.y+10],[a.x+150,a.y+Math.min(160,a.h*.55)],[a.x+76,a.y+Math.min(190,a.h*.65)]],'rgba(209,203,145,.09)');
 }
 if(a.kind==='stash'){
  c.strokeStyle=theme==='dragon'?'#76604b':'#8d8265';c.lineWidth=2;c.strokeRect(cx-42,cy-35,84,70);
  for(const side of [-1,1])line(c,[[cx+side*48,cy-30],[cx+side*48,cy+30]],'#575147',1);
 }
}

function drawBoundary(c,e,theme,s,v,detail) {
 const from=Math.max(e.start,e.horizontal?v.left-40:v.top-64),to=Math.min(e.end,e.horizontal?v.right+40:v.bottom+64);
 if(to<=from)return;
 const k=e.fixed,len=to-from;
 if(e.horizontal){
  const north=e.side==='north',outer=north?k-27:k;
  c.fillStyle=s.shade;c.fillRect(from,north?k:k-6,len,8);
  c.fillStyle=s.wall;c.fillRect(from,outer,len,24);
  c.fillStyle=s.cap;c.fillRect(from,north?outer:k,len,5);
  c.fillStyle=s.edge;c.fillRect(from,north?k-2:k+2,len,2);
  if(detail)for(let x=Math.floor(from/48)*48;x<to;x+=48){line(c,[[x,outer+6],[x+3,outer+23]],s.shade,1);line(c,[[x+4,outer+12],[Math.min(x+43,to),outer+12]],s.shade,1);}
 }else{
  const west=e.side==='west',outer=west?k-24:k;
  c.fillStyle=s.shade;c.fillRect(west?k:k-6,from,7,len);
  c.fillStyle=s.wall;c.fillRect(outer,from,24,len);
  c.fillStyle=s.cap;c.fillRect(west?outer:k,from,5,len);
  c.fillStyle=s.edge;c.fillRect(west?k-2:k+2,from,2,len);
  if(detail)for(let y=Math.floor(from/48)*48;y<to;y+=48)line(c,[[outer+6,y],[outer+22,y+2]],s.shade,1);
 }
 if(theme==='mines'&&detail){
  // Tool scars and fractured rock make the excavation distinct from masonry.
  for(let n=Math.floor(from/76)*76;n<to;n+=76){
   const sign=e.side==='north'||e.side==='west'?-1:1;
   if(e.horizontal){
    line(c,[[n+7,k+sign*6],[n+19,k+sign*19],[n+34,k+sign*8]],'#8a7654',2);
    line(c,[[n+37,k+sign*5],[n+45,k+sign*14],[n+61,k+sign*10]],'#24271f',2);
   }else{
    line(c,[[k+sign*6,n+7],[k+sign*19,n+19],[k+sign*8,n+34]],'#8a7654',2);
    line(c,[[k+sign*5,n+37],[k+sign*14,n+45],[k+sign*10,n+61]],'#24271f',2);
   }
  }
 }else if(theme==='dragon'){
  for(let n=Math.floor(from/55)*55;n<to;n+=55){
   const t=hash(Math.round(k),Math.round(n)),out=9+t*11,sign=e.side==='north'||e.side==='west'?-1:1;
   if(e.horizontal){polygon(c,[[n,k],[n+18,k+sign*out],[n+44,k+sign*7],[n+51,k]],s.cap);if(t>.32)line(c,[[n+6,k+sign*16],[n+28,k+sign*23],[n+48,k+sign*17]],'#b26239',4);}
   else{polygon(c,[[k,n],[k+sign*out,n+18],[k+sign*7,n+44],[k,n+51]],s.cap);if(t>.32)line(c,[[k+sign*16,n+6],[k+sign*23,n+28],[k+sign*17,n+48]],'#b26239',4);}
  }
 }else if(theme==='ruin'){
  for(let n=Math.floor(from/86)*86;n<to;n+=86){
   const broken=hash(Math.round(k),Math.round(n))>.48,sign=e.side==='north'||e.side==='west'?-1:1;
   if(e.horizontal){c.fillStyle=broken?s.void:'#647052';c.fillRect(n+9,k+sign*10,broken?24:16,broken?8:5);}
   else{c.fillStyle=broken?s.void:'#647052';c.fillRect(k+sign*10,n+9,broken?8:5,broken?24:16);}
  }
 }
}

function fire(c,x,y,time,seed,color='#d0a36b') {
 const lean=Math.sin(time*3+seed*19)*1.3;
 polygon(c,[[x-4,y],[x-3,y-7],[x+lean,y-13],[x+4,y-5],[x+3,y]],color);
 polygon(c,[[x-1,y-1],[x+lean*.4,y-8],[x+2,y-2]],'#e6d3a3');
}
function column(c,x,y,{broken=false,dark=false}={}) {
 ellipse(c,x+3,y+4,19,6,'rgba(0,0,0,.28)');
 const h=broken?28:60;
 polygon(c,[[x-12,y],[x-10,y-h],[x+8,y-h],[x+12,y]],dark?'#606a76':'#8b8977','#303837',1);
 c.fillStyle=dark?'#8993a0':'#b9b59a';c.fillRect(x-13,y-h-4,26,7);c.fillRect(x-15,y-1,30,6);
 line(c,[[x-4,y-h+8],[x-5,y-6]],dark?'#424a58':'#666b5a',2);
 if(broken)polygon(c,[[x-12,y-h],[x-8,y-h-8],[x-2,y-h-3],[x+3,y-h-9],[x+10,y-h]],'#9b9a82');
}
function drawProp(c,p,theme,time,detail) {
 const {x,y,type}=p,n=p.seed||0;
 switch(type){
  case 'timber':
   ellipse(c,x+2,y+3,17,5,'rgba(0,0,0,.3)');
   c.fillStyle='#6e5234';c.fillRect(x-17,y-52,10,55);c.fillRect(x+9,y-49,8,52);c.fillRect(x-21,y-56,43,10);
   line(c,[[x-13,y-46],[x-11,y-2]],'#a28353',2);line(c,[[x+13,y-43],[x+12,y-5]],'#443826',2);
   line(c,[[x-18,y-38],[x-3,y-52],[x+16,y-34]],'#8e7147',4);
   if(detail){c.fillStyle='#312f27';c.fillRect(x-4,y-33,9,13);c.fillStyle='#cbb17a';c.fillRect(x-2,y-30,5,7);}
   break;
  case 'cart':
   ellipse(c,x+5,y+8,30,10,'rgba(0,0,0,.27)');
   for(const side of [-1,1]){ellipse(c,x+side*23,y+5,6,8,'#242820');ellipse(c,x+side*23,y+5,2,3,'#827a60');}
   polygon(c,[[x-25,y-8],[x+24,y-8],[x+19,y+8],[x-20,y+8]],'#775a3d','#292c24',2);
   polygon(c,[[x-22,y-13],[x-5,y-27],[x+18,y-24],[x+25,y-10]],'#85836b');
   line(c,[[x-20,y-5],[x+19,y-5]],'#b39463',2);line(c,[[x+20,y+1],[x+38,y+11]],'#826642',3);
   if(detail)polygon(c,[[x-5,y-23],[x+2,y-27],[x+8,y-21],[x+1,y-17]],'#b4a479');
   break;
  case 'ore':
   ellipse(c,x,y+4,27,8,'rgba(0,0,0,.22)');
   polygon(c,[[x-25,y+2],[x-18,y-19],[x-5,y-27],[x+21,y-18],[x+26,y+3]],'#736d55','#34382c',1.5);
   for(const [dx,dy] of [[-11,-13],[3,-17],[13,-8]])polygon(c,[[x+dx,y+dy],[x+dx+4,y+dy-9],[x+dx+10,y+dy-3],[x+dx+7,y+dy+4]],'#b39a59');
   break;
  case 'niche':
   c.fillStyle='#171e23';c.fillRect(x-16,y-43,32,44);
   c.strokeStyle='#77807a';c.lineWidth=5;c.beginPath();c.moveTo(x-17,y);c.lineTo(x-17,y-31);c.quadraticCurveTo(x,y-55,x+17,y-31);c.lineTo(x+17,y);c.stroke();
   ellipse(c,x,y-17,7,9,'#8e8f7a');c.fillStyle='#444c49';c.fillRect(x-5,y-19,2,2);c.fillRect(x+2,y-19,2,2);
   line(c,[[x-12,y+1],[x+12,y+1]],'#929382',3);
   break;
  case 'candle':
   column(c,x,y,{broken:true});c.fillStyle='#303b3e';c.fillRect(x-14,y-31,28,6);
   for(const dx of [-9,0,9]){c.fillStyle='#c4c0a2';c.fillRect(x+dx-2,y-41,4,11);fire(c,x+dx,y-41,time,n,'#b8c3b1');}
   break;
  case 'sarcophagus':
   ellipse(c,x+4,y+6,29,11,'rgba(0,0,0,.25)');
   polygon(c,[[x-18,y-34],[x+15,y-34],[x+22,y+6],[x-22,y+6]],'#656f6d','#263238',2);
   polygon(c,[[x-14,y-37],[x+12,y-37],[x+18,y-3],[x-18,y-3]],'#929784','#c1bda0',1);
   ellipse(c,x,y-27,4,5,'#6c786f');line(c,[[x,y-21],[x,y-9]],'#6c786f',3);line(c,[[x-6,y-18],[x+6,y-18]],'#6c786f',2);
   break;
  case 'urn':
   ellipse(c,x+3,y+3,14,5,'rgba(0,0,0,.25)');ellipse(c,x,y-12,11,15,'#83816b');
   c.fillStyle='#b1ac88';c.fillRect(x-8,y-27,16,6);ellipse(c,x,y-29,8,3,'#444e45');line(c,[[x-6,y-9],[x+6,y-9]],'#c4bd98',2);
   break;
  case 'basalt':case 'ledge':case 'rock':
   ellipse(c,x+5,y+4,31,9,'rgba(0,0,0,.28)');
   polygon(c,[[x-29,y+3],[x-22,y-24],[x-5,y-42],[x+17,y-34],[x+31,y+1]],type==='ledge'?'#716052':'#5e4f45','#2f2825',1.5);
   polygon(c,[[x-22,y-24],[x-5,y-42],[x+6,y-17],[x-12,y-10]],'#96765b');
   line(c,[[x+4,y-29],[x+12,y-13],[x+25,y-3]],'#3e302b',2);
   if(type==='basalt')line(c,[[x-20,y],[x-13,y-12],[x-1,y-5],[x+8,y-16]],'#b37043',2);
   break;
  case 'bones':
   ellipse(c,x+1,y+6,40,9,'rgba(0,0,0,.24)');line(c,[[x-35,y-5],[x-17,y-8],[x+6,y-2],[x+30,y+2]],'#beb399',5);
   for(let i=0;i<5;i++){const bx=x-22+i*10;c.strokeStyle='#cfc3a5';c.lineWidth=3;c.beginPath();c.moveTo(bx,y-5);c.quadraticCurveTo(bx-12,y-24,bx-17,y-12);c.moveTo(bx,y-5);c.quadraticCurveTo(bx-6,y+13,bx-15,y+11);c.stroke();}
   polygon(c,[[x+21,y-10],[x+42,y-7],[x+49,y+5],[x+28,y+13],[x+21,y+5]],'#d5c7a7','#756957',1);ellipse(c,x+35,y-1,4,3,'#453c31');
   break;
  case 'column':column(c,x,y,{dark:true});break;
  case 'banner':
   line(c,[[x-24,y-55],[x+24,y-55]],'#a29573',4);polygon(c,[[x-20,y-53],[x+20,y-53],[x+20,y-8],[x,y+2],[x-20,y-8]],'#773f4b','#393446',1.5);
   polygon(c,[[x,y-46],[x+11,y-27],[x,y-16],[x-11,y-27]],'#b8a073');polygon(c,[[x,y-38],[x+5,y-27],[x,y-22],[x-5,y-27]],'#393747');
   break;
  case 'obelisk':
   ellipse(c,x+2,y+5,22,7,'rgba(0,0,0,.3)');polygon(c,[[x-13,y],[x-9,y-42],[x,y-58],[x+10,y-43],[x+14,y]],'#566172','#222b38',1.5);
   polygon(c,[[x,y-58],[x+10,y-43],[x+14,y],[x,y-3]],'#303c4d');line(c,[[x-5,y-35],[x-4,y-14]],'#b19b69',1.5);
   break;
  case 'offering':
   c.fillStyle='#293340';c.fillRect(x-23,y-13,46,21);c.fillStyle='#7c8390';c.fillRect(x-26,y-20,52,9);line(c,[[x-16,y-10],[x+16,y-10]],'#b7a575',2);
   ellipse(c,x,y-24,13,4,'#b59c6e');fire(c,x,y-25,time,n,'#c5a37c');
   break;
  case 'broken-column':column(c,x,y,{broken:true});break;
  case 'fallen-column':
   ellipse(c,x+5,y+7,39,9,'rgba(0,0,0,.24)');c.save();c.translate(x,y);c.rotate(-.35);
   c.fillStyle='#8f927b';c.fillRect(-34,-10,68,20);c.fillStyle='#b8b69a';c.fillRect(-39,-14,10,28);c.fillRect(29,-13,9,26);line(c,[[-26,-3],[26,-3]],'#666f5b',2);c.restore();
   break;
  case 'vine':
   line(c,[[x,y-50],[x-7,y-34],[x+2,y-20],[x-5,y+3]],'#61724b',3);
   for(let i=0;i<5;i++){const yy=y-43+i*10,side=i%2?1:-1;polygon(c,[[x,yy],[x+side*14,yy-8],[x+side*12,yy+4]],i%2?'#829162':'#586b49');}
   break;
  default:
   ellipse(c,x+4,y+4,30,7,'rgba(0,0,0,.18)');
   for(let i=0;i<4;i++){const dx=-23+i*14,dy=(i%2)*6;polygon(c,[[x+dx,y+dy],[x+dx+3,y+dy-13],[x+dx+15,y+dy-10],[x+dx+18,y+dy+2]],i%2?'#96967d':'#737b65');}
   if(detail)line(c,[[x-18,y-2],[x-9,y-9]],'#bbc0a0',1);
 }
}

/** Caller has already applied camera/zoom to ctx. Render only the current viewport. */
export function drawExplorationInterior(ctx,dungeon,layout,camera,viewW,viewH,zoom=1,time=0) {
 if(!ctx||!layout||!camera||dungeon?.kind==='town')return false;
 const theme=dungeon?.kind==='ruin'?'ruin':SCENES[layout.theme]?layout.theme:SCENES[dungeon?.theme]?dungeon.theme:'catacombs';
 const s=SCENES[theme],g=geometryFor(layout,theme),z=Number.isFinite(zoom)&&zoom>0?zoom:1;
 const v={left:camera.x-viewW/(2*z)-80,right:camera.x+viewW/(2*z)+80,top:camera.y-viewH/(2*z)-90,bottom:camera.y+viewH/(2*z)+90};
 const detail=z>=.75;
 ctx.save();
 try{
  ctx.fillStyle=s.void;ctx.fillRect(v.left,v.top,v.right-v.left,v.bottom-v.top);
  const x0=Math.max(0,Math.floor(v.left/GRID)),x1=Math.min(Math.ceil(layout.width/GRID),Math.ceil(v.right/GRID));
  const y0=Math.max(0,Math.floor(v.top/GRID)),y1=Math.min(Math.ceil(layout.height/GRID),Math.ceil(v.bottom/GRID));
  ctx.fillStyle=s.floor;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(g.cells.has(key(x,y)))ctx.fillRect(x*GRID,y*GRID,GRID,GRID);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(g.cells.has(key(x,y)))floorCell(ctx,x*GRID,y*GRID,theme,s,detail);
  // One union clip prevents rails, banners' floor motifs or shafts crossing walls.
  ctx.save();ctx.beginPath();
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(g.cells.has(key(x,y)))ctx.rect(x*GRID,y*GRID,GRID,GRID);
  ctx.clip();
  for(const a of g.areas)if(rectInView(a.x,a.y,a.w,a.h,v))drawRoomFloor(ctx,a,theme,v);
  ctx.restore();
  for(const e of g.edges){const x=e.horizontal?e.start:e.fixed-32,y=e.horizontal?e.fixed-32:e.start,w=e.horizontal?e.end-e.start:64,h=e.horizontal?64:e.end-e.start;if(rectInView(x,y,w,h,v))drawBoundary(ctx,e,theme,s,v,detail);}
  for(const p of g.props)if(rectInView(p.x-54,p.y-76,108,98,v))drawProp(ctx,p,theme,time,detail);
 }finally{ctx.restore();}
 return true;
}
