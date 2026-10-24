/**
 * ゾンビストライク（Zombie TPS）— かたごし カメラの シューティング
 * ハブが prepare()（CSS）→ init(container, onBackToHub) の じゅんに よぶ。
 */
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { WEAPONS, WEAPON_ORDER, normalizeSave, SENS, VERSION, OUTFITS, outfitName, unlockOutfit,
  GEAR_SLOTS, GEAR_STATS, GEAR_STAT_IDS, INV_CAP, rarityOf, gearColor, gearName, gearScore, gearAction, gearEffects, equippedItems,
  autoEquipBest, equipGain, autoPickup, bestLoadout, pickMapId, MAP_IDS } from './rules.js?v=8';
import { MAPS, mapInfo } from './map.js?v=8';

const hex6 = (n) => '#' + n.toString(16).padStart(6, '0');
// v0.7.0: がめんの そとを さす やじるしは ボタンに かぶらない たかさ（うえから 16%〜32%）
const arrowTop = (ny) => Math.min(32, Math.max(16, (1 - ny) * 50)).toFixed(2) + '%';
const slotOf = (id) => GEAR_SLOTS.find((s) => s.id === id);
// そうびの ちいさい アイコン（いろ＋レアの わく）
function gearIcon(g, extra = '') {
  if (!g) return `<i class="zt-gi empty${extra}"></i>`;
  const r = rarityOf(g.rarity);
  return `<i class="zt-gi r-${g.rarity}${extra}" style="--gc:${hex6(gearColor(g.color).hex)};--rc:${r.color}">${slotOf(g.slot).icon}</i>`;
}
// のうりょくの ならび（cur と くらべて ▲▼）
function statLines(g, cur) {
  // +0 の ぎょうは ださない（なくなる のうりょくは ▼で だす）
  const keys = GEAR_STAT_IDS.filter((k) => (g.stats[k] || 0) > 0);
  const lost = cur ? GEAR_STAT_IDS.filter((k) => !(g.stats[k] > 0) && cur.stats[k] > 0) : [];
  return keys.map((k) => {
    const v = g.stats[k] || 0, c = cur ? cur.stats[k] || 0 : 0, d = v - c, S = GEAR_STATS[k];
    const tag = !cur || d === 0 ? '' : d > 0 ? `<em class="up">▲${d}</em>` : `<em class="dn">▼${-d}</em>`;
    return `<div>${S.name} +${v}${S.unit}${tag}</div>`;
  }).join('') + lost.map((k) => `<div class="zero">${GEAR_STATS[k].name} <em class="dn">▼${cur.stats[k]}</em></div>`).join('');
}
function verdict(g, cur, gear) {
  if (!cur) return `<div class="zt-gv up">はじめての ${slotOf(g.slot).name}！</div>`;
  if (gear) {
    // うえげん（MAX）も かんがえた つよさで くらべる
    const d = equipGain(gear, g);
    return d > 0.05 ? '<div class="zt-gv up">いまより つよい！</div>' : d < -0.05 ? '<div class="zt-gv dn">いまの ほうが つよい</div>' : '<div class="zt-gv">おなじ くらい</div>';
  }
  const a = gearScore(g), b = gearScore(cur);
  return a > b ? '<div class="zt-gv up">いまより つよい！</div>' : a < b ? '<div class="zt-gv dn">いまの ほうが つよい</div>' : '<div class="zt-gv">おなじ くらい</div>';
}
function gearCardHTML(g, cur, gear) {
  const r = rarityOf(g.rarity);
  return `<div class="zt-gtop">${gearIcon(g, ' big')}<div><div class="zt-grar" style="color:${r.color}">${r.name}</div><b>${gearName(g)}</b></div></div>`
    + `<div class="zt-gstats">${statLines(g, cur)}</div>${verdict(g, cur, gear)}`;
}
function totalsText(gear) {
  const t = gearEffects(gear).totals;
  const parts = GEAR_STAT_IDS.filter((k) => t[k]).map((k) => `${GEAR_STATS[k].name} +${t[k]}${GEAR_STATS[k].unit}${t[k] >= GEAR_STATS[k].cap ? '（MAX）' : ''}`);
  return parts.length ? parts.join(' ・ ') : 'まだ なにも つけて いないよ';
}
import { Game } from './game.js?v=8';
import { Input } from './input.js?v=8';
import { Sfx } from './sfx.js?v=8';

// v0.7.0: ぶきの ちいさい アイコン（かくうの シルエット）
const svgI = (d) => `<svg viewBox="0 0 32 16" aria-hidden="true">${d}</svg>`;
const WEAPON_ICONS = {
  rifle: svgI('<path d="M0 5h4v6l-3 1zM4 5h20v4H4zM24 6h8v2h-8zM9 9h3l-1 5H9zM14 9h3v5h-2z"/>'),
  pistol: svgI('<path d="M7 4h18v4H7zM8 8h5l-1 7H8zM25 5h2v2h-2z"/>'),
  shotgun: svgI('<path d="M0 6l7-1v4l-6 2zM7 5h25v2.5H7zM17 8h9v2.5h-9zM8 8h3v4H8z"/>'),
  rocket: svgI('<path d="M1 5h25v5H1zM26 4l6 3.5-6 3.5zM12 10h3v5h-3zM8 2h4v3H8z"/>'),
  minigun: svgI('<path d="M2 3h11v10H2zM5 0h6v3H5zM13 3.5h19v2H13zM13 7h19v2H13zM13 10.5h19v2H13z"/>'),
};

const SAVE_KEY = 'zombie_tps_save';
const OPT_LABEL = {
  autoFire: { true: 'オン', false: 'オフ' },
  sens: { low: 'ひくい', mid: 'ふつう', high: 'たかい' },
  quality: { auto: 'じどう', low: 'かるい', high: 'きれい' },
  flashlight: { true: 'よるは オン', false: 'オフ' },
};
const OPT_CYCLE = { autoFire: [false, true], sens: ['low', 'mid', 'high'], quality: ['auto', 'low', 'high'], flashlight: [true, false] };

export default {
  prepare() {
    return loadCss(new URL('../css/zombie-tps.css?v=8', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container; this.onBackToHub = onBackToHub;
    this.save = normalizeSave(storage.get(SAVE_KEY, null));
    this.alive = true;
    this.buildDOM();
    this.sfx = new Sfx(storage.getSoundMuted());
    this.startGame3D();
    this.bind();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  },

  startGame3D() {
    const hud = this.makeHud();
    try {
      this.game = new Game(this.canvas, hud, this.sfx, this.save);
    } catch (err) {
      console.error(err);
      this.el('.zt-title-err').textContent = 'この きかいでは 3Dが うごかないみたい…';
      return;
    }
    this.input = new Input(this.touch, this.canvas);
    this.applySens();
    this.onResize();
    window.__ztps = { game: this.game, input: this.input, app: this };
  },

  el(sel) { return this.container.querySelector(sel); },

  buildDOM() {
    // v0.7.0: ちいさい アイコンの ボタン（みえる ぶぶんは ちいさく・おせる ところは 40px）
    const slots = WEAPON_ORDER.map((id) => `<button class="zt-slot" data-act="w:${id}" data-w="${id}" aria-label="${WEAPONS[id].name}" title="${WEAPONS[id].slot} ${WEAPONS[id].short}"><span class="zt-chip"><b>${WEAPONS[id].slot}</b>${WEAPON_ICONS[id] || ''}</span></button>`).join('');
    this.container.innerHTML = `
    <div class="zt-root">
      <canvas class="zt-canvas"></canvas>
      <div class="zt-hurt"></div>
      <div class="zt-boom"></div>
      <div class="zt-touch">
        <div class="zt-stick"><div class="zt-knob"></div></div>
        <div class="zt-hud">
          <div class="zt-top">
            <button class="zt-pause" data-act="pause">Ⅱ</button>
            <div class="zt-hp"><span>HP</span><div class="zt-hpbar"><div></div></div><em>100</em></div>
            <div class="zt-boticon hidden"><b>ロボ</b><div class="zt-bothp"><div></div></div></div>
            <div class="zt-wave"><b>ウェーブ 1</b><span>のこり 0</span></div>
            <div class="zt-score">スコア <b>0</b></div>
          </div>
          <div class="zt-slots">${slots}</div>
          <div class="zt-cross"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><em></em></div>
          <div class="zt-hitm"></div>
          <div class="zt-reload"><div></div><span>リロード</span></div>
          <div class="zt-boss hidden"><b>ボスゾンビ</b><div class="zt-bossbar"><div></div></div></div>
          <div class="zt-feed"></div>
          <div class="zt-banner"><b></b><span></span></div>
          <div class="zt-oji hidden"><div class="zt-ojitxt">たすけて！</div><div class="zt-ojihp"><div></div></div></div>
          <div class="zt-ojiarrow hidden"><i>➤</i><span>たすけて！</span></div>
          <div class="zt-bot hidden"><span>けいさつロボ・さわってね</span><div class="zt-bothp"><div></div></div></div>
          <div class="zt-botarrow hidden"><i>➤</i><span>けいさつロボ</span></div>
          <div class="zt-ammo"><div class="zt-wname"></div><div><b>30</b><span>/ 210</span></div></div>
          <button class="zt-btn zt-fire" data-act="fire"><span>うつ</span></button>
          <button class="zt-btn zt-aim" data-act="aim"><span>ねらう</span></button>
          <button class="zt-btn zt-rl" data-act="reload"><span>リロード</span></button>
          <button class="zt-btn zt-jump" data-act="jump"><span>ジャンプ</span></button>
          <div class="zt-keyhint">WASD いどう ・ マウス ねらう ・ ひだりクリック うつ ・ みぎクリック ねらう ・ R リロード ・ スペース ジャンプ ・ 1〜5 ぶき ・ ESC ポーズ</div>
        </div>
      </div>

      <div class="zt-screen zt-title">
        <div class="zt-title-box">
          <h1>ゾンビ<br>ストライク</h1>
          <p class="zt-sub">アサルトライフルと ロケットで まちを まもれ！</p>
          <div class="zt-stages">
            <button data-stage="day">🌆 ゆうぐれから</button>
            <button data-stage="night">🌙 よるから</button>
          </div>
          <div class="zt-maps">${['rotate', ...MAP_IDS].map((id) => `<button data-map="${id}">${id === 'rotate' ? '🔀 おまかせ' : `${mapInfo(id).icon} ${mapInfo(id).name}`}</button>`).join('')}</div>
          <div class="zt-todhint">ウェーブごとに ゆうぐれ → ゆうやけ → よる</div>
          <div class="zt-startrow">
            <button class="zt-big" data-ui="start">スタート</button>
            <button class="zt-kigaebtn" data-ui="kigae">👕 きがえ<b></b></button>
            <button class="zt-kigaebtn zt-soubibtn" data-ui="soubi">🛡 そうび<b></b></button>
          </div>
          <div class="zt-opts">
            <button data-opt="autoFire">オートうち <b></b></button>
            <button data-opt="sens">かんど <b></b></button>
            <button data-opt="quality">がしつ <b></b></button>
            <button data-opt="flashlight">ライト <b></b></button>
          </div>
          <div class="zt-best"></div>
          <button class="zt-small" data-ui="hub">← こうぼうへ もどる</button>
          <div class="zt-title-err"></div>
        </div>
        <div class="zt-help">
          <div><b>ひだり</b> ゆびで いどう</div>
          <div><b>みぎ</b> ドラッグで ねらう</div>
          <div><b>うつ</b> おしたまま れんしゃ（ドラッグも できる）</div>
          <div><b>あたま</b>を うつと ヘッドショット！</div>
          <div><b>4</b> ロケットで まとめて ふっとばせ！</div>
          <div><b>5</b> ミニガンは まわってから ズダダダ！（おもい）</div>
          <div><b>ロケットだん</b>は ゾンビが おとす はこを ひろう</div>
          <div class="zt-ver">v${VERSION}</div>
        </div>
      </div>

      <div class="zt-screen zt-kigae hidden">
        <div class="zt-kbox">
          <h2>きがえ</h2>
          <div class="zt-kcards"></div>
          <div class="zt-khint"></div>
          <button class="zt-small" data-ui="kback">← もどる</button>
        </div>
      </div>

      <div class="zt-screen zt-soubi hidden">
        <div class="zt-kbox zt-sbox">
          <h2>そうび</h2>
          <div class="zt-sauto"><button data-gearui="best">✨ つよいのを ぜんぶ そうび</button><button data-gearui="autotog">ひろったら じどう そうび <b></b></button></div>
          <div class="zt-sslots"></div>
          <div class="zt-stot"></div>
          <div class="zt-sbag"></div>
          <div class="zt-sdet"></div>
          <button class="zt-small" data-ui="sback">← もどる</button>
        </div>
      </div>

      <div class="zt-autoeq hidden"><i></i><div><b>じどう そうび！</b><span></span></div></div>
      <div class="zt-gcard hidden">
        <div class="zt-gnew">そうびを ひろった！</div>
        <div class="zt-gbody"></div>
        <div class="zt-gfull hidden">かばんが いっぱい（${INV_CAP}こ）</div>
        <div class="zt-gbtns"><button data-gear="equip">そうび</button><button data-gear="keep">しまう</button><button data-gear="drop">すてる</button></div>
        <div class="zt-gkey">E そうび ・ G すてる</div>
        <div class="zt-gtime"><div></div></div>
      </div>

      <div class="zt-screen zt-pausescr hidden">
        <div class="zt-panel">
          <h2>ポーズ</h2>
          <button class="zt-big" data-ui="resume">つづける</button>
          <button class="zt-small" data-ui="title">タイトルへ</button>
        </div>
      </div>

      <div class="zt-screen zt-over hidden">
        <div class="zt-panel">
          <h2>やられた…</h2>
          <div class="zt-res"></div>
          <button class="zt-big" data-ui="retry">もういちど</button>
          <button class="zt-small" data-ui="title">タイトルへ</button>
        </div>
      </div>

      <div class="zt-rotate"><div>📱↻<br>よこむきに してね</div></div>
    </div>`;
    this.root = this.el('.zt-root');
    this.canvas = this.el('.zt-canvas');
    this.touch = this.el('.zt-touch');
    this.updateTitle();
  },

  updateTitle() {
    for (const b of this.container.querySelectorAll('[data-opt]')) {
      const k = b.dataset.opt; b.querySelector('b').textContent = OPT_LABEL[k][String(this.save[k])];
    }
    for (const b of this.container.querySelectorAll('[data-stage]')) b.classList.toggle('sel', b.dataset.stage === this.save.stage);
    for (const b of this.container.querySelectorAll('[data-map]')) b.classList.toggle('sel', b.dataset.map === this.save.map);
    const nm = mapInfo(this.nextMapId());
    this.el('.zt-sub').textContent = `${nm.icon} ${nm.name} ・ ${nm.desc}`;
    this.el('.zt-kigaebtn b').textContent = outfitName(this.save.outfit);
    this.el('.zt-soubibtn b').textContent = `${this.save.gear.inv.length} / ${INV_CAP}`;
    this.updateKigae();
    this.updateSoubi();
    this.el('.zt-best').textContent = this.save.bestWave ? `さいこう ウェーブ ${this.save.bestWave} ・ スコア ${this.save.bestScore}` : '';
  },

  // きがえの カード（もっていない ふくは ？）
  updateKigae() {
    const owned = this.save.outfits;
    this.el('.zt-kcards').innerHTML = OUTFITS.map((o) => {
      const have = owned.includes(o.id), sel = this.save.outfit === o.id;
      return `<button class="zt-kcard${have ? '' : ' locked'}${sel ? ' sel' : ''}" data-outfit="${o.id}">`
        + `<i class="zt-sw zt-sw-${have ? o.id : 'none'}"></i><span>${have ? o.name : '？'}</span></button>`;
    }).join('');
    const n = owned.length, all = OUTFITS.length;
    this.el('.zt-khint').textContent = n < all ? `あつめた ふく ${n} / ${all} ・ おそわれてる おじさんを たすけて もらおう` : `ぜんぶ あつめた！ ${n} / ${all}`;
  },

  // そうび がめん: ぶい・ごうけい・かばん・えらんだ ものの くわしく
  updateSoubi() {
    const gear = this.save.gear, eqs = equippedItems(gear);
    if (this.selGear && !gear.inv.some((g) => g.id === this.selGear)) this.selGear = null;
    this.el('.zt-sslots').innerHTML = GEAR_SLOTS.map((s, i) => {
      const g = eqs[i];
      return `<button class="zt-sslot${g && g.id === this.selGear ? ' sel' : ''}" ${g ? `data-gsel="${g.id}"` : 'data-gsel=""'}>${gearIcon(g)}<span>${s.name}</span></button>`;
    }).join('');
    this.el('.zt-stot').textContent = totalsText(gear);
    this.el('[data-gearui=autotog] b').textContent = this.save.autoEquip ? 'オン' : 'オフ';
    this.el('[data-gearui=autotog]').classList.toggle('sel', !!this.save.autoEquip);
    const bl = bestLoadout(gear), already = GEAR_SLOTS.every((s) => !bl.eq[s.id] || gear.eq[s.id] === bl.eq[s.id]);
    this.el('[data-gearui=best]').classList.toggle('done', already);
    const bag = gear.inv.filter((g) => !eqs.includes(g));
    let cells = bag.map((g) => `<button class="zt-bagc${g.id === this.selGear ? ' sel' : ''}" data-gsel="${g.id}">${gearIcon(g)}</button>`).join('');
    for (let i = gear.inv.length; i < INV_CAP; i++) cells += '<span class="zt-bagc none"></span>';
    this.el('.zt-sbag').innerHTML = `<div class="zt-baglbl">かばん ${gear.inv.length} / ${INV_CAP}</div><div class="zt-bagg">${cells}</div>`;
    const sel = gear.inv.find((g) => g.id === this.selGear);
    const det = this.el('.zt-sdet');
    if (!sel) { det.innerHTML = '<div class="zt-shint">アイコンを タップして えらんでね ・ ゾンビが たまに おとすよ（ボスは かならず！）</div>'; return; }
    const cur = gear.inv.find((g) => g.id === gear.eq[sel.slot]);
    const on = cur && cur.id === sel.id;
    det.innerHTML = `<div class="zt-gcardin">${gearCardHTML(sel, on ? null : cur || null, on ? null : gear)}</div><div class="zt-sbtns">`
      + (on ? '<button data-gearui="unequip">はずす</button>' : '<button data-gearui="equip">そうび</button>')
      + '<button data-gearui="drop">すてる</button></div>';
  },
  gearUi(act) {
    const gear = this.save.gear;
    if (act === 'autotog') { this.save.autoEquip = !this.save.autoEquip; this.persist(); this.updateSoubi(); this.sfx.swap(); return; }
    if (act === 'best') {
      const ch = autoEquipBest(gear);
      this.persist(); this.updateTitle();
      if (this.game) { this.game.settings = this.save; this.game.refreshGear(); this.game.setOutfit(this.save.outfit, ch.length > 0); }
      const b = this.el('[data-gearui=best]');
      b.dataset.msg = ch.length ? `${ch.length}こ つけかえた！` : 'もう いちばん つよいよ！';
      b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
      this.sfx.swap(); if (ch.length) this.sfx.pickup?.();
      return;
    }
    const sel = gear.inv.find((g) => g.id === this.selGear);
    if (!sel) return;
    if (act === 'drop' && !this.dropArm) { this.dropArm = sel.id; this.el('[data-gearui=drop]').textContent = 'ほんとに すてる？'; return; }
    gearAction(gear, sel, act);
    if (act === 'drop') this.selGear = null;
    this.dropArm = null;
    this.persist(); this.updateTitle();
    if (this.game) { this.game.settings = this.save; this.game.refreshGear(); this.game.setOutfit(this.save.outfit, act === 'equip'); }
    this.sfx.swap();
  },
  // あそんでる ときに ひろった そうびの カード
  gearFound(item) {
    // じどう そうび: いまより つよい ときは カードを ださずに つける（ちいさい おしらせ）
    if (this.save.autoEquip) {
      const res = autoPickup(this.save.gear, item);
      if (res.ok) {
        this.persist(); this.updateTitle();
        if (this.game) { this.game.settings = this.save; this.game.refreshGear(); this.game.setOutfit(this.save.outfit, true); this.game.hud.kill(`${gearName(item)}を じどう そうび！`, true); }
        this.showAutoEq(item, res.replaced);
        this.sfx.swap();
        return;
      }
    }
    (this.gearQ ||= []).push(item);
    if (!this.gearCur) this.nextGearCard();
  },
  nextGearCard() {
    const item = this.gearQ.shift(); this.gearCur = item || null;
    const card = this.el('.zt-gcard');
    if (!item) { card.classList.add('hidden'); return; }
    const gear = this.save.gear, cur = gear.inv.find((g) => g.id === gear.eq[item.slot]) || null;
    const r = rarityOf(item.rarity);
    card.style.setProperty('--rc', r.color); card.dataset.r = item.rarity;
    this.el('.zt-gbody').innerHTML = gearCardHTML(item, cur, cur ? gear : null);
    const full = gear.inv.length >= INV_CAP;
    this.el('.zt-gfull').classList.toggle('hidden', !full);
    this.el('[data-gear=keep]').disabled = full;
    this.el('[data-gear=equip]').disabled = full && !cur;
    this.gearT = 9; this.gearT0 = 9;
    card.classList.remove('hidden', 'pop'); void card.offsetWidth; card.classList.add('pop');
  },
  resolveGear(act) {
    const item = this.gearCur; if (!item) return;
    const gear = this.save.gear;
    let res = gearAction(gear, item, act);
    if (!res.ok && act !== 'drop') {
      // かばんが いっぱい: いちばん よわい かばんの ものと いれかえ（あたらしい ほうが つよい ときだけ）
      const eqs = equippedItems(gear), bag = gear.inv.filter((g) => !eqs.includes(g));
      const worst = bag.sort((a, b) => gearScore(a) - gearScore(b))[0];
      if (worst && gearScore(worst) < gearScore(item)) { gearAction(gear, worst, 'drop'); res = gearAction(gear, item, act); }
    }
    this.persist(); this.updateTitle();
    if (this.game) {
      this.game.settings = this.save;
      if (act === 'equip' && res.ok) { this.game.refreshGear(); this.game.setOutfit(this.save.outfit, true); this.game.hud.kill(`${gearName(item)}を そうび！`, true); }
      else if (act === 'keep' && res.ok) this.game.hud.kill('かばんに しまった');
    }
    this.sfx.swap();
    this.nextGearCard();
  },
  showAutoEq(item, prev) {
    const el = this.el('.zt-autoeq'), r = rarityOf(item.rarity);
    el.style.setProperty('--rc', r.color);
    el.querySelector('i').outerHTML = gearIcon(item, ' big');
    el.querySelector('span').textContent = `${r.name} ${gearName(item)}${prev ? `（まえ: ${gearName(prev)} → かばん）` : ''}`;
    el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop');
    this.autoEqT = 2.6;
  },
  // まいフレーム: カードの じかん（きれたら しまう）
  tickGear(dt) {
    if (this.autoEqT > 0 && (this.autoEqT -= dt) <= 0) this.el('.zt-autoeq').classList.add('hidden');
    if (!this.gearCur) return;
    if (this.game && this.game.state === 'pause') return;
    this.gearT -= dt;
    this.el('.zt-gtime div').style.width = Math.max(0, this.gearT / this.gearT0 * 100).toFixed(1) + '%';
    if (this.gearT <= 0) this.resolveGear('keep');
  },
  flushGear() { while (this.gearCur) this.resolveGear('keep'); },

  applySens() {
    if (!this.input) return;
    const s = SENS[this.save.sens];
    this.input.lookScaleTouch = 0.0062 * s; this.input.lookScaleMouse = 0.0024 * s;
  },

  persist() { storage.set(SAVE_KEY, this.save); },

  bind() {
    this.onClick = (e) => {
      const b = e.target.closest('[data-ui],[data-opt],[data-stage],[data-map],[data-outfit],[data-gear],[data-gsel],[data-gearui]'); if (!b) return;
      this.sfx.unlock();
      if (b.dataset.gear) { if (!b.disabled) this.resolveGear(b.dataset.gear); return; }
      if (b.dataset.gsel !== undefined) { if (b.dataset.gsel) { this.selGear = b.dataset.gsel; this.dropArm = null; this.updateSoubi(); this.sfx.swap(); } return; }
      if (b.dataset.gearui) { this.gearUi(b.dataset.gearui); return; }
      if (b.dataset.outfit) {
        const id = b.dataset.outfit;
        if (!this.save.outfits.includes(id)) { this.sfx.empty?.(); return; }
        this.save.outfit = id; this.persist(); this.updateTitle();
        if (this.game) { this.game.settings = this.save; this.game.setOutfit(id, true); }
        this.sfx.swap();
        return;
      }
      if (b.dataset.map) {
        this.save.map = b.dataset.map; this.persist(); this.updateTitle();
        if (this.game) { this.game.settings = this.save; this.game.loadMap(this.nextMapId()); }
        this.sfx.swap();
        return;
      }
      if (b.dataset.stage) {
        this.save.stage = b.dataset.stage; this.persist(); this.updateTitle();
        if (this.game) { this.game.settings = this.save; this.game.applyStage(this.save.stage); }
        this.sfx.swap();
        return;
      }
      const opt = b.dataset.opt;
      if (opt) {
        const cyc = OPT_CYCLE[opt];
        this.save[opt] = cyc[(cyc.indexOf(this.save[opt]) + 1) % cyc.length];
        this.persist(); this.updateTitle(); this.applySens();
        if (this.game) this.game.settings = this.save;
        if (opt === 'quality') this.rebuild3D();
        if (opt === 'flashlight' && this.game) this.game.applyStage(this.save.stage);
        return;
      }
      const ui = b.dataset.ui;
      if (ui === 'start' || ui === 'retry') this.play(ui === 'retry');
      else if (ui === 'resume') this.resume();
      else if (ui === 'title') this.toTitle();
      else if (ui === 'hub') this.back();
      else if (ui === 'kigae') { this.updateKigae(); this.show('kigae'); this.sfx.swap(); }
      else if (ui === 'kback' || ui === 'sback') { this.show('title'); this.sfx.swap(); }
      else if (ui === 'soubi') { this.selGear = null; this.dropArm = null; this.updateSoubi(); this.show('soubi'); this.sfx.swap(); }
    };
    this.container.addEventListener('click', this.onClick);
    this.onKey = (e) => {
      if (!this.gearCur || !this.game || this.game.state !== 'play') return;
      const k = e.key.toLowerCase();
      if (k === 'e') { const b = this.el('[data-gear=equip]'); if (!b.disabled) this.resolveGear('equip'); }
      else if (k === 'g') this.resolveGear('drop');
    };
    window.addEventListener('keydown', this.onKey);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.onVis = () => { if (document.hidden && this.game && this.game.state === 'play') this.pause(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.onLock = () => {
      if (!document.pointerLockElement && this.game && this.game.state === 'play' && !this.input.usingTouch) this.pause();
    };
    document.addEventListener('pointerlockchange', this.onLock);
  },

  rebuild3D() {
    if (this.game) { this.game.dispose(); this.input.destroy(); }
    const c = this.canvas.cloneNode(); this.canvas.replaceWith(c); this.canvas = c;
    this.startGame3D();
  },

  show(which) {
    this.el('.zt-title').classList.toggle('hidden', which !== 'title');
    this.el('.zt-kigae').classList.toggle('hidden', which !== 'kigae');
    this.el('.zt-soubi').classList.toggle('hidden', which !== 'soubi');
    if (this.game) this.game.kigae = which === 'kigae' || which === 'soubi';
    if (which !== 'play' && which !== 'pause') this.flushGear?.();
    this.el('.zt-gcard').classList.toggle('zt-dim', which === 'pause');
    this.el('.zt-pausescr').classList.toggle('hidden', which !== 'pause');
    this.el('.zt-over').classList.toggle('hidden', which !== 'over');
    this.root.classList.toggle('zt-playing', which === 'play' || which === 'pause' || which === 'over');
    this.input && (this.input.enabled = which === 'play');
  },

  // つぎに あそぶ マップ（おまかせ なら じゅんばん）
  nextMapId() { return pickMapId(this.save.map, this.save.mapNext); },
  play(retry = false) {
    if (!this.game) return;
    this.flushGear();
    this.input.reset();
    if (!retry) this.game.loadMap(this.nextMapId());
    if (!retry && this.save.map === 'rotate') { this.save.mapNext = (this.save.mapNext + 1) % MAP_IDS.length; this.persist(); }
    this.game.startGame();
    this.show('play');
    if (!matchMedia('(pointer: coarse)').matches) this.canvas.requestPointerLock?.();
  },
  pause() {
    if (!this.game || this.game.state !== 'play') return;
    this.game.state = 'pause'; this.input.reset(); this.show('pause');
    if (document.pointerLockElement) document.exitPointerLock();
  },
  resume() {
    if (!this.game) return;
    this.game.state = 'play'; this.show('play'); this.last = performance.now();
    if (!this.input.usingTouch && !matchMedia('(pointer: coarse)').matches) this.canvas.requestPointerLock?.();
  },
  toTitle() {
    if (!this.game) return;
    if (document.pointerLockElement) document.exitPointerLock();
    this.game.setupTitle(); this.show('title'); this.updateTitle();
  },

  makeHud() {
    const q = (s) => this.el(s);
    const E = {
      hpBar: q('.zt-hpbar div'), hpNum: q('.zt-hp em'), wave: q('.zt-wave b'), left: q('.zt-wave span'), score: q('.zt-score b'),
      ammo: q('.zt-ammo b'), res: q('.zt-ammo span'), wname: q('.zt-wname'), cross: q('.zt-cross'), hitm: q('.zt-hitm'),
      boom: q('.zt-boom'), feed: q('.zt-feed'), banner: q('.zt-banner'), reload: q('.zt-reload'), reloadBar: q('.zt-reload div'), hurt: q('.zt-hurt'),
      slots: [...this.container.querySelectorAll('.zt-slot')],
      boss: q('.zt-boss'), bossName: q('.zt-boss b'), bossBar: q('.zt-bossbar div'),
      bot: q('.zt-bot'), botTxt: q('.zt-bot span'), botHp: q('.zt-bot .zt-bothp div'), botArrow: q('.zt-botarrow'), botArrowI: q('.zt-botarrow i'),
      botIcon: q('.zt-boticon'), botIconHp: q('.zt-boticon .zt-bothp div'),
      oji: q('.zt-oji'), ojiTxt: q('.zt-ojitxt'), ojiHp: q('.zt-ojihp div'), ojiArrow: q('.zt-ojiarrow'), ojiArrowI: q('.zt-ojiarrow i'), ojiArrowT: q('.zt-ojiarrow span'),
    };
    const last = {};
    const setText = (k, el, v) => { if (last[k] !== v) { last[k] = v; el.textContent = v; } };
    let feedN = 0;
    const app = this;
    return {
      show: (w) => app.show(w),
      set: (s) => {
        const hpp = Math.max(0, s.hp / s.maxHp);
        if (last.hp !== s.hp) { last.hp = s.hp; E.hpBar.style.width = (hpp * 100).toFixed(1) + '%'; E.hpBar.classList.toggle('low', hpp < 0.35); E.hpNum.textContent = s.hp; }
        setText('wave', E.wave, s.wave ? `ウェーブ ${s.wave}` : 'じゅんび');
        setText('left', E.left, `のこり ${s.left}`);
        setText('score', E.score, String(s.score));
        setText('ammo', E.ammo, String(s.ammo));
        setText('res', E.res, '/ ' + (s.reserve === Infinity ? '∞' : s.reserve));
        setText('wname', E.wname, WEAPONS[s.weapon].name);
        E.ammo.classList.toggle('low', s.ammo <= Math.ceil(s.mag * 0.25));
        if (last.weapon !== s.weapon) { last.weapon = s.weapon; for (const b of E.slots) b.classList.toggle('sel', b.dataset.w === s.weapon); }
        for (const b of E.slots) { const g = s.guns[b.dataset.w]; const e = g.ammo === 0 && !(g.reserve > 0); if (b._e !== e) { b._e = e; b.classList.toggle('empty', e); } }
        // クロスヘア（ばらつきに あわせて ひらく）
        const h = app.canvas.clientHeight || 375;
        const gap = Math.round(5 + (s.spread / Math.tan((s.fov * Math.PI / 180) / 2)) * (h / 2));
        if (last.gap !== gap) { last.gap = gap; E.cross.style.setProperty('--gap', gap + 'px'); }
        const rl = s.reloading >= 0;
        if (last.rl !== rl) { last.rl = rl; E.reload.classList.toggle('on', rl); }
        if (rl) E.reloadBar.style.width = (s.reloading * 100).toFixed(0) + '%';
      },
      bossBar: (b) => {
        const on = !!b;
        if (last.bossOn !== on) { last.bossOn = on; E.boss.classList.toggle('hidden', !on); }
        if (!b) return;
        setText('bossName', E.bossName, b.name);
        const w = (Math.max(0, b.hp) * 100).toFixed(1) + '%';
        if (last.bossW !== w) { last.bossW = w; E.bossBar.style.width = w; }
      },
      // v0.7.0: けいさつロボ（まだ: なまえ＋やじるし／なかま: あたまの うえの HP と うえの アイコン）
      robot: (r) => {
        const mode = !r ? 'none' : r.mode === 'idle' ? (r.onScreen ? 'idle' : 'arrow') : r.onScreen ? 'on' : 'off';
        if (last.botMode !== mode) {
          last.botMode = mode;
          E.bot.classList.toggle('hidden', mode !== 'idle' && mode !== 'on'); E.bot.dataset.m = mode;
          E.botArrow.classList.toggle('hidden', mode !== 'arrow');
          E.botIcon.classList.toggle('hidden', mode !== 'on' && mode !== 'off');
        }
        if (!r) return;
        const x = ((r.x + 1) * 50).toFixed(2) + '%', y = ((1 - r.y) * 50).toFixed(2) + '%';
        const el = mode === 'arrow' ? E.botArrow : E.bot;
        if (mode !== 'off') { el.style.left = x; el.style.top = mode === 'arrow' ? arrowTop(r.y) : y; }
        if (mode === 'arrow') E.botArrowI.style.transform = `rotate(${r.ang.toFixed(3)}rad)`;
        const w = (Math.max(0, r.hp) * 100).toFixed(0) + '%';
        if (last.botHp !== w) { last.botHp = w; for (const b of [E.botHp, E.botIconHp]) { b.style.width = w; b.classList.toggle('low', r.hp < 0.35); } }
      },
      // おじさんの ふきだし（がめんの なか）／やじるし（がめんの そと）
      oji: (o) => {
        const mode = !o ? 'none' : o.onScreen ? 'bubble' : 'arrow';
        if (last.ojiMode !== mode) {
          last.ojiMode = mode;
          E.oji.classList.toggle('hidden', mode !== 'bubble'); E.ojiArrow.classList.toggle('hidden', mode !== 'arrow');
        }
        if (!o) return;
        const x = ((o.x + 1) * 50).toFixed(2) + '%', y = ((1 - o.y) * 50).toFixed(2) + '%';
        const el = mode === 'bubble' ? E.oji : E.ojiArrow;
        el.style.left = x; el.style.top = mode === 'arrow' ? arrowTop(o.y) : y;
        if (last.ojiTxt !== o.text) { last.ojiTxt = o.text; E.ojiTxt.textContent = o.text; E.ojiArrowT.textContent = o.text; E.oji.dataset.st = o.state; E.ojiArrow.dataset.st = o.state; }
        const w = (Math.max(0, o.hp) * 100).toFixed(0) + '%';
        if (last.ojiHp !== w) { last.ojiHp = w; E.ojiHp.style.width = w; E.ojiHp.classList.toggle('low', o.hp < 0.35); }
        if (mode === 'arrow') E.ojiArrowI.style.transform = `rotate(${o.ang.toFixed(3)}rad)`;
      },
      // おじさんから ふくを もらった → セーブして すぐ きがえる
      gearFound: (item) => app.gearFound(item),
      gift: (id) => {
        const isNew = unlockOutfit(app.save, id);
        app.persist(); app.updateTitle();
        if (app.game) app.game.settings = app.save;
        return isNew;
      },
      crossTarget: (on) => { if (last.ct !== on) { last.ct = on; E.cross.classList.toggle('target', on); } },
      hitmarker: (head) => {
        E.hitm.classList.remove('on', 'head'); void E.hitm.offsetWidth; E.hitm.classList.add('on'); if (head) E.hitm.classList.add('head');
      },
      kill: (text, head) => {
        const d = document.createElement('div'); d.textContent = text; if (head) d.className = 'head';
        E.feed.prepend(d); feedN++;
        while (E.feed.children.length > 3) E.feed.lastChild.remove();
        setTimeout(() => d.remove(), 1600);
      },
      banner: (a, b) => {
        E.banner.querySelector('b').textContent = a; E.banner.querySelector('span').textContent = b || '';
        E.banner.classList.remove('on'); void E.banner.offsetWidth; E.banner.classList.add('on');
      },
      boom: (k) => {
        E.boom.style.setProperty('--k', k.toFixed(2));
        E.boom.classList.remove('on'); void E.boom.offsetWidth; E.boom.classList.add('on');
      },
      hurt: (ang) => { E.hurt.classList.remove('on'); void E.hurt.offsetWidth; E.hurt.classList.add('on'); },
      pause: () => app.pause(),
      over: (r) => {
        const best = r.wave > app.save.bestWave || r.score > app.save.bestScore;
        app.save.bestWave = Math.max(app.save.bestWave, r.wave); app.save.bestScore = Math.max(app.save.bestScore, r.score); app.persist();
        app.el('.zt-res').innerHTML = `<div>ウェーブ <b>${r.wave}</b></div><div>スコア <b>${r.score}</b></div><div>たおした ゾンビ <b>${r.kills}</b>（ヘッドショット ${r.heads}）</div>${best ? '<div class="zt-new">しんきろく！</div>' : ''}`;
        if (document.pointerLockElement) document.exitPointerLock();
        setTimeout(() => app.alive && app.game && app.game.state === 'over' && app.show('over'), 900);
        app.input.reset(); app.input.enabled = false;
      },
    };
  },

  onResize() {
    if (!this.game) return;
    const w = this.root.clientWidth || window.innerWidth, h = this.root.clientHeight || window.innerHeight;
    this.game.resize(w, h);
  },

  loop(now) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    const frameMs = now - this.last;
    const dt = Math.min(1 / 30, Math.max(0, frameMs / 1000));
    this.last = now;
    if (!this.game) return;
    const t0 = performance.now();
    const inp = this.input.read();
    this.game.update(dt, inp);
    this.tickGear(dt);
    this.game.render();
    const cpu = performance.now() - t0;
    const st = this.game.stats;
    st.frames++; st.cpu += cpu; st.frameSum = (st.frameSum || 0) + frameMs;
    if (this.game.state === 'play') this.game.adaptQuality(frameMs);
  },

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.container.removeEventListener('click', this.onClick);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    document.removeEventListener('pointerlockchange', this.onLock);
    window.removeEventListener('keydown', this.onKey);
    if (this.input) this.input.destroy();
    if (this.game) this.game.dispose();
    this.sfx.close();
    this.game = null; window.__ztps = null;
  },

  back() {
    this.destroy();
    this.onBackToHub?.();
  },
};
