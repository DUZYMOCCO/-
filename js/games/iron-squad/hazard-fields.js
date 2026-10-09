import {WORLD_SIZE} from './world.js?v=129';
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
      const field=game.damageFields.find(f=>distance(f,u)<=f.radius);
      if(field)game.damageTarget(u,(8+u.maxHp*.12)*.5,{environmental:true,damageKind:'elemental',element:field.type});
      if(!game.inBattle||game.player.hp<=0)return;
    }
    // Hostile creatures also take terrain damage. Empty patches do not award idle XP.
    for(const m of [...(game.monsters||[])])if(active(m)&&game.damageFields.some(f=>distance(f,m)<=f.radius)){
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
    const type=HAZARD_TYPES[f.type];ctx.save();ctx.fillStyle=type.ground;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(f.x,f.y,f.radius,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.8;ctx.strokeStyle=type.color;ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([]);
    for(let i=0;i<7;i++){const a=i*2.399,r=f.radius*.65;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*r-10,f.y+Math.sin(a)*r+5);ctx.lineTo(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r-6);ctx.lineTo(f.x+Math.cos(a)*r+12,f.y+Math.sin(a)*r+2);ctx.stroke();}
    ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e5cbb0';ctx.fillText(`危険 · ${type.name}`,f.x,f.y-f.radius-8);ctx.restore();
  }
}
export const hazardMethods={
  refreshHazardUI() {
    let warning=document.getElementById('hazard-warning');const host=document.querySelector('.field-alerts');
    if(!warning&&host){warning=document.createElement('div');warning.id='hazard-warning';warning.className='hazard-warning';host.append(warning);}
    const field=!this.currentDungeon&&this.player?fieldsNear(this.player.x,this.player.y).find(f=>safe(this,f)&&distance(f,this.player)<=f.radius):null;
    warning?.classList.toggle('hidden',!field);if(warning&&field)warning.textContent=`${HAZARD_TYPES[field.type].name}：継続ダメージ · 地形から離れてください`;
  }
};
