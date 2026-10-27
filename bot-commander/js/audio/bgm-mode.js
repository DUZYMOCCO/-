// どの曲を流すかを決める（純粋な関数。sim は読むだけで、何も書かない）。
// 決まり: 会話中 → dialogue / 巨大な敵が近い・見えている → giant / 味方が交戦中 → combat / それ以外 → explore（拠点の画面は base）。
// すぐ揺れないように、上がる（静か→戦い）は 0.6 秒、下がる（戦い→静か）は 6 秒続いてから切り替える。
export const MODE_RANK = { base: 0, explore: 0, dialogue: 1, combat: 2, giant: 3 };
export const UP_HOLD = 0.6, DOWN_HOLD = 6;

/** 揺れ止め。update(want, dtSec) は今流すべき曲を返す。dt は実際の秒（ゲームの速さとは関係なく）。 */
export class ModeGate {
  constructor(initial = 'explore') { this.mode = initial; this.cand = initial; this.held = 0; }
  update(want, dt) {
    if (want === this.mode) { this.cand = want; this.held = 0; return this.mode; }
    if (want === 'dialogue' || this.mode === 'dialogue') { this.mode = want; this.cand = want; this.held = 0; return this.mode; } // 会話の出入りはすぐ
    if (want !== this.cand) { this.cand = want; this.held = 0; }
    this.held += dt;
    const up = (MODE_RANK[want] ?? 0) > (MODE_RANK[this.mode] ?? 0);
    if (this.held >= (up ? UP_HOLD : DOWN_HOLD)) { this.mode = want; this.held = 0; }
    return this.mode;
  }
}

export const GIANT_HP = 600;          // これ以上の最大 HP の敵は「巨大な敵」として扱う
export const GIANT_NEAR = 6 * 32;     // 霧で見えていなくても、味方からこの距離（px）以内なら近い
/** 巨大な敵か（巨大機・ボス・最大 HP が大きい敵） */
export const isGiantFoe = u => u.side === 'enemy' && u.hp > 0 && (u.giant || u.boss || u.kind === 'giant' || (u.maxHp || 0) >= GIANT_HP);

/**
 * 今流したい曲（揺れ止めの前）。sim は読むだけ。
 * opts.dialog: 会話が出ている / opts.base: 拠点・準備の画面 / opts.visible(u): 霧の中で見えているか
 */
export function pickBgmMode(sim, { dialog = false, base = false, visible = null } = {}) {
  if (dialog) return 'dialogue';
  if (base || !sim) return 'base';
  const allies = sim.units.filter(u => u.side === 'ally' && u.hp > 0);
  for (const e of sim.units) {
    if (!isGiantFoe(e)) continue;
    if (visible?.(e) || allies.some(a => Math.hypot(a.x - e.x, a.y - e.y) <= GIANT_NEAR)) return 'giant';
  }
  if (allies.some(u => u.engaged)) return 'combat';
  return 'explore';
}
