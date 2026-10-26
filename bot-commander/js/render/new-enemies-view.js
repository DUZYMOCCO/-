// 新しい敵 G01〜G12・A01・A08 の見た目（?newenemies=1 の試作。見た目だけ。sim には何も書かない）。
// 絵は assets/enemies の今ある物（?enemydemo=1 の見本と同じ切り抜き。raster-art.js の ENEMY_ART・GFX5_ENEMY_ART）。新しい絵は作らない。
//   体: tex.enemy_<ID>（右向き）／ 倒れた後: tex.enemy_<ID>_dormant（G01〜G12 の休眠体）・tex.enemy_<ID>_down（空の敵）／ 地雷: tex.enemy_G10_mine
// Pixi を使わない部分（絵の表・大きさ）は tests/newenemies.test.mjs から直接呼ぶ。
import { assetUrl, ENEMY_ART, GFX5_ENEMY_ART, MINE_ART } from './raster-art.js?v=14';
import { NE_IDS } from '../sim/new-enemies.js?v=2';

/** 体の大きさ（ワールド px。KIND_PX と同じ意味）。?enemydemo=1 の見本と同じ display */
export const NE_PX = Object.freeze(Object.fromEntries(NE_IDS.map(id => [id, (ENEMY_ART[id] ?? GFX5_ENEMY_ART[id]).display])));
/** 休眠体・落ちた姿を体と同じ足元で出す時の倍率。G01〜G04・空の敵の絵は休眠体の切り抜き（altRect）が小さいので altDisplay/display。G05〜G12 は体と同じ切り抜き（1） */
export const neWreckScale = kind => { const a = ENEMY_ART[kind]; return a ? a.altDisplay / a.display : 1; };

const bake = (name, rect, extra = {}) => ({ url: assetUrl(name, 'enemies'), rect: [...rect], originalSize: 1254, px: 256, fit: [.94, .86], anchor: [.5, .88], pivot: [.5, 1], ...extra });
/** 読む絵（textures.js の buildTextures に渡す）。14 種の体と、倒れた姿、地雷 */
export function newEnemyArtSources() {
  const out = {};
  for (const id of NE_IDS) {
    const a = ENEMY_ART[id];
    if (a) {
      out[`enemy_${id}`] = bake(id, a.rect);
      out[`enemy_${id}_${a.alt}`] = bake(`${id}_${a.alt}`, a.altRect);
    } else {
      const g = GFX5_ENEMY_ART[id];
      out[`enemy_${id}`] = bake(id, g.rect);
      out[`enemy_${id}_dormant`] = bake(`${id}_dormant`, g.rect);
    }
  }
  out.enemy_G10_mine = bake('G10_mine', MINE_ART.rect, { originalSize: MINE_ART.size, px: 64 });
  return out;
}

/** G10 の地雷の絵（sim.ne.mines）。見えている所（霧の外）だけ、薄く出す */
export function createMineView({ Sprite }, tex, layer) {
  const views = new Map();
  return {
    views,
    sync(sim, isVisible, tile = 32) {
      const mines = sim.ne?.mines || [], seen = new Set();
      for (const m of mines) {
        seen.add(m.id);
        let s = views.get(m.id);
        if (!s) {
          if (!tex.enemy_G10_mine) continue;
          s = new Sprite(tex.enemy_G10_mine); s.anchor.set(0.5); s.width = s.height = MINE_ART.display; s.alpha = 0.75;
          layer.addChild(s); views.set(m.id, s);
        }
        s.position.set(m.x, m.y); s.zIndex = m.y - 9;
        s.visible = isVisible(Math.floor(m.x / tile), Math.floor(m.y / tile));
      }
      for (const [id, s] of views) if (!seen.has(id)) { s.destroy(); views.delete(id); }
    },
  };
}
