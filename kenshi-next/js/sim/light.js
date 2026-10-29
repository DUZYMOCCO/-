// 光の強さ。周りの明るさ（時刻）と、焚き火・町の灯り・持つ灯りから、ある場所の明るさを出す。
// 0.15 が真夜中の暗さ、1 が昼。隠密・太陽の印・射撃の命中がこの値を使う。

import { TOWN1, TOWN2, CAMP } from './world.js';

// ★仮の値。docs: research/darkness_light.md
export const LANTERN = { r: 7, power: 0.9 };
export const CAMPFIRE = { r: 9, power: 0.95 };
export const LAMP = { r: 7, power: 0.85 };
export const NIGHT_LIGHT = 0.15;
// Kenshi の「暗い所での作業」クロスボウ最大ペナルティ（有志の測定値）。
export const DARK_RANGED_PENALTY = 0.375;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// 時刻だけで決まる周りの明るさ。
export function ambientLight(state) {
  const sec = state && num(state.timeSec) ? state.timeSec : 0;
  const hour = ((sec / 3600) % 24 + 24) % 24;
  const sy = Math.sin(((hour - 6) / 12) * Math.PI);
  const raw = (sy + 0.12) / 0.42;
  return NIGHT_LIGHT + (1 - NIGHT_LIGHT) * clamp(raw, 0, 1);
}

// 暗さ 0..1（0=明るい、1=真っ暗）。
export function darknessOf(light) {
  return clamp((1 - light) / (1 - NIGHT_LIGHT), 0, 1);
}

function insideBox(list, x, z, margin) {
  for (const b of list) {
    if (Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin) return true;
  }
  return false;
}

const fixedCache = new WeakMap();

// 置いてある光源。町の通りに灯り、盗賊の根城と廃墟の一部に焚き火。
// state.buildings / state.props から決まるので保存はしない（同じ世界なら同じ場所）。
export function fixedLights(state) {
  if (!state) return [];
  const key = Array.isArray(state.buildings) ? state.buildings : state;
  const hit = fixedCache.get(key);
  if (hit) return hit;
  const blocks = (state.buildings || []).concat(
    (state.props || []).filter((p) => p && p.kind === 'ruin' && num(p.w) && num(p.d))
  );
  const out = [];
  const place = (cx, cz, rads, count, kind, spec, start) => {
    let n = 0;
    for (const rad of rads) {
      for (let k = 0; k < 8 && n < count; k += 1) {
        const ang = (start || 0) + (k / 8) * Math.PI * 2;
        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        if (insideBox(blocks, x, z, 1.2)) continue;
        let near = false;
        for (const o of out) {
          if (Math.hypot(o.x - x, o.z - z) < spec.r * 1.2) near = true;
        }
        if (near) continue;
        out.push({ id: out.length, kind, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, r: spec.r, power: spec.power });
        n += 1;
      }
      if (n >= count) break;
    }
  };
  place(TOWN1.x, TOWN1.z, [0, TOWN1.r * 0.4, TOWN1.r * 0.7], 4, 'lamp', LAMP, 0.3);
  place(TOWN2.x, TOWN2.z, [0, TOWN2.r * 0.45, TOWN2.r * 0.7], 3, 'lamp', LAMP, 0.6);
  place(CAMP.x, CAMP.z, [9, 6, 11], 1, 'campfire', CAMPFIRE, 2.2);
  // 廃墟は3つに1つ、すぐ脇に焚き火（旅人や盗賊の野営跡）。
  const ruins = (state.props || []).filter((p) => p && p.kind === 'ruin');
  for (let i = 0; i < ruins.length; i += 3) {
    const r = ruins[i];
    const off = Math.hypot(r.w / 2, r.d / 2) + 2;
    place(r.x, r.z, [off, off + 2], 1, 'campfire', CAMPFIRE, 0.8);
  }
  fixedCache.set(key, out);
  return out;
}

function sourceAt(px, pz, sx, sz, r, power) {
  const dx = px - sx;
  const dz = pz - sz;
  const d2 = dx * dx + dz * dz;
  const r2 = r * r;
  if (d2 >= r2) return 0;
  return power * (1 - d2 / r2);
}

export function carriesLight(actor) {
  return !!actor && actor.lantern === true && actor.state !== 'dead';
}

// ある地点の明るさ。周りと各光源のうち一番明るい値。
export function lightAtPoint(state, x, z) {
  let best = ambientLight(state);
  if (best >= LANTERN.power && best >= CAMPFIRE.power) return best;
  for (const s of fixedLights(state)) {
    const v = sourceAt(x, z, s.x, s.z, s.r, s.power);
    if (v > best) best = v;
  }
  if (state && Array.isArray(state.actors)) {
    for (const a of state.actors) {
      if (!carriesLight(a)) continue;
      const v = sourceAt(x, z, a.x, a.z, LANTERN.r, LANTERN.power);
      if (v > best) best = v;
    }
  }
  return best;
}

export function lightAtActor(state, actor) {
  if (!actor) return ambientLight(state);
  return lightAtPoint(state, actor.x, actor.z);
}

// 射撃の命中率。暗さは射手と的の明るい方で決める（どちらかが照らされていれば減る）。
export function rangedHitChance(state, shooter, target) {
  if (!shooter || !target) return 0;
  const skill = shooter.skills && num(shooter.skills.crossbow) ? shooter.skills.crossbow : 10;
  const light = Math.max(lightAtActor(state, shooter), lightAtActor(state, target));
  const dark = darknessOf(light);
  const eff = skill * (1 - DARK_RANGED_PENALTY * dark);
  const dist = Math.hypot(target.x - shooter.x, target.z - shooter.z);
  const falloff = Math.max(0, dist - 8) * 0.008;
  return clamp(0.3 + 0.0055 * eff - falloff, 0.05, 0.95);
}
