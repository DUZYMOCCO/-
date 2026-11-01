import { raceBase } from './races.js';
import { MACHINE_ROLES } from './spawn_data.js';

const MECHANICAL_RACES = new Set(['sabito', 'kumiki']);

export function bodyFluid(actor) {
  if (!actor) return 'blood';
  if (actor.machine || MACHINE_ROLES.includes(actor.role) || MECHANICAL_RACES.has(raceBase(actor.race).id)) return 'oil';
  return 'blood';
}
