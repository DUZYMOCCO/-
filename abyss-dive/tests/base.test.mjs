import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_WORLD,
  DIVE_BASE,
  BASE_MENU,
  ELLIE_SPEED,
  baseOpen,
  baseMarker,
  baseStage,
  baseDockNear,
  createBaseState,
  menuMove,
  menuSelected,
  createEllieState,
  stepEllie,
} from '../js/base-rules.js';
import { createResourceLedger } from '../js/resources.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.10.0: スコアに代わる保存資源（資源）と、最初のボスの先の海底基地（入港ゲート）。
   v1.16.0: 室内は「徒歩で設備まで歩く」から「入港直後に出る直接メニュー」へ。
     - 親メニュー（整備・改造 / 艇の換装 / 武器（製作・換装） / 出港・分離）が出る。
     - 子メニュー（既存パネル）を閉じると親へ戻る。選択（カーソル）と実行（決定）は別。
     - エリーは操作対象ではなく背景で自律行動（idle/walk のみ）。操作・資源・装備・出港に影響しない。
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

/* --- 親メニュー（入港直後の直接メニュー・選択/実行の分離） ---------------- */

test('基地: 親メニューは整備/艇/武器＋分離した出港。入港直後は先頭を選択', () => {
  const st = createBaseState();
  assert.equal(st.screen, 'menu', 'メッセージ: 入港直後は親メニュー');
  assert.equal(menuSelected(st).id, 'upgrade', 'メッセージ: 先頭は整備・改造');
  assert.deepEqual(BASE_MENU.map(i => i.id), ['upgrade', 'ship', 'weapon', 'forge', 'depart']);
  const depart = BASE_MENU.find(i => i.id === 'depart');
  assert.equal(depart.separate, true, 'メッセージ: 出港は他と分離した項目');
  assert.equal(BASE_MENU.filter(i => i.separate).length, 1, 'メッセージ: 分離は出港だけ');
});

test('基地: メニューのカーソルは端でクランプ（選択だけ。実行はしない）', () => {
  const st = createBaseState();
  menuMove(st, -1);
  assert.equal(st.cursor, 0, 'メッセージ: 上端でクランプ');
  menuMove(st, 1); menuMove(st, 1); menuMove(st, 1); menuMove(st, 1);
  assert.equal(menuSelected(st).id, 'depart', 'メッセージ: 4回で出港まで');
  assert.equal(st.cursor, BASE_MENU.length - 1, 'メッセージ: 下端でクランプ');
  assert.equal(st.screen, 'menu', 'メッセージ: 選択は実行ではない（画面はメニューのまま）');
});

/* --- エリー（背景で自律行動） ------------------------------------------ */

/* 決定的な rng（線形合同法）。テストで再現できる。 */
function seeded(seed){
  let s = seed >>> 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

test('エリー: 自律行動で区画内を動き、外へは出ない（操作を受けない）', () => {
  const el = createEllieState();
  assert.equal(el.x, BASE_WORLD.SPAWN_X);
  const rng = seeded(20260101);
  let walked = false, minX = el.x, maxX = el.x;
  for (let i = 0; i < 3000; i++){
    stepEllie(el, 1 / 60, BASE_WORLD, rng);
    if (el.anim === 'walk') walked = true;
    minX = Math.min(minX, el.x); maxX = Math.max(maxX, el.x);
  }
  assert.equal(walked, true, 'メッセージ: 歩く行動を選ぶ');
  assert.ok(minX >= BASE_WORLD.MIN_X - 1e-6 && maxX <= BASE_WORLD.MAX_X + 1e-6,
    'メッセージ: 有限の安全区画の外へ出ない（' + minX.toFixed(0) + '..' + maxX.toFixed(0) + '）');
  assert.ok(el.anim === 'idle' || el.anim === 'walk', 'メッセージ: 既存アニメのみ');
  assert.ok(maxX - minX > 20, 'メッセージ: 実際に移動する');
});

test('エリー: 既存の idle/walk のみ・速度は落ち着いている（背景の住人）', () => {
  const el = createEllieState();
  const rng = seeded(7);
  const dt = 1 / 60;
  let prev = el.x, maxStep = 0, seen = new Set();
  for (let i = 0; i < 1500; i++){
    stepEllie(el, dt, BASE_WORLD, rng);
    seen.add(el.anim);
    maxStep = Math.max(maxStep, Math.abs(el.x - prev)); prev = el.x;
  }
  assert.deepEqual([...seen].sort(), ['idle', 'walk'], 'メッセージ: idle と walk だけ');
  assert.ok(maxStep <= ELLIE_SPEED * dt * 1.5 + 0.5, 'メッセージ: 1フレームで飛ばない（' + maxStep.toFixed(2) + '）');
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
  const keyDown = code => window.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  const keyUp = code => window.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  const press = code => { for (const event of ['keydown', 'keyup']) window.dispatchEvent(Object.assign(new Event(event), { code })); };
  /* レベル入力（矢印）は 1 フレーム保持して 1 回だけ動かす（エッジ検出）。 */
  const tap = code => { keyDown(code); step(); keyUp(code); step(); };
  return { game, step, press, keyDown, keyUp, tap };
}

test('実挙動: 撃破前は入れない / 近づいてEで入港 / 親メニューが出る / Eで出港 / 射撃入力を持ち越さない', t => {
  const { game, step, press, tap } = boot(t);
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
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 入港直後に親メニュー');
  assert.equal(game.state().base.selectedId, 'upgrade');

  /* 室内は安全（放置してもやられない・軟ロックしない） */
  step(120);
  assert.equal(game.state().mode, 'base', 'メッセージ: 放置しても安全');

  /* 出港時に射撃入力を残さない。親メニューで「出港」まで下げて決定する（選択と実行は別＝誤出港しない）。 */
  Input.wantShoot = true; Input.shootHeld = true; Input.fireQueued = true; Input.fireHeld = true;
  assert.equal(game.state().base.selectedId, 'upgrade');
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base', 'メッセージ: 決定はまず整備を開く（誤出港しない）');
  assert.equal(game.state().base.screen, 'upgrade');
  /* 子メニューを閉じて親へ戻る */
  tap('Escape');
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 子メニューを閉じると親へ');
  /* 出港まで選択を送って決定 */
  for (let i = 0; i < 4; i++) tap('ArrowDown');
  assert.equal(game.state().base.selectedId, 'depart');
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'dive', 'メッセージ: 出港して潜航へ戻る');
  assert.equal(Input.shootHeld, false, 'メッセージ: 射撃ホールドを持ち越さない');
  assert.equal(Input.wantShoot, false);
  assert.equal(Input.fireQueued, false);
  assert.equal(Input.fireHeld, false);
});

test('実挙動: 親メニューから整備/艇/武器を開き、閉じると親へ戻る（徒歩なし）', t => {
  const { game, step, press, tap } = boot(t);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: G.player.x + 80, y: G.player.y }; step();
  press('KeyE'); step(2);
  assert.equal(game.state().base.screen, 'menu');

  /* 整備（先頭）: そのまま決定 */
  press('KeyE'); step(2);
  assert.equal(game.state().base.panel.open, true, 'メッセージ: 整備パネルが開く');
  assert.equal(game.state().base.shipPanel.open, false);
  tap('Escape');
  assert.equal(game.state().base.panel.open, false);
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 整備を閉じると親へ');

  /* 艇の換装（2番目） */
  tap('ArrowDown');
  assert.equal(game.state().base.selectedId, 'ship');
  press('KeyE'); step(2);
  assert.equal(game.state().base.shipPanel.open, true, 'メッセージ: 艇選択パネルが開く');
  assert.equal(game.state().mode, 'base', 'メッセージ: 開くだけで出港しない');
  tap('Escape');
  assert.equal(game.state().base.screen, 'menu');

  /* 武器（3番目）: 親メニューのカーソルは閉じた位置（艇＝1）のままなので、もう一度下げる */
  tap('ArrowDown');
  assert.equal(game.state().base.selectedId, 'weapon');
  press('KeyE'); step(2);
  assert.equal(game.state().base.weaponPanel.open, true, 'メッセージ: 武器パネルが開く');
  tap('Escape');
  assert.equal(game.state().base.screen, 'menu');
  assert.equal(game.errors.length, 0);
});

test('実挙動: エリーは操作と独立に動く（子メニュー中も止めない）', t => {
  const { game, step, press } = boot(t);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: G.player.x + 80, y: G.player.y }; step();
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');

  /* 子メニュー（整備）を開いたまま、エリーが動く */
  press('KeyE'); step(2);
  assert.equal(game.state().base.panel.open, true);
  const startX = game.state().base.ellie.x;
  const seen = new Set();
  for (let i = 0; i < 900; i++){ step(); seen.add(game.state().base.ellie.x); }
  assert.ok(seen.size > 5, 'メッセージ: 子メニュー中もエリーが動く（' + seen.size + ' 種類の x）');
  assert.ok(game.state().base.ellie.x >= BASE_WORLD.MIN_X && game.state().base.ellie.x <= BASE_WORLD.MAX_X);
  assert.equal(game.state().base.panel.open, true, 'メッセージ: エリーの移動はメニューに影響しない');
  assert.equal(game.state().base.ellie.x !== startX || seen.size > 5, true);
  assert.equal(game.errors.length, 0);
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
