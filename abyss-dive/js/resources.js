/**
 * ABYSS DIVE — 資源（スコアに代わる保存値）の純粋ルール
 *
 * v1.10.0: 累積スコアの代わりに、戦闘・遺物調査で得る「資源」を保存する。
 *   - 独自キー（RESOURCE_KEY）に残高を保存する。ハブの BEST SCORE（旧ハイスコア）からは移行しない。
 *   - ハブへ戻る・リロード・やり直し（startGame）でも残高は維持する。
 *   - 同じ潜航内で同じ源（遺物・撃破など）からは一度だけ（二重付与しない）。
 *     新しい潜航では resetDive() で再び得られる。
 *   - 保存の実体（localStorage）は呼び出し側から io { load, save } で渡す（DOM 非依存・テスト可能）。
 *
 * 既存のゲーム内スコア（game.js の G.score）は UI・保存から切り離した互換のデバッグ値として残す。
 */

export const RESOURCE_KEY = 'abyss_resources';   // localStorage: game_studio_abyss_resources（独自キー）

/**
 * 資源の残高を管理する。
 * @param {{load:()=>number, save:(total:number)=>void}} io
 */
export function createResourceLedger(io){
  const loadFn = (io && io.load) || (() => 0);
  const saveFn = (io && io.save) || (() => {});

  let total = Math.max(0, Math.floor(Number(loadFn()) || 0));
  let granted = new Set();   // いまの潜航で付与済みの源

  function add(amount){
    const v = Math.max(0, Math.round(Number(amount) || 0));
    if (v <= 0) return false;
    total += v;
    try { saveFn(total); } catch (e) { /* 保存に失敗しても進行は続ける */ }
    return true;
  }

  return {
    total: () => total,

    /** 源を問わず加算（撃破報酬など、その潜航で一度きりのもの）。 */
    add,

    /** 同じ潜航内で同じ sourceId は一度だけ。付与したら true。 */
    awardOnce(sourceId, amount){
      if (granted.has(sourceId)) return false;
      granted.add(sourceId);
      return add(amount);
    },

    /** その源がこの潜航で付与済みか。 */
    granted: sourceId => granted.has(sourceId),

    /** 新しい潜航の開始（やり直し）で、付与済みの記録だけを捨てる。残高は保つ。 */
    resetDive(){ granted = new Set(); },
  };
}
