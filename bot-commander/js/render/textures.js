// SVG / raster descriptors -> Pixi textures, baked once at boot. No per-frame image processing.
import { Texture, Rectangle } from '../../vendor/pixi-8.22.0.min.mjs?v=7';

/**
 * 紙芝居式のキャラ絵（assets/chars/<フォルダ>/frames.json と横一列の絵）を読む。chars: { 種類: フォルダ }
 * 返り値: { 種類: { def, tex: { '<motion>_<size>': [コマごとの Texture] }, sources: { size: [TextureSource] } } }
 * 読めなかったキャラは入れない（その種類は前の絵のまま）。
 */
export async function loadCharSheets(chars) {
  const out = {};
  await Promise.all(Object.entries(chars).map(async ([kind, dir]) => {
    try {
      const base = new URL(`../../assets/chars/${dir}/`, import.meta.url);
      const res = await fetch(new URL('frames.json', base));
      if (!res.ok) throw new Error(`frames.json ${res.status}`);
      const def = await res.json(), tex = {}, sources = {};
      await Promise.all(Object.entries(def.motions).flatMap(([motion, m]) => Object.entries(m.sizes).map(async ([size, z]) => {
        const img = new Image(); img.src = new URL(z.file, base).href; await img.decode();
        const src = Texture.from(img).source; src.scaleMode = 'linear';
        (sources[size] ||= []).push(src);
        tex[`${motion}_${size}`] = Array.from({ length: m.frames }, (_, i) => new Texture({ source: src, frame: new Rectangle(i * z.frame_w, 0, z.frame_w, z.frame_h) }));
      })));
      out[kind] = { def, tex, sources };
    } catch (e) { console.warn(`[bot-commander] ${dir} の絵を読めない（前の絵で出す）`, e); }
  }));
  return out;
}

async function svgToCanvas(svg, px) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const w = vb ? Number(vb[1]) : 64, h = vb ? Number(vb[2]) : 64;
  const scale = px / Math.max(w, h);
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function rasterToCanvas(source, images) {
  if (!images.has(source.url)) images.set(source.url, (async () => {
    const image = new Image(); image.src = source.url; await image.decode(); return image;
  })());
  const image = await images.get(source.url), px = source.px;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = px;
  const g = canvas.getContext('2d'); g.imageSmoothingQuality = 'high';
  if (source.tile) {
    if (source.mirror) { g.translate(px, 0); g.scale(-1, 1); }
    g.drawImage(image, 0, 0, px, px);
    return canvas;
  }
  const scale = image.width / source.originalSize;
  const [sx, sy, sw, sh] = source.rect.map(v => v * scale);
  const fit = Math.min(px * source.fit[0] / sw, px * source.fit[1] / sh);
  const w = sw * fit, h = sh * fit;
  const x = source.anchor[0] * px - w * source.pivot[0], y = source.anchor[1] * px - h * source.pivot[1];
  if (source.mirror) { g.translate(px, 0); g.scale(-1, 1); }
  g.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  if (source.enemy) {
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#ad3e2540'; g.fillRect(0, 0, px, px);
    g.globalCompositeOperation = 'source-over';
  }
  return canvas;
}

/** Exposed for local art QA too, so previews and game use exactly the same bake. */
export async function buildArtCanvases(sources) {
  const out = {}, images = new Map(), tiles = new Map();
  await Promise.all(Object.entries(sources).map(async ([key, source]) => {
    const px = key.startsWith('tile_') ? 64 : key.startsWith('hq_') || key === 'hatch' || key.startsWith('alien_') ? 192 : 128;
    if (typeof source === 'string') out[key] = await svgToCanvas(source, px);
    else if (source.tile) {
      if (!tiles.has(source.url)) tiles.set(source.url, rasterToCanvas(source, images));
      out[key] = await tiles.get(source.url);
    } else out[key] = await rasterToCanvas(source, images);
  }));
  return out;
}

export async function buildTextures(sources) {
  const out = {}, canvases = await buildArtCanvases(sources);
  for (const [key, canvas] of Object.entries(canvases)) {
    const tex = Texture.from(canvas);
    tex.source.scaleMode = 'linear';
    tex.source.autoGenerateMipmaps = true;
    out[key] = tex;
  }
  return out;
}
