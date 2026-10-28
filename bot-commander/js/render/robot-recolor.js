// 色付きの絵は機体ごとではなく、元の絵と色番号ごとに共有する。
export function createRecolorCache(Texture) {
  const cache = new Map();
  let warned = false;
  function get(baseTex, key, hue) {
    if (!baseTex || !hue || (!hue.dh && !hue.dl)) return baseTex;
    const id = `${key}|${hue.index}`;
    if (cache.has(id)) return cache.get(id);
    try {
      const source = baseTex.source, image = source.resource, frame = baseTex.frame;
      const resolution = source.resolution || 1;
      const x = Math.round((frame?.x || 0) * resolution), y = Math.round((frame?.y || 0) * resolution);
      const width = Math.round((frame?.width || baseTex.width) * resolution), height = Math.round((frame?.height || baseTex.height) * resolution);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height), data = pixels.data;
      for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
        const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
        if (s < 0.12) continue;
        let h = max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h = ((h * 60 + hue.dh) % 360 + 360) % 360;
        const light = Math.max(0, Math.min(1, l + hue.dl));
        const chroma = (1 - Math.abs(2 * light - 1)) * s, q = chroma * (1 - Math.abs((h / 60) % 2 - 1)), m = light - chroma / 2;
        const rgb = h < 60 ? [chroma, q, 0] : h < 120 ? [q, chroma, 0] : h < 180 ? [0, chroma, q] : h < 240 ? [0, q, chroma] : h < 300 ? [q, 0, chroma] : [chroma, 0, q];
        data[i] = Math.round((rgb[0] + m) * 255); data[i + 1] = Math.round((rgb[1] + m) * 255); data[i + 2] = Math.round((rgb[2] + m) * 255);
      }
      ctx.putImageData(pixels, 0, 0);
      const result = Texture.from(canvas, true); result.source.scaleMode = source.scaleMode;
      cache.set(id, result); return result;
    } catch (error) {
      if (!warned) { console.warn('[bot-commander] 色の変更に失敗しました', error); warned = true; }
      cache.set(id, baseTex); return baseTex;
    }
  }
  function destroy() {
    for (const tex of cache.values()) {
      // 失敗時は元の絵なので所有しない。
      if (!tex || !owned.has(tex)) continue;
      const canvas = tex.source?.resource;
      try { tex.destroy(true); } catch { /* 既に破棄済み */ }
      if (canvas && 'width' in canvas) { canvas.width = 0; canvas.height = 0; }
    }
    cache.clear(); owned.clear();
  }
  const owned = new Set();
  return { get(baseTex, key, hue) { const result = get(baseTex, key, hue); if (result && result !== baseTex) owned.add(result); return result; }, destroy };
}
