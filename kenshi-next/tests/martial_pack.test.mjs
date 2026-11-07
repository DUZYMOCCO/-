// 回帰テスト: decodeMartialPack がトラック固有の times を優先すること。
// 従来はクリップ共通の times を使っていたため、GLB 変換データ
// （トラック固有の times を持つ）の時刻数と値の数が食い違い、
// Three.js が再生時に無限ループに入ってフリーズした。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// テスト用に THREE の Track クラスだけを用意する（デコード結果の検証用）。
function makeMockTHREE() {
  class Track {
    constructor(name, times, values) { this.name = name; this.times = times; this.values = values; }
  }
  return {
    QuaternionKeyframeTrack: Track,
    VectorKeyframeTrack: Track,
    AnimationClip: class {
      constructor(name, duration, tracks) { this.name = name; this.duration = duration; this.tracks = tracks; this.uuid = 'test'; this.userData = {}; }
    },
    MathUtils: { generateUUID: () => 'uuid' },
  };
}

// int16 little-endian base64 を作る（デコード側と同じ形式）。
function makePackTrack(name, type, times, valuesArr) {
  const shorts = valuesArr.map(v => Math.round(v * (type === 'quaternion' ? 32767 : 1000)));
  const buf = Buffer.alloc(shorts.length * 2);
  shorts.forEach((v, i) => buf.writeInt16LE(v, i * 2));
  return { name, type, values: buf.toString('base64'), times };
}

test('decodeMartialPack はトラック固有の times を使う（GLB 変換データのフリーズ再現）', async () => {
  const { decodeMartialPack } = await import('../js/render/martial_pack.js');
  const THREE = makeMockTHREE();

  // GLB 変換データ全体の martial2_male.json を実際にデコードする
  const data = JSON.parse(fs.readFileSync(new URL('../assets/anims/martial2_male.json', import.meta.url), 'utf8'));
  const clips = decodeMartialPack(data, THREE);

  // 全クリップの全トラックで、時刻数と値の数が一致すること
  for (const clip of clips) {
    for (const t of clip.tracks) {
      const comp = t.name.toLowerCase().includes('quaternion') ? 4 : 3;
      const expected = t.times.length * comp;
      assert.equal(t.values.length, expected,
        `${clip.name} / ${t.name}: 値 ${t.values.length} ≠ 時刻 ${t.times.length}×${comp}=${expected}`);
    }
  }

  // Pile Driver A はトラック固有の times を使う（共通時刻を流用しない）
  const src = data.clips.find(c => c.name === 'Pile Driver A');
  const pd = clips.find(c => c.name === 'Pile Driver A');
  assert.ok(pd, 'Pile Driver A クリップが見つかる');
  const root = pd.tracks.find(t => t.name === 'root.position');
  assert.ok(root, 'root.position トラックがある');
  const srcRoot = src.tracks.find(t => t.name === 'root.position');
  assert.deepEqual(Array.from(root.times), Array.from(srcRoot.times || src.times),
    'root.position は track 固有（または共通）の正しい時刻でデコードされる');
  assert.equal(root.values.length, root.times.length * 3, 'root.position の値と時刻が一致する');
});

test('decodeMartialPack は旧データ（共通 times）にもフォールバックする', async () => {
  const { decodeMartialPack } = await import('../js/render/martial_pack.js');
  const THREE = makeMockTHREE();

  // トラック固有の times を持たない旧形式の pack
  const trackNoTimes = { name: 'hips.position', type: 'vector', values: makePackTrack('x', 'vector', [0, 1], [1, 2, 3, 4, 5, 6]).values };
  const pack = {
    clips: [{
      name: 'LegacyClip',
      duration: 1,
      times: [0, 0.5, 1],
      metadata: {},
      tracks: [
        // 固有 times なし → 共通 times（3時刻）を使う。値6個 = 3×2? 3時刻×3成分=9必要で、6では不一致→スキップされる
        { name: 'bad.position', type: 'vector', values: makePackTrack('x', 'vector', [0, 1], [1, 2, 3, 4, 5, 6]).values },
        // 固有 times なし → 共通 times（3時刻）を使う。値9個 = 3×3 で一致
        { name: 'good.position', type: 'vector', values: makePackTrack('x', 'vector', [0, 0.5, 1], [1, 2, 3, 4, 5, 6, 7, 8, 9]).values },
      ],
    }],
  };
  const clips = decodeMartialPack(pack, THREE);
  // bad はスキップされ、good だけ残る
  assert.equal(clips[0].tracks.length, 1);
  assert.equal(clips[0].tracks[0].name, 'good.position');
  assert.equal(clips[0].tracks[0].times.length, 3, '共通 times（3時刻）にフォールバックする');
});
