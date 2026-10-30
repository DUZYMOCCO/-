// 勢力の色。factionPaletteFor(gameFactionId) でパレット（主・副・暗の3色）を返す。
import { FACTION_PALETTES } from '../data/faction_palettes.js';
import { paletteIdFor, GAME_FACTION_MAP, ROLE_FACTION_MAP } from '../data/faction_map.js';

export { paletteIdFor, GAME_FACTION_MAP, ROLE_FACTION_MAP };

const cache = new Map();

// '#rrggbb' → [r,g,b]（0〜1）
export function hexToRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// ゲームの勢力 id（'guard' など）・パレット勢力 id・actor のどれでも受け取り、{ id, hex:[3], rgb:[3], kinds, category } を返す。
// 同じ id なら同じオブジェクト（actor を渡した場合も、決まった勢力 id のオブジェクト）を返す。
export function factionPaletteFor(gameFactionId) {
  const id = paletteIdFor(gameFactionId);
  let pal = cache.get(id);
  if (!pal) {
    const row = FACTION_PALETTES[id];
    pal = { id, hex: row.p, rgb: row.p.map(hexToRgb), kinds: row.k, category: row.c };
    cache.set(id, pal);
  }
  return pal;
}
