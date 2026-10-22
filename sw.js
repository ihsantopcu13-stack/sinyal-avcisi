// v4: SW artık yalnızca HTML'i, /assets/ altını ve manifest.json'ı önbelleğe
// alıyor; /api/ yanıtları HİÇ önbelleğe girmiyor (bkz. fetch). Ad değişince
// activate'teki temizlik, v3'te biriken API yanıtlarıyla birlikte eski
// önbelleği siler.
const CACHE_NAME = 'sinyal-avcisi-v5';
const CACHE_URLS = ['/', '/index.html'];
// Haftalık rapor özeti: sayfa (index.html → hrOzetCacheYaz) yazar, Pazar
// bildirimi gelince burada okunur. Sürüm temizliğinde SİLİNMEZ.
const OZET_CACHE = 'sa-ozet-v1';
const OZET_URL = '/__sa/haftalik-ozet';

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
        Promise.all(keys.filter(k => k !== CACHE_NAME && k !== OZET_CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim(), // açık sekmeleri de hemen yeni SW'nin kontrolüne al
    ])
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Başka alan adlarına (CDN, Google Fonts, Supabase…) ve GET olmayan isteklere
  // HİÇ karışma: tarayıcı bunları normal yoldan, sayfanın CSP'siyle yapsın.
  // Eskiden SW bunları kendisi fetch ediyordu; sw.js'e uygulanan CSP'nin
  // connect-src listesinde cdn.jsdelivr.net / fonts olmadığı için istekler
  // ERR_FAILED oluyor, ikinci ziyarette Supabase hiç yüklenmiyordu.
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // API yanıtları kullanıcıya/oturuma özel ve anlık olmalı (admin listeleri,
  // anon-profile kurtarma vb.). Cache yalnızca URL'e baktığı için Authorization
  // başlığını ayırt edemiyor — bu yüzden /api/'ye HİÇ karışma.
  if (url.pathname.startsWith('/api/')) return;
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
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  // HTML dışında önbelleğe yalnızca statik varlıklar girer; geri kalan her şey
  // (sitemap.xml, robots.txt, kök dizindeki diğer dosyalar…) tarayıcının
  // normal yolundan gider.
  if (!url.pathname.startsWith('/assets/') && url.pathname !== '/manifest.json') return;

  // Statik varlıklar: cache-first + arka planda sessizce güncelle
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.ok) {
            // clone() senkron alınmalı: yanıt döndükten sonra gövde okunmuş olabilir
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
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

// Haftalık bildirim metni: cihazdaki özetten son 7 günün sayıları.
// Özet yoksa ya da hafta boşsa sunucunun gönderdiği genel metin kalır.
function haftalikGovde(ozet, simdi, seri) {
  let govde = null;
  if (ozet && ozet.gunler) {
    let s = 0, d = 0;
    const bugun = new Date(simdi);
    for (let i = 0; i < 7; i++) {
      const g = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() - i);
      const k = g.getFullYear() + '-' + String(g.getMonth() + 1).padStart(2, '0') + '-' + String(g.getDate()).padStart(2, '0');
      const v = ozet.gunler[k];
      if (v) { s += v.s || 0; d += v.d || 0; }
    }
    if (s > 0) {
      govde = `Bu hafta ${s} soru, %${Math.round(d / s * 100)} doğru`;
      if (typeof ozet.puan === 'number') govde += `, tahmini puan ${String(ozet.puan).replace('.', ',')}`;
      govde += '. Raporuna bak.';
    }
  }
  if (seri) govde = (govde || 'Haftalık raporun hazır.') + ` Önce bugün 1 soru çöz, ${seri} günlük serin kopmasın.`;
  return govde;
}
async function ozetOku() {
  try {
    const c = await caches.open(OZET_CACHE);
    const r = await c.match(OZET_URL);
    return r ? await r.json() : null;
  } catch (err) { return null; }
}

// Sunucudan (Web Push API) gelen gerçek push mesajları
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { title: 'Sinyal Avcısı', body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    let body = data.body || '';
    if (data.tur === 'haftalik') body = haftalikGovde(await ozetOku(), Date.now(), data.seri) || body;
    return self.registration.showNotification(data.title || 'Sinyal Avcısı', {
      body,
      icon: SA_ICON,
      badge: SA_ICON,
      tag: data.tag || 'sinyal-avcisi',
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100],
    });
  })());
});

// Bildirime tıklanınca siteyi aç / var olan sekmeye odaklan
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        // Açık sekme bildirimin adresine gitsin (örn. /#haftalik-rapor raporu açar).
        if ('navigate' in c && url !== '/') return c.navigate(url).then(w => (w || c).focus());
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
