// ============================================================
// İSTEK KORUMASI — /api/klod (Claude proxy) için origin + boyut sınırları
// ============================================================
// AMAÇ: başka web sitelerinin ziyaretçilerinin tarayıcısı üzerinden bu
// proxy'yi kullanmasını engellemek ve tek bir isteğin maliyetini sınırlamak.
//
// ORİGİN: Tarayıcılar POST isteklerinde Origin başlığını HER ZAMAN gönderir.
// Origin VARSA ve izinli listede DEĞİLSE istek reddedilir. Origin YOKSA
// (curl / sunucu script'i) izin verilir — bu tür istemciler başlığı zaten
// taklit edebildiği için origin kontrolü onlara karşı koruma DEĞİLDİR; asıl
// koruma rate limit ve boyut sınırlarıdır.
//
// SINIRLAR: sitenin bugünkü gerçek kullanımının rahatça üstünde seçildi
// (en büyük istemci system prompt'u ~22.000 karakter; sohbet sunucuda son
// 20 mesaja kırpılıyor, asistan cevabı en fazla 700 token ≈ 2.800 karakter).
// ============================================================

const IZINLI_ORIGINLER = new Set([
  'https://sinyal-avcisi.com',
  'https://www.sinyal-avcisi.com',
]);
// localhost / 127.0.0.1 (her port) ve bu projenin Vercel önizleme adresleri:
// sinyal-avcisi-<9 karakterlik kimlik>-sinyal-avcisi.vercel.app. Kimlik bilerek
// tam 9 karakter: daha geniş bir desen, adı "x-sinyal-avcisi" olan BAŞKA bir
// Vercel takımının adreslerini de kabul ederdi.
const IZINLI_ORIGIN_DESENLERI = [
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^https:\/\/sinyal-avcisi-[a-z0-9]{9}-sinyal-avcisi\.vercel\.app$/,
];

export const SINIRLAR = {
  mesajSayisi: 200,          // istemci geçmişi (sunucu zaten son 20'yi kullanır)
  mesajKarakter: 12_000,     // tek mesaj
  toplamKarakter: 80_000,    // kırpılmış (son 20) mesajların toplamı
  systemKarakter: 30_000,    // istemcinin gönderdiği system prompt
  gorselKarakter: 1_500_000, // base64 görsel (~1,1 MB) — istemci şu an hiç kullanmıyor
};
const GORSEL_TIPLERI = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export function originIzinliMi(origin) {
  if (!origin) return true; // tarayıcı dışı istemci — bkz. yukarıdaki not
  return IZINLI_ORIGINLER.has(origin) || IZINLI_ORIGIN_DESENLERI.some((d) => d.test(origin));
}

// Hata varsa Türkçe mesaj döner, yoksa null.
export function klodGovdesiniDogrula(body) {
  const { messages, system, image_base64, image_type } = body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > SINIRLAR.mesajSayisi) {
    return 'Geçersiz istek';
  }
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return 'Geçersiz istek';
    }
    if (m.content.length > SINIRLAR.mesajKarakter) return 'Mesaj çok uzun';
  }
  if (system != null && (typeof system !== 'string' || system.length > SINIRLAR.systemKarakter)) {
    return 'Geçersiz istek';
  }
  if (image_base64 != null) {
    if (typeof image_base64 !== 'string' || image_base64.length > SINIRLAR.gorselKarakter) return 'Görsel çok büyük';
    if (image_type != null && !GORSEL_TIPLERI.has(image_type)) return 'Geçersiz görsel türü';
  }
  return null;
}

export function toplamKarakter(messages) {
  return messages.reduce((t, m) => t + (typeof m.content === 'string' ? m.content.length : 0), 0);
}
