export function viewport(camera,width,height,zoom=1,margin=0) {
  const hw=width/(2*zoom)+margin,hh=height/(2*zoom)+margin;
  return {left:camera.x-hw,right:camera.x+hw,top:camera.y-hh,bottom:camera.y+hh,x:camera.x,y:camera.y,hw,hh};
}
export function circleInView(x,y,r,view) {
  const dx=Math.max(view.left-x,0,x-view.right),dy=Math.max(view.top-y,0,y-view.bottom);
  return dx*dx+dy*dy<=r*r;
}
export function strokeVisibleRing(ctx,x,y,r,view) {
  const nearX=Math.max(view.left-x,0,x-view.right),nearY=Math.max(view.top-y,0,y-view.bottom);
  const farX=Math.max(Math.abs(view.left-x),Math.abs(view.right-x)),farY=Math.max(Math.abs(view.top-y),Math.abs(view.bottom-y));
  if(nearX*nearX+nearY*nearY>(r+2)**2 || farX*farX+farY*farY<(r-2)**2)return false;
  const dx=view.x-x,dy=view.y-y,d=Math.hypot(dx,dy),reach=Math.hypot(view.hw,view.hh);
  let start=0,end=Math.PI*2;
  if(d>reach){const angle=Math.atan2(dy,dx),span=Math.asin(Math.min(1,reach/d));start=angle-span;end=angle+span;}
  ctx.lineDashOffset=start*r;ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();ctx.lineDashOffset=0;
  return true;
}

// Runtime target references point back to soldiers. Never persist those cycles.
export function persistentUnit(unit) {
  const result={};for(const key of Object.keys(unit))if(!key.startsWith('_'))result[key]=unit[key];return result;
}

