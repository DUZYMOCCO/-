// フラグなしの時、KINDS（機体の表）に新しい敵が 1 つも無い。?newenemies=1（createSim({ newEnemies: true })）の時も KINDS には足さず、そのシムの sim.neKinds にだけ入る（正本 v1.0.5 の形）。
// 表はモジュールの中の状態なので、ほかのテストと混ざらないよう、このファイルだけで確かめる（node --test は 1 ファイル 1 プロセス）。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/sim/sim.js?v=27';
import * as M from '../js/sim/mission.js?v=10';
import * as NE from '../js/sim/new-enemies.js?v=2';

const IDS = NE.NE_IDS;
test('読み込んだだけでは KINDS に新しい敵は無い（引けない・列挙にも出ない・凍っている）', () => {
  for (const id of IDS) { assert.equal(S.KINDS[id], undefined, `${id} は無い`); assert.equal(id in S.KINDS, false); }
  assert.deepEqual(Object.keys(S.KINDS).filter(k => IDS.includes(k)), []);
  assert.ok(Object.isFrozen(S.KINDS));
  assert.equal(S.isHuman('G01'), false);
});

test('フラグなしで作っても、KINDS に新しい敵は入らない（ハッシュは今までと同じ）', () => {
  const HASH300 = { 1: '6cc93eb6', 2: '2a60b985', 3: '24994a28', 4: '5558d677', 5: '6e46d4aa' };
  for (const seed of [1, 2, 3, 4, 5]) {
    const sim = S.createSim({ seed, mission: M.MISSION_1 }); S.runSim(sim, 300);
    assert.equal(S.hashSim(sim), HASH300[seed]);
    for (const id of IDS) assert.equal(S.KINDS[id], undefined, `${id} は無い`);
  }
  S.createSim({ seed: 1 }); S.createSim({ seed: 1, newEnemies: false });
  for (const id of IDS) assert.equal(S.KINDS[id], undefined);
});

test('フラグありで作っても KINDS は変わらず、14 種はそのシムの sim.neKinds にだけ入る（正本の形 v1.0.5〜）', () => {
  const before = Object.keys(S.KINDS);
  const sim = S.createSim({ seed: 1, mission: M.MISSION_1, newEnemies: true });
  assert.equal(sim.units.filter(u => u.side === 'enemy').length, 14);
  for (const id of IDS) { assert.equal(S.KINDS[id], undefined, `${id} は KINDS に無い`); assert.equal(sim.neKinds[id], NE.NEW_ENEMY_KINDS[id], `${id} は sim.neKinds にある`); }
  assert.deepEqual(Object.keys(S.KINDS), before);
  assert.ok(Object.isFrozen(S.KINDS));
  assert.equal(S.KINDS.alien.hp, 360); assert.equal(S.KINDS.ponco.hp, 120);
  assert.ok(S.weaponInfo('G01'), '武器の表から引ける');
  assert.equal(S.createSim({ seed: 1, mission: M.MISSION_1 }).neKinds, undefined);
});
