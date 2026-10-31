// スクリーン座標空間でのアクター・ターゲット選択の純粋関数。
// DOM / Three.js に依存せず、投影済みスクリーン座標を直接受け取って判定する。

/**
 * スクリーン空間で指定点から最も近いアクター／候補を返す純粋関数。
 * @param {Array} candidates 候補の配列（各候補は screen: [x,y] または x, y 等を持つ）
 * @param {number|Array|Object} pressX タップX座標、または [x, y] / {x, y}
 * @param {number} [pressY] タップY座標（pressXが座標オブジェクト・配列の場合は許容半径）
 * @param {number} [maxRadius=36] 最大許容距離（CSS px、既定36）
 * @returns {*} 最も近い候補（または候補の actor / candidate 自身）、範囲内になければ null
 */
export function pickNearestActorScreen(candidates, pressX, pressY, maxRadius = 36) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  let px = 0;
  let py = 0;
  let radius = 36;

  if (Array.isArray(pressX) && pressX.length >= 2) {
    px = pressX[0];
    py = pressX[1];
    radius = typeof pressY === 'number' ? pressY : (typeof maxRadius === 'number' ? maxRadius : 36);
  } else if (pressX && typeof pressX.x === 'number' && typeof pressX.y === 'number') {
    px = pressX.x;
    py = pressX.y;
    radius = typeof pressY === 'number' ? pressY : (typeof maxRadius === 'number' ? maxRadius : 36);
  } else if (pressX && Array.isArray(pressX.screen) && pressX.screen.length >= 2) {
    px = pressX.screen[0];
    py = pressX.screen[1];
    radius = typeof pressY === 'number' ? pressY : (typeof maxRadius === 'number' ? maxRadius : 36);
  } else if (typeof pressX === 'number' && typeof pressY === 'number') {
    px = pressX;
    py = pressY;
    radius = typeof maxRadius === 'number' ? maxRadius : 36;
  } else {
    return null;
  }

  let best = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    if (!c) continue;
    let cx = null;
    let cy = null;

    if (Array.isArray(c.screen) && c.screen.length >= 2) {
      cx = c.screen[0];
      cy = c.screen[1];
    } else if (Array.isArray(c.point) && c.point.length >= 2) {
      cx = c.point[0];
      cy = c.point[1];
    } else if (typeof c.x === 'number' && typeof c.y === 'number') {
      cx = c.x;
      cy = c.y;
    } else if (typeof c.sx === 'number' && typeof c.sy === 'number') {
      cx = c.sx;
      cy = c.sy;
    } else if (Array.isArray(c) && c.length >= 2) {
      cx = c[0];
      cy = c[1];
    }

    if (cx === null || cy === null || !Number.isFinite(cx) || !Number.isFinite(cy)) {
      continue;
    }

    const dist = Math.hypot(cx - px, cy - py);
    if (dist <= radius && dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }

  return best;
}

export const pickNearestProjected = pickNearestActorScreen;
export const pickScreenActor = pickNearestActorScreen;
export const pickNearestScreenPoint = pickNearestActorScreen;
