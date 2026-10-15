import test from 'node:test';
import assert from 'node:assert/strict';
import { PICTURE_DEFS, buildPicture, countByKey, SIZE } from '../js/pictures.js';
import { mulberry32, splitCount, buildTiles, textColorFor } from '../js/puzzle.js';
import { Colony } from '../js/colony.js';

const LAYOUT = { cell: 5, boardX: 20, boardY: 14, nest: { x: 180, y: 420 }, ant: 7, speed: 100 };

test('every picture is a full 64x64 grid with known palette keys', () => {
  assert.equal(SIZE, 64);
  for (const def of PICTURE_DEFS) {
    const pic = buildPicture(def);
    assert.equal(pic.pixels.length, SIZE * SIZE, def.id);
    assert.ok(Object.keys(def.palette).length <= 14, `${def.id} palette size`);
    for (const p of pic.pixels) {
      assert.ok(p.hex, `${def.id}: unknown key ${p.key}`);
      assert.equal(p.eaten, false);
    }
  }
});

test('splitCount keeps the total and every part is at least 1', () => {
  const rng = mulberry32(1);
  for (const [total, parts, ] of [[100, 3], [7, 7], [400, 9], [5, 1]]) {
    const out = splitCount(total, parts, rng);
    assert.equal(out.length, parts);
    assert.equal(out.reduce((a, b) => a + b, 0), total);
    assert.ok(out.every(n => n >= 1));
  }
});

test('buildTiles: per-color tile numbers sum to the pixel count, within 30 tiles / 6 rows', () => {
  for (const def of PICTURE_DEFS) {
    const counts = countByKey(buildPicture(def).pixels);
    const columns = buildTiles(counts, mulberry32(42), { cols: 5 });
    assert.equal(columns.length, 5);
    const sums = {};
    let tiles = 0;
    for (const col of columns) for (const t of col) { sums[t.key] = (sums[t.key] || 0) + t.n; tiles++; }
    assert.deepEqual(sums, counts, def.id);
    assert.ok(tiles <= 30, `${def.id} has ${tiles} tiles`);
    assert.ok(Math.max(...columns.map(c => c.length)) <= 6);
  }
});

test('textColorFor picks dark text on light colors and white on dark colors', () => {
  assert.equal(textColorFor('#ffffff'), '#3b2a1a');
  assert.equal(textColorFor('#1f7a3a'), '#ffffff');
});

test('ants eat the whole picture once every tile is deployed, and the delivered count reaches the total', () => {
  const pic = buildPicture(PICTURE_DEFS[0]);
  const rng = mulberry32(7);
  const colony = new Colony();
  colony.reset(pic, rng);
  colony.setLayout(LAYOUT);
  const columns = buildTiles(countByKey(pic.pixels), rng, { cols: 5 });
  for (const col of columns) for (const t of col) colony.deploy(t.key, pic.palette[t.key], t.n);

  let steps = 0;
  while (colony.delivered < colony.total && steps < 40000) { colony.update(0.05, 2); steps++; }

  assert.equal(colony.delivered, colony.total);
  assert.equal(colony.remaining, 0);
  assert.equal(colony.busy, false);
  assert.ok(pic.pixels.every(p => p.eaten));
});

test('a deployed tile counts down as ants leave one at a time (not instantly)', () => {
  const pic = buildPicture(PICTURE_DEFS[1]);
  const colony = new Colony();
  colony.reset(pic, mulberry32(5));
  colony.setLayout(LAYOUT);
  const s = colony.deploy('cherry', pic.palette.cherry, 20);
  assert.equal(s.left, 20);
  colony.update(0.1, 1);
  assert.ok(s.left < 20 && s.left > 0, `left=${s.left} after 0.1s`);
  const seen = new Set();
  for (let i = 0; i < 60; i++) { colony.update(0.05, 1); seen.add(s.left); }
  assert.ok(seen.size > 5, 'number should tick down gradually');
  assert.equal(s.left, 0);
});

test('an ant only ever takes a pixel of its own color', () => {
  const pic = buildPicture(PICTURE_DEFS[1]);
  const colony = new Colony();
  colony.reset(pic, mulberry32(3));
  colony.setLayout(LAYOUT);
  colony.deploy('cherry', pic.palette.cherry, 5);
  for (let i = 0; i < 600; i++) colony.update(0.05, 2);
  const eatenKeys = new Set(pic.pixels.filter(p => p.eaten).map(p => p.key));
  assert.deepEqual([...eatenKeys], ['cherry']);
});
