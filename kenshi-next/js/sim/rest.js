// 傷（下がった最大値）と、寝具で休んで治すこと。research/health_spec.md §7・§8。
// Kenshi: 手当てした分は「1秒に 0.05 × 0.25 × 種族の治り × 寝床の倍率 × 最大/100」ずつ本当の体力に戻る。
//   寝床の倍率: 寝台 8、野営の寝床（寝袋）4、魚の寝床 2、古い寝台 1、地面 1（kenshi.zone/en/medical）
// この世界: 手当てで体力は「最大 − 傷」まで戻る。傷は休むと減る。速さは Kenshi の REST_SPEEDUP 倍（★5。ここ1つで調整）。
import { makeEvent, setAnim } from './data.js';
import { raceOf } from './races.js';

export const REST_SPEEDUP = 5; // ★Kenshi より何倍早く傷が治るか（ユーザーの決め: 4〜5倍）
export const KENSHI_HEAL_CONVERT = 0.05 * 0.25; // 1秒あたり、最大100の部位で 0.0125
export const PLACE_MULT = { ground: 1, bedroll: 4, bed: 8 };
export const WOUND_RATIO = 0.5; // ★受けた傷の半分は手当てでは戻らず、休んで治す
export const WOUND_CAP = 0.7; // ★傷で下がるのは最大の 7割まで（3割は残る。起き上がり 2割より上）
export const BEDROLL_REACH = 1.2; // m（寝袋の上とみなす距離）
export const REST_REACH = 3; // m（休めと言った時に寝袋を探す距離）
export const PACK_REACH = 2; // m（畳む）
const TICKS_PER_SEC = 10;

export function effMax(part) {
  return Math.max(0, part.max - (part.wound || 0));
}

function noWounds(actor) {
  return !actor || actor.machine || actor.faction === 'beast' || actor.kind === 'beast';
}

export function addWound(actor, part, dmg) {
  if (noWounds(actor) || !part || !(dmg > 0)) return;
  part.wound = Math.min(part.max * WOUND_CAP, (part.wound || 0) + dmg * WOUND_RATIO);
}

export function bedrollAt(state, actor, reach = BEDROLL_REACH) {
  const list = Array.isArray(state.bedrolls) ? state.bedrolls : [];
  let best = null;
  let bd = reach;
  for (const b of list) {
    const d = Math.hypot(b.x - actor.x, b.z - actor.z);
    if (d <= bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

// 休んでいる場所の倍率（寝袋の上で休んでいる時だけ寝袋、他は地面）
export function restPlace(state, actor) {
  if (actor.resting) {
    const b = (state.bedrolls || []).find((x) => x.id === actor.resting);
    if (b && Math.hypot(b.x - actor.x, b.z - actor.z) <= BEDROLL_REACH) return b.kind === 'bed' ? 'bed' : 'bedroll';
  }
  return 'ground';
}

// 1秒あたりに減る傷（部位の最大に比例）
export function woundHealPerSec(part, place = 'ground', actor = null) {
  return KENSHI_HEAL_CONVERT * (part.max / 100) * (PLACE_MULT[place] || 1) * REST_SPEEDUP * (raceOf(actor)?.heal ?? 1);
}

export function stopRest(actor) {
  if (!actor.resting) return;
  actor.resting = null;
  if (actor.state === 'idle' && actor.anim === 'Fall') setAnim(actor, 'Idle', actor.animTick || 0);
}

export function placeBedroll(state, actor, events) {
  if (!actor || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') return false;
  if (!((actor.bedrollItem || 0) > 0)) return false;
  if (!Array.isArray(state.bedrolls)) state.bedrolls = [];
  if (bedrollAt(state, actor, 1.5)) return false; // 重ねて敷かない
  state.bedrollSeq = (state.bedrollSeq || 0) + 1;
  state.bedrolls.push({ id: 'bedroll' + state.bedrollSeq, kind: 'bedroll', x: Math.round(actor.x * 100) / 100, z: Math.round(actor.z * 100) / 100, rot: actor.rot || 0 });
  actor.bedrollItem -= 1;
  if (events) events.push(makeEvent(state, 'rest', actor.name + 'が寝袋を敷いた'));
  return true;
}

export function packBedroll(state, actor, events) {
  if (!actor || actor.state === 'dead' || actor.state === 'down' || actor.state === 'getup') return false;
  const b = bedrollAt(state, actor, PACK_REACH);
  if (!b || b.kind !== 'bedroll') return false;
  for (const a of state.actors) if (a.resting === b.id) stopRest(a);
  state.bedrolls = state.bedrolls.filter((x) => x !== b);
  actor.bedrollItem = (actor.bedrollItem || 0) + 1;
  if (events) events.push(makeEvent(state, 'rest', actor.name + 'が寝袋を畳んだ'));
  return true;
}

export function startRest(state, actor, events) {
  if (!actor || actor.state !== 'idle' && actor.state !== 'move') return false;
  if (actor.carryingId !== null && actor.carryingId !== undefined) return false;
  const list = (state.bedrolls || []).filter((b) => !state.actors.some((a) => a !== actor && a.resting === b.id && a.state !== 'dead'));
  let best = null;
  let bd = REST_REACH;
  for (const b of list) {
    const d = Math.hypot(b.x - actor.x, b.z - actor.z);
    if (d <= bd) {
      bd = d;
      best = b;
    }
  }
  if (!best) return false;
  actor.x = best.x;
  actor.z = best.z;
  actor.rot = best.rot || 0;
  actor.moveTo = null;
  actor.holdAt = { x: best.x, z: best.z };
  actor.targetId = null;
  actor.task = null;
  actor.state = 'idle';
  actor.resting = best.id;
  setAnim(actor, 'Fall', state.tick);
  if (events) events.push(makeEvent(state, 'rest', actor.name + 'が寝袋で休み始めた'));
  return true;
}

// 毎刻: 傷が減る。寝袋から離れた・戦い始めた者は休みをやめる
export function updateRest(state, events) {
  for (const a of state.actors) {
    if (a.state === 'dead') continue;
    if (a.resting) {
      const place = restPlace(state, a);
      if (place === 'ground' || a.state !== 'idle' || a.targetId !== null) {
        stopRest(a);
      } else setAnim(a, 'Fall', state.tick);
    }
    const place = restPlace(state, a);
    for (const key of Object.keys(a.parts)) {
      const p = a.parts[key];
      if (!p || p.missing || !(p.wound > 0)) continue;
      p.wound = Math.max(0, p.wound - woundHealPerSec(p, place, a) / TICKS_PER_SEC);
    }
    if (a.resting && a.faction === 'player') {
      const healed = Object.values(a.parts).every((p) => !p || p.missing || (!(p.wound > 0) && p.hp >= p.max - 1e-6));
      if (healed && !a.restDoneSaid) {
        a.restDoneSaid = true;
        if (events) events.push(makeEvent(state, 'rest', a.name + 'の傷が癒えた'));
      } else if (!healed) a.restDoneSaid = false;
    }
  }
}
