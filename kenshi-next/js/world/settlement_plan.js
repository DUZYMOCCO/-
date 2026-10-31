import { WORLD_LAYOUT } from '../data/world_layout.js';

export const SETTLEMENTS = [...WORLD_LAYOUT.towns, ...WORLD_LAYOUT.banditBases];
export function peopleActive(active, distance) { return active ? distance <= 900 : distance < 600; }
export function nearestSettlement(x, z) {
  let best = null;
  for (const p of SETTLEMENTS) {
    const dist = Math.hypot(x - p.x, z - p.z);
    if (!best || dist < best.dist) best = { id: p.id, name: p.name, sizeJa: ({ village:'村', town:'町', city:'都', camp:'野営地', fort:'砦' })[p.size], ownerName: p.ownerName || WORLD_LAYOUT.factions[p.owner]?.name || p.owner, dist };
  }
  return best;
}
function hash(s) { let h=2166136261; for (const c of s) h=Math.imul(h ^ c.charCodeAt(0),16777619); return h>>>0; }
function gateDirection(p) {
  let best=null, bd=Infinity;
  for(const road of WORLD_LAYOUT.roads) for(const q of road.points) {
    const dx=q[0]-p.x, dz=q[1]-p.z, d=Math.hypot(dx,dz);
    if(d>1 && d<bd) { bd=d; best={x:dx/d,z:dz/d}; }
  }
  if(!best) best={x:0,z:1};
  return Math.abs(best.x)>Math.abs(best.z) ? {x:Math.sign(best.x),z:0} : {x:0,z:Math.sign(best.z)};
}
export function planSettlement(p) {
  const gate=gateDirection(p), buildings=[];
  if(p.id==='koba_town') return { id:p.id, gate, buildings, skipped:true };
  const base=p.size==='camp'||p.size==='fort', city=p.size==='city', town=p.size==='town';
  const count=city?16:town?8:p.size==='fort'?6:base?3:4;
  const radius=p.radius;
  const add=(kind,x,z,w,d,h,color,rotY=0)=>buildings.push({kind,x:p.x+x,z:p.z+z,w,d,h,rotY,color});
  // Rings reserve the centre for a plaza and leave a radial approach to the gate.
  const slots=[], w=city?8:town?7:base?5:6, d=w, edge=radius*.64;
  const step=city?13:town?12:base?8:10;
  for(let z=-radius;z<=radius;z+=step) for(let x=-radius;x<=radius;x+=step) {
    if(Math.hypot(x,z)<step*.8 || Math.hypot(x,z)>radius*.57) continue;
    if(Math.abs(x)+w/2>edge-1.5 || Math.abs(z)+d/2>edge-1.5) continue;
    if((x*gate.x+z*gate.z)>0 && Math.abs(x*gate.z-z*gate.x)<step*.65) continue;
    slots.push({x,z,score:hash(p.id+':'+x+':'+z)});
  }
  slots.sort((a,b)=>a.score-b.score);
  if(city||town) {
    const hall=slots.shift(), hw=city?w*1.6:w, hd=city?d*1.4:d;
    if(hall) { add('hall',hall.x,hall.z,hw,hd,city?7:5,'#b4a791');
      for(let i=slots.length-1;i>=0;i--) if(Math.abs(slots[i].x-hall.x)<(w+hw)/2+1 && Math.abs(slots[i].z-hall.z)<(d+hd)/2+1) slots.splice(i,1);
    }
  }
  for(let i=0;i<Math.min(count,slots.length);i++) add(base?(i%2?'tent':'shack'):(i===0?'shop':'house'),slots[i].x,slots[i].z,w,d,base?3:4,'#aa9981');

  if(p.watch||p.size==='fort'||city) { const s=slots[count]; if(s) add('tower',s.x,s.z,w*.55,d*.55,12,'#948579'); }
  const wallType=base?(p.size==='fort'?'palisade':'fence'):p.walls;
  if(wallType && wallType!=='none') {
    const n=8, length=edge*2/n, thick=wallType==='stone'?2:0.7, h=wallType==='stone'?5:wallType==='palisade'?3:1.3;
    for(let side=0;side<4;side++) for(let i=0;i<n;i++) {
      let along=-edge+(i+.5)*length; const sx=side===0?1:side===1?-1:0, sz=side===2?1:side===3?-1:0;
      if(sx===gate.x && sz===gate.z && (i===3||i===4)) continue;
      const trim=(i===0||i===n-1)?thick/2+.2:0;
      along += i===0?trim/2:i===n-1?-trim/2:0;
      const x=sx?edge*sx:along, z=sz?edge*sz:along;
      add('wall',x,z,sx?thick:length-.25-trim,sz?thick:length-.25-trim,h,wallType==='stone'?'#85827d':'#795c40');
    }
  }
  return {id:p.id,gate,buildings,skipped:false};
}
export const SETTLEMENT_PLANS = SETTLEMENTS.map(planSettlement);
