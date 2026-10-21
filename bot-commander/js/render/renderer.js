// 描画（Pixi v8）。シミュレーションの state を読むだけで、書き換えない。
import { Application, Container, Sprite, Graphics, Texture, RenderTexture, BlurFilter } from '../../vendor/pixi-8.22.0.min.mjs?v=2';
import { TILE, TERRAIN, toTile, tileCenter } from '../sim/map.js?v=2';
import { squadCommander, squadUnits } from '../sim/sim.js?v=2';
import { artSources } from './art.js?v=2';
import { buildTextures } from './textures.js?v=2';

const FOG_PAD = 2;            // 霧テクスチャの外周（ぼかしで端が明るくならないように）
const FOG_RT_SCALE = 4;       // 1タイル＝霧テクスチャ4px（ぼかし後）
const UNIT_PX = 34;           // 機体の表示サイズ（ワールド座標）
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
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const k = TERRAIN[map.tiles[ty * map.w + tx]].key, v = (tx * 7 + ty * 13) % 3 === 0 ? 1 : 0;
    const s = new Sprite(tex[`tile_${k}_${v}`]);
    s.position.set(tx * TILE, ty * TILE); s.width = s.height = TILE;
    terrain.addChild(s);
  }
  world.addChild(terrain);

  const pathLayer = new Graphics();
  const selLayer = new Graphics();
  const units = new Container(); units.sortableChildren = true;
  const fxLayer = new Graphics();
  world.addChild(selLayer, pathLayer, units, fxLayer);

  // 本陣
  const hqs = {};
  for (const side of ['ally', 'enemy']) {
    const h = map.hq[side], s = new Sprite(tex[`hq_${side}`]);
    s.anchor.set(0.5, 0.82); s.width = s.height = TILE * 3.2;
    s.position.set(tileCenter(h.tx), tileCenter(h.ty) + 18); s.zIndex = s.y;
    units.addChild(s); hqs[side] = s;
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
  const minZoom = () => Math.max(app.screen.width / (map.w * TILE), app.screen.height / (map.h * TILE)) * 0.9;
  function clampCam() {
    cam.zoom = Math.max(minZoom(), Math.min(2.4, cam.zoom));
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
    const body = new Sprite(); body.anchor.set(0.5, 0.88); body.width = body.height = UNIT_PX;
    const marker = new Sprite(tex[`marker_${u.side}`]); marker.anchor.set(0.3, 1); marker.width = marker.height = 18; marker.position.set(4, -UNIT_PX + 2);
    const bar = new Graphics();
    c.addChild(body, marker, bar);
    units.addChild(c);
    v = { c, body, marker, bar, hp: -1, cmd: null, flash: 0 };
    views.set(u.id, v);
    return v;
  }

  const ui = { selected: null, stroke: null };

  function drawPaths(now) {
    pathLayer.clear(); selLayer.clear();
    const sq = sim.squads.find(s => s.id === ui.selected);
    if (sq) {
      for (const u of squadUnits(sim, sq)) selLayer.ellipse(u.x, u.y - 1, 15, 7).fill({ color: 0x7df9ff, alpha: 0.28 }).stroke({ width: 2, color: 0x7df9ff, alpha: 0.9 });
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

  function drawFx() {
    fxLayer.clear();
    for (const f of sim.fx) {
      const age = sim.time - f.t;
      if (f.type === 'shot') {
        if (age > 0.18) continue;
        const vis = f.side === 'ally' || sim.fog.isVisible(toTile(f.x1), toTile(f.y1)) || sim.fog.isVisible(toTile(f.x2), toTile(f.y2));
        if (!vis) continue;
        const a = 1 - age / 0.18, col = SIDE_COLOR[f.side];
        fxLayer.moveTo(f.x1, f.y1).lineTo(f.x2, f.y2).stroke({ width: f.kind === 'heavy' ? 3.5 : 2, color: col, alpha: a });
        fxLayer.circle(f.x2, f.y2, 4 + 6 * (1 - a)).fill({ color: 0xffffff, alpha: a * 0.8 });
      } else if (f.type === 'boom') {
        if (f.side === 'enemy' && !sim.fog.isVisible(toTile(f.x), toTile(f.y))) continue;
        const a = 1 - age / 0.6;
        fxLayer.circle(f.x, f.y - 8, 8 + 22 * (1 - a)).fill({ color: 0xffa94d, alpha: a * 0.7 }).stroke({ width: 3, color: 0x121418, alpha: a });
      }
    }
  }

  function sync(now) {
    clampCam();
    world.scale.set(cam.zoom);
    world.position.set(app.screen.width / 2 - cam.x * cam.zoom, app.screen.height / 2 - cam.y * cam.zoom);
    updateFog();
    fogSprite.visible = true;
    hqs.enemy.visible = sim.fog.isSeen(map.hq.enemy.tx, map.hq.enemy.ty);
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
      if (v.hp !== u.hp) {
        if (v.hp > u.hp && v.hp >= 0) v.flash = 0.12;
        v.hp = u.hp;
        const w = 26, r = Math.max(0, u.hp / u.maxHp);
        v.bar.clear().rect(-w / 2, 4, w, 4).fill({ color: 0x121418 }).rect(-w / 2 + 0.8, 4.8, (w - 1.6) * r, 2.4).fill({ color: r > 0.5 ? 0x4ade80 : r > 0.25 ? 0xfacc15 : 0xef4444 });
      }
      v.flash = Math.max(0, v.flash - 1 / 60);
      v.body.tint = v.flash > 0 ? 0xffb4b4 : 0xffffff;
    }
    for (const [id, v] of views) if (!alive.has(id)) { v.c.destroy({ children: true }); views.delete(id); }
    drawPaths(now);
    drawFx();
  }

  function destroy() { views.clear(); app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true }); fogRT.destroy(true); }

  return { app, cam, ui, sync, destroy, screenToWorld, worldToScreen, clampCam, softFog, fogSprite, views };
}
