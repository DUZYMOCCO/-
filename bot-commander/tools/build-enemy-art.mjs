// Build the 59-species art library from preserved image_gen originals.
// No gameplay / simulation changes. PW / CHROME / URL follow mission-shots.mjs.
import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright-core');
const root = resolve('bot-commander');
const roster = JSON.parse(await readFile(resolve(root, 'docs/enemy-art/roster.json'), 'utf8'));
const promptSet = JSON.parse(await readFile(resolve(root, 'docs/enemy-art/generation-prompts.json'), 'utf8'));
const sourceRoster = await readFile(resolve(root, 'docs/enemy_roster_v0.md'));
if (roster.length !== 59 || new Set(roster.map(e => e.id)).size !== 59) throw Error('roster must contain 59 unique IDs');
const present = new Set((await readdir(resolve(root, 'docs/enemy-art/originals'))).map(f => f.replace('.png', '')));
await mkdir(resolve(root, 'assets/enemies-v0/thumbs'), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage();
await page.goto(process.env.URL || 'http://127.0.0.1:8766/');
const records = [], checks = [], generations = [];
for (const entry of roster) {
  if (!present.has(entry.id)) { records.push({ ...entry, status: 'pending' }); continue; }
  const result = await page.evaluate(async ({ id, boss }) => {
    const image = new Image(); image.src = `/bot-commander/docs/enemy-art/originals/${id}.png`; await image.decode();
    const raw = document.createElement('canvas'); raw.width = image.width; raw.height = image.height;
    const rg = raw.getContext('2d', { willReadFrequently: true }); rg.drawImage(image, 0, 0);
    const d = rg.getImageData(0, 0, raw.width, raw.height).data;
    let left = raw.width, top = raw.height, right = 0, bottom = 0, solid = 0, transparent = 0;
    for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) {
      const a = d[(y * raw.width + x) * 4 + 3];
      if (a < 8) transparent++;
      if (a > 48) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); solid++; }
    }
    if (!solid) throw new Error(`${id}: empty alpha`);
    const sw = right - left + 1, sh = bottom - top + 1;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const g = canvas.getContext('2d'); g.imageSmoothingQuality = 'high';
    const scale = Math.min(1024 * .92 / sw, 1024 * .84 / sh);
    const w = sw * scale, h = sh * scale, x = (1024 - w) / 2, y = 1024 * .88 - h;
    g.drawImage(image, left, top, sw, sh, x, y, w, h);
    const thumb = document.createElement('canvas'); thumb.width = thumb.height = 256;
    thumb.getContext('2d').drawImage(canvas, 0, 0, 256, 256);
    return {
      full: canvas.toDataURL('image/webp', .96).split(',')[1],
      thumb: thumb.toDataURL('image/webp', .90).split(',')[1],
      check: { id, originalPixels: [raw.width, raw.height], crop: [left, top, sw, sh], transparentFraction: transparent / (raw.width * raw.height), touchesOriginalEdge: left <= 1 || top <= 1 || right >= raw.width - 2 || bottom >= raw.height - 2, normalizedBounds: [x, y, w, h], normalizedFoot: .88, boss },
    };
  }, { id: entry.id, boss: entry.id.startsWith('B') });
  const imagePath = `assets/enemies-v0/${entry.id}.webp`, thumbPath = `assets/enemies-v0/thumbs/${entry.id}.webp`;
  const bytes = Buffer.from(result.full, 'base64'), thumbnail = Buffer.from(result.thumb, 'base64');
  await writeFile(resolve(root, imagePath), bytes);
  await writeFile(resolve(root, thumbPath), thumbnail);
  const original = `docs/enemy-art/originals/${entry.id}.png`;
  const hash = data => createHash('sha256').update(data).digest('hex');
  const record = { ...entry, status: 'ready', image: imagePath, thumbnail: thumbPath, original, originalSha256: hash(await readFile(resolve(root, original))), sha256: hash(bytes), pixels: 1024, anchor: [.5, .88], previewPixels: entry.id[0] === 'B' ? 176 : entry.size === '大' ? 88 : entry.size === '小' ? 48 : 64, textureKey: `enemy_${entry.id}`, bytes: bytes.length, thumbnailBytes: thumbnail.length };
  records.push(record);
  const generation = JSON.parse(await readFile(resolve(root, `docs/enemy-art/generated/${entry.id}.json`), 'utf8'));
  generations.push({ ...generation, status: 'ready', image: imagePath, thumbnail: thumbPath, originalSha256: record.originalSha256, sha256: record.sha256 });
  checks.push(result.check);
}
const ready = records.filter(e => e.status === 'ready');
if (new Set(ready.map(e => e.originalSha256)).size !== ready.length) throw Error('duplicate original image');
const manifest = { version: 'enemy-art-v0', expected: 59, ready: ready.length, entries: records };
await writeFile(resolve(root, 'docs/enemy-art/catalog.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(resolve(root, 'assets/enemies-v0/catalog.json'), JSON.stringify(manifest, null, 2) + '\n');
const alphaWarnings = checks.filter(c => c.transparentFraction < .15 || c.touchesOriginalEdge).map(c => c.id);
await writeFile(resolve(root, 'docs/enemy-art/asset-checks.json'), JSON.stringify({ expected: 59, ready: manifest.ready, uniqueOriginals: ready.length, alphaWarnings, totalBytes: records.reduce((n, e) => n + (e.bytes || 0), 0), thumbnailBytes: records.reduce((n, e) => n + (e.thumbnailBytes || 0), 0), checks }, null, 2) + '\n');
const { common, ...promptMeta } = promptSet;
await writeFile(resolve(root, 'docs/enemy-art/generation-prompts.json'), JSON.stringify({ ...promptMeta, status: ready.length === 59 ? 'complete' : 'in_progress', expected: 59, ready: ready.length, initialCommonPrompt: common || promptSet.initialCommonPrompt, currentPalettePolicy: 'Author revision at 19:20 JST: colors vary by biological lineage; species-specific appearance colors remain. The initial common prompt is historical. paletteRevision holds the latest override for edited species.', paletteRevisionCount: generations.filter(e => e.paletteRevision).length, sourceRoster: { path: 'docs/enemy_roster_v0.md', sha256: createHash('sha256').update(sourceRoster).digest('hex'), revision: '2026-10-22 19:20 JST' }, entries: generations }, null, 2) + '\n');
await browser.close();
console.log(JSON.stringify({ expected: 59, ready: manifest.ready, alphaWarnings }));
if (process.env.REQUIRE_ALL === '1' && (manifest.ready !== 59 || alphaWarnings.length)) process.exitCode = 1;
