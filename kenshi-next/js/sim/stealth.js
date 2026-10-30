// 隠密・気づき度・暗殺。

import {
  VISION,
  WORLD_HALF,
  TICK_SEC,
  distBetween,
  indexActors,
  isHostile,
  makeEvent,
  setAnim,
} from './data.js';
import { growUse } from './needs.js';
import { ambientLight, lightAtActor } from './light.js';
import { actorRadius, blockedAt } from './collide.js';
import { rand } from './rng.js';
import { losClear } from './town.js';

const TAU = Math.PI * 2;
const CLOSE_RANGE = 2.5;
const FRONT_ANGLE = Math.PI / 3;
const SIDE_ANGLE = (100 * Math.PI) / 180;
const DETECT_GAIN = 0.06;
const DETECT_DECAY = 0.015;
// 仮: 警戒が解けてから記憶が消えるまで（ゲーム内1時間＝3600秒＝1200tick、等速で実時間約2分）。
export const ALERT_CALM_SEC = 3600;

function clampWorld(v) {
  if (v < -WORLD_HALF + 1) return -WORLD_HALF + 1;
  if (v > WORLD_HALF - 1) return WORLD_HALF - 1;
  return v;
}

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function normalizeAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= TAU;
  while (value < -Math.PI) value += TAU;
  return value;
}

function isSkillNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// 時刻だけの明るさ（前からの名前）。場所ごとの明るさは light.js の lightAtActor。
export function lightAt(state) {
  return ambientLight(state);
}

export function visionRange(observer, light) {
  const base = VISION[observer.faction] || 14;
  return base * (0.55 + 0.45 * light);
}

export function observerActive(observer) {
  return (
    !!observer &&
    observer.state !== 'dead' &&
    observer.state !== 'down' &&
    observer.state !== 'getup'
  );
}

function detectOf(actor, observerId) {
  if (!actor || !actor.detect || typeof actor.detect !== 'object') return 0;
  const value = actor.detect[observerId];
  return isSkillNumber(value) ? value : 0;
}

function writeDetect(actor, observerId, value) {
  if (!actor.detect || typeof actor.detect !== 'object') actor.detect = {};
  if (value <= 0) {
    delete actor.detect[observerId];
    return;
  }
  actor.detect[observerId] = value > 1 ? 1 : value;
}

function knownOf(observer) {
  if (
    !observer.knownTargets ||
    typeof observer.knownTargets !== 'object' ||
    Array.isArray(observer.knownTargets)
  ) {
    observer.knownTargets = {};
  }
  return observer.knownTargets;
}

// 観察者が対象と戦っている（死・気絶以外）。距離や視界に関係なく警戒中とみなす。
function isFighting(observer, target) {
  if (!observer || observer.state === 'dead' || observer.state === 'down') return false;
  return observer.targetId === target.id || observer.lastAttackerId === target.id;
}

// 警戒が解けて ALERT_CALM_SEC を超えた記憶は、対象の気づき度ごと消す。
function calmMemory(target, observer, nowSec) {
  const known = knownOf(observer);
  if (!isSkillNumber(known[target.id])) return known;
  if (nowSec - known[target.id] > ALERT_CALM_SEC) {
    delete known[target.id];
    writeDetect(target, observer.id, 0);
  }
  return known;
}

export function viewFactor(observer, target, distance) {
  if (distance <= CLOSE_RANGE) {
    if (target.sneaking && !target.movedThisTick) return 0.2;
    return 0.6;
  }
  const angle = Math.atan2(target.x - observer.x, target.z - observer.z);
  const diff = Math.abs(normalizeAngle(angle - (observer.rot || 0)));
  if (diff <= FRONT_ANGLE) return 1;
  if (diff <= SIDE_ANGLE) return 0.5;
  return 0;
}

export function effectiveStealth(state, actor) {
  if (!actor || !actor.skills) return 0;
  const raw = isSkillNumber(actor.skills.stealth) ? actor.skills.stealth : 0;
  const toughness = isSkillNumber(actor.skills.toughness) ? actor.skills.toughness : 0;
  let hp = 0;
  let max = 0;
  if (actor.parts && typeof actor.parts === 'object') {
    for (const key of Object.keys(actor.parts)) {
      const part = actor.parts[key];
      if (!part) continue;
      if (isSkillNumber(part.hp)) hp += part.hp;
      if (isSkillNumber(part.max)) max += part.max;
    }
  }
  const wound = max > 0 ? 1 - hp / max : 0;
  const value = raw * (1 - wound * (1 - toughness / 100));
  return clamp(value, 0, 100);
}

export function canSee(state, observer, target) {
  if (!state || !observer || !target) return false;
  if (observer.id === target.id) return false;
  if (!observerActive(observer)) return false;
  const light = lightAtActor(state, target);
  const range = visionRange(observer, light);
  const distance = distBetween(observer, target);
  if (observer.targetId === target.id || observer.lastAttackerId === target.id) {
    if (distance <= range * 1.5) return true;
  }
  if (distance > range) return false;
  const factor = viewFactor(observer, target, distance);
  if (factor <= 0) return false;
  // 町（bldg1）: 壁と閉じた扉の向こうは見えない
  if (state.town && !losClear(state, observer.x, observer.z, target.x, target.z)) return false;
  if (target.sneaking) return detectOf(target, observer.id) >= 1;
  return true;
}

function hasHostileWithinRange(state, target, light) {
  for (const observer of state.actors) {
    if (observer.id === target.id) continue;
    if (!observerActive(observer)) continue;
    if (!isHostile(state, observer.faction, target.faction)) continue;
    if (distBetween(observer, target) <= visionRange(observer, light)) return true;
  }
  return false;
}

function hasOtherWithinRange(state, target, light) {
  for (const other of state.actors) {
    if (other.id === target.id) continue;
    if (!observerActive(other)) continue;
    if (isHostile(state, other.faction, target.faction)) continue;
    if (distBetween(other, target) <= visionRange(other, light)) return true;
  }
  return false;
}

export function updateStealth(state, events) {
  if (!state || !Array.isArray(state.actors)) return;
  const list = events || [];
  const nowSec = isSkillNumber(state.timeSec) ? state.timeSec : 0;

  for (const target of state.actors) {
    const moved = !!target.movedThisTick;
    const ran = !!target.movedRunThisTick;
    target.movedThisTick = false;
    target.movedRunThisTick = false;

    if (!target.detect || typeof target.detect !== 'object') target.detect = {};
    // その人物の位置の明るさ（灯りを持てば自分も照らされる）。
    const light = lightAtActor(state, target);
    const lightTerm = 0.25 + 0.75 * light;
    target.light = light;

    // 警戒が解けて ALERT_CALM_SEC を超えた記憶は、隠密中でも先に消す。
    for (const observer of state.actors) {
      if (observer.id === target.id) continue;
      calmMemory(target, observer, nowSec);
    }

    if (!target.sneaking || target.state === 'dead') {
      target.detect = {};
      target.eye = 'none';
      target.eyeFrom = null;
      target.eyeLevel = 0;
      target.watchers = [];
      // 隠密していない姿を見られたら、その観察者は覚える（隠密し直しても隠れられない）。
      if (target.state !== 'dead') {
        for (const observer of state.actors) {
          if (observer.id === target.id) continue;
          if (!isHostile(state, observer.faction, target.faction)) continue;
          const known = knownOf(observer);
          if (canSee(state, observer, target) || isFighting(observer, target)) {
            known[target.id] = nowSec;
          }
        }
      }
      continue;
    }

    const eff = effectiveStealth(state, target);
    const skillTerm = Math.max(0.05, 1 - eff / 110);
    let moveTerm = moved ? (ran ? 1.6 : 1) : 0.35;
    if (target.carryingId !== null && target.carryingId !== undefined) moveTerm *= 1.5;

    const seen = new Set();
    const watchers = [];
    for (const observer of state.actors) {
      if (observer.id === target.id) continue;
      // 町（bldg1）: 衛兵・町人も隠密中の仲間に気づく（盗み・錠前破りを見るため）
      const lawWatch = !!state.town && observer.faction === 'guard' && target.faction === 'player';
      if (!isHostile(state, observer.faction, target.faction) && !lawWatch) continue;
      seen.add(String(observer.id));

      // 記憶: 直近 ALERT_CALM_SEC 以内に見つけられていれば気づき度1から始める。
      const known = knownOf(observer);
      if (
        isSkillNumber(known[target.id]) &&
        nowSec - known[target.id] <= ALERT_CALM_SEC &&
        detectOf(target, observer.id) < 1
      ) {
        writeDetect(target, observer.id, 1);
      }

      const old = detectOf(target, observer.id);
      if (!observerActive(observer) || (lawWatch && observer.resting)) {
        if (old > 0) writeDetect(target, observer.id, old - DETECT_DECAY);
        if (isFighting(observer, target)) known[target.id] = nowSec;
        continue;
      }
      const range = visionRange(observer, light);
      const distance = distBetween(observer, target);
      let factor = distance <= range ? viewFactor(observer, target, distance) : 0;
      if (factor > 0 && state.town && !losClear(state, observer.x, observer.z, target.x, target.z)) factor = 0;
      if (factor > 0) {
        const inc =
          DETECT_GAIN *
          factor *
          Math.pow(1 - distance / range, 1.5) *
          lightTerm *
          moveTerm *
          skillTerm;
        const next = old + inc;
        if (old < 1 && next >= 1 && target.faction === 'player') {
          list.push(makeEvent(state, 'stealth', observer.name + 'が' + target.name + 'に気づいた'));
        }
        writeDetect(target, observer.id, next);
        const level = detectOf(target, observer.id);
        watchers.push({
          id: observer.id,
          level,
          state: level >= 1 ? 'red' : 'yellow',
        });
        // 見つけた tick（と赤の間）、または戦っている間は観察者の記憶を更新する。
        if (level >= 1 || isFighting(observer, target)) known[target.id] = nowSec;
      } else {
        if (old > 0) writeDetect(target, observer.id, old - DETECT_DECAY);
        // 視界の外でも戦っている間は警戒中として記憶を更新する。
        if (isFighting(observer, target)) known[target.id] = nowSec;
      }
    }

    for (const key of Object.keys(target.detect)) {
      if (seen.has(key)) continue;
      const old = isSkillNumber(target.detect[key]) ? target.detect[key] : 0;
      writeDetect(target, key, old - DETECT_DECAY);
    }

    watchers.sort((a, b) => a.id - b.id);
    let anyRed = false;
    let anyYellow = false;
    let maxLevel = 0;
    let best = null;
    for (const watcher of watchers) {
      const red = watcher.state === 'red';
      if (red) anyRed = true;
      else anyYellow = true;
      if (watcher.level > maxLevel) maxLevel = watcher.level;
      if (
        best === null ||
        (red && best.state !== 'red') ||
        (red === (best.state === 'red') &&
          (watcher.level > best.level ||
            (watcher.level === best.level && watcher.id < best.id)))
      ) {
        best = watcher;
      }
    }
    target.watchers = watchers;
    target.eye = anyRed ? 'red' : anyYellow ? 'yellow' : 'blue';
    target.eyeFrom = best ? best.id : null;
    target.eyeLevel = maxLevel;

    if (hasHostileWithinRange(state, target, light)) {
      const mult = target.eye === 'yellow' || target.eye === 'red' ? 2 : 1;
      growUse(target, 'stealth', 0.0015 * mult);
    } else if (hasOtherWithinRange(state, target, light)) {
      growUse(target, 'stealth', 0.0001);
    }
  }
}

function findActor(state, id) {
  for (const actor of state.actors) {
    if (actor.id === id) return actor;
  }
  return null;
}

function backAngle(target, actor) {
  const dx = actor.x - target.x;
  const dz = actor.z - target.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.0001) return 0;
  const faceX = Math.sin(target.rot || 0);
  const faceZ = Math.cos(target.rot || 0);
  const cos = clamp((faceX * dx + faceZ * dz) / distance, -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

function walkTo(state, actor, tx, tz, speed) {
  const dx = tx - actor.x;
  const dz = tz - actor.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.0001) return false;
  const stepLen = Math.min(distance, speed * TICK_SEC);
  const baseAngle = Math.atan2(dx, dz);
  const radius = actorRadius(actor);
  const offsets = [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4];
  for (const offset of offsets) {
    const angle = baseAngle + offset;
    const nx = clampWorld(actor.x + Math.sin(angle) * stepLen);
    const nz = clampWorld(actor.z + Math.cos(angle) * stepLen);
    if (blockedAt(state, nx, nz, radius)) continue;
    actor.x = nx;
    actor.z = nz;
    actor.rot = angle;
    actor.state = 'move';
    actor.movedThisTick = true;
    actor.movedRunThisTick = false;
    setAnim(actor, 'Walk', state.tick);
    return true;
  }
  return false;
}

function resolveAssassination(state, actor, target, events) {
  const skill = actor.skills || {};
  const targetSkill = target.skills || {};
  const a = isSkillNumber(skill.assassination) ? skill.assassination : 0;
  const toughness = isSkillNumber(targetSkill.toughness) ? targetSkill.toughness : 0;
  const assassination = isSkillNumber(targetSkill.assassination) ? targetSkill.assassination : 0;
  const defense = isSkillNumber(targetSkill.defense) ? targetSkill.defense : 0;
  const b = Math.max(toughness * 2, assassination * 2, defense) / 2;
  const p = clamp(0.55 + (a - b) * 0.012, 0.05, 0.95);

  actor.assassinTargetId = null;
  actor.assassinTicks = 0;

  if (rand(state) < p) {
    target.state = 'down';
    target.downTicks = Math.round(220 + a * 6);
    target.detect = {};
    target.targetId = null;
    target.moveTo = null;
    target.anim = 'Fall';
    target.animTick = state.tick;
    events.push(makeEvent(state, 'assassinate', actor.name + 'は' + target.name + 'を気絶させた'));
    growUse(actor, 'assassination', 0.02);
    return;
  }

  if (!target.detect || typeof target.detect !== 'object') target.detect = {};
  target.detect[actor.id] = 1;
  target.targetId = actor.id;
  target.state = 'fight';
  events.push(makeEvent(state, 'assassinate', target.name + 'に気づかれた'));
  growUse(actor, 'assassination', 0.06);
}

export function updateAssassination(state, events) {
  if (!state || !Array.isArray(state.actors)) return;
  const list = events || [];
  const byId = indexActors(state);
  for (const actor of state.actors) {
    if (actor.faction !== 'player') continue;
    if (actor.assassinTargetId === null || actor.assassinTargetId === undefined) continue;
    if (!actor.skills) actor.skills = {};
    if (!isSkillNumber(actor.assassinTicks)) actor.assassinTicks = 0;

    if (actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') {
      actor.assassinTargetId = null;
      actor.assassinTicks = 0;
      continue;
    }

    const target = byId.get(actor.assassinTargetId);
    if (
      !target ||
      target.id === actor.id ||
      target.faction === 'beast' ||
      target.state === 'dead' ||
      target.state === 'down' ||
      target.state === 'getup'
    ) {
      actor.assassinTargetId = null;
      actor.assassinTicks = 0;
      continue;
    }

    const backX = target.x - Math.sin(target.rot || 0) * 1.0;
    const backZ = target.z - Math.cos(target.rot || 0) * 1.0;
    const backDistance = Math.hypot(backX - actor.x, backZ - actor.z);
    if (backDistance > 0.3) {
      let speed = 1.6 * 0.7;
      if (actor.carryingId !== null && actor.carryingId !== undefined) speed *= 0.6;
      walkTo(state, actor, backX, backZ, speed);
    }

    const distance = distBetween(actor, target);
    const angle = backAngle(target, actor);
    if (distance <= 1.3 && angle >= 110) {
      actor.assassinTicks += 1;
      setAnim(actor, 'Punch', state.tick);
      for (const observer of state.actors) {
        if (observer.id === actor.id || observer.id === target.id) continue;
        // 目撃: 隠密中は canSee が気づき度1未満で偽になるので、視界（距離・視野）だけで判定する。
        if (!observerActive(observer) || !isHostile(state, observer.faction, actor.faction)) continue;
        const wr = visionRange(observer, lightAtActor(state, actor));
        const wd = distBetween(observer, actor);
        if (wd <= wr && viewFactor(observer, actor, wd) > 0) {
          writeDetect(actor, observer.id, detectOf(actor, observer.id) + 0.5);
        }
      }
      if (actor.assassinTicks >= 8) {
        resolveAssassination(state, actor, target, list);
      }
    } else {
      actor.assassinTicks = 0;
    }
  }
}

export function assassinationTargetExists(state, id) {
  const actor = findActor(state, id);
  if (!actor) return false;
  return (
    actor.faction !== 'beast' &&
    actor.state !== 'dead' &&
    actor.state !== 'down' &&
    actor.state !== 'getup'
  );
}
