import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasBespokeHull, drawShipBody, drawShipRig, firepowerLandmarks, MIN_HULL,
  FIREPOWER_PLATE, firepowerPlateRect, hullSource, setFirepowerPlate,
  drawFirepowerProcedural,
} from '../js/ship-rig.js';
import { shipRig } from '../js/ship-rules.js';
import { createAbyssDive } from '../js/game.js';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ==========================================================================
   v1.20.0: 火力型の船体を「09 の素材に箱/筒を貼る」から「別の重装艇の船体」へ作り直す。
   - 09 / 機動 / バリア は従来どおり「09 素材＋drawShipRig の差分」＝変更なし。
   - 火力型だけ専用の船体（低く厚い耐圧胴＋一体の兵装区画＋荷重を支える継手＋短い排気）。
   - 前面（+x＝船首）と後面でシルエットが非対称＝向きが読める。
   - 船首の灯火は潜航の光条の出所（LAMP_X=59 / LAMP_Y=17）と一致＝ライトが浮かない。
   - 見た目だけ。当たり・照準・発射位置・物理・バリア・艇の実性能は不変。
   ========================================================================== */

/* --- 純粋（キャンバス非依存の形状判定） --------------------------------- */

test('専用船体: 火力型だけが専用の船体を持つ（他は 09 素材＋差分のまま）', () => {
  assert.equal(hasBespokeHull('firepower'), true);
  assert.equal(hasBespokeHull('09'), false);
  assert.equal(hasBespokeHull('mobility'), false);
  assert.equal(hasBespokeHull('barrier'), false);
  assert.equal(hasBespokeHull('nope'), false, '未知は 09 として扱う');
  assert.equal(hasBespokeHull(undefined), false);
});

test('drawShipBody: 火力型だけ true を返して船体を描く（他は false＝呼び出し側が 09 素材を描く）', t => {
  const ctx = stubCtx();
  assert.equal(drawShipBody(ctx, '09', 150, 54), false);
  assert.equal(drawShipBody(ctx, 'mobility', 150, 54), false);
  assert.equal(drawShipBody(ctx, 'barrier', 150, 54), false);
  assert.equal(drawShipBody(ctx, 'firepower', 150, 54), true);
  assert.equal(drawShipBody(ctx, 'firepower', 638, 151), true, '格納庫縮尺でも描ける');
  assert.equal(lastError, null, 'スタブ ctx で例外を出さない');
});

test('形状: 火力型は低く厚い（高さ < 幅・下部が厚い）＝低い耐圧胴', () => {
  const L = firepowerLandmarks(150, 54);
  const width = L.bowX - L.sternX;
  const height = L.bottomY - L.topY;
  assert.ok(width > height * 1.8, `低く長い（w=${width.toFixed(0)} h=${height.toFixed(0)}）`);
  assert.ok(L.bottomY > Math.abs(L.topY), '下部（腹部）が上部より厚い＝重い胴');
});

test('形状: 前面（+x）と後面で非対称＝向きが読める', () => {
  const L = firepowerLandmarks(150, 54);
  /* 船首は張り出して丸く、船尾は絞る（長さが両端で違う＝前後が判別できる） */
  assert.ok(L.bowX > Math.abs(L.sternX), '船首側が張り出す');
  assert.ok(L.bowX > L.muzzleX && L.muzzleX > 0, '発射口は船首寄り');
  assert.ok(L.sternTaper < 1, '船尾は絞られる');
});

test('灯火: 船首の灯火は潜航の光条と同じ位置（LAMP_X=59 / LAMP_Y=17）に載る', () => {
  const L = firepowerLandmarks(150, 54);          // 潜航の描画サイズ
  const lamps = L.lamps.map(p => [Math.round(p.x), Math.round(p.y)]).sort((a, b) => a[1] - b[1]);
  assert.deepEqual(lamps, [[59, -17], [59, 17]], 'ライトが光条の出所と一致＝浮かない');
});

test('形状: 兵装区画・継手・排気の目印が船体の内側にある（浮いた箱/筒にしない）', t => {
  const L = firepowerLandmarks(150, 54);
  for (const key of ['muzzle', 'arms', 'joints', 'exhausts']){
    assert.ok(Array.isArray(L[key]) && L[key].length > 0, `${key} を持つ`);
    for (const p of L[key]){
      assert.ok(p.x >= L.sternX - 1 && p.x <= L.bowX + 1, `${key} は船体の前後内`);
      assert.ok(p.y >= L.topY - 1 && p.y <= L.bottomY + 1, `${key} は船体の上下内`);
    }
  }
});

test('形状: どの縮尺でも正の大きさを保つ（格納庫/潜航/ドック）', () => {
  for (const [w, h] of [[150, 54], [96, 40], [638, 151], [150, 40], [400, 120]]){
    const L = firepowerLandmarks(w, h);
    assert.ok(L.bowX > L.sternX && L.bottomY > L.topY, `${w}x${h} で正の大きさ`);
    assert.ok(Number.isFinite(L.lamps[0].x) && Number.isFinite(L.lamps[0].y));
  }
  assert.deepEqual(MIN_HULL, { w: 60, h: 22 }, '縮尺の下限（小さすぎて潰れない）');
});

/* --- ctx スタブ（実際の描画が例外を出さないことの確認用） ---------------- */

let lastError = null;
function stubCtx(){
  const gradient = { addColorStop(){} };
  const base = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: () => ({ width: 10 }),
  };
  return new Proxy(base, {
    get(t, k){
      if (k in t) return t[k];
      if (k === 'canvas') return { width: 1280, height: 720 };
      return (...args) => { try { void args; } catch (e) { lastError = e; } };
    },
    set(){ return true; },
  });
}

/* --- 実挙動（本物のゲームループ・入力ハンドラ） -------------------------- */

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

test('実挙動: 火力型の船体は見分けの差分（weaponPod）を保ったまま（形で読める）', t => {
  assert.equal(shipRig('firepower').weaponPod, true);
  const { game, step } = boot(t);
  game.G.enemies = [];
  for (const ship of ['firepower', '09', 'mobility', 'barrier']){
    game.selectShip(ship); step(3);
    assert.equal(game.state().ship, ship);
  }
  assert.equal(game.errors.length, 0);
});

test('実挙動: 火力型でも照準・発射位置・物理は不変（見た目だけ作り直す）', t => {
  const { game, step, press } = boot(t);
  game.G.enemies = [];
  game.selectShip('firepower'); step(2);
  const p = game.G.player;
  press('KeyJ'); step();
  const b = game.G.bullets.find(x => x.kind === 'torp');
  assert.ok(b, '魚雷が飛ぶ');
  assert.ok(Math.abs(b.a - p.aim) < 1e-9, '発射角＝照準');
  assert.ok(Math.abs(b.dmg - 1.5 * 1.35) < 1e-9, '火力型の魚雷威力は据え置き（x1.35）');
  assert.equal(game.state().stats.maxSpeed, 360 * 0.90, '最高速も据え置き');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 換装して火力型→09 へ戻しても船体描画は例外を出さない', t => {
  const { game, step } = boot(t);
  game.G.enemies = [];
  for (const ship of ['09', 'firepower', 'barrier', 'firepower', 'mobility']){
    game.selectShip(ship); step(4);
    assert.equal(game.errors.length, 0, `${ship} でエラーなし`);
  }
});

/* ==========================================================================
   v1.21.0: 火力型の船体を「オフライン（Blender/Cycles）で焼いた透過 WebP の板」で描く。
   - 形（低く厚い・一体の兵装区画・前後の非対称）と、灯火/発射口/排気の位置は v1.20.0 と同じ。
   - 実行時は Canvas2D。板は遅延ロードし、未ロード/失敗のときは従来のプロシージャル船体へ戻す。
   - 見た目だけ。当たり・照準・発射位置・物理・バリア・艇の実性能は不変。
   ========================================================================== */

test('焼き板: FIREPOWER_PLATE が設計座標（w=150/h=54 の船体ローカル）を持つ', () => {
  assert.equal(FIREPOWER_PLATE.file, 'firepower-hull.webp');
  assert.deepEqual(FIREPOWER_PLATE.design, { w: 150, h: 54 });
  const b = FIREPOWER_PLATE.box;
  assert.ok(b.x0 < b.x1 && b.y0 < b.y1, '正の範囲');
});

test('焼き板: firepowerPlateRect は設計箱を呼び出し側の (w,h) へ比例で写す（潜航=150x54 で設計箱と一致）', () => {
  const R = firepowerPlateRect(150, 54);
  const b = FIREPOWER_PLATE.box;
  assert.deepEqual(
    { x: R.x, y: R.y, w: R.w, h: R.h },
    { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 },
    '潜航縮尺では設計箱そのもの',
  );
  /* 格納庫など別縮尺でも x/y 独立に比例（従来のプロシージャルと同じ扱い）。 */
  const R2 = firepowerPlateRect(638, 151);
  assert.ok(Math.abs(R2.x - b.x0 * (638 / 150)) < 1e-6);
  assert.ok(Math.abs(R2.h - (b.y1 - b.y0) * (151 / 54)) < 1e-6);
});

test('焼き板: 灯火・発射口・排気が板の内側にあり、灯火は潜航の光条の出所へ写る（浮かない/切れない）', () => {
  const L = firepowerLandmarks(150, 54);
  const R = firepowerPlateRect(150, 54);
  const b = FIREPOWER_PLATE.box;
  const toPlate = (px, py) => ({ x: R.x + (px - b.x0) / (b.x1 - b.x0) * R.w, y: R.y + (py - b.y0) / (b.y1 - b.y0) * R.h });
  /* 灯火は設計座標で ±59/±17 → 板の中の同じ位置に写る（＝実行時の光条と一致）。 */
  for (const lamp of L.lamps){
    const p = toPlate(lamp.x, lamp.y);
    assert.ok(Math.abs(p.x - lamp.x) < 1e-6 && Math.abs(p.y - lamp.y) < 1e-6, '灯火が板の中で設計座標と一致');
    assert.ok(p.x > R.x && p.x < R.x + R.w && p.y > R.y && p.y < R.y + R.h, '灯火が板の内側');
  }
  /* 発射口・排気・船首/船尾の端まで板に収まる（切れない）。 */
  const pts = [ [L.bowX, 0], [L.sternX - 12, 0], ...L.muzzle.map(p => [p.x, p.y]), ...L.exhausts.map(p => [p.x, p.y]) ];
  for (const [px, py] of pts){
    const p = toPlate(px, py);
    assert.ok(p.x > R.x - 0.5 && p.x < R.x + R.w + 0.5, `x ${px} が板に収まる`);
    assert.ok(p.y > R.y - 0.5 && p.y < R.y + R.h + 0.5, `y ${py} が板に収まる`);
  }
});

test('焼き板: 生成ソース（WebP）が実在し、空でない（生成スクリプトはローカル専用・任意）', () => {
  assert.ok(existsSync(resolve(gameDir, 'assets', FIREPOWER_PLATE.file)), 'assets/firepower-hull.webp');
  assert.ok(statSync(resolve(gameDir, 'assets', FIREPOWER_PLATE.file)).size > 4000, '板が空でない');
  /* tools/firepower_hull.py（再現手順）は本リポジトリではローカル専用（未公開）。
     存在する場合のみ非空を確認する（公開木でもテストが自己完結するため）。 */
  const tool = resolve(gameDir, 'tools', 'firepower_hull.py');
  if (existsSync(tool)) assert.ok(statSync(tool).size > 100, '生成スクリプトが空でない');
});

test('焼き板: 未ロードのときは従来のプロシージャル船体へ戻る（遅延ロード・フォールバック）', () => {
  setFirepowerPlate(null);                       // ローダを初期状態へ（テスト用）
  assert.equal(hullSource('firepower'), 'procedural', '最初はプロシージャル');
  assert.equal(hullSource('09'), 'sprite');
  const ctx = stubCtx();
  assert.equal(drawShipBody(ctx, 'firepower', 150, 54), true, '板が無くても船体は描かれる');
  assert.equal(lastError, null, 'フォールバックで例外を出さない');
  assert.doesNotThrow(() => drawFirepowerProcedural(ctx, 150, 54, { glow: true }));
});

test('焼き板: 板が用意できたら板で描く（drawImage に板を渡す）', () => {
  const rec = recordCtx();
  const fake = { width: 1656, height: 720 };
  setFirepowerPlate(fake);
  try {
    assert.equal(hullSource('firepower'), 'plate');
    assert.equal(drawShipBody(rec.ctx, 'firepower', 150, 54, { glow: true }), true);
    assert.equal(rec.drawImage.length, 1, '板を 1 回 drawImage する');
    assert.equal(rec.drawImage[0][0], fake, '渡した板の画像を使う');
    const R = firepowerPlateRect(150, 54);
    const [, dx, dy, dw, dh] = rec.drawImage[0];
    assert.ok(Math.abs(dx - R.x) < 1e-6 && Math.abs(dy - R.y) < 1e-6);
    assert.ok(Math.abs(dw - R.w) < 1e-6 && Math.abs(dh - R.h) < 1e-6);
  } finally { setFirepowerPlate(null); }
});

test('実挙動: state() が船体の出所（plate/procedural/sprite）を公開する（検証用）', t => {
  const { game, step } = boot(t);
  game.G.enemies = [];
  game.selectShip('firepower'); step(2);
  assert.equal(game.state().hull, 'procedural', '板が無いときはプロシージャル');
  game.setHullPlate({ width: 1656, height: 720 });
  step();
  assert.equal(game.state().hull, 'plate', '板が用意できたら plate');
  game.setHullPlate(null);
  game.selectShip('09'); step(2);
  assert.equal(game.state().hull, 'sprite', '09 は 09 素材');
  assert.equal(game.errors.length, 0);
});

/* drawImage の呼び出しを記録するスタブ ctx（板の描画を確認する）。 */
function recordCtx(){
  const gradient = { addColorStop(){} };
  const drawImage = [];
  const target = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: () => ({ width: 10 }),
    drawImage: (...args) => { drawImage.push(args); },
  };
  const ctx = new Proxy(target, {
    get(t, k){
      if (k in t) return t[k];
      if (k === 'canvas') return { width: 1280, height: 720 };
      return () => {};
    },
    set(){ return true; },
  });
  return { ctx, drawImage };
}
