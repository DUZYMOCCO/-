/**
 * ダダサバイバーもどき — こども向け オートアタック・サバイバル（canvas不使用・DOM＋SVGトゥーン描画）
 * ゆびで うごかすだけ。こうげきは じどう。5ふん いきのこって ボスを たおそう！
 */
import { sound } from '../../common/js/audio.js?v=151';
import { storage } from '../../common/js/storage.js';
import {
  STAGE_SECONDS, MINI_BOSS_SECONDS, MAX_ENEMIES, MAX_GEMS, DIFFICULTIES, CHARACTERS, ENEMY_TYPES,
  WEAPONS, PASSIVES, SHOP_ITEMS, shopCost, weaponStat, xpToNext, playerStats, spawnPlan,
  pickWeighted, upgradeChoices, normalizeSave,
} from './rules.js?v=176';
import { art, preloadArt } from './art.js?v=176';
import { Stage } from './stage.js?v=176';

const SAVE_KEY = 'dada_survivor_save';
const TAU = Math.PI * 2;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// アイコン：トゥーン絵があればそれ、なければ絵文字
const ICON_ART = { kunai: 'kunai', orbit: 'star', thunder: 'bolt', bomb: 'bomb', magnet: 'magnet', meat: 'meat', coin: 'coin' };
const iconHtml = (id, fallback, cls = 'ds-icon') => ICON_ART[id]
  ? `<span class="${cls}" style='background-image:${art(ICON_ART[id])}'></span>`
  : `<span class="${cls} emoji">${fallback}</span>`;

export const DadaSurvivorGame = {
  id: 'dada-survivor',
  title: 'ダダサバイバーもどき',
  subtitle: 'ゆびで うごいて いきのこれ！',
  icon: '🐱',
  color: '#22c55e',
  section: 'kids',
  description: 'こうげきは じどう！ ゾンビを たおして つよくなろう。5ふん いきのこって ボスを たおせ！',

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.save = normalizeSave(storage.get(SAVE_KEY));
    this.run = null;
    this.paused = false;
    this.keys = new Set();
    this.stick = null;
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
    };
    this.hudCache = {};
    $('.ds-pause').addEventListener('click', () => { sound.playTap(); this.showPause(); });
  },

  bindEvents() {
    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this.onKeyDown = e => { this.keys.add(e.key.toLowerCase()); };
    this.onKeyUp = e => { this.keys.delete(e.key.toLowerCase()); };
    this.onVisibility = () => { if (document.hidden && this.run && !this.paused) this.showPause(); };
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('visibilitychange', this.onVisibility);

    // どこを さわっても ジョイスティック
    const v = this.stage.view;
    v.addEventListener('pointerdown', e => {
      if (!this.run || this.paused) return;
      v.setPointerCapture?.(e.pointerId);
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    });
    v.addEventListener('pointermove', e => {
      if (this.stick && this.stick.id === e.pointerId) { this.stick.x = e.clientX; this.stick.y = e.clientY; }
    });
    const end = e => { if (this.stick && this.stick.id === e.pointerId) this.stick = null; };
    v.addEventListener('pointerup', end);
    v.addEventListener('pointercancel', end);
  },

  resize() {
    const r = this.container.getBoundingClientRect();
    this.rect = r;
    this.w = Math.max(1, r.width || window.innerWidth);
    this.h = Math.max(1, r.height || window.innerHeight);
    this.stage.resize(this.w, this.h);
  },

  /* ================= 画面 ================= */
  setOverlay(html) {
    this.overlay.innerHTML = html;
    this.overlay.classList.toggle('hidden', !html);
  },

  showTitle() {
    this.run = null; this.paused = false;
    this.stick = null;
    this.stage.reset();
    this.stage.joystick(null);
    this.hud.classList.add('hidden');
    this.root.classList.add('ds-attract');
    sound.stopBGM();
    const s = this.save;
    this.setOverlay(`
      <div class="ds-panel ds-title">
        <div class="ds-logo">ダダサバイバー<span>もどき</span></div>
        <div class="ds-sub">🪙 ${s.coins}　🏆 クリア ${s.clears}かい</div>
        <div class="ds-label">キャラを えらぼう</div>
        <div class="ds-chars">
          ${CHARACTERS.map(c => `<button class="ds-char ${c.id === s.character ? 'on' : ''}" data-char="${c.id}">
            <span class="ds-char-pic" style='background-image:${art(c.id)}'></span><b>${c.name}</b>
            <small>${iconHtml(c.weapon, WEAPONS[c.weapon].icon, 'ds-icon sm')}${WEAPONS[c.weapon].name}</small></button>`).join('')}
        </div>
        <div class="ds-label">むずかしさ</div>
        <div class="ds-diffs">
          ${Object.values(DIFFICULTIES).map(d => `<button class="ds-diff ${d.id === s.difficulty ? 'on' : ''}" data-diff="${d.id}">${d.label}</button>`).join('')}
        </div>
        <button class="ds-btn ds-go" data-act="start">▶ スタート！</button>
        <div class="ds-row">
          <button class="ds-btn ds-sub-btn" data-act="shop">🛒 おみせ</button>
          <button class="ds-btn ds-sub-btn" data-act="hub">🏠 もどる</button>
        </div>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      sound.playTap();
      if (b.dataset.char) { s.character = b.dataset.char; this.persist(); this.showTitle(); }
      else if (b.dataset.diff) { s.difficulty = b.dataset.diff; this.persist(); this.showTitle(); }
      else if (b.dataset.act === 'start') this.startRun();
      else if (b.dataset.act === 'shop') this.showShop();
      else if (b.dataset.act === 'hub') { this.destroy(); this.onBackToHub(); }
    };
  },

  showShop() {
    const s = this.save;
    this.setOverlay(`
      <div class="ds-panel">
        <div class="ds-h">🛒 おみせ</div>
        <div class="ds-sub">もっている コイン：🪙 ${s.coins}</div>
        ${Object.entries(SHOP_ITEMS).map(([id, it]) => {
          const lv = s.shop[id] || 0, max = lv >= it.max, cost = shopCost(lv);
          return `<div class="ds-shop-item">
            <span class="ds-icon emoji">${it.icon}</span>
            <div class="ds-shop-text"><b>${it.name} Lv${lv}</b><small>${it.desc}</small></div>
            <button class="ds-btn ds-buy" data-buy="${id}" ${max || s.coins < cost ? 'disabled' : ''}>${max ? 'MAX' : `🪙${cost}`}</button>
          </div>`;
        }).join('')}
        <button class="ds-btn ds-sub-btn" data-act="back">↩ もどる</button>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.buy) {
        const id = b.dataset.buy, cost = shopCost(s.shop[id] || 0);
        if (s.coins >= cost) { s.coins -= cost; s.shop[id] = (s.shop[id] || 0) + 1; this.persist(); sound.playItem(); }
        this.showShop();
      } else { sound.playTap(); this.showTitle(); }
    };
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
    const card = c => {
      if (c.kind === 'weapon') {
        const w = WEAPONS[c.id];
        return [iconHtml(c.id, w.icon), w.name, c.level === 1 ? 'あたらしい！' : `Lv${c.level}`, w.desc, c.level === 1];
      }
      if (c.kind === 'passive') { const p = PASSIVES[c.id]; return [iconHtml(c.id, p.icon), p.name, `Lv${c.level}`, p.desc, false]; }
      if (c.kind === 'food') return [iconHtml('meat', '🍖'), 'おにく', '', 'たいりょく かいふく', false];
      return [iconHtml('coin', '🪙'), 'コイン', '', 'コイン +20', false];
    };
    sound.playHighScore();
    this.setOverlay(`
      <div class="ds-panel ds-levelup">
        <div class="ds-h ds-pop">レベルアップ！</div>
        <div class="ds-sub">ひとつ えらんでね</div>
        ${choices.map((c, i) => { const [icon, name, lv, desc, isNew] = card(c); return `
          <button class="ds-card ${isNew ? 'new' : ''}" data-pick="${i}" style="animation-delay:${i * 70}ms">
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
    if (c.kind === 'weapon') r.weapons[c.id] = c.level;
    else if (c.kind === 'passive') {
      r.passives[c.id] = c.level;
      const before = r.stats.maxHp;
      this.refreshStats();
      if (c.id === 'heart') r.player.hp = Math.min(r.stats.maxHp, r.player.hp + (r.stats.maxHp - before) + 20);
    } else if (c.kind === 'food') r.player.hp = Math.min(r.stats.maxHp, r.player.hp + 50);
    else r.coins += 20;
  },

  showResult(clear, best) {
    const r = this.run;
    this.hud.classList.add('hidden');
    this.setOverlay(`
      <div class="ds-panel ds-result ${clear ? 'clear' : ''}">
        <div class="ds-result-pic" style='background-image:${art(r.char.id)}'></div>
        <div class="ds-h">${clear ? 'クリア！ やったね！' : 'やられちゃった…'}</div>
        <div class="ds-stats">
          <div>⏱ いきのこった じかん<b>${fmtTime(r.time)}</b></div>
          <div>💀 たおした かず<b>${r.kills}</b></div>
          <div>⬆ レベル<b>${r.level}</b></div>
          <div>🪙 もらった コイン<b>${r.earned}</b></div>
        </div>
        ${best ? '<div class="ds-best">🏆 じこベスト！</div>' : ''}
        <button class="ds-btn ds-go" data-act="again">🔁 もういちど</button>
        <button class="ds-btn ds-sub-btn" data-act="title">🏠 タイトルへ</button>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      sound.playTap();
      if (b.dataset.act === 'again') this.startRun(); else this.showTitle();
    };
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
    this.stage.reset();
    this.run = {
      diff: DIFFICULTIES[this.save.difficulty] || DIFFICULTIES.easy,
      char: ch,
      time: 0, kills: 0, coins: 0, earned: 0, level: 1, xp: 0, pendingLevels: 0,
      weapons: { [ch.weapon]: 1 }, passives: {}, stats: null,
      player: { x: 0, y: 0, hp: 100, hurt: 0, face: 1, mx: 0, my: 1 },
      enemies: [], shots: [], gems: [], items: [],
      timers: {}, spawnClock: 0, orbitAngle: 0, auraClock: 0,
      miniBossDone: false, finalBossDone: false, boss: null, ended: false,
    };
    this.refreshStats();
    this.run.player.hp = this.run.stats.maxHp;
    this.paused = false;
    this.hudCache = {};
    this.root.classList.remove('ds-attract');
    this.setOverlay('');
    this.hud.classList.remove('hidden');
    this.el.boss.classList.add('hidden');
    this.resize();
    this.lastTime = performance.now();
    sound.startBGM();
    this.showBanner('ゆびで うごかそう！', 2500);
  },

  refreshStats() { this.run.stats = playerStats(this.run.passives, this.save.shop); },

  endRun(clear) {
    const r = this.run; if (!r || r.ended) return;
    r.ended = true; this.paused = true; this.stick = null; this.stage.joystick(null);
    r.earned = Math.round(r.coins * r.diff.coin) + (clear ? 50 : 0);
    const s = this.save;
    s.coins += r.earned;
    if (clear) s.clears += 1;
    const best = r.kills > s.bestKills;
    s.bestKills = Math.max(s.bestKills, r.kills);
    this.persist();
    const score = r.kills + (clear ? 1000 : 0);
    if (score > storage.getHighScore(this.id)) storage.setHighScore(this.id, score);
    if (clear || best) sound.playHighScore(); else sound.playGameOver();
    this.showResult(clear, best);
  },

  loop(now) {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (this.run && !this.paused) this.update(dt);
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
    if (!r.miniBossDone && r.time >= MINI_BOSS_SECONDS) {
      r.miniBossDone = true; this.spawnEnemy('ogre', 1); this.showBanner('⚠ おにが きた！');
    }
    if (!r.finalBossDone && r.time >= STAGE_SECONDS) {
      r.finalBossDone = true; this.spawnEnemy('dragon', 1); this.showBanner('⚠ ドラゴンが きた！ たおせば クリア！', 3000);
    }
    if (r.finalBossDone) return; // ボスせんは ザコ なし
    const plan = spawnPlan(r.time, r.diff);
    r.spawnClock -= dt;
    if (r.spawnClock <= 0) {
      r.spawnClock = plan.interval;
      for (let i = 0; i < plan.batch && r.enemies.length < MAX_ENEMIES; i++) this.spawnEnemy(pickWeighted(plan.weights), plan.hpScale);
    }
  },

  spawnEnemy(type, hpScale) {
    const r = this.run, T = ENEMY_TYPES[type], p = r.player;
    const a = Math.random() * TAU, rad = Math.hypot(this.w, this.h) / 2 + 50;
    const hp = T.boss ? T.hp * r.diff.enemyHp : T.hp * hpScale;
    const e = { type, T, x: p.x + Math.cos(a) * rad, y: p.y + Math.sin(a) * rad, hp, maxHp: hp, flash: 0, orbitHit: -1, kb: 0, kx: 0, ky: 0 };
    r.enemies.push(e);
    if (T.boss) { r.boss = e; this.el.bossName.textContent = T.name; this.el.boss.classList.remove('hidden'); }
    return e;
  },

  nearestEnemies(n, maxD = 520) {
    const p = this.run.player, lim = maxD * maxD;
    return this.run.enemies
      .map(e => [e, dist2(e, p)]).filter(([, d]) => d < lim)
      .sort((a, b) => a[1] - b[1]).slice(0, n).map(([e]) => e);
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
    const ready = (id, cd) => { T[id] = (T[id] ?? 0) - dt; if (T[id] > 0) return false; T[id] = cd * st.cooldown; return true; };
    for (const [id, lv] of Object.entries(r.weapons)) {
      const dmg = weaponStat(id, 'damage', lv) * st.damage;
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
        for (const e of r.enemies) {
          if (e.hp <= 0 || (e.x - o.x) ** 2 + (e.y - o.y) ** 2 > (e.T.r + 14) ** 2) continue;
          if (r.time - e.orbitHit < 0.45) continue;
          e.orbitHit = r.time;
          this.hitEnemy(e, dmg, o.x, o.y);
        }
      }
    }
  },

  areaDamage(x, y, radius, dmg, knock = true) {
    for (const e of this.run.enemies) {
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= (radius + e.T.r) ** 2) this.hitEnemy(e, dmg, knock ? x : null, y);
    }
  },

  hitEnemy(e, dmg, fromX = null, fromY = null) {
    if (e.hp <= 0) return;
    const d = Math.round(dmg * (0.9 + Math.random() * 0.2));
    e.hp -= d; e.flash = 0.1;
    if (fromX !== null && !e.T.boss) {
      const dx = e.x - fromX, dy = e.y - fromY, l = Math.hypot(dx, dy) || 1;
      e.kx = dx / l; e.ky = dy / l; e.kb = 0.12;
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
      if (r.boss === e) { r.boss = null; this.el.boss.classList.add('hidden'); }
      if (e.T.final) { r.coins += 50; this.stage.flash(); setTimeout(() => this.run === r && this.endRun(true), 900); return; }
      r.coins += 30;
      for (let i = 0; i < 12; i++) this.dropGem(e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 80, 4);
      r.items.push({ kind: 'meat', x: e.x, y: e.y });
      this.showBanner('やったー！ おにを たおした！');
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
      if (s.kind === 'kunai') {
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        for (const e of r.enemies) {
          if (e.hp <= 0 || (e.x - s.x) ** 2 + (e.y - s.y) ** 2 > (e.T.r + s.r) ** 2) continue;
          this.hitEnemy(e, s.dmg, s.x - s.vx, s.y - s.vy);
          if (--s.pierce <= 0) { s.life = 0; break; }
        }
      } else if (s.kind === 'bomb') {
        s.t += dt;
        if (s.t >= s.dur) {
          s.life = 0;
          this.stage.fx('boom', s.tx, s.ty, s.radius * 2);
          this.areaDamage(s.tx, s.ty, s.radius, s.dmg);
          sound.playBomb();
        }
      }
    }
    r.shots = r.shots.filter(s => s.life > 0);
    r.enemies = r.enemies.filter(e => e.hp > 0);
  },

  updateEnemies(dt) {
    const r = this.run, p = r.player, far = (Math.hypot(this.w, this.h) * 0.9) ** 2;
    // かんたんな おしあい（グリッド）
    const cell = 40, grid = new Map();
    for (const e of r.enemies) {
      const k = Math.floor(e.x / cell) * 73856093 ^ Math.floor(e.y / cell) * 19349663;
      let list = grid.get(k); if (!list) grid.set(k, list = []);
      list.push(e);
    }
    for (const e of r.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      let vx = dx / d * e.T.speed, vy = dy / d * e.T.speed;
      if (e.kb > 0) { e.kb -= dt; vx = e.kx * 260; vy = e.ky * 260; }
      const cx = Math.floor(e.x / cell), cy = Math.floor(e.y / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const list = grid.get(gx * 73856093 ^ gy * 19349663); if (!list) continue;
        for (const o of list) {
          if (o === e) continue;
          const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), min = e.T.r + o.T.r;
          if (od > 0 && od < min) { const push = (min - od) / min * 120; vx += ox / od * push; vy += oy / od * push; }
        }
      }
      e.x += vx * dt; e.y += vy * dt;
      // ぶつかったら ダメージ
      if (d < e.T.r + 14 && p.hurt <= 0) {
        p.hp -= e.T.dmg * r.diff.enemyDmg;
        p.hurt = 0.6;
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
    r.gems = r.gems.filter(g => !g.got);
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
    r.items = r.items.filter(it => !it.got);
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
