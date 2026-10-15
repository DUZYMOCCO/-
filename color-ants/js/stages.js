/**
 * カラー・アント ステージデータ
 * ドット絵（ピクセルマップ）とカラーグループの定義
 */

// カラーグループ定義
export const COLOR_GROUPS = {
  RED: { id: 'red', name: 'あか', antColor: '#ef4444', headColor: '#b91c1c', icon: '🔴' },
  BLUE: { id: 'blue', name: 'あお', antColor: '#3b82f6', headColor: '#1d4ed8', icon: '🔵' },
  YELLOW: { id: 'yellow', name: 'きいろ', antColor: '#eab308', headColor: '#a16207', icon: '🟡' },
  GREEN: { id: 'green', name: 'みどり', antColor: '#22c55e', headColor: '#15803d', icon: '🟢' },
  PURPLE: { id: 'purple', name: 'むらさき', antColor: '#a855f7', headColor: '#7e22ce', icon: '🟣' },
  RAINBOW: { id: 'rainbow', name: 'にじいろ', antColor: '#ec4899', headColor: '#f43f5e', icon: '🌈', isRainbow: true },
};

// 1文字記号とカラーの対応
export const PALETTE = {
  '.': null, // 空白
  'R': { hex: '#ef4444', group: 'red', hp: 1 },    // 赤
  'r': { hex: '#f87171', group: 'red', hp: 1 },    // 薄赤
  'D': { hex: '#991b1b', group: 'red', hp: 2 },    // 濃赤
  'G': { hex: '#22c55e', group: 'green', hp: 1 },  // 緑
  'g': { hex: '#86efac', group: 'green', hp: 1 },  // 薄緑
  'F': { hex: '#166534', group: 'green', hp: 2 },  // 深緑
  'B': { hex: '#3b82f6', group: 'blue', hp: 1 },   // 青
  'b': { hex: '#93c5fd', group: 'blue', hp: 1 },   // 薄青
  'Y': { hex: '#eab308', group: 'yellow', hp: 1 }, // 黄
  'y': { hex: '#fef08a', group: 'yellow', hp: 1 }, // 薄黄
  'O': { hex: '#f97316', group: 'yellow', hp: 1 }, // オレンジ
  'P': { hex: '#a855f7', group: 'purple', hp: 1 }, // 紫
  'p': { hex: '#d8b4fe', group: 'purple', hp: 1 }, // 薄紫
  'W': { hex: '#f8fafc', group: 'yellow', hp: 1 }, // 白（黄色アリが担当）
  'K': { hex: '#334155', group: 'purple', hp: 2 }, // 黒/暗色（紫アリが担当）
  'T': { hex: '#78350f', group: 'red', hp: 2 },    // 茶色（赤アリが担当）
};

// 12x12 のかわいいドット絵ステージ
export const STAGES = [
  {
    id: 'apple',
    name: 'まっかなりんご',
    icon: '🍎',
    size: 12,
    rewardCoins: 250,
    map: [
      '....GG......',
      '...GFFG.....',
      '....TT......',
      '..rrrrrr....',
      '.rRRRRRRr...',
      '.rRRRRRRr...',
      'rRRRRRRRRr..',
      'rRRRRRRRRr..',
      '.rRRRRRRr...',
      '.rRRRRRRr...',
      '..rRRRRr....',
      '...rrrr.....',
    ],
  },
  {
    id: 'chick',
    name: 'ひよこちゃん',
    icon: '🐥',
    size: 12,
    rewardCoins: 400,
    map: [
      '....YYYY....',
      '..YYyyyyYY..',
      '.YyyWyyWyyY.',
      '.YyyKyyKyyY.',
      '.YyyyOOyyyY.',
      '.YyyOOOOyyY.',
      '..YYyyyyYY..',
      '.YYyyyyyyyy.',
      'YyyyyyyyyyyY',
      'YyyyyyyyyyyY',
      '.YYYYYYYYYY.',
      '...OO..OO...',
    ],
  },
  {
    id: 'watermelon',
    name: 'すいかスライス',
    icon: '🍉',
    size: 12,
    rewardCoins: 600,
    map: [
      '..GGGGGGGG..',
      '.GGFFFFFFFFG',
      'GFFFFFFggggG',
      'GgWWWWWWWWg.',
      '.WrrrrrrrrW.',
      '.rRRRRKRRRr.',
      '..rRRRRRRr..',
      '..rRKRRRRr..',
      '...rRRRRr...',
      '...rKRRr....',
      '....rr......',
      '............',
    ],
  },
  {
    id: 'cupcake',
    name: 'カップケーキ',
    icon: '🧁',
    size: 12,
    rewardCoins: 900,
    map: [
      '.....RR.....',
      '....RRRR....',
      '...PPPPPP...',
      '..PPbbbbPP..',
      '.PPbbYYbbPP.',
      '.PPbbYYbbPP.',
      '..PPPPPPPP..',
      '..TTTTTTTT..',
      '..TTyyTTyy..',
      '...TTTTTT...',
      '...TTTTTT...',
      '....TTTT....',
    ],
  },
  {
    id: 'spaceship',
    name: 'うちゅうせん',
    icon: '🚀',
    size: 12,
    rewardCoins: 1400,
    map: [
      '.....RR.....',
      '....RRRR....',
      '...RbbbbR...',
      '...RbbbbR...',
      '..RbbWWbbR..',
      '..RbbWWbbR..',
      '..RbbbbbbR..',
      '..RbbbbbbR..',
      '.RRbbbbbbRR.',
      'RR.RRRRRR.RR',
      '....OOOO....',
      '...YYYYYY...',
    ],
  },
  {
    id: 'star',
    name: 'にじのスター',
    icon: '⭐',
    size: 12,
    rewardCoins: 2200,
    map: [
      '.....YY.....',
      '.....YY.....',
      '....YYYY....',
      'YYYYYYYYYYYY',
      '.YYYYYYYYYY.',
      '..YYbbYYbb..',
      '..YYRRRRyy..',
      '.YYYRRRRYYY.',
      '.YYPP..PPYY.',
      'YYPP....PPYY',
      'YY........YY',
      '............',
    ],
  },
];

/**
 * マップ配列からピクセルオブジェクト一覧を生成する
 */
export function buildPixelGrid(stage) {
  const pixels = [];
  const size = stage.size;
  for (let y = 0; y < size; y++) {
    const row = stage.map[y] || '';
    for (let x = 0; x < size; x++) {
      const char = row[x] || '.';
      const item = PALETTE[char];
      if (item) {
        pixels.push({
          id: `${x}_${y}`,
          gx: x,
          gy: y,
          hex: item.hex,
          group: item.group,
          maxHp: item.hp,
          hp: item.hp,
          eaten: false,
        });
      }
    }
  }
  return pixels;
}
