import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanModules } from './fixtures/module-versions-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/module-versions.json'), 'utf8'));
const HINT = '直したら、読む側の ?v= を 1 つ上げてから `node tools/update-module-versions.mjs` で fixtures を作り直す';

test('?v= の上げ忘れ: 中身を変えたモジュールは、読む側の ?v= も前と変わっている', () => {
  const now = scanModules(ROOT);
  for (const [f, cur] of Object.entries(now)) {
    const was = base[f];
    assert.ok(was, `${f} が tests/fixtures/module-versions.json にない。${HINT}`);
    if (was.sha1 !== cur.sha1) assert.notEqual(cur.v, was.v, `${f} の中身が変わったのに ?v=${cur.v} が前のまま。${HINT}`);
  }
});

test('?v= の記録: 消えたモジュールが fixtures に残っていない', () => {
  const now = scanModules(ROOT);
  for (const f of Object.keys(base)) assert.ok(now[f], `${f} はもうない。${HINT}`);
});

test('?v= の見張り自体が効く: 中身だけ変わって ?v= が同じなら見つけられる（判定の写し）', () => {
  const judge = (was, cur) => was.sha1 !== cur.sha1 && cur.v === was.v; // 上げ忘れ
  assert.equal(judge({ v: 3, sha1: 'a' }, { v: 3, sha1: 'b' }), true);
  assert.equal(judge({ v: 3, sha1: 'a' }, { v: 4, sha1: 'b' }), false);
  assert.equal(judge({ v: 3, sha1: 'a' }, { v: 3, sha1: 'a' }), false);
});
