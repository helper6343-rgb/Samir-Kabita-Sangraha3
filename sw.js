// ================================================
// समीर साहित्य संग्रह — Service Worker (PWA)
// ================================================

const CACHE_NAME = 'samir-sahitya-v14';
const CACHE_URLS = [
  './',
  './index.html',
  './about.html',
  './css/style.css',
  './css/about.css',
  './css/print.css',
  './css/home-update.css',
  './js/app.js',
  './js/theme.js',
  './js/bookmark.js',
  './js/search.js',
  './js/share.js',
  './js/about.js',
  './js/home-update.js',
  './js/about-login.js',
  './data/kavita.js',
  './data/about.js',
  './data/sameerai.js',
  './js/sameerai.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/maskable-192x192.png',
  './icons/maskable-512x512.png',
  './covers/1776176711764.png',
  './covers/1776177925119.png',
  './covers/k007.png',
  './covers/khusi.png'
];

// ── Install: cache सबै files ──────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      // एउटा file नभए पनि install fail नहोस् भनेर एक-एक गरी cache गर्ने
      return Promise.allSettled(
        CACHE_URLS.map(url => cache.add(url).catch(err => console.warn('[SW] skip:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: पुरानो cache हटाउने ─────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────
// HTML / JS / CSS / data: Network First (नयाँ परिवर्तन तुरुन्तै देखिन्छ, offline भए cache)
// फोटो, icon आदि: Cache First
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // बाहिरी requests (Google Fonts आदि) network बाट लिने
  if (!req.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(req).catch(() => new Response('')));
    return;
  }

  const url = new URL(req.url);
  const isCode =
    req.destination === 'document' ||
    req.destination === 'script' ||
    req.destination === 'style' ||
    /\.(html|js|css|json)$/.test(url.pathname) ||
    url.pathname.endsWith('/');

  if (isCode) {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() =>
        caches.match(req).then(cached => cached || (req.destination === 'document' ? caches.match('./index.html') : undefined))
      )
    );
    return;
  }

  // Cache First (फोटो, icon)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => {
        if (req.destination === 'document') return caches.match('./index.html');
      });
    })
  );
});
