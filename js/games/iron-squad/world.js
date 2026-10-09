// 158720 = 310 tiles of 512. Half-width 79360.
// Base walk is 165px/s, so camp to the nearest edge is 481s (8 min 1s).
// 10800 was about 33s and 21600 about 65s. Both were still a short walk.
export const WORLD_SIZE = 158720;
export const WORLD_VERSION = 4;
const TILE = 512, CACHE_LIMIT = 24; // ~24 MiB of tile pixels; view and world density are unchanged
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

// Direction is color, not another distance ring. Combat rings stay where they are.
// East is warm plain, north is mountain, west is marsh, south is salt. Farther land only darkens.
const HOME_R = 3200;
// One threshold for the phase-1 depth pass. Inside it, ground, roads, and spawns stay as they are.
export const HOME_SANCTUARY_RADIUS = 3000;
const ROAD_CORRIDOR_RADIUS = 4000;
const BIOMES = {
  east:  { name:'東の街道平原', grounds:['#2a2418','#201c12','#16120e'], grass:'#6a5830', tree:'oak' },
  south: { name:'南の塩原',     grounds:['#343228','#28261e','#1c1a14'], grass:'#7a7460', tree:'dead' },
  north: { name:'北の山地',     grounds:['#161c20','#12161a','#0e1214'], grass:'#3a4a46', tree:'pine' },
  west:  { name:'西の湿地',     grounds:['#12201c','#0e1816','#0c1210'], grass:'#2a4034', tree:'dead' }
};
const HOME_BIOME = { name:'本陣近郊の草原', ground:'#17241c', grass:'#3a5536', tree:'oak' };
export function eastWestRoadY(x) { return CENTER + Math.sin((x - CENTER) / 710) * 95; }
export function northSouthRoadX(y) { return CENTER + Math.sin((y - CENTER) / 620) * 115; }
export function riverCenterY(x) {
  const cx = x - CENTER;
  return CENTER - 6400 + cx * 0.48 + Math.sin(cx / 1700) * 420;
}
export const biomeAt = (x, y) => {
  const dx = x - CENTER, dy = y - CENTER;
  const d = Math.hypot(dx, dy);
  if (d < HOME_R) return HOME_BIOME;
  const ang = Math.atan2(dy, dx);
  const band = ang > -0.785398 && ang < 0.785398 ? BIOMES.east
    : ang >= 0.785398 && ang < 2.356195 ? BIOMES.south
    : ang >= -2.356195 && ang <= -0.785398 ? BIOMES.north
    : BIOMES.west;
  const step = d < 22000 ? 0 : d < 48000 ? 1 : 2;
  return { name: band.name, ground: band.grounds[step], grass: band.grass, tree: band.tree };
};
// The two old sine roads stay, so towns remain on them. Material changes by arm.
const roadDist = (x, y) => Math.min(
  Math.abs(x - northSouthRoadX(y)),
  Math.abs(y - eastWestRoadY(x))
);
export function routeNameAt(x, y) {
  const ew = Math.abs(y - eastWestRoadY(x));
  const ns = Math.abs(x - northSouthRoadX(y));
  const onEw = ew <= 52, onNs = ns <= 46;
  if (onEw && onNs) return '街道の交差';
  if (onEw) return x >= CENTER ? '東の街道' : '西の板道';
  if (onNs) return y < CENTER ? '北の山道' : '南の塩道';
  if (Math.abs(y - riverCenterY(x)) < 60) return '川筋';
  return '';
}

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
const RIVER_CROSSING_PAD = 68;
export function isNearRiverCrossing(x, y) {
  return Math.abs(y - riverCenterY(x)) <= RIVER_CROSSING_PAD;
}
export function inPeriodicGap(val, period = 1800, gapWidth = 200, offset = 900) {
  const m = (((val - offset) % period) + period) % period;
  return m < gapWidth / 2 || m > period - gapWidth / 2;
}

function ridgeAt(x, y) {
  if (isNearRiverCrossing(x, y)) return null;

  if (x > CENTER - 16000 && x < CENTER + 16000) {
    if (!inPeriodicGap(x - CENTER, 1800, 200)) {
      const ridge = CENTER + 5000 + Math.sin((x - CENTER) / 980) * 110;
      const shade = band(y - ridge, false);
      if (shade) return shade;
    }
  }
  if (x > CENTER - 18000 && x < CENTER + 18000) {
    if (!inPeriodicGap(x - CENTER, 1800, 200)) {
      const ridge = CENTER - 8000 + Math.sin((x - CENTER) / 1100) * 90;
      const shade = band(y - ridge, false);
      if (shade) return shade;
    }
  }
  if (x > CENTER - 22000 && x < CENTER + 22000) {
    if (!inPeriodicGap(x - CENTER, 1800, 200)) {
      const ridge = CENTER + 24000 + Math.sin((x - CENTER) / 1400) * 160;
      const shade = band(y - ridge, true);
      if (shade) return shade;
    }
  }
  if (y > CENTER - 14000 && y < CENTER + 14000) {
    if (!inPeriodicGap(y - CENTER, 1800, 200)) {
      const ridge = CENTER - 6400 + Math.sin((y - CENTER) / 860) * 80;
      const dx = x - ridge;
      if (dx > -16 && dx <= 0) return LIP;
      if (dx > 0 && dx <= 46) return FACE;
      if (dx > 46 && dx <= 64) return DROP;
    }
  }
  const d = Math.hypot(x - CENTER, y - CENTER);
  if (d < 15000 || d > 66000) return null;
  const ang = Math.atan2(y - CENTER, x - CENTER);
  for (const arc of ARCS) {
    if (!angleIn(ang, arc.a0, arc.a1)) continue;
    if (inPeriodicGap(arc.r * ang, 2000, 220, 1000)) continue;
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

// Phase 2: painted cliff faces outside the sanctuary stop walking. Roads and the
// approach to fixed landmarks stay open, so each face can be walked around.
// Decorative shoulders do not collide, and there is no invisible hole in a face.
const ROAD_GATE = 130;
const DUNGEON_GATES = [[-2600, -2400], [4600, 4400], [7200, -7000], [42000, 42000]];
function nearFixedLandmark(x, y) {
  for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 4; i++) {
    const angle = (i * 90 + 45 + ring * 22) * Math.PI / 180;
    const radius = [1800, 4500, 7800][ring];
    const dx = x - (CENTER + Math.cos(angle) * radius);
    const dy = y - (CENTER + Math.sin(angle) * radius);
    if (dx * dx + dy * dy < 200 * 200) return true;
  }
  for (const [ox, oy] of DUNGEON_GATES) {
    const dx = x - (CENTER + ox), dy = y - (CENTER + oy);
    if (dx * dx + dy * dy < 240 * 240) return true;
  }
  for (const s of SETTLEMENTS) {
    const dx = x - (CENTER + s.ox), dy = y - (CENTER + s.oy);
    if (dx * dx + dy * dy < 280 * 280) return true;
  }
  return false;
}
export function fieldBlocks(x, y, works=[]) {
  for(const p of works){
    const dx=x-p.x,dy=y-p.y;
    if(p.boundX!==undefined&&(Math.abs(dx)>p.boundX||Math.abs(dy)>p.boundY))continue;
    const c=p.c??Math.cos(p.angle||0),s=p.s??Math.sin(p.angle||0);
    if(Math.abs(dx*c+dy*s)>p.w/2||Math.abs(-dx*s+dy*c)>p.h/2)continue;
    if(p.done)return false;
    if(p.kind==='bridge'||p.kind==='landfill')return true;
  }
  const dx = x - CENTER, dy = y - CENTER;
  if (dx * dx + dy * dy <= HOME_SANCTUARY_RADIUS * HOME_SANCTUARY_RADIUS) return false;
  if (roadDist(x, y) <= ROAD_GATE) return false;
  if (isNearRiverCrossing(x, y)) return false;
  if (reliefAt(x, y) !== FACE) return false;
  if (nearFixedLandmark(x, y)) return false;
  return true;
}
export function settleUnit(unit, blocked) {
  if (!unit || !Number.isFinite(unit.x) || !Number.isFinite(unit.y) || typeof blocked !== 'function') return false;
  if (!blocked(unit.x, unit.y)) {
    unit._openX = unit.x;
    unit._openY = unit.y;
    return false;
  }
  const ox = unit._openX, oy = unit._openY;
  if (Number.isFinite(ox) && Number.isFinite(oy) && !blocked(ox, oy)) {
    if (!blocked(unit.x, oy)) { unit.y = oy; unit._openX = unit.x; unit._openY = unit.y; return true; }
    if (!blocked(ox, unit.y)) { unit.x = ox; unit._openX = unit.x; unit._openY = unit.y; return true; }
    unit.x = ox;
    unit.y = oy;
    return true;
  }
  for (const dist of [18, 36, 54, 78, 108, 140]) {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const nx = unit.x + Math.cos(a) * dist, ny = unit.y + Math.sin(a) * dist;
      if (!blocked(nx, ny)) {
        unit.x = nx;
        unit.y = ny;
        unit._openX = nx;
        unit._openY = ny;
        return true;
      }
    }
  }
  return false;
}

function tileNearRoad(x0, y0) {
  const yOverlap = y0 < CENTER + 170 && y0 + TILE > CENTER - 170;
  const xOverlap = x0 < CENTER + 190 && x0 + TILE > CENTER - 190;
  return yOverlap || xOverlap;
}
function tileNearRiver(x0, y0) {
  const yA = riverCenterY(x0), yB = riverCenterY(x0 + TILE);
  const lo = Math.min(yA, yB) - 100, hi = Math.max(yA, yB) + 100;
  return y0 < hi && y0 + TILE > lo;
}
function paintRoadCell(c, x, y, wx, wy) {
  const ew = wy - eastWestRoadY(wx);
  const ns = wx - northSouthRoadX(wy);
  const aew = Math.abs(ew), ans = Math.abs(ns);
  const useEw = aew <= 52 && (ans > 46 || aew <= ans);
  if (useEw) {
    const east = wx >= CENTER;
    const half = east ? 48 : 34;
    if (aew > half) return false;
    let col;
    if (east) col = aew < 7 ? '#5a4632' : aew < 28 ? '#8a7048' : aew > 40 ? '#3e3628' : '#6a5840';
    else {
      const plank = ((Math.floor(wx / 18) ^ Math.floor(wy / 18)) & 1) === 0;
      col = aew < 22 ? (plank ? '#5c4634' : '#3a2c22') : '#241c16';
    }
    c.fillStyle = col;
    c.fillRect(x, y, 4, 4);
    paintMile(c, x, y, wx, wy, true, east);
    return true;
  }
  if (ans > 46) return false;
  const north = wy < CENTER;
  const half = north ? 34 : 46;
  if (ans > half) return false;
  let col;
  if (north) {
    col = ans < 6 ? '#8a9088' : ans < 18 ? '#6a7068' : '#3e4440';
    if (ans > 24 && ((Math.floor(wy / 26) + Math.floor(wx / 19)) % 4) === 0) col = '#2e3330';
  } else col = ans < 10 ? '#c2bba6' : ans < 28 ? '#8e8874' : '#5c584c';
  c.fillStyle = col;
  c.fillRect(x, y, 4, 4);
  paintMile(c, x, y, wx, wy, false, north);
  return true;
}
function paintMile(c, x, y, wx, wy, horizontal, light) {
  const along = (horizontal ? wx : wy) - CENTER;
  if (Math.abs(along) < 900) return;
  const m = Math.abs(along % 1400);
  if (m > 8 && m < 1392) return;
  c.fillStyle = light ? '#d7c4a2' : '#3a3428';
  c.fillRect(x, y, 4, 4);
}
function paintRiverCell(c, x, y, wx, wy) {
  if (roadDist(wx, wy) <= 26) return;
  const across = Math.abs(wy - riverCenterY(wx));
  if (across > 58) return;
  c.fillStyle = across < 20 ? '#1a3036' : across < 36 ? '#24383a' : '#2c3830';
  c.fillRect(x, y, 4, 4);
}
function paintRoutes(c, x0, y0) {
  const nearRoad = tileNearRoad(x0, y0);
  const nearRiver = tileNearRiver(x0, y0);
  if (!nearRoad && !nearRiver) return;
  for (let y = 0; y < TILE; y += 4) for (let x = 0; x < TILE; x += 4) {
    const wx = x0 + x + 2, wy = y0 + y + 2;
    const deck = nearRoad && paintRoadCell(c, x, y, wx, wy);
    if (nearRiver && !deck) paintRiverCell(c, x, y, wx, wy);
  }
}
function findBridgeX() {
  let lo = CENTER + 7000, hi = CENTER + 18000;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (riverCenterY(mid) < eastWestRoadY(mid)) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function buildMarks() {
  const marks = [];
  const put = (x, y, type, extra) => marks.push({ x, y, type, s: 1, ...extra });
  const bx = findBridgeX();
  put(bx, eastWestRoadY(bx), 'bridge');
  put(CENTER + 7200, eastWestRoadY(CENTER + 7200), 'gate', { axis: 'h' });
  put(CENTER + 4600, eastWestRoadY(CENTER + 4600) - 210, 'oak', { s: 3.05, tone: 0, ph: 1.2 });
  put(CENTER + 15200, eastWestRoadY(CENTER + 15200) + 6, 'crate', { s: 1.25 });
  put(CENTER + 15236, eastWestRoadY(CENTER + 15236) + 16, 'barrel', { s: 1 });
  const passY = CENTER - 8000;
  const passX = northSouthRoadX(passY);
  put(passX - 78, passY + 8, 'cairn');
  put(passX + 86, passY + 24, 'cairn');
  put(passX, passY - 70, 'gate', { axis: 'v' });
  const saltY = CENTER + 9000;
  const saltX = northSouthRoadX(saltY);
  put(saltX + 70, saltY, 'column', { s: 1.7 });
  put(saltX + 104, saltY + 34, 'column', { s: 1.15 });
  put(saltX + 46, saltY + 52, 'column', { s: 1.4 });
  const step = 2600;
  for (let t = step; t < 76000; t += step) {
    put(CENTER + t, eastWestRoadY(CENTER + t), 'waystone', { dir: 'e' });
    put(CENTER - t, eastWestRoadY(CENTER - t), 'waystone', { dir: 'w' });
    put(northSouthRoadX(CENTER - t), CENTER - t, 'waystone', { dir: 'n' });
    put(northSouthRoadX(CENTER + t), CENTER + t, 'waystone', { dir: 's' });
  }
  return marks.filter(m => {
    if (m.type !== 'waystone') return true;
    if (Math.hypot(m.x - CENTER, m.y - CENTER) < 900) return false;
    for (const s of SETTLEMENTS) {
      if (Math.abs(m.x - CENTER - s.ox) < 520 && Math.abs(m.y - CENTER - s.oy) < 420) return false;
    }
    for (const other of marks) {
      if (other.type === 'waystone') continue;
      if (Math.hypot(m.x - other.x, m.y - other.y) < 460) return false;
    }
    return true;
  });
}
const ROUTE_MARKS = buildMarks();
const WEST_POOL = { x: CENTER - 9800, y: eastWestRoadY(CENTER - 9800) + 170 };
function paintPictures(c, x0, y0) {
  const lx = WEST_POOL.x - x0, ly = WEST_POOL.y - y0;
  if (lx > -120 && ly > -80 && lx < TILE + 120 && ly < TILE + 80) {
    ellipse(c, lx, ly, 86, 48, '#16302e');
    ellipse(c, lx - 8, ly - 6, 52, 26, '#214240');
    c.strokeStyle = '#5a6840';
    c.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(lx + i * 18, ly + 34);
      c.lineTo(lx + i * 18 + 3, ly - 10);
      c.stroke();
    }
  }
  const name = biomeAt(x0 + TILE / 2, y0 + TILE / 2).name;
  if (name !== '南の塩原' && name !== '北の山地' && name !== '西の湿地') return;
  const tx = Math.floor(x0 / TILE), ty = Math.floor(y0 / TILE);
  for (let i = 0; i < 16; i++) {
    const px = cellHash(tx * 19 + i, ty + 3) * TILE;
    const py = cellHash(tx + 5, ty * 23 + i) * TILE;
    if (roadDist(x0 + px, y0 + py) < 56) continue;
    if (name === '南の塩原') {
      c.fillStyle = i % 3 ? '#7a7568' : '#8e8878';
      c.fillRect(px, py, 7, 3);
    } else if (name === '北の山地') {
      c.fillStyle = '#2a2e2c';
      c.fillRect(px, py, 5, 4);
    } else {
      c.strokeStyle = '#4a5838';
      c.beginPath();
      c.moveTo(px, py + 8);
      c.lineTo(px + 2, py - 6);
      c.stroke();
    }
  }
}
function outsideSanctuary(x, y) {
  return Math.hypot(x - CENTER, y - CENTER) >= HOME_SANCTUARY_RADIUS;
}
function cellFullyOutside(x, y) {
  return outsideSanctuary(x, y) && outsideSanctuary(x + 32, y)
    && outsideSanctuary(x, y + 32) && outsideSanctuary(x + 32, y + 32);
}
// High ground is +1, the drop side is -1. Matches the existing ridges and does not change reliefAt.
function cliffShelf(x, y) {
  if (!outsideSanctuary(x, y)) return 0;
  if (isNearRiverCrossing(x, y)) return 0;
  const horiz = (x0, x1, base, amp, wave, inwardFace) => {
    if (x <= x0 || x >= x1) return 0;
    if (inPeriodicGap(x - CENTER, 1800, 200)) return 0;
    const dy = y - (base + Math.sin((x - CENTER) / wave) * amp);
    if (inwardFace) {
      if (dy > 8 && dy < 96) return 1;
      if (dy < -70 && dy > -160) return -1;
      return 0;
    }
    if (dy < -18 && dy > -120) return 1;
    if (dy > 68 && dy < 150) return -1;
    return 0;
  };
  let shelf = horiz(CENTER - 16000, CENTER + 16000, CENTER + 5000, 110, 980, false);
  if (shelf) return shelf;
  shelf = horiz(CENTER - 18000, CENTER + 18000, CENTER - 8000, 90, 1100, false);
  if (shelf) return shelf;
  shelf = horiz(CENTER - 22000, CENTER + 22000, CENTER + 24000, 160, 1400, true);
  if (shelf) return shelf;
  if (y > CENTER - 14000 && y < CENTER + 14000) {
    if (!inPeriodicGap(y - CENTER, 1800, 200)) {
      const ridge = CENTER - 6400 + Math.sin((y - CENTER) / 860) * 80;
      const dx = x - ridge;
      if (dx < -18 && dx > -110) return 1;
      if (dx > 68 && dx < 140) return -1;
    }
  }
  const d = Math.hypot(x - CENTER, y - CENTER);
  if (d >= 15000 && d <= 66000) {
    const ang = Math.atan2(y - CENTER, x - CENTER);
    for (const arc of ARCS) {
      if (!angleIn(ang, arc.a0, arc.a1)) continue;
      if (inPeriodicGap(arc.r * ang, 2000, 220, 1000)) continue;
      const dy = d - arc.r;
      if (dy > 8 && dy < 90) return 1;
      if (dy < -70 && dy > -150) return -1;
    }
  }
  return 0;
}
function nearSettlement(x, y, pad) {
  for (const s of SETTLEMENTS) {
    if (Math.abs(x - CENTER - s.ox) < s.padW / 2 + pad && Math.abs(y - CENTER - s.oy) < s.padH / 2 + pad) return true;
  }
  return false;
}
function paintShoulder(c, wx, wy, x0, y0) {
  if (Math.hypot(wx - CENTER, wy - CENTER) < ROAD_CORRIDOR_RADIUS) return;
  if (nearSettlement(wx, wy, 180) || reliefAt(wx, wy)) return;
  const h = cellHash(Math.floor(wx / 34), Math.floor(wy / 34));
  if (h < 0.18) return;
  const px = wx - x0, py = wy - y0;
  const name = biomeAt(wx, wy).name;
  if (name.startsWith('北')) {
    c.fillStyle = '#2a241c';
    c.fillRect(px - 2, py + 1, 4, 9);
    c.fillStyle = h > 0.65 ? '#31483a' : '#24382c';
    c.beginPath(); c.moveTo(px, py - 16); c.lineTo(px + 9, py + 3); c.lineTo(px - 9, py + 3); c.fill();
    c.fillStyle = '#b7c3b4';
    c.fillRect(px - 1, py - 15, 2, 3);
  } else if (name.startsWith('南')) {
    c.fillStyle = '#6e6858';
    c.fillRect(px - 9, py - 2, 18, 6);
    c.fillStyle = '#e4dcc4';
    c.fillRect(px - 8, py - 5, 16, 3);
  } else if (name.startsWith('西')) {
    c.fillStyle = '#1a1612';
    c.fillRect(px - 2, py - 13, 4, 16);
    c.fillStyle = '#c3b39a';
    c.fillRect(px - 7, py - 12, 14, 2);
  } else {
    c.fillStyle = '#2e2a24';
    c.fillRect(px - 10, py - 7, 11, 8);
    c.fillRect(px + 2, py - 3, 10, 7);
    c.fillStyle = '#d9d0b8';
    c.fillRect(px - 10, py - 9, 11, 2);
    c.fillRect(px + 2, py - 5, 10, 2);
  }
}
function paintCorridors(c, x0, y0) {
  if (!tileNearRoad(x0, y0)) return;
  const x1 = x0 + TILE, y1 = y0 + TILE;
  for (let wx = x0 + 12; wx < x1; wx += 36) {
    const roadY = eastWestRoadY(wx);
    for (const side of [-1, 1]) {
      const wy = roadY + side * (96 + cellHash(Math.floor(wx / 36), side + 4) * 10);
      if (wy < y0 - 16 || wy >= y1 + 16) continue;
      if (Math.abs(wx - northSouthRoadX(wy)) < 100) continue;
      paintShoulder(c, wx, wy, x0, y0);
    }
  }
  for (let wy = y0 + 12; wy < y1; wy += 36) {
    const roadX = northSouthRoadX(wy);
    for (const side of [-1, 1]) {
      const wx = roadX + side * (92 + cellHash(Math.floor(wy / 36), side + 8) * 10);
      if (wx < x0 - 16 || wx >= x1 + 16) continue;
      if (Math.abs(wy - eastWestRoadY(wx)) < 100) continue;
      paintShoulder(c, wx, wy, x0, y0);
    }
  }
}

export function depthFade(x, y) {
  const d = Math.hypot(x - CENTER, y - CENTER);
  if (d <= HOME_SANCTUARY_RADIUS) return 0;
  return Math.min(1, (d - HOME_SANCTUARY_RADIUS) / 900);
}
let depthReady = false;
const depthImg = {};
function ensureDepthArt() {
  if (depthReady || typeof Image === 'undefined') return;
  depthReady = true;
  for (const [key, file] of [['mist', 'horizon-mist.jpg'], ['ridges', 'horizon-ridges.jpg']]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = new URL(`../../../assets/land/${file}`, import.meta.url).href;
    depthImg[key] = img;
  }
}
let depthBuffer = null;
function depthTarget(w, h) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const width = Math.max(1, Math.ceil(w)), height = Math.max(1, Math.ceil(h));
  if (!depthBuffer) depthBuffer = document.createElement('canvas');
  if (depthBuffer.width < width || depthBuffer.height < height) {
    depthBuffer.width = Math.max(depthBuffer.width, width);
    depthBuffer.height = Math.max(depthBuffer.height, height);
  }
  const b = depthBuffer.getContext('2d');
  if (!b) return null;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalAlpha = 1;
  b.globalCompositeOperation = 'source-over';
  b.clearRect(0, 0, width, height);
  return { b, width, height };
}
function triangleShift(scroll, span) {
  if (span <= 1) return 0;
  const cycle = span * 2;
  const m = ((scroll % cycle) + cycle) % cycle;
  return m <= span ? m : cycle - m;
}
function paintDepthSource(b, w, h, img, scroll) {
  if (img && img.complete && img.naturalWidth) {
    const dw = Math.max(w * 1.45, h * (img.naturalWidth / img.naturalHeight));
    b.drawImage(img, -triangleShift(scroll, dw - w), 0, dw, h);
    return;
  }
  b.fillStyle = '#24303a';
  b.beginPath();
  b.moveTo(0, h * 0.72);
  for (let x = 0; x <= w; x += 36) {
    const n = cellHash(Math.floor((x + scroll) / 36), 11);
    b.lineTo(x, h * (0.38 + n * 0.28));
  }
  b.lineTo(w, h); b.lineTo(0, h); b.fill();
}
function blitDepthBand(ctx, left, top, viewW, bandH, scroll, alpha, img) {
  if (bandH < 12 || alpha <= 0.01) return;
  const layer = depthTarget(viewW, bandH);
  if (!layer || !depthBuffer) return;
  const { b, width, height } = layer;
  paintDepthSource(b, width, height, img, scroll);
  const g = b.createLinearGradient(0, height * 0.4, 0, height);
  if (g && typeof g.addColorStop === 'function') {
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    b.globalCompositeOperation = 'destination-out';
    b.fillStyle = g;
    b.fillRect(0, 0, width, height);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(depthBuffer, 0, 0, width, height, left, top, viewW, bandH);
  ctx.restore();
}
export function drawFieldDepth(ctx, camera, width, height, zoom) {
  if (!ctx || !camera || !Number.isFinite(camera.x) || !Number.isFinite(camera.y)) return;
  const fade = depthFade(camera.x, camera.y);
  if (fade <= 0) return;
  const z = zoom || 1;
  const viewW = width / z, viewH = height / z;
  if (!(viewW > 32) || !(viewH > 32) || viewW > 4200 || viewH > 4200) return;
  ensureDepthArt();
  const left = camera.x - viewW / 2;
  const top = camera.y - viewH / 2;
  const yShift = Math.max(-26, Math.min(26, -(camera.y - CENTER) * 0.01));
  const mistH = Math.min(viewH * 0.1, 92 / z);
  const ridgeH = Math.min(viewH * 0.15, 128 / z);
  blitDepthBand(ctx, left, top + yShift * 0.35, viewW, mistH, camera.x * 0.05 + camera.y * 0.02, fade * 0.34, depthImg.mist);
  blitDepthBand(ctx, left, top + 6 / z + yShift, viewW, ridgeH, camera.x * 0.13, fade * 0.58, depthImg.ridges);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, viewW, ridgeH);
  ctx.clip();
  ctx.globalAlpha = fade * 0.16;
  const drift = camera.x * 0.22;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(214,210,198,0.35)' : 'rgba(8,10,12,0.55)';
    ctx.fillRect(left - 8, top + 3 / z + i * (ridgeH / 6) + ((drift + i * 5) % 5) / z, viewW + 16, 1 / z);
  }
  ctx.restore();
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
  constructor() { this.tiles=new Map(); this.generated=0; this.visibleCamps=[]; ensureDepthArt(); }
  clear() {
    for (const tile of this.tiles.values()) { tile.canvas.width=1; tile.canvas.height=1; }
    this.tiles.clear(); this.visibleCamps=[];
  }
  get(tx,ty) {
    const key=`${tx},${ty}`;
    if(this.tiles.has(key)) {
      const tile=this.tiles.get(key); this.tiles.delete(key);
      if (tile.context?.isContextLost?.() !== true) { this.tiles.set(key,tile); return tile; }
      tile.canvas.width=1; tile.canvas.height=1;
    }
    // Release pixels before allocating: deleting a Map entry alone waits for GC,
    // allowing iOS canvas memory to grow beyond the apparent cache limit.
    while(this.tiles.size>=CACHE_LIMIT) {
      const oldest=this.tiles.keys().next().value, retired=this.tiles.get(oldest);
      retired.canvas.width=1; retired.canvas.height=1; this.tiles.delete(oldest);
    }
    const tile=this.generate(tx,ty); this.tiles.set(key,tile);
    return tile;
  }
  generate(tx,ty) {
    const rnd=seeded(Math.imul(tx+31,73856093)^Math.imul(ty+31,19349663));
    const x0=tx*TILE,y0=ty*TILE;
    const canvas=document.createElement('canvas'); canvas.width=TILE; canvas.height=TILE;
    const c=canvas.getContext('2d'), objects=[], camps=[];
    if (!c) { canvas.width=1; canvas.height=1; throw new Error('地形のCanvasを確保できません'); }
    const may=tileMayHaveRelief(x0,y0);
    // Small cells follow world coordinates, so biome transitions align at tile edges.
    for(let y=0;y<TILE;y+=32) for(let x=0;x<TILE;x+=32) {
      c.fillStyle=biomeAt(x0+x+16,y0+y+16).ground; c.fillRect(x,y,32,32);
      if (!cellFullyOutside(x0 + x, y0 + y)) continue;
      const shelf = cliffShelf(x0 + x + 16, y0 + y + 16);
      if (!shelf) continue;
      c.globalAlpha = shelf > 0 ? 0.13 : 0.2;
      c.fillStyle = shelf > 0 ? '#8a8070' : '#070a09';
      c.fillRect(x, y, 32, 32);
      c.globalAlpha = 1;
    }
    const tileName = biomeAt(x0 + TILE / 2, y0 + TILE / 2).name;
    const mote = tileName.startsWith('東') ? '#a0804024' : tileName.startsWith('南') ? '#b0a88828' : tileName.startsWith('北') ? '#60708024' : tileName.startsWith('西') ? '#40605028' : '#81936920';
    for(let i=0;i<45;i++) {
      const x=rnd()*TILE,y=rnd()*TILE,r=15+rnd()*55;
      const g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,i%2?mote:'#101c1828');g.addColorStop(1,'#00000000');
      c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
    // Cliff lip, face and shadow, then roads so a road reads as a cut through the face.
    if(may) {
      for(let y=0;y<TILE;y+=4) for(let x=0;x<TILE;x+=4) {
        const wx=x0+x+2, wy=y0+y+2;
        const shade=reliefAt(wx,wy);
        if(!shade) continue;
        c.fillStyle=shade; c.fillRect(x,y,4,4);
        if (shade === LIP && outsideSanctuary(wx, wy)) {
          c.fillStyle = '#8e9286';
          c.fillRect(x, y, 4, 2);
        }
      }
    }
    paintRoutes(c, x0, y0);
    for(let i=0;i<260;i++) {
      const x=rnd()*TILE,y=rnd()*TILE,wx=x+x0,wy=y+y0;
      const d=roadDist(wx,wy),b=biomeAt(wx,wy);
      if(d<26) { c.fillStyle='#b2a17b55';c.fillRect(x,y,1+rnd()*2,1);continue; }
      if(may && reliefAt(wx,wy)) continue;
      c.strokeStyle=b.grass;c.globalAlpha=.14+rnd()*.16;c.lineWidth=1;
      c.beginPath();c.moveTo(x-2,y-4);c.lineTo(x,y);c.lineTo(x+2,y-5-rnd()*3);c.stroke();
    }
    c.globalAlpha=1;
    paintPictures(c, x0, y0);
    paintCorridors(c, x0, y0);
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
        camps.push({id:`camp_${tx}_${ty}`,x:x0+fx,y:y0+fy});
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
    for (const m of ROUTE_MARKS) {
      if (m.x < x0 || m.x >= x1 || m.y < y0 || m.y >= y1) continue;
      objects.push({ type: m.type, x: m.x, y: m.y, s: m.s, axis: m.axis, dir: m.dir, tone: m.tone || 0, ph: m.ph || 0 });
    }
    this.generated++;
    return {canvas,context:c,objects,camps,x:x0,y:y0};
  }
  draw(c,camera,width,height,zoom) {
    const margin=150,hw=width/(2*zoom)+margin,hh=height/(2*zoom)+margin;
    const minX=Math.max(0,Math.floor((camera.x-hw)/TILE));
    const maxX=Math.min(Math.ceil(WORLD_SIZE/TILE)-1,Math.floor((camera.x+hw)/TILE));
    const minY=Math.max(0,Math.floor((camera.y-hh)/TILE));
    const maxY=Math.min(Math.ceil(WORLD_SIZE/TILE)-1,Math.floor((camera.y+hh)/TILE));
    const objects=[], camps=[];
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
      const tile=this.get(x,y);c.drawImage(tile.canvas,tile.x,tile.y);objects.push(...tile.objects);camps.push(...tile.camps);
    }
    this.visibleCamps=camps;
    return objects;
  }
  drawOverview(c,size,game) {
    const scale=size/WORLD_SIZE;
    c.clearRect(0,0,size,size);
    for(let y=0;y<size;y+=6) for(let x=0;x<size;x+=6) {
      c.fillStyle=biomeAt(x/scale,y/scale).ground;c.fillRect(x,y,6,6);
    }
    const arm=(horizontal, sign, color)=>{
      c.strokeStyle=color; c.lineWidth=1.7; c.beginPath();
      const n=40;
      for(let i=0;i<=n;i++){
        const t=(i/n)*(WORLD_SIZE/2-800);
        const x=horizontal?CENTER+sign*t:northSouthRoadX(CENTER+sign*t);
        const y=horizontal?eastWestRoadY(CENTER+sign*t):CENTER+sign*t;
        const sx=x*scale, sy=y*scale;
        if(i)c.lineTo(sx,sy); else c.moveTo(sx,sy);
      }
      c.stroke();
    };
    arm(true, 1, '#c4a574');
    arm(true, -1, '#6a5344');
    arm(false, -1, '#9aa396');
    arm(false, 1, '#d2cbb4');
    c.strokeStyle='#3d646c'; c.lineWidth=1.35; c.beginPath();
    let riverPen=false;
    for(let i=0;i<=72;i++){
      const x=WORLD_SIZE*i/72, y=riverCenterY(x);
      if(y<0 || y>WORLD_SIZE){ riverPen=false; continue; }
      const sx=x*scale, sy=y*scale;
      if(!riverPen){ c.moveTo(sx,sy); riverPen=true; } else c.lineTo(sx,sy);
    }
    c.stroke();
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
