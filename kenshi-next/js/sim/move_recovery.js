// Find the nearest clear, walkable point when an actor starts a move inside an obstacle.
export function nearestClearPoint(x, z, walkableAt, blockedAt, options = {}) {
  const step = Number.isFinite(options.step) ? Math.max(0.1, options.step) : 0.25;
  const maxDistance = Number.isFinite(options.maxDistance) ? Math.max(step, options.maxDistance) : 8;
  const goal = options.goal;
  const points = [];
  const rings = Math.ceil(maxDistance / step);
  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = ring * step;
    const count = Math.max(16, Math.ceil((Math.PI * 2 * radius) / step));
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const point = { x: x + Math.sin(angle) * radius, z: z + Math.cos(angle) * radius };
      if (!walkableAt(point.x, point.z) || blockedAt(point.x, point.z)) continue;
      const goalDistance = goal ? Math.hypot(goal.x - point.x, goal.z - point.z) : 0;
      points.push({ ...point, distance: radius, goalDistance });
    }
    if (points.length) break;
  }
  points.sort((a, b) => a.distance - b.distance || a.goalDistance - b.goalDistance || a.z - b.z || a.x - b.x);
  if (!points.length) return null;
  return { x: points[0].x, z: points[0].z };
}
