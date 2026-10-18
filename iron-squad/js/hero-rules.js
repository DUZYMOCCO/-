// The commander's historical isHero flag is unrelated to the chosen hero.
// 勇者は第10期から5期ごとに必ず生まれる（前の勇者パーティが生きていればその期は見送り）。確率抽選はやめた（ユーザー判断：全然出てこない）。
// v7.0.25: stagnationPhases = 魔王城に入ったあと、進展（撃破・Lv上昇・魔王へのダメージ・城内の敵の減少）が無いまま何期続いたら撤退とするか。warnPhases = その警告を日誌に出す期数。
export const HERO_RULES = Object.freeze({firstPhase:10, interval:5, growth:20, stagnationPhases:4, warnPhases:2, statusBossStep:5, noticeSeconds:20});
export const heroRevelationPhase = phase => phase>=HERO_RULES.firstPhase && (phase-HERO_RULES.firstPhase)%HERO_RULES.interval===0;
/** The first revelation phase strictly after `phase`. */
export const nextHeroRevelationPhase = phase => phase<HERO_RULES.firstPhase?HERO_RULES.firstPhase:HERO_RULES.firstPhase+(Math.floor((phase-HERO_RULES.firstPhase)/HERO_RULES.interval)+1)*HERO_RULES.interval;
export const heroGrowth = unit => unit?.heroPartyId ? HERO_RULES.growth : 1;
/** A withdrawn party has left the castle for good: it no longer fights, is drawn, shares EXP or blocks the next hero. */
export const heroPartyWithdrawn = party => party?.status==='withdrawn';
export const heroPartyActive = party => !!party && !heroPartyWithdrawn(party) && party.members.some(u=>!u.dead);
export const heroMembers = game => { const party=game.heroJourney?.party; return !party||heroPartyWithdrawn(party)?[]:party.members; };
export function heroSharesSpace(game) {
  const party=game.heroJourney?.party;
  return !!party && !heroPartyWithdrawn(party) && (party.space==='field' ? !game.currentDungeon : game.currentDungeon?.id===party.space);
}
export const visibleHeroMembers = game => heroSharesSpace(game)?heroMembers(game).filter(s=>!s.dead):[];
