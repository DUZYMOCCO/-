// 決まった遊び方（動いている時と一時停止中の命令を混ぜる）を記録して、記録の JSON を書き出す。見本・確かめ用。
//   node tools/replay-sample.mjs <出力.json> [seed=1] [tick=3000]
import { writeFileSync } from 'node:fs';
import { createSim, issueOrder, issueStance, issueStop, issueRetreat, issueAttack } from '../js/sim/sim.js?v=28';
import { MISSION_1 } from '../js/sim/mission.js?v=10';
import { createRecorder, makeStart, stringifyReplay } from '../js/sim/replay.js?v=11';

const [outFile, seedArg = '1', tickArg = '3000'] = process.argv.slice(2);
if (!outFile) { console.log('使い方: node tools/replay-sample.mjs <出力.json> [seed] [tick]'); process.exit(2); }
const seed = Number(seedArg), ticks = Number(tickArg);
const sim = createSim({ seed, mapSeed: 7, mission: MISSION_1 });
const rec = createRecorder(sim, makeStart({ seed, mapSeed: 7, mission: MISSION_1 }), { src: 'tools/replay-sample.mjs' });
const ally = sim.units.filter(u => u.side === 'ally' && !u.human).map(u => u.id);
const scav = sim.units.filter(u => u.kind === 'scav').map(u => u.id);
const gun = ally.filter(id => !scav.includes(id)).slice(0, 5);
const E = () => sim.units.find(u => u.side === 'enemy')?.id;
const script = {
  15: () => issueOrder(sim, scav, [{ tx: 8, ty: 42 }]),
  40: () => issueOrder(sim, gun, [{ tx: 15, ty: 47 }, { tx: 18, ty: 40 }]),
  100: () => issueStance(sim, gun, 'free'),
  180: () => { issueOrder(sim, gun, [{ tx: 22, ty: 38 }], { mode: 'rush' }); rec.applyNow(); },   // 一時停止中
  181: () => rec.applyNow(),                                                                      // 一時停止中・命令なし
  400: () => issueAttack(sim, gun, E()),
  520: () => { issueStop(sim, gun.slice(0, 2)); rec.applyNow(); },
  700: () => issueOrder(sim, scav, [{ tx: 32, ty: 38 }]),
  1100: () => issueRetreat(sim, gun.slice(2)),
  1500: () => { issueOrder(sim, scav, [{ tx: 20, ty: 12 }]); issueOrder(sim, gun, [{ tx: 22, ty: 30 }]); },
  2200: () => { issueStance(sim, gun, 'hold'); rec.applyNow(); },
};
for (let t = 0; t < ticks && !rec.done; t++) { script[t]?.(); rec.step(); }
const snap = rec.snapshot();
writeFileSync(outFile, stringifyReplay(snap), { encoding: 'utf8' });
console.log(`書き出しました: ${outFile}（seed ${seed}・${snap.end.tick} tick・命令 ${snap.cmds.length} 件・marks ${snap.marks.length} 個）`);
