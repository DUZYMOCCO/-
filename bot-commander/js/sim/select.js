// 選択まわりの決まり（DOM なし。入力と HUD から使う・テストできる）。v0.4.0-dev
// 1機タップ・枠で囲む・同じ種類・保存した組（①②③）。選べるのは味方で、捕まっていない・AI で動いていない機体だけ。

// AI で動く味方（5-5。aiAlly）はプレイヤーが選べない
const selectable = u => u.side === 'ally' && u.captured == null && !u.aiAlly && !u.ride; // 乗っている人（背中・中）は選べない（ロボを選んで降りる）

/** ワールド座標 (x,y) に一番近い味方（reach 以内）。見た目の中心は足元より少し上（dy） */
export function allyAt(units, x, y, reach, dy = 12) {
  let best = null, bd = reach;
  for (const u of units) {
    if (!selectable(u)) continue;
    const d = Math.hypot(u.x - x, u.y - dy - y);
    if (d <= bd) { bd = d; best = u; }
  }
  return best;
}

/** 見えている敵で (x,y) に一番近いもの（狙う命令用） */
export function enemyAt(units, x, y, reach, visible = () => true, dy = 14) {
  let best = null, bd = reach;
  for (const u of units) {
    if (u.side !== 'enemy' || !visible(u)) continue;
    const d = Math.hypot(u.x - x, u.y - dy - y);
    if (d <= bd) { bd = d; best = u; }
  }
  return best;
}

/** 枠（ワールド座標の2点）の中の味方 */
export function unitsInRect(units, a, b) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return units.filter(u => selectable(u) && u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1).map(u => u.id);
}

/** 同じ種類をまとめて。kind が 'human' なら人間全員、'all' ならロボット全員 */
export function selectKind(units, kind) {
  return units.filter(u => selectable(u) && (kind === 'all' ? !u.human : kind === 'human' ? u.human : u.kind === kind)).map(u => u.id);
}

/** 選択の掃除: いなくなった・捕まった機体を外す */
export function pruneSelection(units, ids) {
  const ok = new Set(units.filter(selectable).map(u => u.id));
  return ids.filter(id => ok.has(id));
}

/** タップで選ぶ: 選ばれていない機体→その1機だけ。選ばれている1機だけをもう一度→外す。add なら足す/外す */
export function tapSelect(ids, id, add = false) {
  if (add) return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  if (ids.length === 1 && ids[0] === id) return [];
  return [id];
}

/** 保存した組（①②③）。sim の外（UI 側）に持つ */
export function createGroups(n = 3) {
  const slots = Array.from({ length: n }, () => []);
  return {
    slots,
    save(i, ids) { slots[i] = [...ids]; return slots[i]; },
    recall(i, units) { slots[i] = pruneSelection(units, slots[i]); return [...slots[i]]; },
  };
}
