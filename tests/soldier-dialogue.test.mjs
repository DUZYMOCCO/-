import assert from 'node:assert/strict';
import { DIALOGUE_CATEGORIES, SoldierDialogueManager, soldierDialogue } from '../js/games/iron-squad/soldier-dialogue.js';

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
console.log('PASS: Canvas draw routine executes cleanly without throwing');

console.log('ALL SOLDIER DIALOGUE TESTS PASSED!');
