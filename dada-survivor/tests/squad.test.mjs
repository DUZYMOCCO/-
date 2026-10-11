import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAGES, SQUAD, allyDamage, squadSlot, canWhistle, healAmount } from '../js/rules.js';
import { art, ART_NAMES } from '../js/art.js';

const svgOf = url => decodeURIComponent(url.replace(/^url\("data:image\/svg\+xml(;charset=utf-8)?,/, '').replace(/"\)$/, ''));
const KANA = /^[\u3040-\u309f\u30a0-\u30ff\u3000-\u303f\uff01-\uff5e！？、。・ー\s0-9A-Za-z{}$`.()]+$/;

test('stage 1 researcher waits inside the container (one per run, 650〜900 away)', () => {
  const rs = STAGES[0].researcher;
  assert.equal(rs.container, true);
  assert.equal(rs.gift, 'supermissile');
  assert.ok(SQUAD.dist0 >= 600 && SQUAD.dist1 <= 1000 && SQUAD.dist0 < SQUAD.dist1);
  for (const s of STAGES.slice(1)) assert.equal(s.researcher, undefined, `stage ${s.id}`);
});

test('squad: 3 soldiers flank / behind the heading, medic further behind', () => {
  assert.equal(SQUAD.soldiers, 3);
  for (const h of [0, Math.PI / 2, 2]) {
    const fx = Math.cos(h), fy = Math.sin(h);
    for (let i = 0; i <= SQUAD.soldiers; i++) {
      const o = squadSlot(i, h), d = Math.hypot(o.x, o.y);
      assert.ok(o.x * fx + o.y * fy < 0, `slot ${i} は うしろがわ`);
      assert.ok(Math.abs(d - (i === 3 ? SQUAD.medicDist : SQUAD.slotDist)) < 1e-9);
    }
    const ps = [0, 1, 2].map(i => squadSlot(i, h));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y) > 30, 'かさならない');
  }
});

test('ally damage is moderate and grows slowly; whistle heals 40% over 2s with a cooldown', () => {
  assert.ok(allyDamage(0) > 0 && allyDamage(0) < 10);
  assert.ok(allyDamage(300) > allyDamage(0) && allyDamage(300) < 20);
  assert.equal(allyDamage(0, 1.5), allyDamage(0) * 1.5);
  let hp = 0; for (let i = 0; i < 120; i++) hp += healAmount(100, SQUAD.healTime / 120);
  assert.ok(Math.abs(hp - 40) < 1e-6);
  assert.ok(SQUAD.whistleCd >= 15);
  assert.equal(canWhistle(null, 0), false);
  assert.equal(canWhistle({}, 3), false);
  assert.equal(canWhistle({}, 0), true);
});

test('ally, medic, container and whistle art: friendly, no villain emblem, no real red cross', () => {
  for (const n of ['ally', 'medic', 'container', 'containerOpen', 'whistle', 'healPlus']) assert.ok(ART_NAMES.includes(n), n);
  for (const n of ['ally', 'medic']) {
    const s = svgOf(art(n));
    assert.ok(!s.includes('data-emblem'), `${n} は みかた`);
    assert.ok(s.includes('#dc2626') && s.includes('#f5f5f4'), `${n} にも にっぽんの ワッペン`);
  }
  assert.ok(svgOf(art('ally')).includes('#60a5fa'), 'なかまは あおい ライン');
  const medic = svgOf(art('medic')), plus = svgOf(art('healPlus'));
  assert.ok(medic.includes('#22c55e') && plus.includes('#22c55e'), 'みどりの じゅうじ');
  assert.ok(!/fill="#(ff0000|e11d48|ef4444)"[^>]*d="M-2 -5.5/.test(medic), 'あかじゅうじ に しない');
  assert.ok(!medic.includes('M6 59 L56 43'), 'ちりょうたいは じゅうを もたない');
});

test('HUD whistle button and banners are kana only; F key and pointerdown hooked up', () => {
  const src = readFileSync(new URL('../js/index.js', import.meta.url), 'utf8');
  assert.ok(src.includes('class="ds-whistle'));
  assert.ok(/k === 'f'/.test(src), 'PC は F キー');
  assert.ok(src.includes("this.el.whistle.addEventListener('pointerdown'"));
  for (const m of src.matchAll(/showBanner\(['`]([^'`]*)['`]/g)) {
    const t = m[1];
    if (!/コンテナ|なかま|ちりょうたい/.test(t)) continue;
    assert.ok(KANA.test(t) && !/[\u4e00-\u9faf]/.test(t), t);
  }
  assert.ok(!/[\u4e00-\u9faf]/.test(src.match(/<button class="ds-whistle[^\n]*/)[0]), 'ボタンも かな');
});
