import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

test('シミュレーションは DOM・Pixi・描画を import しない', () => {
  for (const f of walk(join(ROOT, 'js/sim'))) {
    const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /from ['"][^'"]*(vendor|pixi|render)[^'"]*['"]/, f);
    assert.doesNotMatch(src, /\b(document|window|requestAnimationFrame|Math\.random)\b/, f);
  }
});

test('sw-assets.js: 版の形式と、配信するファイルが全部そろっている', () => {
  const sandbox = { GAME_ASSETS: {} };
  new Function('self', readFileSync(join(ROOT, 'sw-assets.js'), 'utf8'))(sandbox);
  const a = sandbox.GAME_ASSETS['bot-commander'];
  assert.match(a.version, /^v\d+$/); assert.match(a.gameVersion, /^\d+\.\d+\.\d+(-dev)?$/); // 開発中は 0.4.0-dev のように -dev を付けてよい
  for (const f of a.files) assert.ok(existsSync(join(ROOT, f)), `ない: ${f}`);
  const shipped = [...walk(join(ROOT, 'js')), ...walk(join(ROOT, 'css')), ...walk(join(ROOT, 'vendor'))].map(p => relative(ROOT, p).split('\\').join('/'));
  for (const f of shipped) assert.ok(a.files.includes(f), `sw-assets.js に載っていない: ${f}`);
});

test('同じモジュールは同じ ?v= で読む（別インスタンスにしない）', () => {
  const seen = new Map();
  for (const f of walk(join(ROOT, 'js'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)) {
      const spec = m[1]; if (!spec.startsWith('.')) continue;
      const [path, q = ''] = spec.split('?');
      const abs = join(dirname(f), path);
      if (seen.has(abs)) assert.equal(seen.get(abs), q, `${relative(ROOT, abs)} の ?v= がそろっていない（${relative(ROOT, f)}）`);
      else seen.set(abs, q);
    }
  }
});

test('入口: default export に init と prepare がある', () => {
  const src = readFileSync(join(ROOT, 'js/index.js'), 'utf8');
  assert.match(src, /export default BotCommanderGame/);
  assert.match(src, /prepare\(\)\s*{\s*return loadCss\(/);
  assert.match(src, /init\(container, onBackToHub\)/);
});
