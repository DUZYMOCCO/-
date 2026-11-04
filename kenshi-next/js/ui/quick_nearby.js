import { WEAPONS, CARRY_RANGE } from '../sim/data.js';
import { pickupDroppedWeapon } from '../sim/grip.js';

// 選んだ仲間の近くにある対象だけを候補にする。
export function nearbyLootTarget(state, actor, radius = 10) {
  if (!actor || ['dead', 'down', 'getup'].includes(actor.state) || actor.carriedBy != null) return null;
  const candidates = [];
  for (const body of state.actors || []) {
    if (body.faction !== 'player' && ['dead', 'down'].includes(body.state) && body.carriedBy == null) candidates.push({ kind: 'body', item: body });
  }
  for (const box of state.town?.boxes || []) if (!box.locked) candidates.push({ kind: 'box', item: box });
  for (const item of state.groundItems || []) {
    if (Object.keys(item.contents || {}).some(id => WEAPONS[id] && item.contents[id] > 0)) candidates.push({ kind: 'weapon', item });
  }
  return candidates.map(entry => ({ ...entry, distance: Math.hypot(actor.x - entry.item.x, actor.z - entry.item.z) }))
    .filter(entry => entry.distance <= radius).sort((a, b) => a.distance - b.distance)[0] || null;
}

export function createNearbyQuickActions({ getState, getActor, command, loot, trade }) {
  const bar = document.createElement('div');
  bar.className = 'hud-nearby-actions';
  const lootButton = document.createElement('button');
  const tradeButton = document.createElement('button');
  lootButton.type = tradeButton.type = 'button';
  lootButton.textContent = 'あさる'; tradeButton.textContent = '取引';
  bar.append(lootButton, tradeButton); document.body.appendChild(bar);
  let pending = null;
  function perform(actor, target) {
    if (target.kind === 'body') return loot.open(actor.id, target.item.id);
    if (target.kind === 'box') return loot.openBox(actor.id, target.item.id);
    return !!pickupDroppedWeapon(getState(), actor, 3, target.item.id);
  }
  lootButton.addEventListener('click', () => {
    const actor = getActor(), target = nearbyLootTarget(getState(), actor);
    if (!target) return;
    const reach = target.kind === 'weapon' ? 2.5 : target.kind === 'body' ? CARRY_RANGE - 0.2 : 2;
    if (target.distance <= reach) { pending = null; perform(actor, target); return; }
    pending = { actorId: actor.id, kind: target.kind, id: target.item.id, x: target.item.x, z: target.item.z, reach, tick: getState().tick, startedAt: performance.now() };
    command({ type: 'move', actorId: actor.id, x: target.item.x, z: target.item.z });
  });
  tradeButton.addEventListener('click', () => trade.open('trade'));
  function update() {
    const state = getState(), actor = getActor();
    const candidate = nearbyLootTarget(state, actor);
    lootButton.hidden = !candidate;
    if (candidate) lootButton.textContent = candidate.kind === 'weapon' ? '武器を拾う' : candidate.kind === 'box' ? '箱を開く' : 'あさる';
    tradeButton.hidden = !trade.button.classList.contains('here');
    if (!pending) return;
    const mover = state.actors.find(a => a.id === pending.actorId);
    const list = pending.kind === 'body' ? state.actors : pending.kind === 'box' ? (state.town?.boxes || []) : (state.groundItems || []);
    const item = list.find(entry => entry.id === pending.id);
    if (!mover || !item || ['dead', 'down', 'getup', 'fight'].includes(mover.state) || mover.carriedBy != null || performance.now() - pending.startedAt > 30000 ||
        (state.tick > pending.tick + 2 && mover.moveTo && Math.hypot(mover.moveTo.x - pending.x, mover.moveTo.z - pending.z) > .5)) { pending = null; return; }
    if (Math.hypot(mover.x - item.x, mover.z - item.z) <= pending.reach) {
      const target = { kind: pending.kind, item }; pending = null; perform(mover, target);
    }
  }
  return { update };
}
