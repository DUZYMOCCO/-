// v0.4.12 メモリ: 焼き込みの一時の絵の入れ物と、後片づけの小さな決まり。Pixi を使わない（Node のテストで確かめる）。

/**
 * 「1 かたまりを焼く間だけ要る絵」の入れ物。get は同じ key なら作った物を使い回し、drop は全部を dispose に渡して空にする。
 * 焼き終えたかたまりごとに drop すれば、同時に生きる絵の数は「全部」ではなく「1 かたまりぶん」になる。
 * stats().peak は同時に生きた最大の数、made は作った数、dropped は捨てた数。
 */
export function createPieceCache(dispose) {
  const map = new Map();
  let made = 0, dropped = 0, peak = 0;
  return {
    get(key, build) {
      let v = map.get(key);
      if (v === undefined) { v = build(); map.set(key, v); made++; if (map.size > peak) peak = map.size; }
      return v;
    },
    drop() { for (const v of map.values()) { dispose(v); dropped++; } map.clear(); },
    get size() { return map.size; },
    stats() { return { made, dropped, peak, live: map.size }; },
  };
}

/**
 * Pixi の共通の絵（Texture.WHITE・Texture.EMPTY）は、描画を作るたびに「変わったよ」の待ちを 1 つ足され、描画を捨てても外れない
 * （もう一度を 1 回押すごとに、捨てた描画の bind group・Float32Array などが数 KB ずつ残る）。描画を捨てたあとに、その待ちを外す。
 * sources は絵の source の並び（なければ飛ばす）。外した数を返す。描画が 1 つも生きていない時にだけ呼ぶこと。
 */
export function releaseSharedListeners(sources, event = 'change') {
  let n = 0;
  for (const s of sources) {
    if (!s || typeof s.removeAllListeners !== 'function') continue;
    try { n += typeof s.listenerCount === 'function' ? s.listenerCount(event) : 0; s.removeAllListeners(event); } catch { /* 捨てた物 */ }
  }
  return n;
}
