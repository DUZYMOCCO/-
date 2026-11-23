/**
 * ABYSS DIVE — 基地のルール（純粋ロジック / DOM 非依存）
 *
 * v1.10.0: 初回リヴァイアサン撃破のあと、ボスの先に前哨基地が現れる。遠くの進入灯 → 鋼鉄の
 *   外壁 → 暖色に照らされた入港ドック と段階的に見え、自分で近づいて明示操作で入港する
 *   （勝手にワープしない）。 ⇒ 入港ゲートは v1.16.0 も不変。
 *
 * v1.16.0: 室内を「徒歩で設備まで歩く」から「入港直後に出る直接メニュー」へ。
 *   - 入港するとすぐ、親メニュー（整備・改造 / 艇の換装 / 武器（製作・換装） / 出港）が開く。
 *     子メニュー（既存パネル）を閉じると親へ戻る。出港は他と明確に分離した項目。
 *   - エリーは操作対象ではなく**背景で自律行動**する。待つ・歩く・周囲を見る・
 *     艇/端末/製作台を点検する、を自然な間隔で少数選ぶ（idle / walk の既存アニメのみ）。
 *     メニュー操作・資源・装備・出港には一切影響しない（見た目だけ）。
 *
 * 座標は潜航・探索と同じ論理解像度 1280x720。
 */

/** 基地の室内（1 画面ぶんの有限の安全区画）。values は描画側 base.js も参照する。 */
export const BASE_WORLD = Object.freeze({
  W: 1280,             // 室内の幅（1 画面。有限の区画＝スクロールしない）
  GROUND_Y: 566,       // 床。エリーの足元はここ
  MIN_X: 420,          // エリーが動ける左端（接岸した潜水艇の右）
  MAX_X: 1150,         // エリーが動ける右端
  WALK_SPEED: 220,     // （旧）歩行速度 px/s。エリーの速度は ELLIE_SPEED
  SPAWN_X: 420,        // 入港直後のエリーの立ち位置（船のすぐ内側）
  SHIP_X: 250,         // 潜水艇が接岸している位置（描画の目印・点検の基準）
  TERMINAL_X: 980,     // 整備端末の位置（船の船首寄り）
  SHIP_STATION_X: 660, // 艇ドック（乗り換え）の位置
  WEAPON_STATION_X: 820, // 武器製作台（製造・換装）の位置
  WALK_CYCLE_T: 260 / 220,   // 歩行 1 周期（歩幅 260 と歩速 220 を一致させ足を滑らせない）
  WALK_FRAMES: 12,     // GIRL walk は 12 コマ
});

/** エリー（背景）の速度。プレイヤー操作ではないので、落ち着いた速さにする。 */
export const ELLIE_SPEED = 128;   // px/s

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

/* ==========================================================================
   親メニュー（入港直後に出る直接メニュー）
   整備・改造 / 艇の換装 / 武器（製作・換装） を並べ、出港だけを分離する。
   選択（カーソル）と実行（決定）は別操作＝誤出港しない。
   ========================================================================== */
export const BASE_MENU = Object.freeze([
  Object.freeze({ id:'upgrade', label:'整備・改造',          note:'船体修理・性能改造',         icon:'gear' }),
  Object.freeze({ id:'ship',    label:'艇の換装',            note:'別の艇へ乗り換える',         icon:'hull' }),
  Object.freeze({ id:'weapon',  label:'武器（製作・換装）',  note:'製造・比較・強化・換装',     icon:'shell' }),
  Object.freeze({ id:'forge',   label:'開発（指定・近接）',  note:'特性の指定開発・近接を選ぶ', icon:'forge' }),
  Object.freeze({ id:'depart',  label:'出港',                note:'潜航へ戻る',                 icon:'depart', separate:true }),
]);

/** カーソルを範囲へ丸める。 */
export function menuIndex(st, len = BASE_MENU.length){
  return Math.max(0, Math.min(Math.max(0, len - 1), Math.floor(Number(st && st.cursor) || 0)));
}

/** 選択中の項目。 */
export function menuSelected(st){
  return BASE_MENU[menuIndex(st)];
}

/** 親メニューのカーソル移動（dir は -1/0/+1）。選択だけで、実行はしない。 */
export function menuMove(st, dir, len = BASE_MENU.length){
  if (!st) return;
  const d = dir > 0 ? 1 : (dir < 0 ? -1 : 0);
  st.cursor = menuIndex({ cursor: menuIndex(st, len) + d }, len);
}

/* ==========================================================================
   エリー（背景で自律行動）。操作は受けず、既存の idle / walk だけで自然に動く。
   ========================================================================== */

/** 点検して回る設備（エリーが立つ x と、そのとき向く設備の x）。 */
const ELLIE_SPOTS = Object.freeze([
  { stand: BASE_WORLD.MIN_X + 18, look: BASE_WORLD.SHIP_X },                    // 接岸した潜水艇
  { stand: BASE_WORLD.SHIP_STATION_X - 52, look: BASE_WORLD.SHIP_STATION_X },   // 艇ドック
  { stand: BASE_WORLD.WEAPON_STATION_X - 50, look: BASE_WORLD.WEAPON_STATION_X }, // 武器製作台
  { stand: BASE_WORLD.TERMINAL_X - 48, look: BASE_WORLD.TERMINAL_X },           // 整備端末
]);

export function createEllieState(){
  return {
    x: BASE_WORLD.SPAWN_X,
    facing: 1,
    anim: 'idle',        // idle | walk（既存アニメのみ）
    walkPhase: 0,
    animT: 0,
    idleT: 0,
    mode: 'idle',        // idle | walk
    dwell: 1.4,          // 立ち止まっている残り時間（自然な間隔）
    goalX: BASE_WORLD.SPAWN_X,
    lookX: null,         // 点検の目標（その方向を向く）。null なら着いた向きのまま
    turned: false,       // 立ち止まり中に一度「周囲を見る」で向きを変えたか
  };
}

/** 次に選ぶ行動（少数）。rng は 0..1 を返す関数（テストで注入できる）。 */
function ellieNextGoal(el, world, rng){
  const r = rng();
  if (r < 0.34){                                   // ぶらつく
    el.goalX = clamp(world.MIN_X + rng() * (world.MAX_X - world.MIN_X), world.MIN_X, world.MAX_X);
    el.lookX = null;
  } else if (r < 0.64){                            // 設備を点検（艇/ドック/製作台/端末）
    const spot = ELLIE_SPOTS[Math.floor(rng() * ELLIE_SPOTS.length) % ELLIE_SPOTS.length];
    el.goalX = spot.stand; el.lookX = spot.look;
  } else if (r < 0.82){                            // その場で少し長く待つ
    el.goalX = el.x; el.lookX = null;
  } else {                                         // 少しだけ動いて、また止まる
    el.goalX = clamp(el.x + (rng() < 0.5 ? -1 : 1) * (70 + rng() * 140), world.MIN_X, world.MAX_X);
    el.lookX = null;
  }
}

/**
 * エリーを 1 フレーム進める（純粋）。入力は受けない。
 * 返り値: { moving }（歩いているか）。メニュー状態には触れない。
 */
export function stepEllie(el, dt, world = BASE_WORLD, rng = Math.random){
  const r = (typeof rng === 'function') ? rng : Math.random;
  const d = Math.max(0, Number(dt) || 0);
  if (el.mode === 'walk'){
    const dx = el.goalX - el.x;
    const step = ELLIE_SPEED * d;
    if (Math.abs(dx) <= step || step <= 0){
      el.x = clamp(el.goalX, world.MIN_X, world.MAX_X);
      el.mode = 'idle';
      el.anim = 'idle';
      el.animT = 0; el.idleT = 0; el.turned = false;
      el.dwell = 1.2 + r() * 3.2;                        // 立ち止まって待つ/見る（1.2〜4.4s）
      if (el.lookX != null) el.facing = (el.lookX >= el.x) ? 1 : -1;   // 点検先を向く
      else if (r() < 0.42) el.facing = (r() < 0.5) ? -1 : 1;           // たまに反対を向く
      el.lookX = null;
      return { moving: false };
    }
    el.x = clamp(el.x + Math.sign(dx) * step, world.MIN_X, world.MAX_X);
    el.facing = dx > 0 ? 1 : -1;
    el.anim = 'walk';
    el.walkPhase = wrap01(el.walkPhase + d / world.WALK_CYCLE_T);
    el.animT += d;
    el.idleT = 0;
    return { moving: true };
  }

  /* idle: 立ち止まって待つ・周囲を見る */
  el.anim = 'idle';
  el.idleT += d;
  if (!el.turned && el.lookX == null && el.idleT > 0.7){
    el.facing = -el.facing;                             // 一度だけ向きを変える＝周囲を見る
    el.turned = true;
  }
  if (el.idleT >= el.dwell){
    ellieNextGoal(el, world, r);
    if (Math.abs(el.goalX - el.x) < 5){                 // ほぼ同じ場所なら、もう少し待つ
      el.dwell = 1.4 + r() * 2.6; el.idleT = 0;
      return { moving: false };
    }
    el.mode = 'walk';
    return { moving: true };
  }
  return { moving: false };
}

/* ==========================================================================
   v1.17.0: 基地 UI の文言と段取り（純粋・テスト可能）。
   『決定』『捨てる』ではなく、起きることを書く
   （装備する / 製作する / 強化する / 売却する / 出港する / 戻る）。PC のキー表示も同じ行為に揃える。
   ========================================================================== */

/** 親メニューの決定ボタンの文言（選択中の項目で変わる）。 */
export function menuActionLabel(id){
  switch (id){
    case 'upgrade': return '整備・改造へ';
    case 'ship':    return '艇の換装へ';
    case 'weapon':  return '武器（製作・換装）へ';
    case 'forge':   return '開発（指定・近接）へ';
    case 'depart':  return '出港する';
    default:        return '決定';
  }
}

/** 子パネルの主ボタンの文言。『決定』をやめ、押すと起きることを書く。 */
export function rowActionLabel(panelKind, row){
  if (!row) return '戻る';
  if (panelKind === 'upgrade') return (row.kind === 'repair') ? '修理する' : '強化する';
  if (panelKind === 'ship')    return '換装する';
  if (panelKind === 'weapon')  return (row.kind === 'make') ? '製作する' : '装備する';
  if (panelKind === 'forge'){
    if (row.kind === 'design')  return '開発する';
    if (row.kind === 'confirm') return '製作する';
    return '装備する';                      // shot / missile / item / melee
  }
  return '決定';
}

/** 主／副ボタンと PC キーの対応（同じ行為に同じキーを割り当てる）。 */
export const ACTION_KEY_HINT = Object.freeze({
  primary:'E', enhance:'C', sell:'X', back:'Esc', adjust:'←→',
});

/* エリー（背景）の表示上の全高。帯（窓）の高さを決めるのに使う。 */
export const ELLIE_HEIGHT = 87;

/**
 * 基地 UI の段取り（論理解像度 1280x720）。
 *   主要文字を約 2 倍にするため、情報は上部のパネルへ寄せ、
 *   下の帯（bandTop..720）はエリーの全身と動きが見える領域として空ける。
 */
export const BASE_UI = Object.freeze({
  panelX: 56, panelW: 1168, panelY: 16, panelH: 444,   // 16..460
  titleH: 52,
  rowH: 58, rowGap: 6,
  menuRowsTop: 72, menuRowH: 56, menuRowGap: 6, menuVisible: 5,
  childRowsTop: 72, childVisible: 4,
  bandTop: 460,
});

/** エリーの全身（足元=GROUND_Y、頭=GROUND_Y-ELLIE_HEIGHT）が帯の上に収まるか。 */
export function ellieFullyVisibleInBand(bandTop = BASE_UI.bandTop, groundY = BASE_WORLD.GROUND_Y){
  return (groundY - ELLIE_HEIGHT) >= bandTop + 4;
}

/* ==========================================================================
   室内の状態（メニュー + 背景のエリー）。画面遷移は base.js が行う。
   入港/退場のたびに作り直す＝状態を再初期化する。
   ========================================================================== */
export function createBaseState(){
  return {
    screen: 'menu',      // 'menu' | 'upgrade' | 'ship' | 'weapon' | 'forge'
    cursor: 0,           // 親メニューの選択位置
    msg: '',
    msgT: 0,
    ellie: createEllieState(),
  };
}
