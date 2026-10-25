// v1.0.0: ブラウザだけで読む js（js/index.js など）も、文の書き間違いがないか確かめる（node --check を .mjs の写しにかける）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

test('文の書き間違いがない: js/ の全部と sw-assets.js', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bc-syntax-'));
  try {
    const files = [...walk(join(ROOT, 'js')).filter(p => p.endsWith('.js')), join(ROOT, 'sw-assets.js')];
    const bad = [];
    files.forEach((f, i) => {
      const t = join(dir, `m${i}.mjs`); copyFileSync(f, t);
      const r = spawnSync(process.execPath, ['--check', t], { encoding: 'utf8' });
      if (r.status !== 0) bad.push(`${f.slice(ROOT.length)}: ${(r.stderr || '').split('\n').find(l => /Error/.test(l)) || r.status}`);
    });
    assert.deepEqual(bad, []);
    assert.ok(files.length > 50);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
