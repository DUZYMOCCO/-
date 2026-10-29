// 砂の果て 3D試作 の Service Worker 用アセット一覧
// このファイルはゲーム側の更新専用。バージョンを上げる＝このゲームのキャッシュだけが作り直される。
// パスは「ゲームフォルダからの相対パス」。
self.GAME_ASSETS = self.GAME_ASSETS || {};
self.GAME_ASSETS['kenshi-proto'] = {
  version: 'v1',
  gameVersion: '0.0.1', // ハブのカードに表示する版
  files: [
    'assets/doll.glb',
    'css/style.css',
    'index.html',
    'js/index.js',
    'js/main.js',
    'js/render/camera.js',
    'js/render/dolls.js',
    'js/render/scene.js',
    'js/render/terrain.js',
    'js/sim/ai.js',
    'js/sim/body.js',
    'js/sim/combat.js',
    'js/sim/commands.js',
    'js/sim/data.js',
    'js/sim/index.js',
    'js/sim/rng.js',
    'js/sim/step.js',
    'js/sim/terrain.js',
    'js/sim/world.js',
    'js/ui/hud.js',
    'js/ui/input.js',
    'js/vendor/three/build/three.module.min.js',
    'js/vendor/three/examples/jsm/loaders/GLTFLoader.js',
    'js/vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
    'js/vendor/three/examples/jsm/utils/SkeletonUtils.js'
  ],
};
