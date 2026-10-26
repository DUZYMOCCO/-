// strike-view.js — 物語の最初のミッション（v1.0.2）の見た目: 発射台の仮の絵・ロープ・着弾マーカー・飛んでいくミサイル・爆風の輪・調べる場所の輪。
// 絵の素材はまだ無いので、すべてコードで描く（仮）。sim.strike が無い時は何もしない（ふつうのミッションの見た目は変わらない）。
import { TILE, tileCenter } from '../sim/map.js?v=6';
import { STRIKE, SURVEY, launcherOf, nejiOf } from '../sim/strike.js?v=1';

/** 発射台の仮の絵（台車＋斜めの筒＋ミサイル）。canvas を返す（renderer が Texture にする） */
export function drawLauncherCanvas(size = 96) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const g = c.getContext('2d'), s = size / 96;
  g.scale(s, s);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // 台車
  g.fillStyle = '#3d4a3f'; g.strokeStyle = '#121418'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(14, 58, 66, 16, 4); g.fill(); g.stroke();
  for (const x of [26, 48, 70]) { g.fillStyle = '#1f2326'; g.beginPath(); g.arc(x, 78, 8, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#6b7280'; g.beginPath(); g.arc(x, 78, 3, 0, Math.PI * 2); g.fill(); }
  // さびた筒（斜め）
  g.save(); g.translate(46, 58); g.rotate(-0.62);
  g.fillStyle = '#7a5a3a'; g.beginPath(); g.roundRect(-6, -9, 52, 18, 4); g.fill(); g.stroke();
  g.fillStyle = '#a3794e'; g.fillRect(2, -9, 6, 18); g.fillRect(28, -9, 6, 18);
  // ミサイルの頭（赤）
  g.fillStyle = '#d94a3d'; g.beginPath(); g.moveTo(46, -7); g.lineTo(58, 0); g.lineTo(46, 7); g.closePath(); g.fill(); g.stroke();
  g.restore();
  // 支え
  g.strokeStyle = '#121418'; g.lineWidth = 3; g.beginPath(); g.moveTo(30, 60); g.lineTo(52, 34); g.stroke();
  g.strokeStyle = '#f5c542'; g.lineWidth = 2; g.beginPath(); g.moveTo(18, 66); g.lineTo(76, 66); g.stroke(); // 黄色の帯
  return c;
}
export const LAUNCHER_PX = 44;

/** 着弾までの残り（0..1）。arming と flying をまとめて 1 本のカウントダウンにする */
export function strikeCountdown(S) {
  if (!S) return null;
  const total = STRIKE.setupSec + STRIKE.flightSec;
  if (S.phase === 'arming') return Math.max(0, 1 - S.armT / total);
  if (S.phase === 'flying') return Math.max(0, 1 - (STRIKE.setupSec + S.flightT) / total);
  return null;
}

/** 飛んでいるミサイルの位置（from → target の放物線。k は 0..1）。高さ h は画面の上方向 */
export function missilePos(S, k) {
  const a = S.from, b = S.target, d = Math.hypot(b.x - a.x, b.y - a.y), h = Math.max(80, d * 0.45);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * h, ang: Math.atan2((b.y - a.y) - Math.cos(Math.PI * k) * Math.PI * h, b.x - a.x) };
}

/**
 * 毎フレーム呼ぶ。g は markLayer（Graphics。毎フレーム clear される）。ui.aim = { x, y } は狙いを決めている途中の点（index 側で入れる）
 */
export function drawStrike(g, sim, cam, now, ui) {
  const S = sim.strike; if (!S) return;
  const ink = 1 / Math.max(1, cam.zoom), l = launcherOf(sim), n = nejiOf(sim);
  // 調べる場所（設計図のありか）: 青い輪と、進み具合の弧。敵が近い時は赤
  const sv = S.survey, sx = tileCenter(sv.tx), sy = tileCenter(sv.ty);
  if (!sv.done && sim.fog.isSeen(sv.tx, sv.ty)) {
    const col = sv.blocked ? 0xef4444 : 0x7dd3fc, R = SURVEY.gatherRadius * TILE, p = 1 - sv.amount / sv.max;
    g.circle(sx, sy, R).fill({ color: col, alpha: 0.08 }).stroke({ width: 2.5 * ink, color: col, alpha: 0.75 });
    if (p > 0) { g.moveTo(sx, sy - R - 6 * ink); g.arc(sx, sy, R + 6 * ink, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke({ width: 4 * ink, color: 0x7dd3fc, alpha: 0.95 }); }
    const k = (now * 0.6) % 1;
    g.circle(sx, sy, R * (0.35 + 0.65 * k)).stroke({ width: 1.5 * ink, color: col, alpha: 0.5 * (1 - k) });
    // 「？」の代わりの小さなひし形
    g.moveTo(sx, sy - 10).lineTo(sx + 7, sy).lineTo(sx, sy + 10).lineTo(sx - 7, sy).closePath().fill({ color: col, alpha: 0.9 }).stroke({ width: 1.5 * ink, color: 0x121418 });
  }
  // ロープ（ひっぱっている時・つないでいる途中）
  if (l && n && (S.towBy != null || S.hitch)) {
    const sag = S.hitch ? 0 : 6;
    g.moveTo(n.x, n.y - 8).quadraticCurveTo((n.x + l.x) / 2, (n.y + l.y) / 2 + sag, l.x, l.y - 10).stroke({ width: 2.2, color: 0xd6b47a, alpha: S.hitch ? 0.5 + 0.4 * Math.sin(now * 12) : 0.95 });
  }
  // 発射台の「つなげる」輪（ready で、つないでいない時）
  if (l && S.phase === 'ready' && S.towBy == null) {
    const k = (now * 0.9) % 1;
    g.circle(l.x, l.y, STRIKE.hitchRange).stroke({ width: 2 * ink, color: 0xf5c542, alpha: 0.35 + 0.25 * (1 - k) });
  }
  // 狙いを決めている途中: 射程の輪（発射台から 12 マス）と、狙いの点
  if (ui?.aim && l && S.phase === 'ready') {
    const RR = STRIKE.rangeTiles * TILE;
    g.circle(l.x, l.y, RR).fill({ color: 0xf5c542, alpha: 0.05 }).stroke({ width: 2 * ink, color: 0xf5c542, alpha: 0.6 });
    if (ui.aim.x != null) {
      const ok = Math.hypot(ui.aim.x - l.x, ui.aim.y - l.y) <= RR;
      marker(g, ui.aim.x, ui.aim.y, ink, now, ok ? 0xff5a3c : 0x9ca3af, 1, ok ? 0.85 : 0.45);
      g.moveTo(l.x, l.y - 10).lineTo(ui.aim.x, ui.aim.y).stroke({ width: 1.5 * ink, color: ok ? 0xff5a3c : 0x9ca3af, alpha: 0.5 });
    }
  }
  // 着弾マーカー（撃つと決めてから落ちるまで）。だんだん輪が縮む
  const cd = strikeCountdown(S);
  if (cd != null && S.target) marker(g, S.target.x, S.target.y, ink, now, 0xff3b30, cd, 1);
  // 飛んでいるミサイルと煙
  if (S.phase === 'flying' && S.from && S.target) {
    const k = Math.min(1, S.flightT / STRIKE.flightSec);
    for (let i = 8; i >= 1; i--) {
      const kk = Math.max(0, k - i * 0.025); const p = missilePos(S, kk);
      g.circle(p.x, p.y, 3 + i * 1.1).fill({ color: 0xd1d5db, alpha: 0.35 * (1 - i / 9) });
    }
    const p = missilePos(S, k), ca = Math.cos(p.ang), sa = Math.sin(p.ang);
    g.moveTo(p.x + ca * 9, p.y + sa * 9).lineTo(p.x - ca * 7 - sa * 3, p.y - sa * 7 + ca * 3).lineTo(p.x - ca * 7 + sa * 3, p.y - sa * 7 - ca * 3).closePath().fill({ color: 0xd94a3d }).stroke({ width: 1.2, color: 0x121418 });
    g.circle(p.x - ca * 9, p.y - sa * 9, 3 + Math.random() * 1.5).fill({ color: 0xffc14d, alpha: 0.9 });
  }
  // 爆風の輪（落ちてから 1.2 秒）
  if (S.impactAt != null && S.target) {
    const age = sim.time - S.impactAt;
    if (age >= 0 && age < 1.2) {
      const k = age / 1.2;
      g.circle(S.target.x, S.target.y, STRIKE.radius * (0.3 + 0.9 * k)).stroke({ width: 6 * (1 - k) + 1, color: 0xffd28a, alpha: 0.8 * (1 - k) });
      g.circle(S.target.x, S.target.y, STRIKE.inner * (1 - k * 0.5)).fill({ color: 0xff8a3c, alpha: 0.35 * (1 - k) });
    }
  }
}

/** 着弾マーカー（コードで描く）: 外の輪＝届く範囲、内の輪＝一番強い所、十字と、残りの時間で縮む輪 */
function marker(g, x, y, ink, now, col, left, alpha) {
  const R = STRIKE.radius, r = STRIKE.inner, blink = 0.6 + 0.4 * Math.sin(now * 10);
  g.circle(x, y, R).fill({ color: col, alpha: 0.10 * alpha }).stroke({ width: 2.5 * ink, color: col, alpha: alpha * blink });
  g.circle(x, y, r).stroke({ width: 2 * ink, color: col, alpha: alpha * 0.7 });
  if (left < 1) g.circle(x, y, Math.max(4, R * left)).stroke({ width: 3 * ink, color: 0xffffff, alpha: 0.8 * alpha });
  const a = 14;
  g.moveTo(x - a, y).lineTo(x + a, y).moveTo(x, y - a).lineTo(x, y + a).stroke({ width: 2.5 * ink, color: col, alpha });
  for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + now * 0.8; g.moveTo(x + Math.cos(t) * (R - 10), y + Math.sin(t) * (R - 10)).lineTo(x + Math.cos(t) * (R + 6), y + Math.sin(t) * (R + 6)); }
  g.stroke({ width: 3 * ink, color: col, alpha });
}
