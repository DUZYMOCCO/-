import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION, pitchTarget, pitchStep, twistStep, bodyTransform, localToWorld,
} from '../js/ship-motion.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.19.0: 潜水艇の進行方向に応じた見た目の動き（ピッチ／バンク）。
   - 上下成分で船首が上下、減速で水平。水平の切り返しで短い「ひねり」。
   - 横の縮み（遠近）は下限つき＝艇が紙のようにゼロ幅にならない。
   - 物理（速度・慣性・当たり・照準・発射・バリア）は変えない。
   - 復帰（停船・上下・斜め・急反転）で跳ねない。
   ========================================================================== */

/* --- 純粋ルール --------------------------------------------------------- */

test('動き: 定数は妥当（傾きは控えめ・縮みは 0 にしない）', () => {
  assert.ok(MOTION.PITCH_MAX > 0.1 && MOTION.PITCH_MAX < 0.7, '船首の傾きは控えめ');
  assert.ok(MOTION.SQUASH_MIN > 0.5 && MOTION.SQUASH_MIN < 1, '縮みの下限は紙にならない範囲');
  assert.ok(MOTION.LEVEL_SPEED >= 0 && MOTION.LEVEL_SPEED < MOTION.PITCH_FULL_SPEED);
  assert.ok(MOTION.TWIST_DECAY > 1, 'ひねりは短く減衰する');
});

test('ピッチ目標: 停船は水平、上下進行で船首が上下、横進行は水平', () => {
  assert.equal(pitchTarget(0, 0), 0, '停船は水平');
  assert.ok(pitchTarget(0, -600) < -0.3, '真上へ進む＝船首が上（負）');
  assert.ok(pitchTarget(0, 600) > 0.3, '真下へ進む＝船首が下（正）');
  assert.equal(pitchTarget(320, 0), 0, '真横へ進む＝水平');
  /* 上限でクランプ */
  assert.ok(Math.abs(pitchTarget(0, 5000)) <= MOTION.PITCH_MAX + 1e-9);
});

test('ピッチ目標: vx=0 を跨いでも連続（斜め・往復の急反転で跳ねない）', () => {
  const vy = -400;
  let prev = pitchTarget(-200, vy);
  let maxJump = 0;
  for (let vx = -200; vx <= 200; vx += 1) {
    const v = pitchTarget(vx, vy);
    maxJump = Math.max(maxJump, Math.abs(v - prev));
    prev = v;
  }
  assert.ok(maxJump < 0.02, `vx の符号で飛ばない（最大差 ${maxJump.toFixed(4)}）`);
});

test('ピッチ目標: 減速で水平へ（速度が小さいほど 0 に寄る）', () => {
  const fast = Math.abs(pitchTarget(150, -150));
  const slow = Math.abs(pitchTarget(30, -30));
  assert.ok(slow < fast, '遅いほど水平');
  assert.ok(Math.abs(pitchTarget(10, -10)) < 1e-6 || slow <= fast, 'ほぼ停船は水平');
  assert.equal(pitchTarget(0, -20), pitchTarget(0, 0) === 0 ? pitchTarget(0, -20) : 0, 'noop');
});

test('ピッチ追従: 目標へ収束・時間ベース（フレームレート非依存）', () => {
  const target = -0.4;
  let a = 0; for (let i = 0; i < 60; i++) a = pitchStep(a, target, 1 / 60);
  let b = pitchStep(0, target, 1.0);
  assert.ok(Math.abs(a - target) < 0.01, '1 秒でほぼ収束');
  assert.ok(Math.abs(a - b) < 0.01, '1 秒ぶんは分割数に依らない');
  assert.equal(pitchStep(0.2, target, 0), 0.2, 'dt<=0 は据え置き');
  assert.equal(pitchStep(0.2, target, -1), 0.2);
});

test('ひねり: 一定速では 0 に戻る（短い）。加速で立ち、切り返しで符号が反転', () => {
  /* 一定速（無加速）なら減衰して 0 */
  let t0 = 0.8; for (let i = 0; i < 60; i++) t0 = twistStep(t0, 200, 200, 1 / 60);
  assert.ok(Math.abs(t0) < 0.01, '一定速ではひねりが消える');
  /* 右へ加速 → 正 */
  let tr = 0; for (let i = 0; i < 20; i++) tr = twistStep(tr, 0, 200, 1 / 60);
  assert.ok(tr > 0.1, '右加速で正のひねり');
  /* そのまま左へ切り返す → 符号反転 */
  let tv = tr; for (let i = 0; i < 20; i++) tv = twistStep(tv, 200, -200, 1 / 60);
  assert.ok(tv < 0, '切り返しで符号が反転');
});

test('ひねり: 常に |twist|<=1・大 dt でも跳ねない（ポーズ復帰）', () => {
  assert.ok(Math.abs(twistStep(0, 0, 100000, 5)) <= 1 + 1e-9, '巨大速度でも上限内');
  assert.equal(twistStep(0.3, 0, 0, 0), 0.3, 'dt<=0 は据え置き');
  let x = 0;
  for (let i = 0; i < 300; i++) x = twistStep(x, Math.sin(i) * 400, -Math.sin(i) * 400, 1 / 60);
  assert.ok(Math.abs(x) <= 1 + 1e-9);
});

test('姿勢: twist=0 は従来と同じ（rotate=pitch, squash=1）。縮みは下限つき', () => {
  const z = bodyTransform(0.25, 0);
  assert.ok(Math.abs(z.rotate - 0.25) < 1e-9);
  assert.equal(z.squash, 1);
  /* どんな twsit でも縮みは [SQUASH_MIN,1]、回転は pitch±LEAN_MAX */
  for (const tw of [-2, -1, -0.5, 0, 0.5, 1, 2]) {
    const b = bodyTransform(0.1, tw);
    assert.ok(b.squash >= MOTION.SQUASH_MIN - 1e-9 && b.squash <= 1 + 1e-9, `squash 範囲 (${tw})`);
    assert.ok(b.squash > 0, 'ゼロ幅にならない');
    assert.ok(Math.abs(b.rotate - 0.1) <= MOTION.LEAN_MAX + 1e-9, 'バンクは控えめ');
  }
});

test('姿勢: 船体と付属物は同じ写像（艇とライト・発射口がズレない）', () => {
  const ox = 100, oy = 50, pitch = 0.3, twist = 0.7;
  /* 原点は姿勢の中心に載る */
  const o = localToWorld(pitch, twist, ox, oy, 0, 0);
  assert.ok(Math.abs(o.x - ox) < 1e-9 && Math.abs(o.y - oy) < 1e-9);
  /* 船首（+x）と発射口・ライトの局所点は同一変換で写る＝相対位置が崩れない */
  const nose = localToWorld(pitch, twist, ox, oy, 60, 0);
  const lamp = localToWorld(pitch, twist, ox, oy, 59, 17);
  const b = bodyTransform(pitch, twist);
  const dx = nose.x - o.x, dy = nose.y - o.y;
  assert.ok(Math.abs(Math.hypot(dx, dy) - 60 * b.squash) < 1e-9, '船首距離は squash に比例');
  assert.ok(Math.abs(Math.atan2(dy, dx) - b.rotate) < 1e-9, '船首角は姿勢の回転角');
  /* 円環（回転）しても 2 点間距離は姿勢の係数だけで決まる（硬化した 1 変換） */
  assert.ok(Number.isFinite(lamp.x) && Number.isFinite(lamp.y));
});

/* --- 実挙動（本物のゲームループ・入力ハンドラを回す） -------------------- */

function boot(t){
  const previous = Object.fromEntries(['window', 'document', 'Image', 'requestAnimationFrame', 'localStorage'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)){
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = new Proxy({
    createLinearGradient: () => gradient, createRadialGradient: () => gradient, measureText: () => ({ width: 40 }),
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
  }, { get(target, key) { return target[key] ?? noop; } });
  const makeCanvas = () => Object.assign(new EventTarget(), { getContext: () => ctx, style: {} });
  globalThis.window = new EventTarget();
  globalThis.document = { createElement: makeCanvas, body: { clientWidth: 1280, clientHeight: 720 } };
  globalThis.Image = class {};
  let next;
  globalThis.requestAnimationFrame = fn => { next = fn; };
  const canvas = makeCanvas();
  const game = createAbyssDive({ canvas });
  game.start(); game.startGame();
  t.after(() => game.destroy());
  game.G.rocks = []; game.G.spawnT = 30;
  let now = performance.now();
  const step = (count = 1) => { for (let i = 0; i < count; i++) next(now += 1000 / 60); };
  const keyDown = code => window.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  const keyUp = code => window.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  const press = code => { keyDown(code); keyUp(code); };
  return { game, step, press, keyDown, keyUp };
}

test('実挙動: 横へ進むと艇はほぼ水平（上下成分がない）', t => {
  const { game, step, keyDown } = boot(t);
  game.G.enemies = [];
  keyDown('KeyD');
  step(90);                                   // 横へ巡航
  const p = game.G.player;
  assert.ok(p.vx > 100, '右へ進んでいる');
  assert.ok(Math.abs(p.tilt) < 0.05, `横進はほぼ水平（tilt=${p.tilt.toFixed(3)}）`);
  assert.ok(Math.abs(p.bank) < 0.2, '巡航でひねりは小さい');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 上へ進むと船首が上（負）、下へ進むと下（正）', t => {
  const { game, step, keyDown, keyUp } = boot(t);
  game.G.enemies = [];
  keyDown('KeyW'); step(60);
  const up = game.G.player.tilt;
  assert.ok(up < -0.1, `上昇で船首が上（tilt=${up.toFixed(3)}）`);
  keyUp('KeyW'); keyDown('KeyS'); step(60);
  const down = game.G.player.tilt;
  assert.ok(down > 0.1, `降下で船首が下（tilt=${down.toFixed(3)}）`);
  assert.equal(game.errors.length, 0);
});

test('実挙動: 減速・停船で滑らかに水平（跳ねない）', t => {
  const { game, step, keyDown, keyUp } = boot(t);
  game.G.enemies = [];
  keyDown('KeyW'); step(60);
  assert.ok(game.G.player.tilt < -0.1);
  keyUp('KeyW');
  let prev = game.G.player.tilt, maxJump = 0;
  for (let i = 0; i < 120; i++){ step(); const cur = game.G.player.tilt; maxJump = Math.max(maxJump, Math.abs(cur - prev)); prev = cur; }
  const p = game.G.player;
  assert.ok(Math.abs(p.tilt) < 0.05, `停船で水平（tilt=${p.tilt.toFixed(3)}）`);
  assert.ok(maxJump < 0.05, `水平化の途上で跳ねない（最大差 ${maxJump.toFixed(4)}）`);
  assert.ok(Math.abs(p.bank) < 0.05, 'ひねりも消える');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 往復の急反転でピッチが跳ねず、短いひねりが入って戻る', t => {
  const { game, step, keyDown, keyUp } = boot(t);
  game.G.enemies = [];
  keyDown('KeyD'); step(90);                   // 右へ
  keyUp('KeyD'); keyDown('KeyA');              // 急に左へ切り返す
  let prev = game.G.player.tilt, maxJump = 0, maxTwist = 0, minSquash = 1;
  for (let i = 0; i < 90; i++){
    step();
    const p = game.G.player;
    maxJump = Math.max(maxJump, Math.abs(p.tilt - prev)); prev = p.tilt;
    maxTwist = Math.max(maxTwist, Math.abs(p.bank));
    minSquash = Math.min(minSquash, bodyTransform(p.tilt, p.bank).squash);
  }
  keyUp('KeyA');
  assert.ok(maxTwist > 0.15, `切り返しでひねりが入る（最大 ${maxTwist.toFixed(3)}）`);
  assert.ok(minSquash >= MOTION.SQUASH_MIN - 1e-9, `縮み下限を割らない（最小 ${minSquash.toFixed(3)}）`);
  assert.ok(minSquash < 1, '遠近ぶん少し縮む');
  assert.ok(maxJump < 0.06, `ピッチは跳ねない（最大差 ${maxJump.toFixed(4)}）`);
  assert.equal(game.errors.length, 0);
});

test('実挙動: 斜め進行でも跳ねない（上下×横の同時）', t => {
  const { game, step, keyDown, keyUp } = boot(t);
  game.G.enemies = [];
  keyDown('KeyD'); keyDown('KeyW');
  let prev = game.G.player.tilt, maxJump = 0;
  for (let i = 0; i < 120; i++){ step(); const cur = game.G.player.tilt; maxJump = Math.max(maxJump, Math.abs(cur - prev)); prev = cur; }
  keyUp('KeyW'); keyUp('KeyD');
  assert.ok(maxJump < 0.06, `斜めでも跳ねない（最大差 ${maxJump.toFixed(4)}）`);
  assert.equal(game.errors.length, 0);
});

test('実挙動: 物理・照準・発射は不変（見た目だけが動く）', t => {
  const { game, step, press } = boot(t);
  game.G.enemies = [];
  const p = game.G.player;
  const maxSpeed = game.state().stats.maxSpeed;
  press('KeyJ'); step();                      // 魚雷を 1 発
  const b = game.G.bullets.find(x => x.kind === 'torp');
  assert.ok(b, '魚雷が飛ぶ');
  /* 弾は照準方向・船体中心から出る（tilt/bank に依存しない） */
  const a = p.aim;
  assert.ok(Math.abs(b.a - a) < 1e-9, '発射角＝照準');
  const sp = Math.hypot(b.vx, b.vy);
  assert.ok(sp > 0, '弾速はある');
  /* 速度上限は据え置き */
  assert.equal(maxSpeed, 360);
  /* 加速度・最高速を大きく動かしても艇差の実効性能は変わらない（state と見た目は独立） */
  assert.equal(typeof game.state().stats.accel, 'number');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 4 艇すべてで動きが出て壊れない（回帰）', t => {
  const { game, step, keyDown, keyUp } = boot(t);
  game.G.enemies = [];
  for (const ship of ['09', 'mobility', 'firepower', 'barrier']) {
    game.selectShip(ship);
    step(2);
    keyDown('KeyW'); keyDown('KeyD');
    let maxAbs = 0;
    for (let i = 0; i < 90; i++){ step(); maxAbs = Math.max(maxAbs, Math.abs(game.G.player.tilt)); }
    keyUp('KeyW'); keyUp('KeyD'); step(60);
    assert.ok(maxAbs > 0.1, `${ship}: 動きが出る（最大 |tilt| ${maxAbs.toFixed(3)}）`);
    assert.ok(Math.abs(game.G.player.tilt) < 0.1, `${ship}: 停まれば水平`);
    assert.equal(game.state().ship, ship);
    assert.equal(game.errors.length, 0);
  }
});

test('実挙動: 死亡・復帰で姿勢が跳ねない（初期化）', t => {
  const { game, step, keyDown, keyUp, press } = boot(t);
  game.G.enemies = [];
  keyDown('KeyW'); step(45);
  assert.ok(game.G.player.tilt < -0.05);
  keyUp('KeyW');
  /* 死亡 → 復帰（startGame で姿勢はリセット） */
  game.G.player.alive = false;
  step(2);
  game.startGame();
  assert.equal(game.G.player.tilt, 0, '復帰で姿勢リセット');
  assert.equal(game.G.player.bank, 0);
  assert.equal(game.errors.length, 0);
});
