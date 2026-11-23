import test from 'node:test';
import assert from 'node:assert/strict';
import { createAbyssDive, inTrenchDeep } from '../js/game.js';
import { createTrench, FLOOR_Y, TRENCH } from '../js/trench-rules.js';
import { designItem } from '../js/weapon-rules.js';

/*
 * v1.17.0 ミサイルの実ダメージ/着弾、および海溝深部の回収導線、ボス体表の発光抑止。
 * 本物のゲームループ・入力ハンドラを回し、ブラウザ描画とフレーム予約だけ差し替える
 * （weapons.test.mjs / combat.test.mjs と同じ方式）。
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
function dummy(x, y, hp = 50, r = 30){
  return { kind:'jelly', x, y, r, hp, maxHp:hp, score:40, dmg:9, speed:0, pulse:0,
    dead:false, vx:0, vy:0, stun:0, flash:0, dir:-1, t:0, hitCd:0, phase:0, pt:0, st:0, eye:0, jaw:0 };
}
/* 検証用のボス（巨大イカ）。stun で停止させ、当たり・発光だけを見る。 */
function bossDummy(x, y, hp = 9999){
  return { kind:'squid', x, y, r:190, hp, maxHp:hp, score:3200, dmg:26, speed:0,
    L:580, W:120, hover:0.60, reach:340, arm:0, whiplash:0, inkT:0, st:2.4, state:'stalk', dir:-1,
    dead:false, vx:0, vy:0, stun:999, flash:0, t:0, hitCd:0, phase:0, pt:0, jaw:0, eye:0 };
}
/* まっすぐ右（a=0）へ撃つためのマウス照準。 */
function aimRight(game){
  const {G, Input} = game; const p = G.player;
  Input.mode = 'mouse';
  Input.mx = (p.x - G.camX) + 200;
  Input.my = (p.y - G.camY);
}
const advance = (step, cond, max = 240) => { let i = 0; while (!cond() && i < max){ step(); i++; } return i < max; };

/* --- ミサイルの実ダメージ（装弾数に見合う重打） --------------------------- */

test('ミサイル: 直撃の実ダメージは弾の威力値どおり一度だけ（二重計上なし）・旧値より重い', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  const target = dummy(p.x + 300, p.y, 500);
  G.enemies = [target]; G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const mis = G.bullets.find(b => b.kind === 'missile');
  assert.ok(mis, 'ミサイルが発射される');
  const D = mis.dmg;
  assert.ok(D > 11, 'ミサイルの実ダメージは生の基礎値(11)より重い: ' + D);
  assert.ok(D / 1.5 >= 8, '魚雷1発(1.5)の 8 倍以上（短時間の強打）: ' + D);
  assert.ok(advance(step, () => target.hp < 500), '直撃する');
  assert.ok(Math.abs(target.hp - (500 - D)) < 1e-6, '直撃は威力そのまま（周囲ダメージの二重加算なし）');
});

test('ミサイル: 爆風は直撃の 50% 以上を群れへ入れ、直撃役は二重に取らない', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  const direct = dummy(p.x + 300, p.y, 500);
  const near   = dummy(p.x + 300, p.y + 80, 500);      // 爆心内（範囲内）
  const far    = dummy(p.x + 720, p.y, 500);           // 範囲外
  G.enemies = [direct, near, far]; G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const D = G.bullets.find(b => b.kind === 'missile').dmg;
  assert.ok(advance(step, () => direct.hp < 500), '直撃する');
  assert.ok(Math.abs(direct.hp - (500 - D)) < 1e-6, '直撃役は満額を一度だけ');
  const nearLoss = 500 - near.hp;
  assert.ok(nearLoss >= D * 0.5, '周囲（爆風）に直撃の 50% 以上が入る: ' + nearLoss + ' / ' + D);
  assert.equal(far.hp, 500, '射程外は無傷');
  assert.equal(far.vx, 0, '射程外は吹き飛ばない');
});

test('ミサイル: 群れを放射状に押し返す（吹き飛び＋短いスタン）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  const direct = dummy(p.x + 300, p.y, 500);
  const near   = dummy(p.x + 300, p.y + 80, 500);
  G.enemies = [direct, near]; G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  assert.ok(advance(step, () => near.hp < 500), '周囲へ届く');
  assert.ok(near.vx > 0 && near.vy > 0, '爆心から見て真下の敵は下向きに飛ぶ（放射）');
  assert.ok(near.stun > 0, '周囲の敵も短く制御が外れる');
});

/* --- 海溝深部の回収（rollItem の deepSalvo 配線。通常抽選は不変） ------------ */

const MARKER = { x: 10000 };
const trenchDeepPoint = () => { const t = createTrench(MARKER); return { x: t.gorgeX0 + 400, y: FLOOR_Y + 600 }; };
const trenchShallowPoint = () => ({ x: createTrench(MARKER).gorgeX0 + 400, y: 900 });
const outsidePoint = () => ({ x: MARKER.x - 3000, y: FLOOR_Y + 600 });

test('inTrenchDeep: 初回ボス後かつ海溝の実際の深部だけ true（位置の純関数）', () => {
  assert.equal(inTrenchDeep(13000, FLOOR_Y + 600, null, 1), false, '海溝が無い（未撃破）なら false');
  assert.equal(inTrenchDeep(13000, FLOOR_Y + 600, MARKER, 0), false, '初回ボス前は false');
  const d = trenchDeepPoint();
  assert.equal(inTrenchDeep(d.x, d.y, MARKER, 1), true, '海溝の開口内・海底より下なら true');
  assert.equal(inTrenchDeep(d.x, 900, MARKER, 1), false, '海溝の上（浅い）は false');
  const o = outsidePoint();
  assert.equal(inTrenchDeep(o.x, o.y, MARKER, 1), false, '海溝の外は false');
});

/* 回収を実際に通す。深部なら魚雷は 6/9/12 まで出うる（定数 rng で隅まで寄せる）。 */
function collectSalvageAt(game, step, px, py){
  const {G} = game;
  G.baseMarker = MARKER; G.bossKills = 1;
  G.enemies = []; G.bullets = []; G.rocks = []; G.spawnT = 999;
  const p = G.player; p.x = px; p.y = py; p.vx = 0; p.vy = 0; p.hp = p.maxHp; p.alive = true; p.inv = 999;
  game.setLootRng(() => 0.005);      // typeId=torpedo / 深海斉射の閾値の内側 / 品質・形状も固定
  const before = game.arsenal.items().length;
  G.pickups.push({ x:px, y:py, vx:0, vy:0, kind:'salvage', r:14, t:0, life:16 });
  step(3);
  return { added: game.arsenal.items().slice(before), items: game.arsenal.items() };
}

test('回収: 海溝の深部でのみ深海斉射（扇状 6/9/12）が入る（通常抽選は 1/2/3 のまま）', t => {
  const a = boot(t);
  const deep = trenchDeepPoint();
  const gotDeep = collectSalvageAt(a.game, a.step, deep.x, deep.y).added;
  assert.equal(gotDeep.length, 1, '深部では 1 個入る');
  assert.equal(gotDeep[0].type, 'torpedo');
  assert.equal(gotDeep[0].count, 12, '深部の魚雷は扇状 12 ウェイまで出る');
  assert.equal(gotDeep[0].pattern, 'fan');

  const b = boot(t);
  const sh = trenchShallowPoint();
  const gotShallow = collectSalvageAt(b.game, b.step, sh.x, sh.y).added;
  assert.equal(gotShallow.length, 1, '浅場でも 1 個入る');
  assert.ok([1,2,3].indexOf(gotShallow[0].count) >= 0, '浅場は通常抽選（1/2/3）のまま: ' + gotShallow[0].count);
});

test('回収→恒久解放→指定開発: 深部で拾った 12 ウェイ魚雷を指定開発で作れる導線が生きている', t => {
  const {game, step} = boot(t);
  const deep = trenchDeepPoint();
  collectSalvageAt(game, step, deep.x, deep.y);
  assert.ok(game.advanced.isUnlocked('torpedo', 'count', 12), '回収で扇状 12 ウェイが恒久解放される');
  const it = designItem('torpedo', { count:12, pattern:'fan' }, () => 0.5);
  assert.ok(it, '指定開発で 12 ウェイ魚雷を作れる（回収からの導線）');
  assert.equal(it.count, 12);
  assert.equal(it.pattern, 'fan');
});

/* --- ボス体表のヒットフラッシュ（発光/変色）抑止 ------------------------- */

test('ボス着弾: 体表のヒットフラッシュを出さない（HP は減り、通常敵の閃光は維持）', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  const boss = bossDummy(p.x + 300, p.y, 9999);
  G.enemies = [boss]; G.bullets = [];
  G.bullets.push({ kind:'torp', x:boss.x, y:boss.y, prevX:boss.x, prevY:boss.y, vx:0, vy:0, a:0,
    life:1.5, dmg:10, r:6, aoe:34, style:'stock', projectile:'stock',
    launchSound:'stock', impactSound:'stock', age:0, homeDelay:0, target:null });
  step();
  assert.ok(boss.hp < 9999, 'ボスへ実ダメージは入る');
  assert.equal(boss.flash, 0, '着弾でボス体表は発光しない（ヒットフラッシュ無し）');

  // 通常敵はこれまでどおり閃光する
  const normal = dummy(p.x + 300, p.y, 50);
  G.enemies = [normal]; G.bullets = [];
  G.bullets.push({ kind:'torp', x:normal.x, y:normal.y, prevX:normal.x, prevY:normal.y, vx:0, vy:0, a:0,
    life:1.5, dmg:10, r:6, aoe:34, style:'stock', projectile:'stock',
    launchSound:'stock', impactSound:'stock', age:0, homeDelay:0, target:null });
  step();
  assert.ok(normal.flash > 0, '通常敵の既存フィードバック（閃光）は維持');
});

test('ボス着弾（ミサイル）: 体表の発光は無し・独立した着弾エフェクトは残る', t => {
  const {game, step} = boot(t);
  const {G, Input} = game; const p = G.player;
  const boss = bossDummy(p.x + 320, p.y, 9999);
  G.enemies = [boss]; G.bullets = [];
  aimRight(game);
  Input.wantMissile = true;
  step();
  const hit = advance(step, () => boss.hp < 9999, 120);
  assert.ok(hit, 'ミサイルがボスへ着弾する');
  assert.equal(boss.flash, 0, '着弾でボス体表は発光しない');
  assert.ok(G.parts.length > 0 || G.rings.length > 0 || G.impacts.length > 0,
    '泡・圧力波などの独立した着弾エフェクトは残る');
});
