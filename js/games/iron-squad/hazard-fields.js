import {WORLD_SIZE} from './world.js?v=151';
import {hazardContour,insideHazard,containsContour,traceContour,terrainSeed} from './terrain-shapes.js?v=151';
const BASE=WORLD_SIZE/2,CELL=1024;
export const HAZARD_TYPES={fire:{name:'灼熱地帯',color:'#b77a55',ground:'#683e2b'},poison:{name:'腐毒地帯',color:'#9da36b',ground:'#414a31'},storm:{name:'帯電地帯',color:'#aaa2bf',ground:'#4a4659'}};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const active=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
export function fieldsNear(x,y) {
  const result=[];if(!Number.isFinite(x)||!Number.isFinite(y))return result;
  const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const tx=cx+dx,ty=cy+dy;if(tx<0||ty<0||tx*CELL>=WORLD_SIZE||ty*CELL>=WORLD_SIZE)continue;
    let h=(Math.imul(tx+43,73856093)^Math.imul(ty+71,19349663))>>>0;
    if(h%100>=18)continue;
    const f={id:`hazard-${tx}-${ty}`,x:tx*CELL+160+(h%650),y:ty*CELL+160+((h>>>11)%650),radius:75+(h%36),type:['fire','poison','storm'][(h>>>8)%3]};
    if(Math.hypot(f.x-BASE,f.y-BASE)>600+f.radius)result.push(f);
  }
  const first={id:'hazard-borderland',x:BASE+740,y:BASE+420,radius:95,type:'fire'};
  if(distance(first,{x,y})<CELL*1.6)result.push(first);
  return result;
}
function safe(game,f) {
  if((game.medicalPosts||[]).some(p=>distance(p,f)<f.radius+p.radius+40))return false;
  if((game.dungeons||[]).some(d=>d.kind==='town'&&distance(d.entrance||d,f)<f.radius+170))return false;
  if((game.merchants||[]).some(m=>!m.dead&&distance(m,f)<f.radius+130))return false;
  for(const tile of game.worldTerrain?.tiles?.values?.()||[])if((tile.camps||[]).some(c=>distance(c,f)<f.radius+130))return false;
  return true;
}
export function currentFields(game) {
  if(game.currentDungeon)return [];
  const centers=[game.player,...(game.squad||[])].filter(active),cells=new Set(),fields=new Map();
  for(const u of centers){const cell=`${Math.floor(u.x/CELL)},${Math.floor(u.y/CELL)}`;if(cells.has(cell))continue;cells.add(cell);for(const f of fieldsNear(u.x,u.y))if(safe(game,f))fields.set(f.id,f);}
  return [...fields.values()];
}
export function updateHazards(game,dt) {
  if(game.currentDungeon||game.restTimer>0)return;
  game._hazardClock=(game._hazardClock||0)+dt;if(game._hazardClock<.5)return;
  const steps=Math.min(4,Math.floor(game._hazardClock/.5));game._hazardClock-=steps*.5;
  game.damageFields=currentFields(game);
  for(let tick=0;tick<steps;tick++){
    for(const u of [game.player,...(game.squad||[]),...(game.merchants||[]).flatMap(m=>m.escorts||[]),...(game.gateGuards||[]).filter(g=>g.gateSpace==='field')]){
      if(!active(u))continue;
      const field=game.damageFields.find(f=>insideHazard(f,u));
      if(field)game.damageTarget(u,(8+u.maxHp*.12)*.5,{environmental:true,damageKind:'elemental',element:field.type});
      if(!game.inBattle||game.player.hp<=0)return;
    }
    // Hostile creatures also take terrain damage. Empty patches do not award idle XP.
    for(const m of [...(game.monsters||[])])if(active(m)&&game.damageFields.some(f=>insideHazard(f,m))){
      m.hp-=10;
      if(m.hp<=0){if(m._damageOwner)game.killMonster(m,m._damageOwner,!!m._damageIsPlayer);else{const index=game.monsters.indexOf(m);if(index>=0)game.monsters.splice(index,1);}}
    }
  }
}
export function drawHazards(ctx,game,view) {
  if(game.currentDungeon)return;
  const center=game.camera||game.player;
  for(const f of fieldsNear(center.x,center.y)){
    if(!safe(game,f)||f.x+f.radius<view.left||f.x-f.radius>view.right||f.y+f.radius<view.top||f.y-f.radius>view.bottom)continue;
    drawHazardField(ctx,f);
  }
}
export function drawHazardField(ctx,f) {
  const type=HAZARD_TYPES[f.type],points=hazardContour(f),seed=terrainSeed(f.x,f.y);
  ctx.save();traceContour(ctx,points);ctx.fillStyle=type.ground;ctx.globalAlpha=.88;ctx.fill();
  ctx.strokeStyle=type.color;ctx.globalAlpha=.6;ctx.lineWidth=1.2;ctx.lineJoin='round';ctx.stroke();
  ctx.globalAlpha=1;ctx.save();ctx.clip();
  const wash=ctx.createLinearGradient(f.x-f.radius,f.y-f.radius,f.x+f.radius,f.y+f.radius);
  wash.addColorStop(0,'#b2ab8820');wash.addColorStop(1,'#090e1260');ctx.fillStyle=wash;ctx.fillRect(f.x-f.radius,f.y-f.radius,f.radius*2,f.radius*2);
  for(let i=0;i<24;i++){
    let h,x,y;
    // Place detail on the actual patch, including narrow branching shapes.
    for(let attempt=0;attempt<12;attempt++){
      h=terrainSeed(seed,i*17+attempt);x=f.x-f.radius+(h%997)/997*f.radius*2;y=f.y-f.radius+((h>>>10)%997)/997*f.radius*2;
      if(containsContour(points,x,y))break;
    }
    ctx.fillStyle=i%2?'#c3b59a20':'#090d1030';ctx.fillRect(x-5,y-2,3+(h%5),2);
    if(f.type==='poison'){
      ctx.fillStyle=i%3?'#8a995e35':'#172c244f';ctx.beginPath();ctx.ellipse(x,y,4+h%12,2+h%6,-.3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#b4b57460';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-2,y+3);ctx.lineTo(x-4,y-4);ctx.moveTo(x,y+3);ctx.lineTo(x+2,y-2);ctx.stroke();
    }else{
      ctx.save();ctx.translate(x,y);ctx.rotate((h>>>4)%360*Math.PI/180);ctx.scale(.5+(h%70)/100,.7+((h>>>17)%60)/100);
      ctx.strokeStyle=f.type==='fire'?'#171614':'#191d29';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(-13,-7);ctx.lineTo(-3,-2);ctx.lineTo(3,5);ctx.lineTo(15,8);ctx.moveTo(3,5);ctx.lineTo(-1,14);ctx.stroke();
      ctx.strokeStyle=f.type==='fire'?'#d38b4d99':'#acadd7a0';ctx.lineWidth=.8;ctx.stroke();
      ctx.strokeStyle=f.type==='fire'?'#deac634a':'#c2c6e750';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,-1);ctx.lineTo(3,5);ctx.stroke();
      ctx.fillStyle=f.type==='fire'?'#d6a15b80':'#8b8caa60';ctx.fillRect(6,-5,1.5,1.5);ctx.restore();
    }
  }
  ctx.restore();ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e5cbb0';
  ctx.fillText(`危険 · ${type.name}`,f.x,Math.min(...points.map(p=>p[1]))-8);ctx.restore();
}
export const hazardMethods={
  refreshHazardUI() {
    let warning=document.getElementById('hazard-warning');const host=document.querySelector('.field-alerts');
    if(!warning&&host){warning=document.createElement('div');warning.id='hazard-warning';warning.className='hazard-warning';host.append(warning);}
    const field=!this.currentDungeon&&this.player?fieldsNear(this.player.x,this.player.y).find(f=>safe(this,f)&&insideHazard(f,this.player)):null;
    warning?.classList.toggle('hidden',!field);if(warning&&field)warning.textContent=`${HAZARD_TYPES[field.type].name}：継続ダメージ · 地形から離れてください`;
  }
};
