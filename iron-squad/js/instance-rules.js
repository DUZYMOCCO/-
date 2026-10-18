import {visibleHeroMembers} from './hero-rules.js?v=302';
import {expeditionCombatUnits} from './expedition-rules.js?v=256';
// Field coordinates and instance coordinates must never share combat participants.
export function inCurrentInstance(game, unit) {
  if (!game.currentDungeon || !unit) return false;
  if (unit === game.player) return true;
  if (unit.heroPartyId) return game.heroJourney?.party?.space===game.currentDungeon.id;
  if (game.instanceCargoIds?.includes(unit.id)) return true;
  if (unit.isGateGuard) return unit.gateSpace === game.currentDungeon.id;
  // v7.0.28: an observing commander enters alone; his own squad stays in the field (frozen, like the main army).
  return !!unit.isPersonalGuard && !game.spectating && (game.squad || []).some(s=>s===unit||s.id===unit.id);
}

export function activeSquad(game) {
  return expeditionCombatUnits(game).filter(s => s && !s.dead && (!game.currentDungeon || inCurrentInstance(game, s))).concat(visibleHeroMembers(game));
}
