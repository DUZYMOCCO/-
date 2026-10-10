// The commander's historical isHero flag is unrelated to the chosen hero.
export const HERO_RULES = Object.freeze({firstPhase:10, revelationChance:.02, growth:20});
export const heroGrowth = unit => unit?.heroPartyId ? HERO_RULES.growth : 1;
export const heroMembers = game => game.heroJourney?.party?.members || [];
export function heroSharesSpace(game) {
  const party=game.heroJourney?.party;
  return !!party && (party.space==='field' ? !game.currentDungeon : game.currentDungeon?.id===party.space);
}
export const visibleHeroMembers = game => heroSharesSpace(game)?heroMembers(game).filter(s=>!s.dead):[];
