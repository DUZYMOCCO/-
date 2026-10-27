// 兵種試作の表・旗・記録（このファイルは作成のみ、実行しない）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_TABLE, CLASS_MULS, classAssignFor, classInfo, classSummary, applyClassToUnit } from '../js/sim/unit-classes.js?v=1';
import { createSim, hashSim, UNIT_CLASSES, KINDS } from '../js/sim/sim.js?v=30';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { makeStart, createSimFromStart } from '../js/sim/replay.js?v=17';
import { createUnitStats, statsHtml } from '../js/stats/unit-stats.js?v=4';

test('兵種の名前・記号・決定済みの視界', () => {
  const classes = UNIT_CLASSES.filter(c => c.key !== 'giant');
  assert.deepEqual(Object.keys(CLASS_TABLE), classes.map(c => c.key));
  for (const c of classes) { assert.equal(classInfo(c.key).name, c.name); assert.equal(classInfo(c.key).mark, c.mark); }
  assert.deepEqual(classes.map(c => classInfo(c.key).sight), [5, 4.5, 8, 5, 6, 6, 5]);
});

test('配置と倍率を表から適用し、迎撃距離は維持', () => {
  assert.equal(classAssignFor('m1', {kind:'ponco',tx:15,ty:55}, 0, 'gunner'), 'scout');
  assert.equal(classAssignFor('m1', {kind:'flyer',tx:1,ty:1}, 0, null), 'scout');
  const u = {side:'ally',kind:'ponco',cls:'scout',sight:5,speed:20,atk:10,maxHp:100,hp:100,shieldMax:40,shieldHp:40};
  applyClassToUnit(u); assert.equal(u.sight, 8); assert.equal(u.engageSight, 5);
  assert.equal(u.maxHp, 85); assert.equal(u.shieldMax, 34); assert.equal(u.speed, 20 * CLASS_MULS.scout.speed);
});

test('旗なしと旗ありのミッション・記録', () => {
  const plain = createSim({seed:1, mission:MISSION_1});
  assert.equal(plain.classes, undefined);
  assert.equal(plain.units.find(u => u.side === 'ally' && u.kind === 'ponco').sight, KINDS.ponco.sight);
  const a = createSim({seed:1, mission:MISSION_1, classes:true}), b = createSim({seed:1, mission:MISSION_1, classes:true});
  const scout = a.units.find(u => u.cls === 'scout');
  assert.equal(a.classes, true); assert.equal(scout.sight, 8); assert.equal(scout.engageSight, KINDS.ponco.sight);
  assert.equal(hashSim(a), hashSim(b));
  assert.equal(Object.hasOwn(makeStart(), 'classes'), false);
  const start = makeStart({classes:true}); assert.equal(start.classes, true);
  assert.equal(createSimFromStart(start).classes, true);
  assert.equal(createSimFromStart(makeStart()).classes, undefined);
});

test('兵種の表示と成績に兵種を任意で足す', () => {
  assert.equal(classSummary([{cls:'scout'}]), 'スカウト');
  assert.equal(classSummary([{cls:'scout'},{cls:'scout'},{cls:'gunner'},{cls:null}]), 'ス2 ガ1');
  assert.equal(classSummary([{cls:null}]), '');
  const unit = {id:1,side:'ally',kind:'ponco',cls:'scout',hp:10,maxHp:10};
  const normal = createUnitStats(); normal.observe({units:[unit],fx:[]});
  assert.equal(Object.hasOwn(normal.summary().rows[0], 'clsName'), false);
  const labeled = createUnitStats({clsNameOf:u => classInfo(u.cls)?.name ?? null}); labeled.observe({units:[unit],fx:[]});
  assert.ok(statsHtml(labeled.summary()).includes('（スカウト）'));
});
