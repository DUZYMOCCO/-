// 紙芝居式のキャラ絵（char-frames/<名前>/frames/）を、ゲームで使う大きさだけ assets/chars/<名前>/ に写す。
// 元フォルダは読むだけ。使い方: node tools/pack-chars.mjs BOY [GIRL ...]
//   → assets/chars/<名前>/<motion>_<size>.png と frames.json（全モーションをまとめ、ゲームに要る項目だけ）。前の版の残りは消す
// そのあと js/render/char-anim.js の CHAR_FRAMES に1行足す。sw-assets.js の files にはこのツールが足す。
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.CHAR_FRAMES_DIR || join(GAME, '../../char-frames');
const SIZES = ['s30', 'm60']; // ロボの絵（128px に焼く）と同じくらいの細かさまで。L（300px）は使わない
const KEEP = ['fps', 'loop', 'sequence', 'sequence_intro', 'hold_last', 'then', 'cycle_distance_L', 'mirror_for_left', 'facing'];

for (const name of process.argv.slice(2)) {
  const from = join(SRC, name, 'frames'), to = join(GAME, 'assets/chars', name), files = [];
  mkdirSync(to, { recursive: true });
  const out = { character: name, standing_height_L: 300, motions: {} };
  for (const motion of readdirSync(from).sort()) {
    const fj = join(from, motion, 'frames.json');
    if (!existsSync(fj)) continue;
    const d = JSON.parse(readFileSync(fj, 'utf8')), m = { frames: d.frames.length, sizes: {} };
    for (const k of KEEP) if (d[k] !== undefined) m[k] = d[k];
    if (d.sizes.L) out.standing_height_L = d.sizes.L.standing_height;
    for (const s of SIZES) {
      const z = d.sizes[s], file = `${motion}_${s}.png`;
      copyFileSync(join(from, motion, z.strip), join(to, file));
      m.sizes[s] = { file, frame_w: z.frame_w, frame_h: z.frame_h, anchor: z.anchor, standing_height: z.standing_height };
      files.push(`assets/chars/${name}/${file}`);
    }
    out.motions[motion] = m;
  }
  writeFileSync(join(to, 'frames.json'), JSON.stringify(out, null, 1) + '\n');
  files.unshift(`assets/chars/${name}/frames.json`);
  // 前の版の残り（もう無いモーション・サイズの絵）は消す
  const keep = new Set(files.map(f => f.split('/').pop()));
  for (const f of readdirSync(to)) if (!keep.has(f)) { rmSync(join(to, f)); console.log(`  removed stale ${name}/${f}`); }
  // sw-assets.js: このキャラの行を入れ直す（vendor の前）
  const swp = join(GAME, 'sw-assets.js');
  let sw = readFileSync(swp, 'utf8').split('\n').filter(l => !l.includes(`'assets/chars/${name}/`));
  const at = sw.findIndex(l => l.includes("'vendor/"));
  sw.splice(at, 0, ...files.map(f => `    '${f}',`));
  writeFileSync(swp, sw.join('\n'));
  console.log(name, Object.keys(out.motions).join(' '), `${files.length} files`);
}
