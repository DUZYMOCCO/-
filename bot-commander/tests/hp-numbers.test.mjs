// v1.0.6 戦闘中のダメージの数・HP の数（js/render/hp-numbers.js）。描くだけで sim を変えないこと
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSim, stepSim, hashSim, TICK } from '../js/sim/sim.js?v=30';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { createHpNumbers, popPose, stackOffset, DMG_LIFE, HP_SHOW_SEC, DMG_COLOR } from '../js/render/hp-numbers.js?v=2';

const fakeSim = units => ({ units, fx: [], result: null });
const U = (id, side, hp, maxHp = 100, x = 100, y = 100) => ({ id, side, hp, maxHp, x, y });

test('HP が減った分だけ数が浮かぶ。味方は赤・敵は白、約 0.8 秒で消える', () => {
  const t = createHpNumbers(), a = U(1, 'ally', 100), e = U(2, 'enemy', 50, 50, 300, 300), s = fakeSim([a, e]);
  t.update(s, 0);
  a.hp = 88; e.hp = 41;
  let r = t.update(s, 0.1);
  assert.deepEqual(r.pops.map(p => [p.side, p.text]).sort(), [['ally', '12'], ['enemy', '9']]);
  assert.equal(DMG_COLOR.ally, 0xff5a5a); assert.equal(DMG_COLOR.enemy, 0xffffff);
  assert.ok(popPose(r.pops[0], 0.4)); assert.equal(popPose(r.pops[0], DMG_LIFE + 0.01), null);
  r = t.update(s, 0.1 + DMG_LIFE + 0.05);
  assert.equal(r.pops.length, 0, '0.8 秒で消える');
});

test('近くの数は重ならないようにずらす。回復では出ない', () => {
  const t = createHpNumbers(), a = U(1, 'enemy', 100), s = fakeSim([a]);
  t.update(s, 0);
  a.hp = 90; t.update(s, 0.05); a.hp = 80; const r = t.update(s, 0.1);
  assert.equal(r.pops.length, 2);
  assert.notDeepEqual([r.pops[0].dx, r.pops[0].dy], [r.pops[1].dx, r.pops[1].dy]);
  assert.deepEqual(stackOffset(0), { dx: 0, dy: 0 });
  a.hp = 95; assert.equal(t.update(s, 0.2).pops.length, 2, '回復は数を足さない');
});

test('HP の数: 撃たれた・撃った後 3 秒と、選んでいる味方はいつも。戦闘が終わったら出さない', () => {
  const t = createHpNumbers(), a = U(1, 'ally', 100), b = U(2, 'ally', 60, 60), e = U(3, 'enemy', 50, 50), s = fakeSim([a, b, e]);
  assert.deepEqual(t.update(s, 0, { selected: new Set([2]) }).labels.map(l => [l.u.id, l.text]), [[2, '60/60']]);
  s.fx.push({ type: 'shot', from: 3, to: 1 }); a.hp = 93.2;
  let ids = t.update(s, 1).labels.map(l => l.u.id).sort();
  assert.deepEqual(ids, [1, 3], '撃たれた味方・撃った敵');
  assert.equal(t.update(s, 1.5).labels.find(l => l.u.id === 1).text, '94/100');
  assert.equal(t.update(s, 1 + HP_SHOW_SEC + 0.1).labels.length, 0, '3 秒たったら消える');
  s.result = 'win'; assert.equal(t.update(s, 1 + HP_SHOW_SEC + 0.2, { selected: new Set([2]) }).labels.length, 0);
});

test('霧で見えない機体・物（発射台）には出さない。倒れて消えた機体はとどめの数を出す', () => {
  const t = createHpNumbers(), e = U(1, 'enemy', 40), o = { ...U(2, 'ally', 50), object: true }, s = fakeSim([e, o]);
  t.update(s, 0);
  e.hp = 30; o.hp = 10;
  assert.equal(t.update(s, 0.1, { visible: () => false }).pops.length, 0);
  s.units = []; s.fx.push({ type: 'boom', x: 100, y: 100 });
  const r = t.update(s, 0.2);
  assert.deepEqual(r.pops.map(p => p.text), ['30']);
});

test('最大 HP が変わった時（スーツを着る・脱ぐ）は数を出さない', () => {
  const t = createHpNumbers(), h = U(1, 'ally', 120, 120), s = fakeSim([h]);
  t.update(s, 0); h.hp = 20; h.maxHp = 20;
  assert.equal(t.update(s, 0.1).pops.length, 0);
});

test('ふつうのミッションで数を見ても、sim のハッシュは見ない時と同じ（描くだけ）', () => {
  const run = watch => {
    const sim = createSim({ seed: 3, mapSeed: 7, mission: MISSION_1 }), t = createHpNumbers();
    let n = 0;
    for (let i = 0; i < 60 * 90; i++) { stepSim(sim, TICK); if (watch) n += t.update(sim, i * TICK, { selected: new Set(sim.units.filter(u => u.side === 'ally').map(u => u.id)) }).pops.length; }
    return { h: hashSim(sim), n };
  };
  const a = run(false), b = run(true);
  assert.equal(a.h, b.h);
});

test('renderer は hp-numbers を読み、先読みの一覧にも入っている', () => {
  const R = readFileSync(new URL('../js/render/renderer.js', import.meta.url), 'utf8');
  assert.match(R, /hp-numbers\.js\?v=\d+/); assert.match(R, /drawHpNumbers\(now\)/);
  assert.match(readFileSync(new URL('../sw-assets.js', import.meta.url), 'utf8'), /'js\/render\/hp-numbers\.js'/);
  assert.doesNotMatch(readFileSync(new URL('../js/render/hp-numbers.js', import.meta.url), 'utf8'), /\.hp\s*[-+]?=[^=]|\.hp\s*-=|stepSim/, 'HP を書き換えない');
});
