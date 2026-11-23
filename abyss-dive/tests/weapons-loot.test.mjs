import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON_KEY, ARSENAL_CAP, WEAPON_TYPES, QUALITIES, TORPEDO_BASE, MISSILE_BASE,
  initialItem, qualityLabel, itemShort, itemPrimary, rollItem, weaponParams,
  manufactureCost, createArsenalStore, createWeaponPanel, salvoSpread, itemShots,
  ENHANCE_MAX, ENHANCE_COST, enhanceCost, enhanceInfo, effectiveItemStats, itemBadge,
  sellValue, salvoPerShell, salvoHeat, designItem, ALLOWED_COUNTS,
} from '../js/weapon-rules.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.15.0: 潜水艇の武器（魚雷・ミサイル）にローグライトな「個体」を持たせる。
   - 初期品（標準装備）は固定で現行同等（倍率 1）。劣っても強制装備しない（装備は明示）。
   - 敵の確率ドロップ＝資源/補給とは別の「回収品」。拾うと倉庫に入る。
   - 基地で種類を選んで資源を使いランダム製造。品質（粗悪〜特上）＋個体ごとの配分。
   - 倉庫は上限つき。満杯は消費なしで拒否（安全）。個体は ID と数値を保存し再抽選しない。
   - 実性能は既存の改造・艇差に個体の倍率を重ねる。
   ========================================================================== */

/* --- 純粋ルール --------------------------------------------------------- */

const seqRng = values => { let i = 0; return () => (i < values.length ? values[i++] : 0.5); };
const constRng = v => () => v;

/* grade（高いほど良い）で全統計を 1 つにまとめる（配分の平均を見るため）。 */
function gradeSum(item){
  let s = 0;
  for (const st of WEAPON_TYPES[item.type].stats){
    const v = item.stats[st.id];
    s += (st.better === 'high' ? v : 1 / v);
  }
  return s / WEAPON_TYPES[item.type].stats.length;
}

test('武器: 初期品は固定（倍率1）で現行挙動と同一', () => {
  const t = initialItem('torpedo');
  const m = initialItem('missile');
  assert.ok(t.initial && m.initial);
  assert.equal(t.type, 'torpedo');
  assert.deepEqual(t.stats, { power:1, speed:1, interval:1, heat:1 });
  assert.deepEqual(m.stats, { power:1, turn:1, speed:1, ammo:1 });
  assert.equal(qualityLabel(t), '標準装備');
  /* 初期品の実パラメータは現行の実数と一致 */
  const tp = weaponParams('torpedo', t);
  assert.equal(tp.dmgMul, 1);
  assert.equal(tp.speed, TORPEDO_BASE.speed);
  assert.equal(tp.fireCd, TORPEDO_BASE.fireCd);
  assert.equal(tp.heat, TORPEDO_BASE.heat);
  const mp = weaponParams('missile', m);
  assert.equal(mp.dmgMul, 1);
  assert.equal(mp.turn, MISSILE_BASE.turn);
  assert.equal(mp.launchSpeed, MISSILE_BASE.launchSpeed);
  assert.equal(mp.accel, MISSILE_BASE.accel);
  assert.equal(mp.ammoCap, 8, '標準ミサイルの装弾数は 8');
  assert.equal(tp.ammoCap, undefined, '魚雷に装弾数は無い（熱方式のまま）');
});

test('武器: 製造価格・種類は魚雷とミサイルの2種', () => {
  assert.deepEqual(Object.keys(WEAPON_TYPES), ['torpedo', 'missile']);
  assert.ok(manufactureCost('torpedo') > 0);
  assert.ok(manufactureCost('missile') > 0);
});

test('武器: ロールは品質の重みで選ばれ、数値は範囲内（rng 注入で決定的）', () => {
  /* 重み: 粗悪 .30 / 並 .42 / 良品 .20 / 特上 .08 */
  const bands = [[0.0, 'poor'], [0.4, 'common'], [0.8, 'fine'], [0.95, 'prime']];
  for (const [c, q] of bands){
    const it = rollItem('torpedo', constRng(c));
    assert.equal(it.quality, q, 'rng=' + c + ' → ' + q);
    for (const st of WEAPON_TYPES.torpedo.stats){
      assert.ok(it.stats[st.id] >= st.lo - 1e-9 && it.stats[st.id] <= st.hi + 1e-9,
        st.id + ' が範囲内: ' + it.stats[st.id]);
    }
  }
});

test('武器: 同じ品質でも配分（突出する項目）が違う＝用途が分かれる', () => {
  /* どちらも並品質だが、消費した乱数が違うので配分が違う */
  const a = rollItem('torpedo', constRng(0.35));
  const b = rollItem('torpedo', constRng(0.60));
  assert.equal(a.quality, 'common');
  assert.equal(b.quality, 'common');
  assert.notDeepEqual(a.stats, b.stats, '同品質でも数値が違う');
  /* 突出（最も grade が高い項目）が読める */
  const pa = itemPrimary(a), pb = itemPrimary(b);
  assert.ok(WEAPON_TYPES.torpedo.stats.some(s => s.id === pa.id));
  assert.ok(WEAPON_TYPES.torpedo.stats.some(s => s.id === pb.id));
});

test('武器: 品質が高いほど総合性能が上がる（多数ロールの平均）', () => {
  let s = 12345;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const acc = { poor:[], common:[], fine:[], prime:[] };
  for (let i = 0; i < 4000; i++){
    const it = rollItem('torpedo', lcg);
    acc[it.quality].push(gradeSum(it));
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const mp = mean(acc.poor), mc = mean(acc.common), mf = mean(acc.fine), mpr = mean(acc.prime);
  assert.ok(mp < mc && mc < mf && mf < mpr,
    '品質順に強くなる: ' + [mp, mc, mf, mpr].map(v => v.toFixed(2)).join(' < '));
});

test('武器: 個体の表示（品質ラベルと突出項目）', () => {
  const it = { id:'w1', type:'missile', quality:'fine', stats:{ power:1.2, turn:1.4, speed:0.95 } };
  assert.equal(itemShort(it), 'ミサイル・良品');
  const p = itemPrimary(it);
  assert.equal(p.id, 'turn', '誘導が最も突出（1.4 が最大 grade）');
  assert.match(p.display, /誘導/);
});

/* --- 倉庫（保存・上限・装備） -------------------------------------------- */

test('武器: 倉庫は保存され、作り直しても同じ個体（再抽選しない）', () => {
  const store = {};
  const io = { load: () => store.arsenal, save: v => { store.arsenal = v; } };
  const a = createArsenalStore(io);
  assert.equal(a.count(), 0);
  assert.equal(a.equippedId('torpedo'), 'initial:torpedo', '既定は初期品');
  const it = { type:'torpedo', quality:'fine', stats:{ power:1.3, speed:1.1, interval:0.9, heat:0.9 } };
  assert.equal(a.add(it).ok, true);
  const id = a.items()[0].id;
  assert.ok(id, 'ID が付く');

  const b = createArsenalStore(io);              // リロード相当
  assert.equal(b.count(), 1);
  assert.equal(b.items()[0].id, id, 'ID が維持');
  assert.deepEqual(b.items()[0].stats, it.stats, '数値が再抽選されない');
  assert.equal(b.items()[0].quality, 'fine');
});

test('武器: 倉庫の上限。満杯は追加しない（安全）', () => {
  const io = { load: () => null, save: () => {} };
  const a = createArsenalStore(io);
  for (let i = 0; i < ARSENAL_CAP; i++) assert.equal(a.add({ type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 } }).ok, true);
  assert.equal(a.count(), ARSENAL_CAP);
  const r = a.add({ type:'missile', quality:'common', stats:{ power:1, turn:1, speed:1 } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'full');
  assert.equal(a.count(), ARSENAL_CAP, '上限を超えない');
});

test('武器: 装備は明示のみ。初期品へいつでも戻せる。装備中は捨てられない', () => {
  const io = { load: () => null, save: () => {} };
  const a = createArsenalStore(io);
  const id = a.add({ type:'torpedo', quality:'poor', stats:{ power:0.8, speed:0.8, interval:1.2, heat:1.2 } }).item.id;
  assert.equal(a.equippedId('torpedo'), 'initial:torpedo', '拾っただけでは装備しない');
  const e = a.equip(id);
  assert.equal(e.ok, true);
  assert.equal(e.changed, true);
  assert.equal(a.equippedId('torpedo'), id);
  /* 初期品へ戻す */
  const back = a.equip('initial:torpedo');
  assert.equal(back.changed, true);
  assert.equal(a.equippedId('torpedo'), 'initial:torpedo');
  /* 装備中は捨てられない */
  a.equip(id);
  assert.equal(a.remove(id), false, '装備中は捨てられない');
  a.equip('initial:torpedo');
  assert.equal(a.remove(id), true, '外せば捨てられる（整理）');
  assert.equal(a.count(), 0);
});

test('武器: 壊れた保存は正規化（未知の型・項目数超過・不正な装備）', () => {
  const io = { load: () => ({ items:[{ type:'lazer', quality:'x', stats:{} }, { type:'torpedo', quality:'fine', stats:{ power:1.1 } }], equipped:{ torpedo:'nope' } }), save: () => {} };
  const a = createArsenalStore(io);
  assert.equal(a.count(), 1, '未知の型は捨てる');
  assert.equal(a.items()[0].type, 'torpedo');
  assert.equal(a.equippedId('torpedo'), 'initial:torpedo', '不正な装備は初期品へ');
});

test('武器: 実性能に個体の倍率が重なる（改造・艇差のあとに掛ける）', () => {
  const it = { type:'missile', quality:'fine', stats:{ power:1.25, turn:1.4, speed:1.1 } };
  const mp = weaponParams('missile', it);
  assert.ok(Math.abs(mp.dmgMul - 1.25) < 1e-9);
  assert.ok(Math.abs(mp.turn - MISSILE_BASE.turn * 1.4) < 1e-9);
  assert.ok(Math.abs(mp.launchSpeed - MISSILE_BASE.launchSpeed * 1.1) < 1e-9);
});

/* --- パネル（製造・換装・比較・捨てる） --------------------------------- */

function fakeLedger(initial){
  let bal = initial;
  return {
    total: () => bal,
    spend: n => { const v = Math.max(0, Math.round(n || 0)); if (v > bal) return false; bal -= v; return true; },
    add: n => { bal += Math.max(0, Math.round(n || 0)); },
    _bal: () => bal,
  };
}
function makePanel(opts = {}){
  const store = createArsenalStore({ load: () => null, save: () => {} });
  const ledger = fakeLedger(opts.balance ?? 10000);
  const equipped = [];
  const panel = createWeaponPanel({
    store, ledger,
    rng: opts.rng || constRng(0.8),
    onEquip: (id, changed) => equipped.push([id, changed]),
  });
  return { panel, ledger, store, equipped };
}

test('武器パネル: 行は 製造2 + 初期品2 + 所持品', () => {
  const { panel } = makePanel();
  panel.open();
  assert.equal(panel.rows().length, 4, '所持0なら4行');
  assert.equal(panel.rows()[0].kind, 'make');
  assert.equal(panel.rows()[0].type, 'torpedo');
  assert.equal(panel.rows()[1].kind, 'make');
  assert.equal(panel.rows()[2].kind, 'item');
  assert.equal(panel.rows()[2].initial, true);
});

test('武器パネル: 製造は資源を消費して1個つくる。不足は消費なし', () => {
  const { panel, ledger, store } = makePanel({ balance: 100 });
  panel.open();
  assert.equal(manufactureCost('torpedo'), 120);
  const poor = panel.activate();                 // 120 > 100
  assert.equal(poor.ok, false);
  assert.equal(poor.reason, 'insufficient');
  assert.equal(ledger.total(), 100, '不足は消費なし');
  assert.equal(store.count(), 0);

  ledger.add(1000);
  const r = panel.activate();
  assert.equal(r.ok, true);
  assert.equal(r.type, 'make');
  assert.equal(store.count(), 1);
  assert.equal(ledger.total(), 1100 - 120, '価格ぶんだけ消費');
  assert.equal(panel.rows().length, 5);
});

test('武器パネル: 満杯は製造しない（消費なし）', () => {
  const { panel, ledger, store } = makePanel({ balance: 100000 });
  for (let i = 0; i < ARSENAL_CAP; i++) store.add({ type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 } });
  panel.open();
  const r = panel.activate();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'full');
  assert.equal(ledger.total(), 100000, '満杯は消費なし');
});

test('武器パネル: 換装（決定）。比較は装備中と候補の差を返す', () => {
  const { panel, store, equipped } = makePanel();
  const id = store.add({ type:'torpedo', quality:'fine', stats:{ power:1.3, speed:1.1, interval:0.9, heat:0.9 } }).item.id;
  panel.open();
  panel.setCursor(4);                            // 最初の所持品
  assert.equal(panel.currentRow().id, id);
  const cmp = panel.compare();
  assert.equal(cmp.typeId, 'torpedo');
  assert.equal(cmp.toLabel, '良品');
  assert.equal(cmp.fromLabel, '標準装備');
  const power = cmp.lines.find(l => l.id === 'power');
  assert.equal(power.dir, 1, '威力は上がる（良い方向）');
  const r = panel.activate();
  assert.equal(r.ok, true);
  assert.equal(r.changed, true);
  assert.equal(store.equippedId('torpedo'), id);
  assert.deepEqual(equipped, [[id, true]]);
});

test('武器パネル: 売却は資源+額を事前提示し、明示確認（二度押し）で資源が増える。装備中・初期品は不可', () => {
  const { panel, store, ledger } = makePanel();
  const id = store.add({ type:'missile', quality:'poor', stats:{ power:0.8, turn:0.8, speed:0.9, ammo:1 } }).item.id;
  panel.open();
  panel.setCursor(4);
  const preview = panel.sellPreview();
  assert.ok(preview && preview.amount > 0, '資源+額を事前に表示できる');
  const bal0 = ledger.total();
  const s1 = panel.sell();                       // 1度目: 確認待ち（消費・消去なし）
  assert.equal(s1.ok, false);
  assert.equal(s1.armed, true);
  assert.equal(store.count(), 1, '確認前は消えない');
  assert.equal(ledger.total(), bal0, '確認前は資源も増えない');
  const s2 = panel.sell();                       // 2度目: 確定
  assert.equal(s2.ok, true);
  assert.equal(store.count(), 0);
  assert.equal(ledger.total(), bal0 + preview.amount, '資源が増える（二重付与なし）');
  /* 初期品の行は売却できない */
  panel.setCursor(2);
  assert.equal(panel.sell().ok, false);
  assert.equal(panel.sell().reason, 'locked');
});

/* --- 実挙動（本物のゲームループ・入力ハンドラ・localStorage を回す） ----- */

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
  /* localStorage の簡易スタブ（保存の往復を検証するため） */
  const mem = new Map();
  globalThis.localStorage = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: k => { mem.delete(k); },
  };
  let next;
  globalThis.requestAnimationFrame = fn => { next = fn; };
  const makeGame = () => {
    const canvas = makeCanvas();
    const game = createAbyssDive({ canvas });
    game.start(); game.startGame();
    t.after(() => game.destroy());
    game.G.rocks = []; game.G.spawnT = 30;
    return game;
  };
  let now = performance.now();
  const step = (count = 1) => { for (let i = 0; i < count; i++) next(now += 1000 / 60); };
  const keyDown = code => window.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  const keyUp = code => window.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  const press = code => { keyDown(code); keyUp(code); };
  return { makeGame, step, press, keyDown, keyUp, mem };
}

/* 敵を1体だけステージして撃破する（回収品ドロップの検証）。 */
function killHunter(game, step){
  const { G } = game;
  G.enemies = [{ kind:'hunter', x:G.player.x + 90, y:G.player.y, r:26, hp:1, maxHp:1, score:120, dmg:0,
    dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0, hitCd:0, phase:0, pt:0, st:0, ang:0, eye:0, jaw:0 }];
  game.Input.wantSonar = true;
  step(2);
}

/* 回収品の位置へ乗り移って拾う。 */
function collectAll(game, step){
  const { G } = game;
  for (let i = 0; i < 12 && G.pickups.some(k => k.kind === 'salvage'); i++){
    const k = G.pickups.find(q => q.kind === 'salvage');
    G.player.x = k.x; G.player.y = k.y;
    step();
  }
}

test('実挙動: 敵撃破で回収品が落ち、拾うと倉庫に入る（資源・補給とは別）', t => {
  const h = boot(t);
  const game = h.makeGame();
  /* 乱数を注入: ドロップ判定も製造ロールもこの1本に分離（表示の乱数とは別） */
  game.G.lootRng = () => 0.0;
  const res0 = game.state().resource;

  killHunter(game, h.step);
  assert.ok(game.G.pickups.some(k => k.kind === 'salvage'), '回収品が落ちる');
  const resAfterKill = game.state().resource;
  assert.ok(resAfterKill > res0, '撃破報酬（資源）は入る');
  assert.equal(game.arsenal.count(), 0, '拾うまで倉庫は空');

  collectAll(game, h.step);
  assert.equal(game.arsenal.count(), 1, '拾うと倉庫に入る');
  assert.equal(game.arsenal.items()[0].type, 'torpedo', 'rng=0 → 魚雷');
  assert.equal(game.state().resource, resAfterKill, '回収品は資源を増やさない（補給とは別）');

  /* 二重払いなし: もう進めても増えない */
  h.step(20);
  assert.equal(game.arsenal.count(), 1);
  assert.equal(game.errors.length, 0);
});

test('実挙動: 基地の武器製作台で製造→換装→潜航で実射すると数値が変わる', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G, Input } = game;
  game.G.lootRng = () => 0.8;                    // 良品・決定的
  game.addResource(5000);

  /* ボス条件をステージして入港 */
  G.bossKills = 1; G.baseMarker = { x: G.player.x, y: G.player.y }; h.step(2);
  h.press('KeyE'); h.step(2);
  assert.equal(game.state().mode, 'base');

  /* 親メニューで武器（3番目）を選択して決定（徒歩なし） */
  for (let i = 0; i < 2; i++){ h.keyDown('ArrowDown'); h.step(); h.keyUp('ArrowDown'); h.step(); }
  assert.equal(game.state().base.selectedId, 'weapon');

  /* E で武器パネル → 製造（魚雷） */
  h.press('KeyE'); h.step(2);
  assert.equal(game.state().base.weaponPanel.open, true);
  const before = game.state().resource;
  h.press('KeyE'); h.step(2);
  assert.equal(game.arsenal.count(), 1, '製造で1個');
  assert.equal(game.state().resource, before - manufactureCost('torpedo'));
  const made = game.arsenal.items()[0];
  assert.equal(made.type, 'torpedo');
  assert.equal(made.quality, 'fine');
  assert.equal(game.arsenal.equippedId('torpedo'), 'initial:torpedo', '製造しただけでは装備しない');

  /* 所持品行まで移動して決定 → 換装 */
  while (game.state().base.weaponPanel.cursor !== 4){ h.keyDown('ArrowDown'); h.step(); h.keyUp('ArrowDown'); h.step(); }
  h.press('KeyE'); h.step(2);
  assert.equal(game.arsenal.equippedId('torpedo'), made.id, '確認で換装');

  /* Esc で閉じる → 親メニュー → 出港 */
  h.keyDown('Escape'); h.step(); h.keyUp('Escape'); h.step();
  assert.equal(game.state().base.weaponPanel.open, false);
  assert.equal(game.state().base.screen, 'menu');
  while (game.state().base.selectedId !== 'depart'){ h.keyDown('ArrowDown'); h.step(); h.keyUp('ArrowDown'); h.step(); }
  h.press('KeyE'); h.step(2);
  assert.equal(game.state().mode, 'dive');

  /* 実射: 初期品と比べて威力・弾速・発射間隔が変わる */
  G.bullets.length = 0; G.enemies = []; G.player.fireCd = 0; G.player.heat = 0;
  Input.mode = 'mouse';
  Input.mx = (G.player.x - G.camX) + 200; Input.my = (G.player.y - G.camY);
  h.press('KeyJ'); h.step();
  const torp = G.bullets.find(b => b.kind === 'torp');
  assert.ok(torp, '魚雷が飛ぶ');
  const wp = weaponParams('torpedo', made);
  assert.ok(Math.abs(torp.dmg - 1.5 * wp.dmgMul) < 1e-9, '威力に個体の倍率が乗る（' + torp.dmg + '）');
  /* 魚雷は毎フレーム弱く加速する（+90px/s^2）ので、1 フレームぶんの誤差を許す */
  assert.ok(Math.abs(Math.hypot(torp.vx, torp.vy) - wp.speed) < 3, '弾速が個体由来（' + Math.hypot(torp.vx, torp.vy) + ' / 期待 ' + wp.speed.toFixed(1) + '）');
  assert.ok(Math.abs(G.player.fireCd - (TORPEDO_BASE.fireCd * made.stats.interval)) < 1e-9, '発射間隔が個体由来');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 拾得した個体は ID と数値が保存され、リロードで再抽選されない', t => {
  const h = boot(t);
  const game = h.makeGame();
  game.G.lootRng = () => 0.0;
  killHunter(game, h.step);
  collectAll(game, h.step);
  const item = game.arsenal.items()[0];
  assert.ok(item && item.id);

  const raw = globalThis.localStorage.getItem('game_studio_abyss_arsenal');
  assert.ok(raw, '保存されている');
  const saved = JSON.parse(raw);
  assert.equal(saved.items[0].id, item.id);
  assert.deepEqual(saved.items[0].stats, item.stats);

  /* 同じ保存から新しいセッションを作る（リロード相当）でも同じ個体 */
  const game2 = h.makeGame();
  assert.equal(game2.arsenal.count(), 1);
  assert.equal(game2.arsenal.items()[0].id, item.id, 'ID が維持');
  assert.deepEqual(game2.arsenal.items()[0].stats, item.stats, '数値が再抽選されない');
  assert.equal(game2.errors.length, 0);
});

test('実挙動: 劣る個体でも強制装備しない（初期品のまま）', t => {
  const h = boot(t);
  const game = h.makeGame();
  game.G.lootRng = () => 0.0;                    // 粗悪ばかり
  killHunter(game, h.step);
  collectAll(game, h.step);
  const it = game.arsenal.items()[0];
  const grade = v => v;                          // power の倍率（小さいほど劣る）
  assert.ok(it.stats.power <= 1, '粗悪の威力');
  assert.equal(game.arsenal.equippedId('torpedo'), 'initial:torpedo', '拾っただけでは装備しない');
  /* 初期品のまま潜航しても威力は現行 1.5 */
  game.G.bullets.length = 0; game.G.enemies = []; game.G.player.fireCd = 0; game.G.player.heat = 0;
  game.Input.mode = 'mouse';
  game.Input.mx = (game.G.player.x - game.G.camX) + 200; game.Input.my = (game.G.player.y - game.G.camY);
  h.press('KeyJ'); h.step();
  const torp = game.G.bullets.find(b => b.kind === 'torp');
  assert.ok(Math.abs(torp.dmg - 1.5) < 1e-9, '初期品のままなら現行どおり');
  assert.equal(game.errors.length, 0);
});

/* --- 強化（資源で段階強化） --------------------------------------------- */

test('武器強化: 威力中心の予測可能な伸び。初期品は保護（対象外）', () => {
  const base = { type:'torpedo', quality:'common', stats:{ power:1.0, speed:1.0, interval:1.0, heat:1.0 } };
  const pw = [0, 1, 2, 3].map(l => effectiveItemStats({ ...base, enh:l }).power);
  assert.ok(Math.abs(pw[0] - 1.00) < 1e-3 && Math.abs(pw[1] - 1.12) < 1e-3 &&
            Math.abs(pw[2] - 1.24) < 1e-3 && Math.abs(pw[3] - 1.36) < 1e-3,
    '威力は 1段ごと +12%: ' + pw.map(v => v.toFixed(2)).join(' '));
  /* low 系（間隔・発熱）は強化で有利（小さくなる） */
  const iv = [0, 1, 2, 3].map(l => effectiveItemStats({ ...base, enh:l }).interval);
  assert.ok(iv[0] > iv[1] && iv[1] > iv[2] && iv[2] > iv[3], '間隔は短くなる: ' + iv.map(v => v.toFixed(3)).join(' '));
  /* 初期品は保護（対象外）、回収/製造個体は対象 */
  assert.equal(enhanceInfo(initialItem('torpedo')).eligible, false);
  assert.equal(enhanceInfo(initialItem('torpedo')).price, null);
  assert.equal(enhanceInfo(base).eligible, true);
});

test('武器強化: 費用は逓増・200段上限（既存3段の費用は不変。指数的に破綻しない）', () => {
  assert.equal(ENHANCE_MAX, 200);
  assert.deepEqual([...ENHANCE_COST].slice(0, 3), [150, 300, 600], '既存3段の費用は不変');
  assert.equal(ENHANCE_COST.length, 200);
  for (let i = 1; i < ENHANCE_COST.length; i++) assert.ok(ENHANCE_COST[i] > ENHANCE_COST[i - 1], '逓増');
  assert.equal(enhanceCost(199), ENHANCE_COST[199]);
  assert.equal(enhanceCost(200), null, '上限で次価格なし');
  assert.ok(ENHANCE_COST[199] < 100000, '最終段の費用も現実的な範囲（指数的な爆発をしない）: ' + ENHANCE_COST[199]);
});

test('武器強化: 段が進んでも ID・品質・ロールは不変（良品に再抽選しない）。保存維持', () => {
  const store = {};
  const io = { load: () => store.a, save: v => { store.a = v; } };
  const a = createArsenalStore(io);
  const id = a.add({ type:'missile', quality:'poor', stats:{ power:0.8, turn:0.9, speed:0.85 } }).item.id;
  const before = { ...a.itemById(id).stats };
  a.enhance(id);
  const it = a.itemById(id);
  assert.equal(it.id, id);
  assert.equal(it.quality, 'poor', '品質は粗悪のまま（良品に再抽選されない）');
  assert.deepEqual(it.stats, before, 'ランダムロールは維持');
  assert.equal(it.enh, 1);
  assert.ok(Math.abs(weaponParams('missile', it).dmgMul - 0.8 * 1.12) < 1e-3, '実性能は強化を反映');

  const b = createArsenalStore(io);            // リロード相当
  assert.equal(b.itemById(id).enh, 1, '強化段が維持');
  assert.deepEqual(b.itemById(id).stats, before, 'ロールも維持');
  assert.equal(b.itemById(id).quality, 'poor');
});

test('武器パネル: 強化は資源を消費、上限/不足/初期は無消費（二重消費なし）', () => {
  const { panel, ledger, store } = makePanel({ balance: 1000000000 });
  const id = store.add({ type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 } }).item.id;
  panel.open();
  panel.setCursor(2);                          // 初期品の行
  const r0 = panel.enhance();
  assert.equal(r0.ok, false);
  assert.equal(r0.reason, 'initial');
  assert.equal(ledger.total(), 1000000000, '初期品は無消費');

  panel.setCursor(4);                          // 所持品の行
  const cmp = panel.compare();
  assert.equal(cmp.enh.level, 0);
  assert.equal(cmp.enh.next, 1);
  assert.equal(cmp.enh.price, 150);
  assert.ok(Math.abs(cmp.enh.powerFrom - 1.0) < 1e-6);
  assert.ok(Math.abs(cmp.enh.powerTo - 1.12) < 1e-6, '次段の威力が読める');

  let bal = 1000000000;
  for (let lv = 1; lv <= ENHANCE_MAX; lv++){
    const r = panel.enhance();
    assert.equal(r.ok, true);
    assert.equal(r.level, lv);
    bal -= ENHANCE_COST[lv - 1];
    assert.equal(ledger.total(), bal, '費用ぶんだけ消費');
  }
  assert.equal(store.itemById(id).enh, ENHANCE_MAX);
  const rMax = panel.enhance();                 // 上限
  assert.equal(rMax.reason, 'max');
  assert.equal(ledger.total(), bal, '上限は消費なし');
});

test('実挙動: 基地で個体を強化→装備→実射に反映、保存/再読込で維持（誤タップ・二重消費なし）', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G } = game;
  game.G.lootRng = () => 0.8;
  game.addResource(3000000);
  const tap = code => { h.keyDown(code); h.step(); h.keyUp(code); h.step(); };

  G.bossKills = 1; G.baseMarker = { x: G.player.x, y: G.player.y }; h.step(2);
  h.press('KeyE'); h.step(2);
  for (let i = 0; i < 2; i++){ h.keyDown('ArrowDown'); h.step(); h.keyUp('ArrowDown'); h.step(); }   // 武器（3番目）を選択
  h.press('KeyE'); h.step(2);                   // 武器パネル
  h.press('KeyE'); h.step(2);                   // 製造（魚雷）
  const made = game.arsenal.items()[0];
  const id = made.id;
  while (game.state().base.weaponPanel.cursor !== 4) tap('ArrowDown');

  const before = game.state().resource;
  tap('KeyC');
  assert.equal(game.arsenal.itemById(id).enh, 1, '強化 +1');
  assert.equal(game.state().resource, before - 150, '強化で消費');
  assert.deepEqual(game.arsenal.itemById(id).stats, made.stats, 'ロールは再抽選されない');
  assert.equal(game.arsenal.itemById(id).quality, made.quality, '品質ラベル維持');

  /* 残りを上限まで一気に強化する（まとめて強化の安全性も同時に確認）。 */
  let spent = ENHANCE_COST[0];
  for (let lv = 2; lv <= ENHANCE_MAX; lv++){ tap('KeyC'); spent += ENHANCE_COST[lv - 1]; }
  assert.equal(game.arsenal.itemById(id).enh, ENHANCE_MAX);
  const afterEnh = game.state().resource;
  assert.equal(afterEnh, before - spent);
  tap('KeyC');                                  // 上限
  assert.equal(game.arsenal.itemById(id).enh, ENHANCE_MAX);
  assert.equal(game.state().resource, afterEnh, '上限は二重消費なし');

  h.press('KeyE'); h.step(2);                   // 装備
  assert.equal(game.arsenal.equippedId('torpedo'), id);

  h.keyDown('Escape'); h.step(); h.keyUp('Escape'); h.step();
  assert.equal(game.state().base.screen, 'menu');
  while (game.state().base.selectedId !== 'depart'){ h.keyDown('ArrowDown'); h.step(); h.keyUp('ArrowDown'); h.step(); }
  h.press('KeyE'); h.step(2);
  assert.equal(game.state().mode, 'dive');

  G.bullets.length = 0; G.enemies = []; G.player.fireCd = 0; G.player.heat = 0;
  game.Input.mode = 'mouse';
  game.Input.mx = (G.player.x - G.camX) + 200; game.Input.my = (G.player.y - G.camY);
  h.press('KeyJ'); h.step();
  const torp = G.bullets.find(b => b.kind === 'torp');
  const wp = weaponParams('torpedo', game.arsenal.itemById(id));
  assert.ok(Math.abs(torp.dmg - 1.5 * wp.dmgMul) < 1e-9, '強化が実射の威力に反映（' + torp.dmg + '）');
  assert.ok(wp.dmgMul > made.stats.power, 'なしより強い（' + made.stats.power + '→' + wp.dmgMul.toFixed(3) + '）');

  const game2 = h.makeGame();                    // リロード相当
  assert.equal(game2.arsenal.itemById(id).enh, ENHANCE_MAX, '再読込で強化維持');
  assert.equal(game2.arsenal.itemById(id).quality, made.quality);
  assert.equal(game2.arsenal.equippedId('torpedo'), id, '装備も維持');
  assert.equal(game2.errors.length, 0);
});

test('実挙動: 武器はやり直し(startGame)をまたいで保持される（試作: 世界・死亡時ルールは変えない）', t => {
  const h = boot(t);
  const game = h.makeGame();
  game.G.lootRng = () => 0.8;
  game.addResource(5000);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: G.player.x, y: G.player.y }; h.step(2);
  h.press('KeyE'); h.step(2);
  for (let i = 0; i < 2; i++){ h.keyDown('ArrowDown'); h.step(); h.keyUp('ArrowDown'); h.step(); }   // 武器（3番目）を選択
  h.press('KeyE'); h.step(2);
  h.press('KeyE'); h.step(2);                    // 製造
  const id = game.arsenal.items()[0].id;
  while (game.state().base.weaponPanel.cursor !== 4){ h.keyDown('ArrowDown'); h.step(); h.keyUp('ArrowDown'); h.step(); }
  h.press('KeyE'); h.step(2);                    // 換装
  assert.equal(game.arsenal.equippedId('torpedo'), id);

  game.startGame();
  assert.equal(game.state().mode, 'dive');
  assert.equal(game.arsenal.count(), 1, '武器は維持');
  assert.equal(game.arsenal.equippedId('torpedo'), id, '装備も維持');
  assert.equal(game.errors.length, 0);
});

/* --- v1.15.0+: 同時発射数・射出方向・外観 --------------------------------- */

test('武器: 発射数は魚雷1〜3 / ミサイル1〜2、方向は単発/並列/扇状、外観は標準を含む', () => {
  let s = 20240701;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const counts = { torpedo:{}, missile:{} }, pats = {}, styles = { torpedo:{}, missile:{} };
  for (let i = 0; i < 3000; i++){
    const t = rollItem('torpedo', lcg);
    counts.torpedo[t.count] = (counts.torpedo[t.count] || 0) + 1;
    pats[t.pattern] = (pats[t.pattern] || 0) + 1;
    styles.torpedo[t.style] = (styles.torpedo[t.style] || 0) + 1;
    assert.ok(t.count >= 1 && t.count <= 3, '魚雷 count 1..3: ' + t.count);
    assert.ok(['single', 'parallel', 'fan'].indexOf(t.pattern) >= 0);
    assert.ok(['stock', 'slender', 'stout'].indexOf(t.style) >= 0);
    if (t.count < 2) assert.equal(t.pattern, 'single', '単発は single');
    const m = rollItem('missile', lcg);
    counts.missile[m.count] = (counts.missile[m.count] || 0) + 1;
    styles.missile[m.style] = (styles.missile[m.style] || 0) + 1;
    assert.ok(m.count >= 1 && m.count <= 2, 'ミサイル count 1..2: ' + m.count);
    assert.ok(['stock', 'finned', 'stout'].indexOf(m.style) >= 0);
    if (m.count < 2) assert.equal(m.pattern, 'single');
  }
  assert.deepEqual(Object.keys(counts.torpedo).map(Number).sort(), [1, 2, 3], '魚雷は1〜3が出る');
  assert.deepEqual(Object.keys(counts.missile).map(Number).sort(), [1, 2], 'ミサイルは1〜2が出る');
  assert.ok(pats.parallel > 0 && pats.fan > 0, '並列と扇状が出る');
  assert.ok(styles.torpedo.stock > 0 && styles.torpedo.slender > 0 && styles.torpedo.stout > 0, '標準を含む3種');
});

test('武器: 斉射の幾何は対称・単発は中央・背後へ撃たない（count×方向）', () => {
  assert.deepEqual(salvoSpread(1, 'single'), [{ dAng:0, lat:0 }], '単発は中央・角度0');
  /* 並列: 同方向（角度0）、横位置が左右対称 */
  const p2 = salvoSpread(2, 'parallel');
  assert.equal(p2.length, 2);
  assert.ok(Math.abs(p2[0].dAng) < 1e-12 && Math.abs(p2[1].dAng) < 1e-12, '並列は同方向');
  assert.ok(Math.abs(p2[0].lat + p2[1].lat) < 1e-12 && Math.abs(p2[0].lat) > 0, '横位置が左右対称');
  const p3 = salvoSpread(3, 'parallel');
  assert.ok(Math.abs(p3[1].lat) < 1e-12, '並列3連の中央は 0');
  assert.ok(p3[0].lat < 0 && p3[2].lat > 0 && Math.abs(p3[0].lat + p3[2].lat) < 1e-12, '左右対称');
  /* 扇状: 角度が対称、中央 0、背後へ撃たない */
  const f3 = salvoSpread(3, 'fan');
  assert.ok(Math.abs(f3[1].dAng) < 1e-12, '扇状の中央は角度0');
  assert.ok(f3[0].dAng < 0 && f3[2].dAng > 0 && Math.abs(f3[0].dAng + f3[2].dAng) < 1e-12, '上下対称に開く');
  for (const sp of f3) assert.ok(Math.abs(sp.dAng) < Math.PI / 2, '背後へは撃たない');
  /* count>=2 で pattern 不明なら並列へフォールバック */
  assert.ok(Math.abs(salvoSpread(2, 'zzz')[0].lat) > 0, '未指定は並列');
});

test('武器: 多連は1発威力を割引・発熱は斉射ぶん（多連を無条件の上位にしない）', () => {
  const one = { type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 }, count:1, pattern:'single' };
  const two = { ...one, count:2, pattern:'parallel' };
  const three = { ...one, count:3, pattern:'fan' };
  const w1 = weaponParams('torpedo', one), w2 = weaponParams('torpedo', two), w3 = weaponParams('torpedo', three);
  assert.ok(Math.abs(w1.dmgMul - 1) < 1e-9 && Math.abs(w1.heat - TORPEDO_BASE.heat) < 1e-9, '単発は従来');
  assert.ok(Math.abs(w2.dmgMul - 0.80) < 1e-9, '2連は1発0.80倍: ' + w2.dmgMul);
  assert.ok(Math.abs(w3.dmgMul - 0.66) < 1e-9, '3連は1発0.66倍: ' + w3.dmgMul);
  assert.ok(Math.abs(w2.salvoMul - 1.60) < 1e-9 && Math.abs(w3.salvoMul - 1.98) < 1e-9, '実効火力は線形未満');
  assert.ok(Math.abs(w2.heat - TORPEDO_BASE.heat * 2) < 1e-9, '発熱は斉射ぶん（2連）');
  assert.ok(Math.abs(w3.heat - TORPEDO_BASE.heat * 3) < 1e-9, '発熱は斉射ぶん（3連）');
  assert.equal(w1.count, 1); assert.equal(w1.pattern, 'single'); assert.equal(w1.style, 'stock');
  assert.ok((w3.salvoMul / w3.heat) < (w1.salvoMul / w1.heat), '熱効率は多連が劣る');
});

test('武器: 発射数・方向・外観は保存され、旧保存・壊れた保存は単発・標準へ正規化', () => {
  const store = {};
  const io = { load: () => store.a, save: v => { store.a = v; } };
  const a = createArsenalStore(io);
  const id = a.add({ type:'torpedo', quality:'fine', stats:{ power:1.1, speed:1, interval:1, heat:1 }, count:3, pattern:'fan', style:'slender' }).item.id;
  const b = createArsenalStore(io);
  assert.equal(b.itemById(id).count, 3, '発射数が保存');
  assert.equal(b.itemById(id).pattern, 'fan', '方向が保存');
  assert.equal(b.itemById(id).style, 'slender', '外観が保存');
  /* 旧保存（count/pattern/style なし）＝単発・標準 */
  const old = { load: () => ({ items:[{ id:'w9', type:'missile', quality:'fine', stats:{ power:1.1, turn:1, speed:1 } }], equipped:{} }), save: () => {} };
  const c = createArsenalStore(old);
  assert.equal(c.itemById('w9').count, 1); assert.equal(c.itemById('w9').pattern, 'single'); assert.equal(c.itemById('w9').style, 'stock');
  /* 壊れた値は安全に（上限クランプ・未知は既定へ） */
  const bad = { load: () => ({ items:[{ id:'w8', type:'missile', quality:'fine', stats:{}, count:99, pattern:'zzz', style:'nope' }], equipped:{} }), save: () => {} };
  const d = createArsenalStore(bad);
  assert.equal(d.itemById('w8').count, 2, 'ミサイル上限2へクランプ');
  assert.equal(d.itemById('w8').pattern, 'parallel', '未知の pattern は並列');
  assert.equal(d.itemById('w8').style, 'stock', '未知の style は標準');
});

test('武器: 強化しても発射数・方向・外観は再抽選されない（保存維持）', () => {
  const store = {};
  const io = { load: () => store.a, save: v => { store.a = v; } };
  const a = createArsenalStore(io);
  const id = a.add({ type:'torpedo', quality:'poor', stats:{ power:0.8, speed:1, interval:1, heat:1 }, count:3, pattern:'fan', style:'stout' }).item.id;
  a.enhance(id); a.enhance(id);
  const it = a.itemById(id);
  assert.equal(it.count, 3); assert.equal(it.pattern, 'fan'); assert.equal(it.style, 'stout');
  const b = createArsenalStore(io);
  assert.equal(b.itemById(id).count, 3); assert.equal(b.itemById(id).pattern, 'fan'); assert.equal(b.itemById(id).style, 'stout');
  assert.equal(b.itemById(id).enh, 2);
});

test('武器: 外観（style）は性能に一切影響しない', () => {
  const base = { type:'missile', quality:'fine', stats:{ power:1.2, turn:1.1, speed:1.05 }, count:2, pattern:'parallel' };
  const a = weaponParams('missile', { ...base, style:'stock' });
  const b = weaponParams('missile', { ...base, style:'finned' });
  assert.equal(a.dmgMul, b.dmgMul); assert.equal(a.turn, b.turn);
  assert.equal(a.launchSpeed, b.launchSpeed); assert.equal(a.cruiseSpeed, b.cruiseSpeed); assert.equal(a.accel, b.accel);
  assert.equal(a.count, b.count); assert.equal(a.salvoMul, b.salvoMul);
  assert.equal(a.style, 'stock'); assert.equal(b.style, 'finned');
});

/* 個体を直接つくって装備する（パネル経由の換装を通さず、wp を再計算）。 */
function equip(game, raw){
  const r = game.arsenal.add(raw);
  game.arsenal.equip(r.item.id);
  game.G.wp = { torpedo: weaponParams('torpedo', game.arsenal.equipped('torpedo')),
                missile: weaponParams('missile', game.arsenal.equipped('missile')) };
  return r.item;
}
function aimRight(game){
  const { G } = game;
  G.bullets.length = 0; G.enemies = []; G.player.fireCd = 0; G.player.heat = 0;
  game.Input.mode = 'mouse';
  game.Input.mx = (G.player.x - G.camX) + 200; game.Input.my = (G.player.y - G.camY);
}

test('実挙動: 単発（初期品）は従来どおり1発・正面・標準の外観', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G } = game;
  aimRight(game);
  h.press('KeyJ'); h.step();
  const aim = G.player.aim;                     // 発射フレームの照準（弾と同じ値）
  const torps = G.bullets.filter(b => b.kind === 'torp');
  assert.equal(torps.length, 1, '単発は1発');
  assert.ok(Math.abs(torps[0].a - aim) < 1e-9, '照準軸（正面）');
  assert.equal(torps[0].style, 'stock', '標準の外観');
  assert.ok(!torps[0].homeDelay, '単発は誘導を遅らせない（従来の挙動）');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 並列は同方向・左右対称の横位置で count 発（実弾の本数と位置・弾速）', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G } = game;
  equip(game, { type:'torpedo', quality:'common', stats:{ power:1, speed:1.2, interval:1, heat:1 }, count:2, pattern:'parallel', style:'stout' });
  aimRight(game);
  h.press('KeyJ'); h.step();
  const aim = G.player.aim;
  const torps = G.bullets.filter(b => b.kind === 'torp');
  assert.equal(torps.length, 2, '2発');
  assert.ok(Math.abs(torps[0].a - aim) < 1e-9 && Math.abs(torps[1].a - aim) < 1e-9, '並列は同方向（照準軸に平行）');
  /* 横位置が左右対称：2弾の差は照準軸に直交し、長さがある（＝発射位置がずれて見える） */
  const dx = torps[1].x - torps[0].x, dy = torps[1].y - torps[0].y;
  const along = dx * Math.cos(aim) + dy * Math.sin(aim);
  const perp = -dx * Math.sin(aim) + dy * Math.cos(aim);
  assert.ok(Math.abs(along) < 1e-6, '差は照準軸に沿わない（発射位置の横ズレ）');
  assert.ok(Math.abs(perp) > 1, '目で見えるズレ: ' + perp.toFixed(1));
  for (const b of torps) assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 900 * 1.2) < 4, '弾速は個体由来');
  assert.equal(torps[0].style, 'stout', '外観は個体由来');
  assert.ok(torps[0].homeDelay > 0, '多連は発射直後の進路を保つ');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 扇状は照準軸を中心に上下対称に開き、背後へ撃たない', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G } = game;
  equip(game, { type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 }, count:3, pattern:'fan' });
  aimRight(game);
  h.press('KeyJ'); h.step();
  const aim = G.player.aim;
  const torps = G.bullets.filter(b => b.kind === 'torp');
  assert.equal(torps.length, 3, '3発');
  const angs = torps.map(b => b.a).sort((x, y) => x - y);
  assert.ok(Math.abs(angs[1] - aim) < 1e-9, '中央は照準軸');
  assert.ok(Math.abs(angs[0] + angs[2] - 2 * aim) < 1e-9, '上下対称');
  assert.ok(angs[0] < aim && angs[2] > aim, '扇状に開く');
  for (const a of angs) assert.ok(Math.abs(a - aim) < Math.PI / 2, '背後には飛ばない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: ミサイルは斉射ぶん消費、残数を越えない（残り1は単発・空撃ちなし）', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G, Input } = game;
  equip(game, { type:'missile', quality:'common', stats:{ power:1, turn:1, speed:1 }, count:2, pattern:'parallel' });
  const fire = () => { G.bullets.length = 0; G.player.missileCd = 0; Input.mode = 'mouse'; Input.mx = (G.player.x - G.camX) + 200; Input.my = (G.player.y - G.camY); Input.wantMissile = true; h.step(); };
  G.player.missiles = 5;
  fire();
  assert.equal(G.bullets.filter(b => b.kind === 'missile').length, 2, '2発同時');
  assert.equal(G.player.missiles, 3, '2発消費');
  fire();
  assert.equal(G.player.missiles, 1);
  fire();
  assert.equal(G.bullets.filter(b => b.kind === 'missile').length, 1, '残り1なら単発');
  assert.equal(G.player.missiles, 0, '残数を越えない');
  fire();
  assert.equal(G.player.missiles, 0, '無料複製なし');
  assert.equal(G.bullets.filter(b => b.kind === 'missile').length, 0, '空撃ちなし');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 発熱は斉射ぶん（多連で増え、単発は従来のまま）', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G } = game;
  G.player.heat = 0; aimRight(game); h.press('KeyJ'); h.step();
  const h1 = G.player.heat;
  equip(game, { type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 }, count:3, pattern:'fan' });
  G.player.heat = 0; aimRight(game); h.press('KeyJ'); h.step();
  const h3 = G.player.heat;
  assert.ok(Math.abs(h1 - TORPEDO_BASE.heat) < 0.02, '単発は base ぶん: ' + h1.toFixed(3));
  assert.ok(Math.abs((h3 - h1) - TORPEDO_BASE.heat * 2) < 0.02, '多連は差ぶん増える: ' + (h3 - h1).toFixed(3));
  assert.ok(h3 < 1, '3連でも1斉射で過熱しない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 多連でも長押し連射は維持（離すと止まる）', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G, Input } = game;
  equip(game, { type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 }, count:2, pattern:'parallel' });
  G.enemies = []; G.bullets.length = 0; G.player.heat = 0; G.player.fireCd = 0;
  Input.mode = 'mouse'; Input.mx = (G.player.x - G.camX) + 200; Input.my = (G.player.y - G.camY);
  h.keyDown('KeyJ');
  for (let i = 0; i < 6; i++) h.step();
  const held = G.bullets.filter(b => b.kind === 'torp').length;
  assert.ok(held >= 2, '押しっぱなしで斉射が続く（' + held + '発）');
  h.keyUp('KeyJ');
  G.bullets.length = 0;
  for (let i = 0; i < 20; i++) h.step();
  assert.equal(G.bullets.filter(b => b.kind === 'torp').length, 0, '離したら新しい発射はしない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 多連は発射直後の進路を保つ（誘導で即座に束にならない）', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G, Input } = game;
  equip(game, { type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 }, count:2, pattern:'fan' });
  /* 正面に生きた標的（扇状の外弾は照準軸から ±0.08rad で、前方コーン内） */
  G.enemies = [{ kind:'hunter', x:G.player.x + 600, y:G.player.y, r:26, hp:999, maxHp:999, score:0, dmg:0,
    dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0, hitCd:0, phase:0, pt:0, st:0, ang:0, eye:0, jaw:0 }];
  G.bullets.length = 0; G.player.fireCd = 0; G.player.heat = 0;
  Input.mode = 'mouse'; Input.mx = (G.player.x - G.camX) + 200; Input.my = (G.player.y - G.camY);
  h.press('KeyJ'); h.step();
  const launch = G.bullets.filter(b => b.kind === 'torp').map(b => b.a);
  assert.equal(launch.length, 2);
  h.step();                                     // homeDelay 中（0.12s 未満）
  const after1 = G.bullets.filter(b => b.kind === 'torp').map(b => b.a);
  for (let i = 0; i < launch.length; i++) assert.ok(Math.abs(after1[i] - launch[i]) < 1e-9, '発射直後は向きを保つ');
  for (let i = 0; i < 14; i++) h.step();        // homeDelay 経過後
  const after = G.bullets.filter(b => b.kind === 'torp');
  const moved = after.some((b, i) => Math.abs(b.a - launch[i]) > 1e-4);
  assert.ok(moved || after.length === 0, '遅延後は誘導がかかり始める');
  assert.equal(game.errors.length, 0);
});

test('実パネル: 比較は実値（弾速など）と斉射（発射数・方向・実効火力・発熱/消費弾）・外観を返す', () => {
  const store = createArsenalStore({ load: () => null, save: () => {} });
  const ledger = fakeLedger(100000);
  const panel = createWeaponPanel({ store, ledger, rng: constRng(0.8) });
  const id = store.add({ type:'torpedo', quality:'fine', stats:{ power:1.2, speed:1.1, interval:0.9, heat:0.9 }, count:3, pattern:'fan', style:'slender' }).item.id;
  panel.open();
  panel.setCursor(4);
  const cmp = panel.compare();
  assert.equal(cmp.typeId, 'torpedo');
  const spd = cmp.lines.find(l => l.id === 'speed');
  assert.ok(spd.fromReal != null && spd.toReal != null, '弾速に実値がある');
  assert.ok(Number(spd.toReal) > Number(spd.fromReal), '弾速の実値が読める: ' + spd.fromReal + '→' + spd.toReal);
  assert.equal(cmp.salvo.fromCount, 1); assert.equal(cmp.salvo.toCount, 3);
  assert.equal(cmp.salvo.toPattern, 'fan'); assert.equal(cmp.salvo.toShots, '×3 扇状');
  assert.ok(Math.abs(cmp.salvo.toPower - 1.98) < 1e-9, '実効1斉射火力が読める');
  assert.ok(cmp.salvo.toHeat != null && cmp.salvo.toAmmo == null, '魚雷は発熱/斉射を表示');
  assert.equal(cmp.salvo.toStyle, '細身');
  /* ミサイルは消費弾を表示 */
  const mid = store.add({ type:'missile', quality:'common', stats:{ power:1, turn:1, speed:1 }, count:2, pattern:'fan', style:'finned' }).item.id;
  panel.setCursor(5);
  const cmp2 = panel.compare();
  assert.equal(cmp2.candidateId, mid);
  assert.equal(cmp2.salvo.toAmmo, 2); assert.equal(cmp2.salvo.toHeat, null);
  assert.equal(cmp2.salvo.toShots, '×2 扇状');
});

/* --- v1.16.0+: 指定開発の形状/発射音/着弾音が実弾と実音へ届く ------------------- */

test('実挙動: 個体の形状/発射音/着弾音が独立に弾と実音へ届く（旧 style は三者へ互換）', t => {
  const h = boot(t);
  const game = h.makeGame();
  const { G } = game;

  /* 魚雷: 形状=細身 / 発射音=ずんぐり / 着弾音=細身（三者が別の値）。 */
  equip(game, { type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 },
    count:1, pattern:'single', projectile:'slender', launchSound:'stout', impactSound:'slender' });
  const twp = weaponParams('torpedo', game.arsenal.equipped('torpedo'));
  assert.equal(twp.projectile, 'slender'); assert.equal(twp.launchSound, 'stout'); assert.equal(twp.impactSound, 'slender');

  const launches = [];
  const origShoot = game.AU.shoot; game.AU.shoot = function(s){ launches.push(s); };
  aimRight(game); h.press('KeyJ'); h.step();
  const tb = G.bullets.find(x => x.kind === 'torp');
  assert.ok(tb, '魚雷が飛ぶ');
  assert.equal(tb.projectile, 'slender'); assert.equal(tb.launchSound, 'stout'); assert.equal(tb.impactSound, 'slender');
  assert.ok(launches.includes('stout'), '射出音は launchSound（旧 style 経路ではない）');
  game.AU.shoot = origShoot;

  /* ミサイル: 形状=流線 / 発射音=尾翼 / 着弾音=ずんぐり（三者が別）。 */
  equip(game, { type:'missile', quality:'common', stats:{ power:1, turn:1, speed:1 },
    count:1, pattern:'single', projectile:'sleek', launchSound:'finned', impactSound:'stout' });
  const mwp = weaponParams('missile', game.arsenal.equipped('missile'));
  assert.equal(mwp.projectile, 'sleek'); assert.equal(mwp.launchSound, 'finned'); assert.equal(mwp.impactSound, 'stout');
  const mL = [];
  const origML = game.AU.mLaunch; game.AU.mLaunch = function(s){ mL.push(s); };
  G.bullets.length = 0; G.player.missileCd = 0; G.player.missiles = 3;
  game.Input.mode = 'mouse'; game.Input.mx = (G.player.x - G.camX) + 200; game.Input.my = (G.player.y - G.camY);
  game.Input.wantMissile = true; h.step();
  const mb = G.bullets.find(x => x.kind === 'missile');
  assert.ok(mb, 'ミサイルが飛ぶ');
  assert.equal(mb.projectile, 'sleek'); assert.equal(mb.launchSound, 'finned'); assert.equal(mb.impactSound, 'stout');
  assert.ok(mL.includes('finned'), 'ミサイル射出音は launchSound');
  game.AU.mLaunch = origML;

  /* 旧 style だけの個体は三者が同じ値へ互換される（未指定は標準）。 */
  const legacy = game.arsenal.add({ type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 },
    count:1, pattern:'single', style:'slender' }).item;
  assert.equal(legacy.projectile, 'slender'); assert.equal(legacy.launchSound, 'slender'); assert.equal(legacy.impactSound, 'slender');

  /* 保存 → リロード（新セッション）でも三者維持・実弾へ届く。 */
  const game2 = h.makeGame();
  const eq2 = game2.arsenal.equipped('missile');
  assert.equal(eq2.projectile, 'sleek'); assert.equal(eq2.launchSound, 'finned'); assert.equal(eq2.impactSound, 'stout');
  assert.equal(game2.G.wp.missile.projectile, 'sleek', 'リロード後の実パラメータにも反映');
  assert.equal(game.errors.length, 0);
  assert.equal(game2.errors.length, 0);
});

/* --- v1.17.0: 装弾数（ミサイルの個体軸）と庫の拡張・売却 ------------------ */

test('装弾数: ミサイルだけが持つ個体軸。ロール・比較・保存・実パラメータへ届く', () => {
  /* 型の定義: ミサイルだけ ammo 軸を持ち、魚雷には無い（熱方式のまま）。 */
  assert.ok(WEAPON_TYPES.missile.stats.some(s => s.id === 'ammo' && s.real === 8));
  assert.ok(!WEAPON_TYPES.torpedo.stats.some(s => s.id === 'ammo'));
  /* ロールで装弾数が振れる（倍率 → 実数）。 */
  let s = 7;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const caps = new Set();
  for (let i = 0; i < 500; i++){
    const it = rollItem('missile', lcg);
    const p = weaponParams('missile', it);
    assert.ok(p.ammoCap >= 6 && p.ammoCap <= 12, '装弾数は 6..12（倍率0.75..1.5 × 8）: ' + p.ammoCap);
    caps.add(p.ammoCap);
  }
  assert.ok(caps.size > 2, '同じ品質でも装弾数が振れる');
  /* 保存 → リロードでも ammo ロールが維持される。 */
  const store = {};
  const io = { load: () => store.a, save: v => { store.a = v; } };
  const a = createArsenalStore(io);
  const id = a.add({ type:'missile', quality:'fine', stats:{ power:1, turn:1, speed:1, ammo:1.4 } }).item.id;
  const b = createArsenalStore(io);
  assert.equal(b.itemById(id).stats.ammo, 1.4, '装弾数のロールが保存される');
  assert.equal(weaponParams('missile', b.itemById(id)).ammoCap, Math.round(8 * 1.4));
});

test('装弾数: 強化で段が上がっても装弾数は伸びる（威力中心＋他項目も有利側）', () => {
  const base = { type:'missile', quality:'common', stats:{ power:1, turn:1, speed:1, ammo:1 } };
  const caps = [0, 1, 2, 3].map(l => weaponParams('missile', { ...base, enh:l }).ammoCap);
  assert.ok(caps[0] === 8 && caps[3] > caps[0], '強化で装弾数が増える: ' + caps.join(' / '));
});

test('武器パネル: 比較に装弾数（残弾上限）の前後が出る', () => {
  const { panel, store } = makePanel();
  const id = store.add({ type:'missile', quality:'fine', stats:{ power:1, turn:1, speed:1, ammo:1.5 } }).item.id;
  panel.open();
  panel.setCursor(4);
  assert.equal(panel.currentRow().id, id);
  const cmp = panel.compare();
  const ammo = cmp.lines.find(l => l.id === 'ammo');
  assert.ok(ammo, '装弾数の行がある');
  assert.equal(ammo.fromReal, '8');
  assert.equal(ammo.toReal, '12');
  assert.equal(ammo.dir, 1, '装弾数は増える方向');
  assert.equal(cmp.salvo.toAmmoCap, 12, '実効の残弾上限が読める');
});

test('武器: 標準系の庫は 40、追加（遠距離）は 32 まで持てる', () => {
  assert.equal(ARSENAL_CAP, 40);
});

test('武器: 選択は装備・強化でずれず、売却後も同じ位置を指す', () => {
  const { panel, store } = makePanel();
  const id1 = store.add({ type:'torpedo', quality:'common', stats:{ power:1, speed:1, interval:1, heat:1 } }).item.id;
  const id2 = store.add({ type:'torpedo', quality:'fine',   stats:{ power:1.2, speed:1, interval:1, heat:1 } }).item.id;
  panel.open();
  panel.setCursor(4);
  const at4 = panel.currentRow().id;
  panel.activate();                              // 換装
  assert.equal(panel.cursor(), 4, '装備してもカーソルは同じ行');
  assert.equal(panel.currentRow().id, at4, '同じ個体を指したまま');
  panel.enhance();                               // 強化
  assert.equal(panel.cursor(), 4, '強化してもカーソルは同じ行');
  assert.equal(panel.currentRow().id, at4);
});

test('武器: 売却額は品質・強化段が高いほど大きい（初期品は 0）', () => {
  const poor = { type:'torpedo', quality:'poor', stats:{}, enh:0 };
  const prime = { type:'torpedo', quality:'prime', stats:{}, enh:0 };
  const enhanced = { type:'torpedo', quality:'prime', stats:{}, enh:3 };
  assert.equal(sellValue(initialItem('torpedo')), 0, '初期品は売却できない（0）');
  assert.ok(sellValue(poor) > 0);
  assert.ok(sellValue(prime) > sellValue(poor));
  assert.ok(sellValue(enhanced) > sellValue(prime));
});

test('確率: 単発が最多・同じ発射数なら並列 < 扇状・3連並列は全ロールの 1〜3%（固定シード）', () => {
  let s = 99;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const N = 60000;
  const c = { single:0, c2f:0, c2p:0, c3f:0, c3p:0 };
  for (let i = 0; i < N; i++){
    const it = rollItem('torpedo', lcg);
    if (it.count < 2) c.single++;
    else if (it.count === 2) (it.pattern === 'parallel' ? c.c2p++ : c.c2f++);
    else (it.pattern === 'parallel' ? c.c3p++ : c.c3f++);
  }
  const r = k => c[k] / N;
  assert.ok(r('single') > 0.55, '単発が最多: ' + (r('single') * 100).toFixed(1) + '%');
  assert.ok(r('c2p') < r('c2f'), '2連は並列 < 扇状');
  assert.ok(r('c3p') < r('c2p'), '3連並列は2連並列より希少');
  assert.ok(r('c3p') >= 0.008 && r('c3p') <= 0.03, '3連並列は全ロールの 1〜3%: ' + (r('c3p') * 100).toFixed(2) + '%');
  assert.ok(r('c2p') < 0.10, '2連並列は現行（14.5%）より少ない: ' + (r('c2p') * 100).toFixed(2) + '%');
});

test('斉射: 4 以上は扇状のみ・全体角は上限内・12 ウェイまで。威力は逓減・熱は 1 斉射で過熱しない', () => {
  assert.deepEqual(ALLOWED_COUNTS('torpedo'), [1, 2, 3, 4, 6, 9, 12]);
  for (const n of [4, 6, 9, 12]){
    const sp = salvoSpread(n, 'parallel');        // pattern を並列で渡しても 4 以上は扇へ
    assert.equal(sp.length, n);
    assert.ok(sp.every(s => Math.abs(s.lat) < 1e-9), n + ' ウェイは並列にならない');
    const angs = sp.map(s => s.dAng);
    for (let i = 0; i < n; i++) assert.ok(Math.abs(angs[i] + angs[n - 1 - i]) < 1e-12, '上下対称');
    if (n % 2 === 1) assert.ok(Math.abs(angs[(n - 1) / 2]) < 1e-12, '奇数は中央 0');
    for (const a of angs) assert.ok(Math.abs(a) <= 0.53, '全体角は上限内: ' + a.toFixed(3));
  }
  assert.ok(salvoSpread(2, 'parallel').some(s => s.lat !== 0), '並列は最大 3 まで');
  assert.ok(salvoSpread(3, 'parallel').some(s => s.lat !== 0));
  const ps = [1, 2, 3, 4, 6, 9, 12].map(salvoPerShell);
  for (let i = 1; i < ps.length; i++) assert.ok(ps[i] <= ps[i - 1], '1発威力は逓減');
  for (const n of [1, 2, 3, 4, 6, 9, 12]) assert.ok(salvoHeat(TORPEDO_BASE.heat, n) < 1, 'n=' + n + ' は 1 斉射で過熱しない');
});

test('斉射: 序盤のランダム抽選は 1/2/3 のみ。4 以上は指定開発（扇状のみ）で到達', () => {
  let s = 7;
  const lcg = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < 8000; i++){
    const it = rollItem('torpedo', lcg);
    assert.ok(it.count <= 3, '序盤ロールは 1..3 のみ: ' + it.count);
    if (it.count >= 2) assert.ok(it.pattern === 'parallel' || it.pattern === 'fan');
  }
  const big = designItem('torpedo', { count:12, pattern:'fan' }, () => 0.5);
  assert.ok(big && big.count === 12 && big.pattern === 'fan', '12 ウェイ扇を開発できる');
  assert.equal(designItem('torpedo', { count:12, pattern:'parallel' }, () => 0.5), null, '12 ウェイ並列は拒否');
});

