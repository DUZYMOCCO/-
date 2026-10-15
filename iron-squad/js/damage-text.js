import {compactFieldText} from './number-format.js?v=282';
export const DAMAGE_POPUP_CAP=40;
const bounds=p=>{
  const age=(p.maxLife||.6)-p.life,pop=1+.32*Math.max(0,1-age/.12)**2;
  const width=(p.text.length*(p.size||18)*.75+8)*pop,height=((p.size||18)*.76+(p.kind==='critical'?12:1))*pop;
  const x=p.x+(p.offsetX||0);return {left:x-width/2,right:x+width/2,top:p.y-height,bottom:p.y+2};
};
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

export function pushDamageText(game,x,y,value,color,options={}) {
  const list=game.damageTexts||=[];
  const text=compactFieldText(value),numeric=/^[+\-]?\d/.test(String(value));
  let kind=options.kind||(String(value).startsWith('+')&&['#34d399','#4ade80','#22c55e'].includes(color)?'heal':color==='#ff3344'?'friendly':color==='#ffaa00'?'critical':numeric&&!/[A-Za-z]/.test(String(value))?'normal':'notice');
  const big=!!options.big||Number.isFinite(Number(value))&&options.maxHp>0&&Math.abs(Number(value))>=options.maxHp*.1;
  const size=kind==='notice'?12:big?27:kind==='critical'?23:kind==='heal'?19:18;
  const life=kind==='notice'?.65:big?.85:kind==='critical'?.8:.72;
  // Separate rapid nearby hits; at most 40 bounded comparisons, no retained actor reference.
  const nearby=list.filter(p=>p.life>(p.maxLife||.6)-.18&&Math.abs((p.originX??p.x)-x)<12&&Math.abs((p.originY??p.y)-y)<32).length;
  const offset=[0,-14,14,-27,27][nearby%5];
  if(list.length>=DAMAGE_POPUP_CAP)list.shift();
  const popup={x,y,originX:x,originY:y,offsetX:offset,text,kind,big,size,color:kind==='heal'?'#66ef9a':kind==='friendly'?'#ff666f':kind==='critical'?'#ffc24d':kind==='normal'?'#fff2c4':color,life,maxLife:life};
  if(kind!=='notice'){
    const next=bounds(popup);
    // A dense crowd cannot fit forty full-size labels in one place. Keep the
    // freshest hit readable, removing only older overlapping combat numbers.
    for(let i=list.length-1;i>=0;i--)if(list[i].kind!=='notice'&&overlaps(next,bounds(list[i])))list.splice(i,1);
  }
  list.push(popup);
}
export function drawDamageText(ctx,p) {
  const age=(p.maxLife||.6)-p.life,notice=p.kind==='notice';
  const pop=notice?1:1+.32*Math.max(0,1-age/.12)**2;
  const shake=p.big&&age<.18?Math.sin(age*95)*2*(1-age/.18):0;
  ctx.save();ctx.translate(p.x+(p.offsetX||0)+shake,p.y);ctx.scale(pop,pop);
  ctx.globalAlpha=Math.min(1,Math.max(0,p.life/.22));ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.font=notice?'bold 12px sans-serif':`900 ${p.size||18}px Georgia, "Yu Mincho", serif`;
  ctx.lineJoin='round';ctx.miterLimit=2;ctx.strokeStyle='#15151c';ctx.lineWidth=notice?2.5:4;
  ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=2;ctx.shadowOffsetY=2;
  ctx.strokeText(p.text,0,0);ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle=p.color;ctx.fillText(p.text,0,0);
  if(p.kind==='critical'){ctx.font='bold 9px sans-serif';ctx.lineWidth=2.5;ctx.strokeText('会心',0,-p.size-2);ctx.fillText('会心',0,-p.size-2);}
  ctx.restore();
}
