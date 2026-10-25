// 描画（Pixi v8）。シミュレーションの state を読むだけで、書き換えない。
// v0.4.0-dev: 部隊の表示をやめ、選んだ機体ごとに輪と経路。人間（少年・少女）と「捕まった」の表示。
// v0.4.0-dev（10/23）: 撃つ・当たる・倒れるの演出は js/fx（Canvas2D）。Pixi の上に重ねた透明 canvas に、同じカメラで描く。
//   画面のゆれは world ごとずらす。止め（hit-stop）は index.js が fx.update の戻り値でシミュレーションを止める。
// v0.4.0-dev（10/23 夜）: 遮蔽物と落とし物の見た目（js/render/cover-view.js）。
import { Application, Container, Sprite, Graphics, Text, Texture, Rectangle, RenderTexture, BlurFilter, CanvasSource, TexturePool } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { TILE, TERRAIN, toTile, tileCenter } from '../sim/map.js?v=6';
import { groupUnits, unitById, REPAIRER_KIT_BUILD_SEC, SUPPORTER_SHIELD_BUILD_SEC, isDefensive, unitWeaponInfo } from '../sim/sim.js?v=23';
import { fuelRatio, isRefueling } from '../sim/fuel.js?v=1'; // 飛ぶ機体の燃料の小さなゲージ（v1.0.0）
import { unreachableTarget } from '../sim/targeting.js?v=2'; // 敵が届かない相手（空・水中）を前にした時の小さな印（v1.0.0）
// v0.4.2: リペアキットを使い切った味方ロボットは、HPバーの右に小さな赤い点（キット切れ）
const noKit = u => u.side === 'ally' && !u.human && !(u.kits > 0);
// v0.4.4 シールド: HP バーのすぐ上の細い水色のバー（耐久がある間だけ）。描き直しの鍵は 0.5 刻み
const SHIELD_COLOR = 0x7dd3fc;
const shieldKey = u => (u.shieldMax > 0 && u.shieldHp > 0 ? Math.ceil(u.shieldHp * 2) : 0);
/** HP バー（y 4..8）と、その上のシールドのバー（y 0.6..3.4） */
function drawBars(g, u, w) {
  const r = Math.max(0, u.hp / u.maxHp);
  g.clear().rect(-w / 2, 4, w, 4).fill({ color: 0x121418 }).rect(-w / 2 + 0.8, 4.8, (w - 1.6) * r, 2.4).fill({ color: r > 0.5 ? 0x4ade80 : r > 0.25 ? 0xfacc15 : 0xef4444 });
  if (u.shieldMax > 0 && u.shieldHp > 0) {
    const s = Math.min(1, u.shieldHp / u.shieldMax), sw = w * shieldBarFrac(u.shieldMax); // 盾が厚い機体ほどバーが長い（機体の表）
    g.rect(-w / 2, 0.6, sw, 3).fill({ color: 0x121418, alpha: 0.85 }).rect(-w / 2 + 0.8, 1.2, (sw - 1.6) * s, 1.8).fill({ color: SHIELD_COLOR });
  }
}
const drawNoKit = (g, x) => g.circle(x + 3.6, 6, 2.6).fill({ color: 0x121418 }).circle(x + 3.6, 6, 1.8).fill({ color: 0xef4444 });
import { FX_MAX, FX_SHAKE_MAX, FX_MARGIN, spawnFxEvents } from './fx-events.js?v=9';
import { loadLandmarks, createCoverView } from './cover-view.js?v=7';
import { create as createFx } from '../fx/fx.js?v=2';
import { GATHER_RADIUS, EXTRACT_RADIUS, CAPTURE } from '../sim/mission.js?v=10';
import { artSources, svgArtSources } from './art.js?v=12';
import { buildTextures, loadCharSheets, disposeTexture, disposeChars, canvasOf as textureCanvasOf } from './textures.js?v=11';
import { createPieceCache, releaseSharedListeners } from './piece-cache.js?v=1';
import { EDGE_PAIRS, EDGE_NAMES, MIX3_FILES, pairDir, edgePieces } from './ground-edges.js?v=2';
import { FIELD_ORDER, createField, bakeChunk } from './ground-field.js?v=2';
// v0.4.8: 地面をなめらかな場で焼く（js/render/ground-field.js）。?smooth=0 で v0.4.8 の境界の絵（edges2）に戻す
const SMOOTH_GROUND = typeof location === 'undefined' || new URLSearchParams(location.search).get('smooth') !== '0';
import { ALT_UNIT_LOOK } from '../sim/alt-units.js?v=3'; // 飛ぶ機体・水陸両用機の絵（v1.0.0 gfx3 の専用の絵。前はポンコの色違い）
import { classIconOf, drawClassIcon, ICON_R, ICON_MIN_ZOOM, CLASS_BADGES, STATUS_BADGES, KIT_ICON_R, badgePath, classBadgeOf, statusBadgeOf, STATE_BADGE_R, shieldBarFrac } from './class-icons.js?v=5';
/** v0.4.10 アイコンの絵（assets/icons）。名前 → Texture。読めない絵は入れない（その時は Graphics で描く） */
async function loadBadges() {
  const out = {};
  await Promise.all([...Object.values(CLASS_BADGES), ...STATUS_BADGES].map(async name => {
    try {
      const img = new Image(); img.src = new URL(`../../${badgePath(name)}`, import.meta.url).href; await img.decode();
      const t = Texture.from(img, true); t.source.scaleMode = 'linear'; out[name] = t;
    } catch (e) { console.warn('icon', name, e); }
  }));
  return out;
}
import { syncRide, drawRide } from './ride-view.js?v=3';
import { rideArtSources } from './raster-art.js?v=11'; // v1.0.0 背中の乗り姿の絵（だれかが乗った時だけ読む） // 人間がロボに乗る（?ridedemo=1）。sim.ride があるときだけ使う
import { CHAR_FRAMES, CHAR_FRAMES_OBLIQUE, heightOf, CORPSE_SEC, WAVE_SEC, hasFrames, newAnim, pickSize, stepAnim } from './char-anim.js?v=8';

const FOG_PAD = 2;            // 霧テクスチャの外周（ぼかしで端が明るくならないように）
const FOG_RT_SCALE = 4;       // 1タイル＝霧テクスチャ4px（ぼかし後）
const UNIT_PX = 34;           // 機体の表示サイズ（ワールド座標）
const KIND_PX = { scav: 40, ponco: 42, alien: 64, boy: 28, girl: 28, ...Object.fromEntries(Object.entries(ALT_UNIT_LOOK).map(([k, l]) => [k, l.px])) }; // Clear at play scale, detailed up to 4.5x zoom.
const SIDE_COLOR = { ally: 0x7df9ff, enemy: 0xffb347 };

// v0.4.8-dev（10/24）地面の色（各地形の絵に掛ける tint）と、境界の絵・焼き込み
const TERRAIN_TINT = { plain: 0xa9aaa3, forest: 0xb1b8a9, shallow: 0x6a625a, other: 0xb5b8b1 }; // other = 山・深い水。浅瀬は専用の地面（Claude 作）を暗めの土色に寄せて、明るさを平地と深い水の間に
const AIR_FROM_Z = 24, AIR_BOB_PX = 3, AIR_BOB_SPEED = 1.8; // 空の機体のゆれ（ALT.airFrom と同じ高さから。見た目だけ）
const EDGE_ART_ALPHA = 0.4; // 境界: 切り抜いた隣の地面の上に、縁の絵そのものをどれだけ重ねるか
const TERRAIN_CHUNK = 8;      // 地面を焼く単位（8x8マス = 256 ワールドpx。焼いた絵は 2 倍 = 512px 四方）
const TERRAIN_BAKE_RES = 2;   // 焼き込みの解像度（ワールド1px = 2px）。40x60マスで約 39MB（ミップマップ込みで約 52MB）
const SHALLOW_GROUND_URL = new URL('../../assets/art-v2/ground-shallow.webp', import.meta.url).href; // 浅瀬の地面（4x4マス分、他の地面と同じ作り）
/** 境界の絵（assets/ground-edges/<上>_on_<下>/<名前>.png と mix3/<上>-<下>/<名前>.png・mask/<名前>.png, 128px = 1マス）の Image。
 *  キーは '<上>_on_<下>/<名前>'・'mix3/<上>-<下>/<名前>'・'mix3/<上>-<下>/mask/<名前>'。読めなければ null（境界なしで出す） */
async function loadGroundEdges() {
  const keys = [...EDGE_PAIRS.flatMap(([hi, lo]) => EDGE_NAMES.map(n => `${pairDir(hi, lo)}/${n}`)),
    ...MIX3_FILES.flatMap(f => [`mix3/${f}`, `mix3/${f.replace('/', '/mask/')}`])];
  try {
    const out = {};
    await Promise.all(keys.map(async key => {
      const img = new Image(); img.src = new URL(`../../assets/ground-edges/${key}.png`, import.meta.url).href; await img.decode();
      out[key] = img;
    }));
    return out;
  } catch (e) { console.warn('[bot-commander] 地面の境界の絵を読めない（境界なしで出す）', e); return null; }
}
/** 自分で作った絵（地面の元絵・機体・遮蔽物・落とし物のアイコン）を全部捨てる。app.destroy は画面に貼られた絵しか捨てないので、これで残りを捨てる */
function disposeAssets(assets) { eachAssetTexture(assets, disposeTexture); }
/** 自分で作った絵（地面・機体・立ち絵・遮蔽物・アイコン）を 1 枚ずつ fn に渡す */
function eachAssetTexture({ tex, chars, landmarks, badges } = {}, fn) {
  Object.values(tex || {}).forEach(fn);
  Object.values(badges || {}).forEach(fn); // v0.4.11 アイコンの絵（assets/icons）
  for (const ch of Object.values(chars || {})) Object.values(ch.tex).flat().forEach(fn);
  for (const [k, l] of Object.entries(landmarks || {})) {
    if (k === '_icons') Object.values(l || {}).forEach(fn);
    else if (l) { fn(l.tex); Object.values(l.states || {}).forEach(s => fn(s.tex)); }
  }
}
/** app.destroy の前に、絵の元の canvas を控える（destroy のあとでは取り出せない）。あとで zeroCanvases に渡して 0 にする */
const gatherCanvases = assets => { const out = []; eachAssetTexture(assets, t => { const c = textureCanvasOf(t); if (c) out.push(c); }); return out; };
const zeroCanvases = list => list.forEach(c => { c.width = c.height = 0; });
/** v0.4.12 描画（app）を捨てる前に、Pixi の共通の入れ物（TexturePool。フィルターの一時の絵）を空にする。残すと捨てた描画の bind group が居座る */
const clearSharedPool = () => { try { TexturePool.clear(true); } catch { /* 作りかけ */ } };
/** Pixi の共通の絵（Texture.WHITE・EMPTY）に残る「変わったよ」の待ちを外す。描画（app）を捨てた直後に呼ぶ（生きている描画は 1 つだけなので、外してよい） */
const releaseSharedTextures = () => releaseSharedListeners([Texture.WHITE && Texture.WHITE.source, Texture.EMPTY && Texture.EMPTY.source]);
/** 描画を作る。途中で失敗したら、作りかけの app・canvas・絵を捨ててから、同じ失敗を投げ直す（メモリ不足でも残り物を増やさない） */
export async function createRenderer(host, sim, opts = {}) {
  const made = {};
  try { return await buildRenderer(host, sim, opts, made); }
  catch (err) {
    const cv = (() => { try { return made.app && made.app.canvas; } catch { return null; } })(), canv = gatherCanvases(made.assets);
    clearSharedPool();
    try { made.app && made.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true }); } catch { /* 作りかけ */ }
    releaseSharedTextures();
    if (cv) { cv.remove(); cv.width = cv.height = 0; }
    if (made.fxCanvas) { made.fxCanvas.remove(); made.fxCanvas.width = made.fxCanvas.height = 0; }
    disposeAssets(made.assets); zeroCanvases(canv);
    throw err;
  }
}
async function buildRenderer(host, sim, { fxQuality = 'normal', ground, human } = {}, made) {
  const app = new Application(); made.app = app;
  await app.init({ resizeTo: host, background: '#0b0d10', antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
  const appCanvas = app.canvas; // destroy のあとでは app.canvas を読めないので持っておく
  host.appendChild(appCanvas);
  // 演出の canvas（Pixi の上に重ねる。タップは下へ通す）
  const fxCanvas = document.createElement('canvas');
  fxCanvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
  host.appendChild(fxCanvas); made.fxCanvas = fxCanvas;
  const fxCtx = fxCanvas.getContext('2d');
  const fx = createFx({ max: FX_MAX[fxQuality] || FX_MAX.normal, shakeMax: FX_SHAKE_MAX });
  const fxSeen = new WeakSet();
  const [tex, chars, landmarks, edgeImg] = await Promise.all([buildTextures({ ...artSources({ ground }), tile_shallow_0: { url: SHALLOW_GROUND_URL, px: 1024, tile: true } }, (svg => ({ ...svg, tile_shallow_0: svg.tile_water_0 }))(svgArtSources())), loadCharSheets(human === 'oblique' ? CHAR_FRAMES_OBLIQUE : CHAR_FRAMES), sim.cover?.length ? loadLandmarks() : {}, SMOOTH_GROUND ? null : loadGroundEdges()]);
  made.assets = { tex, chars, landmarks };
  const badges = await loadBadges(); made.assets.badges = badges; // v0.4.10 兵種・キット切れのアイコンの絵（捨てる時は disposeAssets で）
  const map = sim.map;
  const world = new Container();
  app.stage.addChild(world);

  // 地形（動かないので一度だけ並べる）
  // v0.4.8-dev（10/24）: 違う地形どうしの境では、下の地形のマス（平地 < 浅瀬 < 深い水 < 岩場 < 森）に上の地形の縁（Claude 作 edges2）を重ね、
  //   地面と境界をまとめて 8x8 マスずつ RenderTexture へ一度だけ焼く（毎フレームはタイルを並べ直さない）。
  const terrain = new Container();
  // One artwork spans 4x4 map tiles: plants/rubble stay substantial at normal zoom.
  const terrainFrames = new Map(), keyAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h ? null : TERRAIN[map.tiles[ty * map.w + tx]].key);
  const groundTex = k => tex[`tile_${k}_0`] || tex.tile_plain_0;
  const tintOf = k => TERRAIN_TINT[k] ?? TERRAIN_TINT.other;
  const tileSprite = (tx, ty, ox, oy) => {
    const k = keyAt(tx, ty);
    const frameKey = `${k}_${tx % 4}_${ty % 4}`;
    if (!terrainFrames.has(frameKey)) {
      const source = groundTex(k).source, side = source.width / 4;
      terrainFrames.set(frameKey, new Texture({ source, frame: new Rectangle(tx % 4 * side, ty % 4 * side, side, side) }));
    }
    const s = new Sprite(terrainFrames.get(frameKey));
    s.tint = tintOf(k);
    s.position.set(ox, oy); s.width = s.height = TILE;
    return s;
  };
  // 境界の1枚 = 上の地形の地面の絵（このマスの位置のコマ。隣のマスと模様が続く）を縁の絵の形で切り抜き、
  //   その上に縁の絵そのものを薄く重ねたもの（水際の線・湿った土・段差の感じを残す）。色（tint）はここで焼き込む。
  //   mix3 は、下の地形の地面を mix3 の形で、上の地形の地面を mask の形で切り抜いて重ね、その上に mix3 の絵を薄く重ねる。
  const EDGE_PX = 128, canvasOf = () => { const c = document.createElement('canvas'); c.width = c.height = EDGE_PX; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; return [c, g]; };
  const hex = n => `#${n.toString(16).padStart(6, '0')}`;
  const groundCache = new Map();
  const groundAt = (k, tx, ty) => { // 地形 k の地面（このマスの位置のコマ、tint 済み、不透明）
    const key = `${k}_${tx % 4}_${ty % 4}`;
    if (!groundCache.has(key)) {
      const src = groundTex(k).source.resource, side = src.width / 4, [c, g] = canvasOf();
      g.drawImage(src, tx % 4 * side, ty % 4 * side, side, side, 0, 0, EDGE_PX, EDGE_PX);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = hex(tintOf(k)); g.fillRect(0, 0, EDGE_PX, EDGE_PX);
      groundCache.set(key, c);
    }
    return groundCache.get(key);
  };
  const cutOut = (src, mask) => { const [c, g] = canvasOf(); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0, EDGE_PX, EDGE_PX); return c; };
  const tinted = (img, k) => { const [c, g] = canvasOf(); g.drawImage(img, 0, 0, EDGE_PX, EDGE_PX); g.globalCompositeOperation = 'multiply'; g.fillStyle = hex(tintOf(k)); g.fillRect(0, 0, EDGE_PX, EDGE_PX); g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0, EDGE_PX, EDGE_PX); return c; };
  // v0.4.12 メモリ: 一時の canvas は使い終わったらすぐ 0 にする（ガベージコレクションを待つと 1000 枚以上が同時に生きて、起動の山になる）
  const drawTemp = (g, make) => { const t = make(); g.drawImage(t, 0, 0); t.width = t.height = 0; };
  // 境界の絵は、焼き終えたかたまりごとに edgeCache.drop() で GPU からも canvas からも捨てる（次のかたまりで要れば作り直す。同時に生きる枚数が、全部ではなく 1 かたまりぶんになる）
  const edgeCache = createPieceCache(disposeTexture);
  const edgePieceTex = (p, tx, ty) => {
    const id = p.mix3 ? `mix3/${p.mix3}` : `${p.dir}/${p.name}`, key = `${id}_${tx % 4}_${ty % 4}`;
    return edgeCache.get(key, () => {
      const art = edgeImg[id], [c, g] = canvasOf();
      if (p.mix3) {
        drawTemp(g, () => cutOut(groundAt(p.lower, tx, ty), art));
        drawTemp(g, () => cutOut(groundAt(p.upper, tx, ty), edgeImg[`mix3/${p.mix3.replace('/', '/mask/')}`]));
      } else drawTemp(g, () => cutOut(groundAt(p.kind, tx, ty), art));
      g.globalAlpha = EDGE_ART_ALPHA; drawTemp(g, () => tinted(art, p.kind));
      const t = Texture.from(c, true); t.source.scaleMode = 'linear'; // true＝Cache に入れない
      return t;
    });
  };
  const CH = TERRAIN_CHUNK, bakeRes = TERRAIN_BAKE_RES;
  const bakeT0 = performance.now();
  if (SMOOTH_GROUND) {
    // マスの四角をやめ、なめらかな地形の場から 1 ピクセルずつ地面を選んで焼く（区画・解像度・メモリは今までと同じ）
    const ppt = TILE * bakeRes, field = createField(Array.from(map.tiles, t => TERRAIN[t].key), map.w, map.h);
    const groundPx = FIELD_ORDER.map(k => { // 地形の地面を 4x4マス = ppt*4 px に縮め、tint を掛けた画素
      const size = ppt * 4, c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high';
      g.drawImage(groundTex(k).source.resource, 0, 0, size, size);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = hex(tintOf(k)); g.fillRect(0, 0, size, size);
      return { data: g.getImageData(0, 0, size, size).data, size };
    });
    const cnv = document.createElement('canvas'), cg = cnv.getContext('2d');
    for (let cy = 0; cy < map.h; cy += CH) for (let cx = 0; cx < map.w; cx += CH) {
      const w = Math.min(CH, map.w - cx), h = Math.min(CH, map.h - cy);
      cnv.width = w * ppt; cnv.height = h * ppt;
      const img = cg.createImageData(cnv.width, cnv.height);
      bakeChunk(field, groundPx, cx, cy, w, h, ppt, img.data);
      cg.putImageData(img, 0, 0);
      const t = new Texture({ source: new CanvasSource({ resource: cnv, scaleMode: 'linear' }) }), s = new Sprite(t);
      s.width = w * TILE; s.height = h * TILE;
      const rt = RenderTexture.create({ width: w * TILE, height: h * TILE, resolution: bakeRes, autoGenerateMipmaps: true, scaleMode: 'linear' });
      app.renderer.render({ container: s, target: rt, clear: true });
      rt.source.updateMipmaps();
      s.destroy(); t.destroy(true);
      const baked = new Sprite(rt); baked.position.set(cx * TILE, cy * TILE);
      terrain.addChild(baked);
    }
    cnv.width = cnv.height = 0;
  } else for (let cy = 0; cy < map.h; cy += CH) for (let cx = 0; cx < map.w; cx += CH) {
    const w = Math.min(CH, map.w - cx), h = Math.min(CH, map.h - cy), layer = new Container();
    for (let ty = cy; ty < cy + h; ty++) for (let tx = cx; tx < cx + w; tx++) {
      const ox = (tx - cx) * TILE, oy = (ty - cy) * TILE;
      layer.addChild(tileSprite(tx, ty, ox, oy));
      if (edgeImg) for (const p of edgePieces(keyAt, tx, ty)) {
        const e = new Sprite(edgePieceTex(p, tx, ty));
        e.position.set(ox, oy); e.width = e.height = TILE;
        layer.addChild(e);
      }
    }
    const rt = RenderTexture.create({ width: w * TILE, height: h * TILE, resolution: bakeRes, autoGenerateMipmaps: true, scaleMode: 'linear' });
    app.renderer.render({ container: layer, target: rt, clear: true });
    rt.source.updateMipmaps();
    layer.destroy({ children: true }); // 焼いたらタイルの Sprite は捨てる（元の絵のテクスチャは残る）
    edgeCache.drop(); // v0.4.12 このかたまりの境界の絵はもう要らない（?smooth=0 の起動の山を下げる）
    const baked = new Sprite(rt); baked.position.set(cx * TILE, cy * TILE);
    terrain.addChild(baked);
  }
  globalThis.__groundBakeMs = Math.round(performance.now() - bakeT0); console.info(`[bot-commander] 地面の焼き込み ${globalThis.__groundBakeMs}ms（${SMOOTH_GROUND ? 'なめらか' : 'edges2'}）`);
  terrainFrames.forEach(t => t.destroy(false));
  edgeCache.drop(); // 境界の絵は焼いたら要らない（かたまりごとにも捨てている。念のため）
  groundCache.forEach(c => { c.width = c.height = 0; }); groundCache.clear(); // 切り抜きの元の canvas も（前は上のコメントに巻き込まれて動いていなかった。?smooth=0 だけ）
  // 地面の元絵（tile_*。1024px の canvas が 5 枚で約 20MB）は焼く時にしか使わない。焼いたら捨てる（groundTex は上の焼き込みの中だけで使う）
  for (const k of Object.keys(tex)) if (k.startsWith('tile_')) { disposeTexture(tex[k]); delete tex[k]; }
  world.addChild(terrain);

  const pathLayer = new Graphics();
  const selLayer = new Graphics();
  const units = new Container(); units.sortableChildren = true;
  const fxLayer = new Graphics();
  const markLayer = new Graphics(); // 回収の進み具合・脱出口の輪・気づきのゲージ
  world.addChild(selLayer, pathLayer, units, fxLayer, markLayer);
  const mission = sim.mission;
  // 遮蔽物（足元の y で機体と並ぶ）と落とし物
  const coverView = createCoverView(sim, units, landmarks);

  // 本陣
  const hqs = {};
  for (const side of ['ally', 'enemy']) {
    const h = map.hq[side], s = new Sprite(tex[`hq_${side}`]);
    s.anchor.set(0.5, 0.82); s.width = s.height = TILE * 3.2;
    s.position.set(tileCenter(h.tx), tileCenter(h.ty) + 18); s.zIndex = s.y;
    units.addChild(s); hqs[side] = s;
  }
  if (mission) hqs.enemy.visible = false;

  // ミッション: 回収ポイント（ガラクタの山）と脱出口
  const piles = [];
  let hatchSprite = null;
  if (mission) {
    for (const p of mission.salvage) {
      const s = new Sprite(tex[`salvage_${p.id % 2}`]);
      s.anchor.set(0.5, 0.8); s.width = s.height = TILE * 1.9;
      s.position.set(tileCenter(p.tx), tileCenter(p.ty) + 8); s.zIndex = s.y - 20;
      units.addChild(s); piles.push({ p, s, empty: false, base: s.scale.x, bump: -1 });
    }
    hatchSprite = new Sprite(tex.hatch);
    hatchSprite.anchor.set(0.5, 0.66); hatchSprite.width = hatchSprite.height = TILE * 3;
    hatchSprite.position.set(tileCenter(mission.extraction.tx), tileCenter(mission.extraction.ty)); hatchSprite.zIndex = hatchSprite.y - 30;
    units.addChild(hatchSprite);
  }

  // 巣（仮の絵）: 捕まった人間が運ばれていく先。見つけるまで出さない
  let nestG = null;
  if (mission?.nest) {
    const n = mission.nest, x = tileCenter(n.tx), y = tileCenter(n.ty);
    nestG = new Graphics();
    nestG.ellipse(0, 6, 40, 14).fill({ color: 0x161e20, alpha: 0.35 });
    nestG.ellipse(0, 0, 34, 20).fill({ color: 0x46363a }).stroke({ width: 2.5, color: 0x231b1d });
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI, r = 30;
      const bx = Math.cos(a) * r, by = Math.sin(a) * r * 0.62;
      nestG.moveTo(bx - 5, by + 4).lineTo(bx * 1.25, by * 1.25 - 10).lineTo(bx + 5, by + 4).closePath().fill({ color: 0x5c4a46 }).stroke({ width: 1.5, color: 0x231b1d });
    }
    nestG.ellipse(0, 2, 20, 10).fill({ color: 0x1d1416 });
    nestG.circle(-8, 0, 2.2).fill({ color: 0xffc268 }); nestG.circle(6, 3, 1.6).fill({ color: 0xffc268 }); nestG.circle(11, -2, 1.3).fill({ color: 0xffc268 });
    nestG.position.set(x, y); nestG.zIndex = y - 40; nestG.visible = false;
    units.addChild(nestG);
  }

  // 霧: タイル1px の小さなキャンバス → ぼかして RenderTexture へ（霧が変わったときだけ）→ ワールド全体に引き伸ばす
  const fw = map.w + FOG_PAD * 2, fh = map.h + FOG_PAD * 2;
  const fogCanvas = document.createElement('canvas'); fogCanvas.width = fw; fogCanvas.height = fh;
  const fogCtx = fogCanvas.getContext('2d'), fogImg = fogCtx.createImageData(fw, fh);
  const fogSrcTex = Texture.from(fogCanvas, true); fogSrcTex.source.scaleMode = 'linear';
  const fogSrc = new Sprite(fogSrcTex); fogSrc.width = fw * FOG_RT_SCALE; fogSrc.height = fh * FOG_RT_SCALE;
  const fogBlur = new BlurFilter({ strength: 3, quality: 3 });
  fogSrc.filters = [fogBlur];
  const fogHolder = new Container(); fogHolder.addChild(fogSrc);
  const fogRT = RenderTexture.create({ width: fw * FOG_RT_SCALE, height: fh * FOG_RT_SCALE });
  const fogSprite = new Sprite(fogRT);
  fogSprite.position.set(-FOG_PAD * TILE, -FOG_PAD * TILE); fogSprite.width = fw * TILE; fogSprite.height = fh * TILE;
  world.addChild(fogSprite);
  let fogRev = -1;
  const FOG_ALPHA = [238, 140, 0]; // 未探索・見たことがある・見えている
  function updateFog() {
    if (sim.fog.revision === fogRev) return;
    fogRev = sim.fog.revision;
    const d = fogImg.data;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const st = sim.fog.stateAt(x - FOG_PAD, y - FOG_PAD), i = (y * fw + x) * 4;
      d[i] = 6; d[i + 1] = 9; d[i + 2] = 16; d[i + 3] = FOG_ALPHA[st];
    }
    fogCtx.putImageData(fogImg, 0, 0);
    fogSrcTex.source.update();
    app.renderer.render({ container: fogHolder, target: fogRT, clear: true });
  }
  const softFog = { enabled: true };

  // カメラ
  const cam = { x: tileCenter(map.hq.ally.tx), y: tileCenter(map.hq.ally.ty) - 120, zoom: 1 };
  if (mission) cam.y = tileCenter(map.hq.ally.ty) - 200;
  const minZoom = () => Math.max(app.screen.width / (map.w * TILE), app.screen.height / (map.h * TILE)) * 0.9;
  function clampCam() {
    cam.zoom = Math.max(minZoom(), Math.min(4.5, cam.zoom));
    const hw = app.screen.width / 2 / cam.zoom, hh = app.screen.height / 2 / cam.zoom, W = map.w * TILE, H = map.h * TILE;
    cam.x = hw * 2 >= W ? W / 2 : Math.max(hw, Math.min(W - hw, cam.x));
    cam.y = hh * 2 >= H ? H / 2 : Math.max(hh - 60 / cam.zoom, Math.min(H - hh + 90 / cam.zoom, cam.y)); // 上下のUIぶん少し余白
  }
  const screenToWorld = (sx, sy) => ({ x: (sx - app.screen.width / 2) / cam.zoom + cam.x, y: (sy - app.screen.height / 2) / cam.zoom + cam.y });
  const worldToScreen = (x, y) => ({ x: (x - cam.x) * cam.zoom + app.screen.width / 2, y: (y - cam.y) * cam.zoom + app.screen.height / 2 });

  // 機体
  const views = new Map();
  function unitView(u) {
    let v = views.get(u.id);
    if (v) return v;
    const c = new Container();
    const px = KIND_PX[u.kind] || UNIT_PX;
    const body = new Sprite(); body.anchor.set(0.5, 0.88); body.width = body.height = px;
    const bar = new Graphics();
    // 紙芝居の絵があるキャラ（今は少年）: 影を足元に。絵に影は描いていない
    const sheet = hasFrames(u.kind, chars) ? chars[u.kind] : null;
    // ?human=oblique（お試し）: 斜め上から見た地面に合わせて、足元の影を丸めに・濃いめに
    const shadow = sheet ? (human === 'oblique' ? new Graphics().ellipse(0, 0, 8, 4).fill({ color: 0x000000, alpha: 0.38 }) : new Graphics().ellipse(0, 0, 7, 2.4).fill({ color: 0x000000, alpha: 0.28 })) : null;
    if (shadow) c.addChild(shadow);
    const icon = new Graphics(); // v0.4.3 兵種のアイコン（HP バーの左端）
    const badge = new Sprite(), kit = new Sprite(), state = new Sprite(); badge.anchor.set(0.5); kit.anchor.set(0.5); state.anchor.set(0.5); badge.visible = kit.visible = state.visible = false; // v0.4.10 絵のアイコン（兵種・キット切れ）。state＝盾・キットの状態の印（v0.4.12-dev）
    c.addChild(body, bar, icon, badge, kit, state);
    units.addChild(c);
    v = { c, body, bar, icon, badge, kit, state, iconKey: undefined, hp: -1, key: null, flash: 0, px, sheet, shadow, anim: sheet ? newAnim() : null, u, corpse: -1 };
    views.set(u.id, v);
    return v;
  }

  // selected: 選んでいる機体の id の並び。mode: 地面タップの移動のしかた（'fight' 戦闘移動 / 'rush' 急行）
  const ui = { selected: [], stroke: null, mode: 'fight', box: null, mark: null };

  function drawPaths(now) {
    pathLayer.clear(); selLayer.clear();
    const ink = 1 / Math.max(1, cam.zoom);
    for (const id of ui.selected) {
      const u = unitById(sim, id); if (!u) continue;
      const big = u.human ? 10 : 15;
      selLayer.ellipse(u.x, u.y - 1, big, big * 0.47).fill({ color: 0x7df9ff, alpha: 0.14 }).stroke({ width: 2.2 * ink, color: u.human ? 0xffd166 : 0x7df9ff, alpha: 0.95 });
      const o = u.order; if (!o) continue;
      const pts = (o.planned.length ? o.planned : o.prev?.planned || []).slice(o.planned.length ? o.pathIdx : o.prev?.pathIdx || 0);
      const col = o.mode === 'fight' ? 0x7df9ff : o.mode === 'retreat' ? 0x9ca3af : 0x4ade80;
      if (pts.length) {
        pathLayer.moveTo(u.x, u.y);
        for (const p of pts) pathLayer.lineTo(tileCenter(p.tx), tileCenter(p.ty));
        pathLayer.stroke({ width: 4, color: 0x000000, alpha: 0.3, cap: 'round', join: 'round' });
        pathLayer.moveTo(u.x, u.y);
        for (const p of pts) pathLayer.lineTo(tileCenter(p.tx), tileCenter(p.ty));
        pathLayer.stroke({ width: 1.8, color: col, alpha: 0.9, cap: 'round', join: 'round' });
      }
      const w = o.waypoints[o.waypoints.length - 1];
      if (o.attackId == null) pathLayer.circle(tileCenter(w.tx), tileCenter(w.ty), 4).fill({ color: 0xffd166 }).stroke({ width: 1.5, color: 0x121418 });
      else { const t = unitById(sim, o.attackId); if (t) pathLayer.circle(t.x, t.y - 10, 20).stroke({ width: 2.5 * ink, color: 0xef4444, alpha: 0.6 + 0.3 * Math.sin(now * 10) }); }
    }
    // タップした場所の波紋
    const m = ui.mark;
    if (m) {
      const age = now - m.t;
      if (age > 0.6) ui.mark = null;
      else pathLayer.circle(m.x, m.y, 8 + age * 40).stroke({ width: 2.5 * ink, color: m.attack ? 0xef4444 : 0xffd166, alpha: 1 - age / 0.6 });
    }
    // 長押しからの枠選択
    const b = ui.box;
    if (b) {
      const x = Math.min(b.a.x, b.b.x), y = Math.min(b.a.y, b.b.y), w = Math.abs(b.a.x - b.b.x), h = Math.abs(b.a.y - b.b.y);
      pathLayer.rect(x, y, w, h).fill({ color: 0x7df9ff, alpha: 0.1 }).stroke({ width: 2 * ink, color: 0x7df9ff, alpha: 0.9 });
    }
    if (ui.stroke && ui.stroke.length > 1) {
      pathLayer.moveTo(ui.stroke[0].x, ui.stroke[0].y);
      for (const p of ui.stroke) pathLayer.lineTo(p.x, p.y);
      pathLayer.stroke({ width: 6, color: 0xffffff, alpha: 0.5 + 0.2 * Math.sin(now * 8), cap: 'round', join: 'round' });
    }
  }

  // 「+1」や「めずらしい部品！」の文字（使い回し）
  const pops = new Container(); world.addChild(pops);
  const popPool = [];
  const POP_STYLE = { fontFamily: 'system-ui, sans-serif', fontWeight: '900', fontSize: 15, fill: 0xffd166, stroke: { color: 0x121418, width: 4 } };
  const FIND_STYLE = { ...POP_STYLE, fontSize: 14, fill: 0xfff3b0 };
  const CAPT_STYLE = { ...POP_STYLE, fontSize: 14, fill: 0xff8a80 };
  const HEAL_STYLE = { ...POP_STYLE, fontSize: 14, fill: 0x86efac };
  const WEAPON_STYLE = { ...POP_STYLE, fontSize: 14, fill: 0xffc56b };
  const SHIELD_STYLE = { ...POP_STYLE, fontSize: 14, fill: 0xbae6fd };
  /** 文字の横の位置を、いま見えている範囲（ワールド座標）の中へ寄せる。文字の幅の半分＋すき間 8px（画面の px）を残す */
  function clampPopX(t) {
    const z = cam.zoom || 1, half = app.screen.width / 2 / z, m = 8 / z, hw = Math.abs(t.width) / 2;
    const lo = cam.x - half + hw + m, hi = cam.x + half - hw - m;
    t.x = lo > hi ? cam.x : Math.max(lo, Math.min(hi, t.x));
  }
  function drawPops(now) {
    let k = 0;
    for (const f of sim.fx) {
      if (f.type !== 'gain' && f.type !== 'find' && f.type !== 'captured' && f.type !== 'rescue' && f.type !== 'nested' && f.type !== 'pickup' && f.type !== 'kitUse' && f.type !== 'shieldGive' && f.type !== 'shieldRestored') continue;
      const life = f.type === 'gain' ? 1 : 2.2, age = sim.time - f.t;
      if (age > life) continue;
      let t = popPool[k];
      if (!t) { t = new Text({ text: '', style: POP_STYLE }); t.anchor.set(0.5); pops.addChild(t); popPool.push(t); }
      k++;
      const a = Math.min(1, (life - age) / (life * 0.4));
      if (f.type === 'gain') {
        if (t.text !== '+1') { t.text = '+1'; t.style = POP_STYLE; }
        t.position.set(f.x, f.y - 30 - age * 26); t.scale.set(0.7 + 0.3 * Math.min(1, age * 8));
      } else if (f.type === 'kitUse') {
        const label = f.by !== f.unit && f.byLabel ? `リペアキット +${f.heal}（${f.byLabel}）` : `リペアキット +${f.heal}`;
        if (t.text !== label) { t.text = label; t.style = HEAL_STYLE; }
        t.position.set(f.x, f.y - 50 - Math.min(age, 0.5) * 24); t.scale.set(age < 0.15 ? 0.6 + age / 0.15 * 0.4 : 1);
      } else if (f.type === 'shieldGive' || f.type === 'shieldRestored') { // v0.4.4 盾が戻った（サポーターが渡した・リペアラーが直し始めた）
        const label = f.type === 'shieldGive' ? 'シールド！' : 'シールド修理中';
        if (t.text !== label) { t.text = label; t.style = SHIELD_STYLE; }
        t.position.set(f.x, f.y - 50 - Math.min(age, 0.5) * 24); t.scale.set(age < 0.15 ? 0.6 + age / 0.15 * 0.4 : 1);
      } else if (f.type === 'pickup') {
        const label = f.item === 'weapon' ? `${f.name}${f.equipped ? ' 装備！' : ' 入手'}` : f.stored ? `${f.name} 入手（${f.kits}個）` : `${f.name}！ 回復`;
        if (t.text !== label) { t.text = label; t.style = f.item === 'weapon' ? WEAPON_STYLE : HEAL_STYLE; }
        t.position.set(f.x, f.y - 44 - Math.min(age, 0.5) * 24); t.scale.set(age < 0.15 ? 0.6 + age / 0.15 * 0.5 : 1.1 - Math.min(0.1, age - 0.15));
      } else if (f.type === 'captured' || f.type === 'rescue' || f.type === 'nested') {
        const label = f.type === 'captured' ? `${f.label || '人間'}が捕まった！` : f.type === 'nested' ? `${f.label || '人間'}が巣に連れていかれた！` : '救出！';
        if (t.text !== label) { t.text = label; t.style = f.type === 'rescue' ? FIND_STYLE : CAPT_STYLE; }
        t.position.set(f.x, f.y - 44 - Math.min(age, 0.5) * 20); t.scale.set(1);
      } else {
        const label = `★ ${f.name}！ +${f.n}`;
        if (t.text !== label) { t.text = label; t.style = FIND_STYLE; }
        t.position.set(f.x, f.y - 54 - Math.min(age, 0.5) * 30); t.scale.set(age < 0.15 ? 0.6 + age / 0.15 * 0.6 : 1.2 - Math.min(0.2, (age - 0.15)));
      }
      clampPopX(t); // v1.0.0: 画面の左右の端で切れないように、文字を画面の中へ寄せる（「シールド修理中」など）
      t.alpha = a; t.visible = true;
      if (f.type === 'gain') { const pl = piles.find(q => q.p.id === f.pile); if (pl && pl.lastPop !== f.t) { pl.lastPop = f.t; pl.bump = now; } }
    }
    for (; k < popPool.length; k++) popPool[k].visible = false;
  }

  function drawFx() {
    fxLayer.clear();
    // v0.4.2 リペアラーがキットを作っている間: 足元の小さな進み具合の輪
    for (const u of sim.units) {
      if (u.kitBuild == null || u.hp <= 0 || !sim.fog.isVisible(toTile(u.x), toTile(u.y))) continue;
      const p = Math.min(1, u.kitBuild / REPAIRER_KIT_BUILD_SEC), x = u.x + 14, y = u.y - 30;
      fxLayer.circle(x, y, 5).fill({ color: 0x121418, alpha: 0.85 });
      fxLayer.moveTo(x, y - 4).arc(x, y, 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).stroke({ width: 2, color: 0x4ade80 });
    }
    // v0.4.4 シールド: サポーターが盾を作っている輪（水色）・リペアラーが盾を直している細い線・撤退中に盾を構えている姿
    for (const u of sim.units) {
      if (u.hp <= 0 || u.side !== 'ally' || u.human || !sim.fog.isVisible(toTile(u.x), toTile(u.y))) continue;
      if (u.shieldBuild != null) {
        const p = Math.min(1, u.shieldBuild / SUPPORTER_SHIELD_BUILD_SEC), x = u.x + 14, y = u.y - 30;
        fxLayer.circle(x, y, 5).fill({ color: 0x121418, alpha: 0.85 });
        fxLayer.moveTo(x, y - 4).arc(x, y, 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).stroke({ width: 2, color: SHIELD_COLOR });
      }
      if (u.shieldFix != null) {
        const t = unitById(sim, u.shieldFix);
        if (t && t !== u) { const a = 0.35 + 0.25 * Math.sin(sim.time * 8); fxLayer.moveTo(u.x, u.y - 12).lineTo(t.x, t.y - 12).stroke({ width: 1.5, color: SHIELD_COLOR, alpha: a }); }
        if (t) fxLayer.circle(t.x, t.y - 12, 15).stroke({ width: 1.5, color: SHIELD_COLOR, alpha: 0.45 });
      }
      if (u.shieldHp > 0 && isDefensive(u)) { // うすい泡と、向いている側の弧
        const x = u.x, y = u.y - 12, f = u.facing < 0 ? Math.PI : 0;
        fxLayer.circle(x, y, 17).fill({ color: SHIELD_COLOR, alpha: 0.1 }).stroke({ width: 1, color: SHIELD_COLOR, alpha: 0.35 });
        fxLayer.moveTo(x + Math.cos(f - 0.9) * 19, y + Math.sin(f - 0.9) * 19).arc(x, y, 19, f - 0.9, f + 0.9).stroke({ width: 3, color: SHIELD_COLOR, alpha: 0.9 });
      }
    }
    for (const f of sim.fx) {
      const age = sim.time - f.t;
      if (f.type === 'kitUse') { // v0.4.2 リペアキットを使った: 緑の輪と、白い箱に緑の十字（落とし物のキットと同じ形）が上がる
        if (age > 1) continue;
        const u = unitById(sim, f.unit), x = u ? u.x : f.x, y = (u ? u.y : f.y) - 12, a = 1 - age;
        fxLayer.circle(x, y + 6, 8 + 22 * age).stroke({ width: 3, color: 0x4ade80, alpha: a });
        for (let i = 0; i < 3; i++) {
          const px = x + (i - 1) * 10, py = y - 8 - age * 26 - (i % 2) * 6, k = 1.6 - i % 2 * 0.4;
          fxLayer.rect(px - 1 * k, py - 3.5 * k, 2 * k, 7 * k).fill({ color: 0x4ade80, alpha: a }).rect(px - 3.5 * k, py - 1 * k, 7 * k, 2 * k).fill({ color: 0x4ade80, alpha: a });
        }
        if (f.by !== f.unit && f.bx != null) fxLayer.moveTo(f.bx, f.by_ - 12).lineTo(x, y).stroke({ width: 2, color: 0x86efac, alpha: a * 0.8 });
        continue;
      }
      if (f.type === 'shieldBreak') { // v0.4.4 盾が壊れた: 水色のかけらが散って、輪が広がる
        if (age > 0.7 || !sim.fog.isVisible(toTile(f.x), toTile(f.y))) continue;
        const u = unitById(sim, f.unit), x = u ? u.x : f.x, y = (u ? u.y : f.y) - 12, a = 1 - age / 0.7;
        fxLayer.circle(x, y, 14 + 26 * age).stroke({ width: 2, color: SHIELD_COLOR, alpha: a * 0.8 });
        for (let i = 0; i < 7; i++) {
          const ang = i / 7 * Math.PI * 2 + 0.4, r0 = 10 + age * 50, r1 = r0 + 6;
          fxLayer.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0 * 0.8 + age * age * 40).lineTo(x + Math.cos(ang + 0.25) * r1, y + Math.sin(ang + 0.25) * r1 * 0.8 + age * age * 40).stroke({ width: 2.5, color: 0xbae6fd, alpha: a });
        }
        continue;
      }
      if (f.type === 'shieldGive') { // v0.4.4 サポーターが盾を渡した: 青い輪と、渡した機体からの線
        if (age > 0.8) continue;
        const u = unitById(sim, f.unit), x = u ? u.x : f.x, y = (u ? u.y : f.y) - 12, a = 1 - age / 0.8;
        fxLayer.circle(x, y, 22 - 6 * age).stroke({ width: 3, color: SHIELD_COLOR, alpha: a });
        if (f.by !== f.unit && f.bx != null) fxLayer.moveTo(f.bx, f.by2 - 12).lineTo(x, y).stroke({ width: 2, color: SHIELD_COLOR, alpha: a * 0.8 });
        continue;
      }
      if (f.type === 'deliver') {
        const a = 1 - age / 0.8;
        fxLayer.circle(f.x, f.y - 6, 10 + 40 * (1 - a)).stroke({ width: 4, color: 0x4ade80, alpha: a });
      } else if (f.type === 'find') {
        const a = Math.max(0, 1 - age / 1.2);
        for (let i = 0; i < 6; i++) {
          const ang = i / 6 * Math.PI * 2 + age * 2, rr = 10 + age * 40;
          fxLayer.star(f.x + Math.cos(ang) * rr, f.y - 30 + Math.sin(ang) * rr, 4, 5, 2).fill({ color: 0xfff3b0, alpha: a });
        }
      }
    }
  }

  // 回収の進み具合・集めている火花・脱出口の輪・異星生物の気づきのゲージ
  function drawMission(now) {
    markLayer.clear();
    if (!mission) return;
    for (const pl of piles) {
      const p = pl.p, seen = sim.fog.isSeen(p.tx, p.ty);
      pl.s.visible = seen; if (!seen) continue;
      if (p.amount <= 0 && !pl.empty) { pl.empty = true; pl.s.texture = tex.salvage_empty; pl.bump = now; }
      // 山は集めるほど小さくなり、1つ取るたびに「ぷにっ」とつぶれる
      const fill = pl.empty ? 0.8 : 0.62 + 0.38 * Math.max(0, p.amount / p.max);
      const bt = now - pl.bump, sq = pl.bump >= 0 && bt < 0.25 ? Math.sin(bt / 0.25 * Math.PI) * 0.12 : 0;
      pl.s.scale.set(pl.base * fill * (1 + sq), pl.base * fill * (1 - sq));
      const x = tileCenter(p.tx), y = tileCenter(p.ty), r = Math.max(0, p.amount / p.max);
      markLayer.circle(x, y, GATHER_RADIUS * TILE).stroke({ width: 2, color: 0xffd166, alpha: p.amount > 0 ? 0.35 : 0.12 });
      if (p.amount > 0) {
        markLayer.rect(x - 18, y + 18, 36, 6).fill({ color: 0x121418, alpha: 0.85 });
        markLayer.rect(x - 17, y + 19, 34 * r, 4).fill({ color: 0xffd166 });
      }
    }
    if (nestG) {
      const n = mission.nest;
      nestG.visible = sim.fog.isSeen(n.tx, n.ty);
      if (nestG.visible) {
        const x = tileCenter(n.tx), y = tileCenter(n.ty), held = sim.units.some(u => u.captured === 'nest'), pulse = (now * 0.7) % 1;
        markLayer.circle(x, y, CAPTURE.nestRescueRadius * TILE).stroke({ width: 2, color: 0xef4444, alpha: held ? 0.5 : 0.18 });
        if (held) markLayer.circle(x, y, CAPTURE.nestRescueRadius * TILE * (0.3 + 0.7 * pulse)).stroke({ width: 2, color: 0xef4444, alpha: 0.45 * (1 - pulse) });
      }
    }
    for (const u of sim.units) {
      if (u.side !== 'ally') continue;
      if (u.gathering != null) {
        const k = (now * 3 + u.id * 0.37) % 1;
        const x = u.x + Math.sin(u.id * 7 + now * 5) * 6, y = u.y - 20 - k * 16;
        markLayer.star(x, y, 4, 2.4 * (1 - k) + 0.6, 0.8).fill({ color: 0xffdf88, alpha: 1 - k });
      }
      // 1機ずつ運んでいる資材（小さな箱。多いほど大きい）
      if (u.cargo >= 1) {
        const sz = Math.min(9, 4 + u.cargo / 4), x = u.x + 11, y = u.y - (KIND_PX[u.kind] || UNIT_PX) * 0.55;
        markLayer.roundRect(x - sz / 2, y - sz / 2, sz, sz, 1.5).fill({ color: 0xd4a24c }).stroke({ width: 1.2, color: 0x121418 });
      }
      // 捕まった人間: 赤い輪と「！」
      if (u.captured != null) {
        const b = 1 + 0.1 * Math.sin(now * 10), ink = 1 / Math.max(1, cam.zoom), y = u.y - 36;
        markLayer.circle(u.x, u.y - 8, 16 * b).stroke({ width: 2.5 * ink, color: 0xef4444, alpha: 0.9 });
        markLayer.circle(u.x, y, 8 * ink).fill({ color: 0xef4444 }).stroke({ width: 2 * ink, color: 0x121418 });
        markLayer.roundRect(u.x - 1.5 * ink, y - 5 * ink, 3 * ink, 6 * ink, 1 * ink).fill({ color: 0xffffff });
        markLayer.circle(u.x, y + 3 * ink, 1.4 * ink).fill({ color: 0xffffff });
      }
    }
    const ex = mission.extraction, hx = tileCenter(ex.tx), hy = tileCenter(ex.ty), pulse = (now * 0.8) % 1;
    markLayer.circle(hx, hy, EXTRACT_RADIUS * TILE).stroke({ width: 2.5, color: 0x4ade80, alpha: 0.55 });
    markLayer.circle(hx, hy, EXTRACT_RADIUS * TILE * (0.4 + 0.6 * pulse)).stroke({ width: 2, color: 0x4ade80, alpha: 0.5 * (1 - pulse) });
    for (const s of sim.groups) {
      if (s.role !== 'patrol') continue;
      // 群れの中で、いま見えている先頭の1体の上にゲージを出す
      const c = groupUnits(sim, s).find(u => sim.fog.isVisible(toTile(u.x), toTile(u.y)));
      if (!c) continue;
      const ink = 1 / Math.max(1, cam.zoom), x = c.x, y = c.y - KIND_PX.alien * .80 - 14 * ink;
      if (s.ai === 'chase') {
        const b = 1 + 0.12 * Math.sin(now * 14);
        markLayer.circle(x, y - 4 * ink, 10 * b * ink).fill({ color: 0xef4444 }).stroke({ width: 2.5 * ink, color: 0x121418 });
        markLayer.roundRect(x - 2 * ink, y - 11 * ink, 4 * ink, 9 * ink, 1.5 * ink).fill({ color: 0xffffff });
        markLayer.circle(x, y + 1.5 * ink, 2 * ink).fill({ color: 0xffffff });
      } else if (s.alert > 0.01 || s.ai === 'return') {
        markLayer.rect(x - 16 * ink, y, 32 * ink, 6 * ink).fill({ color: 0x121418, alpha: 0.9 });
        markLayer.rect(x - 15 * ink, y + ink, 30 * s.alert * ink, 4 * ink).fill({ color: s.alert > 0.66 ? 0xef4444 : 0xffb347 });
        if (s.ai === 'return') markLayer.circle(x + 22 * ink, y + 3 * ink, 3 * ink).fill({ color: 0x9ca3af });
      }
    }
  }

  // v1.0.0: 飛ぶ機体の燃料の小さなゲージ（足元の影の下）と、敵が届かない相手を前にした時の小さな印（頭の横の「×」）。目立たせない
  const weaponRowOfUnit = u => unitWeaponInfo(u)?.row ?? null;
  function drawAltMarks(now) {
    const ink = 1 / Math.max(0.6, cam.zoom);
    for (const u of sim.units) {
      const fr = fuelRatio(u);
      if (fr == null || u.hp <= 0) continue;
      if (u.side !== 'ally' && !sim.fog.isVisible(toTile(u.x), toTile(u.y))) continue;
      const w = 22 * ink, h = 3 * ink, x = u.x - w / 2, y = u.y + 9 * ink;
      const down = isRefueling(u), low = fr < 0.25;
      const col = down ? 0x7dd3fc : low ? 0xffb347 : 0x9be7ff;
      markLayer.rect(x - ink, y - ink, w + 2 * ink, h + 2 * ink).fill({ color: 0x121418, alpha: 0.55 });
      markLayer.rect(x, y, w * fr, h).fill({ color: col, alpha: down ? 0.5 + 0.3 * Math.sin(now * 6) : 0.75 });
    }
    for (const e of sim.units) {
      if (e.side !== 'enemy' || !sim.fog.isVisible(toTile(e.x), toTile(e.y))) continue;
      if (!unreachableTarget(sim, e, weaponRowOfUnit, TILE)) continue;
      const r = 5 * ink, x = e.x + 15 * ink, y = e.y - 36 * ink;
      markLayer.circle(x, y, r + ink).fill({ color: 0x121418, alpha: 0.45 });
      markLayer.moveTo(x - r * 0.55, y - r * 0.55).lineTo(x + r * 0.55, y + r * 0.55).moveTo(x + r * 0.55, y - r * 0.55).lineTo(x - r * 0.55, y + r * 0.55)
        .stroke({ width: 1.6 * ink, color: 0xd1d5db, alpha: 0.8, cap: 'round' });
    }
  }

  let frameNow = 0; // 紙芝居のキャラ（syncFramed）の空のゆれ用
  function sync(now) {
    frameNow = now;
    clampCam();
    world.scale.set(cam.zoom);
    const [shx, shy] = fx.shake;
    world.position.set(app.screen.width / 2 - cam.x * cam.zoom + shx, app.screen.height / 2 - cam.y * cam.zoom + shy);
    updateFog();
    fogSprite.visible = true;
    hqs.enemy.visible = !mission && sim.fog.isSeen(map.hq.enemy.tx, map.hq.enemy.ty);
    const alive = new Set();
    freshState.clear(); // いま sim.fx に残っている「変わったこと」を機体ごとに（盾を渡された・直った＝shield、キットを使われた＝repair_kit。盾が優先）
    for (const f of sim.fx) {
      if (f.type === 'shieldGive' || f.type === 'shieldRestored') freshState.set(f.unit, 'shield');
      else if (f.type === 'kitUse' && freshState.get(f.unit) !== 'shield') freshState.set(f.unit, 'repair_kit');
    }
    const simDt = Math.max(0, sim.time - lastSimTime); lastSimTime = sim.time;
    const waves = new Map();                     // 手を振り始める: 助けられた（長め）・選ばれた（1回）
    for (const f of sim.fx) if (f.type === 'rescue' && f.id != null && !fxWaveSeen.has(f)) { fxWaveSeen.add(f); waves.set(f.id, WAVE_SEC); }
    const sel = new Set(ui.selected);
    for (const id of sel) if (!lastSel.has(id)) { const w = chars[unitById(sim, id)?.kind]?.def.motions.wave; if (w) waves.set(id, Math.max(waves.get(id) || 0, w.sequence.length / w.fps)); }
    lastSel = sel;
    const charSize = {};
    for (const [kind, ch] of Object.entries(chars)) charSize[kind] = pickCharSize(ch);
    for (const u of sim.units) {
      alive.add(u.id);
      const v = unitView(u);
      v.u = u;
      const visible = u.side === 'ally' || sim.fog.isVisible(toTile(u.x), toTile(u.y));
      v.c.visible = visible;
      if (!visible) continue;
      if (v.sheet) { syncFramed(v, u, simDt, waves.get(u.id) || 0, charSize[u.kind], false); continue; }
      const look = ALT_UNIT_LOOK[u.kind], key = `${look?.art ?? u.kind}_${u.side}`; // 仮の絵の機体は借りた絵を使う
      if (v.key !== key) { v.body.texture = tex[key] || tex[`gunner_${u.side}`]; v.key = key; }
      const bob = u.moving ? Math.abs(Math.sin(now * 12 + u.id)) * 2.2 : 0;
      // 運ばれている人間は運んでいる異星生物の手前に描く
      v.c.position.set(u.x, u.y); v.c.zIndex = typeof u.captured === 'number' ? u.y + 4 : u.y;
      // 被弾の反応（sim の u._hr）: 足元を中心に傾く・つぶれる・ちらつく。人間が倒れる絵はまだないので、倒れる角度で代用
      const hr = u._hr?.out, tw = v.body.texture.orig.width || 1, th = v.body.texture.orig.height || 1;
      v.body.x = hr ? hr.dx : 0; v.body.y = -bob + (hr ? hr.dy : 0);
      v.body.rotation = hr ? (hr.tilt + hr.fallTilt) * Math.PI / 180 : 0;
      v.body.scale.set(v.px / tw * u.facing * (hr ? hr.sx : 1), v.px / th * (hr ? hr.sy : 1));
      v.bar.scale.y = 1 / Math.max(1, cam.zoom);
      if (v.hp !== u.hp || v.noKit !== noKit(u) || v.shield !== shieldKey(u)) {
        if (v.hp > u.hp && v.hp >= 0) v.flash = 0.12;
        v.hp = u.hp; v.noKit = noKit(u); v.shield = shieldKey(u);
        const w = u.kind === 'alien' ? 38 : u.human ? 18 : 26;
        drawBars(v.bar, u, w);
        if (v.noKit && !badges.kit_empty) drawNoKit(v.bar, w / 2);
      }
      syncClassIcon(v, u, u.kind === 'alien' ? 38 : u.human ? 18 : 26);
      v.flash = Math.max(0, v.flash - 1 / 60);
      v.body.tint = hr && hr.flash > 0.3 ? 0xffe0d0 : v.flash > 0 ? 0xffb4b4 : look?.tint ?? 0xffffff;
      syncAltitude(v, u, now);
    }
    if (sim.ride) { // 乗っている人を、ロボの背中・中の見た目にする
      if (!riderArt) riderArt = buildTextures(rideArtSources()).then(t => { if (dead) Object.values(t).forEach(disposeTexture); else Object.assign(tex, t); }).catch(e => console.warn('[bot-commander] 乗り姿の絵を読めない（小さな人の絵で出す）', e));
      syncRiderArt(syncRide(sim, views, cam.zoom, now, tex));
    } else if (riderShown) syncRiderArt(new Map());
    for (const [id, v] of views) {
      if (alive.has(id)) continue;
      // 紙芝居のキャラは、倒れたまま少し残る（やられ）
      if (v.sheet && v.c.visible && v.corpse < CORPSE_SEC + 1) {
        v.corpse = Math.max(0, v.corpse) + simDt;
        syncFramed(v, v.u, simDt, 0, charSize[v.u.kind], true);
        v.bar.visible = false; v.c.alpha = Math.min(1, CORPSE_SEC + 1 - v.corpse); v.c.zIndex = v.u.y - 6;
        continue;
      }
      v.c.destroy({ children: true }); views.delete(id);
    }
    drawPaths(now);
    drawFx();
    coverView.sync(now, fxLayer, cam.zoom);
    drawMission(now);
    if (sim.ride) drawRide(sim, markLayer, cam.zoom, now); // 中の人数の印・乗り降りの輪・気絶の星
    drawAltMarks(now); // 飛ぶ機体の燃料・届かない印（その機体がいない時は何も描かない）
    drawPops(now);
    spawnFxEvents(fx, sim, fxSeen, fxView);
    drawFxCanvas();
  }

  let lastSimTime = sim.time, lastSel = new Set();
  const fxWaveSeen = new WeakSet();
  // 画面上の大きさに合う絵（s30 / m60）。大きく伸ばす時はドットをぼかさない
  function pickCharSize(ch) {
    const dev = heightOf(ch.def) * cam.zoom * app.renderer.resolution, size = pickSize(ch.def, dev);
    const up = dev / ch.def.motions.idle.sizes[size].standing_height > 1.5, mode = up ? 'nearest' : 'linear';
    for (const src of ch.sources[size] || []) if (src.scaleMode !== mode) { src.scaleMode = mode; src.style?.update?.(); }
    return size;
  }
  function syncFramed(v, u, simDt, wave, size, dead) {
    const ex = mission?.extraction;
    const atExit = !!ex && Math.hypot(u.x - tileCenter(ex.tx), u.y - tileCenter(ex.ty)) <= EXTRACT_RADIUS * TILE;
    const st = stepAnim(v.sheet.def, v.anim, u, simDt, { atExit, wave, dead });
    const z = v.sheet.def.motions[st.motion].sizes[size], frames = v.sheet.tex[`${st.motion}_${size}`];
    v.body.texture = frames[st.frame] || frames[0];
    v.body.anchor.set(z.anchor[0] / z.frame_w, z.anchor[1] / z.frame_h);
    v.c.position.set(u.x, u.y); v.c.zIndex = typeof u.captured === 'number' ? u.y + 4 : u.y;
    // 被弾の反応は、絵に描いてある分を除いて少しだけ（ちらつき・小さな傾き・つぶれ）。倒れる角度（fallTilt）は使わない
    const hr = dead ? null : u._hr?.out, k = heightOf(v.sheet.def) / z.standing_height;
    v.body.x = hr ? hr.dx : 0; v.body.y = hr ? hr.dy : 0;
    v.body.rotation = hr && !hr.down ? hr.tilt * 0.4 * Math.PI / 180 : 0;
    v.body.scale.set(k * st.flip * (hr ? hr.sx : 1), k * (hr ? hr.sy : 1));
    v.shadow.scale.set((st.motion === 'knockdown' || st.motion === 'getup' ? 2 : 1) * heightOf(v.sheet.def) / 24, 1);
    v.bar.scale.y = 1 / Math.max(1, cam.zoom);
    if (!dead && (v.hp !== u.hp || v.noKit !== noKit(u) || v.shield !== shieldKey(u))) {
      if (v.hp > u.hp && v.hp >= 0) v.flash = 0.12;
      v.hp = u.hp; v.noKit = noKit(u); v.shield = shieldKey(u);
      drawBars(v.bar, u, 18);
      if (v.noKit && !badges.kit_empty) drawNoKit(v.bar, 9);
    }
    if (!dead) syncClassIcon(v, u, 18); else v.icon.visible = v.badge.visible = v.kit.visible = v.state.visible = false;
    v.flash = Math.max(0, v.flash - 1 / 60);
    v.body.tint = hr && hr.flash > 0.3 ? 0xffe0d0 : v.flash > 0 ? 0xffb4b4 : 0xffffff;
    if (!dead) syncAltitude(v, u, frameNow);
  }

  // v0.4.7-dev 高さ（sim の u.z）: z>0 は体を上に描き、影は足元に残す。z<0（水中）は青く暗く半透明に。
  //   z が 0 の機体（今の機体はみなそう）は何も変えない
  // v0.4.7-dev（10/24）空の機体: 足元に濃い影を置き、体はゆっくり上下させる（見た目だけ。sim の z はさわらない）
  function syncAltitude(v, u, now) {
    const z = u.z || 0;
    if (!z && !v.altOn) return;
    v.altOn = !!z;
    const air = z > 0, bob = z >= AIR_FROM_Z ? Math.sin(now * AIR_BOB_SPEED + ((u.ride ? u.ride.host : u.id) || 0) * 1.7) * AIR_BOB_PX : 0;
    const lift = air ? z + bob : 0;
    v.body.y -= lift; v.bar.y = -lift;
    if (v.icon.visible) v.icon.y -= lift;
    if (v.badge.visible) v.badge.y -= lift;
    if (v.kit.visible) v.kit.y -= lift;
    if (v.state.visible) v.state.y -= lift;
    if (air && !v.altShadow) { // 足元の影（地面にはりつく。紙芝居のキャラの影もこれに替える）
      v.altShadow = new Graphics().ellipse(0, 0, 12, 4.6).fill({ color: 0x000000, alpha: 0.45 }).ellipse(0, 0, 8, 3).fill({ color: 0x000000, alpha: 0.5 })
        .ellipse(0, 0, 12, 4.6).stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
      v.c.addChildAt(v.altShadow, 0);
    }
    if (v.altShadow) { // 高いほど小さく薄く、下がったときは少し大きく濃く
      v.altShadow.visible = air;
      const k = 1 - Math.min(0.4, lift / 150);
      v.altShadow.scale.set(k); v.altShadow.alpha = Math.min(1, 0.55 + 0.45 * k);
    }
    if (z < 0) {
      v.c.alpha = 0.55;
      if (v.body.tint === 0xffffff || v.body.tint === ALT_UNIT_LOOK[u.kind]?.tint) v.body.tint = 0x5f8fd0; // 被弾のちらつきは残す
      if (v.shadow) v.shadow.visible = false;
    } else { v.c.alpha = 1; if (v.shadow) v.shadow.visible = !air; }
  }

  // v0.4.3 兵種のアイコン: 味方ロボットだけ。画面で一定の大きさ（直径 ICON_R*2 px）、HP バーの左端の外。引きすぎたら消す
  // v0.4.10 絵（assets/icons）が読めていれば Graphics の代わりに絵を出す。キット切れの絵も HP バーの右端の外に
  const freshState = new Map();
  function syncClassIcon(v, u, barW) {
    syncKitIcon(v, u, barW);
    syncStateBadge(v, u, barW);
    const icon = u.side === 'ally' && !u.human ? classIconOf(u) : null, key = icon ? u.cls : null;
    const bt = icon ? badges[classBadgeOf(u)] : null;
    if (v.iconKey !== key) { v.icon.clear(); if (!bt) drawClassIcon(v.icon, icon); if (bt) v.badge.texture = bt; v.iconKey = key; }
    const show = !!icon && cam.zoom >= ICON_MIN_ZOOM;
    v.icon.visible = show && !bt; v.badge.visible = show && !!bt;
    if (!show) return;
    const z = cam.zoom, g = bt ? v.badge : v.icon;
    g.scale.set(bt ? ICON_R * 2 / bt.width / z : 1 / z);
    g.position.set(-barW / 2 - (ICON_R + 1) / z, 6 / Math.max(1, z));
  }
  // v0.4.12-dev 盾・キットの状態の印（HP バーの右上）: 盾が壊れている間／盾で守っている間・盾を渡された直後／キットを使われた・作っている間だけ。引いたら出さない
  function syncStateBadge(v, u, barW) {
    const name = cam.zoom >= ICON_MIN_ZOOM ? statusBadgeOf(u, { defensive: isDefensive(u), fresh: freshState.get(u.id) || null }) : null;
    const t = name ? badges[name] : null;
    v.state.visible = !!t;
    if (!t) return;
    if (v.state.texture !== t) v.state.texture = t;
    const z = cam.zoom;
    v.state.scale.set(STATE_BADGE_R * 2 / t.width / z);
    v.state.position.set(barW / 2 + (STATE_BADGE_R + 1) / z, -3 / Math.max(1, z));
  }
  function syncKitIcon(v, u, barW) {
    const t = badges.kit_empty;
    v.kit.visible = !!t && noKit(u);
    if (!v.kit.visible) return;
    if (v.kit.texture !== t) v.kit.texture = t;
    const z = Math.max(cam.zoom, ICON_MIN_ZOOM); // 引いた時は地図といっしょに小さく（赤い点の時と同じく、消さない）
    v.kit.scale.set(KIT_ICON_R * 2 / t.width / z);
    v.kit.position.set(barW / 2 + (KIT_ICON_R + 1) / z, 6 / Math.max(1, cam.zoom));
  }

  // 画面の中なら 1、画面の端から FX_MARGIN 外で 0（ゆれの強さにも使う）
  const fxView = {
    px: kind => KIND_PX[kind] || UNIT_PX,
    visible: (x, y) => sim.fog.isVisible(toTile(x), toTile(y)),
    onScreen(x, y) {
      const sx = (x - cam.x) * cam.zoom, sy = (y - cam.y) * cam.zoom, hw = app.screen.width / 2, hh = app.screen.height / 2;
      const out = Math.max(Math.abs(sx) - hw, Math.abs(sy) - hh, 0);
      return Math.max(0, 1 - out / FX_MARGIN);
    },
  };
  function drawFxCanvas() {
    const res = app.renderer.resolution, W = Math.round(app.screen.width * res), H = Math.round(app.screen.height * res);
    if (fxCanvas.width !== W || fxCanvas.height !== H) { fxCanvas.width = W; fxCanvas.height = H; }
    fxCtx.setTransform(1, 0, 0, 1, 0, 0); fxCtx.clearRect(0, 0, W, H);
    const z = cam.zoom * res;
    fxCtx.setTransform(z, 0, 0, z, world.position.x * res, world.position.y * res);
    fx.draw(fxCtx);
    fx.drawScreen(fxCtx, W, H);
  }

  // v1.0.0 背中の乗り姿（Codex gfx3 R_RIDE）: ロボの体の絵と同じ位置・大きさ・向き・傾き・揺れで、上に重ねる（ロボと人の揺れは共通）
  let riderArt = null, riderShown = false, dead = false;
  function syncRiderArt(drawn) {
    riderShown = drawn.size > 0;
    for (const [id, v] of views) {
      const key = drawn.get(id);
      if (!key) { if (v.rider) v.rider.visible = false; continue; }
      if (!v.rider) { v.rider = new Sprite(); v.rider.anchor.set(0.5, 0.88); v.c.addChildAt(v.rider, v.c.getChildIndex(v.body) + 1); }
      const r = v.rider, b = v.body;
      r.texture = tex[key]; r.visible = b.visible;
      r.position.copyFrom(b.position); r.scale.copyFrom(b.scale); r.rotation = b.rotation; r.tint = b.tint;
    }
  }

  function destroy() {
    dead = true;
    views.clear(); fx.clear(); fxCanvas.remove();
    const canv = gatherCanvases({ tex, chars, landmarks, badges });
    clearSharedPool();
    app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    releaseSharedTextures(); // v0.4.12 共通の絵に残る、捨てた描画の待ちを外す（「もう一度」ごとにヒープが増えるのを防ぐ）
    fogRT.destroy(true);
    // app.destroy は画面に貼られた絵しか捨てない。自分で作った物（地面の元絵の残り・使わなかった状態の絵・霧の元絵・立ち絵・遮蔽物など）を全部捨てる
    fogHolder.destroy({ children: true }); fogBlur.destroy?.(); disposeTexture(fogSrcTex); fogCanvas.width = fogCanvas.height = 0;
    disposeAssets({ tex, chars, landmarks, badges }); zeroCanvases(canv);
    fxCanvas.width = fxCanvas.height = 0;
    appCanvas.width = appCanvas.height = 0; // canvas は 0 にして Safari へ返す
  }

  return { app, cam, ui, sync, destroy, coverView, screenToWorld, worldToScreen, clampCam, softFog, fogSprite, views, fx, fxCanvas, chars };
}
