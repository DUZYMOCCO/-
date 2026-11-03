// テスト用キャラ（testchars1）: 全スキルを 50 / 100 / 150 にした仲間を操作している仲間の近くに出して部隊に入れる。
// 同じ段の試験キャラが生きて部隊にいれば作り直さない（何度押しても重複しない）。
import { makeActor } from './world.js';
import { resolveCircle } from './collide.js';
import { ensurePlayerSquads, syncSquadIds } from './squads.js';
import { makeEvent } from './data.js';
import { giveCrossbow, START_BOLTS } from './crossbow.js';

export const TEST_CHAR_LEVELS = Object.freeze([50, 100, 150]);
// ゲームにある全スキル（能力値を含む）。
export const TEST_CHAR_SKILL_KEYS = Object.freeze([
  'attack', 'defense', 'martial', 'dodge', 'toughness', 'strength', 'dexterity', 'athletics',
  'stealth', 'assassination', 'crossbow', 'throwing', 'perception', 'precision', 'turret',
  'medic', 'trade', 'lockpicking', 'thievery', 'smithing', 'build', 'trap', 'prosthetics',
]);

export function testCharName(level) { return '試験' + level; }

export function addTestChars(state, events = [], companionCrossbow = true) {
  if (!state || !Array.isArray(state.actors)) return { added: [], kept: [] };
  const player = state.actors.find((a) => a.id === state.playerId) || state.actors.find((a) => a.faction === 'player' && a.state !== 'dead');
  if (!player) return { added: [], kept: [] };
  ensurePlayerSquads(state);
  const squad = state.playerSquads.find((sq) => sq.memberIds.includes(player.id)) || state.playerSquads[0];
  const added = [], kept = [];
  TEST_CHAR_LEVELS.forEach((level, i) => {
    const existing = state.actors.find((a) => a.testCharLevel === level && a.state !== 'dead' && a.faction === 'player' && state.squadIds.includes(a.id));
    if (existing) { kept.push(existing.id); return; }
    const angle = (i / TEST_CHAR_LEVELS.length) * Math.PI * 2 + 0.5;
    const pos = resolveCircle(state, player.x + Math.cos(angle) * 2.5, player.z + Math.sin(angle) * 2.5, 0.4);
    const actor = makeActor(state, 'player', pos.x, pos.z, null, false);
    actor.name = testCharName(level);
    actor.testCharLevel = level;
    actor.sex = 'm';
    actor.money = 100;
    actor.state = 'idle';
    // クロスボウは設定で有効な場合だけ持たせる。
    if (companionCrossbow) giveCrossbow(actor, START_BOLTS.player);
    for (const key of TEST_CHAR_SKILL_KEYS) actor.skills[key] = level;
    actor.inv.push({ id: 'shovel', n: 1 }, { id: 'bear_trap', n: 2 }, { id: 'net_trap', n: 2 });
    if (!squad.memberIds.includes(actor.id)) squad.memberIds.push(actor.id);
    added.push(actor.id);
  });
  syncSquadIds(state);
  if (added.length) events.push(makeEvent(state, 'join', added.map((id) => state.actors.find((a) => a.id === id).name).join('・') + 'が仲間に加わった（テスト用）'));
  return { added, kept };
}
