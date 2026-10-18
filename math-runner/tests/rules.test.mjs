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
  LIMITS,
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
  assert.equal(applyGate(500, { type: GATE_TYPES.MUL, val: 10 }), 5000);   // v1.4.1: 999 の かべは なくなった
  assert.equal(applyGate(5e7, { type: GATE_TYPES.MUL, val: 10 }), LIMITS.count);
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
import { WALL_GRACE, WALL, wallBaseHp } from '../js/rules.js';

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
  // ステージ1〜2の かべは とても やさしい（HPが ちいさい）
  assert.ok(wallBaseHp(1) < 400 && wallBaseHp(2) < 600);
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


// ---- v1.3.0 さいごの かべは ステージで かたく なる／ショップは もっと かかる ----
const vOf = (g, c) => g.type === 'add' ? c + g.val : g.type === 'sub' ? Math.max(1, c - g.val) : g.type === 'mul' ? c * g.val : Math.max(1, Math.floor(c / g.val));
const PICKS = { best: (a, b) => a >= b, rand: () => Math.random() < 0.5, worst: (a, b) => a < b };
function runWith(stage, ups, pick) {
  const e = new RunnerEngine(generateStageCourse(stage, 'slow'), normalizeSave({ speed: 'slow', upgrades: ups }));
  let last = null;
  for (let i = 0; i < 60 * 300 && !e.isFinished; i++) {
    const g = e.course.elements.find(x => x.type === 'GATE_PAIR' && !x.passed);
    e.setTargetX(g ? (pick(vOf(g.left, e.bulletCount), vOf(g.right, e.bulletCount)) ? -0.5 : 0.5) : 0);
    e.update(1 / 60, (n, d) => { if (n === 'clear') last = d; });
  }
  return last;
}
function rate(stage, ups, pick, n = 30) {
  let ok = 0, mult = 0;
  for (let i = 0; i < n; i++) { const r = runWith(stage, ups, pick); if (r.cleared) ok++; mult += r.finalMult; }
  return { clear: ok / n, mult: mult / n };
}

test('final wall gets tougher with the stage (ladder x1.45 per wall, much harder than v1.2)', () => {
  let prev = 0;
  for (let s = 1; s <= 40; s++) { const h = wallBaseHp(s); assert.ok(h >= prev, `stage ${s}`); prev = h; }
  const c = generateStageCourse(10, 'slow');
  for (let i = 1; i < c.walls.length; i++) assert.ok(Math.abs(c.walls[i].hp / c.walls[i - 1].hp - WALL.grow) < 0.02);
  assert.equal(c.walls[0].hp, c.walls[0].maxHp);
  const oldHp10 = (40 + 30 * 10) * 2 * 1.8;                       // v1.2 の ステージ10の 1まいめ
  assert.ok(c.walls[0].hp > oldHp10 * 5, `${c.walls[0].hp} vs ${oldHp10}`);
  assert.ok(wallBaseHp(20) > wallBaseHp(5) * 5);
  assert.ok(wallBaseHp(10, 'fast') < wallBaseHp(10, 'normal') && wallBaseHp(10, 'normal') < wallBaseHp(10, 'slow'));
  assert.equal(wallBaseHp(80), wallBaseHp(50));                    // 50いじょうは ひとしい
});

test('stage 1-2 stay forgiving even with fresh upgrades and careless gate picks', () => {
  const fresh = { startCount: 1, fireRate: 1, power: 1 };
  for (const s of [1, 2]) {
    assert.equal(rate(s, fresh, PICKS.best).clear, 1);
    assert.ok(rate(s, fresh, PICKS.rand, 60).clear >= 0.7, `rand stage ${s}`);
    assert.ok(rate(s, fresh, PICKS.worst, 60).clear >= 0.6, `worst stage ${s}`);
  }
});

test('mid/late stages: good gate-picking clears, careless picking can fall short, x20 is no longer automatic', () => {
  const typical = { 15: { startCount: 15, fireRate: 11, power: 15 }, 25: { startCount: 19, fireRate: 14, power: 19 }, 40: { startCount: 23, fireRate: 15, power: 20 } };
  for (const s of [15, 25, 40]) {
    const best = rate(s, typical[s], PICKS.best), worst = rate(s, typical[s], PICKS.worst), rand = rate(s, typical[s], PICKS.rand);
    assert.ok(best.clear >= 0.9, `best ${s}: ${best.clear}`);
    assert.ok(worst.clear <= 0.65, `worst ${s}: ${worst.clear}`);
    assert.ok(rand.clear <= 0.9 && rand.clear >= 0.1, `rand ${s}: ${rand.clear}`);   // てきとうは ときどき たりない
    assert.ok(best.mult < 18, `x20ばかりに ならない ${s}: ${best.mult}`);
    assert.ok(best.mult > rand.mult * 2 && best.mult > worst.mult * 2 && best.mult >= 4);
  }
  const maxed = rate(25, { startCount: 25, fireRate: 15, power: 20 }, PICKS.best, 20);
  assert.ok(maxed.clear === 1 && maxed.mult >= 8);
});

test('failing the wall is still gentle: nothing instant, grace period and retry kept', () => {
  const e = new RunnerEngine(generateStageCourse(20, 'slow'), normalizeSave({ speed: 'slow' }));
  assert.equal(WALL_GRACE, 5);
  e.delay = 0; e.bulletCount = 1; e.dist = e.course.finishY - 100;
  for (const el of e.course.elements) { el.passed = true; if (el.type === 'BLOCK') el.destroyed = true; }
  let ev = null, t = 0;
  for (; t < 60 * 60 && !e.isFinished; t++) e.update(1 / 60, (n, d) => { if (n === 'clear') ev = d; });
  assert.ok(ev && ev.cleared === false && ev.finalMult === 1);
  assert.ok(e.stuck >= WALL_GRACE && e.stuck < WALL_GRACE + 0.1);  // 5びょうは ちゃんと うてる
});

test('shop: costs rise a lot more (v1.3.0), early levels stay cheap, levels extended, old saves stay valid', () => {
  assert.equal(UPGRADES.startCount.maxLevel, 25);
  assert.equal(UPGRADES.fireRate.maxLevel, 15);
  assert.equal(UPGRADES.power.maxLevel, 20);
  let total = 0;
  for (const k of Object.keys(UPGRADES)) {
    let prev = 0;
    for (let l = 1; l < UPGRADES[k].maxLevel; l++) { const c = getUpgradeCost(k, l); assert.ok(c > prev); prev = c; total += c; }
    assert.equal(getUpgradeCost(k, UPGRADES[k].maxLevel), Infinity);
    assert.ok(getUpgradeCost(k, 1) <= 50 && getUpgradeCost(k, 3) <= 100, `${k} はじめは やすい`);
  }
  assert.ok(total >= 280000 && total <= 350000, `total ${total}`);   // v1.2: 約10まん → v1.3: 約14まん → v1.4.1: 約32まんコイン（かせぎが ふえた ぶん）
  // むかしの セーブ（20/15/15 ぜんぶ MAX）は そのまま、もっと のばせる。MAXを こえた かずは けずる
  const old = normalizeSave({ coins: 777, stage: 12, upgrades: { startCount: 20, fireRate: 15, power: 15 } });
  assert.deepEqual(old.upgrades, { startCount: 20, fireRate: 15, power: 15 });
  assert.equal(old.coins, 777);
  assert.ok(getUpgradeCost('startCount', 20) < Infinity && getUpgradeCost('power', 15) < Infinity && getUpgradeCost('fireRate', 15) === Infinity);
  assert.deepEqual(normalizeSave({ upgrades: { startCount: 99, fireRate: 99, power: 99 } }).upgrades, { startCount: 25, fireRate: 15, power: 20 });
});

test('economy: a careful player needs about 35-70 runs to max the shop (v1.2: about 19)', () => {
  const vals = [];
  for (let i = 0; i < 2; i++) {
    const u = { startCount: 1, fireRate: 1, power: 1 }; let coins = 0, stage = 1, runs = 0;
    while (!Object.keys(UPGRADES).every(k => u[k] >= UPGRADES[k].maxLevel) && runs < 150) {
      const e = new RunnerEngine(generateStageCourse(stage, 'slow'), normalizeSave({ speed: 'slow', upgrades: u }));
      let last = null;
      for (let f = 0; f < 60 * 300 && !e.isFinished; f++) {
        const g = e.course.elements.find(x => x.type === 'GATE_PAIR' && !x.passed);
        e.setTargetX(g ? (vOf(g.left, e.bulletCount) >= vOf(g.right, e.bulletCount) ? -0.5 : 0.5) : 0);
        e.update(1 / 60, (n, d) => { if (n === 'clear') last = d; });
      }
      runs++;
      coins += last.earnedCoins + (last.cleared ? Math.floor(last.earnedCoins * last.finalMult) : 0);
      if (last.cleared) stage++;
      for (;;) {
        let best = null;
        for (const k of Object.keys(UPGRADES)) { const c = getUpgradeCost(k, u[k]); if (c !== Infinity && (!best || c < best.c)) best = { k, c }; }
        if (!best || best.c > coins) break;
        coins -= best.c; u[best.k]++;
      }
    }
    vals.push(runs);
  }
  for (const r of vals) assert.ok(r >= 35 && r <= 70, `runs ${r}`);
});

import { fmtHp } from '../js/renderer.js';
test('wall HP label is short and never shows decimals', () => {
  assert.equal(fmtHp(55.6), '56');
  assert.equal(fmtHp(-0.8), '0');
  assert.equal(fmtHp(999), '999');
  assert.equal(fmtHp(1234), '1.3k');
  assert.equal(fmtHp(71250), '72k');
  assert.equal(fmtHp(187850), '188k');
  assert.equal(fmtHp(1250000), '1.3M');
  for (const hp of [1, 77.7, 4321.4, 99999.1, 287550, 5e6]) assert.ok(fmtHp(hp).length <= 5);
});

// ---- v1.3.1 いちどだけ セーブを リセット ----
import { RESET_EPOCH, RESET_KEY, resolveSave, loadSaveOnce } from '../js/rules.js';
function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, JSON.stringify(v)]));
  return { m, get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), set: (k, v) => { m.set(k, JSON.stringify(v)); return true; } };
}
test('one-time save reset: old saves are cleared once (speed kept), then progress is kept on every later launch', () => {
  const old = { coins: 5000, stage: 14, speed: 'fast', upgrades: { startCount: 20, fireRate: 15, power: 15 } };
  const st = fakeStorage({ math_runner_save: old });                // むかしの セーブ・marker なし
  const first = loadSaveOnce(st, 'math_runner_save');
  assert.deepEqual(first, { coins: 0, stage: 1, speed: 'fast', upgrades: { startCount: 1, fireRate: 1, power: 1 } });
  assert.equal(st.get(RESET_KEY), RESET_EPOCH);                     // marker を べつの キーに
  assert.deepEqual(st.get('math_runner_save'), first);              // しょきかした セーブを すぐ かきこむ
  // このあと あそぶ → セーブ → つぎの きどうでは リセットしない
  const played = { ...first, coins: 321, stage: 3, upgrades: { startCount: 4, fireRate: 2, power: 3 } };
  st.set('math_runner_save', played);
  for (let i = 0; i < 5; i++) assert.deepEqual(loadSaveOnce(st, 'math_runner_save'), played);
  assert.deepEqual(st.get('math_runner_save'), played);
});
test('one-time save reset: new players, broken data and the marker rules', () => {
  const st = fakeStorage();                                          // はじめての ひと
  assert.deepEqual(loadSaveOnce(st, 'math_runner_save'), defaultSaveData());
  assert.equal(st.get(RESET_KEY), RESET_EPOCH);
  assert.equal(defaultSaveData().speed, 'slow');                     // speed が ない/へん → ゆっくり
  assert.equal(resolveSave({ coins: 99, speed: 'zzz' }, undefined).save.speed, 'slow');
  assert.equal(resolveSave({ coins: 99 }, 'abc').didReset, true);    // marker が へんでも リセット（1かいだけ）
  assert.equal(resolveSave({ coins: 99, stage: 4 }, RESET_EPOCH).save.stage, 4);   // marker が あれば そのまま
  assert.equal(resolveSave({ coins: 99, stage: 4 }, RESET_EPOCH + 3).didReset, false);
  assert.equal(resolveSave(null, 0).didReset, false);               // もともと セーブが ない
  assert.ok(Number.isInteger(RESET_EPOCH) && RESET_EPOCH >= 1);
});

// ---- v1.4.0 モンスターの まと ----
import { RunnerRenderer, monsterOf, MONSTER_KINDS, MONSTER_POOL } from '../js/renderer.js';
function recCtx() {
  const calls = [], texts = [];
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k === 'fillText') return (t) => { texts.push(String(t)); calls.push(k); };
      return (...a) => { calls.push(k); };
    },
    set: () => true,
  });
  return { ctx, calls, texts };
}
test('monster blocks: 4 kinds (zombie/slime/one-eye/bat), varied by HP tier and id, same id = same monster', () => {
  assert.deepEqual([...MONSTER_KINDS].sort(), ['bat', 'cyclops', 'slime', 'zombie']);
  const seen = new Set(), byTier = [new Set(), new Set(), new Set()];
  for (let i = 0; i < 300; i++) for (const [tier, maxHp] of [[0, 20], [1, 80], [2, 300]]) {
    const b = { id: `blk_${230 + i * 520}_${i % 3}`, maxHp, hp: maxHp };
    const m = monsterOf(b); assert.equal(m.tier, tier);
    assert.deepEqual(monsterOf(b), m);                               // ちらつかない
    assert.ok(MONSTER_POOL[tier].includes(m.kind) && m.pal.length >= 2);
    seen.add(m.kind); byTier[tier].add(m.kind);
  }
  assert.equal(seen.size, 4);
  assert.ok(byTier[0].has('slime') && byTier[0].has('bat'));         // よわい なかま
  assert.ok(byTier[1].has('zombie') && byTier[1].has('cyclops') && byTier[2].has('cyclops'));
});

test('monster blocks draw safely on every kind, keep a big HP number, hit flash, and stay light (no shadowBlur)', () => {
  const r = new RunnerRenderer({ getContext: () => ({}) });
  for (const maxHp of [20, 80, 300]) for (let i = 0; i < 12; i++) for (const flash of [0, 0.1]) {
    const { ctx, calls, texts } = recCtx(); r.time = 1.3;
    r.drawBlock(ctx, 100, 200, { id: `blk_${i * 777}_${i % 3}`, maxHp, hp: maxHp * 0.6, flash });
    assert.deepEqual(texts, [String(Math.ceil(maxHp * 0.6))]);        // HPの かずは ちゃんと かく
    assert.ok(calls.length < 140, `くうよう すくなめ: ${calls.length}`);
  }
  // かべ（ボス）：×と HP、しゃぼん なし
  for (const flash of [0, 0.1]) {
    const { ctx, texts, calls } = recCtx();
    r.drawWall(ctx, 200, 300, { mult: 20, hp: 187850, maxHp: 187850, flash }, 300);
    assert.deepEqual(texts, ['×20  [188k]']);
    assert.ok(calls.length < 140);
  }
  // ふつうの ゲームの うごきで ブロックが 1フレームに たくさん でても 軽い（おおくても 6こ ほど）
  const c = generateStageCourse(10, 'slow'); assert.ok(c.elements.filter(e => e.type === 'BLOCK').length >= 6);
});

test('blocks keep their hit flash and HP logic (engine unchanged for blocks); wall flashes when hit', () => {
  const e = new RunnerEngine(generateStageCourse(1, 'slow'), normalizeSave({ speed: 'slow', upgrades: { startCount: 6 } }));
  for (const el of e.course.elements) if (el.type === 'GATE_PAIR') el.passed = true;
  e.delay = 99; e.playerX = e.targetX = 0.4;                         // ブロックの まえに たつ
  let flashed = false;
  for (let i = 0; i < 60 * 3; i++) { e.update(1 / 60); if (e.course.elements.some(x => x.type === 'BLOCK' && x.flash > 0)) flashed = true; }
  assert.ok(flashed);
  const w = e.course.walls[0]; e.isWallPhase = true; e.dist = w.y - 100; e.delay = 0; e.bulletCount = 3;
  let wallFlash = false;
  for (let i = 0; i < 60 * 2; i++) { e.update(1 / 60); if (w.flash > 0) wallFlash = true; }
  assert.ok(wallFlash && w.hp < w.maxHp);
});

// ---- v1.4.1 たまの かずの じょうげん UP・みじかい ひょうじ・かたい ブロック ----
import { fmtNum, fmtCoin, blockBaseHp, BLOCK, RAM_MUL } from '../js/rules.js';
test('count cap raised a lot (999 -> 99,999,999) and big numbers are formatted compactly', () => {
  assert.ok(LIMITS.count >= 99999999);
  assert.equal(applyGate(1000, { type: GATE_TYPES.MUL, val: 4 }), 4000);
  const e = new RunnerEngine(generateStageCourse(5, 'slow'), normalizeSave({ speed: 'slow' }));
  e.bulletCount = 4_000_000; e.spawnBullets();
  assert.equal(e.bullets.length, STREAM.maxVisible);                    // たくさん でも ほそい ながれ
  assert.ok(Math.abs(e.bullets.reduce((a, b) => a + b.power, 0) - 4_000_000 * e.bulletPower) < 1);
  const cases = { 0: '0', 7: '7', 999: '999', 1000: '1.0k', 1234: '1.3k', 12345: '13k', 187850: '188k', 999999: '1.0M', 2500000: '2.5M', 99999999: '100M', 3e9: '3.0B' };
  for (const [v, t] of Object.entries(cases)) assert.equal(fmtNum(+v), t, v);
  for (const v of [1, 99, 1e3, 5e4, 6.5e5, 7.7e6, 1e8, 4e9, 1e11]) assert.ok(fmtNum(v).length <= 5, `${v} -> ${fmtNum(v)}`);  // HUD・ブロックに おさまる
  assert.equal(fmtCoin(99999), '99999');
  assert.equal(fmtCoin(125000), '125k');
  // HUD の x かず・ブロック・かべ：どんなに おおきくても みじかい もじ
  const r = new RunnerRenderer({ getContext: () => ({}) });
  const { ctx, texts } = recCtx();
  r.drawBlock(ctx, 50, 50, { id: 'blk_1_0', hp: 8_765_432, maxHp: 9_000_000, flash: 0 });
  r.drawWall(ctx, 100, 100, { mult: 20, hp: 2.5e10, maxHp: 3e10, flash: 0 }, 300);
  assert.deepEqual(texts, ['8.8M', '×20  [25B]']);
});

test('blocks are much tougher: HP grows with stage and row, coins unchanged, ram penalty gentle', () => {
  assert.equal(RAM_MUL, 0.8);
  for (const s of [3, 8, 15, 30]) { for (let i = 1; i < 6; i++) assert.ok(blockBaseHp(s, i) >= blockBaseHp(s, i - 1) * 0.99, `s${s} row${i}`); }
  assert.ok(blockBaseHp(15, 5) > blockBaseHp(8, 5) && blockBaseHp(8, 5) > blockBaseHp(3, 5));
  const c = generateStageCourse(15, 'slow');
  const blocks = c.elements.filter(x => x.type === 'BLOCK');
  const oldHp = (10 + 15 * 8) * 2;                                         // v1.3 の ブロックHP（ほぼ）
  const rows = [...new Set(blocks.map(b => b.y))].sort((a, b) => a - b);
  const lastRow = blocks.filter(b => b.y === rows[rows.length - 1]);
  assert.ok(lastRow.every(b => b.maxHp > oldHp * 20), `${lastRow[0].maxHp} vs ${oldHp}`);
  assert.ok(blocks.every(b => b.coin >= 3 && b.coin < 80), 'コインは HPに よらない');
  assert.ok(blocks.filter(b => b.y === rows[0]).every(b => b.tier === 1) && blocks.filter(b => b.y === rows[rows.length - 1]).every(b => b.tier === 2));
  assert.ok(generateStageCourse(2, 'slow').elements.filter(x => x.type === 'BLOCK').some(b => b.tier === 0));
  // ぶつかると かずが 0.8ばいに（ゼロには ならない）
  const e = new RunnerEngine(generateStageCourse(3, 'slow'), normalizeSave({ speed: 'slow' }));
  e.delay = 0; e.bulletCount = 100; const blk = e.course.elements.find(x => x.type === 'BLOCK');
  for (const el of e.course.elements) if (el.type === 'GATE_PAIR') el.passed = true;
  e.bullets.length = 0; e.dist = blk.y - 5; e.playerX = e.targetX = blk.laneNorm; e.shootTimer = 99;
  e.update(1 / 120);
  assert.equal(e.bulletCount, 80);
});

function ttkStats(stage, ups, pick, runs = 6) {
  const ttk = []; let rams = 0, kills = 0;
  for (let k = 0; k < runs; k++) {
    const e = new RunnerEngine(generateStageCourse(stage, 'slow'), normalizeSave({ speed: 'slow', upgrades: ups }));
    const first = new Map(), done = new Set();
    for (let i = 0; i < 60 * 200 && !e.isFinished && !e.isWallPhase; i++) {
      const g = e.course.elements.find(x => x.type === 'GATE_PAIR' && !x.passed);
      e.setTargetX(g ? (pick(vOf(g.left, e.bulletCount), vOf(g.right, e.bulletCount)) ? -0.5 : 0.5) : 0);
      e.update(1 / 60);
      for (const b of e.course.elements) if (b.type === 'BLOCK') {
        if (!first.has(b.id) && b.hp < b.maxHp) first.set(b.id, e.time);
        if (b.destroyed && !done.has(b.id)) { done.add(b.id); if (b.hp <= 0) { kills++; if (first.has(b.id)) ttk.push(e.time - first.get(b.id)); } else rams++; }
      }
    }
  }
  ttk.sort((a, b) => a - b);
  return { med: ttk[ttk.length >> 1] || 0, rams: rams / Math.max(1, rams + kills) };
}
test('auto-fire block fights: a block takes a visible moment to chip; careless players often get rammed', () => {
  const ups = { startCount: 15, fireRate: 11, power: 15 };                 // ステージ15 の ふつうの ショップ
  const good = ttkStats(15, ups, (a, b) => Math.random() < 0.8 ? a >= b : a < b);
  const best = ttkStats(15, ups, PICKS.best);
  const rand = ttkStats(15, ups, PICKS.rand);
  assert.ok(good.med >= 0.25 && good.med <= 3, `good ttk ${good.med}`);
  assert.ok(best.med >= 0.05 && best.med <= good.med + 0.3, `best ttk ${best.med}`);
  assert.ok(rand.med >= 0.8 && rand.med <= 5, `rand ttk ${rand.med}`);
  assert.ok(good.rams <= 0.25 && rand.rams >= 0.3 && rand.rams > good.rams, `rams good ${good.rams} rand ${rand.rams}`);
  // むかしは 0.00びょう（いっしゅん）だった
  const oldHpBlock = (10 + 15 * 8) * 2;
  assert.ok(blockBaseHp(15, 4) / (oldHpBlock) > 50);
});
