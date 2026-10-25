// 立ち絵の全員分（2段目・3段目まで）がそろっているか。?dialogdemo=all の台本が全員・全表情を通るか。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkScript, startDialog, nextLine } from '../js/dialog/dialog-script.js?v=3';
import { buildAllScript } from '../js/dialog/dialog-all.js?v=2';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const json = rel => JSON.parse(readFileSync(path(rel), 'utf8'));
const PJ = json('../assets/portraits/portraits.json');
const P = PJ.chars;
const CONF = json('../tools/portraits-config.json');

test('portraits.json: 設定の全員が入っていて、全員に neutral がある・絵のファイルが全部ある', () => {
  assert.deepEqual(Object.keys(P), Object.keys(CONF.chars), '設定（tools/portraits-config.json）と同じ人・同じ順');
  assert.ok(Object.keys(P).length >= 37, `全員（${Object.keys(P).length}人）`);
  const [W, H] = PJ.canvas;
  for (const [id, p] of Object.entries(P)) {
    assert.ok(p.faces.neutral, `${id}: neutral がない`);
    assert.equal(p.name, CONF.chars[id].name, `${id}: 名札`);
    assert.ok(p.name && typeof p.name === 'string', `${id}: 名札が空`);
    assert.ok(['left', 'right'].includes(p.side), `${id}: side`);
    const [x0, y0, x1, y1] = p.crop;
    assert.ok(x0 >= 0 && y0 >= 0 && x1 <= W && y1 <= H && x0 < x1 && y0 < y1, `${id}: 切り抜きがキャンバスの中`);
    assert.ok(p.scale > 0 && Array.isArray(p.nudge), `${id}: 大きさ・ずらし`);
    for (const [k, f] of Object.entries(p.faces)) {
      assert.equal(f.src, `${id}/${id}__${k}.webp`);
      assert.ok(existsSync(path(`../assets/portraits/${f.src}`)), `ない: ${f.src}`);
      if (p.robot && k !== 'off') {
        assert.ok(f.eyes && existsSync(path(`../assets/portraits/${f.eyes}`)), `${id} ${k} の目の光がない`);
        const [ex0, ey0, ex1, ey1] = f.eyes_rect;
        assert.ok(ex0 >= 0 && ey0 >= 0 && ex1 <= W && ey1 <= H && ex0 < ex1 && ey0 < ey1, `${id} ${k}: 目の光の四角`);
      }
      if (k === 'off') assert.equal(f.eyes, undefined, `${id}: off は目の光がない`);
      if (!p.robot) assert.equal(f.eyes, undefined, `${id}: 人間に目の光のレイヤーはない`);
    }
    if (p.robot) {
      assert.match(p.eye_color, /^#[0-9a-f]{6}$/i, `${id}: 目の色`);
      assert.match(p.eye_color_by_face?.alert || '', /^#[0-9a-f]{6}$/i, `${id}: 警戒の目の色`);
      assert.equal(p.eye_fx_by_face?.damaged, 'flicker', `${id}: 損傷はちらつく`);
      for (const k of ['neutral', 'alert', 'damaged', 'off']) assert.ok(p.faces[k], `${id}: ロボの4つの表情（${k}）`);
    }
  }
  // 左に立つのはネジと少年だけ（ロボはみな左向きに描いてあるので右）
  assert.deepEqual(Object.keys(P).filter(id => P[id].side === 'left'), ['NEJI', 'BOY']);
});

test('portraits.json: 絵のファイルがほかのキャラと混ざらない・同じファイルを2回使わない', () => {
  const seen = new Set();
  for (const [id, p] of Object.entries(P)) for (const f of Object.values(p.faces)) for (const s of [f.src, f.eyes].filter(Boolean)) {
    assert.ok(s.startsWith(`${id}/`), s);
    assert.ok(!seen.has(s), `2回: ${s}`); seen.add(s);
  }
});

test('?dialogdemo=all の台本: 全員・全表情を1回ずつ通り、台本として正しい', () => {
  const sc = buildAllScript(P);
  assert.deepEqual(checkScript(sc, P), []);
  let st = startDialog(sc, P);
  const got = [];
  for (let i = 0; i < 2000; i++) {
    st = nextLine(st);
    if (st.done) break;
    if (st.line) got.push(`${st.line.who}:${st.stage[st.speaker].face}`);
  }
  assert.ok(st.done, '最後まで進む');
  const want = Object.entries(P).flatMap(([id, p]) => Object.keys(p.faces).map(k => `${id}:${k}`));
  assert.deepEqual([...got].sort(), [...want].sort(), '全員・全表情を1回ずつ');
  assert.equal(got.length, want.length);
  // from: その人から始める
  const fromSc = buildAllScript(P, { from: 'GHOSTEAGLE' });
  assert.deepEqual(checkScript(fromSc, P), []);
  assert.ok(fromSc.lines.some(l => l.who === 'GHOSTEAGLE') && !fromSc.lines.some(l => l.who === 'PONCO07'));
});
