import test from 'node:test';
import assert from 'node:assert/strict';
import { PICTURE_DEFS, buildPicture, countByKey, SIZE } from '../js/pictures.js';
import { mulberry32, splitCount, buildTiles, textColorFor } from '../js/puzzle.js';
import { Colony } from '../js/colony.js';

const LAYOUT = { cell: 5, boardX: 20, boardY: 14, nest: { x: 180, y: 420 }, ant: 7, speed: 100 };

test('every picture is a full 64x64 grid with known palette keys and bg marked eaten', () => {
  assert.equal(SIZE, 64);
  for (const def of PICTURE_DEFS) {
    const pic = buildPicture(def);
    assert.equal(pic.pixels.length, SIZE * SIZE, def.id);
    assert.ok(Object.keys(def.palette).length <= 14, `${def.id} palette size`);
    for (const p of pic.pixels) {
      assert.ok(p.hex, `${def.id}: unknown key ${p.key}`);
      if (p.isBg) {
        assert.equal(p.eaten, true, `${def.id}: bg should be marked eaten`);
      } else {
        assert.equal(p.eaten, false, `${def.id}: motif should not be eaten initially`);
      }
    }
  }
});

test('splitCount keeps the total and every part is at least 1', () => {
  const rng = mulberry32(1);
  for (const [total, parts] of [[100, 3], [7, 7], [400, 9], [5, 1]]) {
    const out = splitCount(total, parts, rng);
    assert.equal(out.length, parts);
    assert.equal(out.reduce((a, b) => a + b, 0), total);
    assert.ok(out.every(n => n >= 1));
  }
});

test('buildTiles: per-color tile numbers sum to pixel count, each tile is small (<= 45)', () => {
  for (const def of PICTURE_DEFS) {
    const pic = buildPicture(def);
    const counts = countByKey(pic.pixels);
    const columns = buildTiles(counts, mulberry32(42), { cols: 5, pixels: pic.pixels });
    assert.equal(columns.length, 5);
    const sums = {};
    let totalTiles = 0;
    for (const col of columns) {
      for (const t of col) {
        sums[t.key] = (sums[t.key] || 0) + t.n;
        assert.ok(t.n >= 1 && t.n <= 45, `${def.id} tile size ${t.n} exceeds expected range`);
        totalTiles++;
      }
    }
    assert.deepEqual(sums, counts, def.id);
    assert.ok(totalTiles >= 50, `${def.id} should have enough tiles for small chunks`);
  }
});

test('textColorFor picks dark text on light colors and white on dark colors', () => {
  assert.equal(textColorFor('#ffffff'), '#3b2a1a');
  assert.equal(textColorFor('#1f7a3a'), '#ffffff');
});

test('outer-exposure rule: inner pixels are not exposed until outer pixels are eaten', () => {
  const pic = buildPicture(PICTURE_DEFS[0]); // watermelon
  const colony = new Colony();
  colony.reset(pic, mulberry32(1));

  // rind（外側の皮）は露出している
  const rindPixels = pic.pixels.filter(p => p.key === 'rind');
  assert.ok(rindPixels.some(p => colony.isExposed(p)), 'rind should have exposed pixels');

  // seed（スイカの種）は内部にあるので最初は1つも露出していない
  const seedPixels = pic.pixels.filter(p => p.key === 'seed');
  assert.ok(seedPixels.length > 0, 'watermelon has seeds');
  assert.ok(seedPixels.every(p => !colony.isExposed(p)), 'no seeds should be exposed at start');

  // 種の周りのピクセルを食べられた扱いにすると、種が露出する
  const seed = seedPixels[0];
  const { gx, gy } = seed;
  colony.grid[gy * SIZE + (gx - 1)].eaten = true;
  assert.equal(colony.isExposed(seed), true, 'seed is exposed once adjacent pixel is eaten');
});

test('5 slots dispatch system and stuck detection', () => {
  const pic = buildPicture(PICTURE_DEFS[0]);
  const colony = new Colony();
  colony.reset(pic, mulberry32(1));
  colony.setLayout(LAYOUT);

  // 5スロットまで追加できる
  for (let i = 0; i < 5; i++) {
    const idx = colony.addTileToSlot({ key: 'rind', n: 10 }, '#1f7a3a');
    assert.equal(idx, i);
  }
  // 6個目は満杯で -1
  const fullIdx = colony.addTileToSlot({ key: 'rind', n: 10 }, '#1f7a3a');
  assert.equal(fullIdx, -1);

  // 待機中スロットのキャンセル
  const cancelled = colony.cancelSlot(4);
  assert.ok(cancelled);
  assert.equal(colony.slots[4], null);

  // 詰み判定テスト: 5スロットすべてに「露出していない色（seed）」を入れる
  colony.reset(pic, mulberry32(2));
  for (let i = 0; i < 5; i++) {
    colony.addTileToSlot({ key: 'seed', n: 10 }, '#2b2230');
  }
  // seed は露出していないので出撃できず、詰み（isStuck = true）になる
  assert.equal(colony.isStuck(), true);
});

test('deployed tiles count down as ants leave one at a time and clear exposed pixels', () => {
  const pic = buildPicture(PICTURE_DEFS[0]);
  const colony = new Colony();
  colony.reset(pic, mulberry32(5));
  colony.setLayout(LAYOUT);

  // rind は外側に露出しているので出撃できる
  const s = colony.deploy('rind', pic.palette.rind, 20);
  assert.equal(s.left, 20);

  // 時間を進めると1匹ずつ出撃してカウントが減る
  colony.update(0.1, 1);
  assert.ok(s.left < 20 && s.left >= 0, `left=${s.left} after 0.1s`);

  let steps = 0;
  while (s.left > 0 && steps < 100) {
    colony.update(0.05, 1);
    steps++;
  }
  assert.equal(s.left, 0);
});
