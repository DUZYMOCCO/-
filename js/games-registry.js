/**
 * ゲーム工房 レジストリ
 * 新しいゲームを作った場合は、ここでインポートして配列に追加するだけでポータルに反映されます。
 */
import { NeonBounceGame } from './games/neon-bounce/index.js';
import { CyberSlashGame } from './games/cyber-slash/index.js';

export const games = [
  NeonBounceGame,
  CyberSlashGame,
];

export function getGameById(id) {
  return games.find(g => g.id === id);
}
