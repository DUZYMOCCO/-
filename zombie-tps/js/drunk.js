// v0.14.0: よっぱらいおじさん（けいさつおじさんと おなじ「ときどき たすけに くる」なかま・その ウェーブ だけ）
// ・まっかな かおで ふらふら・「ひっく」。おさけの びんや のむ ばめんは ださない
// ・ふつうの バットで ちかくの ゾンビを なぐって ふっとばす（くぎバットと おなじ しくみ・すこし よわい）
// ・けいさつおじさんとは べつべつに くるか きめる（ふたり いっしょの ときも ある）・つづけての ウェーブには こない
import * as THREE from '../vendor/three.module.min.js';
import {
  DRUNK, DRUNK_LINES, drunkWobble, drunkPickTarget, drunkShouldCome, damageAlly, edgeArrow, robotFollowPoint,
  meleeTargets, meleeBlocked, meleeDown, swingPose,
} from './rules.js?v=16';
import { makeDrunkUncle } from './models.js?v=16';
import { allyShouldTeleport, wrapA } from './ally.js?v=16';

const _p = new THREE.Vector3(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
const W = DRUNK.bat;

export const DrunkMixin = {
  initDrunk() {
    this.drunkM = makeDrunkUncle();
    this.drunkM.root.visible = false; this.drunkM.root.scale.setScalar(DRUNK.scale);
    this.scene.add(this.drunkM.root);
    this.drunk = null; this.drunkPlan = null; this.drunkVisits = 0; this.dCands = [];
    this.drunkLast = 0;
  },
  // ウェーブの はじめ: くるか きめる（けいさつおじさんとは べつに きめる）
  planDrunk(r = Math.random()) {
    this.drunkPlan = null;
    if (this.drunk) return false;
    if (!drunkShouldCome(this.wave, this.drunkLast, r)) return false;
    this.drunkPlan = { t: 3.2, wave: this.wave }; // けいさつおじさん（2.4びょう）と すこし ずらして くる
    this.drunkLast = this.wave;
    return true;
  },
  // ふたりの おじさん（それぞれ べつの かくりつ・それぞれ つづけて こない）
  planUncles() {
    const c = this.planCop(this.forceCop ? 0 : Math.random());
    const d = this.planDrunk(this.forceDrunk ? 0 : Math.random());
    return { cop: c, drunk: d };
  },
  spawnDrunk() {
    const p = this.allyWarpSpot(DRUNK);
    if (!p) return null;
    const m = this.drunkM;
    m.root.visible = true; m.bat.visible = true;
    for (const a of m.arms) { a.rotation.set(0, 0, 0); }
    this.drunk = { x: p.x, y: p.y, z: p.z, yaw: this.yaw, vy: 0, hp: DRUNK.hp, maxHp: DRUNK.hp, state: 'on', t: 0, aimT: 0, target: -1,
      stuckT: 0, hurtT: 0, phase: 0, moving: 0, onScreen: false, kills: 0, hits: 0, swings: 0, wave: this.wave, warpColor: 0xff8a7a,
      sw: null, swCd: 0.4, seed: Math.random() * 6, hicT: 1.2, say: '', sayT: 0, hop: 0 };
    this.drunkVisits++;
    this.fx.burst(_p.set(p.x, p.y + 1.0, p.z), 22, { color: 0xff8a7a, color2: 0xffffff, speed: 2.2, up: 2.2, size: 0.08, life: 0.7, gravity: 2 });
    this.hud.kill('よっぱらいおじさんが たすけに きた！ ひっく', true);
    this.sfx.hic?.(0.7);
    m.root.position.set(p.x, p.y, p.z); m.root.rotation.y = this.yaw;
    return this.drunk;
  },
  drunkLeave() {
    this.drunkPlan = null;
    const c = this.drunk; if (!c || c.state !== 'on') return;
    c.state = 'leave'; c.t = 0; c.sw = null;
    this.drunkSay('またな〜 ひっく');
  },
  hurtDrunk(d) {
    const c = this.drunk; if (!c || c.state !== 'on') return;
    c.hurtT = 0.2;
    if (damageAlly(c, d, DRUNK)) this.drunkDown();
  },
  drunkDown() {
    const c = this.drunk; if (!c) return;
    c.state = 'down'; c.t = 0; c.target = -1; c.sw = null;
    this.drunkSay('あいたた… ひっく');
  },
  endDrunk() {
    this.drunk = null; this.drunkPlan = null;
    if (this.drunkM) this.drunkM.root.visible = false;
    if (this.drunkHudOn) { this.drunkHudOn = false; this.hud.drunk?.(null); }
  },
  drunkGone() {
    const c = this.drunk; if (!c) return;
    this.fx.poof(_p.set(c.x, c.y + 0.9, c.z), 1.1);
    this.endDrunk();
  },
  drunkSay(s) { const c = this.drunk; if (!c) return; c.say = s; c.sayT = 1.5; c.hop = 1; this.sfx.hic?.(0.5); },
  // バットを ふって あたる しゅんかん
  drunkHit() {
    const c = this.drunk, fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
    const cands = this.zGrid.query(c.x, c.z, W.range + 1.4, this.dCands);
    const hits = meleeTargets(c.x, c.y, c.z, fx, fz, cands, W);
    const ay = c.y + 1.05, seq = ++this.mBumpSeq;
    let n = 0;
    for (const h of hits) {
      const z = h.z, s = z.scale || 1;
      if (meleeBlocked(c.x, ay, c.z, z.x, z.y + 0.9 * s, z.z, this.sCol) && meleeBlocked(c.x, ay, c.z, z.x, z.y + 1.6 * s, z.z, this.sCol)) continue;
      let dx = z.x - c.x, dz = z.z - c.z; const dl = Math.hypot(dx, dz) || 1; dx = dx / dl * 0.65 + fx * 0.35; dz = dz / dl * 0.65 + fz * 0.35;
      const l2 = Math.hypot(dx, dz) || 1; _d.set(dx / l2, 0, dz / l2);
      _p.set(z.x - _d.x * 0.3 * s, z.y + 1.0 * s, z.z - _d.z * 0.3 * s);
      if (this.meleeStrike(z, W.dmg, W.knock, meleeDown(W, z.kind), _p, _d, seq, W, 'drunk')) c.kills++;
      n++;
    }
    c.hits += n;
    if (n && Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < 18) this.sfx.thud?.();
    if (n && Math.random() < 0.3) this.drunkSay(Math.random() < 0.5 ? 'どっこいしょ〜！' : 'ひっく！ えいっ');
    return n;
  },
  updateDrunk(dt) {
    if (this.drunkPlan && !this.drunk && this.state === 'play') {
      this.drunkPlan.t -= dt;
      if (this.drunkPlan.t <= 0) {
        if (this.interT > 0 || this.drunkPlan.wave !== this.wave) this.drunkPlan = null;
        else if (!this.spawnDrunk()) this.drunkPlan.t = 0.5;
        else this.drunkPlan = null;
      }
    }
    const c = this.drunk; if (!c) return;
    const m = this.drunkM;
    c.t += dt; c.hurtT -= dt; c.sayT -= dt; c.hop = Math.max(0, c.hop - dt * 4);
    m.inner.position.set(0, 0, 0);
    // ふらふら（からだと あたまが ゆれる）
    m.inner.rotation.z = Math.sin(c.t * 2.1 + c.seed) * 0.11;
    m.headPivot.rotation.z = Math.sin(c.t * 1.7 + c.seed + 1) * 0.16;
    if (c.state === 'on') {
      c.hicT -= dt;
      if (c.hicT <= 0) { c.hicT = DRUNK.hicT[0] + Math.random() * (DRUNK.hicT[1] - DRUNK.hicT[0]); this.drunkSay(DRUNK_LINES[(Math.random() * DRUNK_LINES.length) | 0]); }
      c.aimT -= dt; c.swCd -= dt;
      if (c.aimT <= 0) { c.aimT = 0.25; c.target = this.state === 'play' ? drunkPickTarget(this.zombies, c.x, c.z, this.pos.x, this.pos.z) : -1; }
      const tz = c.target >= 0 ? this.zombies[c.target] : null;
      const PF = this.pFloor ?? this.pos.y;
      let mvx = 0, mvz = 0, sp = 0, wantYaw = null;
      if (tz && tz.alive) {
        const dx = tz.x - c.x, dz = tz.z - c.z, d = Math.hypot(dx, dz) || 1;
        wantYaw = Math.atan2(-dx, -dz);
        if (d > W.range * 0.75 && !c.sw) { mvx = dx / d; mvz = dz / d; sp = DRUNK.runSpeed * (0.8 + 0.2 * Math.sin(c.t * 3 + c.seed)); }
        if (d < W.range + 0.3 && !c.sw && c.swCd <= 0 && Math.abs(wrapA(wantYaw - c.yaw)) < 0.6 && this.state === 'play') {
          c.sw = { t: 0, hit: false }; c.swings++; this.sfx.swish?.('bat');
        }
      } else {
        c.target = -1;
        const fp = robotFollowPoint(this.pos.x, this.pos.z, this.yaw, DRUNK.back, DRUNK.side);
        const fx = fp.x - c.x, fz = fp.z - c.z, dF = Math.hypot(fx, fz), dP = Math.hypot(this.pos.x - c.x, this.pos.z - c.z);
        if (dF > DRUNK.near) {
          if (Math.abs(PF - c.y) < 0.4 && this.nav.lineClear(c.x, c.y, c.z, fp.x, PF, fp.z)) { mvx = fx / dF; mvz = fz / dF; }
          else { const nd = this.nav.dir(c.x, c.y, c.z); if (nd) { mvx = nd.x; mvz = nd.z; } else { mvx = fx / dF; mvz = fz / dF; } }
          sp = Math.min(dP > 5 ? DRUNK.runSpeed : DRUNK.speed, dF * 3.5);
        }
      }
      if (sp > 0) { // ふらふら あるく（すすむ むきが ゆれる）
        const w = drunkWobble(c.t, c.seed), cs = Math.cos(w), sn = Math.sin(w);
        const rx = mvx * cs - mvz * sn, rz = mvx * sn + mvz * cs; mvx = rx; mvz = rz;
        if (wantYaw === null) wantYaw = Math.atan2(-mvx, -mvz);
      }
      this.allyStep(c, DRUNK, dt, mvx, mvz, sp);
      const dP = Math.hypot(this.pos.x - c.x, this.pos.z - c.z);
      if (this.state === 'play' && allyShouldTeleport(DRUNK, dP, PF - c.y, c.onScreen, c.stuckT)) this.allyTeleport(c, DRUNK, c.warpColor);
      if (wantYaw !== null) c.yaw = wrapA(c.yaw + wrapA(wantYaw - c.yaw) * Math.min(1, dt * 7));
      // バットを ふる
      if (c.sw) {
        c.sw.t += dt; const u = Math.min(1, c.sw.t / W.dur);
        if (!c.sw.hit && u >= W.hitAt) { c.sw.hit = true; this.drunkHit(); }
        const pose = swingPose('h', u, W);
        m.aim.rotation.set(pose.pitch, pose.yaw, pose.roll * 0.35);
        if (u >= 1) { c.sw = null; c.swCd = 0.35 + Math.random() * 0.35; }
      } else {
        m.aim.rotation.x = 0.15 + Math.sin(c.t * 2.6) * 0.08; m.aim.rotation.y = Math.sin(c.t * 1.3) * 0.15; m.aim.rotation.z = 0;
      }
      this.drunkAnim(c, m, dt);
      return;
    }
    m.aim.rotation.set(0, 0, 0);
    if (c.state === 'leave') {
      c.yaw = Math.atan2(-(this.pos.x - c.x), -(this.pos.z - c.z));
      const arm = m.arms[0]; arm.rotation.x = 1.75; arm.rotation.z = Math.sin(c.t * 10) * 0.45;
      c.moving = 0; this.drunkAnim(c, m, dt);
      if (c.t >= DRUNK.leaveTime) { arm.rotation.set(0, 0, 0); this.drunkGone(); }
      return;
    }
    if (c.state === 'down') {
      const dx = c.x - this.pos.x, dz = c.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      this.allyStep(c, DRUNK, dt, dx / d, dz / d, DRUNK.speed * 0.6);
      c.yaw = Math.atan2(dx / d, dz / d);
      m.headPivot.rotation.z = Math.sin(c.t * 7) * 0.25;
      this.drunkAnim(c, m, dt);
      if (c.t >= DRUNK.downTime) this.drunkGone();
    }
  },
  drunkAnim(c, m, dt) {
    const sw = c.moving > 0.05 ? Math.sin(c.phase) * 0.6 * Math.min(1, c.moving + 0.3) : 0;
    m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
    m.inner.position.y = Math.abs(sw) * 0.03 + Math.sin(c.hop * Math.PI) * 0.12; // 「ひっく」で ぴょこん
    if (c.hurtT > 0) m.inner.position.x = (Math.random() - 0.5) * 0.07;
    m.root.position.set(c.x, c.y, c.z); m.root.rotation.y = c.yaw;
    if (this.cullOn) m.root.visible = this.levelVisible(c.x, c.y, c.z);
  },
  updateDrunkHud() {
    const c = this.drunk;
    if (!c || this.state !== 'play') { if (this.drunkHudOn) { this.drunkHudOn = false; this.hud.drunk?.(null); } return; }
    const v = _p.set(c.x, c.y + 2.0, c.z).project(this.camera);
    const e = edgeArrow(v.x, v.y, v.z > 1);
    const k = _o.set(c.x, c.y + 0.9, c.z).project(this.camera);
    c.onScreen = !(k.z > 1) && Math.abs(k.x) < 1.08 && Math.abs(k.y) < 1.08;
    this.drunkHudOn = true;
    this.hud.drunk?.({ onScreen: e.onScreen && Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < 30, x: e.x, y: e.y, hp: c.hp / c.maxHp, state: c.state, say: c.sayT > 0 ? c.say : '' });
  },
};
