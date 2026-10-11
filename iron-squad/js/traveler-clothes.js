const fabrics=['#8a7056','#657660','#82645b','#70767d','#9a895f'];
export function travelerClothes(identity='commander'){
  let hash=0;for(const ch of String(identity))hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
  return {cloth:fabrics[hash%fabrics.length],linen:'#c5bba3',leather:'#614d3b',trousers:'#5b5549'};
}
export function drawTravelerTunic(c,look){
  c.fillStyle=look.cloth;c.beginPath();c.moveTo(-7,-23);c.lineTo(-3,-25);c.lineTo(3,-25);c.lineTo(7,-23);c.lineTo(8,-9);c.lineTo(6,-5);c.lineTo(-6,-5);c.lineTo(-8,-9);c.closePath();c.fill();
  c.fillStyle='rgba(255,245,217,.12)';c.fillRect(-5,-21,3,12);c.fillStyle='rgba(24,20,17,.17)';c.fillRect(3,-20,3,14);
  c.strokeStyle=look.linen;c.lineWidth=.65;c.beginPath();c.moveTo(-2,-23);c.lineTo(0,-19);c.lineTo(2,-23);c.stroke();
  c.strokeStyle=look.leather;c.lineWidth=1.6;c.beginPath();c.moveTo(-5,-23);c.lineTo(6,-9);c.stroke();
  c.fillStyle=look.leather;c.fillRect(-6,-8,12,2);c.fillRect(4,-13,5,7);c.fillStyle='#a79570';c.fillRect(6,-12,1,1);
}
