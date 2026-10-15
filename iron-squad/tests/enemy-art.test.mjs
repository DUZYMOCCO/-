import assert from 'node:assert/strict';
import test from 'node:test';
import { ENEMY_ROSTER, ENEMY_ART, drawEnemyArt } from '../js/enemy-art.js';

const EXPECTED_IDS = [
  'road_archer',
  'bandit_rider',
  'wild_dog',
  'plains_bull',
  'salt_scorpion',
  'sand_worm',
  'salt_mummy',
  'dust_spirit',
  'goat_ogre',
  'snow_wolf',
  'rock_troll',
  'harpy',
  'bog_slime',
  'giant_frog',
  'lizard_spearman',
  'marsh_wisp',
  'wraith',
  'vampire_bat',
  'imp',
  'demon_lancer',
  'demon_mage',
  'hellhound'
];

function createMockContext() {
  const calls = [];
  let saveCount = 0;
  let restoreCount = 0;
  const noop = () => {};

  const ctx = new Proxy({
    measureText: () => ({ width: 40 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    save: () => {
      saveCount++;
      calls.push({ method: 'save' });
    },
    restore: () => {
      restoreCount++;
      calls.push({ method: 'restore' });
    }
  }, {
    get: (o, k) => {
      if (k in o) return o[k];
      return (...args) => {
        calls.push({ method: k, args });
      };
    },
    set: (o, k, val) => {
      o[k] = val;
      return true;
    }
  });

  return {
    ctx,
    calls,
    getBalancedState: () => saveCount === restoreCount,
    saveCount: () => saveCount,
    restoreCount: () => restoreCount
  };
}

test('ENEMY_ROSTER defines all 22 required enemy types with complete metadata', () => {
  assert.equal(ENEMY_ROSTER.length, 22, 'Roster must contain exactly 22 enemy types');

  const rosterIds = ENEMY_ROSTER.map(e => e.id);
  assert.equal(new Set(rosterIds).size, 22, 'All roster IDs must be unique');

  for (const expectedId of EXPECTED_IDS) {
    assert.ok(rosterIds.includes(expectedId), `Roster must contain '${expectedId}'`);
  }

  for (const entry of ENEMY_ROSTER) {
    assert.ok(typeof entry.id === 'string' && entry.id.length > 0, `Valid id for ${entry.id}`);
    assert.ok(typeof entry.name === 'string' && entry.name.length > 0, `Valid name for ${entry.id}`);
    assert.ok(typeof entry.region === 'string' && entry.region.length > 0, `Valid region for ${entry.id}`);
    assert.ok(typeof entry.radius === 'number' && entry.radius > 0, `Positive radius for ${entry.id}`);
    assert.ok(typeof entry.desc === 'string' && entry.desc.length > 0, `Valid desc for ${entry.id}`);
  }
});

test('ENEMY_ART dictionary maps all 22 types to dedicated drawing functions', () => {
  assert.equal(Object.keys(ENEMY_ART).length, 22, 'ENEMY_ART must have 22 entries');

  for (const entry of ENEMY_ROSTER) {
    const fn = ENEMY_ART[entry.id];
    assert.equal(typeof fn, 'function', `ENEMY_ART[${entry.id}] must be a function`);
  }
});

test('drawEnemyArt returns false for unknown, null, or invalid mobs', () => {
  const { ctx } = createMockContext();

  assert.equal(drawEnemyArt(ctx, null), false);
  assert.equal(drawEnemyArt(ctx, undefined), false);
  assert.equal(drawEnemyArt(ctx, {}), false);
  assert.equal(drawEnemyArt(ctx, { type: '' }), false);
  assert.equal(drawEnemyArt(ctx, { type: 'unknown_goblin_99' }), false);
  assert.equal(drawEnemyArt(ctx, { type: 'dragon' }), false, 'Existing mobs not handled by enemy-art return false');
});

test('drawEnemyArt renders all 22 types under normal, flashing, and facing-left states with balanced Canvas state', () => {
  for (const entry of ENEMY_ROSTER) {
    const testVariations = [
      { name: 'normal', mob: { type: entry.id, radius: entry.radius, x: 50, y: 50, facingAngle: 0, hitPulse: 0 } },
      { name: 'flashing', mob: { type: entry.id, radius: entry.radius, x: 50, y: 50, facingAngle: 0, hitPulse: 1 } },
      { name: 'facing-left', mob: { type: entry.id, radius: entry.radius, x: 50, y: 50, facingAngle: Math.PI, hitPulse: 0 } },
      { name: 'facing-left + flash', mob: { type: entry.id, radius: entry.radius, x: 50, y: 50, facingAngle: -Math.PI * 0.75, hitPulse: 0.5 } }
    ];

    for (const { name, mob } of testVariations) {
      const mock = createMockContext();
      const mobBefore = structuredClone(mob);

      const drawn = drawEnemyArt(mock.ctx, mob, 1250);
      assert.equal(drawn, true, `drawEnemyArt must return true for ${entry.id} (${name})`);
      assert.deepEqual(mob, mobBefore, `drawEnemyArt must not mutate mob object for ${entry.id} (${name})`);
      assert.ok(mock.calls.length > 0, `Canvas methods must be invoked for ${entry.id} (${name})`);
      assert.ok(
        mock.getBalancedState(),
        `Canvas save/restore must balance for ${entry.id} (${name}) (saves: ${mock.saveCount()}, restores: ${mock.restoreCount()})`
      );
    }
  }
});
