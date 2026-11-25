/**
 * B亜種ヤドカリ（中型）の配線テスト（ソース水準）。
 * 承認済み試作（scratch/abyss-hermit-palette-tree の隔離版）の意図を、現行 `abyss-depth-lab` の
 * 実装に合わせて固定する。
 *  - 既存の戦車擬態型ヤドカリ（hermit）を消さず、別種 hermitB として共存
 *  - 撃破は「演出のみ」＝破片は G.parts、敵配列を汚さない。報酬は killEnemy で一度
 *  - 独立配置は一度きり（hermitBSeeded）で、深部（海溝下）が開いてから
 *  - 当たりは body 半径 r=52・体の中心 y=floorY-60
 *  - 床は実地形（深棚下＝合流広場の深床）に沿う
 *  - v3.7.0 視認性の修正: range 内でも「見える歩行」を NOTICE 秒続けてから警戒へ（退路でリセット）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = resolve(here, '..');
const src = readFileSync(resolve(gameDir, 'js/game.js'), 'utf8');

test('B亜種ヤドカリ: 別種 hermitB と専用アセットが配線されている', () => {
  for (const k of ["kind === 'hermitB'", 'updateHermitB', 'drawHermitB', 'spawnHermitBBurst'])
    assert.ok(src.includes(k), 'missing: ' + k);
});

test('B亜種ヤドカリ: 既存の戦車擬態型ヤドカリを消していない', () => {
  assert.ok(src.includes("const hermitArt = loadArt('hermit-tank.webp')"), 'tank hermit art must remain');
  assert.ok(src.includes("case 'hermit': updateHermit(e, dt, p); return;"), 'tank hermit update must remain');
  assert.ok(src.includes("if (e.kind === 'hermit') { drawHermit(ctx, e); continue; }"), 'tank hermit draw must remain');
});

test('B亜種ヤドカリ: 撃破の部位は演出のみ（husk は G.parts に載り既存の敵配列を汚さない）', () => {
  assert.ok(src.includes("'husk'") && src.includes("d.kind = 'husk'"), 'husk part kind missing');
  assert.ok(src.includes("q.kind === 'husk'"), 'husk draw branch missing');
  assert.ok(src.includes("if (e.kind === 'hermitB') spawnHermitBBurst(e);"), 'burst hook missing');
});

test('B亜種ヤドカリ: 独立配置は一度きり（hermitBSeeded）で、深部が開いてから', () => {
  assert.ok(/hermitBSeeded:\s*false/.test(src), 'G.hermitBSeeded init missing');
  assert.ok(src.includes('G.hermitBSeeded = false'), 'startGame reset missing');
  assert.ok(src.includes('!G.hermitBSeeded'), 'spawn guard missing');
  assert.ok(src.includes('deepUnlocked()'), 'spawn must wait for the deep area to open');
});

test('B亜種ヤドカリ: 配置は海溝下の洞窟分岐の合流広場床（現行実地形）を読む', () => {
  assert.ok(src.includes('createTrench(trenchAnchor())'), 'spawn must read the current trench layout');
  assert.ok(/caveX0 \+ t\.caveX1/.test(src), 'spawn x must come from the cave branch, not a fixed guess');
  assert.ok(src.includes('hermitBFloorY(bx)'), 'spawn must use the real floor');
  assert.ok(src.includes('e.floorY = hermitBFloorY(e.x);'), 'updateHermitB must follow the real floor');
  assert.ok(src.includes("if (t && x > t.gorgeX0 && x < t.gorgeX1) return t.deepFloorY;"), 'floor helper must use the trench deep floor');
});

test('B亜種ヤドカリ: 当たりは body の r=52 / 接地 y=floorY-60 に一致（既存挙動と同じ基準）', () => {
  assert.ok(src.includes('y:y - 60, r:52'), 'hermitB spawn must set r=52, y=floorY-60');
  assert.ok(src.includes('e.y = e.floorY - 60;'), 'updateHermitB must keep the body centre on the hitbox');
});

test('B亜種ヤドカリ: 1遭遇が遠方カリングで消えない（世界固定・1体）', () => {
  assert.ok(/e\.kind === 'hermitB' \|\|/.test(src), 'hermitB must be exempt from the far-cull');
});

test('B亜種ヤドカリ: 攻撃予告（砲口チャージ）を深い区間で消さない', () => {
  assert.ok(src.includes('drawHermitBTelegraph'), 'hermitB telegraph missing');
  assert.ok(src.includes("else if (e.kind === 'hermitB') drawHermitBTelegraph(ctx, e);"), 'telegraph draw wiring missing');
});

test('B亜種ヤドカリ: v3.7.0 視認性 — range 内でも「見える歩行」を NOTICE 秒続けてから警戒へ', () => {
  assert.ok(src.includes('HERMITB_NOTICE_T'), 'notice threshold missing');
  assert.ok(src.includes('HERMITB_CLOSE'), 'close-encounter threshold missing');
  assert.ok(src.includes('e.noticeT = (e.noticeT || 0) + dt;'), 'notice must accumulate while walking in range');
  assert.ok(src.includes('e.noticeT >= HERMITB_NOTICE_T'), 'alert must wait for the notice window');
  assert.ok(src.includes('dist2 < HERMITB_CLOSE * HERMITB_CLOSE'), 'a close encounter must alert promptly');
  assert.ok(src.includes('e.noticeT = 0;                              // 退路'), 'leaving range must reset the notice (retreat path)');
  /* 旧ルール（range に入った即時警戒）が残っていないこと。 */
  assert.ok(!/if \(inRange\)\{\s*e\.state = 'alert'/.test(src), 'instant walk→alert must be gone');
});

test('B亜種ヤドカリ: sw-assets の新規ファイルが実在する', () => {
  const sw = readFileSync(resolve(gameDir, 'sw-assets.js'), 'utf8');
  for (const f of ['js/pose-debris.js',
                   'assets/hermit-b-walk.webp', 'assets/hermit-b-alert.webp',
                   'assets/hermit-b-part-shell.webp', 'assets/hermit-b-part-torso.webp',
                   'assets/hermit-b-part-legs.webp', 'assets/hermit-b-part-clawL.webp',
                   'assets/hermit-b-part-clawR.webp', 'assets/hermit-b-part-eyes.webp',
                   'assets/hermit-b-walk-shell.webp', 'assets/hermit-b-walk-torso.webp',
                   'assets/hermit-b-walk-legs.webp', 'assets/hermit-b-walk-clawL.webp',
                   'assets/hermit-b-walk-clawR.webp', 'assets/hermit-b-walk-eyes.webp']) {
    assert.ok(sw.includes("'" + f + "'"), 'sw-assets missing: ' + f);
    assert.ok(existsSync(resolve(gameDir, f)), 'asset missing on disk: ' + f);
  }
});
