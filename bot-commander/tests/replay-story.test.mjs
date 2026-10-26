// 点検 R-02（v1.0.4）: 物語のミッションの ☰「少年をおろす／乗せる」「発射台をつなぐ」「ミサイルを撃つ」と、
// issueBoard／issueAlight を直接出した乗り降り（sim.ride.cmds）が記録に入り、再生で同じ結果になること（一時停止中も・二重に入らないこと）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, stepSim, issueOrder, hashSim, hashSimDeep, applyCommandsNow, TICK } from '../js/sim/sim.js?v=27';
import { tileCenter } from '../js/sim/map.js?v=6';
import { createRecorder, makeStart, openReplay, registerMission, stringifyReplay } from '../js/sim/replay.js?v=10';
import { issueBoard, issueAlight, RIDE_MODE } from '../js/sim/ride.js?v=3';
import { STORY_1 } from '../js/story/story-mission.js?v=3';
import { issueStrike, nejiOf } from '../js/sim/strike.js?v=1';
import { toggleRide } from '../js/story/story-ops.js?v=3';

registerMission(STORY_1); // index.js と同じ

const boyOf = sim => sim.units.find(u => u.human);

/** story1.test の playWin と同じ勝ち方に、☰ の乗り降り（動いている時・一時停止中）と直接の乗り降りを足したもの */
function play(seed, { record = true, direct = false } = {}) {
  const sim = createSim({ seed, mission: STORY_1 });
  const rec = record ? createRecorder(sim, makeStart({ seed, mission: STORY_1 })) : null;
  const step = () => (rec ? rec.step() : stepSim(sim));
  const now = () => (rec ? rec.applyNow() : applyCommandsNow(sim));
  const launch = { tx: 23, ty: 47 };
  const at = (u, t, r) => u && Math.hypot(u.x - tileCenter(t.tx), u.y - tileCenter(t.ty)) <= r * 32;
  let st = 'pre', moved = false; const log = [];
  for (let i = 0; i < 900 / TICK && !sim.result; i++) {
    const n = nejiOf(sim), w = sim.units.find(u => u.label === 'はぐれ');
    // 乗り降り: 動いている時におろす → 一時停止中に乗せる（0 回・2 回の applyNow も混ぜる）
    // 乗り降り（はじめに、ネジが動き出す前）: 動いている時におろす → おり終わったら一時停止中に乗せる（applyNow を 2 回続けて）
    if (st === 'pre') {
      const boy = boyOf(sim);
      if (i === 1) log.push(direct ? issueAlight(sim, [boy.id]) : toggleRide(sim));
      else if (i > 1 && log.length === 1 && !boy.ride && !(boy.dazed > 0)) { log.push(direct ? issueBoard(sim, boy.id, n.id, RIDE_MODE.BACK) : toggleRide(sim)); now(); now(); }
      else if (log.length === 2 && boy.ride) { st = 'dig'; issueOrder(sim, [n.id], [STORY_1.salvage[0]]); }
    }
    else if (st === 'dig') { if (sim.strike.phase !== 'buried') st = 'tow'; }
    else if (st === 'tow' && !n.order && !moved) {
      const g = w && sim.groups.find(g => g.unitIds.includes(w.id));
      if (!w || (g.ai === 'patrol' && (g.routeIdx === 0 || g.routeIdx === 1) && w.y < tileCenter(43))) { moved = true; issueOrder(sim, [n.id], [{ tx: 15, ty: 52 }, launch]); }
    } else if (st === 'tow' && sim.strike.phase === 'ready' && sim.strike.towBy != null && !n.order) {
      if (at(n, launch, 1.2)) { if (issueStrike(sim, tileCenter(31), tileCenter(42)).ok) { st = 'fired'; now(); } } // 撃つのは一時停止中の形で
      else issueOrder(sim, [n.id], [launch]);
    } else if (st === 'survey' || (st === 'fired' && sim.strike.phase === 'spent')) { st = 'survey'; if (!n.order && !at(n, STORY_1.survey, 1)) issueOrder(sim, [n.id], [STORY_1.survey]); }
    step();
  }
  return { sim, rec, log };
}

for (const direct of [false, true]) {
  const how = direct ? 'issueBoard／issueAlight を直接' : '☰ の toggleRide（sim.commands）';
  test(`物語のミッション: ${how}の乗り降り＋発射台＋撃つ、を記録 → 再生で同じ結果（seed 1〜3）`, () => {
    for (const seed of [1, 2, 3]) {
      const a = play(seed, { direct }), b = play(seed, { direct, record: false });
      assert.ok(a.log.every(r => r && (r.ok || r === 1 || typeof r === 'number')), JSON.stringify(a.log));
      assert.equal(hashSim(a.sim), hashSim(b.sim), '記録はシムを変えない');
      assert.equal(hashSimDeep(a.sim), hashSimDeep(b.sim));
      assert.equal(a.sim.result, 'win', `seed ${seed} 勝てる`);
      const snap = a.rec.snapshot();
      const flat = snap.cmds.flatMap(c => c[2].map(p => JSON.stringify(p)));
      const boards = flat.filter(s => s.includes('"board"')).length, alights = flat.filter(s => s.includes('"alight"')).length;
      assert.equal(boards, 1, '乗る命令は 1 回だけ（一時停止中に出しても二重に入らない）');
      assert.equal(alights, 1, 'おりる命令は 1 回だけ');
      assert.equal(flat.filter(s => s.includes('"strike"')).length, 1, '撃つ命令が入っている');
      const o = openReplay(stringifyReplay(snap)) // 文字にして読み直す道も通す;
      assert.ok(o.ok, o.reason);
      const rep = o.player.runAll();
      assert.equal(rep.match, true, `seed ${seed} ${JSON.stringify(rep.first)}`);
      assert.equal(o.sim.result, 'win');
      assert.equal(hashSimDeep(o.sim), hashSimDeep(a.sim));
    }
  });
}
