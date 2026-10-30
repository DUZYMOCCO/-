// 素手格闘の暫定値。既存の世界生成では乱数を消費しない。
import { rand } from './rng.js';
import { houseAt } from './town.js';

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
  move('throw','肩投げ',40,[60],['lArm','rArm'],['Flying Shoulder Throw'],{maxEnc:0.2,weight:0.15,throw:true}),
  move('mega_kick','大回し蹴り',45,[180],['lLeg','rLeg'],['Roundhouse Kick','Hurricane Kick'],{maxEnc:0.4,range:2.2}),
  move('elbow_combo','拳肘連打',50,[70,80,120],['lArm'],['Punch To Elbow Combo']),
  move('jump_knee','飛び膝連打',55,[100,150],['lLeg','rArm'],['Flying Knee Punch Combo'],{maxEnc:0,range:2.2}),
];
export const MARTIAL_GEAR = {
  fist_guard: { name:'拳ガード', martial:4, fistProtection:true, attack:1.05 },
  leg_guard: { name:'脚ガード', martial:2, legProtection:true, attack:1 },
};
export function martialGear(actor) {
  const equipped = actor.gear ? Object.values(actor.gear).flat() : [];
  const result = { martial:0, fistProtection:false, legProtection:false, attack:1 };
  for (const item of equipped) {
    const g = MARTIAL_GEAR[typeof item === 'string' ? item : item?.id];
    if (!g) continue;
    result.martial += g.martial; result.fistProtection ||= g.fistProtection || false;
    result.legProtection ||= g.legProtection || false; result.attack *= g.attack;
  }
  return result;
}
export function encumbranceOf(actor) { return actor.carryingId != null ? 0.5 : 0; }
export function effectiveMartial(state, actor) {
  const raw = (actor.skills?.martial ?? (actor.isPlayer ? 1 : actor.skills?.attack ?? 0)) + martialGear(actor).martial;
  return Math.max(0, raw * (1 - Math.min(0.8, encumbranceOf(actor) * 0.8)) + (houseAt(state, actor.x, actor.z) ? 8 : 0));
}
export function effectiveDodge(state, actor) {
  return (actor.skills?.dodge ?? 0) * (1 - Math.min(0.8, encumbranceOf(actor) * 0.8));
}
export function availableMoves(actor, level, enc = encumbranceOf(actor)) {
  return MA_MOVES.filter(m => level >= m.min && (m.max == null || level <= m.max) && (m.maxEnc == null || enc <= m.maxEnc) && m.limbs.every(p => actor.parts?.[p]?.hp >= 0 && !actor.missing?.includes(p)));
}
export function selectMove(state, actor, level) {
  const list = availableMoves(actor, level); if (!list.length) return null;
  let roll = rand(state) * list.reduce((sum, m) => sum + m.weight, 0);
  const chosen = list.find(m => (roll -= m.weight) < 0) || list[list.length - 1];
  return { move: chosen, clip: chosen.clips[Math.floor(rand(state) * chosen.clips.length)] };
}
export function martialDamage(actor, level, power) {
  const total = (2.5 + 0.075 * level) * power / 100 * (1 + 0.01 * (actor.skills?.strength || 0)) * (1 + 0.005 * (actor.skills?.attack || 0)) * 2 * martialGear(actor).attack;
  const cut = Math.max(0, Math.min(0.6, level / 100 * 0.6));
  return { total, cut, blunt: total * (1 - cut) };
}
export function isMetalTarget(target, part) { return !!(target.swordsman || target.machine); }
export function recoilDamage(actor, target, part, limb, level) {
  const gear = martialGear(actor);
  if (!isMetalTarget(target, part) || (limb.endsWith('Arm') ? gear.fistProtection : gear.legProtection)) return 0;
  return Math.max(0, 2 - (level + (actor.skills?.toughness || 0)) * 0.01);
}
export function martialDodgeChance(level, dexterity, attack) {
  return Math.max(0.03, Math.min(0.75, 0.25 + (level - attack) * 0.012 + dexterity * 0.002));
}