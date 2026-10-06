/**
 * ゲーム3: IRON SQUAD (アイアン・スクワッド: 雑兵立身出世録)
 * ローグライク・アクションRPG
 * 
 * [新リアリズム仕様]
 *  - 主人公は最初ただの雑兵！部隊は主人公に付いてこず、独自の判断で自律進軍・迎撃する！
 *  - 部隊と一緒に動かないと極めて危険（孤立死リスク＆部隊壊滅リスク）！
 *  - ソロで遠くの宝箱を漁りに行くのも自由だが、部隊がモンスターに囲まれて全滅することも…
 *  - 生き延びて「伍長」以上に立身出世して初めて【号令・指揮権】がアンロックされる！
 *  - 名もなき兵士たちは生き残ると二つ名と名前が授与され、やがて主人公の頼もしい戦友に。
 */
import { sound } from '../../audio.js';
import { storage } from '../../storage.js';

const MAP_WIDTH = 1800;
const MAP_HEIGHT = 1800;
const BASE_CAMP = { x: 900, y: 900, radius: 150 };

// 階級データ (雑兵から始まり、出世で直属小隊を率いる指揮権が解禁される！)
const RANKS = [
  { level: 1, title: '二等雑兵', reqExp: 0, canCommand: false, personalGuards: 0, maxSquad: 20, bonusHp: 0, bonusAtk: 0, desc: '指揮権なし。本隊は大軍で勝手に行動。ソロで自由に戦え！' },
  { level: 2, title: '一等兵', reqExp: 300, canCommand: false, personalGuards: 1, maxSquad: 20, bonusHp: 35, bonusAtk: 8, desc: '死線を潜った古参。戦友1名が直属随伴。本隊は勝手に行動。' },
  { level: 3, title: '伍長 (班長昇進)', reqExp: 900, canCommand: true, personalGuards: 3, commandType: 'WHISTLE', maxSquad: 26, bonusHp: 80, bonusAtk: 20, desc: '【直属小隊(3名)】を率いる！本隊は独自に作戦行動。呼集笛解禁。' },
  { level: 4, title: '軍曹 (小隊長代理)', reqExp: 2000, canCommand: true, personalGuards: 5, commandType: 'RALLY', maxSquad: 34, bonusHp: 150, bonusAtk: 38, desc: '【直属小隊(5名)】を指揮！本隊と連携進軍。突撃号令解禁。' },
  { level: 5, title: '百人隊長 (部隊司令)', reqExp: 3800, canCommand: true, personalGuards: 7, commandType: 'FULL', maxSquad: 45, bonusHp: 240, bonusAtk: 65, desc: '【直属精鋭小隊(7名)】を率いる！本隊は大軍団で戦場を制圧。' },
  { level: 6, title: '千人将', reqExp: 6500, canCommand: true, personalGuards: 8, commandType: 'FULL', maxSquad: 60, bonusHp: 380, bonusAtk: 100, desc: '【直属親衛小隊(8名)】を率いる大隊指揮官。' },
  { level: 7, title: '近衛騎士団長', reqExp: 10000, canCommand: true, personalGuards: 9, commandType: 'FULL', maxSquad: 75, bonusHp: 580, bonusAtk: 150, desc: '【近衛直属小隊(9名)】を率いる王国近衛騎士団長。' },
  { level: 8, title: '軍団総司令官', reqExp: 15000, canCommand: true, personalGuards: 10, commandType: 'FULL', maxSquad: 90, bonusHp: 850, bonusAtk: 220, desc: '【最高司令直属小隊(10名)】を率いる全軍の最高司令官。' },
  { level: 9, title: '救国の英雄神将', reqExp: 22000, canCommand: true, personalGuards: 12, commandType: 'FULL', maxSquad: 120, bonusHp: 1200, bonusAtk: 300, desc: '【英雄直属神聖小隊(12名)】を率いる伝説の神将。' }
];

const TITLES = ['不屈の', '疾風の', '鉄壁の', '歴戦の', '鬼神の', '紅蓮の', '隻眼の', '魔刃の', '金剛の', '閃光の'];
const NAMES = ['ボブ', 'ガッツ', 'ルーク', 'ジーク', 'レオ', 'ジャック', 'トール', 'ハンス', 'マルコ', 'オットー', 'クルト', 'フィン', 'クラーク', 'エリック', 'ロイ', 'アル', 'レオン', 'ギル', 'セドリック', 'バルト', 'オスカー', 'アラン', 'ブルーノ', 'ダン'];

// 防具スロット定義
export const SLOT_INFO = {
  WEAPON: { key: 'weapon', name: '武器', icon: '🗡️' },
  SHIELD: { key: 'shield', name: '盾', icon: '🛡️' },
  HELMET: { key: 'helmet', name: '兜', icon: '🪖' },
  ARMOR:  { key: 'armor',  name: '鎧', icon: '🥋' },
  GLOVES: { key: 'gloves', name: '手', icon: '🧤' },
  LEGS:   { key: 'legs',   name: '脚', icon: '🥾' },
  AMULET: { key: 'amulet', name: '装飾', icon: '📿' }
};

// 兵種（クラス）定義
export const SOLDIER_CLASSES = {
  HEAVY: {
    id: 'HEAVY',
    name: '重装歩兵',
    icon: '🛡️',
    color: '#38bdf8',
    range: 38,
    speed: 78,
    atkCooldown: 0.95,
    bonusHp: 65,
    bonusDef: 22,
    desc: '大盾と重甲冑で前線を支える鉄壁のタンク'
  },
  LIGHT: {
    id: 'LIGHT',
    name: '軽装遊撃兵',
    icon: '🗡️',
    color: '#f59e0b',
    range: 44,
    speed: 130,
    atkCooldown: 0.52,
    bonusCrit: 25,
    bonusAtk: 4,
    desc: '俊敏な身のこなしで敵陣側面を強襲'
  },
  ARCHER: {
    id: 'ARCHER',
    name: '弓兵',
    icon: '🏹',
    color: '#34d399',
    range: 250,
    speed: 102,
    atkCooldown: 1.15,
    bonusAtk: 3,
    desc: '後方から矢を放ち安全に援護射撃'
  },
  MEDIC: {
    id: 'MEDIC',
    name: '衛生術士',
    icon: '🌿',
    color: '#10b981',
    range: 160,
    speed: 98,
    atkCooldown: 1.25,
    bonusHp: 35,
    desc: '負傷兵の遠隔治癒＆倒れた兵士の最優先救助'
  }
};

// 素材・ティア制ドロップ生成
const TIERS = [
  { tier: 1, mat: '木/布', color: '#94a3b8', mult: 1.0,
    weapon: '木の剣', shield: '木の丸盾', helmet: '布の帽子', armor: '布の服', gloves: '布の手袋', legs: '布のズボン', amulet: '木彫りの指輪' },
  { tier: 2, mat: '青銅/革', color: '#38bdf8', mult: 2.2,
    weapon: '青銅の剣', shield: '青銅の盾', helmet: '革の兜', armor: '革の鎧', gloves: '革の手袋', legs: '革の脚絆', amulet: '銅の指輪' },
  { tier: 3, mat: '鉄', color: '#34d399', mult: 4.2,
    weapon: '鉄の剣', shield: '鉄の盾', helmet: '鉄の兜', armor: '鉄の鎧', gloves: '鉄の籠手', legs: '鉄の脛当', amulet: '鉄の首飾り' },
  { tier: 4, mat: '鋼鉄', color: '#a855f7', mult: 8.0,
    weapon: '鋼鉄の大剣', shield: '鋼鉄の大盾', helmet: '鋼鉄の兜', armor: '鋼鉄の甲冑', gloves: '鋼鉄のガントレット', legs: '鋼鉄のグリーブ', amulet: '鋼鉄の紋章' },
  { tier: 5, mat: 'ミスリル', color: '#ffaa00', mult: 15.0,
    weapon: 'ミスリルの剣', shield: 'ミスリル盾', helmet: 'ミスリルの兜', armor: 'ミスリル鎧', gloves: 'ミスリルの籠手', legs: 'ミスリルの脚絆', amulet: '黄金の首飾り' },
  { tier: 6, mat: '竜鱗/黒金', color: '#ef4444', mult: 28.0,
    weapon: '竜牙の大剣', shield: '竜鱗の大盾', helmet: '竜鱗の兜', armor: '竜鱗の鎧', gloves: '竜鱗の籠手', legs: '竜鱗の脛当', amulet: '竜の護符' },
  { tier: 7, mat: '神話・オリハルコン', color: '#ff007f', mult: 55.0,
    weapon: '神剣オリハルコン', shield: '神聖のイージス', helmet: '神聖の宝冠', armor: '神聖の鎧', gloves: '神聖の小手', legs: '神聖の具足', amulet: '神々の紋章' }
];

export function applyUpgradeStats(item, upgradeLevel) {
  item.upgrade = upgradeLevel;
  if (!item.baseName) item.baseName = item.name.replace(/\+\d+$/, '');
  item.name = item.upgrade > 0 ? `${item.baseName}+${item.upgrade}` : item.baseName;
  const chosenTier = TIERS.find(t => t.tier === item.tier) || TIERS[0];
  const plusMult = 1 + item.upgrade * 0.25;
  const baseValue = Math.floor(10 + chosenTier.tier * 5);
  item.stats = item.stats || {};

  if (item.type === 'WEAPON') {
    item.stats.atk = Math.floor(baseValue * chosenTier.mult * plusMult);
    if (chosenTier.tier >= 4) item.stats.crit = Math.min(80, chosenTier.tier * 10);
    if (chosenTier.tier >= 6) item.stats.lightning = true;
  } else if (item.type === 'SHIELD') {
    item.stats.def = Math.floor(baseValue * 1.5 * chosenTier.mult * plusMult);
    item.stats.hp = Math.floor(baseValue * 2.0 * chosenTier.mult * plusMult);
    item.stats.blockChance = Math.min(45, 15 + chosenTier.tier * 5);
  } else if (item.type === 'HELMET') {
    item.stats.def = Math.floor(baseValue * 1.1 * chosenTier.mult * plusMult);
    item.stats.hp = Math.floor(baseValue * 3.0 * chosenTier.mult * plusMult);
  } else if (item.type === 'ARMOR') {
    item.stats.def = Math.floor(baseValue * 2.2 * chosenTier.mult * plusMult);
    item.stats.hp = Math.floor(baseValue * 4.5 * chosenTier.mult * plusMult);
    if (chosenTier.tier >= 5) item.stats.regen = chosenTier.tier * 2;
  } else if (item.type === 'GLOVES') {
    item.stats.def = Math.floor(baseValue * 0.8 * chosenTier.mult * plusMult);
    item.stats.atk = Math.floor(baseValue * 0.5 * chosenTier.mult * plusMult);
    item.stats.atkSpeed = Math.floor(5 + chosenTier.tier * 3 + item.upgrade);
  } else if (item.type === 'LEGS') {
    item.stats.def = Math.floor(baseValue * 0.9 * chosenTier.mult * plusMult);
    item.stats.speed = Math.floor(6 + chosenTier.tier * 3 + item.upgrade * 2);
  } else if (item.type === 'AMULET') {
    item.stats.speed = Math.floor(8 + chosenTier.tier * 2 + item.upgrade);
    item.stats.atkSpeed = Math.floor(10 + chosenTier.tier * 5 + item.upgrade * 2);
    if (chosenTier.tier >= 5) item.stats.vampire = 0.2;
  }
}

// 装備ビジュアル解析ヘルパー（武器・防具・装身具の見た目を解析）
export function getEquipVisual(item, defaultTier = 1, defaultColor = null) {
  if (!item) {
    const tDef = TIERS.find(t => t.tier === defaultTier) || TIERS[0];
    return {
      tier: defaultTier,
      color: defaultColor || tDef.color,
      mat: tDef.mat,
      upgrade: 0,
      isGod: false,
      hasItem: false
    };
  }
  return {
    tier: item.tier || defaultTier,
    color: item.color || '#64748b',
    mat: item.mat || '',
    upgrade: item.upgrade || 0,
    isGod: (item.tier || 1) >= 6 || (item.upgrade || 0) >= 5,
    hasItem: true
  };
}

function generateRandomDrop(wave) {
  const waveBonus = Math.min(3, Math.floor(wave / 4));
  const weights = [
    Math.max(10, 45 - wave * 4),               // T1
    Math.max(15, 30 - wave * 2),               // T2
    20 + waveBonus * 3,                         // T3 (鉄)
    8 + waveBonus * 4,                          // T4 (鋼鉄)
    3 + waveBonus * 3,                          // T5 (ミスリル)
    1 + waveBonus * 2,                          // T6 (竜鱗)
    0.4 + waveBonus * 1                         // T7 (神話)
  ];

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * totalWeight;
  let chosenTier = TIERS[0];
  for (let i = 0; i < TIERS.length; i++) {
    if (rnd < weights[i]) {
      chosenTier = TIERS[i];
      break;
    }
    rnd -= weights[i];
  }

  // 兜、鎧、脚、手、盾、武器、装飾
  const types = ['WEAPON', 'SHIELD', 'HELMET', 'ARMOR', 'GLOVES', 'LEGS', 'AMULET'];
  const type = types[Math.floor(Math.random() * types.length)];

  let rawName = '';
  if (type === 'WEAPON') rawName = chosenTier.weapon;
  else if (type === 'SHIELD') rawName = chosenTier.shield;
  else if (type === 'HELMET') rawName = chosenTier.helmet;
  else if (type === 'ARMOR') rawName = chosenTier.armor;
  else if (type === 'GLOVES') rawName = chosenTier.gloves;
  else if (type === 'LEGS') rawName = chosenTier.legs;
  else rawName = chosenTier.amulet;

  const plusVal = Math.random() < 0.28 ? (Math.random() < 0.35 ? 2 : 1) : 0;
  const item = {
    id: Math.random().toString(36).substring(2, 9),
    name: rawName,
    baseName: rawName,
    upgrade: 0,
    type,
    tier: chosenTier.tier,
    mat: chosenTier.mat,
    color: chosenTier.color,
    stats: {},
    isGod: chosenTier.tier >= 6
  };
  applyUpgradeStats(item, plusVal);
  return item;
}


export const OUTPOST_DEFS = {
  FORT: {
    type: 'FORT',
    name: '黒鬼の前線砦',
    icon: '🏴',
    color: '#ef4444',
    maxHp: 340,
    radius: 36,
    x: 280,
    y: 280,
    desc: '大量ゴールド＆確定高ティア宝箱！'
  },
  CAGE: {
    type: 'CAGE',
    name: '捕虜収容所',
    icon: '⛓️',
    color: '#f59e0b',
    maxHp: 190,
    radius: 28,
    x: 1520,
    y: 1520,
    desc: '囚われた友軍2名が即座に自軍へ加入！'
  },
  SHRINE: {
    type: 'SHRINE',
    name: '古代鍛冶の祭壇',
    icon: '🏛️',
    color: '#38bdf8',
    maxHp: 240,
    radius: 32,
    x: 1520,
    y: 280,
    desc: '全兵士＆あなたの装備が一斉+1強化！'
  },
  SUPPLY: {
    type: 'SUPPLY',
    name: '補給物資集積所',
    icon: '📦',
    color: '#34d399',
    maxHp: 160,
    radius: 30,
    x: 280,
    y: 1520,
    desc: '全員HP全快＆兵士に臨時給与支給！'
  }
};

export const QUEST_TEMPLATES = [
  {
    type: 'FORT',
    title: '🏴【強襲制圧】敵の前線砦を破壊せよ！',
    targetType: 'FORT',
    desc: '北西の砦を攻略し、オーク前哨部隊を叩け',
    rewardGold: 110,
    rewardExp: 40
  },
  {
    type: 'CAGE',
    title: '⛓️【友軍奪還】囚われた友軍を救出せよ！',
    targetType: 'CAGE',
    desc: '南東の牢獄を解放し、友軍兵士を救出せよ',
    rewardGold: 80,
    rewardExp: 35
  },
  {
    type: 'SHRINE',
    title: '🏛️【神託調査】古代鍛冶の祭壇を確保せよ！',
    targetType: 'SHRINE',
    desc: '北東の古代祭壇を制圧し、神聖鍛冶の祝福を受けよ',
    rewardGold: 90,
    rewardExp: 36
  },
  {
    type: 'SUPPLY',
    title: '📦【兵站奪還】強奪された物資を回収せよ！',
    targetType: 'SUPPLY',
    desc: '南西の補給庫を制圧し、部隊の物資を奪還せよ',
    rewardGold: 95,
    rewardExp: 32
  },
  {
    type: 'MASSACRE',
    title: '⚔️【掃討作戦】敵軍勢を35体以上撃滅せよ！',
    targetType: null,
    targetKills: 35,
    desc: '迫り来る敵兵を掃討し、前線を押し上げよ',
    rewardGold: 75,
    rewardExp: 30
  }
];

export const IronSquadGame = {
  id: 'iron-squad',
  title: 'IRON SQUAD',
  subtitle: '雑兵立身出世録',
  icon: '🛡️',
  color: '#ffaa00',
  description: '自律行動する部隊と共に生き残れ！部隊と離れると危険だがソロ冒険も自由。伍長・隊長へ出世して初めて指揮権を掴み取れ。',

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.highWave = storage.get('ironsquad_max_wave', 1);
    this.gold = 50;
    this.formation = 'GUARD';
    this.camera = { x: BASE_CAMP.x, y: BASE_CAMP.y };
    this.commandActiveUntil = 0; // 号令の有効期限
    this.zoom = 1.0;
    this.zoomLevels = [1.0, 1.25, 1.5, 0.75];
    this.zoomIndex = 0;
    this.setupUI();
    this.setupGame();

    // 中断データがあれば自動再開、なければ新兵として即出撃
    const saved = storage.get('ironsquad_save_data_v3', null);
    if (saved && saved.wave && saved.player) {
      this.resumeSavedGame();
    } else {
      this.startFreshGame();
    }
  },

  setupUI() {
    this.container.innerHTML = `
      <div class="game-wrapper">
        <header class="game-header">
          <button id="btn-back" class="icon-btn" title="工房へ戻る">🏠</button>
          <div class="game-stats" style="flex: 1; justify-content: space-around;">
            <div class="stat-box">
              <span class="stat-label">階級</span>
              <span id="player-rank" class="stat-value" style="color: #ffaa00;">二等雑兵</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">WAVE</span>
              <span id="current-wave" class="stat-value">1</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">生存部隊</span>
              <span id="squad-alive" class="stat-value" style="color: #00ffaa;">10/10</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">軍資金</span>
              <span id="current-gold" class="stat-value" style="color: #ffe600;">50G</span>
            </div>
          </div>
          <button id="btn-strategy" class="icon-btn" title="戦略タイム・本陣">⛺</button>
        </header>

        <div class="canvas-container" id="canvas-container">
          <canvas id="game-canvas"></canvas>

          <!-- 部隊距離インジケーター（画面左上） -->
          <div id="squad-proximity-badge" class="proximity-badge proximity-close">
            🟢 部隊と共闘中 (安全)
          </div>

          <!-- 軍令（作戦目標HUD・画面右上） -->
          <div id="quest-banner" class="quest-banner">
            <div class="quest-banner-header">
              <span class="quest-badge">📜 司令部軍令</span>
              <span id="quest-status" class="quest-status">遂行中</span>
            </div>
            <div id="quest-title" class="quest-title">⚔️ 作戦待機中</div>
            <div id="quest-desc" class="quest-desc">戦況を確認せよ</div>
          </div>

          <!-- 拠点治癒インジケータ -->
          <div id="base-heal-badge" class="base-badge hidden">💚 砦本陣で部隊治癒中</div>

          <!-- ドロップ獲得トースト -->
          <div id="drop-banner" class="drop-banner hidden"></div>

          <!-- 画面下部 バーチャルゲームパッド -->
          <div id="virtual-gamepad" class="virtual-gamepad">
            <div class="pad-stick-zone">
              <div id="dpad-base" class="dpad-base">
                <div id="dpad-knob" class="dpad-knob"></div>
              </div>
            </div>
            <div class="pad-buttons-zone">
              <button id="btn-pad-command" class="pad-btn pad-btn-command hidden" title="号令">
                <span class="pad-btn-icon">📢</span>
                <span class="pad-btn-label">呼集</span>
              </button>
              <button id="btn-pad-attack" class="pad-btn pad-btn-attack" title="手動攻撃">
                <span class="pad-btn-icon">🗡️</span>
                <span class="pad-btn-label">攻撃</span>
              </button>
            </div>
          </div>

          <!-- ミニマップレーダー -->
          <div class="minimap-container">
            <canvas id="minimap-canvas" width="70" height="70"></canvas>
          </div>
          <!-- カメラ倍率切替ボタン -->
          <button id="btn-zoom-toggle" class="zoom-toggle-btn" title="カメラ倍率切替">🔍 1.0x</button>

          <!-- 戦略タイム（宿営地）モーダル -->
          <div id="strategy-modal" class="game-overlay hidden">
            <div class="overlay-content" style="max-width: 380px; max-height: 88vh; overflow-y: auto; text-align: left; padding: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 id="strat-title" style="color: #ffaa00; font-size: 18px; margin: 0;">⛺ 本陣戦略会議</h3>
                <span style="font-size: 11px; color: #ffe600;">所持金: <strong id="strat-gold">50</strong>G</span>
              </div>
              <p id="strat-report" style="font-size: 12px; color: #b0bacd; margin-bottom: 12px;"></p>

              <!-- 野戦治療 -->
              <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--surface-border); border-radius: 10px; padding: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 12px; font-weight: bold; color: #34d399;">🏥 隊長のおごり治療 (未完治兵士を全快)</div>
                  <div style="font-size: 10px; color: #889;">各自の自費治療で足りない負傷を一括手当て</div>
                </div>
                <button id="btn-heal-all" class="mini-btn" style="background:#10b981; color:#fff;">おごる (25G)</button>
              </div>

              <!-- 隊長武勲（撃墜数ボーナス）ボックス -->
              <div id="player-record-box" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 7px 10px; margin-bottom: 10px; font-size: 11px;"></div>

              <!-- タブ切り替え -->
              <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                <button id="tab-strat-squad" class="sub-tab-btn active">👥 部隊名簿＆サイフ</button>
                <button id="tab-strat-equip" class="sub-tab-btn">🎒 装備＆鍛冶屋</button>
              </div>

              <!-- 部隊名簿 ＆ 叙勲タブ -->
              <div id="view-strat-squad">
                <div style="font-size: 11px; color: #aaa; margin-bottom: 6px;">
                  💡 2回以上生き残った兵士は「叙勲」で名前と二つ名が授与され大幅強化！
                </div>
                <div id="squad-roster-list" class="squad-list-box" style="margin-bottom: 12px; max-height: 200px; overflow-y: auto;"></div>
              </div>

              <!-- 装備タブ -->
              <div id="view-strat-equip" class="hidden">
                <div id="player-equip-box" class="reward-box" style="margin-bottom: 10px;"></div>
                <div style="font-size: 11px; font-weight: bold; color: #889; margin-bottom: 6px;">【所持品バッグ】(タップで装備)</div>
                <div id="inventory-list" class="squad-list-box" style="margin-bottom: 12px; max-height: 140px; overflow-y: auto;"></div>
              </div>

              <button id="btn-start-next-wave" class="action-btn" style="margin-top: 4px;">次の戦場へ出動！</button>
              <button id="btn-close-strat" class="action-btn secondary hidden" style="margin-top: 6px;">戦場に戻る</button>
              <button id="btn-restart-from-strat" class="action-btn secondary" style="margin-top: 10px; border-color: rgba(239, 68, 68, 0.4); color: #f87171;">🔄 新兵として最初からやり直す</button>
            </div>
          </div>

          <!-- ゲームオーバー画面 -->
          <div id="game-overlay" class="game-overlay hidden">
            <div class="overlay-content">
              <h2 class="overlay-title">討死</h2>
              <p class="overlay-score">到達WAVE: <span id="final-wave">1</span></p>
              <p style="font-size: 13px; color: #aaa; margin-bottom: 4px;">最終階級: <strong id="final-rank" style="color:#ffaa00;">-</strong></p>
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">
                討伐戦果: ⚔️ 雑魚 <strong id="final-minions" style="color:#fff;">0</strong>体 / 👑 ボス <strong id="final-bosses" style="color:#ffd700;">0</strong>体
              </p>
              <p id="overlay-veteran-note" style="font-size: 11px; color: #38bdf8; margin-bottom: 14px;">※生存兵士は次戦に先輩として引き継がれます</p>
              <button id="btn-restart" class="action-btn">新兵として再入隊</button>
              <button id="btn-overlay-back" class="action-btn secondary">工房へ戻る</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => {
      sound.playTap();
      this.saveGame();
      this.destroy();
      this.onBackToHub();
    });

    document.getElementById('btn-strategy').addEventListener('click', () => {
      sound.playTap();
      this.openStrategyModal(true);
    });

    const restartStratBtn = document.getElementById('btn-restart-from-strat');
    if (restartStratBtn) {
      restartStratBtn.addEventListener('click', () => {
        sound.playTap();
        document.getElementById('strategy-modal').classList.add('hidden');
        this.clearSavedGame();
        this.startFreshGame();
      });
    }

    document.getElementById('btn-restart').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('game-overlay').classList.add('hidden');
      this.startFreshGame();
    });

    document.getElementById('btn-overlay-back').addEventListener('click', () => {
      sound.playTap();
      this.destroy();
      this.onBackToHub();
    });

    document.getElementById('btn-start-next-wave').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('strategy-modal').classList.add('hidden');
      this.startNextWave();
    });

    document.getElementById('btn-close-strat').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('strategy-modal').classList.add('hidden');
      this.inBattle = true;
    });

    document.getElementById('btn-heal-all').addEventListener('click', () => {
      this.healAllSquad();
    });

    // 号令ボタン（伍長以上）
    const cmdBtn = document.getElementById('btn-pad-command');
    if (cmdBtn) {
      cmdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerCommand();
      });
    }

    // 手動攻撃ボタン
    const atkBtn = document.getElementById('btn-pad-attack');
    if (atkBtn) {
      const handleManualAttack = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sound.unlock();
        this.manualAttack();
      };
      atkBtn.addEventListener('mousedown', handleManualAttack);
      atkBtn.addEventListener('touchstart', handleManualAttack, { passive: false });
    }


    // タブ切り替え
    const tabSquad = document.getElementById('tab-strat-squad');
    const tabEquip = document.getElementById('tab-strat-equip');
    const viewSquad = document.getElementById('view-strat-squad');
    const viewEquip = document.getElementById('view-strat-equip');

    tabSquad.addEventListener('click', () => {
      sound.playTap();
      tabSquad.classList.add('active');
      tabEquip.classList.remove('active');
      viewSquad.classList.remove('hidden');
      viewEquip.classList.add('hidden');
    });

    tabEquip.addEventListener('click', () => {
      sound.playTap();
      tabEquip.classList.add('active');
      tabSquad.classList.remove('active');
      viewEquip.classList.remove('hidden');
      viewSquad.classList.add('hidden');
    });

    const zoomBtn = document.getElementById('btn-zoom-toggle');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playTap();
        this.toggleZoom();
      });
    }
  },

  toggleZoom() {
    this.zoomIndex = ((this.zoomIndex || 0) + 1) % this.zoomLevels.length;
    this.setZoom(this.zoomLevels[this.zoomIndex]);
  },

  setZoom(val) {
    this.zoom = Math.max(0.65, Math.min(1.65, Number(val.toFixed(2))));
    const btn = document.getElementById('btn-zoom-toggle');
    if (btn) btn.textContent = `🔍 ${this.zoom.toFixed(2)}x`;
    const labels = { '0.75': '広域俯瞰', '1.00': '標準', '1.25': '近接', '1.50': '超拡大' };
    const label = labels[this.zoom.toFixed(2)] || '任意倍率';
    this.showToast(`🔍 カメラ倍率: ${this.zoom.toFixed(2)}x (${label})`);
  },

  setupGame() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasContainer = document.getElementById('canvas-container');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.resizeCanvas = () => {
      const rect = this.canvasContainer ? this.canvasContainer.getBoundingClientRect() : null;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.width = (rect && rect.width > 10) ? rect.width : (window.innerWidth > 10 ? window.innerWidth : 390);
      this.height = (rect && rect.height > 10) ? rect.height : (window.innerHeight > 90 ? window.innerHeight - 80 : 600);
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);

    // 画面切り替え（タブ・別アプリ移動からの復帰）時のデルタタイム＆リサイズ安全化
    this.handleVisibility = () => {
      if (!document.hidden) {
        this.lastTime = performance.now();
        if (this.resizeCanvas) this.resizeCanvas();
      }
    };
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.buildTerrain();
    this.setupInput();
    this.startGameLoop();
  },

  startGameLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.running = true;
    this.lastTime = performance.now();
    this.loop = (t) => {
      if (!this.running) return;
      const dt = Math.max(0.001, Math.min((t - this.lastTime) / 1000, 0.1));
      this.lastTime = t;
      try {
        this.update(dt);
        this.render();
        this.renderMinimap();
      } catch (err) {
        console.error('Frame loop exception caught and recovered:', err);
      }
      this.animFrameId = requestAnimationFrame(this.loop);
    };
    this.animFrameId = requestAnimationFrame(this.loop);
  },

  stopGameLoop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  },

  startFreshGame() {
    this.wave = 1;
    this.exp = 0;
    this.gold = 50;
    this.rankIndex = 0;
    this.inBattle = true;
    this.commandActiveUntil = 0;

    // 主人公（一介の二等雑兵）
    this.player = {
      x: BASE_CAMP.x - 20,
      y: BASE_CAMP.y - 20,
      level: 1,
      exp: 0,
      reqExp: 20,
      minionKills: 0,
      bossKills: 0,
      kills: 0,
      survivedWaves: 0,
      hp: 130,
      maxHp: 130,
      def: 0,
      atk: 25,
      atkSpeed: 1.0,
      speed: 165, // 部隊(105px/s)より快適に速く動ける基礎速度
      atkCooldown: 0,
      crit: 10,
      vampire: 0,
      lightning: false,
      dmgReduction: 0,
      slashAngle: 0,
      slashAnim: 0,
      facingAngle: 0
    };

    // 兜、鎧、脚、手、盾、武器、装飾の7スロット
    this.equipped = {
      weapon: null,
      shield: null,
      helmet: null,
      armor: null,
      gloves: null,
      legs: null,
      amulet: null
    };

    this.inventory = [];
    this.projectiles = []; // 弓矢・ヒール光弾

    // 先輩兵士引き継ぎチェック
    const veterans = storage.get('ironsquad_veterans_backup', null);
    this.squad = [];
    let hasVeterans = false;

    if (veterans && Array.isArray(veterans) && veterans.length > 0) {
      hasVeterans = true;
      veterans.forEach((vet) => {
        vet.dead = false;
        vet.isDown = false;
        vet.downTimer = 0;
        vet.rescueProgress = 0;
        vet.isVeteran = true;
        vet.x = BASE_CAMP.x + (Math.random() - 0.5) * 120;
        vet.y = BASE_CAMP.y + (Math.random() - 0.5) * 120;
        this.recalcSoldierStats(vet);
        vet.hp = vet.maxHp;
        this.squad.push(vet);
      });
      storage.set('ironsquad_veterans_backup', null); // 1回引き継いだらクリア
    }

    // 定員（20名）まで新兵を補充
    let fillIndex = 1;
    while (this.squad.length < 20) {
      this.squad.push(this.createNewSoldier(this.squad.length + fillIndex));
      fillIndex++;
    }

    this.initPlatoons();
    this.initOutposts();
    this.assignWaveQuest();
    this.recalcPlayerStats();
    this.initBattlefield();
    this.saveGame();
    this.updateStatsUI();
    this.camera = { x: BASE_CAMP.x, y: BASE_CAMP.y };
    if (this.joystick) {
      this.joystick.active = false;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
    }
    const stickKnob = document.getElementById('dpad-knob');
    if (stickKnob) stickKnob.style.transform = 'translate(-50%, -50%)';

    this.startGameLoop();
    if (hasVeterans) {
      this.showToast('🎖️ 【歴戦の先輩兵士が合流！】前線部隊の古参兵たちが新兵のあなたを援護します！');
    } else {
      this.showToast('⚔️ 20名の新兵混成小隊として出動！各小隊と共闘せよ');
    }
  },

  initPlatoons() {
    this.platoons = [
      { id: 0, name: '第1小隊 (前衛突撃)', color: '#38bdf8', icon: '⚔️', x: BASE_CAMP.x + 80, y: BASE_CAMP.y - 60 },
      { id: 1, name: '第2小隊 (機動遊撃)', color: '#f59e0b', icon: '🏹', x: BASE_CAMP.x - 80, y: BASE_CAMP.y + 60 },
      { id: 2, name: '第3小隊 (本陣防衛)', color: '#34d399', icon: '🛡️', x: BASE_CAMP.x, y: BASE_CAMP.y }
    ];
  },

  initOutposts() {
    this.outposts = [
      {
        id: 'outpost_fort',
        type: 'FORT',
        name: OUTPOST_DEFS.FORT.name,
        icon: OUTPOST_DEFS.FORT.icon,
        color: OUTPOST_DEFS.FORT.color,
        x: OUTPOST_DEFS.FORT.x,
        y: OUTPOST_DEFS.FORT.y,
        hp: OUTPOST_DEFS.FORT.maxHp,
        maxHp: OUTPOST_DEFS.FORT.maxHp,
        radius: OUTPOST_DEFS.FORT.radius,
        cleared: false,
        clearedWave: 0
      },
      {
        id: 'outpost_cage',
        type: 'CAGE',
        name: OUTPOST_DEFS.CAGE.name,
        icon: OUTPOST_DEFS.CAGE.icon,
        color: OUTPOST_DEFS.CAGE.color,
        x: OUTPOST_DEFS.CAGE.x,
        y: OUTPOST_DEFS.CAGE.y,
        hp: OUTPOST_DEFS.CAGE.maxHp,
        maxHp: OUTPOST_DEFS.CAGE.maxHp,
        radius: OUTPOST_DEFS.CAGE.radius,
        cleared: false,
        clearedWave: 0
      },
      {
        id: 'outpost_shrine',
        type: 'SHRINE',
        name: OUTPOST_DEFS.SHRINE.name,
        icon: OUTPOST_DEFS.SHRINE.icon,
        color: OUTPOST_DEFS.SHRINE.color,
        x: OUTPOST_DEFS.SHRINE.x,
        y: OUTPOST_DEFS.SHRINE.y,
        hp: OUTPOST_DEFS.SHRINE.maxHp,
        maxHp: OUTPOST_DEFS.SHRINE.maxHp,
        radius: OUTPOST_DEFS.SHRINE.radius,
        cleared: false,
        clearedWave: 0
      },
      {
        id: 'outpost_supply',
        type: 'SUPPLY',
        name: OUTPOST_DEFS.SUPPLY.name,
        icon: OUTPOST_DEFS.SUPPLY.icon,
        color: OUTPOST_DEFS.SUPPLY.color,
        x: OUTPOST_DEFS.SUPPLY.x,
        y: OUTPOST_DEFS.SUPPLY.y,
        hp: OUTPOST_DEFS.SUPPLY.maxHp,
        maxHp: OUTPOST_DEFS.SUPPLY.maxHp,
        radius: OUTPOST_DEFS.SUPPLY.radius,
        cleared: false,
        clearedWave: 0
      }
    ];
  },

  assignWaveQuest() {
    if (!this.outposts) this.initOutposts();
    const unclearedOutposts = this.outposts.filter(o => !o.cleared);
    let chosenTemplate = null;

    if (unclearedOutposts.length > 0 && Math.random() < 0.8) {
      const targetOp = unclearedOutposts[Math.floor(Math.random() * unclearedOutposts.length)];
      chosenTemplate = QUEST_TEMPLATES.find(q => q.targetType === targetOp.type) || QUEST_TEMPLATES[0];
    } else {
      chosenTemplate = QUEST_TEMPLATES[QUEST_TEMPLATES.length - 1]; // 掃討作戦
    }

    this.currentQuest = {
      ...chosenTemplate,
      completed: false,
      currentKills: 0
    };

    this.updateQuestUI();
  },

  updateQuestUI() {
    const banner = document.getElementById('quest-banner');
    const statusEl = document.getElementById('quest-status');
    const titleEl = document.getElementById('quest-title');
    const descEl = document.getElementById('quest-desc');
    if (!banner || !this.currentQuest) return;

    titleEl.textContent = this.currentQuest.title;

    if (this.currentQuest.completed) {
      statusEl.className = 'quest-status completed';
      statusEl.textContent = '達成！';
      descEl.textContent = `報奨金+${this.currentQuest.rewardGold}G / 武勲+${this.currentQuest.rewardExp}`;
    } else {
      statusEl.className = 'quest-status';
      statusEl.textContent = '遂行中';
      if (this.currentQuest.targetType) {
        const op = this.outposts.find(o => o.type === this.currentQuest.targetType);
        if (op) {
          const px = this.player ? this.player.x : BASE_CAMP.x;
          const py = this.player ? this.player.y : BASE_CAMP.y;
          const dist = Math.floor(Math.hypot(op.x - px, op.y - py));
          descEl.textContent = `${op.name}へ進軍！(残${Math.floor(op.hp)}HP / 距離${dist}m)`;
        } else {
          descEl.textContent = this.currentQuest.desc;
        }
      } else if (this.currentQuest.targetKills) {
        descEl.textContent = `敵掃討: ${this.currentQuest.currentKills || 0} / ${this.currentQuest.targetKills}体`;
      }
    }
  },

  damageOutpost(outpost, rawDmg) {
    if (!outpost || outpost.cleared) return;
    outpost.hp -= rawDmg;
    this.spawnDamageText(outpost.x, outpost.y - 15, Math.floor(rawDmg), '#ffd700');
    sound.playHit(0);
    this.spawnSparks(outpost.x, outpost.y, outpost.color, 4);

    if (outpost.hp <= 0) {
      outpost.hp = 0;
      outpost.cleared = true;
      outpost.clearedWave = this.wave;
      this.clearOutpost(outpost);
    }
    this.updateQuestUI();
  },

  clearOutpost(outpost) {
    sound.playHighScore();
    this.spawnSparks(outpost.x, outpost.y, outpost.color, 24);

    if (outpost.type === 'FORT') {
      const bonusG = 95 + this.wave * 15;
      this.gold += bonusG;
      for (let k = 0; k < 3; k++) {
        const dropItem = generateRandomDrop(Math.max(this.wave, 3));
        this.dropsOnField.push({
          x: outpost.x + (Math.random() - 0.5) * 60,
          y: outpost.y + (Math.random() - 0.5) * 60,
          item: dropItem,
          isBoss: k === 0
        });
      }
      this.showToast(`🏴【前線砦陥落！】+${bonusG}G獲得！レア武具宝箱を大量鹵獲！`);
    } else if (outpost.type === 'CAGE') {
      const newS1 = this.createNewSoldier(this.squad.length + 1);
      const newS2 = this.createNewSoldier(this.squad.length + 2);
      newS1.x = outpost.x - 15; newS1.y = outpost.y;
      newS2.x = outpost.x + 15; newS2.y = outpost.y;
      this.squad.push(newS1, newS2);
      this.showToast(`⛓️【捕虜救出成功！】友軍兵士【${newS1.name}】【${newS2.name}】が即座に部隊合流！`);
    } else if (outpost.type === 'SHRINE') {
      if (this.equipped) {
        Object.keys(this.equipped).forEach(k => {
          if (this.equipped[k]) applyUpgradeStats(this.equipped[k], (this.equipped[k].upgrade || 0) + 1);
        });
      }
      this.squad.forEach(s => {
        if (!s.dead && s.equipped) {
          Object.keys(s.equipped).forEach(k => {
            if (s.equipped[k]) applyUpgradeStats(s.equipped[k], (s.equipped[k].upgrade || 0) + 1);
          });
          this.recalcSoldierStats(s);
        }
      });
      this.recalcPlayerStats();
      this.showToast(`🏛️【神聖鍛冶の奇跡！】古代祭壇の祝福により、全軍の全装備が一斉に+1強化！`);
    } else if (outpost.type === 'SUPPLY') {
      this.player.hp = this.player.maxHp;
      this.squad.forEach(s => {
        if (!s.dead) {
          s.hp = s.maxHp;
          s.gold = (s.gold || 0) + 18;
        }
      });
      this.showToast(`📦【兵站奪還完了！】部隊全員のHPが全快！兵士各自に臨時給与+18G支給！`);
    }

    if (this.currentQuest && !this.currentQuest.completed && this.currentQuest.targetType === outpost.type) {
      this.completeQuest();
    }
  },

  completeQuest() {
    if (!this.currentQuest || this.currentQuest.completed) return;
    this.currentQuest.completed = true;
    sound.playHighScore();
    const gReward = this.currentQuest.rewardGold || 70;
    const expReward = this.currentQuest.rewardExp || 30;
    this.gold += gReward;
    this.gainExp(expReward);
    this.showToast(`🎉【軍令達成！】司令部より特別武勲金+${gReward}G＆功績EXP+${expReward}授与！`);
    this.updateStatsUI();
    this.updateQuestUI();
  },

  recalcPlayerStats() {
    if (!this.player) return;
    const rank = RANKS[this.rankIndex] || RANKS[0];
    const lv = this.player.level || 1;
    const waves = this.player.survivedWaves || 0;
    const minionKills = this.player.minionKills || 0;
    const bossKills = this.player.bossKills || 0;

    // 雑魚撃墜枠ボーナス (倒した数で地道に鍛錬)
    const minionAtk = Math.floor(minionKills / 5) * 1;
    const minionHp = Math.floor(minionKills / 15) * 10;
    const minionSpeed = Math.min(25, Math.floor(minionKills / 30) * 2);

    // ボス撃破枠ボーナス (討伐による英雄の覚醒)
    const bossAtk = bossKills * 8;
    const bossHp = bossKills * 50;
    const bossCrit = bossKills * 2;
    const bossReduction = Math.min(30, bossKills * 2); // 被ダメ軽減率(%)

    // 全部位装備ボーナス (武器, 盾, 兜, 鎧, 手, 脚, 装飾)
    let equipDef = 0;
    let equipHp = 0;
    let equipAtk = 0;
    let equipSpeed = 0;
    let equipAtkSpeed = 0;
    let equipVampire = 0;
    let equipCrit = 10;
    let equipBlock = 0;
    let equipLightning = false;

    if (this.equipped) {
      Object.keys(SLOT_INFO).forEach((slotKey) => {
        const item = this.equipped[SLOT_INFO[slotKey].key];
        if (item && item.stats) {
          if (item.stats.def) equipDef += item.stats.def;
          if (item.stats.hp) equipHp += item.stats.hp;
          if (item.stats.atk) equipAtk += item.stats.atk;
          if (item.stats.speed) equipSpeed += item.stats.speed;
          if (item.stats.atkSpeed) equipAtkSpeed += item.stats.atkSpeed;
          if (item.stats.vampire) equipVampire += item.stats.vampire;
          if (item.stats.crit) equipCrit += item.stats.crit;
          if (item.stats.blockChance) equipBlock += item.stats.blockChance;
          if (item.stats.lightning) equipLightning = true;
        }
      });
    }

    // 最大HPの更新
    const oldMaxHp = this.player.maxHp || 130;
    const newMaxHp = 130 + rank.bonusHp + (lv - 1) * 16 + waves * 20 + minionHp + bossHp + equipHp;
    this.player.maxHp = newMaxHp;
    if (this.player.hp > newMaxHp) {
      this.player.hp = newMaxHp;
    } else if (newMaxHp > oldMaxHp) {
      this.player.hp = Math.min(newMaxHp, this.player.hp + (newMaxHp - oldMaxHp));
    }

    this.player.def = equipDef;
    this.player.atk = 25 + rank.bonusAtk + (lv - 1) * 4 + waves * 4 + minionAtk + bossAtk + equipAtk;
    this.player.speed = 165 + minionSpeed + equipSpeed;
    this.player.atkSpeed = 1.0 + equipAtkSpeed * 0.01;
    this.player.crit = equipCrit + bossCrit;
    this.player.vampire = equipVampire;
    this.player.lightning = equipLightning;
    this.player.dmgReduction = Math.min(45, bossReduction + Math.floor(equipBlock * 0.3));
    this.player.kills = minionKills + bossKills;
  },

  recalcSoldierStats(s) {
    if (!s) return;
    const lv = s.level || 1;
    const waves = s.survivedWaves || 0;
    const minionKills = s.minionKills || 0;
    const bossKills = s.bossKills || 0;
    const clsKey = s.soldierClass || 'HEAVY';
    const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;

    // 雑魚撃墜枠ボーナス
    const minionAtk = Math.floor(minionKills / 5) * 1;
    const minionHp = Math.floor(minionKills / 15) * 6;

    // ボス撃破枠ボーナス (大金星ボーナス)
    const bossAtk = bossKills * 8;
    const bossHp = bossKills * 45;
    const bossReduction = Math.min(30, bossKills * 3);

    // 叙勲ボーナス
    const honorHp = s.isNamed ? 50 : 0;
    const honorAtk = s.isNamed ? 15 : 0;
    const honorDef = s.isNamed ? 12 : 0;

    // 先輩ボーナス
    const vetHp = s.isVeteran ? 30 : 0;
    const vetAtk = s.isVeteran ? 6 : 0;
    const vetDef = s.isVeteran ? 8 : 0;

    // 全部位装備ボーナス
    let equipDef = 0;
    let equipHp = 0;
    let equipAtk = 0;
    let equipSpeed = 0;
    let equipBlock = 0;

    if (!s.equipped) s.equipped = { weapon: s.weapon || null, shield: null, helmet: null, armor: null, gloves: null, legs: null, amulet: null };
    if (s.weapon && !s.equipped.weapon) s.equipped.weapon = s.weapon;
    if (s.equipped.weapon) s.weapon = s.equipped.weapon;

    Object.keys(SLOT_INFO).forEach((slotKey) => {
      const item = s.equipped[SLOT_INFO[slotKey].key];
      if (item && item.stats) {
        if (item.stats.def) equipDef += item.stats.def;
        if (item.stats.hp) equipHp += item.stats.hp;
        if (item.stats.atk) equipAtk += item.stats.atk;
        if (item.stats.speed) equipSpeed += item.stats.speed;
        if (item.stats.blockChance) equipBlock += item.stats.blockChance;
      }
    });

    const oldMaxHp = s.maxHp || 70;
    const newMaxHp = 70 + (cls.bonusHp || 0) + (lv - 1) * 8 + waves * 14 + minionHp + bossHp + honorHp + vetHp + equipHp;
    s.maxHp = newMaxHp;
    if (s.hp > newMaxHp) {
      s.hp = newMaxHp;
    } else if (newMaxHp > oldMaxHp) {
      s.hp = Math.min(newMaxHp, s.hp + (newMaxHp - oldMaxHp));
    }

    s.def = (cls.bonusDef || 0) + honorDef + vetDef + equipDef;
    s.atk = 11 + (cls.bonusAtk || 0) + (lv - 1) * 2 + waves * 3 + minionAtk + bossAtk + honorAtk + vetAtk + equipAtk;
    s.speed = (cls.speed || 100) + equipSpeed;
    s.dmgReduction = Math.min(45, bossReduction + Math.floor(equipBlock * 0.3));
    s.crit = 10 + (cls.bonusCrit || 0);
    s.kills = minionKills + bossKills;

    // 衛生兵（MEDIC）の回復力（Heal Power）計算：レベル・武器強化・上位ティアで超強化！
    if (clsKey === 'MEDIC') {
      const wItem = s.equipped ? s.equipped.weapon : null;
      const wAtk = wItem && wItem.stats ? (wItem.stats.atk || 0) : 0;
      const wUp = wItem ? (wItem.upgrade || 0) : 0;
      const wTier = wItem ? (wItem.tier || 1) : 1;
      // 基礎回復26 + Lv上昇(+7/Lv) + 生存ウェーブ(+6/Wave) + ボス撃破(+18/Boss) + 杖ATK*1.6 + 強化値*12 + Tier*9
      s.healPower = Math.floor(
        26 +
        (lv - 1) * 7 +
        waves * 6 +
        minionKills * 0.5 +
        bossKills * 18 +
        wAtk * 1.6 +
        wUp * 12 +
        (wTier - 1) * 9 +
        (s.isNamed ? 30 : 0) +
        (s.isVeteran ? 15 : 0)
      );
    }

    // 称号の動的更新
    if (!s.isNamed) {
      const prefix = s.isVeteran ? '⭐歴戦' : '';
      if (bossKills > 0) {
        s.rankTitle = `${prefix}👑巨頭狩り (${cls.name})`;
      } else if (minionKills >= 30) {
        s.rankTitle = `${prefix}⚔️百人斬り (${cls.name})`;
      } else if (waves >= 2) {
        s.rankTitle = `${prefix}🎖️叙勲候補 (${cls.name})`;
      } else {
        s.rankTitle = `${prefix}${cls.name}`;
      }
    }
  },

  resumeSavedGame() {
    const saved = storage.get('ironsquad_save_data_v3', null);
    if (!saved) {
      this.startFreshGame();
      return;
    }

    this.wave = saved.wave || 1;
    this.exp = saved.exp || 0;
    this.gold = saved.gold || 50;
    this.rankIndex = saved.rankIndex || 0;
    this.equipped = saved.equipped || { weapon: null, armor: null, amulet: null };
    this.inventory = saved.inventory || [];
    this.squad = saved.squad || [];

    // 既存セーブの兵士データを補填（レベル・財布・キル数・武勲）
    this.squad.forEach((s) => {
      if (s.level === undefined) s.level = 1;
      if (s.exp === undefined) s.exp = 0;
      if (s.reqExp === undefined) s.reqExp = 14;
      if (s.minionKills === undefined) s.minionKills = s.kills || 0;
      if (s.bossKills === undefined) s.bossKills = 0;
      if (s.kills === undefined) s.kills = (s.minionKills || 0) + (s.bossKills || 0);
      if (s.gold === undefined) s.gold = 15 + Math.floor(Math.random() * 15);
      if (s.medCooldown === undefined) s.medCooldown = 0;
      this.recalcSoldierStats(s);
    });

    const pSave = saved.player || {};
    this.player = {
      x: BASE_CAMP.x - 20,
      y: BASE_CAMP.y - 20,
      level: pSave.level || 1,
      exp: pSave.exp || 0,
      reqExp: pSave.reqExp || 20,
      minionKills: pSave.minionKills !== undefined ? pSave.minionKills : (pSave.kills || 0),
      bossKills: pSave.bossKills || 0,
      kills: (pSave.minionKills !== undefined ? pSave.minionKills : (pSave.kills || 0)) + (pSave.bossKills || 0),
      survivedWaves: pSave.survivedWaves || 0,
      hp: pSave.hp || 130,
      maxHp: pSave.maxHp || 130,
      atk: 25,
      atkSpeed: 1.0,
      speed: 165,
      atkCooldown: 0,
      crit: 10,
      vampire: 0,
      lightning: false,
      dmgReduction: 0,
      slashAngle: 0,
      slashAnim: 0,
      facingAngle: 0
    };

    this.initPlatoons();
    if (saved.outposts) {
      this.outposts = saved.outposts;
    } else {
      this.initOutposts();
    }
    if (saved.currentQuest) {
      this.currentQuest = saved.currentQuest;
      this.updateQuestUI();
    } else {
      this.assignWaveQuest();
    }
    this.recalcPlayerStats();
    if (pSave.hp) this.player.hp = Math.min(this.player.maxHp, pSave.hp);

    this.initBattlefield();
    this.updateStatsUI();
    this.camera = { x: BASE_CAMP.x, y: BASE_CAMP.y };
    this.startGameLoop();
    this.showToast(`💾 WAVE ${this.wave} のデータから再開しました！`);
  },

  initBattlefield() {
    this.inBattle = true;
    this.monsters = [];
    this.particles = [];
    this.damageTexts = [];
    this.dropsOnField = [];
    this.projectiles = []; // 弓矢・ヒール光弾
    this.spawnTimer = 0;
    // 敵の大増量！(従来の約2倍)
    this.waveMonsterCount = 70 + this.wave * 35;
    this.spawnedInWave = 0;
    this.waveKills = 0;
  },

  createNewSoldier(index = 1) {
    const classKeys = ['HEAVY', 'LIGHT', 'ARCHER', 'MEDIC'];
    const classKey = classKeys[(index - 1) % classKeys.length];
    const soldierCls = SOLDIER_CLASSES[classKey];
    const platoonId = (index - 1) % 3;

    // クラスごとの初期武器・初期防具の支給
    const initialEquip = {
      weapon: {
        id: Math.random().toString(36).substring(2, 9),
        name: classKey === 'ARCHER' ? '木の短弓' : (classKey === 'MEDIC' ? '樫の杖' : '木の短剣'),
        baseName: classKey === 'ARCHER' ? '木の短弓' : (classKey === 'MEDIC' ? '樫の杖' : '木の短剣'),
        type: 'WEAPON',
        tier: 1,
        upgrade: 0,
        mat: '木/布',
        color: '#94a3b8',
        stats: { atk: classKey === 'ARCHER' ? 12 : (classKey === 'LIGHT' ? 14 : (classKey === 'HEAVY' ? 10 : 8)) }
      },
      shield: classKey === 'HEAVY' ? {
        id: Math.random().toString(36).substring(2, 9),
        name: '木の丸盾',
        baseName: '木の丸盾',
        type: 'SHIELD',
        tier: 1,
        upgrade: 0,
        mat: '木/布',
        color: '#94a3b8',
        stats: { def: 15, hp: 30, blockChance: 25 }
      } : null,
      helmet: null,
      armor: {
        id: Math.random().toString(36).substring(2, 9),
        name: '布の服',
        baseName: '布の服',
        type: 'ARMOR',
        tier: 1,
        upgrade: 0,
        mat: '木/布',
        color: '#94a3b8',
        stats: { def: 8, hp: 25 }
      },
      gloves: null,
      legs: null,
      amulet: null
    };

    const soldier = {
      id: Math.random().toString(36).substring(2, 9),
      isNamed: false,
      isVeteran: false,
      title: '',
      name: `兵士#${index}`,
      soldierClass: classKey,
      platoonId,
      survivedWaves: 0,
      level: 1,
      exp: 0,
      reqExp: 14,
      minionKills: 0,
      bossKills: 0,
      kills: 0,
      gold: 18 + Math.floor(Math.random() * 18),
      medCooldown: 0,
      rankTitle: `${soldierCls.name}`,
      hp: 75,
      maxHp: 75,
      def: 0,
      atk: 12,
      dmgReduction: 0,
      equipped: initialEquip,
      weapon: initialEquip.weapon,
      atkCooldown: 0,
      facingAngle: 0,
      atkAnim: 0,
      x: BASE_CAMP.x + (Math.random() - 0.5) * 120,
      y: BASE_CAMP.y + (Math.random() - 0.5) * 120,
      vx: 0,
      vy: 0,
      isDown: false,
      downTimer: 0,
      rescueProgress: 0,
      dead: false
    };

    this.recalcSoldierStats(soldier);
    soldier.hp = soldier.maxHp;
    return soldier;
  },

  saveGame() {
    try {
      const data = {
        wave: this.wave,
        exp: this.exp,
        gold: this.gold,
        rankIndex: this.rankIndex,
        player: {
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          level: this.player.level || 1,
          exp: this.player.exp || 0,
          reqExp: this.player.reqExp || 20,
          minionKills: this.player.minionKills || 0,
          bossKills: this.player.bossKills || 0,
          kills: this.player.kills || 0,
          survivedWaves: this.player.survivedWaves || 0
        },
        equipped: this.equipped,
        inventory: this.inventory,
        squad: this.squad.filter(s => !s.dead),
        outposts: this.outposts,
        currentQuest: this.currentQuest
      };
      storage.set('ironsquad_save_data_v3', data);
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  clearSavedGame() {
    storage.set('ironsquad_save_data_v3', null);
  },

  setupInput() {
    this.joystick = { active: false, x: 0, y: 0, dirX: 0, dirY: 0 };

    const stickBase = document.getElementById('dpad-base');
    const stickKnob = document.getElementById('dpad-knob');

    // 下部バーチャルアナログパッドのタッチハンドラ
    if (stickBase && stickKnob) {
      let touchId = null;

      const handleStickStart = (e) => {
        sound.unlock();
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches ? e.touches[0] : e;
        if (e.touches) touchId = touch.identifier;
        updateStick(touch);
      };

      const handleStickMove = (e) => {
        if (!this.joystick.active) return;
        e.preventDefault();
        e.stopPropagation();
        let touch = e;
        if (e.touches) {
          for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === touchId) {
              touch = e.touches[i];
              break;
            }
          }
        }
        updateStick(touch);
      };

      const handleStickEnd = (e) => {
        this.joystick.active = false;
        this.joystick.dirX = 0;
        this.joystick.dirY = 0;
        touchId = null;
        stickKnob.style.transform = 'translate(-50%, -50%)';
      };

      const updateStick = (pointer) => {
        const rect = stickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = pointer.clientX - centerX;
        const dy = pointer.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const maxRadius = rect.width * 0.42;

        this.joystick.active = true;
        if (dist > 0) {
          this.joystick.dirX = dx / Math.max(dist, 1);
          this.joystick.dirY = dy / Math.max(dist, 1);
        } else {
          this.joystick.dirX = 0;
          this.joystick.dirY = 0;
        }

        const clampedDist = Math.min(dist, maxRadius);
        const knobX = (dx / (dist || 1)) * clampedDist;
        const knobY = (dy / (dist || 1)) * clampedDist;
        stickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      };

      stickBase.addEventListener('mousedown', handleStickStart);
      window.addEventListener('mousemove', handleStickMove);
      window.addEventListener('mouseup', handleStickEnd);

      stickBase.addEventListener('touchstart', handleStickStart, { passive: false });
      window.addEventListener('touchmove', handleStickMove, { passive: false });
      window.addEventListener('touchend', handleStickEnd);
      window.addEventListener('touchcancel', handleStickEnd);
    }

    // キャンバス上の直接スワイプ ＆ ピンチズーム ＆ ホイールズーム
    let canvasDown = false;
    let originX = 0, originY = 0;
    let pinchStartDist = null;
    let pinchStartZoom = 1.0;

    const onCanvasStart = (e) => {
      // コントローラー以外の場所を触った時
      if (e.target.closest('#virtual-gamepad') || e.target.closest('#strategy-modal')) return;
      sound.unlock();

      if (e.touches && e.touches.length >= 2) {
        // 2本指ピンチ開始
        canvasDown = false;
        this.joystick.active = false;
        const t0 = e.touches[0], t1 = e.touches[1];
        pinchStartDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        pinchStartZoom = this.zoom || 1.0;
        return;
      }

      canvasDown = true;
      const pos = this.getEventPos(e);
      originX = pos.x;
      originY = pos.y;
      this.joystick.active = true;
    };

    const onCanvasMove = (e) => {
      if (e.touches && e.touches.length >= 2 && pinchStartDist) {
        if (e.cancelable) e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        const curDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const ratio = curDist / Math.max(15, pinchStartDist);
        const newZoom = Math.max(0.65, Math.min(1.65, pinchStartZoom * ratio));
        this.zoom = Number(newZoom.toFixed(2));
        const btn = document.getElementById('btn-zoom-toggle');
        if (btn) btn.textContent = `🔍 ${this.zoom.toFixed(2)}x`;
        return;
      }

      if (!canvasDown) return;
      const pos = this.getEventPos(e);
      const dx = pos.x - originX;
      const dy = pos.y - originY;
      const dist = Math.hypot(dx, dy);
      if (dist > 5) {
        this.joystick.dirX = dx / dist;
        this.joystick.dirY = dy / dist;
      }
    };

    const onCanvasEnd = (e) => {
      if (e.touches && e.touches.length < 2) {
        pinchStartDist = null;
      }
      if (!e.touches || e.touches.length === 0) {
        canvasDown = false;
        this.joystick.active = false;
        this.joystick.dirX = 0;
        this.joystick.dirY = 0;
        pinchStartDist = null;
      }
    };

    const onWheel = (e) => {
      if (e.cancelable) e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      this.setZoom(Math.max(0.65, Math.min(1.65, (this.zoom || 1.0) + delta)));
    };

    this.boundDown = onCanvasStart;
    this.boundMove = onCanvasMove;
    this.boundUp = onCanvasEnd;
    this.boundWheel = onWheel;

    this.canvas.addEventListener('mousedown', onCanvasStart);
    window.addEventListener('mousemove', onCanvasMove);
    window.addEventListener('mouseup', onCanvasEnd);

    this.canvas.addEventListener('touchstart', onCanvasStart, { passive: false });
    window.addEventListener('touchmove', onCanvasMove, { passive: false });
    window.addEventListener('touchend', onCanvasEnd);
    window.addEventListener('touchcancel', onCanvasEnd);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });
  },

  getEventPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  },

  getNearestUnclearedOutpost(x, y) {
    if (!this.outposts) return null;
    let nearest = null;
    let minDist = 9999;
    for (const op of this.outposts) {
      if (op.cleared) continue;
      const d = Math.hypot(op.x - x, op.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = op;
      }
    }
    return nearest;
  },

  // 右手パッド手動攻撃
  manualAttack() {
    if (!this.inBattle) return;
    this.player.slashAnim = 1;
    const nearest = this.getNearestMonster(this.player.x, this.player.y);
    const nearestOp = this.getNearestUnclearedOutpost(this.player.x, this.player.y);

    if (nearest && Math.hypot(nearest.x - this.player.x, nearest.y - this.player.y) <= 110) {
      this.player.slashAngle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
      this.performAttack(this.player, nearest, true);
    } else if (nearestOp && Math.hypot(nearestOp.x - this.player.x, nearestOp.y - this.player.y) <= nearestOp.radius + 60) {
      this.player.slashAngle = Math.atan2(nearestOp.y - this.player.y, nearestOp.x - this.player.x);
      sound.playSlash();
      this.damageOutpost(nearestOp, this.player.atk * 1.5);
    } else {
      sound.playSlash();
      // 向いている方向へ素振り
      if (this.joystick.dirX !== 0 || this.joystick.dirY !== 0) {
        this.player.slashAngle = Math.atan2(this.joystick.dirY, this.joystick.dirX);
      }
    }
  },

  // 伍長以上の号令発動（呼集の笛）
  triggerCommand() {
    const currentRank = RANKS[this.rankIndex];
    if (!currentRank.canCommand) return;

    sound.playLaunch();
    this.commandActiveUntil = performance.now() + 6000;
    this.showToast(`📢 呼集の笛！「隊長だ！こちらへ集まれ！」`);
  },

  updateStatsUI() {
    const rank = RANKS[this.rankIndex];
    const pLv = this.player ? (this.player.level || 1) : 1;
    document.getElementById('player-rank').textContent = `${rank.title} [Lv.${pLv}]`;
    document.getElementById('current-wave').textContent = this.wave;
    const aliveCount = this.squad ? this.squad.filter(s => !s.dead).length : 0;
    document.getElementById('squad-alive').textContent = `${aliveCount}/${rank.maxSquad}`;
    document.getElementById('current-gold').textContent = `${this.gold}G`;

    // 号令ボタンの表示切替
    const cmdBtn = document.getElementById('btn-pad-command');
    if (cmdBtn) {
      if (rank.canCommand) {
        cmdBtn.classList.remove('hidden');
      } else {
        cmdBtn.classList.add('hidden');
      }
    }
  },

  startNextWave() {
    this.wave++;
    if (this.wave > this.highWave) {
      this.highWave = this.wave;
      storage.set('ironsquad_max_wave', this.highWave);
    }

    this.inBattle = true;
    this.spawnedInWave = 0;
    this.waveKills = 0;
    this.waveMonsterCount = 70 + this.wave * 35; // 敵大増量維持

    this.player.hp = this.player.maxHp;

    // 過去に制圧された拠点の再活性化（2 WAVE以上経過した拠点が再占拠されて復活！）
    if (this.outposts) {
      this.outposts.forEach(op => {
        if (op.cleared && (this.wave - (op.clearedWave || 0)) >= 2) {
          op.cleared = false;
          op.hp = op.maxHp;
        }
      });
    } else {
      this.initOutposts();
    }
    this.assignWaveQuest();

    // 戦死者の補充（部隊定員まで新兵を補充）
    const currentMax = RANKS[this.rankIndex].maxSquad;
    this.squad = this.squad.filter(s => !s.dead);
    let newCount = 1;
    while (this.squad.length < currentMax) {
      this.squad.push(this.createNewSoldier(this.squad.length + newCount));
      newCount++;
    }

    this.saveGame();
    this.updateStatsUI();
  },

  spawnPack(size) {
    const side = Math.floor(Math.random() * 4);
    let cx, cy;
    if (side === 0) { cx = 100 + Math.random() * (MAP_WIDTH - 200); cy = 60; }
    else if (side === 1) { cx = MAP_WIDTH - 60; cy = 100 + Math.random() * (MAP_HEIGHT - 200); }
    else if (side === 2) { cx = 100 + Math.random() * (MAP_WIDTH - 200); cy = MAP_HEIGHT - 60; }
    else { cx = 60; cy = 100 + Math.random() * (MAP_HEIGHT - 200); }
    for (let i = 0; i < size && this.spawnedInWave < this.waveMonsterCount; i++) {
      this.spawnMonster(cx + (Math.random() - 0.5) * 90, cy + (Math.random() - 0.5) * 90);
    }
  },

  spawnMonster(px, py) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (px !== undefined) { x = px; y = py; }
    else if (side === 0) { x = Math.random() * MAP_WIDTH; y = 40; }
    else if (side === 1) { x = MAP_WIDTH - 40; y = Math.random() * MAP_HEIGHT; }
    else if (side === 2) { x = Math.random() * MAP_WIDTH; y = MAP_HEIGHT - 40; }
    else { x = 40; y = Math.random() * MAP_HEIGHT; }
    x = Math.max(30, Math.min(MAP_WIDTH - 30, x));
    y = Math.max(30, Math.min(MAP_HEIGHT - 30, y));

    const isBoss = (this.wave % 5 === 0) && (this.spawnedInWave === this.waveMonsterCount - 1);
    const isElite = Math.random() < Math.min(0.3, 0.12 + this.wave * 0.015);

    let type = 'goblin';
    let hp = 55 + this.wave * 17;
    let atk = 14 + this.wave * 4;
    let speed = 76 + Math.random() * 20;
    let radius = 11;
    let color = '#34d399';

    if (isBoss) {
      type = 'dragon';
      hp = (220 + this.wave * 70) * 4;
      atk = 34 + this.wave * 8;
      speed = 56;
      radius = 26;
      color = '#ef4444';
    } else if (isElite) {
      type = 'orc';
      hp = (60 + this.wave * 26) * 2;
      atk = 24 + this.wave * 5;
      speed = 64;
      radius = 16;
      color = '#f59e0b';
    }

    this.monsters.push({
      x, y,
      hp, maxHp: hp,
      atk, speed,
      radius, color,
      type, isBoss, isElite,
      hitPulse: 0
    });
    this.spawnedInWave++;
  },

  update(dt) {
    if (!this.inBattle) return;

    const aliveSquad = this.squad.filter(s => !s.dead);
    const now = performance.now();
    const isCommandActive = now < this.commandActiveUntil;
    const currentRank = RANKS[this.rankIndex];

    // 部隊の重心を計算
    let squadCenterX = BASE_CAMP.x;
    let squadCenterY = BASE_CAMP.y;
    if (aliveSquad.length > 0) {
      squadCenterX = aliveSquad.reduce((sum, s) => sum + s.x, 0) / aliveSquad.length;
      squadCenterY = aliveSquad.reduce((sum, s) => sum + s.y, 0) / aliveSquad.length;
    }

    // 主人公と部隊の距離チェック
    const distToSquad = Math.hypot(this.player.x - squadCenterX, this.player.y - squadCenterY);

    // プレイヤー移動（ソロで自由に動け、部隊方向へ向かう時はダッシュ追従ブースト！）
    let playerMoveSpeed = this.player.speed;
    let isCatchingUp = false;

    if (this.joystick.active) {
      if (distToSquad > 80 && aliveSquad.length > 0) {
        // 部隊重心への方向とスティック入力の内積
        const toSquadX = (squadCenterX - this.player.x) / distToSquad;
        const toSquadY = (squadCenterY - this.player.y) / distToSquad;
        const dot = this.joystick.dirX * toSquadX + this.joystick.dirY * toSquadY;
        if (dot > 0.25) {
          // 部隊へ駆け寄っている時はダッシュブースト！（最大1.32倍 ≒ 218px/s）
          playerMoveSpeed = this.player.speed * (1.18 + dot * 0.14);
          isCatchingUp = true;
          if (Math.random() < 0.22) {
            this.particles.push({
              x: this.player.x + (Math.random() - 0.5) * 6,
              y: this.player.y + 8,
              vx: -this.joystick.dirX * 20,
              vy: -this.joystick.dirY * 20,
              color: 'rgba(210, 200, 180, 0.45)',
              size: 2.5,
              life: 0.25
            });
          }
        }
      }

      this.player.x += this.joystick.dirX * playerMoveSpeed * dt;
      this.player.y += this.joystick.dirY * playerMoveSpeed * dt;
      this.player.x = Math.max(30, Math.min(MAP_WIDTH - 30, this.player.x));
      this.player.y = Math.max(30, Math.min(MAP_HEIGHT - 30, this.player.y));

      if (Math.hypot(this.joystick.dirX, this.joystick.dirY) > 0.05) {
        this.player.facingAngle = Math.atan2(this.joystick.dirY, this.joystick.dirX);
      }
    }

    // カメラ追従（画面中央にプレイヤーを捉え、ズーム境界を安全クランプ）
    const z = this.zoom || 1.0;
    this.camera.x += (this.player.x - this.camera.x) * 0.12;
    this.camera.y += (this.player.y - this.camera.y) * 0.12;
    const halfW = (this.width / 2) / z;
    const halfH = (this.height / 2) / z;
    this.camera.x = Math.max(halfW, Math.min(MAP_WIDTH - halfW, this.camera.x));
    this.camera.y = Math.max(halfH, Math.min(MAP_HEIGHT - halfH, this.camera.y));

    // 拠点（BASE CAMP）でのリジェネ治癒判定
    const distToBase = Math.hypot(this.player.x - BASE_CAMP.x, this.player.y - BASE_CAMP.y);
    const inBaseCamp = distToBase < BASE_CAMP.radius;
    const healBadge = document.getElementById('base-heal-badge');

    if (inBaseCamp) {
      healBadge.classList.remove('hidden');
      const healAmt = 12 * dt;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
      this.squad.forEach((s) => {
        if (!s.dead) s.hp = Math.min(s.maxHp, s.hp + healAmt * 0.6);
      });
    } else {
      healBadge.classList.add('hidden');
    }

    // 直属小隊（Personal Guards）の割り当て：昇進で指揮できる人数が増加！本隊は勝手に行動！
    const maxGuards = currentRank.personalGuards || 0;
    const sortedSquad = [...aliveSquad].sort((a, b) => {
      const scoreA = (a.isNamed ? 100 : 0) + (a.isVeteran ? 50 : 0) + (a.level || 1);
      const scoreB = (b.isNamed ? 100 : 0) + (b.isVeteran ? 50 : 0) + (b.level || 1);
      return scoreB - scoreA;
    });
    aliveSquad.forEach(s => { s.isPersonalGuard = false; });
    for (let i = 0; i < Math.min(maxGuards, sortedSquad.length); i++) {
      sortedSquad[i].isPersonalGuard = true;
    }
    const personalGuardCount = aliveSquad.filter(s => s.isPersonalGuard).length;
    const mainBodyCount = aliveSquad.length - personalGuardCount;

    // プロキシミティバッジ表示
    const proxBadge = document.getElementById('squad-proximity-badge');
    if (aliveSquad.length === 0) {
      proxBadge.className = 'proximity-badge proximity-danger';
      proxBadge.textContent = '☠️ 部隊全滅！完全孤立！';
    } else if (personalGuardCount > 0) {
      proxBadge.className = 'proximity-badge proximity-close';
      proxBadge.textContent = `👑 直属小隊: ${personalGuardCount}名追従 | 🏰 本隊: ${mainBodyCount}名作戦中`;
    } else {
      proxBadge.className = 'proximity-badge proximity-far';
      proxBadge.textContent = `🗡️ 単独遊撃中 (雑兵) | 🏰 本隊: ${mainBodyCount}名作戦中`;
    }

    // 小隊（Platoons）ナビゲーション重心の更新 (本隊は独自に戦場を作戦行動！)
    if (!this.platoons) this.initPlatoons();
    const nearestGlobalMonster = this.getNearestMonster(this.player.x, this.player.y);

    this.platoons.forEach((platoon) => {
      if (isCommandActive) {
        // 号令発動中のみ一時的に主人公へ駆け寄る
        platoon.x += (this.player.x - platoon.x) * 2.2 * dt;
        platoon.y += (this.player.y - platoon.y) * 2.2 * dt;
      } else {
        if (platoon.id === 0) {
          // 第1小隊: 前衛突撃隊（軍令目標・敵砦・ボスへ向かって進軍！）
          let targetOutpost = null;
          if (this.currentQuest && !this.currentQuest.completed && this.currentQuest.targetType) {
            targetOutpost = (this.outposts || []).find(o => o.type === this.currentQuest.targetType && !o.cleared);
          }
          if (!targetOutpost) {
            targetOutpost = (this.outposts || []).find(o => !o.cleared);
          }

          const p0Boss = this.monsters.find(m => m.isBoss || m.isElite);
          const pTarget = p0Boss || targetOutpost || nearestGlobalMonster;
          if (pTarget) {
            platoon.x += (pTarget.x - platoon.x) * 1.5 * dt;
            platoon.y += (pTarget.y - platoon.y) * 1.5 * dt;
          } else {
            platoon.x = BASE_CAMP.x + 90;
            platoon.y = BASE_CAMP.y - 70;
          }
        } else if (platoon.id === 1) {
          // 第2小隊: 機動遊撃隊（ドロップ宝箱、または側面散開敵へ）
          const p1Drop = this.dropsOnField.length > 0 ? this.dropsOnField[0] : null;
          if (p1Drop) {
            platoon.x += (p1Drop.x - platoon.x) * 1.8 * dt;
            platoon.y += (p1Drop.y - platoon.y) * 1.8 * dt;
          } else if (nearestGlobalMonster) {
            platoon.x += (nearestGlobalMonster.x - platoon.x) * 1.2 * dt;
            platoon.y += (nearestGlobalMonster.y - platoon.y) * 1.2 * dt;
          } else {
            platoon.x = BASE_CAMP.x - 90;
            platoon.y = BASE_CAMP.y + 70;
          }
        } else {
          // 第3小隊: 本陣防衛隊（砦周辺260px内の敵を迎撃、いなければ哨戒）
          const nearBaseEnemy = this.monsters.find(m => Math.hypot(m.x - BASE_CAMP.x, m.y - BASE_CAMP.y) < 280);
          if (nearBaseEnemy) {
            platoon.x += (nearBaseEnemy.x - platoon.x) * 2.0 * dt;
            platoon.y += (nearBaseEnemy.y - platoon.y) * 2.0 * dt;
          } else {
            const patrolAngle = now * 0.0008;
            platoon.x = BASE_CAMP.x + Math.cos(patrolAngle) * 75;
            platoon.y = BASE_CAMP.y + Math.sin(patrolAngle) * 75;
          }
        }
      }
    });

    // 各兵士の自律行動・兵種戦闘・救助
    aliveSquad.forEach((soldier, idx) => {
      const clsKey = soldier.soldierClass || 'HEAVY';
      const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;
      const platoon = this.platoons[soldier.platoonId % 3] || this.platoons[0];

      // A. ダウン（戦闘不能）中の兵士の処理
      if (soldier.isDown) {
        soldier.downTimer -= dt;

        // 主人公による救助（接近時に救助進行）
        const distToPlayer = Math.hypot(this.player.x - soldier.x, this.player.y - soldier.y);
        if (distToPlayer < 55) {
          soldier.rescueProgress = (soldier.rescueProgress || 0) + dt * 0.85;
          if (Math.random() < 0.22) {
            this.spawnDamageText(soldier.x, soldier.y - 12, '💚救助中...', '#34d399');
          }
        }

        // 救助成功判定
        if (soldier.rescueProgress >= 1.0) {
          soldier.isDown = false;
          soldier.rescueProgress = 0;
          soldier.hp = Math.floor(soldier.maxHp * 0.35); // 最低ライフで復帰
          sound.playItem();
          this.spawnDamageText(soldier.x, soldier.y - 24, '✨ 戦線復帰！', '#34d399');
          this.showToast(`✨ 【${soldier.name}】が救助され戦線復帰した！`);
        } else if (soldier.downTimer <= 0) {
          // 救助間に合わず戦死
          soldier.isDown = false;
          soldier.dead = true;
          this.spawnSparks(soldier.x, soldier.y, '#ffffff', 14);
          this.showToast(`☠️ 【${soldier.name}】は力尽き戦死した…`);
        }
        return; // ダウン中は移動・攻撃スキップ
      }

      // 衛生兵（MEDIC）はダウン中の兵士がいると最優先で駆けつけて自動救助！
      if (clsKey === 'MEDIC') {
        const downedMate = aliveSquad.find(m => m.isDown && !m.dead);
        if (downedMate) {
          const mdx = downedMate.x - soldier.x;
          const mdy = downedMate.y - soldier.y;
          const mdist = Math.hypot(mdx, mdy);
          if (mdist > 40) {
            soldier.x += (mdx / mdist) * (soldier.speed * 1.3) * dt;
            soldier.y += (mdy / mdist) * (soldier.speed * 1.3) * dt;
            soldier.facingAngle = Math.atan2(mdy, mdx);
          } else {
            downedMate.rescueProgress = (downedMate.rescueProgress || 0) + dt * 1.1;
          }
          return;
        }
      }

      // 兵士同士のBoid反発 (団子化防止)
      for (let j = 0; j < aliveSquad.length; j++) {
        if (idx === j) continue;
        const other = aliveSquad[j];
        if (other.isDown) continue;
        const odx = soldier.x - other.x;
        const ody = soldier.y - other.y;
        const odist = Math.hypot(odx, ody);
        if (odist > 0 && odist < 22) {
          const pushForce = (22 - odist) * 2.2 * dt;
          soldier.x += (odx / odist) * pushForce;
          soldier.y += (ody / odist) * pushForce;
        }
      }

      // 携帯ポーション手当
      soldier.medCooldown = (soldier.medCooldown || 0) - dt;
      if (soldier.hp < soldier.maxHp * 0.45 && soldier.medCooldown <= 0) {
        if ((soldier.gold || 0) >= 8) {
          soldier.gold -= 8;
          soldier.medCooldown = 4.0;
          soldier.hp = Math.min(soldier.maxHp, soldier.hp + Math.floor(soldier.maxHp * 0.4));
          this.spawnDamageText(soldier.x, soldier.y - 24, '💚手当て! (-8G)', '#34d399');
          sound.playItem();
        }
      }

      // 衛生兵（MEDIC）の味方ヒール魔法 (パワーアップで回復力大幅UP！)
      if (clsKey === 'MEDIC') {
        soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
        if (soldier.atkCooldown <= 0) {
          // 治癒対象の選定（直属衛生兵はプレイヤーを最優先で手厚く保護！）
          let hurtTarget = this.player.hp < this.player.maxHp * 0.85 ? this.player : null;
          for (const m of aliveSquad) {
            if (!m.isDown && m.hp < m.maxHp * 0.75) {
              if (!hurtTarget || (m.hp / m.maxHp) < (hurtTarget.hp / hurtTarget.maxHp)) {
                hurtTarget = m;
              }
            }
          }
          if (hurtTarget && Math.hypot(hurtTarget.x - soldier.x, hurtTarget.y - soldier.y) <= 220) {
            soldier.atkCooldown = cls.atkCooldown;
            soldier.atkAnim = 1.0;
            soldier.facingAngle = Math.atan2(hurtTarget.y - soldier.y, hurtTarget.x - soldier.x);
            if (!this.projectiles) this.projectiles = [];
            const healAmt = soldier.healPower || (26 + Math.floor((soldier.atk || 12) * 1.5));
            const isHigh = healAmt >= 50;
            this.projectiles.push({
              x: soldier.x, y: soldier.y,
              target: hurtTarget,
              type: 'HEAL',
              amount: healAmt,
              speed: 260,
              color: isHigh ? '#00f0ff' : '#34d399',
              isHighHeal: isHigh
            });
            sound.playItem();
          }
        }
      }

      // 自律移動目標の決定（直属小隊ならプレイヤーに追従！本隊なら小隊重心で勝手に作戦行動！）
      let targetX, targetY;
      if (soldier.isPersonalGuard) {
        // 直属小隊: プレイヤー周囲の精鋭護衛フォーメーション
        const guardIndex = aliveSquad.filter(s => s.isPersonalGuard).indexOf(soldier);
        const guardAngle = (guardIndex * 1.25) + (now * 0.001);
        const guardDist = 32 + (guardIndex % 4) * 10;
        targetX = this.player.x + Math.cos(guardAngle) * guardDist;
        targetY = this.player.y + Math.sin(guardAngle) * guardDist;
      } else {
        // 本隊: 所属小隊の作戦重心を中心とした独立散開
        const pAngle = (idx * 1.1) + (now * 0.0006);
        const pDist = 28 + (idx % 5) * 12;
        targetX = platoon.x + Math.cos(pAngle) * pDist;
        targetY = platoon.y + Math.sin(pAngle) * pDist;
      }

      // 敵索敵
      const nearestEnemy = this.getNearestMonster(soldier.x, soldier.y);
      const enemyDist = nearestEnemy ? Math.hypot(nearestEnemy.x - soldier.x, nearestEnemy.y - soldier.y) : 9999;

      // 兵種ごとの交戦間合い
      if (nearestEnemy && enemyDist < 260) {
        if (clsKey === 'ARCHER') {
          // 弓兵: 75px未満なら後退、75〜240pxならその場で射撃
          if (enemyDist < 75) {
            targetX = soldier.x - (nearestEnemy.x - soldier.x);
            targetY = soldier.y - (nearestEnemy.y - soldier.y);
          } else if (enemyDist < 240) {
            targetX = soldier.x;
            targetY = soldier.y;
          }
        } else if (clsKey === 'HEAVY') {
          // 重装: 敵に真っ向から突進
          targetX = nearestEnemy.x;
          targetY = nearestEnemy.y;
        } else if (clsKey === 'LIGHT') {
          // 軽装: 敵の側面に回り込む
          const sideAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x) + 0.8;
          targetX = nearestEnemy.x + Math.cos(sideAngle) * 35;
          targetY = nearestEnemy.y + Math.sin(sideAngle) * 35;
        }
      }

      const dx = targetX - soldier.x;
      const dy = targetY - soldier.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const moveStep = Math.min(dist * 3.5, soldier.speed) * dt;
        soldier.x += (dx / dist) * moveStep;
        soldier.y += (dy / dist) * moveStep;
        soldier.facingAngle = Math.atan2(dy, dx);
      }

      if (soldier.atkAnim > 0) soldier.atkAnim -= dt * 5;

      // オート攻撃（弓兵は矢、近接は斬撃）
      soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
      if (nearestEnemy && soldier.atkCooldown <= 0) {
        if (clsKey === 'ARCHER' && enemyDist <= cls.range) {
          soldier.atkCooldown = cls.atkCooldown;
          soldier.atkAnim = 1.0;
          soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
          const arrowAtk = soldier.atk + (soldier.equipped && soldier.equipped.weapon ? soldier.equipped.weapon.stats.atk || 0 : (soldier.weapon ? soldier.weapon.stats.atk || 0 : 0));
          if (!this.projectiles) this.projectiles = [];
          this.projectiles.push({
            x: soldier.x, y: soldier.y,
            target: nearestEnemy,
            attacker: soldier,
            type: 'ARROW',
            damage: arrowAtk,
            speed: 360,
            color: '#e2e8f0'
          });
          sound.playSlash();
        } else if (clsKey !== 'ARCHER' && clsKey !== 'MEDIC' && enemyDist <= cls.range) {
          soldier.atkCooldown = cls.atkCooldown;
          soldier.atkAnim = 1.0;
          soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
          const totalAtk = soldier.atk + (soldier.equipped && soldier.equipped.weapon ? soldier.equipped.weapon.stats.atk || 0 : (soldier.weapon ? soldier.weapon.stats.atk || 0 : 0));
          this.performAttack(soldier, nearestEnemy, false, totalAtk);
        }

        // 敵が近くにおらず、未制圧拠点の至近距離なら拠点を攻撃！
        if (!nearestEnemy || enemyDist > 160) {
          const nearOp = this.getNearestUnclearedOutpost(soldier.x, soldier.y);
          if (nearOp && Math.hypot(nearOp.x - soldier.x, nearOp.y - soldier.y) <= nearOp.radius + 55 && soldier.atkCooldown <= 0) {
            soldier.atkCooldown = cls.atkCooldown;
            soldier.atkAnim = 1.0;
            soldier.facingAngle = Math.atan2(nearOp.y - soldier.y, nearOp.x - soldier.x);
            const totalAtk = soldier.atk + (soldier.equipped && soldier.equipped.weapon ? soldier.equipped.weapon.stats.atk || 0 : (soldier.weapon ? soldier.weapon.stats.atk || 0 : 0));
            this.damageOutpost(nearOp, totalAtk);
          }
        }
      }
    });

    // 弾丸・矢・ヒール光弾の更新
    if (this.projectiles) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        const tgt = proj.target;
        if (!tgt || (tgt.hp <= 0 && proj.type === 'ARROW')) {
          this.projectiles.splice(i, 1);
          continue;
        }

        const pdx = tgt.x - proj.x;
        const pdy = tgt.y - proj.y;
        const pdist = Math.hypot(pdx, pdy);

        if (pdist < 18) {
          this.projectiles.splice(i, 1);
          if (proj.type === 'ARROW') {
            this.performAttack(proj.attacker, tgt, false, proj.damage);
            this.spawnSparks(tgt.x, tgt.y, '#e2e8f0', 5);
          } else if (proj.type === 'HEAL') {
            tgt.hp = Math.min(tgt.maxHp, tgt.hp + proj.amount);
            const isHigh = proj.isHighHeal || proj.amount >= 50;
            const healText = isHigh ? `💚+${proj.amount}HP 大治癒!` : `+${proj.amount}HP`;
            const healColor = isHigh ? '#00f0ff' : '#34d399';
            this.spawnDamageText(tgt.x, tgt.y - 18, healText, healColor);
            this.spawnSparks(tgt.x, tgt.y, healColor, isHigh ? 12 : 6);
            if (isHigh) sound.playHighScore();
          }
        } else {
          proj.x += (pdx / pdist) * proj.speed * dt;
          proj.y += (pdy / pdist) * proj.speed * dt;
        }
      }
    }

    // 主人公の自動攻撃 (敵モンスター or 近くの未制圧拠点)
    this.player.atkCooldown -= dt;
    if (this.player.slashAnim > 0) this.player.slashAnim -= dt * 6;

    const nearestMonster = this.getNearestMonster(this.player.x, this.player.y);
    const nearestOp = this.getNearestUnclearedOutpost(this.player.x, this.player.y);

    if (nearestMonster && this.player.atkCooldown <= 0) {
      const dist = Math.hypot(nearestMonster.x - this.player.x, nearestMonster.y - this.player.y);
      if (dist <= 85) {
        this.player.atkCooldown = 0.52 / (this.player.atkSpeed || 1);
        this.player.slashAngle = Math.atan2(nearestMonster.y - this.player.y, nearestMonster.x - this.player.x);
        this.player.slashAnim = 1;
        this.performAttack(this.player, nearestMonster, true);
      }
    } else if (nearestOp && this.player.atkCooldown <= 0) {
      const distOp = Math.hypot(nearestOp.x - this.player.x, nearestOp.y - this.player.y);
      if (distOp <= nearestOp.radius + 50) {
        this.player.atkCooldown = 0.52 / (this.player.atkSpeed || 1);
        this.player.slashAngle = Math.atan2(nearestOp.y - this.player.y, nearestOp.x - this.player.x);
        this.player.slashAnim = 1;
        this.damageOutpost(nearestOp, this.player.atk);
      }
    }

    // モンスター生成 (大軍勢パック湧き - 敵増量版)
    if (this.spawnedInWave < this.waveMonsterCount) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= Math.max(0.7, 1.6 - this.wave * 0.06)) {
        this.spawnTimer = 0;
        this.spawnPack(Math.min(14, 6 + Math.floor(this.wave * 1.1)));
      }
    }

    // モンスターの追跡＆攻撃
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.hitPulse > 0) m.hitPulse -= dt * 4;

      // 生存かつダウンしていない最も近い獲物を探索
      let target = this.player;
      let minDist = Math.hypot(this.player.x - m.x, this.player.y - m.y);

      for (const s of aliveSquad) {
        if (s.isDown) continue; // ダウン中の兵士は追わない
        const d = Math.hypot(s.x - m.x, s.y - m.y);
        if (d < minDist) {
          minDist = d;
          target = s;
        }
      }

      const dx = target.x - m.x;
      const dy = target.y - m.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 12) {
        m.x += (dx / dist) * m.speed * dt;
        m.y += (dy / dist) * m.speed * dt;
      } else {
        m.atkTimer = (m.atkTimer || 0) - dt;
        if (m.atkTimer <= 0) {
          m.atkTimer = 1.0;
          this.damageTarget(target, m.atk);
        }
      }
    }

    // ドロップ回収: 1. 兵士による回収 (上位装備なら自動着替え＆強化引き継ぎ！)
    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      if (drop.isBoss) continue; // ボスドロップは兵士は触らない！

      for (const s of aliveSquad) {
        if (s.isDown) continue;
        const distS = Math.hypot(drop.x - s.x, drop.y - s.y);
        if (distS < 26) {
          const item = drop.item;
          this.dropsOnField.splice(i, 1);
          const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;

          if (slotKey) {
            if (!s.equipped) s.equipped = {};
            const curItem = s.equipped[slotKey];
            const isBetter = !curItem || item.tier > curItem.tier || (item.tier === curItem.tier && (item.upgrade || 0) > (curItem.upgrade || 0));

            if (isBetter) {
              // 上位装備に着替える！旧装備の強化値を新装備へ引き継ぐ！
              const oldUp = curItem ? (curItem.upgrade || 0) : 0;
              if (oldUp > 0) {
                applyUpgradeStats(item, Math.max(item.upgrade || 0, oldUp));
              }
              s.equipped[slotKey] = item;
              if (slotKey === 'weapon') s.weapon = item;
              this.recalcSoldierStats(s);
              this.spawnDamageText(s.x, s.y - 20, `🛡️[${item.name}]着用!`, '#38bdf8');
            } else {
              // 換金して兵士の財布へ
              const sellVal = Math.floor(8 + item.tier * 6 + (item.upgrade || 0) * 4);
              s.gold = (s.gold || 0) + sellVal;
              this.spawnDamageText(s.x, s.y - 20, `📦換金+${sellVal}G`, '#fbbf24');
            }
          }
          sound.playItem();
          break;
        }
      }
    }

    // ドロップ回収: 2. プレイヤーによる回収 (ボスドロップ ＆ 兵士が拾わなかったドロップの横取り😈)
    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      const distP = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
      if (distP < 44) {
        const item = drop.item;
        const isBossDrop = drop.isBoss;
        this.dropsOnField.splice(i, 1);
        this.collectDrop(item, isBossDrop);
      }
    }

    // ダメージテキスト
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = this.damageTexts[i];
      dtObj.y -= 28 * dt;
      dtObj.life -= dt;
      if (dtObj.life <= 0) this.damageTexts.splice(i, 1);
    }

    // パーティクル
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // ウェーブクリア判定
    if (this.spawnedInWave >= this.waveMonsterCount && this.monsters.length === 0) {
      this.completeWave();
    }
  },

  getNearestMonster(x, y) {
    let nearest = null;
    let minDist = 9999;
    for (const m of this.monsters) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = m;
      }
    }
    return nearest;
  },

  performAttack(attacker, monster, isPlayer, customAtk) {
    if (!monster || monster.hp <= 0) return;
    const baseAtk = customAtk !== undefined ? customAtk : (attacker ? (attacker.atk || 10) : 10);
    let dmg = baseAtk;
    let isCrit = false;

    if (isPlayer && Math.random() * 100 < (this.player.crit || 10)) {
      dmg = Math.floor(dmg * 2.2);
      isCrit = true;
    }

    monster.hp -= dmg;
    monster.hitPulse = 1;

    if (isPlayer) {
      sound.playSlash();
      if (this.player.vampire > 0) {
        const heal = Math.ceil(dmg * this.player.vampire);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      }
    } else {
      sound.playHit(0);
    }

    this.spawnDamageText(monster.x, monster.y - 10, dmg, isCrit ? '#ffaa00' : '#ffffff');
    this.spawnSparks(monster.x, monster.y, monster.color, 6);

    if (monster.hp <= 0) {
      this.killMonster(monster, attacker, isPlayer);
    }
  },

  damageTarget(target, rawDmg) {
    const defVal = target.def || 0;
    const defFactor = 100 / (100 + defVal * 1.2);
    const reduction = target.dmgReduction ? Math.min(0.40, target.dmgReduction / 100) : 0;
    const dmg = Math.max(1, Math.round(rawDmg * defFactor * (1 - reduction)));
    target.hp -= dmg;
    this.spawnDamageText(target.x, target.y - 12, dmg, '#ff3344');
    sound.playBomb();

    if (target.hp <= 0) {
      if (target === this.player) {
        this.player.hp = 0;
        this.gameOver();
      } else {
        if (!target.isDown) {
          target.hp = 0;
          target.isDown = true;
          target.downTimer = 14.0;
          target.rescueProgress = 0;
          sound.playHit(1);
          this.spawnDamageText(target.x, target.y - 20, '🆘 行動不能！', '#f87171');
          const nameDisp = target.isNamed ? `【${target.title}${target.name}】` : target.name;
          this.showToast(`🆘 ${nameDisp}が倒れた！救助せよ！（猶予14秒）`);
        }
      }
    }
  },

  killMonster(monster, attacker, isPlayer) {
    const idx = this.monsters.indexOf(monster);
    if (idx !== -1) this.monsters.splice(idx, 1);
    this.waveKills++;

    // 掃討軍令の進捗カウント
    if (this.currentQuest && !this.currentQuest.completed && this.currentQuest.targetKills) {
      this.currentQuest.currentKills = (this.currentQuest.currentKills || 0) + 1;
      if (this.currentQuest.currentKills >= this.currentQuest.targetKills) {
        this.completeQuest();
      } else {
        this.updateQuestUI();
      }
    }

    const isBoss = !!monster.isBoss;
    const isElite = !!monster.isElite;

    const expBase = isBoss ? 65 : (isElite ? 16 : 4);
    const expGain = Math.max(2, Math.round(expBase * (1 + this.wave * 0.08)));
    const goldGain = isBoss ? 70 : (isElite ? 18 : (4 + Math.floor(this.wave * 0.4)));

    // 軸1: 【敵を倒したらレベルアップ】＆【撃墜したキャラにお金が入る】
    // 軸4: 【撃墜数パワーアップ（雑魚枠とボス枠で別）】
    if (isPlayer) {
      this.gold += goldGain;
      this.player.exp = (this.player.exp || 0) + expGain;
      this.spawnDamageText(monster.x, monster.y - 16, `+${goldGain}G`, '#ffe600');

      if (isBoss) {
        this.player.bossKills = (this.player.bossKills || 0) + 1;
        sound.playHighScore();
        this.spawnDamageText(this.player.x, this.player.y - 36, '👑 巨頭討伐！ ATK+8/HP+50', '#ffd700');
        this.showToast('👑【巨頭撃破ボーナス！】ボス討伐武勲！(ATK+8, MaxHP+50, 会心+2%, 被ダメ軽減+2%)');
      } else {
        this.player.minionKills = (this.player.minionKills || 0) + 1;
        const mK = this.player.minionKills;
        if (mK % 5 === 0) {
          this.spawnDamageText(this.player.x, this.player.y - 20, `⚔️ 雑魚武勲! ATK+1`, '#60a5fa');
        }
        if (mK % 15 === 0) {
          this.spawnDamageText(this.player.x, this.player.y - 32, `❤️ 体躯錬磨! HP+10`, '#34d399');
        }
      }

      // プレイヤーのレベルアップ判定 (無限ループ・NaN防止ガード)
      let pGuard = 0;
      while (this.player.exp >= (this.player.reqExp || 20) && pGuard++ < 30) {
        const req = Math.max(10, this.player.reqExp || 20);
        this.player.exp -= req;
        this.player.level = (this.player.level || 1) + 1;
        this.player.reqExp = Math.floor(req * 1.45 + 10);
        sound.playHighScore();
        this.spawnDamageText(this.player.x, this.player.y - 30, `⚡ Lv.${this.player.level} UP!`, '#34d399');
        this.showToast(`⚡ レベルアップ！ Lv.${this.player.level} に到達！ (HP+16, ATK+4)`);
      }

      this.recalcPlayerStats();
    } else if (attacker && !attacker.dead) {
      // 兵士がトドメを刺した！
      attacker.gold = (attacker.gold || 0) + goldGain;
      attacker.exp = (attacker.exp || 0) + expGain;
      this.spawnDamageText(monster.x, monster.y - 16, `+${goldGain}G`, '#ffd700');

      if (isBoss) {
        attacker.bossKills = (attacker.bossKills || 0) + 1;
        attacker.gold = (attacker.gold || 0) + 50; // 討伐臨時ボーナス
        if (!attacker.isNamed) {
          attacker.isNamed = true;
          attacker.title = '巨頭狩り';
          attacker.name = attacker.name.includes('#') ? NAMES[Math.floor(Math.random() * NAMES.length)] : attacker.name;
        }
        sound.playHighScore();
        this.spawnDamageText(attacker.x, attacker.y - 32, '👑 ボス討伐英雄！', '#ffd700');
        this.showToast(`👑 大金星！兵士【${attacker.name}】がボスにトドメ！(ATK+8, HP+45, 50Gボーナス)`);
      } else {
        attacker.minionKills = (attacker.minionKills || 0) + 1;
        const mK = attacker.minionKills;
        if (mK % 5 === 0) {
          this.spawnDamageText(attacker.x, attacker.y - 20, `⚔️ ATK+1!`, '#60a5fa');
        }
      }

      // 兵士のレベルアップ判定 (無限ループ・NaN防止ガード)
      let sGuard = 0;
      while (attacker.exp >= (attacker.reqExp || 14) && sGuard++ < 30) {
        const req = Math.max(8, attacker.reqExp || 14);
        attacker.exp -= req;
        attacker.level = (attacker.level || 1) + 1;
        attacker.reqExp = Math.floor(req * 1.5 + 8);
        this.spawnDamageText(attacker.x, attacker.y - 25, `⚡ Lv.${attacker.level}!`, '#00f0ff');
      }

      this.recalcSoldierStats(attacker);
    }

    // 部隊全体の戦果として昇進EXPを加算
    this.gainExp(expGain);
    this.updateStatsUI();

    // ドロップアイテム生成
    const dropRate = isBoss ? 1.0 : (isElite ? 0.75 : 0.16);
    if (Math.random() < dropRate) {
      const dropItem = generateRandomDrop(this.wave);
      this.dropsOnField.push({
        x: monster.x,
        y: monster.y,
        item: dropItem,
        isBoss
      });
    }

    this.spawnSparks(monster.x, monster.y, monster.color, 14);
  },

  gainExp(amt) {
    this.exp += amt;
    let rankGuard = 0;
    while (this.rankIndex < RANKS.length - 1 && this.exp >= RANKS[this.rankIndex + 1].reqExp && rankGuard++ < 20) {
      this.rankIndex++;
      const nextRank = RANKS[this.rankIndex];
      this.recalcPlayerStats();
      this.player.hp = this.player.maxHp;
      sound.playHighScore();
      this.showToast(`🎖️ 【昇進】${nextRank.title}へ！${nextRank.canCommand ? '号令解禁！' : ''}`);
      this.saveGame();
      this.updateStatsUI();
    }
  },

  collectDrop(item, isBossDrop = false) {
    sound.playItem();
    if (!this.inventory) this.inventory = [];
    this.inventory.push(item);

    let autoEquipped = false;
    const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;
    if (slotKey && !this.equipped[slotKey]) {
      this.equipItem(item);
      autoEquipped = true;
    }

    let toastText = '';
    if (isBossDrop) {
      toastText = `👑【ボス戦利品獲得！】[T${item.tier} ${item.mat}] ${item.name}！`;
    } else {
      toastText = `😈 [T${item.tier} ${item.mat}] ${item.name} を横取り！${autoEquipped ? ' (即装備)' : ''}`;
    }
    this.showToast(toastText);
    this.saveGame();
  },

  equipItem(item, inheritUpgradeFromCurrent = false) {
    const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;
    if (!slotKey) return;

    const curItem = this.equipped[slotKey];
    if (inheritUpgradeFromCurrent && curItem && (curItem.upgrade || 0) > (item.upgrade || 0)) {
      const inheritedVal = curItem.upgrade;
      applyUpgradeStats(item, inheritedVal);
      applyUpgradeStats(curItem, 0);
      this.showToast(`✨ 旧装備の強化値(+${inheritedVal})を引き継いで「${item.name}」を装備！`);
    }

    this.equipped[slotKey] = item;
    this.recalcPlayerStats();
    sound.playTap();
    this.saveGame();
    this.updateStatsUI();
  },

  inheritUpgrade(sourceItem, targetItem) {
    if (!sourceItem || !targetItem) return;
    const srcUp = sourceItem.upgrade || 0;
    const tgtUp = targetItem.upgrade || 0;
    if (srcUp <= tgtUp) {
      alert('引き継ぎ元の強化値が対象より低いため引き継げません');
      return;
    }
    applyUpgradeStats(targetItem, srcUp);
    applyUpgradeStats(sourceItem, 0);
    this.recalcPlayerStats();
    sound.playHighScore();
    this.showToast(`✨ 鍛冶屋の魔術！「${sourceItem.name}」の強化値を「${targetItem.name}」へ引き継ぎました！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  grantSoldierHonor(soldierId) {
    const s = this.squad.find(s => s.id === soldierId);
    if (!s || s.isNamed) return;

    s.isNamed = true;
    s.title = TITLES[Math.floor(Math.random() * TITLES.length)];
    s.name = NAMES[Math.floor(Math.random() * NAMES.length)];
    s.rankTitle = '叙勲勇士';
    this.recalcSoldierStats(s);
    s.hp = s.maxHp;

    sound.playHighScore();
    this.showToast(`✨ 【叙勲】${s.title}${s.name} が誕生した！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  getUpgradeCost(item) {
    const up = item.upgrade || 0;
    return Math.floor(12 * Math.pow(1.5, up) * Math.max(1, item.tier * 0.75));
  },

  upgradeItem(item, isFree = false) {
    const cost = this.getUpgradeCost(item);
    if (!isFree && this.gold < cost) {
      alert(`軍資金が足りません (必要: ${cost}G)`);
      return false;
    }
    if (!isFree) this.gold -= cost;

    const nextUp = (item.upgrade || 0) + 1;
    applyUpgradeStats(item, nextUp);

    sound.playHighScore();
    this.showToast(`🔨 鍛冶完了！「${item.name}」に強化成功！`);

    this.recalcPlayerStats();
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  upgradeSoldierEquip(soldierId, slotKey = 'weapon') {
    const s = this.squad.find(sol => sol.id === soldierId);
    if (!s || !s.equipped || !s.equipped[slotKey]) return;
    const item = s.equipped[slotKey];
    const cost = this.getUpgradeCost(item);
    if ((s.gold || 0) < cost) {
      alert(`兵士の予算が足りません (兵士所持金: ${s.gold || 0}G / 必要: ${cost}G)`);
      return;
    }
    s.gold -= cost;
    applyUpgradeStats(item, (item.upgrade || 0) + 1);
    this.recalcSoldierStats(s);
    sound.playHighScore();
    this.showToast(`🔨 ${s.name}が自費で「${item.name}」を強化！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  healAllSquad() {
    if (this.gold < 25) {
      alert('軍資金が足りません (必要: 25G)');
      return;
    }
    this.gold -= 25;
    sound.playItem();
    this.player.hp = this.player.maxHp;
    this.squad.forEach((s) => {
      if (!s.dead) s.hp = s.maxHp;
    });
    this.showToast('💚 隊長のおごりで全員の野戦治療が完了しました！');
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
  },

  giveItemToSoldier(soldierId, item) {
    const soldier = this.squad.find(s => s.id === soldierId);
    if (!soldier) return;
    const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : null;
    if (!slotKey) return;

    if (!soldier.equipped) soldier.equipped = {};
    soldier.equipped[slotKey] = item;
    if (slotKey === 'weapon') soldier.weapon = item;
    this.recalcSoldierStats(soldier);
    this.inventory = this.inventory.filter(i => i.id !== item.id);
    sound.playHighScore();
    this.showToast(`🛡️ ${soldier.isNamed ? soldier.name : soldier.name}に「${item.name}」を支給！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  completeWave() {
    this.inBattle = false;
    sound.playHighScore();
    this.gold += 35; // 隊長基本給

    // 軸2: 【ウェーブを生き抜いたらステータスアップ】
    this.player.survivedWaves = (this.player.survivedWaves || 0) + 1;
    this.recalcPlayerStats();
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45);

    // 各兵士の自費治療 ＆ 生還ステータスアップ ＆ 自費自動強化
    let fullHealedCount = 0;
    let brokeSoldiersCount = 0;
    let autoUpgradedCount = 0;

    this.squad.forEach((s) => {
      if (!s.dead) {
        // 生還ステータスアップ
        s.survivedWaves = (s.survivedWaves || 0) + 1;
        this.recalcSoldierStats(s);

        // 自費治療 (HP欠損 10 あたり 2G)
        const missingHp = s.maxHp - s.hp;
        if (missingHp > 0) {
          const treatCost = Math.ceil(missingHp / 10) * 2;
          if ((s.gold || 0) >= treatCost) {
            s.gold -= treatCost;
            s.hp = s.maxHp;
            fullHealedCount++;
          } else {
            // 払える分だけ手当て
            const affordableHeal = Math.floor((s.gold || 0) / 2) * 10;
            s.hp = Math.min(s.maxHp, s.hp + affordableHeal);
            s.gold = (s.gold || 0) % 2;
            brokeSoldiersCount++;
          }
        } else {
          fullHealedCount++;
        }

        // 兵士の自費自動強化 (予備資金を残して装備を自動強化！)
        if (s.equipped) {
          Object.keys(s.equipped).forEach((k) => {
            const eqItem = s.equipped[k];
            if (eqItem) {
              const upCost = this.getUpgradeCost(eqItem);
              if ((s.gold || 0) >= upCost + 12) {
                s.gold -= upCost;
                applyUpgradeStats(eqItem, (eqItem.upgrade || 0) + 1);
                autoUpgradedCount++;
              }
            }
          });
          this.recalcSoldierStats(s);
        }
      }
    });

    this.treatmentReport = { fullHealedCount, brokeSoldiersCount, autoUpgradedCount };
    this.saveGame();
    this.openStrategyModal(false);
  },

  openStrategyModal(isManualOpen = false) {
    const modal = document.getElementById('strategy-modal');
    const titleEl = document.getElementById('strat-title');
    const reportEl = document.getElementById('strat-report');
    const nextBtn = document.getElementById('btn-start-next-wave');
    const closeBtn = document.getElementById('btn-close-strat');

    if (isManualOpen) {
      titleEl.textContent = '⛺ 本陣戦略会議 (駐屯中)';
      reportEl.textContent = '装備の強化鍛冶、武器防具の支給、兵士の叙勲や治療を行えます。';
      nextBtn.classList.add('hidden');
      closeBtn.classList.remove('hidden');
      this.inBattle = false;
    } else {
      titleEl.textContent = `⚔️ WAVE ${this.wave} 突破！本陣帰還`;
      const alive = this.squad.filter(s => !s.dead);
      const deadCount = this.squad.length - alive.length;
      const clearedOps = (this.outposts || []).filter(o => o.cleared).length;
      const questStatusText = (this.currentQuest && this.currentQuest.completed)
        ? `<span style="color:#00ffaa;">達成！(+${this.currentQuest.rewardGold}G / 武勲+${this.currentQuest.rewardExp})</span>`
        : `<span style="color:#f59e0b;">未達 (次戦継続)</span>`;
      reportEl.innerHTML = `
        激戦を生き延びた！ 生存部隊: <strong style="color:#00ffaa;">${alive.length}名</strong> ${deadCount > 0 ? `<span style="color:#ff4444;">(${deadCount}名戦死 / 次戦新兵補充)</span>` : ''}<br>
        🗺️ <strong style="color:#ffd700;">【戦場制圧状況】</strong>拠点制圧: <strong style="color:#fff;">${clearedOps} / 4箇所</strong> | 📜 軍令: ${questStatusText}<br>
        🛡️ <strong style="color:#38bdf8;">【生還ボーナス】</strong>全員のステータス向上！(あなた: HP+20, ATK+4 / 兵士: HP+14, ATK+3)<br>
        🏥 <strong style="color:#34d399;">【宿営手当て】</strong>各自の予算で治療完了（自費全快: <strong>${rep.fullHealedCount}名</strong> / 資金不足: <strong style="color:#f59e0b;">${rep.brokeSoldiersCount}名</strong>）<br>
        🔨 <strong style="color:#fbbf24;">【自費強化】</strong>兵士たちが予算で装備を自発的に強化！（計 <strong>${rep.autoUpgradedCount}件</strong> 成功）
      `;
      nextBtn.classList.remove('hidden');
      closeBtn.classList.add('hidden');
    }

    this.renderStrategyUI();
    modal.classList.remove('hidden');
  },

  renderStrategyUI() {
    document.getElementById('strat-gold').textContent = this.gold;

    const pRecordBox = document.getElementById('player-record-box');
    if (pRecordBox && this.player) {
      const p = this.player;
      const minionAtk = Math.floor((p.minionKills || 0) / 5) * 1;
      const minionHp = Math.floor((p.minionKills || 0) / 15) * 10;
      const minionSpd = Math.min(25, Math.floor((p.minionKills || 0) / 30) * 2);
      const bossAtk = (p.bossKills || 0) * 8;
      const bossHp = (p.bossKills || 0) * 50;
      const bossCrit = (p.bossKills || 0) * 2;
      const bossRed = Math.min(30, (p.bossKills || 0) * 2);

      pRecordBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <strong style="color: #38bdf8; font-size: 12px;">🎖️ 隊長の総合武勲（撃墜数ボーナス＆防御力）</strong>
          <span style="color: #94a3b8; font-size: 10px;">総討伐: ${p.kills || 0}体</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3px; color: #cbd5e1; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span>🛡️ 防御力: <strong style="color: #38bdf8;">DEF ${p.def || 0}</strong> (軽減-${p.dmgReduction || 0}%)</span>
            <span>❤️ HP: <strong style="color: #34d399;">${Math.floor(p.hp)}/${p.maxHp}</strong> | ⚔️ ATK: <strong style="color: #fff;">${p.atk}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>⚔️ 雑魚撃墜: <strong style="color: #fff;">${p.minionKills || 0}体</strong></span>
            <span style="color: #6ee7b7;">(+${minionAtk}攻 / +${minionHp}HP / +${minionSpd}速)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>👑 ボス撃破: <strong style="color: #ffd700;">${p.bossKills || 0}体</strong></span>
            <span style="color: #fde047;">(+${bossAtk}攻 / +${bossHp}HP / 会心+${bossCrit}% / 軽減-${bossRed}%)</span>
          </div>
        </div>
      `;
    }

    const eq = this.equipped;
    const playerEquipBox = document.getElementById('player-equip-box');
    
    const slotsConfig = [
      { key: 'weapon', label: '武器', icon: '🗡️' },
      { key: 'shield', label: '盾', icon: '🛡️' },
      { key: 'helmet', label: '兜', icon: '🪖' },
      { key: 'armor', label: '鎧', icon: '🥋' },
      { key: 'gloves', label: '手', icon: '🧤' },
      { key: 'legs', label: '脚', icon: '🥾' },
      { key: 'amulet', label: '装飾', icon: '📿' }
    ];

    const renderEquipRow = (slotDef) => {
      const item = eq[slotDef.key];
      if (!item) {
        return `
          <div style="font-size: 11px; margin-bottom: 5px; color: #64748b; display:flex; justify-content:space-between; align-items:center;">
            <span>${slotDef.icon} ${slotDef.label}: <em>(未装備)</em></span>
          </div>`;
      }
      const cost = this.getUpgradeCost(item);
      const st = item.stats || {};
      let statParts = [];
      if (st.atk) statParts.push(`+${st.atk}攻`);
      if (st.def) statParts.push(`+${st.def}防`);
      if (st.hp) statParts.push(`+${st.hp}HP`);
      if (st.speed) statParts.push(`+${st.speed}速`);
      if (st.blockChance) statParts.push(`盾防${st.blockChance}%`);
      const statText = statParts.join(' ') || '装備品';

      return `
        <div style="font-size: 11px; margin-bottom: 5px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 2px 4px; border-radius:4px;">
          <div>
            <span style="color:${item.color}; font-weight:bold;">${slotDef.icon} [T${item.tier}] ${item.name}</span>
            <span style="color:#94a3b8; font-size:10px; margin-left:4px;">(${statText})</span>
          </div>
          <button class="mini-btn btn-up-equipped" data-slot="${slotDef.key}" style="background:#f59e0b; color:#0b0d14; font-size:10px; padding:2px 6px;">🔨 強化 [${cost}G]</button>
        </div>`;
    };

    playerEquipBox.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: #ffaa00; margin-bottom: 6px;">【隊長装備（全7部位）】(鍛冶屋で強化可能)</div>
      ${slotsConfig.map(s => renderEquipRow(s)).join('')}
    `;

    // 装備中アイテムの強化イベント
    playerEquipBox.querySelectorAll('.btn-up-equipped').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotKey = btn.dataset.slot;
        const item = eq[slotKey];
        if (item) this.upgradeItem(item);
      });
    });

    const invList = document.getElementById('inventory-list');
    if (!this.inventory || this.inventory.length === 0) {
      invList.innerHTML = '<div style="font-size: 11px; color: #64748b; text-align: center; padding: 8px;">バッグは空です (敵討伐や横取り😈で装備入手)</div>';
    } else {
      invList.innerHTML = '';
      this.inventory.forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 5px 6px; border-bottom: 1px solid #23273c; font-size: 11px;';
        
        const slotKey = SLOT_INFO[item.type] ? SLOT_INFO[item.type].key : 'weapon';
        const curEquipped = eq[slotKey];
        const isEquipped = curEquipped && curEquipped.id === item.id;
        const canInherit = curEquipped && !isEquipped && (curEquipped.upgrade || 0) > (item.upgrade || 0);
        const upCost = this.getUpgradeCost(item);

        const st = item.stats || {};
        let statParts = [];
        if (st.atk) statParts.push(`+${st.atk}攻`);
        if (st.def) statParts.push(`+${st.def}防`);
        if (st.hp) statParts.push(`+${st.hp}HP`);
        if (st.speed) statParts.push(`+${st.speed}速`);
        const statText = statParts.join(' ');

        itemRow.innerHTML = `
          <div>
            <span style="color: ${item.color}; font-weight: bold;">[T${item.tier}] ${item.name}</span>
            <span style="font-size: 10px; color: #94a3b8; margin-left: 3px;">(${statText})</span>
          </div>
          <div style="display:flex; gap:3px; align-items:center;">
            <button class="mini-btn btn-up-inv" style="background:#f59e0b; color:#0b0d14; font-size:10px; padding:2px 5px;">🔨 [${upCost}G]</button>
            ${isEquipped ? '<span style="color: #00ffaa; font-size: 10px;">装備中</span>' : `
              <button class="mini-btn equip-btn" style="font-size:10px; padding:2px 5px;">装備</button>
              ${canInherit ? `<button class="mini-btn inherit-btn" style="background:#8b5cf6; color:#fff; font-size:10px; padding:2px 5px;" title="現在装備の強化値を引き継いで装備">✨+${curEquipped.upgrade}引継</button>` : ''}
            `}
          </div>
        `;

        const equipBtn = itemRow.querySelector('.equip-btn');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.equipItem(item, false);
            this.renderStrategyUI();
          });
        }
        const inheritBtn = itemRow.querySelector('.inherit-btn');
        if (inheritBtn) {
          inheritBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.equipItem(item, true);
            this.renderStrategyUI();
          });
        }
        const upBtn = itemRow.querySelector('.btn-up-inv');
        if (upBtn) {
          upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.upgradeItem(item);
          });
        }
        invList.appendChild(itemRow);
      });
    }

    const squadList = document.getElementById('squad-roster-list');
    const alive = this.squad.filter(s => !s.dead);
    squadList.innerHTML = '';

    alive.forEach((s) => {
      const row = document.createElement('div');
      const isNamed = s.isNamed;
      const isDown = s.isDown;
      const clsKey = s.soldierClass || 'HEAVY';
      const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;
      const platoon = this.platoons ? this.platoons[s.platoonId % 3] : null;
      const pColor = platoon ? platoon.color : '#38bdf8';
      const pName = platoon ? platoon.name : '小隊';

      row.style.cssText = `background: ${isDown ? 'rgba(239, 68, 68, 0.1)' : (isNamed ? 'rgba(255, 170, 0, 0.08)' : 'rgba(255, 255, 255, 0.02)')}; border-radius: 8px; padding: 7px; margin-bottom: 6px; border: 1px solid ${isDown ? '#ef4444' : (isNamed ? '#ffaa00' : '#23273c')};`;

      const availableItems = (this.inventory || []).filter(i => {
        const sk = SLOT_INFO[i.type] ? SLOT_INFO[i.type].key : null;
        return sk && (!eq[sk] || eq[sk].id !== i.id);
      });

      const canHonor = !isNamed && s.survivedWaves >= 2;
      const wItem = s.equipped && s.equipped.weapon ? s.equipped.weapon : s.weapon;
      const wUpCost = wItem ? this.getUpgradeCost(wItem) : 0;
      const hasWUpBudget = wItem && (s.gold || 0) >= wUpCost;

      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; margin-bottom: 3px;">
          <span>
            ${isNamed ? '👑' : (s.bossKills > 0 ? '⭐' : cls.icon)} 
            <strong style="color: ${isNamed ? '#ffe600' : (s.bossKills > 0 ? '#38bdf8' : '#fff')};">${isNamed ? `${s.title}${s.name}` : s.name}</strong> 
            <span style="color:${pColor}; font-size: 10px; margin-left: 2px;">[${pName.split(' ')[0]}]</span>
            <span style="color:#00f0ff; font-size: 10px;">[Lv.${s.level || 1} ${cls.name}]</span>
            ${s.isPersonalGuard ? '<span style="color:#fef08a; font-weight:bold; font-size:10px;">[⭐直属]</span>' : ''}
            ${s.isVeteran ? '<span style="color:#fbbf24; font-size:9px;">(先輩)</span>' : ''}
            ${isDown ? '<span style="color:#ef4444; font-weight:bold;">[🆘負傷ダウン]</span>' : ''}
          </span>
          <span style="font-size: 10px;">💰 <strong style="color:#ffe600;">${s.gold || 0}G</strong> | ⚔️${s.minionKills || 0} 👑${s.bossKills || 0}</span>
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px; display: flex; justify-content: space-between; align-items:center;">
          <span>HP: <strong style="color:${s.hp < s.maxHp ? '#f87171' : '#34d399'};">${Math.floor(s.hp)}</strong>/${s.maxHp} | 🛡️ DEF: <strong style="color:#38bdf8;">${s.def || 0}</strong> | ATK: ${s.atk} ${clsKey === 'MEDIC' ? `| 💚回復: <strong style="color:#34d399;">${s.healPower || 26}HP</strong>` : ''}</span>
          ${wItem ? `<span style="color:${wItem.color}; font-weight:bold;">[${wItem.name}]</span>` : '<span style="color:#666;">[支給短剣]</span>'}
        </div>
        <div style="display: flex; gap: 4px; align-items: center; margin-top: 3px; flex-wrap: wrap;">
          ${canHonor ? `<button class="mini-btn btn-honor" style="background:#ffaa00; color:#0b0d14; font-size:10px;">🎖️ 名前を叙勲！</button>` : ''}
          ${wItem ? `
            <button class="mini-btn btn-soldier-up" style="background:${hasWUpBudget ? '#10b981' : '#4b5563'}; color:#fff; font-size:10px;" title="兵士が自費で武器を強化">
              🔨 武器自費強化 [${wUpCost}G]
            </button>
          ` : ''}
          ${availableItems.length > 0 ? `
            <select class="mini-select select-item-${s.id}" style="font-size: 10px; background: #141724; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px 4px; flex: 1; min-width: 110px;">
              <option value="">装備を支給...</option>
              ${availableItems.map(it => `<option value="${it.id}">[${SLOT_INFO[it.type].icon} T${it.tier}] ${it.name}</option>`).join('')}
            </select>
            <button class="mini-btn btn-give-item" style="font-size:10px;">支給</button>
          ` : ''}
        </div>
      `;

      squadList.appendChild(row);

      const honorBtn = row.querySelector('.btn-honor');
      if (honorBtn) {
        honorBtn.addEventListener('click', () => {
          this.grantSoldierHonor(s.id);
        });
      }

      const sUpBtn = row.querySelector('.btn-soldier-up');
      if (sUpBtn) {
        sUpBtn.addEventListener('click', () => {
          this.upgradeSoldierEquip(s.id, 'weapon');
        });
      }

      const giveBtn = row.querySelector('.btn-give-item');
      if (giveBtn) {
        giveBtn.addEventListener('click', () => {
          const sel = row.querySelector(`.select-item-${s.id}`);
          if (sel && sel.value) {
            const it = availableItems.find(item => item.id === sel.value);
            if (it) this.giveItemToSoldier(s.id, it);
          }
        });
      }
    });
  },

  spawnDamageText(x, y, text, color) {
    this.damageTexts.push({ x, y, text: String(text), color, life: 0.6 });
  },

  spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 140 + 40;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        size: Math.random() * 3 + 2,
        life: 0.35
      });
    }
  },

  showToast(msg) {
    const banner = document.getElementById('drop-banner');
    if (banner) {
      banner.textContent = msg;
      banner.classList.remove('hidden');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        banner.classList.add('hidden');
      }, 2500);
    }
  },

  render() {
    const now = performance.now();
    this.ctx.clearRect(0, 0, this.width, this.height);

    const z = this.zoom || 1.0;
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(z, z);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 1. 大地・戦場フィールド
    this.drawBattlefield(this.ctx, now);

    // 2. 自軍砦本陣 (治癒砦・城塞壁・風になびく王国旗)
    this.drawBaseCamp(this.ctx, now);

    // 2.5 戦場の探索拠点 (敵前線砦・捕虜の檻・古代祭壇・補給集積所)
    if (this.outposts) {
      for (const op of this.outposts) {
        this.drawOutpost(this.ctx, op, now);
      }
    }

    // 3. ドロップ宝箱
    for (const drop of this.dropsOnField) {
      this.drawChest(this.ctx, drop, now);
    }

    // 3.5 背後の樹木・岩・野営設備（主人公より奥のもの）
    const pyDepth = this.player ? this.player.y : 0;
    this.drawWorldObjects(this.ctx, now, false, pyDepth);

    // 4. キャラクター・モンスター統合 Yソート描画 (2.5D斜めアングルの前後奥行きを完全表現！)
    const renderList = [];
    if (this.monsters) {
      for (let i = 0; i < this.monsters.length; i++) {
        const m = this.monsters[i];
        renderList.push({ y: m.y, draw: () => this.drawMonster(this.ctx, m, now) });
      }
    }
    if (this.squad) {
      for (let i = 0; i < this.squad.length; i++) {
        const s = this.squad[i];
        if (!s.dead) {
          renderList.push({ y: s.y, draw: () => this.drawSoldier(this.ctx, s, now) });
        }
      }
    }
    if (this.player) {
      renderList.push({ y: this.player.y, draw: () => this.drawPlayer(this.ctx, this.player, now) });
    }

    renderList.sort((a, b) => a.y - b.y);
    for (let i = 0; i < renderList.length; i++) {
      renderList[i].draw();
    }

    // 5. 矢（ARROW）＆ ヒール光弾（HEAL）
    if (this.projectiles) {
      for (const proj of this.projectiles) {
        this.drawProjectile(this.ctx, proj, now);
      }
    }

    // 6.5 手前の樹木・岩（主人公より手前のもの。葉は半透明で視界確保）
    this.drawWorldObjects(this.ctx, now, true, pyDepth);

    // 6.7 蛍・落ち葉
    this.drawAmbientMotes(this.ctx, now);

    // 7. ダメージポップアップ
    for (const dtObj of this.damageTexts) {
      this.ctx.save();
      this.ctx.fillStyle = dtObj.color;
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
      this.ctx.restore();
    }

    // 8. パーティクル
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore(); // カメラ復元

    // 8.5 大気（昼夜の色調・霧・ビネット）
    this.drawAtmosphere(this.ctx, now);

    // 9. ジョイスティックUI
    if (this.joystick && this.joystick.active) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.x - this.joystick.dirX * 20, this.joystick.y - this.joystick.dirY * 20, 36, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.x, this.joystick.y, 16, 0, Math.PI * 2);
      this.ctx.fill();
    }
  },

  // =========================================================================
  // リッチ・プロシージャル描画システム
  // =========================================================================

  // ---- フィールド生成（起動時に1回だけ。地面は事前描画キャッシュ） ----
  buildTerrain() {
    const W = MAP_WIDTH, H = MAP_HEIGHT;
    let seed = 20261006;
    const rnd = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const bx = BASE_CAMP.x, by = BASE_CAMP.y;

    // 街道（本陣から四方へ伸びる蛇行した土の道）
    const bez = (p0, p1, p2, p3, t) => {
      const u = 1 - t;
      return {
        x: u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        y: u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      };
    };
    const roads = [
      [[bx, by], [bx + 120, by - 250], [bx - 200, by - 550], [860, -30]],
      [[bx, by], [bx + 300, by + 80], [bx + 600, by - 160], [1830, 820]],
      [[bx, by], [bx - 100, by + 260], [bx + 220, by + 560], [960, 1830]],
      [[bx, by], [bx - 300, by - 60], [bx - 620, by + 170], [-30, 980]]
    ];
    const pathPts = [];
    roads.forEach((r) => {
      for (let t = 0; t <= 1.0001; t += 0.02) pathPts.push(bez(r[0], r[1], r[2], r[3], t));
    });
    const pathDist = (x, y) => {
      let m = 1e9;
      for (const p of pathPts) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < m) m = d;
      }
      return m;
    };

    const ponds = [
      { x: 380, y: 430, rx: 130, ry: 80 },
      { x: 1430, y: 1330, rx: 150, ry: 95 },
      { x: 1380, y: 330, rx: 90, ry: 60 },
      { x: 330, y: 1400, rx: 100, ry: 70 }
    ];
    const inPond = (x, y, m = 0) => ponds.some((p) => {
      const dx = (x - p.x) / (p.rx + m), dy = (y - p.y) / (p.ry + m);
      return dx * dx + dy * dy < 1;
    });
    const ruins = [{ x: 560, y: 1180 }, { x: 1250, y: 620 }, { x: 700, y: 300 }, { x: 1500, y: 1000 }];

    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d');

    // 1) 草原ベース + 色むら
    c.fillStyle = '#1d3523';
    c.fillRect(0, 0, W, H);
    const greens = ['#27442a', '#193020', '#30522f', '#223c27', '#2d4a2a'];
    for (let i = 0; i < 460; i++) {
      const x = rnd() * W, y = rnd() * H, r = 50 + rnd() * 150, col = pick(greens);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col + 'aa');
      g.addColorStop(1, col + '00');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 55; i++) { // 枯れ草の色むら
      const x = rnd() * W, y = rnd() * H, r = 40 + rnd() * 80;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, '#5a5a2e66');
      g.addColorStop(1, '#5a5a2e00');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 2) 本陣前の踏み固められた広場
    let g = c.createRadialGradient(bx, by, 20, bx, by, 210);
    g.addColorStop(0, '#6b5a40dd');
    g.addColorStop(0.7, '#5a4a35aa');
    g.addColorStop(1, '#5a4a3500');
    c.fillStyle = g;
    c.fillRect(bx - 215, by - 215, 430, 430);

    // 3) 街道
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const widths = [[64, 'rgba(25,19,12,0.45)'], [50, '#53422d'], [38, '#6b5840']];
    widths.forEach(([w, col]) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      roads.forEach((r) => {
        c.beginPath();
        c.moveTo(r[0][0], r[0][1]);
        c.bezierCurveTo(r[1][0], r[1][1], r[2][0], r[2][1], r[3][0], r[3][1]);
        c.stroke();
      });
    });
    const pebCols = ['#8a7656', '#4d3f2c', '#9a8866', '#3a2f20'];
    roads.forEach((r) => {
      for (let t = 0; t <= 1; t += 0.006) {
        const p = bez(r[0], r[1], r[2], r[3], t);
        for (let k = 0; k < 3; k++) {
          c.fillStyle = pick(pebCols);
          c.fillRect(p.x + (rnd() - 0.5) * 44, p.y + (rnd() - 0.5) * 44, 1 + rnd() * 2, 1 + rnd() * 1.5);
        }
      }
    });

    // 4) 池
    ponds.forEach((p) => {
      c.fillStyle = '#2b2a1a';
      c.beginPath(); c.ellipse(p.x, p.y, p.rx + 18, p.ry + 14, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3e3622';
      c.beginPath(); c.ellipse(p.x, p.y, p.rx + 9, p.ry + 7, 0, 0, Math.PI * 2); c.fill();
      const wg = c.createRadialGradient(p.x - p.rx * 0.2, p.y - p.ry * 0.2, 4, p.x, p.y, p.rx);
      wg.addColorStop(0, '#1d5f7d');
      wg.addColorStop(0.7, '#124a63');
      wg.addColorStop(1, '#0b2d42');
      c.fillStyle = wg;
      c.beginPath(); c.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(160,220,240,0.18)';
      c.lineWidth = 2;
      c.beginPath(); c.ellipse(p.x, p.y, p.rx - 4, p.ry - 3, 0, 0, Math.PI * 2); c.stroke();
      // 葦
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2;
        const rx = Math.cos(a) * (p.rx + 6 + rnd() * 10), ry = Math.sin(a) * (p.ry + 4 + rnd() * 8);
        c.strokeStyle = pick(['#3f6b35', '#557a3a', '#2f5230']);
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(p.x + rx, p.y + ry);
        c.lineTo(p.x + rx + (rnd() - 0.5) * 5, p.y + ry - 8 - rnd() * 8);
        c.stroke();
      }
    });

    // 5) 草の房・花
    const tuftCols = ['#3c6b36', '#2b5230', '#4d8240', '#5a9248', '#244a2b'];
    for (let i = 0; i < 3400; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (inPond(x, y, 10)) continue;
      if (pathDist(x, y) < 30 && rnd() < 0.85) continue;
      c.strokeStyle = pick(tuftCols);
      c.lineWidth = 1.3;
      const h = 4 + rnd() * 6;
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x - 2, y - h);
      c.moveTo(x, y); c.lineTo(x + 0.5, y - h - 2);
      c.moveTo(x, y); c.lineTo(x + 2.5, y - h + 1);
      c.stroke();
    }
    const flowerCols = ['#f472b6', '#facc15', '#e2e8f0', '#a78bfa', '#fb923c'];
    for (let i = 0; i < 300; i++) {
      const cx = rnd() * W, cy = rnd() * H;
      if (inPond(cx, cy, 14) || pathDist(cx, cy) < 36) continue;
      const col = pick(flowerCols);
      for (let k = 0; k < 4; k++) {
        c.fillStyle = col;
        c.beginPath();
        c.arc(cx + (rnd() - 0.5) * 22, cy + (rnd() - 0.5) * 16, 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }

    // 6) 戦場の痕跡（焦げ跡・血痕・骨・折れた槍）
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W, y = rnd() * H, r = 16 + rnd() * 30;
      if (inPond(x, y, 20) || Math.hypot(x - bx, y - by) < 230) continue;
      const sg = c.createRadialGradient(x, y, 2, x, y, r);
      sg.addColorStop(0, 'rgba(8,8,8,0.7)');
      sg.addColorStop(1, 'rgba(8,8,8,0)');
      c.fillStyle = sg;
      c.beginPath(); c.ellipse(x, y, r, r * 0.65, rnd() * 3, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < 55; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (inPond(x, y, 10) || Math.hypot(x - bx, y - by) < 200) continue;
      c.fillStyle = 'rgba(100,15,15,0.35)';
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.ellipse(x + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 12, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, Math.PI * 2);
        c.fill();
      }
    }
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (inPond(x, y, 10) || Math.hypot(x - bx, y - by) < 230) continue;
      if (rnd() < 0.5) { // 骨
        c.strokeStyle = '#cbd5c0'; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 6, y - 2); c.lineTo(x + 6, y + 2); c.stroke();
        c.beginPath(); c.moveTo(x - 4, y + 4); c.lineTo(x + 5, y - 3); c.stroke();
        c.fillStyle = '#d7ddcf';
        c.beginPath(); c.arc(x + 9, y - 1, 3.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1a1a1a'; c.fillRect(x + 8, y - 2, 1.2, 1.4); c.fillRect(x + 10, y - 2, 1.2, 1.4);
      } else { // 折れた槍
        const a = rnd() * Math.PI;
        c.strokeStyle = '#6b4a2a'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); c.stroke();
        c.fillStyle = '#9ca3af';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(a) * 5 - 2, y - Math.sin(a) * 5); c.lineTo(x - Math.cos(a) * 5 + 2, y - Math.sin(a) * 5 + 1); c.fill();
      }
    }

    // 7) 古代遺跡（石畳・折れた石柱・瓦礫）
    ruins.forEach((r) => {
      for (let i = 0; i < 14; i++) {
        const sx = r.x + (rnd() - 0.5) * 120, sy = r.y + (rnd() - 0.5) * 90;
        c.fillStyle = pick(['#3a404a', '#343a43', '#40464f']);
        c.fillRect(sx, sy, 20 + rnd() * 16, 14 + rnd() * 10);
        c.strokeStyle = 'rgba(0,0,0,0.35)';
        c.lineWidth = 1;
        c.strokeRect(sx, sy, 22, 15);
      }
      for (let i = 0; i < 4; i++) {
        const px = r.x + (i - 1.5) * 34 + (rnd() - 0.5) * 8, py = r.y + (rnd() - 0.5) * 30;
        const ph = 18 + rnd() * 26;
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.beginPath(); c.ellipse(px + 4, py + 2, 12, 4, 0, 0, Math.PI * 2); c.fill();
        const pg = c.createLinearGradient(px - 7, 0, px + 7, 0);
        pg.addColorStop(0, '#4b5563'); pg.addColorStop(0.5, '#9ca3af'); pg.addColorStop(1, '#4b5563');
        c.fillStyle = pg;
        c.fillRect(px - 7, py - ph, 14, ph);
        c.fillStyle = '#6b7280';
        c.beginPath(); c.ellipse(px, py - ph, 7, 3, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#374151';
        c.fillRect(px - 9, py - 3, 18, 4);
        c.strokeStyle = 'rgba(0,0,0,0.4)';
        c.beginPath(); c.moveTo(px - 3, py - ph); c.lineTo(px + 1, py - ph + 8); c.lineTo(px - 2, py - ph + 14); c.stroke();
      }
      for (let i = 0; i < 16; i++) {
        c.fillStyle = pick(['#4b5563', '#374151', '#6b7280']);
        c.beginPath();
        c.arc(r.x + (rnd() - 0.5) * 130, r.y + (rnd() - 0.5) * 80 + 14, 2 + rnd() * 3, 0, Math.PI * 2);
        c.fill();
      }
      const mg = c.createRadialGradient(r.x, r.y, 5, r.x, r.y, 80);
      mg.addColorStop(0, 'rgba(70,120,60,0.22)');
      mg.addColorStop(1, 'rgba(70,120,60,0)');
      c.fillStyle = mg;
      c.fillRect(r.x - 85, r.y - 85, 170, 170);
    });

    // 8) 外周の暗い森影（マップ端の閉塞感）
    const edge = 190;
    [[0, 0, edge, H, 0], [W - edge, 0, edge, H, 1], [0, 0, W, edge, 2], [0, H - edge, W, edge, 3]].forEach(([x, y, w, h, side]) => {
      let lg;
      if (side === 0) lg = c.createLinearGradient(0, 0, edge, 0);
      else if (side === 1) lg = c.createLinearGradient(W, 0, W - edge, 0);
      else if (side === 2) lg = c.createLinearGradient(0, 0, 0, edge);
      else lg = c.createLinearGradient(0, H, 0, H - edge);
      lg.addColorStop(0, 'rgba(3,6,8,0.92)');
      lg.addColorStop(1, 'rgba(3,6,8,0)');
      c.fillStyle = lg;
      c.fillRect(x, y, w, h);
    });

    // ---- 立体オブジェクト（樹木・岩・茂み・野営設備）をY座標順に配置 ----
    const objs = [];
    const okSpot = (x, y, baseR, pathR, pondM) =>
      Math.hypot(x - bx, y - by) > baseR && pathDist(x, y) > pathR && !inPond(x, y, pondM) &&
      !ruins.some((r) => Math.hypot(x - r.x, y - r.y) < 105);
    const addTree = (x, y, big = 1) => {
      const r = rnd();
      objs.push({
        type: r < 0.56 ? 'oak' : (r < 0.9 ? 'pine' : 'dead'),
        x, y, s: (0.8 + rnd() * 0.65) * big, ph: rnd() * 6.28, tone: Math.floor(rnd() * 4)
      });
    };
    for (let gi = 0; gi < 10; gi++) { // 森の茂み
      let cx, cy, tries = 0;
      do { cx = 120 + rnd() * (W - 240); cy = 120 + rnd() * (H - 240); tries++; }
      while (tries < 30 && !okSpot(cx, cy, 380, 70, 40));
      for (let k = 0; k < 17; k++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 150;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
        if (okSpot(x, y, 240, 50, 18)) addTree(x, y);
      }
    }
    for (let i = 0; i < 110; i++) { // 散在する木
      const x = 60 + rnd() * (W - 120), y = 60 + rnd() * (H - 120);
      if (okSpot(x, y, 260, 55, 22)) addTree(x, y);
    }
    for (let i = 0; i < 190; i++) { // 外周の深い森
      const side = Math.floor(rnd() * 4), t = rnd(), depth = rnd() * 110;
      const x = side === 0 ? depth : (side === 1 ? W - depth : t * W);
      const y = side === 2 ? depth : (side === 3 ? H - depth : t * H);
      addTree(Math.max(10, Math.min(W - 10, x)), Math.max(10, Math.min(H - 10, y)), 1.25);
    }
    for (let i = 0; i < 80; i++) {
      const x = 40 + rnd() * (W - 80), y = 40 + rnd() * (H - 80);
      if (okSpot(x, y, 210, 32, 14)) objs.push({ type: 'rock', x, y, s: 0.6 + rnd() * 1.1, ph: rnd() * 6.28, tone: Math.floor(rnd() * 3) });
    }
    for (let i = 0; i < 100; i++) {
      const x = 40 + rnd() * (W - 80), y = 40 + rnd() * (H - 80);
      if (okSpot(x, y, 200, 34, 10)) objs.push({ type: 'bush', x, y, s: 0.7 + rnd() * 0.7, ph: rnd() * 6.28, tone: Math.floor(rnd() * 3) });
    }
    // 本陣の野営設備
    [[-150, '#7c2d12'], [-30, '#1e3a8a'], [158, '#14532d']].forEach(([deg, color]) => {
      const a = deg * Math.PI / 180;
      objs.push({ type: 'tent', x: bx + Math.cos(a) * 118, y: by + Math.sin(a) * 100, s: 1, color, ph: rnd() * 6 });
    });
    objs.push({ type: 'fire', x: bx + 72, y: by + 74, s: 1, ph: 1.3 });
    [45, 135, 225, 315].forEach((deg, i) => {
      const a = deg * Math.PI / 180;
      objs.push({ type: 'torch', x: bx + Math.cos(a) * 138, y: by + Math.sin(a) * 138, s: 1, ph: i * 1.7 });
    });
    objs.push({ type: 'barrel', x: bx - 82, y: by + 92, s: 1 });
    objs.push({ type: 'barrel', x: bx - 64, y: by + 100, s: 0.9 });
    objs.push({ type: 'crate', x: bx + 100, y: by - 6, s: 1 });
    objs.push({ type: 'crate', x: bx + 118, y: by + 8, s: 0.8 });
    objs.sort((a, b) => a.y - b.y);

    // 蛍・落ち葉
    const motes = [];
    for (let i = 0; i < 140; i++) motes.push({ kind: 'fly', x: rnd() * W, y: rnd() * H, ph: rnd() * 6.28, sp: 0.6 + rnd() });
    for (let i = 0; i < 55; i++) motes.push({ kind: 'leaf', x: rnd() * W, y: rnd() * H, ph: rnd() * 6.28, sp: 0.6 + rnd() });

    this.terrainCache = cv;
    this.ponds = ponds;
    this.worldObjs = objs;
    this.motes = motes;
  },

  drawBattlefield(ctx, now) {
    if (!this.terrainCache) this.buildTerrain();
    // オフスクリーン全体を安全描画（ブラウザGPUが可視範囲をハードウェアカリングするためIndexSizeErrorが絶対に起きない）
    ctx.drawImage(this.terrainCache, 0, 0);

    // 池の水面のきらめき
    if (this.ponds) {
      for (const p of this.ponds) {
        if (!p || p.rx <= 2 || p.ry <= 2) continue;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx - 2, p.ry - 2, 0, 0, Math.PI * 2);
        ctx.clip();
        for (let i = 0; i < 9; i++) {
          const t = now * 0.0007 + i * 1.9 + p.x;
          const px = p.x + Math.sin(t * 1.1) * p.rx * 0.7;
          const py = p.y + Math.cos(t * 0.9) * p.ry * 0.6;
          const a = 0.12 + 0.12 * Math.sin(t * 3);
          ctx.strokeStyle = `rgba(190,235,255,${Math.max(0, a)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(px, py, 10 + (i % 3) * 5, 3 + (i % 2) * 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  },

  drawWorldObjects(ctx, now, after, py) {
    if (!this.worldObjs) return;
    const z = this.zoom || 1.0;
    const halfW = (this.width / 2) / z + 120;
    const halfH = (this.height / 2) / z + 140;
    const vx0 = this.camera.x - halfW, vx1 = this.camera.x + halfW;
    const vy0 = this.camera.y - halfH, vy1 = this.camera.y + halfH;
    for (const o of this.worldObjs) {
      if (o.y < vy0 || o.y > vy1 || o.x < vx0 || o.x > vx1) continue;
      if ((o.y > py) !== after) continue;
      this.drawWorldObj(ctx, o, now, after);
    }
  },

  drawWorldObj(ctx, o, now, after) {
    const s = o.s || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    const sway = Math.sin(now * 0.0014 + (o.ph || 0)) * 2.2 * s;

    if (o.type === 'oak') {
      const pals = [
        ['#17361f', '#1f5a2b', '#2b7a38', '#4ba354'],
        ['#1a3a22', '#26622f', '#35853f', '#5bb35c'],
        ['#3a2a14', '#7a4a1a', '#b8661f', '#e08a35'],
        ['#16302a', '#1d5546', '#2a7a63', '#47a88a']
      ][o.tone % 4];
      ctx.fillStyle = 'rgba(0,0,0,0.33)';
      ctx.beginPath(); ctx.ellipse(4 * s, 3, 24 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3322';
      ctx.beginPath();
      ctx.moveTo(-5 * s, 2); ctx.lineTo(-3 * s, -22 * s); ctx.lineTo(3 * s, -22 * s); ctx.lineTo(5 * s, 2);
      ctx.fill();
      ctx.fillStyle = '#35241a';
      ctx.fillRect(1 * s, -20 * s, 2.5 * s, 20 * s);
      if (after) ctx.globalAlpha = 0.82;
      const blobs = [
        [0, -30, 21, 0], [-11, -37, 16, 1], [11, -36, 15, 1], [0, -48, 15, 2], [-6, -52, 7, 3]
      ];
      blobs.forEach(([bx, by, r, ci]) => {
        ctx.fillStyle = pals[ci];
        ctx.beginPath();
        ctx.arc(bx * s + sway * (0.4 + (-by) / 60), by * s, r * s, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (o.type === 'pine') {
      ctx.fillStyle = 'rgba(0,0,0,0.33)';
      ctx.beginPath(); ctx.ellipse(3 * s, 3, 18 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b2a1c';
      ctx.fillRect(-3 * s, -14 * s, 6 * s, 16 * s);
      if (after) ctx.globalAlpha = 0.82;
      const layers = [[-10, 24, '#12331f'], [-26, 20, '#17452a'], [-41, 15, '#1f5a35']];
      layers.forEach(([ly, hw, col], i) => {
        const sx = sway * (0.3 + i * 0.35);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo((-hw) * s, ly * s);
        ctx.lineTo(sx, (ly - 26) * s);
        ctx.lineTo(hw * s, ly * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(160,230,170,0.16)';
        ctx.beginPath();
        ctx.moveTo(sx, (ly - 26) * s);
        ctx.lineTo(hw * s, ly * s);
        ctx.lineTo(hw * 0.2 * s, ly * s);
        ctx.closePath();
        ctx.fill();
      });
    } else if (o.type === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(3 * s, 3, 14 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3128';
      ctx.lineCap = 'round';
      ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(1 * s, -28 * s); ctx.stroke();
      ctx.lineWidth = 2.5 * s;
      [[-1, -14, -16, -30], [1, -20, 15, -38], [0, -26, -8, -44], [1, -10, 12, -22]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1 * s, y1 * s); ctx.lineTo(x2 * s + sway * 0.3, y2 * s); ctx.stroke();
      });
    } else if (o.type === 'rock') {
      const cols = [['#4b5563', '#6b7280', '#9ca3af'], ['#44403c', '#6b645d', '#9a9288'], ['#3f4b46', '#5f7168', '#8ea398']][o.tone % 3];
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(2 * s, 3, 15 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cols[0];
      ctx.beginPath();
      ctx.moveTo(-13 * s, 1); ctx.lineTo(-10 * s, -9 * s); ctx.lineTo(-2 * s, -14 * s);
      ctx.lineTo(8 * s, -11 * s); ctx.lineTo(14 * s, -2 * s); ctx.lineTo(11 * s, 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols[1];
      ctx.beginPath();
      ctx.moveTo(-10 * s, -9 * s); ctx.lineTo(-2 * s, -14 * s); ctx.lineTo(8 * s, -11 * s); ctx.lineTo(0, -5 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cols[2];
      ctx.beginPath(); ctx.ellipse(-3 * s, -10 * s, 4 * s, 2 * s, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(80,140,60,0.5)';
      ctx.beginPath(); ctx.ellipse(-8 * s, -1 * s, 4 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === 'bush') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(1, 3, 15 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
      const cols = [['#1f4a27', '#2f6b36'], ['#2a4a1f', '#46702e'], ['#1b3f33', '#2c6a55']][o.tone % 3];
      [[-8, -5, 8], [8, -5, 8], [0, -9, 9]].forEach(([bx, by, r], i) => {
        ctx.fillStyle = cols[i === 2 ? 1 : 0];
        ctx.beginPath(); ctx.arc((bx + sway * 0.15) * s, by * s, r * s, 0, Math.PI * 2); ctx.fill();
      });
      if (o.tone === 1) {
        ctx.fillStyle = '#ef4444';
        [[-6, -8], [3, -11], [8, -4]].forEach(([bx, by]) => {
          ctx.beginPath(); ctx.arc(bx * s, by * s, 1.6, 0, Math.PI * 2); ctx.fill();
        });
      }
    } else if (o.type === 'tent') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(4, 4, 36, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.moveTo(-32, 2); ctx.lineTo(0, -40); ctx.lineTo(32, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(32, 2); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#16100c';
      ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(0, -22); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-32, 2); ctx.lineTo(0, -40); ctx.lineTo(32, 2); ctx.stroke();
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -52); ctx.stroke();
      ctx.fillStyle = '#f5d142';
      const fw = Math.sin(now * 0.01 + o.ph) * 2;
      ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(10 + fw, -49); ctx.lineTo(0, -46); ctx.closePath(); ctx.fill();
    } else if (o.type === 'barrel') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(2, 3, 11 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4423';
      ctx.fillRect(-8 * s, -16 * s, 16 * s, 18 * s);
      ctx.fillStyle = '#8a5a2e';
      ctx.beginPath(); ctx.ellipse(0, -16 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.fillRect(-8 * s, -11 * s, 16 * s, 2 * s);
      ctx.fillRect(-8 * s, -4 * s, 16 * s, 2 * s);
    } else if (o.type === 'crate') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(2, 3, 13 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(-10 * s, -18 * s, 20 * s, 20 * s);
      ctx.strokeStyle = '#4b3220';
      ctx.lineWidth = 2;
      ctx.strokeRect(-10 * s, -18 * s, 20 * s, 20 * s);
      ctx.beginPath(); ctx.moveTo(-10 * s, -18 * s); ctx.lineTo(10 * s, 2); ctx.moveTo(10 * s, -18 * s); ctx.lineTo(-10 * s, 2); ctx.stroke();
    } else if (o.type === 'torch' || o.type === 'fire') {
      const big = o.type === 'fire';
      const fl = 0.78 + 0.22 * Math.sin(now * 0.021 + o.ph) + 0.1 * Math.sin(now * 0.047 + o.ph * 2);
      if (big) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#57534e';
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 12, 2 + Math.sin(a) * 5, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(9, -3); ctx.moveTo(-9, -3); ctx.lineTo(9, 3); ctx.stroke();
      } else {
        ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -22); ctx.stroke();
        ctx.fillStyle = '#374151';
        ctx.fillRect(-3, -26, 6, 5);
      }
      const fy = big ? -4 : -28;
      const fh = (big ? 20 : 13) * fl;
      const fw = big ? 9 : 5;
      ctx.globalCompositeOperation = 'lighter';
      const gr = (big ? 120 : 80) * fl;
      const lg = ctx.createRadialGradient(0, fy, 2, 0, fy, gr);
      lg.addColorStop(0, 'rgba(255,170,60,0.38)');
      lg.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-gr, fy - gr, gr * 2, gr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-fw, fy); ctx.quadraticCurveTo(-fw * 0.6, fy - fh * 0.6, Math.sin(now * 0.02 + o.ph) * 2, fy - fh);
      ctx.quadraticCurveTo(fw * 0.6, fy - fh * 0.6, fw, fy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-fw * 0.5, fy); ctx.quadraticCurveTo(0, fy - fh * 0.8, fw * 0.5, fy); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  drawAmbientMotes(ctx, now) {
    if (!this.motes) return;
    const z = this.zoom || 1.0;
    const halfW = (this.width / 2) / z + 50;
    const halfH = (this.height / 2) / z + 50;
    const vx0 = this.camera.x - halfW, vx1 = this.camera.x + halfW;
    const vy0 = this.camera.y - halfH, vy1 = this.camera.y + halfH;
    for (const m of this.motes) {
      if (m.kind === 'fly') {
        const x = m.x + Math.sin(now * 0.0004 * m.sp + m.ph) * 45;
        const y = m.y + Math.cos(now * 0.0003 * m.sp + m.ph * 1.3) * 32;
        if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
        const a = 0.5 + 0.5 * Math.sin(now * 0.003 * m.sp + m.ph);
        if (a < 0.08) continue;
        ctx.fillStyle = `rgba(190,255,120,${0.14 * a})`;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(240,255,170,${0.85 * a})`;
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
      } else {
        const y = (m.y + now * 0.02 * m.sp) % MAP_HEIGHT;
        const x = m.x + Math.sin(now * 0.0008 * m.sp + m.ph) * 36;
        if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(now * 0.002 * m.sp + m.ph);
        ctx.fillStyle = m.ph > 3.1 ? 'rgba(200,110,40,0.75)' : 'rgba(120,150,60,0.7)';
        ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  },

  drawAtmosphere(ctx, now) {
    const W = this.width, H = this.height;
    if (!W || !H || W < 10 || H < 10) return;
    // ゆっくり移ろう昼夜（夕暮れ〜夜の青み）
    const cyc = (Math.sin(now * 0.00004) + 1) / 2;
    ctx.fillStyle = `rgba(8,14,44,${0.08 + cyc * 0.2})`;
    ctx.fillRect(0, 0, W, H);

    // 流れる霧
    for (let i = 0; i < 3; i++) {
      const x = ((now * 0.012 * (i + 1) + i * 330) % (W + 500)) - 250;
      const y = H * (0.22 + 0.28 * i);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(2.6, 1);
      const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, 110);
      fg.addColorStop(0, 'rgba(190,210,225,0.07)');
      fg.addColorStop(1, 'rgba(190,210,225,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(-110, -110, 220, 220);
      ctx.restore();
    }

    // ビネット（画面端を暗く＝没入感）
    if (!this.vigCache || this.vigW !== W || this.vigH !== H) {
      const vc = document.createElement('canvas');
      vc.width = Math.max(1, Math.floor(W));
      vc.height = Math.max(1, Math.floor(H));
      const vx = vc.getContext('2d');
      const vg = vx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.62)');
      vx.fillStyle = vg;
      vx.fillRect(0, 0, W, H);
      this.vigCache = vc;
      this.vigW = W;
      this.vigH = H;
    }
    ctx.drawImage(this.vigCache, 0, 0, W, H);
  },

  drawBaseCamp(ctx, now) {
    ctx.save();
    // 治癒エリアの優しい緑のオーラ
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.beginPath();
    ctx.arc(BASE_CAMP.x, BASE_CAMP.y, BASE_CAMP.radius, 0, Math.PI * 2);
    ctx.fill();

    // 外周のルーン境界線
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(BASE_CAMP.x, BASE_CAMP.y, BASE_CAMP.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 砦の石垣サークル（狭間マーク）
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(BASE_CAMP.x, BASE_CAMP.y, BASE_CAMP.radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 中央の石造り城塞（砦タワー）
    ctx.translate(BASE_CAMP.x, BASE_CAMP.y);
    
    // 石積みの天守
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -20, 48, 40, 6);
    ctx.fill();
    ctx.stroke();

    // 城塞の狭間（凸凹）
    ctx.fillStyle = '#334155';
    ctx.fillRect(-22, -26, 8, 6);
    ctx.fillRect(-4, -26, 8, 6);
    ctx.fillRect(14, -26, 8, 6);

    // アーチ状の門
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 10, 8, Math.PI, 0);
    ctx.lineTo(8, 20);
    ctx.lineTo(-8, 20);
    ctx.closePath();
    ctx.fill();

    // 風になびくエメラルド軍旗
    const waveFlag = Math.sin(now * 0.008) * 3;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -44);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.lineTo(16 + waveFlag, -38);
    ctx.lineTo(0, -32);
    ctx.closePath();
    ctx.fill();

    // ラベル
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('🏰 自軍本陣 (治癒砦)', 0, 36);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('エリア内で部隊治癒', 0, 50);

    ctx.restore();
  },

  drawOutpost(ctx, op, now) {
    ctx.save();
    ctx.translate(op.x, op.y);

    const isCleared = op.cleared;

    if (op.type === 'FORT') {
      // ===== 🏴 敵の前線砦 =====
      ctx.fillStyle = isCleared ? 'rgba(30, 20, 20, 0.4)' : 'rgba(50, 20, 20, 0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.fill();

      // バリケード（木の柵）
      ctx.strokeStyle = isCleared ? '#4b5563' : '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeRect(-26, -20, 52, 40);

      // 砦本体
      ctx.fillStyle = isCleared ? '#374151' : '#1f2937';
      ctx.fillRect(-18, -14, 36, 28);

      if (!isCleared) {
        // オークの角付き頭蓋骨紋章
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-4, -6, 8, 8);

        // かがり火（アニメーション炎）
        const flame = Math.sin(now * 0.02) * 2;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-22, -18, 4 + flame, 0, Math.PI * 2);
        ctx.arc(22, -18, 4 + flame, 0, Math.PI * 2);
        ctx.fill();

        // 砦の軍旗
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -32); ctx.stroke();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(0, -32, 14, 10);
      } else {
        // 制圧後の煙
        ctx.fillStyle = 'rgba(150, 150, 150, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -10 + Math.sin(now * 0.005) * 4, 10, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (op.type === 'CAGE') {
      // ===== ⛓️ 捕虜収容所 =====
      ctx.fillStyle = 'rgba(40, 30, 20, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.fill();

      // 檻の枠
      ctx.strokeStyle = isCleared ? '#64748b' : '#334155';
      ctx.lineWidth = isCleared ? 1.5 : 2.5;
      ctx.strokeRect(-18, -16, 36, 32);

      // 鉄格子バー
      if (!isCleared) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        for (let bx = -12; bx <= 12; bx += 6) {
          ctx.beginPath();
          ctx.moveTo(bx, -16);
          ctx.lineTo(bx, 16);
          ctx.stroke();
        }

        // 檻の中の囚われた友軍兵士
        const bob = Math.sin(now * 0.008) * 1.5;
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(0, bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(0, -3 + bob, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 扉が破壊されて開放
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, -16);
        ctx.lineTo(28, -6);
        ctx.stroke();
      }

    } else if (op.type === 'SHRINE') {
      // ===== 🏛️ 古代鍛冶の祭壇 =====
      ctx.strokeStyle = isCleared ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.stroke();

      // 4本の古代石柱
      ctx.fillStyle = '#475569';
      [[-20, -20], [20, -20], [-20, 20], [20, 20]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 中央祭壇座
      ctx.fillStyle = '#334155';
      ctx.fillRect(-12, -10, 24, 20);

      // 浮遊する青き古代ルーン（パルス）
      const floatY = Math.sin(now * 0.005) * 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fillStyle = isCleared ? '#94a3b8' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, floatY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (op.type === 'SUPPLY') {
      // ===== 📦 補給物資集積所 =====
      ctx.fillStyle = 'rgba(30, 45, 30, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, op.radius, 0, Math.PI * 2);
      ctx.fill();

      // 積み上げられた木箱
      ctx.fillStyle = isCleared ? '#4b5563' : '#78350f';
      ctx.fillRect(-14, -6, 14, 14);
      ctx.fillRect(2, -6, 14, 14);
      ctx.fillRect(-6, -18, 14, 14);

      // 樽
      ctx.fillStyle = isCleared ? '#374151' : '#92400e';
      ctx.beginPath();
      ctx.arc(14, 10, 6, 0, Math.PI * 2);
      ctx.arc(-14, 10, 6, 0, Math.PI * 2);
      ctx.fill();

      if (!isCleared) {
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✚', 0, 16);
      }
    }

    // 頭上ラベル ＆ HPバー
    ctx.textAlign = 'center';
    if (!isCleared) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = op.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`${op.icon} ${op.name}`, 0, -op.radius - 12);
      ctx.shadowBlur = 0;

      const barW = 44;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW / 2, -op.radius - 8, barW, 4);
      ctx.fillStyle = op.color;
      ctx.fillRect(-barW / 2, -op.radius - 8, barW * (op.hp / op.maxHp), 4);
    } else {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText(`✨ 制圧完了`, 0, -op.radius - 6);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  drawChest(ctx, drop, now) {
    ctx.save();
    ctx.translate(drop.x, drop.y);

    if (drop.isBoss) {
      // ===== ボス確定ドロップの神々しいオーラ =====
      const pulse = Math.sin(now * 0.008) * 5;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18 + pulse;

      // 金の宝箱
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-12, -9, 24, 18);

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-12, -9, 24, 18);

      // 王冠マーク
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', 0, -15);
    } else {
      // 足元グロー光彩
      ctx.shadowColor = drop.item.color;
      ctx.shadowBlur = 12 + Math.sin(now * 0.008) * 4;

      // 宝箱の木製本体
      ctx.fillStyle = '#5c2c16';
      ctx.fillRect(-10, -8, 20, 16);

      // 金具フレーム（レアリティ色）
      ctx.strokeStyle = drop.item.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-10, -8, 20, 16);

      // 宝箱の帯金具
      ctx.fillStyle = drop.item.color;
      ctx.fillRect(-10, -2, 20, 3);

      // 鍵穴
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(0, 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  drawMonster(ctx, m, now) {
    ctx.save();
    ctx.translate(m.x, m.y);

    const isLeft = (m.vx !== undefined && m.vx < -0.1) || ((this.player && this.player.x < m.x) && (!m.vx || Math.abs(m.vx) < 0.1));
    const bob = Math.sin(now * 0.014 + (m.x % 10)) * 1.6;

    // 1. 足元接地ソフトシャドウ (斜め見下ろしの横長平楕円)
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 2, m.radius * 0.95, m.radius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // 左右反転コンテキスト
    ctx.save();
    if (isLeft) ctx.scale(-1, 1);

    if (m.type === 'goblin') {
      // ===== 👺 ゴブリン (小型・緑の小鬼、前傾姿勢の立ち姿) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#22c55e';
      const darkColor = m.hitPulse > 0 ? '#ffffff' : '#15803d';

      // 二本の足（小走りステップ）
      const step = Math.sin(now * 0.02 + m.x) * 3;
      ctx.fillStyle = darkColor;
      ctx.fillRect(-4 + step, -3, 3, 4);
      ctx.fillRect(2 - step, -3, 3, 4);

      // 胴体 (猫背・前傾)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -9 + bob, 6.5, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // ボロ布の腰巻
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-5, -6 + bob, 9, 3);

      // 頭部
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(2, -15 + bob, 6, 0, Math.PI * 2);
      ctx.fill();

      // 尖った長いエルフ耳
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-2, -15 + bob);
      ctx.lineTo(-10, -19 + bob);
      ctx.lineTo(-3, -12 + bob);
      ctx.closePath();
      ctx.fill();

      // 赤い光る眼
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(3, -16 + bob, 2.2, 2.2);

      // トゲ棍棒 (斜め前方に構えて振り回す)
      ctx.save();
      ctx.translate(5, -9 + bob);
      ctx.rotate(0.3 + Math.sin(now * 0.015) * 0.25);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(10, -8);
      ctx.stroke();
      // トゲ鋲
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(8, -10, 3, 3);
      ctx.fillRect(5, -6, 2.5, 2.5);
      ctx.restore();

    } else if (m.type === 'orc') {
      // ===== 👹 オーク (中型エリート・筋肉質な蛮族ウォリアー) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#d97706';
      const shadowColor = m.hitPulse > 0 ? '#ffffff' : '#b45309';

      // 頑強なブーツ脚
      const step = Math.sin(now * 0.016 + m.x) * 3.5;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-6 + step, -5, 4.5, 6);
      ctx.fillRect(2 - step, -5, 4.5, 6);

      // 毛皮の腰巻
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -9 + bob, 16, 5);

      // 筋肉隆々の胴体 (厚い胸板)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -14 + bob, 10, 8.5, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // 胸筋ライン
      ctx.strokeStyle = shadowColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -14 + bob, 5, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // 角付き鉄兜＆頭部
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(2, -22 + bob, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // 兜の白い大角
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-2, -23 + bob);
      ctx.lineTo(-9, -30 + bob);
      ctx.lineTo(-1, -26 + bob);
      ctx.closePath();
      ctx.fill();

      // 獰猛な赤目と牙
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(3, -23 + bob, 2.5, 2.2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(4, -19 + bob, 1.8, 2.5); // 牙

      // 巨大バトルアックス (力強く構える)
      ctx.save();
      ctx.translate(6, -12 + bob);
      ctx.rotate(-0.2 + Math.sin(now * 0.012) * 0.2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-3, 6);
      ctx.lineTo(12, -18);
      ctx.stroke();
      // 巨大な鉄の斧刃
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(10, -16, 8, -Math.PI * 0.7, Math.PI * 0.3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

    } else {
      // ===== 🐉 ドラゴン / ボス (巨大な羽ばたく魔獣) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#b91c1c';
      const wingColor = m.hitPulse > 0 ? '#ffffff' : '#7f1d1d';

      // 禍々しい赤い魔方陣オーラ (足元地面)
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 豪快に羽ばたく翼 (奥側の翼)
      const flap = Math.sin(now * 0.006) * 10;
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.moveTo(-4, -20 + bob);
      ctx.lineTo(-26, -38 + flap + bob);
      ctx.lineTo(-18, -16 + bob);
      ctx.closePath();
      ctx.fill();

      // 太い竜の足
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-8, -6, 6, 7);
      ctx.fillRect(4, -6, 6, 7);

      // 巨大な竜の胴体 (鱗)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -18 + bob, 15, 12, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // 手前側の翼 (大きく広がる)
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      ctx.moveTo(6, -20 + bob);
      ctx.lineTo(28, -36 + flap + bob);
      ctx.lineTo(16, -14 + bob);
      ctx.closePath();
      ctx.fill();

      // 竜頭と鋭い角
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(10, -26 + bob, 9, 7, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // 黒曜石の角
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(6, -29 + bob);
      ctx.lineTo(12, -42 + bob);
      ctx.lineTo(14, -30 + bob);
      ctx.closePath();
      ctx.fill();

      // 黄金の猛獣眼と牙
      ctx.fillStyle = '#facc15';
      ctx.fillRect(12, -28 + bob, 3, 2.5);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(15, -24 + bob, 2, 2.5);
    }

    ctx.restore(); // 反転復元

    // HPバー (頭上)
    const barW = Math.max(22, m.radius * 2);
    const headH = m.isBoss ? 46 : (m.type === 'orc' ? 34 : 24);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(-barW / 2, -headH, barW, 4);
    ctx.fillStyle = m.isBoss ? '#ef4444' : '#f97316';
    ctx.fillRect(-barW / 2, -headH, barW * (m.hp / m.maxHp), 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-barW / 2, -headH, barW, 4);

    ctx.restore();
  },

  drawProjectile(ctx, proj, now) {
    ctx.save();
    ctx.translate(proj.x, proj.y);

    if (proj.type === 'ARROW') {
      const tgt = proj.target;
      const angle = tgt ? Math.atan2(tgt.y - proj.y, tgt.x - proj.x) : 0;
      ctx.rotate(angle);

      // 矢のシャフト
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      // 銀の矢尻
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();

      // 白い羽
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-6, -2.5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 2.5);
      ctx.closePath();
      ctx.fill();
    } else if (proj.type === 'HEAL') {
      // 脈動する治癒光弾 (大回復弾は巨大オーラを纏う！)
      const isHigh = proj.isHighHeal || proj.amount >= 50;
      const baseR = isHigh ? 6.5 : 4.5;
      const pulse = Math.sin(now * 0.018) * (isHigh ? 2.5 : 1.5);
      const glowColor = isHigh ? '#00f0ff' : '#34d399';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isHigh ? 16 : 10;
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, baseR + pulse, 0, Math.PI * 2);
      ctx.fill();

      // 内側の白い神聖核
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, isHigh ? 3.2 : 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  },

  drawSoldier(ctx, s, now) {
    ctx.save();
    ctx.translate(s.x, s.y);

    const clsKey = s.soldierClass || 'HEAVY';
    const cls = SOLDIER_CLASSES[clsKey] || SOLDIER_CLASSES.HEAVY;
    const isNamed = s.isNamed;
    const isDown = s.isDown;
    const platoon = this.platoons ? this.platoons[s.platoonId % 3] : null;
    const pColor = platoon ? platoon.color : '#38bdf8';

    // 装備情報取得（兵士が拾ったり支給された装備を完全反映！）
    const eq = s.equipped || {};
    const wEq = getEquipVisual(eq.weapon || s.weapon, 1, cls.color);
    const sEq = getEquipVisual(eq.shield, 1, '#475569');
    const hEq = getEquipVisual(eq.helmet, 1, '#64748b');
    const aEq = getEquipVisual(eq.armor, 1, cls.color);
    const gEq = getEquipVisual(eq.gloves, 1, '#475569');
    const lEq = getEquipVisual(eq.legs, 1, '#334155');
    const mEq = eq.amulet ? getEquipVisual(eq.amulet, 1, '#fbbf24') : null;

    // 1. ダウン（行動不能・救助待ち）中の描画
    if (isDown) {
      const flash = Math.sin(now * 0.015) > 0;
      // 倒れた身体（横たわり・斜め見下ろし接地）
      ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.45)' : 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 倒れた胴体
      ctx.fillStyle = flash ? '#ef4444' : aEq.color;
      ctx.beginPath();
      ctx.ellipse(2, 0, 9, 5, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // 転がった兜
      ctx.fillStyle = hEq.color;
      ctx.beginPath();
      ctx.arc(-7, -1, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // 救助要請SOSラベル & カウントダウン
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#f87171';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`🆘 救助! (${Math.ceil(s.downTimer)}s)`, 0, -22);
      ctx.shadowBlur = 0;

      // 救助進行度プログレスバー
      const prog = Math.min(1.0, Math.max(0, s.rescueProgress || 0));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-14, -13, 28, 4.5);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(-14, -13, 28 * prog, 4.5);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1;
      ctx.strokeRect(-14, -13, 28, 4.5);

      ctx.restore();
      return;
    }

    // 2. 足元ソフト接地シャドウ ＆ 所属小隊リング ＆ アミュレットオーラ
    ctx.fillStyle = isNamed ? 'rgba(251, 191, 36, 0.32)' : 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 1, isNamed ? 13 : 11, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 小隊所属リング
    ctx.strokeStyle = pColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 1, 13, 5.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 直属小隊（Personal Guards）のゴールドオーラリング！
    if (s.isPersonalGuard) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.ellipse(0, 1, 14.5, 5.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (isNamed) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 1, 15, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (mEq && mEq.hasItem) {
      ctx.strokeStyle = mEq.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 1, 17, 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 向き判定（左右反転＋上下傾き）
    const isLeft = Math.cos(s.facingAngle || 0) < -0.15;
    const isMoving = (s.vx && Math.abs(s.vx) > 0.05) || (s.vy && Math.abs(s.vy) > 0.05);
    const walkCycle = isMoving ? now * 0.018 + (s.animOffset || 0) : 0;
    const bob = isMoving ? Math.sin(walkCycle * 2) * 1.5 : Math.sin(now * 0.003 + (s.animOffset || 0)) * 0.6;
    const legSwing = isMoving ? Math.sin(walkCycle) * 3.5 : 0;

    ctx.save();
    if (isLeft) ctx.scale(-1, 1);

    // マント (先輩兵は黄金、叙勲兵は王立青)
    if (isNamed || s.isVeteran) {
      ctx.fillStyle = isNamed ? '#2563eb' : '#d97706';
      ctx.beginPath();
      ctx.moveTo(-4, -14 + bob);
      ctx.quadraticCurveTo(-12, -4 + bob, -14, 0 + bob);
      ctx.lineTo(-4, -4 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 脚甲＆ブーツ（LEGS）
    ctx.fillStyle = lEq.color;
    ctx.fillRect(-4 + legSwing, -6, 3.2, 7);
    ctx.fillRect(1 - legSwing, -6, 3.2, 7);
    // 靴底
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-5 + legSwing, 0, 4.5, 2);
    ctx.fillRect(0 - legSwing, 0, 4.5, 2);

    // 兵種別 2.5D立ち姿グラフィック
    if (clsKey === 'HEAVY') {
      // ===== 🛡️ 重装歩兵 =====
      // 胴体 (フルプレートアーマー・ARMOR色忠実反映)
      ctx.fillStyle = aEq.color;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(0, -12 + bob, 7, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 重装肩当て (ポールドロン)
      ctx.fillStyle = aEq.color;
      ctx.fillRect(-7, -16 + bob, 4, 4.5);
      ctx.fillRect(3, -16 + bob, 4, 4.5);

      // フルフェイス兜 (HELMET色反映)
      ctx.fillStyle = hEq.color;
      ctx.beginPath();
      ctx.arc(0, -20 + bob, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // バイザースリット (水色光)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1, -21 + bob, 4, 2.5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(2, -20.5 + bob, 3, 1.5);

      // 兜飾り (T4以上で羽・角)
      if (hEq.tier >= 4) {
        ctx.fillStyle = hEq.tier >= 5 ? '#fbbf24' : '#94a3b8';
        ctx.fillRect(-1, -27 + bob, 2.5, 4);
      }

      // 左手の大型盾 (SHIELD色反映)
      ctx.save();
      ctx.translate(-5, -11 + bob);
      ctx.fillStyle = sEq.color;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.2;
      if (sEq.tier <= 2) {
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(4, -6);
        ctx.lineTo(3, 3);
        ctx.lineTo(0, 7);
        ctx.lineTo(-3, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // 右手のブロードソード (WEAPON色反映)
      ctx.save();
      ctx.translate(5, -10 + bob);
      ctx.fillStyle = wEq.color;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.fillRect(0, -2, 12 + (wEq.tier >= 4 ? 3 : 0), 3);
      ctx.strokeRect(0, -2, 12 + (wEq.tier >= 4 ? 3 : 0), 3);
      if (wEq.tier >= 5 || wEq.upgrade >= 3) {
        ctx.shadowColor = wEq.color;
        ctx.shadowBlur = 6;
        ctx.strokeRect(0, -2, 12 + (wEq.tier >= 4 ? 3 : 0), 3);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

    } else if (clsKey === 'LIGHT') {
      // ===== 🗡️ 軽装遊撃兵 =====
      // 胴体 (身軽なスカウト装束・ARMOR色反映)
      ctx.fillStyle = aEq.color;
      ctx.beginPath();
      ctx.ellipse(0, -11 + bob, 5.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 頭部・フード/軽兜 (HELMET色反映)
      ctx.fillStyle = hEq.color;
      ctx.beginPath();
      ctx.arc(0, -18 + bob, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // 二刀流ダガー (WEAPON色反映)
      const dColor = wEq.color;
      ctx.strokeStyle = dColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = dColor;
      ctx.shadowBlur = (wEq.tier >= 5) ? 5 : 0;
      // 奥ダガー
      ctx.beginPath();
      ctx.moveTo(-3, -12 + bob);
      ctx.lineTo(7, -15 + bob);
      ctx.stroke();
      // 手前ダガー
      ctx.beginPath();
      ctx.moveTo(3, -9 + bob);
      ctx.lineTo(12, -6 + bob);
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (clsKey === 'ARCHER') {
      // ===== 🏹 弓兵 =====
      // 胴体 (ハンター装束・ARMOR色反映)
      ctx.fillStyle = aEq.color;
      ctx.beginPath();
      ctx.ellipse(0, -11 + bob, 5.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 背中の矢筒
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-7, -15 + bob, 3.5, 8);

      // 頭部・羽根つき帽子/兜 (HELMET色反映)
      ctx.fillStyle = hEq.color;
      ctx.beginPath();
      ctx.arc(0, -18 + bob, 5.5, 0, Math.PI * 2);
      ctx.fill();
      // 緑の羽飾り
      ctx.fillStyle = '#34d399';
      ctx.fillRect(-3, -24 + bob, 2.5, 3.5);

      // ロングボウ (WEAPON色反映)
      const pull = (s.atkAnim || 0) * 4;
      ctx.strokeStyle = wEq.color;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = wEq.color;
      ctx.shadowBlur = (wEq.tier >= 5) ? 5 : 0;
      ctx.beginPath();
      ctx.arc(6 - pull, -11 + bob, 9, -0.9, 0.9);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // 弓弦
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(11 - pull, -18 + bob);
      ctx.lineTo(3 - pull, -11 + bob);
      ctx.lineTo(11 - pull, -4 + bob);
      ctx.stroke();

    } else if (clsKey === 'MEDIC') {
      // ===== 🌿 衛生術士 =====
      // 胴体 (神官ローブ・ふわりと広がる裾)
      ctx.fillStyle = aEq.color;
      ctx.beginPath();
      ctx.moveTo(-5, -12 + bob);
      ctx.lineTo(5, -12 + bob);
      ctx.lineTo(7, -2);
      ctx.lineTo(-7, -2);
      ctx.closePath();
      ctx.fill();

      // 頭部・シスターフード/法冠 (HELMET色反映)
      ctx.fillStyle = hEq.color;
      ctx.beginPath();
      ctx.arc(0, -18 + bob, 5.8, 0, Math.PI * 2);
      ctx.fill();

      // 治癒の杖 (WEAPON色反映)
      ctx.strokeStyle = wEq.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(2, -4 + bob);
      ctx.lineTo(10, -22 + bob);
      ctx.stroke();

      // 杖先端の治癒オーブ (回復力パワーアップで光彩・オーラ巨大化！)
      const isHighPower = (s.healPower || 0) >= 50;
      const orbPulse = Math.sin(now * 0.008) * 1.2;
      const orbColor = isHighPower ? '#00f0ff' : '#34d399';
      ctx.fillStyle = orbColor;
      ctx.shadowColor = orbColor;
      ctx.shadowBlur = (isHighPower ? 14 : 8) + orbPulse * 2;
      ctx.beginPath();
      ctx.arc(11, -24 + bob, (isHighPower ? 4.5 : 3.8) + orbPulse * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore(); // 反転復元

    // 3. 頭上ネームプレート (斜めアングルの頭上位置)
    ctx.textAlign = 'center';
    const sLv = s.level || 1;
    const guardBadge = s.isPersonalGuard ? '⭐直属 ' : '';
    if (isNamed) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`${guardBadge}✨Lv.${sLv} ${s.title}${s.name}`, 0, -32);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = s.isPersonalGuard ? '#fef08a' : '#cbd5e1';
      ctx.font = s.isPersonalGuard ? 'bold 9.5px sans-serif' : '9px sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText(`${guardBadge}Lv.${sLv} ${s.name}`, 0, -30);
      ctx.shadowBlur = 0;
    }

    // HPバー
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-12, -25, 24, 3.5);
    ctx.fillStyle = isNamed ? '#fbbf24' : '#10b981';
    ctx.fillRect(-12, -25, 24 * (s.hp / s.maxHp), 3.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-12, -25, 24, 3.5);

    ctx.restore();
  },

  drawPlayer(ctx, p, now) {
    ctx.save();
    ctx.translate(p.x, p.y);

    const isMoving = this.joystick && this.joystick.active;
    const walkCycle = isMoving ? now * 0.018 : 0;
    const walkBob = isMoving ? Math.sin(walkCycle * 2) * 1.8 : Math.sin(now * 0.003) * 0.7;
    const legSwing = isMoving ? Math.sin(walkCycle) * 4.2 : 0;

    // 装備情報取得
    const eq = this.equipped || {};
    const wEq = getEquipVisual(eq.weapon, 1, '#60a5fa');
    const sEq = getEquipVisual(eq.shield, 1, '#3b82f6');
    const hEq = getEquipVisual(eq.helmet, 1, '#64748b');
    const aEq = getEquipVisual(eq.armor, 1, '#3b82f6');
    const gEq = getEquipVisual(eq.gloves, 1, '#475569');
    const lEq = getEquipVisual(eq.legs, 1, '#334155');
    const mEq = eq.amulet ? getEquipVisual(eq.amulet, 1, '#fbbf24') : null;

    // 0. 足元接地ソフトシャドウ (斜め見下ろしの横長二重ぼかし平楕円)
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 20, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 0.5 アミュレット（AMULET）足元ルーン光輪
    if (mEq && mEq.hasItem) {
      const aRot = now * 0.002;
      const aPulse = 0.5 + 0.5 * Math.sin(now * 0.005);
      ctx.save();
      ctx.translate(0, 1);
      ctx.strokeStyle = mEq.color;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = mEq.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.4 + aPulse * 0.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 19 + aPulse * 3, 7.5 + aPulse * 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // ルーン光点
      for (let i = 0; i < 3; i++) {
        const ang = aRot + (i * Math.PI * 2) / 3;
        const rx = Math.cos(ang) * (19 + aPulse * 3);
        const ry = Math.sin(ang) * (7.5 + aPulse * 1.5);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 向き判定（左右反転＋上下傾き）
    const isLeft = Math.cos(p.facingAngle || 0) < -0.15;
    ctx.save();
    if (isLeft) ctx.scale(-1, 1);

    // 1. マント（CLOAK・背中から斜め後ろにたなびく）
    const capeColor = this.rankIndex >= 4 ? '#b91c1c' : (this.rankIndex >= 2 ? '#1d4ed8' : '#334155');
    const capeWave = Math.sin(now * 0.012) * 3;
    const capeSwing = isMoving ? Math.sin(walkCycle) * 2.5 : 0;
    ctx.fillStyle = capeColor;
    ctx.beginPath();
    ctx.moveTo(-5, -16 + walkBob);
    ctx.quadraticCurveTo(-14 + capeWave, -6 + walkBob + capeSwing, -16 + capeWave * 1.2, 0 + walkBob + capeSwing);
    ctx.lineTo(-5, -6 + walkBob);
    ctx.closePath();
    ctx.fill();
    // 伍長以上の金縁ステッチ
    if (this.rankIndex >= 2) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -16 + walkBob);
      ctx.quadraticCurveTo(-14 + capeWave, -6 + walkBob + capeSwing, -16 + capeWave * 1.2, 0 + walkBob + capeSwing);
      ctx.stroke();
    }

    // 2. 脚甲（LEGS）＆ ブーツ・歩行ステップアニメーション
    const bootColor = lEq.color;
    ctx.fillStyle = bootColor;
    // 奥脚（左脚）
    ctx.fillRect(-5 + legSwing, -7, 3.8, 8);
    // 手前脚（右脚）
    ctx.fillRect(1 - legSwing, -7, 3.8, 8);
    // ブーツの靴底
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-6 + legSwing, 0, 5.2, 2.2);
    ctx.fillRect(0 - legSwing, 0, 5.2, 2.2);

    // 3. 胴体甲冑（ARMOR・重厚な金属プレート）
    const armorColor = aEq.color;
    ctx.fillStyle = armorColor;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -13 + walkBob, 8, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 胸当てのリッジ光沢（金属のハイライト反射）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -13 + walkBob, 5.5, -0.8, 0.8);
    ctx.stroke();

    // 腰ベルト ＆ バックル
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-6, -8 + walkBob, 12, 2.5);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-1.5, -8.5 + walkBob, 3, 3.5);

    // 4. 左肩・奥側の肩当て ＆ 左手の盾（SHIELD）
    ctx.fillStyle = armorColor;
    ctx.fillRect(-7, -18 + walkBob, 4.5, 5);

    const shieldColor = sEq.color;
    ctx.save();
    ctx.translate(-6, -12 + walkBob);
    ctx.fillStyle = shieldColor;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    if (sEq.tier <= 2) {
      // ラウンドシールド（丸盾）
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (sEq.tier <= 4) {
      // ヒーターシールド（中世騎士盾）
      ctx.beginPath();
      ctx.moveTo(-5, -7);
      ctx.lineTo(5, -7);
      ctx.lineTo(4, 3);
      ctx.lineTo(0, 8);
      ctx.lineTo(-4, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // カイト/タワーシールド（大型盾 ＆ 黄金十字鷲の紋章）
      ctx.beginPath();
      ctx.moveTo(-5.5, -9);
      ctx.lineTo(5.5, -9);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 10);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 盾中央の黄金紋章
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(0, 4);
      ctx.moveTo(-2.5, -2); ctx.lineTo(2.5, -2);
      ctx.stroke();
      if (sEq.tier >= 6) {
        ctx.shadowColor = sEq.color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();

    // 5. 頭部・兜（HELMET・精悍なフルフェイス兜）
    const helmColor = hEq.color;
    ctx.fillStyle = helmColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -22 + walkBob, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 兜のバイザースリット ＆ 鋭い眼光
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(1, -23 + walkBob, 4.8, 3);
    ctx.fillStyle = hEq.isGod ? '#ff007f' : '#00f0ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 5;
    ctx.fillRect(2.5, -22.5 + walkBob, 3.2, 1.8);
    ctx.shadowBlur = 0;

    // 兜飾り（ティア別クレスト）
    if (hEq.tier >= 7) {
      // 神聖ハロー光輪
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, -22 + walkBob, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (hEq.tier >= 6) {
      // 竜の黒金ホーン角
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-3, -28 + walkBob);
      ctx.lineTo(-8, -36 + walkBob);
      ctx.lineTo(1, -29 + walkBob);
      ctx.fill();
    } else if (hEq.tier >= 5) {
      // ミスリルの黄金ウィング
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-3, -28 + walkBob);
      ctx.lineTo(2, -35 + walkBob);
      ctx.lineTo(3, -28 + walkBob);
      ctx.fill();
    } else if (hEq.tier >= 3) {
      // 鉄〜鋼鉄のクレスト
      ctx.fillStyle = hEq.color;
      ctx.fillRect(-1, -30 + walkBob, 3.5, 4.5);
    }

    // 出世の階級章（王冠/星羽飾り）
    if (this.rankIndex >= 4) {
      // 金の王冠クレスト
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-4, -28 + walkBob);
      ctx.lineTo(-2, -34 + walkBob);
      ctx.lineTo(0, -30 + walkBob);
      ctx.lineTo(2, -34 + walkBob);
      ctx.lineTo(4, -28 + walkBob);
      ctx.closePath();
      ctx.fill();
    } else if (this.rankIndex >= 2) {
      // 伍長プルーム
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2, -32 + walkBob, 4.5, 4);
    }

    // 6. 右肩・手前側の肩当て（ポールドロン）
    ctx.fillStyle = armorColor;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(3, -16 + walkBob, 4.5, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (aEq.tier >= 4) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(3, -16 + walkBob, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. 手甲（GLOVES）＆ 武器（WEAPON）
    const weaponColor = wEq.color;
    const isAtk = p.slashAnim > 0;
    const wSwing = isAtk ? Math.sin(p.slashAnim * Math.PI) * 1.2 : 0;
    ctx.save();
    ctx.translate(6, -11 + walkBob);
    ctx.rotate(0.3 + wSwing);
    // 柄（グリップ）＆ 鍔（クロスガード）
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, -1.5, 4, 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(2, -4, 2.5, 8);
    // 刀身（ブレード）
    ctx.fillStyle = weaponColor;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -2.5);
    ctx.lineTo(18 + (wEq.tier >= 4 ? 4 : 0), -1);
    ctx.lineTo(22 + (wEq.tier >= 4 ? 4 : 0), 0); // 切っ先
    ctx.lineTo(18 + (wEq.tier >= 4 ? 4 : 0), 1);
    ctx.lineTo(4, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 武器オーラ（高ティア・高強化値）
    if (wEq.tier >= 5 || wEq.upgrade >= 3) {
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = weaponColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 攻撃スイング時の三日月光刃エフェクト
    if (isAtk) {
      ctx.save();
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 6;
      ctx.shadowColor = weaponColor;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, -11 + walkBob, 38, -0.65, 0.65);
      ctx.stroke();
      // 内側の白い光
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, -11 + walkBob, 38, -0.45, 0.45);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // 反転復元

    // 8. 頭上階級マーク ＆ レベル ＆ HPバー (斜めアングルの頭上位置)
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const mark = this.rankIndex >= 4 ? '👑' : (this.rankIndex >= 2 ? '⭐' : '🛡️');
    ctx.fillText(mark, 0, -42);
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`Lv.${p.level || 1} あなた`, 0, -32);
    ctx.shadowBlur = 0;

    // HPバー
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(-18, -26, 36, 4.5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-18, -26, 36 * (p.hp / p.maxHp), 4.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-18, -26, 36, 4.5);

    ctx.restore();
  },

  renderMinimap() {
    const mCtx = this.minimapCtx;
    const mw = 70;
    const mh = 70;
    mCtx.clearRect(0, 0, mw, mh);

    mCtx.fillStyle = 'rgba(11, 13, 20, 0.75)';
    mCtx.fillRect(0, 0, mw, mh);

    const scaleX = mw / MAP_WIDTH;
    const scaleY = mh / MAP_HEIGHT;

    // 自軍本陣
    mCtx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    mCtx.beginPath();
    mCtx.arc(BASE_CAMP.x * scaleX, BASE_CAMP.y * scaleY, BASE_CAMP.radius * scaleX, 0, Math.PI * 2);
    mCtx.fill();

    // 敵 (赤点)
    mCtx.fillStyle = '#ef4444';
    for (const m of this.monsters) {
      mCtx.fillRect(m.x * scaleX - 1, m.y * scaleY - 1, 2, 2);
    }

    // 仲間兵士 (緑点)
    mCtx.fillStyle = '#10b981';
    for (const s of this.squad) {
      if (!s.dead) mCtx.fillRect(s.x * scaleX - 1, s.y * scaleY - 1, 2, 2);
    }

    // 探索拠点 (🏴, ⛓️, 🏛️, 📦)
    if (this.outposts) {
      for (const op of this.outposts) {
        const ox = op.x * scaleX;
        const oy = op.y * scaleY;
        if (op.cleared) {
          mCtx.fillStyle = 'rgba(100, 116, 139, 0.45)';
          mCtx.beginPath();
          mCtx.arc(ox, oy, 2, 0, Math.PI * 2);
          mCtx.fill();
        } else {
          mCtx.fillStyle = op.color;
          mCtx.beginPath();
          mCtx.arc(ox, oy, 3.2, 0, Math.PI * 2);
          mCtx.fill();
        }
      }
    }

    // 主人公 (青点)
    if (this.player) {
      mCtx.fillStyle = '#00f0ff';
      mCtx.beginPath();
      mCtx.arc(this.player.x * scaleX, this.player.y * scaleY, 2.5, 0, Math.PI * 2);
      mCtx.fill();
    }
  },

  gameOver() {
    this.stopGameLoop();
    sound.playGameOver();
    this.clearSavedGame();

    // 先輩兵士として引き継ぐ（生存かつダウンしていない兵士）
    const aliveVeterans = this.squad ? this.squad.filter(s => !s.dead && !s.isDown) : [];
    if (aliveVeterans.length > 0) {
      storage.set('ironsquad_veterans_backup', aliveVeterans);
    } else {
      storage.set('ironsquad_veterans_backup', null);
    }

    const overlay = document.getElementById('game-overlay');
    document.getElementById('final-wave').textContent = this.wave;
    document.getElementById('final-rank').textContent = RANKS[this.rankIndex].title;
    const finalMinions = document.getElementById('final-minions');
    if (finalMinions) finalMinions.textContent = this.player ? (this.player.minionKills || 0) : 0;
    const finalBosses = document.getElementById('final-bosses');
    if (finalBosses) finalBosses.textContent = this.player ? (this.player.bossKills || 0) : 0;

    const vetNote = document.getElementById('overlay-veteran-note');
    if (vetNote) {
      if (aliveVeterans.length > 0) {
        vetNote.style.color = '#38bdf8';
        vetNote.textContent = `🎖️ 生き残った精鋭【${aliveVeterans.length}名】が、新兵として再入隊するあなたの「先輩兵士」として次戦に参戦します！`;
      } else {
        vetNote.style.color = '#ff5555';
        vetNote.textContent = '※生存者なし…過酷な戦場にて部隊は全滅しました';
      }
    }
    overlay.classList.remove('hidden');
  },

  destroy() {
    this.stopGameLoop();
    window.removeEventListener('resize', this.resizeCanvas);
    if (this.handleVisibility) {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundDown);
      window.removeEventListener('mousemove', this.boundMove);
      window.removeEventListener('mouseup', this.boundUp);
      this.canvas.removeEventListener('touchstart', this.boundDown);
      window.removeEventListener('touchmove', this.boundMove);
      window.removeEventListener('touchend', this.boundUp);
      window.removeEventListener('touchcancel', this.boundUp);
      if (this.boundWheel) this.canvas.removeEventListener('wheel', this.boundWheel);
    }
  }
};
