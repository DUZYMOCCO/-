// v0.16.0: ガンキック ステージの すすみかた（Game に まぜる）
// ウェーブ では なく 「へや → ドア → へや」。へやに はいると てきが でる → ぜんぶ たおすと ドアが ひらく（チェックポイント）。
// さいごの へやに ボス → たおすと ステージ クリア。ロードアウト・なかま・スーツ・パンチは いつもと おなじ。
import * as THREE from '../../vendor/three.module.min.js';
import { WEAPON_ORDER, refillReserve, TOD, bossHp } from '../rules.js?v=19';
import { gkEntered, gkSpotCells, gkPickRoomSpawn, gkDoorOpenBox } from './core.js?v=19';

const DOOR_MAT = new THREE.MeshLambertMaterial({ color: 0x59626e });
const DOOR_STRIPE = new THREE.MeshBasicMaterial({ color: 0xe0b020 });
const LAMP_RED = new THREE.MeshBasicMaterial({ color: 0xff3b30 }), LAMP_GREEN = new THREE.MeshBasicMaterial({ color: 0x3bff6a });

export const GkMixin = {
  // マップを よんだ あと: ドアの いた（うごく）を つくる
  gkBuildDoors() {
    if (this.gkDoorGroup) { this.scene.remove(this.gkDoorGroup); this.gkDoorGroup = null; }
    this.gkDoors = [];
    const gm = this.map && this.map.gk; if (!gm) return;
    const grp = this.gkDoorGroup = new THREE.Group();
    const W = gm.doorW || 4.4, H = gm.doorH || 3.8;
    for (const [i, d] of gm.doors.entries()) {
      const ax = d.axis === 'x';
      const g = new THREE.Group(); g.position.set(d.x, 0, d.z);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(ax ? W : 0.35, H - 0.05, ax ? 0.35 : W), DOOR_MAT); panel.position.y = H / 2;
      const st = new THREE.Mesh(new THREE.BoxGeometry(ax ? W : 0.4, 0.35, ax ? 0.4 : W), DOOR_STRIPE); st.position.y = 1.2;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), LAMP_RED); lamp.position.set(0, H + 0.05, 0);
      const slide = new THREE.Group(); slide.add(panel, st); g.add(slide, lamp); grp.add(g);
      const box = this.map.boxes.find((b) => b.door === i);
      this.gkDoors.push({ i, g, slide, lamp, box, open: false, t: 0, y0: box ? [box.minY, box.maxY] : [0, 9] });
    }
    this.scene.add(grp);
  },
  gkSetDoor(i, open, instant = false) {
    const d = this.gkDoors && this.gkDoors[i]; if (!d) return;
    d.open = open; d.t = instant ? 1 : 0; d.lamp.material = open ? LAMP_GREEN : LAMP_RED;
    if (d.box) { const [a, b] = open ? gkDoorOpenBox() : d.y0; d.box.minY = a; d.box.maxY = b; }
    if (instant) d.slide.position.y = open ? 3.6 : 0;
  },
  gkTickDoors(dt) {
    for (const d of this.gkDoors || []) if (d.open && d.t < 1) { d.t = Math.min(1, d.t + dt * 1.4); d.slide.position.y = 3.6 * d.t * d.t; }
  },

  // ステージを はじめる（from = チェックポイントの へや）
  startGk(stage, waves, from = 0, opt = {}) {
    this.gk = { stage, waves, room: from, phase: 'wait', from, tod: opt.tod || 'night', cpScore: opt.score || 0, waitT: 0.6, nextRoomFlash: 0, start: null };
    const gm0 = this.map.gk;
    if (gm0) this.gk.start = from > 0 ? this.gkCheckpointPos(from) : { x: this.map.playerStart.x, z: this.map.playerStart.z }; // v0.16.1: なかま・スーツは ここの へやに
    this.startGame();
    this.tod = this.gk.tod; this.todFade = null; this.applyTod(TOD[this.gk.tod] || TOD.night, true);
    const gm = this.map.gk;
    for (let i = 0; i < (this.gkDoors || []).length; i++) this.gkSetDoor(i, i < from, true);
    if (from > 0 && gm) { // チェックポイント: ドアの すぐ さき から
      const c = this.gkCheckpointPos(from);
      this.pos.set(c.x, 0, c.z); this.yaw = this.yawT = c.yaw;
      this.score = this.gk.cpScore;
    }
    this.gk.start = null;
    this.wave = from; this.interT = 1;
  },
  gkCheckpointPos(from) {
    const gm = this.map.gk, d = gm.doors[from - 1], [x0, z0, x1, z1] = gm.rooms[from].b;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const ax = d.axis === 'x';
    const px = ax ? d.x : d.x + Math.sign(cx - d.x) * 3, pz = ax ? d.z + Math.sign(cz - d.z) * 3 : d.z;
    return { x: px, z: pz, yaw: Math.atan2(-(cx - px), -(cz - pz)) };
  },
  // v0.16.1: なかまロボ・スーツを おく とき（robot.js / army.js / suit.js から）
  gkSpotFrom() { const g = this.gk; return g.start || { x: this.pos.x, z: this.pos.z }; },
  gkSpotFilter(cells) { return gkSpotCells(this.map.gk, this.gk.room, cells); },
  // へやの すすみ（updateWaves の かわり）
  gkUpdate(dt) {
    const g = this.gk, gm = this.map.gk, n = g.waves.length;
    this.gkTickDoors(dt);
    if (g.phase === 'wait') {
      this.interT = 1;
      g.waitT -= dt;
      const inRoom = gkEntered(gm, g.room, this.pos.x, this.pos.z); // v0.16.1: ゆるめ（ドアの まわりでも はいった ことに）
      if (g.waitT > 0 || !inRoom) return;
      // へやに はいった → てきが でる
      const spec = this.spec = g.waves[g.room];
      this.wave = g.room + 1; this.interT = 0;
      this.queue = spec.list.map((k) => (k === 'boss' && spec.bossLook ? 'boss@' + spec.bossLook : k));
      this.spawnT = 0.6; g.phase = 'fight';
      for (const id of WEAPON_ORDER) refillReserve(this.guns[id]);
      const name = gm && gm.rooms[g.room] ? gm.rooms[g.room].name : '';
      const last = g.room === n - 1;
      this.hud.banner(`エリア ${g.room + 1} / ${n}`, last ? `${spec.bossName}が いるぞ！` : name ? `${name}　てきが くるぞ！` : 'てきが くるぞ！');
      this.ojiPlan = null;
      if (g.room > 0) this.planUncles();
      this.sfx.wave();
      this.pushHud(true);
      return;
    }
    let alive = 0; for (const z of this.zombies) if (z.alive) alive++;
    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && alive < this.aliveCap()) {
        const k = this.queue.shift(); const s = this.pickSpawn();
        this.spawnZombie(k, s.x, s.z, this.spec.hpMul, s.y);
        this.spawnT = this.spec.spawnGap * (0.7 + Math.random() * 0.6);
        this.pushHud(true);
      }
      return;
    }
    if (alive || this.zombies.length) return;
    // へや クリア
    this.copLeave(); this.drunkLeave();
    this.score += (g.room + 1) * 200;
    this.hp = Math.min(this.maxHp, this.hp + 30);
    if (g.room >= n - 1) { this.stageClear(); return; }
    this.gkSetDoor(g.room, true);
    g.room++; g.phase = 'wait'; g.waitT = 0.8; g.cpScore = this.score;
    this.interT = 1;
    this.hud.banner('ドアが ひらいた！', 'つぎの へやへ すすもう');
    this.sfx.clear();
    this.pushHud(true);
  },
  gkPickSpawn() {
    const gm = this.map.gk, rm = gm && gm.rooms[this.gk.room];
    return gkPickRoomSpawn(rm ? rm.spawns : this.map.spawns, this.pos.x, this.pos.z, Math.random());
  },
  gkBossHp() { const s = this.spec || {}; return Math.round(bossHp(3) * (s.bossHpMul || 1)); },
  stageClear() {
    const g = this.gk;
    this.state = 'clear';
    this.hud.banner('ステージ クリア！', `${g.stage.sub}`);
    this.sfx.clear();
    this.hud.clear?.({ no: g.stage.no, score: this.score, kills: this.kills, heads: this.heads });
  },
};
