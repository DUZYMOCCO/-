import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSim as baseCreateSim, stepSim, fieldCount } from '../js/sim/sim.js?v=28';
import { STORY_2_1, STORY_2_2 } from '../js/story/story2-missions.js?v=2';
import { STORY_3_1, STORY_3_2 } from '../js/story/story-3.js?v=2';
import { toggleStory2Ride } from '../js/story/story2-ops.js?v=1';
const createSim = options => baseCreateSim({ ...options, newEnemies: !!options?.mission?.story3 });
const traces = JSON.parse(readFileSync(new URL('./fixtures/story-full-commands.json', import.meta.url), 'utf8'));
const missions = { '2-1': STORY_2_1, '2-2': STORY_2_2, '3-1': STORY_3_1, '3-2': STORY_3_2 };
for (const [stage, mission] of Object.entries(missions)) {
  test(`${stage}: seed 1 の決まった tick の命令列で勝つ`, () => {
    const sim = createSim({ seed: 1, mission }); const commands = traces[stage].flatMap(item => Array.from({ length: (item.end ?? item.tick) - item.tick + 1 }, (_, n) => ({ ...item, tick: item.tick + n }))); let next = 0;
    for (let tick = 0; tick < 18000 && !sim.result; tick++) {
      while (next < commands.length && commands[next].tick === tick) {
        const item = commands[next++];
        if (item.ride) assert.equal(toggleStory2Ride(sim).ok, true);
        else sim.commands.push(structuredClone(item.cmd));
      }
      stepSim(sim);
    }
    assert.equal(sim.result, 'win', `${stage} ${sim.resultReason} tick=${sim.tick}`);
    assert.equal(next, commands.length, '命令列の途中で終わらない');
    if (stage === '3-2') { const mint = sim.units.find(u => u.kind === 'girl'); assert.ok(mint?.ride, 'ミントは自動で乗る'); assert.equal(fieldCount(sim).humans, 2); }
  });
}
test('3章の敵は本物で装甲・挙動も初期化し、通常ミッションには追加しない', () => {
  const sim = createSim({mission: STORY_3_2});
  assert.deepEqual(sim.units.filter(u => u.side === 'enemy').map(u => u.kind), ['G09','G08','G08','G01']);
  assert.ok(sim.ne); assert.equal(sim.units.find(u => u.kind === 'G09').armor, 3);
  const normal = createSim(); assert.equal(normal.ne, undefined); assert.equal(normal.neKinds, undefined);
});
