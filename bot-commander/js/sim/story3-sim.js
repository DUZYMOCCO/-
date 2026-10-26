// 第 3 章「最初のひとり」（物語の試作・URL に ?storych=3 を付けた時だけ）のミッション 3-1・3-2 の仕掛け。数値は全部【仮】でここで調整する。
// データと計算だけ（DOM・Pixi・乱数なし）。mission.story3 がある時だけ sim.story3 ができて、無ければ stepStory3・checkStory3Result・hashSim の追加分は何もしない。
//
// 3-1「スーツの はつじん」: スーツ A を着た少年・ネジ・PONCO02 で隣町の門まで行き、見張りがいなくなってから門の張り紙を調べる（gate）。
// 3-2「最初のひとり」: 倒れたビルの入口の G09 を倒すとミントが見つかる（仲間になる）→ G08 が捕まえて巣へ運ぶ → 運ぶ敵を倒して取り返す
//   → PONCO02 の背中に乗せて脱出口（隣町の門）まで送る。もう 1 体の G08 はロウ（遠ぼえ）が引き離した、という筋で遠くに置く（ロウの姿は出さない）。
// 勝ち: 3-1 は張り紙を調べ終える／3-2 はミントを脱出口へ。負け: ネジが壊れる・少年が倒れる／捕まる・（3-2）ミントが巣にいて PONCO02 もいない。
// 乱数は 1 回も引かない。sim.js が呼ぶ（stepSim・checkResult・hashSim・createSim）。
import { TILE, tileCenter, toTile } from './map.js?v=6';
import { EXTRACT_RADIUS } from './mission.js?v=10';
import { applyPowersuitCommand, stepPowersuit } from './powersuit.js?v=1';
import { canBoard, RIDE_MODE } from './ride.js?v=3';

export const STORY3 = Object.freeze({
  surveyBlockTiles: 5,   // 張り紙を調べる: 敵がこのマス以内にいると進まない
  surveyRadius: 1.6,     // この半径（マス）にいる止まった味方が調べる
  towerNearTiles: 3.5,   // 3-2: 入口の敵がいなくなったあと、ビルからこのマス以内に味方が来るとミントが見つかる
  retry: 1.2,            // ミントが PONCO02 のほうへ歩く命令を出し直す間隔（秒）
});
export const STORY3_STAGES = Object.freeze(['3-1', '3-2']);
const PHASE_CODE = Object.freeze({ guard: 1, found: 2, escort: 3, done: 4 });

const byId = (sim, id) => (id == null ? null : sim.units.find(u => u.id === id) || null);
const aliveLabel = (sim, label) => sim.units.some(u => u.side === 'enemy' && u.hp > 0 && u.label === label);
const ponco02Of = sim => sim.units.find(u => u.side === 'ally' && u.kind === 'ponco' && u.hp > 0) || null;

/** createSim が呼ぶ（mission.story3 がある時だけ）。スーツは createSim が initPowersuit で作ってある。少年は出撃前に着終えている */
export function initStory3(sim, mission) {
  const c = mission.story3;
  const boy = sim.units.find(u => u.side === 'ally' && u.kind === 'boy');
  sim.story3 = {
    stage: c.stage, enemyStart: sim.units.filter(u => u.side === 'enemy').length,
    gate: c.gate ? { tx: c.gate.tx, ty: c.gate.ty, amount: c.gate.amount, max: c.gate.amount, blocked: false, done: false, doneAt: null } : null,
    mint: c.mint ? { phase: 'guard', id: null, tower: { tx: c.mint.tower.tx, ty: c.mint.tower.ty }, guard: c.mint.guard, carrier: c.mint.carrier, moveT: 0, everCaptured: false, doneAt: null } : null,
  };
  // 敵の強さ（1 台のロボとスーツの少年で戦える大きさにする）: 名前 → HP の倍率。G09 は重いので大きめ
  if (c.hpMul) for (const e of sim.units) if (e.side === 'enemy' && c.hpMul[e.label]) { e.maxHp = Math.round(e.maxHp * c.hpMul[e.label]); e.hp = e.maxHp; }
  // 倒れたビル: 遮蔽物の何番目かをがれきにしておく（絵は _destroyed）
  if (c.rubble != null && sim.cover[c.rubble]) { const cv = sim.cover[c.rubble]; cv.hp = 0; cv.state = 'rubble'; }
  if (boy && sim.powersuit) {
    applyPowersuitCommand(sim, { type: 'suitDon', humanId: boy.id });
    stepPowersuit(sim, 1); // 出撃前に着終える（時刻・乱数は進めない）
  }
}

/** 毎ステップ（sim.js の stepSim が updateMission のあとで呼ぶ）。api: { deployUnit, gatherOf, isStunned } */
export function stepStory3(sim, dt, api) {
  const S = sim.story3; if (!S) return;
  if (S.gate) stepGate(sim, dt, api);
  if (S.mint) stepMint(sim, dt, api);
}

/** 3-1: 門の張り紙を調べる。調べる場所のそばで止まっている味方が進める。敵が近いと進まない（1 章の設計図のありかと同じ形） */
function stepGate(sim, dt, api) {
  const g = sim.story3.gate; if (g.done) return;
  const px = tileCenter(g.tx), py = tileCenter(g.ty);
  g.blocked = sim.units.some(u => u.side === 'enemy' && u.hp > 0 && Math.hypot(u.x - px, u.y - py) <= STORY3.surveyBlockTiles * TILE);
  if (g.blocked) return;
  const r = STORY3.surveyRadius * TILE;
  const near = sim.units.filter(u => u.side === 'ally' && !u.object && u.captured == null && !u.order && !api.isStunned(u) && api.gatherOf(u) > 0 && Math.hypot(u.x - px, u.y - py) <= r);
  if (!near.length) return;
  g.amount = Math.max(0, g.amount - near.reduce((a, u) => a + api.gatherOf(u), 0) * dt); if (g.amount < 1e-6) g.amount = 0;
  for (const u of near) u.gathering = 'survey';
  if (g.amount === 0) { g.done = true; g.doneAt = sim.time; sim.fx.push({ type: 'gateDone', x: px, y: py, t: sim.time, side: 'ally' }); }
}

/** 3-2: ミントが見つかる → 捕まる／取り返す → 背中に乗せて送る → 脱出口 */
function stepMint(sim, dt, api) {
  const S = sim.story3, M = S.mint, tx = tileCenter(M.tower.tx), ty = tileCenter(M.tower.ty);
  if (M.phase === 'guard') {
    if (aliveLabel(sim, M.guard)) return;
    const near = sim.units.some(u => u.side === 'ally' && !u.object && u.captured == null && Math.hypot(u.x - tx, u.y - ty) <= STORY3.towerNearTiles * TILE);
    if (!near) return;
    const m = api.deployUnit(sim, 'girl', M.tower, { label: 'ミント' }); // ミッションの途中で味方に加わる（人間の枠 3 に数える）
    if (!m) return;
    M.id = m.id; M.phase = 'found';
    sim.fx.push({ type: 'mintFound', x: m.x, y: m.y, t: sim.time, side: 'ally', label: m.label });
    const g = sim.groups.find(q => q.name === M.carrier); // 運ぶ G08 がミントに気づいて向かってくる（もう 1 体はロウが引き離した）
    if (g && g.role === 'patrol') g.provokedBy = m.id;
    return;
  }
  const mint = byId(sim, M.id);
  if (!mint) return; // やられた（checkStory3Result が負けにする）
  if (mint.captured != null) M.everCaptured = true;
  if (M.phase === 'found' && mint.captured == null && !aliveLabel(sim, M.carrier)) {
    M.phase = 'escort';
    sim.fx.push({ type: 'mintEscort', x: mint.x, y: mint.y, t: sim.time, side: 'ally', label: mint.label });
  }
  if (M.phase !== 'escort' || mint.captured != null) return;
  const ex = sim.mission.extraction, exx = tileCenter(ex.tx), exy = tileCenter(ex.ty);
  if (Math.hypot(mint.x - exx, mint.y - exy) <= EXTRACT_RADIUS * TILE) { // 脱出口に着いた: 仲間になった
    M.phase = 'done'; M.doneAt = sim.time;
    sim.fx.push({ type: 'mintHome', x: mint.x, y: mint.y, t: sim.time, side: 'ally', label: mint.label });
    return;
  }
  // 取り返したら PONCO02 の背中に乗る（人間は捕まらない・撃てない）。遠ければ PONCO02 のほうへ歩く。PONCO02 がいなければ脱出口へ歩く
  M.moveT = Math.max(0, M.moveT - dt);
  if (mint.ride) return;
  const host = ponco02Of(sim);
  if (host && canBoard(sim, mint, host, RIDE_MODE.BACK).ok) { sim.commands.push({ type: 'board', humanId: mint.id, hostId: host.id, mode: RIDE_MODE.BACK }); return; }
  if (M.moveT > 0 || mint.order || (mint.dazed || 0) > 0) return;
  M.moveT = STORY3.retry;
  const to = host ? { tx: toTile(host.x), ty: toTile(host.y) } : { tx: ex.tx, ty: ex.ty };
  sim.commands.push({ type: 'move', unitIds: [mint.id], waypoints: [to], mode: 'rush' });
}

/** 勝ち負け。sim.js の checkResult が、sim.story3 がある時にここで決める */
export function checkStory3Result(sim, allies) {
  const S = sim.story3, boy = allies.find(u => u.kind === 'boy');
  const lose = why => { sim.result = 'lose'; sim.resultReason = why; };
  if (!allies.some(u => u.kind === 'scav')) return lose('nejiDown'); // ネジが壊れたらすぐ負け（人間だけでは宇宙人に勝てない）
  if (!boy) return lose('boyDown');
  if (boy.captured != null) return lose('boyCaptured');
  const M = S.mint;
  if (M && M.id != null) {
    const mint = allies.find(u => u.id === M.id);
    if (!mint) return lose('mintDown');
    if (mint.captured === 'nest' && !ponco02Of(sim)) return lose('mintLost'); // 巣に着いてしまい、助けにいけるロボがいない
  }
  if (S.gate?.done) { sim.result = 'win'; sim.resultReason = 'gate'; }
  else if (M?.phase === 'done') { sim.result = 'win'; sim.resultReason = 'mintHome'; }
}

/** HUD・結果用のまとめ（何も書かない） */
export function story3Status(sim) {
  const S = sim.story3; if (!S) return null;
  const mint = S.mint && S.mint.id != null ? byId(sim, S.mint.id) : null;
  const enemies = sim.units.filter(u => u.side === 'enemy' && u.hp > 0).length;
  return {
    stage: S.stage, enemies, killed: S.enemyStart - enemies,
    gate: S.gate ? { progress: 1 - S.gate.amount / S.gate.max, blocked: S.gate.blocked, done: S.gate.done } : null,
    mint: S.mint ? { phase: S.mint.phase, joined: !!mint, captured: mint ? mint.captured : null, riding: !!mint?.ride, everCaptured: S.mint.everCaptured, guardAlive: aliveLabel(sim, S.mint.guard), carrierAlive: aliveLabel(sim, S.mint.carrier) } : null,
  };
}

/** hashSim に混ぜる値（sim.story3 がある時だけ呼ぶ） */
export function story3HashValues(sim) {
  const S = sim.story3;
  return [S.stage === '3-1' ? 1 : 2, S.gate ? Math.round(S.gate.amount * 1000) : -1, S.mint ? PHASE_CODE[S.mint.phase] : -1, S.mint?.id ?? -1];
}
