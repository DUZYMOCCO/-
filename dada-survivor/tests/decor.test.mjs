import test from 'node:test';
import assert from 'node:assert/strict';
import { decorCell, DecorField, DECOR, DECOR_CELL } from '../js/decor.js';
import { STAGES, stageById } from '../js/rules.js';

test('ステージ1は けんきゅうじょ（かなだけ）で ボトルの かざりが ある', () => {
  const st = stageById(1);
  assert.equal(st.name, 'けんきゅうじょ');
  assert.match(st.name, /^[\u3041-\u309f\u30a0-\u30ffー]+$/);
  assert.equal(st.ground, 'lab');
  assert.equal(st.decor, 'lab');
  assert.ok(st.researcher, 'けんきゅうしゃは そのまま');
  for (const s of STAGES.slice(1)) assert.ok(!s.decor, `${s.name} は かざり なし`);
});

test('decorCell: おなじ たね・マスなら いつも おなじ、たねが ちがうと ならびが かわる', () => {
  assert.deepEqual(decorCell(3, -7, 42), decorCell(3, -7, 42));
  let diff = 0;
  for (let cx = -20; cx < 20; cx++) for (let cy = -20; cy < 20; cy++) if (JSON.stringify(decorCell(cx, cy, 1)) !== JSON.stringify(decorCell(cx, cy, 2))) diff++;
  assert.ok(diff > 300, `seed で かわる ${diff}`);
  assert.deepEqual(decorCell(0, 0, 1).map(d => d.kind), ['flag'], 'スタートの マスは みかたの はた だけ');
});

test('decorCell: ボトルは マスの なか、うちゅうじんは だいたい 6ぽんに 1ぽん、くりかえし に ならない', () => {
  let n = 0, alien = 0, broken = 0, cells = 0, withBottle = 0, flags = 0;
  for (let cx = -60; cx < 60; cx++) for (let cy = -60; cy < 60; cy++) {
    const all = decorCell(cx, cy, 777), list = all.filter(d => d.kind !== 'flag');
    cells++; if (list.length) withBottle++;
    flags += all.length - list.length;
    assert.ok(all.length <= 3);
    assert.ok(!(list.length && all.length !== list.length), 'はたと ボトルは おなじ マスに ない');
    for (const d of all) {
      assert.ok(d.x >= cx * DECOR_CELL && d.x < (cx + 1) * DECOR_CELL && d.y >= cy * DECOR_CELL && d.y < (cy + 1) * DECOR_CELL, 'マスから はみださない');
    }
    for (const d of list) {
      n++;
      if (d.kind === 'alien') alien++; else if (d.kind === 'broken') broken++; else assert.equal(d.kind, 'capsule');
      assert.ok(d.x >= cx * DECOR_CELL && d.x < (cx + 1) * DECOR_CELL && d.y >= cy * DECOR_CELL && d.y < (cy + 1) * DECOR_CELL, 'マスから はみださない');
    }
  }
  const a = alien / n;
  assert.ok(a > 0.13 && a < 0.2, `alien ${a}`);
  assert.ok(broken / n > 0.15 && broken / n < 0.25);
  assert.ok(Math.abs(withBottle / cells - DECOR.rowChance) < 0.03);
  assert.ok(Math.abs(flags / cells - DECOR.flagChance) < 0.02, `flags ${flags / cells}`);
});

test('DecorField: みえる マスだけ、おなじ オブジェクトを かえす（DOM を つけかえない）', () => {
  const f = new DecorField(5);
  const a = [...f.visible(-500, -800, 500, 800)];
  const b = [...f.visible(-500, -800, 500, 800)];
  assert.equal(a.length, b.length);
  a.forEach((d, i) => assert.equal(d, b[i]));
  f.setSeed(6);
  const c = f.visible(-500, -800, 500, 800);
  assert.ok(c.every(d => !a.includes(d)), 'たねを かえたら つくりなおし');
});
