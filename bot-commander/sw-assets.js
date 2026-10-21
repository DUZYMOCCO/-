// ロボットコマンダー（仮） の Service Worker 用アセット一覧
// このファイルはゲーム側の更新専用。バージョンを上げる＝このゲームのキャッシュだけが作り直される。
// パスは「ゲームフォルダからの相対パス」。ルートの sw.js は触らない。
// SVG + reference-based WebP art, baked once at boot.
self.GAME_ASSETS = self.GAME_ASSETS || {};
self.GAME_ASSETS['bot-commander'] = {
  version: 'v7',
  gameVersion: '0.3.0', // ハブのカードに表示する版（キャッシュ用 version とは別。リリース時に上げる）
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
    'js/render/raster-art.js',
    'js/render/textures.js',
    'js/render/renderer.js',
    'js/render/input.js',
    'assets/art-v2/scavenger.webp',
    'assets/art-v2/ponco.webp',
    'assets/art-v2/alien.webp',
    'assets/art-v2/ground-plain.webp',
    'assets/art-v2/ground-forest.webp',
    'assets/art-v2/ground-mountain.webp',
    'assets/art-v2/ground-water.webp',
    'assets/art-v2/salvage.webp',
    'assets/art-v2/salvage-empty.webp',
    'assets/art-v2/hatch.webp',
    'assets/art-v2/hq.webp',
    'vendor/pixi-8.22.0.min.mjs',
    // 工房の共通処理だが、初回からオフラインで起動できるようこのゲームのキャッシュにも入れる（iron-squad と同じ扱い）
    '../common/js/load-css.js'
  ]
};
