import test from 'node:test';
import assert from 'node:assert/strict';
import { PICTURE_DEFS, buildPicture, countByKey, SIZE } from '../js/pictures.js';
import { mulberry32, splitCount, buildTiles, textColorFor, verifyTilePlan, SOLUTION_LAYOUT, difficultyFor } from '../js/puzzle.js';
import { Colony } from '../js/colony.js';

const LAYOUT = { cell: 5, boardX: 20, boardY: 14, nest: { x: 180, y: 420 }, ant: 7, speed: 100 };

test('every picture is a full 64x64 grid with known palette keys and bg marked eaten', () => {
  assert.equal(SIZE, 64);
  assert.equal(PICTURE_DEFS.length, 18);
  assert.equal(new Set(PICTURE_DEFS.map(p => p.id)).size, 18, 'each new picture has its own stage');
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

  // An isolated eaten cell is an interior hole, not part of the exterior.
  const seed = seedPixels[0];
  const { gx, gy } = seed;
  colony.grid[gy * SIZE + (gx - 1)].eaten = true;
  colony.perimeterDirty = true;
  assert.equal(colony.isExposed(seed), false, 'a closed interior hole must not expose seeds');
  // Only a four-connected passage from outside opens the inner color.
  for (let x = 0; x < gx; x++) colony.grid[gy * SIZE + x].eaten = true;
  colony.perimeterDirty = true;
  assert.equal(colony.isExposed(seed), true, 'seed becomes exposed after opening a passage to outside');
});

function blockedPicture() {
  const pixels = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const gx = i % SIZE, gy = Math.floor(i / SIZE);
    const isBg = gx < 14 || gx > 49 || gy < 10 || gy > 49;
    const key = isBg ? 'bg' : gy < 13 ? 'red' : 'blue';
    return { gx, gy, key, hex: key === 'red' ? '#ef4056' : '#3a9bff', isBg, eaten: isBg };
  });
  return { pixels };
}

test('closed background pockets and diagonal gaps do not expose the inner perimeter', () => {
  const pic = blockedPicture(), at = (x, y) => pic.pixels[y * SIZE + x];
  at(30, 30).eaten = true; at(30, 30).isBg = true;
  const colony = new Colony(); colony.reset(pic);
  assert.equal(colony.isExposed(at(31, 30)), false, 'enclosed background is not outside');
  // A diagonal string of holes cannot carry an ant through solid corners.
  for (let n = 0; n < 18; n++) at(30 - n, 30 - n).eaten = true;
  colony.perimeterDirty = true;
  assert.equal(colony.isExposed(at(31, 30)), false, 'diagonal gaps do not form a passage');
  for (let x = 13; x <= 30; x++) at(x, 30).eaten = true;
  colony.perimeterDirty = true;
  assert.equal(colony.isExposed(at(31, 30)), true);
});

test('inner-color slots wait, then resume automatically when the outer shell is eaten', () => {
  const pic = blockedPicture();
  for (const p of pic.pixels) {
    p.isBg = p.gx < 28 || p.gx > 34 || p.gy < 28 || p.gy > 34;
    p.eaten = p.isBg;
    p.key = p.gx >= 30 && p.gx <= 32 && p.gy >= 30 && p.gy <= 32 ? 'red' : 'blue';
  }
  const colony = new Colony(); colony.reset(pic); colony.setLayout(LAYOUT);
  const inner = colony.deploy('red', '#ef4056', 9);
  for (let i = 0; i < 120; i++) colony.update(1 / 30, 2);
  assert.equal(inner.left, 9); assert.equal(colony.ants.length, 0);
  assert(pic.pixels.filter(p => p.key === 'red').every(p => !p.eaten));
  colony.deploy('blue', '#3a9bff', 40);
  for (let i = 0; i < 15000 && colony.busy; i++) colony.update(1 / 30, 2);
  assert.equal(colony.delivered, 49);
  assert.equal(colony.busy, false);
});

test('resizing preserves grid positions of ants on reserved exterior routes', () => {
  const colony = new Colony(); colony.reset(blockedPicture()); colony.setLayout(LAYOUT);
  colony.deploy('red', '#ef4056', 12);
  for (let i = 0; i < 80; i++) colony.update(1 / 30);
  assert(colony.ants.length > 0);
  const before = colony.ants.map(a => ({ x: (a.x - LAYOUT.boardX) / LAYOUT.cell, y: (a.y - LAYOUT.boardY) / LAYOUT.cell }));
  const next = { ...LAYOUT, cell: 3, boardX: 45, boardY: 25 };
  colony.setLayout(next);
  colony.ants.forEach((a, i) => {
    assert(Math.abs((a.x - next.boardX) / next.cell - before[i].x) < 1e-8);
    assert(Math.abs((a.y - next.boardY) / next.cell - before[i].y) < 1e-8);
  });
});

test('ants walk around other colors and return through open passages', () => {
  const colony = new Colony(); colony.reset(blockedPicture()); colony.setLayout(LAYOUT);
  colony.deploy('red', '#ef4056', 12);
  let sawDetour = false;
  for (let step = 0; step < 1200 && (step === 0 || colony.busy); step++) {
    colony.update(1 / 30, 2);
    for (const ant of colony.ants) {
      if (ant.route.some(p => p.gx < 14 || p.gx > 49)) sawDetour = true;
      for (const p of ant.route.slice(0, -1)) {
        if (p.gx < 0 || p.gx >= SIZE || p.gy < 0 || p.gy >= SIZE) continue;
        assert(colony.grid[p.gy * SIZE + p.gx].eaten, 'reserved route must stay in open air');
      }
      const gx = Math.floor((ant.x - LAYOUT.boardX) / LAYOUT.cell);
      const gy = Math.floor((ant.y - LAYOUT.boardY) / LAYOUT.cell);
      if (gx < 0 || gx >= SIZE || gy < 0 || gy >= SIZE) continue;
      const p = colony.grid[gy * SIZE + gx];
      assert(p.eaten || p === ant.px, `ant crossed uneaten ${p.key} at ${gx},${gy}`);
    }
  }
  assert(sawDetour, 'upper red pixels require walking around the blue body');
  assert.equal(colony.delivered, 12);
  assert.equal(colony.busy, false);
});

test('fresh puzzles have a real outside-in winning sequence without boosters at both speeds', () => {
  for (let level = 1; level <= PICTURE_DEFS.length * 2; level++) {
    const pic = buildPicture(PICTURE_DEFS[(level - 1) % PICTURE_DEFS.length]);
    const columns = buildTiles(countByKey(pic.pixels), mulberry32(level * 7919 + 13), { pixels: pic.pixels, level });
    const plan = columns.flat().sort((a, b) => a.order - b.order);
    const queues = columns.map(col => col.slice());
    for (const tile of plan) {
      const ci = queues.findIndex(col => col[0] === tile);
      assert(ci >= 0, `level ${level}: required tile is buried`); queues[ci].shift();
      if (tile.locked) assert(plan.some(t => t.hasKey && t.keyId === tile.lockId && t.order < tile.order), 'key must precede its lock');
    }
    assert(verifyTilePlan(pic.pixels, plan, SOLUTION_LAYOUT, 1 / 60, 1, difficultyFor(level).slots), `level ${level}: 1x solution failed`);
    const farNests = { ...SOLUTION_LAYOUT, nests: SOLUTION_LAYOUT.nests.map(n => ({ ...n, y: 98 })) };
    assert(verifyTilePlan(pic.pixels, plan, farNests, 1 / 20, 2, difficultyFor(level).slots), `level ${level}: 2x solution failed`);
    assert(pic.pixels.every(p => p.eaten === p.isBg), 'generator must not eat the live board');
  }
});

test('advanced stages increase planning depth and lock dependencies without shrinking slots below three', () => {
  const middle = difficultyFor(7), hard = difficultyFor(13), expert = difficultyFor(25);
  assert.equal(hard.slots, 3); assert.equal(expert.slots, 3);
  assert(hard.decoyDepth > middle.decoyDepth && expert.decoyDepth > hard.decoyDepth);
  assert(hard.hiddenDepth < middle.hiddenDepth);
  for (const level of [13, 18, 25, 36]) {
    const pic = buildPicture(PICTURE_DEFS[(level - 1) % PICTURE_DEFS.length]);
    const tiles = buildTiles(countByKey(pic.pixels), mulberry32(level), { pixels: pic.pixels, level }).flat();
    assert.equal(tiles.filter(t => t.locked).length, difficultyFor(level).lockPairs);
    for (const t of tiles.filter(t => t.locked)) {
      assert(tiles.some(k => k.hasKey && k.keyId === t.lockId && k.order < t.order));
    }
  }
  for (let level = 13; level <= 18; level++) {
    const pic = buildPicture(PICTURE_DEFS[level - 1]);
    const c = new Colony(); c.reset(pic, Math.random, { slotCount: 3, maxSlots: 4 });
    const cols = buildTiles(countByKey(pic.pixels), mulberry32(level * 7919 + 13), { pixels: pic.pixels, level });
    for (let move = 0; move < 3; move++) {
      const ci = cols.findIndex(col => col[0] && !col[0].locked && !pic.pixels.some(p => p.key === col[0].key && c.isExposed(p)));
      assert(ci >= 0, `${pic.id}: needs meaningful inner-color choices`);
      const t = cols[ci].shift(); c.addTileToSlot(t, pic.palette[t.key], ci);
    }
    assert(c.isStuck(), `${pic.id}: blindly filling the three slots should lose`);
  }
});

test('limited slots and consecutive inner-color choices create real losing positions', () => {
  let stuckStages = 0;
  for (let level = 1; level <= 12; level++) {
    const pic = buildPicture(PICTURE_DEFS[(level - 1) % 6]), d = difficultyFor(level);
    const c = new Colony(); c.reset(pic, Math.random, { slotCount: d.slots, maxSlots: d.slots + 1 });
    assert.equal(c.slots.length, level >= 7 ? 3 : 4);
    const cols = buildTiles(countByKey(pic.pixels), mulberry32(level * 7919 + 13), { pixels: pic.pixels, level });
    while (c.slots.some(s => s === null)) {
      const ci = cols.findIndex(col => col[0] && !col[0].locked &&
        !pic.pixels.some(p => p.key === col[0].key && c.isExposed(p)));
      if (ci < 0) break;
      const t = cols[ci].shift(); c.addTileToSlot(t, pic.palette[t.key], ci);
    }
    if (c.isStuck()) stuckStages++;
    assert.equal(c.expandSlots(), true);
    assert.equal(c.expandSlots(), false, 'extra slot is limited to one');
    assert.equal(c.isStuck(), false, 'one extra slot frees a real losing position');
  }
  assert(stuckStages >= 10, `only ${stuckStages}/12 stages punish filling slots with inner colors`);
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

test('boosters: expandSlots adds 6th slot, useMagnet sweeps exposed layer', () => {
  const pic = buildPicture(PICTURE_DEFS[0]);
  const colony = new Colony();
  colony.reset(pic, mulberry32(1));
  colony.setLayout(LAYOUT);

  assert.equal(colony.slots.length, 5);
  assert.equal(colony.expandSlots(), true);
  assert.equal(colony.slots.length, 6);
  assert.equal(colony.expandSlots(), false); // 6が上限

  // マグネット使用
  const initialDelivered = colony.delivered;
  const res = colony.useMagnet();
  assert.ok(res && res.count > 0, 'magnet should harvest exposed pixels');
  assert.equal(colony.delivered, initialDelivered + res.count);
  assert.ok(colony.crumbs.some(c => c.isStar), 'magnet should spawn star particles');
});

test('puzzle gimmicks: level >= 2 adds locked tile and key tile', () => {
  const pic = buildPicture(PICTURE_DEFS[0]);
  const counts = countByKey(pic.pixels);

  // level 1: 鍵もロックもなし
  const colsL1 = buildTiles(counts, mulberry32(1), { cols: 5, pixels: pic.pixels, level: 1 });
  const allL1 = colsL1.flat();
  assert.ok(allL1.every(t => !t.locked && !t.hasKey), 'level 1 should not have locks or keys');

  // level 2: 1対の鍵と南京錠が存在する
  const colsL2 = buildTiles(counts, mulberry32(1), { cols: 5, pixels: pic.pixels, level: 2 });
  const allL2 = colsL2.flat();
  const lockedTiles = allL2.filter(t => t.locked);
  const keyTiles = allL2.filter(t => t.hasKey);
  assert.equal(lockedTiles.length, 1, 'level 2 should have 1 locked tile');
  assert.equal(keyTiles.length, 1, 'level 2 should have 1 key tile');
});

test('magnet debit spans matching slots and reports only the queued remainder', () => {
  const pic = buildPicture(PICTURE_DEFS[0]), probe = new Colony(); probe.reset(pic);
  const key = probe.useMagnet().key;
  const colony = new Colony(); colony.reset(buildPicture(PICTURE_DEFS[0]));
  colony.deploy(key, pic.palette[key], 3); colony.deploy(key, pic.palette[key], 4);
  const res = colony.useMagnet();
  assert.equal(res.key, key);
  assert(res.count > 7);
  assert.equal(res.unassigned, res.count - 7);
  assert(colony.slots.every(s => s === null), 'both small matching slots are consumed');
});

