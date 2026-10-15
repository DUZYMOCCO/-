import {WORLD_SIZE,SETTLEMENTS,eastWestRoadY,northSouthRoadX,riverCenterY} from './world.js?v=277';

export const MEDICAL_CASTLE_EXCLUSION=32000;
export const MEDICAL_DISCOVERY_RADIUS=650;
export const MEDICAL_RADIUS=150;
export const MEDICAL_INTAKE_RADIUS=72;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CENTER=WORLD_SIZE/2;
/** Posts sit beside the two highways at about 60 / 180 / 400 / 700 m (100 px = 1 m), and out in the
 *  wilds on the four diagonals at about 450 / 700 m, so there is always one to find on the way. */
export const MEDICAL_ROAD_METERS=Object.freeze([60,180,400,700]);
export const MEDICAL_WILD_METERS=Object.freeze([450,700]);
const ROAD_SIDE_OFFSET=240,CLEARANCE=Object.freeze({road:420,river:420,town:520,dungeon:700,outpost:700});
const ROAD_ARMS=Object.freeze([['東',1,0],['南',0,1],['西',-1,0],['北',0,-1]]);
const WILD_ARMS=Object.freeze([['北東',1,-1],['南東',1,1],['南西',-1,1],['北西',-1,-1]]);
const roadPoint=(dx,dy,distance,side)=>dx
  ?{x:CENTER+dx*distance,y:eastWestRoadY(CENTER+dx*distance)+side*ROAD_SIDE_OFFSET}
  :{x:northSouthRoadX(CENTER+dy*distance)+side*ROAD_SIDE_OFFSET,y:CENTER+dy*distance};
function openGround(p,game,beside=false) {
  if(!beside&&Math.min(Math.abs(p.x-northSouthRoadX(p.y)),Math.abs(p.y-eastWestRoadY(p.x)))<CLEARANCE.road)return false;
  if(Math.abs(p.y-riverCenterY(p.x))<CLEARANCE.river)return false;
  if(SETTLEMENTS.some(s=>Math.abs(p.x-CENTER-s.ox)<s.padW/2+CLEARANCE.town&&Math.abs(p.y-CENTER-s.oy)<s.padH/2+CLEARANCE.town))return false;
  if((game.dungeons||[]).some(d=>d.entrance&&distance(p,d.entrance)<CLEARANCE.dungeon))return false;
  return !(game.outposts||[]).some(o=>distance(p,o)<CLEARANCE.outpost);
}
/** Walk outward in rings from the ideal spot until the ground is open. */
function nudgeToOpenGround(p,game) {
  for(const r of [0,500,900,1400,2000,2800])for(let i=0;i<(r?12:1);i++){
    const a=i*Math.PI/6,q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};
    if(q.x>2000&&q.y>2000&&q.x<WORLD_SIZE-2000&&q.y<WORLD_SIZE-2000&&openGround(q,game))return q;
  }
  return p;
}
/** Road posts keep their side of the road and slide along it past a river, town or gate. */
function roadSpot(dx,dy,meters,side,game) {
  for(const slide of [0,600,-600,1200,-1200,1800,-1800]){
    const p=roadPoint(dx,dy,meters*100+slide,side);
    if(openGround(p,game,true))return p;
  }
  return roadPoint(dx,dy,meters*100,side);
}
export function medicalPostLayout(game={}) {
  const castle=(game.dungeons||[]).find(d=>d.id==='dungeon_demon_castle')?.entrance||{x:WORLD_SIZE/2+42000,y:WORLD_SIZE/2+42000};
  const spots=[];
  MEDICAL_ROAD_METERS.forEach((meters,tier)=>{
    ROAD_ARMS.forEach(([label,dx,dy],arm)=>spots.push({key:`road-${label}-${meters}`,meters,...roadSpot(dx,dy,meters,(tier+arm)%2?1:-1,game)}));
    if(meters===400)WILD_ARMS.forEach(([label,dx,dy])=>spots.push({key:`wild-${label}-450`,meters:450,wild:true,dx,dy}));
  });
  WILD_ARMS.forEach(([label,dx,dy])=>spots.push({key:`wild-${label}-700`,meters:700,wild:true,dx,dy}));
  const posts=[];
  for(const spot of spots) {
    const ideal=spot.wild?{x:CENTER+spot.dx*spot.meters*100/Math.SQRT2,y:CENTER+spot.dy*spot.meters*100/Math.SQRT2}:spot;
    const at=spot.wild?nudgeToOpenGround(ideal,game):ideal;
    if(distance(at,castle)<MEDICAL_CASTLE_EXCLUSION)continue;
    posts.push({id:`medical-${spot.key}`,kind:'medical',name:`第${posts.length+1}救護所`,x:Math.round(at.x),y:Math.round(at.y),radius:MEDICAL_RADIUS,intakeRadius:MEDICAL_INTAKE_RADIUS,discovered:false});
  }
  return posts;
}
export function initializeMedicalPosts(game,saved=null) {
  const known=new Set(Array.isArray(saved?.medicalPostIds)?saved.medicalPostIds:[]);
  game.medicalPosts=medicalPostLayout(game);
  for(const p of game.medicalPosts)p.discovered=known.has(p.id)||!!game.fog?.isExploredWorld?.(p.x,p.y);
  game._medicalClock=0;
}
export const serializeMedicalPosts=game=>(game.medicalPosts||[]).filter(p=>p.discovered).map(p=>p.id);
export function updateMedicalPosts(game,dt=0) {
  game._medicalClock=(game._medicalClock||0)+dt;
  if(game._medicalClock<.25)return;
  game._medicalClock=0;
  // Main troops remain in field coordinates during town visits.
  const visitors=[...(!game.currentDungeon?[game.player]:[]),...(game.squad||[]).filter(u=>!game.currentDungeon||(game.currentDungeon.kind==='town'&&!u.isPersonalGuard))].filter(u=>u&&!u.dead&&!u.isDown&&u.hp>0);
  for(const p of game.medicalPosts||[])if(!p.discovered&&visitors.some(u=>distance(u,p)<=MEDICAL_DISCOVERY_RADIUS)){
    p.discovered=true;game.showToast?.(`救護所発見：${p.name} · 搬送で復活・民間人の救出受付`);
  }
}
export function nearestKnownMedicalPost(game,unit=game.player) {
  if(!unit||game.currentDungeon)return null;
  let best=null,range=Infinity;
  for(const p of game.medicalPosts||[])if(p.discovered){const d=distance(unit,p);if(d<range){best=p;range=d;}}
  return best;
}
export function drawMedicalMarker(ctx,x,y,size=4,known=true) {
  ctx.save();ctx.fillStyle=known?'#a7dfcb':'#6e8b82';ctx.fillRect(x-size/3,y-size,size*2/3,size*2);ctx.fillRect(x-size,y-size/3,size*2,size*2/3);ctx.restore();
}
export function drawMedicalPost(ctx,p) {
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='#746e55';ctx.beginPath();ctx.ellipse(0,10,104,72,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#363e35';ctx.fillRect(-69,-41,138,80);
  ctx.fillStyle='#c6c3a3';ctx.fillRect(-65,-45,130,76);
  ctx.strokeStyle='#797e68';ctx.lineWidth=2;ctx.strokeRect(-65,-45,130,76);
  ctx.fillStyle='#869580';ctx.beginPath();ctx.moveTo(-79,-46);ctx.lineTo(0,-87);ctx.lineTo(79,-46);ctx.closePath();ctx.fill();
  ctx.fillStyle='#647460';ctx.beginPath();ctx.moveTo(0,-87);ctx.lineTo(79,-46);ctx.lineTo(0,-46);ctx.closePath();ctx.fill();
  ctx.fillStyle='#37453e';ctx.fillRect(-16,-18,32,49);
  for(const x of [-49,31]){ctx.fillStyle='#647b78';ctx.fillRect(x,-28,18,18);ctx.strokeStyle='#d7d2ae';ctx.strokeRect(x,-28,18,18);}
  ctx.fillStyle='#e5e1c5';ctx.fillRect(-17,-56,34,30);drawMedicalMarker(ctx,0,-41,10);
  for(const x of [-90,70]){ctx.fillStyle='#514b3c';ctx.fillRect(x,14,20,48);ctx.fillStyle='#ded8bd';ctx.fillRect(x+2,17,16,34);ctx.fillStyle='#a3b5a1';ctx.fillRect(x+2,17,16,10);}
  ctx.fillStyle='#9a8a65';ctx.fillRect(-55,51,34,18);ctx.strokeStyle='#554e3d';ctx.strokeRect(-55,51,34,18);
  ctx.font='600 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#172520';ctx.strokeText(p.name,0,-99);ctx.fillStyle='#d8e8dc';ctx.fillText(p.name,0,-99);
  ctx.font='10px sans-serif';ctx.strokeText('搬送で復活・救出受付',0,90);ctx.fillText('搬送で復活・救出受付',0,90);ctx.restore();
}
export const UNDISCOVERED_MEDICAL_LABEL='未発見の救護所';
/** A post that has not been found yet is still on the map, as a plain question mark. */
export function drawUnknownMedicalMarker(ctx,x,y,size=5) {
  ctx.save();ctx.fillStyle='#31413b';ctx.strokeStyle='#a7dfcb';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,size+2,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.font=`bold ${Math.round(size*2)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#d8e8dc';ctx.fillText('？',x,y+1);ctx.restore();
}
export function drawMedicalMap(ctx,game,px,py,inside=()=>true) {
  for(const p of game.medicalPosts||[]){
    if(!inside(p.x,p.y))continue;
    if(p.discovered)drawMedicalMarker(ctx,px(p.x),py(p.y));else drawUnknownMedicalMarker(ctx,px(p.x),py(p.y));
  }
}
export function drawTownMedicalReception(ctx,town) {
  const x=230,y=town.height/2;
  ctx.save();
  for(const offset of [-28,16]){ctx.fillStyle='#554f3f';ctx.fillRect(x+offset,y+75,22,40);ctx.fillStyle='#d7d1b7';ctx.fillRect(x+offset+2,y+78,18,33);ctx.fillStyle='#a7b6a1';ctx.fillRect(x+offset+2,y+78,18,8);}
  drawMedicalMarker(ctx,x,y+34,10);
  ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#172520';ctx.strokeText('町の救護受付',x,y+59);ctx.fillStyle='#d8e8dc';ctx.fillText('町の救護受付',x,y+59);ctx.restore();
}
/** Canvas guide stays near the commander, clear of mobile controls and log panels. */
export function drawRescueDirection(ctx,game,active) {
  if(!active||game.currentDungeon)return;
  const post=nearestKnownMedicalPost(game);if(!post)return;
  const p=game.player,dx=post.x-p.x,dy=post.y-p.y,d=Math.hypot(dx,dy);if(d<post.radius)return;
  const angle=Math.atan2(dy,dx),zoom=game.zoom||1;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.scale(1/zoom,1/zoom);
  ctx.beginPath();ctx.moveTo(48,-5);ctx.lineTo(65,-5);ctx.lineTo(65,-11);ctx.lineTo(82,0);ctx.lineTo(65,11);ctx.lineTo(65,5);ctx.lineTo(48,5);ctx.closePath();
  ctx.fillStyle='#a7dfcb';ctx.strokeStyle='#152c27';ctx.lineWidth=3;ctx.stroke();ctx.fill();ctx.restore();
}
