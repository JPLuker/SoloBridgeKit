const CACHE = 'solobridgekit-shell-v0.17.1';
const SHELL = ['./', './index.html', './styles.css', './app.mjs', './storage.mjs',
  './model.mjs', './lifepath.mjs', './missions.mjs', './resources.mjs',
  './shipbuilder.mjs', './bookmarks.mjs', './rollhistory.mjs',
  './content-policy.mjs', './book-data.mjs', './browser-compiler.mjs', './private-tables.mjs', './private-options.mjs', './private-ships.mjs', './mission-actions.mjs', './campaign-export.mjs', './import-safety.mjs',
  './manifest.webmanifest', './vendor/asset-manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('./vendor/asset-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Missing offline PDF parser manifest.');
    const assets = await response.json();
    const cache = await caches.open(CACHE);
    await cache.addAll([...SHELL, ...assets.map(name => './' + name)]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('solobridgekit-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
