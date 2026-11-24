/**
 * ABYSS DIVE — 全自動近接（アーム/チェーンソー/ビームソード/実体剣/斧/ハンマー）の純粋ルール
 *   純粋ロジック / DOM 非依存 / 保存・抽選なし（乱数個体の「意味」だけ定義する）。
 *
 * DEEP_FIELD_PLAN.md「潜水艇のレーザー・近接兵装」に対応する試作。
 *   - 近接は全種オート。基地で選んだ 1 種（equip した id）だけが潜航中に作動する。専用ボタンは無い。
 *   - 届く生きた敵がいるときだけ自動で作動。岩越し（遮蔽）・射程外・入港中・徒歩中は作動しない。
 *   - パンチ/ハンマー … 単発（arms を伸ばして一撃・小型を押し返す。ハンマーは強く押し返し、
 *                        大型・固定敵は動かさない）。
 *   - チェーンソー   … 密着している間だけ削る（毎秒ダメージ）＋発熱。離れると止まり、熱は冷える。
 *                        発熱が上限に達すると冷却が進むまで再開しない（稼働時間の弱み）。
 *   - ビームソード/斧 … 前方の弧（arc）内の複数敵を一振りで斬る。同じ敵には一振りにつき一度だけ。
 *                        振り終わりから次の一振りまで再使用待ち。斧は出が遅く一撃が重い。
 *   - 実体剣         … 前へ素早く突き出す細い単体判定（弧が狭い）。発動から命中が早く、隙が小さい。
 *
 * 乱数個体の意味（MELEE_STATS / meleeParams）:
 *   威力 power / 届く距離 reach / 振りの速さ speed / 再使用間隔 cooldown /（チェーンソーは）発熱 heat。
 *   いずれも「1 を基準にした倍率」で、ロール・保存は呼び出し側（本編）が行う。ここは倍率→実値の変換のみ。
 *
 * 遮蔽の幾何は geometry-rules.js の castSegment（最初の1件）を共有する＝反射と同じ「最初の当たり」。
 */

import { castSegment } from './geometry-rules.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angNorm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export const MELEE_MODE = Object.freeze({
  SINGLE:  'single',   // 単発（パンチ/ハンマー）
  SUSTAIN: 'sustain',  // 密着継続（チェーンソー）
  ARC:     'arc',      // 弧で複数（ビームソード/斧）
  THRUST:  'thrust',   // 狭い高速突き（実体剣）
});

/**
 * 個体値の意味（すべて倍率。1 が標準）。better:'low' は小さいほど有利（cooldown / heat）。
 * lo/hi は倍率の上下限（本編 weapon-rules の stats と同じ流儀）。
 */
export const MELEE_STATS = Object.freeze({
  power:    Object.freeze({ id:'power',    name:'威力',       base:1, lo:0.70, hi:1.50, better:'high', desc:'一撃ダメージ／チェーンソーの毎秒ダメージの倍率。' }),
  reach:    Object.freeze({ id:'reach',    name:'届く距離',   base:1, lo:0.75, hi:1.35, better:'high', desc:'前方へ届く距離（px）の倍率。' }),
  speed:    Object.freeze({ id:'speed',    name:'振りの速さ', base:1, lo:0.70, hi:1.40, better:'high', desc:'振りかぶり（windup）を短くする倍率。' }),
  cooldown: Object.freeze({ id:'cooldown', name:'再使用間隔', base:1, lo:0.60, hi:1.45, better:'low',  desc:'一撃後の待ち時間の倍率（小さいほど速い）。' }),
  heat:     Object.freeze({ id:'heat',     name:'発熱',       base:1, lo:0.60, hi:1.50, better:'low',  desc:'チェーンソーの単位時間あたり発熱の倍率（小さいほど有利）。' }),
});

/**
 * 近接武器の定義。base は実値（px / 秒 / ラジアン）。
 *   arc 半角: 前方コーン。single/thrust は arc 内の最近傍 1 体、arc は arc 内の全員、sustain は接触判定。
 *   windup   : 振りかぶり（この後の命中判定）。
 *   active   : 命中ウィンドウ（arc のみ複数フレーム。single/thrust は 0＝即命中）。
 *   push     : 押し返しの大きさ（velocity impulse 相当）。固定/大型敵には掛けない。
 *   hitR     : 判定の太さ（見た目の腕・刃の太さに揃える）。
 */
export const MELEE_TYPES = Object.freeze({
  punch: Object.freeze({
    id:'punch', name:'アームパンチ', short:'パンチ', mode:'single',
    statIds:['power','reach','speed','cooldown'],
    base:Object.freeze({ power:14, reach:150, arc:0.70, windup:0.10, active:0,    cooldown:0.55, push:220, hitR:28 }),
  }),
  chainsaw: Object.freeze({
    id:'chainsaw', name:'チェーンソー', short:'チェーンソー', mode:'sustain',
    statIds:['power','reach','speed','heat'],
    base:Object.freeze({ dps:34, reach:70, arc:1.20, push:40, hitR:30, heatPerSec:0.55, coolPerSec:0.90, resume:0.35 }),
  }),
  beamsaber: Object.freeze({
    id:'beamsaber', name:'ビームソード', short:'ビームソード', mode:'arc',
    statIds:['power','reach','speed','cooldown'],
    base:Object.freeze({ power:22, reach:210, arc:0.90, windup:0.14, active:0.12, cooldown:0.75, push:60, hitR:34 }),
  }),
  axe: Object.freeze({
    id:'axe', name:'斧', short:'斧', mode:'arc',
    statIds:['power','reach','speed','cooldown'],
    base:Object.freeze({ power:40, reach:200, arc:1.15, windup:0.26, active:0.16, cooldown:1.05, push:90, hitR:40 }),
  }),
  phaseblade: Object.freeze({
    id:'phaseblade', name:'実体剣', short:'実体剣', mode:'thrust',
    statIds:['power','reach','speed','cooldown'],
    base:Object.freeze({ power:26, reach:250, arc:0.18, windup:0.06, active:0.05, cooldown:0.50, push:20, hitR:16 }),
  }),
  hammer: Object.freeze({
    id:'hammer', name:'ハンマー', short:'ハンマー', mode:'single',
    statIds:['power','reach','speed','cooldown'],
    base:Object.freeze({ power:34, reach:150, arc:0.70, windup:0.20, active:0,    cooldown:0.95, push:420, hitR:34 }),
  }),
});
export const MELEE_ORDER = Object.freeze(Object.keys(MELEE_TYPES));

/**
 * 個体値の倍率から実パラメータを導く（乱数個体を掛けられる意味を明示）。
 * stats は { power, reach, speed, cooldown, heat } の倍率（未指定は 1）。
 *   power(高)…威力/dps ×、reach(高)…距離 ×、speed(高)…windup ÷、cooldown(低)…待ち ×、heat(低)…発熱 ×。
 */
export function meleeParams(typeId, stats){
  const def = MELEE_TYPES[typeId];
  if (!def) return null;
  const b = def.base;
  const g = id => (stats && typeof stats[id] === 'number' && stats[id] > 0) ? stats[id] : 1;
  return {
    typeId, mode:def.mode, name:def.name, statIds:def.statIds.slice(),
    power:       (b.power != null)      ? b.power * g('power')  : null,
    dps:         (b.dps != null)        ? b.dps * g('power')    : null,
    reach:       b.reach * g('reach'),
    arc:         b.arc,
    windup:      (b.windup != null)     ? (b.windup / g('speed')) : null,
    active:      b.active || 0,
    cooldown:    (b.cooldown != null)   ? b.cooldown * g('cooldown') : null,
    push:        b.push,
    hitR:        b.hitR,
    heatPerSec:  (b.heatPerSec != null) ? b.heatPerSec * g('heat') : null,
    coolPerSec:  b.coolPerSec,
    resume:      b.resume,
  };
}

/** 大型・固定敵は押し返さない（本編のボス・戦車ヤドカリ）。 */
export function defaultIsFixed(e){
  return !!(e && (e.fixed || e.boss || e.kind === 'hermit' || e.kind === 'leviathan' || e.kind === 'squid'));
}

/* 敵の同一性（id が無い敵には WeakMap で一意番号を振る）。 */
const _ids = new WeakMap();
let _n = 0;
function eid(e){
  if (!e || typeof e !== 'object') return String(e);
  let id = _ids.get(e);
  if (id == null){ id = ++_n; _ids.set(e, id); }
  return id;
}

/**
 * 全自動近接の状態機械。装備した 1 種だけが作動する。
 * deps: { isFixed?(e), los?() }（既定はこのファイルの実装）。
 */
export function createMelee(deps){
  const isFixed = (deps && deps.isFixed) || defaultIsFixed;

  let typeId = null, params = null;
  let cd = 0, phase = 'idle', windup = 0, active = 0;
  let heat = 0, overheated = false, inContact = false;
  let locked = null;                       // single/thrust の狙い（開始時に固定）
  let swingHits = new Set();               // arc の同一振り二重命中防止

  const events = [];

  function resetSwing(){ cd = 0; phase = 'idle'; windup = 0; active = 0; locked = null; swingHits.clear(); }

  /** 装備する（id と個体値の倍率）。heat 以外の一時状態を戻す。 */
  function equip(id, stats){
    typeId = id || null;
    params = typeId ? meleeParams(typeId, stats || {}) : null;
    resetSwing();
    return params;
  }

  /* --- 判定ヘルパ --- */

  function inCone(px, py, facing, reach, arc, e){
    const dx = e.x - px, dy = e.y - py;
    const d = Math.hypot(dx, dy);
    if (d - (e.r || 0) > reach) return false;          // 射程外
    if (d < 1e-6) return true;
    const a = angNorm(Math.atan2(dy, dx) - facing);
    return Math.abs(a) <= arc;                          // 前方コーン
  }

  /** 生きた敵で、射程内・前方コーン内・岩越しでない（遮蔽なし）もの。距離の近い順。 */
  function candidates(px, py, facing, reach, arc, enemies, geometry){
    const out = [];
    for (const e of enemies){
      if (!e || e.dead) continue;
      if (!inCone(px, py, facing, reach, arc, e)) continue;
      if (blocked(px, py, e, geometry)) continue;       // 岩越しには作動しない
      out.push({ e, d:Math.hypot(e.x - px, e.y - py) });
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  }

  /** 発射点→敵の縁 の間に地形があるか（castSegment の最初の1件を共有）。 */
  function blocked(px, py, e, geometry){
    if (!geometry || !geometry.length) return false;
    const dx = e.x - px, dy = e.y - py;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return false;
    const ux = dx / d, uy = dy / d;
    const edge = Math.max(0, d - (e.r || 0));
    const hit = castSegment(px, py, px + ux * edge, py + uy * edge, geometry, 0);
    return !!hit;                                       // 敵の手前に地形＝遮蔽
  }

  function emitHit(c, p, dmg, pushMag){
    const e = c.e;
    const mag = isFixed(e) ? 0 : pushMag;               // 大型・固定は押し返さない
    let ix = 0, iy = 0;
    const d = c.d || Math.hypot(e.x - p.x, e.y - p.y) || 1;
    if (mag){ ix = (e.x - p.x) / d * mag; iy = (e.y - p.y) / d * mag; }
    events.push({ type:'hit', weapon:typeId, enemy:e, dmg, push:{ ix, iy }, pushMagnitude:mag });
  }

  /* --- 更新 --- */

  /**
   * @param dt  経過秒
   * @param ctx { mode:'dive'|'base'|'walk', player:{x,y,facing}, enemies:[{x,y,r,dead,...}], geometry:[矩形/円] }
   * @returns {{ typeId, mode, phase, cd, heat, overheated, contact, events:[{type,weapon,enemy,dmg,push}] }}
   */
  function update(dt, ctx){
    events.length = 0;
    dt = dt > 0 ? dt : 0;

    if (!typeId || !params || !ctx || !ctx.player) return result();
    /* 入港中・徒歩中は作動しない（潜航中のみ）。 */
    if (ctx.mode && ctx.mode !== 'dive'){ cd = Math.max(0, cd - dt); tickHeat(dt, false); return result(); }

    const p = ctx.player;
    const facing = (typeof p.facing === 'number') ? p.facing : (typeof ctx.facing === 'number' ? ctx.facing : 0);
    const enemies = ctx.enemies || [];
    const geometry = ctx.geometry || [];

    if (params.mode === MELEE_MODE.SUSTAIN){
      /* チェーンソー: 密着している間だけ削る＋発熱。 */
      const list = candidates(p.x, p.y, facing, params.reach, params.arc, enemies, geometry);
      const contact = list.length > 0;
      inContact = contact;
      if (overheated){
        heat = clamp(heat - (params.coolPerSec || 0) * dt, 0, 1);
        if (heat <= (params.resume != null ? params.resume : 0.35)) overheated = false;
      } else if (contact){
        for (const c of list){
          emitHit(c, p, params.dps * dt, params.push * dt);   // 連続なので dt ぶんの押し
        }
        heat = clamp(heat + (params.heatPerSec || 0) * dt, 0, 1);
        if (heat >= 1){ heat = 1; overheated = true; }
      } else {
        heat = clamp(heat - (params.coolPerSec || 0) * dt, 0, 1);
      }
      return result({ contact });
    }

    /* 単発/弧/突き: 再使用待ちと振りの状態機械。 */
    if (cd > 0) cd = Math.max(0, cd - dt);

    if (phase === 'idle'){
      if (cd <= 0){
        const list = candidates(p.x, p.y, facing, params.reach, params.arc, enemies, geometry);
        if (list.length){
          phase = 'windup'; windup = params.windup || 0;
          if (params.mode === MELEE_MODE.SINGLE || params.mode === MELEE_MODE.THRUST){ locked = list[0].e; }
          else { locked = null; swingHits.clear(); }
          events.push({ type:'start', weapon:typeId });
        }
      }
    } else if (phase === 'windup'){
      windup -= dt;
      if (windup <= 0){
        if (params.mode === MELEE_MODE.SINGLE || params.mode === MELEE_MODE.THRUST){
          /* 単発: 開始時に固定した狙いへ一撃（まだ生きていれば）。 */
          const c = locked ? findAlive(locked, p, facing, params, enemies, geometry) : null;
          if (c) emitHit(c, p, params.power, params.push);
          phase = 'idle'; cd = params.cooldown || 0;
        } else {
          phase = 'active'; active = params.active || 0;
        }
      }
    } else if (phase === 'active'){
      /* 弧: 命中ウィンドウ内の全員を、同じ敵は一度だけ斬る。 */
      const list = candidates(p.x, p.y, facing, params.reach, params.arc, enemies, geometry);
      for (const c of list){
        const id = eid(c.e);
        if (swingHits.has(id)) continue;
        swingHits.add(id);
        emitHit(c, p, params.power, params.push);
      }
      active -= dt;
      if (active <= 0){ phase = 'idle'; cd = params.cooldown || 0; }
    }

    return result({ contact:false });
  }

  function findAlive(e, p, facing, prm, enemies, geometry){
    if (!e || e.dead) return null;
    if (!inCone(p.x, p.y, facing, prm.reach, prm.arc, e)) return null;
    if (blocked(p.x, p.y, e, geometry)) return null;
    return { e, d:Math.hypot(e.x - p.x, e.y - p.y) };
  }

  function tickHeat(dt, contact){
    if (params && params.mode === MELEE_MODE.SUSTAIN){
      heat = clamp(heat - (params.coolPerSec || 0) * dt, 0, 1);
    }
  }

  function result(extra){
    return Object.assign({
      typeId, mode: params ? params.mode : null, phase, cd, heat, overheated,
      contact: inContact, events: events.slice(),
    }, extra || {});
  }

  return {
    equip,
    equipped: () => typeId,
    params:   () => params,
    update,
    /** 選択中の武器・進捗（表示用）。 */
    state: () => ({ typeId, mode: params ? params.mode : null, phase, cd, heat, overheated, contact: inContact }),
    /** 一時状態を戻す（heat は据え置き）。出港・再開で持ち越さない用途。 */
    reset: resetSwing,
  };
}
