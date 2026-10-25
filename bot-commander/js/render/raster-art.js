// Source PNGs + image_gen prompts are preserved in docs/art-review/.
// Crop bounds are measured alpha bounds at original 1254px, never inferred by recency.
const asset = (name, dir = 'art-v2') => new URL(`../../assets/${dir}/${name}.webp`, import.meta.url).href;
const sprite = (name, rect, options = {}) => ({
  url: asset(name), rect, originalSize: 1254, px: 512,
  fit: [.94, .86], anchor: [.5, .88], pivot: [.5, 1], ...options,
});

// ground: 'oblique' で地面だけ斜め上から見た絵（assets/art-v2-oblique、お試し）。既定は今までの真上の絵。
export function rasterArtSources({ ground } = {}) {
  const groundDir = ground === 'oblique' ? 'art-v2-oblique' : 'art-v2';
  const scav = sprite('scavenger', [199, 51, 898, 1163]);
  const ponco = sprite('ponco', [90, 16, 1126, 1218]);
  const alien = sprite('alien', [34, 122, 1190, 1011]);
  const pile = sprite('salvage', [28, 213, 1208, 879], { px: 1024, fit: [.94, .64], anchor: [.5, .8] });
  // v1.0.0 Codex gfx3 F_ALT_UNITS: 飛ぶ機体（スカイポンコ・背中の席）と水陸両用機（アビスポンコ・閉じた操縦席。胸の窓は装甲板に描き直した）
  const flyer = sprite('alt-flyer', [25, 230, 1229, 1236]);
  const amph = sprite('alt-amphi', [50, 20, 1203, 1236]);
  const hq = sprite('hq', [9, 24, 1236, 1193], { px: 1024, fit: [.96, .80], anchor: [.5, .82] });
  const out = {
    flyer_ally: flyer, amph_ally: amph, // ?altunits=1（お試し）。味方だけ（ポンコと同じ）
    scav_ally: scav, ponco_ally: ponco, alien_enemy: alien, // v0.4.0-dev: 隊長の印（頭の上の飾り）はなくした
    salvage_0: pile, salvage_1: { ...pile, mirror: true },
    salvage_empty: sprite('salvage-empty', [32, 714, 1198, 329], { px: 1024, fit: [.94, .23], anchor: [.5, .8] }),
    hatch: sprite('hatch', [40, 32, 1177, 1156], { px: 1024, fit: [.66, .76], anchor: [.5, .66], pivot: [.5, .51] }),
    hq_ally: hq, hq_enemy: { ...hq, enemy: true },
  };
  for (const kind of ['plain', 'forest', 'mountain', 'water']) for (const v of [0, 1]) {
    out[`tile_${kind}_${v}`] = { url: asset(`ground-${kind}`, groundDir), px: 1024, tile: true };
  }
  return out;
}

// v1.0.0 Codex gfx3 R_RIDE: PONCO02 の背中に乗った人の絵（assets/ride/PONCO02_<人>_<コマ>.webp。768 枠で ponco.webp と同じ枠・倍率・原点）。
// ポンコと同じ切り抜き（rect）で焼くので、ポンコの絵にそのまま重なる。乗った人だけの絵（ロボは描いていない）。読むのは、だれかが乗った時だけ
export const RIDER_IDS = Object.freeze({ boy: 'BOY', girl: 'GIRL', wolf: 'WOLF' });
export const RIDER_FRAMES = 4, RIDER_FPS = 6;
export function rideArtSources() {
  const out = {};
  for (const [kind, id] of Object.entries(RIDER_IDS)) for (let i = 0; i < RIDER_FRAMES; i++) out[`ride_${kind}_${i}`] = sprite(`PONCO02_${id}_${i}`, [90, 16, 1126, 1218], { url: asset(`PONCO02_${id}_${i}`, 'ride') });
  return out;
}
