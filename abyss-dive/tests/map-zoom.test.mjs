import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAP, MAP_KEY, SITE_IDS, WORLD_BOTTOM, createDiscoveredStore, sitesWithin,
  deepVisible, clampMapScale, stepMapScale, mapProject, mapUnproject, mapViewRect,
  clampMapCenter, recenterTo, panByDrag, depthLabel, depthMarks, siteName,
} from '../js/map-rules.js';
import {
  ZOOM_LEVELS, ZOOM_MIN, ZOOM_MAX, clampZoom, nearestLevel, cycleZoom, nudgeZoom, zoomStep, visibleWorldWidth,
} from '../js/zoom-rules.js';
import { createAbyssDive } from '../js/game.js';
import { FLOOR_Y, TRENCH } from '../js/trench-rules.js';

/* ==========================================================================
   v2.1.0（隔離試作）: 透過マップ（縦断面）と、見た目だけの潜航ズーム。
   - 発見記録は専用キー・有界・旧セーブ互換（資源/スコア/既存の探索記録とは別系統）。
   - マップの見え方（投影・拡大・パン・制限）は純粋関数。
   - 潜航ズームは描画だけ＝シミュレーション（位置・敵・交戦）を変えない。
   ========================================================================== */

/* --- 純粋ルール: 発見記録 ------------------------------------------------ */

test('発見記録: 専用キーで有界。未知 id は保存しない・重複しない', () => {
  let saved = null;
  const store = createDiscoveredStore({ load: () => saved, save: (v) => { saved = v; } });
  assert.equal(store.count(), 0, 'メッセージ: 空から始まる');
  assert.equal(store.add('outpost-1'), true, 'メッセージ: 既知 id は記録できる');
  assert.equal(store.add('outpost-1'), false, 'メッセージ: 重複は増えない');
  assert.equal(store.add('made-up-city'), false, 'メッセージ: 未知 id は拒否（有界）');
  assert.equal(store.count(), 1);
  assert.deepEqual(saved.ids, ['outpost-1'], 'メッセージ: 保存は既知 id だけ');
  assert.ok(store.SITE_IDS === SITE_IDS);
  assert.ok(MAP_KEY.startsWith('game_studio_abyss_'), 'メッセージ: 独自キー（別系統）');
  assert.ok(!/resource|score/i.test(MAP_KEY), 'メッセージ: 資源・スコアのキーではない');
});

test('発見記録: 旧セーブ互換（壊れた値でも空から・未知 id を捨てる）', () => {
  const s1 = createDiscoveredStore({ load: () => null, save: () => {} });
  assert.equal(s1.count(), 0);
  const s2 = createDiscoveredStore({ load: () => ({ v: 1, ids: ['outpost-1', 'ghost-city', 42] }), save: () => {} });
  assert.deepEqual(s2.list(), ['outpost-1'], 'メッセージ: 未知 id は読み飛ばす');
  const s3 = createDiscoveredStore({ load: () => 'broken', save: () => {} });
  assert.equal(s3.count(), 0, 'メッセージ: 壊れた値でも落ちない');
});

test('発見記録: 範囲内の候補だけを返す（純粋）', () => {
  const sites = [{ id:'outpost-1', x:6400, y:1560 }, { id:'ruin-entrance', x:1450, y:430, range:300 }];
  assert.deepEqual(sitesWithin(6400, 1560, sites), ['outpost-1']);
  assert.deepEqual(sitesWithin(1500, 430, sites), ['ruin-entrance']);
  assert.deepEqual(sitesWithin(0, 0, sites), []);
  assert.deepEqual(sitesWithin(6400, 1560, [{ id:'ghost', x:6400, y:1560 }]), [], 'メッセージ: 未知 id は対象外');
});

test('発見記録: 深部は発見するまで伏せる（deepVisible）', () => {
  const store = createDiscoveredStore({ load: () => null, save: () => {} });
  assert.equal(deepVisible(store), false, 'メッセージ: 未発見は false');
  store.add('deepshelf');
  assert.equal(deepVisible(store), true, 'メッセージ: 発見後に true');
  assert.equal(deepVisible(['deepshelf']), true, 'メッセージ: 配列でも同じ');
  assert.equal(deepVisible(null), false);
});

/* --- 純粋ルール: マップの見え方 ----------------------------------------- */

test('マップ: 拡大率は範囲内に収まり、＋/− で段が変わる', () => {
  assert.equal(clampMapScale(999), MAP.SCALE_MAX);
  assert.equal(clampMapScale(0.0001), MAP.SCALE_MIN);
  assert.equal(clampMapScale(NaN), MAP.SCALE_DEFAULT);
  const inn = stepMapScale(MAP.SCALE_DEFAULT, 1);   // ＋＝拡大（寄る）
  const out = stepMapScale(MAP.SCALE_DEFAULT, -1);  // −＝縮小（引く）
  assert.ok(inn > MAP.SCALE_DEFAULT && out < MAP.SCALE_DEFAULT, 'メッセージ: ＋で拡大・−で縮小');
  assert.ok(out >= MAP.SCALE_MIN && inn <= MAP.SCALE_MAX, 'メッセージ: 端で止まる');
});

test('マップ: 投影と逆投影が往復一致する', () => {
  const view = { cx: 5000, cy: 1500, scale: 0.2, pw: 800, ph: 500 };
  const s = mapProject(5123, 1607, view);
  const w = mapUnproject(s.x, s.y, view);
  assert.ok(Math.abs(w.x - 5123) < 1e-6 && Math.abs(w.y - 1607) < 1e-6, 'メッセージ: 往復一致');
  /* 中心はパネル中央へ。 */
  const c = mapProject(view.cx, view.cy, view);
  assert.equal(c.x, view.pw / 2); assert.equal(c.y, view.ph / 2);
});

test('マップ: 見える範囲は拡大率に反比例する', () => {
  const a = mapViewRect({ cx: 0, cy: 0, scale: 0.5, pw: 800, ph: 400 });
  const b = mapViewRect({ cx: 0, cy: 0, scale: 0.25, pw: 800, ph: 400 });
  assert.ok((b.x1 - b.x0) > (a.x1 - a.x0), 'メッセージ: 引くほど広く見える');
  assert.equal(b.x1 - b.x0, 800 / 0.25);
});

test('マップ: 中心は世界の範囲内に制限される（世界サイズを超えない）', () => {
  const bounds = { xMin: 0, xMax: 20000, yMin: 0, yMax: WORLD_BOTTOM };
  const c = clampMapCenter(-99999, 999999, 0.2, 800, 500, bounds);
  assert.ok(c.cx >= bounds.xMin && c.cx <= bounds.xMax, 'メッセージ: x は範囲内');
  assert.ok(c.cy >= bounds.yMin && c.cy <= bounds.yMax, 'メッセージ: y は範囲内');
  /* 範囲が画面より狭いときは中央へ寄せる。 */
  const c2 = clampMapCenter(0, 0, 0.6, 1200, 800, { xMin: 0, xMax: 500, yMin: 0, yMax: 500 });
  assert.equal(c2.cx, 250); assert.equal(c2.cy, 250);
});

test('マップ: パンはドラッグ量に応じて中心を逆方向へ動かす', () => {
  const m = panByDrag(5000, 1000, 100, -50, 0.2);
  assert.equal(m.cx, 5000 - 100 / 0.2);
  assert.equal(m.cy, 1000 + 50 / 0.2);
  const r = recenterTo(10000, 2000, 0.2, 800, 500, { xMin: 0, xMax: 20000, yMin: 0, yMax: WORLD_BOTTOM });
  assert.equal(r.cx, 10000); assert.equal(r.cy, 2000);
  /* 端に近いほど余白で止まる（世界の外へは出さない）。 */
  const edge = recenterTo(1234, 900, 0.2, 800, 500, { xMin: 0, xMax: 20000, yMin: 0, yMax: WORLD_BOTTOM });
  assert.ok(edge.cx >= 0 && edge.cy >= 0, 'メッセージ: 世界の外へ出ない');
});

test('マップ: 深度目盛りとラベル（ゲーム HUD と同じ y/2.6 m）', () => {
  assert.equal(depthLabel(FLOOR_Y), '1000 m');
  assert.equal(depthLabel(0), '0 m');
  const marks = depthMarks(WORLD_BOTTOM);
  assert.equal(marks[0], 0);
  assert.equal(marks[marks.length - 1], WORLD_BOTTOM);
  assert.equal(WORLD_BOTTOM, FLOOR_Y + TRENCH.DEPTH, 'メッセージ: 世界下端は海底＋海溝の深さ');
  assert.equal(siteName('deepshelf'), '第二前哨基地 深棚');
  assert.equal(siteName('unknown'), 'unknown', 'メッセージ: 未知はそのまま');
});

/* --- 純粋ルール: 潜航ズーム --------------------------------------------- */

test('ズーム: 3 段（1.0/0.8/0.65）を巡回し、等倍へ戻れる', () => {
  assert.deepEqual([...ZOOM_LEVELS], [1.0, 0.8, 0.65]);
  let z = ZOOM_LEVELS[0];
  const seq = [z];
  for (let i = 0; i < 3; i++){ z = cycleZoom(z); seq.push(z); }
  assert.deepEqual(seq, [1.0, 0.8, 0.65, 1.0], 'メッセージ: 1.0→0.8→0.65→1.0');
  assert.equal(cycleZoom(0.7), ZOOM_LEVELS[0], 'メッセージ: 中間値は最も近い段の次へ');
});

test('ズーム: 範囲は [0.65, 1.0]。等倍より寄らない', () => {
  assert.equal(clampZoom(2), ZOOM_MIN);
  assert.equal(clampZoom(0.1), ZOOM_MAX);
  assert.equal(clampZoom(NaN), 1.0);
  assert.equal(nudgeZoom(1.0, 0.5), 0.65, 'メッセージ: ピンチでも下限で止まる');
  assert.equal(nudgeZoom(0.65, -0.5), 1.0, 'メッセージ: 上限で止まる');
  assert.equal(nearestLevel(0.62), 0.65);
});

test('ズーム: 目標へ滑らかに収束し、1 フレームで飛ばない', () => {
  let z = 1.0; const target = 0.65;
  let prev = z;
  for (let i = 0; i < 60; i++){
    z = zoomStep(z, target, 1 / 60);
    assert.ok(z >= target - 1e-9 && z <= 1.0 + 1e-9, 'メッセージ: 範囲内');
    assert.ok(z <= prev + 1e-9, 'メッセージ: 単調に引いていく');
    assert.ok(prev - z <= 0.9 + 1e-9, 'メッセージ: 1 フレームで飛ばない');
    prev = z;
  }
  assert.ok(Math.abs(z - target) < 0.01, 'メッセージ: 目標へ収束（z=' + z.toFixed(3) + '）');
  /* 等倍へ戻るのも同じ式。 */
  let u = 0.65; for (let i = 0; i < 90; i++) u = zoomStep(u, 1.0, 1 / 60);
  assert.ok(u > 0.99, 'メッセージ: 等倍へ戻る（u=' + u.toFixed(3) + '）');
  /* 大きな dt でも最大変化量でクランプ。 */
  const jump = zoomStep(1.0, 0.65, 5);
  assert.ok(jump >= 1.0 - 0.9 - 1e-9, 'メッセージ: 大 dt でも飛ばない');
  assert.equal(visibleWorldWidth(0.5, 1000), 1000 / 0.65, 'メッセージ: 下限でクランプ');
});

/* --- 実挙動（ゲームループ・入力ハンドラ） ------------------------------- */

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
  game.G.rocks = []; game.G.spawnT = 1e9;
  let now = performance.now();
  /* 固定 dt（17ms）で回す。フレーム時間を一定にして比較を決定的にする。 */
  const step = (count = 1) => { for (let i = 0; i < count; i++) next(now += 17); };
  const keyDown = code => window.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  const keyUp = code => window.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  const press = code => { keyDown(code); keyUp(code); };
  return { game, step, press, keyDown, keyUp };
}

test('実挙動: マップを開くと潜航が止まり、閉じると戻る（操作は潜航へ漏れない）', t => {
  const { game, step, press, keyDown, keyUp } = boot(t);
  const { G } = game;
  step(2);
  assert.equal(game.state().mapOn, false);
  press('KeyG'); step(2);
  assert.equal(game.state().mapOn, true, 'メッセージ: G でマップが開く');
  const px = G.player.x;
  /* マップ中は移動キーを押しても潜航が進まない（安全な一時停止）。 */
  keyDown('KeyD'); step(20); keyUp('KeyD'); step();
  assert.equal(G.player.x, px, 'メッセージ: マップ中は動かない');
  assert.equal(game.state().state, 'play', 'メッセージ: 潜航状態は保つ（別画面にしない）');
  /* Escape で閉じると再び動く。 */
  press('Escape'); step(2);
  assert.equal(game.state().mapOn, false, 'メッセージ: Escape で閉じる');
  keyDown('KeyD'); step(20); keyUp('KeyD');
  assert.ok(G.player.x > px, 'メッセージ: 閉じたら進む');
  assert.equal(game.errors.length, 0, 'メッセージ: JS エラーなし');
});

test('実挙動: マップを閉じても入港しない（予約入力を隔離する）', t => {
  const { game, step, press } = boot(t);
  const { G } = game;
  /* 入口のすぐそばに置く。 */
  G.player.x = 1450; G.player.y = 430; G.player.vx = 0; G.player.vy = 0;
  step(2);
  assert.equal(game.state().entranceNear, true, 'メッセージ: 入口のそば');
  press('KeyG'); step(2);
  assert.equal(game.state().mapOn, true);
  game.Input.wantDock = true;          // マップ中に降艇入力が来ても
  press('Escape'); step(4);
  assert.equal(game.state().mapOn, false);
  assert.equal(game.state().mode, 'dive', 'メッセージ: 閉じても降艇しない（入力隔離）');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 発見記録は近づいた拠点・遺跡だけ（専用キー・有界）', t => {
  const { game, step } = boot(t);
  const { G } = game;
  step();
  assert.deepEqual(game.state().discovered, [], 'メッセージ: 最初は未発見');
  assert.equal(game.state().deepVisible, false, 'メッセージ: 深部は伏せられている');
  /* 前哨基地のそばへ。 */
  G.player.x = G.baseMarker.x; G.player.y = G.baseMarker.y; G.player.vx = 0; G.player.vy = 0;
  step(3);
  assert.ok(game.state().discovered.includes('outpost-1'), 'メッセージ: 前哨を発見');
  assert.ok(!game.state().discovered.includes('deepshelf'), 'メッセージ: 深部はまだ未発見');
  assert.equal(game.discovered.count() <= SITE_IDS.length, true, 'メッセージ: 記録は有界');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 深部（海溝）は発見してからマップに出す', t => {
  const { game, step } = boot(t);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: 1000, y: 520 };
  step(2);
  assert.equal(game.state().trench, true, 'メッセージ: 海溝は世界に存在する');
  assert.equal(game.state().deepVisible, false, 'メッセージ: 未発見ならマップでは伏せる');
  const m2 = game.base2Marker();
  G.player.x = m2.x; G.player.y = m2.y; G.player.vx = 0; G.player.vy = 0;
  step(3);
  assert.ok(game.state().discovered.includes('deepshelf'), 'メッセージ: 深棚を発見');
  assert.equal(game.state().deepVisible, true, 'メッセージ: 発見後にマップへ出す');
});

test('実挙動: 潜航ズームはシミュレーションを変えない（位置が一致する）', t => {
  const { game, step, keyDown, keyUp } = boot(t);
  const { G } = game;
  step(6);   // フレーム時刻を一定間隔へ整えてから比較する（dt を決定的に）
  const trail = (z) => {
    game.startGame();
    game.setDiveZoom(z);
    const out = [];
    keyDown('KeyD');
    for (let i = 0; i < 30; i++){
      G.rocks = []; G.enemies = []; G.genX = 1e12; G.spawnT = 1e9;   // 地形生成・敵を除外して物理だけを見る
      step(); out.push(+G.player.x.toFixed(6));
    }
    keyUp('KeyD');
    return out;
  };
  const at1 = trail(1.0);
  const at08 = trail(0.8);
  const at065 = trail(0.65);
  assert.deepEqual(at08, at1, 'メッセージ: 0.8× でも位置は変わらない');
  assert.deepEqual(at065, at1, 'メッセージ: 0.65× でも位置は変わらない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 正逆座標が一致し、照準が同じ投影で合う', t => {
  const { game, step } = boot(t);
  const { G } = game;
  step();
  for (const z of [1.0, 0.8, 0.65]){
    game.setDiveZoom(z);
    step();
    const s = game.worldToScreen(G.player.x, G.player.y);
    const w = game.screenToWorld(s.x, s.y);
    assert.ok(Math.abs(w.x - G.player.x) < 1e-3 && Math.abs(w.y - G.player.y) < 1e-3, 'メッセージ: 往復一致 z=' + z);
  }
  /* 等倍では従来の (world - cam) と一致。 */
  game.setDiveZoom(1.0); step();
  const s0 = game.worldToScreen(G.camX + 400, G.camY + 300);
  assert.ok(Math.abs(s0.x - 400) < 1e-6 && Math.abs(s0.y - 300) < 1e-6, 'メッセージ: 等倍は従来どおり');
  /* マウスの照準: 自艇の右横を指すと aim ≒ 0。 */
  game.Input.mode = 'mouse';
  const ps = game.worldToScreen(G.player.x + 300, G.player.y);
  game.Input.mx = ps.x; game.Input.my = ps.y;
  step();
  assert.ok(Math.abs(G.player.aim) < 0.02, 'メッセージ: 逆変換で照準が合う（aim=' + G.player.aim.toFixed(3) + '）');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 縮尺ボタンは 1 段ずつ切り替わる（地図の拡大とは独立）', t => {
  const { game, step } = boot(t);
  step();
  assert.equal(game.state().diveZoomTarget, 1.0);
  game.cycleDiveZoom(); step(); assert.equal(game.state().diveZoomTarget, 0.8);
  game.cycleDiveZoom(); step(); assert.equal(game.state().diveZoomTarget, 0.65);
  game.cycleDiveZoom(); step(); assert.equal(game.state().diveZoomTarget, 1.0, 'メッセージ: 等倍へ復帰');
  /* 開いたマップの拡大率は潜航ズームと別。 */
  game.openMap(); step(2);
  const mapScale = game.mapState().scale;
  game.cycleDiveZoom(); step(20);
  assert.equal(game.mapState().scale, mapScale, 'メッセージ: 地図の拡大率は変わらない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: マップの ＋/−・現在地・パンが効く（専用操作）', t => {
  const { game, step } = boot(t);
  const { G } = game;
  G.player.x = 9000; G.player.y = 1500; G.player.vx = 0; G.player.vy = 0;   // 世界の内側（パンの余地）
  step(2);
  game.openMap(); step(3);
  const s0 = game.mapState().scale;
  game.map.zoom(1); step(30);   // ＋＝拡大
  const s1 = game.mapState().scale;
  assert.ok(s1 > s0, 'メッセージ: ＋ で拡大');
  game.map.zoom(-1); step(30);  // −＝縮小
  assert.ok(game.mapState().scale < s1, 'メッセージ: − で縮小');
  /* パンしてから現在地へ戻す。 */
  game.map.panPanel(200, 120); step();
  const moved = game.mapState();
  game.map.recenter(); step();
  const back = game.mapState();
  assert.notEqual(moved.cx, back.cx, 'メッセージ: パンで中心が動く');
  assert.equal(game.errors.length, 0);
});
