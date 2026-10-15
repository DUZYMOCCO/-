/**
 * カラー・アント パズル側のロジック（タイル生成）
 * 絵の「色ごとのピクセル数」を、数字つきタイルに分割して5列に並べる。
 * 色数の一致に加え、外郭から実際に回収できる手順を作って配置する。
 */

import { Colony } from './colony.js?v=8';
import { Perimeter } from './perimeter.js?v=8';
import { SIZE } from './pictures.js?v=7';

export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** total を parts 個の正の整数に、ばらつきをつけて分ける（合計は必ず total） */
export function splitCount(total, parts, rng) {
  if (parts <= 1) return [total];
  const w = Array.from({ length: parts }, () => 0.55 + rng());
  const sum = w.reduce((a, b) => a + b, 0);
  const out = w.map(v => Math.max(1, Math.floor((v / sum) * total)));
  let diff = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0 && i < 100000; i++) {
    const k = i % parts;
    if (diff > 0) { out[k]++; diff--; } else if (out[k] > 1) { out[k]--; diff++; }
  }
  return out;
}

/** Canonical layout for callers without a live playfield (unit tests/tools). */
export const SOLUTION_LAYOUT = {
  cell: 1, boardX: 0, boardY: 0,
  nests: [{ x: 18, y: 78 }, { x: 32, y: 78 }, { x: 46, y: 78 }],
  nest: { x: 32, y: 78 }, ant: 1, speed: 20.48,
};

function simulation(pixels, layout) {
  const colony = new Colony();
  colony.reset({ pixels: pixels.map(p => ({ ...p, targeted: false })) });
  colony.setLayout(layout);
  return colony;
}

/** All currently reachable pixels of one color, including paths opened by that color. */
function colorRegion(pixels, key) {
  const air = new Perimeter(SIZE);
  air.rebuild(pixels.map(p => p.key === key ? { ...p, eaten: true } : p));
  return pixels.filter(p => !p.eaten && p.key === key &&
    air.distance[(p.gy + 1) * air.stride + p.gx + 1] >= 0);
}

function finishTile(colony, tile, dt = 1 / 30, speed = 1) {
  colony.addTileToSlot(tile, colony.pixels.find(p => p.key === tile.key).hex);
  // A thin strip can reveal just one new pixel per arriving ant.
  const maxTicks = Math.ceil((tile.n + 2) * (SIZE * 4 * colony.layout.cell / colony.layout.speed + 3) / (dt * speed));
  for (let tick = 0; tick < maxTicks; tick++) {
    colony.update(dt, speed);
    colony.fresh.length = 0;
    if (!colony.busy) return true;
    if (!colony.ants.length && colony.slots.some(s => s && s.left > 0) &&
        !colony.targetPixels.some(p => !p.eaten && p.key === tile.key && colony.isExposed(p))) return false;
  }
  return false;
}

/** Replay the intended order using the real dispatch, path and eating simulation. */
export function verifyTilePlan(pixels, plan, layout = SOLUTION_LAYOUT, dt = 1 / 30, speed = 1) {
  const colony = simulation(pixels, layout);
  const unlocked = new Set();
  for (const tile of plan) {
    if (tile.locked && !unlocked.has(tile.lockId)) return false;
    if (tile.hasKey) unlocked.add(tile.keyId);
    if (!finishTile(colony, tile, dt, speed)) return false;
  }
  return colony.remaining === 0 && colony.delivered === colony.total;
}

/**
 * Finish an entire reachable color region before changing color.
 * Removing that region is independent of individual ants' arrival order.
 */
function regionPlan(pixels, rng, target) {
  const board = pixels.map(p => ({ ...p })), air = new Perimeter(SIZE), plan = [];
  while (board.some(p => !p.eaten)) {
    air.rebuild(board);
    const keys = [...new Set(board.filter(p => !p.eaten && air.isExposed(p)).map(p => p.key))];
    const key = keys[Math.floor(rng() * keys.length)];
    if (key === undefined) throw new Error('No exterior region while generating puzzle');
    const region = colorRegion(board, key);
    const parts = Math.max(1, Math.ceil(region.length / Math.min(30, target)));
    for (const n of splitCount(region.length, parts, rng)) plan.push({ key, n });
    for (const p of region) p.eaten = true;
  }
  return plan;
}

/**
 * Columns keep required predecessors clear, so the next solution tile is always
 * at a column front. Wrong choices can still occupy the five limited slots.
 */
export function buildTiles(counts, rng, { cols = 5, target = 22, pixels = null, level = 1 } = {}) {
  let plan;
  if (!pixels) {
    plan = [];
    for (const [key, count] of Object.entries(counts)) {
      for (const n of splitCount(count, Math.max(1, Math.ceil(count / target)), rng)) plan.push({ key, n });
    }
    for (let i = plan.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]];
    }
  } else {
    plan = regionPlan(pixels, rng, target);
  }
  plan.forEach((tile, order) => { tile.order = order; });
  // Pair each lock with an earlier key in the proven solution, never behind it.
  if (level >= 2) {
    const pairs = level >= 4 ? 2 : 1;
    for (let id = 0; id < pairs; id++) {
      const keyIndex = cols + id * cols * 2;
      const lockIndex = keyIndex + cols + 1;
      if (!plan[keyIndex] || !plan[lockIndex]) continue;
      plan[keyIndex].hasKey = true; plan[keyIndex].keyId = id;
      plan[lockIndex].locked = true; plan[lockIndex].lockId = id;
    }
  }
  const columns = Array.from({ length: cols }, () => []);
  const offset = Math.floor(rng() * cols);
  // A couple of inner colors are visible early as deliberate waiting choices.
  // Their columns receive no earlier solution steps underneath, so they cannot
  // bury a required outer color or remove the intended winning sequence.
  const decoys = new Map();
  if (pixels && cols >= 3) {
    const air = new Perimeter(SIZE); air.rebuild(pixels);
    const exposed = new Set(pixels.filter(p => !p.eaten && air.isExposed(p)).map(p => p.key));
    const chosenKeys = new Set();
    const candidates = plan.filter(t => t.order >= cols * 2 && !t.locked && !t.hasKey && !exposed.has(t.key));
    for (const tile of candidates) {
      if (chosenKeys.has(tile.key)) continue;
      const ci = (offset + decoys.size) % cols;
      columns[ci].push(tile); decoys.set(tile, ci); chosenKeys.add(tile.key);
      if (decoys.size === Math.min(2, cols - 1)) break;
    }
  }
  const blocked = new Set(decoys.values());
  let cursor = offset;
  for (const tile of plan) {
    if (decoys.has(tile)) { blocked.delete(decoys.get(tile)); continue; }
    while (blocked.has(cursor)) cursor = (cursor + 1) % cols;
    columns[cursor].push(tile); cursor = (cursor + 1) % cols;
  }
  return columns;
}

/** タイルの背景色に対して読みやすい文字色 */
export function textColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#3b2a1a' : '#ffffff';
}
