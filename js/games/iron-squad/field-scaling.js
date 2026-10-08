import {combatPower} from './combat-rewards.js?v=119';
export const FIELD_ADAPT_HP_CAP=8,FIELD_ADAPT_ATK_CAP=3;
export function fieldArmyStrength(game) {
  const army=(game.squad||[]).filter(s=>s&&!s.dead).map(combatPower).sort((a,b)=>a-b);
  const armyPower=army[Math.floor(Math.max(0,army.length-1)*.65)]||90;
  const heroPower=combatPower(game.player),nationLevel=Math.max(0,Math.min(5,game.nation?.level||0));
  const pressure=Math.max(0,Math.log2(Math.max(1,armyPower/90))*.6+Math.log2(Math.max(1,heroPower/60))*.35+nationLevel*.15);
  return {pressure,armyPower,heroPower,nationLevel};
}
export function fieldAdaptiveScaling(game,distance) {
  // Follow local progress; the authored distance curve dominates beyond 48km.
  const strength=fieldArmyStrength(game),weight=Math.max(0,1-Math.max(0,distance||0)/48000);
  const hp=1+Math.min(FIELD_ADAPT_HP_CAP-1,strength.pressure*1.4)*weight;
  const atk=1+Math.min(FIELD_ADAPT_ATK_CAP-1,strength.pressure*.45)*weight;
  return {...strength,weight,hp,atk,reward:Math.min(5,Math.sqrt(hp*atk))};
}
