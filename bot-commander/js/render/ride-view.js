// 乗っている人の見た目（v0.4.12-dev の試作 / ?ridedemo=1）。renderer.js の sync から、sim.ride があるときだけ呼ばれる。
// sim の state を読むだけ。
//   背中: 人間の絵をロボの背中の高さに小さく重ねる。乗る・降りる途中は、地面とのあいだをなめらかに上げ下げ。
//   v1.0.0（Codex gfx3 R_RIDE）: PONCO02 の背中に乗り終えた少年・少女・獣人は、専用の乗り姿の絵（raster-art.js の rideArtSources）をポンコに重ねる。
//   絵があるのは「背中」だけ（中＝操縦席の人は描かない。佳之さんの決まり: 操縦席の人は見せない）。絵がまだ読めていない時は今までの小さな人の絵。
//   中: 人間の絵は消して、ロボの上に小さな人のマーク（乗っている人数。空いている席はうすく）を出す。
//   乗る・降りる途中の進み具合の輪、気絶の星。
import { RIDE, RIDE_MODE, rideCapacity } from '../sim/ride.js?v=3';
import { RIDER_IDS, RIDER_FRAMES, RIDER_FPS, RIDE_HOSTS } from './raster-art.js?v=14';
// v1.0.1（Codex gfx4 SCAV_RIDE）: ツギハギ号（scav）の背中にも専用の乗り姿の絵（ride_scav_<人>_<コマ>）。背中だけ（中の席は今までどおり人を見せない）

/** ロボの種類ごとの、背中の高さ（ワールド px。ロボの足元から人の足元まで）と人の大きさの倍率 */
export const RIDE_LIFT = Object.freeze({ giant: 36, ponco: 25, scav: 20 });
export const RIDER_SCALE = 0.9;
const BODY_PX = Object.freeze({ giant: 34, ponco: 42, scav: 40 }); // renderer.js の KIND_PX と同じ（印を出す高さ用）

const clamp01 = v => Math.max(0, Math.min(1, v));
const hostOf = (sim, id) => sim.units.find(u => u.id === id) || null;

/** 背中の乗り姿の絵のキー（なければ null）。乗り終わっている・背中・ポンコかツギハギ号・絵のある人だけ。now は秒 */
export function riderArtKey(u, host, now) {
  const rd = u.ride, h = RIDE_HOSTS[host?.kind];
  if (!rd || rd.mode !== RIDE_MODE.BACK || rd.phase !== 'on' || !h || !RIDER_IDS[u.kind]) return null;
  return `${h.prefix}${u.kind}_${Math.floor(now * RIDER_FPS) % RIDER_FRAMES}`;
}

/** 乗り降りの進み具合 0〜1（1＝背中の上・ロボの中にいる） */
export function rideProgress(rd) {
  if (rd.phase === 'boarding') return clamp01(rd.t / RIDE.boardSec);
  if (rd.phase === 'alighting') return 1 - clamp01(rd.t / RIDE.alightSec);
  return 1;
}

/**
 * 人間の View を、乗っている状態に合わせる（普通の描画のあとに呼ぶ。位置・順番・大きさ・見える見えないを上書きする）。
 * 乗り終わったら元に戻す（v.rideOn で覚えておく）
 */
export function syncRide(sim, views, zoom, now = 0, tex = null) {
  const drawn = new Map(); // ロボの id → 重ねる乗り姿の絵のキー（renderer.js が描く）
  for (const u of sim.units) {
    if (!u.human) continue;
    const v = views.get(u.id); if (!v) continue;
    const rd = u.ride;
    if (!rd) { if (v.rideOn) { v.c.scale.set(1); v.c.alpha = 1; v.bar.visible = true; v.rideOn = false; } continue; }
    const host = hostOf(sim, rd.host); if (!host) continue;
    v.rideOn = true;
    const k = rideProgress(rd);
    v.c.zIndex = host.y + 1 + (u.id % 5) * 0.01; // ロボの手前
    if (rd.mode === RIDE_MODE.INSIDE) { // 中: 乗り終えたら消える。乗る・降りる途中は、ロボに吸い込まれるようにうすくなる
      v.c.visible = rd.phase !== 'on';
      v.c.alpha = 1 - k; v.c.scale.set(1 - 0.3 * k);
      continue;
    }
    const art = riderArtKey(u, host, now);
    if (art && tex?.[art]) { v.c.visible = false; drawn.set(host.id, art); continue; } // 乗り姿の絵をロボに重ねるので、人の絵は出さない
    v.c.alpha = 1;
    v.c.scale.set(1 - (1 - RIDER_SCALE) * k);
    v.c.y -= (RIDE_LIFT[host.kind] || 24) * k;
    v.bar.visible = !(rd.phase === 'on' && sim.time - (u.lastHit ?? -99) > 3); // 背中の人の体力バーは、当たった直後だけ出す（ロボの頭の上でごちゃつかないように）
  }
  return drawn;
}

/** 乗っている印を markLayer（Graphics）に描く。毎フレーム呼ぶ。zoom は画面の拡大（印を一定の大きさに保つ） */
export function drawRide(sim, g, zoom, now) {
  const s = 1.3 / Math.max(1, zoom);
  // ロボの中の人数: 席の数だけ小さな人のマーク。乗っている席は明るく、空いている席はうすく
  const inside = new Map();
  for (const u of sim.units) if (u.ride && u.ride.mode === RIDE_MODE.INSIDE && u.ride.phase === 'on') inside.set(u.ride.host, (inside.get(u.ride.host) || 0) + 1);
  for (const [hostId, n] of inside) {
    const h = hostOf(sim, hostId); if (!h) continue;
    const cap = Math.max(n, rideCapacity(h, RIDE_MODE.INSIDE)), w = (cap * 6 + 4) * s, hh = 11 * s;
    const lift = (h.z || 0) > 0 ? h.z : 0;
    const x0 = h.x + (BODY_PX[h.kind] || 34) * 0.22, y0 = h.y - (BODY_PX[h.kind] || 34) * 0.82 - lift;
    g.roundRect(x0 - 2 * s, y0 - hh + 2 * s, w, hh, 3 * s).fill({ color: 0x121418, alpha: 0.88 }).stroke({ width: 1 * s, color: 0x7df9ff, alpha: 0.9 });
    for (let i = 0; i < cap; i++) {
      const cx = x0 + (i * 6 + 3) * s, on = i < n, col = on ? 0x7df9ff : 0x4b5563;
      g.circle(cx, y0 - 5.2 * s, 1.7 * s).fill({ color: col });
      g.ellipse(cx, y0 - 1.2 * s, 2.5 * s, 2 * s).fill({ color: col });
    }
  }
  for (const u of sim.units) {
    if (!u.human || !(u.ride || u.dazed > 0)) continue;
    const x = u.x, lift = u.ride && u.ride.mode === RIDE_MODE.BACK ? (RIDE_LIFT[hostOf(sim, u.ride.host)?.kind] || 24) * rideProgress(u.ride) : 0;
    const y = u.y - 40 - lift + (u.z || 0) * -1; // 頭の上
    if (u.ride && u.ride.phase !== 'on') { // 乗る・降りる途中の進み具合の輪
      const p = u.ride.phase === 'boarding' ? clamp01(u.ride.t / RIDE.boardSec) : clamp01(u.ride.t / RIDE.alightSec);
      g.circle(x, y, 5 * s).fill({ color: 0x121418, alpha: 0.85 });
      g.moveTo(x, y - 4 * s).arc(x, y, 4 * s, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).stroke({ width: 2 * s, color: 0x7df9ff });
    }
    if (u.dazed > 0) { // 気絶: 頭の上でまわる星
      for (let i = 0; i < 3; i++) {
        const a = now * 5 + i * Math.PI * 2 / 3;
        g.star(x + Math.cos(a) * 8 * s, y + 2 * s + Math.sin(a) * 2.5 * s, 4, 2.6 * s, 1.1 * s).fill({ color: 0xfacc15 });
      }
    }
  }
}
