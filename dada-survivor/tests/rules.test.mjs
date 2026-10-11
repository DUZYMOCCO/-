import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS, PASSIVES, CHARACTERS, DIFFICULTIES, MAX_LEVEL, weaponStat, xpToNext, playerStats,
  spawnPlan, pickWeighted, upgradeChoices, normalizeSave, shopCost, STAGES, ENEMY_TYPES, bossType,
  GEAR_SLOTS, RARITIES, rollGear, addGear, equipGear, unequipGear, mergeGear, bonusFor, defaultSave,
  stageUnlocked, charUnlocked, clearRewards,
} from '../js/rules.js';

test('every weapon stat table covers all levels', () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    for (const [key, list] of Object.entries(w)) {
      if (Array.isArray(list)) assert.equal(list.length, MAX_LEVEL, `${id}.${key}`);
    }
    assert.ok(weaponStat(id, 'damage', 1) > 0);
    assert.equal(weaponStat(id, 'damage', 99), w.damage[MAX_LEVEL - 1]);
  }
});

test('characters start with a real weapon', () => {
  for (const c of CHARACTERS) assert.ok(WEAPONS[c.weapon], c.id);
});

test('xp curve grows and stats respond to passives and shop', () => {
  assert.ok(xpToNext(2) > xpToNext(1));
  const base = playerStats();
  const buffed = playerStats({ power: 2, boots: 1, heart: 1, clock: 5 }, { hp: 3, atk: 2 });
  assert.equal(base.maxHp, 100);
  assert.equal(buffed.maxHp, 100 + 20 + 30);
  assert.ok(buffed.damage > base.damage && buffed.speed > base.speed);
  assert.ok(buffed.cooldown >= 0.5 && buffed.cooldown < 1);
});

test('spawning gets harder over time and with difficulty', () => {
  const early = spawnPlan(0), late = spawnPlan(240);
  assert.ok(late.interval < early.interval && late.hpScale > early.hpScale && late.batch >= early.batch);
  assert.equal(early.weights.skull, undefined);
  assert.ok(spawnPlan(60, DIFFICULTIES.easy).interval > spawnPlan(60, DIFFICULTIES.hard).interval);
});

test('pickWeighted never returns a zero-weight entry', () => {
  for (let i = 0; i < 200; i++) assert.notEqual(pickWeighted({ a: 1, b: 0 }), 'b');
  assert.equal(pickWeighted({ a: 1, b: 1 }, () => 0.99), 'b');
});

test('upgrade choices are distinct, upgradable, and fall back when maxed', () => {
  const picks = upgradeChoices({ kunai: 1 }, {});
  assert.equal(picks.length, 3);
  assert.equal(new Set(picks.map(p => p.kind + p.id)).size, 3);
  const kunai = picks.find(p => p.id === 'kunai');
  if (kunai) assert.equal(kunai.level, 2);

  const maxW = Object.fromEntries(Object.keys(WEAPONS).map(k => [k, MAX_LEVEL]));
  const maxP = Object.fromEntries(Object.keys(PASSIVES).map(k => [k, MAX_LEVEL]));
  const fallback = upgradeChoices(maxW, maxP);
  assert.deepEqual(fallback.map(p => p.kind), ['food', 'coin']);
});

test('save data is normalized', () => {
  const s = normalizeSave({ coins: '12.7', character: 'nope', difficulty: 'hard', shop: { hp: 2 } });
  assert.equal(s.coins, 12);
  assert.equal(s.character, 'cat');
  assert.equal(s.difficulty, 'hard');
  assert.deepEqual(s.shop, { hp: 2, atk: 0, spd: 0 });
  assert.equal(normalizeSave(null).difficulty, 'easy');
  assert.ok(shopCost(1) > shopCost(0));
});

test('every stage uses known enemies and bosses get stage hp', () => {
  for (const st of STAGES) {
    for (const [type] of st.enemies) assert.ok(ENEMY_TYPES[type]?.hp > 0, `${st.id}:${type}`);
    for (const def of [st.mini, st.boss]) {
      const T = bossType(def, DIFFICULTIES.easy);
      assert.ok(T.boss && T.hp === def.hp * DIFFICULTIES.easy.enemyHp && T.name, `${st.id}:${def.type}`);
    }
    assert.ok(Object.keys(spawnPlan(0, DIFFICULTIES.normal, st).weights).length > 0);
  }
  assert.ok(spawnPlan(60, DIFFICULTIES.normal, STAGES[4]).hpScale > spawnPlan(60, DIFFICULTIES.normal, STAGES[0]).hpScale);
});

test('gear can be equipped, swapped, merged and adds to stats', () => {
  const s = defaultSave();
  addGear(s, { slot: 'weapon', rarity: 0 }); addGear(s, { slot: 'weapon', rarity: 0 }); addGear(s, { slot: 'weapon', rarity: 0 });
  assert.ok(mergeGear(s, 'weapon', 0));
  assert.deepEqual(s.gear.inv.weapon.slice(0, 2), [0, 1]);
  assert.ok(equipGear(s, 'weapon', 1));
  assert.equal(s.gear.equip.weapon, 1);
  assert.equal(bonusFor(s, 'cat').dmg, GEAR_SLOTS.weapon.values[1]);
  assert.ok(unequipGear(s, 'weapon'));
  assert.equal(s.gear.inv.weapon[1], 1);
  assert.equal(equipGear(s, 'armor', 0), false);
  const g = rollGear(() => 0.999);
  assert.ok(GEAR_SLOTS[g.slot] && g.rarity === RARITIES.length - 1);
  assert.ok(playerStats({}, {}, bonusFor(s, 'bear')).maxHp > playerStats().maxHp);
});

test('stages and characters unlock by clearing, and old saves migrate', () => {
  const s = normalizeSave({ coins: 5, clears: 2, character: 'rabbit', stage: 3 });
  assert.equal(s.stageClears[1], 2);
  assert.ok(stageUnlocked(s, 2) && !stageUnlocked(s, 3));
  assert.equal(s.stage, 1);
  assert.equal(s.character, 'rabbit');
  assert.ok(!charUnlocked(s, CHARACTERS.find(c => c.id === 'penguin')));
  assert.deepEqual(clearRewards(s, 1, 'easy'), { chests: 1, first: false });
  assert.deepEqual(clearRewards(s, 2, 'hard'), { chests: 3, first: true });
  const fresh = normalizeSave({ gear: { inv: { weapon: [2, '1'] }, equip: { weapon: 9 } }, pendingChests: '2' });
  assert.deepEqual(fresh.gear.inv.weapon, [2, 1, 0, 0, 0]);
  assert.equal(fresh.gear.equip.weapon, -1);
  assert.equal(fresh.pendingChests, 2);
});
