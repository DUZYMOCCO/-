import test from 'node:test';
import assert from 'node:assert/strict';
import { art } from '../js/art.js';
import { ENEMY_TYPES, STAGES, MANSION, TOWER, missileTargets, towerSpot, floorName, bossType, DIFFICULTIES } from '../js/rules.js';

const svgOf = url => decodeURIComponent(url.replace(/^url\("data:image\/svg\+xml;charset=utf-8,/, '').replace(/"\)$/, ''));
const kana = /^[ぁ-んァ-ンー\s]+$/;

test('v1.17.0：おばけのもりだけに おおきな こや（ほかの ステージは そのまま）', () => {
  assert.equal(STAGES.find(s => s.id === 4).mansion, true);
  assert.ok(!STAGES.filter(s => s.id !== 4).some(s => s.mansion));
  assert.equal(STAGES.find(s => s.id === 7).tower, true, 'まちの ビルは そのまま');
  let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 100; i++) { const p = towerSpot(rnd, MANSION), d = Math.hypot(p.x, p.y); assert.ok(d >= MANSION.dist0 - 1e-6 && d <= MANSION.dist1 + 1e-6, 'スタートから すこし はなれた ところ'); }
  assert.ok(MANSION.dist1 < TOWER.dist1);
});

test('v1.17.0：こやの なか：1・2かいは わるもの いっぱい → 3かい たからべや（ブラックロボ）→ おくじょう（こうげきヘリ）', () => {
  assert.equal(MANSION.floors, 3); assert.equal(MANSION.vaultFloor, 3);
  assert.ok(MANSION.foes[0] >= 6 && MANSION.foes[1] >= MANSION.foes[0]);
  assert.equal(floorName(4, MANSION), 'おくじょう'); assert.equal(floorName(3, MANSION), '3かい');
  assert.equal(MANSION.heliBoss.type, 'gunship');
  assert.ok(bossType(MANSION.heliBoss).dmg < ENEMY_TYPES.gunship.dmg, 'ぶつかっても ステージ7 ほど いたくない');
  assert.equal(bossType(STAGES[6].boss).dmg, ENEMY_TYPES.gunship.dmg, 'ステージ7 の ヘリは そのまま');
  assert.ok(MANSION.heliBoss.hp < STAGES.find(s => s.id === 7).boss.hp / 4, 'ステージ4 むけに よわい ヘリ');
  const v = MANSION.vault, st = MANSION.stairs;
  assert.ok(Math.hypot(v.x - st.x, v.y - st.y) > MANSION.vaultR + MANSION.stairsR, 'たからべやと かいだんは はなれて いる');
  assert.ok(MANSION.reward.coins > 0 && MANSION.reward.chests >= 1 && MANSION.reward.levelUp === 1);
});

test('v1.17.0：ブラックロボ：つよい わるもの ロボ（ミサイルは あかい しるしで よけられる）', () => {
  const T = ENEMY_TYPES.blackrobo;
  assert.equal(T.name, 'ブラックロボ'); assert.match(T.name, kana); assert.equal(T.missiles, true);
  const R = MANSION.robo;
  assert.ok(R.flight >= 1.2, 'おちるまでに よける じかんが ある');
  assert.ok(R.cd >= 3, 'つぎの ミサイルまで すこし あく');
  assert.ok(R.dmg <= 16 && R.n <= 3, 'いっぱつで やられない');
  const b = bossType(R, DIFFICULTIES.normal, STAGES[3]);
  assert.ok(b.hp > STAGES[3].mini.hp * 0.4 && b.hp < STAGES[3].boss.hp, 'ちゅうボスより つよめ・ボスより よわい');
  const ts = missileTargets(100, 50, () => 0.25);
  assert.equal(ts.length, R.n); assert.deepEqual(ts[0], { x: 100, y: 50 });
  for (const t of ts.slice(1)) assert.ok(Math.abs(Math.hypot(t.x - 100, t.y - 50) - R.spread) < 1e-6);
  const svg = svgOf(art('blackrobo'));
  assert.ok(svg.includes('data-emblem="warumono"'), 'ドクロの ワッペン');
  for (const c of ['#ef4444', '#111827', '#7f1d1d']) assert.ok(svg.includes(c), c);
  for (const k of ['robo', 'godrobo']) assert.notEqual(art('blackrobo'), art(k));
  assert.ok(!svg.includes('#38bdf8'), 'あおい め では ない（みかたの ロボと ちがう）');
  for (const k of ['bmissile', 'mansion', 'mansionDoor', 'mansionDoorOpen', 'vault', 'vaultOpen']) assert.ok(art(k), k);
  assert.ok(art('blackrobo', true) !== art('blackrobo'), 'あたると しろく ひかる');
});

test('v1.17.1：めあてへの みち・しまってる ときも やじるし', async () => {
  const { trailSteps } = await import('../js/rules.js');
  assert.deepEqual(trailSteps(100), []);
  const s = trailSteps(520);
  assert.equal(s[0], 110); assert.ok(s.at(-1) <= 430);
  for (let i = 1; i < s.length; i++) assert.equal(s[i] - s[i - 1], 100);
  assert.ok(art('trail'));
  const src = (await import('node:fs')).readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.ok(src.includes("（まだ しまってる）`, locked: true"), 'ビル／こやは しまってる ときも やじるし');
  assert.ok(src.includes("label: 'こや（まだ しまってる）', locked: true"), 'さばくの こやも');
  const sim = (await import('node:fs')).readFileSync(new URL('../tools/balance-sim.js', import.meta.url), 'utf8');
  assert.ok(sim.includes('!goal.locked'), 'bot は しまってる ところへ いかない（バランス そのまま）');
});
