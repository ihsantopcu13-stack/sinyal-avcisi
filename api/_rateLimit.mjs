// ============================================================
// Best-effort in-memory rate limiter
// ============================================================
// Vercel serverless fonksiyonları stateless'tır: bu Map, fonksiyon
// "sıcak" (warm) kaldığı sürece paylaşılır ama soğuk başlangıçta
// (cold start) veya aynı anda çalışan birden fazla instance'ta
// SIFIRLANIR / PAYLAŞILMAZ. Yani bu, kararlı/garantili bir rate limit
// DEĞİL — yalnızca tek bir sıcak instance'ı hedef alan scriptli
// kötüye kullanımı yavaşlatan ucuz bir ilk savunma katmanı.
//
// Gerçek, tüm instance'lar arasında paylaşılan/kalıcı bir rate limit
// için Upstash Redis (Vercel entegrasyonu üzerinden ücretsiz katmanı
// var) veya Vercel Firewall'ın yerleşik rate limiting'i kullanılmalı.
// İkisi de bir hesap/servis kurulumu gerektirdiğinden burada
// uygulanamadı.

const _hits = new Map();

export function rateLimit(req, { key, limit, windowMs }) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();
  const bucketKey = key + ':' + ip;
  const now = Date.now();

  let entry = _hits.get(bucketKey);
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
  }
  entry.count++;
  _hits.set(bucketKey, entry);

  // Map sınırsız büyümesin diye basit süpürme
  if (_hits.size > 5000) {
    for (const [k, v] of _hits) {
      if (now - v.start > windowMs) _hits.delete(k);
    }
  }

  const allowed = entry.count <= limit;
  const retryAfterMs = Math.max(0, windowMs - (now - entry.start));
  return { allowed, remaining: Math.max(0, limit - entry.count), retryAfterMs };
}
