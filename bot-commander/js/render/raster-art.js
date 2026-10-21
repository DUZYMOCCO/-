// Source PNGs + image_gen prompts are preserved in docs/art-review/.
// Crop bounds are measured alpha bounds at original 1254px, never inferred by recency.
const asset = name => new URL(`../../assets/art-v2/${name}.webp`, import.meta.url).href;
const sprite = (name, rect, options = {}) => ({
  url: asset(name), rect, originalSize: 1254, px: 512,
  fit: [.94, .86], anchor: [.5, .88], pivot: [.5, 1], ...options,
});

export function rasterArtSources() {
  const scav = sprite('scavenger', [199, 51, 898, 1163]);
  const ponco = sprite('ponco', [90, 16, 1126, 1218]);
  const alien = sprite('alien', [34, 122, 1190, 1011]);
  const pile = sprite('salvage', [28, 213, 1208, 879], { px: 1024, fit: [.94, .64], anchor: [.5, .8] });
  const hq = sprite('hq', [9, 24, 1236, 1193], { px: 1024, fit: [.96, .80], anchor: [.5, .82] });
  const out = {
    scav_ally: scav, scav_ally_cmd: { ...scav, badge: { type: 'lamp', x: .56, y: .18 } },
    ponco_ally: ponco, ponco_ally_cmd: { ...ponco, badge: { type: 'crest', x: .52, y: .17 } },
    alien_enemy: alien, alien_enemy_cmd: { ...alien, badge: { type: 'amber', x: .48, y: .17 } },
    salvage_0: pile, salvage_1: { ...pile, mirror: true },
    salvage_empty: sprite('salvage-empty', [32, 714, 1198, 329], { px: 1024, fit: [.94, .23], anchor: [.5, .8] }),
    hatch: sprite('hatch', [40, 32, 1177, 1156], { px: 1024, fit: [.66, .76], anchor: [.5, .66], pivot: [.5, .51] }),
    hq_ally: hq, hq_enemy: { ...hq, enemy: true },
  };
  for (const kind of ['plain', 'forest', 'mountain', 'water']) for (const v of [0, 1]) {
    out[`tile_${kind}_${v}`] = { url: asset(`ground-${kind}`), px: 1024, tile: true };
  }
  return out;
}
