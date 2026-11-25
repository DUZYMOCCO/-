/**
 * 敵汎用 pose→debris モジュールのテスト。
 * 固定する仕様:
 *  - 通常描画と撃破が同じ「ローカル部位姿勢」を読む
 *  - 撃破の切離し 0 フレームは、実際に表示したポーズと位置・大きさ・向きが一致する
 *  - 乱数は「その後の」速度と回転だけ。0 フレームの姿勢は乱数に依存しない
 *  - 入れ子（親子）・左右反転・非ゼロ角度・固定（アンカー）部位を扱う
 *  - 画像欠落は安全に失敗を返す（呼び出し側は従来演出へ戻せる）
 *  - 破片数は予算で上限を切る（古い方から落とす）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as rp } from 'node:path';
import { resolve, snapshot, spawn, step, poseFrame, DEBRIS } from '../js/pose-debris.js';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = rp(here, '..');
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b} (eps ${eps})`);

const light = { id: 'light', img: 'L', crop: [0, 0, 10, 10], at: [20, 0], mass: 1, depth: 2 };
const heavy = { id: 'heavy', img: 'H', crop: [10, 0, 20, 20], at: [-30, -10], mass: 4, depth: 1 };
const fixedRng = () => 0.5;

/* --- 入れ子・角度 ------------------------------------------------------- */

test('pose→debris: resolve は入れ子の局所変換を親から合成する（非ゼロ角度）', () => {
  const parts = [
    { id: 'body', at: [0, 0], rot: 0, depth: 0 },
    { id: 'arm', parent: 'body', at: [10, 0], rot: 0.5, depth: 1 },
    { id: 'hand', parent: 'arm', at: [10, 0], rot: 0.25, depth: 2 },
  ];
  const r = resolve(parts);
  const arm = r.find(p => p.id === 'arm');
  const hand = r.find(p => p.id === 'hand');
  near(arm.at[0], 10); near(arm.at[1], 0); near(arm.rot, 0.5);
  near(hand.at[0], 10 + 10 * Math.cos(0.5), 1e-12);
  near(hand.at[1], 0 + 10 * Math.sin(0.5), 1e-12);
  near(hand.rot, 0.75, 1e-12);
});

test('pose→debris: resolve は depth 昇順（奥→手前）に並べる', () => {
  const r = resolve([light, heavy]);
  assert.deepEqual(r.map(p => p.id), ['heavy', 'light']);
});

test('pose→debris: resolve は scale を親から掛け合わせる', () => {
  const r = resolve([{ id: 'a', at: [0, 0], scale: 2, depth: 0 },
                     { id: 'b', parent: 'a', at: [0, 0], scale: 1.5, depth: 1 }]);
  near(r.find(p => p.id === 'b').scale, 3);
});

/* --- スナップショット（描画と同じワールド変換） ------------------------- */

test('pose→debris: snapshot は向き+1でアンカー+ローカルに置く', () => {
  const s = snapshot([light, heavy], { x: 100, y: 200, flip: 1 });
  const l = s.parts.find(p => p.id === 'light');
  near(l.at[0], 120); near(l.at[1], 200); near(l.flip, 1); near(l.rot, 0);
});

test('pose→debris: snapshot は向き-1で x を反転し回転も反転する（未反転bxの解消）', () => {
  const p = { id: 'light', img: 'L', crop: [0, 0, 10, 10], at: [20, 0], rot: 0.3, scale: 1.5, mass: 1, depth: 0 };
  const s = snapshot([p], { x: 100, y: 200, flip: -1 });
  const l = s.parts[0];
  near(l.at[0], 80); near(l.at[1], 200);
  near(l.rot, -0.3); near(l.flip, -1); near(l.scale, 1.5);
});

test('pose→debris: snapshot は表示前フォールバック（ポーズ未確定）でも決定的な姿勢を返す', () => {
  const a = snapshot([light], { x: 5, y: 7, flip: -1 });
  const b = snapshot([light], { x: 5, y: 7, flip: -1 });
  near(a.parts[0].at[0], b.parts[0].at[0]);
  near(a.parts[0].rot, b.parts[0].rot);
});

/* --- 切離し 0 フレーム＝表示ポーズ ------------------------------------- */

test('pose→debris: spawn の 0 フレームは表示ポーズと完全一致（位置・大きさ・向き）', () => {
  for (const flip of [1, -1]) {
    const snap = snapshot([light, heavy], { x: 42, y: 314, flip });
    const out = spawn(snap, { rng: fixedRng });
    assert.equal(out.ok, true);
    for (const d of out.parts) {
      const s = snap.parts.find(p => p.id === d.id);
      const p0 = d.pose0;
      near(p0.x, s.at[0]); near(p0.y, s.at[1]);
      near(p0.rot, s.rot); near(p0.scale, s.scale); near(p0.flip, s.flip);
    }
  }
});

test('pose→debris: 乱数は 0 フレームに影響しない（違う乱数でも同じ姿勢から切れる）', () => {
  const snap = snapshot([light, heavy], { x: 10, y: 20, flip: -1 });
  const a = spawn(snap, { rng: () => 0.1 });
  const b = spawn(snap, { rng: () => 0.9 });
  for (let i = 0; i < a.parts.length; i++) {
    near(a.parts[i].pose0.x, b.parts[i].pose0.x);
    near(a.parts[i].pose0.rot, b.parts[i].pose0.rot);
    near(a.parts[i].pose0.scale, b.parts[i].pose0.scale);
  }
  // 動き（速度）の方は乱数で変わる＝演出だけに使う
  assert.notDeepEqual(a.parts.map(p => p.vx), b.parts.map(p => p.vx));
});

test('pose→debris: 殻は重く部位は軽い（同じ力で重い方が速度が小さい）', () => {
  const snap = snapshot([{ ...light, mass: 1 }, { ...heavy, mass: 6 }], { x: 0, y: 0, flip: 1 });
  const out = spawn(snap, { rng: fixedRng, impulse: 260 });
  const li = out.parts.find(p => p.id === 'light');
  const hv = out.parts.find(p => p.id === 'heavy');
  assert.ok(Math.hypot(li.vx, li.vy) > Math.hypot(hv.vx, hv.vy), 'light part must fly faster');
  assert.ok(Math.abs(li.vr) > Math.abs(hv.vr), 'heavy part must spin less');
});

/* --- 欠落・予算・固定 --------------------------------------------------- */

test('pose→debris: 画像が欠けていたら安全に失敗を返す（従来演出へ戻せる）', () => {
  const snap = snapshot([light, heavy], { x: 0, y: 0, flip: 1 });
  const out = spawn(snap, { missing: (id) => id === 'heavy' });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'missing');
  assert.equal(out.id, 'heavy');
});

test('pose→debris: step は予算の上限を切り、古い方から落とす', () => {
  const list = [];
  for (let i = 0; i < 5; i++) list.push({ id: 'p' + i, x: i, y: 0, vx: 0, vy: 0, vr: 0, rot: 0, scale: 1, life: 9, t: 0, mass: 1 });
  step(list, 1 / 60, { budget: 3 });
  assert.equal(list.length, 3);
  assert.deepEqual(list.map(d => d.id), ['p2', 'p3', 'p4']);
});

test('pose→debris: step は寿命切れを落とし、dt=0 では何も動かない', () => {
  const a = { id: 'a', x: 1, y: 2, vx: 100, vy: -50, vr: 3, rot: 0.2, scale: 1, life: 0.01, t: 0, mass: 1 };
  const b = { id: 'b', x: 5, y: 6, vx: 100, vy: -50, vr: 3, rot: 0.2, scale: 1, life: 1, t: 0, mass: 1 };
  const list = [a, b];
  step(list, 0, {});
  near(b.x, 5); near(b.rot, 0.2);
  step(list, 0.5, {});
  assert.deepEqual(list.map(d => d.id), ['b'], 'expired part must be culled');
});

test('pose→debris: 固定（アンカー）部位は切れてもその場に留まる', () => {
  const snap = snapshot([{ ...light, fixed: true }], { x: 3, y: 4, flip: 1 });
  const out = spawn(snap, { rng: fixedRng, impulse: 400 });
  const d = out.parts[0];
  near(d.vx, 0); near(d.vy, 0); near(d.vr, 0);
  step(out.parts, 0.25, {});
  near(d.x, d.pose0.x); near(d.y, d.pose0.y); near(d.rot, d.pose0.rot);
});

test('pose→debris: step は t>0 で初めて重さと慣性で動く（0 フレームは動かない）', () => {
  const snap = snapshot([light], { x: 0, y: 0, flip: 1 });
  const out = spawn(snap, { rng: () => 0.8, impulse: 260 });
  const d = out.parts[0];
  near(d.x, d.pose0.x); near(d.y, d.pose0.y);
  step(out.parts, 1 / 60, {});
  assert.ok(d.x !== d.pose0.x || d.y !== d.pose0.y, 'the piece must move after t>0');
});

/* --- 破片だけが動く（敵配列を汚さない） -------------------------------- */

test('pose→debris: poseFrame は 1 ポーズ分の部位だけを返す（敵配列に触れない）', () => {
  const def = { box: 150, parts: [light, heavy] };
  const f = poseFrame(def, { x: 0, y: 0, flip: 1, frame: 0, frames: 4 });
  assert.equal(f.length, 2);
  assert.ok(!('enemies' in def));
});

/* --- 実ゲーム配線（ソース水準） ---------------------------------------- */

test('pose→debris: ゲーム側が共有モジュールを読み、従来演出へのフォールバックを持つ', () => {
  const src = readFileSync(rp(gameDir, 'js/game.js'), 'utf8');
  assert.ok(src.includes("from './pose-debris.js"), 'game.js must import pose-debris');
  assert.ok(src.includes('PD.snapshot('), 'draw/defeat must snapshot the displayed pose');
  assert.ok(src.includes('PD.spawn('), 'defeat must spawn from the snapshot');
  assert.ok(/if\s*\(!burst\.ok\)/.test(src), 'missing parts must fall back to the legacy burst');
});

test('pose→debris: 撃破の報酬は一度きり（dead ガード）で、破片は演出のみ', () => {
  const src = readFileSync(rp(gameDir, 'js/game.js'), 'utf8');
  assert.ok(/function killEnemy\(e\)\{\s*if \(e\.dead\) return;/.test(src), 'killEnemy must guard on dead');
  assert.ok(src.includes("'husk'"), 'debris kind must exist');
  assert.ok(!/G\.enemies\.push\(\s*\{[^}]*kind:\s*'(husk|debris)'/.test(src), 'debris must never enter G.enemies');
});

test('pose→debris: 部位素材が読めない時は旧来の 1 枚絵・爆発へ安全に戻せる', () => {
  const src = readFileSync(rp(gameDir, 'js/game.js'), 'utf8');
  assert.ok(src.includes("hermitBWalkArt, frame * HERMITB_CELL"), 'single-sheet walk fallback missing');
  assert.ok(src.includes("g.drawImage(hermitBAlertArt, -75, -149, 150, 150)"), 'single-sheet alert fallback missing');
  assert.ok(src.includes("if (!burst.ok){ explode("), 'legacy burst fallback missing');
});

test('pose→debris: 表示前に倒れた場合は現ポーズで作り直す（フォールバック）', () => {
  const src = readFileSync(rp(gameDir, 'js/game.js'), 'utf8');
  assert.ok(src.includes('let snap = e._snap && e._snap.snap;'), 'undrawn-pose fallback missing');
  assert.ok(src.includes('if (!snap){'), 'undrawn-pose recompute missing');
});

test('pose→debris: 破片は予算上限（M700 / pose-debris 320）で頭打ちにする', () => {
  const src = readFileSync(rp(gameDir, 'js/game.js'), 'utf8');
  assert.ok(/G\.parts\.length \+ n > 700/.test(src), 'debris must respect the particle cap');
  assert.ok(DEBRIS.budget > 0 && DEBRIS.budget <= 700, 'module budget must be sane');
});
