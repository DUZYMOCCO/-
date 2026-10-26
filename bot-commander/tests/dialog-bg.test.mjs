import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkScript, startDialog, nextLine, skipToEnd, bgsUsed, upcomingBg } from '../js/dialog/dialog-script.js?v=3';
import { BG_FILES, BG_NAMES, isBgName, bgUrl } from '../js/dialog/dialog-bg.js?v=2';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const json = rel => JSON.parse(readFileSync(path(rel), 'utf8'));
const P = json('../assets/portraits/portraits.json').chars;
const DEMO = json('../assets/dialog/demo.json');
const MINI = {
  NEJI: { name: 'ネジ', side: 'left', faces: { neutral: {} } },
  GIRL: { name: '少女', side: 'right', faces: { neutral: {} } },
};
const cast = { NEJI: 'neutral', GIRL: 'neutral' };

test('背景の表: 13 の名前が、WebP のファイルと 1 対 1 で合う（幅 1080 以下・数百 KB）', () => {
  assert.deepEqual([...BG_NAMES].sort(), ['alien_nest', 'battlefield_day', 'briefing', 'coast', 'deepsea', 'factory_ruins', 'hangar', 'hideout', 'junk_market', 'night_camp', 'ruins_town', 'sky', 'wasteland']);
  const dir = path('../assets/dialog/bg/');
  const files = readdirSync(dir).filter(f => !f.startsWith('.')).sort();
  assert.deepEqual(files, BG_NAMES.map(n => n + '.webp').sort(), 'bg/ の絵と表が 1 対 1');
  for (const n of BG_NAMES) {
    assert.ok(existsSync(path('../' + BG_FILES[n])), BG_FILES[n]);
    const kb = statSync(path('../' + BG_FILES[n])).size / 1024;
    assert.ok(kb > 100 && kb < 450, `${n}: ${kb.toFixed(0)}KB`);
    assert.match(bgUrl(n), new RegExp(`/assets/dialog/bg/${n}\.webp$`));
  }
  assert.equal(bgUrl('nothing'), null); assert.equal(bgUrl(null), null); assert.equal(bgUrl('toString'), null, '表にない名前（Object の持ち物）は知らない');
  assert.equal(isBgName('hideout'), true); assert.equal(isBgName('constructor'), false);
});

test('sw-assets: いつも読み込む一覧に入れた背景の絵は多くても 3 枚（物語の台本が使う hideout・ruins_town・第 2 章の wasteland）・一覧のファイルはある', () => {
  const src = readFileSync(path('../sw-assets.js'), 'utf8');
  const bgs = [...src.matchAll(/'(assets\/dialog\/bg\/[^']+)'/g)].map(m => m[1]);
  assert.ok(bgs.length <= 3, `背景の絵が ${bgs.length} 枚`);
  for (const f of bgs) assert.ok(existsSync(path('../' + f)), f);
  assert.match(src, /'js\/dialog\/dialog-bg\.js'/);
});

test('台本の bg: 書いた台本・書かない台本が通る。知らない名前はまちがい', () => {
  const plain = { cast, lines: [{ who: 'NEJI', text: 'a' }] };
  assert.deepEqual(checkScript(plain, MINI), []);
  const ok = { bg: 'hideout', cast, lines: [{ who: 'NEJI', bg: 'ruins_town', text: 'a' }, { bg: 'night_camp' }, { who: 'GIRL', bg: null, text: 'b' }, { enter: 'GIRL', bg: 'wasteland' }] };
  // 4 行目の enter GIRL は、もう出ているのでまちがい。bg の誤りではないことだけ見る
  assert.deepEqual(checkScript({ ...ok, lines: ok.lines.slice(0, 3) }, MINI), []);
  const errs = checkScript({ bg: 'moon', cast, lines: [{ who: 'NEJI', bg: 'Hideout', text: 'a' }, { bg: 'sea' }, { bg: 3 }, { bg: undefined }, {}] }, MINI).join('\n');
  assert.match(errs, /台本の bg: 知らない背景「moon」/);
  assert.match(errs, /1行目: 知らない背景「Hideout」/);
  assert.match(errs, /2行目: 知らない背景「sea」/);
  assert.match(errs, /3行目: 知らない背景「3」/);
  assert.match(errs, /4行目: 知らない背景/);
  assert.match(errs, /5行目: who・enter・exit のどれもありません/);
  assert.throws(() => startDialog({ cast, lines: [{ bg: 'sea' }, { who: 'NEJI', text: 'a' }] }, MINI), /台本の誤り.*知らない背景/);
});

test('背景が替わる: 始まりの bg・行ごとの bg・bg だけの行は止まらず・null で背景なし', () => {
  const sc = { bg: 'hideout', cast, lines: [
    { who: 'NEJI', text: 'a' },
    { who: 'GIRL', bg: 'ruins_town', text: 'b' },
    { bg: 'night_camp' }, { bg: 'night_camp' },
    { who: 'NEJI', text: 'c' },
    { who: 'GIRL', bg: 'night_camp', text: 'd' },
    { who: 'NEJI', bg: null, text: 'e' },
    { bg: 'alien_nest' }] };
  let st = startDialog(sc, MINI);
  assert.equal(st.bg, 'hideout');
  st = nextLine(st);
  assert.deepEqual([st.line.text, st.bg, st.events], ['a', 'hideout', []]);
  const prev = st;
  st = nextLine(st);
  assert.deepEqual([st.line.text, st.bg, st.events], ['b', 'ruins_town', [{ type: 'bg', bg: 'ruins_town' }]]);
  assert.equal(prev.bg, 'hideout', '前の状態は変えない');
  st = nextLine(st);
  assert.equal(st.i, 4, 'bg だけの行は止まらずに次のセリフまで');
  assert.deepEqual([st.line.text, st.bg, st.events], ['c', 'night_camp', [{ type: 'bg', bg: 'night_camp' }]]);
  st = nextLine(st);
  assert.deepEqual([st.line.text, st.events], ['d', []], '同じ背景なら出来事なし');
  st = nextLine(st);
  assert.deepEqual([st.line.text, st.bg, st.events], ['e', null, [{ type: 'bg', bg: null }]]);
  st = nextLine(st);
  assert.equal(st.done, true);
  assert.deepEqual([st.bg, st.events], ['alien_nest', [{ type: 'bg', bg: 'alien_nest' }]], '終わりの bg だけの行も流れる');
  assert.equal(skipToEnd(startDialog(sc, MINI)).bg, 'alien_nest');
  assert.equal(startDialog({ cast, lines: [{ who: 'NEJI', text: 'a' }] }, MINI).bg, null, 'bg を書かなければ背景なし');
});

test('背景: 先に読む名前（出てくる順・重ねない・null は入れない）と、次に出る背景', () => {
  const sc = { bg: 'hideout', cast, lines: [{ who: 'NEJI', bg: 'wasteland', text: 'a' }, { bg: null }, { who: 'GIRL', bg: 'hideout', text: 'b' }, { bg: 'night_camp' }, { who: 'NEJI', text: 'c' }] };
  assert.deepEqual(bgsUsed(sc), ['hideout', 'wasteland', 'night_camp']);
  assert.deepEqual(bgsUsed({ lines: [] }), []);
  let st = startDialog(sc, MINI);
  assert.equal(upcomingBg(st), 'wasteland');
  st = nextLine(st);
  assert.equal(upcomingBg(st), 'hideout', 'null はとばして次の名前');
  st = nextLine(st);
  assert.equal(upcomingBg(st), 'night_camp');
  st = nextLine(st);
  assert.equal(upcomingBg(st), null);
});

test('お試し（demo.json）: 13 枚の背景が全部出る・通る・背景なしの台本は今までどおり', () => {
  assert.deepEqual(checkScript(DEMO, P), []);
  assert.deepEqual([...bgsUsed(DEMO)].sort(), [...BG_NAMES].sort(), '13 枚全部が見られる');
  const seen = [];
  let st = startDialog(DEMO, P);
  seen.push(st.bg);
  while (!st.done) { st = nextLine(st); for (const e of st.events) if (e.type === 'bg') seen.push(e.bg); }
  for (const n of BG_NAMES) assert.ok(seen.includes(n), n);
  assert.equal(seen.at(-1), null, '最後は背景なしにもどる');
});
