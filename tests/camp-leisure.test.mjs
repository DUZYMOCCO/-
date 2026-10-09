import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { drawFieldSoldier } from '../js/games/iron-squad/visuals.js';
import {
  CAMP_X, CAMP_Y, CAMP_SEAT_GAP, CAMP_QUIET_RADIUS,
  refreshCampQuiet, assignCampSeats, tryCampLeisure, campPoseFor
} from '../js/games/iron-squad/camp-leisure.js';

const packages = process.argv[2] || 'C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { createCanvas } = createRequire(resolve(packages, 'entry.cjs'))('@napi-rs/canvas');

function yard(extra = {}) {
  return {
    currentDungeon: null,
    commandActiveUntil: 0,
    baseRaidActive: false,
    invasions: { stage: 'idle' },
    monsters: [],
    joystick: { active: false },
    player: { x: CAMP_X, y: CAMP_Y },
    platoons: [
      { id: 0, mission: 'idle' },
      { id: 1, mission: 'idle' },
      { id: 2, mission: 'idle', expeditionMemberIds: ['away'] }
    ],
    squad: [],
    civilians: [],
    _medicRescueAssign: new Map(),
    _baseThreatList: [],
    ...extra
  };
}

function soldier(id, extra = {}) {
  return { id, platoonId: 2, x: CAMP_X, y: CAMP_Y, hp: 20, speed: 100, facingAngle: 0, vx: 0, vy: 0, ...extra };
}

const quiet = yard();
assert.equal(refreshCampQuiet(quiet, 0), true);
const home = [soldier('a'), soldier('b'), soldier('c')];
assignCampSeats(quiet, home);
assert.equal(new Set(home.map(s => `${s._leisureSeat.x},${s._leisureSeat.y}`)).size, 3);
assert.equal(Math.hypot(home[0]._leisureSeat.x - home[1]._leisureSeat.x, home[0]._leisureSeat.y - home[1]._leisureSeat.y), CAMP_SEAT_GAP);
assert.ok(['sit', 'drink', 'eat'].includes(home[0]._leisureSeat.pose));
assert.equal(campPoseFor(home[0]), home[0]._leisureSeat.pose);

const threatened = yard({ monsters: [{ x: CAMP_X + 100, y: CAMP_Y, hp: 5 }] });
assert.equal(refreshCampQuiet(threatened, 0), false);
assert.ok(threatened._campNearestThreat < CAMP_QUIET_RADIUS);
assignCampSeats(threatened, home);
assert.equal(home[0]._leisureSeat, null);
assert.equal(home[0].campPose, null);

const raid = yard({ baseRaidActive: true });
assert.equal(refreshCampQuiet(raid, 0), false);
const invasion = yard({ invasions: { stage: 'battle' } });
assert.equal(refreshCampQuiet(invasion, 0), false);
const called = yard({ commandActiveUntil: 5000 });
assert.equal(refreshCampQuiet(called, 1000), false);
const indoors = yard({ currentDungeon: { id: 'mine' } });
assert.equal(refreshCampQuiet(indoors, 0), false);

const guardGame = yard();
refreshCampQuiet(guardGame, 0);
const guard = soldier('guard', { isPersonalGuard: true, platoonId: 0 });
const away = soldier('away', { platoonId: 2 });
guardGame.platoons[2].mission = 'expedition';
const carrier = soldier('carrier');
const wounded = soldier('wounded', { isDown: true, carrierId: 'carrier' });
guardGame.squad = [wounded];
const medic = soldier('medic');
guardGame._medicRescueAssign.set('medic', { isDown: true, dead: false });
assignCampSeats(guardGame, [guard, away, carrier, medic, wounded]);
assert.ok(guard._leisureSeat, 'an idle guard beside the commander sits');
assert.equal(away._leisureSeat, null);
assert.equal(carrier._leisureSeat, null);
assert.equal(medic._leisureSeat, null);
assert.equal(wounded._leisureSeat, null);
guardGame.joystick.active = true;
assignCampSeats(guardGame, [guard]);
assert.equal(guard._leisureSeat, null);
guardGame.joystick.active = false;
guardGame.player = { x: CAMP_X + 900, y: CAMP_Y };
assignCampSeats(guardGame, [guard]);
assert.equal(guard._leisureSeat, null);

const walker = soldier('walker', { x: CAMP_X + 80, y: CAMP_Y + 80 });
const walkGame = yard({ _campNearestThreat: Infinity });
refreshCampQuiet(walkGame, 0);
assignCampSeats(walkGame, [walker]);
const before = Math.hypot(walker._leisureSeat.x - walker.x, walker._leisureSeat.y - walker.y);
assert.equal(tryCampLeisure(walkGame, walker, 0.2), true);
assert.equal(walker.campPose, null);
assert.ok(Math.hypot(walker._leisureSeat.x - walker.x, walker._leisureSeat.y - walker.y) < before);
walker.x = walker._leisureSeat.x;
walker.y = walker._leisureSeat.y;
assert.equal(tryCampLeisure(walkGame, walker, 0.016), true);
assert.equal(walker.campPose, walker._leisureSeat.pose);
assert.equal(walker.vx, 0);
assert.equal(walker.vy, 0);
walkGame._campNearestThreat = 30;
walkGame._baseThreatList = [{ x: walker.x + 20, y: walker.y, hp: 4 }];
assert.equal(tryCampLeisure(walkGame, walker, 0.016), false);
assert.equal(walker.campPose, null);

function near(data, rgb, limit = 18) {
  let best = Infinity;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const dist = Math.hypot(data[i] - rgb[0], data[i + 1] - rgb[1], data[i + 2] - rgb[2]);
    if (dist < best) best = dist;
  }
  return best <= limit;
}

function paint(pose, armorTier) {
  const canvas = createCanvas(220, 220);
  const c = canvas.getContext('2d');
  c.translate(110, 150);
  c.scale(4, 4);
  drawFieldSoldier(c, {
    id: 'paint', x: 0, y: 0, hp: 10, maxHp: 40, soldierClass: 'HEAVY', facingAngle: 0.2,
    campPose: pose, animOffset: 0, vx: 0, vy: 0,
    equipped: armorTier ? { armor: { tier: armorTier }, helmet: { tier: armorTier }, legs: { tier: armorTier } } : {}
  }, 0, { isAdvanced: false, name: '重装兵' }, '#829cae', false);
  return c.getImageData(0, 0, 220, 220).data;
}

const drink = paint('drink', 1);
const eat = paint('eat', 1);
const sit = paint('sit', 1);
const standing = paint(null, 1);
assert.ok(near(drink, [217, 199, 162]), 'a resting soldier holds a cup');
assert.ok(near(drink, [122, 62, 58]), 'the cup has a drink');
assert.ok(near(eat, [196, 165, 116]), 'a resting soldier holds food');
assert.ok(near(sit, [110, 88, 68]), 'the seat is a wooden stool');
assert.equal(near(standing, [122, 62, 58], 12), false, 'a standing soldier has no camp cup');

function chest(tier) {
  const canvas = createCanvas(80, 80);
  const c = canvas.getContext('2d');
  c.translate(40, 56);
  c.scale(2, 2);
  drawFieldSoldier(c, {
    id: 'armor', x: 0, y: 0, hp: 40, maxHp: 40, soldierClass: 'HEAVY', facingAngle: 0.2,
    campPose: 'sit', animOffset: 0, equipped: { armor: { tier } }
  }, 0, { isAdvanced: false }, '#829cae', false);
  const data = c.getImageData(30, 22, 16, 12).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  return [r / n, g / n, b / n];
}
const wood = chest(1);
const steel = chest(17);
assert.ok(Math.hypot(wood[0] - steel[0], wood[1] - steel[1], wood[2] - steel[2]) > 8, 'seated armor keeps the equipped color');

console.log('PASS: camp seats, quiet yard, sit drink eat');
