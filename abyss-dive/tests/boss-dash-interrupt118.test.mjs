import test from 'node:test';
import assert from 'node:assert/strict';
import { createAbyssDive } from '../js/game.js';

/*
 * v1.18.0 ミサイルによる「敵の押し流し」と「ボス突進の迎撃」。
 * 本物のゲームループ・入力ハンドラ・collide/missileBlast を回し、ブラウザ描画と
 * フレーム予約だけ差し替える（missile-balance117.test.mjs と同じ方式）。
 * ボスは位置と攻撃状態だけをステージする。
 */
function boot(t){
  const previous = Object.fromEntries(['window', 'document', 'Image', 'requestAnimationFrame'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const noop = () => {};
  const gradient = { addColorStop:noop };
  const ctx = new Proxy({
    createLinearGradient:()=>gradient, createRadialGradient:()=>gradient, measureText:()=>({width:40}),
    createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
  }, { get(target, key){ return target[key] ?? noop; } });
  const makeCanvas = () => Object.assign(new EventTarget(), {getContext:()=>ctx, style:{}});
  globalThis.window = new EventTarget();
  globalThis.document = {createElement:makeCanvas, body:{clientWidth:1280, clientHeight:720}};
  globalThis.Image = class {};
  let next;
  globalThis.requestAnimationFrame = fn => { next = fn; };
  const canvas = makeCanvas();
  const game = createAbyssDive({canvas});
  game.start(); game.startGame();
  t.after(() => game.destroy());
  game.G.rocks = [];
  game.G.spawnT = 30;
  let now = performance.now();
  const step = (count = 1) => { for (let i = 0; i < count; i++) next(now += 1000/60); };
  return {game, step, canvas};
}

/* 検証用の敵。kind 'jelly' は enemyUpdate が vx/vy に触れないので、吹き飛びを素直に見られる。 */
function dummy(x, y, hp = 500, r = 30){
  return { kind:'jelly', x, y, r, hp, maxHp:hp, score:40, dmg:9, speed:0, pulse:0,
    dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0, hitCd:0, phase:0, pt:0, st:0, eye:0, jaw:0 };
}
/* 検証用のリヴァイアサン。位置と攻撃状態だけをステージする。 */
function mkLeviathan(x, y, state='lunge', st=9, lvx=0, lvy=0){
  return { kind:'leviathan', x, y, r:150, hp:9999, maxHp:9999, score:3000, dmg:34,
    L:1180, H:250, hover:0.74, state, st, dir:-1,
    dead:false, vx:0, vy:0, lvx, lvy, stun:0, flash:0, t:0,
    hitCd:0, phase:0, pt:0, jaw:0, eye:0, atkCd:0 };
}
/* 検証用の巨大イカ。 */
function mkSquid(x, y, state='whip', st=9){
  return { kind:'squid', x, y, r:190, hp:9999, maxHp:9999, score:3200, dmg:26,
    L:580, W:120, hover:0.60, reach:340, arm:0, whiplash:0.5, inkT:0, state, st, dir:-1,
    dead:false, vx:0, vy:0, stun:0, flash:0, t:0, hitCd:0, phase:0, pt:0, jaw:0, eye:0 };
}

const advance = (step, cond, max = 240) => { let i = 0; while (!cond() && i < max){ step(); i++; } return i < max; };
function aimRight(game){
  const {G, Input} = game; const p = G.player;
  Input.mode = 'mouse';
  Input.mx = (p.x - G.camX) + 200;
  Input.my = (p.y - G.camY);
}
/* 位置を指定してミサイル弾を 1 発置く（発射経路ではなく collide/missileBlast を本物で通す）。 */
function stageMissile(game, x, y, dmg = 20, aoe = 110){
  return { kind:'missile', x, y, prevX:x, prevY:y, vx:0, vy:0, a:0, life:2, dmg, r:6, aoe,
    vscale:1, turn:4.2, speed:0, accel:0, smoke:0, age:0, homeDelay:99, hitAhead:0,
    style:'standard', projectile:'standard', launchSound:'s', impactSound:'i' };
}
/* 位置を指定して魚雷弾を 1 発置く。 */
function stageTorpedo(game, x, y, dmg = 5, aoe = 34){
  return { kind:'torp', x, y, prevX:x, prevY:y, vx:0, vy:0, a:0, life:2, dmg, r:6, aoe,
    trail:0, age:0, homeDelay:99, style:'standard', projectile:'standard', target:null };
}
/* プレイヤーを無敵にしてボス接触で死なないようにする。 */
function safePlayer(game, x, y){
  const p = game.G.player;
  p.x = x; p.y = y; p.hp = 100; p.maxHp = 100; p.inv = 99; p.alive = true; p.vx = 0; p.vy = 0;
}

/* ==========================================================================
   1) 生き残った通常敵の押しは次フレームも消えない（放射・距離減衰は維持）
   ========================================================================== */
test('ミサイル: 生き残った通常敵の押しは次フレームも消えない', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  const e = dummy(p.x + 300, p.y, 500);
  G.enemies = [e]; G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  assert.ok(advance(step, () => e.hp < 500), '直撃する');
  assert.ok(e.vx > 0, '爆心から見て右の敵は右へ押される（放射）');
  const x0 = e.x;
  step();                                                 // 次フレーム
  assert.ok(e.x > x0, '押しが次フレームも残って流れる: ' + x0 + ' → ' + e.x);
});

/* ==========================================================================
   2) 実発射したミサイルが突進中のリヴァイアサンを止める（エンドツーエンド）
   ========================================================================== */
test('突進中のリヴァイアサン: 実発射ミサイルの直撃で一度止まり、安全に復帰する', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  safePlayer(game, p.x, p.y);
  const lev = mkLeviathan(p.x + 430, p.y, 'lunge', 9, 0, 0);   // 位置と突進状態だけステージ
  G.enemies = [lev]; G.bullets = []; G.ebullets = []; G.rocks = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const mis = G.bullets.find(b => b.kind === 'missile');
  assert.ok(mis, 'ミサイルが発射される');
  assert.ok(advance(step, () => lev.state === 'stagger'), '直撃で突進が止まる（stagger になる）');
  assert.equal(lev.lvx, 0, '突進速度 lvx を止める');
  assert.equal(lev.lvy, 0, '突進速度 lvy を止める');
  assert.ok(advance(step, () => lev.state === 'recover'), '押し戻しの後、安全な復帰（recover）へ');
  assert.ok(advance(step, () => lev.state === 'stalk'), '通常の stalk へ戻る（永久ハメにしない）');
});

/* ==========================================================================
   3) lvx/lvy を 0 にし、プレイヤーから離れる向きへ短く押し戻す
   ========================================================================== */
test('突進中のリヴァイアサン: 中断で lvx/lvy を 0 にし、後方へ押し戻す', t => {
  const {game, step} = boot(t);
  const {G} = game; const p = G.player;
  safePlayer(game, 1000, 520);
  const lev = mkLeviathan(1430, 520, 'lunge', 9, -900, -160);
  G.enemies = [lev]; G.bullets = [stageMissile(game, 1430 + 600, 520)]; G.ebullets = []; G.rocks = [];
  const x0 = lev.x;
  step();
  assert.equal(lev.state, 'stagger', '直撃で止まる');
  assert.equal(lev.lvx, 0, 'lvx は 0');
  assert.equal(lev.lvy, 0, 'lvy は 0');
  assert.ok(lev.vx > 0, '（右に居る）プレイヤーから離れる向きへ押し戻す: vx=' + lev.vx);
  step(6);
  assert.ok(lev.x > x0, '押し戻されて位置が後退する: ' + x0 + ' → ' + lev.x);
});

/* ==========================================================================
   4) 描画と共通の幾何: 中心座標は範囲外でも実ボディが爆心に入れば止まる
   ========================================================================== */
test('突進中のリヴァイアサン: 実ボディが爆心に入れば止まる（中心座標だけでは外れる距離）', t => {
  const {game, step} = boot(t);
  const {G} = game;
  safePlayer(game, 1000, 520);
  /* 1300,520 のリヴァイアサンは +600px の胴にも当たる（combat.test.mjs と同じ既知の当たり）。 */
  const lev = mkLeviathan(1300, 520, 'lunge', 9, 0, 0);
  G.enemies = [lev]; G.bullets = [stageMissile(game, 1300 + 600, 520, 20, 110)]; G.ebullets = []; G.rocks = [];
  const centerDist = 600;
  assert.ok(centerDist > 110, '前提: 爆心は中心座標から 110px（爆風半径）を越えて離れている');
  step();
  assert.equal(lev.state, 'stagger', '中心座標が外れても、実ボディが入れば止まる（幾何を再利用）');

  /* 対照: 突進していない（stalk）なら、同じ当たりでも止めない。 */
  const lev2 = mkLeviathan(1300, 520, 'stalk', 9, 0, 0);
  G.enemies = [lev2]; G.bullets = [stageMissile(game, 1300 + 600, 520)];
  step();
  assert.notEqual(lev2.state, 'stagger', '突進していなければ中断しない（着弾はする）');
});

/* ==========================================================================
   5) 遠い爆風・射程外では中断しない
   ========================================================================== */
test('リヴァイアサン: 遠い爆風（実ボディが範囲外）では中断しない', t => {
  const {game, step} = boot(t);
  const {G} = game;
  safePlayer(game, 1000, 520);
  const lev = mkLeviathan(1000 + 2500, 520, 'lunge', 9, 0, 0);
  /* ミサイルをボスから遥か手前の岩で爆発させる（実ボディは爆風に触れない）。 */
  G.rocks = [{ x:1000 + 200, y:520, r:60, seed:1, fromFloor:false }];
  G.enemies = [lev]; G.bullets = [stageMissile(game, 1000 + 200, 520, 20, 110)]; G.ebullets = [];
  step(3);
  assert.equal(lev.state, 'lunge', '遠い爆風では中断リセットしない（突進継続）');
});

/* ==========================================================================
   6) 魚雷では中断しない
   ========================================================================== */
test('リヴァイアサン: 魚雷の直撃では中断しない（突進継続）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  safePlayer(game, p.x, p.y);
  const lev = mkLeviathan(p.x + 600, p.y, 'lunge', 9, 0, 0);
  G.enemies = [lev]; G.bullets = []; G.ebullets = []; G.rocks = [];
  aimRight(game);
  Input.fireQueued = true;                                // 主砲＝魚雷
  step();
  const torp = G.bullets.find(b => b.kind === 'torp');
  assert.ok(torp, '魚雷が発射される');
  const hp0 = lev.hp;
  assert.ok(advance(step, () => lev.hp < hp0), '魚雷が命中する');
  assert.notEqual(lev.state, 'stagger', '魚雷では突進を止めない');
});

/* ==========================================================================
   7) 待機中/回復中の追撃では中断しない（ハメ防止）
   ========================================================================== */
test('リヴァイアサン: 回復（recover）中の着弾では突進を止めない', t => {
  const {game, step} = boot(t);
  const {G} = game;
  safePlayer(game, 1000, 520);
  const lev = mkLeviathan(1300, 520, 'recover', 2.0, -900, -160);
  G.enemies = [lev]; G.bullets = [stageMissile(game, 1300 + 600, 520)]; G.ebullets = []; G.rocks = [];
  const hp0 = lev.hp;
  step();
  assert.ok(lev.hp < hp0, '着弾はする（ダメージは保持）');
  assert.notEqual(lev.state, 'stagger', '回復中の追撃では中断しない');
  assert.equal(lev.lvx, -900, '中断していないので lvx はそのまま（リセットしない）');
});

/* ==========================================================================
   8) 押し戻し中の突進接触ダメージは無効（復帰後は通常）
   ========================================================================== */
test('リヴァイアサン: 押し戻し（stagger）中は突進の接触ダメージが無効', t => {
  const {game, step} = boot(t);
  const {G} = game;
  /* 押し戻し中: 実ボディに重なっても被弾しない。 */
  const lev = mkLeviathan(1300, 520, 'stagger', 5, 0, 0);
  safePlayer(game, 1300 + 60, 520);
  G.player.inv = 0; G.player.hp = 100;                    // 無敵ではなく「状態」で防ぐことを見る
  G.enemies = [lev]; G.bullets = []; G.ebullets = []; G.rocks = [];
  step();
  assert.equal(G.player.hp, 100, 'stagger 中は接触ダメージを受けない');

  /* 対照: 通常状態なら同じ位置で被弾する。 */
  const lev2 = mkLeviathan(1300, 520, 'noop', 5, 0, 0);
  G.enemies = [lev2];
  safePlayer(game, 1300 + 60, 520);
  G.player.inv = 0; G.player.hp = 100;
  step();
  assert.ok(G.player.hp < 100, '通常なら同じ位置で接触ダメージを受ける');
});

/* ==========================================================================
   9) 巨大イカ（突進なし）は止まらない・狙わない
   ========================================================================== */
test('巨大イカ: 突進を持たないためミサイルで中断されない', t => {
  const {game, step} = boot(t);
  const {G} = game;
  safePlayer(game, 1600 - 300, 520);
  const sq = mkSquid(1600, 520, 'whip', 9);
  G.enemies = [sq]; G.bullets = [stageMissile(game, 1600, 520)]; G.ebullets = []; G.rocks = [];
  const hp0 = sq.hp;
  step();
  assert.ok(sq.hp < hp0, '着弾はする');
  assert.equal(sq.state, 'whip', 'イカは突進を持たないので状態は変わらない');
});

/* ==========================================================================
   10) 二重加算なし: 中断しても直撃のダメージは一度だけ
   ========================================================================== */
test('リヴァイアサン: 中断しても直撃ダメージは一度だけ（二重加算なし）', t => {
  const {game, step} = boot(t);
  const {G} = game;
  safePlayer(game, 1000, 520);
  const lev = mkLeviathan(1300, 520, 'lunge', 9, 0, 0);
  const D = 20;
  G.enemies = [lev]; G.bullets = [stageMissile(game, 1300 + 600, 520, D, 110)]; G.ebullets = []; G.rocks = [];
  step();
  assert.equal(lev.state, 'stagger', '止まる');
  assert.equal(lev.maxHp - lev.hp, D, '実ダメージはミサイル威力ちょうど一度だけ');
});
