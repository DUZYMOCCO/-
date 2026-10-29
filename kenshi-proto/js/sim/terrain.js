// 地面の高さ。シードを使わない固定式で、決定的な純関数。

function baseHeight(x, z) {
  return (
    Math.sin(x * 0.031) * 1.4 +
    Math.cos(z * 0.027) * 1.2 +
    Math.sin((x + z) * 0.019) * 0.8 +
    Math.cos((x - z) * 0.043) * 0.5 +
    Math.sin(x * 0.11 + z * 0.07) * 0.95
  );
}

function flatten(h, x, z, cx, cz, r) {
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d >= r) return h;
  const t = 1 - d / r;
  const k = Math.min(1, t * 1.7);
  const flat = baseHeight(cx, cz) * 0.6;
  return h * (1 - k) + flat * k;
}

export function heightAt(x, z) {
  let h = baseHeight(x, z);
  h = flatten(h, x, z, -110, 60, 34);
  h = flatten(h, x, z, 120, 110, 26);
  h = flatten(h, x, z, 100, -90, 22);
  h = flatten(h, x, z, -60, -120, 18);
  return Math.round(h * 1000) / 1000;
}
