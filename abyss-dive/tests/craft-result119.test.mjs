import { test } from 'node:test';
import assert from 'node:assert/strict';
import { craftResultView, craftResultTitle, openCraftResult, closeCraftResult, craftResultIsOpen }
  from '../js/craft-result.js';
import { createBaseState, BASE_UI } from '../js/base-rules.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   製作結果モーダル: 成功が確定・保存された時だけ、その個体の実結果を出す。
   プレビュー流用で実ロールをごまかさない（弾形/斉射/カテゴリ別の数値/装弾は該当時）。
   ========================================================================== */

/* --- 純粋モデル: 通常製作（魚雷） ----------------------------------------- */

test('モデル: 失敗/非製作の結果では開かない（null）', () => {
  assert.equal(craftResultView(null), null);
  assert.equal(craftResultView({ ok:false, type:'make', reason:'insufficient' }), null);
  assert.equal(craftResultView({ ok:false, type:'design', reason:'full' }), null);
  assert.equal(craftResultView({ ok:true, type:'equip', itemId:'w1' }), null);
  assert.equal(craftResultView({ ok:true, type:'make' }), null);            // item 欠落
  assert.equal(craftResultView({ ok:true, type:'make', item:{ type:'unknown' } }), null);
});

test('モデル: 通常製作の魚雷は 実名/品質/弾形/斉射/カテゴリ別数値を出す', () => {
  const item = { type:'torpedo', quality:'fine', initial:false, enh:0,
    stats:{ power:1.10, speed:1.20, interval:0.90, heat:0.85 },
    count:2, pattern:'fan', style:'stout', projectile:'slender', launchSound:'stout', impactSound:'stout' };
  const v = craftResultView({ ok:true, type:'make', typeId:'torpedo', item });
  assert.equal(v.family, 'armory');
  assert.equal(v.source, '通常製作');
  assert.equal(v.name, '魚雷・良品');                     // 実際の武器名
  assert.equal(v.quality.label, '良品');
  /* 実際にロールされた弾形（プレビューの既定形ではない） */
  assert.deepEqual(v.shape, { typeId:'torpedo', shapeId:'slender' });
  assert.equal(v.beam, null);
  /* 射出パターン（該当時: 多連のみ） */
  assert.equal(v.salvo.count, 2);
  assert.equal(v.salvo.pattern, 'fan');
  assert.equal(v.salvo.label, '2ウェイ');
  /* カテゴリ別の威力等（実値つき）。威力は倍率運用なので実値なし。 */
  const byId = Object.fromEntries(v.stats.map(s => [s.id, s]));
  assert.deepEqual(v.stats.map(s => s.name), ['威力','弾速','間隔','発熱']);
  assert.equal(byId.power.real, null);
  assert.equal(byId.speed.real, '1080');                  // 900 × 1.20
  assert.equal(byId.interval.real, '0.270');              // 0.30 × 0.90
  assert.equal(byId.heat.real, '0.255');                  // 0.30 × 0.85
  assert.equal(v.ammoCap, null);                          // 魚雷に装弾数は無い（該当しない）
  assert.equal(typeof v.power, 'number');
});

test('モデル: ミサイルは装弾数（該当時）を出し、単発なら斉射は出さない', () => {
  const item = { type:'missile', quality:'prime', initial:false, enh:0,
    stats:{ power:1.30, turn:1.40, speed:1.10, ammo:1.20 },
    count:1, pattern:'single', style:'finned', projectile:'finned', launchSound:'finned', impactSound:'finned' };
  const v = craftResultView({ ok:true, type:'make', typeId:'missile', item });
  assert.equal(v.name, 'ミサイル・特上');
  assert.equal(v.salvo, null);                            // 単発は該当しない
  assert.equal(v.ammoCap, 10);                            // round(8 × 1.20)
  assert.deepEqual(v.stats.map(s => s.name), ['威力','誘導','弾速','装弾数']);
});

/* --- 純粋モデル: 指定開発（追加兵装レーザー） ------------------------------ */

test('モデル: 指定開発は source が「指定開発」。レーザーは弾形でなくビームを出す', () => {
  const item = { type:'laser', quality:'common', initial:false, enh:0,
    stats:{ power:1.0, speed:1.0, interval:1.0, heat:1.0 },
    count:2, pattern:'parallel', projectile:'slender', launchSound:'slender', impactSound:'stock' };
  const v = craftResultView({ ok:true, type:'design', typeId:'laser', item });
  assert.equal(v.family, 'advanced');
  assert.equal(v.source, '指定開発');
  assert.equal(v.name, '通常レーザー・並');
  assert.equal(v.shape, null);                            // 弾体の形を持たない
  assert.deepEqual(v.beam, { reflect:false });
  assert.equal(v.salvo.count, 2);
  assert.equal(v.salvo.label, '2連・並列');
  assert.equal(v.ammoCap, null);
});

test('モデル: 反射レーザーは反射ビームとして示す', () => {
  const item = { type:'reflaser', quality:'poor', initial:false, enh:0,
    stats:{ power:0.9, speed:1.0, interval:1.1, heat:1.1 },
    count:1, pattern:'single', projectile:'stock', launchSound:'stock', impactSound:'stock' };
  const v = craftResultView({ ok:true, type:'design', typeId:'reflaser', item });
  assert.deepEqual(v.beam, { reflect:true });
  assert.equal(v.salvo, null);
});

test('タイトル: 「{実名}ができました」', () => {
  const item = { type:'torpedo', quality:'common', initial:false, enh:0,
    stats:{ power:1, speed:1, interval:1, heat:1 }, count:1, pattern:'single', style:'stock', projectile:'stock' };
  const v = craftResultView({ ok:true, type:'make', typeId:'torpedo', item });
  assert.equal(craftResultTitle(v), '魚雷・並ができました');
});

/* --- 状態（開閉）。背後は触らない。 ---------------------------------------- */

test('状態: 開閉の保持と、右上の閉じるで閉じる', () => {
  const st = createBaseState();
  assert.equal(craftResultIsOpen(st), false);
  const item = { type:'torpedo', quality:'common', initial:false, enh:0,
    stats:{ power:1, speed:1, interval:1, heat:1 }, count:1, pattern:'single', style:'stock', projectile:'stock' };
  const v = openCraftResult(st, { ok:true, type:'make', typeId:'torpedo', item });
  assert.ok(v);
  assert.equal(craftResultIsOpen(st), true);
  assert.equal(st.craftResult.name, '魚雷・並');
  closeCraftResult(st);
  assert.equal(craftResultIsOpen(st), false);
  /* 失敗結果では開かない */
  assert.equal(openCraftResult(st, { ok:false, type:'make' }), null);
  assert.equal(craftResultIsOpen(st), false);
});

/* --- レイアウト: 結果モーダルも主要文字は拡大されている -------------------- */

test('レイアウト: 結果モーダルの「図のラベル帯」と「数値帯」が上下に分離している（重ならない）', () => {
  const r = BASE_UI.result;
  const f = BASE_UI.fonts;
  assert.ok(r, 'BASE_UI.result がある');
  /* 図のラベル（弾の形/ビーム/射出パターン）の中心と、項目（数値）最上段の中心が、
     文字の高さぶん以上に離れている。（旧配置は 322 と 336 の 14px 差で重なっていた。） */
  const labelHalf = f.bodySmall / 2 + 2;
  const rowHalf = f.body / 2 + 2;
  const artLabelY = r.artY + r.artH + r.artLabelGap;
  assert.ok(r.statsY - artLabelY >= labelHalf + rowHalf,
    '図ラベル(' + artLabelY + ')と数値最上段(' + r.statsY + ')が離れている');
  /* 仕切りは図のラベルと数値の間にある。 */
  assert.ok(r.ruleY > artLabelY && r.ruleY < r.statsY, '仕切りが帯の間にある');
  /* 数値の最下段（最大 ' + r.statsRows + ' 段）が「閉じる」に重ならない。 */
  const lastRow = r.statsY + r.statsRowH * (r.statsRows - 1);
  const closeTop = r.h - 92;
  assert.ok(lastRow + rowHalf < closeTop, '数値最下段(' + lastRow + ')が閉じる(' + closeTop + ')を越えない');
  /* 画面中央（1280x720）に収まる。 */
  const y0 = Math.round((720 - r.h) / 2);
  assert.ok(y0 >= 0 && y0 + r.h <= 720, 'モーダルは画面内');
});

test('レイアウト: 基地 UI の主要文字は現行の小さい箇所より大きい（目安約2倍）', () => {
  const f = BASE_UI.fonts;
  assert.ok(f, 'メッセージ: BASE_UI.fonts がある');
  /* 主要操作（ボタン）と資源/価格は現行 23 / 20 より大きい */
  assert.ok(f.btn >= 30, 'ボタン: ' + f.btn);
  assert.ok(f.status >= 28, '資源/価格: ' + f.status);
  /* 説明・補助・キー表示は現行 13〜19 の約2倍 */
  assert.ok(f.hint >= 24, '補助: ' + f.hint);
  assert.ok(f.key >= 20, 'キー表示: ' + f.key);
  assert.ok(f.body >= 26, '本文/スペック: ' + f.body);
  /* 既に大きい見出しは機械的に倍にしない（40 未満に留める） */
  assert.ok(f.menuLabel <= 40 && f.rowLabel <= 40, '見出しは大きすぎない');
});

/* --- 実挙動（本物のループと入力） ----------------------------------------- */

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
  const tap = code => { keyDown(code); step(); keyUp(code); step(); };
  return { game, step, press: tap, keyDown, keyUp, tap };
}
function enterBase(game, step, press){
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: G.player.x + 80, y: G.player.y }; step();
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');
}
const openAt = (game, step, tap, target) => {
  let cur = game.state().base.cursor, guard = 0;
  while (cur < target && guard++ < 10){ tap('ArrowDown'); cur = game.state().base.cursor; }
  while (cur > target && guard++ < 10){ tap('ArrowUp'); cur = game.state().base.cursor; }
  tap('KeyE'); step(2);
};

test('実挙動: 通常製作の成功で結果モーダルが開き、閉じると元の製作画面へ戻る', t => {
  const { game, step, press, tap } = boot(t);
  enterBase(game, step, press);
  game.addResource(10000);
  const { weaponPanel, arsenal } = game;
  openAt(game, step, tap, 2);
  assert.equal(game.state().base.weaponPanel.open, true);

  weaponPanel.setCursor(0); step();                 // 魚雷を製造
  const before = game.state().resource;
  press('KeyE'); step(2);
  /* 成功が確定・保存された → 結果モーダル */
  const cr = game.state().base.craftResult;
  assert.ok(cr, 'メッセージ: 結果モーダルが開く');
  assert.match(cr.name, /^魚雷・/, '実際の武器名');
  assert.equal(cr.family, 'armory');
  assert.equal(arsenal.count(), 1, '倉庫に入る');
  assert.equal(game.state().resource, before - 120, '資源は一度だけ引かれる');
  assert.equal(arsenal.equippedId('torpedo'), 'initial:torpedo', '自動装備しない');
  /* モーダル表示中は背後を操作しない（連打・押しっぱなしでも二重製作しない） */
  for (let i = 0; i < 4; i++){ press('KeyE'); step(); }
  assert.equal(arsenal.count(), 1, 'メッセージ: モーダル中の E で二重製作しない');
  assert.ok(game.state().base.craftResult, 'モーダルは自動で消えない（E では閉じない）');
  tap('ArrowDown');
  assert.equal(weaponPanel.cursor(), 0, 'メッセージ: 背後（選択）は動かない');
  /* 閉じる（Esc／閉じるボタン）→ 元の製作画面（武器パネル）へ */
  tap('Escape'); step(2);
  assert.equal(game.state().base.craftResult, null, 'メッセージ: 閉じるで閉じる');
  assert.equal(game.state().base.screen, 'weapon');
  assert.equal(weaponPanel.isOpen(), true, 'メッセージ: 製作画面へ戻る');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 資源不足・倉庫満杯では結果モーダルを出さず、従来の理由を出す', t => {
  const { game, step, press, tap } = boot(t);
  enterBase(game, step, press);
  const { weaponPanel, arsenal } = game;
  openAt(game, step, tap, 2);

  /* 資源不足（初期 0 のまま） */
  weaponPanel.setCursor(0); step();
  press('KeyE'); step(2);
  assert.equal(game.state().base.craftResult, null, 'メッセージ: 不足ではモーダルを出さない');
  assert.equal(arsenal.count(), 0);
  assert.match(weaponPanel.message(), /資源|足り/, '従来の理由表示');

  /* 倉庫満杯まで詰めてから作る（製作のたびに結果モーダルが出るので Esc で閉じる）。 */
  game.addResource(100000);
  let guard = 0;
  while (arsenal.count() < game.ARSENAL_CAP && guard++ < game.ARSENAL_CAP + 5){
    weaponPanel.setCursor(0); step(); press('KeyE'); step(2);
    if (game.state().base.craftResult){ tap('Escape'); step(2); }
  }
  assert.equal(arsenal.count(), game.ARSENAL_CAP);
  weaponPanel.setCursor(0); step();
  const n = arsenal.count();
  press('KeyE'); step(2);
  assert.equal(game.state().base.craftResult, null, 'メッセージ: 満杯ではモーダルを出さない');
  assert.equal(arsenal.count(), n, '満杯は追加しない');
  assert.equal(game.errors.length, 0);
});

test('実挙動: 指定開発の成功で結果モーダルが開き、閉じると設計画面へ戻る', t => {
  const { game, step, press, tap } = boot(t);
  enterBase(game, step, press);
  game.addResource(10000);
  const { forgePanel, advanced } = game;
  openAt(game, step, tap, 3);
  assert.equal(game.state().base.forgePanel.open, true);

  const dIdx = forgePanel.rows().findIndex(r => r.kind === 'design' && /通常レーザー/.test(r.label));
  forgePanel.setCursor(dIdx); step();
  press('KeyE'); step(2);
  assert.equal(forgePanel.screen(), 'design');

  const cIdx = forgePanel.rows().findIndex(r => r.kind === 'confirm');
  forgePanel.setCursor(cIdx); step();
  const n0 = advanced.count();
  press('KeyE'); step(2);
  const cr = game.state().base.craftResult;
  assert.ok(cr, 'メッセージ: 指定開発の成功でも結果モーダル');
  assert.equal(cr.family, 'advanced');
  assert.equal(cr.source, '指定開発');
  assert.equal(advanced.count(), n0 + 1);
  /* モーダル中の連打でも二重開発しない */
  for (let i = 0; i < 3; i++){ press('KeyE'); step(); }
  assert.equal(advanced.count(), n0 + 1);
  /* 閉じる（Esc）→ 設計画面へ戻る */
  tap('Escape'); step(2);
  assert.equal(game.state().base.craftResult, null);
  assert.equal(forgePanel.screen(), 'design', 'メッセージ: 設計画面へ戻る');
  assert.equal(game.errors.length, 0);
});
