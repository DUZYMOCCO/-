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
export function generateStageCourse(stageNum) {
  const courseLength = 2400 + Math.min(1600, stageNum * 200);
  const elements = [];

  // ゲートペアの配置（約350pxごと）
  const gateInterval = 400;
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
    const blockY = currentY + 180;
    const numBlocks = Math.random() < 0.5 ? 2 : 3;
    const hpBase = 10 + stageNum * 8;

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
    hp: 40 + idx * 60 + stageNum * 30,
    maxHp: 40 + idx * 60 + stageNum * 30,
    destroyed: false,
  }));

  return {
    length: finishY + multipliers.length * 120 + 300,
    finishY,
    elements,
    walls,
  };
}
