// 高さ（v0.4.7-dev、10/24 13:18 の決定）: 中身は数値 z（ワールド px。0＝地面・水面、上が＋、水の中が−）で持ち、
// ルールの判定は「空・地上（水上）・水中」の3つの帯に置き換えて行う。
// あとで低空と高空を分ける・高い所から射程が伸びる、などを足すときは、この表と定数を直すだけで済むようにしてある。
// データと計算だけ（DOM・Pixi・乱数なし）。数値・ルールはすべてここで調整する。
// 今のミッションには空・水中の機体がいないので、この仕組みを入れても遊び・リプレイ・バランスは変わらない
// （tests/altitude.test.mjs が、入れる前のコードと同じ結果になることを確かめている）。
// 10/24 13:21 の決定: 水は2種類。浅瀬（足がつく。どの機体も地上の帯のまま入れる・少し重い）と、深い水（水中の帯を持つ
//   水陸両用の専用機だけ。専用機は陸・浅瀬・深い水のどこでも動け、深い水にいる間は z<0＝水中）。今のマップの水は「深い水」。
// 参考: story_outline_v2.md（地形の適性: 地上・海・水中・宇宙・空、飛行装置）、weapon_roster_v0.md「地形の共通ルール【仮】」

/** 帯（ルールの判定に使う段） */
export const BAND = Object.freeze({ UNDERWATER: 'underwater', SURFACE: 'surface', AIR: 'air' });

/** z → 帯の閾値（ワールド px）【仮】 */
export const ALT = Object.freeze({
  underwaterBelow: 0,   // z がこれより小さい（＝水面より下）なら水中
  airFrom: 24,          // z がこれ以上なら空。0〜24 未満は地上（跳ねる・段差の上、など）
  demoAirZ: 40,         // お試しの空の機体の高さ
  diveZ: -14,           // 水陸両用機が深い水にいる間の z（潜っている深さ）
  zDistanceK: 0,        // 帯の違う相手との距離に |z の差| × この係数を足す（今は無効）
  highGroundRangeK: 0,  // 自分が相手より高いとき、射程に (z の差) × この係数を足す（今は無効）
});

/** z → 帯 */
export function bandOf(z = 0) {
  if (z < ALT.underwaterBelow) return BAND.UNDERWATER;
  if (z >= ALT.airFrom) return BAND.AIR;
  return BAND.SURFACE;
}
export const unitBand = u => bandOf(u?.z || 0);

// ---- 武器のタグ ----
/** 武器の type → タグ。ranged＝射撃（弾・砲・投げ）、melee＝近接 */
export const TYPE_TAGS = Object.freeze({
  shoot: Object.freeze(['ranged']), cannon: Object.freeze(['ranged']), throw: Object.freeze(['ranged']), jam: Object.freeze(['ranged']),
  melee: Object.freeze(['melee']), trap: Object.freeze(['trap']), barrier: Object.freeze(['support']), repair: Object.freeze(['support']),
});
/** 武器の id ごとに足すタグ（武器の表 weapons.js に列を足すまでの間、ここで持つ） */
export const WEAPON_TAGS = Object.freeze({
  'W3-12': Object.freeze(['torpedo']),    // 鼻先魚雷管
  'W3-13': Object.freeze(['shockwave']),  // 衝撃波ハサミ
  'W3-02': Object.freeze(['fire']),       // 両手火炎放射器
  'W3-11': Object.freeze(['antiair']),    // お腹の対空砲（今は印だけ。空への補正は未決）
});
/** 武器の行 → タグの一覧（type から・id の表から・行の tags 列から）。武器なし（null）は空 */
export function weaponTags(w) {
  if (!w) return [];
  const out = [...(TYPE_TAGS[w.type] || []), ...(WEAPON_TAGS[w.id] || []), ...(w.tags || [])];
  return [...new Set(out)];
}
export const hasTag = (w, tag) => weaponTags(w).includes(tag);

// ---- 攻撃が届くか（帯 × 帯の表）【仮】 ----
// 値: 'all'＝どの武器でも届く / タグの並び＝そのどれかを持つ武器だけ届く / 'none'＝届かない
const ALL = 'all', NONE = 'none';
export const REACH = Object.freeze({
  [BAND.SURFACE]: Object.freeze({
    [BAND.SURFACE]: ALL,                          // 今までどおり
    [BAND.AIR]: Object.freeze(['ranged']),       // 地上 → 空: 射撃だけ（近接は届かない）
    [BAND.UNDERWATER]: Object.freeze(['torpedo', 'shockwave']), // 水中の相手には魚雷・衝撃波だけ
  }),
  [BAND.AIR]: Object.freeze({
    [BAND.SURFACE]: ALL,                          // 空 → 地上: 届く
    [BAND.AIR]: ALL,                              // 同じ帯どうしは今までどおり
    [BAND.UNDERWATER]: Object.freeze(['torpedo', 'shockwave']),
  }),
  [BAND.UNDERWATER]: Object.freeze({
    [BAND.SURFACE]: Object.freeze(['torpedo']),  // 水中 → 水上・地上: 魚雷だけ
    [BAND.AIR]: NONE,                             // 水中 → 空: 届かない【仮・未決】
    [BAND.UNDERWATER]: ALL,                       // 同じ帯どうしは今までどおり
  }),
});
/** 帯ごとに使えない武器のタグ（weapon_roster_v0.md: 水中では火炎は使えない）。撃つ側の帯で見る */
export const BAND_FORBIDS = Object.freeze({
  [BAND.SURFACE]: Object.freeze([]),
  [BAND.AIR]: Object.freeze([]),
  [BAND.UNDERWATER]: Object.freeze(['fire']),
});

/** attacker が weapon で target に攻撃を届かせられるか。attacker・target は z を持つもの（機体）。両方地上なら必ず true（今までどおり） */
export function canHit(attacker, target, weapon) {
  const a = unitBand(attacker), b = unitBand(target);
  if (a === BAND.SURFACE && b === BAND.SURFACE) return true;
  const tags = weaponTags(weapon);
  if (BAND_FORBIDS[a].some(t => tags.includes(t))) return false;
  const rule = REACH[a][b];
  if (rule === ALL) return true;
  if (rule === NONE) return false;
  return rule.some(t => tags.includes(t));
}

// ---- 遮蔽物・地形の守り ----
/** 遮蔽物（木・残骸。地上に立っている物）が効くか: [撃つ側の帯][撃たれる側の帯]【仮】。空・水中の相手には効かない */
export const COVER_APPLIES = Object.freeze({
  [BAND.SURFACE]: Object.freeze({ [BAND.SURFACE]: true, [BAND.AIR]: false, [BAND.UNDERWATER]: false }),
  [BAND.AIR]: Object.freeze({ [BAND.SURFACE]: true, [BAND.AIR]: false, [BAND.UNDERWATER]: false }),
  [BAND.UNDERWATER]: Object.freeze({ [BAND.SURFACE]: true, [BAND.AIR]: false, [BAND.UNDERWATER]: false }),
});
export const coverApplies = (attacker, target) => COVER_APPLIES[unitBand(attacker)][unitBand(target)];
/** 足元の地形の守り（森・山で受けるダメージが減る）が効く帯。空にいる相手には効かない */
export const TERRAIN_DEF_APPLIES = Object.freeze({ [BAND.SURFACE]: true, [BAND.AIR]: false, [BAND.UNDERWATER]: true });
export const terrainDefApplies = target => TERRAIN_DEF_APPLIES[unitBand(target)];

// ---- 距離・射程 ----
/** 2機の距離。帯が違えば |z の差| × zDistanceK を足す（今は係数 0 なので平面の距離と同じ） */
export function altDistance(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (!ALT.zDistanceK || unitBand(a) === unitBand(b)) return d;
  return d + ALT.zDistanceK * Math.abs((a.z || 0) - (b.z || 0));
}
/** 高さで変わる射程（今は係数 0 なので base のまま） */
export function rangeVs(attacker, target, base) {
  if (!ALT.highGroundRangeK) return base;
  return base + ALT.highGroundRangeK * Math.max(0, (attacker.z || 0) - (target.z || 0));
}

// ---- 移動（どの地形を通れるか） ----
/** 動き方（機体が持つ「移動できる帯」の一覧の中身）。ground＝地上、sea＝水上、underwater＝水中、air＝空 */
export const MOVE = Object.freeze({ GROUND: 'ground', SEA: 'sea', UNDERWATER: 'underwater', AIR: 'air' });
/** 動き方 → 帯 */
export const MOVE_BAND = Object.freeze({ ground: BAND.SURFACE, sea: BAND.SURFACE, underwater: BAND.UNDERWATER, air: BAND.AIR });
/** 既定の動き方（今までの機体はみな地上だけ） */
export const DEFAULT_MOVES = Object.freeze([MOVE.GROUND]);
/** 地形（map.js の TERRAIN の key）× 動き方 → 経路のコスト。書いていない＝通れない【仮】
 *  地上は map.js の TERRAIN の cost と同じ。空（飛行装置）は地形の影響を受けない（燃料・重さは未決）。 */
export const MOVE_COST = Object.freeze({
  plain: Object.freeze({ ground: 1, air: 1 }),
  forest: Object.freeze({ ground: 1.6, air: 1 }),
  mountain: Object.freeze({ ground: 2.6, air: 1 }),
  shallow: Object.freeze({ ground: 1.8, sea: 1, air: 1 }), // 浅瀬: 地上の機体も入れる（map.js の TERRAIN の cost と同じ値）
  water: Object.freeze({ sea: 1, underwater: 1, air: 1 }),   // 深い水: 水上・水中・空だけ
});
/** その動き方の一覧で、地形 key を通るときのコスト（いちばん安い動き方）。通れなければ Infinity */
export function moveCost(terrainKey, moves = DEFAULT_MOVES) {
  const row = MOVE_COST[terrainKey]; if (!row) return Infinity;
  let c = Infinity;
  for (const m of moves) { const v = row[m]; if (v != null && v < c) c = v; }
  return c;
}
export const canMoveOn = (terrainKey, moves = DEFAULT_MOVES) => moveCost(terrainKey, moves) < Infinity;

/** 足元の地形に合わせた z（毎ステップ、既定でない動き方を持つ機体だけ sim が呼ぶ）。
 *  空にいる機体はそのまま（離着陸・燃料は未決）。深い水の上で水中の動き方を持つなら潜る（diveZ）。それ以外は 0（地面・水面）。 */
export function settleZ(u, terrainKey) {
  const z = u.z || 0;
  if (bandOf(z) === BAND.AIR) return z;
  const moves = u.moves || DEFAULT_MOVES;
  if (terrainKey === 'water' && moves.includes(MOVE.UNDERWATER) && !moves.includes(MOVE.SEA)) return ALT.diveZ;
  return 0;
}

// ---- 乗る（未実装・後で） ----
// 人間がロボットの背中や中に乗るときは、乗っている人の位置と z は乗せている機体のものを毎ステップ写す（捕まった人間を運ぶ
// sim.js の updateCarry と同じ形）。帯は unitBand(乗せている機体) になるので、canHit・coverApplies はそのまま使える。

// ---- お試しの機体（テストと ?altdemo=1 の画面だけ。本編のミッションには出さない） ----
/** 種類ごとの z と動き方の上書き。sim の setup の行に { ...ALT_TEST_UNITS.air } を混ぜて使う。
 *  水中テスト機は水陸両用（陸・浅瀬は地上の帯、深い水に入ると潜る） */
export const ALT_TEST_UNITS = Object.freeze({
  air: Object.freeze({ z: ALT.demoAirZ, moves: Object.freeze([MOVE.AIR]), name: '空テスト機' }),
  underwater: Object.freeze({ z: 0, moves: Object.freeze([MOVE.GROUND, MOVE.UNDERWATER]), name: '水中テスト機' }),
});
/** 浅瀬と深い水のあるお試しのマップ（テスト・?altdemo=1 用）。generateMap の結果の上に、本陣の近くへ池を1つ掘る */
export function carveDemoPond(map, T, cx, cy) {
  for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 6; x <= cx + 6; x++) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
    const d = ((x - cx) / 6) ** 2 + ((y - cy) / 4) ** 2;
    if (d <= 0.45) map.tiles[y * map.w + x] = T.WATER; else if (d <= 1) map.tiles[y * map.w + x] = T.SHALLOW;
  }
  return map;
}
