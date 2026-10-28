// v1.0.6 ロボごとの成績とランキング（js/stats/unit-stats.js）。見るだけで sim を変えないこと
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSim, stepSim, hashSim, TICK } from '../js/sim/sim.js?v=30';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { createUnitStats, statsHtml, scoreOf, STAT_CATEGORIES, MEDALS } from '../js/stats/unit-stats.js?v=6';

const A = (id, extra = {}) => ({ id, side: 'ally', kind: 'scav', hp: 100, maxHp: 100, x: 0, y: 0, cargo: 0, ...extra });
const E = (id, extra = {}) => ({ id, side: 'enemy', kind: 'alien', hp: 50, maxHp: 50, x: 0, y: 0, ...extra });

test('弾・撃破・受けたダメージ・運んだ資材・守った回数を数え、項目ごとの MVP と総合の順位を出す', () => {
  const st = createUnitStats({ nameOf: u => `U${u.id}` });
  const a = A(1), b = A(2, { human: true, kind: 'boy' }), h = A(4, { human: true, kind: 'girl', label: 'ミント' }), e = E(3);
  const sim = { units: [a, b, h, e], fx: [], time: 0 };
  st.observe(sim);
  sim.fx.push({ type: 'shot', from: 1, to: 3, toSide: 'enemy', dmg: 30, kill: false, t: 0.1 });
  b.hp = 80; a.cargo = 4;
  st.observe(sim);
  h.captured = 3; st.observe(sim);
  sim.fx.push({ type: 'shot', from: 1, to: 3, toSide: 'enemy', dmg: 20, kill: true, t: 0.2 });
  sim.fx.push({ type: 'rescue', id: 4, t: 0.2 });
  sim.fx.push({ type: 'kitUse', by: 2, unit: 1, heal: 10, t: 0.2 });
  sim.fx.push({ type: 'deliver', t: 0.2 });
  sim.units = [a, b, h]; h.captured = null; a.cargo = 0;
  st.observe(sim);
  const s = st.summary(), r1 = s.rows.find(r => r.id === 1), r2 = s.rows.find(r => r.id === 2);
  assert.deepEqual([r1.dealt, r1.kills, r1.carried, r1.saves], [50, 1, 4, 1]);
  assert.deepEqual([r2.taken, r2.saves], [20, 1]);
  assert.equal(s.rows.find(r => r.id === 4).name, 'U4');
  assert.equal(s.mvp.dealt.id, 1); assert.equal(s.mvp.kills.id, 1); assert.equal(s.mvp.taken.id, 2); assert.equal(s.mvp.carried.id, 1);
  assert.equal(s.rows[0].id, 1); assert.equal(s.rows[0].rank, 1);
  assert.equal(r1.score, scoreOf(r1));
  assert.ok(!s.rows.some(r => r.id === 3), '敵は並べない');
});

test('倒れた味方は残っていた HP も受けたダメージに入り、「倒れた」と出る。発射台（物）は並べない', () => {
  const st = createUnitStats(), a = A(1, { hp: 40 }), o = A(9, { object: true }), sim = { units: [a, o], fx: [] };
  st.observe(sim); sim.units = [o]; st.observe(sim);
  const s = st.summary();
  assert.equal(s.rows.length, 1); assert.equal(s.rows[0].taken, 40); assert.equal(s.rows[0].down, true);
});

test('HTML: 5 項目の MVP の札・🥇🥈🥉 の順位・名前はエスケープ', () => {
  const st = createUnitStats({ nameOf: u => u.id === 1 ? '<b>x' : `ロボ${u.id}` });
  const sim = { units: [A(1), A(2), A(3), A(4)], fx: [] };
  st.observe(sim);
  sim.fx.push({ type: 'shot', from: 2, to: 9, toSide: 'enemy', dmg: 10, kill: true });
  st.observe(sim);
  const html = statsHtml(st.summary());
  assert.equal((html.match(/bc-st-chip/g) || []).length, STAT_CATEGORIES.length);
  for (const m of MEDALS) assert.ok(html.includes(m));
  assert.ok(html.includes('4位')); assert.ok(html.includes('&lt;b&gt;x')); assert.ok(!html.includes('<b>x'));
  assert.equal(statsHtml({ rows: [], mvp: {} }), '');
});

test('ふつうのミッションで成績を数えても、sim のハッシュは数えない時と同じ（見るだけ）', () => {
  const run = watch => {
    const sim = createSim({ seed: 2, mapSeed: 7, mission: MISSION_1 }), st = createUnitStats();
    for (let i = 0; i < 60 * 120; i++) { stepSim(sim, TICK); if (watch) st.observe(sim); }
    return { h: hashSim(sim), s: watch ? st.summary() : null };
  };
  const a = run(false), b = run(true);
  assert.equal(a.h, b.h);
  assert.ok(b.s.rows.length >= 3);
});

test('index.js: 1 step ごとに数え、結果の画面と ☰ の「今の成績」に出す。先読みの一覧に入っている', () => {
  const I = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.match(I, /unit-stats\.js\?v=\d+/);
  assert.match(I, /const step = \(\) => \{ step0\(\); unitStats\.observe\(sim\); \}/);
  assert.match(I, /class="bc-result-stats"/); assert.match(I, /class="bc-menu-stats"/);
  assert.match(I, /showResult\(\) \{\n\s+BotCommanderGame\.showResultMain\.call\(this\);\n\s+BotCommanderGame\.renderResultStats\.call\(this\);/);
  assert.match(readFileSync(new URL('../sw-assets.js', import.meta.url), 'utf8'), /'js\/stats\/unit-stats\.js'/);
  assert.doesNotMatch(readFileSync(new URL('../js/stats/unit-stats.js', import.meta.url), 'utf8'), /sim\.\w+\s*=[^=]|stepSim/, 'sim に書かない');
});
