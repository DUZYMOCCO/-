/**
 * ゲーム3: IRON SQUAD (アイアン・スクワッド: 雑兵立身出世録)
 * ローグライク・アクションRPG
 * 
 * [大型アップデート]
 *  - 兵士初期10名スタート！
 *  - 兵士は最初「名もなき雑兵」。生き残り強くなると二つ名と名前（叙勲）を授与！
 *  - 広い戦場マップ (1800x1800) ＆ カメラ追従スクロール ＆ ミニマップレーダー！
 *  - 自軍の拠点（砦・本陣キャンプ）：エリア内に入ると部隊全員がリジェネ治癒回復！
 *  - ウェーブ間の本格「戦略タイム」（野戦治療、装備配備、戦術陣形選択、叙勲）
 *  - 完全オートセーブ（いつでも中断・再開可能）
 */
import { sound } from '../../audio.js';
import { storage } from '../../storage.js';

const MAP_WIDTH = 1800;
const MAP_HEIGHT = 1800;
const BASE_CAMP = { x: 900, y: 900, radius: 150 };

// 階級データ (大所帯スタート)
const RANKS = [
  { level: 1, title: '二等小隊長', reqExp: 0, maxSquad: 10, bonusHp: 0, bonusAtk: 0 },
  { level: 2, title: '一等小隊長', reqExp: 80, maxSquad: 12, bonusHp: 40, bonusAtk: 10 },
  { level: 3, title: '分隊司令官', reqExp: 200, maxSquad: 14, bonusHp: 90, bonusAtk: 22 },
  { level: 4, title: '百人隊長', reqExp: 400, maxSquad: 16, bonusHp: 160, bonusAtk: 40 },
  { level: 5, title: '大隊司令官', reqExp: 700, maxSquad: 18, bonusHp: 260, bonusAtk: 65 },
  { level: 6, title: '千人将', reqExp: 1100, maxSquad: 20, bonusHp: 400, bonusAtk: 100 },
  { level: 7, title: '近衛騎士団長', reqExp: 1700, maxSquad: 24, bonusHp: 600, bonusAtk: 150 },
  { level: 8, title: '軍団総司令官', reqExp: 2500, maxSquad: 28, bonusHp: 900, bonusAtk: 220 },
  { level: 9, title: '救国の英雄神将', reqExp: 3600, maxSquad: 32, bonusHp: 1300, bonusAtk: 320 }
];

const TITLES = ['不屈の', '疾風の', '鉄壁の', '歴戦の', '鬼神の', '紅蓮の', '隻眼の', '魔刃の', '金剛の', '閃光の'];
const NAMES = ['ボブ', 'ガッツ', 'ルーク', 'ジーク', 'レオ', 'ジャック', 'トール', 'ハンス', 'マルコ', 'オットー', 'クルト', 'フィン', 'クラーク', 'エリック', 'ロイ', 'アル', 'レオン', 'ギル', 'セドリック', 'バルト', 'オスカー', 'アラン', 'ブルーノ', 'ダン'];

// ランダムぶっ飛びドロップ生成
function generateRandomDrop(wave) {
  const rarities = [
    { name: 'コモン', color: '#a0aab8', weight: 45, mult: 1 },
    { name: 'レア', color: '#00d0ff', weight: 30, mult: 2.2 },
    { name: 'エピック', color: '#c040ff', weight: 16, mult: 4.5 },
    { name: 'レジェンダリー', color: '#ffaa00', weight: 7, mult: 9 },
    { name: '神話（GOD）', color: '#ff0055', weight: 2, mult: 22 }
  ];

  const totalWeight = rarities.reduce((a, b) => a + b.weight, 0);
  let rnd = Math.random() * totalWeight;
  let chosenRarity = rarities[0];
  for (const r of rarities) {
    if (rnd < r.weight) {
      chosenRarity = r;
      break;
    }
    rnd -= r.weight;
  }

  const types = ['WEAPON', 'ARMOR', 'AMULET'];
  const type = types[Math.floor(Math.random() * types.length)];

  const weaponPrefixes = ['錆びた', '鍛えし', '灼熱の', '疾風の', '冥府の', '神聖なる', '絶望を裂く', '銀河の'];
  const weaponNouns = ['短剣', '大剣', '戦斧', 'ハルバード', '魔導槍', '竜殺しの剣', '神殺しの刃'];
  const armorNouns = ['皮の鎧', '鎖帷子', '鉄の重鎧', 'ミスリル甲冑', '覇王の大鎧', '竜鱗の神衣'];
  const amuletNouns = ['幸運の指輪', '狂戦士の紋章', '死霊の魔石', '不死鳥の羽', '軍神の神核'];

  let itemName = '';
  const prefix = weaponPrefixes[Math.min(chosenRarity.mult > 5 ? 6 : Math.floor(Math.random() * weaponPrefixes.length), weaponPrefixes.length - 1)];

  if (type === 'WEAPON') {
    itemName = `${prefix}${weaponNouns[Math.floor(Math.random() * weaponNouns.length)]}`;
  } else if (type === 'ARMOR') {
    itemName = `${prefix}${armorNouns[Math.floor(Math.random() * armorNouns.length)]}`;
  } else {
    itemName = `${prefix}${amuletNouns[Math.floor(Math.random() * amuletNouns.length)]}`;
  }

  const baseValue = Math.floor(12 + wave * 7);
  const stats = {};
  if (type === 'WEAPON') {
    stats.atk = Math.floor(baseValue * chosenRarity.mult * (0.8 + Math.random() * 0.5));
    if (chosenRarity.mult >= 4) stats.crit = Math.min(80, Math.floor(15 * chosenRarity.mult * 0.3));
    if (chosenRarity.mult >= 9) stats.lightning = true;
  } else if (type === 'ARMOR') {
    stats.hp = Math.floor(baseValue * 4 * chosenRarity.mult * (0.8 + Math.random() * 0.5));
    if (chosenRarity.mult >= 4) stats.def = Math.floor(5 * chosenRarity.mult);
    if (chosenRarity.mult >= 9) stats.regen = Math.floor(5 * chosenRarity.mult);
  } else {
    stats.speed = Math.floor(10 * Math.min(3, chosenRarity.mult * 0.3));
    stats.atkSpeed = Math.floor(15 * Math.min(4, chosenRarity.mult * 0.4));
    if (chosenRarity.mult >= 9) stats.vampire = 0.25;
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    name: itemName,
    type,
    rarity: chosenRarity.name,
    color: chosenRarity.color,
    stats,
    isGod: chosenRarity.name.includes('神話')
  };
}

export const IronSquadGame = {
  id: 'iron-squad',
  title: 'IRON SQUAD',
  subtitle: '雑兵立身出世録',
  icon: '🛡️',
  color: '#ffaa00',
  description: '名もなき10人の兵士と共に生き残れ！砦を拠点に広大な戦場を駆け巡り、叙勲と立身出世を掴み取れ。',

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.highWave = storage.get('ironsquad_max_wave', 1);
    this.gold = 50; // 野戦治療・補給用
    this.formation = 'GUARD'; // 'GUARD', 'ASSAULT', 'WALL'
    this.camera = { x: BASE_CAMP.x, y: BASE_CAMP.y };
    this.setupUI();
    this.checkSavedGame();
  },

  setupUI() {
    this.container.innerHTML = `
      <div class="game-wrapper">
        <header class="game-header">
          <button id="btn-back" class="icon-btn" title="工房へ戻る">🏠</button>
          <div class="game-stats" style="flex: 1; justify-content: space-around;">
            <div class="stat-box">
              <span class="stat-label">階級</span>
              <span id="player-rank" class="stat-value" style="color: #ffaa00;">二等小隊長</span>
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

          <!-- 拠点治癒インジケータ -->
          <div id="base-heal-badge" class="base-badge hidden">💚 砦本陣で部隊治癒中</div>

          <!-- ドロップ獲得トースト -->
          <div id="drop-banner" class="drop-banner hidden"></div>

          <!-- ミニマップレーダー -->
          <div class="minimap-container">
            <canvas id="minimap-canvas" width="70" height="70"></canvas>
          </div>

          <!-- スタート / 中断再開モーダル -->
          <div id="start-modal" class="game-overlay">
            <div class="overlay-content" style="max-width: 320px;">
              <h2 style="color: #ffaa00; font-size: 22px; margin-bottom: 8px;">🛡️ IRON SQUAD</h2>
              <p style="font-size: 12px; color: #aaa; margin-bottom: 16px;">名もなき10人の兵士から始まる立身出世と生存の叙事詩</p>
              
              <div id="resume-container" class="hidden" style="margin-bottom: 12px;">
                <button id="btn-resume-game" class="action-btn" style="background: linear-gradient(135deg, #10b981, #059669);">
                  ▶ 続きから再開 (<span id="resume-info">WAVE 1</span>)
                </button>
                <p style="font-size: 11px; color: #10b981; margin-top: 4px;">※オートセーブデータから復帰</p>
              </div>

              <button id="btn-new-game" class="action-btn">新小隊を率いて出撃</button>
              <button id="btn-title-back" class="action-btn secondary" style="margin-top: 8px;">工房へ戻る</button>
            </div>
          </div>

          <!-- 戦略タイム（宿営地）モーダル -->
          <div id="strategy-modal" class="game-overlay hidden">
            <div class="overlay-content" style="max-width: 380px; max-height: 88vh; overflow-y: auto; text-align: left; padding: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 id="strat-title" style="color: #ffaa00; font-size: 18px; margin: 0;">⛺ 本陣戦略会議</h3>
                <span style="font-size: 11px; color: #ffe600;">所持金: <strong id="strat-gold">50</strong>G</span>
              </div>
              <p id="strat-report" style="font-size: 12px; color: #b0bacd; margin-bottom: 12px;"></p>

              <!-- 戦略クイックアクション -->
              <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--surface-border); border-radius: 10px; padding: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 12px; font-weight: bold; color: #34d399;">🏥 野戦治療 (部隊全員を全回復)</div>
                  <div style="font-size: 10px; color: #889;">費用: 30G</div>
                </div>
                <button id="btn-heal-all" class="mini-btn" style="background:#10b981; color:#fff;">治療する</button>
              </div>

              <!-- 戦術陣形選択 -->
              <div style="margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: bold; color: #889; margin-bottom: 6px;">【戦術陣形の選択】</div>
                <div style="display: flex; gap: 6px;">
                  <button class="formation-btn active" data-form="GUARD">🛡️ 護衛陣<br><span style="font-size:9px;">守り重視</span></button>
                  <button class="formation-btn" data-form="ASSAULT">⚔️ 突撃陣<br><span style="font-size:9px;">ATK+25%</span></button>
                  <button class="formation-btn" data-form="WALL">🧱 密集陣<br><span style="font-size:9px;">被ダメ-30%</span></button>
                </div>
              </div>

              <!-- タブ切り替え -->
              <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                <button id="tab-strat-squad" class="sub-tab-btn active">👥 部隊名簿＆叙勲</button>
                <button id="tab-strat-equip" class="sub-tab-btn">🎒 主人公の装備</button>
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
            </div>
          </div>

          <!-- ゲームオーバー画面 -->
          <div id="game-overlay" class="game-overlay hidden">
            <div class="overlay-content">
              <h2 class="overlay-title">討死</h2>
              <p class="overlay-score">到達WAVE: <span id="final-wave">1</span></p>
              <p style="font-size: 13px; color: #aaa; margin-bottom: 8px;">最終階級: <strong id="final-rank" style="color:#ffaa00;">-</strong></p>
              <p style="font-size: 11px; color: #ff5555; margin-bottom: 14px;">※過酷な戦場にて部隊は全滅しました</p>
              <button id="btn-restart" class="action-btn">新小隊長として再入隊</button>
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

    document.getElementById('btn-title-back').addEventListener('click', () => {
      sound.playTap();
      this.destroy();
      this.onBackToHub();
    });

    document.getElementById('btn-new-game').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('start-modal').classList.add('hidden');
      this.startFreshGame();
    });

    document.getElementById('btn-resume-game').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('start-modal').classList.add('hidden');
      this.resumeSavedGame();
    });

    document.getElementById('btn-strategy').addEventListener('click', () => {
      sound.playTap();
      this.openStrategyModal(true);
    });

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

    // 陣形ボタン
    document.querySelectorAll('.formation-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playTap();
        document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.formation = btn.dataset.form;
        this.showToast(`陣形を【${btn.textContent.split('\n')[0]}】に変更！`);
        this.saveGame();
      });
    });

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

  checkSavedGame() {
    const saved = storage.get('ironsquad_save_data_v2', null);
    const resumeContainer = document.getElementById('resume-container');
    const resumeInfo = document.getElementById('resume-info');

    if (saved && saved.wave && saved.player) {
      resumeInfo.textContent = `WAVE ${saved.wave} - ${RANKS[saved.rankIndex || 0].title}`;
      resumeContainer.classList.remove('hidden');
    } else {
      resumeContainer.classList.add('hidden');
    }
  },

  setupGame() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasContainer = document.getElementById('canvas-container');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.resizeCanvas = () => {
      const rect = this.canvasContainer.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);

    this.setupInput();

    this.lastTime = performance.now();
    this.running = true;
    this.loop = (t) => {
      if (!this.running) return;
      const dt = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;
      this.update(dt);
      this.render();
      this.renderMinimap();
      requestAnimationFrame(this.loop);
    };
    requestAnimationFrame(this.loop);
  },

  startFreshGame() {
    this.wave = 1;
    this.exp = 0;
    this.gold = 60;
    this.rankIndex = 0;
    this.formation = 'GUARD';
    this.inBattle = true;

    // 主人公
    this.player = {
      x: BASE_CAMP.x,
      y: BASE_CAMP.y,
      hp: 150,
      maxHp: 150,
      atk: 28,
      atkSpeed: 1.0,
      speed: 135,
      atkCooldown: 0,
      crit: 10,
      vampire: 0,
      lightning: false,
      slashAngle: 0,
      slashAnim: 0
    };

    this.equipped = {
      weapon: null,
      armor: null,
      amulet: null
    };

    this.inventory = [];

    // 初期兵士10名スタート！最初は全員名無し雑兵
    this.squad = [];
    for (let i = 0; i < 10; i++) {
      this.squad.push(this.createNewSoldier(i + 1));
    }

    this.initBattlefield();
    this.saveGame();
    this.updateStatsUI();
  },

  resumeSavedGame() {
    const saved = storage.get('ironsquad_save_data_v2', null);
    if (!saved) {
      this.startFreshGame();
      return;
    }

    this.wave = saved.wave || 1;
    this.exp = saved.exp || 0;
    this.gold = saved.gold || 50;
    this.rankIndex = saved.rankIndex || 0;
    this.formation = saved.formation || 'GUARD';
    this.equipped = saved.equipped || { weapon: null, armor: null, amulet: null };
    this.inventory = saved.inventory || [];
    this.squad = saved.squad || [];

    this.player = {
      x: BASE_CAMP.x,
      y: BASE_CAMP.y,
      hp: saved.player.hp || 150,
      maxHp: saved.player.maxHp || 150,
      atk: 28 + RANKS[this.rankIndex].bonusAtk + (this.equipped.weapon ? this.equipped.weapon.stats.atk || 0 : 0),
      atkSpeed: 1.0 + (this.equipped.amulet ? (this.equipped.amulet.stats.atkSpeed || 0) * 0.01 : 0),
      speed: 135 + (this.equipped.amulet ? this.equipped.amulet.stats.speed || 0 : 0),
      atkCooldown: 0,
      crit: (this.equipped.weapon ? this.equipped.weapon.stats.crit : 10) || 10,
      vampire: (this.equipped.amulet ? this.equipped.amulet.stats.vampire : 0) || 0,
      lightning: (this.equipped.weapon ? this.equipped.weapon.stats.lightning : false) || false,
      slashAngle: 0,
      slashAnim: 0
    };

    this.initBattlefield();
    this.updateStatsUI();
    this.showToast(`💾 WAVE ${this.wave} のデータから再開しました！`);
  },

  initBattlefield() {
    this.inBattle = true;
    this.monsters = [];
    this.particles = [];
    this.damageTexts = [];
    this.dropsOnField = [];
    this.spawnTimer = 0;
    this.waveMonsterCount = 18 + this.wave * 6; // 大群
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
      rankTitle: '無名新兵',
      hp: 75,
      maxHp: 75,
      atk: 15,
      weapon: null,
      atkCooldown: 0,
      x: BASE_CAMP.x + (Math.random() - 0.5) * 80,
      y: BASE_CAMP.y + (Math.random() - 0.5) * 80,
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
        formation: this.formation,
        player: {
          hp: this.player.hp,
          maxHp: this.player.maxHp
        },
        equipped: this.equipped,
        inventory: this.inventory,
        squad: this.squad.filter(s => !s.dead)
      };
      storage.set('ironsquad_save_data_v2', data);
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  clearSavedGame() {
    storage.set('ironsquad_save_data_v2', null);
  },

  setupInput() {
    let originX = 0;
    let originY = 0;
    this.joystick = { active: false, x: 0, y: 0, dirX: 0, dirY: 0 };

    const onStart = (e) => {
      sound.unlock();
      const pos = this.getEventPos(e);
      this.joystick.active = true;
      this.joystick.x = pos.x;
      this.joystick.y = pos.y;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      originX = pos.x;
      originY = pos.y;
    };

    const onMove = (e) => {
      if (!this.joystick.active) return;
      const pos = this.getEventPos(e);
      const dx = pos.x - originX;
      const dy = pos.y - originY;
      const dist = Math.hypot(dx, dy);
      const maxDist = 45;

      if (dist > 0) {
        this.joystick.dirX = dx / Math.max(dist, 1);
        this.joystick.dirY = dy / Math.max(dist, 1);
        const clampDist = Math.min(dist, maxDist);
        this.joystick.x = originX + this.joystick.dirX * clampDist;
        this.joystick.y = originY + this.joystick.dirY * clampDist;
      }
    };

    const onEnd = () => {
      this.joystick.active = false;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
    };

    this.boundDown = onStart;
    this.boundMove = onMove;
    this.boundUp = onEnd;

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
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

  updateStatsUI() {
    const rank = RANKS[this.rankIndex];
    document.getElementById('player-rank').textContent = rank.title;
    document.getElementById('current-wave').textContent = this.wave;
    const aliveCount = this.squad.filter(s => !s.dead).length;
    document.getElementById('squad-alive').textContent = `${aliveCount}/${rank.maxSquad}`;
    document.getElementById('current-gold').textContent = `${this.gold}G`;
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
    this.waveMonsterCount = 18 + this.wave * 6;

    // プレイヤー回復
    this.player.hp = this.player.maxHp;

    const currentMax = RANKS[this.rankIndex].maxSquad;
    // 生存兵士の成長
    this.squad.forEach((s) => {
      if (!s.dead) {
        s.survivedWaves++;
        s.level++;
        s.maxHp += 20;
        s.atk += 5;
        if (!s.isNamed) {
          s.rankTitle = s.survivedWaves >= 2 ? '叙勲候補' : '古参雑兵';
        }
      }
    });

    // 死亡枠に新兵を補充
    this.squad = this.squad.filter(s => !s.dead);
    let newCount = 1;
    while (this.squad.length < currentMax) {
      this.squad.push(this.createNewSoldier(this.squad.length + newCount));
      newCount++;
    }

    this.saveGame();
    this.updateStatsUI();
  },

  spawnMonster() {
    // マップ外縁から出現
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * MAP_WIDTH; y = 40; }
    else if (side === 1) { x = MAP_WIDTH - 40; y = Math.random() * MAP_HEIGHT; }
    else if (side === 2) { x = Math.random() * MAP_WIDTH; y = MAP_HEIGHT - 40; }
    else { x = 40; y = Math.random() * MAP_HEIGHT; }

    const isBoss = (this.wave % 5 === 0) && (this.spawnedInWave === this.waveMonsterCount - 1);
    const isElite = Math.random() < 0.16;

    let type = 'goblin';
    let hp = 35 + this.wave * 12;
    let atk = 9 + this.wave * 3;
    let speed = 65 + Math.random() * 20;
    let radius = 11;
    let color = '#34d399';

    if (isBoss) {
      type = 'dragon';
      hp = (220 + this.wave * 70) * 4;
      atk = 24 + this.wave * 7;
      speed = 46;
      radius = 26;
      color = '#ef4444';
    } else if (isElite) {
      type = 'orc';
      hp = (50 + this.wave * 22) * 2;
      atk = 15 + this.wave * 4;
      speed = 52;
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

    // プレイヤー移動
    let speedMult = 1.0;
    if (this.formation === 'ASSAULT') speedMult = 1.2;
    if (this.formation === 'WALL') speedMult = 0.85;

    if (this.joystick.active) {
      this.player.x += this.joystick.dirX * this.player.speed * speedMult * dt;
      this.player.y += this.joystick.dirY * this.player.speed * speedMult * dt;
      this.player.x = Math.max(30, Math.min(MAP_WIDTH - 30, this.player.x));
      this.player.y = Math.max(30, Math.min(MAP_HEIGHT - 30, this.player.y));
    }

    // カメラのスムーズ追従
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
      const healAmt = 15 * dt;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
      this.squad.forEach((s) => {
        if (!s.dead) s.hp = Math.min(s.maxHp, s.hp + healAmt);
      });
    } else {
      healBadge.classList.add('hidden');
    }

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

    // 仲間兵士たちの陣形追従と攻撃
    const aliveSquad = this.squad.filter(s => !s.dead);
    aliveSquad.forEach((soldier, idx) => {
      // 陣形目標位置の計算
      let targetX, targetY;
      if (this.formation === 'GUARD') {
        // 主人公を囲む円陣
        const angle = (idx / aliveSquad.length) * Math.PI * 2 + (performance.now() * 0.0008);
        const dist = 42;
        targetX = this.player.x + Math.cos(angle) * dist;
        targetY = this.player.y + Math.sin(angle) * dist;
      } else if (this.formation === 'ASSAULT') {
        // 前方楔形陣
        const forwardAngle = this.player.slashAngle || 0;
        const offsetDist = 30 + Math.floor(idx / 2) * 22;
        const sideOffset = (idx % 2 === 0 ? 1 : -1) * (15 + (idx * 6));
        targetX = this.player.x + Math.cos(forwardAngle) * offsetDist + Math.sin(forwardAngle) * sideOffset;
        targetY = this.player.y + Math.sin(forwardAngle) * offsetDist - Math.cos(forwardAngle) * sideOffset;
      } else {
        // 密集陣 (WALL)
        const row = Math.floor(idx / 5);
        const col = (idx % 5) - 2;
        targetX = this.player.x + col * 20;
        targetY = this.player.y + (row + 1) * 24;
      }

      // 追従移動
      const dx = targetX - soldier.x;
      const dy = targetY - soldier.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        soldier.x += (dx / d) * Math.min(d * 4, 160) * dt;
        soldier.y += (dy / d) * Math.min(d * 4, 160) * dt;
      }

      // 攻撃
      soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
      const enemy = this.getNearestMonster(soldier.x, soldier.y);
      if (enemy && soldier.atkCooldown <= 0) {
        const distE = Math.hypot(enemy.x - soldier.x, enemy.y - soldier.y);
        if (distE <= 70) {
          soldier.atkCooldown = 0.72;
          let atkBonus = 0;
          if (this.formation === 'ASSAULT') atkBonus = soldier.atk * 0.25;
          const totalAtk = soldier.atk + atkBonus + (soldier.weapon ? soldier.weapon.stats.atk || 0 : 0);
          this.performAttack({ ...soldier, atk: totalAtk }, enemy, false);
        }
      }
    });

    // モンスター生成
    if (this.spawnedInWave < this.waveMonsterCount) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= Math.max(0.35, 1.2 - this.wave * 0.07)) {
        this.spawnTimer = 0;
        this.spawnMonster();
      }
    }

    // モンスターの追跡＆攻撃
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.hitPulse > 0) m.hitPulse -= dt * 4;

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
          let incomingDmg = m.atk;
          if (this.formation === 'WALL') incomingDmg = Math.floor(incomingDmg * 0.7); // 被ダメ30%減
          this.damageTarget(target, incomingDmg);
        }
      }
    }

    // 宝箱回収
    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      const dist = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
      if (dist < 42) {
        this.collectDrop(drop.item);
        this.dropsOnField.splice(i, 1);
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

    // ウェーブ完了判定
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

  performAttack(attacker, monster, isPlayer) {
    let dmg = attacker.atk;
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
      this.killMonster(monster);
    }
  },

  damageTarget(target, dmg) {
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

  killMonster(monster) {
    const idx = this.monsters.indexOf(monster);
    if (idx !== -1) this.monsters.splice(idx, 1);
    this.waveKills++;

    const expGain = monster.isBoss ? 60 : (monster.isElite ? 20 : 5);
    const goldGain = monster.isBoss ? 40 : (monster.isElite ? 15 : 3);
    this.gainExp(expGain);
    this.gold += goldGain;
    this.updateStatsUI();

    const dropRate = monster.isBoss ? 1.0 : (monster.isElite ? 0.65 : 0.14);
    if (Math.random() < dropRate) {
      const dropItem = generateRandomDrop(this.wave);
      this.dropsOnField.push({
        x: monster.x,
        y: monster.y,
        item: dropItem
      });
    }

    this.spawnSparks(monster.x, monster.y, monster.color, 14);
  },

  gainExp(amt) {
    this.exp += amt;
    while (this.rankIndex < RANKS.length - 1 && this.exp >= RANKS[this.rankIndex + 1].reqExp) {
      this.rankIndex++;
      const nextRank = RANKS[this.rankIndex];
      this.player.maxHp += nextRank.bonusHp;
      this.player.hp = this.player.maxHp;
      this.player.atk += nextRank.bonusAtk;
      sound.playHighScore();
      this.showToast(`🎖️ 【立身出世】${nextRank.title}に昇進！最大部隊${nextRank.maxSquad}名`);
      this.saveGame();
      this.updateStatsUI();
    }
  },

  collectDrop(item) {
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

    const toastText = item.isGod
      ? `🌟【神話DROP】${item.name}！(バッグに格納)`
      : `💎 [${item.rarity}] ${item.name} を入手！${autoEquipped ? ' (即時装備)' : ''}`;
    this.showToast(toastText);
    this.saveGame();
  },

  equipItem(item) {
    if (item.type === 'WEAPON') {
      this.equipped.weapon = item;
      this.player.atk = 28 + RANKS[this.rankIndex].bonusAtk + (item.stats.atk || 0);
      this.player.crit = item.stats.crit || 10;
      this.player.lightning = !!item.stats.lightning;
    } else if (item.type === 'ARMOR') {
      this.equipped.armor = item;
      this.player.maxHp = 150 + RANKS[this.rankIndex].bonusHp + (item.stats.hp || 0);
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    } else if (item.type === 'AMULET') {
      this.equipped.amulet = item;
      this.player.speed = 135 + (item.stats.speed || 0);
      this.player.atkSpeed = 1.0 + (item.stats.atkSpeed || 0) * 0.01;
      this.player.vampire = item.stats.vampire || 0;
    }
    sound.playTap();
    this.saveGame();
  },

  // 兵士の叙勲（名前授与システム）
  grantSoldierHonor(soldierId) {
    const s = this.squad.find(s => s.id === soldierId);
    if (!s || s.isNamed) return;

    s.isNamed = true;
    s.title = TITLES[Math.floor(Math.random() * TITLES.length)];
    s.name = NAMES[Math.floor(Math.random() * NAMES.length)];
    s.rankTitle = '叙勲勇士';
    s.maxHp += 50;
    s.hp = s.maxHp;
    s.atk += 15;

    sound.playHighScore();
    this.showToast(`✨ 【叙勲授与】${s.title}${s.name} が誕生した！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  healAllSquad() {
    if (this.gold < 30) {
      alert('軍資金が足りません (必要: 30G)');
      return;
    }
    this.gold -= 30;
    sound.playItem();
    this.player.hp = this.player.maxHp;
    this.squad.forEach((s) => {
      if (!s.dead) s.hp = s.maxHp;
    });
    this.showToast('💚 部隊全員の野戦治療が完了しました！');
    this.saveGame();
    this.renderStrategyUI();
    this.updateStatsUI();
  },

  giveWeaponToSoldier(soldierId, weaponItem) {
    const soldier = this.squad.find(s => s.id === soldierId);
    if (!soldier) return;

    soldier.weapon = weaponItem;
    this.inventory = this.inventory.filter(i => i.id !== weaponItem.id);
    sound.playHighScore();
    this.showToast(`⚔️ ${soldier.isNamed ? soldier.name : soldier.name}に「${weaponItem.name}」を支給！`);
    this.saveGame();
    this.renderStrategyUI();
  },

  completeWave() {
    this.inBattle = false;
    sound.playHighScore();
    this.gold += 30; // クリア報酬
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
      reportEl.textContent = '陣形の変更、叙勲の授与、武器の配備、傷ついた兵士の治療を行えます。';
      nextBtn.classList.add('hidden');
      closeBtn.classList.remove('hidden');
      this.inBattle = false;
    } else {
      titleEl.textContent = `⚔️ WAVE ${this.wave} 突破！本陣帰還`;
      const alive = this.squad.filter(s => !s.dead);
      const deadCount = this.squad.length - alive.length;
      reportEl.innerHTML = `
        激戦を生き延びた！ 生存部隊: <strong style="color:#00ffaa;">${alive.length}名</strong><br>
        ${deadCount > 0 ? `<span style="color:#ff4444;">※${deadCount}名戦死。次戦で新兵を補充します。</span>` : '<span style="color:#00ffaa;">全員無事に生還！全員のステータスが向上！</span>'}
      `;
      nextBtn.classList.remove('hidden');
      closeBtn.classList.add('hidden');
    }

    this.renderStrategyUI();
    modal.classList.remove('hidden');
  },

  renderStrategyUI() {
    document.getElementById('strat-gold').textContent = this.gold;

    // 装備UI
    const eq = this.equipped;
    const playerEquipBox = document.getElementById('player-equip-box');
    playerEquipBox.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: #ffaa00; margin-bottom: 6px;">【小隊長の装備】</div>
      <div style="font-size: 12px; margin-bottom: 4px; color: ${eq.weapon ? eq.weapon.color : '#888'};">
        🗡️ 武器: <strong>${eq.weapon ? eq.weapon.name : '標準の剣'}</strong>
        ${eq.weapon ? `<span style="color:#aaa; font-size:11px;"> (+${eq.weapon.stats.atk} ATK)</span>` : ''}
      </div>
      <div style="font-size: 12px; margin-bottom: 4px; color: ${eq.armor ? eq.armor.color : '#888'};">
        🛡️ 防具: <strong>${eq.armor ? eq.armor.name : '隊長の革鎧'}</strong>
        ${eq.armor ? `<span style="color:#aaa; font-size:11px;"> (+${eq.armor.stats.hp} HP)</span>` : ''}
      </div>
      <div style="font-size: 12px; color: ${eq.amulet ? eq.amulet.color : '#888'};">
        📿 装飾: <strong>${eq.amulet ? eq.amulet.name : 'なし'}</strong>
      </div>
    `;

    // インベントリ一覧
    const invList = document.getElementById('inventory-list');
    if (!this.inventory || this.inventory.length === 0) {
      invList.innerHTML = '<div style="font-size: 12px; color: #666; text-align: center; padding: 10px;">バッグは空です (敵討伐で宝箱ドロップ)</div>';
    } else {
      invList.innerHTML = '';
      this.inventory.forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid #23273c; font-size: 12px;';
        
        let statText = item.type === 'WEAPON' ? `ATK+${item.stats.atk}` : (item.type === 'ARMOR' ? `HP+${item.stats.hp}` : `装飾`);
        const isEquipped = (eq.weapon && eq.weapon.id === item.id) || (eq.armor && eq.armor.id === item.id) || (eq.amulet && eq.amulet.id === item.id);

        itemRow.innerHTML = `
          <div>
            <span style="color: ${item.color}; font-weight: bold;">[${item.rarity}] ${item.name}</span>
            <span style="font-size: 11px; color: #aaa; margin-left: 4px;">(${statText})</span>
          </div>
          <div>
            ${isEquipped ? '<span style="color: #00ffaa; font-size: 11px;">装備中</span>' : `<button class="mini-btn equip-btn">装備</button>`}
          </div>
        `;

        const btn = itemRow.querySelector('.equip-btn');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.equipItem(item);
            this.renderStrategyUI();
          });
        }
        invList.appendChild(itemRow);
      });
    }

    // 部隊名簿 ＆ 叙勲
    const squadList = document.getElementById('squad-roster-list');
    const alive = this.squad.filter(s => !s.dead);
    squadList.innerHTML = '';

    alive.forEach((s) => {
      const row = document.createElement('div');
      const isNamed = s.isNamed;
      row.style.cssText = `background: ${isNamed ? 'rgba(255, 170, 0, 0.08)' : 'rgba(255, 255, 255, 0.02)'}; border-radius: 8px; padding: 8px; margin-bottom: 6px; border: 1px solid ${isNamed ? '#ffaa00' : '#23273c'};`;

      const availableWeapons = (this.inventory || []).filter(i => i.type === 'WEAPON' && (!eq.weapon || eq.weapon.id !== i.id));
      const canHonor = !isNamed && s.survivedWaves >= 2;

      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-bottom: 4px;">
          <span>
            ${isNamed ? '👑' : '🎖️'} 
            <strong style="color: ${isNamed ? '#ffe600' : '#fff'};">${isNamed ? `${s.title}${s.name}` : s.name}</strong> 
            <span style="color:#00f0ff; font-size: 11px;">(${s.rankTitle})</span>
          </span>
          <span style="color: #aaa; font-size: 11px;">生還: <strong>${s.survivedWaves}</strong>回</span>
        </div>
        <div style="font-size: 11px; color: #889; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>HP: ${Math.floor(s.hp)}/${s.maxHp} | ATK: ${s.atk + (s.weapon ? s.weapon.stats.atk || 0 : 0)}</span>
          ${s.weapon ? `<span style="color:${s.weapon.color};">[${s.weapon.name}]</span>` : ''}
        </div>
        <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
          ${canHonor ? `<button class="mini-btn btn-honor" style="background:#ffaa00; color:#0b0d14;">🎖️ 名前を叙勲授与！</button>` : ''}
          ${availableWeapons.length > 0 && !s.weapon ? `
            <select class="mini-select select-weapon-${s.id}" style="font-size: 11px; background: #141724; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px 4px; flex: 1;">
              <option value="">武器支給...</option>
              ${availableWeapons.map(w => `<option value="${w.id}">[${w.rarity}] ${w.name} (+${w.stats.atk})</option>`).join('')}
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
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    // カメラオフセットを適用
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 戦場マップ背景（荒野）
    this.ctx.fillStyle = '#0d1017';
    this.ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // 外枠境界線
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // グリッド線
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < MAP_WIDTH; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, MAP_HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y < MAP_HEIGHT; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(MAP_WIDTH, y);
      this.ctx.stroke();
    }

    // 自軍の拠点（BASE CAMP）の描画
    this.ctx.save();
    // 結界サークル
    this.ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    this.ctx.strokeStyle = '#10b981';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 6]);
    this.ctx.beginPath();
    this.ctx.arc(BASE_CAMP.x, BASE_CAMP.y, BASE_CAMP.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 砦の旗 ＆ 本陣テキスト
    this.ctx.fillStyle = '#34d399';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🏰 自軍本陣 (治癒砦)', BASE_CAMP.x, BASE_CAMP.y - 12);
    this.ctx.font = '11px sans-serif';
    this.ctx.fillStyle = '#a7f3d0';
    this.ctx.fillText('エリア内で部隊HP回復', BASE_CAMP.x, BASE_CAMP.y + 10);
    this.ctx.restore();

    // ドロップ宝箱
    for (const drop of this.dropsOnField) {
      this.ctx.save();
      this.ctx.translate(drop.x, drop.y);
      this.ctx.fillStyle = drop.item.color;
      this.ctx.shadowColor = drop.item.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillRect(-9, -9, 18, 18);
      this.ctx.restore();
    }

    // モンスター描画
    for (const m of this.monsters) {
      this.ctx.save();
      this.ctx.translate(m.x, m.y);
      this.ctx.fillStyle = m.color;
      this.ctx.shadowColor = m.color;
      this.ctx.shadowBlur = m.isBoss ? 16 : 6;

      this.ctx.beginPath();
      this.ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // HPバー
      const barW = m.radius * 2;
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(-barW / 2, -m.radius - 8, barW, 4);
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(-barW / 2, -m.radius - 8, barW * (m.hp / m.maxHp), 4);
      this.ctx.restore();
    }

    // 仲間兵士たちの描画
    if (this.squad) {
      this.squad.forEach((s) => {
        if (s.dead) return;
        this.ctx.save();
        this.ctx.translate(s.x, s.y);

        // 叙勲された英雄兵士は光るマント・オーラ
        if (s.isNamed) {
          this.ctx.shadowColor = '#ffe600';
          this.ctx.shadowBlur = 14;
          this.ctx.fillStyle = '#fbbf24'; // 黄金カラー
        } else if (s.survivedWaves >= 2) {
          this.ctx.shadowColor = '#00f0ff';
          this.ctx.shadowBlur = 8;
          this.ctx.fillStyle = '#38bdf8'; // 銀・水色
        } else {
          this.ctx.fillStyle = '#10b981'; // 新兵グリーン
        }

        this.ctx.beginPath();
        this.ctx.arc(0, 0, s.isNamed ? 11 : 9, 0, Math.PI * 2);
        this.ctx.fill();

        // 名前表示 (叙勲兵は二つ名も)
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = s.isNamed ? '#ffe600' : '#cbd5e1';
        this.ctx.font = s.isNamed ? 'bold 10px sans-serif' : '8px sans-serif';
        this.ctx.textAlign = 'center';
        const displayName = s.isNamed ? s.name : s.name;
        this.ctx.fillText(displayName, 0, -13);

        // HPバー
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(-10, 11, 20, 3);
        this.ctx.fillStyle = s.isNamed ? '#fbbf24' : '#10b981';
        this.ctx.fillRect(-10, 11, 20 * (s.hp / s.maxHp), 3);

        this.ctx.restore();
      });
    }

    // 主人公描画
    if (this.player) {
      this.ctx.save();
      this.ctx.translate(this.player.x, this.player.y);
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.shadowColor = '#3b82f6';
      this.ctx.shadowBlur = 15;

      this.ctx.beginPath();
      this.ctx.arc(0, 0, 13, 0, Math.PI * 2);
      this.ctx.fill();

      // 小隊長の王冠
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = '11px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('👑', 0, 0);

      // HPバー
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.fillRect(-16, -19, 32, 5);
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.fillRect(-16, -19, 32 * (this.player.hp / this.player.maxHp), 5);

      if (this.player.slashAnim > 0) {
        this.ctx.rotate(this.player.slashAngle);
        this.ctx.strokeStyle = this.equipped && this.equipped.weapon ? this.equipped.weapon.color : '#60a5fa';
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = this.ctx.strokeStyle;
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 34, -0.6, 0.6);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // ダメージポップアップ
    for (const dtObj of this.damageTexts) {
      this.ctx.fillStyle = dtObj.color;
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
    }

    // パーティクル
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore(); // カメラ復元

    // 画面固定UI: バーチャルジョイスティック
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

  renderMinimap() {
    const mCtx = this.minimapCtx;
    const mw = 70;
    const mh = 70;
    mCtx.clearRect(0, 0, mw, mh);

    // 背景
    mCtx.fillStyle = 'rgba(11, 13, 20, 0.75)';
    mCtx.fillRect(0, 0, mw, mh);

    const scaleX = mw / MAP_WIDTH;
    const scaleY = mh / MAP_HEIGHT;

    // 自軍本陣
    mCtx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    mCtx.beginPath();
    mCtx.arc(BASE_CAMP.x * scaleX, BASE_CAMP.y * scaleY, BASE_CAMP.radius * scaleX, 0, Math.PI * 2);
    mCtx.fill();

    // 敵モンスター (赤点)
    mCtx.fillStyle = '#ef4444';
    for (const m of this.monsters) {
      mCtx.fillRect(m.x * scaleX - 1, m.y * scaleY - 1, 2, 2);
    }

    // 仲間兵士 (緑点)
    mCtx.fillStyle = '#10b981';
    for (const s of this.squad) {
      if (!s.dead) mCtx.fillRect(s.x * scaleX - 1, s.y * scaleY - 1, 2, 2);
    }

    // 主人公 (青・白点)
    if (this.player) {
      mCtx.fillStyle = '#00f0ff';
      mCtx.beginPath();
      mCtx.arc(this.player.x * scaleX, this.player.y * scaleY, 2.5, 0, Math.PI * 2);
      mCtx.fill();
    }
  },

  gameOver() {
    this.running = false;
    sound.playGameOver();
    this.clearSavedGame();

    const overlay = document.getElementById('game-overlay');
    document.getElementById('final-wave').textContent = this.wave;
    document.getElementById('final-rank').textContent = RANKS[this.rankIndex].title;
    overlay.classList.remove('hidden');
  },

  destroy() {
    this.running = false;
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
