import { BUILDINGS, FLAG_KIT_RECIPE } from '../data/buildings.js';
import { heightAt } from './terrain.js';
import { WORLD_LAYOUT } from '../data/world_layout.js';
import { WORLD_BOUNDS } from './world_bounds.js';
import { ensureOutposts, nextBuildId, outpostAt, outpostById, outpostIsAwake } from './outposts.js';
import { houseAt, houseById } from './town.js';
import { outsideReach } from './build_path.js';

export const BUILD_SLOPE_LIMIT = 1.5;
export const BUILD_INTERIOR_LIMIT = 30;
export const BUILD_WALL_MAX = 8;
export const BUILD_WALL_SNAP = 0.5;
export const BUILD_JOBS = Object.freeze(['builder', 'hauler', 'farmer', 'shopkeeper']);

function dims(type, rot = 0) {
  const src = BUILDINGS[type]?.size || [1, 1, 1];
  const quarter = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
  return { w: quarter ? src[2] : src[0], h: src[1], d: quarter ? src[0] : src[2] };
}

function roundTo(value, unit) { return Math.round(value / unit) * unit; }
function pieceBounds(piece) {
  const d = piece.w != null ? { w: piece.w, d: piece.d } : dims(piece.type, piece.rot);
  const wall = ['wood_fence', 'stone_wall', 'wood_gate'].includes(piece.type);
  const width = wall ? (piece.length || d.w) : d.w;
  const depth = wall ? 0.5 : d.d;
  const quarter = Math.round((piece.rot || 0) / (Math.PI / 2)) % 2 !== 0;
  return { minX: piece.x - (quarter ? depth : width) / 2, maxX: piece.x + (quarter ? depth : width) / 2,
    minZ: piece.z - (quarter ? width : depth) / 2, maxZ: piece.z + (quarter ? width : depth) / 2 };
}
function shareEndpoint(a, b) {
  const aPoints = [a.start, a.end].filter(Boolean), bPoints = [b.start, b.end].filter(Boolean);
  return aPoints.some((p) => bPoints.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < 0.02));
}
function overlaps(a, b) {
  const x = pieceBounds(a), y = pieceBounds(b);
  return x.minX < y.maxX - 0.02 && x.maxX > y.minX + 0.02 && x.minZ < y.maxZ - 0.02 && x.maxZ > y.minZ + 0.02;
}

function townNear(x, z) {
  return [...WORLD_LAYOUT.towns, ...WORLD_LAYOUT.banditBases].some((p) => Math.hypot(x - p.x, z - p.z) <= p.radius + 150);
}

function interiorHouse(state, houseId, x, z) {
  const h = houseId ? houseById(state, houseId) : houseAt(state, x, z, 0);
  if (!h || h.owner !== 'player') return null;
  return Math.abs(x - h.x) <= h.w / 2 - 0.5 && Math.abs(z - h.z) <= h.d / 2 - 0.5 ? h : null;
}

export function canPlacePiece(state, type, x, z, rot = 0, options = {}) {
  const def = BUILDINGS[type];
  if (!def || !Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, color: 'red', reason: '部品を選べない' };
  // indoor:'either' の物（寝袋・物置箱・作業台）は、買った家の中なら家の格子、外なら拠点の格子
  const indoor = def.place === 'interior' || (def.indoor === 'either' && !options.outpostId && !!interiorHouse(state, options.houseId, x, z));
  const unit = indoor ? 0.5 : 1;
  const px = roundTo(x, unit), pz = roundTo(z, unit), angle = (Math.round(rot / (Math.PI / 2)) % 4) * Math.PI / 2;
  let b = dims(type, angle);
  const wallType = ['wood_fence', 'stone_wall', 'wood_gate'].includes(type);
  if (wallType && Number.isFinite(options.length)) b = angle === 0 ? { ...b, w: options.length, d: 0.5 } : { ...b, w: 0.5, d: options.length };
  if (px < WORLD_BOUNDS.minX || px > WORLD_BOUNDS.maxX || pz < WORLD_BOUNDS.minZ || pz > WORLD_BOUNDS.maxZ) return { ok: false, color: 'red', reason: '地図の外', x: px, z: pz, rot: angle };
  let outpost = null, house = null;
  if (indoor) {
    house = interiorHouse(state, options.houseId, px, pz);
    if (!house) return { ok: false, color: 'blue', reason: '家の中専用', x: px, z: pz, rot: angle };
    const placed = (house.interiorPieces || []).length;
    if (placed >= BUILD_INTERIOR_LIMIT) return { ok: false, color: 'red', reason: '家の中は30個まで', x: px, z: pz, rot: angle };
  } else {
    outpost = options.outpostId ? outpostById(state, options.outpostId) : outpostAt(state, px, pz);
    if (!outpost || Math.hypot(px - outpost.x, pz - outpost.z) > outpost.radius) return { ok: false, color: 'red', reason: '拠点の範囲外', x: px, z: pz, rot: angle };
  }
  if (!house && townNear(px, pz)) return { ok: false, color: 'blue', reason: '町に近い', x: px, z: pz, rot: angle };
  const corners = [[px - b.w / 2, pz - b.d / 2], [px + b.w / 2, pz - b.d / 2], [px - b.w / 2, pz + b.d / 2], [px + b.w / 2, pz + b.d / 2]];
  const heights = corners.map(([cx, cz]) => heightAt(cx, cz));
  if (Math.max(...heights) - Math.min(...heights) > BUILD_SLOPE_LIMIT) return { ok: false, color: 'red', reason: '坂が急', x: px, z: pz, rot: angle };
  const o = ensureOutposts(state);
  const neighbors = o.pieces.filter((p) => p.state !== 'removed' && p.id !== options.replaceId && (outpost ? p.outpostId === outpost.id : p.houseId === house.id));
  const candidate = { type, outpostId: outpost?.id || null, x: px, z: pz, rot: angle, w: b.w, d: b.d, length: options.length, start: options.start, end: options.end, state: 'done' };
  if (neighbors.some((p) => !(wallType && ['wood_fence','stone_wall','wood_gate'].includes(p.type) && shareEndpoint(candidate,p)) && overlaps(candidate, p))) return { ok: false, color: 'red', reason: 'ほかの物と重なる', x: px, z: pz, rot: angle };
  // 壁で輪が閉じるときだけ、外から仲間・物置・寝床へ歩いて行けるか調べる（門は通れる）
  if (outpost && wallType) {
    const route = outpostRouteSafety(state, outpost.id, { ...candidate, id: options.replaceId || '__candidate' });
    if (!route.ok) return { ok: false, color: 'red', reason: route.reason, x: px, z: pz, rot: angle };
  }
  return { ok: true, color: 'green', reason: '', x: px, z: pz, rot: angle, w: b.w, d: b.d, outpost, house };
}

const WALL_TYPES_LOCAL = ['wood_fence', 'stone_wall', 'wood_gate'];
function hasWallLoop(pieces) {
  const parent = new Map(); let loops = 0;
  const key = (p) => `${Math.round(p.x * 2)}:${Math.round(p.z * 2)}`;
  const find = (k) => { while (parent.get(k) !== k) k = parent.get(k); return k; };
  for (const p of pieces) {
    if (!p.start || !p.end) continue;
    const a = key(p.start), b = key(p.end);
    if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b);
    const ra = find(a), rb = find(b); if (ra === rb) loops += 1; else parent.set(ra, rb);
  }
  return loops;
}

export function outpostRouteSafety(state, outpostId, candidate) {
  const outpost = outpostById(state, outpostId); if (!outpost) return { ok: true, reason: '' };
  const o = ensureOutposts(state);
  const neighbors = o.pieces.filter((p) => p.outpostId === outpostId && p.state !== 'removed' && p.id !== candidate.id);
  const walls = [...neighbors, candidate].filter((p) => WALL_TYPES_LOCAL.includes(p.type));
  if (!hasWallLoop(walls)) return { ok: true, reason: '' };
  const trial = { ...state, outposts: { ...o, pieces: [...neighbors, { ...candidate, state: 'done' }] } };
  const members = (state.actors || []).filter((a) => a.faction === 'player' && a.state !== 'dead' && (state.squadIds || []).includes(a.id)).sort(byIdNum);
  const useful = neighbors.filter((p) => ['storage_box', 'bed', 'bedroll', 'workbench', 'small_farm'].includes(p.type)).sort(byIdNum);
  const ok = outsideReach(trial, outpostId, outpost, [...members, ...useful].map((p) => ({ x: p.x, z: p.z })), 1);
  if (ok.slice(0, members.length).some((v) => !v)) return { ok: false, reason: '仲間が囲いに閉じこめられます（先に門を入れる）' };
  if (ok.slice(members.length).some((v) => !v)) return { ok: false, reason: '物置や寝床に入れなくなります（先に門を入れる）' };
  return { ok: true, reason: '' };
}

export function placePiece(state, type, x, z, rot = 0, options = {}) {
  if (type === 'wood_gate') {
    if (!options.wallId) return { ok: false, color: 'red', reason: '置き換える壁を選ぶ' };
    const result = insertGate(state, options.wallId);
    return { ...result, color: result.ok ? 'green' : 'red' };
  }
  const check = canPlacePiece(state, type, x, z, rot, options);
  if (!check.ok) return check;
  const def = BUILDINGS[type], o = ensureOutposts(state);
  const piece = {
    id: nextBuildId(state, 'p'), type, x: check.x, z: check.z, rot: check.rot,
    outpostId: check.outpost?.id || null, houseId: check.house?.id || null,
    state: 'site', hp: 100, maxHp: 100, cost: { ...def.cost }, delivered: {}, work: 0, workRequired: def.work,
    w: dims(type, check.rot).w, d: dims(type, check.rot).d,
    length: options.length,
    start: options.start,
    end: options.end,
    contents: def.storage ? {} : undefined,
    plantedTick: def.farm ? null : undefined,
  };
  o.pieces.push(piece);
  if (piece.outpostId) outpostById(state, piece.outpostId).pieceIds.push(piece.id);
  else if (check.house) check.house.interiorPieces = [...(check.house.interiorPieces || []), piece.id];
  o.rev += 1;
  return { ok: true, color: 'green', reason: '', piece };
}

const WALL_TYPES = ['wood_fence', 'stone_wall', 'wood_gate'];
const POST_SNAP = 1.2;

function wallPosts(state, outpostId) {
  const posts = [];
  for (const p of ensureOutposts(state).pieces) {
    if (!WALL_TYPES.includes(p.type) || !p.start || !p.end) continue;
    if (outpostId && p.outpostId !== outpostId) continue;
    posts.push(p.start, p.end);
  }
  return posts;
}

function nearestPost(posts, point, filter = null) {
  let best = null, bestD = POST_SNAP;
  for (const q of posts) {
    if (filter && !filter(q)) continue;
    const d = Math.hypot(q.x - point.x, q.z - point.z);
    if (d < bestD - 1e-9) { best = q; bestD = d; }
  }
  return best;
}

// 柱から柱へ: 始点は近くの柱に吸い付き、終点は始点から縦か横へ真っすぐ（90度単位）。
// 終点の近くに同じ線上の柱があればそこへ吸い付く。UI の下書きと sim が同じ答えを使う。
export function snapWallEnds(state, start, end, outpostId = null) {
  const posts = wallPosts(state, outpostId);
  let a = { x: roundTo(start.x, BUILD_WALL_SNAP), z: roundTo(start.z, BUILD_WALL_SNAP) };
  const pa = nearestPost(posts, start);
  if (pa) a = { x: pa.x, z: pa.z };
  const rx = roundTo(end.x, BUILD_WALL_SNAP), rz = roundTo(end.z, BUILD_WALL_SNAP);
  let b = Math.abs(rx - a.x) >= Math.abs(rz - a.z) ? { x: rx, z: a.z } : { x: a.x, z: rz };
  const aligned = (q) => Math.abs(q.x - a.x) < 1e-6 || Math.abs(q.z - a.z) < 1e-6;
  const pb = nearestPost(posts, end, aligned) || nearestPost(posts, b, aligned);
  if (pb && (pb.x !== a.x || pb.z !== a.z)) b = { x: pb.x, z: pb.z };
  return { start: a, end: b, snappedStart: !!pa, snappedEnd: !!pb };
}

export function placeWallSegment(state, type, start, end, options = {}) {
  if (!['wood_fence', 'stone_wall'].includes(type)) return { ok: false, reason: '壁の種類が違う' };
  const snapped = snapWallEnds(state, start, end, options.outpostId || null);
  const x1 = snapped.start.x, z1 = snapped.start.z, x2 = snapped.end.x, z2 = snapped.end.z;
  const distance = Math.hypot(x2 - x1, z2 - z1);
  if (distance < BUILD_WALL_SNAP) return { ok: false, reason: '柱の間が近すぎる' };
  const segments = Math.ceil(distance / BUILD_WALL_MAX - 1e-9), placed = [];
  for (let i = 0; i < segments; i += 1) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const ax = i === 0 ? x1 : roundTo(x1 + (x2 - x1) * t0, BUILD_WALL_SNAP), az = i === 0 ? z1 : roundTo(z1 + (z2 - z1) * t0, BUILD_WALL_SNAP);
    const bx = i === segments - 1 ? x2 : roundTo(x1 + (x2 - x1) * t1, BUILD_WALL_SNAP), bz = i === segments - 1 ? z2 : roundTo(z1 + (z2 - z1) * t1, BUILD_WALL_SNAP);
    const length = Math.hypot(bx - ax, bz - az), rot = Math.abs(bx - ax) >= Math.abs(bz - az) ? 0 : Math.PI / 2;
    const startPoint = { x: ax, z: az }, endPoint = { x: bx, z: bz };
    const result = placePiece(state, type, (ax + bx) / 2, (az + bz) / 2, rot, { ...options, length, start:startPoint, end:endPoint });
    if (!result.ok) return { ...result, placed };
    placed.push(result.piece);
  }
  return { ok: true, placed, end: { x: x2, z: z2 } };
}

// 壁と門の柱をつないだ線に輪があれば「囲いが閉じた」。輪の数を返す（工事中の区間も数える）
export function wallLoops(state, outpostId, { doneOnly = false } = {}) {
  const parent = new Map();
  const key = (p) => `${Math.round(p.x * 2)}:${Math.round(p.z * 2)}`;
  const find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  let loops = 0;
  for (const p of ensureOutposts(state).pieces) {
    if (p.outpostId !== outpostId || !WALL_TYPES.includes(p.type) || !p.start || !p.end) continue;
    if (doneOnly && p.state !== 'done') continue;
    const a = key(p.start), b = key(p.end);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    const ra = find(a), rb = find(b);
    if (ra === rb) loops += 1; else parent.set(ra, rb);
  }
  return loops;
}

export function drawWall(state, points, type = 'wood_fence', options = {}) {
  if (!Array.isArray(points) || points.length < 2) return { ok: false, reason: '柱を2本選ぶ' };
  const normalized = points.map((p) => Array.isArray(p) ? { x: Number(p[0]), z: Number(p[1]) } : p);
  if (normalized.some((p) => !Number.isFinite(p?.x) || !Number.isFinite(p?.z))) return { ok: false, reason: '柱の位置が違う' };
  const placed = [];
  for (let i = 0; i < normalized.length - 1; i += 1) {
    const from = i > 0 && placed.length ? placed[placed.length - 1].end : normalized[i];
    const result = placeWallSegment(state, type, from, normalized[i + 1], options);
    if (!result.ok) return { ...result, placed };
    placed.push(...result.placed);
  }
  return { ok: true, placed };
}

export function insertGate(state, wallId) {
  const o = ensureOutposts(state), wall = o.pieces.find((p) => p.id === wallId && ['wood_fence', 'stone_wall'].includes(p.type) && p.state === 'done');
  if (!wall) return { ok: false, reason: '壁の区間がない' };
  const span = wall.length || wall.w || 1;
  const gateLength = Math.min(2, span);
  const horizontal = Math.abs(Math.sin(wall.rot || 0)) < 0.5;
  let direction = horizontal ? { x: 1, z: 0 } : { x: 0, z: 1 };
  if (wall.start && wall.end) {
    const dx = wall.end.x - wall.start.x, dz = wall.end.z - wall.start.z, len = Math.hypot(dx, dz);
    if (len > 0.01) direction = { x: dx / len, z: dz / len };
  }
  // 分けた区間の素材は長さの割合（解体で元より多く戻らないように）
  const scaledCost = (length) => Object.fromEntries(Object.entries(wall.cost || {}).map(([m, n]) => [m, Math.max(1, Math.round(n * length / span))]));
  const middle = { x: wall.x, z: wall.z };
  const segments = [];
  const side = (sign) => {
    const length = (span - gateLength) / 2;
    if (length < 0.25) return;
    const center = { x: middle.x + direction.x * sign * (gateLength + length) / 2, z: middle.z + direction.z * sign * (gateLength + length) / 2 };
    const start = { x: center.x - direction.x * length / 2, z: center.z - direction.z * length / 2 };
    const end = { x: center.x + direction.x * length / 2, z: center.z + direction.z * length / 2 };
    const piece = { ...wall, id: nextBuildId(state, 'p'), type: wall.type, x: center.x, z: center.z, length, w: length, start, end, cost: scaledCost(length), delivered: scaledCost(length), door: undefined };
    delete piece.door;
    segments.push(piece);
  };
  side(-1); side(1);
  Object.assign(wall, { type: 'wood_gate', x: middle.x, z: middle.z, length: gateLength, w: gateLength,
    start: { x: middle.x - direction.x * gateLength / 2, z: middle.z - direction.z * gateLength / 2 },
    end: { x: middle.x + direction.x * gateLength / 2, z: middle.z + direction.z * gateLength / 2 }, cost: scaledCost(gateLength), delivered: scaledCost(gateLength), hp: 100, maxHp: 100, door: { open: false, locked: false } });
  o.pieces.push(...segments); if (wall.outpostId) outpostById(state, wall.outpostId).pieceIds.push(...segments.map((p) => p.id)); o.rev += 1;
  return { ok: true, piece: wall };
}

export function putInStorage(state, pieceId, materials) {
  const piece = ensureOutposts(state).pieces.find((p) => p.id === pieceId && p.type === 'storage_box' && p.state === 'done');
  if (!piece) return false;
  for (const [id, n] of Object.entries(materials || {})) if (Number.isInteger(n) && n > 0) piece.contents[id] = (piece.contents[id] || 0) + n;
  return true;
}

export function depositMaterials(state, pieceId, actorId, materials) {
  const actor=(state.actors||[]).find((a)=>a.id===actorId&&a.faction==='player'&&a.state!=='dead');
  const piece=ensureOutposts(state).pieces.find((p)=>p.id===pieceId&&p.type==='storage_box'&&p.state==='done');
  if(!actor||!piece)return false;
  actor.inv ||= []; piece.contents ||= {};
  for(const [material,raw] of Object.entries(materials||{})) {
    const count=Math.max(0,Math.floor(Number(raw)||0)); if(!count)continue;
    let left=count;
    for(let i=0;i<actor.inv.length&&left>0;){
      const item=actor.inv[i];
      if(item?.id!==material){i+=1;continue;}
      const have=Math.max(1,Math.floor(Number(item.n)||1)),take=Math.min(left,have);
      const remain=have-take;left-=take;
      if(remain>0){item.n=remain;i+=1;}else actor.inv.splice(i,1);
    }
    const moved=count-left;
    if(moved>0)piece.contents[material]=(piece.contents[material]||0)+moved;
  }
  return true;
}

function storageBoxes(state, outpostId, houseId = null) {
  return ensureOutposts(state).pieces.filter((p) => (houseId ? p.houseId === houseId : p.outpostId === outpostId) && p.type === 'storage_box' && p.state === 'done').sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function haulGroundDrops(state, outpost = null, house = null) {
  const scope = house ? `h:${house.id}` : `o:${outpost.id}`;
  const boxes = storageBoxes(state, outpost?.id, house?.id);
  const drops = (state.groundItems || []).filter((item) => item.contents && Object.keys(item.contents).length &&
    (house ? houseAt(state, item.x, item.z, 0)?.id === house.id : Math.hypot(item.x - outpost.x, item.z - outpost.z) <= outpost.radius)).sort(byIdNum);
  for (const item of drops) if (item.haulClaim != null && !(state.actors || []).some((a) => a.buildTask?.kind === 'haul' && a.buildTask.dropId === item.id)) item.haulClaim = null;
  for (const actor of (state.actors || []).filter((a) => isJob(a, 'hauler') && freeForJob(a) && !a.buildTask).sort(byIdNum)) {
    if (!house && Math.hypot(actor.x - outpost.x, actor.z - outpost.z) > outpost.radius + 2) continue;
    const drop = drops.find((item) => !item.haulClaim && (!house || houseAt(state, actor.x, actor.z, 0)?.id === house.id));
    if (!drop) continue;
    if (!boxes.length) break;
    const box = boxes.slice().sort((a,b)=>Math.hypot(a.x-actor.x,a.z-actor.z)-Math.hypot(b.x-actor.x,b.z-actor.z))[0];
    if (!box) continue;
    drop.haulClaim = actor.id;
    actor.buildTask = { kind: 'haul', scope, stage: 'fetch', dropId: drop.id, boxId: box.id, carry: {}, want: { ...drop.contents }, gx: drop.x, gz: drop.z, reach: 1.2 };
  }
  for (const actor of (state.actors || []).filter((a) => a.buildTask?.kind === 'haul' && a.buildTask.scope === scope).sort(byIdNum)) {
    const task = actor.buildTask, drop = (state.groundItems || []).find((x) => x.id === task.dropId), box = boxes.find((x) => x.id === task.boxId);
    if (!freeForJob(actor) || !isJob(actor, 'hauler') || !drop || !box) { if (drop && drop.haulClaim === actor.id) drop.haulClaim = null; clearBuildTask(state,actor); continue; }
    if (Math.hypot(actor.x-task.gx,actor.z-task.gz) > task.reach + 0.25) continue;
    if (task.stage === 'fetch') {
      task.carry = { ...drop.contents }; drop.contents = {};
      task.stage = 'carry'; task.gx = box.x; task.gz = box.z; task.reach = BOX_REACH;
    } else if (task.stage === 'carry') {
      box.contents ||= {}; for (const [m,n] of Object.entries(task.carry)) box.contents[m] = (box.contents[m] || 0) + n;
      state.groundItems = state.groundItems.filter((x) => x !== drop);
      actor.buildTask = null;
    }
  }
}

function deliverForSite(state, piece) {
  const boxes = storageBoxes(state, piece.outpostId, piece.houseId);
  for (const material of Object.keys(piece.cost).sort()) {
    let left = piece.cost[material] - (piece.delivered[material] || 0);
    if (left <= 0) continue;
    for (const box of boxes) {
      const take = Math.min(left, box.contents[material] || 0);
      if (take <= 0) continue;
      box.contents[material] -= take;
      piece.delivered[material] = (piece.delivered[material] || 0) + take;
      left -= take;
      if (!left) break;
    }
  }
  return Object.keys(piece.cost).every((m) => (piece.delivered[m] || 0) >= piece.cost[m]);
}

// 作業量 work は「技能係数1のときの秒数」。sim は 1tick = 0.1秒なので 1tick あたり 0.1 進む。
export const BUILD_WORK_PER_TICK = 0.1;
export const BUILD_CARRY_MAX = 10;
const BOX_REACH = 1.6;
const SITE_REACH = 1.8;

function isJob(a, job) { return a.jobs?.primary === job || a.jobs?.secondary === job; }

// 命令を受けていない・倒れていない・担がれていない仲間だけが係の仕事をする
export function freeForJob(a) {
  return a && a.faction === 'player' && a.state !== 'dead' && a.state !== 'down' && a.state !== 'getup' &&
    a.carriedBy == null && !a.moveTo && a.targetId == null && !a.townTask && !a.task && a.carryingId == null &&
    a.resting == null && !a.dialogueIntent;
}

function builderSpeed(a) { return (1 + Math.max(0, Number(a.skills?.build) || 0) / 50) * BUILD_WORK_PER_TICK; }

function byIdNum(a, b) { return String(a.id).localeCompare(String(b.id), undefined, { numeric: true }); }

function assignedBuilders(state, outpost) {
  return (state.actors || []).filter((a) => isJob(a, 'builder') && freeForJob(a) &&
    (!a.buildTask || (!a.buildTask.kind && a.buildTask.outpostId === outpost.id)) &&
    Math.hypot(a.x - outpost.x, a.z - outpost.z) <= outpost.radius + 2).sort(byIdNum);
}

function assignedHouseBuilders(state, house) {
  return (state.actors || []).filter((a) => isJob(a, 'builder') && freeForJob(a) && (!a.buildTask || (!a.buildTask.kind && a.buildTask.houseId === house.id)) && Math.hypot(a.x-house.x,a.z-house.z) <= 30).sort(byIdNum);
}

function materialLimit(piece) {
  const ratios = Object.keys(piece.cost).map((m) => piece.cost[m] > 0 ? (piece.delivered[m] || 0) / piece.cost[m] : 1);
  return ratios.length ? piece.workRequired * Math.min(1, ...ratios) : piece.workRequired;
}

function finishPiece(state, o, piece) {
  piece.state = 'done';
  piece.work = piece.workRequired;
  const def = BUILDINGS[piece.type];
  if (def?.bed) {
    state.bedrolls ||= [];
    state.bedrollSeq = (state.bedrollSeq || 0) + 1;
    state.bedrolls.push({ id: `builtbed${state.bedrollSeq}`, kind: piece.type === 'bed' ? 'bed' : 'bedroll', x: piece.x, z: piece.z, rot: piece.rot, pieceId: piece.id, house: piece.houseId || null });
  }
  o.rev += 1;
}

function addWork(state, o, piece, builders) {
  const limit = materialLimit(piece);
  if (piece.work >= limit) return false;
  const speed = builders.reduce((n, a) => n + builderSpeed(a), 0);
  piece.work = Math.min(limit, Math.round((piece.work + speed) * 1000) / 1000);
  for (const a of builders) if (a.skills) a.skills.build = Math.min(100, (a.skills.build || 0) + 0.001);
  if (piece.work >= piece.workRequired && Object.keys(piece.cost).every((m) => (piece.delivered[m] || 0) >= piece.cost[m])) finishPiece(state, o, piece);
  return true;
}

// 屋内の作業も収納箱と現場の間を歩いて運ぶ（拠点と同じ手順: 取る→運ぶ→作業→足りなければまた取る）
function advanceHouseSite(state, o, piece, builders, house) {
  const boxes = storageBoxes(state, null, house.id), working = [];
  for (const actor of builders) {
    let task = actor.buildTask;
    if (task && (task.houseId !== house.id || task.pieceId !== piece.id)) { clearBuildTask(state, actor); task = null; }
    if (!task) {
      task = planTask(state, actor, [piece], boxes);
      if (!task) continue;
      task.houseId = house.id; actor.buildTask = task;
    }
    if (!nearGoal(actor, task)) continue;
    if (task.stage === 'fetch') {
      const box = boxes.find((b) => b.id === task.boxId);
      for (const m of Object.keys(task.want).sort()) { const n = Math.min(task.want[m], box?.contents[m] || 0); if (n > 0) { box.contents[m] -= n; task.carry[m] = (task.carry[m] || 0) + n; } }
      task.want = {};
      if (!Object.keys(task.carry).length) { actor.buildTask = null; continue; }
      setGoal(task, 'carry', piece, SITE_REACH); continue;
    }
    if (task.stage === 'carry') {
      for (const [m, n] of Object.entries(task.carry)) piece.delivered[m] = (piece.delivered[m] || 0) + n;
      task.carry = {}; o.rev += 1; setGoal(task, 'work', piece, SITE_REACH);
    }
    if (piece.work < materialLimit(piece)) { working.push(actor); continue; }
    // 素材待ち: 箱にあればもう一度取りに行く
    actor.buildTask = null;
    const next = planTask(state, actor, [piece], boxes);
    if (next && next.stage === 'fetch') { next.houseId = house.id; actor.buildTask = next; }
  }
  if (working.length) addWork(state, o, piece, working);
  if (piece.state === 'done') for (const actor of working) actor.buildTask = null;
}

// まだ現場に届いておらず、だれも運んでいない素材
function missingFor(state, piece, self) {
  const inTransit = {};
  for (const a of state.actors || []) {
    const t = a.buildTask;
    if (!t || a === self || t.pieceId !== piece.id) continue;
    for (const [m, n] of Object.entries(t.carry || {})) inTransit[m] = (inTransit[m] || 0) + n;
    for (const [m, n] of Object.entries(t.want || {})) inTransit[m] = (inTransit[m] || 0) + n;
  }
  const missing = {};
  for (const m of Object.keys(piece.cost).sort()) {
    const left = piece.cost[m] - (piece.delivered[m] || 0) - (inTransit[m] || 0);
    if (left > 0) missing[m] = left;
  }
  return missing;
}

function boxWith(boxes, missing, from) {
  let best = null, bestD = Infinity;
  for (const box of boxes) {
    if (!Object.keys(missing).some((m) => (box.contents[m] || 0) > 0)) continue;
    const d = Math.hypot(box.x - from.x, box.z - from.z);
    if (d < bestD - 1e-9) { best = box; bestD = d; }
  }
  return best;
}

function dropCarry(state, actor, carry) {
  const contents = Object.fromEntries(Object.entries(carry || {}).filter(([, n]) => n > 0));
  if (!Object.keys(contents).length) return;
  state.groundItems ||= [];
  state.groundItems.push({ id: `carry${state.tick || 0}_${actor.id}`, x: Math.round(actor.x * 100) / 100, z: Math.round(actor.z * 100) / 100, contents });
}

export function clearBuildTask(state, actor) {
  if (!actor?.buildTask) return;
  const task=actor.buildTask;
  if(task.kind==='haul')state.groundItems=(state.groundItems||[]).filter((item)=>item.id!==task.dropId||Object.keys(item.contents||{}).length>0);
  dropCarry(state, actor, task.carry);
  actor.buildTask = null;
}

function setGoal(task, stage, target, reach) {
  task.stage = stage; task.gx = target.x; task.gz = target.z; task.reach = reach;
}

function planTask(state, actor, sites, boxes) {
  const ordered = sites.slice().sort((a, b) => {
    const da = Math.hypot(a.x - actor.x, a.z - actor.z), db = Math.hypot(b.x - actor.x, b.z - actor.z);
    return Math.abs(da - db) > 1e-9 ? da - db : byIdNum(a, b);
  });
  for (const piece of ordered) {
    const missing = missingFor(state, piece, actor);
    const box = Object.keys(missing).length ? boxWith(boxes, missing, actor) : null;
    if (box) {
      const task = { pieceId: piece.id, boxId: box.id, carry: {}, want: {} };
      let room = BUILD_CARRY_MAX;
      for (const m of Object.keys(missing).sort()) {
        const n = Math.min(missing[m], box.contents[m] || 0, room);
        if (n > 0) { task.want[m] = n; room -= n; }
      }
      setGoal(task, 'fetch', box, BOX_REACH);
      return task;
    }
    if (piece.work < materialLimit(piece)) {
      const task = { pieceId: piece.id, boxId: null, carry: {}, want: {} };
      setGoal(task, 'work', piece, SITE_REACH);
      return task;
    }
  }
  return null;
}

function nearGoal(actor, task) { return Math.hypot(task.gx - actor.x, task.gz - actor.z) <= task.reach + 0.25; }

function runBuilder(state, o, base, actor, sites, boxes) {
  let task = actor.buildTask;
  if (task) {
    const piece = o.pieces.find((p) => p.id === task.pieceId);
    if (!piece || piece.state !== 'site' || piece.outpostId !== base.id) { clearBuildTask(state, actor); task = null; }
  }
  if (!task) {
    task = planTask(state, actor, sites, boxes);
    if (!task) return null;
    actor.buildTask = task;
  }
  if (!nearGoal(actor, task)) return null; // 歩く（ai.js の buildMove が動かす）
  const piece = o.pieces.find((p) => p.id === task.pieceId);
  if (task.stage === 'fetch') {
    const box = boxes.find((b) => b.id === task.boxId);
    for (const m of Object.keys(task.want).sort()) {
      const n = Math.min(task.want[m], box?.contents[m] || 0);
      if (n > 0) { box.contents[m] -= n; task.carry[m] = (task.carry[m] || 0) + n; }
    }
    task.want = {};
    if (!Object.keys(task.carry).length) { actor.buildTask = null; return null; }
    setGoal(task, 'carry', piece, SITE_REACH);
    return null;
  }
  if (task.stage === 'carry') {
    for (const [m, n] of Object.entries(task.carry)) piece.delivered[m] = (piece.delivered[m] || 0) + n;
    task.carry = {};
    o.rev += 1;
    setGoal(task, 'work', piece, SITE_REACH);
  }
  if (piece.work < materialLimit(piece)) return piece; // この tick に作業する
  // 素材待ち: もう一度取りに行けるなら取りに行く
  actor.buildTask = null;
  const next = planTask(state, actor, [piece], boxes);
  if (next && next.stage === 'fetch') actor.buildTask = next;
  return null;
}

function advanceOutpostSites(state, o, base, pieces) {
  const sites = pieces.filter((p) => p.state === 'site').sort(byIdNum);
  const boxes = storageBoxes(state, base.id);
  const working = new Map();
  for (const actor of (state.actors || []).filter((a) => a.buildTask && !a.buildTask.kind && a.buildTask.outpostId === base.id).sort(byIdNum)) {
    // 命令・戦闘・係の解除・拠点の外では仕事をやめる（運んでいた素材はその場に置く）
    if (!freeForJob(actor) || !isJob(actor, 'builder') || Math.hypot(actor.x - base.x, actor.z - base.z) > base.radius + 2) clearBuildTask(state, actor);
  }
  for (const actor of assignedBuilders(state, base)) {
    if (actor.buildTask && actor.buildTask.outpostId !== base.id) clearBuildTask(state, actor);
    const piece = runBuilder(state, o, base, actor, sites, boxes);
    if (actor.buildTask) actor.buildTask.outpostId = base.id;
    if (piece) { if (!working.has(piece)) working.set(piece, []); working.get(piece).push(actor); }
  }
  for (const [piece, builders] of [...working.entries()].sort((a, b) => byIdNum(a[0], b[0]))) {
    addWork(state, o, piece, builders);
    if (piece.state === 'done') for (const a of builders) a.buildTask = null;
  }
}

// ai.js から呼ぶ: 係の仕事で歩く。true なら今回の移動はこれで終わり
export function buildMove(state, actor, stepToward, setAnim) {
  const task = actor.buildTask;
  if (!task || !freeForJob(actor)) return false;
  const d = Math.hypot(task.gx - actor.x, task.gz - actor.z);
  if (d <= task.reach) {
    actor.state = 'idle';
    const dx = task.gx - actor.x, dz = task.gz - actor.z;
    if (dx * dx + dz * dz > 0.0001) actor.rot = Math.atan2(dx, dz);
    if (setAnim) setAnim(actor, 'Idle', state.tick);
    return true;
  }
  stepToward(state, actor, task.gx, task.gz, d > 12);
  return true;
}

function advanceCrafting(state, piece, house = null, outpost = null) {
  const job = piece.crafting;
  if (!job) return;
  const actor = (state.actors || []).find((a) => a.id === job.actorId && a.faction === 'player' && a.state === 'idle' && !a.moveTo && !a.targetId && !a.task);
  if (!actor) return;
  const atWorksite = house
    ? houseAt(state, actor.x, actor.z, 0)?.id === house.id
    : outpost && Math.hypot(actor.x - outpost.x, actor.z - outpost.z) <= outpost.radius;
  if (!atWorksite) return;
  job.progress = Math.min(job.workTicks, (job.progress || 0) + 1);
  if (job.progress < job.workTicks) return;
  actor.inv ||= [];
  const item = actor.inv.find((entry) => entry.id === job.itemId);
  if (item) item.n = (item.n || 1) + 1;
  else actor.inv.push({ id: job.itemId, n: 1 });
  piece.crafting = null;
}

// 畑係: 畑まで歩いて植える/収穫する（時間がかかる）→ 穀物袋を収納箱まで運ぶ
const FARM_PLANT_WORK = 10;   // 秒（技能0）
const FARM_HARVEST_WORK = 20; // 秒（技能0）
const FARM_YIELD = { grain: 3 };
function farmTaskHolder(state, farmId) {
  return (state.actors || []).find((a) => a.buildTask?.kind === 'harvest' && a.buildTask.farmId === farmId) || null;
}
function tendFarms(state, outpost) {
  const o = ensureOutposts(state);
  const farms = o.pieces.filter((p) => p.outpostId === outpost.id && p.type === 'small_farm' && p.state === 'done').sort(byIdNum);
  // 古い予約・持ち場を離れた畑係の仕事を片づける
  for (const farm of farms) if (farm.harvestClaim != null && !farmTaskHolder(state, farm.id)) farm.harvestClaim = null;
  for (const actor of (state.actors || []).filter((a) => a.buildTask?.kind === 'harvest' && a.buildTask.outpostId === outpost.id).sort(byIdNum)) {
    const farm = farms.find((p) => p.id === actor.buildTask.farmId);
    const away = Math.hypot(actor.x - outpost.x, actor.z - outpost.z) > outpost.radius + 2;
    if (!freeForJob(actor) || !isJob(actor, 'farmer') || away || (!farm && actor.buildTask.stage !== 'carry')) {
      if (farm && farm.harvestClaim === actor.id) farm.harvestClaim = null;
      clearBuildTask(state, actor);
    }
  }
  const farmers = (state.actors || []).filter((a) => isJob(a, 'farmer') && freeForJob(a) && Math.hypot(a.x - outpost.x, a.z - outpost.z) <= outpost.radius + 2).sort(byIdNum);
  for (const actor of farmers) {
    if (actor.buildTask && actor.buildTask.kind !== 'harvest') continue;
    if (!actor.buildTask) {
      const near = (p) => Math.hypot(p.x - actor.x, p.z - actor.z);
      const free = farms.filter((p) => p.harvestClaim == null).sort((a, b) => near(a) - near(b) || byIdNum(a, b));
      const ripe = free.find((p) => p.plantedTick != null && farmGrowth(state, p) >= 1);
      const empty = free.find((p) => p.plantedTick == null);
      const farm = ripe || empty;
      if (!farm) continue;
      farm.harvestClaim = actor.id;
      actor.buildTask = { kind: 'harvest', outpostId: outpost.id, stage: ripe ? 'work' : 'plant', farmId: farm.id, gx: farm.x, gz: farm.z, reach: SITE_REACH, carry: {}, workLeft: ripe ? FARM_HARVEST_WORK : FARM_PLANT_WORK };
    }
    const task = actor.buildTask;
    task.outpostId = outpost.id;
    const farm = farms.find((p) => p.id === task.farmId);
    if (task.stage === 'carry') {
      const boxes = storageBoxes(state, outpost.id);
      const box = boxes.find((b) => b.id === task.boxId) || boxes.slice().sort((a, b) => Math.hypot(a.x - actor.x, a.z - actor.z) - Math.hypot(b.x - actor.x, b.z - actor.z) || byIdNum(a, b))[0];
      if (!box) { clearBuildTask(state, actor); continue; } // 箱がない: その場に置く（運び係が拾う）
      task.boxId = box.id; task.gx = box.x; task.gz = box.z; task.reach = BOX_REACH;
      if (!nearGoal(actor, task)) continue;
      box.contents ||= {};
      for (const [m, n] of Object.entries(task.carry)) box.contents[m] = (box.contents[m] || 0) + n;
      task.carry = {}; actor.buildTask = null; o.rev += 1;
      continue;
    }
    if (!farm) { clearBuildTask(state, actor); continue; }
    task.gx = farm.x; task.gz = farm.z; task.reach = SITE_REACH;
    if (!nearGoal(actor, task)) continue;
    task.workLeft = Math.max(0, Math.round((task.workLeft - builderSpeed(actor)) * 1000) / 1000);
    if (task.workLeft > 0) continue;
    if (task.stage === 'plant') {
      farm.plantedTick = state.tick || 0; farm.growth = 0; farm.harvestClaim = null; actor.buildTask = null; o.rev += 1;
    } else {
      farm.plantedTick = null; farm.growth = 0; farm.harvestClaim = null; o.rev += 1;
      task.stage = 'carry'; task.carry = { ...FARM_YIELD }; task.farmId = null;
    }
  }
}

export function updateBuild(state) {
  const o = ensureOutposts(state);
  updatePieceWork(state);
  for (const base of o.items.slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
    if (!outpostIsAwake(state, base.id)) continue;
    haulGroundDrops(state, base);
    const workPieces = o.pieces.filter((p) => p.outpostId === base.id);
    for (const piece of workPieces) if (piece.crafting) advanceCrafting(state, piece, null, base);
    tendFarms(state, base);
    advanceOutpostSites(state, o, base, workPieces);
    for (const farm of workPieces.filter((p) => p.type === 'small_farm' && p.state === 'done')) {
      if (farm.plantedTick != null) farm.growth = farmGrowth(state, farm);
    }
  }
  for (const house of state.town?.houses || []) {
    if (house.owner !== 'player') continue;
    haulGroundDrops(state, null, house);
    const housePieces = o.pieces.filter((p) => p.houseId === house.id);
    for (const piece of housePieces) if (piece.crafting) advanceCrafting(state, piece, house, null);
    for (const actor of (state.actors || []).filter((a) => a.buildTask && !a.buildTask.kind && a.buildTask.houseId === house.id).sort(byIdNum)) {
      if (!freeForJob(actor) || !isJob(actor, 'builder') || Math.hypot(actor.x - house.x, actor.z - house.z) > 30) clearBuildTask(state, actor);
    }
    const builders = assignedHouseBuilders(state, house);
    if (!builders.length) continue;
    // 家の中は一度に一つの現場だけ進める
    const site = housePieces.filter((p) => p.state === 'site').sort(byIdNum)[0];
    if (site) advanceHouseSite(state, o, site, builders, house);
  }
}

export function farmGrowth(state, farm) {
  if (!farm || farm.plantedTick == null) return 0;
  return Math.max(0, Math.min(1, ((state.tick || 0) - farm.plantedTick) / 864000));
}

export function plantFarm(state, pieceId) {
  const farm = ensureOutposts(state).pieces.find((p) => p.id === pieceId && p.type === 'small_farm' && p.state === 'done');
  if (!farm || farm.plantedTick != null) return false;
  farm.plantedTick = state.tick || 0; farm.growth = 0; return true;
}

export function cancelPiece(state, pieceId) {
  const o = ensureOutposts(state), i = o.pieces.findIndex((p) => p.id === pieceId && p.state === 'site');
  if (i < 0) return false;
  const [piece] = o.pieces.splice(i, 1);
  const base = outpostById(state, piece.outpostId);
  if (base) base.pieceIds = base.pieceIds.filter((id) => id !== piece.id);
  const house = piece.houseId ? houseById(state, piece.houseId) : null;
  if (house) house.interiorPieces = (house.interiorPieces || []).filter((id) => id !== piece.id);
  const delivered = Object.fromEntries(Object.entries(piece.delivered || {}).filter(([, n]) => n > 0));
  if (Object.keys(delivered).length) {
    const box = storageBoxes(state, piece.outpostId, piece.houseId)[0];
    if (box) for (const [material, count] of Object.entries(delivered)) box.contents[material] = (box.contents[material] || 0) + count;
    else { state.groundItems ||= []; state.groundItems.push({ id: `cancel${state.tick || 0}_${piece.id}`, x: piece.x, z: piece.z, contents: delivered }); }
  }
  o.rev += 1; return true;
}

export function dismantlePiece(state, pieceId) {
  const o = ensureOutposts(state), i = o.pieces.findIndex((p) => p.id === pieceId && p.state === 'done');
  if (i < 0) return false;
  const [piece] = o.pieces.splice(i, 1);
  const base = outpostById(state, piece.outpostId);
  if (base) base.pieceIds = base.pieceIds.filter((id) => id !== piece.id);
  const house = piece.houseId ? houseById(state, piece.houseId) : null;
  if (house) house.interiorPieces = (house.interiorPieces || []).filter((id) => id !== piece.id);
  const recovered = {};
  for (const [material, count] of Object.entries(piece.cost || {})) recovered[material] = Math.max(1, Math.floor(count * 0.7));
  const contents = { ...(piece.contents || {}) };
  for (const [material, count] of Object.entries(recovered)) contents[material] = (contents[material] || 0) + count;
  if (Object.keys(contents).length) {
    const nearby=ensureOutposts(state).pieces.filter((p)=>p.id!==piece.id&&p.type==='storage_box'&&p.state==='done'&&p.outpostId===piece.outpostId&&p.houseId===piece.houseId&&Math.hypot(p.x-piece.x,p.z-piece.z)<=8).sort(byIdNum)[0];
    if(nearby){nearby.contents ||= {};for(const [material,count] of Object.entries(contents))nearby.contents[material]=(nearby.contents[material]||0)+count;}
    else {state.groundItems ||= [];state.groundItems.push({ id: `drop${state.tick || 0}_${piece.id}`, x: piece.x, z: piece.z, contents });}
  }
  state.bedrolls = (state.bedrolls || []).filter((b) => b.pieceId !== piece.id);
  o.rev += 1; return { ok: true, recovered, dropped: piece.contents || {} };
}

export function startPieceWork(state, pieceId, action, actorId) {
  const piece=ensureOutposts(state).pieces.find((p)=>p.id===pieceId&&p.state==='done');
  const actor=(state.actors||[]).find((a)=>a.id===actorId&&a.faction==='player'&&a.state!=='dead');
  if(!piece||!actor||!['dismantle','repair'].includes(action)||actor.buildTask)return false;
  if(action==='repair'&&piece.hp>=piece.maxHp)return false;
  // 作業量（秒・技能0）: 解体は建てる手間の半分、修理は壊れた割合×建てる手間の半分。最低 5 秒
  const buildWork=Number(piece.workRequired)||Number(BUILDINGS[piece.type]?.work)||20;
  const workLeft=action==='dismantle'?Math.max(5,Math.round(buildWork*0.5)):Math.max(5,Math.round(buildWork*0.5*(1-(piece.hp||0)/(piece.maxHp||100))));
  if(action==='repair'){
    const material=Object.keys(piece.cost||{}).sort()[0]; if(!material)return false;
    actor.inv ||= []; const stack=actor.inv.find((item)=>item.id===material&&(item.n||1)>0);
    if(stack){stack.n=(stack.n||1)-1;if(stack.n<=0)actor.inv.splice(actor.inv.indexOf(stack),1);}
    else {
      const box=storageBoxes(state,piece.outpostId,piece.houseId).find((b)=>(b.contents?.[material]||0)>0); if(!box)return false;
      actor.buildTask={kind:'upkeep',action,stage:'fetch',pieceId,material,boxId:box.id,carry:{},workLeft,gx:box.x,gz:box.z,reach:BOX_REACH}; return true;
    }
  }
  actor.buildTask={kind:'upkeep',action,stage:'work',pieceId,workLeft,gx:piece.x,gz:piece.z,reach:SITE_REACH};
  return true;
}

function updatePieceWork(state) {
  for(const actor of state.actors||[]){const task=actor.buildTask;if(task?.kind!=='upkeep')continue;
    const piece=ensureOutposts(state).pieces.find((p)=>p.id===task.pieceId&&p.state==='done');
    if(!piece||!freeForJob(actor)){clearBuildTask(state,actor);continue;}
    if(Math.hypot(actor.x-task.gx,actor.z-task.gz)>task.reach+0.25)continue;
    if(task.stage==='fetch'){
      const box=storageBoxes(state,piece.outpostId,piece.houseId).find((b)=>b.id===task.boxId);
      if(!box||!(box.contents?.[task.material]>0)){actor.buildTask=null;continue;}
      box.contents[task.material]-=1;task.carry={[task.material]:1};task.stage='carry';task.gx=piece.x;task.gz=piece.z;task.reach=SITE_REACH;continue;
    }
    if(task.stage==='carry'){task.carry={};task.stage='work';}
    task.workLeft=Math.max(0,Math.round((task.workLeft-builderSpeed(actor))*1000)/1000);
    if(task.workLeft>0)continue;
    if(task.action==='dismantle')dismantlePiece(state,piece.id);
    else {piece.hp=piece.maxHp;ensureOutposts(state).rev+=1;}
    actor.buildTask=null;
  }
}

export function repairPiece(state, pieceId, hp = 100) {
  const piece = ensureOutposts(state).pieces.find((p) => p.id === pieceId && p.state === 'done');
  if (!piece || piece.hp >= piece.maxHp) return false;
  piece.hp = Math.min(piece.maxHp, Math.max(piece.hp, hp)); return true;
}

export function craftAt(state, benchId, itemId, actorId) {
  const bench = ensureOutposts(state).pieces.find((p) => p.id === benchId && ['workbench', 'forge'].includes(p.type) && p.state === 'done');
  const recipes = { flag_kit: FLAG_KIT_RECIPE };
  const recipe = recipes[itemId];
  if (!bench || !recipe || bench.crafting) return false;
  const actor = (state.actors || []).find((a) => a.id === actorId && a.faction === 'player');
  if (!actor) return false;
  const sources = [...storageBoxes(state, bench.outpostId, bench.houseId)];
  for (const [material, count] of Object.entries(recipe.materials)) if (sources.reduce((n, b) => n + (b.contents[material] || 0), 0) < count) return false;
  for (const [material, count] of Object.entries(recipe.materials)) {
    let left = count;
    for (const box of sources) { const take = Math.min(left, box.contents[material] || 0); box.contents[material] -= take; left -= take; if (!left) break; }
  }
  bench.crafting = { itemId, actorId: actor.id, progress: 0, workTicks: recipe.seconds * 10 };
  return true;
}

export function setJob(state, actorId, job, slot = 'primary') {
  const actor = (state.actors || []).find((a) => a.id === actorId && a.faction === 'player' && a.state !== 'dead');
  if (!actor || !['primary', 'secondary'].includes(slot) || (job != null && !BUILD_JOBS.includes(job))) return false;
  actor.jobs ||= { primary: null, secondary: null };
  actor.jobs[slot] = job || null;
  if (actor.jobs.primary && actor.jobs.primary === actor.jobs.secondary) actor.jobs.secondary = null;
  return true;
}

export function finishAllSites(state) {
  const o = ensureOutposts(state);
  for (const p of o.pieces) if (p.state === 'site') { p.state = 'done'; p.work = p.workRequired; for (const m of Object.keys(p.cost)) p.delivered[m] = p.cost[m]; o.rev += 1; }
  return true;
}

export { BUILDINGS };
