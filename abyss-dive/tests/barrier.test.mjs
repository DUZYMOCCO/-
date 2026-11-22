import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BARRIER, createBarrierState, barrierReady, barrierReadyProgress, barrierCharge,
  deployBarrier, tickBarrier, presentHit, endBarrierFrame, closeBarrier,
} from '../js/barrier-rules.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.13.0: 瞬間バリア（緊急回避の置き換え）。
   - 進行方向・速度を変えない（旧ダッシュの押し飛ばしを残さない）。
   - 発動 0.4s / 耐久は標準弾 1 発分 / 再使用 2.0s。
   - ジャスト受付 0.12s。完全防御・膜消費・再使用待ちゼロ。次の押し直しで別の攻撃を防げる。
   - 通常ガード・空振りは再使用待ち。押しっぱなし／キーリピートでは連続発動しない。
   - 同一の持続接触で連続ジャスト払い戻しをしない。連続接触の吸収は間引く。
   - 被弾無敵・岩との衝突とは別。
   ========================================================================== */

/* --- 純粋ルール --------------------------------------------------------- */

test('バリア: 既定値（0.4s / 耐久 1 発分 / 再使用 2.0s / ジャスト 0.12s）', () => {
  assert.equal(BARRIER.DURATION, 0.4);
  assert.equal(BARRIER.COOLDOWN, 2.0);
  assert.equal(BARRIER.JUST, 0.12);
  assert.equal(BARRIER.DURABILITY, 10);   // バーナクル／クラゲ級の 1 発をちょうど吸収
  const st = createBarrierState();
  assert.equal(st.active, false);
  assert.equal(barrierReady(st), true, 'メッセージ: 初期は発動できる');
});

test('バリア: 空振りは再使用待ちに入る（発動→持続切れ→2.0s）', () => {
  const st = createBarrierState();
  assert.equal(deployBarrier(st), true, 'メッセージ: 発動');
  assert.equal(st.active, true);
  assert.equal(barrierReady(st), false, 'メッセージ: 発動中は押し直せない');
  assert.equal(deployBarrier(st), false, 'メッセージ: 発動中の再発動はしない（長押し対策）');
  /* 持続ぶん進めて空振り終了 */
  tickBarrier(st, BARRIER.DURATION + 1e-6);
  assert.equal(st.active, false);
  assert.equal(st.cooldown, BARRIER.COOLDOWN, 'メッセージ: 空振りは待ちあり');
  assert.equal(barrierReady(st), false);
  assert.equal(barrierReadyProgress(st), 0, 'メッセージ: 待ち始めは 0');
  tickBarrier(st, BARRIER.COOLDOWN / 2);
  assert.ok(Math.abs(barrierReadyProgress(st) - 0.5) < 1e-6, 'メッセージ: 半分');
  tickBarrier(st, BARRIER.COOLDOWN);
  assert.equal(barrierReady(st), true, 'メッセージ: 2.0s で再使用可');
  assert.equal(barrierReadyProgress(st), 1);
});

test('バリア: ジャストは完全防御・膜消費・待ち時間ゼロ（次の押し直しで別の攻撃を狙える）', () => {
  const st = createBarrierState();
  deployBarrier(st);
  tickBarrier(st, BARRIER.JUST);                 // ちょうど受付内
  const r = presentHit(st, 'a', 26);             // 機雷級でも完全防御
  assert.equal(r.kind, 'just');
  assert.equal(r.overflow, 0, 'メッセージ: 超過は船体へ通さない');
  assert.equal(st.active, false, 'メッセージ: 膜を消費して閉じる');
  assert.equal(st.cooldown, 0, 'メッセージ: 待ち時間ゼロ');
  assert.equal(barrierReady(st), true, 'メッセージ: すぐ押し直せる');
  /* 別の攻撃（別 key）は再びジャストで狙える */
  deployBarrier(st);
  tickBarrier(st, 0);
  assert.equal(presentHit(st, 'b', 10).kind, 'just', 'メッセージ: 別の攻撃は再度ジャスト');
});

test('バリア: ジャスト受付の境界（0.12s 以内はジャスト、超えると通常吸収）', () => {
  const just = createBarrierState();
  deployBarrier(just);
  tickBarrier(just, BARRIER.JUST);               // = 0.12
  assert.equal(presentHit(just, 'k', 4).kind, 'just');
  const over = createBarrierState();
  deployBarrier(over);
  tickBarrier(over, BARRIER.JUST + 0.02);        // 受付を少し超える
  assert.equal(presentHit(over, 'k', 4).kind, 'absorb', 'メッセージ: 受付を超えると通常吸収');
  /* 持続時間を伸ばしてもジャスト受付は伸びない */
  const late = createBarrierState();
  deployBarrier(late);
  tickBarrier(late, BARRIER.DURATION - 0.05);    // まだ持続中だが受付は過ぎている
  assert.equal(late.active, true);
  assert.equal(presentHit(late, 'k', 4).kind, 'absorb');
});

test('バリア: 通常ガードは耐久まで吸収、超過分だけ船体（全吸収はノックバックなし＝速度に触らない）', () => {
  const st = createBarrierState();
  deployBarrier(st);
  tickBarrier(st, 0.2);
  let r = presentHit(st, 'e1', 4);
  assert.equal(r.kind, 'absorb');
  assert.equal(r.absorbed, 4);
  assert.equal(r.overflow, 0);
  assert.equal(st.durability, BARRIER.DURABILITY - 4);
  assert.equal(st.active, true, 'メッセージ: 耐久が残れば膜は続く');
  /* 耐久ちょうどで割れる */
  r = presentHit(st, 'e2', 6);
  assert.equal(r.kind, 'break');
  assert.equal(r.absorbed, 6);
  assert.equal(r.overflow, 0);
  assert.equal(st.active, false);
  assert.equal(st.cooldown, BARRIER.COOLDOWN);
});

test('バリア: 耐久を超えた一撃は超過分だけ通す（例: 26 → 10 吸収 + 16 船体）', () => {
  const st = createBarrierState();
  deployBarrier(st);
  tickBarrier(st, 0.2);
  const r = presentHit(st, 'bomb', 26);
  assert.equal(r.kind, 'break');
  assert.equal(r.absorbed, BARRIER.DURABILITY);
  assert.equal(r.overflow, 26 - BARRIER.DURABILITY);
});

test('バリア: 同一の持続接触では連続ジャスト払い戻しをしない（離れると再び取れる）', () => {
  const st = createBarrierState();
  deployBarrier(st);
  assert.equal(presentHit(st, 'x', 4).kind, 'just');   // 1 回目
  st.hitGate.clear();                                   // 間引きだけ解除（接触は続いている想定）
  deployBarrier(st);                                    // 押し直し
  assert.equal(presentHit(st, 'x', 4).kind !== 'just', true, 'メッセージ: 同一の持続接触でジャストにしない');
  /* 接触が離れて（提示の無いフレームが続いて）latch が外れれば、次はまたジャストで取れる */
  endBarrierFrame(st);                                  // 前フレームぶんを処理
  endBarrierFrame(st);                                  // 提示の無いフレーム → 解放
  st.hitGate.clear();
  st.active = false; st.cooldown = 0;
  deployBarrier(st);
  assert.equal(presentHit(st, 'x', 4).kind, 'just', 'メッセージ: 離れて再接近なら再びジャスト');
});

test('バリア: 連続接触の吸収は間引く（毎フレームで耐久がドレインしない）', () => {
  const st = createBarrierState();
  deployBarrier(st);
  tickBarrier(st, 0.15);                                // 受付窓は過ぎている
  assert.equal(presentHit(st, 'touch', 4).kind, 'absorb');
  assert.equal(presentHit(st, 'touch', 4).kind, 'gated', 'メッセージ: 直近に吸収した源は無視');
  assert.equal(st.durability, BARRIER.DURABILITY - 4, 'メッセージ: ドレインしない');
  tickBarrier(st, BARRIER.REHIT + 1e-6);                // 間引きが切れる（まだ持続中）
  assert.equal(st.active, true, 'メッセージ: まだ持続中');
  assert.equal(presentHit(st, 'touch', 4).kind, 'absorb', 'メッセージ: 間引き後は再び吸収');
});

test('バリア: 稼働中でなければ通常被弾（none）＝呼び側が船体へ通す', () => {
  const st = createBarrierState();
  assert.equal(presentHit(st, 'e', 8).kind, 'none');
  assert.equal(presentHit(st, 'e', 8).overflow, 8);
});

test('バリア: closeBarrier は待ち・膜・ラッチを持ち越さない（降艇・出入港・やり直し）', () => {
  const st = createBarrierState();
  deployBarrier(st);
  presentHit(st, 'k', 4);
  closeBarrier(st);
  assert.equal(st.active, false);
  assert.equal(st.cooldown, 0);
  assert.equal(st.durability, 0);
  assert.equal(barrierReady(st), true);
  assert.equal(barrierCharge(st), 0);
});

/* --- 実挙動（本物のゲームループ・入力ハンドラを回す） -------------------- */

function boot(t){
  const previous = Object.fromEntries(['window', 'document', 'Image', 'requestAnimationFrame', 'fetch'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
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
  const press = code => {
    for (const event of ['keydown', 'keyup']) window.dispatchEvent(Object.assign(new Event(event), { code }));
  };
  const reset = () => { game.G.enemies = []; game.G.ebullets = []; game.G.bullets = []; game.G.rocks = []; };
  return { game, step, press, reset };
}

test('実挙動: 発動しても艇の速度・方向は変わらない（旧ダッシュの押し飛ばしを残さない）', t => {
  const { game, step, press, reset } = boot(t);
  reset();
  const p = game.G.player;
  p.vx = 220; p.vy = -60;
  const vx0 = p.vx, vy0 = p.vy;
  press('Space');
  step();
  assert.equal(game.state().barrier.active, true, 'メッセージ: 発動した');
  /* 1 フレームの減衰ぶんだけ。旧ダッシュは cos*780 を足していた（残っていれば数百変わる）。 */
  assert.ok(Math.abs(p.vx - vx0) < 80, 'メッセージ: 速度は押し飛ばされない（vx=' + p.vx.toFixed(1) + '）');
  assert.ok(Math.abs(p.vy - vy0) < 80, 'メッセージ: 速度は押し飛ばされない（vy=' + p.vy.toFixed(1) + '）');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 通常ガードで弾を吸収（船体は減らない・青白い波紋が出る）', t => {
  const { game, step, press, reset } = boot(t);
  reset();
  const p = game.G.player;
  press('Space'); step(12);                             // 受付窓の外へ（t≈0.18）
  assert.equal(game.state().barrier.active, true);
  assert.equal(game.state().barrier.durability, 10);
  const hp0 = p.hp;
  game.G.ebullets = [{ gid: 1, x: p.x, y: p.y, vx: 0, vy: 0, r: 7, dmg: 6, life: 1, a: 0 }];
  step();
  assert.equal(p.hp, hp0, 'メッセージ: 吸収（船体は減らない）');
  assert.equal(game.state().barrier.active, true, 'メッセージ: 耐久が残れば膜は続く');
  assert.ok(game.G.rings.length > 0, 'メッセージ: 波紋が出る');
  assert.equal(game.errors.length, 0);
});

test('実挙動: ジャスト（発動直後に重なる一撃）は完全防御し、すぐ押し直せる', t => {
  const { game, step, press, reset } = boot(t);
  reset();
  const p = game.G.player;
  let justs = 0;
  game.AU.barrierJust = () => { justs++; };
  const hp0 = p.hp;
  /* 発動と同時に重なる弾を置く（経過 1 フレーム＝受付内） */
  game.G.ebullets = [{ gid: 3, x: p.x, y: p.y, vx: 0, vy: 0, r: 7, dmg: 6, life: 1, a: 0 }];
  press('Space'); step();
  assert.equal(justs, 1, 'メッセージ: ジャストが成立');
  assert.equal(p.hp, hp0, 'メッセージ: 完全防御（船体は減らない）');
  assert.equal(game.state().barrier.active, false, 'メッセージ: 膜を消費して閉じる');
  assert.equal(game.state().barrier.cooldown, 0, 'メッセージ: 待ち時間ゼロ');
  assert.equal(game.state().barrier.ready, true, 'メッセージ: すぐ押し直せる');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 耐久を超えた一撃は超過分だけ船体へ・膜は割れて再使用待ち', t => {
  const { game, step, press, reset } = boot(t);
  reset();
  const p = game.G.player;
  press('Space'); step(12);
  const hp0 = p.hp;
  game.G.ebullets = [{ gid: 2, x: p.x, y: p.y, vx: 0, vy: 0, r: 9, dmg: 26, life: 1, a: 0 }];  // 機雷級
  step();
  assert.equal(p.hp, hp0 - 16, 'メッセージ: 10 吸収 + 16 が船体へ');
  assert.equal(game.state().barrier.active, false, 'メッセージ: 膜が割れる');
  assert.ok(game.state().barrier.cooldown > 1.9, 'メッセージ: 再使用待ち');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 岩との衝突はバリア対象外（膜が出ていても船体へ通る）', t => {
  const { game, step, press, reset } = boot(t);
  reset();
  const p = game.G.player;
  press('Space'); step(2);
  assert.equal(game.state().barrier.active, true);
  const hp0 = p.hp;
  game.G.rocks = [{ x: p.x, y: p.y, r: 30 }];
  step();
  assert.equal(p.hp, hp0 - 9, 'メッセージ: 岩はすり抜けない＝バリアとは別');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 同一の持続接触では連続ジャストにならない（間引いて通常吸収）', t => {
  const { game, step, press, reset } = boot(t);
  reset();
  const p = game.G.player;
  let justs = 0, absorbs = 0;
  game.AU.barrierJust = () => { justs++; };
  game.AU.barrierGuard = () => { absorbs++; };
  /* 触れ続ける敵（stun で固定・攻撃しない） */
  const foe = { gid: 9, kind: 'mine', stun: 99, x: p.x, y: p.y, baseY: p.y, r: 22, hp: 2, maxHp: 2,
    score: 20, dmg: 9, vx: 0, vy: 0, t: 0, phase: 0, pt: 0, st: 0, jaw: 0, eye: 0, hitCd: 0, flash: 0, dir: -1, drift: 0, dead: false };
  game.G.enemies = [foe];
  const hp0 = p.hp;
  press('Space'); step();
  assert.equal(justs, 1, 'メッセージ: 1 回目はジャスト');
  assert.equal(p.hp, hp0, 'メッセージ: 完全防御');
  /* 押し直しても、同じ持続接触ではジャストにしない */
  step();
  assert.equal(p.hp, hp0, '防いだ接触が次の更新で即座に船体へ通らない');
  press('Space'); step(30);
  assert.equal(justs, 1, 'メッセージ: 連続ジャスト払い戻しをしない');
  assert.ok(absorbs >= 1, 'メッセージ: 以降は通常吸収（間引いて耐久が減る）');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 降艇・入港・出港・やり直しでバリアと入力を持ち越さない', t => {
  const { game, step, press, reset } = boot(t);
  reset();
  const { G } = game;
  press('Space'); step(2);
  assert.equal(game.state().barrier.active, true);
  /* 降艇（徒歩探索）→ 戻る */
  G.entranceNear = true; G.player.x = 1450; G.player.y = 430; step();
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'explore');
  assert.equal(game.state().barrier.active, false, 'メッセージ: 降艇で膜を閉じる');
  assert.equal(game.Input.wantDash, false, 'メッセージ: 入力を持ち越さない');
  press('KeyE'); step(2);   // 戻る（出口付近）
  /* やり直しでも新しい艇のバリアはまっさら */
  game.startGame(); step();
  const b = game.state().barrier;
  assert.equal(b.active, false);
  assert.equal(b.cooldown, 0);
  assert.equal(b.ready, true);
  assert.equal(game.errors.length, 0);
});
