// 鍛冶パネルUI（smith1）: リズム/タイミングミニゲーム、品質計算、武器強化、鍛冶XP獲得
// スマートフォン対応（390x844）、単一大型タップボタン＋パネル内タップ、毎フレームのアロケーション防止

import { ITEMS, qualityOf } from '../sim/items.js';
import { rankColor } from './inventory.js';
import { SMITH_MATERIALS } from '../data/smith_materials.js';
import {
  hitWindowWidth,
  evaluateStrike,
  aggregateTiming,
  calcQualityScore,
  scoreToQualityRank,
  applyTimingShift,
  calcFinalQualityRank,
  upgradeQualityRank,
  upgradeWeapon,
  gainSmithingXp,
  canForge,
  executeForge,
  STRIKES_PER_FORGE,
} from '../sim/smithing.js';

const CSS = `
#smith-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(374px, calc(100vw - 16px));
  max-height: min(780px, 90dvh);
  z-index: 60;
  display: none;
  flex-direction: column;
  background: rgba(18, 14, 10, 0.96);
  border: 1px solid rgba(255, 220, 150, 0.45);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85);
  color: #f4efe6;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  pointer-events: auto;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

@media (orientation: portrait) {
  #smith-panel { top: calc(env(safe-area-inset-top, 0px) + 180px); transform: translateX(-50%); max-height: calc(100dvh - 195px - env(safe-area-inset-top, 0px)); }
}

#smith-panel.open {
  display: flex;
}

#smith-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(45, 30, 16, 0.9);
  border-bottom: 1px solid rgba(255, 220, 150, 0.25);
}

#smith-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #ffe2a8;
  letter-spacing: 0.03em;
}

#smith-head .close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #f4efe6;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

#smith-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.smith-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.smith-section-title {
  font-size: 12px;
  font-weight: 700;
  color: #d6ba82;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.smith-item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 128px;
  overflow-y: auto;
  padding-right: 2px;
}

.smith-item-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid rgba(138, 112, 78, 0.6);
  border-radius: 8px;
  background: rgba(35, 26, 18, 0.75);
  color: #f4efe6;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.smith-item-btn.selected {
  border-color: #ffd27a;
  background: rgba(85, 55, 25, 0.9);
  box-shadow: 0 0 0 1px #ffd27a inset;
}

.smith-item-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.smith-preview-card {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(28, 20, 14, 0.85);
  border: 1px solid rgba(255, 220, 150, 0.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.smith-stat-row {
  display: flex;
  justify-content: space-between;
  color: #cfc4a8;
}

.smith-forecast { flex-direction: column; gap: 5px; line-height: 1.5; }
.smith-stat-val {
  color: #ffe2a8;
  font-weight: 700;
}

/* ミニゲーム画面 */
#smith-minigame-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 6px 0;
}

.smith-strikes-bar {
  display: flex;
  gap: 8px;
  justify-content: center;
  width: 100%;
}

.smith-strike-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #5a4028;
  background: #1f1610;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #a08c72;
}

.smith-strike-dot.active {
  border-color: #ffd27a;
  background: #4a3018;
  color: #fff;
  box-shadow: 0 0 8px rgba(255, 210, 122, 0.6);
}

.smith-strike-dot.perfect {
  border-color: #4cd472;
  background: #1a4a25;
  color: #bbf8cd;
}

.smith-strike-dot.good {
  border-color: #e0b84a;
  background: #4a3c18;
  color: #ffecb0;
}

.smith-strike-dot.poor {
  border-color: #d84a3f;
  background: #4a1c18;
  color: #ffd0c8;
}

#smith-gauge-wrap {
  width: 100%;
  height: 48px;
  position: relative;
  background: #140e0a;
  border: 2px solid #6b4d2e;
  border-radius: 10px;
  overflow: hidden;
  box-sizing: border-box;
}

#smith-good-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(224, 184, 74, 0.28);
  border-left: 1px solid #e0b84a;
  border-right: 1px solid #e0b84a;
}

#smith-perfect-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(76, 212, 114, 0.55);
  border-left: 2px solid #58f085;
  border-right: 2px solid #58f085;
  box-shadow: 0 0 10px rgba(88, 240, 133, 0.4);
}

#smith-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  margin-left: -3px;
  background: #ffffff;
  box-shadow: 0 0 8px #ffffff, 0 0 14px #ffd27a;
  border-radius: 3px;
  pointer-events: none;
}

#smith-feedback-text {
  min-height: 28px;
  font-size: 17px;
  font-weight: 800;
  text-align: center;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
}

#smith-feedback-text.perfect { color: #58f085; }
#smith-feedback-text.good { color: #ffe28a; }
#smith-feedback-text.poor { color: #ff6b5e; }

.smith-big-button {
  width: 100%;
  min-height: 54px;
  border-radius: 12px;
  border: 2px solid #e0b84a;
  background: linear-gradient(180deg, #7a5020, #4a2c10);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  margin-top: 4px;
}

.smith-big-button:active {
  transform: scale(0.98);
  background: linear-gradient(180deg, #5c3814, #361f0a);
}

.smith-big-button:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
}

.smith-tap-hint {
  font-size: 11px;
  color: #a89a80;
  text-align: center;
}
`;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function createSmithUI(opts) {
  const getState = opts.getState;
  const command = opts.command || (() => {});
  const root = opts.root || document.body;

  const style = el('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = el('div');
  panel.id = 'smith-panel';
  for (const ev of ['pointerdown', 'touchstart', 'wheel']) {
    panel.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  }

  // Header
  const head = el('div', '', '');
  head.id = 'smith-head';
  const title = el('h2', '', '鍛冶台 (Forge)');
  const closeBtn = el('button', 'close-btn', '×');
  closeBtn.type = 'button';
  head.append(title, closeBtn);

  // Body container
  const body = el('div');
  body.id = 'smith-body';

  panel.append(head, body);
  root.appendChild(panel);

  let isOpen = false;
  let currentBench = null;
  let selectedWeaponInvIndex = null;
  let selectedMaterialInvIndex = null;

  // ミニゲーム状態
  let gameMode = 'select'; // 'select' | 'minigame' | 'result'
  let strikes = [];
  let markerNorm = 0.5;
  let animId = null;
  let animStartTime = 0;
  let strikeFeedback = '';
  let strikeFeedbackClass = '';
  let finalResult = null;

  closeBtn.addEventListener('click', close);

  function open(bench) {
    currentBench = bench || { id: 'forge_bench_1', name: '鍛冶台', tier: 1 };
    isOpen = true;
    gameMode = 'select';
    strikes = [];
    finalResult = null;
    panel.classList.add('open');
    autoSelectDefaults();
    render();
  }

  function close() {
    isOpen = false;
    panel.classList.remove('open');
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function autoSelectDefaults() {
    const s = getState();
    const player = s?.actors?.find((a) => a.id === s.playerId) || s?.actors?.[0];
    if (!player || !Array.isArray(player.inv)) return;

    selectedWeaponInvIndex = null;
    selectedMaterialInvIndex = null;

    // 持ち物から武器を探す
    for (let i = 0; i < player.inv.length; i++) {
      const it = player.inv[i];
      if (ITEMS[it.id]?.slot === 'weapon') {
        selectedWeaponInvIndex = i;
        break;
      }
    }
    // 持ち物から素材を探す
    for (let i = 0; i < player.inv.length; i++) {
      const it = player.inv[i];
      if (SMITH_MATERIALS[it.id] || ITEMS[it.id]?.slot === 'mat') {
        selectedMaterialInvIndex = i;
        break;
      }
    }
  }

  function render() {
    body.replaceChildren();
    const s = getState();
    const player = s?.actors?.find((a) => a.id === s.playerId) || s?.actors?.[0];
    if (!player) return;

    const skill = player.skills?.smithing || 1;
    const tier = currentBench?.tier || 1;

    title.textContent = `鍛冶台（台の格 ${tier}）・鍛冶スキル ${Math.round(skill)}`;

    if (gameMode === 'select') {
      renderSelectView(player, skill, tier);
    } else if (gameMode === 'minigame') {
      renderMinigameView(player, skill, tier);
    } else if (gameMode === 'result') {
      renderResultView(player);
    }
  }

  function renderSelectView(player, skill, tier) {
    const inv = player.inv || [];

    // 1. 強化対象の武器選定
    const secWeapon = el('div', 'smith-section');
    const wTitle = el('div', 'smith-section-title', '1. 強化する武器の選択');
    secWeapon.appendChild(wTitle);

    const wList = el('div', 'smith-item-list');
    let weaponCount = 0;
    inv.forEach((it, idx) => {
      const def = ITEMS[it.id];
      if (!def || def.slot !== 'weapon') return;
      weaponCount += 1;
      const b = el('button', `smith-item-btn${selectedWeaponInvIndex === idx ? ' selected' : ''}`);
      b.type = 'button';
      const nameSpan = el('span', '', def.name);
      const r = it.rank || 1;
      const rankBadge = el('span', `smith-item-badge rank ${rankColor(r)}`, `${r}級`);
      b.append(nameSpan, rankBadge);
      b.addEventListener('click', () => {
        selectedWeaponInvIndex = idx;
        render();
      });
      wList.appendChild(b);
    });

    if (weaponCount === 0) {
      wList.appendChild(el('div', '', '持ち物に強化可能な武器がありません'));
    }
    secWeapon.appendChild(wList);
    body.appendChild(secWeapon);

    // 2. 素材の選定
    const secMat = el('div', 'smith-section');
    const mTitle = el('div', 'smith-section-title', '2. 使用する素材の選択');
    secMat.appendChild(mTitle);

    const mList = el('div', 'smith-item-list');
    let matCount = 0;
    inv.forEach((it, idx) => {
      const def = SMITH_MATERIALS[it.id] || ITEMS[it.id];
      if (!def || (def.slot !== 'mat' && !SMITH_MATERIALS[it.id])) return;
      matCount += 1;
      const b = el('button', `smith-item-btn${selectedMaterialInvIndex === idx ? ' selected' : ''}`);
      b.type = 'button';
      const nameSpan = el('span', '', `${def.name}${it.n > 1 ? ` (x${it.n})` : ''}`);
      const rBadge = el('span', `smith-item-badge rank ${def.rarity === 'legendary' ? 'gold' : def.rarity === 'rare' ? 'blue' : 'white'}`, ({ common: '普通', uncommon: '上質', rare: '希少', legendary: '伝説' }[def.rarity] || '素材'));
      b.append(nameSpan, rBadge);
      b.addEventListener('click', () => {
        selectedMaterialInvIndex = idx;
        render();
      });
      mList.appendChild(b);
    });

    if (matCount === 0) {
      mList.appendChild(el('div', '', '持ち物に鍛冶素材がありません（遺跡素材・鉄くずなど）'));
    }
    secMat.appendChild(mList);
    body.appendChild(secMat);

    // 3. 予想品質と効果プレビュー
    const selectedWeapon = selectedWeaponInvIndex != null ? inv[selectedWeaponInvIndex] : null;
    const selectedMat = selectedMaterialInvIndex != null ? inv[selectedMaterialInvIndex] : null;
    const matDef = selectedMat ? (SMITH_MATERIALS[selectedMat.id] || ITEMS[selectedMat.id]) : null;

    if (selectedWeapon && matDef) {
      const previewSec = el('div', 'smith-section');
      previewSec.appendChild(el('div', 'smith-section-title', '3. 鍛錬の想定結果'));

      const card = el('div', 'smith-preview-card');
      const matRank = matDef.materialRank || 1;
      const score = calcQualityScore(skill, tier, matRank);
      const baseRank = scoreToQualityRank(score);

      const rowScore = el('div', 'smith-stat-row');
      rowScore.innerHTML = `<span>想定品質スコア</span><span class="smith-stat-val">${score} (${Math.round(skill * 0.5)} + ${tier * 10} + ${matRank * 5})</span>`;

      const curRank = selectedWeapon.rank || 1;
      const previewRank = timing => upgradeQualityRank(curRank, calcFinalQualityRank(skill, tier, matRank, timing), timing);
      const rowRank = el('div', 'smith-stat-row');
      rowRank.classList.add("smith-forecast");
      rowRank.innerHTML = `<span>現在 ${curRank}級 → 想定 ${previewRank('normal')}級</span><span class="smith-stat-val">会心 ${previewRank('perfect')}級　/　失敗 ${previewRank('poor')}級</span>`;

      const rowEffect = el('div', 'smith-stat-row');
      rowEffect.innerHTML = `<span>素材効果</span><span class="smith-stat-val" style="color:#5fd17a">${matDef.upgrade_effect || '性能向上'}</span>`;

      card.append(rowScore, rowRank, rowEffect);
      previewSec.appendChild(card);
      body.appendChild(previewSec);
    }

    // 開始ボタン
    const startBtn = el('button', 'smith-big-button', '鍛錬を開始する (5打)');
    startBtn.type = 'button';
    const canStart = selectedWeapon && matDef && canForge(player, selectedWeapon, selectedMat).ok;
    startBtn.disabled = !canStart;

    startBtn.addEventListener('click', () => {
      if (!canStart) return;
      startMinigame();
    });
    body.appendChild(startBtn);
  }

  function startMinigame() {
    gameMode = 'minigame';
    strikes = [];
    strikeFeedback = 'タイミングを合わせて叩け！';
    strikeFeedbackClass = '';
    render();
    initGaugeAnimation();
  }

  let gaugeTrackEl = null;
  let markerEl = null;

  function renderMinigameView(player, skill, tier) {
    const sView = el('div');
    sView.id = 'smith-minigame-view';

    // 5打の進行度インジケーター
    const strikesBar = el('div', 'smith-strikes-bar');
    for (let i = 0; i < STRIKES_PER_FORGE; i++) {
      const dot = el('div', 'smith-strike-dot', String(i + 1));
      if (i < strikes.length) {
        dot.classList.add(strikes[i]);
      } else if (i === strikes.length) {
        dot.classList.add('active');
      }
      strikesBar.appendChild(dot);
    }
    sView.appendChild(strikesBar);

    // 判定ゲージ
    const gaugeWrap = el('div');
    gaugeWrap.id = 'smith-gauge-wrap';

    const { perfectHalf, goodHalf } = hitWindowWidth(skill);
    const targetCenter = 0.5;

    const goodZone = el('div');
    goodZone.id = 'smith-good-zone';
    goodZone.style.left = `${(targetCenter - goodHalf) * 100}%`;
    goodZone.style.width = `${goodHalf * 2 * 100}%`;

    const perfZone = el('div');
    perfZone.id = 'smith-perfect-zone';
    perfZone.style.left = `${(targetCenter - perfectHalf) * 100}%`;
    perfZone.style.width = `${perfectHalf * 2 * 100}%`;

    const marker = el('div');
    marker.id = 'smith-marker';
    marker.style.left = '50%';

    gaugeWrap.append(goodZone, perfZone, marker);
    sView.appendChild(gaugeWrap);

    gaugeTrackEl = gaugeWrap;
    markerEl = marker;

    // フィードバック表示
    const fbText = el('div', `smith-feedback-text ${strikeFeedbackClass}`, strikeFeedback);
    fbText.id = 'smith-feedback-text';
    sView.appendChild(fbText);

    // 打撃ボタン（画面タップでも打撃）
    const strikeBtn = el('button', 'smith-big-button', `槌を打つ！ (${strikes.length + 1} / ${STRIKES_PER_FORGE})`);
    strikeBtn.id = 'smith-strike-btn';
    strikeBtn.type = 'button';
    strikeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleStrike(player, skill, tier);
    });

    const hint = el('div', 'smith-tap-hint', '※ パネル内のどこをタップしても槌を打てます');
    sView.append(strikeBtn, hint);

    body.appendChild(sView);
  }

  function initGaugeAnimation() {
    if (animId) cancelAnimationFrame(animId);
    animStartTime = 0;

    function frame(now) {
      if (!isOpen || gameMode !== 'minigame') return;
      if (!animStartTime) animStartTime = now;
      const elapsed = (now - animStartTime) / 1000;
      // 1.1秒周期で滑らかに左右往復（サイン波）
      markerNorm = (Math.sin(elapsed * Math.PI * 1.8) + 1) / 2;

      if (markerEl) {
        markerEl.style.left = `${markerNorm * 100}%`;
      }
      animId = requestAnimationFrame(frame);
    }
    animId = requestAnimationFrame(frame);
  }

  function handleStrike(player, skill, tier) {
    if (gameMode !== 'minigame' || strikes.length >= STRIKES_PER_FORGE) return;

    const res = evaluateStrike(markerNorm, 0.5, skill);
    strikes.push(res);

    if (res === 'perfect') {
      strikeFeedback = '会心の一撃！';
      strikeFeedbackClass = 'perfect';
    } else if (res === 'good') {
      strikeFeedback = '成功！ (GOOD)';
      strikeFeedbackClass = 'good';
    } else {
      strikeFeedback = '不発... (POOR)';
      strikeFeedbackClass = 'poor';
    }

    if (strikes.length >= STRIKES_PER_FORGE) {
      // 5打終了
      finishMinigame(player);
    } else {
      render();
    }
  }

  // パネル全体タップでも打撃
  panel.addEventListener('pointerdown', (e) => {
    if (gameMode !== 'minigame') return;
    if (e.target.closest('#smith-head') || e.target.closest('#smith-strike-btn')) return;
    const s = getState();
    const player = s?.actors?.find((a) => a.id === s.playerId) || s?.actors?.[0];
    if (player) {
      const skill = player.skills?.smithing || 1;
      const tier = currentBench?.tier || 1;
      handleStrike(player, skill, tier);
    }
  });

  function finishMinigame(player) {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    const timingResult = aggregateTiming(strikes);
    const s = getState();

    // 鍛冶の実行
    finalResult = executeForge(
      s,
      player,
      selectedWeaponInvIndex,
      selectedMaterialInvIndex,
      currentBench,
      timingResult,
      s.events || []
    );

    finalResult.timingResult = timingResult;
    finalResult.strikes = [...strikes];

    gameMode = 'result';
    render();
  }

  function renderResultView(player) {
    const res = finalResult;
    const sec = el('div', 'smith-section');
    sec.style.alignItems = 'center';
    sec.style.textAlign = 'center';

    const timing = res?.timingResult || 'normal';
    const titleText = timing === 'perfect' ? '★★ 会心の大成功！ ★★' : timing === 'poor' ? '仕上がり不十分...' : '★ 鍛錬成功 ★';
    const titleClass = timing === 'perfect' ? 'perfect' : timing === 'poor' ? 'poor' : 'good';

    const resHeader = el('div', `smith-feedback-text ${titleClass}`, titleText);
    resHeader.style.fontSize = '20px';
    resHeader.style.margin = '10px 0';
    sec.appendChild(resHeader);

    const card = el('div', 'smith-preview-card');
    card.style.width = '100%';

    const wp = res?.weapon;
    const def = wp ? ITEMS[wp.id] : null;
    const name = def?.name || '武器';

    const rowWp = el('div', 'smith-stat-row');
    rowWp.innerHTML = `<span>鍛錬品</span><span class="smith-stat-val">${name}</span>`;

    const rowRank = el('div', 'smith-stat-row');
    rowRank.innerHTML = `<span>品質ランク変化</span><span class="smith-stat-val">${res?.oldRank || 1}級 → <span class="rank ${rankColor(res?.newRank || 1)}">${res?.newRank || 1}級</span></span>`;

    const rowStats = el('div', 'smith-stat-row');
    const stats = wp?.stats || {};
    const statsText = `攻撃 +${stats.atkBonus || 0} / 防御 +${stats.defBonus || 0} / 切断 +${Math.round((stats.dmgBonus || 0) * 100)}% / 重さ ${stats.weightMod || 0}kg`;
    rowStats.innerHTML = `<span>強化合計性能</span><span class="smith-stat-val" style="color:#58f085">${statsText}</span>`;

    const rowXp = el('div', 'smith-stat-row');
    rowXp.innerHTML = `<span>獲得鍛冶経験値</span><span class="smith-stat-val" style="color:#ffd27a">+${res?.xp || 0} 経験値 (スキル: ${res?.newSkill || 0})</span>`;

    card.append(rowWp, rowRank, rowStats, rowXp);
    sec.appendChild(card);

    const finishBtn = el('button', 'smith-big-button', '完成品を受け取る');
    finishBtn.type = 'button';
    finishBtn.addEventListener('click', () => {
      gameMode = 'select';
      autoSelectDefaults();
      render();
    });

    const closeAllBtn = el('button', 'smith-item-btn', '鍛冶台を離れる');
    closeAllBtn.type = 'button';
    closeAllBtn.style.marginTop = '6px';
    closeAllBtn.style.justifyContent = 'center';
    closeAllBtn.addEventListener('click', close);

    sec.append(finishBtn, closeAllBtn);
    body.appendChild(sec);
  }

  return {
    open,
    close,
    isOpen: () => isOpen,
    toggle(bench) {
      if (isOpen) close();
      else open(bench);
    },
  };
}
