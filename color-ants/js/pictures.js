/**
 * カラー・アント ドット絵データ（32×32）
 * 図形を重ねて描く小さな描画ヘルパーで、かわいい絵を生成する。
 * 各セルは palette のキー名を持ち、アリは「同じキーの色」のセルだけを運んでいく。
 */

export const SIZE = 32;

class Grid {
  constructor(bg) { this.cells = new Array(SIZE * SIZE).fill(bg); }
  fillIf(key, test) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) if (test(x, y)) this.cells[y * SIZE + x] = key;
    }
  }
  set(key, x, y) {
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) this.cells[y * SIZE + x] = key;
  }
  rect(key, x0, y0, x1, y1) { this.fillIf(key, (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1); }
  circle(key, cx, cy, r) { this.fillIf(key, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r); }
  ellipse(key, cx, cy, rx, ry) {
    this.fillIf(key, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
  }
}

const CX = 15.5; // 盤面の中心（左右対称にするため 15 と 16 の間）

function drawWatermelon() {
  const g = new Grid('bg');
  g.fillIf('floor', (x, y) => y >= 27);
  const cy = 9;
  const d = (x, y) => Math.hypot(x - CX, y - cy);
  g.fillIf('rind', (x, y) => y >= cy && d(x, y) <= 15.6);
  g.fillIf('rind2', (x, y) => y >= cy && d(x, y) <= 13.8);
  g.fillIf('pith', (x, y) => y >= cy && d(x, y) <= 12.8);
  g.fillIf('red', (x, y) => y >= cy && d(x, y) <= 11.8);
  g.fillIf('red2', (x, y) => y >= cy && d(x, y) <= 6.2);
  const seeds = [[9, 13], [13, 12], [18, 12], [22, 13], [11, 17], [16, 16], [21, 17], [13, 19], [18, 19]];
  for (const [x, y] of seeds) { g.set('seed', x, y); g.set('seed', x, y + 1); }
  return g.cells;
}

function drawStrawberry() {
  const g = new Grid('bg');
  const hw = (y) => {
    if (y < 10 || y > 30) return -1;
    if (y <= 19) return 12.2 * Math.sqrt(1 - ((19 - y) / 9.5) ** 2);
    return 12.2 * (1 - ((y - 19) / 12) ** 1.4);
  };
  g.fillIf('red', (x, y) => Math.abs(x - CX) <= hw(y));
  g.fillIf('dark', (x, y) => { const h = hw(y); return h > 0 && x - CX >= h * 0.62 && x - CX <= h; });
  g.ellipse('hi', 9.5, 16, 1.6, 2.8);
  for (let row = 0; row < 5; row++) {
    const y = 14 + row * 3;
    for (let k = -3; k <= 3; k++) {
      const x = Math.round(15 + k * 4 + (row % 2 ? 2 : 0));
      if (Math.abs(x + 0.5 - CX) <= hw(y) - 2.5) g.set('seed', x, y);
    }
  }
  g.fillIf('leaf', (x, y) => y >= 7 && y <= 11 && Math.abs(x - CX) <= 2 + (y - 7) * 2.8);
  g.rect('leaf2', 15, 3, 16, 6);
  g.fillIf('leaf2', (x, y) => y >= 8 && y <= 11 && Math.abs(x - CX) <= 1.2);
  return g.cells;
}

function drawCupcake() {
  const g = new Grid('bg');
  const half = (y) => 10 - (y - 20) * 0.36;
  g.fillIf('wrap', (x, y) => y >= 20 && y <= 29 && Math.abs(x - CX) <= half(y));
  g.fillIf('wrap2', (x, y) => y >= 21 && y <= 29 && Math.abs(x - CX) <= half(y) && x % 3 === 0);
  g.ellipse('cream', CX, 20, 12.5, 3.4);
  g.ellipse('cream', CX, 16, 10, 3.6);
  g.ellipse('cream', CX, 12, 7, 3.4);
  g.ellipse('cream', CX, 8.5, 3.8, 2.8);
  g.ellipse('cream2', 11, 20, 5, 1.1);
  g.ellipse('cream2', 12, 16, 3.5, 1.0);
  g.ellipse('cream2', 13, 12, 2.5, 0.9);
  g.circle('cherry', CX, 5, 2.7);
  g.set('white', 14, 4);
  const sprinkles = [[9, 19, 'sp1'], [20, 21, 'sp2'], [22, 18, 'sp1'], [12, 15, 'sp2'], [18, 16, 'sp1'], [14, 11, 'sp1'], [17, 12, 'sp2'], [11, 22, 'sp2']];
  for (const [x, y, k] of sprinkles) { g.set(k, x, y); g.set(k, x + 1, y); }
  return g.cells;
}

function drawChick() {
  const g = new Grid('bg');
  g.fillIf('grass', (x, y) => y >= 29);
  g.fillIf('grass2', (x, y) => y >= 31);
  g.circle('yel', CX, 17, 11.5);
  g.ellipse('yel2', CX, 21.5, 7, 5.6);
  g.ellipse('wing', 6.5, 19.5, 2.2, 4.6);
  g.ellipse('wing', 24.5, 19.5, 2.2, 4.6);
  g.circle('black', 11, 14.5, 2.1);
  g.circle('black', 20, 14.5, 2.1);
  g.set('white', 10, 13); g.set('white', 19, 13);
  g.fillIf('orange', (x, y) => y >= 16 && y <= 19 && Math.abs(x - CX) <= 3.2 - (y - 16) * 0.8);
  g.ellipse('blush', 8, 18.5, 2.2, 1.3);
  g.ellipse('blush', 23, 18.5, 2.2, 1.3);
  g.rect('orange', 10, 28, 13, 29);
  g.rect('orange', 18, 28, 21, 29);
  g.rect('yel', 15, 4, 16, 5);
  g.set('yel', 16, 3);
  return g.cells;
}

function drawRainbow() {
  const g = new Grid('bg');
  g.circle('y', 26, 6, 3.2);
  const cy = 24;
  const bands = [['r', 15.5], ['o', 13.2], ['y', 10.9], ['g', 8.6], ['b', 6.3], ['p', 4.0], ['bg', 1.7]];
  for (const [k, r] of bands) {
    g.fillIf(k, (x, y) => y <= cy + 0.5 && Math.hypot(x - CX, y - cy) <= r);
  }
  for (const [x, y, r] of [[3, 26, 4.2], [8.5, 27, 3.6], [12.5, 28, 3.0]]) {
    g.circle('white', x, y, r);
    g.circle('white', 31 - x, y, r);
  }
  return g.cells;
}

function drawMushroom() {
  const g = new Grid('bg');
  g.fillIf('grass', (x, y) => y >= 28);
  g.fillIf('grass2', (x, y) => y >= 30);
  const stemHalf = (y) => 4.8 + (y - 18) * 0.28;
  g.fillIf('stem', (x, y) => y >= 18 && y <= 29 && Math.abs(x - CX) <= stemHalf(y));
  g.fillIf('stem2', (x, y) => y >= 18 && y <= 29 && x - CX > 2.2 && Math.abs(x - CX) <= stemHalf(y));
  const inCap = (x, y) => y <= 18 && ((x - CX) / 14.2) ** 2 + ((y - 18) / 12) ** 2 <= 1;
  g.fillIf('cap', inCap);
  g.fillIf('cap2', (x, y) => y >= 16 && inCap(x, y));
  g.circle('spot', 9, 13, 2.6);
  g.circle('spot', 19, 9, 2.8);
  g.circle('spot', 23.5, 14, 2.2);
  g.circle('spot', 14, 14.5, 1.9);
  g.circle('spot', 12, 8.5, 1.5);
  g.rect('black', 12, 22, 12, 23);
  g.rect('black', 19, 22, 19, 23);
  g.ellipse('blush', 10.5, 24.5, 1.4, 0.9);
  g.ellipse('blush', 20.5, 24.5, 1.4, 0.9);
  g.set('black', 15, 25); g.set('black', 16, 25);
  for (const [x, y] of [[3, 27], [4, 26], [5, 27], [26, 27], [27, 26], [28, 27]]) g.set('grass', x, y);
  return g.cells;
}

export const PICTURE_DEFS = [
  {
    id: 'watermelon', name: 'すいか', icon: '🍉', draw: drawWatermelon,
    palette: { bg: '#ffe8a3', floor: '#f2cf7a', rind: '#1f7a3a', rind2: '#7bd36b', pith: '#f4fbe8', red: '#ef4056', red2: '#ff7d8e', seed: '#2b2230' },
  },
  {
    id: 'cupcake', name: 'カップケーキ', icon: '🧁', draw: drawCupcake,
    palette: { bg: '#e9defb', wrap: '#f2a65a', wrap2: '#d9822b', cream: '#ff8fab', cream2: '#ffc9d6', cherry: '#e5383b', sp1: '#4cc9f0', sp2: '#ffd60a', white: '#ffffff' },
  },
  {
    id: 'chick', name: 'ひよこ', icon: '🐥', draw: drawChick,
    palette: { bg: '#b9e6ff', grass: '#6bcb77', grass2: '#46a757', yel: '#ffd93d', yel2: '#fff0a0', wing: '#f5b800', black: '#2b2b3a', white: '#ffffff', orange: '#ff8c2b', blush: '#ff9aa8' },
  },
  {
    id: 'strawberry', name: 'いちご', icon: '🍓', draw: drawStrawberry,
    palette: { bg: '#ffe1ea', red: '#e8344e', dark: '#b5162f', hi: '#ff8fa0', seed: '#ffe27a', leaf: '#3fb950', leaf2: '#237a35' },
  },
  {
    id: 'rainbow', name: 'にじ', icon: '🌈', draw: drawRainbow,
    palette: { bg: '#d6efff', white: '#ffffff', r: '#ff4d4d', o: '#ff9f1c', y: '#ffe14d', g: '#4cd964', b: '#3a9bff', p: '#9b5de5' },
  },
  {
    id: 'mushroom', name: 'きのこ', icon: '🍄', draw: drawMushroom,
    palette: { bg: '#bfe9ff', grass: '#5bbf5b', grass2: '#3f9c47', cap: '#e63946', cap2: '#b5202f', spot: '#ffffff', stem: '#fff1d6', stem2: '#e8cfa6', black: '#2b2b3a', blush: '#ff9aa8' },
  },
];

/** 定義から実際のピクセル一覧を作る（eaten は運ばれたかどうか） */
export function buildPicture(def) {
  const cells = def.draw();
  const pixels = cells.map((key, i) => ({
    gx: i % SIZE,
    gy: Math.floor(i / SIZE),
    key,
    hex: def.palette[key],
    eaten: false,
  }));
  return { id: def.id, name: def.name, icon: def.icon, palette: def.palette, pixels };
}

export function countByKey(pixels) {
  const counts = {};
  for (const p of pixels) counts[p.key] = (counts[p.key] || 0) + 1;
  return counts;
}

/** 絵を canvas に描く（クリア画面のサムネイル用） */
export function paintPicture(ctx, picture, x, y, cell) {
  for (const p of picture.pixels) {
    ctx.fillStyle = p.hex;
    ctx.fillRect(x + p.gx * cell, y + p.gy * cell, cell, cell);
  }
}
