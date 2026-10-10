/** Field hosts that are not the demon-king invasion and not the castle boss.
 *  Medium brutes replace an ordinary wild roll. Demon warbands march in from the castle bearing.
 *  Speech timers and the talk flip start with "_" so a rest copy drops them.
 */

export const BRUTE_TYPE = 'brute';
export const BRUTE_NAME = '岩鬼';
export const BRUTE_RADIUS = 40;
export const BRUTE_DRAW_SCALE = 3.6;
export const BRUTE_CAP = 2;
/** Below the day-night fixture roll of 0.1, so a forced period enemy is not replaced. */
export const BRUTE_CHANCE = 0.09;

export const DEMON_FRONT = 'demon_front';
export const DEMON_REAR = 'demon_rear';
export const WARBAND_FIRST_DELAY = 150;
export const WARBAND_INTERVAL = 170;
export const WARBAND_RETRY = 20;
export const WARBAND_SPAWN_DIST = 6400;
export const WARBAND_HOLD_DIST = 260;
export const CASTLE_OFFSET_X = 42000;
export const CASTLE_OFFSET_Y = 42000;
export const DEMON_LOOT_DISTANCE = 16000;

/** Local x is forward, toward the camp. Local y is the side. Rear stays behind the front. */
export const DEMON_SLOTS = Object.freeze([
  {role:'front', x:36, y:0},
  {role:'front', x:24, y:-34},
  {role:'front', x:24, y:34},
  {role:'rear', x:-86, y:-24},
  {role:'rear', x:-86, y:24}
]);

const FRONT_LINES = Object.freeze(['通すな。', '本陣を割れ。', '前を守れ。']);
const REAR_LINES = Object.freeze(['後ろは我らだ。', '射て。', '列を崩すな。']);
const SPEECH_GAP = 6.5;
const SPEECH_COLOR = '#d9c7a2';

const norm = (x, y) => {
  const d = Math.hypot(x, y);
  if (d < 1e-6) return {x:1, y:0, d:0};
  return {x:x / d, y:y / d, d};
};

export function countFieldBrutes(monsters) {
  let n = 0;
  for (const m of monsters || []) if (m && m.type === BRUTE_TYPE && m.hp > 0) n++;
  return n;
}

/** Null in the peace zone, in chaos, and once two brutes are already alive. */
export function rollFieldBrute(monsters, zoneId, random = Math.random) {
  if (zoneId !== 'ZONE_WILD') return null;
  if (countFieldBrutes(monsters) >= BRUTE_CAP) return null;
  if (random() >= BRUTE_CHANCE) return null;
  return {
    type: BRUTE_TYPE,
    name: BRUTE_NAME,
    rawHp: 480,
    rawAtk: 58,
    speed: 36,
    radius: BRUTE_RADIUS,
    color: '#6e5844',
    attackInterval: 1.85,
    attackReach: 64,
    dropCount: 3,
    sureDrop: true,
    lootKind: 'elite',
    isElite: true,
    isBoss: false,
    fixedKind: true
  };
}

export function warbandSpawnOrigin(camp) {
  const face = norm(CASTLE_OFFSET_X, CASTLE_OFFSET_Y);
  return {
    x: camp.x + face.x * WARBAND_SPAWN_DIST,
    y: camp.y + face.y * WARBAND_SPAWN_DIST
  };
}

function slotOf(unit) {
  return DEMON_SLOTS[unit?.formationSlot] || DEMON_SLOTS[0];
}

export function makeDemonWarband(camp, id = 'warband') {
  const origin = warbandSpawnOrigin(camp);
  const face = norm(camp.x - origin.x, camp.y - origin.y);
  const side = {x:-face.y, y:face.x};
  return DEMON_SLOTS.map((slot, i) => {
    const front = slot.role === 'front';
    const x = origin.x + face.x * slot.x + side.x * slot.y;
    const y = origin.y + face.y * slot.x + side.y * slot.y;
    return {
      x, y, homeX:x, homeY:y,
      type: front ? DEMON_FRONT : DEMON_REAR,
      name: front ? '魔族の前衛' : '魔族の後衛',
      formationRole: slot.role,
      formationSlot: i,
      warbandId: id,
      isDemonWarband: true,
      fixedKind: true,
      isElite: true,
      isBoss: false,
      isRaidMob: false,
      isDemonInvasion: false,
      hp: front ? 320 : 170,
      maxHp: front ? 320 : 170,
      atk: front ? 26 : 22,
      speed: front ? 44 : 50,
      radius: front ? 15 : 13,
      attackInterval: front ? 1.4 : 2.6,
      attackReach: front ? 34 : 22,
      range: front ? 0 : 330,
      color: front ? '#6e403c' : '#5c4d5a',
      lootDistance: DEMON_LOOT_DISTANCE,
      lootKind: 'elite',
      sureDrop: true,
      dropCount: 1,
      atkTimer: front ? 0.8 : 1.4,
      _talk: SPEECH_GAP,
      hitPulse: 0,
      zoneId: 'ZONE_WILD'
    };
  });
}

export function livingWarband(monsters) {
  return (monsters || []).filter(m => m && m.isDemonWarband && m.hp > 0);
}

function average(units) {
  let x = 0, y = 0;
  for (const u of units) { x += u.x; y += u.y; }
  return {x:x / units.length, y:y / units.length};
}

function nearestLiving(origin, units, maxDist) {
  let best = null, bestD = maxDist;
  for (const u of units || []) {
    if (!u || !(u.hp > 0) || u.dead || u.isDown) continue;
    const d = Math.hypot(u.x - origin.x, u.y - origin.y);
    if (d <= bestD) { best = u; bestD = d; }
  }
  return best;
}

export function livingThreats(game) {
  const list = [];
  const add = u => { if (u && u.hp > 0 && !u.dead && !u.isDown) list.push(u); };
  add(game?.player);
  for (const s of game?.squad || []) add(s);
  return list;
}

/** One shared anchor so five members do not each drag the line forward. */
export function formationStep(members, dt, camp, threats = []) {
  const living = (members || []).filter(m => m && m.hp > 0);
  if (!living.length || !(dt > 0)) return null;
  const center = average(living);
  const toCamp = norm(camp.x - center.x, camp.y - center.y);
  const dist = toCamp.d || Math.hypot(camp.x - center.x, camp.y - center.y);
  const threat = nearestLiving(center, threats, 520);
  let face = toCamp;
  if (threat) {
    const toThreat = norm(threat.x - center.x, threat.y - center.y);
    face = norm(toCamp.x * 0.35 + toThreat.x * 0.65, toCamp.y * 0.35 + toThreat.y * 0.65);
  }
  const hold = dist <= WARBAND_HOLD_DIST;
  const march = hold ? 0 : Math.min(dist, 70 * dt);
  const anchor = {x:center.x + toCamp.x * march, y:center.y + toCamp.y * march};
  const side = {x:-face.y, y:face.x};
  for (const unit of living) {
    const slot = slotOf(unit);
    const tx = anchor.x + face.x * slot.x + side.x * slot.y;
    const ty = anchor.y + face.y * slot.x + side.y * slot.y;
    const dx = tx - unit.x, dy = ty - unit.y;
    const gap = Math.hypot(dx, dy);
    const slow = unit.magicSlowTimer > 0 ? 0.55 : 1;
    const step = Math.min(gap, (unit.speed || 40) * slow * dt);
    if (gap > 0.001 && step > 0) {
      unit.x += dx / gap * step;
      unit.y += dy / gap * step;
    }
    unit.facingAngle = Math.atan2(face.y, face.x);
  }
  return {center, anchor, hold};
}

function fireBolt(game, unit, target) {
  const shots = game.projectiles || (game.projectiles = []);
  let bolts = 0;
  for (const p of shots) if (p && p.type === 'ENEMY_BOLT') bolts++;
  if (bolts >= 16) return;
  const dx = target.x - unit.x, dy = target.y - unit.y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = 280;
  shots.push({
    type:'ENEMY_BOLT', target,
    x:unit.x, y:unit.y,
    vx:dx / d * speed, vy:dy / d * speed,
    life:2.3, damage:unit.atk,
    damageKind:'physical', splash:0,
    color:'#c4a574',
    sourceX:unit.x, sourceY:unit.y
  });
}

function speakOnce(game, members, dt) {
  let leader = members[0];
  for (const unit of members) if (unit.formationSlot < leader.formationSlot) leader = unit;
  leader._talk = (leader._talk == null ? SPEECH_GAP : leader._talk) - dt;
  if (leader._talk > 0) return;
  leader._talk = SPEECH_GAP;
  const rear = members.filter(m => m.formationRole === 'rear');
  leader._talkFlip = !leader._talkFlip;
  const speaker = leader._talkFlip && rear.length ? rear[0] : leader;
  const lines = speaker.formationRole === 'rear' ? REAR_LINES : FRONT_LINES;
  const line = lines[Math.floor(Math.random() * lines.length)];
  game.spawnDamageText?.(speaker.x, speaker.y - 42, line, SPEECH_COLOR);
}

export function stepDemonWarbandGroup(game, dt, camp) {
  const members = livingWarband(game?.monsters).filter(m => !(m.magicStunTimer > 0));
  if (!members.length) return false;
  const threats = livingThreats(game);
  formationStep(members, dt, camp, threats);
  const center = average(members);
  const target = nearestLiving(center, threats, 800);
  for (const unit of members) {
    unit.atkTimer = Math.max(0, (unit.atkTimer || 0) - dt);
    if (!target || unit.atkTimer > 0) continue;
    const d = Math.hypot(target.x - unit.x, target.y - unit.y);
    if (unit.formationRole === 'rear') {
      if (d <= (unit.attackReach || 22)) {
        game.damageTarget?.(target, unit.atk, {attacker: unit});
        unit.atkTimer = unit.attackInterval || 2.6;
      } else if (d <= (unit.range || 330)) {
        fireBolt(game, unit, target);
        unit.atkTimer = unit.attackInterval || 2.6;
      }
    } else if (d <= (unit.attackReach || 34)) {
      game.damageTarget?.(target, unit.atk, {attacker: unit});
      unit.atkTimer = unit.attackInterval || 1.4;
    }
  }
  speakOnce(game, members, dt);
  return true;
}

export function demonMarchPaused(game) {
  if (!game || game.restTimer > 0 || game.currentDungeon) return true;
  if (game.baseRaidActive) return true;
  const stage = game.invasions && game.invasions.stage;
  return !!(stage && stage !== 'idle');
}

export function advanceDemonWarband(game, dt, camp, limit = 40) {
  if (!game || demonMarchPaused(game) || !(dt > 0)) return false;
  const living = livingWarband(game.monsters);
  if (living.length) {
    game.demonWarbandTimer = WARBAND_INTERVAL;
    return false;
  }
  if (game.demonWarbandTimer == null) game.demonWarbandTimer = WARBAND_FIRST_DELAY;
  game.demonWarbandTimer -= dt;
  if (game.demonWarbandTimer > 0) return false;
  if ((game.monsters?.length || 0) + DEMON_SLOTS.length > limit) {
    game.demonWarbandTimer = WARBAND_RETRY;
    return false;
  }
  const id = `warband-${Math.floor(Math.random() * 1e9)}`;
  for (const unit of makeDemonWarband(camp, id)) game.monsters.push(unit);
  game.demonWarbandTimer = WARBAND_INTERVAL;
  return true;
}
