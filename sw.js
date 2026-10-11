// スマホゲーム工房 Service Worker（ネットワーク優先・オフライン対応）
//
// 【分担ルール】このファイルは「スタジオ本体（シェル）」と「ゲームのフォルダ名一覧」だけを持つ。
//   ゲームのキャッシュ対象ファイルとバージョンは <ゲーム>/sw-assets.js が持つ（ゲーム側だけで更新できる）。
//   ゲームを追加したときだけ GAME_IDS に足す。ゲームの更新ではこのファイルは変更しない。
//
// 【キャッシュ構成】 studio-shell-<ver> / game-<id>-<ver>  を別々に持ち、
//   有効化時は「同じ接頭辞の古いキャッシュ」だけ消す（片方のゲームを上げても他方は消えない）。
//
// 【更新検知】 importScripts した sw-assets.js もブラウザの SW 更新チェック対象（バイト比較）。
//   併せてハブが起動時に 'refresh-games' を送り、SW が各 sw-assets.js を no-store で取り直す保険がある。

const SHELL_VERSION = 'v180';
const SHELL_CACHE = 'studio-shell-' + SHELL_VERSION;
const GAME_IDS = ['iron-squad', 'dada-survivor'];

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './common/css/style.css',
  './common/css/game-ui.css',
  './common/js/app.js',
  './common/js/audio.js',
  './common/js/audio-engine.js',
  './common/js/storage.js',
  './common/js/kana-mode.js',
  './common/js/kana-text.js',
  './common/js/kana-dict.js',
  './common/js/kanji-grades.js',
  './common/js/games-registry.js',
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
  './common/assets/icons/apple-touch-icon.png'
];

// ---- ゲームごとのアセット一覧を読み込む（失敗したゲームはスキップ） ----
self.GAME_ASSETS = self.GAME_ASSETS || {};
for (const id of GAME_IDS) {
  try { importScripts('./' + id + '/sw-assets.js'); }
  catch (err) { console.warn('[SW] sw-assets 読込失敗:', id, err); }
}

const gameCacheName = (id, version) => 'game-' + id + '-' + version;
const currentGameCache = (id) => {
  const g = self.GAME_ASSETS[id];
  return g ? gameCacheName(id, g.version) : null;
};

// URL からどのキャッシュに属するか決める
function cacheNameForUrl(url) {
  const path = new URL(url).pathname;
  for (const id of GAME_IDS) {
    if (path.includes('/' + id + '/')) return currentGameCache(id);
  }
  return SHELL_CACHE;
}

async function precache(cacheName, urls) {
  const cache = await caches.open(cacheName);
  const results = await Promise.allSettled(urls.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed) console.warn('[SW] 一部アセットのキャッシュに失敗:', cacheName, failed);
}

// 既にこのバージョンのキャッシュが揃っていれば作り直さない
async function ensureGameCache(id) {
  const g = self.GAME_ASSETS[id];
  if (!g) return;
  const name = gameCacheName(id, g.version);
  if (await caches.has(name)) {
    const existing = await (await caches.open(name)).keys();
    if (existing.length >= g.files.length) return;
  }
  await precache(name, g.files.map((f) => './' + id + '/' + f));
}

// ゲームの旧バージョンのキャッシュだけを破棄
async function purgeStale() {
  const keep = new Set([SHELL_CACHE]);
  for (const id of GAME_IDS) { const n = currentGameCache(id); if (n) keep.add(n); }
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => {
    if (keep.has(key)) return null;
    const stale = key.startsWith('studio-shell-') || key.startsWith('mobile-game-studio-') ||
      GAME_IDS.some((id) => key.startsWith('game-' + id + '-'));
    return stale ? caches.delete(key) : null;
  }));
}

// 保険: 各ゲームの sw-assets.js を no-store で取り直し、新バージョンならそのゲームのキャッシュだけ更新
async function refreshGames() {
  for (const id of GAME_IDS) {
    try {
      const res = await fetch('./' + id + '/sw-assets.js', { cache: 'no-store' });
      if (!res.ok) continue;
      const text = await res.text();
      const sandbox = { GAME_ASSETS: {} };
      new Function('self', text)(sandbox);
      const fresh = sandbox.GAME_ASSETS[id];
      if (!fresh || !fresh.version || !Array.isArray(fresh.files)) continue;
      if (self.GAME_ASSETS[id] && self.GAME_ASSETS[id].version === fresh.version) continue;
      self.GAME_ASSETS[id] = fresh;
      await ensureGameCache(id);
    } catch (err) { console.warn('[SW] refresh 失敗:', id, err); }
  }
  await purgeStale();
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    await precache(SHELL_CACHE, SHELL_ASSETS);
    for (const id of GAME_IDS) await ensureGameCache(id);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(purgeStale().then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'refresh-games') {
    event.waitUntil(refreshGames().then(() => {
      if (event.source) event.source.postMessage({ type: 'games-refreshed' });
    }));
  }
});

// ネットワーク優先：オンライン時は常に最新、通信失敗時のみキャッシュ。
// ?v= 付きでない URL（入口モジュール・CSS・sw-assets 等）は HTTP キャッシュを再検証して古さを防ぐ。
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const revalidate = !url.searchParams.has('v') && req.mode !== 'navigate';

  event.respondWith(
    fetch(revalidate ? new Request(req, { cache: 'no-cache' }) : req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          const name = cacheNameForUrl(req.url);
          if (name) caches.open(name).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('Network error occurred and no cache available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      }))
  );
});
