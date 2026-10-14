// ============================================================
// TESTIMONIAL BİLDİRİMİ — yeni yorum gelince admin'e Telegram mesajı
// Sinyal Avcısı
// ============================================================
//
// Supabase Database Webhook (testimonials tablosu, INSERT) bu ucu çağırır:
//   POST /api/testimonial-bildirim
//   Header: x-webhook-secret: <TESTIMONIAL_WEBHOOK_SECRET>
//   Gövde (Supabase): { type: 'INSERT', table: 'testimonials', record: {...} }
//
// Gerekli ortam değişkenleri (Vercel > Settings > Environment Variables):
//   TELEGRAM_BOT_TOKEN           — mevcut yayın botunun token'ı (automation/telegram-yayin ile aynı bot)
//   TELEGRAM_ADMIN_CHAT_ID       — admin'in ÖZEL sohbeti (sayısal id). Yayın otomasyonunun
//                                  TELEGRAM_CHAT_ID'sinden (GitHub Actions, herkese açık kanal) AYRI;
//                                  onu okumaz/değiştirmez. Herkese açık kanal DEĞİL:
//                                  onaylanmamış yorumlar kanala düşmesin diye '@kanal' biçimi reddedilir.
//   TESTIMONIAL_WEBHOOK_SECRET   — Supabase webhook'unun header'da gönderdiği paylaşılan gizli anahtar
//
// Güvenlik: gizli anahtar sabit sürede karşılaştırılır, yanlışsa 401.
// Yorum metni Telegram'a parse_mode OLMADAN düz metin gider (HTML/Markdown
// yorumlanmaz); kontrol karakterleri temizlenir, uzunluk sınırlanır.
// Telegram hatası yorum akışını asla bozmaz: hata loglanır, uç 200 döner.
// Token hiçbir loga yazılmaz.

import { timingSafeEqual } from 'node:crypto';

const ADMIN_URL = 'https://sinyal-avcisi.com/?admin=1';
const TELEGRAM_ZAMAN_ASIMI_MS = 8000;

// Paylaşılan gizli anahtarı sabit sürede karşılaştırır (uzunluk farkı da sızmaz)
export function gizliDogru(gelen, beklenen) {
  if (typeof gelen !== 'string' || typeof beklenen !== 'string' || !beklenen) return false;
  const a = Buffer.from(gelen, 'utf8');
  const b = Buffer.from(beklenen, 'utf8');
  if (a.length !== b.length) {
    timingSafeEqual(b, b); // aynı işi yap, erken dönüşle süre sızmasın
    return false;
  }
  return timingSafeEqual(a, b);
}

// Kullanıcı metnini düz metne indirger: kontrol/görünmez yön karakterleri
// atılır, boşluklar sadeleşir, karakter (kod noktası) bazında kesilir.
export function metniTemizle(deger, enFazla) {
  let s = String(deger ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parca = Array.from(s);
  if (parca.length > enFazla) s = parca.slice(0, enFazla).join('').trimEnd() + '…';
  return s;
}

export function mesajOlustur(kayit) {
  const r = kayit || {};
  const yildiz = Math.max(1, Math.min(5, Number.parseInt(r.yildiz, 10) || 5));
  return [
    '📝 Yeni yorum onay bekliyor',
    '',
    `İsim: ${metniTemizle(r.isim, 80) || '—'}`,
    `Unvan: ${metniTemizle(r.unvan, 80) || '—'}`,
    `Yıldız: ${'★'.repeat(yildiz)}${'☆'.repeat(5 - yildiz)} (${yildiz}/5)`,
    `Yorum: ${metniTemizle(r.yorum, 200) || '—'}`,
    '',
    `Onay için: ${ADMIN_URL}`,
  ].join('\n');
}

async function telegramaGonder(token, chatId, metin) {
  const ctrl = new AbortController();
  const zamanlayici = setTimeout(() => ctrl.abort(), TELEGRAM_ZAMAN_ASIMI_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // parse_mode bilinçli olarak YOK: metin düz gider, biçimlendirme/enjeksiyon olmaz
      body: JSON.stringify({ chat_id: chatId, text: metin, link_preview_options: { is_disabled: true } }),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) throw new Error(`${res.status} ${json.description || 'bilinmeyen hata'}`);
  } finally {
    clearTimeout(zamanlayici);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Yalnız POST' });
  }

  const beklenen = process.env.TESTIMONIAL_WEBHOOK_SECRET || '';
  if (!beklenen) {
    console.error('testimonial-bildirim: TESTIMONIAL_WEBHOOK_SECRET tanımlı değil');
    return res.status(401).json({ error: 'Yetkisiz' });
  }
  if (!gizliDogru(req.headers['x-webhook-secret'], beklenen)) {
    return res.status(401).json({ error: 'Yetkisiz' });
  }

  const govde = req.body && typeof req.body === 'object' ? req.body : {};
  if (govde.type !== 'INSERT' || govde.table !== 'testimonials' || !govde.record) {
    return res.status(200).json({ ok: true, gonderildi: false, neden: 'ilgisiz olay' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
  if (!token || !chatId) {
    console.error('testimonial-bildirim: TELEGRAM_BOT_TOKEN veya TELEGRAM_ADMIN_CHAT_ID tanımlı değil');
    return res.status(200).json({ ok: true, gonderildi: false });
  }
  if (chatId.startsWith('@')) {
    // '@kanal' herkese açık bir kanal: onaylanmamış yorum oraya gönderilmez
    console.error('testimonial-bildirim: TELEGRAM_ADMIN_CHAT_ID bir @kanal; özel sohbet id’si olmalı — gönderilmedi');
    return res.status(200).json({ ok: true, gonderildi: false });
  }

  try {
    await telegramaGonder(token, chatId, mesajOlustur(govde.record));
    return res.status(200).json({ ok: true, gonderildi: true });
  } catch (e) {
    const mesaj = String(e && e.message || e).split(token).join('***');
    console.error('testimonial-bildirim: Telegram gönderimi başarısız:', mesaj);
    return res.status(200).json({ ok: true, gonderildi: false });
  }
}
