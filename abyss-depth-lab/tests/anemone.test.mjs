/**
 * 煤冠イソギンチャク（仮）— 熱水・火山帯 固有の固定型・中型敵の純ロジック検証（RED→GREEN）。
 *
 * 検証する契約（タスク指定）:
 *   - 距離で当たる／当たらない（可能・不可能）と、根からの高低差
 *   - 離脱（当たる帯から出れば被弾しない）
 *   - 予告（警告）時間中はダメージ無し
 *   - 死亡後は一切攻撃しない
 *   - 周回しても同じ遭遇を多重化しない（報酬は一度だけ）
 *   - 発生地点は現行の実地形データから一意に決まる（1 箇所）
 *   - 予告はアンバー背景の中で白青く、形でも攻撃と区別できる
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createTrench, _resetTrenchCache } from '../js/trench-rules.js';
import { BIOMES, sampleBiomeAt } from '../js/world-biomes.js';
import {
  ANEMONE, anemoneAnchor, anemoneInReach, anemoneSensed, anemoneCue,
  stepAnemone, createAnemoneEncounter,
} from '../js/anemone-rules.js';

const layout = () => { _resetTrenchCache(); return createTrench({ x: 3000 }); };

/* 点がどれかの solid の内側か（実地形の開空間チェック用）。 */
function insideSolid(t, x, y) {
  for (const s of t.solids) {
    if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return true;
  }
  return false;
}

test('発生地点は熱水・火山帯の縦竪穴の「いちばん広い横断面」の黒岩壁に一意に決まる（周回しても同じ1か所）', () => {
  const t = layout();
  const a1 = anemoneAnchor(t);
  const a2 = anemoneAnchor(t);
  assert.ok(a1, 'anchor not null');
  assert.deepEqual(a1, a2, '同じレイアウトでは同じ1点（確率で増えない）');

  // 熱水・火山帯バイオーム内
  const bio = sampleBiomeAt(a1.x + 60, a1.y, t);
  assert.equal(bio.primaryId, 'hydrothermal', `biome=${bio.primaryId}`);
  assert.equal(BIOMES.hydrothermal.label, '熱水・火山帯');

  // 縦竪穴（ventShaftX0..ventX1）の中、左の黒玄武岩壁面に根づく
  assert.equal(a1.x, t.ventShaftX0);
  assert.ok(a1.y > t.floorY && a1.y < t.floorY + 960, '竪穴の上部・左壁の素の面');
  assert.equal(a1.dir, 1);

  // 竪穴がいちばん広いのは右の岩棚(ventLedgeR1, y=floorY+460)より上の断面 → 発生点はその帯
  assert.ok(a1.y < t.floorY + 460, '右岩棚より上の最も広い断面');

  // 根の前方（竪穴側）は開いた水（岩に埋まっていない）
  assert.equal(insideSolid(t, a1.x + ANEMONE.REACH * 0.5, a1.y), false, '前方は開空間');
  assert.equal(insideSolid(t, a1.x + 24, a1.y), false, '根の直ぐ前も開空間');

  // 通過を塞がない: 反対側の壁まで触手が届かない（引き寄せ・通行遮断なし）
  assert.ok(a1.x + ANEMONE.REACH < t.ventX1 - 40, '反対壁まで届かない');
});

test('距離で当たる／当たらない、根からの高低差で当たる帯が決まる', () => {
  const t = layout();
  const a = anemoneAnchor(t);
  // 真正面・至近は当たる
  assert.equal(anemoneInReach(a, a.x + 60, a.y), true);
  // 水平に離れすぎると当たらない（可能→不可能）
  assert.equal(anemoneInReach(a, a.x + ANEMONE.REACH + 20, a.y), false);
  assert.equal(anemoneInReach(a, a.x + ANEMONE.REACH - 10, a.y), true);
  // 真上・真下に離れると（高低差）当たらない
  assert.equal(anemoneInReach(a, a.x, a.y - ANEMONE.REACH_Y - 20), false);
  assert.equal(anemoneInReach(a, a.x, a.y + ANEMONE.REACH_Y + 20), false);
  assert.equal(anemoneInReach(a, a.x + 10, a.y + ANEMONE.REACH_Y * 0.5), true);
  // 感知は接触帯より広い（予告は届くが攻撃は届かない距離帯がある）
  assert.ok(ANEMONE.SENSE > ANEMONE.REACH);
  assert.equal(anemoneSensed(a, a.x + ANEMONE.REACH + 60, a.y), true);
  assert.equal(anemoneSensed(a, a.x + ANEMONE.SENSE + 40, a.y), false);
});

test('状態機械: 閉 → 白い短い予告（無害）→ 触手を広げる（この間だけ被弾）→ 引っ込む → 休止', () => {
  const t = layout();
  const a = anemoneAnchor(t);
  const e = { ...a, kind: 'anemone', dead: false, hp: ANEMONE.HP, maxHp: ANEMONE.HP,
    phase: 'idle', pt: 0, t: 0 };

  // 感知外: 予告しない
  assert.equal(stepAnemone(e, 0.1, a.x + ANEMONE.SENSE + 200, a.y), 0);
  assert.equal(e.phase, 'idle');

  // 感知内: idle → warn（まだ無害）
  stepAnemone(e, 0.016, a.x + 100, a.y);
  assert.equal(e.phase, 'warn');

  // ★予告時間中は、至近に居てもダメージ 0
  let total = 0;
  const warnSteps = Math.ceil(ANEMONE.WARN_T / 0.016) - 1;
  for (let i = 0; i < warnSteps; i++) total += stepAnemone(e, 0.016, a.x + 40, a.y);
  assert.equal(total, 0, '予告中は無害');
  assert.ok(ANEMONE.WARN_T <= 0.7, '予告は短い');

  // warn → flare（広げる）。至近なら被弾する
  stepAnemone(e, 0.02, a.x + 40, a.y);
  assert.equal(e.phase, 'flare');
  assert.equal(stepAnemone(e, 0.016, a.x + 40, a.y), ANEMONE.DAMAGE);

  // ★離脱: 広げている最中でも、帯から出れば被弾しない
  assert.equal(stepAnemone(e, 0.016, a.x + ANEMONE.REACH + 200, a.y), 0);

  // flare → retract → idle
  let guard = 0;
  while (e.phase === 'flare' && guard++ < 500) stepAnemone(e, 0.05, a.x + 300, a.y);
  assert.equal(e.phase, 'retract');
  guard = 0;
  while (e.phase === 'retract' && guard++ < 500) stepAnemone(e, 0.05, a.x + 300, a.y);
  assert.equal(e.phase, 'idle');
});

test('死亡後は一切攻撃しない（死体は広げない）', () => {
  const t = layout();
  const a = anemoneAnchor(t);
  const e = { ...a, kind: 'anemone', dead: true, hp: 0, maxHp: ANEMONE.HP, phase: 'flare', pt: 0.5, t: 0 };
  assert.equal(stepAnemone(e, 0.1, a.x + 10, a.y), 0);
  assert.equal(stepAnemone(e, 0.1, a.x + 10, a.y), 0);
  assert.equal(e.phase, 'flare', '死後は状態を進めない');
});

test('遭遇は 1 アウティングにつき一度だけ出現し、撃破後に二度と出ない（報酬一回）', () => {
  const t = layout();
  const enc = createAnemoneEncounter(t);
  assert.ok(enc.anchor);
  assert.equal(enc.needSpawn(), true);
  enc.onSpawn();
  assert.equal(enc.needSpawn(), false, '出現中は多重化しない');
  assert.equal(enc.alive, true);
  enc.onDefeat();
  assert.equal(enc.defeated, true);
  assert.equal(enc.needSpawn(), false, '撃破後は再出現しない（報酬一回）');
  // 新しい潜行（リセット）でだけやり直せる
  enc.reset();
  assert.equal(enc.needSpawn(), true);
  // 未開放（layout なし）では出現しない
  assert.equal(createAnemoneEncounter(null).needSpawn(), false);
});

test('予告はアンバー背景の中で白青く、形でも攻撃と区別できる', () => {
  const warn = anemoneCue({ phase: 'warn' });
  const flare = anemoneCue({ phase: 'flare' });
  // 白青: 青 > 赤（アンバーの環境に対し補色寄り）
  assert.ok(warn.color[2] > warn.color[0], '白青 (B>R)');
  assert.ok(warn.color[2] >= 0.9 && warn.color[0] >= 0.75, '白に近い');
  // 形でも違う
  assert.notEqual(warn.shape, flare.shape);
  assert.equal(warn.shape, 'contracted');
  assert.equal(flare.shape, 'spread');
});
