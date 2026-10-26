// 物語 第 2 章「町はずれの声」（試作）の仕掛け: 2-1 ポンコ02を つくる（資材を 60 届ける）・2-2 むせんとうの あと（少年が降りて塔の跡を調べる・ロウのおとり）。
// データと計算だけ（DOM・Pixi・Math.random なし）。sim.story2 が無い時（URL に ?storych=2 が無い時・ふつうのミッション・第 1 章）は、何もしない
// （stepStory2・checkStory2Result・story2HashValues は呼ばれず、乱数も引かない＝今までのシムの結果と同じ）。数値はすべて【仮】でここで調整する。
// 第 1 章の js/sim/strike.js（ミサイル・発射台）には触らず、同じ形（initXxx / stepXxx / hashValues）で別に置く。
import { TILE, tileCenter } from './map.js?v=6';
import { SURVEY } from './strike.js?v=1';

/** 第 2 章で使う調整値 */
export const STORY2 = Object.freeze({
  wolfStandSec: 3,       // 少年が塔のそばに降りて立っている秒数がこれになったら、ロウが塔から飛び出す（敵が近くにいない時だけ）
  wolfClearTiles: 2.5,   // ロウが出る時、塔のまわりこのマス以内に敵がいたら、出るのを待つ（出た瞬間に捕まらないように）
  wolfLifeSec: 40,       // ロウが走っている最長の秒数（過ぎたら去る）
  wolfEndTiles: 1.2,     // 走る道の終わりからこのマス以内で去る
  lureSec: 22,           // ロウが走り始めてからこの秒数の間、ハサミアリ（G08）はロウを追う（少年は狙わない）
});

const byId = (sim, id) => (id == null ? null : sim.units.find(u => u.id === id) || null);
const WOLF_CODE = { none: 0, run: 1, gone: 2 };

/** ミッションの story2 から sim.story2 を作る（createSim が、ミッションに story2 がある時だけ呼ぶ）。少年を背中に乗せて始める（mission.startRide）・敵の数値の調整（mission.story2.tune） */
export function initStory2(sim, mission) {
  const c = mission.story2;
  const neji = sim.units.find(u => u.side === 'ally' && u.kind === 'scav');
  const ponco = sim.units.find(u => u.side === 'ally' && u.kind === 'ponco');
  const sv = c.survey;
  sim.story2 = {
    step: c.step, nejiId: neji ? neji.id : null, poncoId: ponco ? ponco.id : null, cues: [],
    corePile: c.corePile ?? null, coreSeen: false,
    survey: sv ? { tx: sv.tx, ty: sv.ty, amount: sv.amount, max: sv.amount, blocked: false, done: false, doneAt: null, standSec: 0 } : null,
    wolf: { state: 'none', id: null, t: 0, route: c.wolfRoute || null, startedAt: null },
  };
  if (mission.startRide && neji) {
    const boy = sim.units.find(u => u.side === 'ally' && u.kind === 'boy');
    if (boy) {
      boy.ride = { host: neji.id, mode: 'back', phase: 'on', t: 0, from: null, to: null };
      boy.x = neji.x - 8; boy.y = neji.y; boy.order = null; boy.moving = false;
      sim.ride ??= { cmds: [] };
    }
  }
  // 敵の数値の調整（2 章の中だけ。new-enemies.js の数値そのものは変えない）: tune = { G01: { hpMul, atkMul } }
  for (const u of sim.units) {
    if (u.side !== 'enemy') continue;
    const t = c.tune?.[u.kind]; if (!t) continue;
    if (t.hpMul) { u.maxHp = Math.max(1, Math.round(u.maxHp * t.hpMul)); u.hp = u.maxHp; }
    if (t.atkMul) u.atk = Math.max(1, Math.round(u.atk * t.atkMul));
  }
}

const cue = (S, name) => { if (!S.cues.includes(name)) S.cues.push(name); };

/** 毎ステップ（sim.js の stepSim が stepStrike のあとで呼ぶ）。api: { deployUnit, applyOrder, removeDead, gatherOf, isStunned } */
export function stepStory2(sim, dt, api) {
  const S = sim.story2; if (!S) return;
  // 2-1: 壊れた機体の山を半分掘ったら、コアが見つかる会話の合図（1 回だけ）
  if (S.corePile != null && !S.coreSeen) {
    const p = sim.mission.salvage[S.corePile];
    if (p && p.amount <= p.max * 0.5) { S.coreSeen = true; cue(S, 'core'); }
  }
  if (S.survey) stepSurvey(sim, dt, api);
  if (S.wolf.state === 'run') stepWolf(sim, dt, api);
}

/** 塔の跡を調べる: 少年が「降りて」止まっている時だけ進む（背中に乗ったままでは調べられない＝2 章の新しい遊び）。敵が 5 マス以内にいると進まない */
function stepSurvey(sim, dt, api) {
  const S = sim.story2, sv = S.survey; if (sv.done) return;
  const px = tileCenter(sv.tx), py = tileCenter(sv.ty), r = SURVEY.gatherRadius * TILE;
  sv.blocked = sim.units.some(u => u.side === 'enemy' && u.hp > 0 && Math.hypot(u.x - px, u.y - py) <= SURVEY.blockTiles * TILE);
  const near = sim.units.filter(u => u.side === 'ally' && u.kind === 'boy' && !u.aiAlly && !u.ride && u.captured == null && !u.order && !api.isStunned(u) && Math.hypot(u.x - px, u.y - py) <= r);
  if (near.length) sv.standSec += dt; else if (sv.standSec < STORY2.wolfStandSec) sv.standSec = 0; // 立っている秒数（ロウが出たあとは数えない）
  // ロウ: 少年がしばらく塔のそばに降りて立っていて、まわりに敵がいなければ、塔から飛び出す（山場）
  if (S.wolf.state === 'none' && sv.standSec >= STORY2.wolfStandSec - 1e-6 && S.wolf.route) startWolf(sim, api, px, py);
  if (sv.blocked || !near.length) return;
  const rate = near.reduce((a, u) => a + api.gatherOf(u), 0);
  sv.amount = Math.max(0, sv.amount - rate * dt); if (sv.amount < 1e-6) sv.amount = 0;
  for (const u of near) u.gathering = 'survey';
  if (sv.amount === 0) {
    sv.done = true; sv.doneAt = sim.time;
    sim.fx.push({ type: 'surveyDone', x: px, y: py, t: sim.time, side: 'ally' });
  }
}

function startWolf(sim, api, px, py) {
  const S = sim.story2;
  const clear = !sim.units.some(u => u.side === 'enemy' && u.hp > 0 && Math.hypot(u.x - px, u.y - py) <= STORY2.wolfClearTiles * TILE);
  if (!clear) return;
  const sv = S.survey, w = api.deployUnit(sim, 'boy', { tx: sv.tx, ty: sv.ty - 1 }, { label: 'ロウ', aiAlly: true });
  if (!w) return;
  w.kind = 'wolf'; w.speed = 58; w.noCatch = true; // 逃げ足が速くて捕まらない（sim.js の updateCaptures・NE_API が見る）
  S.wolf.state = 'run'; S.wolf.id = w.id; S.wolf.t = 0; S.wolf.startedAt = sim.time;
  api.applyOrder(sim, w, S.wolf.route, 'rush');
  cue(S, 'wolf');
  lure(sim);
}

/** ハサミアリ（G08）の群れを、ロウへ向ける（少年を狙わせない）。追っている間はあきらめさせない */
function lure(sim) {
  const S = sim.story2, w = byId(sim, S.wolf.id); if (!w) return;
  const tile = { tx: Math.floor(w.x / TILE), ty: Math.floor(w.y / TILE) };
  for (const g of sim.groups) {
    if (g.role !== 'patrol') continue;
    const us = g.unitIds.map(id => byId(sim, id)).filter(Boolean);
    if (!us.some(u => u.kind === 'G08')) continue;
    if (g.ai !== 'chase') { g.ai = 'chase'; g.alert = 1; g.aiTimer = 0; }
    g.targetId = w.id; g.lastSeen = tile; g.lostTimer = 0;
    for (const u of us) if (u.kind === 'G08') u.neT = 0.5; // 近くの人間（少年）へ寄り直す「好物」の探しを止める
  }
}

function stepWolf(sim, dt, api) {
  const S = sim.story2, W = S.wolf, w = byId(sim, W.id);
  if (!w) { W.state = 'gone'; return; }
  W.t += dt;
  const end = W.route[W.route.length - 1], ex = tileCenter(end.tx), ey = tileCenter(end.ty);
  const arrived = Math.hypot(w.x - ex, w.y - ey) <= STORY2.wolfEndTiles * TILE;
  if (W.t < STORY2.lureSec) lure(sim);
  if (arrived || W.t >= STORY2.wolfLifeSec) { // 走り去る（姿が消える）
    sim.units = sim.units.filter(u => u !== w);
    W.state = 'gone';
    sim.fx.push({ type: 'wolfGone', x: w.x, y: w.y, t: sim.time, side: 'ally' });
    api.removeDead(sim);
  }
}

/** 勝ち負け（sim.js の checkResult が、sim.story2 がある時に呼ぶ）。2-1: 資材 60 を届けたら勝ち／2-2: 塔の跡を調べ終えたら勝ち。負け: ネジが壊れる（2-2 でポンコ02も壊れていたら「ロボが全滅」）・少年が捕まる・少年が倒れる */
export function checkStory2Result(sim, allies) {
  const S = sim.story2, boy = allies.find(u => u.kind === 'boy');
  const neji = allies.some(u => u.id === S.nejiId);
  const ponco = S.poncoId != null && allies.some(u => u.id === S.poncoId);
  if (!neji) { sim.result = 'lose'; sim.resultReason = S.poncoId != null && !ponco ? 'robotsDown' : 'nejiDown'; }
  else if (!boy) { sim.result = 'lose'; sim.resultReason = 'boyDown'; }
  else if (boy.captured === 'nest') { sim.result = 'lose'; sim.resultReason = 'boyCaptured'; }
  else if (S.step === 1 && sim.mission.delivered >= sim.mission.target - 1e-6) { sim.result = 'win'; sim.resultReason = 'materials'; }
  else if (S.step === 2 && S.survey.done && boy.captured == null) { sim.result = 'win'; sim.resultReason = 'tower'; }
}

/** HUD 用のまとめ */
export function story2Status(sim) {
  const S = sim.story2; if (!S) return null;
  const sv = S.survey;
  return {
    step: S.step, cues: S.cues.length, wolf: S.wolf.state,
    survey: sv ? { left: sv.amount, max: sv.max, progress: 1 - sv.amount / sv.max, blocked: sv.blocked, done: sv.done, standSec: sv.standSec } : null,
  };
}

/** hashSim に混ぜる値（sim.story2 がある時だけ呼ぶ） */
export function story2HashValues(sim) {
  const S = sim.story2, sv = S.survey;
  return [S.step, S.cues.length, S.coreSeen ? 1 : 0, WOLF_CODE[S.wolf.state], S.wolf.id ?? -1, sv ? Math.round(sv.amount * 1000) : -1, sv ? Math.round(sv.standSec * 1000) : -1];
}

/** おとりの間は、アリの巡回AIも近くの少年に目移りせずロウへ向かう。 */
export function story2PatrolTarget(sim, group) {
  const S = sim.story2;
  if (!S || S.wolf.state !== 'run' || S.wolf.t >= STORY2.lureSec) return null;
  if (!group.unitIds.some(id => byId(sim, id)?.kind === 'G08')) return null;
  const w = byId(sim, S.wolf.id);
  return w ? { unit: w, closeness: 1 } : null;
}
