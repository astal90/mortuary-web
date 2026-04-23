const CACHE_NAME = 'mortuary-cache-v1';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.html',
  './style.css',
  './app.js',
  './offline-db.js',
  './sync.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});