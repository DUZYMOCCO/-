// 決定的な乱数。状態の rngState（整数）だけを進める。

export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rand(state) {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randRange(state, min, max) {
  return min + rand(state) * (max - min);
}

export function randInt(state, min, max) {
  if (max < min) return min;
  return min + Math.floor(rand(state) * (max - min + 1));
}

export function chance(state, p) {
  return rand(state) < p;
}

export function pick(state, list) {
  if (!list || list.length === 0) return null;
  const i = Math.floor(rand(state) * list.length);
  return list[i < list.length ? i : list.length - 1];
}
