/**
 * 兵士の武勲・ステータスランキングシステム
 * プレイヤーがニヤニヤしながら眺められる精鋭たちの功績・成長集計
 * 10位以内の兵士は誇り高き「ランカー」として認定・各所で専用バッジ表示！
 */

export const TOP_RANK_LIMIT = 10;

export const RANKING_CATEGORIES = [
  { id: 'kills',    label: '⚔️ 撃破王',   title: '最多討伐ランキング', desc: '敵軍を屠り続けた歴戦の討伐王（10位以内は部隊ランカー）', icon: '⚔️', color: '#f87171' },
  { id: 'healing',  label: '💖 命の恩人', title: '救護・回復ランキング', desc: '仲間を死線から救い続けた守護神（10位以内は部隊ランカー）', icon: '💖', color: '#4ade80' },
  { id: 'survivor', label: '💀 不屈の兵', title: '死線生還ランキング', desc: '幾度もの壊滅の危機を生き延びた猛者（10位以内は部隊ランカー）', icon: '💀', color: '#fca5a5' },
  { id: 'power',    label: '⭐ 筆頭武官', title: '総合戦力ランキング', desc: '鍛え抜かれた能力と最高練度の精鋭（10位以内は部隊ランカー）', icon: '⭐', color: '#fbbf24' }
];

export function collectAllSoldiers(game) {
  if (!game) return [];
  const list = [];
  const seen = new Set();
  const add = (s, platoonName) => {
    if (!s || !s.id || seen.has(s.id)) return;
    seen.add(s.id);
    list.push({ soldier: s, platoon: platoonName });
  };

  for (const s of game.squad || []) add(s, '直属');
  for (const s of game.reserveSoldiers || []) add(s, '本隊');
  for (const p of game.platoons || []) {
    for (const s of p.members || []) add(s, p.name || '本隊');
  }
  return list;
}

export function computeRankings(soldiers, categoryId, limit = TOP_RANK_LIMIT) {
  if (!Array.isArray(soldiers) || !soldiers.length) return [];

  const evaluated = soldiers.map(({ soldier: s, platoon }) => {
    let score = 0;
    let metricText = '';
    let detailText = '';

    switch (categoryId) {
      case 'kills': {
        const minions = s.minionKills || 0;
        const bosses = s.bossKills || 0;
        score = minions + bosses * 5;
        metricText = `討伐 ${minions + bosses}体`;
        detailText = bosses > 0 ? `(雑魚 ${minions} / 👑ボス ${bosses})` : `(雑魚 ${minions}体)`;
        break;
      }
      case 'healing': {
        const healHp = Math.floor(s.healingHp || 0);
        const revExp = s.revivalExp || 0;
        score = healHp + revExp;
        metricText = `回復 ${healHp.toLocaleString()} HP`;
        detailText = revExp > 0 ? `(蘇生功績 ${revExp} EXP)` : (healHp > 0 ? '通常・継続治療' : '未治療');
        break;
      }
      case 'survivor': {
        const dl = s.survivedDeathlines || 0;
        const waves = s.survivedWaves || 0;
        const skills = s.deathlineSkills?.length || 0;
        score = dl * 20 + skills * 10 + waves;
        metricText = dl > 0 ? `死線生還 ${dl}回` : `生存 ${waves}期`;
        detailText = skills > 0 ? `[💀覚醒技×${skills}]` : (dl > 0 ? '死線覚醒歴あり' : `作戦${waves}期生還`);
        break;
      }
      case 'power':
      default: {
        const lvl = s.level || 1;
        const atk = s.atk || 0;
        const hp = s.maxHp || 0;
        const def = s.def || 0;
        score = lvl * 30 + atk * 2 + Math.floor(hp / 10) + def;
        metricText = `Lv.${lvl} (戦力 ${score})`;
        detailText = `攻 ${atk} · HP ${hp} · 防 ${def}`;
        break;
      }
    }

    return {
      soldier: s,
      platoon,
      score,
      metricText,
      detailText
    };
  });

  // スコア降順、同点はレベル順
  evaluated.sort((a, b) => b.score - a.score || (b.soldier.level || 1) - (a.soldier.level || 1));
  return evaluated.slice(0, limit); // 上位10名（ランカー）
}

/**
 * 兵士が「10位以内のランカー」であるかどうか判定し、該当するランカー称号バッジを返す
 */
export function getSoldierRankerBadges(game, soldierId) {
  if (!game || !soldierId) return [];
  const soldiers = collectAllSoldiers(game);
  if (!soldiers.length) return [];

  const badges = [];
  for (const cat of RANKING_CATEGORIES) {
    const list = computeRankings(soldiers, cat.id, TOP_RANK_LIMIT);
    const idx = list.findIndex(e => e.soldier.id === soldierId);
    if (idx !== -1 && list[idx].score > 0) {
      const rank = idx + 1;
      const rankPrefix = rank === 1 ? '🥇1位' : rank === 2 ? '🥈2位' : rank === 3 ? '🥉3位' : `${rank}位`;
      badges.push({
        catId: cat.id,
        catLabel: cat.label,
        rank,
        title: `${cat.icon}ランカー (${cat.label.replace(/^.*?\s/, '')} ${rankPrefix})`,
        shortLabel: `${cat.icon}${rankPrefix}`,
        color: cat.color
      });
    }
  }
  return badges;
}

export function renderTroopRankings(game) {
  const container = game?.container || document;
  const section = container.querySelector?.('#command-troop-rankings');
  if (!section) return;

  if (!game._troopRankingCategory) {
    game._troopRankingCategory = 'kills'; // デフォルトは撃破王！
  }
  const currentCat = game._troopRankingCategory;
  const catDef = RANKING_CATEGORIES.find(c => c.id === currentCat) || RANKING_CATEGORIES[0];

  const soldiers = collectAllSoldiers(game);
  const topList = computeRankings(soldiers, currentCat, TOP_RANK_LIMIT);

  section.innerHTML = `
    <div class="ranking-header">
      <div class="ranking-title-group">
        <h4>🎖️ 部隊の武勲・功績ランキング <span class="ranker-indicator">TOP 10 ランカー殿堂</span></h4>
        <span class="ranking-desc">${catDef.desc}</span>
      </div>
      <div class="ranking-tabs" role="tablist">
        ${RANKING_CATEGORIES.map(c => `
          <button type="button" class="ranking-tab-btn${c.id === currentCat ? ' active' : ''}" data-cat="${c.id}">
            ${c.label}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="ranking-body">
      ${topList.length === 0 ? `
        <p class="ranking-empty">部隊に兵士がまだ配備されていません。雇用や合流を行うとランキングが記録されます。</p>
      ` : `
        <ol class="ranking-list">
          ${topList.map((entry, idx) => {
            const s = entry.soldier;
            const rank = idx + 1;
            const medal = rank === 1 ? '🥇 1位' : rank === 2 ? '🥈 2位' : rank === 3 ? '🥉 3位' : `🎖️ ${rank}位`;
            const isNamed = !!s.title;
            const name = isNamed ? `${s.title}${s.name}` : s.name;
            const cls = s.class || s.classId || '兵士';
            const talentTag = s.talent ? `[${s.talent}]` : '';
            return `
              <li class="ranking-item rank-${rank} ranker-slot">
                <div class="rank-pos">
                  <span class="rank-pos-badge rank-pos-${rank}">${medal}</span>
                  ${rank <= 3 ? '<span class="rank-crown">👑</span>' : '<span class="ranker-tag">RANKER</span>'}
                </div>
                <div class="rank-soldier-info">
                  <div class="rank-soldier-main">
                    <strong class="rank-soldier-name">${name}</strong>
                    <span class="rank-badge rank-platoon-${entry.platoon}">${entry.platoon}</span>
                    <span class="rank-class">${cls} Lv.${s.level || 1}</span>
                    ${talentTag ? `<span class="rank-talent">${talentTag}</span>` : ''}
                  </div>
                  <div class="rank-soldier-detail">${entry.detailText}</div>
                </div>
                <div class="rank-score-pill">
                  <strong>${entry.metricText}</strong>
                </div>
              </li>
            `;
          }).join('')}
        </ol>
      `}
    </div>
  `;

  // イベント登録
  const buttons = section.querySelectorAll('.ranking-tab-btn');
  for (const btn of buttons) {
    btn.onclick = () => {
      game._troopRankingCategory = btn.dataset.cat;
      renderTroopRankings(game);
    };
  }
}
