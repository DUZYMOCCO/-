/**
 * ゆかの かざり（ぶつからない・ゲームの うごきに かんけい なし。DOM なし・テストできる）
 * けんきゅうじょ：360px の マスごとに、たね（seed）から きまる ばしょに ガラスの ボトルを おく。
 * - だいたい 4マスに 1つ ボトルの れつ（1〜3ぼん）。6ぽんに 1ぽん くらい うちゅうじんが はいって いる。わられた ボトルも ある
 * - みかたの はた：スタートの そばに 1ぽん、ほかは だいたい 12マスに 1ぽん（ボトルの ない マス）
 * - おなじ たね・おなじ マスなら いつも おなじ（もどって きても かわらない）。タイルと ちがって くりかえし に みえない
 */
export const DECOR_CELL = 360;
export const DECOR = { rowChance: 0.26, alienChance: 1 / 6, brokenChance: 0.2, gap: 62, flagChance: 0.08 };

// マス (cx, cy) と たね から 0..1 の らんすうを つくる（ゲームの Math.random は つかわない）
export function cellRand(cx, cy, seed, salt = 0) {
  let h = Math.imul(cx | 0, 0x27d4eb2d) ^ Math.imul(cy | 0, 0x165667b1) ^ Math.imul((seed | 0) + salt, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// 1マスぶんの かざり（[{ x, y, kind: 'capsule' | 'alien' | 'broken' | 'flag', id? }]）。ボトルの id は こわれた じょうたいを ランの あいだ おぼえる ため
export function decorCell(cx, cy, seed, kind = 'lab') {
  if (kind === 'city') return cityCell(cx, cy, seed);
  const out = [];
  // スタート ちてん（0,0 の マス）は ボトルを おかず、みかたの はたを 1ぽん（じぶんの すこし みぎした）
  if (cx === 0 && cy === 0) { out.push({ x: 96, y: 60, kind: 'flag' }); return out; }
  const C = DECOR_CELL, m = 70;
  if (cellRand(cx, cy, seed, 1) >= DECOR.rowChance) {
    if (cellRand(cx, cy, seed, 5) < DECOR.flagChance / (1 - DECOR.rowChance)) {
      out.push({ x: Math.round(cx * C + m + cellRand(cx, cy, seed, 6) * (C - 2 * m)), y: Math.round(cy * C + m + 40 + cellRand(cx, cy, seed, 7) * (C - 2 * m - 40)), kind: 'flag' });
    }
    return out;
  }
  const n = 1 + Math.floor(cellRand(cx, cy, seed, 2) * 3);
  const x0 = cx * C + m + cellRand(cx, cy, seed, 3) * (C - 2 * m - (n - 1) * DECOR.gap);
  const y0 = cy * C + m + cellRand(cx, cy, seed, 4) * (C - 2 * m);
  for (let i = 0; i < n; i++) {
    const r = cellRand(cx, cy, seed, 10 + i);
    const kind = r < DECOR.alienChance ? 'alien' : r < DECOR.alienChance + DECOR.brokenChance ? 'broken' : 'capsule';
    out.push({ x: Math.round(x0 + i * DECOR.gap), y: Math.round(y0), kind, id: `${cx},${cy},${i}` });
  }
  return out;
}

/**
 * こわれた まち：だいたい 3マスに 1つ、こわれた くるま（car）か くずれた ビルの かけら（ruin）。スタートの マスは なし
 */
export const CITY_DECOR = { chance: 0.34, ruin: 0.45, bldg: 0.5, bldgFree: 950, bldgKinds: 7 };
/**
 * v1.15.1：こわれた ビルを たくさん（スカイライン）。だいたい 2マスに 1つ。たかさ・こわれかた・まどが ちがう 7しゅるい（bldg1〜7。はんぶん いじょうは ぎざぎざに くずれて あなの あいた ビル）。
 * スタートから bldgFree より ちかい ところ（スタート・はいれる ビル・やじるしの みち）には おかない。はいれるのは ほんものの 1つだけ
 */
export function cityCell(cx, cy, seed) {
  const C = DECOR_CELL;
  if (Math.hypot((cx + 0.5) * C, (cy + 0.5) * C) > CITY_DECOR.bldgFree && cellRand(cx, cy, seed, 31) < CITY_DECOR.bldg) {
    const v = 1 + Math.floor(cellRand(cx, cy, seed, 32) * CITY_DECOR.bldgKinds);
    return [{ x: Math.round(cx * C + 120 + cellRand(cx, cy, seed, 33) * (C - 240)), y: Math.round(cy * C + 200 + cellRand(cx, cy, seed, 34) * (C - 220)), kind: `bldg${v}` }];
  }
  if ((cx === 0 && cy === 0) || cellRand(cx, cy, seed, 21) >= CITY_DECOR.chance) return [];
  const m = 80;
  return [{ x: Math.round(cx * C + m + cellRand(cx, cy, seed, 22) * (C - 2 * m)), y: Math.round(cy * C + m + cellRand(cx, cy, seed, 23) * (C - 2 * m)),
    kind: cellRand(cx, cy, seed, 24) < CITY_DECOR.ruin ? 'ruin' : 'car' }];
}

/** みえる はんいの かざりを あつめる（マスごとに キャッシュ。おなじ オブジェクトを かえすので DOM プールが つけかえを しない） */
export class DecorField {
  constructor(seed = 1, kind = 'lab') { this.seed = seed; this.kind = kind; this.cache = new Map(); this.list = []; }
  setSeed(seed) { if (seed !== this.seed) { this.seed = seed; this.cache.clear(); } }
  visible(x0, y0, x1, y1) {
    const C = DECOR_CELL, out = this.list;
    out.length = 0;
    if (this.cache.size > 600) this.cache.clear();
    for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) for (let cy = Math.floor(y0 / C); cy <= Math.floor(y1 / C); cy++) {
      const k = ((cx & 0xffff) << 16) | (cy & 0xffff);
      let cell = this.cache.get(k);
      if (!cell) { cell = decorCell(cx, cy, this.seed, this.kind); this.cache.set(k, cell); }
      for (const d of cell) out.push(d);
    }
    return out;
  }
}
