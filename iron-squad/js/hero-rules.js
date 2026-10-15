// The commander's historical isHero flag is unrelated to the chosen hero.
// 勇者は第10期から5期ごとに必ず生まれる（前の勇者パーティが生きていればその期は見送り）。確率抽選はやめた（ユーザー判断：全然出てこない）。
export const HERO_RULES = Object.freeze({firstPhase:10, interval:5, growth:20});
export const heroRevelationPhase = phase => phase>=HERO_RULES.firstPhase && (phase-HERO_RULES.firstPhase)%HERO_RULES.interval===0;
export const heroGrowth = unit => unit?.heroPartyId ? HERO_RULES.growth : 1;
export const heroMembers = game => game.heroJourney?.party?.members || [];
export function heroSharesSpace(game) {
  const party=game.heroJourney?.party;
  return !!party && (party.space==='field' ? !game.currentDungeon : game.currentDungeon?.id===party.space);
}
export const visibleHeroMembers = game => heroSharesSpace(game)?heroMembers(game).filter(s=>!s.dead):[];
