// 発射台（地点爆撃の試作。2026-10-26 佳之さんの決定）: 拠点で時間をかけて建造 → 発射台ごと（ミサイルを積んだまま）引いて運ぶ 1 ユニット
//   → ☰ から地点を選んで撃つ。撃つ前に発射台を壊されると消える。爆発は味方に当たらない。
// 試作なので、URL に ?launcher=1 を付けた時だけ使える（createSim({ launcher: true })）。使わない時（sim.launcher が無い）は何もしない:
//   乱数（sim.rng()）は 1 回も引かない・hashSim にも何も混ぜない。使った時も、爆発のダメージの計算に乱数は使わない（純粋な関数 launcherBlastDamage）。
//   乱数を引くのは、爆発で遮蔽物が壊れた時の落とし物の抽選だけ（弾で壊れた時と同じ仕組み。10/26 の決定）。
// このファイルは sim.js を import しない（循環を避ける）。sim.js が最後に bindLauncher() で、機体を出す関数などを渡す。
// 本物のお話ミッション用の js/sim/strike.js（埋もれたミサイル）とは別物。同じ名前の関数・sim.strike は作らない。
import { TILE, TERRAIN, tileAt, toTile, nearestPassable } from './map.js?v=6';
import { unitBand, BAND, terrainDefApplies } from './altitude.js?v=1';
import { damageCover } from './cover.js?v=8';

/** 機体の種類（sim.js の KINDS に足す。alt-units.js と同じやり方）。自分では動けない・戦わない・集めない */
export const LAUNCHER_KINDS = Object.freeze({
  launcher: Object.freeze({ name: '発射台', short: '発射台', hp: 150, atk: 0, range: 0, cooldown: 1, speed: 0, sight: 3, gather: 0, noFight: true, launcher: true }),
});

/** 調整用のつまみ【仮】。数字の根拠は out/CHANGES.md の 3 章 */
export const LAUNCHER = Object.freeze({
  buildSec: 60,        // 建造にかかる時間（秒。シムの秒）【仮】
  cost: 20,            // 費用: 届けた資材「資材 n／100」から、作り始めに払う【仮】
  maxAtOnce: 1,        // 同時に持てる数（建造中・できた発射台・構え中を合わせて）【仮】
  hp: 150,             // KINDS.launcher.hp と同じ（装甲 0・シールドなし）
  towMul: 0.6,         // 引く時の速さ ＝ 引くロボの速さ × この倍率（捕まった人を運ぶ CAPTURE.carryMul と同じ数字）
  hitchRange: 48,      // つなげる距離（ワールド px）。遠ければロボが寄っていって、着いたらつなぐ
  towOffset: 22,       // 引かれる発射台の位置（ロボの後ろへこの px）
  range: 12 * TILE,    // 撃てる距離: 発射台から 12 タイル（384 px）
  aimSec: 4,           // 構えの時間（秒）。この間は動かない・壊されると消える
  flightSec: 3,        // 飛ぶ時間（秒）。この間に撃つ側にできることはない（発射台はもうない）
  provokeTiles: 8,     // 着弾点からこのマス以内に生きた仲間がいる巡回の群れは、撃った側に気づいて向かってくる（10/26 の決定。お話の strike.js と同じ 8）
  radius: 3 * TILE,    // 爆発の半径 3 タイル（96 px）
  coreRadius: 1.5 * TILE, // 中心からこの距離までは最大のダメージ
  coreDamage: 600,     // 中心から 1.5 タイル以内
  edgeDamage: 200,     // 半径（3 タイル）の縁。中心の内側からここまで直線で下がる。その外は 0
  lostBlastR: 14,      // 撃つ前に壊された時の小さな爆発（見た目だけ。ダメージなし）
});

/** 引ける機体の種類。飛ぶ機体・水陸両用機・人間は引けない（空は台車を持ち上げられない・水中では引けない・人間は力が足りない）【仮】 */
export const TOW_KINDS = Object.freeze(['scav', 'ponco', 'gunner', 'heavy', 'giant']);

/** 命令を出せなかった理由 → 画面に出す短い言葉 */
export const LAUNCHER_MESSAGES = Object.freeze({
  off: '発射台は使えません',
  cost: '資材が足りません',
  limit: '発射台はもう持っています',
  none: '発射台がありません',
  noTower: '発射台を引けるロボを選んでください',
  cannot: 'このロボは発射台を引けません',
  busy: 'いまは使えません',
  towed: 'ロボがつないでいる間は構えられません',
  far: '遠すぎて届きません',
  out: '地図の外です',
  notTowed: 'つないでいません',
});

/** 爆発のダメージ（乱数なし・純粋な関数）。distPx＝爆発の中心からの距離（ワールド px）。
 *  1.5 タイル以内は 600、そこから 3 タイルで 200 まで直線で下がる。3 タイルより外は 0。あとでお話ミッションと共有できる */
export function launcherBlastDamage(distPx, cfg = LAUNCHER) {
  if (!(distPx >= 0) || distPx > cfg.radius) return 0;
  if (distPx <= cfg.coreRadius) return cfg.coreDamage;
  const k = (distPx - cfg.coreRadius) / (cfg.radius - cfg.coreRadius);
  return cfg.coreDamage + (cfg.edgeDamage - cfg.coreDamage) * k;
}

/** sim.js が最後に渡す物（機体を出す・探す・移動命令）。このファイルは sim.js を import しないので、ここで受け取る */
const host = {};
export function bindLauncher(api) { Object.assign(host, api); }

const byId = (sim, id) => sim.units.find(u => u.id === id) || null;
export const isLauncherUnit = u => !!u?.launch;
/** 生きている発射台（機体）の並び */
export const launchersOf = sim => sim.units.filter(u => u.launch && u.hp > 0);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** createSim が、有効な時だけ呼ぶ */
export function createLauncherState() {
  return { builds: [], pending: [], shots: [], owned: [], nextBuild: 1, spent: 0, built: 0, fired: 0, lost: 0 };
}

// ---- 調べる（画面の ☰ も使う。命令は出さない） ----
/** 発射台を持っている数（建造中・できた物。構え中も数える。飛んでいるミサイルは数えない＝発射台はもうない） */
export const heldCount = sim => (sim.launcher ? sim.launcher.builds.length + launchersOf(sim).length : 0);
export function canBuild(sim) {
  if (!sim.launcher || !sim.mission) return { ok: false, reason: 'off' };
  if (heldCount(sim) >= LAUNCHER.maxAtOnce) return { ok: false, reason: 'limit' };
  if (sim.mission.delivered < LAUNCHER.cost - 1e-6) return { ok: false, reason: 'cost' };
  return { ok: true, reason: null };
}
/** 発射台を引ける機体か */
export const canTow = u => !!u && u.side === 'ally' && !u.human && u.hp > 0 && TOW_KINDS.includes(u.kind) && (u.z || 0) === 0 && !u.tow;
/** その発射台を引いているロボ */
export const towerOf = (sim, l) => (l?.launch?.towId != null ? byId(sim, l.launch.towId) : null);
/** 撃てるか（発射台・狙う地点）。{ ok, reason, dist } */
export function canFire(sim, l, x, y) {
  if (!sim.launcher) return { ok: false, reason: 'off' };
  if (!l?.launch || l.hp <= 0) return { ok: false, reason: 'none' };
  if (l.launch.phase) return { ok: false, reason: 'busy' };
  if (!(x >= 0 && y >= 0 && x < sim.map.w * TILE && y < sim.map.h * TILE)) return { ok: false, reason: 'out' };
  const d = Math.hypot(x - l.x, y - l.y);
  if (d > LAUNCHER.range + 1e-6) return { ok: false, reason: 'far', dist: d };
  return { ok: true, reason: null, dist: d };
}

// ---- 命令（sim.commands に type: 'launcher…' で入れる。applyCommands が applyLauncherCommand に渡す。リプレイにもそのまま記録される） ----
const push = (sim, cmd) => { sim.commands.push(cmd); };
/** 発射台を作る（拠点＝資材の届け先で、時間をかけて作る）。命令を出せなければ理由を返す */
export function issueLauncherBuild(sim) {
  const r = canBuild(sim);
  if (r.ok) push(sim, { type: 'launcherBuild' });
  return r;
}
/** このロボで発射台を引く（いちばん近い発射台へ。遠ければロボが寄っていって、着いたらつなぐ） */
export function issueLauncherHitch(sim, towerId) {
  if (!sim.launcher) return { ok: false, reason: 'off' };
  const t = byId(sim, towerId);
  if (!t || t.side !== 'ally' || t.human || !TOW_KINDS.includes(t.kind) || t.hp <= 0) return { ok: false, reason: 'noTower' };
  if (!canTow(t)) return { ok: false, reason: 'busy' };
  if (!freeLauncherFor(sim, t)) return { ok: false, reason: 'none' };
  push(sim, { type: 'launcherHitch', towerId });
  return { ok: true, reason: null };
}
/** 外す */
export function issueLauncherUnhitch(sim, towerId) {
  const t = byId(sim, towerId);
  if (!sim.launcher || !t?.tow) return { ok: false, reason: 'notTowed' };
  push(sim, { type: 'launcherUnhitch', towerId });
  return { ok: true, reason: null };
}
/** 撃つ（地点は ワールド px。整数にして記録する）。引いているロボは自動で外れる */
export function issueLauncherFire(sim, launcherId, x, y) {
  const l = byId(sim, launcherId);
  x = Math.round(x); y = Math.round(y);
  const r = canFire(sim, l, x, y);
  if (r.ok) push(sim, { type: 'launcherFire', launcherId, x, y });
  return r;
}

/** 引ける（引かれていない・構えていない）いちばん近い発射台 */
function freeLauncherFor(sim, t) {
  let best = null, bd = Infinity;
  for (const l of launchersOf(sim)) {
    if (l.launch.towId != null || l.launch.phase) continue;
    const d = dist(l, t);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

function attach(sim, l, t) {
  l.launch.towId = t.id; l.launch.lastTowId = t.id; t.tow = l.id; t.speedMul = LAUNCHER.towMul; // 引くロボの速さ × 0.6
  sim.fx.push({ type: 'launcherHitch', unit: l.id, by: t.id, x: l.x, y: l.y, t: sim.time });
}
function detach(sim, l, silent = false) {
  const t = byId(sim, l.launch.towId);
  l.launch.towId = null;
  if (t) { t.tow = null; if (t.speedMul === LAUNCHER.towMul) t.speedMul = 1; }
  if (!silent) sim.fx.push({ type: 'launcherUnhitch', unit: l.id, x: l.x, y: l.y, t: sim.time });
}

/** applyCommands から 1 つずつ渡される。sim.launcher が無ければ何もしない */
export function applyLauncherCommand(sim, cmd) {
  const L = sim.launcher; if (!L) return;
  if (cmd.type === 'launcherBuild') {
    if (!canBuild(sim).ok) return;
    sim.mission.delivered -= LAUNCHER.cost; L.spent += LAUNCHER.cost;
    L.builds.push({ id: L.nextBuild++, left: LAUNCHER.buildSec, total: LAUNCHER.buildSec });
  } else if (cmd.type === 'launcherHitch') {
    const t = byId(sim, cmd.towerId);
    if (!t || !canTow(t)) return;
    const l = freeLauncherFor(sim, t); if (!l) return;
    if (dist(l, t) <= LAUNCHER.hitchRange) { attach(sim, l, t); return; }
    L.pending = L.pending.filter(p => p.towerId !== t.id);
    L.pending.push({ towerId: t.id, launcherId: l.id, tick: sim.tick });
    host.issueOrder(sim, [t.id], [{ tx: toTile(l.x), ty: toTile(l.y) }], { mode: 'rush' }); // 寄っていく（撃たずに走る）
  } else if (cmd.type === 'launcherUnhitch') {
    const t = byId(sim, cmd.towerId);
    L.pending = L.pending.filter(p => p.towerId !== cmd.towerId);
    const l = t?.tow != null ? byId(sim, t.tow) : null;
    if (l?.launch) detach(sim, l);
  } else if (cmd.type === 'launcherFire') {
    const l = byId(sim, cmd.launcherId);
    if (!canFire(sim, l, cmd.x, cmd.y).ok) return;
    if (l.launch.towId != null) detach(sim, l, true); // 引いているロボは自動で外れる
    l.launch.phase = 'aim'; l.launch.left = LAUNCHER.aimSec; l.launch.x = cmd.x; l.launch.y = cmd.y;
    if (Math.abs(cmd.x - l.x) > 1) l.facing = cmd.x > l.x ? 1 : -1;
    sim.fx.push({ type: 'launcherAim', unit: l.id, x: l.x, y: l.y, tx: cmd.x, ty: cmd.y, t: sim.time });
  }
}

// ---- 毎ステップ ----
function spawnLauncher(sim) {
  const ex = sim.mission.extraction, tile = nearestPassable(sim.map, ex.tx, ex.ty) || ex;
  const u = host.deployUnit(sim, 'launcher', tile, { label: '発射台', aiAlly: true }); // aiAlly: ロボの数（FIELD_CAP・全滅の判定）に数えない・プレイヤーは選べない
  if (!u) return null;
  u.kits = 0; u.shieldMax = 0; u.shieldHp = 0; u.armor = 0; u.stance = 'hold'; // シールドなし・装甲 0・キットなし
  u.launch = { towId: null, phase: null, left: 0, x: 0, y: 0 };
  sim.launcher.built++;
  sim.launcher.owned.push({ id: u.id, x: u.x, y: u.y, phase: null });
  sim.fx.push({ type: 'launcherBuilt', unit: u.id, x: u.x, y: u.y, t: sim.time });
  return u;
}

/** 爆発: 敵に（距離で）ダメージ。味方（ロボ・人間・発射台どれも）には当たらない。遮蔽物は壊れる（落とし物は弾で壊れた時と同じ抽選＝その時だけ乱数を引く。佳之さんの決定 10/26）。ダメージの計算に乱数は使わない */
export function blast(sim, x, y, by = null) {
  const hits = [];
  for (const u of sim.units) {
    if (u.side === 'ally' || u.hp <= 0 || unitBand(u) === BAND.UNDERWATER) continue;
    const raw = launcherBlastDamage(Math.hypot(u.x - x, u.y - y));
    if (raw <= 0) continue;
    const def = terrainDefApplies(u) ? TERRAIN[tileAt(sim.map, toTile(u.x), toTile(u.y))].def : 1; // 地形の守り（森 0.8・山 0.65）
    let dmg = raw * def;
    if (u.shieldHp > 0) { // シールドが効く: 盾が全部受ける（乱数なし）。足りない分は捨てる
      const wear = u.shieldWear ?? 1;
      u.shieldHp = Math.max(0, u.shieldHp - dmg * wear); u.lastHit = sim.time;
      hits.push({ id: u.id, dmg: 0, shield: true }); continue;
    }
    dmg = Math.round(dmg);
    u.hp -= dmg; u.lastHit = sim.time;
    hits.push({ id: u.id, dmg });
    if (by != null) sim.fx.push({ type: 'missileHit', from: by, to: u.id, dmg, kill: u.hp <= 0, t: sim.time });
  }
  for (const c of sim.cover) {
    const raw = launcherBlastDamage(Math.hypot(c.cx - x, c.cy - y));
    if (raw <= 0) continue;
    if (damageCover(c, Math.round(raw)) !== 'broke') continue;
    sim.fx.push({ type: 'coverBreak', id: c.id, kind: c.kind, x: c.x, y: c.y, cx: c.cx, cy: c.cy, rx: c.rx, ry: c.ry, t: sim.time });
    host.dropFromCover?.(sim, c); // 落とし物（弾で壊れた時と同じ抽選。乱数を引くのは ?launcher=1 で撃って遮蔽物が壊れた時だけ）
  }
  sim.fx.push({ type: 'launcherBlast', x, y, r: LAUNCHER.radius, hits: hits.length, t: sim.time });
  return hits;
}

/** 1 ステップ（sim.js の stepSim から。sim.launcher が無ければ呼ばれない）。倒された敵は、次の updateCombat の removeDead で消える */
export function stepLauncher(sim, dt) {
  const L = sim.launcher; if (!L) return;
  // 建造
  for (let i = L.builds.length - 1; i >= 0; i--) {
    const b = L.builds[i];
    b.left -= dt;
    if (b.left <= 1e-6) { L.builds.splice(i, 1); spawnLauncher(sim); }
  }
  // 寄っていって、近づいたらつなぐ
  L.pending = L.pending.filter(p => {
    const t = byId(sim, p.towerId), l = byId(sim, p.launcherId);
    if (!t || !l?.launch || t.hp <= 0 || !canTow(t) || l.launch.towId != null || l.launch.phase) return false;
    if (dist(l, t) <= LAUNCHER.hitchRange) { attach(sim, l, t); return false; }
    return !(!t.order && sim.tick - p.tick > 3); // 命令が消えた（止まれ・別の命令）ら、つなぐのをやめる
  });
  // 発射台ごとの状態
  for (const l of launchersOf(sim)) {
    const st = l.launch;
    if (st.towId != null) {
      const t = byId(sim, st.towId);
      if (!t || t.hp <= 0) { st.towId = null; if (t) t.tow = null; }
      else { l.x = t.x - (t.facing || 1) * LAUNCHER.towOffset; l.y = t.y + 2; l.facing = t.facing; l.moving = !!t.moving; }
    }
    if (st.towId == null) l.moving = false;
    if (st.phase === 'aim') {
      st.left -= dt;
      if (st.left <= 1e-6) { // 撃った: 発射台ごとなくなる（1 台 1 発）。ミサイルは飛んでいく
        L.shots.push({ x0: l.x, y0: l.y, x: st.x, y: st.y, left: LAUNCHER.flightSec, total: LAUNCHER.flightSec, by: st.lastTowId ?? null });
        sim.fx.push({ type: 'launcherLaunch', x: l.x, y: l.y, tx: st.x, ty: st.y, t: sim.time });
        L.fired++;
        l.hp = 0; l.launch.phase = 'gone';
        sim.units = sim.units.filter(u => u !== l);
        L.owned = L.owned.filter(o => o.id !== l.id);
        continue;
      }
    }
    const o = L.owned.find(q => q.id === l.id);
    if (o) { o.x = l.x; o.y = l.y; o.phase = st.phase; }
  }
  // 撃つ前に壊された: 発射台もミサイルも消える（小さな爆発の見た目だけ。まわりにダメージなし。負けにもしない）
  for (let i = L.owned.length - 1; i >= 0; i--) {
    const o = L.owned[i];
    if (sim.units.some(u => u.id === o.id)) continue;
    L.owned.splice(i, 1); L.lost++;
    for (const p of L.pending) if (p.launcherId === o.id) p.launcherId = -1; // つなぐ予定は次のステップで消える
    for (const u of sim.units) if (u.tow === o.id) { u.tow = null; if (u.speedMul === LAUNCHER.towMul) u.speedMul = 1; }
    sim.fx.push({ type: 'launcherLost', x: o.x, y: o.y, aiming: o.phase === 'aim', t: sim.time });
  }
  // 飛んでいるミサイル → 着弾
  for (let i = L.shots.length - 1; i >= 0; i--) {
    const s = L.shots[i];
    s.left -= dt;
    if (s.left <= 1e-6) { L.shots.splice(i, 1); blast(sim, s.x, s.y, s.by); provokeNear(sim, s); }
  }
}

/**
 * 着弾で気づかせる（10/26 の決定）: 着弾点から provokeTiles 以内に生きた仲間がいる巡回の群れに、今ある「気づいて追う」仕組み（g.provokedBy）を使う。
 * 追う相手は、撃った場所（発射台のあった所）にいちばん近い味方（物・捕まった人・AI の味方は除く）。発射台は撃つと消えるので、撃った場所の方へ向かってくる形になる。
 * 実際に追うか（届くか）は sim.js の updatePatrols が今までどおり決める。乱数は使わない
 */
export function provokeNear(sim, shot) {
  const pr = LAUNCHER.provokeTiles * TILE;
  let by = null, bd = Infinity;
  for (const u of sim.units) {
    if (u.side !== 'ally' || u.object || u.aiAlly || u.captured != null || u.hp <= 0) continue;
    const d = Math.hypot(u.x - shot.x0, u.y - shot.y0); if (d < bd) { bd = d; by = u; }
  }
  if (!by) return 0;
  let n = 0;
  for (const g of sim.groups) {
    if (g.role !== 'patrol') continue;
    if (g.unitIds.some(id => { const u = sim.units.find(v => v.id === id); return u && u.hp > 0 && Math.hypot(u.x - shot.x, u.y - shot.y) <= pr; })) { g.provokedBy = by.id; n++; }
  }
  if (n) sim.fx.push({ type: 'launcherProvoke', groups: n, by: by.id, x: shot.x, y: shot.y, t: sim.time });
  return n;
}

/** hashSim が混ぜる値。何も使っていない時（建造・発射台・ミサイル・記録がすべて空）は h をそのまま返す＝使わない時とハッシュが同じ */
export function hashLauncher(sim, h) {
  const L = sim.launcher;
  if (!L || (!L.builds.length && !L.shots.length && !L.owned.length && !L.built && !L.fired && !L.lost && !L.spent && !L.pending.length)) return h;
  const mix = v => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; };
  mix(0x4c41); mix(L.spent); mix(L.built); mix(L.fired); mix(L.lost);
  for (const b of L.builds) { mix(b.id); mix(Math.round(b.left * 1000)); }
  for (const s of L.shots) { mix(Math.round(s.x)); mix(Math.round(s.y)); mix(Math.round(s.left * 1000)); }
  for (const l of launchersOf(sim)) {
    mix(l.id); mix(l.launch.towId ?? -1); mix(l.launch.phase === 'aim' ? 1 : 0); mix(Math.round(l.launch.left * 1000)); mix(Math.round(l.launch.x)); mix(Math.round(l.launch.y));
  }
  for (const p of L.pending) { mix(p.towerId); mix(p.launcherId); }
  return h >>> 0;
}
