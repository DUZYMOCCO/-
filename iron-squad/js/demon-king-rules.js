// v7.0.27: 魔王の強化。魔王は「入場した隊長＋直属の戦力」に合わせて作られ、強攻撃・全体魔法は最大HP割合ダメージで働く。
// 調整したいときはこの表だけを触る（定数名はそのまま報告・ドキュメントに載せている）。
export const DEMON_KING_RULES = Object.freeze({
  scaleVersion: 2,            // v7.2.18: 2 = 職とクラス段階ごとの実測DPS係数で見積もる（上位職の火力を正しく数える）
  targetTtk: 150,            // 隊長＋直属が想定DPSで魔王を削り切る目標秒数
  minHp: 1_000_000_000,      // これ未満にはならない（旧仕様のHP10億）
  minAtk: 85_000,            // これ未満にはならない（旧仕様の攻撃力）
  defaultHp: 3_000_000_000,  // 隊長がまだ一度も入場していない（勇者だけの城・旧セーブ）ときの既定
  captainDps: 6.5,           // 想定DPS = 隊長ATK × この値 /秒
  guardDps: 2.2,             // 直属1人 = 直属ATK × この値 /秒
  strikePct: 0.5,            // 強攻撃（近接の一撃）= 最大HPの50%（防御無視。保護で軽減。保護なしなら2発で倒れる）
  strikeInterval: 4,         // 強攻撃の間隔（秒）
  aoePct: 0.02,              // アビスメテオ = 最大HPの2%（魔法防御と保護で軽減）
  aoeInterval: 3.2,          // アビスメテオの間隔（秒）
  aoeRadius: 300,            // アビスメテオの範囲(px)
  pctMagicDefMax: 0.5,       // 割合ダメージで魔法防御が減らせる上限
  pctMagicDefHalf: 3000,     // 魔法防御がこの値のとき上限の半分まで減らす
  huntSpeed: 110,            // 画面外の勇者戦で魔王が勇者を追う速さ(px/秒)
  gaugeTtk: 130,             // v7.2.18: 見切りで使う秒数。戦い始めは全員が元気で火力が高いので、150秒前後で倒れるよう少し短め
  lowTierTtkBonus: 0.25,     // v7.2.21: クラスアップしていない隊ほど長く戦わせる。目標秒数×(1+この値×(1-平均段位/3))。段位0の隊は×1.25、最上位の隊は×1.0
  heroGaugeTtk: 10,          // v7.2.21: 最上位職（クラス3）の勇者だけの戦いでは、勇者の想定火力×この秒数のHPにする（城の雑兵と一緒に戦うので短め。実測で勝率3割前後）。クラス3でない勇者には使わない
  gaugeSeconds: 12           // v7.2.18: 隊長側が城で戦い始めてからこの秒数の実際の火力を見て、HP=実火力×gaugeTtk まで引き上げる（下げない）
});
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
// v7.2.18: 実測の秒間火力係数（大きな的への ATK×係数/秒。ATK は攻撃と魔攻の大きいほう）。[基本職, クラス1, クラス2, クラス3]。
// 測定：Lv45・魔王城距離の装備 +200/+500、6人同職＋隊長、65秒（/workspace/sim/_dps.mjs）。治癒職・隊長の上位職は味方の攻撃を上げる分も含む。
export const DEMON_KING_CLASS_DPS = Object.freeze({
  HEAVY: [1.0, 1.0, 1.5, 1.6], LIGHT: [2.5, 3.4, 3.5, 3.5], ARCHER: [2.5, 4.1, 4.4, 4.5], MEDIC: [0.6, 1.6, 2.7, 3.1], MAGE: [1.3, 2.0, 1.8, 1.6]
});
export const DEMON_KING_CAPTAIN_DPS = Object.freeze([8.6, 10.3, 12.0, 13.6]); // 隊長 0〜3段（覇王・帝皇・神話帝）
const CLASS_LINES = Object.freeze({
  HEAVY: ['HEAVY', 'PALADIN', 'TEMPLAR', 'IMMORTAL_AEGIS'], LIGHT: ['LIGHT', 'BLADEMASTER', 'SWORD_EMPEROR', 'VOID_EDGE'],
  ARCHER: ['ARCHER', 'SNIPER', 'STORM_BOW', 'STAR_HUNTER'], MEDIC: ['MEDIC', 'HIGH_PRIEST', 'SAINT', 'ARCHANGEL'], MAGE: ['MAGE', 'ARCHMAGE', 'ELEMENTAL_SAGE', 'ARCANE_SOVEREIGN']
});
const CAPTAIN_STAGES = Object.freeze({ WARLORD: 1, EMPEROR: 2, MYTHIC_EMPEROR: 3 });
/** 直属1人の係数。知らない職（限定の仲間など）は旧来の 2.2。 */
export function classTier(unit) {
  const id = unit?.soldierClass;
  for (const line of Object.values(CLASS_LINES)) { const tier = line.indexOf(id); if (tier >= 0) return tier; }
  return 0;
}
export function guardDpsFactor(unit) {
  const id = unit?.soldierClass;
  for (const [family, line] of Object.entries(CLASS_LINES)) { const tier = line.indexOf(id); if (tier >= 0) return DEMON_KING_CLASS_DPS[family][tier]; }
  return DEMON_KING_RULES.guardDps;
}
export const captainDpsFactor = player => DEMON_KING_CAPTAIN_DPS[CAPTAIN_STAGES[player?.advancedClass] || (player?.isAdvanced ? 1 : 0)];
/** 想定DPS（隊長＋直属）。測定スクリプトの式: 隊長 ATK×6.5/秒、直属 ATK×2.2/秒。 */
export function estimateSortieForce(game) {
  const R = DEMON_KING_RULES, p = game?.player;
  const captain = Math.max(num(p?.atk), num(p?.magicAttack));
  const guards = (game?.squad || []).filter(s => s && s.isPersonalGuard && !s.dead);
  const guardAtk = guards.reduce((n, s) => n + Math.max(num(s.atk), num(s.magicAttack)), 0);
  const guardDps = guards.reduce((n, s) => n + Math.max(num(s.atk), num(s.magicAttack)) * guardDpsFactor(s), 0);
  const dps = captain * captainDpsFactor(p) + guardDps; // v7.2.18: per class line and tier (was ATK×6.5 + guards×2.2 for everyone)
  // v7.2.21: 平均のクラス段位（隊長0〜3段と直属それぞれの段位）。低いほど魔王は長く持ちこたえる。
  const stages = [CAPTAIN_STAGES[p?.advancedClass] || (p?.isAdvanced ? 1 : 0), ...guards.map(classTier)];
  const stage = stages.reduce((n, v) => n + v, 0) / stages.length;
  const ttkScale = 1 + R.lowTierTtkBonus * Math.max(0, 1 - stage / 3);
  return { dps, captainAtk: captain, guards: guards.length, guardAtk, stage, ttkScale };
}
export const demonKingStatsForDps = (dps, ttkScale = 1) => ({
  hp: Math.max(DEMON_KING_RULES.minHp, Math.round(num(dps) * DEMON_KING_RULES.targetTtk * Math.max(1, num(ttkScale) || 1))),
  atk: DEMON_KING_RULES.minAtk
});
/** The stats a freshly made king gets: the recorded sortie force, or the default strong king if no commander has entered yet. */
export function demonKingStatsFor(game) {
  const profile = game?.heroJourney?.kingProfile;
  if (profile?.hp > 0) return { hp: Math.max(DEMON_KING_RULES.minHp, profile.hp), atk: Math.max(DEMON_KING_RULES.minAtk, num(profile.atk)) };
  return { hp: DEMON_KING_RULES.defaultHp, atk: DEMON_KING_RULES.minAtk };
}
/** v7.2.22 その隊が今、魔王と戦うなら何HPか（記録した見積もりと今の見積もりの大きいほう。記録は書きかえない）。真魔王のHPの元。 */
export function commanderKingHp(game) {
  const f = estimateSortieForce(game), prof = num(game?.heroJourney?.kingProfile?.hp);
  return Math.max(prof, demonKingStatsForDps(f.dps, f.ttkScale).hp);
}
/** Snapshot on castle entry. It only ever goes up, so swapping gear in and out of the castle cannot make the king weaker. */
export function recordKingProfile(game) {
  const j = game?.heroJourney;
  if (!j) return null;
  const force = estimateSortieForce(game), next = demonKingStatsForDps(force.dps, force.ttkScale), prev = j.kingProfile || {};
  j.kingProfile = {
    version: DEMON_KING_RULES.scaleVersion,
    hp: Math.max(num(prev.hp), next.hp),
    atk: Math.max(num(prev.atk), next.atk),
    dps: Math.max(num(prev.dps), force.dps),
    phase: game.phase || 1
  };
  return j.kingProfile;
}
/** Give a king its strike / meteor rules and (optionally) new stats. Remaining HP keeps its fraction. */
export function shapeDemonKing(king, stats = null, { raiseOnly = false } = {}) {
  const R = DEMON_KING_RULES;
  if (!king) return king;
  const before = Math.max(1, num(king.maxHp) || num(king.hp) || 1), ratio = king.hp > 0 || king.maxHp > 0 ? Math.max(0, Math.min(1, num(king.hp) / before)) : 1;
  if (stats) {
    const maxHp = raiseOnly ? Math.max(before, stats.hp) : stats.hp;
    king.maxHp = maxHp;
    king.hp = king.hp === undefined ? maxHp : Math.round(maxHp * ratio);
    king.atk = Math.max(R.minAtk, raiseOnly ? Math.max(num(king.atk), stats.atk) : stats.atk);
  }
  king.strikePct = R.strikePct;
  king.attackInterval = R.strikeInterval;
  king.aoePct = R.aoePct;
  king.skillCooldown = R.aoeInterval;
  king.kingScaleVersion = R.scaleVersion;
  return king;
}
/**
 * v7.2.18: 魔王は戦い始めの数秒で挑む者の力を見切る。隊長側が城で実際に与えたダメージから秒間火力を出し、
 * 最大HPを「実火力×gaugeTtk」まで引き上げる（すでに削った分はそのまま、下げることはない）。上位職・装備・技の火力をそのまま数える。
 * 引き上げた値は kingProfile にも残すので、次の入場は最初からその強さ。返り値：引き上げたら新しい最大HP、それ以外は 0。
 */
export function gaugeDemonKing(game, king, dt) {
  const R = DEMON_KING_RULES;
  if (!king || !(king.hp > 0) || game?.spectating) return 0;
  const g = king.gauge || (king.gauge = { t: 0, start: 0, done: false });
  if (g.done) return 0;
  if (!g.start) { if (king.hp < king.maxHp) g.start = king.maxHp; else return 0; }
  g.t += num(dt);
  if (g.t < R.gaugeSeconds) return 0;
  g.done = true;
  const dealt = Math.max(0, g.start - king.hp), dps = dealt / g.t, target = Math.round(dps * R.gaugeTtk * (estimateSortieForce(game).ttkScale || 1));
  if (!(target > king.maxHp)) return 0;
  const lost = king.maxHp - king.hp;
  king.maxHp = target; king.hp = Math.max(1, target - lost);
  const j = game.heroJourney;
  if (j) { const p = j.kingProfile || {}; j.kingProfile = { ...p, version: R.scaleVersion, hp: Math.max(num(p.hp), target), atk: Math.max(num(p.atk), num(king.atk), R.minAtk), dps: Math.max(num(p.dps), dps), phase: game.phase || 1 }; }
  return target;
}
/** Old saves: the king kept in the castle scene becomes the new king, keeping the fraction of HP that is left. */
export function migrateDemonKing(king, game) {
  if (!king || !(king.isDemonKing || king.type === 'demon_king') || king.kingScaleVersion >= DEMON_KING_RULES.scaleVersion) return king;
  return shapeDemonKing(king, demonKingStatsFor(game));
}
/** Share of max HP that the meteor / the strike takes before protections: DEF is ignored, magic defence helps only a little. */
/** v7.2.21 勇者だけの戦い（隊長は城にいない）：全員が最上位職（守護者3体）の勇者パーティなら、想定火力（職と段位ごとの係数×ATK）×heroGaugeTtk 秒のHPにする。
 *  城に入るたび一度だけ決める（残りHPの割合は保つ）。隊長の見積もり（kingProfile）には書かない。
 *  隊長が城に入ると prepareCastleVisit がいつもの値へ戻す（割合は保つ）。 */
export function heroPartyForce(members) {
  return (members || []).filter(u => u && !u.dead && u.hp > 0)
    .reduce((n, u) => n + Math.max(num(u.atk), num(u.magicAttack)) * guardDpsFactor(u), 0);
}
export function gaugeDemonKingForHeroes(king, members) {
  if (!king || !(king.hp > 0) || king.heroGauge) return 0;
  const R = DEMON_KING_RULES, dps = heroPartyForce(members);
  if (!(dps > 0)) return 0;
  const alive = (members || []).filter(u => u && !u.dead && u.hp > 0), stage = Math.min(...alive.map(classTier));
  if (stage < 3) return 0; // クラス3になる前の勇者には、魔王はいつもの強さのまま（ほぼ勝てない）
  const target = Math.max(1, Math.round(dps * R.heroGaugeTtk)), ratio = Math.min(1, king.hp / Math.max(1, king.maxHp));
  king.heroGauge = { dps: Math.round(dps), stage, hp: target };
  king.maxHp = target; king.hp = Math.max(1, Math.round(target * ratio));
  return target;
}
export function percentBaseDamage(target, pct, magical = false) {
  const R = DEMON_KING_RULES, md = magical ? Math.max(0, num(target?.magicDef)) : 0;
  const cut = magical ? R.pctMagicDefMax * md / (md + R.pctMagicDefHalf) : 0;
  return Math.max(1, Math.round(Math.max(1, num(target?.maxHp)) * pct * (1 - cut)));
}