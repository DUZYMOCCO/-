import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkScript, startDialog, nextLine, skipToEnd, shownCount, typeDuration, tapAction, facesUsed, chars, TYPE_CPS } from '../js/dialog/dialog-script.js?v=3';
import { portraitRect, eyesRect, boxRect, eyeColor, DIALOG_LAYOUT } from '../js/dialog/portrait-layout.js?v=1';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const json = rel => JSON.parse(readFileSync(path(rel), 'utf8'));
const PJ = json('../assets/portraits/portraits.json');
const P = PJ.chars;
const DEMO = json('../assets/dialog/demo.json');

// テスト用の小さな立ち絵の一覧（本物の portraits.json と同じ形）
const MINI = {
  NEJI: { name: 'ネジ', side: 'left', faces: { neutral: {}, worried: {}, happy: {} } },
  BOY: { name: '少年', side: 'left', speaks: false, faces: { neutral: {}, smile: {} } },
  GIRL: { name: '少女', side: 'right', faces: { neutral: {}, smile: {} } },
  WOLF: { name: '獣人（仮）', side: 'right', faces: { neutral: {}, smile: {} } },
};
const all = st => { const out = []; while (!st.done) { st = nextLine(st); out.push(st); } return out; };

test('会話: 進める・話し手・最後で終わる', () => {
  const sc = { cast: { NEJI: 'neutral', GIRL: 'neutral' }, lines: [
    { who: 'NEJI', text: 'あ（仮）' }, { who: 'GIRL', face: 'smile', text: 'い（仮）' }, { who: 'NEJI', text: 'う（仮）' }] };
  let st = startDialog(sc, MINI);
  assert.equal(st.line, null); assert.equal(st.done, false);
  st = nextLine(st);
  assert.deepEqual([st.speaker, st.line.name, st.line.text], ['left', 'ネジ', 'あ（仮）']);
  assert.deepEqual(st.stage, { left: { id: 'NEJI', face: 'neutral' }, right: { id: 'GIRL', face: 'neutral' } });
  st = nextLine(st);
  assert.deepEqual([st.speaker, st.line.who, st.stage.right.face], ['right', 'GIRL', 'smile']);
  assert.deepEqual(st.events, [{ type: 'face', side: 'right', id: 'GIRL', face: 'smile' }]);
  const prev = st;
  st = nextLine(st);
  assert.equal(st.speaker, 'left');
  assert.equal(prev.speaker, 'right', '前の状態は変えない');
  st = nextLine(st);
  assert.equal(st.done, true); assert.equal(st.line, null); assert.equal(st.speaker, null);
  assert.equal(nextLine(st), st, '終わったらそのまま');
});

test('会話: 表情が変わる・同じ表情なら知らせない・話さずに表情だけ替える行はとばす', () => {
  const sc = { cast: { NEJI: 'neutral', BOY: undefined }, lines: [] };
  // 左に2人は置けない → 誤り
  assert.match(checkScript({ ...sc, lines: [{ who: 'NEJI', text: 'x' }] }, MINI).join(), /どちらも左/);
  const sc2 = { cast: { BOY: 'neutral', GIRL: 'neutral' }, lines: [
    { who: 'BOY', face: 'smile' }, { who: 'GIRL', face: 'neutral', text: 'へえ（仮）' }, { who: 'BOY', text: '……' }] };
  let st = nextLine(startDialog(sc2, MINI));
  assert.equal(st.i, 1, '表情だけの行は止まらずに次のセリフまで進む');
  assert.equal(st.stage.left.face, 'smile');
  assert.deepEqual(st.events, [{ type: 'face', side: 'left', id: 'BOY', face: 'smile' }], 'GIRL は同じ表情なので出来事なし');
  st = nextLine(st);
  assert.equal(st.line.name, '', '話さない人（少年）は名札なし');
  assert.equal(st.line.text, '……');
});

test('会話: 登場と退場（同じ側の人は入れ替わる）', () => {
  const sc = { cast: { NEJI: 'neutral', GIRL: 'neutral' }, lines: [
    { who: 'GIRL', text: 'a' }, { enter: 'WOLF', face: 'smile' }, { who: 'WOLF', text: 'b' }, { exit: 'NEJI' }, { who: 'WOLF', text: 'c' }] };
  let st = nextLine(startDialog(sc, MINI));
  st = nextLine(st);
  assert.deepEqual(st.events, [{ type: 'exit', side: 'right', id: 'GIRL' }, { type: 'enter', side: 'right', id: 'WOLF', face: 'smile' }]);
  assert.deepEqual(st.stage.right, { id: 'WOLF', face: 'smile' });
  st = nextLine(st);
  assert.deepEqual(st.events, [{ type: 'exit', side: 'left', id: 'NEJI' }]);
  assert.equal(st.stage.left, null);
});

test('会話: 台本の誤りを見つける（いない人・ない表情・出ていない人・形）', () => {
  const errs = checkScript({ cast: { NEJI: 'neutral', GIRL: 'cry' }, lines: [
    { who: 'TARO', text: 'x' }, { who: 'NEJI', face: 'angry', text: 'x' }, { who: 'WOLF', text: 'x' }, { exit: 'BOY' },
    { enter: 'GIRL' }, { who: 'NEJI' }, { foo: 1 }] }, MINI);
  const s = errs.join('\n');
  assert.match(s, /cast: GIRL に「cry」の表情はありません/);
  assert.match(s, /いない人: TARO/);
  assert.match(s, /2行目: NEJI に「angry」の表情はありません/);
  assert.match(s, /3行目: WOLF は出ていないので話せません/);
  assert.match(s, /4行目: BOY は出ていないので下がれません/);
  assert.match(s, /5行目: GIRL はもう出ています/);
  assert.match(s, /6行目: text も face もありません/);
  assert.match(s, /7行目: who・enter・exit のどれもありません/);
  assert.deepEqual(checkScript({ lines: [] }, MINI), ['lines（セリフの並び）がありません']);
  assert.throws(() => startDialog({ lines: [{ who: 'TARO', text: 'x' }] }, MINI), /台本の誤り/);
});

test('会話: スキップは最後まで進める', () => {
  const st = skipToEnd(startDialog(DEMO, P));
  assert.equal(st.done, true);
});

test('文字送り: 1文字ずつ・句読点で少し待つ・タップで全部 → 次へ', () => {
  const t = 'あいう。えお';
  assert.equal(shownCount(t, 0), 0);
  assert.equal(shownCount(t, 1000 / TYPE_CPS * 2 + 1), 2);
  const afterDot = shownCount(t, 1000 / TYPE_CPS * 5);
  assert.equal(afterDot, 4, '「。」のあとは待つので、5文字分の時間ではまだ4文字');
  assert.equal(shownCount(t, typeDuration(t)), chars(t).length);
  assert.equal(shownCount(t, 1e9), 6, '出しすぎない');
  assert.equal(chars('🤖あ').length, 2, '2つで1文字の絵文字も1文字');
  const st = nextLine(startDialog({ cast: { NEJI: 'neutral' }, lines: [{ who: 'NEJI', text: t }] }, MINI));
  assert.equal(tapAction(st, 3), 'reveal');
  assert.equal(tapAction(st, 6), 'next');
  assert.equal(tapAction(nextLine(st), 0), 'end');
});

test('先に読む絵の一覧: 台本に出てくる人と表情（重ねない）', () => {
  const sc = { cast: { NEJI: 'neutral' }, lines: [{ who: 'NEJI', face: 'happy', text: 'a' }, { enter: 'GIRL' }, { who: 'NEJI', face: 'happy', text: 'b' }] };
  assert.deepEqual(facesUsed(sc), [{ id: 'NEJI', face: 'neutral' }, { id: 'NEJI', face: 'happy' }, { id: 'GIRL', face: 'neutral' }]);
});

test('お試しの台本: 誤りがない・決まり（4-4）を全部見せる', () => {
  assert.deepEqual(checkScript(DEMO, P), []);
  const states = all(startDialog(DEMO, P));
  const used = facesUsed(DEMO);
  for (const id of ['NEJI', 'BOY', 'GIRL', 'WOLF', 'PONCO02']) {
    assert.ok(used.filter(u => u.id === id).length >= 3, `${id} の表情が少ない（3種類より少ない）`);
  }
  const lines = states.filter(s => s.line);
  assert.ok(lines.some((s, i) => i > 0 && s.speaker !== lines[i - 1].speaker), '左右の話し手が入れ替わる');
  const evs = states.flatMap(s => s.events);
  assert.ok(evs.some(e => e.type === 'exit' && e.id === 'GIRL') && evs.some(e => e.type === 'enter' && e.id === 'WOLF' && e.side === 'right'), '右の少女が下がって獣人が出る');
  assert.ok(states.some(s => s.stage.right?.id === 'PONCO02' && s.stage.right.face === 'off' && s.line), 'ロボの off（目が消える）を見せる');
  for (const s of lines) {
    if (s.line.who === 'BOY') assert.equal(s.line.text, '……', '少年は話さない');
    else assert.match(s.line.text, /（仮）$/, `セリフは仮: ${s.line.text}`);
  }
  assert.ok(lines.some(s => chars(s.line.text).length >= 45), '長いセリフ（2〜3行）がある');
});

test('portraits.json: 決まった人と表情がそろい、絵のファイルがある', () => {
  const want = {
    NEJI: ['neutral', 'happy', 'worried', 'surprised', 'alert', 'sad', 'damaged', 'off'],
    BOY: ['neutral', 'smile', 'surprised', 'worried', 'serious', 'pain', 'hurt'],
    GIRL: ['neutral', 'smile', 'surprised', 'worried', 'angry', 'sad', 'pain', 'hurt', 'smug'],
    WOLF: ['neutral', 'smile', 'surprised', 'serious', 'angry', 'sad', 'pain', 'hurt'],
    PONCO02: ['neutral', 'alert', 'damaged', 'off'],
  };
  for (const [id, faces] of Object.entries(want)) {
    assert.deepEqual(Object.keys(P[id].faces).sort(), [...faces].sort(), id);
    for (const [k, f] of Object.entries(P[id].faces)) {
      assert.ok(existsSync(path(`../assets/portraits/${f.src}`)), f.src);
      if (P[id].robot && k !== 'off') assert.ok(f.eyes && existsSync(path(`../assets/portraits/${f.eyes}`)), `${id} ${k} の目の光`);
      if (k === 'off') assert.equal(f.eyes, undefined, 'off は目の光がない');
    }
  }
  assert.deepEqual(['NEJI', 'BOY'].map(id => P[id].side), ['left', 'left']);
  assert.deepEqual(['GIRL', 'WOLF', 'PONCO02'].map(id => P[id].side), ['right', 'right', 'right']);
  assert.equal(P.GIRL.name, 'ミント'); assert.equal(P.WOLF.name, 'ロウ'); // v1.0.0 の決定（id は GIRL・WOLF のまま） assert.equal(P.BOY.speaks, false);
});

const PHONE = { w: 390, h: 844 }, WIDE = { w: 1280, h: 800 };
const withH = p => ({ ...p, canvasH: PJ.canvas[1] });

test('立ち絵の並べ方: 2人の目の高さがそろう・左右に分かれる・高さは画面の約48%', () => {
  for (const view of [PHONE, WIDE]) {
    const rs = Object.entries(P).map(([id, p]) => [id, portraitRect(withH(p), p.side, view)]);
    // 目の高さは「だいたい」そろう: 人間どうしは立ち絵の高さの 6% まで（少女は少し背が低い）、ロボ（背の低いデフォルメ）は 12% まで低くてよい
    const H = view.h * DIALOG_LAYOUT.portraitH, base = view.h * DIALOG_LAYOUT.eyeLine;
    for (const [id, r] of rs) {
      const d = r.eyeY - base;
      assert.ok(d >= 0 && d <= H * (P[id].robot ? 0.12 : 0.06), `${id}: 目の高さがそろわない（${d.toFixed(1)}px）`);
    }
    for (const [id, r] of rs) {
      const p = P[id], faceX = r.x + (p.face_x - p.crop[0]) * r.k;
      assert.ok(faceX > 0 && faceX < view.w, `${id}: 顔が画面の中`);
      if (p.side === 'left') assert.ok(faceX < view.w / 2, `${id} は左`); else assert.ok(faceX > view.w / 2, `${id} は右`);
      // 計算した目の位置が eyeY と同じ
      assert.ok(Math.abs(r.y + (p.eye[1] - p.crop[1]) * r.k - r.eyeY) < 1e-6);
    }
    assert.ok(Math.abs(H - view.h * 0.48) < 1e-9);
  }
  // 390×844 で、scale 1 の立ち絵（キャンバス全体）は約 400px
  assert.ok(Math.abs(portraitRect({ ...withH(P.NEJI), scale: 1, crop: [0, 0, 1024, 1536] }, 'left', PHONE).h - 405) < 1);
});

test('立ち絵の並べ方: 下の端は文字の枠の後ろ。胸像の切れ目が枠より上なら、下をぼかして消す', () => {
  for (const view of [PHONE, WIDE]) {
    const box = boxRect(view);
    for (const [id, p] of Object.entries(P)) {
      const r = portraitRect(withH(p), p.side, view);
      const bottom = r.y + r.fadeTo;
      if (p.cut != null && r.fade === 0) assert.ok(bottom >= box.y, `${id}: 切れ目が見える`);
      if (r.fade > 0) {
        assert.ok(r.fade >= view.h * DIALOG_LAYOUT.portraitH * DIALOG_LAYOUT.fadeLen - 1e-6 && r.fade <= r.fadeTo, `${id}: ぼかしの長さ`);
      }
      if (p.cut == null) assert.ok(r.y + r.h > box.y, `${id}: 足もとが枠の後ろに隠れない`);
    }
  }
  // 切れ目が枠よりずっと下なら、ぼかさない
  const deep = portraitRect({ ...withH(P.BOY), scale: 2 }, 'left', PHONE);
  assert.equal(deep.fade, 0);
});

test('文字の枠・目の光の置き場所・色', () => {
  const b = boxRect(PHONE);
  assert.deepEqual([b.x, b.w, b.y + b.h], [0, 390, 844]);
  assert.ok(Math.abs(b.h - 844 * 0.22) < 1e-9, '枠は画面の高さの約22%');
  const wide = boxRect(WIDE);
  assert.equal(wide.w, DIALOG_LAYOUT.boxMaxW); assert.equal(wide.x, (1280 - wide.w) / 2);
  const p = P.NEJI, f = p.faces.neutral, r = portraitRect(withH(p), 'left', PHONE);
  const e = eyesRect(p, f.eyes_rect, r.k);
  assert.ok(e.x > 0 && e.y > 0 && e.x + e.w < r.w && e.y + e.h < r.h, '目の光は体の絵の中');
  // 目の光の四角の中心は、目の中心（eye）のすぐ近く
  assert.ok(Math.abs(e.y + e.h / 2 - (p.eye[1] - p.crop[1]) * r.k) < 10);
  assert.equal(eyeColor(p, 'neutral'), p.eye_color);
  assert.equal(eyeColor(p, 'alert'), p.eye_color_by_face.alert);
  assert.notEqual(P.NEJI.eye_color, P.PONCO02.eye_color, 'ロボごとに色がちがう');
});
