// ゾンビストライク — 3D の ほんたい（シーン・プレイヤー・ゾンビ・ウェーブ）
import * as THREE from '../vendor/three.module.min.js';
import {
  WEAPONS, WEAPON_ORDER, DEFAULT_WEAPON, ZOMBIES, ATTACK_RANGE, PLAYER_MAX_HP,
  createGun, updateGun, tryFire, startReload, cancelReload, damageAt, currentSpread,
  waveSpec, waveQueue, killScore, castShot, aabbNormal, collideCircle, groundHeight, cameraDistance,
  buildGrid, updateFlow, flowDir, gridLineClear,
} from './rules.js?v=1';
import { buildMap, playerColliders, zombieColliders, shotColliders, HALF } from './map.js?v=1';
import { buildTextures, fxTextures } from './textures.js?v=1';
import { buildWorld } from './world.js?v=1';
import { makePlayer, makeWeapons, makeZombie, FLASH_MAT } from './models.js?v=1';
import { FX } from './fx.js?v=1';

const v3 = () => new THREE.Vector3();
const lerp = (a, b, t) => a + (b - a) * t;
const PLAYER_R = 0.35;

export class Game {
  constructor(canvas, hud, sfx, settings) {
    this.canvas = canvas; this.hud = hud; this.sfx = sfx; this.settings = settings;
    this.quality = settings.quality === 'low' ? 0 : settings.quality === 'high' ? 2 : 1;
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality >= 1, powerPreference: 'high-performance' });
    this.shadows = this.quality >= 1;
    renderer.shadowMap.enabled = this.shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.quality === 2 ? 2 : this.quality === 1 ? 1.5 : 1);
    renderer.setPixelRatio(this.pixelRatio);

    const scene = this.scene = new THREE.Scene();
    const tex = this.fxTex = fxTextures();
    scene.background = tex.sky;
    scene.fog = new THREE.Fog(0xe9d6b4, 22, 70);
    this.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.08, 160);

    this.hemi = new THREE.HemisphereLight(0xd4e6ff, 0x6b5a3c, 1.5); scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
    this.sunOff = new THREE.Vector3(14, 26, 9);
    sun.castShadow = this.shadows;
    if (this.shadows) {
      sun.shadow.mapSize.set(1024, 1024);
      const c = sun.shadow.camera; c.left = -20; c.right = 20; c.top = 20; c.bottom = -20; c.near = 1; c.far = 70;
      sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    }
    scene.add(sun); scene.add(sun.target);

    this.map = buildMap();
    this.T = buildTextures();
    buildWorld(scene, this.map, this.T, { shadows: this.shadows });
    this.pCol = playerColliders(this.map); this.zCol = zombieColliders(this.map); this.sCol = shotColliders(this.map);
    this.camCol = this.sCol.filter((b) => b.maxY > 0.6);
    this.grid = buildGrid(this.zCol, HALF + 4, 1, 0.4);

    // プレイヤー
    this.p = makePlayer(); scene.add(this.p.root);
    this.weapons = makeWeapons();
    for (const id of WEAPON_ORDER) { this.weapons[id].group.visible = false; this.p.holder.add(this.weapons[id].group); }
    this.fx = new FX(scene, tex, { groundAt: (x, z, y) => groundHeight(x, z, 0.05, y, this.pCol) });

    this.zombies = []; this.pool = { walker: [], runner: [], brute: [] };
    this.tmp = { a: v3(), b: v3(), c: v3(), d: v3(), e: v3() };
    this.stats = { frames: 0, cpu: 0, gpuish: 0, last: performance.now(), fps: 0, cpuAvg: 0, frameAvg: 0 };
    this.adapt = { t: 0, frames: 0, sum: 0, level: 0 };
    this.state = 'title';
    this.resetRun();
    this.setupTitle();
  }

  // ---- じょうたい ----
  resetRun() {
    const s = this.map.playerStart;
    this.pos = new THREE.Vector3(s.x, 0, s.z); this.vy = 0; this.onGround = true;
    this.yaw = s.yaw; this.pitch = -0.05; this.recoilP = 0; this.recoilY = 0;
    this.hp = PLAYER_MAX_HP; this.hurtT = 0; this.regenDelay = 0;
    this.guns = {}; for (const id of WEAPON_ORDER) this.guns[id] = createGun(id);
    this.cur = DEFAULT_WEAPON; this.swapT = 0; this.showWeapon(this.cur);
    this.wave = 0; this.queue = []; this.spawnT = 0; this.interT = 2.5; this.score = 0; this.kills = 0; this.heads = 0;
    this.kick = 0; this.shake = 0; this.walkPhase = 0; this.moveAmt = 0; this.aimAmt = 0; this.reloadWasOn = false; this.magDropped = false;
    this.flowT = 0; this.groanT = 2; this.lastTarget = -1; this.pumpT = 0; this.landT = 0;
    for (const z of this.zombies) this.releaseZombie(z);
    this.zombies.length = 0;
  }

  setupTitle() {
    this.state = 'title'; this.titleT = 0;
    this.resetRun();
    // かざりの ゾンビ（こうげき しない）
    for (const [k, x, z] of [['walker', -3, -7], ['runner', 3.5, -9], ['walker', -6, -12], ['brute', 1, -14]]) {
      const zz = this.spawnZombie(k, x, z, 1); zz.demo = true; zz.yaw = Math.random() * 6;
    }
  }

  startGame() {
    for (const z of this.zombies) this.releaseZombie(z);
    this.zombies.length = 0;
    this.resetRun();
    this.state = 'play';
    this.hud.show('play');
    this.pushHud(true);
  }

  showWeapon(id) {
    for (const k of WEAPON_ORDER) this.weapons[k].group.visible = k === id;
    const w = this.weapons[id];
    w.mag.visible = true; w.mag.position.copy(w.magRest);
  }

  switchWeapon(id) {
    if (id === this.cur || !this.guns[id]) return;
    cancelReload(this.guns[this.cur]);
    this.cur = id; this.swapT = 0.32; this.showWeapon(id);
    this.sfx.swap();
    this.pushHud(true);
  }

  // ---- ゾンビ ----
  spawnZombie(kind, x, z, hpMul = 1) {
    const def = ZOMBIES[kind];
    let model = this.pool[kind].pop();
    if (!model) model = makeZombie(kind);
    model.root.visible = true; model.inner.rotation.set(0, 0, 0); model.inner.position.set(0, 0, 0); model.root.scale.setScalar(def.scale);
    for (const m of model.meshes) m.material = m.userData.mat;
    this.scene.add(model.root);
    const zz = {
      kind, model, x, z, y: 0, yaw: 0, hp: Math.round(def.hp * hpMul), maxHp: Math.round(def.hp * hpMul), alive: true, state: 'walk',
      t: 0, atkT: 0.6, stagger: 0, flash: 0, phase: Math.random() * 6, scale: def.scale, speed: def.speed * (0.9 + Math.random() * 0.2),
      deadT: 0, demo: false, stuck: 0, lastX: x, lastZ: z,
    };
    model.root.position.set(x, 0, z);
    this.zombies.push(zz);
    return zz;
  }
  releaseZombie(z) {
    this.scene.remove(z.model.root);
    this.pool[z.kind].push(z.model);
  }

  pickSpawn() {
    const sp = this.map.spawns.map((s) => ({ s, d: Math.hypot(s.x - this.pos.x, s.z - this.pos.z) })).filter((o) => o.d > 14);
    sp.sort((a, b) => b.d - a.d);
    const list = sp.length ? sp.slice(0, 3) : this.map.spawns.map((s) => ({ s }));
    const o = list[Math.floor(Math.random() * list.length)].s;
    return { x: o.x + (Math.random() - 0.5) * 2.5, z: o.z + (Math.random() - 0.5) * 2.5 };
  }

  // ---- ウェーブ ----
  updateWaves(dt) {
    if (this.interT > 0) {
      this.interT -= dt;
      if (this.interT <= 0) {
        this.wave++;
        const spec = this.spec = waveSpec(this.wave);
        this.queue = waveQueue(spec);
        this.spawnT = 0.5;
        for (const id of WEAPON_ORDER) { const g = this.guns[id]; const w = WEAPONS[id]; if (w.reserve !== Infinity) g.reserve = Math.max(g.reserve, w.reserve); }
        this.hud.banner(`ウェーブ ${this.wave}`, this.wave === 1 ? 'ゾンビが くるぞ！' : `ゾンビ ${spec.total}たい`);
        this.sfx.wave();
        this.pushHud(true);
      }
      return;
    }
    const alive = this.zombies.filter((z) => z.alive).length;
    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && alive < this.spec.maxAlive) {
        const k = this.queue.shift(); const s = this.pickSpawn();
        this.spawnZombie(k, s.x, s.z, this.spec.hpMul);
        this.spawnT = this.spec.spawnGap * (0.7 + Math.random() * 0.6);
        this.pushHud(true);
      }
    } else if (alive === 0 && !this.zombies.length) {
      this.interT = 4.5;
      this.hud.banner('ウェーブ クリア！', `+${this.wave * 200} ボーナス`);
      this.score += this.wave * 200;
      this.hp = Math.min(PLAYER_MAX_HP, this.hp + 30);
      this.sfx.clear();
      this.pushHud(true);
    }
  }

  remaining() { return this.queue.length + this.zombies.filter((z) => z.alive).length; }

  updateZombies(dt) {
    this.flowT -= dt;
    if (this.flowT <= 0) { updateFlow(this.grid, this.pos.x, this.pos.z); this.flowT = 0.25; }
    const zs = this.zombies;
    let nearest = Infinity;
    for (let i = zs.length - 1; i >= 0; i--) {
      const z = zs[i], m = z.model, def = ZOMBIES[z.kind];
      z.flash -= dt;
      if (z.flash <= 0 && z.flashOn) { for (const mm of m.meshes) mm.material = mm.userData.mat; z.flashOn = false; }
      if (!z.alive) {
        z.deadT += dt;
        const t = z.deadT;
        m.inner.rotation.x = Math.min(1, t / 0.4) ** 2 * (Math.PI / 2) * 0.92;
        if (t > 0.55 && !z.poofed) { z.poofed = true; this.fx.poof(this.tmp.a.set(z.x, 0.4, z.z), z.scale); this.sfx.poof(); }
        if (t > 0.55) m.root.scale.setScalar(z.scale * Math.max(0.01, 1 - (t - 0.55) / 0.18));
        if (t > 0.75) { this.releaseZombie(z); zs.splice(i, 1); }
        continue;
      }
      const dx = this.pos.x - z.x, dz = this.pos.z - z.z, dist = Math.hypot(dx, dz);
      if (dist < nearest) nearest = dist;
      let mvx = 0, mvz = 0, moving = false;
      if (z.demo) { // タイトル: うろうろ
        z.t += dt; z.yaw += Math.sin(z.t * 0.5 + z.phase) * dt * 0.6;
        mvx = -Math.sin(z.yaw); mvz = -Math.cos(z.yaw); moving = true;
        if (Math.hypot(z.x - 0, z.z + 10) > 7) { z.yaw = Math.atan2(z.x - 0, z.z + 10); }
      } else if (z.stagger > 0) {
        z.stagger -= dt;
      } else if (dist < ATTACK_RANGE && Math.abs(this.pos.y) < 1.4) {
        z.state = 'attack';
        z.atkT -= dt;
        z.yaw = Math.atan2(-dx, -dz);
        if (z.atkT <= 0 && this.state === 'play') {
          z.atkT = def.atkRate;
          this.damagePlayer(def.dmg, z);
        }
      } else {
        z.state = 'walk'; z.atkT = Math.min(z.atkT, 0.45);
        let dir = null;
        if (dist < 14 && gridLineClear(this.grid, z.x, z.z, this.pos.x, this.pos.z)) dir = { x: dx / dist, z: dz / dist };
        else dir = flowDir(this.grid, z.x, z.z) || { x: dx / (dist || 1), z: dz / (dist || 1) };
        mvx = dir.x; mvz = dir.z; moving = true;
        const want = Math.atan2(-mvx, -mvz);
        let dy = want - z.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        z.yaw += dy * Math.min(1, dt * 8);
      }
      if (moving) {
        // なかまと くっつかない
        for (const o of zs) {
          if (o === z || !o.alive) continue;
          const ox = z.x - o.x, oz = z.z - o.z, d2 = ox * ox + oz * oz;
          if (d2 < 0.64 && d2 > 1e-6) { const d = Math.sqrt(d2); mvx += ox / d * (0.8 - d) * 1.5; mvz += oz / d * (0.8 - d) * 1.5; }
        }
        const sp = z.demo ? 0.8 : z.speed;
        let nx = z.x + mvx * sp * dt, nz = z.z + mvz * sp * dt;
        const r = collideCircle(nx, nz, 0.3 * z.scale, 0, this.zCol);
        nx = r.x; nz = r.z;
        // プレイヤーに めりこまない
        const px = nx - this.pos.x, pz = nz - this.pos.z, pd = Math.hypot(px, pz), minD = 0.65;
        if (pd < minD && pd > 1e-4 && !z.demo) { nx = this.pos.x + px / pd * minD; nz = this.pos.z + pz / pd * minD; }
        z.x = nx; z.z = nz;
        z.phase += dt * sp * (z.kind === 'runner' ? 3.2 : 4.2);
      }
      // アニメ
      const swing = moving ? Math.sin(z.phase) : 0;
      const amp = z.kind === 'runner' ? 0.95 : 0.55;
      m.legs[0].rotation.x = swing * amp; m.legs[1].rotation.x = -swing * amp;
      m.body.rotation.x = z.kind === 'runner' && moving ? -0.32 : -0.06;
      const atk = z.state === 'attack' ? Math.sin(performance.now() * 0.012) * 0.6 : 0;
      m.arms[0].rotation.x = 0.05 + Math.sin(z.phase * 0.5) * 0.08 + atk;
      m.arms[1].rotation.x = 0.05 - Math.sin(z.phase * 0.5) * 0.08 - atk;
      m.head.rotation.z = Math.sin(z.phase * 0.5 + 1) * 0.08;
      m.root.position.set(z.x, Math.abs(swing) * 0.04, z.z);
      m.root.rotation.y = z.yaw;
    }
    // うめきごえ
    this.groanT -= dt;
    if (this.groanT <= 0 && nearest < 30 && this.state === 'play') {
      this.sfx.groan(0.22 * Math.max(0, 1 - nearest / 30));
      this.groanT = 1.5 + Math.random() * 2.5;
    }
  }

  damagePlayer(d, z) {
    this.hp = Math.max(0, this.hp - d);
    this.regenDelay = 5; this.shake = Math.max(this.shake, 0.35);
    this.sfx.hurt();
    this.hud.hurt(Math.atan2(z.x - this.pos.x, z.z - this.pos.z) - Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw)));
    if (this.hp <= 0) this.gameOver();
    this.pushHud(true);
  }

  gameOver() {
    this.state = 'over';
    this.hud.over({ wave: this.wave, score: this.score, kills: this.kills, heads: this.heads });
  }

  // ---- うつ ----
  fireShot() {
    const id = this.cur, w = WEAPONS[id], gun = this.guns[id];
    const cam = this.camera, A = this.tmp;
    const d = A.a.set(0, 0, -1).applyQuaternion(this.camBaseQ).normalize();
    // カメラと プレイヤーの あいだの かべに あたらない ように、プレイヤーの よこから うつ
    const o = A.b.copy(cam.position).addScaledVector(d, Math.max(0, A.c.copy(this.shoulder).sub(cam.position).dot(d)));
    const spread = currentSpread(w, { moving: this.moveAmt > 0.2, aiming: this.aimAmt > 0.5, airborne: !this.onGround, bloom: gun.bloom });
    const wObj = this.weapons[id];
    const muzzle = wObj.muzzle.getWorldPosition(A.e);
    const right = A.d.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const shotZ = this.zombies;
    const hitZ = new Map();
    let anyHit = false, anyHead = false;
    for (let pI = 0; pI < w.pellets; pI++) {
      // ばらつき（コーン）
      const r = Math.sqrt(Math.random()) * spread, a = Math.random() * Math.PI * 2;
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camBaseQ), rt = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camBaseQ);
      const dir = d.clone().addScaledVector(rt, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      const hit = castShot(o.x, o.y, o.z, dir.x, dir.y, dir.z, shotZ, this.sCol, w.range);
      const hp = new THREE.Vector3(hit.x, hit.y, hit.z);
      if (pI < 3) this.fx.tracer(muzzle, hp);
      if (hit.kind === 'zombie') {
        const z = shotZ[hit.index];
        const dist = hit.t;
        const dmg = damageAt(w, dist, hit.head);
        const h = hitZ.get(z) || { dmg: 0, head: false, pos: hp, dir };
        h.dmg += dmg; h.head = h.head || hit.head; hitZ.set(z, h);
        this.fx.greenHit(hp, dir, hit.head);
        anyHit = true; anyHead = anyHead || hit.head;
      } else if (hit.kind === 'wall') {
        const n = aabbNormal(hit.x, hit.y, hit.z, this.sCol[hit.index]);
        const nv = new THREE.Vector3(n.x, n.y, n.z);
        this.fx.dust(hp, nv); this.fx.hole(hp, nv);
      } else if (hit.kind === 'ground') {
        const nv = new THREE.Vector3(0, 1, 0);
        this.fx.dust(hp, nv); this.fx.hole(hp, nv);
      }
    }
    for (const [z, h] of hitZ) this.hitZombie(z, h.dmg, h.head, h.pos, h.dir);
    if (anyHit) { this.hud.hitmarker(anyHead); this.sfx.hit(anyHead); }
    // みため
    this.fx.muzzle(wObj.muzzle, id === 'shotgun' ? 1.5 : id === 'pistol' ? 0.8 : 1.15);
    this.fx.casing(wObj.eject, id, right);
    if (id === 'shotgun') this.pumpT = 0.55;
    this.kick = 1;
    this.shake = Math.min(0.45, this.shake + w.shake * 0.9);
    const aimMul = this.aimAmt > 0.5 ? 0.6 : 1;
    const kickP = w.recoilPitch * aimMul * (0.8 + Math.random() * 0.4);
    this.recoilP += kickP * 0.75; this.pitch = Math.min(1.05, this.pitch + kickP * 0.25); // 25% は のこる
    this.recoilY += (Math.random() - 0.5) * 2 * w.recoilYaw * aimMul;
    this.sfx.shot(id);
  }

  hitZombie(z, dmg, head, pos, dir) {
    if (!z.alive) return;
    z.hp -= dmg;
    z.flash = 0.045; z.flashOn = true;
    for (const mm of z.model.meshes) mm.material = FLASH_MAT;
    // ちょっと ひるむ・のけぞる
    const kb = z.kind === 'brute' ? 0.05 : 0.14;
    const r = collideCircle(z.x + dir.x * kb, z.z + dir.z * kb, 0.3, 0, this.zCol); z.x = r.x; z.z = r.z;
    z.stagger = Math.max(z.stagger, head ? 0.28 : 0.12) * (z.kind === 'brute' ? 0.4 : 1);
    if (Math.random() < 0.7) this.fx.splat(this.tmp.c.set(z.x + dir.x * 0.6 + (Math.random() - 0.5) * 0.7, 0.02, z.z + dir.z * 0.6 + (Math.random() - 0.5) * 0.7), undefined, 0.9 + Math.random() * 0.4);
    if (z.hp <= 0) {
      z.alive = false; z.deadT = 0; z.poofed = false;
      this.kills++; if (head) this.heads++;
      const sc = killScore(z.kind, head); this.score += sc;
      this.fx.splat(this.tmp.c.set(z.x, 0.02, z.z), undefined, 1.3 * z.scale);
      this.fx.greenHit(pos, dir, true);
      this.hud.kill(head ? `ヘッドショット！ +${sc}` : `+${sc}`, head);
      this.pushHud(true);
    }
  }

  // ---- まいフレーム ----
  update(dt, inp) {
    const playing = this.state === 'play';
    if (this.state === 'title') { this.titleT += dt; this.updateZombies(dt); this.updateTitleCam(dt); this.fx.update(dt); return; }
    if (this.state === 'pause') return;
    if (this.state === 'over') { this.updateZombies(dt); this.fx.update(dt); this.updateCamera(dt, false); return; }

    const gun = this.guns[this.cur], w = WEAPONS[this.cur];
    // イベント
    for (const ev of inp.events) {
      if (ev === 'reload') { if (startReload(gun)) this.onReloadStart(); }
      else if (ev === 'jump') { if (this.onGround) { this.vy = 7.2; this.onGround = false; } }
      else if (ev.startsWith('w:')) this.switchWeapon(ev.slice(2));
      else if (ev === 'next' || ev === 'prev' || ev === 'swap') {
        const i = WEAPON_ORDER.indexOf(this.cur), n = WEAPON_ORDER.length;
        this.switchWeapon(WEAPON_ORDER[(i + (ev === 'prev' ? n - 1 : 1)) % n]);
      } else if (ev === 'pause') { this.hud.pause(); return; }
    }
    // ねらい
    this.aimAmt = lerp(this.aimAmt, inp.aim ? 1 : 0, Math.min(1, dt * 12));
    const target = this.crosshairTarget();
    const slow = (target >= 0 ? 0.65 : 1) * (1 - this.aimAmt * 0.45);
    this.yaw -= inp.lx * slow; this.pitch -= inp.ly * slow;
    this.pitch = Math.max(-1.0, Math.min(1.05, this.pitch));
    // はんどうの もどり（80% もどる）
    const rec = Math.min(1, dt * 7);
    this.recoilP -= this.recoilP * rec;
    // いどう
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const speed = lerp(4.7, 2.5, this.aimAmt) * (gun.reloading > 0 ? 0.85 : 1);
    let vx = (fx * inp.my + rx * inp.mx) * speed, vz = (fz * inp.my + rz * inp.mx) * speed;
    this.moveAmt = lerp(this.moveAmt, Math.min(1, Math.hypot(inp.mx, inp.my)), Math.min(1, dt * 10));
    let nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
    const r = collideCircle(nx, nz, PLAYER_R, this.pos.y, this.pCol);
    nx = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, r.x)); nz = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, r.z));
    this.pos.x = nx; this.pos.z = nz;
    this.vy -= 20 * dt; this.pos.y += this.vy * dt;
    const gh = groundHeight(this.pos.x, this.pos.z, PLAYER_R, this.pos.y + 0.001, this.pCol);
    if (this.pos.y <= gh) { if (!this.onGround && this.vy < -4) this.landT = 0.15; this.pos.y = gh; this.vy = 0; this.onGround = true; }
    else if (this.pos.y > gh + 0.05) this.onGround = false;
    this.walkPhase += dt * Math.hypot(vx, vz) * 2.2;

    // ぶき
    if (this.swapT > 0) this.swapT -= dt;
    const evr = updateGun(gun, dt);
    if (evr === 'reloaded') { this.pushHud(true); }
    for (const id of WEAPON_ORDER) if (id !== this.cur) updateGun(this.guns[id], dt);
    let held = inp.fire;
    if (this.settings.autoFire && target >= 0) {
      held = true;
      if (!w.auto && gun.cooldown <= 0) gun.lastTrigger = false;
    }
    if (this.swapT <= 0) {
      const res = tryFire(gun, held);
      if (res === 'fire') { this.fireShot(); this.pushHud(); }
      else if (res === 'reload') this.onReloadStart();
      else if (res === 'empty') this.sfx.empty();
    }
    if (gun.ammo === 0 && gun.reloading === 0 && gun.reserve > 0 && !held) { if (startReload(gun)) this.onReloadStart(); }

    // HP かいふく
    this.regenDelay -= dt;
    if (this.regenDelay <= 0 && this.hp < PLAYER_MAX_HP) { this.hp = Math.min(PLAYER_MAX_HP, this.hp + dt * 8); this.pushHud(); }

    this.updateWaves(dt);
    this.updateZombies(dt);
    this.updatePlayerAnim(dt);
    this.updateCamera(dt, true);
    this.fx.update(dt);
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) { this.pushHud(); this.hudT = 0.1; }
  }

  onReloadStart() {
    this.magDropped = false;
    this.sfx.reload(this.cur, WEAPONS[this.cur].reload);
    this.pushHud(true);
  }

  crosshairTarget() {
    if (!this.camBaseQ) return -1;
    const A = this.tmp, d = A.a.set(0, 0, -1).applyQuaternion(this.camBaseQ);
    const o = A.b.copy(this.camera.position);
    const hit = castShot(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, this.sCol, WEAPONS[this.cur].range);
    this.hud.crossTarget(hit.kind === 'zombie');
    return hit.kind === 'zombie' ? hit.index : -1;
  }

  updatePlayerAnim(dt) {
    const P = this.p, gun = this.guns[this.cur], w = WEAPONS[this.cur], wo = this.weapons[this.cur];
    P.root.position.copy(this.pos);
    P.root.rotation.y = this.yaw;
    const sw = Math.sin(this.walkPhase) * this.moveAmt;
    P.legs[0].rotation.x = sw * 0.75; P.legs[1].rotation.x = -sw * 0.75;
    if (!this.onGround) { P.legs[0].rotation.x = 0.5; P.legs[1].rotation.x = -0.3; }
    P.torso.position.y = 0.74 + Math.abs(Math.sin(this.walkPhase)) * 0.04 * this.moveAmt - this.landT * 0.4;
    this.landT = Math.max(0, this.landT - dt);
    this.kick = Math.max(0, this.kick - dt * 14);
    const k = this.kick;
    P.aim.rotation.x = this.pitch + k * 0.05;
    P.headPivot.rotation.x = this.pitch * 0.4;
    const H = P.holder;
    H.position.set(0.3, 0.02, -0.34 + k * 0.08);
    H.rotation.set(0, 0, 0);
    P.armL.rotation.set(0, -0.72, 0); P.armR.rotation.set(0, 0.05, 0);
    P.armL.position.set(-0.33, 0, 0);
    // もちかえ
    if (this.swapT > 0) { const s = Math.sin((this.swapT / 0.32) * Math.PI); H.position.y -= s * 0.35; H.rotation.x = -s * 0.8; }
    // リロード
    wo.mag.visible = true; wo.mag.position.copy(wo.magRest);
    if (gun.reloading > 0) {
      const t = 1 - gun.reloading / w.reload;
      const bell = Math.sin(Math.min(1, t * 1.15) * Math.PI);
      H.rotation.z = bell * 0.55; H.rotation.x = bell * 0.25; H.position.y -= bell * 0.05;
      if (this.cur === 'shotgun') {
        const c = (t * 4) % 1;
        P.armL.rotation.x = -Math.sin(c * Math.PI) * 0.7;
      } else {
        if (t < 0.18) { wo.mag.position.y -= t / 0.18 * 0.12; }
        else if (t < 0.62) {
          if (!this.magDropped) { this.magDropped = true; this.fx.dropMag(wo.mag); }
          wo.mag.visible = t > 0.45;
          wo.mag.position.y -= 0.25 * (1 - (t - 0.45) / 0.17);
          P.armL.rotation.x = -Math.sin(((t - 0.18) / 0.44) * Math.PI) * 1.1;
        } else if (t < 0.72) { wo.mag.position.y -= (0.72 - t) / 0.1 * 0.05; }
        else if (t < 0.92) { P.armL.rotation.y = -0.1; P.armL.position.x = -0.2; H.rotation.z += Math.sin((t - 0.72) / 0.2 * Math.PI) * 0.25; }
      }
    }
    // ショットガンの ポンプ
    if (this.pumpT > 0) {
      this.pumpT -= dt;
      const pt = 1 - this.pumpT / 0.55;
      const pull = pt > 0.4 ? Math.sin(((pt - 0.4) / 0.6) * Math.PI) : 0;
      if (wo.pump) wo.pump.position.z = -0.36 + pull * 0.1;
      P.armL.position.z = pull * 0.1;
    }
    // ねらう ときは まんなかへ
    H.position.x = lerp(0.3, 0.22, this.aimAmt);
  }

  updateCamera(dt, playing) {
    const cam = this.camera, A = this.tmp;
    const aim = this.aimAmt;
    cam.fov = lerp(70, 46, aim); cam.updateProjectionMatrix();
    const yaw = this.yaw + this.recoilY, pitch = this.pitch + this.recoilP;
    this.recoilY *= Math.max(0, 1 - dt * 8);
    const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const sh = lerp(0.95, 0.68, aim);
    this.shoulder = (this.shoulder || v3()).set(this.pos.x + rx * sh, this.pos.y + lerp(2.02, 1.82, aim), this.pos.z + rz * sh);
    const want = lerp(3.2, 1.6, aim);
    const back = A.e.set(-fx, -fy, -fz);
    const dist = cameraDistance(this.shoulder.x, this.shoulder.y, this.shoulder.z, back.x, back.y, back.z, want, this.camCol, 0.25);
    this.camDist = lerp(this.camDist || want, dist, dist < (this.camDist || want) ? 1 : Math.min(1, dt * 6));
    cam.position.copy(this.shoulder).addScaledVector(back, this.camDist);
    if (cam.position.y < 0.25) cam.position.y = 0.25;
    cam.rotation.set(pitch, yaw, 0, 'YXZ');
    this.camBaseQ = (this.camBaseQ || new THREE.Quaternion()).copy(cam.quaternion);
    // ゆれ
    this.shake = Math.max(0, this.shake - dt * 2.5);
    if (this.shake > 0) {
      const s = this.shake * 0.05;
      cam.rotation.x += (Math.random() - 0.5) * s; cam.rotation.y += (Math.random() - 0.5) * s; cam.rotation.z = (Math.random() - 0.5) * s * 0.6;
    }
    // ちかすぎる ときは じぶんを うすく（かくす）
    this.p.root.visible = this.camDist > 0.55;
    this.followSun();
  }

  updateTitleCam(dt) {
    const t = this.titleT * 0.12;
    this.pos.set(0, 0, 4); this.yaw = Math.PI * 0.08; this.pitch = 0.02;
    this.updatePlayerAnim(dt);
    const cam = this.camera;
    cam.fov = 55; cam.updateProjectionMatrix();
    cam.position.set(-1.1 + Math.sin(t) * 0.5, 1.65, 1.5);
    cam.lookAt(-0.55, 1.3, 4.0);
    this.camBaseQ = (this.camBaseQ || new THREE.Quaternion()).copy(cam.quaternion);
    this.followSun();
  }

  followSun() {
    this.sun.target.position.set(this.pos.x, 0, this.pos.z);
    this.sun.position.copy(this.sun.target.position).add(this.sunOff);
  }

  pushHud(force) {
    const g = this.guns[this.cur], w = WEAPONS[this.cur];
    this.hud.set({
      hp: Math.ceil(this.hp), maxHp: PLAYER_MAX_HP, ammo: g.ammo, mag: w.mag, reserve: g.reserve, weapon: this.cur,
      reloading: g.reloading > 0 ? 1 - g.reloading / w.reload : -1, wave: this.wave, left: this.remaining(), score: this.score,
      spread: currentSpread(w, { moving: this.moveAmt > 0.2, aiming: this.aimAmt > 0.5, airborne: !this.onGround, bloom: g.bloom }),
      fov: this.camera.fov, aim: this.aimAmt, guns: this.guns,
    }, force);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.size = [w, h];
  }

  // かるさの じどう ちょうせい
  adaptQuality(frameMs) {
    if (this.settings.quality !== 'auto') return;
    const a = this.adapt; a.frames++; a.sum += frameMs; a.t += frameMs;
    if (a.t < 2500) return;
    const avg = a.sum / a.frames; a.t = 0; a.sum = 0; a.frames = 0;
    if (avg > 24 && a.level < 3) {
      a.level++;
      if (a.level === 1) this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      if (a.level === 2) this.pixelRatio = 1;
      if (a.level === 3) { this.pixelRatio = 0.85; }
      this.renderer.setPixelRatio(this.pixelRatio);
      if (this.size) this.resize(...this.size);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
    this.renderer.forceContextLoss?.();
  }
}
