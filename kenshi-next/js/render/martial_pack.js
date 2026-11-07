// int16 little-endian の pack を THREE のトラックへ復元する。
// トラック固有の times を持つクリップ（GLB から変換したもの）と、
// クリップ共通の times を使う旧データの両方に対応する。
export function decodeMartialPack(pack, THREE) {
  return pack.clips.map(data => {
    const commonTimes = data.times;
    const tracks = data.tracks.map(t => {
      const bytes = Uint8Array.from(atob(t.values), c => c.charCodeAt(0));
      const view = new DataView(bytes.buffer);
      const values = new Float32Array(bytes.length / 2);
      for (let i = 0; i < values.length; i++) values[i] = view.getInt16(i * 2, true) / (t.type === 'quaternion' ? 32767 : 1000);
      // トラック固有の times があればそれを使う（無ければクリップ共通の times）
      const times = t.constant ? [0] : (t.times || commonTimes);
      // 値の数と時刻の数が一致しないトラックは再生時に Three.js が無限ループになる。
      // ここで検出してスキップする（フリーズ防止）。
      const comp = t.type === 'quaternion' ? 4 : 3;
      if (values.length !== times.length * comp) {
        console.error(`[martial_pack] トラック ${t.name} の値の数（${values.length}）と時刻数（${times.length}）が一致しません。スキップします。`);
        return null;
      }
      return t.type === 'quaternion' ? new THREE.QuaternionKeyframeTrack(t.name, times, values) : new THREE.VectorKeyframeTrack(t.name, times, values);
    }).filter(Boolean);
    const clip = new THREE.AnimationClip(data.name, data.duration, tracks);
    clip.uuid = THREE.MathUtils.generateUUID();
    clip.userData = { martial: true, ...data.metadata, hitTimes: [...(data.metadata?.hitTimes || [])] };
    return clip;
  });
}
