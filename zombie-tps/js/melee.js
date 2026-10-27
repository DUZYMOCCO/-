// v0.13.0: なぐる（くぎバット・ハンマー・かたな）
// じゅうは もったまま。「なぐる」ボタンで まえの ちかくの ゾンビを なぐって ふっとばす（かべごしは だめ・みかたには あたらない）
import * as THREE from '../vendor/three.module.min.js';
import {
  meleeStats, meleeLevel, newMeleeState, meleePress, meleeTick, meleeDur, meleeStyle, swingPose,
  meleeTargets, meleeAim, meleeBlocked, meleeDamage, meleeRawKnock, meleeDown, bumpTransfer, BUMP, isMelee, DEFAULT_MELEE,
} from './rules.js?v=21';
import { makeMeleeWeapons } from './models.js?v=21';

const _p = new THREE.Vector3(), _d = new THREE.Vector3();
const TRAIL_C = { bat: 0xfff0c0, hammer: 0xffd890, katana: 0xd6f0ff };
const SPARK = { bat: [0xfff0a0, 0xffffff], hammer: [0xffd070, 0xffffff], katana: [0xcfeaff, 0xffffff] };

export const MeleeMixin = {
  initMelee() {
    this.mSt = newMeleeState(); this.mN = 0; this.mCands = []; this.mNear = []; this.mBumpSeq = 0; this.mTurn = 0; this.mFade = 0; this.mStyle = 'h';
    this.mModels = makeMeleeWeapons();
    const hold = this.mHold = new THREE.Group(); hold.position.set(0.05, -0.05, -0.5); hold.visible = false;
    for (const id in this.mModels) { this.mModels[id].visible = false; hold.add(this.mModels[id]); }
    this.p.aim.add(hold);
    // ふった あとの ひかり（よこ・たて）と ハンマーの じめんの わ
    const tmat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.mTrail = {
      h: new THREE.Mesh(new THREE.RingGeometry(0.85, 2.15, 20, 1, Math.PI / 2 - 1.3, 2.6).rotateX(-Math.PI / 2), tmat()),
      v: new THREE.Mesh(new THREE.RingGeometry(0.85, 2.05, 20, 1, -1.0, 2.7).rotateY(Math.PI / 2), tmat()),
    };
    for (const k in this.mTrail) { this.mTrail[k].visible = false; this.mTrail[k].renderOrder = 5; this.scene.add(this.mTrail[k]); }
    const rm = tmat(); rm.color.set(0xffc870);
    this.mRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2), rm); this.mRing.visible = false; this.scene.add(this.mRing);
    this.mShock = null;
    this.refreshMelee();
  },
  // えらんだ ぶき・レベル（つよく する がめんの あとにも よぶ）
  refreshMelee() {
    const s = this.settings || {}, id = isMelee(s.melee) ? s.melee : DEFAULT_MELEE;
    this.mId = id; this.mW = meleeStats(id, meleeLevel(s, id));
    for (const k in this.mModels) this.mModels[k].visible = k === id;
  },
  resetMelee() {
    this.mSt = newMeleeState(); this.mN = 0; this.mTurn = 0; this.mFade = 0; this.mShock = null;
    if (this.mHold) this.mHold.visible = false;
    if (this.p) this.p.holder.visible = true;
    if (this.mTrail) for (const k in this.mTrail) this.mTrail[k].visible = false;
    if (this.mRing) this.mRing.visible = false;
  },
  // まいフレーム（held = ボタン／V キーを おしている）
  updateMelee(dt, held) {
    const st = this.mSt, W = this.mW;
    this.updateMeleeFx(dt);
    if (this.suit || this.state !== 'play') { if (st.active) this.resetMelee(); if (this.suit) this.suitMelee?.(held); return; } // v0.15.0: スーツの ときは なぐる＝スーツの パンチ
    if (held) meleePress(st, W);
    const ev = meleeTick(st, W, dt);
    if (ev === 'hit') this.meleeHit(st.step);
    if (st.n !== this.mN && st.active) { this.mN = st.n; this.meleeBegin(); }
  },
  meleeBegin() {
    const W = this.mW, P = this.pos;
    this.mStyle = meleeStyle(W, this.mSt.step);
    // すこしだけ じどうで ねらう（カメラも そっと むける）
    const a = meleeAim(P.x, P.y, P.z, this.yaw, this.zGrid.query(P.x, P.z, W.range + 1.4, this.mCands), W, 1.0);
    const turn = Math.max(-0.9, Math.min(0.9, a.turn));
    this.yawT += turn * 0.6; this.mTurn = turn * 0.4; // のこりは からだだけ ひねる
    this.sfx.swish?.(W.id);
  },
  meleeHit(step) {
    const W = this.mW, P = this.pos, cands = this.zGrid.query(P.x, P.z, W.range + 1.4, this.mCands);
    const aim = meleeAim(P.x, P.y, P.z, this.yaw + this.mTurn, cands, W, 1.0);
    const fx = -Math.sin(aim.yaw), fz = -Math.cos(aim.yaw);
    const hits = meleeTargets(P.x, P.y, P.z, fx, fz, cands, W);
    const ay = P.y + 1.15;
    let n = 0, kills = 0;
    const done = this.mDone || (this.mDone = new Set()); done.clear();
    const seq = ++this.mBumpSeq;
    for (const h of hits) {
      const z = h.z, s = z.scale || 1;
      // かべごしは だめ（むね か あたまが みえれば OK）
      if (meleeBlocked(P.x, ay, P.z, z.x, z.y + 0.9 * s, z.z, this.sCol) && meleeBlocked(P.x, ay, P.z, z.x, z.y + 1.6 * s, z.z, this.sCol)) continue;
      let dx = z.x - P.x, dz = z.z - P.z; const dl = Math.hypot(dx, dz) || 1; dx = dx / dl * 0.65 + fx * 0.35; dz = dz / dl * 0.65 + fz * 0.35;
      const l2 = Math.hypot(dx, dz) || 1; _d.set(dx / l2, 0, dz / l2);
      _p.set(z.x - _d.x * 0.3 * s, z.y + Math.min(1.25, Math.max(0.5, ay - z.y - 0.1)) * s, z.z - _d.z * 0.3 * s);
      this.meleeStrike(z, meleeDamage(W, step), meleeRawKnock(W, step), meleeDown(W, z.kind, step), _p, _d, seq, W) && kills++;
      done.add(z); n++;
    }
    if (W.shock) { // じめんを たたく ばしょ（かべの まえで とまる）
      let sd = 1.3; while (sd > 0.3 && meleeBlocked(P.x, P.y + 0.4, P.z, P.x + fx * (sd + 0.2), P.y + 0.4, P.z + fz * (sd + 0.2), this.sCol)) sd -= 0.25;
      const r = this.meleeShockwave(P.x + fx * sd, P.y, P.z + fz * sd, W, done, seq); n += r.n; kills += r.kills;
    }
    if (n) {
      this.hitstop = Math.max(this.hitstop, W.hitstop); this.shake = Math.min(0.3, Math.max(this.shake, W.shake));
      this.sfx.smack?.(W.id, Math.min(1, 0.7 + n * 0.1)); this.hud.hitmarker?.(kills > 0);
      if (kills >= 2) this.multiKill(kills);
    }
    this.mLastHits = n;
  },
  // 1たいに あてる。たおしたら true
  meleeStrike(z, dmg, knock, down, pos, dir, seq, W, bot = null) { // v0.14.0: bot = 'drunk'（よっぱらいおじさん）
    const c = SPARK[W.id] || SPARK.bat;
    this.fx.burst(pos, W.id === 'hammer' ? 10 : 7, { color: c[0], color2: c[1], speed: 4.5, up: 1.2, size: 0.055, life: 0.22, gravity: 5 });
    this.fx.greenHit(pos, dir, false); // みどりの ちだけ
    z.bumpT = 0.5; z.bumpId = seq;
    const killed = this.hitZombie(z, dmg, false, pos, dir, { knock, melee: W.id, noShield: !!W.noShield, bot });
    if (!killed) {
      if (down > 0) { // ころぶ（かるい ゾンビだけ）
        z.down = z.downT0 = down; z.stagger = Math.max(z.stagger, down); z.leap = null; z.scream = 0;
        if (z.climb) this.dropClimb(z);
        if (z.vy === 0 && !z.climb) { z.vy = 2.2; z.y = Math.max(z.y, z.y + 0.01); }
      }
      if (W.bleed) { z.bleedT = W.bleed.time; z.bleedDps = W.bleed.dps; z.bleedAcc = z.bleedAcc || 0; }
    }
    return killed;
  },
  // ハンマー: じめんを ドーン → まわりの ゾンビも ころぶ
  meleeShockwave(x, y, zc, W, done, seq) {
    const S = W.shock; let n = 0, kills = 0;
    this.mShock = { t: 0, x, y, z: zc, r: S.r };
    this.fx.burst(_p.set(x, y + 0.1, zc), 14, { color: 0x9a8466, color2: 0xd8c8a8, speed: 5, up: 1.6, size: 0.09, life: 0.5, gravity: 9 });
    this.sfx.slam?.(0.55);
    for (const z of this.zGrid.query(x, zc, S.r + 0.5, this.mNear)) {
      if (!z.alive || z.demo || done.has(z) || Math.abs(z.y - y) > 1.0) continue;
      const dx = z.x - x, dz = z.z - zc, d = Math.hypot(dx, dz);
      if (d > S.r + 0.3 * (z.scale || 1)) continue;
      if (meleeBlocked(x, y + 0.4, zc, z.x, z.y + 0.5, z.z, this.sCol)) continue;
      const k = 1 - Math.min(1, d / (S.r + 0.3)) * 0.5;
      _d.set(d > 0.01 ? dx / d : -Math.sin(this.yaw), 0, d > 0.01 ? dz / d : -Math.cos(this.yaw));
      _p.set(z.x, z.y + 0.6, z.z);
      if (this.meleeStrike(z, Math.round(S.dmg * k), S.knock * k, meleeDown(W, z.kind), _p, _d, seq, { ...W, bleed: null })) kills++;
      n++;
    }
    return { n, kills };
  },
  // くぎバットの じわじわ（みどりの しずく）
  bleedTick(z, dt) {
    z.bleedT -= dt; z.bleedAcc = (z.bleedAcc || 0) + z.bleedDps * dt;
    if (z.bleedAcc >= 3 || (z.bleedT <= 0 && z.bleedAcc > 0.5)) {
      const d = z.bleedAcc; z.bleedAcc = 0;
      _d.set(-Math.sin(z.yaw), 0, -Math.cos(z.yaw));
      this.fx.burst(_p.set(z.x, z.y + 1.0 * z.scale, z.z), 2, { color: 0x45c932, color2: 0x8fe060, speed: 0.6, up: 0.3, size: 0.07, life: 0.45, gravity: 9 });
      this.hitZombie(z, d, false, _p, _d, { quiet: true });
    }
    if (z.bleedT <= 0) { z.bleedT = 0; z.bleedAcc = 0; }
  },
  // ふっとんだ ゾンビが ほかの ゾンビに ぶつかる（slideZombie から）
  meleeBump(z, dt) {
    z.bumpT -= dt;
    const sp = Math.hypot(z.kvx, z.kvz); if (sp < BUMP.min) return;
    const ux = z.kvx / sp, uz = z.kvz / sp;
    for (const o of this.zGrid.query(z.x, z.z, 0.4 * z.scale + 1.0, this.mNear)) {
      if (o === z || !o.alive || o.bumpId === z.bumpId || Math.abs(o.y - z.y) > 0.8) continue;
      const ox = o.x - z.x, oz = o.z - z.z, d = Math.hypot(ox, oz), md = 0.4 * (z.scale + o.scale) + BUMP.r;
      if (d > md || (ox * ux + oz * uz) < 0) continue; // まえに いる なかまだけ
      const t = bumpTransfer(sp, o.kind); if (!t) break;
      const bx = d > 0.01 ? ox / d * 0.5 + ux * 0.5 : ux, bz = d > 0.01 ? oz / d * 0.5 + uz * 0.5 : uz, bl = Math.hypot(bx, bz) || 1;
      _d.set(bx / bl, 0, bz / bl); _p.set(o.x - _d.x * 0.3, o.y + 1.0 * o.scale, o.z - _d.z * 0.3);
      o.bumpT = 0.4; o.bumpId = z.bumpId;
      const raw = sp * BUMP.share; // hitZombie が おもさを かける
      this.hitZombie(o, t.dmg, false, _p, _d, { knock: raw });
      this.fx.burst(_p, 4, { color: 0xffffff, color2: 0xc8f0a0, speed: 2.5, up: 1, size: 0.05, life: 0.2, gravity: 6 });
      if (Math.hypot(o.x - this.pos.x, o.z - this.pos.z) < 16) this.sfx.thud?.();
      z.kvx *= 0.55; z.kvz *= 0.55;
      break; // 1かいに 1たい
    }
  },
  updateMeleeFx(dt) {
    const S = this.mShock;
    if (S) {
      S.t += dt; const u = S.t / 0.32;
      if (u >= 1) { this.mShock = null; this.mRing.visible = false; }
      else { this.mRing.visible = true; this.mRing.position.set(S.x, S.y + 0.06, S.z); this.mRing.scale.setScalar(0.3 + S.r * Math.sqrt(u)); this.mRing.material.opacity = 0.85 * (1 - u); }
    }
  },
  // updatePlayerAnim の さいごに よぶ: じゅうを かくして ぶきを ふる
  meleeAnim(dt) {
    const P = this.p, st = this.mSt;
    P.aim.rotation.y = 0; P.aim.rotation.z = 0; P.torso.rotation.y = 0;
    const W = this.mW;
    for (const k in this.mTrail) this.mTrail[k].visible = false;
    if (!st || !st.active || this.suit) {
      if (this.mHold.visible) { this.mHold.visible = false; P.holder.visible = true; }
      this.mTurn *= Math.exp(-10 * dt);
      return;
    }
    const D = meleeDur(W, st.step), u = Math.min(1, st.t / D), style = this.mStyle, pose = swingPose(style, u, W);
    P.holder.visible = false; this.mHold.visible = true;
    this.mTurn *= Math.exp(-6 * dt);
    const v = style === 'v';
    P.aim.rotation.x = pose.pitch + (v ? 0 : this.pitch * 0.4);
    P.aim.rotation.y = pose.yaw + this.mTurn; P.aim.rotation.z = pose.roll * 0.35;
    P.torso.rotation.y = pose.yaw * 0.3 + this.mTurn * 0.5;
    P.armR.rotation.set(0, 0.42, 0); P.armL.rotation.set(0, -0.5, 0); P.armL.position.set(-0.33, 0, 0.04);
    this.mHold.rotation.set(v ? 0.35 : 0.3, 0, v ? 0 : pose.roll * 0.6);
    // ひかりの すじ（ふりおろしの あいだだけ）
    const a = W.wind, b = W.strike;
    if (u > a && u < b + 0.18) {
      const T = this.mTrail[v ? 'v' : 'h'], k = u < b ? (u - a) / (b - a) : 1 - (u - b) / 0.18;
      T.visible = true; T.material.color.set(TRAIL_C[W.id] || 0xffffff); T.material.opacity = 0.42 * Math.max(0, Math.min(1, k));
      T.position.set(this.pos.x, this.pos.y + (v ? 1.0 : 1.15), this.pos.z); T.rotation.set(0, this.yaw + this.mTurn, 0);
      T.scale.setScalar(W.range / 2.2);
    }
  },
};
