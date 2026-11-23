import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STATS, UPGRADE_ITEMS, ITEM_BY_ID,
  effectiveStats, visualScale, nextPrice, isMax, normalizeLevels,
  repairCost, createUpgradeStore, createUpgradePanel, UPGRADE_KEY,
} from '../js/upgrade-rules.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.11.0: 船のそばの整備端末 — 船体修理と 7 項目の改造。
   未購入は現行同等、購入は所持資源と連動（不足/購入済みは消費なし）、
   効果は一度だけ艇に効く、強化は永続。ミサイル威力だけは通常＋改造 3 段で弾体も大きくなる。
   ========================================================================== */

/* --- 純粋ルール --------------------------------------------------------- */

test('改造: 未購入の基礎性能は現行同等（base と一致）', () => {
  const s = effectiveStats({});
  assert.deepEqual(s, { ...BASE_STATS });
  assert.equal(s.maxHp, 100);
  assert.equal(s.maxSpeed, 360);
  assert.equal(s.accel, 1050);
  assert.equal(s.drag, 3.1);
  assert.equal(s.torpedoDmg, 1.5);
  assert.equal(s.missileDmg, 11);
  assert.equal(s.missileBlast, 110);
});

test('改造: 1段でそれぞれの項目が実際に効く（他項目と差が出る）', () => {
  const base = effectiveStats({});
  const expect = {
    armor: ['maxHp', 150, 100],
    mobility: ['drag', 4.8, 3.1],          // 応答。他と違い速度そのものではない
    maxSpeed: ['maxSpeed', 430, 360],
    accel: ['accel', 1500, 1050],
    torpedoDmg: ['torpedoDmg', 2.4, 1.5],
    missileBlast: ['missileBlast', 150, 110],
  };
  for (const [id, [stat, after, before]] of Object.entries(expect)){
    const s = effectiveStats({ [id]: 1 });
    assert.equal(s[stat], after, id + ' が ' + stat + ' に効く');
    assert.equal(base[stat], before, id + ' の未購入は現行値');
    assert.notEqual(after, before, id + ' は前後で差が出る');
  }
});

test('改造: ミサイル威力は通常＋改造3段（威力と見た目のスケール、上限で次価格なし）', () => {
  const it = ITEM_BY_ID.missilePower;
  assert.equal(it.maxLevel, 3);
  assert.deepEqual([0, 1, 2, 3].map(l => effectiveStats({ missilePower: l }).missileDmg), [11, 18, 28, 44]);
  assert.deepEqual([0, 1, 2, 3].map(l => visualScale('missilePower', l)), [1, 1.5, 2.3, 4]);
  assert.equal(visualScale('missileBlast', 0), 1, '見た目は威力の項目だけ');
  assert.deepEqual([0, 1, 2, 3].map(l => nextPrice('missilePower', l)), [350, 700, 1200, null]);
  assert.equal(isMax('missilePower', 3), true);
  assert.equal(isMax('missilePower', 2), false);
  assert.deepEqual([0, 1].map(l => nextPrice('armor', l)), [600, null]);
});

test('改造: 範囲外のレベル・未知の項目は正規化（保存が壊れていても安全）', () => {
  assert.deepEqual(normalizeLevels({ armor: 9, missilePower: 99, bogus: 3 }), {
    armor: 1, mobility: 0, maxSpeed: 0, accel: 0, torpedoDmg: 0, missilePower: 3, missileBlast: 0,
  });
  assert.deepEqual(normalizeLevels({ armor: -4 }), {
    armor: 0, mobility: 0, maxSpeed: 0, accel: 0, torpedoDmg: 0, missilePower: 0, missileBlast: 0,
  });
});

test('改造: 修理費は欠損に比例、満タンは0', () => {
  assert.equal(repairCost(100, 100), 0);
  assert.equal(repairCost(60, 100), 200);      // 40 欠損 × 5
  assert.equal(repairCost(0, 100), 500);
  assert.equal(repairCost(-5, 100), 500, '壊れた値でも安全');
});

/* --- 保存（永続） -------------------------------------------------------- */

test('改造: 保存され、作り直しても維持。範囲外の保存も正規化して読む', () => {
  const store = {};
  const io = { load: () => store.up, save: v => { store.up = v; } };
  const a = createUpgradeStore(io);
  a.setLevel('missilePower', 2);
  a.setLevel('armor', 1);
  assert.deepEqual(store.up, { armor: 1, mobility: 0, maxSpeed: 0, accel: 0, torpedoDmg: 0, missilePower: 2, missileBlast: 0 });

  const b = createUpgradeStore(io);                 // リロード相当
  assert.equal(b.level('missilePower'), 2, 'ミサイル威力が維持');
  assert.equal(b.level('armor'), 1);
  assert.equal(b.owns('armor'), true);
  assert.equal(b.isMax('armor'), true);

  store.up = { missilePower: 99, armor: 'x' };      // 破損した保存
  const c = createUpgradeStore(io);
  assert.equal(c.level('missilePower'), 3, '上限へ丸める');
  assert.equal(c.level('armor'), 0);
});

/* --- パネル（選択／確認／閉じる・資源と連動） --------------------------- */

function fakeLedger(initial){
  let bal = initial;
  return {
    total: () => bal,
    spend: n => { const v = Math.max(0, Math.round(n || 0)); if (v > bal) return false; bal -= v; return true; },
    _bal: () => bal,
  };
}
function makePanel({ balance = 10000, hp = 100, maxHp = 100 } = {}){
  const store = createUpgradeStore({ load: () => null, save: () => {} });
  const ledger = fakeLedger(balance);
  let state = { hp, maxHp };
  const applied = [];
  const panel = createUpgradePanel({
    store, ledger,
    getHp: () => state,
    onApply: act => {
      applied.push(act);
      if (act.type === 'repair') state.hp = Math.min(state.maxHp, state.hp + act.amount);
      else if (act.id === 'armor'){ state.maxHp = 150; state.hp += 50; }
    },
  });
  return { panel, ledger, store, applied, state };
}

test('整備パネル: 不足時は消費せず、購入できたら一度だけ消費して進む', () => {
  const { panel, ledger, store } = makePanel({ balance: 500 });
  panel.open();
  // 行: 0=修理, 1=装甲(600), 2=運動性(500), 3=最高速(550)...
  panel.setCursor(1);                                  // 装甲の価格は 600 > 500
  let r = panel.activate();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'insufficient');
  assert.equal(ledger.total(), 500, '不足時は消費なし');
  assert.equal(store.level('armor'), 0, '購入されない');

  panel.setCursor(2);                                  // 運動性 500
  r = panel.activate();
  assert.equal(r.ok, true);
  assert.equal(ledger.total(), 0, '価格ぶんだけ減る');
  assert.equal(store.level('mobility'), 1);
  assert.equal(panel.rows()[2].state, 'max', '購入済み/上限');

  r = panel.activate();                                // もう一度（上限）
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'max');
  assert.equal(ledger.total(), 0, '上限は消費なし');
});

test('整備パネル: ミサイル威力は段ごとの価格で進み、上限で止まる', () => {
  const { panel, ledger, store } = makePanel({ balance: 10000 });
  panel.open();
  panel.setCursor(6);                                  // ミサイル威力
  const prices = [350, 700, 1200];
  for (let lv = 0; lv < 3; lv++){
    assert.equal(panel.rows()[6].price, prices[lv], 'Lv' + lv + ' の価格');
    const r = panel.activate();
    assert.equal(r.ok, true);
    assert.equal(r.level, lv + 1);
  }
  assert.equal(store.level('missilePower'), 3);
  assert.equal(ledger.total(), 10000 - (350 + 700 + 1200));
  const r = panel.activate();                          // 上限
  assert.equal(r.reason, 'max');
  assert.equal(ledger.total(), 10000 - 2250, '上限は消費なし');
});

test('整備パネル: 船体修理は欠損に比例して消費、満タン/不足は消費なし', () => {
  const { panel, ledger } = makePanel({ balance: 1000, hp: 40, maxHp: 100 });
  panel.open();
  panel.setCursor(0);
  const r = panel.activate();
  assert.equal(r.ok, true);
  assert.equal(r.amount, 60);
  assert.equal(ledger.total(), 1000 - 300);            // 60 × 5

  const full = makePanel({ balance: 1000, hp: 100, maxHp: 100 });
  full.panel.open(); full.panel.setCursor(0);
  assert.equal(full.panel.activate().reason, 'full');
  assert.equal(full.ledger.total(), 1000, '満タンは消費なし');

  const poor = makePanel({ balance: 10, hp: 40, maxHp: 100 });
  poor.panel.open(); poor.panel.setCursor(0);
  assert.equal(poor.panel.activate().reason, 'insufficient');
  assert.equal(poor.ledger.total(), 10, '不足は消費なし');
});

test('整備パネル: 閉じる／選択は出港と別（状態機械）', () => {
  const { panel } = makePanel({ balance: 10000 });
  assert.equal(panel.isOpen(), false);
  panel.open();
  assert.equal(panel.isOpen(), true);
  assert.equal(panel.cursor(), 0);
  panel.move(-1); assert.equal(panel.cursor(), 0, '上端でクランプ');
  panel.move(1);  assert.equal(panel.cursor(), 1);
  panel.close();
  assert.equal(panel.isOpen(), false);
  panel.open();
  assert.equal(panel.cursor(), 0, '開き直すと先頭から');
  assert.equal(panel.rows().length, 1 + UPGRADE_ITEMS.length);
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

/* 撃破済みにして基地を開き、入港する。 */
function enterBase(h){
  const { game, step, press } = h;
  const { G } = h.game;
  G.bossKills = 1;
  G.baseMarker = { x: G.player.x + 80, y: G.player.y };
  step();
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');
}

/* 親メニューから整備・改造を開く（v1.16.0: 徒歩なし。先頭項目なので決定だけ）。 */
function openTerminal(h){
  const { game, step, press } = h;
  assert.equal(game.state().base.screen, 'menu', '入港直後は親メニュー');
  press('KeyE'); step(2);
  assert.equal(game.state().base.panel.open, true, '整備パネルが開く');
}
/* 子メニューを閉じて親へ戻る（v1.16.0）。Esc はレベル入力なので1フレーム保持する。 */
function backToMenu(h){
  const { game, step, keyDown, keyUp } = h;
  keyDown('Escape'); step(); keyUp('Escape'); step();
  assert.equal(game.state().base.screen, 'menu', '子メニューを閉じると親へ');
}
/* 親メニューで「出港」を選んで決定する（選択と実行は別＝誤出港しない）。 */
function departFromMenu(h){
  const { game, step, press, keyDown, keyUp } = h;
  if (game.state().base.screen !== 'menu') backToMenu(h);
  let guard = 0;
  while (game.state().base.selectedId !== 'depart' && guard++ < 8){ keyDown('ArrowDown'); step(); keyUp('ArrowDown'); step(); }
  assert.equal(game.state().base.selectedId, 'depart');
  press('KeyE'); step(2);
}

function cursorTo(h, target){
  const { game, step, keyDown, keyUp } = h;
  let guard = 0;
  while (game.state().base.panel.cursor !== target && guard++ < 40){
    const code = game.state().base.panel.cursor < target ? 'ArrowDown' : 'ArrowUp';
    keyDown(code); step(); keyUp(code); step();
  }
  assert.equal(game.state().base.panel.cursor, target);
}

test('実挙動: 端末で購入 → 残高が減り、実効性能と購入レベルが更新される', t => {
  const h = boot(t);
  const { game, step, press } = h;
  game.addResource(5000);
  enterBase(h);
  openTerminal(h);

  cursorTo(h, 6);                         // ミサイル威力
  const before = game.state().resource;
  press('KeyE'); step();                  // Lv0→1 (350)
  assert.equal(game.state().upgrades.missilePower, 1);
  assert.equal(game.state().stats.missileDmg, 18);
  assert.equal(game.state().resource, before - 350);

  press('KeyE'); step();                  // Lv1→2 (700)
  press('KeyE'); step();                  // Lv2→3 (1200)
  assert.equal(game.state().upgrades.missilePower, 3);
  assert.equal(game.state().stats.missileDmg, 44);
  assert.equal(game.state().resource, before - 2250);

  const mid = game.state().resource;
  press('KeyE'); step();                  // 上限: 消費なし
  assert.equal(game.state().upgrades.missilePower, 3);
  assert.equal(game.state().resource, mid, '上限は消費なし');
});

test('実挙動: 各パラメータが実際に艇へ効く（速度・応答・威力・爆風・装甲）', t => {
  const h = boot(t);
  const { game, step, press, keyDown, keyUp } = h;
  const { G } = game;
  game.addResource(99999);
  enterBase(h);
  openTerminal(h);

  // 全部買う: 装甲(1) 運動性(2) 最高速(3) 加速(4) 魚雷火力(5) 威力(6)×3 爆風(7)
  const buyIndex = idx => { cursorTo(h, idx); press('KeyE'); step(); };
  buyIndex(1); buyIndex(2); buyIndex(3); buyIndex(4); buyIndex(5);
  cursorTo(h, 6); press('KeyE'); step(); press('KeyE'); step(); press('KeyE'); step();
  buyIndex(7);

  const s = game.state().stats;
  assert.equal(s.maxHp, 150);
  assert.equal(s.drag, 4.8);
  assert.equal(s.maxSpeed, 430);
  assert.equal(s.accel, 1500);
  assert.equal(s.torpedoDmg, 2.4);
  assert.equal(s.missileDmg, 44);
  assert.equal(s.missileBlast, 150);
  assert.equal(G.player.maxHp, 150, '装甲で最大船体が上がる');

  // 閉じてから出港（親メニューで出港を選んで決定）→ 潜航で発射物を確認（購入効果は一度だけ適用済み）
  backToMenu(h);
  assert.equal(game.state().base.panel.open, false);
  departFromMenu(h);
  assert.equal(game.state().mode, 'dive', '閉じてから出港できる');

  // 魚雷の威力
  G.bullets.length = 0;
  Input_pressFire(h);
  step();
  const torp = G.bullets.find(b => b.kind === 'torp');
  assert.ok(torp, '魚雷が出る');
  assert.equal(torp.dmg, 2.4, '魚雷火力が弾に乗る');
  assert.equal(torp.aoe, 34, '魚雷の爆発範囲は据え置き');

  // ミサイルの威力・爆風範囲・大きさ（見た目スケール4・命中は先端側）
  G.bullets.length = 0; G.player.missileCd = 0; G.player.missiles = 5;
  press('KeyK'); step();
  const mis = G.bullets.find(b => b.kind === 'missile');
  assert.ok(mis, 'ミサイルが出る');
  assert.equal(mis.dmg, 44, 'ミサイル威力が弾に乗る');
  assert.equal(mis.aoe, 150, '爆風範囲が弾に乗る（判定・リング・吹き飛び共通）');
  assert.equal(mis.vscale, 4, '最終ランクは弾体が大きい');
  assert.ok(mis.hitAhead > 0, '命中判定は先端側へ寄る');
  assert.ok(mis.r <= 15, '半径は広げすぎない');
});

function Input_pressFire(h){ h.press('KeyJ'); }

test('実挙動: 運動性は惰性（減速の応答）を変え、最高速は到達速度を上げる', t => {
  const base = boot(t);
  const baseSpeed = measureSpeed(base);
  const baseCoast = measureCoast(base);

  const up = boot(t);
  up.game.addResource(99999);
  enterBase(up);
  openTerminal(up);
  const buyIndex = idx => { cursorTo(up, idx); up.press('KeyE'); up.step(); };
  buyIndex(2); buyIndex(3);                    // 運動性・最高速
  backToMenu(up);
  assert.equal(up.game.state().base.panel.open, false);
  departFromMenu(up);

  const upSpeed = measureSpeed(up);
  const upCoast = measureCoast(up);
  assert.ok(upSpeed > baseSpeed + 40, '改造で到達速度が上がる (' + baseSpeed.toFixed(0) + '→' + upSpeed.toFixed(0) + ')');
  assert.ok(upCoast < baseCoast * 0.65, '運動性で惰性が減る（横滑り・逆方向と同じ減衰）(' + baseCoast.toFixed(0) + '→' + upCoast.toFixed(0) + ')');
});

/* 一定時間 右へ入力を続けたときの到達速度。 */
function measureSpeed(h){
  const { game, step, keyDown, keyUp } = h;
  game.G.enemies = []; game.G.rocks = []; game.G.spawnT = 30;
  const p = game.G.player;
  p.vx = 0; p.vy = 0; p.x = 600; p.y = 400;
  keyDown('KeyD');
  for (let i = 0; i < 180; i++) step();
  const vx = p.vx;
  keyUp('KeyD'); step();
  return Math.abs(vx);
}
/* 入力を切って 0.5 秒後の残存速度（未改造は速く止まり、運動性があるとさらに早く止まる）。 */
function measureCoast(h){
  const { game, step } = h;
  game.G.enemies = []; game.G.rocks = []; game.G.spawnT = 30;
  const p = game.G.player;
  p.vx = 300; p.vy = 0; p.x = 600; p.y = 400;
  for (let i = 0; i < 30; i++) step();
  return Math.abs(p.vx);
}

test('実挙動: パネル操作は出港と別。開いている間は出港せず、閉じれば出港できる', t => {
  const h = boot(t);
  const { game, step, press, keyDown, keyUp } = h;
  game.addResource(1000);
  enterBase(h);
  // 入港直後は親メニュー（選択は先頭＝整備）
  assert.equal(game.state().base.screen, 'menu');
  openTerminal(h);
  // パネルを開いている間は出港しない（確認操作になる）
  press('KeyE'); step();
  assert.equal(game.state().mode, 'base', 'パネル中の E は出港しない');
  // 閉じる（親へ戻る）
  backToMenu(h);
  assert.equal(game.state().base.panel.open, false);
  // 親メニューで出港を選んで決定
  departFromMenu(h);
  assert.equal(game.state().mode, 'dive');
  assert.equal(game.Input.wantDock, false, '入力を持ち越さない');
});

test('実挙動: 資源と改造はやり直し(startGame)をまたいで維持される', t => {
  const h = boot(t);
  const { game, step, press } = h;
  game.addResource(4000);
  enterBase(h);
  openTerminal(h);
  cursorTo(h, 2);                          // 運動性
  press('KeyE'); step();
  const resAfterBuy = game.state().resource;
  assert.equal(game.state().upgrades.mobility, 1);

  game.startGame();
  assert.equal(game.state().mode, 'dive');
  assert.equal(game.state().resource, resAfterBuy, '残高は維持');
  assert.equal(game.state().upgrades.mobility, 1, '改造は維持');
  assert.equal(game.state().stats.drag, 4.8, '実効性能も維持');
});
