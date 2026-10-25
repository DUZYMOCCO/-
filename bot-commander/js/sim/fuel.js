// 飛ぶ機体の燃料（FUEL。v1.0.0 の決定）。データと計算だけ（DOM・Pixi・乱数なし）。数値はすべて【仮】。
//   ・空にいる間だけ減る。重いほど早く減る（重さ＝持っている武器の数＋乗っている人の数）
//   ・0 になると降りて（z=0）、しばらく動けずに燃料をためる。いっぱいになったら、また飛ぶ
//   ・深い水の上で切れた時は、水面に浮いたまま動けず、ためる（u.fuelFloat）
// 燃料の表（FUEL_TABLE）にある種類の機体だけに効く。本編のミッションの機体（表にない）には何も足さない（ハッシュは変わらない）。
import { ALT, BAND, bandOf } from './altitude.js?v=1';

export const FUEL_TABLE = Object.freeze({
  flyer: Object.freeze({
    max: 30,          // 燃料の量（何も持たず・だれも乗せずに、何秒飛べるか）
    perWeight: 0.25,  // 重さ 1 ごとに、減る速さが何割ふえるか
    rechargeSec: 6,   // 0 から いっぱいまでためる秒数（この間は地面・水面で動けない）
    flyZ: ALT.demoAirZ, // ためおわって飛びあがる高さ
  }),
});

export const hasFuel = u => !!u && !!FUEL_TABLE[u.kind];
/** 重さ: 持っている武器（1つ目＋2つ目以降・背中）＋乗っている人 */
export function fuelWeight(sim, u) {
  const guns = (u.atk > 0 && u.range > 0 ? 1 : 0) + (u.loadoutFx?.guns?.length || 0);
  const riders = sim.ride ? sim.units.filter(h => h.ride && h.ride.host === u.id).length : 0;
  return guns + riders;
}
/** 1 秒に減る量 */
export const fuelDrain = (sim, u) => 1 + (FUEL_TABLE[u.kind]?.perWeight || 0) * fuelWeight(sim, u);
/** 燃料をためている（降りて動けない）か */
export const isRefueling = u => !!u?.fuelDown;
/** 残りの割合（0〜1）。表にない機体は null */
export const fuelRatio = u => (hasFuel(u) && u.fuelMax > 0 ? Math.max(0, Math.min(1, u.fuel / u.fuelMax)) : null);

/** 機体を作った時に燃料を入れる（表にある種類だけ） */
export function initFuel(u) {
  const f = FUEL_TABLE[u.kind]; if (!f) return;
  u.fuelMax = f.max; u.fuel = f.max; u.fuelDown = false; u.fuelFloat = false;
}

/** 1 ステップ分。isDeepWater(u) は「いまいる所が深い水か」 */
export function stepFuel(sim, dt, isDeepWater) {
  for (const u of sim.units) {
    const f = FUEL_TABLE[u.kind]; if (!f || u.hp <= 0) continue;
    if (u.fuelMax == null) initFuel(u);
    if (u.fuelDown) {
      u.z = 0; u.moving = false;
      u.fuel = Math.min(u.fuelMax, u.fuel + u.fuelMax / f.rechargeSec * dt);
      if (u.fuel >= u.fuelMax) { u.fuelDown = false; u.fuelFloat = false; u.z = f.flyZ; }
      continue;
    }
    if (bandOf(u.z || 0) !== BAND.AIR) continue; // 空にいない時は減らない
    u.fuel = Math.max(0, u.fuel - fuelDrain(sim, u) * dt);
    if (u.fuel <= 0) {
      u.fuelDown = true; u.z = 0; u.moving = false;
      u.fuelFloat = !!isDeepWater?.(u);
      if (u.order) { u.order = null; u.anchor = { x: u.x, y: u.y }; } // 降りたら命令は終わり（また飛んだら、命令しなおす）
      sim.fx.push({ type: 'fuelOut', x: u.x, y: u.y, t: sim.time, id: u.id, float: u.fuelFloat });
    }
  }
}
