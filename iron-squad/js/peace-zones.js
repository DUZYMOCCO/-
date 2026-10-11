import {WORLD_SIZE} from './world.js?v=182';
import {ECONOMIC_REGIONS} from './regional-economy.js?v=182';

export const CAMP_PEACE_RADIUS = 1200;
export const SETTLEMENT_PEACE_RADIUS = 1040;
const CAMP_X = WORLD_SIZE / 2;
const CAMP_Y = WORLD_SIZE / 2;

let bubbles = null;
export function peaceBubbles() {
  if (bubbles) return bubbles;
  bubbles = [{id:'camp', x:CAMP_X, y:CAMP_Y, r:CAMP_PEACE_RADIUS}];
  for (const region of ECONOMIC_REGIONS) {
    if (region.kind === 'village' || (region.kind === 'town' && region.id !== 'hq')) {
      bubbles.push({id:region.id, x:region.x, y:region.y, r:SETTLEMENT_PEACE_RADIUS});
    }
  }
  return bubbles;
}

export function peaceContainment(x, y) {
  let hit = null;
  for (const bubble of peaceBubbles()) {
    const dx = x - bubble.x, dy = y - bubble.y, dist = Math.hypot(dx, dy);
    if (dist < bubble.r && (!hit || bubble.r - dist > hit.depth)) hit = {bubble, dx, dy, dist, depth:bubble.r - dist};
  }
  return hit;
}

/** Step out to the nearest point that is outside every peace bubble. */
export function pushOutsidePeace(x, y) {
  if (!peaceContainment(x, y)) return {x, y, moved:false};
  const fromCamp = Math.hypot(x - CAMP_X, y - CAMP_Y);
  const baseAng = fromCamp < 1 ? -Math.PI / 2 : Math.atan2(y - CAMP_Y, x - CAMP_X);
  let best = null;
  for (let turn = 0; turn < 24; turn++) {
    const sweep = turn === 0 ? 0 : (turn % 2 ? 1 : -1) * Math.ceil(turn / 2) * (Math.PI / 12);
    const ang = baseAng + sweep;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    let radius = fromCamp;
    for (let step = 0; step < 30; step++) {
      radius += 80;
      const px = CAMP_X + ux * radius, py = CAMP_Y + uy * radius;
      if (peaceContainment(px, py)) continue;
      const movedDist = Math.hypot(px - x, py - y);
      if (!best || movedDist < best.movedDist) best = {x:px, y:py, movedDist};
      break;
    }
  }
  return best ? {x:best.x, y:best.y, moved:true} : {x, y, moved:false};
}

export function ringMissesPeace(x, y, reach = 900) {
  for (const bubble of peaceBubbles()) {
    if (Math.hypot(x - bubble.x, y - bubble.y) < bubble.r + reach) return false;
  }
  return true;
}

export function relocatePeaceMonster(monster) {
  if (!monster || !(monster.hp > 0) || monster.isBoss || monster.isColossal || monster.isRaidMob || monster.isDungeonBoss || monster.isTradeRaider || monster.isDemonInvasion || monster.isDemonWarband) return false;
  const next = pushOutsidePeace(monster.x, monster.y);
  if (!next.moved || peaceContainment(next.x, next.y)) return false;
  monster.x = next.x;
  monster.y = next.y;
  if (monster.homeX !== undefined) { monster.homeX = next.x; monster.homeY = next.y; }
  return true;
}
