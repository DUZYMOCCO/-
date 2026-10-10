// スマホゲーム工房 Service Worker (最新コード最優先 Network-First & オフライン対応版)
const CACHE_NAME = 'mobile-game-studio-v175';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './common/css/style.css',
  './common/css/game-ui.css',
  './iron-squad/css/iron-squad.css',
  './iron-squad/css/iron-squad-interface.css',
  './common/js/app.js',
  './common/js/audio.js',
  './common/js/audio-engine.js',
  './iron-squad/js/audio-interface.js',
  './iron-squad/js/enemy-ranged.js',
  './iron-squad/js/limited-allies.js',
  './iron-squad/js/battlefield-ui.js',
  './iron-squad/js/stall-recorder.js',
  './iron-squad/js/navigation-map.js',
  './common/js/storage.js',
  './common/js/kana-mode.js',
  './common/js/kana-text.js',
  './common/js/kana-dict.js',
  './common/js/kanji-grades.js',
  './common/js/games-registry.js',
  './iron-squad/js/index.js',
  './iron-squad/js/hero-rules.js',
  './iron-squad/js/hero-party.js',
  './iron-squad/js/hero-navigation.js',
  './iron-squad/js/hero-journal.js',
  './iron-squad/js/hero-equipment.js',
  './iron-squad/js/unit-attributes.js',
  './iron-squad/js/talent-labels.js',
  './iron-squad/js/distance-format.js',
  './iron-squad/js/payroll-rules.js',
  './iron-squad/js/economic-interface.js',
  './iron-squad/js/economic-visuals.js',
  './iron-squad/js/settlement-visuals.js',
  './iron-squad/js/commerce-visuals.js',
  './iron-squad/js/troop-rankings.js',
  './iron-squad/js/trade-routes.js',
  './iron-squad/js/regional-economy.js',
  './iron-squad/js/field-drops.js',
  './iron-squad/js/field-hosts.js',
  './iron-squad/js/recruitment.js',
  './iron-squad/js/weapon-requirements.js',
  './iron-squad/js/instance-rules.js',
  './iron-squad/js/battle-log.js',
  './iron-squad/js/soldier-dialogue.js',
  './iron-squad/js/soldier-names.js',
  './iron-squad/js/commander-identity.js',
  './iron-squad/js/commander-editor.js',
  './iron-squad/js/interface.js',
  './iron-squad/js/canvas-surface.js',
  './iron-squad/js/visuals.js',
  './iron-squad/js/camp-leisure.js',
  './iron-squad/js/reserve-farm.js',
  './iron-squad/js/peace-zones.js',
  './iron-squad/js/weapon-motion.js',
  './iron-squad/js/soldier-appearance.js',
  './iron-squad/js/save-slots.js',
  './iron-squad/js/world.js',
  './iron-squad/js/terrain-shapes.js',
  './iron-squad/js/fog.js',
  './iron-squad/js/render-support.js',
  './iron-squad/js/phase-rules.js',
  './iron-squad/js/experience-rules.js',
  './iron-squad/js/supply-rules.js',
  './iron-squad/js/combat-rewards.js',
  './iron-squad/js/magic-rules.js',
  './iron-squad/js/hazard-fields.js',
  './iron-squad/js/day-night.js',
  './iron-squad/js/casualty-rules.js',
  './iron-squad/js/medical-posts.js',
  './iron-squad/js/equipment-rules.js',
  './iron-squad/js/equipment-tiers.js',
  './iron-squad/js/equipment-art.js',
  './iron-squad/js/armament-rules.js',
  './iron-squad/js/economy-rules.js',
  './iron-squad/js/nation-rules.js',
  './iron-squad/js/invasion-rules.js',
  './iron-squad/js/gate-rules.js',
  './iron-squad/js/fortification-visuals.js',
  './iron-squad/js/growth-rules.js',
  './iron-squad/js/merchant-rules.js',
  './iron-squad/js/rescue-markers.js',
  './iron-squad/js/merchant-catalog.js',
  './iron-squad/js/drop-exclusives.js',
  './iron-squad/js/field-scaling.js',
  './iron-squad/js/civilian-visuals.js',
  './iron-squad/js/rescue-rewards.js',
  './iron-squad/js/dungeon.js',
  './iron-squad/js/expedition-rules.js',
  './iron-squad/js/class-up-rules.js',
  './common/assets/audio/music.wav',
  './common/assets/audio/tap.wav',
  './common/assets/audio/hit.wav',
  './common/assets/audio/metal.wav',
  './common/assets/audio/slash.wav',
  './common/assets/audio/hammer.wav',
  './common/assets/audio/bow.wav',
  './common/assets/audio/crossbow.wav',
  './common/assets/audio/cannon.wav',
  './common/assets/audio/stone.wav',
  './common/assets/audio/heal.wav',
  './common/assets/audio/coin.wav',
  './common/assets/audio/fire.wav',
  './common/assets/audio/ice.wav',
  './common/assets/audio/lightning.wav',
  './common/assets/audio/blast.wav',
  './common/assets/audio/down.wav',
  './common/assets/audio/reward.wav',
  './common/assets/audio/defeat.wav',
  './common/assets/audio/manifest.json',
  './common/assets/icons/icon-180.png',
  './common/assets/icons/icon-192.png',
  './common/assets/icons/icon-512.png',
  './common/assets/icons/apple-touch-icon.png',
  './iron-squad/assets/land/horizon-mist.jpg',
  './iron-squad/assets/land/horizon-ridges.jpg'
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
