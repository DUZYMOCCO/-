/**
 * ABYSS DIVE — 煤冠イソギンチャク（仮）: 熱水・火山帯 固有の固定型・中型敵の純ロジック（DOM 非依存）。
 *
 * 造形・モーションの担当は Hermes、環境・地形は Antigravity。座標は trench-rules.js の
 * 実レイアウト（描画・衝突・透過マップと同一）をそのまま参照する。
 *
 * 生態（ART_STYLE_GUIDE.md 熱水・火山帯の指針準拠）:
 *   - 黒玄武岩の岩盤に根づく。基部は煤色で肉厚、触手はくすんだ銅〜灰紫。体は脈打つ。
 *   - 背景（黒岩＋琥珀の噴気）が琥珀寄りなので、予告は白青（補色寄り）で読み、形でも区別する。
 *   - 攻撃は「見えている範囲」だけ。長い引き寄せも通行遮断もしない固定型。
 *   - 中型・倒せる。飛び道具や現実武器とは無関係（触手を広げるだけの接触攻撃）。
 *
 * 挙動の流れ（1 周期）:
 *   閉（idle/休止）→ 感知すると 白い短い収縮予告（warn・無害）→ 数本の触手を広げる（flare・
 *   この間だけ接触ダメージ）→ 引っ込む（retract）→ 休止（cooldown）→ 閉。
 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** 調整値（プレイテスト対象。固定の既定値ではなく調整前提）。 */
export const ANEMONE = Object.freeze({
  HP: 14,              // 中型・倒せる硬さ（序盤緩和は game.js 側の一律係数に従う）
  SCORE: 210,
  DAMAGE: 11,          // flare 中に接触したときに 1 ステップで入る量
  WARN_T: 0.55,        // 白い短い収縮予告（無害）
  FLARE_T: 0.62,       // 触手を広げている（この間だけ被弾）
  RETRACT_T: 0.75,     // 引っ込む
  COOLDOWN_T: 1.40,    // 次に予告するまでの休止（攻撃無しの時間）
  REACH: 200,          // 接触判定の水平半径（見えている範囲のみ・引き寄せ無し）
  REACH_Y: 132,        // 根からの高低差の許容
  SENSE: 300,          // 予告を始める水平の感知距離
  SENSE_Y: 300,        // 予告を始める上下の感知距離
  HIT_FLASH_T: 0.1,
});

/**
 * 発生地点（1 箇所・決定的）。現行の実地形データ createTrench() から、熱水・火山帯の
 * 縦竪穴（ventShaftX0..ventX1）の「いちばん広い横断面」にあたる左の黒玄武岩壁面を選ぶ。
 * 右の岩棚 ventLedgeR1 は y = floorY+460 から出るため、それより上が最も開けている。
 * 周回しても同じ 1 点を返す（確率で増えない＝多重化しない）。
 */
export function anemoneAnchor(layout) {
  if (!layout) return null;
  return {
    x: layout.ventShaftX0,          // 竪穴左壁（ventFloorMass の右面）
    y: layout.floorY + 320,         // 右岩棚より上・最も広い断面
    dir: 1,                         // 竪穴側（右）を向いて根づく
  };
}

/** 接触判定（楕円）。根からの水平半径 REACH と高低差 REACH_Y の内側だけ当たる。 */
export function anemoneInReach(a, px, py) {
  if (!a) return false;
  const dx = (px - a.x) / ANEMONE.REACH;
  const dy = (py - a.y) / ANEMONE.REACH_Y;
  return dx * dx + dy * dy <= 1;
}

/** 感知判定（接触帯より広い）。ここへ入ると予告を始める。 */
export function anemoneSensed(a, px, py) {
  if (!a) return false;
  const dx = (px - a.x) / ANEMONE.SENSE;
  const dy = (py - a.y) / ANEMONE.SENSE_Y;
  return dx * dx + dy * dy <= 1;
}

/** 予告・攻撃の見え方（色は 0..1 の RGB、形は識別用）。予告は白青で、形も攻撃と別。 */
export function anemoneCue(e) {
  switch (e && e.phase) {
    case 'warn':    return { kind: 'warn',    shape: 'contracted', color: [0.83, 0.93, 1.00] };
    case 'flare':   return { kind: 'flare',   shape: 'spread',     color: [0.78, 0.55, 0.72] };
    case 'retract': return { kind: 'retract', shape: 'gathering',  color: [0.60, 0.48, 0.58] };
    default:        return { kind: 'idle',    shape: 'closed',     color: [0.55, 0.44, 0.42] };
  }
}

/**
 * 状態機械を 1 ステップ進める（e を破壊的に更新）。このステップでプレイヤーへ与える
 * ダメージ量を返す（0 なら無害）。純ロジック: px, py はプレイヤー座標のみに依存する。
 *
 * @returns {number} 与えるダメージ（0 = 無害）
 */
export function stepAnemone(e, dt, px, py) {
  if (!e || e.dead) return 0;            // 死亡後は一切攻撃しない
  e.t = (e.t || 0) + dt;
  const a = { x: e.x, y: e.y };

  switch (e.phase) {
    case 'warn': {
      e.pt -= dt;
      if (e.pt <= 0) { e.phase = 'flare'; e.pt = ANEMONE.FLARE_T; }
      break;                             // 予告中は無害
    }
    case 'flare': {
      e.pt -= dt;
      if (anemoneInReach(a, px, py)) e.hitAt = e.t;   // 見えた範囲だけ・離脱すれば当たらない
      if (e.pt <= 0) { e.phase = 'retract'; e.pt = ANEMONE.RETRACT_T; }
      return anemoneInReach(a, px, py) ? ANEMONE.DAMAGE : 0;
    }
    case 'retract': {
      e.pt -= dt;
      if (e.pt <= 0) { e.phase = 'idle'; e.pt = ANEMONE.COOLDOWN_T; }
      break;
    }
    default: {                           // 'idle'（閉・休止）
      e.pt = Math.max(0, (e.pt || 0) - dt);
      if (e.pt <= 0 && anemoneSensed(a, px, py)) { e.phase = 'warn'; e.pt = ANEMONE.WARN_T; }
      break;
    }
  }
  return 0;
}

/**
 * 1 アウティング（潜行）＝1 遭遇。周回しても同じ遭遇を多重化しないための小さな台帳。
 * 出港したら game.js が新しく作り直す（＝新しい潜行でのみリセットされる）。
 */
export function createAnemoneEncounter(layout) {
  const anchor = anemoneAnchor(layout);
  let state = 'pending';                 // pending → spawned → defeated
  return {
    anchor,
    get state() { return state; },
    get alive() { return state === 'spawned'; },
    get defeated() { return state === 'defeated'; },
    /** まだ出していない（かつ地形が在る）ときだけ true。 */
    needSpawn() { return !!anchor && state === 'pending'; },
    /** 撃破の報酬は一度だけ: spawned からのみ defeated へ。 */
    onSpawn() { if (state === 'pending') state = 'spawned'; },
    onDefeat() { if (state === 'spawned') state = 'defeated'; },
    /** 新しい潜行（新しい run）でだけリセットする。 */
    reset() { state = 'pending'; },
  };
}

export const _anemoneClamp = clamp;
