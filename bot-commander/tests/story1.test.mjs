// 物語の最初のミッション（試作）: 台本が全部 checkScript を通る・ミッションが作れて最後まで回る・ふつうの始まりは今のまま
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkScript, startDialog, skipToEnd } from '../js/dialog/dialog-script.js?v=3';
import { createSim, runSim, stepSim, issueOrder, issueAttack, missionStatus, hashSim, FIELD_CAP, TICK } from '../js/sim/sim.js?v=23';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { reachable, toTile } from '../js/sim/map.js?v=6';
import { STORY_1 } from '../js/story/story-mission.js?v=2';
import { STORY1_SCRIPT_FILES, storyScriptUrl, newStoryState, endingKind } from '../js/story/story-1.js?v=1';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const json = rel => JSON.parse(readFileSync(path(rel), 'utf8'));
const P = json('../assets/portraits/portraits.json').chars;
const SCRIPTS = Object.fromEntries(Object.entries(STORY1_SCRIPT_FILES).map(([k, f]) => [k, json(`../assets/story/${f}`)]));
const BGS = ['hideout', 'ruins_town', 'wasteland', 'junk_market', 'factory_ruins', 'night_camp', 'alien_nest'];

test('物語の台本: 3本とも checkScript を通り、最後まで流せる', () => {
  for (const [k, sc] of Object.entries(SCRIPTS)) {
    assert.deepEqual(checkScript(sc, P), [], k);
    const st = skipToEnd(startDialog(sc, P));
    assert.equal(st.done, true, k);
  }
});

test('物語の台本: 行の数（出撃前 20〜40・勝ち／負け 10〜20 のセリフ）・背景は台本全体の bg だけ・仮の印', () => {
  const spoken = sc => sc.lines.filter(l => l.text != null).length;
  assert.ok(spoken(SCRIPTS.intro) >= 20 && SCRIPTS.intro.lines.length <= 40, `出撃前 ${spoken(SCRIPTS.intro)}`);
  for (const k of ['win', 'lose']) assert.ok(spoken(SCRIPTS[k]) >= 10 && spoken(SCRIPTS[k]) <= 30, `${k} ${spoken(SCRIPTS[k])}`);
  for (const [k, sc] of Object.entries(SCRIPTS)) {
    assert.ok(BGS.includes(sc.bg), `${k}: bg は決まりの名前`);
    for (const l of sc.lines) assert.ok(!('bg' in l), `${k}: 行ごとの bg は書かない`);
    for (const l of sc.lines) assert.ok(l.who || l.enter || l.exit, `${k}: bg だけの行はない`);
    assert.match(sc.lines.at(-1).text, /（仮）/, `${k}: 最後に（仮）`);
    assert.match(sc.title, /（仮）/);
  }
});

test('物語の台本: 少年は話さない（セリフは …… だけ）・出てくるのは決めた人だけ', () => {
  const ok = new Set(['NEJI', 'BOY', 'GIRL', 'WOLF', 'PONCO02']);
  for (const [k, sc] of Object.entries(SCRIPTS)) {
    for (const l of sc.lines) {
      if (l.who === 'BOY' && l.text != null) assert.equal(l.text, '……', k);
      for (const id of [l.who, l.enter, l.exit]) if (id) assert.ok(ok.has(id), `${k}: ${id}`);
    }
  }
  assert.ok(SCRIPTS.win.lines.some(l => l.enter === 'GIRL'), '勝った時に女の子が出る');
  assert.ok(!SCRIPTS.lose.lines.some(l => l.enter === 'WOLF' || l.who === 'WOLF'), 'v1.0.0: 最初のミッションには狼（ロウ）は出ない（あとで仲間になる）');
  assert.ok(!Object.values(SCRIPTS).some(sc => 'WOLF' in (sc.cast || {})), '台本の cast にも狼はいない');
});

test('物語の流れ: 台本の場所・結果に合う台本・始まりの状態', () => {
  for (const k of Object.keys(STORY1_SCRIPT_FILES)) assert.match(storyScriptUrl(k), new RegExp(`assets/story/story1_${k}\.json$`));
  assert.throws(() => storyScriptUrl('nope'));
  assert.equal(endingKind('win'), 'win'); assert.equal(endingKind('lose'), 'lose'); assert.equal(endingKind(null), null);
  assert.deepEqual(newStoryState(), { intro: true, ending: false });
});

test('物語のミッション: 作れる・全部歩いて行ける・味方は少ない（ジェミニ1・PONCO02 3・少年）', () => {
  const sim = createSim({ seed: 1, mission: STORY_1 });
  const m = sim.map, c = sim.units.find(u => u.kind === 'scav');
  const seen = reachable(m, toTile(c.x), toTile(c.y));
  const ok = p => seen[p.ty * m.w + p.tx] === 1;
  for (const p of sim.mission.salvage) assert.ok(ok(p), `回収ポイント ${p.tx},${p.ty}`);
  assert.ok(ok(sim.mission.extraction) && ok(sim.mission.nest));
  for (const g of sim.groups) for (const w of g.route) assert.ok(ok(w), `巡回路 ${g.name}`);
  const allies = sim.units.filter(u => u.side === 'ally');
  assert.deepEqual(['scav', 'ponco', 'boy'].map(k => allies.filter(u => u.kind === k).length), [1, 3, 1]);
  assert.equal(allies.find(u => u.kind === 'scav').label, 'ジェミニ');
  assert.ok(allies.filter(u => !u.human).length <= FIELD_CAP.robots);
  assert.ok(sim.mission.salvage.reduce((a, p) => a + p.amount, 0) >= STORY_1.target, '集められる量が目標より多い');
  assert.equal(sim.units.filter(u => u.side === 'enemy').length, 6); // v1.0.0: 巡回1・巡回2(2)・見張り(3)
});

/** 資材を順に取って、脱出口へ全員で届ける進め方（集めるだけ・確かめ用の自動操作） */
function playThrough(seed, maxSec = 600) {
  const sim = createSim({ seed, mission: STORY_1 });
  const all = () => sim.units.filter(u => u.side === 'ally').map(u => u.id);
  const goals = [...sim.mission.salvage, sim.mission.extraction];
  let step = 0;
  issueOrder(sim, all(), [goals[0]]);
  for (let i = 0; i < maxSec / TICK && !sim.result; i++) {
    stepSim(sim);
    if (step < 2 && sim.mission.salvage[step].amount === 0) {
      const near = sim.units.filter(u => u.kind === 'scav').every(u => Math.hypot(toTile(u.x) - goals[step].tx, toTile(u.y) - goals[step].ty) < 2);
      if (near) { step++; issueOrder(sim, all(), [goals[step]]); }
    }
  }
  return sim;
}

/** 先に PONCO02 3体で巡回を1体ずつ（いちばん近いのから）倒し、それから全員で集めて届ける進め方 */
function fightFirst(seed, maxSec = 900) {
  const sim = createSim({ seed, mission: STORY_1 });
  const ponco = () => sim.units.filter(u => u.side === 'ally' && u.kind === 'ponco');
  const all = () => sim.units.filter(u => u.side === 'ally').map(u => u.id);
  const goals = [...sim.mission.salvage, sim.mission.extraction];
  const patrols = new Set(sim.groups.filter(g => /巡回/.test(g.name)).map(g => g.id));
  let phase = 'fight', step = 0, tgt = null;
  for (let i = 0; i < maxSec / TICK && !sim.result; i++) {
    if (phase === 'fight' && i % 15 === 0) {
      const en = sim.units.filter(u => u.side === 'enemy' && u.hp > 0 && patrols.has(u.groupId)), rs = ponco();
      if (!rs.length) break;
      if (!en.length) { phase = 'gather'; issueOrder(sim, all(), [goals[0]]); }
      else {
        const cx = rs.reduce((a, u) => a + u.x, 0) / rs.length, cy = rs.reduce((a, u) => a + u.y, 0) / rs.length;
        const e = en.reduce((b, u) => (Math.hypot(u.x - cx, u.y - cy) < Math.hypot(b.x - cx, b.y - cy) ? u : b));
        if (tgt !== e.id) { tgt = e.id; issueAttack(sim, rs.map(u => u.id), e.id); }
      }
    }
    stepSim(sim);
    if (phase === 'gather' && step < 2 && sim.mission.salvage[step].amount === 0) {
      const near = sim.units.filter(u => u.kind === 'scav').every(u => Math.hypot(toTile(u.x) - goals[step].tx, toTile(u.y) - goals[step].ty) < 2);
      if (near) { step++; issueOrder(sim, all(), [goals[step]]); }
    }
  }
  return sim;
}

test('物語のミッション（v1.0.0 敵を強く）: 資材を集めるだけでは勝てない', () => {
  for (const seed of [1, 2, 3]) {
    const sim = playThrough(seed);
    assert.notEqual(sim.result, 'win', `seed ${seed}`);
  }
});

test('物語のミッション: 巡回を先に1体ずつ倒してから集めると、最後まで回して勝てる（資材を届けて脱出）', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const sim = fightFirst(seed);
    assert.equal(sim.result, 'win', `seed ${seed}`);
    assert.equal(sim.resultReason, 'extracted');
    assert.ok(missionStatus(sim).delivered >= STORY_1.target);
  }
});

test('物語のミッション: 味方が全滅すると負けになる', () => {
  const sim = createSim({ seed: 1, mission: STORY_1 });
  runSim(sim, 30);
  assert.equal(sim.result, null);
  sim.units = sim.units.filter(u => u.side !== 'ally');
  runSim(sim, 2);
  assert.equal(sim.result, 'lose');
});

test('物語のミッション: 同じ seed なら毎回同じ（再現できる）', () => {
  const h = () => { const s = createSim({ seed: 3, mission: STORY_1 }); runSim(s, 300); return hashSim(s); };
  assert.equal(h(), h());
});

test('ふつうの始まりは今のまま: MISSION_1 の 300 tick 後のハッシュ（seed 1）は変わらない', () => {
  const sim = createSim({ seed: 1, mission: MISSION_1 }); runSim(sim, 300);
  assert.equal(hashSim(sim), '6cc93eb6'); // v0.4.13: 機体ごとの盾の表（shield-table.js）で新しい値に。前の表で前の値に戻ることは shield-table.test.mjs
});

test('入口: 物語は ?story=1 か ☰ メニューのボタンだけ（URL に何もなければ MISSION_1・会話なし）', () => {
  const src = readFileSync(path('../js/index.js'), 'utf8');
  assert.match(src, /get\('story'\) === '1' \? newStoryState\(\) : null/);
  assert.match(src, /mission = this\.story \? STORY_1 : withAltUnits\(MISSION_1, ALT_MISSION_ROWS\)/); // v1.0.0: ふつうのミッションは飛ぶ機体・水陸両用機を足せる形（今は足さない）
  assert.match(src, /class="bc-menu-story"/);
  assert.match(src, /if \(this\.story\?\.intro\)/, '出撃前の会話は物語の時だけ');
  assert.match(src, /const kind = this\.story \? endingKind\(this\.sim\.result\) : null;\n\s*if \(!kind\) return this\.showResult\(\);/, '物語でなければ今までどおり結果の画面');
});
