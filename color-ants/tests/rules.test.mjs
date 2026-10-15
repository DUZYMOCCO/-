import test from 'node:test';
import assert from 'node:assert/strict';
import { PICTURE_DEFS, buildPicture, countByKey, SIZE } from '../js/pictures.js';
import { mulberry32, splitCount, buildTiles, textColorFor } from '../js/puzzle.js';
import { Colony } from '../js/colony.js';

test('every picture is a full 32x32 grid with known palette keys', () => {
  for (const def of PICTURE_DEFS) {
    const pic = buildPicture(def);
    assert.equal(pic.pixels.length, SIZE * SIZE, def.id);
    assert.ok(Object.keys(def.palette).length <= 10, `${def.id} palette size`);
    for (const p of pic.pixels) {
      assert.ok(p.hex, `${def.id}: unknown key ${p.key}`);
      assert.equal(p.eaten, false);
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

test('buildTiles: per-color tile numbers sum to the pixel count, within 25 tiles / 5 columns', () => {
  for (const def of PICTURE_DEFS) {
    const counts = countByKey(buildPicture(def).pixels);
    const columns = buildTiles(counts, mulberry32(42), { cols: 5 });
    assert.equal(columns.length, 5);
    const sums = {};
    let tiles = 0;
    for (const col of columns) for (const t of col) { sums[t.key] = (sums[t.key] || 0) + t.n; tiles++; }
    assert.deepEqual(sums, counts, def.id);
    assert.ok(tiles <= 25, `${def.id} has ${tiles} tiles`);
    assert.ok(Math.max(...columns.map(c => c.length)) <= 5);
  }
});

test('textColorFor picks dark text on light colors and white on dark colors', () => {
  assert.equal(textColorFor('#ffffff'), '#3b2a1a');
  assert.equal(textColorFor('#1f7a3a'), '#ffffff');
});

test('ants eat the whole picture once every tile is deployed', () => {
  const pic = buildPicture(PICTURE_DEFS[0]);
  const rng = mulberry32(7);
  const colony = new Colony();
  colony.reset(pic, rng);
  colony.setLayout({ cell: 10, boardX: 20, boardY: 14, nest: { x: 180, y: 400 } });
  const columns = buildTiles(countByKey(pic.pixels), rng, { cols: 5 });
  for (const col of columns) for (const t of col) colony.deploy(t.key, pic.palette[t.key], t.n);

  let steps = 0;
  while ((colony.busy || colony.remaining > 0) && steps < 20000) { colony.update(0.05, 2); steps++; }

  assert.equal(colony.remaining, 0);
  assert.equal(colony.busy, false);
  assert.ok(pic.pixels.every(p => p.eaten));
});

test('an ant only ever takes a pixel of its own color', () => {
  const pic = buildPicture(PICTURE_DEFS[1]);
  const colony = new Colony();
  colony.reset(pic, mulberry32(3));
  colony.setLayout({ cell: 10, boardX: 20, boardY: 14, nest: { x: 180, y: 400 } });
  colony.deploy('cherry', pic.palette.cherry, 5);
  for (let i = 0; i < 400; i++) colony.update(0.05, 2);
  const eatenKeys = new Set(pic.pixels.filter(p => p.eaten).map(p => p.key));
  assert.deepEqual([...eatenKeys], ['cherry']);
});
