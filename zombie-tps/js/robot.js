// v0.7.0: けいさつロボ（なかま）
// マップに 1たい。さわると なかまに なって、プレイヤーの ひだり うしろに ついて、
// うしろ・よこの ゾンビを ライフルで うつ。HP が 0 に なると ブロックに くだける。
// v0.18.0: いろいろ しゃべる（起動・キル・ピンチ・ウェーブ・掛け合い・ふきだし）
import * as THREE from '../vendor/three.module.min.js';
import {
  ROBOT, pickRobotSpot, robotTouched, damageRobot, robotStats, robotAddKill, groundHeight, edgeArrow,
  pickBotLine, formatBotLine,
} from './rules.js?v=40';
import { makePoliceRobot, ROBOT_CHUNKS } from './models.js?v=40';

const _o = new THREE.Vector3(), _p = new THREE.Vector3();

export const RobotMixin = {
  initRobot() {
    this.robotM = makePoliceRobot(this.fxTex?.glow);
    this.robotM.root.visible = false;
    this.scene.add(this.robotM.root);
    this.robot = null;
  },
  // ラウンドの はじめに まだ うごいていない ロボを おく
  spawnRobot(r1 = Math.random()) {
    this.endRobot();
    const s = this.gk && this.map.gk ? this.gkSpotFrom() : this.map.playerStart, sy = s.y || 0;
    this.nav.update(s.x, sy, s.z);
    let cells = this.nav.openCells(this.half - 3);
    const same = cells.filter((c) => Math.abs((c[2] || 0) - sy) < 0.5);
    if (same.length) cells = same;
    if (this.gk && this.map.gk) cells = this.gkSpotFilter(cells);
    if (!cells.length) return null;
    const [x, z, cy] = pickRobotSpot(cells, s.x, s.z, r1);
    const y = groundHeight(x, z, 0.3, (cy || 0) + 0.6, this.pCol);
    const m = this.robotM;
    m.root.visible = true; m.root.scale.setScalar(ROBOT.scale);
    m.marker.visible = true; if (m.glow) m.glow.visible = true;
    const yaw = Math.atan2(-(s.x - x), -(s.z - z));
    this.robot = {
      x, y, z, yaw, vy: 0, hp: ROBOT.hp, maxHp: ROBOT.hp, lv: 1, lvUpT: 0,
      state: 'idle', t: 0, fireT: 0.6, aimT: 0, target: -1, stuckT: 0, hurtT: 0,
      phase: 0, moving: 0, onScreen: false, shots: 0, kills: 0, warpColor: 0x7cc8ff,
      say: '', sayT: 0, sayCd: 0, lowHpSaid: false, idleTalkT: 10 + Math.random() * 8,
    };
    m.root.position.set(x, y, z); m.root.rotation.y = yaw;
    return this.robot;
  },
  endRobot() {
    this.robot = null;
    if (this.robotM) this.robotM.root.visible = false;
    this.robotHudOn && this.hud.robot?.(null); this.robotHudOn = false;
  },
  // v0.18.0: けいさつロボの はつげん
  sayRobot(ev, ctx = {}, force = false) {
    const r = this.robot; if (!r || r.state !== 'on') return;
    if (!force && (r.sayCd > 0 || r.sayT > 0)) return;
    const hasPartner = !!(this.army && this.army.state === 'on');
    const line = pickBotLine('police', ev, { ...ctx, hasPartner });
    if (!line) return;
    r.say = line;
    r.sayT = 2.4;
    r.sayCd = force ? 3.0 : 6.0;
    this.hud.kill(formatBotLine('police', line));
    this.sfx.robotSay?.('police');
  },
  activateRobot() {
    const r = this.robot; if (!r || r.state !== 'idle') return;
    r.state = 'on'; r.t = 0; r.fireT = 0.5;
    const m = this.robotM; m.marker.visible = false; if (m.glow) m.glow.visible = false;
    this.fx.burst(_p.set(r.x, r.y + 1.2, r.z), 26, { color: 0x7cc8ff, color2: 0xffffff, speed: 2.4, up: 2.4, size: 0.09, life: 0.8, gravity: 2 });
    this.hud.banner('けいさつロボが なかまに なった！', 'うしろを まもって くれるよ');
    this.sayRobot('join', {}, true);
    this.sfx.robotOn?.();
    this.pushHud(true);
  },
  hurtRobot(d) {
    const r = this.robot; if (!r || r.state !== 'on') return;
    r.hurtT = 0.2;
    if (damageRobot(r, d)) {
      this.breakRobot();
    } else {
      if (Math.random() < 0.5) this.sfx.clink?.(0.25);
      const hpRatio = r.hp / (r.maxHp || ROBOT.hp);
      if (!r.lowHpSaid && hpRatio < 0.35) {
        r.lowHpSaid = true;
        this.sayRobot('lowHp', {}, true);
      } else if (r.sayCd <= 0 && Math.random() < 0.2) {
        this.sayRobot('hurt');
      }
    }
  },
  breakRobot() {
    const r = this.robot; if (!r) return;
    const m = this.robotM;
    const hasPartner = !!(this.army && this.army.state === 'on');
    this.fx.shatter(r.x, r.y, r.z, 1, r.yaw, ROBOT_CHUNKS, { vx: 0, vy: 3, vz: 0 }, 22);
    this.fx.burst(_p.set(r.x, r.y + 1.1, r.z), 18, { color: 0xffe080, color2: 0x9ad6ff, speed: 4, up: 2.5, size: 0.06, life: 0.5, gravity: 8 });
    this.fx.poof(_p.set(r.x, r.y + 0.8, r.z), 1);
    this.sfx.robotBreak?.();
    this.hud.banner('けいさつロボが こわれちゃった…', 'ここまで まもって くれて ありがとう！');
    this.hud.kill(formatBotLine('police', pickBotLine('police', 'break', { hasPartner })));
    if (hasPartner) {
      setTimeout(() => { if (this.army && this.army.state === 'on') this.sayArmy?.('partnerDown', {}, true); }, 450);
    }
    for (const z of this.zombies) if (z.botT) z.botT = false;
    m.root.visible = false;
    this.robot = null;
    this.hud.robot?.(null); this.robotHudOn = false;
  },
  robotWarpSpot() { return this.allyWarpSpot(ROBOT); },
  teleportRobot() { return this.allyTeleport(this.robot, ROBOT, 0x7cc8ff); },
  robotCanSee(z) { return this.allyCanSee(this.robot, z); },
  robotShoot(z) {
    const r = this.robot, st = robotStats(r.lv);
    const killed = this.allyShoot(r, this.robotM, z, st.dmg, ROBOT);
    if (killed) {
      if (robotAddKill(r)) this.robotLevelUp();
      else if (r.sayCd <= 0 && Math.random() < 0.22) this.sayRobot('kill');
    }
  },
  // v0.9.0: レベルアップ！ HP ぜんかい・ひかる・「Lv UP!」
  robotLevelUp() {
    const r = this.robot; if (!r) return;
    r.lvUpT = 1.6;
    r.lowHpSaid = false;
    this.fx.burst(_p.set(r.x, r.y + 1.0, r.z), 30, { color: 0xffe14a, color2: 0x7cc8ff, speed: 2.6, up: 3, size: 0.09, life: 0.9, gravity: -1 });
    this.hud.kill(`けいさつロボ Lv UP！ → Lv${r.lv}`, true);
    this.sayRobot('levelUp', {}, true);
    this.sfx.robotOn?.();
  },
  updateRobot(dt) {
    const r = this.robot; if (!r) return;
    const m = this.robotM;
    r.t += dt; r.hurtT -= dt;
    r.sayT = Math.max(0, (r.sayT || 0) - dt);
    r.sayCd = Math.max(0, (r.sayCd || 0) - dt);
    if (r.sayT <= 0) r.say = '';

    m.inner.position.set(0, 0, 0);
    if (r.state === 'idle') {
      const k = 0.5 + 0.5 * Math.sin(r.t * 4);
      m.ring.scale.setScalar(1 + k * 0.25); m.ring.material.opacity = 0.45 + 0.4 * k;
      m.beam.material.opacity = 0.18 + 0.15 * k;
      if (m.glow) m.glow.position.y = 2.05 + Math.sin(r.t * 3) * 0.08;
      m.lamp.color.setHex(Math.sin(r.t * 5) > 0 ? 0x3aa0ff : 0x9ad6ff);
      m.headPivot.rotation.y = Math.sin(r.t * 0.9) * 0.5;
      m.aim.rotation.x = -0.35;
      if (this.state === 'play' && robotTouched(this.pos.x - r.x, this.pos.z - r.z, this.pos.y - r.y)) this.activateRobot();
      m.root.position.set(r.x, r.y, r.z); m.root.rotation.y = r.yaw;
      if (this.cullOn) m.root.visible = this.levelVisible(r.x, r.y, r.z);
      return;
    }
    if (r.state !== 'on') return;
    m.lamp.color.setHex(Math.floor(r.t * 3) % 2 ? 0x3aa0ff : 0xcfe8ff);
    r.lvUpT = Math.max(0, (r.lvUpT || 0) - dt);

    // アイドリングつぶやき
    if (r.target < 0) {
      r.idleTalkT = (r.idleTalkT || 12) - dt;
      if (r.idleTalkT <= 0) {
        r.idleTalkT = 20 + Math.random() * 15;
        if (r.sayCd <= 0 && this.state === 'play' && this.wave > 0) this.sayRobot('idle');
      }
    } else {
      r.idleTalkT = 12 + Math.random() * 8;
    }

    const mv = this.allyFollow(r, ROBOT, dt);
    this.allyAimFire(r, m, ROBOT, dt, mv, robotStats(r.lv).fireRate, (tz) => this.robotShoot(tz));
    this.allyAnim(r, m, dt, -0.44);
  },
  updateRobotHud() {
    const r = this.robot;
    if (!r || this.state !== 'play') { if (this.robotHudOn) { this.robotHudOn = false; this.hud.robot?.(null); } return; }
    const v = _p.set(r.x, r.y + 2.0, r.z).project(this.camera);
    const behind = v.z > 1;
    const e = edgeArrow(v.x, v.y, behind);
    const c = _o.set(r.x, r.y + 0.9, r.z).project(this.camera);
    r.onScreen = !(c.z > 1) && Math.abs(c.x) < 1.08 && Math.abs(c.y) < 1.08;
    this.robotHudOn = true;
    this.hud.robot?.({
      mode: r.state === 'idle' ? 'idle' : 'on',
      onScreen: e.onScreen && (r.state === 'idle' || Math.hypot(r.x - this.pos.x, r.z - this.pos.z) < 30),
      x: e.x, y: e.y, ang: e.ang, hp: r.hp / (r.maxHp || ROBOT.hp), lv: r.lv || 1, lvUp: r.lvUpT > 0,
      say: r.say, sayT: r.sayT,
    });
  },
};
