import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAGES, CAMP, SQUAD } from '../js/rules.js';
import { art, ART_NAMES } from '../js/art.js';

const svgOf = url => decodeURIComponent(url.replace(/^url\("data:image\/svg\+xml(;charset=utf-8)?,/, '').replace(/"\)$/, ''));
const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');

// こどもの リクエスト：ゆきやまの スタートに かまくら。なかま 3にん・ちりょうたい・けんきゅうしゃ 2にん
test('only ゆきやま has the kamakura start camp', () => {
  for (const s of STAGES) assert.equal(!!s.camp, s.name === 'ゆきやま', s.name);
});

test('three kamakura sit around the start without covering the spawn', () => {
  const huts = [CAMP.squadHut, CAMP.medicHut, CAMP.sciHut];
  for (const h of huts) {
    const d = Math.hypot(h.x, h.y);
    assert.ok(d > Math.max(CAMP.w, CAMP.h) / 2 && d < 300, 'スタートの すぐ ちかく');
  }
  for (let i = 0; i < huts.length; i++) for (let j = i + 1; j < huts.length; j++) assert.ok(Math.hypot(huts[i].x - huts[j].x, huts[i].y - huts[j].y) > CAMP.w, 'かさならない');
  assert.equal(CAMP.researchers, 2);
});

test('camp allies join right away (3 soldiers + medic) with a kana banner', () => {
  const body = src.slice(src.indexOf('initCamp() {'), src.indexOf('/* ---------- さばくの クエスト'));
  assert.ok(body.includes('for (let i = 0; i < SQUAD.soldiers; i++) this.addAlly(false'));
  assert.ok(body.includes('this.addAlly(true'));
  assert.ok(src.includes('if (st.camp) this.initCamp();'));
  assert.equal(SQUAD.soldiers, 3);
  const msg = src.match(/showBanner\('かまくらの なかまが[^']*'/)[0];
  assert.ok(!/[\u4e00-\u9fff]/.test(msg), 'かなだけ');
});

test('kamakura art: snow dome with a warm lit entrance', () => {
  assert.ok(ART_NAMES.includes('kamakura'));
  const svg = svgOf(art('kamakura'));
  assert.ok(svg.includes('#f8fafc') && svg.includes('#fde68a'));
});
