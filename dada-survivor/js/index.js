/**
 * ダダサバイバーもどき — こども向け オートアタック・サバイバル（canvas不使用・DOM＋SVGトゥーン描画）
 * ゆびで うごかすだけ。こうげきは じどう。5ふん いきのこって ボスを たおそう！
 */
import { sound } from '../../common/js/audio.js?v=151';
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import {
  STAGE_SECONDS, MINI_BOSS_SECONDS, MAX_ENEMIES, MAX_GEMS, MAX_LEVEL, DIFFICULTIES, CHARACTERS, ENEMY_TYPES,
  WEAPONS, PASSIVES, STAGES, GUNS, weaponStat, xpToNext, playerStats, spawnPlan, pickWeighted, upgradeChoices,
  normalizeSave, stageById, bossType, bonusFor, clearRewards, receiveGift, clampZoom, pinchZoom, wheelZoom,
  newQuality, adaptQuality,
} from './rules.js?v=189';
import { EnemyGrid, nearestN } from './grid.js?v=189';
import { preloadArt } from './art.js?v=189';
import { Stage } from './stage.js?v=189';
import { menuMethods, iconHtml } from './menus.js?v=189';
import { PopBGM } from './bgm.js?v=189';

const SAVE_KEY = 'dada_survivor_save';
const TAU = Math.PI * 2;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
// はいれつを その場で つめる（filter と おなじ じゅんばん・あたらしい はいれつを つくらない）
function compact(list, keep) {
  let j = 0;
  for (let i = 0; i < list.length; i++) { const v = list[i]; if (keep(v)) list[j++] = v; }
  list.length = j;
  return list;
}
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const DadaSurvivorGame = {
  ...menuMethods,
  id: 'dada-survivor',
  title: 'ダダサバイバーもどき',
  subtitle: 'ゆびで うごいて いきのこれ！',
  icon: '🐱',
  color: '#22c55e',
  section: 'kids',
  description: 'こうげきは じどう！ じゅう・ショットガン・バズーカを あつめて、ボスを たおそう！',

  // 起動時にこのゲームのCSSを自分で読み込む（?v= はこのフォルダ内で管理）。ハブが init 前に await する
  prepare() {
    return loadCss(new URL('../css/dada-survivor.css?v=189', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.save = normalizeSave(storage.get(SAVE_KEY));
    this.run = null;
    this.paused = false;
    this.keys = new Set();
    this.stick = null;
    this.zoom = this.save.zoom;
    this.bgm = new PopBGM(sound); // ダダサバイバー せんようの ポップ BGM（工房の きょうつう BGM は つかわない）
    this.touches = new Map(); // いま さわっている ゆび（pointerId → いち）
    this.pinch = null;
    this.buildDom();
    this.bindEvents();
    this.resize();
    preloadArt();
    this.showTitle();
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  },

  destroy() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.bannerTimer);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('visibilitychange', this.onVisibility);
    clearTimeout(this.zoomSaveTimer);
    this.bgm.stop();
    sound.stopBGM();
    this.run = null;
  },

  persist() { storage.set(SAVE_KEY, this.save); },

  /* ================= DOM ================= */
  buildDom() {
    this.container.innerHTML = `
      <div class="ds-root">
        <div class="ds-hud hidden">
          <div class="ds-xp"><div class="ds-xp-fill"></div><span class="ds-lv">Lv 1</span></div>
          <div class="ds-hud-row">
            <span class="ds-chip ds-time">0:00</span>
            <span class="ds-chip ds-kills">💀 0</span>
            <span class="ds-chip ds-coins">🪙 0</span>
            <button class="ds-pause" aria-label="ポーズ">Ⅱ</button>
          </div>
          <div class="ds-skills"></div>
          <div class="ds-boss hidden"><span class="ds-boss-name"></span><div class="ds-boss-bar"><div class="ds-boss-fill"></div></div></div>
        </div>
        <div class="ds-banner hidden"></div>
        <div class="ds-overlay hidden"></div>
      </div>`;
    const $ = s => this.container.querySelector(s);
    this.root = $('.ds-root');
    this.stage = new Stage(this.root);
    // HUD類はステージより手前に
    for (const s of ['.ds-hud', '.ds-banner', '.ds-overlay']) this.root.appendChild($(s));
    this.hud = $('.ds-hud');
    this.overlay = $('.ds-overlay');
    this.banner = $('.ds-banner');
    this.el = {
      xpFill: $('.ds-xp-fill'), lv: $('.ds-lv'), time: $('.ds-time'), kills: $('.ds-kills'),
      coins: $('.ds-coins'), boss: $('.ds-boss'), bossName: $('.ds-boss-name'), bossFill: $('.ds-boss-fill'),
      skills: $('.ds-skills'),
    };
    this.hudCache = {};
    $('.ds-pause').addEventListener('click', () => { sound.playTap(); this.showPause(); });
  },

  bindEvents() {
    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this.onKeyDown = e => {
      const k = e.key.toLowerCase();
      if (this.run && !this.paused && (k === '+' || k === '=' || k === '-')) { this.setZoom(this.zoom * (k === '-' ? 0.9 : 1 / 0.9)); return; }
      this.keys.add(k);
    };
    this.onKeyUp = e => { this.keys.delete(e.key.toLowerCase()); };
    this.onVisibility = () => { if (document.hidden && this.run && !this.paused) this.showPause(); };
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('visibilitychange', this.onVisibility);

    // どこを さわっても ジョイスティック。2ほんゆびは ピンチで ズーム（そのあいだ キャラは とまる）
    const v = this.stage.view;
    const pinchDist = () => { const [a, b] = [...this.touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    v.addEventListener('pointerdown', e => {
      if (!this.run || this.paused) return;
      v.setPointerCapture?.(e.pointerId);
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.touches.size >= 2) {
        this.stick = null;
        if (this.touches.size === 2) this.pinch = { dist: pinchDist(), zoom: this.zoom };
        return;
      }
      if (this.pinch) return; // ピンチの あと、ゆびを ぜんぶ はなすまで うごかさない
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    });
    v.addEventListener('pointermove', e => {
      const t = this.touches.get(e.pointerId);
      if (t) { t.x = e.clientX; t.y = e.clientY; }
      if (this.pinch && !this.pinch.done && this.touches.size >= 2) { this.setZoom(pinchZoom(this.pinch.zoom, this.pinch.dist, pinchDist())); return; }
      if (this.stick && this.stick.id === e.pointerId) { this.stick.x = e.clientX; this.stick.y = e.clientY; }
    });
    const end = e => {
      this.touches.delete(e.pointerId);
      if (this.stick && this.stick.id === e.pointerId) this.stick = null;
      if (this.pinch && this.touches.size < 2) this.pinch.done = true; // のこった 1ぽんでは うごかさない
      if (this.touches.size === 0) this.pinch = null;
    };
    v.addEventListener('pointerup', end);
    v.addEventListener('pointercancel', end);
    // PC：ホイール（トラックパッドの ピンチ＝ctrl+ホイール も おなじ）
    v.addEventListener('wheel', e => {
      e.preventDefault();
      if (!this.run || this.paused) return;
      this.setZoom(wheelZoom(this.zoom, e.deltaY * (e.ctrlKey ? 4 : 1)));
    }, { passive: false });
    // iOS Safari の ページズームを とめる（touch-action: none に くわえて）
    const stop = e => e.preventDefault();
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) this.root.addEventListener(ev, stop, { passive: false });
    this.root.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  },

  /** カメラの ズームを かえる（HUD は そのまま。セーブにも のこす） */
  setZoom(z) {
    z = clampZoom(z);
    if (z === this.zoom) return;
    this.zoom = z;
    this.save.zoom = z;
    this.resize();
    clearTimeout(this.zoomSaveTimer);
    this.zoomSaveTimer = setTimeout(() => this.persist(), 500);
  },

  resize() {
    const r = this.container.getBoundingClientRect();
    this.rect = r;
    // this.w / this.h は ズームを いれた「せかいで みえる はば」。てきの でる きょりや けんきゅうしゃの いちは これを つかう
    this.sw = Math.max(1, r.width || window.innerWidth);
    this.sh = Math.max(1, r.height || window.innerHeight);
    const z = this.zoom || 1;
    this.w = this.sw / z;
    this.h = this.sh / z;
    this.battleR = Math.hypot(this.sw, this.sh) / 2 + 50; // ズームに かんけいない「たたかいの はんい」
    this.stage.resize(this.w, this.h, z);
  },

  /* ================= 画面 ================= */
  setOverlay(html) {
    this.overlay.innerHTML = html;
    this.overlay.classList.toggle('hidden', !html);
  },

  showPause() {
    if (!this.run || this.paused) return;
    this.paused = true; this.stick = null; this.stage.joystick(null);
    const r = this.run;
    const owned = [
      ...Object.entries(r.weapons).map(([id, lv]) => `<span class="ds-own">${iconHtml(id, WEAPONS[id].icon, 'ds-icon sm')}${lv}</span>`),
      ...Object.entries(r.passives).map(([id, lv]) => `<span class="ds-own">${iconHtml(id, PASSIVES[id].icon, 'ds-icon sm')}${lv}</span>`),
    ].join('');
    this.setOverlay(`
      <div class="ds-panel">
        <div class="ds-h">ひとやすみ</div>
        <div class="ds-owned">${owned}</div>
        <button class="ds-btn ds-go" data-act="resume">▶ つづける</button>
        <button class="ds-btn ds-sub-btn" data-act="quit">🏳 やめる</button>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      sound.playTap();
      if (b.dataset.act === 'resume') this.resume();
      else this.endRun(false);
    };
  },

  resume() {
    this.paused = false;
    this.setOverlay('');
    this.lastTime = performance.now();
  },

  showLevelUp() {
    const r = this.run;
    this.paused = true; this.stick = null; this.stage.joystick(null);
    const choices = upgradeChoices(r.weapons, r.passives);
    const gunMenu = choices.length === 3 && choices.every(c => c.kind === 'weapon' && c.level === 1 && GUNS.includes(c.id));
    const card = c => {
      if (c.kind === 'evolve') {
        const w = WEAPONS[c.id];
        return [iconHtml(c.id, w.icon), w.name, 'しんか！', w.desc, 'evo'];
      }
      if (c.kind === 'weapon') {
        const w = WEAPONS[c.id];
        return [iconHtml(c.id, w.icon), w.name, c.level === 1 ? 'あたらしい！' : `Lv${c.level}`, w.desc, c.level === 1 ? 'new' : ''];
      }
      if (c.kind === 'passive') { const p = PASSIVES[c.id]; return [iconHtml(c.id, p.icon), p.name, `Lv${c.level}`, p.desc, '']; }
      if (c.kind === 'food') return [iconHtml('meat', '🍖'), 'おにく', '', 'たいりょく かいふく', ''];
      return [iconHtml('coin', '🪙'), 'コイン', '', 'コイン +20', ''];
    };
    sound.playHighScore();
    this.setOverlay(`
      <div class="ds-panel ds-levelup">
        <div class="ds-h ds-pop">レベルアップ！</div>
        <div class="ds-sub">${gunMenu ? 'どの ぶきにする？' : 'ひとつ えらんでね'}</div>
        ${choices.map((c, i) => { const [icon, name, lv, desc, cls] = card(c); return `
          <button class="ds-card ${cls}" data-pick="${i}" style="animation-delay:${i * 70}ms">
            ${icon}
            <span class="ds-card-text"><b>${name}</b>${lv ? `<em>${lv}</em>` : ''}<small>${desc}</small></span>
          </button>`; }).join('')}
      </div>`);
    // まちがって すぐ おさないように すこし まつ
    this.overlay.onclick = null;
    setTimeout(() => {
      this.overlay.onclick = e => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        sound.playTap();
        this.applyChoice(choices[+b.dataset.pick]);
        r.pendingLevels--;
        if (r.pendingLevels > 0) this.showLevelUp(); else this.resume();
      };
    }, 350);
  },

  applyChoice(c) {
    const r = this.run;
    if (c.kind === 'evolve') {
      delete r.weapons[c.from];
      r.weapons[c.id] = MAX_LEVEL;
      this.showBanner(`${WEAPONS[c.id].name}に しんか！`);
    } else if (c.kind === 'weapon') r.weapons[c.id] = c.level;
    else if (c.kind === 'passive') {
      r.passives[c.id] = c.level;
      const before = r.stats.maxHp;
      this.refreshStats();
      if (c.id === 'heart') r.player.hp = Math.min(r.stats.maxHp, r.player.hp + (r.stats.maxHp - before) + 20);
    } else if (c.kind === 'food') r.player.hp = Math.min(r.stats.maxHp, r.player.hp + 50);
    else r.coins += 20;
    this.refreshSkills();
  },

  refreshSkills() {
    const r = this.run;
    if (!r || !this.el?.skills) return;
    const chip = (id, lv, table) => `<span class="ds-skill">${iconHtml(id, table[id].icon, 'ds-icon sm')}<i>${lv}</i></span>`;
    this.el.skills.innerHTML = [
      ...Object.entries(r.weapons).map(([id, lv]) => chip(id, lv, WEAPONS)),
      ...Object.entries(r.passives).map(([id, lv]) => chip(id, lv, PASSIVES)),
    ].join('');
  },

  showBanner(text, ms = 2200) {
    this.banner.textContent = text;
    this.banner.classList.remove('hidden');
    this.banner.getAnimations?.().forEach(a => a.cancel());
    this.banner.animate?.([{ transform: 'translateX(-50%) scale(.6)', opacity: 0 }, { transform: 'translateX(-50%) scale(1.08)', opacity: 1, offset: .6 }, { transform: 'translateX(-50%) scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner.classList.add('hidden'), ms);
  },

  /* ================= ゲーム進行 ================= */
  startRun() {
    const ch = CHARACTERS.find(c => c.id === this.save.character) || CHARACTERS[0];
    const st = stageById(this.save.stage);
    this.stage.reset();
    this.stage.setGround(st.ground);
    this.stage.setDecor(st.decor, 1 + Math.floor(Math.random() * 1e6));
    this.touches.clear(); this.pinch = null;
    this.run = {
      diff: DIFFICULTIES[this.save.difficulty] || DIFFICULTIES.easy,
      char: ch, stageDef: st, chests: 0,
      time: 0, kills: 0, coins: 0, earned: 0, level: 1, xp: 0, pendingLevels: 0,
      weapons: { [ch.weapon]: 1 }, passives: {}, stats: null,
      player: { x: 0, y: 0, hp: 100, hurt: 0, face: 1, mx: 0, my: 1 },
      enemies: [], shots: [], gems: [], items: [],
      timers: {}, spawnClock: 0, orbitAngle: 0, auraClock: 0,
      miniBossDone: false, finalBossDone: false, boss: null, ended: false,
      npc: null, researcherDone: false,
    };
    this.refreshStats();
    this.run.player.hp = this.run.stats.maxHp;
    this.paused = false;
    this.hudCache = {};
    this.root.classList.remove('ds-attract');
    this.setOverlay('');
    this.hud.classList.remove('hidden');
    this.el.boss.classList.add('hidden');
    this.refreshSkills();
    this.resize();
    this.lastTime = performance.now();
    this.bgm.start();
    this.showBanner(`ステージ${st.id} ${st.name}`, 2500);
  },

  refreshStats() { this.run.stats = playerStats(this.run.passives, this.save.shop, bonusFor(this.save, this.run.char.id)); },

  endRun(clear) {
    const r = this.run; if (!r || r.ended) return;
    r.ended = true; this.paused = true; this.stick = null; this.stage.joystick(null);
    r.earned = Math.round(r.coins * r.diff.coin) + (clear ? 50 : 0);
    const s = this.save, st = r.stageDef;
    s.coins += r.earned;
    const rewards = { chests: r.chests };
    if (clear) {
      const cr = clearRewards(s, st.id, r.diff.id);
      rewards.chests += cr.chests;
      if (cr.first) {
        rewards.newStage = STAGES.find(x => x.id === st.id + 1);
        rewards.newChar = CHARACTERS.find(c => c.unlock === st.id);
      }
      s.clears += 1;
      s.stageClears[st.id] = (s.stageClears[st.id] || 0) + 1;
      if (rewards.newStage) s.stage = rewards.newStage.id;
    }
    s.pendingChests = (s.pendingChests || 0) + rewards.chests;
    const best = r.kills > s.bestKills;
    s.bestKills = Math.max(s.bestKills, r.kills);
    this.persist();
    const score = r.kills + (clear ? 1000 : 0);
    if (score > storage.getHighScore(this.id)) storage.setHighScore(this.id, score);
    if (!clear) this.bgm.stop();
    else this.bgm.setBoss(false);
    if (clear || best) sound.playHighScore(); else sound.playGameOver();
    this.showResult(clear, best, rewards);
  },

  loop(now) {
    this.frame = requestAnimationFrame(this.loop);
    const ms = now - this.lastTime, dt = Math.min(0.05, ms / 1000);
    this.lastTime = now;
    if (this.run && !this.paused) {
      // おもい ときは みための エフェクトを へらす（ゲームの うごきは かわらない）
      const q = this.quality || (this.quality = newQuality());
      adaptQuality(q, ms);
      this.stage.setLite(q.lite);
      this.update(dt);
    }
    if (this.run) this.draw();
  },

  update(dt) {
    const r = this.run, p = r.player;
    r.time += dt;

    // いどう
    let mx = 0, my = 0;
    if (this.stick) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy, d = Math.hypot(dx, dy);
      if (d > 6) { const k = Math.min(1, d / 50); mx = dx / d * k; my = dy / d * k; }
    }
    const K = this.keys;
    if (K.has('arrowleft') || K.has('a')) mx -= 1;
    if (K.has('arrowright') || K.has('d')) mx += 1;
    if (K.has('arrowup') || K.has('w')) my -= 1;
    if (K.has('arrowdown') || K.has('s')) my += 1;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    p.x += mx * r.stats.speed * dt;
    p.y += my * r.stats.speed * dt;
    if (ml > 0.1) { p.mx = mx; p.my = my; if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1; }
    p.hurt = Math.max(0, p.hurt - dt);
    if (r.stats.regen) p.hp = Math.min(r.stats.maxHp, p.hp + r.stats.regen * dt);

    this.updateSpawns(dt);
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);

    // XP → レベルアップ
    while (r.xp >= xpToNext(r.level)) { r.xp -= xpToNext(r.level); r.level++; r.pendingLevels++; }
    this.updateHud();
    if (p.hp <= 0) { this.endRun(false); return; }
    if (r.pendingLevels > 0) this.showLevelUp();
  },

  updateSpawns(dt) {
    const r = this.run;
    const st = r.stageDef;
    if (!r.miniBossDone && r.time >= MINI_BOSS_SECONDS) {
      r.miniBossDone = true;
      const e = this.spawnEnemy(st.mini.type, 1, bossType(st.mini, r.diff));
      this.showBanner(`⚠ ${e.T.name}が きた！`);
    }
    if (!r.finalBossDone && r.time >= STAGE_SECONDS) {
      r.finalBossDone = true;
      const e = this.spawnEnemy(st.boss.type, 1, bossType(st.boss, r.diff));
      e.final = true;
      this.showBanner(`⚠ ${e.T.name}が きた！ たおせば クリア！`, 3000);
    }
    const rs = st.researcher;
    if (rs && !r.researcherDone && !r.npc && r.time >= rs.at) this.spawnResearcher();
    if (r.finalBossDone) return; // ボスせんは ザコ なし
    const plan = spawnPlan(r.time, r.diff, st);
    r.spawnClock -= dt;
    if (r.spawnClock <= 0) {
      r.spawnClock = plan.interval;
      for (let i = 0; i < plan.batch && r.enemies.length < MAX_ENEMIES; i++) this.spawnEnemy(pickWeighted(plan.weights), plan.hpScale);
    }
  },

  // けんきゅうしゃ：プレイヤーの すすむ さきの がめんの なかに でる
  spawnResearcher() {
    const r = this.run, p = r.player;
    let a = Math.atan2(p.my, p.mx);
    if (!(p.mx || p.my)) a = Math.random() * TAU;
    a += (Math.random() - 0.5) * 1.2;
    const dx = Math.max(-Math.min(140, this.w / 2 - 40), Math.min(Math.min(140, this.w / 2 - 40), Math.cos(a) * 170));
    const dy = Math.max(-Math.min(220, this.h / 2 - 60), Math.min(Math.min(220, this.h / 2 - 60), Math.sin(a) * 170));
    r.npc = { x: p.x + dx, y: p.y + dy };
    sound.playItem();
    this.showBanner('けんきゅうしゃが いる！ さわって たすけよう！', 3000);
  },

  spawnEnemy(type, hpScale, T = ENEMY_TYPES[type]) {
    const r = this.run, p = r.player;
    const a = Math.random() * TAU, rad = Math.hypot(this.w, this.h) / 2 + 50;
    const hp = T.boss ? T.hp : T.hp * hpScale;
    const e = { type, T, x: p.x + Math.cos(a) * rad, y: p.y + Math.sin(a) * rad, hp, maxHp: hp, flash: 0, orbitHit: -1, kb: 0, kx: 0, ky: 0 };
    r.enemies.push(e);
    if (T.boss) { r.boss = e; this.el.bossName.textContent = T.name; this.el.boss.classList.remove('hidden'); this.bgm.setBoss(true); }
    return e;
  },

  nearestEnemies(n, maxD = 520) {
    // ズームアウトで みえる ところが ふえても、ねらえる きょりは ズーム1の がめんの そとがわ まで（ズームで つよく ならない）
    maxD = Math.min(maxD, this.battleR || maxD);
    return nearestN(this.run.enemies, this.run.player, n, maxD * maxD);
  },

  // (x, y) の まわりの てき（グリッドが つかえる あいだは ちかくだけ、もとの じゅんばん）
  enemiesNear(x, y, rad) {
    if (!this.gridOk) return this.run.enemies;
    return this.grid.query(x, y, rad, this.nearBuf || (this.nearBuf = []));
  },

  aimAngle() {
    const p = this.run.player;
    const t = this.nearestEnemies(1, 560)[0];
    if (t) return Math.atan2(t.y - p.y, t.x - p.x);
    if (p.mx || p.my) return Math.atan2(p.my, p.mx);
    return p.face < 0 ? Math.PI : 0;
  },

  fireBullets(id, lv, dmg) {
    const r = this.run, p = r.player, w = WEAPONS[id];
    if (r.shots.length > 90) return;
    const n = weaponStat(id, 'count', lv);
    const base = this.aimAngle();
    const pierce = weaponStat(id, 'pierce', lv);
    const life = weaponStat(id, 'life', lv);
    const splash = w.splash ? weaponStat(id, 'splash', lv) : 0;
    const spread = w.spread || 0;
    for (let i = 0; i < n; i++) {
      const ang = base + (n <= 1 ? 0 : (i - (n - 1) / 2) * (spread / (n - 1)));
      r.shots.push({
        kind: 'bullet', art: w.shot, size: w.size,
        x: p.x + Math.cos(ang) * 18, y: p.y + Math.sin(ang) * 18,
        vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed,
        ang, dmg, life, r: 8, pierce, splash, kb: w.kb || 0.1,
      });
    }
    const face = Math.cos(base);
    if (Math.abs(face) > 0.15) p.face = face > 0 ? 1 : -1;
    if (w.fire === 'spread') sound.play('cannon', { volume: 0.4, gap: 0.16 });
    else sound.play('crossbow', { volume: id === 'gatling' ? 0.2 : 0.34, gap: id === 'gatling' ? 0.09 : 0.07 });
    if (id !== 'gatling') this.stage.fx('pop', p.x + Math.cos(base) * 24, p.y + Math.sin(base) * 24, w.fire === 'spread' ? 46 : 30);
  },

  fireRockets(id, lv, dmg) {
    const r = this.run, p = r.player, w = WEAPONS[id];
    if (r.shots.length > 90) return;
    const n = weaponStat(id, 'count', lv);
    const targets = this.nearestEnemies(n, 700);
    const radius = weaponStat(id, 'radius', lv);
    let faceAng = 0;
    for (let i = 0; i < n; i++) {
      const t = targets[i] || null;
      const ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : this.aimAngle() + (i - (n - 1) / 2) * 0.35;
      if (i === 0) faceAng = ang;
      r.shots.push({
        kind: 'rocket', art: w.shot, size: w.size,
        x: p.x + Math.cos(ang) * 20, y: p.y + Math.sin(ang) * 20,
        ang, speed: w.speed, turn: w.turn, target: t,
        dmg, radius, life: 1.8, arm: 0.1, r: 12,
      });
    }
    const face = Math.cos(faceAng);
    if (Math.abs(face) > 0.15) p.face = face > 0 ? 1 : -1;
    sound.play('fire', { volume: 0.48, gap: 0.2 });
    this.stage.fx('pop', p.x + Math.cos(faceAng) * 28, p.y + Math.sin(faceAng) * 28, w.size > 40 ? 52 : 40);
  },

  orbitPositions() {
    const r = this.run, lv = r.weapons.orbit;
    if (!lv) return [];
    const p = r.player, n = weaponStat('orbit', 'count', lv), rad = weaponStat('orbit', 'radius', lv);
    // 同じオブジェクトを使い回す（ステージ側のDOMプールが付け替えを起こさないように）
    const orbs = r.orbs || (r.orbs = []);
    while (orbs.length < n) orbs.push({ x: 0, y: 0 });
    orbs.length = n;
    for (let i = 0; i < n; i++) {
      const a = r.orbitAngle + i * TAU / n;
      orbs[i].x = p.x + Math.cos(a) * rad; orbs[i].y = p.y + Math.sin(a) * rad;
    }
    return orbs;
  },

  updateWeapons(dt) {
    const r = this.run, p = r.player, st = r.stats, T = r.timers;
    // ここから updateShots の おわりまで てきは うごかないので、1かい つくった グリッドを つかう
    (this.grid || (this.grid = new EnemyGrid())).build(r.enemies);
    this.gridOk = true;
    const ready = (id, cd) => { T[id] = (T[id] ?? 0) - dt; if (T[id] > 0) return false; T[id] = cd * st.cooldown; return true; };
    for (const [id, lv] of Object.entries(r.weapons)) {
      const w = WEAPONS[id];
      const dmg = weaponStat(id, 'damage', lv) * st.damage;
      if (w.fire === 'bullet' || w.fire === 'spread') {
        if (ready(id, weaponStat(id, 'cooldown', lv))) this.fireBullets(id, lv, dmg);
        continue;
      }
      if (w.fire === 'rocket') {
        if (ready(id, weaponStat(id, 'cooldown', lv))) this.fireRockets(id, lv, dmg);
        continue;
      }
      if (id === 'kunai' && ready(id, weaponStat(id, 'cooldown', lv))) {
        const n = weaponStat(id, 'count', lv), targets = this.nearestEnemies(n);
        for (let i = 0; i < n; i++) {
          const t = targets[i % Math.max(1, targets.length)];
          let ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(p.my, p.mx);
          if (!t || targets.length < n) ang += (i - (n - 1) / 2) * 0.25;
          r.shots.push({ kind: 'kunai', x: p.x, y: p.y, vx: Math.cos(ang) * 440, vy: Math.sin(ang) * 440, ang, dmg, life: 1.4, r: 10, pierce: 1 });
        }
        if (targets.length) sound.play('bow', { volume: 0.35, gap: 0.12 });
      }
      if (id === 'thunder' && ready(id, weaponStat(id, 'cooldown', lv))) {
        const pool = this.nearestEnemies(12, 420);
        for (let i = 0; i < weaponStat(id, 'count', lv) && pool.length; i++) {
          const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          this.stage.fx('bolt', t.x, t.y, 150);
          this.stage.fx('pop', t.x, t.y, 70);
          this.areaDamage(t.x, t.y, 45, dmg);
        }
        sound.playLaser();
      }
      if (id === 'bomb' && ready(id, weaponStat(id, 'cooldown', lv))) {
        const t = this.nearestEnemies(8, 380), tg = t[Math.floor(Math.random() * t.length)];
        const tx = tg ? tg.x : p.x + p.mx * 150, ty = tg ? tg.y : p.y + p.my * 150;
        r.shots.push({ kind: 'bomb', sx: p.x, sy: p.y, tx, ty, t: 0, dur: 0.6, dmg, radius: weaponStat(id, 'radius', lv), life: 1 });
      }
      if (id === 'aura') {
        r.auraClock -= dt;
        if (r.auraClock <= 0) { r.auraClock = 0.5; this.areaDamage(p.x, p.y, weaponStat(id, 'radius', lv), dmg, false); }
      }
    }
    // まわるほし
    const olv = r.weapons.orbit;
    if (olv) {
      r.orbitAngle += dt * 3.2;
      const dmg = weaponStat('orbit', 'damage', olv) * st.damage;
      for (const o of this.orbitPositions()) {
        for (const e of this.enemiesNear(o.x, o.y, 14)) {
          if (e.hp <= 0 || (e.x - o.x) ** 2 + (e.y - o.y) ** 2 > (e.T.r + 14) ** 2) continue;
          if (r.time - e.orbitHit < 0.45) continue;
          e.orbitHit = r.time;
          this.hitEnemy(e, dmg, o.x, o.y);
        }
      }
    }
  },

  areaDamage(x, y, radius, dmg, knock = true) {
    // nearBuf を つかいまわすので、ここでは べつの はこに うつす（hitEnemy の なかで また よばれても こわれない）
    const list = this.gridOk ? this.grid.query(x, y, radius, this.areaBuf || (this.areaBuf = [])) : this.run.enemies;
    for (const e of list) {
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= (radius + e.T.r) ** 2) this.hitEnemy(e, dmg, knock ? x : null, y);
    }
  },

  hitEnemy(e, dmg, fromX = null, fromY = null, kbTime = 0.12) {
    if (e.hp <= 0) return;
    const d = Math.round(dmg * (0.9 + Math.random() * 0.2));
    e.hp -= d; e.flash = 0.1;
    if (fromX !== null && !e.T.boss) {
      const dx = e.x - fromX, dy = e.y - fromY, l = Math.hypot(dx, dy) || 1;
      e.kx = dx / l; e.ky = dy / l; e.kb = kbTime;
    }
    this.stage.text(e.x, e.y - e.T.r, d, d >= 40);
    sound.play('hit', { volume: 0.25, gap: 0.07 });
    if (e.hp <= 0) this.killEnemy(e);
  },

  dropGem(x, y, v) {
    const gems = this.run.gems;
    if (gems.length >= MAX_GEMS) { gems[Math.floor(Math.random() * gems.length)].v += v; return; }
    gems.push({ x, y, v });
  },

  killEnemy(e) {
    const r = this.run;
    r.kills++;
    this.stage.fx('pop', e.x, e.y, e.T.r * 2.6);
    if (e.T.boss) {
      sound.playBomb();
      this.stage.fx('boom', e.x, e.y, e.T.r * 5);
      if (r.boss === e) { r.boss = null; this.el.boss.classList.add('hidden'); this.bgm.setBoss(false); }
      if (e.final) { r.coins += 50; this.stage.flash(); setTimeout(() => this.run === r && this.endRun(true), 900); return; }
      r.coins += 30;
      r.chests++;
      for (let i = 0; i < 12; i++) this.dropGem(e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 80, 4);
      r.items.push({ kind: 'meat', x: e.x, y: e.y });
      this.showBanner(`${e.T.name}を たおした！ たからばこ ゲット！`);
      return;
    }
    this.dropGem(e.x, e.y, e.T.xp);
    const roll = Math.random();
    if (roll < 0.08) r.items.push({ kind: 'coin', x: e.x + 8, y: e.y });
    else if (roll < 0.095) r.items.push({ kind: 'meat', x: e.x, y: e.y });
    else if (roll < 0.1) r.items.push({ kind: 'magnet', x: e.x, y: e.y });
    else if (roll < 0.104) r.items.push({ kind: 'nuke', x: e.x, y: e.y });
  },

  updateShots(dt) {
    const r = this.run;
    for (const s of r.shots) {
      if (s.kind === 'kunai' || s.kind === 'bullet') {
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        for (const e of this.enemiesNear(s.x, s.y, s.r)) {
          if (e.hp <= 0 || (e.x - s.x) ** 2 + (e.y - s.y) ** 2 > (e.T.r + s.r) ** 2) continue;
          this.hitEnemy(e, s.dmg, s.x - s.vx, s.y - s.vy, s.kb || 0.12);
          if (s.splash) {
            const rad = s.splash * (r.stats.boom || 1);
            this.stage.fx('boom', s.x, s.y, rad * 2);
            this.areaDamage(s.x, s.y, rad, s.dmg * 0.45);
            s.splash = 0;
          }
          if (--s.pierce <= 0) { s.life = 0; break; }
        }
      } else if (s.kind === 'rocket') {
        s.arm -= dt;
        let tgt = s.target && s.target.hp > 0 ? s.target : null;
        if (!tgt) { tgt = this.nearestEnemies(1, 640)[0] || null; s.target = tgt; }
        if (tgt) {
          const want = Math.atan2(tgt.y - s.y, tgt.x - s.x);
          let diff = want - s.ang;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const step = s.turn * dt;
          s.ang += Math.max(-step, Math.min(step, diff));
        }
        s.x += Math.cos(s.ang) * s.speed * dt;
        s.y += Math.sin(s.ang) * s.speed * dt;
        s.life -= dt;
        let hit = false;
        if (s.arm <= 0) {
          for (const e of this.enemiesNear(s.x, s.y, s.r)) {
            if (e.hp > 0 && (e.x - s.x) ** 2 + (e.y - s.y) ** 2 <= (e.T.r + s.r) ** 2) { hit = true; break; }
          }
        }
        if (hit || s.life <= 0) {
          s.life = 0;
          const rad = s.radius * (r.stats.boom || 1);
          this.stage.fx('boom', s.x, s.y, rad * 2.1);
          this.areaDamage(s.x, s.y, rad, s.dmg);
          this.stage.shake(s.art === 'smissile' ? 10 : s.art === 'mega' ? 7 : 3);
          sound.playBomb();
        }
      } else if (s.kind === 'bomb') {
        s.t += dt;
        if (s.t >= s.dur) {
          s.life = 0;
          const rad = s.radius * (r.stats.boom || 1);
          this.stage.fx('boom', s.tx, s.ty, rad * 2);
          this.areaDamage(s.tx, s.ty, rad, s.dmg);
          sound.playBomb();
        }
      }
    }
    this.gridOk = false;
    compact(r.shots, s => s.life > 0);
    compact(r.enemies, e => e.hp > 0);
  },

  updateEnemies(dt) {
    const r = this.run, p = r.player, far = (Math.hypot(this.w, this.h) * 0.9) ** 2;
    // かんたんな おしあい（グリッド）
    const cell = 40, sep = this.sepGrid || (this.sepGrid = new EnemyGrid(cell)), grid = sep.map;
    sep.build(r.enemies);
    for (const e of r.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      // ズームアウトで とおくに でた てきは、ズーム1の でばしょ（battleR）まで いそいで くる（くる じかんを ズームで かえない）
      const sp = e.T.speed * (!e.T.boss && d > this.battleR ? 2.5 : 1);
      let vx = dx / d * sp, vy = dy / d * sp;
      if (e.kb > 0) { e.kb -= dt; vx = e.kx * 260; vy = e.ky * 260; }
      const cx = Math.floor(e.x / cell), cy = Math.floor(e.y / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const list = grid.get(EnemyGrid.key(gx, gy)); if (!list) continue;
        for (const o of list) {
          if (o === e) continue;
          const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), min = e.T.r + o.T.r;
          if (od > 0 && od < min) { const push = (min - od) / min * 120; vx += ox / od * push; vy += oy / od * push; }
        }
      }
      e.x += vx * dt; e.y += vy * dt;
      // ぶつかったら ダメージ
      if (d < e.T.r + 14 && p.hurt <= 0) {
        p.hp -= e.T.dmg * r.diff.enemyDmg * (r.stageDef.dmgMul || 1);
        p.hurt = 0.8;
        sound.playHurt();
        this.stage.hurt();
        if (navigator.vibrate) navigator.vibrate(30);
      }
      // とおくに いきすぎた ザコは まえに だしなおす
      if (!e.T.boss && dist2(e, p) > far) {
        const a = Math.atan2(p.my, p.mx) + (Math.random() - 0.5) * 1.6, rad = Math.hypot(this.w, this.h) / 2 + 50;
        e.x = p.x + Math.cos(a) * rad; e.y = p.y + Math.sin(a) * rad;
      }
    }
  },

  updatePickups(dt) {
    const r = this.run, p = r.player, pick2 = r.stats.pickup ** 2;
    for (const g of r.gems) {
      const d2 = dist2(g, p);
      if (g.pull || d2 < pick2) {
        g.pull = true;
        const d = Math.sqrt(d2) || 1, sp = 420;
        g.x += (p.x - g.x) / d * sp * dt; g.y += (p.y - g.y) / d * sp * dt;
        if (d < 18) { r.xp += g.v; g.got = true; sound.play('coin', { group: 'item', volume: 0.18, gap: 0.05 }); }
      }
    }
    compact(r.gems, g => !g.got);
    for (const it of r.items) {
      if (dist2(it, p) > 30 * 30) continue;
      it.got = true;
      if (it.kind === 'coin') { r.coins += 1; sound.playItem(); }
      else if (it.kind === 'meat') { p.hp = Math.min(r.stats.maxHp, p.hp + 30); sound.playHeal(); this.showBanner('もぐもぐ！ かいふく！', 1200); }
      else if (it.kind === 'magnet') { for (const g of r.gems) g.pull = true; sound.playItem(); this.showBanner('ぜんぶ あつめる！', 1200); }
      else if (it.kind === 'nuke') {
        for (const e of r.enemies) if (!e.T.boss) this.hitEnemy(e, 9999);
        r.enemies = r.enemies.filter(e => e.hp > 0);
        this.stage.flash();
        sound.playBomb(); this.showBanner('どっかーん！', 1200);
      }
    }
    compact(r.items, it => !it.got);
    const npc = r.npc;
    if (npc) {
      const d2 = dist2(npc, p);
      if (d2 < 34 * 34) {
        const id = receiveGift(r.weapons, r.stageDef);
        r.npc = null; r.researcherDone = true;
        this.stage.fx('pop', npc.x, npc.y, 90);
        sound.playHeal();
        if (id) { this.refreshSkills(); this.showBanner(`けんきゅうしゃから ${WEAPONS[id].name}を もらった！`, 3200); }
      } else if (d2 > (Math.hypot(this.w, this.h) * 0.9) ** 2) {
        r.npc = null; // とおく はなれたら、すぐ ちかくに でなおす
      }
    }
  },

  // HUD は かわった ときだけ かきかえる
  updateHud() {
    const r = this.run, c = this.hudCache;
    const set = (key, val, fn) => { if (c[key] !== val) { c[key] = val; fn(val); } };
    set('xp', Math.round(Math.min(1, r.xp / xpToNext(r.level)) * 100), v => { this.el.xpFill.style.transform = `scaleX(${v / 100})`; });
    set('lv', r.level, v => { this.el.lv.textContent = `Lv ${v}`; });
    set('time', r.finalBossDone ? -1 : Math.ceil(Math.max(0, STAGE_SECONDS - r.time)), v => { this.el.time.textContent = v < 0 ? '⚠ ボス！' : `⏱ ${fmtTime(v)}`; });
    set('kills', r.kills, v => { this.el.kills.textContent = `💀 ${v}`; });
    set('coins', r.coins, v => { this.el.coins.textContent = `🪙 ${v}`; });
    if (r.boss) set('boss', Math.round(Math.max(0, r.boss.hp / r.boss.maxHp) * 100), v => { this.el.bossFill.style.transform = `scaleX(${v / 100})`; });
  },

  draw() {
    const r = this.run;
    this.stage.draw(r, {
      auraRadius: r.weapons.aura ? weaponStat('aura', 'radius', r.weapons.aura) : 0,
      orbit: this.orbitPositions(),
    });
    this.stage.joystick(this.stick, this.rect);
  },
};

export default DadaSurvivorGame;
