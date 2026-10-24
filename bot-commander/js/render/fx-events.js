// fx-events.js — sim の出来事（shot / boom）を演出 fx.js に渡す。どの演出・ゆれ・止めを出すかはここで決める。
// Pixi・DOM を使わない（tests/fx.test.mjs から直接呼ぶ）。
import { weaponInfo, weaponInfoById } from '../sim/sim.js?v=13';
// v0.4.0-dev（10/24）: 拾った武器を持っている機体の弾は、その武器の演出（shot の weapon）
// v0.4.0-dev: 遮蔽物に止められた弾（shot の cover）は遮蔽物に当たる演出、壊れた（coverBreak）は破片とけむり

export const FX_MAX = { normal: 1200, low: 600 }; // 演出の粒の上限
export const FX_SHAKE_MAX = 6;  // 画面のゆれの上限（画面 px）
export const FX_STOP_W = 0.6;   // 止め（hit-stop）はこの重さ以上の一撃だけ。味方が撃った・味方が撃たれた・画面の中、のときだけ
export const FX_MARGIN = 120;          // 画面の外この px までは演出を出す（それより外は出さない）

/**
 * sim.fx の出来事 → 演出。1つの出来事は1回だけ（seen）。Pixi なしで動く（テストで直接呼ぶ）。
 * view: { onScreen(x,y) → 0..1（画面の中は 1、外へ FX_MARGIN 離れると 0）, visible(x,y) → 霧の外か, px(kind) → 体の大きさ }
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
      if (f.toKind === 'boy' || f.toKind === 'girl') { fx.hit('human', x1, y1, { w: wi.w, gate, dir: Math.atan2(y1 - y0, x1 - x0) }); continue; }
      fx.fromWeapon(wi.row, x0, y0, x1, y1, { surface: f.cover != null ? 'armor' : f.toKind === 'alien' ? 'flesh' : 'armor', medium: 'land', s: 1, gy: tFoot, gate });
    } else if (f.type === 'coverBreak') {
      if (!view.visible(f.x, f.y) && !view.visible(f.cx, f.cy)) continue;
      const near = view.onScreen(f.cx, f.cy); if (near <= 0) continue;
      const big = f.kind === 'tree' ? 0.5 : f.kind === 'highrise' ? 1 : 0.8;
      fx.hit('heavy', f.cx, f.cy - 10, { w: big, surface: 'armor', medium: 'land', gy: f.cy, gate: { shake: near * big, stop: false } });
    } else if (f.type === 'boom') {
      if (f.side === 'enemy' && !view.visible(f.x, f.y)) continue;
      const near = view.onScreen(f.x, f.y); if (near <= 0) continue;
      const gate = { shake: near, stop: near >= 0.5 }; // 撃破は味方か、味方の狙った相手
      const px = view.px(f.kind), y = f.y - px * 0.45;
      if (f.human) fx.hit('human', f.x, y, { w: 0.5, gate });
      else if (f.kind === 'alien') fx.hit('enemyDeath', f.x, y, { gy: f.y, big: 1.3, gate });
      else fx.hit('robotDeath', f.x, y, { gy: f.y, big: f.kind === 'giant' ? 2 : 1, medium: 'land', gate });
    }
  }
}
