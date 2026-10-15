// Quiet camp. Off-duty soldiers keep one seat instead of orbiting a moving slot.
// The pose comes from the soldier id and is not written into the save.
import { WORLD_SIZE, TAVERN_SITE } from './world.js?v=277';
import { outerWallBuilt, insideOuterWall } from './hq-outer-wall.js?v=198';
import { isSoldierOnExpedition,expeditionPlatoonId } from './expedition-rules.js?v=256';

export const CAMP_X = WORLD_SIZE / 2;
export const CAMP_Y = WORLD_SIZE / 2;
export const CAMP_QUIET_RADIUS = 640;
export const CAMP_GUARD_HOME = 700;
export const CAMP_ARRIVE = 8;
export const CAMP_ENGAGE = 360;
const POSES = ['sit', 'drink', 'eat'];

export function campPoseFor(soldier) {
  const id = String(soldier?.id ?? '');
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return POSES[(hash >>> 0) % POSES.length];
}

function byId(a, b) {
  return String(a.id).localeCompare(String(b.id));
}

function carrying(game, soldier) {
  const id = String(soldier.id);
  for (const other of game.squad || []) {
    if (other && other.carrierId != null && String(other.carrierId) === id) return true;
  }
  for (const civ of game.civilians || []) {
    if (civ && !civ.rescued && civ.carrierId != null && String(civ.carrierId) === id) return true;
  }
  return false;
}

function canRest(game, soldier) {
  if(soldier?.heroPartyId)return false;
  if (!soldier || soldier.dead || soldier.isDown || (soldier.hp != null && soldier.hp <= 0)) return false;
  const near = game._campAtTavern
    ? insideOuterWall(soldier.x - CAMP_X, soldier.y - CAMP_Y, 150)
    : Math.hypot(soldier.x - CAMP_X, soldier.y - CAMP_Y) <= CAMP_QUIET_RADIUS + 200;
  if (!near) return false;
  if (carrying(game, soldier)) return false;
  const patient = game._medicRescueAssign?.get?.(soldier.id);
  if (patient && patient.isDown && !patient.dead) return false;
  const platoons = game.platoons || [];
  const platoon = platoons[expeditionPlatoonId(soldier)] || platoons[0];
  if (isSoldierOnExpedition(platoon, soldier)) return false;
  if (soldier.isPersonalGuard) {
    const player = game.player;
    if (!player || game.joystick?.active) return false;
    if (Math.hypot(player.x - CAMP_X, player.y - CAMP_Y) > CAMP_GUARD_HOME) return false;
  }
  return true;
}

// Off-duty soldiers gather in uneven groups around small round tables (and the HQ campfire).
// Fixed layouts with hashed jitter: nothing is random at run time or written to the save.
const jitter = (a, b) => ((Math.imul(a + 11, 2654435761) ^ Math.imul(b + 7, 40503)) >>> 0) / 4294967296 - 0.5;
// HQ yard, offsets from the HQ centre. Keeps clear of the buildings, tents, torches,
// the merchant's pitch in the south-west (-210, 160) and the inner wall.
const YARD_GROUPS = [
  { x: 72, y: 70, n: 6, fire: true }, { x: -90, y: 40, n: 5 },
  { x: -105, y: 170, n: 5 }, { x: -5, y: 175, n: 5 },
  { x: -150, y: 244, n: 5 }, { x: -62, y: 244, n: 6 }, { x: 45, y: 244, n: 5 },
  { x: -45, y: -150, n: 6 }, { x: 45, y: -150, n: 5 }, { x: 0, y: -225, n: 6 }
];
// Beer garden in front of the field tavern, offsets from TAVERN_SITE (the door).
const GARDEN_GROUPS = [];
for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
  const i = row * 4 + col;
  GARDEN_GROUPS.push({ x: (col - 1.5) * 94 + jitter(i, 1) * 14 + (row % 2 ? 12 : -8), y: 172 + row * 92 + jitter(i, 2) * 12, n: 4 + Math.floor((jitter(i, 3) + 0.5) * 3) });
}
function seatsAround(groups, ox, oy) {
  const tables = groups.map((g, t) => ({ x: ox + g.x, y: oy + g.y, fire: !!g.fire, turn: jitter(t, 9) * 2 }));
  const rounds = [];
  groups.forEach((g, t) => {
    const table = tables[t], reach = g.fire ? 40 : 26 + g.n * 1.5;
    for (let k = 0; k < g.n; k++) {
      const a = table.turn + k * Math.PI * 2 / g.n + jitter(t, k) * 0.4;
      const r = reach + jitter(k, t) * 7;
      const x = table.x + Math.cos(a) * r, y = table.y + Math.sin(a) * r * 0.8;
      // The first three of every table fill before any table gets a fourth: small parties spread out.
      (rounds[Math.max(0, k - 2)] ||= []).push({ x, y, facing: Math.atan2(table.y - y, table.x - x) });
    }
  });
  return { tables: tables.filter(t => !t.fire), seats: rounds.flat() };
}
const YARD = seatsAround(YARD_GROUPS, CAMP_X, CAMP_Y);
const GARDEN = seatsAround(GARDEN_GROUPS, TAVERN_SITE.x, TAVERN_SITE.y);
// Two terrace tables for strangers and waiting companions. Keep the doorway clear
// and use separate stools from the off-duty army's garden further south.
const TAVERN = seatsAround([{x:-100,y:66,n:6},{x:105,y:70,n:6}],TAVERN_SITE.x,TAVERN_SITE.y);
export const YARD_TABLES = YARD.tables, YARD_SEAT_COUNT = YARD.seats.length;
export const GARDEN_TABLES = GARDEN.tables, GARDEN_SEAT_COUNT = GARDEN.seats.length;
export const TAVERN_TABLES = TAVERN.tables, TAVERN_SEAT_COUNT = TAVERN.seats.length;
function seatAt(layout, index, pose) {
  const base = layout.seats[index % layout.seats.length], lap = Math.floor(index / layout.seats.length);
  // More soldiers than stools: the extra ones squeeze in behind, a little further out.
  return { x: base.x + (lap ? Math.cos(base.facing + Math.PI) * 18 * lap : 0), y: base.y + (lap ? Math.sin(base.facing + Math.PI) * 14 * lap : 0), facing: base.facing, pose };
}
/** Seat in the HQ yard. */
export const messPoint = (index, pose) => seatAt(YARD, index, pose);
/** Seat in the beer garden in front of the field tavern (used once the outer bailey stands). */
export const gardenPoint = (index, pose) => seatAt(GARDEN, index, pose);
/** Terrace seat for tavern candidates and companions, independent of the army. */
export const tavernPoint = (index, pose) => seatAt(TAVERN, index, pose);
/** A small round table with a few mugs; drawn on the ground layer under the seated soldiers. */
export function drawLeisureTable(c, t) {
  c.save(); c.translate(t.x, t.y);
  c.fillStyle = 'rgba(16,12,8,.32)'; c.beginPath(); c.ellipse(2, 5, 19, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5c4430'; c.fillRect(-3, 0, 6, 7);
  c.fillStyle = '#7d5c3c'; c.beginPath(); c.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#4b3826'; c.lineWidth = 1.2; c.stroke();
  c.fillStyle = '#93714b'; c.beginPath(); c.ellipse(-2, -2, 12, 6, 0, 0, Math.PI * 2); c.fill();
  const h = Math.round((t.x * 7 + t.y * 13) % 5 + 5) % 5;
  for (let i = 0; i < 2 + (h % 3); i++) {
    const mx = -9 + ((h + i * 7) % 18), my = -4 + ((h * 3 + i * 5) % 7);
    c.fillStyle = '#d9c7a2'; c.fillRect(mx, my - 4, 4, 5); c.fillStyle = '#7a3e3a'; c.fillRect(mx + 1, my - 3, 2, 2);
  }
  if (h % 2) { c.fillStyle = '#c4a574'; c.beginPath(); c.ellipse(6, 1, 4, 2, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

export function guardPoint(player, index, pose) {
  const ring = Math.floor(index / 6);
  const step = index % 6;
  const angle = -2.7 + step * 0.62;
  const dist = 58 + ring * 40;
  const x = player.x + Math.cos(angle) * dist;
  const y = player.y + Math.sin(angle) * dist;
  return { x, y, facing: Math.atan2(player.y - y, player.x - x), pose };
}

export function refreshCampQuiet(game, now) {
  let nearest = Infinity;
  // Behind the outer bailey the off-duty army drinks at the tavern; a foe inside the walls or near either spot ends it.
  const tavern = game._campAtTavern = outerWallBuilt(game);
  const monsters = game.monsters || [];
  for (let i = 0; i < monsters.length; i++) {
    const monster = monsters[i];
    if (!monster || monster.dead || monster.retreated || (monster.hp != null && monster.hp <= 0)) continue;
    let dist = Math.hypot(monster.x - CAMP_X, monster.y - CAMP_Y);
    if (tavern) {
      dist = Math.min(dist, Math.hypot(monster.x - TAVERN_SITE.x, monster.y - TAVERN_SITE.y - 260));
      if (insideOuterWall(monster.x - CAMP_X, monster.y - CAMP_Y)) dist = 0;
    }
    if (dist < nearest) nearest = dist;
  }
  game._campNearestThreat = nearest;
  const invaded = !!(game.invasions && game.invasions.stage && game.invasions.stage !== 'idle');
  const called = now < (game.commandActiveUntil || 0);
  game._campYardQuiet = !game.currentDungeon && !game.baseRaidActive && !invaded && !called && nearest > CAMP_QUIET_RADIUS;
  return game._campYardQuiet;
}

export function assignCampSeats(game, squad) {
  const list = squad || [];
  for (const soldier of list) {
    if (!soldier) continue;
    soldier._leisureSeat = null;
    soldier.campPose = null;
  }
  if (!game._campYardQuiet) return;
  const guards = [];
  const body = [];
  for (const soldier of list) {
    if (!canRest(game, soldier)) continue;
    (soldier.isPersonalGuard ? guards : body).push(soldier);
  }
  guards.sort(byId);
  body.sort(byId);
  for (let i = 0; i < guards.length; i++) guards[i]._leisureSeat = guardPoint(game.player, i, campPoseFor(guards[i]));
  const seat = game._campAtTavern ? gardenPoint : messPoint;
  for (let i = 0; i < body.length; i++) body[i]._leisureSeat = seat(i, campPoseFor(body[i]));
}

function enemyWithin(game, soldier, radius) {
  const campDist = game._campAtTavern ? 0 : Math.hypot(soldier.x - CAMP_X, soldier.y - CAMP_Y);
  if (!game._campAtTavern && (game._campNearestThreat ?? Infinity) > campDist + radius) return false;
  const limit = radius * radius;
  const list = game._baseThreatList || game.monsters || [];
  for (let i = 0; i < list.length; i++) {
    const monster = list[i];
    if (!monster || monster.dead || monster.retreated || (monster.hp != null && monster.hp <= 0)) continue;
    const dx = monster.x - soldier.x;
    const dy = monster.y - soldier.y;
    if (dx * dx + dy * dy < limit) return true;
  }
  return false;
}

export function tryCampLeisure(game, soldier, dt) {
  const seat = soldier._leisureSeat;
  if (!seat) {
    soldier.campPose = null;
    return false;
  }
  if (enemyWithin(game, soldier, CAMP_ENGAGE)) {
    soldier.campPose = null;
    return false;
  }
  const target=soldier.isPersonalGuard?(game.dungeonMoveTarget?.(soldier,seat)||seat):seat;
  const dx = target.x - soldier.x;
  const dy = target.y - soldier.y;
  const dist = Math.hypot(dx, dy);
  if (Math.hypot(seat.x-soldier.x,seat.y-soldier.y) > CAMP_ARRIVE && dist > 0) {
    soldier.campPose = null;
    const step = Math.min(dist * 3.5, soldier.speed || 90) * dt;
    soldier.x += (dx / dist) * step;
    soldier.y += (dy / dist) * step;
    soldier.vx = dx / dist;
    soldier.vy = dy / dist;
    soldier.facingAngle = Math.atan2(dy, dx);
  } else {
    soldier.campPose = seat.pose;
    soldier.vx = 0;
    soldier.vy = 0;
    soldier.facingAngle = seat.facing;
  }
  if (soldier.atkAnim > 0) soldier.atkAnim = Math.max(0, soldier.atkAnim - dt * 4);
  soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
  return true;
}
