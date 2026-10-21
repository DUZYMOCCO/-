// Re-encode generated originals for shipping. Creative work stays in image_gen;
// this step only scales/encodes and preserves untouched PNG originals in docs.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright-core');
const root = resolve('bot-commander');
const manifest = JSON.parse(await readFile(resolve(root, 'docs/art-review/generation-prompts.json'), 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage();
await page.goto(process.env.URL || 'http://127.0.0.1:8766/');
await mkdir(resolve(root, 'docs/art-review/sources'), { recursive: true });
for (const asset of manifest.assets) {
  const px = ['scavenger', 'ponco', 'alien'].includes(asset.name) ? 768 : 1024;
  const raw = `docs/art-review/sources/${asset.name}.png`;
  const input = existsSync(resolve(root, raw)) ? raw : `assets/art-v2/${asset.name}.png`;
  const data = await page.evaluate(async ({ input, px }) => {
    const image = new Image(); image.src = `/bot-commander/${input}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = px;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(image, 0, 0, px, px);
    return canvas.toDataURL('image/webp', .95).split(',')[1];
  }, { input, px });
  await writeFile(resolve(root, `assets/art-v2/${asset.name}.webp`), Buffer.from(data, 'base64'));
  const from = resolve(root, input), to = resolve(root, raw);
  for (const path of [from, to]) if (relative(root, path).startsWith('..')) throw new Error('outside game folder');
  if (from !== to) await rename(from, to);
  asset.original = `docs/art-review/sources/${asset.name}.png`;
  asset.asset = `assets/art-v2/${asset.name}.webp`;
  asset.shippedPixels = px;
}
await writeFile(resolve(root, 'docs/art-review/generation-prompts.json'), JSON.stringify(manifest, null, 2) + '\n');
await browser.close();
