// 長い倒れる＋起きる絵（少女の斜めの絵 GIRL_OBL）と、斜めの絵の置き換えの表（画面を使わない）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { CHAR_FRAMES, CHAR_FRAMES_OBLIQUE, DOWN_LONG, isLongDown, downFrame, durOf, finished, newAnim, stepAnim, heightOf } from '../js/render/char-anim.js?v=8';
import { REACT, hitReact, reactStep } from '../js/fx/react.js?v=2';
import { TICK } from '../js/sim/sim.js?v=30';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const load = d => JSON.parse(readFileSync(join(ROOT, 'assets/chars', d, 'frames.json'), 'utf8'));
const OBL = load('GIRL_OBL'), BOY = load('BOY'), GIRL = load('GIRL'), WOLF = load('WOLF');
const DN = REACT.down, DOWN_SEC = DN.fall + DN.lie + DN.getup;
const girl = (o = {}) => ({ kind: 'girl', human: true, x: 100, y: 100, facing: 1, moving: false, order: null, captured: null, ...o });
// 重い一撃で倒す（人間は強い一撃で倒れる）
const knock = u => { hitReact(u, { w: 1, dir: 0, human: true, kind: 'explosion' }); reactStep(u, TICK); return u; };

test('置き換えの表: 少年・少女・獣人とも斜め（獣人は仮の版）', () => {
  assert.deepEqual({ ...CHAR_FRAMES_OBLIQUE }, { boy: 'BOY_OBL', girl: 'GIRL_OBL', wolf: 'WOLF_OBL' });
  assert.deepEqual({ ...CHAR_FRAMES }, { boy: 'BOY', girl: 'GIRL', wolf: 'WOLF' });
});

test('GIRL_OBL: 8つの動き、knockdown・getup・wave は枠と足もとが別。動きごとの anchor が同じ高さの床を指す', () => {
  assert.equal(Object.keys(OBL.motions).length, 8);
  for (const s of ['s30', 'm60']) {
    const f = OBL.motions.idle.sizes[s];
    for (const [name, m] of Object.entries(OBL.motions)) {
      const z = m.sizes[s];
      assert.ok(z.anchor[0] > 0 && z.anchor[1] <= z.frame_h, `${name} ${s}`);
      assert.equal(z.standing_height, f.standing_height, '同じ縮尺');
      assert.equal(z.anchor[0], z.frame_w / 2, `${name} ${s} 足もとが横の中央`);
    }
  }
  assert.equal(OBL.motions.wave.sizes.s30.frame_h, 39); assert.equal(OBL.motions.knockdown.sizes.s30.frame_w, 60);
  assert.ok(heightOf(OBL) === 22, '少女の背の高さは 22');
});

test('長い絵の判定: GIRL_OBL だけ長い。横から見た短い絵は今までどおり', () => {
  assert.equal(isLongDown(OBL.motions), true);
  for (const d of [BOY, GIRL, WOLF]) assert.equal(isLongDown(d.motions), false, d.character);
  assert.ok(durOf(OBL.motions.knockdown) + durOf(OBL.motions.getup) > 8);
});

test('長い絵の倒れる: ほぼそのままの速さ（1.5倍まで）で、反応の終わりの前に倒れきる', () => {
  const M = OBL.motions, a = downFrame(M, 0), z = downFrame(M, 0.5);
  assert.equal(a.motion, 'knockdown'); assert.equal(a.frame, M.knockdown.sequence[0]);
  assert.ok(z.rate <= DOWN_LONG.kdSpeed + 1e-9 && z.rate >= 1, '早送りは 1.5 倍まで');
  let T = 0; while (downFrame(M, T).motion === 'knockdown') T += 0.01;
  assert.ok(T < DOWN_SEC, '反応の終わりまでに倒れきって起き始める');
  assert.ok(downFrame(M, T - 0.02).frame >= M.knockdown.sequence.length - 3, '倒れる絵の最後ちかくまで出す');
});

test('長い絵の起き上がり: 速さは2倍まで、最初の寝ているコマは飛ばす。反応が終わるころも起き上がりの途中', () => {
  const M = OBL.motions, e = downFrame(M, DOWN_SEC - 1e-6);
  assert.equal(e.motion, 'getup'); assert.ok(e.rate <= 2 + 1e-9);
  assert.ok(e.frame < M.getup.sequence.length - 1, '反応が終わった時点ではまだ立ち終わっていない');
  assert.ok(e.frame >= DOWN_LONG.gdSkip);
  // 全体の早送りは、絵の長さ 8.7 秒に対して 1.5〜2 倍ほど（4〜5 倍ではない）
  const total = durOf(M.knockdown) + (durOf(M.getup) - DOWN_LONG.gdSkip / M.getup.fps) / 2;
  assert.ok(total > DOWN_SEC * 2, '反応の中に押し込んではいない');
});

test('止まっていれば、反応が終わっても起き上がりを最後まで流して idle', () => {
  const u = knock(girl()), a = newAnim(), seen = [], motions = [];
  assert.ok(u._hr.out.down, '倒れた');
  let sec = 0, st;
  for (; sec < 8; sec += TICK) { reactStep(u, TICK); st = stepAnim(OBL, a, u, TICK); seen.push(st.frame); motions.push(st.motion); if (sec > 2 && st.motion === 'idle') break; }
  assert.ok(sec > DOWN_SEC, '反応より長く起き上がりを流す');
  assert.ok(sec < 6.5, '絵の 6.2 秒よりは速い');
  assert.ok(motions.includes('knockdown') && motions.includes('getup'));
  assert.ok(seen.includes(OBL.motions.getup.sequence.at(-1)), '最後の立つコマまで出す');
  assert.equal(st.motion, 'idle');
  assert.ok(motions.lastIndexOf('knockdown') < motions.indexOf('getup'), '倒れるに戻らない');
});

test('倒れたあと、反応が終わって動き出したら、起き上がりを打ち切って run', () => {
  const u = knock(girl()), a = newAnim();
  let sec = 0, st;
  for (; sec < DOWN_SEC + 0.1; sec += TICK) { reactStep(u, TICK); st = stepAnim(OBL, a, u, TICK); }
  assert.equal(st.motion, 'getup', 'まだ起き上がりの途中');
  u.moving = true; u.x += 1;
  assert.equal(stepAnim(OBL, a, u, TICK).motion, 'run');
});

test('短い絵（少年・少女・獣人の横から見た絵）の倒れる＋起きるは、今までどおり反応の時間に収まる', () => {
  for (const d of [BOY, GIRL, WOLF]) {
    const M = d.motions, gd = durOf(M.getup), g = Math.min(gd, DN.lie + DN.getup), g0 = DOWN_SEC - g;
    assert.equal(downFrame(M, g0 - 1e-6).motion, 'knockdown', d.character);
    const x = downFrame(M, g0 + 1e-6); assert.equal(x.motion, 'getup');
    assert.equal(downFrame(M, DOWN_SEC - 1e-6).frame, M.getup.sequence.at(-1), `${d.character} 反応の終わりに立ち終わる`);
    assert.equal(finished(M.getup, downFrame(M, DOWN_SEC - 1e-6).t + 1e-3), true);
  }
});

test('WOLF_OBL（獣人の斜めの絵・gfx3 清書）: 少女と同じ 8 つの動き・コマ数・fps。背は少女の約 1.35 倍', () => {
  const W = load('WOLF_OBL');
  assert.equal(W.character, 'WOLF');
  assert.deepEqual(Object.keys(W.motions).sort(), Object.keys(OBL.motions).sort());
  for (const [name, m] of Object.entries(W.motions)) {
    assert.equal(m.frames, OBL.motions[name].frames, name); assert.equal(m.fps, OBL.motions[name].fps, name);
    for (const s of ['s30', 'm60']) {
      const z = m.sizes[s];
      assert.ok(z.anchor[0] > 0 && z.anchor[1] <= z.frame_h, `${name} ${s}`);
      assert.equal(z.standing_height, W.motions.idle.sizes[s].standing_height, '同じ縮尺');
    }
  }
  assert.equal(heightOf(W), 30);
  const r = heightOf(W) / heightOf(OBL);
  assert.ok(r > 1.3 && r < 1.4, `獣人 / 少女 = ${r}`);
  assert.equal(isLongDown(W.motions), true, '倒れる＋起きるは少女と同じ長さ');
});
