// 158720 = 310 tiles of 512. Half-width 79360.
// Base walk is 165px/s, so camp to the nearest edge is 481s (8 min 1s).
// 10800 was about 33s and 21600 about 65s. Both were still a short walk.
export const WORLD_SIZE = 158720;
export const WORLD_VERSION = 4;
const TILE = 512, CACHE_LIMIT = 72; // was 48 — fewer regen thrash on 158720 world
const CENTER = WORLD_SIZE / 2;
const LIP = '#6e7264', FACE = '#1a1e1c', DROP = '#0e100e';
const TAU = Math.PI * 2;

const seeded = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
};
const ellipse = (c,x,y,rx,ry,color) => {
  c.fillStyle=color; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fill();
};
const wrap = t => {
  const x = t % TAU;
  return x < 0 ? x + TAU : x;
};
function angleIn(a, a0, a1) {
  const aa = wrap(a), s = wrap(a0), e = wrap(a1);
  return s <= e ? aa >= s && aa <= e : aa >= s || aa <= e;
}
function cellHash(ix, iy) {
  let n = Math.imul(ix + 31, 73856093) ^ Math.imul(iy + 17, 19349663);
  n = Math.imul(n ^ (n >>> 16), 2246822519);
  return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
}

export const biomeAt = (x,y) => {
  const d=Math.hypot(x-CENTER,y-CENTER);
  // 戦闘ゾーン伸長に合わせた視覚帯（0/8k/22k/48k）
  if(d<8000) return {name:'本陣近郊の草原',ground:'#17241c',grass:'#3a5536',tree:'oak'};
  if(d<22000) return {name:'辺境の深い森',ground:'#121e1a',grass:'#2c4634',tree:'pine'};
  if(d<48000) return {name:'遺跡と枯れ野',ground:'#26241c',grass:'#5a563c',tree:'dead'};
  if(d<65000) return {name:'最果ての岩山',ground:'#1a1e1e',grass:'#3c423e',tree:'dead'};
  if(d<78000) return {name:'灰の長征路',ground:'#1c1a17',grass:'#4a4638',tree:'dead'};
  if(d<90000) return {name:'断崖の外縁',ground:'#16181c',grass:'#3a403c',tree:'dead'};
  return {name:'世界の縁',ground:'#121416',grass:'#32362e',tree:'dead'};
};
// Smooth roads are shared across tile boundaries, independent of generation order.
const roadDist = (x,y) => Math.min(
  Math.abs(x-CENTER-Math.sin((y-CENTER)/620)*115),
  Math.abs(y-CENTER-Math.sin((x-CENTER)/710)*95)
);

const gateOffset = (ox, oy, padW, padH) => {
  if (Math.abs(ox) >= Math.abs(oy)) return { dx: ox >= 0 ? -padW / 2 + 18 : padW / 2 - 18, dy: 0 };
  return { dx: 0, dy: oy >= 0 ? -padH / 2 + 18 : padH / 2 - 18 };
};
const townProps = street => {
  const horiz = street === 'h';
  const spots = [[-120,-78],[130,-84],[-150,86],[146,78],[-40,-120],[48,118]];
  return spots.map(([a,b],i) => ({
    type:'house', dx: horiz ? a : b, dy: horiz ? b : a,
    w: 42+(i%3)*8, h: 30+(i%2)*8, roof: i%2 ? '#5c4632' : '#4e4034'
  })).concat([{ type:'well', dx: horiz ? 72 : -72, dy: 72 }]);
};
const ruinProps = () => ([
  { type:'ruinwall', dx:-90, dy:-36, w:78, h:34 },
  { type:'ruinwall', dx:70, dy:10, w:60, h:26 },
  { type:'ruinwall', dx:-16, dy:78, w:96, h:22 },
  { type:'column', dx:24, dy:-70, fallen:0 },
  { type:'column', dx:-48, dy:24, fallen:1 },
  { type:'column', dx:96, dy:48, fallen:1 }
]);
const onRoad = (ox, horizontal) => horizontal
  ? { ox, oy: Math.sin(ox / 710) * 95, street: 'h' }
  : { ox: Math.sin(ox / 620) * 115, oy: ox, street: 'v' };

function buildPlace(partial) {
  const gate = gateOffset(partial.ox, partial.oy, partial.padW, partial.padH);
  return {
    ...partial,
    entranceOx: partial.ox + gate.dx,
    entranceOy: partial.oy + gate.dy,
    props: partial.kind === 'town' ? townProps(partial.street) : ruinProps()
  };
}
const town = (id, name, spot, extra) => buildPlace({
  id, kind:'town', name, subtitle:'【街道の宿】', icon:'🏘️',
  padW:440, padH:300, width:1680, height:1080, reqDef:0, reqLv:1,
  mobCount:0, eliteCount:0, mobTypes:[], guardian:null, reward:null,
  desc:'敵のいない宿場。休息で回復できる。西側の門から外へ出られる。',
  ...spot, ...extra
});
const ruin = (id, name, spot, extra) => buildPlace({
  id, kind:'ruin', name, subtitle:'【崩れ残った石積み】', icon:'🏚️',
  padW:400, padH:280, width:2000, height:1200,
  mobTypes:['goblin','wolf'], mobCount:8, eliteCount:2,
  guardian:{ type:'orc', name:`${name}の番兵`, hp:480, atk:26, speed:54, radius:18 },
  reward:{ gold:420, exp:110, itemCount:1, lootKind:'chest' },
  desc:'少数の残党と、奥の番兵。箱は番兵を倒すと開く。',
  ...spot, ...extra
});

export const SETTLEMENTS = [
  town('place_crossroads', '十字路の宿場町', onRoad(1100, true)),
  ruin('place_north_fort', '北の崩れ砦', onRoad(-3600, false), { reqDef:45, reqLv:6 }),
  town('place_north_gate', '北関の宿場', onRoad(-14000, false), {
    desc:'北の街道に残った宿。休息回復あり。中に敵はいない。'
  }),
  ruin('place_salt_village', '塩の廃村', onRoad(22000, false), {
    reqDef:320, reqLv:18, mobTypes:['orc','wyvern'], mobCount:10, eliteCount:2,
    guardian:{ type:'wyvern', name:'塩の廃村の番竜', hp:720, atk:34, speed:60, radius:22 },
    reward:{ gold:980, exp:240, itemCount:2, lootKind:'chest' }
  }),
  town('place_iron_ridge', '鉄嶺の宿', onRoad(36000, true), {
    desc:'東の尾根の手前にある宿。休息回復あり。中に敵はいない。'
  }),
  ruin('place_west_keep', '西の崩れ王城', onRoad(-36000, true), {
    reqDef:320, reqLv:18, mobTypes:['orc','wyvern'], mobCount:10, eliteCount:2,
    guardian:{ type:'wyvern', name:'崩れ王城の番竜', hp:720, atk:34, speed:60, radius:22 },
    reward:{ gold:980, exp:240, itemCount:2, lootKind:'chest' }
  }),
  town('place_last_inn', '最後の宿場町', { ox:-28000, oy:48000, street:'h' }, {
    desc:'南西の外れに残った最後の宿。休息回復あり。中に敵はいない。'
  }),
  ruin('place_rim_watch', '縁の監視塔', { ox:42000, oy:-40000, street:'v' }, {
    reqDef:320, reqLv:22, mobTypes:['wyvern','orc'], mobCount:10, eliteCount:2,
    guardian:{ type:'wyvern', name:'縁の見張り', hp:860, atk:40, speed:62, radius:24 },
    reward:{ gold:1200, exp:280, itemCount:2, lootKind:'chest' },
    desc:'世界の縁に近い崩れ塔。番を倒すと残宝が開く。'
  })
];

const ARCS = [
  { r:16800, a0:0.15, a1:1.35 },
  { r:26000, a0:-2.7, a1:-0.45 },
  { r:40000, a0:2.35, a1:3.55 },
  { r:52000, a0:-0.55, a1:0.75 },
  { r:64000, a0:1.55, a1:2.85 }
];
const RAVINES = [
  { ox:2400, oy:1500, dx:0.80, dy:0.60, len:2100, bed:18, bank:34 },
  { ox:11000, oy:-5500, dx:0.92, dy:-0.39, len:7600, bed:24, bank:44 }
];
for (const rv of RAVINES) {
  const m = Math.hypot(rv.dx, rv.dy) || 1;
  rv.dx /= m; rv.dy /= m;
}

function band(dy, nearShadow) {
  if (nearShadow) {
    if (dy >= -66 && dy < -46) return DROP;
    if (dy >= -46 && dy < -14) return FACE;
    if (dy >= -14 && dy <= 4) return LIP;
    return null;
  }
  if (dy > -16 && dy <= 0) return LIP;
  if (dy > 0 && dy <= 46) return FACE;
  if (dy > 46 && dy <= 64) return DROP;
  return null;
}
function settlementShade(s, x, y) {
  const lx = x - (CENTER + s.ox), ly = y - (CENTER + s.oy);
  const cross = s.street === 'h' ? Math.abs(lx) < 15 : Math.abs(ly) < 15;
  if (cross) return '#5c4e3c';
  if (s.kind === 'town') return cellHash(Math.floor(lx / 26), Math.floor(ly / 26)) > 0.55 ? '#322c24' : '#3e362c';
  const crack = cellHash(Math.floor(lx / 18), Math.floor(ly / 18));
  if (crack > 0.82) return '#141210';
  if (crack > 0.62) return '#3a3832';
  return '#2a261f';
}
function ravineAt(x, y) {
  for (const rv of RAVINES) {
    const dx = x - (CENTER + rv.ox), dy = y - (CENTER + rv.oy);
    const along = dx * rv.dx + dy * rv.dy;
    const across = dx * -rv.dy + dy * rv.dx;
    if (along < 30 || along > rv.len) continue;
    const taper = along < 80 ? along / 80 : (along > rv.len - 80 ? (rv.len - along) / 80 : 1);
    const a = Math.abs(across);
    if (a < rv.bed * taper) return '#1a2426';
    if (a < rv.bank * taper) return '#2a312c';
  }
  return null;
}
function ridgeAt(x, y) {
  if (x > CENTER - 16000 && x < CENTER + 16000) {
    const ridge = CENTER + 5000 + Math.sin((x - CENTER) / 980) * 110;
    const shade = band(y - ridge, false);
    if (shade) return shade;
  }
  if (x > CENTER - 18000 && x < CENTER + 18000) {
    const ridge = CENTER - 8000 + Math.sin((x - CENTER) / 1100) * 90;
    const shade = band(y - ridge, false);
    if (shade) return shade;
  }
  if (x > CENTER - 22000 && x < CENTER + 22000) {
    const ridge = CENTER + 24000 + Math.sin((x - CENTER) / 1400) * 160;
    const shade = band(y - ridge, true);
    if (shade) return shade;
  }
  if (y > CENTER - 14000 && y < CENTER + 14000) {
    const ridge = CENTER - 6400 + Math.sin((y - CENTER) / 860) * 80;
    const dx = x - ridge;
    if (dx > -16 && dx <= 0) return LIP;
    if (dx > 0 && dx <= 46) return FACE;
    if (dx > 46 && dx <= 64) return DROP;
  }
  const d = Math.hypot(x - CENTER, y - CENTER);
  if (d < 15000 || d > 66000) return null;
  const ang = Math.atan2(y - CENTER, x - CENTER);
  for (const arc of ARCS) {
    if (!angleIn(ang, arc.a0, arc.a1)) continue;
    const shade = band(d - arc.r, true);
    if (shade) return shade;
  }
  return null;
}

export function reliefAt(x, y) {
  for (const s of SETTLEMENTS) {
    if (Math.abs(x - CENTER - s.ox) <= s.padW / 2 && Math.abs(y - CENTER - s.oy) <= s.padH / 2) return settlementShade(s, x, y);
  }
  return ravineAt(x, y) || ridgeAt(x, y);
}

function tileMayHaveRelief(x0, y0) {
  const cx = x0 + TILE / 2, cy = y0 + TILE / 2;
  const hitY = (y, pad) => cy > y - pad && cy < y + pad;
  const hitX = (x, pad) => cx > x - pad && cx < x + pad;
  if (hitY(CENTER + 5000, 520) && cx > CENTER - 16800 && cx < CENTER + 16800) return true;
  if (hitY(CENTER - 8000, 520) && cx > CENTER - 18800 && cx < CENTER + 18800) return true;
  if (hitY(CENTER + 24000, 640) && cx > CENTER - 22800 && cx < CENTER + 22800) return true;
  if (hitX(CENTER - 6400, 520) && cy > CENTER - 14800 && cy < CENTER + 14800) return true;
  for (const s of SETTLEMENTS) {
    if (Math.abs(cx - CENTER - s.ox) < s.padW / 2 + 280 && Math.abs(cy - CENTER - s.oy) < s.padH / 2 + 280) return true;
  }
  for (const rv of RAVINES) {
    const mx = CENTER + rv.ox + rv.dx * rv.len * 0.5;
    const my = CENTER + rv.oy + rv.dy * rv.len * 0.5;
    if (Math.abs(cx - mx) < rv.len * 0.55 + 200 && Math.abs(cy - my) < rv.len * 0.45 + 200) return true;
  }
  const d = Math.hypot(cx - CENTER, cy - CENTER);
  const ang = Math.atan2(cy - CENTER, cx - CENTER);
  for (const arc of ARCS) {
    if (Math.abs(d - arc.r) < 460 && angleIn(ang, arc.a0 - 0.18, arc.a1 + 0.18)) return true;
  }
  return false;
}

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
    const may=tileMayHaveRelief(x0,y0);
    // Small cells follow world coordinates, so biome transitions align at tile edges.
    for(let y=0;y<TILE;y+=32) for(let x=0;x<TILE;x+=32) {
      c.fillStyle=biomeAt(x0+x+16,y0+y+16).ground; c.fillRect(x,y,32,32);
    }
    for(let i=0;i<45;i++) {
      const x=rnd()*TILE,y=rnd()*TILE,r=15+rnd()*55;
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,i%2?'#81936920':'#101c1828');g.addColorStop(1,'#00000000');
      c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    // Cliff lip, face and shadow, then roads so a road reads as a cut through the face.
    if(may) {
      for(let y=0;y<TILE;y+=4) for(let x=0;x<TILE;x+=4) {
        const shade=reliefAt(x0+x+2,y0+y+2);
        if(!shade) continue;
        c.fillStyle=shade; c.fillRect(x,y,4,4);
      }
    }
    for(let y=0;y<TILE;y+=4) for(let x=0;x<TILE;x+=4) {
      const d=roadDist(x0+x+2,y0+y+2);
      if(d>30) continue;
      c.fillStyle=d>25?'#4d4636':(d>9 && d<13 ? '#5c503c':'#79654a');c.fillRect(x,y,4,4);
    }
    for(let i=0;i<260;i++) {
      const x=rnd()*TILE,y=rnd()*TILE,wx=x+x0,wy=y+y0;
      const d=roadDist(wx,wy),b=biomeAt(wx,wy);
      if(d<26) { c.fillStyle='#b2a17b55';c.fillRect(x,y,1+rnd()*2,1);continue; }
      if(may && reliefAt(wx,wy)) continue;
      c.strokeStyle=b.grass;c.globalAlpha=.14+rnd()*.16;c.lineWidth=1;
      c.beginPath();c.moveTo(x-2,y-4);c.lineTo(x,y);c.lineTo(x+2,y-5-rnd()*3);c.stroke();
    }
    c.globalAlpha=1;
    // Quiet ponds, ruined masonry and camps make each part of the world distinct.
    const feature=rnd(), fx=120+rnd()*270,fy=120+rnd()*270;
    const distance=Math.hypot(x0+fx-CENTER,y0+fy-CENTER);
    if(distance>360 && roadDist(x0+fx,y0+fy)>115 && !(may && reliefAt(x0+fx,y0+fy))) {
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
      if(may && reliefAt(wx,wy)) continue;
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
    const x1=x0+TILE,y1=y0+TILE;
    for(const s of SETTLEMENTS) {
      const sx=CENTER+s.ox, sy=CENTER+s.oy;
      for(const p of s.props) {
        const x=sx+p.dx, y=sy+p.dy;
        if(x<x0 || x>=x1 || y<y0 || y>=y1) continue;
        objects.push({type:p.type,x,y,w:p.w,h:p.h,roof:p.roof,fallen:p.fallen,s:1});
      }
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
    c.strokeStyle='#b9a37a';c.lineWidth=1.25;
    const step=Math.max(80, WORLD_SIZE / size * 2);
    for(const vertical of [true,false]) {
      c.beginPath();
      for(let d=0;d<=WORLD_SIZE;d+=step) {
        const other=CENTER+Math.sin((d-CENTER)/(vertical?620:710))*(vertical?115:95);
        const x=(vertical?other:d)*scale,y=(vertical?d:other)*scale;
        if(d===0)c.moveTo(x,y);else c.lineTo(x,y);
      }c.stroke();
    }
    c.strokeStyle='#6a6458';c.lineWidth=1.25;
    const line=(pts)=>{c.beginPath();pts.forEach((p,i)=>{const x=p[0]*scale,y=p[1]*scale;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.stroke();};
    const south=(base,amp,wave,span)=>{
      const pts=[];
      for(let i=0;i<=64;i++){const x=CENTER-span+i*(span*2)/64;pts.push([x, base+Math.sin((x-CENTER)/wave)*amp]);}
      line(pts);
    };
    south(CENTER+5000,110,980,16000);
    south(CENTER-8000,90,1100,18000);
    south(CENTER+24000,160,1400,22000);
    const west=[];
    for(let i=0;i<=64;i++){const y=CENTER-14000+i*28000/64;west.push([CENTER-6400+Math.sin((y-CENTER)/860)*80,y]);}
    line(west);
    for(const arc of ARCS) {
      c.beginPath();
      for(let i=0;i<=40;i++) {
        const a=arc.a0+(arc.a1-arc.a0)*(i/40);
        const x=(CENTER+Math.cos(a)*arc.r)*scale, y=(CENTER+Math.sin(a)*arc.r)*scale;
        if(i)c.lineTo(x,y);else c.moveTo(x,y);
      }
      c.stroke();
    }
    c.strokeStyle='#a7af8755';c.lineWidth=1;
    for(const r of [8000,22000,48000]){c.beginPath();c.arc(size/2,size/2,r*scale,0,Math.PI*2);c.stroke();}
    const mark=(x,y,color,r=3)=>ellipse(c,x*scale,y*scale,r,r,color);
    mark(CENTER,CENTER,'#c9c49b',5);
    for(const op of game.outposts||[])mark(op.x,op.y,op.cleared?'#8a9a84':'#d7ae76');
    for(const d of game.dungeons||[]) {
      const color=d.cleared?'#8a9a84':d.kind==='town'?'#e1cf9d':d.kind==='ruin'?'#8d7b68':'#d7b56a';
      mark(d.entrance.x,d.entrance.y,color,d.kind?3.4:4);
    }
    for(const m of game.monsters||[])if(m.isColossal)mark(m.x,m.y,'#d5836c',5);
    if(game.player)mark(game.player.x,game.player.y,'#e8f2e1',5);
    c.strokeStyle='#e8f2e1';c.lineWidth=1;
    c.strokeRect((game.camera.x-game.width/(2*game.zoom))*scale,(game.camera.y-game.height/(2*game.zoom))*scale,
      game.width/game.zoom*scale,game.height/game.zoom*scale);
  }
}
