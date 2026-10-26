// 発射台（?launcher=1 の試作）を描く所。新しい絵は作らず、今ある絵（W1-06 使い捨てロケット砲）とコード（円・線・三角）で描く。
// sim の状態（sim.launcher・発射台の機体 u.launch・sim.fx）を読むだけ。renderer.js には触らず、r（createRenderer の返り値）の views・cam・fx・app を使う。
// 代用した絵の一覧は out/CHANGES.md の 4 章（あとで Codex が描く）。
import { Container, Graphics, Sprite, Text, Texture } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { tileCenter } from '../sim/map.js?v=6';
import { unitById } from '../sim/sim.js?v=27';
import { LAUNCHER, launchersOf } from '../sim/launcher.js?v=3';

const ART_URL = new URL('../../assets/weapons/W1-06.webp', import.meta.url).href; // 代用: 使い捨てロケット砲（発射台の上に載せる）
const ART_W = 40;      // 画面に出す幅（world px）
const BLAST_SHAKE = { shake: 1, stop: false };
const SCORCH_SEC = 25; // 着弾の焦げ跡が薄れるまで（実時間）

const ease = k => k * k * (3 - 2 * k);

/**
 * 描く部品を作る。r: createRenderer の返り値、sim。返り値: { sync(now), setRange(unitId|null), setPreview({x,y}|null), destroy() }
 * sync は毎フレーム r.sync の後で呼ぶ（発射台の機体は、renderer が出す代用のロボの絵を隠して、こちらで描く）
 */
export function createLauncherView(r, sim) {
  const world = r.app.stage.children[0]; // renderer.js の world（地面・機体・演出が入っている）
  const root = new Container(); root.sortableChildren = true;
  const ground = new Graphics(), air = new Graphics(), label = new Text({ text: '', style: { fontSize: 12, fontWeight: '800', fill: '#ffe9a8', stroke: { color: '#000000', width: 3 }, fontFamily: 'system-ui, sans-serif' } });
  label.anchor.set(0.5, 1); label.visible = false;
  ground.zIndex = 0; air.zIndex = 5000; label.zIndex = 6000;
  root.addChild(ground, air, label);
  world.addChild(root);
  const views = new Map();           // 発射台の id → { c, cart, art }
  const seen = new WeakSet();
  const rings = [];                  // 爆発の衝撃の輪 { x, y, t }
  const scorch = [];                 // 焦げ跡 { x, y, t }
  const st = { rangeId: null, preview: null, tex: null, dead: false };

  // 絵（代用）。読めなければ四角で代わりにする
  (async () => {
    try {
      const im = new Image(); im.src = ART_URL; await im.decode();
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
      const t = Texture.from(cv, true); t.source.scaleMode = 'linear';
      if (st.dead) { t.destroy(true); return; }
      st.tex = t;
    } catch (e) { console.warn('[bot-commander] 発射台の代用の絵（W1-06）を読めない（四角で出す）', e); }
  })();

  function viewOf(u) {
    let v = views.get(u.id);
    if (v) return v;
    const c = new Container(), cart = new Graphics(), art = new Sprite();
    art.anchor.set(0.5, 0.62); art.visible = false;
    // 台車: 影・車輪 2 つ・平らな台（絵の代用）
    cart.ellipse(0, 3, 17, 5).fill({ color: 0x000000, alpha: 0.3 });
    cart.roundRect(-14, -5, 28, 7, 2).fill({ color: 0x5a4a32 }).stroke({ width: 1.2, color: 0x1b1409 });
    cart.circle(-9, 3, 4).fill({ color: 0x2a2a2a }).stroke({ width: 1, color: 0x111111 });
    cart.circle(9, 3, 4).fill({ color: 0x2a2a2a }).stroke({ width: 1, color: 0x111111 });
    c.addChild(cart, art);
    root.addChild(c);
    v = { c, cart, art };
    views.set(u.id, v);
    return v;
  }

  function drawTarget(g, x, y, now, k, color) { // 着弾の印: 外の輪＝爆発の半径（3 タイル）・内の輪＝最大ダメージ（1.5 タイル）・十字
    const blink = 0.55 + 0.35 * Math.sin(now * (6 + 10 * (1 - k)));
    g.circle(x, y, LAUNCHER.radius).fill({ color, alpha: 0.07 + 0.05 * blink }).stroke({ width: 2.2, color, alpha: 0.5 + 0.4 * blink });
    g.circle(x, y, LAUNCHER.coreRadius).fill({ color, alpha: 0.12 }).stroke({ width: 1.6, color: 0xffffff, alpha: 0.45 * blink + 0.2 });
    const s = 12;
    g.moveTo(x - s, y).lineTo(x + s, y).moveTo(x, y - s * 0.55).lineTo(x, y + s * 0.55).stroke({ width: 2, color: 0xffffff, alpha: 0.85 });
  }

  function fxEvents() {
    for (const f of sim.fx) {
      if (seen.has(f)) continue;
      seen.add(f);
      try {
        if (f.type === 'launcherBlast') {
          const gate = BLAST_SHAKE, y = f.y - 6, o = { surface: 'ground', medium: 'land', gy: f.y, gate };
          r.fx.hit('explosion', f.x, y, { ...o, w: 1, s: 2.4, variant: 'missile' }); // 今ある爆発を大きくする
          r.fx.after(0.10, () => r.fx.hit('explosion', f.x - 30, y + 10, { ...o, w: 0.8, s: 1.8, variant: 'rocket' }));
          r.fx.after(0.18, () => r.fx.hit('explosion', f.x + 34, y - 8, { ...o, w: 0.8, s: 1.8, variant: 'rocket' }));
          r.fx.after(0.30, () => r.fx.hit('explosion', f.x + 4, y + 26, { ...o, w: 0.7, s: 1.6, variant: 'rocket' }));
          r.fx.after(0.45, () => r.fx.hit('heavy', f.x, y, { ...o, w: 0.9, s: 2 }));
          rings.push({ x: f.x, y: f.y, t: performance.now() / 1000 });
          scorch.push({ x: f.x, y: f.y, t: performance.now() / 1000 });
        } else if (f.type === 'launcherLost') {
          r.fx.hit('explosion', f.x, f.y - 8, { surface: 'armor', medium: 'land', gy: f.y, w: 0.4, s: 1.1, variant: 'rocket', gate: { shake: 0.3, stop: false } }); // 小さな爆発（まわりにダメージなし）
        } else if (f.type === 'launcherLaunch') {
          r.fx.hit('explosion', f.x, f.y - 10, { surface: 'ground', medium: 'land', gy: f.y, w: 0.35, s: 1.2, variant: 'rocket', gate: { shake: 0.4, stop: false } }); // 発射の炎とけむり
        }
      } catch (e) { console.warn('[bot-commander] 発射台の演出を出せない', e); }
    }
  }

  function sync(now) {
    const L = sim.launcher; if (!L || st.dead) return;
    const cam = r.cam, ink = 1 / Math.max(1, cam.zoom), real = performance.now() / 1000;
    fxEvents();
    ground.clear(); air.clear(); label.visible = false;
    // 焦げ跡（着弾のあと、薄れていく）
    for (let i = scorch.length - 1; i >= 0; i--) {
      const s = scorch[i], a = 1 - (real - s.t) / SCORCH_SEC;
      if (a <= 0) { scorch.splice(i, 1); continue; }
      ground.ellipse(s.x, s.y, 58, 30).fill({ color: 0x120d08, alpha: 0.42 * a }).ellipse(s.x, s.y, 30, 15).fill({ color: 0x000000, alpha: 0.3 * a });
    }
    // 建造中（資材の届け先＝仮の拠点）: 台と進み具合
    const ex = sim.mission?.extraction;
    if (ex && L.builds.length) {
      const b = L.builds[0], x = tileCenter(ex.tx), y = tileCenter(ex.ty), k = 1 - b.left / b.total;
      ground.roundRect(x - 22, y - 8, 44, 18, 3).fill({ color: 0x24190b, alpha: 0.85 }).stroke({ width: 1.5 * ink + 0.5, color: 0xb4741f, alpha: 0.95 });
      for (let i = 0; i < 4; i++) ground.moveTo(x - 20 + i * 12, y + 10).lineTo(x - 14 + i * 12, y - 8).stroke({ width: 1.2, color: 0xb4741f, alpha: 0.5 }); // 足場のしま
      ground.rect(x - 20, y + 12, 40 * k, 4).fill({ color: 0xffd166 }).rect(x - 20, y + 12, 40, 4).stroke({ width: 1, color: 0x000000, alpha: 0.7 });
      label.text = `発射台を作成中 あと${Math.ceil(b.left)}秒`; label.position.set(x, y - 12); label.scale.set(1 / Math.max(0.65, cam.zoom)); label.visible = true;
    }
    // 発射台
    const alive = new Set();
    for (const u of launchersOf(sim)) {
      alive.add(u.id);
      const v = viewOf(u), hv = r.views.get(u.id); if (hv) hv.c.visible = false; // renderer の代用のロボの絵は隠す
      const stt = u.launch, aim = stt.phase === 'aim', k = aim ? 1 - stt.left / LAUNCHER.aimSec : 0;
      v.c.position.set(u.x, u.y); v.c.zIndex = u.y; v.c.visible = true;
      if (st.tex && !v.art.visible) { v.art.texture = st.tex; v.art.visible = true; }
      const sc = ART_W / (st.tex?.orig.width || 256), f = u.facing || 1;
      v.art.scale.set(sc * f, sc);
      v.art.position.set(0, -4);
      v.art.rotation = f * -ease(Math.min(1, k * 1.5)) * 0.62 + (u.moving ? Math.sin(now * 14) * 0.03 : 0); // 構えるとミサイルが立つ
      v.art.tint = aim && Math.sin(now * 16) > 0.3 ? 0xffb080 : 0xffffff; // 構え中は点滅
      v.cart.alpha = 1;
      // HP バー
      const w = 26, y = u.y - 28, frac = Math.max(0, u.hp / u.maxHp);
      air.rect(u.x - w / 2, y, w, 3.4).fill({ color: 0x000000, alpha: 0.7 }).rect(u.x - w / 2, y, w * frac, 3.4).fill({ color: frac > 0.5 ? 0x4ade80 : frac > 0.25 ? 0xfacc15 : 0xef4444 });
      // 引いている線（ロボとの間）
      const t = stt.towId != null ? unitById(sim, stt.towId) : null;
      if (t) {
        const hx = t.x - (t.facing || 1) * 7, hy = t.y - 3, tx = u.x + (t.facing || 1) * 12, ty = u.y - 2;
        air.moveTo(hx, hy).lineTo(tx, ty).stroke({ width: 2.6 * ink + 0.6, color: 0x000000, alpha: 0.4, cap: 'round' });
        air.moveTo(hx, hy).lineTo(tx, ty).stroke({ width: 1.5 * ink + 0.4, color: 0xd9b36c, alpha: 1, cap: 'round' });
      }
      if (aim) { // 構えている間の着弾の印・撃つ線
        drawTarget(ground, stt.x, stt.y, now, 0, 0xff5555);
        ground.moveTo(u.x, u.y - 10).lineTo(stt.x, stt.y).stroke({ width: 1.4 * ink + 0.3, color: 0xff7777, alpha: 0.4 });
      }
      if (st.rangeId === u.id) { // 撃つ地点を選んでいる間: 届く距離の円（12 タイル）
        ground.circle(u.x, u.y, LAUNCHER.range).fill({ color: 0x7df9ff, alpha: 0.05 }).stroke({ width: 2.2 * ink + 0.6, color: 0x7df9ff, alpha: 0.85 });
      }
    }
    for (const [id, v] of views) if (!alive.has(id)) { v.c.destroy({ children: true }); views.delete(id); }
    // 飛んでいるミサイル・着弾の印
    for (const s of L.shots) {
      const k = 1 - s.left / s.total, H = Math.min(150, 20 + 0.45 * Math.hypot(s.x - s.x0, s.y - s.y0)), x = s.x0 + (s.x - s.x0) * k, arc = Math.sin(Math.PI * k) * H, y = s.y0 + (s.y - s.y0) * k - arc; // 山なりに飛ぶ（高さは距離に合わせる）
      drawTarget(ground, s.x, s.y, now, k, 0xff4444);
      // 内の輪が着弾に向けて縮んでいく（あと何秒かが分かる）
      ground.circle(s.x, s.y, LAUNCHER.radius * (1 - k) + 6).stroke({ width: 1.6, color: 0xffffff, alpha: 0.5 });
      // ミサイル（三角と炎。進む向き）
      const nx = s.x0 + (s.x - s.x0) * Math.min(1, k + 0.02), ny = s.y0 + (s.y - s.y0) * Math.min(1, k + 0.02) - Math.sin(Math.PI * Math.min(1, k + 0.02)) * H;
      const ang = Math.atan2(ny - y, nx - x), ca = Math.cos(ang), sa = Math.sin(ang), P = (a, b) => [x + a * ca - b * sa, y + a * sa + b * ca];
      const [n0, n1] = P(9, 0), [l0, l1] = P(-6, -3.2), [r0, r1] = P(-6, 3.2), [f0, f1] = P(-15 - 3 * Math.sin(now * 40), 0), [m0, m1] = P(-6, 0);
      air.poly([m0, m1, P(-6, -2)[0], P(-6, -2)[1], f0, f1, P(-6, 2)[0], P(-6, 2)[1]]).fill({ color: 0xffa23a, alpha: 0.9 });
      air.poly([n0, n1, l0, l1, r0, r1]).fill({ color: 0xe5e7eb }).stroke({ width: 1, color: 0x222222 });
      air.circle(n0, n1, 2).fill({ color: 0xef4444 });
      ground.ellipse(x, y + arc, 6, 2.4).fill({ color: 0x000000, alpha: 0.28 }); // 地面の影（高いほど離れる）
    }
    // 撃つ地点の仮の印（タップした所。まだ撃っていない）
    if (st.preview) {
      drawTarget(ground, st.preview.x, st.preview.y, now, 0, 0xffd166);
      const l = st.rangeId != null ? unitById(sim, st.rangeId) : null;
      if (l) ground.moveTo(l.x, l.y - 10).lineTo(st.preview.x, st.preview.y).stroke({ width: 1.4 * ink + 0.3, color: 0xffd166, alpha: 0.55 });
    }
    // 爆発の衝撃の輪
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i], a = (real - g.t) / 0.7;
      if (a >= 1) { rings.splice(i, 1); continue; }
      const rad = LAUNCHER.radius * (0.2 + 0.9 * ease(a));
      air.circle(g.x, g.y, rad).fill({ color: 0xffb04a, alpha: 0.28 * (1 - a) }).stroke({ width: 3.5 * (1 - a) + 0.5, color: 0xfff1c9, alpha: 0.9 * (1 - a) });
    }
  }

  return {
    sync,
    /** 撃つ地点を選んでいる間、この発射台の「届く距離」の円を出す（null で消す） */
    setRange(id) { st.rangeId = id; },
    /** タップした地点の仮の印（null で消す） */
    setPreview(p) { st.preview = p ? { x: p.x, y: p.y } : null; },
    destroy() {
      st.dead = true;
      try { if (!root.destroyed) { root.parent?.removeChild(root); root.destroy({ children: true }); } } catch { /* 描画ごと捨てられた後 */ }
      try { if (st.tex) { st.tex.destroy(true); st.tex = null; } } catch { /* 同上 */ }
      views.clear();
    },
  };
}
