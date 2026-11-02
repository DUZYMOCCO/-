import { WORLD_LAYOUT } from '../data/world_layout.js';

const DECOR_LAYOUT_CACHE = new WeakMap();

export const SETTLEMENTS = [...WORLD_LAYOUT.towns, ...WORLD_LAYOUT.banditBases];
export function peopleActive(active, distance) { return active ? distance <= 900 : distance < 600; }
export function nearestSettlement(x, z) {
  let best = null;
  for (const p of SETTLEMENTS) {
    const dist = Math.hypot(x - p.x, z - p.z);
    if (!best || dist < best.dist) best = { id: p.id, name: p.name, sizeJa: ({ village:'村', town:'町', city:'都', camp:'野営地', fort:'砦' })[p.size], ownerName: p.ownerName || WORLD_LAYOUT.factions[p.owner]?.name || p.owner, dist };
  }
  return best;
}
function hash(s) { let h=2166136261; for (const c of s) h=Math.imul(h ^ c.charCodeAt(0),16777619); return h>>>0; }
function gateDirection(p) {
  let best=null, bd=Infinity;
  for(const road of WORLD_LAYOUT.roads) for(const q of road.points) {
    const dx=q[0]-p.x, dz=q[1]-p.z, d=Math.hypot(dx,dz);
    if(d>1 && d<bd) { bd=d; best={x:dx/d,z:dz/d}; }
  }
  if(!best) best={x:0,z:1};
  return Math.abs(best.x)>Math.abs(best.z) ? {x:Math.sign(best.x),z:0} : {x:0,z:Math.sign(best.z)};
}
export function planSettlement(p) {
  const gate=gateDirection(p), buildings=[];
  if(p.id==='koba_town') return { id:p.id, gate, buildings, skipped:true };
  const base=p.size==='camp'||p.size==='fort', city=p.size==='city', town=p.size==='town';
  const count=city?16:town?8:p.size==='fort'?6:base?3:4;
  const radius=p.radius;
  const add=(kind,x,z,w,d,h,color,rotY=0)=>buildings.push({kind,x:p.x+x,z:p.z+z,w,d,h,rotY,color});
  // Rings reserve the centre for a plaza and leave a radial approach to the gate.
  const slots=[], w=city?8:town?7:base?5:6, d=w, edge=radius*.64;
  const step=city?13:town?12:base?8:10;
  for(let z=-radius;z<=radius;z+=step) for(let x=-radius;x<=radius;x+=step) {
    if(Math.hypot(x,z)<step*.8 || Math.hypot(x,z)>radius*.57) continue;
    if(Math.abs(x)+w/2>edge-1.5 || Math.abs(z)+d/2>edge-1.5) continue;
    if((x*gate.x+z*gate.z)>0 && Math.abs(x*gate.z-z*gate.x)<step*.65) continue;
    slots.push({x,z,score:hash(p.id+':'+x+':'+z)});
  }
  slots.sort((a,b)=>a.score-b.score);
  if(city||town) {
    const hall=slots.shift(), hw=city?w*1.6:w, hd=city?d*1.4:d;
    if(hall) { add('hall',hall.x,hall.z,hw,hd,city?7:5,'#b4a791');
      for(let i=slots.length-1;i>=0;i--) if(Math.abs(slots[i].x-hall.x)<(w+hw)/2+1 && Math.abs(slots[i].z-hall.z)<(d+hd)/2+1) slots.splice(i,1);
    }
  }
  for(let i=0;i<Math.min(count,slots.length);i++) add(base?(i%2?'tent':'shack'):(i===0?'shop':'house'),slots[i].x,slots[i].z,w,d,base?3:4,'#aa9981');

  if(p.watch||p.size==='fort'||city) { const s=slots[count]; if(s) add('tower',s.x,s.z,w*.55,d*.55,12,'#948579'); }
  const wallType=base?(p.size==='fort'?'palisade':'fence'):p.walls;
  if(wallType && wallType!=='none') {
    const n=8, length=edge*2/n, thick=wallType==='stone'?2:0.7, h=wallType==='stone'?5:wallType==='palisade'?3:1.3;
    for(let side=0;side<4;side++) for(let i=0;i<n;i++) {
      let along=-edge+(i+.5)*length; const sx=side===0?1:side===1?-1:0, sz=side===2?1:side===3?-1:0;
      if(sx===gate.x && sz===gate.z && (i===3||i===4)) continue;
      const trim=(i===0||i===n-1)?thick/2+.2:0;
      along += i===0?trim/2:i===n-1?-trim/2:0;
      const x=sx?edge*sx:along, z=sz?edge*sz:along;
      add('wall',x,z,sx?thick:length-.25-trim,sz?thick:length-.25-trim,h,wallType==='stone'?'#85827d':'#795c40');
    }
  }
  return {id:p.id,gate,buildings,skipped:false};
}
export const SETTLEMENT_PLANS = SETTLEMENTS.map(planSettlement);

export function settlementGateParts(p, plan, baseY = 0) {
  const wallType = p.size === 'fort' ? 'palisade' : p.walls;
  if (!wallType || wallType === 'none') return [];
  const height = wallType === 'stone' ? 5 : wallType === 'palisade' ? 3 : 2;
  const thickness = wallType === 'stone' ? 1.4 : 0.65;
  const edge = p.radius * 0.64, gap = edge * 0.25;
  const gx = p.x + plan.gate.x * edge, gz = p.z + plan.gate.z * edge;
  const parts = [];
  for (const side of [-1, 1]) {
    const x = gx + plan.gate.z * gap * side;
    const z = gz - plan.gate.x * gap * side;
    parts.push({ kind: 'post', x, z, w: thickness, d: thickness, h: height, cy: baseY + height / 2 });
    const capHeight = Math.min(0.28, thickness * 0.35);
    parts.push({ kind: 'cap', x, z, w: thickness + 0.2, d: thickness + 0.2, h: capHeight, cy: baseY + height + capHeight / 2 });
  }
  return parts;
}

// 町の生活小物。中央の入口通路から離し、建物の範囲にも入らない見た目だけの配置。
function pointSegmentDistance(q, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.z - a.z) * dz) / length2)) : 0;
  return Math.hypot(q.x - a.x - dx * t, q.z - a.z - dz * t);
}

function decorReservations(p, plan, state) {
  const out = [];
  const addBox = (o, pad = 0) => {
    if (!o || !Number.isFinite(o.x) || !Number.isFinite(o.z)) return;
    const w = Number(o.w), d = Number(o.d);
    if (!(w > 0) || !(d > 0)) return;
    out.push({ x: o.x, z: o.z, hw: w / 2 + pad, hd: d / 2 + pad });
  };
  const addCircle = (o, pad = 0) => {
    if (!o || !Number.isFinite(o.x) || !Number.isFinite(o.z)) return;
    out.push({ x: o.x, z: o.z, r: Math.max(0, Number(o.r) || 0) + pad });
  };

  for (const b of plan.buildings || []) addBox(b);
  for (const lot of saleLots(p, state)) addBox(lot, 2.8);

  // コバ町の家・店・番所は state.buildings / state.town から別に作られる。
  // 建物計画を再生成せず、既存 footprint と戸口・店先だけを空き地判定に使う。
  if (p.id === 'koba_town' && state) {
    for (const b of state.buildings || []) {
      if (b.kind === 'fence' || Math.hypot(b.x - p.x, b.z - p.z) > p.radius + 12) continue;
      addBox(b, 2.2);
    }
    for (const h of state.town?.houses || []) {
      if (Math.hypot(h.x - p.x, h.z - p.z) > p.radius + 12) continue;
      addBox(h, 2.2);
      addCircle(h.door, 2.3);
      if (h.type === 'shop' || h.type === 'post') addCircle(h.counter, 2.8);
    }
    for (const rock of state.rocks || []) {
      if (Math.hypot(rock.x - p.x, rock.z - p.z) <= p.radius + 8) addCircle(rock, 1.4);
    }
    for (const prop of state.props || []) {
      if (Math.hypot(prop.x - p.x, prop.z - p.z) > p.radius + 8) continue;
      if (prop.kind === 'tree') addCircle(prop, 1.2);
      else addBox(prop, 1.6);
    }
    for (const actor of state.actors || []) {
      if (actor.job !== 'shopkeeper' && actor.job !== 'post_guard' && !actor.settlementGate) continue;
      if (Math.hypot(actor.x - p.x, actor.z - p.z) <= p.radius + 8) addCircle(actor, 1.8);
    }
    const spawn = WORLD_LAYOUT.spawn;
    if (spawn?.town === p.id) addCircle(spawn, 5.5);
  }
  return out;
}

function overlapsPoint(q, pad, obstacle) {
  if (obstacle.r !== undefined) return Math.hypot(q.x - obstacle.x, q.z - obstacle.z) < pad + obstacle.r;
  return Math.abs(q.x - obstacle.x) < pad + obstacle.hw && Math.abs(q.z - obstacle.z) < pad + obstacle.hd;
}

function kobaPlaza(p, gatePoint, reservations) {
  const edge = p.radius * 0.64;
  const preferred = { x: p.x - 26, z: p.z + 17 };
  let best = null;
  for (let z = p.z - edge + 6; z <= p.z + edge - 6; z += 2) {
    for (let x = p.x - edge + 6; x <= p.x + edge - 6; x += 2) {
      const q = { x, z };
      if (Math.hypot(x - p.x, z - p.z) > edge - 5) continue;
      if (Math.hypot(x - WORLD_LAYOUT.spawn.x, z - WORLD_LAYOUT.spawn.z) < 10) continue;
      if (reservations.some((o) => overlapsPoint(q, 5, o))) continue;
      let routeClear = true;
      const steps = Math.max(1, Math.ceil(Math.hypot(gatePoint.x - x, gatePoint.z - z) / 2));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const point = { x: gatePoint.x + (x - gatePoint.x) * t, z: gatePoint.z + (z - gatePoint.z) * t };
        if (Math.hypot(point.x - WORLD_LAYOUT.spawn.x, point.z - WORLD_LAYOUT.spawn.z) < 7.8 || reservations.some((o) => overlapsPoint(point, 2.2, o))) {
          routeClear = false;
          break;
        }
      }
      if (!routeClear) continue;
      const score = Math.hypot(x - preferred.x, z - preferred.z);
      if (!best || score < best.score) best = { ...q, score };
    }
  }
  return best ? { x: best.x, z: best.z } : { x: p.x, z: p.z };
}

// コバ町の物干し台: 住居（店・番所以外を優先）の外壁の面から1〜4m、壁と平行に置く。
// 沿壁方向は建物の半幅+4.2（既存の空き地判定と同じ余白）より外側だけを候補にし、
// 家・戸口・店先・売り区画・ほかの飾りと重ならない位置だけを選ぶ。見つからなければ null。
function kobaLaundrySpot(p, state, reservations, gatePoint, center, out, edge) {
  const all = state && state.town && Array.isArray(state.town.houses) ? state.town.houses : null;
  // コバ町の家だけ（ほかの町の家は対象外）。店・番所以外の家を優先する。
  const houses = all ? all.filter((h) => Math.hypot(h.x - p.x, h.z - p.z) <= p.radius + 12) : null;
  if (!houses || !houses.length) return null;
  const homes = houses.filter((h) => h.type !== 'shop' && h.type !== 'post');
  const pool = (homes.length ? homes : houses).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)) || a.x - b.x || a.z - b.z);
  const lots = saleLots(p, state);
  const doors = houses.map((h) => ({ x: h.door.x, z: h.door.z }));
  const counters = houses.filter((h) => h.type === 'shop' || h.type === 'post').map((h) => ({ x: h.counter.x, z: h.counter.z }));
  const sides = [
    { nx: 0, nz: 1 }, { nx: 1, nz: 0 }, { nx: 0, nz: -1 }, { nx: -1, nz: 0 },
  ];
  const pad = 2; // findDecorSpot の laundry と同じ空き
  const ok = (q) => {
    if (pointSegmentDistance(q, center, gatePoint) < 4.9) return false;
    if (Math.hypot(q.x - p.x, q.z - p.z) + pad > edge - 1) return false;
    if (reservations.some((o) => overlapsPoint(q, pad, o))) return false;
    if (out.some((o) => Math.hypot(q.x - o.x, q.z - o.z) < (o.kind === 'stall' ? 3.1 : 2.1))) return false;
    if (doors.some((d) => Math.hypot(q.x - d.x, q.z - d.z) < 4.6)) return false;
    if (counters.some((c) => Math.hypot(q.x - c.x, q.z - c.z) < 5)) return false;
    if (lots.some((lot) => Math.abs(q.x - lot.x) < lot.w / 2 + pad + 2.9 && Math.abs(q.z - lot.z) < lot.d / 2 + pad + 2.9)) return false;
    return true;
  };
  const distances = [1.5, 2.1, 2.7, 3.3];
  const alongs = [4.3, 5.0, 5.7];
  for (const h of pool) {
    // 戸口のある壁は最後に回す
    const ordered = sides.slice().sort((a, b) =>
      ((a.nx === h.door.nx && a.nz === h.door.nz) ? 1 : 0) - ((b.nx === h.door.nx && b.nz === h.door.nz) ? 1 : 0));
    for (const side of ordered) {
      const alongX = side.nz !== 0; // 壁が x 方向に走る壁か
      const half = alongX ? h.w / 2 : h.d / 2;
      const right = { x: alongX ? 1 : 0, z: alongX ? 0 : 1 };
      for (const dist of distances) {
        for (const along of alongs) {
          for (const sign of [1, -1]) {
            const a = sign * (half + along);
            const q = alongX
              ? { x: h.x + a, z: h.z + side.nz * (h.d / 2 + dist) }
              : { x: h.x + side.nx * (h.w / 2 + dist), z: h.z + a };
            if (!ok(q)) continue;
            return { kind: 'laundry', x: q.x, z: q.z, rot: Math.atan2(-right.z, right.x), forward: { x: side.nx, z: side.nz }, right };
          }
        }
      }
    }
  }
  return null;
}

const DECOR_SPOTS = Object.freeze([
  [2.2, -5.4], [2.2, 5.4], [-2.2, -5.4], [-2.2, 5.4],
  [6.2, -5.4], [-6.2, -4.9], [-5.7, 4.9], [7.8, 7.2], [-8.1, 6.8],
  [10.5, -8.0], [-11.0, -7.5], [12.2, 3.0], [-12.5, 1.6],
  [3.5, -10.5], [-3.5, 10.5], [15, -3.5], [-15, 4.5],
  [18, 7], [-18, -8], [0, -14], [0, 14],
]);

function findDecorSpot(kind, base, center, forward, right, gatePoint, reservations, out, edge) {
  const pad = kind === 'stall' ? 2.25 : kind === 'well' ? 1.25 : kind === 'laundry' ? 2 : 1.25;
  for (const [f, s] of [base, ...DECOR_SPOTS]) {
    const q = { x: center.x + forward.x * f + right.x * s, z: center.z + forward.z * f + right.z * s };
    if (pointSegmentDistance(q, center, gatePoint) < 4.5 + (kind === 'stall' ? 0.8 : 0.4)) continue;
    if (Math.hypot(q.x - center.townX, q.z - center.townZ) + pad > edge - 1) continue;
    if (reservations.some((o) => overlapsPoint(q, pad, o))) continue;
    if (out.some((o) => Math.hypot(q.x - o.x, q.z - o.z) < (kind === 'stall' && o.kind === 'stall' ? 4.2 : kind === 'stall' || o.kind === 'stall' ? 3.1 : 2.1))) continue;
    return { kind, x: q.x, z: q.z, rot: Math.atan2(-right.z, right.x), forward, right };
  }
  return null;
}

export function planSettlementDecorLayout(p, plan = planSettlement(p), state = null) {
  if (!p || !plan || !['village', 'town', 'city'].includes(p.size)) {
    return { center: p ? { x: p.x, z: p.z } : { x: 0, z: 0 }, gatePoint: null, decor: [] };
  }
  if (state && typeof state === 'object') {
    let cache = DECOR_LAYOUT_CACHE.get(state);
    if (!cache) { cache = new Map(); DECOR_LAYOUT_CACHE.set(state, cache); }
    // 町の家は state.town が後から作られる（collide.js が先に布局部を要求する）。
    // town.v の改訂で作り直す（collide.js の INDEX_CACHE と同じ考え方）。
    const townRev = state.town ? (state.town.v || 0) : -1;
    const cached = cache.get(p.id);
    if (cached && cached.townRev === townRev) return cached.layout;
  }

  const gate = plan.gate;
  const edge = p.radius * 0.64;
  const gatePoint = { x: p.x + gate.x * edge, z: p.z + gate.z * edge };
  const reservations = decorReservations(p, plan, state);
  const center = p.id === 'koba_town' ? kobaPlaza(p, gatePoint, reservations) : { x: p.x, z: p.z };
  const dx = gatePoint.x - center.x, dz = gatePoint.z - center.z, length = Math.hypot(dx, dz) || 1;
  const forward = { x: dx / length, z: dz / length };
  const right = { x: forward.z, z: -forward.x };
  center.townX = p.x; center.townZ = p.z;
  const out = [];
  const add = (kind, f, s) => {
    const item = findDecorSpot(kind, [f, s], center, forward, right, gatePoint, reservations, out, edge);
    if (item) out.push(item);
    return !!item;
  };
  const stallForwards = p.size === 'city' ? [-2.2, -2.2, 2.2, 2.2] : p.size === 'town' ? [2.2, 2.2] : [3.0];
  const stallSides = p.size === 'city' ? [-1, 1, -1, 1] : p.size === 'town' ? [-1, 1] : [1];
  for (let i = 0; i < stallSides.length; i += 1) add('stall', stallForwards[i], stallSides[i] * 5.4);
  add('well', -6.2, -4.9);
  add('hearth', -5.7, 4.9);
  const laundry = p.id === 'koba_town' ? kobaLaundrySpot(p, state, reservations, gatePoint, center, out, edge) : null;
  if (laundry) out.push(laundry);
  else add('laundry', 6.2, -5.4);
  const layout = { center: { x: center.x, z: center.z }, gatePoint, forward, right, decor: out };
  if (state && typeof state === 'object') {
    const townRev = state.town ? (state.town.v || 0) : -1;
    DECOR_LAYOUT_CACHE.get(state).set(p.id, { layout, townRev });
  }
  return layout;
}

export function planSettlementDecor(p, plan = planSettlement(p), state = null) {
  return planSettlementDecorLayout(p, plan, state).decor;
}

function rotatedBox(x, z, w, d, rot) {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  return { shape: 'box', x, z, hw: (c * w + s * d) / 2, hd: (s * w + c * d) / 2 };
}

export function settlementDecorColliders(decor = []) {
  const out = [];
  for (const item of decor) {
    if (item.kind === 'stall') {
      out.push({ ...rotatedBox(item.x, item.z, 3.18, 2, item.rot), floor: 0 });
      const barrel = { x: item.x + item.right.x * 1.9, z: item.z + item.right.z * 1.9 };
      out.push({ shape: 'circle', x: barrel.x, z: barrel.z, r: 0.36, floor: 0 });
      const crate = { x: item.x - item.forward.x * 1.75, z: item.z - item.forward.z * 1.75 };
      out.push({ ...rotatedBox(crate.x, crate.z, 0.72, 0.66, item.rot), floor: 0 });
    } else if (item.kind === 'well') {
      out.push({ shape: 'circle', x: item.x, z: item.z, r: 0.8, floor: 0 });
    }
  }
  return out;
}

// 売り区画は既存計画と同じ候補格子・並びから、建物と塔が使った後の枠だけを返す。
// 既存の planSettlement の出力には手を加えない。
function saleSlots(p) {
  const base=p.size==='camp'||p.size==='fort', city=p.size==='city', town=p.size==='town';
  const radius=p.radius, w=city?8:town?7:base?5:6, d=w, edge=radius*.64;
  const step=city?13:town?12:base?8:10, gate=gateDirection(p), slots=[];
  for(let z=-radius;z<=radius;z+=step) for(let x=-radius;x<=radius;x+=step) {
    if(Math.hypot(x,z)<step*.8 || Math.hypot(x,z)>radius*.57) continue;
    if(Math.abs(x)+w/2>edge-1.5 || Math.abs(z)+d/2>edge-1.5) continue;
    if((x*gate.x+z*gate.z)>0 && Math.abs(x*gate.z-z*gate.x)<step*.65) continue;
    slots.push({x,z,score:hash(p.id+':'+x+':'+z)});
  }
  slots.sort((a,b)=>a.score-b.score);
  if(city||town) {
    const hall=slots.shift();
    if(hall) for(let i=slots.length-1;i>=0;i--) if(Math.abs(slots[i].x-hall.x)<(w+w* (city?1.6:1))/2+1 && Math.abs(slots[i].z-hall.z)<(d+d*(city?1.4:1))/2+1) slots.splice(i,1);
  }
  return {slots,w,count:city?16:town?8:p.size==='fort'?6:base?3:4,tower:!!(p.watch||p.size==='fort'||city)};
}

function localTh(...parts) {
  let h=2166136261>>>0;
  for(const part of parts) {
    const s=String(part);
    for(let i=0;i<s.length;i++) { h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
    h^=0x2f; h=Math.imul(h,16777619);
  }
  h^=h>>>13; h=Math.imul(h,0x5bd1e995); h^=h>>>15;
  return (h>>>0)/4294967296;
}

function kobaSaleLots(p, state) {
  const w=6, d=w, candidates=[];
  const roads=Array.isArray(state?.roads)?state.roads:[];
  const ownedHouses=(state?.town?.houses||[]).filter(h=>h.owner==='player');
  const buildings=(Array.isArray(state?.buildings)?state.buildings:[]).filter(b=>!ownedHouses.some(h=>Math.abs(b.x-h.x)<0.01&&Math.abs(b.z-h.z)<0.01));
  const existingHouses=(state?.town?.houses||[]).filter(h=>h.owner!=='player');
  const obstacles=[...(state?.rocks||[]),...(state?.props||[])];
  for(let z=-p.radius+5;z<=p.radius-5;z+=4) for(let x=-p.radius+5;x<=p.radius-5;x+=4) {
    const wx=p.x+x, wz=p.z+z;
    if(Math.hypot(x,z)>p.radius-w*.8) continue;
    const nearRoad=roads.some((q,i)=>{
      if(i===0||!q) return false; const a=roads[i-1];
      const vx=q.x-a.x,vz=q.z-a.z,l=vx*vx+vz*vz;
      const t=l?Math.max(0,Math.min(1,((wx-a.x)*vx+(wz-a.z)*vz)/l)):0;
      return Math.hypot(wx-a.x-vx*t,wz-a.z-vz*t)<6;
    });
    if(nearRoad) continue;
    const collides=buildings.some(b=>b.kind!=='fence'&&Math.abs(wx-b.x)<(w+b.w)/2+0.4&&Math.abs(wz-b.z)<(w+b.d)/2+0.4) ||
      existingHouses.some(h=>Math.abs(wx-h.x)<(w+h.w)/2+0.4&&Math.abs(wz-h.z)<(w+h.d)/2+0.4) ||
      obstacles.some(o=>Math.hypot(wx-o.x,wz-o.z)<w/2+(o.r||1)+0.4);
    if(collides) continue;
    candidates.push({x:wx,z:wz,score:localTh(state?.seed||0,p.id,x,z)});
  }
  candidates.sort((a,b)=>a.score-b.score || a.x-b.x || a.z-b.z);
  const chosen=[];
  for(const q of candidates) {
    if(chosen.some(o=>Math.abs(q.x-o.x)<w+0.4&&Math.abs(q.z-o.z)<d+0.4)) continue;
    chosen.push(q); if(chosen.length===2) break;
  }
  return chosen.map((q,i)=>({id:`${p.id}:lot${i+1}`,townId:p.id,x:q.x,z:q.z,w,d:w,marketId:'town1'}));
}

export function saleLots(p, state = null) {
  if (p && WORLD_LAYOUT.banditBases.some((base) => base.id === p.id)) return [];
  if (!p || !['village','town','city'].includes(p.size)) return [];
  if (p.id==='koba_town') return kobaSaleLots(p,state);
  const {slots,w,count,tower}=saleSlots(p);
  const houseCount=Math.min(count,slots.length);
  const used=houseCount+(tower&&slots[houseCount]?1:0);
  const saleCount=p.size==='village'?1:p.size==='town'?2:3;
  return slots.slice(used,used+saleCount).map((q,i)=>({id:`${p.id}:lot${i+1}`,townId:p.id,x:p.x+q.x,z:p.z+q.z,w,d:w,marketId:p.id}));
}
