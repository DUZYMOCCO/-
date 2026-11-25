/**
 * Service Worker アセット一覧（sw-assets.js）の契約テスト。
 *  - files に載る実ファイルがすべて存在する
 *  - 壊れた/消えたアセットを登録したまま公開しない
 *  - version / gameVersion が package.json と整合する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(here, '..');
const sw = readFileSync(resolve(gameDir, 'sw-assets.js'), 'utf8');

function listedFiles(){
  const out = [];
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(sw))) {
    const s = m[1];
    if (s.includes('/')) out.push(s);   // パス形式の文字列だけ（version / gameVersion を除く）
  }
  return out;
}

test('sw-assets: files に載るすべてのアセットが実在する', () => {
  const files = listedFiles();
  assert.ok(files.length > 50, 'asset list looks too small: ' + files.length);
  const missing = files.filter(f => !existsSync(resolve(gameDir, f)));
  assert.deepEqual(missing, [], 'missing assets on disk: ' + missing.join(', '));
});

test('sw-assets: pose-debris と B亜種ヤドカリの新規アセットが登録されている', () => {
  for (const f of ['js/pose-debris.js', 'assets/hermit-b-walk.webp', 'assets/hermit-b-alert.webp',
                   'assets/hermit-b-part-shell.webp', 'assets/hermit-b-part-eyes.webp']) {
    assert.ok(sw.includes("'" + f + "'"), 'not registered: ' + f);
  }
});

test('sw-assets: gameVersion は package.json の version と一致する', () => {
  const pkg = JSON.parse(readFileSync(resolve(gameDir, 'package.json'), 'utf8'));
  const m = sw.match(/gameVersion:\s*'([^']+)'/);
  assert.ok(m, 'gameVersion missing');
  assert.equal(m[1], pkg.version, 'sw gameVersion must match package.json version');
});

test('sw-assets: ゲーム自身の id と一致している', () => {
  assert.ok(sw.includes("self.GAME_ASSETS['abyss-depth-lab']"), 'the manifest key must be the game id');
});
