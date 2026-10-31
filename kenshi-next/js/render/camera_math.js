// Pure camera placement, shared by gameplay and terrain clearance tests.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = x => { x = clamp(x, 0, 1); return x*x*(3-2*x); };
export function cameraPlacement(focus, yaw, pitch, distance, heightAt) {
  const low = smooth((25 - pitch * 180 / Math.PI) / 25);
  const close = smooth((12 - distance) / 8);
  const blend = low * close;
  const lift = 1.85 * blend, shoulder = 0.5 * blend;
  const sx = Math.cos(yaw) * shoulder, sz = -Math.sin(yaw) * shoulder;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = focus.x + Math.sin(yaw)*cp*distance + sx;
  const z = focus.z + Math.cos(yaw)*cp*distance + sz;
  const groundY = heightAt(x, z);
  let y = focus.y + lift + sp*distance;
  const midX = (focus.x + sx + x)/2, midZ = (focus.z + sz + z)/2;
  const floor = pitch >= 25*Math.PI/180 ? groundY + 1.5 : Math.max(groundY + 0.5, 2*(heightAt(midX, midZ)+0.5)-(focus.y+lift));
  const pushed = y < floor;
  y = Math.max(y, floor);
  // Preserve the requested pitch when terrain raises a low camera.
  const look = pushed && pitch < 25*Math.PI/180
    ? {x: x-Math.sin(yaw)*cp*distance, y: y-sp*distance, z: z-Math.cos(yaw)*cp*distance}
    : {x: focus.x+sx, y: focus.y+lift, z: focus.z+sz};
  return {x,y,z,groundY,look, lift};
}
