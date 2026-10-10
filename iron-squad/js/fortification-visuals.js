// Fixed masonry patterns: no random rolls, extra surfaces or per-frame texture generation.
const STONE=['#a6a18c','#bab39e','#aaa793','#c1baa5','#989c89'];
const BRIGHT_STONE=['#c0b9a4','#cec6af','#b9b6a1','#d4cbb4','#aaa995'];
const hash=(x,y)=>(Math.imul(Math.floor(x),73856093)^Math.imul(Math.floor(y),19349663))>>>0;
function viewOf(game) {
  const camera=game.camera||game.player;
  if(!camera||!Number.isFinite(game.width)||!Number.isFinite(game.height))return null;
  const z=game.zoom||1;
  return {left:camera.x-game.width/2/z-65,right:camera.x+game.width/2/z+65,top:camera.y-game.height/2/z-65,bottom:camera.y+game.height/2/z+65};
}
const visible=(v,x,y,r=50)=>!v||(x+r>=v.left&&x-r<=v.right&&y+r>=v.top&&y-r<=v.bottom);
function masonry(ctx,x,y,width,height,palette,blockWidth=30,blockHeight=9) {
  ctx.fillStyle='#4c5148';ctx.fillRect(x,y,width,height);
  for(let row=0;row<Math.ceil(height/blockHeight);row++){
    const offset=row%2?blockWidth/2:0;
    for(let col=-1;col<Math.ceil(width/blockWidth);col++){
      const start=x+col*blockWidth+offset,left=Math.max(x,start),right=Math.min(x+width,start+blockWidth-1);
      const top=y+row*blockHeight,bottom=Math.min(y+height,top+blockHeight-1);
      if(right<=left||bottom<=top)continue;
      const n=hash(start,top);ctx.fillStyle=palette[n%palette.length];ctx.fillRect(left,top,right-left,bottom-top);
      ctx.fillStyle='#ddd5b840';ctx.fillRect(left,top,right-left,1);
      ctx.fillStyle='#313e3545';ctx.fillRect(left,bottom-1,right-left,1);
      if(right-left>12&&n%4===0){ctx.fillStyle='#4c554737';ctx.fillRect(left+4,top+3,Math.min(8,right-left-6),1);}
    }
  }
}
function wallRun(ctx,start,end,fixed,vertical,palette,view) {
  if(end<=start)return;
  if(view){
    if(vertical?(fixed+24<view.left||fixed-24>view.right):(fixed+16<view.top||fixed-34>view.bottom))return;
    const low=vertical?view.top:view.left,high=vertical?view.bottom:view.right;
    // Retain a fixed world-space grid when the camera moves or clips long town walls.
    const origin=start;start=Math.max(start,origin+Math.floor((low-origin)/264)*264);end=Math.min(end,origin+Math.ceil((high-origin)/264)*264);
    if(end<=start)return;
  }
  ctx.fillStyle='#08140f66';
  if(vertical){
    ctx.fillRect(fixed-11,start+6,34,end-start);
    masonry(ctx,fixed-14,start,28,end-start,palette,28,12);
    ctx.fillStyle='#586153';ctx.fillRect(fixed+9,start,5,end-start);
    masonry(ctx,fixed-7,start,15,end-start,palette,15,24);
    ctx.fillStyle='#e0d5b9';ctx.fillRect(fixed-8,start,2,end-start);
    ctx.fillStyle='#4b5648';ctx.fillRect(fixed+7,start,2,end-start);
    for(let y=Math.ceil(start/44)*44;y<end-10;y+=44){ctx.fillStyle='#485244';ctx.fillRect(fixed-19,y+4,10,16);ctx.fillStyle=palette[1];ctx.fillRect(fixed-19,y,11,14);ctx.fillStyle='#d8cfb4';ctx.fillRect(fixed-19,y,11,2);}
  }else{
    ctx.fillRect(start+5,fixed-19,end-start,36);
    masonry(ctx,start,fixed-17,end-start,26,palette,33,9);
    ctx.fillStyle='#4e584b';ctx.fillRect(start,fixed+7,end-start,3);
    masonry(ctx,start,fixed-25,end-start,8,palette,33,8);
    ctx.fillStyle='#e0d5b9';ctx.fillRect(start,fixed-25,end-start,2);
    ctx.fillStyle='#596153';ctx.fillRect(start,fixed-17,end-start,2);
    for(let x=Math.ceil(start/44)*44;x<end-10;x+=44){ctx.fillStyle='#4b5447';ctx.fillRect(x+2,fixed-28,16,9);ctx.fillStyle=palette[1];ctx.fillRect(x,fixed-33,16,10);ctx.fillStyle='#e0d5b9';ctx.fillRect(x,fixed-33,16,2);}
  }
}
function tower(ctx,x,y,palette,width=42) {
  const left=x-width/2;
  ctx.fillStyle='#08140f66';ctx.fillRect(left+6,y-22,width+2,43);
  masonry(ctx,left,y-26,width,41,palette,21,10);
  ctx.fillStyle='#414e4266';ctx.fillRect(x+width/2-6,y-26,6,41);
  ctx.fillStyle='#424b3f';ctx.fillRect(left-2,y-29,width+4,9);
  ctx.fillStyle=palette[2];ctx.fillRect(left+3,y-32,width-6,10);
  ctx.fillStyle='#ded4b8';ctx.fillRect(left-2,y-29,width+4,3);
  for(let i=0;i<3;i++){const bx=left-2+i*(width-6)/2;ctx.fillStyle=palette[1];ctx.fillRect(bx,y-38,9,12);ctx.fillStyle='#e2d6b9';ctx.fillRect(bx,y-38,9,2);}
  ctx.fillStyle='#354338';ctx.fillRect(x-2,y-10,4,12);
}
function gate(ctx,g,halfWidth,palette,town,index) {
  const vertical=g.side==='east'||g.side==='west',span=halfWidth*2-8;
  // Wide, low-contrast paving and two direction arrows keep the actual opening legible.
  ctx.fillStyle='#52684b';
  const x=g.x-(vertical?32:halfWidth-4),y=g.y-(vertical?halfWidth-4:32),width=vertical?64:span,height=vertical?span:64;
  ctx.fillRect(x,y,width,height);
  for(let row=0;row<Math.ceil(height/22);row++)for(let col=0;col<Math.ceil(width/24);col++){
    ctx.fillStyle=(col+row)%3?'#75806a':'#84896f';ctx.fillRect(x+col*24+2,y+row*22+2,Math.min(20,width-col*24-3),Math.min(18,height-row*22-3));
  }
  for(const sign of [-1,1]){
    const gx=g.x+(vertical?0:sign*(halfWidth+13)),gy=g.y+(vertical?sign*(halfWidth+13):0);
    tower(ctx,gx,gy,palette,26);
    // Small kingdom banners attach to the pillars, away from the opening.
    ctx.fillStyle='#384f48';ctx.fillRect(gx+6,gy-18,8,15);ctx.fillStyle='#c7b782';ctx.fillRect(gx+9,gy-15,2,7);
    ctx.save();ctx.translate(g.x+(vertical?sign*23:0),g.y+(vertical?0:sign*23));ctx.rotate(vertical?(sign>0?0:Math.PI):(sign>0?Math.PI/2:-Math.PI/2));
    ctx.fillStyle='#d5d2ac';ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-3,-4);ctx.lineTo(-3,4);ctx.closePath();ctx.fill();ctx.restore();
  }
  const side={north:'北門',east:'東門',south:'南門',west:'西門'}[g.side],label=`${index===4?'城下町門':side} · ${town?'外へ':'通路'}`;
  ctx.font='600 10px sans-serif';ctx.textAlign='center';
  const labelWidth=ctx.measureText(label).width+14,ly=g.y+(town&&g.side==='north'?49:-49),lx=g.x+(town&&g.side==='west'?55:town&&g.side==='east'?-55:0);
  ctx.fillStyle='#182a24eb';ctx.fillRect(lx-labelWidth/2,ly-11,labelWidth,17);
  ctx.strokeStyle='#9b9b79';ctx.lineWidth=1;ctx.strokeRect(lx-labelWidth/2,ly-11,labelWidth,17);
  ctx.fillStyle='#efe1bd';ctx.fillText(label,lx,ly+1);
}
export function drawStoneFortification(ctx,game,w,gates,halfWidth) {
  const view=viewOf(game),palette=(game.nation?.level||0)>=3?BRIGHT_STONE:STONE;
  ctx.save();
  for(const [side,start,end,fixed,vertical] of [['north',w.left,w.right,w.top,false],['south',w.left,w.right,w.bottom,false],['west',w.top,w.bottom,w.left,true],['east',w.top,w.bottom,w.right,true]]){
    const openings=gates.filter(g=>g.side===side).map(g=>vertical?g.y:g.x).sort((a,b)=>a-b);let cursor=start;
    for(const middle of [...openings,end+halfWidth]){wallRun(ctx,cursor,Math.min(end,middle-halfWidth),fixed,vertical,palette,view);cursor=middle+halfWidth;}
  }
  for(const x of [w.left,w.right])for(const y of [w.top,w.bottom])if(visible(view,x,y,55))tower(ctx,x,y,palette);
  gates.forEach((g,i)=>{if(visible(view,g.x,g.y,halfWidth+65))gate(ctx,g,halfWidth,palette,w.town,i);});
  ctx.restore();
}
