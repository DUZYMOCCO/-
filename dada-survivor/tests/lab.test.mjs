import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES, STAGES, THROW, fireRadius, capType, gatherCount, BOTTLE, bottleOutcome, spawnPlan, DIFFICULTIES } from '../js/rules.js';
import { decorCell } from '../js/decor.js';
import { art, ART_NAMES } from '../js/art.js';

const st1 = STAGES[0];

test('ばくだんなげへい：ステージ1だけ、0:45 から すこしずつ、いちどに 4にん まで', () => {
  const T = ENEMY_TYPES.thrower;
  assert.ok(T.ranged && T.cap === 4 && T.hp > 0);
  const row = st1.enemies.find(([t]) => t === 'thrower');
  assert.ok(row && row[1] === 45, '45びょう から');
  assert.ok(!('thrower' in spawnPlan(44, DIFFICULTIES.normal, st1).weights));
  const w = spawnPlan(60, DIFFICULTIES.normal, st1).weights;
  assert.ok(w.thrower / Object.values(w).reduce((a, b) => a + b, 0) < 0.2, 'でやすさは ひかえめ');
  for (const s of STAGES.slice(1)) assert.ok(!s.enemies.some(([t]) => t === 'thrower'), s.name);
  assert.ok(st1.fire && st1.bottles);
  assert.ok(STAGES.slice(1).every(s => !s.fire && !s.bottles));
});

test('capType：いっぱいなら ステージの さいしょの てきに かわる', () => {
  assert.equal(capType('thrower', { thrower: 3 }, st1), 'thrower');
  assert.equal(capType('thrower', { thrower: 4 }, st1), st1.enemies[0][0]);
  assert.equal(capType('zombie', { zombie: 999 }, st1), 'zombie', 'cap の ない てきは そのまま');
});

test('ばくだんと ひ：しるしの じかんが あり、ひは ひろがって きえる、ダメージは ひかえめ', () => {
  assert.ok(THROW.flight >= 1, 'にげる じかん');
  assert.ok(THROW.keep > 150 && THROW.range > THROW.keep);
  assert.ok(THROW.dmg <= 12 && THROW.fireDps <= 8);
  assert.equal(fireRadius(-1), 0);
  assert.equal(fireRadius(THROW.fireLife), 0);
  assert.ok(Math.abs(fireRadius(0) - THROW.fireR0) < 1e-9);
  let prev = 0;
  for (let t = 0; t <= THROW.fireGrow; t += 0.1) { const r = fireRadius(t); assert.ok(r >= prev - 1e-9); prev = r; }
  assert.ok(Math.abs(fireRadius(THROW.fireGrow + 0.5) - THROW.fireR1) < 1e-9, 'ひろがりきる');
  assert.ok(fireRadius(THROW.fireLife - 0.1) < THROW.fireR1, 'さいごは ちいさく');
});

test('gatherCount：ひに あつまる ばくはへいは cap を こえない', () => {
  const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };
  assert.equal(gatherCount(0, seq([0.99])), 0, 'はずれ なら 0');
  assert.equal(gatherCount(0, seq([0, 0])), THROW.gatherMin);
  assert.equal(gatherCount(0, seq([0, 0.999])), THROW.gatherMax);
  assert.equal(gatherCount(THROW.gatherCap - 1, seq([0, 0.999])), 1);
  assert.equal(gatherCount(THROW.gatherCap, seq([0, 0.999])), 0);
  assert.ok(ENEMY_TYPES[THROW.gatherType], 'ばくはへい');
});

test('こわせる ボトル：うちゅうじん いりは うちゅうじん、からっぽは ほうせき、われた ボトルと はたは こわせない', () => {
  assert.deepEqual(bottleOutcome('alien'), { alien: true, gem: 0 });
  assert.deepEqual(bottleOutcome('capsule'), { alien: false, gem: BOTTLE.emptyGem });
  assert.equal(bottleOutcome('broken'), null);
  assert.equal(bottleOutcome('flag'), null);
  assert.ok(BOTTLE.hp >= 2 && BOTTLE.hp <= 4, 'なんかいか あてて われる');
  const A = ENEMY_TYPES.alien;
  assert.ok(A.noEmblem && A.speed > ENEMY_TYPES.zombie.speed && A.xp > ENEMY_TYPES.zombie.xp, 'はやめ・ほうせき おおめ');
  assert.ok(A.dmg <= ENEMY_TYPES.zombie.dmg, 'つよすぎない');
});

test('ボトルの id は マスと ばんごうで きまり、ラン の あいだ おなじ', () => {
  const ids = new Set();
  for (let cx = -15; cx < 15; cx++) for (let cy = -15; cy < 15; cy++) for (const d of decorCell(cx, cy, 9)) {
    if (d.kind === 'flag') { assert.equal(d.id, undefined); continue; }
    assert.ok(d.id && !ids.has(d.id)); ids.add(d.id);
    assert.equal(decorCell(cx, cy, 9).find(x => x.id === d.id).kind, d.kind);
  }
});

test('あたらしい え：ばくだんなげへい・うちゅうじん・ばくだん・ひ・ガラス', () => {
  for (const n of ['thrower', 'alien', 'ebomb', 'fire', 'glassShards', 'alienFloat']) assert.ok(ART_NAMES.includes(n), n);
  const svg = n => decodeURIComponent(art(n).slice(art(n).indexOf(',') + 1, -2));
  assert.ok(svg('thrower').includes('data-emblem="warumono"'), 'ばくだんなげへいは わるものぐんだん');
  assert.ok(!svg('alien').includes('data-emblem'));
  assert.notEqual(art('thrower', true), art('thrower'), 'ひかる え');
  assert.notEqual(art('alien', true), art('alien'));
  assert.ok(!/#7f0000|blood/i.test(svg('fire') + svg('alien')), 'ちは なし');
});
