// 物語の最初のミッション（v1.0.2 で置き換え）: ネジ（と背中の少年）でミサイルを掘り出し、発射台をひっぱって撃ち、設計図のありかを調べる。
// 台本が全部 checkScript を通る・ミッションが作れて最後まで勝てる・ネジが壊れたらすぐ負け・発射台を壊されても負けではない・ふつうの始まりは今のまま
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkScript, startDialog, skipToEnd } from '../js/dialog/dialog-script.js?v=3';
import { createSim, runSim, stepSim, issueOrder, hashSim, missionStatus, TICK } from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { reachable, toTile, tileCenter } from '../js/sim/map.js?v=6';
import { STORY_1 } from '../js/story/story-mission.js?v=3';
import { STORY1_SCRIPT_FILES, STORY1_MID_SCENES, storyScriptUrl, newStoryState, endingKind, midScene } from '../js/story/story-1.js?v=3';
import { issueStrike, launcherOf, nejiOf } from '../js/sim/strike.js?v=2';
import { toggleRide, toggleTow, storyHud, storyMenuState, storyResultText, STORY_OPS_LABELS } from '../js/story/story-ops.js?v=4';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const json = rel => JSON.parse(readFileSync(path(rel), 'utf8'));
const P = json('../assets/portraits/portraits.json').chars;
const SCRIPTS = Object.fromEntries(Object.entries(STORY1_SCRIPT_FILES).map(([k, f]) => [k, json(`../assets/story/${f}`)]));
const BGS = ['hideout', 'ruins_town', 'wasteland', 'junk_market', 'factory_ruins', 'night_camp', 'alien_nest'];
const spoken = sc => sc.lines.filter(l => l.text != null).length;

test('物語の台本: 5本（出撃前・掘り出した・落ちた・勝ち・負け）とも checkScript を通り、最後まで流せる', () => {
  assert.deepEqual(Object.keys(SCRIPTS), ['intro', 'found', 'after', 'win', 'lose']);
  for (const [k, sc] of Object.entries(SCRIPTS)) {
    assert.deepEqual(checkScript(sc, P), [], k);
    assert.equal(skipToEnd(startDialog(sc, P)).done, true, k);
  }
});

test('物語の台本: 行の数（出撃前 20〜40・途中 3〜10・勝ち／負け 10〜30 のセリフ）・背景は台本全体の bg だけ・仮の印', () => {
  assert.ok(spoken(SCRIPTS.intro) >= 20 && SCRIPTS.intro.lines.length <= 40, `出撃前 ${spoken(SCRIPTS.intro)}`);
  for (const k of ['found', 'after']) assert.ok(spoken(SCRIPTS[k]) >= 3 && spoken(SCRIPTS[k]) <= 10, `${k} ${spoken(SCRIPTS[k])}`);
  for (const k of ['win', 'lose']) assert.ok(spoken(SCRIPTS[k]) >= 10 && spoken(SCRIPTS[k]) <= 30, `${k} ${spoken(SCRIPTS[k])}`);
  for (const [k, sc] of Object.entries(SCRIPTS)) {
    assert.ok(BGS.includes(sc.bg), `${k}: bg は決まりの名前`);
    for (const l of sc.lines) assert.ok(!('bg' in l), `${k}: 行ごとの bg は書かない`);
    for (const l of sc.lines) assert.ok(l.who || l.enter || l.exit, `${k}: bg だけの行はない`);
    assert.match(sc.lines.at(-1).text, /（仮）/, `${k}: 最後に（仮）`);
    assert.match(sc.title, /（仮）/);
  }
});

test('物語の台本（v1.0.2）: 少年は話さない（…… だけ）・出るのはネジと少年（と名前だけの PONCO02）。ミントもロウも出ない・ネジの壊れた話し方はまだ出さない', () => {
  const ok = new Set(['NEJI', 'BOY']);
  for (const [k, sc] of Object.entries(SCRIPTS)) {
    for (const l of sc.lines) {
      if (l.who === 'BOY' && l.text != null) assert.equal(l.text, '……', k);
      for (const id of [l.who, l.enter, l.exit]) if (id) assert.ok(ok.has(id), `${k}: ${id}`);
      if (l.text) assert.doesNotMatch(l.text, /ミント|ロウ|ザザ/, `${k}: ${l.text}`);
    }
    for (const id of Object.keys(sc.cast || {})) assert.ok(ok.has(id), `${k}: cast ${id}`);
  }
  const all = Object.values(SCRIPTS).flatMap(sc => sc.lines.map(l => l.text || '')).join('\n');
  assert.doesNotMatch(all, /☰/, '乗り降り・撃つなどの操作説明（☰）はセリフに入れない');
  assert.match(all, /せっけいず/);
});

test('物語の流れ: 台本の場所・結果に合う台本・始まりの状態・途中の会話は1回だけ', () => {
  for (const k of Object.keys(STORY1_SCRIPT_FILES)) assert.match(storyScriptUrl(k), new RegExp(`assets/story/story1_${k}\\.json$`));
  assert.throws(() => storyScriptUrl('nope'));
  assert.equal(endingKind('win'), 'win'); assert.equal(endingKind('lose'), 'lose'); assert.equal(endingKind(null), null);
  assert.deepEqual(newStoryState(), { intro: true, ending: false, mid: {} });
  assert.deepEqual(STORY1_MID_SCENES, { missileFound: 'found', strikeHit: 'after' });
  const st = newStoryState();
  assert.equal(midScene('missileFound', st.mid), 'found');
  assert.equal(midScene('missileFound', st.mid), null, '2回目は出さない');
  assert.equal(midScene('boom', st.mid), null);
  assert.equal(midScene('strikeHit', st.mid), 'after');
});

test('物語のミッション: 作れる・全部歩いて行ける・味方はネジ（ツギハギ号）1機と、背中に乗った少年だけ', () => {
  const sim = createSim({ seed: 1, mission: STORY_1 });
  const m = sim.map, neji = nejiOf(sim);
  assert.equal(neji.kind, 'scav'); assert.equal(neji.label, 'ネジ');
  const seen = reachable(m, toTile(neji.x), toTile(neji.y));
  const ok = p => seen[p.ty * m.w + p.tx] === 1;
  for (const p of sim.mission.salvage) assert.ok(ok(p), `山 ${p.tx},${p.ty}`);
  assert.ok(ok(STORY_1.survey), '設計図のありか');
  for (const g of sim.groups) for (const w of g.route) assert.ok(ok(w), `巡回路 ${g.name}`);
  const allies = sim.units.filter(u => u.side === 'ally');
  assert.deepEqual(allies.map(u => u.kind).sort(), ['boy', 'scav']);
  const boy = allies.find(u => u.kind === 'boy');
  assert.equal(boy.ride?.host, neji.id); assert.equal(boy.ride.mode, 'back'); assert.equal(boy.ride.phase, 'on');
  assert.equal(sim.strike.phase, 'buried'); assert.equal(STORY_1.win, 'survey');
  assert.equal(sim.units.filter(u => u.label === '見張り').length, 3);
});

/** 勝つ進め方: ミサイルを掘る → はぐれが北へ行った間に発射台をひっぱる → (23,47) から見張りへ撃つ → 調べる */
export function playWin(seed, launch = { tx: 23, ty: 47 }) {
  const sim = createSim({ seed, mission: STORY_1 });
  const at = (u, t, r) => u && Math.hypot(u.x - tileCenter(t.tx), u.y - tileCenter(t.ty)) <= r * 32;
  let st = 'dig', moved = false; const ev = {};
  for (let i = 0; i < 900 / TICK && !sim.result; i++) {
    const n = nejiOf(sim), w = sim.units.find(u => u.label === 'はぐれ');
    if (st === 'dig') { if (i === 0) issueOrder(sim, [n.id], [STORY_1.salvage[0]]); if (sim.strike.phase !== 'buried') { st = 'tow'; ev.found = sim.time; } }
    else if (st === 'tow' && !n.order && !moved) {
      const g = w && sim.groups.find(g => g.unitIds.includes(w.id));
      if (!w || (g.ai === 'patrol' && (g.routeIdx === 0 || g.routeIdx === 1) && w.y < tileCenter(43))) { moved = true; issueOrder(sim, [n.id], [{ tx: 15, ty: 52 }, launch]); }
    } else if (st === 'tow' && sim.strike.phase === 'ready' && sim.strike.towBy != null && !n.order) {
      if (at(n, launch, 1.2)) { if (issueStrike(sim, tileCenter(31), tileCenter(42)).ok) { st = 'fired'; ev.fired = sim.time; } }
      else issueOrder(sim, [n.id], [launch]);
    } else if (st === 'fired' && sim.strike.phase === 'spent') { st = 'survey'; ev.hit = sim.time; ev.kills = sim.strike.kills; }
    else if (st === 'survey' && !n.order && !at(n, STORY_1.survey, 1)) issueOrder(sim, [n.id], [STORY_1.survey]);
    stepSim(sim);
  }
  return { sim, ev };
}

test('物語のミッション: 掘る → ひっぱる → 撃つ → 調べる、で最後まで勝てる（seed 1〜5・5分以内）', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { sim, ev } = playWin(seed);
    assert.equal(sim.result, 'win', `seed ${seed}`);
    assert.equal(sim.resultReason, 'blueprint');
    assert.ok(ev.found < ev.fired && ev.fired < ev.hit, JSON.stringify(ev));
    assert.equal(ev.kills, 3, '見張り3体をまとめて倒す');
    assert.ok(sim.time < 300, `${sim.time}`);
    assert.ok(sim.strike.survey.done);
    assert.equal(storyResultText(sim).title, '設計図を見つけた');
  }
});

test('物語のミッション: ネジが壊されたら、すぐ負け（nejiDown）', () => {
  const sim = createSim({ seed: 1, mission: STORY_1 });
  runSim(sim, 30); assert.equal(sim.result, null);
  nejiOf(sim).hp = 0; nejiOf(sim).shieldHp = 0;
  runSim(sim, 3);
  assert.equal(sim.result, 'lose'); assert.equal(sim.resultReason, 'nejiDown');
  assert.equal(storyResultText(sim).why, 'ネジが壊された…');
});

test('物語のミッション: 少年がいなくなっても負け（boyDown）', () => {
  const sim = createSim({ seed: 1, mission: STORY_1 });
  sim.units = sim.units.filter(u => u.kind !== 'boy');
  runSim(sim, 2);
  assert.equal(sim.result, 'lose'); assert.equal(sim.resultReason, 'boyDown');
});

/** 山を空にして、発射台が出た所まで進める */
function dug(seed = 1) {
  const sim = createSim({ seed, mission: STORY_1 });
  sim.mission.salvage[sim.strike.pile].amount = 0;
  stepSim(sim);
  return sim;
}

test('物語のミッション: 撃つ前に発射台を壊されても負けではない（phase lost・2発目はない・ネジで続けられる）', () => {
  const sim = dug();
  const l = launcherOf(sim); assert.ok(l); assert.equal(l.object, true);
  l.hp = 0; runSim(sim, 3);
  assert.equal(sim.strike.phase, 'lost');
  assert.equal(sim.result, null, '負けにしない');
  assert.ok(sim.fx.some(f => f.type === 'launcherLost'));
  assert.equal(issueStrike(sim, nejiOf(sim).x, nejiOf(sim).y).ok, false, '2発目はない');
  assert.equal(storyMenuState(sim).strike.on, false);
  assert.match(storyHud(sim).text, /発射台が壊れた/);
  runSim(sim, 10 / TICK); assert.equal(sim.result, null);
});

test('物語のミッション: ミサイルの爆発は敵にだけ当たる（ネジと少年が真ん中にいても無傷）', () => {
  const sim = dug();
  const n = nejiOf(sim), boy = sim.units.find(u => u.kind === 'boy'), l = launcherOf(sim);
  const enemy = sim.units.find(u => u.label === '見張り');
  n.x = l.x + 64; n.y = l.y; n.order = null; boy.x = n.x - 8; boy.y = n.y; // 射程の中へ
  // 敵は1体だけ、ネジのすぐそばに置く（ほかの敵は外す）
  sim.units = sim.units.filter(u => u.side !== 'enemy' || u === enemy);
  enemy.x = n.x + 20; enemy.y = n.y; enemy.hp = enemy.maxHp = 100; enemy.atk = 0;
  const before = { n: n.hp + n.shieldHp, b: boy.hp };
  assert.equal(issueStrike(sim, n.x, n.y).ok, true);
  for (let i = 0; i < 300 && sim.strike.phase !== 'spent'; i++) stepSim(sim);
  assert.equal(sim.strike.phase, 'spent');
  assert.equal(sim.strike.kills, 1);
  assert.ok(!sim.units.includes(enemy), '敵は倒れた');
  assert.ok(!sim.units.includes(l), '発射台は使い切り');
  assert.equal(nejiOf(sim).hp + nejiOf(sim).shieldHp, before.n);
  assert.equal(sim.units.find(u => u.kind === 'boy').hp, before.b);
  assert.equal(sim.result, null);
});

test('物語のミッション: ☰ の乗り降り（少年をおろす → 乗せる）・発射台をつなぐ／はずす は sim.commands を通る', () => {
  const sim = dug();
  const boy = () => sim.units.find(u => u.kind === 'boy');
  assert.equal(storyMenuState(sim).ride.text, STORY_OPS_LABELS.alight);
  let r = toggleRide(sim); assert.equal(r.ok, true); assert.deepEqual(sim.commands.at(-1), { type: 'alight', humanIds: [boy().id] });
  runSim(sim, 2 / TICK); assert.ok(!boy().ride, '降りた');
  assert.equal(storyMenuState(sim).ride.text, STORY_OPS_LABELS.board);
  r = toggleRide(sim); assert.equal(r.ok, true); assert.equal(sim.commands.at(-1).type, 'board');
  runSim(sim, 2 / TICK); assert.equal(boy().ride?.phase, 'on', 'また乗った');
  // 掘り出した時にネジがそばにいなければ、つないでいない。つなぐ → 1秒でひっぱり始める → はずす
  assert.equal(sim.strike.towBy, null);
  const n = nejiOf(sim), l = launcherOf(sim); n.x = l.x + 30; n.y = l.y; n.order = null;
  assert.equal(toggleTow(sim).ok, true); runSim(sim, 1.5 / TICK);
  assert.equal(sim.strike.towBy, n.id);
  assert.equal(storyMenuState(sim).tow.text, STORY_OPS_LABELS.unhitch);
  assert.equal(toggleTow(sim).ok, true); runSim(sim, 2);
  assert.equal(sim.strike.towBy, null);
  n.x = l.x + 200; assert.equal(toggleTow(sim).ok, false, '遠いとつなげない');
});

test('物語の上の帯: 掘る → つなぐ → 撃つ準備 → 調べる の文字', () => {
  const sim = createSim({ seed: 1, mission: STORY_1 });
  assert.match(storyHud(sim).text, /ミサイルを掘り出す 0／10/);
  assert.equal(storyMenuState(sim).strike.text, STORY_OPS_LABELS.buried);
  sim.mission.salvage[0].amount = 0; stepSim(sim);
  assert.match(storyHud(sim).text, /発射台/);
  assert.equal(storyMenuState(sim).strike.on, true);
  issueStrike(sim, launcherOf(sim).x + 64, launcherOf(sim).y); stepSim(sim);
  assert.match(storyHud(sim).text, /発射準備/);
  for (let i = 0; i < 300 && sim.strike.phase !== 'spent'; i++) stepSim(sim);
  assert.match(storyHud(sim).text, /設計図のありかを調べる/);
});

test('物語のミッション: 同じ seed・同じ命令なら毎回同じ（再現できる）', () => {
  assert.equal(hashSim(playWin(3).sim), hashSim(playWin(3).sim));
  const h = () => { const s = createSim({ seed: 3, mission: STORY_1 }); runSim(s, 300); return hashSim(s); };
  assert.equal(h(), h());
});

test('ふつうの始まりは今のまま: MISSION_1 に物語の仕掛けはなく、300 tick 後のハッシュ（seed 1）は変わらない', () => {
  const sim = createSim({ seed: 1, mission: MISSION_1 }); runSim(sim, 300);
  assert.equal(sim.strike, undefined);
  assert.equal(missionStatus(sim).strike, undefined);
  assert.equal(hashSim(sim), '6cc93eb6');
});

test('入口: 物語は ?story=1 か ☰ メニューのボタンだけ。物語の操作ボタンは ☰ の中（地図の上には出さない）', () => {
  const src = readFileSync(path('../js/index.js'), 'utf8');
  assert.match(src, /get\('story'\) === '1' \? newStoryState\(\) : null/);
  assert.match(src, /chapterMission = this\.story \? stageForStory\(this\.story\)\.mission : withAltUnits\(MISSION_1, ALT_MISSION_ROWS\)/);
  assert.match(src, /class="bc-menu-story"/);
  assert.match(src, /if \(this\.story\?\.intro\)/, '出撃前の会話は物語の時だけ');
  assert.match(src, /const kind = this\.story \? endingKind\(this\.sim\.result\) : null;\n\s*if \(!kind\) return this\.showResult\(\);/, '物語でなければ今までどおり結果の画面');
  assert.match(src, /menuBox: this\.el\.menu\.querySelector\('\.bc-menu-box'\)/, '物語のボタンは ☰ の箱の中');
  const ops = readFileSync(path('../js/story/story-ops.js'), 'utf8');
  assert.match(ops, /menuBox\.insertBefore/);
});
