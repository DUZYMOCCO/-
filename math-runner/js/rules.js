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

  // ゲートペアの配置（約350pxごと）
  const gateInterval = sp.gateGap;
  let currentY = 500;

  while (currentY < courseLength - 600) {
    // ゲートの難易度設定
    const diff = Math.min(5, 1 + Math.floor(stageNum / 2));
    const isMul = Math.random() < 0.35 && stageNum >= 2;

    let leftGate, rightGate;
    if (isMul) {
      // かけ算と足し算の組み合わせ
      leftGate = { type: GATE_TYPES.MUL, val: 2 };
      rightGate = { type: GATE_TYPES.ADD, val: 5 + diff * 2 };
      // ランダムで左右入れ替え
      if (Math.random() < 0.5) [leftGate, rightGate] = [rightGate, leftGate];
    } else {
      // 足し算と引き算
      const addVal = 2 + Math.floor(Math.random() * 4) + diff;
      const subVal = 1 + Math.floor(Math.random() * 3) + Math.floor(diff / 2);
      leftGate = { type: GATE_TYPES.ADD, val: addVal };
      rightGate = { type: GATE_TYPES.SUB, val: subVal };
      if (Math.random() < 0.5) [leftGate, rightGate] = [rightGate, leftGate];
    }

    elements.push({
      type: 'GATE_PAIR',
      y: currentY,
      left: leftGate,
      right: rightGate,
      passed: false,
    });

    // ゲートの間にブロック群を配置
    const blockY = currentY + Math.round(sp.gateGap * 0.45);
    const numBlocks = Math.random() < 0.5 ? 2 : 3;
    const hpBase = (10 + stageNum * 8) * sp.hpMul;

    for (let i = 0; i < numBlocks; i++) {
      const lane = numBlocks === 2 ? (i === 0 ? -0.4 : 0.4) : (i - 1) * 0.6;
      elements.push({
        type: 'BLOCK',
        id: `blk_${blockY}_${i}`,
        y: blockY,
        laneNorm: lane, // -1 (左) 〜 +1 (右)
        hp: Math.floor(hpBase * (0.8 + Math.random() * 0.5)),
        maxHp: 0, // 後でセット
        destroyed: false,
      });
    }

    currentY += gateInterval;
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
    hp: Math.round((40 + idx * 60 + stageNum * 30) * sp.hpMul),
    maxHp: Math.round((40 + idx * 60 + stageNum * 30) * sp.hpMul),
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
