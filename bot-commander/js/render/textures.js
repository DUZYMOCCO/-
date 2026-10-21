// SVG / raster descriptors -> Pixi textures, baked once at boot. No per-frame image processing.
import { Texture } from '../../vendor/pixi-8.22.0.min.mjs?v=7';

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

function badge(g, badge, px) {
  const x = badge.x * px, y = badge.y * px, r = px * .025;
  g.save(); g.lineJoin = 'round'; g.strokeStyle = '#382b17'; g.lineWidth = px * .006;
  const light = g.createLinearGradient(x - r, y - r * 2, x + r, y + r);
  light.addColorStop(0, '#fff7cf'); light.addColorStop(.35, '#ffd773'); light.addColorStop(1, '#9c682b');
  g.fillStyle = light;
  if (badge.type === 'lamp') {
    g.fillRect(x - r * .7, y, r * 1.4, r * 1.4);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  } else {
    g.beginPath(); g.moveTo(x - r * 1.4, y + r); g.lineTo(x, y - r * 2.5); g.lineTo(x + r * 1.4, y + r); g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
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
  if (source.badge) badge(g, source.badge, px);
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
