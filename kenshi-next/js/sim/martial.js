// 素手格闘の暫定値。既存の世界生成では乱数を消費しない。
import { encumbranceFromLoad, loadRatio } from './inventory.js';
import { ITEMS } from './items.js';
import { rand } from './rng.js';
import { houseAt } from './town.js';
import { MARTIAL_TECHNIQUES } from '../data/martial_moves.js';
import { armUsable } from './grip.js';
import { effectiveStrength } from './needs.js';

const move = (id, name, min, powers, limbs, clips, options = {}) => ({ id, name, min, powers, limbs, clips, weight: 1, range: 1.6, ...options });
export const MA_MOVES = [
  move('bad_punch','拙拳',0,[50],['lArm'],['Punching'],{max:20}),
  move('low_kick','下段蹴り',5,[70],['lLeg'],['Mma Kick','Standing Melee Kick'],{low:true}),
  move('hook','鉤拳',10,[85],['lArm'],['Hook Punch']),
  move('palm','直掌',15,[100],['lArm'],['Cross Punch','Lead Jab']),
  move('elbow','肘打ち',20,[95],['lArm'],['Elbow Punching','Illegal Elbow Punch','Illegal Elbow Punch (1)']),
  move('double_strike','双打',25,[60,100],['lArm','rArm'],['Jab Cross','Body Jab Cross','Body Jab Cross (1)','Body Jab Cross (2)']),
  move('jump_kick','飛び蹴り',30,[120],['lLeg'],['Flying Kick'],{maxEnc:0.5,range:2.2}),
  move('uppercut','突き上げ',30,[110],['lArm'],['Uppercut']),
  move('double_punch','連拳',35,[80,100],['lArm','rArm'],['Punch Combo','Combo Punch']),
  move('uppercut_jab','突き上げ連拳',40,[60,110],['lArm'],['Uppercut Jab']),
  move('quad_punch','四連拳',40,[40,40,50,80],['lArm','rArm'],['Quad Punch']),
  move('throw','肩投げ',40,[60],['lArm','rArm'],['Flying Shoulder Throw'],{maxEnc:0.2,weight:0.15,throw:true,disabled:true}),
  move('mega_kick','大回し蹴り',45,[180],['lLeg','rLeg'],['Roundhouse Kick','Hurricane Kick'],{maxEnc:0.4,range:2.2}),
  move('elbow_combo','拳肘連打',50,[70,80,120],['lArm'],['Punch To Elbow Combo']),
  move('jump_knee','飛び膝連打',55,[100,150],['lLeg','rArm'],['Flying Knee Punch Combo'],{maxEnc:0,range:2.2}),
];
export const MARTIAL_TECHNIQUE_MOVES = MARTIAL_TECHNIQUES.map((entry) => ({
  ...move(entry.id, entry.name, entry.lv, entry.powers, entry.limbs, entry.clips, entry),
  ...entry,
  min: entry.lv,
}));
export const ALL_MARTIAL_MOVES = [...MA_MOVES, ...MARTIAL_TECHNIQUE_MOVES];
export const MARTIAL_GEAR = { fist_guard: ITEMS.fist_guard, leg_guard: ITEMS.leg_guard };
export function martialGear(actor) {
  const equipped = actor.equip?.acc || [];
  const result = { martial:0, fistProtection:false, legProtection:false, attack:1 };
  for (const item of equipped) {
    const g = MARTIAL_GEAR[typeof item === 'string' ? item : item?.id];
    if (!g) continue;
    result.martial += g.martial; result.fistProtection ||= g.fistProtection || false;
    result.legProtection ||= g.legProtection || false; result.attack *= g.attack;
  }
  return result;
}
export function encumbranceOf(actor) { return Math.max(actor.carryingId != null ? 0.5 : 0, encumbranceFromLoad(loadRatio(actor))); }
export function effectiveMartial(state, actor) {
  const raw = (actor.skills?.martial ?? (actor.isPlayer ? 1 : actor.skills?.attack ?? 0)) + martialGear(actor).martial;
  return Math.max(0, raw * (1 - Math.min(0.8, encumbranceOf(actor) * 0.8)) + (houseAt(state, actor.x, actor.z) ? 8 : 0));
}
export function effectiveDodge(state, actor) {
  return (actor.skills?.dodge ?? 0) * (1 - Math.min(0.8, encumbranceOf(actor) * 0.8));
}
function limbUsable(actor, p) { return p === 'lArm' ? armUsable(actor,'left') : p === 'rArm' ? armUsable(actor,'right') : (actor.parts?.[p]?.hp ?? 100) > 0 && !actor.missing?.includes(p); }

// 筋肉探偵の3すくみは『闘魂烈伝』準拠の循環関係で扱う:
// 関節技 > 打撃 > 組技 > 関節技。
const SUBMISSION_MOVE_IDS = new Set(['armbar', 'kimura']);
export function moveCategory(move, clipName) {
  if (!move) return null;
  const clip = clipName || move.clips?.[0] || '';
  if (SUBMISSION_MOVE_IDS.has(move.id) || /armbar|kimura/i.test(clip)) return 'submission';
  if (move.throw || move.pair) return 'grapple';
  return 'strike';
}

export function currentMoveCategory(actor) {
  if (actor?.swing?.ma) return moveCategory(actor.swing.ma, actor.swing.ma.clip);
  if (actor?.martialPair?.role === 'attacker') {
    return moveCategory({ id: actor.martialPair.moveId, throw: true, pair: true }, actor.martialPair.clip);
  }
  return null;
}

export function categoryBeats(attackerKind, defenderKind) {
  return (attackerKind === 'submission' && defenderKind === 'strike')
    || (attackerKind === 'strike' && defenderKind === 'grapple')
    || (attackerKind === 'grapple' && defenderKind === 'submission');
}

export function availableMoves(actor, level, enc = encumbranceOf(actor)) {
  // 筋肉探偵のレスラー（manny 体）は Kenshi の lv に縛られない。
  // 組技・打撃・関節技の3すくみをすべて使えるようにする（テスト）。
  const muscle = actor.body === 'manny';
  return ALL_MARTIAL_MOVES.filter(m => {
    if (m.disabled) return false;
    const lvOk = muscle ? true : (level >= m.min && (m.max == null || level <= m.max));
    if (!lvOk) return false;
    if (m.maxEnc != null && enc > m.maxEnc) return false;
    return m.limbs.every(p => limbUsable(actor,p));
  });
}
export function selectMove(state, actor, level) {
  if (actor.martialDemoMoveId) {
    // 要求された技は availableMoves の経路で解決する。
    // 筋肉探偵の manny レスラーはレベル制限を無視するので、
    // 従来のように min を直接比べると pal_driver などが選べなかった。
    const requested = availableMoves(actor, level).find(m => m.id === actor.martialDemoMoveId);
    actor.martialDemoMoveId = null;
    if (requested) return { move: requested, clip: requested.clips[0] };
  }
  let list = availableMoves(actor, level); if (!list.length) return null;
  if (actor.body === 'manny' && actor.targetId != null) {
    // 相手が今出している技を読んで、3すくみで勝てるカテゴリを優先する。
    // AI の読みには乱数ブレを入れて、毎回同じ読みにはしない。
    const target = state.actors.find(other => other.id === actor.targetId);
    const threat = target ? currentMoveCategory(target) : null;
    if (threat) {
      const counters = list.filter(m => categoryBeats(moveCategory(m), threat));
      if (counters.length && rand(state) < 0.75) list = counters;
    }
  }
  let roll = rand(state) * list.reduce((sum, m) => sum + m.weight, 0);
  const chosen = list.find(m => (roll -= m.weight) < 0) || list[list.length - 1];
  return { move: chosen, clip: chosen.clips[Math.floor(rand(state) * chosen.clips.length)] };
}
export function martialDamage(actor, level, power) {
  const total = (2.5 + 0.075 * level) * power / 100 * (1 + 0.01 * effectiveStrength(actor)) * (1 + 0.005 * (actor.skills?.attack || 0)) * 2 * martialGear(actor).attack;
  const cut = Math.max(0, Math.min(0.6, level / 100 * 0.6));
  return { total, cut, blunt: total * (1 - cut) };
}
export function martialArmorPenetration(level) { return level >= 100 ? 0.2 : 0; }
export function isMetalTarget(target, part) { return !!(target.swordsman || target.machine); }
export function recoilDamage(actor, target, part, limb, level, armorMetal = false) {
  const gear = martialGear(actor);
  if (!(armorMetal || isMetalTarget(target, part)) || (limb.endsWith('Arm') ? gear.fistProtection : gear.legProtection)) return 0;
  return Math.max(0, 2 - (level + (actor.skills?.toughness || 0)) * 0.01);
}
export function martialDodgeChance(level, dexterity, attack) {
  return Math.max(0.03, Math.min(0.75, 0.25 + (level - attack) * 0.012 + dexterity * 0.002));
}

// 格闘150の白刃取り。受け判定を通った後の発動率。
export function martialCatchChance(level) {
  return Number(level) >= 150 ? 0.35 : 0;
}
