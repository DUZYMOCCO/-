// 描画（Pixi v8）。シミュレーションの state を読むだけで、書き換えない。
// v0.4.0-dev: 部隊の表示をやめ、選んだ機体ごとに輪と経路。人間（少年・少女）と「捕まった」の表示。
// v0.4.0-dev（10/23）: 撃つ・当たる・倒れるの演出は js/fx（Canvas2D）。Pixi の上に重ねた透明 canvas に、同じカメラで描く。
//   画面のゆれは world ごとずらす。止め（hit-stop）は index.js が fx.update の戻り値でシミュレーションを止める。
// v0.4.0-dev（10/23 夜）: 遮蔽物と落とし物の見た目（js/render/cover-view.js）。
import { Application, Container, Sprite, Graphics, Text, Texture, Rectangle, RenderTexture, BlurFilter } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { TILE, TERRAIN, toTile, tileCenter } from '../sim/map.js?v=5';
import { groupUnits, unitById } from '../sim/sim.js?v=13';
import { FX_MAX, FX_SHAKE_MAX, FX_MARGIN, spawnFxEvents } from './fx-events.js?v=4';
import { loadLandmarks, createCoverView } from './cover-view.js?v=3';
import { create as createFx } from '../fx/fx.js?v=2';
import { GATHER_RADIUS, EXTRACT_RADIUS, CAPTURE } from '../sim/mission.js?v=9';
import { artSources } from './art.js?v=10';
import { buildTextures, loadCharSheets } from './textures.js?v=10';
import { CHAR_FRAMES, heightOf, CORPSE_SEC, WAVE_SEC, hasFrames, newAnim, pickSize, stepAnim } from './char-anim.js?v=4';

const FOG_PAD = 2;            // 霧テクスチャの外周（ぼかしで端が明るくならないように）
const FOG_RT_SCALE = 4;       // 1タイル＝霧テクスチャ4px（ぼかし後）
const UNIT_PX = 34;           // 機体の表示サイズ（ワールド座標）
const KIND_PX = { scav: 40, ponco: 42, alien: 64, boy: 28, girl: 28 }; // Clear at play scale, detailed up to 4.5x zoom.
const SIDE_COLOR = { ally: 0x7df9ff, enemy: 0xffb347 };

export async function createRenderer(host, sim, { fxQuality = 'normal', ground, human } = {}) {
  const app = new Application();
  await app.init({ resizeTo: host, background: '#0b0d10', antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
  host.appendChild(app.canvas);
  // 演出の canvas（Pixi の上に重ねる。タップは下へ通す）
  const fxCanvas = document.createElement('canvas');
  fxCanvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
  host.appendChild(fxCanvas);
  const fxCtx = fxCanvas.getContext('2d');
  const fx = createFx({ max: FX_MAX[fxQuality] || FX_MAX.normal, shakeMax: FX_SHAKE_MAX });
  const fxSeen = new WeakSet();
  const [tex, chars, landmarks] = await Promise.all([buildTextures(artSources({ ground })), loadCharSheets(human === 'oblique' ? { ...CHAR_FRAMES, boy: 'BOY_OBL' } : CHAR_FRAMES), sim.cover?.length ? loadLandmarks() : {}]);
  const map = sim.map;
  const world = new Container();
  app.stage.addChild(world);

  // 地形（動かないので一度だけ並べる）
  const terrain = new Container();
  // One artwork spans 4x4 map tiles: plants/rubble stay substantial at normal zoom.
  // Frames share four GPU sources; no extra uploads or per-frame baking.
  const terrainFrames = new Map();
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const k = TERRAIN[map.tiles[ty * map.w + tx]].key;
    const frameKey = `${k}_${tx % 4}_${ty % 4}`;
    if (!terrainFrames.has(frameKey)) {
      const source = tex[`tile_${k}_0`].source, side = source.width / 4;
      terrainFrames.set(frameKey, new Texture({ source, frame: new Rectangle(tx % 4 * side, ty % 4 * side, side, side) }));
    }
    const s = new Sprite(terrainFrames.get(frameKey));
    s.tint = k === 'plain' ? 0xa9aaa3 : k === 'forest' ? 0xb1b8a9 : 0xb5b8b1;
    s.position.set(tx * TILE, ty * TILE); s.width = s.height = TILE;
    terrain.addChild(s);
  }
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
  const fogSrcTex = Texture.from(fogCanvas); fogSrcTex.source.scaleMode = 'linear';
  const fogSrc = new Sprite(fogSrcTex); fogSrc.width = fw * FOG_RT_SCALE; fogSrc.height = fh * FOG_RT_SCALE;
  fogSrc.filters = [new BlurFilter({ strength: 3, quality: 3 })];
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
    c.addChild(body, bar);
    units.addChild(c);
    v = { c, body, bar, hp: -1, key: null, flash: 0, px, sheet, shadow, anim: sheet ? newAnim() : null, u, corpse: -1 };
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
  function drawPops(now) {
    let k = 0;
    for (const f of sim.fx) {
      if (f.type !== 'gain' && f.type !== 'find' && f.type !== 'captured' && f.type !== 'rescue' && f.type !== 'nested' && f.type !== 'pickup') continue;
      const life = f.type === 'gain' ? 1 : 2.2, age = sim.time - f.t;
      if (age > life) continue;
      let t = popPool[k];
      if (!t) { t = new Text({ text: '', style: POP_STYLE }); t.anchor.set(0.5); pops.addChild(t); popPool.push(t); }
      k++;
      const a = Math.min(1, (life - age) / (life * 0.4));
      if (f.type === 'gain') {
        if (t.text !== '+1') { t.text = '+1'; t.style = POP_STYLE; }
        t.position.set(f.x, f.y - 30 - age * 26); t.scale.set(0.7 + 0.3 * Math.min(1, age * 8));
      } else if (f.type === 'pickup') {
        const label = f.item === 'weapon' ? `${f.name}${f.equipped ? ' 装備！' : ' 入手'}` : `${f.name}！ 回復`;
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
      t.alpha = a; t.visible = true;
      if (f.type === 'gain') { const pl = piles.find(q => q.p.id === f.pile); if (pl && pl.lastPop !== f.t) { pl.lastPop = f.t; pl.bump = now; } }
    }
    for (; k < popPool.length; k++) popPool[k].visible = false;
  }

  function drawFx() {
    fxLayer.clear();
    for (const f of sim.fx) {
      const age = sim.time - f.t;
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

  function sync(now) {
    clampCam();
    world.scale.set(cam.zoom);
    const [shx, shy] = fx.shake;
    world.position.set(app.screen.width / 2 - cam.x * cam.zoom + shx, app.screen.height / 2 - cam.y * cam.zoom + shy);
    updateFog();
    fogSprite.visible = true;
    hqs.enemy.visible = !mission && sim.fog.isSeen(map.hq.enemy.tx, map.hq.enemy.ty);
    const alive = new Set();
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
      const key = `${u.kind}_${u.side}`;
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
      if (v.hp !== u.hp) {
        if (v.hp > u.hp && v.hp >= 0) v.flash = 0.12;
        v.hp = u.hp;
        const w = u.kind === 'alien' ? 38 : u.human ? 18 : 26, r = Math.max(0, u.hp / u.maxHp);
        v.bar.clear().rect(-w / 2, 4, w, 4).fill({ color: 0x121418 }).rect(-w / 2 + 0.8, 4.8, (w - 1.6) * r, 2.4).fill({ color: r > 0.5 ? 0x4ade80 : r > 0.25 ? 0xfacc15 : 0xef4444 });
      }
      v.flash = Math.max(0, v.flash - 1 / 60);
      v.body.tint = hr && hr.flash > 0.3 ? 0xffe0d0 : v.flash > 0 ? 0xffb4b4 : 0xffffff;
    }
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
    if (!dead && v.hp !== u.hp) {
      if (v.hp > u.hp && v.hp >= 0) v.flash = 0.12;
      v.hp = u.hp;
      const r = Math.max(0, u.hp / u.maxHp);
      v.bar.clear().rect(-9, 4, 18, 4).fill({ color: 0x121418 }).rect(-8.2, 4.8, 16.4 * r, 2.4).fill({ color: r > 0.5 ? 0x4ade80 : r > 0.25 ? 0xfacc15 : 0xef4444 });
    }
    v.flash = Math.max(0, v.flash - 1 / 60);
    v.body.tint = hr && hr.flash > 0.3 ? 0xffe0d0 : v.flash > 0 ? 0xffb4b4 : 0xffffff;
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

  function destroy() { views.clear(); fx.clear(); fxCanvas.remove(); app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true }); fogRT.destroy(true); }

  return { app, cam, ui, sync, destroy, coverView, screenToWorld, worldToScreen, clampCam, softFog, fogSprite, views, fx, fxCanvas, chars };
}
