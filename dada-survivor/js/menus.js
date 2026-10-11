/**
 * ダダサバイバーもどき メニュー画面（タイトル・キャラ・そうび・おみせ・たからばこ・けっか）
 * DadaSurvivorGame に混ぜ込んで使う（this はゲーム本体）。
 */
import { sound } from '../../common/js/audio.js?v=151';
import {
  DIFFICULTIES, CHARACTERS, WEAPONS, SHOP_ITEMS, STAGES, RARITIES, GEAR_SLOTS, CHEST_COST,
  shopCost, stageById, stageUnlocked, charUnlocked, gearLabel, rollGear, addGear, equipGear,
  unequipGear, mergeGear, bonusFor,
} from './rules.js?v=177';
import { art } from './art.js?v=177';

const GEAR_ART = { weapon: 'sword', armor: 'armor', boots: 'shoes', charm: 'charm' };
const ICON_ART = { kunai: 'kunai', orbit: 'star', thunder: 'bolt', bomb: 'bomb', magnet: 'magnet', meat: 'meat', coin: 'coin' };
export const iconHtml = (id, fallback, cls = 'ds-icon') => ICON_ART[id]
  ? `<span class="${cls}" style='background-image:${art(ICON_ART[id])}'></span>`
  : `<span class="${cls} emoji">${fallback}</span>`;
const pic = (name, cls) => `<span class="${cls}" style='background-image:${art(name)}'></span>`;
const gearTile = (slot, rarity, extra = '') => `<span class="ds-gear-tile" style="--rar:${RARITIES[rarity].color}">${pic(GEAR_ART[slot], 'ds-gear-pic')}${extra}</span>`;
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const menuMethods = {
  /* ---------- タイトル ---------- */
  showTitle() {
    this.run = null; this.paused = false;
    this.stick = null;
    this.stage.reset();
    this.stage.joystick(null);
    this.hud.classList.add('hidden');
    this.root.classList.add('ds-attract');
    sound.stopBGM();
    const s = this.save, st = stageById(s.stage);
    this.stage.setGround(st.ground);
    const ch = CHARACTERS.find(c => c.id === s.character) || CHARACTERS[0];
    const clears = s.stageClears[st.id] || 0;
    const next = STAGES.find(x => x.id === st.id + 1);
    this.setOverlay(`
      <div class="ds-panel ds-title">
        <div class="ds-logo">ダダサバイバー<span>もどき</span></div>
        <div class="ds-sub">🪙 ${s.coins}</div>
        <div class="ds-stage-pick">
          <button class="ds-arrow" data-stage="${st.id - 1}" ${st.id <= 1 ? 'disabled' : ''}>◀</button>
          <div class="ds-stage-card" data-ground="${st.ground}">
            <small>ステージ ${st.id}</small><b>${st.name}</b>
            <em>${clears ? `👑 クリア ${clears}かい` : 'まだ クリアしてないよ'}</em>
          </div>
          <button class="ds-arrow" data-stage="${st.id + 1}" ${!next || !stageUnlocked(s, next.id) ? 'disabled' : ''}>${next && !stageUnlocked(s, next.id) ? '🔒' : '▶'}</button>
        </div>
        <button class="ds-hero-pick" data-act="chars">
          ${pic(ch.id, 'ds-char-pic')}
          <span class="ds-hero-text"><b>${ch.name}</b><small>${iconHtml(ch.weapon, WEAPONS[ch.weapon].icon, 'ds-icon sm')}${WEAPONS[ch.weapon].name}・${ch.trait}</small></span>
          <span class="ds-change">かえる</span>
        </button>
        <div class="ds-diffs">
          ${Object.values(DIFFICULTIES).map(d => `<button class="ds-diff ${d.id === s.difficulty ? 'on' : ''}" data-diff="${d.id}">${d.label}</button>`).join('')}
        </div>
        <button class="ds-btn ds-go" data-act="start">▶ スタート！</button>
        ${s.pendingChests ? `<button class="ds-btn ds-chest-btn" data-act="chests">${pic('chest', 'ds-icon sm')} たからばこを あける（${s.pendingChests}こ）</button>` : ''}
        <div class="ds-row">
          <button class="ds-btn ds-sub-btn" data-act="gear">🛡 そうび</button>
          <button class="ds-btn ds-sub-btn" data-act="shop">🛒 おみせ</button>
        </div>
        <button class="ds-btn ds-sub-btn ds-thin" data-act="hub">🏠 こうぼうに もどる</button>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      sound.playTap();
      const act = b.dataset.act;
      if (b.dataset.stage) { s.stage = +b.dataset.stage; this.persist(); this.showTitle(); }
      else if (b.dataset.diff) { s.difficulty = b.dataset.diff; this.persist(); this.showTitle(); }
      else if (act === 'start') this.startRun();
      else if (act === 'chars') this.showCharacters();
      else if (act === 'gear') this.showGear();
      else if (act === 'shop') this.showShop();
      else if (act === 'chests') this.showChests(() => this.showTitle());
      else if (act === 'hub') { this.destroy(); this.onBackToHub(); }
    };
  },

  /* ---------- キャラえらび ---------- */
  showCharacters() {
    const s = this.save;
    this.setOverlay(`
      <div class="ds-panel">
        <div class="ds-h">キャラを えらぼう</div>
        <div class="ds-chars">
          ${CHARACTERS.map(c => {
            const open = charUnlocked(s, c);
            return `<button class="ds-char ${c.id === s.character ? 'on' : ''} ${open ? '' : 'locked'}" data-char="${c.id}" ${open ? '' : 'disabled'}>
              ${pic(c.id, 'ds-char-pic')}<b>${open ? c.name : '？？？'}</b>
              <small>${open ? `${iconHtml(c.weapon, WEAPONS[c.weapon].icon, 'ds-icon sm')}${WEAPONS[c.weapon].name}` : `ステージ${c.unlock}<br>クリアで なかま`}</small>
              ${open ? `<i>${c.trait}</i>` : ''}
            </button>`;
          }).join('')}
        </div>
        <button class="ds-btn ds-sub-btn" data-act="back">↩ もどる</button>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      sound.playTap();
      if (b.dataset.char) { s.character = b.dataset.char; this.persist(); }
      this.showTitle();
    };
  },

  /* ---------- そうび ---------- */
  showGear() {
    const s = this.save, g = s.gear;
    const b = bonusFor(s, s.character);
    const summary = [
      b.dmg ? `こうげき +${Math.round(b.dmg * 100)}%` : '', b.hp ? `たいりょく +${b.hp}` : '',
      b.spd ? `はやさ +${Math.round(b.spd * 100)}%` : '', b.regen ? `かいふく ${Math.round(b.regen * 10) / 10}/びょう` : '',
    ].filter(Boolean).join('　') || 'まだ なにも ついてないよ';
    const slots = Object.entries(GEAR_SLOTS).map(([slot, def]) => {
      const eq = g.equip[slot];
      return `<button class="ds-slot" data-unequip="${slot}">
        ${eq >= 0 ? gearTile(slot, eq) : `<span class="ds-gear-tile empty">${pic(GEAR_ART[slot], 'ds-gear-pic')}</span>`}
        <small>${def.name}</small></button>`;
    }).join('');
    const bag = [];
    for (const slot of Object.keys(GEAR_SLOTS)) {
      for (let r = RARITIES.length - 1; r >= 0; r--) {
        const n = g.inv[slot][r];
        if (!n) continue;
        bag.push(`<div class="ds-bag-item">
          <button class="ds-bag-main" data-equip="${slot}:${r}">
            ${gearTile(slot, r, n > 1 ? `<span class="ds-count">×${n}</span>` : '')}
            <span class="ds-bag-text"><b style="color:${r ? RARITIES[r].color : 'inherit'}">${RARITIES[r].name}の ${GEAR_SLOTS[slot].name}</b><small>${gearLabel(slot, r)}</small></span>
          </button>
          ${n >= 3 && r < RARITIES.length - 1 ? `<button class="ds-merge" data-merge="${slot}:${r}">がったい！</button>` : ''}
        </div>`);
      }
    }
    this.setOverlay(`
      <div class="ds-panel ds-gear">
        <div class="ds-h">🛡 そうび</div>
        <div class="ds-slots">${slots}</div>
        <div class="ds-gear-sum">${summary}</div>
        <button class="ds-btn ds-sub-btn ds-thin" data-act="best">✨ いちばん つよいのを つける</button>
        <div class="ds-label">もちもの（タップで つける・3こ で がったい）</div>
        <div class="ds-bag">${bag.join('') || '<div class="ds-sub">たからばこを あけると そうびが でるよ</div>'}</div>
        <button class="ds-btn ds-sub-btn" data-act="back">↩ もどる</button>
      </div>`);
    this.overlay.onclick = e => {
      const btn = e.target.closest('button'); if (!btn) return;
      if (btn.dataset.equip) { const [slot, r] = btn.dataset.equip.split(':'); equipGear(s, slot, +r); sound.playItem(); }
      else if (btn.dataset.unequip) { if (unequipGear(s, btn.dataset.unequip)) sound.playTap(); }
      else if (btn.dataset.merge) {
        const [slot, r] = btn.dataset.merge.split(':');
        if (mergeGear(s, slot, +r)) { sound.playHighScore(); this.persist(); this.showReveal({ slot, rarity: +r + 1 }, 'がったい！', () => this.showGear()); return; }
      } else if (btn.dataset.act === 'best') {
        for (const slot of Object.keys(GEAR_SLOTS)) {
          let best = -1;
          for (let r = 0; r < RARITIES.length; r++) if (g.inv[slot][r] > 0) best = r;
          if (best > g.equip[slot]) equipGear(s, slot, best);
        }
        sound.playItem();
      } else { sound.playTap(); this.showTitle(); return; }
      this.persist();
      this.showGear();
    };
  },

  /* ---------- おみせ ---------- */
  showShop() {
    const s = this.save;
    this.setOverlay(`
      <div class="ds-panel">
        <div class="ds-h">🛒 おみせ</div>
        <div class="ds-sub">もっている コイン：🪙 ${s.coins}</div>
        <div class="ds-shop-item ds-shop-chest">
          ${pic('chest', 'ds-icon')}
          <div class="ds-shop-text"><b>たからばこ</b><small>そうびが 1こ でるよ</small></div>
          <button class="ds-btn ds-buy" data-chest="1" ${s.coins < CHEST_COST ? 'disabled' : ''}>🪙${CHEST_COST}</button>
        </div>
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
      if (b.dataset.chest) {
        if (s.coins < CHEST_COST) return;
        s.coins -= CHEST_COST; s.pendingChests = (s.pendingChests || 0) + 1; this.persist();
        sound.playItem();
        this.showChests(() => this.showShop(), 1);
      } else if (b.dataset.buy) {
        const id = b.dataset.buy, cost = shopCost(s.shop[id] || 0);
        if (s.coins >= cost) { s.coins -= cost; s.shop[id] = (s.shop[id] || 0) + 1; this.persist(); sound.playItem(); }
        this.showShop();
      } else { sound.playTap(); this.showTitle(); }
    };
  },

  /* ---------- たからばこ ---------- */
  // limit: いくつ あけるか（なければ ぜんぶ）
  showChests(done, limit = Infinity) {
    const s = this.save;
    if (!(s.pendingChests > 0) || limit <= 0) { done(); return; }
    this.setOverlay(`
      <div class="ds-panel ds-chest-screen">
        <div class="ds-h">たからばこ</div>
        <div class="ds-sub">のこり ${s.pendingChests}こ</div>
        <button class="ds-chest" data-open="1">${pic('chest', 'ds-chest-pic')}</button>
        <div class="ds-sub">タップして あけよう！</div>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('[data-open]'); if (!b || b.dataset.busy) return;
      b.dataset.busy = '1';
      sound.playTap();
      b.classList.add('shake');
      setTimeout(() => {
        const item = rollGear();
        addGear(s, item);
        s.pendingChests--;
        this.persist();
        this.showReveal(item, null, () => this.showChests(done, limit - 1), s.pendingChests > 0 && limit > 1 ? 'つぎの はこ' : 'OK');
      }, 650);
    };
  },

  showReveal({ slot, rarity }, title, next, nextLabel = 'OK') {
    const R = RARITIES[rarity];
    if (rarity >= 2) sound.playHighScore(); else sound.playItem();
    this.setOverlay(`
      <div class="ds-panel ds-reveal r${rarity}" style="--rar:${R.color}">
        <div class="ds-h">${title || (rarity >= 3 ? 'すごい！！' : rarity >= 2 ? 'やったね！' : 'ゲット！')}</div>
        <div class="ds-reveal-glow">${pic(GEAR_ART[slot], 'ds-reveal-pic')}</div>
        <div class="ds-reveal-name" style="color:${R.color}">${R.name}の ${GEAR_SLOTS[slot].name}</div>
        <div class="ds-sub">${gearLabel(slot, rarity)}</div>
        <button class="ds-btn ds-go" data-act="next">${nextLabel}</button>
      </div>`);
    this.overlay.onclick = e => { if (e.target.closest('button')) { sound.playTap(); next(); } };
  },

  /* ---------- けっか ---------- */
  showResult(clear, best, rewards) {
    const r = this.run, s = this.save;
    this.hud.classList.add('hidden');
    const notes = [];
    if (rewards.chests) notes.push(`${pic('chest', 'ds-icon sm')} たからばこ ×${rewards.chests}`);
    if (rewards.newStage) notes.push(`🗺 あたらしい ステージ「${rewards.newStage.name}」`);
    if (rewards.newChar) notes.push(`${pic(rewards.newChar.id, 'ds-icon sm')} ${rewards.newChar.name}が なかまに なった！`);
    this.setOverlay(`
      <div class="ds-panel ds-result ${clear ? 'clear' : ''}">
        <div class="ds-result-pic" style='background-image:${art(r.char.id)}'></div>
        <div class="ds-h">${clear ? 'クリア！ やったね！' : 'やられちゃった…'}</div>
        <div class="ds-stats">
          <div>⏱ いきのこった じかん<b>${fmtTime(r.time)}</b></div>
          <div>💀 たおした かず<b>${r.kills}</b></div>
          <div>🪙 もらった コイン<b>${r.earned}</b></div>
        </div>
        ${notes.length ? `<div class="ds-rewards">${notes.map(n => `<div>${n}</div>`).join('')}</div>` : ''}
        ${best ? '<div class="ds-best">🏆 じこベスト！</div>' : ''}
        ${s.pendingChests ? `<button class="ds-btn ds-go" data-act="chests">${pic('chest', 'ds-icon sm')} たからばこを あける</button>` : `<button class="ds-btn ds-go" data-act="again">🔁 もういちど</button>`}
        <button class="ds-btn ds-sub-btn" data-act="title">🏠 タイトルへ</button>
      </div>`);
    this.overlay.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      sound.playTap();
      if (b.dataset.act === 'chests') this.showChests(() => this.showTitle());
      else if (b.dataset.act === 'again') this.startRun();
      else this.showTitle();
    };
  },
};
