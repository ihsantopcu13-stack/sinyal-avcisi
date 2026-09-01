const CACHE_NAME = 'sinyal-avcisi-v2';
const CACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', e => {
  self.skipWaiting(); // yeni SW'yi hemen aktif et — eski sekmelerin kapanmasını bekleme
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim(), // açık sekmeleri de hemen yeni SW'nin kontrolüne al
    ])
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const isHtmlNav = req.mode === 'navigate' ||
    (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));

  if (isHtmlNav) {
    // NETWORK-FIRST: sayfa her zaman güncel gelsin, sadece çevrimdışıyken
    // cache'e düş. Eskiden cache-first idi — bu, her deploy'dan sonra
    // kullanıcıları eski, önbelleğe alınmış bir sürümde SÜRESİZ
    // kilitleyebiliyordu (CACHE_NAME deploy'a göre değişmediği için
    // tarayıcı eski cache'i asla geçersiz saymıyordu).
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  // Diğer istekler: cache-first + arka planda sessizce güncelle
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
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
