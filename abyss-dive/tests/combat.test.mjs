import test from 'node:test';
import assert from 'node:assert/strict';
import {createAbyssDive} from '../js/game.js';

// Run the real game loop and input handlers; replace only browser drawing and frame scheduling.
function boot(t) {
  const previous = Object.fromEntries(['window', 'document', 'Image', 'requestAnimationFrame'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  t.after(() => {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const noop = () => {};
  const gradient = {addColorStop:noop};
  const ctx = new Proxy({
    createLinearGradient:()=>gradient, createRadialGradient:()=>gradient, measureText:()=>({width:40}),
    createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),
  }, {
    get(target, key) { return target[key] ?? noop; },
  });
  const makeCanvas = () => Object.assign(new EventTarget(), {getContext:()=>ctx, style:{}});
  globalThis.window = new EventTarget();
  globalThis.document = {createElement:makeCanvas, body:{clientWidth:1280, clientHeight:720}};
  globalThis.Image = class {};
  let next;
  globalThis.requestAnimationFrame = fn => { next = fn; };
  const game = createAbyssDive({canvas:makeCanvas()});
  game.start(); game.startGame();
  t.after(() => game.destroy());
  game.G.rocks = [];
  game.G.spawnT = 30;
  let now = performance.now();
  const step = (count = 1) => { for (let i = 0; i < count; i++) next(now += 1000/60); };
  const press = code => {
    for (const event of ['keydown', 'keyup']) window.dispatchEvent(Object.assign(new Event(event), {code}));
  };
  return {game, step, press};
}

test('バリア入力は1回ずつ。発動中・再使用待ちの入力では発動しない', t => {
  const {game, step, press} = boot(t);
  let ons = 0;
  game.AU.barrierOn = () => { ons++; };
  press('Space'); step();
  assert.equal(ons, 1);                                   // 発動した
  assert.equal(game.state().barrier.active, true);
  step(12); press('Space'); step(210);                    // 持続中〜再使用待ちの中
  assert.equal(ons, 1);                                   // 追加発動しない
  assert.equal(game.state().barrier.ready, true);         // 2.4s 経過で再使用可
  press('Space'); step();
  assert.equal(ons, 2);                                   // 再使用後に発動
});

test('撃破された敵は同じフレームで消え、生きている敵は残る', t => {
  const {game, step, press} = boot(t);
  const {G} = game;
  const {x, y} = G.player;
  const mine = {kind:'mine', x:x+425, y, baseY:y, r:26, hp:1, score:20, vx:0, vy:0, t:0, phase:0, hitCd:0, stun:0, flash:0, dir:-1};
  const live = {...mine, x:x+545, hp:100};
  G.enemies = [mine, live];
  press('ShiftLeft'); step();
  assert.equal(G.kills, 1);
  assert.equal(G.enemies.includes(mine), false);
  assert.equal(G.enemies.includes(live), true);
});

/* ==========================================================================
   v1.8.1 ボスの当たり判定：描いたシルエット寄り（巨大な透明円は使わない）
   ========================================================================== */
/* 検証用のボス。state:'noop' は update のどのケースにも当たらず動かない。 */
function mkBoss(kind, x, y){
  const base = {
    kind, x, y, dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0,
    hitCd:0, phase:0, pt:0, st:999, state:'noop', eye:0, jaw:0, atkCd:0,
  };
  if (kind === 'leviathan') return Object.assign(base, { r:150, hp:9999, maxHp:9999, score:0, dmg:10, L:1180, H:250, hover:0.74, flashT:0 });
  return Object.assign(base, { r:190, hp:9999, maxHp:9999, score:0, dmg:10, L:580, W:120, hover:0.60, reach:340, arm:0, whiplash:0, inkT:0 });
}

/* ボスの基準点から (dx,dy) の位置にプレイヤーを置いて 1 フレーム進め、被弾（＝当たり）したかを見る。 */
function contactAt(game, step, boss, dx, dy){
  const {G} = game;
  G.enemies = [boss];
  G.bullets = []; G.ebullets = []; G.rocks = [];
  G.player.x = boss.x + dx; G.player.y = boss.y + dy;
  G.player.hp = 100; G.player.inv = 0; G.player.alive = true;
  step();
  return G.player.hp < 100;
}

/* 弾を 1 点に置いて 1 フレーム進め、ボスに命中したかを見る（プレイヤーは左で接触しない）。 */
function shotHit(game, step, boss, bx, by){
  const {G} = game;
  G.enemies = [boss];
  G.ebullets = []; G.rocks = [];
  G.player.x = boss.x - 300; G.player.y = boss.y;
  G.player.inv = 99; G.player.hp = 100;
  G.bullets = [{ kind:'torp', x:bx, y:by, prevX:bx, prevY:by, vx:0, vy:0, a:0, life:1.5, dmg:5, r:6, aoe:34, trail:0, target:null }];
  const hp0 = boss.hp;
  step();
  return boss.hp < hp0;
}

test('ボス: 巨大な透明円は無い（何も描いていない空間では当たらない）', t => {
  const {game, step} = boot(t);
  const lev = mkBoss('leviathan', 1300, 520);
  assert.equal(contactAt(game, step, lev, -140, 0), false, 'リヴァイアサン: 基準点から前方に外れた空間は当たらない');
  assert.equal(shotHit(game, step, lev, 1300 - 140, 520), false, 'リヴァイアサン: 鼻先より前の弾は命中しない');
  assert.equal(contactAt(game, step, lev, 600, -500), false, 'リヴァイアサン: 胴の遥か上は当たらない');
  // イカ: 頭の先（前方 200px）は何も描いていない
  const sq = mkBoss('squid', 1300, 520);
  assert.equal(contactAt(game, step, sq, -200, 0), false, 'イカ: 頭の前方の空洞は当たらない');
  assert.equal(contactAt(game, step, sq, 300, -400), false, 'イカ: 外套の遥か上は当たらない');
  assert.equal(shotHit(game, step, sq, 1300 - 200, 520), false, 'イカ: 空洞を通る弾は命中しない');
});

test('ボス: 描いた頭・胴には当たる', t => {
  const {game, step} = boot(t);
  // 接触（頭）: 基準点のすぐ後ろは頭の円が覆う
  const lev = mkBoss('leviathan', 1300, 520);
  assert.equal(contactAt(game, step, lev, 60, 0), true, 'リヴァイアサン: 頭に当たる（接触）');
  const sq = mkBoss('squid', 1300, 520);
  assert.equal(contactAt(game, step, sq, -90, 0), true, 'イカ: 頭に当たる（接触）');
  // 弾（胴）: 前から撃ち込む。胴の芯に沿って命中する
  const lev2 = mkBoss('leviathan', 1300, 520);
  assert.equal(shotHit(game, step, lev2, 1300 + 100, 520), true, 'リヴァイアサン: 頭に命中（弾）');
  assert.equal(shotHit(game, step, lev2, 1300 + 600, 520), true, 'リヴァイアサン: 胴に命中（弾）');
  const sq2 = mkBoss('squid', 1300, 520);
  assert.equal(shotHit(game, step, sq2, 1300 + 300, 520), true, 'イカ: 外套に命中（弾）');
});

test('巨大イカの触腕: 描いている位置・太さで、攻撃中（whip）だけ危険', t => {
  const {game, step} = boot(t);
  const s = mkBoss('squid', 1600, 520);
  s.whiplash = 0; s.arm = 1; s.st = 1.3;
  /* 描いている長い触腕（drawSquid と同じ式）の中ほどを狙う */
  const reach = s.reach * (0.75 + s.arm * 1.2);
  const len = reach * 1.32;
  const u = 0.4;
  const lx = 62 + u * len;
  const ly = (-s.W * 0.36) * 0.72 + Math.sin(u * 2.8) * len * 0.13 * u;
  const dx = -lx, dy = ly;             // dir=-1（進行方向の逆＝プレイヤー側）へ伸びる
  s.state = 'whip';
  assert.equal(contactAt(game, step, s, dx, dy), true, '攻撃中は描いた触腕が危険');
  s.state = 'noop';                     // 攻撃していない（描いてはいるが無害）
  assert.equal(contactAt(game, step, s, dx, dy), false, '攻撃していないときは触腕で被弾しない');
});
