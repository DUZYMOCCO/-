import { actorOwner } from './faction_relations.js';
import { ensureTurret } from './turret.js';
import { ensureForgeBenches } from './smithing.js';
import { initInventory } from './inventory.js';
import { ensurePlayerSquads } from './squads.js';
// セーブデータの文字列化と復元。DOM に依存しない。

import { sexOf } from './data.js';
import { normalizeKits } from './medkit.js';
import { assignRace } from './races.js';
import { ensureOutposts } from './outposts.js';

export const SAVE_VERSION = 2;
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
    const { dialogue, ...persistentState } = state;
    return JSON.stringify({
      v: SAVE_VERSION,
      savedAt: Number.isFinite(at) ? at : 0,
      state: !state.settlementPeopleEnabled ? persistentState : { ...persistentState, settlementPeople: {}, actors: state.actors.filter(a=>!a.settlementId).map(a=>{
        const copy={...a}; const ids=new Set(state.actors.filter(b=>b.settlementId).map(b=>b.id));
        for(const key of ['targetId','carryingId','carriedBy','carryTargetId','lootTargetId']) if(ids.has(copy[key])) copy[key]=null;
        return copy;
      }) },
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
  if (parsed.v !== 1 && parsed.v !== SAVE_VERSION) return null;
  const state = parsed.state;
  if (!state || typeof state !== 'object') return null;
  if (state.version !== 1 && state.version !== SAVE_VERSION) return null;
  state.version = SAVE_VERSION;
  if (!Array.isArray(state.actors)) return null;
  if (!state.factionHostile || typeof state.factionHostile !== 'object' || Array.isArray(state.factionHostile)) state.factionHostile = {};
  if (state.relations?.guard_player === 'hostile') state.relations.guard_player = 'neutral';
  // 勢力の仲・敷いた寝袋（stagger より前のセーブには無い）
  if (!state.rep || typeof state.rep !== 'object') state.rep = {};
  if (!Array.isArray(state.bedrolls)) state.bedrolls = [];
  if (typeof state.bedrollSeq !== 'number') state.bedrollSeq = state.bedrolls.length;
  ensureOutposts(state);
  if (!Array.isArray(state.forgeBenches)) ensureForgeBenches(state);
  for (const actor of state.actors) {
    if (!actor || typeof actor !== 'object') continue;
    if (!actor.race) assignRace(actor, { forceDefault: !!actor.isPlayer || (state.squadIds || []).includes(actor.id) });
    if (actor.faction === 'guard' && !actor.ownerFaction) actor.ownerFaction = actorOwner(actor);
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
    if (!isNumber(actor.skills.martial)) actor.skills.martial = actor.isPlayer ? 1 : (isNumber(actor.skills.attack) ? actor.skills.attack : 0);
    if (!isNumber(actor.skills.dodge)) actor.skills.dodge = actor.isPlayer ? 1 : Math.round((actor.skills.dexterity || 0) * 0.5 + (actor.skills.martial ?? actor.skills.attack ?? 0) * 0.3);
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
    for (const key of ['perception', 'precision']) if (!isNumber(actor.skills[key])) actor.skills[key] = actor.skills.crossbow;
    if (!isNumber(actor.skills.turret)) actor.skills.turret = actor.faction === 'player' ? 1 : 0;
    for (const key of ['perception', 'precision', 'turret']) actor.skills[key] = Math.max(0, Math.min(100, actor.skills[key]));
    initInventory(actor);
    if (actor.faction === 'player') {
      if (!isNumber(actor.skills.lockpicking)) actor.skills.lockpicking = 1;
      if (!isNumber(actor.skills.thievery)) actor.skills.thievery = 1;
      if (!isNumber(actor.skills.smithing)) actor.skills.smithing = 1;
    }
    if (typeof actor.aiming !== 'boolean') actor.aiming = false;
    if (!isNumber(actor.lastShotTick)) actor.lastShotTick = -1000;
    if (actor.assassinTargetId === undefined) actor.assassinTargetId = null;
    if (!isNumber(actor.assassinTicks)) actor.assassinTicks = 0;
    if (typeof actor.movedThisTick !== 'boolean') actor.movedThisTick = false;
    if (typeof actor.movedRunThisTick !== 'boolean') actor.movedRunThisTick = false;
    if (!['aggressive', 'defensive', 'passive'].includes(actor.stance)) actor.stance = 'defensive';
    if (!['follow', 'hold', 'bodyguard'].includes(actor.order)) actor.order = 'follow';
    if (actor.followTargetId === undefined) actor.followTargetId = null;
    if (actor.guardTargetId === undefined) actor.guardTargetId = null;
    if (typeof actor.blockStance !== 'boolean') actor.blockStance = false;
    if (typeof actor.holdGround !== 'boolean') actor.holdGround = false;
    if (typeof actor.work !== 'boolean') actor.work = false;
    if (typeof actor.rangedOnly !== 'boolean') actor.rangedOnly = false;
    if (typeof actor.taunt !== 'boolean') actor.taunt = false;
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
  ensureTurret(state);
  ensurePlayerSquads(state);
  return state;
}
