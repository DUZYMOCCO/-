// ランダム出現（Kenshi の Homeless Spawns / Camps / Nests にならう。research/spawning.md）。
// - 地方ごとの重み付きの表（spawn_data.js）から、隊商・盗賊（こそ泥）・野盗が画面の外に出て、遠くへ行くと消える。
// - 野営地（野盗・盗賊）と獣の巣がランダムな場所に出て、住人を倒すと消え、しばらくして別の場所に出直す。
// - 巣・野営地の住人は縄張り（leash）から出すぎると戻る。
// 乱数は state.spawn.rng という別の流れだけを使う（state.rngState は進めない）。
// state.spawn が無ければ何もしない（createWorld の既定は無し。ゲームは main.js で有効にする）。

import { makePoles } from './abduct.js';
import { MEDKIT_USES, MERCHANT_STOCK } from './medkit.js';
import { rand, randInt, randRange } from './rng.js';
import { makeActor, TOWN1, TOWN2 } from './world.js';
import { giveCrossbow, START_BOLTS } from './crossbow.js';
import { WORLD_HALF, WEAPONS, PART_MAX, makeEvent, indexActors } from './data.js';
import { blockedAt } from './collide.js';
import { REGIONS, regionAt, SQUAD_TYPES, ROLES, SITE_TYPES, SPAWN, MOB_LOOK_ROLES, MACHINE_ROLES } from './spawn_data.js';

const TAU = Math.PI * 2;

// 種から別の流れの初期値を作る（rngState とは別のハッシュ）。
export function spawnSeed(seed) {
  let h = (Number(seed) | 0) ^ 0x51ed270b;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return h | 0 || 0x2545f491;
}

export function initSpawn(state, opts) {
  const o = opts || {};
  let rate = Number(o.spawnRate);
  if (!Number.isFinite(rate) || rate < 0) rate = 1;
  rate = Math.min(20, rate);
  const t = state.tick || 0;
  state.spawn = {
    on: true,
    rate,
    rng: spawnSeed(state.seed),
    nextSquad: 1,
    nextSite: 1,
    homelessAt: t + 200,
    campAt: t + SPAWN.siteFirstAt[0],
    nestAt: t + SPAWN.siteFirstAt[1],
    sites: [],
    demand: null,
    stats: { squads: 0, despawned: 0, sites: 0, cleared: 0 },
  };
  return state.spawn;
}

// 別の流れで fn を動かす。fn の中の rand(state) は state.spawn.rng を進め、rngState は元に戻る。
function withSpawnRng(state, fn) {
  const saved = state.rngState;
  state.rngState = state.spawn.rng;
  try {
    return fn();
  } finally {
    state.spawn.rng = state.rngState;
    state.rngState = saved;
  }
}

function weightedPick(state, table) {
  let total = 0;
  for (const k of Object.keys(table)) total += Math.max(0, table[k]);
  if (total <= 0) return null;
  let r = rand(state) * total;
  for (const k of Object.keys(table)) {
    r -= Math.max(0, table[k]);
    if (r < 0) return k;
  }
  return Object.keys(table)[0];
}

function partyOf(state) {
  const ids = Array.isArray(state.squadIds) && state.squadIds.length ? state.squadIds : [state.playerId];
  const out = [];
  for (const a of state.actors) if (ids.includes(a.id) && a.state !== 'dead') out.push(a);
  return out;
}

function anchorOf(state) {
  const party = partyOf(state);
  return party.length ? party[0] : null;
}

function standing(a) {
  return a && (a.state === 'idle' || a.state === 'move' || a.state === 'fight');
}

function clampIn(v, margin) {
  const m = WORLD_HALF - margin;
  return v < -m ? -m : v > m ? m : v;
}

function membersOf(state, squad, byId) {
  const out = [];
  for (const id of squad.memberIds) {
    const a = byId.get(id);
    if (a) out.push(a);
  }
  return out;
}

function countAlive(state) {
  let all = 0;
  let spawned = 0;
  for (const a of state.actors) {
    if (a.state === 'dead') continue;
    all += 1;
    if (a.spawned) spawned += 1;
  }
  return { all, spawned };
}

function fitsBudget(state, size) {
  const c = countAlive(state);
  return c.spawned + size <= SPAWN.actorBudget && c.all + size <= SPAWN.aliveLimit;
}

function homelessSquads(state) {
  return state.squads.filter((s) => s.kind && !s.siteId);
}

function liveSites(state, kind) {
  return state.spawn.sites.filter((s) => s.kind === kind);
}

function rollSize(state, type) {
  const roles = [];
  for (const [role, min, max] of type.members) {
    const n = randInt(state, min, max);
    for (let i = 0; i < n; i += 1) roles.push(role);
  }
  return roles;
}

function renameFor(state, actor, role) {
  if (MOB_LOOK_ROLES[role] || MACHINE_ROLES.includes(role)) {
    // 人食い・グールは役目の名前＋番号（例: 人食い2、グール）
    const base = ROLES[role].name;
    const used = new Set(state.actors.filter((a) => a !== actor).map((a) => a.name));
    let name = base;
    let n = 2;
    while (used.has(name)) name = base + n++;
    actor.name = name;
    return;
  }
  if (role === 'merchant' || role === 'caravan_guard' || role === 'raider' || role === 'raider_boss') {
    const prefix = role === 'merchant' ? '商人' : role === 'caravan_guard' ? '護衛' : '野盗';
    const base = prefix + String(actor.name).replace(/^(衛兵|盗賊)/, '').replace(/\d+$/, '');
    const used = new Set(state.actors.filter((a) => a !== actor).map((a) => a.name));
    let name = base;
    let n = 2;
    while (used.has(name)) name = base + n++;
    actor.name = name;
  }
}

// 部隊を1つ作る（乱数は呼ぶ側で withSpawnRng の中）。
function buildSquad(state, typeKey, x, z, extra) {
  const type = SQUAD_TYPES[typeKey];
  const roles = rollSize(state, type);
  const id = 'sp' + state.spawn.nextSquad;
  state.spawn.nextSquad += 1;
  const squad = {
    id,
    faction: type.faction,
    kind: typeKey,
    home: { x, z },
    mode: 'spawned',
    size: roles.length,
    waypoints: [],
    wpIndex: 0,
    goal: { x, z },
    restUntil: 0,
    memberIds: [],
    followOffsets: [],
    assistNotified: false,
    spawnAt: null,
    index: state.squads.length,
    siteId: null,
    phase: 'roam',
    phaseUntil: 0,
    farTicks: 0,
    victimId: null,
    demanded: false,
    peaceUntil: 0,
    region: regionAt(x, z).id,
    bornTick: state.tick,
    ...(extra || {}),
  };
  const baseAng = rand(state) * TAU;
  roles.forEach((role, i) => {
    const ang = baseAng + 0.9 * i;
    const rad = i === 0 ? 0 : 2.4;
    const ox = Math.round(Math.cos(ang) * rad * 100) / 100;
    const oz = Math.round(Math.sin(ang) * rad * 100) / 100;
    squad.followOffsets.push({ x: ox, z: oz });
    const actor = makeActor(state, type.faction, x + ox, z + oz, id, false);
    actor.spawned = true;
    actor.spawnKind = typeKey;
    actor.role = role;
    if (MACHINE_ROLES.includes(role)) actor.machine = true; // 古代の機械（解体しても肉は出ない）
    if (ROLES[role] && ROLES[role].swordsman) {
      // 人の剣士と同じ体（部位の体力・当たりの大きさ）と技量。乱数は使わない。
      actor.swordsman = true;
      actor.renderScale = 1;
      for (const key of Object.keys(actor.parts)) {
        const max = PART_MAX[key];
        actor.parts[key] = { hp: max, max };
      }
      Object.assign(actor.skills, ROLES[role].skills, { stealth: 0, assassination: 0 });
    }
    if (MOB_LOOK_ROLES[role]) actor.sex = 'm'; // 肌・服は男の人形の UV で作ったので男の型（乱数は使わない）
    renameFor(state, actor, role);
    const w = ROLES[role] && ROLES[role].weapon;
    if (w && WEAPONS[w]) actor.weapon = w;
    actor.spawnHome = { x, z };
    if (role === 'merchant') actor.money = randInt(state, 300, 800); // ★仮（Kenshi の隊商の頭は 2000〜8000）
    if (role === 'thief') actor.money = randInt(state, 5, 30);
    // 手当ての道具: 商人は売り物と自分の分、護衛・頭目は自分の分を持つ（乱数は使わない）
    if (role === 'merchant') {
      actor.medkitStock = MERCHANT_STOCK;
      actor.medkit = MEDKIT_USES;
    }
    if (role === 'caravan_guard' && i % 2 === 1) actor.medkit = 3;
    if (role === 'raider_boss' || role === 'cannibal_chief') actor.medkit = 2;
    if (role === 'raider_boss' || role === 'cannibal_chief') {
      actor.skills.attack += 4;
      actor.skills.defense += 4;
    }
    if (typeKey === 'raiders' && i === 2) giveCrossbow(actor, START_BOLTS.bandit);
    if (typeKey === 'caravan' && i === 1) giveCrossbow(actor, START_BOLTS.guard);
    if (squad.leash) actor.leash = { x: squad.leash.x, z: squad.leash.z, r: squad.leash.r };
    squad.memberIds.push(actor.id);
  });
  state.squads.push(squad);
  state.spawn.stats.squads += 1;
  return squad;
}

function nearPlaces(state, x, z, pad) {
  const places = state.places ? Object.values(state.places) : [];
  for (const p of places) {
    if (Math.hypot(p.x - x, p.z - z) < (p.r || 10) + pad) return true;
  }
  return false;
}

function roadDist(state, x, z) {
  let best = Infinity;
  for (const p of state.roads || []) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < best) best = d;
  }
  return best;
}

// 家なし部隊の出る場所: プレイヤーから 90〜140m（画面の外）、町の中・障害物の上ではない所。
function pickEdgePoint(state, anchor) {
  for (let i = 0; i < 24; i += 1) {
    const ang = rand(state) * TAU;
    const d = randRange(state, SPAWN.spawnMin, SPAWN.spawnMax);
    const x = anchor.x + Math.cos(ang) * d;
    const z = anchor.z + Math.sin(ang) * d;
    if (Math.abs(x) > WORLD_HALF - 12 || Math.abs(z) > WORLD_HALF - 12) continue;
    if (nearPlaces(state, x, z, 8)) continue;
    if (blockedAt(state, x, z, 1.5)) continue;
    return { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 };
  }
  return null;
}

// 隊商は道の上（町と町の間）の、画面の外の点から出る。
function pickCaravanPoint(state, anchor) {
  const road = state.roads || [];
  const ok = road.filter((p) => {
    const d = Math.hypot(p.x - anchor.x, p.z - anchor.z);
    return d >= SPAWN.spawnMin && d <= SPAWN.spawnMax + 40 && !blockedAt(state, p.x, p.z, 1.5);
  });
  if (!ok.length) return null;
  const p = ok[Math.floor(rand(state) * ok.length) % ok.length];
  return { x: p.x, z: p.z };
}

function spawnHomeless(state, events, forced) {
  const anchor = anchorOf(state);
  if (!anchor) return null;
  const region = regionAt(anchor.x, anchor.z);
  const typeKey = forced || weightedPick(state, region.homeless);
  if (!typeKey) return null;
  const type = SQUAD_TYPES[typeKey];
  const maxSize = type.members.reduce((n, m) => n + m[2], 0);
  if (!fitsBudget(state, maxSize)) return null;
  const p = typeKey === 'caravan' ? pickCaravanPoint(state, anchor) : pickEdgePoint(state, anchor);
  if (!p) return null;
  const squad = buildSquad(state, typeKey, p.x, p.z);
  if (typeKey === 'caravan') {
    squad.waypoints = [
      { x: TOWN1.x, z: TOWN1.z },
      { x: TOWN2.x, z: TOWN2.z },
    ];
    const d1 = Math.hypot(TOWN1.x - p.x, TOWN1.z - p.z);
    const d2 = Math.hypot(TOWN2.x - p.x, TOWN2.z - p.z);
    squad.wpIndex = d1 > d2 ? 0 : 1;
    squad.phase = 'travel';
    squad.goal = { ...squad.waypoints[squad.wpIndex] };
  } else {
    squad.phase = typeKey === 'thieves' ? 'stalk' : 'roam';
  }
  events.push(makeEvent(state, 'spawn', region.name + 'に' + type.name + 'の一団が現れた'));
  return squad;
}

function validSite(state, x, z, anchor) {
  if (Math.abs(x) > WORLD_HALF - 22 || Math.abs(z) > WORLD_HALF - 22) return false;
  if (anchor && Math.hypot(anchor.x - x, anchor.z - z) < SPAWN.siteMinPlayerDist) return false;
  if (nearPlaces(state, x, z, 30)) return false;
  if (roadDist(state, x, z) < 18) return false;
  for (const s of state.spawn.sites) if (Math.hypot(s.x - x, s.z - z) < 60) return false;
  if (blockedAt(state, x, z, 4)) return false;
  return true;
}

function spawnSite(state, events, kind, forcedType, at) {
  const anchor = anchorOf(state);
  let x = 0;
  let z = 0;
  let typeKey = forcedType || null;
  let found = false;
  if (at) {
    x = at.x;
    z = at.z;
    found = true;
  } else {
    for (let i = 0; i < 30 && !found; i += 1) {
      x = Math.round(randRange(state, -WORLD_HALF + 22, WORLD_HALF - 22) * 100) / 100;
      z = Math.round(randRange(state, -WORLD_HALF + 22, WORLD_HALF - 22) * 100) / 100;
      if (!validSite(state, x, z, anchor)) continue;
      found = true;
    }
  }
  if (!found) return null;
  if (!typeKey) {
    const region = regionAt(x, z);
    typeKey = weightedPick(state, kind === 'camp' ? region.camps : region.nests);
  }
  if (!typeKey) return null;
  const st = SITE_TYPES[typeKey];
  const sq = SQUAD_TYPES[st.squad];
  const maxSize = sq.members.reduce((n, m) => n + m[2], 0);
  if (!fitsBudget(state, maxSize)) return null;
  const id = 'site' + state.spawn.nextSite;
  state.spawn.nextSite += 1;
  const site = {
    id,
    type: typeKey,
    kind: st.kind,
    name: st.name,
    x,
    z,
    r: st.kind === 'camp' ? 9 : 8,
    leash: st.leash,
    squadId: null,
    state: 'active',
    clearedAt: null,
    goneAt: null,
    region: regionAt(x, z).id,
    seedId: randInt(state, 0, 1 << 20),
  };
  if (typeKey === 'cannibal_camp') site.poles = makePoles(x, z, site.seedId); // 捕まえた者を縛る杭
  const squad = buildSquad(state, st.squad, x, z, {
    siteId: id,
    phase: st.kind === 'camp' ? 'camp' : 'nest',
    leash: { x, z, r: st.leash },
  });
  site.squadId = squad.id;
  state.spawn.sites.push(site);
  state.spawn.stats.sites += 1;
  events.push(makeEvent(state, 'site', regionAt(x, z).name + 'のどこかに' + st.name + 'ができた'));
  return site;
}

// ---- 部隊ごとの行き先 ----

function wanderNear(state, cx, cz, r) {
  const ang = rand(state) * TAU;
  const d = randRange(state, 0, r);
  return { x: clampIn(cx + Math.cos(ang) * d, 5), z: clampIn(cz + Math.sin(ang) * d, 5) };
}

function leaderOf(members) {
  for (const a of members) if (a.state !== 'dead') return a;
  return null;
}

function nearestParty(party, a) {
  let best = null;
  let bd = Infinity;
  for (const p of party) {
    const d = Math.hypot(p.x - a.x, p.z - a.z);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return { actor: best, dist: bd };
}

function setHold(members, on) {
  for (const a of members) {
    a.holdFire = !!on;
    if (on && a.targetId !== null) a.targetId = null;
    if (on && a.state === 'fight') a.state = 'idle';
  }
}

function attackedByParty(state, members) {
  const ids = new Set(Array.isArray(state.squadIds) ? state.squadIds : [state.playerId]);
  for (const a of members) {
    if (a.lastAttackerId !== null && ids.has(a.lastAttackerId)) return true;
    if (a.state === 'down' || a.state === 'dead') return true;
  }
  return false;
}

function totalMoney(party) {
  return party.reduce((n, a) => n + (a.money || 0), 0);
}

function startDemand(state, squad, members, party, events) {
  const boss = leaderOf(members);
  const amount = Math.max(SPAWN.demandMin, Math.floor(totalMoney(party) / 2 / 10) * 10);
  squad.phase = 'demand';
  squad.demanded = true;
  squad.phaseUntil = state.tick + SPAWN.demandWait;
  setHold(members, true);
  state.spawn.demand = { squadId: squad.id, amount, until: squad.phaseUntil, bossId: boss ? boss.id : null };
  events.push(
    makeEvent(state, 'demand', (boss ? boss.name : '野盗') + '「通行料だ。cash ' + amount + ' 置いていけ」')
  );
}

function endDemand(state, squad, members, events, how) {
  if (state.spawn.demand && state.spawn.demand.squadId === squad.id) state.spawn.demand = null;
  if (how === 'paid') {
    squad.phase = 'leave';
    squad.peaceUntil = state.tick + SPAWN.peaceTicks;
    setHold(members, true);
  } else {
    squad.phase = 'attack';
    setHold(members, false);
    events.push(makeEvent(state, 'raid', '野盗が襲いかかってきた'));
  }
}

function awayPoint(state, from, anchor, dist) {
  const dx = from.x - anchor.x;
  const dz = from.z - anchor.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: clampIn(from.x + (dx / d) * dist, 8), z: clampIn(from.z + (dz / d) * dist, 8) };
}

function pickVictim(state, party) {
  let best = null;
  let bestScore = Infinity;
  for (const p of party) {
    if (p.state === 'dead' || p.carriedBy !== null) continue;
    let hp = 0;
    let max = 0;
    for (const k of Object.keys(p.parts)) {
      hp += Math.max(0, p.parts[k].hp);
      max += p.parts[k].max;
    }
    // 弱っている・持っている者ほど狙う（★仮の点数）
    const score = (hp / (max || 1)) * 100 - Math.min(60, (p.money || 0) / 20) - (p.food || 0) * 3;
    if (score < bestScore || (score === bestScore && best && p.id < best.id)) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

function updateSquad(state, squad, byId, party, anchor, events) {
  const members = membersOf(state, squad, byId);
  const leader = leaderOf(members);
  if (!leader) return;
  const near = nearestParty(party, leader);
  const restDone = state.tick >= squad.restUntil;
  const atGoal = Math.hypot(squad.goal.x - leader.x, squad.goal.z - leader.z) < 6;

  if (squad.kind === 'caravan') {
    if (atGoal && restDone) {
      if (squad.restUntil > 0 && state.tick >= squad.restUntil) {
        squad.wpIndex = (squad.wpIndex + 1) % squad.waypoints.length;
        squad.restUntil = 0;
      } else {
        squad.restUntil = state.tick + randInt(state, 200, 500); // 町で少し休む
      }
    }
    squad.goal = { ...squad.waypoints[squad.wpIndex % squad.waypoints.length] };
    return;
  }

  if (squad.phase === 'camp' || squad.phase === 'nest') {
    if (atGoal && restDone) {
      const st = SITE_TYPES[(state.spawn.sites.find((s) => s.id === squad.siteId) || {}).type] || { wander: 15 };
      squad.goal = wanderNear(state, squad.home.x, squad.home.z, st.wander);
      squad.restUntil = state.tick + randInt(state, 200, 600);
    }
    return;
  }

  if (squad.kind === 'raiders') {
    if (squad.phase === 'demand') {
      if (attackedByParty(state, members)) return endDemand(state, squad, members, events, 'attack');
      if (state.tick >= squad.phaseUntil) return endDemand(state, squad, members, events, 'attack');
      if (near.actor) {
        const d = near.dist || 1;
        squad.goal = {
          x: near.actor.x + ((leader.x - near.actor.x) / d) * 5,
          z: near.actor.z + ((leader.z - near.actor.z) / d) * 5,
        };
      }
      return;
    }
    if (squad.phase === 'leave') {
      if (state.tick >= squad.peaceUntil) {
        squad.phase = 'roam';
        setHold(members, false);
      } else if (anchor && (atGoal || squad.restUntil === 0)) {
        squad.goal = awayPoint(state, leader, anchor, 80);
        squad.restUntil = 1;
      }
      return;
    }
    if (squad.phase === 'attack') {
      if (!near.actor || near.dist > 45) {
        squad.phase = 'roam';
      } else {
        squad.goal = { x: near.actor.x, z: near.actor.z };
      }
      return;
    }
    // roam
    if (
      !squad.demanded &&
      near.actor &&
      near.dist <= SPAWN.demandDist &&
      standing(leader) &&
      !state.spawn.demand &&
      standing(near.actor)
    ) {
      return startDemand(state, squad, members, party, events);
    }
  }

  if (squad.kind === 'thieves') {
    if (squad.phase === 'flee') {
      if (anchor) squad.goal = awayPoint(state, leader, anchor, 60);
      return;
    }
    if (squad.stoleAt) {
      squad.phase = 'flee';
      const exit = anchor ? awayPoint(state, leader, anchor, 120) : squad.home;
      for (const a of members) {
        a.fleeUntil = state.tick + SPAWN.thiefFlee;
        a.targetId = null;
        a.lootTargetId = null;
        a.spawnHome = { x: exit.x, z: exit.z };
      }
      events.push(makeEvent(state, 'flee', '盗賊が逃げていく'));
      return;
    }
    const victim = pickVictim(state, party);
    if (victim && Math.hypot(victim.x - leader.x, victim.z - leader.z) <= SPAWN.thiefNotice) {
      squad.victimId = victim.id;
      squad.goal = { x: victim.x, z: victim.z };
      for (const a of members) {
        if (!standing(a) || a.targetId !== null || a.lootTargetId !== null) continue;
        if (victim.state !== 'down' && victim.state !== 'getup' && Math.hypot(victim.x - a.x, victim.z - a.z) < 18) {
          a.targetId = victim.id;
          a.state = 'fight';
        }
      }
      return;
    }
    squad.victimId = null;
  }

  // 家なしの野盗・盗賊の roam: プレイヤーのいる辺りへ寄っていく（★仮）
  if (atGoal && restDone) {
    if (anchor && rand(state) < 0.6) squad.goal = wanderNear(state, anchor.x, anchor.z, 35);
    else squad.goal = wanderNear(state, leader.x, leader.z, 60);
    squad.restUntil = state.tick + randInt(state, 150, 450);
  }
}

// ---- 消える・片付く ----

function removeSquad(state, squad, withActors) {
  if (withActors) {
    const ids = new Set(squad.memberIds);
    state.actors = state.actors.filter((a) => !ids.has(a.id));
  }
  state.squads = state.squads.filter((s) => s !== squad);
  if (state.spawn.demand && state.spawn.demand.squadId === squad.id) state.spawn.demand = null;
}

function carryingOutsider(squad, members) {
  for (const a of members) {
    if (a.carryingId !== null && !squad.memberIds.includes(a.carryingId)) return true;
    if (a.carriedBy !== null && !squad.memberIds.includes(a.carriedBy)) return true;
  }
  return false;
}

function updateDespawn(state, byId, party, events) {
  for (const squad of homelessSquads(state)) {
    const members = membersOf(state, squad, byId);
    const alive = members.filter((a) => a.state !== 'dead');
    if (alive.length === 0) {
      removeSquad(state, squad, false); // 亡骸は残す（CORPSE_LIMIT で古い順に消える）
      continue;
    }
    let minD = Infinity;
    for (const a of alive) {
      for (const p of party) {
        const d = Math.hypot(a.x - p.x, a.z - p.z);
        if (d < minD) minD = d;
      }
    }
    if (minD > SPAWN.despawnDist && !carryingOutsider(squad, members)) squad.farTicks += SPAWN.checkEvery;
    else squad.farTicks = 0;
    if (squad.farTicks >= SPAWN.despawnTicks) {
      removeSquad(state, squad, true);
      state.spawn.stats.despawned += 1;
    }
  }
}

function updateSites(state, byId, events) {
  const rate = state.spawn.rate;
  for (const site of [...state.spawn.sites]) {
    const squad = state.squads.find((s) => s.id === site.squadId);
    const members = squad ? membersOf(state, squad, byId) : [];
    if (site.state === 'active') {
      if (!members.some((a) => standing(a))) {
        site.state = 'cleared';
        site.clearedAt = state.tick;
        site.goneAt = state.tick + SPAWN.siteGoneAfter;
        state.spawn.stats.cleared += 1;
        const wait = rate > 0 ? Math.round((site.kind === 'camp' ? SPAWN.campRespawn : SPAWN.nestRespawn) / rate) : Infinity;
        if (site.kind === 'camp') state.spawn.campAt = Math.max(state.spawn.campAt, state.tick + wait);
        else state.spawn.nestAt = Math.max(state.spawn.nestAt, state.tick + wait);
        events.push(
          makeEvent(state, 'cleared', site.kind === 'nest' ? site.name + 'が空になった' : site.name + 'を片付けた')
        );
      }
    } else if (site.state === 'cleared' && state.tick >= site.goneAt) {
      // 場所は消える。残った者は家なしになり、遠くへ行けば消える。
      if (squad) {
        squad.siteId = null;
        squad.leash = null;
        squad.phase = squad.kind === 'thieves' ? 'stalk' : 'roam';
        for (const a of members) a.leash = null;
      }
      state.spawn.sites = state.spawn.sites.filter((s) => s !== site);
    }
  }
}

// 縄張りから出すぎた住人を戻す（ai.js の moveActor / bestTarget が actor.returning を見る）。
export function updateLeash(state) {
  for (const a of state.actors) {
    if (!a.leash || a.state === 'dead' || a.state === 'down') continue;
    const d = Math.hypot(a.x - a.leash.x, a.z - a.leash.z);
    if (!a.returning && d > a.leash.r) {
      a.returning = true;
      a.targetId = null;
      a.waitTargetId = null;
      a.lootTargetId = null;
      if (a.state === 'fight') a.state = 'idle';
    } else if (a.returning && d < a.leash.r * 0.4) {
      a.returning = false;
    }
  }
}

// 1tick ごと（step の最後の方）。state.spawn が無ければ何もしない。
export function updateSpawnDirector(state, events) {
  const sp = state.spawn;
  if (!sp || !sp.on) return;
  updateLeash(state);
  withSpawnRng(state, () => {
    const byId = indexActors(state);
    const party = partyOf(state);
    const anchor = party.length ? party[0] : null;
    if (state.tick % 5 === 0) {
      for (const squad of state.squads) {
        if (!squad.kind) continue;
        updateSquad(state, squad, byId, party, anchor, events);
      }
    }
    if (state.tick % SPAWN.checkEvery !== 0) return;
    updateSites(state, byId, events);
    updateDespawn(state, indexActors(state), party, events);
    if (!anchor || sp.rate <= 0) return;

    if (state.tick >= sp.homelessAt) {
      const region = regionAt(anchor.x, anchor.z);
      if (homelessSquads(state).length < SPAWN.maxHomeless) spawnHomeless(state, events);
      const base = SPAWN.homelessEvery / Math.max(0.05, region.density * sp.rate);
      sp.homelessAt = state.tick + Math.max(30, Math.round(base * randRange(state, 0.6, 1.4)));
    }
    if (state.tick >= sp.campAt) {
      if (liveSites(state, 'camp').length < SPAWN.maxCamps) spawnSite(state, events, 'camp');
      sp.campAt = state.tick + randInt(state, 100, 400);
    }
    if (state.tick >= sp.nestAt) {
      if (liveSites(state, 'nest').length < SPAWN.maxNests) spawnSite(state, events, 'nest');
      sp.nestAt = state.tick + randInt(state, 100, 400);
    }
  });
}

// ---- 盗み（loot.js から） ----
export function noteTheft(state, actor) {
  const squad = state.squads.find((s) => s.id === actor.squadId);
  if (squad && !squad.stoleAt) squad.stoleAt = state.tick;
}

// ---- 通行料（commands.js から） ----
export function answerDemand(state, pay, events) {
  const sp = state.spawn;
  if (!sp || !sp.demand) return false;
  const squad = state.squads.find((s) => s.id === sp.demand.squadId);
  if (!squad) {
    sp.demand = null;
    return false;
  }
  const byId = indexActors(state);
  const members = membersOf(state, squad, byId);
  const party = partyOf(state);
  const amount = sp.demand.amount;
  if (pay && totalMoney(party) >= amount) {
    let left = amount;
    for (const p of party) {
      const take = Math.min(left, p.money || 0);
      p.money -= take;
      left -= take;
      if (left <= 0) break;
    }
    const boss = byId.get(sp.demand.bossId) || leaderOf(members);
    if (boss) boss.money = (boss.money || 0) + amount;
    events.push(makeEvent(state, 'pay', '通行料 cash ' + amount + ' を払った。野盗は去っていく'));
    endDemand(state, squad, members, events, 'paid');
    return true;
  }
  if (pay) events.push(makeEvent(state, 'pay', 'cash が足りない'));
  endDemand(state, squad, members, events, 'attack');
  return true;
}

// ---- 確認・撮影・テスト用: その場に出す ----
export function forceSquad(state, typeKey, x, z) {
  if (!state.spawn) initSpawn(state, {});
  const events = [];
  const squad = withSpawnRng(state, () => buildSquad(state, typeKey, x, z));
  if (typeKey === 'caravan') {
    squad.waypoints = [
      { x: TOWN1.x, z: TOWN1.z },
      { x: TOWN2.x, z: TOWN2.z },
    ];
    squad.wpIndex = Math.hypot(TOWN1.x - x, TOWN1.z - z) > Math.hypot(TOWN2.x - x, TOWN2.z - z) ? 0 : 1;
    squad.phase = 'travel';
    squad.goal = { ...squad.waypoints[squad.wpIndex] };
  } else if (typeKey === 'thieves') squad.phase = 'stalk';
  return squad;
}

export function forceSite(state, siteType, x, z) {
  if (!state.spawn) initSpawn(state, {});
  const st = SITE_TYPES[siteType];
  return withSpawnRng(state, () => spawnSite(state, [], st.kind, siteType, { x, z }));
}

export function spawnSummary(state) {
  const sp = state.spawn;
  if (!sp) return null;
  const counts = { caravan: 0, thieves: 0, raiders: 0, beasts: 0, machines: 0 };
  for (const s of state.squads) if (s.kind) counts[s.kind] = (counts[s.kind] || 0) + 1;
  const c = countAlive(state);
  return {
    rate: sp.rate,
    homeless: homelessSquads(state).length,
    counts,
    camps: liveSites(state, 'camp').length,
    nests: liveSites(state, 'nest').length,
    spawnedAlive: c.spawned,
    alive: c.all,
    demand: sp.demand,
    stats: { ...sp.stats },
  };
}

export { REGIONS, regionAt, SQUAD_TYPES, ROLES, SITE_TYPES, SPAWN, MOB_LOOK_ROLES, MACHINE_ROLES };
