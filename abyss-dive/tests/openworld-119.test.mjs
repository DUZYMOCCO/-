/**
 * ABYSS DIVE — v1.19.0 オープンワールドの最小導線（前哨基地の固定化と深部の分離）のテスト。
 *
 * ねらい:
 *  - 前哨基地は「世界の固定地点」。初回ボス撃破を条件にせず、最初の出港から存在する。
 *    発見 → 任意入港 → 出港 → 戻って再入港 ができる。
 *  - 深部（海溝・深棚基地・深層ドロップ）は従来どおりボス撃破が条件で、前哨基地とは別系統。
 *  - ボスは“その場所の脅威”。撃破しても基地は移動せず、入港で二重報酬も出ない。
 *  - bossKills は前哨の表示/マーカー/海溝/深棚/深層ドロップ/ボス生成で兼用しないよう責務を分けた。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OUTPOST, outpostMarker, deepOpen, DIVE_BASE, baseDockNear, baseStage } from '../js/base-rules.js';
import { createAbyssDive } from '../js/game.js';

/* --- 純粋ルール: 前哨基地は固定・bossKills 非依存 ------------------------- */

test('outpostMarker は固定地点で、bossKills に依存しない', () => {
  const a = outpostMarker();
  const b = outpostMarker();
  assert.equal(a.x, OUTPOST.x);
  assert.equal(a.y, OUTPOST.y);
  assert.deepEqual(a, b, '呼ぶたびに同じ地点');
  assert.equal(outpostMarker.length, 0, 'bossKills を受け取らない（責務の分離）');
});

test('deepOpen は深部（海溝・深棚）の解放だけを表す（前哨基地とは別）', () => {
  assert.equal(deepOpen(0), false);
  assert.equal(deepOpen(1), true);
  assert.equal(deepOpen(3), true);
  assert.equal(deepOpen(undefined), false);
});

test('前哨基地は入港圏・段階表示が固定地点で効く', () => {
  const m = outpostMarker();
  assert.equal(baseDockNear(m.x, m.y, m), true);
  assert.equal(baseStage(m.x, m.y, m), 'dock');
  assert.equal(baseStage(m.x, m.y - 1200, m), 'approach');
});

/* --- 実挙動: 本物のゲームループを回す ------------------------------------ */

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
  const tap = code => { keyDown(code); step(); keyUp(code); step(); };
  return { game, step, press, tap };
}

/* 出港まで選択を送って決定する（選択と実行は別＝誤出港しない）。 */
function depart(game, press, tap) {
  assert.equal(game.state().base.selectedId, 'upgrade');
  for (let i = 0; i < 4; i++) tap('ArrowDown');
  assert.equal(game.state().base.selectedId, 'depart');
  press('KeyE'); 
}

test('実挙動: ボス未撃破でも前哨基地が存在し、発見→入港→出港→再入港できる（二重報酬なし）', t => {
  const { game, step, press, tap } = boot(t);
  const { G } = game;

  /* 開幕（ボス 0 撃破）。前哨基地は固定地点として既に存在する。 */
  assert.equal(G.bossKills, 0);
  assert.equal(game.state().baseMarker, true, '前哨基地が存在する');
  assert.deepEqual(game.state().outpost, { x: OUTPOST.x, y: OUTPOST.y });
  assert.equal(game.state().deepOpen, false, '深部はまだ開いていない');
  assert.equal(game.state().trench, false, '海溝もまだ無い');

  const res0 = game.state().resource;

  /* 遠くにいるうちは入港圏でない */
  G.player.x = OUTPOST.x - 4000; G.player.y = OUTPOST.y;
  step();
  assert.equal(game.state().baseNear, false, '遠いと入港圏でない');

  /* 前哨基地へ近づく（発見→入港圏） */
  G.player.x = OUTPOST.x; G.player.y = OUTPOST.y;
  step();
  assert.equal(game.state().baseNear, true, '近づくと入港圏');
  assert.equal(game.state().nearBase, 1);

  /* 明示操作で入港 → 親メニュー */
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base', '明示操作で入港する');
  assert.equal(game.state().base.screen, 'menu');

  /* 出港 → 潜航へ。ドックの手前（正しい側）へ出る。 */
  depart(game, press, tap);
  step(2);
  assert.equal(game.state().mode, 'dive', '出港して潜航へ戻る');
  assert.ok(Math.abs(G.player.x - (OUTPOST.x - (DIVE_BASE.r + 120))) < 1, 'ドックの手前へ出る');
  assert.equal(G.bossKills, 0, '入出港はボス撃破に影響しない');

  /* 戻って再入港できる */
  G.player.x = OUTPOST.x; G.player.y = OUTPOST.y; step();
  assert.equal(game.state().baseNear, true, '戻れば再び入港圏');
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base', '再入港できる');

  /* 二重報酬なし: 入港自体は資源を増やさない */
  assert.equal(game.state().resource, res0, '入港で資源は増えない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: ボスを後で倒しても前哨基地は移動せず、深部だけが開く', t => {
  const { game, step } = boot(t);
  const { G } = game;

  const before = JSON.stringify(game.state().outpost);
  assert.deepEqual(game.state().outpost, { x: OUTPOST.x, y: OUTPOST.y });

  /* ボス撃破相当（撃破数のみ進める）。基地の位置・存在は不変であるべき。 */
  G.bossKills = 1;
  G.player.x = OUTPOST.x + 5000; G.player.y = OUTPOST.y;
  step();
  assert.equal(JSON.stringify(game.state().outpost), before, '基地は移動しない');
  assert.equal(game.state().baseMarker, true, '基地は存在したまま');
  assert.equal(game.state().deepOpen, true, '深部が開く（別系統）');
  assert.equal(game.state().trench, true, '海溝は深部の解放で生成される');

  /* 撃破後も前哨基地は固定地点のまま入港できる */
  G.player.x = OUTPOST.x; G.player.y = OUTPOST.y; step();
  assert.equal(game.state().baseNear, true);
});

test('実挙動: startGame（やり直し）でも前哨基地は固定地点のまま存在する', t => {
  const { game, step } = boot(t);
  game.G.player.x = 1000; step();
  game.startGame();
  assert.deepEqual(game.state().outpost, { x: OUTPOST.x, y: OUTPOST.y }, '潜航をやり直しても固定地点');
  assert.equal(game.state().baseMarker, true);
  assert.equal(game.state().deepOpen, false, 'やり直しで深部は再びボス撃破から');
});
