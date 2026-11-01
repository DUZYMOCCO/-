import { actorFloor, clampViewFloor, houseRoofFloor } from '../sim/floors.js';
import { houseAt } from '../sim/town.js';

export function resolveFloorView(state, trackedActor, manualFloor = null) {
  const house = trackedActor && state?.town ? houseAt(state, trackedActor.x, trackedActor.z, 0.15) : null;
  if (!house) return { house: null, floor: null, manual: false };
  const manual = Number.isInteger(manualFloor) && manualFloor >= 0;
  const requested = manual ? manualFloor : actorFloor(trackedActor);
  return { house, floor: clampViewFloor(house, requested), manual };
}

export function hiddenFloorsAbove(house, viewFloor) {
  if (!house || !Number.isInteger(viewFloor)) return [];
  const hidden = [];
  for (let floor = viewFloor + 1; floor <= houseRoofFloor(house); floor += 1) hidden.push(floor);
  return hidden;
}

export function floorLabel(house, floor) {
  if (!house || !Number.isInteger(floor)) return '';
  if (floor === 0) return '1F';
  if (floor >= houseRoofFloor(house)) return '屋上';
  return `${floor + 1}F`;
}

export function showFloorLayer(isSelectedHouse, layerFloor, viewFloor) {
  return !isSelectedHouse || !Number.isInteger(viewFloor) || layerFloor <= viewFloor;
}
