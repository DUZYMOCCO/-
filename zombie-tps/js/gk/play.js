// v0.16.0: ガンキック ステージの すすみかた（Game に まぜる）
// ウェーブ では なく 「へや → ドア → へや」。へやに はいると てきが でる → ぜんぶ たおすと ドアが ひらく（チェックポイント）。
// さいごの へやに ボス → たおすと ステージ クリア。ロードアウト・なかま・スーツ・パンチは いつもと おなじ。
// v0.17.0: セグメント（stream.js）: ドアの ばんごうは ステージ ぜんたいで かぞえる。セグメントの さかいめの ドアは
//   つぎの セグメントが できるまで ひらかない（'gate'）・とおったら しまる（うしろの セグメントを すてる）
import * as THREE from '../../vendor/three.module.min.js';
import { WEAPON_ORDER, refillReserve, TOD, bossHp, groundHeight } from '../rules.js?v=26';
import { gkRoomAt, gkEntered, gkSpotCells, gkPickRoomSpawn, gkDoorOpenBox, gkLoadBoss } from './core.js?v=26';
import { segCpSpot } from './seg.js?v=26';
import { registerLook } from '../models.js?v=26';

const DOOR_MAT = new THREE.MeshLambertMaterial({ color: 0x59626e });
const DOOR_STRIPE = new THREE.MeshBasicMaterial({ color: 0xe0b020 });
const LAMP_RED = new THREE.MeshBasicMaterial({ color: 0xff3b30 }), LAMP_GREEN = new THREE.MeshBasicMaterial({ color: 0x3bff6a });
// ドアの かたちは ぜんぶ おなじ → ジオメトリは ひとつずつ（セグメントを よんでも すてても ふえない）
const GEO = {};
function doorGeo(ax, W, H) {
  const k = `${ax}|${W}|${H}`;
  return GEO[k] || (GEO[k] = {
    panel: new THREE.BoxGeometry(ax ? W : 0.35, H - 0.05, ax ? 0.35 : W),
    stripe: new THREE.BoxGeometry(ax ? W : 0.4, 0.35, ax ? 0.4 : W),
    lamp: new THREE.BoxGeometry(0.5, 0.3, 0.5),
  });
}

export const GkMixin = {
  // マップを よんだ あと: ドアの いた（うごく）を つくる
  gkBuildDoors() {
    if (this.gkDoorGroup) { this.scene.remove(this.gkDoorGroup); this.gkDoorGroup = null; }
    this.gkDoors = [];
    const gm = this.map && this.map.gk; if (!gm) return;
    this.gkDoorGroup = new THREE.Group();
    this.scene.add(this.gkDoorGroup);
    this.gkSyncDoors();
  },
  // いまの マップの ドアに あわせる（ない ドアは けす・あたらしい ドアは しめて つくる・みえない かべを つけなおす）
  gkSyncDoors() {
    const gm = this.map.gk, grp = this.gkDoorGroup; if (!gm || !grp) return;
    const W = gm.doorW || 4.4, H = gm.doorH || 3.8;
    for (let i = 0; i < Math.max(gm.doors.length, this.gkDoors.length); i++) {
      const d = gm.doors[i]; let o = this.gkDoors[i];
      if (!d) { if (o) { grp.remove(o.g); this.gkDoors[i] = undefined; } continue; }
      if (!o) {
        const ax = d.axis === 'x', G = doorGeo(ax, W, H);
        const g = new THREE.Group(); g.position.set(d.x, d.y || 0, d.z); // v0.17.0: たかい ゆかの ドア
        const panel = new THREE.Mesh(G.panel, DOOR_MAT); panel.position.y = H / 2;
        const st = new THREE.Mesh(G.stripe, DOOR_STRIPE); st.position.y = 1.2;
        const lamp = new THREE.Mesh(G.lamp, LAMP_RED); lamp.position.set(0, H + 0.05, 0);
        const slide = new THREE.Group(); slide.add(panel, st); g.add(slide, lamp); grp.add(g);
        o = this.gkDoors[i] = { i, g, slide, lamp, box: null, open: false, t: 0 };
      }
      // みえない かべ（セグメントが かわると べつの はこに なる ことが ある）
      const box = this.map.boxes.find((b) => b.door === i) || null;
      if (box && !box._y0) box._y0 = [box.minY, box.maxY];
      o.box = box;
      if (box) { const [a, b] = o.open ? gkDoorOpenBox() : box._y0; box.minY = a; box.maxY = b; }
    }
  },
  gkSetDoor(i, open, instant = false) {
    const d = this.gkDoors && this.gkDoors[i]; if (!d) return;
    d.open = open; d.lamp.material = open ? LAMP_GREEN : LAMP_RED;
    if (instant) d.t = open ? 1 : 0;
    if (d.box) { const [a, b] = open ? gkDoorOpenBox() : d.box._y0; d.box.minY = a; d.box.maxY = b; }
    if (instant) d.slide.position.y = open ? 3.6 : 0;
  },
  // ひらく（ゆっくり あがる）・しまる（すこし はやく おりる）
  gkTickDoors(dt) {
    for (const d of this.gkDoors || []) {
      if (!d || d.t === (d.open ? 1 : 0)) continue;
      d.t = d.open ? Math.min(1, d.t + dt * 1.4) : Math.max(0, d.t - dt * 2.2);
      d.slide.position.y = 3.6 * d.t * d.t;
    }
  },

  // ステージを はじめる（from = チェックポイントの へや）
  startGk(stage, waves, from = 0, opt = {}) {
    this.gk = { stage, waves, room: from, phase: 'wait', from, tod: opt.tod || 'night', cpScore: opt.score || 0, waitT: 0.6, nextRoomFlash: 0, start: null };
    const gm = this.map.gk;
    let cp = null;
    if (from > 0 && gm) { // チェックポイント: ドアの すぐ さき から
      cp = this.gkCheckpointPos(from);
      cp.y = groundHeight(cp.x, cp.z, 0.35, cp.y + 3.4, this.pCol); // v0.17.0: さかの とちゅう でも あしもとの たかさ
      if (this.gs) { this.gs.start = cp; this.map.playerStart = cp; } // v0.17.0: なかま・スーツも ここの ちかくに
    }
    if (gm) this.gk.start = cp ? { x: cp.x, z: cp.z, y: cp.y || 0 } : { x: this.map.playerStart.x, z: this.map.playerStart.z, y: this.map.playerStart.y || 0 }; // v0.16.1: なかま・スーツは ここの へやに
    this.startGame();
    this.tod = this.gk.tod; this.todFade = null; this.applyTod(TOD[this.gk.tod] || TOD.night, true);
    // うしろの ドアは あける（v0.17.0: うしろの へやが ない ＝ まえの セグメント → しめた まま）
    for (let i = 0; i < (this.gkDoors || []).length; i++) this.gkSetDoor(i, i < from && !!(gm.rooms[i] && gm.rooms[i + 1]), true);
    if (cp) {
      this.pos.set(cp.x, cp.y || 0, cp.z); this.yaw = this.yawT = cp.yaw;
      this.score = this.gk.cpScore;
    }
    this.gk.start = null;
    this.wave = from; this.interT = 1;
  },
  gkCheckpointPos(from) { const gm = this.map.gk; return segCpSpot(gm.doors, gm.rooms, from); },
  // v0.16.1: なかまロボ・スーツを おく とき（robot.js / army.js / suit.js から）
  gkSpotFrom() { const g = this.gk; return g.start || { x: this.pos.x, z: this.pos.z, y: this.pos.y }; },
  gkSpotFilter(cells) { return gkSpotCells(this.map.gk, this.gk.room, cells); },
  // へやの すすみ（updateWaves の かわり）
  gkUpdate(dt) {
    const g = this.gk, n = g.waves.length;
    this.gkTickDoors(dt);
    for (const gi of this.gkGims || []) gi.tick(dt); // v0.17.0: ギミック（あめ・でんしゃ）
    if (this.gs) this.gkStreamTick(dt); // v0.17.0: セグメントを よむ・すてる
    const gm = this.map.gk;
    if (g.phase === 'gate') { // へやは きれい・つぎの セグメントを つくって いる
      this.interT = 1;
      if (this.gkSegReady(g.room + 1)) this.gkOpenNext(); else this.gkWantNext();
      return;
    }
    if (g.phase === 'wait') {
      this.interT = 1;
      g.waitT -= dt;
      const inRoom = gkEntered(gm, g.room, this.pos.x, this.pos.z); // v0.16.1: ゆるめ（ドアの まわりでも はいった ことに）
      if (g.waitT > 0 || !inRoom) return;
      if (!this.gkCrossed(g.room)) return; // v0.17.0: セグメントの さかいめ → ドアから はなれたら しめる
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
    let alive = this.gkPending || 0; for (const z of this.zombies) if (z.alive) alive++; // gkPending: ドアの むこうで まっている てき
    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && alive < this.aliveCap()) {
        const via = this.gkSpawnVia ? this.gkSpawnVia(this.queue[0]) : false; // v0.17.0: ドアから でる（ステージ18）
        if (via === 'wait') { this.spawnT = 0.25; return; }
        const k = this.queue.shift();
        if (!via) { const s = this.pickSpawn(); this.spawnZombie(k, s.x, s.z, this.spec.hpMul, s.y); }
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
    if (!this.gkSegReady(g.room + 1)) { g.phase = 'gate'; this.interT = 1; this.gkWantNext(); this.pushHud(true); return; }
    this.gkOpenNext();
  },
  gkOpenNext() {
    const g = this.gk;
    this.gkSetDoor(g.room, true);
    g.room++; g.phase = 'wait'; g.waitT = 0.8; g.cpScore = this.score;
    this.interT = 1;
    this.hud.banner('ドアが ひらいた！', 'つぎの へやへ すすもう');
    this.sfx.clear();
    this.pushHud(true);
  },
  // v0.17.0: ステージの ギミック（js/gk/gim/<id>.js の create(game) → { tick, remap, dispose }）
  gkGimStart(mods) { this.gkGimEnd(); this.gkGims = mods.map((m) => m.create(this)); },
  gkGimEnd() { for (const gi of this.gkGims || []) gi.dispose(); this.gkGims = null; this.gkBossRt = null; },
  // v0.17.0: ボスの わざ（bosses/<id>.js の BOSS と rt.js）。みためを とうろく → でたら rt が うごかす
  gkBossStart(boss) {
    if (!boss) return;
    registerLook(boss.def.look.id || boss.def.id, boss.def.look);
    for (const [id, lk] of Object.entries(boss.def.extraLooks || {})) registerLook(id, lk); // にせもの など
    this.gkBossRt = boss.rt.create(this, boss.def);
    (this.gkGims || (this.gkGims = [])).push(this.gkBossRt);
  },
  // v0.17.0: デバッグ: __ztps.game.gkDebugBoss('hydra') → いまの ガンキック ステージの プレイヤーの まえに その ボスを だす
  async gkDebugBoss(id, d = 9) {
    if (!this.gk) return 'ガンキックの ステージで つかってね';
    const boss = await gkLoadBoss(id); if (!boss) return 'ない: ' + id;
    for (const gi of this.gkGims || []) if (gi === this.gkBossRt) gi.dispose();
    this.gkGims = (this.gkGims || []).filter((gi) => gi !== this.gkBossRt);
    this.gkBossStart(boss);
    if (this.spec) this.spec.bossName = id;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const z = this.spawnZombie('boss@' + (boss.def.look.id || id), this.pos.x + fx * d, this.pos.z + fz * d, 1, this.pFloor ?? this.pos.y);
    return { id, hp: z.hp, ai: !!z.ai };
  },
  // v0.17.0: セグメントで ない ステージ（いちまいの マップ）でも つかえる ように
  gkSegReady(room) { return !this.gs || this.gsReady(room); },
  gkCrossed(room) { return !this.gs || this.gsCrossed(room); },
  gkWantNext() { if (this.gs) this.gsWantNext(); },
  gkPickSpawn() {
    const gm = this.map.gk, rm = gm && gm.rooms[this.gk.room];
    return gkPickRoomSpawn(rm ? rm.spawns : this.map.spawns, this.pos.x, this.pos.z, Math.random());
  },
  gkBossHp() { const s = this.spec || {}; return Math.round(bossHp(3) * (s.bossHpMul || 1)); },
  stageClear() {
    const g = this.gk;
    this.state = 'clear';
    if (g.stage.no === 15) { // v0.17.0: さいごの ボスを たおした → よあけの ひかり
      this.applyTod(TOD.day, true); this.tod = 'day';
      this.fx.burst(this.tmp.c.set(this.pos.x, this.pos.y + 3, this.pos.z), 40, { color: 0xfff0b0, color2: 0xffffff, speed: 6, up: 4, size: 0.12, life: 1.2, gravity: 1 });
      this.hud.banner('ありがとう！', 'せかいに あさが きた');
    } else this.hud.banner('ステージ クリア！', `${g.stage.sub}`);
    this.sfx.clear();
    this.hud.clear?.({ no: g.stage.no, score: this.score, kills: this.kills, heads: this.heads });
  },
};
