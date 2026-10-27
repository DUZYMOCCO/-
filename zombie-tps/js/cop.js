// v0.9.0: けいさつおじさん（ときどき ウェーブの はじめに たすけに くる なかま）
// ・ウェーブ3から やく 30%・つづけて こない ・その ウェーブ だけ（おわると てを ふって かえる）
// ・ロボと おなじ ように ついてきて、うしろ・よこを まもる（ハンドガン・ロボより すこし よわい）
// ・たおれたら さがって かえる（こわい ひょうげん なし）・ばくはつ では ダメージ なし
import * as THREE from '../vendor/three.module.min.js';
import { COP, copShouldCome, damageAlly, edgeArrow } from './rules.js?v=24';
import { makePoliceOfficer } from './models.js?v=24';

const _p = new THREE.Vector3(), _o = new THREE.Vector3();

export const CopMixin = {
  initCop() {
    this.copM = makePoliceOfficer();
    this.copM.root.visible = false; this.copM.root.scale.setScalar(COP.scale);
    this.scene.add(this.copM.root);
    this.cop = null; this.copPlan = null; this.copLast = 0; this.copVisits = 0;
  },
  // ウェーブの はじめ: くるか きめる（くる なら すこし あとで）
  planCop(r = Math.random()) {
    this.copPlan = null;
    if (this.cop) return false;
    if (!copShouldCome(this.wave, this.copLast, r)) return false;
    this.copPlan = { t: 2.4, wave: this.wave };
    this.copLast = this.wave;
    return true;
  },
  spawnCop() {
    const p = this.allyWarpSpot(COP);
    if (!p) return null;
    const m = this.copM;
    m.root.visible = true; m.gun.group.visible = true;
    for (const a of m.arms) { a.rotation.x = 0; a.rotation.z = 0; }
    m.arms[0].rotation.y = 0.32; m.arms[1].rotation.y = -0.32;
    this.cop = { x: p.x, y: p.y, z: p.z, yaw: this.yaw, vy: 0, hp: COP.hp, maxHp: COP.hp, state: 'on', t: 0, fireT: 0.8, aimT: 0, target: -1,
      stuckT: 0, hurtT: 0, phase: 0, moving: 0, onScreen: false, shots: 0, kills: 0, wave: this.wave, warpColor: 0xffe14a };
    this.copVisits++;
    this.fx.burst(_p.set(p.x, p.y + 1.0, p.z), 22, { color: 0xffe14a, color2: 0xffffff, speed: 2.2, up: 2.2, size: 0.08, life: 0.7, gravity: 2 });
    this.hud.kill('けいさつおじさんが たすけに きた！', true);
    this.sfx.robotOn?.();
    m.root.position.set(p.x, p.y, p.z); m.root.rotation.y = this.yaw;
    return this.cop;
  },
  // ウェーブ おわり: てを ふって かえる
  copLeave() {
    this.copPlan = null;
    const c = this.cop; if (!c || c.state !== 'on') return;
    c.state = 'leave'; c.t = 0;
    this.hud.kill('けいさつおじさん「またね！」');
  },
  hurtCop(d) {
    const c = this.cop; if (!c || c.state !== 'on') return;
    c.hurtT = 0.2;
    if (damageAlly(c, d, COP)) this.copDown();
  },
  // たおれた → さがって かえる（ちを ださない・くだけない）
  copDown() {
    const c = this.cop; if (!c) return;
    c.state = 'down'; c.t = 0; c.target = -1;
    for (const z of this.zombies) if (z.botT) z.botT = false;
    this.hud.kill('けいさつおじさん「いったん さがるよ！」');
  },
  endCop() {
    this.cop = null; this.copPlan = null;
    if (this.copM) this.copM.root.visible = false;
    if (this.copHudOn) { this.copHudOn = false; this.hud.cop?.(null); }
  },
  copGone() {
    const c = this.cop; if (!c) return;
    this.fx.poof(_p.set(c.x, c.y + 0.9, c.z), 1.1);
    this.endCop();
  },
  updateCop(dt) {
    if (this.copPlan && !this.cop && this.state === 'play') {
      this.copPlan.t -= dt;
      if (this.copPlan.t <= 0) {
        if (this.interT > 0 || this.copPlan.wave !== this.wave) this.copPlan = null;
        else if (!this.spawnCop()) this.copPlan.t = 0.5; // ばしょが ない → すこし まって もういちど
        else this.copPlan = null;
      }
    }
    const c = this.cop; if (!c) return;
    const m = this.copM;
    c.t += dt; c.hurtT -= dt;
    m.inner.position.set(0, 0, 0);
    if (c.state === 'on') {
      const mv = this.allyFollow(c, COP, dt);
      this.allyAimFire(c, m, COP, dt, mv, COP.fireRate, (tz) => { if (this.allyShoot(c, m, tz, COP.dmg, COP, { who: 'cop', vol: 0.8 })) c.kills++; });
      this.allyAnim(c, m, dt, -0.52);
      return;
    }
    if (c.state === 'leave') {
      // プレイヤーの ほうを むいて みぎてを ふる → ポン と かえる
      c.yaw = Math.atan2(-(this.pos.x - c.x), -(this.pos.z - c.z));
      m.aim.rotation.x = 0; m.gun.group.visible = false;
      const arm = m.arms[1]; arm.rotation.y = 0; arm.rotation.x = 1.75; arm.rotation.z = Math.sin(c.t * 10) * 0.45;
      m.arms[0].rotation.y = 0; m.arms[0].rotation.x = 0.1;
      c.moving = 0; this.allyAnim(c, m, dt, -0.52);
      if (c.t >= COP.leaveTime) this.copGone();
      return;
    }
    if (c.state === 'down') {
      // ふらふら さがる（プレイヤーから はなれる）→ ポン
      const dx = c.x - this.pos.x, dz = c.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
      this.allyStep(c, COP, dt, dx / d, dz / d, COP.speed * 0.6);
      c.yaw = Math.atan2(dx / d, dz / d); // プレイヤーの ほうを むいた まま うしろへ
      m.gun.group.visible = false; m.aim.rotation.x = -0.5;
      m.headPivot.rotation.z = Math.sin(c.t * 7) * 0.2;
      this.allyAnim(c, m, dt, -0.52);
      if (c.t >= COP.downTime) { m.headPivot.rotation.z = 0; this.copGone(); }
    }
  },
  updateCopHud() {
    const c = this.cop;
    if (!c || this.state !== 'play') { if (this.copHudOn) { this.copHudOn = false; this.hud.cop?.(null); } return; }
    const v = _p.set(c.x, c.y + 2.0, c.z).project(this.camera);
    const e = edgeArrow(v.x, v.y, v.z > 1);
    const k = _o.set(c.x, c.y + 0.9, c.z).project(this.camera);
    c.onScreen = !(k.z > 1) && Math.abs(k.x) < 1.08 && Math.abs(k.y) < 1.08;
    this.copHudOn = true;
    this.hud.cop?.({ onScreen: e.onScreen && Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < 30, x: e.x, y: e.y, hp: c.hp / c.maxHp, state: c.state });
  },
};
