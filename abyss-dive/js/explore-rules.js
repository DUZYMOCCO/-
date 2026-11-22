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

  /* --- v1.9.0: 遺跡内の地上敵（試作・1 体だけ）。床に立つ箱で判定する --- */
  FOE: Object.freeze({
    x: 900,              // 初期位置（降艇地点 430 から少し奥）
    w: 200, h: 196,      // 当たり判定の箱（床に立つ。弾は線分で掃引するのですり抜けない）
    hp: 3,               // 弾 1 発につき 1 ダメージ
    speed: 172,          // 追跡の速さ
    triggerRange: 340,   // これ以内で予兆（alert）に入る（降艇直後は範囲外）
    disengageRange: 560, // これより離れると引き返す（引いて対処できる）
    attackRange: 112,    // これ以内で踏み込みの準備（wind）
    alertT: 0.90,        // 予兆の長さ（この間は動かない＝撃つ／引く猶予）
    windT: 0.34,         // 踏み込み前の溜め
    lungeT: 0.22,        // 踏み込みの持続
    lungeSpeed: 620,     // 踏み込みの速さ
    recoverT: 0.90,      // 踏み込み後の硬直
    dmg: 25,             // 踏み込みの一撃ダメージ
    contactR: 96,        // 踏み込みの接触半径（体の前）
    deathT: 0.85,        // 撃破演出の長さ（のけぞり→沈む→消える）。無害・撃てないは撃破の瞬間から
  }),

  /* 徒歩銃の弾。銃口・弾道は explore.js の SHOOT（muzzleX 218 / muzzleY 80）と
     SPR（feetX 96 / feetY 275 / scale 0.78）に一致させる（見た目と判定を同じ値に）。 */
  GUN: Object.freeze({
    muzzleDx: (218 - 96) * 0.78,   // 銃口の前方オフセット（論理px）
    muzzleUp: (275 - 80) * 0.78,   // 床からの銃口高さ
    speed: 1500,                   // 既存の曳光弾と同じ速さ
    life: 0.14,                    // 既存の曳光弾と同じ寿命＝射程約 210px
    r: 5,                          // 弾の太さ（当たり判定）
  }),

  /* --- v1.10.1: 銃を下へ向ける（地面の敵の胴/甲殻の高さへ）。銃口・閃光・曳光・実弾を
     すべて同じ計算（aimVector）から取る。背後の敵へは向けない。標的が無ければ水平（自然な姿勢）。 --- */
  AIM: Object.freeze({
    pivotDx: (122 - 96) * 0.78,    // 支点（肩の関節）の前方オフセット（explore.js SHOOT.pivotX 122 と一致）
    pivotUp: (275 - 88) * 0.78,    // 床からの支点の高さ（explore.js SHOOT.pivotY 88 と一致）
    targetUp: 80,                  // 狙う高さ＝G06（活動絵）の胴/甲殻の重心（床から約80px。実画像から算出）
    maxAngle: 0.30,                // 下向きの上限（≈17°。これ以上曲げると肩が割れて見える）
    minForward: 40,                // 支点より前方にこの距離以上いる敵だけ狙う（背後の敵へは向けない）
    maxRange: 640,                 // これより遠い敵は自然な姿勢（引き返し距離より少し広い）
  }),

  /* 探索者の体力（潜航の船体 HP とは別系統） */
  PLAYER: Object.freeze({ hp: 100, inv: 0.80, hurtT: 0.35 }),

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

/** 敵の当たり判定の箱（床に立つ。左上基準）。 */
export function foeBox(foe, world = EXPLORE_WORLD){
  const F = world.FOE;
  return { x: foe.x - F.w / 2, y: world.GROUND_Y - F.h, w: F.w, h: F.h };
}

/**
 * 線分 (x0,y0)-(x1,y1) が箱（左上 x,y／幅 w／高さ h、pad で太らせ）に触れるか。
 * Liang–Barsky のクリップ。高速の弾が 1 フレームで飛んでも「すり抜けない」ように使う。
 */
export function segHitBox(x0, y0, x1, y1, box, pad = 0){
  const minX = box.x - pad, maxX = box.x + box.w + pad;
  const minY = box.y - pad, maxY = box.y + box.h + pad;
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;      // 平行: 範囲内なら継続
    const t = q / p;
    if (p < 0){ if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, x0 - minX) && clip(dx, maxX - x0)
      && clip(-dy, y0 - minY) && clip(dy, maxY - y0);
}

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

/* --- v1.10.1: 地面の敵へ銃を下へ向ける --- */

/** 交戦可能な敵か（撃てる・生きている・動いている＝休眠/引き返し中でない）。 */
export function foeEngaged(f){
  return !!f && f.alive === true &&
    (f.state === 'alert' || f.state === 'chase' || f.state === 'wind' ||
     f.state === 'lunge' || f.state === 'recover');
}

/**
 * 銃を下へ向ける角度 θ（rad, 0=水平 / 正=下向き）。
 * 前方の交戦可能な敵の胴/甲殻の高さ（AIM.targetUp）へ向ける。背後の敵・遠すぎる敵・
 * 標的が無いときは 0（自然な水平姿勢）。上限 AIM.maxAngle で曲げすぎを防ぐ。
 */
export function aimAngle(st, world = EXPLORE_WORLD){
  const A = world.AIM, f = st.foe;
  if (!foeEngaged(f)) return 0;
  const pivotX = st.x + A.pivotDx * st.facing;
  const fwd = st.facing * (f.x - pivotX);      // 支点から前方の距離（向きで符号が変わる）
  if (fwd <= A.minForward) return 0;           // 背後・真上 → 狙わない（勝手に背後へ撃たない）
  if (fwd > A.maxRange) return 0;              // 遠すぎる → 自然な姿勢
  const drop = A.pivotUp - A.targetUp;         // 支点から胴の高さまでの落差
  if (drop <= 0) return 0;
  return Math.max(0, Math.min(A.maxAngle, Math.atan2(drop, fwd)));
}

/**
 * 見える銃口・閃光・曳光・実弾の「発生座標」と「向き」を同じ計算から返す。
 *   θ=0 のとき 銃口=(x, y)=既存の銃口、向き=(facing, 0)=既存の水平弾道（従来と寸分違わない）。
 */
export function aimVector(st, world = EXPLORE_WORLD){
  const G = world.GUN, A = world.AIM;
  const theta = aimAngle(st, world);
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const px = st.x + A.pivotDx * st.facing;      // 支点（肩）。世界座標
  const py = world.GROUND_Y - A.pivotUp;
  /* 腕の絵は常に右向き。支点→銃口（回転前）は常に前方＝正。下向きに回してから向きで左右反転する。 */
  const bx = G.muzzleDx - A.pivotDx;            // 128←(254-96)*0.78 などの前方成分
  const by = A.pivotUp - G.muzzleUp;            // 銃口は支点より少し上（負）
  const rx = bx * cos - by * sin;               // 下向きに θ 回した銃口（絵の座標系）
  const ry = bx * sin + by * cos;
  return {
    theta,
    x: px + st.facing * rx, y: py + ry,         // 銃口＝実弾の発生点
    dx: st.facing * cos, dy: sin,               // 向き（θ=0 では水平＝従来どおり）
  };
}

/**
 * 撃破演出の見え方（純粋）。t:0→1。のけぞり → 崩れて沈む → コア消灯 → 消える。
 * 撃破の瞬間から無害（alive=false）で、ここは見た目だけ。再入場では deathT が完了済みなので再生されない。
 */
export function foeDeathView(f, world = EXPLORE_WORLD){
  const T = world.FOE.deathT;
  const elapsed = Math.max(0, Math.min(T, Number.isFinite(f.deathT) ? f.deathT : T));
  const t = T > 0 ? elapsed / T : 1;
  const done = elapsed >= T;
  const lean = t < 0.22 ? t / 0.22 : Math.max(0, 1 - (t - 0.22) / 0.30);  // 少しのけぞる（すぐ戻る）
  const sink = Math.max(0, Math.min(1, (t - 0.18) / 0.62));               // 地面へ沈む
  const dark = Math.max(0, Math.min(1, t / 0.28));                        // コア消灯（暗くなる）
  const alpha = t < 0.58 ? 1 : Math.max(0, 1 - (t - 0.58) / 0.42);        // 最後に消える
  const phase = done ? 'done' : (t < 0.22 ? 'lean' : (t < 0.58 ? 'sink' : 'fade'));
  return { t, done, lean, sink, dark, alpha, phase };
}

/** 敵 1 体ぶんの状態を作る（降艇直後は休眠・床に立つ）。 */
export function createFoeState(world = EXPLORE_WORLD){
  return {
    x: world.FOE.x,
    dir: -1,               // 向き（-1: 左 / 1: 右）
    hp: world.FOE.hp,
    alive: true,
    state: 'idle',         // idle | alert | chase | wind | lunge | recover | return | dead
    t: 0,
    flash: 0,
    deathT: world.FOE.deathT,   // 撃破演出の経過。完了値で初期化（生きているうちは演出しない）
  };
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
    /* --- v1.9.0 戦闘（潜航の船体 HP とは別系統） --- */
    hp: EXPLORE_WORLD.PLAYER.hp,
    inv: 0,               // 被弾後の無敵
    hurtT: 0,             // 被弾演出の残り時間
    down: false,          // 敗北（撤退へ）。リスタートで戻る
    foe: createFoeState(),
    shots: [],            // 徒歩銃の弾（銃口から出て、届けば 1 度だけダメージ）
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
 *   input = { move: -1..1, action: boolean, shoot: boolean, shootHold: boolean }
 *     action は「押した瞬間だけ true」のエッジ（調べる／戻る）
 *     shoot / shootHold は射撃（タップ 1 発・ホールドは既存サイクルごと）
 * 返り値: { survey, return, blocked, moved, shoot, hitFoe, killFoe, hurt, defeat }
 * 同じ遺物の調査報酬は一度だけ（2 回目以降は blocked='relic'）。
 */
export function stepExplore(st, input, dt, world = EXPLORE_WORLD){
  const ev = { survey: null, return: false, blocked: null, moved: false, shoot: false,
    hitFoe: false, killFoe: false, hurt: false, defeat: false };

  /* 撤退中（敗北）は操作を受けない。ソフトロックしないよう explore.js 側が短い演出で潜水艇へ戻す。 */
  if (st.down){ st.lastEvent = ev; return ev; }

  const move = clamp(Number(input && input.move) || 0, -1, 1);

  /* --- 射撃: 移動と同時に入力できる。タップ=1発。ホールド中は射撃サイクル完了ごとに連射 --- */
  st.fireT = Math.max(0, st.fireT - dt);
  if (st.fireT <= 0) st.fireArmed = true;
  const wantFire = !!(input && (input.shoot || input.shootHold));
  if (wantFire && st.fireArmed){
    st.fireArmed = false;
    st.fireT = world.FIRE_T;
    ev.shoot = true;
    /* 弾は見える銃口から、狙いの向きへ。銃口・向きは flash/曳光とまったく同じ計算（aimVector）。
       標的が無ければ従来どおりの水平（θ=0）。届いた弾だけがダメージを与える。 */
    const G = world.GUN;
    const av = aimVector(st, world);
    st.shots.push({ x: av.x, y: av.y, prevX: av.x, prevY: av.y,
      vx: G.speed * av.dx, vy: G.speed * av.dy, life: 0, r: G.r });
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

  /* --- v1.9.0 戦闘: 弾を進めて敵へ、敵を進めてプレイヤーへ --- */
  st.inv = Math.max(0, st.inv - dt);
  st.hurtT = Math.max(0, st.hurtT - dt);
  if (st.foe.flash > 0) st.foe.flash = Math.max(0, st.foe.flash - dt);

  const shotEv = stepShots(st, dt, world);
  if (shotEv.hitFoe) ev.hitFoe = true;
  if (shotEv.killFoe) ev.killFoe = true;

  if (stepFoe(st, dt, world)) ev.hurt = true;

  if (st.hp <= 0 && !st.down){ st.hp = 0; st.down = true; ev.defeat = true; }

  st.lastEvent = ev;
  return ev;
}

/** 徒歩銃の弾を 1 フレーム進める。線分で掃引するので速くてもすり抜けない。*/
function stepShots(st, dt, world){
  const G = world.GUN, F = world.FOE;
  const f = st.foe;
  const out = { hitFoe: false, killFoe: false };
  for (const b of st.shots){
    if (b.dead) continue;
    b.prevX = b.x; b.prevY = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.life += dt;
    if (f.alive && segHitBox(b.prevX, b.prevY, b.x, b.y, foeBox(f, world), b.r)){
      b.dead = true;
      f.hp -= 1; f.flash = 0.12;
      out.hitFoe = true;
      if (f.hp <= 0){ f.hp = 0; f.alive = false; f.state = 'dead'; f.deathT = 0; out.killFoe = true; }
    }
  }
  st.shots = st.shots.filter(b => !b.dead && b.life < G.life);
  return out;
}

/**
 * 敵の行動（休眠 → 予兆 → 追跡 → 溜め → 踏み込み → 硬直。離れれば引き返す）。
 * プレイヤーへ一度ダメージしたら true。
 */
function stepFoe(st, dt, world){
  const F = world.FOE, PLAYER = world.PLAYER;
  const f = st.foe;
  if (!f.alive){
    /* 撃破済みは無害・撃てない（この時点で既に alive=false）。見た目の演出だけ時間で進めて完了させる。 */
    f.state = 'dead';
    if (f.deathT < F.deathT) f.deathT = Math.min(F.deathT, f.deathT + dt);
    return false;
  }

  const dx = st.x - f.x;              // 正: プレイヤーは右
  const dist = Math.abs(dx);
  const toPlayer = dx >= 0 ? 1 : -1;
  let hurt = false;

  switch (f.state){
    case 'alert':
      f.dir = toPlayer;
      f.t += dt;
      if (dist > F.triggerRange + 60){ f.state = 'idle'; f.t = 0; break; }   // 引かれた
      if (f.t >= F.alertT){ f.state = 'chase'; f.t = 0; }
      break;
    case 'chase':
      f.dir = toPlayer;
      if (dist > F.disengageRange){ f.state = 'return'; f.t = 0; break; }
      if (dist <= F.attackRange){ f.state = 'wind'; f.t = 0; break; }
      f.x += toPlayer * F.speed * dt;
      break;
    case 'wind':
      f.dir = toPlayer;
      f.t += dt;
      if (f.t >= F.windT){ f.state = 'lunge'; f.t = 0; }
      break;
    case 'lunge':
      f.dir = toPlayer;
      f.x += toPlayer * F.lungeSpeed * dt;
      f.t += dt;
      if (st.inv <= 0 && Math.abs(st.x - f.x) <= F.contactR){
        st.hp = Math.max(0, st.hp - F.dmg);
        st.inv = PLAYER.inv; st.hurtT = PLAYER.hurtT;
        f.state = 'recover'; f.t = 0;
        hurt = true;
      } else if (f.t >= F.lungeT){ f.state = 'recover'; f.t = 0; }
      break;
    case 'recover':
      f.t += dt;
      if (f.t >= F.recoverT){ f.state = dist <= F.disengageRange ? 'chase' : 'return'; f.t = 0; }
      break;
    case 'return':
      f.dir = f.x > F.x ? -1 : 1;
      f.t += dt;
      if (Math.abs(f.x - F.x) <= 4 || f.t > 5){ f.x = F.x; f.state = 'idle'; f.t = 0; }
      else f.x += Math.sign(F.x - f.x) * F.speed * dt;
      break;
    default: /* idle */
      f.dir = toPlayer;
      f.t = 0;
      if (dist <= F.triggerRange){ f.state = 'alert'; f.t = 0; }
      break;
  }
  f.x = clamp(f.x, world.MIN_X, world.MAX_X);
  return hurt;
}
