// fx-events.js — sim の出来事（shot / boom）を演出 fx.js に渡す。どの演出・ゆれ・止めを出すかはここで決める。
// Pixi・DOM を使わない（tests/fx.test.mjs から直接呼ぶ）。
import { weaponInfo, weaponInfoById } from '../sim/sim.js?v=30';
import { isNewEnemy } from '../sim/new-enemies.js?v=2'; // 新しい敵（?newenemies=1）は異星生物と同じ「肉」の当たり・やられ方
// v0.4.0-dev（10/24）: 拾った武器を持っている機体の弾は、その武器の演出（shot の weapon）
// v0.4.4: シールドが受けた弾（shot の shield）は青いバリアの光（surface 'barrier'）
// v0.4.0-dev: 遮蔽物に止められた弾（shot の cover）は遮蔽物に当たる演出、壊れた（coverBreak）は破片とけむり

export const FX_MAX = { normal: 1200, low: 600 }; // 演出の粒の上限
export const FX_SHAKE_MAX = 6;  // 画面のゆれの上限（画面 px）
export const FX_STOP_W = 0.6;   // 止め（hit-stop）はこの重さ以上の一撃だけ。味方が撃った・味方が撃たれた・画面の中、のときだけ
export const FX_MARGIN = 120;          // 画面の外この px までは演出を出す（それより外は出さない）
// v1.0.1 Codex gfx4 ALT_MOTION: 水陸両用機の魚雷（W3-12）は、view.torpedo があれば水の中を進む魚雷の絵と航跡（renderer.js）を出し、着いた時に水の爆発。
//   view.torpedo(x0,y0,x1,y1) → 進む秒数（0 なら出せなかった → いつもの演出）。view.torpedo が無い時（テスト）は今までどおり
export const TORPEDO_WEAPON = 'W3-12';
// v1.0.2: 物語のミサイルが落ちた時、まわりに重ねる爆発の数
export const STRIKE_BURSTS = 5;

/**
 * sim.fx の出来事 → 演出。1つの出来事は1回だけ（seen）。Pixi なしで動く（テストで直接呼ぶ）。
 * view: { onScreen(x,y) → 0..1（画面の中は 1、外へ FX_MARGIN 離れると 0）, visible(x,y) → 霧の外か, px(kind) → 体の大きさ, torpedo?(x0,y0,x1,y1) → 秒 }
 */
export function spawnFxEvents(fx, sim, seen, view) {
  for (const f of sim.fx) {
    if (seen.has(f)) continue;
    seen.add(f);
    if (f.type === 'shot') {
      const wi = (f.weapon && weaponInfoById(f.weapon)) || weaponInfo(f.kind); if (!wi) continue;
      const tFoot = f.y2 + 8, sFoot = f.y1 + 10, tpx = view.px(f.toKind), spx = view.px(f.kind);
      const ally = f.side === 'ally' || f.toSide === 'ally';
      if (!ally && !view.visible(f.x2, tFoot) && !view.visible(f.x1, sFoot)) continue;
      const near = Math.max(view.onScreen(f.x2, tFoot), view.onScreen(f.x1, sFoot));
      if (near <= 0) continue;
      const gate = { shake: near, stop: ally && near >= 0.5 && wi.w >= FX_STOP_W };
      const face = f.x2 >= f.x1 ? 1 : -1;
      const x0 = f.x1 + face * spx * 0.3, y0 = sFoot - spx * 0.5, x1 = f.x2, y1 = tFoot - tpx * 0.45;
      if (f.shield) { // 盾が受けた: いつもの着弾の代わりに、相手の手前に小さな青いバリアの光（体は隠さない）
        fx.hit('barrier', x1 - face * tpx * 0.3, y1, { w: Math.min(0.3, wi.w), surface: 'barrier', medium: 'land', gy: tFoot, gate: { shake: near * 0.4, stop: false } });
        continue;
      }
      if (f.weapon === TORPEDO_WEAPON && view.torpedo) {
        const dur = view.torpedo(f.x1, sFoot, f.x2, tFoot);
        if (dur > 0) {
          const hx = f.x2, hy = tFoot - tpx * 0.15;
          fx.after(dur, () => fx.hit(wi.kind, hx, hy, { w: wi.w, variant: wi.variant, surface: 'water', medium: 'water', gy: tFoot, gate }));
          continue;
        }
      }
      if (f.toKind === 'boy' || f.toKind === 'girl') { fx.hit('human', x1, y1, { w: wi.w, gate, dir: Math.atan2(y1 - y0, x1 - x0) }); continue; }
      fx.fromWeapon(wi.row, x0, y0, x1, y1, { surface: f.cover != null ? 'armor' : f.toKind === 'alien' || isNewEnemy(f.toKind) ? 'flesh' : 'armor', medium: 'land', s: 1, gy: tFoot, gate });
    } else if (f.type === 'coverBreak') {
      if (!view.visible(f.x, f.y) && !view.visible(f.cx, f.cy)) continue;
      const near = view.onScreen(f.cx, f.cy); if (near <= 0) continue;
      const big = f.kind === 'tree' ? 0.5 : f.kind === 'highrise' ? 1 : 0.8;
      fx.hit('heavy', f.cx, f.cy - 10, { w: big, surface: 'armor', medium: 'land', gy: f.cy, gate: { shake: near * big, stop: false } });
    } else if (f.type === 'strikeLaunch') { // v1.0.2 物語: ミサイルが飛び立つ（発射台の所で火と煙）
      const near = view.onScreen(f.x, f.y); if (near <= 0) continue;
      fx.hit('heavy', f.x, f.y - 12, { w: 0.6, surface: 'armor', medium: 'land', gy: f.y, gate: { shake: near * 0.6, stop: false } });
    } else if (f.type === 'strikeHit') { // v1.0.2 物語: ミサイルが落ちた（大きな爆発をいくつか重ねる。敵だけに当たる）
      const near = Math.max(0.35, view.onScreen(f.x, f.y));
      fx.hit('explosion', f.x, f.y - 10, { w: 1, variant: 'missile', surface: 'ground', medium: 'land', gy: f.y, gate: { shake: near, stop: near >= 0.5 } });
      const r = (f.r || 96) * 0.5;
      for (let i = 0; i < STRIKE_BURSTS; i++) {
        const a = i / STRIKE_BURSTS * Math.PI * 2 + 0.4, x = f.x + Math.cos(a) * r, y = f.y + Math.sin(a) * r * 0.6;
        fx.after(0.08 * (i + 1), () => fx.hit('explosion', x, y - 8, { w: 0.7, variant: 'rocket', surface: 'ground', medium: 'land', gy: y, gate: { shake: near * 0.5, stop: false } }));
      }
    } else if (f.type === 'neBlast') { // 新しい敵: G06 の自爆・G10 の地雷（範囲 r の爆発）
      if (!view.visible(f.x, f.y)) continue;
      const near = Math.max(0.3, view.onScreen(f.x, f.y)); if (view.onScreen(f.x, f.y) <= 0) continue;
      fx.hit('explosion', f.x, f.y - 8, { w: 0.8, variant: 'rocket', surface: 'ground', medium: 'land', gy: f.y, gate: { shake: near * 0.6, stop: false } });
    } else if (f.type === 'neSplash') { // 新しい敵: 範囲ダメージ（G04・G07・A01）の小さな爆発
      if (!view.visible(f.x, f.y)) continue;
      const near = Math.max(0.3, view.onScreen(f.x, f.y)); if (view.onScreen(f.x, f.y) <= 0) continue;
      fx.hit('explosion', f.x, f.y - 8, { w: 0.45, variant: 'rocket', surface: 'ground', medium: 'land', gy: f.y, gate: { shake: near * 0.25, stop: false } });
    } else if (f.type === 'launcherLost') { // v1.0.2 物語: 撃つ前に発射台を壊された
      const near = view.onScreen(f.x, f.y); if (near <= 0) continue;
      fx.hit('heavy', f.x, f.y - 10, { w: 0.5, surface: 'armor', medium: 'land', gy: f.y, gate: { shake: near * 0.5, stop: false } });
    } else if (f.type === 'boom') {
      if (f.kind === 'launcher') continue; // 発射台は launcherLost で出す（ロボの倒れる演出にしない）
      if (f.side === 'enemy' && !view.visible(f.x, f.y)) continue;
      const near = view.onScreen(f.x, f.y); if (near <= 0) continue;
      const gate = { shake: near, stop: near >= 0.5 }; // 撃破は味方か、味方の狙った相手
      const px = view.px(f.kind), y = f.y - px * 0.45;
      if (f.human) fx.hit('human', f.x, y, { w: 0.5, gate });
      else if (f.kind === 'alien' || isNewEnemy(f.kind)) fx.hit('enemyDeath', f.x, y, { gy: f.y, big: 1.3, gate });
      else fx.hit('robotDeath', f.x, y, { gy: f.y, big: f.kind === 'giant' ? 2 : 1, medium: 'land', gate });
    }
  }
}
