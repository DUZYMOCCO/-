// Shared deterministic geometry: worker paint, collision and shallow-water movement.
// Every 1024px cell has open edges and a cross through its centre. Solid islands
// are disjoint convex ellipses; they cannot enclose a walkable pocket.
const C=79360, CELL=1024, TAU=Math.PI*2;
export function terrainHash(x,y){let n=Math.imul(x+31,73856093)^Math.imul(y+17,19349663);n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967296;}
export function biomeKeyAt(x,y){
 const dx=x-C,dy=y-C,d=Math.hypot(dx,dy);if(d<3200)return 'home';
 // Stable small patches mix the adjacent regions over a 700px boundary.
 const jitter=(terrainHash(Math.floor(x/96),Math.floor(y/96))-.5)*700;
 return Math.abs(dx)-Math.abs(dy)>jitter?(dx>0?'east':'west'):(dy>0?'south':'north');
}
const cache=new Map();
export function terrainCell(ix,iy,allowed=()=>true){
 const key=`${ix},${iy}`;if(cache.has(key))return cache.get(key);
 const x=ix*CELL+CELL/2,y=iy*CELL+CELL/2,h=terrainHash(ix,iy),kind=biomeKeyAt(x,y);
 const features=[];
 if(Math.hypot(x-C,y-C)>3900&&allowed(x,y,450)){
  if(kind==='north')for(const side of [-1,1])for(const row of [-1,1])features.push({kind:'ridge',x:x+side*218,y:y+row*152,rx:112,ry:102,solid:true,h});
  if(kind==='west')features.push({kind:'water',x,y,rx:346,ry:232,ford:42,h});
  if(kind==='south')features.push({kind:'saltbed',x,y,rx:354,ry:78,h});
  if(kind==='east'&&h<.7)features.push({kind:'hill',x,y,rx:220,ry:138,h});
 }
 cache.set(key,features);if(cache.size>256)cache.delete(cache.keys().next().value);return features;
}
export function terrainFeaturesAt(x,y,allowed){return terrainCell(Math.floor(x/CELL),Math.floor(y/CELL),allowed);}
export function naturalTerrainAt(x,y,allowed){
 for(const f of terrainFeaturesAt(x,y,allowed)){
  const nx=(x-f.x)/f.rx,ny=(y-f.y)/f.ry;
  if(nx*nx+ny*ny<1){if(f.solid)return 'rock';if(f.kind==='water'&&Math.abs(y-f.y)>f.ford)return 'water';}
 }
 return 'open';
}
const oval=(c,x,y,rx,ry,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
export function paintBiomeTerrain(c,x0,y0,allowed){
 c.save();c.translate(-x0,-y0);
 for(let iy=Math.floor((y0-400)/CELL);iy<=Math.floor((y0+912)/CELL);iy++)for(let ix=Math.floor((x0-400)/CELL);ix<=Math.floor((x0+912)/CELL);ix++)for(const f of terrainCell(ix,iy,allowed)){
  if(f.x+f.rx<x0||f.x-f.rx>x0+512||f.y+f.ry<y0||f.y-f.ry>y0+512)continue;
  if(f.kind==='ridge'){
   oval(c,f.x+6,f.y+10,f.rx+9,f.ry+8,'#0c151a80');
   const g=c.createLinearGradient(f.x-f.rx,f.y,f.x+f.rx,f.y);g.addColorStop(0,'#7a8586');g.addColorStop(.35,'#56666b');g.addColorStop(1,'#293a42');
   oval(c,f.x,f.y,f.rx,f.ry,g);
   c.strokeStyle='#a2aaa0';c.lineWidth=3;c.beginPath();c.ellipse(f.x-12,f.y-8,f.rx-25,f.ry-22,0,Math.PI*.63,Math.PI*1.43);c.stroke();
   for(let i=0;i<4;i++){const yy=f.y-66+i*44,xx=f.x+Math.sin(i*2.3+f.h)*24;oval(c,xx,yy,42,27,'#87928a55');c.strokeStyle='#263840';c.lineWidth=3;c.beginPath();c.moveTo(xx-30,yy+15);c.quadraticCurveTo(xx,yy+24,xx+40,yy+6);c.stroke();}
  }else if(f.kind==='water'){
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
 c.restore();
}
