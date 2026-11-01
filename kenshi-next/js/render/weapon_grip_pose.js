export const GRIP = { x: 0, y: 0, z: Math.PI, off: [0, 0.085, 0.0] };
// Mirror the right-hand grip across the palm's left/right axis for a natural left-hand hold.
export const GRIP_LEFT = { x: GRIP.x, y: -GRIP.y, z: -GRIP.z, off: [-GRIP.off[0], GRIP.off[1], GRIP.off[2]] };
export function gripSpecForHand(hand) { return hand === 'hand_l' ? GRIP_LEFT : GRIP; }
