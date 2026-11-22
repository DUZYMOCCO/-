/**
 * ABYSS DIVE — 深淵潜航 のゲーム本体（描画・更新・入力・音をすべて内包）。
 *
 * 工房の他ゲームと同じく、ハブから動的 import され init() で起動する。
 * createAbyssDive({ canvas, onGameOver }) を呼ぶと、その canvas に描き込み、
 * 停止・破棄までを自分で管理する（DOM の生成は呼び出し側の index.js が行う）。
 */

import { createExplore } from './explore.js?v=13';
import { createBase } from './base.js?v=3';
import { DIVE_BASE, baseMarker, baseStage, baseDockNear } from './base-rules.js?v=2';
import { createResourceLedger, RESOURCE_KEY } from './resources.js?v=2';
import { createUpgradeStore, createUpgradePanel, effectiveStats, visualScale, UPGRADE_KEY } from './upgrade-rules.js?v=1';
import { storage } from '../../common/js/storage.js';

export function createAbyssDive(opts) {
  'use strict';
  const options = opts || {};
  const canvas = options.canvas;
  const onGameOver = options.onGameOver;

  /* 破棄時に外すリスナーを記録しておく（ハブへ戻ったあと動き続けないように） */
  const _listeners = [];
  function on(target, type, fn, opt) {
    target.addEventListener(type, fn, opt);
    _listeners.push([target, type, fn, opt]);
  }
  const errors = [];
  let running = false;


  /* =====================================================================
     ABYSS DIVE — 深淵潜航
     深海横スクロール潜水艇アクション（Canvas 2D / 依存ライブラリなし）
     ===================================================================== */

  /* ------------------------------------------------------------------ *
   * 0. Canvas / viewport
   * ------------------------------------------------------------------ */
  const VW = 1280, VH = 720;                 // logical resolution
  const cvs = canvas;
  const ctx = cvs.getContext('2d', { alpha: false });
  const LIGHT_SCALE = 0.5;
  const darkCv = document.createElement('canvas');
  darkCv.width = VW * LIGHT_SCALE;
  darkCv.height = VH * LIGHT_SCALE;
  const dctx = darkCv.getContext('2d');

  const view = { dpr:1, cssW:0, cssH:0, scale:1, ox:0, oy:0 };
  function resize(){
    // Limit high-density backing stores to keep mobile fill cost bounded.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const host = (cvs.parentElement && cvs.parentElement.clientHeight) ? cvs.parentElement : document.body;
    const w = Math.max(320, host.clientWidth || window.innerWidth);
    const h = Math.max(240, host.clientHeight || window.innerHeight);
    view.dpr = dpr; view.cssW = w; view.cssH = h;
    cvs.width  = Math.round(w * dpr);
    cvs.height = Math.round(h * dpr);
    cvs.style.width  = w + 'px';
    cvs.style.height = h + 'px';
    view.scale = Math.min(w / VW, h / VH);
    view.ox = (w - VW * view.scale) * 0.5;
    view.oy = (h - VH * view.scale) * 0.5;
    buildUI();
  }
  on(window, 'resize', resize);
  on(window, 'orientationchange', () => setTimeout(resize, 120));

  /* ------------------------------------------------------------------ *
   * 1. Utils
   * ------------------------------------------------------------------ */
  const TAU = Math.PI * 2;
  const rnd   = (a, b) => a + Math.random() * (b - a);
  const rint  = (a, b) => Math.floor(a + Math.random() * (b - a));
  const pick  = a => a[(Math.random() * a.length) | 0];
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const d2    = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx*dx + dy*dy; };
  const angNorm = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  let seed = 1337;
  const srnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  function loadArt(file) {
    const img = new Image();
    img.src = new URL('../assets/' + file, import.meta.url).href;
    return img;
  }
  const ruinsArt = loadArt('sunken-city.webp');
  const subArt = loadArt('submersible-09.webp');
  const leviathanArt = loadArt('leviathan.webp');
  const pilotTitleArt = loadArt('pilot-smug.webp');
  const pilotArt = loadArt('pilot-neutral.webp');
  const pilotHurtArt = loadArt('pilot-hurt.webp');
  const mineArt = loadArt('organic-mine.webp');
  const hermitArt = loadArt('hermit-tank.webp');
  const hermitDormantArt = loadArt('hermit-tank-dormant.webp');
  const gunnerArt = loadArt('squid-gunner.webp');
  /* v1.6.0 徒歩探索: アセット倉庫 bot-commander/assets/suit の既存素材から生成した歩行アトラス
     （v1.8.0: 8コマ歩行＋歩き出し＋調査を 1 枚のアトラスに。射撃は上半身を別途） */
  const suitWalkArt = loadArt('suit_walk.webp');
  const suitShootUpperArt = loadArt('suit_shoot_upper.webp');
  const suitShootBodyArt = loadArt('suit_shoot_body.webp');   // v1.10.1: 腕を抜いた射撃の体（腕は upper を切り抜いて回す）
  /* v1.9.0 徒歩探索の地上敵（倉庫 bot-commander/assets/enemies の G06。休眠と活動の 2 枚） */
  const foeArt = loadArt('G06.webp');
  const foeDormantArt = loadArt('G06_dormant.webp');
  /* v1.10.0: 海底基地。室内は倉庫 hangar（縦長）を切り出し、エリーは倉庫 GIRL の idle/walk。 */
  const baseHangarArt = loadArt('base-hangar.webp');
  const ellieIdleArt = loadArt('ellie_idle.webp');
  const ellieWalkArt = loadArt('ellie_walk.webp');
  const ready = img => img.complete && img.naturalWidth > 0;

  function makeTexture(width, height, paint) {
    const tile = document.createElement('canvas');
    tile.width = width;
    tile.height = height;
    paint(tile.getContext('2d'));
    return tile;
  }

  // Shared lamp position in hull-local coordinates. Darkness and scattering
  // use the same two origins as the visible lamps.
  const LAMP_X = 59;
  const LAMP_Y = 17;
  const BEAM_LENGTH = 640;
  const BEAM_HALF_HEIGHT = 170;
  const beamTexture = makeTexture(320, 170, g => {
    // Soft across the cone as well as along it. Bake once at half resolution.
    const pixels = g.createImageData(320, 170);
    for (let y = 0; y < pixels.height; y++) {
      for (let x = 0; x < pixels.width; x++) {
        const u = x / pixels.width;
        const edge = 1.8 + u * 79;
        const spread = Math.abs(y - 85) / edge;
        const strength = Math.pow(Math.max(0, 1 - spread * spread), 2.6);
        const falloff = Math.pow(1 - u, 2) * (0.72 + 0.28 * Math.sin(Math.PI * u));
        const at = (y * pixels.width + x) * 4;
        pixels.data[at] = 246 - 52 * u;
        pixels.data[at + 1] = 229 - 34 * u;
        pixels.data[at + 2] = 157 - 12 * u;
        pixels.data[at + 3] = 164 * strength * falloff;
      }
    }
    g.putImageData(pixels, 0, 0);
  });

  const bubbleTexture = makeTexture(32, 32, g => {
    const edge = g.createRadialGradient(16, 16, 6, 16, 16, 15);
    edge.addColorStop(0, 'rgba(26,67,73,0.04)');
    edge.addColorStop(0.75, 'rgba(100,165,182,0.30)');
    edge.addColorStop(0.89, 'rgba(181,226,234,0.60)');
    edge.addColorStop(1, 'rgba(125,200,220,0)');
    g.fillStyle = edge;
    g.fillRect(0, 0, 32, 32);
    g.fillStyle = 'rgba(218,246,250,0.66)';
    g.beginPath(); g.ellipse(11, 8, 5, 2, -0.55, 0, TAU); g.fill();
  });

  let leviathanSkin;
  function getLeviathanSkin(g) {
    if (!leviathanSkin && ready(leviathanArt)) {
      const tile = makeTexture(128, 96, skin => {
        skin.drawImage(leviathanArt, 640, 0, 256, 192, 0, 0, 128, 96);
      });
      leviathanSkin = g.createPattern(tile, 'repeat');
    }
    return leviathanSkin;
  }

  /* ------------------------------------------------------------------ *
   * 2. Audio (fully synthesised — no external assets)
   * ------------------------------------------------------------------ */
  const AU = {
    ctx:null, master:null, ambGain:null, ambFilt:null, rumbleGain:null,
    on:false, muted:false, voices:0, lastShot:0,

    init(){
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      const c = this.ctx;

      this.master = c.createGain(); this.master.gain.value = 0.5;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 14; comp.ratio.value = 7;
      comp.attack.value = 0.004; comp.release.value = 0.22;
      this.master.connect(comp); comp.connect(c.destination);

      const len = Math.floor(c.sampleRate * 2);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;

      // --- ambient drone -------------------------------------------------
      this.ambGain = c.createGain(); this.ambGain.gain.value = 0;
      this.ambFilt = c.createBiquadFilter();
      this.ambFilt.type = 'lowpass'; this.ambFilt.frequency.value = 240; this.ambFilt.Q.value = 0.8;
      this.ambFilt.connect(this.ambGain); this.ambGain.connect(this.master);
      [54, 54.7, 81.2].forEach((f, i) => {
        const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth';
        o.frequency.value = f;
        const g = c.createGain(); g.gain.value = i === 2 ? 0.12 : 0.3;
        o.connect(g); g.connect(this.ambFilt); o.start();
      });
      const ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true;
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 480; nf.Q.value = 0.5;
      const ng = c.createGain(); ng.gain.value = 0.55;
      ns.connect(nf); nf.connect(ng); ng.connect(this.ambGain); ns.start();
      this.ambGain.gain.setTargetAtTime(0.16, c.currentTime, 2.0);

      // --- persistent boss rumble ---------------------------------------
      const ro = c.createOscillator(); ro.type = 'sine'; ro.frequency.value = 34;
      const rl = c.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 90;
      this.rumbleGain = c.createGain(); this.rumbleGain.gain.value = 0;
      ro.connect(rl); rl.connect(this.rumbleGain); this.rumbleGain.connect(this.master);
      ro.start();

      this.on = true;
      this.setDepth(0);
    },

    resume(){ this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    mute(v){ this.muted = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 0.5, this.ctx.currentTime, 0.04); },
    setDepth(t){ if (this.on) this.ambFilt.frequency.setTargetAtTime(lerp(300, 84, t), this.ctx.currentTime, 0.8); },
    setRumble(v){ if (this.on) this.rumbleGain.gain.setTargetAtTime(clamp(v, 0, 0.45), this.ctx.currentTime, 0.25); },

    _noise(dur, type, f0, f1, q, gain, delay){
      if (!this.on || this.muted) return;
      const c = this.ctx, t0 = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      s.playbackRate.value = rnd(0.85, 1.15);
      const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t0);
      f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t0); s.stop(t0 + dur + 0.05);
    },
    _tone(type, f0, f1, dur, gain, delay){
      if (!this.on || this.muted) return;
      const c = this.ctx, t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },

    shoot(){
      const now = performance.now();
      if (now - this.lastShot < 45) return;          // rate-limit to avoid clicks
      this.lastShot = now;
      this._noise(0.13, 'bandpass', 1500, 380, 1.1, 0.22);
      this._tone('sine', 240, 70, 0.11, 0.16);
    },
    boom(power){
      const p = clamp(power, 0.4, 2.2);
      this._noise(0.55 * p, 'lowpass', 1100, 90, 0.7, 0.42);
      this._tone('sine', 110, 32, 0.6 * p, 0.34);
      this._noise(0.25, 'highpass', 1800, 900, 0.5, 0.14, 0.02);
    },
    hit(){ this._noise(0.07, 'bandpass', 2400, 1200, 1.4, 0.13); },
    pick(){ this._tone('sine', 680, 1360, 0.14, 0.18); this._tone('sine', 1020, 2040, 0.12, 0.1, 0.06); },
    hurt(){ this._tone('sawtooth', 200, 52, 0.34, 0.24); this._noise(0.22, 'lowpass', 700, 120, 0.9, 0.2); },
    ping(){ this._tone('sine', 1250, 1180, 1.1, 0.16); this._tone('sine', 1250, 900, 0.9, 0.07, 0.35); },
    warp(){ this._tone('sine', 90, 300, 0.5, 0.2); this._noise(0.4, 'bandpass', 300, 1600, 0.8, 0.16); },
    creak(){ this._noise(rnd(0.5, 1.1), 'lowpass', rnd(240, 420), 120, 2.2, 0.07); },
    alarm(){ this._tone('square', 780, 760, 0.18, 0.10); this._tone('square', 620, 600, 0.18, 0.10, 0.22); }
  };

  /* ------------------------------------------------------------------ *
   * 3. Input  (mouse+keyboard  /  touch)
   * ------------------------------------------------------------------ */
  const Input = {
    mode:'mouse',
    keys:{},
    mx:VW * 0.78, my:VH * 0.5,
    fireQueued:false,          // セミオート: 押した瞬間の1発だけを予約する
    wantMissile:false, wantDash:false, wantSonar:false, wantPause:false,
    wantDock:false,            // v1.6.0: 遺跡へ降りる／戻る（E・パッドA・画面ボタン）
    wantShoot:false,           // v1.8.0: 探索中の射撃（J/Z・画面ボタン。押した瞬間だけ）
    fireMouseHeld:false,
    fireHeld:false,            // v1.8.2: 魚雷の押しっぱなし連射（専用ボタン/左クリック/J/Z）
    shootHeld:false,           // v1.8.2: 徒歩射撃の押しっぱなし連射（専用ボタン/J/Z）
    pad:{ x:0, action:false, actionEdge:false },   // v1.6.0: ゲームパッド
    stick:{ active:false, id:null, ox:0, oy:0, x:0, y:0, dx:0, dy:0, r:78 },
    ui:[],
    hitBtn:null, btnTouch:{},
  };
  function buildUI(){
    Input.ui = [
      { id:'fire',    x:VW-118, y:VH-118, r:76, label:'撃つ',     col:'#ffe08a' },
      { id:'missile', x:VW-266, y:VH-126, r:52, label:'ミサイル', col:'#ffb14a' },
      { id:'dash',    x:VW-136, y:VH-282, r:48, label:'回避',     col:'#66e0ff' },
      { id:'sonar',   x:VW-262, y:VH-286, r:44, label:'ソナー',   col:'#8affd0' },
      { id:'pause',   x:VW-46,  y:56,     r:30, label:'',         col:'#9fb6c8' },
    ];
  }
  function toLogical(clientX, clientY){
    return {
      x: (clientX - view.ox) / view.scale,
      y: (clientY - view.oy) / view.scale
    };
  }
  function btnAt(x, y){
    for (const b of Input.ui) if (d2(x, y, b.x, b.y) < (b.r + 18) * (b.r + 18)) return b;
    return null;
  }
  function pressBtn(id){
    if (id === 'fire') Input.fireQueued = true;
    else if (id === 'missile') Input.wantMissile = true;
    else if (id === 'dash') Input.wantDash = true;
    else if (id === 'sonar') Input.wantSonar = true;
    else if (id === 'pause') Input.wantPause = true;
  }

  function syncFireHold(){
    const keys = Input.keys.KeyJ || Input.keys.KeyZ;
    const touch = Object.values(Input.btnTouch).includes('fire');
    Input.fireHeld = !G.exploreOn && !G.baseOn && G.state === 'play' && !!(keys || touch || Input.fireMouseHeld);
    Input.shootHeld = G.exploreOn && !!(keys || touch);
  }

  function clearFireHold(){
    Input.fireHeld = Input.shootHeld = Input.fireMouseHeld = false;
    Input.fireQueued = Input.wantShoot = false;
    delete Input.keys.KeyJ; delete Input.keys.KeyZ;
    for (const id of Object.keys(Input.btnTouch)) if (Input.btnTouch[id] === 'fire') delete Input.btnTouch[id];
  }

  /* --- keyboard ------------------------------------------------------- */
  on(window, 'keydown', e => {
    if (e.repeat) return;
    Input.mode = 'mouse';
    Input.keys[e.code] = true;
    if (e.code === 'KeyJ' || e.code === 'KeyZ') {
      if (G.exploreOn) Input.wantShoot = true;
      else if (G.baseOn) { /* 基地内は射撃しない（入力を持ち込まない） */ delete Input.keys[e.code]; }
      else if (G.state === 'play') Input.fireQueued = true;
      else delete Input.keys[e.code];
      syncFireHold();
    }
    if (e.code === 'KeyK' || e.code === 'KeyL') Input.wantMissile = true;
    if (e.code === 'Space') { Input.wantDash = true; e.preventDefault(); }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') Input.wantSonar = true;
    if (e.code === 'KeyP' || e.code === 'Escape') Input.wantPause = true;
    if (e.code === 'KeyM') { AU.resume(); AU.mute(!AU.muted); }
    if (e.code === 'KeyE' || e.code === 'Enter') Input.wantDock = true;   // v1.6.0: 降艇／調べる／戻る
    if (e.code === 'KeyR' && G.state === 'dead') startGame();
  });
  on(window, 'keyup', e => {
    Input.keys[e.code] = false;
    /* v1.8.2: 射撃キーを離したらホールド解除（J/Z 両方を見て、片方だけ離しても続く） */
    if (e.code === 'KeyJ' || e.code === 'KeyZ') {
      syncFireHold();
    }
  });
  on(window, 'blur', () => { Input.keys = {}; Input.stick.active = false; Input.stick.dx = Input.stick.dy = 0; clearFireHold(); });

  /* --- mouse ---------------------------------------------------------- */
  on(cvs, 'mousemove', e => {
    Input.mode = 'mouse';
    const p = toLogical(e.clientX, e.clientY);
    Input.mx = p.x; Input.my = p.y;
  });
  on(cvs, 'mousedown', e => {
    AU.resume();
    if (G.exploreOn || G.baseOn) return;      // v1.6.0: 探索中はマウスで潜航の射撃予約をしない（PCはE）
    Input.mode = 'mouse';
    const p = toLogical(e.clientX, e.clientY);
    Input.mx = p.x; Input.my = p.y;
    if (e.button === 0) {
      const b = btnAt(p.x, p.y);
      if (G.state !== 'play') { clickScreen(); return; }
      if (b) {
        pressBtn(b.id);
        if (b.id !== 'fire') return;
      } else Input.fireQueued = true;
      Input.fireMouseHeld = true;
      syncFireHold();
    } else if (e.button === 2) { Input.wantMissile = true; }
  });
  /* v1.8.2: キャンバス外で離してもホールドを解除する */
  on(window, 'mouseup', e => { if (e.button === 0) { Input.fireMouseHeld = false; syncFireHold(); } });
  on(cvs, 'contextmenu', e => e.preventDefault());

  /* --- touch ---------------------------------------------------------- */
  function touchStart(e){
    AU.resume();
    Input.mode = 'touch';
    /* v1.6.0 徒歩探索中は探索側でタッチを捌く（スティックは Input.stick を共用） */
    if (G.exploreOn) { explore.touchStart(e); return; }
    if (G.baseOn) { base.touchStart(e); return; }
    /* タイトル / ゲームオーバー / ポーズ中は、どこをタップしても画面送り */
    if (G.state !== 'play') { clickScreen(); e.preventDefault(); return; }
    for (const t of e.changedTouches) {
      const p = toLogical(t.clientX, t.clientY);
      /* v1.6.0: 入口近くの「降艇」ボタン（潜航の既存ボタンには影響しない）。v1.10.0: 基地の「入港」も同じ位置。 */
      if ((G.entranceNear || G.baseNear) && d2(p.x, p.y, DOCK_BTN.x, DOCK_BTN.y) < (DOCK_BTN.r + 22) * (DOCK_BTN.r + 22)) {
        Input.btnTouch[t.identifier] = 'dock'; Input.wantDock = true; continue;
      }
      const b = btnAt(p.x, p.y);
      if (b) {
        Input.btnTouch[t.identifier] = b.id;
        pressBtn(b.id);
        /* v1.8.2: 「撃つ」ボタンは指を置いている間ホールド（他の指の解放では止めない） */
        if (b.id === 'fire') syncFireHold();
        continue;
      }
      if (!Input.stick.active && p.x < VW * 0.66) {
        Input.stick.active = true; Input.stick.id = t.identifier;
        Input.stick.ox = p.x; Input.stick.oy = p.y;
        Input.stick.x = p.x; Input.stick.y = p.y;
        Input.stick.dx = Input.stick.dy = 0;
      } else {
        Input.mx = p.x; Input.my = p.y;
        Input.fireQueued = true;    // セミオート: 画面タップで魚雷1発
      }
    }
    if (!Input.stick.active && e.touches.length === 1 && clickScreen()) { /* consumed by title/dead */ }
    e.preventDefault();
  }
  function touchMove(e){
    for (const t of e.changedTouches) {
      const p = toLogical(t.clientX, t.clientY);
      if (Input.stick.active && t.identifier === Input.stick.id) {
        Input.stick.x = p.x; Input.stick.y = p.y;
        let dx = p.x - Input.stick.ox, dy = p.y - Input.stick.oy;
        const m = Math.hypot(dx, dy), mx = Input.stick.r;
        if (m > mx) { Input.stick.ox += (dx / m) * (m - mx); Input.stick.oy += (dy / m) * (m - mx); dx = dx / m * mx; dy = dy / m * mx; }
        Input.stick.dx = dx / mx; Input.stick.dy = dy / mx;
      } else {
        Input.mx = p.x; Input.my = p.y;
      }
    }
    e.preventDefault();
  }
  function touchEnd(e){
    for (const t of e.changedTouches) {
      if (Input.stick.active && t.identifier === Input.stick.id) {
        Input.stick.active = false; Input.stick.id = null;
        Input.stick.dx = Input.stick.dy = 0;
      }
      const id = Input.btnTouch[t.identifier];
      if (id) delete Input.btnTouch[t.identifier];
      if (id === 'fire') syncFireHold();
    }
    e.preventDefault();
  }
  on(cvs, 'touchstart', touchStart, { passive:false });
  on(cvs, 'touchmove',  touchMove,  { passive:false });
  on(cvs, 'touchend',   touchEnd,   { passive:false });
  on(cvs, 'touchcancel',touchEnd,   { passive:false });

  /* ------------------------------------------------------------------ *
   * 4. Game state
   * ------------------------------------------------------------------ */
  const G = {
    state:'title',           // title | play | pause | dead
    time:0, dt:0,
    player:null, boss:null,
    enemies:[], bullets:[], ebullets:[], parts:[], rocks:[], spires:[],
    pickups:[], floats:[], lights:[], silh:[], rings:[], ruins:[], impacts:[],
    camX:0, camY:0, shake:0, shakeX:0, shakeY:0,
    score:0, kills:0, combo:0, comboT:0, bossKills:0,   /* score は互換のデバッグ値（UI・保存とは分ける） */
    resource:0,                                          /* v1.10.0: 表示する資源残高（ledger の写し） */
    genX:0, nextBossAt:0, dist:0, best:0,
    warnMsg:'', warnT:0, flash:0, hurtFlash:0, slowmo:0,
    deathT:0, creakT:0, spawnT:1, genRuinX:0, inkT:0,
    exploreOn:false, entranceNear:false,   // v1.6.0 徒歩探索
    baseOn:false, baseNear:false, baseMarker:null,   // v1.10.0 海底基地
  };

  /* v1.10.0: 資源（スコアに代わる保存値）。独自キーで保存し、ハブの BEST SCORE とは別系統。
     localStorage が無い環境（node テスト）では no-op にして安全に動かす。 */
  const hasStore = (typeof localStorage !== 'undefined');
  const ledger = createResourceLedger({
    load: () => hasStore ? storage.get(RESOURCE_KEY, 0) : 0,
    save: (v) => { if (hasStore) storage.set(RESOURCE_KEY, v); },
  });
  G.resource = ledger.total();

  /* v1.11.0: 艇の整備・改造（永続、資源とは別キー）。未購入の性能は現行同等（BASE_STATS）。 */
  const upgrades = createUpgradeStore({
    load: () => hasStore ? storage.get(UPGRADE_KEY, null) : null,
    save: (v) => { if (hasStore) storage.set(UPGRADE_KEY, v); },
  });
  G.stats = effectiveStats(upgrades.levels());

  /* 購入・修理の効果を艇へ一度だけ適用する（艇の性能のみ。描画や敵には影響しない）。 */
  function applyToShip(act){
    G.stats = effectiveStats(upgrades.levels());
    const p = G.player;
    if (!p) return;
    if (act.type === 'repair'){
      p.hp = Math.min(p.maxHp, p.hp + Math.max(0, act.amount || 0));
      return;
    }
    const prevMax = p.maxHp;
    p.maxHp = G.stats.maxHp;
    if (p.maxHp > prevMax) p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - prevMax));
    else p.hp = Math.min(p.maxHp, p.hp);
  }

  /* 船のそばの整備端末のパネル（選択／確認／閉じる）。資源の減算はパネル側で一度だけ。 */
  const upgradePanel = createUpgradePanel({
    store: upgrades,
    ledger,
    getHp: () => ({ hp: G.player ? G.player.hp : 0, maxHp: G.player ? G.player.maxHp : G.stats.maxHp }),
    onApply: applyToShip,
  });

  const LAYER_TOP = 0, LAYER_TWILIGHT = 420, LAYER_MID = 980, LAYER_ABYSS = 1700;
  const FLOOR_Y = 2600;
  const RAY_PARALLAX = 0.6;
  const seaFloorY = x => FLOOR_Y + Math.sin(x * 0.013) * 30 - 30;

  /* v1.6.0 徒歩探索の入口（潜航側）。序盤 x の浅い位置に置き、深潜り無しで触れられる。 */
  const DIVE_ENTRANCE = { x: 1450, y: 430, r: 78 };
  const DOCK_BTN = { x: VW - 96, y: VH * 0.46, r: 62 };   // 入口近くのタッチ「降艇」ボタン

  function depthT(y){ return clamp(y / FLOOR_Y, 0, 1); }
  function zoneName(y){
    if (y < 300) return '表層';
    if (y < 900) return '中深層';
    if (y < 1700) return '漸深層';
    if (y < 2300) return '深海層';
    return '超深海';
  }

  /* ------------------------------------------------------------------ *
   * 5. FX helpers
   * ------------------------------------------------------------------ */
  function part(x, y, vx, vy, o){
    if (G.parts.length > 700) G.parts.shift();
    G.parts.push(Object.assign({
      x, y, vx, vy, life:0.6, max:0.6, size:3, col:'#9fe8ff',
      drag:1.6, grav:0, glow:0, kind:'dot', rot:0, vr:0
    }, o || {}));
  }
  function bubbles(x, y, n, spread, up){
    for (let i = 0; i < n; i++) {
      part(x + rnd(-spread, spread), y + rnd(-spread, spread),
           rnd(-24, 24), -rnd(20, 70) * (up === undefined ? 1 : up),
        { life:rnd(0.7, 1.9), max:1.9, size:rnd(1.5, 4.2), col:'rgba(180,235,255,0.75)',
          drag:0.6, glow:0.25, kind:'bubble' });
    }
  }
  function explode(x, y, r, power){
    G.shake = Math.min(30, G.shake + power * 3.4);
    G.lights.push({ x, y, r:r * 3.4, life:0.42, max:0.42, col:'#ffe6b0' });
    G.rings.push({ x, y, r:r * 0.35, speed:r * 7.5, life:0.36, max:0.36, col:'rgba(255,193,125,0.25)', w:Math.max(2, r * 0.075) });
    const n = Math.min(60, 14 + Math.round(power * 9));
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), s = rnd(40, 60 + power * 190);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s, {
        life:rnd(0.25, 0.8), max:0.8, size:rnd(2, 6.5),
        col:pick(['#fff4c4','#ffd166','#ff9a3c','#ff6b2b','#ff3d00']),
        drag:3.2, glow:1, kind:'spark'
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = rnd(0, TAU), s = rnd(10, 70);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s - 18, {
        life:rnd(0.9, 2.1), max:2.1, size:rnd(10, 26),
        col:'rgba(40,50,60,0.5)', drag:1.0, glow:0.0, kind:'smoke'
      });
    }
    bubbles(x, y, 10, r * 0.3, 1);
  }

  /* v1.7.0: ミサイル着弾の演出。魚雷の小爆発と差別化する。
     画面全体を明るく塗る長いフラッシュは使わず、白熱した小さい核＋橙の火花＋
     水中の膨張衝撃波・泡で「着弾の強さ」を出す（揺れも音も既存の上限内で少し強め）。 */
  function missileBurst(x, y, R){
    const r = R || 110;
    /* 短く適度な画面揺れ（上限30のうち控えめ。フラッシュは焚かない） */
    G.shake = Math.min(24, G.shake + 12);
    /* 白熱した小さい核（短命・小さめの光）＋強さを伝える暖色のにじみ */
    G.lights.push({ x, y, r:64, life:0.2, max:0.2, col:'#ffffff' });
    G.lights.push({ x, y, r:190, life:0.45, max:0.45, col:'#ffdc96' });
    /* 水中の膨張衝撃波（リング2枚。暖色→青白で水を押し広げる） */
    G.rings.push({ x, y, r:14, speed:r * 6.4, life:0.46, max:0.46, col:'rgba(255,226,172,0.5)', w:6 });
    G.rings.push({ x, y, r:8, speed:r * 4.2, life:0.68, max:0.68, col:'rgba(150,216,255,0.34)', w:3 });
    /* 白熱の小さい核の火花（速くて小さい） */
    for (let i = 0; i < 14; i++){
      const a = rnd(0, TAU), s = rnd(120, 340);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s,
        { life:rnd(0.12, 0.3), max:0.3, size:rnd(1.6, 3.6), col:'#fffdf2', drag:3.4, glow:1, kind:'spark' });
    }
    /* 橙の火花（着弾を強調） */
    for (let i = 0; i < 34; i++){
      const a = rnd(0, TAU), s = rnd(60, 320);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s,
        { life:rnd(0.3, 0.9), max:0.9, size:rnd(2, 6.5),
          col:pick(['#fff4c4','#ffd166','#ff9a3c','#ff6b2b','#ff3d00']), drag:3.0, glow:1, kind:'spark' });
    }
    /* 巻き上がる煙と水中の泡 */
    for (let i = 0; i < 8; i++){
      const a = rnd(0, TAU), s = rnd(12, 60);
      part(x, y, Math.cos(a) * s, Math.sin(a) * s - 20,
        { life:rnd(0.8, 1.7), max:1.7, size:rnd(12, 28), col:'rgba(38,48,58,0.5)', drag:1.0, kind:'smoke' });
    }
    bubbles(x, y, 18, r * 0.34, 1);
  }
  function floatText(x, y, txt, col, size){
    G.floats.push({ x, y, txt, col:col || '#ffe9a8', size:size || 22, life:1.1, max:1.1, vy:-34 });
  }
  /* v1.10.0: 資源の獲得。G.score は互換のデバッグ値として残し、表示・保存は資源（ledger）を使う。 */
  function addResource(v, x, y, txt){
    G.score += v;                       // 互換のデバッグ値
    ledger.add(v);
    G.resource = ledger.total();
    if (x !== undefined) floatText(x, y, txt || ('+' + v), '#ffe9a8', txt ? 26 : 20);
  }
  /* 同じ潜航内で同じ源（遺物・地上敵の撃破など）からは一度だけ。 */
  function addResourceOnce(id, v){
    if (!ledger.awardOnce(id, v)) return false;
    G.score += v;
    G.resource = ledger.total();
    return true;
  }

  /* ------------------------------------------------------------------ *
   * 6. Player
   * ------------------------------------------------------------------ */
  function makePlayer(){
    return {
      x:520, y:520, vx:0, vy:0, aim:0, aimTarget:null,
      hp:G.stats.maxHp, maxHp:G.stats.maxHp, r:24,
      heat:0, over:false, fireCd:0,
      missiles:8, maxMissiles:14, missileCd:0,
      dashCd:0, dashT:0, sonarCd:0, inv:0, alive:true,
      thrust:0, tilt:0, hurtT:0, sonarR:0, recoil:0,
    };
  }
  function playerUpdate(dt){
    const p = G.player;
    if (!p.alive) return;

    /* --- movement input --- */
    let ix = 0, iy = 0;
    if (Input.keys['KeyA'] || Input.keys['ArrowLeft'])  ix -= 1;
    if (Input.keys['KeyD'] || Input.keys['ArrowRight']) ix += 1;
    if (Input.keys['KeyW'] || Input.keys['ArrowUp'])    iy -= 1;
    if (Input.keys['KeyS'] || Input.keys['ArrowDown'])  iy += 1;
    if (Input.stick.active) { ix += Input.stick.dx; iy += Input.stick.dy; }
    const im = Math.hypot(ix, iy);
    if (im > 1) { ix /= im; iy /= im; }
    p.thrust = Math.hypot(ix, iy);

    const ACC = G.stats.accel, MAXV = G.stats.maxSpeed;
    const cruiseDrag = 3.1 * 360 / MAXV;
    const alongDrag = Math.exp(-cruiseDrag * dt);
    const brakeDrag = Math.exp(-G.stats.drag * dt);
    p.vx += ix * ACC * dt;
    p.vy += iy * ACC * dt;
    p.vy -= 26 * dt;                              // slight buoyancy
    // 運動性は横滑り・逆方向の速度だけを早く落とす。巡航速度とは別の改造。
    const ux = p.thrust ? ix / p.thrust : 0, uy = p.thrust ? iy / p.thrust : 0;
    const forward = Math.max(0, p.vx * ux + p.vy * uy);
    p.vx = p.vx * brakeDrag + ux * forward * (alongDrag - brakeDrag);
    p.vy = p.vy * brakeDrag + uy * forward * (alongDrag - brakeDrag);
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > MAXV) { p.vx = p.vx / sp * MAXV; p.vy = p.vy / sp * MAXV; }

    /* --- dash --- */
    p.dashCd = Math.max(0, p.dashCd - dt);
    const dashPressed = Input.wantDash;
    Input.wantDash = false;
    if (dashPressed && p.dashCd <= 0) {
      p.dashCd = 1.35; p.dashT = 0.16; p.inv = Math.max(p.inv, 0.4);
      const a = im > 0 ? Math.atan2(iy, ix) : p.tilt;
      p.vx += Math.cos(a) * 780; p.vy += Math.sin(a) * 780;
      G.shake = Math.min(16, G.shake + 6);
      AU.warp(); bubbles(p.x, p.y, 16, 16, 0);
    }
    p.dashT = Math.max(0, p.dashT - dt);

    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = Math.max(60, p.x);
    p.y = clamp(p.y, 46, FLOOR_Y - 60);

    /* --- 射出方向。船体とライトの傾きは移動で決まる。 --- */
    p.aimTarget = Input.mode === 'touch' ? lockTarget() : null;
    if (Input.mode === 'mouse') {
      Input.mx = clamp(Input.mx, -20, VW + 20);
      p.aim = Math.atan2(Input.my - (p.y - G.camY), Input.mx - (p.x - G.camX));
    } else if (p.aimTarget) {
      p.aim = Math.atan2(p.aimTarget.y - p.y, enemyAimX(p.aimTarget) - p.x);
    } else {
      p.aim = 0;
    }
    p.tilt = lerp(p.tilt, clamp(p.vy / 400, -0.5, 0.5), dt * 6);

    /* --- weapons --- */
    p.fireCd -= dt; p.missileCd -= dt;
    const heatRate = p.over ? -0.62 : -0.40;
    p.heat = clamp(p.heat + heatRate * dt, 0, 1);
    if (p.over && p.heat <= 0.18) p.over = false;

    /* 魚雷: 押した瞬間の1発＋押しっぱなし中は発射間隔ごとに連射（熱・過熱はそのまま効く）。
       離した瞬間にホールドが切れるので、進行中の1発以外は新たに撃たない。 */
    const wantFire = Input.fireQueued || Input.fireHeld;
    Input.fireQueued = false;
    if (wantFire && !p.over && p.fireCd <= 0) { p.fireCd = 0.075; fireTorpedo(p); }
    if (Input.wantMissile) { Input.wantMissile = false; fireMissile(p); }

    /* --- sonar --- */
    p.sonarCd = Math.max(0, p.sonarCd - dt);
    if (Input.wantSonar) {
      Input.wantSonar = false;
      if (p.sonarCd <= 0) {
        p.sonarCd = 5.0; p.sonarR = 1;
        AU.ping();
        for (const e of G.enemies) {
          const dd = Math.hypot(e.x - p.x, e.y - p.y);
          if (dd < 820) { e.stun = Math.max(e.stun, 1.3); damageEnemy(e, 1.2, 0, 0); }
        }
        G.lights.push({ x:p.x, y:p.y, r:900, life:0.6, max:0.6, col:'#8affd0' });
      }
    }
    if (p.sonarR > 0) { p.sonarR += dt * 2.4; if (p.sonarR > 4.2) p.sonarR = 0; }

    /* --- invuln / engine fx --- */
    p.inv = Math.max(0, p.inv - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.recoil = Math.max(0, p.recoil - dt * 5.5);
    if (p.thrust > 0.15 && Math.random() < Math.min(1, dt * 42)) {
      const a = Math.atan2(-iy, -ix);
      part(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 34 + p.tilt * 10,
           Math.cos(a) * rnd(24, 70) + p.vx * 0.18, -rnd(45, 100) + p.vy * 0.12,
        { life:rnd(0.65, 1.35), max:1.35, size:rnd(2, 6.2), col:'rgba(190,235,255,0.7)', drag:0.5, glow:0, kind:'bubble' });
    }

    /* --- depth ambience --- */
    const dt2 = depthT(p.y);
    AU.setDepth(dt2);
    if (dt2 > 0.55) {
      G.creakT -= dt;
      if (G.creakT <= 0) { G.creakT = rnd(3.5, 9); AU.creak(); }
    }
  }

  function lockTarget(){
    const p = G.player; if (!p) return null;
    let best = null, bd = 1e9;
    let small = null, sd = 1100 ** 2;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dd = d2(enemyAimX(e), e.y, p.x, p.y);
      if (e.kind === 'minnow') {
        if (dd < sd) { sd = dd; small = e; }
        continue;
      }
      if (dd < bd) { bd = dd; best = e; }
    }
    if (G.boss && !G.boss.dead) return G.boss;
    return bd <= 1100 ** 2 ? best : small;
  }

  function fireTorpedo(p){
    const a = p.aim;
    const offset = shotOffset(p, 40);
    const mx = p.x + Math.cos(a) * offset, my = p.y + Math.sin(a) * offset;
    G.bullets.push({
      kind:'torp', x:mx, y:my, vx:Math.cos(a) * 900, vy:Math.sin(a) * 900,
      a, life:1.5, dmg:G.stats.torpedoDmg, r:6, aoe:34, trail:0,
      /* v1.7.0: 発射時に前方近傍の標的を1つだけ決める（継続誘導はこの標的のみ） */
      target:pickTorpedoTarget(p, a)
    });
    p.heat = clamp(p.heat + 0.058, 0, 1);
    if (p.heat >= 1) { p.over = true; AU.alarm(); }
    p.recoil = Math.min(1.4, p.recoil + 0.4);
    G.shake = Math.min(14, G.shake + 1.5);
    AU.shoot();
    for (let i = 0; i < 4; i++) {
      const sa = a + rnd(-0.5, 0.5);
      part(mx, my, Math.cos(sa) * rnd(80, 320), Math.sin(sa) * rnd(80, 320),
        { life:rnd(0.08, 0.2), max:0.2, size:rnd(2, 5), col:'#ffd77a', drag:5, glow:1, kind:'spark' });
    }
  }

  function fireMissile(p){
    if (p.missiles <= 0 || p.missileCd > 0) { if (p.missiles <= 0) AU.alarm(); return; }
    p.missiles--; p.missileCd = 0.42;
    const a = p.aim;
    /* v1.11.0: ミサイル威力のランクで「弾体の見た目」が大きくなる。命中判定は先端側へ寄せ、
       半径は控えめ（見た目に比べて広げすぎず、自艇や発射直後に当たらない）。 */
    const vscale = visualScale('missilePower', upgrades.level('missilePower'));
    const offset = shotOffset(p, 26) + 26 * (vscale - 1); // 尾翼の後端を従来の射出位置に揃える
    G.bullets.push({
      kind:'missile', x:p.x + Math.cos(a) * offset, y:p.y + Math.sin(a) * offset,
      vx:Math.cos(a) * 300, vy:Math.sin(a) * 300,
      a, life:4.2, dmg:G.stats.missileDmg, r:Math.min(15, 9 + (vscale - 1) * 1.2), aoe:G.stats.missileBlast,
      turn:4.2, speed:330, smoke:0, target:p.aimTarget,
      vscale, hitAhead: vscale > 1 ? Math.round(14 * vscale) : 0
    });
    G.shake = Math.min(18, G.shake + 4);
    AU.warp(); AU.boom(0.5);
    bubbles(p.x, p.y, 8, 12, 1);
  }

  function shotOffset(p, max){
    const t = p.aimTarget;
    return t ? Math.min(max, Math.hypot(enemyAimX(t) - p.x, t.y - p.y) * 0.5) : max;
  }

  function hurtPlayer(dmg, srcx, srcy){
    const p = G.player;
    if (!p.alive || p.inv > 0) return;
    p.hp -= dmg; p.inv = 0.85; p.hurtT = 0.35;
    G.shake = Math.min(26, G.shake + dmg * 0.9);
    G.hurtFlash = Math.min(1, G.hurtFlash + 0.5);
    AU.hurt();
    const a = srcx !== undefined ? Math.atan2(p.y - srcy, p.x - srcx) : rnd(0, TAU);
    p.vx += Math.cos(a) * 180; p.vy += Math.sin(a) * 180;
    for (let i = 0; i < 14; i++) {
      const sa = a + rnd(-0.8, 0.8);
      part(p.x, p.y, Math.cos(sa) * rnd(60, 260), Math.sin(sa) * rnd(60, 260),
        { life:rnd(0.2, 0.6), max:0.6, size:rnd(2, 5), col:'#ff6b4a', drag:3, glow:1, kind:'spark' });
    }
    if (p.hp <= 0) killPlayer();
  }
  function killPlayer(){
    const p = G.player;
    p.hp = 0; p.alive = false;
    G.state = 'dead'; G.deathT = 0;
    G.flash = 1;
    explode(p.x, p.y, 70, 2.2);
    AU.boom(2.2); AU.setRumble(0);
    G.best = Math.max(G.best, G.score);
    Input.fireQueued = false;
    if (onGameOver) { try { onGameOver(G.score); } catch (e) { console.warn(e); } }
  }
  function healPlayer(v){
    const p = G.player;
    p.hp = Math.min(p.maxHp, p.hp + v);
    floatText(p.x, p.y - 40, '船体修復 +' + v, '#7dffb0', 22);
  }

  /* ------------------------------------------------------------------ *
   * 7. Enemies
   * ------------------------------------------------------------------ */
  const isBoss = e => e.kind === 'leviathan' || e.kind === 'squid';
  const fishBody = {
    minnow:{ length:54, height:20 },
    hunter:{ length:54, height:20 },
    angler:{ length:128, height:46 },
  };
  function enemyAimX(e){
    const body = fishBody[e.kind];
    return body ? e.x - e.dir * body.length * 0.4 : e.x;
  }
  /* v1.8.1: ボスの頭の当たり判定。描いた頭の形（ローカル座標・進行方向の逆側）に
     沿わせた円。頭の1点を中心にした巨大な透明円は使わない（何も描いていない空間に
     当たってしまうため）。x は頭側が負。 */
  function leviathanProfile(u, H){
    const shoulder = clamp((u - 0.17) / 0.40, 0, 1);
    return Math.sin(Math.pow(u, 0.68) * Math.PI) * H * (1 - u * 0.22)
      * (0.38 + 0.38 * shoulder * shoulder * (3 - 2 * shoulder));
  }
  const BOSS_HEAD = {
    leviathan: [[-370, -2, 116], [-300, -2, 116], [-230, -10, 114], [-160, -9, 102], [-95, 1, 98], [-30, 8, 92]],
    squid:     [[-8, 0, 100], [25, 0, 99], [55, 0, 90], [80, 0, 64], [96, 0, 32]],
  };
  /* v1.8.1: 巨大イカの危険な触腕（クラブ付きの長い2本）の当たり判定。
     drawSquid と同じ式・同じ太さで描いた線に沿わせる（攻撃中＝'whip' のときだけ使う）。 */
  function squidWhipTouch(e, tx, ty, tr){
    const W = e.W, t = e.t;
    const arm = Math.max(0, e.arm);
    const reach = e.reach * (0.75 + arm * 1.2);
    const len = reach * 1.32;
    const flip = e.dir < 0 ? -1 : 1;
    for (const sgn of [-1, 1]){
      const y0 = sgn * W * 0.36;
      for (let s = 0; s <= 10; s++){
        const u = s / 10;
        const lx = 62 + u * len;
        const ly = y0 * 0.72 + (u > 0
          ? Math.sin(u * 2.8 - t * 3.0 + (sgn > 0 ? 1.6 : 0)) * len * 0.13 * u + e.whiplash * len * u * 0.9
          : 0);
        const rr = (s === 10 ? 26 : 12) + tr;   /* 先端クラブ(約30x12)／本線(lineWidth 12) */
        if (d2(e.x + flip * lx, e.y + ly, tx, ty) < rr * rr) return true;
      }
    }
    return false;
  }
  const HERMIT_SIZE = 150;
  const HERMIT_RANGE = 560;
  const HERMIT_CHARGE = 0.45;
  const HERMIT_MUZZLE_X = 69;
  const HERMIT_MUZZLE_Y = -96;
  const GUNNER_MUZZLE_X = 70;
  const GUNNER_MUZZLE_Y = -25;
  const GUNNER_CHARGE = 0.65;

  /* v1.7.0: ミサイルの吹き飛ばし と 魚雷の弱い誘導。
     ミサイルは爆心の普通の敵を放射状に飛ばす（ボスと海底固定はダメージのみ）。
     魚雷は発射時に前方近傍の標的を1つだけ選び、そこへミサイルより明確に弱く寄る。 */
  const MISSILE_KNOCK = 640;         // 爆心の敵へ与える放射速度（px/s）。距離減衰する
  const MISSILE_KNOCK_STUN = 0.42;   // 吹き飛び中は短く制御を外して飛ばす
  const TORP_TURN = 1.1;             // 魚雷の誘導角速度（rad/s）。ミサイル4.2より明確に弱い
  const TORP_CONE = 0.42;            // 発射時に狙う前方コーン（rad, 約24°）
  const TORP_RANGE = 1000;           // 誘導候補の最大距離
  const TORP_MAX_OFF = 0.6;          // 誘導中に許す最大偏角。背後へは旋回しない

  function spawnEnemy(kind, x, y){
    const d = 1 + G.dist / 26000;
    const base = {
      kind, x, y, vx:0, vy:0, t:rnd(0, 10), dir:-1, stun:0, flash:0,
      dead:false, hitCd:0, phase:0, pt:0, st:0, jaw:0, eye:0
    };
    let e;
    if (kind === 'minnow') {
      e = Object.assign(base, {
        r:9, hp:1, maxHp:1, score:10, dmg:4, speed:rnd(70, 130), dir:-1,
        wob:rnd(0, TAU), amp:rnd(8, 26), sp:rnd(0.7, 1.4), fus:rnd(0.9, 1.3)
      });
    } else if (kind === 'hunter') {
      e = Object.assign(base, { r:24, hp:5 + d * 1.6, maxHp:5 + d * 1.6, score:60, speed:rnd(150, 210), dmg:12, ang:Math.PI, turn:1.8 });
    } else if (kind === 'jelly') {
      e = Object.assign(base, { r:30, hp:3 + d, maxHp:3 + d, score:40, speed:rnd(14, 30), dmg:9, pulse:rnd(0, TAU) });
    } else if (kind === 'angler') {
      e = Object.assign(base, { r:44, hp:13 + d * 4, maxHp:13 + d * 4, score:170, speed:rnd(60, 95), dmg:17, lure:rnd(0, TAU), state:'stalk' });
    } else if (kind === 'mine') {
      e = Object.assign(base, { r:22, hp:2, maxHp:2, score:20, dmg:26, drift:rnd(0, TAU) });
    } else if (kind === 'hermit') {
      const hp = 12 + d * 4;
      e = Object.assign(base, {
        y:y - 34, r:34, hp, maxHp:hp, score:180, dmg:14,
        floorY:y, state:'dormant', st:0.85,
      });
    } else if (kind === 'gunner') {
      const hp = 10 + d * 4;
      e = Object.assign(base, { r:43, hp, maxHp:hp, score:160, dmg:10, st:1.1 });
    } else if (kind === 'leviathan') {
      const hp = 300 + G.bossKills * 150;
      e = Object.assign(base, {
        r:150, hp, maxHp:hp, score:3000, dmg:34, state:'enter', jaw:0.05, dir:-1,
        L:1180, H:250, hover:0.74, atkCd:0, flashT:0, dead:false
      });
      G.boss = e;
    } else if (kind === 'squid') {
      const hp = 280 + G.bossKills * 140;
      e = Object.assign(base, {
        r:190, hp, maxHp:hp, score:3200, dmg:26, state:'enter', dir:-1,
        L:580, W:120, hover:0.60, reach:340, arm:0, whiplash:0, inkT:0, st:2.4
      });
      G.boss = e;
    }
    G.enemies.push(e);
    return e;
  }

  function damageEnemy(e, dmg, kx, ky){
    if (e.dead) return;
    e.hp -= dmg; e.flash = 0.1;
    if (e.kind !== 'hermit' && (kx || ky)) { e.vx += kx; e.vy += ky; }
    if (e.hp <= 0) killEnemy(e);
    else if (e.kind !== 'leviathan') AU.hit();
  }

  /* v1.7.0: 吹き飛ばし。普通の敵だけ放射状に飛ばす。ボスと海底固定の戦車ヤドカリは
     ダメージのみで動かさない（既存の stun を短く借りて vx/vy で移動させる）。 */
  function knockEnemy(e, ix, iy){
    if (e.dead || isBoss(e) || e.kind === 'hermit') return;
    if (!ix && !iy) return;
    e.vx += ix; e.vy += iy;
    e.stun = Math.max(e.stun || 0, MISSILE_KNOCK_STUN);
  }

  /* v1.7.0: ミサイルの爆発。直撃は威力そのまま、周囲は爆心からの距離減衰つきで
     放射ダメージ＋吹き飛ばし。直撃した敵は周囲ループから外して二重加算を防ぐ。
     敵に当たらず地形で爆発した場合も同じ周囲効果になる（引数 enemy は null）。 */
  function missileBlast(b, x, y, directEnemy){
    const R = b.aoe || 110;
    const ba = (typeof b.a === 'number') ? b.a : 0;
    if (directEnemy && !directEnemy.dead){
      damageEnemy(directEnemy, b.dmg, 0, 0);
      knockEnemy(directEnemy, Math.cos(ba) * MISSILE_KNOCK, Math.sin(ba) * MISSILE_KNOCK);
      G.impacts.push({ x, y, life:0.26 });
    }
    for (const e of G.enemies){
      if (e === directEnemy || e.dead) continue;
      const ex = enemyAimX(e), ey = e.y;
      const dd = Math.hypot(ex - x, ey - y);
      if (dd > R) continue;
      const f = 1 - dd / R;                       // 0(外周)..1(爆心)
      damageEnemy(e, b.dmg * Math.max(0.3, f), 0, 0);
      const ux = dd > 0.001 ? (ex - x) / dd : Math.cos(ba);
      const uy = dd > 0.001 ? (ey - y) / dd : Math.sin(ba);
      const imp = MISSILE_KNOCK * (0.5 + 0.5 * f);
      knockEnemy(e, ux * imp, uy * imp);
    }
    missileBurst(x, y, R);
    AU.boom(1.8);
  }

  /* v1.7.0: 魚雷の発射時に前方近傍の生きた標的を1つ選ぶ（毎フレーム全弾×全敵の走査を避ける）。
     前方コーン (TORP_CONE) 内かつ TORP_RANGE 以内の最も近い敵のみ。海底固定は対象外。 */
  function pickTorpedoTarget(p, aim){
    let best = null, bd = TORP_RANGE * TORP_RANGE;
    for (const e of G.enemies){
      if (e.dead || e.kind === 'hermit') continue;
      const ex = enemyAimX(e), ey = e.y;
      const dd = d2(ex, ey, p.x, p.y);
      if (dd > bd) continue;
      if (Math.abs(angNorm(Math.atan2(ey - p.y, ex - p.x) - aim)) > TORP_CONE) continue;
      bd = dd; best = e;
    }
    return best;
  }

  function killEnemy(e){
    if (e.dead) return;
    e.dead = true;
    G.kills++; G.combo++; G.comboT = 1.6;
    let sc = e.score * (1 + (G.combo - 1) * 0.12);
    const gained = Math.round(sc);
    addResource(gained);
    floatText(e.x, e.y - e.r, '+' + gained, '#ffe9a8', 20 + Math.min(18, G.combo * 2));
    if (G.combo >= 4 && G.combo % 4 === 0) floatText(e.x, e.y - e.r - 28, 'MULTI x' + G.combo, '#ff9ad5', 30);

    if (isBoss(e)) {
      G.bossKills++;
      G.boss = null;
      G.flash = 0.85; G.shake = 30;
      for (let i = 0; i < 14; i++) {
        const a = rnd(0, TAU), rr = rnd(0, 300);
        G.lights.push({ x:e.x + Math.cos(a) * rr, y:e.y + Math.sin(a) * rr, r:rnd(260, 620), life:rnd(0.4, 1.0), max:1.0, col:'#ffd28a' });
      }
      for (let i = 0; i < 9; i++) setTimeout(() => {
        explode(e.x + rnd(-420, 260), e.y + rnd(-180, 180), rnd(50, 120), 2.2);
        AU.boom(2.0);
      }, i * 110);
      for (let i = 0; i < 4; i++) spawnPickup(e.x + rnd(-200, 120), e.y + rnd(-120, 120), 'missile');
      spawnPickup(e.x, e.y, 'repair');
      spawnPickup(e.x - 100, e.y + 60, 'repair');
      floatText(e.x, e.y - 200, '撃破!! ' + (e.kind === 'squid' ? 'COLOSSAL SQUID' : 'LEVIATHAN'), '#ffd0ff', 44);
      G.nextBossAt = G.player.x + 11000 + G.bossKills * 1500;
      /* v1.10.0: 初回リヴァイアサン撃破で、ボスの先に入港ルートが開く（自分で艇を進めて接岸する）。 */
      if (G.bossKills === 1){
        G.baseMarker = baseMarker(G.bossKills, e.x, e.y);
        floatText(e.x, e.y - 250, 'この先に前哨基地の灯 — 進入灯を目指せ', '#ffe0b0', 26);
        G.warnMsg = '前哨基地の進入灯を捉えた';
        G.warnT = 3.2;
      }
    } else {
      explode(e.x, e.y, e.r * (e.kind === 'angler' ? 2.4 : 1.3), e.kind === 'angler' ? 1.5 : 0.9);
      AU.boom(e.kind === 'angler' ? 1.2 : 0.6);
      if (e.kind === 'mine') {
        for (const o of G.enemies) if (o !== e && !o.dead && d2(o.x, o.y, e.x, e.y) < 160 * 160) damageEnemy(o, 4, 0, 0);
      }
      const p = G.player;
      if (e.kind === 'hunter' || e.kind === 'angler') {
        if (Math.random() < 0.24) spawnPickup(e.x, e.y, 'missile');
        else if (Math.random() < 0.12) spawnPickup(e.x, e.y, 'repair');
      }
      if (e.kind === 'jelly') {
        for (let i = 0; i < 6; i++) {
          const a = rnd(0, TAU);
          G.ebullets.push({ x:e.x, y:e.y, vx:Math.cos(a) * 190, vy:Math.sin(a) * 190, r:7, dmg:6, life:1.2, a });
        }
      }
    }
    e.hp = 0;
  }

  function spawnPickup(x, y, kind){
    G.pickups.push({ x, y, vx:rnd(-30, 30), vy:rnd(-40, -10), kind, r:14, t:rnd(0, 6), life:16 });
  }

  function enemyUpdate(e, dt){
    if (e.flash > 0) e.flash -= dt;
    e.hitCd = Math.max(0, e.hitCd - dt);
    if (e.stun > 0) e.stun -= dt;
    const p = G.player;
    if (!p) return;

    if (e.stun > 0) { e.vx *= Math.exp(-3 * dt); e.vy *= Math.exp(-3 * dt); e.x += e.vx * dt; e.y += e.vy * dt; return; }

    switch (e.kind) {
      case 'minnow': {
        e.t += dt;
        const flee = d2(e.x, e.y, p.x, p.y) < 150 * 150 ? 1 : 0;
        e.x -= (e.speed + flee * 90) * dt;
        e.y += Math.sin(e.t * e.sp + e.wob) * e.amp * dt;
        e.y += Math.sin(e.t * 2.3) * 14 * dt;
        e.vx = -e.speed;
        break;
      }
      case 'hunter': {
        const dx = p.x - e.x, dy = p.y - e.y;
        const dd = Math.hypot(dx, dy) || 1;
        if (e.state === 'idle') {
          e.ang += angNorm(Math.atan2(dy, dx) - e.ang) * Math.min(1, dt * 1.4);
          e.x += Math.cos(e.ang) * e.speed * dt; e.y += Math.sin(e.ang) * e.speed * dt;
          if (dd < 480 || e.x < G.camX + VW * 0.85) { e.state = 'wind'; e.st = 0.55; }
        } else if (e.state === 'wind') {
          e.st -= dt;
          e.ang += angNorm(Math.atan2(dy, dx) - e.ang) * Math.min(1, dt * 6);
          e.x -= Math.cos(e.ang) * 60 * dt; e.y -= Math.sin(e.ang) * 60 * dt;
          if (e.st <= 0) {
            e.state = 'dash'; e.st = 1.0;
            e.dvx = Math.cos(e.ang) * 780; e.dvy = Math.sin(e.ang) * 780;
            AU.warp();
          }
        } else if (e.state === 'dash') {
          e.st -= dt;
          e.x += e.dvx * dt; e.y += e.dvy * dt;
          e.dvx *= Math.exp(-1.1 * dt); e.dvy *= Math.exp(-1.1 * dt);
          if (Math.random() < 0.5) part(e.x, e.y, rnd(-20, 20), rnd(-20, 20), { life:0.4, max:0.4, size:2.5, col:'rgba(160,220,255,0.5)', glow:0.2 });
          if (e.st <= 0) { e.state = 'idle'; }
        }
        e.dir = Math.cos(e.ang) < 0 ? -1 : 1;
        break;
      }
      case 'jelly': {
        e.t += dt;
        e.y += Math.sin(e.t * 0.9 + e.pulse) * 26 * dt;
        e.x -= (e.speed + Math.sin(e.t * 0.4) * 12) * dt;
        if (Math.random() < 0.25) part(e.x + rnd(-14, 14), e.y + 24, rnd(-10, 10), rnd(10, 40), { life:rnd(0.5, 1.1), max:1.1, size:rnd(1.5, 3), col:'rgba(150,255,230,0.5)', glow:0.5 });
        break;
      }
      case 'angler': {
        e.t += dt; e.lure += dt * 1.6;
        const dx = p.x - e.x, dy = p.y - e.y, dd = Math.hypot(dx, dy) || 1;
        if (e.state === 'stalk') {
          e.vx = lerp(e.vx, (dx / dd) * e.speed, dt * 1.6);
          e.vy = lerp(e.vy, (dy / dd) * e.speed * 0.8 + Math.sin(e.t) * 26, dt * 1.6);
          if (dd < 420) { e.state = 'wind'; e.st = 0.7; AU.warp(); }
          if (dd > 1200) { e.vx = -60; e.vy = Math.sin(e.t) * 30; }
        } else if (e.state === 'wind') {
          e.st -= dt;
          e.vx = lerp(e.vx, -Math.cos(Math.atan2(dy, dx)) * 70, dt * 4);
          e.vy = lerp(e.vy, -Math.sin(Math.atan2(dy, dx)) * 70, dt * 4);
          if (e.st <= 0) {
            e.state = 'lunge'; e.st = 0.85; e.jaw = 1;
            const a = Math.atan2(dy, dx);
            e.vx = Math.cos(a) * 720; e.vy = Math.sin(a) * 720; AU.boom(0.7);
          }
        } else if (e.state === 'lunge') {
          e.st -= dt;
          e.vx *= Math.exp(-1.6 * dt); e.vy *= Math.exp(-1.6 * dt);
          if (e.st <= 0) { e.state = 'stalk'; e.jaw = 0; }
        }
        e.jaw = lerp(e.jaw, e.state === 'lunge' ? 1 : 0.15, dt * 7);
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.dir = p.x < e.x ? -1 : 1;
        if (Math.random() < 0.4) part(e.x + Math.cos(e.t * 2) * 40 * e.dir, e.y - 46, rnd(-8, 8), rnd(-14, 2), { life:rnd(0.4, 0.9), max:0.9, size:rnd(1.5, 3.4), col:'#bff7ff', glow:1 });
        break;
      }
      case 'mine': {
        e.t += dt;
        e.x -= 26 * dt;
        e.y += Math.sin(e.t * 0.8 + e.drift) * 22 * dt;
        break;
      }
      case 'hermit': updateHermit(e, dt, p); return;
      case 'gunner': updateGunner(e, dt, p); break;
      case 'squid': squidUpdate(e, dt, p); break;
      case 'leviathan': leviathanUpdate(e, dt, p); break;
    }

    /* keep inside vertical band */
    e.y = clamp(e.y, 60, FLOOR_Y - 40);

    /* timers */
    e.hitCd = e.hitCd;
  }

  function updateHermit(e, dt, p){
    const inRange = d2(e.x, e.y, p.x, p.y) < HERMIT_RANGE * HERMIT_RANGE;
    if (e.state === 'dormant') {
      if (!inRange && e.hp === e.maxHp) return;
      e.state = 'active';
      e.y = e.floorY - 60;
      e.r = 52;
      bubbles(e.x, e.y, 12, 26);
    }
    if (!inRange) {
      e.st = Math.max(e.st, 0.65);
      return;
    }
    e.dir = p.x < e.x ? -1 : 1;
    e.st -= dt;
    if (e.st > 0) return;

    const x = e.x + e.dir * HERMIT_MUZZLE_X;
    const y = e.floorY + HERMIT_MUZZLE_Y;
    fireEnemyShell(x, y, p, 350, 12);
    e.st = 2.1;
  }

  function updateGunner(e, dt, p){
    e.t += dt;
    e.dir = p.x < e.x ? -1 : 1;
    const dx = p.x - e.x, dy = p.y - e.y;
    const inRange = dx * dx + dy * dy < 600 ** 2;
    if (inRange) e.st -= dt;
    else e.st = Math.max(e.st, 1.1);
    const charging = e.st <= GUNNER_CHARGE;
    const speed = Math.abs(dx) > 280 ? e.dir * 136 : -e.dir * 32;
    e.x += speed * (charging ? 0.2 : 1) * dt;
    e.y += (Math.sin(e.t * 2) * 29 + clamp(dy - 45, -90, 90) * 0.42) * dt;
    if (e.st > 0) return;
    fireEnemyShell(e.x + e.dir * GUNNER_MUZZLE_X, e.y + GUNNER_MUZZLE_Y, p, 300, 10);
    e.st = 2.5;
  }

  function fireEnemyShell(x, y, p, speed, dmg){
    const a = Math.atan2(p.y - y, p.x - x);
    G.ebullets.push({ x, y, vx:Math.cos(a) * speed, vy:Math.sin(a) * speed,
      r:9, dmg, life:2.4, a, kind:'shell' });
    G.lights.push({ x, y, r:120, life:0.16, max:0.16, col:'#ffc178' });
    AU.boom(0.55);
  }

  function squidUpdate(e, dt, p){
    e.t += dt;
    e.dir = Math.sign(p.x - e.x) || -1;
    const rage = e.hp < e.maxHp * 0.45;

    switch (e.state) {
      case 'enter': {
        e.st -= dt;
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-2.0 * dt));
        e.y = lerp(e.y, p.y - 20, 1 - Math.exp(-1.6 * dt));
        e.arm = lerp(e.arm, 0, dt * 2);
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(1.2, 2.0); }
        AU.setRumble(0.3);
        break;
      }
      case 'stalk': {
        e.st -= dt;
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-1.3 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.8) * 110, 1 - Math.exp(-1.1 * dt));
        e.arm = lerp(e.arm, 0.06, dt * 2);
        e.whiplash = lerp(e.whiplash, Math.sin(e.t * 0.9) * 0.12, dt * 2);
        AU.setRumble(0.14);
        if (e.st <= 0) {
          const r = Math.random();
          if (r < 0.5) { e.state = 'whipWind'; e.st = rage ? 0.5 : 0.85; AU.alarm(); }
          else if (r < 0.8) { e.state = 'ink'; e.st = 0.7; }
          else { e.state = 'drift'; e.st = 1.4; }
        }
        break;
      }
      case 'whipWind': {
        e.st -= dt;
        e.x += 30 * dt;
        e.arm = lerp(e.arm, -0.16, dt * 5);
        e.whiplash = lerp(e.whiplash, 0, dt * 6);
        if (e.st <= 0) { e.state = 'whip'; e.st = rage ? 1.0 : 1.3; AU.boom(1.0); AU.setRumble(0.4); }
        break;
      }
      case 'whip': {
        e.st -= dt;
        e.arm = lerp(e.arm, 1, dt * 7);
        e.whiplash = Math.sin((1.3 - e.st) * (rage ? 9 : 7)) * 0.55;
        if (Math.random() < 0.9) bubbles(e.x + e.dir * 220, e.y + rnd(-140, 140), 2, 44, 1);
        if (e.st <= 0) { e.state = 'recover'; e.st = 1.0; }
        break;
      }
      case 'ink': {
        e.st -= dt;
        e.x -= 130 * dt;
        e.arm = lerp(e.arm, 0.5, dt * 3);
        if (e.st <= 0) {
          G.inkT = 2.6; AU.boom(1.2);
          for (let i = 0; i < 26; i++) {
            const a = rnd(0, TAU);
            part(e.x + e.dir * 90 + Math.cos(a) * rnd(0, 60), e.y + Math.sin(a) * rnd(0, 60),
                 Math.cos(a) * rnd(50, 260) - 120, Math.sin(a) * rnd(50, 260),
              { life:rnd(1.2, 2.6), max:2.6, size:rnd(30, 90), col:'rgba(3,5,11,0.75)', drag:1.4, kind:'ink' });
          }
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          for (let i = 0; i < 5; i++) {
            const a = base + (i - 2) * 0.2;
            G.ebullets.push({ x:e.x + e.dir * 90, y:e.y, vx:Math.cos(a) * 380, vy:Math.sin(a) * 380, r:10, dmg:10, life:3, a, kind:'barnacle' });
          }
          e.state = 'recover'; e.st = 1.0;
        }
        break;
      }
      case 'drift': {
        e.st -= dt;
        e.x -= 380 * dt;
        e.y += Math.sin(e.t * 2) * 90 * dt;
        e.arm = lerp(e.arm, 0.35, dt * 3);
        e.whiplash = Math.sin(e.t * 2.4) * 0.2;
        if (e.st <= 0) { e.state = 'recover'; e.st = 0.9; }
        break;
      }
      case 'recover': {
        e.st -= dt;
        e.arm = lerp(e.arm, 0.1, dt * 3);
        e.whiplash = lerp(e.whiplash, 0, dt * 3);
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-1.4 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.8) * 70, 1 - Math.exp(-1.2 * dt));
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(0.8, 1.6) * (rage ? 0.62 : 1); }
        break;
      }
    }
    AU.setRumble(clamp(G.shake / 30 * 0.2 + 0.14, 0, 0.4));
  }

  function leviathanUpdate(e, dt, p){
    e.t += dt;
    const dirToP = Math.sign(p.x - e.x) || -1;
    e.dir = dirToP;

    switch (e.state) {
      case 'enter': {
        e.st -= dt;
        const tx = G.camX + VW * e.hover;
        const ty = p.y - 30;
        e.x = lerp(e.x, tx, 1 - Math.exp(-2.0 * dt));
        e.y = lerp(e.y, ty, 1 - Math.exp(-1.6 * dt));
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(1.4, 2.4); }
        AU.setRumble(0.34);
        break;
      }
      case 'stalk': {
        e.st -= dt;
        const tx = G.camX + VW * e.hover;
        e.x = lerp(e.x, tx, 1 - Math.exp(-1.4 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.7) * 90, 1 - Math.exp(-1.2 * dt));
        e.jaw = lerp(e.jaw, 0.06, dt * 3);
        AU.setRumble(0.16);
        if (e.st <= 0) {
          const r = Math.random();
          const rage = e.hp < e.maxHp * 0.45;
          if (r < (rage ? 0.55 : 0.42)) { e.state = 'lungeWind'; e.st = rage ? 0.55 : 0.85; AU.alarm(); }
          else if (r < 0.8) { e.state = 'spit'; e.st = 0.6; }
          else { e.state = 'sweepWind'; e.st = 0.7; AU.alarm(); }
        }
        break;
      }
      case 'lungeWind': {
        e.st -= dt;
        e.x += 40 * dt;
        e.jaw = lerp(e.jaw, 0.14, dt * 4);
        if (e.st <= 0) {
          e.state = 'lunge'; e.st = 1.25;
          const tx = p.x + 90, ty = p.y;
          const a = Math.atan2(ty - e.y, tx - e.x);
          e.lvx = Math.cos(a) * 900; e.lvy = Math.sin(a) * 900;
          e.jaw = 1; AU.boom(1.1); AU.setRumble(0.4);
        }
        break;
      }
      case 'lunge': {
        e.st -= dt;
        e.vx = e.lvx; e.vy = e.lvy;
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.lvx *= Math.exp(-1.5 * dt); e.lvy *= Math.exp(-1.5 * dt);
        e.jaw = lerp(e.jaw, 1, dt * 10);
        if (Math.random() < 0.9) bubbles(e.x + rnd(-60, 40), e.y + rnd(-90, 90), 2, 40, 1);
        if (e.st <= 0) { e.state = 'recover'; e.st = 0.85; }
        break;
      }
      case 'sweepWind': {
        e.st -= dt;
        e.y += (p.y - e.y) * Math.min(1, dt * 2.4);
        e.x += 30 * dt;
        e.jaw = lerp(e.jaw, 0.1, dt * 3);
        if (e.st <= 0) { e.state = 'sweep'; e.st = 1.5; AU.boom(0.9); AU.setRumble(0.4); }
        break;
      }
      case 'sweep': {
        e.st -= dt;
        e.x -= 1150 * dt;
        e.y += Math.sin(e.t * 3) * 60 * dt;
        e.jaw = lerp(e.jaw, 0.35, dt * 4);
        if (Math.random() < 0.9) bubbles(e.x + rnd(-60, 40), e.y + rnd(-90, 90), 2, 40, 1);
        if (e.st <= 0) { e.state = 'recover'; e.st = 1.1; }
        break;
      }
      case 'spit': {
        e.st -= dt;
        e.jaw = lerp(e.jaw, 0.8, dt * 8);
        if (e.st <= 0) {
          const rage = e.hp < e.maxHp * 0.45;
          const n = rage ? 7 : 5;
          const base = Math.atan2(p.y - e.y, p.x - e.x);
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.16;
            G.ebullets.push({ x:e.x + Math.cos(a) * 90, y:e.y + Math.sin(a) * 90, vx:Math.cos(a) * 420, vy:Math.sin(a) * 420, r:11, dmg:11, life:3.2, a, kind:'barnacle' });
          }
          AU.boom(0.8);
          e.state = 'recover'; e.st = 1.0;
        }
        break;
      }
      case 'recover': {
        e.st -= dt;
        e.jaw = lerp(e.jaw, 0.05, dt * 3);
        e.x = lerp(e.x, G.camX + VW * e.hover, 1 - Math.exp(-1.6 * dt));
        e.y = lerp(e.y, p.y + Math.sin(e.t * 0.7) * 60, 1 - Math.exp(-1.4 * dt));
        if (e.st <= 0) { e.state = 'stalk'; e.st = rnd(0.9, 1.8) * (e.hp < e.maxHp * 0.45 ? 0.6 : 1); }
        break;
      }
    }
    AU.setRumble(clamp(G.shake / 30 * 0.2 + 0.14, 0, 0.4));
  }

  /* ------------------------------------------------------------------ *
   * 8. Collisions
   * ------------------------------------------------------------------ */
  /* 当たり判定。ボスは頭だけでなく体の芯に沿って円を並べる
     （頭の1点だけだと、でかい胴体を撃っても当たらず「無敵」に見えてしまう） */
  function enemyHit(e, x, y, r, projectile = false){
    const body = projectile && fishBody[e.kind];
    if (body) {
      const dx = (x - enemyAimX(e)) / (body.length * 0.43 + r);
      const dy = (y - e.y) / (body.height * 0.82 + r);
      return dx * dx + dy * dy < 1;
    }
    if (e.kind === 'leviathan' || e.kind === 'squid') {
      /* 頭は「描いた頭」に沿った円で判定（頭の1点を中心にした巨大な透明円は使わない） */
      const flip = e.dir < 0 ? -1 : 1;
      for (const h of BOSS_HEAD[e.kind]) {
        const hx = e.x + flip * h[0];
        const hy = e.y + h[1];
        const hr = h[2] + r;
        if (d2(x, y, hx, hy) < hr * hr) return true;
      }
      /* 胴は背骨に沿って円を並べる（描画と同じ式） */
      const N = 12;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        let prof, wig;
        if (e.kind === 'leviathan') {
          prof = leviathanProfile(u, e.H);
          wig  = Math.sin(u * 3.6 - e.t * 2.1) * e.L * 0.055 * Math.pow(u, 1.5);
        } else {
          prof = e.W * Math.pow(1 - u, 0.72) * (0.72 + 0.48 * Math.sin(u * Math.PI));
          wig  = Math.sin(u * 3.0 - e.t * 1.8) * e.W * 0.14 * Math.pow(u, 1.3);
        }
        const cx = e.x - e.dir * u * e.L;
        const cy = e.y + wig;
        const cr = Math.max(e.kind === 'leviathan' ? 42 : 46, prof * 0.90) + r;
        if (d2(x, y, cx, cy) < cr * cr) return true;
      }
      return false;
    }
    const rr = e.r + r;
    return d2(x, y, e.x, e.y) < rr * rr;
  }

  function projectileImpact(b){
    /* v1.11.0: 大型ミサイルは見た目の先端側に命中判定を合わせる（胴全体へ広げない）。 */
    const ahead = (b.kind === 'missile' && b.hitAhead) ? b.hitAhead : 0;
    const ax = ahead ? Math.cos(b.a || 0) * ahead : 0;
    const ay = ahead ? Math.sin(b.a || 0) * ahead : 0;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - b.prevX, b.y - b.prevY) / 10));
    for (let i = 0; i <= steps; i++){
      const x = lerp(b.prevX, b.x, i / steps) + ax;
      const y = lerp(b.prevY, b.y, i / steps) + ay;
      const enemy = G.enemies.find(e => !e.dead && enemyHit(e, x, y, b.r, true));
      if (enemy) return { x, y, enemy };
      if (G.rocks.some(r => d2(x, y, r.x, r.y) < (r.r + b.r) ** 2)) return { x, y, enemy:null };
    }
    return null;
  }

  function collide(){
    const p = G.player;
    if (!p || !p.alive) return;

    /* player bullets → enemies */
    for (const b of G.bullets) {
      if (b.dead) continue;
      const hit = projectileImpact(b);
      if (!hit) continue;
      const { x, y, enemy } = hit;
      b.dead = true;
      /* v1.7.0: ミサイルの着弾は爆発・吹き飛ばしを専用処理に任せる（直撃/地形で一貫） */
      if (b.kind === 'missile') {
        missileBlast(b, x, y, enemy);
        continue;
      }
      if (enemy) {
        const knockback = isBoss(enemy) ? 0 : 90;
        damageEnemy(enemy, b.dmg, Math.cos(b.a) * knockback, Math.sin(b.a) * knockback);
        G.impacts.push({ x, y, life:0.26 });
        for (const other of G.enemies) {
          if (other !== enemy && !other.dead && enemyHit(other, x, y, b.aoe, true)) {
            damageEnemy(other, b.dmg * 0.7, 0, 0);
          }
        }
      }
      explode(x, y, b.aoe, b.aoe / 42);
      AU.boom(b.aoe / 60);
    }

    /* enemies → player */
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (enemyHit(e, p.x, p.y, p.r)) {
        hurtPlayer(e.dmg, e.x, e.y);
        continue;
      }
      /* 巨大イカ：攻撃中（whip）だけ、描いている長い触腕と同じ線がダメージ判定 */
      if (e.kind === 'squid' && e.state === 'whip') {
        if (squidWhipTouch(e, p.x, p.y, p.r)) hurtPlayer(e.dmg, e.x, e.y);
      }
    }
    /* rocks → player */
    for (const r of G.rocks) {
      if (d2(r.x, r.y, p.x, p.y) < (r.r + p.r) * (r.r + p.r)) {
        const a = Math.atan2(p.y - r.y, p.x - r.x);
        p.vx += Math.cos(a) * 260; p.vy += Math.sin(a) * 260;
        hurtPlayer(9, r.x, r.y);
      }
    }
    /* enemy bullets → player */
    for (const b of G.ebullets) {
      if (d2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
        hurtPlayer(b.dmg, b.x, b.y);
        explode(b.x, b.y, 26, 0.5);
        b.dead = true;
      }
    }
    /* pickups */
    for (const k of G.pickups) {
      if (d2(k.x, k.y, p.x, p.y) < (k.r + p.r + 24) * (k.r + p.r + 24)) {
        k.dead = true; AU.pick();
        if (k.kind === 'missile') { p.missiles = Math.min(p.maxMissiles, p.missiles + 3); floatText(k.x, k.y, 'ミサイル +3', '#ffc978', 22); }
        else healPlayer(24);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 9. World generation
   * ------------------------------------------------------------------ */
  function generateTo(x){
    while (G.genX < x) {
      const cx = G.genX;
      G.genX += 460;
      const d = 1 + G.dist / 26000;

      /* background spires (parallax, non-solid) */
      if (srnd() < 0.55) {
        G.spires.push({
          x:cx + srnd() * 400, y:G.camY + VH * (0.4 + srnd() * 0.9),
          w:rnd(120, 460) * (0.6 + d * 0.2), h:rnd(200, 700),
          lay:0.55, a:0.5
        });
      }

      /* mid rocks (solid) */
      if (cx > 1500 && srnd() < 0.34 + d * 0.05) {
        const fromFloor = srnd() < 0.5;
        const r = rnd(60, 130);
        G.rocks.push({
          x:cx + srnd() * 400,
          y:fromFloor ? FLOOR_Y - rnd(0, 90) : rnd(0, 120),
          r, seed:rint(0, 9999), fromFloor
        });
      }

      /* 沈没戦車に擬態したヤドカリ。海底に沿って配置する。 */
      if (G.state === 'play' && cx >= 1840 && cx % 1840 === 0) {
        const x = cx + 230;
        spawnEnemy('hermit', x, seaFloorY(x));
      }

      /* 遠景のエイ。視差レイヤー上に置く。 */
      if (srnd() < 0.05 && G.silh.length < 2 && G.camY > 600) {
        G.silh.push({
          x:G.camX * RAY_PARALLAX + VW + rnd(260, 520),
          y:G.camY * RAY_PARALLAX + VH * rnd(0.24, 0.76),
          width:rnd(350, 520), height:rnd(100, 160), sp:-rnd(18, 55), t:rnd(0, 9)
        });
      }
    }

    /* boss trigger */
    if (G.player && G.player.x > G.nextBossAt && !G.boss && G.state === 'play') {
      const isSquid = G.bossKills % 2 === 1;
      const b = spawnEnemy(isSquid ? 'squid' : 'leviathan', G.player.x + VW * 1.35, G.player.y - 40);
      b.state = 'enter'; b.st = 2.4;
      G.warnMsg = isSquid ? '⚠ 巨大反応接近 — 触腕に警戒せよ' : '⚠ 巨大反応接近 — 総員戦闘配置';
      G.warnT = 3.2;
      AU.alarm(); AU.setRumble(0.35);
    }
  }

  /* ---- enemy wave spawner (screen-relative so foes actually show up) ---- */
  function spawnWave(){
    const p = G.player;
    if (!p || !p.alive) return;
    const d = 1 + G.dist / 26000;
    const deep = clamp((p.y - 300) / 2000, 0, 1);
    const yA = clamp(G.camY + 100, 90, FLOOR_Y - 100);
    const yB = clamp(G.camY + VH - 100, 140, FLOOR_Y - 70);
    const ry = () => rnd(Math.min(yA, yB), Math.max(yA, yB));
    const ex = () => G.camX + VW + rnd(70, 380);
    const warm = G.dist < 2400;
    const r = Math.random();
    const cap = G.enemies.length;

    if (cap < 90) {
      if (warm) {
        if (r < 0.6) {
          const cy = ry();
          for (let i = 0, k = rint(5, 10); i < k; i++) spawnEnemy('minnow', ex() + i * 36, cy + rnd(-70, 70));
        } else {
          spawnEnemy('hunter', ex(), ry());
        }
        return;
      }
      if (r < 0.22) {
        const cy = ry();
        for (let i = 0, k = rint(6, 13); i < k; i++) spawnEnemy('minnow', ex() + i * 36, cy + rnd(-80, 80));
      } else if (r < 0.22 + 0.24 * (0.5 + d * 0.5)) {
        for (let i = 0, k = rint(1, 2 + Math.round(d * 0.4)); i < k; i++) spawnEnemy('hunter', ex(), ry());
      } else if (r < 0.66) {
        const cy = ry();
        for (let i = 0, k = rint(1, 3); i < k; i++) spawnEnemy('jelly', ex(), cy + rnd(-90, 90));
      } else if (r < 0.66 + 0.17 * (0.35 + deep)) {
        spawnEnemy(deep > 0.35 && Math.random() < 0.55 ? 'gunner' : 'angler', ex() + 120, ry());
      } else if (r < 0.94) {
        for (let i = 0, k = rint(1, 3); i < k; i++) spawnEnemy('mine', ex(), ry());
      } else {
        spawnEnemy('hunter', ex(), ry());
        spawnEnemy('jelly', ex(), ry());
        spawnEnemy('mine', ex(), ry());
      }
    }
  }

  /* ---- 沈んだ古代都市の遺跡（背景・視差0.78） ---- */
  const RUIN_PAR = 0.78;
  function generateRuins(){
    const px0 = G.camX * RUIN_PAR;
    let guard = 0;
    while (G.genRuinX < px0 + VW + 900 && guard++ < 40) {
      const x = G.genRuinX;
      G.genRuinX += rnd(340, 720);
      if (Math.random() < 0.18) continue;
      const y = clamp(G.camY + VH * rnd(0.5, 1.3), 320, FLOOR_Y - 60);
      G.ruins.push({
        x, y,
        type: pick(['pillar','pillar','arch','block','temple','pillar']),
        w: rnd(100, 260), h: rnd(200, 620),
        a: rnd(0.38, 0.64), seed: rint(0, 9999), tilt: rnd(-0.05, 0.05)
      });
    }
    G.ruins = G.ruins.filter(r => r.x > px0 - 1100);
  }
  function drawRuins(camX, camY){
    ctx.save();
    ctx.translate(-camX * RUIN_PAR, -camY);
    ctx.lineJoin = 'round';
    for (const r of G.ruins) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.tilt);
      ctx.globalAlpha = r.a;
      ctx.fillStyle = '#04101a';
      ctx.strokeStyle = 'rgba(125,190,225,0.22)';
      ctx.lineWidth = 2;
      const w = r.w, h = r.h;
      if (r.type === 'pillar') {
        const cw = w * 0.34;
        ctx.beginPath();
        ctx.moveTo(-cw / 2, 0);
        ctx.lineTo(-cw / 2, -h);
        ctx.lineTo(-cw * 0.18, -h - h * 0.09);
        ctx.lineTo(cw * 0.12, -h + h * 0.04);
        ctx.lineTo(cw / 2, -h - h * 0.05);
        ctx.lineTo(cw / 2, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillRect(-cw * 0.8, -14, cw * 1.6, 16);
        ctx.strokeRect(-cw * 0.8, -14, cw * 1.6, 16);
      } else if (r.type === 'arch') {
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, -h);
        ctx.lineTo(w / 2, -h);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(w * 0.27, 0);
        ctx.lineTo(w * 0.27, -h * 0.6);
        ctx.arc(0, -h * 0.6, w * 0.27, 0, Math.PI, true);
        ctx.lineTo(-w * 0.27, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, -h * 0.93); ctx.lineTo(w / 2, -h * 0.99); ctx.lineTo(-w / 2, -h * 1.06);
        ctx.closePath(); ctx.fill();
      } else if (r.type === 'block') {
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, -h);
        ctx.lineTo(w * 0.24, -h * 1.07);
        ctx.lineTo(w / 2, -h * 0.88);
        ctx.lineTo(w / 2, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = r.a * 0.7;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath(); ctx.moveTo(-w / 2, -h * i / 4); ctx.lineTo(w / 2, -h * i / 4); ctx.stroke();
        }
      } else {
        /* temple（階段状の基壇） */
        const steps = 4;
        for (let i = 0; i < steps; i++) {
          const ww = w * (1 - i * 0.19), hh = h / steps;
          ctx.fillRect(-ww / 2, -hh * (i + 1), ww, hh * 1.03);
          ctx.strokeRect(-ww / 2, -hh * (i + 1), ww, hh * 1.03);
        }
        const tw = w * 0.28;
        ctx.fillRect(-tw / 2, -h - h * 0.22, tw, h * 0.22);
        ctx.strokeRect(-tw / 2, -h - h * 0.22, tw, h * 0.22);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function cull(){
    const left = G.camX - 1400, right = G.camX + VW + 2600;
    G.enemies = G.enemies.filter(e => !e.dead && e.x > left && (isBoss(e) ? e.x < right + 3000 : e.x < right));
    G.bullets = G.bullets.filter(b => !b.dead && b.life > 0 && b.x > left - 400 && b.x < right + 1200);
    G.ebullets = G.ebullets.filter(b => !b.dead && b.life > 0 && b.x > left - 400 && b.x < right + 1200);
    G.pickups = G.pickups.filter(k => !k.dead && k.life > 0 && k.x > left);
    G.rocks = G.rocks.filter(r => r.x > left - 600);
    G.spires = G.spires.filter(s => s.x > G.camX - 2200);
    const rayLeft = G.camX * RAY_PARALLAX;
    G.silh = G.silh.filter(s => s.x > rayLeft - 800 && s.x < rayLeft + VW + 1200);
  }

  /* ------------------------------------------------------------------ *
   * 10. Update loop
   * ------------------------------------------------------------------ */
  function update(dt){
    G.time += dt;
    G.flash = Math.max(0, G.flash - dt * 2.4);
    G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2.6);
    G.inkT = Math.max(0, G.inkT - dt);
    G.warnT = Math.max(0, G.warnT - dt);
    G.comboT = Math.max(0, G.comboT - dt);
    if (G.comboT <= 0) G.combo = 0;

    if (G.state === 'play') {
      playerUpdate(dt);
      /* weapons */
      for (const b of G.bullets) {
        b.life -= dt;
        if (b.kind === 'missile') {
          const t = lockTarget();
          if (t && (!b.target || b.target.dead)) b.target = t;
          if (b.target && !b.target.dead) {
            const want = Math.atan2(b.target.y - b.y, enemyAimX(b.target) - b.x);
            b.a += angNorm(want - b.a) * Math.min(1, dt * b.turn);
          }
          b.speed += 520 * dt;
          b.vx = Math.cos(b.a) * b.speed; b.vy = Math.sin(b.a) * b.speed;
          b.smoke -= dt;
          if (b.smoke <= 0) {
            b.smoke = 0.02;
            part(b.x, b.y, rnd(-14, 14), rnd(-14, 14), { life:rnd(0.4, 1.0), max:1.0, size:rnd(4, 9), col:'rgba(200,215,230,0.42)', drag:1.2, kind:'smoke' });
            part(b.x, b.y, rnd(-20, 20), rnd(-20, 20), { life:0.2, max:0.2, size:3.5, col:'#ffc766', glow:1, kind:'spark' });
          }
        } else {
          /* v1.7.0: 魚雷の弱い誘導。発射時に選んだ1つの標的へ、前方コーン内だけ
             弱い角速度で寄る。標的が死んだ/背後へ回ったら補正しない。 */
          const tg = b.target;
          if (tg && !tg.dead) {
            const want = Math.atan2(tg.y - b.y, enemyAimX(tg) - b.x);
            const off = angNorm(want - b.a);
            if (Math.abs(off) <= TORP_MAX_OFF) {
              const sp = Math.hypot(b.vx, b.vy) || 900;
              b.a += clamp(off, -TORP_TURN * dt, TORP_TURN * dt);
              b.vx = Math.cos(b.a) * sp; b.vy = Math.sin(b.a) * sp;   // a と vx/vy を揃える
            }
          }
          b.vx += Math.cos(b.a) * 90 * dt; b.vy += Math.sin(b.a) * 90 * dt;
          b.trail -= dt;
          if (b.trail <= 0) {
            b.trail = 0.028;
            const perp = b.a + Math.PI / 2, off = rnd(-5, 5);
            part(b.x + Math.cos(perp) * off, b.y + Math.sin(perp) * off,
                 Math.cos(perp) * off * 6 + rnd(-9, 9), Math.sin(perp) * off * 6 + rnd(-9, 9),
                 { life:rnd(0.12, 0.42), max:0.42, size:rnd(1.2, 3.8), col:'rgba(236,244,255,0.72)', glow:0.5, kind:'bubble' });
          }
        }
        b.prevX = b.x; b.prevY = b.y;
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      for (const e of G.ebullets) {
        e.life -= dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (Math.random() < 0.4) part(e.x, e.y, rnd(-10, 10), rnd(-10, 10), { life:rnd(0.2, 0.5), max:0.5, size:rnd(2, 4), col:'rgba(190,140,255,0.6)', glow:0.7 });
      }
      for (const e of G.enemies) enemyUpdate(e, dt);
      for (const k of G.pickups) {
        k.t += dt; k.life -= dt;
        k.vx *= Math.exp(-1.2 * dt); k.vy = k.vy * Math.exp(-1.2 * dt) - 6 * dt;
        k.x += k.vx * dt; k.y += k.vy * dt;
      }
      collide();
      generateTo(G.camX + VW + 1200);
      generateRuins();

      /* 敵の湧き（画面右端基準・時間ベース） */
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        G.spawnT = rnd(0.8, 1.9) / (0.75 + G.dist / 34000);
        spawnWave();
      }
    }

    /* effects always tick */
    for (const q of G.parts) {
      q.life -= dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vy += q.grav * dt;
      const dr = Math.exp(-(q.drag || 0) * dt);
      q.vx *= dr; q.vy *= dr;
      if (q.kind === 'bubble') q.vy -= 42 * dt;
      if (q.kind === 'smoke' || q.kind === 'ink') q.size += 12 * dt;
      q.rot += q.vr * dt;
    }
    if (G.parts.length > 700) G.parts.splice(0, G.parts.length - 700);
    G.parts = G.parts.filter(q => q.life > 0);

    for (const r of G.rings) { r.life -= dt; r.r += r.speed * dt; r.speed *= Math.exp(-2.6 * dt); }
    G.rings = G.rings.filter(r => r.life > 0);
    for (const l of G.lights) l.life -= dt;
    G.lights = G.lights.filter(l => l.life > 0);
    for (const f of G.floats) { f.life -= dt; f.y += f.vy * dt; f.vy *= Math.exp(-1.6 * dt); }
    G.floats = G.floats.filter(f => f.life > 0);
    for (const hit of G.impacts) hit.life -= dt;
    G.impacts = G.impacts.filter(hit => hit.life > 0);

    for (const s of G.silh) {
      s.t += dt;
      s.x += s.sp * dt;
      s.y += Math.sin(s.t * 0.35) * 14 * dt;
    }

    /* camera */
    const p = G.player;
    if (p) {
      const tx = Math.max(0, p.x - 430);
      const ty = clamp(p.y - VH * 0.5, 0, FLOOR_Y - VH);
      G.camX = lerp(G.camX, tx, 1 - Math.exp(-6 * dt));
      G.camY = lerp(G.camY, ty, 1 - Math.exp(-4.5 * dt));
      G.dist = p.x;
    }
    G.shake *= Math.exp(-6.5 * dt);
    G.shakeX = rnd(-1, 1) * G.shake;
    G.shakeY = rnd(-1, 1) * G.shake;
    cull(); // 撃破済みの敵と寿命切れの弾を、描画前に取り除く。
    if (G.state === 'dead') G.deathT += dt;
  }

  /* ------------------------------------------------------------------ *
   * 11. Drawing primitives
   * ------------------------------------------------------------------ */
  function fishPath(g, L, H, t){
    const segs = 20, top = [], bot = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const hp = Math.sin(Math.pow(u, 0.72) * Math.PI) * H * (1 - u * 0.28);
      const wig = Math.sin(u * 4.4 - t * 3.2) * L * 0.045 * Math.pow(u, 1.8);
      top.push([-u * L, wig - hp]);
      bot.push([-u * L, wig + hp]);
    }
    g.beginPath();
    g.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i <= segs; i++) g.lineTo(top[i][0], top[i][1]);
    for (let i = segs; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
    g.closePath();
    return { top, bot, segs };
  }
  function drawFish(g, e){
    const { length:L, height:H } = fishBody[e.kind];
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir < 0 ? -1 : 1, 1);
    const body = e.flash > 0 ? '#ffffff' : '#382636';
    const belly = e.flash > 0 ? '#ffffff' : '#655065';

    /* tail + dorsal fin */
    g.fillStyle = '#492b3f';
    g.beginPath();
    g.moveTo(-L + 4, 0);
    g.lineTo(-L - 34, -H * 1.35);
    g.lineTo(-L - 12, 0);
    g.lineTo(-L - 34, H * 1.3);
    g.closePath(); g.fill();
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const x = -L * (0.76 - i * 0.2);
      g.moveTo(x - L * 0.12, -H * 0.49);
      g.lineTo(x - L * 0.2, -H * (1.3 + i * 0.17));
      g.lineTo(x + L * 0.12, -H * 0.65);
      g.closePath();
    }
    g.fill();
    g.strokeStyle = '#ab666e'; g.lineWidth = 2; g.stroke();

    const p = fishPath(g, L, H, e.t);
    g.fillStyle = body; g.fill();
    g.save(); g.clip();
    g.fillStyle = belly;
    g.beginPath(); g.moveTo(0, 2); g.lineTo(-L, H * 1.4); g.lineTo(-L, H * 2.4); g.lineTo(0, 8); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(120,190,215,0.35)'; g.lineWidth = 1.6;
    g.beginPath();
    for (let i = 0; i <= 20; i++) { const q = p.top[i]; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
    g.stroke();

    if (e.kind === 'angler') {
      /* teeth */
      g.fillStyle = '#e8f4ff';
      for (let i = 0; i < 5; i++) {
        const x = -6 - i * 11;
        g.beginPath(); g.moveTo(x, H * 0.28 + e.jaw * 6); g.lineTo(x - 5, H * 0.9 + e.jaw * 22); g.lineTo(x + 4, H * 0.9 + e.jaw * 22); g.closePath(); g.fill();
      }
      /* eye */
      g.fillStyle = '#0a1a22'; g.beginPath(); g.arc(-70, -H * 0.4, 8.5, 0, TAU); g.fill();
      g.fillStyle = '#ff9c4a'; g.beginPath(); g.arc(-70, -H * 0.4, 5.2, 0, TAU); g.fill();
      /* esca (lure) */
      g.strokeStyle = '#2c4c58'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-40, -H * 0.95); g.quadraticCurveTo(-6, -H * 1.9, 24 + Math.sin(e.lure) * 8, -H * 1.6); g.stroke();
      const lb = 7 + Math.sin(e.lure * 3) * 1.6;
      g.fillStyle = 'rgba(180,255,230,0.95)'; g.beginPath(); g.arc(24 + Math.sin(e.lure) * 8, -H * 1.6, lb, 0, TAU); g.fill();
    } else {
      g.fillStyle = '#ff704f';
      g.beginPath(); g.ellipse(-12, -H * 0.32, 6.5, 3.4, 0.36, 0, TAU); g.fill();
      g.fillStyle = '#ffe1af';
      g.fillRect(-12, -H * 0.32 - 1, 3, 2);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const x = -8 - i * 7;
        g.moveTo(x, 3); g.lineTo(x - 4, 10); g.lineTo(x - 6, 3); g.closePath();
      }
      g.fill();
    }
    g.restore();

    /* pre-lunge telegraph */
    if ((e.kind === 'hunter' && e.state === 'wind') || (e.kind === 'angler' && e.state === 'wind')) {
      g.save();
      g.translate(e.x, e.y);
      g.globalAlpha = 0.35 + Math.sin(G.time * 30) * 0.25;
      g.strokeStyle = '#ff5a3c'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, e.r + 12, 0, TAU); g.stroke();
      g.restore();
    }
  }

  function drawLeviathan(g, e){
    const L = e.L, H = e.H;
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir < 0 ? -1 : 1, 1);

    const t = e.t;
    const spine = u => Math.sin(u * 3.6 - t * 2.1) * L * 0.055 * Math.pow(u, 1.5);
    const prof = u => leviathanProfile(u, H);
    const N = 34;
    const headEnd = 0.17;

    /* tail fin */
    g.fillStyle = '#07141c';
    const tw = spine(1);
    g.beginPath();
    g.moveTo(-L * 0.97, tw);
    g.lineTo(-L - 150, tw - H * 1.5);
    g.lineTo(-L - 40, tw);
    g.lineTo(-L - 150, tw + H * 1.5);
    g.closePath(); g.fill();

    /* 背棘（ギザギザの棘） */
    const NSP = 16, u0 = 0.24, u1 = 0.9;
    g.beginPath();
    for (let i = 0; i <= NSP; i++) {
      const u = u0 + (u1 - u0) * (i / NSP);
      const spike = (i % 2 === 0) ? 1.62 : 1.02;
      g.lineTo(-u * L, spine(u) - prof(u) * spike);
    }
    for (let i = NSP; i >= 0; i--) {
      const u = u0 + (u1 - u0) * (i / NSP);
      g.lineTo(-u * L, spine(u) - prof(u) * 0.70);
    }
    g.closePath(); g.fill();

    /* Taper the drawn shoulder under the head to hide the neck seam. */
    const bt = [], bb = [];
    const hasHead = ready(leviathanArt);
    for (let i = 0; i <= N; i++) {
      const u = headEnd + (1 - headEnd) * (i / N);
      const radius = prof(u);
      bt.push([-u * L, spine(u) - radius]);
      bb.push([-u * L, spine(u) + radius]);
    }
    g.beginPath();
    g.moveTo(bt[0][0], bt[0][1]);
    bt.forEach(q => g.lineTo(q[0], q[1]));
    bb.slice().reverse().forEach(q => g.lineTo(q[0], q[1]));
    g.closePath();
    const bg = g.createLinearGradient(0, -H, 0, H);
    if (e.flash > 0) { bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#ffe8e8'); bg.addColorStop(1, '#ffffff'); }
    else { bg.addColorStop(0, '#172b2d'); bg.addColorStop(0.24, '#3b5351'); bg.addColorStop(0.63, '#254043'); bg.addColorStop(1, '#091617'); }
    g.fillStyle = bg; g.fill();
    const skin = getLeviathanSkin(g);
    if (e.flash <= 0 && skin) {
      g.save();
      g.globalAlpha = 0.38;
      g.fillStyle = skin; g.fill();
      g.restore();
    }
    g.strokeStyle = 'rgba(148,188,188,0.30)'; g.lineWidth = 2; g.stroke();

    /* photophore rows */
    g.save();
    g.beginPath();
    g.moveTo(bt[0][0], bt[0][1]); bt.forEach(q => g.lineTo(q[0], q[1]));
    bb.slice().reverse().forEach(q => g.lineTo(q[0], q[1]));
    g.closePath(); g.clip();
    for (let i = 2; i < N - 1; i++) {
      const u = headEnd + (1 - headEnd) * (i / N);
      const fl = 0.35 + 0.55 * Math.abs(Math.sin(t * 2.2 - u * 7));
      const x = bt[i][0], y = spine(u) + Math.sin(i * 1.9) * prof(u) * 0.21;
      g.strokeStyle = 'rgba(102,199,245,' + (fl * 0.81).toFixed(3) + ')';
      g.lineWidth = 1.8 + i % 3;
      g.beginPath(); g.moveTo(x - 9, y + 8); g.lineTo(x - 3, y); g.lineTo(x + 10, y - 4); g.stroke();
      if (i % 3 === 0) { g.fillStyle = 'rgba(150,255,220,' + (fl * 0.4).toFixed(3) + ')'; g.beginPath(); g.arc(bt[i][0], bt[i][1] + prof(u) * 0.3, 3.2, 0, TAU); g.fill(); }
    }
    /* scars */
    g.strokeStyle = 'rgba(190,220,235,0.16)'; g.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      const u = 0.32 + i * 0.13;
      g.beginPath();
      g.moveTo(-u * L, spine(u) - prof(u) * 0.85);
      g.lineTo(-(u + 0.06) * L, spine(u) + prof(u) * 0.2);
      g.stroke();
    }
    g.restore();

    /* ---- head ---- */
    const hx = -headEnd * L, hy = spine(headEnd);
    if (hasHead) drawLeviathanHead(g, e, hx, hy);
    else drawLeviathanFallbackHead(g, e, spine, prof, headEnd, hx, hy);

    /* pectoral fin */
    g.fillStyle = 'rgba(8,22,30,0.9)';
    g.beginPath();
    const pu = headEnd + 0.1;
    g.moveTo(-pu * L, spine(pu) + prof(pu) * 0.35);
    g.lineTo(-pu * L - 170, spine(pu) + prof(pu) * 1.05 + Math.sin(t * 2) * 20);
    g.lineTo(-pu * L - 40, spine(pu) + prof(pu) * 0.2);
    g.closePath(); g.fill();

    g.restore();

    /* lunge telegraph */
    if (e.state === 'lungeWind' || e.state === 'sweepWind') {
      g.save();
      g.globalAlpha = 0.3 + Math.sin(G.time * 26) * 0.22;
      g.strokeStyle = '#ff3b30'; g.lineWidth = 6;
      g.strokeRect(G.camX, G.camY, VW, VH);
      g.restore();
    }
  }

  let leviathanHeadPlate = null;
  function drawLeviathanHead(g, e, hingeX, hingeY) {
    // Blend the cut edge of the head plate into the procedural shoulder once.
    if (!leviathanHeadPlate) {
      leviathanHeadPlate = makeTexture(640, 427, layer => {
        layer.drawImage(leviathanArt, 0, 0, 640, 427, 0, 0, 640, 427);
        layer.globalCompositeOperation = 'destination-in';
        const neck = layer.createLinearGradient(0, 0, 120, 0);
        neck.addColorStop(0, 'rgba(0,0,0,0)');
        neck.addColorStop(1, '#000');
        layer.fillStyle = neck; layer.fillRect(0, 0, 640, 427);
      });
    }
    const width = -hingeX * 1.96;
    const topPixels = 218, bottomPixels = 209, artWidth = 640;
    const top = width * topPixels / artWidth;
    const bottom = width * bottomPixels / artWidth;
    const opening = lerp(0.48, 1.12, clamp(e.jaw, 0, 1));
    // Put both pieces on the same seam; squash only the lower jaw as it closes.
    g.drawImage(leviathanHeadPlate, 0, 0, artWidth, topPixels,
      -width, hingeY - top, width, top);
    g.drawImage(leviathanHeadPlate, 0, topPixels, artWidth, bottomPixels,
      -width, hingeY, width, bottom * opening);
  }

  function drawLeviathanFallbackHead(g, e, spine, prof, headEnd, hx, hy) {
    const { L, H, t } = e;
    const hp = prof(headEnd);
    const jawOpen = e.jaw * 1.0;

    const jawPts = (sign) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = headEnd * (i / 10);
        pts.push([-u * L, spine(u) + sign * prof(u)]);
      }
      pts.push([0, spine(0) + sign * 4]);
      return pts;
    };

    const drawJaw = (sign, open, fill) => {
      g.save();
      g.translate(hx, hy);
      g.rotate(open);
      g.translate(-hx, -hy);
      g.beginPath();
      const pts = jawPts(sign);
      g.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(q => g.lineTo(q[0], q[1]));
      for (let i = 10; i >= 0; i--) { const u = headEnd * (i / 10); g.lineTo(-u * L, spine(u)); }
      g.closePath();
      const shell = g.createLinearGradient(0, hy - hp, 0, hy + hp);
      shell.addColorStop(0, '#537271');
      shell.addColorStop(0.5, fill);
      shell.addColorStop(1, '#142728');
      g.fillStyle = shell; g.fill();
      g.strokeStyle = 'rgba(141,180,177,0.28)'; g.lineWidth = 2; g.stroke();
      // Curved ivory teeth project into the open mouth from each jaw.
      g.fillStyle = '#bcba94';
      for (let i = 0; i < 11; i++) {
        const u = headEnd * ((i + 0.5) / 11);
        const bx = -u * L, by = spine(u) + sign * 3;
        const length = 13 + prof(u) * (0.12 + (i % 3) * 0.08);
        g.beginPath();
        g.moveTo(bx + 5, by);
        g.quadraticCurveTo(bx + 5, by - sign * length * 0.65, bx - 6, by - sign * length);
        g.quadraticCurveTo(bx - 2, by - sign * length * 0.46, bx - 5, by);
        g.closePath(); g.fill();
      }
      g.restore();
    };

    /* throat */
    if (jawOpen > 0.12) {
      g.save();
      const tipX = angle => hx + Math.cos(angle) * -hx;
      const tipY = angle => hy + Math.sin(angle) * -hx;
      const top = -jawOpen * 0.22, bottom = jawOpen;
      const th = g.createRadialGradient(hx, hy, 12, hx, hy, -hx);
      th.addColorStop(0, '#06090a');
      th.addColorStop(0.65, '#191615');
      th.addColorStop(1, '#784936');
      g.fillStyle = th;
      g.beginPath();
      g.moveTo(hx - hp * 0.50, hy);
      g.quadraticCurveTo(hx, hy - hp * 0.55, tipX(top), tipY(top));
      g.quadraticCurveTo(tipX(bottom) + hp * 0.18, (tipY(top) + tipY(bottom)) / 2, tipX(bottom), tipY(bottom));
      g.quadraticCurveTo(hx, hy + hp * 0.70, hx - hp * 0.50, hy);
      g.closePath(); g.fill();
      g.restore();
    }

    drawJaw(-1, -jawOpen * 0.22, '#243e40');
    drawJaw(1, jawOpen, '#213739');

    /* 顎と体側のフォトフォア（青い発光ライン） */
    if (e.flash <= 0) {
      for (let i = 0; i < 12; i++) {
        const u = headEnd * (0.1 + (i / 12) * 0.88);
        const fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6 - i * 0.7));
        g.fillStyle = 'rgba(90,240,255,' + (fl * 0.9).toFixed(2) + ')';
        g.beginPath(); g.arc(-u * L, spine(u) - prof(u) * 0.6, 5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(80,220,255,' + (fl * 0.75).toFixed(2) + ')';
        g.beginPath(); g.arc(-u * L, spine(u) + prof(u) * 0.76 + jawOpen * 24, 4.2, 0, TAU); g.fill();
      }
    }

    /* eyes */
    const ex = -headEnd * L * 0.62, ey = hy - hp * 0.55;
    const rage = e.hp < e.maxHp * 0.45;
    g.fillStyle = '#03121a'; g.beginPath(); g.arc(ex, ey, 27, 0, TAU); g.fill();
    const ec = rage ? '#ff603d' : '#e8cc55';
    const eg = g.createRadialGradient(ex, ey, 3, ex, ey, 24);
    eg.addColorStop(0, '#fff6d8'); eg.addColorStop(0.5, ec); eg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, 22, 0, TAU); g.fill();
    /* 縦スリットの瞳孔 */
    g.fillStyle = '#04141c';
    g.beginPath(); g.ellipse(ex, ey, 3.4, 21, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(150,210,230,0.4)'; g.lineWidth = 4; g.beginPath(); g.arc(ex, ey, 27, 0, TAU); g.stroke();

    /* angler lure on head */
    g.strokeStyle = '#0d2530'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(-headEnd * L * 0.8, hy - hp * 0.9);
    g.quadraticCurveTo(-40, -H * 2.0, 130 + Math.sin(t * 1.5) * 40, -H * 1.55 + Math.cos(t * 1.1) * 26); g.stroke();
    const lx = 130 + Math.sin(t * 1.5) * 40, ly = -H * 1.55 + Math.cos(t * 1.1) * 26;
    g.fillStyle = 'rgba(190,255,235,0.9)'; g.beginPath(); g.arc(lx, ly, 15, 0, TAU); g.fill();
    g.fillStyle = 'rgba(230,255,255,0.95)'; g.beginPath(); g.arc(lx, ly, 7, 0, TAU); g.fill();
  }

  function drawSquid(g, e){
    const t = e.t, L = e.L, W = e.W;
    const arm = Math.max(0, e.arm);
    const reach = e.reach * (0.75 + arm * 1.2);
    const rage = e.hp < e.maxHp * 0.45;

    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir < 0 ? -1 : 1, 1);

    /* ---- 触腕 ---- */
    const ARMS = 8;
    for (let i = 0; i < ARMS; i++) {
      const sp = (i / (ARMS - 1)) * 2 - 1;
      const baseY = sp * W * 0.68;
      const len = reach * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7)));
      const sweep = e.whiplash * (1 + Math.abs(sp) * 0.55);
      const pts = [[56, baseY * 0.72]];
      for (let s = 1; s <= 8; s++) {
        const u = s / 8;
        pts.push([56 + u * len,
          baseY * 0.72 + Math.sin(u * 3.4 - t * 3.6 + i * 0.9) * len * 0.15 * u + sweep * len * u * 0.85]);
      }
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = e.flash > 0 ? '#ffffff' : 'rgba(38,70,88,0.97)';
      g.lineWidth = 20 - Math.abs(sp) * 5;
      g.beginPath();
      pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]));
      g.stroke();
      /* 吸盤 */
      if (e.flash <= 0) {
        for (let k = 1; k < pts.length; k++) {
          const rr = 5 - k * 0.42;
          if (rr <= 1.2) continue;
          g.fillStyle = 'rgba(214,240,250,0.7)';
          g.beginPath(); g.arc(pts[k][0], pts[k][1] - (20 - Math.abs(sp) * 5) * 0.26, rr, 0, TAU); g.fill();
          g.fillStyle = 'rgba(40,80,100,0.85)';
          g.beginPath(); g.arc(pts[k][0], pts[k][1] - (20 - Math.abs(sp) * 5) * 0.26, rr * 0.45, 0, TAU); g.fill();
        }
        g.strokeStyle = 'rgba(150,220,250,0.22)';
        g.lineWidth = 4;
        g.beginPath();
        pts.forEach((q, k) => k ? g.lineTo(q[0], q[1] - (20 - Math.abs(sp) * 5) * 0.26) : g.moveTo(q[0], q[1] - (20 - Math.abs(sp) * 5) * 0.26));
        g.stroke();
      }
    }
    /* 2本の長い触腕＋クラブ */
    for (const sgn of [-1, 1]) {
      const len = reach * 1.32, y0 = sgn * W * 0.36;
      let ex2 = 62, ey2 = y0 * 0.72;
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(13,30,41,0.96)';
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(62, y0 * 0.72);
      for (let s = 1; s <= 10; s++) {
        const u = s / 10;
        ex2 = 62 + u * len;
        ey2 = y0 * 0.72 + Math.sin(u * 2.8 - t * 3.0 + (sgn > 0 ? 1.6 : 0)) * len * 0.13 * u + e.whiplash * len * u * 0.9;
        g.lineTo(ex2, ey2);
      }
      g.stroke();
      g.strokeStyle = 'rgba(120,205,235,0.20)'; g.lineWidth = 2.6; g.stroke();
      /* クラブ */
      g.save();
      g.translate(ex2, ey2);
      g.rotate(Math.atan2(ey2 - y0 * 0.72, ex2 - 62));
      g.fillStyle = 'rgba(24,46,60,0.96)';
      g.beginPath(); g.ellipse(6, 0, 30, 12, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(130,210,240,0.28)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(150,240,255,0.5)';
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-18 + k * 10, 0, 2.4, 0, TAU); g.fill(); }
      g.restore();
    }

    /* ---- 外套（ボディ） ---- */
    const N = 24, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const prof = W * Math.pow(1 - u, 0.72) * (0.72 + 0.48 * Math.sin(u * Math.PI));
      const wob = Math.sin(u * 3.0 - t * 1.8) * W * 0.14 * Math.pow(u, 1.3);
      top.push([-u * L, wob - prof]);
      bot.push([-u * L, wob + prof]);
    }
    /* 尾鰭（外套の左右に張り出す） */
    g.fillStyle = 'rgba(34,66,84,0.96)';
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.moveTo(-L * 0.22, sgn * W * 0.74);
      g.lineTo(-L * 0.84, sgn * W * 1.85);
      g.lineTo(-L * 1.02, sgn * W * 0.14);
      g.lineTo(-L * 0.6, sgn * W * 0.92);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(150,225,255,0.34)'; g.lineWidth = 2.4; g.stroke();
    }
    g.beginPath();
    g.moveTo(top[0][0], top[0][1]);
    top.forEach(q => g.lineTo(q[0], q[1]));
    for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
    g.closePath();
    const mg = g.createLinearGradient(0, -W, 0, W);
    if (e.flash > 0) { mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#eef4ff'); mg.addColorStop(1, '#ffffff'); }
    else { mg.addColorStop(0, '#12293a'); mg.addColorStop(0.38, '#1f4459'); mg.addColorStop(0.6, '#2d5d74'); mg.addColorStop(1, '#0b1c26'); }
    g.fillStyle = mg; g.fill();
    g.strokeStyle = 'rgba(110,190,220,0.3)'; g.lineWidth = 2.5; g.stroke();

    /* 外套の発光ライン */
    if (e.flash <= 0) {
      for (let i = 2; i < 14; i++) {
        const u = i / 14;
        const prof = W * Math.pow(1 - u, 0.72) * (0.72 + 0.48 * Math.sin(u * Math.PI));
        const fl = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.4 - i * 0.6));
        g.fillStyle = 'rgba(110,240,255,' + (fl * 0.7).toFixed(2) + ')';
        g.beginPath();
        g.arc(-u * L, Math.sin(u * 3.0 - t * 1.8) * W * 0.14 * Math.pow(u, 1.3) + prof * 0.82, 4.5, 0, TAU);
        g.fill();
      }
    }

    /* ---- 頭部 ---- */
    g.beginPath();
    g.moveTo(-12, -W * 0.92);
    g.bezierCurveTo(48, -W * 0.98, 96, -W * 0.6, 100, 0);
    g.bezierCurveTo(96, W * 0.6, 48, W * 0.98, -12, W * 0.92);
    g.closePath();
    const hg = g.createLinearGradient(0, -W, 0, W);
    if (e.flash > 0) { hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.5, '#f0f6ff'); hg.addColorStop(1, '#ffffff'); }
    else { hg.addColorStop(0, '#1a3546'); hg.addColorStop(0.45, '#26506a'); hg.addColorStop(1, '#0e2230'); }
    g.fillStyle = hg; g.fill();
    g.strokeStyle = 'rgba(120,200,230,0.34)'; g.lineWidth = 2.5; g.stroke();

    /* 巨大な発光眼 */
    const ex = 30, ey = -W * 0.34;
    g.fillStyle = '#031018'; g.beginPath(); g.arc(ex, ey, 31, 0, TAU); g.fill();
    const eg = g.createRadialGradient(ex, ey, 2, ex, ey, 29);
    const ec = rage ? 'rgba(255,120,120,' : 'rgba(87,216,255,';
    eg.addColorStop(0, '#eaffff');
    eg.addColorStop(0.35, ec + '0.95)');
    eg.addColorStop(1, 'rgba(8,50,100,0)');
    g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, 29, 0, TAU); g.fill();
    g.fillStyle = '#04141c';
    g.beginPath(); g.ellipse(ex + 3, ey, 6.5, 14, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(140,220,255,0.45)'; g.lineWidth = 3;
    g.beginPath(); g.arc(ex, ey, 31, 0, TAU); g.stroke();

    /* 漏斗（サイフォン） */
    g.fillStyle = 'rgba(18,40,54,0.96)';
    g.beginPath();
    g.moveTo(24, W * 0.74);
    g.lineTo(-18, W * 1.12);
    g.lineTo(8, W * 0.6);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,200,230,0.3)'; g.lineWidth = 2; g.stroke();

    /* 嘴（カラストンビ） */
    g.save();
    g.fillStyle = '#0a1218';
    g.beginPath();
    g.moveTo(86, W * 0.08);
    g.quadraticCurveTo(128, W * 0.56, 78, W * 0.8);
    g.quadraticCurveTo(104, W * 0.46, 80, W * 0.12);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(190,228,248,0.4)'; g.lineWidth = 2.4; g.stroke();
    g.restore();

    g.restore();

    /* 攻撃予兆 */
    if (e.state === 'whipWind') {
      g.save();
      g.globalAlpha = 0.3 + Math.sin(G.time * 26) * 0.22;
      g.strokeStyle = '#ff3b30'; g.lineWidth = 6;
      g.strokeRect(G.camX, G.camY, VW, VH);
      g.restore();
    }
  }

  function drawSub(g, p){
    g.save();
    g.translate(p.x, p.y + p.tilt * 6);
    g.rotate(p.tilt);
    g.translate(-p.recoil * 6, 0);
    const blink = p.inv > 0 && Math.floor(G.time * 22) % 2 === 0;
    g.globalAlpha = blink ? 0.45 : 1;

    if (ready(subArt)) {
      const width = 142;
      const height = width * subArt.naturalHeight / subArt.naturalWidth;
      g.drawImage(subArt, -76, -height * 0.65, width, height);
      g.restore();
      return;
    }

    /* 尾部スタビライザー */
    g.fillStyle = '#222b32';
    g.beginPath(); g.moveTo(-30, -14); g.lineTo(-58, -32); g.lineTo(-42, -12); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-30, 14); g.lineTo(-58, 32); g.lineTo(-42, 12); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,200,220,0.25)'; g.lineWidth = 1.2; g.stroke();

    /* プロペラダクト + プロペラ */
    g.save();
    g.translate(-52, 0);
    g.fillStyle = '#141c22';
    g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
    g.strokeStyle = '#3a464e'; g.lineWidth = 2; g.stroke();
    g.rotate(G.time * 20);
    g.fillStyle = 'rgba(150,180,196,0.7)';
    for (let i = 0; i < 3; i++) { g.rotate(TAU / 3); g.fillRect(-2, -9, 4, 18); }
    g.restore();

    /* 船体（使い込まれた重工業の潜水艇） */
    g.beginPath();
    g.moveTo(46, 0);
    g.bezierCurveTo(37, -15, 14, -20, -12, -17);
    g.bezierCurveTo(-32, -15, -44, -9, -46, 0);
    g.bezierCurveTo(-44, 9, -32, 15, -12, 17);
    g.bezierCurveTo(14, 20, 37, 15, 46, 0);
    g.closePath();
    const hull = g.createLinearGradient(0, -20, 0, 20);
    hull.addColorStop(0,    '#8a7358');
    hull.addColorStop(0.16, '#5b5245');
    hull.addColorStop(0.42, '#3b4045');
    hull.addColorStop(0.68, '#28323a');
    hull.addColorStop(0.86, '#1a2229');
    hull.addColorStop(1,    '#0c1216');
    g.fillStyle = hull; g.fill();
    g.strokeStyle = 'rgba(190,215,230,0.38)'; g.lineWidth = 1.6; g.stroke();

    /* 錆と板の合わせ目 */
    g.save();
    g.beginPath();
    g.moveTo(46, 0);
    g.bezierCurveTo(37, -15, 14, -20, -12, -17);
    g.bezierCurveTo(-32, -15, -44, -9, -46, 0);
    g.bezierCurveTo(-44, 9, -32, 15, -12, 17);
    g.bezierCurveTo(14, 20, 37, 15, 46, 0);
    g.closePath(); g.clip();
    g.strokeStyle = 'rgba(160,105,60,0.42)'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const x = -36 + i * 19;
      g.beginPath(); g.moveTo(x, -20); g.lineTo(x + 5, -4); g.stroke();
    }
    g.strokeStyle = 'rgba(8,12,16,0.55)'; g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { const x = -40 + i * 19; g.beginPath(); g.moveTo(x, -22); g.lineTo(x, 22); g.stroke(); }
    // Subtle rivets and scratches on the pressure hull.
    for (let i = 0; i < 15; i++) {
      const x = -37 + i * 5.2, edge = 11 + 5 * Math.sin(i / 14 * Math.PI);
      g.fillStyle = 'rgba(5,12,15,0.6)'; g.fillRect(x, edge - 1, 1.4, 1.4);
      g.fillStyle = 'rgba(185,190,172,0.3)'; g.fillRect(x, edge - 2, 1, 1);
    }
    g.strokeStyle = 'rgba(201,196,166,0.16)'; g.lineWidth = 0.7;
    for (let i = 0; i < 7; i++) {
      const x = -38 + i * 11;
      g.beginPath(); g.moveTo(x, 3 + i % 3 * 3); g.lineTo(x + 5, 2 + i % 3 * 3); g.stroke();
    }
    g.fillStyle = 'rgba(232,240,246,0.72)';
    g.font = 'bold 8px "Yu Gothic UI",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('09', -24, -9);
    g.restore();

    /* コックピット（大きな丸窓＋支柱） */
    g.save();
    g.beginPath(); g.ellipse(15, -1, 15.5, 14.5, 0, 0, TAU);
    const cg = g.createRadialGradient(12, -5, 2, 15, -1, 18);
    cg.addColorStop(0, 'rgba(185,242,255,0.96)');
    cg.addColorStop(0.45, 'rgba(58,150,192,0.9)');
    cg.addColorStop(1, 'rgba(6,26,40,0.96)');
    g.fillStyle = cg; g.fill();
    g.strokeStyle = '#161f26'; g.lineWidth = 3.6; g.stroke();
    g.strokeStyle = 'rgba(26,38,46,0.92)'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(1, -14); g.lineTo(1, 12); g.moveTo(29, -14); g.lineTo(29, 12); g.stroke();
    g.restore();

    /* ツイン・ヘッドライト */
    for (const oy of [-9.5, 9.5]) {
      g.save();
      g.translate(39, oy);
      g.fillStyle = '#141b21'; g.beginPath(); g.arc(0, 0, 8.6, 0, TAU); g.fill();
      g.strokeStyle = '#4b5560'; g.lineWidth = 1.6; g.stroke();
      const lg = g.createRadialGradient(1.5, 0, 1, 1.5, 0, 7);
      lg.addColorStop(0, '#fffdf0'); lg.addColorStop(0.4, '#ffe9a0'); lg.addColorStop(1, '#b8821c');
      g.fillStyle = lg; g.beginPath(); g.arc(1.6, 0, 6.5, 0, TAU); g.fill();
      g.restore();
    }

    /* 魚雷発射管 */
    g.fillStyle = '#0b1218';
    g.fillRect(30, -2.6, 12, 5.2);
    g.fillStyle = '#3f4a54';
    g.fillRect(30, -2.6, 12, 1);

    /* 緑のインジケータ */
    g.fillStyle = 'rgba(120,255,150,' + (0.55 + 0.45 * Math.sin(G.time * 6)).toFixed(2) + ')';
    g.beginPath(); g.arc(22, 13, 2.2, 0, TAU); g.fill();

    /* 発熱時のノーズグロー */
    if (p.heat > 0.5) {
      g.fillStyle = 'rgba(255,' + Math.round(180 - p.heat * 160) + ',60,' + ((p.heat - 0.5) * 1.4).toFixed(2) + ')';
      g.beginPath(); g.ellipse(46, 0, 13, 11, 0, 0, TAU); g.fill();
    }
    g.restore();
  }

  function drawJelly(g, e){
    g.save(); g.translate(e.x, e.y);
    const pulse = 1 + Math.sin(e.t * 2.4 + e.pulse) * 0.14;
    const a = e.flash > 0 ? 0.95 : 0.55;
    const rg = g.createRadialGradient(0, -6, 4, 0, -6, 44 * pulse);
    rg.addColorStop(0, e.flash > 0 ? 'rgba(255,255,255,' + a + ')' : 'rgba(170,255,235,' + a + ')');
    rg.addColorStop(1, 'rgba(80,160,190,0)');
    g.fillStyle = rg;
    g.beginPath(); g.ellipse(0, -6, 34 * pulse, 30 * pulse, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(160,255,230,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, -4, 30 * pulse, Math.PI, TAU); g.stroke();
    g.strokeStyle = 'rgba(150,240,225,0.42)'; g.lineWidth = 2.2;
    for (let i = 0; i < 7; i++) {
      const x = -22 + i * 7.4;
      g.beginPath();
      g.moveTo(x, 20);
      g.quadraticCurveTo(x + Math.sin(e.t * 2 + i) * 10, 40, x + Math.sin(e.t * 1.6 + i * 1.3) * 14, 62);
      g.stroke();
    }
    g.restore();
  }

  function drawMine(g, e){
    g.save(); g.translate(e.x, e.y); g.rotate(Math.sin(e.t * 0.5) * 0.2);
    const blink = 0.5 + 0.5 * Math.sin(e.t * 5);
    if (ready(mineArt)) {
      const scale = e.r / 0.45;
      g.drawImage(mineArt, -scale / 2, -scale / 2, scale, scale);
      g.fillStyle = 'rgba(255,225,118,' + (0.1 + blink * 0.35) + ')';
      g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
      g.restore();
      return;
    }
    g.fillStyle = Math.floor(e.t * 5) % 2 ? '#3a2a30' : '#2a1e24';
    g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
    g.strokeStyle = '#54616b'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + e.t * 0.2;
      g.strokeStyle = '#47545e'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); g.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); g.stroke();
      g.fillStyle = '#3c4a54';
      g.beginPath(); g.arc(Math.cos(a) * 30, Math.sin(a) * 30, 4, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,70,70,' + (0.35 + blink * 0.65) + ')';
    g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
    g.restore();
  }

  function drawHermit(g, e){
    const active = e.state === 'active';
    const art = active ? hermitArt : hermitDormantArt;
    g.save();
    g.translate(e.x, e.floorY);
    g.scale(e.dir, 1);
    if (ready(art)) {
      g.drawImage(art, -HERMIT_SIZE / 2, -HERMIT_SIZE + 1, HERMIT_SIZE, HERMIT_SIZE);
    } else {
      g.fillStyle = active ? '#82746b' : '#4b4b47';
      g.beginPath(); g.ellipse(0, -e.r, e.r * 1.15, e.r * 0.75, 0, 0, TAU); g.fill();
      g.fillRect(18, -e.r * 1.65, e.r, 11);
    }
    if (active && e.st <= HERMIT_CHARGE && e.stun <= 0) {
      const charge = 1 - e.st / HERMIT_CHARGE;
      g.fillStyle = '#ffd491';
      g.shadowColor = '#ffad56';
      g.shadowBlur = 18;
      g.beginPath(); g.arc(HERMIT_MUZZLE_X, HERMIT_MUZZLE_Y, 3 + charge * 7, 0, TAU); g.fill();
    }
    if (e.flash > 0) {
      g.fillStyle = 'rgba(255,228,193,0.35)';
      g.beginPath(); g.ellipse(0, e.y - e.floorY, e.r * 0.8, e.r * 0.62, 0, 0, TAU); g.fill();
    }
    g.restore();
  }

  function drawGunner(g, e){
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.dir, 1);
    if (ready(gunnerArt)) {
      g.drawImage(gunnerArt, 0, 172, 768, 596, -76, -59, 152, 118);
    } else {
      g.fillStyle = '#96627f';
      g.beginPath(); g.ellipse(-14, 4, 43, 37, -0.3, 0, TAU); g.fill();
      g.fillStyle = '#60483a'; g.fillRect(-8, -32, GUNNER_MUZZLE_X + 8, 14);
    }
    if (e.flash > 0) {
      g.fillStyle = 'rgba(255,240,230,0.35)';
      g.beginPath(); g.ellipse(-12, 5, 35, 28, 0, 0, TAU); g.fill();
    }
    if (e.st <= GUNNER_CHARGE && e.stun <= 0) {
      const charge = 1 - e.st / GUNNER_CHARGE;
      g.fillStyle = '#ffe38b'; g.shadowColor = '#ff8a50'; g.shadowBlur = 22;
      g.beginPath(); g.arc(GUNNER_MUZZLE_X, GUNNER_MUZZLE_Y, 4 + charge * 8, 0, TAU); g.fill();
    }
    g.restore();
  }

  function drawRock(g, r){
    g.save(); g.translate(r.x, r.y);
    const s = r.seed;
    g.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU;
      const rr = r.r * (0.72 + ((Math.sin(s + i * 2.3) + 1) * 0.5) * 0.42);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 1.05;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    const rg = g.createLinearGradient(0, -r.r, 0, r.r);
    rg.addColorStop(0, '#2a3a44'); rg.addColorStop(0.5, '#1a272f'); rg.addColorStop(1, '#0c151b');
    g.fillStyle = rg; g.fill();
    g.strokeStyle = 'rgba(110,170,195,0.22)'; g.lineWidth = 2; g.stroke();
    g.restore();
  }

  /* ------------------------------------------------------------------ *
   * 12. Render
   * ------------------------------------------------------------------ */
  const snow = [];
  for (let i = 0; i < 320; i++) snow.push({ x:rnd(0, VW), y:rnd(0, FLOOR_Y), z:rnd(0.3, 1.4), s:rnd(0.7, 2.6), ph:rnd(0, TAU) });

  // Cache sediment once; reuse it instead of allocating per-particle gradients.
  const sediment = document.createElement('canvas');
  sediment.width = 512; sediment.height = 512;
  const sedimentCtx = sediment.getContext('2d');
  let textureSeed = 79831;
  const textureRandom = () => { textureSeed = (textureSeed * 1664525 + 1013904223) >>> 0; return textureSeed / 4294967296; };
  for (let i = 0; i < 1800; i++) {
    const x = textureRandom() * 512, y = textureRandom() * 512;
    const size = 0.4 + textureRandom() * 1.7;
    sedimentCtx.fillStyle = 'rgba(180,213,214,' + (textureRandom() * 0.22).toFixed(3) + ')';
    sedimentCtx.fillRect(x, y, size, size);
  }
  function drawWaterAtmosphere(camX, camY) {
    ctx.save();
    const x = -((camX * 0.14 + G.time * 2) % 512 + 512) % 512;
    const y = -((camY * 0.1 - G.time * 4) % 512 + 512) % 512;
    ctx.globalAlpha = 0.48;
    for (let yy = y; yy < VH; yy += 512)
      for (let xx = x; xx < VW; xx += 512) ctx.drawImage(sediment, xx, yy);
    ctx.restore();
  }
  function drawHeadlightAtmosphere(camX, camY) {
    const p = G.player;
    if (!p || !p.alive) return;
    const lampX = ready(subArt) ? LAMP_X : 40;
    ctx.save();
    ctx.translate(p.x - camX, p.y - camY + p.tilt * 6);
    ctx.rotate(p.tilt);
    ctx.globalCompositeOperation = 'screen';
    for (const offset of [-LAMP_Y, LAMP_Y]) {
      ctx.drawImage(beamTexture, lampX - p.recoil * 6, offset - BEAM_HALF_HEIGHT,
        BEAM_LENGTH, BEAM_HALF_HEIGHT * 2);
    }
    ctx.restore();
  }

  function drawCityPlate(camX, camY, depth) {
    if (!ready(ruinsArt)) return false;
    const width = 1660, height = 920;
    const travel = camX * 0.40;
    const index = Math.floor(travel / width);
    const x = index * width - travel;
    const y = -clamp(camY * 0.14, 0, height - VH);
    ctx.save();
    ctx.globalAlpha = lerp(0.88, 0.55, depth);
    // Mirrored adjoining copies meet on the same edge at every tile boundary.
    const tiles = x + width < VW ? 2 : 1;
    for (let i = 0; i < tiles; i++) {
      ctx.save();
      const mirror = (index + i) % 2 !== 0;
      ctx.translate(x + i * width + (mirror ? width : 0), y);
      if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(ruinsArt, 0, 0, width, height);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  function drawAmbientFish(camX, camY){
    const span = VW + 460;
    ctx.fillStyle = 'rgba(113,170,191,0.33)';
    ctx.beginPath();
    for (let school = 0; school < 4; school++) {
      const travel = camX * 0.38 + G.time * (15 + school * 3);
      const x = ((school * 441 - travel) % span + span) % span - 150;
      const y = 125 + school * 142 - camY * 0.06 + Math.sin(G.time * 0.4 + school) * 24;
      for (let i = 0; i < 8; i++) {
        const px = x + i * 23;
        const py = y + Math.sin(i * 2.4 + school) * 30 + Math.sin(G.time * 1.9 + i) * 3;
        const size = 4 + (i * 3 + school) % 5;
        ctx.moveTo(px + size, py);
        ctx.ellipse(px, py, size, size * 0.36, -0.1, 0, TAU);
        ctx.moveTo(px + size * 0.6, py);
        ctx.lineTo(px + size * 1.65, py - size * 0.47);
        ctx.lineTo(px + size * 1.65, py + size * 0.47);
        ctx.closePath();
      }
    }
    ctx.fill();
  }

  function drawBackground(camX, camY){
    const dt = depthT(camY + VH * 0.5);
    /* water column gradient */
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    const blue = Math.round(lerp(52, 18, dt));
    g.addColorStop(0, 'rgb(6,' + (blue - 5) + ',' + blue + ')');
    g.addColorStop(0.48, 'rgb(4,' + Math.round(blue * 0.53) + ',' + Math.round(blue * 0.72) + ')');
    g.addColorStop(1, '#030c0d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    const cityVisible = drawCityPlate(camX, camY, dt);

    /* surface caustics near the top */
    if (camY < 420) {
      const a = clamp(1 - camY / 420, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const x = ((i * 210 - camX * 0.32) % (VW + 420)) - 140;
        const w = 90 + Math.sin(G.time * 0.5 + i) * 34;
        const grd = ctx.createLinearGradient(x, -camY, x + 150, 700 - camY);
        grd.addColorStop(0, 'rgba(150,230,255,' + (0.045 * a).toFixed(3) + ')');
        grd.addColorStop(1, 'rgba(120,210,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(x, -camY);
        ctx.lineTo(x + w, -camY);
        ctx.lineTo(x + w + 180, 760 - camY);
        ctx.lineTo(x + 96, 760 - camY);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    /* background spires (parallax 0.55) */
    ctx.save();
    ctx.translate(-camX * 0.55, -camY * 0.72 + camY);
    ctx.fillStyle = cityVisible ? 'rgba(7,21,23,0.14)' : 'rgba(6,20,34,0.62)';
    for (const s of G.spires) {
      ctx.beginPath();
      ctx.moveTo(s.x - s.w * 0.5, s.y + s.h);
      ctx.lineTo(s.x, s.y);
      ctx.lineTo(s.x + s.w * 0.5, s.y + s.h);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    /* sunken city ruins (parallax 0.78) */
    if (!cityVisible) drawRuins(camX, camY);
    drawAmbientFish(camX, camY);

    /* 遠景のエイは幅広いひれと細い尾で見分けられる。 */
    ctx.save();
    ctx.translate(-camX * RAY_PARALLAX, -camY * RAY_PARALLAX);
    for (const s of G.silh) {
      ctx.save();
      ctx.translate(s.x, s.y);
      const w = s.width, h = s.height, flap = Math.sin(s.t * 1.55) * h * 0.23;
      ctx.fillStyle = 'rgba(103,157,181,0.24)';
      ctx.beginPath();
      ctx.moveTo(-w * 0.34, 0);
      ctx.bezierCurveTo(-w * 0.29, -h * 0.17, -w * 0.03, -h * 0.37, w * 0.33, -h + flap);
      ctx.quadraticCurveTo(w * 0.4, -h * 0.1, w * 0.16, 0);
      ctx.quadraticCurveTo(w * 0.36, h * 0.3, w * 0.23, h + flap);
      ctx.bezierCurveTo(-w * 0.02, h * 0.64, -w * 0.13, h * 0.23, -w * 0.34, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(103,157,181,0.24)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(w * 0.14, 0);
      ctx.quadraticCurveTo(w * 0.43, h * 0.15, w * 0.77, -h * 0.11 + flap);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    /* marine snow layer 1 (far) */
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#bfe9ff';
    for (const s of snow) {
      const sx = ((s.x - camX * 0.45) % (VW + 80) + VW + 80) % (VW + 80) - 40;
      const sy = ((s.y - camY * 0.55) % (FLOOR_Y) + FLOOR_Y) % (FLOOR_Y) - camY * 0.45;
      if (sy < -30 || sy > VH + 30) continue;
      ctx.globalAlpha = 0.22 * s.z;
      ctx.beginPath(); ctx.arc(sx, sy, s.s * 0.7, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* 背景と実体のあいだに一枚かけて遠景を沈める。
     これが無いと、背景を泳ぐ巨大魚のシルエットと手前の敵が同じ濃さで混ざって見分けられない */
  function drawDepthScrim(camY){
    const dt = depthT(camY + VH * 0.5);
    const a = lerp(0.14, 0.21, dt);
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, 'rgba(4,16,30,' + a.toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(2,11,22,' + (a * 1.06).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(1,7,15,' + (a * 0.9).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  function drawWorld(camX, camY){
    ctx.save();
    ctx.translate(-camX, -camY);

    /* rocks */
    for (const r of G.rocks) if (r.x > camX - 300 && r.x < camX + VW + 300) drawRock(ctx, r);

    /* sea floor */
    if (camY + VH > FLOOR_Y - 260) {
      ctx.fillStyle = '#050d13';
      ctx.beginPath();
      ctx.moveTo(camX - 100, FLOOR_Y + 400);
      for (let x = camX - 100; x < camX + VW + 200; x += 40) {
        ctx.lineTo(x, seaFloorY(x));
      }
      ctx.lineTo(camX + VW + 200, FLOOR_Y + 400);
      ctx.closePath(); ctx.fill();
    }

    /* pickups */
    for (const k of G.pickups) {
      ctx.save();
      ctx.translate(k.x, k.y + Math.sin(k.t * 2.4) * 4);
      if (k.kind === 'missile') {
        /* ミサイル補給＝ミサイルの形そのもの（弾頭・胴・尾翼が読める）。
           暗い海でも形で分かるよう暗い縁取りを付けるが、発光は控えめ（白飛びさせない）。 */
        ctx.shadowColor = '#ffb14a'; ctx.shadowBlur = 15;
        const mg = ctx.createLinearGradient(0, -8, 0, 8);
        mg.addColorStop(0, '#ffe8bd'); mg.addColorStop(0.5, '#e6a04a'); mg.addColorStop(1, '#8a5416');
        ctx.fillStyle = mg;
        /* 尾翼（後方・上下の三角） */
        ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-6, -13); ctx.lineTo(-15, -12); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6, 6);  ctx.lineTo(-6, 13);  ctx.lineTo(-15, 12);  ctx.closePath(); ctx.fill();
        /* 胴体 */
        ctx.beginPath();
        ctx.moveTo(-7, -6); ctx.lineTo(6, -6); ctx.lineTo(6, 6); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill();
        /* 弾頭（前方の円錐） */
        ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(18, 0); ctx.lineTo(6, 6); ctx.closePath(); ctx.fill();
        /* 暗い縁で輪郭をはっきり */
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(28,14,4,0.72)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(6, -6); ctx.lineTo(-6, -6); ctx.lineTo(-6, -13); ctx.lineTo(-15, -12);
        ctx.lineTo(-7, -3); ctx.lineTo(-7, 3); ctx.lineTo(-15, 12); ctx.lineTo(-6, 13); ctx.lineTo(-6, 6);
        ctx.lineTo(6, 6); ctx.closePath(); ctx.stroke();
        /* 弾頭の小さなハイライト */
        ctx.fillStyle = '#fff6df';
        ctx.beginPath(); ctx.arc(4.5, 0, 2.3, 0, TAU); ctx.fill();
      } else {
        /* 船体修理＝明るい緑十字そのもの（回復とすぐ分かる形）。縁取り＋控えめな発光。 */
        ctx.shadowColor = '#7dffb0'; ctx.shadowBlur = 15;
        const a = 5.5, b = 15;
        ctx.beginPath();
        ctx.moveTo(-a, -b); ctx.lineTo(a, -b); ctx.lineTo(a, -a); ctx.lineTo(b, -a);
        ctx.lineTo(b, a);   ctx.lineTo(a, a);  ctx.lineTo(a, b);  ctx.lineTo(-a, b);
        ctx.lineTo(-a, a);  ctx.lineTo(-b, a); ctx.lineTo(-b, -a); ctx.lineTo(-a, -a);
        ctx.closePath();
        ctx.fillStyle = '#8affc0';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(4,40,26,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = 'rgba(235,255,244,0.92)';
        ctx.beginPath(); ctx.arc(-1.4, -1.4, 2.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    /* enemies */
    for (const e of G.enemies) {
      if (e.kind === 'leviathan') { if (G.boss) drawLeviathan(ctx, e); continue; }
      if (e.kind === 'squid') { drawSquid(ctx, e); continue; }
      if (e.kind === 'jelly') { drawJelly(ctx, e); continue; }
      if (e.kind === 'mine') { drawMine(ctx, e); continue; }
      if (e.x < camX - 260 || e.x > camX + VW + 400) continue;
      if (e.kind === 'hermit') { drawHermit(ctx, e); continue; }
      if (e.kind === 'gunner') { drawGunner(ctx, e); continue; }
      drawFish(ctx, e);
    }

    /* player bullets */
    for (const b of G.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.a);
      if (b.kind === 'missile') {
        /* v1.11.0: ミサイル威力のランクで弾体が大きくなる（弾頭・胴・尾翼＋太く短い航跡）。 */
        const S = b.vscale || 1;
        const nose = 16 * S, tail = -26 * S, br = 7 * S;
        ctx.fillStyle = 'rgba(255,170,60,0.4)';
        ctx.beginPath(); ctx.ellipse(tail - 16 * S, 0, 22 * S, 5.5 * S, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,238,200,0.5)';
        ctx.beginPath(); ctx.ellipse(tail - 8 * S, 0, 12 * S, 3.5 * S, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#b9842f';
        ctx.strokeStyle = 'rgba(38,22,6,0.55)'; ctx.lineWidth = Math.max(1, 1.2 * S);
        for (const sgn of [-1, 1]){
          ctx.beginPath();
          ctx.moveTo(tail + 8 * S, sgn * br);
          ctx.lineTo(tail - 8 * S, sgn * (br + 8 * S));
          ctx.lineTo(tail + 8 * S, sgn * (br + 1));
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        const mg = ctx.createLinearGradient(0, -br, 0, br);
        mg.addColorStop(0, '#ffe6b0'); mg.addColorStop(0.5, '#d08a34'); mg.addColorStop(1, '#6b4212');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.moveTo(nose, 0);
        ctx.lineTo(8 * S, -br); ctx.lineTo(tail + 8 * S, -br);
        ctx.lineTo(tail + 8 * S, br); ctx.lineTo(8 * S, br);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(30,17,4,0.7)'; ctx.lineWidth = Math.max(1, 1.1 * S); ctx.stroke();
        ctx.fillStyle = '#fffdf0';
        ctx.beginPath(); ctx.moveTo(nose, 0); ctx.lineTo(8 * S, -br * 0.72); ctx.lineTo(8 * S, br * 0.72); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,225,170,0.9)';
        ctx.fillRect(tail + 12 * S, -br * 0.5, 6 * S, br);
      } else {
        /* 魚雷：真鍮色の機体 + 白熱弾頭 + 橙の排気 */
        ctx.fillStyle = 'rgba(255,170,60,0.6)';
        ctx.beginPath(); ctx.ellipse(-26, 0, 26, 4.5, 0, 0, TAU); ctx.fill();
        const bg = ctx.createLinearGradient(0, -6, 0, 6);
        bg.addColorStop(0, '#ffe6b0'); bg.addColorStop(0.5, '#d08a34'); bg.addColorStop(1, '#6b4212');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(8, -6); ctx.lineTo(-14, -6);
        ctx.lineTo(-14, 6); ctx.lineTo(8, 6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fffdf0';
        ctx.beginPath(); ctx.arc(17, 0, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,225,170,0.9)';
        ctx.fillRect(-13, -3.4, 7, 2.2); ctx.fillRect(-13, 1.2, 7, 2.2);
      }
      ctx.restore();
    }
    /* enemy bullets */
    for (const b of G.ebullets) {
      ctx.save(); ctx.translate(b.x, b.y);
      if (b.kind === 'shell') {
        ctx.rotate(b.a);
        ctx.fillStyle = '#ffb15e';
        ctx.shadowColor = '#ff9c53';
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.ellipse(0, 0, 15, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff1c8';
        ctx.fillRect(1, -2, 10, 4);
        ctx.restore();
        continue;
      }
      ctx.fillStyle = '#c08cff';
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + G.time * 2;
        const rr = i % 2 ? 8 : 13;
        i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* particles (below player) */
    drawParticles(false);

    /* player */
    if (G.player && G.player.alive) drawSub(ctx, G.player);
    else if (G.player && G.state === 'dead' && G.deathT < 0.4) { /* handled by explosion */ }

    /* particles glow layer handled later */
    ctx.restore();
  }

  function drawParticles(glowOnly){
    for (const q of G.parts) {
      const t = clamp(q.life / q.max, 0, 1);
      if (glowOnly ? !(q.glow > 0) : false) continue;
      ctx.save();
      ctx.globalAlpha = t;
      if (q.kind === 'smoke' || q.kind === 'ink') {
        if (glowOnly) { ctx.restore(); continue; }
        ctx.fillStyle = q.col;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill();
      } else if (q.kind === 'bubble') {
        if (!glowOnly) ctx.drawImage(bubbleTexture, q.x - q.size, q.y - q.size, q.size * 2, q.size * 2);
      } else if (q.kind === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = q.col;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.4 + t * 0.9), 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = q.col; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawLighting(camX, camY){
    const p = G.player;
    const dt = depthT(camY + VH * 0.5);
    const base = clamp(lerp(0.18, 0.79, Math.pow(dt, 0.85)) + Math.min(0.22, G.inkT * 0.09), 0, 0.985);
    dctx.setTransform(LIGHT_SCALE, 0, 0, LIGHT_SCALE, 0, 0);
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, VW, VH);
    dctx.fillStyle = 'rgba(0,3,8,' + base.toFixed(3) + ')';
    dctx.fillRect(0, 0, VW, VH);

    dctx.globalCompositeOperation = 'destination-out';
    const punch = (x, y, r, strength) => {
      const g = dctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + strength + ')');
      g.addColorStop(0.55, 'rgba(0,0,0,' + (strength * 0.72) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath(); dctx.arc(x, y, r, 0, TAU); dctx.fill();
    };

    if (p && p.alive) {
      const px = p.x - camX, py = p.y - camY + p.tilt * 6;
      punch(px, py, lerp(385, 290, dt), 1);
      /* ツイン・ヘッドライトの光条 */
      for (const off of [-LAMP_Y, LAMP_Y]) {
        const ca = p.tilt + Math.PI / 2;
        const ox = Math.cos(ca) * off, oy = Math.sin(ca) * off;
        dctx.save();
        dctx.translate(px + ox, py + oy); dctx.rotate(p.tilt);
        dctx.translate((ready(subArt) ? LAMP_X : 40) - p.recoil * 6, 0);
        dctx.drawImage(beamTexture, 0, -BEAM_HALF_HEIGHT, BEAM_LENGTH + 80, BEAM_HALF_HEIGHT * 2);
        dctx.restore();
      }
      /* sonar pulse reveal */
      if (p.sonarR > 0) {
        dctx.strokeStyle = 'rgba(0,0,0,' + clamp(0.9 - p.sonarR / 4.4, 0, 1) + ')';
        dctx.lineWidth = 26;
        dctx.beginPath(); dctx.arc(px, py, p.sonarR * 210, 0, TAU); dctx.stroke();
      }
    }

    /* dynamic lights punch holes in darkness */
    for (const l of G.lights) {
      const s = l.life / l.max;
      punch(l.x - camX, l.y - camY, l.r * (0.6 + s * 0.6), clamp(s * 1.0, 0, 1));
    }
    /* bioluminescence of nearby creatures */
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.kind === 'angler') punch(e.x - camX, e.y - camY, 190, 0.85);
      else if (e.kind === 'jelly') punch(e.x - camX, e.y - camY, 130, 0.5);
      else if (e.kind === 'leviathan' && G.boss) punch(e.x - camX, e.y - camY, 620, 0.75);
      else if (e.kind === 'squid') punch(e.x - camX, e.y - camY, 560, 0.72);
      else if (e.kind === 'mine') punch(e.x - camX, e.y - camY, 60, 0.3);
      else if (e.kind === 'hermit' && e.state === 'active') punch(e.x - camX, e.y - camY, 150, 0.55);
      else if (e.kind === 'gunner') punch(e.x - camX, e.y - camY, 175, 0.65);
    }
    for (const k of G.pickups) punch(k.x - camX, k.y - camY, 90, 0.7);

    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(darkCv, 0, 0, VW, VH);
  }

  function drawGlowPass(camX, camY){
    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.globalCompositeOperation = 'lighter';

    /* explosion lights */
    for (const l of G.lights) {
      const s = l.life / l.max;
      const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(255,240,200,' + (s * 0.75).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill();
    }
    /* 弾のブルーム（暗い海で弾道を読ませる） */
    for (const b of G.bullets) {
      const sx = b.x, sy = b.y;
      if (sx < camX - 60 || sx > camX + VW + 60) continue;
      const missile = b.kind === 'missile';
      const r = missile ? (44 + 14 * (b.vscale || 1)) : 30;
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, r);
      g.addColorStop(0, missile ? 'rgba(255,237,201,0.75)' : 'rgba(200,248,255,0.5)');
      if (missile) g.addColorStop(0.24, 'rgba(239,85,51,0.30)');
      g.addColorStop(1, missile ? 'rgba(120,15,5,0)' : 'rgba(70,170,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    }
    /* rings */
    for (const r of G.rings) {
      const s = r.life / r.max;
      ctx.globalAlpha = s * 0.8;
      ctx.strokeStyle = r.col; ctx.lineWidth = r.w * s + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* sonar ring */
    const p = G.player;
    if (p && p.sonarR > 0) {
      ctx.globalAlpha = clamp(1 - p.sonarR / 4.2, 0, 1);
      ctx.strokeStyle = '#7dffd8'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sonarR * 210, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* creatures that glow in the dark (readability + dread) */
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.kind === 'angler') {
        const lx = e.x + e.dir * (24 + Math.sin(e.lure) * 8), ly = e.y - 74;
        const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 110);
        g.addColorStop(0, 'rgba(200,255,240,0.9)');
        g.addColorStop(1, 'rgba(120,255,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 110, 0, TAU); ctx.fill();
        const ex = e.x - e.dir * 70, ey = e.y - 18;
        const g2 = ctx.createRadialGradient(ex, ey, 1, ex, ey, 40);
        g2.addColorStop(0, 'rgba(255,170,90,0.75)');
        g2.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(ex, ey, 40, 0, TAU); ctx.fill();
      } else if (e.kind === 'jelly') {
        const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 78);
        g.addColorStop(0, 'rgba(150,255,235,0.45)');
        g.addColorStop(1, 'rgba(60,200,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, 78, 0, TAU); ctx.fill();
      } else if (e.kind === 'hunter' || e.kind === 'minnow') {
        const big = e.kind === 'hunter';
        const ex = e.x - e.dir * 12, ey = e.y - 6;
        const rr = big ? 42 : 20;
        const g = ctx.createRadialGradient(ex, ey, 1, ex, ey, rr);
        g.addColorStop(0, big ? 'rgba(255,135,90,0.8)' : 'rgba(255,114,82,0.62)');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, rr, 0, TAU); ctx.fill();
      } else if (e.kind === 'mine') {
        const bl = 0.5 + 0.5 * Math.sin(e.t * 5);
        const g = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, 46 * bl + 12);
        g.addColorStop(0, 'rgba(255,90,80,' + (0.35 + bl * 0.45).toFixed(2) + ')');
        g.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, 46 * bl + 12, 0, TAU); ctx.fill();
      }
    }
    /* boss eye glow */
    const b = G.boss;
    if (b && !b.dead) {
      if (b.kind === 'squid') {
        const rage2 = b.hp < b.maxHp * 0.45;
        const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 460);
        g.addColorStop(0, rage2 ? 'rgba(255,110,110,0.30)' : 'rgba(90,220,255,0.26)');
        g.addColorStop(1, 'rgba(40,120,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, 460, 0, TAU); ctx.fill();
        const exs = 30, eys = -b.W * 0.34;
        const g2 = ctx.createRadialGradient(b.x + b.dir * exs, b.y + eys, 1, b.x + b.dir * exs, b.y + eys, 120);
        g2.addColorStop(0, 'rgba(200,250,255,0.62)');
        g2.addColorStop(1, 'rgba(60,180,255,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b.x + b.dir * exs, b.y + eys, 120, 0, TAU); ctx.fill();
      } else {
        const rage = b.hp < b.maxHp * 0.45;
        const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 420);
        g.addColorStop(0, rage ? 'rgba(255,80,80,0.32)' : 'rgba(255,190,110,0.20)');
        g.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, 420, 0, TAU); ctx.fill();
      }
    }
    /* player headlight + thruster bloom */
    if (p && p.alive) {
      const ca = p.tilt + Math.PI / 2;
      for (const off of [-LAMP_Y, LAMP_Y]) {
        const lampX = (ready(subArt) ? LAMP_X : 40) - p.recoil * 6;
        const hx = p.x + Math.cos(p.tilt) * lampX + Math.cos(ca) * off;
        const hy = p.y + p.tilt * 6 + Math.sin(p.tilt) * lampX + Math.sin(ca) * off;
        const hg = ctx.createRadialGradient(hx, hy, 1, hx, hy, 56);
        hg.addColorStop(0, 'rgba(255,242,205,0.58)');
        hg.addColorStop(0.34, 'rgba(234,205,135,0.16)');
        hg.addColorStop(1, 'rgba(255,185,80,0)');
        ctx.fillStyle = hg; ctx.fillRect(hx - 56, hy - 56, 112, 112);
      }
      /* スラスター排気（青白） */
      const thr = 0.18 + p.thrust * 0.7 + (p.dashT > 0 ? 0.9 : 0);
      const tail = ready(subArt) ? 69 : 56;
      const bx = p.x - Math.cos(p.tilt) * tail, by = p.y + p.tilt * 6 - Math.sin(p.tilt) * tail;
      const br = 38 + thr * 78;
      const tg = ctx.createRadialGradient(bx, by, 2, bx, by, br);
      tg.addColorStop(0, 'rgba(200,240,255,' + (0.22 + thr * 0.45).toFixed(2) + ')');
      tg.addColorStop(1, 'rgba(60,150,255,0)');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    }
    drawParticles(true);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------ *
   * 13. HUD
   * ------------------------------------------------------------------ */
  function roundRect(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function bar(g, x, y, w, h, v, c1, c2, label){
    g.fillStyle = 'rgba(8,18,26,0.72)';
    roundRect(g, x, y, w, h, h / 2); g.fill();
    g.strokeStyle = 'rgba(150,210,235,0.35)'; g.lineWidth = 1.5; g.stroke();
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr;
    roundRect(g, x + 2, y + 2, Math.max(0, (w - 4) * clamp(v, 0, 1)), h - 4, (h - 4) / 2); g.fill();
    if (label) {
      g.fillStyle = 'rgba(230,250,255,0.92)';
      g.font = 'bold 15px "Yu Gothic UI","Hiragino Sans",sans-serif';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(label, x + 10, y + h / 2 + 1);
    }
  }

  function drawHUD(){
    const p = G.player;
    ctx.save();
    ctx.textBaseline = 'middle';

    /* top-left: hull + weapons */
    if (p) {
      const pilot = p.hurtT > 0 && ready(pilotHurtArt) ? pilotHurtArt : pilotArt;
      ctx.save();
      if (ready(pilot)) {
        roundRect(ctx, 26, 58, 80, 82, 10);
        ctx.save();
        ctx.clip();
        const screen = ctx.createLinearGradient(26, 58, 106, 140);
        screen.addColorStop(0, '#143547'); screen.addColorStop(1, '#07131c');
        ctx.fillStyle = screen; ctx.fillRect(26, 58, 80, 82);
        ctx.drawImage(pilot, 26, 61, 80, 80 * pilot.naturalHeight / pilot.naturalWidth);
        ctx.restore();
        ctx.strokeStyle = p.hurtT > 0 ? '#ff9c80' : 'rgba(150,210,235,0.5)';
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.translate(92, 0);
      }
      const hpv = p.hp / p.maxHp;
      bar(ctx, 26, 58, 300, 26, hpv, hpv > 0.5 ? '#42e08b' : (hpv > 0.25 ? '#ffcc44' : '#ff4d4d'),
          hpv > 0.5 ? '#1f9e6a' : '#e0574a', '船体 ' + Math.max(0, Math.round(p.hp)) + '%');
      bar(ctx, 26, 92, 220, 18, 1 - p.heat, p.over ? '#ff5a3c' : '#61d6ff', '#2f7fd6', p.over ? '過熱!!' : '魚雷');
      /* missiles */
      ctx.fillStyle = 'rgba(8,18,26,0.72)';
      roundRect(ctx, 258, 88, 154, 26, 13); ctx.fill();
      ctx.strokeStyle = 'rgba(150,210,235,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffb14a'; ctx.font = 'bold 16px "Yu Gothic UI",sans-serif';
      ctx.fillText('ミサイル', 268, 102);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Yu Gothic UI",sans-serif';
      ctx.fillText('×' + p.missiles, 350, 102);

      /* sonar */
      const sr = 1 - p.sonarCd / 5.0;
      ctx.fillStyle = 'rgba(8,18,26,0.7)';
      roundRect(ctx, 26, 120, 140, 20, 10); ctx.fill();
      ctx.fillStyle = sr >= 1 ? '#8affd0' : 'rgba(120,180,200,0.5)';
      roundRect(ctx, 28, 122, 136 * clamp(sr, 0, 1), 16, 8); ctx.fill();
      ctx.font = 'bold 13px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = sr >= 1 ? '#032018' : 'rgba(215,245,255,0.95)';
      ctx.fillText(sr >= 1 ? 'ソナー READY' : 'ソナー充填', 38, 132);
      ctx.restore();
    }

    /* top-right: reserve the touch pause button's hit area. */
    const right = Input.mode === 'touch' ? VW - 88 : VW - 26;
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(200,240,255,0.95)';
    const depthM = Math.round(G.player ? G.player.y / 2.6 : 0);
    ctx.fillText('深度 ' + depthM + ' m ／ ' + zoneName(G.player ? G.player.y : 0), right, 32);
    ctx.font = 'bold 16px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(160,210,235,0.8)';
    ctx.fillText('圧力 ' + (1 + depthM / 10).toFixed(1) + ' atm   航行 ' + Math.round(G.dist / 10) + ' m', right, 60);
    ctx.font = 'bold 26px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('資源 ' + ledger.total().toLocaleString(), right, 96);
    ctx.font = 'bold 14px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(160,210,235,0.7)';
    ctx.fillText('撃破 ' + G.kills, right, 120);

    /* combo */
    if (G.combo > 1) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = clamp(G.comboT / 1.6, 0, 1);
      ctx.font = 'bold ' + (28 + Math.min(20, G.combo)) + 'px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = '#ff9ad5';
      ctx.fillText('COMBO ×' + G.combo, VW * 0.5, 60);
      ctx.globalAlpha = 1;
    }

    /* boss bar */
    const b = G.boss;
    if (b && !b.dead) {
      const w = VW * 0.56, x = (VW - w) / 2, y = VH - 74;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = b.kind === 'squid' ? '#cfe8ff' : '#ffd0d0';
      ctx.fillText(b.kind === 'squid' ? 'COLOSSAL SQUID — 巨大イカ' : 'LEVIATHAN — 巨大深海魚', VW / 2, y - 16);
      const bv = clamp(b.hp / b.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(10,4,8,0.8)';
      roundRect(ctx, x, y, w, 20, 10); ctx.fill();
      ctx.strokeStyle = b.kind === 'squid' ? 'rgba(140,210,255,0.6)' : 'rgba(255,140,140,0.6)';
      ctx.lineWidth = 2; ctx.stroke();
      const gr = ctx.createLinearGradient(x, 0, x + w, 0);
      if (b.kind === 'squid') { gr.addColorStop(0, '#8ad4ff'); gr.addColorStop(1, '#2a4fd0'); }
      else { gr.addColorStop(0, '#ff8a5c'); gr.addColorStop(1, '#c81e4a'); }
      ctx.fillStyle = gr;
      roundRect(ctx, x + 2, y + 2, Math.max(0, (w - 4) * bv), 16, 8); ctx.fill();
    }

    /* warning banner */
    if (G.warnT > 0) {
      ctx.globalAlpha = clamp(G.warnT, 0, 1) * (0.6 + 0.4 * Math.sin(G.time * 12));
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = '#ff5a4a';
      ctx.fillText(G.warnMsg, VW / 2, VH * 0.24);
      ctx.globalAlpha = 1;
    }

    /* touch UI */
    if (Input.mode === 'touch' && G.state === 'play') drawTouchUI();

    /* target reticle */
    const tgt = Input.mode === 'touch' ? lockTarget() : null;
    if (tgt) {
      const sx = enemyAimX(tgt) - G.camX, sy = tgt.y - G.camY;
      if (tgt.kind === 'leviathan' || tgt.kind === 'squid') {
        /* v1.8.1: ボスは頭のそばの小さな中立色ブラケット。当たり判定はシルエット側で、
           この表示はただの目印（遠くを囲う大きな赤い円は出さない）。 */
        const flip = tgt.dir < 0 ? -1 : 1;
        const cx = sx + flip * (tgt.kind === 'leviathan' ? -180 : 40);
        const rr = 44;
        ctx.strokeStyle = 'rgba(190,236,255,0.9)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a0 = i * TAU / 4 + 0.55;
          ctx.moveTo(cx + Math.cos(a0) * rr, sy + Math.sin(a0) * rr);
          ctx.arc(cx, sy, rr, a0, a0 + TAU / 4 - 1.1);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(190,236,255,0.9)';
        ctx.beginPath(); ctx.arc(cx, sy, 2.6, 0, TAU); ctx.fill();
      } else {
        const rr = tgt.r + 16;
        ctx.strokeStyle = 'rgba(255,120,90,0.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, rr, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const a = G.time * 2 + i * TAU / 4;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * (rr + 3), sy + Math.sin(a) * (rr + 3));
          ctx.lineTo(sx + Math.cos(a) * (rr + 12), sy + Math.sin(a) * (rr + 12));
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  function drawTouchUI(){
    const p = G.player;
    ctx.save();
    /* buttons */
    for (const b of Input.ui) {
      if (b.id === 'pause' && G.state !== 'play') continue;
      let ready = 1;
      if (b.id === 'sonar' && p) ready = 1 - p.sonarCd / 5.0;
      if (b.id === 'dash' && p) ready = 1 - p.dashCd / 1.35;
      if (b.id === 'missile' && p) ready = clamp(p.missiles / 3, 0, 1);
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = 'rgba(6,18,26,0.55)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = ready >= 1 ? b.col : 'rgba(120,160,180,0.5)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, 0, TAU); ctx.stroke();
      if (ready < 1) {
        ctx.strokeStyle = b.col; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(ready, 0, 1)); ctx.stroke();
      }
      if (b.id === 'fire') {
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = b.col;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 0.9;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(b.r * 0.36) + 'px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = ready >= 1 ? '#eafcff' : 'rgba(180,205,220,0.55)';
      if (b.id === 'pause') ctx.fillText('❚❚', b.x, b.y);
      else if (b.id === 'missile') ctx.fillText('ミサ\nイル', b.x, b.y);
      else ctx.fillText(b.label, b.x, b.y + 1);
      if (b.id === 'missile' && p) {
        ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
        ctx.fillStyle = '#ffb14a';
        ctx.fillText('×' + p.missiles, b.x, b.y + b.r * 0.55);
      }
    }
    /* joystick */
    const s = Input.stick;
    if (s.active) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(160,225,255,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.ox, s.oy, s.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(120,220,255,0.28)';
      ctx.beginPath(); ctx.arc(s.ox, s.oy, s.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(190,245,255,0.85)';
      ctx.beginPath(); ctx.arc(s.ox + s.dx * s.r, s.oy + s.dy * s.r, 30, 0, TAU); ctx.fill();
    } else {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = 'rgba(160,225,255,0.8)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(190, VH - 150, 78, 0, TAU); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = 'bold 15px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = 'rgba(190,240,255,0.9)';
      ctx.fillText('ここをドラッグで移動', 190, VH - 150);
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   * 14. Screens
   * ------------------------------------------------------------------ */
  function drawTitle(){
    ctx.save();
    ctx.fillStyle = 'rgba(0,6,14,0.72)';
    ctx.fillRect(0, 0, VW, VH);

    const hasPilot = ready(pilotTitleArt);
    const titleX = hasPilot ? 790 : VW / 2;
    if (hasPilot) {
      const w = 370, h = w * pilotTitleArt.naturalHeight / pilotTitleArt.naturalWidth;
      const halo = ctx.createRadialGradient(232, 456, 36, 232, 456, 290);
      halo.addColorStop(0, 'rgba(32,131,164,0.38)');
      halo.addColorStop(1, 'rgba(15,76,113,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 150, 520, VH - 150);
      ctx.drawImage(pilotTitleArt, 47, VH - h, w, h);
    }
    const bob = Math.sin(G.time * 1.4) * 4;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(140,215,255,0.75)';
    ctx.fillText('スマホゲーム工房  presents', titleX, 128 + bob);

    ctx.font = 'bold 88px "Yu Gothic UI",sans-serif';
    const tg = ctx.createLinearGradient(0, 170, 0, 260);
    tg.addColorStop(0, '#dffaff'); tg.addColorStop(0.5, '#61d6ff'); tg.addColorStop(1, '#1a6fa8');
    ctx.fillStyle = tg;
    ctx.fillText('ABYSS DIVE', titleX, 205 + bob);

    ctx.font = 'bold 40px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#9fe8ff';
    ctx.fillText('深 淵 潜 航', titleX, 272 + bob);

    ctx.font = '17px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(175,220,245,0.85)';
    const ly = 348;
    const lines = [
      '【キーボード／マウス】  照準＝マウス   移動＝WASD・矢印   魚雷＝左クリック / J（1発ずつ）',
      'ミサイル＝右クリック / K    緊急回避＝SPACE    ソナー＝SHIFT    P＝停止  M＝消音',
      '【スマホ】  左側ドラッグ＝移動   画面タップ／「撃つ」＝魚雷   右のボタン＝ミサイル・回避・ソナー'
    ];
    lines.forEach((s, i) => ctx.fillText(s, titleX, ly + i * 30, hasPilot ? 840 : VW - 80));

    ctx.font = 'bold 26px "Yu Gothic UI",sans-serif';
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.time * 3.4);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('▶ タップ / クリックで潜航開始', titleX, 486);
    ctx.globalAlpha = 1;

    ctx.font = '15px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(150,200,225,0.7)';
    ctx.fillText('最深部に眠る巨大生物に注意。ソナーは常に鳴らせ。', titleX, 528);
    ctx.restore();
  }

  function drawDead(){
    ctx.save();
    ctx.fillStyle = 'rgba(8,0,2,' + clamp(0.35 + G.deathT * 0.35, 0, 0.85) + ')';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 76px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('船 体 崩 壊', VW / 2, 250);
    ctx.font = 'bold 22px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.fillText('HULL BREACH — 深度 ' + Math.round((G.player ? G.player.y : 0) / 2.6) + ' m', VW / 2, 312);
    ctx.font = 'bold 44px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('資源  ' + ledger.total().toLocaleString(), VW / 2, 386);
    ctx.font = 'bold 20px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(190,225,245,0.85)';
    ctx.fillText('撃破 ' + G.kills + ' 体   巨獣 ' + G.bossKills + ' 体   航行 ' + Math.round(G.dist / 10) + ' m', VW / 2, 428);
    ctx.font = 'bold 24px "Yu Gothic UI",sans-serif';
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.time * 3.6);
    ctx.fillStyle = '#8affd0';
    ctx.fillText('タップ / R キーで再潜航', VW / 2, 500);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPause(){
    ctx.save();
    ctx.fillStyle = 'rgba(0,6,14,0.7)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 56px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = '#9fe8ff';
    ctx.fillText('一時停止', VW / 2, VH / 2 - 30);
    ctx.font = '20px "Yu Gothic UI",sans-serif';
    ctx.fillStyle = 'rgba(190,225,245,0.85)';
    ctx.fillText('P / ESC / ❚❚ で再開', VW / 2, VH / 2 + 40);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   * 15. Render pipeline
   * ------------------------------------------------------------------ */
  function drawImpactMarkers(camX, camY){
    ctx.save();
    ctx.lineCap = 'round';
    for (const hit of G.impacts) {
      const x = hit.x - camX, y = hit.y - camY;
      const outer = lerp(21, 14, hit.life / 0.26);
      ctx.globalAlpha = Math.min(1, hit.life / 0.11);
      ctx.beginPath();
      for (const dx of [-1, 1]) {
        for (const dy of [-1, 1]) {
          ctx.moveTo(x + dx * 6, y + dy * 6);
          ctx.lineTo(x + dx * outer, y + dy * outer);
        }
      }
      ctx.strokeStyle = '#39200c'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = '#fff0b8'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }

  function render(){
    const camX = G.camX, camY = G.camY;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#000308';
    ctx.fillRect(0, 0, view.cssW, view.cssH);

    ctx.save();
    ctx.translate(view.ox + G.shakeX * view.scale, view.oy + G.shakeY * view.scale);
    ctx.scale(view.scale, view.scale);
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

    drawBackground(camX, camY);
    drawDepthScrim(camY);
    const baseView = G.state === 'play' && G.baseMarker ? {
      marker: G.baseMarker, r: DIVE_BASE.r, near: G.baseNear,
      stage: baseStage(G.player.x, G.player.y, G.baseMarker), time: G.time,
    } : null;
    // 建物は背景。接岸直前でも自艇・敵・射出した弾を隠さない。
    if (baseView) base.renderDiveMarker(camX, camY, baseView);
    drawWaterAtmosphere(camX, camY);
    drawWorld(camX, camY);
    drawLighting(camX, camY);
    drawHeadlightAtmosphere(camX, camY);
    drawGlowPass(camX, camY);

    /* v1.6.0 徒歩探索の入口マーカー（潜航の描画関数には触れず、上へ1つ足すだけ） */
    if (G.state === 'play') explore.renderDiveEntrance(camX, camY, {
      x: DIVE_ENTRANCE.x, y: DIVE_ENTRANCE.y, r: DIVE_ENTRANCE.r, near: G.entranceNear,
    });

    if (baseView) base.renderDiveMarker(camX, camY, baseView, true);

    /* vignette */
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);

    /* flashes */
    if (G.flash > 0) { ctx.fillStyle = 'rgba(255,240,210,' + (G.flash * 0.55).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }
    if (G.hurtFlash > 0) {
      const hg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.8);
      hg.addColorStop(0, 'rgba(255,0,0,0)');
      hg.addColorStop(1, 'rgba(255,30,30,' + (G.hurtFlash * 0.55).toFixed(3) + ')');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, VH);
    }

    if (G.state === 'title') drawTitle();
    else {
      drawImpactMarkers(camX, camY);
      drawHUD();
      if (G.state === 'pause') drawPause();
      if (G.state === 'dead') drawDead();
    }

    /* crosshair (mouse mode) */
    if (Input.mode === 'mouse' && G.state === 'play') {
      ctx.save();
      ctx.translate(Input.mx, Input.my);
      ctx.strokeStyle = 'rgba(255,150,120,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-20, 0); ctx.lineTo(-6, 0); ctx.moveTo(6, 0); ctx.lineTo(20, 0);
      ctx.moveTo(0, -20); ctx.lineTo(0, -6); ctx.moveTo(0, 6); ctx.lineTo(0, 20);
      ctx.stroke();
      ctx.restore();
    }

    /* in-game pause button (touch) */
    if (Input.mode === 'touch' && G.state === 'play') {
      const b = Input.ui.find(x => x.id === 'pause');
      if (b) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(6,18,26,0.6)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(180,215,235,0.7)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 2, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#e6f6ff'; ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('❚❚', b.x, b.y + 1);
        ctx.restore();
      }
    }

    /* v1.6.0 入口近くのタッチ「降艇」ボタン（v1.10.0: 基地の「入港」も同じ位置） */
    if (G.state === 'play' && (G.entranceNear || G.baseNear) && Input.mode === 'touch') {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = 'rgba(6,18,26,0.6)';
      ctx.beginPath(); ctx.arc(DOCK_BTN.x, DOCK_BTN.y, DOCK_BTN.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(DOCK_BTN.x, DOCK_BTN.y, DOCK_BTN.r - 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px "Yu Gothic UI",sans-serif';
      ctx.fillStyle = '#eafcff';
      ctx.fillText(G.baseNear ? '入港' : '降艇', DOCK_BTN.x, DOCK_BTN.y + 1);
      ctx.restore();
    }

    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   * 16. Flow
   * ------------------------------------------------------------------ */
  function clickScreen(){
    if (G.state === 'title') { startGame(); return true; }
    if (G.state === 'dead' && G.deathT > 0.8) { startGame(); return true; }
    if (G.state === 'pause') { G.state = 'play'; return true; }
    return false;
  }

  function startGame(){
    AU.resume();
    seed = (Date.now() & 0xffff) | 1;
    G.state = 'play'; G.time = 0; G.dt = 0;
    G.player = makePlayer();
    G.enemies = []; G.bullets = []; G.ebullets = []; G.parts = [];
    G.rocks = []; G.spires = []; G.pickups = []; G.floats = []; G.lights = []; G.silh = []; G.rings = []; G.ruins = []; G.impacts = [];
    G.camX = 0; G.camY = clamp(G.player.y - VH * 0.5, 0, FLOOR_Y - VH);
    G.score = 0; G.kills = 0; G.combo = 0; G.comboT = 0; G.bossKills = 0;
    G.genX = 0; G.nextBossAt = 8600; G.dist = 0; G.boss = null; G.spawnT = 1.0; G.genRuinX = 0;
    G.warnMsg = ''; G.warnT = 0; G.flash = 0; G.hurtFlash = 0; G.shake = 0; G.deathT = 0; G.inkT = 0;
    clearFireHold();
    Input.wantMissile = Input.wantDash = Input.wantSonar = false;
    Input.stick.active = false; Input.stick.dx = Input.stick.dy = 0;
    /* v1.6.0: 探索の進捗もリセット（新しい潜航で遺物はまた未調査に戻る） */
    G.exploreOn = false; G.entranceNear = false;
    explore.leave(); explore.reset();
    /* v1.10.0: 基地もリセット（新しい潜航では再びボスを倒してから開く）。
       資源残高は維持し、付与済みの記録だけ捨てる（やり直しで進行が壊れない）。 */
    G.baseOn = false; G.baseNear = false; G.baseMarker = null;
    base.leave(); base.reset(); ledger.resetDive();
    G.resource = ledger.total();
    generateTo(G.camX + VW + 1400);
    /* opening calm: clear immediate threats */
    G.enemies = G.enemies.filter(e => e.x > G.camX + VW * 0.9);
  }

  function frame(now){
    if (!running) return;
    requestAnimationFrame(frame);
    if (now < frame.next - 0.8) return;
    const interval = 1000 / 60;
    frame.next = Math.max(frame.next + interval, now);
    const dt = Math.min(0.05, (now - frame.last) / 1000);
    frame.last = now;

    pollGamepad();

    /* v1.6.0 徒歩探索中は潜航シミュレーションを止め、探索の更新と描画だけを行う */
    if (G.exploreOn) {
      Input.wantPause = false;
      explore.update(dt);
      explore.render();
      return;
    }

    /* v1.10.0 基地（室内）中も潜航を止め、室内の更新と描画だけを行う */
    if (G.baseOn) {
      Input.wantPause = false;
      base.update(dt);
      base.render();
      return;
    }

    if (Input.wantPause) {
      Input.wantPause = false;
      if (G.state === 'play') { G.state = 'pause'; clearFireHold(); }
      else if (G.state === 'pause') G.state = 'play';
    }

    if (G.state !== 'pause') update(dt);
    if (G.state === 'play') checkDiveEntrance();
    render();
  }


  /* ------------------------------------------------------------------ *
   * 17. ライフサイクル（ハブからの起動・停止・破棄）
   * ------------------------------------------------------------------ */
  /* 構築時に一度だけ初期化しておく（起動直後の1フレーム目から描けるように） */
  resize();
  buildUI();
  G.player = makePlayer();
  G.player.alive = false;
  generateTo(VW * 2);

  /* ------------------------------------------------------------------ *
   * 17b. 徒歩探索（v1.6.0）— 潜航から降りて遺跡を歩く小さなループ
   *   実体は explore.js / ルールは explore-rules.js に分離。ここは受け渡しだけ。
   * ------------------------------------------------------------------ */
  const explore = createExplore({
    ctx, view, VW, VH, Input, toLogical,
    art: { city: ruinsArt, walk: suitWalkArt, shootUpper: suitShootUpperArt, shootBody: suitShootBodyArt,
      foe: foeArt, foeDormant: foeDormantArt },
    onSurvey: (idx) => { AU.pick(); addResourceOnce('relic' + idx, 250); },
    onReturn: () => exitExplore(),
    onShoot: () => { AU.hit(); },
    /* v1.9.0 戦闘の音と敗北（潜水艇へ撤退＝短い回復経路） */
    onHurt: () => { AU.hurt(); },
    onKill: () => { AU.boom(0.9); addResourceOnce('foe', 40); },
    onDefeat: () => { exitExplore(); },
  });

  /* v1.10.0: 海底基地（室内）。薄暗い格納庫を歩き、船に戻れば出港する。 */
  const base = createBase({
    ctx, view, VW, VH, Input, toLogical,
    art: { interior: baseHangarArt, ellieIdle: ellieIdleArt, ellieWalk: ellieWalkArt, sub: subArt },
    onDepart: () => exitBase(),
    panel: upgradePanel,                 // v1.11.0: 整備端末
    balance: () => ledger.total(),
  });

  /* 予約入力を捨てる（降艇・帰還のたびに前の押下を持ち越さない） */
  function clearInputLatch(){
    Input.fireQueued = false;
    Input.wantMissile = Input.wantDash = Input.wantSonar = Input.wantPause = Input.wantDock = false;
    clearFireHold();
    Input.stick.active = false; Input.stick.dx = 0; Input.stick.dy = 0;
    if (Input.pad) Input.pad.actionEdge = false;
  }

  function enterExplore(){
    if (G.exploreOn) return;
    G.exploreOn = true;
    G.entranceNear = false;
    explore.enter();
    clearInputLatch();
    AU.resume(); AU.warp();
  }

  function exitExplore(){
    if (!G.exploreOn) return;
    G.exploreOn = false;
    explore.leave();
    clearInputLatch();
    const p = G.player;
    if (p) {
      p.x = DIVE_ENTRANCE.x + (DIVE_ENTRANCE.r + 90);   // 入口の外側へ出して再突入を防ぐ
      p.vx = 0; p.vy = 0; p.inv = Math.max(p.inv, 0.7);
    }
    AU.warp();
  }

  /* v1.10.0: 基地への入港／出港。室内は有限の安全区画（敵もダメージも無い）。 */
  function enterBase(){
    if (G.baseOn) return;
    G.baseOn = true; G.baseNear = false;
    base.enter();
    clearInputLatch();
    AU.resume(); AU.warp();
  }

  function exitBase(){
    if (!G.baseOn) return;
    G.baseOn = false;
    base.leave();
    clearInputLatch();
    const p = G.player;
    if (p && G.baseMarker){
      p.x = G.baseMarker.x - (DIVE_BASE.r + 120);   // ドックの外側へ出して再入港を防ぐ
      p.y = G.baseMarker.y;
      p.vx = 0; p.vy = 0; p.inv = Math.max(p.inv, 0.7);
    }
    AU.warp();
  }

  /* 潜航中: 入口・基地の近くでのみ、明示操作で降りる／入港する（勝手にワープしない）。 */
  function checkDiveEntrance(){
    const p = G.player;
    if (!p || !p.alive) { G.entranceNear = false; G.baseNear = false; Input.wantDock = false; return; }
    const d = Math.hypot(p.x - DIVE_ENTRANCE.x, p.y - DIVE_ENTRANCE.y);
    G.entranceNear = d <= DIVE_ENTRANCE.r + 46;
    G.baseNear = baseDockNear(p.x, p.y, G.baseMarker);
    const padAction = !!(Input.pad && Input.pad.actionEdge);
    if (G.entranceNear && (Input.wantDock || padAction)) { Input.wantDock = false; enterExplore(); return; }
    if (G.baseNear && (Input.wantDock || padAction)) { Input.wantDock = false; enterBase(); return; }
    Input.wantDock = false;
  }

  /* ゲームパッド（スティック／十字キー移動、Aで調べる・降艇を同時押しできる） */
  function pollGamepad(){
    if (!Input.pad) return;
    const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : null;
    let pad = null;
    if (pads) for (const q of pads) { if (q && q.connected) { pad = q; break; } }
    const prev = Input.pad.action;
    if (!pad) { Input.pad.x = 0; Input.pad.action = false; Input.pad.actionEdge = false; return; }
    let ax = (pad.axes && pad.axes.length) ? (pad.axes[0] || 0) : 0;
    const b = pad.buttons || [];
    if (b[14] && b[14].pressed) ax -= 1;      // 十字キー左
    if (b[15] && b[15].pressed) ax += 1;      // 十字キー右
    ax = Math.abs(ax) < 0.28 ? 0 : clamp(ax, -1, 1);
    const aNow = !!(b[0] && b[0].pressed);    // A / ×
    Input.pad.x = ax;
    Input.pad.actionEdge = aNow && !prev;
    Input.pad.action = aNow;
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    frame.last = performance.now();
    frame.next = frame.last;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  function destroy() {
    running = false;
    for (const [t, type, fn, opt] of _listeners) t.removeEventListener(type, fn, opt);
    _listeners.length = 0;
    /* 音を止めて AudioContext を閉じる（起動のたびに作り直すので、閉じないと枯渇する） */
    try { AU.setRumble(0); } catch (e) { /* noop */ }
    try {
      if (AU.ctx && AU.ctx.state !== 'closed') AU.ctx.close();
    } catch (e) { /* noop */ }
    AU.ctx = null; AU.on = false;
    G.enemies.length = 0; G.bullets.length = 0; G.ebullets.length = 0;
    G.parts.length = 0; G.lights.length = 0; G.rings.length = 0; G.impacts.length = 0;
    G.exploreOn = false; explore.leave();
    G.baseOn = false; base.leave();
  }

  function state() {
    return {
      state: G.state,
      mode: G.baseOn ? 'base' : (G.exploreOn ? 'explore' : 'dive'),   // v1.6.0 徒歩探索 / v1.10.0 基地
      px: G.player ? Math.round(G.player.x) : null,
      py: G.player ? Math.round(G.player.y) : null,
      hp: G.player ? Math.round(G.player.hp) : null,
      aim: G.player ? +G.player.aim.toFixed(2) : null,
      enemies: G.enemies.length, bullets: G.bullets.length, ebullets: G.ebullets.length,
      parts: G.parts.length, rocks: G.rocks.length, pickups: G.pickups.length,
      score: G.score, resource: ledger.total(), kills: G.kills, boss: !!G.boss,
      stats: G.stats,                                 // v1.11.0: 実効性能（改造の反映）
      upgrades: upgrades.levels(),                    // v1.11.0: 購入済みの改造レベル
      camX: Math.round(G.camX), camY: Math.round(G.camY), genX: Math.round(G.genX),
      entranceNear: !!G.entranceNear,                 // v1.6.0: 入口の近くか
      baseNear: !!G.baseNear,                         // v1.10.0: 入港圏か
      baseMarker: !!G.baseMarker,                     // v1.10.0: 基地が開いているか
      explore: explore ? explore.state() : null,      // v1.6.0: 探索状態（観測用）
      base: base ? base.state() : null,               // v1.10.0: 基地の室内状態（観測用）
    };
  }

  /* 検証・デバッグ用の入り口（index.js が window.__abyss に載せる） */
  return { start, stop, destroy, resize, state, startGame, enterExplore, exitExplore, enterBase, exitBase,
    G, Input, AU, errors,
    /* v1.11.0: 整備・改造の検証用（資源付与・保存・実効性能） */
    addResource, ledger, upgrades, upgradePanel, stats: () => G.stats };
}
