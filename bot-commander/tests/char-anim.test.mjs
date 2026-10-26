import { fileURLToPath } from 'node:url';
// 紙芝居式キャラ（少年・少女・狼の獣人）: 状態 → モーション、向き、絵のないキャラは前の絵、キャッシュ一覧
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHAR_FRAMES, CHAR_H, LOCO_BY_DISTANCE, heightOf, SIT_AFTER, hasFrames, newAnim, stepAnim, frameAt, finished, strideOf, pickSize, durOf, downFrame, carriedFrame } from '../js/render/char-anim.js?v=8';
import { hitReact, reactStep, REACT } from '../js/fx/react.js?v=2';
import { createSim, runSim, issueOrder, KINDS, TICK, unitById } from '../js/sim/sim.js?v=27';
import { toTile } from '../js/sim/map.js?v=6';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { artSources } from '../js/render/art.js?v=15';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BOY = JSON.parse(readFileSync(join(ROOT, 'assets/chars/BOY/frames.json'), 'utf8'));
const load = dir => JSON.parse(readFileSync(join(ROOT, 'assets/chars', dir, 'frames.json'), 'utf8'));
const GIRL = load('GIRL'), WOLF = load('WOLF');
const sheets = { boy: { def: BOY }, girl: { def: GIRL }, wolf: { def: WOLF } };
const boy = (o = {}) => ({ kind: 'boy', human: true, x: 100, y: 100, facing: 1, moving: false, order: null, captured: null, ...o });
const play = (u, a, sec, ctx = {}, each) => { let st; for (let t = 0; t < sec - 1e-9; t += TICK) { if (u._hr) reactStep(u, TICK); st = stepAnim(BOY, a, u, TICK, ctx); each?.(st); } return st; };

test('少年の絵: 8モーション（起き上がりつき）がそろい、どの絵も足もとが同じ基準点', () => {
  assert.deepEqual(Object.keys(BOY.motions).sort(), ['getup', 'hurt', 'idle', 'knockdown', 'run', 'sit', 'walk', 'wave']);
  for (const [name, m] of Object.entries(BOY.motions)) for (const [s, z] of Object.entries(m.sizes)) {
    assert.ok(existsSync(join(ROOT, 'assets/chars/BOY', z.file)), `${name} ${s}`);
    assert.deepEqual(z.anchor, BOY.motions.idle.sizes[s].anchor);
  }
  // 10/23 少年の走りは 8コマ v4 + RIFE 中割りの 24コマ・30fps（1周 0.8秒）
  assert.equal(BOY.motions.run.frames, 24); assert.equal(BOY.motions.run.fps, 30); assert.equal(BOY.motions.run.cycle_distance_L, 336);
  assert.equal(BOY.motions.walk.frames, 12); assert.equal(BOY.motions.walk.fps, 8); assert.equal(BOY.motions.walk.cycle_distance_L, 260);
  assert.equal(BOY.motions.getup.frames, 7); assert.equal(BOY.motions.getup.then, 'idle');
});

test('状態 → モーション: 待機・動くときはどの命令でも走る・運ばれる・助けられて手を振る', () => {
  const a = newAnim(), u = boy();
  assert.equal(play(u, a, 0.5).motion, 'idle');
  u.moving = true; u.order = { mode: 'fight' };
  const seen = new Set();
  for (let i = 0; i < 40; i++) { u.x += 1; seen.add(stepAnim(BOY, a, u, TICK).frame); }
  assert.equal(a.motion, 'run', '戦闘移動でも走る'); assert.ok(seen.size >= 6, '走るコマが進む');
  for (const order of [null, { mode: 'move' }, { mode: 'gather' }]) { u.order = order; u.x += 1; assert.equal(stepAnim(BOY, a, u, TICK).motion, 'run', JSON.stringify(order)); }
  u.order = { mode: 'rush' }; u.x += 1;
  assert.equal(stepAnim(BOY, a, u, TICK).motion, 'run');
  u.order = { mode: 'retreat' }; u.x += 1;
  assert.equal(stepAnim(BOY, a, u, TICK).motion, 'run');
  u.moving = false; u.order = null;
  assert.equal(stepAnim(BOY, a, u, TICK, { wave: 1 }).motion, 'wave');
  assert.equal(play(u, a, 1.2).motion, 'idle', '振り終わったら待機');
  u.captured = 7;
  assert.equal(stepAnim(BOY, a, u, TICK).motion, 'hurt');
  u.captured = 'nest';
  assert.equal(stepAnim(BOY, a, u, TICK).motion, 'idle');
});

test('動いていても進んでいなければ足ぶみしない・走りは時間（frames.json の fps）でコマが進む', () => {
  const a = newAnim(), u = boy({ moving: true, order: { mode: 'fight' } });
  stepAnim(BOY, a, u, TICK);
  assert.equal(stepAnim(BOY, a, u, TICK).motion, 'idle', '止められている（壁など）');
  assert.equal(LOCO_BY_DISTANCE, false, '10/23: 足がすべってもよいので時間で送る');
  // 速さに関係なく frames.json の fps（少年は 30fps・1周 0.8秒）: 30 tick（1秒）で全コマが出る（遅すぎない・速すぎない）
  const run = BOY.motions.run, seq = run.sequence;
  for (const speed of [10, 30, 90]) {
    const b = newAnim(), v = boy({ moving: true, order: { mode: 'fight' } }), frames = [];
    stepAnim(BOY, b, v, TICK);
    for (let i = 0; i < 30; i++) { v.x += speed * TICK; frames.push(stepAnim(BOY, b, v, TICK).frame); }
    const want = frames.map((_, i) => frameAt(run, (i + 1) * TICK));
    assert.deepEqual(frames, want, `speed ${speed}`);
    assert.equal(new Set(frames).size, seq.length, '1秒で全コマ');
  }
  // 切り替え用: byDistance で、1周の距離だけ進むとちょうど sequence を1周する（足がすべらない）
  for (const order of [{ mode: 'fight' }, { mode: 'rush' }]) {
    const b = newAnim(), v = boy({ moving: true, order }), L = strideOf(BOY, 'run'), frames = [];
    stepAnim(BOY, b, v, TICK, { byDistance: true });
    for (let i = 0; i < seq.length; i++) { v.x += L / seq.length; frames.push(stepAnim(BOY, b, v, TICK, { byDistance: true }).frame); }
    assert.deepEqual(frames, [...seq.slice(1), seq[0]], order.mode);
  }
  // sim が進んでいない描画フレーム（dt 0）は前と同じ絵（走っている途中で待機がちらつかない）
  { const b = newAnim(), v = boy({ moving: true, order: { mode: 'fight' } }); stepAnim(BOY, b, v, TICK); v.x += 1;
    const st = stepAnim(BOY, b, v, TICK); assert.equal(st.motion, 'run');
    assert.deepEqual(stepAnim(BOY, b, v, 0), st); assert.deepEqual(stepAnim(BOY, b, v, 0), st); }
  // run を持たない絵だけ walk（予備）
  const noRun = { ...BOY, motions: { ...BOY.motions } }; delete noRun.motions.run;
  const c = newAnim(), w = boy({ moving: true, order: { mode: 'rush' } });
  stepAnim(noRun, c, w, TICK); w.x += 1;
  assert.equal(stepAnim(noRun, c, w, TICK).motion, 'walk');
  // 距離で送った場合の回り（参考）: 走りは 30px/秒で描いた速さの約 0.9 倍（26.8 / 30fps。時間で送るので足は少しすべる＝了承済み）
  const fpsAt = (motion, speed) => BOY.motions[motion].sequence.length * speed / strideOf(BOY, motion);
  assert.ok(Math.abs(strideOf(BOY, 'run') - 336 * CHAR_H / 300) < 1e-9);
  assert.ok(Math.abs(fpsAt('run', KINDS.boy.speed) / run.fps - 1) < 0.15, `run ${fpsAt('run', KINDS.boy.speed)}`);
});

test('被弾: 中くらいでのけぞる（最後まで流す）→ 待機。重いと倒れて、起き上がりの絵で起きる', () => {
  const a = newAnim(), u = boy();
  hitReact(u, { w: 0.45, dir: Math.PI, human: true });   // 左向きに撃たれた（弾は左へ進む）
  const motions = new Set(); let face = 0;
  const hf = [];
  const last = play(u, a, 1.5, {}, st => { motions.add(st.motion); if (st.motion === 'hurt') { face = st.flip; hf.push(st.frame); } });
  assert.ok(motions.has('hurt')); assert.equal(last.motion, 'idle');
  assert.deepEqual([...new Set(hf)], BOY.motions.hurt.sequence, '6コマを最後まで');
  assert.equal(face, 1, '撃った方（右）を向く');
  const b = newAnim(), v = boy({ facing: -1 }), seq = [];
  hitReact(v, { w: 1, dir: 0, human: true, kind: 'explosion' });   // 右へ吹き飛ぶ
  play(v, b, 5, {}, st => { if (st.motion === 'knockdown' || st.motion === 'getup') seq.push([st.motion, st.frame, st.flip]); });
  const fall = seq.filter(s => s[0] === 'knockdown').map(s => s[1]), up = seq.filter(s => s[0] === 'getup').map(s => s[1]);
  assert.deepEqual([...new Set(fall)], BOY.motions.knockdown.sequence, '倒れる（7コマ）');
  assert.deepEqual([...new Set(up)], BOY.motions.getup.sequence, '起き上がる（7コマ、逆再生ではない）');
  assert.ok(seq.findIndex(s => s[0] === 'getup') > seq.findLastIndex(s => s[0] === 'knockdown'));
  assert.ok(seq.every(s => s[2] === -1), '左（撃った方）を向いて右へ倒れる');
  assert.equal(stepAnim(BOY, b, v, TICK).motion, 'idle');
});

test('やられ: 倒れて、そのまま', () => {
  const a = newAnim(), u = boy();
  const st = play(u, a, 3, { dead: true });
  assert.equal(st.motion, 'knockdown'); assert.equal(st.frame, BOY.motions.knockdown.sequence.at(-1));
  assert.ok(finished(BOY.motions.knockdown, 3) && BOY.motions.knockdown.hold_last);
});

test('座る: 脱出口の輪の中でしばらく止まっていたら（座る動き 0-3 を1回 → 4,5,6,5 のくり返し）', () => {
  const a = newAnim(), u = boy();
  assert.equal(play(u, a, SIT_AFTER - 0.2, { atExit: true }).motion, 'idle');
  const fr = []; play(u, a, 4, { atExit: true }, st => { if (st.motion === 'sit') fr.push(st.frame); });
  assert.equal(a.motion, 'sit');
  assert.deepEqual(fr.filter((x, i) => x !== fr[i - 1]).slice(0, 12), [0, 1, 2, 3, 4, 5, 6, 5, 4, 5, 6, 5]);
  assert.equal(frameAt(BOY.motions.sit, 0), 0); assert.equal(frameAt(BOY.motions.sit, 4 / BOY.motions.sit.fps), 4);
  assert.equal(play(u, a, 0.5, {}).motion, 'idle', '輪の外では座らない');
});

test('向き: 絵は右向き。左へ動くと左右反転', () => {
  const a = newAnim();
  assert.equal(stepAnim(BOY, a, boy({ facing: 1 }), TICK).flip, 1);
  assert.equal(stepAnim(BOY, a, boy({ facing: -1 }), TICK).flip, -1);
  assert.ok(Object.values(BOY.motions).every(m => m.facing === 'right' && m.mirror_for_left));
  // 基準点はコマの左右の真ん中（反転しても足もとがずれない）
  for (const m of Object.values(BOY.motions)) for (const z of Object.values(m.sizes)) assert.equal(z.anchor[0] * 2, z.frame_w);
});

test('絵の大きさ: 画面での大きさに合わせて s30 / m60', () => {
  assert.equal(pickSize(BOY, 24), 's30'); assert.equal(pickSize(BOY, 40), 'm60'); assert.equal(pickSize(BOY, 300), 'm60');
});

test('紙芝居の絵がないキャラは前の絵のまま（少女・ロボ）', () => {
  assert.ok(hasFrames('boy', sheets));
  for (const k of ['survivor', 'ponco', 'scav', 'alien']) assert.equal(hasFrames(k, sheets), false, k);
  assert.equal(hasFrames('boy', {}), false, '読めなかったら前の絵');
  assert.equal(hasFrames('girl', { boy: sheets.boy }), false, '少女の絵だけ読めなくても少女は前の絵');
  const art = artSources();
  assert.ok(art.girl_ally && art.boy_ally, '前の絵は残してある');
  // フォルダは「種類 → フォルダ」1行で足せる
  assert.deepEqual(CHAR_FRAMES, { boy: 'BOY', girl: 'GIRL', wolf: 'WOLF' });
  for (const dir of Object.values(CHAR_FRAMES)) assert.ok(existsSync(join(ROOT, 'assets/chars', dir, 'frames.json')));
});

test('キャッシュ一覧: キャラの絵がすべて sw-assets.js に載っている', () => {
  const sandbox = { GAME_ASSETS: {} };
  new Function('self', readFileSync(join(ROOT, 'sw-assets.js'), 'utf8'))(sandbox);
  const files = sandbox.GAME_ASSETS['bot-commander'].files;
  for (const dir of Object.values(CHAR_FRAMES)) for (const f of readdirSync(join(ROOT, 'assets/chars', dir))) assert.ok(files.includes(`assets/chars/${dir}/${f}`), f);
  assert.ok(files.includes('js/render/char-anim.js'));
});

test('ミッション1: 少年が急行で走り、止まると待機（sim の速さは変えていない）', () => {
  const sim = createSim({ mission: MISSION_1 });
  const u = sim.units.find(x => x.kind === 'boy'), a = newAnim(), motions = new Set();
  assert.equal(KINDS.boy.speed, 30);
  issueOrder(sim, [u.id], [{ tx: toTile(u.x), ty: toTile(u.y) - 3 }], { mode: 'rush' });
  for (let i = 0; i < 150; i++) { runSim(sim, 1); motions.add(stepAnim(BOY, a, unitById(sim, u.id), TICK).motion); }
  assert.ok(motions.has('run'), [...motions]); assert.equal(a.motion, 'idle');
});

test('少女・狼の獣人: 8モーション（起き上がりの絵つき）、走り・歩きは12コマ、どの絵も足もとが同じ', () => {
  for (const D of [GIRL, WOLF]) {
    assert.deepEqual(Object.keys(D.motions).sort(), ['getup', 'hurt', 'idle', 'knockdown', 'run', 'sit', 'walk', 'wave'], D.character);
    assert.equal(D.motions.run.frames, 12); assert.equal(D.motions.run.fps, 12); assert.equal(D.motions.run.cycle_distance_L, 360);
    assert.equal(D.motions.walk.frames, 12); assert.equal(D.motions.walk.fps, 8); assert.equal(D.motions.walk.cycle_distance_L, 260);
    assert.equal(D.motions.getup.then, 'idle');
    for (const m of Object.values(D.motions)) for (const [sz, z] of Object.entries(m.sizes)) {
      assert.ok(existsSync(join(ROOT, 'assets/chars', D.character, z.file)));
      assert.deepEqual(z.anchor, D.motions.idle.sizes[sz].anchor); assert.equal(z.anchor[0] * 2, z.frame_w);
    }
  }
});

test('起き上がりの絵があるキャラは、倒れるコマを逆にせず getup を流す（反応の時間に合わせる）', () => {
  for (const [D, kind] of [[BOY, 'boy'], [GIRL, 'girl'], [WOLF, 'wolf']]) {
    const a = newAnim(), u = boy({ kind }), seq = [];
    hitReact(u, { w: 1, dir: Math.PI, human: true, kind: 'explosion' });
    for (let t = 0; t < 4; t += TICK) { reactStep(u, TICK); const st = stepAnim(D, a, u, TICK); seq.push(`${st.motion}${st.frame}`); }
    const order = seq.filter((x, i) => x !== seq[i - 1]), K = D.motions.knockdown.sequence, G = D.motions.getup.sequence;
    const want = [...K.map(f => `knockdown${f}`), ...G.map(f => `getup${f}`)].filter((x, i, w) => x !== w[i - 1]);
    assert.deepEqual(order.slice(0, want.length + 1), [...want, `idle${D.motions.idle.sequence[0]}`], kind);
    assert.ok(order.slice(want.length).every(x => x.startsWith('idle')));
    assert.ok(seq.every(x => !/^knockdown/.test(x) || seq.indexOf(x) < seq.indexOf('getup0')), '起き上がりの後で倒れ絵に戻らない');
  }
});

test('少女・狼の獣人も走りは時間で（12fps）・距離に切り替えたら1周の距離は背丈に比例', () => {
  assert.equal(heightOf(BOY), CHAR_H); assert.ok(heightOf(GIRL) < heightOf(BOY) && heightOf(WOLF) > heightOf(BOY));
  for (const D of [GIRL, WOLF]) {
    assert.ok(Math.abs(strideOf(D, 'run') - D.motions.run.cycle_distance_L * heightOf(D) / 300) < 1e-9);
    const a = newAnim(), u = boy({ moving: true, order: { mode: 'rush' } }), L = strideOf(D, 'run'), seq = D.motions.run.sequence, fr = [];
    stepAnim(D, a, u, TICK, { byDistance: true });
    for (let i = 0; i < seq.length; i++) { u.x -= L / seq.length; const st = stepAnim(D, a, u, TICK, { byDistance: true }); fr.push(st.frame); assert.equal(st.motion, 'run'); }
    assert.deepEqual(fr, [...seq.slice(1), seq[0]], D.character);
    assert.equal(D.motions.run.fps, 12);
    const b = newAnim(), v = boy({ moving: true, order: { mode: 'fight' } }), ft = [];
    stepAnim(D, b, v, TICK);
    for (let i = 0; i < 30; i++) { v.x += 1; ft.push(stepAnim(D, b, v, TICK).frame); }
    assert.deepEqual(ft, ft.map((_, i) => frameAt(D.motions.run, (i + 1) * TICK)), D.character + ' 時間');
  }
});

test('ミッション1の少女: 戦闘移動でも急行でも走る（歩かない）・運ばれる・中くらいの当たりで驚く', () => {
  const sim = createSim({ mission: MISSION_1 }), g = sim.units.find(x => x.kind === 'girl'), a = newAnim(), seen = new Set();
  assert.ok(g && hasFrames(g.kind, sheets));
  for (const mode of ['fight', 'rush']) {
    issueOrder(sim, [g.id], [{ tx: toTile(g.x) + (mode === 'rush' ? -3 : 3), ty: toTile(g.y) }], { mode });
    for (let i = 0; i < 120; i++) { runSim(sim, 1); seen.add(stepAnim(GIRL, a, unitById(sim, g.id), TICK).motion); }
  }
  const u = unitById(sim, g.id);
  hitReact(u, { w: 0.45, dir: 0, human: true }); reactStep(u, TICK); seen.add(stepAnim(GIRL, a, u, TICK).motion);
  u.captured = 99; seen.add(stepAnim(GIRL, a, u, TICK).motion);
  for (const m of ['run', 'hurt']) assert.ok(seen.has(m), `${m} ${[...seen]}`);
  assert.ok(!seen.has('walk'), '歩きは使わない');
  assert.equal(KINDS.wolf, undefined, '狼の獣人は地図に出ない（登録だけ）');
});

test('再生順（sequence）: 描いたコマを決められた順にくり返す（待機・手を振る）', () => {
  for (const [D, motion] of [[BOY, 'idle'], [BOY, 'wave'], [GIRL, 'idle'], [GIRL, 'wave'], [WOLF, 'wave']]) {
    const m = D.motions[motion], got = [];
    for (let k = 0; k < m.sequence.length * 2; k++) got.push(frameAt(m, (k + 0.5) / m.fps));
    assert.deepEqual(got, [...m.sequence, ...m.sequence], `${D.character} ${motion}`);
  }
  assert.deepEqual(BOY.motions.idle.sequence, [0, 1, 2, 3, 6, 4, 6, 5]);
  assert.deepEqual(BOY.motions.wave.sequence, [0, 1, 2, 3, 4, 5, 4, 5, 6, 7, 1]);
  // 手を振る（選んだ時は1回分）も sequence の順
  const a = newAnim(), u = boy(), fr = [];
  play(u, a, durOf(BOY.motions.wave) - 1e-6, { wave: durOf(BOY.motions.wave) }, st => { if (st.motion === 'wave') fr.push(st.frame); });
  assert.deepEqual(fr.filter((x, i) => x !== fr[i - 1]), BOY.motions.wave.sequence.filter((x, i, w) => x !== w[i - 1]));
});

test('倒れる → 起き上がる: 反応の時間（REACT.down）の中に収まり、起き終わり＝反応の終わり', () => {
  const Dn = REACT.down, total = Dn.fall + Dn.lie + Dn.getup;
  for (const D of [BOY, GIRL, WOLF]) {
    const M = D.motions;
    assert.equal(downFrame(M, 0).motion, 'knockdown'); assert.equal(downFrame(M, 0).frame, M.knockdown.sequence[0]);
    assert.equal(downFrame(M, total - 1e-6).motion, 'getup'); assert.equal(downFrame(M, total - 1e-6).frame, M.getup.sequence.at(-1));
    const g0 = total - Math.min(durOf(M.getup), Dn.lie + Dn.getup);
    assert.equal(downFrame(M, g0 - 1e-6).frame, M.knockdown.sequence.at(-1), `${D.character} 倒れきってから起きる`);
    assert.ok(durOf(M.knockdown) <= g0 + 1e-9, `${D.character} 倒れるコマは描いた速さのまま`);
  }
  assert.ok(Math.abs(durOf(BOY.motions.getup) - 7 / 8) < 1e-9, '少年の起き上がりは描いた速さ（125ms/コマ）');
  // 起き上がりの絵が無いキャラは、倒れるコマの逆再生
  const noUp = { knockdown: BOY.motions.knockdown };
  assert.equal(downFrame(noUp, total - 1e-6).frame, BOY.motions.knockdown.sequence[0]);
});

test('運ばれている間は、のけぞったコマ（hurt の sequence のまん中）で止まる', () => {
  for (const D of [BOY, GIRL, WOLF]) {
    const a = newAnim(), u = boy({ captured: 5 }), fr = new Set();
    play(u, a, 1, {}, st => fr.add(`${st.motion}${st.frame}`));
    // play() は BOY 固定なので、ここでは直接
    const b = newAnim(), st = stepAnim(D, b, u, TICK), m = D.motions.hurt;
    assert.equal(st.motion, 'hurt'); assert.equal(st.frame, carriedFrame(m)); assert.equal(carriedFrame(m), m.sequence[Math.floor((m.sequence.length - 1) / 2)]);
    if (D === BOY) assert.deepEqual([...fr], [`hurt${carriedFrame(m)}`]);
  }
});
