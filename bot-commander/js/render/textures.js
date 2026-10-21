// SVG 文字列 → Pixi テクスチャ。起動時に一度だけ作る（ダダサバイバーの「起動時に一度だけ data URI 化」と同じ考え方）。
import { Texture } from '../../vendor/pixi-8.22.0.min.mjs?v=2';

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

/** sources: {key: svg}。tile_* は 64px、それ以外は 128px（拡大時もにじみにくいよう2倍で焼く） */
export async function buildTextures(sources) {
  const out = {};
  await Promise.all(Object.entries(sources).map(async ([key, svg]) => {
    const px = key.startsWith('tile_') ? 64 : key.startsWith('hq_') ? 192 : 128;
    const tex = Texture.from(await svgToCanvas(svg, px));
    tex.source.scaleMode = 'linear';
    out[key] = tex;
  }));
  return out;
}
