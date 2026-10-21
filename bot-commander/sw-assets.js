// ロボットコマンダー（仮） の Service Worker 用アセット一覧
// このファイルはゲーム側の更新専用。バージョンを上げる＝このゲームのキャッシュだけが作り直される。
// パスは「ゲームフォルダからの相対パス」。ルートの sw.js は触らない。
// アートは js/render/art.js の中の手書きSVG文字列（起動時にテクスチャ化）なので、画像ファイルはない。
self.GAME_ASSETS = self.GAME_ASSETS || {};
self.GAME_ASSETS['bot-commander'] = {
  version: 'v4',
  gameVersion: '0.2.0', // ハブのカードに表示する版（キャッシュ用 version とは別。リリース時に上げる）
  files: [
    'css/bot-commander.css',
    'js/index.js',
    'js/sim/rng.js',
    'js/sim/map.js',
    'js/sim/path.js',
    'js/sim/fog.js',
    'js/sim/stroke.js',
    'js/sim/mission.js',
    'js/sim/sim.js',
    'js/render/art.js',
    'js/render/textures.js',
    'js/render/renderer.js',
    'js/render/input.js',
    'vendor/pixi-8.22.0.min.mjs',
    // 工房の共通処理だが、初回からオフラインで起動できるようこのゲームのキャッシュにも入れる（iron-squad と同じ扱い）
    '../common/js/load-css.js'
  ]
};
