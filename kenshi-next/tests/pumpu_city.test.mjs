// パンプアップ・シティ（筋肉探偵の環境）の作者配置。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../js/sim/index.js';
import { PUMPU_EXTRA_BUILDINGS, PUMPU_SIGNS, PUMPU_STREET, PUMPU_ZONES } from '../js/world/pumpu_city.js';

test('パンプアップ・シティの通り寸法は town-block の実測に一致する', () => {
  assert.equal(PUMPU_STREET.width, 9.0); // 車道
  assert.equal(PUMPU_STREET.northSidewalk, -3.65); // 店先歩道 4.7m の中心 (壁 -6.0 → 縁石 -1.3)
  assert.equal(Math.abs(PUMPU_STREET.southSidewalk - 9.725) < 0.01, true); // 向かいの歩道 3.45m
  assert.deepEqual([PUMPU_ZONES.downtown.w, PUMPU_ZONES.downtown.d], [8, 6.5]); // 戦闘範囲
});

test('追加建物は名前・ゾーン・色を持ち、港・中心・商店帯をカバーする', () => {
  assert.equal(PUMPU_EXTRA_BUILDINGS.length >= 12, true);
  for (const b of PUMPU_EXTRA_BUILDINGS) {
    assert.equal(typeof b.name, 'string');
    assert.equal(typeof b.zone, 'string');
    assert.match(b.color, /^#[0-9a-fA-F]{6}$/);
    assert.equal(b.x * b.x + b.z * b.z < 40 * 40, true);
  }
  const zones = new Set(PUMPU_EXTRA_BUILDINGS.map((b) => b.zone));
  for (const zone of ['downtown', 'civic', 'harbor']) assert.equal(zones.has(zone), true);
  assert.equal(PUMPU_EXTRA_BUILDINGS.some((b) => b.name === '市庁舎'), true);
  assert.equal(PUMPU_EXTRA_BUILDINGS.some((b) => b.name === 'コブラ会ビル'), true);
  assert.equal(PUMPU_EXTRA_BUILDINGS.some((b) => b.role === 'warehouse'), true);
});

test('看板は店・港・ランドマークを網羅する', () => {
  const texts = PUMPU_SIGNS.map((s) => s.text);
  for (const need of ['パンプアップ・シティ', '私立探偵 タンク', '港', '市庁舎', 'コブラ会']) {
    assert.equal(texts.includes(need), true, need);
  }
});

test('試合モードでも追加建物は残り、戦闘範囲は塞がない', () => {
  const state = createWorld(7, { spawn: false, town: false, match: true });
  assert.equal(state.timeSec, 18 * 3600); // 参考外観の夕暮れに合わせる
  const names = new Set(state.buildings.map((b) => b.name).filter(Boolean));
  for (const name of ['質屋・リサイクル', 'カラオケ館', '市庁舎', 'コブラ会ビル', '第1貨物倉庫', '港湾事務所']) {
    assert.equal(names.has(name), true, name);
  }
  const tank = state.actors.find((a) => a.id === state.muscle.playerId);
  const bobby = state.actors.find((a) => a.id === state.muscle.enemyId);
  // タンクとボビーは店先広場の内側に立ち、建物の箱に埋まっていない。
  for (const actor of [tank, bobby]) {
    const inside = state.buildings.some((b) => Math.abs(actor.x - b.x) < b.w / 2 && Math.abs(actor.z - b.z) < b.d / 2);
    assert.equal(inside, false, `${actor.name} が建物に埋まる`);
  }
});
