// toKana(text, grade): rewrite words containing kanji above `grade` (1..6) entirely in hiragana,
// with a half-width space before each rewritten word (分かち書き風) when it follows a letter.
// Kanji outside the 教育漢字 count as grade 7. grade falsy/>=7/'off' => text returned unchanged.
// Pure + idempotent. One trie per grade, built lazily; per-grade result cache.
import { KANA_DICT } from './kana-dict.js';
import { gradeOf } from './kanji-grades.js';

const KANJI_TEST = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const CACHE_LIMIT = 4000;
const WORD_BEFORE = /[ぁ-ゖァ-ヺー㐀-䶿一-鿿豈-﫿々]/;

const maxGradeOf = (key) => {
  let m = 0;
  for (const ch of key) { const g = gradeOf(ch); if (g > m) m = g; }
  return m;
};
const ENTRIES = KANA_DICT.map(([k, v]) => [k, v, maxGradeOf(k)]);
const tries = new Map();
const caches = new Map();

function trieFor(grade) {
  let root = tries.get(grade);
  if (root) return root;
  root = new Map();
  for (const [k, v, mg] of ENTRIES) {
    if (mg <= grade) continue; // student already reads every kanji in this key
    let node = root;
    for (const ch of k) {
      let nx = node.get(ch);
      if (!nx) node.set(ch, (nx = new Map()));
      node = nx;
    }
    node.set('', v); // '' = terminal marker (no real char is empty)
  }
  tries.set(grade, root);
  return root;
}

function convert(text, root) {
  let out = '';
  const n = text.length;
  let i = 0;
  while (i < n) {
    let node = root.get(text[i]);
    let best = null, bestLen = 0, j = i;
    // iterate by UTF-16 unit; all keys are BMP kanji/kana
    while (node) {
      j++;
      const term = node.get('');
      if (term !== undefined) { best = term; bestLen = j - i; }
      if (j >= n) break;
      node = node.get(text[j]);
    }
    if (best !== null) {
      // 分かち書き風: かなにした言葉の前に半角スペース（直前が文字のときだけ。数字・記号・文頭のあとは詰める）
      if (WORD_BEFORE.test(out.slice(-1))) out += ' ';
      out += best; i += bestLen;
    }
    else { out += text[i]; i++; }
  }
  return out;
}

export function toKana(text, grade) {
  if (typeof text !== 'string' || !text) return text;
  const g = grade === undefined ? 2 : +grade;
  if (!(g >= 1 && g < 7)) return text;
  if (!KANJI_TEST.test(text)) return text;
  let cache = caches.get(g);
  if (!cache) caches.set(g, (cache = new Map()));
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const res = convert(text, trieFor(g));
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(text, res);
  return res;
}

// Debug: list of [start, end, key, reading] replacements made at `grade` (no cache).
export function traceKana(text, grade) {
  const root = trieFor(grade), res = [];
  let i = 0;
  while (i < text.length) {
    let node = root.get(text[i]), best = null, bl = 0, j = i;
    while (node) { j++; const t = node.get(''); if (t !== undefined) { best = t; bl = j - i; } if (j >= text.length) break; node = node.get(text[j]); }
    if (best !== null) { res.push([i, i + bl, text.slice(i, i + bl), best]); i += bl; } else i++;
  }
  return res;
}

// Remaining kanji above `grade` in a string (used by tooling/tests).
export function leftoverKanji(text, grade) {
  const r = [];
  for (const ch of text) if (gradeOf(ch) > grade) r.push(ch);
  return r;
}
export default toKana;
