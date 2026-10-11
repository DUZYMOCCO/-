// ダダサバイバーもどき の Service Worker 用アセット一覧
// このファイルはゲーム側の更新専用。バージョンを上げる＝このゲームのキャッシュだけが作り直される。
// パスは「ゲームフォルダからの相対パス」。ルートの sw.js は触らない。
self.GAME_ASSETS = self.GAME_ASSETS || {};
self.GAME_ASSETS['dada-survivor'] = {
  version: 'v178',
  gameVersion: '1.0.0', // ハブのカードに表示する版（キャッシュ用 version とは別。リリース時に上げる）
  files: [
    'css/dada-survivor.css',
    'js/index.js',
    'js/rules.js',
    'js/art.js',
    'js/stage.js',
    'js/menus.js'
  ]
};
