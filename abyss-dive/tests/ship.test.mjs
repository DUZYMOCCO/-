import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHIP_KEY, SHIP_ORDER, SHIPS, shipDef, normalizeShip,
  applyShipStats, shipBarrierConfig, shipRig, createShipStore, createShipPanel,
} from '../js/ship-rules.js';
import { BASE_STATS, effectiveStats } from '../js/upgrade-rules.js';
import { BASE_WORLD } from '../js/base-rules.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.13.0: 潜水艇の乗り換え（4 艇）。
   - 09 を基準に、機動型／火力型／バリア型。共有の改造・資源はそのまま引き継ぐ。
   - ジャスト受付・報酬は全艇共通（特定の艇を必須にしない）。
   - 換装で船体を無償全回復しない・弾を増やさない。選択は永続。
   - 基地で選択と決定を分ける。両基地（同じ base.js）から乗り換えられる。
   ========================================================================== */

/* --- 純粋ルール --------------------------------------------------------- */

test('艇: 4 艇（09 が基準・先頭）。未知は 09 に正規化', () => {
  assert.deepEqual(SHIP_ORDER, ['09', 'mobility', 'firepower', 'barrier']);
  assert.equal(Object.keys(SHIPS).length, 4);
  assert.equal(shipDef('09').name, '09 万能型');
  assert.equal(normalizeShip('nope'), '09');
  assert.equal(normalizeShip(undefined), '09');
  assert.equal(normalizeShip('firepower'), 'firepower');
  assert.equal(SHIP_KEY, 'abyss_ship');
});

test('艇: 09 は改造後の値そのまま（差分なし＝現行同等）', () => {
  const base = effectiveStats({});
  assert.deepEqual(applyShipStats(base, '09'), { ...base });
  const up = effectiveStats({ torpedoDmg: 1, maxSpeed: 1 });
  assert.deepEqual(applyShipStats(up, '09'), { ...up });
});

test('艇: 機動型＝加速/制動/切り返し◎・耐久/火力控えめ', () => {
  const s = applyShipStats(BASE_STATS, 'mobility');
  assert.ok(s.accel > BASE_STATS.accel, 'メッセージ: 加速が上がる');
  assert.ok(s.maxSpeed > BASE_STATS.maxSpeed, 'メッセージ: 最高速が上がる');
  assert.ok(s.drag > BASE_STATS.drag, 'メッセージ: 応答（切り返し）が上がる');
  assert.ok(s.maxHp < BASE_STATS.maxHp, 'メッセージ: 耐久は控えめ');
  assert.ok(s.torpedoDmg < BASE_STATS.torpedoDmg, 'メッセージ: 火力は控えめ');
});

test('艇: 火力型＝魚雷/ミサイル◎・切り返し不利', () => {
  const s = applyShipStats(BASE_STATS, 'firepower');
  assert.ok(s.torpedoDmg > BASE_STATS.torpedoDmg, 'メッセージ: 魚雷が強い');
  assert.ok(s.missileDmg > BASE_STATS.missileDmg, 'メッセージ: ミサイルが強い');
  assert.ok(s.missileBlast > BASE_STATS.missileBlast, 'メッセージ: 爆風も広い');
  assert.ok(s.drag < BASE_STATS.drag, 'メッセージ: 切り返しは鈍い');
});

test('艇: バリア型＝通常ガードの耐久/持続/再使用に利点。ジャスト受付は変えない', () => {
  const b = shipBarrierConfig('barrier');
  assert.ok(b.DURABILITY > 10, 'メッセージ: 耐久が上');
  assert.ok(b.DURATION > 0.4, 'メッセージ: 持続が長い');
  assert.ok(b.COOLDOWN < 2.0, 'メッセージ: 再使用が短い');
  assert.equal(b.JUST, undefined, 'メッセージ: ジャスト受付は差分に含めない（全艇共通）');
  /* 他艇は通常ガードの差分なし */
  assert.deepEqual(shipBarrierConfig('09'), {});
  assert.deepEqual(shipBarrierConfig('firepower'), {});
});

test('艇: 共有の改造はそのまま重なる（買い直さない）', () => {
  const up = effectiveStats({ torpedoDmg: 1 });       // 2.4
  const s = applyShipStats(up, 'firepower');
  assert.ok(Math.abs(s.torpedoDmg - 2.4 * 1.35) < 1e-9, 'メッセージ: 改造値に倍率が重なる');
});

test('艇: 見分けは形（色だけに依存しない）で 4 艇が別', () => {
  const r09 = shipRig('09');
  const rm = shipRig('mobility');
  const rf = shipRig('firepower');
  const rb = shipRig('barrier');
  assert.equal(r09.twinFins, false);
  assert.equal(rm.twinFins, true, 'メッセージ: 機動型は増加フィン');
  assert.equal(rm.thrusters, 2);
  assert.equal(rf.weaponPod, true, 'メッセージ: 火力型は兵装ポッド');
  assert.equal(rb.barrierEmitter, true, 'メッセージ: バリア型は発生器のリング');
  /* どの艇も特徴の組み合わせが異なる（形で読める） */
  const sig = r => [r.twinFins, r.thrusters, r.weaponPod, r.barrierEmitter].join(',');
  const set = new Set([r09, rm, rf, rb].map(sig));
  assert.equal(set.size, 4);
});

test('艇: 選択は永続（独自キー）。同じ艇は変更なし', () => {
  let saved = null;
  const io = { load: () => saved, save: v => { saved = v; } };
  const store = createShipStore(io);
  assert.equal(store.selected(), '09');
  assert.equal(store.select('firepower'), true);
  assert.equal(saved, 'firepower');
  assert.equal(store.select('firepower'), false, 'メッセージ: 同じ艇は変更なし');
  const store2 = createShipStore({ load: () => saved, save: () => {} });
  assert.equal(store2.selected(), 'firepower', 'メッセージ: 再起動でも維持');
});

test('艇パネル: 選択と決定を分ける（決定で乗り換え・搭乗中は変更なし）', () => {
  const store = createShipStore({ load: () => '09', save: () => {} });
  const picked = [];
  const panel = createShipPanel({ store, onSelect: (id, changed) => picked.push([id, changed]) });
  panel.open();
  assert.equal(panel.cursor(), 0, 'メッセージ: 開くと現在の艇に合わせる');
  assert.equal(panel.rows().length, 4);
  assert.equal(panel.rows()[0].current, true);
  panel.move(1);
  assert.equal(panel.currentRow().id, 'mobility');
  const r = panel.activate();
  assert.deepEqual(r, { ok: true, type: 'ship', id: 'mobility', changed: true });
  assert.equal(store.selected(), 'mobility');
  assert.deepEqual(picked, [['mobility', true]]);
  /* 搭乗中を決定 → 変更なし（消費なし） */
  const r2 = panel.activate();
  assert.equal(r2.changed, false);
  /* 開き直すと現在の艇（mobility）に合わせる */
  panel.close(); panel.open();
  assert.equal(panel.cursor(), 1);
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

test('実挙動: 既定は 09（改造後の値そのまま）', t => {
  const { game } = boot(t);
  assert.equal(game.state().ship, '09');
  const s = game.state().stats;
  assert.equal(s.maxSpeed, 360);
  assert.equal(s.torpedoDmg, 1.5);
  assert.equal(game.errors.length, 0);
});

test('実挙動: 換装で船体を無償回復せず弾も増えない（最大船体に合わせてクランプのみ）', t => {
  const { game } = boot(t);
  const { G } = game;
  G.player.hp = 40; G.player.missiles = 5;
  game.selectShip('barrier');                     // maxHp 105（09 より高い）
  assert.equal(G.player.maxHp, 105);
  assert.equal(G.player.hp, 40, 'メッセージ: 高い最大船体でも回復しない');
  assert.equal(G.player.missiles, 5, 'メッセージ: 弾は増えない');
  game.selectShip('mobility');                    // maxHp 80（低い）
  assert.equal(G.player.maxHp, 80);
  assert.equal(G.player.hp, 40, 'メッセージ: クランプのみ');
  G.player.hp = 78;
  game.selectShip('09');                          // maxHp 100
  assert.equal(G.player.maxHp, 100);
  assert.equal(G.player.hp, 78, 'メッセージ: 増える側でも回復しない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: バリア型は通常ガードの耐久・持続・再使用が優位、ジャスト受付は共通', t => {
  const { game } = boot(t);
  game.selectShip('barrier');
  const cfg = game.G.player.barrier.cfg;
  assert.ok(cfg.DURABILITY > 10);
  assert.ok(cfg.DURATION > 0.4);
  assert.ok(cfg.COOLDOWN < 2.0);
  assert.equal(cfg.JUST, 0.12, 'メッセージ: ジャスト受付は全艇共通');
  game.selectShip('09');
  assert.equal(game.G.player.barrier.cfg.DURABILITY, 10);
  assert.equal(game.errors.length, 0);
});

test('実挙動: 兵装の実挙動も艇差が出る（火力型の魚雷威力が上がる）', t => {
  const { game, step, press } = boot(t);
  game.G.enemies = [];
  /* 09 で 1 発撃つ */
  press('KeyJ'); step();
  const t09 = game.G.bullets.find(b => b.kind === 'torp');
  assert.ok(t09, 'メッセージ: 魚雷が飛ぶ');
  assert.ok(Math.abs(t09.dmg - 1.5) < 1e-9);
  /* 火力型に換装して撃ち直す */
  game.selectShip('firepower');
  game.G.bullets = []; game.G.player.fireCd = 0; game.G.player.heat = 0;
  press('KeyJ'); step();
  const tFP = game.G.bullets.find(b => b.kind === 'torp');
  assert.ok(tFP, 'メッセージ: 換装後も魚雷が飛ぶ');
  assert.ok(Math.abs(tFP.dmg - 1.5 * 1.35) < 1e-9, 'メッセージ: 火力型の魚雷威力が上がる');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 換装しても共有の改造は維持（買い直さない）', t => {
  const { game } = boot(t);
  game.upgrades.setLevel('torpedoDmg', 1);        // 2.4
  assert.equal(game.upgrades.level('torpedoDmg'), 1);
  game.selectShip('firepower');
  assert.equal(game.upgrades.level('torpedoDmg'), 1, 'メッセージ: 改造は消費されない');
  assert.ok(Math.abs(game.state().stats.torpedoDmg - 2.4 * 1.35) < 1e-9, 'メッセージ: 改造×艇差');
  game.selectShip('09');
  assert.ok(Math.abs(game.state().stats.torpedoDmg - 2.4) < 1e-9);
  assert.equal(game.errors.length, 0);
});

test('実挙動: 基地の艇ドックで選択→決定（乗り換え）。出港とは別操作', t => {
  const { game, step, press, keyDown, keyUp } = boot(t);
  const { G } = game;
  /* ボス条件をステージして基地へ入港 */
  G.bossKills = 1; G.baseMarker = { x: G.player.x, y: G.player.y }; step(2);
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');
  assert.equal(game.state().base.ship, '09');
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 入港直後は親メニュー（徒歩なし）');
  /* 親メニューで「艇の換装」を選んで決定 */
  keyDown('ArrowDown'); step(); keyUp('ArrowDown'); step();
  assert.equal(game.state().base.selectedId, 'ship', 'メッセージ: 艇の換装を選択');
  press('KeyE'); step(2);
  assert.equal(game.state().base.shipPanel.open, true, 'メッセージ: 艇選択パネルが開く');
  assert.equal(game.state().base.panel.open, false, 'メッセージ: 整備パネルではない');
  assert.equal(game.state().mode, 'base', 'メッセージ: 出港しない');
  /* ↓ で選択 → E で決定（選択と実行を分ける） */
  keyDown('KeyS'); step(); keyUp('KeyS'); step();
  assert.equal(game.state().base.shipPanel.cursor, 1, 'メッセージ: 機動型を選択');
  press('KeyE'); step(2);
  assert.equal(game.state().ship, 'mobility', 'メッセージ: 決定で乗り換え');
  assert.equal(game.state().base.ship, 'mobility');
  /* Esc で閉じる → 親メニューへ戻る */
  keyDown('Escape'); step(); keyUp('Escape'); step();
  assert.equal(game.state().base.shipPanel.open, false);
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 閉じると親へ');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 艇ドックと整備端末は別メニュー（整備を選べば艇パネルは開かない）', t => {
  const { game, step, press } = boot(t);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: G.player.x, y: G.player.y }; step(2);
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');
  assert.equal(game.state().base.selectedId, 'upgrade', 'メッセージ: 先頭は整備・改造');
  press('KeyE'); step(2);
  assert.equal(game.state().base.panel.open, true, 'メッセージ: 整備パネルが開く');
  assert.equal(game.state().base.shipPanel.open, false);
  assert.equal(G.baseIndex, 1, 'メッセージ: 第1基地でも同じ操作系（両基地対応）');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 艇ドックは第2基地でも同じ（両基地で乗り換えられる）', t => {
  const { game, step, press, keyDown, keyUp } = boot(t);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: 1000, y: 520 }; step();
  const m2 = game.base2Marker();
  G.player.x = m2.x; G.player.y = m2.y; G.player.vx = 0; G.player.vy = 0; step(2);
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');
  assert.equal(G.baseIndex, 2, 'メッセージ: 第2基地へ入港');
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 第2基地にも親メニュー');
  /* 第2基地でも親メニューから艇の換装を選べる */
  keyDown('ArrowDown'); step(); keyUp('ArrowDown'); step();
  press('KeyE'); step(2);
  assert.equal(game.state().base.shipPanel.open, true);
  press('KeyE'); step(2);       // 搭乗中（09）を決定 → 変更なし
  assert.equal(game.state().ship, '09');
  assert.equal(game.errors.length, 0);
});
