// v0.9：とびらの そうこ（ドア・シャッターが ひらいて くろスーツが どっと でてくる）
// へやごとに すすむ：その へやの ドアが ぜんぶ でおわって、てきが いなくなったら つぎの へやへ
import { GROUND } from './rules.js?v=10';

export const DOOR_KINDS = {
  door:    { w: 46,  h: 96,  speed: 7,   bang: 0.42, burst: [1, 3], sfx: 'door' },
  shutter: { w: 104, h: 100, speed: 2.6, bang: 0.55, burst: [2, 5], sfx: 'shutter' },
  steel:   { w: 72,  h: 110, speed: 5,   bang: 0.5,  burst: [1, 3], sfx: 'door' },
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SIDE_GAP = 22;

function mkDoor(x, kind, room) {
  const K = DOOR_KINDS[kind] || DOOR_KINDS.door;
  return { x, kind, room, w: K.w, h: K.h, st: 'shut', t: 0, open: 0, q: [], emitT: 0, holdT: 0, cd: 0, kicked: false, used: 0, boss: false };
}

// ステージの へや・ドア・しきり（ゲート）を つくる
export function initHorde(g) {
  const st = g.stage;
  if (!st.rooms) return null;
  const H = { rooms: [], doors: [], spawned: 0, cap: st.cap || 18, cur: -1, bossLeft: st.bossCalls || 0, bossCd: 4, peak: 0 };
  const mkRoom = (x, i, doors, extra) => {
    const l = clamp(x - g.viewW * 0.5, 0, st.length - g.viewW), r = l + g.lockW();
    const R = { i, x, l, r, quota: 0, left: 0, mix: [], tough: null, state: 'idle', cd: 0.5, doors: [], gateL: { x: l, open: 1, want: 1 }, gateR: { x: r, open: 0, want: 0 }, ...extra };
    for (const [dx, kind] of doors) { const d = mkDoor(x + dx, kind, i); R.doors.push(d); H.doors.push(d); }
    H.rooms.push(R);
    return R;
  };
  st.rooms.forEach((o, i) => mkRoom(o.x, i, o.doors, { quota: o.quota, left: o.quota, mix: o.mix, tough: o.tough || null }));
  const B = mkRoom(st.boss.x, st.rooms.length, st.bossDoors || [[0, 'steel']], { boss: true, mix: st.bossMix || ['suit'] });
  B.gateR = null;
  for (const d of B.doors) d.boss = true;
  H.total = st.rooms.reduce((s, o) => s + o.quota, 0) + H.bossLeft;
  return H;
}

const pendingOf = (R) => { let n = 0; for (const d of R.doors) n += d.q.length; return n; };
const aliveOf = (g) => { let n = 0; for (const e of g.enemies) if (!e.dead) n++; return n; };

// ドアを バーン！と あける（n にん まって いる）
function openDoor(g, d, types, kick) {
  const K = DOOR_KINDS[d.kind];
  for (const t of types) d.q.push(t);
  d.kicked = !!kick; d.st = 'bang'; d.t = kick ? 0.14 : K.bang; d.used++;
  g.ev(kick ? 'kickdoor' : 'knock');
}
function pickTypes(g, R, d, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const tough = d.kind === 'steel' && R.tough && i === 0 && g.rand() < 0.75;
    const list = tough ? R.tough : R.mix;
    out.push(list[Math.floor(g.rand() * list.length)]);
  }
  return out;
}
function freeDoor(g, R, avoid) {
  let best = null, bs = -1;
  for (const d of R.doors) {
    if (d.st !== 'shut' || d.cd > 0 || d === avoid) continue;
    const s = g.rand() + Math.min(1, Math.abs(d.x - g.player.x) / 200) * 0.6; // プレイヤーの まうえ は すこし さける
    if (s > bs) { bs = s; best = d; }
  }
  return best;
}

// ドアから 1たい だす
function emit(g, d, type) {
  const e = g.spawnEnemy(type, 1, 0);
  e.x = d.x + (g.rand() - 0.5) * d.w * 0.45; e.y = GROUND; e.vy = 0; e.onGround = true; e.spawnT = 0;
  e.inside = true; e.doorIn = 0.34; e.doorMax = 0.34; e.door = d;
  e.face = g.player.x > e.x ? 1 : -1; e.vx = e.face * 40;
  g.horde.spawned++;
}

// ボスが よぶ：ドアを 2〜3 こ あけて なかまを だす
export function hordeCall(g, n) {
  const H = g.horde; if (!H) return 0;
  const R = H.rooms[H.rooms.length - 1];
  n = Math.min(n, H.bossLeft); if (n <= 0) return 0;
  let used = 0, last = null;
  for (let k = 0; k < 3 && used < n; k++) {
    const d = freeDoor(g, R, last); if (!d) break;
    const m = Math.min(n - used, k === 0 ? Math.ceil(n / 2) : n - used);
    openDoor(g, d, pickTypes(g, R, d, m), false); used += m; last = d;
  }
  H.bossLeft -= used;
  return used;
}

export function bossDoor(g) {
  const H = g.horde; if (!H) return null;
  const R = H.rooms[H.rooms.length - 1];
  let d = R.doors.find((x) => x.kind === 'steel') || R.doors[0];
  return d;
}

export function updateDoors(g, dt) {
  const H = g.horde;
  for (const d of H.doors) {
    const K = DOOR_KINDS[d.kind];
    if (d.cd > 0) d.cd -= dt;
    if (d.st === 'bang') {
      d.t -= dt;
      if (d.t <= 0) {
        d.st = 'open'; d.emitT = d.kind === 'shutter' ? 0.25 : 0.06; d.holdT = 0.5;
        g.ev(K.sfx); g.shake = Math.max(g.shake, d.kicked ? 7 : 4);
        g.dust(d.x - d.w / 2, GROUND, 4); g.dust(d.x + d.w / 2, GROUND, 4);
        if (d.kicked) g.addText(d.x, GROUND - d.h - 8, 'バン！', '#fff', 20, true);
      }
    } else if (d.st === 'open') {
      d.open = Math.min(1, d.open + dt * K.speed * (d.kicked ? 2 : 1));
      if (d.q.length) {
        d.emitT -= dt;
        if (d.emitT <= 0 && d.open > 0.6) { emit(g, d, d.q.shift()); d.emitT = d.kind === 'shutter' ? 0.2 : 0.3; }
      } else { d.holdT -= dt; if (d.holdT <= 0) d.st = 'close'; }
    } else if (d.st === 'close') {
      d.open = Math.max(0, d.open - dt * K.speed * 0.8);
      if (d.open <= 0) { d.st = 'shut'; d.cd = 0.5 + g.rand() * 1.1; if (d.kind !== 'shutter') g.ev('doorShut'); }
    }
  }
  for (const R of H.rooms) for (const G of [R.gateL, R.gateR]) if (G) G.open += clamp(G.want - G.open, -dt * 2.2, dt * 1.4);
}

// へやの すすみぐあい（game.updateProgress の かわり）
export function updateHorde(g, dt) {
  const H = g.horde, p = g.player, st = g.stage;
  updateDoors(g, dt);
  const alive = aliveOf(g);
  H.peak = Math.max(H.peak, alive);
  if (g.state === 'win') return;
  if (g.arena) {
    const R = H.rooms[H.cur];
    const pend = pendingOf(R);
    R.cd -= dt;
    if (R.left > 0 && R.cd <= 0 && alive + pend < H.cap) {
      const d = freeDoor(g, R, null);
      if (d) {
        const K = DOOR_KINDS[d.kind];
        const n = Math.max(1, Math.min(R.left, H.cap - alive - pend, K.burst[0] + Math.floor(g.rand() * (K.burst[1] - K.burst[0] + 1))));
        openDoor(g, d, pickTypes(g, R, d, n), g.rand() < 0.25);
        R.left -= n;
        R.cd = alive < 8 ? 0.2 : 0.4 + g.rand() * 0.5;
      }
    }
    if (R.left <= 0 && pend === 0 && g.enemies.length === 0 && R.doors.every((d) => d.st !== 'bang')) {
      R.state = 'done'; if (R.gateR) R.gateR.want = 1;
      g.arena = null; g.lock = null; g.go = 2.5; g.arenaIdx++; g.ev('go'); g.ev('shutter');
      g.say('クリア！', 'シャッターが ひらいた →', 1.4);
    }
    return;
  }
  if (g.boss) {
    const R = H.rooms[H.rooms.length - 1];
    // ボスの へや：すこしずつ ドアから なかまが でてくる
    if (!g.boss.dead && g.boss.state !== 'intro' && H.bossLeft > 0) {
      H.bossCd -= dt;
      if (H.bossCd <= 0 && alive + pendingOf(R) < 6) { hordeCall(g, 2); H.bossCd = 6 + g.rand() * 3; }
    }
    if (g.boss.dead && g.boss.t > 2.4 && g.state === 'play') {
      g.state = 'win'; g.winT = 1.6; g.say('ステージ クリア！', '', 3); g.ev('clear');
      g.result = { score: g.score, time: g.time, maxCombo: g.maxCombo, kills: g.kills, hpLeft: p.hp / p.maxHp, continues: g.continues };
    }
    return;
  }
  const next = H.rooms[g.arenaIdx];
  if (!next) return;
  const trig = next.boss ? st.boss.x - g.viewW * 0.2 : next.x;
  if (p.x >= trig) {
    const l = clamp(next.x - g.viewW * 0.5, 0, st.length - g.viewW);
    g.lock = { l, r: l + g.lockW() };
    next.l = l; next.r = g.lock.r; next.gateL.x = l; if (next.gateR) next.gateR.x = g.lock.r;
    next.gateL.want = 0; next.state = next.boss ? 'boss' : 'fight'; H.cur = next.i;
    g.ev('lock'); g.ev('shutter');
    if (next.boss) g.spawnBoss();
    else { g.arena = { def: st.arenas[next.i], wave: 0, delay: 0, room: next }; next.cd = 0.6; g.say('へやを かたづけろ！', `のこり ${next.quota}にん`, 1.6); }
  }
}
export function roomLeft(g) {
  const H = g.horde; if (!H || H.cur < 0) return 0;
  const R = H.rooms[H.cur];
  let n = R.left + pendingOf(R); for (const e of g.enemies) if (!e.dead) n++;
  return n;
}
