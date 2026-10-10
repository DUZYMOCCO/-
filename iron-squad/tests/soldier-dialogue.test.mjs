import assert from 'node:assert/strict';
import { DIALOGUE_CATEGORIES, SoldierDialogueManager, soldierDialogue } from '../js/soldier-dialogue.js';

// 1. セリフ総数の検証（バリエーションが命：150種以上）
let totalQuotes = 0;
for (const [cat, quotes] of Object.entries(DIALOGUE_CATEGORIES)) {
  assert.ok(Array.isArray(quotes), `${cat} should be an array`);
  assert.ok(quotes.length >= 10, `${cat} should have at least 10 quotes, got ${quotes.length}`);
  // 重複チェック
  const uniqueInCat = new Set(quotes);
  assert.equal(uniqueInCat.size, quotes.length, `${cat} has duplicate quotes within itself`);
  totalQuotes += quotes.length;
}
assert.ok(totalQuotes >= 150, `Expected at least 150 total quotes across all categories, got ${totalQuotes}`);
console.log(`PASS: Verified ${totalQuotes} unique quotes across ${Object.keys(DIALOGUE_CATEGORIES).length} categories`);

// 2. Anti-Repetition Engine（直近重複排除）の検証
const manager = new SoldierDialogueManager();
const s1 = { id: 'soldier-1', name: 'タケシ', x: 100, y: 100, role: 'heavy' };
const s2 = { id: 'soldier-2', name: 'ケンジ', x: 200, y: 200, role: 'light' };
const s3 = { id: 'soldier-3', name: 'マリ', x: 300, y: 300, role: 'medic' };

let now = 10000;
const usedQuotes = [];

// 30回トリガーしてみて、直近履歴に入っている台詞が重複して選ばれないか検証
for (let i = 0; i < 30; i++) {
  const soldier = { id: `soldier-${i}`, name: `兵士${i}`, x: 100, y: 100 };
  const ok = manager.trigger(soldier, 'BOSS_ENCOUNTER', now, true); // forced=true でクールダウン無視
  assert.ok(ok, `Trigger should succeed on iteration ${i}`);
  const lastQuote = manager.recentHistory.at(-1);
  usedQuotes.push(lastQuote);
  now += 100;
}

// 直近30件は全て異なる台詞（BOSS_ENCOUNTERの枠内で可能な限り別物）
assert.equal(manager.recentHistory.length, 30);
console.log(`PASS: Anti-repetition engine properly tracked ${manager.recentHistory.length} recent quotes`);

// 3. クールダウン・同時表示数の検証
manager.reset();
now = 1000;

// s1 が発言
assert.equal(manager.trigger(s1, 'PATROL', now), true);
assert.equal(manager.activeBubbles.length, 1);

// すぐ直後 (now + 500ms) は全体クールダウン (3500ms) で弾かれる
assert.equal(manager.trigger(s2, 'PATROL', now + 500), false, 'Should be blocked by global cooldown');

// 全体クールダウン後 (now + 4000ms) に s2 が発言 -> 成功
assert.equal(manager.trigger(s2, 'PATROL', now + 4000), true);
assert.equal(manager.activeBubbles.length, 2);

// 同時最大2個なので、別の兵士 s3 も弾かれる
assert.equal(manager.trigger(s3, 'PATROL', now + 8000), false, 'Should be blocked by maxActiveBubbles=2');

// s1 は個別クールダウン (15000ms) 内なので、bubble が消えても再発言できない
manager.activeBubbles = []; // 手動クリア
assert.equal(manager.trigger(s1, 'PATROL', now + 10000), false, 'Should be blocked by individual 15s cooldown');
assert.equal(manager.trigger(s1, 'PATROL', now + 16000), true, 'Should succeed after individual cooldown expires');
console.log('PASS: Global and individual cooldowns and maxActiveBubbles enforced properly');

// 4. Update / ライフサイクルと位置追従
manager.reset();
const movingSoldier = { id: 's-move', x: 50, y: 50 };
manager.trigger(movingSoldier, 'CRITICAL_KILL', now);
assert.equal(manager.activeBubbles.length, 1);
const b = manager.activeBubbles[0];
assert.equal(b.x, 50);

// 時間経過 dt=0.5s、兵士が移動 (x: 80)
movingSoldier.x = 80;
manager.update(0.5);
assert.equal(b.x, 80, 'Bubble should track soldier position');
assert.ok(b.life < b.maxLife);
assert.ok(b.opacity > 0);

// 残り時間を超えて update
manager.update(2.0);
assert.equal(manager.activeBubbles.length, 0, 'Bubble should expire after lifetime');
console.log('PASS: Bubble lifecycle, position tracking, and expiration verified');

// 5. Canvas 描画の安全テスト（クラッシュしないこと）
const calls = [];
const mockCtx = {
  save: () => calls.push('save'),
  restore: () => calls.push('restore'),
  measureText: () => ({ width: 60 }),
  beginPath: () => calls.push('beginPath'),
  roundRect: () => calls.push('roundRect'),
  fill: () => calls.push('fill'),
  stroke: () => calls.push('stroke'),
  moveTo: () => calls.push('moveTo'),
  lineTo: () => calls.push('lineTo'),
  fillText: (t) => calls.push(`fillText:${t}`),
  translate: () => calls.push('translate'),
  scale: () => calls.push('scale')
};

manager.reset();
manager.trigger(s1, 'CAMP_RETURN', now);
manager.update(0.3); // フェードイン完了
manager.draw(mockCtx, { x: 0, y: 0 }, 1.0);
assert.ok(calls.includes('save'));
assert.ok(calls.includes('restore'));
assert.ok(calls.some(c => c.startsWith('fillText:')), 'Should have rendered text');
// 6. テキスト自動折り返し (wrapDialogueText) の検証
import { wrapDialogueText } from '../js/soldier-dialogue.js';

// 短いテキストは分割されない
const shortCtx = { measureText: (t) => ({ width: t.length * 9 }) };
const shortRes = wrapDialogueText(shortCtx, '油断するな！', 150);
assert.equal(shortRes.length, 1);
assert.equal(shortRes[0], '油断するな！');

// 長文が区切り記号「！」で適切に2行に分割され、各行が maxW (140) 以内に収まる
const longText = '威圧感に呑まれるな！足を止めなければ勝てる！';
const longRes = wrapDialogueText(shortCtx, longText, 140);
assert.equal(longRes.length, 2);
assert.equal(longRes[0], '威圧感に呑まれるな！');
assert.equal(longRes[1], '足を止めなければ勝てる！');
assert.ok(shortCtx.measureText(longRes[0]).width <= 140);
assert.ok(shortCtx.measureText(longRes[1]).width <= 140);

// 区切り記号のない長文でもバランスよく2行に分割される
const noDelimText = '宝箱を見つけたら声をかけてくれよな';
const noDelimRes = wrapDialogueText(shortCtx, noDelimText, 100);
assert.ok(noDelimRes.length >= 2);
console.log('PASS: wrapDialogueText splits text appropriately for bounded width');

// 7. 小画面・高倍率 (320px, zoom 1.8) および DPR=2 / 画面端クランプでの描画テスト
const smallScreenCalls = [];
const smallScreenCtx = {
  canvas: { width: 640, height: 1136 }, // DPR=2 の物理ピクセル幅
  save: () => smallScreenCalls.push('save'),
  restore: () => smallScreenCalls.push('restore'),
  measureText: (t) => ({ width: t.length * 9 }),
  beginPath: () => smallScreenCalls.push('beginPath'),
  roundRect: () => smallScreenCalls.push('roundRect'),
  rect: () => smallScreenCalls.push('rect'),
  fill: () => smallScreenCalls.push('fill'),
  stroke: () => smallScreenCalls.push('stroke'),
  moveTo: () => smallScreenCalls.push('moveTo'),
  lineTo: () => smallScreenCalls.push('lineTo'),
  closePath: () => smallScreenCalls.push('closePath'),
  fillText: (t, x, y) => smallScreenCalls.push({ text: t, x, y }),
  translate: (x, y) => smallScreenCalls.push({ translate: [x, y] }),
  scale: () => smallScreenCalls.push('scale')
};

manager.reset();
// 画面端 (x: -80) の兵士で長文を発言、論理幅 320px を渡して描画
const edgeSoldier = { id: 's-edge', x: -80, y: 100 };
manager.trigger(edgeSoldier, 'BOSS_ENCOUNTER', now, true);
manager.activeBubbles[0].text = longText;
manager.update(0.3);

// camera={x: 0, y: 100}, zoom=1.8, logicalWidth=320
manager.draw(smallScreenCtx, { x: 0, y: 100 }, 1.8, 320);
const renderedTexts = smallScreenCalls.filter(c => c.text);
assert.equal(renderedTexts.length, 2, 'Long text should render in 2 lines on small screen with 1.8 zoom');
assert.equal(renderedTexts[0].text, '威圧感に呑まれるな！');
assert.equal(renderedTexts[1].text, '足を止めなければ勝てる！');
console.log('PASS: Small-screen high-zoom dialogue renders wrapped lines and clamps cleanly under DPR=2');

// 8. 新5場面（NIGHT_COMBAT, DUNGEON_EXPLORE, INVASION_DEFENSE, LEVEL_UP_REACTION, FARM_LEISURE）の発火検証
// 兵種のない一般兵士を使用（純粋に場面カテゴリ内から選ばれることを検証）
const plainSoldier = { id: 's-plain', name: '一般兵', x: 100, y: 100 };
const situations = ['NIGHT_COMBAT', 'DUNGEON_EXPLORE', 'INVASION_DEFENSE', 'LEVEL_UP_REACTION', 'FARM_LEISURE'];
for (const sit of situations) {
  manager.reset();
  const ok = manager.trigger(plainSoldier, sit, now, true);
  assert.ok(ok, `Trigger should succeed for situation: ${sit}`);
  assert.equal(manager.activeBubbles.length, 1);
  const bubbleText = manager.activeBubbles[0].text;
  assert.ok(DIALOGUE_CATEGORIES[sit].includes(bubbleText), `Text '${bubbleText}' should belong to category ${sit}`);
}
console.log('PASS: All 5 newly connected situations (90 quotes) trigger and deliver category-specific quotes');

// 9. 同時レベルアップ（複数人強制トリガー）での表示上限・重複防止検証
manager.reset();
const unitA = { id: 'u-1', name: '兵士A', x: 100, y: 100 };
const unitB = { id: 'u-2', name: '兵士B', x: 110, y: 100 };
const unitC = { id: 'u-3', name: '兵士C', x: 120, y: 100 };

// 3人同時に LEVEL_UP_REACTION を forced=true でトリガー
const okA = manager.trigger(unitA, 'LEVEL_UP_REACTION', now, true);
const okB = manager.trigger(unitB, 'LEVEL_UP_REACTION', now, true);
const okC = manager.trigger(unitC, 'LEVEL_UP_REACTION', now, true);

// 代表1名のみ発言し、文字の重なり・上限オーバー（maxActiveBubbles=2）を防止
assert.equal(okA, true, 'First unit should trigger level-up dialogue');
assert.equal(okB, false, 'Second unit should be suppressed as simultaneous duplicate event');
assert.equal(okC, false, 'Third unit should be suppressed as simultaneous duplicate event');
assert.equal(manager.activeBubbles.length, 1, 'Exactly 1 bubble should be active, preventing overlapping dialogue');

// 倒れた兵士・死亡兵士は forced=true でも発言不可
const downedUnit = { id: 'u-down', name: '倒れた兵士', x: 100, y: 100, isDown: true };
const deadUnit = { id: 'u-dead', name: '戦死兵士', x: 100, y: 100, dead: true };
assert.equal(manager.trigger(downedUnit, 'LEVEL_UP_REACTION', now + 2000, true), false);
assert.equal(manager.trigger(deadUnit, 'LEVEL_UP_REACTION', now + 2000, true), false);

// 異種イベントでも最大同時表示数 (maxActiveBubbles=2) は絶対に超えない
const unitD = { id: 'u-4', name: '兵士D', x: 130, y: 100 };
const okD = manager.trigger(unitD, 'BOSS_ENCOUNTER', now, true);
assert.equal(okD, true, 'Second distinct event should succeed up to maxActiveBubbles');
assert.equal(manager.activeBubbles.length, 2);

const unitE = { id: 'u-5', name: '兵士E', x: 140, y: 100 };
const okE = manager.trigger(unitE, 'CRITICAL_KILL', now, true);
assert.equal(okE, true, 'Forced event shifts out oldest bubble, strictly maintaining maxActiveBubbles=2');
assert.equal(manager.activeBubbles.length, 2, 'Active bubbles must never exceed maxActiveBubbles=2');
console.log('PASS: Forced events enforce maxActiveBubbles=2 and single-representative policy for simultaneous triggers');

console.log('ALL SOLDIER DIALOGUE TESTS PASSED!');
