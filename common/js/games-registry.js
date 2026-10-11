// ゲーム一覧（ハブ用メタデータのみ）。ゲームを追加するときだけ編集する。
// ゲーム本体は起動時に動的 import される（モジュールの ?v= キャッシュバスターは各ゲームのフォルダ内で管理）。
// 入口モジュールは default export で { init(container, onBackToHub), prepare?() } を返すこと。
export const sections = [
  { id: 'main', label: 'IRON SQUAD · 雑兵立身出世録' },
  { id: 'kids', label: 'こどもの ゲーム' },
];

export const games = [
  {
    id: 'iron-squad', section: 'main', title: 'IRON SQUAD', subtitle: '雑兵立身出世録',
    icon: '🛡️', color: '#ffaa00',
    description: '自律行動する部隊と共に生き残れ！部隊と離れると危険だがソロ冒険も自由。伍長・隊長へ出世して初めて指揮権を掴み取れ。',
    load: () => import('../../iron-squad/js/index.js'),
  },
  {
    id: 'dada-survivor', section: 'kids', title: 'ダダサバイバーもどき', subtitle: 'ゆびで うごいて いきのこれ！',
    icon: '🐱', color: '#22c55e',
    description: 'こうげきは じどう！ 5つの ステージで ボスを たおして、たからばこの そうびで つよくなろう！',
    load: () => import('../../dada-survivor/js/index.js'),
  },
];
export function getGameById(id) { return games.find(game => game.id === id); }
