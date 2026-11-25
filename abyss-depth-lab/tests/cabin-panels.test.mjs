import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createResourceLedger } from '../js/resources.js';
import { createUpgradeStore, createUpgradePanel } from '../js/upgrade-rules.js';
import { createArsenalStore, createWeaponPanel, rollItem, designItem } from '../js/weapon-rules.js';
import { createAdvancedStore, createForgePanel, fireBeam, advanceProjectile, shotParams, initialShot } from '../js/advanced-weapons.js';
import { createWarehousePanel, createEnhanceHubPanel, createDevelopPanel } from '../js/cabin-panels.js';
import { BASE_MENU, menuActionLabel, rowActionLabel } from '../js/base-rules.js';

function makeEnv(startRes = 2000) {
  let hull = 60;
  const maxHull = 100;
  const ledger = createResourceLedger({});
  if (startRes > 0) ledger.add(startRes);
  const upg = createUpgradeStore({});
  const upgradePanel = createUpgradePanel({
    store: upg,
    ledger,
    hull: () => hull,
    maxHull: () => maxHull,
    onRepair: (v) => { hull = v; },
  });
  const arsenal = createArsenalStore({});
  const weaponPanel = createWeaponPanel({ store: arsenal, ledger });
  const adv = createAdvancedStore({});
  const forgePanel = createForgePanel({ store: adv, ledger, armory: arsenal, designWeapon: designItem });
  return {
    ledger, upg, arsenal, adv,
    upgradePanel, weaponPanel, forgePanel,
    warehouse: createWarehousePanel({ weaponPanel, forgePanel }),
    enhanceHub: createEnhanceHubPanel({ upgradePanel, weaponPanel, forgePanel }),
    develop: createDevelopPanel({ weaponPanel, forgePanel }),
  };
}

describe('BASE_MENU separation', () => {
  it('exposes warehouse, enhance, develop, ship, depart in order', () => {
    const ids = BASE_MENU.map(m => m.id);
    assert.deepEqual(ids, ['warehouse', 'enhance', 'develop', 'ship', 'depart']);
    assert.equal(menuActionLabel('warehouse'), '倉庫・換装を開く');
    assert.equal(menuActionLabel('enhance'), '強化・整備を開く');
    assert.equal(menuActionLabel('develop'), '開発・製作を開く');
    assert.equal(rowActionLabel('warehouse', { kind: 'item' }), '装備する');
    assert.equal(rowActionLabel('enhance', { kind: 'repair' }), '修理する');
    assert.equal(rowActionLabel('enhance', { kind: 'item' }), '強化する');
    assert.equal(rowActionLabel('develop', { kind: 'make' }), '製作する');
    assert.equal(rowActionLabel('develop', { kind: 'design' }), '設計へ進む');
  });
});

describe('createWarehousePanel (倉庫・換装)', () => {
  it('shows ONLY owned items and excludes make/design rows', () => {
    const env = makeEnv();
    env.warehouse.open();
    const rows = env.warehouse.rows();
    assert.ok(rows.length > 0);
    assert.equal(rows.some(r => r.kind === 'make' || r.kind === 'design'), false);
    assert.equal(rows.some(r => r.source === 'weapon'), true);
    assert.equal(rows.some(r => r.source === 'forge'), true);

    env.warehouse.setTab('basic');
    assert.ok(env.warehouse.rows().every(r => r.category === 'basic'));
    env.warehouse.setTab('adv');
    assert.ok(env.warehouse.rows().every(r => r.category === 'adv'));
    env.warehouse.setTab('melee');
    assert.ok(env.warehouse.rows().every(r => r.category === 'melee'));
  });

  it('can equip and double-tap sell a crafted weapon from warehouse', () => {
    const env = makeEnv(2000);
    const added = env.arsenal.add(rollItem('torpedo', () => 0.5));
    const craftedId = added.item.id;

    env.warehouse.open();
    env.warehouse.setTab('basic');
    const idx = env.warehouse.rows().findIndex(r => r.item && r.item.id === craftedId);
    assert.ok(idx >= 0, 'crafted weapon appears in warehouse');

    env.warehouse.setCursor(idx);
    const eqRes = env.warehouse.activate();
    assert.equal(eqRes.ok, true);
    assert.equal(env.arsenal.equippedId('torpedo'), craftedId);

    // Equip back initial torpedo so crafted becomes sellable
    const initIdx = env.warehouse.rows().findIndex(r => r.initial && r.type === 'torpedo');
    env.warehouse.setCursor(initIdx);
    env.warehouse.activate();

    const sellIdx = env.warehouse.rows().findIndex(r => r.item && r.item.id === craftedId);
    env.warehouse.setCursor(sellIdx);
    const preview = env.warehouse.sellPreview();
    assert.ok(preview && preview.amount > 0);
    // Double-tap sell confirmation
    const s1 = env.warehouse.sell();
    assert.equal(s1.armed, true);
    const s2 = env.warehouse.sell();
    assert.equal(s2.ok, true);
    assert.equal(env.warehouse.rows().some(r => r.item && r.item.id === craftedId), false);
  });
});

describe('createEnhanceHubPanel (強化・整備)', () => {
  it('separates ship maintenance tab and weapon enhance tab', () => {
    const env = makeEnv(3000);
    env.enhanceHub.open();
    assert.equal(env.enhanceHub.tab(), 'ship');
    assert.ok(env.enhanceHub.rows().some(r => r.kind === 'repair'));
    assert.ok(env.enhanceHub.rows().some(r => r.kind === 'upgrade'));

    // Initially no enhanceable weapons (initial stock cannot be enhanced)
    env.enhanceHub.setTab('weapon');
    assert.equal(env.enhanceHub.rows().length, 0);

    // Add a crafted torpedo -> appears in weapon enhance tab
    const added = env.arsenal.add(rollItem('torpedo', () => 0.5));
    assert.equal(env.enhanceHub.rows().length, 1);
    assert.equal(env.enhanceHub.rows()[0].item.id, added.item.id);

    const before = env.ledger.total();
    const res = env.enhanceHub.activate();
    assert.equal(res.ok, true);
    assert.ok(env.ledger.total() < before);
    assert.equal(env.enhanceHub.rows()[0].enh, 1);
  });
});

describe('createDevelopPanel (開発・製作)', () => {
  it('shows ONLY make and design rows, and supports random craft & custom design flow', () => {
    const env = makeEnv(5000);
    env.develop.open();
    const rows = env.develop.rows();
    assert.ok(rows.length >= 2);
    assert.ok(rows.every(r => r.kind === 'make' || r.kind === 'design'));

    // Random craft torpedo
    const makeIdx = rows.findIndex(r => r.kind === 'make');
    env.develop.setCursor(makeIdx);
    const makeRes = env.develop.activate();
    assert.equal(makeRes.ok, true);
    assert.equal(makeRes.type, 'make');

    // Open custom design screen
    const designIdx = env.develop.rows().findIndex(r => r.kind === 'design');
    assert.ok(designIdx >= 0);
    env.develop.setCursor(designIdx);
    env.develop.activate();
    assert.equal(env.develop.screen(), 'design');
    assert.ok(env.develop.rows().some(r => r.kind === 'confirm'));

    // Back returns to list without closing develop panel
    env.develop.back();
    assert.equal(env.develop.screen(), 'list');
    assert.equal(env.develop.isOpen(), true);
  });
});

describe('laser/reftorp/melee stats & hit target resolution (v3.7.1)', () => {
  it('exposes real numeric params on laser, reftorp, and melee rows in warehouse', () => {
    const env = makeEnv(2000);
    env.warehouse.open();
    env.warehouse.setTab('adv');
    const advRows = env.warehouse.rows();
    const laser = advRows.find(r => r.typeId === 'laser');
    const reflaser = advRows.find(r => r.typeId === 'reflaser');
    const reftorp = advRows.find(r => r.typeId === 'reftorp');
    assert.ok(laser && laser.params && laser.params.dmg > 0 && laser.params.range > 0);
    assert.ok(reflaser && reflaser.params && reflaser.params.dmg > 0 && reflaser.params.maxReflect === 1);
    assert.ok(reftorp && reftorp.params && reftorp.params.dmg > 0 && reftorp.params.speed > 0);

    env.warehouse.setTab('melee');
    const meleeRows = env.warehouse.rows();
    assert.ok(meleeRows.length > 0);
    for (const m of meleeRows) {
      assert.ok(m.params && m.params.reach > 0 && (m.params.power > 0 || m.params.dps > 0));
    }
  });

  it('fireBeam and advanceProjectile hit ref unwraps to the actual enemy object', () => {
    const realEnemy = { id: 'e1', x: 200, y: 0, r: 24, hp: 50, dead: false };
    const wrappedTargets = [{ kind: 'circle', x: realEnemy.x, y: realEnemy.y, r: realEnemy.r, ref: realEnemy }];

    const beamShot = shotParams('laser', initialShot('laser'));
    const tr = fireBeam(0, 0, 0, wrappedTargets, [], beamShot);
    assert.equal(tr.hits.length, 1);
    const hit = tr.hits[0];
    assert.equal(hit.kind, 'target');
    const resolved = (hit.ref && hit.ref.ref) ? hit.ref.ref : hit.ref;
    assert.equal(resolved, realEnemy);

    const rr = advanceProjectile({ x: 0, y: 0, vx: 800, vy: 0, life: 1, reflected: 0, dead: false }, 0.5, {
      solids: [], targets: wrappedTargets, maxReflect: 1,
    });
    assert.equal(rr.p.dead, true);
    const lastHit = rr.hits[rr.hits.length - 1];
    const resolvedTorp = (lastHit.ref && lastHit.ref.ref) ? lastHit.ref.ref : lastHit.ref;
    assert.equal(resolvedTorp, realEnemy);
  });
});
