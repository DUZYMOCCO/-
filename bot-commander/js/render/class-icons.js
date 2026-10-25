// v0.4.3 兵種のアイコン（ロボットの見た目では兵種がわからないため）。HP バーの左端に小さく出す。
// 絵のファイルは使わず、Pixi の Graphics で描く（暗い丸の台＋明るい記号）。兵種を足したら CLASS_ICONS に1行足す。
// null＝アイコンなし（新入り・巨大機）。リペアラーは緑の十字（赤十字の標章は法律で守られているので、白地に赤い十字は使わない）。
// このファイルは Pixi を import しない（テストから読める）。g は Pixi の Graphics（moveTo/lineTo/rect/circle/ellipse/fill/stroke）。
export const ICON_R = 6;          // 台の半径（画面 px。直径 12px。zoom で大きさを変えない）
export const ICON_MIN_ZOOM = 0.75; // これより引くと出さない（小さな点が並んでうるさくなるので）
const LIGHT = 0xe8eef5, DARK = 0x121418;

export const CLASS_ICONS = Object.freeze({
  rookie: null,
  gunner: Object.freeze({ glyph: 'gun', color: LIGHT }),
  scout: Object.freeze({ glyph: 'eye', color: LIGHT }),        // 仮
  supporter: Object.freeze({ glyph: 'wrench', color: LIGHT }),
  scavenger: Object.freeze({ glyph: 'sack', color: LIGHT }),   // 仮
  stealth: Object.freeze({ glyph: 'crosshair', color: LIGHT }), // 仮
  repairer: Object.freeze({ glyph: 'cross', color: 0x4ade80 }),
  giant: null,
});

/** 機体の兵種アイコン（なければ null） */
export const classIconOf = u => (u && u.cls && CLASS_ICONS[u.cls]) || null;

const GLYPHS = {
  // 拳銃の横向き: 銃身・握り・引き金の輪
  gun: (g, c) => {
    g.rect(-3.6, -2.4, 7.4, 2.2).fill({ color: c });
    g.moveTo(-3.4, -0.4).lineTo(-0.6, -0.4).lineTo(-1.2, 3.4).lineTo(-3.6, 3.4).closePath().fill({ color: c });
    g.moveTo(-0.6, -0.2).lineTo(0.8, -0.2).lineTo(0.4, 1.4).lineTo(-0.8, 1.4).stroke({ width: 0.8, color: c });
  },
  // 緑の十字
  cross: (g, c) => { g.rect(-1.1, -3.6, 2.2, 7.2).fill({ color: c }).rect(-3.6, -1.1, 7.2, 2.2).fill({ color: c }); },
  // スパナ: 斜めの柄と、口の開いた頭
  wrench: (g, c) => {
    g.moveTo(-3.2, 3.2).lineTo(1, -1).stroke({ width: 1.9, color: c, cap: 'round' });
    g.circle(1.6, -1.6, 2.3).fill({ color: c });
    g.moveTo(1.6, -1.6).lineTo(3.4, -3.4).stroke({ width: 1.6, color: DARK });
  },
  eye: (g, c) => { g.ellipse(0, 0, 3.9, 2.3).stroke({ width: 1, color: c }); g.circle(0, 0, 1.3).fill({ color: c }); },
  // 袋: ふくらんだ下と、口が広がった上（縛り目は暗い線）。丸い爆弾に見えないように口を広げる
  sack: (g, c) => {
    g.ellipse(0, 1.3, 3.3, 2.6).fill({ color: c });
    g.moveTo(-1, -0.9).lineTo(1, -0.9).lineTo(2.4, -3.6).lineTo(-2.4, -3.6).closePath().fill({ color: c });
    g.rect(-1.7, -1.6, 3.4, 0.8).fill({ color: DARK });
  },
  crosshair: (g, c) => {
    g.circle(0, 0, 2.6).stroke({ width: 0.9, color: c });
    for (const [x1, y1, x2, y2] of [[0, -4, 0, -1.6], [0, 1.6, 0, 4], [-4, 0, -1.6, 0], [1.6, 0, 4, 0]]) g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 0.9, color: c });
  },
};
export const GLYPH_NAMES = Object.freeze(Object.keys(GLYPHS));

/** 台と記号を g に描く（原点が丸の中心、単位は画面 px）。描いたら true */
export function drawClassIcon(g, icon) {
  if (!icon || !GLYPHS[icon.glyph]) return false;
  g.circle(0, 0, ICON_R).fill({ color: DARK, alpha: 0.92 }).circle(0, 0, ICON_R).stroke({ width: 1, color: icon.color === LIGHT ? 0x5b6472 : 0x2f7a4c });
  GLYPHS[icon.glyph](g, icon.color);
  return true;
}

// v0.4.10 描いた絵のアイコン（Codex 作。assets/icons/<名前>_badge@24.png、24px＝直径 12px を 2 倍の画面で）。
//   読めたら上の Graphics の代わりに使う（読めなければ今までどおり Graphics）。兵種 → 絵の名前（stealth の絵は stalker）
export const CLASS_BADGES = Object.freeze({ gunner: 'gunner', scout: 'scout', supporter: 'supporter', scavenger: 'scavenger', stealth: 'stalker', repairer: 'repairer' });
// 状態の絵: kit_empty はキット切れ（HP バーの右）。shield・shield_broken・repair_kit は statusBadgeOf が「変わった時・大事な時だけ」選ぶ（v0.4.12-dev）
export const STATUS_BADGES = Object.freeze(['shield', 'shield_broken', 'repair_kit', 'kit_empty']);
export const BADGE_PX = 24;
export const KIT_ICON_R = 5; // キット切れの丸の半径（画面 px）
export const badgePath = name => `assets/icons/${name}_badge@${BADGE_PX}.png`;
/** 機体の兵種の絵の名前（なければ null） */
export const classBadgeOf = u => (classIconOf(u) && CLASS_BADGES[u.cls]) || null;

// v0.4.12-dev 状態の印（機体の上、HP バーの右上）。常には出さず、変わった時・大事な時の 1 つだけ。引いた時（ICON_MIN_ZOOM より下）は出さない。
export const STATE_BADGE_R = 5; // 状態の印の半径（画面 px）
/** 盾のバーの長さ（HP バーの幅に対する割合）。盾が厚い機体ほど長い（0.45〜1）。盾の耐久 shieldMax（機体の表）で決まる */
export const shieldBarFrac = shieldMax => Math.max(0.45, Math.min(1, 0.4 + 0.6 * Math.sqrt(Math.max(0, shieldMax) / 96)));
/** いま出す状態の印の名前（STATUS_BADGES のどれか。なければ null）。優先: 盾が壊れている > 盾で守っている／盾を渡された・直った直後 > キットを使われた・作っている。
 *  defensive＝盾で守る命令の最中、fresh＝直近に変わったこと（'shield' か 'repair_kit'。sim.fx の shieldGive・shieldRestored・kitUse から描画側が決める） */
export function statusBadgeOf(u, { defensive = false, fresh = null } = {}) {
  if (!u || u.side !== 'ally' || u.human) return null;
  if (u.shieldMax > 0 && !(u.shieldHp > 0)) return 'shield_broken';
  if (u.shieldHp > 0 && (defensive || fresh === 'shield')) return 'shield';
  if (fresh === 'repair_kit' || u.kitBuild != null) return 'repair_kit';
  return null;
}
