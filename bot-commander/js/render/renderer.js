// 描画（Pixi v8）。シミュレーションの state を読むだけで、書き換えない。
import { Application, Container, Sprite, Graphics, Text, Texture, Rectangle, RenderTexture, BlurFilter } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { TILE, TERRAIN, toTile, tileCenter } from '../sim/map.js?v=5';
import { squadCommander, squadUnits } from '../sim/sim.js?v=5';
import { GATHER_RADIUS, EXTRACT_RADIUS } from '../sim/mission.js?v=5';
import { artSources } from './art.js?v=7';
import { buildTextures } from './textures.js?v=7';

const FOG_PAD = 2;            // 霧テクスチャの外周（ぼかしで端が明るくならないように）
const FOG_RT_SCALE = 4;       // 1タイル＝霧テクスチャ4px（ぼかし後）
const UNIT_PX = 34;           // 機体の表示サイズ（ワールド座標）
const KIND_PX = { scav: 40, ponco: 42, alien: 64 }; // Clear at play scale, detailed up to 4.5x zoom.
const SIDE_COLOR = { ally: 0x7df9ff, enemy: 0xffb347 };

export async function createRenderer(host, sim) {
  const app = new Application();
  await app.init({ resizeTo: host, background: '#0b0d10', antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, preference: 'webgl' });
  host.appendChild(app.canvas);
  const tex = await buildTextures(artSources());
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
    const marker = new Sprite(tex[`marker_${u.side}`]); marker.anchor.set(0.3, 1); marker.width = marker.height = 18; marker.position.set(4, -px + 2);
    if (u.side === 'enemy' && mission) marker.alpha = 0; // 異星生物に旗は出さない
    const bar = new Graphics();
    c.addChild(body, marker, bar);
    units.addChild(c);
    v = { c, body, marker, bar, hp: -1, cmd: null, flash: 0, px };
    views.set(u.id, v);
    return v;
  }

  const ui = { selected: null, stroke: null };

  function drawPaths(now) {
    pathLayer.clear(); selLayer.clear();
    const sq = sim.squads.find(s => s.id === ui.selected);
    if (sq) {
      for (const u of squadUnits(sim, sq)) selLayer.ellipse(u.x, u.y - 1, 15, 7).fill({ color: 0x7df9ff, alpha: 0.12 }).stroke({ width: 2 / Math.max(1, cam.zoom), color: 0x7df9ff, alpha: 0.85 });
      const c = squadCommander(sim, sq), o = sq.order;
      if (c && o) {
        const pts = o.planned.slice(o.pathIdx);
        if (pts.length) {
          pathLayer.moveTo(c.x, c.y);
          for (const p of pts) pathLayer.lineTo(tileCenter(p.tx), tileCenter(p.ty));
          pathLayer.stroke({ width: 5, color: 0x000000, alpha: 0.35, cap: 'round', join: 'round' });
          pathLayer.moveTo(c.x, c.y);
          for (const p of pts) pathLayer.lineTo(tileCenter(p.tx), tileCenter(p.ty));
          pathLayer.stroke({ width: 2.5, color: 0x7df9ff, alpha: 0.95, cap: 'round', join: 'round' });
        }
        o.waypoints.forEach((w, i) => {
          const done = i < o.wpIndex;
          pathLayer.circle(tileCenter(w.tx), tileCenter(w.ty), 9).fill({ color: done ? 0x334155 : 0x0b1220, alpha: 0.85 }).stroke({ width: 2.5, color: 0x7df9ff });
          pathLayer.circle(tileCenter(w.tx), tileCenter(w.ty), 3 + (i === o.waypoints.length - 1 ? 2 : 0)).fill({ color: 0xffd166 });
        });
      }
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
  function drawPops(now) {
    let k = 0;
    for (const f of sim.fx) {
      if (f.type !== 'gain' && f.type !== 'find') continue;
      const life = f.type === 'find' ? 2.2 : 1, age = sim.time - f.t;
      if (age > life) continue;
      let t = popPool[k];
      if (!t) { t = new Text({ text: '', style: POP_STYLE }); t.anchor.set(0.5); pops.addChild(t); popPool.push(t); }
      k++;
      const a = Math.min(1, (life - age) / (life * 0.4));
      if (f.type === 'gain') {
        if (t.text !== '+1') { t.text = '+1'; t.style = POP_STYLE; }
        t.position.set(f.x, f.y - 30 - age * 26); t.scale.set(0.7 + 0.3 * Math.min(1, age * 8));
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
      if (f.type === 'shot') {
        if (age > 0.18) continue;
        const vis = f.side === 'ally' || sim.fog.isVisible(toTile(f.x1), toTile(f.y1)) || sim.fog.isVisible(toTile(f.x2), toTile(f.y2));
        if (!vis) continue;
        const a = 1 - age / 0.18, col = SIDE_COLOR[f.side];
        fxLayer.moveTo(f.x1, f.y1).lineTo(f.x2, f.y2).stroke({ width: f.kind === 'heavy' ? 7 : 4, color: col, alpha: a * 0.16, cap: 'round' });
        fxLayer.moveTo(f.x1, f.y1).lineTo(f.x2, f.y2).stroke({ width: f.kind === 'heavy' ? 3.5 : 2, color: col, alpha: a });
        fxLayer.circle(f.x2, f.y2, 4 + 6 * (1 - a)).fill({ color: col, alpha: a * 0.25 });
        fxLayer.circle(f.x2, f.y2, 2.2).fill({ color: 0xfff5d8, alpha: a });
      } else if (f.type === 'deliver') {
        const a = 1 - age / 0.8;
        fxLayer.circle(f.x, f.y - 6, 10 + 40 * (1 - a)).stroke({ width: 4, color: 0x4ade80, alpha: a });
      } else if (f.type === 'find') {
        const a = Math.max(0, 1 - age / 1.2);
        for (let i = 0; i < 6; i++) {
          const ang = i / 6 * Math.PI * 2 + age * 2, rr = 10 + age * 40;
          fxLayer.star(f.x + Math.cos(ang) * rr, f.y - 30 + Math.sin(ang) * rr, 4, 5, 2).fill({ color: 0xfff3b0, alpha: a });
        }
      } else if (f.type === 'boom') {
        if (f.side === 'enemy' && !sim.fog.isVisible(toTile(f.x), toTile(f.y))) continue;
        const a = Math.max(0, 1 - age / 0.6), r = 8 + 22 * (1 - a), col = SIDE_COLOR[f.side];
        fxLayer.circle(f.x, f.y - 8, r * 1.2).fill({ color: col, alpha: a * 0.12 });
        fxLayer.circle(f.x, f.y - 8, r).fill({ color: col, alpha: a * 0.6 }).stroke({ width: 2.5, color: 0x293632, alpha: a });
        fxLayer.circle(f.x - r * 0.18, f.y - 8 - r * 0.2, r * 0.52).fill({ color: 0xffefc5, alpha: a * a });
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
    for (const s of sim.squads) {
      if (s.side !== 'ally' || s.gathering == null) continue;
      for (const u of squadUnits(sim, s)) {
        const k = (now * 3 + u.id * 0.37) % 1;
        const x = u.x + Math.sin(u.id * 7 + now * 5) * 6, y = u.y - 20 - k * 16;
        markLayer.star(x, y, 4, 2.4 * (1 - k) + 0.6, 0.8).fill({ color: 0xffdf88, alpha: 1 - k });
      }
    }
    const ex = mission.extraction, hx = tileCenter(ex.tx), hy = tileCenter(ex.ty), pulse = (now * 0.8) % 1;
    markLayer.circle(hx, hy, EXTRACT_RADIUS * TILE).stroke({ width: 2.5, color: 0x4ade80, alpha: 0.55 });
    markLayer.circle(hx, hy, EXTRACT_RADIUS * TILE * (0.4 + 0.6 * pulse)).stroke({ width: 2, color: 0x4ade80, alpha: 0.5 * (1 - pulse) });
    for (const s of sim.squads) {
      if (s.role !== 'patrol') continue;
      const c = squadCommander(sim, s);
      if (!c || !sim.fog.isVisible(toTile(c.x), toTile(c.y))) continue;
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
    world.position.set(app.screen.width / 2 - cam.x * cam.zoom, app.screen.height / 2 - cam.y * cam.zoom);
    updateFog();
    fogSprite.visible = true;
    hqs.enemy.visible = !mission && sim.fog.isSeen(map.hq.enemy.tx, map.hq.enemy.ty);
    const alive = new Set();
    for (const u of sim.units) {
      alive.add(u.id);
      const v = unitView(u);
      const visible = u.side === 'ally' || sim.fog.isVisible(toTile(u.x), toTile(u.y));
      v.c.visible = visible;
      if (!visible) continue;
      const key = `${u.kind}_${u.side}${u.commander ? '_cmd' : ''}`;
      if (v.cmd !== key) { v.body.texture = tex[key]; v.cmd = key; v.marker.visible = u.commander; }
      const bob = u.moving ? Math.abs(Math.sin(now * 12 + u.id)) * 2.2 : 0;
      v.c.position.set(u.x, u.y); v.c.zIndex = u.y;
      v.body.y = -bob; v.body.scale.x = Math.abs(v.body.scale.x) * u.facing;
      v.bar.scale.y = 1 / Math.max(1, cam.zoom);
      v.marker.width = v.marker.height = 18 * Math.min(1, 1.5 / cam.zoom);
      if (v.hp !== u.hp) {
        if (v.hp > u.hp && v.hp >= 0) v.flash = 0.12;
        v.hp = u.hp;
        const w = u.kind === 'alien' ? 38 : 26, r = Math.max(0, u.hp / u.maxHp);
        v.bar.clear().rect(-w / 2, 4, w, 4).fill({ color: 0x121418 }).rect(-w / 2 + 0.8, 4.8, (w - 1.6) * r, 2.4).fill({ color: r > 0.5 ? 0x4ade80 : r > 0.25 ? 0xfacc15 : 0xef4444 });
      }
      v.flash = Math.max(0, v.flash - 1 / 60);
      v.body.tint = v.flash > 0 ? 0xffb4b4 : 0xffffff;
    }
    for (const [id, v] of views) if (!alive.has(id)) { v.c.destroy({ children: true }); views.delete(id); }
    drawPaths(now);
    drawFx();
    drawMission(now);
    drawPops(now);
  }

  function destroy() { views.clear(); app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true }); fogRT.destroy(true); }

  return { app, cam, ui, sync, destroy, screenToWorld, worldToScreen, clampCam, softFog, fogSprite, views };
}
