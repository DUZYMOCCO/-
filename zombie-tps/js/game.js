// ゾンビストライク — 3D の ほんたい（シーン・プレイヤー・ゾンビ・ウェーブ）
import * as THREE from '../vendor/three.module.min.js';
import {
  WEAPONS, WEAPON_ORDER, DEFAULT_WEAPON, ZOMBIES, ATTACK_RANGE, PLAYER_MAX_HP,
  createGun, updateGun, tryFire, startReload, cancelReload, damageAt, currentSpread,
  waveSpec, waveQueue, killScore, castShot, aabbNormal, collideCircle, groundHeight, cameraDistance,
  buildGrid, updateFlow, flowDir, gridLineClear,
  blastDamage, blastFalloff, launchVelocity, knockAt, FLY_KNOCK, MAX_AIR, approach, refillReserve,
  TOD, timeOfDay, blendTod, mixColor as mixC, rollRocketDrop, addRocketAmmo, pickupVisible, PICKUP_LIFE, MAX_PICKUPS,
  isBossWave, bossHp, BOSS, climbTarget, climbLanding, climbTime, supportBox, boxGap,
  canClimb, perchRunnerNeeded, PERCH, OJISAN, shouldSpawnOjisan, ojisanAttackers, pickOjisanSpot, openCells, edgeArrow,
  nextOutfit, outfitName, cellOf,
  spinGun, weaponMoveMul, makeBoxIndex, pickSpawnPoint, hurryMul, pickMapId,
  rollGearDrop, rollGear, GEAR_FLOOR, GEAR_LIFE, gearEffects, equippedItems, gearColor, rarityOf, normalizeGear,
  damageMul, frontHit, heavyOf, unlockedSpecials, zombieTargetsRobot,
  castPierce, SUIT, dropSpot, aimFov, aimSensMul, scopeSway, isScoped, SCOPE, weaponLevel, setGunLevel,
  VEHICLE, BLAST_FX, blastHits, blastReachesVehicle,
} from './rules.js?v=13';
import { RobotMixin } from './robot.js?v=13';
import { AllyMixin } from './ally.js?v=13';
import { CopMixin } from './cop.js?v=13';
import { VehicleMixin } from './vehicles.js?v=13';
import { SuitMixin } from './suit.js?v=13';
import { MissileMixin } from './missiles.js?v=13';
import { makeNav } from './nav.js?v=13';
import { buildMap, playerColliders, zombieColliders, shotColliders } from './map.js?v=13';
import { buildTextures, fxTextures } from './textures.js?v=13';
import { buildWorld, disposeWorld } from './world.js?v=13';
import { Backdrop, BACKDROPS } from './backdrop.js?v=13';
import { makePlayer, applyOutfit, applyGear, makeGearDrop, makeOjisan, makeWeapons, makeZombie, makeRocketProjectile, makeRocketCrate, zombieChunkColors, FLASH_MAT } from './models.js?v=13';
import { FX } from './fx.js?v=13';
const A_RIGHT = new THREE.Vector3();

const v3 = () => new THREE.Vector3();
const lerp = (a, b, t) => a + (b - a) * t;
const PLAYER_R = 0.35;
const FLY_G = 22;                // ふっとんだ ゾンビの じゅうりょく
const BODY_C = new THREE.Vector3(0, 0.9, 0); // からだの まんなか（くるくる まわる じく）
const _e = new THREE.Euler(), _v = new THREE.Vector3();

const TOD_LABEL = { day: 'ひるに なった', sunset: 'ゆうがたに なった…', night: 'よるに なった…' };
const TOD_FADE = 3.5;           // じかんが かわる はやさ（びょう）
const PICKUP_R = 1.1;           // ロケットだんを ひろう きょり
const smooth = (t) => t * t * (3 - 2 * t);

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

    this.T = buildTextures();
    this.backdrop = new Backdrop(scene, this.quality);
    this.loadMap(pickMapId(settings.map, settings.mapNext), true);

    // プレイヤー
    this.p = makePlayer(); scene.add(this.p.root);
    applyOutfit(this.p, settings.outfit || 'normal');
    this.refreshGear(true);
    // おそわれている おじさん（1にんだけ。つかいまわし）
    this.ojiM = makeOjisan(); this.ojiM.root.visible = false; scene.add(this.ojiM.root);
    this.initRobot();
    this.initCop();
    this.initSuit();
    this.initMissiles();
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

    this.zombies = []; this.pool = {};
    this.pickups = []; this.cratePool = [];
    this.gearDrops = []; this.gearPool = [];
    this.pk = new THREE.Vector3(); // プレイヤーが ふっとばされる はやさ（ボスの ドスン）
    this.chunkN = this.quality === 0 ? 10 : 16;
    this.tmp = { a: v3(), b: v3(), c: v3(), d: v3(), e: v3() };
    this.applyStage(settings.stage || 'day');
    this.stats = { frames: 0, cpu: 0, gpuish: 0, last: performance.now(), fps: 0, cpuAvg: 0, frameAvg: 0 };
    this.adapt = { t: 0, frames: 0, sum: 0, level: 0 };
    this.state = 'title';
    this.resetRun();
    this.setupTitle();
  }

  // ---- マップ（v0.5.0: 6しゅるい）----
  loadMap(id, first = false) {
    if (!first && this.map && this.map.id === id) return false;
    if (this.world) disposeWorld(this.scene, this.world);
    const map = this.map = buildMap(id);
    this.half = map.half;
    this.world = buildWorld(this.scene, map, this.T, { shadows: this.shadows });
    const pc = playerColliders(map), zc = zombieColliders(map);
    this.pCol = makeBoxIndex(pc, map.half); this.zCol = makeBoxIndex(zc, map.half);
    this.sCol = shotColliders(map);
    this.initVehicles();
    this.camCol = this.sCol.filter((b) => b.maxY > 0.6);
    // v0.6.0: たかさの ある マップは なんかいだても わかる みちさがし（かいだんを つかう）
    this.nav = makeNav(zc, map);
    this.nav.update(map.playerStart.x, 0, map.playerStart.z); this.flowT = 0;
    this.vertical = !!map.vertical; this.ladders = map.ladders || [];
    this.buildPerchMarks();
    this.cullOn = !!(map.interior && this.world.levels && this.world.levels.size); this.cullKey = '';
    this.backdrop.setMap(map.id);
    if (!first) {
      // よるの あかり（がいとうの かず）を つくりなおす
      this.scene.remove(this.nightGroup); this.scene.remove(this.sunDisk);
      this.nightGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this.buildNight();
      if (this.todP) this.applyTod(this.todP, true);
      if (this.state === 'title') this.setupTitle();
    }
    return true;
  }

  // ---- じょうたい ----
  resetRun() {
    const s = this.map.playerStart;
    this.pos = new THREE.Vector3(s.x, 0, s.z); this.vy = 0; this.onGround = true;
    this.yaw = this.yawT = s.yaw; this.pitch = this.pitchT = -0.05; this.recoilP = 0; this.recoilY = 0;
    this.vel = new THREE.Vector3(); this.follow = null; this.stepPh = 0; this.slowT = 0; this.hitstop = 0;
    for (const r of this.rockets || []) this.releaseRocket(r);
    if (this.rockets) this.rockets.length = 0;
    if (this.missiles) this.clearMissiles();
    this.refreshGear(true); this.hp = this.maxHp; this.hurtT = 0; this.regenDelay = 0;
    this.guns = {}; for (const id of WEAPON_ORDER) this.guns[id] = createGun(id, weaponLevel(this.settings, id));
    this.cur = DEFAULT_WEAPON; this.swapT = 0; this.showWeapon(this.cur);
    this.wave = 0; this.queue = []; this.spawnT = 0; this.interT = 2.5; this.score = 0; this.kills = 0; this.heads = 0;
    this.kick = 0; this.shake = 0; this.walkPhase = 0; this.moveAmt = 0; this.aimAmt = 0; this.reloadWasOn = false; this.magDropped = false;
    this.flowT = 0; this.groanT = 2; this.lastTarget = -1; this.pumpT = 0; this.landT = 0;
    for (const z of this.zombies) this.releaseZombie(z);
    this.zombies.length = 0;
    for (const pu of this.pickups || []) this.releasePickup(pu);
    for (const gd of this.gearDrops || []) this.releaseGear(gd);
    this.gearDrops = [];
    if (this.pickups) this.pickups.length = 0;
    if (this.pk) this.pk.set(0, 0, 0);
    this.boss = null; this.hud.bossBar?.(null);
    if (this.suitM) this.endSuit(); // v0.10.0
    this.endOji(); this.endRobot?.(); this.endCop?.(); this.copLast = 0; this.resetVehicles?.(); this.ojiPlan = null; this.ojiLast = 0; this.perchT = 0; this.perchCd = 0;
    for (const sp of this.spits || []) this.releaseSpit(sp);
    this.spits = []; for (const h of this.hazards || []) this.releaseHazard(h);
    this.hazards = []; this.burnT = 0; this.zapT = 0; this.softAcc = 0; this.onLadder = false; this.pReach = false;
  }

  setupTitle() {
    this.state = 'title'; this.titleT = 0;
    this.resetRun();
    // かざりの ゾンビ（こうげき しない）
    const sp = unlockedSpecials(99), extra = sp[Math.floor(Math.random() * sp.length)];
    for (const [k, x, z] of [['walker', -3, -7], ['runner', 3.5, -9], [extra, -6, -12], ['brute', 1, -14]]) {
      const zz = this.spawnZombie(k, x, z, 1); zz.demo = true; zz.yaw = Math.random() * 6;
    }
  }

  startGame() {
    for (const z of this.zombies) this.releaseZombie(z);
    this.zombies.length = 0;
    this.resetRun();
    this.applyStage(this.todStart || 'day');
    this.spawnRobot();
    this.placeSuit(); // v0.10.0: パワードスーツを どこかに おく
    this.state = 'play';
    this.hud.show('play');
    this.pushHud(true);
  }

  // v0.8.0: つよく した レベルを いまの じゅうに いれる（たまは そのまま）
  applyUpgrades() {
    if (!this.guns) return;
    for (const id of WEAPON_ORDER) if (this.guns[id]) setGunLevel(this.guns[id], weaponLevel(this.settings, id));
    if (this.p) this.refreshGear(); // v0.8.0: ぶいの レベル・たいりょく
    this.pushHud?.(true);
  }

  // v0.8.0: みはりだいの しるし（ちいさい スコープの マーク。うすく）
  buildPerchMarks() {
    if (this.perchG) { this.scene.remove(this.perchG); this.perchG.traverse((o) => { if (o.material) o.material.dispose(); }); }
    const g = this.perchG = new THREE.Group();
    if (!this.perchTex) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = 'rgba(20,28,36,0.55)'; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#e8f0f8'; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 17, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 3; x.beginPath(); x.moveTo(32, 8); x.lineTo(32, 24); x.moveTo(32, 40); x.lineTo(32, 56); x.moveTo(8, 32); x.lineTo(24, 32); x.moveTo(40, 32); x.lineTo(56, 32); x.stroke();
      x.fillStyle = '#ff6a5a'; x.beginPath(); x.arc(32, 32, 3, 0, Math.PI * 2); x.fill();
      this.perchTex = new THREE.CanvasTexture(c); this.perchTex.colorSpace = THREE.SRGBColorSpace;
    }
    for (const p of this.map.perches || []) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.perchTex, transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
      sp.position.set(p.x, p.top + (p.roof ? 1.6 : 2.75), p.z); sp.scale.setScalar(0.85);
      g.add(sp);
    }
    this.scene.add(g);
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
    const moon = this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.moon, fog: false, depthWrite: false, transparent: true }));
    moon.scale.setScalar(9); g.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0x6f86c8, fog: false, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(30); moon.add(halo); halo.scale.set(3.3, 3.3, 1); this.moonHalo = halo;
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
      m.compose(_v.set(l.x, (l.y0 ?? 0) + 0.04, l.z), q.identity(), sc.set(l.y0 ? 6 : 8.5, 1, l.y0 ? 6 : 8.5)); pool.setMatrixAt(i, m);
      m.compose(_v.set(l.x, l.h - 0.05, l.z), q.identity(), sc.set(1, 1, 1)); cone.setMatrixAt(i, m);
    });
    pool.renderOrder = 2; g.add(pool, cone);
    this.lampHalo = haloI; haloI.frustumCulled = false; g.add(haloI);
    this.lampMats = [[pool.material, 0.55], [haloI.material, 0.9], [cone.material, 0.07]];
    // ゆうひ（おおきな まるい ひかり）
    const disk = this.sunDisk = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0xffa860, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    disk.scale.setScalar(46);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.glow, color: 0xfff0c0, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.scale.set(0.3, 0.3, 1); disk.add(core); this.sunCore = core;
    disk.visible = false; S.add(disk);
  }

  // スタートの じかん（タイトルで えらぶ）。ウェーブごとに ゆうぐれ → ゆうやけ → よる
  applyStage(stage) {
    const st = TOD[stage] ? stage : 'day';
    this.stage = this.todStart = st; this.tod = st; this.todFade = null;
    this.applyTod(TOD[st], true);
  }

  // じかんの いろを ぜんぶに あてる（p は TOD の 1つ、または mixTod の まぜた もの）
  applyTod(p, sky = true) {
    this.todP = p;
    // マップの いろみ（theme.tint）を そら・きり・じめんの ひかりに すこし まぜる
    const th = this.map.theme || {}, tk = th.k || 0, tt = th.tint ?? 0x808080;
    const sk = tk ? p.sky.map((c, i) => mixC(c, tt, tk * (i >= 2 ? 0.6 : 0.25))) : p.sky;
    if (sky) { this.fxTex.drawSky(sk); this.scene.background = this.fxTex.skyTex; }
    this.scene.fog.color.set(tk ? mixC(p.fog, tt, tk * 0.5) : p.fog); this.scene.fog.near = p.near; this.scene.fog.far = p.far;
    this.hemi.color.set(p.hemiSky); this.hemi.groundColor.set(tk ? mixC(p.hemiGround, tt, tk * 0.4) : p.hemiGround); this.hemi.intensity = p.hemiI;
    this.baseHemiI = p.hemiI;
    this.darkAmt = Math.min(1, p.night + p.lamps * 0.35);
    const mc = BACKDROPS[this.map.id]?.moon; if (mc != null) { this.moon.material.color.set(mc); this.moonHalo.material.color.set(mc); }
    this.sun.color.set(p.sun); this.sun.intensity = p.sunI; this.sunOff.set(...p.off);
    const dark = Math.max(p.night, p.moon, p.lamps);
    this.nightGroup.visible = dark > 0.02;
    this.stars.material.opacity = 0.85 * p.night;
    this.moon.material.opacity = p.moon; this.moonHalo.material.opacity = 0.6 * p.moon;
    for (const [m, o] of this.lampMats) m.opacity = o * p.lamps;
    this.sunDisk.visible = p.disk > 0.02;
    this.sunDisk.material.opacity = p.disk; this.sunCore.material.opacity = p.disk;
    this.fx.lightBoost = p.boost;
    // v0.5.0: くらい ふんいき → めは いつも ひかる（ゾンビが みやすい）
    this.night = p.night > 0.5;
    this.spot.intensity = this.spot.visible ? 30 * Math.min(1, p.night * 1.4) : 0;
    if (this.world && this.world.mats && this.world.mats.light) this.world.mats.light.color.set(p.lamps > 0.3 ? 0xfff6d0 : 0xfff2b0);
    this.setSpot(p.night > 0.5);
  }

  // かいちゅうでんとう（よるは じどうで オン。せっていで けせる）
  setSpot(on) {
    const want = on && this.settings.flashlight !== false;
    if (want !== this.spot.visible) {
      this.spot.visible = want;
      this.spot.intensity = want ? 30 : 0;
      try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* noop */ }
    }
  }

  // つぎの じかんへ ゆっくり かわる
  startTodFade(to) {
    if (to === this.tod && !this.todFade) return false;
    this.todFade = { from: this.todP, to, t: 0 };
    // よるに なる ときは さきに ライトを つける（シェーダーの じゅんびを いま する）
    if (TOD[to].night > 0.5) this.setSpot(true);
    return true;
  }
  updateTod(dt) {
    const f = this.todFade; if (!f) return;
    f.t += dt;
    const k = smooth(Math.min(1, f.t / TOD_FADE));
    const o = blendTod(f.from, TOD[f.to], k);
    this.applyTod(o, true);
    if (f.t >= TOD_FADE) { this.tod = f.to; this.todFade = null; this.applyTod(TOD[f.to], true); }
  }

  updateNight() {
    const p = this.pos;
    // うごく はいけい と かみなり
    const fl = this.backdrop.update(this.frameDt || 0.016, this.camera.position, this.darkAmt || 0, this.scene.fog.far);
    this.hemi.intensity = (this.baseHemiI || 1) * (1 + fl * 0.9);
    if (this.sunDisk.visible) {
      const o = this.sunOff, l = Math.hypot(o.x, o.y, o.z) || 1;
      this.sunDisk.position.set(p.x + o.x / l * 120, Math.max(4, o.y / l * 120), p.z + o.z / l * 120);
    }
    if (!this.nightGroup.visible) return;
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
  spawnZombie(kind, x, z, hpMul = 1, y = 0) {
    const def = ZOMBIES[kind];
    const pl = this.pool[kind] || (this.pool[kind] = []);
    let model = pl.pop();
    if (!model) model = makeZombie(kind);
    model.root.visible = true; model.inner.rotation.set(0, 0, 0); model.inner.position.set(0, 0, 0); model.inner.scale.set(1, 1, 1); model.root.scale.setScalar(def.scale);
    model.root.rotation.set(0, 0, 0); model.eyes.visible = true;
    for (const m of model.meshes) m.material = m.userData.mat;
    this.scene.add(model.root);
    const zz = {
      kind, model, x, z, y, yaw: 0, hp: Math.round(def.hp * hpMul), maxHp: Math.round(def.hp * hpMul), alive: true, state: 'walk',
      t: 0, atkT: 0.6, stagger: 0, flash: 0, phase: Math.random() * 6, scale: def.scale, speed: def.speed * (0.9 + Math.random() * 0.2),
      deadT: 0, demo: false, stuck: 0, lastX: x, lastZ: z, kvx: 0, kvz: 0, vy: 0, fly: null, flown: false,
      climb: null, slam: null, slamCd: 1.5 + Math.random(), charge: null, chargeCd: 3, shattered: false,
      // v0.6.0: とくべつな ゾンビの タイマー
      spCd: 1.5 + Math.random() * 1.5, buffT: 0, fuse: 0, leap: null, scream: 0, screams: 0,
    };
    if (kind === 'boss') {
      zz.hp = zz.maxHp = bossHp(this.wave || 3);
      this.boss = zz;
      this.hud.bossBar?.({ name: def.name, hp: 1 });
    }
    model.root.position.set(x, y, z);
    this.zombies.push(zz);
    return zz;
  }
  releaseZombie(z) {
    this.scene.remove(z.model.root);
    if (z.model.deco) { for (const d of Object.values(z.model.deco)) d.visible = false; }
    z.model.root.visible = true;
    if (this.boss === z) { this.boss = null; this.hud.bossBar?.(null); }
    (this.pool[z.kind] || (this.pool[z.kind] = [])).push(z.model);
  }

  pickSpawn() {
    // ひろい マップでも まちくたびれない: ちかすぎず とおすぎない ゲートから
    const o = pickSpawnPoint(this.map.spawns, this.pos.x, this.pos.z, Math.random(), undefined, this.pos.y);
    const y = o.y || 0;
    for (let k = 0; k < 4; k++) { // おくじょう・ビルの なかでは かべに めりこまない ところだけ
      const x = o.x + (Math.random() - 0.5) * (y ? 1.2 : 2.5), z = o.z + (Math.random() - 0.5) * (y ? 1.2 : 2.5);
      if (!this.vertical || this.nav.free(x, y, z)) return { x, z, y };
    }
    return { x: o.x, z: o.z, y };
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
        for (const id of WEAPON_ORDER) refillReserve(this.guns[id]); // ロケットは ほじゅう なし（ドロップで ひろう）
        const tod = timeOfDay(this.wave, this.todStart);
        const sub = spec.boss ? 'ボスゾンビが くるぞ！' : this.wave === 1 ? 'ゾンビが くるぞ！' : `ゾンビ ${spec.total}たい`;
        this.hud.banner(`ウェーブ ${this.wave}`, this.wave > 1 && this.todChanged ? `${TOD_LABEL[tod]}　${sub}` : sub);
        this.todChanged = false;
        this.ojiPlan = shouldSpawnOjisan(this.wave, this.ojiLast) ? { t: OJISAN.delay[0] + Math.random() * (OJISAN.delay[1] - OJISAN.delay[0]) } : null;
        this.planCop(this.forceCop ? 0 : Math.random()); // v0.9.0: けいさつおじさん（ウェーブ3〜・30%・つづけて こない）
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
        this.spawnZombie(k, s.x, s.z, this.spec.hpMul, s.y);
        this.spawnT = this.spec.spawnGap * (0.7 + Math.random() * 0.6);
        this.pushHud(true);
      }
    } else if (alive === 0 && !this.zombies.length && !(this.oji && this.oji.state === 'thanks' && this.oji.t < 2.6)) {
      this.interT = 4.5; this.ojiPlan = null;
      this.copLeave(); // ウェーブ おわり → てを ふって かえる
      this.hud.banner('ウェーブ クリア！', `+${this.wave * 200} ボーナス`);
      this.score += this.wave * 200;
      this.hp = Math.min(this.maxHp, this.hp + 30);
      this.todChanged = this.startTodFade(timeOfDay(this.wave + 1, this.todStart));
      this.sfx.clear();
      this.pushHud(true);
    }
  }

  // たかい ところに いすわると、のぼれる はやい ゾンビが くる（あんぜんちたい なし）
  updatePerch(dt) {
    if (this.interT > 0) { this.perchT = 0; return; }
    // おくじょうは「たかい ところ」。ビルの なかの ふつうの ゆか・かいだんは ちがう（walk）
    const high = this.pFloor > 0.45 && !(this.vertical && this.pSupport && this.pSupport.walk);
    this.perchT = high ? this.perchT + dt : 0;
    this.perchCd -= dt;
    let alive = 0, climbers = 0;
    for (const z of this.zombies) if (z.alive) { alive++; if (canClimb(z.kind)) climbers++; }
    if (alive > 0 && perchRunnerNeeded(this.perchT, climbers, this.perchCd)) {
      const s = this.pickSpawn();
      const z = this.spawnZombie('runner', s.x, s.z, this.spec ? this.spec.hpMul : 1, s.y); z.extra = true;
      this.perchCd = PERCH.cooldown;
      this.hud.kill('はやい ゾンビが のぼって くるぞ！');
      this.pushHud(true);
    }
  }

  // ---- おそわれている おじさん ----
  spawnOji() {
    const cells = this.nav.openCells(this.half - 3);
    if (!cells.length) return false;
    const [x, z, cy] = pickOjisanSpot(cells, this.pos.x, this.pos.z);
    const y = groundHeight(x, z, 0.3, (cy || 0) + 0.6, this.pCol);
    const m = this.ojiM;
    m.root.visible = true; m.root.scale.setScalar(1); m.root.position.set(x, y, z);
    this.oji = { x, z, y, hp: OJISAN.hp, state: 'help', t: 0, yaw: 0, hurtT: 0, helpT: 0.3, phase: 0, wave: this.wave, biters: [] };
    const n = ojisanAttackers(this.wave);
    for (let i = 0; i < n; i++) {
      let zx = x, zz = z;
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * Math.PI * 2, d = OJISAN.ring[0] + Math.random() * (OJISAN.ring[1] - OJISAN.ring[0]);
        const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
        if (Math.abs(cx) > this.half - 1 || Math.abs(cz) > this.half - 1) continue;
        if (!this.nav.free(cx, y, cz)) continue;
        zx = cx; zz = cz; break;
      }
      if (zx === x && zz === z) { zx = x + 4; zz = z; }
      const kind = this.wave >= 4 && i === n - 1 ? 'runner' : 'walker';
      const zb = this.spawnZombie(kind, zx, zz, this.spec ? this.spec.hpMul : 1, y);
      zb.ojiT = true; zb.yaw = Math.atan2(zx - x, zz - z);
    }
    this.ojiLast = this.wave;
    this.hud.kill('おじさんが おそわれてる！ たすけて あげよう');
    this.sfx.help?.(0.8);
    this.pushHud(true);
    return true;
  }
  // おじさんを たたいて いい ゾンビか（いちどに OJISAN.maxBiters たいまで）
  ojiBiter(z) {
    const o = this.oji; if (!o) return false;
    const b = o.biters || (o.biters = []);
    if (b.includes(z)) return true;
    if (b.length < OJISAN.maxBiters && Math.hypot(z.x - o.x, z.z - o.z) < OJISAN.waitR + 0.6) { b.push(z); return true; } // ちかづいた じゅんに よやく
    return false;
  }
  damageOji(d) {
    const o = this.oji; if (!o || o.state !== 'help') return;
    o.hp -= d * OJISAN.dmgMul; o.hurtT = 0.25;
    if (o.hp <= 0) this.fleeOji();
  }
  fleeOji() {
    const o = this.oji; o.hp = 0; o.state = 'flee'; o.t = 0;
    for (const z of this.zombies) z.ojiT = false;
    this.hud.kill('おじさんが にげちゃった… また こんど');
    this.sfx.flee?.();
  }
  rescueOji() {
    const o = this.oji; o.state = 'thanks'; o.t = 0;
    const id = nextOutfit(this.settings.outfits || ['normal']);
    if (id) {
      this.hud.gift?.(id);
      this.setOutfit(id, true);
      this.score += OJISAN.bonus;
      this.hud.banner('あたらしい ふくを もらった！', `「${outfitName(id)}」に きがえたよ ・ +${OJISAN.bonus}`);
      o.gift = id;
    } else {
      this.score += OJISAN.bonusAll;
      this.hud.banner('おじさんを たすけた！', `ありがとう！ +${OJISAN.bonusAll}`);
    }
    this.hud.kill('おじさん「ありがとう！」');
    this.spawnGear(o.x + 0.6, o.y, o.z + 0.6, rollGear(Math.random, { floor: GEAR_FLOOR.ojisan })); // おまけの そうび
    this.sfx.gift?.();
    this.pushHud(true);
  }
  endOji() {
    this.oji = null;
    if (this.ojiM) this.ojiM.root.visible = false;
    this.hud.oji?.(null);
  }
  // ふくを きがえる（キラキラ つき）
  setOutfit(id, sparkle) {
    applyOutfit(this.p, id);
    if (sparkle && this.fx) {
      const p = this.tmp.a.set(this.pos.x, this.pos.y + 1.1, this.pos.z);
      this.fx.burst(p, 26, { color: 0xfff3a0, color2: 0xffffff, speed: 2.2, up: 2.2, size: 0.09, life: 0.8, gravity: 2 });
    }
  }
  updateOji(dt) {
    if (this.ojiPlan && !this.oji && this.state === 'play') {
      this.ojiPlan.t -= dt;
      if (this.ojiPlan.t <= 0) { this.ojiPlan = null; this.spawnOji(); }
    }
    const o = this.oji; if (!o) return;
    const m = this.ojiM;
    o.t += dt; o.hurtT -= dt;
    if (o.biters) o.biters = o.biters.filter((z) => z.alive && z.ojiT && Math.hypot(z.x - o.x, z.z - o.z) < OJISAN.waitR + 1.5);
    let nearest = null, nd = Infinity, attackers = 0;
    for (const z of this.zombies) {
      if (!z.alive) continue;
      if (z.ojiT) attackers++;
      const d = Math.hypot(z.x - o.x, z.z - o.z);
      if (d < nd) { nd = d; nearest = z; }
    }
    let mvx = 0, mvz = 0, speed = 0, wantYaw = o.yaw;
    const toP = Math.atan2(o.x - this.pos.x, o.z - this.pos.z); // プレイヤーの ほうを むく yaw
    const A = m.arms, ph = o.t;
    m.inner.position.x = 0; m.inner.rotation.set(0, 0, 0);
    if (o.state === 'help') {
      if (attackers === 0 && this.state === 'play') { this.rescueOji(); return; }
      if (nearest && nd < 4) { mvx = (o.x - nearest.x) / (nd || 1); mvz = (o.z - nearest.z) / (nd || 1); speed = OJISAN.sideSpeed; }
      wantYaw = nearest ? Math.atan2(o.x - nearest.x, o.z - nearest.z) : toP;
      // あわてて りょううでを ふる
      A[0].rotation.x = 2.5 + Math.sin(ph * 9) * 0.45; A[1].rotation.x = 2.5 + Math.sin(ph * 9 + 2) * 0.45;
      A[0].rotation.z = -0.2; A[1].rotation.z = 0.2;
      m.inner.position.y = Math.abs(Math.sin(ph * 7)) * 0.08;
      if (o.hurtT > 0) m.inner.position.x = (Math.random() - 0.5) * 0.08;
      o.helpT -= dt;
      if (o.helpT <= 0) { o.helpT = 3.5; const d = Math.hypot(o.x - this.pos.x, o.z - this.pos.z); if (d < 40) this.sfx.help?.(Math.max(0.2, 1 - d / 40)); }
    } else if (o.state === 'thanks') {
      wantYaw = toP;
      A[1].rotation.x = 2.9; A[1].rotation.z = 0.35 + Math.sin(ph * 10) * 0.4; // てを ふる
      A[0].rotation.x = 0.1; A[0].rotation.z = 0;
      m.inner.position.y = Math.abs(Math.sin(ph * 5)) * 0.12;
      if (o.t > OJISAN.thankTime) { this.fx.poof(this.tmp.a.set(o.x, o.y + 0.8, o.z), 1); this.sfx.poof(); this.endOji(); return; }
    } else if (o.state === 'flee') {
      if (nearest && nd < 12) { mvx = (o.x - nearest.x) / (nd || 1); mvz = (o.z - nearest.z) / (nd || 1); }
      else { mvx = -Math.sin(o.yaw); mvz = -Math.cos(o.yaw); }
      speed = OJISAN.runSpeed;
      A[0].rotation.x = 2.6 + Math.sin(ph * 16) * 0.6; A[1].rotation.x = 2.6 - Math.sin(ph * 16) * 0.6;
      m.inner.position.y = Math.abs(Math.sin(ph * 12)) * 0.1;
      if (o.t > OJISAN.fleeTime) { this.fx.poof(this.tmp.a.set(o.x, o.y + 0.8, o.z), 1); this.sfx.poof(); this.endOji(); return; }
    }
    if (speed > 0) {
      const r = collideCircle(o.x + mvx * speed * dt, o.z + mvz * speed * dt, 0.3, o.y, this.zCol);
      o.x = Math.max(-this.half + 1, Math.min(this.half - 1, r.x)); o.z = Math.max(-this.half + 1, Math.min(this.half - 1, r.z));
      o.y = groundHeight(o.x, o.z, 0.3, o.y + 0.5, this.pCol);
      if (o.state === 'flee') wantYaw = Math.atan2(-mvx, -mvz);
      o.phase += dt * speed * 3.5;
    }
    let dy = wantYaw - o.yaw; // yaw: -z が まえ while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    o.yaw += dy * Math.min(1, dt * 6);
    const sw = speed > 0 ? Math.sin(o.phase) * 0.7 : 0;
    m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
    m.root.position.set(o.x, o.y, o.z); m.root.rotation.y = o.yaw;
  }
  // ふきだし・やじるしの いち
  updateOjiHud() {
    const o = this.oji;
    if (!o || this.state !== 'play') { if (this.ojiHudOn) { this.ojiHudOn = false; this.hud.oji?.(null); } return; }
    const v = this.tmp.c.set(o.x, o.y + 2.05, o.z).project(this.camera);
    const behind = v.z > 1;
    const e = edgeArrow(v.x, v.y, behind);
    this.ojiHudOn = true;
    this.hud.oji?.({ onScreen: e.onScreen, x: e.x, y: e.y, ang: e.ang, hp: o.hp / OJISAN.hp, state: o.state,
      text: o.state === 'help' ? 'たすけて！' : o.state === 'thanks' ? 'ありがとう！' : 'ひえ〜っ！' });
  }

  remaining() { return this.queue.length + this.zombies.filter((z) => z.alive).length; }

  updateZombies(dt) {
    this.flowT -= dt;
    if (this.flowT <= 0) {
      this.nav.update(this.pos.x, this.state === 'play' ? this.pFloor ?? this.pos.y : 0, this.pos.z); this.flowT = 0.25;
      this.pReach = this.state === 'play' && this.nav.reachable(this.pos.x, this.pFloor ?? this.pos.y, this.pos.z);
    }
    const nav = this.nav, PF = this.pFloor ?? 0;
    const zs = this.zombies;
    let nearest = Infinity;
    for (let i = zs.length - 1; i >= 0; i--) {
      const z = zs[i], m = z.model, def = ZOMBIES[z.kind];
      z.flash -= dt;
      if (z.flash <= 0 && z.flashOn) { for (const mm of m.meshes) mm.material = mm.userData.mat; z.flashOn = false; }
      if (!z.alive) {
        if (z.shattered) { this.releaseZombie(z); zs.splice(i, 1); continue; }
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
      if (z.climb) { this.updateClimb(z, dt); continue; }
      if (z.kvx || z.kvz || z.y > 0 || z.vy) this.slideZombie(z, dt);
      const pdy = this.pos.y - z.y;            // プレイヤーが どれだけ うえに いるか
      const higher = PF > z.y + 0.45 && !this.pReach;  // プレイヤーが はこの うえ → のぼる（かいだんで いける ところは あるいて いく）
      const reachA = ATTACK_RANGE * (z.kind === 'boss' ? 1.45 : z.kind === 'brute' ? 1.1 : 1);
      const big = z.kind === 'brute' || z.kind === 'boss';
      z.slamCd -= dt; z.chargeCd -= dt; z.reach = false; z.spCd -= dt; if (z.buffT > 0) z.buffT -= dt;
      // おじさんを おそう（プレイヤーが ちかく まで きたら プレイヤーへ）
      const oj = z.ojiT && this.oji && this.oji.state === 'help' ? this.oji : null;
      let ojx = 0, ojz = 0, ojd = Infinity;
      if (oj) { ojx = oj.x - z.x; ojz = oj.z - z.z; ojd = Math.hypot(ojx, ojz); }
      const goOji = oj && (dist > 3.2 || ojd < dist * 0.6) && this.state === 'play';
      // v0.7.0: なかまの けいさつロボが ちかければ ロボを おそう
      const rb = this.allyFor(z); // v0.9.0: ロボ か けいさつおじさん（ちかい ほう）
      let rbx = 0, rbz = 0, rbd = Infinity;
      if (rb) { rbx = rb.x - z.x; rbz = rb.z - z.z; rbd = Math.hypot(rbx, rbz); }
      const goBot = !goOji && rb && !z.slam && !z.charge && !z.leap && !(z.fuse > 0) && !(z.scream > 0) && zombieTargetsRobot(dist, rbd, rb.y - z.y);
      if (goBot) {
        if (z.stagger > 0) z.stagger -= dt;
        else if (rbd < reachA * 0.95) {
          z.state = 'attack'; z.atkT -= dt; z.yaw = Math.atan2(-rbx, -rbz);
          if (z.atkT <= 0) { z.atkT = def.atkRate; this.hurtAlly(rb, def.dmg); }
        } else {
          z.state = 'walk'; z.atkT = Math.min(z.atkT, 0.45);
          mvx = rbx / (rbd || 1); mvz = rbz / (rbd || 1); moving = true;
          const want = Math.atan2(-mvx, -mvz);
          let dy = want - z.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          z.yaw += dy * Math.min(1, dt * 8);
        }
      } else if (goOji) {
        if (z.stagger > 0) z.stagger -= dt;
        else if ((z.ojiB = this.ojiBiter(z)) && ojd < ATTACK_RANGE * 0.95) {
          z.state = 'attack'; z.atkT -= dt; z.yaw = Math.atan2(-ojx, -ojz);
          if (z.atkT <= 0) { z.atkT = def.atkRate; this.damageOji(def.dmg); }
        } else if (ojd < OJISAN.waitR && !z.ojiB) { // じゅんばん まち（いちどに 2たいまで）
          z.state = 'idle'; z.yaw = Math.atan2(-ojx, -ojz);
        } else {
          z.state = 'walk'; z.atkT = Math.min(z.atkT, 0.45);
          const dir = ojd < 14 && nav.lineClear(z.x, z.y, z.z, oj.x, oj.y, oj.z) ? { x: ojx / ojd, z: ojz / ojd } : { x: ojx / (ojd || 1), z: ojz / (ojd || 1) };
          mvx = dir.x; mvz = dir.z; moving = true;
          const want = Math.atan2(-mvx, -mvz);
          let dy = want - z.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          z.yaw += dy * Math.min(1, dt * 8);
        }
      } else if (z.demo) { // タイトル: うろうろ
        z.t += dt; z.yaw += Math.sin(z.t * 0.5 + z.phase) * dt * 0.6;
        mvx = -Math.sin(z.yaw); mvz = -Math.cos(z.yaw); moving = true;
        if (Math.hypot(z.x - 0, z.z + 10) > 7) { z.yaw = Math.atan2(z.x - 0, z.z + 10); }
      } else if (z.slam) {
        this.updateSlam(z, dt);
      } else if (z.charge) {
        moving = this.updateCharge(z, dt);
      } else if (z.stagger > 0) {
        z.stagger -= dt;
      } else if (z.kind === 'boss' && z.slamCd <= 0 && dist < BOSS.slamRange && pdy > -1 && pdy < 2.6 && this.state === 'play') {
        this.startSlam(z, false);
      } else if (big && higher && z.slamCd <= 0 && this.pSupport && boxGap(z.x, z.z, this.pSupport) < 0.3 * z.scale + 0.45 && this.state === 'play') {
        // でかい ゾンビは くるまを ドスン！ → プレイヤーが おちる
        this.startSlam(z, true);
      } else if (z.leap) {
        moving = this.updateLeap(z, dt);
      } else if (z.fuse > 0) {
        this.updateFuse(z, dt);
      } else if (z.scream > 0) {
        this.updateScream(z, dt);
      } else if ((z.kind === 'boss' || z.kind === 'charger') && z.chargeCd <= 0 && dist > this.chargeSpec(z).min && dist < this.chargeSpec(z).max && Math.abs(pdy) < 0.6
        && nav.lineClear(z.x, z.y, z.z, this.pos.x, PF, this.pos.z) && this.state === 'play') {
        this.startCharge(z, dx / dist, dz / dist);
      } else if (def.leap || def.scream || def.spit || def.gas || def.zap ? this.startSpecial(z, def, dist, dx, dz, pdy) : false) {
        // とくべつな うごき（はじまった）
      } else if (dist < reachA && Math.abs(pdy) < 0.9) {
        z.state = 'attack';
        z.atkT -= dt;
        z.yaw = Math.atan2(-dx, -dz);
        if (z.atkT <= 0 && this.state === 'play') {
          z.atkT = def.atkRate;
          this.damagePlayer(def.dmg, z);
          if (def.burn) { this.burnT = Math.max(this.burnT, def.burn.time); this.burnDps = def.burn.dps; }
        }
      } else {
        z.state = 'walk'; z.atkT = Math.min(z.atkT, 0.45);
        let dir = null;
        if (higher && dist < 6) dir = { x: dx / (dist || 1), z: dz / (dist || 1) }; // はこの そばでは まっすぐ よる（のぼれない こは まわりに あつまる）
        if (higher && dist < 2.6 && !canClimb(z.kind)) z.reach = true;
        else if (dist < 14 && nav.lineClear(z.x, z.y, z.z, this.pos.x, PF, this.pos.z)) dir = { x: dx / dist, z: dz / dist };
        else dir = nav.dir(z.x, z.y, z.z) || { x: dx / (dist || 1), z: dz / (dist || 1) };
        // つばを はく ゾンビは すこし はなれて とまる
        if (def.spit && dist < def.spit.keep && dist > 3 && Math.abs(pdy) < 2.5 && !higher) { dir = { x: 0, z: 0 }; z.yaw = Math.atan2(-dx, -dz); }
        mvx = dir.x; mvz = dir.z; moving = true;
        const want = Math.atan2(-mvx, -mvz);
        let dy = want - z.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        z.yaw += dy * Math.min(1, dt * 8);
      }
      if (moving && !z.charge) {
        // なかまと くっつかない
        for (const o of zs) {
          if (o === z || !o.alive || Math.abs(o.y - z.y) > 0.8) continue;
          const ox = z.x - o.x, oz = z.z - o.z, d2 = ox * ox + oz * oz, md = 0.4 * (z.scale + o.scale);
          if (d2 < md * md && d2 > 1e-6) { const d = Math.sqrt(d2); mvx += ox / d * (md - d) * 1.5; mvz += oz / d * (md - d) * 1.5; }
        }
        const sp = z.demo ? 0.8 : z.speed * hurryMul(dist) * (z.buffT > 0 ? ZOMBIES.screamer.scream.buff : 1);
        let nx = z.x + mvx * sp * dt, nz = z.z + mvz * sp * dt;
        const r = collideCircle(nx, nz, 0.3 * z.scale, z.y, this.zCol);
        nx = r.x; nz = r.z;
        // プレイヤーに めりこまない
        const px = nx - this.pos.x, pz = nz - this.pos.z, pd = Math.hypot(px, pz), minD = 0.35 + 0.3 * z.scale;
        if (pd < minD && pd > 1e-4 && !z.demo && Math.abs(pdy) < 1.2) { nx = this.pos.x + px / pd * minD; nz = this.pos.z + pz / pd * minD; }
        for (const ab of rb ? [this.robot, this.cop] : []) { // ロボ・おじさんにも めりこまない
          if (!ab || ab.state !== 'on') continue;
          const qx = nx - ab.x, qz = nz - ab.z, qd = Math.hypot(qx, qz), qm = 0.32 + 0.3 * z.scale;
          if (qd < qm && qd > 1e-4 && Math.abs(ab.y - z.y) < 1.2) { nx = ab.x + qx / qd * qm; nz = ab.z + qz / qd * qm; }
        }
        z.x = nx; z.z = nz;
        if (this.vertical && !z.fly) { // かいだん: 1だんずつ のぼる・おりる
          const gy = groundHeight(z.x, z.z, 0.15, z.y + 0.001, this.pCol);
          if (gy > z.y) { z.y = gy; z.vy = 0; } else if (gy < z.y - 0.001 && !z.vy) z.vy = -0.01;
        }
        z.phase += dt * sp * (z.kind === 'runner' ? 3.2 : z.kind === 'crawler' ? 6 : 4.2);
        // はこに ぶつかったら よじのぼる（プレイヤーが うえに いる ときだけ）
        if (higher && !z.demo && z.vy === 0 && !goOji && canClimb(z.kind)) {
          const b = climbTarget(z.x, z.z, 0.3 * z.scale, z.y, this.pFloor, this.pCol, 0.15);
          if (b) this.startClimb(z, b);
        }
      }
      if (z.climb) continue;
      // アニメ
      const swing = moving ? Math.sin(z.phase) : 0;
      const amp = z.kind === 'runner' ? 0.95 : z.charge ? 1.1 : 0.55;
      const lb = m.legs[0].userData.base || 0, ab = m.arms[0].userData.base || 0;
      m.legs[0].rotation.x = lb + swing * amp; m.legs[1].rotation.x = lb - swing * amp;
      if (z.kind !== 'crawler') m.body.rotation.x = (z.kind === 'runner' && moving) || z.charge || z.leap ? -0.32 : z.fuse > 0 ? 0.12 : -0.06;
      const atk = z.state === 'attack' ? Math.sin(performance.now() * 0.012) * 0.6 : 0;
      const cw = z.kind === 'crawler' ? Math.sin(z.phase) * 0.5 : Math.sin(z.phase * 0.5) * 0.08;
      m.arms[0].rotation.x = ab + 0.05 + cw + atk;
      m.arms[1].rotation.x = ab + 0.05 - cw - atk;
      if (m.shield) m.arms[0].rotation.x = 0.05 + atk * 0.3; // たてを まえに かまえる
      if (z.leap || z.scream > 0) { m.arms[0].rotation.x = m.arms[1].rotation.x = z.leap ? 2.6 : 1.9 + Math.sin(z.t * 40) * 0.2; }
      if (m.flames) { m.flames.scale.y = 0.8 + Math.random() * 0.5; m.flames.rotation.y += dt * 3; }
      if (m.arcs) { m.arcs.visible = Math.random() < 0.6; m.arcs.rotation.y = Math.random() * 6; }
      if (z.fuse > 0) { const k = 1 + (1 - z.fuse / ZOMBIES.bloater.gas.fuse) * 0.25 + Math.sin(z.fuse * 30) * 0.03; m.inner.scale.set(k, 1 + (k - 1) * 0.4, k); }
      if (z.reach && !z.slam) { // のぼれない: うえに てを のばして ぴょんぴょん
        m.arms[0].rotation.x = 2.4 + Math.sin(z.phase * 1.3) * 0.35; m.arms[1].rotation.x = 2.4 - Math.sin(z.phase * 1.3) * 0.35;
      }
      if (z.slam) { // ためる: りょううでを たかく あげる → ふりおろす
        const u = z.slam.t / z.slam.wind;
        const up = u < 1 ? 2.6 * Math.min(1, u * 1.6) : 2.6 - Math.min(1, (u - 1) * 6) * 3.1;
        m.arms[0].rotation.x = m.arms[1].rotation.x = up;
        m.body.rotation.x = u < 1 ? 0.15 * u : -0.35;
      } else if (z.chargeWind) {
        m.body.rotation.x = -0.45; m.arms[0].rotation.x = m.arms[1].rotation.x = 0.6;
      }
      m.head.rotation.z = Math.sin(z.phase * 0.5 + 1) * 0.08;
      const shakeX = z.slam && z.slam.t < z.slam.wind ? (Math.random() - 0.5) * 0.06 : 0;
      m.root.position.set(z.x + shakeX, z.y + Math.abs(swing) * 0.04, z.z);
      m.root.rotation.y = z.yaw;
      if (this.cullOn) m.root.visible = this.levelVisible(z.x, z.y, z.z);
    }
    // うめきごえ
    this.groanT -= dt;
    if (this.groanT <= 0 && nearest < 30 && this.state === 'play') {
      this.sfx.groan(0.22 * Math.max(0, 1 - nearest / 30));
      this.groanT = 1.5 + Math.random() * 2.5;
    }
  }

  // ---- v0.6.0: とくべつな ゾンビ ----
  // はじめる ときは true（この フレームは ほかの うごきを しない）
  startSpecial(z, def, dist, dx, dz, pdy) {
    if (this.state !== 'play' || z.spCd > 0 || z.ojiT) return false;
    const PF = this.pFloor ?? 0;
    if (def.leap) {
      const L = def.leap;
      if (dist > L.min && dist < L.max && Math.abs(pdy) < 1 && this.nav.lineClear(z.x, z.y, z.z, this.pos.x, PF, this.pos.z)) {
        z.leap = { ux: dx / dist, uz: dz / dist, t: 0, hit: false };
        z.vy = L.vy; z.y += 0.02; z.yaw = Math.atan2(-dx, -dz); z.spCd = L.cd;
        this.sfx.groan?.(0.35);
        return true;
      }
      z.spCd = 0.3; return false;
    }
    if (def.scream) {
      const S = def.scream;
      if (dist < S.r && dist > 3 && z.screams < 3) {
        z.scream = 0.9; z.t = 0; z.screams++; z.spCd = S.cd; z.yaw = Math.atan2(-dx, -dz);
        this.sfx.scream?.(Math.max(0.3, 1 - dist / 30));
        for (const o of this.zombies) if (o.alive && o !== z && Math.hypot(o.x - z.x, o.z - z.z) < S.r) {
          o.buffT = S.time;
          this.fx.burst(this.tmp.c.set(o.x, o.y + 1.9 * o.scale, o.z), 3, { color: 0xff5040, speed: 1, up: 1.5, size: 0.06, life: 0.4, gravity: 0 });
        }
        // なかまを よぶ（1かいめと 2かいめ だけ・おおすぎない）
        if (z.screams <= 2 && this.zombies.filter((o) => o.alive).length < (this.spec ? this.spec.maxAlive : 12) + 4) {
          for (let i = 0; i < S.summon; i++) { const s = this.pickSpawn(); const n = this.spawnZombie('walker', s.x, s.z, this.spec ? this.spec.hpMul : 1, s.y); n.extra = true; }
          this.hud.kill('さけぶ ゾンビが なかまを よんだ！');
        }
        return true;
      }
      z.spCd = 0.4; return false;
    }
    if (def.gas) {
      if (dist < 2.2 && Math.abs(pdy) < 1.2) { z.fuse = def.gas.fuse; this.sfx.warn?.(); return true; }
      return false;
    }
    if (def.spit) {
      const S = def.spit;
      if (dist > S.min && dist < S.max && pdy > -3 && pdy < 5) {
        const o = this.tmp.c.set(z.x, z.y + 1.45 * z.scale, z.z), t = this.tmp.d.set(this.pos.x - o.x, this.pos.y + 1.0 - o.y, this.pos.z - o.z);
        const L = t.length(); t.divideScalar(L);
        const h = castShot(o.x, o.y, o.z, t.x, t.y, t.z, [], this.sCol, L);
        if (h.kind === 'none') { this.fireSpit(z, S); z.spCd = S.cd * (0.8 + Math.random() * 0.4); }
        else z.spCd = 0.5;
      }
      return false;
    }
    if (def.zap) {
      const Z = def.zap;
      if (dist < Z.r && Math.abs(pdy) < 1.5) {
        z.spCd = Z.cd;
        this.damagePlayer(Z.dmg, z); this.zapT = Z.time;
        const a = this.tmp.c.set(z.x, z.y + 1.1, z.z), b = this.tmp.d.set(this.pos.x, this.pos.y + 1, this.pos.z);
        for (let i = 0; i <= 6; i++) { const k = i / 6; this.fx.burst(this.tmp.e.lerpVectors(a, b, k).add(_v.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)), 2, { color: 0x7fe8ff, color2: 0xffffff, speed: 1.2, up: 0.5, size: 0.06, life: 0.2, gravity: 0 }); }
        this.sfx.zap?.(0.7);
      }
      return false;
    }
    return false;
  }
  // とびかかり（へんいした ゾンビ）
  updateLeap(z, dt) {
    const L = z.leap, def = ZOMBIES[z.kind];
    L.t += dt;
    const sp = def.leap.speed;
    const r = collideCircle(z.x + L.ux * sp * dt, z.z + L.uz * sp * dt, 0.3 * z.scale, z.y, this.zCol);
    z.x = r.x; z.z = r.z; z.phase += dt * 10;
    const pd = Math.hypot(this.pos.x - z.x, this.pos.z - z.z);
    if (!L.hit && pd < 0.95 && Math.abs(this.pos.y - z.y) < 1.4 && this.state === 'play') {
      L.hit = true; this.damagePlayer(def.dmg * 1.2, z); this.pk.set(L.ux * 4, 0, L.uz * 4);
    }
    if ((L.t > 0.12 && !z.vy) || L.t > 1.6) { z.leap = null; z.stagger = 0.35; if (pd < 14) this.sfx.thud(); }
    return true;
  }
  // ふくらむ → ガス（ふくらんだ ゾンビ）
  updateFuse(z, dt) {
    z.fuse -= dt;
    z.yaw = Math.atan2(-(this.pos.x - z.x), -(this.pos.z - z.z));
    if (z.fuse <= 0) { z.fuse = 0; z.selfPop = true; this.hitZombie(z, z.hp + 1, false, this.tmp.c.set(z.x, z.y + 1, z.z).clone(), { x: 0, y: 0, z: 1 }); }
  }
  updateScream(z, dt) { z.scream -= dt; z.t += dt; if (z.scream <= 0) z.scream = 0; }
  onSpecialDeath(z) {
    const def = ZOMBIES[z.kind];
    if (def.gas) {
      this.addHazard('gas', z.x, z.y, z.z, def.gas.r, def.gas.dps, def.gas.time);
      this.fx.burst(this.tmp.c.set(z.x, z.y + 1, z.z), 22, { color: 0x9adf4a, color2: 0x6ab030, speed: 3, up: 2, size: 0.16, life: 0.7, gravity: 2, grow: 1.2, drag: 3 });
      this.sfx.gas?.(Math.max(0.3, 1 - Math.hypot(z.x - this.pos.x, z.z - this.pos.z) / 30));
    } else if (def.pop) {
      const p = this.tmp.c.set(z.x, z.y + 0.9, z.z);
      this.fx.burst(p, 20, { color: 0xff9a30, color2: 0xffe070, speed: 4, up: 3, size: 0.12, life: 0.5, gravity: 2, drag: 2 });
      this.sfx.fire?.(0.6);
      const d = Math.hypot(this.pos.x - z.x, this.pos.z - z.z);
      if (this.state === 'play' && d < def.pop.r && Math.abs(this.pos.y - z.y) < 2) this.damagePlayer(def.pop.dmg * (1 - d / def.pop.r * 0.5), z);
    }
  }
  // つば（とぶ たま）
  fireSpit(z, S) {
    let sp = this.spitPool && this.spitPool.pop();
    if (!sp) {
      this.spitGeo = this.spitGeo || new THREE.IcosahedronGeometry(0.13, 0);
      this.spitMat = this.spitMat || new THREE.MeshBasicMaterial({ color: 0x8ae03a });
      sp = { m: new THREE.Mesh(this.spitGeo, this.spitMat), p: new THREE.Vector3(), v: new THREE.Vector3() };
    }
    const o = sp.p.set(z.x - Math.sin(z.yaw) * 0.3, z.y + 1.45 * z.scale, z.z - Math.cos(z.yaw) * 0.3);
    // すこし さきを ねらう（よけられる はやさ）
    const tx = this.pos.x + this.vel.x * 0.25, tz = this.pos.z + this.vel.z * 0.25, ty = this.pos.y + 0.9;
    const hd = Math.hypot(tx - o.x, tz - o.z), T = Math.max(0.35, hd / S.speed), G = 12;
    sp.v.set((tx - o.x) / T, (ty - o.y + 0.5 * G * T * T) / T, (tz - o.z) / T);
    sp.life = 3; sp.dmg = S.dmg; sp.puddle = S.puddle; sp.x = z.x; sp.z = z.z;
    sp.m.position.copy(o); sp.m.visible = true; this.scene.add(sp.m);
    this.spits.push(sp);
    this.sfx.spit?.(Math.max(0.2, 1 - hd / 25));
  }
  releaseSpit(sp) { this.scene.remove(sp.m); (this.spitPool || (this.spitPool = [])).push(sp); }
  addHazard(type, x, y, z, r, dps, life) {
    const gas = type === 'gas';
    let h = (this.hazPool || (this.hazPool = [])).find((q) => q.type === type);
    if (h) this.hazPool.splice(this.hazPool.indexOf(h), 1);
    else {
      h = { type, g: new THREE.Group(), parts: [] };
      const mat = new THREE.MeshBasicMaterial({ map: this.fxTex.glow, color: gas ? 0x9ad84a : 0x7ad030, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
      h.mat = mat;
      if (gas) for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fxTex.glow, color: 0x9ad84a, transparent: true, opacity: 0.4, depthWrite: false })); h.g.add(sp); h.parts.push(sp); }
      else { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2), mat); m.renderOrder = 1; h.g.add(m); h.parts.push(m); }
    }
    h.x = x; h.y = y; h.z = z; h.r = r; h.dps = dps; h.life = h.max = life; h.t = 0;
    h.g.position.set(x, y + (gas ? 0 : 0.05), z);
    if (gas) h.parts.forEach((sp, i) => { const a = i / h.parts.length * Math.PI * 2; sp.position.set(Math.cos(a) * r * 0.35, 0.7 + i * 0.25, Math.sin(a) * r * 0.35); sp.scale.setScalar(r * 1.3); });
    else h.parts[0].scale.setScalar(r);
    this.scene.add(h.g); this.hazards.push(h);
    while (this.hazards.length > 8) this.releaseHazard(this.hazards.shift());
    return h;
  }
  releaseHazard(h) { this.scene.remove(h.g); const i = this.hazards ? this.hazards.indexOf(h) : -1; if (i >= 0) this.hazards.splice(i, 1); this.hazPool.push(h); }
  // すこしずつ へる ダメージ（ガス・やけど）。まとめて いれる（おとが うるさく ならない）
  softDamage(d, src) {
    this.softAcc = (this.softAcc || 0) + d;
    if (this.softAcc >= 3) { const a = this.softAcc; this.softAcc = 0; this.damagePlayer(a, src); }
  }
  updateHazards(dt) {
    if (this.zapT > 0) this.zapT -= dt;
    const P = this.pos;
    if (this.burnT > 0) {
      this.burnT -= dt; this.softDamage((this.burnDps || 4) * dt, null);
      if (Math.random() < 0.3) this.fx.burst(this.tmp.c.set(P.x, P.y + 0.6 + Math.random() * 0.8, P.z), 1, { color: 0xff9a30, color2: 0xffe070, speed: 0.5, up: 1.5, size: 0.07, life: 0.35, gravity: -2 });
    }
    // つば
    for (let i = this.spits.length - 1; i >= 0; i--) {
      const sp = this.spits[i];
      sp.life -= dt; sp.v.y -= 12 * dt;
      const step = sp.v.length() * dt, dx = sp.v.x * dt / step, dy = sp.v.y * dt / step, dz = sp.v.z * dt / step;
      const h = castShot(sp.p.x, sp.p.y, sp.p.z, dx, dy, dz, [], this.sCol, step);
      sp.p.addScaledVector(sp.v, dt); sp.m.position.copy(sp.p);
      if (this.state === 'play' && Math.hypot(sp.p.x - P.x, sp.p.y - (P.y + 0.9), sp.p.z - P.z) < 0.6) {
        this.damagePlayer(sp.dmg, sp); this.fx.greenHit(sp.p, sp.v.clone().normalize(), false); this.sfx.splash?.(0.6);
        this.spits.splice(i, 1); this.releaseSpit(sp); continue;
      }
      const gh = groundHeight(sp.p.x, sp.p.z, 0.05, sp.p.y + 0.2, this.pCol);
      if (h.kind !== 'none' || sp.p.y <= gh || sp.life <= 0) {
        const gy = h.kind === 'wall' ? groundHeight(sp.p.x, sp.p.z, 0.05, h.y + 0.2, this.pCol) : gh;
        this.fx.splat(this.tmp.c.set(sp.p.x, gy + 0.02, sp.p.z), undefined, 0.8);
        if (sp.life > 0) this.addHazard('puddle', sp.p.x, gy, sp.p.z, 1.0, 5, sp.puddle);
        this.sfx.splash?.(Math.max(0.15, 0.6 - Math.hypot(sp.p.x - P.x, sp.p.z - P.z) / 30));
        this.spits.splice(i, 1); this.releaseSpit(sp);
      }
    }
    // ガス・みどりの みずたまり
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.life -= dt; h.t += dt;
      const k = Math.min(1, h.life / 0.8, h.t / 0.3);
      if (h.type === 'gas') h.parts.forEach((sp, j) => { sp.material.opacity = 0.42 * k; sp.position.y = 0.7 + j * 0.25 + Math.sin(h.t * 1.5 + j) * 0.15; sp.material.rotation = h.t * 0.3 * (j % 2 ? 1 : -1); });
      else h.mat.opacity = 0.55 * k;
      if (this.state === 'play' && Math.hypot(P.x - h.x, P.z - h.z) < h.r && P.y - h.y > -0.6 && P.y - h.y < (h.type === 'gas' ? 2.4 : 0.4)) this.softDamage(h.dps * dt, h);
      if (h.life <= 0) this.releaseHazard(h);
    }
  }
  // はしごの ゾーン
  ladderAt(x, y, z) {
    for (const L of this.ladders) if (x >= L.minX && x <= L.maxX && z >= L.minZ && z <= L.maxZ && y >= L.base - 0.1 && y < L.top + 0.05) return L;
    return null;
  }
  // ビルの なか: いまの かいと うえ・したの かい だけ みせる（スマホが おもく ならない）
  updateCull() {
    if (!this.cullOn) return;
    const I = this.map.interior, p = this.state === 'title' ? null : this.pos;
    const inside = p && p.x > I.minX && p.x < I.maxX && p.z > I.minZ && p.z < I.maxZ;
    const P = inside ? Math.max(0, Math.min(I.levels - 1, Math.floor((p.y + 0.6) / I.H))) : -1;
    const lo = inside ? P - 1 : 0, hi = inside ? P + 1 : 1;
    this.cullLo = lo; this.cullHi = hi;
    const key = lo + ':' + hi;
    if (key === this.cullKey) return;
    this.cullKey = key;
    for (const [lvl, meshes] of this.world.levels) for (const m of meshes) m.visible = lvl >= lo && lvl <= hi;
  }
  levelVisible(x, y, z) {
    const I = this.map.interior;
    if (this.cullLo == null || !(x > I.minX && x < I.maxX && z > I.minZ && z < I.maxZ)) return true;
    const L = Math.floor((y + 0.6) / I.H);
    return L >= this.cullLo && L <= this.cullHi;
  }

  // ノックバックで すべる（いきてる ゾンビ・たおれた ゾンビ）
  slideZombie(z, dt) {
    const k = Math.exp(-7 * dt);
    const nx = z.x + z.kvx * dt, nz = z.z + z.kvz * dt;
    const r = collideCircle(nx, nz, 0.3 * z.scale, z.y, this.zCol);
    z.x = Math.max(-this.half - 3, Math.min(this.half + 3, r.x)); z.z = Math.max(-this.half - 3, Math.min(this.half + 3, r.z));
    z.kvx *= k; z.kvz *= k;
    if (Math.abs(z.kvx) + Math.abs(z.kvz) < 0.05) z.kvx = z.kvz = 0;
    if (z.y > 0 || z.vy) {
      const gy = groundHeight(z.x, z.z, 0.15, z.y + 0.001, this.pCol);
      if (z.y > gy + 0.001 || z.vy) {
        z.vy -= FLY_G * dt; z.y += z.vy * dt;
        if (z.y <= gy) { z.y = gy; z.vy = 0; }
      } else z.y = gy;
    }
  }

  // ---- よじのぼり（くるま・はこ・ひくい かべ）----
  startClimb(z, b) {
    const dur = climbTime(b.maxY - z.y, z.kind) * (0.9 + Math.random() * 0.2);
    // はこの ふちへ よる ばしょ
    const ex = Math.max(b.minX, Math.min(b.maxX, z.x)), ez = Math.max(b.minZ, Math.min(b.maxZ, z.z));
    const land = climbLanding(z.x, z.z, b, Math.min(0.45, 0.25 * z.scale));
    z.climb = { t: 0, dur, sx: z.x, sz: z.z, sy: z.y, ex: lerp(z.x, ex, 0.55), ez: lerp(z.z, ez, 0.55), land, b };
    z.yaw = Math.atan2(-(ex - z.x), -(ez - z.z)) || z.yaw;
    z.kvx = z.kvz = 0; z.vy = 0; z.state = 'climb';
    if (Math.hypot(z.x - this.pos.x, z.z - this.pos.z) < 12) this.sfx.climb?.();
  }
  updateClimb(z, dt) {
    const c = z.climb, m = z.model;
    c.t += dt;
    const u = Math.min(1, c.t / c.dur);
    if (u < 0.72) { // ひっぱりあげる（うでを うえに）
      const k = smooth(u / 0.72);
      z.y = c.sy + (c.land.y - c.sy) * k;
      z.x = lerp(c.sx, c.ex, k); z.z = lerp(c.sz, c.ez, k);
    } else { // うえに のる
      const k = smooth((u - 0.72) / 0.28);
      z.y = c.land.y; z.x = lerp(c.ex, c.land.x, k); z.z = lerp(c.ez, c.land.z, k);
    }
    const pull = Math.sin(c.t * 9) * 0.25;
    const armUp = u < 0.72 ? 1.35 + pull : lerp(1.35, 0.05, (u - 0.72) / 0.28);
    m.arms[0].rotation.x = armUp; m.arms[1].rotation.x = u < 0.72 ? 1.35 - pull : armUp;
    m.legs[0].rotation.x = u < 0.72 ? 0.35 + pull : 0; m.legs[1].rotation.x = u < 0.72 ? -0.2 - pull : 0;
    m.body.rotation.x = u < 0.72 ? -0.35 : -0.06;
    m.root.position.set(z.x, z.y, z.z); m.root.rotation.y = z.yaw;
    if (u >= 1) { z.climb = null; z.state = 'walk'; z.y = c.land.y; z.vy = 0; }
  }
  // のぼってる とちゅうで うたれたら おちる
  dropClimb(z) {
    if (!z.climb) return;
    z.climb = null; z.state = 'walk'; z.vy = 0.01;
  }

  // ---- ドスン！（ボス・でかい ゾンビ。carSlam: くるまを たたいて プレイヤーを おとす）----
  startSlam(z, carSlam) {
    const wind = z.kind === 'boss' ? BOSS.slamWind : 0.9;
    z.slam = { t: 0, wind, car: carSlam, done: false };
    z.yaw = Math.atan2(-(this.pos.x - z.x), -(this.pos.z - z.z));
    if (z.kind === 'boss') {
      const ring = this.decal(z, 'ring');
      ring.position.set(z.x, z.y + 0.05, z.z); ring.scale.setScalar(0.1); ring.visible = true;
    }
    this.sfx.warn?.();
  }
  updateSlam(z, dt) {
    const S = z.slam;
    S.t += dt;
    if (z.model.deco && z.model.deco.ring && z.model.deco.ring.visible) {
      const k = Math.min(1, S.t / S.wind);
      z.model.deco.ring.scale.setScalar(BOSS.slamRadius * (0.3 + 0.7 * k));
      z.model.deco.ring.material.opacity = 0.35 + 0.45 * Math.abs(Math.sin(S.t * 14));
    }
    if (!S.done && S.t >= S.wind) {
      S.done = true;
      if (z.model.deco && z.model.deco.ring) z.model.deco.ring.visible = false;
      const p = this.tmp.c.set(z.x - Math.sin(z.yaw) * 0.6 * z.scale, z.y + 0.05, z.z - Math.cos(z.yaw) * 0.6 * z.scale);
      this.fx.burst(p, 26, { color: 0xbdb3a0, color2: 0x8a7f6a, speed: 6, up: 3, size: 0.2, life: 0.7, gravity: 12 });
      const pd = Math.hypot(this.pos.x - z.x, this.pos.z - z.z);
      this.sfx.slam?.(1.1 - pd / 30);
      this.shake = Math.max(this.shake, Math.max(0.2, 0.8 - pd / 20));
      if (this.state === 'play') {
        const onTop = this.onGround && this.pos.y > z.y + 0.3;
        const grounded = this.pos.y - this.pFloor < 0.35; // ジャンプ してれば よけられる
        const rad = S.car ? 0.3 * z.scale + 3.5 : BOSS.slamRadius;
        const hitIt = S.car ? (onTop && this.pSupport && boxGap(z.x, z.z, this.pSupport) < 0.3 * z.scale + 0.8)
          : (pd < rad && grounded && this.pos.y - z.y < 2.6);
        if (hitIt) {
          const dl = pd || 1, ux = (this.pos.x - z.x) / dl, uz = (this.pos.z - z.z) / dl;
          this.vy = 6.5; this.onGround = false;
          this.pk.set(ux * 6, 0, uz * 6);
          this.damagePlayer(S.car ? 8 : z.kind === 'boss' ? BOSS.slamDmg : 12, z);
        }
      }
    }
    if (S.t >= S.wind + 0.45) { z.slam = null; z.slamCd = z.kind === 'boss' ? BOSS.slamCd : 3.2; }
  }

  // ---- とっしん（ボス）----
  chargeSpec(z) {
    if (z.kind !== 'boss') return ZOMBIES[z.kind].charge;
    return this._bossCharge || (this._bossCharge = { min: BOSS.chargeMin, max: BOSS.chargeMax, wind: BOSS.chargeWind, speed: BOSS.chargeSpeed, time: BOSS.chargeTime, dmg: BOSS.chargeDmg, cd: BOSS.chargeCd });
  }
  startCharge(z, ux, uz) {
    z.charge = { t: 0, wind: this.chargeSpec(z).wind, ux, uz, hit: false };
    z.chargeWind = true;
    z.yaw = Math.atan2(-ux, -uz);
    const lane = this.decal(z, 'lane');
    lane.visible = true;
    this.sfx.roar?.(z.kind === 'boss' ? 0.45 : 0.3);
  }
  updateCharge(z, dt) {
    const C = z.charge, CS = this.chargeSpec(z);
    C.t += dt;
    const lane = z.model.deco && z.model.deco.lane;
    if (C.t < C.wind) { // ためる（じめんに あかい みち）
      if (lane) {
        const len = CS.speed * CS.time;
        lane.position.set(z.x + C.ux * len / 2, z.y + 0.04, z.z + C.uz * len / 2);
        lane.rotation.y = Math.atan2(C.ux, C.uz); lane.scale.set(1.4 * z.scale, 1, len);
        lane.material.opacity = 0.25 + 0.35 * Math.abs(Math.sin(C.t * 12));
      }
      return false;
    }
    z.chargeWind = false;
    if (lane) lane.visible = false;
    const sp = CS.speed;
    const nx = z.x + C.ux * sp * dt, nz = z.z + C.uz * sp * dt;
    const r = collideCircle(nx, nz, 0.3 * z.scale, z.y, this.zCol);
    const blocked = Math.hypot(r.x - nx, r.z - nz) > sp * dt * 0.5;
    z.x = r.x; z.z = r.z; z.phase += dt * 14;
    if (Math.random() < 0.4) this.fx.burst(this.tmp.c.set(z.x, z.y + 0.1, z.z), 2, { color: 0xbdb3a0, speed: 1.5, up: 1, size: 0.14, life: 0.4, gravity: 4 });
    const pd = Math.hypot(this.pos.x - z.x, this.pos.z - z.z);
    if (!C.hit && pd < 0.35 + 0.42 * z.scale && Math.abs(this.pos.y - z.y) < 1.6 && this.state === 'play') {
      C.hit = true;
      this.vy = 5; this.onGround = false; this.pk.set(C.ux * 9, 0, C.uz * 9);
      this.damagePlayer(CS.dmg, z);
      this.sfx.slam?.(0.7);
    }
    if (blocked) { this.shake = Math.max(this.shake, 0.3); z.stagger = 0.8; this.sfx.slam?.(0.6); }
    if (blocked || C.hit || C.t > C.wind + CS.time) { z.charge = null; z.chargeWind = false; z.chargeCd = CS.cd; }
    return true;
  }

  // ボスの まえぶれ マーク（わ・みち）
  decal(z, kind) {
    z.model.deco = z.model.deco || {};
    if (!z.model.deco[kind]) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
      const geo = kind === 'ring' ? new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2) : new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat); m.renderOrder = 3; m.visible = false;
      this.scene.add(m); z.model.deco[kind] = m;
    }
    return z.model.deco[kind];
  }

  // ふっとび（からだ まるごと くるくる → バウンド → ポン！）
  launchZombie(z, v) {
    const heavy = Math.min(1, heavyOf(z.kind) + 0.32);
    z.fly = { vx: v.vx * heavy, vy: v.vy * heavy, vz: v.vz * heavy, t: 0, bounces: 0,
      sx: (Math.random() < 0.5 ? -1 : 1) * v.spin * (0.6 + Math.random() * 0.5), sz: (Math.random() - 0.5) * v.spin * 0.9,
      sy: (Math.random() - 0.5) * 6 };
    z.y = Math.max(z.y, 0.05); z.kvx = z.kvz = 0; z.flown = true;
  }

  updateFly(z, dt) {
    const f = z.fly, m = z.model;
    f.t += dt;
    if (f.ghost) { this.updateGhostFly(z, dt); return; } // v0.10.0: パンチ
    f.vy -= FLY_G * dt;
    const nx = z.x + f.vx * dt, nz = z.z + f.vz * dt;
    const r = collideCircle(nx, nz, 0.3 * z.scale, z.y, this.zCol, 0.1);
    if (Math.abs(r.x - nx) > 1e-4) f.vx *= -0.45;
    if (Math.abs(r.z - nz) > 1e-4) f.vz *= -0.45;
    z.x = Math.max(-this.half - 3, Math.min(this.half + 3, r.x)); z.z = Math.max(-this.half - 3, Math.min(this.half + 3, r.z));
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
    if (this.suitBlocksDamage(d)) return; // v0.10.0: スーツ・ぬいだ すぐあと
    d *= this.gearFx ? this.gearFx.dmgMul : 1;
    this.hp = Math.max(0, this.hp - d);
    this.regenDelay = 5; this.shake = Math.max(this.shake, 0.35);
    this.sfx.hurt();
    if (z) this.hud.hurt(Math.atan2(z.x - this.pos.x, z.z - this.pos.z) - Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw)));
    if (this.hp <= 0) this.gameOver();
    this.pushHud(true);
  }

  gameOver() {
    this.state = 'over';
    this.hud.over({ wave: this.wave, score: this.score, kills: this.kills, heads: this.heads });
  }

  // ---- うつ ----
  fireShot() {
    const id = this.cur, gun = this.guns[id], w = gun.w || WEAPONS[id];
    const cam = this.camera, A = this.tmp;
    const d = A.a.set(0, 0, -1).applyQuaternion(this.camBaseQ).normalize();
    // カメラと プレイヤーの あいだの かべに あたらない ように、プレイヤーの よこから うつ
    const o = A.b.copy(cam.position).addScaledVector(d, Math.max(0, A.c.copy(this.shoulder).sub(cam.position).dot(d)));
    const spread = currentSpread(w, { moving: this.moveAmt > 0.2, aiming: this.aimAmt > 0.5, airborne: !this.onGround, bloom: gun.bloom });
    const wObj = this.weapons[id];
    const muzzle = wObj.muzzle.getWorldPosition(A.e);
    const right = A.d.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const shotZ = this.zombies;
    if (w.projectile) { if (w.homing) this.fireMissiles(o, d, muzzle, w); else this.fireRocket(o, d, spread, muzzle); return; }
    const hitZ = new Map();
    let anyHit = false, anyHead = false;
    for (let pI = 0; pI < w.pellets; pI++) {
      // ばらつき（コーン）
      const r = Math.sqrt(Math.random()) * spread, a = Math.random() * Math.PI * 2;
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camBaseQ), rt = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camBaseQ);
      const dir = d.clone().addScaledVector(rt, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      // v0.8.0: スナイパーは つらぬく（ならんだ ゾンビ pierce たい まで。うしろほど すこし よわく）
      const pr = w.pierce ? castPierce(o.x, o.y, o.z, dir.x, dir.y, dir.z, shotZ, this.sCol, w.range, w.pierce, w.pierceMul || 0.8) : null;
      const hit = pr ? pr.end : castShot(o.x, o.y, o.z, dir.x, dir.y, dir.z, shotZ, this.sCol, w.range);
      const hp = new THREE.Vector3(hit.x, hit.y, hit.z);
      if (pI < 3 && (id !== 'minigun' || (gun.shotN = (gun.shotN || 0) + 1) % 2 === 0)) this.fx.tracer(muzzle, hp);
      const zh = pr ? pr.hits : hit.kind === 'zombie' ? [{ index: hit.index, head: hit.head, t: hit.t, x: hit.x, y: hit.y, z: hit.z, mul: 1 }] : [];
      for (const zhit of zh) {
        const z = shotZ[zhit.index];
        const dist = zhit.t;
        const zp = zhit === zh[zh.length - 1] ? hp : new THREE.Vector3(zhit.x, zhit.y, zhit.z);
        const dmg = damageAt(w, dist, zhit.head) * zhit.mul;
        const h = hitZ.get(z) || { dmg: 0, head: false, pos: zp, dir, knock: 0 };
        h.dmg += dmg; h.head = h.head || zhit.head; h.knock += knockAt(w, dist) * zhit.mul; hitZ.set(z, h);
        this.fx.greenHit(zp, dir, zhit.head);
        anyHit = true; anyHead = anyHead || zhit.head;
      }
      if (hit.kind === 'zombie') {
        // （うえで しょり ずみ）
      } else if (hit.kind === 'wall') {
        const n = aabbNormal(hit.x, hit.y, hit.z, this.sCol[hit.index]);
        const nv = new THREE.Vector3(n.x, n.y, n.z);
        this.fx.dust(hp, nv); this.fx.hole(hp, nv);
        const vb = this.sCol[hit.index];
        if (vb && vb.veh != null) this.hitVehicle(vb.veh, damageAt(w, hit.t || 0, false), hp); // v0.9.0: のりもの
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
    this.fx.muzzle(wObj.muzzle, id === 'shotgun' ? 1.5 : id === 'pistol' ? 0.8 : id === 'minigun' ? 0.95 : id === 'sniper' ? 1.3 : id === 'magnum' ? 1.6 : 1.15);
    if (id !== 'sniper' && !w.revolver) this.fx.casing(wObj.eject, id, right); // リボルバーは リロードで まとめて でる
    if (id === 'shotgun') this.pumpT = 0.55;
    if (id === 'sniper') { this.boltT = w.bolt || 0.9; this.boltCase = true; } // ガチャッ（ボルトを ひく ときに からが でる）
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
    const A = this.tmp, w = this.guns.rocket.w || WEAPONS.rocket, wo = this.weapons.rocket;
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

  // v0.11.0: ミサイルランチャー: 3ぱつ まとめて（まえの ちかい ゾンビへ）
  fireMissiles(o, d, muzzle, w) {
    const A = this.tmp, wo = this.weapons[this.cur];
    const hit = castShot(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, this.sCol, w.range);
    const start = muzzle.clone();
    const fdir = new THREE.Vector3(hit.x, hit.y, hit.z).sub(start);
    if (fdir.length() < 2 || fdir.dot(d) < 0) fdir.copy(d); fdir.normalize();
    this.launchSalvo(start, fdir, w, hit);
    const back = wo.back.getWorldPosition(A.c), bdir = fdir.clone().negate();
    bdir.x -= Math.cos(this.yaw) * 1.3; bdir.z += Math.sin(this.yaw) * 1.3; bdir.y -= 0.25; bdir.normalize();
    this.fx.backblast(back, bdir);
    this.fx.muzzle(wo.muzzle, 1.3);
    this.kick = 1;
    this.shake = Math.min(0.5, this.shake + w.shake);
    const kickP = w.recoilPitch * (0.9 + Math.random() * 0.2);
    this.recoilP += kickP * 0.75; this.pitch = Math.min(1.05, this.pitch + kickP * 0.25); this.pitchT = Math.min(1.05, this.pitchT + kickP * 0.25);
    this.recoilY += (Math.random() - 0.5) * 2 * w.recoilYaw;
    this.sfx.rocket();
  }

  releaseRocket(r) { this.scene.remove(r.mdl.group); this.rocketPool.push(r); }

  updateRockets(dt) {
    const w = (this.guns && this.guns.rocket.w) || WEAPONS.rocket;
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
  // ばくはつ（ロケット・のりもの）。v0.9.0: ゾンビ だけに きく（プレイヤー・ロボ・けいさつおじさん・おじさんは だいじょうぶ）
  blastTargets() {
    const T = this._bt || (this._bt = []); T.length = 0;
    for (const z of this.zombies) if (z.alive && !z.demo) T.push({ team: 'zombie', ref: z, x: z.x, y: z.y, z: z.z, scale: z.scale });
    T.push({ team: 'player', x: this.pos.x, y: this.pos.y, z: this.pos.z });
    for (const a of [this.robot, this.cop]) if (a) T.push({ team: 'ally', x: a.x, y: a.y, z: a.z });
    if (this.oji) T.push({ team: 'npc', x: this.oji.x, y: this.oji.y || 0, z: this.oji.z });
    return T;
  }
  explode(p, w, opt = {}) {
    this.fx.explosion(p, w.blast, opt.soft ? 0.45 : 1);
    const pd = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    const vm = opt.vol ?? 1; // v0.11.0: ミサイルは まとめて なるので すこし ちいさく
    this.sfx.boom((1.15 - pd / 40) * vm);
    // ゆれ・ひかりは ひかえめ（iPhone SE でも みやすく）
    const cap = opt.vehicle ? VEHICLE : BLAST_FX;
    this.shake = Math.max(this.shake, cap.shake * vm * Math.max(0.3, 1.0 - pd / 30));
    this.hud.boom?.(cap.flash * vm * Math.max(0.25, 1 - pd / 25));
    let killed = 0;
    const dir = new THREE.Vector3();
    for (const { t, d } of blastHits(p, w.blast, this.blastTargets())) {
      const z = t.ref;
      if (!z.alive) continue;
      const cy = z.y + 0.8 * z.scale;
      const dx = z.x - p.x, dz = z.z - p.z;
      const f = blastFalloff(d, w.blast);
      if (f <= 0) continue;
      const dl = Math.hypot(dx, dz) || 1;
      dir.set(dx / dl, 0.3, dz / dl);
      const v = launchVelocity(dx, dz, d, w.blast, w.power, Math.random());
      const pos = this.tmp.c.set(z.x, cy, z.z).clone();
      if (this.hitZombie(z, blastDamage(w, d), false, pos, dir, { launch: v, knock: w.power * f * 0.6, blast: true })) killed++;
    }
    if (killed >= 2) this.multiKill(killed);
    if (this.crumbleSfx) { this.crumbleSfx = false; this.sfx.crumble?.(); }
    // ロケットが のりものに あたった → 1ぱつで ゆうばく
    if (!opt.vehicle && w.projectile && this.vehicles) {
      for (const v of this.vehicles) if (!v.dead && v.fuse < 0 && blastReachesVehicle(p, 1.5, v)) this.hitVehicle(v.id, 0, null, { rocket: true });
    }
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
    // v0.6.0: たて（まえから）・ベスト・しょうぼうしの ふく
    const mul = damageMul(z.kind, { head, blast: !!opt.blast, front: !opt.blast && frontHit(z.yaw, dir.x, dir.z) });
    dmg *= mul;
    if (mul < 0.5 && !opt.blast) { // カン！ ひばな
      this.fx.burst(pos, 4, { color: 0xffe080, color2: 0xffffff, speed: 3.5, up: 1.5, size: 0.05, life: 0.25, gravity: 8 });
      this.sfx.clink?.(0.5);
    }
    z.hp -= dmg;
    if (!opt.fire) { z.flash = 0.045; z.flashOn = true; for (const mm of z.model.meshes) mm.material = FLASH_MAT; }
    // ノックバック（ショットガンの ちかくは つよい・ライフルは すこし。ボスは ほとんど うごかない）
    const heavy = heavyOf(z.kind);
    const hl = Math.hypot(dir.x, dir.z) || 1;
    const kn = (opt.knock || 0) * heavy;
    z.kvx += dir.x / hl * kn; z.kvz += dir.z / hl * kn;
    if (z.climb && (opt.blast || kn > 1.5 || head)) this.dropClimb(z);
    if (opt.blast && z.hp > 0 && z.kind !== 'boss' && !z.climb) { z.vy = Math.max(z.vy, 3.5 * heavy); z.y = Math.max(z.y, 0.02); }
    if (!z.slam && !z.charge) z.stagger = Math.max(z.stagger, opt.blast ? 0.7 : head ? 0.28 : 0.12 + kn * 0.03) * Math.min(1, heavyOf(z.kind) * 1.25);
    // ばくはつは みどりの しみ なし（ブロックに くだける）
    if (!opt.blast && !opt.fire && Math.random() < 0.7) this.fx.splat(this.tmp.c.set(z.x + dir.x * 0.6 + (Math.random() - 0.5) * 0.7, z.y + 0.02, z.z + dir.z * 0.6 + (Math.random() - 0.5) * 0.7), undefined, 0.9 + Math.random() * 0.4);
    if (this.boss === z) this.hud.bossBar?.({ name: ZOMBIES.boss.name, hp: Math.max(0, z.hp / z.maxHp) });
    if (z.hp <= 0) {
      z.alive = false; z.deadT = 0; z.poofed = false;
      z.climb = null; z.slam = null; z.charge = null; z.chargeWind = false; z.leap = null; z.scream = 0;
      this.onSpecialDeath(z);
      if (z.model.deco) for (const d of Object.values(z.model.deco)) d.visible = false;
      this.kills++; if (head) this.heads++;
      const sc = z.selfPop ? 0 : killScore(z.kind, head); this.score += sc; if (z.selfPop) this.kills--;
      const isBoss = z.kind === 'boss';
      if (z.selfPop) this.hud.kill('ガスが でた！ はなれて！', true); else this.hud.kill(isBoss ? `ボスを たおした！ +${sc}` : opt.bot === 'cop' ? `けいさつおじさんが たおした！ +${sc}` : opt.bot ? `ロボが たおした！ +${sc}` : head ? `ヘッドショット！ +${sc}` : `+${sc}`, head || isBoss);
      // ロケットだんを おとす（ボスは かならず 2こ）
      // v0.10.0: アイテムは あたった ばしょに おちる（ふっとんだ さき では ない）
      const dp = dropSpot(z, opt.dropAt);
      const n = rollRocketDrop(z.kind);
      if (n) this.spawnPickup(dp.x, dp.y, dp.z, n);
      if (rollGearDrop(z.kind)) this.spawnGear(dp.x + 0.5, dp.y, dp.z + 0.3, rollGear(Math.random, { floor: isBoss ? GEAR_FLOOR.boss : 'n' }));
      if (isBoss) { this.boss = null; this.hud.bossBar?.(null); this.slowT = Math.max(this.slowT, 0.6); this.sfx.roar?.(0.35); }
      this.pushHud(true);
      if (opt.blast) { // ブロックに くだけて とびちる（ちは でない）
        this.shatterZombie(z, opt.launch || { vx: dir.x * 4, vy: 5, vz: dir.z * 4 });
        return true;
      }
      if (opt.fire) { this.charZombie(z); return true; } // こげて たおれる（ちは でない）
      if (opt.punch && !isBoss && this.punchFly(z, opt.punch)) { this.fx.greenHit(pos, dir, true); return true; }
      this.fx.splat(this.tmp.c.set(z.x, z.y + 0.02, z.z), undefined, 1.3 * z.scale);
      this.fx.greenHit(pos, dir, true);
      // はでに ふっとぶ（ショットガンの ちかく）
      const canFly = this.airborne() < this.maxAir;
      if (canFly && kn >= FLY_KNOCK && !isBoss) {
        this.launchZombie(z, { vx: dir.x / hl * kn * 0.85, vy: 3.2 + kn * 0.38, vz: dir.z / hl * kn * 0.85, spin: 5 + kn * 0.9 });
      }
      return true;
    }
    return false;
  }

  shatterZombie(z, v) {
    z.shattered = true;
    z.model.root.visible = false;
    const n = z.kind === 'boss' ? this.chunkN * 2 : z.scale > 1.05 ? Math.round(this.chunkN * 1.4) : this.chunkN;
    const heavy = Math.min(1, heavyOf(z.kind) + 0.28);
    this.fx.shatter(z.x, z.y, z.z, z.scale, z.yaw, zombieChunkColors(z.kind), { vx: v.vx * heavy, vy: Math.min(9, v.vy * heavy), vz: v.vz * heavy }, n);
    this.fx.burst(this.tmp.c.set(z.x, z.y + 0.9 * z.scale, z.z), 6, { color: 0xbdb3a0, color2: 0xe8e0d0, speed: 2.5, up: 2, size: 0.18, life: 0.5, gravity: 4 });
    this.crumbleSfx = true;
  }

  // ---- ロケットだんの はこ（ひろうと よびだん +1）----
  spawnPickup(x, y, z, n) {
    while (this.pickups.length >= MAX_PICKUPS) this.releasePickup(this.pickups.shift());
    let pu = this.cratePool.pop();
    if (!pu) pu = { mdl: makeRocketCrate(this.fxTex.glow) };
    pu.x = x; pu.z = z; pu.y = groundHeight(x, z, 0.1, y + 0.3, this.pCol); pu.age = 0; pu.n = n; pu.fullT = 0;
    pu.drop = 0.5; // ポンと とびだす
    pu.mdl.group.position.set(x, pu.y + 1, z); pu.mdl.group.visible = true;
    this.scene.add(pu.mdl.group);
    this.pickups.push(pu);
  }
  releasePickup(pu) { this.scene.remove(pu.mdl.group); this.cratePool.push(pu); }
  updatePickups(dt) {
    const g = this.guns.rocket;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pu = this.pickups[i], M = pu.mdl;
      pu.age += dt; pu.fullT -= dt;
      if (pu.age >= PICKUP_LIFE) { this.releasePickup(pu); this.pickups.splice(i, 1); continue; }
      const pop = Math.max(0, pu.drop - pu.age) / pu.drop; // さいしょ ポンと はねる
      const bob = 0.15 + Math.sin(pu.age * 3) * 0.08 + Math.sin((1 - pop) * Math.PI) * 0.9 * (pu.age < pu.drop ? 1 : 0);
      M.group.position.set(pu.x, pu.y + bob, pu.z);
      M.spin.rotation.y += dt * 1.8;
      M.ring.position.y = 0.03 - bob;
      const pulse = 0.7 + Math.sin(pu.age * 6) * 0.25;
      M.glow.material.opacity = pulse; M.ring.material.opacity = pulse * 0.8;
      M.group.visible = pickupVisible(pu.age);
      if (this.state !== 'play') continue;
      const d = Math.hypot(this.pos.x - pu.x, this.pos.z - pu.z);
      if (d < PICKUP_R && Math.abs(this.pos.y - pu.y) < 1.6) {
        const got = addRocketAmmo(g, pu.n);
        if (got > 0) {
          pu.n -= got;
          this.hud.kill(`ロケット +${got}`, true);
          this.sfx.pickup?.();
          this.fx.burst(this.tmp.c.set(pu.x, pu.y + 0.4, pu.z), 12, { color: 0xffd060, color2: 0xfff2b0, speed: 2.5, up: 2.5, size: 0.1, life: 0.5, gravity: 2 });
          this.pushHud(true);
          if (pu.n <= 0) { this.releasePickup(pu); this.pickups.splice(i, 1); continue; }
        } else if (pu.fullT <= 0) {
          this.hud.kill('ロケットは いっぱい', false); pu.fullT = 3;
        }
      }
    }
  }

  // ---- そうび ----
  // settings.gear から みため と のうりょく を つくりなおす
  refreshGear(init = false) {
    const gear = this.settings.gear || (this.settings.gear = normalizeGear(null));
    const items = equippedItems(gear).filter(Boolean).map((g) => ({ slot: g.slot, colorHex: gearColor(g.color).hex, rarity: g.rarity }));
    applyGear(this.p, items);
    const prevMax = this.maxHp || 100;
    this.gearFx = gearEffects(gear, this.settings);
    this.maxHp = this.gearFx.maxHp;
    if (!init && this.hp != null) {
      if (this.maxHp > prevMax) this.hp += this.maxHp - prevMax;
      this.hp = Math.min(this.maxHp, this.hp);
      this.pushHud(true);
    }
  }
  spawnGear(x, y, z, item) {
    while (this.gearDrops.length >= 3) this.releaseGear(this.gearDrops.shift());
    let gd = this.gearPool.pop();
    if (!gd) gd = { mdl: makeGearDrop(this.fxTex.glow) };
    const rar = rarityOf(item.rarity);
    gd.mdl.set(gearColor(item.color).hex, parseInt(rar.color.slice(1), 16), item.rarity === 'l');
    gd.item = item; gd.x = x; gd.z = z; gd.y = groundHeight(x, z, 0.1, y + 0.3, this.pCol); gd.age = 0;
    gd.mdl.group.position.set(x, gd.y + 1, z); gd.mdl.group.visible = true;
    this.scene.add(gd.mdl.group);
    this.gearDrops.push(gd);
    if (item.rarity !== 'n') this.hud.kill(`${rar.name}の そうびが おちた！`, true);
  }
  releaseGear(gd) { this.scene.remove(gd.mdl.group); this.gearPool.push(gd); }
  updateGearDrops(dt) {
    for (let i = this.gearDrops.length - 1; i >= 0; i--) {
      const gd = this.gearDrops[i], M = gd.mdl;
      gd.age += dt;
      if (gd.age >= GEAR_LIFE) { this.releaseGear(gd); this.gearDrops.splice(i, 1); continue; }
      const bob = 0.18 + Math.sin(gd.age * 3) * 0.08 + (gd.age < 0.5 ? Math.sin(gd.age / 0.5 * Math.PI) * 0.9 : 0);
      M.group.position.set(gd.x, gd.y + bob, gd.z);
      M.spin.rotation.y += dt * 2.2;
      M.ring.position.y = 0.03 - bob; M.beam.position.y = 2 - bob;
      const pulse = 0.7 + Math.sin(gd.age * 6) * 0.25;
      M.glow.material.opacity = pulse; M.ring.material.opacity = pulse * 0.8;
      M.group.visible = gd.age < GEAR_LIFE - 5 || Math.floor(gd.age * 6) % 2 === 0;
      if (this.state !== 'play') continue;
      const d = Math.hypot(this.pos.x - gd.x, this.pos.z - gd.z);
      if (d < PICKUP_R && Math.abs(this.pos.y - gd.y) < 1.6) {
        this.hud.gearFound?.(gd.item);
        this.sfx.pickup?.();
        const c = parseInt(rarityOf(gd.item.rarity).color.slice(1), 16);
        this.fx.burst(this.tmp.c.set(gd.x, gd.y + 0.4, gd.z), 16, { color: c, color2: 0xffffff, speed: 2.8, up: 2.8, size: 0.11, life: 0.6, gravity: 2 });
        this.releaseGear(gd); this.gearDrops.splice(i, 1);
      }
    }
  }

  // ---- まいフレーム ----
  update(dt, inp) {
    this.frameDt = dt;
    const playing = this.state === 'play';
    // ヒットストップ・スローモーション（あそびの ときだけ）
    if (playing) {
      if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.08; }
      else if (this.slowT > 0) { this.slowT -= dt; dt *= this.slowT > 0.18 ? 0.3 : lerp(1, 0.3, this.slowT / 0.18); }
    }
    if (this.state === 'title') { this.titleT += dt; this.pFloor = 0; this.pSupport = null; this.updateCull(); this.updateZombies(dt); this.updateTitleCam(dt); this.updateNight(); this.fx.update(dt); return; }
    if (this.state === 'pause') return;
    if (this.state === 'over') { this.updateOjiHud(); this.updateRobotHud(); this.updateCopHud(); this.updateSuitHud(); this.updateShells(dt); this.updateVehicles(dt); this.updateRockets(dt); this.updateMissiles(dt); this.updateZombies(dt); this.updatePickups(dt); this.fx.update(dt); this.updateCamera(dt, false); this.updateNight(); return; }

    const gun = this.guns[this.cur], w = gun.w || WEAPONS[this.cur];
    // イベント
    for (const ev of inp.events) {
      if (this.suit && this.suitEvent(ev)) continue; // v0.10.0
      if (ev === 'reload') { if (startReload(gun)) this.onReloadStart(); }
      else if (ev === 'jump') { if (this.onGround) { this.vy = 7.2; this.onGround = false; } }
      else if (ev.startsWith('w:')) this.switchWeapon(ev.slice(2));
      else if (ev === 'next' || ev === 'prev' || ev === 'swap') {
        const i = WEAPON_ORDER.indexOf(this.cur), n = WEAPON_ORDER.length;
        this.switchWeapon(WEAPON_ORDER[(i + (ev === 'prev' ? n - 1 : 1)) % n]);
      } else if (ev === 'pause') { this.hud.pause(); return; }
    }
    // ねらい
    this.aimAmt = lerp(this.aimAmt, inp.aim && !this.suit ? 1 : 0, Math.min(1, dt * 12));
    const target = this.crosshairTarget();
    const slow = (target >= 0 ? 0.65 : 1) * (1 - this.aimAmt * 0.45) * aimSensMul(this.cur, this.aimAmt); // v0.8.0: スコープは もっと ゆっくり
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
    const speed = lerp(4.7, 2.5, this.aimAmt) * (gun.reloading > 0 ? 0.85 : 1) * weaponMoveMul(gun) * this.gearFx.speedMul * (this.zapT > 0 && !this.suit ? ZOMBIES.electric.zap.slow : 1) * (this.suit ? SUIT.speedMul : 1);
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
      nx = Math.max(-this.half + 0.5, Math.min(this.half - 0.5, r.x)); nz = Math.max(-this.half + 0.5, Math.min(this.half - 0.5, r.z));
    }
    if (this.suit) this.pk.set(0, 0, 0); // スーツは ふっとばされない
    // ボスに ふっとばされた ぶん
    if (this.pk.x || this.pk.z) {
      const r = collideCircle(nx + this.pk.x * dt, nz + this.pk.z * dt, PLAYER_R, this.pos.y, this.pCol);
      nx = Math.max(-this.half + 0.5, Math.min(this.half - 0.5, r.x)); nz = Math.max(-this.half + 0.5, Math.min(this.half - 0.5, r.z));
      const k = Math.exp(-4 * dt); this.pk.x *= k; this.pk.z *= k;
      if (Math.abs(this.pk.x) + Math.abs(this.pk.z) < 0.1) this.pk.set(0, 0, 0);
    }
    this.pos.x = nx; this.pos.z = nz;
    if (dt > 0) { V.x = (nx - ox - this.pk.x * dt) / dt; V.z = (nz - oz - this.pk.z * dt) / dt; } // ほんとうに うごいた ぶんだけ（かべに おしつけない）
    const vx = V.x, vz = V.z;
    this.moveAmt = Math.min(1, Math.hypot(vx, vz) / 4.7);
    // はしご: ゾーンの なかで まえに すすむと のぼる
    const lad = this.ladders.length ? this.ladderAt(this.pos.x, this.pos.y, this.pos.z) : null; // v0.8.0: みはりだいの はしごは どの マップでも
    this.onLadder = !!(lad && inp.my > 0.2);
    const wasG = this.onGround;
    if (this.onLadder) { this.vy = 3.4; this.onGround = false; } else this.vy -= 20 * dt;
    this.pos.y += this.vy * dt;
    const gh = groundHeight(this.pos.x, this.pos.z, PLAYER_R, this.pos.y + 0.001, this.pCol);
    if (this.pos.y <= gh) { if (!this.onGround && this.vy < -4) this.landT = 0.15; this.pos.y = gh; this.vy = 0; this.onGround = true; }
    else if (wasG && this.vy <= 0 && this.pos.y - gh < 0.36) { this.pos.y = gh; this.vy = 0; this.onGround = true; } // かいだんを おりる（ぴょんぴょん しない）
    else if (this.pos.y > gh + 0.05) this.onGround = false;
    if (lad && !this.onLadder && this.vy < 0 && inp.my > -0.2 && this.pos.y > lad.base + 0.2) this.vy = Math.max(this.vy, -1.2); // はしごに つかまって ゆっくり おりる
    this.walkPhase += dt * Math.hypot(vx, vz) * 2.2;
    // あしおと
    const stepN = Math.floor(this.walkPhase / Math.PI);
    if (stepN !== this.stepPh) { this.stepPh = stepN; if (this.onGround && this.moveAmt > 0.3) this.sfx.step?.(); }

    // ぶき
    if (this.swapT > 0) this.swapT -= dt;
    const evr = updateGun(gun, gun.reloading > 0 ? dt * this.gearFx.reloadMul : dt);
    if (evr === 'reloaded') { this.pushHud(true); }
    for (const id of WEAPON_ORDER) if (id !== this.cur) updateGun(this.guns[id], this.guns[id].reloading > 0 ? dt * this.gearFx.reloadMul : dt);
    let held = inp.fire;
    if (this.settings.autoFire && target >= 0) {
      held = true;
      if (!w.auto && gun.cooldown <= 0) gun.lastTrigger = false;
    }
    // ミニガン: まわしてから うつ（うってない ぶきは とまる）
    for (const id of WEAPON_ORDER) if (WEAPONS[id].spinUp) spinGun(this.guns[id], id === this.cur && held && this.swapT <= 0, dt);
    if (w.spinUp) { const sp = gun.spin; if (sp > 0.02 && held) this.sfx.spin?.(sp); }
    if (this.suit) this.updateSuitFire(dt, held); // v0.10.0: スーツの ぶき
    else if (this.swapT <= 0) {
      const res = tryFire(gun, held);
      if (res === 'fire') { this.fireShot(); this.pushHud(true); }
      else if (res === 'reload') this.onReloadStart();
      else if (res === 'empty') this.sfx.empty();
    }
    if (!this.suit && gun.ammo === 0 && gun.reloading === 0 && gun.reserve > 0 && !held) { if (startReload(gun)) this.onReloadStart(); }

    // HP かいふく
    this.updateHazards(dt);
    this.regenDelay -= dt;
    if (this.regenDelay <= 0 && this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + dt * 8); this.pushHud(); }

    // いま たっている ゆか（ゾンビが のぼる めやす）
    this.pFloor = groundHeight(this.pos.x, this.pos.z, PLAYER_R, this.pos.y + 0.001, this.pCol);
    this.pSupport = this.pFloor > 0.3 ? supportBox(this.pos.x, this.pos.z, PLAYER_R, this.pFloor, this.pCol) : null;
    this.updateWaves(dt);
    this.updateTod(dt);
    this.updateRockets(dt);
    this.updateMissiles(dt);
    this.updatePerch(dt);
    this.updateZombies(dt);
    this.updateOji(dt);
    this.updateRobot(dt);
    this.updateCop(dt);
    this.updateSuit(dt);
    this.updateVehicles(dt);
    this.updatePickups(dt);
    this.updateGearDrops(dt);
    this.updateCull();
    this.updatePlayerAnim(dt);
    this.updateCamera(dt, true);
    this.updateOjiHud();
    this.updateRobotHud();
    this.updateCopHud();
    this.updateSuitHud();
    this.updateNight();
    this.fx.update(dt);
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) { this.pushHud(); this.hudT = 0.1; }
  }

  onReloadStart() {
    this.magDropped = false;
    this.sfx.reload(this.cur, this.guns[this.cur].w.reload);
    this.pushHud(true);
  }

  crosshairTarget() {
    if (!this.camBaseQ) return -1;
    const A = this.tmp, d = A.a.set(0, 0, -1).applyQuaternion(this.camBaseQ);
    const o = A.b.copy(this.camera.position);
    const hit = castShot(o.x, o.y, o.z, d.x, d.y, d.z, this.zombies, this.sCol, this.guns[this.cur].w.range);
    this.hud.crossTarget(hit.kind === 'zombie');
    return hit.kind === 'zombie' ? hit.index : -1;
  }

  updatePlayerAnim(dt) {
    const P = this.p, gun = this.guns[this.cur], w = gun.w || WEAPONS[this.cur], wo = this.weapons[this.cur];
    P.root.position.copy(this.pos);
    P.root.rotation.y = this.yaw;
    if (wo.barrels) wo.barrels.rotation.z += (gun.spin || 0) * 42 * dt; // ミニガンの つつが まわる
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
      } else if (w.revolver) {
        // v0.9.0: シリンダーを よこに だして からを 6こ だす → こめて もどす
        const out = t < 0.15 ? t / 0.15 : t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.12);
        wo.mag.position.x -= out * 0.06;
        if (t > 0.22 && !this.magDropped) { this.magDropped = true; for (let i = 0; i < 6; i++) this.fx.casing(wo.mag, 'pistol', A_RIGHT.set(-Math.cos(this.yaw) * 0.3, -0.6, Math.sin(this.yaw) * 0.3)); }
        if (t > 0.4 && t < 0.78) P.armL.rotation.x = -Math.sin(((t - 0.4) / 0.38) * Math.PI) * 0.9;
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
    // v0.8.0: スナイパーの ボルト（ひいて もどす・からが でる）
    if (this.boltT > 0) {
      this.boltT -= dt;
      const B0 = w.bolt || 0.9, bt = 1 - this.boltT / B0;
      const pull = bt > 0.3 ? Math.sin(((bt - 0.3) / 0.7) * Math.PI) : 0;
      if (wo.bolt) wo.bolt.position.z = wo.boltRest + pull * 0.09;
      if (this.boltCase && bt > 0.55) { this.boltCase = false; this.fx.casing(wo.eject, 'sniper', A_RIGHT.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))); }
    }
    // ねらう ときは まんなかへ
    H.position.x = lerp(0.3, 0.22, this.aimAmt);
  }

  updateCamera(dt, playing) {
    const cam = this.camera, A = this.tmp;
    const aim = this.aimAmt;
    // v0.8.0: スナイパー だけ スコープ（ズーム・くろい まる・ゆっくり ゆれる）
    const scoped = playing !== false && this.state === 'play' && !this.suit && isScoped(this.cur, aim);
    // v0.10.0: スーツの ときは カメラを うしろへ ひく
    const sk = this.suitCamK = approach(this.suitCamK || 0, this.suit ? 1 : 0, 3, dt);
    if (scoped !== this.scopedOn) { this.scopedOn = scoped; this.hud.scope?.(scoped); }
    cam.fov = scoped ? SCOPE.fov : Math.max(aimFov(this.cur, aim), this.cur === 'sniper' ? 46 : 0); cam.updateProjectionMatrix();
    this.swayT = (this.swayT || 0) + dt;
    const sw = scoped ? scopeSway(this.swayT, 1, this.moveAmt > 0.2) : { x: 0, y: 0 };
    const yaw = this.yaw + this.recoilY + sw.x, pitch = this.pitch + this.recoilP + sw.y - SUIT.camPitch * sk; // スーツ: たかい ところから すこし したを みる
    this.recoilY *= Math.max(0, 1 - dt * 8);
    const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const sh = lerp(lerp(0.95, 0.68, aim), SUIT.cam.side, sk);
    // カメラは プレイヤーを なめらかに おいかける（よこは すばやく・たては ゆっくり）
    const F = this.follow || (this.follow = this.pos.clone());
    F.x = approach(F.x, this.pos.x, 30, dt); F.z = approach(F.z, this.pos.z, 30, dt); F.y = approach(F.y, this.pos.y, 12, dt);
    if (F.distanceToSquared(this.pos) > 4) F.copy(this.pos);
    const bob = this.onGround ? Math.sin(this.walkPhase * 2) * 0.022 * this.moveAmt * (1 - aim) - this.landT * 0.5 : 0;
    this.shoulder = (this.shoulder || v3()).set(F.x + rx * sh, F.y + lerp(lerp(2.02, 1.82, aim), SUIT.cam.height, sk) + bob, F.z + rz * sh);
    const want = scoped ? 0.02 : lerp(lerp(3.2, 1.6, aim), SUIT.cam.dist, sk);
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
    this.p.root.visible = this.camDist > 0.55 && !this.suit;
    this.followSun();
  }

  updateTitleCam(dt) {
    const t = this.titleT * 0.12;
    this.pos.set(0, 0, 4); this.yaw = this.yawT = Math.PI * 0.08; this.pitch = this.pitchT = 0.02;
    this.updatePlayerAnim(dt);
    const cam = this.camera;
    cam.fov = 55; cam.updateProjectionMatrix();
    this.kigaeK = approach(this.kigaeK || 0, this.kigae ? 1 : 0, 6, dt);
    const k = this.kigaeK;
    if (k > 0.001) { this.yaw = Math.PI * 0.08 * (1 - k) + k * Math.sin(this.titleT * 0.7) * 0.75; this.p.root.rotation.y = this.yaw; }
    // きがえ／そうび: まえから ぜんしん（がめんの みぎがわ。ひだりは パネル）
    cam.position.set(lerp(-1.1 + Math.sin(t) * 0.5, 0.95, k), lerp(1.65, 1.15, k), lerp(1.5, 0.95, k));
    cam.lookAt(lerp(-0.55, 1.05, k), lerp(1.3, 1.0, k), 4.0);
    this.camBaseQ = (this.camBaseQ || new THREE.Quaternion()).copy(cam.quaternion);
    this.followSun();
  }

  followSun() {
    this.sun.target.position.set(this.pos.x, 0, this.pos.z);
    this.sun.position.copy(this.sun.target.position).add(this.sunOff);
  }

  pushHud(force) {
    const g = this.guns[this.cur], w = g.w || WEAPONS[this.cur];
    this.hud.set({
      hp: Math.ceil(this.hp), maxHp: this.maxHp, ammo: g.ammo, mag: w.mag, reserve: g.reserve, weapon: this.cur,
      reloading: g.reloading > 0 ? 1 - g.reloading / w.reload : -1, wave: this.wave, left: this.remaining(), score: this.score,
      spread: currentSpread(w, { moving: this.moveAmt > 0.2, aiming: this.aimAmt > 0.5, airborne: !this.onGround, bloom: g.bloom }),
      fov: this.camera.fov, aim: this.aimAmt, guns: this.guns, lv: g.lv || 1, suit: this.suit ? this.suit.weapon : null,
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
Object.assign(Game.prototype, AllyMixin, RobotMixin, CopMixin, VehicleMixin, SuitMixin, MissileMixin);
