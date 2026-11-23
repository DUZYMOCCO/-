import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_UI, ELLIE_HEIGHT, menuActionLabel, rowActionLabel, ACTION_KEY_HINT,
  ellieFullyVisibleInBand, BASE_WORLD, BASE_MENU,
} from '../js/base-rules.js';
import {
  trajectoryLabel, normalizedPattern, salvoPaths, shapesFor, shapeLabel,
  weaponShapeKind, meleeLabel, MELEE_IDS,
  drawTorpedoShape, drawMissileShape, drawProjectileShape, drawTrajectoryIcon,
  drawBeamIcon, drawReflectIcon, drawMeleeShape,
} from '../js/projectile-shapes.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.17.0: 基地 UI の改組（一覧＋詳細・銅枠・行為ボタン・弾形/軌跡プレビュー・
     エリーの帯）の検証。純粋な文言・段取りと、実挙動（本物のループと入力）の両方。
   ========================================================================== */

/* --- 文言（『決定』『捨てる』ではなく起きることを書く） -------------------- */

test('UI文言: 親メニューの実行は「〜へ/出港する」を示す（決定ではない）', () => {
  assert.equal(menuActionLabel('upgrade'), '整備・改造へ');
  assert.equal(menuActionLabel('ship'), '艇の換装へ');
  assert.equal(menuActionLabel('weapon'), '武器（製作・換装）へ');
  assert.equal(menuActionLabel('forge'), '開発（指定・近接）へ');
  assert.equal(menuActionLabel('depart'), '出港する');
});

test('UI文言: 子パネルの主ボタンは行為（装備する/製作する/強化する/換装する/修理する）', () => {
  assert.equal(rowActionLabel('weapon', { kind:'make' }), '製作する');
  assert.equal(rowActionLabel('weapon', { kind:'item', initial:false }), '装備する');
  assert.equal(rowActionLabel('ship', { id:'09' }), '換装する');
  assert.equal(rowActionLabel('upgrade', { kind:'repair' }), '修理する');
  assert.equal(rowActionLabel('upgrade', { kind:'upgrade' }), '強化する');
  assert.equal(rowActionLabel('forge', { kind:'shot' }), '装備する');
  assert.equal(rowActionLabel('forge', { kind:'melee' }), '装備する');
  assert.equal(rowActionLabel('forge', { kind:'design' }), '開発する');
  assert.equal(rowActionLabel('forge', { kind:'confirm' }), '製作する');
  /* 旧『決定』『捨てる』が主ボタンに出ないこと */
  for (const k of ['weapon','ship','upgrade','forge']){
    assert.notEqual(rowActionLabel(k, { kind:'item' }), '決定');
  }
  assert.equal(ACTION_KEY_HINT.sell, 'X');
  assert.equal(ACTION_KEY_HINT.primary, 'E');
});

/* --- 段取り（エリーの帯・パネルは上部・主要文字を拡大） -------------------- */

test('段取り: パネルは上部に置かれ、下の帯にエリーの全身が入る', () => {
  /* パネルは画面の上半分に収まり、床（=エリーの足元）より上で終わる。 */
  assert.ok(BASE_UI.panelY + BASE_UI.panelH <= BASE_WORLD.GROUND_Y,
    'メッセージ: パネルの下端は床より上（エリーを隠さない）');
  /* エリーの頭（GROUND_Y - ELLIE_HEIGHT）が帯の上端より下＝全身が見える。 */
  assert.ok(ellieFullyVisibleInBand(), 'メッセージ: エリーの全身が帯に収まる');
  assert.ok((BASE_WORLD.GROUND_Y - ELLIE_HEIGHT) > BASE_UI.bandTop);
});

/* --- 弾形・軌跡・近接の形（実戦と同形・count/pattern に一致） -------------- */

test('弾形: 型ごとの集合とラベル（魚雷/ミサイルは別）', () => {
  assert.deepEqual(shapesFor('torpedo').slice().sort(), ['sleek','slender','stock','stout']);
  assert.deepEqual(shapesFor('missile').slice().sort(), ['finned','sleek','stock','stout']);
  assert.equal(shapeLabel('sleek'), '流線');
  assert.equal(weaponShapeKind('laser'), 'beam');
  assert.equal(weaponShapeKind('reflaser'), 'beam');
  assert.equal(weaponShapeKind('reftorp'), 'reflect');
  assert.equal(weaponShapeKind('missile'), 'missile');
  assert.equal(weaponShapeKind('torpedo'), 'torpedo');
});

test('軌跡: 単発／並列2・3連／扇2・3・6・9・12ウェイの短いラベル', () => {
  assert.equal(trajectoryLabel('torpedo', 1, 'single'), '単発');
  assert.equal(trajectoryLabel('torpedo', 2, 'parallel'), '2連・並列');
  assert.equal(trajectoryLabel('torpedo', 3, 'parallel'), '3連・並列');
  assert.equal(trajectoryLabel('torpedo', 2, 'fan'), '2ウェイ');
  assert.equal(trajectoryLabel('torpedo', 3, 'fan'), '3ウェイ');
  assert.equal(trajectoryLabel('torpedo', 6, 'fan'), '6ウェイ');
  assert.equal(trajectoryLabel('torpedo', 9, 'fan'), '9ウェイ');
  assert.equal(trajectoryLabel('torpedo', 12, 'fan'), '12ウェイ');
  /* 4 以上は並列でも扇状のみ（実戦と同じ規則）。 */
  assert.equal(normalizedPattern(4, 'parallel'), 'fan');
  assert.equal(trajectoryLabel('torpedo', 4, 'parallel'), '4ウェイ');
  /* ミサイルは最大 2（並列 or 扇）。 */
  assert.equal(trajectoryLabel('missile', 2, 'parallel'), '2連・並列');
  assert.equal(normalizedPattern(1, 'fan'), 'single');
});

test('軌跡: 幾何は対称で、背後へは撃たない（並列は横位置・扇は上下）', () => {
  const fan = salvoPaths(3, 'fan');
  assert.equal(fan.length, 3);
  assert.equal(fan[1].dAng, 0, 'メッセージ: 扇の中央は 0');
  assert.ok(fan[0].dAng < 0 && fan[2].dAng > 0, 'メッセージ: 上下対称');
  assert.ok(Math.abs(fan[0].dAng) < Math.PI / 2 && Math.abs(fan[2].dAng) < Math.PI / 2,
    'メッセージ: 背後へは撃たない（90°未満）');
  const par = salvoPaths(3, 'parallel');
  assert.deepEqual(par.map(p => p.dAng), [0, 0, 0], 'メッセージ: 並列は平行');
  assert.ok(par[0].lat < 0 && par[2].lat > 0 && par[1].lat === 0, 'メッセージ: 発射位置を左右対称へ');
  assert.equal(salvoPaths(1, 'single')[0].dAng, 0);
});

test('形の描画: すべての弾形/近接/レーザー/反射が例外なく描ける（描画呼び出しあり）', () => {
  let calls = 0;
  const g = { addColorStop(){} };
  const ctx = new Proxy({
    createLinearGradient: () => g, createRadialGradient: () => g,
    measureText: () => ({ width: 10 }),
  }, { get(t, k){ return t[k] ?? (() => { calls++; }); } });
  for (const id of ['stock','slender','stout','sleek']) drawTorpedoShape(ctx, id);
  for (const id of ['stock','finned','stout','sleek']) drawMissileShape(ctx, id, 1.4);
  drawProjectileShape(ctx, 'torpedo', 'sleek');
  drawProjectileShape(ctx, 'missile', 'finned', 2);
  for (const n of [[1,'single'],[2,'parallel'],[3,'fan'],[6,'fan'],[9,'fan'],[12,'fan']]){
    drawTrajectoryIcon(ctx, { x:0, y:0, w:120, h:40, count:n[0], pattern:n[1] });
  }
  drawBeamIcon(ctx, { x:0, y:0, w:120, h:40 });
  drawReflectIcon(ctx, { x:0, y:0, w:120, h:40 });
  assert.deepEqual(MELEE_IDS.slice().sort(), ['axe','beamsaber','chainsaw','hammer','phaseblade','punch']);
  for (const id of MELEE_IDS) drawMeleeShape(ctx, id, 40);
  assert.equal(meleeLabel('beamsaber'), 'ビームソード');
  assert.ok(calls > 100, 'メッセージ: 実際に描画命令が呼ばれる（' + calls + '）');
});

/* --- 実挙動（本物のゲームループ・入力ハンドラ・新 UI を回す） -------------- */

function boot(t){
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
  globalThis.document = { createElement: makeCanvas, body: { clientWidth: 874, clientHeight: 402 } };
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
  return { game, step, press, keyDown, keyUp, tap };
}

function enterBase(game, step, press){
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: G.player.x + 80, y: G.player.y }; step();
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');
}

test('実挙動: 各パネル（整備/艇/武器/開発）を開いて描画しても JS エラー0', t => {
  const { game, step, press, tap } = boot(t);
  enterBase(game, step, press);
  assert.equal(game.state().base.screen, 'menu');

  /* 親メニューのカーソルは閉じても位置を保つ。目標まで移動してから開く。 */
  const openAt = (target) => {
    let cur = game.state().base.cursor, guard = 0;
    while (cur < target && guard++ < 10){ tap('ArrowDown'); cur = game.state().base.cursor; }
    while (cur > target && guard++ < 10){ tap('ArrowUp'); cur = game.state().base.cursor; }
    press('KeyE'); step(2);
  };
  openAt(0); assert.equal(game.state().base.panel.open, true, '整備');
  step(30); tap('Escape');
  openAt(1); assert.equal(game.state().base.shipPanel.open, true, '艇');
  step(30); tap('Escape');
  openAt(2); assert.equal(game.state().base.weaponPanel.open, true, '武器');
  step(30); tap('Escape');
  openAt(3); assert.equal(game.state().base.forgePanel.open, true, '開発');
  step(30); tap('Escape');
  assert.equal(game.state().base.screen, 'menu');
  assert.equal(game.errors.length, 0, 'メッセージ: 全パネルの描画でエラーなし');
});

test('実挙動: 武器パネルで製作→装備→売却（資源+額の事前提示と二度押し確認）', t => {
  const { game, step, press, tap } = boot(t);
  enterBase(game, step, press);
  game.addResource(10000);
  const { weaponPanel, arsenal } = game;

  tap('ArrowDown'); tap('ArrowDown'); press('KeyE'); step(2);
  assert.equal(game.state().base.weaponPanel.open, true);

  /* 魚雷を製造（行0 = 魚雷を製造、決定=消費）。 */
  weaponPanel.setCursor(0); step();
  const before = game.state().resource;
  press('KeyE'); step(2);
  assert.equal(arsenal.count(), 1, 'メッセージ: 製造で1個入る');
  assert.equal(game.state().resource, before - 120, 'メッセージ: 製造費は魚雷120');

  /* 所持品（1個）を装備。 */
  const ownIdx = weaponPanel.rows().findIndex(r => r.kind === 'item' && !r.initial);
  weaponPanel.setCursor(ownIdx); step();
  const craftedId = weaponPanel.rows()[ownIdx].id;
  press('KeyE'); step(2);
  assert.equal(arsenal.equippedId('torpedo'), craftedId, 'メッセージ: 明示装備で換装');

  /* もう1個つくって、装備していない所持品を売却（二度押しで資源が増える）。 */
  weaponPanel.setCursor(0); step();
  press('KeyE'); step(2);
  assert.equal(arsenal.count(), 2);
  const sellIdx = weaponPanel.rows().findIndex(r => r.kind === 'item' && !r.initial && !r.equipped);
  assert.ok(sellIdx >= 0);
  const sellId = weaponPanel.rows()[sellIdx].id;
  const refund = weaponPanel.rows()[sellIdx].sell;
  weaponPanel.setCursor(sellIdx); step();
  const beforeSell = game.state().resource;
  tap('KeyX');                                  // 1度目: 確認（アーム）
  assert.equal(game.state().resource, beforeSell, 'メッセージ: 1度目は消費・加算しない');
  assert.ok(/売却/.test(weaponPanel.message()), 'メッセージ: 売却の確認が出る');
  tap('KeyX');                                  // 2度目: 確定
  assert.equal(game.state().resource, beforeSell + refund, 'メッセージ: 売却で資源が増える');
  assert.equal(arsenal.itemById(sellId), null, 'メッセージ: 売却した個体は消える');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 開発（指定）で特性を選び、製作するで1個つくる（変更前の値は残る）', t => {
  const { game, step, press, tap } = boot(t);
  enterBase(game, step, press);
  game.addResource(10000);
  const { forgePanel, advanced } = game;

  /* 開発（指定・近接）を開く（4番目）。 */
  tap('ArrowDown'); tap('ArrowDown'); tap('ArrowDown'); press('KeyE'); step(2);
  assert.equal(game.state().base.forgePanel.open, true);

  /* 「通常レーザー を指定開発」を開く（design 行・追加兵装なので advanced 倉庫へ入る）。 */
  const dIdx = forgePanel.rows().findIndex(r => r.kind === 'design' && /通常レーザー/.test(r.label));
  assert.ok(dIdx >= 0);
  forgePanel.setCursor(dIdx); step();
  press('KeyE'); step(2);
  assert.equal(forgePanel.screen(), 'design', 'メッセージ: 設計画面へ');

  /* 項目（同時発射/方向/弾の形/発射音）を ←→ で進める＝プレビューが即反映（描画エラーなし）。 */
  for (let i = 0; i < 4; i++){ tap('ArrowDown'); for (let k = 0; k < 3; k++) tap('ArrowRight'); step(); }
  assert.equal(game.errors.length, 0, 'メッセージ: 設計中の変更で描画エラーなし');

  /* 確定行へ移動して「製作する（決定）」。 */
  const cIdx = forgePanel.rows().findIndex(r => r.kind === 'confirm');
  forgePanel.setCursor(cIdx); step();
  const before = game.state().resource;
  const n0 = advanced.count();
  press('KeyE'); step(2);
  assert.ok(advanced.count() === n0 + 1, 'メッセージ: 開発で1個つくる');
  assert.ok(game.state().resource < before, 'メッセージ: 開発費を支払う');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 武器パネルは全件に到達でき、選択と実行が分かれている（誤装備なし）', t => {
  const { game, step, press, tap } = boot(t);
  enterBase(game, step, press);
  game.addResource(50000);
  const { weaponPanel, arsenal } = game;

  tap('ArrowDown'); tap('ArrowDown'); press('KeyE'); step(2);
  assert.equal(game.state().base.weaponPanel.open, true);
  /* 何個か製造して行数を増やす。 */
  for (let i = 0; i < 3; i++){ weaponPanel.setCursor(0); step(); press('KeyE'); step(2); }
  const total = weaponPanel.rows().length;
  /* 端まで下げても全件（先頭→末尾）に到達できる（クランプ）。 */
  for (let i = 0; i < total + 4; i++) tap('ArrowDown');
  assert.equal(weaponPanel.cursor(), total - 1, 'メッセージ: 末尾まで到達（全件）');
  for (let i = 0; i < total + 4; i++) tap('ArrowUp');
  assert.equal(weaponPanel.cursor(), 0);
  /* 選択だけでは装備は変わらない（実行はボタン／E）。 */
  const eq0 = arsenal.equippedId('torpedo');
  weaponPanel.setCursor(total - 1); step();
  assert.equal(arsenal.equippedId('torpedo'), eq0, 'メッセージ: 選択だけでは換装しない');
  assert.equal(game.errors.length, 0);
});
