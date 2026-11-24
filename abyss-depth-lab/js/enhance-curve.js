/**
 * ABYSS DIVE — 段階強化の共有カーブ（武器個体・追加個体・全自動近接）
 *
 * v1.17.0: 強化の上限を 3 → 200 段へ。費用は指数の 200 乗で破綻させず、
 *   伸びは「最初の数段は実感 → 後半は緩い積み上げ（逓減・上限へ漸近）」。
 *
 * 既存の 3 段の値（威力 +12%/段、他 +6%/段）は変えない（旧セーブ・旧表示と互換）。
 *   4 段目以降は等比で逓減する（power は 0.09×0.98^k、他は 0.05×0.98^k）。
 *   その合計は有限へ収束する：power ≈ 1.36 + 4.5 = 5.86 倍、他 ≈ 1.18 + 2.5 = 3.68 倍。
 *   0.98^k は「指数の 200 乗」ではなく、200 段でも緩やかに 5〜6 倍前後で頭打ちになる。
 *
 * 費用：既存 3 段（150 / 300 / 600）はそのまま。4 段目以降は 600 + 90×(level-2) の
 *   線形（200 段でも破綻せず、序盤は手が届き、節目が読める）。
 */

export const ENHANCE_MAX = 200;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* 既存 3 段のまま。4 段目以降は等比で逓減（収束する）。 */
const POWER_FIRST = 0.12, OTHER_FIRST = 0.06;
const FIRST_STEPS = 3;                 // 既存段数（level 1..3）
const POWER_BASE = 0.09, POWER_DECAY = 0.98;
const OTHER_BASE = 0.05, OTHER_DECAY = 0.98;

/** 強化段の倍率（power は威力、他は有利側。low 系は実効で小さくなる）。 */
export function enhanceMul(statId, level){
  const l = Math.max(0, Math.min(ENHANCE_MAX, Math.floor(Number(level) || 0)));
  const first = (statId === 'power') ? POWER_FIRST : OTHER_FIRST;
  const base = (statId === 'power') ? POWER_BASE : OTHER_BASE;
  const decay = (statId === 'power') ? POWER_DECAY : OTHER_DECAY;
  let m = 1;
  const n0 = Math.min(l, FIRST_STEPS);
  m += first * n0;
  const rem = l - FIRST_STEPS;
  if (rem > 0) m += base * (1 - Math.pow(decay, rem)) / (1 - decay);   // 収束する等比和
  return m;
}

/* 費用：既存 3 段は不変。4 段目以降は線形（指数的な爆発をしない）。 */
const COST_HEAD = Object.freeze([150, 300, 600]);
export const ENHANCE_COST_HEAD = COST_HEAD;
const COST_SLOPE = 90;

export function enhanceCost(level){
  const l = Math.floor(Number(level) || 0);
  if (l < 0 || l >= ENHANCE_MAX) return null;
  if (l < COST_HEAD.length) return COST_HEAD[l];
  return Math.round(COST_HEAD[COST_HEAD.length - 1] + COST_SLOPE * (l - (COST_HEAD.length - 1)));
}

/** 全段の費用（表示用・テスト用。200 要素）。 */
export const ENHANCE_COST = Object.freeze(Array.from({ length: ENHANCE_MAX }, (_, l) => enhanceCost(l)));
