// 錠前（bldg1）: 扉と箱の錠の強さ、錠前破りの成功率・時間・伸び。
// 成功率の式は Kenshi（fandom Lockpicking）: 90 / 2^((錠の強さ - 腕)/10)、上限 90%、5% 未満は試せない。
// 1回の試しの長さ・伸びの量は ★ここで決めた値（research/buildings_locks_theft.md）。

import { makeEvent } from './data.js';
import { growUse } from './needs.js';
import { boxById, houseById, houseAt, th } from './town.js';

export const PICK_CAP = 0.9;
export const PICK_MIN = 0.05;
export const PICK_XP = { success: 3.0, fail: 0.6 }; // ★成功は失敗の5倍（Kenshi の比）。量はここの値
export const PICK_SEC = { slow: 6, fast: 2 }; // ★1回の試し: 腕1で6秒 → 腕50以上で2秒（±20%）

export function lockChance(skill, level) {
  const s = Number.isFinite(skill) ? skill : 0;
  const l = Number.isFinite(level) ? level : 0;
  return Math.min(PICK_CAP, PICK_CAP / Math.pow(2, (l - s) / 10));
}

export function lockSkill(actor) {
  return actor && actor.skills && typeof actor.skills.lockpicking === 'number' ? actor.skills.lockpicking : 0;
}

// 錠の持ち主（扉 or 箱）。{ kind, id, lock, locked, house }
export function lockTarget(state, kind, id) {
  if (kind === 'door') {
    const h = houseById(state, id);
    if (!h) return null;
    return { kind, id, obj: h.door, lock: h.door.lock, house: h.id };
  }
  const b = boxById(state, id);
  if (!b) return null;
  return { kind: 'box', id, obj: b, lock: b.lock, house: b.house };
}

export function pickCycleTicks(actor, seq) {
  const skill = lockSkill(actor);
  const sec = Math.max(PICK_SEC.fast, Math.min(PICK_SEC.slow, PICK_SEC.slow - (skill * (PICK_SEC.slow - PICK_SEC.fast)) / 50));
  const jitter = 0.8 + 0.4 * th(actor.id, seq, 'cycle');
  return Math.max(10, Math.round(sec * 10 * jitter));
}

// 試せるか（成功率 5% 以上）。戻り: { ok, chance }
export function canPick(actor, lock) {
  const chance = lockChance(lockSkill(actor), lock);
  return { ok: chance >= PICK_MIN, chance };
}

// 着いた後に始める
export function beginPick(state, actor, kind, id, events) {
  const t = lockTarget(state, kind, id);
  if (!t) return false;
  if (!t.obj.locked) {
    if (events) events.push(makeEvent(state, 'town', '鍵はかかっていない'));
    return false;
  }
  if (kind === 'door' && houseAt(state, actor.x, actor.z, 0.2)) {
    // 内側からは閂を外すだけ
    t.obj.locked = false;
    if (events) events.push(makeEvent(state, 'town', actor.name + 'が内側から閂を外した'));
    return false;
  }
  const c = canPick(actor, t.lock);
  if (!c.ok) {
    if (events) events.push(makeEvent(state, 'town', actor.name + 'の腕では無理だ（錠 ' + t.lock + '、成功率 ' + Math.round(c.chance * 100) + '%）'));
    return false;
  }
  const seq = 1;
  actor.pick = { kind, id, house: t.house, t: 0, seq, cycle: pickCycleTicks(actor, seq), tries: 0, chance: c.chance, startTick: state.tick };
  if (events) events.push(makeEvent(state, 'town', actor.name + 'が錠前破りを始めた（錠 ' + t.lock + '、成功率 ' + Math.round(c.chance * 100) + '%）'));
  return true;
}

// 毎tick。錠前破りをしている者を返す（law.js が「破っているところを見られたか」を見る）
export function updatePicks(state, events) {
  const active = [];
  for (const a of state.actors) {
    const p = a.pick;
    if (!p) continue;
    if (a.state === 'dead' || a.state === 'down' || a.state === 'getup' || a.carriedBy !== null && a.carriedBy !== undefined) {
      a.pick = null;
      continue;
    }
    const t = lockTarget(state, p.kind, p.id);
    if (!t || !t.obj.locked) {
      a.pick = null;
      if (a.townTask) a.townTask = null;
      continue;
    }
    active.push(a);
    p.t += 1;
    if (p.t < p.cycle) continue;
    const chance = lockChance(lockSkill(a), t.lock);
    const roll = th(state.seed, a.id, p.id, p.seq, 'roll');
    p.tries += 1;
    if (roll < chance) {
      t.obj.locked = false;
      if (p.kind === 'door') t.obj.picked = true;
      growUse(a, 'lockpicking', PICK_XP.success);
      if (events) events.push(makeEvent(state, 'town', a.name + 'が錠を開けた（' + p.tries + '回目）'));
      a.pick = null;
      if (a.townTask) a.townTask = null;
    } else {
      growUse(a, 'lockpicking', PICK_XP.fail);
      p.seq += 1;
      p.t = 0;
      p.cycle = pickCycleTicks(a, p.seq);
      p.chance = lockChance(lockSkill(a), t.lock);
    }
  }
  return active;
}
