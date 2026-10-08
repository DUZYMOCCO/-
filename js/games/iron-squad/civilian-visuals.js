import {createSoldierAppearance,drawSoldierHead} from './soldier-appearance.js?v=119';
const colors={child:['#a88959','#667f89','#8b6e71'],woman:['#987c7b','#687f74','#867654'],elder:['#777b60','#887660','#6b787d']};
function identity(id) {let n=2166136261;for(const ch of String(id)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
function look(civ) {
  const n=identity(civ.id),female=civ.kind==='woman'||(civ.kind==='child'&&n%2===0);
  if(!civ.appearance) {
    civ.appearance=createSoldierAppearance(`civilian:${civ.id}`);
    Object.assign(civ.appearance,{scar:false,handsome:false,facialHair:'none'});
    if(civ.kind==='child')Object.assign(civ.appearance,{faceShape:'round',hairStyle:n%3?'swept':'buzz',glasses:'none'});
    if(civ.kind==='elder')Object.assign(civ.appearance,{hairStyle:n%2?'horseshoe':'bald',hairColor:'#85827b',facialHair:'chin',glasses:n%3?'round':'none'});
  }
  return {n,female,face:{id:civ.id,appearance:civ.appearance,soldierClass:female?'MEDIC':'LIGHT'}};
}
const shape=(c,p,color)=>{c.fillStyle=color;c.strokeStyle='#353931';c.lineWidth=.8;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();};
const stroke=(c,p,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
export function drawFieldCivilian(c,civ,now=0) {
  if(!civ||civ.rescued)return;
  const {n,female,face}=look(civ),child=civ.kind==='child',elder=civ.kind==='elder';
  const scale=child?.72:1,cloth=(colors[civ.kind]||colors.woman)[n%3],dragged=!!civ.carrierId;
  c.save();c.translate(civ.x,civ.y);
  c.fillStyle='#0005';c.beginPath();c.ellipse(0,2,dragged?15:8*scale,3,0,0,Math.PI*2);c.fill();
  c.save();if(dragged){c.translate(12,-1);c.rotate(-Math.PI/2);}c.scale(scale,scale);
  c.fillStyle='#49473b';c.fillRect(-4,-9,3.5,10);c.fillRect(1,-9,3.5,10);
  c.fillStyle='#302c25';c.fillRect(-5,0,5,2.5);c.fillRect(1,0,5,2.5);
  const lean=elder?2:0;
  shape(c,[[-6+lean,-25],[5+lean,-25],[7,-11],[5,-7],[-6,-7],[-7,-16]],cloth);
  if(female&&!child)shape(c,[[-5,-17],[5,-17],[8,-1],[-8,-1]],cloth);
  shape(c,[[-5+lean,-24],[0+lean,-21],[5+lean,-24],[3,-17],[-3,-17]],elder?'#c1b795':'#d3c7ab');
  c.fillStyle='#65583f';c.fillRect(-5,-10,10,1.5);
  stroke(c,[[-5+lean,-22],[-8,-16],[-6,-11]],cloth,3.1);
  stroke(c,[[5+lean,-22],[8,-17],[8,elder?-12:-11]],cloth,3.1);
  c.fillStyle=civ.appearance.skin;c.fillRect(-7,-12,2.3,2.3);c.fillRect(7,-13,2.3,2.3);
  if(elder) {
    stroke(c,[[9,-12],[11,1]],'#a38a60',1.8);stroke(c,[[8,-13],[11,-13]],'#a38a60',1.8);
    stroke(c,[[4,-22],[6,-25]],'#c3b899',1);
  } else if(!child) {
    stroke(c,[[-4,-23],[7,-11]],'#b9a480',1.1);shape(c,[[5,-12],[10,-12],[10,-6],[5,-5]],'#8c674c');
  } else {
    c.fillStyle='#c9b68b';c.fillRect(-5,-22,2,5);
  }
  drawSoldierHead(c,face,{x:lean,y:elder?-29:-31,small:true});
  if(elder)stroke(c,[[lean-3,-29],[lean-1,-28],[lean+3,-29],[lean+4,-28]],'#997f68',.5);
  c.restore();
  const label=dragged?'搬送中':(civ.kind==='child'?'子供':civ.kind==='elder'?'老人':'女性');
  c.font='8px sans-serif';c.textAlign='center';const width=c.measureText(label).width+6;
  c.fillStyle='#15201cdd';c.fillRect(-width/2,8,width,11);c.fillStyle='#d7ccb2';c.fillText(label,0,16);
  c.restore();
}
