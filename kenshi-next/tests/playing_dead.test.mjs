import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, makeActor } from '../js/sim/world.js';
import { updateBody, koStatusText } from '../js/sim/body.js';
import { updateAbduct, treatTick, FEIGN_TREAT_SPEED } from '../js/sim/abduct.js';
import { applyCommand, applyQueuedCommands } from '../js/sim/commands.js';
import { availableActions } from '../js/sim/actions.js';
import { step } from '../js/sim/step.js';
import { canSee } from '../js/sim/stealth.js';

function setup(sneaking = true) {
  const state = createWorld(5, { spawn: false });
  const actor = state.actors.find(a => a.id === state.playerId);
  state.actors = [actor];
  Object.assign(actor, { state: 'down', anim: 'Fall', downTicks: 0, coma: false, sneaking, carriedBy: null, bound: null, bleed: 1, gush: 0, stumpBleed: 0, task: null });
  return { state, actor, events: [] };
}

test('conscious sneaking squad member plays dead and treats own bleeding while prone', () => {
  const { state, actor, events } = setup();
  updateBody(state, events);
  assert.equal(actor.playingDead, true);
  assert.equal(koStatusText(actor), '死んだフリ');
  assert.ok(availableActions(state, [actor.id], actor).includes('wakeUp'));
  const bleeding = actor.bleed;
  updateAbduct(state, events);
  assert.ok(actor.bleed < bleeding);
  assert.equal(actor.state, 'down');
  assert.equal(actor.anim, 'Fall');
  assert.equal(actor.task?.selfFeign, true);
});

test('wake command starts getting up without immediately playing dead again', () => {
  const { state, actor, events } = setup();
  updateBody(state, events);
  updateAbduct(state, events);
  assert.equal(applyCommand(state, { type: 'wakeUp', actorId: actor.id }), true);
  applyQueuedCommands(state, events);
  updateBody(state, events);
  assert.equal(actor.state, 'getup');
  assert.equal(actor.playingDead, false);
  assert.equal(actor.task, null);
  assert.equal(actor.sneaking, true);
});

test('normal recovery gets up and incapacitated or carried characters cannot self-treat', () => {
  const normal = setup(false);
  updateBody(normal.state, normal.events);
  assert.equal(normal.actor.state, 'getup');
  const noArms = setup();
  noArms.actor.parts.lArm.hp = 0; noArms.actor.parts.rArm.hp = 0;
  updateBody(noArms.state, noArms.events);
  const before = noArms.actor.bleed;
  updateAbduct(noArms.state, noArms.events);
  assert.equal(noArms.actor.bleed, before);
  noArms.actor.carriedBy = 999;
  updateBody(noArms.state, noArms.events);
  assert.equal(noArms.actor.playingDead, false);
});

test('movement command crawls in stealth and wake still works afterward', () => {
  const { state, actor, events } = setup();
  actor.bleed = 0;
  updateBody(state, events);
  const x = actor.x, z = actor.z;
  assert.equal(applyCommand(state, { type: 'move', actorId: actor.id, x: x + 5, z }), true);
  for (let i = 0; i < 25; i++) step(state);
  assert.ok(actor.x > x + .1);
  assert.equal(actor.crawling, true);
  assert.equal(actor.playingDead, true);
  assert.equal(actor.sneaking, true);
  assert.ok(availableActions(state, [actor.id], actor).includes('wakeUp'));
  applyCommand(state, { type: 'wakeUp', actorId: actor.id });
  step(state);
  assert.equal(actor.state, 'getup');
  assert.equal(actor.playingDead, false);
  assert.equal(actor.crawling, false);
});

test('feigning character can crawl to an ally and treat them', () => {
  const { state, actor, events } = setup();
  actor.bleed = 0;
  const patient = makeActor(state, 'player', actor.x + 3, actor.z, null, false);
  state.actors.push(patient); state.squadIds.push(patient.id);
  Object.assign(patient, { state: 'down', downTicks: 1000, coma: false, carriedBy: null, bleed: 2, gush: 0, stumpBleed: 0 });
  updateBody(state, events);
  applyCommand(state, { type: 'treat', actorId: actor.id, targetId: patient.id });
  for (let i = 0; i < 350; i++) step(state);
  assert.equal(patient.bleed, 0);
  assert.equal(actor.playingDead, true);
  assert.equal(actor.crawling, true);
  assert.equal(actor.sneaking, true);
});

test('feigning reduces bleeding and wound treatment to half without changing kit drain', () => {
  const { state, actor, events } = setup();
  actor.task = { type: 'treat', targetId: actor.id };
  actor.skills.medic = 20;
  actor.kits = [{ tier: 'standard', dur: 400 }];
  const normal = structuredClone(actor), feigning = structuredClone(actor);
  normal.playingDead = false; feigning.playingDead = true;
  normal.bleed = feigning.bleed = 10;
  treatTick(state, normal, normal, events);
  treatTick(state, feigning, feigning, events);
  assert.ok(Math.abs((10 - feigning.bleed) / (10 - normal.bleed) - FEIGN_TREAT_SPEED) < 1e-9);
  assert.equal(normal.kits[0].dur, feigning.kits[0].dur);
  normal.bleed = feigning.bleed = 0;
  normal.parts.head.hp = feigning.parts.head.hp = 50;
  normal.parts.head.treated = feigning.parts.head.treated = 0;
  treatTick(state, normal, normal, events);
  treatTick(state, feigning, feigning, events);
  assert.ok(Math.abs(feigning.parts.head.treated / normal.parts.head.treated - FEIGN_TREAT_SPEED) < 1e-9);
});

test('motionless feigning hides from an enemy, but detected movement can be attacked', () => {
  const { state, actor, events } = setup();
  actor.bleed = 0;
  const enemy = makeActor(state, 'bandit', actor.x + 2, actor.z, null, false);
  state.actors.push(enemy);
  Object.assign(enemy, { targetId: null, waitTargetId: null, carryingId: null, state: 'idle', rot: -Math.PI / 2 });
  actor.detect = { [enemy.id]: 1 };
  updateBody(state, events);
  assert.equal(canSee(state, enemy, actor), false);
  applyCommand(state, { type: 'move', actorId: actor.id, x: actor.x + 6, z: actor.z });
  let engaged = false;
  const before = Object.values(actor.parts).reduce((sum, part) => sum + part.hp, 0);
  for (let i = 0; i < 150; i++) { step(state); engaged ||= enemy.targetId === actor.id; }
  assert.ok(engaged);
  assert.ok(Object.values(actor.parts).reduce((sum, part) => sum + part.hp, 0) < before);
});
