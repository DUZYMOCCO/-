// Offsets inside the existing 600 × 600 headquarters walls. Keep the cross aisle open.
export const HQ_FACILITY_LAYOUT=Object.freeze([
  Object.freeze({id:'smith',name:'鍛冶工房',x:-190,y:-105,w:160,h:100,level:1}),
  Object.freeze({id:'guild',name:'冒険者組合',x:190,y:-105,w:160,h:115,level:2}),
  Object.freeze({id:'casino',name:'カジノ',x:190,y:255,w:170,h:110,level:4})
]);
export function hqFacilityPlotContains(x,y,padding=0) {
  return HQ_FACILITY_LAYOUT.some(p=>Math.abs(x-p.x)<p.w/2+20+padding&&y>p.y-p.h-36-padding&&y<p.y+56+padding);
}
export function hqFacilityBlocks(x,y) {
  return HQ_FACILITY_LAYOUT.some(p=>Math.abs(x-p.x)<p.w/2&&y>p.y-52&&y<p.y+2);
}
