// 遮蔽物（木・建物の残骸）と落とし物の見た目。sim.cover / sim.items を読むだけ。
// 絵は Codex の絵を小さくしたもの（assets/landmarks/。tools/import-landmarks.py で作り直せる）。
// 傷んだ（HP 50% 以下）・壊れた（HP 0）は Codex の状態別の絵（<id>_damaged / <id>_destroyed。元の絵と同じ位置合わせ）に差し替える。
// その絵が読めなかったときだけ、その場で作る: 傷んだ＝暗く＋ひび、壊れた＝低くつぶして瓦礫の山（土けむりはどちらでも出す）。
// 落とし物は Codex のアイコン（assets/landmarks/icons/）を、暗い丸の台＋細い明るい縁にのせて、画面で約 22px に描く。
import { Container, Sprite, Graphics, Texture, Text } from '../../vendor/pixi-8.22.0.min.mjs?v=7';
import { PICKUP } from '../sim/cover.js?v=6';
import { weaponById } from '../sim/weapons.js?v=5';
// v0.4.0-dev（10/24）: 武器パーツの見た目をやめて、落ちた武器の種類ごとの絵＋名前を出す。
// v0.4.0-dev（10/24 朝）: 状態別の絵と落とし物アイコン（Codex）に切りかえ。前の手描き・その場の効果は読めないときの代わり。

const BASE_TINT = 0xd9d6cc;        // 地面の色味（少し暗い）に合わせる
const DAMAGED_TINT = 0x9c9288;
const RUBBLE_TINT = 0x6f665d;
const RUBBLE_SY = 0.3, RUBBLE_SX = 0.9; // 瓦礫の山: 元の絵をこの割合までつぶす
const ITEM_RIM = { repair: 0xc8f7d4, weapon: 0xffe6bf }; // アイコンの台の細い縁（明るめ）
const BADGE_R = 12, ICON_W = 22;  // 台の半径・アイコンの幅（ワールド px。zoom 1 の画面で約 23px）
/** 落ちた物 → アイコン名。武器は種類で: 銃 / 筒 / 刃（近接） / 爆弾（投げる）。ほかは銃 */
export function pickupIconName(it, weapon) {
  if (it.type === 'repair') return 'repair-kit';
  const t = weapon?.type;
  return t === 'cannon' ? 'cannon' : (t === 'melee' || t === 'blade') ? 'blade' : t === 'throw' ? 'grenade' : 'gun';
}
const NAME_STYLE = { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: 11, fill: 0xffe0a8, stroke: { color: 0x121418, width: 3 } };

/** 武器の種類ごとの小さな絵（銃・筒・刃・爆弾）。中心は (0, -3) あたり */
function drawWeaponIcon(icon, type) {
  const ink = { width: 1.5, color: 0x121418 };
  if (type === 'cannon') { // 筒（ロケット・大砲）
    icon.roundRect(-10, -7, 18, 7, 3).fill({ color: 0x7b8794 }).stroke(ink);
    icon.rect(6, -8.5, 4, 10).fill({ color: 0x4b5563 }).stroke({ width: 1.2, color: 0x121418 });
    icon.rect(-4, 0, 3, 4).fill({ color: 0x4b5563 });
    icon.circle(-10, -3.5, 1.6).fill({ color: 0xffb347 });
  } else if (type === 'melee') { // 刃（ハンマー・剣）
    icon.poly([-1.5, 4, 1.5, 4, 1.5, -6, -1.5, -6]).fill({ color: 0x8b5a2b }).stroke({ width: 1.2, color: 0x121418 });
    icon.roundRect(-7, -12, 14, 7, 1.5).fill({ color: 0xb0b6bf }).stroke(ink);
  } else if (type === 'throw') { // 爆弾
    icon.circle(0, -2, 6.5).fill({ color: 0x3b3f46 }).stroke(ink);
    icon.rect(-2, -11, 4, 3.5).fill({ color: 0x7b8794 });
    icon.circle(3, -12.5, 1.8).fill({ color: 0xffb347 });
  } else { // 銃
    icon.roundRect(-11, -7, 20, 5, 1.5).fill({ color: 0x7b8794 }).stroke(ink);
    icon.poly([-6, -2.5, -1, -2.5, -3, 4, -7.5, 4]).fill({ color: 0x4b5563 }).stroke({ width: 1.2, color: 0x121418 });
    icon.rect(9, -6, 3, 3).fill({ color: 0xffb347 });
  }
}

async function loadTex(url) {
  const img = new Image(); img.src = url; await img.decode();
  const tex = Texture.from(img, true); tex.source.scaleMode = 'linear'; tex.source.autoGenerateMipmaps = true;
  return tex;
}

/** assets/landmarks/landmarks.json と絵を読む → { id: { tex, meta, states: { damaged?, destroyed? } }, _icons: { name: tex } }。
 *  1枚ずつ読む。元の絵が読めない遮蔽物は仮の楕円、状態別の絵が読めなければその場の効果、アイコンが読めなければ手描きの絵で出す */
export async function loadLandmarks() {
  const out = { _icons: {} };
  try {
    const base = new URL('../../assets/landmarks/', import.meta.url);
    const res = await fetch(new URL('landmarks.json', base));
    if (!res.ok) throw new Error(`landmarks.json ${res.status}`);
    const meta = await res.json();
    const warn = (what, e) => console.warn(`[bot-commander] ${what} を読めない（代わりの見た目で出す）`, e);
    const jobs = [];
    for (const [id, m] of Object.entries(meta)) {
      if (id.startsWith('_')) continue;
      jobs.push((async () => {
        try { out[id] = { tex: await loadTex(new URL(m.file, base).href), meta: m, states: {} }; } catch (e) { warn(m.file, e); return; }
        await Promise.all(Object.entries(m.states || {}).map(async ([st, sm]) => {
          try { out[id].states[st] = { tex: await loadTex(new URL(sm.file, base).href), meta: sm }; } catch (e) { warn(sm.file, e); }
        }));
      })());
    }
    for (const [name, im] of Object.entries(meta._icons || {})) {
      jobs.push(loadTex(new URL(im.file, base).href).then(t => { out._icons[name] = t; }, e => warn(im.file, e)));
    }
    await Promise.all(jobs);
  } catch (e) { console.warn('[bot-commander] 遮蔽物の絵を読めない（仮の形で出す）', e); }
  return out;
}

// id ごとに決まった乱数（見た目だけ。sim の乱数は使わない）
function hashRng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function stateSprite(st) {
  const s = new Sprite(st.tex); s.anchor.set(st.meta.anchor[0], st.meta.anchor[1]);
  s.k = st.meta.worldW / st.tex.width; s.scale.set(s.k); s.tint = BASE_TINT; s.visible = false;
  return s;
}

export function createCoverView(sim, units, art) {
  const views = [];
  const icons = art._icons || {};
  for (const c of sim.cover) {
    const root = new Container();
    root.position.set(c.x, c.y); root.zIndex = c.y; // 足元の y で機体と並べる
    const a = c.art && art[c.art];
    let body, mask = null, cracks = null, k = 1, w, h, ax, ay;
    const alt = { damaged: null, destroyed: null }; // 状態別の絵（読めたものだけ）
    if (a) {
      body = new Sprite(a.tex); [ax, ay] = a.meta.anchor; body.anchor.set(ax, ay);
      k = a.meta.worldW / a.tex.width; body.scale.set(k); w = a.tex.width; h = a.tex.height;
      for (const st of ['damaged', 'destroyed']) if (a.states?.[st]) alt[st] = stateSprite(a.states[st]);
      if (!alt.damaged || !alt.destroyed) { // どちらかの絵がない → その場の効果（ひび・焦げ）を用意しておく
        mask = new Sprite(a.tex); mask.anchor.set(ax, ay); mask.scale.set(k);
        cracks = new Graphics(); cracks.scale.set(k); cracks.mask = mask; cracks.visible = false;
        // ひび: 絵の真ん中あたりに、ぎざぎざの線（id ごとに同じ形）
        const r = hashRng(c.id + 11), n = c.kind === 'tree' ? 3 : 7;
        for (let i = 0; i < n; i++) {
          let x = (0.2 + 0.6 * r()) * w - ax * w, y = (0.25 + 0.55 * r()) * h - ay * h;
          cracks.moveTo(x, y);
          const steps = 3 + Math.floor(r() * 3), dir = r() * Math.PI * 2;
          for (let j = 0; j < steps; j++) { x += Math.cos(dir + (r() - 0.5) * 1.6) * w * 0.07; y += Math.sin(dir + (r() - 0.5) * 1.6) * h * 0.08; cracks.lineTo(x, y); }
        }
        cracks.stroke({ width: Math.max(2, w / 110), color: 0x15110e, alpha: 0.85, join: 'round' });
        // 焦げ跡
        for (let i = 0; i < (c.kind === 'tree' ? 1 : 3); i++) cracks.ellipse((0.25 + 0.5 * r()) * w - ax * w, (0.3 + 0.5 * r()) * h - ay * h, w * (0.05 + 0.05 * r()), h * (0.04 + 0.04 * r())).fill({ color: 0x0d0b0a, alpha: 0.35 });
      }
    } else {
      // 絵がないとき: 足場の楕円の上に、仮の箱
      body = new Graphics().ellipse(0, -c.ry, c.rx, c.ry).fill({ color: 0x6b6258 }).stroke({ width: 2, color: 0x231b1d });
      w = c.rx * 2; h = c.ry * 2;
    }
    body.tint = BASE_TINT;
    const shadow = new Graphics().ellipse(0, -c.ry * 0.4, c.rx * 0.95, c.ry * 0.7).fill({ color: 0x000000, alpha: 0.18 });
    const rubble = new Graphics(); rubble.visible = false;
    if (!alt.destroyed) { // 瓦礫の山（壊れた絵がないとき）: 足場の楕円の中に石を散らす
      const r = hashRng(c.id + 101), n = c.kind === 'tree' ? 10 : 34;
      const cols = c.kind === 'tree' ? [0x3b2d22, 0x4a3a2b, 0x2b211a] : [0x5d5750, 0x6e665d, 0x4a443e, 0x7a6a58];
      for (let i = 0; i < n; i++) {
        const ang = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.85;
        const x = Math.cos(ang) * c.rx * rr, y = -c.ry + Math.sin(ang) * c.ry * rr, s = (c.kind === 'tree' ? 3 : 4) + r() * (c.kind === 'tree' ? 4 : 9);
        rubble.poly([x - s, y + s * 0.3, x - s * 0.3, y - s * 0.7, x + s * 0.8, y - s * 0.4, x + s, y + s * 0.4]).fill({ color: cols[i % cols.length] }).stroke({ width: 1, color: 0x1a1512, alpha: 0.6 });
      }
    }
    root.addChild(shadow, body);
    for (const s of [alt.damaged, alt.destroyed]) if (s) root.addChild(s);
    if (mask) root.addChild(mask, cracks);
    root.addChild(rubble);
    units.addChild(root);
    views.push({ c, root, body, alt, cur: body, cracks, rubble, shadow, k, w: (a ? a.meta.worldW : w), h: (a ? h * k : h), state: null, jolt: -1, broke: -1 });
  }

  const itemViews = new Map();
  function itemView(it) {
    let g = itemViews.get(it.id);
    if (g) return g;
    g = new Container();
    const w = it.type === 'weapon' ? weaponById(it.weapon) : null;
    const shadow = new Graphics().ellipse(0, 0, 9, 3.5).fill({ color: 0x000000, alpha: 0.32 });
    const badge = new Container(); // 浮き沈みする部分（台＋絵＋名前）。画面での大きさをそろえるため、zoom で拡大縮小する
    const tex = icons[pickupIconName(it, w)];
    // 暗い丸の台（ふち はぼかし気味に2重）＋細い明るい縁: 地面の色が何でも、銃や刃の細い形が見えるように
    const back = new Graphics()
      .circle(0, 0, BADGE_R + 2.5).fill({ color: 0x0b0d10, alpha: 0.22 })
      .circle(0, 0, BADGE_R).fill({ color: 0x14171c, alpha: 0.72 });
    const rim = new Graphics().circle(0, 0, BADGE_R - 0.4).stroke({ width: 1.2, color: ITEM_RIM[it.type] || 0xffffff, alpha: 0.95 });
    let icon;
    if (tex) {
      icon = new Sprite(tex); icon.anchor.set(0.5); icon.scale.set(ICON_W / tex.width);
    } else { // アイコンが読めないとき: 前の手描きの絵
      icon = new Graphics();
      if (it.type === 'repair') { // 修理キット: 白い箱に緑の十字
        icon.roundRect(-8, -8, 16, 13, 2.5).fill({ color: 0xf4f1ea }).stroke({ width: 1.6, color: 0x121418 });
        icon.rect(-1.8, -6.5, 3.6, 10).fill({ color: 0x22c55e }); icon.rect(-5, -3.3, 10, 3.6).fill({ color: 0x22c55e });
        icon.rect(-3, -10, 6, 2.2).fill({ color: 0x121418 });
      } else drawWeaponIcon(icon, w?.type);
      icon.scale.set(0.85); icon.y = 2;
    }
    badge.addChild(back, rim, icon);
    g.addChild(shadow, badge); g.badge = badge; g.rim = rim; g.icon = icon;
    if (it.type === 'weapon') { // 名前（どの武器が落ちたか見てわかるように）
      const label = new Text({ text: w ? w.name : '武器', style: NAME_STYLE }); label.anchor.set(0.5, 1); label.y = -BADGE_R - 3;
      badge.addChild(label); g.label = label;
    }
    units.addChild(g); itemViews.set(it.id, g);
    return g;
  }

  const seen = new WeakSet(), dust = [];
  function sync(now, layer, zoom = 1) {
    for (const f of sim.fx) {
      if (seen.has(f)) continue;
      if (f.type === 'coverHit') { seen.add(f); const v = views[f.id]; if (v) v.jolt = now; }
      else if (f.type === 'coverBreak') {
        seen.add(f); const v = views[f.id]; if (v) v.broke = now;
        const r = hashRng(f.id * 7 + 3), n = f.kind === 'tree' ? 8 : 18;
        for (let i = 0; i < n; i++) { const ang = r() * Math.PI * 2, rr = Math.sqrt(r()); dust.push({ x: f.cx + Math.cos(ang) * f.rx * rr, y: f.cy + Math.sin(ang) * f.ry * rr, t: now + r() * 0.25, r: 10 + r() * (f.kind === 'tree' ? 10 : 24), vx: (r() - 0.5) * 30, life: 1.2 + r() * 0.8 }); }
      }
    }
    // 機体が後ろに隠れていたら建物を透かす（奥なら強く、遮蔽物の中にいるなら少し）
    for (const v of views) {
      const c = v.c, seenTile = sim.fog.isSeen(Math.floor(c.x / 32), Math.floor(c.y / 32));
      v.root.visible = seenTile;
      if (!seenTile) continue;
      const rub = c.state === 'rubble';
      const img = rub ? v.alt.destroyed : c.state === 'damaged' ? v.alt.damaged : null;
      if (v.state !== c.state) {
        v.state = c.state;
        const next = img || v.body, alpha = v.cur.alpha;
        for (const s of [v.body, v.alt.damaged, v.alt.destroyed]) if (s) s.visible = s === next;
        next.alpha = alpha; v.cur = next;
        v.body.tint = img ? BASE_TINT : rub ? RUBBLE_TINT : c.state === 'damaged' ? DAMAGED_TINT : BASE_TINT;
        if (v.cracks) v.cracks.visible = !img && c.state !== 'intact';
        v.rubble.visible = rub && !v.alt.destroyed; v.shadow.visible = !rub;
      }
      // 壊れた絵がないときだけ: 0.35 秒でつぶれる
      const bt = img || !rub ? 0 : v.broke >= 0 ? Math.min(1, (now - v.broke) / 0.35) : 1;
      const sy = 1 - (1 - RUBBLE_SY) * bt, sx = 1 - (1 - RUBBLE_SX) * bt;
      const jt = now - v.jolt, j = v.jolt >= 0 && jt < 0.18 ? Math.sin(jt * 90) * (1 - jt / 0.18) * (c.kind === 'tree' ? 2.5 : 1.5) : 0;
      if (img) { img.x = j; }
      else for (const s of [v.body, v.cracks, v.cracks?.mask]) if (s) { s.scale.set(v.k * sx, v.k * sy); s.x = j; }
      let behind = 0; // 0: 誰もいない / 1: 遮蔽物の中（足場）にいる / 2: 奥に隠れている
      if (!rub) for (const u of sim.units) {
        if (u.y < c.y - 4 && u.y > c.y - v.h * 0.95 && Math.abs(u.x - c.x) < v.w * 0.45 && (u.side === 'ally' || sim.fog.isVisible(Math.floor(u.x / 32), Math.floor(u.y / 32)))) { behind = Math.max(behind, u.y < c.cy - c.ry * 0.5 ? 2 : 1); if (behind === 2) break; }
      }
      const want = behind === 2 ? 0.5 : behind === 1 ? 0.72 : 1;
      v.cur.alpha += (want - v.cur.alpha) * 0.2; if (v.cracks) v.cracks.alpha = v.cur.alpha;
    }
    // 落とし物: 画面で約 22px（zoom 1.2 より寄ると、そのぶん大きく見える）
    const bs = 0.95 / Math.min(1.2, Math.max(0.5, zoom));
    const live = new Set();
    for (const it of sim.items) {
      live.add(it.id);
      const g = itemView(it), age = sim.time - it.t, left = PICKUP.life - age;
      g.position.set(it.x, it.y); g.zIndex = it.y + 1;
      const pop = Math.min(1, age / 0.25);
      g.badge.scale.set(bs * (0.6 + 0.4 * pop));
      g.badge.y = -(BADGE_R + 3) * bs - Math.abs(Math.sin(now * 3 + it.id)) * 3 - (1 - pop) * 14;
      g.rim.alpha = 0.65 + 0.35 * Math.sin(now * 5 + it.id);
      g.visible = left > 8 || Math.sin(now * 14) > -0.3; // 消える前に点滅
    }
    for (const [id, g] of itemViews) if (!live.has(id)) { g.destroy({ children: true }); itemViews.delete(id); }
    // 土けむり
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i], age = now - d.t;
      if (age > d.life) { dust.splice(i, 1); continue; }
      if (age < 0) continue;
      const p = age / d.life, a = 0.55 * (1 - p) * Math.min(1, age * 8);
      layer.circle(d.x + d.vx * age, d.y - 6 - 28 * p, d.r * (0.6 + 0.9 * p)).fill({ color: 0xa8957c, alpha: a });
    }
    // 拾った武器に持ちかえた機体: 足元に細い橙の輪（どの機体が強くなったかわかるように）
    for (const u of sim.units) if (u.weapon && u.hp > 0 && u.captured == null) layer.ellipse(u.x, u.y, 12, 5).stroke({ width: 1.2, color: 0xffb347, alpha: 0.45 });
  }
  return { sync, views, itemViews };
}
