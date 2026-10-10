import { IronSquadGame } from '../iron-squad/js/index.js?v=174';

export const games = [IronSquadGame];
export function getGameById(id) { return games.find(game => game.id === id); }
