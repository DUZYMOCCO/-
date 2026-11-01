import { floorLabel } from '../render/floor_view.js';

export function createFloorButtons({ onChange } = {}) {
  const root = document.createElement('div');
  root.className = 'building-floor-controls';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', '見る階');
  root.hidden = true;
  const floors = document.createElement('div');
  floors.className = 'building-floor-list';
  const arrows = document.createElement('div');
  arrows.className = 'building-floor-arrows';
  const up = document.createElement('button');
  up.type = 'button'; up.textContent = '▲'; up.setAttribute('aria-label', '上の階を見る');
  const down = document.createElement('button');
  down.type = 'button'; down.textContent = '▼'; down.setAttribute('aria-label', '下の階を見る');
  arrows.append(up, down);
  root.append(floors, arrows);
  document.body.appendChild(root);

  let house = null;
  let currentFloor = 0;
  let auto = true;
  const buttons = new Map();
  const choose = (floor) => {
    if (!house) return;
    const next = Math.max(0, Math.min(house.roofFloor || 1, floor));
    if (next === currentFloor && !auto) return;
    onChange?.(next);
  };
  up.addEventListener('click', () => choose(currentFloor + 1));
  down.addEventListener('click', () => choose(currentFloor - 1));

  function update(nextHouse, nextFloor, manual) {
    house = nextHouse || null;
    if (!house || !Number.isInteger(nextFloor)) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    currentFloor = nextFloor;
    auto = !manual;
    const roof = house.roofFloor || 1;
    for (let floor = 0; floor <= roof; floor += 1) {
      let button = buttons.get(floor);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'building-floor-choice';
        button.addEventListener('click', () => choose(Number(button.dataset.floor)));
        buttons.set(floor, button);
        floors.appendChild(button);
      }
      button.dataset.floor = String(floor);
      button.textContent = floorLabel(house, floor);
      button.setAttribute('aria-pressed', String(floor === currentFloor));
      button.classList.toggle('is-active', floor === currentFloor);
    }
    for (const [floor, button] of buttons) if (floor > roof) { button.remove(); buttons.delete(floor); }
    root.dataset.mode = auto ? 'auto' : 'manual';
  }

  function dispose() {
    root.remove();
    buttons.clear();
  }

  return { element: root, update, dispose };
}
