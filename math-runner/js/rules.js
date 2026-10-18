/**
 * さんすうシューター ルール＆計算ロジック
 */

export const GATE_TYPES = {
  ADD: 'add',
  SUB: 'sub',
  MUL: 'mul',
  DIV: 'div',
};

/** たまの かずの じょうげん（v1.4.1 で 999 → 99,999,999 に ひろげた。ひょうじは fmtNum で みじかく） */
export const LIMITS = { count: 99999999 };

/** おおきな かずを みじかく：1234→1.3k、188000→188k、2500000→2.5M、3e9→3.0B（しょうすうは きりあげ） */
export function fmtNum(v) {
  const n = Math.max(0, Math.ceil(Number(v) || 0));
  if (n < 1000) return String(n);
  const units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
  for (const [d, u] of units) {
    if (n >= d) {
      const x = n / d;
      if (x < 10) return (Math.ceil(x * 10) / 10).toFixed(1) + u;
      const r = Math.ceil(x);
      return r >= 1000 && d < 1e9 ? '1.0' + units[units.findIndex(a => a[1] === u) - 1][1] : r + u;
    }
  }
  return String(n);
}

/** コインの ひょうじ：100000 みまんは そのまま、それいじょうは 「125k」のように みじかく */
export function fmtCoin(v) {
  const n = Math.max(0, Math.floor(Number(v) || 0));
  return n < 100000 ? String(n) : fmtNum(n);
}

/**
 * ゲートの計算を適用する
 */
export function applyGate(currentCount, gate) {
  let next = currentCount;
  switch (gate.type) {
    case GATE_TYPES.ADD:
      next = currentCount + gate.val;
      break;
    case GATE_TYPES.SUB:
      next = Math.max(1, currentCount - gate.val);
      break;
    case GATE_TYPES.MUL:
      next = currentCount * gate.val;
      break;
    case GATE_TYPES.DIV:
      next = Math.max(1, Math.floor(currentCount / gate.val));
      break;
  }
  return Math.min(LIMITS.count, Math.max(1, next));
}

/**
 * ゲートの表示テキストを返す
 */
export function getGateText(gate) {
  switch (gate.type) {
    case GATE_TYPES.ADD:
      return `+${gate.val}`;
    case GATE_TYPES.SUB:
      return `-${gate.val}`;
    case GATE_TYPES.MUL:
      return `×${gate.val}`;
    case GATE_TYPES.DIV:
      return `÷${gate.val}`;
  }
  return '';
}

/**
 * ゲートが良い（青）か悪い（赤）かを判定
 */
export function isGoodGate(gate) {
  return gate.type === GATE_TYPES.ADD || gate.type === GATE_TYPES.MUL;
}

/**
 * v1.1.0 すすむ はやさ（7さいでも けいさん できるように ゆっくり）。
 * speed = まえへ すすむ px/びょう、gateGap = ゲートの かんかく(px)。
 * むかしは 260px/びょう・400px（ゲートまで 1.5びょう）。ゆっくり は 120px・520px（4.3びょう）。
 * ゆっくり だと ブロックを うつ じかんが のびるので、ブロックと かべの HP も ぶん ふやす（hpMul）。
 */
export const SPEEDS = {
  slow:   { label: 'ゆっくり', icon: '🐢', speed: 120, gateGap: 520, hpMul: 2 },
  normal: { label: 'ふつう',   icon: '🚶', speed: 170, gateGap: 460, hpMul: 1.5 },
  fast:   { label: 'はやい',   icon: '🐇', speed: 260, gateGap: 400, hpMul: 1 },
};
export const DEFAULT_SPEED = 'slow';
export const START_DELAY = 1.2; // はじまって すぐは すすまない（ゲートを よむ じかん）

/** ステージごとの けしき（3しゅるい ぐるぐる） */
export const THEMES = ['meadow', 'desert', 'space'];
export function stageTheme(stageNum) {
  const n = Math.max(1, Math.floor(Number(stageNum) || 1));
  return THEMES[(n - 1) % THEMES.length];
}

/**
 * v1.2.0 ステージごとの ゲートの むずかしさ（7さいでも あそべる ように ゆっくり ふやす）
 *  ステージ1〜2：+1〜+5 と −1〜−3 だけ。3〜4：+と− の かずが すこし おおきく。
 *  5〜：×2 が でてくる。7〜：×3 も。9〜：÷2 が でてくる。12〜：×4・÷3 まで。
 */
export function gateSpec(stageNum) {
  const n = Math.max(1, Math.floor(Number(stageNum) || 1));
  if (n <= 2) return { addMin: 1, addMax: 5, subMax: 3, mulMax: 0, mulChance: 0, divMax: 0, divChance: 0 };
  const addMax = Math.min(20, 4 + Math.floor(n * 1.2));
  return {
    addMin: Math.max(2, addMax - 5), addMax,
    subMax: Math.min(12, 3 + Math.floor((n - 3) / 2)),
    mulMax: n < 5 ? 0 : n < 7 ? 2 : n < 12 ? 3 : 4, mulChance: n < 5 ? 0 : Math.min(0.5, 0.25 + (n - 5) * 0.03),
    divMax: n < 9 ? 0 : n < 12 ? 2 : 3, divChance: n < 9 ? 0 : Math.min(0.4, 0.2 + (n - 9) * 0.03),
  };
}

/** さいしょの ブロックの y と、1〜3かいめの HP ばいりつ（はじめは ひくい） */
export const FIRST_BLOCK_Y = 230;
export const FIRST_RAMP = [0.45, 0.75];
/**
 * v1.3.0 さいごの ボーナスの かべは ステージが すすむほど かたく なる（つよく なった ぶんに あわせる）。
 * 1まいめの かべ（×1.5）の HP = N(ステージ) × ちから(ステージ) × 5びょう（WALL_GRACE）。
 *   N      = 「ゲートを ちゃんと えらんだ ひとの たまの かず」の めやす（WALL.n の ひょうを ステージで うめる）。
 *            えらびまちがいが おおい ひとは かずが たりなくて 1まいめも とどかない。ステージ1〜2は ちいさく やさしい。
 *   ちから = 「ショップを ふつうに かった ひとの 1ぽんの ダメージ/びょう」の めやす（WALL.perBullet の ひょう。s は 50まで）
 * 2まいめ いこうは 1まい ごとに ×WALL.grow かたい（×1.5 → ×20）。
 */
export const WALL = {
  grow: 3, // v1.4.1: たまの かずが おおきく ひらいた ので 1まいごとに ×3（1.45 から）
  n: [[1, 2], [2, 2], [3, 5], [4, 10], [5, 34], [6, 32], [8, 40], [10, 58], [12, 72], [16, 100], [20, 115], [50, 115]],
  perBullet: [[1, 6], [2, 8], [3, 16], [4, 24], [5, 27], [6, 32], [8, 44], [10, 57], [12, 72], [16, 98], [20, 118], [25, 140], [30, 160], [40, 169], [50, 170]],
  speedMul: { slow: 1, normal: 0.7, fast: 0.45 },
};
function interp(table, s) {
  if (s <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (s <= table[i][0]) { const [x0, y0] = table[i - 1], [x1, y1] = table[i]; return y0 + (y1 - y0) * (s - x0) / (x1 - x0); }
  }
  return table[table.length - 1][1];
}
export function wallBaseHp(stageNum, speedKey = DEFAULT_SPEED) {
  const s = Math.max(1, Math.min(50, Math.floor(Number(stageNum) || 1)));
  return Math.round(interp(WALL.n, s) * interp(WALL.perBullet, s) * WALL_GRACE * (WALL.speedMul[speedKey] ?? 1));
}

/**
 * v1.2.0 まちがえても すぐ おわらない：まちがった ゲートは かずが へるだけ（のこりは 1こ いじょう。ブロックに ぶつかっても ×0.7）。
 * しっぱいは さいごの かべを こわせなかった とき だけ。かべの まえで WALL_GRACE びょう うちつづけて、1まいも こわせなければ
 * 「もういちど」（ステージは すすまない。コインは もらえる）。かべの HP は v1.3.0 から ステージで かたく なる（wallBaseHp）。
 */
export const WALL_GRACE = 5;
/** プレイヤーが ブロックに ぶつかった とき かずが のこる わりあい（v1.4.1: 0.7 → 0.8 に やさしく。ブロックが かたく なった ぶん） */
export const RAM_MUL = 0.8;

/**
 * ゲートを うつと かずが かわる（v1.2.0）。たまが あたった かず（hits）で きまる。
 *  ＋ゲート：4かいで +1（+8まで）／−ゲート：4かいで 1へる。0に なったら ＋ゲートに かわる！
 *  ×ゲート：16かいで +1（×5まで）／÷ゲート：8かいで 1へる（÷1まで）（かい = 1かいの はっしゃ）
 */
export const GATE_SHOOT = { addPer: 4, addCap: 8, subPer: 4, mulPer: 16, mulCap: 5, divPer: 8 };
export function gateAfterHits(base, hits) {
  const G = GATE_SHOOT, n = Math.max(0, Math.floor(hits) || 0);
  switch (base.type) {
    case GATE_TYPES.ADD: return { type: GATE_TYPES.ADD, val: base.val + Math.min(G.addCap, Math.floor(n / G.addPer)) };
    case GATE_TYPES.SUB: {
      const v = base.val - Math.floor(n / G.subPer);
      return v > 0 ? { type: GATE_TYPES.SUB, val: v } : { type: GATE_TYPES.ADD, val: 1 + Math.min(G.addCap - 1, -v) };
    }
    case GATE_TYPES.MUL: return { type: GATE_TYPES.MUL, val: Math.min(G.mulCap, base.val + Math.floor(n / G.mulPer)) };
    case GATE_TYPES.DIV: return { type: GATE_TYPES.DIV, val: Math.max(1, base.val - Math.floor(n / G.divPer)) };
  }
  return { ...base };
}

/** ゲートの かずは 1かいの はっしゃ（たまの かずに かんけいなく）を 1と かぞえる */
/** たまの ならびかた：どんなに ふえても ほそい ながれ（がめんに でる たまは 5ほんまで、いりょくは ぜんぶ たす） */
export const STREAM = { maxVisible: 5, gap: 0.035 };

/**
 * v1.4.1 ブロックも ステージと「ならびの ばんごう」で かたく なる。
 * ブロックの HP ＝ T(ステージ) びょう × ちから(ステージ) × そのときの たまの かずの めやす C。
 * C ＝ 「てきとうに えらんだ ひと」の ならびごとの たまの かず（BLOCK.rows の ひょうを ステージで ならす）。
 * だから てきとうな ひとが 3びょうくらい かけて けずる ＝ いい ひとは 1びょう まえあと、わるい ひとは けずりきれずに ぶつかる。
 * コインは HPに よらず むかしの しき（3 + むかしの HP÷(5×hpMul)）のまま ＝ ショップの もうけは かわらない。
 */
export const BLOCK = {
  k: 0.18, // ぜんたいの かたさ（ひょうの 0.18ばい。てきとうに えらぶ ひとが 2びょうくらい かけて けずる）
  T: [[1, 1.2], [2, 1.5], [4, 2.2], [6, 3]],
  start: [[1, 2], [3, 3], [5, 4], [8, 8], [15, 14], [25, 21]],
  rows: [
    [1, [8, 14, 21, 26, 31]],
    [3, [8, 15, 22, 28, 33, 45]],
    [5, [17, 31, 40, 61, 76, 91, 154]],
    [8, [29, 48, 72, 92, 172, 256, 376, 564, 572]],
    [15, [45, 80, 115, 285, 400, 474, 858, 2056, 2249]],
    [25, [51, 84, 230, 319, 383, 1286, 1626, 2238, 4699]],
  ],
};
function logInterp(a, b, s, va, vb) { const t = (s - a) / (b - a); return Math.exp(Math.log(va) + (Math.log(vb) - Math.log(va)) * t); }
/** i ばんめの ならびの ブロックを うつ ときの たまの かずの めやす（ステージ s） */
export function blockRefCount(stageNum, rowIdx) {
  const s = Math.max(1, Math.floor(Number(stageNum) || 1));
  const at = (st, i) => { // st の ひょうの、ならび i の ぜんの かず
    if (i <= 0) { const t = BLOCK.start; let v = t[t.length - 1][1]; for (const [x, y] of t) if (x >= st) { v = y; break; } return v; }
    const arr = BLOCK.rows.find(r => r[0] === st)[1];
    return arr[Math.min(i - 1, arr.length - 1)] * (i - 1 >= arr.length ? Math.pow(1.35, i - arr.length) : 1);
  };
  const anchors = BLOCK.rows.map(r => r[0]);
  if (s <= anchors[0]) return at(anchors[0], rowIdx);
  if (s >= anchors[anchors.length - 1]) return at(anchors[anchors.length - 1], rowIdx);
  let k = 1; while (anchors[k] < s) k++;
  const a = anchors[k - 1], b = anchors[k];
  const startAt = (st) => { const t = BLOCK.start; for (const [x, y] of t) if (x === st) return y; return 2; };
  const va = rowIdx <= 0 ? startAt(a) : at(a, rowIdx), vb = rowIdx <= 0 ? startAt(b) : at(b, rowIdx);
  return logInterp(a, b, s, va, vb);
}
export function blockBaseHp(stageNum, rowIdx) {
  const s = Math.max(1, Math.min(50, Math.floor(Number(stageNum) || 1)));
  return BLOCK.k * interp(BLOCK.T, s) * interp(WALL.perBullet, s) * blockRefCount(s, rowIdx);
}

export const UPGRADES = {
  startCount: {
    name: 'スタートだんすう',
    icon: '🔫',
    baseCost: 25,
    costMult: 1.41, // v1.3.0 レベル 20→25。v1.4.1 1.35→1.41（もうけが ふえた ぶん）
    calcValue: (lvl) => lvl, // Lv1: 1発, Lv2: 2発...
    maxLevel: 25,
  },
  fireRate: {
    name: 'れんしゃスピード',
    icon: '⚡',
    baseCost: 35,
    costMult: 1.58, // v1.3.0 1.4→1.5、v1.4.1 1.58
    calcValue: (lvl) => Math.max(0.06, 0.16 - (lvl - 1) * 0.007), // 秒ごとの発射間隔
    maxLevel: 15,
  },
  power: {
    name: 'たまの いりょく',
    icon: '💥',
    baseCost: 50,
    costMult: 1.36, // v1.3.0 レベル 15→20。v1.4.1 1.31→1.36
    calcValue: (lvl) => 1 + (lvl - 1) * 0.5,
    maxLevel: 20,
  },
};

export function getUpgradeCost(key, level) {
  const def = UPGRADES[key];
  if (!def || level >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costMult, level - 1));
}

export function defaultSaveData() {
  return {
    coins: 0,
    stage: 1,
    speed: DEFAULT_SPEED,
    upgrades: {
      startCount: 1,
      fireRate: 1,
      power: 1,
    },
  };
}

/**
 * v1.3.1 いちどだけ セーブを さいしょに もどす（おとうさんの かくにんずみ）。
 * ふだんの セーブとは べつの キー（RESET_KEY）に 「どこまで リセットしたか」の ばんごう（epoch）を のこす。
 * marker が RESET_EPOCH より ちいさい（ない・ふるい）ときだけ: コイン・ステージ・アップグレードを しょきかし、
 * 「はやさ」の せっていだけ のこす（ない・へんな ときは ゆっくり）。そのあと marker を RESET_EPOCH に する。
 * つぎから（marker >= RESET_EPOCH）は ふつうに セーブを よむ。もういちど リセットしたい ときは RESET_EPOCH を 1 ふやす。
 */
export const RESET_EPOCH = 1;
export const RESET_KEY = 'math_runner_reset_epoch';
export function resolveSave(rawSave, marker) {
  const m = typeof marker === 'number' && Number.isFinite(marker) ? marker : 0;
  if (m >= RESET_EPOCH) return { save: normalizeSave(rawSave), marker: m, didReset: false };
  const fresh = defaultSaveData();
  if (rawSave && typeof rawSave === 'object' && SPEEDS[rawSave.speed]) fresh.speed = rawSave.speed;
  return { save: fresh, marker: RESET_EPOCH, didReset: !!rawSave };
}

/** ひらいた ときの よみこみ：しょきかが ひつよう なら その ばで セーブと marker を かきこむ。st は storage（get/set） */
export function loadSaveOnce(st, saveKey) {
  const marker = st.get(RESET_KEY);
  const r = resolveSave(st.get(saveKey), marker);
  if (r.marker !== marker || r.didReset) { st.set(saveKey, r.save); st.set(RESET_KEY, r.marker); }
  return r.save;
}

export function normalizeSave(data) {
  const def = defaultSaveData();
  if (!data || typeof data !== 'object') return def;
  return {
    coins: typeof data.coins === 'number' && data.coins >= 0 ? Math.floor(data.coins) : 0,
    stage: typeof data.stage === 'number' && data.stage >= 1 ? Math.floor(data.stage) : 1,
    speed: SPEEDS[data.speed] ? data.speed : DEFAULT_SPEED,
    upgrades: {
      startCount: Math.min(UPGRADES.startCount.maxLevel, Math.max(1, data.upgrades?.startCount || 1)),
      fireRate: Math.min(UPGRADES.fireRate.maxLevel, Math.max(1, data.upgrades?.fireRate || 1)),
      power: Math.min(UPGRADES.power.maxLevel, Math.max(1, data.upgrades?.power || 1)),
    },
  };
}

/**
 * ステージコースの生成
 */
export function generateStageCourse(stageNum, speedKey = DEFAULT_SPEED) {
  const sp = SPEEDS[speedKey] || SPEEDS[DEFAULT_SPEED];
  const courseLength = Math.round((2400 + Math.min(1600, stageNum * 200)) * sp.gateGap / 400); // ゲートの かずが かわらない ように
  const elements = [];

  // v1.2.0 まず ブロック（うつ まと）→ すこし さきに ゲート、の くりかえし。
  // さいしょの ブロックは はじまった ときから がめんに みえる（y=230）。ゲートも すぐ うえに みえる。
  const gateInterval = sp.gateGap;
  const gateOff = Math.round(sp.gateGap * 0.4);
  let baseY = FIRST_BLOCK_Y, idx = 0;
  let nRows = 0; for (let y = FIRST_BLOCK_Y; y + gateOff < courseLength - 600; y += gateInterval) nRows++;

  while (baseY + gateOff < courseLength - 600) {
    // ゲートの むずかしさは ステージで ふえる（gateSpec）
    const gs = gateSpec(stageNum);
    const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
    const good = () => ({ type: GATE_TYPES.ADD, val: rint(gs.addMin, gs.addMax) });
    let leftGate, rightGate;
    if (gs.mulMax >= 2 && Math.random() < gs.mulChance) {
      // かけ算（あおい ほうが ふえる）と たし算：どっちが おおきいか かんがえよう
      leftGate = { type: GATE_TYPES.MUL, val: rint(2, gs.mulMax) };
      rightGate = { type: GATE_TYPES.ADD, val: rint(gs.addMax, gs.addMax + 4) };
    } else if (gs.divMax >= 2 && Math.random() < gs.divChance) {
      // わり算（あかい）と たし算
      leftGate = { type: GATE_TYPES.DIV, val: rint(2, gs.divMax) };
      rightGate = good();
    } else {
      // たし算と ひき算
      leftGate = { type: GATE_TYPES.SUB, val: rint(1, gs.subMax) };
      rightGate = good();
    }
    // ランダムで左右入れ替え
    if (Math.random() < 0.5) [leftGate, rightGate] = [rightGate, leftGate];

    // うつ まと：さいしょは HP ひくめ（すぐ たおせて ヒットが みえる）
    const numBlocks = Math.random() < 0.5 ? 2 : 3;
    const ramp = FIRST_RAMP[idx] ?? 1;
    const hpBase = (10 + stageNum * 8) * sp.hpMul * ramp;                // むかしの HP（コインの けいさんにだけ つかう）
    const rowTier = Math.min(2, Math.floor(idx * 3 / Math.max(1, nRows)) + (stageNum >= 10 ? 1 : 0));
    for (let i = 0; i < numBlocks; i++) {
      const lane = numBlocks === 2 ? (i === 0 ? -0.4 : 0.4) : (i - 1) * 0.6;
      const jitter = 0.8 + Math.random() * 0.5;
      const hp = Math.max(3, Math.floor(blockBaseHp(stageNum, idx) * jitter * (WALL.speedMul[speedKey] ?? 1)));
      elements.push({
        type: 'BLOCK',
        id: `blk_${baseY}_${i}`,
        y: baseY,
        laneNorm: lane, // -1 (左) 〜 +1 (右)
        hp,
        maxHp: 0, // 後でセット
        tier: rowTier, // モンスターの なかま（0=よわい 1=ふつう 2=つよい）
        coin: 3 + Math.floor(Math.max(3, Math.floor(hpBase * jitter)) / (5 * sp.hpMul)),
        destroyed: false,
        flash: 0,
      });
    }

    elements.push({
      type: 'GATE_PAIR',
      y: baseY + gateOff,
      left: leftGate,
      right: rightGate,
      passed: false,
    });

    baseY += gateInterval;
    idx++;
  }

  // ブロックの初期HP記録
  for (const el of elements) {
    if (el.type === 'BLOCK') el.maxHp = el.hp;
  }

  // ゴールラインと倍率ボーナスウォール
  const finishY = courseLength - 200;
  const multipliers = [1.5, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0, 20.0];
  const walls = multipliers.map((mul, idx) => ({
    type: 'WALL',
    y: finishY + 100 + idx * 120,
    mult: mul,
    hp: Math.round(wallBaseHp(stageNum, speedKey) * Math.pow(WALL.grow, idx)),
    maxHp: Math.round(wallBaseHp(stageNum, speedKey) * Math.pow(WALL.grow, idx)),
    destroyed: false,
  }));

  return {
    speedKey: SPEEDS[speedKey] ? speedKey : DEFAULT_SPEED,
    hpMul: sp.hpMul,
    theme: stageTheme(stageNum),
    length: finishY + multipliers.length * 120 + 300,
    finishY,
    elements,
    walls,
  };
}
