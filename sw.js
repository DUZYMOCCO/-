// スマホゲーム工房 Service Worker (最新コード最優先 Network-First & オフライン対応版)
const CACHE_NAME = 'mobile-game-studio-v124';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/game-ui.css',
  './css/iron-squad.css',
  './css/iron-squad-interface.css',
  './js/app.js',
  './js/audio.js',
  './js/audio-engine.js',
  './js/games/iron-squad/audio-interface.js',
  './js/storage.js',
  './js/games-registry.js',
  './js/games/iron-squad/index.js',
  './js/games/iron-squad/instance-rules.js',
  './js/games/iron-squad/battle-log.js',
  './js/games/iron-squad/soldier-dialogue.js',
  './js/games/iron-squad/interface.js',
  './js/games/iron-squad/canvas-surface.js',
  './js/games/iron-squad/visuals.js',
  './js/games/iron-squad/weapon-motion.js',
  './js/games/iron-squad/soldier-appearance.js',
  './js/games/iron-squad/save-slots.js',
  './js/games/iron-squad/world.js',
  './js/games/iron-squad/fog.js',
  './js/games/iron-squad/render-support.js',
  './js/games/iron-squad/phase-rules.js',
  './js/games/iron-squad/experience-rules.js',
  './js/games/iron-squad/supply-rules.js',
  './js/games/iron-squad/combat-rewards.js',
  './js/games/iron-squad/magic-rules.js',
  './js/games/iron-squad/hazard-fields.js',
  './js/games/iron-squad/day-night.js',
  './js/games/iron-squad/casualty-rules.js',
  './js/games/iron-squad/medical-posts.js',
  './js/games/iron-squad/equipment-rules.js',
  './js/games/iron-squad/equipment-tiers.js',
  './js/games/iron-squad/equipment-art.js',
  './js/games/iron-squad/armament-rules.js',
  './js/games/iron-squad/economy-rules.js',
  './js/games/iron-squad/nation-rules.js',
  './js/games/iron-squad/invasion-rules.js',
  './js/games/iron-squad/gate-rules.js',
  './js/games/iron-squad/fortification-visuals.js',
  './js/games/iron-squad/growth-rules.js',
  './js/games/iron-squad/merchant-rules.js',
  './js/games/iron-squad/merchant-catalog.js',
  './js/games/iron-squad/drop-exclusives.js',
  './js/games/iron-squad/field-scaling.js',
  './js/games/iron-squad/civilian-visuals.js',
  './js/games/iron-squad/rescue-rewards.js',
  './js/games/iron-squad/dungeon.js',
  './js/games/iron-squad/expedition-rules.js',
  './js/games/iron-squad/class-up-rules.js',
  './assets/audio/music.wav',
  './assets/audio/tap.wav',
  './assets/audio/hit.wav',
  './assets/audio/metal.wav',
  './assets/audio/slash.wav',
  './assets/audio/hammer.wav',
  './assets/audio/bow.wav',
  './assets/audio/crossbow.wav',
  './assets/audio/cannon.wav',
  './assets/audio/stone.wav',
  './assets/audio/heal.wav',
  './assets/audio/coin.wav',
  './assets/audio/fire.wav',
  './assets/audio/ice.wav',
  './assets/audio/lightning.wav',
  './assets/audio/blast.wav',
  './assets/audio/down.wav',
  './assets/audio/reward.wav',
  './assets/audio/defeat.wav',
  './assets/audio/manifest.json',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/land/horizon-mist.jpg',
  './assets/land/horizon-ridges.jpg'
];

// インストール時にキャッシュを事前構築
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 最新アセットをキャッシュ中...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] 一部アセットのキャッシュに失敗（スキップして続行）:', err);
      });
    })
  );
});

// 古いキャッシュを即時パージして新しいSWを即座にアクティブ化
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] 古いキャッシュを破棄:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ネットワーク優先（Network First）戦略：
// オンライン時は常に最新のコードを取得。通信失敗（オフライン時）のみキャッシュへフォールバック
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 正常に取得できた場合、キャッシュを最新化して返す
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // オフライン・通信切断時はキャッシュから取得
        return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // ナビゲーションリクエスト（HTML）ならindex.htmlを返す
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Network error occurred and no cache available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});
