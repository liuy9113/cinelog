const CACHE = 'cinelog-v1';

const STATIC = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap'
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - index.html → network first, cache fallback (always fresh)
// - Google Fonts → cache first (stable, no need to re-fetch)
// - TMDB / OMDb API calls → network only (always live data)
// - Everything else → network first, cache fallback
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls — always network, never cache
  if (
    url.hostname === 'api.themoviedb.org' ||
    url.hostname === 'www.omdbapi.com' ||
    url.hostname === 'image.tmdb.org'
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Google Fonts — cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // index.html — network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
