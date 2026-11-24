import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_DIST,
  LIGHT_GROUPS,
  LOGICAL_W,
  LOGICAL_H,
  parallaxFactor,
  projectWorldToView,
  viewToWorldAtZ,
  computeLightingGroupBlend,
  buildLayerDefinitions,
  stepContinuousTime,
  isRectVisible,
} from '../js/depth-math.js';

test('parallaxFactor: 操作層(z=0)は常に1.0、遠景は<1、前景は>1で単調減少', () => {
  assert.equal(parallaxFactor(0), 1.0);
  const zs = [-0.48, -0.2, 0, 0.5, 1.5, 4.0, 9.2];
  for (let i = 1; i < zs.length; i++) {
    assert.ok(parallaxFactor(zs[i]) < parallaxFactor(zs[i - 1]), `z=${zs[i]} should have smaller parallax than ${zs[i - 1]}`);
  }
});

test('projectWorldToView & viewToWorldAtZ: ズーム変更時も任意深度で完全な可逆性と光学中心整合を保つ', () => {
  const cam = { x: 420, y: -135, zoom: 1.65 };
  for (const wz of [-0.4, 0, 0.6, 2.2, 7.5]) {
    const wx = 780, wy = 210;
    const proj = projectWorldToView(wx, wy, wz, cam, LOGICAL_W, LOGICAL_H);
    const inv = viewToWorldAtZ(proj.sx, proj.sy, wz, cam, LOGICAL_W, LOGICAL_H);
    assert.ok(Math.abs(inv.wx - wx) < 1e-6, `wx mismatch at z=${wz}`);
    assert.ok(Math.abs(inv.wy - wy) < 1e-6, `wy mismatch at z=${wz}`);
  }
  // カメラ中心直上の点は、ズームを変えても全深度で画面中央に留まる
  for (const zoom of [0.6, 1.0, 1.8]) {
    const pFar = projectWorldToView(cam.x, cam.y, 6.0, { ...cam, zoom });
    const pPlay = projectWorldToView(cam.x, cam.y, 0.0, { ...cam, zoom });
    const pFg = projectWorldToView(cam.x, cam.y, -0.35, { ...cam, zoom });
    assert.ok(Math.abs(pFar.sx - LOGICAL_W * 0.5) < 1e-6);
    assert.ok(Math.abs(pPlay.sx - LOGICAL_W * 0.5) < 1e-6);
    assert.ok(Math.abs(pFg.sy - LOGICAL_H * 0.5) < 1e-6);
  }
});

test('computeLightingGroupBlend: 5ライティンググループ間で連続かつ境界段差がない', () => {
  assert.equal(LIGHT_GROUPS.length, 5);
  const bTop = computeLightingGroupBlend(9.5);
  assert.equal(bTop.g0, 0);
  const bBottom = computeLightingGroupBlend(-0.5);
  assert.equal(bBottom.g0, 4);

  // グループ境界の前後で実効深度（補間後）が連続的に推移することを確認
  let prevEffZ = Infinity;
  for (let z = 9.0; z >= -0.5; z -= 0.05) {
    const { g0, g1, weight } = computeLightingGroupBlend(z);
    assert.ok(weight >= 0 && weight <= 1);
    const effZ = LIGHT_GROUPS[g0].z * (1 - weight) + LIGHT_GROUPS[g1].z * weight;
    assert.ok(effZ <= prevEffZ + 1e-9, `Non-monotonic lighting blend at z=${z}`);
    prevEffZ = effZ;
  }
});

test('buildLayerDefinitions: 5〜30層すべてでz降順・操作層(z=0)必須・15層は要件3.1の7区分構成', () => {
  const std15 = buildLayerDefinitions(15);
  assert.equal(std15.length, 15);
  const counts = {};
  for (const l of std15) counts[l.category] = (counts[l.category] || 0) + 1;
  assert.deepEqual(counts, {
    '最遠景': 1, '遠景': 3, '中景': 3, '近景': 3, '操作層': 1, '前景': 3, '最前景': 1,
  });

  for (const n of [5, 8, 12, 15, 20, 25, 30]) {
    const layers = buildLayerDefinitions(n);
    assert.equal(layers.length, n);
    assert.ok(layers.some(l => l.z === 0), `play layer missing for count=${n}`);
    for (let i = 1; i < layers.length; i++) {
      assert.ok(layers[i].z <= layers[i - 1].z, `layers not sorted far-to-near at count=${n}`);
    }
  }
});

test('stepContinuousTime: 極端なdtをクランプし単調増加する', () => {
  const a = stepContinuousTime(10.0, 0.016);
  assert.ok(Math.abs(a.worldTime - 10.016) < 1e-6);
  const spike = stepContinuousTime(10.0, 2.5);
  assert.equal(spike.dt, 0.05);
  assert.ok(Math.abs(spike.worldTime - 10.05) < 1e-6);
});

test('isRectVisible: 画面外カリング判定', () => {
  assert.equal(isRectVisible(500, 400, 100, 100, 1748, 804, 32), true);
  assert.equal(isRectVisible(-300, 400, 100, 100, 1748, 804, 32), false);
  assert.equal(isRectVisible(2200, 400, 100, 100, 1748, 804, 32), false);
});
