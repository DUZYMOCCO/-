// Fixed, asymmetric shorelines. No gameplay RNG, saved state, or pixel cache.
const TAU=Math.PI*2;
export const POND_PATTERNS=['細長い池','入り江','二つのふくらみ','岩岸','湿地の水たまり'];
export const HAZARD_PATTERNS=['裂け目','枝分かれ','染み','崩れた地面'];
const PONDS=[
  [[-.96,-.15],[-.65,-.53],[-.12,-.6],[.42,-.38],[.95,-.05],[.72,.3],[.18,.5],[-.45,.34],[-.84,.18]],
  [[-.9,-.25],[-.65,-.75],[-.08,-.86],[.3,-.6],[.05,-.18],[.47,-.05],[.88,-.35],[.94,.18],[.58,.69],[-.04,.88],[-.62,.57]],
  [[-.94,-.12],[-.68,-.67],[-.22,-.67],[.03,-.28],[.49,-.65],[.88,-.19],[.58,.29],[.7,.67],[.14,.86],[-.25,.48],[-.71,.61]],
  [[-.92,-.23],[-.62,-.66],[-.17,-.85],[.22,-.61],[.7,-.69],[.92,-.21],[.66,.07],[.77,.46],[.29,.79],[-.21,.58],[-.57,.72],[-.87,.28]],
  [[-.85,-.3],[-.38,-.64],[.17,-.48],[.75,-.65],[.6,-.1],[.94,.28],[.24,.46],[-.22,.85],[-.76,.61],[-.52,.13]]
];
const HAZARDS=[
  [[-.96,-.1],[-.61,-.34],[-.24,-.26],[.13,-.57],[.69,-.58],[.95,-.25],[.42,-.04],[.22,.32],[-.32,.43],[-.62,.2]],
  [[-.85,-.36],[-.4,-.45],[-.09,-.16],[.27,-.73],[.53,-.73],[.42,-.14],[.91,.15],[.76,.4],[.25,.23],[.04,.88],[-.25,.69],[-.2,.12],[-.78,.03]],
  [[-.9,-.15],[-.58,-.67],[-.08,-.79],[.22,-.39],[.69,-.52],[.94,-.06],[.57,.32],[.62,.69],[.09,.91],[-.33,.49],[-.75,.56]],
  [[-.95,-.18],[-.61,-.52],[-.3,-.78],[.04,-.6],[.36,-.84],[.78,-.48],[.62,-.08],[.96,.19],[.54,.5],[.19,.84],[-.17,.6],[-.58,.72],[-.8,.31]]
];
export function terrainSeed(x,y) {
  let h=Math.imul(Math.round(x)+43,73856093)^Math.imul(Math.round(y)+71,19349663);
  h=Math.imul(h^(h>>>16),2246822519);return (h^(h>>>13))>>>0;
}
function smooth(points,steps) {
  const result=[],n=points.length;
  for(let i=0;i<n;i++)for(let j=0;j<steps;j++){
    const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],d=points[(i+2)%n],t=j/steps,t2=t*t,t3=t2*t;
    const p=[0,1].map(k=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3));
    const r=Math.hypot(...p);if(r>1){p[0]/=r;p[1]/=r;}result.push(p);
  }
  return result;
}
const pondContours=PONDS.map((p,i)=>smooth(p,i===3?2:5));
const hazardContours=HAZARDS.map((p,i)=>smooth(p,i===2?4:2));
function transform(points,x,y,rx,ry,angle) {
  const co=Math.cos(angle),si=Math.sin(angle);
  return points.map(([px,py])=>[x+(px*co-py*si)*rx,y+(px*si+py*co)*ry]);
}
export function pondContour(x,y,variant=terrainSeed(x,y)%PONDS.length) {
  const seed=terrainSeed(x,y),angle=((seed>>>8)%16)*TAU/16;
  return transform(pondContours[variant%PONDS.length],x,y,78,46,angle);
}
export function traceContour(c,points) {
  c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.closePath();
}
export function containsContour(points,x,y) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[j],[bx,by]=points[i];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
export function drawNaturalPond(c,x,y,seed,variant=seed%PONDS.length) {
  const points=transform(pondContours[variant],x,y,78,46,((seed>>>8)%16)*TAU/16);
  c.save();c.lineJoin='round';traceContour(c,points);
  // A narrow, broken soil bank instead of a thick rim around a basin.
  c.strokeStyle='#27362a';c.lineWidth=9;c.stroke();
  const water=c.createLinearGradient(x-30,y-45,x+25,y+40);
  water.addColorStop(0,'#416567');water.addColorStop(.48,'#345656');water.addColorStop(1,'#203b3d');c.fillStyle=water;c.fill();
  c.save();c.clip();c.lineWidth=.8;
  for(let i=0;i<15;i++){
    const h=terrainSeed(seed,i),px=x-68+(h%137),py=y-39+((h>>>9)%78);
    c.strokeStyle=i%3?'#73918a38':'#a0ada348';c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+7,py+2,px+15+(h%15),py);c.stroke();
  }
  const depth=c.createRadialGradient(x+9,y+10,0,x+9,y+10,54);
  depth.addColorStop(0,'#142f3650');depth.addColorStop(1,'#142f3600');c.fillStyle=depth;c.fillRect(x-80,y-50,160,100);c.restore();
  // Soil shows only along parts of the bank; grass breaks up the outline.
  c.strokeStyle='#7c7e5865';c.lineWidth=2.5;
  for(let i=0;i<points.length;i+=7){c.beginPath();c.moveTo(...points[i]);c.lineTo(...points[(i+1)%points.length]);c.lineTo(...points[(i+2)%points.length]);c.stroke();}
  for(let i=0;i<18;i++){
    const h=terrainSeed(seed,i+80),p=points[h%points.length],dx=p[0]-x,dy=p[1]-y;
    const px=p[0]+dx*.05,py=p[1]+dy*.05;
    if(i%3===0){
      c.fillStyle=i%2?'#74786b':'#525e53';c.beginPath();c.moveTo(px-4,py+2);c.lineTo(px-2,py-3);c.lineTo(px+3,py-2);c.lineTo(px+5,py+2);c.closePath();c.fill();
      c.strokeStyle='#a0a28a70';c.lineWidth=.7;c.beginPath();c.moveTo(px-2,py-3);c.lineTo(px+3,py-2);c.stroke();
    }else{
      c.strokeStyle=i%2?'#78835b':'#526d45';c.lineWidth=.9;c.beginPath();c.moveTo(px,py+1);c.lineTo(px-2,py-5-(h%6));c.moveTo(px+1,py+1);c.lineTo(px+3,py-4);c.stroke();
    }
  }
  c.restore();return points;
}
// Bounded geometry cache only: at most 96 small arrays, no canvases.
const hazardCache=new Map(),HAZARD_CACHE_LIMIT=96;
export function hazardContour(f) {
  const seed=terrainSeed(f.x,f.y),variant=seed%HAZARDS.length,key=`${f.x},${f.y},${f.radius}`;
  let points=hazardCache.get(key);
  if(!points){
    points=transform(hazardContours[variant],f.x,f.y,f.radius,f.radius,((seed>>>8)%24)*TAU/24);
    if(hazardCache.size>=HAZARD_CACHE_LIMIT)hazardCache.delete(hazardCache.keys().next().value);
    hazardCache.set(key,points);
  }
  return points;
}
export function insideHazard(f,u) {
  if(Math.hypot(u.x-f.x,u.y-f.y)>f.radius)return false;
  return containsContour(hazardContour(f),u.x,u.y);
}
