/**
 * ゲーム3: IRON SQUAD (アイアン・スクワッド: 雑兵立身出世録)
 * ローグライク・アクションRPG
 * モンスターだらけの戦場で仲間と共に淘汰を生き残り、雑兵から将軍へと立身出世せよ！
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

// 兵士の名前候補
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

  // ガチャ重み抽選
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

  // ぶっ飛んだステータス倍率
  const baseValue = Math.floor(10 + wave * 6);
  const stats = {};
  if (type === 'WEAPON') {
    stats.atk = Math.floor(baseValue * chosenRarity.mult * (0.8 + Math.random() * 0.5));
    if (chosenRarity.mult >= 4) stats.crit = Math.min(80, Math.floor(15 * chosenRarity.mult * 0.3));
    if (chosenRarity.mult >= 9) stats.lightning = true; // 雷撃チェイン発動
  } else if (type === 'ARMOR') {
    stats.hp = Math.floor(baseValue * 4 * chosenRarity.mult * (0.8 + Math.random() * 0.5));
    if (chosenRarity.mult >= 4) stats.def = Math.floor(5 * chosenRarity.mult);
    if (chosenRarity.mult >= 9) stats.regen = Math.floor(5 * chosenRarity.mult);
  } else {
    stats.speed = Math.floor(10 * Math.min(3, chosenRarity.mult * 0.3));
    stats.atkSpeed = Math.floor(15 * Math.min(4, chosenRarity.mult * 0.4));
    if (chosenRarity.mult >= 9) stats.vampire = 0.25; // 25%HP吸収
  }

  return {
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
    this.setupGame();
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
          <button id="btn-retry" class="icon-btn" title="再出撃">🔄</button>
        </header>

        <div class="canvas-container" id="canvas-container">
          <canvas id="game-canvas"></canvas>

          <!-- ドロップ獲得トースト -->
          <div id="drop-banner" class="drop-banner hidden"></div>

          <!-- 部隊状況ミニHUD -->
          <div id="squad-hud" class="squad-hud"></div>

          <!-- 戦闘終了 / 昇進・補給画面 -->
          <div id="intermission-modal" class="game-overlay hidden">
            <div class="overlay-content" style="max-width: 360px; text-align: left;">
              <h2 id="inter-title" style="text-align: center; color: #ffaa00; margin-bottom: 8px;">⚔️ 激戦突破！</h2>
              <p id="inter-report" style="font-size: 13px; color: #b0bacd; margin-bottom: 12px;"></p>
              
              <div id="drop-reward-box" class="reward-box" style="margin-bottom: 12px;"></div>
              
              <div id="squad-status-list" class="squad-list-box" style="margin-bottom: 14px;"></div>

              <button id="btn-next-wave" class="action-btn">次の戦場へ出動！</button>
            </div>
          </div>

          <!-- ゲームオーバー画面 -->
          <div id="game-overlay" class="game-overlay hidden">
            <div class="overlay-content">
              <h2 class="overlay-title">討死</h2>
              <p class="overlay-score">到達WAVE: <span id="final-wave">1</span></p>
              <p style="font-size: 13px; color: #aaa; margin-bottom: 12px;">最終階級: <strong id="final-rank" style="color:#ffaa00;">-</strong></p>
              <button id="btn-restart" class="action-btn">新兵として再入隊</button>
              <button id="btn-overlay-back" class="action-btn secondary">工房へ戻る</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => {
      sound.playTap();
      this.destroy();
      this.onBackToHub();
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      sound.playTap();
      this.resetGame();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      sound.playTap();
      document.getElementById('game-overlay').classList.add('hidden');
      this.resetGame();
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
    this.resetGame();

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

  resetGame() {
    this.wave = 1;
    this.exp = 0;
    this.rankIndex = 0;
    this.inBattle = true;

    // 主人公
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

    // 装備
    this.equipped = {
      weapon: null,
      armor: null,
      amulet: null
    };

    // 初期部隊メンバー (新兵3名)
    this.squad = [];
    for (let i = 0; i < 3; i++) {
      this.squad.push(this.createNewSoldier(true));
    }

    this.monsters = [];
    this.projectiles = [];
    this.particles = [];
    this.damageTexts = [];
    this.dropsOnField = [];

    this.spawnTimer = 0;
    this.waveMonsterCount = 15;
    this.spawnedInWave = 0;
    this.waveKills = 0;

    this.updateStatsUI();
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
      atkCooldown: 0,
      x: this.player ? this.player.x + (Math.random() - 0.5) * 40 : this.width / 2,
      y: this.player ? this.player.y + (Math.random() - 0.5) * 40 : this.height / 2,
      dead: false
    };
  },

  setupInput() {
    // スワイプ / バーチャルジョイスティック操作
    let touchId = null;
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

    // プレイヤーの全回復
    this.player.hp = this.player.maxHp;

    // 生き残った仲間兵士の進化・淘汰ボーナス！
    const currentMax = RANKS[this.rankIndex].maxSquad;
    this.squad.forEach((s) => {
      if (!s.dead) {
        s.survivedWaves++;
        s.level++;
        s.maxHp += 25;
        s.hp = s.maxHp; // 全快
        s.atk += 6;
        if (s.survivedWaves >= 6) s.rankTitle = '歴戦の勇士';
        else if (s.survivedWaves >= 4) s.rankTitle = '百戦錬磨';
        else if (s.survivedWaves >= 2) s.rankTitle = '古参兵';
        else s.rankTitle = '熟練兵';
      }
    });

    // 死んだ兵士を除外し、空き枠に「新兵」を補充
    this.squad = this.squad.filter(s => !s.dead);
    while (this.squad.length < currentMax) {
      this.squad.push(this.createNewSoldier(true));
    }

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

    // プレイヤーの移動
    if (this.joystick.active) {
      this.player.x += this.joystick.dirX * this.player.speed * dt;
      this.player.y += this.joystick.dirY * this.player.speed * dt;
      this.player.x = Math.max(15, Math.min(this.width - 15, this.player.x));
      this.player.y = Math.max(15, Math.min(this.height - 15, this.player.y));
    }

    // 主人公の斬撃クールダウン＆自動攻撃
    this.player.atkCooldown -= dt;
    if (this.player.slashAnim > 0) this.player.slashAnim -= dt * 6;

    const nearestMonster = this.getNearestMonster(this.player.x, this.player.y);
    if (nearestMonster && this.player.atkCooldown <= 0) {
      const dist = Math.hypot(nearestMonster.x - this.player.x, nearestMonster.y - this.player.y);
      if (dist <= 80) { // 射程内
        this.player.atkCooldown = 0.55 / (this.player.atkSpeed || 1);
        this.player.slashAngle = Math.atan2(nearestMonster.y - this.player.y, nearestMonster.x - this.player.x);
        this.player.slashAnim = 1;
        this.performAttack(this.player, nearestMonster, true);
      }
    }

    // 仲間兵士たちのAI移動（主人公の周囲に陣形を組んで追従）と自動攻撃
    const aliveSquad = this.squad.filter(s => !s.dead);
    aliveSquad.forEach((soldier, idx) => {
      // 陣形目標位置 (主人公の周りを囲む)
      const formAngle = (idx / aliveSquad.length) * Math.PI * 2 + (performance.now() * 0.001);
      const formDist = 38;
      const targetX = this.player.x + Math.cos(formAngle) * formDist;
      const targetY = this.player.y + Math.sin(formAngle) * formDist;

      // 追従移動
      const dx = targetX - soldier.x;
      const dy = targetY - soldier.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) {
        soldier.x += (dx / d) * Math.min(d * 4, 150) * dt;
        soldier.y += (dy / d) * Math.min(d * 4, 150) * dt;
      }

      // 兵士の攻撃
      soldier.atkCooldown = (soldier.atkCooldown || 0) - dt;
      const enemy = this.getNearestMonster(soldier.x, soldier.y);
      if (enemy && soldier.atkCooldown <= 0) {
        const distE = Math.hypot(enemy.x - soldier.x, enemy.y - soldier.y);
        if (distE <= 65) {
          soldier.atkCooldown = 0.75;
          this.performAttack(soldier, enemy, false);
        }
      }
    });

    // モンスターの出現
    if (this.spawnedInWave < this.waveMonsterCount) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= Math.max(0.4, 1.4 - this.wave * 0.08)) {
        this.spawnTimer = 0;
        this.spawnMonster();
      }
    }

    // モンスターの行動
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.hitPulse > 0) m.hitPulse -= dt * 4;

      // 最も近い味方（主人公または兵士）をターゲット
      let target = this.player;
      let minDist = Math.hypot(this.player.x - m.x, this.player.y - m.y);

      for (const s of aliveSquad) {
        const d = Math.hypot(s.x - m.x, s.y - m.y);
        if (d < minDist) {
          minDist = d;
          target = s;
        }
      }

      // ターゲットへ向かって突進
      const dx = target.x - m.x;
      const dy = target.y - m.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 12) {
        m.x += (dx / dist) * m.speed * dt;
        m.y += (dy / dist) * m.speed * dt;
      } else {
        // 接近攻撃
        m.atkTimer = (m.atkTimer || 0) - dt;
        if (m.atkTimer <= 0) {
          m.atkTimer = 1.0;
          this.damageTarget(target, m.atk);
        }
      }
    }

    // ドロップ宝箱の回収判定
    for (let i = this.dropsOnField.length - 1; i >= 0; i--) {
      const drop = this.dropsOnField[i];
      const dist = Math.hypot(drop.x - this.player.x, drop.y - this.player.y);
      if (dist < 40) {
        this.collectDrop(drop.item);
        this.dropsOnField.splice(i, 1);
      }
    }

    // ダメージテキストの更新
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = this.damageTexts[i];
      dtObj.y -= 30 * dt;
      dtObj.life -= dt;
      if (dtObj.life <= 0) this.damageTexts.splice(i, 1);
    }

    // パーティクル更新
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

  performAttack(attacker, monster, isPlayer) {
    let dmg = attacker.atk;
    let isCrit = false;

    if (isPlayer && Math.random() * 100 < (this.player.crit || 10)) {
      dmg = Math.floor(dmg * 2.2);
      isCrit = true;
    }

    monster.hp -= dmg;
    monster.hitPulse = 1;

    // SE & パーティクル
    if (isPlayer) {
      sound.playSlash();
      // HP吸収
      if (this.player.vampire > 0) {
        const heal = Math.ceil(dmg * this.player.vampire);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      }
    } else {
      sound.playHit(0);
    }

    this.spawnDamageText(monster.x, monster.y - 10, dmg, isCrit ? '#ffaa00' : '#ffffff');
    this.spawnSparks(monster.x, monster.y, monster.color, 6);

    // モンスター撃破！
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
        // 兵士の戦死…！
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

    // 経験値獲得
    const expGain = monster.isBoss ? 50 : (monster.isElite ? 15 : 4);
    this.gainExp(expGain);

    // ドロップ宝箱の抽選 (ボスは100%、エリート50%、通常12%)
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
    // 昇進チェック
    while (this.rankIndex < RANKS.length - 1 && this.exp >= RANKS[this.rankIndex + 1].reqExp) {
      this.rankIndex++;
      const nextRank = RANKS[this.rankIndex];
      this.player.maxHp += nextRank.bonusHp;
      this.player.hp = this.player.maxHp;
      this.player.atk += nextRank.bonusAtk;
      sound.playHighScore();
      this.showToast(`🎖️ 【昇進】${nextRank.title}に任命された！`);
      this.updateStatsUI();
    }
  },

  collectDrop(item) {
    sound.playItem();
    // 装備を即座に反映
    if (item.type === 'WEAPON') {
      this.equipped.weapon = item;
      this.player.atk = 25 + RANKS[this.rankIndex].bonusAtk + (item.stats.atk || 0);
      if (item.stats.crit) this.player.crit = item.stats.crit;
      if (item.stats.lightning) this.player.lightning = true;
    } else if (item.type === 'ARMOR') {
      this.equipped.armor = item;
      this.player.maxHp = 120 + RANKS[this.rankIndex].bonusHp + (item.stats.hp || 0);
      this.player.hp = this.player.maxHp;
    } else if (item.type === 'AMULET') {
      this.equipped.amulet = item;
      if (item.stats.speed) this.player.speed = 130 + item.stats.speed;
      if (item.stats.atkSpeed) this.player.atkSpeed = 1.0 + item.stats.atkSpeed * 0.01;
      if (item.stats.vampire) this.player.vampire = item.stats.vampire;
    }

    const toastText = item.isGod ? `🌟【神話級DROP】${item.name}！` : `💎 [${item.rarity}] ${item.name} 獲得！`;
    this.showToast(toastText);
  },

  completeWave() {
    this.inBattle = false;
    sound.playHighScore();

    const alive = this.squad.filter(s => !s.dead);
    const deadCount = this.squad.length - alive.length;

    // インターミッション（部隊状況と結果画面）表示
    const modal = document.getElementById('intermission-modal');
    document.getElementById('inter-title').textContent = `⚔️ WAVE ${this.wave} 突破！`;
    document.getElementById('inter-report').innerHTML = `
      討伐数: ${this.waveMonsterCount}体 | 生存仲間: <strong style="color:#00ffaa;">${alive.length}名</strong><br>
      ${deadCount > 0 ? `<span style="color:#ff4444;">※${deadCount}名の兵士が戦死。次戦で新兵を補充します。</span>` : '<span style="color:#00ffaa;">全員無事に生還！全員のステータスがアップ！</span>'}
    `;

    // 装備状況
    const eq = this.equipped;
    document.getElementById('drop-reward-box').innerHTML = `
      <div style="font-size: 11px; color: #889; margin-bottom: 4px;">【現在の装備】</div>
      <div style="font-size: 12px; color: ${eq.weapon ? eq.weapon.color : '#666'};">🗡️ 武器: ${eq.weapon ? eq.weapon.name : '標準の支給剣'}</div>
      <div style="font-size: 12px; color: ${eq.armor ? eq.armor.color : '#666'};">🛡️ 防具: ${eq.armor ? eq.armor.name : '新兵の布服'}</div>
      <div style="font-size: 12px; color: ${eq.amulet ? eq.amulet.color : '#666'};">📿 装飾: ${eq.amulet ? eq.amulet.name : 'なし'}</div>
    `;

    // 兵士一覧
    let squadHtml = '<div style="font-size: 11px; color: #889; margin-bottom: 4px;">【部隊名簿】</div>';
    alive.forEach((s) => {
      squadHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px solid #23273c;">
          <span>🎖️ <strong>${s.name}</strong> (${s.rankTitle})</span>
          <span style="color: #00f0ff;">HP:${s.hp + 25} ATK:${s.atk + 6} (生還${s.survivedWaves + 1}回)</span>
        </div>
      `;
    });
    document.getElementById('squad-status-list').innerHTML = squadHtml;

    modal.classList.remove('hidden');
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
    this.squad.forEach((s) => {
      if (s.dead) return;
      this.ctx.save();
      this.ctx.translate(s.x, s.y);

      // 生き残り回数に応じたオーラ
      if (s.survivedWaves >= 3) {
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.shadowBlur = 10;
      }

      this.ctx.fillStyle = '#10b981'; // 兵士カラー
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 9, 0, Math.PI * 2);
      this.ctx.fill();

      // 名前表示
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = 'bold 9px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(s.name, 0, -12);

      // HPバー
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(-10, 11, 20, 3);
      this.ctx.fillStyle = '#10b981';
      this.ctx.fillRect(-10, 11, 20 * (s.hp / s.maxHp), 3);

      this.ctx.restore();
    });

    // 主人公描画
    this.ctx.save();
    this.ctx.translate(this.player.x, this.player.y);
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.shadowColor = '#3b82f6';
    this.ctx.shadowBlur = 14;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 13, 0, Math.PI * 2);
    this.ctx.fill();

    // 将軍の王冠 / 紋章
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('👑', 0, 0);

    // 主人公HPバー
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(-16, -19, 32, 5);
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(-16, -19, 32 * (this.player.hp / this.player.maxHp), 5);

    // 斬撃エフェクト
    if (this.player.slashAnim > 0) {
      this.ctx.rotate(this.player.slashAngle);
      this.ctx.strokeStyle = '#60a5fa';
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = '#60a5fa';
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 34, -0.6, 0.6);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // バーチャルジョイスティック描画
    if (this.joystick.active) {
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
