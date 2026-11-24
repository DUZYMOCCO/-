import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMPACT_SOUNDS, LAUNCH_SOUNDS, optionLabel, TRAIT_COMPAT, traitOptions } from '../js/advanced-weapons.js';
import { itemImpactSound, itemLaunchSound } from '../js/weapon-rules.js';
import { craftResultView } from '../js/craft-result.js';

/* ==========================================================================
   v2.0.4: 着弾音IDの表示バグ修正（同じ未公開の音試作worktree）
   - optionLabel('impactSound', ...) が互換の全IDを別物として表示する。
     これまで slender/finned/stout は IMPACT_SOUNDS に無く '標準' へフォールバックしていた。
   - stock / heavy / light の既存ラベルは維持。発射音（LAUNCH_SOUNDS）は不変。
   - 保存・ロール・性能には一切触れない（表示のラベル表のみ）。
   ========================================================================== */

/** 全武器型の impactSound 互換ID（重複なし）。 */
const IMPACT_IDS = [...new Set(Object.keys(TRAIT_COMPAT).flatMap(t => TRAIT_COMPAT[t].impactSound || []))].sort();

test('着弾音: 互換の全IDが IMPACT_SOUNDS に定義され、既定の「標準」へ落ちない', () => {
  assert.ok(IMPACT_IDS.length >= 5, '互換IDが想定より少ない: ' + IMPACT_IDS.join(','));
  for (const id of IMPACT_IDS){
    assert.ok(IMPACT_SOUNDS[id], `IMPACT_SOUNDS に '${id}' が無い（optionLabel が標準へフォールバックする）`);
    assert.equal(optionLabel('impactSound', id), IMPACT_SOUNDS[id].label);
  }
});

test('着弾音: 指定どおりのラベル（stock=標準 / finned=鋭い / stout=鈍く重い / slender）', () => {
  assert.equal(optionLabel('impactSound', 'stock'), '標準');
  assert.equal(optionLabel('impactSound', 'finned'), '鋭い');
  assert.equal(optionLabel('impactSound', 'stout'), '鈍く重い');
  assert.equal(optionLabel('impactSound', 'slender'), '軽快');
  // 既存の heavy / light は維持
  assert.equal(optionLabel('impactSound', 'heavy'), '重い');
  assert.equal(optionLabel('impactSound', 'light'), '軽い');
});

test('着弾音: 全IDのラベルが互いに別物（同表に重複なし）', () => {
  const labels = IMPACT_IDS.map(id => optionLabel('impactSound', id));
  assert.equal(new Set(labels).size, labels.length, '重複ラベル: ' + labels.join(' / '));
});

test('着弾音: 型ごとの選択肢ラベルが互いに別物（開発UIの行）', () => {
  for (const t of Object.keys(TRAIT_COMPAT)){
    const opts = traitOptions(t, 'impactSound');
    if (opts.length < 2) continue;
    const labels = opts.map(v => optionLabel('impactSound', v));
    assert.equal(new Set(labels).size, labels.length, `${t}: ` + labels.join(' / '));
    // 標準以外の値が標準ラベルへ落ちていない
    for (const v of opts){
      if (v !== 'stock') assert.notEqual(optionLabel('impactSound', v), '標準', `${t}/${v} が標準表示`);
    }
  }
});

test('発射音: ラベルは不変（着弾音の修正で動かさない）', () => {
  assert.equal(optionLabel('launchSound', 'stock'), '標準');
  assert.equal(optionLabel('launchSound', 'slender'), '高音');
  assert.equal(optionLabel('launchSound', 'stout'), '重低音');
  assert.equal(optionLabel('launchSound', 'finned'), '鋭い');
  // 表そのものが同じ値
  assert.equal(LAUNCH_SOUNDS.finned.label, '鋭い');
});

test('個体の着弾音/発射音は optionLabel と同じ表で表示される（保存/ロール/性能は不変）', () => {
  const it = { type:'missile', impactSound:'finned', launchSound:'stock' };
  assert.equal(optionLabel('impactSound', itemImpactSound(it, 'missile')), '鋭い');
  assert.equal(optionLabel('launchSound', itemLaunchSound(it, 'missile')), '標準');

  const st = { type:'torpedo', impactSound:'slender', launchSound:'slender' };
  assert.equal(optionLabel('impactSound', itemImpactSound(st, 'torpedo')), '軽快');
  assert.equal(optionLabel('launchSound', itemLaunchSound(st, 'torpedo')), '高音');
});

test('製作結果（指定開発の結果モーダル）も同じラベル表を使う', () => {
  const res = { ok:true, type:'design', typeId:'reftorp',
    item:{ type:'reftorp', impactSound:'heavy', launchSound:'stock', projectile:'stock',
           quality:'common', stats:{}, count:1, pattern:'single' } };
  const v = craftResultView(res);
  assert.ok(v, '結果モデルが作られない');
  const row = (v.traits || []).find(x => x.name === '着弾音');
  assert.ok(row, '着弾音の行が無い');
  assert.equal(row.value, '重い');
});

test('ビームは着弾音の行を出さない（仕様どおり・回帰防止）', () => {
  const res = { ok:true, type:'design', typeId:'laser',
    item:{ type:'laser', launchSound:'stock', quality:'common', stats:{}, count:1, pattern:'single' } };
  const v = craftResultView(res);
  assert.ok(v, '結果モデルが作られない');
  assert.equal((v.traits || []).some(x => x.name === '着弾音'), false);
});
