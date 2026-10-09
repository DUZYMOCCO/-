// Reserves wait as farmhands at 川辺の農村. Posts are draw-only and are not saved.
// Automatic recruits stop at one field army. Hired, rescued, and overflow soldiers can stand past that.
import { fieldBlocks } from './world.js?v=143';
import { ECONOMIC_REGIONS } from './regional-economy.js?v=143';

export const RESERVE_CAP = 48;
const FARM = ECONOMIC_REGIONS.find(region => region.id === 'river_farms');
export const FARM_X = FARM.x;
export const FARM_Y = FARM.y;
const COLS = 8;
const GAP_X = 42;
const GAP_Y = 40;
const ORIGIN_X = 250;
const ORIGIN_Y = -70;
const POSES = ['hoe', 'basket', 'tend'];

export function farmPoseFor(soldier) {
  const id = String(soldier?.id ?? '');
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return POSES[(hash >>> 0) % POSES.length];
}

function byId(a, b) {
  return String(a.id).localeCompare(String(b.id));
}

function livingReserves(reserves) {
  const living = [];
  for (const soldier of reserves || []) if (soldier && !soldier.dead) living.push(soldier);
  living.sort(byId);
  return living;
}

export function reinforcementCount(squadLiving, reserveLiving, capacity, minimum = 5) {
  const wanted = Math.max(minimum, capacity - squadLiving - reserveLiving);
  const room = Math.max(0, RESERVE_CAP - reserveLiving);
  return Math.min(room, Math.max(0, wanted));
}

export function farmOverlaps(count, camX, camY, visX, visY) {
  if (!count) return false;
  const rows = Math.max(1, Math.ceil(count / COLS));
  const left = FARM_X + ORIGIN_X - 80;
  const top = FARM_Y + ORIGIN_Y - 80;
  const right = left + (COLS - 1) * GAP_X + 420;
  const bottom = top + (rows - 1) * GAP_Y + 420;
  return camX + visX > left && camX - visX < right && camY + visY > top && camY - visY < bottom;
}

export function farmPosts(reserves, blocked = fieldBlocks) {
  const living = livingReserves(reserves);
  const used = new Set();
  const posts = new Array(living.length);
  for (let i = 0; i < living.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x0 = FARM_X + ORIGIN_X + col * GAP_X;
    const y0 = FARM_Y + ORIGIN_Y + row * GAP_Y;
    let x = x0;
    let y = y0;
    let guard = 0;
    while ((blocked(x, y) || used.has(`${x}|${y}`)) && guard < 24) {
      guard++;
      y = y0 + (guard % 8) * 16;
      x = x0 + Math.floor(guard / 8) * 20;
    }
    used.add(`${x}|${y}`);
    posts[i] = {
      soldier: living[i],
      x,
      y,
      facing: col % 2 === 0 ? 0.35 : Math.PI - 0.35,
      pose: farmPoseFor(living[i])
    };
  }
  return posts;
}

export function reserveRosterLine(activeCount, capacity, reserveCount, reserveLiving, supply) {
  const full = reserveLiving >= RESERVE_CAP;
  const farm = reserveCount ? '川辺の農村で農作業' : `予備${RESERVE_CAP}名まで自動補充`;
  const note = full
    ? `自動の新兵は停止 · ${farm}`
    : supply
      ? `前回の新兵 ${supply.received}名（配備${supply.deployed}名）${reserveCount ? ' · 川辺の農村' : ''}`
      : farm;
  return `実戦 ${activeCount}/${capacity}名 · 予備 ${reserveCount}/${RESERVE_CAP}名 · ${note}`;
}

export function reserveRosterTitle(reserveCount) {
  if (!reserveCount) return '本陣の予備兵 0名（欠員時に合流）';
  return `川辺の農村の予備兵 ${reserveCount}名（欠員時に合流）`;
}
