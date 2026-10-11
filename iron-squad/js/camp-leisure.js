// Quiet camp. Off-duty soldiers keep one seat instead of orbiting a moving slot.
// The pose comes from the soldier id and is not written into the save.
import { WORLD_SIZE } from './world.js?v=182';
import { isSoldierOnExpedition } from './expedition-rules.js';

export const CAMP_X = WORLD_SIZE / 2;
export const CAMP_Y = WORLD_SIZE / 2;
export const CAMP_QUIET_RADIUS = 640;
export const CAMP_GUARD_HOME = 700;
export const CAMP_SEAT_GAP = 36;
export const CAMP_ARRIVE = 8;
export const CAMP_ENGAGE = 360;
const MESS_COLS = 8;
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
  if (Math.hypot(soldier.x - CAMP_X, soldier.y - CAMP_Y) > CAMP_QUIET_RADIUS + 200) return false;
  if (carrying(game, soldier)) return false;
  const patient = game._medicRescueAssign?.get?.(soldier.id);
  if (patient && patient.isDown && !patient.dead) return false;
  const platoons = game.platoons || [];
  const platoon = platoons[(soldier.platoonId || 0) % 3] || platoons[0];
  if (isSoldierOnExpedition(platoon, soldier)) return false;
  if (soldier.isPersonalGuard) {
    const player = game.player;
    if (!player || game.joystick?.active) return false;
    if (Math.hypot(player.x - CAMP_X, player.y - CAMP_Y) > CAMP_GUARD_HOME) return false;
  }
  return true;
}

export function messPoint(index, pose) {
  const col = index % MESS_COLS;
  const row = Math.floor(index / MESS_COLS);
  return {
    x: CAMP_X + (col - (MESS_COLS - 1) / 2) * CAMP_SEAT_GAP,
    y: CAMP_Y + 96 + row * CAMP_SEAT_GAP,
    facing: col % 2 === 0 ? 0.25 : Math.PI - 0.25,
    pose
  };
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
  const monsters = game.monsters || [];
  for (let i = 0; i < monsters.length; i++) {
    const monster = monsters[i];
    if (!monster || monster.dead || monster.retreated || (monster.hp != null && monster.hp <= 0)) continue;
    const dist = Math.hypot(monster.x - CAMP_X, monster.y - CAMP_Y);
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
  for (let i = 0; i < body.length; i++) body[i]._leisureSeat = messPoint(i, campPoseFor(body[i]));
}

function enemyWithin(game, soldier, radius) {
  const campDist = Math.hypot(soldier.x - CAMP_X, soldier.y - CAMP_Y);
  if ((game._campNearestThreat ?? Infinity) > campDist + radius) return false;
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
  const dx = seat.x - soldier.x;
  const dy = seat.y - soldier.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMP_ARRIVE) {
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
