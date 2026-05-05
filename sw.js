const CACHE_NAME = 'novel-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './assets/img/icon.png',
  './assets/img/title.png',
  './assets/img/thumb.jpg',
  './storys/meta.json',
  'https://fonts.googleapis.com/css2?family=Shippori+Mincho&display=swap'
];

self.addEventListener('install', (event) => {
  // インストール時に必要なアセットをすべてキャッシュする
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  // 新しいバージョンが有効になったら古いキャッシュを削除する
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // キャッシュがあればそれを返し、なければネットワークから取得する
      return response || fetch(event.request);
    })
  );
});