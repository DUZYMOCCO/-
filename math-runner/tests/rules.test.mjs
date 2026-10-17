import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GATE_TYPES,
  applyGate,
  getGateText,
  isGoodGate,
  UPGRADES,
  getUpgradeCost,
  defaultSaveData,
  normalizeSave,
  generateStageCourse,
} from '../js/rules.js';

test('applyGate computes correct math operations with boundaries', () => {
  // 加算
  assert.equal(applyGate(5, { type: GATE_TYPES.ADD, val: 5 }), 10);
  // 減算（最低1を保証）
  assert.equal(applyGate(5, { type: GATE_TYPES.SUB, val: 3 }), 2);
  assert.equal(applyGate(3, { type: GATE_TYPES.SUB, val: 10 }), 1);
  // 乗算
  assert.equal(applyGate(4, { type: GATE_TYPES.MUL, val: 3 }), 12);
  // 除算（最低1を保証）
  assert.equal(applyGate(9, { type: GATE_TYPES.DIV, val: 2 }), 4);
  assert.equal(applyGate(1, { type: GATE_TYPES.DIV, val: 5 }), 1);
  // 上限999
  assert.equal(applyGate(500, { type: GATE_TYPES.MUL, val: 10 }), 999);
});

test('getGateText and isGoodGate return correct representations', () => {
  const addGate = { type: GATE_TYPES.ADD, val: 7 };
  assert.equal(getGateText(addGate), '+7');
  assert.equal(isGoodGate(addGate), true);

  const subGate = { type: GATE_TYPES.SUB, val: 4 };
  assert.equal(getGateText(subGate), '-4');
  assert.equal(isGoodGate(subGate), false);

  const mulGate = { type: GATE_TYPES.MUL, val: 2 };
  assert.equal(getGateText(mulGate), '×2');
  assert.equal(isGoodGate(mulGate), true);

  const divGate = { type: GATE_TYPES.DIV, val: 2 };
  assert.equal(getGateText(divGate), '÷2');
  assert.equal(isGoodGate(divGate), false);
});

test('generateStageCourse generates playable track with gates and walls', () => {
  const course = generateStageCourse(1);
  assert.ok(course.length > 2000);
  assert.ok(course.finishY > 1500);

  const gates = course.elements.filter(e => e.type === 'GATE_PAIR');
  const blocks = course.elements.filter(e => e.type === 'BLOCK');

  assert.ok(gates.length >= 3, 'should have multiple gates');
  assert.ok(blocks.length >= 3, 'should have blocks');
  assert.ok(course.walls.length >= 5, 'should have multiplier walls');

  // 壁の倍率が昇順であること
  for (let i = 1; i < course.walls.length; i++) {
    assert.ok(course.walls[i].mult > course.walls[i - 1].mult);
  }
});

test('upgrades cost and normalization behave safely', () => {
  const cost1 = getUpgradeCost('startCount', 1);
  const cost2 = getUpgradeCost('startCount', 2);
  assert.ok(cost1 < cost2);

  const maxLvl = UPGRADES.startCount.maxLevel;
  assert.equal(getUpgradeCost('startCount', maxLvl), Infinity);

  const norm = normalizeSave({ coins: -50, upgrades: { startCount: 999 } });
  assert.equal(norm.coins, 0);
  assert.equal(norm.upgrades.startCount, maxLvl);
});

// ---- v1.1.0 ゆっくり モード・けしき ----
import { SPEEDS, DEFAULT_SPEED, START_DELAY, THEMES, stageTheme } from '../js/rules.js';
import { RunnerEngine } from '../js/engine.js';

test('speeds: slow is default and much slower than the old 260px/s; gates farther apart', () => {
  assert.equal(DEFAULT_SPEED, 'slow');
  assert.ok(SPEEDS.slow.speed <= 130 && SPEEDS.slow.speed < SPEEDS.normal.speed && SPEEDS.normal.speed < SPEEDS.fast.speed);
  assert.equal(SPEEDS.fast.speed, 260); assert.equal(SPEEDS.fast.gateGap, 400); // むかしの はやさ
  // ゲートの かんかくを よむ じかん（びょう）
  const secs = k => SPEEDS[k].gateGap / SPEEDS[k].speed;
  assert.ok(secs('slow') >= 3.5 && secs('slow') > secs('normal') && secs('normal') > secs('fast'));
  for (const k of Object.keys(SPEEDS)) {
    const c = generateStageCourse(3, k);
    const gates = c.elements.filter(e => e.type === 'GATE_PAIR');
    assert.ok(gates.length >= 3, k);
    for (let i = 1; i < gates.length; i++) assert.equal(gates[i].y - gates[i - 1].y, SPEEDS[k].gateGap);
    assert.equal(c.hpMul, SPEEDS[k].hpMul);
  }
  // ゆっくりでも むずかしさは ほぼ おなじ（ブロックHPが ふえる）
  const hpOf = k => { let t = 0, n = 0; for (let i = 0; i < 40; i++) for (const e of generateStageCourse(2, k).elements) if (e.type === 'BLOCK') { t += e.maxHp; n++; } return t / n; };
  assert.ok(hpOf('slow') > hpOf('fast') * 1.6);
});

test('engine uses the chosen speed and waits briefly at the start', () => {
  const mk = speed => new RunnerEngine(generateStageCourse(1, speed), { ...normalizeSave({ speed }) });
  const e = mk('slow'); assert.equal(e.speed, SPEEDS.slow.speed);
  e.update(0.5); assert.equal(e.dist, 0);                       // まだ とまって いる
  for (let i = 0; i < 20; i++) e.update(0.1);
  assert.ok(e.dist > 0 && e.dist < SPEEDS.slow.speed * (2.5 - START_DELAY) + 1);
  assert.equal(mk('fast').speed, 260);
  // ゆっくり でも コインは おなじ くらい（HP ぶん あたいを わる）
  assert.equal(new RunnerEngine(generateStageCourse(1), normalizeSave(null)).course.hpMul, 2);
});

test('save: speed defaults to slow, bad values fall back, old saves keep coins/upgrades', () => {
  assert.equal(defaultSaveData().speed, 'slow');
  assert.equal(normalizeSave({ coins: 12, upgrades: { power: 3 } }).speed, 'slow');
  assert.equal(normalizeSave({ speed: 'fast' }).speed, 'fast');
  assert.equal(normalizeSave({ speed: 'warp' }).speed, 'slow');
  const o = normalizeSave({ coins: 12, stage: 4, upgrades: { power: 3 } });
  assert.deepEqual([o.coins, o.stage, o.upgrades.power], [12, 4, 3]);
});

test('scenery themes cycle meadow/desert/space and ride on the course', () => {
  assert.deepEqual(THEMES, ['meadow', 'desert', 'space']);
  assert.deepEqual([1, 2, 3, 4, 5].map(stageTheme), ['meadow', 'desert', 'space', 'meadow', 'desert']);
  assert.equal(generateStageCourse(3).theme, 'space');
});

// ---- v1.2.0 ほそい ながれ・うてる ゲート・まとが さいしょから みえる・むずかしさの かいだん ----
import { STREAM, FIRST_BLOCK_Y, gateAfterHits, gateSpec, GATE_SHOOT } from '../js/rules.js';

const gatesOf = (stage, runs = 200) => {
  const seen = {};
  for (let i = 0; i < runs; i++) for (const e of generateStageCourse(stage).elements) {
    if (e.type !== 'GATE_PAIR') continue;
    for (const g of [e.left, e.right]) { const s = (seen[g.type] ||= { min: 1e9, max: 0 }); s.min = Math.min(s.min, g.val); s.max = Math.max(s.max, g.val); }
  }
  return seen;
};

test('difficulty ladder: stage 1-2 only +1..+5 and -1..-3, then x, then ÷, numbers grow', () => {
  for (const st of [1, 2]) {
    const g = gatesOf(st);
    assert.deepEqual(Object.keys(g).sort(), ['add', 'sub']);
    assert.ok(g.add.min >= 1 && g.add.max <= 5 && g.sub.min >= 1 && g.sub.max <= 3, JSON.stringify(g));
  }
  for (const st of [3, 4]) assert.deepEqual(Object.keys(gatesOf(st)).sort(), ['add', 'sub']);
  assert.ok(gatesOf(6).mul && !gatesOf(6).div);          // ×は 5から、÷は まだ
  assert.ok(gatesOf(6).mul.max === 2 && gatesOf(8).mul.max === 3);
  assert.ok(!gatesOf(8).div && gatesOf(10).div);         // ÷は 9から
  assert.ok(gatesOf(10).div.max === 2 && gatesOf(13).div.max === 3 && gatesOf(13).mul.max === 4);
  assert.ok(gateSpec(10).addMax > gateSpec(3).addMax && gateSpec(3).addMax > gateSpec(1).addMax);
  assert.ok(gateSpec(9).subMax >= gateSpec(3).subMax);
  assert.equal(gateSpec(0).addMax, 5);
});

test('shootable gates: hits change numbers (+ grows, - shrinks then turns +, x and ÷ move slowly)', () => {
  assert.deepEqual(gateAfterHits({ type: 'add', val: 3 }, 0), { type: 'add', val: 3 });
  assert.deepEqual(gateAfterHits({ type: 'add', val: 3 }, 8), { type: 'add', val: 5 });
  assert.equal(gateAfterHits({ type: 'add', val: 3 }, 9999).val, 3 + 8);                 // ふえすぎない
  assert.deepEqual(gateAfterHits({ type: 'sub', val: 3 }, 4), { type: 'sub', val: 2 });
  assert.deepEqual(gateAfterHits({ type: 'sub', val: 2 }, 8), { type: 'add', val: 1 });  // 0 → ＋に かわる
  assert.equal(gateAfterHits({ type: 'sub', val: 2 }, 16).type, 'add');
  assert.equal(gateAfterHits({ type: 'mul', val: 2 }, 32).val, 4);
  assert.equal(gateAfterHits({ type: 'mul', val: 2 }, 9999).val, 5);
  assert.equal(gateAfterHits({ type: 'div', val: 3 }, 16).val, 1);
  assert.equal(gateAfterHits({ type: 'div', val: 3 }, 9999).val, 1);
  assert.deepEqual(gateAfterHits({ type: 'add', val: 3 }, 7.9), { type: 'add', val: 4 }); // 1かいの はっしゃ = 1（小数OK）
});

test('narrow stream: at most 5 visible thin bullets in a tight column, total power unchanged', () => {
  for (const count of [1, 3, 5, 12, 40, 200]) {
    const e = new RunnerEngine(generateStageCourse(1), normalizeSave(null));
    e.bulletCount = count; e.bulletPower = 1.5; e.playerX = 0.2;
    e.spawnBullets();
    assert.ok(e.bullets.length === Math.min(count, STREAM.maxVisible));
    const xs = e.bullets.map(b => b.laneNorm), span = Math.max(...xs) - Math.min(...xs);
    assert.ok(span <= (STREAM.maxVisible - 1) * STREAM.gap + 1e-9 && span <= 0.15, String(span));
    const total = e.bullets.reduce((s, b) => s + b.power, 0);
    assert.ok(Math.abs(total - count * 1.5) < 1e-6, `${count}: ${total}`);
  }
});

test('targets are on screen from the start (blocks and the first gate)', () => {
  for (const k of Object.keys(SPEEDS)) {
    const c = generateStageCourse(1, k);
    const first = c.elements.filter(e => e.type === 'BLOCK').sort((a, b) => a.y - b.y)[0];
    const gate = c.elements.filter(e => e.type === 'GATE_PAIR').sort((a, b) => a.y - b.y)[0];
    assert.equal(first.y, FIRST_BLOCK_Y);
    assert.ok(first.y <= 300 && gate.y <= 470 && gate.y > first.y, `${k}: ${first.y}/${gate.y}`); // がめん（うえ 490px くらい）の なか
    assert.ok(first.hp < 30 * SPEEDS[k].hpMul);                                                    // さいしょは たおしやすい
  }
});

test('engine: bullets pass through gates and change them; blocks lose HP and flash', () => {
  const course = generateStageCourse(1, 'fast');
  const e = new RunnerEngine(course, normalizeSave({ speed: 'fast', upgrades: { startCount: 5 } }));
  e.delay = 0; e.playerX = e.targetX = 0.4;
  const gate = course.elements.find(x => x.type === 'GATE_PAIR');
  const g = gate.right, startVal = g.val, startType = g.type;
  const events = [];
  for (let i = 0; i < 60 * 3 && !gate.passed; i++) e.update(1 / 60, ev => events.push(ev));
  assert.ok(g.hits > 0 && events.includes('gate-grow'));
  assert.ok(g.type !== startType || g.val !== startVal);
  const blk = course.elements.filter(x => x.type === 'BLOCK' && x.y === FIRST_BLOCK_Y).sort((a, b) => Math.abs(a.laneNorm - 0.4) - Math.abs(b.laneNorm - 0.4))[0];
  assert.ok(blk.hp < blk.maxHp || blk.destroyed);
});

// ---- v1.2.0 まちがえても すぐ おわらない ----
import { WALL_GRACE, WALL_EASE } from '../js/rules.js';

function playBot(stage, speed, pick) {
  const e = new RunnerEngine(generateStageCourse(stage, speed), normalizeSave({ speed }));
  const val = (g, c) => g.type === 'add' ? c + g.val : g.type === 'sub' ? Math.max(1, c - g.val) : g.type === 'mul' ? c * g.val : Math.max(1, Math.floor(c / g.val));
  let t = 0, min = 99, last = null;
  while (!e.isFinished && t < 300) {
    const g = e.course.elements.find(x => x.type === 'GATE_PAIR' && !x.passed);
    if (g) e.setTargetX(pick(val(g.left, e.bulletCount), val(g.right, e.bulletCount)) ? -0.5 : 0.5);
    e.update(1 / 60, (ev, d) => { if (ev === 'clear') last = d; });
    min = Math.min(min, e.bulletCount); t += 1 / 60;
  }
  return { e, min, last, t };
}

test('forgiving: wrong choices never end the run; count never below 1; early stages clear even with the worse gate every time', () => {
  let clears = 0;
  for (let i = 0; i < 40; i++) {
    const r = playBot(1, 'slow', (a, b) => a < b); // いつも わるい ほうを えらぶ
    assert.ok(r.min >= 1 && r.e.isFinished && r.last, 'ゴールまで いく');
    assert.ok(r.t > 15, `すぐ おわらない: ${r.t}`);
    if (r.last.cleared) clears++;
  }
  assert.ok(clears >= 30, `ステージ1は わるい ゲートばかりでも ほとんど クリア（${clears}/40）`);
  // ふつうに えらべば かならず クリア
  for (let i = 0; i < 20; i++) assert.ok(playBot(3, 'slow', (a, b) => a >= b).last.cleared);
  assert.ok(WALL_EASE[0] < WALL_EASE[1] && WALL_EASE[1] < WALL_EASE[2] && WALL_EASE[2] <= 1);
});

test('failing only comes from too little power at the wall: stuck for WALL_GRACE seconds, then "try again" (no stage advance data)', () => {
  const course = generateStageCourse(5, 'fast');
  const e = new RunnerEngine(course, normalizeSave({ speed: 'fast' }));
  e.delay = 0; e.bulletPower = 0.001; e.bulletCount = 1;          // ちからが たりない
  for (const el of course.elements) { el.passed = true; if (el.type === 'BLOCK') el.destroyed = true; }
  let ev = null, wasStuck = false;
  for (let i = 0; i < 60 * 40 && !e.isFinished; i++) { e.update(1 / 60, (n, d) => { if (n === 'clear') ev = d; }); wasStuck ||= e.stuck > 1; }
  assert.ok(wasStuck && ev && ev.cleared === false && ev.finalMult === 1);
  assert.ok(e.stuck >= WALL_GRACE && e.stuck < WALL_GRACE + 0.1);
  assert.equal(e.dist, course.walls[0].y - 15);                    // かべの まえで とまる
  // ちからが あれば こわして すすめる
  const e2 = new RunnerEngine(generateStageCourse(1, 'slow'), normalizeSave({ upgrades: { startCount: 12, power: 6 } }));
  for (const el of e2.course.elements) { el.passed = true; if (el.type === 'BLOCK') el.destroyed = true; }
  let ev2 = null;
  for (let i = 0; i < 60 * 120 && !e2.isFinished; i++) e2.update(1 / 60, (n, d) => { if (n === 'clear') ev2 = d; });
  assert.ok(ev2.cleared && ev2.finalMult > 1);
});

// ---- v1.2.1 れんだ（ゆびを いそがしく うごかす・タップ）で ゲートが はやく ふえない ----
test('mashing/shaking the finger gives no advantage: fire rate is a fixed timer, gate hits ≤ volleys', () => {
  const run = (mash) => {
    const course = generateStageCourse(3, 'slow');
    const e = new RunnerEngine(course, normalizeSave({ upgrades: { startCount: 5, fireRate: 4 } }));
    e.delay = 99; // ゲートの てまえで とめて ひたすら うつ
    let volleys = 0, k = 0;
    const gate = course.elements.find(x => x.type === 'GATE_PAIR');
    e.dist = gate.y - 300;
    for (let i = 0; i < 60 * 6; i++) {
      if (mash) for (let j = 0; j < 8; j++) e.setTargetX(((k++ % 2) ? 1 : -1) * 0.8); // 1フレームに 8かい れんだ
      else e.setTargetX(0.3);
      e.update(1 / 60, ev => { if (ev === 'shoot') volleys++; });
    }
    const hits = (gate.left.hits || 0) + (gate.right.hits || 0);
    return { volleys, hits, gate };
  };
  const calm = run(false), mashed = run(true);
  assert.equal(mashed.volleys, calm.volleys);                       // うつ はやさは おなじ
  assert.ok(mashed.hits <= mashed.volleys + 1e-6);                   // 1かいの はっしゃ = さいだい 1かい
  assert.ok(calm.hits <= calm.volleys + 1e-6 && calm.hits > 0 && mashed.hits > 0);
  const cap = g => g.base.val + GATE_SHOOT.addCap;                   // ふえる じょうげんも ある
  for (const side of ['left', 'right']) { const g = mashed.gate[side]; if (g.base && g.type === 'add') assert.ok(g.val <= cap(g)); }
  assert.ok(Math.abs(mashed.volleys - 6 / UPGRADES.fireRate.calcValue(4)) < 6); // 60fps の きざみ ぶんだけ ずれる
});
