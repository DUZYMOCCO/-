// スマホゲーム工房 Service Worker (最新コード最優先 Network-First & オフライン対応版)
const CACHE_NAME = 'mobile-game-studio-v12';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/game-ui.css',
  './js/app.js',
  './js/audio.js',
  './js/storage.js',
  './js/games-registry.js',
  './js/games/neon-bounce/index.js',
  './js/games/cyber-slash/index.js',
  './js/games/iron-squad/index.js',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
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
