/**
 * ABYSS DIVE — 徒歩探索のルール（純粋ロジック / DOM 非依存）
 *
 * 描画・入力の割り当ては explore.js が持ち、ここには「歩く／調べる／撃つ／帰還する」の
 * 判定だけを純粋関数で置く。node --test からそのまま読み込んで検証できる。
 *
 * 座標系は潜航と同じ論理解像度 1280x720（横スクロールの遺跡）。
 *
 * 歩行アニメ（v1.8.1）:
 *   8 コマぶんの実フレーム（接地→踏み込み→すれ違い→蹴り出し × 左右）を持ち、
 *   「歩いている時間」でコマを進める（一定のゆったりした歩調）。移動速度・移動距離・
 *   スティックの倒し込み量は位相に使わない＝歩調と移動を切り離す。歩幅と移動距離は
 *   釣り合わないぶん接地足は滑るが、速さに関係なく歩みは一定に見える。
 *   押しても壁で動けないときは足踏みせず停止（待機）へ。
 */

/** 遺跡（1 マップ）の固定レイアウト。値は描画側 explore.js も参照する。 */
export const EXPLORE_WORLD = Object.freeze({
  W: 2600,             // 遺跡の全長（論理 px）
  GROUND_Y: 566,       // 床のライン。キャラの足元はここに固定する
  MIN_X: 130,          // 歩ける左端
  MAX_X: 2470,         // 歩ける右端
  WALK_SPEED: 310,     // px/s（v1.8.2: 250→310。340以上は将来の改造の余地。スティックはアナログで減速。歩調アニメとは連動しない）
  INTERACT_RANGE: 96,  // これ以内で「調べる／戻る」が有効
  SPAWN_X: 430,        // 降りた直後の立ち位置（入口のすぐ内側）
  EXIT_X: 250,         // 潜航へ戻るハッチ＝探索入口と同じ場所
  RELICS: Object.freeze([
    Object.freeze({ x: 1200, label: '崩れた祭壇' }),
    Object.freeze({ x: 2010, label: '沈んだ石碑' }),
  ]),

  /* --- v1.8.0: 徒歩アニメ（v1.8.1: 位相を時間ベースへ） --- */
  SPRITE_SCALE: 0.78,             // 元絵 1px が論理何 px か（explore.js の SPR.scale と一致）
  WALK_CYCLE_T: 0.90,             // 左右1周期の秒数（一定の歩調。速度・距離は位相に使わない）
  WALK_FRAMES: 8,                 // 歩行コマ数
  START_T: 0.12,                  // 歩き出しモーション秒
  STOP_T: 0.16,                   // 停止モーション秒（コマを足元の構えへ寄せる）
  SURVEY_T: 0.95,                 // 遺物を調べる姿勢変化の秒（非ループ）
  SURVEY_FRAMES: 4,
  FIRE_T: 0.34,                   // 射撃（構え→発射→反動）秒
  FIRE_AIM_T: 0.09,               // 発射までの構え
  FIRE_RECOIL_T: 0.20,            // 発射から反動収束まで
});

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap01 = v => ((v % 1) + 1) % 1;

/** 歩行位相（0..1）をコマ番号（0..7）へ。 */
export function walkFrameOf(phase, world = EXPLORE_WORLD){
  return Math.min(world.WALK_FRAMES - 1, Math.floor(wrap01(phase) * world.WALK_FRAMES));
}

/** いまの姿勢が使うアニメ種別とコマ番号。kind: 'idle'|'start'|'walk'|'survey'。 */
export function animView(st, world = EXPLORE_WORLD){
  if (st.anim === 'survey'){
    return { kind: 'survey', frame: Math.min(world.SURVEY_FRAMES - 1, Math.floor(st.animT / world.SURVEY_T * world.SURVEY_FRAMES)) };
  }
  if (st.anim === 'start') return { kind: 'start', frame: st.animT < world.START_T * 0.5 ? 0 : 1 };
  if (st.anim === 'walk' || st.anim === 'stop') return { kind: 'walk', frame: walkFrameOf(st.walkPhase, world) };
  return { kind: 'idle', frame: 0 };
}

/** 射撃の局面 'aim'|'fire'|'recoil'|null。st.fireT（残り時間）から決める。 */
export function firePhase(st, world = EXPLORE_WORLD){
  if (st.fireT <= 0) return null;
  const elapsed = world.FIRE_T - st.fireT;
  if (elapsed < world.FIRE_AIM_T) return 'aim';
  if (elapsed < world.FIRE_AIM_T + 0.10) return 'fire';
  return 'recoil';
}

/** 探索の状態を作る（1 潜航ぶん。入口を出入りしても遺物の調査状況は保つ）。 */
export function createExploreState(){
  return {
    x: EXPLORE_WORLD.SPAWN_X,
    facing: 1,
    moving: false,
    walkPhase: 0,
    anim: 'idle',         // idle | start | walk | stop | survey
    animT: 0,
    stopFrom: 0,
    stopTarget: 0,
    fireT: 0,             // 射撃アニメの残り時間
    fireArmed: true,      // 次の押下で 1 発撃てるか（タップごとに 1 発）
    interactCd: 0,
    near: null,           // 'relic' | 'exit' | null
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
 *   input = { move: -1..1, action: boolean, shoot: boolean }
 *     action は「押した瞬間だけ true」のエッジ（調べる／戻る）
 *     shoot  は「押した瞬間だけ true」のエッジ（撃つ・キーリピートしない）
 * 返り値: { survey:index|null, return:boolean, blocked:'relic'|null, moved:boolean, shoot:boolean }
 * 同じ遺物の調査報酬は一度だけ（2 回目以降は blocked='relic'）。
 */
export function stepExplore(st, input, dt, world = EXPLORE_WORLD){
  const ev = { survey: null, return: false, blocked: null, moved: false, shoot: false };
  const move = clamp(Number(input && input.move) || 0, -1, 1);

  /* --- 射撃: 移動と同時に入力できる。タップ=1発。ホールド中は射撃サイクル完了ごとに連射 --- */
  st.fireT = Math.max(0, st.fireT - dt);
  if (st.fireT <= 0) st.fireArmed = true;
  const wantFire = !!(input && (input.shoot || input.shootHold));
  if (wantFire && st.fireArmed){
    st.fireArmed = false;
    st.fireT = world.FIRE_T;
    ev.shoot = true;
  }

  /* --- 移動と歩行アニメ（位相は「歩いている時間」で進める＝歩調と移動を切り離す） --- */
  const intent = Math.abs(move) > 0.01;               // 歩行閾値（既存踏襲）
  const x0 = st.x;
  st.x = clamp(st.x + move * world.WALK_SPEED * dt, world.MIN_X, world.MAX_X);
  const moved = Math.abs(st.x - x0) > 1e-9;           // 実際に動いたか（壁で止まれば false）

  if (intent && moved){
    st.facing = move > 0 ? 1 : -1;
    st.moving = true;
    ev.moved = true;
    /* 歩調は時間ベース。移動速度・移動距離・スティック量は使わない */
    st.walkPhase = wrap01(st.walkPhase + dt / world.WALK_CYCLE_T);
    if (st.anim !== 'start' && st.anim !== 'walk'){ st.anim = 'start'; st.animT = 0; }
    st.animT += dt;
    if (st.anim === 'start' && st.animT >= world.START_T) st.anim = 'walk';
  } else {
    /* 入力が無い、または壁に当たって動けない → 足踏みせず停止へ */
    st.moving = false;
    if (st.anim === 'walk' || st.anim === 'start'){
      st.anim = 'stop'; st.animT = 0;
      st.stopFrom = st.walkPhase;
      st.stopTarget = Math.round(st.walkPhase);
    } else if (st.anim === 'stop'){
      st.animT += dt;
      const k = Math.min(1, st.animT / world.STOP_T);
      st.walkPhase = wrap01(st.stopFrom + (st.stopTarget - st.stopFrom) * k);
      if (k >= 1){ st.anim = 'idle'; st.walkPhase = 0; }
    } else if (st.anim !== 'survey'){
      st.anim = 'idle';
    }
  }

  /* --- 調査の姿勢変化（非ループ。動き出すとキャンセルされる） --- */
  if (st.anim === 'survey'){
    if (ev.moved) st.anim = 'idle';
    else {
      st.animT += dt;
      if (st.animT >= world.SURVEY_T) st.anim = 'idle';
    }
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
        st.anim = 'survey'; st.animT = 0;
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
