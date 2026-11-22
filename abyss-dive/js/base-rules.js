/**
 * ABYSS DIVE — 最初のボスの先の海底基地のルール（純粋ロジック / DOM 非依存）
 *
 * v1.10.0: 初回リヴァイアサン撃破のあと、ボスの先に前哨基地が現れる。遠くの進入灯 →
 *   鋼鉄の外壁 → 暖色に照らされた入港ドック と、近づくほど段階的に見える。自分で近づいて
 *   明示操作（E／「入港」ボタン）で入港する（勝手にワープしない）。
 *   室内は有限の安全区画で、スーツなしのエリーが待機・歩行でき、船に戻れば出港する。
 *
 * 座標は潜航・探索と同じ論理解像度 1280x720。
 */

/** 基地の室内（1 画面ぶんの有限の安全区画）。values は描画側 base.js も参照する。 */
export const BASE_WORLD = Object.freeze({
  W: 1280,             // 室内の幅（1 画面。有限の区画＝スクロールしない）
  GROUND_Y: 566,       // 床。エリーの足元はここ
  MIN_X: 420,          // 歩ける左端（接岸した潜水艇の右）
  MAX_X: 1150,         // 歩ける右端
  WALK_SPEED: 220,     // px/s
  INTERACT_RANGE: 200, // これ以内で「出港」が有効（船のそば）
  SPAWN_X: 420,        // 入港直後の立ち位置（船のすぐ内側）
  SHIP_X: 250,         // 潜水艇が接岸している位置（戻る／出港）
  TERMINAL_X: 980,     // v1.11.0: 整備端末の位置（船の船首寄り・出港圏とは重ならない）
  TERMINAL_RANGE: 96,  // v1.11.0: これ以内で「整備」が有効
  SHIP_STATION_X: 660,   // v1.13.0: 艇ドック（乗り換え）。出港圏・端末のどちらとも重ならない
  SHIP_STATION_RANGE: 96, // v1.13.0: これ以内で「換装」が有効
  WALK_CYCLE_T: 260 / 220,   // 歩行 1 周期（歩幅 260 と歩速 220 を一致させ足を滑らせない）
  WALK_FRAMES: 12,     // GIRL walk は 12 コマ
});

/** 潜航側の入港マーカー。撃破した現場から先に置く。 */
export const DIVE_BASE = Object.freeze({
  r: 96,               // ドック本体の半径
  approach: 1600,      // 進入灯が見え始める距離
  wall: 760,           // 鋼鉄の外壁の輪郭が見え始める距離
  dock: 320,           // 暖色に照らされた入港ドックが読める距離
  pad: 60,             // 入港受理の余白（r+pad 以内で受理）
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap01 = v => ((v % 1) + 1) % 1;

/** 最初のボス（リヴァイアサン）を撃破したか。撃破するまで基地は開かない。 */
export function baseOpen(bossKills){
  return (Math.floor(Number(bossKills) || 0)) >= 1;
}

/**
 * 入港マーカー。未開放（撃破前）は null。
 * 開放後は「撃破した現場」より先（右）に置く＝ボスの先へ自走してたどり着く。
 */
export function baseMarker(bossKills, bossX, bossY){
  if (!baseOpen(bossKills)) return null;
  return { x: (Number(bossX) || 0) + 2600, y: Number(bossY) || 0 };
}

/** 進入灯〜外壁〜ドックの段階。near なほど 'dock' に近づく。 */
export function baseStage(px, py, marker){
  if (!marker) return 'none';
  const d = Math.hypot(px - marker.x, py - marker.y);
  if (d <= DIVE_BASE.dock) return 'dock';
  if (d <= DIVE_BASE.wall) return 'wall';
  if (d <= DIVE_BASE.approach) return 'approach';
  return 'none';
}

/** 明示入港の受理範囲（自分で近づいたときだけ true）。 */
export function baseDockNear(px, py, marker){
  if (!marker) return false;
  return Math.hypot(px - marker.x, py - marker.y) <= DIVE_BASE.r + DIVE_BASE.pad;
}

/** 室内の状態（降りた直後）。 */
export function createBaseState(){
  return {
    x: BASE_WORLD.SPAWN_X,
    facing: 1,
    moving: false,
    walkPhase: 0,
    anim: 'idle',        // idle | walk
    animT: 0,
    idleT: 0,
    near: false,         // 船のそば（出港できる）
    nearTerminal: false, // v1.11.0: 整備端末のそば（整備パネルを開ける）
    nearShipStation: false, // v1.13.0: 艇ドックのそば（乗り換えパネルを開ける）
    msg: '',
    msgT: 0,
  };
}

/** 船のそば（出港できる位置）か。 */
export function baseAtShip(st, world = BASE_WORLD){
  return Math.abs(st.x - world.SHIP_X) <= world.INTERACT_RANGE;
}

/** v1.11.0: 整備端末のそば（整備パネルを開ける位置）か。出港圏とは重ならない。 */
export function baseAtTerminal(st, world = BASE_WORLD){
  return Math.abs(st.x - world.TERMINAL_X) <= world.TERMINAL_RANGE;
}

/** v1.13.0: 艇ドック（乗り換え）のそばか。出港圏・整備端末のどちらとも重ならない。 */
export function baseAtShipStation(st, world = BASE_WORLD){
  return Math.abs(st.x - world.SHIP_STATION_X) <= world.SHIP_STATION_RANGE;
}

/**
 * 1 フレームぶん進める。室内は安全（ダメージなし）。
 *   input = { move: -1..1, action: boolean }（action は押した瞬間のエッジ＝出港）
 * 返り値: { moved, depart }。depart は船のそばで action のときだけ true。
 */
export function stepBase(st, input, dt, world = BASE_WORLD){
  const ev = { moved: false, depart: false };
  const move = clamp(Number(input && input.move) || 0, -1, 1);

  st.msgT = Math.max(0, st.msgT - dt);

  const intent = Math.abs(move) > 0.01;
  const x0 = st.x;
  st.x = clamp(st.x + move * world.WALK_SPEED * dt, world.MIN_X, world.MAX_X);
  const moved = Math.abs(st.x - x0) > 1e-9;

  if (intent && moved){
    st.facing = move > 0 ? 1 : -1;
    st.moving = true;
    ev.moved = true;
    st.walkPhase = wrap01(st.walkPhase + dt / world.WALK_CYCLE_T);
    st.anim = 'walk';
    st.animT += dt;
    st.idleT = 0;
  } else {
    st.moving = false;
    st.anim = 'idle';
    st.animT = 0;
    st.idleT += dt;
  }

  st.near = baseAtShip(st, world);
  st.nearTerminal = baseAtTerminal(st, world);
  st.nearShipStation = baseAtShipStation(st, world);
  if (input && input.action && st.near) ev.depart = true;
  return ev;
}
