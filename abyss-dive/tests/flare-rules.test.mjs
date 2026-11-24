import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FLARE, createFlareState, canFireFlare, fireFlare, tickFlares, resetFlares, flareIntensity,
} from '../js/flare-rules.js';

/* ------------------------------------------------------------------
 * 照明弾（flare）の純粋ルール（コンセプト＝雰囲気優先の弾道版）。
 *  - 弾数・資源を消費しない（何度でも）。補給・装填なし。
 *  - 一押しで 1 発。照準に関係なく「艇の前方斜め上」へ出る。
 *  - 頂点を越えたら水中をゆっくり沈む（落下速度の低い上限）。光は接触まで持続。
 *  - 海底/下の地形に接したら短く減衰して消灯。壁・天井はすり抜けない。
 *  - 深い空間でも落下を見せる前に切らない安全寿命。同時点灯の上限あり。
 * ------------------------------------------------------------------ */

function sim(state, dt, seconds, env){
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) tickFlares(state, dt, env);
}

test('初期状態: 照明弾は 0 発・クールダウン 0', () => {
  const s = createFlareState();
  assert.equal(s.flares.length, 0);
  assert.equal(s.cd, 0);
  assert.equal(canFireFlare(s), true);
});

test('発射: 前方斜め上へ出る（vx>0, vy<0）・照準に依存しない', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 100, y: 300 });
  assert.ok(f);
  assert.equal(s.flares.length, 1);
  assert.ok(f.vx > 0, '前方（+x）へ');
  assert.ok(f.vy < 0, '斜め上（-y）へ');
  assert.ok(Math.abs(Math.hypot(f.vx, f.vy) - FLARE.SPEED) < 1e-6, '初速は FLARE.SPEED');
  assert.equal(f.x, 100); assert.equal(f.y, 300);
  assert.equal(s.cd, FLARE.INTERVAL);
  /* 照準（角度）を渡しても無視する＝前方斜め上へ固定 */
  const s2 = createFlareState();
  const g = fireFlare(s2, { x: 0, y: 0, a: Math.PI });   // 真後ろを渡しても前方上
  assert.ok(g.vx > 0 && g.vy < 0);
});

test('連射間隔: クールダウン中は撃てず、間隔後に再び撃てる', () => {
  const s = createFlareState();
  assert.ok(fireFlare(s, { x:0, y:0 }));
  assert.equal(fireFlare(s, { x:0, y:0 }), null);
  tickFlares(s, FLARE.INTERVAL + 1e-6, null);
  assert.ok(fireFlare(s, { x:0, y:0 }));
});

test('弾数無制限: 間隔ごとに何度でも（資源消費なし）', () => {
  const s = createFlareState();
  let made = 0;
  for (let i = 0; i < 12; i++){ if (fireFlare(s, { x:i, y:0 })) made++; tickFlares(s, FLARE.INTERVAL + 1e-6, null); }
  assert.equal(made, 12);
  assert.equal(s.fired, 12);
});

test('同時点灯の上限: あふれたら古い（残り寿命の短い）ものから消える', () => {
  const s = createFlareState();
  const ids = [];
  for (let i = 0; i < FLARE.MAX; i++){ ids.push(fireFlare(s, { x:i, y:0 }).id); tickFlares(s, FLARE.INTERVAL + 1e-6, null); }
  assert.equal(s.flares.length, FLARE.MAX);
  fireFlare(s, { x:99, y:0 });
  assert.equal(s.flares.length, FLARE.MAX, '上限を超えない');
  assert.equal(s.flares.some(f => f.id === ids[0]), false, '最も古い 1 発が消えた');
});

test('弾道: 上がって頂点を越えて下る（重力で vy の符号が + へ）', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 0, y: 400 });
  let minY = f.y;
  const dt = 1/60;
  for (let i = 0; i < 60 * 3; i++){ tickFlares(s, dt, null); if (f.y < minY) minY = f.y; }
  assert.ok(minY < 400 - 80, '十分に上がる（頂点で y が小さくなる）: apex=' + Math.round(minY));
  assert.ok(f.y > minY, '頂点後は下る');
  assert.equal(s.flares.length, 1, 'まだ点灯している');
});

test('ゆっくり沈む: 落下速度は低い上限（終端速度）に収まる', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 0, y: 200 });
  sim(s, 1/60, 3.0, null);     // 頂点を越えて十分に落下させた後
  assert.ok(f.vy > 0, '落下中');
  assert.ok(f.vy <= FLARE.FALL_MAX + 1e-6, '落下速度は上限以下: ' + f.vy.toFixed(1));
});

test('前進は落ちる: 頂点後は vx が小さくなる（漂うように沈む）', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 0, y: 200 });
  const vx0 = f.vx;
  sim(s, 1/60, 4.0, null);
  assert.ok(f.vx < vx0 * 0.3, '前進が減る: ' + f.vx.toFixed(1) + ' << ' + vx0.toFixed(1));
});

test('海底に接したら上下とも止まり、短く減衰して消える', () => {
  const s = createFlareState();
  const FLOORY = 350;                 // 頂点(≒244)のすぐ下＝沈降を見せてから接する
  const f = fireFlare(s, { x: 0, y: 400 });
  const env = { floorY: () => FLOORY };
  for (let i = 0; i < 60 * 12 && !f.land; i++) tickFlares(s, 1/60, env);
  assert.equal(f.land, true, '着底した');
  assert.ok(Math.abs((f.y + FLARE.R) - FLOORY) < 8, '海底のすぐ上で止まる: dy=' + ((f.y + FLARE.R) - FLOORY).toFixed(2));
  assert.ok(flareIntensity(f) > 0.5, '着底直後はまだ点灯');
  sim(s, 1/60, FLARE.FADE + 0.3, env);
  assert.equal(s.flares.length, 0, '減衰後に消えた');
  assert.equal(flareIntensity(f), 0, '光度 0');
});

test('着底後は光度が 0 へ単調に減る（短く自然に消光）', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 0, y: 400 });
  const env = { floorY: () => 350 };
  for (let i = 0; i < 60 * 12 && !f.land; i++) tickFlares(s, 1/60, env);
  assert.ok(f.land);
  const a = flareIntensity(f);
  tickFlares(s, FLARE.FADE * 0.5, env);
  const b = flareIntensity(f);
  tickFlares(s, FLARE.FADE * 0.6, env);
  const c = flareIntensity(f);
  assert.ok(a > b && b >= c && c === 0, `単調に減衰: ${a.toFixed(2)} > ${b.toFixed(2)} > ${c.toFixed(2)}`);
});

test('壁・天井はすり抜けない（上に棚があると上昇が止まり、中に入らない）', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 0, y: 400 });
  const ceiling = { x: -500, y: 200, w: 2000, h: 40 };   // 頭上の棚（下面 y=240）
  const env = { solids: [ceiling], floorY: () => 2000 };
  let minY = f.y;
  for (let i = 0; i < 60 * 3; i++){ tickFlares(s, 1/60, env); minY = Math.min(minY, f.y); }
  assert.ok(minY >= ceiling.y + ceiling.h + FLARE.R - 3, '棚の中へ入らない: minY=' + minY.toFixed(1));
  assert.ok(!f.land, '天井（下面）では着底扱いにしない');
  assert.ok(f.vy >= 0, '当たった後は上昇が止まる');
});

test('安全寿命: 底が極端に深い（接触しない）でも十分な長さまでは点灯し続ける', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x: 0, y: 0 });
  sim(s, 1/60, 5.0, null);              // 落下を見せる前に切らない
  assert.equal(s.flares.length, 1, '5 秒時点でもまだ点灯');
  assert.ok(FLARE.LIFE >= 6, '安全寿命は十分に長い: ' + FLARE.LIFE);
  sim(s, 1/60, FLARE.LIFE, null);       // 寿命いっぱいまで
  assert.equal(s.flares.length, 0, '安全寿命で消える（永続点灯しない）');
});

test('resetFlares: 新しい出撃で持ち越さない', () => {
  const s = createFlareState();
  fireFlare(s, { x:0, y:0 }); fireFlare(s, { x:0, y:0 });
  resetFlares(s);
  assert.equal(s.flares.length, 0); assert.equal(s.cd, 0); assert.equal(s.fired, 0);
});

test('光度: 飛翔中はほぼ 1、寿命の最後 0.6s で滑らかに減る', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x:0, y:0 });
  assert.equal(flareIntensity(f), 1);
  f.life = 0.3;
  const half = flareIntensity(f);
  f.life = 0.0;
  assert.ok(half > 0 && half < 1, '終端で滑らかに減る: ' + half);
  assert.equal(flareIntensity(f), 0);
});

test('照明弾はダメージ・資源・装填を持たない（非攻撃の光）', () => {
  const s = createFlareState();
  const f = fireFlare(s, { x:0, y:0 });
  for (const k of ['dmg','damage','knock','knockback','ammo','reload','cost','resource']) assert.equal(k in f, false, '持ち込まない: ' + k);
  for (const k of ['ammo','magazine','reload','resource','cost']) assert.equal(k in s, false, '状態に持たない: ' + k);
});

test('照射半径は旧(340)の約2.5倍＝広い柔らかい減衰（中心光量は据え置き）', () => {
  assert.ok(FLARE.LIGHT_R >= 800 && FLARE.LIGHT_R <= 900,
    '見える広がりの距離を約2.5倍（≈850）: ' + FLARE.LIGHT_R);
});
