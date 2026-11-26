/**
 * ABYSS DIVE — スターフォックス風 背後視点・高速トンネルコースター（純粋ロジック / DOM 非依存）
 *
 * 大深度・海流回廊（合流広間 ⇄ マントル上層）および将来の 3,960 マイル・ブラックホール突入で
 * 共通利用できる擬似 3D 背後ダイブ状態機械。
 *
 * 設計方針:
 *   - ムービーにせず、左スティック / WASD で上下左右へ自在にバンクしながら「隙間を抜ける」アトラクション感。
 *   - 失敗でやり直しにはしない（障害物に掠っても火花・揺れ・軽い減速のみで必ず出口へ到達）。
 *   - 加速リング（スリップストリーム）をくぐるとブースト＋資源ボーナス＋爽快演出。
 *   - 進行中もゲームの無線会話は止めず、深度計がリアルタイムに高速カウントアップする。
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const TUNNEL_THEMES = Object.freeze({
  corridor_down: Object.freeze({
    id: 'corridor_down',
    dir: 1,
    duration: 14.0,
    startY: 6900,
    endY: 8680,
    label: '大深度・下降海流回廊',
    bgTop: '#031224',
    bgBot: '#020914',
    ringCol: [88, 226, 255],
    boostCol: [140, 255, 224],
    exitCol: [164, 246, 255],
    exitGold: [255, 226, 140],
    wallCol: [14, 34, 52],
    wallRim: [86, 188, 228],
    curveAmpX: 0.22,
    curveAmpY: 0.13,
  }),
  corridor_up: Object.freeze({
    id: 'corridor_up',
    dir: -1,
    duration: 10.5,
    startY: 8500,
    endY: 6720,
    label: '帰還・上昇海流リフト',
    bgTop: '#0a1c28',
    bgBot: '#040d16',
    ringCol: [255, 214, 122],
    boostCol: [140, 248, 255],
    exitCol: [110, 232, 255],
    exitGold: [255, 232, 168],
    wallCol: [22, 34, 42],
    wallRim: [232, 184, 96],
    curveAmpX: 0.18,
    curveAmpY: 0.11,
  }),
  blackhole: Object.freeze({
    id: 'blackhole',
    dir: 1,
    duration: 12.0,
    startY: 8500,
    endY: 9900,
    label: '事象の地平線・順行軌道',
    bgTop: '#04020c',
    bgBot: '#010106',
    ringCol: [168, 138, 255],
    boostCol: [255, 214, 146],
    exitCol: [255, 198, 120],
    exitGold: [152, 216, 255],
    wallCol: [16, 10, 28],
    wallRim: [196, 152, 255],
    curveAmpX: 0.28,
    curveAmpY: 0.18,
  }),
});

/** 決定的なコース生成（隙間のある岩ゲート＋加速リング）。 */
function buildCourse(themeId) {
  const isUp = themeId === 'corridor_up';
  const count = isUp ? 9 : 12;
  const items = [];
  // パターン: 見てから余裕をもってスイスイ抜けられる広めの隙間＋気持ちよいリズム配置
  const patterns = [
    { kind: 'gate', gapX:  0.00, gapY:  0.00, gapR: 0.56, shape: 'arch' },
    { kind: 'gate', gapX: -0.28, gapY:  0.06, gapR: 0.52, shape: 'pillar_r' },
    { kind: 'gate', gapX:  0.28, gapY: -0.08, gapR: 0.52, shape: 'pillar_l' },
    { kind: 'gate', gapX:  0.04, gapY: -0.22, gapR: 0.54, shape: 'floor_bar' },
    { kind: 'gate', gapX: -0.24, gapY:  0.18, gapR: 0.52, shape: 'ceil_bar' },
    { kind: 'gate', gapX:  0.26, gapY:  0.12, gapR: 0.50, shape: 'pillar_l' },
  ];

  for (let i = 0; i < count; i++) {
    const u = 0.11 + (i / count) * 0.79;
    const pat = patterns[(i + (isUp ? 2 : 0)) % patterns.length];
    items.push({
      id: `g_${i}`,
      kind: 'gate',
      at: u,
      gapX: pat.gapX,
      gapY: pat.gapY,
      gapR: pat.gapR,
      shape: pat.shape,
      resolved: false,
      result: null, // 'clear' | 'hit'
    });
    // 各ゲートの直後（少し先）にライン取りのご褒美となる加速リングを置く
    if (i % 2 === 0 || i === count - 1) {
      items.push({
        id: `r_${i}`,
        kind: 'ring',
        at: Math.min(0.94, u + 0.040),
        x: pat.gapX * 0.85,
        y: pat.gapY * 0.85,
        r: 0.42,
        resolved: false,
        result: null, // 'boost' | 'miss'
      });
    }
  }
  return items;
}

/**
 * 背後視点トンネルコースターの状態機械を生成する。
 *
 * @param {object} opts
 * @param {'corridor_down'|'corridor_up'|'blackhole'} [opts.theme='corridor_down']
 * @param {number} [opts.exitX=0] - 完了後に戻すワールド X
 * @param {number} [opts.exitY]   - 完了後に戻すワールド Y
 */
export function createTunnelDive(opts) {
  const o = opts || {};
  const theme = TUNNEL_THEMES[o.theme] || TUNNEL_THEMES.corridor_down;
  const exitX = Number.isFinite(o.exitX) ? o.exitX : 0;
  const exitY = Number.isFinite(o.exitY) ? o.exitY : theme.endY;

  const course = buildCourse(theme.id);
  const st = {
    active: true,
    done: false,
    theme,
    exitX,
    exitY,
    time: 0,
    progress: 0,      // 0..1
    speed: 1.0,       // 進行速度倍率（加速リングで一時上昇）
    boostT: 0,        // ブースト残り秒
    hitFlash: 0,      // 障害物かすり演出
    clearFlash: 0,    // 隙間抜け／リング通過演出
    shake: 0,         // 画面揺れ強度
    px: 0,            // 自艇正規化位置 X (-0.82..0.82)
    py: 0.12,         // 自艇正規化位置 Y (-0.72..0.72)
    vx: 0,
    vy: 0,
    roll: 0,          // バンク角（ラジアン）
    pitch: 0,         // 上下チルト（ラジアン）
    combo: 0,
    ringsHit: 0,
    gatesCleared: 0,
    hits: 0,
    bonusResource: 0,
    course,
  };

  /** 現在進行度におけるトンネル中心のうねり（コースターのカーブ＆ドロップ）。 */
  function curveAt(p) {
    const a = p * Math.PI * 4.5;
    return {
      cx: Math.sin(a) * theme.curveAmpX,
      cy: Math.cos(a * 0.75) * theme.curveAmpY,
    };
  }

  /** 現在進行度に対応する論理深度 Y（深度計 m → km 連動用）。 */
  function currentWorldY() {
    const u = clamp(st.progress, 0, 1);
    return theme.startY + (theme.endY - theme.startY) * u;
  }

  /**
   * 1 フレーム進行。
   * @param {number} dt - 経過秒
   * @param {number} ix - 左右入力 (-1..1)
   * @param {number} iy - 上下入力 (-1..1)
   * @param {boolean} [shieldOn=false] - バリア展開中か（障害物かすり無効化）
   * @returns {{ events: Array<{type:string, reward?:number}>, done: boolean }}
   */
  function step(dt, ix, iy, shieldOn) {
    const events = [];
    if (!st.active || st.done) return { events, done: st.done };

    const d = clamp(Number(dt) || 0, 0, 0.05);
    const inX = clamp(Number(ix) || 0, -1, 1);
    const inY = clamp(Number(iy) || 0, -1, 1);

    st.time += d;
    st.boostT = Math.max(0, st.boostT - d);
    st.hitFlash = Math.max(0, st.hitFlash - d * 2.6);
    st.clearFlash = Math.max(0, st.clearFlash - d * 2.8);
    st.shake = Math.max(0, st.shake - d * 3.4);

    // 速度：基本 1.0、ブースト時は 1.48、かすり直後は一瞬だけ 0.78
    const targetSpeed = st.boostT > 0 ? 1.48 : (st.hitFlash > 0.3 ? 0.78 : 1.0);
    st.speed += (targetSpeed - st.speed) * Math.min(1, d * 7);

    const prevProg = st.progress;
    st.progress = clamp(st.progress + (d / theme.duration) * st.speed, 0, 1);

    // 自艇の機敏な操作（スターフォックス風のスパッと動く軽快なレスポンス＆バンク）
    const accel = 11.5;
    st.vx += (inX * 2.15 - st.vx) * Math.min(1, d * accel);
    st.vy += (inY * 1.85 - st.vy) * Math.min(1, d * accel);
    st.px = clamp(st.px + st.vx * d, -0.80, 0.80);
    st.py = clamp(st.py + st.vy * d, -0.68, 0.68);

    const targetRoll = clamp(st.vx * 0.30, -0.56, 0.56);
    const targetPitch = clamp(st.vy * 0.18, -0.32, 0.32);
    st.roll += (targetRoll - st.roll) * Math.min(1, d * 10);
    st.pitch += (targetPitch - st.pitch) * Math.min(1, d * 10);

    // 通過判定（prevProg < item.at <= st.progress）
    for (const item of st.course) {
      if (item.resolved) continue;
      if (item.at > prevProg && item.at <= st.progress) {
        item.resolved = true;
        if (item.kind === 'ring') {
          const dist = Math.hypot(st.px - item.x, st.py - item.y);
          if (dist <= item.r) {
            item.result = 'boost';
            st.ringsHit++;
            st.combo++;
            st.boostT = 1.65;
            st.clearFlash = 1.0;
            const reward = 18 + Math.min(30, st.combo * 4);
            st.bonusResource += reward;
            events.push({ type: 'ring_boost', reward });
          } else {
            item.result = 'miss';
            st.combo = 0;
          }
        } else if (item.kind === 'gate') {
          const dist = Math.hypot(st.px - item.gapX, st.py - item.gapY);
          // 見た目の穴の内側に収まっていれば 100% セーフになるよう寛容マージンを付与
          if (dist <= item.gapR + 0.08) {
            item.result = 'clear';
            st.gatesCleared++;
            st.clearFlash = Math.max(st.clearFlash, 0.45);
            events.push({ type: 'gate_clear' });
          } else if (shieldOn) {
            item.result = 'clear';
            st.gatesCleared++;
            st.shake = Math.max(st.shake, 0.35);
            events.push({ type: 'gate_guard' });
          } else {
            item.result = 'hit';
            st.hits++;
            st.combo = 0;
            st.hitFlash = 1.0;
            st.shake = 1.0;
            events.push({ type: 'gate_hit' });
          }
        }
      }
    }

    if (st.progress >= 1) {
      st.done = true;
      st.active = false;
      events.push({ type: 'complete', exitX, exitY });
    }

    return { events, done: st.done };
  }

  /** テストラボ用：進行度を任意位置 (0..1) へシークし、それ以降の障害物を未解決へ戻す。 */
  function setProgress(u) {
    const p = clamp(Number(u) || 0, 0, 0.995);
    st.progress = p;
    st.done = false;
    st.active = true;
    for (const item of st.course) {
      item.resolved = item.at <= p;
      item.result = item.resolved ? 'clear' : null;
    }
  }

  return {
    state: () => st,
    step,
    setProgress,
    curveAt,
    currentWorldY,
    isActive: () => st.active && !st.done,
    isDone: () => st.done,
  };
}
