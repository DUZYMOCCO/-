/**
 * ABYSS DIVE — 瞬間バリア（緊急回避の置き換え）のルール（純粋ロジック / DOM 非依存）
 *
 * v1.13.0: 既存の回避ボタン / Space を、進行方向・速度を変えない「ワンタップの瞬間バリア」に
 *   置き換える。ダッシュ（艇を押し飛ばす加速）は残さない。
 *
 * 仕様（DEEP_FIELD_PLAN「瞬間バリア」節）:
 *   - 発動 0.4s / 耐久は標準弾 1 発分 / 再使用 2.0s。
 *   - 受けた攻撃で耐久が尽きれば割れ、超過分だけが船体へ通る。全吸収はノックバックなし。
 *   - ジャストガード: 発動直後のごく短い受付（既定 0.12s）に攻撃が重なると、その一撃を完全に防ぎ、
 *     膜を消費して再使用待ちをゼロにする（次の押し直しで別の攻撃を狙える）。
 *   - 通常ガード・空振りは再使用待ちあり。押しっぱなし／キーリピートでは連続発動しない。
 *   - 受付は描画 1 フレームではなく経過時間で判定する。
 *   - 同一の持続接触では連続ジャスト払い戻しをしない（justLatch）。
 *   - 連続接触の吸収は REHIT 秒おきに間引く（毎フレームで耐久がドレインしない）。
 *   - 被弾無敵・岩との衝突とは別系統（ここでは速度・無敵に一切触らない）。
 */

export const BARRIER = Object.freeze({
  DURATION: 0.4,     // 通常ガードの持続（秒）
  DURABILITY: 10,    // 耐久（標準弾 1 発分。バーナクル／クラゲ級の 1 発をちょうど吸収する）
  COOLDOWN: 2.0,     // 再使用待ち（秒）
  JUST: 0.12,        // ジャスト受付（発動からの経過秒。描画フレームではなく時間で判定）
  REHIT: 0.2,        // 同一の源を再び吸収するまでの間引き（連続接触のドレイン防止）
});

const num = v => (Number.isFinite(v) ? v : 0);

/** 初期状態。over で一部の値を上書きできる（バリア型の艇の差分用）。 */
export function createBarrierState(over) {
  const cfg = Object.assign({}, BARRIER, over || {});
  return {
    cfg,
    active: false,
    t: 0,                                   // 発動からの経過（ジャスト判定に使う）
    cooldown: 0,
    durability: cfg.DURABILITY,
    maxDurability: cfg.DURABILITY,
    justLatch: new Set(),                   // いまも接触中の源（この接触ではもうジャストにしない）
    hitGate: new Map(),                     // 源 -> 残り間引き時間（連続接触の吸収を間引く）
    seen: new Set(),                        // このフレームに提示された源（justLatch の解放用）
  };
}

/** 押し直しで発動できるか（発動中でなく、再使用待ちも無い）。 */
export function barrierReady(st) {
  return !!st && !st.active && st.cooldown <= 0;
}

/** 膜の残量 0..1（描画用。膜が出ていない間もボタン表示などに使える）。 */
export function barrierCharge(st) {
  if (!st || !st.maxDurability) return 0;
  return Math.max(0, Math.min(1, st.durability / st.maxDurability));
}

/** 再使用待ちの進み 0..1（1 で再使用可）。ボタンの待ち表示に使う。 */
export function barrierReadyProgress(st) {
  if (!st) return 1;
  if (st.active) return 1;
  if (st.cooldown <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - st.cooldown / st.cfg.COOLDOWN));
}

/**
 * 発動。進行方向・速度には一切触れない（旧ダッシュの押し飛ばしを残さない）。
 * 発動できたら true、発動中／再使用待ちなら false。
 */
export function deployBarrier(st) {
  if (!barrierReady(st)) return false;
  st.active = true;
  st.t = 0;
  st.durability = st.maxDurability;
  return true;
}

/** 時間を進める（毎フレーム 1 回）。持続切れ／再使用待ちの消化／間引きの減衰。 */
export function tickBarrier(st, dt) {
  if (!st) return;
  dt = Math.max(0, num(dt));
  if (st.active) {
    st.t += dt;
    if (st.t >= st.cfg.DURATION) {
      /* 空振り・通常ガード終了＝再使用待ちへ */
      st.active = false;
      st.cooldown = st.cfg.COOLDOWN;
      st.durability = 0;
    }
  } else if (st.cooldown > 0) {
    st.cooldown = Math.max(0, st.cooldown - dt);
  }
  if (st.hitGate.size) {
    for (const [k, v] of st.hitGate) {
      const nv = v - dt;
      if (nv <= 0) st.hitGate.delete(k); else st.hitGate.set(k, nv);
    }
  }
}

/**
 * 1 つの攻撃をバリアへ提示する。key は攻撃元の安定 ID（連続接触の判定に使う）。
 * 返り値: { kind:'just'|'absorb'|'break'|'gated'|'none', absorbed, overflow }
 *   just   … 完全防御（膜消費・再使用待ちゼロ）
 *   absorb … 通常ガードで吸収（膜は残る／尽きていれば break）
 *   break  … 耐久が尽きて割れた（overflow だけ船体へ）
 *   gated  … 直近に吸収／防御した同一の源（この一撃は無視する）
 *   none   … バリア非稼働（呼び側が通常の被弾処理をする）
 */
export function presentHit(st, key, dmg) {
  const d = Math.max(0, num(dmg));
  if (!st) return { kind: 'none', absorbed: 0, overflow: d };
  st.seen.add(key);
  /* 直近に同じ源を吸収／防御していれば、その連続接触は短く無視する（ドレイン防止）。 */
  if ((st.hitGate.get(key) || 0) > 0) return { kind: 'gated', absorbed: 0, overflow: 0 };
  if (!st.active) return { kind: 'none', absorbed: 0, overflow: d };

  const isJust = st.t <= st.cfg.JUST && !st.justLatch.has(key);
  if (isJust) {
    st.justLatch.add(key);
    st.hitGate.set(key, st.cfg.REHIT); // 防いだ接触を次の更新で即座に被弾へ戻さない。別の攻撃は妨げない。
    /* 完全防御：膜を消費し、再使用待ちゼロ（次の押し直しで別の攻撃を狙える）。 */
    st.active = false;
    st.cooldown = 0;
    st.durability = 0;
    return { kind: 'just', absorbed: d, overflow: 0 };
  }

  const absorbed = Math.min(d, st.durability);
  const overflow = d - absorbed;
  st.durability -= absorbed;
  st.hitGate.set(key, st.cfg.REHIT);
  if (st.durability <= 1e-9) {
    st.active = false;
    st.cooldown = st.cfg.COOLDOWN;
    st.durability = 0;
    return { kind: 'break', absorbed, overflow };
  }
  return { kind: 'absorb', absorbed, overflow };
}

/**
 * フレーム末に呼ぶ。このフレームで見えなかった源を justLatch から外す
 * （＝離れた接触は次にまた一撃をジャストで取れる）。見た源は毎フレーム提示される前提。
 */
export function endBarrierFrame(st) {
  if (!st) return;
  for (const k of st.justLatch) if (!st.seen.has(k)) {
    st.justLatch.delete(k);
    st.hitGate.delete(k);
  }
  st.seen.clear();
}

/** 膜を閉じて入力・状態を持ち越さない（降艇・入港・出港・やり直しで使う）。 */
export function closeBarrier(st) {
  if (!st) return;
  st.active = false;
  st.t = 0;
  st.cooldown = 0;
  st.durability = 0;
  st.justLatch.clear();
  st.hitGate.clear();
  st.seen.clear();
}
