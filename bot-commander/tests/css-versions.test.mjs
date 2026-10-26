// R-13: CSS の ?v= の上げ忘れを見つける（JS は module-versions.test.mjs）。通信優先でも ?v= つきの URL は HTTP キャッシュを使うので、上げ忘れると直らない端末が出る。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCss } from './fixtures/css-versions-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/css-versions.json'), 'utf8'));
const HINT = '直したら、読む側（js/ の css/名前.css?v=数）の ?v= を 1 つ上げてから `node tools/update-css-versions.mjs` で fixtures を作り直す';

test('CSS の ?v= の上げ忘れ: 中身を変えた css は、読む側の ?v= も前と変わっている', () => {
  const now = scanCss(ROOT);
  for (const [f, cur] of Object.entries(now)) {
    const was = base[f];
    assert.ok(was, `${f} が tests/fixtures/css-versions.json にない。${HINT}`);
    if (was.sha1 !== cur.sha1) assert.notEqual(cur.v, was.v, `${f} の中身が変わったのに ?v=${cur.v} が前のまま。${HINT}`);
  }
});
test('CSS の ?v= の記録: 消えた css が fixtures に残っていない', () => {
  const now = scanCss(ROOT);
  for (const f of Object.keys(base)) assert.ok(now[f], `${f} はもうない。${HINT}`);
});
test('CSS の ?v= の見張りが効く: 中身だけ変わって ?v= が同じなら見つけられる（判定の写し）', () => {
  const judge = (was, cur) => was.sha1 !== cur.sha1 && cur.v === was.v;
  assert.equal(judge({ v: 2, sha1: 'a' }, { v: 2, sha1: 'b' }), true);
  assert.equal(judge({ v: 2, sha1: 'a' }, { v: 3, sha1: 'b' }), false);
});
test('CSS を読む側が実際にある（読まれていない css は null と記録）', () => {
  const now = scanCss(ROOT);
  assert.equal(now['css/bot-commander.css'].v, 18); // v1.0.7 発射ボタンの色
  assert.ok(Object.keys(now).length >= 6);
});
