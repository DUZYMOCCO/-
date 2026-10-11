/**
 * バランス確認用シミュレーター（開発用。ゲーム本体からは読み込まない）
 * ブラウザで工房を開き、コンソールで:
 *   const sim = await import('/dada-survivor/tools/balance-sim.js');
 *   sim.campaign({ difficulty: 'easy', bot: 'kid', runs: 5 });
 * セーブデータは上書きするので、終わったら sim.cleanup() で消す。
 */
import * as rules from '../js/rules.js?v=177';
import { storage } from '../../common/js/storage.js';

const SAVE_KEY = 'dada_survivor_save';

function game() {
  const app = window.gameStudioInstance;
  if (app.activeGame?.id !== 'dada-survivor') app.launchGame('dada-survivor');
  const g = app.activeGame;
  if (!g._simPatched) {
    g._simPatched = true;
    g.showLevelUp = function () {
      const r = this.run;
      while (r.pendingLevels > 0) {
        const c = rules.upgradeChoices(r.weapons, r.passives);
        this.applyChoice(c[Math.floor(Math.random() * c.length)]);
        r.pendingLevels--;
      }
    };
    g.showResult = () => {};
  }
  return g;
}

// pro: うまい（宝石とアイテムを拾い、敵をよける） / kid: 反応がおそく、ふらつき、ときどき止まる
const BOTS = {
  pro: { every: 6, evade: 90, bossEvade: 200, idle: 0, noise: 0, items: true },
  kid: { every: 24, evade: 45, bossEvade: 110, idle: 0.15, noise: 1.6, items: false },
};

function drive(g, b) {
  const r = g.run, p = r.player;
  if (Math.random() < b.idle) { g.stick = null; return; }
  let vx = 0, vy = 0;
  for (const e of r.enemies) {
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy), R = e.T.boss ? b.bossEvade : b.evade;
    if (d < R) { vx += dx / d * (R - d) / R * 3; vy += dy / d * (R - d) / R * 3; }
  }
  let best = null, bd = Infinity;
  for (const t of b.items ? [...r.gems, ...r.items] : r.gems) {
    const d = (t.x - p.x) ** 2 + (t.y - p.y) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  if (best) { const d = Math.sqrt(bd) || 1; vx += (best.x - p.x) / d; vy += (best.y - p.y) / d; }
  vx += (Math.random() - 0.5) * b.noise; vy += (Math.random() - 0.5) * b.noise;
  const l = Math.hypot(vx, vy);
  g.stick = l > 0.05 ? { id: 1, ox: 0, oy: 0, x: vx / l * 50, y: vy / l * 50 } : null;
}

export function playOnce(botName = 'kid') {
  const g = game(), b = BOTS[botName];
  g.startRun();
  for (let i = 0; i < 60 * 480 && !g.run.ended; i++) {
    if (i % b.every === 0) drive(g, b);
    g.update(1 / 60);
    // 本番は ボス撃破の 0.9びょうご に setTimeout で おわる。シミュでは すぐ おわらせる
    if (g.run.finalBossDone && !g.run.boss && !g.run.ended) g.endRun(true);
  }
  const r = g.run;
  return { clear: r.ended && r.player.hp > 0, t: Math.round(r.time), lv: r.level, kills: r.kills, hp: Math.round(r.player.hp) };
}

// たからばこを ぜんぶ あけて、がったい・いちばん つよいのを そうび、のこりコインで おみせ強化
function spend(s) {
  while (s.pendingChests > 0) { rules.addGear(s, rules.rollGear()); s.pendingChests--; }
  for (const slot of Object.keys(rules.GEAR_SLOTS)) {
    for (let r = 0; r < rules.RARITIES.length - 1; r++) while (rules.mergeGear(s, slot, r));
    let best = -1;
    for (let r = 0; r < rules.RARITIES.length; r++) if (s.gear.inv[slot][r] > 0) best = r;
    if (best > s.gear.equip[slot]) rules.equipGear(s, slot, best);
  }
  for (let bought = true; bought;) {
    bought = false;
    for (const id of ['atk', 'hp', 'spd']) {
      const c = rules.shopCost(s.shop[id]);
      if (s.shop[id] < 10 && s.coins >= c + rules.CHEST_COST) { s.coins -= c; s.shop[id]++; bought = true; }
    }
  }
}

/** 新しいセーブから、いちばん新しい キャラで つぎの ステージに 挑みつづける */
export function campaign({ difficulty = 'easy', bot = 'kid', runs = 5, fresh = true } = {}) {
  const g = game();
  if (fresh) { g.save = rules.normalizeSave(null); g.save.difficulty = difficulty; }
  const log = [];
  for (let n = 0; n < runs && !g.save.stageClears[5]; n++) {
    const st = g.save.stage;
    const chars = rules.CHARACTERS.filter(c => rules.charUnlocked(g.save, c));
    g.save.character = chars[chars.length - 1].id;
    const res = playOnce(bot);
    spend(g.save);
    log.push(`${g.save.difficulty} st${st} ${g.save.character} ${res.clear ? 'CLEAR' : 'fail '} t${res.t} lv${res.lv} k${res.kills} hp${res.hp} gear${Object.values(g.save.gear.equip).join(',')} shop${Object.values(g.save.shop).join(',')}`);
  }
  return log.join('\n');
}

export function cleanup() {
  // 工房の storage はキーに接頭辞を付けるので、かならず storage 経由で消す
  storage.remove(SAVE_KEY);
  storage.remove('highscore_dada-survivor');
  const g = window.gameStudioInstance.activeGame;
  if (g?.id === 'dada-survivor') g.save = rules.normalizeSave(null);
}
