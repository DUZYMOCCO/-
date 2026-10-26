// R-13: css/ の各ファイルの「いまの ?v=（読む側の指定）」と「中身の sha1」を調べる（module-versions-scan.mjs の CSS 版）。
// tests/css-versions.test.mjs と tools/update-css-versions.mjs が使う。読む側は js/ の中の 'css/名前.css?v=数' の書き方。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, sep, relative } from 'node:path';

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

/** { 'css/save.css': { v: 2, sha1: '…' }, … }。v は読む側の指定（?v= なしで読まれている・書かれていない時は null）。読む側で違う v があれば例外 */
export function scanCss(root) {
  const readers = new Map();
  for (const f of walk(join(root, 'js')).filter(p => /\.m?js$/.test(p))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/css\/([\w.-]+\.css)(?:\?v=(\d+))?/g)) {
      const k = 'css/' + m[1];
      if (!readers.has(k)) readers.set(k, new Set());
      if (m[2] !== undefined) readers.get(k).add(Number(m[2])); // ?v= なしの書き方（コメントなど）は数えない
    }
  }
  const out = {};
  for (const p of walk(join(root, 'css')).filter(p => p.endsWith('.css')).sort()) {
    const rel = relative(root, p).split(sep).join('/');
    const vs = [...(readers.get(rel) || [])];
    if (vs.length > 1) throw new Error(`${rel} が違う ?v= で読まれている: ${vs.join(', ')}`);
    out[rel] = { v: vs.length ? vs[0] : null, sha1: createHash('sha1').update(readFileSync(p)).digest('hex') };
  }
  return out;
}
