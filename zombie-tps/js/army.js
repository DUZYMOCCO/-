// v0.14.0: アーミーロボ（2たいめの ずっと いる なかま・レーザー）
// マップに 1たい（けいさつロボとは べつの ばしょ）。さわると なかまに なって、プレイヤーの みぎ うしろに つく。
// レーザーは まっすぐ とんで ゾンビを 3たいまで つらぬく（かべで とまる・プレイヤー／なかまには あたらない）。
// たおした かずで Lv1〜5（けいさつロボと おなじ しきい・レベルアップで HP ぜんかい）。
// v0.18.0: いろいろ しゃべる（起動・貫通キル・ピンチ・ウェーブ・掛け合い・ふきだし）
import * as THREE from '../vendor/three.module.min.js';
import {
  ARMY, pickRobotSpot, armyTouched, damageArmy, robotStats, robotAddKill, groundHeight, edgeArrow, castShot, laserHits, pickArmyTarget,
  pickBotLine, formatBotLine,
} from './rules.js?v=36';
import { makeArmyRobot, ARMY_CHUNKS } from './models.js?v=36';

const _o = new THREE.Vector3(), _p = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Vector3(), _e = new THREE.Vector3();
const NO_Z = [];
const BEAMS = 3, BEAM_T = 0.16;

export const ArmyMixin = {
  initArmy() {
    this.armyM = makeArmyRobot(this.fxTex?.glow);
    this.armyM.root.visible = false;
    this.scene.add(this.armyM.root);
    this.army = null;
    const mk = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
    this.armyBeams = [];
    for (let i = 0; i < BEAMS; i++) {
      const outer = new THREE.Mesh(g, mk(0xff3a28, 0.55)), core = new THREE.Mesh(g, mk(0xfff0e0, 0.9));
      outer.visible = core.visible = false; outer.renderOrder = core.renderOrder = 6;
      this.scene.add(outer); this.scene.add(core);
      this.armyBeams.push({ outer, core, t: 0 });
    }
    this.armyBeamI = 0;
  },
  spawnArmy(r1 = Math.random()) {
    this.endArmy();
    const s = this.gk && this.map.gk ? this.gkSpotFrom() : this.map.playerStart, sy = s.y || 0;
    this.nav.update(s.x, sy, s.z);
    let cells = this.nav.openCells(this.half - 3);
    const same = cells.filter((c) => Math.abs((c[2] || 0) - sy) < 0.5);
    if (same.length) cells = same;
    if (this.gk && this.map.gk) cells = this.gkSpotFilter(cells);
    const R = this.robot;
    if (R) { const far = cells.filter((c) => Math.hypot(c[0] - R.x, c[1] - R.z) > 8); if (far.length) cells = far; }
    if (!cells.length) return null;
    const [x, z, cy] = pickRobotSpot(cells, s.x, s.z, r1, ARMY.spot);
    const y = groundHeight(x, z, 0.3, (cy || 0) + 0.6, this.pCol);
    const m = this.armyM;
    m.root.visible = true; m.root.scale.setScalar(ARMY.scale);
    m.marker.visible = true; if (m.glow) m.glow.visible = true;
    const yaw = Math.atan2(-(s.x - x), -(s.z - z));
    this.army = {
      x, y, z, yaw, vy: 0, hp: ARMY.hp, maxHp: ARMY.hp, lv: 1, lvUpT: 0,
      state: 'idle', t: 0, fireT: 0.8, aimT: 0.1, target: -1, stuckT: 0, hurtT: 0,
      phase: 0, moving: 0, onScreen: false, shots: 0, kills: 0, pierced: 0, warpColor: 0xffa040,
      say: '', sayT: 0, sayCd: 0, lowHpSaid: false, idleTalkT: 14 + Math.random() * 8,
    };
    m.root.position.set(x, y, z); m.root.rotation.y = yaw;
    return this.army;
  },
  endArmy() {
    this.army = null;
    if (this.armyM) this.armyM.root.visible = false;
    if (this.armyBeams) for (const b of this.armyBeams) { b.t = 0; b.outer.visible = b.core.visible = false; }
    this.armyHudOn && this.hud.army?.(null); this.armyHudOn = false;
  },
  // v0.18.0: アーミーロボの はつげん
  sayArmy(ev, ctx = {}, force = false) {
    const r = this.army; if (!r || r.state !== 'on') return;
    if (!force && (r.sayCd > 0 || r.sayT > 0)) return;
    const hasPartner = !!(this.robot && this.robot.state === 'on');
    const line = pickBotLine('army', ev, { ...ctx, hasPartner });
    if (!line) return;
    r.say = line;
    r.sayT = 2.4;
    r.sayCd = force ? 3.0 : 6.0;
    this.hud.kill(formatBotLine('army', line));
    this.sfx.robotSay?.('army');
  },
  activateArmy() {
    const r = this.army; if (!r || r.state !== 'idle') return;
    r.state = 'on'; r.t = 0; r.fireT = 0.6;
    const m = this.armyM; m.marker.visible = false; if (m.glow) m.glow.visible = false;
    this.fx.burst(_p.set(r.x, r.y + 1.2, r.z), 26, { color: 0xffa040, color2: 0xfff0c0, speed: 2.4, up: 2.4, size: 0.09, life: 0.8, gravity: 2 });
    this.hud.banner('アーミーロボが なかまに なった！', 'レーザーで まとめて やっつけるよ');
    this.sayArmy('join', {}, true);
    this.sfx.robotOn?.();
    this.pushHud(true);
  },
  hurtArmy(d) {
    const r = this.army; if (!r || r.state !== 'on') return;
    r.hurtT = 0.2;
    if (damageArmy(r, d)) {
      this.breakArmy();
    } else {
      if (Math.random() < 0.5) this.sfx.clink?.(0.25);
      const hpRatio = r.hp / (r.maxHp || ARMY.hp);
      if (!r.lowHpSaid && hpRatio < 0.35) {
        r.lowHpSaid = true;
        this.sayArmy('lowHp', {}, true);
      } else if (r.sayCd <= 0 && Math.random() < 0.2) {
        this.sayArmy('hurt');
      }
    }
  },
  breakArmy() {
    const r = this.army; if (!r) return;
    const hasPartner = !!(this.robot && this.robot.state === 'on');
    this.fx.shatter(r.x, r.y, r.z, 1, r.yaw, ARMY_CHUNKS, { vx: 0, vy: 3, vz: 0 }, 22);
    this.fx.burst(_p.set(r.x, r.y + 1.1, r.z), 18, { color: 0xffe080, color2: 0xffa040, speed: 4, up: 2.5, size: 0.06, life: 0.5, gravity: 8 });
    this.fx.poof(_p.set(r.x, r.y + 0.8, r.z), 1);
    this.sfx.robotBreak?.();
    this.hud.banner('アーミーロボが こわれちゃった…', 'ここまで ありがとう！');
    this.hud.kill(formatBotLine('army', pickBotLine('army', 'break', { hasPartner })));
    if (hasPartner) {
      setTimeout(() => { if (this.robot && this.robot.state === 'on') this.sayRobot?.('partnerDown', {}, true); }, 450);
    }
    for (const z of this.zombies) if (z.botT === r) z.botT = false;
    this.armyM.root.visible = false;
    this.army = null;
    this.hud.army?.(null); this.armyHudOn = false;
  },
  // レーザー: かべ までの あいだの ゾンビを ちかい じゅんに 3たいまで
  armyShoot(z) {
    const r = this.army, m = this.armyM, st = robotStats(r.lv, ARMY);
    m.root.updateMatrixWorld(true);
    const muz = m.muzzle.getWorldPosition(_m);
    const ox = r.x, oy = r.y + 1.1, oz = r.z;
    const ty = z.y + (z.kind === 'crawler' ? 0.35 : 1.0 * z.scale);
    _d.set(z.x - ox, ty - oy, z.z - oz).normalize();
    const sp = ARMY.spread;
    _d.x += (Math.random() - 0.5) * sp * 2; _d.y += (Math.random() - 0.5) * sp * 2; _d.z += (Math.random() - 0.5) * sp * 2; _d.normalize();
    const wall = castShot(ox, oy, oz, _d.x, _d.y, _d.z, NO_Z, this.sCol, ARMY.range + 3);
    const hits = laserHits(ox, oy, oz, _d.x, _d.y, _d.z, this.zombies, wall.t, ARMY.pierce);
    let endT = hits.length >= ARMY.pierce ? hits[hits.length - 1].t + 0.4 : wall.t;
    let dmg = st.dmg, levelUp = false, kills = 0;
    for (const h of hits) {
      const zz = this.zombies[h.i]; if (!zz.alive) continue;
      _p.set(ox + _d.x * h.t, oy + _d.y * h.t, oz + _d.z * h.t);
      this.fx.burst(_p, 4, { color: 0xff6a40, color2: 0xfff0c0, speed: 2.2, up: 0.6, size: 0.06, life: 0.18, gravity: 3 });
      this.fx.greenHit(_p.clone(), _d.clone(), false);
      if (this.hitZombie(zz, dmg, false, _p.clone(), _d.clone(), { knock: 0.25, bot: 'army' })) {
        kills++;
        if (robotAddKill(r, 1, ARMY)) levelUp = true;
      }
      dmg *= ARMY.pierceFall;
    }
    if (hits.length > 1) r.pierced += hits.length - 1;
    _e.set(ox + _d.x * endT, oy + _d.y * endT, oz + _d.z * endT);
    this.armyBeam(muz, _e);
    r.shots++; r.kick = 1;
    const d = Math.hypot(r.x - this.pos.x, r.z - this.pos.z);
    this.sfx.laser?.(Math.max(0.15, 0.6 - d / 40));
    if (levelUp) {
      this.armyLevelUp();
    } else if (kills >= 2) {
      if (r.sayCd <= 0 && Math.random() < 0.45) this.sayArmy('kill', { pierce: true });
    } else if (kills === 1) {
      if (r.sayCd <= 0 && Math.random() < 0.22) this.sayArmy('kill');
    }
    return hits.length;
  },
  armyBeam(a, b) {
    const B = this.armyBeams[this.armyBeamI]; this.armyBeamI = (this.armyBeamI + 1) % BEAMS;
    const L = a.distanceTo(b);
    for (const [mesh, w] of [[B.outer, 0.12], [B.core, 0.045]]) {
      mesh.position.copy(a); mesh.lookAt(b); mesh.scale.set(w, w, L); mesh.visible = true;
    }
    B.t = BEAM_T;
  },
  updateArmyBeams(dt) {
    for (const B of this.armyBeams) {
      if (B.t <= 0) continue;
      B.t -= dt;
      if (B.t <= 0) { B.outer.visible = B.core.visible = false; continue; }
      const k = B.t / BEAM_T;
      B.outer.material.opacity = 0.55 * k; B.core.material.opacity = 0.9 * k;
      const w = 0.12 * (0.6 + 0.4 * k); B.outer.scale.x = B.outer.scale.y = w;
    }
  },
  armyLevelUp() {
    const r = this.army; if (!r) return;
    r.lvUpT = 1.6;
    r.lowHpSaid = false;
    this.fx.burst(_p.set(r.x, r.y + 1.0, r.z), 30, { color: 0xffe14a, color2: 0xffa040, speed: 2.6, up: 3, size: 0.09, life: 0.9, gravity: -1 });
    this.hud.kill(`アーミーロボ Lv UP！ → Lv${r.lv}`, true);
    this.sayArmy('levelUp', {}, true);
    this.sfx.robotOn?.();
  },
  armyPick(a) {
    const R = this.robot, avoid = R && R.state === 'on' ? R.target : -1;
    return pickArmyTarget(this.zombies, this.pos.x, this.pos.z, this.yaw, a.x, a.z, (z) => this.allyCanSee(a, z), avoid, ARMY.range);
  },
  updateArmy(dt) {
    this.updateArmyBeams(dt);
    const r = this.army; if (!r) return;
    const m = this.armyM;
    r.t += dt; r.hurtT -= dt;
    r.sayT = Math.max(0, (r.sayT || 0) - dt);
    r.sayCd = Math.max(0, (r.sayCd || 0) - dt);
    if (r.sayT <= 0) r.say = '';

    m.inner.position.set(0, 0, 0);
    if (r.state === 'idle') {
      const k = 0.5 + 0.5 * Math.sin(r.t * 4);
      m.ring.scale.setScalar(1 + k * 0.25); m.ring.material.opacity = 0.45 + 0.4 * k;
      m.beam.material.opacity = 0.18 + 0.15 * k;
      if (m.glow) m.glow.position.y = 2.1 + Math.sin(r.t * 3) * 0.08;
      m.lamp.color.setHex(Math.sin(r.t * 5) > 0 ? 0xff4630 : 0xffb090);
      m.headPivot.rotation.y = Math.sin(r.t * 0.9) * 0.5;
      m.aim.rotation.x = -0.35;
      if (this.state === 'play' && armyTouched(this.pos.x - r.x, this.pos.z - r.z, this.pos.y - r.y)) this.activateArmy();
      m.root.position.set(r.x, r.y, r.z); m.root.rotation.y = r.yaw;
      if (this.cullOn) m.root.visible = this.levelVisible(r.x, r.y, r.z);
      return;
    }
    if (r.state !== 'on') return;
    m.lamp.color.setHex(Math.floor(r.t * 3) % 2 ? 0xff4630 : 0xffc0a0);
    r.lvUpT = Math.max(0, (r.lvUpT || 0) - dt);

    // アイドリングつぶやき
    if (r.target < 0) {
      r.idleTalkT = (r.idleTalkT || 14) - dt;
      if (r.idleTalkT <= 0) {
        r.idleTalkT = 22 + Math.random() * 15;
        if (r.sayCd <= 0 && this.state === 'play' && this.wave > 0) this.sayArmy('idle');
      }
    } else {
      r.idleTalkT = 14 + Math.random() * 8;
    }

    const mv = this.allyFollow(r, ARMY, dt);
    this.allyAimFire(r, m, ARMY, dt, mv, robotStats(r.lv, ARMY).fireRate, (tz) => this.armyShoot(tz), (a) => this.armyPick(a));
    this.allyAnim(r, m, dt, -0.5);
  },
  updateArmyHud() {
    const r = this.army;
    if (!r || this.state !== 'play') { if (this.armyHudOn) { this.armyHudOn = false; this.hud.army?.(null); } return; }
    const v = _p.set(r.x, r.y + 2.05, r.z).project(this.camera);
    const e = edgeArrow(v.x, v.y, v.z > 1);
    const c = _o.set(r.x, r.y + 0.9, r.z).project(this.camera);
    r.onScreen = !(c.z > 1) && Math.abs(c.x) < 1.08 && Math.abs(c.y) < 1.08;
    this.armyHudOn = true;
    this.hud.army?.({
      mode: r.state === 'idle' ? 'idle' : 'on',
      onScreen: e.onScreen && (r.state === 'idle' || Math.hypot(r.x - this.pos.x, r.z - this.pos.z) < 30),
      x: e.x, y: e.y, ang: e.ang, hp: r.hp / (r.maxHp || ARMY.hp), lv: r.lv || 1, lvUp: r.lvUpT > 0,
      say: r.say, sayT: r.sayT,
    });
  },
};
