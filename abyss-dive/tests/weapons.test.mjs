import test from 'node:test';
import assert from 'node:assert/strict';
import {createAbyssDive} from '../js/game.js';

// 本物のゲームループ・入力ハンドラを回し、ブラウザ描画とフレーム予約だけ差し替える。
// combat.test.mjs と同じ方式（実挙動をそのまま検証する）。
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

test('魚雷: 他のボタンを長押ししても発射しない', t => {
  const {game, step, canvas} = boot(t);
  const {x, y} = game.Input.ui.find(b => b.id === 'missile');
  canvas.dispatchEvent(Object.assign(new Event('mousedown'), {button:0, clientX:x, clientY:y}));
  const ammo = game.G.player.missiles;
  step(60);
  assert.equal(game.G.player.missiles, ammo - 1);
  assert.equal(torpCount(game), 0);
});

test('魚雷: 移動指や別の発射指を離しても残りの発射指で連射する', t => {
  const {game, step, canvas} = boot(t);
  const {x, y} = game.Input.ui.find(b => b.id === 'fire');
  const touch = (event, identifier, clientX, clientY) => canvas.dispatchEvent(Object.assign(new Event(event), {changedTouches:[{identifier, clientX, clientY}]}));
  touch('touchstart', 1, 100, 500);
  touch('touchstart', 2, x, y);
  touch('touchstart', 3, x, y);
  touch('touchend', 1, 100, 500);
  touch('touchend', 2, x, y);
  step(30);
  assert.ok(torpCount(game) > 1);
  touch('touchcancel', 3, x, y);
  assert.equal(game.Input.fireHeld, false);
  const before = new Set(game.G.bullets);
  step(20);
  assert.ok(game.G.bullets.every(b => before.has(b)));
});

/* 検証用の敵。kind 'jelly' は描画でき、enemyUpdate が vx/vy に触れない（ゆっくり流れるだけ）ので、
   吹き飛ばしの方向と量だけを素直に見られる。enemyAimX = e.x / 円判定 r=30。 */
function dummy(x, y, hp = 50) {
  return {
    kind:'jelly', x, y, r:30, hp, maxHp:hp, score:40, dmg:9, speed:20, pulse:0,
    dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0,
    hitCd:0, phase:0, pt:0, st:0, eye:0, jaw:0,
  };
}

/* まっすぐ右（a=0）へ撃つためのマウス照準（プレイヤーとカメラの現在位置から決める）。 */
function aimRight(game) {
  const {G, Input} = game;
  const p = G.player;
  Input.mode = 'mouse';
  Input.mx = (p.x - G.camX) + 200;
  Input.my = (p.y - G.camY);
}
const advance = (step, cond, max = 240) => { let i = 0; while (!cond() && i < max) { step(); i++; } return i < max; };
const torpOf = game => game.G.bullets.find(b => b.kind === 'torp');

test('ミサイル直撃: 弾の威力が一度だけ入り、進行方向へ吹き飛ぶ', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;
  const target = dummy(p.x + 300, p.y, 50);
  G.enemies = [target];
  G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const shot = G.bullets.find(b => b.kind === 'missile');
  assert.ok(shot, 'ミサイルが発射されるはず');
  const hit = advance(step, () => target.hp < 50);
  assert.ok(hit, 'ミサイルが直撃するはず');
  assert.equal(target.hp, 50 - shot.dmg, '直撃に周囲ダメージが二重加算されない');
  assert.ok(target.vx > 100, '進行方向（+x）へ吹き飛ぶはず');
  assert.ok(target.stun > 0, '吹き飛びで短く制御が外れるはず');
  assert.equal(G.bullets.some(b => b.kind === 'missile'), false, '着弾した弾は消える');
});

test('ミサイル周囲:距離減衰ダメージ＋爆心から放射状に吹き飛ぶ', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;
  const direct = dummy(p.x + 300, p.y, 50);         // 直撃（射線の先）
  const near = dummy(p.x + 300, p.y + 80, 50);      // 爆心の真下（範囲内）
  const far = dummy(p.x + 620, p.y, 50);            // 爆心から遠い（範囲外）
  G.enemies = [direct, near, far];
  G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const shot = G.bullets.find(b => b.kind === 'missile');
  assert.ok(shot, 'ミサイルが発射されるはず');
  const hit = advance(step, () => direct.hp < 50);
  assert.ok(hit, '直撃するはず');
  assert.equal(direct.hp, 50 - shot.dmg, '直撃は満額');
  assert.ok(near.hp < 50, '周囲の敵にも距離減衰ダメージが入る');
  assert.ok(near.hp > direct.hp, '周囲は直撃より弱い（減衰）');
  assert.ok(near.vx > 0 && near.vy > 0, '爆心から見て真下の敵は下向きに飛ぶ（放射）');
  assert.ok(near.stun > 0, '周囲の敵も吹き飛ぶ');
  assert.equal(far.hp, 50, '射程外の敵は無傷');
  assert.equal(far.vx, 0, '射程外の敵は吹き飛ばない');
  assert.equal(far.stun, 0);
});

test('ミサイル:敵ではなく地形に当たっても周囲効果は一貫', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;
  // 弾道の先に岩を置き、岩の少し奥に敵（＝地形着弾でも周囲へ効くことを見る）
  G.rocks = [{x:p.x + 300, y:p.y, r:40, seed:1, fromFloor:false}];
  const behind = dummy(p.x + 360, p.y, 50);
  G.enemies = [behind];
  G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const hit = advance(step, () => behind.hp < 50);
  assert.ok(hit, '地形着弾でも周囲の敵が巻き込まれるはず');
  assert.ok(behind.vx > 0, '地形着弾でも放射状に吹き飛ぶはず');
  assert.ok(behind.stun > 0);
});

test('ミサイルはボスを吹き飛ばさない（ダメージは与える）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;
  const boss = {
    kind:'leviathan', x:p.x + 300, y:p.y, r:150, hp:9999, maxHp:9999, score:0, dmg:0,
    dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0, hitCd:0, phase:0, pt:0,
    st:999, state:'enter', eye:0, jaw:0.05, L:1180, H:250, hover:0.74, atkCd:0, flashT:0,
  };
  G.enemies = [boss];
  G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const shot = G.bullets.find(b => b.kind === 'missile');
  assert.ok(shot, 'ミサイルが発射されるはず');
  const hit = advance(step, () => boss.hp < 9999, 360);
  assert.ok(hit, 'ボスに直撃するはず');
  assert.equal(boss.hp, 9999 - shot.dmg, '直撃ダメージは入る');
  assert.equal(boss.vx, 0, 'ボスは吹き飛ばない');
  assert.equal(boss.vy, 0);
  assert.equal(boss.stun, 0, 'ボスは吹き飛びのスタンを受けない');
});

test('ミサイルは海底固定（戦車ヤドカリ）を吹き飛ばさない（ダメージは与える）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;
  const hermit = {
    kind:'hermit', x:p.x + 300, y:p.y + 34, floorY:p.y + 34, r:34, hp:100, maxHp:100,
    score:180, dmg:14, dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0,
    hitCd:0, phase:0, pt:0, st:0.85, state:'dormant', eye:0, jaw:0,
  };
  G.enemies = [hermit];
  G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const hit = advance(step, () => hermit.hp < 100, 360);
  assert.ok(hit, '戦車ヤドカリに直撃するはず');
  assert.ok(hermit.hp < 100, 'ダメージは入る');
  assert.equal(hermit.vx, 0, '海底固定は吹き飛ばない');
  assert.equal(hermit.vy, 0);
  assert.equal(hermit.stun, 0);
});

test('魚雷は前方近傍の生きた標的に弱く寄る（a と vx/vy が揃う）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;
  G.enemies = [dummy(p.x + 640, p.y - 250, 50)];   // 前方やや上（コーン内）
  G.bullets = [];
  aimRight(game);
  Input.fireQueued = true;
  step();
  const b = torpOf(game);
  assert.ok(b, '魚雷が発射されるはず');
  assert.ok(b.target, '前方の敵が誘導候補になるはず');
  const a0 = b.a;
  step(16);
  assert.ok(b.a < a0 - 0.05, '標的の方向（上＝負）へ弱く補正されるはず');
  const sp = Math.hypot(b.vx, b.vy);
  assert.ok(Math.abs(b.vx - Math.cos(b.a) * sp) < 0.01, 'vx は a と揃っている');
  assert.ok(Math.abs(b.vy - Math.sin(b.a) * sp) < 0.01, 'vy は a と揃っている');
});

test('魚雷は背後の敵・射線外には補正しない', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;

  // 背後
  G.enemies = [dummy(p.x - 300, p.y, 50)];
  G.bullets = [];
  aimRight(game);
  p.fireCd = 0; p.heat = 0;
  Input.fireQueued = true;
  step();
  const bBehind = torpOf(game);
  assert.equal(bBehind.target, null, '背後の敵は候補にならない');
  const a1 = bBehind.a;
  step(16);
  assert.equal(bBehind.a, a1, '背後へは旋回しない');

  // 前方だがコーン外（約80°上）
  G.bullets = [];
  G.enemies = [dummy(p.x + 80, p.y - 460, 50)];
  p.fireCd = 0; p.heat = 0;
  Input.fireQueued = true;
  step();
  const bOff = torpOf(game);
  assert.equal(bOff.target, null, '射線（前方コーン）外は候補にならない');
  const a2 = bOff.a;
  step(16);
  assert.equal(bOff.a, a2, '射線外へは旋回しない');
});

test('魚雷は標的が死んでも壊れない（まっすぐ飛び続ける）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  const p = G.player;
  G.enemies = [dummy(p.x + 640, p.y - 250, 50)];
  G.bullets = [];
  aimRight(game);
  Input.fireQueued = true;
  step();
  const b = torpOf(game);
  assert.ok(b && b.target, '前方の敵を狙って発射されるはず');
  b.target.dead = true;                 // 誘導中に標的が死ぬ
  const x0 = b.x;
  step(10);
  assert.ok(!b.dead, '標的死亡で弾は消えない');
  assert.ok(b.x > x0, '前進を続ける');
  assert.ok(Number.isFinite(b.vx) && Number.isFinite(b.vy), '速度が壊れない');
});

/* --- v1.8.2 魚雷の押しっぱなし連射（ミサイルはそのまま） --- */

const torpCount = game => game.G.bullets.filter(b => b.kind === 'torp').length;

test('魚雷: 短いタップ（1フレーム）は1発だけ', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  aimRight(game);
  G.bullets = []; G.enemies = [];
  Input.fireQueued = true; Input.fireHeld = true;
  step();                       // 押した瞬間に1発
  Input.fireHeld = false;       // すぐ離す
  step(2);
  assert.equal(torpCount(game), 1, 'タップ1回で1発');
});

test('魚雷: 押しっぱなしは発射間隔ごとに連射し、離すと止まる', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  aimRight(game);
  G.bullets = []; G.enemies = [];
  Input.fireQueued = true; Input.fireHeld = true;
  step(60);                     // 約1秒ホールド
  const n = torpCount(game);
  /* v1.17.0: 初期魚雷は遅い単発間隔（0.30s）＋発熱。長押しでも以前の連射にはならない。 */
  assert.ok(n >= 2, 'ホールドで複数発（' + n + '）');
  assert.ok(n <= 6, '初期の遅い間隔＋発熱で連射が抑えられる（' + n + '）');
  const before = new Set(G.bullets.filter(b => b.kind === 'torp'));
  Input.fireHeld = false;       // 離す
  step(30);
  const fresh = G.bullets.filter(b => b.kind === 'torp').filter(b => !before.has(b));
  assert.equal(fresh.length, 0, '離したら新たに撃たない');
});

test('魚雷: ホールドで過熱したら撃てない（熱・クールダウンを無視しない）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  aimRight(game);
  G.bullets = []; G.enemies = [];
  G.player.heat = 0.99; G.player.fireCd = 0;
  Input.fireHeld = true;
  step();
  assert.equal(G.player.over, true, '押しっぱなしでも過熱する');
  const before = new Set(G.bullets.filter(b => b.kind === 'torp'));
  step(30);                     // 過熱中
  const fresh = G.bullets.filter(b => b.kind === 'torp').filter(b => !before.has(b));
  assert.equal(fresh.length, 0, '過熱中はホールドでも新たに撃たない');
  Input.fireHeld = false;
});

test('ミサイル: 押しっぱなしでも連発しない（魚雷ホールドの影響を受けない）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game;
  aimRight(game);
  G.bullets = []; G.enemies = [];
  Input.wantMissile = true;     // エッジで1回だけ
  step();
  assert.equal(G.bullets.filter(b => b.kind === 'missile').length, 1);
  Input.fireHeld = true;        // 魚雷を押しっぱなしにしても
  step(60);
  assert.equal(G.bullets.filter(b => b.kind === 'missile').length, 1, 'ミサイルは連発しない');
  Input.fireHeld = false;
});
