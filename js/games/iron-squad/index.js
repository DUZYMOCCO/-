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

// 階級データ (雑兵から始まり、出世で指揮権が解禁される！)
const RANKS = [
  { level: 1, title: '二等雑兵', reqExp: 0, canCommand: false, maxSquad: 20, bonusHp: 0, bonusAtk: 0, desc: '指揮権なし。大部隊の背中についていく側。' },
  { level: 2, title: '一等兵', reqExp: 300, canCommand: false, maxSquad: 20, bonusHp: 35, bonusAtk: 8, desc: '死線を潜った古参雑兵。まだ指揮権はない。' },
  { level: 3, title: '伍長 (班長昇進)', reqExp: 900, canCommand: true, commandType: 'WHISTLE', maxSquad: 26, bonusHp: 80, bonusAtk: 20, desc: '【呼集笛】解禁！近くの兵士を自分に集められる。' },
  { level: 4, title: '軍曹 (小隊長代理)', reqExp: 2000, canCommand: true, commandType: 'RALLY', maxSquad: 34, bonusHp: 150, bonusAtk: 38, desc: '【突撃号令】解禁！部隊の士気を一斉高揚。' },
  { level: 5, title: '百人隊長 (部隊司令)', reqExp: 3800, canCommand: true, commandType: 'FULL', maxSquad: 45, bonusHp: 240, bonusAtk: 65, desc: '【完全指揮権】獲得！部隊が主人公に追従。' },
  { level: 6, title: '千人将', reqExp: 6500, canCommand: true, commandType: 'FULL', maxSquad: 60, bonusHp: 380, bonusAtk: 100, desc: '大隊を率いる猛将。' },
  { level: 7, title: '近衛騎士団長', reqExp: 10000, canCommand: true, commandType: 'FULL', maxSquad: 75, bonusHp: 580, bonusAtk: 150, desc: '国王直属の近衛騎士団長。' },
  { level: 8, title: '軍団総司令官', reqExp: 15000, canCommand: true, commandType: 'FULL', maxSquad: 90, bonusHp: 850, bonusAtk: 220, desc: '全軍の指揮を執る最高司令官。' },
  { level: 9, title: '救国の英雄神将', reqExp: 22000, canCommand: true, commandType: 'FULL', maxSquad: 120, bonusHp: 1200, bonusAtk: 300, desc: '神話に語られる伝説の英雄。' }
];

const TITLES = ['不屈の', '疾風の', '鉄壁の', '歴戦の', '鬼神の', '紅蓮の', '隻眼の', '魔刃の', '金剛の', '閃光の'];
const NAMES = ['ボブ', 'ガッツ', 'ルーク', 'ジーク', 'レオ', 'ジャック', 'トール', 'ハンス', 'マルコ', 'オットー', 'クルト', 'フィン', 'クラーク', 'エリック', 'ロイ', 'アル', 'レオン', 'ギル', 'セドリック', 'バルト', 'オスカー', 'アラン', 'ブルーノ', 'ダン'];

// シンプルな素材・ティア制ドロップ生成
const TIERS = [
  { tier: 1, mat: '木/布', color: '#94a3b8', mult: 1.0,
    weapon: '木の剣', armor: '布の服', amulet: '木彫りの指輪' },
  { tier: 2, mat: '青銅/革', color: '#38bdf8', mult: 2.2,
    weapon: '青銅の剣', armor: '革の鎧', amulet: '銅の指輪' },
  { tier: 3, mat: '鉄', color: '#34d399', mult: 4.2,
    weapon: '鉄の剣', armor: '鉄の鎧', amulet: '鉄の兜' },
  { tier: 4, mat: '鋼鉄', color: '#a855f7', mult: 8.0,
    weapon: '鋼鉄の大剣', armor: '鋼鉄の甲冑', amulet: '鋼鉄の兜' },
  { tier: 5, mat: 'ミスリル', color: '#ffaa00', mult: 15.0,
    weapon: 'ミスリルの剣', armor: 'ミスリル鎧', amulet: '黄金の首飾り' },
  { tier: 6, mat: '竜鱗/黒金', color: '#ef4444', mult: 28.0,
    weapon: '竜牙の大剣', armor: '竜鱗の鎧', amulet: '竜の護符' },
  { tier: 7, mat: '神話・オリハルコン', color: '#ff007f', mult: 55.0,
    weapon: '神剣オリハルコン', armor: '神聖の鎧', amulet: '神々の紋章' }
];

function generateRandomDrop(wave) {
  // ウェーブが進むと上位ティアの抽選率が上昇
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

  const types = ['WEAPON', 'ARMOR', 'AMULET'];
  const type = types[Math.floor(Math.random() * types.length)];

  let rawName = '';
  if (type === 'WEAPON') rawName = chosenTier.weapon;
  else if (type === 'ARMOR') rawName = chosenTier.armor;
  else rawName = chosenTier.amulet;

  // たまに「+1」「+2」の強化プラス値が付く
  const plusVal = Math.random() < 0.25 ? (Math.random() < 0.3 ? 2 : 1) : 0;
  const itemName = plusVal > 0 ? `${rawName}+${plusVal}` : rawName;

  const plusMult = 1 + plusVal * 0.25;
  const baseValue = Math.floor(10 + chosenTier.tier * 5);
  const stats = {};

  if (type === 'WEAPON') {
    stats.atk = Math.floor(baseValue * chosenTier.mult * plusMult);
    if (chosenTier.tier >= 4) stats.crit = Math.min(80, chosenTier.tier * 10);
    if (chosenTier.tier >= 6) stats.lightning = true;
  } else if (type === 'ARMOR') {
    stats.hp = Math.floor(baseValue * 4 * chosenTier.mult * plusMult);
    if (chosenTier.tier >= 4) stats.def = chosenTier.tier * 4;
    if (chosenTier.tier >= 6) stats.regen = chosenTier.tier * 3;
  } else {
    stats.speed = Math.floor(8 + chosenTier.tier * 2);
    stats.atkSpeed = Math.floor(10 + chosenTier.tier * 5);
    if (chosenTier.tier >= 5) stats.vampire = 0.2;
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    name: itemName,
    baseName: rawName,
    upgrade: plusVal,
    type,
    tier: chosenTier.tier,
    mat: chosenTier.mat,
    color: chosenTier.color,
    stats,
    isGod: chosenTier.tier >= 6
  };
}


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
              <p style="font-size: 11px; color: #ff5555; margin-bottom: 14px;">※過酷な戦場にて部隊は全滅しました</p>
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
      this.width = (rect && rect.width > 0) ? rect.width : (window.innerWidth || 390);
      this.height = (rect && rect.height > 0) ? rect.height : (window.innerHeight - 80 || 600);
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);

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
      const dt = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;
      this.update(dt);
      this.render();
      this.renderMinimap();
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

    this.equipped = {
      weapon: null,
      armor: null,
      amulet: null
    };

    this.inventory = [];

    // 部隊の自律行動リーダー位置（部隊の重心目標）
    this.squadNav = {
      x: BASE_CAMP.x,
      y: BASE_CAMP.y,
      vx: 0,
      vy: 0,
      targetEnemy: null,
      state: 'DEFEND' // 'DEFEND', 'CHARGE', 'RETREAT'
    };

    // 初期兵士20名の大軍団スタート！全員名もなき雑兵
    this.squad = [];
    for (let i = 0; i < 20; i++) {
      this.squad.push(this.createNewSoldier(i + 1));
    }

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
    this.showToast('⚔️ 20名の雑兵小隊として出動！部隊と共闘せよ');
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

    // 装備ボーナス
    const wAtk = this.equipped && this.equipped.weapon ? (this.equipped.weapon.stats.atk || 0) : 0;
    const aHp = this.equipped && this.equipped.armor ? (this.equipped.armor.stats.hp || 0) : 0;
    const mSpeed = this.equipped && this.equipped.amulet ? (this.equipped.amulet.stats.speed || 0) : 0;
    const mAtkSpeed = this.equipped && this.equipped.amulet ? (this.equipped.amulet.stats.atkSpeed || 0) * 0.01 : 0;
    const mVampire = this.equipped && this.equipped.amulet ? (this.equipped.amulet.stats.vampire || 0) : 0;
    const wCrit = this.equipped && this.equipped.weapon ? (this.equipped.weapon.stats.crit || 10) : 10;
    const wLightning = this.equipped && this.equipped.weapon ? !!this.equipped.weapon.stats.lightning : false;

    // 最大HPの更新
    const oldMaxHp = this.player.maxHp || 130;
    const newMaxHp = 130 + rank.bonusHp + (lv - 1) * 16 + waves * 20 + minionHp + bossHp + aHp;
    this.player.maxHp = newMaxHp;
    if (this.player.hp > newMaxHp) {
      this.player.hp = newMaxHp;
    } else if (newMaxHp > oldMaxHp) {
      this.player.hp = Math.min(newMaxHp, this.player.hp + (newMaxHp - oldMaxHp));
    }

    this.player.atk = 25 + rank.bonusAtk + (lv - 1) * 4 + waves * 4 + minionAtk + bossAtk + wAtk;
    this.player.speed = 165 + minionSpeed + mSpeed;
    this.player.atkSpeed = 1.0 + mAtkSpeed;
    this.player.crit = wCrit + bossCrit;
    this.player.vampire = mVampire;
    this.player.lightning = wLightning;
    this.player.dmgReduction = bossReduction;
    this.player.kills = minionKills + bossKills;
  },

  recalcSoldierStats(s) {
    if (!s) return;
    const lv = s.level || 1;
    const waves = s.survivedWaves || 0;
    const minionKills = s.minionKills || 0;
    const bossKills = s.bossKills || 0;

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

    // 武器ボーナス
    const wAtk = s.weapon ? (s.weapon.stats.atk || 0) : 0;

    const oldMaxHp = s.maxHp || 70;
    const newMaxHp = 70 + (lv - 1) * 8 + waves * 14 + minionHp + bossHp + honorHp;
    s.maxHp = newMaxHp;
    if (s.hp > newMaxHp) {
      s.hp = newMaxHp;
    } else if (newMaxHp > oldMaxHp) {
      s.hp = Math.min(newMaxHp, s.hp + (newMaxHp - oldMaxHp));
    }

    s.atk = 11 + (lv - 1) * 2 + waves * 3 + minionAtk + bossAtk + honorAtk + wAtk;
    s.dmgReduction = bossReduction;
    s.kills = minionKills + bossKills;

    // 称号の動的更新（叙勲済みでなければ自動進化）
    if (!s.isNamed) {
      if (bossKills > 0) {
        s.rankTitle = `👑巨頭狩り (${bossKills}体)`;
      } else if (minionKills >= 30) {
        s.rankTitle = `⚔️百人斬り (${minionKills}体)`;
      } else if (waves >= 2) {
        s.rankTitle = '🎖️叙勲候補';
      } else if (waves >= 1) {
        s.rankTitle = '古参雑兵';
      } else {
        s.rankTitle = '無名新兵';
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

    this.recalcPlayerStats();
    if (pSave.hp) this.player.hp = Math.min(this.player.maxHp, pSave.hp);

    this.squadNav = {
      x: BASE_CAMP.x,
      y: BASE_CAMP.y,
      vx: 0,
      vy: 0,
      targetEnemy: null,
      state: 'DEFEND'
    };

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
    this.spawnTimer = 0;
    this.waveMonsterCount = 45 + this.wave * 18;
    this.spawnedInWave = 0;
    this.waveKills = 0;
  },

  createNewSoldier(index = 1) {
    return {
      id: Math.random().toString(36).substring(2, 9),
      isNamed: false,
      title: '',
      name: `雑兵#${index}`,
      survivedWaves: 0,
      level: 1,
      exp: 0,
      reqExp: 14,
      minionKills: 0,
      bossKills: 0,
      kills: 0,
      gold: 15 + Math.floor(Math.random() * 15), // 各兵士の初期財布 15〜29G
      medCooldown: 0,
      rankTitle: '無名新兵',
      hp: 70,
      maxHp: 70,
      atk: 11,
      dmgReduction: 0,
      weapon: null,
      atkCooldown: 0,
      role: index % 2 === 0 ? 'sword' : 'spear', // 剣兵または槍兵
      facingAngle: 0,
      atkAnim: 0,
      x: BASE_CAMP.x + (Math.random() - 0.5) * 120,
      y: BASE_CAMP.y + (Math.random() - 0.5) * 120,
      vx: 0,
      vy: 0,
      dead: false
    };
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
        squad: this.squad.filter(s => !s.dead)
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

    // キャンバス上の直接スワイプも念のためサポート
    let canvasDown = false;
    let originX = 0, originY = 0;

    const onCanvasStart = (e) => {
      // コントローラー以外の場所を触った時
      if (e.target.closest('#virtual-gamepad')) return;
      sound.unlock();
      canvasDown = true;
      const pos = this.getEventPos(e);
      originX = pos.x;
      originY = pos.y;
      this.joystick.active = true;
    };

    const onCanvasMove = (e) => {
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

    const onCanvasEnd = () => {
      if (canvasDown) {
        canvasDown = false;
        this.joystick.active = false;
        this.joystick.dirX = 0;
        this.joystick.dirY = 0;
      }
    };

    this.canvas.addEventListener('mousedown', onCanvasStart);
    window.addEventListener('mousemove', onCanvasMove);
    window.addEventListener('mouseup', onCanvasEnd);

    this.canvas.addEventListener('touchstart', onCanvasStart, { passive: false });
    window.addEventListener('touchmove', onCanvasMove, { passive: false });
    window.addEventListener('touchend', onCanvasEnd);
    window.addEventListener('touchcancel', onCanvasEnd);
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

  // 右手パッド手動攻撃
  manualAttack() {
    if (!this.inBattle) return;
    this.player.slashAnim = 1;
    const nearest = this.getNearestMonster(this.player.x, this.player.y);
    if (nearest && Math.hypot(nearest.x - this.player.x, nearest.y - this.player.y) <= 110) {
      this.player.slashAngle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
      this.performAttack(this.player, nearest, true);
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
    this.waveMonsterCount = 45 + this.wave * 18;

    this.player.hp = this.player.maxHp;

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

    // カメラ追従
    this.camera.x += (this.player.x - this.width / 2 - this.camera.x) * 0.1;
    this.camera.y += (this.player.y - this.height / 2 - this.camera.y) * 0.1;
    this.camera.x = Math.max(0, Math.min(MAP_WIDTH - this.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(MAP_HEIGHT - this.height, this.camera.y));

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

    // プロキシミティバッジ表示
    const proxBadge = document.getElementById('squad-proximity-badge');
    if (aliveSquad.length === 0) {
      proxBadge.className = 'proximity-badge proximity-danger';
      proxBadge.textContent = '☠️ 部隊全滅！完全孤立！';
    } else if (distToSquad < 110) {
      proxBadge.className = 'proximity-badge proximity-close';
      proxBadge.textContent = '🟢 部隊と共闘中 (安全)';
    } else if (isCatchingUp) {
      proxBadge.className = 'proximity-badge proximity-close';
      proxBadge.textContent = `💨 部隊へ急行中！(残り ${Math.floor(distToSquad)}m)`;
    } else {
      proxBadge.className = 'proximity-badge proximity-far';
      proxBadge.textContent = `⚠️ 単独行動中！(部隊まで ${Math.floor(distToSquad)}m)`;
    }

    // 部隊の目標決定
    // 百人隊長(Rank 5)以上なら完全指揮で主人公に追従。
    // それ未満なら、号令発動中のみ主人公へ、平常時は自律的に最も近い敵または本陣防衛へ！
    let squadTargetX = BASE_CAMP.x;
    let squadTargetY = BASE_CAMP.y;

    if (currentRank.level >= 5) {
      // 出世して百人隊長以上！完全指揮権
      squadTargetX = this.player.x;
      squadTargetY = this.player.y;
    } else if (isCommandActive) {
      // 伍長の呼集笛発動中！主人公の元へ駆けつける
      squadTargetX = this.player.x;
      squadTargetY = this.player.y;
    } else {
      // 雑兵の平常時：部隊は自律してモンスター迎撃へ進軍！
      const nearestToSquad = this.getNearestMonster(squadCenterX, squadCenterY);
      if (nearestToSquad) {
        squadTargetX = nearestToSquad.x;
        squadTargetY = nearestToSquad.y;
      } else {
        squadTargetX = BASE_CAMP.x;
        squadTargetY = BASE_CAMP.y;
      }
    }

    // 兵士の巡航速度（平常時105px/s。主人公が大幅に離れた時は殿警戒で80px/sに減速して待つ）
    let soldierSpeedLimit = 105;
    if (distToSquad > 210 && currentRank.level < 5 && !isCommandActive) {
      soldierSpeedLimit = 80;
    } else if (isCommandActive) {
      soldierSpeedLimit = 135;
    }

    // 各兵士の自律移動と戦闘
    aliveSquad.forEach((soldier, idx) => {
      // 兵士同士のBoid反発 (団子化防止)
      for (let j = 0; j < aliveSquad.length; j++) {
        if (idx === j) continue;
        const other = aliveSquad[j];
        const odx = soldier.x - other.x;
        const ody = soldier.y - other.y;
        const odist = Math.hypot(odx, ody);
        if (odist > 0 && odist < 24) {
          const pushForce = (24 - odist) * 2.0 * dt;
          soldier.x += (odx / odist) * pushForce;
          soldier.y += (ody / odist) * pushForce;
        }
      }

      // 戦闘中の自己回復（携帯ポーション購入・応急手当）
      soldier.medCooldown = (soldier.medCooldown || 0) - dt;
      if (soldier.hp < soldier.maxHp * 0.45 && soldier.medCooldown <= 0) {
        if ((soldier.gold || 0) >= 8) {
          soldier.gold -= 8;
          soldier.medCooldown = 4.0;
          const heal = Math.floor(soldier.maxHp * 0.38);
          soldier.hp = Math.min(soldier.maxHp, soldier.hp + heal);
          this.spawnDamageText(soldier.x, soldier.y - 24, '💚手当て! (-8G)', '#34d399');
          sound.playItem();
        }
      }

      // ドロップへの関心（近くに非ボス宝箱があれば拾いに向かう）
      let dropGoal = null;
      let minDropDist = 110;
      for (const drop of this.dropsOnField) {
        if (drop.isBoss) continue; // ボスドロップは兵士は触らない！
        const d = Math.hypot(drop.x - soldier.x, drop.y - soldier.y);
        if (d < minDropDist) {
          minDropDist = d;
          dropGoal = drop;
        }
      }

      // 部隊重心を中心とした集団散開
      const angle = (idx / aliveSquad.length) * Math.PI * 2 + (now * 0.0006);
      const scatterDist = 36 + (idx % 4) * 14;
      let myGoalX = squadTargetX + Math.cos(angle) * scatterDist;
      let myGoalY = squadTargetY + Math.sin(angle) * scatterDist;

      // 敵が近くにいない、または宝箱が至近ならドロップを優先回収
      const nearestEnemy = this.getNearestMonster(soldier.x, soldier.y);
      const enemyDist = nearestEnemy ? Math.hypot(nearestEnemy.x - soldier.x, nearestEnemy.y - soldier.y) : 9999;
      if (dropGoal && (enemyDist > 65 || minDropDist < 45)) {
        myGoalX = dropGoal.x;
        myGoalY = dropGoal.y;
      }

      const dx = myGoalX - soldier.x;
      const dy = myGoalY - soldier.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const moveStep = Math.min(d * 3.5, soldierSpeedLimit) * dt;
        soldier.x += (dx / d) * moveStep;
        soldier.y += (dy / d) * moveStep;
        soldier.facingAngle = Math.atan2(dy, dx);
      }

      // 兵士の攻撃アニメ減衰
      if (soldier.atkAnim > 0) soldier.atkAnim -= dt * 5;

      // 兵士のオート攻撃
      soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
      if (nearestEnemy && soldier.atkCooldown <= 0) {
        const distE = Math.hypot(nearestEnemy.x - soldier.x, nearestEnemy.y - soldier.y);
        if (distE <= 44) {
          soldier.atkCooldown = 0.85;
          soldier.atkAnim = 1.0;
          soldier.facingAngle = Math.atan2(nearestEnemy.y - soldier.y, nearestEnemy.x - soldier.x);
          const totalAtk = soldier.atk + (soldier.weapon ? soldier.weapon.stats.atk || 0 : 0);
          this.performAttack(soldier, nearestEnemy, false, totalAtk);
        }
      }
    });

    // 主人公の自動攻撃
    this.player.atkCooldown -= dt;
    if (this.player.slashAnim > 0) this.player.slashAnim -= dt * 6;

    const nearestMonster = this.getNearestMonster(this.player.x, this.player.y);
    if (nearestMonster && this.player.atkCooldown <= 0) {
      const dist = Math.hypot(nearestMonster.x - this.player.x, nearestMonster.y - this.player.y);
      if (dist <= 85) {
        this.player.atkCooldown = 0.52 / (this.player.atkSpeed || 1);
        this.player.slashAngle = Math.atan2(nearestMonster.y - this.player.y, nearestMonster.x - this.player.x);
        this.player.slashAnim = 1;
        this.performAttack(this.player, nearestMonster, true);
      }
    }

    // モンスター生成 (大軍勢パック湧き)
    if (this.spawnedInWave < this.waveMonsterCount) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= Math.max(1.0, 2.2 - this.wave * 0.08)) {
        this.spawnTimer = 0;
        this.spawnPack(Math.min(9, 4 + Math.floor(this.wave / 2)));
      }
    }

    // モンスターの追跡＆攻撃
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.hitPulse > 0) m.hitPulse -= dt * 4;

      // 最も近い獲物（主人公または仲間兵士）
      let target = this.player;
      let minDist = Math.hypot(this.player.x - m.x, this.player.y - m.y);

      for (const s of aliveSquad) {
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

    // ドロップ回収: 1. 兵士による回収 (ボス以外)
    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      if (drop.isBoss) continue; // ボスドロップは兵士は触らない！

      for (const s of aliveSquad) {
        const distS = Math.hypot(drop.x - s.x, drop.y - s.y);
        if (distS < 24) {
          const item = drop.item;
          this.dropsOnField.splice(i, 1);
          if (item.type === 'WEAPON' && (!s.weapon || (item.stats.atk || 0) > (s.weapon.stats.atk || 0))) {
            s.weapon = item;
            this.spawnDamageText(s.x, s.y - 20, `🗡️[${item.name}]装備!`, '#38bdf8');
          } else {
            const sellVal = Math.floor(8 + item.tier * 6 + (item.upgrade || 0) * 4);
            s.gold = (s.gold || 0) + sellVal;
            this.spawnDamageText(s.x, s.y - 20, `📦換金+${sellVal}G`, '#fbbf24');
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
    let dmg = customAtk !== undefined ? customAtk : attacker.atk;
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
    const reduction = target.dmgReduction ? Math.min(0.35, target.dmgReduction / 100) : 0;
    const dmg = Math.max(1, Math.round(rawDmg * (1 - reduction)));
    target.hp -= dmg;
    this.spawnDamageText(target.x, target.y - 12, dmg, '#ff3344');
    sound.playBomb();

    if (target.hp <= 0) {
      if (target === this.player) {
        this.gameOver();
      } else {
        target.dead = true;
        this.spawnSparks(target.x, target.y, '#ffffff', 14);
        const nameDisp = target.isNamed ? `【${target.title}${target.name}】` : target.name;
        this.showToast(`☠️ ${nameDisp}が戦死した…`);
        this.updateStatsUI();
      }
    }
  },

  killMonster(monster, attacker, isPlayer) {
    const idx = this.monsters.indexOf(monster);
    if (idx !== -1) this.monsters.splice(idx, 1);
    this.waveKills++;

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

      // プレイヤーのレベルアップ判定
      while (this.player.exp >= (this.player.reqExp || 20)) {
        this.player.exp -= this.player.reqExp;
        this.player.level = (this.player.level || 1) + 1;
        this.player.reqExp = Math.floor(this.player.reqExp * 1.45 + 10);
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

      // 兵士のレベルアップ判定
      while (attacker.exp >= (attacker.reqExp || 14)) {
        attacker.exp -= attacker.reqExp;
        attacker.level = (attacker.level || 1) + 1;
        attacker.reqExp = Math.floor(attacker.reqExp * 1.5 + 8);
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
    while (this.rankIndex < RANKS.length - 1 && this.exp >= RANKS[this.rankIndex + 1].reqExp) {
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
    if (item.type === 'WEAPON' && !this.equipped.weapon) {
      this.equipItem(item);
      autoEquipped = true;
    } else if (item.type === 'ARMOR' && !this.equipped.armor) {
      this.equipItem(item);
      autoEquipped = true;
    } else if (item.type === 'AMULET' && !this.equipped.amulet) {
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


  equipItem(item) {
    if (item.type === 'WEAPON') {
      this.equipped.weapon = item;
    } else if (item.type === 'ARMOR') {
      this.equipped.armor = item;
    } else if (item.type === 'AMULET') {
      this.equipped.amulet = item;
    }
    this.recalcPlayerStats();
    sound.playTap();
    this.saveGame();
    this.updateStatsUI();
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

    item.upgrade = (item.upgrade || 0) + 1;
    if (!item.baseName) {
      item.baseName = item.name.replace(/\+\d+$/, '');
    }
    item.name = `${item.baseName}+${item.upgrade}`;

    if (item.type === 'WEAPON') {
      item.stats.atk = Math.round((item.stats.atk || 10) * 1.25 + 3);
    } else if (item.type === 'ARMOR') {
      item.stats.hp = Math.round((item.stats.hp || 30) * 1.25 + 15);
    } else if (item.type === 'AMULET') {
      if (item.stats.speed) item.stats.speed += 2;
      if (item.stats.atkSpeed) item.stats.atkSpeed += 4;
    }

    sound.playHighScore();
    this.showToast(`🔨 鍛冶完了！「${item.name}」に強化成功！`);

    // 装備中ならプレイヤー反映
    if (this.equipped.weapon && this.equipped.weapon.id === item.id) this.equipItem(this.equipped.weapon);
    if (this.equipped.armor && this.equipped.armor.id === item.id) this.equipItem(this.equipped.armor);
    if (this.equipped.amulet && this.equipped.amulet.id === item.id) this.equipItem(this.equipped.amulet);

    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
    return true;
  },

  upgradeSoldierWeapon(soldierId) {
    const s = this.squad.find(sol => sol.id === soldierId);
    if (!s || !s.weapon) return;
    const cost = this.getUpgradeCost(s.weapon);
    if ((s.gold || 0) < cost) {
      alert(`兵士の予算が足りません (兵士所持金: ${s.gold || 0}G / 必要: ${cost}G)`);
      return;
    }
    s.gold -= cost;
    this.upgradeItem(s.weapon, true);
    this.recalcSoldierStats(s);
    sound.playHighScore();
    this.showToast(`🔨 ${s.name}が自費で「${s.weapon.name}」を強化！`);
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

  giveWeaponToSoldier(soldierId, weaponItem) {
    const soldier = this.squad.find(s => s.id === soldierId);
    if (!soldier) return;

    soldier.weapon = weaponItem;
    this.recalcSoldierStats(soldier);
    this.inventory = this.inventory.filter(i => i.id !== weaponItem.id);
    sound.playHighScore();
    this.showToast(`⚔️ ${soldier.isNamed ? soldier.name : soldier.name}に「${weaponItem.name}」を支給！`);
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

    // 各兵士の自費治療 ＆ 生還ステータスアップ
    let fullHealedCount = 0;
    let brokeSoldiersCount = 0;

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
      }
    });

    this.treatmentReport = { fullHealedCount, brokeSoldiersCount };
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
      reportEl.textContent = '装備の強化鍛冶、武器の支給、兵士の叙勲や治療を行えます。';
      nextBtn.classList.add('hidden');
      closeBtn.classList.remove('hidden');
      this.inBattle = false;
    } else {
      titleEl.textContent = `⚔️ WAVE ${this.wave} 突破！本陣帰還`;
      const alive = this.squad.filter(s => !s.dead);
      const deadCount = this.squad.length - alive.length;
      const rep = this.treatmentReport || { fullHealedCount: alive.length, brokeSoldiersCount: 0 };
      reportEl.innerHTML = `
        激戦を生き延びた！ 生存部隊: <strong style="color:#00ffaa;">${alive.length}名</strong> ${deadCount > 0 ? `<span style="color:#ff4444;">(${deadCount}名戦死 / 次戦新兵補充)</span>` : ''}<br>
        🛡️ <strong style="color:#38bdf8;">【生還ボーナス】</strong>全員のステータス向上！(あなた: HP+20, ATK+4 / 兵士: HP+14, ATK+3)<br>
        🏥 <strong style="color:#34d399;">【宿営手当て】</strong>各自の予算で治療完了（自費全快: <strong>${rep.fullHealedCount}名</strong> / 資金不足残傷: <strong style="color:#f59e0b;">${rep.brokeSoldiersCount}名</strong>）
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
          <strong style="color: #38bdf8; font-size: 12px;">🎖️ 隊長の武勲（撃墜数パワーアップ）</strong>
          <span style="color: #94a3b8; font-size: 10px;">総討伐: ${p.kills || 0}体</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3px; color: #cbd5e1;">
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
    
    const renderEquipRow = (slotName, icon, item) => {
      if (!item) {
        return `
          <div style="font-size: 12px; margin-bottom: 6px; color: #888; display:flex; justify-content:space-between; align-items:center;">
            <span>${icon} ${slotName}: <strong>支給品 (なし)</strong></span>
          </div>`;
      }
      const cost = this.getUpgradeCost(item);
      const statText = item.type === 'WEAPON' ? `+${item.stats.atk} ATK` : (item.type === 'ARMOR' ? `+${item.stats.hp} HP` : `SPD+${item.stats.speed}`);
      return `
        <div style="font-size: 12px; margin-bottom: 6px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="color:${item.color}; font-weight:bold;">${icon} [T${item.tier} ${item.mat}] ${item.name}</span>
            <span style="color:#aaa; font-size:11px; margin-left:4px;">(${statText})</span>
          </div>
          <button class="mini-btn btn-up-equipped" data-slot="${item.type}" style="background:#f59e0b; color:#0b0d14;">🔨 強化 [${cost}G]</button>
        </div>`;
    };

    playerEquipBox.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: #ffaa00; margin-bottom: 6px;">【あなたの装備】(鍛冶屋で強化可能)</div>
      ${renderEquipRow('武器', '🗡️', eq.weapon)}
      ${renderEquipRow('防具', '🛡️', eq.armor)}
      ${renderEquipRow('装飾', '📿', eq.amulet)}
    `;

    // 装備中アイテムの強化イベント
    playerEquipBox.querySelectorAll('.btn-up-equipped').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = btn.dataset.slot;
        const item = slot === 'WEAPON' ? eq.weapon : (slot === 'ARMOR' ? eq.armor : eq.amulet);
        if (item) this.upgradeItem(item);
      });
    });

    const invList = document.getElementById('inventory-list');
    if (!this.inventory || this.inventory.length === 0) {
      invList.innerHTML = '<div style="font-size: 12px; color: #666; text-align: center; padding: 10px;">バッグは空です (敵討伐や横取り😈で宝箱入手)</div>';
    } else {
      invList.innerHTML = '';
      this.inventory.forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid #23273c; font-size: 12px;';
        
        let statText = item.type === 'WEAPON' ? `ATK+${item.stats.atk}` : (item.type === 'ARMOR' ? `HP+${item.stats.hp}` : `装飾`);
        const isEquipped = (eq.weapon && eq.weapon.id === item.id) || (eq.armor && eq.armor.id === item.id) || (eq.amulet && eq.amulet.id === item.id);
        const upCost = this.getUpgradeCost(item);

        itemRow.innerHTML = `
          <div>
            <span style="color: ${item.color}; font-weight: bold;">[T${item.tier} ${item.mat}] ${item.name}</span>
            <span style="font-size: 11px; color: #aaa; margin-left: 4px;">(${statText})</span>
          </div>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="mini-btn btn-up-inv" style="background:#f59e0b; color:#0b0d14;">🔨+1 [${upCost}G]</button>
            ${isEquipped ? '<span style="color: #00ffaa; font-size: 11px;">装備中</span>' : `<button class="mini-btn equip-btn">装備</button>`}
          </div>
        `;

        const equipBtn = itemRow.querySelector('.equip-btn');
        if (equipBtn) {
          equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.equipItem(item);
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
      row.style.cssText = `background: ${isNamed ? 'rgba(255, 170, 0, 0.08)' : 'rgba(255, 255, 255, 0.02)'}; border-radius: 8px; padding: 8px; margin-bottom: 6px; border: 1px solid ${isNamed ? '#ffaa00' : '#23273c'};`;

      const availableWeapons = (this.inventory || []).filter(i => i.type === 'WEAPON' && (!eq.weapon || eq.weapon.id !== i.id));
      const canHonor = !isNamed && s.survivedWaves >= 2;
      const wUpCost = s.weapon ? this.getUpgradeCost(s.weapon) : 0;
      const hasWUpBudget = s.weapon && (s.gold || 0) >= wUpCost;

      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-bottom: 4px;">
          <span>
            ${isNamed ? '👑' : (s.bossKills > 0 ? '⭐' : '🎖️')} 
            <strong style="color: ${isNamed ? '#ffe600' : (s.bossKills > 0 ? '#38bdf8' : '#fff')};">${isNamed ? `${s.title}${s.name}` : s.name}</strong> 
            <span style="color:#00f0ff; font-size: 11px;">[Lv.${s.level || 1} ${s.rankTitle}]</span>
          </span>
          <span style="font-size: 11px;">💰 <strong style="color:#ffe600;">${s.gold || 0}G</strong> | ⚔️ <strong>${s.minionKills || 0}</strong> | 👑 <strong>${s.bossKills || 0}</strong></span>
        </div>
        <div style="font-size: 11px; color: #889; margin-bottom: 4px; display: flex; justify-content: space-between; align-items:center;">
          <span>HP: <strong style="color:${s.hp < s.maxHp ? '#f87171' : '#34d399'};">${Math.floor(s.hp)}</strong>/${s.maxHp} | ATK: ${s.atk} ${s.dmgReduction ? `<span style="color:#38bdf8;">(軽減-${s.dmgReduction}%)</span>` : ''} (生還:${s.survivedWaves}回)</span>
          ${s.weapon ? `<span style="color:${s.weapon.color}; font-weight:bold;">[${s.weapon.name}]</span>` : '<span style="color:#666;">[支給短剣]</span>'}
        </div>
        <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
          ${canHonor ? `<button class="mini-btn btn-honor" style="background:#ffaa00; color:#0b0d14;">🎖️ 名前を叙勲授与！</button>` : ''}
          ${s.weapon ? `
            <button class="mini-btn btn-soldier-up" style="background:${hasWUpBudget ? '#10b981' : '#4b5563'}; color:#fff;" title="兵士が自費で武器を強化">
              🔨 自費強化 (+1) [${wUpCost}G]
            </button>
          ` : ''}
          ${availableWeapons.length > 0 && !s.weapon ? `
            <select class="mini-select select-weapon-${s.id}" style="font-size: 11px; background: #141724; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px 4px; flex: 1;">
              <option value="">武器支給...</option>
              ${availableWeapons.map(w => `<option value="${w.id}">[T${w.tier} ${w.mat}] ${w.name} (+${w.stats.atk})</option>`).join('')}
            </select>
            <button class="mini-btn btn-give-w">支給</button>
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
          this.upgradeSoldierWeapon(s.id);
        });
      }

      const giveBtn = row.querySelector('.btn-give-w');
      if (giveBtn) {
        giveBtn.addEventListener('click', () => {
          const sel = row.querySelector(`.select-weapon-${s.id}`);
          if (sel && sel.value) {
            const w = availableWeapons.find(item => item.id === sel.value);
            if (w) this.giveWeaponToSoldier(s.id, w);
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

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 1. 大地・戦場フィールド
    this.drawBattlefield(this.ctx, now);

    // 2. 自軍砦本陣 (治癒砦・城塞壁・風になびく王国旗)
    this.drawBaseCamp(this.ctx, now);

    // 3. ドロップ宝箱
    for (const drop of this.dropsOnField) {
      this.drawChest(this.ctx, drop, now);
    }

    // 3.5 背後の樹木・岩・野営設備（主人公より奥のもの）
    const pyDepth = this.player ? this.player.y : 0;
    this.drawWorldObjects(this.ctx, now, false, pyDepth);

    // 4. モンスターたち (ゴブリン・オーク・ドラゴン)
    for (const m of this.monsters) {
      this.drawMonster(this.ctx, m, now);
    }

    // 5. 仲間兵士たち (槍兵・剣盾兵・叙勲エリート兵)
    if (this.squad) {
      this.squad.forEach((s) => {
        if (!s.dead) this.drawSoldier(this.ctx, s, now);
      });
    }

    // 6. 主人公 (兜・甲冑・マント・剣・盾・斬撃エフェクト)
    if (this.player) {
      this.drawPlayer(this.ctx, this.player, now);
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
    const sx = Math.max(0, Math.floor(this.camera.x) - 2);
    const sy = Math.max(0, Math.floor(this.camera.y) - 2);
    const sw = Math.min(MAP_WIDTH - sx, Math.ceil(this.width) + 6);
    const sh = Math.min(MAP_HEIGHT - sy, Math.ceil(this.height) + 6);
    ctx.drawImage(this.terrainCache, sx, sy, sw, sh, sx, sy, sw, sh);

    // 池の水面のきらめき
    for (const p of this.ponds) {
      if (p.x + p.rx < sx || p.x - p.rx > sx + sw || p.y + p.ry < sy || p.y - p.ry > sy + sh) continue;
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
  },

  drawWorldObjects(ctx, now, after, py) {
    if (!this.worldObjs) return;
    const vx0 = this.camera.x - 90, vx1 = this.camera.x + this.width + 90;
    const vy0 = this.camera.y - 20, vy1 = this.camera.y + this.height + 120;
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
    const vx0 = this.camera.x - 30, vx1 = this.camera.x + this.width + 30;
    const vy0 = this.camera.y - 30, vy1 = this.camera.y + this.height + 30;
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

    // 1. 足元ソフトシャドウ
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, m.radius * 0.7, m.radius * 0.9, m.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = Math.sin(now * 0.012 + (m.x % 10)) * 1.5;

    if (m.type === 'goblin') {
      // ===== ゴブリン (小型・緑の小鬼) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#22c55e';
      
      // 尖った耳
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-7, -4 + bob);
      ctx.lineTo(-14, -8 + bob);
      ctx.lineTo(-5, 0 + bob);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(7, -4 + bob);
      ctx.lineTo(14, -8 + bob);
      ctx.lineTo(5, 0 + bob);
      ctx.fill();

      // 頭部と胴体
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, -2 + bob, 8, 0, Math.PI * 2);
      ctx.fill();

      // 赤い目
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-4, -4 + bob, 2.5, 2.5);
      ctx.fillRect(2, -4 + bob, 2.5, 2.5);

      // トゲ棍棒
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(6, 2 + bob);
      ctx.lineTo(12, -7 + bob);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(11, -8 + bob, 2.5, 2.5);

    } else if (m.type === 'orc') {
      // ===== オーク (中型エリート・筋肉質な蛮族) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#d97706';

      // 胴体
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0 + bob, 12, 0, Math.PI * 2);
      ctx.fill();

      // 角付き鉄兜
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, -4 + bob, 9, Math.PI, 0);
      ctx.fill();

      // 兜の左右の白い角
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-7, -5 + bob);
      ctx.lineTo(-13, -13 + bob);
      ctx.lineTo(-3, -7 + bob);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(7, -5 + bob);
      ctx.lineTo(13, -13 + bob);
      ctx.lineTo(3, -7 + bob);
      ctx.fill();

      // 光る赤い目と牙
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-4, -3 + bob, 3, 2);
      ctx.fillRect(1, -3 + bob, 3, 2);

      // バトルアックス（巨大斧）
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 6 + bob);
      ctx.lineTo(15, -12 + bob);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(14, -10 + bob, 6, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

    } else {
      // ===== ドラゴン / ボス (巨大な羽ばたく魔獣) =====
      const bodyColor = m.hitPulse > 0 ? '#ffffff' : '#b91c1c';

      // 足元の禍々しい魔方陣オーラ
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 10, 28, 0, Math.PI * 2);
      ctx.stroke();

      // 羽ばたく竜の翼
      const wingFlap = Math.sin(now * 0.007) * 8;
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(-8, -4 + bob);
      ctx.lineTo(-28, -20 + wingFlap + bob);
      ctx.lineTo(-18, 4 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(8, -4 + bob);
      ctx.lineTo(28, -20 + wingFlap + bob);
      ctx.lineTo(18, 4 + bob);
      ctx.closePath();
      ctx.fill();

      // 巨体
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0 + bob, 18, 0, Math.PI * 2);
      ctx.fill();

      // 鋭い角
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-8, -12 + bob);
      ctx.lineTo(-14, -26 + bob);
      ctx.lineTo(-3, -16 + bob);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -12 + bob);
      ctx.lineTo(14, -26 + bob);
      ctx.lineTo(3, -16 + bob);
      ctx.fill();

      // 金色の猛獣眼
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-6, -6 + bob, 4, 3);
      ctx.fillRect(2, -6 + bob, 4, 3);
    }

    // HPバー
    const barW = Math.max(22, m.radius * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, -m.radius - 10, barW, 4);
    ctx.fillStyle = m.isBoss ? '#ef4444' : '#f97316';
    ctx.fillRect(-barW / 2, -m.radius - 10, barW * (m.hp / m.maxHp), 4);

    ctx.restore();
  },

  drawSoldier(ctx, s, now) {
    ctx.save();
    ctx.translate(s.x, s.y);

    // 足元シャドウ
    ctx.fillStyle = s.isNamed ? 'rgba(251, 191, 36, 0.25)' : 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 8, s.isNamed ? 11 : 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 叙勲エリート兵の足元オーラ
    if (s.isNamed) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 6, 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 向きと歩行ボビング
    const bob = Math.sin(now * 0.012 + (s.animOffset || 0)) * 1.5;

    ctx.save();
    ctx.rotate(s.facingAngle || 0);

    // マント (叙勲兵のみ青い肩マント)
    if (s.isNamed) {
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(-6, -6 + bob);
      ctx.lineTo(-12, -2 + bob);
      ctx.lineTo(-6, 6 + bob);
      ctx.closePath();
      ctx.fill();
    }

    // 胴体 (新兵は革鎧、叙勲兵は銀甲冑)
    ctx.fillStyle = s.isNamed ? '#94a3b8' : '#78350f';
    ctx.beginPath();
    ctx.arc(0, 0 + bob, s.isNamed ? 8 : 7, 0, Math.PI * 2);
    ctx.fill();

    // 頭部・兜
    ctx.fillStyle = s.isNamed ? '#cbd5e1' : '#475569';
    ctx.beginPath();
    ctx.arc(0, -3 + bob, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // バイザースリット
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(1, -4 + bob, 3, 1.5);

    // 武器描画 (槍兵 or 剣兵)
    if (s.role === 'spear') {
      // ===== 槍兵 =====
      const thrust = (s.atkAnim || 0) * 14;
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 4 + bob);
      ctx.lineTo(16 + thrust, 4 + bob);
      ctx.stroke();

      // 銀の槍穂
      ctx.fillStyle = s.isNamed ? '#fbbf24' : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(16 + thrust, 2 + bob);
      ctx.lineTo(23 + thrust, 4 + bob);
      ctx.lineTo(16 + thrust, 6 + bob);
      ctx.closePath();
      ctx.fill();
    } else {
      // ===== 剣盾兵 =====
      // 左手の丸盾
      ctx.fillStyle = s.isNamed ? '#1e3a8a' : '#78350f';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(2, -6 + bob, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 右手の短剣
      ctx.strokeStyle = s.isNamed ? '#fbbf24' : '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(2, 4 + bob);
      ctx.lineTo(14, 7 + bob);
      ctx.stroke();
    }

    ctx.restore(); // 向き復元

    // 頭上ネームプレート
    ctx.textAlign = 'center';
    const sLv = s.level || 1;
    if (s.isNamed) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px sans-serif';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText(`✨ Lv.${sLv} ${s.title}${s.name}`, 0, -14);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px sans-serif';
      ctx.fillText(`Lv.${sLv} ${s.name}`, 0, -12);
    }

    // HPバー
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-10, 10, 20, 3);
    ctx.fillStyle = s.isNamed ? '#fbbf24' : '#10b981';
    ctx.fillRect(-10, 10, 20 * (s.hp / s.maxHp), 3);

    ctx.restore();
  },

  drawPlayer(ctx, p, now) {
    ctx.save();
    ctx.translate(p.x, p.y);

    // 足元シャドウ
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const isMoving = this.joystick && this.joystick.active;
    const walkBob = isMoving ? Math.sin(now * 0.016) * 2 : 0;

    ctx.save();
    ctx.rotate(p.facingAngle || 0);

    // 1. マント (伍長以上は青、隊長以上は紅)
    const capeColor = this.rankIndex >= 4 ? '#b91c1c' : (this.rankIndex >= 2 ? '#1d4ed8' : '#334155');
    const capeWave = Math.sin(now * 0.01) * 3;
    ctx.fillStyle = capeColor;
    ctx.beginPath();
    ctx.moveTo(-6, -7 + walkBob);
    ctx.lineTo(-16 + capeWave, 0 + walkBob);
    ctx.lineTo(-6, 7 + walkBob);
    ctx.closePath();
    ctx.fill();

    // 2. 胴体甲冑 (装備中の防具色を反映)
    const armorColor = (this.equipped && this.equipped.armor) ? this.equipped.armor.color : '#3b82f6';
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.arc(0, 0 + walkBob, 9, 0, Math.PI * 2);
    ctx.fill();

    // 胸当ての金属光沢ライン
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0 + walkBob, 6, -1, 1);
    ctx.stroke();

    // 3. 頭部 (兜・アイアンヘルム)
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(0, -3 + walkBob, 7, 0, Math.PI * 2);
    ctx.fill();

    // バイザースリット (光る目のスリット)
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(2, -4 + walkBob, 4, 2);

    // 出世の兜飾り (伍長は青羽飾り、隊長は金の王冠)
    if (this.rankIndex >= 4) {
      // 金の王冠クレスト
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-4, -10 + walkBob);
      ctx.lineTo(0, -14 + walkBob);
      ctx.lineTo(4, -10 + walkBob);
      ctx.fill();
    } else if (this.rankIndex >= 2) {
      // 伍長プルーム (羽飾り)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2, -12 + walkBob, 4, 3);
    }

    // 4. 左手の盾 (カイトシールド)
    ctx.fillStyle = armorColor;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(3, -7 + walkBob);
    ctx.lineTo(9, -7 + walkBob);
    ctx.lineTo(7, -13 + walkBob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. 右手の剣 (装備中の武器色を反映)
    const weaponColor = (this.equipped && this.equipped.weapon) ? this.equipped.weapon.color : '#60a5fa';
    ctx.strokeStyle = weaponColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = weaponColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(3, 5 + walkBob);
    ctx.lineTo(17, 8 + walkBob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 攻撃スイング時の光刃エフェクト
    if (p.slashAnim > 0) {
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = weaponColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 36, -0.6, 0.6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore(); // 向き復元

    // 頭上階級マーク ＆ レベル
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const mark = this.rankIndex >= 4 ? '👑' : (this.rankIndex >= 2 ? '⭐' : '🛡️');
    ctx.fillText(mark, 0, -22);
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText(`Lv.${p.level || 1} あなた`, 0, -12);
    ctx.shadowBlur = 0;

    // HPバー
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-16, -15, 32, 4);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-16, -15, 32 * (p.hp / p.maxHp), 4);

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

    const overlay = document.getElementById('game-overlay');
    document.getElementById('final-wave').textContent = this.wave;
    document.getElementById('final-rank').textContent = RANKS[this.rankIndex].title;
    const finalMinions = document.getElementById('final-minions');
    if (finalMinions) finalMinions.textContent = this.player ? (this.player.minionKills || 0) : 0;
    const finalBosses = document.getElementById('final-bosses');
    if (finalBosses) finalBosses.textContent = this.player ? (this.player.bossKills || 0) : 0;
    overlay.classList.remove('hidden');
  },

  destroy() {
    this.stopGameLoop();
    window.removeEventListener('resize', this.resizeCanvas);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundDown);
      window.removeEventListener('mousemove', this.boundMove);
      window.removeEventListener('mouseup', this.boundUp);
      this.canvas.removeEventListener('touchstart', this.boundDown);
      window.removeEventListener('touchmove', this.boundMove);
      window.removeEventListener('touchend', this.boundUp);
      window.removeEventListener('touchcancel', this.boundUp);
    }
  }
};
