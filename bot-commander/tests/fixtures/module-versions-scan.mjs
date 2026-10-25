// js/ の各モジュールの「いまの ?v=（読む側の指定）」と「中身の sha1（改行を含むバイトそのまま）」を調べる。
// tests/module-versions.test.mjs と tools/update-module-versions.mjs が使う。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, normalize, sep } from 'node:path';

const SPEC = /(?:from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]+?)(?:\?v=(\d+))?\1/g;
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const rel = (root, p) => relative(root, p).split(sep).join('/');

/** { 'js/sim/sim.js': { v: 20, sha1: '…' }, … }。v は読む側の指定（読む側がなければ null。index.js はハブが ?v= なしで読むので対象外）。読む側で違う v があれば例外 */
export function scanModules(root) {
  const files = walk(join(root, 'js')).filter(p => /\.m?js$/.test(p)).map(normalize);
  const versions = new Map();
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(SPEC)) {
      const t = normalize(join(dirname(f), m[2]));
      if (!versions.has(t)) versions.set(t, new Set());
      versions.get(t).add(m[3] === undefined ? null : Number(m[3]));
    }
  }
  const out = {};
  for (const f of files.sort()) {
    if (rel(root, f) === 'js/index.js') continue;
    const vs = [...(versions.get(f) || [])];
    if (vs.length > 1) throw new Error(`${rel(root, f)} が違う ?v= で読まれている: ${vs.join(', ')}`);
    out[rel(root, f)] = { v: vs.length ? vs[0] : null, sha1: createHash('sha1').update(readFileSync(f)).digest('hex') };
  }
  return out;
}
