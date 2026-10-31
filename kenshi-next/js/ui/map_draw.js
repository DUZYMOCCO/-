import { WORLD_LAYOUT as world } from '../data/world_layout.js';
import { GIANTS, LAKE } from '../render/giants_plan.js';
export const clampZoom = n => Math.max(500, Math.min(30000, n));
export function worldToMap(x, z, view) { const s = view.width / view.span; return { x: view.width / 2 + (x - view.x) * s, y: view.height / 2 + (z - view.z) * s }; }
export function mapToWorld(x, y, view) { const s = view.span / view.width; return { x: view.x + (x - view.width / 2) * s, z: view.z + (y - view.height / 2) * s }; }
export function layers() { return { towns: world.towns, bases: world.banditBases, giants: GIANTS, lake: LAKE, roads: world.roads, regions: world.regions }; }
export function cellAt(x,z) { return [Math.floor(x/world.cellM+world.originCell[0]),Math.floor(z/world.cellM+world.originCell[1])]; }
export function explored(mask,x,z) { const [i,j]=cellAt(x,z); return i>=0 && j>=0 && i<64 && j<64 && !!mask[j*64+i]; }
export function reveal(mask,x,z,radius=1500) { let changed=false; for(let j=0;j<64;j++) for(let i=0;i<64;i++) { const cx=(i+.5-world.originCell[0])*world.cellM, cz=(j+.5-world.originCell[1])*world.cellM; if(Math.hypot(cx-x,cz-z)<=radius && !mask[j*64+i]) { mask[j*64+i]=1; changed=true; } } return changed; }
export function hitTest(x,y,view,mask) { let best=null, dist=18; for(const place of [...world.towns,...world.banditBases]) { if(mask && !explored(mask,place.x,place.z)) continue; const p=worldToMap(place.x,place.z,view), d=Math.hypot(x-p.x,y-p.y); if(d<dist){best=place;dist=d;} } return best; }
export function drawMap(ctx,view,mask,player,squad=[]) {
 const {width:w,height:h}=view, s=w/view.span, grid=world.regionGrid;
 ctx.fillStyle='#302a25'; ctx.fillRect(0,0,w,h); ctx.font='11px sans-serif'; ctx.textAlign='center';
 const pt=(x,z)=>worldToMap(x,z,view);
 for(let j=0;j<64;j++) for(let i=0;i<64;i++) { const x=(i-world.originCell[0])*world.cellM,z=(j-world.originCell[1])*world.cellM,p=pt(x,z),size=world.cellM*s; if(p.x+size<0||p.y+size<0||p.x>w||p.y>h) continue; const r=world.regions[grid[j].charCodeAt(i)-65]; ctx.fillStyle=r?.ownerColor||'#665a49'; ctx.globalAlpha=.35; ctx.fillRect(p.x,p.y,size+1,size+1); ctx.globalAlpha=1; if(!mask[j*64+i]) {ctx.fillStyle='rgba(8,9,12,.72)';ctx.fillRect(p.x,p.y,size+1,size+1);} ctx.strokeStyle='rgba(220,202,164,.32)';ctx.lineWidth=.7;ctx.beginPath();if(i<63&&grid[j][i]!==grid[j][i+1]){ctx.moveTo(p.x+size,p.y);ctx.lineTo(p.x+size,p.y+size);}if(j<63&&grid[j][i]!==grid[j+1][i]){ctx.moveTo(p.x,p.y+size);ctx.lineTo(p.x+size,p.y+size);}ctx.stroke(); }
 ctx.strokeStyle='rgba(229,207,164,.55)';ctx.lineWidth=1; for(const road of world.roads){ctx.beginPath();road.points.forEach(([x,z],i)=>{const p=pt(x,z);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();}
 const occupied=[];ctx.fillStyle='#e5d9b8'; for(const r of world.regions){const p=pt(...r.centre); if(p.x<0||p.y<0||p.x>w||p.y>h||occupied.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<75))continue;occupied.push(p);ctx.fillText(r.name,p.x,p.y);}
 let lake=pt(LAKE.x,LAKE.z);ctx.fillStyle='#507e8d';ctx.beginPath();ctx.arc(lake.x,lake.y,Math.max(3,LAKE.radius*s),0,Math.PI*2);ctx.fill();
 for(const g of GIANTS){const p=pt(g.x,g.z);ctx.fillStyle='#a9d6db';ctx.font='bold 13px sans-serif';ctx.fillText({colossus:'◆',dome:'◒',tower:'▲',skeleton:'✣',city:'✦'}[g.id],p.x,p.y);}
 for(const town of world.towns){if(!explored(mask,town.x,town.z))continue;const p=pt(town.x,town.z), n=town.size==='city'?10:town.size==='town'?8:6;ctx.fillStyle=town.color||'#eee';ctx.fillRect(p.x-n/2,p.y-n/2,n,n);ctx.strokeStyle='#16130f';ctx.strokeRect(p.x-n/2,p.y-n/2,n,n);ctx.font='11px sans-serif';ctx.fillStyle='#fff1d2';ctx.fillText((town.start?'★ ':'')+town.name,p.x,p.y-8);}
 for(const base of world.banditBases){if(!explored(mask,base.x,base.z))continue;const p=pt(base.x,base.z);ctx.fillStyle='#b9604c';ctx.beginPath();ctx.moveTo(p.x,p.y-5);ctx.lineTo(p.x-5,p.y+4);ctx.lineTo(p.x+5,p.y+4);ctx.fill();if(view.span<7000){ctx.fillStyle='#ffe5d4';ctx.fillText(base.name,p.x,p.y-8);}}
 for(const a of squad){const p=pt(a.x,a.z);ctx.fillStyle='#8de8c2';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}
 if(player){const p=pt(player.x,player.z);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-(player.rot||0));ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-6,-6);ctx.lineTo(0,-3);ctx.lineTo(6,-6);ctx.closePath();ctx.fill();ctx.restore();}
}
