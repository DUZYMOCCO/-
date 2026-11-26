/**
 * ABYSS DIVE — 照明弾（flare）の純粋ルール（コンセプト＝雰囲気優先の弾道版）。
 *
 * 非攻撃の光。弾数・資源を消費せず何度でも撃てる（補給・装填なし）。
 * 一押しで 1 発。照準に関係なく「艇の前方斜め上」へ出る。
 * 頂点を越えたら水中をゆっくり沈む（落下速度の低い上限／前進はなめらかに減衰）。
 * 光は接触まで持続し、海底/下の地形に接したら短く減衰して消灯する。
 * 壁・天井はすり抜けない（面へ入る成分を消す＝滑る）。
 * 底が極端に深くても落下を見せる前に切らない安全寿命を持つ。同時点灯の上限あり。
 *
 * 当たりは本編と同じ幾何（geometry-rules の連続判定）を共有する純粋ロジック。
 * 描画・入力・更新は game.js 側。ここは数値と状態だけ。
 */

import { firstContact, clamp } from './geometry-rules.js';

export const FLARE = {
  SPEED: 480,        // 初速（px/s）
  ANGLE: -0.6,       // 前方斜め上の角度（rad・負＝上・≒34°）＝弾道が画面内に収まる
  GRAV: 236,         // 下向きの重力（px/s^2）
  FALL_MAX: 27,      // 落下速度の上限（ゆっくり沈む終端速度 px/s・頂点→接触で約10秒）
  DRAG: 0.9,         // 前進の減衰（1/s）＝頂点後に前進が落ちる
  R: 7,              // 当たり半径（px）
  LIFE: 24.0,        // 安全寿命（沈降が長いので十分延長。落下を見せる前には切らない）
  INTERVAL: 0.34,    // 連射間隔（s）
  MAX: 3,            // 同時点灯の上限
  FADE: 0.55,        // 着底後の減衰（s）
  LIGHT_R: 850,      // 照らす半径（見える広がりの距離）。旧 340 の約2.5倍。中心光量は据え置き
  TRAIL_DT: 0.05,    // 軌跡の記録間隔（s）
  TRAIL_MAX: 14,     // 軌跡の点数
};

export function createFlareState() {
  return { flares: [], cd: 0, nextId: 1, fired: 0 };
}

export function canFireFlare(state) {
  return state.cd <= 0;
}

/** 一押しで 1 発。照準に依らず「艇の前方斜め上」へ。資源・弾数は消費しない。 */
export function fireFlare(state, { x, y, dir }) {
  if (state.cd > 0) return null;
  const sgn = (dir !== undefined && dir < 0) ? -1 : 1;
  const f = {
    id: state.nextId++,
    x, y,
    vx: Math.cos(FLARE.ANGLE) * FLARE.SPEED * sgn,
    vy: Math.sin(FLARE.ANGLE) * FLARE.SPEED,   // 負＝上
    life: FLARE.LIFE, max: FLARE.LIFE,
    land: false, fade: 0,                        // land＝着底（消灯中）
    trail: [{ x, y }], trailT: 0,
  };
  state.flares.push(f);
  /* 同時点灯の上限: あふれたら残り寿命の短い（＝古い）順に消す。 */
  while (state.flares.length > FLARE.MAX) {
    let oldest = 0;
    for (let i = 1; i < state.flares.length; i++) {
      if (state.flares[i].life < state.flares[oldest].life) oldest = i;
    }
    state.flares.splice(oldest, 1);
  }
  state.cd = FLARE.INTERVAL;
  state.fired++;
  return f;
}

/** 光度 0..1。飛翔中はほぼ 1、着底後は FADE で滑らかに 0 へ。寿命の最後も少し減る。 */
export function flareIntensity(f) {
  if (!f) return 0;
  if (f.land) return clamp(f.fade / FLARE.FADE, 0, 1);
  return clamp(f.life / 0.6, 0, 1);
}

/**
 * 時間を進める。env（任意）:
 *   env.solids … 壁/天井/岩（geometry-rules の図形。trench solids ＋ rocks）
 *   env.floorY … (x)=>y  海底/下の地形の上面（ここに接したら着底）
 *   env.ceilY  … 画面上端などの天井（任意）
 * env が無ければ弾道と寿命だけ進める（テスト・非プレイ用）。
 */
export function tickFlares(state, dt, env) {
  if (state.cd > 0) state.cd = Math.max(0, state.cd - dt);
  const solids = env && env.solids;
  const floorY = env && env.floorY;
  const ceilY = (env && env.ceilY != null) ? env.ceilY : null;

  for (const f of state.flares) {
    if (f.land) { f.fade = Math.max(0, f.fade - dt); continue; }

    f.life -= dt;
    if (f.life <= 0) { f.life = 0; f.land = true; f.fade = 0; continue; }   // 安全寿命で消灯

    /* --- 積分（ゆっくり沈む） --- */
    f.vy += FLARE.GRAV * dt;
    if (f.vy > FLARE.FALL_MAX) f.vy = FLARE.FALL_MAX;                       // 落下速度の上限
    f.vx *= Math.exp(-FLARE.DRAG * dt);                                     // 前進が落ちる
    const dx = f.vx * dt, dy = f.vy * dt;

    /* --- 接触（掃引＝フレームをまたいでもすり抜けない） --- */
    let tHit = 1, normal = null, isFloor = false;
    if (solids && solids.length) {
      const c = firstContact(f.x, f.y, FLARE.R, solids, dx, dy, 1);
      if (c) { tHit = c.t; normal = { nx: c.nx, ny: c.ny }; }
    }
    if (ceilY != null && dy < 0) {                                          // 画面上端（天井）
      const tt = ((ceilY + FLARE.R) - f.y) / dy;
      if (tt >= 0 && tt < tHit) { tHit = tt; normal = { nx: 0, ny: 1 }; }
    }
    if (floorY) {                                                           // 海底/下の地形
      const fy = floorY(f.x + dx);
      if (f.y + dy + FLARE.R >= fy) {
        const tt = dy !== 0 ? ((fy - FLARE.R) - f.y) / dy : 1;
        if (tt >= 0 && tt < tHit) { tHit = tt; normal = { nx: 0, ny: -1 }; isFloor = true; }
      }
    }

    /* --- 移動 --- */
    f.x += dx * tHit; f.y += dy * tHit;

    if (normal) {
      if (isFloor || normal.ny <= -0.5) {
        /* 着底（下の地形の上面）＝止めて短く減衰 */
        f.land = true; f.fade = FLARE.FADE; f.vx = 0; f.vy = 0;
      } else {
        /* 壁/天井: 面へ入る成分だけ消す（すり抜けない・滑る） */
        const vn = f.vx * normal.nx + f.vy * normal.ny;
        if (vn < 0) { f.vx -= vn * normal.nx; f.vy -= vn * normal.ny; }
      }
      /* 面からわずかに離す（めり込まない） */
      f.x += normal.nx * 0.5; f.y += normal.ny * 0.5;
    }

    /* --- 軌跡（見た目用の短い残像） --- */
    f.trailT += dt;
    if (f.trailT >= FLARE.TRAIL_DT) {
      f.trailT = 0;
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > FLARE.TRAIL_MAX) f.trail.shift();
    }
  }

  state.flares = state.flares.filter(f => (f.land ? f.fade > 0 : true));
  return state.flares;
}

/** 新しい出撃で持ち越さない。 */
export function resetFlares(state) {
  state.flares.length = 0;
  state.cd = 0;
  state.fired = 0;
}
