// int16 little-endian の pack を THREE のトラックへ復元する。
export function decodeMartialPack(pack, THREE) {
  return pack.clips.map(data => {
    const tracks = data.tracks.map(t => {
      const bytes = Uint8Array.from(atob(t.values), c => c.charCodeAt(0));
      const view = new DataView(bytes.buffer);
      const values = new Float32Array(bytes.length / 2);
      for (let i = 0; i < values.length; i++) values[i] = view.getInt16(i * 2, true) / (t.type === 'quaternion' ? 32767 : 1000);
      const times = t.constant ? [0] : data.times;
      return t.type === 'quaternion' ? new THREE.QuaternionKeyframeTrack(t.name, times, values) : new THREE.VectorKeyframeTrack(t.name, times, values);
    });
    const clip = new THREE.AnimationClip(data.name, data.duration, tracks);
    clip.uuid = THREE.MathUtils.generateUUID();
    clip.userData = { martial: true, hitTimes: data.metadata.hitTimes };
    return clip;
  });
}
