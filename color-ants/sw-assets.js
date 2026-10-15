// カラー・アント の Service Worker 用アセット一覧
// このファイルはゲーム側の更新専用。バージョンを上げる＝このゲームのキャッシュだけが作り直される。
self.GAME_ASSETS = self.GAME_ASSETS || {};
self.GAME_ASSETS['color-ants'] = {
  version: 'v5',
  gameVersion: '2.2.0',
  files: [
    'css/color-ants.css',
    'js/index.js',
    'js/pictures.js',
    'js/puzzle.js',
    'js/colony.js',
    'js/renderer.js',
  ]
};
