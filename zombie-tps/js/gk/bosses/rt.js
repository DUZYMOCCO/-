// v0.17.0: ガンキック ボスを うごかす（three.js・あとから よむ）。ボスの データ（bosses/<id>.js）を brain.js の きまりで うごかす
// よこく: じめんに あかい まる・おび・おうぎ（なかが だんだん ぬりつぶされる → ぬりおわると こうげき）
// たま（おそい）・たまご→てき・にせもの・きえて とびかかる・さんの みずたまり・こおりの ゆか。ぜんぶ 30こ まで（SE2）
import * as THREE from '../../../vendor/three.module.min.js';
import { RULE, brainNew, brainCool, brainStep, brainStart, pickMove, actTime, teleTime, inCircle, inLine, inCone, circleSpots, fanDirs, bossPhase } from './brain.js?v=35';
import { collideCircle, groundHeight } from '../../rules.js?v=35';

const SH = { r: 0.35, life: 5 };
export function create(game, B) {
  const grp = new THREE.Group(); game.scene.add(grp);
  const basic = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const col = B.color ?? 0xff3a2a;
  const M = { base: basic(col, 0.18), fill: basic(col, 0.42), shot: new THREE.MeshBasicMaterial({ color: B.shotColor ?? 0xb46bff }), egg: new THREE.MeshLambertMaterial({ color: B.eggColor ?? 0xd8dca0, emissive: 0x202010 }), ice: basic(0x9ad8ff, 0.4) };
  const G = { ring: new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2), disc: new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), plane: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ball: new THREE.SphereGeometry(1, 10, 8), cones: {} };
  const coneGeo = (ang) => G.cones[ang] || (G.cones[ang] = new THREE.CircleGeometry(1, 20, -ang / 2 * Math.PI / 180, ang * Math.PI / 180).rotateX(-Math.PI / 2));
  const marks = [], shots = [], ices = [], eggs = [], minions = new Set();
  let boss = null;
  const P = () => game.pos, live = () => marks.length + shots.length + eggs.length;
  const gy = (x, z, y = 0) => groundHeight(x, z, 0.1, y + 0.6, game.pCol) + 0.04;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const hurt = (d, z) => { if (game.state === 'play') game.damagePlayer(Math.min(RULE.dmgMax, d), z); };
  const near = (x, z, y = 0) => Math.abs((game.pFloor ?? game.pos.y) - y) < 2.2;

  // ---- よこく ----
  function mark(kind, a) {
    if (live() >= RULE.fxMax) return null;
    const g = new THREE.Group(), y = gy(a.x, a.z, a.y || 0);
    let base, fill;
    if (kind === 'circle') { base = new THREE.Mesh(G.disc, M.base); fill = new THREE.Mesh(G.disc, M.fill); base.scale.set(a.r, 1, a.r); g.position.set(a.x, y, a.z); }
    else if (kind === 'line') {
      base = new THREE.Mesh(G.plane, M.base); fill = new THREE.Mesh(G.plane, M.fill);
      g.position.set(a.x, y, a.z); g.rotation.y = Math.atan2(a.ux, a.uz); // ローカル +z を むきに あわせる
      base.scale.set(a.w, 1, a.len); base.position.z = a.len / 2;
    } else { // cone
      base = new THREE.Mesh(coneGeo(a.angle), M.base); fill = new THREE.Mesh(coneGeo(a.angle), M.fill);
      g.position.set(a.x, y, a.z); g.rotation.y = -Math.atan2(a.uz, a.ux);
      base.scale.set(a.range, 1, a.range);
    }
    base.renderOrder = fill.renderOrder = 2; g.add(base, fill); grp.add(g);
    const o = { kind, g, base, fill, a, t: 0, at: a.at };
    o.set = (k) => {
      k = Math.max(0.02, Math.min(1, k));
      if (kind === 'circle') fill.scale.set(a.r * k, 1, a.r * k);
      else if (kind === 'line') { fill.scale.set(a.w, 1, a.len * k); fill.position.z = a.len * k / 2; }
      else fill.scale.set(a.range * k, 1, a.range * k);
    };
    o.set(0); marks.push(o);
    return o;
  }
  const unmark = (o) => { if (!o) return; grp.remove(o.g); const i = marks.indexOf(o); if (i >= 0) marks.splice(i, 1); };
  const clearMove = (st) => { if (st.ring) { grp.remove(st.ring); st.ring = null; } for (const o of st.marks || []) unmark(o); st.marks = []; for (const e of st.eggs || []) { grp.remove(e.m); eggs.splice(eggs.indexOf(e), 1); } st.eggs = []; };

  // ---- たま ----
  function shoot(z, ux, uz, m) {
    if (live() >= RULE.fxMax) return;
    const s = (B.shotSize ?? 0.32), y = z.y + Math.min(1.6, 0.9 * z.scale), p = P();
    const mesh = new THREE.Mesh(G.ball, M.shot); mesh.scale.setScalar(s); grp.add(mesh);
    // プレイヤーの むねの たかさへ すこしずつ さがる（あたまの うえを とおりこさない）
    const d = Math.max(1, Math.hypot(p.x - z.x, p.z - z.z)), vy = Math.max(-4, Math.min(4, ((p.y + 0.9) - y) * m.speed / d));
    shots.push({ m: mesh, x: z.x + ux * 0.9, y, z: z.z + uz * 0.9, vx: ux * m.speed, vy, vz: uz * m.speed, life: SH.life, dmg: m.dmg, src: z });
  }
  function tickShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.m.position.set(s.x, s.y, s.z);
      if (s.y < groundHeight(s.x, s.z, 0.05, s.y + 0.2, game.pCol) + 0.4) s.vy = 0; // じめんに ついたら まっすぐ
      let dead = s.life <= 0;
      if (!dead) for (const b of game.pCol.near(s.x, s.z)) if (!b.barrier && s.x > b.minX && s.x < b.maxX && s.z > b.minZ && s.z < b.maxZ && s.y > b.minY && s.y < b.maxY) { dead = true; break; }
      const p = P();
      if (!dead && Math.hypot(s.x - p.x, s.y - (p.y + 0.9), s.z - p.z) < SH.r + 0.45) { hurt(s.dmg, s.src); dead = true; }
      if (dead) { game.fx.burst(V(s.x, s.y, s.z), 6, { color: B.shotColor ?? 0xb46bff, color2: 0xffffff, speed: 2, up: 1, size: 0.06, life: 0.3, gravity: 6 }); grp.remove(s.m); shots.splice(i, 1); }
    }
  }
  // ---- こおりの ゆか（なかは おそく なる）----
  function tickIce(dt) {
    for (let i = ices.length - 1; i >= 0; i--) {
      const c = ices[i]; c.life -= dt;
      c.m.material.opacity = 0.4 * Math.min(1, c.life);
      if (inCircle(P().x, P().z, c.x, c.z, c.r) && near(c.x, c.z, c.y)) game.zapT = Math.max(game.zapT, 0.15);
      if (c.life <= 0) { grp.remove(c.m); c.m.material.dispose(); ices.splice(i, 1); }
    }
  }
  // ---- まるの こうげき（when: いつ）----
  function resolveCircle(z, m, o) {
    const { x, z: cz, r } = o.a, y = gy(x, cz, z.y) - 0.04;
    if (inCircle(P().x, P().z, x, cz, r + 0.3) && near(x, cz, y)) { hurt(m.dmg, z); if (m.knock) game.pk.set(Math.sign(P().x - x || 1) * m.knock, 0, Math.sign(P().z - cz || 1) * m.knock); }
    const fxc = m.fxColor ?? col;
    if (m.after === 'puddle') { game.addHazard('puddle', x, y, cz, r * 0.85, m.dps ?? 6, m.life ?? 6); game.sfx.splash?.(0.6); game.fx.burst(V(x, y + 0.3, cz), 12, { color: 0x6ad02a, color2: 0xb0ff60, speed: 3, up: 3, size: 0.08, life: 0.5 }); }
    else if (m.after === 'ice') { const mm = new THREE.Mesh(G.disc, M.ice.clone()); mm.scale.set(r, 1, r); mm.position.set(x, y + 0.03, cz); grp.add(mm); ices.push({ m: mm, x, z: cz, y, r, life: m.life ?? 6 }); game.fx.burst(V(x, y + 0.3, cz), 14, { color: 0xc8f0ff, color2: 0xffffff, speed: 3, up: 3, size: 0.07, life: 0.5 }); }
    else if (m.after === 'boom') { game.fx.explosion(V(x, y + 0.2, cz), r, 0.5); game.sfx.boom?.(0.5); }
    else { game.fx.burst(V(x, y + 0.3, cz), 14, { color: fxc, color2: 0xffffff, speed: 4, up: 4, size: 0.09, life: 0.5 }); game.sfx.slam?.(0.5); }
    unmark(o);
  }
  // ---- てきを よぶ ----
  function summon(z, kind, x, zz, hpMul) {
    const n = game.spawnZombie(kind, x, zz, hpMul, z.y); n.extra = true; n.bossMinion = true; minions.add(n);
    game.fx.poof(V(x, z.y + 0.5, zz), 1);
    return n;
  }
  const minionsAlive = () => { let k = 0; for (const n of minions) if (n.alive) k++; else minions.delete(n); return k; };

  // ---- わざの はじまり ----
  function begin(z, st, m, dx, dz, dist) {
    brainStart(st, m);
    const ux = dx / (dist || 1), uz = dz / (dist || 1), p = P();
    st.ux = ux; st.uz = uz; st.clock = 0; st.marks = []; st.eggs = []; st.fired = 0; st.hit = false; st.tickT = 0;
    z.yaw = Math.atan2(-ux, -uz);
    if (m.kind === 'line') st.marks.push(mark('line', { x: z.x, z: z.z, y: z.y, ux, uz, len: m.len, w: m.w }));
    else if (m.kind === 'shots') st.marks.push(mark('line', { x: z.x, z: z.z, y: z.y, ux, uz, len: Math.min(dist + 2, 14), w: 0.5 }));
    else if (m.kind === 'cone') st.marks.push(mark('cone', { x: z.x, z: z.z, y: z.y, ux, uz, range: m.len, angle: m.angle }));
    else if (m.kind === 'circles') {
      const at = m.at === 'self' ? 'self' : m.at;
      circleSpots({ ...m, at }, z.x, z.z, p.x, p.z).forEach(([x, cz], i) => { const o = mark('circle', { x, z: cz, y: z.y, r: m.r, at: m.tele + i * (m.seq || 0) }); if (o) st.marks.push(o); });
    } else if (m.kind === 'summon' || m.kind === 'clones') {
      const k = Math.max(0, Math.min(m.n, m.cap - minionsAlive()));
      const api = m.via === 'doors' && game.gkDoorsApi;
      if (api) { // ドアの ランプが ちかちか → あいて でてくる（ステージ18）
        for (const o of api.pick(k)) { api.cycle(o, m.tele); const f = api.front(o); const mk = mark('circle', { x: f.x, z: f.z, y: z.y, r: 0.9 }); if (mk) { mk.spawn = true; mk.yaw = o.d.yaw; st.marks.push(mk); } }
      } else for (let i = 0; i < k; i++) {
        const a = (i / Math.max(1, k)) * Math.PI * 2 + Math.random(), d = 2.2 + Math.random() * 1.2;
        let x = z.x + Math.cos(a) * d, cz = z.z + Math.sin(a) * d;
        const c = collideCircle(x, cz, 0.4, z.y, game.zCol); x = c.x; cz = c.z;
        if (m.kind === 'summon') { const mm = new THREE.Mesh(G.ball, M.egg); mm.scale.set(0.35, 0.45, 0.35); mm.position.set(x, gy(x, cz, z.y) + 0.4, cz); grp.add(mm); const e = { m: mm, x, z: cz }; eggs.push(e); st.eggs.push(e); }
        else { const o = mark('circle', { x, z: cz, y: z.y, r: 0.9 }); if (o) { o.spawn = true; st.marks.push(o); } }
      }
    } else if (m.kind === 'pounce') {
      z.model.root.visible = false; z.hidden = true;
      game.fx.burst(V(z.x, z.y + 1, z.z), 16, { color: B.fxColor ?? 0x9a9aa0, color2: 0xd0d0d8, speed: 3, up: 2, size: 0.12, life: 0.7, gravity: 1 });
      const api = m.via === 'doors' && game.gkDoorsApi, o = api ? api.pick(1)[0] : null;
      st.viaDoor = !!o;
      if (o) { api.cycle(o, teleTime(m)); const f = api.front(o); st.marks.push(mark('circle', { x: f.x, z: f.z, y: z.y, r: m.r })); } // ドアから でてくる
      else st.marks.push(mark('circle', { x: p.x, z: p.z, y: z.y, r: m.r }));
    } else if (m.kind === 'wave') {
      st.y0 = z.y;
      st.marks.push(mark('circle', { x: z.x, z: z.z, y: z.y, r: m.R }));
    }
    game.sfx.warn?.();
  }

  // ---- まいフレーム（ボスごと）----
  const ai = {
    pre(g, z, dt) {
      brainCool(z.ai.st, dt);
      if (z.ai.st.stunT > 0) z.ai.st.stunT -= dt;
      if (B.phases && z.alive) { const k = bossPhase(B, z.hp / z.maxHp); if (k !== z.ai.st.ph) phaseTo(g, z, k); }
      if (B.fly && z.alive) { z.y = B.fly.y + Math.sin(performance.now() / 600) * 0.25; z.vy = 0; }
    },
    act(g, z, dt, dist, dx, dz) {
      const st = z.ai.st;
      if (st.stunT > 0) { z.state = 'idle'; if (Math.random() < 0.2) g.fx.burst(V(z.x, z.y + 2.2 * z.scale, z.z), 1, { color: 0xffe060, speed: 1.5, up: 0.5, size: 0.08, life: 0.4, gravity: 0 }); return 'still'; }
      if (st.phase === 'idle') {
        const m = pickMove(B, st, dist);
        if (!m) return B.fly ? orbit(z, dt, dist, dx, dz) : false;
        begin(z, st, m, dx, dz, dist);
      }
      const m = st.move;
      st.clock += dt;
      const ch = brainStep(st, dt);
      let res = 'still';
      if (st.phase === 'tele') {
        z.state = 'idle'; z.slam = m.kind === 'pounce' ? null : { t: st.t, wind: teleTime(m), ai: true };
        const k = st.t / teleTime(m);
        for (const o of st.marks) o.set(o.a.at ? st.clock / o.a.at : k);
        if (m.kind === 'pounce') { // きえて いる あいだは かげが プレイヤーを おいかけ、さいごの tele びょうは とまる
          const o = st.marks[0];
          if (o && !st.viaDoor && st.t < (m.hide || 0)) { o.a.x = P().x; o.a.z = P().z; o.g.position.set(P().x, gy(P().x, P().z, z.y), P().z); }
          if (o) o.set((st.t - (m.hide || 0)) / m.tele);
          if (Math.random() < dt * 3) g.sfx.step?.();
        }
        for (const e of st.eggs) e.m.rotation.z = Math.sin(st.t * 18) * 0.25;
        if (m.kind === 'wave') { z.y = st.y0 + 3.2 * Math.sin(Math.PI * Math.min(1, k)); z.vy = 0; } // ジャンプ
        if (B.fly) res = orbit(z, dt, dist, dx, dz, 0.4);
      }
      if (ch === 'act') { z.slam = null; startAct(g, z, st, m); }
      if (st.phase === 'act') res = runAct(g, z, st, m, dt) || res;
      // まるは じゅんばんに（tele の あいだ・act の あいだ）
      if (m.kind === 'circles') for (const o of [...st.marks]) if (o.a.at != null && st.clock >= o.a.at) { resolveCircle(z, m, o); st.marks.splice(st.marks.indexOf(o), 1); }
      if (ch === 'rest') clearMove(st);
      if (st.phase === 'rest') { z.state = 'idle'; if (B.fly) res = orbit(z, dt, dist, dx, dz); }
      return res;
    },
  };
  function startAct(g, z, st, m) {
    const p = P();
    if (m.kind === 'shots' || m.kind === 'cone') { const d = Math.hypot(p.x - z.x, p.z - z.z) || 1; if (m.kind === 'shots') { st.ux = (p.x - z.x) / d; st.uz = (p.z - z.z) / d; } }
    if (m.kind === 'shots') for (const o of st.marks) unmark(o);
    if (m.kind === 'line' && !m.dash) {
      if (inLine(p.x, p.z, z.x, z.z, st.ux, st.uz, m.len, m.w) && near(z.x, z.z, z.y)) hurt(m.dmg, z);
      for (let i = 1; i <= 6; i++) g.fx.burst(V(z.x + st.ux * m.len * i / 6, z.y + 0.4, z.z + st.uz * m.len * i / 6), 3, { color: m.fxColor ?? col, color2: 0xffffff, speed: 2.5, up: 3, size: 0.08, life: 0.4 });
      g.sfx.slam?.(0.6); clearMove(st);
    }
    if (m.kind === 'line' && m.dash) { for (const o of st.marks) unmark(o); st.marks = []; g.sfx.roar?.(0.4); }
    if (m.kind === 'wave') { // ちゃくち → わが ひろがる（ジャンプで よける）
      z.y = st.y0; for (const o of st.marks) unmark(o); st.marks = [];
      st.ring = new THREE.Mesh(G.ring, M.fill); st.ring.position.set(z.x, gy(z.x, z.z, z.y), z.z); st.ring.scale.set(0.5, 1, 0.5); grp.add(st.ring);
      st.cx = z.x; st.cz = z.z; g.shake = Math.max(g.shake, 0.4); g.sfx.slam?.(0.9);
      g.fx.burst(V(z.x, z.y + 0.3, z.z), 18, { color: B.fxColor ?? col, color2: 0xffffff, speed: 6, up: 2, size: 0.1, life: 0.5 });
    }
    if (m.kind === 'summon') {
      for (const e of st.eggs) { summon(z, m.minion, e.x, e.z, m.hpMul ?? 0.8); grp.remove(e.m); eggs.splice(eggs.indexOf(e), 1); }
      for (const o of st.marks) { if (o.spawn) { const n = summon(z, m.minion, o.a.x, o.a.z, m.hpMul ?? 0.8); if (o.yaw != null) n.yaw = o.yaw; } unmark(o); }
      st.eggs = []; st.marks = [];
    }
    if (m.kind === 'clones') { for (const o of st.marks) { if (o.spawn) { const c = summon(z, m.minion, o.a.x, o.a.z, m.hpMul ?? 0.2); c.clone = true; if (c.model.eyes) c.model.eyes.visible = false; } unmark(o); } st.marks = []; }
    if (m.kind === 'pounce') {
      const o = st.marks[0];
      if (o) { const c = collideCircle(o.a.x, o.a.z, 0.5 * z.scale, z.y, g.zCol); z.x = c.x; z.z = c.z; resolveCircle(z, m, o); st.marks = []; }
      z.model.root.visible = true; z.hidden = false; z.model.root.position.set(z.x, z.y, z.z);
    }
  }
  function runAct(g, z, st, m, dt) {
    const p = P();
    if (m.kind === 'shots') {
      const due = m.gap ? Math.min(m.n, Math.floor(st.t / m.gap) + 1) : m.n;
      while (st.fired < due) {
        if (m.spread && !m.gap) { for (const [ux, uz] of fanDirs(st.ux, st.uz, m.n, m.spread)) shoot(z, ux, uz, m); st.fired = m.n; break; }
        const dirs = m.spread ? fanDirs(st.ux, st.uz, m.n, m.spread) : null;
        const [ux, uz] = dirs ? dirs[st.fired] : [st.ux, st.uz];
        shoot(z, ux, uz, m); st.fired++; g.sfx.spit?.(0.4);
      }
      return 'still';
    }
    if (m.kind === 'line' && m.dash) {
      const sp = m.speed * dt, nx = z.x + st.ux * sp, nz = z.z + st.uz * sp;
      const c = collideCircle(nx, nz, 0.3 * z.scale, z.y, g.zCol);
      const moved = Math.hypot(c.x - z.x, c.z - z.z);
      z.x = c.x; z.z = c.z; z.yaw = Math.atan2(-st.ux, -st.uz); z.state = 'walk';
      if (!st.hit && Math.hypot(p.x - z.x, p.z - z.z) < 0.9 * z.scale + 0.4 && near(z.x, z.z, z.y)) { st.hit = true; hurt(m.dmg, z); g.pk.set(st.ux * 9, 0, st.uz * 9); }
      if (moved < sp * 0.4) { // かべに ぶつかった
        st.t = 99;
        g.shake = Math.max(g.shake, 0.3); g.sfx.slam?.(0.7);
        if (m.stun) { st.stunT = m.stun; g.hud.kill('きぜつ した！ いまだ！', true); }
      }
      return 'move';
    }
    if (m.kind === 'wave') {
      const rad = Math.min(m.R, 0.5 + st.t * m.speed);
      if (st.ring) st.ring.scale.set(rad, 1, rad);
      const d = Math.hypot(p.x - st.cx, p.z - st.cz), up = (g.pos.y - (g.pFloor ?? g.pos.y)) > 0.35;
      if (!st.hit && Math.abs(d - rad) < 0.8 && !up && near(st.cx, st.cz, z.y)) { st.hit = true; hurt(m.dmg, z); g.pk.set((p.x - st.cx) / (d || 1) * 7, 0, (p.z - st.cz) / (d || 1) * 7); }
      return 'still';
    }
    if (m.kind === 'cone') {
      st.tickT -= dt;
      if (Math.random() < 0.6) { const a = (Math.random() - 0.5) * m.angle * Math.PI / 180, ang = Math.atan2(st.uz, st.ux) + a, d = Math.random() * m.len; g.fx.burst(V(z.x + Math.cos(ang) * d, z.y + 0.6, z.z + Math.sin(ang) * d), 2, { color: m.fxColor ?? 0xffa030, color2: 0xfff0a0, speed: 2, up: 2, size: 0.07, life: 0.3, gravity: -2 }); }
      if (st.tickT <= 0 && inCone(p.x, p.z, z.x, z.z, st.ux, st.uz, m.len, m.angle) && near(z.x, z.z, z.y)) { st.tickT = m.tick ?? 0.5; hurt(m.dmg, z); }
      return 'still';
    }
    return 'still';
  }
  // そらを とぶ ボス: プレイヤーの まわりを まわる
  function orbit(z, dt, dist, dx, dz, k = 1) {
    const f = B.fly, a = Math.atan2(-dz, -dx) + (f.dir || 1) * dt * k * f.speed / f.r;
    const tx = P().x + Math.cos(a) * f.r, tz = P().z + Math.sin(a) * f.r;
    const c = collideCircle(z.x + (tx - z.x) * Math.min(1, dt * 2), z.z + (tz - z.z) * Math.min(1, dt * 2), 0.6, z.y, game.zCol);
    z.x = c.x; z.z = c.z; z.yaw = Math.atan2(dx, dz) + Math.PI; z.state = 'walk';
    return 'move';
  }

  // だんかいが かわる（さいごの ボス: からだが ひかる・よこくの いろ・HP バーの いろ・わざ）
  function phaseTo(g, z, k) {
    const ph = B.phases[k]; z.ai.st.ph = k;
    if (ph.color != null) { M.base.color.setHex(ph.color); M.fill.color.setHex(ph.color); }
    if (ph.glow != null) for (const mm of z.model.meshes) { const mt = mm.userData.mat || mm.material; if (mt && mt.emissive) mt.emissive.setHex(ph.glow); }
    z.barColor = ph.bar ?? null;
    g.hud.bossBar?.({ name: g.bossName(), hp: Math.max(0, z.hp / z.maxHp), color: z.barColor });
    if (ph.msg) g.hud.banner(ph.msg, ph.sub || '');
    g.fx.burst(V(z.x, z.y + 1.5 * z.scale, z.z), 30, { color: ph.color ?? col, color2: 0xffffff, speed: 5, up: 3, size: 0.12, life: 0.8 });
    g.sfx.roar?.(0.6); g.shake = Math.max(g.shake, 0.4);
  }
  function attach(z) {
    boss = z;
    z.slamCd = z.chargeCd = 1e9; // いつもの ドスン・とっしんは つかわない
    if (B.scale) { z.scale = B.scale; z.model.root.scale.setScalar(B.scale); }
    if (B.speed) z.speed *= B.speed;
    z.ai = { st: brainNew(B), pre: ai.pre, act: ai.act, hitMul: B.hitMul || null };
    if (B.phases) { const c0 = B.phases[0].color; if (c0 != null) { M.base.color.setHex(c0); M.fill.color.setHex(c0); } z.barColor = B.phases[0].bar ?? null; }
  }
  function tick(dt) {
    tickShots(dt); tickIce(dt);
    if (boss && !boss.alive) { // たおした: よこく・たまご・にせものを けす
      if (boss.ai) clearMove(boss.ai.st);
      boss.model.root.visible = true; boss.hidden = false;
      for (const n of minions) if (n.alive && n.clone) game.hitZombie(n, 99999, false, V(n.x, 1, n.z), V(0, 0, 1), { quiet: true });
      boss = null;
    }
  }
  function dispose() {
    game.scene.remove(grp);
    for (const g of [G.ring, G.disc, G.plane, G.ball, ...Object.values(G.cones)]) g.dispose();
    for (const m of Object.values(M)) m.dispose();
    for (const c of ices) c.m.material.dispose();
    marks.length = shots.length = ices.length = eggs.length = 0; minions.clear();
  }
  return { attach, tick, remap() {}, dispose, get fx() { return live(); }, get marks() { return marks; } };
}
