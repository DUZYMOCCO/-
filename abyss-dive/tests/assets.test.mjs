import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(here, '..');
const root = resolve(gameDir, '..');

test('sw-assets.js が列挙するファイルがすべて実在する', () => {
  const src = readFileSync(resolve(gameDir, 'sw-assets.js'), 'utf8');
  const files = [...src.matchAll(/^\s*'([^']+)',\s*$/gm)].map((m) => m[1]);
  assert.ok(files.length >= 3, 'files が少なすぎる: ' + files.length);
  for (const f of files) {
    assert.ok(existsSync(resolve(gameDir, f)), '見つからない: ' + f);
  }
});

test('入口 index.js が default export と prepare/init を持つ', () => {
  const src = readFileSync(resolve(gameDir, 'js/index.js'), 'utf8');
  assert.match(src, /export default/);
  assert.match(src, /prepare\s*\(/);
  assert.match(src, /init\s*\(/);
});

test('本体 game.js が createAbyssDive を export している', () => {
  const src = readFileSync(resolve(gameDir, 'js/game.js'), 'utf8');
  assert.match(src, /export function createAbyssDive\s*\(/);
});

test('games-registry.js に abyss-dive が登録されている', () => {
  const reg = readFileSync(resolve(root, 'common/js/games-registry.js'), 'utf8');
  assert.match(reg, /id:\s*'abyss-dive'/);
  assert.match(reg, /import\('\.\.\/\.\.\/abyss-dive\/js\/index\.js'\)/);
});

test('sw.js の GAME_IDS に abyss-dive が入っている', () => {
  const sw = readFileSync(resolve(root, 'sw.js'), 'utf8');
  const m = /GAME_IDS\s*=\s*\[([^\]]*)\]/.exec(sw);
  assert.ok(m, 'GAME_IDS が見つからない');
  assert.match(m[1], /'abyss-dive'/);
});
