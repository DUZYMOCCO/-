/**
 * ABYSS DIVE — 徒歩探索のルール（純粋ロジック / DOM 非依存）
 *
 * 描画・入力の割り当ては explore.js が持ち、ここには「歩く／調べる／帰還する」の
 * 判定だけを純粋関数で置く。node --test からそのまま読み込んで検証できる。
 *
 * 座標系は潜航と同じ論理解像度 1280x720（横スクロールの遺跡）。
 */

/** 遺跡（1 マップ）の固定レイアウト。値は描画側 explore.js も参照する。 */
export const EXPLORE_WORLD = Object.freeze({
  W: 2600,             // 遺跡の全長（論理 px）
  GROUND_Y: 566,       // 床のライン。キャラの足元はここに固定する
  MIN_X: 130,          // 歩ける左端
  MAX_X: 2470,         // 歩ける右端
  WALK_SPEED: 250,     // px/s（スティックはアナログで減速）
  INTERACT_RANGE: 96,  // これ以内で「調べる／戻る」が有効
  SPAWN_X: 430,        // 降りた直後の立ち位置（入口のすぐ内側）
  EXIT_X: 250,         // 潜航へ戻るハッチ＝探索入口と同じ場所
  WALK_FRAME: 0.18,    // 歩行アニメのコマ送り秒
  RELICS: Object.freeze([
    Object.freeze({ x: 1200, label: '崩れた祭壇' }),
    Object.freeze({ x: 2010, label: '沈んだ石碑' }),
  ]),
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 探索の状態を作る（1 潜航ぶん。入口を出入りしても遺物の調査状況は保つ）。 */
export function createExploreState(){
  return {
    x: EXPLORE_WORLD.SPAWN_X,
    facing: 1,
    moving: false,
    animT: 0,
    frame: 0,                                   // 0=待機 1=歩行A 2=歩行B
    interactCd: 0,
    near: null,                                 // 'relic' | 'exit' | null
    relicDone: EXPLORE_WORLD.RELICS.map(() => false),
    surveyedCount: 0,
    msg: '',
    msgT: 0,
    lastEvent: null,
  };
}

/** いま操作できる対象（入口を優先、次に近い遺物）。INTERACT_RANGE 内のみ返す。 */
export function nearestInteractable(st, world = EXPLORE_WORLD){
  const range = world.INTERACT_RANGE;
  if (Math.abs(st.x - world.EXIT_X) <= range) return { kind: 'exit', x: world.EXIT_X };
  let best = null, bestD = range;
  for (let i = 0; i < world.RELICS.length; i++){
    const d = Math.abs(st.x - world.RELICS[i].x);
    if (d <= bestD){ bestD = d; best = { kind: 'relic', index: i, x: world.RELICS[i].x }; }
  }
  return best;
}

/**
 * 1 フレームぶん状態を進める。
 *   input = { move: -1..1, action: boolean }   action は「押した瞬間だけ true」のエッジ。
 * 返り値のイベント: { survey:index|null, return:boolean, blocked:'relic'|null, moved:boolean }
 * 同じ遺物の調査報酬は一度だけ（2 回目以降は blocked='relic'）。
 */
export function stepExplore(st, input, dt, world = EXPLORE_WORLD){
  const ev = { survey: null, return: false, blocked: null, moved: false };
  const move = clamp(Number(input && input.move) || 0, -1, 1);

  if (Math.abs(move) > 0.01){
    st.x = clamp(st.x + move * world.WALK_SPEED * dt, world.MIN_X, world.MAX_X);
    st.facing = move > 0 ? 1 : -1;
    st.moving = true;
    ev.moved = true;
    st.animT += dt;
    if (st.animT >= world.WALK_FRAME){ st.animT -= world.WALK_FRAME; st.frame = st.frame === 1 ? 2 : 1; }
  } else {
    st.moving = false;
    st.animT = 0;
    st.frame = 0;
  }

  st.interactCd = Math.max(0, st.interactCd - dt);
  st.msgT = Math.max(0, st.msgT - dt);

  const target = nearestInteractable(st, world);
  st.near = target ? target.kind : null;

  if (input && input.action && st.interactCd <= 0 && target){
    st.interactCd = 0.4;
    if (target.kind === 'relic'){
      if (!st.relicDone[target.index]){
        st.relicDone[target.index] = true;
        st.surveyedCount++;
        ev.survey = target.index;
        st.msg = '遺物を調査した';
        st.msgT = 1.8;
      } else {
        ev.blocked = 'relic';
        st.msg = 'この遺物は調査済み';
        st.msgT = 1.2;
      }
    } else if (target.kind === 'exit'){
      ev.return = true;
    }
  }

  st.lastEvent = ev;
  return ev;
}
