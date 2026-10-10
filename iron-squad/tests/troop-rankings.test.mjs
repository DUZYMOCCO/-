import {rankerSalaryBonus} from '../js/troop-rankings.js';
import test from 'node:test';
import assert from 'node:assert/strict';

// Mock minimal DOM for headless test environment
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    style: {},
    children: [],
    dataset: {},
    append(...nodes) { this.children.push(...nodes); },
    before() {},
    after() {},
    replaceChildren(...nodes) { this.children = [...nodes]; },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains: () => false
    }
  })
};

const { categorizeLogMessage, recordBattleLog } = await import('../js/battle-log.js');
const { computeRankings, getSoldierRankerBadges, RANKER_CUTOFF, RANKING_CATEGORIES } = await import('../js/troop-rankings.js');

test('battle-log categorization test', () => {
  assert.equal(categorizeLogMessage('ゴードンがLv.5にレベルアップ！'), 'growth');
  assert.equal(categorizeLogMessage('アランが死線覚醒！スキル「金剛不壊」を習得！'), 'growth');
  assert.equal(categorizeLogMessage('二等雑兵から一等兵へ昇格！'), 'growth');
  assert.equal(categorizeLogMessage('強敵を撃破！'), 'combat');
  assert.equal(categorizeLogMessage('秘宝「守護の指輪」を獲得！'), 'loot');
  assert.equal(categorizeLogMessage('宝珠を拾った！'), 'loot');
  assert.equal(categorizeLogMessage('兵士が倒れた！搬送が必要！'), 'rescue');
  assert.equal(categorizeLogMessage('救助した兵士が本陣で蘇生！'), 'rescue');

  // 会心の一撃はログを埋め尽くさないよう記録しない
  const testGame = { battleLogHistory: [] };
  recordBattleLog(testGame, '会心の一撃！64ダメージ');
  assert.equal(testGame.battleLogHistory.length, 0, 'Critical hit logs should be ignored');
  recordBattleLog(testGame, 'アランがLv.3にレベルアップ！');
  assert.equal(testGame.battleLogHistory.length, 1, 'Level-up log should be recorded');
});

test('troop-rankings granular status & top 3 ranker criteria', () => {
  assert.equal(RANKER_CUTOFF, 3, 'Only top 3 are recognized as rankers');
  assert.equal(RANKING_CATEGORIES.length, 13, 'existing eight categories plus strength, magic, magic defence, quickness and evasion');

  const dummySoldiers = Array.from({ length: 15 }, (_, i) => ({
    soldier: {
      id: `soldier-${i}`,
      name: `兵士${i}`,
      level: i + 1,
      minionKills: i * 5,
      bossKills: i === 14 ? 3 : (i === 13 ? 1 : 0),
      healingHp: i === 10 ? 5000 : 0,
      revivalExp: i === 10 ? 1000 : 0,
      survivedDeathlines: i % 3,
      survivedWaves: i,
      atk: 10 + i * 2,
      maxHp: 100 + i * 20,
      def: 5 + i
    },
    platoon: i < 5 ? '直属' : '本隊'
  }));

  // Top list returns up to 10
  const topKills = computeRankings(dummySoldiers, 'kills', 10);
  assert.equal(topKills.length, 10);
  assert.equal(topKills[0].soldier.id, 'soldier-14', 'Rank 1 killer');
  assert.equal(topKills[1].soldier.id, 'soldier-13', 'Rank 2 killer');
  assert.equal(topKills[2].soldier.id, 'soldier-12', 'Rank 3 killer');

  const gameMock = {
    squad: dummySoldiers.slice(0, 5).map(e => e.soldier),
    reserveSoldiers: dummySoldiers.slice(5).map(e => e.soldier)
  };

  // Top 3 soldiers get ranker badges
  const rank1Badges = getSoldierRankerBadges(gameMock, 'soldier-14');
  assert.ok(rank1Badges.length > 0, 'Rank 1 must get ranker badges');
  assert.ok(rank1Badges.some(b => b.rank === 1), 'Rank 1 badge has rank=1 (gold)');

  const rank3Badges = getSoldierRankerBadges(gameMock, 'soldier-12');
  assert.ok(rank3Badges.some(b => b.catId === 'kills' && b.rank === 3), 'Rank 3 gets bronze ranker badge');

  // Rank 4+ (e.g. soldier-11 who is 4th in kills and not top 3 anywhere) does NOT get kills badge
  const rank4Badges = getSoldierRankerBadges(gameMock, 'soldier-11');
  assert.equal(rank4Badges.find(b => b.catId === 'kills'), undefined, 'Rank 4 does not get kills ranker badge');

  // Boss kills ranking test
  const topBoss = computeRankings(dummySoldiers, 'boss_kills', 3);
  assert.equal(topBoss[0].soldier.id, 'soldier-14', '3 boss kills is #1');
  assert.equal(topBoss[1].soldier.id, 'soldier-13', '1 boss kill is #2');
});

test('ranker bonus salary distribution for top 3 rankers', async () => {
  const {
    RANKER_BONUS_SALARY,
    calcSoldierRankerBonus,
    calcAllRankerBonuses,
    isEligibleForRankerBonus
  } = await import('../js/troop-rankings.js');

  assert.equal(RANKER_BONUS_SALARY[1], 50, '1st place bonus is 50G');
  assert.equal(RANKER_BONUS_SALARY[2], 30, '2nd place bonus is 30G');
  assert.equal(RANKER_BONUS_SALARY[3], 20, '3rd place bonus is 20G');

  // Test soldiers with battle records
  const ace1 = { id: 's1', name: 'エース1', level: 10, minionKills: 100, bossKills: 5, atk: 50, maxHp: 500, def: 20, survivedWaves: 5, gold: 10 };
  const ace2 = { id: 's2', name: 'エース2', level: 8, minionKills: 60, bossKills: 2, atk: 40, maxHp: 400, def: 15, survivedWaves: 4, gold: 10 };
  const ace3 = { id: 's3', name: 'エース3', level: 6, minionKills: 30, bossKills: 1, atk: 30, maxHp: 300, def: 10, survivedWaves: 3, gold: 10 };
  const regular = { id: 's4', name: '一般兵', level: 3, minionKills: 5, bossKills: 0, atk: 15, maxHp: 150, def: 5, survivedWaves: 1, gold: 10 };
  const newbie = { id: 's5', name: '新兵', level: 1, minionKills: 0, bossKills: 0, healingHp: 0, survivedDeathlines: 0, survivedWaves: 0, atk: 99, maxHp: 999, def: 99, gold: 10 };

  const testGame = {
    squad: [ace1, ace2, ace3, regular, newbie]
  };

  // Eligibility check
  assert.equal(isEligibleForRankerBonus(ace1), true, 'Ace with kills and survived waves is eligible');
  assert.equal(isEligibleForRankerBonus(newbie), false, 'Brand new recruit with no battle experience is not eligible');

  // Newbie gets 0 bonus even if static stats are high
  const newbieBonus = calcSoldierRankerBonus(testGame, 's5');
  assert.equal(newbieBonus.totalBonus, 0, 'Newbie gets 0 bonus salary');

  // Regular soldier outside top 3 gets 0 bonus
  const regularBonus = calcSoldierRankerBonus(testGame, 's4');
  assert.equal(regularBonus.totalBonus, 0, '4th place gets 0 bonus salary');

  // Ace1 has multiple #1 ranks (kills 1st = 50G, boss 1st = 50G, etc.)
  const ace1Bonus = calcSoldierRankerBonus(testGame, 's1');
  assert.ok(ace1Bonus.totalBonus >= 50, 'Ace 1 gets substantial bonus');
  const killsBreakdown = ace1Bonus.breakdowns.find(b => b.catId === 'kills');
  assert.ok(killsBreakdown, 'Has kills breakdown');
  assert.equal(killsBreakdown.rank, 1);
  assert.equal(killsBreakdown.bonus, rankerSalaryBonus(testGame,testGame.squad.find(s=>s.id==='s1'),1));

  // Ace2 is #2 in kills (30G)
  const ace2Bonus = calcSoldierRankerBonus(testGame, 's2');
  const ace2Kills = ace2Bonus.breakdowns.find(b => b.catId === 'kills');
  assert.ok(ace2Kills, 'Ace 2 has kills breakdown');
  assert.equal(ace2Kills.rank, 2);
  assert.equal(ace2Kills.bonus, rankerSalaryBonus(testGame,testGame.squad.find(s=>s.id==='s2'),2));

  // Ace3 is #3 in kills (20G)
  const ace3Bonus = calcSoldierRankerBonus(testGame, 's3');
  const ace3Kills = ace3Bonus.breakdowns.find(b => b.catId === 'kills');
  assert.ok(ace3Kills, 'Ace 3 has kills breakdown');
  assert.equal(ace3Kills.rank, 3);
  assert.equal(ace3Kills.bonus, rankerSalaryBonus(testGame,testGame.squad.find(s=>s.id==='s3'),3));

  // Batch calculation test
  const allBonuses = calcAllRankerBonuses(testGame);
  assert.ok(allBonuses.has('s1'), 'Ace 1 in map');
  assert.ok(allBonuses.has('s2'), 'Ace 2 in map');
  assert.ok(allBonuses.has('s3'), 'Ace 3 in map');
  assert.equal(allBonuses.has('s4'), false, 'Regular soldier not in map');
  assert.equal(allBonuses.has('s5'), false, 'Newbie not in map');
});
