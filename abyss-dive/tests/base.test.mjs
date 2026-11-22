import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_WORLD,
  DIVE_BASE,
  baseOpen,
  baseMarker,
  baseStage,
  baseDockNear,
  createBaseState,
  stepBase,
} from '../js/base-rules.js';
import { createResourceLedger } from '../js/resources.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.10.0: スコアに代わる保存資源（資源）と、最初のボスの先の海底基地。
   降りる／入港する前に入れないこと、近づいて明示操作で入れること、室内は安全で
   歩け・船に戻れば出港できること、資源は保存され同じ潜航内で二重付与しないこと。
   ========================================================================== */

/* --- 資源（スコアに代わる保存値） ---------------------------------------- */

function makeIO(store){
  return {
    load: () => (store.resource ?? 0),
    save: (v) => { store.resource = v; },
  };
}

test('資源: 旧ベストからは移行しない（独自の残高だけを読む）', () => {
  const store = { highscore: 9999 };                 // 以前のハイスコアが残っている想定
  const led = createResourceLedger(makeIO(store));
  assert.equal(led.total(), 0, 'メッセージ: 旧ベストを残高へ変換しない');
});

test('資源: 同じ潜航内で同じ源は二重付与しない', () => {
  const store = {};
  const led = createResourceLedger(makeIO(store));
  assert.equal(led.awardOnce('relic0', 250), true);
  assert.equal(led.total(), 250);
  assert.equal(led.awardOnce('relic0', 250), false, 'メッセージ: 二重付与しない');
  assert.equal(led.total(), 250, 'メッセージ: 残高は増えない');
  assert.equal(led.awardOnce('foe', 40), true, 'メッセージ: 別の源は加算される');
  assert.equal(led.total(), 290);
});

test('資源: 保存され、作り直しても維持。新規潜航(resetDive)では再び得られる', () => {
  const store = {};
  const led = createResourceLedger(makeIO(store));
  led.awardOnce('relic0', 250);
  assert.equal(store.resource, 250, 'メッセージ: 保存される');

  const again = createResourceLedger(makeIO(store));      // リロード相当（新しい潜航）
  assert.equal(again.total(), 250, 'メッセージ: リロードでも維持');
  assert.equal(again.awardOnce('relic0', 250), true, 'メッセージ: 新しい潜航では再び得られる');
  assert.equal(again.total(), 500);
});

/* --- 基地（潜航側の入港ゲート・段階表示） -------------------------------- */

test('基地: 最初のボス（リヴァイアサン）撃破前は入れない', () => {
  assert.equal(baseOpen(0), false);
  assert.equal(baseMarker(0, 8600, 520), null, 'メッセージ: 撃破前はマーカーが無い');
  assert.equal(baseOpen(1), true);
  const mk = baseMarker(1, 8600, 520);
  assert.ok(mk && mk.x > 8600, 'メッセージ: 撃破した現場の先に置く');
});

test('基地: 近づけば入港圏、遠いと圏外（勝手にワープしない）', () => {
  const mk = { x: 10000, y: 520 };
  assert.equal(baseDockNear(10000, 520, mk), true);
  assert.equal(baseDockNear(10000 + DIVE_BASE.r + DIVE_BASE.pad + 40, 520, mk), false);
  assert.equal(baseDockNear(10000, 520, null), false, 'メッセージ: 撃破前は入港できない');
});

test('基地: 進入灯 → 外壁 → ドック と近づくほど段階が進む', () => {
  const mk = { x: 10000, y: 520 };
  assert.equal(baseStage(10000 - 4000, 520, mk), 'none');
  assert.equal(baseStage(10000 - DIVE_BASE.wall - 200, 520, mk), 'approach');
  assert.equal(baseStage(10000 - DIVE_BASE.dock - 20, 520, mk), 'wall');
  assert.equal(baseStage(10000, 520, mk), 'dock');
  assert.equal(baseStage(0, 0, null), 'none');
});

/* --- 基地（室内: 有限の安全区画・歩行・出港） ---------------------------- */

test('基地: 有限の安全区画を歩ける（端でクランプ・体力の概念なし＝安全）', () => {
  const st = createBaseState();
  assert.equal(st.hp, undefined, 'メッセージ: 室内は安全（体力ダメージなし）');
  stepBase(st, { move: 1, action: false }, 0.2);
  assert.ok(st.x > BASE_WORLD.SPAWN_X, 'メッセージ: 前へ歩ける');
  for (let i = 0; i < 400; i++) stepBase(st, { move: 1 }, 0.1);
  assert.equal(st.x, BASE_WORLD.MAX_X, 'メッセージ: 右端でクランプ');
  for (let i = 0; i < 400; i++) stepBase(st, { move: -1 }, 0.1);
  assert.equal(st.x, BASE_WORLD.MIN_X, 'メッセージ: 左端でクランプ');
});

test('基地: 船のそばでだけ出港できる', () => {
  const st = createBaseState();
  st.x = 900;
  assert.equal(stepBase(st, { move: 0, action: true }, 0.016).depart, false, 'メッセージ: 遠いと出港しない');
  st.x = BASE_WORLD.SHIP_X;
  assert.equal(stepBase(st, { move: 0, action: true }, 0.016).depart, true, 'メッセージ: 船のそばで出港できる');
});

/* --- 実挙動（本物のゲームループ・入力ハンドラを回す） -------------------- */

function boot(t) {
  const previous = Object.fromEntries(['window', 'document', 'Image', 'requestAnimationFrame'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)) {
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
  const press = code => { for (const event of ['keydown', 'keyup']) window.dispatchEvent(Object.assign(new Event(event), { code })); };
  return { game, step, press };
}

test('実挙動: 撃破前は入れない / 近づいてEで入港 / Eで出港 / 射撃入力を持ち越さない', t => {
  const { game, step, press } = boot(t);
  const { G, Input } = game;

  /* 撃破前: マーカーが無いので、どこにいても入港圏にならない */
  G.player.x = 12000; G.player.y = 520;
  step();
  assert.equal(game.state().baseNear, false);
  press('KeyE'); step();
  assert.equal(game.state().mode, 'dive', 'メッセージ: 撃破前は入れない');

  /* ボス条件だけ検証上ステージ（本来はリヴァイアサン撃破で開く。ロジック自体は上のテストで担保） */
  G.bossKills = 1;
  G.baseMarker = { x: G.player.x + 80, y: G.player.y };
  step();
  assert.equal(game.state().baseNear, true, 'メッセージ: 近づくと入港圏');

  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base', 'メッセージ: 明示操作で入港する');
  assert.equal(game.state().base.active, true);
  assert.ok(game.state().base.near, 'メッセージ: 降りた直後は船のそば');

  /* 室内は安全（放置してもやられない・軟ロックしない） */
  step(120);
  assert.equal(game.state().mode, 'base', 'メッセージ: 放置しても安全');

  /* 出港時に射撃入力を残さない */
  Input.wantShoot = true; Input.shootHeld = true; Input.fireQueued = true; Input.fireHeld = true;
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'dive', 'メッセージ: 出港して潜航へ戻る');
  assert.equal(Input.shootHeld, false, 'メッセージ: 射撃ホールドを持ち越さない');
  assert.equal(Input.wantShoot, false);
  assert.equal(Input.fireQueued, false);
  assert.equal(Input.fireHeld, false);
});

test('実挙動: やり直し(startGame)で進行が壊れず、資源は維持される', t => {
  const { game, step, press } = boot(t);
  const { G } = game;

  /* 戦闘報酬（資源）を得る: 機雷を 1 体ソナーで撃破 */
  G.enemies = [{ kind:'mine', x:G.player.x + 100, y:G.player.y, baseY:G.player.y, r:26, hp:1, maxHp:1,
    score:20, dmg:0, vx:0, vy:0, t:0, phase:0, hitCd:0, stun:0, flash:0, dir:-1, drift:0, dead:false }];
  press('ShiftLeft'); step();
  const gained = game.state().resource;
  assert.ok(gained > 0, 'メッセージ: 戦闘で資源が入る（' + gained + '）');

  game.startGame();
  assert.equal(game.state().mode, 'dive');
  assert.equal(game.state().baseMarker, false, 'メッセージ: 新しい潜航では基地もリセット');
  assert.equal(game.state().resource, gained, 'メッセージ: やり直しでも資源残高は維持');
});
