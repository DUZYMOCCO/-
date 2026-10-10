import {visibleHeroMembers} from './hero-rules.js';
// Field coordinates and instance coordinates must never share combat participants.
export function inCurrentInstance(game, unit) {
  if (!game.currentDungeon || !unit) return false;
  if (unit === game.player) return true;
  if (unit.heroPartyId) return game.heroJourney?.party?.space===game.currentDungeon.id;
  if (game.instanceCargoIds?.includes(unit.id)) return true;
  if (unit.isGateGuard) return unit.gateSpace === game.currentDungeon.id;
  return !!unit.isPersonalGuard && (game.squad || []).some(s=>s===unit||s.id===unit.id);
}

export function activeSquad(game) {
  return (game.squad || []).filter(s => s && !s.dead && (!game.currentDungeon || inCurrentInstance(game, s))).concat(visibleHeroMembers(game));
}
