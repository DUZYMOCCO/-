/**
 * ゾンビストライク（Zombie TPS）— かたごし カメラの シューティング
 * ハブが prepare()（CSS）→ init(container, onBackToHub) の じゅんに よぶ。
 */
import { loadCss } from '../../common/js/load-css.js';
import { storage } from '../../common/js/storage.js';
import { WEAPONS, WEAPON_ORDER, normalizeSave, SENS, VERSION, OUTFITS, outfitName, unlockOutfit,
  GEAR_SLOTS, GEAR_STATS, GEAR_STAT_IDS, INV_CAP, rarityOf, gearColor, gearName, gearScore, gearAction, gearEffects, equippedItems,
  autoEquipBest, equipGain, autoPickup, bestLoadout, pickMapId, MAP_IDS,
  UPGRADE, upgradeCost, upgradedWeapon, weaponLevel, buyUpgrade, earnBank, gearRefund, discardGear, isWorn, needsDropConfirm, weakestLoose,
  SLOT_UP, HP_UP, slotLevel, hpLevel, slotUpCost, hpUpCost, baseHpAt, slotBonus, buySlotUpgrade, buyHpUpgrade, GEAR_SLOT_IDS,
  SUIT_ORDER, SUIT_WEAPONS, suitLabel, SUIT,
  MELEE, MELEE_ORDER, MELEE_UP, meleeLevel, meleeUpCost, meleeStats, buyMelee, isMelee, DEFAULT_MELEE,
  LOADOUT_SIZE, normalizeLoadout, toggleLoadout, loadoutReady, unlockedWeapons, upgradeRows, GAUGE_LABEL } from './rules.js?v=31';
import { MAPS, mapInfo, registerMap, hasMap } from './map.js?v=31';
import { recordGkClear } from './rules.js?v=31';
import { GK_CATALOG, GK_WORLDS, GK_READY, isGkReady, gkMeta, gkNext, gkLoadStage, gkLoadMap, gkLoadSegs, gkLoadGims, gkLoadBoss, gkWaves, gkClearBonus } from './gk/core.js?v=31';
import { segResume } from './gk/seg.js?v=31';

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
const PART = { head: 'あたま', body: 'からだ', feet: 'あし', arm: 'うで' };
function totalsText(gear, save) {
  const t = gearEffects(gear, save).totals;
  const parts = GEAR_STAT_IDS.filter((k) => t[k]).map((k) => `${GEAR_STATS[k].name} +${t[k]}${GEAR_STATS[k].unit}${t[k] >= GEAR_STATS[k].cap ? '（MAX）' : ''}`);
  return parts.length ? parts.join(' ・ ') : 'まだ なにも つけて いないよ';
}
import { Game } from './game.js?v=31';
import { Input } from './input.js?v=31';
import { Sfx } from './sfx.js?v=31';

// v0.7.0: ぶきの ちいさい アイコン（かくうの シルエット）
const svgI = (d) => `<svg viewBox="0 0 32 16" aria-hidden="true">${d}</svg>`;
const WEAPON_ICONS = {
  rifle: svgI('<path d="M0 5h4v6l-3 1zM4 5h20v4H4zM24 6h8v2h-8zM9 9h3l-1 5H9zM14 9h3v5h-2z"/>'),
  pistol: svgI('<path d="M7 4h18v4H7zM8 8h5l-1 7H8zM25 5h2v2h-2z"/>'),
  shotgun: svgI('<path d="M0 6l7-1v4l-6 2zM7 5h25v2.5H7zM17 8h9v2.5h-9zM8 8h3v4H8z"/>'),
  rocket: svgI('<path d="M1 5h25v5H1zM26 4l6 3.5-6 3.5zM12 10h3v5h-3zM8 2h4v3H8z"/>'),
  magnum: svgI('<path d="M12 4h19v3.2H12zM7 3h6v6H7zM10 5.5h7v4.5h-7zM4 1h3v2H4zM5 8.5h5l-2 6.5H3zM11 10h3l-1.5 2h-2z"/>'),
  minigun: svgI('<path d="M2 3h11v10H2zM5 0h6v3H5zM13 3.5h19v2H13zM13 7h19v2H13zM13 10.5h19v2H13z"/>'),
  sniper: svgI('<path d="M0 7l6-1v4l-5 1zM6 6h10v3H6zM16 7h16v1.4H16zM8 2h9v2.6H8zM10 4.6h1.5V6H10zM14 4.6h1.5V6H14zM9 9h2.5l-1 4H9z"/>'),
  mlauncher: svgI('<path d="M3 3h19v9H3zM22 3.5h3v2.4h-3zM22 6.6h3v2.4h-3zM22 9.6h3v2.4h-3zM27 6.2h4l1 1.3-1 1.3h-4zM9 12h3v4H9zM14 1h5v2h-5z"/>'),
  // v0.15.0
  laser: svgI('<path d="M1 5h4v5H1zM5 4h15v5H5zM20 5.5h5v2h-5zM26 6h6v1H26zM9 9h3l-1 5H9z"/>'),
  flamer: svgI('<path d="M1 4h4v5H1zM5 4h14v4H5zM19 4.8h5v2.4h-5zM24 3.5h2v5h-2zM7 8h9v5H7zM27 4c2 .5 4 1.5 5 2.5-1 1-3 2-5 2.5z"/>'),
  beam: svgI('<path d="M1 3h5v8H1zM6 2h14v9H6zM20 3h2v7h-2zM23 3h2v7h-2zM26 5h6v3h-6zM10 11h3l-1 4h-2z"/>'),
  smoke: svgI('<path d="M11 6h7v10h-7zM12 4h5v2h-5zM17 3h3v4h-1V5h-2zM20 3c3-3 7-2 9 0 3 1 3 5 0 6-1 2-5 2-7 0z"/>'),
};
// v0.13.0: なぐる ぶきの アイコン（かくうの デザイン）
const MELEE_ICONS = {
  bat: svgI('<path d="M1 7h11v2H1zM12 6.2l18-2.4v8.4L12 9.8z"/><path d="M17 2.6h1.4v3H17zM22 1.8h1.4v3H22zM27 1h1.4v3H27zM19.5 11h1.4v3h-1.4zM25 11.6h1.4v3H25z"/>'),
  hammer: svgI('<path d="M1 7h20v2.2H1zM20 1h8v14h-8z"/>'),
  katana: svgI('<path d="M1 6.4h8v3.2H1zM9 3.5h2v9H9zM11 6.9h16.5l3.5 1.1-3.5 1.1H11z"/>'),
};
const MELEE_NOTE = { bat: 'くぎで じわじわ ダメージ', hammer: 'じめん ドーン！ まわりも ころぶ', katana: '3れんぞく！ 3かいめ つよい' };
// v0.8.0: つよく する がめんの ことば
const UP_ROWS = [
  { k: 'dmg', name: 'いりょく', fmt: (w) => String(w.dmg * (w.pellets || 1)) },
  { k: 'rpm', name: 'はやさ', fmt: (w) => (w.rpm / 60).toFixed(w.rpm < 120 ? 2 : 1) + ' /びょう' },
  { k: 'mag', name: 'たまの かず', fmt: (w) => String(w.mag) },
];

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
    return loadCss(new URL('../css/zombie-tps.css?v=31', import.meta.url).href);
  },

  init(container, onBackToHub) {
    this.container = container; this.onBackToHub = onBackToHub;
    this.save = normalizeSave(storage.get(SAVE_KEY, null));
    this.alive = true;
    this.buildDOM(); this.updateMeleeBtn();
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
    // v0.15.0: もっていく 3つ だけ（なかみは renderSlots で いれかわる）
    const slots = Array.from({ length: LOADOUT_SIZE }, (_, i) => `<button class="zt-slot" data-act="ws:${i}" data-i="${i}"><span class="zt-chip"><b>${i + 1}</b><i class="zt-sico"></i><u class="zt-sg"><s></s></u></span></button>`).join('');
    // v0.10.0: パワードスーツの ぶき（おおきめ の ボタン 58×46）
    const sbtns = SUIT_ORDER.map((id, i) => `<button class="zt-sbtn" data-act="w:${id}" data-s="${id}" aria-label="${SUIT_WEAPONS[id].name}"><b>${i + 1}</b><i>${SUIT_WEAPONS[id].icon}</i><span>${SUIT_WEAPONS[id].short}</span><em><u></u></em></button>`).join('');
    this.container.innerHTML = `
    <div class="zt-root">
      <canvas class="zt-canvas"></canvas>
      <div class="zt-hurt"></div>
      <div class="zt-boom"></div>
      <div class="zt-touch">
        <div class="zt-stick"><div class="zt-knob"></div></div>
        <div class="zt-hud">
            <div class="zt-scope"><div class="zt-scopering"></div><i class="h"></i><i class="v"></i><em></em></div>
          <div class="zt-top">
            <button class="zt-pause" data-act="pause">Ⅱ</button>
            <div class="zt-hp"><span>HP</span><div class="zt-hpbar"><div></div></div><em>100</em></div>
            <div class="zt-boticons"><div class="zt-boticon zt-police hidden"><b>けいさつ<i class="zt-botlv">Lv1</i></b><div class="zt-bothp"><div></div></div></div><div class="zt-boticon zt-army hidden"><b>アーミー<i class="zt-botlv">Lv1</i></b><div class="zt-bothp"><div></div></div></div></div>
            <div class="zt-wave"><b>ウェーブ 1</b><span>のこり 0</span></div>
            <div class="zt-score">スコア <b>0</b></div>
          </div>
          <div class="zt-slots">${slots}</div>
          <div class="zt-suitbar">${sbtns}</div>
          <div class="zt-tankbar"><button class="zt-sbtn" data-act="w:tankmg" data-tank="mg"><b>1</b><i>🔫</i><span>マシンガン</span></button><button class="zt-sbtn" data-act="w:tankcannon" data-tank="cannon"><b>2</b><i>💥</i><span>しゅほう</span></button></div>
          <div class="zt-tanktime"><b></b><div class="zt-suittbar"><div></div></div></div>
          <div class="zt-tanktag hidden"><span>せんしゃ・さわってね</span></div>
          <div class="zt-tankarrow hidden"><i>➤</i><span>せんしゃ</span></div>
          <div class="zt-suittime"><b>${suitLabel(SUIT.time)}</b><div class="zt-suittbar"><div></div></div></div>
          <div class="zt-suittag hidden"><span>パワードスーツ・さわってね</span></div>
          <div class="zt-suitarrow hidden"><i>➤</i><span>パワードスーツ</span></div>
          <div class="zt-cross"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><em></em></div>
          <div class="zt-hitm"></div>
          <div class="zt-reload"><div></div><span>リロード</span></div>
          <div class="zt-boss hidden"><b>ボスゾンビ</b><div class="zt-bossbar"><div></div></div></div>
          <div class="zt-feed"></div>
          <div class="zt-banner"><b></b><span></span></div>
          <div class="zt-oji hidden"><div class="zt-ojitxt">たすけて！</div><div class="zt-ojihp"><div></div></div></div>
          <div class="zt-ojiarrow hidden"><i>➤</i><span>たすけて！</span></div>
          <div class="zt-bot zt-police hidden"><em class="zt-botsay"></em><span>けいさつロボ・さわってね</span><em class="zt-lvup">Lv UP!</em><div class="zt-botrow"><i class="zt-botlv">Lv1</i><div class="zt-bothp"><div></div></div></div></div>
          <div class="zt-cop hidden"><span>けいさつおじさん</span><div class="zt-bothp"><div></div></div></div>
          <div class="zt-botarrow zt-police hidden"><i>➤</i><span>けいさつロボ</span></div>
          <div class="zt-bot zt-army hidden"><em class="zt-botsay"></em><span>アーミーロボ・さわってね</span><em class="zt-lvup">Lv UP!</em><div class="zt-botrow"><i class="zt-botlv">Lv1</i><div class="zt-bothp"><div></div></div></div></div>
          <div class="zt-botarrow zt-army hidden"><i>➤</i><span>アーミーロボ</span></div>
          <div class="zt-drunk hidden"><em class="zt-hic"></em><span>よっぱらいおじさん</span><div class="zt-bothp"><div></div></div></div>
          <div class="zt-bot zt-guest zt-ao hidden"><span>アオ・さわってね</span><div class="zt-bothp"><div></div></div></div>
          <div class="zt-botarrow zt-guest zt-ao hidden"><i>➤</i><span>アオ</span></div>
          <div class="zt-bot zt-guest zt-momo hidden"><span>モモ・さわってね</span><div class="zt-bothp"><div></div></div></div>
          <div class="zt-botarrow zt-guest zt-momo hidden"><i>➤</i><span>モモ</span></div>
          <div class="zt-ammo"><div class="zt-wname"></div><div class="zt-anum"><b>30</b><span>/ 210</span></div><div class="zt-gauge hidden"><em></em><div><i></i></div></div></div>
          <button class="zt-btn zt-fire" data-act="fire"><span>うつ</span></button>
          <button class="zt-btn zt-aim" data-act="aim"><span>ねらう</span></button>
          <button class="zt-btn zt-rl" data-act="reload"><span>リロード</span></button>
          <button class="zt-btn zt-jump" data-act="jump"><span>ジャンプ</span></button>
          <button class="zt-btn zt-melee" data-act="melee" aria-label="なぐる"><i class="zt-mico"></i><i class="zt-mfist">👊</i><span class="zt-mlbl">なぐる</span><span class="zt-mlbl2">パンチ</span></button>
          <div class="zt-keyhint">WASD いどう ・ マウス ねらう ・ ひだりクリック うつ ・ みぎクリック ねらう ・ R リロード ・ V なぐる ・ スペース ジャンプ ・ 1〜3 ぶき ・ Q つぎの ぶき ・ ESC ポーズ</div>
        </div>
      </div>

      <div class="zt-screen zt-title">
        <!-- v0.16.0: ステージ せんたく（タブ ＝ まとまり・おおきい カード）。ステージが ふえても タブと カードが ふえる だけ -->
        <div class="zt-sel">
          <div class="zt-selhead">
            <h1>ゾンビ<br>ストライク</h1>
            <div class="zt-tabs">${[{ id: 'zs', tab: 'ゾンビ ストライク' }, ...GK_WORLDS].map((g) => `<button data-tab="${g.id}">${g.tab}</button>`).join('')}</div>
          </div>
          <div class="zt-selinfo"><span class="zt-sub"></span><div class="zt-stages"><button data-stage="day">☁️ ひるから</button><button data-stage="night">🌙 よるから</button></div></div>
          <div class="zt-cards"></div>
          <div class="zt-selfoot">
            <button class="zt-fbtn zt-kigaebtn" data-ui="kigae">👕 きがえ<b></b></button>
            <button class="zt-fbtn zt-soubibtn" data-ui="soubi">🛡 そうび<b></b></button>
            <button class="zt-fbtn zt-upbtn" data-ui="upg">🔧 つよく する<b></b></button>
            <button class="zt-fbtn zt-optbtn" data-ui="opts">⚙ せってい<b></b></button>
            <button class="zt-fbtn zt-hubbtn" data-ui="hub">← こうぼう<b></b></button>
          </div>
          <div class="zt-title-err"></div>
        </div>
        <div class="zt-optpanel hidden">
          <div class="zt-panel zt-optbox">
            <h2>せってい</h2>
            <div class="zt-opts">
              <button data-opt="autoFire">オートうち <b></b></button>
              <button data-opt="sens">かんど <b></b></button>
              <button data-opt="quality">がしつ <b></b></button>
              <button data-opt="flashlight">ライト <b></b></button>
            </div>
            <div class="zt-help">
              <div><b>ひだり</b> ゆびで いどう ・ <b>みぎ</b> ドラッグで ねらう</div>
              <div><b>うつ</b> おしたまま れんしゃ ・ <b>あたま</b>を うつと ヘッドショット！</div>
              <div><b>ロケット</b>で まとめて ふっとばせ ・ <b>けむり</b>で ゾンビが みうしなう</div>
              <div><b>ガンキック</b>の ステージは へやの てきを ぜんぶ たおすと ドアが ひらくよ</div>
            </div>
            <div class="zt-best"></div>
            <div class="zt-ver">v${VERSION}</div>
            <button class="zt-big" data-ui="optclose">とじる</button>
          </div>
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

      <div class="zt-screen zt-upg hidden">
        <div class="zt-kbox zt-ubox">
          <div class="zt-uhrow"><button class="zt-small" data-ui="uback">← もどる</button><h2>つよく する</h2><div class="zt-ubank">つかえる スコア <b>0</b></div></div>
          <div class="zt-utabs"></div>
          <div class="zt-udet"></div>
          <div class="zt-uhint">あそんで あつめた スコアで つよく できるよ（さいこう スコアは へらないよ）</div>
        </div>
      </div>

      <div class="zt-screen zt-loadout hidden">
        <div class="zt-lbox">
          <div class="zt-lhead"><button class="zt-small" data-ui="lback">← もどる</button><h2>もっていく ぶきを 3つ えらんでね</h2></div>
          <div class="zt-lcards"></div>
          <div class="zt-lfoot"><div class="zt-lpick"></div><button class="zt-big zt-lgo" data-ui="lgo">これで しゅつげき！</button></div>
        </div>
      </div>

      <div class="zt-refund hidden"></div>
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
          <button class="zt-small" data-ui="title">ステージ せんたく</button>
        </div>
      </div>

      <div class="zt-screen zt-over hidden">
        <div class="zt-panel">
          <h2>やられた…</h2>
          <div class="zt-res"></div>
          <div class="zt-overbtns">
            <button class="zt-big zt-cpbtn hidden" data-ui="cpretry">ドアの まえから</button>
            <button class="zt-big zt-retrybtn" data-ui="retry">もういちど</button>
          </div>
          <button class="zt-small" data-ui="title">ステージ せんたく</button>
        </div>
      </div>

      <div class="zt-screen zt-clear hidden">
        <div class="zt-panel">
          <h2>ステージ クリア！</h2>
          <div class="zt-cres"></div>
          <div class="zt-overbtns">
            <button class="zt-big zt-nextbtn" data-ui="gknext">つぎの ステージへ</button>
            <button class="zt-big zt-small2" data-ui="gkagain">もういちど</button>
          </div>
          <button class="zt-small" data-ui="title">ステージ せんたく</button>
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
    this.updateCards();
    this.el('.zt-kigaebtn b').textContent = outfitName(this.save.outfit);
    this.el('.zt-soubibtn b').textContent = `${this.save.gear.inv.length} / ${INV_CAP}`;
    this.el('.zt-upbtn b').textContent = `スコア ${this.save.bank}`;
    this.updateKigae();
    this.updateSoubi();
    this.updateUpg();
    this.el('.zt-best').textContent = this.save.bestWave ? `さいこう ウェーブ ${this.save.bestWave} ・ スコア ${this.save.bestScore}` : '';
  },

  // v0.16.0: ステージ せんたくの カード（えらんだ タブの ぶん だけ つくる）
  updateCards() {
    const tab = this.save.tab === 'zs' || GK_WORLDS.some((w) => w.id === this.save.tab) ? this.save.tab : 'zs';
    for (const b of this.container.querySelectorAll('[data-tab]')) b.classList.toggle('sel', b.dataset.tab === tab);
    const zs = tab === 'zs';
    this.el('.zt-stages').classList.toggle('hidden', !zs);
    let html = '';
    if (zs) {
      html = ['rotate', ...MAP_IDS].map((id) => {
        const m = id === 'rotate' ? { icon: '🔀', name: 'おまかせ', desc: 'まいかい ちがう マップ' } : mapInfo(id);
        return `<button class="zt-card${this.save.map === id ? ' sel' : ''}" data-map="${id}"><i>${m.icon}</i><b>${m.name}</b><span>${m.desc}</span></button>`;
      }).join('');
      this.el('.zt-sub').textContent = 'ウェーブを たえぬけ！ ひる → ゆうやけ → よる';
    } else {
      const w = GK_WORLDS.find((x) => x.id === tab), g = this.save.gk || { clear: [], best: {} };
      html = w.stages.map((no) => {
        const m = gkMeta(no), ok = isGkReady(no), cl = g.clear.includes(no);
        return `<button class="zt-card zt-gkcard${ok ? '' : ' locked'}${cl ? ' cleared' : ''}" data-gk="${no}"><em>ステージ ${no}</em><i>${ok ? m.icon : '🔒'}</i><b>${m.sub}</b>`
          + `<span>${ok ? m.desc : 'じゅんびちゅう'}</span>${cl ? `<u>クリア ${g.best[no] ? '・ ' + g.best[no] : ''}</u>` : ''}</button>`;
      }).join('');
      this.el('.zt-sub').textContent = `ガンキック ${w.name}`;
    }
    const box = this.el('.zt-cards');
    if (box.dataset.tab !== tab) { box.dataset.tab = tab; box.scrollLeft = 0; }
    box.innerHTML = html;
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

  // v0.8.0: つよく する がめん。ぶき 6つ ＋ ぶい 4つ（あたま・からだ・あし・うで）＋ たいりょく。レベルは セーブに のこる（そうびを かえても すてても へらない）
  updateUpg() {
    const save = this.save, id = this.upSel || (this.upSel = 'rifle');
    this.el('.zt-ubank b').textContent = String(save.bank);
    const tab = (key, icon, lv, label) => `<button class="zt-utab${key === id ? ' sel' : ''}" data-upw="${key}" aria-label="${label}"><span class="zt-chip">${icon}</span><em>Lv${lv}</em></button>`;
    this.el('.zt-utabs').innerHTML = `<div class="zt-utrow"><span class="zt-utl">ぶき</span>${WEAPON_ORDER.map((k) => tab(k, WEAPON_ICONS[k], weaponLevel(save, k), WEAPONS[k].name)).join('')}</div>`
      + `<div class="zt-utrow"><span class="zt-utl">からだ</span>${GEAR_SLOTS.map((g) => tab('slot:' + g.id, `<i class="zt-uico">${g.icon}</i>`, slotLevel(save, g.id), PART[g.id])).join('')}`
      + `${tab('hp', '<i class="zt-uico">❤️</i>', hpLevel(save), 'たいりょく')}</div>`
      + `<div class="zt-utrow"><span class="zt-utl">なぐる</span>${MELEE_ORDER.map((k) => tab('melee:' + k, MELEE_ICONS[k], meleeLevel(save, k), MELEE[k].name).replace('class="zt-utab', `class="zt-utab${save.melee === k ? ' using' : ''}`)).join('')}</div>`;
    let lv, max, cost, title, rows = [], note = '';
    const row = (name, a, b) => ({ name, a, b });
    if (id === 'hp') {
      lv = hpLevel(save); max = lv >= HP_UP.max; cost = hpUpCost(lv);
      const gearHp = gearEffects(save.gear, save).totals.hp;
      title = `<b>たいりょく</b><span>たいりょく Lv${lv} / ${HP_UP.max}${max ? '（MAX）' : ` → Lv${lv + 1}`}</span>`;
      rows.push(row('きほんの HP', String(baseHpAt(lv)), String(baseHpAt(lv + 1))));
      rows.push(row('ぜんぶの HP', String(baseHpAt(lv) + gearHp), String(baseHpAt(lv + 1) + gearHp)));
      note = gearHp ? `そうびの HP +${gearHp} も たしてるよ` : '';
    } else if (id.startsWith('slot:')) {
      const sl = id.slice(5), info = GEAR_SLOTS.find((g) => g.id === sl);
      lv = slotLevel(save, sl); max = lv >= SLOT_UP.max; cost = slotUpCost(sl, lv);
      title = `<b>${PART[sl]} Lv${lv}</b><span>（${info.name}）${max ? 'MAX' : `→ Lv${lv + 1}`}</span>`;
      const a = slotBonus(sl, lv), b = slotBonus(sl, lv + 1);
      for (const k of Object.keys(SLOT_UP.per[sl])) rows.push(row(GEAR_STATS[k].name, `+${a[k]}${GEAR_STATS[k].unit}`, `+${b[k]}${GEAR_STATS[k].unit}`));
      note = save.gear.eq[sl] ? 'どの そうびを つけても きくよ（すてても へらない）' : `${info.name}を つけると きくよ`;
    } else if (id.startsWith('melee:')) { // v0.13.0: なぐる ぶき（じゅうより やすい）
      const mid = id.slice(6), M = MELEE[mid];
      lv = meleeLevel(save, mid); max = lv >= MELEE_UP.max; cost = meleeUpCost(mid, lv);
      title = `<b>${M.name}</b><span>レベル ${lv} / ${MELEE_UP.max}${max ? '（MAX）' : ` → ${lv + 1}`}</span>`;
      const a = meleeStats(mid, lv), b = meleeStats(mid, Math.min(MELEE_UP.max, lv + 1));
      const dm = (w) => w.combo > 1 ? `${w.dmg}×${w.combo}` : String(w.dmg);
      rows.push(row('いりょく', dm(a), dm(b)), row('はやさ', (1 / a.dur).toFixed(1) + ' /びょう', (1 / b.dur).toFixed(1) + ' /びょう'), row('ふっとばし', a.knock.toFixed(1), b.knock.toFixed(1)));
      const using = save.melee === mid;
      note = `<span class="zt-mnote">${MELEE_NOTE[mid]}</span><button class="zt-msel${using ? ' sel' : ''}" data-msel="${mid}" ${using ? 'disabled' : ''}>${using ? 'つかってる' : 'これで なぐる'}</button>`;
    } else {
      lv = weaponLevel(save, id); max = lv >= UPGRADE.max; cost = upgradeCost(id, lv);
      title = `<b>${WEAPONS[id].name}</b><span>レベル ${lv} / ${UPGRADE.max}${max ? '（MAX）' : ` → ${lv + 1}`}</span>`;
      const now = upgradedWeapon(id, lv), nxt = upgradedWeapon(id, Math.min(UPGRADE.max, lv + 1));
      const ra = upgradeRows(now), rb = upgradeRows(nxt);
      rows = ra.map((r, i) => row(r.name, r.v, rb[i].v)); // v0.15.0: ぶきの しゅるいで かわる
    }
    const rowsH = rows.map((r) => `<div class="zt-urow"><span>${r.name}</span><b>${r.a}</b>${max ? '' : `<i>→</i><b class="${r.a !== r.b ? 'up' : ''}">${r.b}</b>`}</div>`).join('');
    const can = !max && save.bank >= cost;
    const btn = max ? '<button class="zt-ubuy max" disabled>さいこう レベル！</button>'
      : `<button class="zt-ubuy" data-upbuy="${id}" ${can ? '' : 'disabled'}>つよく する<small>${cost} スコア</small></button>`;
    const need = !max && !can ? `<div class="zt-uneed">あと ${cost - save.bank} スコア たりないよ</div>` : '';
    this.el('.zt-udet').innerHTML = `<div class="zt-uhead">${title}</div><div class="zt-urows">${rowsH}</div>`
      + `<div class="zt-ubrow">${btn}${need}${note ? `<div class="zt-unote">${note}</div>` : ''}</div>`;
  },
  upgUi(id) {
    const r = id === 'hp' ? buyHpUpgrade(this.save) : id.startsWith('melee:') ? buyMelee(this.save, id.slice(6)) : id.startsWith('slot:') ? buySlotUpgrade(this.save, id.slice(5)) : buyUpgrade(this.save, id);
    if (!r.ok) { this.sfx.empty?.(); return; }
    this.persist(); this.updateTitle();
    if (this.game) { this.game.settings = this.save; this.game.applyUpgrades(); }
    const b = this.el('.zt-ubox h2'); b.dataset.msg = `レベル ${r.lv} に なった！`;
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    this.sfx.pickup?.(); this.sfx.swap();
  },
  // v0.13.0: なぐる ボタンの アイコン ＝ えらんだ ぶき
  updateMeleeBtn() {
    const el = this.container && this.container.querySelector('.zt-mico'); if (!el) return;
    const id = isMelee(this.save.melee) ? this.save.melee : DEFAULT_MELEE;
    el.innerHTML = MELEE_ICONS[id]; el.parentElement.dataset.w = id;
  },
  // すてて スコアが もどった（ちいさい おしらせ）
  refundToast(n) {
    if (!(n > 0)) return;
    const el = this.el('.zt-refund');
    el.textContent = `+${n} スコア`;
    el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(this.refundTm); this.refundTm = setTimeout(() => el.classList.add('hidden'), 1800);
    if (this.game && this.game.state === 'play') this.game.hud.kill(`すてた → +${n} スコア`);
  },

  // そうび がめん: ぶい・ごうけい・かばん・えらんだ ものの くわしく
  updateSoubi() {
    const gear = this.save.gear, eqs = equippedItems(gear);
    if (this.selGear && !gear.inv.some((g) => g.id === this.selGear)) this.selGear = null;
    this.el('.zt-sslots').innerHTML = GEAR_SLOTS.map((s, i) => {
      const g = eqs[i];
      const lv = slotLevel(this.save, s.id);
      return `<button class="zt-sslot${g && g.id === this.selGear ? ' sel' : ''}" ${g ? `data-gsel="${g.id}"` : 'data-gsel=""'}>${gearIcon(g)}<span>${s.name}${lv > 1 ? `<em class="zt-slv">${PART[s.id]} Lv${lv}</em>` : ''}</span></button>`;
    }).join('');
    this.el('.zt-stot').textContent = totalsText(gear, this.save);
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
      + (on ? '<div class="zt-snodrop">つけている ものは すてられないよ</div>' : `<button data-gearui="drop">すてる<small>+${gearRefund(sel)} スコア</small></button>`) + '</div>';
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
    if (act === 'drop') {
      if (isWorn(gear, sel)) return; // つけている ものは すてない
      // でんせつは 2かい きく（ほんとに？ → でんせつ だよ！）
      const steps = needsDropConfirm(sel) ? 2 : 1;
      this.dropN = this.dropArm === sel.id ? (this.dropN || 0) + 1 : 1; this.dropArm = sel.id;
      if (this.dropN <= steps) {
        const b = this.el('[data-gearui=drop]');
        b.innerHTML = this.dropN === 1 ? `ほんとに すてる？<small>+${gearRefund(sel)} スコア</small>` : 'でんせつ だよ！ ほんとに すてる？';
        b.classList.toggle('warn', this.dropN === 2);
        return;
      }
      const r = discardGear(this.save, sel);
      this.selGear = null; this.dropArm = null; this.dropN = 0;
      this.persist(); this.updateTitle();
      if (this.game) { this.game.settings = this.save; this.game.refreshGear(); this.game.setOutfit(this.save.outfit, false); }
      if (r.ok) this.refundToast(r.refund);
      this.sfx.swap();
      return;
    }
    gearAction(gear, sel, act);
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
      if (res.ok && res.dropped) { const n = gearRefund(res.dropped); earnBank(this.save, n); this.refundToast(n); }
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
    this.gearDropN = 0;
    const db = this.el('[data-gear=drop]'); db.classList.remove('warn');
    db.innerHTML = `すてる<small>+${gearRefund(item)}</small>`;
    this.gearT = 9; this.gearT0 = 9;
    card.classList.remove('hidden', 'pop'); void card.offsetWidth; card.classList.add('pop');
  },
  resolveGear(act, timeout = false) {
    const item = this.gearCur; if (!item) return;
    const gear = this.save.gear;
    // でんせつを すてる ときは もういちど きく
    if (act === 'drop' && !timeout && needsDropConfirm(item) && !this.gearDropN) {
      this.gearDropN = 1;
      const db = this.el('[data-gear=drop]'); db.classList.add('warn'); db.textContent = 'でんせつ だよ！ ほんとに？';
      this.gearT = Math.max(this.gearT, 4);
      return;
    }
    let res = act === 'drop' ? { ok: true } : gearAction(gear, item, act);
    let refund = 0;
    if (act === 'drop') refund += gearRefund(item); // ひろわずに すてた → スコア
    if (!res.ok && act !== 'drop') {
      // かばんが いっぱい: いちばん よわい かばんの ものと いれかえ（あたらしい ほうが つよい ときだけ）。すてた ぶんは スコアに
      const worst = weakestLoose(gear, item);
      if (worst && gearScore(worst) < gearScore(item)) { const r = discardGear(this.save, worst); if (r.ok) refund += r.refund; res = gearAction(gear, item, act); }
    }
    if (act === 'drop') earnBank(this.save, refund);
    if (refund) this.refundToast(refund);
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
    if (this.gearT <= 0) this.resolveGear('keep', true);
  },
  flushGear() { while (this.gearCur) this.resolveGear('keep', true); },

  applySens() {
    if (!this.input) return;
    const s = SENS[this.save.sens];
    this.input.lookScaleTouch = 0.0062 * s; this.input.lookScaleMouse = 0.0024 * s;
  },

  persist() { storage.set(SAVE_KEY, this.save); this.bankDirty = false; },
  saveBank() { if (this.bankDirty) this.persist(); },

  bind() {
    this.onClick = (e) => {
      const b = e.target.closest('[data-ui],[data-opt],[data-stage],[data-map],[data-tab],[data-gk],[data-outfit],[data-gear],[data-gsel],[data-gearui],[data-upw],[data-upbuy],[data-msel],[data-lo]'); if (!b) return;
      this.sfx.unlock();
      if (b.dataset.upw) { this.upSel = b.dataset.upw; this.updateUpg(); this.sfx.swap(); return; }
      if (b.dataset.upbuy) { if (!b.disabled) this.upgUi(b.dataset.upbuy); return; }
      if (b.dataset.msel) { if (isMelee(b.dataset.msel)) { this.save.melee = b.dataset.msel; this.persist(); this.updateUpg(); this.updateMeleeBtn(); if (this.game) { this.game.settings = this.save; this.game.applyUpgrades(); } this.sfx.swap(); } return; }
      if (b.dataset.gear) { if (!b.disabled) this.resolveGear(b.dataset.gear); return; }
      if (b.dataset.gsel !== undefined) { if (b.dataset.gsel) { this.selGear = b.dataset.gsel; this.dropArm = null; this.dropN = 0; this.updateSoubi(); this.sfx.swap(); } return; }
      if (b.dataset.gearui) { this.gearUi(b.dataset.gearui); return; }
      if (b.dataset.outfit) {
        const id = b.dataset.outfit;
        if (!this.save.outfits.includes(id)) { this.sfx.empty?.(); return; }
        this.save.outfit = id; this.persist(); this.updateTitle();
        if (this.game) { this.game.settings = this.save; this.game.setOutfit(id, true); }
        this.sfx.swap();
        return;
      }
      if (b.dataset.tab) { this.save.tab = b.dataset.tab; this.persist(); this.updateCards(); this.sfx.swap(); return; }
      if (b.dataset.gk) { // v0.16.0: ガンキック ステージの カード → ぶきを えらぶ
        const no = +b.dataset.gk;
        if (!isGkReady(no)) { this.sfx.empty?.(); return; }
        this.pendGk = no; this.openLoadout();
        return;
      }
      if (b.dataset.map) { // v0.16.0: マップの カード → そのまま ぶきを えらぶ
        this.save.map = b.dataset.map; this.persist(); this.updateTitle();
        if (this.game) { this.game.settings = this.save; this.game.gk = null; this.game.loadMap(this.nextMapId()); }
        this.pendGk = null; this.openLoadout();
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
      if (b.dataset.lo) { // v0.15.0: ロードアウトの カード
        this.loSel = toggleLoadout(this.loSel || [], b.dataset.lo); this.updateLoadout(); this.sfx.swap();
        return;
      }
      const ui = b.dataset.ui;
      if (ui === 'start') this.openLoadout();
      else if (ui === 'lgo') this.goLoadout();
      else if (ui === 'lback') { this.show('title'); this.sfx.swap(); }
      else if (ui === 'retry') { if (this.curGk) this.playGk(this.curGk, 0); else this.play(true); }
      else if (ui === 'cpretry') { if (this.curGk) this.playGk(this.curGk, this.cpRoom || 0, this.cpScore || 0); }
      else if (ui === 'gkagain') { if (this.curGk) this.playGk(this.curGk, 0); }
      else if (ui === 'gknext') { const n = this.curGk && gkNext(this.curGk); if (n) { this.pendGk = n; this.openLoadout(); } }
      else if (ui === 'opts') { this.el('.zt-optpanel').classList.remove('hidden'); this.sfx.swap(); }
      else if (ui === 'optclose') { this.el('.zt-optpanel').classList.add('hidden'); this.sfx.swap(); }
      else if (ui === 'resume') this.resume();
      else if (ui === 'title') this.toTitle();
      else if (ui === 'hub') this.back();
      else if (ui === 'kigae') { this.updateKigae(); this.show('kigae'); this.sfx.swap(); }
      else if (ui === 'kback' || ui === 'sback' || ui === 'uback') { this.show('title'); this.sfx.swap(); }
      else if (ui === 'upg') { this.updateUpg(); this.show('upg'); this.sfx.swap(); }
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
    this.el('.zt-upg').classList.toggle('hidden', which !== 'upg');
    this.el('.zt-loadout').classList.toggle('hidden', which !== 'loadout');
    if (which !== 'play' && this.game && this.game.scopedOn) { this.game.scopedOn = false; this.el('.zt-root').classList.remove('zt-scoped'); }
    if (which !== 'play') this.saveBank?.();
    if (this.game) this.game.kigae = which === 'kigae' || which === 'soubi' || which === 'upg';
    if (which !== 'play' && which !== 'pause') this.flushGear?.();
    this.el('.zt-gcard').classList.toggle('zt-dim', which === 'pause');
    this.el('.zt-pausescr').classList.toggle('hidden', which !== 'pause');
    this.el('.zt-over').classList.toggle('hidden', which !== 'over');
    this.el('.zt-clear').classList.toggle('hidden', which !== 'clear');
    if (which !== 'title') this.el('.zt-optpanel').classList.add('hidden');
    this.root.classList.toggle('zt-playing', which === 'play' || which === 'pause' || which === 'over' || which === 'clear');
    this.input && (this.input.enabled = which === 'play');
  },

  // v0.15.0: ロードアウト（スタートの あと・まえに えらんだ 3つが はじめから はいっている）
  openLoadout() {
    if (!this.game) return;
    this.loSel = normalizeLoadout(this.save.loadout, unlockedWeapons(this.save));
    this.updateLoadout(); this.show('loadout'); this.sfx.swap();
  },
  updateLoadout() {
    const sel = this.loSel || [];
    this.el('.zt-lcards').innerHTML = unlockedWeapons(this.save).map((id) => {
      const i = sel.indexOf(id);
      return `<button class="zt-lcard${i >= 0 ? ' sel' : ''}" data-lo="${id}" aria-label="${WEAPONS[id].name}">${i >= 0 ? `<b>${i + 1}</b>` : ''}`
        + `<span class="zt-chip">${WEAPON_ICONS[id] || ''}</span><span class="zt-lname">${WEAPONS[id].short}</span><em>Lv${weaponLevel(this.save, id)}</em></button>`;
    }).join('');
    this.el('.zt-lpick').innerHTML = Array.from({ length: LOADOUT_SIZE }, (_, i) => sel[i]
      ? `<span class="zt-lslot"><b>${i + 1}</b>${WEAPON_ICONS[sel[i]] || ''}</span>` : `<span class="zt-lslot none"><b>${i + 1}</b>？</span>`).join('');
    const ok = loadoutReady(sel);
    const go = this.el('.zt-lgo'); go.disabled = !ok; go.textContent = ok ? 'これで しゅつげき！' : `あと ${LOADOUT_SIZE - sel.length}つ えらんでね`;
  },
  goLoadout() {
    if (!loadoutReady(this.loSel)) { this.sfx.empty?.(); return; }
    this.save.loadout = this.loSel.slice(); this.persist();
    if (this.game) this.game.settings = this.save;
    if (this.pendGk) this.playGk(this.pendGk, 0); else this.play(false);
  },
  // HUD の 3つの ボタン（アイコンを いれかえる）
  renderSlots(lo) {
    const key = lo.join(','); if (this.slotKey === key) return; this.slotKey = key;
    for (const b of this.container.querySelectorAll('.zt-slot')) {
      const id = lo[+b.dataset.i]; b.dataset.w = id || '';
      b.setAttribute('aria-label', id ? WEAPONS[id].name : ''); b.title = id ? `${+b.dataset.i + 1} ${WEAPONS[id].short}` : '';
      b.querySelector('.zt-sico').innerHTML = id ? WEAPON_ICONS[id] || '' : '';
      b.classList.toggle('gauge', !!(id && WEAPONS[id].gauge));
    }
  },

  // つぎに あそぶ マップ（おまかせ なら じゅんばん）
  nextMapId() { return pickMapId(this.save.map, this.save.mapNext); },
  play(retry = false) {
    if (!this.game) return;
    this.flushGear();
    this.input.reset();
    this.game.gk = null; this.curGk = null; // v0.16.0: いつもの ウェーブ
    if (!retry) this.game.loadMap(this.nextMapId());
    if (!retry && this.save.map === 'rotate') { this.save.mapNext = (this.save.mapNext + 1) % MAP_IDS.length; this.persist(); }
    this.game.startGame();
    this.root.classList.toggle('zt-guided', !!this.game.map.ride);
    this.runBank = 0; // v0.8.0: この ゲームで もう bank に いれた スコア
    this.show('play');
    if (!matchMedia('(pointer: coarse)').matches) this.canvas.requestPointerLock?.();
  },
  // v0.16.0: ガンキック ステージ（データと マップは あとから よむ）。from = チェックポイントの へや
  async playGk(no, from = 0, score = 0) {
    if (!this.game || this.gkBusy) return;
    const info = GK_READY[no]; if (!info) return;
    this.gkBusy = true;
    try {
      // v0.17.0: セグメントの ステージは チェックポイントの セグメント だけ よむ（つぎは すすむと よむ）
      const s0 = info.segs ? segResume(info.segs, from) : 0;
      const [stage, mod, gims] = await Promise.all([gkLoadStage(no), info.segs ? gkLoadSegs(info, [s0]) : gkLoadMap(no), gkLoadGims(info)]);
      const boss = await gkLoadBoss(stage.boss.id); // v0.17.0: ボスの わざ（なくても いつもの ボスで あそべる）
      if (!this.alive || !this.game) return;
      if (!info.segs && !hasMap(info.map)) registerMap(info.map, mod.build);
      this.flushGear(); this.input.reset();
      this.curGk = no; this.pendGk = null;
      if (info.segs) this.game.gkStreamLoad(no, info, mod, s0); else this.game.loadMap(info.map);
      this.root.classList.remove('zt-guided');
      this.game.startGk(stage, gkWaves(stage), from, { tod: info.tod, score });
      this.game.gkGimStart(gims); // v0.17.0: あめ・でんしゃ など
      this.game.gkBossStart(boss);
      this.runBank = from ? score : 0;
      this.show('play');
      if (!matchMedia('(pointer: coarse)').matches) this.canvas.requestPointerLock?.();
    } catch (err) {
      console.error(err);
      this.el('.zt-title-err').textContent = 'ステージを よみこめなかった… でんぱを たしかめてね';
      this.show('title');
    } finally { this.gkBusy = false; }
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
    this.game.gk = null; this.game.gkGimEnd();
    this.game.setupTitle(); this.show('title'); this.updateTitle();
  },

  makeHud() {
    const q = (s) => this.el(s);
    const botEls = (k) => ({ bot: q('.zt-bot' + k), botHp: q('.zt-bot' + k + ' .zt-bothp div'), botArrow: q('.zt-botarrow' + k), botArrowI: q('.zt-botarrow' + k + ' i'),
      botIcon: q('.zt-boticon' + k), botIconHp: q('.zt-boticon' + k + ' .zt-bothp div'), botLv: [q('.zt-bot' + k + ' .zt-botlv'), q('.zt-boticon' + k + ' .zt-botlv')], botSay: q('.zt-bot' + k + ' .zt-botsay') });
    const E = {
      hpBar: q('.zt-hpbar div'), hpNum: q('.zt-hp em'), wave: q('.zt-wave b'), left: q('.zt-wave span'), score: q('.zt-score b'),
      ammo: q('.zt-ammo b'), res: q('.zt-ammo span'), wname: q('.zt-wname'), cross: q('.zt-cross'), hitm: q('.zt-hitm'),
      boom: q('.zt-boom'), feed: q('.zt-feed'), banner: q('.zt-banner'), reload: q('.zt-reload'), reloadBar: q('.zt-reload div'), hurt: q('.zt-hurt'),
      slots: [...this.container.querySelectorAll('.zt-slot')],
      anum: q('.zt-anum'), gauge: q('.zt-gauge'), gLbl: q('.zt-gauge em'), gBar: q('.zt-gauge i'),
      boss: q('.zt-boss'), bossName: q('.zt-boss b'), bossBar: q('.zt-bossbar div'),
      bots: { police: botEls('.zt-police'), army: botEls('.zt-army') }, // v0.14.0: けいさつロボ と アーミーロボ
      guests: Object.fromEntries(['ao','momo'].map(id => [id, { tag:q('.zt-bot.zt-'+id), hp:q('.zt-bot.zt-'+id+' .zt-bothp div'), arrow:q('.zt-botarrow.zt-'+id), arrowIcon:q('.zt-botarrow.zt-'+id+' i') }])),
      drunk: q('.zt-drunk'), drunkHp: q('.zt-drunk .zt-bothp div'), drunkHic: q('.zt-drunk .zt-hic'),
      cop: q('.zt-cop'), copHp: q('.zt-cop .zt-bothp div'),
      suitTime: q('.zt-suittime b'), suitBar: q('.zt-suittbar div'), suitTimeBox: q('.zt-suittime'), sbtns: [...this.container.querySelectorAll('.zt-suitbar .zt-sbtn')],
      tankTag:q('.zt-tanktag'), tankArrow:q('.zt-tankarrow'), tankArrowI:q('.zt-tankarrow i'), tankTime:q('.zt-tanktime b'), tankBar:q('.zt-tanktime .zt-suittbar div'), tankBtns:[...this.container.querySelectorAll('[data-tank]')],
      suitTag: q('.zt-suittag'), suitArrow: q('.zt-suitarrow'), suitArrowI: q('.zt-suitarrow i'),
      oji: q('.zt-oji'), ojiTxt: q('.zt-ojitxt'), ojiHp: q('.zt-ojihp div'), ojiArrow: q('.zt-ojiarrow'), ojiArrowI: q('.zt-ojiarrow i'), ojiArrowT: q('.zt-ojiarrow span'),
    };
    const last = {};
    const setText = (k, el, v) => { if (last[k] !== v) { last[k] = v; el.textContent = v; } };
    // v0.7.0: なかまの ロボ（まだ: なまえ＋やじるし／なかま: あたまの うえの HP と うえの アイコン）v0.14.0: けいさつ・アーミー きょうつう
    const botHud = (B, k, r) => {
      const mode = !r ? 'none' : r.mode === 'idle' ? (r.onScreen ? 'idle' : 'arrow') : r.onScreen ? 'on' : 'off';
      if (last[k + 'Mode'] !== mode) {
        last[k + 'Mode'] = mode;
        B.bot.classList.toggle('hidden', mode !== 'idle' && mode !== 'on'); B.bot.dataset.m = mode;
        B.botArrow.classList.toggle('hidden', mode !== 'arrow');
        B.botIcon.classList.toggle('hidden', mode !== 'on' && mode !== 'off');
      }
      if (!r) return;
      const x = ((r.x + 1) * 50).toFixed(2) + '%', y = ((1 - r.y) * 50).toFixed(2) + '%';
      const el = mode === 'arrow' ? B.botArrow : B.bot;
      if (mode !== 'off') { el.style.left = x; el.style.top = mode === 'arrow' ? arrowTop(r.y) : y; }
      if (mode === 'arrow') B.botArrowI.style.transform = `rotate(${r.ang.toFixed(3)}rad)`;
      const w = (Math.max(0, r.hp) * 100).toFixed(0) + '%';
      if (last[k + 'Hp'] !== w) { last[k + 'Hp'] = w; for (const b of [B.botHp, B.botIconHp]) { b.style.width = w; b.classList.toggle('low', r.hp < 0.35); } }
      const lv = 'Lv' + (r.lv || 1);
      if (last[k + 'Lv'] !== lv) { last[k + 'Lv'] = lv; for (const b of B.botLv) b.textContent = lv; }
      const up = !!r.lvUp;
      if (last[k + 'Up'] !== up) { last[k + 'Up'] = up; B.bot.classList.toggle('lvup', up); B.botIcon.classList.toggle('lvup', up); }
    };
    let feedN = 0;
    const app = this;
    return {
      show: (w) => app.show(w),
      set: (s) => {
        const hpp = Math.max(0, s.hp / s.maxHp);
        if (last.hp !== s.hp) { last.hp = s.hp; E.hpBar.style.width = (hpp * 100).toFixed(1) + '%'; E.hpBar.classList.toggle('low', hpp < 0.35); E.hpNum.textContent = s.hp; }
        setText('wave', E.wave, s.area || (s.wave ? `ウェーブ ${s.wave}` : 'じゅんび'));
        setText('left', E.left, `のこり ${s.left}`);
        setText('score', E.score, String(s.score));
        // v0.8.0: ふえた スコアは そのまま「つかえる スコア」へ（さいこう スコアとは べつ）
        if (s.score > (app.runBank || 0)) { earnBank(app.save, s.score - (app.runBank || 0)); app.runBank = s.score; app.bankDirty = true; }
        if (s.loadout) app.renderSlots(s.loadout);
        // v0.15.0: ゲージの ぶき（ねつ・ねんりょう・エネルギー）は かずの かわりに ゲージ
        const gg = !s.suit && !s.tank && WEAPONS[s.weapon].gauge ? s.guns[s.weapon] : null;
        if (last.gOn !== !!gg) { last.gOn = !!gg; E.gauge.classList.toggle('hidden', !gg); E.anum.classList.toggle('hidden', !!gg); }
        if (gg) {
          const kind = WEAPONS[s.weapon].gauge, heat = kind === 'heat', v = heat ? 1 - gg.en : gg.en;
          setText('gLbl', E.gLbl, gg.lock ? (heat ? 'オーバーヒート！' : 'じゅうでん ちゅう…') : GAUGE_LABEL[kind]);
          const wv = (v * 100).toFixed(0) + '%'; if (last.gW !== wv) { last.gW = wv; E.gBar.style.width = wv; }
          const cls = kind + (gg.lock ? ' lock' : '') + (!heat && gg.en < 0.25 ? ' low' : '') + (heat && gg.en < 0.3 ? ' low' : '');
          if (last.gC !== cls) { last.gC = cls; E.gauge.className = 'zt-gauge ' + cls; }
        }
        setText('ammo', E.ammo, (s.suit || s.tank) ? '∞' : String(s.ammo));
        setText('res', E.res, (s.suit || s.tank) ? '' : '/ ' + (s.reserve === Infinity ? '∞' : s.reserve));
        setText('wname', E.wname, s.tank ? (s.tank === 'mg' ? 'マシンガン' : 'しゅほう') : s.suit ? SUIT_WEAPONS[s.suit].name : WEAPONS[s.weapon].name + (s.lv > 1 ? ` Lv${s.lv}` : ''));
        if (last.sw !== s.suit) { last.sw = s.suit; for (const b of E.sbtns) b.classList.toggle('sel', b.dataset.s === s.suit); }
        E.ammo.classList.toggle('low', !s.suit && !s.tank && s.ammo <= Math.ceil(s.mag * 0.25));
        if (last.lo !== app.slotKey) { last.lo = app.slotKey; last.weapon = null; }
        if (last.weapon !== s.weapon) { last.weapon = s.weapon; for (const b of E.slots) b.classList.toggle('sel', b.dataset.w === s.weapon); }
        for (const b of E.slots) {
          const g = s.guns[b.dataset.w]; if (!g) continue;
          const e = WEAPONS[b.dataset.w].gauge ? !!g.lock : g.ammo === 0 && !(g.reserve > 0); if (b._e !== e) { b._e = e; b.classList.toggle('empty', e); }
          if (WEAPONS[b.dataset.w].gauge) { const v = (g.en * 100).toFixed(0) + '%'; if (b._g !== v) { b._g = v; b.querySelector('.zt-sg s').style.width = v; } }
        }
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
        const c = b.color != null ? '#' + b.color.toString(16).padStart(6, '0') : ''; // v0.17.0: さいごの ボスは だんかいで いろが かわる
        if (last.bossC !== c) { last.bossC = c; E.bossBar.style.background = c; }
      },
      // v0.7.0: けいさつロボ（まだ: なまえ＋やじるし／なかま: あたまの うえの HP と うえの アイコン）
      robot: (r) => botHud(E.bots.police, 'p', r),
      guest: (id, r) => {
        const g=E.guests[id]; if (!g) return;
        const tag=!!r && r.onScreen, arrow=!!r && !r.onScreen && r.mode === 'idle';
        g.tag.classList.toggle('hidden',!tag); g.arrow.classList.toggle('hidden',!arrow);
        if (!r) return;
        g.tag.dataset.m=r.mode;
        g.tag.querySelector('span').textContent=(id === 'ao' ? 'アオ' : 'モモ') + (r.mode === 'idle' ? '・さわってね' : '');
        const el=arrow ? g.arrow : g.tag;
        el.style.left=((r.x+1)*50).toFixed(2)+'%'; el.style.top=(arrow ? arrowTop(r.y) : ((1-r.y)*50).toFixed(2)+'%');
        if (arrow) g.arrowIcon.style.transform=`rotate(${r.ang.toFixed(3)}rad)`;
        g.hp.style.width=(Math.max(0,r.hp)*100).toFixed(0)+'%'; g.hp.classList.toggle('low',r.hp<0.35);
      },
      army: (r) => botHud(E.bots.army, 'a', r), // v0.14.0: アーミーロボ（べつの アイコン・Lv）
      // v0.14.0: よっぱらいおじさん（あたまの うえの なまえ・HP・「ひっく」）
      drunk: (c) => {
        const on = !!c && c.onScreen && c.state !== 'gone';
        if (last.drOn !== on) { last.drOn = on; E.drunk.classList.toggle('hidden', !on); }
        if (!on) return;
        E.drunk.style.left = ((c.x + 1) * 50).toFixed(2) + '%'; E.drunk.style.top = ((1 - c.y) * 50).toFixed(2) + '%';
        const w = (Math.max(0, c.hp) * 100).toFixed(0) + '%';
        if (last.drHp !== w) { last.drHp = w; E.drunkHp.style.width = w; E.drunkHp.classList.toggle('low', c.hp < 0.35); }
        setText('drSay', E.drunkHic, c.say || '');
        const sh = !!c.say;
        if (last.drSh !== sh) { last.drSh = sh; E.drunkHic.classList.toggle('on', sh); }
      },
      // v0.10.0: パワードスーツ（まだ: なまえ／やじるし・きている: のこり じかん と ぶきの ボタン）
      suit: (r) => {
        const mode = !r ? 'none' : r.mode === 'ride' ? 'ride' : r.onScreen ? 'tag' : 'arrow';
        if (last.suitMode !== mode) {
          last.suitMode = mode;
          app.root.classList.toggle('zt-suited', mode === 'ride');
          E.suitTag.classList.toggle('hidden', mode !== 'tag'); E.suitArrow.classList.toggle('hidden', mode !== 'arrow');
        }
        if (!r) return;
        if (mode === 'ride') {
          setText('suitT', E.suitTime, suitLabel(r.t, r.frozen));
          const w = (Math.max(0, r.frac) * 100).toFixed(1) + '%';
          if (last.suitW !== w) { last.suitW = w; E.suitBar.style.width = w; }
          const low = r.t < 10;
          if (last.suitLow !== low) { last.suitLow = low; E.suitTimeBox.classList.toggle('low', low); }
          if (last.sw !== r.weapon) { last.sw = r.weapon; for (const b of E.sbtns) b.classList.toggle('sel', b.dataset.s === r.weapon); }
          const rd = (r.ready * 100).toFixed(0) + '%';
          if (last.suitRd !== rd) { last.suitRd = rd; for (const b of E.sbtns) { const u = b.querySelector('u'); u.style.width = b.dataset.s === r.weapon ? rd : '100%'; } }
          return;
        }
        const el = mode === 'tag' ? E.suitTag : E.suitArrow;
        el.style.left = ((r.x + 1) * 50).toFixed(2) + '%';
        el.style.top = mode === 'arrow' ? arrowTop(r.y) : ((1 - r.y) * 50).toFixed(2) + '%';
        if (mode === 'arrow') E.suitArrowI.style.transform = `rotate(${r.ang.toFixed(3)}rad)`;
      },
      tank: (r) => {
        const mode=!r ? 'none' : r.mode === 'ride' ? 'ride' : r.onScreen ? 'tag' : 'arrow';
        app.root.classList.toggle('zt-tanked',mode==='ride');
        E.tankTag.classList.toggle('hidden',mode!=='tag'); E.tankArrow.classList.toggle('hidden',mode!=='arrow');
        if(!r)return;
        if(mode==='ride'){
          E.tankTime.textContent=`せんしゃ のこり ${Math.max(0,Math.ceil(r.time))}${r.frozen ? ' ⏸ きゅうけい' : ''}`;
          E.tankBar.style.width=(Math.max(0,r.frac)*100).toFixed(1)+'%';
          for(const b of E.tankBtns)b.classList.toggle('sel',b.dataset.tank===r.weapon);
        } else {
          const el=mode==='tag'?E.tankTag:E.tankArrow;el.style.left=((r.x+1)*50).toFixed(2)+'%';
          el.style.top=mode==='arrow'?arrowTop(r.y):((1-r.y)*50).toFixed(2)+'%';
          if(mode==='arrow')E.tankArrowI.style.transform=`rotate(${r.ang.toFixed(3)}rad)`;
        }
      },
      // v0.9.0: けいさつおじさん（あたまの うえの HP だけ）
      cop: (c) => {
        const on = !!c && c.onScreen && c.state === 'on';
        if (last.copOn !== on) { last.copOn = on; E.cop.classList.toggle('hidden', !on); }
        if (!on) return;
        E.cop.style.left = ((c.x + 1) * 50).toFixed(2) + '%'; E.cop.style.top = ((1 - c.y) * 50).toFixed(2) + '%';
        const w = (Math.max(0, c.hp) * 100).toFixed(0) + '%';
        if (last.copHp !== w) { last.copHp = w; E.copHp.style.width = w; E.copHp.classList.toggle('low', c.hp < 0.35); }
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
      scope: (on) => { app.root.classList.toggle('zt-scoped', !!on); },
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
      // v0.16.0: ステージ クリア
      clear: (r) => {
        const bonus = gkClearBonus(r.no); earnBank(app.save, bonus);
        const nb = recordGkClear(app.save, r.no, r.score + bonus); app.persist();
        const nx = gkNext(r.no);
        app.el('.zt-cres').innerHTML = `<div>ステージ ${r.no} ・ ${gkMeta(r.no).sub}</div><div>スコア <b>${r.score}</b> ＋ クリア ボーナス <b>${bonus}</b></div><div>たおした ゾンビ <b>${r.kills}</b>（ヘッドショット ${r.heads}）</div>${nb ? '<div class="zt-new">しんきろく！</div>' : ''}${nx ? '' : '<div class="zt-soon">つぎの ステージは じゅんびちゅう！</div>'}`;
        app.el('.zt-nextbtn').classList.toggle('hidden', !nx);
        if (document.pointerLockElement) document.exitPointerLock();
        setTimeout(() => app.alive && app.game && app.game.state === 'clear' && app.show('clear'), 1400);
        app.input.reset(); app.input.enabled = false;
      },
      over: (r) => {
        if (r.gk) { // v0.16.0: ガンキック ステージ → ドアの まえ（チェックポイント）から やりなおせる
          app.cpRoom = r.gk.room; app.cpScore = r.gk.score;
          app.el('.zt-res').innerHTML = `<div>ステージ ${r.gk.no} ・ エリア <b>${r.gk.room + 1} / ${r.gk.rooms}</b></div><div>スコア <b>${r.score}</b></div><div>たおした ゾンビ <b>${r.kills}</b></div>`;
          app.el('.zt-cpbtn').classList.toggle('hidden', !(r.gk.room > 0));
          app.el('.zt-retrybtn').textContent = r.gk.room > 0 ? 'さいしょから' : 'もういちど';
        } else {
        app.el('.zt-cpbtn').classList.add('hidden'); app.el('.zt-retrybtn').textContent = 'もういちど';
        const best = r.wave > app.save.bestWave || r.score > app.save.bestScore;
        app.save.bestWave = Math.max(app.save.bestWave, r.wave); app.save.bestScore = Math.max(app.save.bestScore, r.score); app.persist();
        app.el('.zt-res').innerHTML = `<div>ウェーブ <b>${r.wave}</b></div><div>スコア <b>${r.score}</b></div><div>たおした ゾンビ <b>${r.kills}</b>（ヘッドショット ${r.heads}）</div>${best ? '<div class="zt-new">しんきろく！</div>' : ''}`;
        }
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
    // v0.8.0: つかえる スコアを ときどき セーブ
    this.bankT = (this.bankT || 0) + dt;
    if (this.bankT > 5) { this.bankT = 0; this.saveBank(); }
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
