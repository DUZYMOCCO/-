// Render-only target directions, in world coordinates. Forward is the carrier's facing.
export function carryDirections(forward, sway = 0) {
  const f = Math.hypot(forward.x, forward.z) || 1;
  const x = forward.x / f, z = forward.z / f;
  const unit = (a, y, b) => { const n = Math.hypot(a, y, b); return { x: a / n, y: y / n, z: b / n }; };
  return {
    torso: unit(-x * (1.35 - sway), -1, -z * (1.35 - sway)),
    thigh: unit(x * (0.8 + sway), -1, z * (0.8 + sway)),
    calf: unit(x * (-0.12 + sway), -1, z * (-0.12 + sway)),
    arm: unit(x * sway, -1, z * sway),
    head: unit(x * sway, -1, z * sway),
  };
}

// Independent damped springs respond to changes in carrier velocity, not simulation state.
export function stepCarrySway(s, velocity, dt, strength = 1) {
  dt = Math.min(Math.max(dt || 0, 0), 0.05);
  const acceleration = Math.max(-12, Math.min(12, (velocity - s.lastVelocity) / Math.max(dt, 0.001)));
  s.lastVelocity = velocity;
  s.speed += (-32 * s.angle - 9 * s.speed - acceleration * 0.12 * strength) * dt;
  s.angle = Math.max(-0.2, Math.min(0.2, s.angle + s.speed * dt));
  return s.angle;
}
