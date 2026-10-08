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

const { categorizeLogMessage, recordBattleLog, LOG_CATEGORIES } = await import('../js/games/iron-squad/battle-log.js');
const { computeRankings, getSoldierRankerBadges, RANKING_CATEGORIES } = await import('../js/games/iron-squad/troop-rankings.js');

test('battle-log categorization test', () => {
  assert.equal(categorizeLogMessage('ゴードンがLv.5にレベルアップ！'), 'growth');
  assert.equal(categorizeLogMessage('アランが死線覚醒！スキル「金剛不壊」を習得！'), 'growth');
  assert.equal(categorizeLogMessage('二等雑兵から一等兵へ昇格！'), 'growth');
  assert.equal(categorizeLogMessage('オークジェネラルを討伐！'), 'combat');
  assert.equal(categorizeLogMessage('会心の一撃！強敵を撃破！'), 'combat');
  assert.equal(categorizeLogMessage('秘宝「守護の指輪」を獲得！'), 'loot');
  assert.equal(categorizeLogMessage('宝珠を拾った！'), 'loot');
  assert.equal(categorizeLogMessage('兵士が倒れた！搬送が必要！'), 'rescue');
  assert.equal(categorizeLogMessage('救助した兵士が本陣で蘇生！'), 'rescue');
});

test('troop-rankings computation & ranker limit (top 10)', () => {
  const dummySoldiers = Array.from({ length: 15 }, (_, i) => ({
    soldier: {
      id: `soldier-${i}`,
      name: `兵士${i}`,
      level: i + 1,
      minionKills: i * 5,
      bossKills: i === 14 ? 3 : 0,
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

  // Top 10 limit verification
  const topKills = computeRankings(dummySoldiers, 'kills', 10);
  assert.equal(topKills.length, 10, 'Rankings should return at most 10 rankers');
  assert.equal(topKills[0].soldier.id, 'soldier-14', 'Highest killer should be ranked #1');

  const topHealing = computeRankings(dummySoldiers, 'healing', 10);
  assert.equal(topHealing[0].soldier.id, 'soldier-10', 'Highest healer should be ranked #1');
  assert.ok(topHealing[0].score >= 6000, 'Healing score includes HP + revival');

  // getSoldierRankerBadges test
  const gameMock = {
    squad: dummySoldiers.slice(0, 5).map(e => e.soldier),
    reserveSoldiers: dummySoldiers.slice(5).map(e => e.soldier)
  };

  const topSoldierBadges = getSoldierRankerBadges(gameMock, 'soldier-14');
  assert.ok(topSoldierBadges.length > 0, 'Ranker #1 should have ranker badges');
  const killBadge = topSoldierBadges.find(b => b.catId === 'kills');
  assert.ok(killBadge, 'Should have kills ranker badge');
  assert.equal(killBadge.rank, 1, 'Should be rank 1');

  // 15th soldier (lowest score in 15 people) should NOT be in top 10 for kills
  const lowSoldierBadges = getSoldierRankerBadges(gameMock, 'soldier-0');
  const lowKillBadge = lowSoldierBadges.find(b => b.catId === 'kills');
  assert.equal(lowKillBadge, undefined, 'Lowest score soldier should not have kills ranker badge');
});
