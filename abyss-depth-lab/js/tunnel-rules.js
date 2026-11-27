/**
 * ABYSS DIVE — スターフォックス風 背後視点・連続3D海底洞窟パイプコースター（純粋ロジック / DOM 非依存）
 *
 * v3.18.0 根本刷新:
 *   - 「仕切り板（ゲート）」を完全廃止し、洞窟パイプそのものが奥から手前へ滑らかに蛇行・くびれ変形する
 *     1本の連続した 3D チューブ（pipeAt(p)）として設計。
 *   - 自艇は常に現在位置のパイプ断面とリアルタイムに連続接触判定を行い、壁に近づけばそのまま壁が迫り、
 *     触れたら内側へ滑らかに押し戻される（壁擦り）ため、体感と衝突判定のズレが物理的にゼロになる。
 *   - パイプの最適ライン上に浮かぶ海流スリップストリーム（加速リング）をくぐるとブースト＋資源ボーナス。
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const TUNNEL_THEMES = Object.freeze({
  corridor_down: Object.freeze({
    id: 'corridor_down',
    dir: 1,
    duration: 14.5,
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
    curveAmpX: 0.44,
    curveAmpY: 0.28,
  }),
  corridor_up: Object.freeze({
    id: 'corridor_up',
    dir: -1,
    duration: 11.0,
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
    curveAmpX: 0.36,
    curveAmpY: 0.22,
  }),
  blackhole: Object.freeze({
    id: 'blackhole',
    dir: 1,
    duration: 13.0,
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
    curveAmpX: 0.34,
    curveAmpY: 0.22,
  }),
});

/** 進行度 p (0..1) における連続洞窟パイプの中心 (cx, cy) と内径半径 r を返す（描画・判定の単一情報源）。 */
export function samplePipeAt(theme, p) {
  const u = clamp(p, 0, 1.35);
  // 入口(0)と出口(1)は中央・広めに開き、道中でダイナミックに蛇行＆くびれを作る
  const env = Math.sin(clamp(u, 0, 1) * Math.PI);
  const w1 = u * Math.PI * 5.0;
  const w2 = u * Math.PI * 8.5 + 0.9;
  const cx = (Math.sin(w1) * 0.68 + Math.sin(w2) * 0.32) * theme.curveAmpX * (0.35 + 0.65 * env);
  const cy = (Math.cos(w1 * 0.72) * 0.65 + Math.sin(w2 * 0.64) * 0.35) * theme.curveAmpY * (0.35 + 0.65 * env);

  // 洞窟の広さ：基本 0.88、くびれ区間でも 0.60 を保って見てから余裕でライン取りできる
  const squeeze = 0.5 + 0.5 * Math.sin(u * Math.PI * 10.0 - 1.2);
  const r = 0.90 - squeeze * 0.28 * env;
  return { cx, cy, r };
}

/** 最適ライン上に配置する海流スリップストリーム（加速リング）とチェックポイント区間を生成。 */
function buildCourse(theme) {
  const isUp = theme.id === 'corridor_up';
  const ringCount = isUp ? 7 : 9;
  const items = [];
  for (let i = 0; i < ringCount; i++) {
    const u = 0.11 + (i / ringCount) * 0.78;
    const pipe = samplePipeAt(theme, u);
    // パイプ内の自然なライン上にリングを置く
    const offX = Math.sin(i * 2.1) * pipe.r * 0.22;
    const offY = Math.cos(i * 1.7) * pipe.r * 0.18;
    items.push({
      id: `r_${i}`,
      kind: 'ring',
      at: u,
      x: pipe.cx + offX,
      y: pipe.cy + offY,
      r: 0.42,
      resolved: false,
      result: null, // 'boost' | 'miss'
    });
  }
  // 通過カウント用のセクション（見た目の仕切り板は出さない。壁に擦らず区間を抜けたらクリア加算）
  for (let i = 0; i < 6; i++) {
    const u = 0.16 + (i / 6) * 0.74;
    items.push({
      id: `s_${i}`,
      kind: 'section',
      at: u,
      resolved: false,
      result: null,
    });
  }
  return items;
}

/**
 * 背後視点・連続3Dパイプコースターの状態機械を生成する。
 */
export function createTunnelDive(opts) {
  const o = opts || {};
  const theme = TUNNEL_THEMES[o.theme] || TUNNEL_THEMES.corridor_down;
  const exitX = Number.isFinite(o.exitX) ? o.exitX : 0;
  const exitY = Number.isFinite(o.exitY) ? o.exitY : theme.endY;

  const course = buildCourse(theme);
  const startPipe = samplePipeAt(theme, 0);
  const st = {
    active: true,
    done: false,
    theme,
    exitX,
    exitY,
    time: 0,
    progress: 0,      // 0..1
    speed: 1.0,       // 進行速度倍率
    boostT: 0,        // ブースト残り秒
    hitFlash: 0,      // 壁擦り演出
    clearFlash: 0,    // リング通過演出
    shake: 0,         // 画面揺れ強度
    wallHitCd: 0,     // 連続壁擦り通知のクールダウン
    sectionClean: true,
    px: startPipe.cx, // 自艇正規化位置 X（パイプ中心と同じワールド座標系！）
    py: startPipe.cy, // 自艇正規化位置 Y
    vx: 0,
    vy: 0,
    roll: 0,
    pitch: 0,
    wallRatio: 0,     // 0=パイプ中央 .. 1=壁ぎりぎり（レティクル色＆警告連動）
    combo: 0,
    ringsHit: 0,
    gatesCleared: 0,
    hits: 0,
    bonusResource: 0,
    course,
  };

  function pipeAt(p) {
    return samplePipeAt(theme, p);
  }

  function curveAt(p) {
    const s = samplePipeAt(theme, p);
    return { cx: s.cx, cy: s.cy };
  }

  function currentWorldY() {
    const u = clamp(st.progress, 0, 1);
    return theme.startY + (theme.endY - theme.startY) * u;
  }

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
    st.wallHitCd = Math.max(0, st.wallHitCd - d);

    const targetSpeed = st.boostT > 0 ? 1.48 : (st.hitFlash > 0.35 ? 0.82 : 1.0);
    st.speed += (targetSpeed - st.speed) * Math.min(1, d * 7);

    const prevProg = st.progress;
    st.progress = clamp(st.progress + (d / theme.duration) * st.speed, 0, 1);

    // 機敏なステアリング＆バンク
    const accel = 11.5;
    st.vx += (inX * 2.15 - st.vx) * Math.min(1, d * accel);
    st.vy += (inY * 1.85 - st.vy) * Math.min(1, d * accel);
    st.px = clamp(st.px + st.vx * d, -1.25, 1.25);
    st.py = clamp(st.py + st.vy * d, -0.95, 0.95);

    const targetRoll = clamp(st.vx * 0.30, -0.56, 0.56);
    const targetPitch = clamp(st.vy * 0.18, -0.32, 0.32);
    st.roll += (targetRoll - st.roll) * Math.min(1, d * 10);
    st.pitch += (targetPitch - st.pitch) * Math.min(1, d * 10);

    // 連続パイプの壁とのリアルタイム接触判定（体感と100%物理一致！）
    const pipe = samplePipeAt(theme, st.progress);
    const dx = st.px - pipe.cx;
    const dy = st.py - pipe.cy;
    const dist = Math.hypot(dx, dy);
    // 機体半径マージンを含めた安全な内径（ブラックホール宇宙空間では壁押し戻し無し）
    const safeR = Math.max(0.32, pipe.r - 0.10);
    st.wallRatio = clamp(dist / safeR, 0, 1.2);

    if (theme.id !== 'blackhole' && dist > safeR) {
      // 壁に当たったらパイプの内側へ滑らかに押し戻す（壁擦り）
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      st.px = pipe.cx + nx * safeR;
      st.py = pipe.cy + ny * safeR;
      st.vx *= 0.45;
      st.vy *= 0.45;
      if (st.wallHitCd <= 0) {
        st.wallHitCd = 0.48;
        if (shieldOn) {
          st.shake = Math.max(st.shake, 0.30);
          events.push({ type: 'gate_guard' });
        } else {
          st.hits++;
          st.combo = 0;
          st.sectionClean = false;
          st.hitFlash = 0.95;
          st.shake = 0.85;
          events.push({ type: 'gate_hit' });
        }
      }
    }

    // 加速リング＆区間通過の判定
    for (const item of st.course) {
      if (item.resolved) continue;
      if (item.at > prevProg && item.at <= st.progress) {
        item.resolved = true;
        if (item.kind === 'ring') {
          const rDist = Math.hypot(st.px - item.x, st.py - item.y);
          if (rDist <= item.r) {
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
        } else if (item.kind === 'section') {
          if (st.sectionClean) {
            item.result = 'clear';
            st.gatesCleared++;
            events.push({ type: 'gate_clear' });
          } else {
            item.result = 'hit';
          }
          st.sectionClean = true;
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

  function setProgress(u) {
    const p = clamp(Number(u) || 0, 0, 0.995);
    st.progress = p;
    st.done = false;
    st.active = true;
    const pipe = samplePipeAt(theme, p);
    st.px = pipe.cx;
    st.py = pipe.cy;
    for (const item of st.course) {
      item.resolved = item.at <= p;
      item.result = item.resolved ? 'clear' : null;
    }
  }

  return {
    state: () => st,
    step,
    setProgress,
    pipeAt,
    curveAt,
    currentWorldY,
    isActive: () => st.active && !st.done,
    isDone: () => st.done,
  };
}
