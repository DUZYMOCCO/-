// ミサイル発射ボタンを出すかの判定（DOM なし・テスト用）。
// (a) ?launcher=1: 発射台を引いている味方を選んでいて、撃てる発射台がある
// (b) ?story=1: sim.strike.phase === 'ready' で、ネジを選んでいる
import { launchersOf } from '../sim/launcher.js?v=3';
import { nejiOf } from '../sim/strike.js?v=1';

/**
 * 発射ボタンを出すか調べる。{ visible: boolean, kind: 'launcher' | 'story' | null }
 */
export function fireButtonState(sim, selectedIds = []) {
  if (!sim) return { visible: false, kind: null };
  const ids = Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds || []);
  const sel = new Set(ids);
  if (!sel.size) return { visible: false, kind: null };

  // (a) ?launcher=1
  if (sim.launcher) {
    const hasTowing = sim.units.some(u => sel.has(u.id) && u.tow != null && u.hp > 0);
    const fireable = launchersOf(sim).some(l => !l.launch?.phase);
    if (hasTowing && fireable) return { visible: true, kind: 'launcher' };
  }

  // (b) 物語ミッション1（sim.strike）
  if (sim.strike && sim.strike.phase === 'ready') {
    const neji = nejiOf(sim);
    if (neji && sel.has(neji.id)) return { visible: true, kind: 'story' };
  }

  return { visible: false, kind: null };
}
