import {salaryQuote,salaryFundingContext} from './payroll-rules.js?v=151';
import {formatDistance,formatSpeed,formatLength,formatLengthDelta} from './distance-format.js?v=151';
import {economicHonorBudget} from './regional-economy.js?v=151';
import {talentTag as talentLabel} from './talent-labels.js?v=151';
/**
 * 兵士の武勲・ステータスランキングシステム
 * 各ステータス（総合・撃破・ボス・攻撃・防御・HP・回復・死線）を詳細にランキング化し、
 * 上位3名（TOP 3: 🥇金 🥈銀 🥉銅）のみを誇り高き「ランカー」として認定・表彰！
 */

export const RANKER_CUTOFF = 3;   // 上位3名のみ真のランカーに認定！
export const TOP_RANK_LIMIT = 10;  // ランキング一覧の閲覧上限（10位まで）

export const RANKING_CATEGORIES = [
  { id: 'overall',    label: '⭐ 総合戦力', shortName: '総合', desc: '鍛え抜かれた能力・練度の総合首位（上位3名がランカー）', icon: '⭐', color: '#fbbf24' },
  { id: 'kills',      label: '⚔️ 撃墜数',   shortName: '撃破', desc: '敵軍を屠り続けた歴戦の討伐数（上位3名がランカー）', icon: '⚔️', color: '#f87171' },
  { id: 'boss_kills', label: '👑 ボス撃破', shortName: 'ボス', desc: '巨魁・大物敵を単騎討ち取った武功（上位3名がランカー）', icon: '👑', color: '#38bdf8' },
  { id: 'atk',        label: '🗡️ 攻撃力',   shortName: '攻撃', desc: '武器と鍛錬による最高破壊力（上位3名がランカー）', icon: '🗡️', color: '#fb923c' },
  { id: 'def',        label: '🛡️ 防御力',   shortName: '防御', desc: '重装甲と堅牢なる防衛能力（上位3名がランカー）', icon: '🛡️', color: '#60a5fa' },
  { id: 'strength', label: '💪 筋力', shortName: '筋力', desc: '物理攻撃と搬送で頼れる剛力（上位3名がランカー）', icon: '💪', color:'#e9ae86' },
  { id: 'magic', label: '🔮 魔力', shortName: '魔力', desc: '魔法・回復を支える術の才能と鍛錬（上位3名がランカー）', icon: '🔮', color:'#b7a5d5' },
  { id: 'magic_defense', label: '✨ 魔法防御', shortName: '魔防', desc: '魔法・属性攻撃に耐える力（上位3名がランカー）', icon: '✨', color:'#93c4ce' },
  { id: 'quickness', label: '👟 速さ', shortName: '速さ', desc: '歩いて鍛えた俊足（上位3名がランカー）', icon: '👟', color:'#b5ce94' },
  { id: 'evasion', label: '💨 回避率', shortName: '回避', desc: '実戦で磨いた身かわし（上位3名がランカー）', icon: '💨', color:'#d6ccb0' },
  { id: 'max_hp',     label: '❤️ 最大HP',   shortName: '体力', desc: '死戦を耐え抜く強靭なる生命力（上位3名がランカー）', icon: '❤️', color: '#f43f5e' },
  { id: 'healing',    label: '💖 救護・回復', shortName: '回復', desc: '仲間を死線から救い続けた守護神（上位3名がランカー）', icon: '💖', color: '#4ade80' },
  { id: 'deathline',  label: '💀 死線生還', shortName: '死線', desc: 'ダウンを重ねた危険な戦線から生還した不屈の記録（上位3名がランカー）', icon: '💀', color: '#c084fc' }
];

export function collectAllSoldiers(game) {
  if (!game) return [];
  const list = [];
  const seen = new Set();
  const add = (s, platoonName) => {
    if (!s || s.dead || !s.id || seen.has(s.id)) return;
    seen.add(s.id);
    list.push({ soldier: s, platoon: platoonName });
  };

  for (const s of game.squad || []) add(s, s.isPersonalGuard?'直属':game.platoons?.[(s.platoonId||0)%3]?.name||'本隊');
  for (const s of game.reserves || []) add(s, '予備');
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
      case 'overall': {
        const lvl = s.level || 1;
        const atk = Math.max(s.atk||0,s.magicAttack||0,(s.healPower||0)*.6);
        const hp = s.maxHp || 0;
        const def = s.def || 0;
        score = Math.round(lvl * 30 + atk * 2 + Math.floor(hp / 10) + def+(s.magicDef||0)+(s.quickness||0)+(s.dodge||0)*3);
        metricText = `総合戦力 ${score}`;
        detailText = `Lv.${lvl} · 攻${s.atk||0} · HP${hp} · 防${def}`;
        break;
      }
      case 'kills': {
        const minions = s.minionKills || 0;
        const bosses = s.bossKills || 0;
        score = minions + bosses * 5;
        metricText = `総討伐 ${minions + bosses}体`;
        detailText = bosses > 0 ? `(雑魚 ${minions} / 👑ボス ${bosses})` : `(雑魚 ${minions}体)`;
        break;
      }
      case 'boss_kills': {
        const bosses = s.bossKills || 0;
        score = bosses;
        metricText = `👑 ボス撃破 ${bosses}体`;
        detailText = bosses > 0 ? `大物討伐実績あり` : `ボス撃破なし`;
        break;
      }
      case 'atk': {
        const atk = s.atk || 0;
        score = atk;
        metricText = `⚔️ 攻撃力 ${atk}`;
        detailText = `Lv.${s.level || 1} ${s.class || '兵士'}`;
        break;
      }
      case 'def': {
        const def = s.def || 0;
        score = def;
        metricText = `🛡️ 防御力 ${def}`;
        detailText = `Lv.${s.level || 1} ${s.class || '兵士'}`;
        break;
      }
      case 'max_hp': {
        const hp = s.maxHp || 0;
        score = hp;
        metricText = `❤️ 最大HP ${hp.toLocaleString()}`;
        detailText = `現HP: ${Math.floor(s.hp || 0)} / ${hp}`;
        break;
      }
      case 'strength':case 'magic':case 'magic_defense':case 'quickness':case 'evasion': {
        const definition={strength:['strength','筋力'],magic:['magicPower','魔力'],magic_defense:['magicDef','魔法防御'],quickness:['quickness','速さ'],evasion:['dodge','回避率']}[categoryId];
        score=s[definition[0]]||0;metricText=`${definition[1]} ${score}${categoryId==='evasion'?'%':''}`;
        detailText=`Lv.${s.level||1} · ${s.rankTitle||s.class||'兵士'}${categoryId==='quickness'?` · 移動${formatSpeed(s.speed||0)}`:categoryId==='evasion'?` · 回避 ${s.evasion||0}`:''}`;
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
      case 'deathline':
      default: {
        const dl = s.survivedDeathlines || 0;
        const waves = s.survivedWaves || 0;
        const skills = s.deathlineSkills?.length || 0;
        score = dl * 20 + skills * 10 + waves;
        metricText = dl > 0 ? `死線生還 ${dl}回` : `生存 ${waves}期`;
        detailText = skills > 0 ? `[💀覚醒技×${skills}]` : (dl > 0 ? '死線覚醒歴あり' : `作戦${waves}期生還`);
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
  return evaluated.slice(0, limit);
}

/**
 * 兵士が「上位3名（TOP 3）のランカー」であるかどうか判定し、該当するランカー称号バッジを返す
 */
export function getSoldierRankerBadges(game, soldierId) {
  if (!game || !soldierId) return [];
  const soldiers = collectAllSoldiers(game);
  if (!soldiers.length) return [];

  const badges = [];
  for (const cat of RANKING_CATEGORIES) {
    const list = computeRankings(soldiers, cat.id, RANKER_CUTOFF); // TOP 3 のみ判定！
    const idx = list.findIndex(e => e.soldier.id === soldierId);
    if (idx !== -1 && list[idx].score > 0) {
      const rank = idx + 1;
      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
      badges.push({
        catId: cat.id,
        catLabel: cat.label,
        rank,
        title: `${cat.icon}ランカー (${cat.label} ${rank}位)`,
        shortLabel: `${rankIcon}${cat.shortName}${rank}位`,
        color: rank === 1 ? '#fde047' : rank === 2 ? '#e2e8f0' : '#f97316'
      });
    }
  }
  // 複数部門でランカーの場合、見やすさのため最大2件まで表示
  return badges.slice(0, 2);
}

/**
 * ランカー特別給与テーブル（上位3名への特別手当）
 * Minimum 50/30/20G; growing regular pay grants 50/30/20% per department.
 */
export const RANKER_BONUS_SALARY = {
  1: 50,
  2: 30,
  3: 20
};
export const RANKER_BONUS_RATE={1:.5,2:.3,3:.2};
export const rankerSalaryBonus=(game,soldier,rank,funding)=>RANKER_BONUS_RATE[rank]
  ?Math.max(RANKER_BONUS_SALARY[rank],Math.ceil(salaryQuote(soldier,game,funding).total*RANKER_BONUS_RATE[rank])):0;

/**
 * 兵士が実戦武勲を認可される資格があるか判定（未出撃・未行動の新兵は対象外）
 */
export function isEligibleForRankerBonus(soldier) {
  if (!soldier || soldier.dead) return false;
  const waves = soldier.survivedWaves || 0;
  const kills = (soldier.minionKills || 0) + (soldier.bossKills || 0);
  const heals = soldier.healingHp || 0;
  const dl = soldier.survivedDeathlines || 0;
  const participatedNow = (soldier.phaseActivity?.combatActions || 0) > 0 || (soldier.phaseActivity?.healingDone || 0) > 0;
  return waves > 0 || kills > 0 || heals > 0 || dl > 0 || participatedNow;
}

/**
 * 指定兵士のランカー特別給与（全部門のTOP3ボーナス合計）と内訳を算出
 */
export function calcSoldierRankerBonus(game, soldierId) {
  const result=calcAllRankerBonuses(game).get(soldierId);
  return result?{totalBonus:result.totalBonus,breakdowns:result.breakdowns}:{totalBonus:0,breakdowns:[]};
}

/**
 * 部隊全体の全ランカー特別給与を一括計算（作戦期完了時の配布用）
 * @returns {Map<string, { totalBonus: number, breakdowns: Array, soldier: object }>}
 */
export function calcAllRankerBonuses(game) {
  const result = new Map();
  if (!game) return result;
  const soldiers = collectAllSoldiers(game), funding=salaryFundingContext(game);
  if (!soldiers.some(entry=>isEligibleForRankerBonus(entry.soldier))) return result;

  for (const cat of RANKING_CATEGORIES) {
    const list = computeRankings(soldiers, cat.id, RANKER_CUTOFF);
    list.forEach((entry, idx) => {
      const s = entry.soldier;
      if (!isEligibleForRankerBonus(s) || entry.score <= 0) return;
      const rank = idx + 1;
      const bonus = rankerSalaryBonus(game,s,rank,funding);
      if (bonus <= 0) return;

      if (!result.has(s.id)) {
        result.set(s.id, { totalBonus: 0, breakdowns: [], soldier: s });
      }
      const data = result.get(s.id);
      data.totalBonus += bonus;
      data.breakdowns.push({
        catId: cat.id,
        catLabel: cat.label,
        shortName: cat.shortName,
        rank,
        bonus
      });
    });
  }

  const needed=[...result.values()].reduce((n,r)=>n+r.totalBonus,0);
  const budget=game.nation?economicHonorBudget(game):needed;
  if(needed>budget){
    const awards=[...result.values()].flatMap(data=>data.breakdowns.map(b=>({data,b,fraction:b.bonus*budget/needed%1})));
    for(const a of awards)a.b.bonus=Math.floor(a.b.bonus*budget/needed);
    let left=budget-awards.reduce((n,a)=>n+a.b.bonus,0);
    awards.sort((a,b)=>b.fraction-a.fraction);
    for(const a of awards){if(!left)break;a.b.bonus++;left--;}
    for(const data of result.values())data.totalBonus=data.breakdowns.reduce((n,b)=>n+b.bonus,0);
  }
  return result;
}

export function renderTroopRankings(game) {
  const container = game?.container || document;
  const section = container.querySelector?.('#command-troop-rankings');
  if (!section) return;

  if (!game._troopRankingCategory) {
    game._troopRankingCategory = 'overall'; // デフォルトは総合戦力！
  }
  const currentCat = game._troopRankingCategory;
  const catDef = RANKING_CATEGORIES.find(c => c.id === currentCat) || RANKING_CATEGORIES[0];

  const soldiers = collectAllSoldiers(game);
  const topList = computeRankings(soldiers, currentCat, TOP_RANK_LIMIT);
  const fundedBonuses=calcAllRankerBonuses(game);

  section.innerHTML = `
    <div class="ranking-header">
      <div class="ranking-title-group">
        <h4>🎖️ 部隊ステータスランキング <span class="ranker-indicator">TOP 3 特別給与支給</span></h4>
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
            const isRanker = rank <= RANKER_CUTOFF;
            const medal = rank === 1 ? '🥇 1位' : rank === 2 ? '🥈 2位' : rank === 3 ? '🥉 3位' : `${rank}位`;
            const bonusAmount = fundedBonuses.get(s.id)?.breakdowns.find(b=>b.catId===currentCat)?.bonus||0;
            const isNamed = !!s.title;
            const name = isNamed ? `${s.title}${s.name}` : s.name;
            const cls = s.class || s.rankTitle || '兵士';
            const talentTag = s.talent ? `[${talentLabel(s.talent)}]` : '';
            return `
              <li class="ranking-item rank-${rank}${isRanker ? ' is-ranker' : ''}">
                <div class="rank-pos">
                  <span class="rank-pos-badge rank-pos-${rank}">${medal}</span>
                  ${rank === 1 ? '<span class="rank-crown">👑 首席</span>' : rank <= 3 ? '<span class="ranker-tag">RANKER</span>' : ''}
                  ${bonusAmount > 0 ? `<span class="rank-bonus-chip" title="作戦完了時に特別給与支給">+${bonusAmount}G給与</span>` : ''}
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
