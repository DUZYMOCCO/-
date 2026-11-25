/**
 * ABYSS DIVE — 地層背負いの巨蟹（仮）: 遭遇ルールのテスト（TDD・純粋ロジック）
 *
 * 担保する振る舞い:
 *   1. 予告（wind）中は前脚が上がるが見える＝まだ当たらない（無害）。
 *   2. 振り（swing）中だけ、見えている前脚の範囲が当たる。
 *   3. 検知範囲外では予告も振りも起きない（脚は下がったまま）。
 *   4. 上や後ろ（攻撃範囲外）に逃げれば、振り中でも当たらない＝通過できる。
 *   5. 撃破後は当たらず、ダメージも 0。
 *   6. 1 遭遇の報酬は一度だけ。
 *   7. 殻は硬く序盤装備では極小、強化装備なら明確に通る（当たり箇所＝殻/露出関節で差）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GEO_CRAB, createGeoCrab, stepGeoCrab, geoCrabLeg, geoCrabLegTouch,
  geoCrabHitZone, geoCrabDamage, createCrabEncounter,
} from '../js/geo-crab-rules.js';

const FLOOR = 6900;
const P = (x, y) => ({ x, y, r: 24, alive: true });
const NEAR_FRONT = (c) => P(c.x + c.dir * (GEO_CRAB.LEG_L1 + GEO_CRAB.LEG_L2) * 0.7, c.y);

/** 指定の状態まで dt 刻みで進める（時間で決まるので座標任せにしない）。 */
function advanceTo(c, target, player, maxSteps = 4000) {
  for (let i = 0; i < maxSteps; i++) {
    stepGeoCrab(c, 1 / 60, player);
    if (c.state === target) return true;
  }
  return false;
}

test('1. 予告（wind）中は前脚が上がるが、まだ当たらない', () => {
  const c = createGeoCrab(3000, FLOOR - 220, FLOOR);
  const p = P(c.x + 300, c.y);
  advanceTo(c, 'wind', p);
  assert.equal(c.state, 'wind');
  const leg = geoCrabLeg(c);
  assert.ok(leg.knee.y < leg.shoulder.y, '予告では膝が肩より上に上がる');
  // 脚の上に見えていても、予告中は無害
  assert.equal(geoCrabLegTouch(c, leg.knee.x, leg.knee.y, p.r), false);
  assert.equal(geoCrabLegTouch(c, leg.tip.x, leg.tip.y, p.r), false);
});

test('2. 振り（swing）中だけ、見えている前脚の範囲に当たる', () => {
  const c = createGeoCrab(3000, FLOOR - 220, FLOOR);
  const p = P(c.x + 300, c.y);
  advanceTo(c, 'swing', p);
  assert.equal(c.state, 'swing');
  const leg = geoCrabLeg(c);
  // 見えている脚の中間点（肩-膝）に当たる
  const mx = (leg.shoulder.x + leg.knee.x) / 2, my = (leg.shoulder.y + leg.knee.y) / 2;
  assert.equal(geoCrabLegTouch(c, mx, my, p.r), true);
  // 脚から遠く離れた点（体の後ろ寄り）は当たらない
  assert.equal(geoCrabLegTouch(c, c.x - c.dir * (GEO_CRAB.LEG_L1 + GEO_CRAB.LEG_L2), c.y, p.r), false);
});

test('3. 検知範囲外では予告も振りも起きない', () => {
  const c = createGeoCrab(3000, FLOOR - 220, FLOOR);
  const far = P(c.x + GEO_CRAB.DETECT_R + 600, c.y);
  for (let i = 0; i < 600; i++) stepGeoCrab(c, 1 / 60, far);
  assert.equal(c.state, 'dormant');
  const leg = geoCrabLeg(c);
  assert.equal(geoCrabLegTouch(c, leg.tip.x, leg.tip.y, 24), false);
});

test('4. 上や後ろに逃げれば、振り中でも当たらない（倒さず通過できる）', () => {
  const c = createGeoCrab(3000, FLOOR - 220, FLOOR);
  const p = P(c.x + 300, c.y);
  advanceTo(c, 'swing', p);
  assert.equal(c.state, 'swing');
  // 真上
  assert.equal(geoCrabLegTouch(c, c.x, c.y - GEO_CRAB.BODY_H * 1.4, 24), false);
  // 後ろ（進行方向の逆）
  assert.equal(geoCrabLegTouch(c, c.x - c.dir * (GEO_CRAB.LEG_L1 + GEO_CRAB.LEG_L2) * 1.1, c.y, 24), false);
});

test('5. 撃破後は当たらず、ダメージも 0', () => {
  const c = createGeoCrab(3000, FLOOR - 220, FLOOR);
  const p = P(c.x + 300, c.y);
  advanceTo(c, 'swing', p);
  c.dead = true;
  assert.equal(geoCrabLegTouch(c, c.x + 200, c.y, 24), false);
  assert.equal(geoCrabDamage(c, 100, 'body'), 0);
  assert.equal(geoCrabHitZone(c, c.x, c.y), null);
});

test('6. 1 遭遇の報酬は一度だけ', () => {
  const enc = createCrabEncounter();
  assert.equal(enc.spawn(createGeoCrab(0, 0, FLOOR)), true);
  const first = enc.onDefeat();
  assert.equal(first.first, true);
  assert.equal(first.reward, GEO_CRAB.REWARD);
  const second = enc.onDefeat();
  assert.equal(second.first, false);
  assert.equal(second.reward, 0);
  assert.equal(enc.isDefeated(), true);
  // 撃破後に再スポーンしない（同一遭遇）
  assert.equal(enc.spawn(createGeoCrab(0, 0, FLOOR)), false);
});

test('7. 殻は硬い: 序盤装備は極小、強化装備は明確に通る（当たり箇所で差）', () => {
  const c = createGeoCrab(3000, FLOOR - 220, FLOOR);
  // 実測ベースの代表値（game.js の実武器から。tools なしで式を固定して回帰を防ぐ）
  const EARLY_TORPEDO = 1.5;      // BASE_STATS.torpedoDmg(1.5) × 初期個体(1.0)
  const LATE_TORPEDO = 52.7;      // 6.0(改造cap) × 1.5(個体) × 5.86(強化200段)
  const bodyEarly = geoCrabDamage(c, EARLY_TORPEDO, 'body');
  const bodyLate = geoCrabDamage(c, LATE_TORPEDO, 'body');
  assert.ok(bodyEarly > 0, '序盤でも 0 ではない（弾無効にしない）');
  assert.ok(bodyEarly < 0.5, '序盤は殻に弾かれて極小');
  assert.ok(bodyLate > 20, '強化装備は殻を明確に通す');
  assert.ok(bodyLate > bodyEarly * 40, '強化の効きが明確に差になる');
  // 露出関節（軟部）は同じ弾でも通る（ただし序盤の絶対値は小さい＝楽勝にならない）
  const softEarly = geoCrabDamage(c, EARLY_TORPEDO, 'soft');
  assert.ok(softEarly > bodyEarly, '軟部は殻より通る');
  assert.ok(softEarly < 2.0, '序盤の軟部でも絶対値は小さい');
  // ゾーン判定
  const leg = geoCrabLeg(c);
  assert.equal(geoCrabHitZone(c, c.x, c.y), 'body');
  assert.equal(geoCrabHitZone(c, 999999, 999999), null);
});

test('8. 軟部（露出関節）は前脚を上げた一瞬だけ。下ろす途中や通常姿勢は殻のまま', () => {
  const c = createGeoCrab(3000, FLOOR - 220, FLOOR);
  const p = P(c.x + 300, c.y);
  advanceTo(c, 'wind', p);
  const lw = geoCrabLeg(c);
  assert.equal(geoCrabHitZone(c, lw.knee.x, lw.knee.y), 'soft', '予告中は上げた関節が軟部');
  advanceTo(c, 'swing', p);
  const ls = geoCrabLeg(c);
  assert.equal(geoCrabHitZone(c, ls.knee.x, ls.knee.y), 'soft', '振り中も露出関節は軟部');
  advanceTo(c, 'recover', p);
  const lr = geoCrabLeg(c);
  // 脚を下ろす途中・通常姿勢では殻判定（正面から撃っても楽勝にならない）
  assert.equal(geoCrabHitZone(c, c.x, c.y), 'body');
  if (lr.knee.y > c.y - 40) assert.equal(geoCrabHitZone(c, c.x, c.y), 'body');
});
