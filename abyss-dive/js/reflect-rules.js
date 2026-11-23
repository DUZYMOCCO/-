/**
 * ABYSS DIVE — 反射レーザー / 反射魚雷の純粋ルール（DOM 非依存 / 保存なし）
 *
 * DEEP_FIELD_PLAN.md「潜水艇のレーザー・近接兵装」に対応する試作。
 *   - 実際に当たる岩棚・壁（= 反射する幾何 solids）の面で跳ね返る。
 *   - 反射は 1 回まで（maxReflect）。総射程や弾の寿命は反射で回復しない（距離は反射で延長しない）。
 *   - 見た目の経路（points）と実当たり（hits / end）を同じ計算で出す＝背景だけの岩や敵では反射しない。
 *   - 壁の角や狭所で弾が固着・無限反射しない（法線方向へわずかに離してから次の区間へ）。
 *   - 反射は速度ベクトルを面法線で鏡映するだけ（速さ＝大きさは不変）。
 *
 * geometry-rules.js の castSegment（最初の1件）を土台にし、線分 vs 図形の式を共有する。
 * ここは数値・状態だけ。描画（game.js / base.js）は呼び出し側。
 */

import { castSegment } from './geometry-rules.js';

/** 既定の反射上限（本編と同じ「まず反射は1回まで」）。 */
export const MAX_REFLECT = 1;
/** 角で固着しないための面からの押し出し量（px）。 */
export const DEFAULT_NUDGE = 0.75;

/**
 * 速度ベクトル (vx,vy) を面法線 (nx,ny) で鏡映する。大きさ（速さ）は保存される。
 * v' = v − 2 (v·n) n
 */
export function reflectDir(vx, vy, nx, ny){
  const d = vx * nx + vy * ny;
  return { x: vx - 2 * d * nx, y: vy - 2 * d * ny };
}

/** (nx,ny) 方向へ eps だけ離した点を返す（角・狭所での固着防止）。 */
export function nudgeOff(x, y, nx, ny, eps = DEFAULT_NUDGE){
  return { x: x + nx * eps, y: y + ny * eps };
}

/**
 * 反射する光線/弾の経路を1本たどる。可視経路と実当たりを同じ1回の計算で返す。
 *
 * @param {object} opts
 *   x0,y0   発射点
 *   dir     {x,y}（内部で正規化）または {a:角度[rad]}
 *   dist    残りの総射程（反射で延長しない）
 *   solids  反射する地形（矩形 w,h / 円 r。本編の trench solids・rocks と同形）
 *   targets 吸収する対象（敵 AABB/円。反射せず、当たればそこで止まる）
 *   maxReflect 反射の上限（既定 1）
 *   pad     当たりの余白（壁など）
 *   nudge   面からの押し出し量
 * @returns {{
 *   points:{x:number,y:number}[],   // 可視経路（発射点 → 反射点 → … → 終点）
 *   hits:{x,y,t,nx,ny,kind,ref}[],  // 当たり順（kind: 'solid'|'target'）
 *   reflected:number,               // 実際に反射した回数
 *   end:{x,y}, endKind:'length'|'solid'|'target',
 *   dir:{x,y},                      // 終了時の進行方向（反射後の向き）
 *   target:object|null,             // 最後に当たった target 図形
 *   remain:number                   // 使い切らずに残った距離
 * }}
 */
export function traceReflect(opts){
  const { x0, y0, dist } = opts;
  const solids  = opts.solids  || [];
  const targets = opts.targets || [];
  const maxReflect = (opts.maxReflect == null) ? MAX_REFLECT : opts.maxReflect;
  const pad   = opts.pad   || 0;
  const nudge = (opts.nudge == null) ? DEFAULT_NUDGE : opts.nudge;

  let dx, dy;
  if (opts.dir && typeof opts.dir.a === 'number'){ dx = Math.cos(opts.dir.a); dy = Math.sin(opts.dir.a); }
  else { dx = opts.dir.x; dy = opts.dir.y; }
  let L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;

  let px = x0, py = y0, remain = Math.max(0, dist), reflected = 0;
  const points = [{ x:px, y:py }];
  const hits = [];
  let end = { x:px, y:py }, endKind = 'length', target = null;

  const MAX_LEGS = 64;                       // 暴走防止（上限反射 1 なら通常 2 区間）
  for (let leg = 0; leg < MAX_LEGS; leg++){
    if (remain <= 1e-9){ endKind = 'length'; end = { x:px, y:py }; break; }
    const x1 = px + dx * remain, y1 = py + dy * remain;
    const hs = castSegment(px, py, x1, y1, solids, pad);
    const ht = castSegment(px, py, x1, y1, targets, 0);

    let first = null, fkind = null;
    if (hs && ht){ if (ht.t < hs.t){ first = ht; fkind = 'target'; } else { first = hs; fkind = 'solid'; } }
    else if (hs){ first = hs; fkind = 'solid'; }
    else if (ht){ first = ht; fkind = 'target'; }

    if (!first){                             // 何にも当たらない → 残り距離ぶん進んで終了
      px = x1; py = y1; remain = 0;
      points.push({ x:px, y:py }); end = { x:px, y:py }; endKind = 'length';
      break;
    }

    remain = Math.max(0, remain - first.t * remain);   // 距離は消費される（延長しない）
    px = first.x; py = first.y;
    points.push({ x:px, y:py });
    hits.push({ x:px, y:py, t:first.t, nx:first.nx, ny:first.ny, kind:fkind, ref:first.ref });
    end = { x:px, y:py };

    if (fkind === 'target'){ endKind = 'target'; target = first.ref; break; }
    if (reflected >= maxReflect){ endKind = 'solid'; break; }     // 反射枠を使い切った

    const r = reflectDir(dx, dy, first.nx, first.ny);
    const rl = Math.hypot(r.x, r.y) || 1; dx = r.x / rl; dy = r.y / rl;
    const n = nudgeOff(px, py, first.nx, first.ny, nudge);         // 角で固着しない
    px = n.x; py = n.y;
    reflected++;
  }

  return { points, hits, reflected, end, endKind, dir:{ x:dx, y:dy }, target, remain };
}

/**
 * 反射魚雷を 1 フレーム進める。速さ・寿命は反射で変わらない（距離だけ消費）。
 * 反射直後に誘導で折り返すような処理はここに無い（本編の誘導とは分離）。
 *
 * @param p   { x, y, vx, vy, life, reflected, dead }
 * @param dt  経過秒
 * @param env { solids, targets, pad, nudge, maxReflect }
 * @returns {{
 *   p:{x,y,vx,vy,life,reflected,dead},   // 更新後の弾（life は据え置き＝延長しない）
 *   path:{x,y}[], hits:[], reflected:number, dead:boolean
 * }}
 */
export function advanceProjectile(p, dt, env){
  const out = Object.assign({}, p);
  if (!p || p.dead || dt <= 0) return { p:out, path:[{ x:out.x, y:out.y }], hits:[], reflected:0, dead:!!(p && p.dead) };
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  if (speed < 1e-6) return { p:out, path:[{ x:out.x, y:out.y }], hits:[], reflected:0, dead:false };

  const maxReflect = (env && env.maxReflect != null) ? env.maxReflect : MAX_REFLECT;
  const budget = Math.max(0, maxReflect - (p.reflected || 0));    // 反射は合計 maxReflect まで
  const tr = traceReflect({
    x0:p.x, y0:p.y, dir:{ x:p.vx, y:p.vy }, dist: speed * dt,
    solids:(env && env.solids) || [], targets:(env && env.targets) || [],
    maxReflect:budget, pad:(env && env.pad) || 0, nudge:(env && env.nudge == null ? DEFAULT_NUDGE : env.nudge),
  });

  out.x = tr.end.x; out.y = tr.end.y;
  out.reflected = (p.reflected || 0) + tr.reflected;
  out.vx = tr.dir.x * speed;                                       // 速さ（大きさ）は保存
  out.vy = tr.dir.y * speed;
  let dead = false;
  if (tr.endKind === 'target') dead = true;                        // 敵に当たった
  else if (tr.endKind === 'solid') dead = true;                    // 反射できず地形に当たった
  out.dead = !!(p.dead || dead);
  return { p:out, path:tr.points, hits:tr.hits, reflected:tr.reflected, dead:out.dead };
}

/**
 * 即着のレーザー（押して撃つ細い光線）1 発分。可視経路と実当たりを1回の計算で返す。
 * 見た目の折れ線（points）の終点と当たり判定（hits の最後）が常に一致する。
 */
export function fireLaser(opts){
  return traceReflect(Object.assign({ maxReflect: (opts.maxReflect == null ? MAX_REFLECT : opts.maxReflect) }, opts));
}
