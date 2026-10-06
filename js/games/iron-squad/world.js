// A 36x larger world, generated in deterministic 512px tiles with a bounded cache.
export const WORLD_SIZE = 21600;
export const WORLD_VERSION = 3;
const TILE = 512, CACHE_LIMIT = 48;
const CENTER = WORLD_SIZE / 2;
const seeded = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
};
const ellipse = (c,x,y,rx,ry,color) => {
  c.fillStyle=color; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fill();
};
export const biomeAt = (x,y) => {
  const d=Math.hypot(x-CENTER,y-CENTER);
  if(d<2400) return {name:'本陣近郊の草原',ground:'#17241c',grass:'#3a5536',tree:'oak'};
  if(d<5500) return {name:'辺境の深い森',ground:'#121e1a',grass:'#2c4634',tree:'pine'};
  if(d<9200) return {name:'遺跡と枯れ野',ground:'#26241c',grass:'#5a563c',tree:'dead'};
  return {name:'最果ての岩山',ground:'#1a1e1e',grass:'#3c423e',tree:'dead'};
};
// Smooth roads are shared across tile boundaries, independent of generation order.
const roadDist = (x,y) => Math.min(
  Math.abs(x-CENTER-Math.sin((y-CENTER)/620)*115),
  Math.abs(y-CENTER-Math.sin((x-CENTER)/710)*95)
);

export class WorldTerrain {
  constructor() { this.tiles=new Map(); this.generated=0; }
  get(tx,ty) {
    const key=`${tx},${ty}`;
    if(this.tiles.has(key)) {
      const tile=this.tiles.get(key); this.tiles.delete(key); this.tiles.set(key,tile); return tile;
    }
    const tile=this.generate(tx,ty); this.tiles.set(key,tile);
    while(this.tiles.size>CACHE_LIMIT) this.tiles.delete(this.tiles.keys().next().value);
    return tile;
  }
  generate(tx,ty) {
    const rnd=seeded(Math.imul(tx+31,73856093)^Math.imul(ty+31,19349663));
    const x0=tx*TILE,y0=ty*TILE;
    const canvas=document.createElement('canvas'); canvas.width=TILE; canvas.height=TILE;
    const c=canvas.getContext('2d'), objects=[];
    // Small cells follow world coordinates, so biome transitions align at tile edges.
    for(let y=0;y<TILE;y+=32) for(let x=0;x<TILE;x+=32) {
      c.fillStyle=biomeAt(x0+x+16,y0+y+16).ground; c.fillRect(x,y,32,32);
    }
    for(let i=0;i<65;i++) {
      const x=rnd()*TILE,y=rnd()*TILE,r=15+rnd()*55;
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,i%2?'#81936920':'#101c1828');g.addColorStop(1,'#00000000');
      c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    // Winding dirt roads, with two wagon tracks and scatter of pebbles.
    for(let y=0;y<TILE;y+=4) for(let x=0;x<TILE;x+=4) {
      const d=roadDist(x0+x+2,y0+y+2);
      if(d>30) continue;
      c.fillStyle=d>25?'#4d4636':(d>9 && d<13 ? '#5c503c':'#79654a');c.fillRect(x,y,4,4);
    }
    for(let i=0;i<420;i++) {
      const x=rnd()*TILE,y=rnd()*TILE,wx=x+x0,wy=y+y0;
      const d=roadDist(wx,wy),b=biomeAt(wx,wy);
      if(d<26) { c.fillStyle='#b2a17b55';c.fillRect(x,y,1+rnd()*2,1);continue; }
      c.strokeStyle=b.grass;c.globalAlpha=.14+rnd()*.16;c.lineWidth=1;
      c.beginPath();c.moveTo(x-2,y-4);c.lineTo(x,y);c.lineTo(x+2,y-5-rnd()*3);c.stroke();
    }
    c.globalAlpha=1;
    // Quiet ponds, ruined masonry and camps make each part of the world distinct.
    const feature=rnd(), fx=120+rnd()*270,fy=120+rnd()*270;
    const distance=Math.hypot(x0+fx-CENTER,y0+fy-CENTER);
    if(distance>360 && roadDist(x0+fx,y0+fy)>115) {
      if(feature<.22 && distance<8000) {
        ellipse(c,fx,fy,83,50,'#746c47');ellipse(c,fx,fy,77,45,'#314e54');
        ellipse(c,fx-9,fy-8,58,29,'#466b70');
        for(let i=0;i<18;i++) {
          const a=rnd()*Math.PI*2,x=fx+Math.cos(a)*82,y=fy+Math.sin(a)*49;
          c.strokeStyle='#92915b';c.beginPath();c.moveTo(x,y);c.lineTo(x+2,y-8);c.stroke();
        }
      } else if(feature<.42) {
        for(let i=0;i<22;i++) {
          const x=fx+(rnd()-.5)*115,y=fy+(rnd()-.5)*75;
          c.fillStyle=i%2?'#666960':'#565b55';c.fillRect(x,y,18,11);
          c.fillStyle='#b4b19a44';c.fillRect(x,y,18,1);
        }
        objects.push({type:'rock',x:x0+fx-25,y:y0+fy,s:1.8,tone:2});
        objects.push({type:'crate',x:x0+fx+25,y:y0+fy+15,s:1});
      } else if(feature<.52) {
        objects.push({type:'tent',x:x0+fx,y:y0+fy,s:1,color:'#75634b',ph:1});
        objects.push({type:'barrel',x:x0+fx+30,y:y0+fy+10,s:1});
      }
    }
    for(let i=0;i<42;i++) {
      const wx=x0+15+rnd()*(TILE-30),wy=y0+15+rnd()*(TILE-30);
      if(Math.hypot(wx-CENTER,wy-CENTER)<220 || roadDist(wx,wy)<48) continue;
      if(feature<.22 && Math.hypot(wx-x0-fx,(wy-y0-fy)*1.6)<100) continue;
      const b=biomeAt(wx,wy),roll=rnd();
      const type=roll<.58?b.tree:(roll<.82?'rock':'bush');
      objects.push({type,x:wx,y:wy,s:.7+rnd()*.8,tone:Math.floor(rnd()*3),ph:rnd()*6.28});
    }
    // Camp paving is anchored globally, including when its center crosses a tile edge.
    for(let row=-6;row<=6;row++) for(let col=-7;col<=7;col++) {
      const x=CENTER+col*19+(row%2)*9-x0,y=CENTER+row*12-y0;
      if(x< -18||y< -12||x>=TILE||y>=TILE||Math.hypot(x+x0-CENTER,y+y0-CENTER)>105) continue;
      c.fillStyle='#837b65';c.fillRect(x,y,16,9);c.fillStyle='#c7bb9540';c.fillRect(x,y,16,1);
    }
    this.generated++;
    return {canvas,objects,x:x0,y:y0};
  }
  draw(c,camera,width,height,zoom) {
    const margin=150,hw=width/(2*zoom)+margin,hh=height/(2*zoom)+margin;
    const minX=Math.max(0,Math.floor((camera.x-hw)/TILE));
    const maxX=Math.min(Math.ceil(WORLD_SIZE/TILE)-1,Math.floor((camera.x+hw)/TILE));
    const minY=Math.max(0,Math.floor((camera.y-hh)/TILE));
    const maxY=Math.min(Math.ceil(WORLD_SIZE/TILE)-1,Math.floor((camera.y+hh)/TILE));
    const objects=[];
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
      const tile=this.get(x,y);c.drawImage(tile.canvas,tile.x,tile.y);objects.push(...tile.objects);
    }
    return objects;
  }
  drawOverview(c,size,game) {
    const scale=size/WORLD_SIZE;
    c.clearRect(0,0,size,size);
    for(let y=0;y<size;y+=6) for(let x=0;x<size;x+=6) {
      c.fillStyle=biomeAt(x/scale,y/scale).ground;c.fillRect(x,y,6,6);
    }
    c.strokeStyle='#b9a37a';c.lineWidth=2;
    for(const vertical of [true,false]) {
      c.beginPath();
      for(let d=0;d<=WORLD_SIZE;d+=60) {
        const other=CENTER+Math.sin((d-CENTER)/(vertical?620:710))*(vertical?115:95);
        const x=(vertical?other:d)*scale,y=(vertical?d:other)*scale;
        if(d===0)c.moveTo(x,y);else c.lineTo(x,y);
      }c.stroke();
    }
    c.strokeStyle='#a7af8755';c.lineWidth=1;
    for(const r of [2400,5500,9200]){c.beginPath();c.arc(size/2,size/2,r*scale,0,Math.PI*2);c.stroke();}
    const mark=(x,y,color,r=3)=>ellipse(c,x*scale,y*scale,r,r,color);
    mark(CENTER,CENTER,'#c9c49b',5);
    for(const op of game.outposts||[])mark(op.x,op.y,op.cleared?'#95b69c':'#d7ae76');
    for(const d of game.dungeons||[])mark(d.entrance.x,d.entrance.y,d.cleared?'#c084fc':'#f43f5e',4);
    for(const m of game.monsters||[])if(m.isColossal)mark(m.x,m.y,'#d5836c',5);
    if(game.player)mark(game.player.x,game.player.y,'#e8f2e1',5);
    c.strokeStyle='#e8f2e1';c.lineWidth=1;
    c.strokeRect((game.camera.x-game.width/(2*game.zoom))*scale,(game.camera.y-game.height/(2*game.zoom))*scale,
      game.width/game.zoom*scale,game.height/game.zoom*scale);
  }
}
