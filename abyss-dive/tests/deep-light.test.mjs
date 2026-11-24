import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIT_WATCH, inLitWatch, flareCovers } from '../js/deep-light-rules.js';
import { FLARE, createFlareState, fireFlare, tickFlares, flareIntensity } from '../js/flare-rules.js';

/* ------------------------------------------------------------------
 * 「光を当てて初めて見える」代表の深い区間の純粋ルール。
 *  - 通常海域（浅い）では原則これまでどおり（この処理の対象外）。
 *  - 深い区間だけ、弱い光（薄いシルエット）＋当たった側のディテール。
 * ------------------------------------------------------------------ */

test('深い区間だけが対象（通常海域は対象外）', () => {
  assert.equal(inLitWatch(200), false, '表層は対象外');
  assert.equal(inLitWatch(600), false, '中深層も対象外');
  assert.equal(inLitWatch(LIT_WATCH.MIN_Y - 1), false, '境界の直前までは対象外');
  assert.equal(inLitWatch(LIT_WATCH.MIN_Y), true, '境界から対象');
  assert.equal(inLitWatch(2400), true, '超深海は対象');
});

test('照明弾は半径内を照らす（外は照らさない）', () => {
  const f = { x: 100, y: 100 };
  assert.equal(flareCovers(f, 100, 100), true, '中心を照らす');
  assert.equal(flareCovers(f, 100 + FLARE.LIGHT_R - 1, 100), true, '半径の内側');
  assert.equal(flareCovers(f, 100 + FLARE.LIGHT_R + 5, 100), false, '半径の外側');
});

test('照明弾の光度は飛翔中つねにほぼ 1（落下中も消えない）', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 0, y: 0 });
  /* 上昇〜頂点〜落下の間（接触なし）で光度が 1 のまま */
  for (let i = 0; i < 60 * 4; i++) {
    tickFlares(s, 1/60, null);
    assert.equal(flareIntensity(f), 1);
  }
});
