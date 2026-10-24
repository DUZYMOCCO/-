// ゲーム一覧（ハブ用メタデータのみ）。ゲームを追加するときだけ編集する。
// ゲーム本体は起動時に動的 import される（モジュールの ?v= キャッシュバスターは各ゲームのフォルダ内で管理）。
// 入口モジュールは default export で { init(container, onBackToHub), prepare?() } を返すこと。
export const sections = [
  { id: 'main', label: 'IRON SQUAD · 雑兵立身出世録' },
  { id: 'strategy', label: 'リアルタイム部隊シミュレーション（試作）' },
  { id: 'casual', label: 'カジュアル・パズル' },
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
    id: 'bot-commander', section: 'strategy', title: 'ロボットコマンダー（かり）', subtitle: 'ゆびで なぞって 指揮する ロボット部隊',
    icon: '🤖', color: '#5b93e6',
    description: '部隊を タップして、ゆびで なぞって 進む道を 決めよう。霧の向こうの 敵ロボット部隊を 見つけて 倒せ！（試作版）',
    load: () => import('../../bot-commander/js/index.js'),
  },
  {
    id: 'color-ants', section: 'casual', title: 'カラー・アント', subtitle: '色をたべつくす、わらわらあり軍団！',
    icon: '🐜', color: '#f59e0b',
    description: '同じ色のアリがカラフルな絵をガリガリ食べつくす！タップで超加速、軍団を強化して全ピクセルを完食しよう！',
    load: () => import('../../color-ants/js/index.js'),
  },
  {
    id: 'dada-survivor', section: 'kids', title: 'ダダサバイバーもどき', subtitle: 'ゆびで うごいて いきのこれ！',
    icon: '🐱', color: '#22c55e',
    description: 'こうげきは じどう！ 5つの ステージで ボスを たおして、たからばこの そうびで つよくなろう！',
    load: () => import('../../dada-survivor/js/index.js'),
  },
  {
    id: 'math-runner', section: 'kids', title: 'さんすうシューター', subtitle: 'けいさんして たまを ふやせ！',
    icon: '🎯', color: '#3b82f6',
    description: '青いゲートを通って足し算・かけ算で弾を大量増殖！立ちはだかるブロックや巨大ウォールを粉砕しよう！',
    load: () => import('../../math-runner/js/index.js'),
  },
  {
    id: 'zombie-tps', section: 'kids', title: 'ゾンビストライク', subtitle: 'ゾンビを うって まちを まもれ！',
    icon: '🧟', color: '#4caf50',
    description: 'アサルトライフルで ゾンビを うて！ あたまを ねらうと ヘッドショット。ウェーブを どこまで こえられるかな？',
    load: () => import('../../zombie-tps/js/index.js'),
  },
];
export function getGameById(id) { return games.find(game => game.id === id); }
