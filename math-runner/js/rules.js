/**
 * さんすうシューター ルール＆計算ロジック
 */

export const GATE_TYPES = {
  ADD: 'add',
  SUB: 'sub',
  MUL: 'mul',
  DIV: 'div',
};

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
  return Math.min(999, Math.max(1, next));
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
/** ゲートを うって かずが ふえるように なった ぶん、ボーナスの かべは かたく（コインが ふえすぎない） */
export const WALL_MUL = 1.8;

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

export const UPGRADES = {
  startCount: {
    name: 'スタートだんすう',
    icon: '🔫',
    baseCost: 25,
    costMult: 1.45,
    calcValue: (lvl) => lvl, // Lv1: 1発, Lv2: 2発...
    maxLevel: 20,
  },
  fireRate: {
    name: 'れんしゃスピード',
    icon: '⚡',
    baseCost: 35,
    costMult: 1.4,
    calcValue: (lvl) => Math.max(0.06, 0.16 - (lvl - 1) * 0.007), // 秒ごとの発射間隔
    maxLevel: 15,
  },
  power: {
    name: 'たまの いりょく',
    icon: '💥',
    baseCost: 50,
    costMult: 1.5,
    calcValue: (lvl) => 1 + (lvl - 1) * 0.5,
    maxLevel: 15,
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
    const hpBase = (10 + stageNum * 8) * sp.hpMul * ramp;
    for (let i = 0; i < numBlocks; i++) {
      const lane = numBlocks === 2 ? (i === 0 ? -0.4 : 0.4) : (i - 1) * 0.6;
      elements.push({
        type: 'BLOCK',
        id: `blk_${baseY}_${i}`,
        y: baseY,
        laneNorm: lane, // -1 (左) 〜 +1 (右)
        hp: Math.max(3, Math.floor(hpBase * (0.8 + Math.random() * 0.5))),
        maxHp: 0, // 後でセット
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
    hp: Math.round((40 + idx * 60 + stageNum * 30) * sp.hpMul * WALL_MUL),
    maxHp: Math.round((40 + idx * 60 + stageNum * 30) * sp.hpMul * WALL_MUL),
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
