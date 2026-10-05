/**
 * ゲーム3: IRON SQUAD (アイアン・スクワッド: 雑兵立身出世録)
 * ローグライク・アクションRPG
 * モンスターだらけの戦場で仲間と共に淘汰を生き残り、雑兵から将軍へと立身出世せよ！
 * [新機能]
 *  - インベントリ（持ち物）＆装備付け替え機能
 *  - 仲間兵士への武器・防具支給機能（推しの兵士をガチ強化！）
 *  - 完全オートセーブ（いつでも中断・再開可能）
 */
import { sound } from '../../audio.js';
import { storage } from '../../storage.js';

// 階級データ
const RANKS = [
  { level: 1, title: '二等雑兵', reqExp: 0, maxSquad: 3, bonusHp: 0, bonusAtk: 0 },
  { level: 2, title: '一等兵', reqExp: 40, maxSquad: 4, bonusHp: 20, bonusAtk: 5 },
  { level: 3, title: '伍長', reqExp: 100, maxSquad: 5, bonusHp: 50, bonusAtk: 12 },
  { level: 4, title: '軍曹', reqExp: 200, maxSquad: 6, bonusHp: 90, bonusAtk: 22 },
  { level: 5, title: '百人隊長', reqExp: 380, maxSquad: 7, bonusHp: 150, bonusAtk: 38 },
  { level: 6, title: '千人将', reqExp: 650, maxSquad: 8, bonusHp: 240, bonusAtk: 60 },
  { level: 7, title: '近衛騎士', reqExp: 1050, maxSquad: 9, bonusHp: 360, bonusAtk: 95 },
  { level: 8, title: '軍団将軍', reqExp: 1600, maxSquad: 10, bonusHp: 550, bonusAtk: 150 },
  { level: 9, title: '救国の英雄', reqExp: 2400, maxSquad: 12, bonusHp: 900, bonusAtk: 250 }
];

const SOLDIER_NAMES = [
  'ボブ', 'ジャック', 'ルーク', 'ガッツ', 'レオ', 'マルコ', 'ハンス', 'トール',
  'クルト', 'オットー', 'ジーク', 'ロビン', 'フィン', 'クラーク', 'エリック', 'ロイ',
  'アル', 'レオン', 'ギル', 'セドリック', 'バルト', 'オスカー', 'アラン', 'ブルーノ'
];

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

  const baseValue = Math.floor(10 + wave * 6);
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
  description: 'モンスターの猛攻の中、仲間と共に生き残れ！兵士は死線を越えるたび精鋭化。完全ランダムなぶっ飛びドロップで無双せよ。',

  init(container, onBackToHub) {
    this.container = container;
    this.onBackToHub = onBackToHub;
    this.highWave = storage.get('ironsquad_max_wave', 1);
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
              <span id="player-rank" class="stat-value" style="color: #ffaa00;">二等雑兵</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">WAVE</span>
              <span id="current-wave" class="stat-value">1</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">生存部隊</span>
              <span id="squad-alive" class="stat-value" style="color: #00ffaa;">3/3</span>
            </div>
          </div>
          <button id="btn-inventory" class="icon-btn" title="装備と部隊">🎒</button>
        </header>

        <div class="canvas-container" id="canvas-container">
          <canvas id="game-canvas"></canvas>

          <!-- ドロップ獲得トースト -->
          <div id="drop-banner" class="drop-banner hidden"></div>

          <!-- スタート / 中断再開モーダル -->
          <div id="start-modal" class="game-overlay">
            <div class="overlay-content" style="max-width: 320px;">
              <h2 style="color: #ffaa00; font-size: 22px; margin-bottom: 8px;">🛡️ IRON SQUAD</h2>
              <p style="font-size: 12px; color: #aaa; margin-bottom: 16px;">雑兵から始まる過酷な生存と立身出世の記録</p>
              
              <div id="resume-container" class="hidden" style="margin-bottom: 12px;">
                <button id="btn-resume-game" class="action-btn" style="background: linear-gradient(135deg, #10b981, #059669);">
                  ▶ 続きから再開 (<span id="resume-info">WAVE 1</span>)
                </button>
                <p style="font-size: 11px; color: #10b981; margin-top: 4px;">※オートセーブデータがあります</p>
              </div>

              <button id="btn-new-game" class="action-btn">新兵として出撃</button>
              <button id="btn-title-back" class="action-btn secondary" style="margin-top: 8px;">工房へ戻る</button>
            </div>
          </div>

          <!-- インターミッション / 装備編成モーダル -->
          <div id="intermission-modal" class="game-overlay hidden">
            <div class="overlay-content" style="max-width: 370px; max-height: 85vh; overflow-y: auto; text-align: left; padding: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 id="inter-title" style="color: #ffaa00; font-size: 18px; margin: 0;">⚔️ 部隊宿営地</h3>
                <span id="save-indicator" style="font-size: 10px; color: #10b981; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px;">💾 自動保存済</span>
              </div>
              <p id="inter-report" style="font-size: 12px; color: #b0bacd; margin-bottom: 12px;"></p>

              <!-- タブ切り替え -->
              <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                <button id="tab-equip-btn" class="sub-tab-btn active">🎒 主人公の装備</button>
                <button id="tab-squad-btn" class="sub-tab-btn">👥 仲間兵士と支給</button>
              </div>

              <!-- 主人公装備ビュー -->
              <div id="view-equip-tab">
                <div id="player-equip-box" class="reward-box" style="margin-bottom: 12px;"></div>
                <div style="font-size: 11px; font-weight: bold; color: #889; margin-bottom: 6px;">【所持品バッグ】(タップで装備変更)</div>
                <div id="inventory-list" class="squad-list-box" style="margin-bottom: 14px; max-height: 150px; overflow-y: auto;"></div>
              </div>

              <!-- 仲間兵士ビュー -->
              <div id="view-squad-tab" class="hidden">
                <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
                  💡 仲間をタップすると、バッグ内の武器を支給して強化できます！
                </div>
                <div id="squad-status-list" class="squad-list-box" style="margin-bottom: 14px;"></div>
              </div>

              <button id="btn-next-wave" class="action-btn">次の戦場へ出動！</button>
              <button id="btn-close-camp" class="action-btn secondary hidden" style="margin-top: 6px;">閉じる</button>
            </div>
          </div>

          <!-- ゲームオーバー画面 -->
          <div id="game-overlay" class="game-overlay hidden">
            <div class="overlay-content">
              <h2 class="overlay-title">討死</h2>
              <p class="overlay-score">到達WAVE: <span id="final-wave">1</span></p>
              <p style="font-size: 13px; color: #aaa; margin-bottom: 12px;">最終階級: <strong id="final-rank" style="color:#ffaa00;">-</strong></p>
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

    document.getElementById('btn-inventory').addEventListener('click', () => {
      sound.playTap();
      this.openIntermission(true);
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

    document.getElementById('btn-next-wave').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('intermission-modal').classList.add('hidden');
      this.startNextWave();
    });

    document.getElementById('btn-close-camp').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('intermission-modal').classList.add('hidden');
      this.inBattle = true;
    });

    // タブ切り替え
    const tabEquip = document.getElementById('tab-equip-btn');
    const tabSquad = document.getElementById('tab-squad-btn');
    const viewEquip = document.getElementById('view-equip-tab');
    const viewSquad = document.getElementById('view-squad-tab');

    tabEquip.addEventListener('click', () => {
      sound.playTap();
      tabEquip.classList.add('active');
      tabSquad.classList.remove('active');
      viewEquip.classList.remove('hidden');
      viewSquad.classList.add('hidden');
    });

    tabSquad.addEventListener('click', () => {
      sound.playTap();
      tabSquad.classList.add('active');
      tabEquip.classList.remove('active');
      viewSquad.classList.remove('hidden');
      viewEquip.classList.add('hidden');
    });
  },

  checkSavedGame() {
    const saved = storage.get('ironsquad_save_data', null);
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
      requestAnimationFrame(this.loop);
    };
    requestAnimationFrame(this.loop);
  },

  startFreshGame() {
    this.wave = 1;
    this.exp = 0;
    this.rankIndex = 0;
    this.inBattle = true;

    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      hp: 120,
      maxHp: 120,
      atk: 25,
      atkSpeed: 1.0,
      speed: 130,
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

    this.squad = [];
    for (let i = 0; i < 3; i++) {
      this.squad.push(this.createNewSoldier(true));
    }

    this.initBattlefield();
    this.saveGame();
    this.updateStatsUI();
  },

  resumeSavedGame() {
    const saved = storage.get('ironsquad_save_data', null);
    if (!saved) {
      this.startFreshGame();
      return;
    }

    this.wave = saved.wave || 1;
    this.exp = saved.exp || 0;
    this.rankIndex = saved.rankIndex || 0;
    this.equipped = saved.equipped || { weapon: null, armor: null, amulet: null };
    this.inventory = saved.inventory || [];
    this.squad = saved.squad || [];

    // プレイヤー復元
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      hp: saved.player.hp || 120,
      maxHp: saved.player.maxHp || 120,
      atk: 25 + RANKS[this.rankIndex].bonusAtk + (this.equipped.weapon ? this.equipped.weapon.stats.atk || 0 : 0),
      atkSpeed: 1.0 + (this.equipped.amulet ? (this.equipped.amulet.stats.atkSpeed || 0) * 0.01 : 0),
      speed: 130 + (this.equipped.amulet ? this.equipped.amulet.stats.speed || 0 : 0),
      atkCooldown: 0,
      crit: (this.equipped.weapon ? this.equipped.weapon.stats.crit : 10) || 10,
      vampire: (this.equipped.amulet ? this.equipped.amulet.stats.vampire : 0) || 0,
      lightning: (this.equipped.weapon ? this.equipped.weapon.stats.lightning : false) || false,
      slashAngle: 0,
      slashAnim: 0
    };

    this.initBattlefield();
    this.updateStatsUI();
    this.showToast(`💾 WAVE ${this.wave} のデータから再開しました`);
  },

  initBattlefield() {
    this.inBattle = true;
    this.monsters = [];
    this.particles = [];
    this.damageTexts = [];
    this.dropsOnField = [];
    this.spawnTimer = 0;
    this.waveMonsterCount = 12 + this.wave * 4;
    this.spawnedInWave = 0;
    this.waveKills = 0;
  },

  createNewSoldier(isFresh = false) {
    const name = SOLDIER_NAMES[Math.floor(Math.random() * SOLDIER_NAMES.length)];
    return {
      id: Math.random().toString(36).substring(2, 8),
      name: name,
      survivedWaves: 0,
      level: 1,
      rankTitle: '新兵',
      hp: 70,
      maxHp: 70,
      atk: 14,
      weapon: null,
      atkCooldown: 0,
      x: this.player ? this.player.x + (Math.random() - 0.5) * 40 : this.width / 2,
      y: this.player ? this.player.y + (Math.random() - 0.5) * 40 : this.height / 2,
      dead: false
    };
  },

  saveGame() {
    try {
      const data = {
        wave: this.wave,
        exp: this.exp,
        rankIndex: this.rankIndex,
        player: {
          hp: this.player.hp,
          maxHp: this.player.maxHp
        },
        equipped: this.equipped,
        inventory: this.inventory,
        squad: this.squad.filter(s => !s.dead)
      };
      storage.set('ironsquad_save_data', data);
      const ind = document.getElementById('save-indicator');
      if (ind) {
        ind.textContent = '💾 自動保存済';
        ind.style.borderColor = '#10b981';
      }
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  clearSavedGame() {
    storage.set('ironsquad_save_data', null);
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
    this.waveMonsterCount = 12 + this.wave * 4;

    this.player.hp = this.player.maxHp;

    const currentMax = RANKS[this.rankIndex].maxSquad;
    this.squad.forEach((s) => {
      if (!s.dead) {
        s.survivedWaves++;
        s.level++;
        s.maxHp += 25;
        s.hp = s.maxHp;
        s.atk += 6;
        if (s.survivedWaves >= 6) s.rankTitle = '歴戦の勇士';
        else if (s.survivedWaves >= 4) s.rankTitle = '百戦錬磨';
        else if (s.survivedWaves >= 2) s.rankTitle = '古参兵';
        else s.rankTitle = '熟練兵';
      }
    });

    this.squad = this.squad.filter(s => !s.dead);
    while (this.squad.length < currentMax) {
      this.squad.push(this.createNewSoldier(true));
    }

    this.saveGame();
    this.updateStatsUI();
  },

  spawnMonster() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * this.width; y = -20; }
    else if (side === 1) { x = this.width + 20; y = Math.random() * this.height; }
    else if (side === 2) { x = Math.random() * this.width; y = this.height + 20; }
    else { x = -20; y = Math.random() * this.height; }

    const isElite = Math.random() < 0.15;
    const isBoss = (this.wave % 5 === 0) && (this.spawnedInWave === this.waveMonsterCount - 1);

    let type = 'goblin';
    let hp = 30 + this.wave * 12;
    let atk = 8 + this.wave * 3;
    let speed = 65 + Math.random() * 20;
    let radius = 10;
    let color = '#34d399';

    if (isBoss) {
      type = 'dragon';
      hp = (180 + this.wave * 60) * 4;
      atk = 22 + this.wave * 6;
      speed = 45;
      radius = 24;
      color = '#ef4444';
    } else if (isElite) {
      type = 'orc';
      hp = (45 + this.wave * 20) * 2;
      atk = 14 + this.wave * 4;
      speed = 50;
      radius = 15;
      color = '#f59e0b';
    }

    this.monsters.push({
      x, y,
      hp, maxHp: hp,
      atk, speed,
      radius, color,
      type,
      isBoss,
      isElite,
      hitPulse: 0
    });
    this.spawnedInWave++;
  },

  update(dt) {
    if (!this.inBattle) return;

    if (this.joystick.active) {
      this.player.x += this.joystick.dirX * this.player.speed * dt;
      this.player.y += this.joystick.dirY * this.player.speed * dt;
      this.player.x = Math.max(15, Math.min(this.width - 15, this.player.x));
      this.player.y = Math.max(15, Math.min(this.height - 15, this.player.y));
    }

    this.player.atkCooldown -= dt;
    if (this.player.slashAnim > 0) this.player.slashAnim -= dt * 6;

    const nearestMonster = this.getNearestMonster(this.player.x, this.player.y);
    if (nearestMonster && this.player.atkCooldown <= 0) {
      const dist = Math.hypot(nearestMonster.x - this.player.x, nearestMonster.y - this.player.y);
      if (dist <= 80) {
        this.player.atkCooldown = 0.55 / (this.player.atkSpeed || 1);
        this.player.slashAngle = Math.atan2(nearestMonster.y - this.player.y, nearestMonster.x - this.player.x);
        this.player.slashAnim = 1;
        this.performAttack(this.player, nearestMonster, true);
      }
    }

    const aliveSquad = this.squad.filter(s => !s.dead);
    aliveSquad.forEach((soldier, idx) => {
      const formAngle = (idx / aliveSquad.length) * Math.PI * 2 + (performance.now() * 0.001);
      const formDist = 38;
      const targetX = this.player.x + Math.cos(formAngle) * formDist;
      const targetY = this.player.y + Math.sin(formAngle) * formDist;

      const dx = targetX - soldier.x;
      const dy = targetY - soldier.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) {
        soldier.x += (dx / d) * Math.min(d * 4, 150) * dt;
        soldier.y += (dy / d) * Math.min(d * 4, 150) * dt;
      }

      soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
      const enemy = this.getNearestMonster(soldier.x, soldier.y);
      if (enemy && soldier.atkCooldown <= 0) {
        const distE = Math.hypot(enemy.x - soldier.x, enemy.y - soldier.y);
        if (distE <= 65) {
          soldier.atkCooldown = 0.75;
          // 武器ボーナス適用
          const totalAtk = soldier.atk + (soldier.weapon ? soldier.weapon.stats.atk || 0 : 0);
          this.performAttack({ ...soldier, atk: totalAtk }, enemy, false);
        }
      }
    });

    if (this.spawnedInWave < this.waveMonsterCount) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= Math.max(0.4, 1.4 - this.wave * 0.08)) {
        this.spawnTimer = 0;
        this.spawnMonster();
      }
    }

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
          this.damageTarget(target, m.atk);
        }
      }
    }

    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      const dist = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
      if (dist < 40) {
        this.collectDrop(drop.item);
        this.dropsOnField.splice(i, 1);
      }
    }

    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = this.damageTexts[i];
      dtObj.y -= 30 * dt;
      dtObj.life -= dt;
      if (dtObj.life <= 0) this.damageTexts.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

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
        this.showToast(`☠️ ${target.name}${target.rankTitle}が戦死した…`);
        this.updateStatsUI();
      }
    }
  },

  killMonster(monster) {
    const idx = this.monsters.indexOf(monster);
    if (idx !== -1) this.monsters.splice(idx, 1);
    this.waveKills++;

    const expGain = monster.isBoss ? 50 : (monster.isElite ? 15 : 4);
    this.gainExp(expGain);

    const dropRate = monster.isBoss ? 1.0 : (monster.isElite ? 0.6 : 0.12);
    if (Math.random() < dropRate) {
      const dropItem = generateRandomDrop(this.wave);
      this.dropsOnField.push({
        x: monster.x,
        y: monster.y,
        item: dropItem
      });
    }

    this.spawnSparks(monster.x, monster.y, monster.color, 15);
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
      this.showToast(`🎖️ 【昇進】${nextRank.title}に任命された！`);
      this.saveGame();
      this.updateStatsUI();
    }
  },

  collectDrop(item) {
    sound.playItem();
    // インベントリに保管
    if (!this.inventory) this.inventory = [];
    this.inventory.push(item);

    // 空きスロットがあれば自動装備
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
      this.player.atk = 25 + RANKS[this.rankIndex].bonusAtk + (item.stats.atk || 0);
      this.player.crit = item.stats.crit || 10;
      this.player.lightning = !!item.stats.lightning;
    } else if (item.type === 'ARMOR') {
      this.equipped.armor = item;
      this.player.maxHp = 120 + RANKS[this.rankIndex].bonusHp + (item.stats.hp || 0);
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    } else if (item.type === 'AMULET') {
      this.equipped.amulet = item;
      this.player.speed = 130 + (item.stats.speed || 0);
      this.player.atkSpeed = 1.0 + (item.stats.atkSpeed || 0) * 0.01;
      this.player.vampire = item.stats.vampire || 0;
    }
    sound.playTap();
    this.saveGame();
  },

  giveWeaponToSoldier(soldierId, weaponItem) {
    const soldier = this.squad.find(s => s.id === soldierId);
    if (!soldier) return;

    soldier.weapon = weaponItem;
    // バッグから外す
    this.inventory = this.inventory.filter(i => i.id !== weaponItem.id);
    sound.playHighScore();
    this.showToast(`⚔️ ${soldier.name}に「${weaponItem.name}」を支給した！`);
    this.saveGame();
    this.renderCampUI();
  },

  completeWave() {
    this.inBattle = false;
    sound.playHighScore();
    this.saveGame();
    this.openIntermission(false);
  },

  openIntermission(isManualOpen = false) {
    const modal = document.getElementById('intermission-modal');
    const titleEl = document.getElementById('inter-title');
    const reportEl = document.getElementById('inter-report');
    const nextBtn = document.getElementById('btn-next-wave');
    const closeBtn = document.getElementById('btn-close-camp');

    if (isManualOpen) {
      titleEl.textContent = '🎒 装備・部隊編成';
      reportEl.textContent = '戦いの合間に装備の変更や、仲間兵士への武器支給を行えます。';
      nextBtn.classList.add('hidden');
      closeBtn.classList.remove('hidden');
      this.inBattle = false;
    } else {
      titleEl.textContent = `⚔️ WAVE ${this.wave} 突破！`;
      const alive = this.squad.filter(s => !s.dead);
      const deadCount = this.squad.length - alive.length;
      reportEl.innerHTML = `
        討伐完了！ 生存仲間: <strong style="color:#00ffaa;">${alive.length}名</strong><br>
        ${deadCount > 0 ? `<span style="color:#ff4444;">※${deadCount}名戦死。次戦で新兵を補充します。</span>` : '<span style="color:#00ffaa;">全員無事に生還！ステータスがアップ！</span>'}
      `;
      nextBtn.classList.remove('hidden');
      closeBtn.classList.add('hidden');
    }

    this.renderCampUI();
    modal.classList.remove('hidden');
  },

  renderCampUI() {
    // 装備UI描画
    const eq = this.equipped;
    const playerEquipBox = document.getElementById('player-equip-box');
    playerEquipBox.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: #ffaa00; margin-bottom: 6px;">【主人公の現在の装備】</div>
      <div style="font-size: 12px; margin-bottom: 4px; color: ${eq.weapon ? eq.weapon.color : '#888'};">
        🗡️ 武器: <strong>${eq.weapon ? eq.weapon.name : 'なし (標準剣)'}</strong>
        ${eq.weapon ? `<span style="color:#aaa; font-size:11px;"> (+${eq.weapon.stats.atk} ATK)</span>` : ''}
      </div>
      <div style="font-size: 12px; margin-bottom: 4px; color: ${eq.armor ? eq.armor.color : '#888'};">
        🛡️ 防具: <strong>${eq.armor ? eq.armor.name : 'なし (新兵布服)'}</strong>
        ${eq.armor ? `<span style="color:#aaa; font-size:11px;"> (+${eq.armor.stats.hp} HP)</span>` : ''}
      </div>
      <div style="font-size: 12px; color: ${eq.amulet ? eq.amulet.color : '#888'};">
        📿 装飾: <strong>${eq.amulet ? eq.amulet.name : 'なし'}</strong>
      </div>
    `;

    // インベントリ一覧描画
    const invList = document.getElementById('inventory-list');
    if (!this.inventory || this.inventory.length === 0) {
      invList.innerHTML = '<div style="font-size: 12px; color: #666; text-align: center; padding: 10px;">バッグは空です (敵を倒すとドロップ)</div>';
    } else {
      invList.innerHTML = '';
      this.inventory.forEach((item) => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid #23273c; font-size: 12px;';
        
        let statText = '';
        if (item.type === 'WEAPON') statText = `ATK +${item.stats.atk}`;
        else if (item.type === 'ARMOR') statText = `HP +${item.stats.hp}`;
        else statText = `SPD/吸血`;

        const isEquipped = (eq.weapon && eq.weapon.id === item.id) || (eq.armor && eq.armor.id === item.id) || (eq.amulet && eq.amulet.id === item.id);

        itemRow.innerHTML = `
          <div>
            <span style="color: ${item.color}; font-weight: bold;">[${item.rarity}] ${item.name}</span>
            <span style="font-size: 11px; color: #aaa; margin-left: 4px;">(${statText})</span>
          </div>
          <div>
            ${isEquipped ? '<span style="color: #00ffaa; font-size: 11px; margin-right: 4px;">装備中</span>' : `<button class="mini-btn equip-btn">装備</button>`}
          </div>
        `;

        const btn = itemRow.querySelector('.equip-btn');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.equipItem(item);
            this.renderCampUI();
          });
        }
        invList.appendChild(itemRow);
      });
    }

    // 仲間兵士一覧描画 (武器支給機能)
    const squadList = document.getElementById('squad-status-list');
    const alive = this.squad.filter(s => !s.dead);
    squadList.innerHTML = '';

    alive.forEach((s) => {
      const row = document.createElement('div');
      row.style.cssText = 'background: rgba(255,255,255,0.02); border-radius: 8px; padding: 8px; margin-bottom: 6px; border: 1px solid #23273c;';

      const availableWeapons = (this.inventory || []).filter(i => i.type === 'WEAPON' && (!eq.weapon || eq.weapon.id !== i.id));

      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span>🎖️ <strong>${s.name}</strong> <span style="color:#00f0ff;">(${s.rankTitle})</span></span>
          <span style="color: #aaa; font-size: 11px;">生還 ${s.survivedWaves} 回</span>
        </div>
        <div style="font-size: 11px; color: #889; margin-bottom: 4px;">
          HP: ${s.hp} | ATK: ${s.atk + (s.weapon ? s.weapon.stats.atk || 0 : 0)}
          ${s.weapon ? `<span style="color:${s.weapon.color}; margin-left: 6px;">[支給武具: ${s.weapon.name}]</span>` : ''}
        </div>
        ${availableWeapons.length > 0 && !s.weapon ? `
          <div style="margin-top: 6px;">
            <select class="mini-select" id="select-weapon-${s.id}" style="width: 70%; font-size: 11px; background: #141724; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 3px;">
              <option value="">武器を選んで支給...</option>
              ${availableWeapons.map(w => `<option value="${w.id}">[${w.rarity}] ${w.name} (+${w.stats.atk})</option>`).join('')}
            </select>
            <button class="mini-btn" id="btn-give-${s.id}" style="padding: 3px 8px; font-size: 11px;">支給</button>
          </div>
        ` : ''}
      `;

      squadList.appendChild(row);

      const giveBtn = row.querySelector(`#btn-give-${s.id}`);
      if (giveBtn) {
        giveBtn.addEventListener('click', () => {
          const sel = row.querySelector(`#select-weapon-${s.id}`);
          if (sel && sel.value) {
            const chosenWeapon = availableWeapons.find(w => w.id === sel.value);
            if (chosenWeapon) {
              this.giveWeaponToSoldier(s.id, chosenWeapon);
            }
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
      }, 2400);
    }
  },

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 戦場フロアグリッド
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    const grid = 40;
    for (let x = 0; x < this.width; x += grid) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += grid) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // ドロップ宝箱
    for (const drop of this.dropsOnField) {
      this.ctx.save();
      this.ctx.translate(drop.x, drop.y);
      this.ctx.fillStyle = drop.item.color;
      this.ctx.shadowColor = drop.item.color;
      this.ctx.shadowBlur = 12;
      this.ctx.fillRect(-8, -8, 16, 16);
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

        if (s.survivedWaves >= 3 || s.weapon) {
          this.ctx.shadowColor = s.weapon ? s.weapon.color : '#00f0ff';
          this.ctx.shadowBlur = 10;
        }

        this.ctx.fillStyle = s.weapon ? '#eab308' : '#10b981';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 9, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = 'bold 9px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(s.name, 0, -12);

        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(-10, 11, 20, 3);
        this.ctx.fillStyle = '#10b981';
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
      this.ctx.shadowBlur = 14;

      this.ctx.beginPath();
      this.ctx.arc(0, 0, 13, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#fbbf24';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('👑', 0, 0);

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

    // バーチャルジョイスティック描画
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
  },

  gameOver() {
    this.running = false;
    sound.playGameOver();
    this.clearSavedGame(); // 全滅時は中断データをリセット

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
