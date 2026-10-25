// 遮蔽物（木・建物の残骸）。v0.4.0-dev（10/23 23:29 の決定）: 役目は3つだけ。
//   1) 弾を止める（確率）  2) 撃たれると壊れる  3) 壊れたら物を落とす（拾える）
//   見通しは切らない。通り抜けられる（経路探索は変えない）。敵・味方どちらにも効く。
// データと計算だけ（DOM・Pixi・Math.random なし）。乱数は sim.rng() を呼ぶ側が渡す。数値はすべてここで調整する。
// v0.4.0-dev（10/24 0:07 の決定）: 落とし物の「武器パーツ（攻撃 ×1.3・30秒）」をやめて「新しい武器が手に入る」にした。
import { WEAPONS, weaponById, KIND_WEAPON, weaponPower } from './weapons.js?v=5';

/** 調整用のつまみ（ここだけ見れば数値がわかる） */
export const COVER = Object.freeze({
  margin: 14,        // 遮蔽物の足場（楕円）の外側この px までは「すぐ横」＝守られる
  damagedAt: 0.5,    // HP がこの割合以下で「傷んだ」見た目
  // 種類ごと: block＝止める確率, hp, rx/ry＝足場の楕円の半径（ワールド px。足元から上に ry ずれた所が中心）, drop＝落とし物の表
  kinds: Object.freeze({
    tree: Object.freeze({ name: '木', block: 0.25, hp: 60, rx: 34, ry: 16, drop: 'light' }),
    ruins: Object.freeze({ name: '町の残骸', block: 0.5, hp: 200, rx: 118, ry: 40, drop: 'medium' }),
    housing: Object.freeze({ name: '住居跡', block: 0.5, hp: 180, rx: 112, ry: 48, drop: 'medium' }),
    highrise: Object.freeze({ name: 'ビル残骸', block: 0.7, hp: 400, rx: 104, ry: 54, drop: 'heavy' }),
  }),
});

/** 落とし物の中身 */
export const ITEMS = Object.freeze({
  repair: Object.freeze({ name: 'リペアキット', heal: 0.5 }),             // 最大HPのこの割合だけ回復（満タンのロボットは持ち物に足す。sim.js の MAX_CARRIED_KITS まで）
  weapon: Object.freeze({ name: '武器' }),                                // 武器の表から1つ（WEAPON_DROP）。中身は落ちた時に決まる
});

/**
 * 落とし物の武器の決まり。
 * - 候補: 武器の表（68 種）のうち slot が weapon で、type が types のもの（修理・バリア・罠・妨害は出ない）
 * - 重み: 「いまの装備の格」（生きている味方の武器の格の最大）＋ above を山に、spread 離れると 0 になる三角形
 * - 装備: 拾った機体の枠が受け付ける type（accepts）で、いまの武器より強ければ、そのミッションの間その武器に持ちかえる
 * - 強さの差は攻撃力の倍率にする: (新しい強さ ÷ その機体の元の武器の強さ)^mulExp、1〜maxMul（撃つ間隔・届く距離は機体のまま）
 */
export const WEAPON_DROP = Object.freeze({
  types: Object.freeze(['shoot', 'cannon', 'throw', 'melee']),
  above: 2,
  spread: 6,
  mulExp: 0.5,
  maxMul: 1.6,
  accepts: Object.freeze({ // 機体の種類 → 持てる武器の type。書いていない種類（ツギハギ・人）は持たない（拾うと保管だけ）
    ponco: Object.freeze(['shoot', 'cannon', 'throw']),
    gunner: Object.freeze(['shoot', 'throw']),
    heavy: Object.freeze(['cannon', 'shoot']),
  }),
});

/** 壊れたときの抽選表（重み）。none＝何も出ない */
export const DROPS = Object.freeze({
  light: Object.freeze([['none', 55], ['repair', 35], ['weapon', 10]]),
  medium: Object.freeze([['none', 25], ['repair', 45], ['weapon', 30]]),
  heavy: Object.freeze([['none', 0], ['repair', 50], ['weapon', 50]]),
});

/** 拾う決まり */
export const PICKUP = Object.freeze({
  radius: 16,                         // 機体の足元がこの px 以内に来たら拾う
  life: 60,                           // 落ちてからこの秒数で消える
  sides: Object.freeze(['ally']),     // 拾える側（異星生物は拾わない）
});

/** ミッション1（マップ seed 7）の置き場所。タイル座標＝足元。art は assets/landmarks/ の絵 */
export const COVER_LAYOUT = Object.freeze([
  { kind: 'tree', art: 'tree-leafy_v1', tx: 16, ty: 47 },
  { kind: 'tree', art: 'tree-sparse_v1', tx: 29, ty: 48 },
  { kind: 'ruins', art: 'town-ruins_v1', tx: 8, ty: 45 },
  { kind: 'housing', art: 'housing-remains_v1', tx: 31, ty: 41 },
  { kind: 'highrise', art: 'highrise-remains_v1', tx: 24, ty: 24 },
  { kind: 'tree', art: 'tree-dead_v1', tx: 6, ty: 24 },
  { kind: 'housing', art: 'housing-remains_v2', tx: 14, ty: 16 },
  { kind: 'tree', art: 'tree-leafy_v1', tx: 22, ty: 13 },
]);

const TILE = 32;

/** 置き場所の並び → 遮蔽物の状態。座標はワールド px（x,y＝足元、cx,cy＝足場の楕円の中心） */
export function createCover(layout = COVER_LAYOUT) {
  return layout.map((p, id) => {
    const k = COVER.kinds[p.kind];
    if (!k) throw new Error(`遮蔽物の種類がない: ${p.kind}`);
    const x = p.x ?? (p.tx + 0.5) * TILE, y = p.y ?? (p.ty + 0.5) * TILE;
    return { id, kind: p.kind, art: p.art || null, x, y, cx: x, cy: y - k.ry, rx: k.rx, ry: k.ry, hp: k.hp, maxHp: k.hp, state: 'intact', hits: 0 };
  });
}

/** 楕円の中か（pad px だけ広げて見る） */
export function insideCover(c, x, y, pad = 0) {
  const dx = (x - c.cx) / (c.rx + pad), dy = (y - c.cy) / (c.ry + pad);
  return dx * dx + dy * dy <= 1;
}

/** 線分 (x1,y1)→(x2,y2) が楕円を通るなら、最初に入る位置の割合 t（0..1）。通らなければ -1 */
export function segmentEnters(c, x1, y1, x2, y2) {
  const ax = (x1 - c.cx) / c.rx, ay = (y1 - c.cy) / c.ry, bx = (x2 - c.cx) / c.rx, by = (y2 - c.cy) / c.ry;
  const dx = bx - ax, dy = by - ay, A = dx * dx + dy * dy, B = 2 * (ax * dx + ay * dy), C = ax * ax + ay * ay - 1;
  if (C <= 0) return 0;               // 始まりがもう中
  if (A === 0) return -1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return -1;
  const t = (-B - Math.sqrt(disc)) / (2 * A);
  return t >= 0 && t <= 1 ? t : -1;
}

/**
 * この遮蔽物が、撃つ側 s から 撃たれる側 t への弾を「止められる位置」にあるか。
 * 条件: 壊れていない ・ 撃たれる側が足場の中かすぐ横（margin）・ 撃つ側は足場の外 ・ 弾の線が足場を通る（＝間にある）
 * 返り値: 止められるなら当たる位置の割合 t（0..1）、だめなら -1
 */
export function coverBlocks(c, sx, sy, tx, ty) {
  if (c.state === 'rubble' || c.hp <= 0) return -1;
  if (!insideCover(c, tx, ty, COVER.margin)) return -1;
  if (insideCover(c, sx, sy)) return -1;
  return segmentEnters(c, sx, sy, tx, ty);
}

/** 弾を止められる遮蔽物のうち、撃たれる側にいちばん近いもの → { cover, t }（なければ null） */
export function findCover(covers, sx, sy, tx, ty) {
  let best = null, bd = Infinity;
  for (const c of covers) {
    const t = coverBlocks(c, sx, sy, tx, ty);
    if (t < 0) continue;
    const d = Math.hypot(c.cx - tx, c.cy - ty);
    if (d < bd) { bd = d; best = { cover: c, t }; }
  }
  return best;
}

/** 遮蔽物に dmg を与える。返り値: 'broke'（この一撃で壊れた）/ 'damaged'（傷んだ見た目になった）/ null */
export function damageCover(c, dmg) {
  if (c.state === 'rubble') return null;
  const was = c.state;
  c.hp = Math.max(0, c.hp - dmg); c.hits++;
  if (c.hp <= 0) { c.state = 'rubble'; return 'broke'; }
  if (c.hp <= c.maxHp * COVER.damagedAt) c.state = 'damaged';
  return c.state !== was ? 'damaged' : null;
}

/** 抽選表から1つ（r は 0..1 の乱数）。'none' なら null */
export function rollDrop(table, r) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  let x = r * total;
  for (const [item, w] of table) { if (x < w) return item === 'none' ? null : item; x -= w; }
  const last = table[table.length - 1][0];
  return last === 'none' ? null : last;
}

/** その機体がこの落とし物を拾えるか */
export function canPickUp(u, item) {
  if (!PICKUP.sides.includes(u.side) || u.hp <= 0 || u.captured != null) return false;
  if (item.type === 'repair' && u.hp >= u.maxHp) return false;
  return Math.hypot(u.x - item.x, u.y - item.y) <= PICKUP.radius;
}

/** その機体がいま持っている武器の行（拾った武器か、種類の元の武器）。人間など武器のない種類は null */
export const weaponOfUnit = u => (u.weapon && weaponById(u.weapon)) || weaponById(KIND_WEAPON[u.kind]);

/** いまの装備の格: 生きている味方（捕まっていない）の武器の格の最大 */
export function gearTier(units) {
  let t = 0;
  for (const u of units) if (u.side === 'ally' && u.hp > 0 && u.captured == null) { const w = weaponOfUnit(u); if (w && w.slot === 'weapon') t = Math.max(t, w.tier); }
  return t;
}

/** 落ちうる武器と重み → [[row, weight], ...]（重み 0 は入れない） */
export function weaponPool(gear) {
  const peak = gear + WEAPON_DROP.above;
  return WEAPONS.filter(w => w.slot === 'weapon' && WEAPON_DROP.types.includes(w.type))
    .map(w => [w, 1 - Math.abs(w.tier - peak) / WEAPON_DROP.spread]).filter(([, wt]) => wt > 1e-9);
}

/** 武器を1つ抽選（r は 0..1）→ 武器の id。候補がなければ null */
export function rollWeapon(gear, r) {
  const pool = weaponPool(gear);
  if (!pool.length) return null;
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [w, wt] of pool) { if (x < wt) return w.id; x -= wt; }
  return pool[pool.length - 1][0].id;
}

/** その機体がこの武器に持ちかえるか（枠が受け付けて、いまの武器より強い） */
export function canEquip(u, row) {
  const acc = WEAPON_DROP.accepts[u.kind];
  if (!row || !acc || !acc.includes(row.type)) return false;
  const cur = weaponOfUnit(u);
  return !cur || weaponPower(row) > weaponPower(cur);
}

/** 武器を持った時の攻撃力の倍率（その機体の種類の元の武器と比べる） */
export function weaponMul(kind, row) {
  const base = weaponById(KIND_WEAPON[kind]);
  if (!base || !row) return 1;
  const m = Math.pow(weaponPower(row) / weaponPower(base), WEAPON_DROP.mulExp);
  return Math.min(WEAPON_DROP.maxMul, Math.max(1, m));
}

/** 持っている武器の一覧に足す（同じ物はかぶっても数を増やす）。新しい一覧を返す */
export function addOwned(owned, id) {
  const o = { ...(owned || {}) };
  o[id] = (o[id] || 0) + 1;
  return o;
}

/** 拾った効き目を機体にかける。item は落とし物（type・weapon）。返り値: { equipped }（武器に持ちかえたか） */
export function applyItem(u, item) {
  if (item.type === 'repair') { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * ITEMS.repair.heal); return { equipped: false }; }
  if (item.type === 'weapon') {
    const row = weaponById(item.weapon);
    if (!canEquip(u, row)) return { equipped: false };
    u.weapon = row.id; u.wmul = weaponMul(u.kind, row);
    return { equipped: true };
  }
  return { equipped: false };
}

/** 武器込みの攻撃力 */
export const atkOf = u => u.atk * (u.wmul || 1);
