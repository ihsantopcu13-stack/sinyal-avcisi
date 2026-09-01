const CACHE_NAME = 'sinyal-avcisi-v1';
const CACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request).catch(() => caches.match('/'));
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// ============================================================
// PUSH BİLDİRİMLERİ
// ============================================================
const SA_ICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='24' fill='%232d5be3'/><text x='96' y='130' font-size='100' text-anchor='middle' fill='white'>🎯</text></svg>";

// Sunucudan (Web Push API) gelen gerçek push mesajları
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { title: 'Sinyal Avcısı', body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'Sinyal Avcısı';
  const options = {
    body: data.body || '',
    icon: SA_ICON,
    badge: SA_ICON,
    tag: data.tag || 'sinyal-avcisi',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca siteyi aç / var olan sekmeye odaklan
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Sayfa açıkken sitenin kendisinin tetiklediği YEREL bildirimler
// (örn. günlük hedef tamamlandı) — sw'ye postMessage ile gönderilir.
self.addEventListener('message', e => {
  if (e.data?.type === 'LOCAL_NOTIFY') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title || 'Sinyal Avcısı', {
      body: body || '',
      icon: SA_ICON,
      badge: SA_ICON,
      tag: tag || 'sinyal-avcisi-local',
    });
  }
});
