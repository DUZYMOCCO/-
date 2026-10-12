// v1.21.0 ジャングルの いしの ようさい
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, TEMPLE, ENEMY_TYPES, spikeState, floorName, normalizeSave, stageUnlocked } from '../js/rules.js';
import { art } from '../js/art.js';
import { readFileSync } from 'node:fs';

const kana = /^[ぁ-んァ-ンー\s・！]+$/;

test('stage 6 has the stone fortress (trail only, no arrow), 3 trap rooms + treasure room', () => {
  const s6 = STAGES.find(s => s.id === 6);
  assert.ok(s6.temple && s6.boss && s6.mini, 'ふつうの ボスも そのまま');
  assert.ok(TEMPLE.noArrow);
  assert.equal(TEMPLE.floors, 4);
  for (let f = 1; f <= 4; f++) assert.match(floorName(f, TEMPLE), kana);
  assert.ok(TEMPLE.reward.coins >= 300 && TEMPLE.reward.chests >= 1);
  const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.ok(src.includes('if (r.quest?.T?.noArrow) return null;'));
  assert.ok(stageUnlocked(normalizeSave({ stageClears: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 } }), 6), 'セーブ ごかん');
});

test('traps are telegraphed: spikes go down → warn → up; damage is small', () => {
  const S = TEMPLE.spike;
  assert.equal(spikeState(0), 0); assert.equal(spikeState(S.down + 0.1), 1); assert.equal(spikeState(S.down + S.warn + 0.1), 2);
  assert.equal(spikeState(S.period + 0.1), 0);
  assert.ok(S.warn >= 0.6 && TEMPLE.lane.warn >= 0.8 && TEMPLE.rock.flight >= 1, 'にげる じかんが ある');
  assert.ok(TEMPLE.trapDmg <= 12);
});

test('horde after the treasure: 200 small villains, max 16-18 at once', () => {
  const H = TEMPLE.horde;
  assert.equal(H.total, 200); assert.ok(H.cap >= 15 && H.cap <= 18);
  for (const t of H.types) assert.ok(ENEMY_TYPES[t] && !ENEMY_TYPES[t].name, `${t} は ザコ`);
  assert.ok(H.types.includes('mummy'), 'ばくはへい');
  for (const k of ['temple', 'templeDoor', 'templeDoorOpen', 'spikes0', 'spikesW', 'spikes1', 'rowWarn', 'boulder', 'rock']) assert.ok(art(k), k);
});
