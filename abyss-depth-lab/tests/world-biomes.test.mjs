import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FLOOR_Y, TRENCH, createTrench, _resetTrenchCache,
  trenchFloorYAt, resolveSub, trenchSegHit, inTrenchRegion,
} from '../js/trench-rules.js';
import { BIOMES, BIOME_IDS, sampleBiomeAt, zoneNameAt } from '../js/world-biomes.js';
import { SITE_IDS, SITE_NAMES, WORLD_BOTTOM, createDiscoveredStore } from '../js/map-rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '../assets');

test('深棚下の2分岐と合流広間が正しいピラミッド構造で生成される', () => {
  _resetTrenchCache();
  const t = createTrench({ x: 3000 });
  assert.ok(t);
  assert.equal(t.floorY, 4100);
  assert.equal(t.deepFloorY, 6900);
  assert.equal(WORLD_BOTTOM, 6900);
  // 下に広がるピラミッド構造: 合流広間の幅 > 海溝開口の幅
  assert.ok((t.hallX1 - t.hallX0) > (t.gorgeX1 - t.gorgeX0));
  // 熱水噴出口とバイオーム領域・発見座標が定義されている
  assert.ok(t.vents.length >= 5);
  assert.ok(t.biomes.narrow_cave && t.biomes.hydrothermal && t.biomes.confluence_hall);
  assert.ok(t.sites.caveRoute && t.sites.volcanicVent && t.sites.confluenceHall);
});

test('狭洞窟ルートと熱水・火山帯ルートの両方が合流広間へ繋がり、自力帰還可能な通過幅を確保している', () => {
  _resetTrenchCache();
  const t = createTrench({ x: 3000 });
  const subR = 28;

  // 1) 狭洞窟ルート: 岩棚と反対壁の隙間が潜水艇直径(56px)の4倍以上(>= 240px)
  for (const l of t.caveLedges) {
    const clearance = (t.caveX1 - t.caveX0) - l.w;
    assert.ok(clearance >= 240, `${l.id} clearance=${clearance}`);
  }

  // 2) 熱水・火山帯: 横穴入口の高さが十分（>= 480px）で、火山竪穴の岩棚隙間も十分
  const gateH = t.floorY - t.ventGateTopY;
  assert.ok(gateH >= 480, `vent gate height=${gateH}`);
  for (const l of t.ventLedges) {
    const clearance = (t.ventX1 - t.ventShaftX0) - l.w;
    assert.ok(clearance >= 400, `${l.id} clearance=${clearance}`);
  }

  // 3) 狭洞窟中央から下へ降りて合流広間中央へ到達しても岩に埋まらない
  const midHall = resolveSub(t, (t.hallX0 + t.hallX1) * 0.5, (t.hallTopY + t.deepFloorY) * 0.5, subR, 60);
  assert.equal(midHall.hit, false);

  // 4) 浅場から熱水帯の天井岩盤の上を泳いでも下に落ちない
  const aboveVent = resolveSub(t, t.ventX0 + 600, FLOOR_Y - 10, subR, 60);
  assert.ok(aboveVent.y <= FLOOR_Y - 60);
  assert.equal(trenchFloorYAt(t.ventX0 + 600, t, FLOOR_Y - 100), FLOOR_Y);
});

test('バイオーム補間: 深度と明るさを直結させず、境界で滑らかに遷移し重み総和が1になる', () => {
  _resetTrenchCache();
  const t = createTrench({ x: 3000 });

  const city = sampleBiomeAt(1200, 900, t);
  const cave = sampleBiomeAt((t.caveX0 + t.caveX1) * 0.5, 4900, t);
  const vent = sampleBiomeAt(t.ventX0 + 700, 3850, t);
  const hall = sampleBiomeAt((t.hallX0 + t.hallX1) * 0.5, 6300, t);

  assert.equal(city.primaryId, 'sunken_city');
  assert.equal(cave.primaryId, 'narrow_cave');
  assert.equal(vent.primaryId, 'hydrothermal');
  assert.equal(hall.primaryId, 'confluence_hall');

  // 深度と明るさを直結させない: 合流広間(y=6300)は狭洞窟(y=4900)より明るく見通しが良い
  assert.ok(hall.ambientBoost > cave.ambientBoost * 2.0);
  assert.ok(hall.turbidity < cave.turbidity);
  assert.ok(hall.darkMaskMul < cave.darkMaskMul);

  // 熱水帯は暖色（赤>青）の霧と散乱色を持つ
  assert.ok(vent.fogColor[0] > vent.fogColor[2]);
  assert.ok(vent.scatterTint[0] > vent.scatterTint[2]);

  // 境界横断時の連続性（フレームスパイクとなる急変がない）
  let prevAmb = null;
  for (let y = 4800; y <= 6200; y += 50) {
    const b = sampleBiomeAt((t.caveX0 + t.caveX1) * 0.5, y, t);
    let wSum = 0;
    for (const id of BIOME_IDS) wSum += b.weights[id];
    assert.ok(Math.abs(wSum - 1) < 1e-6);
    if (prevAmb !== null) {
      assert.ok(Math.abs(b.ambientBoost - prevAmb) < 0.25, `jump at y=${y}`);
    }
    prevAmb = b.ambientBoost;
  }
});

test('zoneNameAt とマップ発見地点: 有界・ネタバレ語句非含有・実ファイル存在チェック', () => {
  _resetTrenchCache();
  const t = createTrench({ x: 3000 });

  assert.equal(zoneNameAt(500, 200, t), '表層');
  assert.equal(zoneNameAt((t.caveX0 + t.caveX1) * 0.5, 4900, t), '狭洞窟');
  assert.equal(zoneNameAt(t.ventX0 + 700, 3850, t), '熱水・火山帯');
  assert.equal(zoneNameAt((t.hallX0 + t.hallX1) * 0.5, 6300, t), '合流広間・海草林');

  // ネタバレ防止規則
  const forbidden = ['ブラックホール', '木星', '4万マイル', '3920', '3960'];
  const allLabels = [
    ...Object.values(BIOMES).map(b => b.label),
    ...Object.values(SITE_NAMES),
  ].join(' ');
  for (const w of forbidden) {
    assert.ok(!allLabels.includes(w), `forbidden spoiler word found: ${w}`);
  }

  // 発見記録の有界性
  const store = createDiscoveredStore({ load: () => null, save: () => {} });
  assert.equal(store.add('confluence-hall'), true);
  assert.equal(store.add('unknown-secret-city'), false);
  assert.deepEqual(store.list(), ['confluence-hall']);

  // 新バイオームアート素材と manifest.json の整合性
  const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'manifest.json'), 'utf8'));
  for (const key of ['volcanic_vent', 'cave_stalactite', 'hall_giant_kelp']) {
    const entry = manifest[key];
    assert.ok(entry, `manifest missing ${key}`);
    assert.ok(fs.existsSync(path.join(ASSETS_DIR, `${key}.webp`)));
    if (entry.hasNormal) assert.ok(fs.existsSync(path.join(ASSETS_DIR, `${key}_n.webp`)));
    if (entry.hasEmissive) assert.ok(fs.existsSync(path.join(ASSETS_DIR, `${key}_e.webp`)));
  }
});
