// v1.0.1 Codex gfx4 GROUND_ENEMY・AIR_ENEMY: ?enemydemo=1 の時だけ、味方の基地の少し上に新しい敵の絵を見本として並べる（見た目だけ）。
//   sim には入れない（動かない・撃たない・当たらない・ハッシュに入らない）。本編のミッションには出さない。
//   霧の上の専用の層に置くので、霧に関係なくいつも見える（isSeen を渡したときだけ隠す）。
//   上の列: ふつうの姿（G01〜G04・A01・A08。空の敵は浮かせて足元に影・ゆっくり上下）。下の列: 休んでいる姿（dormant）・落ちた姿（down）
import { ENEMY_ART, shadowWorldSize, GFX5_ENEMY_ART, GIANT_ART, MINE_ART, PROP_ART, PROP_ANCHOR, propDisplay } from './raster-art.js?v=14';

export const GALLERY_IDS = Object.freeze(Object.keys(ENEMY_ART));
export const GALLERY_STEP = 1.9, GALLERY_ROW_GAP = 2.4, GALLERY_ABOVE_HQ = 7.5; // マス
const BOB_PX = 3, BOB_SPEED = 1.8;

/** 見本の置き場所（ワールド px）。Pixi を使わない（tests/gfx4.test.mjs） */
export function galleryLayout(map, tile = 32) {
  const hq = map.hq?.ally ?? { tx: Math.floor(map.w / 2), ty: map.h - 4 };
  const n = GALLERY_IDS.length, cx = (hq.tx + 0.5) * tile, w = (n - 1) * GALLERY_STEP * tile;
  const x0 = Math.max(tile, Math.min(map.w * tile - tile - w, cx - w / 2));
  const y = Math.max(tile * 2.5, (hq.ty + 0.5 - GALLERY_ABOVE_HQ) * tile);
  return GALLERY_IDS.map((id, i) => ({ id, x: x0 + i * GALLERY_STEP * tile, y, yAlt: y + GALLERY_ROW_GAP * tile }));
}

export function buildEnemyGallery({ Sprite, Container, Text }, tex, map, layer, { tile = 32, isSeen = () => true } = {}) {
  const items = [];
  for (const p of galleryLayout(map, tile)) {
    const a = ENEMY_ART[p.id], body = tex[`enemy_${p.id}`], alt = tex[`enemy_${p.id}_${a.alt}`];
    if (!body) continue;
    const c = new Container(); c.position.set(p.x, p.y); c.zIndex = p.y;
    let shadow = null;
    if (a.shadow && tex[`enemy_${p.id}_shadow`]) {
      const t = tex[`enemy_${p.id}_shadow`], [ww] = shadowWorldSize(a.rect, a.shadow, a.display);
      shadow = new Sprite(t); shadow.anchor.set(0.5); shadow.scale.set(ww / (t.orig.width || 1)); shadow.alpha = 0.85;
      c.addChild(shadow);
    }
    const s = new Sprite(body); s.anchor.set(0.5, 0.88); s.width = s.height = a.display; c.addChild(s);
    const label = new Text({ text: p.id, style: { fontFamily: 'sans-serif', fontSize: 9, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x101418, width: 3 } } });
    label.anchor.set(0.5, 0); label.position.set(0, 4); c.addChild(label);
    layer.addChild(c);
    let c2 = null;
    if (alt) {
      c2 = new Container(); c2.position.set(p.x, p.yAlt); c2.zIndex = p.yAlt;
      const s2 = new Sprite(alt); s2.anchor.set(0.5, 0.88); s2.width = s2.height = a.altDisplay; c2.addChild(s2);
      const l2 = new Text({ text: a.alt, style: { fontFamily: 'sans-serif', fontSize: 7, fill: 0xd1d5db, stroke: { color: 0x101418, width: 3 } } });
      l2.anchor.set(0.5, 0); l2.position.set(0, 3); c2.addChild(l2);
      layer.addChild(c2);
    }
    items.push({ p, a, c, c2, s, i: items.length });
  }
  const tx = x => Math.floor(x / tile);
  return {
    items,
    sync(now) {
      for (const it of items) {
        it.c.visible = isSeen(tx(it.p.x), tx(it.p.y)); if (it.c2) it.c2.visible = isSeen(tx(it.p.x), tx(it.p.yAlt));
        if (it.a.lift) it.s.y = -(it.a.lift + Math.sin(now * BOB_SPEED + it.i * 1.7) * BOB_PX);
      }
    },
  };
}

// v1.0.3 Codex gfx5: 上の見本の、さらに上（北）に新しい絵の列を足す（見た目だけ。sim に入れない）。下から:
//   休眠体（G05〜G12）→ ふつうの姿（G05〜G12）→ 異星生物の休眠体・地雷・巨大機ラストタイタン（ふつう・傷んだ・残骸）→ 小物 3 種（ふつう・傷んだ・壊れた。地図の幅 worldW のまま）
const ids5 = Object.keys(GFX5_ENEMY_ART);
export const GFX5_ROWS = Object.freeze([
  Object.freeze({ above: 10.5, step: 1.9, items: ids5.map(id => ({ key: `enemy_${id}_dormant`, label: `${id} dormant`, display: GFX5_ENEMY_ART[id].display, small: true })) }),
  Object.freeze({ above: 13, step: 1.9, items: ids5.map(id => ({ key: `enemy_${id}`, label: id, display: GFX5_ENEMY_ART[id].display })) }),
  Object.freeze({ above: 16.5, step: 3, items: [
    { key: 'enemy_alien_dormant', label: 'alien dormant', display: 64 },
    { key: 'enemy_G10_mine', label: 'G10 mine', display: MINE_ART.display },
    { key: 'giant_lasttitan', label: 'LASTTITAN', display: GIANT_ART.display },
    { key: 'giant_lasttitan_damaged', label: 'damaged', display: GIANT_ART.display },
    { key: 'giant_lasttitan_wreck', label: 'wreck', display: GIANT_ART.display },
  ] }),
  ...[['jelly-plant', 22], ['rock', 27.5], ['tank-wreck', 33.5]].map(([id, above]) => Object.freeze({ above, step: PROP_ART[id].worldW / 32 + 0.8, items: Object.entries(PROP_ART[id].size).map(([st, [w, h]]) => ({ key: `prop_${id}${st}`, label: id + st, display: propDisplay(w, h, PROP_ART[id].worldW), anchor: PROP_ANCHOR })) })),
]);
/** v1.0.3 新しい見本の置き場所（ワールド px）。Pixi を使わない（tests/gfx5.test.mjs） */
export function gfx5GalleryLayout(map, tile = 32) {
  const hq = map.hq?.ally ?? { tx: Math.floor(map.w / 2), ty: map.h - 4 };
  const cx = (hq.tx + 0.5) * tile, out = [];
  for (const row of GFX5_ROWS) {
    const w = (row.items.length - 1) * row.step * tile, x0 = Math.max(tile, Math.min(map.w * tile - tile - w, cx - w / 2));
    const y = Math.max(tile * 2.5, (hq.ty + 0.5 - row.above) * tile);
    row.items.forEach((it, i) => out.push({ ...it, x: x0 + i * row.step * tile, y }));
  }
  return out;
}
export function buildGfx5Gallery({ Sprite, Container, Text }, tex, map, layer, { tile = 32, isSeen = () => true } = {}) {
  const items = [];
  for (const p of gfx5GalleryLayout(map, tile)) {
    const t = tex[p.key]; if (!t) continue;
    const c = new Container(); c.position.set(p.x, p.y); c.zIndex = p.y;
    const s = new Sprite(t); s.anchor.set(p.anchor?.[0] ?? 0.5, p.anchor?.[1] ?? 0.88); s.width = s.height = p.display; c.addChild(s);
    const label = new Text({ text: p.label, style: { fontFamily: 'sans-serif', fontSize: p.small ? 7 : 9, fontWeight: p.small ? '400' : '700', fill: p.small ? 0xd1d5db : 0xffffff, stroke: { color: 0x101418, width: 3 } } });
    label.anchor.set(0.5, 0); label.position.set(0, 3); c.addChild(label);
    layer.addChild(c); items.push({ p, c });
  }
  const tx = x => Math.floor(x / tile);
  return { items, sync() { for (const it of items) it.c.visible = isSeen(tx(it.p.x), tx(it.p.y)); } };
}
