import { medicSkill } from './medkit.js';
import { effMax } from './rest.js';

const PARTS = ['head', 'chest', 'stomach', 'lArm', 'rArm', 'lLeg', 'rLeg'];
const VITAL = new Set(['head', 'chest', 'stomach']);
const hash = (value) => {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b); return (h ^ (h >>> 16)) >>> 0;
};
const loss = a => Math.max(0, Number(a.bleed) || 0) * 0.015 + Math.max(0, Number(a.gush) || 0) * 0.1;
const room = p => p ? Math.max(0, effMax(p) - p.hp) : 0;
const available = (a, key) => a.parts?.[key] && !a.missing?.includes(key) && room(a.parts[key]) > 1e-6;

// At skill 0 the medic picks an alternative; at 100 the best choice is certain.
// Hashing the world seed, tick and actor IDs avoids consuming simulation RNG.
function choose(sorted, medic, seed) {
  if (sorted.length < 2) return sorted[0];
  const chance = Math.max(0, Math.min(100, medicSkill(medic))) / 100;
  if (hash(seed + ':correct') / 4294967296 < chance) return sorted[0];
  return sorted[1 + hash(seed + ':alternative') % (sorted.length - 1)];
}

export function choosePatient(state, medic, patients) {
  const candidates = patients.filter(a => loss(a) > 0 || PARTS.some(k => available(a, k)));
  if (!candidates.length) return undefined;
  const vital = a => PARTS.some(k => VITAL.has(k) && available(a, k));
  candidates.sort ( (a, b) => Number(vital(b)) - Number(vital(a)) || loss(b) - loss(a) || String(a.id).localeCompare(String(b.id)) );
  return choose(candidates, medic, `${state.seed ?? 0}:${state.tick ?? 0}:${medic.id}:patient`);
}

export function chooseTreatmentPart(state, medic, patient, sequence = 0) {
  const candidates = PARTS.filter(k => available(patient, k));
  candidates.sort((a, b) => Number(VITAL.has(b)) - Number(VITAL.has(a)) ||
    room(patient.parts[b]) - room(patient.parts[a]) || PARTS.indexOf(a) - PARTS.indexOf(b));
  return choose(candidates, medic, `${state.seed ?? 0}:${state.tick ?? 0}:${medic.id}:${patient.id}:part:${sequence}`);
}
