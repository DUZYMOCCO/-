// Source PNGs + image_gen prompts are preserved in docs/art-review/.
// Crop bounds are measured alpha bounds at original 1254px, never inferred by recency.
const asset = (name, dir = 'art-v2') => new URL(`../../assets/${dir}/${name}.webp`, import.meta.url).href;
export const assetUrl = asset;
const sprite = (name, rect, options = {}) => ({
  url: asset(name), rect, originalSize: 1254, px: 512,
  fit: [.94, .86], anchor: [.5, .88], pivot: [.5, 1], ...options,
});

const FLYER_RECT = [25, 230, 1229, 1236], AMPH_RECT = [50, 20, 1203, 1236];
// ground: 'oblique' で地面だけ斜め上から見た絵（assets/art-v2-oblique、お試し）。既定は今までの真上の絵。
export function rasterArtSources({ ground } = {}) {
  const groundDir = ground === 'oblique' ? 'art-v2-oblique' : 'art-v2';
  const scav = sprite('scavenger', [199, 51, 898, 1163]);
  const ponco = sprite('ponco', [90, 16, 1126, 1218]);
  const alien = sprite('alien', [34, 122, 1190, 1011]);
  const pile = sprite('salvage', [28, 213, 1208, 879], { px: 1024, fit: [.94, .64], anchor: [.5, .8] });
  // v1.0.0 Codex gfx3 F_ALT_UNITS: 飛ぶ機体（スカイポンコ・背中の席）と水陸両用機（アビスポンコ・閉じた操縦席。胸の窓は装甲板に描き直した）
  // v1.0.1 Codex gfx4 SKY_VIS: 飛ぶ機体は明るい版（暗い地面で目と輪郭が読める）。枠・切り抜きは前の絵と同じ（alt-flyer.webp は残すだけ）
  const flyer = sprite('alt-flyer-bright', FLYER_RECT);
  const amph = sprite('alt-amphi', AMPH_RECT);
  const hq = sprite('hq', [9, 24, 1236, 1193], { px: 1024, fit: [.96, .80], anchor: [.5, .82] });
  const out = {
    flyer_ally: flyer, amph_ally: amph, // ?altunits=1（お試し）。味方だけ（ポンコと同じ）
    scav_ally: scav, ponco_ally: ponco, alien_enemy: alien, // v0.4.0-dev: 隊長の印（頭の上の飾り）はなくした
    salvage_0: pile, salvage_1: { ...pile, mirror: true },
    salvage_empty: sprite('salvage-empty', [32, 714, 1198, 329], { px: 1024, fit: [.94, .23], anchor: [.5, .8] }),
    hatch: sprite('hatch', [40, 32, 1177, 1156], { px: 1024, fit: [.66, .76], anchor: [.5, .66], pivot: [.5, .51] }),
    hq_ally: hq, hq_enemy: { ...hq, enemy: true },
  };
  // v1.0.3 Codex gfx5 GROUND_TILE: 版 1 は 2つ目の地面の絵（ground-*_v2。真上の絵だけ）。どちらの版を使うかは 4x4 マスごとに座標で決める（ground-field.js の groundVariant）。
  //   斜めの地面（お試し）には 2つ目の絵がないので、今までどおり版 0 と同じ絵
  for (const kind of ['plain', 'forest', 'mountain', 'water']) for (const v of [0, 1]) {
    out[`tile_${kind}_${v}`] = { url: asset(v && ground !== 'oblique' ? `ground-${kind}_v2` : `ground-${kind}`, groundDir), px: 1024, tile: true };
  }
  return out;
}
// v1.0.3 Codex gfx5: 浅瀬の地面。斜めの地面（お試し）にも浅瀬の絵ができた。版 1 は真上の地面だけ
export function shallowGroundSources({ ground } = {}) {
  if (ground === 'oblique') return { tile_shallow_0: { url: asset('ground-shallow', 'art-v2-oblique'), px: 1024, tile: true } };
  return { tile_shallow_0: { url: asset('ground-shallow'), px: 1024, tile: true }, tile_shallow_1: { url: asset('ground-shallow_v2'), px: 1024, tile: true } };
}

// v1.0.3 Codex gfx5 ALLY_WRECK: 味方の機体の傷んだ姿（HP が半分以下）と、やられた後に残る残骸。異星生物は休眠体が残る。
//   Codex は体の絵と同じ 1254 枠・同じ足元・同じ倍率で描いたので、体と同じ切り抜きの高さ（＝同じ倍率）のまま、はみ出す横幅だけ左右に広げて焼く（widenRect）
export const BODY_RECT = Object.freeze({ ponco: Object.freeze([90, 16, 1126, 1218]), scav: Object.freeze([199, 51, 898, 1163]), flyer: FLYER_RECT, amph: AMPH_RECT, alien: Object.freeze([34, 122, 1190, 1011]) });
/** 体の切り抜き body を、絵 art（[x, y, 幅, 高さ]）が入る幅まで左右同じだけ広げる（高さと左右の中心は体と同じ） */
export function widenRect(body, art) {
  const cx = body[0] + body[2] / 2, half = Math.max(body[2] / 2, cx - art[0], art[0] + art[2] - cx);
  return [cx - half, body[1], half * 2, body[3]];
}
// art は Codex の sprite.json の切り抜き（[x, y, 幅, 高さ] に直した物）
export const WRECK_ART = Object.freeze({
  dmg_ponco: Object.freeze({ kind: 'ponco', file: 'ponco_damaged', art: [86, 18, 1134, 1216] }),
  dmg_scav: Object.freeze({ kind: 'scav', file: 'scavenger_damaged', art: [200, 51, 896, 1163] }),
  wreck_ponco: Object.freeze({ kind: 'ponco', file: 'ponco_wreck', art: [57, 493, 1193, 741] }),
  wreck_scav: Object.freeze({ kind: 'scav', file: 'scavenger_wreck', art: [66, 433, 1163, 781] }),
  wreck_flyer: Object.freeze({ kind: 'flyer', file: 'alt-flyer_wreck-bright', art: [124, 557, 1006, 679] }),
  wreck_amph: Object.freeze({ kind: 'amph', file: 'alt-amphi_wreck', art: [18, 399, 1216, 837] }),
  wreck_alien: Object.freeze({ kind: 'alien', file: 'alien_dormant', dir: 'enemies', art: [213, 681, 832, 452] }),
});
/** kinds（機体の種類の並び）の傷んだ姿・残骸の絵。キーは WRECK_ART と同じ */
export function wreckArtSources(kinds = Object.keys(BODY_RECT)) {
  const out = {};
  for (const [key, a] of Object.entries(WRECK_ART)) if (kinds.includes(a.kind)) out[key] = sprite(a.file, widenRect(BODY_RECT[a.kind], a.art), { url: asset(a.file, a.dir) });
  return out;
}

// v1.0.0 Codex gfx3 R_RIDE: PONCO02 の背中に乗った人の絵（assets/ride/PONCO02_<人>_<コマ>.webp。768 枠で ponco.webp と同じ枠・倍率・原点）。
// ポンコと同じ切り抜き（rect）で焼くので、ポンコの絵にそのまま重なる。乗った人だけの絵（ロボは描いていない）。読むのは、だれかが乗った時だけ
export const RIDER_IDS = Object.freeze({ boy: 'BOY', girl: 'GIRL', wolf: 'WOLF' });
export const RIDER_FRAMES = 4, RIDER_FPS = 6;
// v1.0.1 Codex gfx4 SCAV_RIDE: ツギハギ号（scav）の背中の絵（assets/ride/SCAV_<人>_<コマ>.webp。768 枠で scavenger.webp と同じ枠）。キーは ride_scav_<人>_<コマ>
export const RIDE_HOSTS = Object.freeze({
  ponco: Object.freeze({ file: 'PONCO02', rect: Object.freeze([90, 16, 1126, 1218]), prefix: 'ride_' }),
  scav: Object.freeze({ file: 'SCAV', rect: Object.freeze([199, 51, 898, 1163]), prefix: 'ride_scav_' }),
});
export function rideArtSources(host = 'ponco') {
  const out = {}, h = RIDE_HOSTS[host]; if (!h) return out;
  for (const [kind, id] of Object.entries(RIDER_IDS)) for (let i = 0; i < RIDER_FRAMES; i++) out[`${h.prefix}${kind}_${i}`] = sprite(`${h.file}_${id}_${i}`, [...h.rect], { url: asset(`${h.file}_${id}_${i}`, 'ride') });
  return out;
}

// v1.0.1 Codex gfx4 NEST: 巣の絵（1024 枠の全体を焼く。表示は脱出口と同じく anchor [.5,.66]・幅 96）。壊れた巣（nest_broken）は、巣が壊れる仕組みがまだ無いのでしまうだけ
export const NEST_DISPLAY_PX = 96, NEST_ANCHOR = Object.freeze([0.5, 0.66]);
const nestSprite = v => sprite(`nest-${v}`, [0, 0, 1024, 1024], { originalSize: 1024, fit: [1, 1], anchor: [.5, .5], pivot: [.5, .5] });
export function nestArtSources() {
  return { nest_idle: nestSprite('idle'), nest_captive: nestSprite('captive') };
}

// v1.0.1 Codex gfx4 SKY_VIS・ALT_MOTION: 飛ぶ機体の足元の影・燃料をためている姿（地面・水面）、水陸両用機の潜る 4 コマ・水しぶき・水中の影。
//   体の絵と同じ 1254 枠・同じ切り抜きで焼くので、体の絵とそのまま入れ替わる。影は影だけの切り抜き（大きさは shadowWorldSize で計算）。
//   読むのは、飛ぶ機体・水陸両用機がいる時だけ（renderer.js）
export const ALT_SHADOW_RECT = Object.freeze({ flyer_shadow: Object.freeze([78, 1034, 1099, 220]), amph_underwater: Object.freeze([180, 1021, 904, 201]) });
const shadowSprite = (name, rect) => sprite(name, [...rect], { url: asset(name, 'alt-motion'), px: 256, fit: [1, 1], anchor: [.5, .5], pivot: [.5, .5] });
export function altMotionArtSources() {
  const m = name => asset(name, 'alt-motion');
  const out = {
    flyer_charge_ground: sprite('alt-flyer-charge-ground', FLYER_RECT, { url: m('alt-flyer-charge-ground') }),
    flyer_charge_water: sprite('alt-flyer-charge-water', FLYER_RECT, { url: m('alt-flyer-charge-water') }),
    amph_splash: sprite('alt-amphi-splash', AMPH_RECT, { url: m('alt-amphi-splash') }),
    flyer_shadow: shadowSprite('alt-flyer-shadow', ALT_SHADOW_RECT.flyer_shadow),
    amph_underwater: shadowSprite('alt-amphi-underwater', ALT_SHADOW_RECT.amph_underwater),
  };
  for (let i = 0; i < 4; i++) out[`amph_dive_${i}`] = sprite(`alt-amphi-dive-${i}`, AMPH_RECT, { url: m(`alt-amphi-dive-${i}`) });
  return out;
}
/** 体の切り抜き（rect・fit）と体の大きさ bodyPx から、影の切り抜き shadowRect の世界での幅・高さ */
export function shadowWorldSize(bodyRect, shadowRect, bodyPx, fit = [.94, .86]) {
  const k = bodyPx * Math.min(fit[0] / bodyRect[2], fit[1] / bodyRect[3]); // rect は [x, y, 幅, 高さ]（textures.js の rasterToCanvas と同じ）
  return [shadowRect[2] * k, shadowRect[3] * k];
}
export const ALT_BODY_RECT = Object.freeze({ flyer: FLYER_RECT, amph: AMPH_RECT });
// 魚雷（W3-12）と航跡: 1 枚の絵のまま（焼かない）。nose・head は絵の中の先頭の点（px）
export const TORPEDO_ART = Object.freeze({
  torpedo: Object.freeze({ url: asset('torpedo', 'alt-motion'), size: [64, 64], nose: [58, 31], bodyW: 51 }),
  wake: Object.freeze({ url: asset('torpedo-wake', 'alt-motion'), size: [512, 128], head: [505, 64], visW: 265 }),
});

// v1.0.1 Codex gfx4 GROUND_ENEMY / AIR_ENEMY: 新しい敵の絵。?enemydemo=1 の見本の列（js/render/enemy-gallery.js）だけで使う。本編のミッションには出さない。
//   どれも右向き。display は体の大きさ（KIND_PX と同じ意味）。空の敵は lift だけ浮かせ、足元に影
export const ENEMY_ART = Object.freeze({
  G01: Object.freeze({ rect: [25, 206, 1204, 1029], display: 54, alt: 'dormant', altRect: [206, 571, 842, 665], altDisplay: 38 }),
  G02: Object.freeze({ rect: [26, 207, 1203, 1028], display: 54, alt: 'dormant', altRect: [207, 633, 841, 602], altDisplay: 38 }),
  G03: Object.freeze({ rect: [26, 204, 1202, 1031], display: 72, alt: 'dormant', altRect: [206, 663, 843, 573], altDisplay: 50 }),
  G04: Object.freeze({ rect: [25, 296, 1204, 939], display: 54, alt: 'dormant', altRect: [207, 684, 841, 551], altDisplay: 38 }),
  A01: Object.freeze({ rect: [25, 132, 1203, 1103], display: 54, alt: 'down', altRect: [206, 748, 843, 488], altDisplay: 38, shadow: [94, 1024, 1067, 230], lift: 16 }),
  A08: Object.freeze({ rect: [27, 32, 1200, 1203], display: 40, alt: 'down', altRect: [207, 742, 841, 493], altDisplay: 28, shadow: [103, 1034, 1058, 199], lift: 12 }),
});
export function enemyArtSources() {
  const out = {}, e = name => asset(name, 'enemies');
  for (const [id, a] of Object.entries(ENEMY_ART)) {
    out[`enemy_${id}`] = sprite(id, [...a.rect], { url: e(id), px: 256 });
    out[`enemy_${id}_${a.alt}`] = sprite(`${id}_${a.alt}`, [...a.altRect], { url: e(`${id}_${a.alt}`), px: 256 });
    if (a.shadow) out[`enemy_${id}_shadow`] = sprite(`${id}_shadow`, [...a.shadow], { url: e(`${id}_shadow`), px: 128, fit: [1, 1], anchor: [.5, .5], pivot: [.5, .5] });
  }
  return out;
}

// v1.0.1 Codex gfx4 RESULT: 結果のカードの上の絵（文字なし。下の端はカードの色 #141a24 に溶ける）
export const RESULT_BANNER = Object.freeze({ win: asset('result-success', 'result'), lose: asset('result-fail', 'result') });

// v1.0.3 Codex gfx5 GROUND_ENEMY・GIANT_MAP・MAP_PROPS: ?enemydemo=1 の見本の列に足す絵（本編のミッションには出さない。js/render/enemy-gallery.js の GFX5_GALLERY）。
//   G05〜G12 の休眠体は、ふつうの姿と同じ切り抜き（同じ倍率）で焼くので、縮んでへたりこんだのがそのまま見える
export const GFX5_ENEMY_ART = Object.freeze({
  G05: Object.freeze({ rect: [25, 121, 1204, 1115], display: 54 }),
  G06: Object.freeze({ rect: [25, 240, 1204, 996], display: 44 }),
  G07: Object.freeze({ rect: [25, 98, 1204, 1138], display: 54 }),
  G08: Object.freeze({ rect: [25, 239, 1204, 997], display: 44 }),
  G09: Object.freeze({ rect: [25, 181, 1204, 1055], display: 72 }),
  G10: Object.freeze({ rect: [25, 112, 1204, 1124], display: 44 }),
  G11: Object.freeze({ rect: [25, 308, 1204, 928], display: 54 }),
  G12: Object.freeze({ rect: [25, 271, 1204, 965], display: 60 }),
});
// 巨大機ラストタイタン（地図の向き。外から見た閉じた装甲だけ）。sim の巨大機（giant）は大きさ・乗る位置が別に決まっているので、まだつながない
export const GIANT_ART = Object.freeze({ rect: [34, 32, 1185, 1204], wreck: [24, 255, 1204, 981], display: 84 });
export const MINE_ART = Object.freeze({ rect: [16, 18, 224, 220], size: 256, display: 14 }); // G10 ワナグモが置く地雷
// 地図の小物（ふつう・傷んだ・壊れた）。w・h は assets/props の絵の大きさ（px）、worldW は地図での幅（landmarks.json の worldW と同じ意味）
export const PROP_ART = Object.freeze({
  rock: Object.freeze({ worldW: 150, size: { '': [256, 250], _damaged: [256, 244], _destroyed: [256, 152] } }),
  'tank-wreck': Object.freeze({ worldW: 260, size: { '': [512, 342], _damaged: [512, 342], _destroyed: [512, 247] } }),
  'jelly-plant': Object.freeze({ worldW: 140, size: { '': [226, 256], _damaged: [230, 256], _destroyed: [256, 168] } }),
});
export const PROP_PX = 256, PROP_ANCHOR = Object.freeze([0.5, 0.95]);
/** 小物の絵を PROP_PX の正方形に焼いた時、地図での幅を worldW にする表示の大きさ（正方形の一辺） */
export function propDisplay(w, h, worldW, px = PROP_PX) { return worldW * px / (w * Math.min(px / w, px / h)); }
export function gfx5GallerySources() {
  const out = {}, e = name => asset(name, 'enemies'), g = name => asset(name, 'giant');
  for (const [id, a] of Object.entries(GFX5_ENEMY_ART)) {
    out[`enemy_${id}`] = sprite(id, [...a.rect], { url: e(id), px: 256 });
    out[`enemy_${id}_dormant`] = sprite(`${id}_dormant`, [...a.rect], { url: e(`${id}_dormant`), px: 256 });
  }
  out.enemy_alien_dormant = sprite('alien_dormant', [...BODY_RECT.alien], { url: e('alien_dormant'), px: 256 });
  out.enemy_G10_mine = sprite('G10_mine', [...MINE_ART.rect], { url: e('G10_mine'), originalSize: MINE_ART.size, px: 64 });
  out.giant_lasttitan = sprite('LASTTITAN_map', [...GIANT_ART.rect], { url: g('LASTTITAN_map'), px: 256 });
  out.giant_lasttitan_damaged = sprite('LASTTITAN_map_damaged', [...GIANT_ART.rect], { url: g('LASTTITAN_map_damaged'), px: 256 });
  out.giant_lasttitan_wreck = sprite('LASTTITAN_map_wreck', widenRect(GIANT_ART.rect, GIANT_ART.wreck), { url: g('LASTTITAN_map_wreck'), px: 256 });
  for (const [id, p] of Object.entries(PROP_ART)) for (const [st, [w, h]] of Object.entries(p.size)) {
    out[`prop_${id}${st}`] = { url: asset(`${id}_v1${st}`, 'props'), rect: [0, 0, w, h], originalSize: w, px: PROP_PX, fit: [1, 1], anchor: [...PROP_ANCHOR], pivot: [...PROP_ANCHOR] };
  }
  return out;
}
