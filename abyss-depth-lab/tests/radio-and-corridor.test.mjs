import test from 'node:test';
import assert from 'node:assert/strict';

import { createRadioChat, RADIO_SCRIPTS, RADIO_IDS } from '../js/radio-rules.js';
import { createTrench, _resetTrenchCache, corridorAt, trenchFloorYAt, resolveSub } from '../js/trench-rules.js';
import { sampleBiomeAt, depthMetersAt, formatDepthDisplay, BIOMES } from '../js/world-biomes.js';
import { SITE_IDS, SITE_NAMES, createDiscoveredStore } from '../js/map-rules.js';

test('ノンストップ無線会話: 時間停止なしで自動進行し、既読は一度だけ再生・ネタバレ禁止', () => {
  let saved = null;
  const chat = createRadioChat({
    load: () => null,
    save: (v) => { saved = v; },
  });

  assert.equal(chat.isActive(), false);
  assert.equal(chat.trigger('abyss_corridor_down'), true);
  assert.equal(chat.isActive(), true);
  // 同じ ID は再トリガーされない
  assert.equal(chat.trigger('abyss_corridor_down'), false);
  assert.ok(saved && saved.ids.includes('abyss_corridor_down'));

  const first = chat.view();
  assert.equal(first.speaker, 'ponco');

  // 時間経過で次のセリフへ自動進行し、最後まで終わると自然に閉じる
  let steps = 0;
  while (chat.isActive() && steps < 200) {
    chat.tick(0.5);
    steps++;
  }
  assert.equal(chat.isActive(), false);
  assert.ok(steps > 10 && steps < 100);

  // ネタバレ防止（ブラックホール・木星・4万マイル・3920/3960 を含めない）
  const forbidden = ['ブラックホール', '木星', '4万マイル', '3920', '3960'];
  const allText = RADIO_IDS.flatMap(id => RADIO_SCRIPTS[id].map(l => l.text)).join(' ');
  for (const w of forbidden) {
    assert.ok(!allText.includes(w), `forbidden spoiler word in radio: ${w}`);
  }
});

test('大深度・海流回廊（下降／上昇）とマントル上層の地形・深度計 m→km 接続', () => {
  _resetTrenchCache();
  const t = createTrench({ x: 3000 });
  assert.ok(t.corridorDown && t.corridorUp);
  assert.equal(t.mantleTopY, 8500);
  assert.equal(t.mantleFloorY, 9900);

  // 下降回廊の中央を通過でき、上昇回廊で自力帰還できる
  const downX = (t.corridorDown.x0 + t.corridorDown.x1) * 0.5;
  const upX = (t.corridorUp.x0 + t.corridorUp.x1) * 0.5;
  assert.equal(corridorAt(downX, 7600, t).dir, 1);
  assert.equal(corridorAt(upX, 7600, t).dir, -1);
  assert.equal(trenchFloorYAt(downX, t, 7200), 9900);
  assert.equal(resolveSub(t, downX, 7600, 28, 60).hit, false);
  assert.equal(resolveSub(t, upX, 7600, 28, 60).hit, false);

  // マントル上層の中央が開放空間で、バイオームが mantle_upper になる
  const midMantleX = (t.mantleX0 + t.mantleX1) * 0.5;
  assert.equal(resolveSub(t, midMantleX, 9200, 28, 60).hit, false);
  assert.equal(sampleBiomeAt(midMantleX, 9200, t).primaryId, 'mantle_upper');

  // 深度計: 合流広間までは m、回廊で急加速し、マントル上層では km 表記になる
  assert.ok(formatDepthDisplay(2600).endsWith(' m'));
  assert.ok(formatDepthDisplay(6900).endsWith(' m'));
  assert.ok(depthMetersAt(7700) > 10000);
  assert.equal(formatDepthDisplay(8500), '120.0 km');
  assert.equal(formatDepthDisplay(9900), '180.0 km');
});

test('v3.12.0: 理論乖離の掛け合い・スティングレー号/Mark I 痕跡・マントル楽園コントラスト', () => {
  // 1) ponco MarkII の理論乖離＆比喩翻訳が mantle_upper_enter に含まれている
  const mantleText = RADIO_SCRIPTS.mantle_upper_enter.map(l => l.text).join(' ');
  assert.ok(mantleText.includes('プールみたいに水が澄んでいる'));
  assert.ok(mantleText.includes('要するにどういうこと'));

  // 2) 父の痕跡（スティングレー号パージ外装・Mark I 仮設ドック溶接痕）が配置され、無線・マップと連動する
  _resetTrenchCache();
  const t = createTrench({ x: 3000 });
  assert.ok(Array.isArray(t.traces) && t.traces.length >= 2);
  const hull = t.traces.find(tr => tr.id === 'stingray-hull');
  const weld = t.traces.find(tr => tr.id === 'mark1-weld');
  assert.ok(hull && weld);
  assert.ok(RADIO_SCRIPTS[hull.radioId] && RADIO_SCRIPTS[weld.radioId]);
  assert.ok(SITE_IDS.includes('stingray-hull') && SITE_IDS.includes('mark1-weld'));
  assert.ok(SITE_NAMES['stingray-hull'] && SITE_NAMES['mark1-weld']);

  const store = createDiscoveredStore({});
  assert.equal(store.add('stingray-hull'), true);
  assert.equal(store.add('mark1-weld'), true);
  assert.equal(store.has('stingray-hull'), true);
  assert.equal(store.has('mark1-weld'), true);

  // 3) 楽園バイオーム（mantle_upper）は修羅（narrow_cave / hydrothermal）より大幅に澄んで明るい
  assert.ok(BIOMES.mantle_upper.turbidity < BIOMES.hydrothermal.turbidity);
  assert.ok(BIOMES.mantle_upper.turbidity < BIOMES.narrow_cave.turbidity);
  assert.ok(BIOMES.mantle_upper.ambientBoost > BIOMES.hydrothermal.ambientBoost);
  assert.ok(BIOMES.mantle_upper.darkMaskMul < BIOMES.narrow_cave.darkMaskMul);
});
