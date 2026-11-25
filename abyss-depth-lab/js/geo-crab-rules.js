/**
 * ABYSS DIVE — 地層背負いの巨蟹（仮）: 遭遇の純粋ルール（DOM 非依存）
 *
 * 起伏のある黒玄武岩に擬態する、幅広の海底大型蟹。殻を背負うヤドカリではなく、
 * 岩そのものに見える。前脚（近側の 1 本）を持ち上げた一瞬にだけ生物だと分かる。
 *
 * 攻撃は「鈍重な近側前脚の一振り」だけ:
 *   dormant（岩） → alert → wind（予告・脚を上げるが無害） → swing（見えている脚の範囲だけ当たる）
 *   → recover → alert …
 * 触手・弾幕・泳ぐボス の焼き直しにしない（弾を撃たない・地形に張り付く）。
 *
 * 描画と当たりは同じ geoCrabLeg の式を共有する（見えない当たり／見えるのに当たらないを作らない）。
 * 更に「殻は硬い」: 序盤装備では極小、強化装備なら明確に通る。露出関節（軟部）は通るが、
 * 序盤の絶対値は小さく楽勝にはならない。弾は無効化しない（イベント無敵・進行フラグで弾を消さない）。
 */

export const GEO_CRAB = Object.freeze({
  BODY_W: 1040,          // 殻の幅（艇の約 6.9 倍。実画面の合流広間で読める大きさ）
  BODY_H: 360,           // 殻の高さ
  LEG_L1: 300,           // 前脚 上腕
  LEG_L2: 320,           // 前脚 前腕
  LEG_R: 26,             // 前脚の当たり太さ（描画と同じ）
  CLAW_R: 34,            // 先端の爪の当たり
  SOFT_R: 78,            // 露出関節（軟部）の判定半径。脚を上げた一瞬（wind/swing）だけ有効
  DETECT_R: 900,         // これ以内で「岩」から警戒へ（予告はまだ出さない）
  ATTACK_R: 760,         // これ以内かつ前方で一振りする
  TELL: 1.1,             // 予告（脚を上げる）の長さ s
  SWING: 0.42,           // 振り（当たる窓）の長さ s
  RECOVER: 1.25,         // 復帰 s
  IDLE: 2.0,             // 振りと振りの間 s
  MAX_HP: 1500,          // 殻の硬さ＋この HP で「序盤は歯が立たない」
  ARMOR_BODY: 10,        // 殻の平準化装甲（これ以下の弾はほぼ弾かれる。序盤魚雷 1.5 は完全に弾かれる）
  ARMOR_SOFT: 3,         // 露出関節は柔らかい
  FLOOR_BODY: 0.06,      // 殻に弾かれた時の下限（0 にはしない＝実際に少し減る）
  FLOOR_SOFT: 0.35,      // 軟部の下限
  REWARD: 1200,          // 1 遭遇の撃破資源
});

/* 姿勢（前脚の 2 関節角。x=前方, y=下向き正）。 */
const POSE = Object.freeze({
  rest:  Object.freeze({ a1: -0.10, a2: 0.90 }),
  wind:  Object.freeze({ a1: -1.05, a2: 1.55 }),
  swing: Object.freeze({ a1: 0.05, a2: 0.10 }),
  dead:  Object.freeze({ a1: 0.34, a2: 0.05 }),
});

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const d2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };

/** 線分と点の距離の二乗。 */
function segDist2(ax, ay, bx, by, px, py) {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy;
  let t = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
  t = clamp01(t);
  const cx = ax + vx * t, cy = ay + vy * t;
  return d2(cx, cy, px, py);
}

/** いまの姿勢（状態と残り時間から補間）。 */
export function geoCrabPose(e) {
  switch (e.state) {
    case 'wind':    { const t = 1 - clamp01(e.st / GEO_CRAB.TELL); return { a1: lerp(POSE.rest.a1, POSE.wind.a1, t), a2: lerp(POSE.rest.a2, POSE.wind.a2, t) }; }
    case 'swing':   { const t = 1 - clamp01(e.st / GEO_CRAB.SWING); return { a1: lerp(POSE.wind.a1, POSE.swing.a1, t), a2: lerp(POSE.wind.a2, POSE.swing.a2, t) }; }
    case 'recover': { const t = 1 - clamp01(e.st / GEO_CRAB.RECOVER); return { a1: lerp(POSE.swing.a1, POSE.rest.a1, t), a2: lerp(POSE.swing.a2, POSE.rest.a2, t) }; }
    case 'dead':    return { a1: POSE.dead.a1, a2: POSE.dead.a2 };
    default:        return { a1: POSE.rest.a1, a2: POSE.rest.a2 };
  }
}

/**
 * 近側前脚の関節（世界座標）。描画と当たりの両方がこれを共有する。
 * @returns {{shoulder:{x,y}, knee:{x,y}, tip:{x,y}, clawR:number, legR:number, active:boolean, lifted:boolean}}
 */
export function geoCrabLeg(e) {
  const s = { a1: POSE.rest.a1, a2: POSE.rest.a2 };
  const p = e.dead ? { a1: POSE.dead.a1, a2: POSE.dead.a2 } : geoCrabPose(e);
  const d = e.dir || 1;
  const sx = e.x + d * GEO_CRAB.BODY_W * 0.30;
  const sy = e.y - GEO_CRAB.BODY_H * 0.06;
  const kx = sx + d * GEO_CRAB.LEG_L1 * Math.cos(p.a1);
  const ky = sy + GEO_CRAB.LEG_L1 * Math.sin(p.a1);
  const a2 = p.a1 + p.a2;
  const tx = kx + d * GEO_CRAB.LEG_L2 * Math.cos(a2);
  const ty = ky + GEO_CRAB.LEG_L2 * Math.sin(a2);
  return {
    shoulder: { x: sx, y: sy }, knee: { x: kx, y: ky }, tip: { x: tx, y: ty },
    clawR: GEO_CRAB.CLAW_R, legR: GEO_CRAB.LEG_R,
    active: e.state === 'swing',
    lifted: e.state === 'wind' || e.state === 'swing' || e.state === 'recover',
  };
}

/** 新しい巨蟹を作る。y は殻の中心（床は floorY）。 */
export function createGeoCrab(x, y, floorY, opts = {}) {
  const o = opts || {};
  return {
    kind: 'geo_crab',
    x, y, floorY,
    dir: (o.dir === 1 || o.dir === -1) ? o.dir : -1,
    state: 'dormant', st: 0,
    hp: (o.hp != null) ? o.hp : GEO_CRAB.MAX_HP,
    maxHp: (o.hp != null) ? o.hp : GEO_CRAB.MAX_HP,
    dead: false,
    swingHit: false,        // 1 振りにつき 1 回だけ当てるためのラッチ
    t: 0, flash: 0,
    r: GEO_CRAB.BODY_W * 0.5,   // 汎用の当たり半径（体の概形。楕円判定は geoCrabBodyHit）
  };
}

/**
 * 状態を dt 進める。返り値は 1 フレームのイベント（音・予告の合図用）。
 * ダメージの適用は呼び出し側（ゲーム）が geoCrabLegTouch で行う。
 */
export function stepGeoCrab(e, dt, player) {
  const ev = [];
  e.t += dt;
  if (e.flash > 0) e.flash -= dt;
  if (e.dead) { e.st = 0; return ev; }
  const p = player;
  const dist = p ? Math.hypot(p.x - e.x, p.y - e.y) : Infinity;
  // 向きは常にプレイヤー側（振る方向が読める）
  if (p) e.dir = (p.x >= e.x) ? 1 : -1;

  switch (e.state) {
    case 'dormant':
      if (p && p.alive && dist < GEO_CRAB.DETECT_R) { e.state = 'alert'; e.st = GEO_CRAB.IDLE; ev.push('alert'); }
      break;
    case 'alert': {
      e.st -= dt;
      if (e.st <= 0) {
        const inFront = p && ((p.x - e.x) * e.dir) > -GEO_CRAB.BODY_W * 0.25;
        if (p && p.alive && dist < GEO_CRAB.ATTACK_R && inFront) { e.state = 'wind'; e.st = GEO_CRAB.TELL; ev.push('tell'); }
        else { e.st = GEO_CRAB.IDLE; }
      }
      break;
    }
    case 'wind':
      e.st -= dt;
      if (e.st <= 0) { e.state = 'swing'; e.st = GEO_CRAB.SWING; e.swingHit = false; ev.push('swingStart'); }
      break;
    case 'swing':
      e.st -= dt;
      if (e.st <= 0) { e.state = 'recover'; e.st = GEO_CRAB.RECOVER; ev.push('swingEnd'); }
      break;
    case 'recover':
      e.st -= dt;
      if (e.st <= 0) { e.state = 'alert'; e.st = GEO_CRAB.IDLE; }
      break;
  }
  return ev;
}

/** 見えている前脚の範囲に当たっているか（振り中のみ）。 */
export function geoCrabLegTouch(e, px, py, pr) {
  if (e.dead || e.state !== 'swing') return false;
  const l = geoCrabLeg(e);
  const rl = l.legR + pr;
  if (segDist2(l.shoulder.x, l.shoulder.y, l.knee.x, l.knee.y, px, py) < rl * rl) return true;
  const rc = l.clawR + pr;
  if (segDist2(l.knee.x, l.knee.y, l.tip.x, l.tip.y, px, py) < rc * rc) return true;
  return false;
}

/** 体（殻の塊＝楕円）に当たっているか。弾はここで殻に当たる。 */
export function geoCrabBodyHit(e, x, y, r = 0) {
  if (e.dead) return false;
  const rx = GEO_CRAB.BODY_W * 0.5 + r;
  const ry = GEO_CRAB.BODY_H * 0.46 + r;
  const nx = (x - e.x) / rx, ny = (y - e.y) / ry;
  return nx * nx + ny * ny <= 1;
}

/**
 * 当たり箇所の判定: 'soft'（露出関節＝脚を上げた一瞬だけ） / 'body'（殻） / null。
 * 同じ点でも、脚が下りている（岩のまま）時は軟部にならない＝擬態が崩れない。
 */
export function geoCrabHitZone(e, x, y) {
  if (e.dead) return null;
  const l = geoCrabLeg(e);
  /* 軟部は「前脚を上げた一瞬」（wind/swing）の膝関節まわりだけ。
     recover（脚を下ろす途中）や通常姿勢では殻のまま＝正面から撃っても楽勝にならない。 */
  if (l.active || e.state === 'wind') {
    if (d2(x, y, l.knee.x, l.knee.y) < GEO_CRAB.SOFT_R * GEO_CRAB.SOFT_R) return 'soft';
  }
  if (geoCrabBodyHit(e, x, y, 0)) return 'body';
  return null;
}

/**
 * 装甲を通した実ダメージ。殻は平準化装甲で弾くが 0 にはしない（＝弾無効にしない）。
 * 序盤装備は極小、装甲を越える強化装備は明確に通る。
 */
export function geoCrabDamage(e, dmg, zone = 'body') {
  if (e.dead) return 0;
  const d = Math.max(0, Number(dmg) || 0);
  if (d <= 0) return 0;
  const soft = zone === 'soft';
  const armor = soft ? GEO_CRAB.ARMOR_SOFT : GEO_CRAB.ARMOR_BODY;
  const floorMul = soft ? GEO_CRAB.FLOOR_SOFT : GEO_CRAB.FLOOR_BODY;
  return Math.max(d - armor, d * floorMul);
}

/** 1 遭遇だけの巨蟹。撃破報酬は一度きり、撃破後に再スポーンしない。 */
export function createCrabEncounter() {
  let crab = null;
  let defeated = false;
  return {
    spawn(c) {
      if (defeated) return false;
      crab = c;
      return true;
    },
    crab() { return crab; },
    isDefeated() { return defeated; },
    /** 撃破時の報酬（同じ遭遇では一度だけ）。 */
    onDefeat() {
      if (defeated) return { reward: 0, first: false };
      defeated = true;
      return { reward: GEO_CRAB.REWARD, first: true };
    },
  };
}
