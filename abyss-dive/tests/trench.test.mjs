import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOOR_Y, TRENCH, trenchAnchor, createTrench, _resetTrenchCache,
  trenchFloorYAt, inTrenchRegion, circleRectResolve, resolveSub, segRectHit, trenchSegHit,
  base2Open, base2Marker, base2DockNear, base2Stage, trenchStage,
} from '../js/trench-rules.js';
import { baseMarker, baseDockNear } from '../js/base-rules.js';
import { createAbyssDive } from '../js/game.js';

/* ==========================================================================
   v1.12.0: 最初の基地の先の「海溝への下り口」（固定地形）と、最奥の棚の第2前哨基地。
   見た目（矩形）と当たり（同じ矩形）が一致すること、下りて浮上できること、
   第2基地にボスの追加撃破なしで接岸でき、どちらの基地からも正しい側へ戻れること、
   ミサイルの主リングが実爆風半径へ到達すること（範囲改造だけが到達距離を変える）。
   ========================================================================== */

const MK = () => ({ x: 10000, y: 520 });

/* --- 純粋ルール: 固定地形 ------------------------------------------------ */

test('海溝: 基地マーカーが無ければ現れない。あれば基地の先に固定で置く', () => {
  _resetTrenchCache();
  assert.equal(trenchAnchor(null), null);
  assert.equal(createTrench(null), null);
  const mk = MK();
  const a = trenchAnchor(mk);
  assert.ok(a && a.x === mk.x + TRENCH.ANCHOR_GAP, 'メッセージ: 基地の先に置く');
  const t = createTrench(mk);
  assert.ok(t.ax > mk.x, 'メッセージ: 基地より右（先）');
  assert.ok(t.gorgeX0 < t.gorgeX1, 'メッセージ: 開口の左右が正しい');
  assert.ok(t.floorY > FLOOR_Y, 'メッセージ: 海底より深い');
  assert.equal(t.floorY, FLOOR_Y + TRENCH.DEPTH);
  /* 同じ基準点では同じ結果（キャッシュされても同一形状） */
  const t2 = createTrench(MK());
  assert.equal(t2.ax, t.ax);
  assert.equal(t2.solids.length, t.solids.length);
});

test('海溝: 床は開口の内側だけ深く、外は海底のまま', () => {
  const t = createTrench(MK());
  assert.equal(trenchFloorYAt(t.ax - 500, t), FLOOR_Y, 'メッセージ: 手前は海底');
  assert.equal(trenchFloorYAt(t.gorgeX0 + 10, t), t.floorY, 'メッセージ: 開口の中は深い');
  assert.equal(trenchFloorYAt(t.gorgeX1 + 500, t), FLOOR_Y, 'メッセージ: 先も海底');
  assert.equal(trenchFloorYAt(0, null), FLOOR_Y, 'メッセージ: 海溝が無ければ海底');
});

test('海溝: 岩棚と開口（狭い道を連続させない＝間に十分な空き）', () => {
  const t = createTrench(MK());
  assert.ok(t.solids.length >= 4, 'メッセージ: 壁と岩棚がある');
  assert.ok(t.ledges.length >= 3, 'メッセージ: 段差（進路選択）を複数');
  /* 各岩棚の張り出しは開口の半分未満＝反対側に広い通り道が残る */
  for (const l of t.ledges){
    assert.ok(l.w < (t.gorgeX1 - t.gorgeX0) * 0.5, 'メッセージ: 岩棚は開口を塞がない');
    assert.ok(l.x >= t.gorgeX0 - 1 && l.x + l.w <= t.gorgeX1 + 1, 'メッセージ: 岩棚は開口の中');
  }
});

/* --- 純粋ルール: 描画＝衝突の矩形 ---------------------------------------- */

test('海溝: 当たりは描画と同じ矩形（壁に当たり、開口では当たらない）', () => {
  const t = createTrench(MK());
  const wall = t.solids.find(s => s.id === 'leftWall');
  assert.ok(wall, 'メッセージ: 左壁がある');
  /* 壁を横切る線分は当たる。当たった点は壁の矩形の内側。 */
  const hit = segRectHit(wall.x - 40, wall.y + 100, wall.x + wall.w + 40, wall.y + 100, wall);
  assert.ok(hit, 'メッセージ: 壁を横切る線分は当たる');
  assert.ok(hit.x >= wall.x - 1e-6 && hit.x <= wall.x + wall.w + 1e-6, 'メッセージ: 当たり点は壁の内側');
  /* 開口の空いた所を通る線分は当たらない（岩棚の無い高さ）。 */
  const openY = FLOOR_Y + 200;   // shelf0(y+30..102)より下・ledgeR1(y+430..)より上
  assert.equal(trenchSegHit(t, t.gorgeX0 + 40, openY, t.gorgeX1 - 40, openY, 0), null, 'メッセージ: 空いた所は通れる');
  assert.equal(trenchSegHit(null, 0, 0, 10, 10, 0), null, 'メッセージ: 海溝が無ければ当たらない');
});

/* --- 純粋ルール: 潜水艇の押し出しと往復 -------------------------------- */

test('海溝: 潜水艇は壁・岩棚・床から押し出される（めり込まない）', () => {
  const t = createTrench(MK());
  const wall = t.solids.find(s => s.id === 'leftWall');
  /* 壁の中心へ無理やり置く → 押し出される */
  const res = resolveSub(t, wall.x + wall.w / 2, wall.y + 200, 24, 60);
  assert.ok(res.hit, 'メッセージ: 壁から押し出される');
  for (const s of t.solids){
    assert.equal(circleRectResolve(res.x, res.y, 23.5, s), null, 'メッセージ: 押し出し後は内側に居ない');
  }
  /* 開口の底より下へは行けない */
  const deep = resolveSub(t, t.gorgeX0 + 300, t.floorY + 400, 24, 60);
  assert.ok(deep.y <= t.floorY - 60 + 1e-6, 'メッセージ: 床で止まる');
});

test('海溝: 下りて浮上できる（降下→最奥→浮上の往復）', () => {
  const t = createTrench(MK());
  const x = t.gorgeX0 + 600;                 // 岩棚の無い縦の通り道
  let y = FLOOR_Y - 100;
  /* 降下: 少しずつ下げて押し出しを適用 */
  for (let i = 0; i < 400; i++){
    y = Math.min(t.floorY - 60, y + 12);
    const r = resolveSub(t, x, y, 24, 60); y = r.y;
  }
  assert.ok(y > FLOOR_Y + 800, 'メッセージ: 海溝の深くまで潜れる（y=' + Math.round(y) + '）');
  assert.ok(y <= t.floorY - 60 + 1e-6, 'メッセージ: 床を越えない');
  /* 浮上: 元へ戻れる（戻り道がある） */
  for (let i = 0; i < 400; i++){ y = Math.max(2400, y - 12); const r = resolveSub(t, x, y, 24, 60); y = r.y; }
  assert.ok(y < FLOOR_Y, 'メッセージ: 開口の上まで浮上できる');
});

/* --- 純粋ルール: 第2前哨基地 -------------------------------------------- */

test('海溝: 第2基地はボスの追加撃破なしで開き、最奥の棚に固定', () => {
  assert.equal(base2Open(0), false, 'メッセージ: 最初のボス撃破前は閉じている');
  assert.equal(base2Marker(MK(), 0), null);
  assert.equal(base2Open(1), true);
  const m2 = base2Marker(MK(), 1);
  const t = createTrench(MK());
  assert.ok(m2 && m2.x === t.base2.x && m2.y === t.base2.y, 'メッセージ: 最奥の棚に固定');
  assert.ok(m2.y > FLOOR_Y && m2.y <= t.floorY, 'メッセージ: 深い棚の上（床より上・海底より深い）');
  assert.equal(base2DockNear(m2.x, m2.y, m2), true);
  assert.equal(base2DockNear(m2.x + TRENCH.BASE_R + TRENCH.BASE_PAD + 40, m2.y, m2), false);
});

test('海溝: 段階表示（下り口・第2基地）', () => {
  const t = createTrench(MK());
  assert.equal(trenchStage(t.beacon.x, t.beacon.y, t), 'inside', 'メッセージ: 開口の中');
  assert.equal(trenchStage(t.beacon.x - 4000, FLOOR_Y, t), 'none', 'メッセージ: 遠いと none');
  assert.equal(trenchStage(0, 0, null), 'none');
  const m2 = base2Marker(MK(), 1);
  assert.equal(base2Stage(m2.x, m2.y, m2), 'dock');
  assert.equal(base2Stage(m2.x - 4000, m2.y, m2), 'none');
});

/* --- 実挙動（本物のゲームループ・入力ハンドラを回す） -------------------- */

function boot(t){
  const previous = Object.fromEntries(['window', 'document', 'Image', 'requestAnimationFrame', 'fetch'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)){
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = new Proxy({
    createLinearGradient: () => gradient, createRadialGradient: () => gradient, measureText: () => ({ width: 40 }),
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
  }, { get(target, key) { return target[key] ?? noop; } });
  const makeCanvas = () => Object.assign(new EventTarget(), { getContext: () => ctx, style: {} });
  globalThis.window = new EventTarget();
  globalThis.document = { createElement: makeCanvas, body: { clientWidth: 1280, clientHeight: 720 } };
  globalThis.Image = class {};
  let next;
  globalThis.requestAnimationFrame = fn => { next = fn; };
  const canvas = makeCanvas();
  const game = createAbyssDive({ canvas });
  game.start(); game.startGame();
  t.after(() => game.destroy());
  game.G.rocks = []; game.G.spawnT = 30;
  let now = performance.now();
  const step = (count = 1) => { for (let i = 0; i < count; i++) next(now += 1000 / 60); };
  const keyDown = code => window.dispatchEvent(Object.assign(new Event('keydown'), { code }));
  const keyUp = code => window.dispatchEvent(Object.assign(new Event('keyup'), { code }));
  const press = code => { keyDown(code); keyUp(code); };
  return { game, step, press, keyDown, keyUp };
}

/* 潜水艇がいずれの矩形の内側にも居ないことを確認する小ヘルパ。 */
function assertNotInside(game){
  const t = game.trench();
  const p = game.G.player, r = p.r - 0.5;
  for (const s of t.solids){
    assert.equal(circleRectResolve(p.x, p.y, r, s), null, 'メッセージ: 潜水艇が地形にめり込んでいない');
  }
}

test('実挙動: 撃破前は海溝も第2基地も無い。撃破後に固定地形が現れる', t => {
  const { game, step } = boot(t);
  const { G } = game;
  assert.equal(game.state().trench, false, 'メッセージ: 撃破前は海溝が無い');
  assert.equal(game.state().base2Marker, false);
  G.bossKills = 1; G.baseMarker = { x: 3000, y: 520 };
  step();
  assert.equal(game.state().trench, true, 'メッセージ: 撃破後に海溝が現れる');
  assert.equal(game.state().base2Marker, true, 'メッセージ: 第2基地も開く');
});

test('実挙動: 下り口から潜り、最奥の棚に着き、浮上して戻れる（カメラも追従）', t => {
  const { game, step, keyDown, keyUp } = boot(t);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: 1000, y: 520 };   // ax=2900
  step();
  const tr = game.trench();
  const x = tr.gorgeX0 + 600;                            // 岩棚の無い縦の通り道
  G.player.x = x; G.player.y = FLOOR_Y - 120; G.player.vx = 0; G.player.vy = 0;
  step();
  const camTop = G.camY;
  keyDown('KeyS'); for (let i = 0; i < 340; i++) step(); keyUp('KeyS'); step();
  assert.ok(G.player.y > FLOOR_Y + 800, 'メッセージ: 海溝の深くまで潜った（y=' + Math.round(G.player.y) + '）');
  assert.ok(G.player.y <= tr.floorY - 60 + 1, 'メッセージ: 床で止まる');
  assert.notEqual(G.camY, camTop, 'メッセージ: カメラが追従');
  assert.ok(G.camY > FLOOR_Y - 720, 'メッセージ: カメラが深くへ');
  assertNotInside(game);
  /* 浮上 */
  keyDown('KeyW'); for (let i = 0; i < 340; i++) step(); keyUp('KeyW'); step();
  assert.ok(G.player.y < FLOOR_Y, 'メッセージ: 浮上して開口の上へ戻れる（y=' + Math.round(G.player.y) + '）');
  assertNotInside(game);
  assert.equal(game.errors.length, 0, 'メッセージ: JS エラーなし');
});

test('実挙動: 第2基地へ入港 → 出港で棚の上（正しい側）へ戻り、そのまま浮上できる', t => {
  const { game, step, press, keyDown, keyUp } = boot(t);
  const { G } = game;
  G.bossKills = 1; G.baseMarker = { x: 1000, y: 520 };
  step();
  const m2 = game.base2Marker();
  G.player.x = m2.x; G.player.y = m2.y; G.player.vx = 0; G.player.vy = 0;
  step(2);
  assert.equal(game.state().base2Near, true, 'メッセージ: 最奥の棚で入港圏');
  assert.equal(game.state().nearBase, 2, 'メッセージ: 第2基地を選ぶ');
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base', 'メッセージ: 明示操作で第2基地へ入港');
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 入港直後に親メニュー（徒歩なし）');
  /* 親メニューで出港を選んで決定（選択と実行は別＝誤出港しない）。 */
  for (let i = 0; i < 4; i++){ keyDown('ArrowDown'); step(); keyUp('ArrowDown'); step(); }
  assert.equal(game.state().base.selectedId, 'depart');
  press('KeyE'); step(3);
  assert.equal(game.state().mode, 'dive', 'メッセージ: 出港して潜航へ戻る');
  assert.ok(Math.abs(G.player.x - (m2.x - (96 + 120))) < 40, 'メッセージ: ドックの手前（正しい側）へ出る');
  assert.ok(G.player.y > FLOOR_Y, 'メッセージ: 第2基地の棚に立つ');
  assertNotInside(game);
});

test('実挙動: 第1基地は従来どおり近づいて入港でき、出港で正しい側へ戻る（バックトラックを壊さない）', t => {
  const { game, step, press, keyDown, keyUp } = boot(t);
  const { G } = game;
  G.bossKills = 1;
  G.baseMarker = baseMarker(1, G.player.x + 100, G.player.y);   // 第1基地を近くに置く
  step();
  const m1 = G.baseMarker;
  G.player.x = m1.x; G.player.y = m1.y; step(2);
  assert.equal(game.state().nearBase, 1, 'メッセージ: 第1基地を選ぶ（第2より手前）');
  assert.equal(game.state().baseNear, true);
  assert.equal(baseDockNear(G.player.x, G.player.y, m1), true);
  press('KeyE'); step(2);
  assert.equal(game.state().mode, 'base');
  assert.equal(game.state().base.screen, 'menu', 'メッセージ: 親メニュー');
  for (let i = 0; i < 4; i++){ keyDown('ArrowDown'); step(); keyUp('ArrowDown'); step(); }
  press('KeyE'); step(3);
  assert.equal(game.state().mode, 'dive');
  assert.ok(Math.abs(G.player.x - (m1.x - (96 + 120))) < 40, 'メッセージ: 第1基地の外側へ出る');
});

/* --- ミサイル着弾（v1.12.0 の爽快感調整。実判定は据え置き） -------------- */

test('ミサイル: 主リングは実爆風半径へ到達する（既定110。範囲改造でのみ変わる）', t => {
  const { game, step } = boot(t);
  const { G } = game;
  const p = G.player;
  /* 目の前の機雷へ向けてミサイル弾を 1 発置く（着弾経路の実挙動を通す） */
  const ex = p.x + 220, ey = p.y;
  G.enemies = [{ kind:'mine', x:ex, y:ey, baseY:ey, r:22, hp:2, maxHp:2, score:20, dmg:0,
    vx:0, vy:0, t:0, phase:0, pt:0, st:0, jaw:0, eye:0, hitCd:0, stun:0, flash:0, dir:-1, drift:0, dead:false }];
  G.bullets.push({ kind:'missile', x:p.x + 60, y:p.y, prevX:p.x + 60, prevY:p.y, vx:0, vy:0, a:0,
    life:4.2, dmg:G.stats.missileDmg, r:9, aoe:G.stats.missileBlast, turn:4.2, speed:330, smoke:0,
    target:null, vscale:1, hitAhead:0 });
  let mainRing = null;
  for (let i = 0; i < 60 && !mainRing; i++){
    step();
    mainRing = G.rings.find(r => r.toR !== undefined && r.toR !== null);
  }
  assert.ok(mainRing, 'メッセージ: 主リング（実半径へ到達するリング）が出る');
  assert.equal(mainRing.toR, 110, 'メッセージ: 既定の爆風半径 110 が到達距離');
  assert.equal(G.enemies.length, 0, 'メッセージ: 直撃で機雷は撃破（ダメージは据え置き）');
  assert.equal(game.errors.length, 0, 'メッセージ: JS エラーなし');
});

test('ミサイル: 主リングは時間とともに実半径へ広がる（r → toR）', t => {
  const { game, step } = boot(t);
  const { G } = game;
  G.rings.push({ x:G.player.x, y:G.player.y, r:0, r0:0, toR:150, life:0.55, max:0.55, col:'rgba(170,225,255,0.42)', w:5 });
  let maxR = 0;
  for (let i = 0; i < 40; i++){
    step();
    const r = G.rings.find(q => q.toR === 150);
    if (r) maxR = Math.max(maxR, r.r);
  }
  assert.ok(maxR > 140 && maxR <= 150 + 1e-6, 'メッセージ: 実半径付近まで到達（maxR=' + Math.round(maxR) + '）');
});
