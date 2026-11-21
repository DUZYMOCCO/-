// ゲーム一覧（ハブ用メタデータのみ）。ゲームを追加するときだけ編集する。
// ゲーム本体は起動時に動的 import される（モジュールの ?v= キャッシュバスターは各ゲームのフォルダ内で管理）。
// 入口モジュールは default export で { init(container, onBackToHub), prepare?() } を返すこと。
export const sections = [
  { id: 'main', label: 'IRON SQUAD · 雑兵立身出世録' },
  { id: 'strategy', label: 'リアルタイム部隊シミュレーション（試作）' },
  { id: 'sandbox', label: 'オープンワールド（3D試作）' },
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
    id: 'muscle-detective', section: 'sandbox', title: '筋肉探偵', subtitle: 'プロレス技で事件を解決（3D試作）',
    icon: '💪', color: '#2563eb',
    description: '探偵事務所前のファイトサークルで、柔らかい投げ技と頭打ちラグドールを3Dで触れる試作版。街中／リング切替、スロー再生、カメラ視点切替に対応。',
    load: () => import('../../muscle-detective/js/index.js'),
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
    description: 'アサルトライフルで ゾンビを うて！ ロケットで まとめて ふっとばせ！ まわって ズダダダ！の ミニガンも あるよ。まち・ショッピングモール・ぐんの きち・びょういん・もりの キャンプじょう・みなと・やねの まち・はいきょの ビル の 8つの ひろい マップ。やねの うえや ビルの なかは かいだんや はしごで のぼれるよ。たてを もった ゾンビ・ふくらむ ゾンビ・さけぶ ゾンビ など 12しゅるいの ゾンビが でるよ。ウェーブごとに くらい ゆうぐれ・ゆうやけ・よると かわり、3ウェーブごとに ボスが くるよ。おそわれてる おじさんを たすけると ふくが もらえる！ ゾンビが おとす そうび（ヘルメット・ベスト・くつ・うでわ）で つよく なろう（いちばん つよいのを じどうで そうび できる）。',
    load: () => import('../../zombie-tps/js/index.js'),
  },
  {
    id: 'side-action', section: 'kids', title: 'ガンキック ヒーローズ', subtitle: 'やみを けちらせ！ キックと じゅうで すすめ',
    icon: '🥋', color: '#5a1a1a',
    description: 'よこに すすむ アクション！ はしって ジャンプ、とびげり・かいてんげり・アッパーで コンボを つなげよう。ハンドガン・サブマシンガン・ライフル・ショットガン・バズーカ・ミニガン・ビームブラスターを ひろって うちまくれ！ コンバットスーツの なかま アオと モモも いっしょに たたかうよ。まっくらで こわ〜い ステージと だんだん あかるくなる ステージ、ぜんぶで 18の ステージ（けんきゅうじょ・おやしき・あめの まち・ちかてつ・あかい とう・びょういん・きち・きりの もり・こうじょう・はし・ふね・ゆきやま・むしの す・ひこうじょう・さいごの けんきゅうじょ・いせきの どうくつ・よあけの こうや・とびらの そうこ）。ふつうの ゾンビ・けいびいん ゾンビ・ぐんじん ゾンビ・へんいした ゾンビ、かべから はいでる かげや でっかい ボスたちを たおせ！ あたらしい ステージ17「よあけの こうや」は まっくらな よるから すすむほど あさやけ→あおぞらへ！ すなから でてくる さそりや ボス「よあけの おおさそり」を たおせ！ あたらしい ステージ18「とびらの そうこ」は ドアや シャッターが バーン！と ひらいて スーツの てきが 200にん いじょう どんどん でてくる！ ショットガンと けりの ドミノで まとめて やっつけろ！ ズームも えらべるよ。',
    load: () => import('../../side-action/js/index.js'),
  },
  {
    id: 'abyss-dive', section: 'kids', title: 'ABYSS DIVE', subtitle: '深淵潜航 ─ 沈んだ都市と巨大生物',
    icon: '🌊', color: '#1f8fd6',
    description: '潜水艇で深海を潜航する横スクロール・シューティング。沈んだ古代都市を抜け、ソナーで暗闇の向こうを探りながら、リヴァイアサン（巨大深海魚）とコロッサル・スクイッド（巨大イカ）に魚雷とミサイルを叩き込む。潜るほど光は失われる。',
    load: () => import('../../abyss-dive/js/index.js'),
  },
];
export function getGameById(id) { return games.find(game => game.id === id); }
