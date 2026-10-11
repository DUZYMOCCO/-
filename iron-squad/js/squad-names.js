// v5.0.0: 戦場の兵士の名前（名のみ）。自小隊=金色で目立たせ、本隊=小さく薄く。
// ラベルは毎フレーム1回のパスでまとめて描く（フォントは1回だけ設定・幅はキャッシュ・配列は使い回し）。
import {heroMembers} from './hero-rules.js';
import {isOwnSquad} from './own-squad-marker.js';
import {UNITS_PER_METER} from './distance-format.js?v=182';

/** 本隊の名前は隊長からこの距離（1.6m＝画面の半分弱。6mだと画面全体が入るため）まで。最後の0.8mでふわっと消える。 */
export const MAIN_NAME_RADIUS = 1.6 * UNITS_PER_METER;
export const MAIN_NAME_FADE = 0.6 * UNITS_PER_METER;
export const mainNameAlpha = distance => Math.max(0, Math.min(1, (MAIN_NAME_RADIUS - distance) / MAIN_NAME_FADE));

/** 「名・名字」から名だけ。単名（ニンジャ・獣人）はそのまま。 */
export const givenName = name => String(name ?? '').split('・')[0].trim();

const widths = new Map();
const OWN_FONT = 'bold 10px sans-serif', MAIN_FONT = '7px sans-serif', MAX_MAIN = 28;
const textWidth = (c, font, text) => {
  const key = font + text; let w = widths.get(key);
  if (w === undefined) { w = c.measureText(text).width || text.length * 7; if (widths.size > 400) widths.clear(); widths.set(key, w); }
  return w;
};
const overlaps = (list, n, x0, y0, x1, y1) => {
  for (let i = 0; i < n; i += 4) if (x0 < list[i + 2] && x1 > list[i] && y0 < list[i + 3] && y1 > list[i + 1]) return true;
  return false;
};

/** drawSoldier が呼ぶ。描くのは後のパス。 */
export function queueSquadName(game, s) {
  (game._nameQueue ||= []).push(s);
}

/**
 * 1フレーム1回。queue は空にする。戻り値は描いた数（テスト用）。
 * 自小隊 > 本隊 の優先。本隊ラベルは自小隊と重なれば描かず、本隊同士も重なれば描かない。
 */
export function flushSquadNames(c, game) {
  const queue = game._nameQueue;
  if (!queue || !queue.length) return 0;
  const rects = (game._nameRects ||= []); let n = 0, drawn = 0, mains = 0;
  const hero = heroMembers(game), z = game.zoom || 1, cam = game.camera;
  const mx = cam ? game.width / (2 * z) + 30 : Infinity, my = cam ? game.height / (2 * z) + 30 : Infinity;
  c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  c.font = OWN_FONT;
  for (let i = 0; i < queue.length; i++) { // 自小隊（常時表示）
    const s = queue[i]; if (!isOwnSquad(s) || hero.includes(s)) continue;
    if (cam && (Math.abs(s.x - cam.x) > mx || Math.abs(s.y - cam.y) > my)) continue;
    const text = givenName(s.name); if (!text) continue;
    const w = textWidth(c, OWN_FONT, text), x = s.x, y = s.y + 21;
    c.fillStyle = s.isDown ? 'rgba(60,20,10,.78)' : 'rgba(30,22,6,.72)'; c.fillRect(x - w / 2 - 3, y - 9, w + 6, 12);
    c.fillStyle = s.isDown ? '#fde047' : '#fbbf24'; c.fillText(text, x, y);
    rects[n++] = x - w / 2 - 3; rects[n++] = y - 9; rects[n++] = x + w / 2 + 3; rects[n++] = y + 3; drawn++;
  }
  c.font = MAIN_FONT; c.fillStyle = '#e2e8f0';
  const pl = game.player;
  for (let i = 0; i < queue.length && mains < MAX_MAIN; i++) { // 本隊（小さく薄く・混雑回避）
    const s = queue[i]; if (isOwnSquad(s) || s.isDown || hero.includes(s)) continue;
    if (cam && (Math.abs(s.x - cam.x) > mx || Math.abs(s.y - cam.y) > my)) continue;
    if (!pl) break;
    const fade = mainNameAlpha(Math.hypot(s.x - pl.x, s.y - pl.y)); if (fade <= 0) continue;
    const text = givenName(s.name); if (!text) continue;
    const w = textWidth(c, MAIN_FONT, text), x = s.x, y = s.y + 15;
    if (overlaps(rects, n, x - w / 2, y - 7, x + w / 2, y + 2)) continue;
    c.globalAlpha = .6 * fade; c.fillText(text, x, y);
    rects[n++] = x - w / 2; rects[n++] = y - 7; rects[n++] = x + w / 2; rects[n++] = y + 2; drawn++; mains++;
  }
  c.restore(); // globalAlpha は save/restore で戻る
  queue.length = 0; rects.length = 0;
  return drawn;
}
