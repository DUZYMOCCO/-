/**
 * カラー・アント ドット絵データ（64×64）
 * 図形は 32 分割の座標系（0〜31）で描き、Grid が SIZE に合わせて細かく塗る。
 * 陰影の描画色と、アリが食べる色のグループは分けて扱う。
 */

export const SIZE = 64;
const U = SIZE / 32;
const c32 = (i) => (i + 0.5) / U - 0.5; // セル中心 → 32分割座標

class Grid {
  constructor(bg) { this.cells = new Array(SIZE * SIZE).fill(bg); }
  fillIf(key, test) {
    for (let y = 0; y < SIZE; y++) {
      const cy = c32(y);
      for (let x = 0; x < SIZE; x++) if (test(c32(x), cy)) this.cells[y * SIZE + x] = key;
    }
  }
  set(key, x, y) { this.fillIf(key, (cx, cy) => Math.abs(cx - x) < 0.5 && Math.abs(cy - y) < 0.5); }
  rect(key, x0, y0, x1, y1) { this.fillIf(key, (x, y) => x >= x0 - 0.5 && x <= x1 + 0.5 && y >= y0 - 0.5 && y <= y1 + 0.5); }
  circle(key, cx, cy, r) { this.fillIf(key, (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r); }
  ellipse(key, cx, cy, rx, ry) {
    this.fillIf(key, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
  }
  polygon(key, points) {
    this.fillIf(key, (x, y) => {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[i], [bx, by] = points[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      return inside;
    });
  }
}

const CX = 15.5; // 盤面の中心

function drawWatermelon() {
  const g = new Grid('bg');
  // A thick triangular slice: red cut surface, pale pith and striped green side.
  g.ellipse('shadow', 17, 28, 13.5, 1.5);
  g.polygon('rind', [[2, 10], [25, 3], [29, 22], [28, 27], [3, 15]]);
  g.polygon('rind3', [[3, 11], [28, 22], [27, 26], [3, 14]]);
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 3.7, y = 12 + i * 1.65;
    g.polygon('rind', [[x, y], [x + 1.3, y + .6], [x + .6, y + 3], [x - .8, y + 2.4]]);
  }
  g.polygon('rind2', [[2, 10], [25, 3], [29, 22], [27, 23]]);
  g.polygon('pith', [[3, 10], [24.5, 4], [27.5, 21.4]]);
  g.polygon('red', [[5, 10], [23.5, 5.5], [26, 20]]);
  g.polygon('red2', [[5, 10], [23.5, 5.5], [24.2, 8.5], [9, 12]]);
  g.polygon('red3', [[7, 10], [22, 6.5], [22.2, 7.1], [8.5, 10.7]]);
  const seeds = [[12, 10], [18, 8.5], [22.5, 11], [16.5, 12.7], [22, 15.5]];
  for (const [x, y] of seeds) {
    g.ellipse('seed', x, y, .55, .85);
    g.set('hi', x - .1, y - .25);
  }
  return g.cells;
}

function drawStrawberry() {
  const g = new Grid('bg');
  g.ellipse('shadow', CX, 30.4, 9, 0.9);
  const hw = (y) => {
    if (y < 9.5 || y > 30.2) return -1;
    if (y <= 19) return 12.2 * Math.sqrt(1 - ((19 - y) / 9.5) ** 2);
    return 12.2 * (1 - ((y - 19) / 12) ** 1.4);
  };
  g.fillIf('red', (x, y) => Math.abs(x - CX) <= hw(y));
  g.fillIf('red2', (x, y) => { const h = hw(y); return h > 0 && x - CX <= -h * 0.25 && x - CX >= -h * 0.85 && y < 26; });
  g.fillIf('dark', (x, y) => { const h = hw(y); return h > 0 && x - CX >= h * 0.62 && x - CX <= h; });
  g.ellipse('hi', 9.5, 15.5, 1.5, 3);
  g.circle('hi', 10.5, 20, 0.7);
  for (let row = 0; row < 9; row++) {
    const y = 12.6 + row * 2.1;
    for (let k = -4; k <= 4; k++) {
      const x = CX + k * 3.1 + (row % 2 ? 1.55 : 0);
      if (Math.abs(x - CX) <= hw(y) - 2.2) g.ellipse('seed', x, y, 0.55, 0.85);
    }
  }
  g.fillIf('leaf', (x, y) => y >= 6.5 && y <= 11 && Math.abs(x - CX) <= 2 + (y - 6.5) * 2.9 && ((x + y * 2) % 7 > 1.2 || y > 9.5));
  g.fillIf('leaf2', (x, y) => y >= 8 && y <= 11 && Math.abs(x - CX) <= 1.1);
  g.rect('leaf2', 15, 2.5, 16, 6.5);
  return g.cells;
}

function drawCupcake() {
  const g = new Grid('bg');
  g.ellipse('shadow', CX, 29.6, 11, 0.9);
  const half = (y) => 10 - (y - 20) * 0.36;
  g.fillIf('wrap', (x, y) => y >= 20 && y <= 29.5 && Math.abs(x - CX) <= half(y));
  g.fillIf('wrap2', (x, y) => y >= 20.5 && y <= 29.5 && Math.abs(x - CX) <= half(y) && Math.round(x * 1.0) % 3 === 0);
  g.ellipse('cream', CX, 20, 12.5, 3.4);
  g.ellipse('cream', CX, 16, 10, 3.6);
  g.ellipse('cream', CX, 12, 7, 3.4);
  g.ellipse('cream', CX, 8.5, 3.8, 2.8);
  g.ellipse('cream3', CX + 3, 21.2, 8, 1.1);
  g.ellipse('cream3', CX + 2.5, 17.4, 6, 1.0);
  g.ellipse('cream3', CX + 2, 13.2, 4, 0.9);
  g.ellipse('cream2', 11, 19.6, 5, 1.0);
  g.ellipse('cream2', 12, 15.6, 3.5, 0.9);
  g.ellipse('cream2', 13, 11.6, 2.4, 0.8);
  g.circle('cherry', CX, 5, 2.7);
  g.circle('cherry2', CX + 0.9, 5.7, 1.4);
  g.set('white', 14.2, 4);
  g.rect('leaf', 16.5, 1.5, 17.5, 2.5);
  const sprinkles = [[9, 19, 'sp1'], [20, 21, 'sp2'], [22, 18, 'sp1'], [12, 15, 'sp2'], [18, 16, 'sp1'], [14, 11, 'sp1'], [17, 12, 'sp2'], [11, 22, 'sp2'], [15, 19, 'sp2'], [24, 20, 'sp1'], [8, 21, 'sp1'], [19, 9, 'sp2']];
  for (const [x, y, k] of sprinkles) g.rect(k, x, y, x + 1, y);
  return g.cells;
}

function drawChick() {
  const g = new Grid('bg');
  g.fillIf('grass', (x, y) => y >= 29);
  g.fillIf('grass2', (x, y) => y >= 31 || (y >= 29.5 && Math.round(x * 2) % 5 === 0));
  g.ellipse('shadow', CX, 29.2, 11, 0.8);
  g.circle('yel', CX, 17, 11.5);
  g.ellipse('yel2', CX, 21.5, 7, 5.6);
  g.ellipse('wing', 6.5, 19.5, 2.2, 4.6);
  g.ellipse('wing', 24.5, 19.5, 2.2, 4.6);
  g.fillIf('yel3', (x, y) => Math.hypot(x - CX, y - 17) <= 11.5 && Math.hypot(x - CX, y - 17) > 10.3 && y < 22 && x - CX > 3);
  g.circle('black', 11, 14.5, 2.1);
  g.circle('black', 20, 14.5, 2.1);
  g.circle('white', 10.2, 13.6, 0.8);
  g.circle('white', 19.2, 13.6, 0.8);
  g.fillIf('orange', (x, y) => y >= 16 && y <= 19 && Math.abs(x - CX) <= 3.2 - (y - 16) * 0.8);
  g.fillIf('orange2', (x, y) => y >= 17.5 && y <= 19 && Math.abs(x - CX) <= 1.4 - (y - 17.5) * 0.5);
  g.ellipse('blush', 8, 18.5, 2.2, 1.3);
  g.ellipse('blush', 23, 18.5, 2.2, 1.3);
  g.rect('orange', 10, 28, 13, 29);
  g.rect('orange', 18, 28, 21, 29);
  g.rect('yel', 15, 4, 16, 5);
  g.rect('yel', 16, 3, 17, 3);
  g.rect('yel', 14, 4, 14, 4);
  return g.cells;
}

function drawRainbow() {
  const g = new Grid('bg');
  g.circle('y', 26, 6, 3.2);
  g.circle('sun2', 26, 6, 1.9);
  for (const [x, y] of [[6, 5], [10, 11], [21, 12], [3, 12], [14, 4]]) { g.rect('white', x, y, x, y); g.rect('white', x - 1, y, x + 1, y); g.rect('white', x, y - 1, x, y + 1); }
  const cy = 24;
  const bands = [['r', 15.5], ['o', 13.2], ['y', 10.9], ['g', 8.6], ['b', 6.3], ['p', 4.0], ['bg', 1.7]];
  for (const [k, r] of bands) {
    g.fillIf(k, (x, y) => y <= cy + 0.5 && Math.hypot(x - CX, y - cy) <= r);
  }
  for (const [x, y, r] of [[3, 26, 4.2], [8.5, 27, 3.6], [12.5, 28, 3.0]]) {
    g.circle('white', x, y, r);
    g.circle('white', 31 - x, y, r);
  }
  g.fillIf('cloud2', (x, y) => y >= 29.5 && (x < 10 || x > 21) && Math.hypot(x < 10 ? x - 6 : x - 25, y - 28) <= 4.6);
  return g.cells;
}

function drawMushroom() {
  const g = new Grid('bg');
  g.fillIf('grass', (x, y) => y >= 28);
  g.fillIf('grass2', (x, y) => y >= 30);
  const stemHalf = (y) => 4.8 + (y - 18) * 0.28;
  g.fillIf('stem', (x, y) => y >= 18 && y <= 29 && Math.abs(x - CX) <= stemHalf(y));
  g.fillIf('stem2', (x, y) => y >= 18 && y <= 29 && x - CX > 2.2 && Math.abs(x - CX) <= stemHalf(y));
  const inCap = (x, y) => y <= 18.4 && ((x - CX) / 14.2) ** 2 + ((y - 18.4) / 12) ** 2 <= 1;
  g.fillIf('cap', inCap);
  g.fillIf('cap3', (x, y) => inCap(x, y) && x - CX > 4 && y < 15 && ((x - CX) / 14.2) ** 2 + ((y - 18.4) / 12) ** 2 > 0.7);
  g.fillIf('cap2', (x, y) => y >= 16.4 && inCap(x, y));
  g.circle('spot', 9, 13, 2.6);
  g.circle('spot', 19, 9, 2.8);
  g.circle('spot', 23.5, 14, 2.2);
  g.circle('spot', 14, 14.5, 1.9);
  g.circle('spot', 12, 8.5, 1.5);
  g.circle('spot', 6.5, 16.2, 1.1);
  g.circle('spot', 26, 17, 0.9);
  g.rect('black', 12, 22, 12, 23);
  g.rect('black', 19, 22, 19, 23);
  g.circle('spot', 11.7, 21.8, 0.35);
  g.circle('spot', 18.7, 21.8, 0.35);
  g.ellipse('blush', 10.5, 24.5, 1.4, 0.9);
  g.ellipse('blush', 20.5, 24.5, 1.4, 0.9);
  g.rect('black', 15, 25, 16, 25);
  for (const [x, y] of [[3, 27], [4, 26], [5, 27], [26, 27], [27, 26], [28, 27], [2, 26], [29, 26]]) g.set('grass', x, y);
  return g.cells;
}

function drawDonut() {
  const g = new Grid('bg');
  g.ellipse('shadow', CX, 28.5, 12.5, 1.2);
  g.ellipse('crust', CX, 17, 13.5, 11.5);
  g.ellipse('dough', CX, 15.5, 13, 10.5);
  g.ellipse('icing', CX, 14, 12, 8.8);
  for (const [x, y] of [[6, 19], [10, 21], [22, 20], [25, 17]]) g.ellipse('icing', x, y, 1.5, 2.2);
  g.ellipse('shade', 20, 17.5, 6.5, 3.5);
  g.ellipse('icing', 18, 16.5, 6, 3.1);
  g.ellipse('hole', CX, 14, 5, 4);
  g.ellipse('inner', CX, 15, 3.8, 2.5);
  g.ellipse('bg', CX, 14.5, 2.6, 1.7);
  g.ellipse('shine', 8.5, 10, 2.8, 1.2);
  for (const [x, y, key] of [[11, 6, 'yellow'], [20, 7, 'blue'], [24, 11, 'yellow'], [6, 14, 'blue'], [9, 19, 'white'], [22, 19, 'white'], [17, 21, 'yellow'], [25, 15, 'blue']]) g.rect(key, x, y, x + 1, y + .5);
  return g.cells;
}

function drawIceCream() {
  const g = new Grid('bg');
  g.ellipse('shadow', 16, 30, 7, .8);
  g.polygon('cone', [[7, 16], [25, 16], [16, 30]]);
  g.polygon('coneDark', [[21, 17], [25, 16], [16, 30], [17, 24]]);
  g.fillIf('waffle', (x, y) => y >= 18 && y <= 28 && Math.abs(x - 16) < (30 - y) * .62 && (Math.floor(x + y) % 5 === 0 || Math.floor(x - y + 40) % 5 === 0));
  g.circle('mint', 20, 13, 7.5);
  g.ellipse('mintDark', 21.5, 17, 6, 2.5);
  g.circle('pink', 11.5, 12.5, 7.5);
  g.ellipse('pinkDark', 12.5, 17.5, 6.5, 2);
  g.circle('cream', 16, 6.5, 5.8);
  g.ellipse('creamShade', 18, 9.3, 3.5, 1.4);
  g.circle('cherry', 17, 2.2, 1.8);
  g.ellipse('shine', 13.7, 4.5, 2, .7);
  g.ellipse('shine', 8, 10, 1.7, 1);
  for (const [x, y] of [[21, 10], [25, 13], [20, 15], [22, 18], [17, 12]]) g.rect('chip', x, y, x + .5, y + .5);
  return g.cells;
}

function drawPenguin() {
  const g = new Grid('bg');
  g.ellipse('ice', 16, 29.5, 14, 1.5);
  g.ellipse('outline', 15.5, 17, 10.5, 13);
  g.ellipse('outline', 4.8, 20, 2.8, 7);
  g.ellipse('outline', 26.2, 20, 2.8, 7);
  g.ellipse('coat', 14.5, 16, 9, 11.5);
  g.ellipse('belly', 15.5, 21, 7.2, 7.8);
  g.ellipse('bellyShade', 18.5, 24, 3.5, 4.5);
  g.ellipse('white', 11, 11, 4.5, 4.8); g.ellipse('white', 20, 11, 4.5, 4.8);
  g.ellipse('eye', 11, 11.5, 1.1, 1.7); g.ellipse('eye', 20, 11.5, 1.1, 1.7);
  g.circle('white', 10.7, 10.8, .4); g.circle('white', 19.7, 10.8, .4);
  g.polygon('beak', [[13, 14], [18, 14], [15.5, 17]]);
  g.ellipse('blush', 8, 15, 1.8, 1); g.ellipse('blush', 23, 15, 1.8, 1);
  g.rect('scarf', 7, 17, 24, 19); g.rect('scarf', 20, 18, 23, 25);
  g.rect('scarfShade', 22, 20, 23, 25);
  g.ellipse('beak', 10, 29, 4, 1.5); g.ellipse('beak', 21, 29, 4, 1.5);
  return g.cells;
}

function drawBlossom() {
  const g = new Grid('bg');
  g.rect('stem', 15, 16, 16, 30);
  g.ellipse('leafDark', 9.5, 25, 6, 2.8); g.ellipse('leaf', 21, 24, 6, 2.8);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    const x = CX + Math.cos(a) * 7.5, y = 14 + Math.sin(a) * 7.5;
    g.circle('petalEdge', x, y, 6.6);
    g.circle('petal', x - .3, y - .5, 5.5);
    g.circle('petalLight', x - 1, y - 1, 3.6);
  }
  g.circle('centerEdge', CX, 14, 5.3);
  g.circle('center', CX, 14, 4.2);
  g.circle('heart', CX, 14, 2.2);
  for (const [x, y] of [[13, 12], [18, 12], [12, 16], [19, 16]]) g.set('pollen', x, y);
  return g.cells;
}

function drawFox() {
  const g = new Grid('bg');
  g.ellipse('shadow', CX, 29, 12, 1);
  g.polygon('outline', [[3, 2], [12, 7], [20, 7], [28, 2], [28, 22], [16, 29], [3, 22]]);
  g.polygon('fur', [[4, 4], [12, 9], [20, 9], [27, 4], [26, 22], [16, 27], [5, 22]]);
  g.polygon('ear', [[5, 6], [10, 9], [6, 13]]); g.polygon('ear', [[26, 6], [21, 9], [25, 13]]);
  g.ellipse('furLight', 12, 15, 7, 6);
  g.polygon('cream', [[4, 17], [12, 19], [16, 23], [20, 19], [27, 17], [24, 24], [16, 28], [7, 24]]);
  g.polygon('creamShade', [[16, 25], [25, 21], [23, 25], [16, 28]]);
  g.ellipse('eye', 10.5, 16, 1.1, 1.7); g.ellipse('eye', 21, 16, 1.1, 1.7);
  g.set('shine', 10.5, 15.2); g.set('shine', 20.8, 15.2);
  g.polygon('nose', [[13.5, 22], [18, 22], [15.7, 24.4]]);
  g.rect('nose', 15.5, 24, 15.5, 25);
  g.ellipse('blush', 7.8, 19, 2, 1); g.ellipse('blush', 23.5, 19, 2, 1);
  return g.cells;
}

function drawRocket() {
  const g = new Grid('bg');
  for (const [x, y] of [[3, 6], [27, 4], [29, 16], [4, 23]]) {
    g.rect('star', x - 1, y, x + 1, y); g.rect('star', x, y - 1, x, y + 1);
  }
  g.polygon('flame', [[10, 22], [21, 22], [19, 29], [16, 31], [12, 29]]);
  g.polygon('flameInner', [[13, 23], [18, 23], [16, 29]]);
  g.polygon('outline', [[15.5, 1], [23, 9], [23, 24], [8, 24], [8, 9]]);
  g.polygon('hull', [[15.5, 3], [21, 10], [21, 22], [10, 22], [10, 10]]);
  g.rect('hullShade', 19, 10, 21, 22);
  g.polygon('red', [[15.5, 2.5], [21, 9], [10, 9]]);
  g.polygon('red', [[8, 16], [3, 25], [10, 23]]); g.polygon('red', [[23, 16], [28, 25], [21, 23]]);
  g.circle('rim', CX, 14.5, 5);
  g.circle('glass', CX, 14.5, 3.4);
  g.circle('glassLight', 14.2, 13.1, 1.5);
  g.rect('red', 12, 21, 19, 22);
  return g.cells;
}

function drawTreasure() {
  const g = new Grid('bg');
  g.ellipse('shadow', CX, 29, 14, 1.5);
  g.rect('outline', 2, 8, 29, 27);
  g.ellipse('outline', CX, 8, 13.5, 5.8);
  g.ellipse('woodLight', CX, 8, 12, 4.5);
  g.rect('wood', 4, 9, 27, 25);
  g.rect('woodDark', 4, 18, 27, 19); g.rect('woodDark', 4, 23, 27, 24);
  g.rect('goldDark', 6, 5, 8, 26); g.rect('goldDark', 23, 5, 25, 26);
  g.rect('gold', 6, 5, 7, 25); g.rect('gold', 23, 5, 24, 25);
  g.rect('goldDark', 3, 12, 28, 15); g.rect('gold', 3, 12, 28, 13);
  g.rect('outline', 11, 11, 20, 22); g.rect('gold', 12, 12, 19, 21);
  g.rect('goldLight', 13, 13, 18, 15);
  g.circle('gemEdge', CX, 17.5, 3.1); g.circle('gem', CX, 17, 1.8);
  g.set('shine', 15, 16);
  for (const [x, y] of [[4, 6], [28, 7], [4, 28], [27, 28]]) g.circle('goldLight', x, y, 1.1);
  return g.cells;
}

function drawOwl() {
  const g = new Grid('bg');
  g.rect('branch', 2, 28, 29, 30);
  g.ellipse('outline', CX, 16, 12, 13);
  g.polygon('outline', [[4, 2], [14, 6], [7, 12]]); g.polygon('outline', [[27, 2], [17, 6], [24, 12]]);
  g.ellipse('feather', CX, 16, 10.5, 11.5);
  g.ellipse('wing', 7, 20, 3.2, 7); g.ellipse('wing', 24, 20, 3.2, 7);
  g.ellipse('belly', CX, 21.5, 6.5, 5.8);
  for (const [x, y] of [[12, 21], [16, 23], [20, 21], [13, 25], [19, 25]]) g.polygon('bellyShade', [[x - 1, y], [x + 1, y], [x, y + 1.5]]);
  for (const x of [10.5, 20.5]) {
    g.circle('face', x, 12, 6); g.circle('eyeRim', x, 12, 4.3);
    g.circle('iris', x, 12, 3.1); g.circle('pupil', x, 12, 1.7); g.circle('shine', x - .7, 11, .7);
  }
  g.polygon('beak', [[13.5, 16], [17.5, 16], [15.5, 19.5]]);
  g.rect('beak', 10, 27, 12, 29); g.rect('beak', 19, 27, 21, 29);
  return g.cells;
}

function drawButterfly() {
  const g = new Grid('bg');
  for (const side of [-1, 1]) {
    const cx = CX + side * 7.5;
    g.ellipse('outline', cx, 11, 7.2, 9.5); g.ellipse('outline', cx + side * .4, 23, 6.5, 6.8);
    g.ellipse('wing', cx, 11, 6.1, 8.3); g.ellipse('wing', cx + side * .4, 23, 5.4, 5.7);
    g.ellipse('blue', cx, 11, 4.8, 6.7); g.ellipse('purple', cx + side * .4, 23, 4.1, 4.3);
    g.ellipse('pink', cx, 11, 3.3, 4.8); g.ellipse('pink', cx + side * .4, 23, 2.5, 2.8);
    g.ellipse('gold', cx, 11, 1.8, 2.7); g.circle('cream', cx, 10.5, .9);
    for (const y of [7, 12, 17]) g.set('cream', cx + side * 5.2, y);
  }
  g.ellipse('body', CX, 17, 1.5, 11);
  g.circle('outline', CX, 7, 2.1);
  g.polygon('outline', [[15, 7], [11, 2], [12, 1], [16, 7]]);
  g.polygon('outline', [[16, 7], [20, 2], [19, 1], [15, 7]]);
  return g.cells;
}

function drawCandyMaze() {
  const g = new Grid('bg');
  g.polygon('wrapper', [[1, 8], [8, 12], [8, 21], [1, 25], [3, 16]]);
  g.polygon('wrapper', [[30, 8], [23, 12], [23, 21], [30, 25], [28, 16]]);
  g.circle('outline', CX, 16, 13.5);
  for (const [key, radius] of [['white', 12.4], ['red', 11.2], ['cream', 9.6], ['orange', 8.2], ['white', 6.7], ['mint', 5.3], ['blue', 3.8], ['purple', 2.4], ['pink', 1.1]]) g.circle(key, CX, 16, radius);
  g.rect('pink', 14, 5, 16, 7); g.rect('mint', 24, 14, 26, 16);
  g.rect('gold', 6, 15, 8, 17);
  g.ellipse('shine', 10, 7, 2, .7);
  return g.cells;
}

function drawCrystal() {
  const g = new Grid('bg');
  g.ellipse('shadow', CX, 30, 10, .8);
  const shape = [[7, 2], [24, 2], [30, 12], [16, 30], [1, 12]];
  g.polygon('outline', shape);
  g.polygon('violet', [[8, 3.5], [23, 3.5], [28, 12], [16, 28], [3, 12]]);
  g.polygon('blue', [[8, 3.5], [23, 3.5], [19, 11], [12, 11]]);
  g.polygon('light', [[8, 3.5], [12, 11], [3, 12]]);
  g.polygon('pink', [[23, 3.5], [28, 12], [19, 11]]);
  g.polygon('deep', [[3, 12], [12, 11], [16, 28]]);
  g.polygon('cyan', [[28, 12], [19, 11], [16, 28]]);
  g.polygon('rim', [[12, 11], [19, 11], [16, 26]]);
  g.polygon('inner', [[13.5, 13], [17.5, 13], [16, 22]]);
  g.polygon('heart', [[14.5, 14], [16.5, 14], [16, 18]]);
  g.rect('shine', 9, 5, 12, 5);
  return g.cells;
}

function drawCastle() {
  const g = new Grid('bg');
  g.rect('grass', 1, 28, 30, 31);
  g.rect('outline', 3, 10, 10, 28); g.rect('outline', 21, 10, 28, 28);
  g.rect('stone', 4, 11, 9, 27); g.rect('stone', 22, 11, 27, 27);
  g.rect('outline', 9, 15, 22, 28); g.rect('stoneLight', 10, 16, 21, 27);
  for (let y = 18; y < 27; y += 3) {
    g.rect('mortar', 10, y, 21, y);
    for (let x = 11 + (y % 2 ? 2 : 0); x < 22; x += 5) g.rect('mortar', x, y - 2, x, y);
  }
  for (const x of [6.5, 24.5]) {
    g.polygon('roof', [[x, 3], [x - 5, 11], [x + 5, 11]]);
    g.polygon('roofLight', [[x, 3], [x - 5, 11], [x - 1, 11]]);
    g.rect('outline', x - 1, 14, x + 1, 18); g.rect('window', x - .5, 14.5, x + .5, 16.5);
    g.rect('gold', x, 1, x, 4); g.polygon('flag', [[x + .5, 1], [x + 4, 2], [x + .5, 3]]);
  }
  g.rect('outline', 11, 12, 13, 16); g.rect('outline', 18, 12, 20, 16);
  g.ellipse('outline', CX, 24, 4.5, 5.3);
  g.ellipse('door', CX, 24.5, 3.2, 4.2);
  g.rect('outline', 15.5, 21, 15.5, 28);
  g.rect('gold', 14, 24, 17, 24);
  g.circle('gem', 16, 24, .65);
  return g.cells;
}

export const PICTURE_DEFS = [
  {
    id: 'watermelon', name: 'すいか', icon: '🍉', draw: drawWatermelon,
    palette: { bg: '#c6e8e0', shadow: '#a7c9bb', rind: '#287651', rind3: '#44a969', rind2: '#a1d578', pith: '#fff4cc', red: '#f24e65', red2: '#ff7782', red3: '#ffb7b2', seed: '#48394d', hi: '#81607a' },
  },
  {
    id: 'cupcake', name: 'カップケーキ', icon: '🧁', draw: drawCupcake,
    palette: { bg: '#e9defb', shadow: '#cbbbe8', wrap: '#f2a65a', wrap2: '#d9822b', cream: '#ff8fab', cream2: '#ffc9d6', cream3: '#ec6f92', cherry: '#e5383b', cherry2: '#b5202f', sp1: '#4cc9f0', sp2: '#ffd60a', white: '#ffffff', leaf: '#3fb950' },
  },
  {
    id: 'chick', name: 'ひよこ', icon: '🐥', draw: drawChick,
    palette: { bg: '#b9e6ff', grass: '#6bcb77', grass2: '#46a757', shadow: '#4f9e5b', yel: '#ffd93d', yel2: '#fff0a0', yel3: '#f0b90a', wing: '#f5b800', black: '#2b2b3a', white: '#ffffff', orange: '#ff8c2b', orange2: '#e86a10', blush: '#ff9aa8' },
  },
  {
    id: 'strawberry', name: 'いちご', icon: '🍓', draw: drawStrawberry,
    palette: { bg: '#ffe1ea', shadow: '#f0bccb', red: '#e8344e', red2: '#fb5b70', dark: '#b5162f', hi: '#ffb3be', seed: '#ffe27a', leaf: '#3fb950', leaf2: '#237a35' },
  },
  {
    id: 'rainbow', name: 'にじ', icon: '🌈', draw: drawRainbow,
    palette: { bg: '#d6efff', white: '#ffffff', cloud2: '#e3f1fb', sun2: '#fff3a0', r: '#ff4d4d', o: '#ff9f1c', y: '#ffe14d', g: '#4cd964', b: '#3a9bff', p: '#9b5de5' },
  },
  {
    id: 'mushroom', name: 'きのこ', icon: '🍄', draw: drawMushroom,
    palette: { bg: '#bfe9ff', grass: '#5bbf5b', grass2: '#3f9c47', cap: '#e63946', cap2: '#b5202f', cap3: '#ff6b76', spot: '#ffffff', stem: '#fff1d6', stem2: '#e8cfa6', black: '#2b2b3a', blush: '#ff9aa8' },
  },
  { id: 'donut', name: 'いちごドーナツ', icon: '🍩', draw: drawDonut,
    palette: { bg: '#e4f2dd', shadow: '#bed8b4', crust: '#b97a47', dough: '#efbd7b', icing: '#f384aa', shade: '#d96296', hole: '#a96249', inner: '#da9d65', shine: '#ffd8e7', yellow: '#ffe393', blue: '#82cee1', white: '#fff5ec' } },
  { id: 'ice-cream', name: 'トリプルアイス', icon: '🍨', draw: drawIceCream,
    palette: { bg: '#dceefa', shadow: '#b8cddc', cone: '#e5b477', coneDark: '#bb8451', waffle: '#c9965c', mint: '#98dac2', mintDark: '#66b39e', pink: '#f6a6bb', pinkDark: '#df7f9f', cream: '#fff2ca', creamShade: '#e9d9a8', cherry: '#db5264', shine: '#fffbed', chip: '#655054' } },
  { id: 'penguin', name: 'マフラーペンギン', icon: '🐧', draw: drawPenguin,
    palette: { bg: '#d6e9f3', ice: '#aacddc', outline: '#354c69', coat: '#4d6a88', belly: '#f5f5df', bellyShade: '#d3e0d6', white: '#fffdf0', eye: '#26374d', beak: '#efb75b', blush: '#f3b1b5', scarf: '#df7087', scarfShade: '#b94c6c' } },
  { id: 'blossom', name: 'さくらの花', icon: '🌸', draw: drawBlossom,
    palette: { bg: '#e2efd9', stem: '#5e9e6f', leaf: '#86be7d', leafDark: '#598c63', petalEdge: '#d980a4', petal: '#f1b4cb', petalLight: '#ffdae5', centerEdge: '#e9aa76', center: '#f7d58e', heart: '#e6ae62', pollen: '#fff3c1' } },
  { id: 'fox', name: 'こぎつね', icon: '🦊', draw: drawFox,
    palette: { bg: '#e7e3f3', shadow: '#c5bdd8', outline: '#914d39', fur: '#e6a259', furLight: '#f5bd77', ear: '#cc7964', cream: '#fff0ce', creamShade: '#e8cca2', eye: '#493942', shine: '#fff9e9', nose: '#5e4142', blush: '#edb0a0' } },
  { id: 'rocket', name: 'おほしさまロケット', icon: '🚀', draw: drawRocket,
    palette: { bg: '#cbd7ed', star: '#fff2ba', flame: '#efa55c', flameInner: '#ffe6a0', outline: '#697798', hull: '#f4f2de', hullShade: '#c5d2d9', red: '#d97588', rim: '#d9b56d', glass: '#74b7d2', glassLight: '#b9e6e6' } },
  { id: 'treasure', name: 'ひみつの宝箱', icon: '💰', draw: drawTreasure,
    palette: { bg: '#dae9e1', shadow: '#b1ccc1', outline: '#664a48', woodLight: '#cd9468', wood: '#b67c57', woodDark: '#8f5c49', goldDark: '#bc8e48', gold: '#edc874', goldLight: '#fff0b2', gemEdge: '#5b4b77', gem: '#bd8acb', shine: '#fff5e8' } },
  { id: 'owl', name: '森のふくろう', icon: '🦉', draw: drawOwl,
    palette: { bg: '#dcebdd', branch: '#98714d', outline: '#755345', feather: '#bc946d', wing: '#a67c58', belly: '#ead5ac', bellyShade: '#c8aa7c', face: '#f1e4c3', eyeRim: '#bc9767', iris: '#9eb6aa', pupil: '#3e4d51', shine: '#fff9df', beak: '#e4b466' } },
  { id: 'butterfly', name: '宝石のちょうちょ', icon: '🦋', draw: drawButterfly,
    palette: { bg: '#f2e6e7', outline: '#5c5374', wing: '#89b4cd', blue: '#96cdd8', purple: '#b09bd1', pink: '#e5acce', gold: '#ecd291', cream: '#fff0d6', body: '#8c7595' } },
  { id: 'candy-maze', name: 'キャンディ迷宮', icon: '🍬', draw: drawCandyMaze,
    palette: { bg: '#dbe9ef', wrapper: '#b6a0cf', outline: '#8b769b', white: '#fff6e4', red: '#df8191', cream: '#f5debb', orange: '#eab27d', mint: '#8ac5aa', blue: '#83b7cd', purple: '#b398ce', pink: '#e7adcd', gold: '#ead491', shine: '#fffced' } },
  { id: 'crystal', name: 'まほうのクリスタル', icon: '💎', draw: drawCrystal,
    palette: { bg: '#e5e8f4', shadow: '#c8cbe0', outline: '#76709e', violet: '#ad9cd3', blue: '#9cbedf', light: '#d2e4f0', pink: '#ddbedf', deep: '#9083bb', cyan: '#9bd5d4', rim: '#6e8eaf', inner: '#a7c1c7', heart: '#efe1be', shine: '#fff7e9' } },
  { id: 'castle', name: '星あかりのお城', icon: '🏰', draw: drawCastle,
    palette: { bg: '#d7e3ed', grass: '#a5bc96', outline: '#7b7a93', stone: '#c9ced6', stoneLight: '#e4dfd8', mortar: '#b6b4c4', roof: '#a790bd', roofLight: '#c2a9cc', window: '#edcf91', gold: '#d6b474', flag: '#df9eae', door: '#a9a2b9', gem: '#8dbcc6' } },
];

// Lighting/outline variants belong to the same food color. Keep their original hex for the art.
// Explicit groups avoid merging unrelated colors merely because their RGB values happen to be close.
const COLOR_FAMILIES = {
  watermelon: { rind2: 'rind', rind3: 'rind', red2: 'red', red3: 'red', hi: 'seed' },
  cupcake: { wrap2: 'wrap', cream2: 'cream', cream3: 'cream', cherry2: 'cherry' },
  chick: { grass2: 'grass', shadow: 'grass', yel2: 'yel', yel3: 'yel', wing: 'yel', orange2: 'orange' },
  strawberry: { red2: 'red', dark: 'red', hi: 'red', leaf2: 'leaf' },
  rainbow: { cloud2: 'white' },
  mushroom: { grass2: 'grass', cap2: 'cap', cap3: 'cap', stem2: 'stem' },
  donut: { hole: 'crust', inner: 'dough', shade: 'icing', shine: 'icing' },
  'ice-cream': { coneDark: 'cone', waffle: 'cone', mintDark: 'mint', pinkDark: 'pink', creamShade: 'cream', shine: 'cream' },
  penguin: { coat: 'outline', eye: 'outline', bellyShade: 'belly', white: 'belly', scarfShade: 'scarf' },
  blossom: { leaf: 'stem', leafDark: 'stem', petalEdge: 'petal', petalLight: 'petal', centerEdge: 'center', heart: 'center', pollen: 'center' },
  fox: { furLight: 'fur', ear: 'fur', creamShade: 'cream', shine: 'cream', nose: 'eye' },
  rocket: { flameInner: 'flame', hullShade: 'hull', glassLight: 'glass' },
  treasure: { outline: 'wood', woodLight: 'wood', woodDark: 'wood', goldDark: 'gold', goldLight: 'gold', gemEdge: 'gem' },
  owl: { branch: 'feather', outline: 'feather', wing: 'feather', eyeRim: 'feather', bellyShade: 'belly', face: 'belly' },
  butterfly: { blue: 'wing', body: 'outline' },
  'candy-maze': { purple: 'wrapper', cream: 'white', shine: 'white', pink: 'red' },
  crystal: { deep: 'violet', cyan: 'blue', inner: 'blue', light: 'blue', shine: 'blue', rim: 'outline' },
  castle: { outline: 'stone', stoneLight: 'stone', mortar: 'stone', door: 'stone', roofLight: 'roof' },
};

/** 定義からピクセルを作る。paintKey/hex は陰影、key は食べられる色のグループ。 */
export function buildPicture(def) {
  const cells = def.draw();
  const families = COLOR_FAMILIES[def.id] || {};
  const pixels = cells.map((paintKey, i) => {
    const key = families[paintKey] || paintKey;
    const isBg = key === 'bg';
    return {
      gx: i % SIZE,
      gy: Math.floor(i / SIZE),
      key,
      paintKey,
      hex: def.palette[paintKey],
      isBg,
      eaten: isBg, // 背景は最初から食べられている扱い（枠外と同じ）
    };
  });
  return { id: def.id, name: def.name, icon: def.icon, palette: def.palette, pixels };
}

export function countByKey(pixels) {
  const counts = {};
  for (const p of pixels) {
    if (!p.isBg) {
      counts[p.key] = (counts[p.key] || 0) + 1;
    }
  }
  return counts;
}

/** 絵を canvas に描く（クリア画面のサムネイル用） */
export function paintPicture(ctx, picture, x, y, cell) {
  for (const p of picture.pixels) {
    ctx.fillStyle = p.hex;
    ctx.fillRect(x + p.gx * cell, y + p.gy * cell, cell, cell);
  }
}
