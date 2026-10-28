// v0.17.0: ギミック「よあけ」（ステージ17 よあけの こうや・あとから よむ）
// すすんだ ぶん（へやの いりぐち → でぐち の せんの うえ）で よる → あさやけ → あさ。もどっても くらく ならない
// 0.25びょう ごと・1% いじょう かわった ときだけ そらを ぬりなおす（まいフレームは しない）
import { TOD, blendTod } from '../../rules.js?v=35';
import { DAWN, dawnTod, dawnNeed, gkProgress } from '../core.js?v=35';

export function create(game) {
  let t = 0, last = null, acc = 0;
  const start = game.map.playerStart;
  function apply() {
    const { a, b, k } = dawnTod(t);
    game.applyTodLerp(a, b, k);
    last = t;
  }
  function measure() {
    const gm = game.map.gk; if (!gm || !game.gk) return;
    const p = gkProgress(gm, game.pos.x, game.pos.z, start, game.gk.waves.length);
    if (p != null) t = Math.max(t, p);
  }
  function tick(dt) {
    if ((acc += dt) < DAWN.every) return;
    acc = 0; measure();
    if (dawnNeed(last, t)) apply();
  }
  // チェックポイントから: その へやの いりぐちの あかるさで はじめる
  if (game.gk && game.gk.room > 0) t = game.gk.room / game.gk.waves.length;
  measure(); apply();
  return { tick, remap() {}, dispose() {}, get t() { return t; } };
}
