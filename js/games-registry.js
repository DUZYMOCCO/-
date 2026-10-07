import { IronSquadGame } from './games/iron-squad/index.js?v=101';

export const games = [IronSquadGame];
export function getGameById(id) { return games.find(game => game.id === id); }
