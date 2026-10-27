// 記録と再生（リプレイ）。DOM・Pixi・乱数・時刻を使わない（Node のテスト・道具でもそのまま動く）。
// 考え方: シムは「始まりの条件（seed など）」と「sim.commands に入った命令を、どの step の頭で使ったか」だけで決まる。
//   記録 = 始まりの条件 + 命令（step ごと・一時停止中かの印つき）+ 途中と終わりのハッシュ。
//   再生 = 同じ条件で createSim → 記録どおりの step で命令を入れ直す → ハッシュを記録と比べる。
// シム（sim.js）は1行も変えない。記録は stepSim を呼ぶ前に sim.commands を写すだけ、一時停止中の命令（applyCommandsNow）は
// 呼ぶ前に写して「paused」の印をつける（R-12 の注意1: 一時停止中は経路を先に作るので、結果が変わるため）。
import { createSim, stepSim, applyCommandsNow, hashSim, hashSimDeep } from './sim.js?v=29';
import { MISSION_1 } from './mission.js?v=10';
import { withAltUnits, ALT_MISSION_ROWS, ALT_IN_MISSIONS } from './alt-units.js?v=3'; // R-05: 本編と同じ「飛ぶ機体・水陸両用機を足すか」の通し方で再生する

export const REPLAY_VERSION = 1;
export const REPLAY_GAME = 'bot-commander';
/** 記録を取った時のゲームの版（sw-assets.js の gameVersion と同じ値。取り込む時にそろえる）。違う版の記録は、読めるが「版がちがう」と知らせる */
export const REPLAY_GAME_VERSION = '1.0.12';
export const MARK_EVERY = 300;            // 途中のハッシュを残す間隔（step）。10 秒ごと
export const MAX_REPLAY_TICKS = 216000;   // 再生してよい最大の長さ（2 時間ぶん）
export const MAX_REPLAY_CMDS = 50000;
export const MAX_REPLAY_BYTES = 4 * 1024 * 1024;
const REC_BYTES_LIMIT = Math.floor(MAX_REPLAY_BYTES * 0.9); // R-08: 記録側は余裕を見て 9 割で閉じる（marks・見出しの分）

/** ミッションの名前（記録の start.mission）→ ミッション。新しいミッションを足したら registerMission で足す */
const MISSIONS = { [MISSION_1.id]: MISSION_1 };
export function registerMission(m) { MISSIONS[m.id] = m; }
export const knownMissions = () => Object.keys(MISSIONS);

// ---- 命令の短い形 ----
// o = 移動 ['o', ids, 'f'|'r', [tx,ty, tx,ty, …]] / a = 狙う ['a', ids, targetId] / s = 構え ['s', ids, 'h'|'f']
// x = 止まる ['x', ids] / t = 撤退 ['t', ids] / ? = 知らない種類（そのまま写す）['?', {type, …}]
const toIds = a => (Array.isArray(a) ? a : [a]).map(Number);
export function packCommand(c) {
  switch (c.type) {
    case 'move': return ['o', toIds(c.unitIds), c.mode === 'rush' ? 'r' : 'f', c.waypoints.flatMap(w => [w.tx, w.ty])];
    case 'attack': return ['a', toIds(c.unitIds), c.targetId];
    case 'stance': return ['s', toIds(c.unitIds), c.stance === 'free' ? 'f' : 'h'];
    case 'stop': return ['x', toIds(c.unitIds)];
    case 'retreat': return ['t', toIds(c.unitIds)];
    default: return ['?', JSON.parse(JSON.stringify(c))]; // 後から足された命令の種類も落とさない
  }
}
export function unpackCommand(p) {
  switch (p[0]) {
    case 'o': { const wps = []; for (let i = 0; i < p[3].length; i += 2) wps.push({ tx: p[3][i], ty: p[3][i + 1] }); return { type: 'move', unitIds: [...p[1]], waypoints: wps, mode: p[2] === 'r' ? 'rush' : 'fight' }; }
    case 'a': return { type: 'attack', unitIds: [...p[1]], targetId: p[2] };
    case 's': return { type: 'stance', unitIds: [...p[1]], stance: p[2] === 'f' ? 'free' : 'hold' };
    case 'x': return { type: 'stop', unitIds: [...p[1]] };
    case 't': return { type: 'retreat', unitIds: [...p[1]] };
    default: return JSON.parse(JSON.stringify(p[1]));
  }
}

// ---- 始まりの条件 ----
/** 記録の start から、同じシムを作る。ミッションの名前が分からなければ例外 */
export function createSimFromStart(start) {
  const base = MISSIONS[start.mission];
  if (!base) throw new Error(`知らないミッション: ${start.mission}`);
  const mission = base.id === MISSION_1.id ? withAltUnits(base, ALT_MISSION_ROWS) : base; // R-05: 遊ぶ時（index.js）と同じ。スイッチが全部 false なら base そのまま
  return createSim({ seed: start.seed, mapSeed: start.mapSeed, mission, loadout: start.loadout ? JSON.parse(JSON.stringify(start.loadout)) : null, launcher: !!start.launcher, powersuit: !!start.powersuit, newEnemies: !!mission.story3 }); // v1.0.8: 第 3 章のミッションは遊ぶ時（index.js）と同じく新しい敵の種類で作る（ownAliens なので入れ替えはしない）
}
/** いまのシムを作った時の条件（記録の start の形）。loadout は JSON にできる物だけ */
const altSwitches = () => ({ flyer: !!ALT_IN_MISSIONS.flyer, amph: !!ALT_IN_MISSIONS.amph });
const anyAlt = a => !!(a && (a.flyer || a.amph));
/** R-05: 本編に飛ぶ機体・水陸両用機を足すスイッチが入っている時だけ start.alt に残す（全部 false の今は、記録の形は前と同じ） */
export const makeStart = ({ seed = 1, mapSeed = 7, mission = MISSION_1, chapter = null, loadout = null, launcher = false, powersuit = false } = {}) =>
  ({ seed, mapSeed, mission: mission.id, ...(chapter ? { chapter } : {}), loadout: loadout ? JSON.parse(JSON.stringify(loadout)) : null, ...(launcher ? { launcher: true } : {}), ...(powersuit ? { powersuit: true } : {}), ...(mission.id === MISSION_1.id && anyAlt(altSwitches()) ? { alt: altSwitches() } : {}) }); // launcher: 発射台（?launcher=1）の時だけ印をつける（ふつうの記録の形は変えない）

const deepOf = sim => ({ hash: hashSim(sim), deep: hashSimDeep(sim) });

// ---- 記録 ----
/**
 * sim に記録をつける。以後、stepSim の代わりに rec.step()、applyCommandsNow の代わりに rec.applyNow() を呼ぶ。
 * 取るのは「いつ・どの命令」だけなので、使わなくても・使っても、シムの結果は同じ。
 * 終わり（sim.result がついた）か snapshot() までを写す。終わったあとの命令は記録しない。
 */
export function createRecorder(sim, start, meta = null) {
  const cmds = [], marks = [];
  let end = null; // 終わった時に決まる
  let bytes = 0; // R-08: 書き出した時の大きさの見積もり（命令の JSON の長さの合計）
  const closeIfDone = () => { if (!end && sim.result) end = { tick: sim.tick, ...deepOf(sim), result: sim.result }; };
  // 点検 R-02: 乗り降りの命令を issueBoard／issueAlight で直接出すと、sim.commands ではなく sim.ride.cmds に入る（stepSim の中の stepRide で使われる）。
  // それも step の頭でだけ写す（印 _ride をつけ、再生では sim.ride.cmds へ戻す）。sim.commands の 'board'／'alight'（物語の ☰）が
  // 一時停止中の applyNow で sim.ride.cmds に積んだ物は、もう sim.commands の側で記録したので写さない（二重にしない）
  const fromCmds = new WeakSet();
  const rideCmds = () => (sim.ride && sim.ride.cmds.length ? sim.ride.cmds.filter(c => !fromCmds.has(c)).map(c => ['?', { ...JSON.parse(JSON.stringify(c)), _ride: 1 }]) : []);
  // R-08: 読み込み側の上限（MAX_REPLAY_TICKS・MAX_REPLAY_CMDS・MAX_REPLAY_BYTES）を超える前に、「ここまでの記録」として閉じる。
  // 閉じたあとも遊びは続くが、命令・ハッシュはもう写さない（読み込めない記録を作らないため）。シムには触らない。
  const seal = () => { if (!end) end = { tick: sim.tick, ...deepOf(sim), result: sim.result || null }; };
  const note = paused => {
    if (end) return;
    const pk = sim.commands.map(packCommand).concat(paused ? [] : rideCmds());
    if (!(paused || pk.length)) return;
    const entry = [sim.tick, paused ? 1 : 0, pk];
    const size = JSON.stringify(entry).length + 2;
    if (cmds.length >= MAX_REPLAY_CMDS || bytes + size > REC_BYTES_LIMIT) { seal(); return; }
    cmds.push(entry); bytes += size;
  };
  const rec = {
    sim,
    /** 1 step 進める（命令は次の step の頭で使われるので、その前に写す） */
    step() {
      note(false);
      stepSim(sim);
      if (!end && sim.tick % MARK_EVERY === 0) { const d = deepOf(sim); marks.push([sim.tick, d.hash, d.deep]); }
      closeIfDone();
      if (!end && sim.tick >= MAX_REPLAY_TICKS) seal(); // R-08: 長さの上限
    },
    /** 一時停止中の命令: すぐ使う（applyCommandsNow）。命令が 0 個でも経路づくりが進むので、必ず記録する */
    applyNow() { note(true); const before = new Set(sim.ride ? sim.ride.cmds : []); applyCommandsNow(sim); if (sim.ride) for (const c of sim.ride.cmds) if (!before.has(c)) fromCmds.add(c); }, // sim.commands から作られた分だけ印（直接出した分は次の step で記録）
    get done() { return !!end; },
    /** 記録の形にして返す（途中でも書き出せる。途中の時は、いまの tick までの記録で、end.result は null） */
    snapshot() {
      const e = end || { tick: sim.tick, ...deepOf(sim), result: sim.result || null };
      return { v: REPLAY_VERSION, game: REPLAY_GAME, gameVersion: REPLAY_GAME_VERSION, start: JSON.parse(JSON.stringify(start)), ...(meta ? { meta: { ...meta } } : {}), cmds: cmds.map(c => [c[0], c[1], c[2].map(x => JSON.parse(JSON.stringify(x)))]), end: e, marks: marks.map(m => [...m]) };
    },
  };
  return rec;
}

// ---- 書き出し・読み込み ----
/** 記録を JSON の文字にする（命令は 1 行ずつ。人が読めて、差分も見やすい） */
export function stringifyReplay(rec) {
  const lines = [];
  lines.push(`"v":${rec.v},"game":${JSON.stringify(rec.game)},"gameVersion":${JSON.stringify(rec.gameVersion)}`);
  lines.push(`"start":${JSON.stringify(rec.start)}`);
  if (rec.meta) lines.push(`"meta":${JSON.stringify(rec.meta)}`);
  lines.push(`"cmds":[${rec.cmds.length ? '\n' + rec.cmds.map(c => JSON.stringify(c)).join(',\n') + '\n' : ''}]`);
  lines.push(`"end":${JSON.stringify(rec.end)}`);
  lines.push(`"marks":[${rec.marks.map(m => JSON.stringify(m)).join(',')}]`);
  return '{\n' + lines.join(',\n') + '\n}\n';
}

const isInt = n => Number.isInteger(n);
const isHash = s => typeof s === 'string' && /^[0-9a-f]{1,8}$/.test(s);
const bad = reason => ({ ok: false, reason });

function checkCmd(p) {
  if (!Array.isArray(p) || typeof p[0] !== 'string') return '命令の形がおかしい';
  if (p[0] === '?') return p[1] && typeof p[1] === 'object' && typeof p[1].type === 'string' ? null : '知らない命令の形がおかしい';
  if (!'oasxt'.includes(p[0]) || p[0].length !== 1) return `知らない命令: ${p[0]}`;
  if (!Array.isArray(p[1]) || p[1].length > 64 || !p[1].every(isInt)) return '命令の機体の番号がおかしい';
  if (p[0] === 'o') {
    if (p[2] !== 'f' && p[2] !== 'r') return '移動の種類がおかしい';
    if (!Array.isArray(p[3]) || p[3].length === 0 || p[3].length % 2 || p[3].length > 32 || !p[3].every(isInt)) return '移動の行き先がおかしい';
  } else if (p[0] === 'a') { if (!isInt(p[2])) return '狙う相手の番号がおかしい'; }
  else if (p[0] === 's') { if (p[2] !== 'f' && p[2] !== 'h') return '構えの種類がおかしい'; }
  return null;
}

/**
 * 記録（JSON の文字か、読み込んだ物）を調べる。止まらない: { ok: true, rec, notes } か { ok: false, reason }。
 * 版が違う（v）・別のゲーム・知らないミッション・形がこわれている物は、理由をつけて断る。ゲームの版（gameVersion）が違うだけなら読めるが notes に書く。
 */
export function parseReplay(input) {
  try {
    let rec = input;
    if (typeof input === 'string') {
      if (input.length > MAX_REPLAY_BYTES) return bad('リプレイが大きすぎます');
      const t = input.trim();
      if (!t) return bad('リプレイが空です');
      try { rec = JSON.parse(t); } catch { return bad('JSON として読めません（こわれているか、途中で切れています）'); }
    }
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return bad('リプレイの形ではありません');
    if (rec.v !== REPLAY_VERSION) return bad(`リプレイの形の版が違います（v${rec.v ?? '?'}。このゲームは v${REPLAY_VERSION}）`);
    if (rec.game !== REPLAY_GAME) return bad(`このゲームのリプレイではありません（${String(rec.game).slice(0, 30)}）`);
    const s = rec.start;
    if (!s || typeof s !== 'object') return bad('始まりの条件（start）がありません');
    if (!isInt(s.seed) || !isInt(s.mapSeed)) return bad('seed か mapSeed がおかしい');
    if (typeof s.mission !== 'string' || !MISSIONS[s.mission]) return bad(`知らないミッションです（${String(s.mission).slice(0, 30)}）`);
    if (s.loadout != null && (typeof s.loadout !== 'object' || Array.isArray(s.loadout))) return bad('装備（loadout）の形がおかしい');
    const e = rec.end;
    if (!e || typeof e !== 'object' || !isInt(e.tick) || e.tick < 0) return bad('終わり（end）の tick がおかしい');
    if (e.tick > MAX_REPLAY_TICKS) return bad('リプレイが長すぎます');
    if (!isHash(e.hash) || !isHash(e.deep)) return bad('終わりのハッシュがおかしい');
    if (!Array.isArray(rec.cmds)) return bad('命令の一覧（cmds）がありません');
    if (rec.cmds.length > MAX_REPLAY_CMDS) return bad('命令が多すぎます');
    let last = 0;
    for (let i = 0; i < rec.cmds.length; i++) {
      const c = rec.cmds[i];
      if (!Array.isArray(c) || c.length !== 3 || !isInt(c[0]) || c[0] < 0 || (c[1] !== 0 && c[1] !== 1) || !Array.isArray(c[2])) return bad(`命令 ${i + 1} 番目の形がおかしい`);
      if (c[0] < last) return bad(`命令 ${i + 1} 番目の tick が前より戻っています`);
      if (c[0] > e.tick || (c[1] === 0 && c[0] === e.tick)) return bad(`命令 ${i + 1} 番目の tick が終わり（${e.tick}）より後です`);
      if (c[1] === 0 && c[2].length === 0) return bad(`命令 ${i + 1} 番目が空です`);
      last = c[0];
      for (const p of c[2]) { const why = checkCmd(p); if (why) return bad(`命令 ${i + 1} 番目: ${why}`); }
    }
    if (!Array.isArray(rec.marks)) return bad('途中のハッシュの一覧（marks）がありません');
    for (const m of rec.marks) if (!Array.isArray(m) || !isInt(m[0]) || m[0] <= 0 || !isHash(m[1]) || !isHash(m[2])) return bad('途中のハッシュ（marks）の形がおかしい');
    const notes = [];
    if (s.mission === MISSION_1.id) { // R-05: 記録を取った時とスイッチの入れ方がちがうと、足した機体がちがってずれる
      const was = s.alt || {}, now = altSwitches();
      if (!!was.flyer !== now.flyer || !!was.amph !== now.amph) notes.push('リプレイを取った時と、飛ぶ機体・水陸両用機の出し方がちがいます。ずれます');
    }
    if (rec.gameVersion !== REPLAY_GAME_VERSION) notes.push(`リプレイを取ったゲームの版は ${rec.gameVersion ?? '?'}（いまは ${REPLAY_GAME_VERSION}）。シムが変わっていると、ハッシュがずれます`);
    return { ok: true, rec, notes };
  } catch (err) {
    return bad('リプレイを調べられませんでした: ' + (err && err.message ? err.message : String(err)));
  }
}

// ---- 再生 ----
/**
 * 記録を再生する（シムはまだ何も進んでいない物）。画面は毎フレーム step() を呼ぶ（stepSim の代わり）。
 * 再生中のプレイヤーの命令は受けない（step の頭で sim.commands を空にする）。
 * 終わる（end.tick に着く・先に結果が出る）と done になり、report() で記録と比べた結果が取れる。
 */
export function createPlayer(rec, sim) {
  const cmds = rec.cmds, want = new Map(rec.marks.map(m => [m[0], m]));
  const got = []; let i = 0, done = false, first = null, lastGood = 0, endGot = null;
  const push = c => { // 乗り降りの命令（印 _ride）は sim.ride.cmds へ、ほかは sim.commands へ（記録した時と同じ入れ物。点検 R-02）
    sim.commands.length = 0;
    for (const p of c[2]) { const u = unpackCommand(p); if (u._ride) { delete u._ride; (sim.ride ??= { cmds: [] }).cmds.push(u); } else sim.commands.push(u); }
  };
  const skipStale = () => { while (i < cmds.length && cmds[i][0] < sim.tick) i++; };
  const flushPaused = () => { skipStale(); while (i < cmds.length && cmds[i][0] === sim.tick && cmds[i][1] === 1) { push(cmds[i++]); applyCommandsNow(sim); } };
  const finish = () => {
    flushPaused();
    sim.commands.length = 0;
    endGot = { tick: sim.tick, ...deepOf(sim), result: sim.result || null };
    const w = rec.end;
    if (!first) {
      const field = w.tick !== endGot.tick ? 'tick' : w.hash !== endGot.hash ? 'hash' : w.deep !== endGot.deep ? 'deep' : (w.result ?? null) !== endGot.result ? 'result' : null;
      if (field) first = { tick: endGot.tick, where: 'end', field, want: w[field], got: endGot[field], since: lastGood };
    }
    done = true;
  };
  const player = {
    sim, rec,
    get done() { return done; },
    get tick() { return sim.tick; },
    get total() { return rec.end.tick; },
    /** 1 step 進める。終わっていたら何もしない（false を返す） */
    step() {
      if (done) return false;
      if (sim.tick >= rec.end.tick || sim.result) { finish(); return false; }
      flushPaused();
      skipStale();
      if (i < cmds.length && cmds[i][0] === sim.tick && cmds[i][1] === 0) push(cmds[i++]); else sim.commands.length = 0;
      stepSim(sim);
      if (sim.tick % MARK_EVERY === 0) {
        const d = deepOf(sim); got.push([sim.tick, d.hash, d.deep]);
        const w = want.get(sim.tick);
        if (w && !first) {
          const field = w[1] !== d.hash ? 'hash' : w[2] !== d.deep ? 'deep' : null;
          if (field) first = { tick: sim.tick, where: 'mark', field, want: field === 'hash' ? w[1] : w[2], got: d[field], since: lastGood };
          else lastGood = sim.tick;
        } else if (!first) lastGood = sim.tick;
      }
      if (sim.tick >= rec.end.tick || sim.result) finish();
      return true;
    },
    /** 最後まで進める（Node の道具・テスト用）。上限の step に着いたら止まる */
    runAll(limit = MAX_REPLAY_TICKS + 10) { for (let n = 0; n < limit && !done; n++) player.step(); if (!done) finish(); return player.report(); },
    /**
     * 結果。match: 記録と全部同じ。first: 最初にずれた所（なければ null）。
     * first = { tick, where: 'mark'|'end', field: 'hash'|'deep'|'tick'|'result', want, got, since }（since＝そこまでは同じだった最後の tick）
     * marks / end: この端末（この Math）で出たハッシュ。書き出して、ほかの端末と比べる
     */
    report() {
      return { done, match: done && !first, first, ticks: sim.tick, total: rec.end.tick, marks: got.map(m => [...m]), end: endGot, marksChecked: got.filter(m => want.has(m[0])).length };
    },
  };
  return player;
}

/** 記録を調べて（parseReplay）、シムを作って、再生係を返す。{ ok:false, reason } か { ok:true, rec, sim, player, notes } */
export function openReplay(input) {
  const p = parseReplay(input);
  if (!p.ok) return p;
  try { const sim = createSimFromStart(p.rec.start); return { ok: true, rec: p.rec, sim, player: createPlayer(p.rec, sim), notes: p.notes }; }
  catch (err) { return bad('このリプレイからゲームを作れませんでした: ' + (err && err.message ? err.message : String(err))); }
}

/** この端末で出たハッシュを、記録の形で返す（marks と end をこの端末の値に置きかえた物）。ほかの端末の物と replay-compare で比べる */
export function deviceRecord(rec, report, env = null) {
  return { ...rec, meta: { ...(rec.meta || {}), ...(env ? { replayedOn: env } : {}) }, end: report.end ? { ...report.end } : rec.end, marks: report.marks.map(m => [...m]) };
}

/**
 * 2 つの記録のハッシュを比べる（marks と end）。同じ tick の値が違う最初の所を返す。
 * 返り値: { same, startSame, first: { tick, field, a, b, since } | null, compared }
 */
export function compareRecords(a, b) {
  const startSame = JSON.stringify(a.start) === JSON.stringify(b.start);
  const mb = new Map(b.marks.map(m => [m[0], m]));
  let since = 0, compared = 0, first = null;
  for (const m of a.marks) {
    const o = mb.get(m[0]); if (!o) continue;
    compared++;
    const field = m[1] !== o[1] ? 'hash' : m[2] !== o[2] ? 'deep' : null;
    if (field) { first = { tick: m[0], field, a: field === 'hash' ? m[1] : m[2], b: field === 'hash' ? o[1] : o[2], since }; break; }
    since = m[0];
  }
  if (!first) {
    const ea = a.end, eb = b.end;
    const field = ea.tick !== eb.tick ? 'tick' : ea.hash !== eb.hash ? 'hash' : ea.deep !== eb.deep ? 'deep' : (ea.result ?? null) !== (eb.result ?? null) ? 'result' : null;
    compared++;
    if (field) first = { tick: Math.min(ea.tick, eb.tick), field, a: ea[field], b: eb[field], since };
  }
  return { same: startSame && !first, startSame, first, compared };
}
