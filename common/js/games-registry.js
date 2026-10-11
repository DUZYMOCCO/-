import { IronSquadGame } from '../../iron-squad/js/index.js?v=179';
import { DadaSurvivorGame } from '../../dada-survivor/js/index.js?v=177';

// ハブの見出し。ゲームは section で振り分ける（未指定は main）
export const sections = [
  { id: 'main', label: 'IRON SQUAD · 雑兵立身出世録' },
  { id: 'kids', label: 'こどもの ゲーム' },
];

export const games = [IronSquadGame, DadaSurvivorGame];
export function getGameById(id) { return games.find(game => game.id === id); }
