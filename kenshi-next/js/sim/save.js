// セーブデータの文字列化と復元。DOM に依存しない。

import { sexOf } from './data.js';
import { normalizeKits } from './medkit.js';

export const SAVE_VERSION = 1;
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;

const STEALTH_DEFAULTS = {
  player: { stealth: 1, assassination: 1 },
  guard: { stealth: 10, assassination: 3 },
  bandit: { stealth: 8, assassination: 5 },
  beast: { stealth: 0, assassination: 0 },
};

const EYE_VALUES = ['none', 'blue', 'yellow', 'red'];

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function serialize(state, savedAt) {
  if (!state || typeof state !== 'object') return null;
  if (state.version !== SAVE_VERSION) return null;
  const at = Number(savedAt);
  try {
    return JSON.stringify({
      v: SAVE_VERSION,
      savedAt: Number.isFinite(at) ? at : 0,
      state,
    });
  } catch (err) {
    return null;
  }
}

export function deserialize(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.v !== SAVE_VERSION) return null;
  const state = parsed.state;
  if (!state || typeof state !== 'object') return null;
  if (state.version !== SAVE_VERSION) return null;
  if (!Array.isArray(state.actors)) return null;
  // 勢力の仲・敷いた寝袋（stagger より前のセーブには無い）
  if (!state.rep || typeof state.rep !== 'object') state.rep = {};
  if (!Array.isArray(state.bedrolls)) state.bedrolls = [];
  if (typeof state.bedrollSeq !== 'number') state.bedrollSeq = state.bedrolls.length;
  for (const actor of state.actors) {
    if (!actor || typeof actor !== 'object') continue;
    if (typeof actor.hunger !== 'number' || !Number.isFinite(actor.hunger)) actor.hunger = 80;
    if (typeof actor.food !== 'number' || !Number.isFinite(actor.food)) {
      actor.food = actor.faction === 'player' ? 3 : 0;
    }
    // 手当ての道具（hitreact1 より前のセーブには無い）
    if (!Array.isArray(actor.kits) && (typeof actor.medkit !== 'number' || !Number.isFinite(actor.medkit))) actor.medkit = actor.faction === 'player' ? 5 : 0;
    normalizeKits(actor); // 回数の救急箱（stagger より前）→ 耐久の箱
    if (typeof actor.bedrollItem !== 'number' || !Number.isFinite(actor.bedrollItem)) actor.bedrollItem = actor.faction === 'player' ? 1 : 0;
    if (typeof actor.movedRun !== 'boolean') actor.movedRun = false;
    if (typeof actor.movedCarry !== 'boolean') actor.movedCarry = false;
    if (actor.sex !== 'f' && actor.sex !== 'm' && actor.sex !== null) actor.sex = sexOf(actor, state); // 20:42 より前のセーブ

    if (!actor.skills || typeof actor.skills !== 'object') actor.skills = {};
    const skillDefaults = STEALTH_DEFAULTS[actor.faction] || STEALTH_DEFAULTS.beast;
    if (!isNumber(actor.skills.stealth)) actor.skills.stealth = skillDefaults.stealth;
    if (!isNumber(actor.skills.assassination)) {
      actor.skills.assassination = skillDefaults.assassination;
    }
    if (typeof actor.sneaking !== 'boolean') actor.sneaking = false;
    if (!actor.detect || typeof actor.detect !== 'object' || Array.isArray(actor.detect)) {
      actor.detect = {};
    }
    if (!EYE_VALUES.includes(actor.eye)) actor.eye = 'none';
    if (actor.eyeFrom === undefined) actor.eyeFrom = null;
    if (!isNumber(actor.eyeLevel)) actor.eyeLevel = 0;
    if (
      !actor.knownTargets ||
      typeof actor.knownTargets !== 'object' ||
      Array.isArray(actor.knownTargets)
    ) {
      actor.knownTargets = {};
    }
    if (!Array.isArray(actor.watchers)) actor.watchers = [];
    if (!isNumber(actor.light)) actor.light = 1;
    if (typeof actor.lantern !== 'boolean') actor.lantern = false;
    if (actor.crossbow === undefined) actor.crossbow = null;
    if (actor.crossbow) {
      const c = actor.crossbow;
      if (!isNumber(c.bolts)) c.bolts = 0;
      if (typeof c.loaded !== 'boolean') c.loaded = false;
      if (!isNumber(c.reload)) c.reload = 0;
      if (!isNumber(c.aim)) c.aim = 0;
    }
    if (!isNumber(actor.skills.crossbow)) actor.skills.crossbow = 0;
    if (actor.faction === 'player') {
      if (!isNumber(actor.skills.lockpicking)) actor.skills.lockpicking = 1;
      if (!isNumber(actor.skills.thievery)) actor.skills.thievery = 1;
    }
    if (typeof actor.aiming !== 'boolean') actor.aiming = false;
    if (!isNumber(actor.lastShotTick)) actor.lastShotTick = -1000;
    if (actor.assassinTargetId === undefined) actor.assassinTargetId = null;
    if (!isNumber(actor.assassinTicks)) actor.assassinTicks = 0;
    if (typeof actor.movedThisTick !== 'boolean') actor.movedThisTick = false;
    if (typeof actor.movedRunThisTick !== 'boolean') actor.movedRunThisTick = false;
  }
  // 町（bldg1）: 壊れた町は捨てる（opts.town の無い世界と同じになる）。賞金・牢・罪は形だけ直す
  if (state.town !== undefined) {
    const t = state.town;
    if (!t || typeof t !== 'object' || !Array.isArray(t.houses) || !Array.isArray(t.boxes)) delete state.town;
    else {
      if (!t.banned || typeof t.banned !== 'object') t.banned = {};
      for (const h of t.houses) {
        if (!h.door || typeof h.door !== 'object') h.door = { open: false, locked: false, lock: 0, closeAt: 0, auto: false, policy: null };
        if (!Array.isArray(h.boxes)) h.boxes = [];
      }
      for (const b of t.boxes) {
        if (!b.goods || typeof b.goods !== 'object') b.goods = {};
        if (!isNumber(b.cash)) b.cash = 0;
      }
    }
  }
  if (state.law !== undefined && (!state.law || typeof state.law !== 'object')) delete state.law;
  if (state.law) {
    if (!state.law.fight || typeof state.law.fight !== 'object') state.law.fight = {};
    if (!state.law.recog || typeof state.law.recog !== 'object') state.law.recog = {};
    if (state.law.arrest === undefined) state.law.arrest = null;
  }
  for (const actor of state.actors) {
    if (!actor || typeof actor !== 'object') continue;
    if (actor.bounty !== undefined && (!actor.bounty || typeof actor.bounty !== 'object')) delete actor.bounty;
    if (actor.jail && (typeof actor.jail !== 'object' || !isNumber(actor.jail.untilSec))) actor.jail = null;
    if (actor.pick && typeof actor.pick !== 'object') actor.pick = null;
    if (actor.townTask && typeof actor.townTask !== 'object') actor.townTask = null;
    if (actor.crime && typeof actor.crime !== 'object') actor.crime = null;
  }
  if (!Array.isArray(state.projectiles)) state.projectiles = [];
  if (!isNumber(state.nextBoltId)) state.nextBoltId = 1;
  return state;
}
