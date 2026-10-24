import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, midiToFreq, MusicPlayer } from '../js/music.js';

test('BGM: 5曲が ていぎ されている', () => {
  assert.equal(TRACKS.length, 5, 'きょくの かずは 5');
  const ids = new Set();
  for (const t of TRACKS) {
    assert.ok(t.id, 'id が ある');
    assert.ok(!ids.has(t.id), 'id が じゅうふく していない');
    ids.add(t.id);
    assert.ok(t.name, 'name が ある');
    assert.ok(t.sub, 'sub が ある');
    assert.ok(t.bpm >= 120 && t.bpm <= 180, 'bpm が てきせい');
    assert.equal(t.bars, 16, '16しょうせつ');
    assert.equal(t.drums.length, 16, 'ドラム 16しょうせつ');
    assert.equal(t.bass.length, 256, 'ベース 256ステップ');
    assert.equal(t.synth.length, 256, 'シンセ 256ステップ');
    assert.equal(t.lead.length, 256, 'リード 256ステップ');
  }
});

test('BGM: なまえ と サブタイトル に かんじ が ふくまれない（こども むけ ルール）', () => {
  const kanji = /[\u4e00-\u9fff]/;
  for (const t of TRACKS) {
    assert.ok(!kanji.test(t.name), `きょくめい に かんじ なし: ${t.name}`);
    assert.ok(!kanji.test(t.sub), `サブタイトル に かんじ なし: ${t.sub}`);
  }
});

test('BGM: MIDIノート から しゅうはすう への へんかん', () => {
  assert.equal(Math.round(midiToFreq(69)), 440, 'A4 は 440Hz');
  assert.equal(Math.round(midiToFreq(60)), 262, 'C4 は やく 262Hz');
  assert.equal(Math.round(midiToFreq(38)), 73, 'D2 は やく 73Hz');
});

test('BGM: ランダム せんきょく で ちょくぜん の きょく が れんぞく して えらばれない', () => {
  const player = new MusicPlayer();
  player.currentTrack = TRACKS[0];
  for (let i = 0; i < 50; i++) {
    const picked = player.pickRandomTrack();
    assert.notEqual(picked.id, player.currentTrack.id, 'おなじ きょく が つづかない');
    player.currentTrack = picked;
  }
});
