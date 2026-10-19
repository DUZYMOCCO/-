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

/** v7.0.38: while the expedition is watched only the commander's own guards (and the commander) are parked. */
export const frozenGuard=u=>!!u&&!!u.isPersonalGuard&&!u.heroPartyId;
/** v7.0.31/v7.0.38: units that stand still, are undrawn and cannot be hurt while a spectate runs (field march: the whole squad; expedition: the commander's guards only). */
export function spectateParked(game,u) {
  const s=game?.spectating;if(!s||!u||u===game.player||u.heroPartyId)return false;
  if(s.field)return expeditionCombatUnits(game).includes(u);
  if(s.expedition)return frozenGuard(u)&&(game.squad||[]).includes(u);
  return false;
}
/** Units that fight and are drawn as usual while spectating ([] for the field march; everyone but the guards for the expedition watch). */
export function spectateLiveUnits(game) {
  if(game?.spectating?.field)return [];
  const all=expeditionCombatUnits(game);
  return game?.spectating?.expedition?all.filter(u=>!frozenGuard(u)):all;
}
export function activeSquad(game) {
  if(game.spectating?.expedition)return spectateLiveUnits(game).filter(s=>s&&!s.dead&&(!game.currentDungeon||inCurrentInstance(game,s))).concat(visibleHeroMembers(game)); // v7.0.38: the main body at the camp and the expedition fight as usual
  if(game.spectating?.field)return visibleHeroMembers(game).filter(s=>s&&!s.dead); // v7.0.31: the commander's squad is parked (frozen, undrawn, untargetable) while the field march is watched
  return expeditionCombatUnits(game).filter(s => s && !s.dead && (!game.currentDungeon || inCurrentInstance(game, s))).concat(visibleHeroMembers(game));
}
