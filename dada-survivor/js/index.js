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
  newQuality, adaptQuality, THROW, fireRadius, capType, gatherCount, BOTTLE, bottleOutcome,
  SQUAD, allyDamage, squadSlot, canWhistle, healAmount,
  QUEST, CAMP, underHalfW, clampUnder, hutSpot, LASER_MODES, nextLaserMode, squadRoom, beamHits, MAX_LEVEL as MAXLV,
  enemyDmgMul, startWeapons, TOWER, towerSpot, rollHeli, heliDamage, floorName,
} from './rules.js?v=205';
import { DecorField } from './decor.js?v=205';
import { EnemyGrid, nearestN } from './grid.js?v=205';
import { preloadArt, art } from './art.js?v=205';
import { Stage } from './stage.js?v=205';
import { menuMethods, iconHtml } from './menus.js?v=205';
import { PopBGM, playWhistle } from './bgm.js?v=205';

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
    return loadCss(new URL('../css/dada-survivor.css?v=205', import.meta.url).href);
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
        <button class="ds-mode hidden" aria-label="モード"><span class="ds-mode-ico"></span><b class="ds-mode-txt"></b></button>
        <button class="ds-whistle hidden" aria-label="ふえ"><span class="ds-whistle-ico"></span><b class="ds-whistle-txt">ふえ</b><i class="ds-whistle-cd"></i></button>
        <div class="ds-banner hidden"></div>
        <div class="ds-overlay hidden"></div>
      </div>`;
    const $ = s => this.container.querySelector(s);
    this.root = $('.ds-root');
    this.stage = new Stage(this.root);
    // HUD類はステージより手前に
    for (const s of ['.ds-hud', '.ds-mode', '.ds-whistle', '.ds-banner', '.ds-overlay']) this.root.appendChild($(s));
    this.hud = $('.ds-hud');
    this.overlay = $('.ds-overlay');
    this.banner = $('.ds-banner');
    this.el = {
      xpFill: $('.ds-xp-fill'), lv: $('.ds-lv'), time: $('.ds-time'), kills: $('.ds-kills'),
      coins: $('.ds-coins'), boss: $('.ds-boss'), bossName: $('.ds-boss-name'), bossFill: $('.ds-boss-fill'),
      skills: $('.ds-skills'),
      mode: $('.ds-mode'), modeIco: $('.ds-mode-ico'), modeTxt: $('.ds-mode-txt'),
      whistle: $('.ds-whistle'), whistleTxt: $('.ds-whistle-txt'), whistleCd: $('.ds-whistle-cd'),
    };
    this.el.whistle.querySelector('.ds-whistle-ico').style.backgroundImage = art('whistle');
    // ふえ：pointerdown で すぐ ふく（ステージの そとの ボタンなので ジョイスティックや ピンチには かぞえない）
    this.el.whistle.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.whistle(); });
    this.el.whistle.addEventListener('click', e => e.preventDefault());
    // レーザーじゅうの モード（タップで マシンガン → レーザー → ロケットランチャー → …）
    this.el.mode.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.switchLaser(); });
    this.el.mode.addEventListener('click', e => e.preventDefault());
    this.hudCache = {};
    $('.ds-pause').addEventListener('click', () => { sound.playTap(); this.showPause(); });
  },

  bindEvents() {
    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this.onKeyDown = e => {
      const k = e.key.toLowerCase();
      if (this.run && !this.paused && (k === '+' || k === '=' || k === '-')) { this.setZoom(this.zoom * (k === '-' ? 0.9 : 1 / 0.9)); return; }
      if (k === 'f' && !e.repeat && this.run && !this.paused) { this.whistle(); return; }
      if ((k === 'q' || k === 'e') && !e.repeat && this.run && !this.paused) { this.switchLaser(); return; }
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
    const seed = 1 + Math.floor(Math.random() * 1e6);
    // ゆかの かざり（ボトル）は ゲームがわで もつ（こわせる ので）。ステージは おなじ ものを かく
    this.decorField = st.decor ? new DecorField(seed, st.decor) : null;
    this.stage.setDecor(st.decor, this.decorField);
    this.touches.clear(); this.pinch = null;
    this.run = {
      diff: DIFFICULTIES[this.save.difficulty] || DIFFICULTIES.easy,
      char: ch, stageDef: st, chests: 0,
      time: 0, kills: 0, coins: 0, earned: 0, level: 1, xp: 0, pendingLevels: 0,
      weapons: startWeapons(ch), passives: {}, stats: null,
      player: { x: 0, y: 0, hp: 100, hurt: 0, face: 1, mx: 0, my: 1 },
      enemies: [], shots: [], gems: [], items: [],
      timers: {}, spawnClock: 0, orbitAngle: 0, auraClock: 0,
      miniBossDone: false, finalBossDone: false, boss: null, ended: false,
      npc: null, researcherDone: false,
      // けんきゅうじょ：てきの ばくだん・ゆかの ひ・ボトルの じょうたい（id → { hp, broken, orbitHit }）
      ebombs: [], fires: [], bottles: new Map(), nearBottles: [], fireSeq: 0, burnFx: 0, alienSeen: false,
      // コンテナと なかま（allies：へいたい 3 ＋ ちりょうたい。medic は その なかの ちりょうたい）
      container: null, allies: [], medic: null, whistleCd: 0, heading: Math.PI / 2,
      // さばくの クエスト：zone は surface／under。clock は ちかでも すすむ とけい（ステージの time は ちかでは とまる）
      zone: 'surface', clock: 0, props: null, quest: null, laserMode: 0,
      // こわれた まち：みかたの ヘリの えんご（おくじょうで もらう）
      heli: null,
    };
    if (st.quest) this.initQuest();
    if (st.tower) this.initTower();
    if (st.camp) this.initCamp();
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
    this.bgm.start(st.bgm);
    this.showBanner(`ステージ${st.id} ${st.name}`, 2500);
  },

  refreshStats() { this.run.stats = playerStats(this.run.passives, this.save.shop, bonusFor(this.save, this.run.char.id)); },

  endRun(clear) {
    this.stage.arrow(null);
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
    r.clock += dt;
    r.time += r.zone === 'under' ? dt * QUEST.underTime : dt; // ちかでは タイマーが ゆっくり（ボスは ちじょうに もどってから）
    if (r.campMsg > 0 && (r.campMsg -= dt) <= 0) this.showBanner('かまくらの なかまが きてくれた！ ちりょうたいは ふえで よんでね', 3800);

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
    if (r.zone === 'under') clampUnder(p, 16, this.zoneU());
    if (ml > 0.1) { p.mx = mx; p.my = my; if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1; }
    p.hurt = Math.max(0, p.hurt - dt);
    if (r.stats.regen) p.hp = Math.min(r.stats.maxHp, p.hp + r.stats.regen * dt);

    this.updateSpawns(dt);
    this.collectBottles();
    this.updateWeapons(dt);
    this.updateAllies(dt);
    this.updateHeli(dt);
    this.updateShots(dt);
    this.updateEnemies(dt);
    this.updateHazards(dt);
    this.updatePickups(dt);
    if (r.quest) this.updateQuest();

    // XP → レベルアップ
    while (r.xp >= xpToNext(r.level)) { r.xp -= xpToNext(r.level); r.level++; r.pendingLevels++; }
    this.updateHud();
    if (p.hp <= 0) { this.endRun(false); return; }
    if (r.pendingLevels > 0) this.showLevelUp();
  },

  updateSpawns(dt) {
    const r = this.run;
    const st = r.stageDef;
    if (r.zone === 'under') return; // ちかでは じかんが とまる（ボスも こない）
    if (!r.miniBossDone && r.time >= MINI_BOSS_SECONDS) {
      r.miniBossDone = true;
      const e = this.spawnEnemy(st.mini.type, 1, bossType(st.mini, r.diff, st));
      this.showBanner(`⚠ ${e.T.name}が きた！`);
    }
    if (!r.finalBossDone && r.time >= STAGE_SECONDS) {
      r.finalBossDone = true;
      const e = this.spawnEnemy(st.boss.type, 1, bossType(st.boss, r.diff, st));
      e.final = true;
      this.showBanner(`⚠ ${e.T.name}が きた！ たおせば クリア！`, 3000);
    }
    const rs = st.researcher;
    if (rs && !r.researcherDone && !r.npc && !r.container && r.time >= rs.at) {
      if (rs.container) this.spawnContainer(); else this.spawnResearcher();
    }
    if (r.finalBossDone || r.zone === 'under') return; // ボスせん・ちかでは ふつうの ザコ なし
    const plan = spawnPlan(r.time, r.diff, st);
    r.spawnClock -= dt;
    if (r.spawnClock <= 0) {
      r.spawnClock = plan.interval;
      let counts = null;
      for (let i = 0; i < plan.batch && r.enemies.length < MAX_ENEMIES; i++) {
        let type = pickWeighted(plan.weights);
        if (ENEMY_TYPES[type].cap) {
          if (!counts) { counts = {}; for (const e of r.enemies) counts[e.type] = (counts[e.type] || 0) + 1; }
          type = capType(type, counts, st);
          counts[type] = (counts[type] || 0) + 1;
        }
        this.spawnEnemy(type, plan.hpScale);
      }
    }
  },

  // コンテナ：プレイヤーから 650〜900 はなれた ところに 1つ（やじるしで おしえる）
  spawnContainer() {
    const r = this.run, p = r.player;
    const a = Math.random() * TAU, d = SQUAD.dist0 + Math.random() * (SQUAD.dist1 - SQUAD.dist0);
    r.container = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, open: false };
    sound.playItem();
    this.showBanner('コンテナが みつかった！ やじるしの ほうへ いこう！', 3200);
  },

  // コンテナに さわると ひらく：けんきゅうしゃ（スーパーミサイル）・ちりょうたい・なかま 3にん
  openContainer() {
    const r = this.run, box = r.container;
    box.open = true; r.researcherDone = true;
    const id = receiveGift(r.weapons, r.stageDef);
    for (let i = 0; i <= SQUAD.soldiers; i++) this.addAlly(i === SQUAD.soldiers, box.x + (i - 1.5) * 22, box.y + 18);
    this.stage.fx('pop', box.x, box.y, 120);
    sound.playHeal();
    if (id) this.refreshSkills();
    this.showBanner(id ? `なかまが でてきた！ ${WEAPONS[id].name}も もらった！` : 'なかまが でてきた！', 3400);
  },

  /** なかまを 1にん ふやす（へいたいは 3にん・ちりょうたいは 1にん まで）。ふえたら true */
  addAlly(medic, x, y) {
    const r = this.run;
    if (!squadRoom(r.allies, medic)) return false;
    const slot = medic ? SQUAD.soldiers : r.allies.filter(a => !a.medic).length;
    const a = { x, y, slot, medic, face: 1, cd: 0.4 + r.allies.length * 0.3, mode: 'follow', heal: 0, healFx: 0 };
    r.allies.push(a);
    if (medic) r.medic = a;
    return true;
  },

  /* ---------- ゆきやまの スタートキャンプ（ステージ3） ---------- */
  initCamp() {
    const r = this.run, C = CAMP, hut = (at, mark) => ({ kind: 'kamakura', x: at.x, y: at.y, w: C.w, h: C.h, mark });
    r.props = [hut(C.squadHut), hut(C.medicHut), hut(C.sciHut)];
    // けんきゅうしゃは かまくらの まえに のこる（かざり。たたかわない）
    for (let i = 0; i < C.researchers; i++) r.props.push({ kind: 'researcher', x: C.sciHut.x + (i - 0.5) * 40, y: C.sciHut.y + C.h / 2 + 14, w: 46, h: 46 });
    for (let i = 0; i < SQUAD.soldiers; i++) this.addAlly(false, C.squadHut.x + (i - 1) * 22, C.squadHut.y + C.h / 2 + 10);
    this.addAlly(true, C.medic.x, C.medic.y);
    r.campMsg = 2.6; // 「ステージ3 ゆきやま」の あとに だす
  },

  /* ---------- こわれた まちの たかい ビル（ステージ7） ---------- */
  /** いま いる ばしょの かべの かたち（さばくの ちか／ビルの なか） */
  zoneU() { return this.run.quest?.U || QUEST.under; },

  initTower() {
    const r = this.run, T = TOWER, at = towerSpot();
    const door = { kind: 'towerDoor', x: at.x, y: at.y + 112, w: 80, h: 80 };
    r.props = [{ kind: 'tower', x: at.x, y: at.y, w: 240, h: 304 }, door];
    r.quest = { tower: true, U: T.room, stage: 'wait', door, building: at, floor: 0, left: 0, stairs: null, cells: [],
      heli: rollHeli(), heliTaken: false, heliProp: null, exit: null, surface: null };
  },

  updateTower() {
    const r = this.run, q = r.quest, p = r.player, T = TOWER;
    if (r.zone === 'surface') {
      if (q.stage === 'wait' && r.time >= T.at) {
        q.stage = 'door'; q.door.kind = 'towerDoorOpen'; q.door.mark = true;
        sound.playItem();
        this.showBanner('たかい ビルの いりぐちが ひらいた！ やじるしの ほうへ いこう！', 3200);
      }
      if (q.stage === 'door' && dist2(p, q.door) < T.doorR ** 2) this.enterTower();
      return;
    }
    // ビルの なか
    if (q.stairs && q.stairs.hidden && q.left <= 0 && q.floor <= T.floors) {
      q.stairs.hidden = false; q.stairs.mark = true;
      sound.playHeal();
      this.showBanner(q.floor === T.floors && q.cells.some(c => !c.open) ? 'かいだんが でた！ でも さきに ろうやの なかまを たすけよう！' : 'かいだんが でた！ うえへ いこう！', 2600);
    }
    if (q.stairs && !q.stairs.hidden && dist2(p, q.stairs) < T.stairsR ** 2) { this.goFloor(q.floor + 1); return; }
    for (const c of q.cells) {
      if (c.open || dist2(p, c) > T.cellR ** 2) continue;
      c.open = true; c.kind = 'cellOpen'; c.mark = false;
      let sci = 0;
      for (const who of c.cell.who) {
        if (who === 'researcher') { sci++; r.props.push({ kind: 'researcher', x: c.x - c.cell.side * 80, y: c.y + 20 + sci * 6, w: 46, h: 46 }); continue; }
        this.addAlly(who === 'medic', c.x, c.y + 50);
      }
      this.stage.fx('pop', c.x, c.y, 110);
      sound.playHeal();
      this.showBanner(c.cell.who.includes('medic') ? 'ちりょうたいを たすけた！ ふえで よべるよ！'
        : sci ? 'けんきゅうしゃ「おくじょうに みかたの ヘリが いるかも！」' : 'なかまを たすけた！ いっしょに たたかうよ！', 3000);
    }
    if (q.heliProp && !q.heliTaken && dist2(p, q.heliProp) < T.heliR ** 2) this.takeHeli();
    if (q.exit && dist2(p, q.exit) < T.doorR ** 2) this.exitTower();
  },

  enterTower() {
    const r = this.run, q = r.quest, p = r.player;
    q.stage = 'inside';
    q.surface = { enemies: r.enemies, gems: r.gems, items: r.items, props: r.props, boss: r.boss };
    r.enemies = []; r.gems = []; r.items = [];
    if (r.boss) { r.boss = null; this.el.boss.classList.add('hidden'); this.bgm.setBoss(false); }
    r.zone = 'under';
    p.hurt = 1;
    this.goFloor(1);
  },

  /** f かいへ（1〜4 は へや、floors+1 は おくじょう）。のこった ほうせきは もって いく */
  goFloor(f) {
    const r = this.run, q = r.quest, p = r.player, T = TOWER, U = T.room;
    for (const g of r.gems) r.xp += g.v;
    for (const it of r.items) if (it.kind === 'coin') r.coins++;
    r.enemies.length = 0; r.gems.length = 0; r.items.length = 0;
    r.shots.length = 0; r.ebombs.length = 0; r.fires.length = 0;
    q.floor = f; q.left = 0; q.stairs = null; q.cells = []; q.heliProp = null; q.exit = null;
    const roof = f > T.floors, hw = U.halfW, h = U.bottom - U.top, cy = (U.top + U.bottom) / 2;
    const w = roof ? ['wallL', 'wallR', 'wallT', 'wallB'] : ['bwallL', 'bwallR', 'bwallT', 'bwallB'];
    const props = [
      { kind: w[0], x: -hw - 450, y: cy, w: 900, h }, { kind: w[1], x: hw + 450, y: cy, w: 900, h },
      { kind: w[2], x: 0, y: U.top - 200, w: 2400, h: 400 }, { kind: w[3], x: 0, y: U.bottom + 200, w: 2400, h: 400 },
    ];
    if (!roof) {
      q.stairs = { kind: 'stairsUp', ...T.stairs, w: 100, h: 80, hidden: true };
      props.push(q.stairs);
    }
    if (f === T.floors) for (const c of T.cells) { const pr = { kind: c.art, x: c.x, y: c.y, w: 120, h: 100, mark: true, cell: c, open: false }; props.push(pr); q.cells.push(pr); }
    if (roof) {
      props.push({ kind: 'helipad', ...T.pad, w: 220, h: 220 });
      if (q.heli && !q.heliTaken) { q.heliProp = { kind: 'heliFriend', x: T.pad.x, y: T.pad.y - 10, w: 168, h: 120, mark: true }; props.push(q.heliProp); }
      q.exit = { kind: 'roofExit', ...T.roofExit, w: 80, h: 80, mark: true };
      props.push(q.exit);
    }
    r.props = props;
    p.x = 0; p.y = U.bottom - 70; p.hurt = Math.max(p.hurt, 0.8);
    r.allies.forEach((a, i) => { a.x = (i - 1.5) * 26; a.y = p.y + 30; if (a.mode !== 'heal') a.mode = 'follow'; });
    this.stage.setGround(roof ? 'roof' : 'office');
    this.stage.fx('pop', p.x, p.y, 100);
    sound.playItem();
    if (!roof) {
      const n = T.foes[f - 1], hp = spawnPlan(r.time, r.diff, r.stageDef).hpScale * T.foeHp, types = r.stageDef.enemies.slice(0, 4).map(e => e[0]);
      for (let i = 0; i < n; i++) {
        const e = this.spawnEnemy(types[i % types.length], hp, undefined, { x: (i / Math.max(1, n - 1) - 0.5) * 2 * (hw - 60), y: U.top + 120 + (i % 2) * 70 });
        e.guard = true;
      }
      q.left = n;
      this.showBanner(f === 1 ? 'ビルに はいった！ わるものを たおすと かいだんが でるよ（なかでは じかんが ゆっくり）'
        : f === T.floors ? `${floorName(f)}：つかまった なかまが いる！ たすけよう！` : `${floorName(f)}：わるものを たおして うえへ！`, 3200);
      return;
    }
    if (q.heli && !q.heliTaken) { this.showBanner('おくじょう！ みかたの ヘリが いる！ さわって みよう！', 3200); return; }
    // ヘリが いない とき（はんぶんの かくりつ）：きゅうきゅうばこ（にく 2こ と コイン）
    if (!q.heli) {
      for (let i = 0; i < 2; i++) r.items.push({ kind: 'meat', x: T.pad.x + (i - 0.5) * 50, y: T.pad.y });
      for (let i = 0; i < 6; i++) r.items.push({ kind: 'coin', x: T.pad.x + (i - 2.5) * 22, y: T.pad.y + 50 });
      this.showBanner('おくじょう… きょうは ヘリが いなかった。きゅうきゅうばこと コインを みつけた！', 3400);
    }
  },

  takeHeli() {
    const r = this.run, q = r.quest, H = TOWER.heli, pr = q.heliProp;
    q.heliTaken = true; pr.hidden = true; pr.mark = false;
    r.heli = { t: H.time, x: pr.x, y: pr.y, cd: 0.6, rcd: 1.5, face: 1 };
    this.stage.flash();
    sound.playHeal();
    this.showBanner(`ヘリが なかまに なった！ そとに でたら ${H.time}びょう うえから うって くれるよ！ はしごで おりよう`, 3800);
  },

  exitTower() {
    const r = this.run, q = r.quest, s = q.surface, p = r.player;
    for (const g of r.gems) r.xp += g.v;
    for (const it of r.items) if (it.kind === 'coin') r.coins++;
    r.enemies = s.enemies; r.gems = s.gems; r.items = s.items; r.props = s.props;
    r.shots.length = 0;
    r.zone = 'surface'; q.stage = 'done'; q.surface = null; q.stairs = null; q.cells = []; q.exit = null; q.heliProp = null;
    q.door.kind = 'towerDoor'; q.door.mark = false;
    p.x = q.door.x; p.y = q.door.y + 80; p.hurt = 1;
    r.allies.forEach((a, i) => { a.x = p.x + (i - 1.5) * 26; a.y = p.y + 40; });
    if (r.heli) { r.heli.x = p.x; r.heli.y = p.y - 200; }
    if (s.boss && s.boss.hp > 0) { r.boss = s.boss; this.el.bossName.textContent = s.boss.T.name; this.el.boss.classList.remove('hidden'); this.bgm.setBoss(true); }
    this.stage.setGround(r.stageDef.ground);
    sound.playItem();
    this.showBanner(r.heli ? 'ちじょうに もどった！ ヘリの えんごが はじまるよ！' : 'ちじょうに もどった！ じかんが また うごくよ！', 3000);
  },

  /** みかたの ヘリ：そとに いる あいだ、プレイヤーの うえを とんで うつ（time びょうで かえる） */
  updateHeli(dt) {
    const r = this.run, h = r.heli, p = r.player, H = TOWER.heli;
    if (!h || r.zone !== 'surface') return;
    h.t -= dt;
    if (h.t <= 0) { r.heli = null; this.showBanner('ヘリが かえって いった！ ありがとう！', 2200); return; }
    const tx = p.x + Math.cos(r.clock * 0.7) * 80, ty = p.y - 120 + Math.sin(r.clock * 1.3) * 16;
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
    if (d > 1) { const v = Math.min(d * 3, 320 + (d > 300 ? d : 0)); h.x += dx / d * v * dt; h.y += dy / d * v * dt; if (Math.abs(dx) > 6) h.face = dx > 0 ? 1 : -1; }
    h.cd -= dt; h.rcd -= dt;
    if (h.cd > 0 && h.rcd > 0) return;
    const t = nearestN(r.enemies, p, 1, H.range ** 2)[0];
    if (!t || r.shots.length > 100) return;
    const sx = h.x, sy = h.y + 24, ang = Math.atan2(t.y - sy, t.x - sx), dmg = heliDamage(r.time, r.stats.damage);
    h.face = Math.cos(ang) >= 0 ? 1 : -1;
    if (h.cd <= 0) {
      h.cd = H.cd;
      r.shots.push({ kind: 'bullet', art: WEAPONS.gun.shot, size: WEAPONS.gun.size, ally: true, x: sx, y: sy,
        vx: Math.cos(ang) * 600, vy: Math.sin(ang) * 600, ang, dmg, life: 0.9, r: 8, pierce: 1, splash: 0, kb: 0.06 });
    }
    if (h.rcd <= 0) {
      h.rcd = H.rocketCd;
      r.shots.push({ kind: 'bullet', art: 'lrocket', size: 30, ally: true, x: sx, y: sy,
        vx: Math.cos(ang) * 460, vy: Math.sin(ang) * 460, ang, dmg: dmg * H.rocketMul, life: 1.1, r: 12, pierce: 1, splash: H.splash, fx: 'bboom', kb: 0.15 });
    }
  },

  /* ---------- さばくの クエスト（ステージ2） ---------- */
  initQuest() {
    const r = this.run, Q = QUEST, U = Q.under, hut = hutSpot();
    const door = { kind: 'hatch', x: hut.x, y: hut.y + 100, w: 80, h: 78 };
    r.props = [
      { kind: 'outpost', x: Q.lab.x, y: Q.lab.y, w: 240, h: 190 },
      { kind: 'hut', x: hut.x, y: hut.y, w: 160, h: 136 },
      door,
    ];
    // ちか（いちど つくって とっておく）
    const props = [], step = 160;
    for (let y = U.bottom + 160; y > U.top; y -= step) {
      const y0 = Math.max(U.top, y - step), cy = (y + y0) / 2, h = y - y0;
      const hw = underHalfW(cy - 1);
      // ろうかと へやの さかいめで かべを わける
      if (y > U.roomY && y0 < U.roomY) {
        for (const [a, b] of [[y, U.roomY], [U.roomY, y0]]) {
          const w = underHalfW((a + b) / 2);
          props.push({ kind: 'wallL', x: -w - 450, y: (a + b) / 2, w: 900, h: a - b }, { kind: 'wallR', x: w + 450, y: (a + b) / 2, w: 900, h: a - b });
        }
        continue;
      }
      props.push({ kind: 'wallL', x: -hw - 450, y: cy, w: 900, h }, { kind: 'wallR', x: hw + 450, y: cy, w: 900, h });
    }
    props.push({ kind: 'wallT', x: 0, y: U.top - 200, w: 2400, h: 400 }, { kind: 'wallB', x: 0, y: U.bottom + 200, w: 2400, h: 400 });
    const cells = U.cells.map(c => {
      const pr = { kind: c.art, x: c.side * (U.halfW - 62), y: c.y, w: 120, h: 100, mark: true, cell: c, open: false };
      props.push(pr);
      return pr;
    });
    const exit = { kind: 'exitStairs', x: U.exit.x, y: U.exit.y, w: 80, h: 80, hidden: true };
    props.push(exit);
    r.quest = { U, stage: 'wait', hut, door, left: 0, under: props, cells, exit, groups: U.groups.map(g => ({ ...g, done: false })), bossOut: false, bossDead: false, surface: null };
  },

  updateQuest() {
    if (this.run.quest.tower) { this.updateTower(); return; }
    const r = this.run, q = r.quest, p = r.player, Q = QUEST, U = Q.under;
    if (r.zone === 'surface') {
      if (q.stage === 'wait' && r.time >= Q.at) {
        q.stage = 'hut';
        this.showBanner('こやに わるものぐんだんが いるみたい… やじるしの ほうへ いこう！', 3200);
      }
      if (q.stage === 'hut' && dist2(p, q.hut) < Q.triggerR ** 2) {
        q.stage = 'fight';
        const hp = spawnPlan(r.time, r.diff, r.stageDef).hpScale * Q.guardHp;
        Q.guards.forEach((type, i) => {
          const a = i / Q.guards.length * TAU;
          const e = this.spawnEnemy(type, hp, undefined, { x: q.hut.x + Math.cos(a) * 70, y: q.hut.y + 30 + Math.sin(a) * 50 });
          e.guard = true;
        });
        q.left = Q.guards.length;
        sound.playItem();
        this.showBanner('こやから わるものへいたいが でてきた！ ぜんぶ たおそう！', 3000);
      }
      if (q.stage === 'fight' && q.left <= 0) {
        q.stage = 'door'; q.door.kind = 'hatchOpen'; q.door.mark = true;
        sound.playHeal();
        this.showBanner('ちか への とびらが ひらいた！ さわって はいろう！', 3000);
      }
      if (q.stage === 'door' && dist2(p, q.door) < Q.doorR ** 2) this.enterUnder();
      return;
    }
    // ちか
    for (const g of q.groups) {
      if (g.done || p.y > g.y + 360) continue;
      g.done = true;
      const hp = spawnPlan(r.time, r.diff, r.stageDef).hpScale * 1.2, types = r.stageDef.enemies.map(e => e[0]);
      for (let i = 0; i < g.n; i++) {
        const e = this.spawnEnemy(types[i % types.length], hp, undefined, { x: (i / Math.max(1, g.n - 1) - 0.5) * 2 * (U.halfW - 40), y: g.y - 140 - (i % 2) * 40 });
        e.underling = true;
      }
    }
    for (const c of q.cells) {
      if (c.open || dist2(p, c) > Q.cellR ** 2) continue;
      c.open = true; c.kind = 'cellOpen'; c.mark = false;
      let joined = 0, sci = 0;
      for (const who of c.cell.who) {
        if (who === 'researcher') { sci++; r.props.push({ kind: 'researcher', x: c.x - c.cell.side * 70, y: c.y + 10 + sci * 6, w: 46, h: 46 }); continue; }
        if (this.addAlly(who === 'medic', c.x, c.y + 50)) joined++;
      }
      this.stage.fx('pop', c.x, c.y, 110);
      sound.playHeal();
      const who = c.cell.who.includes('medic') ? 'ちりょうたい' : 'なかま';
      this.showBanner(sci && c.cell.who.includes('medic') ? 'けんきゅうしゃと ちりょうたいを たすけた！ ふえで よべるよ！'
        : sci ? 'けんきゅうしゃ「おくの ボスを たおすと レーザーじゅうが てに はいるよ！」'
        : joined ? `${who}を たすけた！ いっしょに たたかうよ！` : 'なかまを たすけた！', 3200);
    }
    if (!q.bossOut && p.y < U.bossTrigger) {
      q.bossOut = true;
      const e = this.spawnEnemy(U.boss.type, 1, bossType(U.boss, r.diff, r.stageDef), { ...U.bossAt });
      e.under = true;
      this.showBanner(`⚠ ${e.T.name}が きた！ たおすと レーザーじゅう！`, 3000);
    }
    if (q.bossDead && dist2(p, q.exit) < Q.doorR ** 2) this.exitUnder();
  },

  enterUnder() {
    const r = this.run, q = r.quest, p = r.player;
    q.stage = 'under';
    q.surface = { enemies: r.enemies, gems: r.gems, items: r.items, props: r.props, boss: r.boss, x: p.x, y: p.y };
    r.enemies = []; r.gems = []; r.items = []; r.shots.length = 0; r.ebombs.length = 0; r.fires.length = 0;
    if (r.boss) { r.boss = null; this.el.boss.classList.add('hidden'); this.bgm.setBoss(false); }
    r.props = q.under;
    r.zone = 'under';
    p.x = 0; p.y = 0; p.hurt = 1;
    r.allies.forEach((a, i) => { a.x = (i - 1.5) * 26; a.y = 50; if (a.mode !== 'heal') a.mode = 'follow'; });
    this.stage.setGround('bunker');
    this.stage.fx('pop', 0, 0, 120);
    sound.playItem();
    this.showBanner('ちかに はいった！ つかまった なかまを たすけよう！（ちかでは じかんが とまるよ）', 3600);
  },

  exitUnder() {
    const r = this.run, q = r.quest, s = q.surface, p = r.player;
    // ちかに のこった ほうせきは もって かえる
    for (const g of r.gems) r.xp += g.v;
    for (const it of r.items) if (it.kind === 'coin') r.coins++;
    r.enemies = s.enemies; r.gems = s.gems; r.items = s.items; r.props = s.props;
    r.shots.length = 0;
    r.zone = 'surface'; q.stage = 'done'; q.surface = null;
    q.door.kind = 'hatch'; q.door.mark = false;
    p.x = q.door.x; p.y = q.door.y + 70; p.hurt = 1;
    r.allies.forEach((a, i) => { a.x = p.x + (i - 1.5) * 26; a.y = p.y + 40; });
    if (s.boss && s.boss.hp > 0) { r.boss = s.boss; this.el.bossName.textContent = s.boss.T.name; this.el.boss.classList.remove('hidden'); this.bgm.setBoss(true); }
    this.stage.setGround(r.stageDef.ground);
    sound.playItem();
    this.showBanner('ちじょうに もどった！ じかんが また うごくよ！', 3000);
  },

  /** ちかの ボスを たおした：レーザーじゅうと でぐち */
  underBossDown() {
    const r = this.run, q = r.quest, id = r.stageDef.quest.gift;
    q.bossDead = true; q.exit.hidden = false; q.exit.mark = true;
    const had = r.weapons[id] || 0;
    r.weapons[id] = MAXLV;
    if (!had) r.laserMode = 0;
    this.refreshSkills();
    this.stage.flash();
    // もう もって いる（ソルジャー）ときは さいだいレベルに パワーアップ。もう さいだいなら ごほうびに コイン
    if (had >= MAXLV) { r.coins += 30; this.showBanner(`${WEAPONS[id].name}は もう さいだい！ ごほうびに コイン 30まい！ でぐちから ちじょうへ`, 4200); }
    else if (had) this.showBanner(`${WEAPONS[id].name}が さいだいレベルに パワーアップ！ でぐちから ちじょうへ`, 4200);
    else this.showBanner(`${WEAPONS[id].name}を てに いれた！ あおい ボタンで モードを かえられるよ！ でぐちから ちじょうへ`, 4200);
  },

  /** レーザーじゅうの モードを かえる */
  switchLaser() {
    const r = this.run;
    if (!r || !r.weapons.laser) return false;
    r.laserMode = nextLaserMode(r.laserMode);
    r.timers.laser = Math.min(r.timers.laser ?? 0, 0.15);
    sound.playTap?.();
    this.showBanner(`レーザーじゅう：${WEAPONS[LASER_MODES[r.laserMode]].name}`, 1100);
    return true;
  },

  /** レーザー（ビーム）：まっすぐ とおくまで つらぬく。あたった てきは あおい ばくはつ */
  fireBeam(id, lv, dmg) {
    const r = this.run, p = r.player, w = WEAPONS[id];
    const t = this.nearestEnemies(1, w.len)[0];
    const ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : this.aimAngle();
    const sx = p.x + Math.cos(ang) * 20, sy = p.y + Math.sin(ang) * 20;
    r.shots.push({ kind: 'beam', x: sx, y: sy, ang, len: w.len, w: w.width, life: 0.18, max: 0.18 });
    const splash = weaponStat(id, 'splash', lv) * (r.stats.boom || 1);
    let booms = 0;
    const hit = this.beamBuf || (this.beamBuf = []); hit.length = 0;
    for (const e of r.enemies) if (e.hp > 0 && beamHits(sx, sy, ang, w.len, w.width, e)) hit.push(e);
    for (const e of hit) {
      if (e.hp <= 0) continue;
      this.hitEnemy(e, dmg, sx, sy, 0.08);
      if (booms < 4) { booms++; this.stage.fx('bboom', e.x, e.y, splash * 2); this.areaDamage(e.x, e.y, splash, dmg * 0.3, false); }
    }
    const face = Math.cos(ang);
    if (Math.abs(face) > 0.15) p.face = face > 0 ? 1 : -1;
    sound.playLaser();
  },

  /** ふえ：ちりょうたいが はしって きて かいふく */
  whistle() {
    const r = this.run;
    if (!r || !canWhistle(r.medic, r.whistleCd)) return false;
    r.whistleCd = SQUAD.whistleCd;
    r.medic.mode = 'run';
    if (!playWhistle(sound)) sound.playTap?.();
    this.showBanner('ピーッ！ ちりょうたい、きて！', 1400);
    return true;
  },

  updateAllies(dt) {
    const r = this.run, p = r.player, S = SQUAD;
    if (r.whistleCd > 0) r.whistleCd = Math.max(0, r.whistleCd - dt);
    if (!r.allies.length) return;
    if (p.mx || p.my) r.heading = Math.atan2(p.my, p.mx);
    const gun = WEAPONS.gun, lim2 = Math.min(S.range, this.battleR || S.range) ** 2;
    for (const a of r.allies) {
      let tx, ty, sp = S.speed;
      if (a.medic && a.mode !== 'follow') {
        // はしって きて、となりで かいふく
        tx = p.x - 22 * (p.face || 1); ty = p.y + 6; sp = S.medicRun;
        const close = (a.x - tx) ** 2 + (a.y - ty) ** 2 < 30 * 30;
        if (a.mode === 'run' && close) { a.mode = 'heal'; a.heal = S.healTime; a.healFx = 0; sound.playHeal(); }
        if (a.mode === 'heal') {
          const step = Math.min(dt, a.heal);
          p.hp = Math.min(r.stats.maxHp, p.hp + healAmount(r.stats.maxHp, step));
          a.heal -= dt; a.healFx -= dt;
          if (a.healFx <= 0) { a.healFx = 0.4; this.stage.fx('heal', p.x + (Math.random() - 0.5) * 30, p.y - 20, 30); }
          if (a.heal <= 0) a.mode = 'follow';
        }
      } else {
        const o = squadSlot(a.slot, r.heading);
        tx = p.x + o.x; ty = p.y + o.y;
      }
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      if (d > 1) {
        const v = Math.min(d * 6, sp + (d > 260 ? d : 0)); // はなれすぎたら いそいで おいつく
        a.x += dx / d * v * dt; a.y += dy / d * v * dt;
        if (Math.abs(dx) > 4) a.face = dx > 0 ? 1 : -1;
      }
      if (r.zone === 'under') clampUnder(a, 14, this.zoneU());
      if (a.medic) continue;
      a.cd -= dt;
      if (a.cd > 0) continue;
      a.cd = S.cd;
      const t = nearestN(r.enemies, a, 1, lim2)[0];
      if (!t || r.shots.length > 90) continue;
      const ang = Math.atan2(t.y - a.y, t.x - a.x);
      a.face = Math.cos(ang) >= 0 ? 1 : -1;
      r.shots.push({
        kind: 'bullet', art: gun.shot, size: gun.size, ally: true,
        x: a.x + Math.cos(ang) * 16, y: a.y + Math.sin(ang) * 16,
        vx: Math.cos(ang) * S.bulletSpeed, vy: Math.sin(ang) * S.bulletSpeed,
        ang, dmg: allyDamage(r.time, r.stats.damage), life: S.life, r: 8, pierce: 1, splash: 0, kb: 0.08,
      });
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

  spawnEnemy(type, hpScale, T = ENEMY_TYPES[type], at = null) {
    const r = this.run, p = r.player;
    const hp = T.boss ? T.hp : T.hp * hpScale;
    let x, y;
    if (at) { x = at.x; y = at.y; } else {
      const a = Math.random() * TAU, rad = Math.hypot(this.w, this.h) / 2 + 50;
      x = p.x + Math.cos(a) * rad; y = p.y + Math.sin(a) * rad;
    }
    const e = { type, T, x, y, hp, maxHp: hp, flash: 0, orbitHit: -1, kb: 0, kx: 0, ky: 0 };
    if (T.ranged) e.cd = THROW.firstCd + Math.random();
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
    // ちかくに てきが いない ときだけ、こわせる ボトルを ねらう（てきが いれば てき が さき）
    const b = this.nearestBottle(BOTTLE.aimRange);
    if (b) return Math.atan2(b.y + BOTTLE.cy - p.y, b.x - p.x);
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
        ang, dmg, life, r: 8, pierce, splash, kb: w.kb || 0.1, fx: w.boomFx,
      });
    }
    const face = Math.cos(base);
    if (Math.abs(face) > 0.15) p.face = face > 0 ? 1 : -1;
    if (w.fire === 'spread') sound.play('cannon', { volume: 0.4, gap: 0.16 });
    else sound.play('crossbow', { volume: id === 'gatling' || w.quiet ? 0.2 : 0.34, gap: id === 'gatling' || w.quiet ? 0.09 : 0.07 });
    if (id !== 'gatling' && !w.quiet) this.stage.fx('pop', p.x + Math.cos(base) * 24, p.y + Math.sin(base) * 24, w.fire === 'spread' ? 46 : 30);
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
        dmg, radius, life: 1.8, arm: 0.1, r: 12, fx: w.boomFx,
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
      if (w.fire === 'laser') {
        // モードの ぶきは レーザーじゅうの レベルで うつ（ソルジャーは Lv1 から そだてる）
        const mid = LASER_MODES[r.laserMode] || LASER_MODES[0], mw = WEAPONS[mid], md = weaponStat(mid, 'damage', lv) * st.damage;
        if (!ready(id, weaponStat(mid, 'cooldown', lv))) continue;
        if (mw.fire === 'beam') this.fireBeam(mid, lv, md);
        else if (mw.fire === 'rocket') this.fireRockets(mid, lv, md);
        else this.fireBullets(mid, lv, md);
        continue;
      }
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
          if (r.clock - e.orbitHit < 0.45) continue;
          e.orbitHit = r.clock;
          this.hitEnemy(e, dmg, o.x, o.y);
        }
        for (const b of r.nearBottles) {
          const s = this.bottleState(b);
          if (s.broken || r.clock - s.orbitHit < BOTTLE.orbitGap || !this.touchesBottle(b, o.x, o.y, 14)) continue;
          s.orbitHit = r.clock;
          this.hitBottle(b);
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
    // ばくはつ・バリアは ボトルも われる（いっかいで 1かい ぶん）
    const nb = this.run.nearBottles;
    for (let i = 0; i < nb.length; i++) if (this.touchesBottle(nb[i], x, y, radius)) this.hitBottle(nb[i]);
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
    if (e.guard && r.quest) r.quest.left--;
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
      if (e.under) { this.underBossDown(); return; }
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
            this.stage.fx(s.fx || 'boom', s.x, s.y, rad * 2);
            this.areaDamage(s.x, s.y, rad, s.dmg * 0.45);
            s.splash = 0;
          }
          if (--s.pierce <= 0) { s.life = 0; break; }
        }
        // とおりみちの ボトルにも あたる（たまは そこで へる）
        if (s.life > 0) for (const b of r.nearBottles) {
          if (this.bottleState(b).broken || !this.touchesBottle(b, s.x, s.y, s.r)) continue;
          this.hitBottle(b);
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
          if (!hit) for (const b of r.nearBottles) if (!this.bottleState(b).broken && this.touchesBottle(b, s.x, s.y, s.r)) { hit = true; break; }
        }
        if (hit || s.life <= 0) {
          s.life = 0;
          const rad = s.radius * (r.stats.boom || 1);
          this.stage.fx(s.fx || 'boom', s.x, s.y, rad * 2.1);
          this.areaDamage(s.x, s.y, rad, s.dmg);
          this.stage.shake(s.art === 'smissile' ? 10 : s.art === 'mega' ? 7 : 3);
          sound.playBomb();
        }
      } else if (s.kind === 'beam') {
        s.life -= dt;
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
      // ばくだんなげへい：keep の きょりで とまって、すこし さがる。じかんが きたら なげる
      if (e.T.ranged) {
        if (d < THROW.keep) { const back = d < THROW.keep - 50 ? -0.5 : 0; vx = dx / d * sp * back; vy = dy / d * sp * back; }
        e.cd -= dt;
        if (e.cd <= 0 && d < THROW.range) { e.cd = THROW.cd; this.throwBomb(e); }
      }
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
        p.hp -= e.T.dmg * enemyDmgMul(r.time, r.diff, r.stageDef);
        p.hurt = 0.8;
        sound.playHurt();
        this.stage.hurt();
        if (navigator.vibrate) navigator.vibrate(30);
      }
      // とおくに いきすぎた ザコは まえに だしなおす
      if (r.zone === 'under') { clampUnder(e, Math.min(e.T.r, 40), this.zoneU()); continue; }
      if (!e.T.boss && dist2(e, p) > far) {
        const a = Math.atan2(p.my, p.mx) + (Math.random() - 0.5) * 1.6, rad = Math.hypot(this.w, this.h) / 2 + 50;
        e.x = p.x + Math.cos(a) * rad; e.y = p.y + Math.sin(a) * rad;
      }
    }
  },

  /* ---------- けんきゅうじょ：てきの ばくだん と ゆかの ひ ---------- */
  throwBomb(e) {
    const r = this.run, p = r.player;
    if (r.ebombs.length >= THROW.maxBombs) return;
    const a = Math.random() * TAU, off = Math.random() * 24;
    const tx = p.x + Math.cos(a) * off, ty = p.y + Math.sin(a) * off;
    r.ebombs.push({ sx: e.x, sy: e.y - 16, tx, ty, x: tx, y: ty, t: 0, dur: THROW.flight });
    sound.play('bow', { volume: 0.28, gap: 0.2 });
  },

  updateHazards(dt) {
    const r = this.run, p = r.player, mul = enemyDmgMul(r.time, r.diff, r.stageDef);
    if (!r.ebombs.length && !r.fires.length) return;
    for (const b of r.ebombs) {
      b.t += dt;
      if (b.t < b.dur) continue;
      b.done = true;
      this.stage.fx('boom', b.tx, b.ty, THROW.blast * 2.2);
      sound.play('cannon', { volume: 0.32, gap: 0.12 });
      if (dist2(b, p) < (THROW.blast + 10) ** 2 && p.hurt <= 0) {
        p.hp -= THROW.dmg * mul; p.hurt = 0.8;
        sound.playHurt(); this.stage.hurt();
        if (navigator.vibrate) navigator.vibrate(30);
      }
      this.addFire(b.tx, b.ty);
    }
    compact(r.ebombs, b => !b.done);
    let burning = false;
    for (const f of r.fires) {
      f.age += dt;
      const rad = fireRadius(f.age);
      if (rad > 0 && dist2(f, p) < (rad - 4) ** 2) burning = true;
    }
    compact(r.fires, f => f.age < THROW.fireLife);
    // ひの なか：まいびょう すこしずつ へる（むてきじかん なし。でれば とまる）
    if (burning) {
      p.hp -= THROW.fireDps * mul * dt;
      r.burnFx -= dt;
      if (r.burnFx <= 0) { r.burnFx = 0.6; this.stage.hurt(); sound.play('fire', { volume: 0.2, gap: 0.5 }); }
    }
  },

  addFire(x, y) {
    const r = this.run;
    if (r.fires.length >= THROW.maxFires) r.fires.shift();
    const f = { x, y, age: 0, id: ++r.fireSeq };
    r.fires.push(f);
    if (r.finalBossDone || r.enemies.length >= MAX_ENEMIES - 3) return;
    // ひが ひろがった ところに ばくはへいが あつまる（プレイヤーと はんたいがわ）
    let alive = 0;
    for (const e of r.enemies) if (e.gather) alive++;
    const n = gatherCount(alive);
    if (!n) return;
    const p = r.player, base = Math.atan2(y - p.y, x - p.x), hpScale = spawnPlan(r.time, r.diff, r.stageDef).hpScale;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.7, d = 70 + Math.random() * 30;
      const e = this.spawnEnemy(THROW.gatherType, hpScale, undefined, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
      e.gather = true;
    }
  },

  /* ---------- けんきゅうじょ：こわせる ボトル ---------- */
  // ちかくの まだ われて いない ボトル（まいフレーム。がめんの そとがわ すこし まで）
  collectBottles() {
    const r = this.run, out = r.nearBottles;
    out.length = 0;
    if (!this.decorField || !r.stageDef.bottles) return;
    const p = r.player, W = this.w / 2 + 80, H = this.h / 2 + 120;
    for (const d of this.decorField.visible(p.x - W, p.y - H, p.x + W, p.y + H)) {
      if (!bottleOutcome(d.kind) || this.bottleState(d).broken) continue;
      out.push(d);
    }
  },
  bottleState(b) {
    const m = this.run.bottles;
    let s = m.get(b.id);
    if (!s) { s = { hp: BOTTLE.hp, broken: false, orbitHit: -1 }; m.set(b.id, s); }
    return s;
  },
  touchesBottle(b, x, y, rad) { return (b.x - x) ** 2 + (b.y + BOTTLE.cy - y) ** 2 <= (rad + BOTTLE.r) ** 2; },
  nearestBottle(maxD) {
    const p = this.run.player;
    let best = null, bd = maxD * maxD;
    for (const b of this.run.nearBottles) {
      if (this.bottleState(b).broken) continue;
      const d = (b.x - p.x) ** 2 + (b.y + BOTTLE.cy - p.y) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  },
  hitBottle(b) {
    const r = this.run, s = this.bottleState(b);
    if (s.broken) return;
    s.hp--;
    const cx = b.x, cy = b.y + BOTTLE.cy;
    if (s.hp > 0) { this.stage.fx('pop', cx, cy, 34); sound.play('hit', { volume: 0.2, gap: 0.07 }); return; }
    s.broken = true;
    this.stage.fx('shatter', cx, cy, 96);
    sound.play('cannon', { volume: 0.3, gap: 0.1 });
    const out = bottleOutcome(b.kind);
    if (out.alien) {
      const e = this.spawnEnemy('alien', spawnPlan(r.time, r.diff, r.stageDef).hpScale, undefined, { x: cx, y: cy + 10 });
      e.flash = 0.2;
      if (!r.alienSeen) { r.alienSeen = true; this.showBanner('うちゅうじんが とびだした！', 1800); }
    } else if (out.gem) this.dropGem(cx, cy + 16, out.gem);
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
    const box = r.container;
    if (box && !box.open && dist2(box, p) < SQUAD.openR * SQUAD.openR) this.openContainer();
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
    set('mode', r.weapons.laser ? r.laserMode : -1, v => {
      this.el.mode.classList.toggle('hidden', v < 0);
      if (v < 0) return;
      const mid = LASER_MODES[v];
      this.el.modeIco.style.backgroundImage = art({ laserMg: 'modeMg', laserBeam: 'modeBeam', laserRk: 'modeRk' }[mid]);
      this.el.modeTxt.textContent = mid === 'laserRk' ? 'ロケット' : WEAPONS[mid].name;
    });
    const wcd = r.medic ? Math.ceil(r.whistleCd) : -1;
    set('whistle', wcd, v => {
      const b = this.el.whistle;
      b.classList.toggle('hidden', v < 0);
      b.classList.toggle('cool', v > 0);
      this.el.whistleCd.textContent = v > 0 ? String(v) : '';
    });
    set('whistleCall', !!r.medic && wcd === 0 && r.player.hp < r.stats.maxHp * 0.5, v => { this.el.whistle.classList.toggle('call', v); });
    if (r.boss) set('boss', Math.round(Math.max(0, r.boss.hp / r.boss.maxHp) * 100), v => { this.el.bossFill.style.transform = `scaleX(${v / 100})`; });
  },

  // コンテナが がめんの そとに ある ときの やじるし（がめんの はしに だす）
  /** いま いく ところ（やじるし・シミュの bot が つかう）。{ x, y, label } か null */
  questGoal() {
    const r = this.run, q = r.quest;
    if (!q) return r.container && !r.container.open ? { x: r.container.x, y: r.container.y, label: 'コンテナ' } : null;
    if (q.tower) {
      if (r.zone === 'surface') return q.stage === 'door' ? { x: q.door.x, y: q.door.y, label: 'ビル' } : null;
      const c = q.cells.find(c => !c.open);
      if (c) return { x: c.x, y: c.y, label: 'ろうや' };
      if (q.stairs && !q.stairs.hidden) return { x: q.stairs.x, y: q.stairs.y, label: 'かいだん' };
      if (q.heliProp && !q.heliTaken) return { x: q.heliProp.x, y: q.heliProp.y, label: 'ヘリ' };
      return q.exit ? { x: q.exit.x, y: q.exit.y, label: 'はしご' } : null;
    }
    if (r.zone === 'surface') {
      if (q.stage === 'hut' || q.stage === 'fight') return { x: q.hut.x, y: q.hut.y, label: 'こや' };
      if (q.stage === 'door') return { x: q.door.x, y: q.door.y, label: 'とびら' };
      return null;
    }
    if (q.bossDead) return { x: q.exit.x, y: q.exit.y, label: 'でぐち' };
    const c = q.cells.find(c => !c.open);
    if (c) return { x: c.x, y: c.y, label: 'ろうや' };
    return q.bossOut ? null : { ...QUEST.under.bossAt, label: 'ボス' }; // ボスが でたら たたかう だけ
  },

  containerArrow() {
    const r = this.run, box = this.questGoal();
    if (!box || (r.zone === 'under' && box.label === 'ボス')) return null;
    const label = box.label;

    const z = this.zoom || 1, p = r.player;
    const dx = (box.x - p.x) * z, dy = (box.y - p.y) * z;
    const hw = this.sw / 2, hh = this.sh / 2;
    if (Math.abs(dx) < hw - 30 && Math.abs(dy) < hh - 30) return null;
    const top = 96, m = 42; // うえは HUD の ぶん あける
    const ang = Math.atan2(dy, dx);
    const k = Math.min((hw - m) / Math.max(1e-6, Math.abs(dx)), (dy < 0 ? hh - top : hh - m - 40) / Math.max(1e-6, Math.abs(dy)));
    return { x: hw + dx * k, y: hh + dy * k, ang, label };
  },

  draw() {
    const r = this.run;
    this.stage.draw(r, {
      auraRadius: r.weapons.aura ? weaponStat('aura', 'radius', r.weapons.aura) : 0,
      auraMagic: r.char.id === 'rabbit', // まじゅつしの バリアは まほうじん
      orbit: this.orbitPositions(),
      bottles: r.bottles,
    });
    this.stage.arrow(this.containerArrow());
    this.stage.joystick(this.stick, this.rect);
  },
};

export default DadaSurvivorGame;
