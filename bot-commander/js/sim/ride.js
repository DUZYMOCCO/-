// 乗る（v0.4.12-dev の試作。v1.0.0 で席・当たる確率・捕まらない・撃てないを決めた）: 人間（少年・少女）がロボットの「背中」または「中」に乗る決まりと計算。
// データと計算だけ（DOM・Pixi なし）。数値・ルールはすべてここで調整する。見せる場所は ?ridedemo=1。
//
// だれも乗らない時は何もしない: sim.ride が無ければ stepRide・onHostHit は何もせず、乱数も引かない。
// 機体に新しいプロパティを足すのは「乗る」を命令した時だけ（人間に ride、気絶した時だけ dazed。ロボには何も足さない）。
// 乗っている人の位置と z は、乗せているロボのものを毎ステップ写す（捕まった人間を運ぶ sim.js の updateCarry と同じ形）。
// 帯は unitBand(乗せているロボ) になるので、altitude.js の canHit・coverApplies はそのまま使える。
import { BAND, ALT, unitBand } from './altitude.js?v=1';
import { nearestPassable, toTile, tileCenter } from './map.js?v=6';

export const RIDE_MODE = Object.freeze({ BACK: 'back', INSIDE: 'inside' });

/** どのロボに乗れるか・乗れる数（背中・中は別）。書いていない種類（異星生物・射撃型・重装型）には乗れない【仮】 */
// v1.0.0（10/26 佳之さんの決定）: PONCO は人と同じくらいの大きさなので背中1人だけ（中はない）。巨大機は中（操縦席）2人だけ（背中はない）
export const RIDE_TABLE = Object.freeze({
  giant: Object.freeze({ back: 0, inside: 2 }),   // 巨大機: 中（操縦席）に2人だけ
  ponco: Object.freeze({ back: 1, inside: 0 }),   // PONCO02: 背中に1人だけ（中はない）
  scav: Object.freeze({ back: 1, inside: 0 }),    // ツギハギ号: 小さいので背中に1人だけ（中はない）
});

/** 調整用のつまみ【仮】 */
export const RIDE = Object.freeze({
  boardRange: 40,        // 乗れる距離（ワールド px。1マス＝32）。これより遠いと乗れない
  boardSec: 0.8,         // 乗るのにかかる時間（秒）。この間は外にいて、捕まることがある（乗り終わったら背中でも中でも捕まらない）
  alightSec: 0.6,        // 降りるのにかかる時間（秒）
  alightDist: 24,        // 降りる場所（ロボの後ろ側へこの px）
  backHitChance: 0.10,   // v1.0.0: 0.18→0.10（決定）。背中: ロボが体に受けた一撃のうち、乗っている人にも当たる確率
  backHitMult: 0.5,      // 乗っている人に当たるダメージ（ロボが受けた量にこの倍率）
  fallDmg: Object.freeze({ back: 8, inside: 3 }),   // ロボが壊れて放り出された時のダメージ（人間の HP は 30）
  airFallMult: 2,        // 空を飛んでいるロボが壊れた時は、落ちるのでダメージが何倍か
  daze: Object.freeze({ back: 2, inside: 1, washed: 1 }), // 放り出された後の気絶（動けない）秒数。washed＝背中のロボが水に潜って流された時
  // 背中の席（ロボの足元からの位置 px。x はロボの向きで反転する）。何人目かで決まる
  seats: Object.freeze([Object.freeze({ x: -8, y: 0 }), Object.freeze({ x: 8, y: 0 }), Object.freeze({ x: 0, y: -3 })]),
});

/** 乗れなかった理由 → 画面に出す短い言葉 */
export const RIDE_MESSAGES = Object.freeze({
  noHuman: '人間を選んでください',
  noHost: '乗れるロボがありません',
  cannot: 'このロボには乗れない',
  busy: 'いまは乗れない',
  far: 'ロボのそばへ行こう',
  full: 'もう満員',
  water: '水の中の背中には乗れない',
  air: '空の上では降りられない',
  sealedWater: '水の中では降りられない',
  notRiding: '乗っていない',
});

const byId = (sim, id) => sim.units.find(u => u.id === id) || null;
const modeOk = mode => mode === RIDE_MODE.BACK || mode === RIDE_MODE.INSIDE;

/** 乗せられるロボか（味方のロボット・生きている・表にある） */
export const isHostKind = u => !!u && u.side === 'ally' && !u.human && u.hp > 0 && !!RIDE_TABLE[u.kind];
/** 乗っている（乗る途中・降りる途中も含む）人間か */
export const isRiding = u => !!u?.ride;
/** 乗り終わっている人（背中・中とも）。v1.0.0 の決定: 乗っている間はだれも捕まらない・撃てない（資材は集められる） */
export const isMounted = u => u?.ride?.phase === 'on';
/** 捕まらない人: 乗り終わっている（背中も中も。乗る途中・降りる途中は外にいるので捕まることがある） */
export const cannotBeCaptured = u => isMounted(u);
/** 乗っている人（乗る途中・降りる途中も含む）は撃てない */
export const riderCannotShoot = u => !!u?.ride;
/** ロボの中に乗り終わっている人（外から見えない・撃たれない・捕まらない） */
export const isSealed = u => u?.ride?.mode === RIDE_MODE.INSIDE && u.ride.phase === 'on';
/** そのロボに乗っている人間（mode を渡せば背中／中だけ）。乗る途中の人も数える（席を取っているので） */
export const ridersOf = (sim, hostId, mode) => sim.units.filter(u => u.ride && u.ride.host === hostId && (!mode || u.ride.mode === mode));
export const rideCapacity = (host, mode) => (host && RIDE_TABLE[host.kind]?.[mode]) || 0;

/** 乗れるか。{ ok, reason }。reason は RIDE_MESSAGES のキー */
export function canBoard(sim, h, host, mode, { pending = 0 } = {}) {
  if (!h || !h.human || h.side !== 'ally' || h.hp <= 0) return { ok: false, reason: 'noHuman' };
  if (!host || !isHostKind(host)) return { ok: false, reason: 'noHost' };
  if (!modeOk(mode) || rideCapacity(host, mode) <= 0) return { ok: false, reason: 'cannot' };
  if (h.ride || h.captured != null || (h.dazed || 0) > 0) return { ok: false, reason: 'busy' };
  if (Math.hypot(h.x - host.x, h.y - host.y) > RIDE.boardRange) return { ok: false, reason: 'far' };
  if (mode === RIDE_MODE.BACK && unitBand(host) === BAND.UNDERWATER) return { ok: false, reason: 'water' };
  if (ridersOf(sim, host.id, mode).length + pending >= rideCapacity(host, mode)) return { ok: false, reason: 'full' };
  return { ok: true, reason: null };
}

/** 降りられるか。空の上・水の中（中に乗っている時）は降りられない */
export function canAlight(sim, h) {
  if (!h?.ride || h.ride.phase !== 'on') return { ok: false, reason: 'notRiding' };
  const host = byId(sim, h.ride.host);
  if (host) {
    const band = unitBand(host);
    if (band === BAND.AIR) return { ok: false, reason: 'air' };
    if (band === BAND.UNDERWATER) return { ok: false, reason: 'sealedWater' };
  }
  return { ok: true, reason: null };
}

/** 乗る命令（次のステップで反映）。その場で調べて、乗れなければ命令を出さずに理由を返す。sim.ride はここで初めて作る */
export function issueBoard(sim, humanId, hostId, mode) {
  const r = canBoard(sim, byId(sim, humanId), byId(sim, hostId), mode);
  if (r.ok) (sim.ride ??= { cmds: [] }).cmds.push({ type: 'board', humanId, hostId, mode });
  return r;
}
/** 降りる命令（人間の id の並び）。降りられた人数を返す */
export function issueAlight(sim, humanIds) {
  let n = 0;
  for (const id of [].concat(humanIds)) {
    if (!canAlight(sim, byId(sim, id)).ok) continue;
    (sim.ride ??= { cmds: [] }).cmds.push({ type: 'alight', humanId: id }); n++;
  }
  return n;
}

// ---- 席・降りる場所 ----
function seatPos(sim, host, rd, h) {
  if (rd.mode === RIDE_MODE.INSIDE) return { x: host.x, y: host.y };
  const idx = Math.max(0, ridersOf(sim, host.id, RIDE_MODE.BACK).sort((a, b) => a.id - b.id).indexOf(h));
  const s = RIDE.seats[idx % RIDE.seats.length];
  return { x: host.x + s.x * (host.facing || 1), y: host.y + s.y };
}
/** ロボの後ろ側の歩ける場所（なければ近くの歩けるマス）。n 人目は少しずらす */
function landingSpot(sim, host, n = 0) {
  const f = host.facing || 1;
  const x = host.x - f * RIDE.alightDist, y = host.y + 10 + n * 8;
  const p = nearestPassable(sim.map, toTile(x), toTile(y)) || { tx: toTile(host.x), ty: toTile(host.y) };
  return toTile(x) === p.tx && toTile(y) === p.ty ? { x, y } : { x: tileCenter(p.tx), y: tileCenter(p.ty) };
}

// ---- 毎ステップ ----
/** 乗っている人をロボに合わせて動かす・乗り降りを進める・壊れたら降ろす。sim.js の stepSim が updateCarry のあとで1回呼ぶ。乗る命令が1度も出ていなければ何もしない */
export function stepRide(sim, dt) {
  const R = sim.ride; if (!R) return;
  if (R.cmds.length) applyRideCommands(sim, R.cmds.splice(0));
  for (const h of sim.units) {
    if ((h.dazed || 0) > 0) { // 気絶: 動けない（命令は消す）
      h.dazed = Math.max(0, h.dazed - dt); h.order = null; h.moving = false;
      if (!h.dazed) delete h.dazed;
    }
    if (h.ride) stepRider(sim, h, dt);
  }
}

function applyRideCommands(sim, cmds) {
  for (const c of cmds) {
    const h = byId(sim, c.humanId);
    if (c.type === 'board') {
      const host = byId(sim, c.hostId);
      const r = canBoard(sim, h, host, c.mode);
      if (!r.ok) { sim.fx.push({ type: 'rideFail', id: c.humanId, reason: r.reason, x: h?.x ?? 0, y: h?.y ?? 0, t: sim.time }); continue; }
      h.ride = { host: host.id, mode: c.mode, phase: 'boarding', t: 0, from: { x: h.x, y: h.y }, to: null };
      h.order = null; h.moving = false; h.gathering = null;
    } else if (c.type === 'alight') {
      if (!canAlight(sim, h).ok) continue;
      const host = byId(sim, h.ride.host);
      if (!host) continue;
      const n = Math.max(0, ridersOf(sim, host.id).filter(u => u.ride.phase === 'alighting').length);
      h.ride.phase = 'alighting'; h.ride.t = 0; h.ride.to = landingSpot(sim, host, n);
    }
  }
}

function stepRider(sim, h, dt) {
  const rd = h.ride, host = byId(sim, rd.host);
  if (h.captured != null) { // 異星生物に捕まった（乗る途中・降りる途中だけ。乗り終わっていれば捕まらない）: 乗るのをやめる。位置は運ぶ側が決める
    delete h.ride; sim.fx.push({ type: 'rideLost', id: h.id, host: rd.host, x: h.x, y: h.y, t: sim.time, label: h.label });
    return;
  }
  if (!host || host.hp <= 0) { eject(sim, h, 'broken'); return; }
  if (rd.mode === RIDE_MODE.BACK && unitBand(host) === BAND.UNDERWATER) { eject(sim, h, 'washed'); return; }
  rd.t += dt;
  if (rd.phase === 'boarding' && rd.t >= RIDE.boardSec - 1e-6) {
    rd.phase = 'on'; rd.t = 0;
    sim.fx.push({ type: 'rideOn', id: h.id, host: host.id, mode: rd.mode, x: host.x, y: host.y, t: sim.time, label: h.label });
  } else if (rd.phase === 'alighting' && rd.t >= RIDE.alightSec - 1e-6) {
    h.x = rd.to.x; h.y = rd.to.y; h.z = 0; h.facing = host.facing; h.anchor = { x: h.x, y: h.y }; h.moving = false;
    delete h.ride;
    sim.fx.push({ type: 'rideOff', id: h.id, host: host.id, x: h.x, y: h.y, t: sim.time, label: h.label });
    return;
  }
  // 位置と高さを写す（乗る途中・降りる途中はなめらかに）
  const seat = seatPos(sim, host, rd, h), hz = host.z || 0;
  let p = 1, from = seat, to = seat;
  if (rd.phase === 'boarding') { p = Math.min(1, rd.t / RIDE.boardSec); from = rd.from; }
  else if (rd.phase === 'alighting') { p = Math.min(1, rd.t / RIDE.alightSec); to = rd.to; }
  h.x = from.x + (to.x - from.x) * p; h.y = from.y + (to.y - from.y) * p;
  h.z = rd.phase === 'boarding' ? hz * p : rd.phase === 'alighting' ? hz * (1 - p) : hz;
  h.facing = host.facing; h.order = null; h.moving = false;
}

/** ロボが壊れた・水に潜った時、乗っている人を近くの歩ける場所へ降ろす。乗り終わっていた人だけダメージと気絶（中は軽い）。空から落ちると倍 */
function eject(sim, h, why) {
  const rd = h.ride, on = rd.phase === 'on', mode = rd.mode;
  let dmg = 0, daze = 0.5;
  if (why === 'broken' && on) { dmg = RIDE.fallDmg[mode] * ((h.z || 0) >= ALT.airFrom ? RIDE.airFallMult : 1); daze = RIDE.daze[mode]; }
  else if (why === 'washed') daze = RIDE.daze.washed;
  const near = nearestPassable(sim.map, toTile(h.x), toTile(h.y), h.moves);
  if (near) { h.x = tileCenter(near.tx) + (h.id % 3 - 1) * 9; h.y = tileCenter(near.ty) + (h.id % 2) * 7; } // 何人か同時に降ろされても重ならないように少しずらす
  delete h.ride; h.z = 0; h.moving = false; h.anchor = { x: h.x, y: h.y };
  if (dmg > 0) { h.hp -= dmg; h.lastHit = sim.time; }
  h.dazed = daze;
  sim.fx.push({ type: 'rideEject', id: h.id, why, mode, dmg, x: h.x, y: h.y, t: sim.time, label: h.label });
}

/**
 * ロボの体に攻撃が当たった時（盾・遮蔽物に止められなかった時）、sim.js の updateCombat が呼ぶ。
 * 背中に乗り終わっている人がいれば、確率で1人にも当たる（中は当たらない）。背中に誰もいなければ乱数を引かない。
 */
export function onHostHit(sim, host, dmg) {
  const backs = ridersOf(sim, host.id, RIDE_MODE.BACK).filter(u => u.ride.phase === 'on' && u.hp > 0);
  if (!backs.length) return;
  if (sim.rng() >= RIDE.backHitChance) return;
  backs.sort((a, b) => a.id - b.id);
  const h = backs[Math.min(backs.length - 1, Math.floor(sim.rng() * backs.length))];
  const d = Math.max(1, Math.round(dmg * RIDE.backHitMult));
  h.hp -= d; h.lastHit = sim.time;
  sim.fx.push({ type: 'rideHit', id: h.id, host: host.id, dmg: d, x: h.x, y: h.y, t: sim.time, label: h.label });
}
