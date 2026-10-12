/** Contact with any visible side of a building, including its roof edge. */
export function buildingContact(player,{x,y,w,h,roof=35},padding=24) {
  if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y))return false;
  const dx=Math.max(0,Math.abs(player.x-x)-(w/2+10));
  const dy=Math.max(0,y-h-roof-player.y,player.y-y-6);
  return Math.hypot(dx,dy)<=padding;
}
