// ゾンビストライク — 3D の ほんたい（シーン・プレイヤー・ゾンビ・ウェーブ）
import * as THREE from '../vendor/three.module.min.js';
import {
  WEAPONS, WEAPON_ORDER, DEFAULT_WEAPON, ZOMBIES, ATTACK_RANGE, PLAYER_MAX_HP,
  createGun, updateGun, tryFire, startReload, cancelReload, damageAt, currentSpread,
  waveSpec, waveQueue, killScore, castShot, aabbNormal, collideCircle, groundHeight, cameraDistance,
  buildGrid, updateFlow, flowDir, gridLineClear,
  blastDamage, blastFalloff, launchVelocity, knockAt, FLY_KNOCK, MAX_AIR, approach, refillReserve,
} from './rules.js?v=2';
import { buildMap, playerColliders, zombieColliders, shotColliders, HALF } from './map.js?v=2';
import { buildTextures, fxTextures } from './textures.js?v=2';
import { buildWorld } from './world.js?v=2';
import { makePlayer, makeWeapons, makeZombie, makeRocketProjectile, FLASH_MAT } from './models.js?v=2';
import { FX } from './fx.js?v=2';

const v3 = () => new THREE.Vector3();
const lerp = (a, b, t) => a + (b - a) * t;
const PLAYER_R = 0.35;
const FLY_G = 22;                // ふっとんだ ゾンビの じゅうりょく
const BODY_C = new THREE.Vector3(0, 0.9, 0); // からだの まんなか（くるくる まわる じく）
const _e = new THREE.Euler(), _v = new THREE.Vector3();

// ステージ（ひる／よる）の いろ
const STAGES = {
  day: { fog: 0xe9d6b4, near: 22, far: 70, hemi: [0xd4e6ff, 0x6b5a3c, 1.5], sun: [0xfff0d0, 2.4], off: [14, 26, 9] },
  night: { fog: 0x1d2a4e, near: 13, far: 56, hemi: [0x9fb3ee, 0x34344e, 1.25], sun: [0xb4c8ff, 1.0], off: [-12, 24, -16] },
};

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
    this.world = buildWorld(scene, this.map, this.T, { shadows: this.shadows });
    this.pCol = playerColliders(this.map); this.zCol = zombieColliders(this.map); this.sCol = shotColliders(this.map);
    this.camCol = this.sCol.filter((b) => b.maxY > 0.6);
    this.grid = buildGrid(this.zCol, HALF + 4, 1, 0.4);

    // プレイヤー
    this.p = makePlayer(); scene.add(this.p.root);
    this.weapons = makeWeapons();
    for (const id of WEAPON_ORDER) { this.weapons[id].group.visible = false; this.p.holder.add(this.weapons[id].group); }
    this.fx = new FX(scene, tex, { groundAt: (x, z, y) => groundHeight(x, z, 0.05, y, this.pCol) });
    this.rockets = []; this.rocketPool = [];
    this.maxAir = this.quality === 0 ? 4 : MAX_AIR;
    this.slowT = 0; this.hitstop = 0;
    // ライト（じゅうに ついた かいちゅうでんとう。よるだけ）
    const spot = this.spot = new THREE.SpotLight(0xfff2d8, 0, 26, 0.42, 0.55, 1.2);
    spot.visible = false; scene.add(spot); scene.add(spot.target);
    this.buildNight();

    this.zombies = []; this.pool = { walker: [], runner: [], brute: [] };
    this.tmp = { a: v3(), b: v3(), c: v3(), d: v3(), e: v3() };
    this.applyStage(settings.stage || 'day');
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
    this.yaw = this.yawT = s.yaw; this.pitch = this.pitchT = -0.05; this.recoilP = 0; this.recoilY = 0;
    this.vel = new THREE.Vector3(); this.follow = null; this.stepPh = 0; this.slowT = 0; this.hitstop = 0;
    for (const r of this.rockets || []) this.releaseRocket(r);
    if (this.rockets) this.rockets.length = 0;
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
    w.mag.visible = id !== 'rocket' || !this.guns || this.guns.rocket.ammo > 0; w.mag.position.copy(w.magRest);
  }

  // ---- ステージ ----
  buildNight() {
    const S = this.scene, tex = this.fxTex, lamps = this.map.lamps;
    const g = this.nightGroup = new THREE.Group(); g.visible = false; S.add(g);
    // つき
    const moon = this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.moon, fog: false, depthWrite: false }));
    moon.scale.setScalar(9); g.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0x6f86c8, fog: false, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(30); moon.add(halo); halo.scale.set(3.3, 3.3, 1);
    // ほし（Points 1こ）
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.3, r = 130;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    this.stars.frustumCulled = false; g.add(this.stars);
    // がいとうの あかりの わ（じめんに うつる ひかり・ほんものの ライトは つかわない）
    const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: tex.glow, color: 0xffc870, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -1 }), lamps.length);
    const haloI = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex.glow, color: 0xffe2a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), lamps.length);
    const coneGeo = new THREE.ConeGeometry(2.1, 3.9, 14, 1, true); coneGeo.translate(0, -1.95, 0);
    const cone = new THREE.InstancedMesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), lamps.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    lamps.forEach((l, i) => {
      m.compose(_v.set(l.x, 0.04, l.z), q.identity(), sc.set(8.5, 1, 8.5)); pool.setMatrixAt(i, m);
      m.compose(_v.set(l.x, l.h - 0.05, l.z), q.identity(), sc.set(1, 1, 1)); cone.setMatrixAt(i, m);
    });
    pool.renderOrder = 2; g.add(pool, cone);
    this.lampHalo = haloI; haloI.frustumCulled = false; g.add(haloI);
  }

  applyStage(stage) {
    const st = STAGES[stage] ? stage : 'day', c = STAGES[st];
    this.stage = st; this.night = st === 'night';
    this.scene.background = this.night ? this.fxTex.nightSky : this.fxTex.sky;
    this.scene.fog.color.set(c.fog); this.scene.fog.near = c.near; this.scene.fog.far = c.far;
    this.hemi.color.set(c.hemi[0]); this.hemi.groundColor.set(c.hemi[1]); this.hemi.intensity = c.hemi[2];
    this.sun.color.set(c.sun[0]); this.sun.intensity = c.sun[1]; this.sunOff.set(...c.off);
    this.nightGroup.visible = this.night;
    this.fx.lightBoost = this.night ? 2.4 : 1;
    this.spot.visible = this.night && this.settings.flashlight !== false;
    this.spot.intensity = this.spot.visible ? 30 : 0;
    if (this.world && this.world.mats && this.world.mats.light) this.world.mats.light.color.set(this.night ? 0xfff6d0 : 0xfff2b0);
    for (const z of this.zombies) z.model.eyes.visible = this.night;
    for (const k in this.pool) for (const md of this.pool[k]) md.eyes.visible = this.night;
  }

  updateNight() {
    if (!this.night) return;
    const p = this.pos;
    this.moon.position.set(p.x - 50, 52, p.z - 95);
    this.stars.position.set(p.x, 0, p.z);
    // がいとうの ひかりの たま（カメラの ほうを むく）
    const m = this.tmp.m || (this.tmp.m = new THREE.Matrix4());
    const q = this.camera.quaternion, sc = _v.set(1.5, 1.5, 1.5);
    this.map.lamps.forEach((l, i) => { m.compose(this.tmp.e.set(l.x, l.h + 0.05, l.z), q, sc); this.lampHalo.setMatrixAt(i, m); });
    this.lampHalo.instanceMatrix.needsUpdate = true;
    // かいちゅうでんとう
    if (this.spot.visible) {
      const wo = this.weapons[this.cur];
      wo.muzzle.getWorldPosition(this.spot.position);
      const d = this.tmp.c.set(0, 0, -1).applyQuaternion(this.camBaseQ || this.camera.quaternion);
      this.spot.target.position.copy(this.camera.position).addScaledVector(d, 18);
    }
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
    model.root.rotation.set(0, 0, 0); model.eyes.visible = !!this.night;
    for (const m of model.meshes) m.material = m.userData.mat;
    this.scene.add(model.root);
    const zz = {
      kind, model, x, z, y: 0, yaw: 0, hp: Math.round(def.hp * hpMul), maxHp: Math.round(def.hp * hpMul), alive: true, state: 'walk',
      t: 0, atkT: 0.6, stagger: 0, flash: 0, phase: Math.random() * 6, scale: def.scale, speed: def.speed * (0.9 + Math.random() * 0.2),
      deadT: 0, demo: false, stuck: 0, lastX: x, lastZ: z, kvx: 0, kvz: 0, vy: 0, fly: null, flown: false,
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
        for (const id of WEAPON_ORDER) refillReserve(this.guns[id]);
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
        if (z.fly) { this.updateFly(z, dt); continue; }
        z.deadT += dt;
        const t = z.deadT;
        if (!z.flown) m.inner.rotation.x = Math.min(1, t / 0.4) ** 2 * (Math.PI / 2) * 0.92;
        if (z.kvx || z.kvz) this.slideZombie(z, dt);
        m.root.position.set(z.x, z.y, z.z);
        if (t > 0.55 && !z.poofed) { z.poofed = true; this.fx.poof(this.tmp.a.set(z.x, z.y + 0.4, z.z), z.scale); this.sfx.poof(); }
        if (t > 0.55) m.root.scale.setScalar(z.scale * Math.max(0.01, 1 - (t - 0.55) / 0.18));
        if (t > 0.75) { this.releaseZombie(z); zs.splice(i, 1); }
        continue;
      }
      const dx = this.pos.x - z.x, dz = this.pos.z - z.z, dist = Math.hypot(dx, dz);
      if (dist < nearest) nearest = dist;
      let mvx = 0, mvz = 0, moving = false;
      if (z.kvx || z.kvz || z.y > 0 || z.vy) this.slideZombie(z, dt);
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
      m.root.position.set(z.x, z.y + Math.abs(swing) * 0.04, z.z);
      m.root.rotation.y = z.yaw;
    }
    // うめきごえ
    this.groanT -= dt;
    if (this.groanT <= 0 && nearest < 30 && this.state === 'play') {
      this.sfx.groan(0.22 * Math.max(0, 1 - nearest / 30));
      this.groanT = 1.5 + Math.random() * 2.5;
    }
  }

  // ノックバックで すべる（いきてる ゾンビ・たおれた ゾンビ）
  slideZombie(z, dt) {
    const k = Math.exp(-7 * dt);
    const nx = z.x + z.kvx * dt, nz = z.z + z.kvz * dt;
    const r = collideCircle(nx, nz, 0.3 * z.scale, z.y, this.zCol);
    z.x = Math.max(-HALF - 3, Math.min(HALF + 3, r.x)); z.z = Math.max(-HALF - 3, Math.min(HALF + 3, r.z));
    z.kvx *= k; z.kvz *= k;
    if (Math.abs(z.kvx) + Math.abs(z.kvz) < 0.05) z.kvx = z.kvz = 0;
    if (z.y > 0 || z.vy) {
      z.vy -= FLY_G * dt; z.y += z.vy * dt;
      if (z.y <= 0) { z.y = 0; z.vy = 0; }
    }
  }

  // ふっとび（からだ まるごと くるくる → バウンド → ポン！）
  launchZombie(z, v) {
    const heavy = z.kind === 'brute' ? 0.72 : 1;
    z.fly = { vx: v.vx * heavy, vy: v.vy * heavy, vz: v.vz * heavy, t: 0, bounces: 0,
      sx: (Math.random() < 0.5 ? -1 : 1) * v.spin * (0.6 + Math.random() * 0.5), sz: (Math.random() - 0.5) * v.spin * 0.9,
      sy: (Math.random() - 0.5) * 6 };
    z.y = Math.max(z.y, 0.05); z.kvx = z.kvz = 0; z.flown = true;
  }

  updateFly(z, dt) {
    const f = z.fly, m = z.model;
    f.t += dt;
    f.vy -= FLY_G * dt;
    const nx = z.x + f.vx * dt, nz = z.z + f.vz * dt;
    const r = collideCircle(nx, nz, 0.3 * z.scale, z.y, this.zCol, 0.1);
    if (Math.abs(r.x - nx) > 1e-4) f.vx *= -0.45;
    if (Math.abs(r.z - nz) > 1e-4) f.vz *= -0.45;
    z.x = Math.max(-HALF - 3, Math.min(HALF + 3, r.x)); z.z = Math.max(-HALF - 3, Math.min(HALF + 3, r.z));
    z.y += f.vy * dt;
    // くるくる
    const rot = m.inner.rotation;
    rot.x += f.sx * dt; rot.z += f.sz * dt; z.yaw += f.sy * dt;
    _v.copy(BODY_C).applyEuler(rot); m.inner.position.copy(BODY_C).sub(_v);
    // てあしを バタバタ
    const fl = Math.sin(f.t * 22) * 0.9;
    m.legs[0].rotation.x = fl; m.legs[1].rotation.x = -fl;
    m.arms[0].rotation.x = -1.6 + fl * 0.6; m.arms[1].rotation.x = -1.6 - fl * 0.6;
    const gh = groundHeight(z.x, z.z, 0.1, z.y + 0.3, this.pCol);
    if (z.y <= gh && f.vy < 0) {
      z.y = gh;
      const pos = this.tmp.c.set(z.x, gh + 0.03, z.z);
      if (f.bounces < 2 && f.vy < -3.2) {
        f.bounces++;
        f.vy = -f.vy * 0.42; f.vx *= 0.55; f.vz *= 0.55; f.sx *= 0.6; f.sz *= 0.6;
        this.fx.splat(pos, undefined, 1.1 * z.scale);
        this.fx.burst(pos, 8, { color: 0xbdb3a0, color2: 0x45c932, speed: 2, up: 1.5, size: 0.12, life: 0.5, gravity: 8 });
        this.sfx.thud();
      } else {
        // じめんに ついたら ポン！
        z.fly = null; z.y = gh; z.deadT = 0.55;
        this.fx.splat(pos, undefined, 1.5 * z.scale);
      }
    }
    if (f.t > 4 && z.fly) { z.fly = null; z.deadT = 0.55; }
    m.root.position.set(z.x, z.y, z.z);
    m.root.rotation.y = z.yaw;
  }

  airborne() { let n = 0; for (const z of this.zombies) if (z.fly) n++; return n; }

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
    if (w.projectile) { this.fireRocket(o, d, spread, muzzle); return; }
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
        const h = hitZ.get(z) || { dmg: 0, head: false, pos: hp, dir, knock: 0 };
        h.dmg += dmg; h.head = h.head || hit.head; h.knock += knockAt(w, dist); hitZ.set(z, h);
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
    let killed = 0;
    for (const [z, h] of hitZ) { if (this.hitZombie(z, h.dmg, h.head, h.pos, h.dir, { knock: h.knock })) killed++; }
    if (killed >= 2) this.multiKill(killed);
    if (anyHit) { this.hud.hitmarker(anyHead); this.sfx.hit(anyHead); }
    // みため
    this.fx.muzzle(wObj.muzzle, id === 'shotgun' ? 1.5 : id === 'pistol' ? 0.8 : 1.15);
    this.fx.casing(wObj.eject, id, right);
    if (id === 'shotgun') this.pumpT = 0.55;
    this.kick = 1;
    this.shake = Math.min(0.45, this.shake + w.shake * 0.9);
    const aimMul = this.aimAmt > 0.5 ? 0.6 : 1;
    const kickP = w.recoilPitch * aimMul * (0.8 + Math.random() * 0.4);
    this.recoilP += kickP * 0.75; this.pitch = Math.min(1.05, this.pitch + kickP * 0.25); this.pitchT = Math.min(1.05, this.pitchT + kickP * 0.25); // 25% は のこる
    this.recoilY += (Math.random() - 0.5) * 2 * w.recoilYaw * aimMul;
    this.sfx.shot(id);
  }

  // ---- ロケット ----
  fireRocket(o, d, spread, muzzle) {
    const A = this.tmp, w = WEAPONS.rocket, wo = this.weapons.rocket;
    const dir = d.clone().addScaledVector(_v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), spread).normalize();
    const hit = castShot(o.x, o.y, o.z, dir.x, dir.y, dir.z, this.zombies, this.sCol, w.range);
    const aimP = new THREE.Vector3(hit.x, hit.y, hit.z);
    const start = muzzle.clone();
    const fdir = aimP.clone().sub(start);
    if (fdir.length() < 2 || fdir.dot(dir) < 0) fdir.copy(dir); fdir.normalize();
    let r = this.rocketPool.pop();
    if (!r) { const mdl = makeRocketProjectile(); r = { mdl, pos: new THREE.Vector3(), vel: new THREE.Vector3() }; }
    this.scene.add(r.mdl.group); r.mdl.group.visible = true;
    r.pos.copy(start); r.vel.copy(fdir).multiplyScalar(w.speed); r.life = w.life; r.trailT = 0; r.age = 0;
    r.mdl.group.position.copy(start); r.mdl.group.quaternion.setFromUnitVectors(_v.set(0, 0, -1), fdir);
    this.rockets.push(r);
    // うしろの ふきだし・ひかり
    const back = wo.back.getWorldPosition(A.c), bdir = fdir.clone().negate();
    // カメラに かからないよう、ひだり したへ にがす
    bdir.x -= Math.cos(this.yaw) * 1.3; bdir.z += Math.sin(this.yaw) * 1.3; bdir.y -= 0.25; bdir.normalize();
    this.fx.backblast(back, bdir);
    this.fx.muzzle(wo.muzzle, 1.6);
    wo.mag.visible = false;
    this.kick = 1;
    this.shake = Math.min(0.6, this.shake + w.shake);
    const kickP = w.recoilPitch * (0.9 + Math.random() * 0.2);
    this.recoilP += kickP * 0.75; this.pitch = Math.min(1.05, this.pitch + kickP * 0.25); this.pitchT = Math.min(1.05, this.pitchT + kickP * 0.25);
    this.recoilY += (Math.random() - 0.5) * 2 * w.recoilYaw;
    this.sfx.rocket();
  }

  releaseRocket(r) { this.scene.remove(r.mdl.group); this.rocketPool.push(r); }

  updateRockets(dt) {
    const w = WEAPONS.rocket;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.life -= dt; r.age += dt;
      const sp = r.vel.length(), step = sp * dt;
      const dx = r.vel.x / sp, dy = r.vel.y / sp, dz = r.vel.z / sp;
      const hit = castShot(r.pos.x, r.pos.y, r.pos.z, dx, dy, dz, this.zombies, this.sCol, step);
      if (hit.kind !== 'none' || r.life <= 0) {
        const p = new THREE.Vector3(hit.x - dx * 0.15, Math.max(0.1, hit.y - dy * 0.15), hit.z - dz * 0.15);
        this.explode(p, w);
        this.rockets.splice(i, 1); this.releaseRocket(r);
        continue;
      }
      r.pos.addScaledVector(r.vel, dt);
      r.mdl.group.position.copy(r.pos);
      r.mdl.flame.scale.setScalar(0.7 + Math.random() * 0.7);
      r.trailT -= dt;
      if (r.trailT <= 0) {
        r.trailT = 0.018;
        this.fx.trail(this.tmp.c.copy(r.pos).addScaledVector(r.vel, -0.3 / sp), this.tmp.d.copy(r.vel).multiplyScalar(-0.05 / sp));
      }
    }
  }

  // ドッカーン！ まわりの ゾンビを ふっとばす
  explode(p, w) {
    this.fx.explosion(p, w.blast);
    const pd = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    this.sfx.boom(1.15 - pd / 40);
    this.shake = Math.max(this.shake, Math.max(0.3, 1.0 - pd / 30));
    this.hud.boom?.(Math.max(0.25, 1 - pd / 25));
    let killed = 0;
    const dir = new THREE.Vector3();
    for (const z of this.zombies) {
      if (!z.alive || z.demo) continue;
      const cy = z.y + 0.8 * z.scale;
      const dx = z.x - p.x, dz = z.z - p.z, dy = (cy - p.y) * 0.6;
      const d = Math.hypot(dx, dy, dz) - 0.3 * z.scale;
      const f = blastFalloff(Math.max(0, d), w.blast);
      if (f <= 0) continue;
      const dl = Math.hypot(dx, dz) || 1;
      dir.set(dx / dl, 0.3, dz / dl);
      const v = launchVelocity(dx, dz, Math.max(0, d), w.blast, w.power, Math.random());
      const pos = this.tmp.c.set(z.x, cy, z.z).clone();
      if (this.hitZombie(z, blastDamage(w, Math.max(0, d)), false, pos, dir, { launch: v, knock: w.power * f * 0.6, blast: true })) killed++;
    }
    if (killed >= 2) this.multiKill(killed);
  }

  // まとめて たおした！ → ちょっと スローモーション
  multiKill(n) {
    const bonus = n * 50;
    this.score += bonus;
    this.hud.kill(`まとめて ${n}たい！ +${bonus}`, true);
    if (n >= 3) this.slowT = 0.55; else this.hitstop = 0.07;
  }

  hitZombie(z, dmg, head, pos, dir, opt = {}) {
    if (!z.alive) return false;
    z.hp -= dmg;
    z.flash = 0.045; z.flashOn = true;
    for (const mm of z.model.meshes) mm.material = FLASH_MAT;
    // ノックバック（ショットガンの ちかくは つよい・ライフルは すこし）
    const heavy = z.kind === 'brute' ? 0.4 : 1;
    const hl = Math.hypot(dir.x, dir.z) || 1;
    const kn = (opt.knock || 0) * heavy;
    z.kvx += dir.x / hl * kn; z.kvz += dir.z / hl * kn;
    if (opt.blast && z.hp > 0) { z.vy = Math.max(z.vy, 3.5 * heavy); z.y = Math.max(z.y, 0.02); }
    z.stagger = Math.max(z.stagger, opt.blast ? 0.7 : head ? 0.28 : 0.12 + kn * 0.03) * (z.kind === 'brute' ? 0.5 : 1);
    if (Math.random() < 0.7) this.fx.splat(this.tmp.c.set(z.x + dir.x * 0.6 + (Math.random() - 0.5) * 0.7, 0.02, z.z + dir.z * 0.6 + (Math.random() - 0.5) * 0.7), undefined, 0.9 + Math.random() * 0.4);
    if (z.hp <= 0) {
      z.alive = false; z.deadT = 0; z.poofed = false;
      this.kills++; if (head) this.heads++;
      const sc = killScore(z.kind, head); this.score += sc;
      this.fx.splat(this.tmp.c.set(z.x, 0.02, z.z), undefined, 1.3 * z.scale);
      this.fx.greenHit(pos, dir, true);
      this.hud.kill(head ? `ヘッドショット！ +${sc}` : `+${sc}`, head);
      this.pushHud(true);
      // はでに ふっとぶ（ばくはつ・ショットガンの ちかく）
      const canFly = this.airborne() < this.maxAir;
      if (canFly && opt.launch) this.launchZombie(z, opt.launch);
      else if (canFly && kn >= FLY_KNOCK) {
        this.launchZombie(z, { vx: dir.x / hl * kn * 0.85, vy: 3.2 + kn * 0.38, vz: dir.z / hl * kn * 0.85, spin: 5 + kn * 0.9 });
      }
      return true;
    }
    return false;
  }

  // ---- まいフレーム ----
  update(dt, inp) {
    const playing = this.state === 'play';
    // ヒットストップ・スローモーション（あそびの ときだけ）
    if (playing) {
      if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.08; }
      else if (this.slowT > 0) { this.slowT -= dt; dt *= this.slowT > 0.18 ? 0.3 : lerp(1, 0.3, this.slowT / 0.18); }
    }
    if (this.state === 'title') { this.titleT += dt; this.updateZombies(dt); this.updateTitleCam(dt); this.updateNight(); this.fx.update(dt); return; }
    if (this.state === 'pause') return;
    if (this.state === 'over') { this.updateRockets(dt); this.updateZombies(dt); this.fx.update(dt); this.updateCamera(dt, false); this.updateNight(); return; }

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
    // しせん: めあての むきへ すこしだけ なめらかに（おくれない ていど）
    this.yawT -= inp.lx * slow; this.pitchT -= inp.ly * slow;
    this.pitchT = Math.max(-1.0, Math.min(1.05, this.pitchT));
    const lk = inp.touch ? 30 : 48;
    this.yaw = approach(this.yaw, this.yawT, lk, dt); this.pitch = approach(this.pitch, this.pitchT, lk, dt);
    // はんどうの もどり（80% もどる）
    const rec = Math.min(1, dt * 7);
    this.recoilP -= this.recoilP * rec;
    // いどう
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const speed = lerp(4.7, 2.5, this.aimAmt) * (gun.reloading > 0 ? 0.85 : 1) * (this.cur === 'rocket' ? 0.92 : 1);
    const tvx = (fx * inp.my + rx * inp.mx) * speed, tvz = (fz * inp.my + rz * inp.mx) * speed;
    // かそく・げんそく（くうちゅうは ゆっくり）
    const V = this.vel, speeding = tvx * tvx + tvz * tvz > V.x * V.x + V.z * V.z;
    const rate = this.onGround ? (speeding ? 13 : 11) : 3;
    V.x = approach(V.x, tvx, rate, dt); V.z = approach(V.z, tvz, rate, dt);
    // ぶつかり: こまかく わけて うごかし、かべに そって すべる（がたがた しない）
    const ox = this.pos.x, oz = this.pos.z;
    const stepLen = Math.hypot(V.x, V.z) * dt, nSub = Math.max(1, Math.ceil(stepLen / 0.15));
    let nx = ox, nz = oz;
    for (let i = 0; i < nSub; i++) {
      const r = collideCircle(nx + V.x * dt / nSub, nz + V.z * dt / nSub, PLAYER_R, this.pos.y, this.pCol);
      nx = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, r.x)); nz = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, r.z));
    }
    this.pos.x = nx; this.pos.z = nz;
    if (dt > 0) { V.x = (nx - ox) / dt; V.z = (nz - oz) / dt; } // ほんとうに うごいた ぶんだけ（かべに おしつけない）
    const vx = V.x, vz = V.z;
    this.moveAmt = Math.min(1, Math.hypot(vx, vz) / 4.7);
    this.vy -= 20 * dt; this.pos.y += this.vy * dt;
    const gh = groundHeight(this.pos.x, this.pos.z, PLAYER_R, this.pos.y + 0.001, this.pCol);
    if (this.pos.y <= gh) { if (!this.onGround && this.vy < -4) this.landT = 0.15; this.pos.y = gh; this.vy = 0; this.onGround = true; }
    else if (this.pos.y > gh + 0.05) this.onGround = false;
    this.walkPhase += dt * Math.hypot(vx, vz) * 2.2;
    // あしおと
    const stepN = Math.floor(this.walkPhase / Math.PI);
    if (stepN !== this.stepPh) { this.stepPh = stepN; if (this.onGround && this.moveAmt > 0.3) this.sfx.step?.(); }

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
      if (res === 'fire') { this.fireShot(); this.pushHud(true); }
      else if (res === 'reload') this.onReloadStart();
      else if (res === 'empty') this.sfx.empty();
    }
    if (gun.ammo === 0 && gun.reloading === 0 && gun.reserve > 0 && !held) { if (startReload(gun)) this.onReloadStart(); }

    // HP かいふく
    this.regenDelay -= dt;
    if (this.regenDelay <= 0 && this.hp < PLAYER_MAX_HP) { this.hp = Math.min(PLAYER_MAX_HP, this.hp + dt * 8); this.pushHud(); }

    this.updateWaves(dt);
    this.updateRockets(dt);
    this.updateZombies(dt);
    this.updatePlayerAnim(dt);
    this.updateCamera(dt, true);
    this.updateNight();
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
    P.torso.rotation.z = -Math.sin(this.walkPhase) * 0.03 * this.moveAmt;
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
    wo.mag.visible = this.cur !== 'rocket' || gun.ammo > 0; wo.mag.position.copy(wo.magRest);
    if (gun.reloading > 0 && this.cur === 'rocket') {
      // まえから あたらしい たまを いれる
      const t = 1 - gun.reloading / w.reload;
      const bell = Math.sin(Math.min(1, t * 1.1) * Math.PI);
      H.rotation.x = -bell * 0.4; H.position.y -= bell * 0.06;
      wo.mag.visible = t > 0.5;
      if (t > 0.5 && t < 0.82) wo.mag.position.z -= (0.82 - t) / 0.32 * 0.45;
      P.armL.rotation.x = -Math.sin(Math.min(1, Math.max(0, (t - 0.3) / 0.55)) * Math.PI) * 1.0;
      P.armL.position.z = -bell * 0.15;
    } else if (gun.reloading > 0) {
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
    // カメラは プレイヤーを なめらかに おいかける（よこは すばやく・たては ゆっくり）
    const F = this.follow || (this.follow = this.pos.clone());
    F.x = approach(F.x, this.pos.x, 30, dt); F.z = approach(F.z, this.pos.z, 30, dt); F.y = approach(F.y, this.pos.y, 12, dt);
    if (F.distanceToSquared(this.pos) > 4) F.copy(this.pos);
    const bob = this.onGround ? Math.sin(this.walkPhase * 2) * 0.022 * this.moveAmt * (1 - aim) - this.landT * 0.5 : 0;
    this.shoulder = (this.shoulder || v3()).set(F.x + rx * sh, F.y + lerp(2.02, 1.82, aim) + bob, F.z + rz * sh);
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
    this.pos.set(0, 0, 4); this.yaw = this.yawT = Math.PI * 0.08; this.pitch = this.pitchT = 0.02;
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
      if (a.level === 3) { this.pixelRatio = 0.85; this.maxAir = 4; }
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
