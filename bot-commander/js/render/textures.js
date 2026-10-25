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
        const src = Texture.from(img, true).source; src.scaleMode = 'linear'; // true＝Pixi の Cache に入れない（捨てた絵が残らないように）
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
export async function buildArtCanvases(sources, fallbacks = {}) {
  const out = {}, images = new Map(), tiles = new Map();
  await Promise.all(Object.entries(sources).map(async ([key, source]) => {
    const px = key.startsWith('tile_') ? 64 : key.startsWith('hq_') || key === 'hatch' || key.startsWith('alien_') ? 192 : 128;
    const build = async src => {
      if (typeof src === 'string') return svgToCanvas(src, px);
      if (src.tile) {
        if (!tiles.has(src.url)) tiles.set(src.url, rasterToCanvas(src, images));
        return tiles.get(src.url);
      }
      return rasterToCanvas(src, images);
    };
    try { out[key] = await build(source); }
    catch (e) { // 絵が 1 枚読めなくても始める: 代わり（手描きの SVG。fallbacks[key]）で出す。代わりもなければ、その 1 枚だけは作らない（出すときに別の絵に替わる）
      const alt = fallbacks[key];
      console.warn(`[bot-commander] ${key} の絵を読めない（${alt ? '手描きの絵で出す' : '出さない'}）`, e);
      if (alt) try { out[key] = await build(alt); } catch (e2) { console.warn(`[bot-commander] ${key} の代わりの絵も作れない`, e2); }
    }
  }));
  return out;
}

/** 絵を 1 枚捨てる。GPU から外し、canvas は幅・高さを 0 にしてブラウザへ返す（Safari は canvas の合計に上限がある）。同じ物を何度渡してもよい */
export function disposeTexture(t) {
  const res = canvasOf(t);
  if (t) try { t.destroy(true); } catch { /* もう捨てた物 */ }
  if (res) res.width = res.height = 0;
}
/** 絵の元になっている canvas（なければ null）。app.destroy が絵を捨てると取り出せなくなるので、捨てる前に控えておく */
export function canvasOf(t) {
  const res = t && t.source && t.source.resource;
  return res && res.tagName === 'CANVAS' ? res : null;
}
/** 紙芝居のキャラ絵（loadCharSheets の返り値）を全部捨てる */
export function disposeChars(chars) {
  for (const ch of Object.values(chars || {})) Object.values(ch.tex).flat().forEach(disposeTexture);
}

export async function buildTextures(sources, fallbacks) {
  const out = {}, canvases = await buildArtCanvases(sources, fallbacks);
  for (const [key, canvas] of Object.entries(canvases)) {
    const tex = Texture.from(canvas, true); // true＝Cache に入れない
    tex.source.scaleMode = 'linear';
    tex.source.autoGenerateMipmaps = true;
    out[key] = tex;
  }
  return out;
}
