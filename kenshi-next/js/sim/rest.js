// 傷（下がった最大値）と、寝具で休んで治すこと。research/health_spec.md §7・§8。
// Kenshi: 手当てした分は「1秒に 0.05 × 0.25 × 種族の治り × 寝床の倍率 × 最大/100」ずつ本当の体力に戻る。
//   寝具の回復倍率は PLACE_MULT に集約し、寝袋は従来の3倍にする。
// この世界: 手当てで体力は「最大 − 傷」まで戻る。傷は休むと減る。速さは Kenshi の REST_SPEEDUP 倍（★5。ここ1つで調整）。
import { makeEvent, setAnim } from './data.js';
import { raceOf } from './races.js';
import { healRep } from './medkit.js';
import { clampWorldX, clampWorldZ } from './world_bounds.js';

export const REST_SPEEDUP = 5; // ★Kenshi より何倍早く傷が治るか（ユーザーの決め: 4〜5倍）
export const KENSHI_HEAL_CONVERT = 0.05 * 0.25; // 1秒あたり、最大100の部位で 0.0125
export const PLACE_MULT = { ground: 1, bedroll: 12, bed: 8 };
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
  // A casualty remains on the bed even though being knocked down clears `resting`.
  if (actor.state === 'down') {
    const bed = bedrollAt(state, actor, BEDROLL_REACH);
    if (bed) return bed.kind === 'bed' ? 'bed' : 'bedroll';
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

function findActor(state, id) {
  return state.actors.find((actor) => actor.id === id) || null;
}

function bedOccupied(state, bed, exceptActor = null) {
  return (state.actors || []).some((actor) => actor !== exceptActor && actor.state !== 'dead' &&
    (actor.resting === bed.id || actor.bedTargetId === bed.id));
}

function availableBed(state, actor, bedId = null) {
  const beds = Array.isArray(state.bedrolls) ? state.bedrolls : [];
  let best = null;
  let bestDistance = Infinity;
  for (const bed of beds) {
    if (bedId != null && bed.id !== bedId) continue;
    if (bedOccupied(state, bed, actor)) continue;
    const distance = Math.hypot(bed.x - actor.x, bed.z - actor.z);
    if (distance < bestDistance) {
      best = bed;
      bestDistance = distance;
    }
  }
  return best;
}

// 担いだ気絶者を空き寝具へ運ぶ。bedId を省略した時は一番近い空きを予約する。
export function orderBedRescue(state, carrier, events, bedId = null) {
  if (!state || !carrier || carrier.carryingId == null) {
    if (events) events.push(makeEvent(state, 'rest', '寝具へ運ぶ相手を担いでいない'));
    return false;
  }
  const patient = findActor(state, carrier.carryingId);
  if (!patient || patient.carriedBy !== carrier.id || patient.state !== 'down') {
    if (events) events.push(makeEvent(state, 'rest', '寝具へ運べる気絶者を担いでいない'));
    return false;
  }
  const bed = availableBed(state, carrier, bedId) || (bedId == null ? null : availableBed(state, carrier));
  if (!bed) {
    carrier.bedTargetId = null;
    carrier.moveTo = null;
    if (carrier.state === 'move') carrier.state = 'idle';
    if (events) events.push(makeEvent(state, 'rest', '空いている寝具がない'));
    return false;
  }
  carrier.bedTargetId = bed.id;
  carrier.moveTo = { x: bed.x, z: bed.z };
  carrier.holdAt = { x: bed.x, z: bed.z };
  carrier.targetId = null;
  carrier.waitTargetId = null;
  carrier.task = null;
  carrier.carryTargetId = null;
  carrier.lastAttackerId = null;
  if (carrier.state !== 'down' && carrier.state !== 'getup') carrier.state = 'move';
  return true;
}

// 移動が寝具に着いた時、担ぎを解除して患者を寝かせる。
export function updateBedRescue(state, events) {
  for (const carrier of state.actors || []) {
    if (!carrier.bedTargetId) continue;
    const patient = findActor(state, carrier.carryingId);
    if (carrier.state === 'dead' || !patient || patient.carriedBy !== carrier.id || patient.state !== 'down') {
      carrier.bedTargetId = null;
      continue;
    }

    let bed = (state.bedrolls || []).find((entry) => entry.id === carrier.bedTargetId) || null;
    if (!bed || bedOccupied(state, bed, carrier)) {
      bed = availableBed(state, carrier);
      if (!bed) {
        carrier.bedTargetId = null;
        carrier.moveTo = null;
        if (carrier.state === 'move') carrier.state = 'idle';
        if (events) events.push(makeEvent(state, 'rest', '空いている寝具がなく、運ぶ命令を中止した'));
        continue;
      }
      carrier.bedTargetId = bed.id;
      carrier.moveTo = { x: bed.x, z: bed.z };
      carrier.holdAt = { x: bed.x, z: bed.z };
    }

    if (Math.hypot(bed.x - carrier.x, bed.z - carrier.z) > BEDROLL_REACH) continue;

    carrier.carryingId = null;
    carrier.carryTargetId = null;
    carrier.carryOrdered = false;
    carrier.carryHome = false;
    carrier.bedTargetId = null;
    carrier.moveTo = null;
    carrier.targetId = null;
    carrier.state = 'idle';
    const side = bed.rot || 0;
    carrier.x = clampWorldX(bed.x + Math.cos(side) * 1.1);
    carrier.z = clampWorldZ(bed.z - Math.sin(side) * 1.1);
    carrier.holdAt = { x: carrier.x, z: carrier.z };
    patient.carriedBy = null;
    patient.x = bed.x;
    patient.z = bed.z;
    patient.rot = bed.rot || 0;
    patient.moveTo = null;
    patient.targetId = null;
    patient.resting = bed.id;
    patient.restDoneSaid = false;
    setAnim(patient, 'Fall', state.tick);
    if (events) events.push(makeEvent(state, 'rest', carrier.name + 'は' + patient.name + 'を寝具に寝かせた'));
    healRep(state, carrier, patient, 1, events);
  }
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
  const list = (state.bedrolls || []).filter((b) => !bedOccupied(state, b, actor));
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
  // The bedroll is 1.6 m along its local X axis; a character's long axis is +Z.
  actor.rot += Math.PI / 2;
  actor.moveTo = null;
  actor.holdAt = { x: best.x, z: best.z };
  actor.targetId = null;
  actor.task = null;
  actor.state = 'idle';
  actor.resting = best.id;
  actor.restStartedTick = state.tick;
  actor.restPose = 'sleep';
  setAnim(actor, 'Sleep', state.tick);
  if (events) events.push(makeEvent(state, 'rest', actor.name + 'が寝袋で休み始めた'));
  return true;
}

// 毎刻: 傷が減る。寝袋から離れた・戦い始めた者は休みをやめる
export function updateRest(state, events) {
  const claimedBeds = new Set();
  for (const a of state.actors) {
    if (a.state === 'dead') continue;
    if (a.resting) {
      const place = restPlace(state, a);
      const bed = (state.bedrolls || []).find((entry) => entry.id === a.resting);
      if (place === 'ground' || !bed || claimedBeds.has(bed.id) || (a.state !== 'idle' && a.state !== 'down') || a.targetId !== null) {
        stopRest(a);
      } else {
        claimedBeds.add(bed.id);
        setAnim(a, a.state === 'down' ? 'Fall' : 'Sleep', state.tick);
      }
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
