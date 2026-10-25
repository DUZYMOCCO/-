// 地面の境界の絵の選び方（js/render/ground-edges.js）
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { edgePieces, EDGE_PAIRS, EDGE_NAMES, MIX3_FILES, pairDir } from '../js/render/ground-edges.js?v=2';
const grid = rows => (x, y) => (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length ? null : { '.': 'plain', f: 'forest', m: 'mountain', w: 'water', s: 'shallow' }[rows[y][x]]);
// 短く書く: [名前, 上の地形, 下の地形] か ['mix3', 'forest-mountain/tl__…']
const brief = ps => ps.map(p => (p.mix3 ? ['mix3', p.mix3] : [p.name, p.kind, p.dir.split('_on_')[1]]));
const at = (rows, x = 1, y = 1) => brief(edgePieces(grid(rows), x, y));
test('境界（平地）: 辺1つ・外角・内角（内角の2辺には辺の絵を出さない）・辺を先に角を後', () => {
  assert.deepEqual(at(['.f.', '...', '...']), [['edge_top', 'forest', 'plain']]);
  assert.deepEqual(at(['f..', '...', '...']), [['corner_out_tl', 'forest', 'plain']]);
  assert.deepEqual(at(['ff.', 'f..', '...']), [['corner_in_tl', 'forest', 'plain']]);
  assert.deepEqual(at(['.w.', '...', '..w']), [['edge_top', 'water', 'plain'], ['corner_out_br', 'water', 'plain']]);
  assert.deepEqual(at(['.m.', 'm.m', '...']), [['corner_in_tl', 'mountain', 'plain'], ['corner_in_tr', 'mountain', 'plain']]);
  assert.deepEqual(at(['...', '...', 's.f']), [['corner_out_bl', 'shallow', 'plain'], ['corner_out_br', 'forest', 'plain']]);
  assert.deepEqual(at(['...', '...', '...']), []);
});
test('境界: 平地以外のマスにも、上の地形（平地 < 浅瀬 < 深い水 < 岩場 < 森）の縁だけを重ねる', () => {
  assert.deepEqual(at(['.f.', '.m.', '...']), [['edge_top', 'forest', 'mountain']]); // 岩場のマスに森
  assert.deepEqual(at(['.m.', '.f.', '...']), []); // 森のマスには何も重ねない（森がいちばん上）
  assert.deepEqual(at(['...', 'mwf', '...']), [['edge_left', 'mountain', 'water'], ['edge_right', 'forest', 'water']]); // 下から順
  assert.deepEqual(at(['.w.', '.s.', '...']), [['edge_top', 'water', 'shallow']]);
  assert.deepEqual(at(['...', '.s.', '..f']), [['corner_out_br', 'forest', 'shallow']]);
  assert.deepEqual(at(['.s.', '.w.', '...']), []); // 深い水のマスに浅瀬は重ねない（浅瀬が下）
  assert.deepEqual(at(['.s.', 's..', '...']), [['corner_in_tl', 'shallow', 'plain']]);
  assert.deepEqual(at(['ww.', 'ws.', '...']), [['corner_in_tl', 'water', 'shallow']]); // 斜めも同じ地形なら外角は出さない
});
test('境界: 3種類が会う角（平地のマス）は2辺の辺の絵の代わりに mix3 を1枚（外角は地形の順のまま）', () => {
  assert.deepEqual(at(['.f.', 'm..', '...']), [['mix3', 'forest-mountain/tl__forest-top__mountain-left']]);
  assert.deepEqual(at(['.m.', 'f..', '...']), [['mix3', 'forest-mountain/tl__mountain-top__forest-left']]);
  assert.deepEqual(at(['...', '..w', '.m.']), [['mix3', 'mountain-water/br__mountain-bottom__water-right']]);
  assert.deepEqual(at(['.w.', '..f', '...']), [['mix3', 'forest-water/tr__water-top__forest-right']]);
  // 組にない2種類（浅瀬＋森）はふつうの辺2枚
  assert.deepEqual(at(['.s.', 'f..', '...']), [['edge_top', 'shallow', 'plain'], ['edge_left', 'forest', 'plain']]);
  // 平地以外のマスでは mix3 は使わない（浅瀬のマスの上が森・左が岩場 → 辺2枚）
  assert.deepEqual(at(['.f.', 'ms.', '...']), [['edge_left', 'mountain', 'shallow'], ['edge_top', 'forest', 'shallow']]);
  // 上が森・左右が岩場（1マス幅の平地）: 上の辺を tl と tr の mix3 が共有する（片方だけだと反対の角が四角く欠ける）
  assert.deepEqual(at(['.f.', 'm.m', '...']), [['mix3', 'forest-mountain/tl__forest-top__mountain-left'], ['mix3', 'forest-mountain/tr__forest-top__mountain-right']]);
  // 上が水・左が森・右が岩場: 組の違う mix3 2枚（岩場が先＝下、森が後）
  assert.deepEqual(at(['.w.', 'f.m', '...']), [['mix3', 'mountain-water/tr__water-top__mountain-right'], ['mix3', 'forest-water/tl__water-top__forest-left']]);
  // 内角が先: 上と右が森（内角）・左が岩場 → 上は内角が使うので mix3 なし
  assert.deepEqual(at(['.f.', 'm.f', '...']), [['edge_left', 'mountain', 'plain'], ['corner_in_tr', 'forest', 'plain']]);
  // mix3 と斜めの外角は重ねてよい（外角は後）
  // 斜めの外角は地形の順に重ねる（深い水の外角は mix3 より先＝下）
  assert.deepEqual(at(['wf.', 'm..', '...']), [['corner_out_tl', 'water', 'plain'], ['mix3', 'forest-mountain/tl__forest-top__mountain-left']]);
  assert.deepEqual(at(['.f.', 'm..', '..w']), [['corner_out_br', 'water', 'plain'], ['mix3', 'forest-mountain/tl__forest-top__mountain-left']]);
});
test('境界: 同じ地図からは何度呼んでも同じ結果（決まった順）', () => {
  const rows = ['fmwsf.', '.mws.f', 'ff.mw.', 'w.s.mf', '.mf.ws'];
  const all = () => rows.flatMap((r, y) => [...r].map((_, x) => brief(edgePieces(grid(rows), x, y))));
  assert.deepEqual(all(), all());
});
test('境界: 使う絵のファイルがすべて assets にある', () => {
  const dir = fileURLToPath(new URL('../assets/ground-edges/', import.meta.url));
  assert.equal(EDGE_PAIRS.length, 10);
  for (const [hi, lo] of EDGE_PAIRS) for (const n of EDGE_NAMES) assert.ok(existsSync(`${dir}${pairDir(hi, lo)}/${n}.png`), `${pairDir(hi, lo)}/${n}`);
  assert.equal(MIX3_FILES.length, 24);
  for (const f of MIX3_FILES) { assert.ok(existsSync(`${dir}mix3/${f}.png`), f); assert.ok(existsSync(`${dir}mix3/${f.replace('/', '/mask/')}.png`), `mask ${f}`); }
  assert.ok(existsSync(fileURLToPath(new URL('../assets/art-v2/ground-shallow.webp', import.meta.url))));
});
