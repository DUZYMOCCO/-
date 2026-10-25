// 高さ（js/sim/altitude.js）を入れる前後で、今のミッションの結果が1つも変わらないことを確かめるためのシナリオ。
// make-altitude-baseline.mjs が「入れる前」のコード（backup_bot-commander_pre_altitude_1319）でこれを回し、
// altitude-baseline.json に書いた。tests/altitude.test.mjs が今のコードで回して、同じになることを確かめる。
// S = sim.js のモジュール、M = mission.js のモジュール
// opts: createSim に足す引数（例: { shieldTable }。前の表で回すと入れる前の値に戻る）。省けば今の表
export function runScenarios(S, M, opts = {}) {
  const out = {};
  const rec = (name, sim, every, steps, act) => {
    const hs = [];
    for (let i = 0; i < steps; i++) {
      if (act) act(sim, i);
      S.stepSim(sim);
      if ((i + 1) % every === 0) hs.push(S.hashSim(sim));
    }
    out[name] = { hashes: hs, result: sim.result, units: sim.units.length, hp: sim.units.map(u => Math.round(u.hp * 100)) };
  };
  // 1) ミッションなしの撃ち合い（全員迎撃で敵の本陣へ）
  for (const seed of [1, 2, 3]) {
    const sim = S.createSim({ seed, ...opts });
    const ids = S.allyUnits(sim).map(u => u.id);
    S.issueStance(sim, ids, 'free');
    S.issueOrder(sim, ids, [{ tx: sim.map.hq.enemy.tx, ty: sim.map.hq.enemy.ty + 4 }]);
    rec(`skirmish_${seed}`, sim, 150, 4800);
  }
  // 2) ミッション1: 命令なし
  for (const seed of [1, 4]) rec(`m1_idle_${seed}`, S.createSim({ seed, mission: M.MISSION_1, ...opts }), 300, 3600);
  // 3) ミッション1: 資材を回る → 途中で攻撃・撤退・止まる（遮蔽物・盾・キット・拾う、を通す）
  for (const seed of [1, 2, 5, 9]) {
    const sim = S.createSim({ seed, mission: M.MISSION_1, ...opts });
    const sal = sim.mission.salvage, ex = sim.mission.extraction;
    rec(`m1_macro_${seed}`, sim, 300, 6000, (s, i) => {
      const al = S.allyUnits(s).filter(u => !u.human), ids = al.map(u => u.id);
      if (i === 0) S.issueOrder(s, ids, [{ tx: sal[0].tx, ty: sal[0].ty }]);
      if (i === 900) S.issueOrder(s, ids, [{ tx: sal[1].tx, ty: sal[1].ty }], { mode: 'rush' });
      if (i === 1500) { const e = s.units.find(u => u.side === 'enemy'); if (e) S.issueAttack(s, ids.slice(0, 6), e.id); }
      if (i === 2100) S.issueRetreat(s, ids.slice(0, 3));
      if (i === 2400) S.issueOrder(s, ids, [{ tx: sal[3].tx, ty: sal[3].ty }, { tx: sal[2].tx, ty: sal[2].ty }]);
      if (i === 4200) S.issueStop(s, ids.slice(6));
      if (i === 4500) S.issueOrder(s, ids, [{ tx: ex.tx, ty: ex.ty }]);
    });
  }
  return out;
}
